# src/daten — Loader + Schemas

Lädt die Fachdaten aus `heizlast/data/*.json` (Session 2) und validiert sie gegen Schemas. Daten liegen nur in `data/`, nie als Kopie im Code (DATA-01). Einheitliches `_meta { version, stand, quellen[] }` je Datei.
