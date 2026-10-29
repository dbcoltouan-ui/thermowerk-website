/**
 * Klima am Standort — Sollwerte extern: SIA 2028-C1:2015 Tabelle 6 (Stationswerte in klimastationen.json, Session 2
 * aus der öffentlichen Korrigenda), Höhenkorrektur-Regel (klimastationen.json hoehenkorrektur: 0.6 K/100 m ab 200 m,
 * max. 6 K), Jahresmittel SIA 381/2 bzw. Höhenregression.
 */
import { describe, expect, it } from 'vitest';
import { klimaDaten } from '../../src/daten/klima';
import { findeStation, hoehenkorrekturK, jahresmittel, klimaStandort, stationenListe } from '../../src/kern/klima';
import { pruefeWert } from './hilfen';

const daten = klimaDaten();

describe('Station aus PLZ/Kanton (Thermowerk-Regel: PLZ 3-stellig → 2-stellig → Kanton)', () => {
  it('3012 Bern → Bern (PLZ 2-stellig), θe −7 °C; 3715 Adelboden → Adelboden (PLZ 3-stellig), −10 °C; 8050 → Zürich-Fluntern −8', () => {
    expect(findeStation({ plz: 3012 }, daten)).toMatchObject({ station: { key: 'bern', thetaEC: -7 }, stufe: 'plz2' });
    expect(findeStation({ plz: '3715 Adelboden' }, daten)).toMatchObject({ station: { key: 'adelboden', thetaEC: -10 }, stufe: 'plz3' });
    expect(findeStation({ plz: 8050 }, daten)).toMatchObject({ station: { key: 'zuerich_fluntern', thetaEC: -8 }, stufe: 'plz2' });
  });
  it('nur Kanton: GR → Chur (−7, Hinweis), FL → Vaduz; Override gewinnt; nichts → null', () => {
    expect(findeStation({ kanton: 'gr' }, daten)).toMatchObject({ station: { key: 'chur' }, stufe: 'kanton' });
    expect(findeStation({ kanton: 'FL' }, daten)).toMatchObject({ station: { key: 'vaduz' } });
    expect(findeStation({ plz: 3012, stationOverride: 'davos' }, daten)).toMatchObject({ station: { key: 'davos', thetaEC: -13 }, stufe: 'override' });
    expect(findeStation({}, daten)).toBeNull();
    expect(findeStation({ plz: 'abc' }, daten)).toBeNull();
  });
  it('Stationsliste: 40 Stationen alphabetisch', () => {
    const l = stationenListe(daten);
    expect(l).toHaveLength(40);
    expect(l[0]!.name < l[1]!.name).toBe(true);
  });
});

describe('Höhenkorrektur (SIA 384.201 ND.1.1; Gradient 0.6 K/100 m = Thermowerk-Annahme)', () => {
  it('Δh < 200 m → keine Korrektur; 944 m über Chur → −6 K (gerundet 5.7); 1344 m → auf −6 K begrenzt; tiefer gelegen → wärmer', () => {
    expect(hoehenkorrekturK(700, 553, daten)).toEqual({ korrekturK: 0, deltaHoeheM: 147, begrenzt: false });
    expect(hoehenkorrekturK(1500, 556, daten)).toEqual({ korrekturK: -6, deltaHoeheM: 944, begrenzt: false });
    expect(hoehenkorrekturK(1900, 556, daten)).toEqual({ korrekturK: -6, deltaHoeheM: 1344, begrenzt: true });
    expect(hoehenkorrekturK(1000, 1594, daten)).toEqual({ korrekturK: 4, deltaHoeheM: -594, begrenzt: false });
    expect(hoehenkorrekturK(900, 553, daten).korrekturK).toBe(-2); // 347 m × 0.6 = 2.08 → −2
  });
});

describe('klimaStandort — Herkunft, Hinweise, Annahmen', () => {
  it('Bern 3012, 560 m: θe −7 °C aus Tabelle (keine Korrektur), HGT 3513, Jahresmittel 8.6 (SIA 381/2), Bezeichnung für den Bericht', () => {
    const k = klimaStandort({ plz: 3012, kanton: 'BE', hoeheM: 560 }, daten);
    expect(k.station?.key).toBe('bern');
    expect(k.thetaE?.wert).toBe(-7);
    expect(k.thetaE?.herkunft).toBe('tabelle');
    expect(k.hoehenkorrektur?.wert).toBe(0);
    expect(k.hgt?.wert).toBe(3513);
    expect(k.thetaMittelJahr?.wert).toBe(8.6);
    expect(k.thetaMittelJahr?.herkunft).toBe('tabelle');
    expect(k.bezeichnung).toBe('θe −7 °C, Station Bern-Liebefeld (heute Bern/Zollikofen) (SIA 2028)');
    expect(k.annahmen.map((a) => a.einheit)).toContain('°C');
    expect(k.hinweise.map((h) => h.code)).not.toContain('klima.hoehenkorrektur');
    pruefeWert(k.thetaE, 'thetaE');
    pruefeWert(k.thetaMittelJahr, 'thetaMittel');
    pruefeWert(k.hgt, 'hgt');
  });
  it('Kanton GR, 1500 m: Chur −7 − 6 K = −13 °C als «berechnet» mit Band ±1 K; Hinweise Station aus Kanton + Höhenkorrektur; Jahresmittel aus Höhenregression', () => {
    const k = klimaStandort({ kanton: 'GR', hoeheM: 1500 }, daten);
    expect(k.thetaE?.wert).toBe(-13);
    expect(k.thetaE?.herkunft).toBe('berechnet');
    expect(k.thetaE?.band).toEqual([-14, -12]);
    expect(k.hoehenkorrektur?.herkunft).toBe('schaetzung');
    expect(k.hinweise.map((h) => h.code)).toEqual(expect.arrayContaining(['klima.stationAusKanton', 'klima.hoehenkorrektur']));
    expect(k.thetaMittelJahr?.herkunft).toBe('schaetzung');
    expect(k.thetaMittelJahr?.wert).toBeCloseTo(11.5 - 0.5 * 15, 5);
    expect(k.annahmen.some((a) => a.herkunft === 'schaetzung' && a.einheit === 'K')).toBe(true);
  });
  it('1900 m über Chur: Korrektur begrenzt → Warnung, Station mit ähnlicher Höhe wählen', () => {
    const k = klimaStandort({ kanton: 'GR', hoeheM: 1900 }, daten);
    expect(k.thetaE?.wert).toBe(-13);
    expect(k.hinweise.some((h) => h.code === 'klima.hoehenkorrekturBegrenzt')).toBe(true);
  });
  it('Höhe nicht angegeben → Stationswert mit Info; Gebäudehöhe fehlt in der Begründung', () => {
    const k = klimaStandort({ plz: 8050 }, daten);
    expect(k.thetaE?.wert).toBe(-8);
    expect(k.hinweise.some((h) => h.code === 'klima.hoeheFehlt')).toBe(true);
    expect(k.thetaE?.begruendung).toContain('keine Höhenkorrektur');
  });
  it('θe-Override −10 bei Bern → Herkunft override, in annahmen, Warnung bei ≥ 3 K Abweichung', () => {
    const k = klimaStandort({ plz: 3012, hoeheM: 560, thetaEOverrideC: -10 }, daten);
    expect(k.thetaE?.herkunft).toBe('override');
    expect(k.thetaE?.wert).toBe(-10);
    expect(k.annahmen.some((a) => a.herkunft === 'override')).toBe(true);
    expect(k.hinweise.some((h) => h.code === 'klima.overrideAbweichung')).toBe(true);
    expect(klimaStandort({ plz: 3012, hoeheM: 560, thetaEOverrideC: -8 }, daten).hinweise.some((h) => h.code === 'klima.overrideAbweichung')).toBe(false);
  });
  it('Stations-Override Davos → −13 °C, Stufe override', () => {
    const k = klimaStandort({ plz: 3012, stationOverride: 'davos', hoeheM: 1600 }, daten);
    expect(k.station?.key).toBe('davos');
    expect(k.stationsStufe).toBe('override');
    expect(k.thetaE?.wert).toBe(-13);
  });
  it('ohne Standort: Fehler-Hinweis und kein θe; mit θe-Override trotzdem brauchbar (Warnung)', () => {
    const k = klimaStandort({}, daten);
    expect(k.thetaE).toBeNull();
    expect(k.hinweise[0]).toMatchObject({ stufe: 'fehler', code: 'klima.keineStation' });
    const k2 = klimaStandort({ thetaEOverrideC: -9, hoeheM: 700 }, daten);
    expect(k2.thetaE?.wert).toBe(-9);
    expect(k2.hinweise[0]?.stufe).toBe('warnung');
    expect(k2.thetaMittelJahr?.wert).toBeCloseTo(11.5 - 3.5, 5);
  });
  it('Jahresmittel: Stationswert, wenn belegt und Höhe passt; sonst Regression 11.5 − 0.5 K/100 m (Wynau 422 m → 9.4; Bern + 1000 m → 6.5)', () => {
    const wynau = daten.stationen.find((s) => s.key === 'wynau')!;
    expect(jahresmittel(wynau, undefined, daten).wert).toBeCloseTo(9.4, 1);
    const bern = daten.stationen.find((s) => s.key === 'bern')!;
    expect(jahresmittel(bern, 1000, daten).wert).toBeCloseTo(6.5, 5);
    expect(jahresmittel(bern, 600, daten).wert).toBe(8.6);
  });
});
