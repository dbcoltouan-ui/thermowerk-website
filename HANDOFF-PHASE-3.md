# Handoff — Heizlast-Redesign, Phase 3 (State + Storage)

> **Für die neue Claude-Session:** Phasen 1 (Rechenkern, 49 Tests grün) und 2 (UI-Grundlagen) sind abgeschlossen und committed. Dieses Dokument übergibt den Stand und definiert den Auftrag für Phase 3.

## Was bereits gebaut ist

### Phase 1 — Rechenkern
```
src/lib/heizlast/
├── types.ts          ← TypeScript-Interfaces
├── constants.ts      ← FWS-Tabellen
└── calculations.ts   ← Pure Rechenfunktionen

scripts/test-heizlast.ts   ← 49 Tests, alle grün
reference/BEISPIELRECHNUNG.md
```

**Testlauf:** `node --experimental-strip-types scripts/test-heizlast.ts` (Node 22.6+). Kritischer Referenzwert: FWS-Aufgabe 2 → Qhl = 12.55 kW.

### Phase 2 — UI-Primitives
```
src/layouts/HeizlastLayout.astro        ← Layout mit schlankem Header/Footer
src/components/heizlast/
├── SectionWrapper.astro                ← Sektionsrahmen (Kicker, Titel, Subline, tone)
├── InfoBox.astro                       ← Aufklappbare Info-Box, Blue-tint, Icon-Varianten
├── KpiCard.astro                       ← Default + Hero Variante
├── OverrideField.astro                 ← Input mit Stift-Icon, Reset-Pfeil
└── Toggle.astro                        ← Pill-Chip +/- für optionale Module

src/pages/heizlast-sandbox.astro        ← Visuelle Abnahme-Seite (in Phase 4 löschen)
```

**Wichtig:**
- CSS-Tokens sind im `:root` des Layouts als `--hz-*` definiert und per `.hz-scope`-Klasse isoliert. Nichts an diesen Variablen ohne User-Rücksprache ändern.
- `OverrideField` und `Toggle` haben je einen delegierten Click-Handler (`window.__hzOvrBound`, `window.__hzToggleBound`), der sich pro Seite genau einmal bindet. Bei Server-Side-Rendering in Phase 4 nicht verdoppeln.
- Die Sandbox-Seite ist nur intern. Nicht in der Navigation verlinken.

## Auftrag Phase 3

State-Management und Persistierung für den Rechner. **Noch keine Sektionen bauen** — nur die Datenschicht, damit Phase 4 die Sektionen einfach anstecken kann.

### Liefer-Scope Phase 3
1. `src/lib/heizlast/state.ts` — State-Store (vorgeschlagen: **Nano Stores**, `@nanostores/astro`). Hält alle Eingabewerte, Override-Zustände und abgeleiteten Rechenergebnisse. Typisiert via `types.ts`.
2. `src/lib/heizlast/storage.ts` — LocalStorage-Schicht (Serialisierung in JSON, Versionierung, Migration). Key: `thermowerk.heizlast.state.v1`.
3. `src/lib/heizlast/projects.ts` — Cloud-Projekt-Sync via die bestehende Function `functions/api/heizlast-projects.js` (bereits deployed, authentifiziert über `HEIZLAST_PASSWORD`-Cookie). Nur aktiv wenn `body.is-auth` gesetzt ist.
4. `src/lib/heizlast/compute.ts` — Derived-Store, der bei jeder State-Änderung `calculations.ts`-Funktionen in korrekter Cascade-Reihenfolge aufruft (M1→M2→M4→M3→M5→M6→M7→M8→M9) und ein einheitliches `CalcResult`-Objekt produziert.
5. Integration ins `heizlast-sandbox.astro`: ein kleines Demo-Feld binden, um zu zeigen dass Store-Änderungen persistiert werden und `KpiCard`s live mitrechnen.

### NICHT in Phase 3
- Keine Sektionen 1–7 (Phase 4).
- Kein Login-Modal, kein Export (Phase 6).
- Kein Chart.js (Phase 5).

## Erste Schritte

1. Dieses Dokument, dann `CLAUDE.md`, `HANDOFF-HEIZLAST-REDESIGN.md`, `HANDOFF-PHASE-2.md` lesen.
2. Rechenkern verifizieren: `node --experimental-strip-types scripts/test-heizlast.ts` → 49 grün.
3. Sandbox lokal öffnen (`npm run dev` → `/heizlast-sandbox`) um die Primitives zu sehen.
4. **Vor dem Bauen** die Store-Strategie kurz mit Daniel abstimmen via `AskUserQuestion`. Mindestens diese Frage: „Nano Stores als Dependency hinzufügen oder lieber Vanilla-Observer-Pattern?"
5. Nach jedem Schritt Testkern laufen lassen — darf durch Store-Änderungen nicht brechen.
6. Am Phasen-Ende: `CLAUDE.md` updaten, `HANDOFF-PHASE-4.md` schreiben, committen + pushen.

## Offene Fragen für Daniel

Stellen bei Start der neuen Session:
- **State-Library:** Nano Stores (empfohlen, ~1kb, funktioniert in Astro Islands) vs. Vanilla-Observer (keine Dependency, mehr Code)?
- **Projekt-Ladezustand:** Beim Login sollen automatisch die Cloud-Projekte geladen werden (Liste) oder erst nach Klick auf „Projekt öffnen"?
- **Mehrere parallele Projekte:** Braucht es einen Projekt-Switcher im Header, oder immer „ein aktives Projekt" mit Laden/Speichern-Modal?
- **LocalStorage-Kollision mit alter Version:** Der bisherige Rechner nutzt einen eigenen Key. Migration anbieten oder neuen Key verwenden und alten ignorieren?

## Design-Prinzipien (bleiben gültig)

- **Visuelle Richtung:** technisch-klar, nicht überladen. Navy/Rot nur als Akzent.
- **Progressive Disclosure:** Defaults sichtbar, Override per Stift-Icon. Optionale Module mit Pill-Chip zu-/wegschalten. Keine offenen leeren Felder.
- **Zwischenergebnisse** dezent in der jeweiligen Sektion, Executive Summary am Ende mit `variant="hero"`.
- **Konsistenz zur Website:** Farben, Fonts, Spacing — alle im `.hz-scope`-Stylesheet des Layouts definiert.
- **Sprache:** Deutsch (Schweiz), professionell, keine „Du"-Anrede, keine Emojis in UI-Texten.

## Kommunikationsstil (Daniel)

- **Knapp antworten.** Keine Task-Listen nach Erledigung.
- Bei Design-Entscheidungen: `AskUserQuestion` mit 2–3 Optionen, Empfehlung an Position 1.
- Bei Unsicherheit: fragen, nicht raten.

## Bekannte Fallstricke

- **`.ts` in Imports:** Module in `src/lib/heizlast/` importieren sich gegenseitig mit expliziter `.ts`-Endung (für Node-Testlauf). Nicht entfernen.
- **CSS-Scope in Astro:** `<style>` ist scoped. Komponentenübergreifende Regeln via `<style is:global>` im Layout.
- **Astro Islands:** State-Stores, die im Browser laufen müssen, brauchen `client:load` oder `client:visible` auf der einbettenden Komponente.
- **`npx astro check` funktioniert nicht in der Linux-Sandbox** (rollup-native für Windows installiert). Auf Cloudflare läuft der Build problemlos.
- **Commit-Flow:** siehe `CLAUDE.md` — commit-message via `write_file("commitmsg.txt", …)` + `git commit -F commitmsg.txt`, git-Pfad `C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe`, Shell `cmd`.

---

*Phase 2 abgeschlossen: 2026-04-16 · Version 1.0*
