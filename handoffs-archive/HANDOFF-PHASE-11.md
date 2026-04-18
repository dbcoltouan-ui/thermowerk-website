# HANDOFF - Phase 9 / Block C (Warmwasser-Defaults + Beschriftung)

## Copy-Paste-Prompt fuer den naechsten Chat

```
Wir machen weiter an Phase 9 des Heizlast-Rechner-Redesigns. Block A + B sind
abgeschlossen, jetzt kommt Block C (Warmwasser-Defaults + Beschriftung).

Lies bitte in dieser Reihenfolge:
1. HANDOFF-PHASE-11.md (diese Datei)
2. CLAUDE.md (nur die Phase-9-Block-B-Notiz oben lesen + den Abschnitt
   "Cowork-VM - Architektur-Eigenheiten (Root Cause dokumentiert)" - Rest
   ist Kontext)
3. HANDOFF-PHASE-9.md "Block C" (Details zu den Defaults)

Dann: Block C umsetzen. Am Ende:
- node --experimental-strip-types scripts/test-heizlast.ts (49 gruen)
- node --experimental-strip-types scripts/test-heizlast-state.ts (16 gruen)
- Commit + Push via Desktop Commander (cmd-Shell, nicht Linux-Bash - siehe
  CLAUDE.md Root-Cause-Abschnitt fuer Workflow)
- HANDOFF-PHASE-12.md fuer Block D schreiben (inkl. Copy-Paste-Prompt)
- CLAUDE.md-Eintrag fuer Block C ergaenzen

Knapp antworten, keine Aufzaehlungen - nur bei echten Entscheidungsfragen
nachhaken.
```

---

## Stand nach Block B (was fertig ist)

**Methodenwahl entfernt, Auto-Erkennung steht:**
- `state.ts` - `HeizlastMethod` weg, neuer `HeizlastMethodsEnabled`-Record
  (`{ verbrauch, messung, bstd, override: boolean }`). `bauperiode` ist
  NICHT im Record (immer Fallback). Default: alles `false`.
- `storage.ts` - Migration alter `method`-Strings -> neuer Record.
- `compute.ts` - neue `computeQhlRaw`-Hierarchie: override -> bstd -> messung
  -> verbrauch -> bauperiode. Erste aktivierte Methode mit vollstaendigen
  Eingaben gewinnt. Bauperiode laeuft immer als Fallback.
- `Section2Heizlast.astro` - pro Methode (ausser Bauperiode) ein Ja/Nein-
  Switch "Diese Methode verwenden" oben im Panel, schreibt direkt in den
  `methodsEnabled`-Record. Roter `::before`-Balken + `::after`-Pill + `.hz-
  method__badge` komplett raus.
- `heizlast.astro` - Glue-Block `syncMethodToggles()` + Click-Handler, der
  `state.heizlast.method` schrieb, ist entfernt. Kein Umbau der Bindings
  noetig - Checkboxen werden automatisch via `data-hz-bind` gespiegelt.

**OverrideField in Sections 1/3/4/6 angewendet (Block-A-Rest):**
- Section 1: `gebaeude.tvollOverride` (bind) + `gebaeude.tvoll` (override).
- Section 3: `warmwasser.speicherProzent|zirkProzent|ausstossProzent` +
  `warmwasser.deltaTOverride` mit ihren Override-Pfaden
  `warmwasser.speicher|zirk|ausstoss|deltaT`.
- Section 4: `zuschlaege.toff`.
- Section 6: `speicher.wwTStoAus` (-> `speicher.wwTAustritt`) und
  `speicher.wwTStoEinOverride` (-> `speicher.wwTEintritt`).

**Bindings.ts Cleanup:** Die beiden `\!`-Artefakte (Zeilen 151, 238) aus dem
vorherigen Heredoc-Patch sind zu `!wrapper` / `!path` repariert.

**Tests weiterhin 49 + 16 gruen.**

---

## Was in Block C zu tun ist

### 1. Warmwasser-Defaults anpassen

Siehe `HANDOFF-PHASE-9.md` Abschnitt "Block C - Warmwasser-Defaults &
Beschriftung". Die wichtigsten Punkte:

**`resolveDefault()` in `state.ts`:**
- Pruefen ob die Defaults fuer `warmwasser.speicher` (10 %),
  `warmwasser.zirk` (0 %), `warmwasser.ausstoss` (15 %), `warmwasser.deltaT`
  (50 K) mit den FWS/SIA-Werten aus `constants.ts` uebereinstimmen. Aktuell
  stehen die Zahlen direkt im Switch-Case hart drin - besser: aus einer
  zentralen Konstante beziehen (z. B. `WW_VERLUSTE` oder aehnlich in
  `constants.ts`), damit eine Aenderung nur an einer Stelle passiert.

**Section 3 Labeling:**
- Die Labels der Prozent-Felder sprachlich gleichziehen (z. B. "Speicher-
  Verlust" -> "Speicherverluste" o. ae., konsistent mit Zirkulations-/
  Ausstossverluste). Quelle-Hinweis "SIA 385/1" pruefen - ggf. durch
  "FWS §8" ersetzen, wo passender.
- Hinweis-Text unter jedem Feld (als `hint`-Prop) mit typischen Ranges:
  Speicher 5-15 %, Zirkulation 0-20 %, Ausstoss 10-20 %.

**Section 3 Personen-Einheiten (ggf.):**
- Pruefen ob die Personen-Einheiten-Eingabe (`vwui`, `anf`) ebenfalls
  OverrideField-Pattern bekommen sollte, oder ob sie als reine User-
  Eingaben bleiben. Tendenz: bleiben, da ohnehin personen-spezifisch.

**Section 6 WW-Temperaturen:**
- Labels + Hints pruefen: "Speicher-Austrittstemperatur" -> "Speicher-
  Solltemperatur (Austritt)"? "Eintritt (Kaltwasser)" -> "Kaltwasser-
  Eintrittstemperatur"? Mit Daniel kurz klaeren, wenn unsicher.

### 2. Tests

Tests sollten nicht veraendert werden muessen (der Rechenkern bleibt gleich,
nur Default-Quellen werden umgehaengt). Dennoch:
- `scripts/test-heizlast.ts` -> 49 gruen
- `scripts/test-heizlast-state.ts` -> 16 gruen

Falls `resolveDefault` jetzt aus `constants.ts` bezieht: kein Test-Effekt,
da Compute direkt die Konstante nutzt.

### 3. Commit + Handoff

- `write_file` fuer `commitmsg.txt` (kurz + knapp).
- cmd via Desktop Commander:
  ```
  cd /d C:\Users\Daniel\Documents\thermowerk-website && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
  ```
- HANDOFF-PHASE-12.md fuer Block D schreiben (Aufgabe in
  HANDOFF-PHASE-9.md Abschnitt "Block D").
- CLAUDE.md-Eintrag fuer Block C ergaenzen (analog zu den Block-A- und
  Block-B-Eintraegen).

---

## Stolpersteine

> **WICHTIG:** Die Root-Cause-Analyse + definitiven Workarounds stehen in
> `CLAUDE.md` unter "Cowork-VM - Architektur-Eigenheiten (Root Cause
> dokumentiert)". Problem 1 (Mount-Drift via FUSE-Cache), Problem 2
> (virtiofs unlink-Block in .git), Problem 3 (index.lock mit PowerShell
> loesen), Problem 4 (Heredoc-Escape), Problem 5 (Controlled Folder
> Access). Vor dem ersten Commit dort reinschauen.

- **Tests NICHT anfassen:** Der Rechenkern (`calculations.ts`, `types.ts`,
  `constants.ts`) bleibt unangetastet, sofern nicht explizit fuer Block C
  gefordert. Die 49 Tests in `scripts/test-heizlast.ts` rechnen direkt am
  Kern - dort aendert sich nichts.
- **Keine `\uXXXX`-Escapes in UI-Dateien:** Umlaute, Sonderzeichen immer
  als echte UTF-8-Zeichen schreiben.

---

## Dateien, die Block C voraussichtlich anfasst

- `src/lib/heizlast/constants.ts` (WW-Verluste / Temperaturen als benannte
  Konstanten, falls noch nicht vorhanden)
- `src/lib/heizlast/state.ts` (`resolveDefault` - Konstanten referenzieren
  statt Literale)
- `src/components/heizlast/sections/Section3Warmwasser.astro` (Labels,
  Hints, ggf. Source-Property)
- `src/components/heizlast/sections/Section6Speicher.astro` (Labels, Hints)
- `CLAUDE.md` + `HANDOFF-PHASE-12.md`
