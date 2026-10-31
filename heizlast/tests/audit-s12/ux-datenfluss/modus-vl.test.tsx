/**
 * Audit S12 (ux-datenfluss), Proben zu UX-02 (Modus / genau eine massgebende Heizlast), FLOW-01 (eine VL),
 * FLOW-07 (Overrides wirken überall), FLOW-12 (Label der Schätzung), FLOW-03/04 (Migration), UX-42 (Bericht = Dashboard),
 * UX-41 (Gerätetabelle), UX-43 (keine toten Felder), UX-46 (Annahmen-Kapitel).
 *
 * Sollwerte extern: Moosseedorf Q_hl 9 304.7 W / Q_h 10 731.6 W (BEISPIELRECHNUNG, Handrechnung Session 3),
 * CH-EFH saldiert 2 678.7 W (Handrechnung Session 4); Guss 10 Glieder H 600: Q_N ≈ 960 W (Befund B2, 96 W/Glied).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { Bericht, berichtKapitel } from '../../../src/bericht/Bericht';
import { alleDaten } from '../../../src/daten/index';
import { firmaDaten } from '../../../src/daten/firma';
import { berechne } from '../../../src/kern/berechne';
import { hydrateState } from '../../../src/state/hydrate';
import type { State } from '../../../src/state/schema';
import { SCHEMA_VERSION } from '../../../src/state/schema';
import { store } from '../../../src/state/app';
import { setzeImState } from '../../../src/state/store';
import { Dashboard } from '../../../src/ui/komponenten/Dashboard';
import { sichtbareSchritte } from '../../../src/ui/schritte';

const daten = alleDaten();
const firma = firmaDaten();
const K = { id: 'p-test', jetzt: '2026-10-29T12:00:00.000Z' };
const roh = (name: string) => readFileSync(join(__dirname, '..', '..', 'fixtures', name), 'utf8');
function fixture(name: string): State {
  const h = hydrateState(roh(name), K);
  if (!h.ok) throw new Error(h.text);
  return h.state;
}
const textVon = (html: string, testid: string): string | null => {
  const m = new RegExp(`data-testid="${testid}"[^>]*>([^<]*)<`).exec(html);
  return m ? m[1]!.replace(/&nbsp;/g, ' ').trim() : null;
};
const nurText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('UX-02 — Modus explizit, genau eine massgebende Heizlast mit Herkunft', () => {
  it('state.methode ist explizit (null | fws | raumweise); massgebend trägt Quelle, Art, Status, Label', () => {
    const fws = berechne(fixture('state-v4-fws-moosseedorf.json'), daten);
    expect(fws.methode).toBe('fws');
    expect(fws.heizlast.massgebend).toMatchObject({ quelle: 'fws', art: 'verbrauch', status: 'gemessen' });
    expect(fws.heizlast.massgebend.wert!.wert).toBeCloseTo(9304.7, 0);
    expect(fws.heizlast.raumweise).toBeNull();
    const rw = berechne(fixture('state-v4-raumweise-efh.json'), daten);
    expect(rw.heizlast.massgebend).toMatchObject({ quelle: 'raumweise', art: 'raumweise', status: 'raumweise' });
    expect(rw.heizlast.massgebend.wert!.wert).toBeCloseTo(2678.7, 0);
    expect(rw.heizlast.fws).toBeNull();
    // Die Zuschläge rechnen auf GENAU diesem Objekt (keine zweite Quelle)
    expect(rw.zuschlaege.qhl).toBe(rw.heizlast.massgebend.wert);
    expect(fws.zuschlaege.qhl).toBe(fws.heizlast.massgebend.wert);
  });

  it('Dashboard-Kennzahlen = Bericht-Kennzahlen (gleiches Ergebnis-Objekt) in beiden Modi und im Bauperioden-Fall', () => {
    const faelle: State[] = [
      fixture('state-v4-fws-moosseedorf.json'),
      fixture('state-v4-raumweise-efh.json'),
      setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'verbrauch.quelle', 'keine'),
    ];
    for (const s of faelle) {
      store.ersetze(s);
      const e = store.ergebnis.value;
      const dash = renderToString(<Dashboard schritte={sichtbareSchritte(e.relevanteSchritte)} status={e.status} />);
      const html = renderToString(<Bericht state={s} ergebnis={e} daten={daten} firma={firma} datum="2026-10-31" />);
      for (const [b, d] of [['bericht-qh', 'kpi-qh'], ['bericht-qhl', 'kpi-qhl'], ['bericht-spez', 'kpi-spez'], ['bericht-vl', 'kpi-vl'], ['bericht-puffer', null]] as const) {
        if (d) expect(textVon(html, b), b).toBe(textVon(dash, d));
      }
      expect(textVon(html, 'bericht-puffer')).toBe((textVon(dash, 'kpi-speicher') ?? '').split(' / ')[1]);
    }
  });

  it('FLOW-12: ohne Verbrauch ist die Heizlast als «Schätzung» (Bauperiode) beschriftet, nie als «aus Verbrauch»', () => {
    const s = setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'verbrauch.quelle', 'keine');
    store.ersetze(s);
    const e = store.ergebnis.value;
    expect(e.heizlast.massgebend.status).toBe('schaetzung');
    expect(e.heizlast.massgebend.label).toContain('Bauperiode');
    const dash = renderToString(<Dashboard schritte={sichtbareSchritte(e.relevanteSchritte)} status={e.status} />);
    expect(textVon(dash, 'kpi-status')).toMatch(/^Schätzung/);
    const html = nurText(renderToString(<Bericht state={s} ergebnis={e} daten={daten} firma={firma} datum="2026-10-31" />));
    expect(html).toContain('Schätzung');
    expect(html).not.toContain('aus Verbrauch (FWS-Kurs)');
    // Gegenprobe nur mit echten Daten: keine Räume mit Bauteilen → keine Gegenprobe
    expect(e.heizlast.gegenprobe).toBeNull();
  });
});

describe('FLOW-01 — genau eine Vorlauftemperatur mit Herkunft', () => {
  it('State kennt nur Rohangaben zum Vorlauf (Kreis-VL, Ziel-VL, Override, Filter-Override, alte Heizkurve); Ergebnis hat EINE auslegungsVL', () => {
    const s = fixture('state-v4-raumweise-efh.json');
    const vlFelder = JSON.stringify(s).match(/"(tVLC|zielVLC|auslegungsVLOverrideC|vorlaufC|tLadeC)"/g) ?? [];
    expect(vlFelder.sort()).toEqual(['"tVLC"']); // nur der Heizkreis trägt einen Vorlauf in dieser Fixture
    const e = berechne(s, daten);
    expect(e.auslegungsVL).toBe(e.waermeabgabe!.gebaeude.auslegungsVL);
    expect(e.auslegungsVL.herkunft).toBe('berechnet');
    expect(e.auslegungsVL.stufe).toBe('heizflaechen');
    expect(e.auslegungsVL.begruendung).toMatch(/Wohnen/);
    // Gerätefilter: max(VL, WW-Ladetemperatur) — Herkunft benannt
    expect(e.geraet.filterVorlauf!.wert).toBeCloseTo(Math.max(e.auslegungsVL.wert, e.speicher.ww!.tLade.wert), 6);
    // MAG mit derselben VL
    expect(e.speicher.mag!.n.begruendung).toContain(`${Math.round(e.auslegungsVL.wert)} °C`);
    // Skala im Dashboard = dieselbe VL
    expect(e.skalen.vorlauf.wert).toBeCloseTo(e.auslegungsVL.wert, 6);
  });

  it('Kreis-VL allein (ohne Heizflächen-Bewertung) wird zur Auslegungs-VL; Override gewinnt mit Herkunft «override» und Warnung bei Unterschreitung', () => {
    const basis = fixture('state-v4-fws-moosseedorf.json');
    const mitKreis = setzeImState(basis, 'waermeabgabe.heizkreise', [{ id: 'k1', tVLC: 62 }]);
    const e1 = berechne(mitKreis, daten);
    expect(e1.auslegungsVL.wert).toBe(62);
    expect(e1.auslegungsVL.stufe).toBe('heizkreis');
    // Guss im Bad: θ_VL,req aus Heizfläche
    const mitRaum = setzeImState(setzeImState(basis, 'raeume', [{ id: 'r1', name: 'Bad', typ: 'bad', flaecheM2: 10, bauteile: [] }]), 'waermeabgabe.raeume.r1', { heizflaechen: [{ id: 'h1', bauart: 'guss_glieder', hoeheMm: 600, glieder: 10 }] });
    const e2 = berechne(mitRaum, daten);
    const req = e2.waermeabgabe!.raeume[0]!.tVLReq!.wert;
    expect(e2.auslegungsVL.wert).toBeCloseTo(req, 6);
    const ov = berechne(setzeImState(mitRaum, 'waermeabgabe.auslegungsVLOverrideC', Math.floor(req) - 10), daten);
    expect(ov.auslegungsVL.herkunft).toBe('override');
    expect(ov.hinweise.some((h) => h.schritt === 'waermeabgabe' && h.stufe === 'warnung' && /Vorlauf|VL/.test(h.text))).toBe(true);
    expect(ov.geraet.filterVorlaufStandard!.wert).toBeCloseTo(Math.max(ov.auslegungsVL.wert, ov.speicher.ww!.tLade.wert), 6);
  });
});

describe('FLOW-03/04 — ein Ladepfad, Migrationskette mit eingefrorenen Fixtures', () => {
  for (const n of ['fws-moosseedorf', 'raumweise-efh']) {
    it(`${n}: v2 → v4 liefert dieselbe Heizlast wie die v4-Fixture; schemaVersion = ${SCHEMA_VERSION}; Protokoll vorhanden`, () => {
      const h2 = hydrateState(roh(`state-v2-${n}.json`), K);
      const h3 = hydrateState(roh(`state-v3-${n}.json`), K);
      const h4 = hydrateState(roh(`state-v4-${n}.json`), K);
      expect(h2.ok && h3.ok && h4.ok).toBe(true);
      if (!h2.ok || !h3.ok || !h4.ok) return;
      expect(h2.vonVersion).toBe(2);
      expect(h2.state.meta.schemaVersion).toBe(SCHEMA_VERSION);
      expect(h2.protokoll.length).toBeGreaterThan(0);
      const q = (s: State) => berechne(s, daten).heizlast.massgebend.wert!.wert;
      expect(q(h2.state)).toBeCloseTo(q(h4.state), 6);
      expect(q(h3.state)).toBeCloseTo(q(h4.state), 6);
      // Die v2-Raumweise-Fixture trägt explizite Arten/Anschlüsse (dachSteil/aussen), die v4-Fixture generische (decke/auto):
      // beide bleiben gültig und rechnen gleich; State-Gleichheit gilt daher nur für die FWS-Kette.
      if (n === 'fws-moosseedorf') expect(h2.state).toEqual(h4.state);
      expect(h3.state).toEqual(h4.state);
    });
  }
  it('alle Lader gehen durch hydrateState (grep-Beleg in der Probe: Entwurf, Projektliste, Cloud, Import)', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'src', 'state', 'persistenz.ts'), 'utf8');
    // Jede Stelle, die einen gespeicherten State in den Store bringt, ruft hydrateState oder eine Funktion, die es tut.
    expect(src.match(/hydrateState\(/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(src).not.toMatch(/JSON\.parse\([^)]*\)\s*as\s*State/);
    expect(src).not.toMatch(/store\.ersetze\(JSON\.parse/);
  });
});

describe('UX-41/43/46 — Bericht: Gerätetabelle aus DB, keine toten Felder, Annahmen-Kapitel', () => {
  it('Gerätetabelle erscheint mit Datenbankwerten; Objektdaten zeigen nur relevante, verwendete Angaben', () => {
    const s = setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'geraet.auswahlId', 'OE-0001');
    const e = berechne(s, daten);
    const html = renderToString(<Bericht state={s} ergebnis={e} daten={daten} firma={firma} datum="2026-10-31" />);
    expect(berichtKapitel({ state: s, ergebnis: e, daten, firma, datum: '2026-10-31' }).map((k) => k.id)).toContain('waermepumpe');
    expect(textVon(html, 'bericht-wp-geraet')).toContain('Oertli');
    const t = nurText(html);
    expect(t).toContain('11.2 kW');
    expect(t).toContain('Vorlauf max.');
    // UX-43: keine toten Felder — im FWS-Modus weder Keller noch Dachform, kein «Sanierungsstand», kein «Vorlauf Heizung max.»
    expect(t).not.toContain('Sanierungsstand');
    expect(t).not.toContain('Vorlauf Heizung max');
    expect(t).not.toMatch(/Keller\s*unbeheizt|Steildach/);
    // UX-46: Annahmen-Kapitel vorhanden, Zahl = Ergebnis
    expect(html).toContain('data-testid="kapitel-annahmen"');
    expect(t).toContain(`Insgesamt ${e.annahmen.length} Annahmen`);
    // Band der Bauperioden-Schätzung erscheint im Bericht (UX-46)
    const sch = setzeImState(s, 'verbrauch.quelle', 'keine');
    const es = berechne(sch, daten);
    const hs = nurText(renderToString(<Bericht state={sch} ergebnis={es} daten={daten} firma={firma} datum="2026-10-31" />));
    expect(es.heizlast.massgebend.wert!.band).toBeDefined();
    expect(hs).toMatch(/Spanne/);
  });
});
