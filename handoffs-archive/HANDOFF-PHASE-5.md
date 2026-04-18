# Handoff — Phase 5: Executive Summary + Chart.js Leistungsdiagramm

> **Für den nächsten Chat:** Kopiere den folgenden Block 1:1 als ersten Prompt.

```
Hallo Claude,

wir arbeiten am Heizlastrechner-Redesign von Thermowerk. Phasen 1–4 sind abgeschlossen, Phase 5 steht an. Bitte folge dieser Reihenfolge:

1. Lies zuerst `CLAUDE.md` im Projekt-Root (zentrale Wissensbasis, enthält aktuellen Stand).
2. Lies dann `HANDOFF-PHASE-5.md` (diese Datei) vollständig.
3. Lies `HANDOFF-HEIZLAST-REDESIGN.md` für den Gesamtkontext (Strategie, Backend, Auth).
4. Verschaffe dir einen Überblick über die relevanten Quellen:
   - `src/pages/heizlast.astro` (Hauptseite mit Glue-JS)
   - `src/components/heizlast/sections/Section7Projekt.astro` (dort liegt die heutige "Zusammenfassung")
   - `src/lib/heizlast/compute.ts` + `state.ts` (Datenquellen)
   - `src/components/heizlast/KpiCard.astro` (Primitive, ggf. Hero-Variante nutzen)
5. Starte Phase 5 mit:
   a) Executive-Summary-Block oben auf der Heizlast-Seite (sticky/stat-row, Qh + Qhl + WW-Speicher + Puffer + W/m²-Ampel).
   b) Leistungsdiagramm mit Chart.js: WP-Kennlinien vs. Gebäudelast, Schnittpunkt visualisieren (Bivalenzpunkt).
   c) Anbindung an `heizlastCompute` — das Diagramm aktualisiert sich live bei Eingabeänderungen.

Wichtig:
- Bestehende Tests nicht brechen (`scripts/test-heizlast.ts` 49 / `scripts/test-heizlast-state.ts` 16).
- Kein Login-Modal in dieser Phase, kein PDF-Export (Phase 6).
- Sprache: Deutsch (Schweiz), kein "Du"-Anrede, keine Emojis in UI.
- Knapp antworten, keine Task-Listen nach Erledigung.

Nach Abschluss: CLAUDE.md + HANDOFF-PHASE-6.md aktualisieren, committen/pushen, Copy-Paste-Prompt für Phase 6 ausgeben.
```

---

## Stand nach Phase 4 (17.04.2026)

**Phase 4 ist vollständig abgeschlossen.** Die Hauptseite `src/pages/heizlast.astro` rendert die 7 Sektionen, State/Compute/Storage laufen live, alle Bindings funktionieren. Sandbox ist entfernt.

### Was existiert
- **Sektionen** (`src/components/heizlast/sections/`):
  - `Section1Projekt.astro` — Projekt-Meta (Name, Kunde, Adresse, Status) + Gebäude-Stammdaten + EBF-Helper.
  - `Section2Heizlast.astro` — M2-Methoden als Toggles (Verbrauch / Messung / Volllaststunden / Bauperiode / Override).
  - `Section3Sanierung.astro` — M4, Sanierungs-Delta multiplikativ.
  - `Section4Warmwasser.astro` — M5, WW-Methoden (personen / direkt / messung).
  - `Section5Auslegung.astro` — M7, Qh = Qhl + Qw + Qoff + Qas, Hero-KPI.
  - `Section6Speicher.astro` — M8 + M9 nebeneinander (WW + Puffer).
  - `Section7Projekt.astro` — Zusammenfassung Gebäude + Ergebnis + Speichern/Laden-Buttons.
- **Hauptseite** `src/pages/heizlast.astro` — importiert alle Sektionen, enthält Glue-JS, bootet State, subscribet `heizlastCompute` und `heizlastState`, rendert KPIs + Sum-Slots, handhabt M2-Methoden-Toggle-Aktivierung, Auth-Probe, Save-Actions.
- **Bindings** `src/lib/heizlast/bindings.ts` — `data-hz-bind="path.to.field"` + `data-hz-type` für Zwei-Wege-Binding, delegierte Event-Handler.
- **State/Storage/Compute** — unverändert aus Phase 3, läuft stabil.

### Tests
- `node --experimental-strip-types scripts/test-heizlast.ts` → 49 grün.
- `node --experimental-strip-types scripts/test-heizlast-state.ts` → 16 grün.

---

## Aufgaben für Phase 5

### 5a — Executive Summary (oben auf der Seite)

Ziel: Eine kompakte Stat-Row direkt nach dem Seitenkopf, **vor** Sektion 1, die die wichtigsten Ergebnisse permanent sichtbar macht. Auf Desktop sticky beim Scrollen (optional), auf Mobile normal im Flow.

Empfohlene Struktur:
- **Qh** (Auslegungsleistung, Hero-Variante, gross)
- **Qhl** (Heizlast)
- **WW-Speicher** (L)
- **Puffer** (L)
- **W/m²-Ampel** (Plausi-Indikator, grün/gelb/rot)

Datenquelle: `heizlastCompute` (derived Store, schon vorhanden).

Umsetzung:
1. Neue Komponente `src/components/heizlast/ExecutiveSummary.astro` mit `[data-kpi]`-Slots.
2. Einbinden in `heizlast.astro` oberhalb `<Section1Projekt />`.
3. `renderAll()` in heizlast.astro erweitern (oder existierendes `setKpi`-Schema mitnutzen — aktuell werden KPIs schon über `[data-kpi]` befüllt, das sollte out-of-the-box funktionieren).
4. Sticky-Verhalten per `position: sticky; top: var(--hz-header-h);` im Scope `.hz-scope`.

### 5b — Leistungsdiagramm (Chart.js)

Ziel: Interaktives Liniendiagramm, das WP-Kennlinie(n) gegen Gebäude-Heizkennlinie plottet. Schnittpunkt = Bivalenzpunkt. Hilft bei der Modellwahl.

Empfohlen:
- **X-Achse:** Aussentemperatur (z. B. −15 °C bis +15 °C).
- **Y-Achse:** Leistung in kW.
- **Linien:**
  - Gebäude-Heizkennlinie: linear von `(θne, Qhl)` bis `(θGT, 0)`, wobei `θGT` = Heizgrenztemperatur (z. B. 12 °C).
  - WP-Kennlinie(n): aus einem Katalog oder vom User eingegebene (θamb, Pheiz)-Punkte. Für Phase 5 reicht **eine** handeingegebene WP-Kurve (Platzhalter-Daten), spätere Erweiterung via Hersteller-JSON.
- **Marker:** Auslegungspunkt (θne | Qh), Bivalenzpunkt (falls Schnittpunkt mit WP-Kurve existiert).

Dependency: `chart.js@^4` via `npm install chart.js`.

Umsetzung:
1. `npm install chart.js` im Projekt-Root.
2. Neue Komponente `src/components/heizlast/LeistungsDiagramm.astro` mit `<canvas>` und Inline-`<script>`.
3. Script importiert Chart.js dynamisch im Client-Scope, subscribet `heizlastCompute` und `heizlastState`, baut Datasets neu bei Änderungen.
4. WP-Kennlinien-Eingabe: zunächst statisch (z. B. 3 Modelle mit je 3 Punkten als JSON im State unter `uiState.chartModels`). Später CMS-/Hersteller-gestützt.
5. Einbinden idealerweise zwischen Sektion 5 (Auslegung) und Sektion 6 (Speicher), oder als eigener Abschnitt "05a Leistungsdiagramm".

### 5c — Polish

- Scroll-Spy / Mini-TOC am rechten Rand (Desktop) für die 7 Sektionen — optional, nice-to-have.
- Responsives Verhalten der Executive Summary auf Mobile prüfen.
- Dark-Text auf dunklen Flächen vermeiden (Kontrast-Check).

---

## Was NICHT in Phase 5 gehört
- Login-Modal & Cloud-Save-Flow → Phase 6.
- PDF-Export → Phase 6.
- Hersteller-Kennlinien aus Sanity → spätere Phase.
- Testing & Deploy-Check → Phase 7.

---

## Dateien, die Phase 5 anfassen wird
- `src/pages/heizlast.astro` (ExecutiveSummary einbinden, Chart-Mount)
- `src/components/heizlast/ExecutiveSummary.astro` (NEU)
- `src/components/heizlast/LeistungsDiagramm.astro` (NEU)
- `src/layouts/HeizlastLayout.astro` (ggf. Sticky-Offset-Token)
- `package.json` (chart.js)
- `CLAUDE.md` (Phase-5-Block dokumentieren)
- `HANDOFF-PHASE-6.md` (NEU, am Ende von Phase 5)

---

## Arbeitsweise (Erinnerung für Claude)
- Git-Pfad: `C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe`, Shell **cmd**.
- Commit-Msg via `write_file` in `commitmsg.txt` → `git commit -F commitmsg.txt`.
- Bei Struktur-Änderungen: CLAUDE.md MUSS mitgepflegt werden.
- Antworten knapp, keine Task-Auflistung nach Erledigung, keine Emojis in UI.
