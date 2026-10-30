// D1-Schema des Heizlast-Neubaus (Session 10) — dieselben Anweisungen wie migrations/0003_heizlast_neu.sql
// (Test: heizlast/tests/backend/schema.test.ts vergleicht beide). Die Functions legen die Tabellen beim ersten
// Zugriff je Worker-Instanz an; alle Anweisungen sind idempotent (IF NOT EXISTS), ein späteres
// `wrangler d1 migrations apply` schadet nicht.
//
// heizlast_projekt   Projekte des neuen Rechners (State v2+ als JSON, unverändert vom Client)
//   id               Projekt-id aus dem State (meta.id), Format siehe heizlast-projekte.js
//   name, methode    aus dem State gelesen (projekt.name, methode) — nur für die Liste, nicht gerechnet
//   schema_version   meta.schemaVersion des gespeicherten Stands (≤ aktuelle Version des Clients)
//   qh_w, qhl_w      Kennzahlen [W] aus dem Ergebnis, vom Client mitgeschickt (Liste ohne State)
//   updated_at       Versionsmarke für das optimistische Locking (ISO, streng steigend je Projekt)
// heizlast_sitzung   Anmelde-Sitzungen: nur signierte Cookies mit gültigem, nicht widerrufenem Eintrag gelten
// login_attempts     Fehlversuche je Absender (HMAC der IP, keine Klartext-IP) für die Login-Sperre

export const SCHEMA_ANWEISUNGEN = [
  `CREATE TABLE IF NOT EXISTS heizlast_projekt (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL DEFAULT '',
  methode        TEXT,
  schema_version INTEGER NOT NULL,
  state_json     TEXT NOT NULL,
  qh_w           REAL,
  qhl_w          REAL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_heizlast_projekt_updated ON heizlast_projekt (updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_heizlast_projekt_name ON heizlast_projekt (name)`,
  `CREATE TABLE IF NOT EXISTS heizlast_sitzung (
  token_id   TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_heizlast_sitzung_ablauf ON heizlast_sitzung (expires_at)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
  key_hash     TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON login_attempts (key_hash, attempted_at)`,
];

/** Bereits eingerichtete Datenbanken dieser Worker-Instanz (je Binding-Objekt). */
const eingerichtet = new WeakMap();

/** Legt die Tabellen an, falls nötig — einmal je Instanz und Datenbank; ein Fehler wird beim nächsten Aufruf erneut versucht. */
export function stelleSchemaSicher(db) {
  let p = eingerichtet.get(db);
  if (!p) {
    p = db.batch(SCHEMA_ANWEISUNGEN.map((s) => db.prepare(s))).catch((e) => {
      eingerichtet.delete(db);
      throw e;
    });
    eingerichtet.set(db, p);
  }
  return p;
}
