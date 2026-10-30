/**
 * Export (Session 9): Projekt als JSON (State v4 unverändert — lädt über `hydrateState` wieder) und Dateinamen.
 * Keine abgeleiteten Werte im Export (KONTEXT §2 «State»: nur Rohangaben).
 */
import type { State } from '../state/schema';

/** Projekt als JSON-Text (State mit `meta.schemaVersion`). */
export function projektJson(s: State): string {
  return `${JSON.stringify(s, null, 2)}\n`;
}

/** Dateiname aus Projektname und Datum: «heizlast-<name>-<JJJJ-MM-TT>.<endung>», nur sichere Zeichen. */
export function dateiname(projektname: string, datumIso: string, endung: string): string {
  const ersatz: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', é: 'e', è: 'e', à: 'a' };
  const name = projektname
    .trim()
    .replace(/[äöüÄÖÜéèà]/g, (c) => ersatz[c] ?? c)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return `heizlast-${name || 'projekt'}-${datumIso.slice(0, 10)}.${endung}`;
}
