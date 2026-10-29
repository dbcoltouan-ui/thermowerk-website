# Befund UX / Navigation / Datenfluss / State / Dashboard / Bericht

Prüfgegenstand: `src/ui.mjs` (3459 Zeilen), `src/main.mjs`, `src/state.mjs`, `src/persistence.mjs`, `src/projects.mjs`, `src/export.mjs`, `src/offerte-ui.mjs`, `src/index.html`, `src/style.css`, gebautes Bundle (identisch mit `build/dist/index.html`, per `cmp` geprüft).
Methode: Code-Lektüre, Datenfluss-Proben im Node (`compute`, `computeBuildingDetailLoad`, `computeDistribution`, `computeHeatpumpResult`, Resolver aus `ui.mjs`), Playwright/Chromium-Rendering mit lokalem Server und gemockter bzw. abgebrochener `/api/**`-Route, Interaktionsproben (Felder füllen, Modus umschalten, Bauperiode/T_N ändern, Quota-Fehler simulieren). Screenshots in `/home/claude/tw/befund/shots/`.

---

## 1. Kurzfazit

Die Oberfläche wirkt aufgeräumt und modern, ist aber weder «aufbauend Schritt für Schritt» noch eine «einzige Quelle der Wahrheit». Es gibt keine zwei gleichwertigen Modi «FWS» und «raumweise», sondern einen FWS-Grundmodus mit einem zuschaltbaren «Detail-Modus». In diesem Detail-Modus wird die raumweise Heizlast nur *parallel* angezeigt. Das Dashboard rechnet weiter mit FWS/Bauperiode, der Bericht schaltet dagegen stillschweigend auf die Hülle um. So stehen in derselben Sitzung drei verschiedene Q_h-Werte (Dashboard 6.42 kW, Bericht-Leistungstabelle 7.49 kW, Bericht-Rechenweg 6.42 kW).

Die fünf gravierendsten Probleme:

1. **Die Vorlauftemperatur des WP-Filters und des Rechenkerns kommt aus einem Feld, das unsichtbar wird, sobald Räume erfasst sind.** Die Heizkreis-VL (z. B. 55 °C) wirkt nur auf die UI-Ampel. Der WP-Filter und `computeDistribution` rechnen weiter mit 35 °C. Gleiche Heizfläche: UI-Ampel 77 %, Rechenkern 21 %.
2. **Bedingte Felder sind kaputt.** `.field { display:flex }` überschreibt das HTML-Attribut `hidden`. Personen und l/P·d sind darum immer sichtbar, auch bei «V_W,u direkt» oder ausgeschaltetem WW. Der Fall des Auftraggebers («WW künftig separat → keine Personen/WW-Komfort») wird nicht erfüllt. Ausgeschaltetes WW wird nur auf 55 % Deckkraft gedimmt.
3. **Die Hülle ist keine Vorgabe für die Räume.** Ein U-Wert oder eine Picker-Auswahl in Schritt «Hülle» kommt nie in den Raum-Bauteilen an, obwohl die UI «U-Wert leer → Default aus Hülle» verspricht. Wand-U in der Hülle 0.15 ergibt im Raum weiterhin 0.50.
4. **Die Migration alter Projekte verfälscht Ergebnisse.** Wurde eine Wand früher als `variant:'unsaniert'` (U 1.20) erfasst, liegt sie nach dem Laden bei U 0.60. `picker:{}` hat jetzt Vorrang, die alte Variante wird ignoriert. Es gibt keine Schema-Version und keinen Hinweis an den Nutzer.
5. **Pflichtteile des Zwecks fehlen in der UI ganz.**
   - Keine Eingabe für Sanierungen, obwohl der Rechenkern `heizung.sanierungen` inkl. Jahresgewichtung kennt.
   - Keine 3-Jahres-Mittelung: drei Verbrauchszeilen werden *summiert*. 3 × 2500 m³ ergibt Q_hl 35.8 kW statt 11.9 kW.
   - Keine EBF aus den Räumen.
   - Das HK-Modul (Priorität!) fehlt im Bericht und im Dashboard vollständig.

Ausserdem fehlen Datensicherheits-Grundlagen: «Neu» verwirft ohne Rückfrage, und ein voller localStorage meldet «Projekt lokal gespeichert», obwohl nichts gespeichert wurde.

**Urteil für meinen Bereich: UI-Schicht neu bauen**, Rechenkern und Datendateien behalten. `ui.mjs` mischt Rendering, Event-Dispatch per Regex auf State-Pfade, Fachlogik (U-Wert-Resolver, Plausi, MAG, WP-Filter) und DOM-Patching. `main.mjs` und `export.mjs` importieren Rechenlogik *aus der UI*. Neu-Renders werden über das Debug-Objekt `window.__heizlast.setState` erzwungen. Eine Überarbeitung würde die Kopplung nicht lösen (Begründung in Abschnitt 6).

---

## 2. Befunde

### 2.1 Struktur, Reihenfolge, Modus

| ID | Schwere | Fundort | Befund | Begründung / Beleg | Empfehlung |
|---|---|---|---|---|---|
| UX-01 | HOCH | `ui.mjs:83-105` STEPS_FWS / STEPS_DETAIL | FWS-Reihenfolge: Stamm → **WW → Zuschläge → Heizlast** → Speicher → Ergebnis. Zuschläge (Q_off = f(Q_hl), Q_w = f(Q_hl)) stehen *vor* der Heizlast, aus der sie abgeleitet werden. Im Detail-Modus kommt die Wärmeübergabe (5) vor «Heizlast» (7), obwohl die HK-Ampel die Raumheizlast braucht. Offerte (O) steht vor Baubewilligung (B), das Ergebnis erst nach Offerte/Förderung. | FWS-Kursablauf und Logik: Q_hl → Q_w/Q_off → Q_h → Speicher → Gerät | Reihenfolge nach Konzept in Abschnitt 5 |
| UX-02 | KRITISCH | `projects.mjs:48` Toggle «Detail-Modus», `main.mjs:72-90`, `ui.mjs:2072ff` | Es gibt keinen Modus «raumweise». «Detail-Modus» blendet nur Sektionen ein. Hero-KPI, Q_h, Speicher, Förderung, WP-Filter und Bewilligung nutzen weiter `compute(state)` mit FWS bzw. Bauperioden-Fallback. Die Hüllen-Heizlast erscheint als Nebenkachel «parallel». Die Wahl der massgebenden Methode trifft erst der Export in `buildLeistungenTable` (`export.mjs:344-415`), für den Nutzer unsichtbar. | Probe: Detail aktiv, kein Verbrauch: Dashboard Q_h 6.42 kW (Bauperiode), Bericht Q_h 7.49 kW (Hülle 6.89 kW) | Expliziter Modus `methode: 'fws' \| 'raumweise'` im State. Ein `deriveResult(state)` bestimmt Q_hl,massgebend; Dashboard, Bericht und WP-Filter lesen nur dieses Ergebnis. |
| UX-03 | MITTEL | Topbar | Der Modusschalter sitzt als kleiner, unbeschrifteter Switch in der Aktionsleiste. Mobil fehlt das Label ganz (Screenshot `20-detail-top-mobile.png`: nur Toggle und Icons). Ein Moduswechsel verändert die ganze Navigation von 6 auf 13 Schritte ohne Rückmeldung. | Screenshots `01-…-mobile-top.png`, `20-detail-top-mobile.png` | Modus als erster Schritt («Was wollen Sie berechnen?»), mit Erklärung und Wechselhinweis |
| UX-04 | MITTEL | `main.mjs:86-90`, `ui.mjs:192` | Moduswechsel = komplettes `innerHTML`-Neurendern aller Sektionen. Die Daten bleiben erhalten (geprüft: Räume bleiben beim Ausschalten im State). Gut gegen Datenverlust, aber: Räume, Heizflächen und Geräteauswahl wirken im FWS-Modus versteckt weiter (Autosave, Cloud-JSON, `geraet.gewaehlt_id`), ohne Hinweis. | Probe «Detail AUS → raeume: 1» | Beim Wechsel Hinweis «X Räume bleiben gespeichert, wirken im FWS-Modus nicht» |
| UX-05 | MITTEL | `ui.mjs:1083`, `1127`, `1725`, `3114`, `2686` | Hartcodierte, falsche Schrittnummern im Text: «Hülle-Defaults aus Schritt 6» (Hülle = 2), «Räume in Schritt 7 hinzufügen» (Räume = 3), «Verbrauchs-Methode in Schritt 2 aktivieren» (Heizlast = 4 bzw. 7), «WP-WW-Auslegung in Schritt 4» (im FWS-Modus = 2) | `syncSectionNums` löst nur die Badges, nicht die Fliesstexte | Querverweise generieren (Label statt Nummer) |
| UX-06 | MITTEL | Stepper, `style.css:239ff`, `1641-1644` | Der Stepper ist ein Sprungmenü über eine einzige Endlosseite (FWS desktop 5445 px, Detail desktop 13'126 px, Detail mobil **21'396 px**). Es gibt keinen Fortschrittsstatus (erledigt, fehlt, Warnung), keine Pflichtfeld-Logik und kein «Weiter». Mobil ist der Stepper 233 px hoch und *nicht* sticky, also nach dem ersten Scrollen weg. | Metriken aus Playwright | Echte Schrittseiten mit Status-Badges und Weiter/Zurück; mobil ein kompakter Schritt-Selector |
| UX-07 | NIEDRIG | `index.html:67`, Footer | Footer «FWS-Default + Detail-Modus (EN 12831 raumweise)», Bericht nennt «SIA 384/1:2022», Ergebnis-Sektion «EN 12831» → uneinheitliche Normbezeichnung | `export.mjs:589` | Einheitliches Norm-Label |

### 2.2 Bedingte Felder

| ID | Schwere | Fundort | Befund | Begründung / Beleg | Empfehlung |
|---|---|---|---|---|---|
| UX-10 | HOCH | `style.css:370` `.field{display:flex}` gegen `hidden`-Attribut; `ui.mjs:3331-3364` | **`setHidden()` wirkt auf keine `.field`.** Gemessen: `wwField-personen-pers`, `wwField-personen-lpd`, `wwf-pers-v`, `stammVlWwField` haben `hidden=true`, aber `display:flex`. Personen und l/P·d sind immer sichtbar, ebenso «Vorlauf WW» bei WW aus. Nur `.modal[hidden]` und `.ww-inline[hidden]` haben eigene Regeln. | Playwright `getComputedStyle`; Screenshot `10-fws-sec-heizlast-desktop.png` (bei «V_W,u direkt» stehen Personen 4 und l/P·d 40 trotzdem da) | Global `[hidden]{display:none!important}`; besser: Felder bei Irrelevanz gar nicht rendern |
| UX-11 | HOCH | `ui.mjs:701-747`, `812-832`, `3361-3362` | Auftraggeber-Fall «WW früher über Heizung, künftig separat» (`verbrauchInklWW=true`, `warmwasser.aktiv=false`): Die ganze WW-Sektion bleibt sichtbar und editierbar (nur `opacity .55`). Der WW-Speicher-Block mit f_Sto, A_WT, ΔT und Override bleibt aktiv sichtbar und zeigt «Vorschlag 0 l». «Vorlauf WW» in den Stammdaten bleibt sichtbar (UX-10). | Screenshots `40-ww-aus-desktop.png`, `41-speicher-ww-aus-desktop.png` | WW-Sektion in zwei Fragen teilen: (a) «Enthält der bisherige Verbrauch WW?» → nur Abzug-Eingaben; (b) «Bereitet die neue WP WW?» → nur dann Komfort, Personen, Speicher |
| UX-12 | HOCH | `ui.mjs:3337-3340` | Im Inline-WW-Block der Verbrauchsmethode folgt die Sichtbarkeit von `wwf-direkt-v` / `wwf-pers-v` dem Modus von **`warmwasser.modus`**, gebunden ist aber **`heizung.verbrauch_ww.modus`**. Der Modus-Schalter im Verbrauchsblock schaltet also die falschen Felder. Der Kommentar «gleiche State-Paths → beide Stellen synchron» (`ui.mjs:548`) widerspricht dem Code (`basePath` = eigener Ast). | Code | Sichtbarkeit aus dem eigenen Ast ableiten |
| UX-13 | HOCH | `calc/fws.mjs:273-287` | Stille Kopplung: Ist `verbrauch_ww` leer, wird für den Verbrauchsabzug das *künftige* WW (`warmwasser.*`) genommen. Bei WW-künftig-aus zieht das Tool so 4848 kWh/a ab, aus Werten eines ausgegrauten Blocks. | Probe D: `warmwasser.aktiv=false`, Abzug 4848 kWh/a | Keine Fallbacks über fachlich getrennte Äste, sonst explizit anzeigen |
| UX-14 | MITTEL | Stammdaten | In FWS gelten immer: T_N (wirkt in FWS nicht auf Q_h, nur im Detail-Modus), Massnahme + WP-Quelle (nur Förderung/Bewilligung, die im FWS-Modus gar nicht gerendert werden), Wohneinheiten (wirkt nirgends ausser Bericht), Kanton/Gemeinde. Die WP-Quelle wird bei anderer Massnahme nur gedimmt (`opacity .45`). | `grep wohneinheiten`: nur `export.mjs:330`; Förder-Sektion nur in Detail | Felder an die Stelle verschieben, wo sie wirken, oder pro Modus ausblenden |
| UX-15 | MITTEL | Wärmeübergabe `ui.mjs:1660-1680` | «Globale Vorlauftemperatur» wird nur ohne Räume gerendert und nach dem ersten «+ Raum» nicht entfernt. Gemessen: Text «Keine Räume erfasst» bleibt nach Raum-Add stehen (stale), bis ein Moduswechsel neu rendert. | Playwright-Probe | Siehe FLOW-01 |
| UX-16 | MITTEL | Heizfläche FBH | Bei Typ FBH/Wand gibt es nur «Fläche A». Verlegeabstand, Belag (R_λ,B) und Rohrdimension fehlen, die Plausi läuft über `REF_AUSLEGUNG` pauschal, ohne Hinweis «Pauschalwert». | `ui.mjs:2837-2838` | Für FBH eigene Felder: Verlegeabstand, Belag, Fallback sichtbar |
| UX-17 | MITTEL | Räume ohne Bauteile, Fall «kein Keller» | Neue Räume bekommen Wand + Fenster mit A=0. Es gibt keine Frage «grenzt an Erdreich / Keller / Dach?». Bodentyp, Keller und Dach müssen pro Raum manuell als Bauteil gesucht werden. Ein Raum ohne Bauteile liefert still nur die Lüftungsheizlast. | `ui.mjs:2272-2279`, `heatload.mjs` | Geschoss-/Lagefragen pro Raum (EG/OG/DG, Keller darunter j/n), Bauteile vorbelegen; Raum ohne Hüllfläche markieren |
| UX-18 | NIEDRIG | Verbrauch | Ohne Verbrauchsdaten steht Methode A trotzdem standardmässig auf «aktiv» (`state.mjs:62`). Status «— Eingaben fehlen». Das Ergebnis kommt still aus dem Bauperioden-Fallback. | Hero-Untertitel «Bauperioden-Schätzwert (kein Verbrauch erfasst)» ist gut, Methodenblock bleibt verwirrend | Frage «Liegen Verbrauchsdaten vor? ja/nein» steuert die Blöcke |

### 2.3 Single Source of Truth / Datenfluss

| ID | Schwere | Fundort | Befund | Begründung / Beleg | Empfehlung |
|---|---|---|---|---|---|
| FLOW-01 | KRITISCH | `calc/heatpump.mjs:263-264`, `calc/distribution.mjs:249-250`, `ui.mjs:2806-2818`, `2908-2909`, `export.mjs:332` | **Vier Vorlauftemperaturen, keine gilt überall:** `objekt.tVLMaxHeizung` (55, keine UI, steht im Bericht als «Vorlauf Heizung max.»), `detail.verteilung.global.tVL_neu` (35, nur ohne Räume editierbar, steuert WP-Filter, JAZ und Rechenkern-Plausi), `heizkreise[].tVL` (nur UI-Ampel und Hinweistext «WP-Auslegungs-Vorlauf = max. T_VL aller Kreise»), `warmwasser.tLadeWW`. Probe: Kreis HK 55/45 °C, q_norm 1500 W/m², Raum 1000 W. UI-Ampel 77 %, `computeDistribution` 21 %, WP-Filter mit 35 °C (9 Treffer, darunter Geräte ohne 55 °C-Fähigkeit). Der Hinweistext behauptet das Gegenteil des Rechenwegs. | Node-Probe `flow3.mjs` / `flow.mjs` C, F | Eine Funktion `auslegungsVL(state)` = max(Kreis-VL bzw. benötigte VL aus HK); alle Konsumenten lesen sie; `tVLMaxHeizung` entfernen/migrieren |
| FLOW-02 | HOCH | `ui.mjs:1379-1390`, `calc/heatload.mjs:228-235`, `ui.mjs:1179` | **Die Hülle vererbt nicht an die Räume.** `enrichRaeumeWithResolvedUFrt` setzt `b.u` für *jedes* Raumbauteil aus Bauperiode/Picker des Bauteils selbst. `uHuelleResolved` greift nur, wenn `b.u` leer ist, was nach dem Anreichern nie vorkommt. Hülle-U-Werte wirken nur auf die Pauschal-Restfläche. UI-Text «U-Wert leer → Default aus Hülle» ist falsch. | Probe B: Hülle Wand `u_user=0.15` → Raum-Wand U 0.50, nur Q_hl,Rest sinkt | Raumbauteile referenzieren einen Hüllen-Bauteiltyp (`ref:'wand-1'`) mit optionalem Override; Resolver-Kette Raum → Hüllentyp → Bauperiode |
| FLOW-03 | KRITISCH | `persistence.mjs:536-574`, `ui.mjs:1425-1447` | Die Migration setzt `picker:{}` auf alle alten Bauteile. Weil der Picker Vorrang hat, werden `variant` (unsaniert/saniert), `dach_variant`, `fenster_rahmen` ignoriert. Ergebnis alter Projekte ändert sich still: Wand «unsaniert» 1971–1980 1.20 → 0.60, Dach «saniert» 0.60 → 0.80. Keine `schemaVersion`, kein Migrationsprotokoll. | Node-Probe `flow3.mjs` | Variant in Picker-Stufen übersetzen oder als `u_override` einfrieren; `schemaVersion` + Migrationshinweis «Projekt aus Version X, Werte geprüft» |
| FLOW-04 | HOCH | `persistence.mjs:118-132`, `163-177`, `369-407` | Drei Ladepfade (Active, lokal, Cloud) mit kopierter Migrationssequenz `deepMerge → migrateBauteilePicker → migrateOffertenState → migrateHeizkoerperFelder`. Jede neue Migration muss an drei Stellen nachgezogen werden. `deepMerge` ersetzt Arrays, daher bekommen alte Räume, Perioden und Kreise keine neuen Default-Felder (nur Heizflächen sind separat migriert). | Code | Eine `hydrateState(raw)` mit versionierten Migrationsschritten |
| FLOW-05 | KRITISCH | `calc/fws.mjs:228-241`, `ui.mjs:617` | Mehrere Verbrauchszeilen werden **summiert**, nicht gemittelt. Die UI bietet nur «+ Energieträger hinzufügen». Wer drei Abrechnungsjahre als drei Zeilen erfasst (naheliegend), bekommt das Dreifache. Probe: 3 × 2500 m³ Erdgas (je 365 d) → Q_hl 35.77 kW; 1 Jahr → 11.92 kW. Es gibt weder ein Jahresraster noch Mittelung noch eine Ausreisser-Plausi. Zweckvorgabe «3 Jahre, Mittelung, Plausibilisierung» nicht erfüllt. | Node-Probe | Tabelle «Abrechnungsperioden» (Jahr × Energieträger), Kern mittelt pro Jahr und prüft Streuung, Sanierungen pro Jahr |
| FLOW-06 | KRITISCH | `state.mjs:81`, `calc/fws.mjs:325-366` | `heizung.sanierungen` (inkl. `zeitpunkt`, `zeitEintraege`, Gewichtung) ist im Kern implementiert, hat aber **keine UI**. `objekt.sanierungsstand` (wirkt auf U-Werte via `applySanierung`) hat ebenfalls keine UI, steht aber im Bericht («Sanierungsstand: Unsaniert»). Bericht-Rechenweg Schritt 6 zeigt immer «Faktor 1.0000». Die Massnahme «Sanierung Aussenwand» in den Stammdaten wirkt nur auf die Förderliste, nicht auf die Heizlast. Das ist für Nutzer irreführend. | `grep sanierungen` in `ui.mjs`: kein Treffer | Eigener Schritt «Sanierungen» (vergangen/zukünftig, Jahr, Bauteil, Einsparung) mit Rückkopplung auf Perioden und Hülle |
| FLOW-07 | HOCH | `ui.mjs:2072-2112`, `2626-2633`, `export.mjs:432-444` | Speicher-Overrides (`speicher_v_user`, `puffer_v_user`) und `puffer_aktiv` wirken nur im Hinweistext. Dashboard-KPI V_W,Sto / V_P,Sto und Bericht zeigen `c.VW_Sto` / `c.VP_Sto`. Puffer aus → Dashboard zeigt trotzdem 220 l, Bericht «Heizungs-Pufferspeicher 220 Liter». | Screenshot `10-fws-sec-ergebnis-desktop.png` (220 l bei «Kein separater Puffer») | Effektive Volumen im Kern berechnen (`V_eff = override ?? vorschlag`, 0 wenn aus) |
| FLOW-08 | HOCH | `ui.mjs:2748-2795` | Sicherheitsventil, Anlagenvolumen und MAG werden **nur in der UI** gerechnet (`magVolumen`, `anlagenvolumenSchaetzung` direkt im Update-Handler). Sie sind nicht im Calc-Ergebnis und darum nicht im Bericht, obwohl im Stepper «Speicher · Puffer · MAG». ΔT=70 K ist hartcodiert. | Code; `export.mjs` enthält kein MAG/SV | In Kern-Ergebnis aufnehmen |
| FLOW-09 | HOCH | `ui.mjs:2797-2901` vs. `calc/distribution.mjs:221-305` | Die HK-Plausi ist doppelt implementiert: UI (Kreis-VL) und Kern (globale VL), mit abweichendem Ergebnis (FLOW-01). `computeDistribution` liefert `tVL_max` pro Heizfläche (die vom Auftraggeber gewünschte «nötige VL»), aber **nichts davon wird angezeigt**, weder im Dashboard noch im Bericht. | `grep tVL_max` in `ui.mjs`/`export.mjs`: nur WP-Filter | UI liest nur `calc.distribution`; Kachel «nötige VL Gebäude = max(tVL_req) → WP-Tauglichkeit» |
| FLOW-10 | MITTEL | `ui.mjs:3153-3154` vs. `3240-3249` | Zwei unterschiedliche Ampeln für dieselbe WP-Dimensionierung. Cockpit: Q_n/Q_h, grün 0.75–1.20. Gerätedetail: Q_h/Q_n, grün 0.75–1.20, rot <0.60/>1.40. Dazu `heatpump.inverterCheck` im Kern. Drei Logiken. | Code | Nur `calc.heatpump.inverter` anzeigen |
| FLOW-11 | MITTEL | `ui.mjs:3170-3200` vs. `calc/heatpump.mjs` `filterWaermepumpen` | WP-Filter doppelt (UI `filterWp` und Kern). Die Liste in der UI ist nicht die, die `calc.heatpump.liste` liefert. | Code | Ein Filter im Kern |
| FLOW-12 | HOCH | Ergebnis-Kacheln `ui.mjs:2091`, `2136`, `3108` | Kachel «Heizlast nach Verbrauch (FWS)» und Vergleich «Hülle ↔ Verbrauch» zeigen den **Bauperioden-Schätzwert**, wenn kein Verbrauch erfasst ist (Probe A: 5.81 kW, primary=bauperiode), weiterhin als «Verbrauch» beschriftet. Ein «Konflikt»-Vergleich zwischen zwei Schätzungen wird als Messwert-Abgleich dargestellt. | Node-Probe A; Screenshot `30-detail-sec-ergebnis-desktop.png` | Label dynamisch aus `primary.key`; Vergleich nur bei echtem Verbrauch |
| FLOW-13 | MITTEL | EBF | EBF nur manuell (`objekt.ebf`). Keine Übernahme aus Σ Räume, keine Warnung bei Σ Räume > EBF (Restfläche dann still 0), spez. Leistung immer auf manuelle EBF. EBF leer → spez 0 W/m² und **Ampel ROT** (gemessen «ROT · Band 15–23 W/m²»). | Playwright-Probe «EBF leer» | `ebf_quelle: 'manuell'\|'raeume'`, Default aus Räumen; ohne EBF Ampel grau «EBF fehlt» |
| FLOW-14 | MITTEL | `persistence.mjs:56-59`, `projects.mjs:200-205`, `main.mjs:96-100` | Zwei Projektnamen: `projekt.name` (Stammdaten, Topbar, Bericht) und `meta.name` (Projektliste, Dateiname). Probe: Projektname «EFH Müller» gespeichert → Liste zeigt «Neues Projekt». Dateiname des Exports aus `meta.name`. | Playwright-Probe | Ein Feld |
| FLOW-15 | MITTEL | `ui.mjs:2395-2620` | Ableitungen per `setTimeout` mit Folge-`_set`-Kaskaden (HK-Picker bis 5 `_set` hintereinander, jeder löst `_notify` → `compute` → `updateUi` → Autosave aus; per Microtask entprellt, aber nicht atomar). Neu-Renders über **`window.__heizlast.setState(getState())`**, also über das Devtool-Objekt. `batch()` existiert in `state.mjs`, wird aber nicht genutzt. | Code `ui.mjs:2461-2464`, `2613-2616` | Abgeleitete Werte (q_norm, A, tiefe) im Kern berechnen statt in den State schreiben; Aktionen als reine Reducer |
| FLOW-16 | HOCH | Material-Picker `ui.mjs:2449-2451` | Pfade `….picker.<stufe>` lösen keinen Neu-Render aus (Regex kennt nur `typ\|variant\|anschluss\|…\|layers`). Gemessen: Hülle-Wand Bauweise → Stahlbeton: Rechenkern 7.22 → 6.93 kW, aber Picker-Kopf «0.50 W/m²K» und Zeilenkopf «U = 0.50» bleiben stehen. Im Raum aktualisiert sich das Readout (0.43), der Picker-Kopf daneben zeigt weiter 0.50. Abhängige Stufen (Dicke-Optionen je Bauweise) werden nicht neu aufgebaut. Manueller U-Wert sperrt den Picker erst nach einem fremden Neu-Render. | Playwright `pick.py`, `pick2.py` | Komponentenweise Neu-Rendern bei jeder Picker-Änderung |
| FLOW-17 | MITTEL | Raumkopf `ui.mjs:1141` | Raumkopf «Raum 1 · 0.0 m²» bleibt nach Eingabe A=30 stehen (stale, nur bei Neuaufbau aktualisiert). Der Name erscheint im Kopf nicht. | Screenshot `30-detail-sec-raeume-desktop.png` | Kopf aus Live-Daten |
| FLOW-18 | MITTEL | Heizkreise `ui.mjs:1753-1756`, `2326-2334` | Die Kreis-ID ist frei editierbar, Heizflächen referenzieren sie per `kreis_id`. ID ändern oder Kreis löschen lässt verwaiste Referenzen zurück (kein Hinweis, `vlForHf` fällt still auf global zurück). Ein neu angelegter Kreis «k1» ohne `typ`/`tVL` nach Löschen aller Kreise. | Code | Interne IDs, nicht editierbar; Löschen mit Neuzuordnung |
| FLOW-19 | MITTEL | WW-Temperaturen | Drei WW-Temperaturgrössen ohne Bezug: `warmwasser.tLadeWW` (60), `warmwasser.dT` (50), `speicher.dT` (50). Ändert man die Ladetemperatur auf 55 °C, bleiben beide ΔT bei 50 K. | `state.mjs:87`, `98` | ΔT = T_Lade − T_Kalt ableiten |
| FLOW-20 | NIEDRIG | `resolveBauteilUFrt` `ui.mjs:1403/1429/1451` | Für Anschluss «beheizt» liest der Resolver `obj.tInnenAuslegung` (existiert nicht, immer 20 °C) statt der Raum-θ_int. f_RT-Berechnung ist dreifach kopiert. | Code | Raumtemperatur durchreichen, eine Funktion |

**Fünf verfolgte Datenflüsse (Eingabe → Kern → Dashboard → Bericht):**

1. **Bauperiode nach Raumerfassung ändern** (1986–1990 → 2011–heute):
   - Raum-Readouts aktualisieren sich (0.50 → 0.17).
   - Hüllenzeilen werden neu gerendert.
   - Kern Hülle 6.89 → 3.59 kW.
   - Dashboard-Hero (FWS) unverändert.
   - Picker-Köpfe in den Räumen bleiben stale (FLOW-16).
   - Bericht: Objektdaten korrekt, Leistungstabelle je nach Verbrauch FWS oder Hülle (UX-02).
2. **T_N −8 → −12 °C:**
   - Hülle 3.59 → 4.10 kW.
   - FWS-Q_h unverändert (fachlich vertretbar, aber das Feld steht prominent in Schritt 1 des FWS-Modus, UX-14).
   - Bivalenzpunkt nutzt T_N.
   - Der Bericht-Rechenweg nennt T_N nirgends.
3. **Personenzahl:**
   - Zwei Eingabestellen auf zwei Ästen (`warmwasser.personen` → Q_w, Speicher; `heizung.verbrauch_ww.personen` → Abzug).
   - Sichtbarkeit beider kaputt (UX-10, UX-12).
   - Fallback-Kopplung (UX-13).
   - Bericht-Rechenweg Schritt 3 zeigt immer `warmwasser.*`-Werte, auch wenn der Abzug aus `verbrauch_ww` gerechnet wurde. Zahlen im Bericht passen dann nicht zum Abzug in Schritt 4 (`export.mjs:647-675`).
4. **Sanierung hinzufügen:** unmöglich (FLOW-06). Die Massnahme in den Stammdaten wirkt nur auf die Förderung.
5. **Heizkörper ändern** (Fallback Typ 21, A 0.9 m²):
   - `setTimeout`-Kaskade schreibt `q_norm` (1935 W), `tiefe`, `n_exponent` in den State.
   - UI-Ampel «25 %» mit Kreis-VL, Kern-Plausi mit globaler VL.
   - Dashboard zeigt nichts zum HK.
   - Bericht zeigt nichts zum HK (Raumtabelle ohne Heizflächen).
   - Fazit: Das Prioritätsmodul endet in einer Ampel ohne Folgen.

### 2.4 Edge Cases / Fehlerzustände

| ID | Schwere | Fundort | Befund | Beleg | Empfehlung |
|---|---|---|---|---|---|
| UX-20 | HOCH | `persistence.mjs:86-89`, `111-116`, `137-155` | localStorage voll / gesperrt: `writeProjects` und `saveActive` schlucken die Exception still. Toast meldet trotzdem «Projekt lokal gespeichert.» | Playwright: `setItem` wirft QuotaExceeded → Toast «Projekt lokal gespeichert.» | Rückgabewert prüfen, Fehler-Toast, Export-Angebot |
| UX-21 | HOCH | `projects.mjs:164-167`, `persistence.mjs:203-209` | «Neu» verwirft den aktuellen Stand ohne Rückfrage. Das Autosave-Slot wird mit `freshState` überschrieben; nie «gespeicherte» Arbeit ist weg. | Playwright: kein `dialog`, Projektname danach leer | Rückfrage bei ungespeicherten Änderungen, Papierkorb/Undo |
| UX-22 | MITTEL | Offline / Auth | Auth-Probe fehlschlagend (404/abgebrochen) → still Lokal-Modus, Button «Anmelden». Kein Offline-Indikator, kein Hinweis, dass die Cloud-Liste fehlt. Fehlen Daten-JSONs, fallen U-Werte still auf den «Notnagel» 1.0 (`ui.mjs:1545`), HK-Picker zeigt dauerhaft «wird geladen …», Förderung zeigt einen Hinweis. Bei Login-Fehler 401 während Arbeit: `_setAuth(false)` + Toast, gut. | Playwright mit `route.abort()` | Status-Pill «offline / lokal», Datenfehler als Banner |
| UX-23 | MITTEL | `installAutoSync` | Fokus-Sync aktualisiert nur die Liste, nicht das aktive Projekt. Zwei Geräte am selben Projekt: last write wins ohne Konflikterkennung (`updatedAt` wird nicht verglichen). | Code | Versionsvergleich beim Speichern |
| UX-24 | MITTEL | Validierung | Keine Eingabevalidierung: η > 1, negative Mengen, `bis < von` (→ still 365 d, `export.mjs:746`, `fws periodDays`), θ_int < 5, Raum-A=0 mit Bauteilen. Leere Zahlenfelder werden zu `''`, im Kern zu 0. | Code | Feldregeln + Inline-Fehler |
| UX-25 | NIEDRIG | Empty State | Leeres Projekt: Hero «0.00 kW», Kacheln «0.00», spez «0.0» mit roter Ampel. Wirkt wie ein Ergebnis. | Screenshot `02-fws-leer-desktop-full.png` | «—» + «Es fehlen: EBF, Verbrauch …» |
| UX-26 | NIEDRIG | Cloud-KPIs | `buildProjectPayload` speichert `calc.Qhl` / `Qh` des Dashboards (FWS), nicht den Bericht-Wert. Die Projektliste zeigt so andere Werte als der Bericht. | `persistence.mjs:300-301` | Massgebendes Ergebnis speichern |

### 2.5 Optik / Darstellung (Screenshots)

| ID | Schwere | Screenshot | Befund | Empfehlung |
|---|---|---|---|---|
| UX-30 | MITTEL | `01-fws-leer-desktop-top.png`, `10-fws-sec-stamm-desktop.png` | Schritt 1 umfasst Projektadministration (Planer, Adresse), Förderlogik (Massnahme, WP-Quelle), Gebäude und Auslegungstemperaturen: 1364 px, bevor ein Rechenwert entsteht. Jedes Feld hat eine eigene vollbreite «ⓘ Hinweis»-Leiste (24 Stück auf der FWS-Seite). Die Leisten verdoppeln die Höhe und sind alle gleich beschriftet. Kein Scannen möglich. | Info als ⓘ-Icon am Label, Popover; Projektadministration ans Ende/Deckblatt |
| UX-31 | MITTEL | `20-detail-top-desktop.png` | Detail-Modus: Topbar 99 px + zweizeiliger Stepper 113 px = 212 px sticky (24 % eines 900-px-Viewports). Die 13 Tabs mit Mischsymbolen (1–9, F, O, B, Σ) haben keine Hierarchie (Erfassung vs. Ergebnis vs. Zusatzmodule). | Gruppierte Navigation: Gebäude · Heizlast · Wärmeabgabe · Anlage · Bericht; Zusatzmodule separat |
| UX-32 | MITTEL | `10-fws-sec-heizlast-desktop.png` | Heizlastsektion: Methoden A/B/C als Akkordeon mit eigenem Aktiv-Schalter *und* aufklappbarem Kopf (zwei Zustände pro Methode). Mehrere gleichzeitig aktiv möglich, die erste aktive gewinnt still (`compute`: `mList[0]`). «Vollbetriebsstunden Override» steht gleichrangig daneben. Datumsfelder ohne Bezug zum Jahr. | Radio «Datenquelle» + Jahresraster |
| UX-33 | MITTEL | `30-detail-sec-raeume-desktop.png`, `30-detail-sec-raeume-mobile.png` | Ein Raum mit 2 Bauteilen = 2100 px desktop / 3100 px mobil. Jedes Bauteil zeigt Readout-Zeile + Quelle + vollständigen 5-Stufen-Picker (alles «Unbekannt») offen. Die Quelle ist Entwicklerjargon: «Picker · voll-unbekannt [unbek: bauweise,dicke,hatDaemmung,daemmstoff,daemmDicke] · gegen Aussenluft (f_RT 1.00)». Doppelte Bezeichnungen «Aussenwand / Typ Aussenwand». Umlaute fehlen («Daemm-Material», «Ist gedaemmt?»). | Raum als Tabelle/Karte kompakt, Bauteil-Picker eingeklappt mit Klartext-Herkunft («geschätzt aus Baujahr 1986–1990, ±30 %») |
| UX-34 | MITTEL | `30-detail-sec-verteilung-desktop.png` / `-mobile.png` | Wärmeübergabe: Heizkreis-Zeile mit freiem «ID»-Feld; Sanierungs-Plausi-Checkbox mit T_VL,alt/T_RL,alt, die *nirgends* wirken (`grep tVL_alt`: nur UI). Die HK-Ampel «25 %» ohne Legende (Deckungsgrad?) und ohne Aussage «nötige VL = … °C». | Pro Raum: Bedarf W, HK-Leistung bei VL X, nötige VL, Status |
| UX-35 | NIEDRIG | `30-detail-sec-ergebnis-desktop.png` | Ergebnis: Q_h, Q_hl, Q_n,WW, Speicher erscheinen doppelt (oberes Cockpit + «Auslegung-Cockpit»), mit leerem Block-Rahmen über der zweiten Reihe. Rote Ampeln ohne Handlungsanweisung («ROT · Band 30–48 W/m²» bei 63 W/m²: was tun?). | Ein Dashboard, je Wert einmal |
| UX-36 | NIEDRIG | `01-…-mobile-top.png` | Mobil: Topbar-Aktionen nur als Icons ohne Label (Neu/Speichern/Projekte/Export/Login nicht unterscheidbar), Toggle ohne Text. Das Logo-Bild fehlt lokal (Pfad `./img/Logo.png`; live vermutlich vorhanden). Sonst kein horizontaler Overflow (scrollWidth = 390 px). | Bottom-Bar mit Labels |
| UX-37 | NIEDRIG | allgemein | 78 Inline-`style=` und 53 `innerHTML`-Zuweisungen in `ui.mjs`. Uneinheitliche Abstände (Heizflächen-Blöcke mit Inline-Border, `.block` mit zwei konkurrierenden Regeln `style.css:336` und `1366`). Zwei Definitionen von `.step.is-active` (`style.css:268`, `1334`, mit `!important`). | Designsystem-Komponenten |

### 2.6 Bericht / Export

| ID | Schwere | Fundort | Befund | Beleg | Empfehlung |
|---|---|---|---|---|---|
| UX-40 | KRITISCH | `export.mjs:487-502` | **HK/Wärmeübergabe fehlt im Bericht komplett**: keine Heizflächen, keine Normleistung, kein Deckungsgrad, keine nötige VL, keine WP-Tauglichkeit. `calc.distribution` wird berechnet und nie verwendet. | `grep distribution export.mjs`: nur Zeile 218 | Bericht-Kapitel «Wärmeabgabe» pro Raum |
| UX-41 | HOCH | `export.mjs:446-466` | Gerätetabelle erscheint nie. Lookup `(x.id \|\| x._id) === wpId`, die DB hat aber `ID` (Probe: «NICHT gefunden»). Darüber hinaus liest sie `wp.marke`, `wp.leistung.A_minus7_W35`, `wp.tvl_max`, `wp.schall_db`, `c.heatpump.bivalenz_T`, `jaz_est`, `deckung_proz`; keiner dieser Schlüssel existiert (DB: `Marke`, `Heizleistung A-7/W35 [kW]`…; heatpump: `biv.T_biv`, `jaz.JAZ`). | Node-Probe | Über `getSelectedWp` + Accessor-Funktionen aus `heatpump.mjs` |
| UX-42 | HOCH | `export.mjs:344-415` vs. `699-703` | Bericht in sich widersprüchlich, wenn die Hülle massgebend ist: Leistungstabelle Q_h aus `compute(s,{phiHuelle})` (7.49 kW), Rechenweg «∑ Q_h» aus `c` (6.42 kW, Bauperiode). Der Rechenweg zeigt ausschliesslich FWS-Schritte (t_voll, Q_n,H/t_voll), auch wenn die Heizlast raumweise ermittelt wurde. Raumweise gibt es **keinen Rechenweg** (keine H_T/H_V pro Raum, keine U·A·f_RT-Tabelle). | Node-Probe A | Ein Ergebnisobjekt; Rechenweg-Kapitel pro Methode |
| UX-43 | HOCH | `export.mjs:322-336` | Objektdaten zeigen Werte ohne UI bzw. mit Wirkung: «Sanierungsstand: Unsaniert» (nicht erfassbar), «Vorlauf Heizung max. 55 °C» (veraltet, gerechnet wird mit 35 °C), «Wohneinheiten». | FLOW-01, FLOW-06 | Nur verwendete Werte, mit Herkunft |
| UX-44 | MITTEL | `export.mjs:432-444` | Speichertabelle ignoriert Overrides und `puffer_aktiv` (FLOW-07). MAG/SV fehlen (FLOW-08). | — | — |
| UX-45 | MITTEL | `export.mjs:646-668` | Rechenweg WW nutzt `warmwasser.*` auch für den Verbrauchsabzug (siehe Datenfluss 3). Bei `warmwasser.aktiv=false` und Abzug > 0 erscheint der Schritt mit Werten, die nicht dem Abzug entsprechen. | Code | — |
| UX-46 | MITTEL | `export.mjs:584-594` | Fallbacks im Bericht kaum sichtbar: Bauperioden-Schätzung nur als Text in «Verbrauch (Basis)», ohne Band (bandMin/bandMax existieren im Kern). U-Wert-Quellen nur für die globale Hülle, nicht pro Raumbauteil. Pauschalannahmen der Restfläche (n50 = 4, e_wind 0.02, Geschosse 2/4, θ_int 20 °C) fehlen. Die Fussnote ist pauschal («basieren auf den vom Kunden … zur Verfügung gestellten Angaben … Sanierungszustand»). | Code | Kapitel «Annahmen & Unsicherheiten» automatisch aus Fallback-Protokoll |
| UX-47 | NIEDRIG | `export.mjs:417-430`, `ui.mjs:309-335`, `state.mjs:133`, `122`, `128` | Toter Code / tote State-Felder: `buildDetailCockpitTable`, `renderNotizen` (nie gerendert), `notes.s1–s5`, `geraet.vorlauftemperatur`, `geraet.bivalenz`, `ergebnis:{}`, `objekt.tVLMaxHeizung`, `detail.huelle.*.dach_variant`. `data/klimadaten.json`, `normwerte.json`, `richtwerte.json` werden aus `src` nicht geladen. | `grep` | Entfernen bzw. bewusst anbinden |
| UX-48 | NIEDRIG | Export-Modal | PDF über `window.open` + `print()`; Popup-Blocker → Fallback-iframe ohne Vorschau. Kein Vorschau-Schritt, keine Kontrolle «fehlende Angaben» vor dem Export. | `export.mjs:178-200` | Bericht als eigener Schritt mit Vorschau + Vollständigkeitsprüfung |

### 2.7 Fallback-Transparenz

| ID | Schwere | Wo | Befund |
|---|---|---|---|
| UX-50 | HOCH | ganzes Tool | Kein einheitliches Herkunftsmodell (gemessen / eingegeben / Tabelle / geschätzt / Notnagel) und **nirgends eine Unsicherheitsangabe** (±). |
| UX-51 | MITTEL | Gut gelöst | Hero «Bauperioden-Schätzwert (kein Verbrauch erfasst)». U-Wert-Quelle pro Bauteil. Picker-Default-Hinweise («→ Default Hochlochziegel aus Baujahr 1978_1994»; Technikschlüssel statt Klartext). t_voll-Lookup-Hinweis. HK-Fallback-Text (n, Tiefe, W/m²). |
| UX-52 | MITTEL | Nicht sichtbar | Notnagel U=1.0 bei fehlenden Daten. η-Preset als Annahme. Restflächen-Pauschalen (n50, e_wind, Geschosszahl). Raum-n50=4/e=0.02/n_min=0.5 (keine UI, `heatload.mjs:243-246`). WP-Kennlinie (+12 %/+20 % geschätzt, `heatpump.mjs:276-281`) für Bivalenz/JAZ. ΔT 70 K MAG. `REF_AUSLEGUNG`-Pauschale bei FBH. Fallback Kreis → global VL. WW-Abzug aus künftigem WW (UX-13). |

---

## 3. Lücken gegenüber dem Zweck (fehlt komplett)

1. Zwei gleichwertige, umschaltbare Modi mit einer klaren massgebenden Heizlast. Heute: FWS + additiver «Detail».
2. Erfassung von Sanierungen (Jahr, Bauteil, Wirkung) und deren Gewichtung auf die Verbrauchsjahre (Kern vorhanden, UI fehlt).
3. Mehrjahres-Verbrauch mit Mittelung, Streuungs-Plausi, optional Klimabereinigung.
4. EBF automatisch aus Räumen.
5. HK-Ergebnis «nötige / maximal zulässige VL pro Raum → WP-Tauglichkeit» in UI, Dashboard und Bericht.
6. Raumweiser Rechenweg im Bericht und Kapitel «Annahmen/Fallbacks/Unsicherheit».
7. Vollständigkeits- und Plausibilitätsführung (was fehlt, was ist geschätzt) vor dem Bericht.
8. Datensicherheit: Rückfrage bei «Neu», Speicherfehler-Meldung, Schema-Version, Konflikterkennung.

---

## 4. Was gut und erhaltenswert ist

- **State-Konzept mit Pfad-Setter** (`state.mjs`): immutables `set(path, value)`, Microtask-Entprellung, `subscribe`. Klein, testbar, als Basis für Reducer geeignet.
- **Persistenz-Grundmuster**: Active-Slot + Projektliste + Cloud-Mirror-Flag + Drift-Cleanup, Hard-Delete-Asymmetrie dokumentiert. Fachlich brauchbar, braucht nur eine `hydrateState` mit Versionen.
- **Rechenkern-Module** (`calc/*`) sind DOM-frei und getestet. Vor allem `material-picker.mjs` (Stufen + Default aus Baujahr + `unbekanntStufen`) ist das richtige Muster für mehrstufige Fallbacks. `distribution.mjs` liefert bereits `tVL_max` pro Heizfläche. Die Funktionen `heizkoerper.mjs` (`qNormFromModell`, `qNormFromFallback`) gehören in die neue UI.
- **Bericht-Gestaltung** (`BROSCH_CSS`, Zweiblatt-Aufbau Auslegung/Berechnungsgrundlagen, Rechenweg mit Formel → eingesetzte Werte → Ergebnis): Layout und Rechenweg-Format erhalten, Datenquelle ersetzen.
- **Hero-Untertitel mit Methodenherkunft**, Picker-Default-Hinweise, Hinweis «Picker inaktiv durch manuellen U-Wert»: richtige Ideen, falsch verdrahtet.
- **Mobil-Grundlayout**: kein horizontaler Overflow, Grids brechen sauber auf eine Spalte.

---

## 5. Ziel-Navigationskonzept

**Grundsatz:** Jeder Schritt hat *eine* Seite, *ein* Ziel und einen Status (offen / vollständig / mit Annahmen / Warnung). Die Navigation zeigt nur Schritte, die für die getroffenen Entscheide relevant sind. Ein einziges `ergebnis = berechne(state)` speist Seitenleiste, Dashboard und Bericht. Die UI rechnet nichts selbst.

### 5.1 Schrittfolge

| # | Schritt | Inhalt (nur bedingt sichtbare Teile in *kursiv*) | Verzweigungen / Bedingungen |
|---|---|---|---|
| 0 | **Projekt & Methode** | Projektname (eine Quelle), Kunde; Frage «Wie wird die Heizlast bestimmt?» → (A) FWS: aus Verbrauch / Betrieb, (B) raumweise nach SIA 384.201 / EN 12831 | Moduswahl bestimmt Schritte 2–4. Wechsel jederzeit; Hinweis, welche Daten dann ruhen. |
| 1 | **Gebäude** | Typ, Lage/Standort → T_N (Vorschlag aus Klimadaten, Override mit Herkunft), Baujahr, Geschosse, *Keller ja/nein*, *Dachform*, EBF: «aus Räumen» (Default in B) oder «manuell» | Keller nein → kein Bauteil «Kellerdecke», Boden gegen Erdreich |
| 2 | **Sanierungen** | Liste: Jahr, Bauteil (Wand/Dach/Fenster/Boden/Heizung), Umfang %, *Einsparung % (nur A)* | A: wirkt auf Verbrauchsjahre (Gewichtung pro Jahr). B: setzt Bauteil-Fallback «saniert ab Jahr X» |
| 3A | **Verbrauch** *(nur A)* | Frage «Verbrauchsdaten vorhanden?» → Jahresraster (bis 3 Jahre × Energieträger), η-Vorschlag; *Alternative: WP-Stromzähler / kWh direkt*; Mittelung + Streuungs-Ampel + Sanierungsbezug sichtbar | nein → Bauperioden-Schätzung mit Band, deutlich markiert. *«Enthielt der Verbrauch WW?»* ja → kompakter Abzugsblock (Personen *oder* l/d) |
| 3B | **Hülle & Räume** *(nur B)* | 3B.1 Bauteiltypen des Gebäudes (Wand-, Fenster-, Dach-, Bodentypen mit Material-Picker, Herkunft + ±); 3B.2 Räume als Tabelle (Name, Geschoss, L×B oder A, h, θ_int) mit Bauteilen als *Referenz* auf Typen + Fläche | Raum-Bauteil referenziert Typ (Vererbung); Override möglich und markiert. Σ Räume ↔ EBF-Abgleich |
| 4 | **Heizlast** (Ergebnisseite) | Massgebende Q_hl mit Herkunft und Unsicherheitsband; *B: Raumtabelle Φ_T/Φ_V/Φ_HL*; *A: Rechenweg kompakt*; optional Gegenprobe der anderen Methode (klar als Gegenprobe beschriftet, nur wenn deren Daten echt vorhanden sind) | Kein Verbrauch und keine Räume → Status «Schätzung» |
| 5 | **Warmwasser künftig** | Frage «Bereitet die neue WP WW?» ja → Personen/Komfort *oder* V_W,u, Ladetemperatur → ΔT abgeleitet, Zirkulation *nur MFH/ja*; nein → Schritt zeigt nur «WW separat (z. B. WP-Boiler)» | Auftraggeber-Fall: Abzug in 3A, hier «nein» → keine Personen/Komfort-Felder |
| 6 | **Wärmeabgabe** *(optional, aber integriert)* | Pro Raum (B) bzw. pro Heizkreis (A): Typ (Platten 10–33, Röhren/Guss mit Glieder + Tiefe, Konvektor, Handtuch, FBH mit Verlegeabstand/Belag, Wand), Masse, optional Marke/Modell; Ergebnis: Q bei VL X, **nötige VL pro Raum**, Engpass-Räume markiert | Keine HK erfasst → globale VL-Annahme mit Herkunft. Ergebnis **Auslegungs-VL = max(nötige VL)** wird *die eine* VL für WP-Filter, JAZ und Bericht |
| 7 | **Zuschläge & Leistung** | Sperrzeit (EVU-Angabe), verbundene Systeme; Ergebnis Q_h = Q_hl + Q_w + Q_off + Q_as | Q_w nur wenn 5 = ja |
| 8 | **Speicher & Hydraulik** | *WW-Speicher (nur 5 = ja)*, Puffer (Bedingung: L/W-WP, Sperrzeit, Mindestvolumen Gerät), MAG/SV; Overrides wirken überall | — |
| 9 | **Wärmepumpe** | Filter mit Auslegungs-VL aus 6, Q_h aus 7; Auswahl → Bivalenz, JAZ (geschätzte Kennlinie markiert), Modulation | — |
| 10 | **Bericht** | Vorschau, Vollständigkeits-Checkliste (fehlend / geschätzt), Kapitelwahl, Export PDF/JSON | Export erst nach Checkliste (Warnungen dürfen übersteuert werden) |
| + | Zusatzmodule | Förderung, Bewilligung, Offerte. Separat gruppiert, lesen Kanton/Massnahme aus Schritt 0/2 | Nicht in der Hauptschrittfolge |

### 5.2 Dashboard (Seitenleiste desktop, ausklappbare Leiste mobil; immer gleich, liest nur `ergebnis`)

- **Q_h** (gross) mit Methode und Status-Badge («gemessen» / «raumweise» / «Schätzung ±x %»).
- Q_hl · Q_w · Q_off · Q_as als Aufschlüsselung.
- spez. Heizlast W/m² mit EBF-Herkunft. Ampel grau, wenn EBF fehlt.
- **Auslegungs-VL** und Engpassräume aus der Wärmeabgabe («2 Räume brauchen > 55 °C»).
- Speicher (WW/Puffer effektiv), gewählte WP und Q_WP/Q_h-Ampel (eine Logik).
- **Annahmen-Zähler** («7 Werte geschätzt») → Klick öffnet die Fallback-Liste mit Herkunft und Sprungziel.
- Fortschritt pro Schritt.

### 5.3 Technische Leitplanken

- `state` (nur Eingaben, versioniert) → `berechne(state)` (rein, im Kern; liefert Werte *plus* Herkunftsprotokoll pro Wert) → Ansichten (Seiten, Dashboard, Bericht) lesen nur dieses Ergebnis.
- Abgeleitete Werte (q_norm, A aus L×B, Tiefe, U eff.) werden nie in den State geschrieben.
- Sichtbarkeit von Feldern = Funktion `isRelevant(feld, state)`, zentral getestet, auch vom Bericht genutzt (nur relevante Werte drucken).
- Ein Ladepfad `hydrateState(raw)` mit `schemaVersion` und protokollierten Migrationen; keine stillen Ergebnisänderungen.

---

## 6. Urteil: UI-Schicht neu bauen

Begründung:

1. **Kopplungsgrad:** `ui.mjs` exportiert Fachlogik (`resolveBauteilUFrt`, `resolveHuelleUWerte`, `enrichRaeumeWithResolvedUFrt`, `mapPeriodeToBaujahr`, `normalizePicker`, Tür-/f_RT-Tabellen). `main.mjs` und `export.mjs` importieren sie, der Bericht hängt also an der View. Zusätzlich sind Plausi (FLOW-09), WP-Filter (FLOW-11), MAG/SV (FLOW-08) und WP-Ampeln (FLOW-10) in der UI dupliziert. Wer eine Sektion anfasst, verändert Rechenergebnisse.
2. **Rendering-Modell:** String-Templates + `innerHTML` + gezielte DOM-Patches (`setText`/`setHTML` auf ~80 IDs) + `syncXCount`-Heuristiken + Regex-Dispatch in einem 225-Zeilen-`onInputChange` + `setTimeout`-Folgeschreibungen + Neu-Render über `window.__heizlast`. Daraus folgen direkt die gemessenen stale Anzeigen (FLOW-16/17, UX-15). Jede neue Bedingung erhöht die Zahl der Stellen, die synchron gehalten werden müssen.
3. **Navigationsmodell** (Endlosseite, Sektionen nur ein-/ausgeblendet) widerspricht dem geforderten schrittweisen Aufbau mit bedingten Verzweigungen. Ein Umbau auf Schrittseiten berührt praktisch jede Render-Funktion.
4. **Behalten:** `calc/*` (inkl. Picker, Heizkörper, Distribution), `data/*.json`, `state.mjs`-Setter-Prinzip, Persistenz-Grundmuster (mit `hydrateState`), Bericht-CSS und Rechenweg-Format. Zusätzlich das Ergebnisprotokoll für Fallbacks im Kern ergänzen. Nicht in der UI.

Aufwandsschätzung relativ: Neuaufbau der View mit vorhandenem Kern ist kleiner als das Entkoppeln und Nachziehen der rund 40 obigen Befunde im bestehenden `ui.mjs`. Viele Befunde (FLOW-01/02/07/09/12, UX-02/10/42) verschwinden strukturell, sobald es nur noch ein Ergebnisobjekt und eine Relevanzfunktion gibt.

---

### Anhang: Screenshots (`/home/claude/tw/befund/shots/`)

| Datei | Inhalt / Hauptbefund |
|---|---|
| `01-fws-leer-desktop-top.png`, `01-fws-leer-mobile-top.png` | Einstieg: Projektadministration vor Fachdaten; mobil Icons ohne Labels, Toggle ohne Text, Stepper 3-zeilig (UX-30, UX-36) |
| `02-fws-leer-*-full.png` | Ganzseite 5445 / 8371 px; Empty State «0.00 kW» + rote Ampel (UX-25) |
| `10-fws-sec-stamm-desktop.png` | 24 gleich beschriftete «Hinweis»-Leisten, Massnahme/WP-Quelle im FWS-Modus ohne Wirkung (UX-14, UX-30) |
| `10-fws-sec-heizlast-desktop.png` / `-mobile.png` | Personen-Felder trotz «V_W,u direkt» sichtbar (UX-10/12); Methoden-Akkordeon (UX-32); «+ Energieträger» statt Jahre (FLOW-05) |
| `10-fws-sec-ww-desktop.png`, `40-ww-aus-*.png` | WW aus = nur gedimmt, alles editierbar (UX-11) |
| `10-fws-sec-speicher-desktop.png`, `41-speicher-ww-aus-*.png` | WW-Speicher-Block bei WW aus aktiv; MAG nur UI (FLOW-08) |
| `10-fws-sec-ergebnis-*.png` | V_P,Sto 220 l trotz Puffer aus (FLOW-07); ROT ohne Handlung (UX-35) |
| `20-detail-top-*.png` | 13 Tabs, 212 px Sticky-Höhe desktop; mobil Stepper weg (UX-06, UX-31) |
| `30-detail-sec-huelle-desktop.png` | 2745 px für 5 Bauteile; Kopf-U stale nach Picker-Wechsel (FLOW-16) |
| `30-detail-sec-raeume-*.png` | Raumkopf «0.0 m²» stale; Jargon-Quellen; 3100 px mobil für 1 Raum (FLOW-17, UX-33) |
| `30-detail-sec-verteilung-*.png` | Freies ID-Feld, wirkungslose T_VL,alt, Ampel «25 %» ohne Legende, globaler VL-Block stale (UX-34, FLOW-01/18) |
| `30-detail-sec-ergebnis-*.png` | Doppeltes Cockpit, «Verbrauch» = Bauperioden-Schätzung (FLOW-12, UX-35) |
| `30-detail-sec-geraet/foerderung/offerte/baubewilligung-desktop.png` | Zusatzmodule gleichrangig in der Hauptnavigation (UX-31) |
