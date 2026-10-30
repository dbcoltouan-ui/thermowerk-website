/**
 * EIN Ladepfad für gespeicherte Projekte (Session 6; FLOW-03/04, BUILD-11): `hydrateState(raw)`.
 *
 *   raw → Version erkennen → Migrationskette vN → vN+1 (protokolliert) → normalisiereState (Validierung)
 *
 * Gilt für Entwurf-Slot, Projektliste, Cloud (Session 10) und Import gleichermassen. Keine stillen
 * Ergebnisänderungen: jede Migration schreibt ins Protokoll, verworfene Angaben stehen in `probleme`.
 *
 * Versionen:
 *  - v1: Shell-Entwurf aus Session 1 (`{ projektname, methode, aktiverSchritt? }`, ohne `meta`) — die
 *    einzige Vorgängerform des Neubaus. Ein Objekt ohne `schemaVersion`, das so aussieht, gilt als v1.
 *  - v2: Schema Session 6 (Verbrauch als flache Liste `verbrauch.eintraege`).
 *  - v3: Session 7b — `verbrauch.reihen` (eine Reihe je Energieträger mit Erfassungsart) statt `eintraege`;
 *    Raum-Bauteile dürfen generische Art (`boden`/`decke`) und Anschluss `auto` tragen (bestehende bleiben gültig).
 *  - v4: Session 8 (Nachtrag 30.10.) — Platzhalter `zusatz` (Förderung/Bewilligung/Offerte) entfällt: nicht im Umfang (Daniel).
 * Projekte des alten Tools (`objekt`, `heizung`, `detail` …) sind ausdrücklich nicht importierbar
 * (Entscheid Daniel, KONTEXT §2 «State») und werden mit klarer Meldung abgelehnt.
 */
import type { State } from './schema';
import { neuerState, normalisiereState, SCHEMA_VERSION } from './schema';

export type HydrateErgebnis =
  | { ok: true; state: State; vonVersion: number; protokoll: string[]; probleme: string[] }
  | { ok: false; grund: 'altesTool' | 'neuereVersion' | 'unlesbar'; text: string };

type Roh = Record<string, unknown>;
interface MigrationsKontext {
  id: string;
  jetzt: string;
}

/** Migrationsschritt von Version n auf n+1. */
export type Migration = (raw: Roh, k: MigrationsKontext) => { raw: Roh; protokoll: string[] };

const istObjekt = (v: unknown): v is Roh => typeof v === 'object' && v !== null && !Array.isArray(v);

/** v1 (Session-1-Shell) → v2: Projektname und Methode übernehmen, Rest Standard. */
const v1ZuV2: Migration = (raw, k) => {
  const s = neuerState(k);
  const protokoll: string[] = ['v1 → v2: Shell-Entwurf (Session 1) in Schema v2 überführt'];
  if (typeof raw.projektname === 'string') {
    s.projekt.name = raw.projektname;
    protokoll.push(`Projektname «${raw.projektname}» übernommen`);
  }
  if (raw.methode === 'fws' || raw.methode === 'raumweise') {
    s.methode = raw.methode;
    protokoll.push(`Methode «${raw.methode}» übernommen`);
  }
  return { raw: s as unknown as Roh, protokoll };
};

/** v2 → v3: `verbrauch.eintraege` (flach, je Eintrag ein Energieträger) → `verbrauch.reihen` (eine Reihe je Träger, Art «Zeiträume»). */
const v2ZuV3: Migration = (raw) => {
  const protokoll: string[] = ['v2 → v3: Verbrauchseinträge in Reihen je Energieträger überführt (Session 7b)'];
  const out: Roh = { ...raw, meta: { ...(istObjekt(raw.meta) ? raw.meta : {}), schemaVersion: 3 } };
  const v = istObjekt(raw.verbrauch) ? { ...raw.verbrauch } : {};
  const eintraege = Array.isArray(v.eintraege) ? (v.eintraege as unknown[]) : [];
  const reihen: Roh[] = [];
  for (const e of eintraege) {
    if (!istObjekt(e) || typeof e.energietraeger !== 'string') continue;
    let r = reihen.find((x) => x.energietraeger === e.energietraeger);
    if (!r) {
      r = { id: `r-${e.energietraeger}`, energietraeger: e.energietraeger, art: 'zeitraeume', zeitraeume: [] };
      reihen.push(r);
    }
    const { energietraeger: _t, ...rest } = e;
    (r.zeitraeume as Roh[]).push(rest);
  }
  if (eintraege.length) protokoll.push(`${eintraege.length} Verbrauchseinträge → ${reihen.length} Reihe(n): ${reihen.map((r) => `${String(r.energietraeger)} (${(r.zeitraeume as Roh[]).length})`).join(', ')}`);
  delete v.eintraege;
  v.reihen = reihen;
  out.verbrauch = v;
  return { raw: out, protokoll };
};

/** v3 → v4: Platzhalter der Zusatzmodule entfernen (Förderung, Bewilligung, Offerte sind nicht im Umfang, Daniel 30.10.). */
const v3ZuV4: Migration = (raw) => {
  const protokoll: string[] = [];
  const { zusatz, ...rest } = raw;
  const inhalt = istObjekt(zusatz) ? Object.values(zusatz).some((x) => istObjekt(x) && Object.keys(x).length > 0) : false;
  if (inhalt) protokoll.push('v3 → v4: Angaben zu Förderung/Bewilligung/Offerte entfernt (nicht mehr im Umfang)');
  return { raw: { ...rest, meta: { ...(istObjekt(raw.meta) ? raw.meta : {}), schemaVersion: 4 } }, protokoll };
};

/** Migrationskette: Schlüssel = Ausgangsversion. Neue Versionen hängen hier einen Schritt an. */
export const MIGRATIONEN: Readonly<Record<number, Migration>> = { 1: v1ZuV2, 2: v2ZuV3, 3: v3ZuV4 };

const ALT_TOOL_SCHLUESSEL = ['objekt', 'heizung', 'detail', 'stammdaten'];

export function erkenneVersion(raw: unknown): number | 'altesTool' | null {
  if (!istObjekt(raw)) return null;
  const meta = raw.meta;
  if (istObjekt(meta) && typeof meta.schemaVersion === 'number') return meta.schemaVersion;
  if (typeof raw.schemaVersion === 'number') return raw.schemaVersion;
  if (ALT_TOOL_SCHLUESSEL.some((k) => k in raw)) return 'altesTool';
  if ('projektname' in raw || 'methode' in raw) return 1;
  return null;
}

/** Lädt einen gespeicherten Stand beliebiger bekannter Version (String oder Objekt). Wirft nie. */
export function hydrateState(eingang: unknown, k: MigrationsKontext): HydrateErgebnis {
  let raw: unknown = eingang;
  if (typeof eingang === 'string') {
    try {
      raw = JSON.parse(eingang);
    } catch {
      return { ok: false, grund: 'unlesbar', text: 'Gespeicherter Stand ist kein gültiges JSON.' };
    }
  }
  const version = erkenneVersion(raw);
  if (version === 'altesTool') return { ok: false, grund: 'altesTool', text: 'Projekt aus dem alten Heizlast-Tool — im Neubau nicht importierbar (bitte neu erfassen).' };
  if (version === null || !istObjekt(raw)) return { ok: false, grund: 'unlesbar', text: 'Unbekanntes Format — kein Heizlast-Projekt.' };
  if (version > SCHEMA_VERSION) return { ok: false, grund: 'neuereVersion', text: `Projekt aus einer neueren Version (Schema ${version}) — bitte die Seite neu laden.` };
  if (version < 1 || !Number.isInteger(version)) return { ok: false, grund: 'unlesbar', text: `Ungültige Schemaversion ${version}.` };

  const protokoll: string[] = [];
  let aktuell: Roh = raw;
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const m = MIGRATIONEN[v];
    if (!m) return { ok: false, grund: 'unlesbar', text: `Keine Migration von Schema ${v} auf ${v + 1}.` };
    const r = m(aktuell, k);
    aktuell = r.raw;
    protokoll.push(...r.protokoll);
  }
  const { state, probleme } = normalisiereState(aktuell, k);
  return { ok: true, state, vonVersion: version, protokoll, probleme };
}
