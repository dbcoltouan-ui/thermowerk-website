import { expect } from 'vitest';
import type { Wert } from '../../src/kern/wert';
import { istAnnahme } from '../../src/kern/wert';

/** Relative Abweichung in % gegen einen externen Sollwert (Kurslösung, Handrechnung). */
export function abweichungProzent(ist: number, soll: number): number {
  return (Math.abs(ist - soll) / Math.abs(soll)) * 100;
}

/** expect(ist) innerhalb ±prozent um soll. */
export function erwarteNahe(ist: number, soll: number, prozent: number, was = ''): void {
  const abw = abweichungProzent(ist, soll);
  expect(abw, `${was} ist ${ist}, soll ${soll} (±${prozent} %): Abweichung ${abw.toFixed(2)} %`).toBeLessThanOrEqual(prozent);
}

/** Jeder Wert trägt Herkunft, Einheit und Begründung. */
export function pruefeWert(w: Wert<unknown> | null | undefined, was = ''): void {
  expect(w, `${was}: Wert fehlt`).toBeTruthy();
  if (!w) return;
  expect(typeof w.einheit, `${was}: Einheit`).toBe('string');
  expect(['eingabe', 'messung', 'tabelle', 'schaetzung', 'fallback', 'override', 'berechnet'], `${was}: Herkunft`).toContain(w.herkunft);
  expect(w.begruendung.length, `${was}: Begründung`).toBeGreaterThan(3);
  if (istAnnahme(w)) expect(w.quelle || w.stufe || w.begruendung, `${was}: Annahme ohne Quelle/Stufe`).toBeTruthy();
  expect(w.begruendung, `${was}: Eszett`).not.toContain(String.fromCharCode(0xdf));
}
