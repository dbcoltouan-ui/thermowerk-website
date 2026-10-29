# BEFUND — Gesamtrevision «Thermowerk Heizlast Tool»

Stand: 2026-10-29 · Prüfgegenstand: `Thermowerk\Heizlast Tool\` (Code, Daten, Tests, Doku), Live-Bundle `thermowerk.ch/heizlast/` (byte-identisch mit `build\dist\index.html`, Commit 6577db2 vom 01.05.2026), Backend `thermowerk-website\functions\api\heizlast-*.js`.
Referenzen: FWS-Kursunterlagen M3 (Skript, Aufgaben/Lösungen, Foliensätze), Wissensbasis A–N, SIA 384/2:2020, SN EN 12831-1:2017 (= SIA 384.201), EN 442, SIA 2028, Hersteller-Datenblätter (Purmo, Kermi, Stelrad, Zehnder, Vogel & Noot).
Methode: vier unabhängige Prüfungen (Fachlogik · Heizkörper · UX/Datenfluss · Code/Daten/Build/Backend), alle Zahlen mit `node -e` durch den aktuellen Code gerechnet, UI mit Playwright gerendert (30 Screenshots), Backend mit gefälschtem Cookie getestet. Die Doku (STAND/AUDIT/CHANGELOG) wurde als Prüfgegenstand behandelt, nicht als Beleg.

Detailberichte (gleicher Ordner): `befund_fachlogik.md` (41 Befunde) · `befund_heizkoerper.md` (31) · `befund_ux-datenfluss.md` (63) · `befund_code-qualitaet.md` (63) · Screenshots in `shots/`.

---

## 1. Gesamturteil

**Das Tool erfüllt seinen Zweck heute nicht.** Es sieht fertig aus, die 341 Tests sind grün, der Build ist reproduzierbar — aber:

- **Beide Modi sind nicht vorhanden.** Es gibt keinen Modus «raumweise», sondern einen FWS-Grundmodus mit zuschaltbarem «Detail», dessen Hüllen-Heizlast nur parallel angezeigt wird. Dashboard, Speicher und WP-Filter rechnen weiter mit FWS bzw. Bauperioden-Schätzung; der Bericht schaltet still auf die Hülle um. In derselben Sitzung existieren drei verschiedene Q_h (6.42 / 7.49 / 6.42 kW).
- **Der FWS-Modus rechnet in Kernfällen falsch.** Mehrjahres-Verbrauch wird summiert statt gemittelt (3 Jahre → 3-fache Heizlast). Sanierungen sind im UI gar nicht erfassbar. Die WP-Betriebsstunden-Methode liefert die WP-Nennleistung statt der Heizlast (+43 %). Kurszahlen werden nicht reproduziert (−6.6 % durch Heizwert-Konvention).
- **Der raumweise Kern ist mathematisch richtig, aber falsch gefüttert.** U-Wert-Fallbacks für die Hauptjahrgänge 1946–1994 sind 30–50 % zu optimistisch; die «mehrstufige» Fallback-Kaskade ist nicht monoton (mehr Wissen → schlechteres Ergebnis, Sprünge ±34 %); Wärmebrücken, Klimastationen, Mindestluftwechsel-Tabellen liegen als Daten vor, werden aber nie geladen; die Hülle vererbt nicht an die Räume.
- **Das Heizkörper-Modul (Priorität) erfüllt den Zweck zu ~20 %.** Ohne Marke gibt es nur Bauart × Frontfläche; Höhe, Tiefe, Gliederzahl sind keine Rechengrössen; Gussradiatoren werden um Faktor 1.6–2.2 unterschätzt (Bestand fälschlich «zu klein»); die nötige Vorlauftemperatur je Raum wird berechnet, aber nirgends angezeigt; kein Gebäude-Maximum, kein WP-Urteil, nichts im Dashboard, nichts im Bericht.
- **Keine einzige Quelle der Wahrheit.** Vier Vorlauftemperaturen, zwei WW-Blöcke, drei WW-ΔT, zwei Projektnamen, zwei Rechenpfade (Dashboard vs. Bericht), doppelte Plausi/WP-Filter/Ampeln in UI und Kern, abgeleitete Werte im State eingefroren.
- **Bedingte Felder sind kaputt** (`display:flex` schlägt `hidden`): Personen/WW-Komfort erscheinen immer; der Fall «WW künftig separat» wird nicht erfüllt, und der Verbrauchsabzug fällt still auf Werte eines ausgegrauten Blocks zurück.
- **Das Backend ist offen.** Die Auth prüft nur, ob der Cookie-Text `tw_heizlast_auth=` vorkommt. Mit einem gefälschten Cookie: HTTP 200 mit Kundenprojekten (Namen, Adressen), Lesen/Überschreiben/Löschen möglich.
- **Tests täuschen Sicherheit vor.** Die FWS-Tests prüfen den Code gegen sich selbst (Aufgabe 1A fixiert 11.79 kW, Kurs sagt 12.5); E2E-Tests laufen über einen Pfad, den neue Daten nie erreichen; HK-Tests vergleichen die DB mit Werten, die mit derselben Formel erzeugt wurden.

**Zählung:** 198 belegte Befunde — 15 KRITISCH · 56 HOCH · 82 MITTEL · 45 NIEDRIG (Überschneidungen zwischen Bereichen bewusst stehen gelassen, da aus verschiedenen Richtungen gefunden).

**Empfehlung (Begründung in PLAN.md §1): Neubau der Anwendung auf einem bereinigten Rechenkern.** Übernehmen: die reinen Rechenprimitive (`qnwwJahr`, `qhlAusQn`, `qwDetail`, `qoffFormel`, `computeRoomHeatload`, `uFromLayers`, `dTm`, `leistungsFaktor`, `magVolumen`, Validatoren), die Tabellen `normwerte.json`/`richtwerte.json`, das Konzept des Stufen-Pickers, das State-Setter-Prinzip, das Berichts-Layout, das Backend-SQL, die Cloudflare-Infrastruktur (Pages + D1 + Login-Idee). Ersetzen: UI, Orchestrierung, State-Schema, Datenkopien, Bundler, Auth, HK-Datenbasis, Tests. Sofortmassnahme am Live-Stand empfohlen (Auth + Mehrjahres-Summe), siehe PLAN §2.

---

## 2. Die 20 gravierendsten Befunde

| # | ID | Schwere | Befund (Fundort) | Wirkung |
|---|---|---|---|---|
| 1 | BUILD-06 | KRITISCH | Auth prüft nur Cookie-Substring, Token nie gespeichert/signiert (`heizlast-projects.js:11-14`, `heizlast-auth.js:49-55`) | Jeder kann alle Kundenprojekte lesen, überschreiben, löschen (revDSG-Relevanz). Nachgewiesen. |
| 2 | FACH-01 / FLOW-05 | KRITISCH | Mehrjahres-Perioden werden annualisiert und **summiert** (`fws.mjs:228-241`) | 3 × 2500 m³ Gas → Q_hl 33.9 kW statt 11.3 kW. Jede Mehrjahres-Erfassung → Faktor-n-Überdimensionierung. |
| 3 | FACH-02 / FLOW-06 | KRITISCH | Sanierungen (`heizung.sanierungen`, Zeitgewichtung) haben **kein UI**; Bericht druckt «Sanierungsfaktor 1.0000» | Kernvorgabe «Sanierungen pro Jahr gewichtet» nicht vorhanden; Gewichtungsmodell selbst bei >1 Massnahme unsauber (FACH-03). |
| 4 | UX-02 / CODE-02 | KRITISCH | Kein Modus «raumweise»; zwei Rechenpfade (main vs. export) | Dashboard 6.42 kW, Bericht 7.49 kW; WP-Vorschläge passen nicht zum Bericht. |
| 5 | FLOW-01 / HK-12 / HK-14 | KRITISCH | Vier Vorlauftemperaturen; Kern und WP-Filter nutzen `global.tVL_neu` (35 °C, nach erstem Raum unsichtbar); Bericht druckt totes Feld `tVLMaxHeizung` (55 °C) | Gleiche Heizfläche: UI-Ampel 77 %, Kern 21 %; WP-Filter mit falscher VL; Bericht falsch. |
| 6 | HK-05 / HK-06 | KRITISCH | HK-Fallback = Bauart × Frontfläche, höhen-/tiefenunabhängig; Glieder 1300 W/m² | Gussradiator 10 Gl. 600×160 @70/55: Tool 375 W, Referenz 600–780 W → Bestand fälschlich «zu klein». |
| 7 | HK-12 / HK-13 / UX-40 | KRITISCH | Nötige VL je Raum berechnet (`tVL_max`), nirgends angezeigt; HK fehlt im Bericht und Dashboard komplett | Prioritätsmodul endet in einer Ampel ohne Folgen; kein WP-Tauglichkeits-Urteil. |
| 8 | HK-18 / FLOW-09 | KRITISCH | HK-Plausi doppelt implementiert (UI mit Kreis-VL, Kern mit globaler VL) | Dieselbe Heizfläche grün (826 W) in UI, rot (230 W) im Kern. |
| 9 | FLOW-03 | KRITISCH | Migration setzt `picker:{}` → alte `variant`-Werte ignoriert, keine Schemaversion | Alte Projekte ändern Ergebnis still (Wand «unsaniert» 1.20 → 0.60). |
| 10 | FACH-04 | HOCH | Methode B: Q_hl = kWh·COP/h = WP-Nennleistung (`fws.mjs:383-395`) | FWS Aufgabe 4: 8.4 kW, Tool 12.0 kW (+43 %). |
| 11 | FACH-05 / FACH-06 | HOCH | Heizwert Hi 9.91/10.04 ohne η-Anpassung; tvoll-Tabelle mit «Jura» und MFH = Schulhaus-Zeile | Kurs-Aufgabe 2: 11.72 statt 12.55 kW; MFH −5 % ohne Grundlage. |
| 12 | FACH-20 / FACH-21 / DATA-02 / CODE-17 | HOCH | U-Fallbacks 1946–1994 zu optimistisch (AW 1961–77: 0.60 statt 1.2–1.7); Kaskade nicht monoton; doppelter `else if (isDoppel)` → Wanddicke wirkungslos | Hüllen-Heizlast 30–50 % zu tief; «mehr Wissen → schlechteres Ergebnis» (1930: 1.80 → 1.20; Boden 1965: 0.80 → 3.05). |
| 13 | UX-10 / UX-11 / UX-13 | HOCH | `.field{display:flex}` überschreibt `hidden`; WW-aus nur gedimmt; Abzug fällt still auf künftiges WW zurück | Auftraggeber-Fall «WW künftig separat» nicht erfüllt; falscher Abzug 4848 kWh/a aus ausgegrautem Block. |
| 14 | FLOW-02 | HOCH | Hülle vererbt nicht an Räume (`enrichRaeumeWithResolvedUFrt`) | Wand-U 0.15 in Hülle → Raum rechnet weiter 0.50; UI-Text «Default aus Hülle» falsch. |
| 15 | FACH-22 / FACH-23 / FACH-24 | HOCH | Pauschal-Rest mit erfundener Geometrie («1 m² AW pro m² EBF»); θe pauschal je Kanton; ΔU_WB nie gesetzt; `klimadaten/normwerte/richtwerte.json` nie geladen | «Q_hl,Norm» im Bericht ist eine Schätzung ohne Geometrie; −6 % Wärmebrücken; Kanton BE = Bern und Adelboden gleich. |
| 16 | FACH-30 / FACH-51 | HOCH | Gebäude-Heizlast = Σ Räume (+25 % durch Innentransmission) als Vergleichswert Norm/Verbrauch | Vergleich systematisch «rot»; WP-Auslegung auf Raumsumme. |
| 17 | HK-07 / DATA-06 | HOCH | HK-Stammdaten unbelegt (zitierte Quellen enthalten keine HK-Tabelle); Purmo C22 −14 %, Charleston −16…−22 %; Buderus = Stelrad byte-identisch | «Datenblatt-Genauigkeit» laut STAND nicht haltbar; Test zementiert die Dublette. |
| 18 | DATA-04 / UX-41 | HOCH | WP-DB: «—» in Zahlenfeldern → Brauchwasser-WP (2.5 kW) als Heizungs-WP; Bericht-Gerätetabelle sucht `id`, DB hat `ID` → erscheint nie | Falsche Gerätevorschläge; Bericht ohne Gerät. |
| 19 | FACH-60 / CODE-29 / CODE-30 / CODE-31 | HOCH | Zirkelschluss-Tests (Sollwerte aus Code; E2E auf totem Pfad; HK-Formel gegen formelabgeleitete DB; Flur durch Sollwert ersetzt) | 341 grüne Tests entdecken FACH-01/04/05/20/21, HK-05/18 nicht. |
| 20 | UX-20 / UX-21 / BUILD-09 | HOCH | «Neu» verwirft ohne Rückfrage; voller localStorage → Toast «gespeichert»; leere Cloud-Liste löscht lokale Projekte | Datenverlust-Pfade. |

---

## 3. Befunde nach Bereich (Kurzfassung — Details in den Teilberichten)

### 3.1 Fachlogik / Rechenkern (FACH-01…63, 41 Befunde: 2 K · 10 H · 22 M · 7 N)
FWS: Summe statt Mittel (01), Sanierungen ohne UI und unsauberes Gewichtungsmodell (02/03), Methode B falsch (04), Heizwert-Konvention (05), tvoll-Tabelle erfunden (06), keine Klimakorrektur trotz Infotext (07), Sperrzeit Werktag/Sonntag statt kumulierte h/d, Faktor 23× bei toff 23 h (08), td-Clamp 12 h (09), Methodenpriorität Code ≠ Doku (10), Puffer 20 L/kW Qh ohne Quelle (11), fSto 1.25/1.10 ohne Quelle (12), drei WW-ΔT (13), zwei WW-Blöcke mit stiller Kopplung (14). Raumweise: U-Tabellen zu optimistisch (20), Kaskade nicht monoton (21), Pauschal-Rest erfunden (22), θe je Kanton (23), ΔU_WB 0 (24), fRT 0.45 vs 0.5, `groundUequiv` existiert nicht (25), n50/e/n_min hart, Tabellen nicht angebunden (26), Bauperioden-Mapping falsch (27), Doppelmauerwerk-Bug (28), drei Fenster-Tabellen (29), Raumsumme statt saldiert (30), deutsche W/m²-Bänder (31). WW/WP: multiplikative statt additive Verluste (40), Dubletten fws/dhw mit zwei Rundungsregeln (41), synthetische WP-Kennlinie bei W35 (42), Filter ohne T_N/VL-Bezug (43). Plausi: Band unsaniert vs. sanierter Wert (50), Norm/Verbrauch-Vergleich falsch kalibriert (51). Tests: Zirkelschluss (60–63).
**Methodik-Entscheid:** Das Tool nutzt einen DIN/TS-12831-1-Hybrid (deutscher NA), unbegründet und nicht konsistent angebunden. Gängige CH-Praxis ist **SIA 384/2:2020** (Anwendung von SN EN 12831-1 = SIA 384.201): Transmission wie EN, Lüftung nur Mindestluftwechsel-Tabelle, kein vereinfachtes EN-Verfahren, kein Aufheizzuschlag, θe aus SIA 2028, Wärmeerzeuger nach SIA 384/1. → Modus «raumweise» auf SIA 384/2 ausrichten; bei Sanierung FWS-Verbrauch primär, raumweise als Plausi und Heizflächen-Grundlage.

### 3.2 Heizkörper-Modul (HK-01…31, 31 Befunde: 5 K · 9 H · 8 M · 9 N)
Richtig: logarithmische Übertemperatur (01), Exponentenformel, Längen-Skalierung; Typ 22 600×1000 @55/45 → 827 W (−2…−5 % zu Purmo/Kermi). Falsch/fehlend: VL-Rückrechnung arithmetisch genähert (02, bis 2.4 K), Konvektor n 1.10 statt 1.40 (03, +33 %), HK-Default 1000 W/m² (04, Faktor 1.6–2.9 zu tief), Glieder ohne Tiefe/Gliederzahl (05), höhenunabhängig (06), Stammdaten unbelegt (07), Hinweis 90/70→×0.67 falsch (08, richtig 0.795), Konvektor/Bad-Werte inkonsistent (09). Zweck: tVL_max nie angezeigt, kein Gebäude-Max, kein WP-Urteil (12), Bericht ohne HK (13), Bericht druckt totes 55-°C-Feld (14), Dashboard ohne KPI (15), Eingabemaske ohne Höhe/Länge/Tiefe/Glieder (16), DB nur 11 Reihen/6 Marken (17). Datenfluss: zwei Rechenpfade (18), Mischsystem falsch (19), Typ-Wechsel hinterlässt q_norm (20), undokumentierte State-Felder (21), kein HK im FWS-Modus (22), tVL_alt nie gelesen (23). Zielbild (Eingabemaske, Rechenkette mit Bisektion, Gebäude-Max, Ampel ≤55/55–65/>65, Massnahmen, Ausgaben) in `befund_heizkoerper.md §6`.

### 3.3 UX / Navigation / Datenfluss (UX/FLOW, 63 Befunde: 6 K · 18 H · 29 M · 10 N)
Struktur: Reihenfolge unlogisch (Zuschläge vor Heizlast, Wärmeübergabe vor Heizlast) (01), kein Modus (02), Modusschalter unbeschriftet (03), Endlosseite 5.4k/13k/21k px, Stepper mobil nicht sticky (06). Bedingte Felder kaputt (10–13), irrelevante Felder im FWS-Modus (14), stale Blöcke (15). Datenfluss: vier VL (FLOW-01), Hülle ohne Vererbung (02), Migration verfälscht (03), drei Ladepfade (04), Summe statt Mittel (05), Sanierungen ohne UI (06), Speicher-Overrides wirkungslos in Dashboard/Bericht (07), MAG/SV nur in UI (08), HK doppelt (09), drei WP-Ampeln (10), WP-Filter doppelt (11), «Verbrauch»-Kachel zeigt Bauperioden-Schätzung (12), EBF nur manuell, leer → rot (13), zwei Projektnamen (14), setTimeout-Kaskaden + Render über Devtool-Objekt (15), Picker-Kopf stale (16). Edge Cases: Speicherfehler verschluckt (20), «Neu» ohne Rückfrage (21), kein Offline-Status (22), keine Validierung (24). Optik: 24 gleich beschriftete Hinweisleisten (30), 212 px Sticky (31), 13 Tabs ohne Hierarchie (31), Raum = 2100/3100 px mit Entwicklerjargon (33). Bericht: HK fehlt (40), Gerätetabelle nie (41), widersprüchlich (42), tote Felder (43), kein Annahmen-Kapitel (46). Fallback-Transparenz: kein Herkunftsmodell, keine Unsicherheit (50–52). Ziel-Navigationskonzept (10 Schritte, Dashboard, Leitplanken) in `befund_ux-datenfluss.md §5`.

### 3.4 Code / Daten / Build / Backend (CODE/DATA/BUILD, 63 Befunde: 2 K · 19 H · 23 M · 19 N)
Architektur: Fachlogik in `ui.mjs` (01), zwei Rechenpfade (02), Bericht ignoriert Overrides (03), Singletons (04), Render über `window.__heizlast` (05), 53× innerHTML + Regex-Dispatch (06), `onInputChange` 226 Zeilen (07), abgeleitete Werte im State (08). Redundanz: `hydraulik/**` 130 KB nicht im Bundle (10), alter Resolver-Pfad tot (11), WW doppelt (12), esc/fmt 4–6× (13), f_RT 4× mit 0.45/0.5 (14), `tInnenAuslegung` existiert nicht → f_RT 0 statt 0.125 (15), 65 eslint-Warnungen (16), Doppelmauerwerk-Bug (17). Benennung: DE/EN-Mix, drei Bauperioden-Schemata, Einheiten uneinheitlich, ß, «Daemm» (22–28). Tests: E2E auf totem Pfad (29), Zirkelschluss (30), Referenz gegen Referenz (31), ungetestet: UI, Persistenz, Export, Modus, Bundler, Backend (33). Daten: Kopien im Code divergieren von JSON (01), zwei Fallback-Quellen (02), WP-DB 96 % Ballast (03), «—»-Strings (04), unplausible COP×P (05), HK-DB −14…−29 % (06), klimadaten/normwerte/richtwerte nie geladen (07), wp-bilder alle «fehlt» (08). Build: Regex-Bundler mit 6 Bruchstellen (02), kein Git-Repo (03), Deploy-Skripte im Backup-Ordner, robocopy /MIR (04), Autosave bei jedem Tastendruck mit verschlucktem Fehler (05). Backend: Auth wirkungslos (06), kein timing-safe/Rate-Limit (07), keine Validierung, last-write-wins (08), Drift-Cleanup löscht lokal (09), «Neu» ohne Rückfrage (10), Migration ohne Version (11), `website/CLAUDE.md` beschreibt anderes System (13). Doku: 180 KB, Session-Nummern mehrfach neu, tote Verweise, falsche Behauptungen (37–39). Tragfähigkeit je Modul in `befund_code-qualitaet.md §5`.

---

## 4. Lücken gegenüber dem Zweck (konsolidiert)

| Vorgabe | Status heute |
|---|---|
| Zwei gleichwertige, umschaltbare Modi mit einer massgebenden Heizlast | fehlt (Flag `detail.aktiv` + verstreute ifs) |
| Verbrauch über 3 Jahre: Mittelung, Plausibilisierung, Klimabereinigung | Summe statt Mittel; keine Streuungs-Plausi; keine HGT-Korrektur |
| Sanierungen dem Jahr zugeordnet, pro Jahr gewichtet | kein UI; Modell für >1 Massnahme unsauber |
| EBF automatisch aus Räumen | fehlt (Σ nur Anzeige, kein Faktor NWF→EBF) |
| WW, Puffer, Speicher gemäss Kurs | Verluste multiplikativ, fSto/Puffer ohne Kursquelle, Spitzendeckungsvolumen fehlt, drei ΔT |
| Raumweise nach gängiger CH-Praxis, begründet | DIN/TS-Hybrid, unbegründet; SIA 384/2-Elemente fehlen (n_min-Tabelle, b_u, U_equiv, Saldierung, SIA-2028-Stationen) |
| Mehrstufige, monotone, sichtbare Fallbacks mit Herkunft/Unsicherheit | nicht monoton; kein Herkunftsmodell; keine Unsicherheit; Wanddicke teils wirkungslos |
| Schrittweise, bedingte Felder, logische Reihenfolge | Endlosseite; Reihenfolge unlogisch; `hidden` kaputt; irrelevante Felder sichtbar |
| Eine Quelle der Wahrheit (Dashboard = Seiten = Bericht) | zwei Rechenpfade, vier VL, doppelte Plausi/Filter/Ampeln, abgeleitete Werte im State |
| HK ohne Marke aus Bauart/Höhe/Länge/Tiefe/Gliedern → Q_N, Umrechnung, nötige VL, WP-Urteil, zu kleine HK markiert, in Dashboard/Bericht | nur Bauart × m²; VL berechnet, nicht angezeigt; kein Gebäude-Max/Urteil; nichts in Dashboard/Bericht; nicht im FWS-Modus |
| Bericht nachvollziehbar (Annahmen sichtbar) | raumweise ohne Rechenweg; kein Annahmen-Kapitel; tote Felder; Gerätetabelle nie; HK fehlt |
| Datensicherheit | Auth offen; Datenverlust-Pfade; keine Schemaversion |

## 5. Was gut ist und übernommen wird

- **Rechenprimitive (rein, DOM-frei, verifiziert):** `fws`: `qnwwJahr`, `qhlAusQn`, `qwDetail` (ohne Clamp), `qoffFormel` (0–8 h), `speichervolumen`, `BAUPERIODE_KWH`, `SPEZ_BAND`, `SANIERUNG_PRESETS`-Bänder · `heatload`: `computeRoomHeatload`, `htBauteil`, `sumHT`, `vMin`, `hVRaum` · `envelope`: `uFromLayers`, `RSI_RSE`, `raumVolumen`, `bauklasseFromBaujahr` · `dhw`: `qwuTag`, `vwStoRoh`, `magVolumen`, `ausdehnungsfaktor`, `rundeSpeicherMarkt` · `distribution`: `dTm`, `leistungsFaktor`, `plausibilitaetHeizflaeche`, `maxVorlauftemperatur` (Rückrechnung, Näherung ersetzen) · `heizkoerper`: `qNormFromModell`, `flaecheVonHL` · `heatpump`: `inverterCheck`, DB-Adapter · `offerte`: Validatoren · `foerderung`, `plausi`.
- **Tabellen** `normwerte.json`, `richtwerte.json` (b_u, ΔU_WB, e, n50-Klassen, fRH, ISO-13370, λ) — fachlich korrekt, nur nicht angebunden. Wissensbasis E Tab. 3.5 (Röhren W/Glied), Referenzhaus-JSONs, `FWS-RECHENWEGE.md §3a` (Sub-Perioden-Modell) als Konzept.
- **Muster:** Stufen-Picker (`material-picker`) als Konzept; `state.mjs` Pfad-Setter + Microtask-Batching; Persistenz-Protokoll (Active-Slot, Liste, Cloud-Mirror); Berichts-Layout (`BROSCH_CSS`, Rechenweg Formel → Werte → Ergebnis); Live-Ampel je Heizfläche als UI-Idee.
- **Infrastruktur:** Cloudflare Pages + D1 + Passwort-Login als Konzept; Backend-SQL (parametrisiert, UPSERT); reproduzierbarer Build; Tool läuft lokal ohne Backend.

## 6. Prüfmethode und Belege

- Testsuite im Container reproduziert (341/341 grün), Bundle neu gebaut (523'276 B, byte-identisch mit Live).
- Referenzrechnungen: FWS Aufgaben 1A/1B/2/3/4, Folie 49/52, Moosseedorf, DIN-Referenzhaus 238/5, IBO, eigene Raum- und HK-Beispiele (`befund_fachlogik.md Anhang A`, `befund_heizkoerper.md §5`).
- Playwright: 30 Screenshots Desktop 1280 / Mobil 390 px, `/api/**` gemockt; Interaktionsproben (Felder, Modus, Picker, Quota).
- Backend: `heizlast-projects.js` mit gefälschtem Cookie → 200 + Projektliste.
- Statische Analyse: Modulgraph, acorn (Funktionslängen), eslint (65 Warnungen, `no-dupe-else-if`).
- Web-Recherche: SNV (SN EN 12831-1 = SIA 384.201), SIA 384/2:2020 Vorwort, espazium, suissetec, Kanton ZH Energiepraxis, BFE Leistungsgarantie, EnDK EN-3, SIA 2028, HEV-HGT; Purmo/Kermi/Stelrad/Zehnder/V&N-Datenblätter (Quellen in den Teilberichten).
