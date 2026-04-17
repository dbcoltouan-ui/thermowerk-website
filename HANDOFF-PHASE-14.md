# HANDOFF — Phase 9 / Block F (Section 5 entfernen, Endergebnis-Block in Section 7)

## Copy-Paste-Prompt für den nächsten Chat

```
Wir machen weiter an Phase 9 des Heizlast-Rechner-Redesigns. Block A–E sind
abgeschlossen, jetzt kommt Block F (Section 5 "Auslegung der Wärmepumpe"
entfernen und den Qh-Summenblock als schlanken Endergebnis-Block in Section 7
oberhalb der Speicher-Aktionen einbauen; gleichzeitig Sektionen 1–7 → 1–6
umnummerieren).

Lies bitte in dieser Reihenfolge:
1. HANDOFF-PHASE-14.md (diese Datei)
2. CLAUDE.md — nur die Phase-9-Block-E-Notiz oben + den Abschnitt
   "Cowork-VM — Architektur-Eigenheiten (Root Cause dokumentiert)"
   (Rest ist Kontext)
3. HANDOFF-PHASE-9.md "Block F" (Scope + Code-Pointer) sowie "Block G"
   (Label-Pattern — Ergebnis-Block soll diesem Muster folgen)

Dann: Block F umsetzen. Am Ende:
- node --experimental-strip-types scripts/test-heizlast.ts (49 grün)
- node --experimental-strip-types scripts/test-heizlast-state.ts (32 grün,
  ggf. um Section-Numerierung-Regression erweitern falls sinnvoll)
- Commit + Push via Desktop Commander (cmd-Shell, nicht Linux-Bash — siehe
  CLAUDE.md Root-Cause-Abschnitt)
- HANDOFF-PHASE-15.md für Block G schreiben (Label-Pattern + Erklärungen
  kürzen) oder direkt Block G mit übernehmen, wenn Block F klein bleibt
- CLAUDE.md-Eintrag für Block F ergänzen

Knapp antworten, keine Aufzählungen — nur bei echten Entscheidungsfragen
nachhaken.
```

---

## Stand nach Block E (was fertig ist)

**EBF-Helfer erweitert: beheizt/unbeheizt + direkte Flächeneingabe.**

- `src/lib/heizlast/state.ts` —
  - `RaumInput` um `flaecheDirekt: number | null` und `beheizt: boolean`
    erweitert. `laenge`/`breite` jetzt `number | null` (Unterschied zwischen
    "nicht gesetzt" und "0"). `flaecheOverride` bleibt als Legacy-Feld.
  - Neue Exporte: `raumFlaeche(r)` (flaecheDirekt > flaecheOverride > L·B),
    `sumRaumFlaechenNetto(raeume)` → `{ beheizt, unbeheizt, netto }`
    (netto = beheizt, unbeheizt ist rein informativ).
  - `sumRaumFlaechen()` bleibt als Alias auf `.netto` für Rückwärtskompat.
  - `addRaum()` setzt beheizt=true, flaecheDirekt=null, laenge/breite=null.
- `src/lib/heizlast/storage.ts` — sanfte v1→v1-Migration für alte RaumInput-
  Einträge: laenge/breite werden zu `number|null` normalisiert, fehlende
  `flaecheDirekt` = null, fehlende `beheizt` = true. Kein Versions-Bump.
- `src/components/heizlast/sections/Section1Gebaeude.astro` —
  - Tabelle um zwei Spalten erweitert: "Fläche direkt" (m²) und "Beheizt"
    (Checkbox). Grid-Template: `1.4fr 0.9fr 0.9fr 0.9fr 0.9fr 58px 44px`.
  - Neue Summenzeile: `beheizt: X m² · abgezogen (unbeheizt): Y m² ·
    Netto-EBF: X m²` (drei Spans, `#hz-raum-sum-beheizt`,
    `#hz-raum-sum-unbeheizt`, `#hz-raum-sum-value`).
  - CSS: Zeile mit `data-direkt="true"` dämpft Länge/Breite visuell ab;
    Zeile mit `data-beheizt="false"` bekommt leichten grauen Hintergrund.
  - Mobile-Breakpoint (640 px) mit `grid-template-areas` für 4-spaltiges
    Layout.
  - Subline des Toggle-Helfers auf neuen Workflow umformuliert.
- `src/pages/heizlast.astro` —
  - `renderRaumList()` rendert alle 7 Spalten, liest `raumFlaeche()` und
    verwendet `sumRaumFlaechenNetto()` für die drei Summenfelder.
  - Live-Modus übernimmt `agg.netto` (nicht mehr Brutto) in `gebaeude.ebf`.
  - Event-Delegation um `flaecheDirekt` erweitert; `beheizt` wird über
    `change`-Handler aktualisiert (nicht `input`, Checkbox-Verhalten).
  - Neue Helper `parseRaumNumber(value)` liefert `null` für leeren Input.
  - "Übernehmen"-Button schreibt `agg.netto` in `gebaeude.ebf`.
- `scripts/test-heizlast-state.ts` — zwei neue Sektionen:
  - "Block E — EBF-Helfer beheizt/unbeheizt + flaecheDirekt": sechs Asserts
    (beheizt/unbeheizt/netto-Summen, Alias, flaecheDirekt-Vorrang,
    leerer Raum → 0).
  - "Migration alter RaumInput": sieben Asserts (State akzeptiert, beheizt
    defaultet auf true, flaecheDirekt auf null, laenge/breite erhalten,
    Netto-Summe korrekt).
  - Neue Gesamtsumme: **49 (Rechenkern) + 32 (State) grün** (vorher 49+19).

**Stolperstein in dieser Session:** FUSE-Mount-Drift nach dem Einfügen des
neuen Test-Blocks — Linux-Seite sah 6655 B, Windows-Seite 9679 B. Tests per
Desktop Commander auf Windows-Seite (`node --experimental-strip-types …`)
ausgeführt, Stdout in Log-Datei, mit `Read`-Tool zurückgelesen. Workaround
funktioniert zuverlässig, wenn das Linux-Bash den Edit nicht sieht.

**Commit:** `phase-9-block-e` — EBF-Helfer: beheizt/unbeheizt + direkte
Flächeneingabe (siehe git log nach dem Push).

---

## Scope Block F (was jetzt dran ist)

Section 5 ("Auslegung der Wärmepumpe") ist im aktuellen Layout redundant:
Die Summen Qhl + Qw + Qoff + Qas = Qh sollen als **schlanker Endergebnis-
Block** am Ende der Eingabemaske (oberhalb der Speicher-Aktionen in Section 7)
erscheinen, nicht mehr in einer eigenen Sektion mit KPI-Kacheln.

### Aufgaben

**1. Section 5 entfernen:**
- `src/components/heizlast/sections/Section5Auslegung.astro` — als Stub
  belassen (Phase-8-Erfahrung mit ExecutiveSummary: Mount-Permission
  verhindert Löschen) oder leeres Fragment exportieren.
- `src/pages/heizlast.astro` — Import + Render aus der Reihenfolge raus.
  `id="sektion-5"`-Referenzen entfernen.

**2. Neuer Endergebnis-Block in Section 7:**
Oberhalb der "Projekt speichern"-Aktionen, schlanker Listen-Stil:

```
Heizlast        Qhl    9.28  kW
                 +
Warmwasser      Qw     0.59  kW
                 +
Sperrzeit       Qoff   0.84  kW
                 +
Sonderzuschlag  Qas    0.00  kW
                 =
Wärmepumpenleistung  Qh   10.71  kW
```

- Großer Begriff oben, Code (Qhl/Qw/...) klein darunter oder inline-small.
- Kein Navy-Strich, keine Box pro Zeile, nur dezenter Trenner (`border-bottom:
  1px dashed var(--hz-border)` o. ä.).
- Operator `+` / `=` zwischen den Zeilen, zentriert und in `--hz-mid-gray`.
- `Qh`-Zeile optisch hervorgehoben (z. B. `font-weight: 700`, rote Unterlinie
  analog zu KpiCard-Hero-Variante, aber ohne Card-Rahmen).
- `[data-kpi]`-Slots für Qhl/Qw/Qoff/Qas/Qh setzen, damit `renderAll()` die
  Werte live schreibt (Slot-Namen wiederverwenden, die aktuell in Section 5
  benutzt werden — so bleibt `setKpi` unverändert).

**3. Sektionen 1–7 → 1–6 umnummerieren:**
- Alle Kicker in den Section-Komponenten (`"01 — Projekt"`, `"02 — Heizlast"`,
  … `"06 — Speicher"`) durchgehen.
- `id="sektion-N"`-Attribute anpassen (Section 6 → Section 5 und Section 7 →
  Section 6).
- Diagramm-Sektion (`id="sektion-diagramm"`) bleibt unverändert.
- `renderAll()`-Subscriber und Export-Module (`PrintCover`, `runExport`)
  gegenprüfen: alle Referenzen auf `#sektion-6` / `#sektion-7` nachziehen.

### Tests

- `test-heizlast.ts` (49 grün, unverändert).
- `test-heizlast-state.ts` (32 grün, unverändert — keine State-Änderung).
- Optional: Smoke-Test, dass `runCascade` nach Block F immer noch `Qh ==
  Qhl_korr + Qw + Qoff + Qas` liefert (Block-3-Sektion bleibt bestehen).

---

### Code-Pointer

- `src/components/heizlast/sections/Section5Auslegung.astro` — Stub oder
  komplett leer.
- `src/components/heizlast/sections/Section6Speicher.astro` — Kicker
  `"06 — …"` → `"05 — …"`, `id="sektion-6"` → `"sektion-5"`.
- `src/components/heizlast/sections/Section7Projekt.astro` — Kicker
  `"07 — …"` → `"06 — …"`, `id="sektion-7"` → `"sektion-6"`; neuer
  Endergebnis-Block oberhalb der Save-Actions (mit `[data-kpi]`-Slots).
- `src/pages/heizlast.astro` — Import-Reihenfolge, `setKpi()`-Targets,
  eventuelle `#sektion-5`-Scroll-Anker.
- `HANDOFF-PHASE-9.md` — Block-G-Abschnitt als Referenz für das Label-Pattern
  (Begriff groß / Symbol klein), damit der Endergebnis-Block direkt im neuen
  Stil entsteht.

---

## Hinweise für den nächsten Chat

- **FUSE-Mount-Drift:** Wenn `node --experimental-strip-types …` im Linux-Bash
  mit `SyntaxError: Expected ',', got '<eof>'` abbricht und die gelesene
  Byte-Zahl kleiner ist als der Windows-Stand: Test via Desktop Commander
  `cmd.exe /c "cd /d C:\… && C:\Progra~1\nodejs\node.exe --experimental-
  strip-types scripts/test-heizlast-state.ts > test-out.log 2>&1"` und dann
  `Read`-Tool auf `test-out.log` (Windows-Seite). Log-Datei danach wieder
  löschen (`del test-out.log`). Diese Route hat in Block E den Tag gerettet.
- **Commit-Workflow:** unverändert — `commitmsg.txt` via `write_file`,
  cmd-Shell `git add -A && git commit -F commitmsg.txt && git push`. Nie
  Linux-Bash für Git.
- **Safety-Tag:** nach erfolgreichem Block F ggf. `pre-block-f` setzen als
  Rollback-Punkt.
- **Block G eng mit Block F:** Wenn der Endergebnis-Block ohnehin im neuen
  Label-Stil entsteht, ist ein Teil von Block G (Label-Pattern) bereits
  abgehakt. Restliches Block G (InfoBoxen kürzen, Section-Sublines straffen,
  "Override"-Suffixe entfernen) kann entweder direkt mit oder in einer
  separaten Session passieren.
