# Handoff — Heizlast-Redesign, Phase 2 (UI-Grundlagen)

> **Für die neue Claude-Session:** Phase 1 (Rechenkern) ist abgeschlossen und getestet. Dieses Dokument übergibt den Stand und definiert den Auftrag für Phase 2.

## Was bereits gebaut ist (Phase 1)

```
src/lib/heizlast/
├── types.ts          ← TypeScript-Interfaces (CalcResult, CalcStep, Gebaeudetyp, …)
├── constants.ts      ← FWS-Tabellen (BRENNWERTE, VOLLASTSTUNDEN, BAUPERIODEN, …)
└── calculations.ts   ← Pure Rechenfunktionen (qnAusVerbrauch, qhlAusQn, qoff, qw, …)

scripts/test-heizlast.ts   ← Regressions- und Verifikationstests (49 Assertions)
reference/BEISPIELRECHNUNG.md   ← „Referenzhaus Moosseedorf" als Hand-nachrechenbares Beispiel
```

**Testlauf:**
```bash
cd C:\Users\Daniel\Documents\thermowerk-website
node --experimental-strip-types scripts/test-heizlast.ts
```
Erwartete Ausgabe: „Alle Tests erfolgreich." mit 49 bestandenen Tests. Kritischer Referenzwert: **FWS-Aufgabe 2 → Qhl = 12.55 kW**.

**Wichtig:** `tsconfig.json` wurde um `allowImportingTsExtensions: true` und `noEmit: true` ergänzt, damit Imports mit `.ts`-Extension sowohl in Astro als auch im Node-Testskript funktionieren. Alle Imports in `src/lib/heizlast/` nutzen explizite `.ts`-Extensions.

## Auftrag Phase 2

Die Design-Grundlagen und wiederverwendbaren UI-Primitives für den neuen Heizlast-Rechner. **Noch keine Sektionen bauen** — nur das Gerüst, damit Phase 4 später daraufsitzen kann.

### Liefer-Scope Phase 2
1. `src/layouts/HeizlastLayout.astro` — eigenes Layout (keine Site-Nav, schlanker Header mit Logo + Login-Button oben rechts, Footer minimal)
2. `src/components/heizlast/InfoBox.astro` — aufklappbares Info-Panel („Was ist das?", „Abkürzungen erklärt"), Blue-tint-Background (`#E8EDF5`), Accordion-Pattern
3. `src/components/heizlast/KpiCard.astro` — wiederverwendbare KPI-Kachel für Zwischenergebnisse (dezent) und Executive Summary (Hero)
4. `src/components/heizlast/SectionWrapper.astro` — Standard-Sektionsrahmen mit Label (rot, caps), Überschrift, optionale Subline, Inhaltsbereich, abwechselnder Hintergrund
5. `src/components/heizlast/OverrideField.astro` — Input-Feld mit kleinem „Überschreiben"-Icon; Default-Wert aus Konstanten sichtbar, per Klick auf Icon manuell veränderbar. Kernprinzip des ganzen UIs: **jeder vordefinierte Wert ist überschreibbar** (User-Anforderung).
6. `src/components/heizlast/Toggle.astro` — kleiner „+ hinzufügen / − entfernen"-Chip zum Zuschalten optionaler Module (M4 Sanierung, M3 Plausi, Qas, etc.). Startzustand: eingeklappt. **Nie leere Felder offen liegen lassen** (User-Anforderung „eines nach dem anderen Zuschalt- und wegschaltbar").
7. Globale CSS-Tokens in `src/layouts/HeizlastLayout.astro` (Navy, Rot, Off-White, Border, Fonts) — konsistent zur Website (`src/layouts/Layout.astro` als Vorlage).

### NICHT in Phase 2
- Keine Sektionen 1–7 (Gebäude, Heizlast, WW, …) — das ist Phase 4.
- Kein State-Management (das ist Phase 3).
- Kein Login-Modal, kein Export (das sind Phasen 6).

## Erste Schritte für die neue Session

1. **Dieses Dokument lesen**, dann `CLAUDE.md` und `HANDOFF-HEIZLAST-REDESIGN.md`.
2. Testkern verifizieren: `node --experimental-strip-types scripts/test-heizlast.ts` — muss grün sein.
3. Orientierung an der bestehenden Website-CI:
   - `src/layouts/Layout.astro` (CSS-Variablen, Buttons, Sektionen)
   - `src/components/Calculator.astro` (wie Rechner-UI bei Thermowerk aussieht)
   - `src/components/Services.astro` / `Steps.astro` / `About.astro` (Sektions-Pattern)
4. **Vor dem Bauen 2–3 Skizzen/Optionen für die UI-Primitives präsentieren** (besonders InfoBox, OverrideField, Toggle). AskUserQuestion nutzen. Nicht alleine entscheiden.
5. Nach jeder Primitive: kurz in einer `/heizlast-sandbox.astro`-Seite (temporär, wird später gelöscht) visuell prüfen.
6. Testkern am Ende nochmal laufen lassen — darf durch UI-Änderungen nicht brechen (die Tests importieren aus `src/lib/heizlast/`).
7. Am Phasen-Ende: `CLAUDE.md` updaten, `HANDOFF-PHASE-3.md` schreiben, committen + pushen.

## Design-Prinzipien (aus Handoff + Chat mit Daniel)

- **Visuelle Richtung:** technisch-klar, nicht überladen. Keynote-/PowerPoint-Niveau.
- **Progressive Disclosure:** Defaults sichtbar, Override per kleinem Icon. Optionale Module zugeklappt mit kleinem „+" zum Zuschalten. Keine offenen leeren Felder.
- **Zwischenergebnisse** dezent in der jeweiligen Sektion — nicht als dominante Hero-Werte.
- **Executive Summary** am Ende — dort darf es gross sein.
- **Konsistenz zur Website:** gleiche Farben (Navy `#1B2A4A`, Rot `#D93025`, Off-White `#F7F8FA`), gleiche Fonts (Outfit, DM Sans, Montserrat), gleiche Spacing-Regeln.
- **Sprache:** Deutsch (Schweiz), professionell, keine „Du"-Anrede, keine Emojis in UI-Texten.

## Kommunikationsstil (User-Präferenz)

- **Knapp antworten.** Keine Auflistung erledigter Tasks. Keine „Ich habe folgendes gemacht:"-Aufzählungen.
- Bei Design-Entscheidungen: `AskUserQuestion` mit 2–3 Optionen.
- Bei Unsicherheit: fragen, nicht raten.
- Bei Auswahlmöglichkeiten: kurz Vor- und Nachteile, dann Empfehlung.

## Bekannte Fallstricke

- **`.ts` in Imports:** Die bestehenden Module in `src/lib/heizlast/` importieren sich gegenseitig mit expliziter `.ts`-Endung. Das ist Absicht (wegen Node-Testlauf). Nicht entfernen.
- **CSS-Scope in Astro:** `<style>` ist scoped. Für komponentenübergreifende Regeln `<style is:global>` im Layout verwenden.
- **Google Fonts Timing:** DOM-Messungen erst nach `document.fonts.ready`.
- **Commit-Flow:** siehe `CLAUDE.md` — commit-message via `write_file("commitmsg.txt", …)` + `git commit -F commitmsg.txt`, git-Pfad `C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe`, Shell `cmd`.

---

*Phase 1 abgeschlossen: 2026-04-16 · Version 1.0*
