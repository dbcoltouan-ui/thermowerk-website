# HANDOFF — Heizlast-Rechner: Funktionsfix nach v2-Port

> **Copy-Paste-Prompt für den nächsten Chat (alles unterhalb des Trennstrichs kopieren):**

---

Du übernimmst den Heizlast-Rechner von einem vorigen Chat. Der v2-Port (Phase 10) hat das Layout sauber aus dem Mockup übernommen, **aber auf `/heizlast` läuft keine einzige Funktion**: Eingaben werden nicht in den Store geschrieben, Tvoll füllt sich nicht automatisch bei Lage-Auswahl, das Zimmer-Hinzufügen klappt nicht, keine Rechenergebnisse, der Projektname läuft nicht live in den Header, Save/Load-Buttons tauchen nicht auf. Das Layout sieht aber richtig aus und die Seite baut ohne Build- oder TS-Fehler (Astro baut clean, Script landet im Bundle).

Vor dem v2-Port (Phasen 1–9) lief alles — Rechenkern, Bindings, Compute, Save, Projekt-Liste, Export. Die Logik hat sich nicht geändert, nur die UI-Komponenten sind aus `src/components/heizlast/` nach `src/components/heizlast-v2/` umgezogen. Es ist also **keine Logik kaputt, sondern eine Verdrahtung**.

## Was du als erstes machst

1. **Lies nur das Nötigste:**
   - `HANDOFF-HEIZLAST-FUNKTIONSFIX.md` (diese Datei, du liest ja gerade den Prompt daraus)
   - `CLAUDE.md` — die Abschnitte „Phase 4: Komplette UI" und „Phase 10 / Block 3" (Suchbegriff: `Phase 10`)
   - `src/pages/heizlast.astro` (die Glue-Datei, ~990 Zeilen)
   - `src/lib/heizlast/bindings.ts` (Two-Way-Binding)
   - `src/lib/heizlast/state.ts` (Store + Defaults, nur Exporte+Signaturen überfliegen)
   - `src/lib/heizlast/compute.ts` (nur `runCascade` + `heizlastCompute` anschauen)
   - Eine v2-Section als Referenz: `src/components/heizlast-v2/sections/Section1Gebaeude.astro`

2. **Finde die Runtime-Ursache live im Browser.** Build ist grün, also ist es ein JS-Runtime-Error beim Modul-Init, der die ganze Glue-Kette kippt. Typische Kandidaten:
   - Import auf Pfad, der im v2-Port nicht mehr existiert (alte `../components/heizlast/...` Referenz)
   - `querySelector`-Selector, der in der v2-Markup anders heisst als in der Glue-JS
   - `data-hz-bind`-Pfad im v2-Markup, der im Store nicht (mehr) existiert
   - Eine Helper-Funktion wird in `renderAll()` aufgerufen, bevor sie definiert ist
   - `bootBindings()` wird nicht aufgerufen oder wirft beim ersten DOM-Scan

   Wenn du Chrome-MCP hast: lade `https://thermowerk.ch/heizlast` und lies `console.log`/`console.error` — der erste Error zeigt die Zeile. Wenn nicht: `npm run build` lokal und die gebaute `_astro/heizlast.*.js` mit dem Source nebeneinander anschauen.

3. **Prüf die Selektor-Map** zwischen Glue-JS und v2-Markup. Die Glue erwartet u.a.:
   - `[data-hz-bind="projectName"]` (Section 1, Projektname-Input) → Live-Header
   - `[data-hz-bind="gebaeude.lage"]` (Section 1, Lage-Select) → triggert `resolveDefault('gebaeude.tvoll')`
   - `[data-hz-raum-list]` (tbody der Zimmer-Tabelle)
   - `[data-hz-action="add-raum"]`, `[data-hz-action="apply-zimmer"]`, `[data-hz-action="toggle-zimmer"]`
   - `[data-kpi="qh"]`, `[data-kpi="qhlKorr"]`, `[data-kpi="plausi"]`, `[data-kpi="wwSpeicher"]`, `[data-kpi="puffer"]`
   - `[data-hz-sum="projectName"]`, `[data-hz-sum="ebf"]`, …
   - `body.is-auth` + `[data-hz-auth-only]` (Save/Open/Export-Buttons sollen **ohne Auth nicht** verschwinden — die sollten als „Anmelden"-Prompt sichtbar sein, war vor dem Logo-Fix noch so)
   - `.hz-save-status`, `.hz-save-status.is-flash`
   - `[data-ampel]` auf der Plausi-Kachel

   Wenn auch nur **einer** dieser Selektoren im v2-Markup anders heisst (z.B. die Mockup-HTML nutzt `data-bind` statt `data-hz-bind`, oder `.kpi-value` statt `[data-kpi]`), greift nichts.

4. **Acceptance-Kriterien nach dem Fix:**
   - Projektnamen in Section 1 tippen → Header-Text „Thermowerk · <name>" ändert sich live.
   - Lage „Höhenlage" auswählen → Tvoll-Feld zeigt sofort den neuen Default-Wert.
   - Zimmer hinzufügen → Länge/Breite eintippen → Summe aktualisiert → „In EBF übernehmen" schreibt in EBF.
   - FWS-Aufgabe 2 eingeben (EBF 180, Bauperiode 1980–2000, Verbrauch Öl 2800 L/a, Standard-Profile) → **Qhl ≈ 12.55 kW** in der KPI-Kachel.
   - Plausi-Kachel zeigt Ampel (grün/gelb/rot).
   - Save/Open/Export-Buttons sichtbar (disabled solange nicht eingeloggt, aber sichtbar — **nicht** via `display: none` versteckt).
   - Reload → eingegebene Werte bleiben (localStorage funktioniert).

5. **Wenn der Fix klein ist** (ein Selektor, ein Import, eine Reihenfolge) → sofort fixen, Tests laufen lassen, committen.
   **Wenn mehrere Selektoren kaputt sind** → erst Mapping-Tabelle erstellen („Glue erwartet X, v2-Markup hat Y"), dann in einem Rutsch die v2-Komponenten angleichen (nicht die Glue umschreiben — die funktionierte in Phase 4–9).

## Tests und Commit

- `C:\Progra~1\nodejs\node.exe --experimental-strip-types scripts/test-heizlast.ts` → 49 grün
- `C:\Progra~1\nodejs\node.exe --experimental-strip-types scripts/test-heizlast-state.ts` → 43 grün (oder wie gehabt 49+33, die Zahl der State-Tests schwankt zwischen Sessions)
- Commit per Desktop Commander in cmd (Git-Pfad und commitmsg.txt-Pattern siehe `CLAUDE.md` → „Standard-Workflow für Commits").

## Was du dem User NICHT tun sollst

- Keine langen Erklärungen „was du tun wirst". Dan will knappe Antworten auf Deutsch (Schweiz), nur bei Entscheidungen elaborieren.
- Keine Auflistungen von Änderungen in der Antwort, nur wenn er auswählen muss.
- Kein „vielleicht ist es X, probier mal"-Ping-Pong. Live im Browser nachschauen oder im Code finden, dann fixen.
- Nicht die Glue-JS als Ganzes umbauen. Die hat in Phase 4–9 funktioniert. Fehler liegt fast sicher an einem (oder wenigen) v2-Markup-Selektor(en) oder einem fehlenden Import.

## Kontext zum Schluss

Dan ist Max-Plan-User und stösst immer wieder an Session-Limits. **Lies nur was du brauchst**, nicht jede Phase-Doku. Die Handoff-Dateien `HANDOFF-PHASE-*.md` im Projekt-Root sind **alte** Phasen und nur bei konkretem Bedarf relevant. Diese Datei hier ist die einzige aktuelle.
