# HANDOFF · Phase 9 — UX-Refactor: Defaults, Methodik vereinheitlicht, Notizen, Mobile-Polish

## Copy-Paste-Prompt für den nächsten Chat

```
Hallo Claude — bitte Phase 9 des Heizlastrechner-Redesigns umsetzen.

Lies in dieser Reihenfolge:
1. CLAUDE.md (Wissensbasis, Abschnitt "Heizlast-Rechner — Status" bis Phase 8)
2. HANDOFF-PHASE-9.md (diese Datei — Scope, Akzeptanz, Code-Pointer)
3. Falls nötig: HANDOFF-PHASE-8.md (für Header-/Mobile-Kontext)

Aktueller Stand: Phase 1–8 deployed (Commit b1d36f4). Rechenkern, UI, State,
Diagramm, Modals, Print-CSS, Header-Redesign, scharfkantiges Layout, Mobile-
Stapelung. Tests grün (49 + 16). Live: https://thermowerk-website.pages.dev/heizlast

Ziel Phase 9: Daniel hat das Tool produktiv mit eigenen Daten getestet und eine
strukturierte Refactor-Liste übergeben. Kern: weg vom "Methoden-Aktiv-Toggle"-
Modell hin zu klassischem "fülle Felder, das Tool entscheidet selbst", saubere
Defaults statt Placeholder-Hinweise, knappe professionelle Texte, Notizen
schlanker, Mobile-Worttrennung sauber, Logo-Proportionen.

Wichtige Rahmenbedingungen (NICHT verletzen):
- Sprache: Deutsch (Schweiz), kein "Du", keine Emojis.
- Rechenkern (src/lib/heizlast/calculations.ts + types.ts + constants.ts) NICHT
  ändern. Tests `node --experimental-strip-types scripts/test-heizlast.ts` und
  `scripts/test-heizlast-state.ts` müssen am Ende 49 + 16 grün sein.
- Keine \uXXXX-Escapes in UI-Dateien einführen — immer echte UTF-8-Zeichen.
- Knappe Antworten im Chat (User-Präferenz). Erledigtes nicht aufzählen, nur
  Fragen oder Auswahlpunkte erläutern.

Arbeite die Punkte in der Reihenfolge unten ab, ein Commit pro logischem Block,
Tests nach jedem Block. Am Ende: CLAUDE.md mit Phase-9-Block aktualisieren,
HANDOFF-PHASE-9.md als ABGESCHLOSSEN markieren, HANDOFF-PHASE-10.md anlegen
falls neue offene Punkte aufgetaucht sind.

Bei Cowork-Mount-Drift (git status zeigt Änderungen an Dateien die du nicht
angefasst hast, oder Files sind kürzer als HEAD): vor dem Edit
`git show HEAD:<pfad> > <pfad>` aus PowerShell zur Restauration laufen lassen.
Bei index.lock: `Remove-Item -Force C:\Users\Daniel\Documents\thermowerk-
website\.git\index.lock` über PowerShell, danach normaler git-Befehl.
```

---

## Scope

Phase 9 ist ein UX-Refactor — keine neue Logik im Rechenkern. Es geht darum,
dass das Tool sich wie ein professionelles Berechnungs-Tool anfühlt und nicht
wie ein Lern-Tutorial mit Aktiv-Schaltern.

---

## Aufgaben (in dieser Reihenfolge)

### Block A — Defaults statt Placeholder-Hinweise

**Problem:** Felder wie `tvoll` zeigen einen grauen Hinweis "leer = Default
verwenden". Der User möchte: Sobald die nötigen Vorbedingungen ausgefüllt
sind (Gebäudetyp, Lage, Bauperiode), wird der Default-Wert direkt sichtbar
ins Feld geschrieben und ist überschreibbar.

**Wirkungsweise:**
- Felder zeigen den Defaultwert als echten Wert (nicht Placeholder).
- Wird das Feld vom Nutzer überschrieben, bleibt sein Wert auch dann
  bestehen, wenn sich Vorbedingungen später ändern (Dirty-Flag pro Feld).
- Reset-Button (klein, dezent rechts neben dem Feld) bringt das Feld zurück
  auf den abgeleiteten Default.

**Code-Pointer:**
- `src/lib/heizlast/state.ts` — neue boolesche Schwester-Felder pro relevantem
  Override-Feld, z.B. `tvollUserOverride: boolean`. Alternativ ein generisches
  `overrides: Record<string, boolean>`-Subobjekt im State (sauberer).
- `src/components/heizlast/OverrideField.astro` — bisher Stift-Icon-Toggle;
  umbauen auf "Wert immer sichtbar, Reset-Pfeil rechts wenn dirty".
- Liste der betroffenen Felder (mindestens):
  - `gebaeude.tvoll` (Default aus Lage + Bauperiode → bestehende Funktion in
    `calculations.ts:tvollDefault`)
  - `warmwasser.deltaT` (Default 38 K → siehe `constants.ts`)
  - `warmwasser.cp` (Default 1.163 Wh/(L·K))
  - `warmwasser.fSpeicher`, `fZirk`, `fAusstoss` — siehe Block C unten
  - `speicher.ww.tEintritt` (Default 10 °C)
  - `speicher.ww.tAustritt` (Default 60 °C laut FWS)
  - `zuschlaege.toff` (siehe Block D)
  - Verbrauchs-Wirkungsgrad `eta` (per Energieträger)

**Akzeptanz:**
- Beim ersten Laden mit Standard-State sind alle abgeleiteten Felder bereits
  sichtbar gefüllt.
- Eingabe in einem Vorbedingungsfeld → abhängiges Default-Feld aktualisiert
  sich live.
- Manueller Override → Vorbedingungsfeld ändern → Override bleibt erhalten.
- Reset-Klick → Feld kehrt zum Default zurück, gilt wieder als nicht-overridden.

---

### Block B — Methodenwahl entfernen, Auto-Erkennung

**Problem:** Section 2 zwingt aktuell zur Wahl einer Methode (Verbrauch/
Messung/Bstd/Bauperiode/Override) per Aktiv-Toggle. Das ist verwirrend.

**Neuer Ansatz:**
- Alle Methoden-Bereiche bleiben sichtbar als separate, geschlossene
  Akkordeons (kein "aktiv"-Status, kein roter Streifen).
- Pro Akkordeon ein **Toggle-Schalter** "Diese Methode verwenden — Ja/Nein"
  (gleicher Stil wie Heizungspuffer-Toggle in Section 6).
- Default: alle aus.
- Wenn nur **Bauperiode-Methode** auf Ja steht → diese rechnet.
- Wenn ein User Verbrauchsdaten/Messung/Bstd zusätzlich aktiviert → die
  spezifischere Methode hat Vorrang (Hierarchie: override → bstd → messung →
  verbrauch → bauperiode).
- Wenn gar nichts aktiv: Bauperiode (M2D) rechnet automatisch im Hintergrund,
  sobald Lage + Bauperiode + EBF gesetzt sind. Kein Aktiv-Schalter, kein
  Hinweis nötig.
- Roter Aktiv-Balken am Rand komplett entfernen — nur normaler Container.

**Code-Pointer:**
- `src/lib/heizlast/state.ts` — `heizlast.method` ersetzen durch
  `heizlast.methodsEnabled: { verbrauch: boolean; messung: boolean; bstd:
  boolean; override: boolean; }`. `bauperiode` ist immer "an" als Fallback.
- `src/lib/heizlast/compute.ts` — `runCascade` an die Hierarchie anpassen
  (siehe oben). Plausi (Block H) immer mitrechnen.
- `src/components/heizlast/sections/Section2Heizlast.astro` — Toggle-Pattern
  von Section6 (`Speicher.aktiv` Ja/Nein-Switch) übernehmen, roten Active-
  Balken-CSS entfernen, "aktiv"-Pill entfernen, `.hz-method__badge` entfernen.
- `src/pages/heizlast.astro` — Glue für `[data-active="true"]` entfernen,
  stattdessen Toggle-Bindings.

**Akzeptanz:**
- Frischer State ohne Verbrauchsdaten: Bauperiode-Methode rechnet still im
  Hintergrund, Qhl wird angezeigt.
- Verbrauchsdaten ausfüllen + "Diese Methode verwenden = Ja" → Verbrauch hat
  Vorrang.
- Kein roter Streifen, kein Aktiv-Pill.

---

### Block C — Warmwasser-Defaults & Beschriftung

**Problem:** Felder wie "Wasserverbrauch" sind ohne Default leer, Labels
stehen halb in der Eingabe, Verluste-Defaults sind irreführend.

**Aufgaben:**
1. Label-Pattern vereinheitlichen: **groß = Begriff**, **klein darunter =
   Einheit/Kontext** (z.B. „Wasserverbrauch" / „Liter/Tag (Personen gesamt)").
   Bisher steht die Einheit oft im Klammer-Suffix. Eigene Klasse
   `.hz-field__hint { font-size: 12px; color: var(--hz-mid-gray); margin-top:
   2px; }` einführen und in allen Sektionen anwenden.
2. **Ausstossverlust-Default** prüfen und korrigieren — laut Daniel sollte
   der bei ca. 15 % liegen, nicht 0. In `constants.ts` nachsehen
   (`F_AUSSTOSS_DEFAULT`) und ggf. ergänzen + im State als Default setzen.
3. **Speicherverlust-Default** und **Zirkulationsverlust-Default** ebenso aus
   FWS prüfen und als sichtbare Defaults eintragen.

**Akzeptanz:**
- Alle drei Verluste haben sichtbare Defaults laut FWS-Standard.
- Labels durchgehend zweizeilig (Begriff / kleiner Hinweis darunter).

---

### Block D — Sperrzeit & Sonderzuschlag (Section 4)

**Problem:** Aktuell sind Hinweise wie „0 = keine Sperre" + lange Erklärungen.
Sperrzeit braucht stattdessen einen Ja/Nein-Toggle.

**Aufgaben:**
1. **Sperrzeit-Toggle**: Ganz oben in Section 4 ein „Sperrzeit vorhanden?"
   Ja/Nein-Switch. Bei Ja → Feld `toff` mit Standardwert (z.B. 2 h/d) wird
   sichtbar und override-fähig. Hint darunter klein: „Stunden/Tag".
2. EVU-Klammer entfernen, stattdessen unter dem Toggle in kleinem Text
   „Energieversorger" (siehe Hint-Klasse aus Block C).
3. **Erklärung „warum gibt es Sperrzeit"** entfernen. Stattdessen nur kurze
   Begriffserklärung „Sperrzeit-Zuschlag" / „Mehrleistung wegen abgeschalteter
   WP während EVU-Sperrzeiten". Kein Tutorial-Ton.
4. **Sonderzuschlag Qas**:
   - Aufklären, was Qas eigentlich ist und woher der Wert stammt. Recherche-
     Auftrag: in `reference/old-calculator/` und im FWS-Skript nachsehen, ob
     Qas (a) frei einzugeben ist, (b) aus Sperrzeit abgeleitet, oder (c)
     etwas anderes (z.B. Abtau-Reserve bei Luft-WP).
   - Ergebnis dieser Recherche entscheidet die UI:
     - Falls **frei einzugeben**: Feld immer sichtbar, mit Hint „optional —
       Richtwert: …" + Quelle aus FWS. Kein Aktiv-Toggle.
     - Falls **abgeleitet**: Feld read-only mit Override-Möglichkeit, Default
       wird angezeigt.
   - Hinweis „wird direkt zu Qh addiert" entfernen — selbsterklärend in der
     Summenformel-Darstellung (siehe Block F).
5. Aktiv-Klick für Qas entfernen — sobald ein Wert da ist, wird er gerechnet.

**Code-Pointer:**
- `src/components/heizlast/sections/Section4Zuschlaege.astro`
- `reference/old-calculator/js/heizlast.js` (für Qas-Quelle)
- `src/lib/heizlast/constants.ts` (Default-Werte)

---

### Block E — EBF-Helfer erweitern

**Problem:** Zimmer-Liste existiert bereits, braucht aber:
1. Möglichkeit, Flächen direkt einzugeben (nicht nur L × B).
2. Möglichkeit, **unbeheizte Räume abzuziehen** ("Aus EBF herausrechnen").
3. Direkte EBF-Eingabe weiterhin möglich (top-level Feld bleibt).

**Aufgaben:**
- Neuer Spalten-Typ in der Zimmer-Tabelle: Toggle „beheizt? Ja/Nein". Bei Nein
  wird die Fläche von der EBF-Summe abgezogen statt addiert.
- Neue Spalte oder zweites Feld pro Zimmer: „Direkte Fläche [m²]" — wenn
  ausgefüllt, hat sie Vorrang vor L × B.
- Summenzeile zeigt: „beheizt: X m² · abgezogen: Y m² · EBF: X − Y m²".
- Bestehender „Übernehmen"-Button schreibt das Netto-Resultat in `gebaeude.ebf`.

**Code-Pointer:**
- `src/lib/heizlast/state.ts` — `RaumInput` um `beheizt: boolean` und
  `flaecheDirekt: number | null` erweitern. `sumRaumFlaechen` zu
  `sumRaumFlaechenNetto` mit Abzug.
- `src/components/heizlast/sections/Section1Gebaeude.astro` — Tabellenzeile
  + Glue-Render in `heizlast.astro` anpassen.

---

### Block F — Section 5 (WP-Auslegung) entfernen, Endergebnis-Block neu

**Problem:** Section 5 doppelt sich mit der Zusammenfassung in Section 7
und nutzt die ungeliebten KPI-Boxen.

**Aufgaben:**
1. **Section 5 komplett entfernen** (Component-Datei + Import + Render in
   `heizlast.astro` + `id="sektion-5"`-Referenzen).
2. Den Inhalt (Summen-Darstellung Qhl + Qw + Qoff + Qas = Qh) in Section 7
   übernehmen, im schlanken Listen-Stil:

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

3. Begriff oben, Code (Qhl/Qw/...) klein darunter (siehe Block G).
4. Kein navy-Strich, keine Box pro Zeile, nur eine schlanke Tabelle/Grid mit
   dezentem Trenner.
5. Sektionen umnummerieren: aus 1–7 wird 1–6. Diagramm-Sektion-ID anpassen
   (`sektion-diagramm` darf bleiben).

**Code-Pointer:**
- `src/components/heizlast/sections/Section5Auslegung.astro` (löschen oder
  als Stub belassen wenn Mount-Permission das Löschen verhindert — siehe
  Phase-8-Erfahrung mit ExecutiveSummary).
- `src/components/heizlast/sections/Section7Projekt.astro` — neuer Ergebnis-
  Block oberhalb der „Projekt speichern"-Aktionen.
- `src/pages/heizlast.astro` — Imports + Reihenfolge.
- Section-Numerierung: alle Kicker („01 — Projekt", „02 — Heizlast", …)
  durchgehen und neu nummerieren.

---

### Block G — Label-Pattern vereinheitlichen + Erklärungen knapp

**Problem:** Aktuell „Qh = Qhl + Qw + Qoff + Qas — das ist die Zielleistung
der Wärmepumpe." (Tutorial-Ton). User möchte professionellen Berechnungs-
Werkzeug-Ton.

**Aufgaben:**
- Alle Sub-Heads und Eingabefelder umstellen auf:
  ```
  Sperrzeit
  Qoff (kW)
  ```
  Großer Begriff oben, kleines technisches Symbol + Einheit darunter. Eigene
  Klasse `.hz-field__symbol` oder Wiederverwendung von `.hz-field__hint`.
- Lange erklärende Sätze in Section-Sublines kürzen oder entfernen. Subline
  = max. ein Satz, neutral, ohne „das ist…".
- InfoBoxen: nur **was ist es**, keine **warum existiert es**. Bestehende
  InfoBoxen entsprechend kürzen:
  - Section 4: keine Erklärung „warum Sperrzeit" — nur Kurzdefinition.
  - Section 5 (entfällt): n/a.
  - Section 7: „wie werden Projekte gespeichert" → kürzen, Cloud-Erklärung
    raus (siehe Block I).
- Diagramm-Sektion: Erklärung ja, aber Titel „Diagramm-Erläuterung" oder
  „Begriffe", **nicht** „Wie lese ich das Diagramm?".
- „— Override"-Suffix bei allen Feldern entfernen (z.B. „Eintritt
  (Kaltwasser) — Override" → einfach „Eintritt (Kaltwasser)"). Override ist
  über das neue Reset-Pattern aus Block A ohnehin sichtbar.

---

### Block H — Plausibilität immer aktiv

**Problem:** Plausi ist aktuell ein Toggle. Soll immer mitlaufen.

**Aufgaben:**
- Plausi-Berechnung in `compute.ts` immer ausführen (nicht mehr abhängig vom
  Methoden-Active-State).
- Anzeige (Ampel) bleibt in der Ergebnis-Summary von Section 7.
- Im **Export-Modal** als Checkbox „Plausibilitätscheck einschließen" (default
  an), damit man sie für eine reine Auslegungs-PDF abwählen kann.

**Code-Pointer:**
- `src/lib/heizlast/compute.ts` — Plausi-Block immer ausführen.
- `src/components/heizlast/ExportModal.astro` — neue Checkbox `plausi`.
- `src/lib/heizlast/export.ts` — `ExportPart` Type um `plausi` erweitern,
  Print-CSS-Block in `HeizlastLayout.astro` `body.hz-print-mode:not(.hz-print-
  plausi-on) [data-hz-plausi]` ausblenden.

---

### Block I — Speichern-Block (Section 7) entschlacken

**Aufgaben:**
1. Cloud-Buttons + Cloud-Hinweise nur für eingeloggte User rendern (oder
   einklappen, wenn nicht eingeloggt). Im Logout-Zustand: nur „Lokal wird
   automatisch gespeichert"-Hinweis + Login-Button.
2. „Letzte Cloud-Speicherung: —" entfernen.
3. „Wie werden Projekte gespeichert?" InfoBox entfernen (Cloud-Teil
   selbsterklärend für eingeloggte, lokal-Teil als ein Satz oben drüber).
4. „Neues Projekt"-Button:
   - Mistkübel-Icon entfernen (impliziert „löschen").
   - Bei Klick **immer** Bestätigungsdialog: „Aktuelles Projekt verwerfen?
     Eingaben gehen verloren." Mit Sekundär-Aktion „Vorher exportieren".
   - Für eingeloggte User mit ungespeichertem Stand: Confirm-Text ergänzen um
     „Aktuelle Änderungen wurden noch nicht in der Cloud gespeichert."
5. **Beforeunload-Warnung**: Wenn isDirty + isAuthenticated + nicht gerade
   Cloud-Save → `beforeunload`-Listener mit `event.preventDefault()` und
   `event.returnValue = ''`. Browser zeigt dann Standard-Warnung. Listener
   nur registrieren wenn die Bedingungen stimmen.

**Code-Pointer:**
- `src/components/heizlast/sections/Section7Projekt.astro`
- `src/pages/heizlast.astro` — beforeunload + Confirm-Modal-Logik.
- `src/lib/heizlast/state.ts` — `isDirty` existiert bereits.

---

### Block J — Speicher-Rundung Realismus

**Aufgaben:**
1. **Recherche** (web search): Welche Speicherstaffelung ist im Schweizer
   WP-Markt üblich? 50 L? 100 L? Pro Hersteller (Hoval, Stiebel Eltron,
   Viessmann, Domotec, Buderus). Dokumentieren in `reference/`.
2. Resultat:
   - Wenn 50-L-Schritte üblich → `wwSpeicherGerundet = roundUp(roh, 50)`.
   - Wenn 100-L-Schritte ab >300 L → gestaffelt: `<200 → 50er, 200–500 →
     100er, ab 500 → 200er`.
3. UI zeigt beides: „Berechnungswert 295 L · Empfehlung 300 L" (oder
   passend zur neuen Rundung).
4. Test in `scripts/test-heizlast-state.ts` anpassen — der WW-Speicher-
   Round-Test wird jetzt auf 50er prüfen, nicht 10er. **Beide Tests müssen
   am Ende grün bleiben.**

**Code-Pointer:**
- `src/lib/heizlast/calculations.ts` — `roundWWSpeicher` o.ä.
- `src/components/heizlast/sections/Section6Speicher.astro` — Anzeige
  `Berechnungswert X · Empfehlung Y`.
- Gleiches Vorgehen für Pufferspeicher.

---

### Block K — Heizungspuffer-Methode default

**Problem:** Section 6 zeigt Methoden (Abtau/Takt/Err/Sperrzeit) ohne Hinweis,
welche in CH üblich ist.

**Aufgaben:**
- Recherche: Welche Puffer-Berechnung ist in CH-WP-Auslegungen Standard?
  Mein Tipp: Sperrzeit-basiert für EVU-gesperrte Anlagen, sonst Taktreduktion.
- Default-Methode setzen + im UI klein „(Standard CH)" hinter dem Methoden-
  Namen.
- Andere Methoden bleiben als Auswahl, aber nicht als gleichwertig
  präsentiert.

---

### Block L — Notizen-Block schlanker

**Aufgaben:**
1. „Ausgefüllt"-Badge rechts an jedem `SectionNotes`-Toggle entfernen.
2. Stattdessen ein dezentes Navy-Rufzeichen-Icon (kleines `i` oder `!` im
   Kreis) **nur** dann sichtbar, wenn Text vorhanden ist.
3. „In Export einbeziehen"-Checkbox pro Notiz **entfernen**.
4. Im **Export-Modal** stattdessen zwei globale Checkboxen:
   - „Notizen je Bereich" (alle Section-Notizen)
   - „Notizen Projekt" (eine optionale Projekt-übergreifende Notiz —
     bestehender `notizen.sektion7` kann das übernehmen oder ein neuer
     `notizen.projekt`-Slot).

**Code-Pointer:**
- `src/components/heizlast/SectionNotes.astro`
- `src/lib/heizlast/state.ts` — `SectionNote.includeInExport` raus, neuer
  `notizen.projekt: SectionNote`.
- `src/components/heizlast/ExportModal.astro` — zwei neue Checkboxen
  `notizenBereiche` und `notizenProjekt`.
- `src/lib/heizlast/export.ts` + `HeizlastLayout.astro` Print-CSS-Block.

---

### Block M — Mobile-Polish: Worttrennung & Logo

**Problem:** Auf Mobile werden Wörter mitten umgebrochen oder nur der letzte
Buchstabe rutscht in eine neue Zeile (siehe User-Screenshots).

**Aufgaben:**
1. `.hz-scope` Mobile-CSS:
   - `hyphens: manual;` (verhindert ungewollte Trennungen)
   - `overflow-wrap: break-word;` statt `anywhere` (anywhere zerreißt mitten
     im Wort).
   - Wo bestimmte Labels chronisch lang sind, zusätzlich `font-size:
     clamp(13px, 3.6vw, 15px);` pro Element setzen.
   - Für lange Sub-Heads: `text-wrap: balance;` testen (gute Browser-Support
     seit 2024).

2. Logo:
   - Auf Mobile: Logo-`<img>` aktuell `height: 26px` — Proportionen werden
     gestaucht weil `.hz-brand__text` daneben Platz frisst und das Image
     zusätzlich `width: auto` hat aber Container `display: inline-flex`
     mit Wrapping. Lösung: `height: 32px; width: auto; max-width: none;`
     und `.hz-brand__text { display: none; }` auf Mobile (steht schon, aber
     prüfen). Wichtig: keine `max-width: 100%` auf das Logo selbst (kommt
     aus globaler `.hz-scope img` Regel, mit `.hz-brand__logo { max-width:
     none; }` overriden).
   - Auf Desktop: Logo links **bündig** mit der `.hz-container`-Linke
     (max-width 1120px, mittig). Aktuell ist `.hz-topbar__inner` mit
     `max-width: 1160px` etwas breiter — auf 1120px setzen oder
     `.hz-container` als Wrapper verwenden.
   - Text „Thermowerk" rechts vom Logo entfernen (`.hz-brand__text`-Span
     komplett raus, nicht nur display:none — Logo enthält das Wort bereits).

**Code-Pointer:**
- `src/layouts/HeizlastLayout.astro` (Logo + Mobile-Block)

---

## Akzeptanzkriterien (Phase 9 abgeschlossen wenn …)

- Tests `node --experimental-strip-types scripts/test-heizlast.ts` und
  `scripts/test-heizlast-state.ts` grün (49 + 16, ggf. angepasste WW-
  Speicher-Rundung).
- Cloudflare-Build des letzten Commits grün, `/heizlast` lädt ohne Konsolen-
  Fehler.
- Section 5 ist weg, Sektionen sind 1–6 nummeriert (Diagramm bleibt 05a
  oder wird zu „4a", egal — konsistent).
- Kein roter Aktiv-Balken am Methoden-Pane mehr.
- Defaults sichtbar in allen abgeleiteten Feldern (tvoll, ΔT, cp, Verluste,
  Speicher-Temperaturen).
- Sperrzeit per Ja/Nein-Toggle, kein „0 = keine Sperre"-Hinweis.
- Notizen ohne „ausgefüllt"-Badge, mit dezentem Indikator-Icon wenn gefüllt.
- Logo nicht mehr verzerrt auf Mobile, „Thermowerk"-Text neben dem Logo weg.
- Export-Modal hat „Notizen je Bereich" + „Notizen Projekt" + „Plausibilität".
- Confirm-Dialog beim „Neues Projekt", beforeunload-Warnung wenn Cloud-
  pflichtiger Stand ungespeichert.
- Speicher-Rundung an realistische Markt-Staffelung angepasst,
  „Berechnungswert X · Empfehlung Y" sichtbar.

---

## Bekannte Stolpersteine aus Phase 7/8

- **Cowork-Mount-Drift**: Beim Bearbeiten in `src/lib/heizlast/state.ts` und
  `src/pages/heizlast.astro` (große Files) vor dem ersten Edit
  `git status` prüfen; bei Diff zu Files die nicht angefasst wurden, mit
  `git show HEAD:<pfad> > <pfad>` (PowerShell) restaurieren.
- **index.lock**: Fix per `Remove-Item -Force` (PowerShell), nicht `del`
  (cmd schafft es im Mount nicht zuverlässig).
- **astro check** läuft in der Linux-Sandbox nicht (Rollup-Native für
  Windows installiert). Cloudflare-Build ist die Abnahme.
- Beim Editieren der UI-Dateien NIE `\uXXXX`-Escapes einführen (Build-Pipeline
  zeigt sie als Rohtext). Immer echte UTF-8.
