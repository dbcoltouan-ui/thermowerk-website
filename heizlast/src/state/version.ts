/**
 * Aktuelle Version des State-Schemas — eigene Datei ohne Abhängigkeiten, damit auch das Backend
 * (`functions/api/heizlast-projekte.js`, Session 10) dieselbe Zahl importiert, ohne den Kern mitzubündeln.
 * Der Server lehnt Stände mit höherer Version ab; ältere nimmt er an (der Client migriert beim Laden über
 * `hydrateState`, der Server rechnet und migriert nicht).
 */
export const SCHEMA_VERSION = 4 as const;
