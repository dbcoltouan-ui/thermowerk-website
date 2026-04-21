-- Migration 0002: Heizlast-Projekte (Cloud-Save aus Single-File-Rechner)
-- Ersetzt Sanity-Schema `heizlastProject` (sanity/schemas/heizlastProject.ts)
-- Erstellt: 2026-04-21 (Phase 1 des MIGRATION-GAMEPLAN)

CREATE TABLE IF NOT EXISTS heizlast_project (
  id             TEXT PRIMARY KEY,                     -- UUID (matcht altes Sanity-_id-Format)
  project_name   TEXT NOT NULL DEFAULT 'Unbenannt',
  customer_name  TEXT,
  address        TEXT,
  qhl            REAL,                                  -- berechnete Heizlast Qhl (kW)
  qh             REAL,                                  -- Gesamtleistung Qh (kW)
  ebf            REAL,                                  -- Energiebezugsflaeche (m^2)
  state_json     TEXT NOT NULL DEFAULT '{}',            -- kompletter Tool-State
  status         TEXT NOT NULL DEFAULT 'arbeit',        -- arbeit | offeriert | bestellt | abgeschlossen | archiv
  notes          TEXT,
  created_at     TEXT NOT NULL,                         -- ISO 8601 UTC
  updated_at     TEXT NOT NULL                          -- ISO 8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_heizlast_updated_at ON heizlast_project (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_heizlast_status     ON heizlast_project (status);
CREATE INDEX IF NOT EXISTS idx_heizlast_name       ON heizlast_project (project_name);
