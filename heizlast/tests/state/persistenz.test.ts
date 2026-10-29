/**
 * Persistenz mit gemocktem localStorage (UX-20/21, BUILD-05/09/10): Quota-Fehler sichtbar, Autosave entprellt
 * (≥ 1 s), Entwurf überlebt Neuladen inkl. «ungespeichert», «Neu»/«Laden» mit Rückfrage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alleDaten } from '../../src/daten/index';
import type { Speicher } from '../../src/state/persistenz';
import { AUTOSAVE_MIN_MS, erstelleAutosave, erstelleProjektverwaltung, istLeer, ladeEntwurf, projektListe, projektSpeichern, SCHLUESSEL, schreibe, speichereEntwurf, stateHash } from '../../src/state/persistenz';
import { erstelleStore } from '../../src/state/store';
import { fixture, KONTEXT, testOptionen } from './hilfen';

const daten = alleDaten();

/** localStorage-Mock mit Kapazitätsgrenze (Zeichen) und optional gesperrtem Schreiben. */
function mockSpeicher(o: { kapazitaet?: number; gesperrt?: boolean } = {}) {
  const m = new Map<string, string>();
  const sp: Speicher & { daten: Map<string, string>; schreibvorgaenge: number } = {
    daten: m,
    schreibvorgaenge: 0,
    getItem: (k) => m.get(k) ?? null,
    setItem(k, v) {
      if (o.gesperrt) {
        const e = new Error('blocked');
        e.name = 'SecurityError';
        throw e;
      }
      const belegt = [...m.entries()].filter(([kk]) => kk !== k).reduce((s, [, vv]) => s + vv.length, 0);
      if (o.kapazitaet !== undefined && belegt + v.length > o.kapazitaet) {
        const e = new Error('quota');
        e.name = 'QuotaExceededError';
        throw e;
      }
      sp.schreibvorgaenge++;
      m.set(k, v);
    },
    removeItem: (k) => void m.delete(k),
  };
  return sp;
}

describe('Schreiben: Fehler werden gemeldet, nicht verschluckt (UX-20)', () => {
  it('Quota voll → ok:false, Art «quota», Klartext', () => {
    const sp = mockSpeicher({ kapazitaet: 10 });
    const r = schreibe(sp, 'x', 'a'.repeat(50));
    expect(r).toMatchObject({ ok: false, art: 'quota' });
    expect(!r.ok && r.text).toContain('voll');
  });
  it('gesperrter Speicher → Art «gesperrt»', () => {
    expect(schreibe(mockSpeicher({ gesperrt: true }), 'x', '1')).toMatchObject({ ok: false, art: 'gesperrt' });
  });
  it('Projektliste speichert KPI aus dem massgebenden Ergebnis (UX-26) und den einen Projektnamen (FLOW-14)', () => {
    const sp = mockSpeicher();
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v2-fws-moosseedorf.json') });
    expect(projektSpeichern(sp, store.state.value, store.ergebnis.value, '2026-10-29T13:00:00Z')).toEqual({ ok: true });
    const [e] = projektListe(sp);
    expect(e).toMatchObject({ id: 'p-moosseedorf', name: 'Referenzhaus Moosseedorf', methode: 'fws' });
    expect(e!.qhW).toBeCloseTo(store.ergebnis.value.zuschlaege.qh!.wert, 6);
    expect(e!.qhlW).toBeCloseTo(9304.7, 0);
  });
});

describe('Autosave entprellt (BUILD-05)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('speichert erst ≥ 1 s nach der letzten Änderung, einmal pro Pause; Verzögerung < 1 s wird angehoben', () => {
    const speichere = vi.fn(() => ({ ok: true as const }));
    const a = erstelleAutosave({ speichere, verzoegerungMs: 200 });
    for (let i = 0; i < 10; i++) {
      a.anstossen();
      vi.advanceTimersByTime(300);
    }
    expect(speichere).not.toHaveBeenCalled();
    vi.advanceTimersByTime(AUTOSAVE_MIN_MS);
    expect(speichere).toHaveBeenCalledTimes(1);
    a.anstossen();
    expect(a.ausstehend).toBe(true);
    a.sofort();
    expect(speichere).toHaveBeenCalledTimes(2);
  });

  it('Verwaltung: Tippen löst einen Entwurf-Schreibvorgang aus; Quota-Fehler wird als Status sichtbar', () => {
    const sp = mockSpeicher();
    const store = erstelleStore({ daten, ...testOptionen() });
    const v = erstelleProjektverwaltung({ store, speicher: sp, bestaetigen: () => true });
    v.starten();
    for (const z of 'EFH Muster') store.setze('projekt.name', store.state.value.projekt.name + z);
    expect(sp.schreibvorgaenge).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(sp.schreibvorgaenge).toBe(1);
    expect(JSON.parse(sp.getItem(SCHLUESSEL.entwurf)!).state.projekt.name).toBe('EFH Muster');
    expect(v.status.value).toBe('ungespeichert');

    // Speicher voll → Fehler sichtbar, nicht «gespeichert»
    const voll = mockSpeicher({ kapazitaet: 100 });
    const store2 = erstelleStore({ daten, ...testOptionen() });
    const v2 = erstelleProjektverwaltung({ store: store2, speicher: voll, bestaetigen: () => true });
    v2.starten();
    store2.setze('projekt.name', 'Gross');
    vi.advanceTimersByTime(1000);
    expect(v2.status.value).toBe('fehler');
    expect(v2.fehler.value).toContain('voll');
    expect(v2.speichern()).toMatchObject({ ok: false, art: 'quota' });
    expect(v2.ungespeichert.value).toBe(true);
    v.stoppen();
    v2.stoppen();
  });
});

describe('Entwurf und Projektliste', () => {
  it('Entwurf überlebt Neuladen; «ungespeichert» bleibt korrekt (Basis-Hash im Entwurf)', () => {
    const sp = mockSpeicher();
    const s = fixture('state-v2-fws-moosseedorf.json');
    expect(speichereEntwurf(sp, s, stateHash(s))).toEqual({ ok: true });
    const e = ladeEntwurf(sp, KONTEXT)!;
    expect(e.hydrat.ok && e.hydrat.state).toEqual(s);
    expect(e.basisHash).toBe(stateHash(s));

    // Neue Sitzung: gleicher Stand → gespeichert; geändert → ungespeichert
    const store = erstelleStore({ daten, ...testOptionen() });
    const v = erstelleProjektverwaltung({ store, speicher: sp, bestaetigen: () => true });
    v.starten();
    expect(store.state.value.projekt.name).toBe('Referenzhaus Moosseedorf');
    expect(v.status.value).toBe('gespeichert');
    store.setze('gebaeude.baujahr', 1990);
    expect(v.status.value).toBe('ungespeichert');
    v.stoppen();
  });

  it('Entwurf im Format der Session-1-Shell wird migriert geladen', () => {
    const sp = mockSpeicher();
    sp.setItem(SCHLUESSEL.entwurf, JSON.stringify({ projektname: 'Alt', methode: 'fws' }));
    const store = erstelleStore({ daten, ...testOptionen() });
    const v = erstelleProjektverwaltung({ store, speicher: sp, bestaetigen: () => true });
    v.starten();
    expect(store.state.value.projekt.name).toBe('Alt');
    expect(v.ladeMeldungen.value[0]).toContain('v1 → v2');
    v.stoppen();
  });

  it('neues Projekt ohne Eingaben gilt nicht als ungespeichert', () => {
    const store = erstelleStore({ daten, ...testOptionen() });
    expect(istLeer(store.state.value)).toBe(true);
    const v = erstelleProjektverwaltung({ store, speicher: mockSpeicher(), bestaetigen: () => true });
    v.starten();
    expect(v.status.value).toBe('neu');
    store.setze('methode', 'fws');
    expect(v.status.value).toBe('ungespeichert');
    v.stoppen();
  });
});

describe('«Neu» und «Laden» mit Rückfrage (UX-21, BUILD-10)', () => {
  it('«Neu» bei ungespeicherten Änderungen: abgelehnt → nichts passiert; bestätigt → leeres Projekt', async () => {
    const sp = mockSpeicher();
    const store = erstelleStore({ daten, ...testOptionen() });
    const fragen: string[] = [];
    let antwort = false;
    const v = erstelleProjektverwaltung({ store, speicher: sp, bestaetigen: (f) => (fragen.push(f), antwort) });
    v.starten();
    store.setze('projekt.name', 'Arbeit');
    expect(await v.neu()).toBe(false);
    expect(store.state.value.projekt.name).toBe('Arbeit');
    expect(fragen[0]).toContain('verwerfen');
    antwort = true;
    expect(await v.neu()).toBe(true);
    expect(store.state.value.projekt.name).toBe('');
    expect(v.status.value).toBe('neu');
    v.stoppen();
  });

  it('nach dem Speichern keine Rückfrage; «Laden» holt den gespeicherten Stand über hydrateState', async () => {
    const sp = mockSpeicher();
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v2-raumweise-efh.json') });
    const bestaetigen = vi.fn(() => false);
    const v = erstelleProjektverwaltung({ store, speicher: sp, bestaetigen });
    v.starten();
    expect(v.speichern()).toEqual({ ok: true });
    expect(v.status.value).toBe('gespeichert');
    expect(v.liste.value.map((e) => e.id)).toEqual(['p-ch-efh']);
    expect(await v.neu()).toBe(true);
    expect(bestaetigen).not.toHaveBeenCalled();
    store.setze('projekt.name', 'Zwischenstand');
    expect(await v.laden('p-ch-efh')).toBe(false);
    expect(bestaetigen).toHaveBeenCalledTimes(1);
    bestaetigen.mockReturnValue(true);
    expect(await v.laden('p-ch-efh')).toBe(true);
    expect(store.state.value.projekt.name).toBe('CH-EFH Bern 1965 (Handrechnung)');
    expect(v.status.value).toBe('gespeichert');
    expect(store.ergebnis.value.heizlast.massgebend.wert!.wert).toBeCloseTo(2776.6, 0); // −8 °C (Thermowerk-Regel)
    v.stoppen();
  });

  it('Löschen entfernt nur den gewählten Eintrag; lokale Einträge verschwinden nie automatisch', () => {
    const sp = mockSpeicher();
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v2-fws-moosseedorf.json') });
    const v = erstelleProjektverwaltung({ store, speicher: sp, bestaetigen: () => true });
    v.speichern();
    store.ersetze(fixture('state-v2-raumweise-efh.json'));
    v.speichern();
    expect(v.liste.value.map((e) => e.id)).toEqual(['p-ch-efh', 'p-moosseedorf']);
    v.loeschen('p-moosseedorf');
    expect(projektListe(sp).map((e) => e.id)).toEqual(['p-ch-efh']);
  });
});
