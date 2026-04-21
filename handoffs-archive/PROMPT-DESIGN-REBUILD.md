# Prompt für neuen Chat — Heizlast-Rechner Design komplett neu aufbauen

> **Kopiere den Block unten 1:1 in den neuen Chat.**

---

```
Thermowerk-Website — `/heizlast` Design-Rebuild FROM SCRATCH

KONTEXT
Der Heizlast-Rechner unter /heizlast ist funktional komplett (Rechenkern, State, Bindings,
Auth, Export, Persistierung). Die Rechenlogik läuft stabil — 49 Rechenkern-Tests + 33
State-Tests grün. ABER: Das Design/Layout ist durch viele iterative Patches in Phase 8
und Phase 9 inkonsistent, unruhig, mit ungleichen Feldbreiten, überlappenden Elementen,
schlecht platzierten Toggles und visuell unordentlichem Eindruck. Mehrere Versuche, das
in kleinen Schritten zu flicken, sind gescheitert.

DEINE AUFGABE
Baue die komplette VISUELLE Ebene von /heizlast von Grund auf neu. NICHT patchen, NICHT
iterieren — neu bauen.

WAS „NEU BAUEN" BEDEUTET
- Alle CSS-Tokens (--hz-*), Layout-Regeln, Spacings, Typografie, Farben in
  `src/layouts/HeizlastLayout.astro` dürfen komplett neu geschrieben werden.
- Alle Komponenten-Styles in `src/components/heizlast/` und deren Sub-Ordner dürfen
  komplett neu geschrieben werden.
- Die HTML-Struktur der Komponenten darf umgebaut werden, solange:
  - jedes `data-hz-bind="…"` Attribut am richtigen Input erhalten bleibt
  - jedes `data-hz-type`, `data-kpi`, `data-hz-sum`, `data-hz-action`, `data-hz-modal-*`,
    `data-ww-pane`, `data-hz-brand-sub`, `data-hz-header-project`, `data-hz-header-meta`,
    `data-print-slot`, `data-hz-override-field`, `data-default` Hook erhalten bleibt
  - jede `id` die vom JS-Glue in `src/pages/heizlast.astro` angesprochen wird erhalten bleibt
- Primitive-Komponenten (`Toggle.astro`, `OverrideField.astro`, `KpiCard.astro`,
  `InfoBox.astro`, `SectionNotes.astro`, `SectionWrapper.astro`) dürfen komplett
  neu gestaltet werden (Look, innere DOM-Struktur, CSS), solange die Props-API gleich
  bleibt und die Data-Hooks stimmen.

WAS NICHT GEÄNDERT WERDEN DARF
- `src/lib/heizlast/state.ts` — Datenmodell, Store-API, Default-State, Migration
- `src/lib/heizlast/compute.ts` — Rechenkaskade
- `src/lib/heizlast/calculations.ts` — Formeln
- `src/lib/heizlast/bindings.ts` — Data-Binding-Vertrag (getPath/setPath/syncOverrideClasses)
- `src/lib/heizlast/storage.ts` — localStorage-Layer
- `src/lib/heizlast/projects.ts` — Cloud-API
- `src/lib/heizlast/export.ts` — PDF/JSON-Export-Logik
- `src/lib/heizlast/constants.ts` — FWS-Konstanten
- `scripts/test-heizlast.ts`, `scripts/test-heizlast-state.ts` — Tests müssen grün bleiben
- `functions/api/heizlast-*.js` — Cloudflare Functions

Die Rechenlogik ist fertig. Nur die Präsentationsschicht wird neu gebaut.

VORGEHEN (STRIKT)
1. Lies zuerst diese Dateien (nur als INHALTS-Quelle für Labels, Hints, Strukturen,
   Feld-Namen, Bindings — NICHT als Styling-Vorbild!):
     - `CLAUDE.md` (Phasenhistorie, Commit-Workflow, bekannte Fallstricke)
     - `src/pages/heizlast.astro` (Mount-Reihenfolge der Sektionen + kompletter JS-Glue)
     - `src/layouts/HeizlastLayout.astro` (welche Tokens und Slots existieren heute)
     - `src/components/heizlast/SectionWrapper.astro`
     - `src/components/heizlast/sections/Section1Gebaeude.astro`
     - `src/components/heizlast/sections/Section2Heizlast.astro`
     - `src/components/heizlast/sections/Section3Warmwasser.astro`
     - `src/components/heizlast/sections/Section4Zuschlaege.astro`
     - `src/components/heizlast/sections/Section5Auslegung.astro` (falls noch vorhanden)
     - `src/components/heizlast/sections/Section6Speicher.astro`
     - `src/components/heizlast/sections/Section7Projekt.astro`
     - `src/components/heizlast/SectionNotes.astro`
     - `src/components/heizlast/OverrideField.astro`
     - `src/components/heizlast/KpiCard.astro`
     - `src/components/heizlast/InfoBox.astro`
     - `src/components/heizlast/Toggle.astro`
     - `src/components/heizlast/ExecutiveSummary.astro`
     - `src/components/heizlast/LeistungsDiagramm.astro`
     - `src/components/heizlast/PrintCover.astro`
     - `src/components/heizlast/LoginModal.astro`
     - `src/components/heizlast/ProjectsModal.astro`
     - `src/components/heizlast/ExportModal.astro`
     - `src/lib/heizlast/state.ts` (nur lesen — Feldnamen + Pfade für Bindings verstehen)
     - `src/lib/heizlast/bindings.ts` (nur lesen — Binding-Vertrag verstehen)
     - Die Haupt-Website zum Abgleich des visuellen Standards:
       `src/pages/index.astro`, `src/layouts/Layout.astro`, `src/components/Hero.astro`,
       `src/components/Contact.astro` — das ist das Qualitätsniveau, das /heizlast erreichen soll.

2. Entwirf ein sauberes Design-System für /heizlast, das sich am Qualitätsniveau der
   Haupt-Website orientiert (gleiche Farben, gleiche Schriftfamilien, gleiche
   Spacing-Logik), aber als eigenständige App-Oberfläche auftritt.

3. Schreibe Layout + Komponenten neu — in EINEM sauberen Wurf, nicht in Mini-Diffs.

4. Führe die Tests aus (sollen weiterhin grün sein):
     node --experimental-strip-types scripts/test-heizlast.ts
     node --experimental-strip-types scripts/test-heizlast-state.ts
   Falls ein Test bricht: Rechenkern/State wurden verletzt — zurückrollen.

5. Commit via Desktop Commander (cmd) nach dem in CLAUDE.md dokumentierten Workflow.
   Commit-Message: „Phase 10 / Paket D3: Design-Rebuild /heizlast komplett neu"

ANFORDERUNGEN AN DAS NEUE DESIGN

A) Seitenrahmen + Container
- Der Seiten-Content ist ein ZENTRIERTER STREIFEN mit sichtbaren Rändern links/rechts,
  NICHT vollflächig auf Viewport-Breite. Auf breiten Monitoren (>1200 px) soll links
  und rechts vom Content klar Hintergrundfläche stehen.
- Vorschlag: `max-width: clamp(920px, 68vw, 1120px)`, zentriert, mit mindestens 24 px
  horizontalem Padding innen. Finale Werte liegen in deinem Ermessen, aber der
  Effekt „contained column mit ruhigen Rändern" ist Pflicht.
- Hintergrund ausserhalb des Streifens: dezente Off-White-Fläche mit minimalem
  Texture-Gradient oder glatt — muss zum Marketing-Layout passen.

B) Sticky Header
- Logo links, bündig mit der linken Kante des Content-Streifens (nicht bündig mit der
  Viewport-Kante).
- Mitte: kompakter Projektkontext — Projektname (gross) + Meta-Zeile (Kunde · Adresse),
  beide live aus dem State (`data-hz-header-project`, `data-hz-header-meta` bleiben).
- Rechts, bündig mit der rechten Kante des Content-Streifens: Icon-Button-Leiste mit
  fünf Aktionen (Logo-Reihenfolge frei, aber konsistent gespacet):
      1. Neues Projekt (Trash/Plus-Icon, öffnet Confirm wie bisher)
      2. Speichern (Cloud-Save, nur sichtbar wenn authentifiziert)
      3. Projekte öffnen (Folder-Icon, nur wenn authentifiziert)
      4. Exportieren (Download-Icon)
      5. Login/Logout (User-Icon, Label-Toggle)
  Alle Buttons haben `aria-label` und konsistente Hover-States.
- Header ist `position: sticky; top: 0`, ExecutiveSummary darf WEGFALLEN oder in eine
  kleine einzeilige KPI-Leiste direkt unter dem Header wandern — deine
  Design-Entscheidung.
- Mobile (≤640 px): Header einzeilig mit Logo links + Burger-Menü rechts, das alle
  Aktionen in einem Dropdown anbietet. KEINE horizontalen Scrollbars.

C) Sektions-Layout
- Jede Sektion hat:
    Kicker (rot, uppercase, klein) — z.B. „01 · GEBÄUDE"
    Titel (H2, serif-nah oder Marken-Sans, gross)
    optional Subline (grau, regulär)
    dann Content-Grid
- Content-Grid: 12-Spalten-CSS-Grid innerhalb des Content-Streifens; jedes Feld
  sitzt auf 3/4/6/8/12 Spalten je nach Typ (siehe D).
- Zwischen Sektionen: grosszügiger vertikaler Abstand (z.B. clamp(56px, 8vh, 96px)),
  NICHT gequetscht.
- Abwechselnder Hintergrund (tone=white / tone=off) wie in `SectionWrapper.astro`
  Phase-2-Kanon ist okay — der visuelle Kontrast darf aber stärker oder subtiler
  werden als heute.

D) Felder — UNIFORME BREITEN
- Eingabefelder haben FESTE intrinsische Breiten abhängig vom Typ:
    Number-Input ohne Einheit: 160 px
    Number-Input mit Einheit (Unit-Suffix im Feld selbst): 200 px
    Number-Input „Prozent": 120 px
    Select: 280 px (einzeilig) oder 320 px (lange Optionen)
    Text-Input kurz (Kunde, Ort, PLZ): 260 px
    Text-Input lang (Projektname, Adresse): 100 % der Grid-Zelle
    Date-Input: 180 px
- Zwei Felder in einer Grid-Zelle nebeneinander werden links-bündig gesetzt, nicht
  rechts-justified. Kein Feld ist breiter als seine Grid-Zelle.
- Einheit (kW, h, %, m², °C, l) wird als `<span class="hz-unit">` INNERHALB des
  `.hz-field` rechts am Rand dargestellt, NICHT als separates Label über dem Feld.
  Doppelte Einheiten-Angaben (z.B. „Tvoll [h]" UND „h" im Feld) sind zu eliminieren —
  entweder die Einheit ist im Label, oder im Feld, niemals beides.
- Label IMMER oberhalb des Feldes, linksbündig, kleine Navy-Schrift, uppercase optional.
- Hint/Hilfstext IMMER unterhalb des Feldes, linksbündig, max-width = Feldbreite,
  keinesfalls breiter. Typografisch kleiner und grau.
- Wenn ein Feld ein OverrideField ist: Stift-Icon rechts im Feld (nicht daneben),
  Reset-Pfeil erscheint an derselben Position wenn `.is-overridden`.

E) Toggles statt Checkboxen
- ALLE booleschen Ja/Nein-Entscheidungen werden als iOS-Style-Toggle-Switch
  implementiert, nicht als klassische Checkbox.
- Komponente `Toggle.astro` ist bereits vorhanden (aufklappbare Module) — dort
  bitte zusätzlich eine Variante `variant="switch"` einführen oder eine neue
  `ToggleSwitch.astro` bauen, die einen reinen An/Aus-Schalter zeigt (ohne
  aufklappbaren Content).
- Betrifft: Warmwasser active, Raumliste aktiv, Puffer active, Sperrzeit active,
  Plausi-Anzeige (falls überhaupt noch ein Toggle), Sanierung-Eintrag „ausgeführt/geplant",
  Export-Checkboxen (auch dort Toggles statt Checkboxen), Raum „beheizt", Notizen
  „Export" (sofern noch vorhanden). Und jeden anderen Boolean im Formular.
- Radiobuttons bleiben Radiobuttons — nur Checkboxen werden zu Switches.

F) KPI-Kacheln + Ergebnis-Block
- Konsistente Höhe in einer Reihe, Werte ZENTRIERT innerhalb der Kachel,
  Einheit rechts unten klein.
- Hero-Kachel (Qh) klar abgesetzt: rote Oberkante, grössere Zahl, weisser
  Hintergrund mit Shadow.
- Die KPI-Kachel „Plausi (W/m²)" zeigt Ampel-Punkt links neben der Zahl, nicht
  darüber.

G) InfoBox
- Dezenter Blue-Tint-Hintergrund, Icon links, Titel fett, Pfeil rechts.
- Wenn geöffnet: sauberer Text-Block mit Listen/Code/Links, max-width auf
  Lesbarkeit optimiert (60–72 Zeichen).

H) SectionNotes
- Ghost-Toggle (Text-Button mit Notizblock-Icon), standardmässig zugeklappt.
- Roter, kleiner „Ausrufezeichen"-Indikator NUR sichtbar wenn Text existiert
  (Länge > 0). Heute ist das blau/immer-sichtbar — bitte umbauen.
- Klick auf Ghost-Toggle muss die Notiz-Textarea korrekt öffnen (der aktuelle
  Bug, dass sie nicht aufklappt, muss weg).
- Beim Öffnen Focus direkt in die Textarea.

I) Section 1 — Gebäude
- Projektname/Status oben in einer Leiste (Navy-Tint oder neutral), darunter
  das normale Formular-Grid.
- „EBF aus Zimmermassen"-Helfer: NICHT rechts neben EBF in einer schmalen
  Spalte, sondern als aufklappbarer Toggle UNTER dem Grid, volle
  Container-Breite. Tabelle Zimmer hat eigene saubere Spaltenbreiten.
- Tvoll-Override-Feld in einem logischen Grid-Platz (3 oder 4 Spalten), nicht
  rechts abgesetzt. KpiCard für „aktueller Tvoll-Wert" kann raus oder als
  dezente Live-Anzeige.

J) Section 2 — Heizlast-Methoden
- Hierarchie (Override > Bstd > Messung > Verbrauch > Bauperiode) im
  InfoBox-Text klar erklärt.
- Jede Methode ist ein eigenes aufklappbares Modul (bestehender `Toggle.astro`).
- Ein Methoden-Switch („Diese Methode verwenden") oben im Panel — implementiert
  als ToggleSwitch, nicht als Checkbox.
- Aktive Methode visuell deutlich (schmaler roter Balken links am
  Toggle-Header + kleines „aktiv"-Pill rechts).
- Sanierung-Block bleibt unten: Liste der Einträge + Dropdown + Eigener Eintrag.
- Plausi-Live-Anzeige (W/m²) als KPI-Kachel rechts oder unten, Ampel sauber.

K) Section 3 — Warmwasser
- Main-Toggle oben: „Warmwasser via Wärmepumpe" — ToggleSwitch.
- Methoden-Radio: Personen / Direkt / Messung — horizontale Radiogruppe, nicht
  als drei grosse Toggles.
- Drei Panes entsprechend eingeblendet.
- Verluste (Speicher/Zirk/Ausstoss) als drei gleich breite Number-Inputs
  nebeneinander im 3-Spalten-Grid, Einheit „%" im Feld.

L) Section 4 — Zuschläge
- Sperrzeit-ToggleSwitch oben. Wenn an: Eingabefelder (toff oder Datumsliste
  wenn Phase-10-Paket-B-Features da sind) erscheinen darunter.
- Qas-Feld als normales Number-Input mit Einheit „kW".

M) Section 5 / 5a — Auslegung + Leistungsdiagramm
- Der grosse Qh-Block ist entweder in Section 5 ODER in Section 7 (je nach
  Phase-9-Block-F-Stand, siehe CLAUDE.md). Beim Rebuild bitte prüfen wo er
  aktuell sitzt und dort lassen.
- Leistungsdiagramm-Sektion: Canvas nimmt volle Container-Breite,
  Controls (Modell-Dropdown, θGT, θne, Reset) in einer sauberen Toolbar
  darüber; Stützpunkt-Tabelle bleibt im `<details>`-Accordion.
- Chart.js-Optionen (Farben, Achsen, Legende) dürfen neu gestaltet werden,
  aber die Datasets-Struktur und `#hz-diag-canvas` + `#hz-diag-meta` bleiben.

N) Section 6 — Speicher
- Zwei Karten nebeneinander auf breitem Viewport, untereinander ab ≤720 px.
- Jede Karte: ToggleSwitch oben, Inputs darunter, Empfehlung-Zeile unten
  (Berechnungswert · Empfehlung).

O) Section 7 — Projekt + Zusammenfassung
- Definition-List der Kennwerte in sauberem 2-Spalten-Grid.
- Grosser Qh-Ergebnis-Block (falls hier).
- Save-Actions-Block nur noch dezent — die HAUPTAKTIONEN liegen ab jetzt im
  Header. Hier unten eventuell nur noch ein Sekundär-„Exportieren"-Button
  als Fallback.

P) Modale
- LoginModal, ProjectsModal, ExportModal bekommen eine einheitliche Optik:
  Card mit 16–20 px Radius, sauberem Shadow, Header mit Titel + Close-X,
  Footer mit primärer + sekundärer Action. Export-Modal benutzt ToggleSwitches
  statt Checkboxen für die Inhalts-Auswahl.

Q) Print / PDF
- Print-CSS bleibt funktional bestehen (siehe HeizlastLayout.astro
  `@media print`-Block). Die sichtbaren Inhalte dürfen neu gestaltet werden,
  aber die `hz-print-*-on`-Klassen und `@page`-Regeln müssen weiter greifen.

R) Farbsystem
- Basis aus Marketing-Seite: Navy `#1B2A4A` (Haupt-Akzent), Rot `#C8102E`
  (Highlight/Primäraktion), Off-White `#F5F2ED`, Weiss, Blue-Tint `#E8EDF5`
  (InfoBoxen). Dazu Grautöne 400/500/600/700 für Text-Hierarchie.
- Keine Regenbogen-Farben, keine Neon-Akzente. Ruhiges, professionelles Bild.

S) Typografie
- Heading-Font: Outfit oder Marken-Serif (wie auf der Homepage — prüfen).
- Body-Font: DM Sans (wie auf der Homepage).
- Körpergrösse fluid `clamp(15px, 0.3vw + 14px, 17px)`.
- Headings fluid mit `text-wrap: balance`.
- KEIN mid-word hyphen (bestehende Regel aus Phase 9 / Block M beachten).

T) Abstände
- Vertikale Abstände innerhalb einer Sektion: 16/24/32 px je nach Kontext.
- Zwischen Sektionen: 56–96 px fluid.
- Zwischen Feld-Label und Feld: 6 px.
- Zwischen Feld und Hint: 4 px.
- Zwischen zwei Feldern in einer Grid-Zelle: 12 px horizontal oder 16 px vertikal.

U) Keine „wilden" Cross-over-Elemente
- Nichts darf aus seinem Grid-Bereich ausbrechen und über benachbarte Felder
  laufen. Kein „Tvoll"-Feld, das höher ist als sein Nachbar. Keine Einheiten
  doppelt. Kein absolut positioniertes Icon, das auf mobilen Viewports in
  Nachbar-Elemente rutscht.

V) Accessibility
- Alle Toggles haben `role="switch"` + `aria-checked`.
- Alle Icon-Buttons haben `aria-label`.
- Focus-Ringe sichtbar und einheitlich (2 px rot, Offset 2 px).
- Tab-Reihenfolge folgt dem visuellen Fluss.

TESTS AM ENDE
1. `node --experimental-strip-types scripts/test-heizlast.ts` → 49 grün
2. `node --experimental-strip-types scripts/test-heizlast-state.ts` → 33 grün
3. Cloudflare-Build grün (manuell abzunehmen)
4. Manuelle Abnahme /heizlast:
     - Desktop 1920 px breit: Content-Streifen zentriert mit sichtbaren Rändern.
     - Desktop 1440 px: gleiche Optik.
     - Tablet 768 px: Grid kollabiert sinnvoll, keine horizontalen Scrollbars.
     - Mobile 390 px: alles einspaltig, Felder voll breit, Header einzeilig.
     - FWS-Aufgabe 2 live eintippen → Qhl = 12.55 kW.
     - Save / Load / Export funktional.

COMMIT-WORKFLOW
Siehe CLAUDE.md → Abschnitt „Verifizierter Commit-Workflow".
Commit-Message: „Phase 10 / Paket D3: Design-Rebuild /heizlast komplett neu"

ERSTE SCHRITTE
1. CLAUDE.md lesen (komplette Phasenhistorie + Fallstricke).
2. Mount-Order und Glue-JS in `src/pages/heizlast.astro` einmal ganz durchlesen —
   dort stehen ALLE Data-Hooks, die du einhalten musst.
3. Die drei Marketing-Komponenten Hero/Contact/Layout auf der Haupt-Website einmal
   visuell im Browser ansehen (https://thermowerk-website.pages.dev) — das ist
   der Qualitätsmassstab.
4. Design-System als CSS-Token-Tabelle skizzieren (Spacings, Farben, Typografie,
   Feld-Breiten).
5. Layout neu schreiben, Komponenten eine nach der anderen neu aufbauen.
6. Tests, dann Commit.

Viel Erfolg. Baue es so, wie du es dem Kunden stolz zeigen würdest.
```

---

## Hinweise für Daniel

- Der Prompt ist bewusst lang und strukturiert — damit der neue Chat ohne Rückfragen
  loslegen kann und alle Designanforderungen auf einmal versteht.
- Wichtigste Schutzklausel: `state.ts`, `compute.ts`, `calculations.ts`, `bindings.ts`,
  `storage.ts`, `projects.ts`, `export.ts`, `constants.ts` + die beiden Test-Skripte
  dürfen NICHT angefasst werden. Damit bleibt die Rechenlogik garantiert intakt.
- Bestehende Komponenten dienen dem neuen Chat nur zur Inhalts-Extraktion
  (Labels, Bindings, Hints, Reihenfolge). Das Styling wird komplett neu geschrieben.
- Erwartbare Dauer im neuen Chat: gross. Das ist ein ganzer Design-Durchgang, kein
  Mini-Patch. Rechne mit mehreren Commits oder einem grossen Commit am Ende.
