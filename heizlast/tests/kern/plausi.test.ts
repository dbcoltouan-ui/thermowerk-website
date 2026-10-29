/** Plausibilität — Sollwerte: Kurs Aufgabe 2 (46.5 W/m² plausibel, 1971–80 EFH 35–63), Aufgabe 3 (6.3 W/m² nicht plausibel, Minergie-P 8–12), BEISPIELRECHNUNG (59.1 W/m² rot). */
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../src/daten/fws';
import { spezifischeHeizleistung, vergleichNormVerbrauch } from '../../src/kern/plausi';
import { eingabe } from '../../src/kern/wert';
import { pruefeWert } from './hilfen';

const daten = fwsDaten();

describe('Spezifische Heizleistung gegen Bauperioden-Band (Folie 37)', () => {
  it('Aufgabe 2: 12.55 kW / 270 m² = 46.5 W/m² → grün (1971–1980 EFH 35–63)', () => {
    const r = spezifischeHeizleistung({ qhlUnsaniertW: eingabe(12_550, 'W'), ebfM2: eingabe(270, 'm²'), baujahr: 1975, gebaeudetyp: 'efh' }, daten);
    expect(r.spez.wert).toBeCloseTo(46.5, 1);
    expect(r.band).toEqual([35, 63]);
    expect(r.ampel).toBe('gruen');
    pruefeWert(r.spez, 'spez');
  });
  it('Aufgabe 3: 11.5 kW / 1832 m² = 6.3 W/m² gegen Minergie-P 8–12 → rot mit Hinweis Verbrauchsmethode ungenau', () => {
    const r = spezifischeHeizleistung({ qhlUnsaniertW: eingabe(11_500, 'W'), ebfM2: eingabe(1832, 'm²'), baujahr: 2015, gebaeudetyp: 'mfh', energiestandard: 'minergieP' }, daten);
    expect(r.spez.wert).toBeCloseTo(6.3, 1);
    expect(r.band).toEqual([8, 12]);
    expect(r.ampel).toBe('rot');
    expect(r.hinweise.some((h) => h.code === 'plausi.minergie')).toBe(true);
  });
  it('Moosseedorf: 59.1 W/m² gegen 1986–1990 EFH 30–48 → rot; 50 W/m² (≤ 48·1.15) → gelb; 27 W/m² → gelb; 20 → rot', () => {
    const f = (w: number) => spezifischeHeizleistung({ qhlUnsaniertW: eingabe(w * 150, 'W'), ebfM2: eingabe(150, 'm²'), baujahr: 1988, gebaeudetyp: 'efh' }, daten).ampel;
    expect(f(59.1)).toBe('rot');
    expect(f(50)).toBe('gelb');
    expect(f(40)).toBe('gruen');
    expect(f(27)).toBe('gelb');
    expect(f(20)).toBe('rot');
  });
  it('ohne EBF grau', () => {
    expect(spezifischeHeizleistung({ qhlUnsaniertW: eingabe(10_000, 'W'), ebfM2: eingabe(0, 'm²'), baujahr: 1975, gebaeudetyp: 'efh' }, daten).ampel).toBe('grau');
  });
});

describe('Vergleich Norm (SIA 384/2) ↔ Verbrauch: Erwartung Norm 10–25 % über Verbrauch', () => {
  const v = (norm: number, verbrauch: number) => vergleichNormVerbrauch(eingabe(norm, 'W'), eingabe(verbrauch, 'W'), daten);
  it('+15 % grün, +5 % gelb, +35 % gelb, −10 % rot, +50 % rot, fehlend grau', () => {
    expect(v(11_500, 10_000).ampel).toBe('gruen');
    expect(v(11_500, 10_000).abweichung.wert).toBeCloseTo(15, 6);
    expect(v(10_500, 10_000).ampel).toBe('gelb');
    expect(v(13_500, 10_000).ampel).toBe('gelb');
    expect(v(9_000, 10_000).ampel).toBe('rot');
    expect(v(15_000, 10_000).ampel).toBe('rot');
    expect(v(0, 10_000).ampel).toBe('grau');
    pruefeWert(v(11_500, 10_000).abweichung, 'Abweichung');
  });
  it('Aufgabe 3: SIA 384.2 21.5 kW gegenüber Vollbetriebsstunden 11.5 kW = +87 % → rot (Kurs: Vollbetriebsstunden hier ungenau)', () => {
    expect(v(21_500, 11_500).ampel).toBe('rot');
  });
});
