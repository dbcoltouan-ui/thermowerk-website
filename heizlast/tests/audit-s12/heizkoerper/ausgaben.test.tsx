/**
 * Audit S12 (heizkoerper) — Probe Ausgaben (Zielbild §6.3) und Datenfluss (§6.2 Punkt 7):
 *  HK-12 (θ_VL,req je Raum → Gebäude-Max → WP-Urteil → Gerätefilter), HK-13/14 (Bericht: Seite Wärmeabgabe, eine VL),
 *  HK-15 (Dashboard-KPI mit Ampel, kritische Räume), HK-22 (FWS-Modus: Φ_HL verteilt, als Schätzung markiert),
 *  FLOW-01 (Gerätefilter nimmt `auslegungsVL`, kein zweites VL-Feld ohne Herkunft).
 * Render-Probe mit preact-render-to-string auf `berechne()`-Ergebnisse der eingefrorenen Fixtures.
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'preact-render-to-string';
import { alleDaten } from '../../../src/daten/index';
import { firmaDaten } from '../../../src/daten/firma';
import { berechne } from '../../../src/kern/berechne';
import type { State } from '../../../src/state/schema';
import { setzeImState } from '../../../src/state/store';
import { store } from '../../../src/state/app';
import { Bericht, berichtKapitel } from '../../../src/bericht/Bericht';
import { Dashboard } from '../../../src/ui/komponenten/Dashboard';
import { sichtbareSchritte } from '../../../src/ui/schritte';
import { filterVorlaufHerkunft } from '../../../src/ui/ergebnisTexte';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
const firma = firmaDaten();
const DATUM = '2026-10-31';

const kopie = (s: State): State => JSON.parse(JSON.stringify(s)) as State;
const nurText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
function textVon(html: string, testid: string): string | null {
  const m = new RegExp(`data-testid="${testid}"[^>]*>([^<]*)<`).exec(html);
  return m ? m[1]!.replace(/&nbsp;/g, ' ').trim() : null;
}
function render(s: State) {
  store.ersetze(s);
  const e = store.ergebnis.value;
  const dash = renderToString(<Dashboard schritte={sichtbareSchritte(e.relevanteSchritte)} status={e.status} />);
  const b = { state: s, ergebnis: e, daten, firma, datum: DATUM };
  const html = renderToString(<Bericht {...b} />);
  return { e, dash, html, b };
}

/** FWS-Projekt mit drei Räumen und Heizflächen (manuelle Raumheizlasten wie Befund B3 und Beispiele). */
function fwsMitDreiRaeumen(): State {
  let s = kopie(fixture('state-v4-fws-moosseedorf.json'));
  s = { ...s, raeume: [
    { id: 'wohnen', name: 'Wohnen', typ: 'wohnen', flaecheM2: 30, bauteile: [] },
    { id: 'schlafen', name: 'Schlafen', typ: 'schlafen', flaecheM2: 16, bauteile: [] },
    { id: 'bad', name: 'Bad', typ: 'bad', flaecheM2: 8, bauteile: [] },
  ] };
  s = setzeImState(s, 'waermeabgabe.raeume.wohnen', { phiHLManuellW: 1200, heizflaechen: [{ id: 'h1', bauart: 'platte_21', hoeheMm: 600, laengeMm: 800 }] });
  s = setzeImState(s, 'waermeabgabe.raeume.schlafen', { phiHLManuellW: 600, heizflaechen: [{ id: 'h2', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1200 }] });
  s = setzeImState(s, 'waermeabgabe.raeume.bad', { phiHLManuellW: 450, heizflaechen: [{ id: 'h3', bauart: 'bad_handtuch', hoeheMm: 1172, laengeMm: 600 }] });
  return s;
}

describe('HK-15: Dashboard zeigt Auslegungs-VL aus Heizflächen, Ampel/Urteil und kritische Räume', () => {
  it('raumweise CH-EFH: KPI-VL = θ_VL,req Wohnen, Urteil-Text, «Massgebend: Wohnen», Räume rot/bewertet', () => {
    const { e, dash } = render(kopie(fixture('state-v4-raumweise-efh.json')));
    const g = e.waermeabgabe!.gebaeude;
    expect(e.auslegungsVL.stufe).toBe('heizflaechen');
    expect(textVon(dash, 'kpi-vl')).toBe(`${Math.round(e.auslegungsVL.wert)} °C`);
    expect(dash).toContain('data-testid="skala-vorlauf"');
    expect(dash).toContain(`data-ampel="${g.ampel}"`);
    const t = nurText(dash);
    expect(t).toContain(g.urteil);
    expect(textVon(dash, 'kpi-kritisch')).toMatch(/Massgebend: Wohnen \d+ °C/);
    expect(textVon(dash, 'kpi-raeume-rot')).toMatch(/von 1 Räumen: Heizfläche zu klein bei 55 °C|Alle 1 Räume/);
  });

  it('FWS mit drei Räumen: Top 3 absteigend im Dashboard, Urteil «Ungeeignet» (Wohnen T21 → ≈ 80 °C)', () => {
    const { e, dash } = render(fwsMitDreiRaeumen());
    const g = e.waermeabgabe!.gebaeude;
    expect(g.kritischeRaeume.map((r) => r.name)).toEqual(['Wohnen', 'Bad', 'Schlafen'].slice(0, 3).sort((a, b) => (g.kritischeRaeume.find((r) => r.name === b)!.tVLReq ?? 0) - (g.kritischeRaeume.find((r) => r.name === a)!.tVLReq ?? 0)));
    expect(g.kritischeRaeume[0]!.name).toBe('Wohnen');
    expect(Math.abs(g.kritischeRaeume[0]!.tVLReq! - 81)).toBeLessThanOrEqual(2);
    expect(g.ampel).toBe('rot');
    expect(textVon(dash, 'kpi-kritisch')).toMatch(/^Massgebend: Wohnen \d+ °C, \w+ \d+ °C, \w+ \d+ °C$/);
    expect(nurText(dash)).toContain('Ungeeignet ohne Massnahmen');
    expect(textVon(dash, 'kpi-vl')).toBe(`${Math.round(e.auslegungsVL.wert)} °C`);
  });

  it('ohne Heizflächen: Dashboard nennt den Standardwert des Systems ausdrücklich (kein verdeckter Default)', () => {
    const { e, dash } = render(kopie(fixture('state-v4-fws-moosseedorf.json')));
    expect(e.auslegungsVL).toMatchObject({ herkunft: 'fallback', stufe: 'standardwert', wert: 55 });
    expect(nurText(dash)).toContain('Noch keine Heizflächen bewertet, gerechnet mit');
    expect(dash).not.toContain('data-testid="kpi-kritisch"');
  });
});

describe('HK-13 / HK-14: Bericht — Seite Wärmeabgabe, eine Vorlauftemperatur', () => {
  it('Bericht-Kapitel «Wärmeabgabe» mit Tabelle je Raum (Φ_HL, Σ Q, Deckung, θ_VL,req, Beurteilung), Heizflächen-Tabelle, Fazit = Urteil, Massnahmen', () => {
    const { e, html, b } = render(fwsMitDreiRaeumen());
    expect(berichtKapitel(b).map((k) => k.id)).toContain('waermeabgabe');
    for (const r of e.waermeabgabe!.raeume) {
      expect(html).toContain(`data-testid="bericht-wa-raum-${r.id}"`);
      expect(textVon(html, `bericht-wa-raum-${r.id}-vl`)).toBe(`${r.tVLReq!.wert.toFixed(1)} °C`.replace(/\.0 /, ' '));
      for (const hf of r.heizflaechen) expect(html).toContain(`data-testid="bericht-hf-${hf.id}"`);
    }
    expect(textVon(html, 'bericht-wa-vl')).toBe(`${e.auslegungsVL.wert.toFixed(1)} °C`.replace(/\.0 /, ' '));
    expect(textVon(html, 'bericht-wa-urteil')).toBe(e.waermeabgabe!.gebaeude.urteil);
    expect(html).toContain('data-testid="bericht-wa-skala"');
    const t = nurText(html);
    expect(t).toMatch(/Plattenheizkörper Typ 21.*H 600 mm · L 800 mm/);
    expect(t).toContain('Tabelle aus Bauart und Massen');
    expect(t).toContain('logarithmischer Übertemperatur');
    expect(t).toContain('ohne Aufheizreserve');
    expect(t).toMatch(/Höchster Bedarf: Wohnen \d+ °C/);
    expect(html).toContain('data-testid="bericht-wa-massnahmen-wohnen"');
    expect(t).toMatch(/Tausch .*auf Typ 33 gleicher Grösse → θ_VL,req \d+ °C/);
    expect(t).toContain('zu klein');
    // Quellen: EN 442 genannt
    expect(t).toMatch(/EN 442/);
  });

  it('Zusammenfassung «Auslegungs-Vorlauf» = e.auslegungsVL = Dashboard-KPI = Fazit Wärmeabgabe; kein Altfeld 55 °C', () => {
    const { e, dash, html } = render(fwsMitDreiRaeumen());
    expect(textVon(html, 'bericht-vl')).toBe(textVon(dash, 'kpi-vl'));
    expect(textVon(html, 'bericht-vl')).toBe(`${Math.round(e.auslegungsVL.wert)} °C`);
    expect(e.auslegungsVL.wert).toBeGreaterThan(70);
    expect(textVon(html, 'bericht-vl')).not.toBe('55 °C');
  });

  it('Override der Auslegungs-VL (Schritt 6) wirkt in Dashboard, Bericht, Gerätefilter und MAG — mit Warnung, wenn unter dem Bedarf', () => {
    const s = setzeImState(fwsMitDreiRaeumen(), 'waermeabgabe.auslegungsVLOverrideC', 62);
    const { e, dash, html } = render(s);
    expect(e.auslegungsVL).toMatchObject({ wert: 62, herkunft: 'override' });
    expect(textVon(dash, 'kpi-vl')).toBe('62 °C');
    expect(textVon(html, 'bericht-vl')).toBe('62 °C');
    expect(textVon(html, 'bericht-wa-vl')).toBe('62 °C');
    expect(e.geraet.filterVorlaufStandard!.wert).toBeGreaterThanOrEqual(62);
    expect(e.speicher.mag!.n.begruendung).toContain('62 °C');
    expect(e.hinweise.some((h) => h.code === 'waermeabgabe.gebaeude.overrideZuTief')).toBe(true);
    expect(e.waermeabgabe!.gebaeude.auslegungsVLAusHeizflaechen!.wert).toBeGreaterThan(70);
    expect(nurText(html)).toMatch(/aus Heizflächen: \d+\.\d °C/);
  });
});

describe('HK-12 / FLOW-01: Gerätefilter nimmt die eine Auslegungs-VL', () => {
  it('filterVorlaufStandard = auslegungsVL (oder höhere WW-Ladetemperatur, gekennzeichnet); Herkunftstext nennt den massgebenden Raum', () => {
    const s = fwsMitDreiRaeumen();
    s.warmwasser.wwKuenftig = false;
    const { e } = render(s);
    expect(e.geraet.filterVorlaufStandard).toBe(e.auslegungsVL);
    expect(e.geraet.filterVorlauf).toBe(e.auslegungsVL);
    expect(filterVorlaufHerkunft(e)).toBe('aus Heizflächen, max. Raum: Wohnen');
    // Liste enthält nur Geräte, deren Vorlauf max. ≥ Auslegungs-VL
    for (const g of e.geraet.liste) expect(g.vorlaufMaxC ?? 99).toBeGreaterThanOrEqual(e.auslegungsVL.wert);
    // Filter-Override unter dem Bedarf → Warnung mit Pfad (kein stilles zweites VL-Feld)
    const o = berechne(setzeImState(s, 'geraet.filterOverrides.vorlaufC', 50), daten);
    expect(o.geraet.filterVorlauf).toMatchObject({ wert: 50, herkunft: 'override' });
    expect(o.hinweise.some((h) => h.code === 'geraet.filterVorlaufZuTief' && h.pfad === 'geraet.filterOverrides.vorlaufC')).toBe(true);
    expect(o.annahmen.some((a) => a.wert === o.geraet.filterVorlauf)).toBe(true);
  });

  it('WW-Ladetemperatur über der Heizungs-VL: Filter-Vorlauf = Ladetemperatur, Herkunftstext sagt es', () => {
    const s = setzeImState(fwsMitDreiRaeumen(), 'waermeabgabe.auslegungsVLOverrideC', 45);
    const { e } = render(s);
    expect(e.warmwasser.kuenftig).not.toBeNull();
    const tLade = e.speicher.ww!.tLade.wert;
    expect(tLade).toBeGreaterThan(45);
    expect(e.geraet.filterVorlaufStandard!.wert).toBe(tLade);
    expect(filterVorlaufHerkunft(e)).toMatch(/Warmwasser-Ladetemperatur/);
  });
});

describe('HK-22: FWS-Modus mit Heizflächen ohne raumweise Heizlast', () => {
  it('Φ_HL je Raum = Q_hl / EBF × 1.10 × A (Schätzung ±25 %, in annahmen), Heizflächen-Check und Auslegungs-VL laufen; Bericht markiert die Schätzung', () => {
    let s = kopie(fixture('state-v4-fws-moosseedorf.json'));
    s = { ...s, raeume: [{ id: 'r1', name: 'Wohnen', typ: 'wohnen', flaecheM2: 20, bauteile: [] }] };
    s = setzeImState(s, 'waermeabgabe.raeume.r1', { heizflaechen: [{ id: 'g', bauart: 'guss_glieder', hoeheMm: 600, tiefeMm: 160, glieder: 20 }] });
    const { e, html, b } = render(s);
    const r = e.waermeabgabe!.raeume[0]!;
    const soll = (e.zuschlaege.qhl!.wert / e.ebf!.wert) * daten.fws.ebf.faktorNwfZuEbf.typ * 20;
    expect(r.phiHL!.wert).toBeCloseTo(soll, 3);
    expect(Math.abs(r.phiHL!.wert - 1364.7)).toBeLessThan(2); // README S8: Moosseedorf + 20 m² → 1 364.7 W
    expect(r.phiHL).toMatchObject({ herkunft: 'schaetzung', stufe: 'verteilung' });
    expect(r.phiHL!.unsicherheit!).toBeGreaterThanOrEqual(25);
    expect(e.annahmen.some((a) => a.wert === r.phiHL && a.schritt === 'waermeabgabe')).toBe(true);
    expect(r.tVLReq).not.toBeNull();
    expect(e.auslegungsVL.stufe).toBe('heizflaechen');
    expect(berichtKapitel(b).map((k) => k.id)).toContain('waermeabgabe');
    const zeile = /data-testid="bericht-wa-raum-r1"[\s\S]*?<\/tr>/.exec(html)![0];
    expect(nurText(zeile)).toMatch(/geschätzt · ±\d+ %/);
    // eigene Angabe gewinnt, Herkunft Eingabe
    const m = berechne(setzeImState(s, 'waermeabgabe.raeume.r1.phiHLManuellW', 1500), daten);
    expect(m.waermeabgabe!.raeume[0]!.phiHL).toMatchObject({ wert: 1500, herkunft: 'eingabe' });
  });

  it('Raumtemperatur im FWS-Modus wirkt auf Q und θ_VL,req, nicht auf die verteilte Raumheizlast (Entscheid Daniel 30.10.)', () => {
    let s = kopie(fixture('state-v4-fws-moosseedorf.json'));
    s = { ...s, raeume: [{ id: 'r1', name: 'Wohnen', typ: 'wohnen', flaecheM2: 20, bauteile: [] }] };
    s = setzeImState(s, 'waermeabgabe.raeume.r1', { heizflaechen: [{ id: 'p', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 }] });
    const a = berechne(s, daten).waermeabgabe!.raeume[0]!;
    const w = berechne(setzeImState(s, 'raeume.r1.thetaIntC', 23), daten).waermeabgabe!.raeume[0]!;
    expect(w.phiHL!.wert).toBeCloseTo(a.phiHL!.wert, 6);
    expect(w.heizflaechen[0]!.qZiel!.wert).toBeLessThan(a.heizflaechen[0]!.qZiel!.wert);
    expect(w.tVLReq!.wert).toBeGreaterThan(a.tVLReq!.wert);
  });
});
