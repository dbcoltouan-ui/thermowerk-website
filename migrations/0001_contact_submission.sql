-- Migration 0001: Kontaktanfragen aus Formular
-- Ersetzt Sanity-Schema `contactSubmission` (sanity/schemas/contactSubmission.ts)
-- Erstellt: 2026-04-21 (Phase 1 des MIGRATION-GAMEPLAN)

CREATE TABLE IF NOT EXISTS contact_submission (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  interest      TEXT,
  message       TEXT NOT NULL,
  submitted_at  TEXT NOT NULL,                         -- ISO 8601 UTC
  status        TEXT NOT NULL DEFAULT 'neu',           -- neu | bearbeitung | erledigt
  notes         TEXT                                    -- interne Notizen
);

CREATE INDEX IF NOT EXISTS idx_contact_submitted_at ON contact_submission (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_status       ON contact_submission (status);
