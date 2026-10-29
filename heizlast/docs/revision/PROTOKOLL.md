# Revisions-Protokoll — Heizlast Tool

Zweck: Nachvollziehbarkeit aller Prompts und daraus folgenden Änderungen. Wird nach Finalisierung + erfolgreicher Prüfung gelöscht.

## 2026-10-29 14:21 — Prompt 1 (Daniel)
Zugriff auf Thermowerk-Ordner und Live-Heizlasttool prüfen.
→ Zugriff eingerichtet: C:\...\Gebäudetechnik Coltouan, D:\...\Documents\Thermowerk, D:\...\Documents\thermowerk-website.
→ Festgestellt: Live (thermowerk.ch/heizlast) = Heizlast Tool\build\dist\index.html (byte-identisch), Commit 6577db2 vom 01.05.2026.

## 2026-10-29 14:47 — Prompt 2 (Daniel): Auftrag Gesamtrevision
Extrem kritische Gesamtrevision (Fachlogik, Praxis, Datenfluss, Optik, UX, Redundanzen, Edge Cases) + priorisierter Plan Überarbeitung/Neubau. Zwei Modi: FWS-Kurs und raumweise (SIA 384.201 / EN 12831). Mehrstufige, sichtbare Fallbacks. Bedingte Felder, Single Source of Truth.

## 2026-10-29 15:02 — Prompt 3 (Daniel): Präzisierungen
1. Recherche auch in D: erlaubt (freigegeben: D:\Samsung Kopie 2026, D:\Users\Daniel\Documents).
2. Priorität Heizkörper-Modul: Erfassung nach Bauart/Typ + Massen/Gliederzahl, Normleistung EN 442 / Herstellertabellen als Fallback, Exponent-Umrechnung, nötige VL-Temp je Raum, WP-Tauglichkeit, zu kleine HK markieren. Optional, aber voll integriert (Datenfluss, Dashboard, Bericht).
3. Freiheit beim Umbau; Backup vor jedem Eingriff; eigene Arbeits-Backups mit Zeitstempel + Protokoll; gespeicherte Projekte müssen nicht erhalten bleiben; felsenfeste Bausteine (Login etc.) übernehmen, aber sauberes neues System gewinnt im Zweifel.
4. Befund/Plan/Doku als Markdown; an Daniel zusätzlich PDF oder Text im Chat; Claude baut alles; fertige Prompts falls mehrere Sessions nötig.
5. Nicht aufblähen, aber High-Class; Agents und günstigere Modelle erlaubt (Modell je Schritt angeben); strikt sequentiell mit Abschluss + Prüfung; max. 4 Fragerunden (1 verbraucht).

### Aktionen
- 2026-10-29_140351: Backup BACKUP/heizlast-tool_pre-revision_2026-10-29_140351.tgz (ohne node_modules/BACKUP/REVISION).
- REVISION/ angelegt (BEFUND.md, PLAN.md folgen; _work/ = Arbeits-Backups).

## 2026-10-29 15:02–16:00 — Revision durchgeführt
- Code/Daten/Wissensbasis/FWS-Textauszüge in die Cloud-Sitzung gestaged (REVISION/_work/transfer/*.tgz), Testsuite (341/341) und Bundle-Build dort reproduziert (byte-identisch mit Live).
- Vier Prüf-Agents: Fachlogik (Fable), Heizkörper (Fable), UX/Datenfluss (Opus, 30 Playwright-Screenshots), Code/Daten/Build/Backend (Opus). Backend-Auth mit gefälschtem Cookie getestet → offen.
- Ergebnis: REVISION/BEFUND.md (198 Befunde: 15 K / 56 H / 82 M / 45 N), PLAN.md (Empfehlung Neubau auf bereinigtem Kern, 12 Sessions + optional Session 0 Hotfix, fertige Prompts), KONTEXT.md (Architektur-Entscheide, Regeln, Definition of Done); Teilberichte befund_*.md; PDFs für Daniel.
- Keine Änderung am Tool-Code oder am Live-Stand in dieser Session.

## 2026-10-29 16:02 — Prompt 5 (Daniel)
Kein Hotfix am alten Tool (Neubau). Design: Farben und abgerundete Kacheln/Konturen behalten, Rest frei. Ablauf: je Session neuer Chat im Projekt «thermowerk».
→ KONTEXT.md (Design, Regeln 8/9) und PLAN.md (§2 entfällt) aktualisiert; KONTEXT/PLAN/BEFUND in die Projekt-Wissensbasis geschrieben.

## 2026-10-29 16:06 — Session 1: Fundament (Opus-Prompt aus PLAN §4, ausgeführt mit Fable 5.1)
Prompt: Repo klonen, PC-Zugriff, `heizlast/` anlegen (Vite+Preact+Signals+TS strict, Vitest, Playwright, eslint), Pages-Build, Referenzmaterial, minimale Shell, README/PROTOKOLL.

### Entscheide
- Staging-Pfad `/heizlast-neu/` (Vite `base`), Output `public/heizlast-neu/` (gitignored, wird im Pages-Build erzeugt). Live `/heizlast/` unberührt.
- Root-`package.json` `build` = `npm --prefix heizlast ci && npm --prefix heizlast run build && astro build`; `.node-version` = 22 im Root.
- Design: Tokens (Inks/Navy/Rot, Radien 0–4 px = eckig, wie im alten `style.css` Zeile 53) übernommen; Layout neu (Topbar · sticky Schrittleiste · Inhalt ≤ 760 px · Dashboard rechts 320 px; mobil Dashboard als aufklappbare Leiste unten).
- eslint: eigene Regel `thermowerk/kein-eszett`; `no-restricted-imports`/`no-restricted-globals` für `src/kern` + `src/daten`; zusätzlich Schichten-Test in Vitest.
- Herkunftsmodell als Typ `src/kern/wert.ts` bereits in S1 angelegt (keine Rechenlogik).
- Zusätzlich ins Repo übernommen (für S9/S11): `referenz/alt-export/` (export.mjs, export-offerte.mjs), `referenz/alt-data/*.json`, `referenz/alt-style/style.css`, `referenz/alt-tests/`.
- FWS-PDF-Auszüge: 5 Dateien mit Text (Foliensätze 01/02, M3 Skript, Aufgaben+Lösungen, Praxisbeispiel); Pläne/Situationspläne sind reine Bilder (kein Text) und wurden weggelassen.

### Änderungen
- Backup altes Tool: `REVISION\_work\backups\heizlast-tool_pre-S1_2026-10-29_150728.tgz` (ohne node_modules/BACKUP/_work/build/dist).
- Neu: `heizlast/` (Konfig, src, tests, e2e, docs, referenz), Root `.gitignore`, `.node-version`, `package.json`.

### Prüfung
- `npm test` 5/5 grün · `npm run lint` ohne Fehler · `npm run build` ok (29.8 kB JS / 10.4 kB CSS) · Playwright 4/4 grün (Desktop 1280, Mobil 390), Screenshots `docs/revision/shots-neu/s1-*.png`.
- Root `npm run build` (heizlast + astro) erfolgreich; `dist/heizlast-neu/` und `dist/heizlast/` beide vorhanden.
- Behobener Stolperstein: scrollbare Schrittleiste vergrösserte auf Mobil die Layout-Viewport (flex min-width auto) → `.shell > * { min-width: 0 }`.

## 2026-10-29 16:34 — Prompt 6 (Daniel): Rollen + Design bestätigt
Radien der neuen Schritt-0-Seite bestätigt (eckig bleibt). Neu Regel 10: Daniel ist kein Entwickler; Entwicklung/Backend/Deploy/Konfiguration inkl. Prüfung sind Claudes Arbeit, Daniel nur Backup-Tester; bei Wartezeiten erneut prüfen, erst abschliessen wenn bestätigt.
→ KONTEXT.md (§2 Design, §3 Regel 10, §4 Definition of Done «Deploy von Claude verifiziert»), PLAN.md (§3 Prüfspalte, §4 alle Prompts: «Daniel bestätigt/Review/Secret setzen» → Claude prüft selbst) angepasst; in Repo, Projekt-Wissensbasis und REVISION-Ordner nachgeführt.
→ Deploy Session 1 von Claude verifiziert: https://thermowerk.ch/heizlast-neu/ liefert HTTP 200 mit der neuen Shell; /heizlast/ unverändert 200.

## 2026-10-29 16:39 — Session 2: Datenbasis & Fachgrundlagen (Fable-Prompt aus PLAN §4, ausgeführt mit Fable 5.1)
Prompt: Alle Fachdaten als JSON unter `heizlast/data/` mit `_meta` und Quelle je Tabelle; sechs Dateien; Vitest-Schema/Plausi; `docs/datenquellen.md`; fachliche Fragen bündeln.

### Entscheide
- Quellenlage: FWS-PDFs vom PC gestaged (Folien 12/13/30/43/45/54–57/91–95 als Bild gelesen — Formeln, η-Bänder, Speicherverlust-Diagramm, f_sto, Spitzendeckung, Bivalenz). Vier Recherche-Agents (Klima/SIA, Hülle, Platten-HK, übrige Heizflächen) mit Belegpflicht (URL + Seite + Abrufdatum); Berichte unter `docs/recherche/`.
- FACH-12 teilweise revidiert: f_sto 1.25/1.10/1.00 ist belegt (SIA 385/2:2015 §4.3.2.5, Folie 54); Kurs-Empfehlung EFH 400 l / MFH 2–3 Ladezyklen übernommen.
- Heizwerte: zwei Konventionen `fwsKurs` (10.5/10.4, Default) und `hi` (BFE 42.9 MJ/kg → 10.0 kWh/l; Erdgas Hu 36.3 MJ/m³n → 10.08) mit Korrekturfaktor für Kurs-η.
- Klima: alle 40 SIA-2028-Stationen aus der öffentlichen Korrigenda C1:2015 (θe «kalt», 1-h-Min, HGT 20/12). Höhenkorrektur-Regel belegt (ND.1.1, SIA 384/2 Kap. 4/5), Gradient nicht öffentlich → 0.6 K/100 m aus 10 Stationspaaren (0.4–0.9) ab 200 m Differenz, als Annahme. PLZ-Zuordnung 2-/3-stellig = Thermowerk-Regel inkl. kantonaler Vorgaben (AG, GR, VD, SH, BS).
- SIA 384/2: n_min aus Tabelle NA.7 (SN EN 12831-1/C1:2020, gleichzeitig mit SIA 384/2 in Kraft), b_u aus SIA 384.201-C1:2014 Tabelle ND.3; Anhang A/B und ΔU_WB nicht öffentlich → ISO-13370-Tabelle (Wissensbasis B 3.8, Spalten als R-Stufen 0/0.5/1/2 geordnet) und DIN-Pauschale 0.10/0.05 als Annahme.
- Hülle: Epochen-Defaults BESTAND als Schichtketten (λ aus BFE-Bauteilekatalog 2002/SIA D0170/SIA 279); Spannen aus GEAK, BFE-UFELD, Bauteilekatalog, eREN, SIA 380/1-Grenzwerten; Kontrollwert je Default nachgerechnet (Test). Monotonie gilt für die Spannen (min/max) über die Epochen; der Default-U selbst kann steigen (Holzbalkendecke mit Schlacke 0.9 → Betondecke 3.0), dokumentiert. Zwei effektive λ kalibriert (Bruchstein 0.9, Schlacke 0.2).
- Heizkörper: Platten W/m = Mittel aus sechs Datenblättern (Buderus, Kermi, Purmo/Radson, V&N, Stelrad, Brugman; Belege je Wert in `platten.belege`); Typ 30 liegt physikalisch unter Typ 22 (keine Konvektorbleche) → Test prüft 10<11<20<21<22<33 und 20<30<33 statt der im Prompt genannten Reihe. Eine Exponententabelle (Mittel der Datenblätter). Guss DIN 4703 HG-TEC/Buderus, Charleston (60.9 W/Glied H600 3-Säuler vs. Wissensbasis 60), Konvektor n 1.40 (JOCO 1.41, Terraline 1.37–1.55), Bad Kermi Basic-D, FBH Floortec (EN 1264) + Viessmann-Kontrolle, Wandheizung WEM/Variotherm. Alte Modell-DB komplett ersetzt (205 belegte Einträge, Buderus/Stelrad-Dublette aufgelöst, Purmo 22/600 = 1709 W/m statt 1462, Charleston korrigiert).
- WP-DB: nur `hauptgeraete`, 41 Heizung / 6 Brauchwasser, Zahlen/null, Preis null = auf Anfrage, 9 Geräte mit Plausibilitätsflag (BO-0003/4/7/8, OE-0001/2/3/5/13); Verifikationsstatus ehrlich («KI-Session, nicht fachlich geprüft»).

### Änderungen
- Neu: `data/fws.json`, `data/waermepumpen.json`, `data/klimastationen.json`, `data/huelle-epochen.json`, `data/sia384-2.json`, `data/heizkoerper-tabellen.json`, `data/README.md`; `tests/daten/*.test.ts` (7 Dateien, 141 Tests); `docs/datenquellen.md`; `docs/recherche/2026-10-29_*.md` (4 Berichte); README aktualisiert.
- Kein Rechencode; keine Änderung an `src/`.

### Prüfung
- `npm test` 141/141 grün (Meta-Konvention je Datei, Quellen-IDs auflösbar, kein Eszett/keine ae-oe-ue-Umschreibung in Werten; Plausi: U-Spannen monoton über Epochen, ISO-6946-Nachrechnung = Kontrollwert, Dämmung↑ ⇒ U↓; HK W/m steigend über Höhe, W/m² Front fallend, Typ-Reihenfolge, Exponenten in [1.0, 1.45], 55/45-Kontrollwerte, Befund B1/B2/B3, Charleston 60 W, Konvektor 45/35 → 0.27, 90/70 → 0.795; Kurslösungen 40.3 kWh/d, 2.69 h, 1.89 kW, Sperrzeit 24/(24−t), Bauperioden-Bänder; Klima-Stichproben und Korrelationen; n_min/b_u/U_eq-Monotonie). `npm run lint` ohne Fehler, `npm run build` ok.
- Deploy: Commit + Push, Cloudflare-Build; Staging `https://thermowerk.ch/heizlast-neu/` per Fetch geprüft (siehe Chat-Bericht), Live `/heizlast/` unverändert.

### Offene fachliche Fragen an Daniel (Fragerunde 3)
1. Marken im CH-Bestand für die Modell-DB: Arbonia/Runtal/Schäfer/Roca-Radiatoren fehlen (nur Fallback-Tabellen); welche Marken sieht Thermowerk am häufigsten?
2. Bad-Innentemperatur: Default 24 °C (DIN/Komfort) oder SIA-konform wie Haupträume (20–22 °C)?
3. Flur innerhalb einer Wohnung: 15 °C (DIN) oder 20 °C (CH-Praxis, keine Türen)?
4. WW-Standard-Default für EFH: «mittlerer Standard» 45 l/P·d oder Kurs-Rechenwert 40 l/P·d (Aufgabe 4)?

## 2026-10-29 17:51 — Prompt 7 (Daniel): Antworten Fragerunde 3
1. Heizkörper fast immer ohne Marke → Bauart/Masse/Tiefe/Glieder sind der Hauptpfad, Modell-DB optional (so gebaut). 2. Bad 22 °C (SIA: wie Haupträume). 3. Flur 20 °C; abgetrennter Eingangsbereich 15 °C (neuer Raumtyp). 4. Warmwasser-Standard 45 l/P·d, überschreibbar. Neu Regel: alle vorbelegten Werte sichtbar als Zahl mit Markierung «Standardwert».
→ `data/sia384-2.json` 1.0.1 (Bad 22, Flur 20, Raumtyp eingangsbereich 15), `data/fws.json` 1.0.1 (efh_mittel default), Tests angepasst (141 grün), KONTEXT §2/§3 ergänzt; Commit + Push, Deploy geprüft.

## 2026-10-29 17:59 — Session 3: Kern FWS-Modus (Fable-Prompt aus PLAN §4, ausgeführt mit Fable 5.1)
Prompt: `src/kern/` als reine TypeScript-Module mit Herkunftsmodell: `fws.ts` (Jahresraster, Konvention, WW-Abzug, Sanierungen §3a, Methoden B/C, Bauperioden-Fallback, t_voll), `warmwasser.ts`, `zuschlaege.ts`, `speicher.ts`, `plausi.ts`; Tests extern belegt (Kurslösungen A1/1B/2/3/4, Folie 49/52, Moosseedorf, Mehrperioden, Öl-Lieferungen, Überlappung, Sanierungen mit Zeitgewichtung, Konventionswechsel).

### Entscheide
- Herkunftsmodell ergänzt: Herkunft `berechnet` (Wert aus Formel; selbst keine Annahme, Eingangswerte landen in `annahmen[]`; Begründung = Formel mit eingesetzten Zahlen), optionales `band` (min/max), Konstruktoren und Unsicherheits-Fortpflanzung in `wert.ts`; `Hinweis { stufe, code, text, pfad? }` als Validierungs-/Plausi-Meldung. KONTEXT §2 nachgeführt.
- Daten-Injektion: `src/daten/fws.ts` mit TypeScript-Interfaces als Schema; `fwsDaten()`/`hydraulikDaten()` geben das JSON ohne Cast zurück → tsc prüft die Dateien beim Build gegen das Schema. Kern liest nie Dateien.
- Warmwasser-Verluste **additiv** (Folie 49, SIA 385/2) — die Kurslösungen 2–4 verketten multiplikativ (1.1·1.15·1.15). Folge: Q_hl und Q_h aller Kursaufgaben innerhalb ±1 %, Q_w weicht bis 3 % ab (A2 saniert −1.1 %, A3 −1.5 %, A4 −3 %); im Test dokumentiert, Q_w-Formel selbst mit Kurs-Q_WW exakt (5.64 kW).
- Jahresraster: Eintrag mit `jahr` = 365 Tage, `von`/`bis` inklusiv (Kalendertage); Lieferungen als «Tank voll bis Tank voll». Überlappung gleicher Träger → Fehler ohne Resultat. Streuungs-Ampel 10/20 % nur über Einträge ≥ 300 Tage (Thermowerk-Annahme, in fws.json). Hinweis bei < 3 Jahren (Folie 29).
- Sanierungen exakt nach FWS-RECHENWEGE §3a: Sub-Perioden je Zeitraum, kumulativer Faktor, W_pre = W·L/Σ(L_j·F_j), W_ist = W_pre·F_heute (L und L_j in Kalendertagen, sonst Faktor 365/366 bei Schaltjahren); geplante Massnahmen multiplikativ auf `qhlKorr`; ausgeführt ohne Datum → Warnung, als vor dem Zeitraum angenommen. Drei Heizlasten: `qhlUnsaniert` (Plausi-Band), `qhlIst`, `qhlKorr` (= massgebend).
- Konvention `hi`: η-Presets werden mit Ho/Hi umgerechnet (Q_n identisch), eigener η gilt als Hi-bezogen. Hi Erdgas 10.08 (BFE) statt 10.04 der alten BEISPIELRECHNUNG (unbelegt) → Moosseedorf hi 8.945 statt 8.871 kW (dokumentiert).
- WW-Abzug: nur mit `wwAbzug` (= «WW bisher über Heizung»), Zuordnung zum grössten Träger oder explizit; Abzug > Nutzenergie → Heizanteil 0 mit Warnung.
- Methode B: Q_n = h/a·Q_WP bzw. Strom·COP, Q_hl = Q_n/t_voll (8.4 kW, Aufgabe 4); Q_k und Entzugsleistung (57 W/m → gelb nach fws.json-Ampel; Kurs: zu gross) als Nebenrechnung; Zeitraum des Zählers synthetisch aus `heute` − Betriebsjahre für die Sanierungs-Gewichtung.
- Klimabereinigung HGT_norm/HGT_ist je Eintrag, Default aus, nur Heizanteil, Begründung «nicht FWS-Kurs». HGT-Istwerte sind Eingabe (keine Jahresdaten im Repo).
- Puffer: max(Hersteller-Minimum, Kriterium): Luft/Wasser 40 l/kW Q_WP (Band 30–50), Sole HK+ERR 20 l/kW, Sole FBH/Wasser 0, Sperrzeit-Überbrückung nur auf Wunsch (Bezug Q_hl, Info «meist unrealistisch»). Marktrundung in fws.json. MAG/Sicherheitsventil nach Wissensbasis K (Tabellenbuch B4 S.399–401, DIN EN 12828) in neuer `data/hydraulik.json`; Kontrollbeispiel 27.8 → 35 l reproduziert.
- Plausi: spez. Heizleistung des unsanierten Zustands gegen Folie-37-Band, ±15 % gelb; Minergie-P 8–12 W/m²; Vergleich Norm/Verbrauch grün bei +10…25 %, gelb 0…10 und 25…40, rot darunter/darüber (Thermowerk-Annahmen in fws.json).
- Einheiten intern: W, kWh/a, kWh/d, °C, K, l, h; `fmt` für Schweizer Zahlformat in Begründungen.

### Änderungen
- Neu: `src/kern/typen.ts`, `fws.ts`, `warmwasser.ts`, `zuschlaege.ts`, `speicher.ts`, `plausi.ts`; `src/daten/fws.ts`; `data/hydraulik.json`; `tests/kern/*.test.ts` (6 Dateien, 74 Tests) + `tests/daten/hydraulik.test.ts`.
- Geändert: `src/kern/wert.ts` (berechnet, band, Konstruktoren, Hinweis, fmt); `data/fws.json` 1.1.0 (`verbrauch`, `klimabereinigung`, `puffer.regel`/`marktrundungLiter`, `plausibilitaet.bandToleranzProzent`/`vergleichNormVerbrauch`, Quelle fws-rechenwege); README, `src/kern/README.md` (Kern-API), `data/README.md`, `docs/datenquellen.md`.
- Kein UI-Code, keine Orchestrierung (Session 6).

### Prüfung
- `npm test` 247/247 grün (davon 74 Kern-Tests: Kurs A1 12.495/1.136/13.63 ≙ 12.5/1.14/13.64; 1B 33 295/16.65/3.33/19.98 exakt; A2 12.571/1.796/0.506/14.87 ≙ 12.55/1.79/0.51/14.85, saniert 8.847/1.264/0.514/10.63 ≙ 8.8/1.26/0.52/10.58; A3 11.5 exakt, 17.06 ≙ 17.14; A4 8.4 exakt, 8.98 ≙ 9.0, Q_k 9.14, 57 W/m, 1813 h; Folie 49/52 40.26/2.68/1.889 ≙ 40.3/2.69/1.89; Moosseedorf beide Konventionen; 3 Jahre → Mittel 2 500 m³; 3 Lieferungen/24 Monate → 3 000 l/a; Überlappung → Fehler; Sanierung 1 und 2 Massnahmen gegen Handrechnung ±0.01 kW; Konventionswechsel; Monotonie Sanierung/Sperrzeit/WW/Speicherverlust/MAG-n; Herkunft an jedem Wert).
- `npm run lint` ohne Fehler (inkl. Eszett-Regel), `npm run build` ok (UI unverändert 29.8 kB).
- Deploy: Commit + Push; Staging per Fetch geprüft (siehe Chat-Bericht).

## 2026-10-29 19:05 — Session 4: Kern raumweise (SIA 384/2) + Hüllen-Kaskade (Fable-Prompt aus PLAN §4, ausgeführt mit Fable 5.1)
Prompt: `huelle.ts` (Bauteiltypen mit Stufen-Picker, EINE Schichtkette, Clamp, Sanierung ab Jahr, Override, Klartext), `raumweise.ts` (Räume, Bauteile als Referenz auf Gebäudetyp, Φ_T mit ΔU_WB/b_u/U_equiv, Φ_V = V·n_min·0.34, Σ Räume und saldiert, EBF aus Räumen, Rest ohne «1 m² pro m² EBF»), `klima.ts` (PLZ/Ort → Station → θe + Höhenkorrektur); Tests Referenzhaus 238/5, IBO, eigenes CH-EFH, Property-Tests.

### Entscheide
- Loader `src/daten/huelle.ts`, `sia384.ts`, `klima.ts` (Interfaces = Schema, tsc prüft die JSON-Dateien); JSON-Strings bleiben `string`, der Kern prüft Enum-Werte (Richtung/Grenze).
- Hüllen-Kaskade als eine Kette: Epochen-Default Bestand → Bauweise (Epochen-Default mit dieser Bauweise, nächste Epoche zum Baujahr; sonst Schichtvorlage `bauweisen[].schichten`; sonst Pauschal-U) → Dicke ersetzt Tragschicht (Zweischalenmauerwerk: Gesamtdicke, Innenschale = Rest) → Dämmung ja/nein (nein: Kerndämmung → Luftschicht, Sparrendach → leeres Sparrenfeld; ja ohne Default: Dämmdicke der nächsten gedämmten Epoche = «geringste Dämmdicke», Bauteilekatalog S. 25) → Dämmstoff/Dämmdicke → ISO 6946. **Clamp** in die Epochen-Spanne nur, solange Dämmung ja/nein geschätzt ist (sie dominiert die Spanne); bekannte Dämm-Angabe gewinnt (Info «ausserhalb Spanne»). Clamp-Spanne = Epoche des Gebäudes bzw. der Sanierung, nicht die Epoche einer Vorlage.
- Unsicherheit (Thermowerk-Annahme): alles geschätzt → halbe Spanne/U (max. 100 %); Dämmung bekannt ±30 %, Dämmdicke bekannt ±20 %, alle Stufen ±10 %; Fenster Generation ±10 %, + Rahmen ±5 %; Tür Typ ±10 %; Innenbauteile ±15 %.
- Sanierung ab Jahr X je Bauteiltyp: Stufen der Sanierung ersetzen ihre Schicht; ohne Angaben Dämm-/Fenster-/Tür-Default der Sanierungs-Epoche als Standardwert; `uUnsaniert` bleibt verfügbar; geplante Sanierungen nur mit `zustand: 'geplant'`.
- Fenster: eine Tabelle Generation × Rahmen (Uw = uwJeUf[Spalte des Rahmens]); Epochen-Default = uwDefault (mit Holzrahmen konsistent); `rahmenAlt` (Uf alter Rahmen) nicht angewendet, dokumentiert.
- Raumweise SIA 384/2: Φ_T,k = (U + ΔU_WB)·A·f·(θint − θe); f: aussen 1, unbeheizt b_u (ND.3-Situationen/Lookup, Nachbartemperatur oder manuell), beheizt (θint − θnb)/(θint − θe) (CODE-15 behoben: Raum-θint), Erdreich Böden U_equiv nach **ISO-13370-Formel** (B' = A/(0.5·P), λ 2.0, w 0.3; Tabelle B 3.8 als Kontrolle ±2 %) mit f_g1 1.45 · f_g2 = (θint − θm,e)/(θint − θe) · f_GW (EN 12831:2003/SIA 384.201 — SIA 384/2 Anhang B nicht öffentlich, als Annahme), Wände gegen Erdreich < 2 m wie aussen / > 2 m wie unbeheizt (SIA 380/1 Figur 2). Φ_V = V·n_min·0.34·Δθ mit Tabelle NA.7; «Raum ohne Aussenbezug» = ohne Fenster/Aussentür/Aussenwand (Dach allein zählt nicht); Dichtheit Standard: altbau wenn Baujahr < 1995 und Fenster nicht ersetzt. Kein n50, kein f_RH.
- Gebäude: `summeRaeume` (Σ Φ_HL beheizt, Heizflächen, Vorzeichen bleibt) und `saldiertRaeume` (nur Bauteile nach aussen/unbeheizt/Erdreich/andere Nutzungseinheit + Lüftung) getrennt; `gebaeude` = saldiert + Rest ist massgebend. EBF = Σ Nettoflächen × 1.10 (Band 1.10–1.15, FWS Folie 33) oder manuell. Rest: Hüllflächen-Eingabe (A_AW, A_F, A_D, A_B, Volumen; Hüllen-U, b_u, ΔU_WB) oder Φ'·A (Bandmitte Folie 37, als grobe Schätzung markiert).
- Jahresmittel θm,e (für f_g2): Stationswert SIA 381/2, sonst Höhenregression 11.5 − 0.5 K/100 m (RMSE 0.8 K, ±1 K) — in klimastationen.json 1.1.0.
- Daten erweitert (mit Quellen): huelle-epochen.json 1.1.0 (Schichtvorlagen für 7 Bauweisen ohne Epochen-Default, Pauschal-U Gewölbe 1.5, `innenbauteile`), sia384-2.json 1.1.0 (`erdreich.formelIso13370`, `erdreich.faktoren`), klimastationen.json 1.1.0 (`jahresmittel`), fws.json 1.2.0 (`ebf`).
- Property «mehr bekannte Stufen ⇒ |ΔU| ≤ 25 % gegen Spannenmitte» ist physikalisch nicht für alle legitimen Eingaben haltbar (Beton 20 cm ungedämmt gegenüber Hohlmauer 1965: +46 % selbst nach Clamp; Kerndämmung 2 statt 4 cm: +38 %). Getestet wird deshalb: (1) Bestätigen der Default-Stufen ändert U nicht (0 %, schrittweise), (2) jede epochentypische Bauweise/Dämmstoff bleibt in der Epochen-Spanne, (3) Dicke ±1 typische Stufe ≤ 25 % der Spannenmitte (massive Wände), (4) Monotonie Dämmung/Dämmdicke/Dämmstoff/Dicke/Fenstergeneration, (5) Befund-A8-Fälle ohne Sprung.

### Änderungen
- Neu: `src/kern/klima.ts`, `huelle.ts`, `raumweise.ts`; `src/daten/huelle.ts`, `sia384.ts`, `klima.ts`; `tests/kern/klima.test.ts` (12), `huelle.test.ts` (27), `raumweise.test.ts` (22); `tests/daten/session4.test.ts` (4).
- Geändert: `data/huelle-epochen.json`, `sia384-2.json`, `klimastationen.json`, `fws.json` (Versionen oben), `src/daten/fws.ts` (ebf), README, `src/kern/README.md`, `data/README.md`, `docs/datenquellen.md` §6a/7.
- Kein UI-Code, keine Orchestrierung (Session 6).

### Prüfung
- `npm test` 327/327 grün: Referenzhaus 238/5 Räume (Küche 1007/1003, Dusche 1066/1062, Wohnzimmer 1456/1442, Schlafzimmer 1042/1035 W; Φ_T/Φ_V/H_T je ±2 %), Flur echt gerechnet −106 W gegenüber −95 W (Formblatt rundet f_RT auf −0.18; 11 W dokumentiert), Σ Räume 4466 ≙ 4447 W; saldiert 4289 W ≤ Σ (Formblatt G 3560 W nutzt DIN-Erdreichfaktoren auf Gebäudeebene — nicht reproduzierbar, dokumentiert). IBO: Lüftung 14 Räume ±2 % (Σ 2782 W), HWR negatives H_T, Erdreich 289 W gegenüber 246 W (ISO-Formel U_equiv 0.14 statt DIN-Tabelle ≈ 0.12; +17 % auf 4 % der Last). CH-EFH von Hand (Bern −7, 1965): Wohnen 2098.6, Bad 570.3, Flur 64.8 W, saldiert 2678.7, EBF 38.5 m², 69.6 W/m² (±0.5 %). U_equiv-Tabelle 20 Punkte ±8 %. Klima: Bern −7, Adelboden −10 (PLZ 3715), GR 1500 m → Chur −13, Begrenzung ±6 K, Override/Annahmen. Hülle: Default = Kontrollwert für 6 × 7 Fälle, ISO-6946-Handrechnung 1.264, Kaskaden-Properties, Sanierung, Fenster/Türen/Innenbauteile, Override.
- `npm run lint` ohne Fehler, `npm run build` ok (UI unverändert).
- Deploy: Commit + Push; Staging per Fetch geprüft (siehe Chat-Bericht).

## 2026-10-29 20:20 — Session 5: Kern Wärmeabgabe / Heizkörper (Fable-Prompt aus PLAN §4, ausgeführt mit Opus 5.5)
Prompt: `waermeabgabe.ts` als reines Modul nach Zielbild befund_heizkoerper.md §6 — Datenmodell je Heizfläche (Bauart-Enum, bedingte Masse, Modell, Typenschild, Minderungen, Kreis), Q_N mit Herkunft/Unsicherheit, n aus einer Tabelle, log. Übertemperatur, Raum-Deckung + Ampel, θ_VL,req per Bisektion, Gebäude-Max mit Top 3/Ausklammern/Ampel 55/65, Massnahmen, alte Heizkurve als Fallback-Stufe, FWS-Modus mit verteilter Heizlast, `auslegungsVL` als einzige VL; externe Tests B1–B3, Charleston, Konvektor, 90/70, Mischraum, Typ-Wechsel, Bisektion, ohne Räume.

### Entscheide
- Loader `src/daten/heizkoerper.ts` (Interface = Schema, tsc prüft das JSON). Neue Daten nur in `heizkoerper-tabellen.json` 1.1.0 → `auslegung` (Standardwerte: Spreizung Radiatoren 10 K / Flächen 7 K, Ziel-VL 55 °C, Suchbereich 20–90 °C, Einrast-Toleranz 30 mm, Unsicherheiten je Stufe, Guss-Tiefe 160 mm, FBH VA 150 / Rλ,B 0.10 (Bad 0), Konvektor verkleidet) und Quelle `tw-annahme`. Keine Zahl im Code.
- Q_N-Stufen: Typenschild (±2 %, Umrechnung über Δθ_log und n) > Modell-DB (±5 %; Formen W/m, W/Element je Höhe, W/m Breite, Höhe × Breite) > Tabelle nach Massen (±15 %) > alte Heizkurve (Mindest-Q_N ±30 %: Raum war bei θ_VL,alt gedeckt → θ_VL,req = θ_VL,alt ist obere Schranke). Extrapolation ausserhalb der Tabellen proportional (±25 %), Standardwert-Masse ±25 %, quadratisch kombiniert. Herkunft: Typenschild `berechnet`, Modell/Tabelle `tabelle`, mit Standardwert-Mass `fallback`/`standardwert`, Heizkurve `schaetzung`.
- Tabellen-Pfade: Platten W/m × Länge (Höhe interpoliert); Guss/Stahl W/Glied nach Bauhöhe oder Nabenabstand × Tiefe, gemessene Höhe rastet ±30 mm auf DIN-Stufe ein (B2: 600 → 580 mm = NA 500), Gliederzahl sonst aus Länge/Gliedbreite; Röhren nach Säulen × Höhe (Charleston), Gliederzahl aus (L − 26)/46; Konvektor verkleidet (V&N Kontec, gleiche Tiefe/Höhe gemittelt) oder Unterflur (JOCO); Bad (Kermi Basic-D) und Vertikal (Stelrad P2/K2) nach Höhe × Breite; FBH q(ΔθH 15 K = 40/30/20) nach VA × Rλ,B, mit n 1.10 auf Bezug 35/28/20, gedeckelt bei 100 W/m² (Oberflächentemperatur); Wandheizung 80 W/m² bei 35/28 oder WEM-System. Gebläsekonvektor nur über Typenschild/Modell (keine Massentabelle).
- Minderungen f1–f3 typisch aus Tabelle oder in %; f4/f5 nur bei Anschluss «reitend» (Herstellerwerte gelten für Normanschluss), f5 je Spreizung interpoliert. Ohne Angaben f_m = 1 (keine Annahme).
- Raum: Q je Heizfläche bei Kreis-VL bzw. Ziel-VL (Standard 55 °C) und Kreis-Spreizung; Deckung = Σ Q / Φ_HL, Ampel aus `ampel.deckung` (1.0/0.85), Hinweis ab 200 %. θ_VL,req = Bisektion über Σ Q(θ, θ − Spreizung) (Toleranz 0.001 K), gemischte Kreise bei ihrer VL gedeckelt. Massnahmen schon bei Deckung < 1 (gelb und rot): alle stärkeren Plattentypen gleicher Nische mit neuer θ_VL,req, nötige Länge/Gliederzahl bei Ziel-VL (Platte zusätzlich als Typ 33), FBH-Fläche bei 35/28, Gebläsekonvektor-Q_N für die fehlende Leistung, Vorlauf halten (Hybrid).
- Gebäude: Auslegungs-VL = max θ_VL,req der beheizten, nicht ausgeklammerten Räume mit Φ_HL > 0; unerreichbar → 90 °C und rot; ohne Bewertung höchster Kreis-VL (Stufe `heizkreis`); Override gewinnt (Herkunft `override`, Warnung wenn unter dem Bedarf). Ampel ≤ 55 / ≤ 65 / > 65 °C mit Klartext-Urteil, Top 3, massgebender Raum.
- FWS-Modus: Φ_HL,Raum = Q_hl / EBF × 1.10 (fws.json) × A_Raum, sonst Anteil der erfassten Raumflächen (Hinweis); Schätzung ±25 %. θ_int aus Raumtyp (sia384-2.json), sonst 20 °C Standardwert.
- Typ-Wechsel: `heizflaecheBauartWechseln` behält nur Masse der neuen Bauart (Platte ↔ Platte = gleiche Nische, Tiefe/Modell/Typenschild verworfen); der Kern liest nur `relevanteMasse(bauart)`, liegengebliebene Felder wirken nicht (HK-20).

### Änderungen
- Neu: `src/kern/waermeabgabe.ts`, `src/daten/heizkoerper.ts`, `tests/kern/waermeabgabe.test.ts` (33 Tests).
- Geändert: `data/heizkoerper-tabellen.json` 1.1.0 (`auslegung`, Quelle `tw-annahme`), `tests/daten/heizkoerper-tabellen.test.ts` (+1), README, `src/kern/README.md` (Kern-API Session 5), `data/README.md`, `docs/datenquellen.md` §6b.
- Kein UI-Code, keine Orchestrierung (Session 6).

### Prüfung
- `npm test` 361/361 grün: B1 T22 600×1000 @55/45 853 W (Band 842–873; Q_N 1697 ≙ Purmo 1709 −0.7 %); B2 Guss 10 Gl. 600/160 @70/55 770 W (Band 600–780; 96 W/Glied ≙ V&N 94.4 +1.7 %); B3 T21/T22/T33 600×800, 1200 W → 79.7/70.6/60.5 °C (Befund 81/72/61 mit altem Fallback; mit Q_N 1032 W exakt 81.1); Charleston 3-Säuler H600 60.9 W (KB-E 60); Konvektor n 1.40 → f(45/35) 0.270; 90/70 → 0.795; FBH VA100/Rλ,B 0.05 71 W/m² (Viessmann 70); Bisektion HK-02 46.0 °C, Näherung 43.6 °C, Probe ±0.1 K; Mischraum Σ Q, gemischter Kreis, Typ-Wechsel, Heizkurve, Ampel-Schwellen, Override, unerreichbar, FWS-Verteilung, Monotonie, Herkunft an jedem Wert.
- `npm run lint` ohne Fehler, `npm run build` ok (UI unverändert).
- Deploy: Commit + Push; Staging per Fetch geprüft (siehe Chat-Bericht).

## 2026-10-29 21:00 — Session 6: Ergebnis, State, Persistenz (Opus-Prompt aus PLAN §4, ausgeführt mit Opus 5.5)
Prompt: `state/schema.ts` (State v2 nur Rohangaben, Typen + Validierung), `kern/berechne.ts` (einziger Rechenpfad → `Ergebnis` mit massgebender Heizlast + beiden Methoden, WW, Zuschlägen, Speicher, Wärmeabgabe, Gerät, Plausi, annahmen[], vollstaendigkeit[], Status je Schritt), `kern/relevanz.ts` (`relevant(pfad, state)`), `state/store.ts` (Signals), `state/hydrate.ts` (schemaVersion, Migrationskette, Fixtures), `state/persistenz.ts` (Entwurf + Projektliste, Autosave ≥ 1 s, Fehler sichtbar, Rückfrage, Cloud-Schnittstelle); Gerätefilter aus alt-calc/heatpump.mjs, Bivalenz als FWS-Tabelle Folie 95.

### Entscheide
- State v2 = nur Rohangaben; ja/nein-Fragen `boolean | null` (null = offen → Vollständigkeit). Listen mit stabilen ids (vom Store vergeben); Pfade adressieren Listen über ids (`raeume.r2.bauteile.b1.flaecheM2`) — gleich für Setter, Relevanz und Hinweis-Sprungziele.
- **Eine** Sanierungsliste für beide Modi: FWS wertet Massnahme/Einsparung/Datum (§3a); raumweise setzt Bauteiltypen der passenden Art (fws.json `massnahmen[].bauteile`) bzw. `bauteiltypIds` auf «saniert ab Jahr» (späteste wirksame gewinnt). Bauteiltypen im State haben kein eigenes Sanierungsfeld. Mit geplanten Massnahmen rechnet raumweise im Zustand «geplant» (konsistent zu FWS `qhlKorr`).
- **Eine** Raumliste für beide Modi (raumweise mit Bauteilen; FWS nur für Heizflächen); Heizflächen je Raum unter `waermeabgabe.raeume[raumId]`; Raum löschen nimmt Heizflächen mit, Heizkreis löschen ordnet neu zu (FLOW-18).
- WW bisher (`verbrauch.abzug`) und WW künftig (`warmwasser`) gleiches Schema, getrennte Äste, keine stille Kopplung (UX-11/13). Gegenprobe der anderen Methode nur mit echten Daten (Rechnungen bzw. Räume mit Bauteilen).
- EBF als eine Funktion `ebfBestimmen` (aus raumweise.ts herausgelöst, Verhalten unverändert; ohne Flächen jetzt `null` statt 0) — gilt in beiden Modi.
- Auslegungs-VL: aus der Wärmeabgabe; ohne bewertete Heizflächen Standardwert 55 °C (heizkoerper-tabellen.json `zielVLDefaultC`) als sichtbare Annahme. Gerätefilter nimmt max(Auslegungs-VL, WW-Ladetemperatur), MAG die Auslegungs-VL.
- Gerätewahl (neu `kern/geraet.ts`, Daten fws.json 1.3.0 `geraetewahl`): r = Q_h/Q_WP, grün 0.75–1.00 (Kurs-Faustregel Folie 3; Antwort im Skript nicht abgedruckt, 0.75 gemäss FWS-RECHENWEGE §16.2; Aufgabe 4 = Grenzfall), gelb 0.60–0.75 und 1.00–1.10, sonst rot (Thermowerk-Annahme); Filter Q_WP ∈ [Q_h·0.9, Q_h/0.75], Vorlauf, Kategorie Heizung, Quelle, Aufstellung, Schall. Bivalenz aus Folie 95 (zwischen 50 und 100 % gegen monovalent interpoliert = Schätzung, unter 25 % nicht abschätzbar). Synthetische Kennlinie und JAZ-Formel des alten Tools nicht übernommen.
- Status je Schritt: offen (Vollständigkeit oder Kern-Fehler) > Warnung > mit Annahmen > vollständig; Bericht-Status aus allem.
- Validierung ohne Zusatzbibliothek (`normalisiereState`, Feld-Spezifikationen): unbekannte Schlüssel weg, falsche Typen verworfen und protokolliert, doppelte ids verworfen; läuft beim Laden. Test: v2-Fixtures laufen verlustfrei durch (Spezifikation vollständig).
- Versionen: v1 = Shell-Entwurf Session 1 (`{ projektname, methode }`), v2 = Schema. Projekte des alten Tools werden mit Klartext abgelehnt (nicht importierbar, Entscheid Daniel).
- Persistenz: neue Schlüssel `thermowerk-heizlast-v2-entwurf` / `-projekte` (altes Tool unberührt); Entwurf speichert den Hash des zuletzt gespeicherten Stands (ungespeichert überlebt Neuladen); Projektliste mit KPI aus dem massgebenden Ergebnis (UX-26), Name = `projekt.name` (FLOW-14); lokale Einträge nie automatisch löschen (BUILD-09); Cloud-Schnittstelle `CloudSchnittstelle` (+ `keineCloud`) für Session 10.
- UI minimal angebunden (Projektname/Methode im Store, Status je Schritt und Dashboard-KPIs aus dem Ergebnis, Topbar «Neu»/«Speichern» mit Rückfrage); Gestaltung in Session 7.

### Änderungen
- Neu: `src/state/schema.ts`, `hydrate.ts`, `store.ts`, `persistenz.ts`, `app.ts`; `src/kern/berechne.ts`, `relevanz.ts`, `geraet.ts`; `src/daten/waermepumpen.ts`, `index.ts`; `src/ui/format.ts`; `tests/fixtures/state-v1-shell.json`, `state-v2-fws-moosseedorf.json`, `state-v2-raumweise-efh.json`; `tests/state/*.test.ts` (5 Dateien, 89 Tests + Snapshots), `tests/kern/geraet.test.ts` (10); `e2e/persistenz.spec.ts`.
- Geändert: `src/kern/raumweise.ts` (`ebfBestimmen`, `flaecheAus` exportiert), `data/fws.json` 1.3.0 (`geraetewahl`), `src/daten/fws.ts`, `src/state/typen.ts`, `src/state/ui.ts`, `src/ui/App.tsx`, `Topbar.tsx`, `Dashboard.tsx`, `ProjektMethode.tsx`, `schritte.ts`, `src/main.tsx`; `tests/daten/fws.test.ts` (+1), `tests/daten/session4.test.ts` (Version ≥ 1.2); README, `src/kern/README.md`, `data/README.md`, `docs/datenquellen.md`.

### Prüfung
- `npm test` 461/461 grün (neu 100): berechne FWS = Moosseedorf-Handrechnung (Q_hl 9 304.7, Q_w 581.0, Q_off 845.9, Q_h 10 731.6 W; Befund A1 ±0.5 %), raumweise = CH-EFH von Hand (2 098.6 / 570.3 / 64.8 W, saldiert 2 678.7 W, EBF 38.5 m²), 2 × T22 600×1000 @55/45 im Band 2 × 842–873 W, θ_VL,req wird die Auslegungs-VL für Filter und MAG; Snapshot je Modus; Auftraggeber-Fall (WW bisher ja, künftig nein: Abzug wirkt, Q_w 0, kein WW-Speicher, künftige Personen ohne Wirkung); Modus-Wechsel, Gegenprobe, Bauperiode, Puffer abgewählt/Override, Gerätewahl, Sanierung raumweise, verwaiste Heizflächen; Relevanz-Tabelle 41 Fälle + Masse je Bauart; Migration v1→v2, verlustfreie v2-Fixtures, Ablehnung altes Tool/neuere Version/kaputtes JSON, Typfehler protokolliert; Persistenz mit Mock-localStorage (Quota, gesperrt, Autosave ≥ 1 s mit Fake-Timern, Entwurf + ungespeichert nach Neuladen, Neu/Laden mit Rückfrage, Löschen); Store (Pfade mit ids, eine Neuberechnung je Änderung, keine abgeleiteten Werte im State, Aktionen); Gerät (Kurs-Faustregel, Aufgabe 4, Folie-95-Tabellenpunkte, Filter).
- `npm run lint` ohne Fehler; `npm run build` ok; Playwright 6/6 (Shell Desktop/Mobil, Persistenz: Entwurf überlebt Neuladen, Speichern, «Neu» mit Rückfrage).
- Deploy: Commit + Push; Staging per Fetch geprüft (siehe Chat-Bericht).

### Nachtrag 21:30 — Ampel als Prozent-Skala (Wunsch Daniel)
- Prompt (Kurzform): Ampel nicht nur als Farbe, sondern als %-Skala mit grünen/gelben/roten Bereichen; Rückfrage zur Richtung der Faustregel und zu Leistungsstufen.
- Entscheid: Kern liefert `Skala` (Bereiche, Achse, Wert, Marken) — `kern/skala.ts`; `Ergebnis.skalen { vorlauf, wpGroesse }`; jede `Dimensionierung` trägt `uebergroesse` [%] und `skala`. WP-Grösse als Übergrösse (Q_WP/Q_h − 1): grün 0 … +33 % (Kurs Q_h ≥ 0.75 · Q_WP), gelb −9 … 0 % und +33 … +67 %, sonst rot; Grenzen zählen zum milderen Bereich (Aufgabe 4 genau +33 % = grün am Rand). Neues optionales Feld `geraet.qWpAuslegungW` (Datenblattleistung bei θe und Auslegungs-VL, FWS Folie 93) ersetzt für Ampel/Bivalenz den Datenbankwert A−7/W35. UI-Komponente `Skala.tsx`, im Dashboard (Vorlauf immer, WP-Grösse bei gewähltem Gerät).
- Prüfung: `npm test` 465/465, lint/build ok, Playwright 8/8 (neu `e2e/skala.spec.ts`: vorbelegter Entwurf Moosseedorf + Gerät → Q_h 10.73 kW, Skala grün +4 %), Screenshots `shots-neu/s6-skala-*.png`.

### Nachtrag 21:55 — Fachentscheide Daniel (Chat)
- Prompt (Kurzform): zu kleine WP bis −9 % bleibt gelb (Heizstab); θe immer mindestens −8 °C; Vorlauf je System (FBH/Radiatoren) anpassbar; gelb +33 … +37 %, darüber rot.
- Umsetzung: `klimastationen.json` 1.2.0 `auslegungsregel` + `berechne.thetaEAuslegung` (`Ergebnis.thetaE`, Annahme + Hinweis `klima.thermowerkRegel`; kältere Werte bleiben); `fws.json` `geraetewahl.rotAbUebergroesseProzent` 37 (ersetzt das r-Band 0.60); `heizkoerper-tabellen.json` 1.2.0 `auslegung.standardVLJeSystemC`; State `waermeabgabe.system` (ersetzt `speicher.puffer.heizflaechen` — eine Quelle für Standard-VL, Puffer- und MAG-Kriterium); Quelle `tw-entscheid` in den drei Dateien; KONTEXT §2 «Fachentscheide 29.10. (S6)».
- Wirkung: CH-EFH-Fixture (Eingabe −7 °C) rechnet mit −8 °C: saldiert 2 776.6 W (Handrechnung bei −8 °C im Test dokumentiert); Kern-Test raumweise bleibt bei −7 °C (Kernfunktion unverändert).
- Prüfung: `npm test` 468/468, lint/build ok, Playwright (siehe Chat-Bericht).

### Nachtrag 22:05 — Korrektur θe (Daniel)
- Prompt (Kurzform): −8 °C ist nur der Standardwert, solange keine belastbaren Klimadaten vorliegen; mit Station gilt deren Wert (auch −7 °C); immer überschreibbar; keine «Firmenregel»-Kennzeichnung.
- Umsetzung: `klimastationen.json` `auslegungsregel` → `standardThetaE` (−8 °C, Quelle `tw-abgeleitet`); `thetaEAuslegung` liefert Station/Angabe, sonst Standardwert (Annahme, Hinweis `klima.standardwert`); fehlender Standort ist keine Pflichtlücke mehr. Quelle `tw-entscheid` und «Fachentscheid»-Texte aus Daten/Doku entfernt; WP-Bänder und Standard-VL als Thermowerk-Annahme (`tw-annahme`) geführt. CH-EFH wieder 2 678.7 W (Handrechnung −7 °C).
- Prüfung: `npm test` 467/467, lint/build ok, Playwright (siehe Chat-Bericht).

