/**
 * Audit S12 — Fachlogik, FWS-Modus (FACH-01, 03, 04, 05, 06, 07) über den EINEN Rechenpfad `berechne(state, daten)`.
 *
 * Sollwerte ausschliesslich extern:
 *  - FWS M3 Aufgaben und Lösungen 1-2025 (docs/fws/FWS M3_Aufgaben und Lösungen 1-25.txt): A1 12.5/1.14/13.64,
 *    A2 12.55/1.79/0.51/14.85 und saniert 8.8/1.26/0.52/10.58, A4 8.4/0.6/9.0/1813 h/9.14/57 W/m.
 *  - FWS M3 Folie 16 (docs/fws/FWS M3_1-25.txt Z. 363–393): t_voll 1900/2100, 2000/2300, 2300/2500.
 *  - Befund befund_fachlogik.md Anhang A5: 3 Jahre Gas 2 500/2 400/2 600 → Q_hl ≈ 11.3 kW (Hi), nicht 33.9.
 *  - Handrechnungen (im Test dokumentiert) für die Zeitgewichtung nach FWS-RECHENWEGE §3a.
 *  - Heizgradtage direkt aus data/heizgradtage.json summiert (keine Kernfunktion), HGT_norm aus klimastationen.json.
 * Vorlage für den State: tests/fixtures/state-v4-fws-moosseedorf.json (Station Wynau, 550 m ü. M.).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import type { State } from '../../../src/state/schema';
import { setzeImState } from '../../../src/state/store';
import { erwarteNahe } from '../../kern/hilfen';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
const basis = (): State => fixture('state-v4-fws-moosseedorf.json');
const setzeAlle = (s: State, paare: Record<string, unknown>): State => Object.entries(paare).reduce((acc, [p, w]) => setzeImState(acc, p, w), s);

/** Gas-Reihe «Zeiträume» mit Kalenderjahren. */
function gasJahre(mengen: Record<number, number>) {
  return [{ id: 'r-erdgas', energietraeger: 'erdgas', art: 'zeitraeume', zeitraeume: Object.entries(mengen).map(([jahr, menge]) => ({ id: `v${jahr}`, menge, jahr: Number(jahr) })) }];
}

describe('FACH-01 — Mehrjahres-Verbrauch wird gemittelt, nicht summiert (echter Pfad berechne())', () => {
  const s = setzeAlle(basis(), { 'verbrauch.reihen': gasJahre({ 2022: 2500, 2023: 2400, 2024: 2600 }), 'verbrauch.wwBisher': false });

  it('FWS-Kurs (Ho 10.4, η 0.9): Jahresmenge 2 500 m³/a → Q_n 23 400 kWh/a → Q_hl 11.7 kW (Befund: 33.9 kW im alten Tool)', () => {
    const e = berechne(s, daten);
    const f = e.heizlast.fws!;
    expect(f.vollstaendig, f.hinweise.map((h) => h.text).join(' | ')).toBe(true);
    expect(f.traeger[0]!.anzahlEintraege).toBe(3);
    expect(f.traeger[0]!.jahresmenge.wert).toBeCloseTo(2500, 6);
    expect(f.qnBrutto!.wert).toBeCloseTo(2500 * 10.4 * 0.9, 3);
    erwarteNahe(e.heizlast.massgebend.wert!.wert, 11_700, 0.1, 'Q_hl Kurs');
    expect(e.heizlast.massgebend.wert!.wert).toBeLessThan(15_000); // sicher nicht ×3
    expect(e.zuschlaege.qhl).toBe(e.heizlast.massgebend.wert);
  });

  it('Konvention Hi (10.08 kWh/m³, η 0.9 auf Hi): Q_hl 11.34 kW ≙ Befund A5 «≈ 11.3 kW» (dort Hi 10.04)', () => {
    const e = berechne(setzeImState(s, 'verbrauch.konvention', 'hi'), daten);
    erwarteNahe(e.heizlast.massgebend.wert!.wert, 11_300, 1, 'Q_hl Hi vs. Befund');
    expect(e.heizlast.massgebend.wert!.wert).toBeCloseTo((2500 * 10.08 * 0.9 * 1000) / 2000, 3);
  });

  it('Streuung der drei Jahre 4 % → grün; kein Hinweis «Zeitraum kurz» bei 3 Jahren', () => {
    const e = berechne(s, daten);
    expect(e.heizlast.fws!.streuung.ampel).toBe('gruen');
    expect(e.hinweise.some((h) => h.code === 'verbrauch.zeitraum.kurz')).toBe(false);
  });

  it('Gegenprobe Öl über Lieferungen und Tankstände: 3 × 2 000 l über 2 Jahre → 3 000 l/a (Befund A5: 37.9 kW im alten Tool)', () => {
    // Stand 1.1.2022 voll 3 000 l; Lieferungen 2 000 l am 1.9.2022, 1.5.2023, 1.1.2024 (jeweils wieder voll);
    // Stand 1.1.2024 vor der Lieferung 1 000 l → Verbrauch 3 000 + 2 000 + 2 000 + 2 000 − 1 000 = 8 000 l?
    // Einfacher und eindeutig: Stand 1.1.2022 3 000, Lieferungen 2 000 (1.9.2022) + 2 000 (1.5.2023), Stand 1.1.2024 1 000
    // → 3 000 + 4 000 − 1 000 = 6 000 l in 730 Tagen (zwei ganze Kalenderjahre) = 3 000 l/a.
    const reihe = [{ id: 'r-oel', energietraeger: 'heizoel', art: 'lieferungen', ablesungen: [{ id: 'a1', datum: '2022-01-01', bestand: 3000 }, { id: 'a2', datum: '2024-01-01', bestand: 1000 }], lieferungen: [{ id: 'l1', datum: '2022-09-01', menge: 2000 }, { id: 'l2', datum: '2023-05-01', menge: 2000 }] }];
    const e = berechne(setzeAlle(basis(), { 'verbrauch.reihen': reihe, 'verbrauch.eta': { heizoel: { preset: 'alt_ohneWW' } }, 'verbrauch.wwBisher': false }), daten);
    const t = e.heizlast.fws!.traeger[0]!;
    expect(t.zeitraeume[0]!.menge.wert).toBe(6000);
    expect(t.zeitraeume[0]!.zeitraum.tage).toBe(730);
    erwarteNahe(t.jahresmenge.wert, 3000, 0.5, 'Jahresmenge Öl');
    erwarteNahe(e.heizlast.massgebend.wert!.wert, (3000 * 10.5 * 0.85 * 1000) / 2000, 0.5, 'Q_hl Öl');
  });
});

describe('FACH-03 — Sanierungen jahresgenau gewichtet (Handrechnung, zwei Massnahmen kumulativ)', () => {
  /**
   * Öl, η 0.85 (Kurs alt ohne WW), Ho 10.5, t_voll 2 000, kein WW-Abzug. Kalenderjahre 2021: 3 200 l, 2022: 2 700 l,
   * 2023: 2 600 l. Fenster 15 % ausgeführt 1.1.2022, Kellerdecke 8 % ausgeführt 1.1.2023.
   * F(2021) = 1, F(2022) = 0.85, F(2023) = 0.85·0.92 = 0.782 = F_heute.
   * §3a je Jahr: W_pre = W/F, W_ist = W_pre·F_heute:
   *   2021: 3 200 → ist 2 502.4 l · 2022: 2 700/0.85 = 3 176.47 → ist 2 484.0 l · 2023: 2 600/0.782 = 3 324.81 → ist 2 600 l
   *   Mittel ist = 2 528.8 l/a → Q_n = 2 528.8·10.5·0.85 = 22 569.6 kWh/a → Q_hl,ist = 11.285 kW
   *   Mittel pre = 3 233.76 l/a → Q_hl,unsaniert = 14.431 kW
   *   Zum Vergleich: Rohmittel 2 833 l/a → 12.65 kW (zu hoch), multiplikativ 12.65·0.782 = 9.89 kW (Doppelabzug, zu tief).
   */
  const s = setzeAlle(basis(), {
    'verbrauch.reihen': [{ id: 'r-oel', energietraeger: 'heizoel', art: 'zeitraeume', zeitraeume: [{ id: 'v21', menge: 3200, jahr: 2021 }, { id: 'v22', menge: 2700, jahr: 2022 }, { id: 'v23', menge: 2600, jahr: 2023 }] }],
    'verbrauch.eta': { heizoel: { preset: 'alt_ohneWW' } },
    'verbrauch.wwBisher': false,
    sanierungen: [
      { id: 's1', massnahme: 'fenster', status: 'ausgefuehrt', datum: '2022-01' },
      { id: 's2', massnahme: 'kellerdecke', status: 'ausgefuehrt', datum: '2023-01-01' },
    ],
  });

  it('Q_hl,ist 11.29 kW, Q_hl,unsaniert 14.43 kW (±0.1 %); massgebend = ist; Faktor 0.782', () => {
    const e = berechne(s, daten);
    const f = e.heizlast.fws!;
    expect(f.vollstaendig, f.hinweise.map((h) => h.text).join(' | ')).toBe(true);
    erwarteNahe(f.qhlIst!.wert, 11_285, 0.1, 'Q_hl ist');
    erwarteNahe(f.qhlUnsaniert!.wert, 14_431, 0.1, 'Q_hl unsaniert');
    expect(e.heizlast.massgebend.wert).toBe(f.qhlKorr);
    expect(f.qhlKorr!.wert).toBeCloseTo(f.qhlIst!.wert, 6);
    expect(f.sanierungen.faktorIst.wert).toBeCloseTo(0.782, 6);
    // weder Rohmittel noch Doppelabzug
    expect(f.qhlIst!.wert).toBeLessThan(12_600);
    expect(f.qhlIst!.wert).toBeGreaterThan(10_000);
    // Lage je Zeitraum sichtbar (UI «Wirkung auf die Verbrauchszeiträume»)
    const z = f.traeger[0]!.zeitraeume;
    expect(z.map((x) => x.sanierung.bezug.find((b) => b.id === 's1')!.lage)).toEqual(['vorher', 'nachher', 'nachher']);
    expect(z.map((x) => x.sanierung.bezug.find((b) => b.id === 's2')!.lage)).toEqual(['vorher', 'vorher', 'nachher']);
  });

  it('Massnahme mitten im Zeitraum (Fassade 32 % am 1.1.2023 in 1.7.2022–30.6.2023, 2 500 l): Teilperioden 184 d × 1 + 181 d × 0.68 → Q_hl,ist 9.02 kW', () => {
    // Σ L_j·F_j = 184 + 181·0.68 = 307.08; W_pre = 2 500·365/307.08 = 2 971.5 l; W_ist = 2 971.5·0.68 = 2 020.6 l
    // Q_hl,ist = 2 020.6·10.5·0.85/2 000 = 9.017 kW; Q_hl,unsaniert = 13.261 kW
    const e = berechne(
      setzeAlle(s, {
        'verbrauch.reihen': [{ id: 'r-oel', energietraeger: 'heizoel', art: 'zeitraeume', zeitraeume: [{ id: 'v1', menge: 2500, von: '2022-07-01', bis: '2023-06-30' }] }],
        sanierungen: [{ id: 's1', massnahme: 'fassade', status: 'ausgefuehrt', datum: '2023-01-01' }],
      }),
      daten,
    );
    const f = e.heizlast.fws!;
    const z = f.traeger[0]!.zeitraeume[0]!;
    expect(z.sanierung.subperioden.map((p) => [p.tage, Math.round(p.faktor * 100) / 100])).toEqual([[184, 1], [181, 0.68]]);
    expect(z.sanierung.bezug[0]!.lage).toBe('innerhalb');
    erwarteNahe(f.qhlIst!.wert, 9_017, 0.1, 'Q_hl ist (innerhalb)');
    erwarteNahe(f.qhlUnsaniert!.wert, 13_261, 0.1, 'Q_hl unsaniert (innerhalb)');
  });

  it('Massnahme VOR allen Zeiträumen ändert Q_hl,ist nicht; geplante Massnahme wirkt nur auf Q_hl,korr; ausgeführt ohne Datum → Warnung', () => {
    const basisOhne = setzeImState(s, 'sanierungen', []);
    const roh = berechne(basisOhne, daten).heizlast.fws!.qhlIst!.wert;
    const vorher = berechne(setzeImState(s, 'sanierungen', [{ id: 's1', massnahme: 'fenster', status: 'ausgefuehrt', datum: '2015-03' }]), daten).heizlast.fws!;
    expect(vorher.qhlIst!.wert).toBeCloseTo(roh, 3);
    expect(vorher.qhlUnsaniert!.wert).toBeCloseTo(roh / 0.85, 3);
    const geplant = berechne(setzeImState(s, 'sanierungen', [{ id: 'g1', massnahme: 'estrich', status: 'geplant', datum: '2027-06' }]), daten).heizlast.fws!;
    expect(geplant.qhlIst!.wert).toBeCloseTo(roh, 3);
    expect(geplant.qhlKorr!.wert).toBeCloseTo(roh * 0.9, 3);
    const e = berechne(setzeImState(s, 'sanierungen', [{ id: 'o1', massnahme: 'fenster', status: 'ausgefuehrt' }]), daten);
    expect(e.heizlast.fws!.qhlIst!.wert).toBeCloseTo(roh, 3);
    expect(e.hinweise.some((h) => h.code === 'sanierung.datum.fehlt' && h.schritt === 'sanierungen')).toBe(true);
  });
});

describe('FACH-04 — Methode B (WP-Betriebsstunden) liefert Q_hl = Q_n/t_voll, nicht die Nennleistung (Aufgabe 4)', () => {
  const s = setzeAlle(basis(), {
    'verbrauch.quelle': 'wpBetriebsstunden',
    'verbrauch.wpBetriebsstunden': { zaehlerH: 14_000, betriebsjahre: 10, qWpW: 12_000, cop: 4.2, erdsondeLaengeM: 160 },
    'verbrauch.wwBisher': false,
    warmwasser: { wwKuenftig: true, methode: 'personen', personen: 4, literProPersonTag: 40, speicherverlustProzent: 10, zirkulation: 'unbekannt', ausstossProzent: 15 },
    'zuschlaege.sperrzeitAktiv': false,
  });

  it('1 400 h/a × 12 kW = 16 800 kWh/a → Q_hl 8.4 kW (Kurs), Q_h 9.0 kW (±1 %), Q_k 9.14 kW, 57 W/m', () => {
    const e = berechne(s, daten);
    const f = e.heizlast.fws!;
    expect(f.vollstaendig, f.hinweise.map((h) => h.text).join(' | ')).toBe(true);
    expect(f.methode).toBe('wpBetriebsstunden');
    expect(f.wp!.betriebsstundenProJahr.wert).toBe(1400);
    expect(f.qnBrutto!.wert).toBeCloseTo(16_800, 6);
    expect(e.heizlast.massgebend.wert!.wert).toBeCloseTo(8_400, 6);
    expect(e.heizlast.massgebend.wert!.wert).not.toBeCloseTo(12_000, 0);
    erwarteNahe(e.zuschlaege.qh!.wert, 9_000, 1, 'Q_h Aufgabe 4');
    erwarteNahe(f.wp!.qk!.wert, 9_140, 0.5, 'Q_k');
    erwarteNahe(f.wp!.entzugsleistung!.wert, 57, 1, 'Entzugsleistung');
  });

  it('Strom × COP als Alternative: 4 000 kWh × 4.2 = 16 800 → 8.4 kW', () => {
    const e = berechne(setzeImState(s, 'verbrauch.wpBetriebsstunden', { zaehlerH: 14_000, betriebsjahre: 10, stromKwhA: 4000, cop: 4.2 }), daten);
    expect(e.heizlast.massgebend.wert!.wert).toBeCloseTo(8_400, 6);
  });

  it('Hinweis (neuer Befund, NIEDRIG): Strom × COP verlangt trotzdem Zählerstand und Betriebsjahre', () => {
    const e = berechne(setzeImState(s, 'verbrauch.wpBetriebsstunden', { stromKwhA: 4000, cop: 4.2 }), daten);
    expect(e.heizlast.massgebend.wert).toBeNull();
    expect(e.hinweise.some((h) => h.code === 'wp.angaben.fehlen')).toBe(true);
  });
});

describe('FACH-05 — Konvention FWS-Kurs (Ho 10.5/10.4, Kurs-η) reproduziert Aufgabe 2; Hi nur als Option', () => {
  // Aufgabe 2: 3 500 l/a inkl. WW, Kessel 25 J. nicht kondensierend (η 0.8), 160 l/d, Speicher 10 %, Heizband, Ausstoss 15 %,
  // t_off 3 h, EBF 270 m², Bern. Kurs: Q_n,HWW 29 400, Q_n,WW 4 309 (multiplikativ), Q_hl 12.55, Q_off 1.79, Q_w 0.51, Q_h 14.85.
  const s = setzeAlle(basis(), {
    'gebaeude.standort': { plz: '3000', ort: 'Bern', kanton: 'BE', hoeheM: 550 },
    'gebaeude.baujahr': 1975,
    'gebaeude.ebfManuellM2': 270,
    'verbrauch.reihen': [{ id: 'r-oel', energietraeger: 'heizoel', art: 'zeitraeume', zeitraeume: [{ id: 'v1', menge: 3500, jahr: 2024 }] }],
    'verbrauch.eta': { heizoel: { preset: 'alt_mitWW' } },
    'verbrauch.wwBisher': true,
    'verbrauch.abzug': { methode: 'direkt', vwuLiterTag: 160, speicherverlustProzent: 10, zirkulation: 'warmhalteband', ausstossProzent: 15 },
    warmwasser: { wwKuenftig: true, methode: 'direkt', vwuLiterTag: 160, speicherverlustProzent: 10, zirkulation: 'warmhalteband', ausstossProzent: 15 },
    'zuschlaege.sperrzeitH': 3,
  });

  it('FWS-Kurs: Q_n,HWW 29 400, Q_hl 12.55 kW, Q_off 1.79, Q_w 0.51, Q_h 14.85 kW (±1 %; WW additiv statt Kurs-multiplikativ)', () => {
    const e = berechne(s, daten);
    const f = e.heizlast.fws!;
    expect(f.vollstaendig, f.hinweise.map((h) => h.text).join(' | ')).toBe(true);
    expect(f.qnBrutto!.wert).toBeCloseTo(29_400, 3);
    erwarteNahe(f.wwAbzug!.wert, 4_309, 1.5, 'Q_n,WW (Kurs multiplikativ 4 309, additiv 4 258)');
    erwarteNahe(e.heizlast.massgebend.wert!.wert, 12_550, 1, 'Q_hl A2');
    erwarteNahe(e.zuschlaege.qoff.wert, 1_790, 1, 'Q_off A2');
    erwarteNahe(e.zuschlaege.qw.wert, 510, 1.5, 'Q_w A2');
    erwarteNahe(e.zuschlaege.qh!.wert, 14_850, 1, 'Q_h A2');
    expect(e.heizlast.massgebend.label).toContain('Ho 10.5/10.4');
    expect(e.plausi.spezifisch!.ampel).toBe('gruen'); // 46.5 W/m² im Band 1971–80 EFH
  });

  it('mit geplanten Massnahmen Fenster/Kellerdecke/Estrich: 8.8 / 1.26 / 0.52 / 10.58 kW (±1.5 %)', () => {
    const e = berechne(setzeImState(s, 'sanierungen', [{ id: 'g1', massnahme: 'fenster', status: 'geplant' }, { id: 'g2', massnahme: 'kellerdecke', status: 'geplant' }, { id: 'g3', massnahme: 'estrich', status: 'geplant' }]), daten);
    erwarteNahe(e.heizlast.massgebend.wert!.wert, 8_830, 1, 'Q_hl korr');
    erwarteNahe(e.zuschlaege.qoff.wert, 1_260, 1, 'Q_off');
    erwarteNahe(e.zuschlaege.qw.wert, 520, 1.5, 'Q_w');
    erwarteNahe(e.zuschlaege.qh!.wert, 10_580, 1, 'Q_h');
  });

  it('Konvention Hi mit η-Preset: Q_n identisch (η umgerechnet), Label nennt Hi; eigener η 0.8 auf Hi → Q_n 28 000 (−4.8 %) sichtbar als Konventionsfolge', () => {
    const hi = berechne(setzeImState(s, 'verbrauch.konvention', 'hi'), daten);
    expect(hi.heizlast.fws!.qnBrutto!.wert).toBeCloseTo(29_400, 3);
    expect(hi.heizlast.massgebend.label).toContain('Hi');
    const eigen = berechne(setzeAlle(s, { 'verbrauch.konvention': 'hi', 'verbrauch.eta': { heizoel: { wert: 0.8 } } }), daten);
    expect(eigen.heizlast.fws!.qnBrutto!.wert).toBeCloseTo(3500 * 10.0 * 0.8, 3);
  });

  it('Default der Konvention im State ist fwsKurs; Pellets Kurs 5.35 (GCV 5.2–5.5), Hi 4.8', () => {
    expect(basis().verbrauch.konvention).toBe('fwsKurs');
    expect(daten.fws.heizwerte.konventionen.fwsKurs!.default).toBe(true);
    expect(daten.fws.heizwerte.konventionen.fwsKurs!.traeger.pellets!.kwhProEinheit).toBe(5.35);
    expect(daten.fws.heizwerte.konventionen.hi!.traeger.pellets!.kwhProEinheit).toBe(4.8);
  });
});

describe('FACH-06 — t_voll-Tabelle entspricht Folie 16 (keine EFH/MFH-Unterscheidung, kein «Jura», Höhe ü. M. statt Lage)', () => {
  const folie16 = readFileSync(join(__dirname, '..', '..', '..', 'docs', 'fws', 'FWS M3_1-25.txt'), 'utf8').split('\n').slice(362, 396).join('\n');

  it('Tabelle fws.json: genau drei Bedarfsarten mit 1900/2100, 2000/2300, 2300/2500; Schwelle 800 m', () => {
    const t = daten.fws.tvoll;
    expect(Object.keys(t.bedarfsarten).sort()).toEqual(['raumwaerme_wochenendabsenkung', 'raumwaerme_wohnen', 'raumwaerme_ww_wohnen']);
    expect([t.bedarfsarten.raumwaerme_wochenendabsenkung!.mittelland, t.bedarfsarten.raumwaerme_wochenendabsenkung!.ab800m]).toEqual([1900, 2100]);
    expect([t.bedarfsarten.raumwaerme_wohnen!.mittelland, t.bedarfsarten.raumwaerme_wohnen!.ab800m]).toEqual([2000, 2300]);
    expect([t.bedarfsarten.raumwaerme_ww_wohnen!.mittelland, t.bedarfsarten.raumwaerme_ww_wohnen!.ab800m]).toEqual([2300, 2500]);
    expect(t.hoehenschwelleM).toBe(800);
    expect(JSON.stringify(t).toLowerCase()).not.toMatch(/"jura"|"efh"|"mfh"/);
    // Folie 16 im Textdump enthält genau diese Zahlen
    for (const z of ['1900', '2100', '2000', '2300', '2500', 'ab 800 m']) expect(folie16).toContain(z);
  });

  it('berechne(): Höhe 550 m → 2 000 h/a (Tabelle); 1 200 m → 2 300 h/a; ohne Höhe → 2 000 als Standardwert (Annahme sichtbar)', () => {
    const e1 = berechne(basis(), daten);
    expect(e1.heizlast.fws!.tvoll).toMatchObject({ wert: 2000, herkunft: 'tabelle' });
    const e2 = berechne(setzeImState(basis(), 'gebaeude.standort.hoeheM', 1200), daten);
    expect(e2.heizlast.fws!.tvoll.wert).toBe(2300);
    const e3 = berechne(setzeImState(basis(), 'gebaeude.standort.hoeheM', undefined), daten);
    expect(e3.heizlast.fws!.tvoll).toMatchObject({ wert: 2000, herkunft: 'fallback', stufe: 'standardwert' });
    expect(e3.annahmen.some((a) => a.wert === e3.heizlast.fws!.tvoll)).toBe(true);
  });

  it('Neuer Befund (MITTEL, behoben S12): Bedarfsart «Raumwärme und Warmwasser» (2 300 h) mit WW-Abzug und separatem Q_w → Warnung «doppelt» am Feld', () => {
    // Moosseedorf-Fixture: WW bisher über Heizung (Abzug) UND Bedarfsart mit WW → Q_hl = (Q_n − Q_n,WW)/2 300 statt /2 000
    const e = berechne(setzeImState(basis(), 'verbrauch.bedarfsart', 'raumwaerme_ww_wohnen'), daten);
    expect(e.heizlast.fws!.tvoll.wert).toBe(2300);
    expect(e.heizlast.fws!.wwAbzug!.wert).toBeGreaterThan(0);
    expect(e.zuschlaege.qw.wert).toBeGreaterThan(0);
    erwarteNahe(e.heizlast.massgebend.wert!.wert, 9304.7 * (2000 / 2300), 0.1, 'Q_hl um 13 % zu tief');
    const h = e.hinweise.find((x) => x.code === 'tvoll.wwDoppelt');
    expect(h?.stufe).toBe('warnung');
    expect(h?.pfad).toBe('verbrauch.bedarfsart');
  });
});

describe('FACH-07 — Klimabereinigung ist ein Schalter; aus = Kurs (ganze Jahre unverändert, Teilzeiträume nach HGT-Anteil), ein = alle auf Normjahr', () => {
  const hgt = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'data', 'heizgradtage.json'), 'utf8')) as { stationen: Record<string, { monate: Record<string, (number | null)[]> }> };
  const summe = (a: (number | null)[]) => a.reduce<number>((x, y) => x + (y ?? 0), 0);
  const wynau = hgt.stationen.wynau!.monate;
  const hgt2024 = summe(wynau['2024']!); // 2 911 Kd
  const hgtNorm = daten.klima.stationen.find((x) => x.key === 'wynau')!.hgt2012Kd; // 3 536 Kd (SIA 2028-C1 Tab. 6)
  const sOhneWw = setzeImState(basis(), 'verbrauch.wwBisher', false);

  it('Fixture: Station Wynau (PLZ 3302 → plz2 «33»), HGT_norm 3 536 Kd; Schalter Default aus', () => {
    const e = berechne(sOhneWw, daten);
    expect(e.klima!.station!.key).toBe('wynau');
    expect(e.klima!.hgt!.wert).toBe(hgtNorm);
    expect(basis().verbrauch.klimabereinigung).toBe(false);
    expect(daten.fws.klimabereinigung.defaultAktiv).toBe(false);
    expect(e.heizlast.fws!.klimabereinigungAktiv).toBe(false);
  });

  it('aus: ganzes Kalenderjahr 2024 → Jahresanteil 1.000 nach Tagen (Kurs), HGT nur informativ', () => {
    const e = berechne(sOhneWw, daten);
    const z = e.heizlast.fws!.traeger[0]!.zeitraeume[0]!;
    expect(z.ganzesJahr).toBe(true);
    expect(z.anteilBasis).toBe('tage');
    expect(z.anteil.wert).toBeCloseTo(1, 6);
    expect(z.hgtIst!.wert).toBe(hgt2024);
    expect(z.klimaFaktor).toBeNull();
    expect(e.heizlast.massgebend.wert!.wert).toBeCloseTo((2500 * 10.4 * 0.9 * 1000) / 2000, 3);
  });

  it('ein: Heizanteil × HGT_norm/HGT_ist auch für das ganze Jahr (3 536/2 911 = 1.215); Brutto unverändert; als «nicht FWS-Kurs» markiert', () => {
    const aus = berechne(sOhneWw, daten);
    const an = berechne(setzeImState(sOhneWw, 'verbrauch.klimabereinigung', true), daten);
    expect(an.heizlast.fws!.klimabereinigungAktiv).toBe(true);
    const z = an.heizlast.fws!.traeger[0]!.zeitraeume[0]!;
    expect(z.klimaFaktor).toBeCloseTo(hgtNorm / hgt2024, 6);
    expect(an.heizlast.massgebend.wert!.wert).toBeCloseTo(aus.heizlast.massgebend.wert!.wert * (hgtNorm / hgt2024), 3);
    expect(an.heizlast.fws!.qnBrutto!.wert).toBeCloseTo(aus.heizlast.fws!.qnBrutto!.wert, 6);
    expect(an.heizlast.fws!.qnHeizungIst!.begruendung).toContain('nicht FWS-Kurs');
  });

  it('aus, Teilzeitraum 1.10.2023–31.3.2024 (Winterhalbjahr, 1 500 m³): Hochrechnung nach HGT-Anteil 2 453/2 855 Kd (Daten direkt summiert), nicht nach Tagen (183/365)', () => {
    const hgtWinter = summe(wynau['2023']!.slice(9)) + summe(wynau['2024']!.slice(0, 3)); // Okt–Mär
    const hgtRef = summe(wynau['2023']!.slice(3)) + summe(wynau['2024']!.slice(0, 3)); // Apr 2023–Mär 2024
    expect(hgtWinter).toBe(2453);
    expect(hgtRef).toBe(2855);
    const s = setzeImState(sOhneWw, 'verbrauch.reihen', [{ id: 'r-erdgas', energietraeger: 'erdgas', art: 'zeitraeume', zeitraeume: [{ id: 'v1', menge: 1500, von: '2023-10-01', bis: '2024-03-31' }] }]);
    const e = berechne(s, daten);
    const z = e.heizlast.fws!.traeger[0]!.zeitraeume[0]!;
    expect(z.anteilBasis).toBe('hgt');
    expect(z.hgtIst!.wert).toBe(hgtWinter);
    expect(z.hgtRef!.wert).toBe(hgtRef);
    expect(z.anteil.wert).toBeCloseTo(hgtWinter / hgtRef, 6);
    expect(e.heizlast.fws!.traeger[0]!.jahresmenge.wert).toBeCloseTo(1500 * (hgtRef / hgtWinter), 3); // 1 746 m³/a
    expect(e.heizlast.fws!.traeger[0]!.jahresmenge.wert).toBeLessThan((1500 * 365) / 183); // nach Tagen wären es 2 992 m³/a
    expect(e.heizlast.massgebend.wert!.wert).toBeCloseTo((1500 * (hgtRef / hgtWinter) * 10.4 * 0.9 * 1000) / 2000, 3);
  });

  it('ein, Teilzeitraum: Heizanteil HGT_ist/HGT_norm = 2 453/3 536 → Jahresmenge auf Normjahr', () => {
    const s = setzeAlle(sOhneWw, { 'verbrauch.reihen': [{ id: 'r-erdgas', energietraeger: 'erdgas', art: 'zeitraeume', zeitraeume: [{ id: 'v1', menge: 1500, von: '2023-10-01', bis: '2024-03-31' }] }], 'verbrauch.klimabereinigung': true });
    const e = berechne(s, daten);
    const z = e.heizlast.fws!.traeger[0]!.zeitraeume[0]!;
    expect(z.anteil.wert).toBeCloseTo(2453 / hgtNorm, 6);
    expect(e.heizlast.fws!.qnHeizungIst!.wert).toBeCloseTo(1500 * 10.4 * 0.9 * (hgtNorm / 2453), 2);
  });

  it('ohne Station (kein Standort): Teilzeitraum nach Tagen als Fallback mit Warnung; ein → Fehler «HGT-Normwert fehlt»', () => {
    const s = setzeAlle(sOhneWw, { 'gebaeude.standort': { hoeheM: 550 }, 'verbrauch.reihen': [{ id: 'r-erdgas', energietraeger: 'erdgas', art: 'zeitraeume', zeitraeume: [{ id: 'v1', menge: 1500, von: '2023-10-01', bis: '2024-03-31' }] }] });
    const e = berechne(s, daten);
    expect(e.heizlast.fws!.traeger[0]!.zeitraeume[0]!.anteil).toMatchObject({ herkunft: 'fallback', stufe: 'tage' });
    expect(e.hinweise.some((h) => h.code === 'verbrauch.hgt.fehlt' && h.stufe === 'warnung')).toBe(true);
    const an = berechne(setzeImState(s, 'verbrauch.klimabereinigung', true), daten);
    expect(an.heizlast.massgebend.wert).toBeNull();
    expect(an.hinweise.some((h) => h.code === 'klima.hgtNorm.fehlt' && h.stufe === 'fehler')).toBe(true);
  });
});
