# Handoff — Phase 9 / Bundle 2 (Blöcke L + M + M1 + M2)

## Copy-Paste-Prompt für neuen Chat

```
Du übernimmst am Heizlastrechner-Redesign (thermowerk-website).

Aktueller Stand (2026-04-17): Phase 9 / Bundle 1 (Blöcke F–K) ist fertig
und auf main. Tests 49 + 33 grün. Commits einzeln pro Block. Projektordner
C:\Users\Daniel\Documents\thermowerk-website.

Deine Aufgabe: Phase 9 / Bundle 2 — Blöcke L, M1, M2, M. Brief in
HANDOFF-PHASE-15.md (ganz oben dieser Prompt, dann die Blöcke mit Code-
Pointern und Akzeptanzkriterien). Ausführliche Original-Briefs stehen in
HANDOFF-PHASE-9.md unter den gleichen Überschriften.

Reihenfolge zwingend:
  1. Block L — Notizen-Block schlanker (Badge raus, Icon wenn gefüllt,
     Export-Checkboxen zentralisiert).
  2. Block M1 — Desktop-Breite reduzieren (fluid & symmetrisch via
     --hz-container-max + clamp-Typografie).
  3. Block M2 — Feldbreiten intrinsisch, 12-Spalten-Grid-Leitlinien.
  4. Block M — Mobile-Polish (Worttrennung + Logo-Proportionen +
     "Thermowerk"-Text raus).

Regeln:
  - Je Block **ein Commit** auf main (`git add -A && git commit -F
    commitmsg.txt && git push`).
  - Tests nach jedem Block laufen lassen:
    `C:\Progra~1\nodejs\node.exe --experimental-strip-types
    scripts/test-heizlast.ts` → 49 grün
    `C:\Progra~1\nodejs\node.exe --experimental-strip-types
    scripts/test-heizlast-state.ts` → 33 grün
  - Kein Mass-Refactor. Was in Block L/M steht, kommt in Block L/M —
    nichts vorziehen.
  - Commit-Workflow strikt Desktop Commander cmd (NIE Linux-bash für
    Git); bei `index.lock`-Hang: PowerShell `Remove-Item -Force`.
  - FUSE-Mount-Drift möglich — bei Bedarf
    `git update-index --refresh` im Linux-Bash.
  - Knapp antworten, keine Aufzählungen — nur bei Entscheidungsfragen
    nachhaken.

Nach allen vier Blöcken:
  - `HANDOFF-PHASE-16.md` schreiben (falls neue Phase 10 folgt oder
    Deploy-Abnahme ansteht).
  - CLAUDE.md um Einträge "Phase 9 / Block L|M1|M2|M abgeschlossen"
    ergänzen.
  - Optional: Safety-Tag `pre-content-polish` vor Bundle 3 setzen.

Zuerst lesen (in Reihenfolge):
  1. CLAUDE.md (Root)
  2. HANDOFF-PHASE-15.md (dieser Brief)
  3. HANDOFF-PHASE-9.md → Abschnitte "Block L", "Block M1", "Block M2",
     "Block M" (ausführliche Originale mit Pointern).
  4. src/layouts/HeizlastLayout.astro (Tokens, Container, Mobile-Block).
  5. src/components/heizlast/SectionNotes.astro +
     src/lib/heizlast/state.ts (`NotizenState`, `SectionNote`).
  6. src/components/heizlast/ExportModal.astro +
     src/lib/heizlast/export.ts.

Erste konkrete Schritte Block L:
  - `SectionNote.includeInExport` aus state.ts entfernen (Typ + Defaults
    + setter). Migration v1→v1 in storage.ts: Feld ignorieren.
  - Neuen Slot `notizen.projekt: SectionNote` ergänzen (wenn gewünscht —
    alternativ sektion7 übernimmt es).
  - SectionNotes.astro: `.hz-note__badge` entfernen, stattdessen kleines
    Navy-Icon (info/Kreis) nur sichtbar wenn `text.length > 0`.
  - ExportModal.astro: Checkboxen `notizenBereiche` + `notizenProjekt`
    ergänzen (Fieldset "Inhalt"). Alte Checkbox `notizen` ersetzen oder
    umdefinieren (= Bereiche).
  - export.ts: Print-Body-Klassen entsprechend setzen
    (`hz-print-notizen-bereiche-on`, `hz-print-notizen-projekt-on`);
    HeizlastLayout.astro Print-CSS mit zwei neuen Regeln ergänzen.

Nach Block L: Tests laufen, commit, weiter mit M1.
```

---

## Warum dieser Brief existiert

Bundle 1 (Blöcke F–K) ist auf main. Bundle 2 (L + M1 + M2 + M) ist
der UI-Polish-Schritt: Notizen aufräumen, Desktop-Breite und
Typografie entspannen, Feldbreiten auf 12-Spalten-Grid ziehen,
Mobile-Worttrennung + Logo-Proportionen fixen. Keine Rechenlogik.
Tests sollten **unverändert 49 + 33 grün** bleiben.

---

## Überblick Bundle 2

| Block | Ziel | Commit-Nachricht (Vorschlag) |
|---|---|---|
| L  | Notizen-Block schlanker | `Phase 9 / Block L: Notizen-Block schlanker` |
| M1 | Desktop-Breite + Fluid-Typografie | `Phase 9 / Block M1: Desktop-Breite + fluide Typografie` |
| M2 | 12-Spalten-Grid + intrinsische Feldbreiten | `Phase 9 / Block M2: 12-Spalten-Grid + Feldbreiten` |
| M  | Mobile-Polish (Worttrennung + Logo) | `Phase 9 / Block M: Mobile-Polish (Worttrennung + Logo)` |

Originale Blöcke stehen in `HANDOFF-PHASE-9.md`. Bitte dort nachlesen
bevor ein Block angegangen wird — der Text unten ist nur die
Schnell-Zusammenfassung für die Bundle-Reihenfolge.

---

### Block L — Notizen-Block schlanker

**Kern:** `SectionNotes`-Toggle verliert den „ausgefüllt"-Badge. Statt-
dessen kleines Navy-Icon (Info-Kreis), nur sichtbar wenn Text vorhanden.
Pro-Notiz-Checkbox „In Export einbeziehen" raus — zentral im Export-Modal.

**Code-Pointer:**
- `src/components/heizlast/SectionNotes.astro`
- `src/lib/heizlast/state.ts` (`SectionNote.includeInExport` raus,
  optional neuer `notizen.projekt: SectionNote`-Slot).
- `src/lib/heizlast/storage.ts` (Migration v1→v1: `includeInExport`
  ignorieren, kein Versions-Bump).
- `src/components/heizlast/ExportModal.astro` (neue Checkboxen
  `notizenBereiche` + `notizenProjekt`).
- `src/lib/heizlast/export.ts` + `HeizlastLayout.astro` Print-CSS.

**Akzeptanz:** Badge weg, Icon nur bei gefüllter Notiz. Export-Modal
zeigt beide neuen Checkboxen, Print-Mode rendert entsprechend.

---

### Block M1 — Desktop-Breite reduzieren (fluid & symmetrisch)

**Kern:** `--hz-container-max = min(92vw, 960px)` als zentrales Token,
`.hz-container` und `.hz-topbar__inner` daran hängen. Fluid-Typografie
(clamp) für Body/Kicker/h2/Subline/KPIs. `--hz-gap-section|row|card`
auf clamp umstellen.

**Code-Pointer:**
- `src/layouts/HeizlastLayout.astro` (Tokens, Container, Topbar-Inner,
  Mobile-Block bleibt).
- `src/components/heizlast/SectionWrapper.astro` (Padding auf Tokens).
- `src/components/heizlast/KpiCard.astro` (Fluid-KPI-Schrift).
- Section-Komponenten nur prüfen, nicht flächig editieren.

**Akzeptanz:** 1440 px Viewport → ca. 200–260 px Rand links/rechts.
1920 px → noch mehr Rand, Content bleibt ~960 px breit. Fluid-Typo
ohne harten Sprung. Mobile-Verhalten aus Phase 8 unverändert.

---

### Block M2 — Feldbreiten intrinsisch, Grid-Leitlinien

**Kern:** 12-Spalten-Grid als Utility (`.hz-row` + `.hz-col-3/4/6/8/12`).
Jede `<div class="hz-field">` bekommt passende Spannweite: Zahl+Einheit
3 Spalten, Select 4, Text 6, Textarea/Diagramm 12. Toggles nicht mehr
full-width. Input-Breite via `.hz-field[data-size="xs|sm|md|lg"]` →
`--hz-field-max` begrenzen.

**Code-Pointer:**
- `src/layouts/HeizlastLayout.astro` (neue Utility-Klassen).
- Alle Section-Komponenten: bestehende Wrapper auf neues Grid umstellen
  (Section 1 zuerst als Referenz, dann 2/3/4/6/7).
- `src/components/heizlast/Toggle.astro` (max-width für Button).

**Akzeptanz:** 1440 px → Zahl+Einheit-Felder haben sichtbaren Freiraum
rechts. Gleiche Feldtypen gleich breit (snappen an 12-Spalten-Linien).
Mobile-Verhalten: alles 1-spaltig, keine Regression.

---

### Block M — Mobile-Polish: Worttrennung & Logo

**Kern:** Worttrennung auf Mobile konservativ (`hyphens: manual`,
`overflow-wrap: break-word`), `text-wrap: balance` für Sublines. Logo
auf Mobile 32 px hoch, Container nicht stauchen; „Thermowerk"-Text-
Span neben dem Logo **komplett raus** (nicht nur `display: none`).
Desktop-Logo bündig mit `.hz-container`-Kante.

**Code-Pointer:**
- `src/layouts/HeizlastLayout.astro` (Logo-Block, Mobile-CSS).
- Alle `.hz-brand__text`-Vorkommen entfernen.

**Akzeptanz:** Keine mid-word-Umbrüche mehr auf 375 px. Logo-
Proportionen stabil. Desktop: Logo linksbündig mit Content-Block.

---

## Abnahme-Checkliste Bundle 2

- [ ] Block L commit pushed, Tests 49 + 33 grün.
- [ ] Block M1 commit pushed, Tests grün.
- [ ] Block M2 commit pushed, Tests grün.
- [ ] Block M commit pushed, Tests grün.
- [ ] `/heizlast` auf Cloudflare live, keine Konsolen-Fehler.
- [ ] 1440 px Viewport hat ruhige Ränder, Felder snappen an 12-Spalten-
      Linien, Zahl+Einheit-Felder haben sichtbaren Freiraum.
- [ ] 375 px Mobile zeigt kein mid-word-Break, Logo korrekt dargestellt.
- [ ] Notizen-Toggles ohne Badge, Icon erscheint erst bei gefülltem
      Text.
- [ ] Export-Modal hat `notizenBereiche` + `notizenProjekt`.

---

## Danach

Nach Bundle 2 ist die Phase-9-Liste in `HANDOFF-PHASE-9.md` komplett.
Danach sind in der Pipeline:
- Manuelle Abnahme-Runde auf echten Geräten (Daniel macht das).
- Optional: `HANDOFF-PHASE-16.md` falls weitere UX-Runden folgen
  (PDF-Renderer Upgrade, Chart-Polish, Projekt-Status-Workflow).
- Git-Tag `pre-layout-refactor` vor Bundle 2 Start als Safety-Point
  (optional, kann auch nach Block L gesetzt werden).
