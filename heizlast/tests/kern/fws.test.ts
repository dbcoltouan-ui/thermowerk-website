/**
 * Golden-Tests FWS-Modus — Sollwerte ausschliesslich aus externen Quellen:
 * FWS/AWB WP-Kurs Modul 3, Aufgaben und Lösungen 1-2025 (docs/fws/FWS M3_Aufgaben und Lösungen 1-25.txt),
 * Folien 49/52 (docs/fws/FWS M3_1-25.txt), referenz/BEISPIELRECHNUNG.md (Moosseedorf) und im Test dokumentierte
 * Handrechnungen (FWS-RECHENWEGE §3a). Keine Sollwerte aus dem Code (Befund FACH-60).
 *
 * Warmwasser-Verluste: der Kern rechnet ADDITIV (Folie 49, SIA 385/2). Die Kurslösungen der Aufgaben 2–4 verketten
 * dieselben Prozentsätze multiplikativ (1.1·1.15·1.15); deshalb weichen Q_n,WW und Q_w dort um 1–4 % ab, die
 * Heizlast Q_hl und die WP-Leistung Q_h bleiben innerhalb ±1 % (Befund FACH-40, Kurs intern inkonsistent).
 */
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../src/daten/fws';
import { bauperiodeFuerBaujahr, betriebsstundenNeu, heizlastFws, heizwert, jahresnutzungsgrad, parseDatum, subperiodenKorrektur, tageInklusiv, volllaststunden, zeitraumVonEintrag } from '../../src/kern/fws';
import type { FwsEingabe, Sanierung } from '../../src/kern/fws';
import { leistungszuschlagWarmwasser, warmwasserBedarf } from '../../src/kern/warmwasser';
import { auslegungsleistung, sperrzeitZuschlag, zusatzleistung } from '../../src/kern/zuschlaege';
import { eingabe, istAnnahme } from '../../src/kern/wert';
import { erwarteNahe, pruefeWert } from './hilfen';

const daten = fwsDaten();
const mittelland = { bedarfsart: 'raumwaerme_wohnen' as const, hoeheM: 550 };

function qhlUndZuschlaege(e: FwsEingabe, opts: { toffH?: number; qwwKwhTag?: number } = {}) {
  const r = heizlastFws(e, daten);
  expect(r.vollstaendig, r.hinweise.map((h) => h.text).join(' | ')).toBe(true);
  const qhl = r.qhl!;
  const qw = opts.qwwKwhTag ? leistungszuschlagWarmwasser(qhl, eingabe(opts.qwwKwhTag, 'kWh/d'), daten) : null;
  const off = sperrzeitZuschlag(qhl, opts.toffH ?? 0, daten);
  const qh = auslegungsleistung({ qhl, qw: qw?.qw ?? eingabe(0, 'W'), qoff: off.qoff, qas: zusatzleistung([]) });
  return { r, qhl, qw, off, qh };
}

describe('Zeitraum-Grundlagen', () => {
  it('parst ISO-Daten (YYYY, YYYY-MM, YYYY-MM-DD) und lehnt Unsinn ab', () => {
    expect(parseDatum('2022-03-15')).toBe(Date.UTC(2022, 2, 15));
    expect(parseDatum('2022-03')).toBe(Date.UTC(2022, 2, 1));
    expect(parseDatum('2022')).toBe(Date.UTC(2022, 0, 1));
    expect(parseDatum('2022-02-30')).toBeNull();
    expect(parseDatum('gestern')).toBeNull();
    expect(parseDatum(undefined)).toBeNull();
  });
  it('zählt Tage inklusiv beider Grenzen; Kalenderjahr = 365 Tage', () => {
    expect(tageInklusiv(Date.UTC(2022, 0, 1), Date.UTC(2022, 11, 31))).toBe(365);
    expect(tageInklusiv(Date.UTC(2024, 0, 1), Date.UTC(2024, 11, 31))).toBe(366);
    expect(zeitraumVonEintrag({ jahr: 2024 })!.tage).toBe(365);
    expect(zeitraumVonEintrag({ von: '2022-01-01', bis: '2022-08-31' })!.tage).toBe(243);
    expect(zeitraumVonEintrag({ von: '2022-09-01', bis: '2022-01-01' })).toBeNull();
  });
});

describe('Tabellenwerte', () => {
  it('t_voll nach Folie 16: Wohnen Mittelland 2000, ab 800 m 2300, Gewerbe 1900/2100, Override', () => {
    expect(volllaststunden({ bedarfsart: 'raumwaerme_wohnen', hoeheM: 550 }, daten).wert).toBe(2000);
    expect(volllaststunden({ bedarfsart: 'raumwaerme_wohnen', hoeheM: 1200 }, daten).wert).toBe(2300);
    expect(volllaststunden({ bedarfsart: 'raumwaerme_wochenendabsenkung', hoeheM: 400 }, daten).wert).toBe(1900);
    expect(volllaststunden({ bedarfsart: 'raumwaerme_wochenendabsenkung', hoeheM: 800 }, daten).wert).toBe(2100);
    const ohneHoehe = volllaststunden({}, daten);
    expect(ohneHoehe.wert).toBe(2000);
    expect(ohneHoehe.herkunft).toBe('fallback');
    const ov = volllaststunden({ hoeheM: 550, override: 2200 }, daten);
    expect(ov.wert).toBe(2200);
    expect(ov.herkunft).toBe('override');
  });
  it('Heizwerte: Kurs 10.5 kWh/l Öl, 10.4 kWh/m³ Gas, 2500 kWh/Ster Hartholz; Hi 10.0 / 10.08', () => {
    expect(heizwert('heizoel', 'fwsKurs', daten).wert).toBe(10.5);
    expect(heizwert('erdgas', 'fwsKurs', daten).wert).toBe(10.4);
    expect(heizwert('hartholz', 'fwsKurs', daten).wert).toBe(2500);
    expect(heizwert('heizoel', 'hi', daten).wert).toBe(10.0);
    expect(heizwert('erdgas', 'hi', daten).wert).toBe(10.08);
    expect(heizwert('heizoel', 'fwsKurs', daten).herkunft).toBe('tabelle');
  });
  it('η: Kurs-Presets (0.85 alt ohne WW, 0.8 alt mit WW, 0.92 kondensierend, 0.75 Holz neu) mit Band; Konvention hi rechnet um', () => {
    expect(jahresnutzungsgrad('heizoel', { preset: 'alt_ohneWW' }, 'fwsKurs', daten).wert).toBe(0.85);
    expect(jahresnutzungsgrad('heizoel', { preset: 'alt_mitWW' }, 'fwsKurs', daten).wert).toBe(0.8);
    expect(jahresnutzungsgrad('erdgas', { preset: 'brennwert' }, 'fwsKurs', daten).wert).toBe(0.92);
    expect(jahresnutzungsgrad('hartholz', { preset: 'neu' }, 'fwsKurs', daten).wert).toBe(0.75);
    const k = jahresnutzungsgrad('heizoel', { preset: 'alt_ohneWW' }, 'fwsKurs', daten);
    expect(k.band).toEqual([0.8, 0.85]);
    expect(k.herkunft).toBe('tabelle');
    // hi: η_Hi = η_Kurs × Ho/Hi, damit Q_n gleich bleibt (fws.json etaBezugHinweis: Öl 1.05)
    const h = jahresnutzungsgrad('heizoel', { preset: 'alt_ohneWW' }, 'hi', daten);
    erwarteNahe(h.wert, 0.85 * 1.05, 0.01, 'η hi');
    const eigen = jahresnutzungsgrad('erdgas', { wert: 0.9 }, 'hi', daten);
    expect(eigen.wert).toBe(0.9);
    expect(eigen.herkunft).toBe('eingabe');
    const ohne = jahresnutzungsgrad('erdgas', undefined, 'fwsKurs', daten);
    expect(ohne.herkunft).toBe('fallback');
  });
});

describe('Kurs Aufgabe 1 — Objekt A (Öl, η 0.85, Mittelland, t_off 2 h): 12.5 / 1.14 / 13.64 kW', () => {
  const e: FwsEingabe = {
    methode: 'verbrauch',
    tvoll: mittelland,
    verbrauch: { eintraege: [{ id: 'a', energietraeger: 'heizoel', menge: 2800, jahr: 2024 }], eta: { heizoel: { preset: 'alt_ohneWW' } }, konvention: 'fwsKurs' },
  };
  it('Q_n 24 990 kWh/a, Q_hl 12.5 kW, Q_off 1.14 kW, Q_h,WP 13.64 kW', () => {
    const { r, qhl, off, qh } = qhlUndZuschlaege(e, { toffH: 2 });
    expect(r.qnBrutto!.wert).toBeCloseTo(24_990, 3);
    erwarteNahe(qhl.wert, 12_500, 1, 'Q_hl');
    erwarteNahe(off.qoff.wert, 1_140, 1, 'Q_off');
    erwarteNahe(qh.wert, 13_640, 1, 'Q_h');
    for (const w of [r.tvoll, r.qnBrutto, r.qhlIst, r.qhlKorr, qhl, off.qoff, qh]) pruefeWert(w, 'A1');
    expect(r.traeger[0]!.eta.herkunft).toBe('tabelle');
    expect(r.annahmen.map((a) => a.einheit)).toContain('h/a');
  });
});

describe('Kurs Aufgabe 1 — Objekt B (bivalent Gas η 0.92 + Hartholz η 0.75, t_off 4 h): 33 295 kWh / 16.65 / 3.33 / 19.98 kW', () => {
  const e: FwsEingabe = {
    methode: 'verbrauch',
    tvoll: mittelland,
    verbrauch: {
      eintraege: [
        { id: 'gas', energietraeger: 'erdgas', menge: 2500, jahr: 2024 },
        { id: 'holz', energietraeger: 'hartholz', menge: 5, jahr: 2024 },
      ],
      eta: { erdgas: { preset: 'brennwert' }, hartholz: { preset: 'neu' } },
      konvention: 'fwsKurs',
    },
  };
  it('summiert nur über verschiedene Energieträger', () => {
    const { r, qhl, off, qh } = qhlUndZuschlaege(e, { toffH: 4 });
    expect(r.traeger.map((t) => Math.round(t.qnBrutto.wert))).toEqual([23_920, 9_375]);
    expect(r.qnBrutto!.wert).toBeCloseTo(33_295, 3);
    erwarteNahe(qhl.wert, 16_650, 1, 'Q_hl');
    erwarteNahe(off.qoff.wert, 3_330, 1, 'Q_off');
    erwarteNahe(qh.wert, 19_980, 1, 'Q_h');
  });
});

describe('Kurs Aufgabe 2 — EFH 1975 Bern (Öl 3 500 l inkl. WW, η 0.8, 160 l/d, t_off 3 h, EBF 270 m²)', () => {
  // WW bisher über die Heizung: 160 l/d, Speicherverluste 10 %, Ausstoss 15 %, Elektroheizband (keine Zirkulationsverluste).
  const wwBisher = warmwasserBedarf({ methode: 'direkt', vwuLiterTag: 160, speicherverlustProzent: 10, ausstossProzent: 15, zirkulation: { art: 'warmhalteband' } }, daten);
  const basis: FwsEingabe = {
    methode: 'verbrauch',
    tvoll: mittelland,
    verbrauch: {
      eintraege: [{ id: 'oel', energietraeger: 'heizoel', menge: 3500, jahr: 2024 }],
      eta: { heizoel: { preset: 'alt_mitWW' } },
      konvention: 'fwsKurs',
      wwAbzug: { qnWwKwhA: wwBisher.qnWw },
    },
  };
  it('Warmwasser: Q_W,u 9.33 kWh/d; Q_n,WW additiv 4 258 kWh/a (Kurs multiplikativ 4 309, +1.2 %)', () => {
    expect(wwBisher.qwu.wert).toBeCloseTo((160 * 4.2 * 50) / 3600, 6);
    expect(wwBisher.verluste.leitungen.wert).toBe(0);
    expect(wwBisher.qnWw.wert).toBeCloseTo(4258.33, 1);
    // Beleg der Kurs-Verkettung: 9.333 · 1.1 · 1.15 · 365 = 4 309 (nur zur Dokumentation der Abweichung)
    expect(wwBisher.qwu.wert * 1.1 * 1.15 * 365).toBeCloseTo(4309.4, 0);
  });
  it('ohne Dämmmassnahmen: Q_n,HWW 29 400, Q_hl 12.55, Q_off 1.79, Q_w 0.51, Q_h,WP 14.85 kW', () => {
    const { r, qhl, off, qw, qh } = qhlUndZuschlaege(basis, { toffH: 3, qwwKwhTag: wwBisher.qww.wert });
    expect(r.qnBrutto!.wert).toBeCloseTo(29_400, 3);
    expect(r.wwAbzug!.wert).toBeCloseTo(4258.33, 1);
    erwarteNahe(r.qnHeizungIst!.wert, 25_091, 1, 'Q_n,Heizung');
    erwarteNahe(qhl.wert, 12_550, 1, 'Q_hl');
    erwarteNahe(off.qoff.wert, 1_790, 1, 'Q_off');
    erwarteNahe(qw!.td.wert, 0.94, 2, 't_d'); // Kurs rundet 11.8/12.55
    erwarteNahe(qw!.qw.wert, 510, 1, 'Q_w');
    erwarteNahe(qh.wert, 14_850, 1, 'Q_h');
    expect(r.wwAbzug!.herkunft).toBe('berechnet');
    pruefeWert(r.wwAbzug, 'WW-Abzug');
  });
  it('mit geplanten Massnahmen Fenster 15 / Kellerdecke 8 / Estrich 10 %: Q_hl 8.8, Q_off 1.26, Q_w 0.52, Q_h 10.58 kW', () => {
    const geplant: Sanierung[] = [
      { id: 's1', massnahme: 'fenster', status: 'geplant' },
      { id: 's2', massnahme: 'kellerdecke', status: 'geplant' },
      { id: 's3', massnahme: 'estrich', status: 'geplant' },
    ];
    const { r, qhl, off, qw, qh } = qhlUndZuschlaege({ ...basis, sanierungen: geplant }, { toffH: 3, qwwKwhTag: wwBisher.qww.wert });
    expect(r.sanierungen.faktorGeplant.wert).toBeCloseTo(0.85 * 0.92 * 0.9, 6);
    erwarteNahe(r.qhlIst!.wert, 12_550, 1, 'Q_hl ist (unverändert)');
    erwarteNahe(qhl.wert, 8_830, 1, 'Q_hl korr'); // Kurs: 12.55·0.85·0.92·0.9 = 8.83 → «8.8»
    erwarteNahe(off.qoff.wert, 1_260, 1, 'Q_off');
    erwarteNahe(qw!.qw.wert, 520, 1.5, 'Q_w (Kurs 0.52 mit multiplikativem Q_WW 11.8 statt 11.67 kWh/d)');
    erwarteNahe(qh.wert, 10_580, 1, 'Q_h');
    expect(r.qhl).toBe(r.qhlKorr);
    expect(r.sanierungen.geplant.map((s) => s.einsparung.wert)).toEqual([15, 8, 10]);
    expect(r.sanierungen.geplant.every((s) => s.einsparung.herkunft === 'tabelle' && s.einsparung.band)).toBe(true);
  });
});

describe('Kurs Aufgabe 3 — MFH Minergie-P, Messung 23 000 kWh/a: Q_hl 11.5, Q_w 5.64, Q_h 17.14 kW', () => {
  const ww = warmwasserBedarf({ methode: 'personen', personen: 27.4, bedarfKey: 'mfh_gehoben', speicherverlustProzent: 10, ausstossProzent: 15, zirkulation: { art: 'warmhalteband' } }, daten);
  const e: FwsEingabe = { methode: 'messung', tvoll: { bedarfsart: 'raumwaerme_wohnen', hoeheM: 408 }, messung: { qnHeizungKwhA: 23_000 } };
  it('Q_hl = 23 000 / 2 000 = 11.5 kW exakt; WW 1 233 l/d; Q_h innerhalb 1 %', () => {
    const { r, qhl, qw, qh } = qhlUndZuschlaege(e, { qwwKwhTag: ww.qww.wert });
    expect(qhl.wert).toBeCloseTo(11_500, 6);
    expect(r.qnBrutto!.herkunft).toBe('messung');
    expect(ww.vwu.wert).toBeCloseTo(1233, 6);
    erwarteNahe(ww.qnWw.wert, 33_210, 1.5, 'Q_n,WW (Kurs multiplikativ)');
    erwarteNahe(qw!.td.wert, 7.9, 1.5, 't_d');
    erwarteNahe(qw!.qw.wert, 5_640, 2, 'Q_w (additive Verluste → −1.5 %)');
    erwarteNahe(qh.wert, 17_140, 1, 'Q_h');
    expect(qw!.hinweise.find((h) => h.code === 'warmwasser.ladezeit.lang')).toBeUndefined(); // 7.9 h < 12 h
  });
  it('Q_w-Formel exakt: mit dem Kurs-Q_WW 90.99 kWh/d ergibt sich 5.64 kW', () => {
    const qw = leistungszuschlagWarmwasser(eingabe(11_500, 'W'), eingabe(33_210 / 365, 'kWh/d'), daten);
    erwarteNahe(qw.td.wert, 7.9, 0.5, 't_d');
    erwarteNahe(qw.qw.wert, 5_640, 0.5, 'Q_w');
  });
});

describe('Kurs Aufgabe 4 — WP-Betriebsstunden (Methode B): 1 400 h/a · 12 kW → 8.4 kW; Q_w 0.6; Q_h 9.0; Sonde 57 W/m', () => {
  const ww = warmwasserBedarf({ methode: 'personen', personen: 4, bedarfKey: 'efh_einfach', speicherverlustProzent: 10, ausstossProzent: 15, zirkulation: { art: 'unbekannt' } }, daten);
  const e: FwsEingabe = { methode: 'wpBetriebsstunden', tvoll: mittelland, wpBetriebsstunden: { zaehlerH: 14_000, betriebsjahre: 10, qWpW: 12_000, cop: 4.2, erdsondeLaengeM: 160 }, heute: '2025-10-01' };
  it('Q_hl = Q_n / t_voll, nicht die WP-Nennleistung (Befund FACH-04)', () => {
    const { r, qhl, qw, qh } = qhlUndZuschlaege(e, { qwwKwhTag: ww.qww.wert });
    expect(r.wp!.betriebsstundenProJahr.wert).toBe(1400);
    expect(r.qnBrutto!.wert).toBeCloseTo(16_800, 6);
    expect(qhl.wert).toBeCloseTo(8_400, 6);
    expect(ww.vwu.wert).toBe(160);
    expect(ww.verluste.leitungen.wert).toBeCloseTo(0.15 * ww.qwu.wert, 6);
    erwarteNahe(qw!.qw.wert, 600, 3.5, 'Q_w (Kurs verkettet 1.1·1.15·1.15 → 13.6 statt 13.07 kWh/d)');
    erwarteNahe(qh.wert, 9_000, 1, 'Q_h');
    erwarteNahe(r.wp!.qk!.wert, 9_140, 0.5, 'Q_k');
    erwarteNahe(r.wp!.entzugsleistung!.wert, 57, 1, 'spez. Entzug');
    expect(r.wp!.entzugAmpel).toBe('gelb'); // 57 W/m: > 50 gelb, > 60 rot (fws.json methodeB, Annahme) — Kurs: «zu gross, SIA 384/6 ≥ 200 m»
    expect(r.hinweise.some((h) => h.code === 'wp.erdsonde.zuKurz')).toBe(false);
  });
  it('Betriebsstunden neu inkl. WW: (16 800 + 4 956)/12 = 1 813 h/a mit dem Kurs-Q_n,WW', () => {
    expect(betriebsstundenNeu(16_800, 4_956, 12_000).wert).toBeCloseTo(1813, 0);
    erwarteNahe(betriebsstundenNeu(16_800, ww.qnWw.wert, 12_000).wert, 1813, 1, 'h neu (additiv)');
  });
  it('Alternative Strom × COP', () => {
    const r = heizlastFws({ methode: 'wpBetriebsstunden', tvoll: mittelland, wpBetriebsstunden: { zaehlerH: 14_000, betriebsjahre: 10, stromKwhA: 4000, cop: 4.2 } }, daten);
    expect(r.qnBrutto!.wert).toBeCloseTo(16_800, 6);
    expect(r.qhl!.wert).toBeCloseTo(8_400, 6);
  });
});

describe('Moosseedorf (referenz/BEISPIELRECHNUNG.md) in beiden Konventionen', () => {
  // Gas 2 500 m³/a, η 0.90 (eigener Wert), WW bisher 180 l/d (Speicher 10 %, keine Zirkulation, Ausstoss 15 %), t_off 2 h.
  const ww = warmwasserBedarf({ methode: 'direkt', vwuLiterTag: 180, speicherverlustProzent: 10, ausstossProzent: 15, zirkulation: { art: 'keine' } }, daten);
  const eingabeFuer = (konvention: 'fwsKurs' | 'hi'): FwsEingabe => ({
    methode: 'verbrauch',
    tvoll: mittelland,
    verbrauch: { eintraege: [{ id: 'g', energietraeger: 'erdgas', menge: 2500, jahr: 2024 }], eta: { erdgas: { wert: 0.9 } }, konvention, wwAbzug: { qnWwKwhA: ww.qnWw } },
  });
  it('FWS-Kurs (Ho 10.4): Q_n 23 400, Q_hl 9.30 kW, Q_h 10.73 kW — Handrechnung mit additiven WW-Verlusten (Doku mit Ho: 9.276 / 10.708)', () => {
    const { r, qhl, off, qw, qh } = qhlUndZuschlaege(eingabeFuer('fwsKurs'), { toffH: 2, qwwKwhTag: ww.qww.wert });
    expect(r.qnBrutto!.wert).toBeCloseTo(23_400, 3);
    expect(ww.qnWw.wert).toBeCloseTo(4790.6, 0);
    expect(qhl.wert).toBeCloseTo(9304.7, 0);
    expect(qw!.qw.wert).toBeCloseTo(581.0, 0);
    expect(off.qoff.wert).toBeCloseTo(845.9, 0);
    expect(qh.wert).toBeCloseTo(10_731.6, 0);
    erwarteNahe(qhl.wert, 9_276, 0.5, 'Q_hl vs. Befund A1 (Ho, WW multiplikativ)');
    erwarteNahe(qh.wert, 10_708, 0.5, 'Q_h vs. Befund A1');
  });
  it('Hi (BFE 10.08 kWh/m³, η 0.90 auf Hi bezogen): Q_n 22 680, Q_hl 8.94 kW (Doku 8.871 mit unbelegtem Hi 10.04 und multiplikativem WW)', () => {
    const { r, qhl } = qhlUndZuschlaege(eingabeFuer('hi'), { toffH: 2, qwwKwhTag: ww.qww.wert });
    expect(r.qnBrutto!.wert).toBeCloseTo(22_680, 3);
    expect(qhl.wert).toBeCloseTo(8944.7, 0);
    erwarteNahe(qhl.wert, 8_871, 1, 'Q_hl vs. BEISPIELRECHNUNG');
    expect(r.traeger[0]!.heizwert.begruendung).toContain('Hi');
  });
  it('Konventionswechsel: mit η-Preset bleibt Q_n identisch (η wird mit Ho/Hi umgerechnet), mit eigenem η nicht', () => {
    const preset = (konvention: 'fwsKurs' | 'hi') => heizlastFws({ methode: 'verbrauch', tvoll: mittelland, verbrauch: { eintraege: [{ energietraeger: 'erdgas', menge: 2500, jahr: 2024 }], eta: { erdgas: { preset: 'brennwert' } }, konvention } }, daten).qnBrutto!.wert;
    expect(preset('fwsKurs')).toBeCloseTo(23_920, 3);
    expect(preset('hi')).toBeCloseTo(23_920, 3);
    const eigen = (konvention: 'fwsKurs' | 'hi') => heizlastFws({ methode: 'verbrauch', tvoll: mittelland, verbrauch: { eintraege: [{ energietraeger: 'erdgas', menge: 2500, jahr: 2024 }], eta: { erdgas: { wert: 0.9 } }, konvention } }, daten).qnBrutto!.wert;
    expect(eigen('hi') / eigen('fwsKurs')).toBeCloseTo(10.08 / 10.4, 6);
  });
});

describe('Jahresraster: Mittelung, Lieferungen, Streuung, Überlappung', () => {
  it('3 Jahre Gas 2 500 / 2 400 / 2 600 m³ → Mittel 2 500 m³/a, Q_hl 11.7 kW (nicht ×3, Befund FACH-01)', () => {
    const r = heizlastFws(
      {
        methode: 'verbrauch',
        tvoll: mittelland,
        verbrauch: {
          eintraege: [
            { id: '22', energietraeger: 'erdgas', menge: 2500, jahr: 2022 },
            { id: '23', energietraeger: 'erdgas', menge: 2400, jahr: 2023 },
            { id: '24', energietraeger: 'erdgas', menge: 2600, jahr: 2024 },
          ],
          eta: { erdgas: { wert: 0.9 } },
          konvention: 'fwsKurs',
        },
      },
      daten,
    );
    expect(r.vollstaendig).toBe(true);
    expect(r.traeger[0]!.jahresmenge.wert).toBeCloseTo(2500, 6);
    expect(r.traeger[0]!.tage).toBe(1095);
    expect(r.qnBrutto!.wert).toBeCloseTo(2500 * 10.4 * 0.9, 3);
    expect(r.qhl!.wert).toBeCloseTo(11_700, 3);
    expect(r.streuung.ampel).toBe('gruen'); // max. Abweichung 4 %
    expect(r.streuung.prozent).toBeCloseTo(4, 6);
    expect(r.hinweise.find((h) => h.code === 'verbrauch.zeitraum.kurz')).toBeUndefined();
  });
  it('Öl-Lieferungen 3 × 2 000 l über 24 Monate (Tank voll bis Tank voll) → 3 000 l/a; Streuung nicht beurteilbar; Hinweis kurzer Zeitraum', () => {
    const r = heizlastFws(
      {
        methode: 'verbrauch',
        tvoll: mittelland,
        verbrauch: {
          eintraege: [
            { id: 'l1', energietraeger: 'heizoel', menge: 2000, von: '2022-01-01', bis: '2022-08-31' },
            { id: 'l2', energietraeger: 'heizoel', menge: 2000, von: '2022-09-01', bis: '2023-04-30' },
            { id: 'l3', energietraeger: 'heizoel', menge: 2000, von: '2023-05-01', bis: '2023-12-31' },
          ],
          eta: { heizoel: { preset: 'alt_ohneWW' } },
          konvention: 'fwsKurs',
        },
      },
      daten,
    );
    expect(r.vollstaendig).toBe(true);
    expect(r.traeger[0]!.tage).toBe(730);
    expect(r.traeger[0]!.jahresmenge.wert).toBeCloseTo(3000, 6);
    expect(r.qhl!.wert).toBeCloseTo((3000 * 10.5 * 0.85 * 1000) / 2000, 3);
    expect(r.streuung.ampel).toBe('grau');
    expect(r.hinweise.some((h) => h.code === 'verbrauch.zeitraum.kurz')).toBe(true);
  });
  it('Streuung rot bei 2 000 / 3 000 m³ (±20 %)', () => {
    const r = heizlastFws({ methode: 'verbrauch', tvoll: mittelland, verbrauch: { eintraege: [{ energietraeger: 'erdgas', menge: 2000, jahr: 2023 }, { energietraeger: 'erdgas', menge: 3000, jahr: 2024 }], eta: {}, konvention: 'fwsKurs' } }, daten);
    expect(r.streuung.ampel).toBe('rot');
    expect(r.hinweise.some((h) => h.code === 'verbrauch.streuung.rot')).toBe(true);
    expect(r.traeger[0]!.jahresmenge.wert).toBe(2500);
  });
  it('Überlappende Zeiträume desselben Trägers → Fehler, keine Heizlast', () => {
    const r = heizlastFws(
      {
        methode: 'verbrauch',
        tvoll: mittelland,
        verbrauch: { eintraege: [{ id: 'a', energietraeger: 'erdgas', menge: 2500, jahr: 2022 }, { id: 'b', energietraeger: 'erdgas', menge: 2500, von: '2022-06-01', bis: '2023-05-31' }], eta: {}, konvention: 'fwsKurs' },
      },
      daten,
    );
    expect(r.vollstaendig).toBe(false);
    expect(r.qhl).toBeNull();
    expect(r.hinweise.some((h) => h.code === 'verbrauch.ueberlappung' && h.stufe === 'fehler')).toBe(true);
  });
  it('Lückenlos angrenzende Zeiträume überlappen nicht', () => {
    const r = heizlastFws({ methode: 'verbrauch', tvoll: mittelland, verbrauch: { eintraege: [{ energietraeger: 'erdgas', menge: 2500, jahr: 2022 }, { energietraeger: 'erdgas', menge: 2500, von: '2023-01-01', bis: '2023-12-31' }], eta: {}, konvention: 'fwsKurs' } }, daten);
    expect(r.vollstaendig).toBe(true);
  });
  it('leere Verbrauchsliste → Fehler', () => {
    const r = heizlastFws({ methode: 'verbrauch', tvoll: mittelland, verbrauch: { eintraege: [], eta: {}, konvention: 'fwsKurs' } }, daten);
    expect(r.vollstaendig).toBe(false);
    expect(r.hinweise[0]!.code).toBe('verbrauch.leer');
  });
});

describe('Sanierungen jahresgenau (FWS-RECHENWEGE §3a) — Handrechnungen im Test', () => {
  // Öl, η 0.85 (Kurs alt ohne WW), t_voll 2 000.
  const oel = (eintraege: FwsEingabe['verbrauch'] extends infer V ? (V extends { eintraege: infer E } ? E : never) : never, sanierungen: Sanierung[]): FwsEingabe => ({
    methode: 'verbrauch',
    tvoll: mittelland,
    verbrauch: { eintraege, eta: { heizoel: { preset: 'alt_ohneWW' } }, konvention: 'fwsKurs' },
    sanierungen,
  });

  it('1 Massnahme IM Zeitraum: 9 000 l über 2021–2023, Fenster 15 % am 1.1.2022', () => {
    // Sub-Perioden: 2021 (365 d, F = 1) und 2022–2023 (730 d, F = 0.85) → Σ L·F = 365 + 620.5 = 985.5
    // W_pre = 9 000 · 1095 / 985.5 = 10 000 l (3 Jahre) = 3 333.3 l/a; W_ist = W_pre · 0.85 = 2 833.3 l/a
    // Q_hl,unsaniert = 3 333.3 · 10.5 · 0.85 / 2 000 = 14.875 kW; Q_hl,ist = 12.644 kW (Rohwert 3 000 l/a wäre 13.39 kW)
    const r = heizlastFws(oel([{ id: 'p', energietraeger: 'heizoel', menge: 9000, von: '2021-01-01', bis: '2023-12-31' }], [{ id: 'f', massnahme: 'fenster', status: 'ausgefuehrt', datum: '2022-01-01' }]), daten);
    expect(r.vollstaendig).toBe(true);
    expect(r.qnHeizungUnsaniert!.wert).toBeCloseTo(3333.333 * 10.5 * 0.85, 0);
    expect(r.qnHeizungIst!.wert).toBeCloseTo(2833.333 * 10.5 * 0.85, 0);
    expect(r.qhlUnsaniert!.wert).toBeCloseTo(14_875, 0);
    expect(r.qhlIst!.wert).toBeCloseTo(12_644, 0);
    expect(r.qhl).toBe(r.qhlKorr);
    expect(r.qhlKorr!.wert).toBeCloseTo(12_644, 0); // keine geplanten → korr = ist
    expect(r.sanierungen.faktorIst.wert).toBeCloseTo(0.85, 6);
  });

  it('2 Massnahmen: 12 000 l über 2020–2023 (1 461 d), Fenster 15 % ab 2021, Kellerdecke 8 % ab 2023', () => {
    // Sub-Perioden: 2020 (366 d, F 1), 2021–2022 (730 d, F 0.85), 2023 (365 d, F 0.85·0.92 = 0.782)
    // Σ L·F = 366 + 620.5 + 285.43 = 1 271.93; W_pre = 12 000 · 1461 / 1271.93 = 13 783.8 l → 3 443.6 l/a
    // W_ist = 13 783.8 · 0.782 = 10 778.9 l → 2 692.9 l/a; Q_hl,unsaniert 15.367 kW, Q_hl,ist 12.017 kW
    // (Rohwert 2 997.9 l/a → 13.378 kW; die alte Näherung Π(1−a·p) ist hier nicht separierbar, Befund FACH-03b)
    const r = heizlastFws(
      oel(
        [{ id: 'p', energietraeger: 'heizoel', menge: 12_000, von: '2020-01-01', bis: '2023-12-31' }],
        [
          { id: 'f', massnahme: 'fenster', status: 'ausgefuehrt', datum: '2021-01' },
          { id: 'k', massnahme: 'kellerdecke', status: 'ausgefuehrt', datum: '2023-01-01' },
        ],
      ),
      daten,
    );
    expect(r.vollstaendig).toBe(true);
    expect(r.traeger[0]!.tage).toBe(1461);
    expect(r.qhlUnsaniert!.wert).toBeCloseTo(15_367, 0);
    expect(r.qhlIst!.wert).toBeCloseTo(12_017, 0);
    expect(r.sanierungen.faktorIst.wert).toBeCloseTo(0.782, 6);
    // Sub-Perioden direkt prüfen
    const z = zeitraumVonEintrag({ von: '2020-01-01', bis: '2023-12-31' })!;
    const k = subperiodenKorrektur(z, r.sanierungen.ausgefuehrt);
    expect(k.subperioden.map((s) => s.tage)).toEqual([366, 730, 365]);
    expect(k.subperioden.map((s) => Math.round(s.faktor * 1000) / 1000)).toEqual([1, 0.85, 0.782]);
    expect(k.faktorUnsaniert).toBeCloseTo(1461 / 1271.93, 5);
  });

  it('Massnahme VOR dem Zeitraum verändert den Ist-Wert nicht, NACH dem Zeitraum wirkt sie voll', () => {
    const eintraege = [{ id: 'p', energietraeger: 'heizoel' as const, menge: 3000, jahr: 2024 }];
    const vorher = heizlastFws(oel(eintraege, [{ massnahme: 'fassade', status: 'ausgefuehrt', datum: '2015-06' }]), daten);
    expect(vorher.qhlIst!.wert).toBeCloseTo((3000 * 10.5 * 0.85 * 1000) / 2000, 3);
    expect(vorher.qhlUnsaniert!.wert).toBeCloseTo(vorher.qhlIst!.wert / 0.68, 3); // Fassade 32 % → unsaniert höher
    const nachher = heizlastFws(oel(eintraege, [{ massnahme: 'fassade', status: 'ausgefuehrt', datum: '2025-03-01' }]), daten);
    expect(nachher.qhlIst!.wert).toBeCloseTo(vorher.qhlIst!.wert * 0.68, 3);
    expect(nachher.qhlUnsaniert!.wert).toBeCloseTo(vorher.qhlIst!.wert, 3);
  });

  it('Geplante Massnahme wirkt nur auf Q_hl,korr; ausgeführt ohne Datum → Warnung und keine Wirkung', () => {
    const eintraege = [{ id: 'p', energietraeger: 'heizoel' as const, menge: 3000, jahr: 2024 }];
    const geplant = heizlastFws(oel(eintraege, [{ massnahme: 'individuell', bezeichnung: 'Komfortlüftung', einsparungProzent: 20, status: 'geplant' }]), daten);
    expect(geplant.qhlKorr!.wert).toBeCloseTo(geplant.qhlIst!.wert * 0.8, 3);
    expect(geplant.sanierungen.geplant[0]!.einsparung.herkunft).toBe('eingabe');
    const ohneDatum = heizlastFws(oel(eintraege, [{ massnahme: 'fenster', status: 'ausgefuehrt' }]), daten);
    expect(ohneDatum.qhlIst!.wert).toBeCloseTo((3000 * 10.5 * 0.85 * 1000) / 2000, 3);
    expect(ohneDatum.hinweise.some((h) => h.code === 'sanierung.datum.fehlt')).toBe(true);
  });

  it('Monotonie: mehr Einsparung ⇒ kleinere Ist-Heizlast; Einsparung 0 ⇒ unverändert', () => {
    const eintraege = [{ id: 'p', energietraeger: 'heizoel' as const, menge: 9000, von: '2021-01-01', bis: '2023-12-31' }];
    let letzte = Infinity;
    for (const p of [0, 5, 10, 20, 35, 50]) {
      const r = heizlastFws(oel(eintraege, [{ massnahme: 'individuell', einsparungProzent: p, status: 'ausgefuehrt', datum: '2022-07-01' }]), daten);
      expect(r.qhlIst!.wert).toBeLessThanOrEqual(letzte);
      expect(r.qhlIst!.wert).toBeLessThanOrEqual(r.qhlUnsaniert!.wert + 1e-9);
      letzte = r.qhlIst!.wert;
    }
  });
});

describe('Weitere Methoden und Optionen', () => {
  it('Methode B/C mit ausgeführten Sanierungen ohne Zeitraum: im Messwert enthalten (Hinweis)', () => {
    const r = heizlastFws({ methode: 'messung', tvoll: mittelland, messung: { qnHeizungKwhA: 20_000 }, sanierungen: [{ massnahme: 'fenster', status: 'ausgefuehrt', datum: '2020-01' }] }, daten);
    expect(r.qhlIst!.wert).toBeCloseTo(10_000, 6);
    expect(r.qhlUnsaniert!.wert).toBeCloseTo(10_000 / 0.85, 3);
    expect(r.hinweise.some((h) => h.code === 'messung.zeitraum.fehlt')).toBe(true);
  });
  it('Bauperiode nur als expliziter Fallback mit Band (1971–1980 EFH 70–125 kWh/m²a, 270 m²)', () => {
    const r = heizlastFws({ methode: 'bauperiode', tvoll: mittelland, bauperiode: { ebfM2: 270, gebaeudetyp: 'efh', baujahr: 1975 } }, daten);
    expect(r.vollstaendig).toBe(true);
    expect(r.bauperiodeBand!.kwhM2a).toEqual([70, 125]);
    expect(r.qnBrutto!.wert).toBeCloseTo(97.5 * 270, 3);
    expect(r.qhl!.wert).toBeCloseTo((97.5 * 270 * 1000) / 2000, 3);
    expect(r.qhl!.band![0]).toBeCloseTo((70 * 270 * 1000) / 2000, 3);
    expect(r.qhl!.band![1]).toBeCloseTo((125 * 270 * 1000) / 2000, 3);
    expect(r.qhl!.unsicherheit).toBeCloseTo(28.2, 0);
    expect(r.annahmen.some((a) => a.herkunft === 'fallback' && a.stufe === 'bauperiode')).toBe(true);
    expect(r.hinweise.some((h) => h.code === 'bauperiode.fallback')).toBe(true);
    expect(bauperiodeFuerBaujahr(1900, daten)!.key).toBe('vor1919');
    expect(bauperiodeFuerBaujahr(2030, daten)!.key).toBe('ab2011');
  });
  it('explizite Methodenwahl: gewählte Methode ohne Daten → Fehler, auch wenn andere Daten vorhanden sind', () => {
    const r = heizlastFws({ methode: 'wpBetriebsstunden', tvoll: mittelland, verbrauch: { eintraege: [{ energietraeger: 'erdgas', menge: 2500, jahr: 2024 }], eta: {}, konvention: 'fwsKurs' } }, daten);
    expect(r.vollstaendig).toBe(false);
    expect(r.qhl).toBeNull();
    expect(r.hinweise[0]!.code).toBe('wp.angaben.fehlen');
  });
  it('HGT-Klimabereinigung: Default aus; aktiv korrigiert nur den Heizanteil mit HGT_norm/HGT_ist und ist als nicht-FWS markiert', () => {
    const ww = warmwasserBedarf({ methode: 'direkt', vwuLiterTag: 180, zirkulation: { art: 'keine' } }, daten);
    const basis = (aktiv: boolean) =>
      heizlastFws(
        {
          methode: 'verbrauch',
          tvoll: mittelland,
          verbrauch: {
            eintraege: [{ id: 'g', energietraeger: 'erdgas', menge: 2500, jahr: 2024, hgtIstKd: 2800 }],
            eta: { erdgas: { wert: 0.9 } },
            konvention: 'fwsKurs',
            wwAbzug: { qnWwKwhA: ww.qnWw },
            klimabereinigung: { aktiv, hgtNormKd: 3100 },
          },
        },
        daten,
      );
    const aus = basis(false);
    const an = basis(true);
    expect(aus.klimabereinigungAktiv).toBe(false);
    expect(an.klimabereinigungAktiv).toBe(true);
    const heizAus = aus.qnHeizungIst!.wert;
    expect(an.qnHeizungIst!.wert).toBeCloseTo(heizAus * (3100 / 2800), 3);
    expect(an.qnBrutto!.wert).toBeCloseTo(aus.qnBrutto!.wert, 6); // Brutto und WW unverändert
    expect(an.qnHeizungIst!.begruendung).toContain('nicht FWS-Kurs');
    const fehlt = heizlastFws({ methode: 'verbrauch', tvoll: mittelland, verbrauch: { eintraege: [{ energietraeger: 'erdgas', menge: 2500, jahr: 2024 }], eta: {}, konvention: 'fwsKurs', klimabereinigung: { aktiv: true, hgtNormKd: 3100 } } }, daten);
    expect(fehlt.hinweise.some((h) => h.code === 'klima.hgtIst.fehlt')).toBe(true);
  });
  it('WW-Abzug grösser als Verbrauch → Heizanteil 0 mit Warnung; bivalent wird der Abzug dem grössten Träger zugeordnet', () => {
    const ww = warmwasserBedarf({ methode: 'personen', personen: 30, zirkulation: { art: 'unbekannt' } }, daten); // ≈ 32 000 kWh/a
    const r = heizlastFws({ methode: 'verbrauch', tvoll: mittelland, verbrauch: { eintraege: [{ id: 'g', energietraeger: 'erdgas', menge: 1000, jahr: 2024 }, { id: 'h', energietraeger: 'hartholz', menge: 2, jahr: 2024 }], eta: {}, konvention: 'fwsKurs', wwAbzug: { qnWwKwhA: ww.qnWw } } }, daten);
    expect(r.hinweise.some((h) => h.code === 'verbrauch.wwAbzug.zuGross')).toBe(true);
    expect(r.hinweise.some((h) => h.code === 'verbrauch.wwAbzug.traeger')).toBe(true);
    expect(r.traeger.find((t) => t.energietraeger === 'erdgas')!.qnHeizungIst.wert).toBe(0);
    expect(r.traeger.find((t) => t.energietraeger === 'hartholz')!.wwAbzug).toBeNull();
  });
});

describe('Herkunftsmodell im FWS-Ergebnis', () => {
  it('jeder Wert hat Herkunft/Einheit/Begründung; Annahmen enthalten t_voll, Heizwert, η, aber keine Eingaben', () => {
    const r = heizlastFws({ methode: 'verbrauch', tvoll: mittelland, verbrauch: { eintraege: [{ energietraeger: 'heizoel', menge: 2800, jahr: 2024 }], eta: { heizoel: { preset: 'alt_ohneWW' } }, konvention: 'fwsKurs' } }, daten);
    const t = r.traeger[0]!;
    for (const [k, w] of Object.entries({ tvoll: r.tvoll, qnBrutto: r.qnBrutto, qnIst: r.qnHeizungIst, qnUns: r.qnHeizungUnsaniert, qhlU: r.qhlUnsaniert, qhlI: r.qhlIst, qhlK: r.qhlKorr, jm: t.jahresmenge, hw: t.heizwert, eta: t.eta, fIst: r.sanierungen.faktorIst, fGep: r.sanierungen.faktorGeplant })) pruefeWert(w, k);
    expect(r.annahmen.every((a) => istAnnahme(a))).toBe(true);
    expect(r.annahmen.map((a) => a.herkunft)).toEqual(expect.arrayContaining(['tabelle']));
    expect(r.annahmen.some((a) => a.einheit === 'h/a')).toBe(true);
    expect(r.annahmen.some((a) => a.einheit === 'kWh/l')).toBe(true);
    expect(r.qhlIst!.unsicherheit).toBeGreaterThan(0); // η-Band ±2.9 %
    expect(r.qhlIst!.begruendung).toMatch(/Q_hl = Q_n,Heizung \/ t_voll/);
  });
});
