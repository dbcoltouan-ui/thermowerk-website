/**
 * Audit S12 — Bereich code-qualitaet (unabhängiger Prüfer, 2026-10-31).
 * Proben zu CODE-01/02/08/15, DATA-01, BUILD-06/11. Ändert keinen Produktivcode; nur Lesen und Rechnen.
 * Ausführen: npx vitest run tests/audit-s12/code-qualitaet
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { neuerState, normalisiereState } from '../../../src/state/schema';
import type { State } from '../../../src/state/schema';
import { leseAusState, setzeImState, erstelleStore } from '../../../src/state/store';
import { SCHEMA_VERSION } from '../../../src/state/version';
import { fixture, KONTEXT } from '../../state/hilfen';
import { cookieLesen, COOKIE_NAME } from '../../../../functions/_lib/heizlast-sitzung.js';

const ROOT = join(__dirname, '..', '..', '..');
const daten = alleDaten();

const dateien = (dir: string, re = /\.tsx?$/): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p, re) : re.test(n) ? [p] : [];
  });

/* ---------------------------------------------------------------------------------------------- */
/* CODE-01: Schichtenregel (Kern und Daten importieren nie aus ui/bericht/preact, keine DOM-Globals) */
/* ---------------------------------------------------------------------------------------------- */
describe('CODE-01 Schichten', () => {
  it('src/kern und src/daten: keine Importe aus ui/bericht/preact, kein window/document/localStorage/fetch', () => {
    for (const dir of ['src/kern', 'src/daten']) {
      for (const f of dateien(join(ROOT, dir))) {
        const q = readFileSync(f, 'utf8');
        expect(q, f).not.toMatch(/from\s+['"][^'"]*\/(ui|bericht)\//);
        expect(q, f).not.toMatch(/from\s+['"]@(ui|bericht)\//);
        expect(q, f).not.toMatch(/from\s+['"]@?preact/);
        expect(q, f).not.toMatch(/\b(window|document|localStorage|sessionStorage|fetch)\s*[.(]/);
      }
    }
  });
  it('src/kern importiert aus src/state nur Typen (import type), nie Werte', () => {
    for (const f of dateien(join(ROOT, 'src/kern'))) {
      const q = readFileSync(f, 'utf8');
      for (const m of q.matchAll(/^import\s+(type\s+)?\{[^}]*\}\s+from\s+'[^']*\/state\/[^']*'/gm)) {
        expect(m[1], `${f}: ${m[0]}`).toBe('type ');
      }
    }
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* CODE-02: genau ein Rechenpfad                                                                   */
/* ---------------------------------------------------------------------------------------------- */
describe('CODE-02 ein Rechenpfad', () => {
  it('berechne( wird im Produktivcode genau einmal aufgerufen (store.ts); ui/bericht rufen keine Heizlast-Primitive auf', () => {
    const aufrufe: string[] = [];
    for (const f of dateien(join(ROOT, 'src'))) {
      const q = readFileSync(f, 'utf8');
      for (const [i, z] of q.split('\n').entries()) if (/\bberechne\(/.test(z) && !/^\s*(\*|\/\/)/.test(z) && !/export function berechne/.test(z)) aufrufe.push(`${f}:${i + 1}`);
    }
    expect(aufrufe).toEqual([join(ROOT, 'src/state/store.ts:107')]);
    // Rechenfunktionen des Kerns, die eine Heizlast/Leistung/U/Q_N liefern — dürfen in ui/bericht nicht aufgerufen werden
    const verboten = ['fwsHeizlast', 'raumweiseHeizlast', 'huelleAufloesen', 'aufloesenBauteiltyp', 'waermeabgabe(', 'normleistung', 'bisektionVorlauf', 'leistungsfaktor', 'wwSpeicher', 'puffer(', 'magVolumen', 'sperrzeitZuschlag', 'leistungszuschlagWarmwasser', 'auslegungsleistung', 'geraete(', 'dimensionierung(', 'uAusWiderstaenden', 'dTlog', 'qnAus', 'filterVorlauf('];
    const treffer: string[] = [];
    for (const f of [...dateien(join(ROOT, 'src/ui')), ...dateien(join(ROOT, 'src/bericht'))]) {
      const q = readFileSync(f, 'utf8');
      for (const v of verboten) {
        const re = new RegExp(`(?<![A-Za-z0-9_.])${v.replace('(', '\\(')}`);
        for (const [i, z] of q.split('\n').entries()) if (re.test(z) && !/^\s*(\*|\/\/|import )/.test(z)) treffer.push(`${f}:${i + 1}: ${z.trim().slice(0, 100)}`);
      }
    }
    expect(treffer, treffer.join('\n')).toEqual([]);
  });

  it('Dashboard-, Bericht- und Gerätefilter-Werte stammen aus demselben Ergebnis-Objekt (Referenzgleichheit)', () => {
    const store = erstelleStore({ daten, anfang: fixture('state-v4-fws-moosseedorf.json'), uhr: () => KONTEXT.jetzt, neueId: (p) => `${p}-x` });
    const e1 = store.ergebnis.value;
    const e2 = store.ergebnis.value;
    expect(e1).toBe(e2);
    // Auslegungs-VL ist dieselbe Instanz für Gerätefilter, MAG und Skala
    expect(e1.zuschlaege.qhl).toBe(e1.heizlast.massgebend.wert);
    expect(e1.skalen.vorlauf.wert === null || e1.skalen.vorlauf.wert === e1.auslegungsVL.wert).toBe(true);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* CODE-08: State nur Rohangaben                                                                    */
/* ---------------------------------------------------------------------------------------------- */
describe('CODE-08 State ohne abgeleitete Werte', () => {
  it('nach berechne() ist der State unverändert (Deep-Equal zum JSON davor), in beiden Modi', () => {
    for (const n of ['state-v4-fws-moosseedorf.json', 'state-v4-raumweise-efh.json']) {
      const s = fixture(n);
      const vorher = JSON.stringify(s);
      berechne(s, daten);
      expect(JSON.stringify(s)).toBe(vorher);
    }
  });
  it('Schema enthält keine Ergebnisfelder (U-Wert, Q_N, Heizlast, EBF-berechnet, θe) — Stichprobe über die Schlüsselnamen', () => {
    const s = neuerState(KONTEXT);
    const schluessel = new Set<string>();
    const sammle = (o: unknown, pfad: string) => {
      if (o && typeof o === 'object' && !Array.isArray(o)) for (const k of Object.keys(o as object)) { schluessel.add(`${pfad}.${k}`); sammle((o as Record<string, unknown>)[k], `${pfad}.${k}`); }
    };
    sammle(s, '');
    const verdaechtig = [...schluessel].filter((k) => /(^|\.)(u|uWert|qN|qNorm|phiHL|qh|qhl|heizlast|ebf|thetaE|tVLReq|volumen)$/i.test(k) && !/Override|Manuell/.test(k));
    expect(verdaechtig, verdaechtig.join(', ')).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* CODE-15: UI-Pfade existieren im Schema (kein «tInnenAuslegung»-Fall)                            */
/* ---------------------------------------------------------------------------------------------- */
describe('CODE-15 UI-Pfade ↔ Schema', () => {
  /** Statische Pfade aus src/ui (pfad="…", setze('…'), lese('…')) plus Vorlagen mit ids aus der raumweise-Fixture. */
  function uiPfade(): string[] {
    const out = new Set<string>();
    for (const f of dateien(join(ROOT, 'src/ui'))) {
      const q = readFileSync(f, 'utf8');
      for (const m of q.matchAll(/(?:pfad=|setze\(|lese\()["'`]([a-zA-Z0-9_.]+)["'`]/g)) out.add(m[1]!);
      for (const m of q.matchAll(/pfad=\{`\$\{(p|pR|pW|basis|ep|ap|lp|zp)\}\.([a-zA-Z0-9_.]+)`\}/g)) out.add(`${m[1]}:${m[2]}`);
    }
    return [...out].sort();
  }
  // Fixture-Kopien mit allem, was die UI adressieren kann: Sanierung, eigener Bauteiltyp, Rest-Modi, Nachbar-Anschluss.
  const rw0 = fixture('state-v4-raumweise-efh.json');
  const rw = setzeImState(
    setzeImState(setzeImState(rw0, 'sanierungen', [{ id: 's1', massnahme: 'fenster', status: 'ausgefuehrt', datum: '2005' }]), 'huelle.bauteiltypen', [{ id: 't1', art: 'aussenwand' }]),
    'huelle.rest',
    { modus: 'huellflaechen', flaecheM2: 10 },
  );
  const rwSpez = setzeImState(rw0, 'huelle.rest', { modus: 'spezifisch', flaecheM2: 10 });
  const fws = fixture('state-v4-fws-moosseedorf.json');
  const raum = rw.raeume[0]!;
  const bauteil = raum.bauteile.find((b) => b.anschluss.art === 'unbeheizt') ?? raum.bauteile[0]!;
  const hfRaum = Object.keys(rw.waermeabgabe.raeume)[0]!;
  const hf = rw.waermeabgabe.raeume[hfRaum]!.heizflaechen[0]!;
  const reihe = fws.verbrauch.reihen[0]!;
  const zr = reihe.zeitraeume?.[0];
  const typ = rw.huelle.bauteiltypen[0];
  const san = rw.sanierungen[0];
  const kreis = rw.waermeabgabe.heizkreise[0];

  /** Konkrete Pfade je Vorlage; mehrere Kontexte, weil `p` in verschiedenen Dateien verschiedene Dinge meint. */
  function konkret(vorlage: string): { state: State; pfad: string }[] {
    const [prefix, rest] = vorlage.includes(':') ? (vorlage.split(':') as [string, string]) : ['', vorlage];
    if (!prefix) return [{ state: rw, pfad: rest }, { state: fws, pfad: rest }, { state: rwSpez, pfad: rest }];
    const k: { state: State; pfad: string }[] = [];
    if (prefix === 'p') {
      k.push({ state: rw, pfad: `raeume.${raum.id}.${rest}` }, { state: rw, pfad: `raeume.${raum.id}.bauteile.${bauteil.id}.${rest}` }, { state: rw, pfad: `waermeabgabe.raeume.${hfRaum}.heizflaechen.${hf.id}.${rest}` }, { state: fws, pfad: `verbrauch.reihen.${reihe.id}.${rest}` });
      if (typ) k.push({ state: rw, pfad: `huelle.bauteiltypen.${typ.id}.${rest}` });
      if (san) k.push({ state: rw, pfad: `sanierungen.${san.id}.${rest}` });
      if (kreis) k.push({ state: rw, pfad: `waermeabgabe.heizkreise.${kreis.id}.${rest}` });
    }
    if (prefix === 'pR') k.push({ state: rw, pfad: `raeume.${raum.id}.${rest}` });
    if (prefix === 'pW') k.push({ state: rw, pfad: `waermeabgabe.raeume.${hfRaum}.${rest}` });
    if (prefix === 'basis') k.push({ state: fws, pfad: `warmwasser.${rest}` }, { state: fws, pfad: `verbrauch.abzug.${rest}` });
    if (prefix === 'ep' && zr) k.push({ state: fws, pfad: `verbrauch.reihen.${reihe.id}.zeitraeume.${zr.id}.${rest}` });
    return k;
  }

  /** Protokollzeile des Normalisierers nennt Listen als [n], Pfade der UI als .id — beides zulassen. */
  function genanntIm(probleme: string[], pfad: string): boolean {
    const seg = pfad.split('.');
    const re = new RegExp(`^${seg[0]}${seg.slice(1).map((s) => `(?:\\.${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|\\[\\d+\\])`).join('')}[:.]`);
    return probleme.some((x) => re.test(x));
  }

  const SENTINEL_ZAHL = 4242;
  it('jeder statische oder per Fixture auflösbare UI-Pfad überlebt normalisiereState (kein Schreiben ins Leere)', () => {
    const fehlend: string[] = [];
    const geprueft: string[] = [];
    for (const v of uiPfade()) {
      const kandidaten = konkret(v);
      if (!kandidaten.length) continue;
      let ok = false;
      let letzterFehler = '';
      for (const { state, pfad } of kandidaten) {
        // Sentinel je nach bestehendem Typ im Fixture bzw. Zahl
        const alt = leseAusState(state, pfad);
        const neu = typeof alt === 'string' ? 'audit-s12' : typeof alt === 'boolean' ? !alt : Array.isArray(alt) ? alt : alt && typeof alt === 'object' ? alt : SENTINEL_ZAHL;
        let s2: State;
        try {
          s2 = setzeImState(state, pfad, neu);
        } catch (e) {
          letzterFehler = String(e);
          continue;
        }
        const { state: norm, probleme } = normalisiereState(JSON.parse(JSON.stringify(s2)), KONTEXT);
        const zurueck = leseAusState(norm, pfad);
        // Pfad bekannt, wenn der Wert (ggf. konvertiert) überlebt ODER der Normalisierer ihn namentlich verwirft
        // (unbekannte Schlüssel fallen still weg, ohne Protokolleintrag — genau das wäre der «tInnenAuslegung»-Fall).
        const genannt = genanntIm(probleme, pfad);
        if (zurueck !== undefined || genannt) { ok = true; break; }
        letzterFehler = `${pfad} → nach normalisiereState ${JSON.stringify(zurueck)}, Protokoll: ${probleme.join(' | ') || '—'}`;
      }
      geprueft.push(v);
      if (!ok) fehlend.push(`${v}: ${letzterFehler}`);
    }
    expect(geprueft.length).toBeGreaterThan(100);
    expect(fehlend, fehlend.join('\n')).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* DATA-01: keine Zahlentabellen im Code                                                            */
/* ---------------------------------------------------------------------------------------------- */
describe('DATA-01 Daten nur in data/*.json', () => {
  it('src/kern enthält keine Objekt-/Array-Literale mit ≥ 4 fachlichen Zahlen (Tabellen-Kopien) — Befund: huelle.ts:857–858 (UI-Optionslisten Dicken)', () => {
    const treffer: string[] = [];
    // Bekannter Befund dieses Audits (Neu-3): zwei Optionslisten für den Stufen-Picker liegen im Kern statt in huelle-epochen.json.
    const bekannt = [/huelle\.ts:857:/, /huelle\.ts:858:/];
    for (const f of dateien(join(ROOT, 'src/kern'))) {
      const q = readFileSync(f, 'utf8');
      // Literale der Form { a: 1.2, b: 0.8, … } oder [0.5, 0.7, 1.1, …] auf einer Zeile mit ≥ 4 Dezimal-/Ganzzahlen
      for (const [i, z] of q.split('\n').entries()) {
        if (/^\s*(\*|\/\/)/.test(z)) continue;
        const nurLiteral = z.replace(/`[^`]*`|'[^']*'|"[^"]*"/g, '');
        const m = nurLiteral.match(/[{[][^{}[\]]*[{}\]]/g) ?? [];
        for (const lit of m) {
          const zahlen = lit.match(/(?<![A-Za-z_])\d+\.\d+(?![A-Za-z_])/g) ?? [];
          if (zahlen.length >= 4) treffer.push(`${f}:${i + 1}: ${z.trim().slice(0, 120)}`);
        }
      }
    }
    const neu = treffer.filter((t) => !bekannt.some((re) => re.test(t)));
    expect(treffer.length, 'die zwei bekannten Stellen in huelle.ts').toBe(2);
    expect(neu, neu.join('\n')).toEqual([]);
  });
  it('alle Datendateien tragen _meta { version, stand, quellen[] }', () => {
    for (const f of dateien(join(ROOT, 'data'), /\.json$/)) {
      const d = JSON.parse(readFileSync(f, 'utf8')) as { _meta?: { version?: string; stand?: string; quellen?: unknown[] } };
      expect(d._meta?.version, f).toMatch(/^\d+\.\d+\.\d+$/);
      expect(d._meta?.stand, f).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(d._meta?.quellen) && d._meta!.quellen!.length > 0, f).toBe(true);
    }
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* BUILD-06/11: Cookie exakt, Schemaversion eine Quelle                                            */
/* ---------------------------------------------------------------------------------------------- */
describe('BUILD-06 Cookie-Name exakt', () => {
  const req = (cookie: string) => new Request('https://x/api', { headers: { Cookie: cookie } });
  it('Teilstring-Treffer zählen nicht; nur der exakte Name wird gelesen', () => {
    expect(cookieLesen(req(`xyz_${COOKIE_NAME}=abc`))).toBeNull();
    expect(cookieLesen(req(`${COOKIE_NAME}_x=abc`))).toBeNull();
    expect(cookieLesen(req(`a=1; ${COOKIE_NAME}=tok; b=2`))).toBe('tok');
    expect(cookieLesen(req(`${COOKIE_NAME}=`))).toBe('');
    expect(cookieLesen(req(''))).toBeNull();
  });
});

describe('BUILD-11 Schemaversion eine Quelle', () => {
  it('functions/api/heizlast-projekte.js importiert src/state/version.ts; Wert = SCHEMA_VERSION des Clients', async () => {
    const q = readFileSync(join(ROOT, '..', 'functions/api/heizlast-projekte.js'), 'utf8');
    expect(q).toMatch(/import \{ SCHEMA_VERSION \} from '\.\.\/\.\.\/heizlast\/src\/state\/version\.ts'/);
    expect(SCHEMA_VERSION).toBe(4);
    expect(neuerState(KONTEXT).meta.schemaVersion).toBe(SCHEMA_VERSION);
    const grep = readFileSync(join(ROOT, 'src/state/schema.ts'), 'utf8');
    expect(grep).toMatch(/import \{ SCHEMA_VERSION \} from '\.\/version'/);
    expect(grep).not.toMatch(/SCHEMA_VERSION\s*=\s*\d/);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* CODE-03: Bericht zeigt die effektiven Speicherwerte (Override, Abwahl) aus dem Ergebnis          */
/* ---------------------------------------------------------------------------------------------- */
describe('CODE-03 Bericht und Overrides', () => {
  it('Puffer abgewählt → Bericht «0 l»; Override 500 l → Bericht «500 l»; WW-Speicher-Override 300 l → Bericht «300 l»', async () => {
    const { renderToString } = await import('preact-render-to-string');
    const { h } = await import('preact');
    const { Bericht } = await import('../../../src/bericht/Bericht');
    const { firmaDaten } = await import('../../../src/daten/firma');
    const text = (html: string, id: string) => new RegExp(`data-testid="${id}"[^>]*>([^<]*)<`).exec(html)?.[1]?.replace(/&nbsp;/g, ' ').trim() ?? null;
    const render = (s: State) => renderToString(h(Bericht, { state: s, ergebnis: berechne(s, daten), daten, firma: firmaDaten(), datum: '2026-10-31' }));
    const basis = setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'geraet.auswahlId', 'OE-0001');
    const vorschlag = text(render(basis), 'bericht-puffer');
    expect(vorschlag).toMatch(/^\d+ l$/);
    expect(vorschlag).not.toBe('0 l');
    expect(text(render(setzeImState(basis, 'speicher.puffer.aktiv', false)), 'bericht-puffer')).toBe('0 l');
    expect(text(render(setzeImState(basis, 'speicher.puffer.volumenOverrideLiter', 500)), 'bericht-puffer')).toBe('500 l');
    expect(text(render(setzeImState(basis, 'speicher.ww.volumenOverrideLiter', 300)), 'bericht-speicher-ww')).toBe('300 l');
  });
});
