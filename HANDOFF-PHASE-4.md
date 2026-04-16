# Handoff — Heizlast-Redesign, Phase 4 (Sektionen 1–7 bauen)

> **Für die neue Claude-Session:** Phasen 1 (Rechenkern, 49 Tests grün), 2 (UI-Primitives) und 3 (State + Storage, 16 weitere Tests grün) sind abgeschlossen, committed und auf GitHub. Dieses Dokument übergibt den Stand und definiert den Auftrag für Phase 4.

## Copy-Paste-Prompt für den neuen Chat

```
Hallo Claude.
Wir arbeiten am Heizlastrechner-Redesign fuer thermowerk.ch/heizlast.
Phase 1 (Rechenkern, 49 Tests), Phase 2 (UI-Primitives) und
Phase 3 (State + Storage + Compute, 16 weitere Tests) sind fertig,
auf GitHub, alle Tests gruen.
Jetzt starten wir Phase 4: die sichtbaren Sektionen des Rechners.

Lies bitte in dieser Reihenfolge:
  1. HANDOFF-PHASE-4.md            (Scope und Uebergabe fuer Phase 4)
  2. CLAUDE.md                     (Projekt-Architektur, aktueller Stand)
  3. HANDOFF-HEIZLAST-REDESIGN.md  (Gesamt-Vision, Informations-Architektur)
  4. HANDOFF-PHASE-3.md            (was in Phase 3 gebaut wurde)

Verifiziere dann beide Testlaeufe:
  node --experimental-strip-types scripts/test-heizlast.ts        (49 Tests)
  node --experimental-strip-types scripts/test-heizlast-state.ts  (16 Tests)
Erwartet: beide gruen.

Oeffne dann /heizlast-sandbox im Browser. Dort ist unter "07 / Phase 3 —
State live" zu sehen, wie Input <-> Store <-> Compute <-> KpiCard
zusammenwirken. Diese Sandbox wird am Ende von Phase 4 entfernt.

Stell mir die Fragen zur Sektions-Architektur aus HANDOFF-PHASE-4.md
via AskUserQuestion. Danach erst bauen.

Alle Aktionen (Git, Commits, Pushes) selbststaendig via Desktop
Commander. Knappe Antworten. Keine Task-Aufzaehlungen nach Erledigung.
Danke.
```

## Was bereits gebaut ist

### Phase 1 — Rechenkern (unverändert)
```
src/lib/heizlast/
├── types.ts
├── constants.ts
└── calculations.ts
scripts/test-heizlast.ts   (49 Tests)
```

### Phase 2 — UI-Primitives (unverändert)
```
src/layouts/HeizlastLayout.astro
src/components/heizlast/
├── SectionWrapper.astro
├── InfoBox.astro
├── KpiCard.astro
├── OverrideField.astro
└── Toggle.astro
src/pages/heizlast-sandbox.astro   (temporär, in Phase 4 entfernen)
```

### Phase 3 — State + Storage + Compute (NEU)
```
src/lib/heizlast/
├── state.ts        ← Nano-Stores-Haupt-Store `heizlastState`, UI-Stores
├── storage.ts      ← localStorage, Boot + Debounced Auto-Save
├── projects.ts     ← Cloud-Sync via /api/heizlast-projects
└── compute.ts      ← runCascade() + reaktiver `heizlastCompute`-Store

scripts/test-heizlast-state.ts   (16 Integrations-Tests)
```

**Dependency:** `nanostores@^1.2` ist installiert. `@nanostores/persistent@^1.3` ist ebenfalls installiert, wird aber aktuell noch nicht genutzt (Reserve).

**Kritisch:** Die Cascade in `compute.ts` ruft bei der Verbrauchsmethode `qnwwJahr()` für den WW-Abzug (mit den Verlust-Faktoren aus `state.warmwasser`). Wenn in Phase 4 die WW-Sektion gebaut wird, muss sichergestellt sein, dass `speicherProzent/zirkProzent/ausstossProzent` korrekt gesetzt werden — sonst bricht die FWS-Validierung ein.

## Auftrag Phase 4

Die sieben Sektionen des Rechners gemäss Informations-Architektur aus
`HANDOFF-HEIZLAST-REDESIGN.md` Abschnitt 6, jeweils auf Basis der Phase-2-Primitives
und an den Phase-3-State gebunden. Ziel: ein funktional vollständiger Rechner
ohne Executive Summary und ohne Chart.js (das kommt in Phase 5).

### Liefer-Scope Phase 4

1. **`src/pages/heizlast.astro`** — neue Haupt-Seite, rendert die sieben Sektionen unter
   `HeizlastLayout`. Importiert und mountet die Nano-Stores client-seitig.
2. **`src/components/heizlast/sections/`** — eine Astro-Komponente pro Sektion:
   - `Section1Gebaeude.astro` (M1)
   - `Section2Heizlast.astro` (M2 + optional M4, M3)
   - `Section3Warmwasser.astro` (M5)
   - `Section4Zuschlaege.astro` (M6, optional Qas)
   - `Section5Auslegung.astro` (M7 als Ergebnis-Block)
   - `Section6Speicher.astro` (M8 + M9 nebeneinander als zwei Karten)
   - `Section7Projekt.astro` (Projektname, Kunde, Adresse, Notizen, Speichern/Laden-Buttons)
3. **Binding-Infrastruktur:** kleine Helper in `src/lib/heizlast/bindings.ts` oder inline — Two-Way-Binding
   zwischen HTML-Inputs und `heizlastState` (Event-Delegation ist schon bewährt, siehe OverrideField/Toggle).
4. **Dezente Zwischen-KPIs** pro Sektion via `KpiCard` (Default-Variante), alle aus `heizlastCompute` abonniert.
5. **Sandbox entfernen** (`src/pages/heizlast-sandbox.astro`).
6. **Unveränderlich:** Der Rechenkern (`calculations.ts`) und `state.ts`/`compute.ts` bleiben intakt.
   Bei Bedarf dürfen Typen erweitert werden, aber keine breaking Changes.

### NICHT in Phase 4

- Keine Executive Summary (Phase 5).
- Kein Chart.js / Leistungsdiagramm (Phase 5).
- Kein Login-Modal (Phase 6).
- Kein PDF-Export (Phase 6).

## Erste Schritte für die neue Session

1. Dokumente in Reihenfolge lesen (siehe Prompt oben).
2. Beide Testläufe laufen lassen — müssen grün sein.
3. Die Sandbox-Sektion "07 / Phase 3 — State live" im Browser anschauen; sie zeigt das
   gewünschte Binding-Muster (Input → Store → Compute → KpiCard).
4. Klärungsfragen via `AskUserQuestion` stellen (siehe unten). Erst nach Sign-Off bauen.
5. Nach jeder Sektion: beide Testläufe erneut — Rechenkern darf nicht brechen.
6. Am Phasen-Ende: `CLAUDE.md` updaten, `HANDOFF-PHASE-5.md` schreiben, committen + pushen.

## Offene Fragen für Daniel

1. **Layout der sieben Sektionen:** Alle untereinander auf einer einzigen Seite (Long-Scroll, Keynote-Folien-Gefühl),
   oder Tab-Navigation oben (1/7, 2/7, …) mit schrittweiser Navigation?
2. **Projekt-Metadaten (Name, Kunde, Adresse):** gleich in Sektion 1 oben, oder als
   separate Sektion 7 ganz unten (vor dem Export)?
3. **Sichtbarkeit aller Methoden in M2:** Alle 5 Methoden (Verbrauch/Messung/Bstd/Bauperiode/Override) via
   Tab-Reiter immer sichtbar, oder nur die gewählte Methode ausgeklappt?
4. **Plausibilitäts-Ampel M3:** Als grosses Farbband in der Sektion (grün/gelb/rot über volle Breite)
   oder dezent als Badge in der KpiCard?

## Design-Prinzipien (bleiben gültig)

- **Visuelle Richtung:** technisch-klar, nicht überladen. Navy/Rot nur als Akzent.
- **Progressive Disclosure:** Defaults sichtbar (OverrideField), optionale Module via Toggle.
- **Zwischenergebnisse** dezent in der jeweiligen Sektion.
- **Konsistenz zur Website:** alles über `.hz-scope` CSS-Variablen.
- **Sprache:** Deutsch (Schweiz), keine „Du"-Anrede, keine Emojis in UI.

## Kommunikationsstil (Daniel)

- **Knapp antworten.** Keine Task-Listen nach Erledigung.
- Bei Design-Entscheidungen: `AskUserQuestion` mit 2–4 Optionen, Empfehlung an Position 1.
- Bei Unsicherheit: fragen, nicht raten.

## Bekannte Fallstricke

- **Mount-Sync (Windows ↔ Linux):** Write-Tool auf `C:\Users\Daniel\Documents\thermowerk-website\...` wird manchmal
  mit Verzögerung vom Linux-Workspace (`/sessions/.../mnt/`) sichtbar. Wenn ein Node-Testlauf mit „Expected '}', got '<eof>'"
  bricht, ist das fast immer eine Mount-Lag. Workaround: Datei direkt via `mcp__workspace__bash`/`cat > ...` schreiben.
- **Nano Stores Import:** In Astro-Komponenten können Stores nur im `<script>`-Block (client-seitig) konsumiert werden.
  SSR-Rendering kann die Defaults aus `createDefaultState()` verwenden — hydratisiert wird beim Boot.
- **`.ts`-Extensions in Imports:** Module in `src/lib/heizlast/` importieren sich gegenseitig mit expliziter `.ts`-Endung
  (damit der Node-Testlauf ohne Bundler funktioniert). Nicht entfernen.
- **CSS-Scope in Astro:** `<style>` ist scoped. Komponentenübergreifende Regeln in `<style is:global>` im Layout.
- **Commit-Flow:** siehe `CLAUDE.md` — commit-message via `write_file("commitmsg.txt", …)` + `git commit -F commitmsg.txt`,
  git-Pfad `C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe`, Shell `cmd`.

---

*Phase 3 abgeschlossen: 2026-04-17 · Version 1.0*
