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
