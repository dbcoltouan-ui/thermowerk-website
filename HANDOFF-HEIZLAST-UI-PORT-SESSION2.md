# HANDOFF — Heizlast-UI-Port · Session 2

> **Status per 2026-04-18:** Session 1 hat den Port NICHT ausgeführt. Grund:
> realistischer Umfang (15–18 Dateien, 3000–7500 Zeilen inkl. Glue-JS) passt
> nicht sicher in eine einzige Session, wenn am Ende die Tests grün sein
> müssen (49 ✓ Rechenkern + ≥33 ✓ State + FWS-Aufgabe 2 → Qhl = 12.55 kW).
>
> Session 1 hat den Mockup gescannt, das State-Schema verifiziert und diesen
> Handoff geschrieben. Die Codebase ist unverändert — kein Teil-Commit, keine
> Misch-Codebase. **Session 2 macht den Cutover in einem einzigen atomaren
> Commit am Ende.**

## Copy-Paste-Prompt für Session 2

```
Ich baue den Heizlast-Rechner (thermowerk.ch/heizlast) in einem einzigen
atomaren Cutover um. Die Codebase ist aktuell unverändert; alle neuen
Komponenten werden parallel angelegt, dann wird heizlast.astro einmal
umgeschaltet und am Ende ein einziger Commit pusht alles.

Bitte lies zuerst in dieser Reihenfolge:

1. C:\Users\Daniel\Documents\thermowerk-website\CLAUDE.md
   — speziell "Heizlast-Rechner — Status" und "Cowork-VM — Architektur".
2. C:\Users\Daniel\Documents\thermowerk-website\HANDOFF-HEIZLAST-UI-PORT.md
   — das kanonische Brief (komplett, ~375 Zeilen).
3. C:\Users\Daniel\Documents\thermowerk-website\HANDOFF-HEIZLAST-UI-PORT-SESSION2.md
   — diese Datei (Ergänzungen, Binding-Mapping, Anti-Pattern-Hinweise).
4. C:\Users\Daniel\Documents\thermowerk-website\mockups\section-1.html
   — Design-Vorlage (3268 Zeilen: CSS 23–1625, HTML 1627–3267).

Dann scannen:
5. src/lib/heizlast/state.ts (PROTECTED)
6. src/lib/heizlast/bindings.ts (PROTECTED)
7. src/lib/heizlast/compute.ts (PROTECTED)
8. src/pages/heizlast.astro (wird durch neuen Port ersetzt)

Reihenfolge Blöcke A → B → C → D → E → F wie in
HANDOFF-HEIZLAST-UI-PORT.md dokumentiert. Tests grün halten
(49 + ≥33). FWS-Aufgabe 2 → Qhl = 12.55 kW ± 0.05. Windows-Commit
via Desktop Commander (NIE git in Linux bash). EIN Commit am Ende.

Bitte knapp antworten; Änderungen nicht auflisten außer wenn eine
Entscheidung zu treffen ist.
```

## Was Session 2 NICHT tun soll

- **Keine Teil-Commits.** Der Mockup hat eine andere Token-Basis
  (`--ink-*`, `--accent`, `--r-sm: 2px`, `--stripe-max: 1140px`). Wenn
  Layout + Tokens umgestellt werden, bevor die Sektions-Komponenten
  angepasst sind, wird die Seite zwischendurch hässlich / kaputt.
  Plan: alle neuen Komponenten als neue Dateien anlegen oder die alten
  wholesale ersetzen, dann `heizlast.astro` einmal umschalten,
  committen, pushen. Fertig.
- **Keine Sub-Agent-Delegation des Gesamtports.** Der general-purpose
  Agent hat das in Session 1 zurecht abgelehnt — zu viele Dateien,
  zu viel State-Wissen. Session 2 arbeitet die Blöcke selbst ab.
- **Keine Experimente im Rechenkern.** `state.ts`, `bindings.ts`,
  `compute.ts`, `constants.ts`, `calculations.ts` sind PROTECTED. Keine
  Signaturen ändern, keine Paths umbenennen. `types.ts` nur um die
  neuen `resolveDefault`-Cases erweitern — wenn überhaupt nötig.

## Binding-Contract (Mockup → State-Paths)

Der Mockup hat folgende Eingabefelder. Jedes braucht ein
`data-hz-bind="<path>"` + ggf. `data-hz-type="number"`. Die Pfade sind
aus dem aktuellen `state.ts`-Schema (Version 2) übernommen.

### Section 1 — Gebäude
| Mockup-Input           | data-hz-bind                           | Typ     |
|------------------------|----------------------------------------|---------|
| Projektname            | `projectName`                          | string  |
| Kunde                  | `customerName`                         | string  |
| Anschrift              | `address`                              | string  |
| Gebäudetyp (select)    | `gebaeude.typ`                         | string  |
| Lage (select)          | `gebaeude.lage`                        | string  |
| Bauperiode (select)    | `gebaeude.bauperiode`                  | string  |
| EBF [m²]               | `gebaeude.ebf`                         | number  |
| tvoll-Profil (select)  | `gebaeude.tvollProfil`                 | string  |
| tvoll-Override         | `gebaeude.tvollOverride`               | number  |
| Status (select)        | `status`                               | string  |

Zimmer-Liste (dynamisch, Event-Delegation wie in Section1Gebaeude alt):
pro Zeile `name | laenge | breite | flaecheDirekt | beheizt | × | ≡`.

### Section 2 — Heizlast (Methoden)
Jede Methode ist ein `<details class="method" name="heizlast-method">`.
Im Kopf steckt der "Diese Methode verwenden"-Switch (Checkbox), der den
`heizlast.methodsEnabled.{verbrauch|messung|bstd|override}`-Flag setzt.

Verbrauchsmethode:
- Energieträger → `heizlast.verbrauch.energietraeger`
- Verbrauch Ba → `heizlast.verbrauch.ba`
- Inkl. WW Checkbox → `heizlast.verbrauch.inklWW`
- η Override (OverrideField) → `heizlast.verbrauch.etaOverride`
- Perioden (dynamisch) → `heizlast.verbrauch.perioden[]`

Messungsmethode:
- Perioden → `heizlast.messung.perioden[]`

Bstd-Methode:
- Qh-WP [kW] → `heizlast.bstd.qhWP`
- Perioden → `heizlast.bstd.perioden[]`

Override:
- Qhl direkt [kW] → `heizlast.override.qhl`

Sanierung:
- Gate (Checkbox) → `heizlast.sanierungActive`
- Dropdown + Liste → `heizlast.sanierungMassnahmen[]`

### Section 3 — Warmwasser
- Main-Gate → `warmwasser.active`
- Methode (radio) → `warmwasser.method` (personen/direkt/messung)
- Personen-Einheiten → `warmwasser.personen[]`
- Direkt qww → `warmwasser.direkt.qww`
- Messung Liter/Tag → `warmwasser.messung.liter`
- ΔT Override → `warmwasser.deltaTOverride`
- Speicher-% (OverrideField) → `warmwasser.speicherProzent`
- Zirk-% (OverrideField) → `warmwasser.zirkProzent`
- Ausstoss-% (OverrideField) → `warmwasser.ausstossProzent`

### Section 4 — Zuschläge
- Sperrzeit-Gate → `zuschlaege.sperrzeitActive`
- toff (OverrideField) → `zuschlaege.toff`
- Qas Pool → `zuschlaege.qasPool`
- Qas Lüftung → `zuschlaege.qasLueftung`
- Qas manuell → `zuschlaege.qas`

### Section 5 — Speicher
- WW-Gate → `speicher.wwActive`
- WW-Solltemperatur (OverrideField) → `speicher.wwTStoAus`
- WW-Eintritt (OverrideField) → `speicher.wwTStoEinOverride`
- Puffer-Gate → `speicher.pufferActive`
- Puffer-Methode (select) → `speicher.pufferMethod`

### Section 5a — Leistungsdiagramm
Kein State-Binding — lokal im Component-Script, wie in Phase 5 dokumentiert.

### Section 6 — Projekt/Zusammenfassung
Nur Read-Only-Slots (`[data-hz-sum]` + `[data-kpi]`). Keine `data-hz-bind`.

## Notizen-Slots

- `notizen.sektion1` … `notizen.sektion6`
- `notizen.projekt` (der Gesamt-Notiz-Slot, nicht `sektion7`)

Jede Notiz ist `{ text: string }`. Keine `includeInExport` mehr (Block L
von Phase 9 hat das entfernt).

## Erwartete Topbar-Aktionen

Die Topbar-Action-Row hat sechs Buttons. IDs/Data-Attribute aus dem
alten Stand beibehalten, damit `heizlast.astro` sie per
`document.querySelectorAll('[data-hz-action="…"]')` findet:

| Mockup-Label          | data-hz-action        |
|-----------------------|------------------------|
| Zurücksetzen          | `new-project`          |
| Speichern             | `save-cloud`           |
| Projekte              | `open-projects`        |
| Neues Projekt         | (Alias zu `save-cloud-new`; Mockup nennt es "Als neues Projekt" in der Dropdown-Erweiterung, Button direkt ist `save-cloud-new`) |
| Export                | `export`               |
| Anmelden              | `login` + Textlabel in `[data-hz-login-label]` |

Der Login-Button bekommt zusätzlich `data-hz-login-label`-Span, dessen
Text `uiState.subscribe` zwischen "Anmelden" und "Abmelden" umschaltet.

## Commit-Workflow (Session 2)

Einziger Commit am Ende:

```
write_file("C:\Users\Daniel\Documents\thermowerk-website\commitmsg.txt",
  "Phase 10: Heizlast-UI-Port nach Mockup (atomarer Cutover)")
```

Dann Desktop-Commander cmd:
```
cd /d C:\Users\Daniel\Documents\thermowerk-website && ^
C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A && ^
C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt && ^
C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
```

Falls `.git\index.lock` hängt, Admin-PowerShell:
```
Remove-Item "C:\Users\Daniel\Documents\thermowerk-website\.git\index.lock" -Force -ErrorAction SilentlyContinue
```

## Tests (Session 2 · VOR Commit)

```
cd C:\Users\Daniel\Documents\thermowerk-website
C:\Progra~1\nodejs\node.exe --experimental-strip-types scripts/test-heizlast.ts
C:\Progra~1\nodejs\node.exe --experimental-strip-types scripts/test-heizlast-state.ts
```

Erwartung: 49 ✓ + ≥33 ✓. Falls rot: State-Schema nicht anfassen, sondern
das UI korrigieren.

## Acceptance manuell

Nach dem Push + Cloudflare-Build (1–3 min):

1. `/heizlast` lädt, keine Konsolenfehler.
2. FWS-Aufgabe 2 eintippen (Verbrauchsmethode, Ba=3600 l Heizöl,
   inklWW=true, vwuAbzug, toff=2, Sperrzeit=ja). Qhl-KPI = **12.55 kW**
   (± 0.05).
3. Login mit Projekt-Passwort → Cloud-Buttons aktiv → Projekt speichern
   → im ProjectsModal sichtbar → laden → löschen.
4. PDF-Export via Chrome "Als PDF speichern".
5. Mobile 375 + 768 px fluid.

Wenn alles grün: `CLAUDE.md` "Heizlast-Rechner — Status" um Phase-10-Zeile
ergänzen (am Ende der Phasenliste einfügen, analog zum Muster der
bisherigen Phasen 7–9).

## Empfohlene Datei-Reihenfolge in Session 2

1. `src/layouts/HeizlastLayout.astro` — wholesale replace.
2. `src/components/heizlast/SectionWrapper.astro` — wholesale replace.
3. `src/components/heizlast/SectionNotes.astro` → umbenennen auf
   `Notes.astro` ODER drin anpassen (roter Punkt nur bei
   `text.trim().length > 0`).
4. `src/components/heizlast/Gate.astro` — NEU.
5. `src/components/heizlast/Method.astro` — NEU.
6. `src/components/heizlast/Plausi.astro` — NEU.
7. `src/components/heizlast/OverrideField.astro` — patch (Chip "Standard · …").
8. `src/components/heizlast/InfoBox.astro` — patch (Mockup-Stil).
9. `src/components/heizlast/KpiCard.astro` — patch (Mockup-Stil).
10. `src/components/heizlast/Toggle.astro` — wird überflüssig (durch
    Gate/Method ersetzt); behalten, aber ungenutzt.
11. `src/components/heizlast/sections/Section1Gebaeude.astro` —
    wholesale replace.
12. Section2Heizlast, Section3Warmwasser, Section4Zuschlaege,
    Section5Speicher (umbenannt von Section6Speicher), Section6Projekt
    (umbenannt von Section7Projekt), Section5aDiagramm (umbenannt
    von LeistungsDiagramm) — alle wholesale replace.
13. `src/pages/heizlast.astro` — wholesale replace (neue Struktur:
    sechs Sektionen statt sieben, neue Topbar-Handler, identisches
    Glue-JS-Grundgerüst wie in Phase 6).
14. Tests laufen, Commit, Push, Acceptance.

Die alten Section5Auslegung-Komponente entfällt (ihr Endergebnis-Block
wohnt jetzt in Section6Projekt). ExecutiveSummary ist nur noch ein
Mount-Stub — im Mockup ersetzt die Topbar-Meta-Zeile die KPI-Sticky-Row;
entweder ExecutiveSummary leeren oder komplett entfernen (letzteres
sauberer).

## Mockup — groben Aufbau zum schnellen Zugriff

`mockups/section-1.html` ist 3268 Zeilen. Zeilen 23–1625 sind CSS,
Zeilen 1627–3267 sind HTML. Grobe Landkarte:

- CSS 23–105: Tokens (Ink-Ramp, Accent, Focus, Radien, Spacing,
  Fonts, Stripe-Max, Header-Row).
- CSS 106–227: Stripe + Topbar (brand-row + action-row) + Brand
  + Buttons (.btn, .btn--primary, .btn--ghost, .btn--danger-ghost).
- CSS 229–404: Section-Head, Field, Chip, Field-Reset (OverrideField).
- CSS 516–669: btn--dark, Notes, Section-Intro (P-Block mit Betonung).
- CSS 661–855: Methods (Accordion mit `<details name="heizlast-method">`).
- CSS 858–920: Gate (Toggle als Frage mit Switch-Optik).
- CSS 1019–1200: Plausi, Info-Box, Tooltip, Summary, Kpi.
- CSS 1201–1625: Modal, Print-@page, Sticky-Stat, Responsive-Breakpoints.
- HTML 1627–1850: Topbar (zwei Rows) + Section 1 Head + Projekt-Kopf.
- HTML 1850–2400: Section 1 Zimmer-Helfer + Section 2 Methoden.
- HTML 2401–2900: Section 3 Warmwasser + Section 4 Zuschläge.
- HTML 2900–3267: Section 5 Speicher + Section 5a Diagramm +
  Section 6 Zusammenfassung + Modale + Print-Cover.

Session 2 kann mit `sed -n '<start>,<end>p' mockups/section-1.html`
gezielt Blöcke holen, statt die 3268-Zeilen-Datei am Stück zu
laden (spart Context).
