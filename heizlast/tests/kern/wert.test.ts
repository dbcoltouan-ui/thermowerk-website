import { describe, expect, it } from 'vitest';
import { berechnet, eingabe, fallback, fmt, istAnnahme, kombiniereUnsicherheit, messung, override, sammleAnnahmen, schaetzung, tabelle, unsicherheitSumme } from '../../src/kern/wert';

describe('Herkunftsmodell (wert.ts)', () => {
  it('Konstruktoren setzen Herkunft; Annahmen sind weder Eingabe, Messung noch Berechnung', () => {
    expect(istAnnahme(eingabe(1, 'W'))).toBe(false);
    expect(istAnnahme(messung(1, 'W'))).toBe(false);
    expect(istAnnahme(berechnet(1, 'W', 'x'))).toBe(false);
    expect(istAnnahme(tabelle(1, 'W', 'x', 'q'))).toBe(true);
    expect(istAnnahme(schaetzung(1, 'W', 'x'))).toBe(true);
    expect(istAnnahme(fallback(1, 'W', 'x'))).toBe(true);
    expect(istAnnahme(override(1, 'W'))).toBe(true);
    expect(tabelle(1, 'W', 'x', 'q', { band: [0.5, 1.5], stufe: 's' })).toMatchObject({ band: [0.5, 1.5], stufe: 's', quelle: 'q' });
  });
  it('Unsicherheit: Quadratsumme für Produkte, gewichtet für Summen; ohne Angaben undefined', () => {
    const a = tabelle(10, 'W', 'a', 'q', { unsicherheit: 3 });
    const b = tabelle(10, 'W', 'b', 'q', { unsicherheit: 4 });
    expect(kombiniereUnsicherheit([a, b])).toBe(5);
    expect(kombiniereUnsicherheit([eingabe(1, 'W')])).toBeUndefined();
    expect(berechnet(100, 'W', 'a·b', [a, b]).unsicherheit).toBe(5);
    expect(unsicherheitSumme([eingabe(90, 'W'), tabelle(10, 'W', 'b', 'q', { unsicherheit: 50 })])).toBe(5); // 5 W von 100 W
    expect(unsicherheitSumme([eingabe(1, 'W')])).toBeUndefined();
  });
  it('sammleAnnahmen filtert und überspringt null', () => {
    expect(sammleAnnahmen([eingabe(1, 'W'), null, fallback(2, 'W', 'x'), undefined, berechnet(3, 'W', 'y')]).map((w) => w.wert)).toEqual([2]);
  });
  it('fmt: Schweizer Schreibweise mit Apostroph, ohne nachlaufende Nullen', () => {
    expect(fmt(24990)).toBe("24'990");
    expect(fmt(12.5)).toBe('12.5');
    expect(fmt(12.495, 2)).toBe('12.5');
    expect(fmt(0.0583, 4)).toBe('0.0583');
    expect(fmt(-1234.5, 1)).toBe("−1'234.5");
    expect(fmt(NaN)).toBe('—');
  });
});
