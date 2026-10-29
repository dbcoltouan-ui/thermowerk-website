/** Anzeigeformate (nur UI): Schweizer Schreibweise, Leistung in kW. Rechnet nichts, formatiert nur Ergebnis-Werte. */
import { fmt } from '../kern/wert';

export function kW(w: number | null | undefined, dez = 2): string {
  return w === null || w === undefined || !Number.isFinite(w) ? '—' : `${fmt(w / 1000, dez)} kW`;
}

export function zahl(n: number | null | undefined, einheit: string, dez = 0): string {
  return n === null || n === undefined || !Number.isFinite(n) ? '—' : `${fmt(n, dez)} ${einheit}`;
}
