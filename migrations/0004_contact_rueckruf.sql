-- Migration 0004: Rückruf-Wunschzeiten im Kontaktformular
-- Erstellt: 2026-11-10 (Kontaktart Nachricht / Rückruf / Beides, Raster Mo–Fr 07–19)
-- Angewendet am 2026-11-10 direkt über die Cloudflare-D1-API (ALTER TABLE ist nicht idempotent – nicht erneut ausführen).

ALTER TABLE contact_submission ADD COLUMN kontaktart     TEXT;  -- nachricht | rueckruf | beides (NULL = Anfragen vor 2026-11-10)
ALTER TABLE contact_submission ADD COLUMN rueckruf_slots TEXT;  -- JSON-Array der Schlüssel, z. B. ["di-13","di-14","fr-8"] (Tag-Startstunde)
ALTER TABLE contact_submission ADD COLUMN rueckruf_text  TEXT;  -- Lesbare Zusammenfassung, z. B. "Di 13–15 · Fr 08–09"
