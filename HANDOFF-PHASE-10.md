# HANDOFF — Phase 9 / Block B (Methodenwahl entfernen, Auto-Erkennung)

## Copy-Paste-Prompt für den nächsten Chat

```
Wir machen weiter an Phase 9 des Heizlast-Rechner-Redesigns. Block A ist
abgeschlossen, jetzt kommt Block B (Methodenwahl entfernen, Auto-Erkennung)
plus die noch offene OverrideField-Anwendung aus Block A.

Lies bitte in dieser Reihenfolge:
1. HANDOFF-PHASE-10.md (diese Datei)
2. CLAUDE.md (nur die Phase-9-Block-A-Notiz oben lesen — Rest ist Kontext)
3. HANDOFF-PHASE-9.md "Block B" und "Block A" (Abschnitt zu den Defaults)

Dann: Block B umsetzen + OverrideField auf tvoll/deltaT/Verluste/toff/
WW-Temps in den Sections anwenden. Am Ende:
- node --experimental-strip-types scripts/test-heizlast.ts (49 grün)
- node --experimental-strip-types scripts/test-heizlast-state.ts (16 grün)
- Commit + Push via Desktop Commander
- HANDOFF-PHASE-11.md für Block C schreiben (inkl. Copy-Paste-Prompt)
- CLAUDE.md Eintrag für Block B ergänzen

Knapp antworten, keine Aufzählungen — nur bei echten Entscheidungsfragen
nachhaken.
```

---

## Stand nach Block A (was fertig ist)

**Override-Infrastruktur:**
- `src/lib/heizlast/state.ts` hat `overrides: Record<string, boolean>` im
  State + Helfer `resolveDefault(state, path)`, `setOverride(path, on)`,
  `clearOverride(path)`, `isOverridden(state, path)`, Union-Typ
  `OverrideFieldPath`.
- `src/lib/heizlast/storage.ts` migriert alte v1-States ohne `overrides`
  sanft auf `{}` beim Laden.
- `src/components/heizlast/OverrideField.astro` ist komplett neu: Wert
  immer sichtbar + editierbar, Reset-Pfeil nur bei `.is-overridden`. Props:
  `label`, `id`, `bindPath`, optional `overridePath` (Default = bindPath),
  `defaultValue`, `unit?`, `hint?`, `type?`, `min?`, `max?`, `step?`,
  `source?`.
- `src/lib/heizlast/bindings.ts` markiert bei `ev.isTrusted`-Events aus
  einem `[data-hz-override-field]`-Wrapper automatisch das Override-Flag
  und hat `syncOverrideClasses(root)` für die `.is-overridden`-Klasse.
- `src/pages/heizlast.astro` installiert die Globals
  `window.__hzClearOverride` + `window.__hzResolveDefault`, die der
  Reset-Button in `OverrideField.astro` aufruft.

**Tests 49 + 16 grün.**

---

## Was in Block B zu tun ist

### 1. Bestehende OverrideField-Usages einbauen (Block-A-Rest)

Die folgenden Felder verwenden aktuell normale `<input>`-Elemente mit
`data-hz-bind`. Umstellen auf `<OverrideField ... />`:

| Section | aktuelles `data-hz-bind` | bindPath / overridePath |
|---|---|---|
| Section1Gebaeude | `gebaeude.tvollOverride` | `bindPath="gebaeude.tvollOverride"` → überlegen ob man das Feld gleich auf `gebaeude.tvoll` umbiegt (siehe Vorschlag unten) |
| Section3Warmwasser | `warmwasser.deltaTOverride` | gleich: `bindPath="warmwasser.deltaTOverride"` oder auf `warmwasser.deltaT` umbiegen |
| Section3Warmwasser | `warmwasser.speicherProzent` | `bindPath="warmwasser.speicherProzent"` |
| Section3Warmwasser | `warmwasser.zirkProzent` | `bindPath="warmwasser.zirkProzent"` |
| Section3Warmwasser | `warmwasser.ausstossProzent` | `bindPath="warmwasser.ausstossProzent"` |
| Section4Zuschlaege | `zuschlaege.toff` | `bindPath="zuschlaege.toff"` |
| Section6Speicher | WW-Temperaturen | `bindPath="speicher.wwTEintritt"` + `"speicher.wwTAustritt"` |

**Hinweis zu den Override-Paths vs. Bind-Paths:** Bei `tvoll` gibt es im
State heute zwei Felder: `gebaeude.tvollOverride` (User-Wert) und die
computed-Default-Logik in `calculations.ts`. Vorschlag: `tvollOverride`-
Feld behalten, aber die Override-Path-Signal-Logik via `overrides['gebaeude.tvoll']`
pflegen — `resolveDefault('gebaeude.tvoll')` liefert bereits den richtigen
Default (Lookup in `tvollLookup`). Konkret also:
```astro
<OverrideField
  label="Vollbetriebsstunden tvoll"
  id="hz-tvoll"
  bindPath="gebaeude.tvollOverride"
  overridePath="gebaeude.tvoll"
  defaultValue={1900}
  unit="h/a"
  source="FWS"
/>
```
Das Default-Feld `defaultValue` ist nur Notfall-Fallback; die Live-Auflösung
macht `window.__hzResolveDefault('gebaeude.tvoll')` über `resolveDefault()`.

**Wichtig:** Bei Komponenten, bei denen `resolveDefault()` aktuell `null`
zurückgibt, muss der Case in `state.ts` → `resolveDefault()` ergänzt werden.
Aktuell unterstützt: `gebaeude.tvoll`, `warmwasser.deltaT`,
`warmwasser.speicher`, `warmwasser.zirk`, `warmwasser.ausstoss`,
`speicher.wwTEintritt`, `speicher.wwTAustritt`, `zuschlaege.toff`.
Fehlt dort ein Pfad → Switch-Case ergänzen.

### 2. Block B — Methodenwahl entfernen

**State-Umbau** (`src/lib/heizlast/state.ts`):
- `heizlast.method` (Enum) durch
  `heizlast.methodsEnabled: { verbrauch: boolean; messung: boolean;
  bstd: boolean; override: boolean }` ersetzen.
- `bauperiode` ist immer "an" als Fallback — **nicht** im Record.
- Default: alles `false`.
- Migration in `storage.ts`: altes `method`-Feld → neues `methodsEnabled`
  umbauen (`method === 'verbrauch'` → `{verbrauch: true, …}` usw.), alten
  Key entsorgen.

**Compute-Hierarchie** (`src/lib/heizlast/compute.ts`):
- Reihenfolge: `override` → `bstd` → `messung` → `verbrauch` → `bauperiode`.
- Die jeweils erste "an" liefert Qhl. `bauperiode` rechnet immer, auch wenn
  `methodsEnabled` leer ist, solange Lage + Bauperiode + EBF gesetzt sind.
- **Regressions-Test kritisch:** FWS-Aufgabe 2 → Qhl = 12.55 kW bleibt
  gleich, wenn der Test auf `methodsEnabled.verbrauch = true` umgestellt
  wird (vorher `method: 'verbrauch'`).

**UI-Umbau** (`src/components/heizlast/sections/Section2Heizlast.astro`):
- Toggle-Pattern von `Section6Speicher` kopieren (Ja/Nein-Switch „Diese
  Methode verwenden").
- `data-active`-Attribut weg, roten `::before`-Balken und `::after`-Pill
  aus dem CSS entfernen.
- `.hz-method__badge` weg (war der „aktiv"-Indikator).

**Glue** (`src/pages/heizlast.astro`):
- Den bisherigen Abschnitt, der `data-active="true"` setzt und `state.heizlast.method`
  schreibt (siehe Kommentar "M2-Methodenwahl: Klick auf…"), komplett raus.
- Neue Bindings für `data-hz-bind="heizlast.methodsEnabled.verbrauch"`
  etc. sind automatisch durch `bindings.ts` abgedeckt (checkbox → boolean).

### 3. Tests

- `node --experimental-strip-types scripts/test-heizlast.ts` → 49 grün
  (Rechenkern unverändert).
- `node --experimental-strip-types scripts/test-heizlast-state.ts` → 16
  grün. **Achtung:** Einzelne Tests setzen `state.heizlast.method = 'verbrauch'`
  und prüfen Qhl = 12.55 kW. Diese Tests brauchen ein Rewrite auf
  `methodsEnabled.verbrauch = true` (Typ-Änderung).

### 4. Commit + Handoff

- `scripts/write_file` für Commit-Message, dann `git add -A + commit -F + push`.
- HANDOFF-PHASE-11.md für Block C (Warmwasser-Defaults & Beschriftung)
  schreiben — Aufgabenbeschreibung steht in `HANDOFF-PHASE-9.md`
  Abschnitt „Block C".
- CLAUDE.md-Eintrag für Block B ergänzen.

---

## Stolpersteine

> **WICHTIG:** Die Root-Cause-Analyse + definitiven Workarounds stehen in
> `CLAUDE.md` unter „Cowork-VM — Architektur-Eigenheiten (Root Cause
> dokumentiert)". Dort sind Problem 1 (Mount-Drift via FUSE-Cache),
> Problem 2 (virtiofs unlink-Block in .git), Problem 3 (index.lock mit
> PowerShell lösen) und Problem 4 (Heredoc-Escape) beschrieben. Vor dem
> ersten Commit kurz dort reinschauen.

- **Cowork-Mount-Drift — Truncated Writes:** Zusätzlich zu den in
  CLAUDE.md dokumentierten Fällen kann das Edit/Write-Tool gelegentlich
  eine Datei truncated auf der Linux-Seite ablegen, obwohl es "Success"
  meldet. Nach jedem grösseren Write via `wc -l` auf dem Linux-Mount
  prüfen. Wenn truncated:
  ```bash
  git show HEAD:src/lib/heizlast/bindings.ts > src/lib/heizlast/bindings.ts
  # dann Python-Patch via heredoc (siehe CLAUDE.md Problem 4 für !-Escape-Handling)
  ```
- **Bash-Heredoc escaped `!` als `\!`:** Wenn du einen Python-Patch in
  `python3 << 'PY'` schreibst und der Code ein `!` enthält, sauberes
  Single-Quote-Heredoc (`<< 'PY'`) verwenden. Zur Not hinterher
  `sed -i 's|\\!|!|g'`.
- **Tests NICHT anfassen:** Der Rechenkern (`calculations.ts`, `types.ts`,
  `constants.ts`) bleibt unangetastet. Die 49 Tests in
  `scripts/test-heizlast.ts` rechnen direkt am Kern — ändere dort nichts.
  Die 16 State-Tests in `scripts/test-heizlast-state.ts` fassen den Kern
  nur über den State an — dort musst du wegen der `method`→`methodsEnabled`-
  Umstellung vermutlich drei bis fünf Assertions anpassen.
- **Keine `\uXXXX`-Escapes in UI-Dateien:** Umlaute, θ, °, η immer als echte
  UTF-8-Zeichen schreiben.

---

## Dateien, die Block B garantiert anfasst

- `src/lib/heizlast/state.ts` (`heizlast.method` → `heizlast.methodsEnabled`)
- `src/lib/heizlast/storage.ts` (Migration alter Keys)
- `src/lib/heizlast/compute.ts` (Hierarchie-Logik in `runCascade`)
- `src/components/heizlast/sections/Section2Heizlast.astro` (Toggle-Pattern,
  CSS-Bereinigung)
- `src/pages/heizlast.astro` (alten Glue raus, neue Bindings)
- `scripts/test-heizlast-state.ts` (Assertions umbiegen)
- `src/components/heizlast/sections/Section1Gebaeude.astro`,
  `Section3Warmwasser.astro`, `Section4Zuschlaege.astro`,
  `Section6Speicher.astro` (OverrideField-Einbau aus Block-A-Rest)
- `CLAUDE.md` + `HANDOFF-PHASE-11.md`
