# HANDOFF — Phase 9 / Block E (EBF-Helfer erweitern)

## Copy-Paste-Prompt für den nächsten Chat

```
Wir machen weiter an Phase 9 des Heizlast-Rechner-Redesigns. Block A–D sind
abgeschlossen, jetzt kommt Block E (EBF-Helfer erweitern: beheizt/unbeheizt,
direkte Flächeneingabe).

Lies bitte in dieser Reihenfolge:
1. HANDOFF-PHASE-13.md (diese Datei)
2. CLAUDE.md — nur die Phase-9-Block-D-Notiz oben + den Abschnitt
   "Cowork-VM — Architektur-Eigenheiten (Root Cause dokumentiert)"
   (Rest ist Kontext)
3. HANDOFF-PHASE-9.md "Block E" (Scope + Code-Pointer)

Dann: Block E umsetzen. Am Ende:
- node --experimental-strip-types scripts/test-heizlast.ts (49 grün)
- node --experimental-strip-types scripts/test-heizlast-state.ts (19 grün,
  ggf. um EBF-Netto-Summe-Test erweitern)
- Commit + Push via Desktop Commander (cmd-Shell, nicht Linux-Bash — siehe
  CLAUDE.md Root-Cause-Abschnitt)
- HANDOFF-PHASE-14.md für Block F schreiben (Section-5-Entfernung + neuer
  Endergebnis-Block in Section 7)
- CLAUDE.md-Eintrag für Block E ergänzen

Knapp antworten, keine Aufzählungen — nur bei echten Entscheidungsfragen
nachhaken.
```

---

## Stand nach Block D (was fertig ist)

**Sperrzeit-Toggle + Qas-Klarstellung:**

- `src/lib/heizlast/state.ts` — neues Feld `zuschlaege.sperrzeitActive: boolean`
  (Default `false`). `qasActive` bleibt als Legacy-Field (wird ignoriert).
- `src/lib/heizlast/compute.ts` — `computeQoff()` gated auf `sperrzeitActive`;
  wenn off: `{ value: 0 }`. `runCascade` addiert `qas` automatisch wenn > 0
  (kein `qasActive`-Gate mehr).
- `src/lib/heizlast/storage.ts` — sanfte Migration: alte States ohne
  `sperrzeitActive` bekommen `sperrzeitActive = (toff > 0)`.
- `src/components/heizlast/sections/Section4Zuschlaege.astro`:
  - Sperrzeit-Toggle oben (Ja/Nein-Switch auf `zuschlaege.sperrzeitActive`).
  - `toff`-OverrideField liegt in `.hz-sperrzeit-block`, nur sichtbar wenn
    `body.hz-sperrzeit-on` (CSS-Gate).
  - Qas umbenannt zu "Qas — Verbundene Systeme" mit Hints (Pool 1–3 kW,
    Lüftung 0.3–0.8 kW). `qasActive`-Toggle entfernt.
  - InfoBox-Titel auf "Sperrzeit-Zuschlag" gekürzt.
- `src/pages/heizlast.astro`:
  - Store-Subscriber toggelt `document.body.classList.toggle('hz-sperrzeit-on',
    !!s.zuschlaege.sperrzeitActive)`.
  - `renderAll()` verwendet `qasEff` (`qas` wenn > 0, sonst 0) anstelle des
    alten `qasActive`-Gates.
- Tests: `scripts/test-heizlast-state.ts` um Block 8 (Sperrzeit-Toggle)
  erweitert:
  - Gate off → `Qoff === 0`.
  - Gate on mit `toff=2` → `Qoff > 0`.
  - `qas=0.75` → Qh steigt genau um 0.75 (unabhängig von `qasActive`).
  - Ergebnis: 19 Assertions grün (vorher 16).
- `.gitignore` ergänzt: `_backup-*.zip`.

**Tests:** 49 (Rechenkern) + 19 (State-Integration) grün.
**FWS-Aufgabe 2:** Qhl = 12.55 kW weiterhin stabil (Test erzwingt jetzt
`sperrzeitActive = true`, da die Aufgabe `toff = 2 h` hat).

**Commits:**
- `f4a2752` — Phase 9 / Block D: Sperrzeit-Toggle + Qas-Klarstellung
- `8fde33c` — Clean up: Backup-ZIP ziyQuTJp aus Repo entfernt

---

## Scope Block E (was jetzt dran ist)

Problem: die Zimmer-Liste in Section 1 (EBF-Helfer) kann aktuell nur
`L × B` rechnen und summiert alle Zimmer blind auf. In der Praxis braucht
Daniel:

1. **Direkte Flächeneingabe pro Zimmer** — wenn nur die Fläche aus dem
   Grundriss bekannt ist, muss nicht in L × B zerlegt werden.
2. **Unbeheizt-Toggle pro Zimmer** — unbeheizte Räume (Keller, Estrich,
   Garage) werden NICHT addiert, sondern separat in der Summenzeile gezeigt.
3. **Netto-EBF** — `Übernehmen` schreibt die beheizte Summe in
   `gebaeude.ebf`, nicht die Brutto-Summe.

### Aufgaben

**1. State (`src/lib/heizlast/state.ts`):**
- `RaumInput` erweitern:
  ```ts
  export interface RaumInput {
    id: string;
    name: string;
    laenge: number | null;
    breite: number | null;
    /** Phase 9 / Block E — wenn gesetzt, Vorrang vor laenge * breite */
    flaecheDirekt: number | null;
    /** Phase 9 / Block E — wenn false, Fläche NICHT in EBF-Summe */
    beheizt: boolean;
    /** Legacy (Phase 4) — bleibt erhalten, künftig ersetzt durch flaecheDirekt */
    flaecheOverride: number | null;
  }
  ```
  Default neuer Raum: `beheizt: true`, `flaecheDirekt: null`.
- Neue Helper:
  ```ts
  export function raumFlaeche(r: RaumInput): number  // flaecheDirekt ?? l*b
  export function sumRaumFlaechenNetto(raeume): { beheizt, unbeheizt, netto }
  ```
  (`sumRaumFlaechen` bestehen lassen als Alias auf `.netto` für
  Rückwärtskompatibilität, aber in der UI nur noch Netto verwenden.)
- Migration in `storage.ts`: alte States mit `RaumInput` ohne die neuen
  Felder bekommen `beheizt = true`, `flaecheDirekt = null`. Kein Versions-
  Bump nötig — gleiches Muster wie Block D.

**2. UI (`src/components/heizlast/sections/Section1Gebaeude.astro`):**
- Tabellenzeile um zwei Spalten erweitern:
  - "Fläche direkt" — `number`-Input, `data-hz-bind="gebaeude.raeume.<id>.flaecheDirekt"`.
  - "Beheizt" — Checkbox, `data-hz-bind="gebaeude.raeume.<id>.beheizt"`.
- Spalten "Länge" + "Breite" bleiben; disabled visuell wenn `flaecheDirekt` gesetzt.
- Neue Summenzeile: `beheizt: X m² · abgezogen (unbeheizt): Y m² · Netto-EBF: X m²`.
- "Übernehmen"-Button schreibt `netto` in `gebaeude.ebf`.

**3. Render-Glue (`src/pages/heizlast.astro`):**
- `renderRaeume()` muss die zwei neuen Inputs ausgeben (mit `data-hz-bind`,
  damit `bindings.ts` sie automatisch mitverwaltet).
- `updateRaum` unterstützt bereits Partial-Updates — keine Änderung nötig,
  nur neue Felder durchreichen.
- Zwischensumme in `.hz-ebf-sum` nach jeder Zimmer-Änderung neu rendern.

### Tests (`scripts/test-heizlast-state.ts`)

Neue Sektion "Block E — EBF-Helfer Netto-Summe":
- Drei Zimmer: 20 m² beheizt, 15 m² beheizt (via L=5, B=3), 10 m² unbeheizt.
- `sumRaumFlaechenNetto()` → `{ beheizt: 35, unbeheizt: 10, netto: 35 }`.
- `flaecheDirekt` hat Vorrang vor L × B (Zimmer mit beidem gesetzt liefert
  `flaecheDirekt`).
- Migration: alter State mit nur `laenge/breite` + `name` wird gelesen,
  `beheizt` defaultet auf `true`, `sumRaumFlaechenNetto.unbeheizt === 0`.

Target: 49 (Rechenkern) + 21–22 (State) grün.

---

## Hinweise für den nächsten Chat

- **Cowork-Mount-Drift:** Wenn `git status` nach einem Edit auf Linux-Seite
  Änderungen nicht sieht, einmal `git update-index --refresh` im Linux-Bash.
  Nicht via Python die Datei neu schreiben — der FUSE-Cache liefert
  möglicherweise eine abgeschnittene Version zurück und überschreibt die
  Windows-Datei.
- **Keine `\uXXXX`-Escapes** in UI-Dateien (Phase-9-Regel). In Test-Scripts
  sind sie geduldet, aber echte UTF-8 wird bevorzugt.
- **`git rm --cached`** für Dateien, die versehentlich im Commit gelandet
  sind (siehe `ziyQuTJp`-Cleanup heute).
- **Commit-Workflow:** Edits → `commitmsg.txt` via `write_file` → Desktop
  Commander cmd-Shell mit `git add -A && git commit -F commitmsg.txt &&
  git push`. Nie Linux-Bash für Git.
- **Safety-Tag** `pre-block-d` (Commit 20ba80d) liegt im Repo als Rollback-
  Punkt. Nach erfolgreichem Block E ggf. `pre-block-e` setzen.
