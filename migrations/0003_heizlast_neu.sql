-- Migration 0003: Heizlast-Neubau (Session 10, 2026-10-30)
-- Projekte des neuen Rechners (/heizlast-neu/, ab Go-Live /heizlast/), Anmelde-Sitzungen mit Widerruf,
-- Fehlversuche für die Login-Sperre. Die Tabelle heizlast_project (Migration 0002) bleibt für das alte
-- Tool bis zum Go-Live (Session 12) unverändert; sie wird nicht migriert (alte Projekte sind nicht
-- importierbar, Entscheid Daniel).
--
-- Die Pages Functions legen dieselben Tabellen beim ersten Zugriff an (functions/_lib/heizlast-schema.js,
-- alle Anweisungen mit IF NOT EXISTS); ein Test stellt sicher, dass beide Fassungen identisch sind.
-- Manuell: wrangler d1 execute thermowerk-data --remote --file=migrations/0003_heizlast_neu.sql

CREATE TABLE IF NOT EXISTS heizlast_projekt (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL DEFAULT '',
  methode        TEXT,
  schema_version INTEGER NOT NULL,
  state_json     TEXT NOT NULL,
  qh_w           REAL,
  qhl_w          REAL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_heizlast_projekt_updated ON heizlast_projekt (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_heizlast_projekt_name ON heizlast_projekt (name);

CREATE TABLE IF NOT EXISTS heizlast_sitzung (
  token_id   TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_heizlast_sitzung_ablauf ON heizlast_sitzung (expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  key_hash     TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON login_attempts (key_hash, attempted_at);
