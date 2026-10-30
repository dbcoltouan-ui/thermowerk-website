/** Anzeigeformate (nur UI): Schweizer Schreibweise, Leistung in kW. Rechnet nichts, formatiert nur Ergebnis-Werte. */
import { fmt } from '../kern/wert';

export function kW(w: number | null | undefined, dez = 2): string {
  return w === null || w === undefined || !Number.isFinite(w) ? '—' : `${fmt(w / 1000, dez)} kW`;
}

export function zahl(n: number | null | undefined, einheit: string, dez = 0): string {
  return n === null || n === undefined || !Number.isFinite(n) ? '—' : `${fmt(n, dez)} ${einheit}`;
}

/** Anzeige-Einheit (Daten: ASCII, z. B. m3n → m³). */
export function einheitAnzeige(e: string | undefined): string {
  return (e ?? '').replace('m3n', 'm³').replace('m3', 'm³');
}

/** Datum aus UTC-Millisekunden als T.M.JJJJ (wie im Kern-Rechenweg). */
export function datumKurz(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
}

const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/** Datum aus UTC-Millisekunden als «Mon JJJJ». */
export function datumMonat(ms: number): string {
  const d = new Date(ms);
  return `${MONATE_KURZ[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
