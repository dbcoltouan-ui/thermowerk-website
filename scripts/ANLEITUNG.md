# Thermowerk – Sync-Anleitung

Alle Scripts liegen in `C:\Users\Daniel\Documents\thermowerk-website\scripts\`
Per Doppelklick auf die `.bat`-Datei ausführen.

---

## 4 Befehle

| Script | Was es macht |
|--------|-------------|
| **pull.bat** | Zieht alle Sanity-Daten → `sanity-export.json` |
| **push.bat** | Schreibt lokale Werte (aus `seed-sanity.mjs`) → Sanity |
| **deploy.bat** | Git commit + push → Cloudflare Rebuild |
| **sync-all.bat** | push.bat + deploy.bat in einem Schritt |

---

## Workflow A: Etwas in Sanity Studio geändert, lokal übernehmen

1. **pull.bat** doppelklicken
2. `sanity-export.json` öffnen (im Projektordner) – enthält alle aktuellen Sanity-Werte
3. Die gewünschten Werte in `scripts/seed-sanity.mjs` und/oder in die Astro-Komponenten-Fallbacks übertragen
4. **sync-all.bat** doppelklicken (schreibt Sanity + pusht Code)

## Workflow B: Etwas im Code geändert, Sanity aktualisieren

1. Code-Dateien bearbeiten (Komponenten, Seed-Script, CSS etc.)
2. **sync-all.bat** doppelklicken
   - Aktualisiert Sanity mit den Werten aus `seed-sanity.mjs`
   - Committed und pusht den Code
   - Cloudflare baut automatisch neu (1–3 Min)

## Workflow C: Nur Code geändert, Sanity nicht betroffen

1. Code-Dateien bearbeiten
2. **deploy.bat** doppelklicken
   - Fragt nach Commit-Nachricht
   - Committed + pusht

## Workflow D: Nur Sanity-Text geändert (kein Code)

1. Direkt in [Sanity Studio](https://thermowerk.sanity.studio) bearbeiten + publishen
2. Webhook triggert Cloudflare Rebuild automatisch
3. Kein Script nötig

---

## Wo finde ich was?

| Datei | Inhalt |
|-------|--------|
| `scripts/seed-sanity.mjs` | Alle Werte die nach Sanity geschrieben werden |
| `sanity-export.json` | Export aller aktuellen Sanity-Daten (nach pull.bat) |
| `src/components/*.astro` | Komponenten mit Fallback-Werten |
| `src/layouts/Layout.astro` | Gesamtes CSS |
| `sanity/schemas/*.ts` | Sanity-Feldstrukturen |
| `.env` | API-Token (nie in Git!) |

---

## Wichtig

- **sanity-export.json** wird NICHT committed (in .gitignore)
- **Bilder** werden nicht über Sanity geladen – lokale Fallbacks aus `public/img/` greifen immer
- Wenn du in Sanity nur Text änderst und publishst, bleiben Bilder unverändert
- Bei Problemen: Feld in Sanity leeren + publishen → Fallback greift automatisch
