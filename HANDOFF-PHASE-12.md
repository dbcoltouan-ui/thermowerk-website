# HANDOFF - Phase 9 / Block D (Sperrzeit-Toggle + Qas-Recherche/UI)

## Copy-Paste-Prompt fuer den naechsten Chat

```
Wir machen weiter an Phase 9 des Heizlast-Rechner-Redesigns. Block A + B + C sind
abgeschlossen, jetzt kommt Block D (Sperrzeit-Toggle + Qas aufklaeren und
sauber darstellen).

Lies bitte in dieser Reihenfolge:
1. HANDOFF-PHASE-12.md (diese Datei)
2. CLAUDE.md (nur die Phase-9-Block-C-Notiz oben lesen + den Abschnitt
   "Cowork-VM - Architektur-Eigenheiten (Root Cause dokumentiert)" - Rest
   ist Kontext)
3. HANDOFF-PHASE-9.md "Block D" (Details zu Sperrzeit + Qas)

Dann: Block D umsetzen. Am Ende:
- node --experimental-strip-types scripts/test-heizlast.ts (49 gruen)
- node --experimental-strip-types scripts/test-heizlast-state.ts (16 gruen)
- Commit + Push via Desktop Commander (cmd-Shell, nicht Linux-Bash - siehe
  CLAUDE.md Root-Cause-Abschnitt fuer Workflow)
- HANDOFF-PHASE-13.md fuer Block E schreiben (inkl. Copy-Paste-Prompt)
- CLAUDE.md-Eintrag fuer Block D ergaenzen

Knapp antworten, keine Aufzaehlungen - nur bei echten Entscheidungsfragen
nachhaken.
```

---

## Stand nach Block C (was fertig ist)

**Warmwasser-Defaults zentralisiert + UI-Beschriftung konsolidiert:**
- `src/lib/heizlast/constants.ts` - zwei neue Exporte:
  - `WW_VERLUSTE_DEFAULTS` (Speicher 10 %, Zirk 0 %, Ausstoss 15 %) -
    Kommentar FWS §8 / SIA 385/1, typische Ranges im Docstring.
  - `WW_SPEICHER_DEFAULTS` (tEintritt = PHYSIK.t_kaltwasser, tAustritt 60 °C)
    mit Quelle FWS §10.
- `src/lib/heizlast/state.ts`:
  - `resolveDefault()` bezieht alle WW-Verlust-Prozente + Speicher-Temperaturen
    jetzt aus den Konstanten (statt Literalen). DeltaT bleibt bei
    `PHYSIK.deltaT_ww`.
  - `createDefaultState()` schreibt `warmwasser.speicherProzent/zirkProzent/
    ausstossProzent` und `speicher.wwTStoAus` ebenfalls aus den Konstanten.
    Default-State zeigt also jetzt 10 % / 0 % / 15 % / 60 °C gleich beim
    ersten Laden - User sieht keine `null`-Prozente mehr.
- `src/components/heizlast/sections/Section3Warmwasser.astro`:
  - Labels sprachlich gleichgezogen: "Speicher-Verlust" -> "Speicherverluste",
    "Zirkulations-Verlust" -> "Zirkulationsverluste", "Ausstoss-Verlust"
    -> "Ausstossverluste", "ΔT Kaltwasser -> WW" -> "ΔT Kaltwasser ->
    Warmwasser".
  - Quelle bei allen drei Verlusten von "SIA 385/1" auf "FWS §8" geaendert
    (passender, weil Default-Werte aus FWS Modul 3 stammen). DeltaT bleibt
    "SIA 385/2".
  - Alle vier OverrideFields haben jetzt Hints mit typischen Ranges bzw.
    der physikalischen Begruendung.
  - `defaultValue`-Props beziehen aus `WW_VERLUSTE_DEFAULTS` bzw.
    `PHYSIK.deltaT_ww` - keine Magic Numbers mehr im UI.
- `src/components/heizlast/sections/Section6Speicher.astro`:
  - "Speicher-Austrittstemperatur" -> "Speicher-Solltemperatur (Austritt)"
    mit Hint "Legionellen-Hygiene: mind. 55 °C. Standard FWS: 60 °C."
  - "Eintritt (Kaltwasser)" -> "Kaltwasser-Eintrittstemperatur" mit Hint
    "Referenzwert Kaltwasser: 10 °C."
  - `defaultValue`-Props beziehen aus `WW_SPEICHER_DEFAULTS`.
  - Quelle Austritt von "SIA 385/2" auf "FWS §10" geaendert.
- Personen-Einheiten (`vwui`, `anf`) bleiben als reine User-Eingabe, kein
  OverrideField - sind ohnehin projekt-spezifisch, Defaults ergeben da keinen
  Mehrwert. Entscheidung bewusst so getroffen.

**Tests weiterhin 49 + 16 gruen.**

---

## Was in Block D zu tun ist

### 1. Sperrzeit-Toggle (Section 4)

Ziel: Sperrzeit soll per Ja/Nein-Schalter ein-/ausgeblendet werden, wie in
Section 6 die Haupt-Switches. Solange "Nein", wird toff=0 gefuehrt und
kein Korrekturfaktor angewandt (Qoff=0). Bei "Ja" erscheint das toff-Feld
mit dem Default aus `resolveDefault('zuschlaege.toff')` (= 2 h/d) und dem
Override-Pfeil.

Konkret:
- **`src/lib/heizlast/state.ts`** - neues Feld `zuschlaege.sperrzeitActive:
  boolean` (Default `false`). Tests NICHT anpassen - der Test in
  `test-heizlast-state.ts` nutzt `zuschlaege.toff` direkt ueber den Store;
  solange `computeQoff` bei `sperrzeitActive === false` mit 0 rechnet,
  bleiben Qh und Qhl identisch zu aktuell (Achtung: FWS-Aufgabe 2 nutzt
  toff=0 implizit, daher muss der State-Test toff-Szenarien pruefen oder der
  Test toleriert beide Pfade).
- **`src/lib/heizlast/compute.ts`** - `computeQoff` so anpassen:
  ```ts
  if (!s.zuschlaege.sperrzeitActive) return 0;
  ```
  direkt am Anfang. Rest bleibt.
- **`src/components/heizlast/sections/Section4Zuschlaege.astro`** - ganz
  oben eine `.hz-switch` mit `data-hz-bind="zuschlaege.sperrzeitActive"
  data-hz-type="boolean"` und Label "Sperrzeit vorhanden?". Der darunter
  liegende `OverrideField`-Block (toff) sowie der Korrekturfaktor-Chip-Block
  werden per `body.hz-sperrzeit-on`-Gate sichtbar/unsichtbar (oder via
  konditionalem Render in der Glue-JS in `heizlast.astro`). Einfachste
  Variante: `display: none` Klasse `.hz-sperrzeit-block` am Container und
  via `state.subscribe` in `heizlast.astro` toggeln.
- `hint="0 = keine Sperre. Typisch: 2-4 h (EVU)."` raus aus dem toff-Feld -
  der Toggle selbst erklaert es. Stattdessen Hint "Stunden pro Tag, in
  denen die WP abgeschaltet wird."
- "EVU" aus der `h3`-Ueberschrift raus ("Sperrzeit" allein reicht), klein
  darunter Hint "Energieversorger".
- Die bestehende InfoBox "Warum ein Sperrzeit-Zuschlag?" kuerzen auf eine
  reine Begriffsdefinition ohne "warum"-Tutorial-Ton. Neuer Titel:
  "Sperrzeit-Zuschlag" ohne Fragezeichen.

### 2. Qas (Sonder-/Abtauzuschlag) aufklaeren

**Recherche-Auftrag:** In `reference/old-calculator/` nachlesen, woher Qas
kommt. Ich vermute stark: freie User-Eingabe fuer Abtau-Reserve bei Luft-WP
(ca. 5-10 % von Qh oder pauschal 0.5-1 kW), NICHT aus einer FWS-Tabelle
abgeleitet. Das in der UI entsprechend darstellen:

- Der Toggle "Zusaetzlicher Sonder-/Abtauzuschlag (Qas)" bleibt, aber:
  - Untertitel klein darunter: "Abtau-Reserve bei L/W-WP - optional".
  - Hint am Qas-Feld: "Richtwert L/W-WP mit Abtau: 0.5-1.0 kW oder ca. 5-10 %
    von Qh."
  - "Wird direkt zu Qh addiert." raus (wird in Block F in der Ergebnis-Tabelle
    ohnehin sichtbar).
  - Der zusaetzliche `qasActive`-Switch im Panel ist redundant - entfernen
    und Auto-Regel: sobald `qas > 0`, wird addiert. `qasActive` kann aus dem
    State raus (oder als Legacy-Flag stehen bleiben, aber nicht mehr UI-
    exponiert).
- Wenn in `reference/old-calculator/js/heizlast.js` eine andere Logik
  dokumentiert ist (z. B. abgeleiteter Wert), dann entsprechend darstellen
  mit OverrideField-Pattern.

### 3. Tests

Der Rechenkern bleibt unveraendert, aber `computeQoff` bekommt einen
Gate. Pruefen:
- `scripts/test-heizlast.ts` rechnet direkt am Rechenkern (`calculations.ts`),
  nicht an compute.ts. Sollte unberuehrt sein -> 49 gruen.
- `scripts/test-heizlast-state.ts` - der FWS-Aufgabe-2-Test setzt toff=2,
  also muss `sperrzeitActive = true` gesetzt werden im Test oder der
  Test-Default geaendert werden. Sauberster Weg: Im Test zusaetzlich
  `heizlast.zuschlaege.sperrzeitActive = true` vor dem Assert. Test bleibt
  somit bei Qhl = 12.55 kW ± 0.05.

### 4. Commit + Handoff

- `write_file` fuer `commitmsg.txt` (kurz + knapp).
- cmd via Desktop Commander:
  ```
  cd /d C:\Users\Daniel\Documents\thermowerk-website && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
  ```
- HANDOFF-PHASE-13.md fuer Block E schreiben (Aufgabe in HANDOFF-PHASE-9.md
  Abschnitt "Block E" - EBF-Helfer-Erweiterung).
- CLAUDE.md-Eintrag fuer Block D ergaenzen.

---

## Stolpersteine

> **WICHTIG:** Die Root-Cause-Analyse + definitiven Workarounds stehen in
> `CLAUDE.md` unter "Cowork-VM - Architektur-Eigenheiten (Root Cause
> dokumentiert)". In Block C ist Problem 1 (FUSE-Mount-Drift) akut
> aufgetreten: Windows-Edit war durch, Linux-Mount sah abgeschnittenen Stand.
> Abhilfe: Bei Node-Fehlern wie "SyntaxError: Unexpected character '\0'" oder
> "ReferenceError: expor is not defined" nicht die Edit-Logik verdaechtigen,
> sondern `wc -l`, `stat` und `tail` auf Linux vs. `Read` auf Windows
> vergleichen. Wenn Linux die Datei als abgeschnitten sieht, per Python
> `rstrip(b'\x00').rstrip() + b'\n'` sauber zuruecktrimmen, dann Windows-Read
> gegenchecken und doppelte Bloecke raus-editieren.

- **Tests NICHT anfassen** bis auf den kleinen toff-Aktivierungs-Schritt in
  `test-heizlast-state.ts`.
- **Keine `\uXXXX`-Escapes in UI-Dateien:** Umlaute, Sonderzeichen immer
  als echte UTF-8-Zeichen schreiben.
- **Heredoc-Bug (Problem 4):** `!` in Bash-Heredocs kann zu `\!` escaped
  werden. Lieber Python-Heredoc (`python3 << 'PY'`) nutzen, oder direkt
  Edit-/Write-Tool.

---

## Dateien, die Block D voraussichtlich anfasst

- `src/lib/heizlast/state.ts` (neues Feld `zuschlaege.sperrzeitActive`,
  ggf. `qasActive` entfernen oder markieren)
- `src/lib/heizlast/compute.ts` (`computeQoff`-Gate)
- `src/components/heizlast/sections/Section4Zuschlaege.astro` (Toggle,
  Labels, InfoBox kuerzen, Qas-Panel entschlacken)
- `reference/old-calculator/js/heizlast.js` (nur lesen - Qas-Recherche)
- `scripts/test-heizlast-state.ts` (FWS-Aufgabe-2-Test: sperrzeitActive
  setzen)
- `CLAUDE.md` + `HANDOFF-PHASE-13.md`
