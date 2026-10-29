/**
 * Bindung der UI an Store und Ergebnis (Session 7). Die UI liest Rohangaben über Pfade, schreibt nur über
 * `setze`/Store-Aktionen und fragt die Relevanz zentral ab (`relevant`, kern/relevanz.ts). Gerechnet wird hier
 * nichts: Werte, Standardwerte, Hinweise und Status kommen aus dem einen Ergebnis (`berechne`).
 */
import { daten, store } from '../state/app';
import { leseAusState } from '../state/store';
import { relevant } from '../kern/relevanz';
import type { ErgebnisHinweis } from '../kern/berechne';

export { store, daten };

/** Aktueller Rohwert unter `pfad` (reaktiv, weil `store.state.value` gelesen wird). */
export function lese<T = unknown>(pfad: string): T | undefined {
  return leseAusState(store.state.value, pfad) as T | undefined;
}

export function setze(pfad: string, wert: unknown): void {
  store.setze(pfad, wert);
}

/** Gilt die Angabe beim aktuellen State? Irrelevante Felder werden nicht gerendert (UX-10–14). */
export function rel(pfad: string): boolean {
  return relevant(pfad, store.state.value, { hk: daten.hk });
}

/**
 * Hinweise des Ergebnisses zu einem Eingabepfad. Kern-Module melden Pfade teils relativ (z. B. `lueftung.dichtheit`
 * aus raumweise.ts, `ebf.manuellM2`); diese werden über bekannte Präfixe zugeordnet.
 */
const ALIAS: ReadonlyArray<[string, string]> = [
  ['ebf.manuellM2', 'gebaeude.ebfManuellM2'],
  ['lueftung.', 'huelle.lueftung.'],
  ['rest', 'huelle.rest'],
];
export function normPfad(p: string | undefined): string | undefined {
  if (!p) return p;
  for (const [von, nach] of ALIAS) if (p === von || (von.endsWith('.') && p.startsWith(von))) return nach + p.slice(von.length);
  return p;
}

export function hinweiseFuer(pfad: string, exakt = true): ErgebnisHinweis[] {
  return store.ergebnis.value.hinweise.filter((h) => {
    const p = normPfad(h.pfad);
    if (!p) return false;
    return exakt ? p === pfad : p === pfad || p.startsWith(`${pfad}.`);
  });
}

/** Parst eine Zahl in Schweizer Schreibweise (23'000.5, 23 000,5). Leer → undefined, ungültig → NaN. */
export function parseZahl(text: string): number | undefined {
  const t = text.trim().replace(/['’\s]/g, '').replace(',', '.');
  if (t === '') return undefined;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return Number.NaN;
  return Number(t);
}

/** Zahl für ein Eingabefeld (ohne Tausendertrennung, damit sie editierbar bleibt). */
export function zahlFuerFeld(n: number | undefined | null, dez?: number): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '';
  if (dez === undefined) return String(Math.round(n * 1e6) / 1e6);
  return String(Math.round(n * 10 ** dez) / 10 ** dez);
}
