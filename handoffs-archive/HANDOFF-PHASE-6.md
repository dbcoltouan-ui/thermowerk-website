# Handoff — Phase 6: Login-Modal + Projekt-Liste-Modal + PDF-Export

> **Für den nächsten Chat:** Kopiere den folgenden Block 1:1 als ersten Prompt.

```
Hallo Claude,

wir arbeiten am Heizlastrechner-Redesign von Thermowerk. Phasen 1–5 sind abgeschlossen, Phase 6 steht an. Bitte folge dieser Reihenfolge:

1. Lies zuerst `CLAUDE.md` im Projekt-Root (zentrale Wissensbasis, enthält aktuellen Stand inkl. Phase-5-Block).
2. Lies dann `HANDOFF-PHASE-6.md` (diese Datei) vollständig.
3. Lies `HANDOFF-HEIZLAST-REDESIGN.md` für den Gesamtkontext (Strategie, Backend, Auth, Export-Anforderungen).
4. Verschaffe dir einen Überblick über die relevanten Quellen:
   - `src/pages/heizlast.astro` (Hauptseite mit Glue-JS, enthält bereits die leeren Stubs für `[data-hz-action="login"]`, `open-projects`, `save-cloud`, `save-cloud-new`)
   - `src/lib/heizlast/projects.ts` (Wrapper für `/api/heizlast-projects` — `listProjects`, `loadProject`, `saveProject`, `deleteProject`, `probeAuth`)
   - `functions/api/heizlast-auth.js` und `functions/api/heizlast-projects.js` (Cloudflare Functions, Cookie-Auth, existiert)
   - `src/components/heizlast/ExecutiveSummary.astro` + `LeistungsDiagramm.astro` (Phase-5-Output, wird im PDF übernommen)
   - `src/components/Contact.astro` (Referenz für Modal-Design im Thermowerk-Stil)
5. Starte Phase 6 mit:
   a) `LoginModal.astro` — Dialog für Passwort-Login (POST an `/api/heizlast-auth`), setzt Cookie, schaltet `uiState.isAuthenticated` um. Abmelden-Variante wenn bereits eingeloggt.
   b) `ProjectsModal.astro` — Liste aller Cloud-Projekte mit Status-Badge, Laden- und Löschen-Aktionen.
   c) `ExportModal.astro` + PDF-Export — einheitlicher Dialog mit Checkboxen für Inhalt (Executive Summary, Objektdaten, Rechenwege, Diagramm, FWS-Grundlagen), Radio PDF/JSON. PDF-Qualität Keynote-Niveau (siehe `HANDOFF-HEIZLAST-REDESIGN.md` Abschnitt 9). Empfehlung: Print-CSS + window.print() als erster Wurf, ggf. später jsPDF.

Wichtig:
- Bestehende Tests nicht brechen (`scripts/test-heizlast.ts` 49 / `scripts/test-heizlast-state.ts` 16).
- Sprache: Deutsch (Schweiz), kein "Du"-Anrede, keine Emojis in UI.
- Knapp antworten, keine Task-Listen nach Erledigung.

Nach Abschluss: CLAUDE.md + HANDOFF-PHASE-7.md aktualisieren, committen/pushen, Copy-Paste-Prompt für Phase 7 ausgeben.
```

---

## Stand nach Phase 5 (17.04.2026)

**Phase 5 ist vollständig abgeschlossen.** Die Hauptseite `src/pages/heizlast.astro` hat jetzt oben eine sticky Executive Summary und zwischen Auslegung und Speicher das neue Leistungsdiagramm.

### Was neu existiert
- `src/components/heizlast/ExecutiveSummary.astro` — sticky Stat-Row (Qh Hero + Qhl + W/m² Ampel + WW + Puffer). Nutzt das bestehende `[data-kpi]`-System, wird automatisch befüllt.
- `src/components/heizlast/LeistungsDiagramm.astro` — eigene Sektion, Chart.js-Linienplot mit WP-Kennlinie (drei Presets + editierbare Stützpunkte) vs. Gebaeude-Heizkennlinie, Bivalenzpunkt-Marker via Bisektion.
- Dependency `chart.js@^4` in `package.json`.

### Was dafür (absichtlich) NICHT angefasst wurde
- `renderAll()` / `setKpi()` in `heizlast.astro` blieb unverändert.
- `src/lib/heizlast/state.ts` wurde nicht erweitert — Modell-Stützpunkte des Diagramms leben im Component-Script, nicht im globalen State.
- Der Button `data-hz-action="login"` öffnet weiterhin nur ein `alert("wird in Phase 6 implementiert")`.
- Save-Cloud und Projekt-Liste bleiben disabled bis Auth.

### Tests
- `node --experimental-strip-types scripts/test-heizlast.ts` → 49 grün.
- `node --experimental-strip-types scripts/test-heizlast-state.ts` → 16 grün.

---

## Aufgaben für Phase 6

### 6a — Login-Modal

Ziel: Modales Passwort-Login, damit der User Cloud-Projekte nutzen kann.

Bestehende Infrastruktur:
- `POST /api/heizlast-auth` mit `{ password }` setzt HttpOnly-Cookie `heizlast_auth`, gibt `{ ok: true }` zurück.
- `probeAuth()` in `src/lib/heizlast/projects.ts` prüft den Cookie-Status.
- `uiState.isAuthenticated` wird beim Boot von `heizlast.astro` gesetzt.

Umsetzung:
1. Neue Komponente `src/components/heizlast/LoginModal.astro` — Overlay mit Karte, Passwort-Input, Absenden-Button, Fehlermeldung.
2. Einbindung in `heizlast.astro`, sichtbar bei `uiState.authModalOpen === true`.
3. Klick auf `[data-hz-action="login"]` oder `#hz-login-trigger` öffnet das Modal, bei Erfolg → `uiState.setKey('isAuthenticated', true)` und `uiState.setKey('authModalOpen', false)`.
4. Wenn bereits eingeloggt: Button-Label „Abmelden" ruft `DELETE /api/heizlast-auth` (falls vorhanden — Funktion prüfen, ggf. neu anlegen) und setzt `isAuthenticated: false`.
5. ESC schliesst Modal, Fokus-Management auf das Input.

Accessibility:
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` auf dem Titel.
- Fokus-Trap in der Modal-Karte.
- Sichtbar gestaltet im `.hz-scope` mit Backdrop `rgba(17, 29, 51, 0.55)` und Karten-Shadow.

### 6b — Projekt-Liste-Modal

Ziel: Liste aller eigenen Cloud-Projekte mit Laden-/Löschen-Aktionen.

Bestehende Infrastruktur:
- `projects.ts` hat `listProjects()`, `loadProject(id)`, `deleteProject(id)` — alle hinter dem Auth-Cookie.
- `projectList` (Nanostore-Atom) hält die aktuelle Liste.

Umsetzung:
1. Neue Komponente `src/components/heizlast/ProjectsModal.astro` — Liste als Card-Grid oder Tabelle.
   - Spalten/Felder: Projektname, Kunde, Status-Badge (Farbe je Status), EBF, Qhl, Qh, letztes Update.
   - Row-Actions: „Laden", „Löschen" (mit Confirm).
2. Aktivieren, wenn `uiState.projectsModalOpen === true` und `isAuthenticated === true`.
3. Beim Öffnen `listProjects()` triggern, Ladezustand anzeigen.
4. „Laden" → `loadProject(id)` + `replaceState(next)` + Modal schliessen.
5. „Löschen" → Confirm-Dialog, `deleteProject(id)`, Liste aktualisieren.

### 6c — Einheitlicher PDF-Export

Ziel: Ein Klick produziert ein mehrseitiges PDF auf Keynote-Niveau (siehe `HANDOFF-HEIZLAST-REDESIGN.md` Abschnitt 9).

Umsetzung — empfohlene Reihenfolge:
1. **`ExportModal.astro`** mit Checkboxen:
   - Executive Summary (Deckblatt)
   - Objektdaten & Eingabewerte
   - Resultate pro Sektion
   - Formeln und Rechenwege (optional)
   - Leistungsdiagramm
   - Berechnungsgrundlagen (FWS/SIA)
   - Notizen-Sektion (nur die mit Export-Flag `true`)
   - Format: Radio PDF / JSON
2. **Print-CSS-Layer**:
   - Eigener `@media print`-Block in `HeizlastLayout.astro` oder neuer `print.css`.
   - `@page { size: A4 portrait; margin: 20mm; }`.
   - Header (Thermowerk-Logo + Kickline) auf jeder Seite wiederholen (`thead`-Trick oder `position: running`).
   - Seitenzahlen via CSS Counters.
   - `page-break-after: always` nach jeder Sektion.
3. **Deckblatt** dynamisch generieren: eigene Komponente `src/components/heizlast/PrintCover.astro`, nur bei `body.hz-print-mode` sichtbar.
4. **Chart.js als Bild**: `canvas.toDataURL('image/png')` vor dem Print-Call, in `<img>` unter dem Canvas einblenden.
5. **JSON-Export**: `projects.ts` → neuer Helper `exportStateAsJson()`, Download via `Blob + URL.createObjectURL`.

Wenn Print-CSS nicht reicht für Keynote-Niveau (komplexe Layouts, exakte Typografie), auf **`jsPDF` + `html2canvas`** upgraden:
- `npm install jspdf html2canvas`
- Generiere Deckblatt manuell, rendere Sektionen mit `html2canvas` und packe sie seitenweise ins PDF.

### 6d — Polish

- Fokus-Management: beim Öffnen von Modals erstes Input fokussieren, beim Schliessen den Trigger wieder fokussieren.
- `body.is-auth` Klasse setzen, wenn `isAuthenticated` — ermöglicht CSS-Toggles für Cloud-Features.
- Status-Pill in Section 7 auch „Gerade importiert" / „Projekt geladen" darstellen.

---

## Was NICHT in Phase 6 gehört
- Hersteller-Kennlinien aus Sanity → spätere Phase.
- Angebots-Template oder Mehrsprachigkeit → spätere Phase.
- Umfangreiches Testing / End-to-End → Phase 7.

---

## Dateien, die Phase 6 anfassen wird
- `src/pages/heizlast.astro` (Modal-Mounts, Event-Wiring, Export-Action)
- `src/components/heizlast/LoginModal.astro` (NEU)
- `src/components/heizlast/ProjectsModal.astro` (NEU)
- `src/components/heizlast/ExportModal.astro` (NEU)
- `src/components/heizlast/PrintCover.astro` (NEU, optional)
- `src/layouts/HeizlastLayout.astro` (Print-CSS-Block)
- `src/lib/heizlast/projects.ts` (evtl. `logout()` hinzufügen)
- `functions/api/heizlast-auth.js` (prüfen ob `DELETE` existiert)
- `package.json` (evtl. `jspdf` + `html2canvas`)
- `CLAUDE.md` (Phase-6-Block dokumentieren)
- `HANDOFF-PHASE-7.md` (NEU, am Ende von Phase 6)

---

## Arbeitsweise (Erinnerung für Claude)
- Git-Pfad: `C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe`, Shell **cmd**.
- Commit-Msg via `write_file` in `commitmsg.txt` → `git commit -F commitmsg.txt`.
- Bei Struktur-Änderungen: CLAUDE.md MUSS mitgepflegt werden.
- Antworten knapp, keine Task-Auflistung nach Erledigung, keine Emojis in UI.
