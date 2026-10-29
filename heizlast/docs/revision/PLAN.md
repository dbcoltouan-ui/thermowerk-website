# PLAN — Überarbeitung / Neubau «Thermowerk Heizlast»

Stand: 2026-10-29 (Sessions 1 und 2 erledigt; Prüfungen gemäss Regel 10 angepasst) · Grundlage: `BEFUND.md` (198 Befunde), `KONTEXT.md` (Architektur-Entscheide, Arbeitsregeln, Definition of Done).

---

## 1. Empfehlung: Neubau der Anwendung auf bereinigtem Rechenkern

**Nicht** «Überarbeiten» und **nicht** «alles neu», sondern: die Anwendung (UI, Orchestrierung, State-Schema, Build, Auth, Datenbasis) wird neu gebaut; die geprüften Rechenprimitive, Tabellen, Konzepte und die Infrastruktur werden übernommen.

Begründung:
1. **Alle vier Prüfungen kommen unabhängig zum selben Urteil** für die UI-Schicht: `ui.mjs` (3459 Zeilen) enthält Fachlogik, auf die `main.mjs`, `export.mjs` und Tests angewiesen sind; Rendering per innerHTML/Regex/setTimeout/Devtool-Objekt; Plausi, WP-Filter, MAG, Ampeln doppelt. Rund 40 Befunde (FLOW-01/02/07/09/12, UX-02/10/42, CODE-02/05/06/08 …) verschwinden strukturell, sobald es ein Ergebnisobjekt, eine Relevanzfunktion und deklaratives Rendering gibt — sie einzeln im Bestand zu fixen kostet mehr als der Neubau der View.
2. **Die Vorgaben sind architektonisch**, nicht kosmetisch: zwei echte Modi, Schrittführung mit bedingten Feldern, Herkunftsmodell je Wert, Hülle→Raum-Vererbung, Heizkörper-Kette bis Bericht. Das bestehende State-Schema (zwei WW-Blöcke, vier VL, `detail.aktiv`-Flag, abgeleitete Werte im State) trägt das nicht; Daniel hat die Datenkompatibilität ausdrücklich freigegeben.
3. **Der Rechenkern ist der werthaltige Teil** und bleibt: ~15 Primitive sind gegen Kurs/Norm/Datenblatt verifiziert, Tabellen liegen vor. Was im Kern falsch ist (Summe statt Mittel, Methode B, Konvention, Kaskade, Konvektor-n …), sind lokale, klar benannte Fehler — das ist «bereinigen», nicht «neu erfinden».
4. **Build, Repo und Auth müssen ohnehin neu**: Regex-Bundler mit Bruchstellen, kein Git, Deploy-Skripte im Backup-Ordner, Auth wirkungslos. Ein Monorepo-Ordner im Website-Repo mit Vite-Build in der Pages-Pipeline löst das in einer Session.
5. **Risiko**: Ein Neubau könnte Funktionen verlieren. Gegenmassnahme: Session 12 prüft gegen eine Checkliste aller heutigen Funktionen (Förderung, Bewilligung, Offerte, Projekte lokal/cloud, Export) und gegen den Befund; Hydraulik-Schemas sind bewusst zurückgestellt.

Geschätzter Umfang: **12 Sessions**, strikt nacheinander. Kern-Sessions mit Fable, UI/Infrastruktur mit Opus, Routine mit Sonnet. Jede Session = ein Chat mit dem Prompt aus §4.

## 2. Sofortmassnahme am Live-Stand — entfällt (Entscheid Daniel 29.10.)
Daniel hat entschieden: kein Eingriff ins alte Tool, der Live-Stand bleibt bis zum Go-Live unverändert. Der ursprüngliche Vorschlag bleibt zur Dokumentation stehen:
Das Live-Tool bleibt bis zum Go-Live des Neubaus in Betrieb. Zwei Befunde sind so gravierend und so lokal fixbar, dass ein Hotfix vor dem Neubau sinnvoll ist:
- **BUILD-06/07** Backend-Auth: signiertes Cookie + timing-safe Vergleich (≈ 60 Zeilen in `functions/api/`). Kundendaten sind heute für jeden lesbar.
- **FACH-01** Mehrjahres-Summe: Mittelung je Energieträger (≈ 15 Zeilen in `fws.mjs`) + Bundle neu bauen.
- Nebenbei: `[hidden]{display:none!important}` (UX-10), «Neu»-Rückfrage (UX-21).
Aufwand: 1 Session (Opus). Kein weiterer Eingriff ins alte Tool.

## 3. Sessionplan

| # | Session | Modell | Ergebnis | Prüfung (Abschluss) |
|---|---|---|---|---|
| 0 | Sofortmassnahme Live (optional) | Opus | Auth gehärtet, Mittelung, hidden-Fix, deployed | curl mit gefälschtem Cookie → 401; Test «3 Perioden → Mittel»; Live-Smoke |
| 1 | Fundament: Repo, Stack, Pipeline | Opus | `heizlast/` im Website-Repo, Vite+Preact+TS+Vitest+Playwright+eslint, leere App mit Schritt-Shell, Pages-Build liefert nach `public/heizlast-neu/` (Staging-Pfad), Referenzmaterial im Repo, README, PROTOKOLL | Build/Lint/Test grün; Staging-URL zeigt Shell (von Claude per Fetch verifiziert) — **erledigt 29.10.** |
| 2 | Datenbasis & Fachgrundlagen | **Fable** | Alle Tabellen als JSON mit Quellen: Klimastationen SIA 2028, Epochen-Aufbauten + U-Spannen (KB-B/SIA 380/1), Fenstergenerationen, n_min, b_u, ΔU_WB, U_equiv, tvoll, Heizwerte/η (Kurs + Hi), Sanierungsbänder, Speicher/Puffer-Regeln, **HK-Tabellen** (W/m je Typ×Höhe, W/Glied Guss/Röhren, Konvektor, Bad, FBH, Exponenten, Minderungen), WP-DB normalisiert | Schema-Tests, Plausi-Tests (Bänder, Monotonie), Stichproben-Protokoll mit Quelle je Zahl; Claude prüft HK-Tabellen gegen Datenblätter; Daniel nur gebündelte Fachfragen (z. B. Marken im CH-Bestand) |
| 3 | Kern FWS-Modus | **Fable** | `kern/fws`, `kern/warmwasser`, `kern/speicher`, `kern/zuschlaege`, `kern/plausi` mit Herkunftsmodell | Golden-Tests = Kurslösungen A1/1B/2/3/4, Folie 49/52, Moosseedorf (±1 %); Mehrperioden-, Sanierungs-, Überlappungs-, Konventionstests |
| 4 | Kern raumweise (SIA 384/2) + Hüllen-Kaskade | **Fable** | `kern/huelle` (Schichtkette, Vererbung, Herkunft), `kern/raumweise` (n_min, b_u, U_equiv, ΔU_WB, Saldierung, EBF aus Räumen, Gebäude-Hüllflächen statt Pauschal-Rest), Klimastation-Zuordnung | Referenzhäuser 238/5 + IBO (Räume ±2 %), SIA-4009-/eigenes CH-EFH-Beispiel von Hand, Property-Tests Monotonie, Saldierung vs. Σ |
| 5 | Kern Wärmeabgabe (Heizkörper) | **Fable** | `kern/waermeabgabe` nach Zielbild: Q_N aus Masse, n-Tabelle, log. Übertemperatur, Bisektion θ_VL,req, Raum-Σ, Gebäude-Max, Ampel, Massnahmen, `auslegungsVL` | Tests gegen Datenblätter (Purmo/Kermi/Zehnder/V&N), KB-E Tab. 3.5, Beispiele B1–B3 aus Befund; Mischraum, Typ-Wechsel, ohne Räume (FWS-Modus) |
| 6 | Ergebnis, State, Persistenz | Opus | `berechne()`-Orchestrierung, `Ergebnis`-Typ, `annahmen[]`, `relevant()`, State-Schema v2, `hydrateState` + Migrationskette, lokale Persistenz (Entwurf-Slot, Liste, Debounce, Fehler sichtbar, «Neu»-Rückfrage) | Snapshot-Tests `berechne()` je Modus; Migrations-Fixtures; Relevanz-Tabelle getestet (inkl. WW-bisher/künftig-Fall) |
| 7 | UI Teil 1 | Opus (+ frontend-design) | Shell, Schrittnavigation mit Status, Dashboard (Seitenleiste/mobil), Schritte 0–4 (Projekt & Methode, Gebäude, Sanierungen, Verbrauch / Hülle & Räume, Heizlast), Fallback-Anzeige je Wert | Playwright Desktop+Mobil gegen Staging; kein Rechencode in ui; Daniel kann Navigation optional durchklicken |
| 8 | UI Teil 2 | Opus | Schritte 5–9 (WW künftig, **Wärmeabgabe** mit bedingter HK-Maske, Zuschläge, Speicher/MAG, Wärmepumpe), Zusatzmodul-Gruppe | Playwright; HK-Fluss bis Dashboard; Daniel optional: HK-Maske fachlich durchklicken |
| 9 | Bericht | Opus | HTML/PDF mit Kapiteln je Modus (Rechenweg), Wärmeabgabe-Seite, Gerät, Speicher, **Annahmen & Unsicherheiten**, Vollständigkeits-Check vor Export; Layout aus altem `BROSCH_CSS` | Bericht = Dashboard (Snapshot-Test); PDF-Druck Desktop/Mobil von Claude geprüft; Beispiel-PDF an Daniel zur fachlichen Sichtung |
| 10 | Backend & Cloud-Sync | Opus | Auth (HMAC, Ablauf, timing-safe, Rate-Limit), Projekte (Validierung, Locking 409, 404), D1-Schema im Repo, Client-Sync mit Konflikthinweis, Offline-Status | Function-Tests mit Mock-D1; curl-Tests; Sync zweier Browser |
| 11 | Zusatzmodule | Sonnet | Förderung, Bewilligung, Offerte an neuen State angebunden (Module übernommen), Hydraulik explizit «zurückgestellt» dokumentiert | Bestehende Modul-Tests grün; UI-Smoke |
| 12 | Abnahme & Go-Live | **Fable** (Audit) + Opus (Fixes) | Unabhängiger Re-Audit gegen BEFUND-Checkliste und Funktions-Checkliste; Playwright-E2E; Claude erfasst 3 reale Projekte parallel alt/neu (Daten von Daniel), Daniel sichtet die Abweichungen; Cutover `public/heizlast/`, altes Tool archiviert; Arbeits-Backups/Protokoll gelöscht | Audit ohne KRITISCH/HOCH; Deploy von Claude verifiziert; Daniel-Freigabe nur für den Cutover (Ja/Nein) |

**Fragerunden** (max. 3 verbleibend): voraussichtlich nach S2 (HK-Tabellen/Konventionen), nach S7 (Navigation) und vor S12 (Go-Live).

## 4. Fertige Prompts je Session

Jede Session beginnt mit dem Klonen des Repos (GitHub-Verbindung) bzw. dem PC-Zugriff für Referenzmaterial. **Regel 10 (KONTEXT §3) gilt für alle Sessions: Entwicklung, Backend, Deploy und deren Prüfung sind Claudes Arbeit; Claude wartet auf Builds, prüft erneut und schliesst erst ab, wenn das Ergebnis bestätigt ist. Daniel ist Backup-Tester und bekommt nur Alltagssprache.** Ab S1 liegen BEFUND/KONTEXT/PLAN und die Teilberichte unter `heizlast/docs/revision/` im Repo. Prompts in Chat kopieren; Modell gemäss Tabelle wählen.

### Session 0 — Sofortmassnahme Live (Opus, optional)
```
Repo thermowerk-website (GitHub dbcoltouan-ui/thermowerk-website) klonen. Lies D:\Users\Daniel\Documents\Thermowerk\Heizlast Tool\REVISION\KONTEXT.md §3 (Arbeitsregeln) und BEFUND.md §2 Nr. 1, 2, 13, 20.
Aufgabe (nur Hotfix, kein Umbau):
1. functions/api/heizlast-auth.js + heizlast-projects.js: Cookie als HMAC-SHA256-signiertes Token (Secret HEIZLAST_COOKIE_SECRET aus env; wenn nicht gesetzt, Fehler 500 mit klarer Meldung), Ablauf 30 Tage, Prüfung mit crypto.subtle (timing-safe), Passwortvergleich timing-safe, einfache Rate-Limit-Sperre (5 Fehlversuche/15 min per IP via D1-Tabelle oder KV, falls vorhanden; sonst exponentielles Delay). Projekte-Endpoint lehnt unsignierte Cookies mit 401 ab.
2. Altes Tool D:\Users\Daniel\Documents\Thermowerk\Heizlast Tool\src\calc\fws.mjs computeQnVerbrauch: pro Energieträger Jahreswert = Σ Menge·365/Σ Tage, Summe nur über verschiedene Träger; Test mit 3 Jahresperioden ergänzen (Erwartung Mittel). Bundle neu bauen (node build/bundle.mjs), nach thermowerk-website/public/heizlast/index.html kopieren.
3. style.css: [hidden]{display:none!important}; projects.mjs: «Neu» fragt bei ungespeicherten Änderungen nach.
Vorher: Backup beider Stände (TGZ mit Zeitstempel nach REVISION\_work\backups\). Prüfung: alle Tests grün; curl mit Cookie tw_heizlast_auth=x → 401; echter Login → 200. Commit + Push (Cloudflare-Rebuild), Daniel teilt das Secret im Cloudflare-Dashboard ein (du gibst ihm die genaue Anleitung in 3 Sätzen). PROTOKOLL.md ergänzen. Knapp berichten.
```

### Session 1 — Fundament (Opus)
```
Repo thermowerk-website klonen. PC-Zugriff auf D:\Users\Daniel\Documents\Thermowerk (Ordner «Heizlast Tool\REVISION», «Wissensbasis») und D:\Samsung Kopie 2026\Wärmepumpe anfragen. Lies REVISION\KONTEXT.md vollständig, dann PLAN.md §3 Zeile 1 und BEFUND.md §1.
Aufgabe:
1. Ordner heizlast/ im Repo anlegen: Vite + Preact + @preact/signals + TypeScript (strict), Vitest, Playwright, eslint (+ Regel gegen ß und gegen Imports aus src/ui in src/kern), Ordnerstruktur gemäss KONTEXT §2 (kern, daten, state, ui, bericht, data, tests, docs). package.json mit engines.node ≥ 22, Scripts test/lint/build/e2e.
2. Pages-Build: Root-package.json build → `npm --prefix heizlast run build && astro build`; Vite-Output nach public/heizlast-neu/ (Staging-Pfad; Live /heizlast/ bleibt unberührt). Prüfe die Cloudflare-Build-Konfiguration (wrangler.toml, Build-Command) und stelle sie bei Bedarf selbst um (Browser-Tools im Cloudflare-Dashboard); nur wenn das nicht geht, Klickanleitung an Daniel.
3. Referenzmaterial ins Repo: heizlast/docs/revision/ (BEFUND.md, KONTEXT.md, PLAN.md, PROTOKOLL.md, befund_*.md, shots/), heizlast/docs/wissensbasis/ (die 16 MD), heizlast/docs/fws/ (pdftotext-Auszüge der FWS-PDFs, Dateinamen beibehalten; PDFs selbst nicht ins Repo), heizlast/referenz/ (BEISPIELRECHNUNG.md, FWS-RECHENWEGE.md, referenzhaus-*.json aus dem alten Tool). Alte Kern-Module nach heizlast/referenz/alt-calc/ (nur src/calc/*.mjs + tests/*.test.mjs, zum Nachschlagen; nicht im Build).
4. Minimale App: Schritt-Shell (Topbar, Schrittleiste mit Status-Platzhaltern, Inhaltsbereich, Dashboard-Seitenleiste, mobil als Leiste), Platzhalter-Seite «Projekt & Methode» mit Moduswahl; Design-System-Tokens (Farben/Typo aus dem alten style.css übernehmen, Schweizer Deutsch).
5. heizlast/README.md (Architektur, Befehle, Datenquellen, Session-Stand) und docs/revision/PROTOKOLL.md (Session 1 eintragen).
Prüfung: npm test/lint/build grün; Playwright-Smoke rendert Shell Desktop/Mobil; Commit + Push; Staging-URL selbst per Fetch verifizieren (warten, bis Cloudflare fertig ist). Keine Fachlogik in dieser Session. Knapp berichten.
```

### Session 2 — Datenbasis & Fachgrundlagen (Fable)
```
Repo thermowerk-website klonen; PC-Zugriff auf D:\Samsung Kopie 2026\Wärmepumpe (FWS-PDFs) anfragen. Lies heizlast/docs/revision/KONTEXT.md, BEFUND.md §2–5, befund_fachlogik.md (FACH-05/06/08/11/12/20/21/23/25/26/29/40), befund_heizkoerper.md (§2A, §5, §6.4), befund_code-qualitaet.md (DATA-01…10). Web-Recherche erlaubt und nötig.
Aufgabe: Alle Fachdaten als JSON unter heizlast/data/ mit `_meta {version, stand, quellen[]}` und Quelle je Tabelle (Norm + Seite/Tabelle oder Datenblatt-URL + Datum); keine KI-Recherche als Primärquelle. Umfang:
1. klimastationen.json: SIA-2028-Stationen (≈40) mit θe (Auslegung), Höhe, HGT-Normwert; PLZ/Kanton→Station-Zuordnung + Höhenkorrektur-Regel.
2. huelle-epochen.json: je Bauteil (Aussenwand, Dach steil/flach, Boden Erdreich/Keller, Fenster, Tür) und Epoche (vor 1919, 1919–45, 46–60, 61–77, 78–94, 95–2010, ab 2011): Default-Schichtaufbau BESTAND (Material, Dicke, λ) + U-Spanne min/typ/max aus KB-B Tab. 3.4/3.5 und SIA-380/1-Generationen; Bauweisen-Katalog mit Schichten; Dämmstoff-λ; Fenstergenerationen × Rahmen (eine Tabelle).
3. sia384-2.json: n_min-Tabelle (Raumtyp × Lüftungskonzept), b_u-Tabelle, ΔU_WB-Defaults, U_equiv-Tabelle Erdreich (B', U_Boden), Rsi/Rse, Innentemperaturen je Raumtyp.
4. fws.json: tvoll (Nutzung × Höhe, Folie 16), Heizwerte Kurs (Ho 10.5/10.4) und Hi, η-Presets mit Bandbreite, Sperrzeit-Faktoren 0–8 h, Sanierungs-Einsparbänder (Folie 36), Bauperioden-kWh/m² (Folie 36), W/m²-Plausibänder (Folie 37, inkl. Minergie), WW-Richtwerte (l/P·d, Verluste additiv Folie 49, Speicherverlust-Stützpunkte Folie 45), Speicherregeln (EFH ~400 l, Spitzendeckung SIA 385/2), Puffer-Kriterien (Quelle × Abtau/Takt/Sperrzeit, KB-J).
5. heizkoerper-tabellen.json: Platten Typ 10/11/20/21/22/30/33 × Höhe 300/400/500/600/750/900 in W/m bei 75/65/20 (Mittel aus ≥3 Datenblättern Purmo/Kermi/Stelrad/Vogel&Noot, Werte je Quelle dokumentiert), Gussradiatoren W/Glied je Nabenabstand × Tiefe (DIN 4703/BDH/V&N), Stahl-Röhren W/Glied je Säulen × Höhe (KB-E Tab. 3.5 + Zehnder Charleston), Konvektoren W/m je Höhe×Tiefe, Bad-/Handtuch-HK, FBH q(35/28) je System/VA/Belag (KB-F), Exponenten-Tabelle (eine), Minderungsfaktoren f1–f5 (KB-E §10.3), Umrechnung 90/70→75/65. Bestehende Modell-DB nur mit verifizierter Datenblattzahl übernehmen (Purmo/Charleston korrigieren, Buderus/Stelrad-Dublette auflösen), Feld `abgeleitet` kennzeichnen.
6. waermepumpen.json normalisiert: nur hauptgeraete, Zahlen als Zahlen, null statt «—», `kategorie: heizung|brauchwasser`, unplausible COP×P markieren (DATA-05), Preis null = «auf Anfrage».
Tests (Vitest): Schema je Datei; Plausi (U-Spannen monoton über Epochen, HK-W/m monoton fallend über Höhe je Typ, Typ-Reihenfolge 10<11<20<21<22<30<33, Exponenten in [1.0,1.45]); Stichproben-Protokoll docs/datenquellen.md (Zahl, Quelle, Datum). Kein Rechencode. Prüfung: npm test grün, docs/datenquellen.md vollständig. Offene **fachliche** Fragen an Daniel bündeln (z. B. Marken im CH-Bestand; keine technischen Fragen), PROTOKOLL ergänzen, knapp berichten.
```

### Session 3 — Kern FWS-Modus (Fable)
```
Repo klonen. Lies KONTEXT.md (§2 Zeilen «Eine Quelle», «Herkunftsmodell», «FWS»), befund_fachlogik.md §2.1, §2.3, §2.4, §2.5, Anhang A; referenz/BEISPIELRECHNUNG.md, referenz/FWS-RECHENWEGE.md (§3a!), docs/fws/*.txt (Aufgaben + Lösungen), referenz/alt-calc/fws.mjs + dhw.mjs (Primitive übernehmen).
Aufgabe: heizlast/src/kern/ als reine TypeScript-Module mit Herkunftsmodell (`Wert`): 
- `fws.ts`: Verbrauchsmodell (Jahresraster: Einträge {jahr|zeitraum von–bis, energietraeger, menge, einheit}; Jahreswert je Träger = Σ Menge·365/Σ Tage; Mittel über Jahre; Streuung → Ampel; Überlappung → Fehler; optional HGT-Klimabereinigung je Jahr mit Station, Default aus, als «nicht FWS» markiert), Konvention `fwsKurs|hi` (Heizwerte + η), WW-Abzug nur wenn «WW bisher über Heizung», Sanierungen nach §3a (Sub-Perioden, kumulativer Faktor, vergangen/geplant, mehrere Massnahmen korrekt), Methode B (Qn = h·Q_WP bzw. kWh·COP; Qhl = Qn/tvoll), Methode C, Bauperioden-Schätzung nur als Fallback mit Band, tvoll nach Nutzung × Höhe, Methodenwahl explizit (keine «erste aktive gewinnt»).
- `warmwasser.ts`: Personen- oder Direktmethode, Verluste additiv (Folie 49), Speicherverlust aus Volumen (Folie 45), Qw mit Ladezeit (ohne 12-h-Clamp, Warnung > 12 h), ΔT = T_Lade − 10.
- `zuschlaege.ts`: Qoff (kumulierte Sperrzeit h/d 0–8), Qas, Qh = Qhl + Qw + Qoff + Qas.
- `speicher.ts`: WW-Speicher (Kurs + Marktrundung, eine Regel), Puffer = max(Hersteller-Minimum, Quellen-Kriterium) mit Begründung, MAG/SV (aus alt-calc/dhw).
- `plausi.ts`: W/m²-Band gegen Qhl_roh (unsaniert), Minergie, Vergleich Norm/Verbrauch mit Erwartung «Norm 10–25 % über Verbrauch».
Tests (Vitest, extern belegt): Kurslösungen A1 (12.5/1.14/13.64), 1B (16.65/3.33/19.98), A2 (12.55/1.79/0.51/14.85; saniert 8.8/1.26/0.52/10.58), A3 (11.5/5.64/17.14), A4 (8.4/0.6/9.0), Folie 49/52 (40.3 kWh/d, 2.69 h, 1.89 kW), Moosseedorf in beiden Konventionen; Mehrperioden (3 Jahre → Mittel), Öl-Lieferungen über 24 Monate, Überlappung, Sanierung 1 und 2 Massnahmen mit Zeitgewichtung (Handrechnung im Test dokumentiert), Konventionswechsel. Keine Sollwerte aus dem Code ableiten. Prüfung: alle Tests grün ±1 %, lint, Herkunft an jedem Wert. PROTOKOLL, README (Kern-API), knapp berichten.
```

### Session 4 — Kern raumweise (SIA 384/2) + Hüllen-Kaskade (Fable)
```
Repo klonen. Lies KONTEXT.md (§2 «Fallback-Kaskade Hülle», «Raumweise»), befund_fachlogik.md §2.2, §3, Anhang A7–A9; befund_ux-datenfluss.md FLOW-02/13; befund_code-qualitaet.md CODE-11/15/17, DATA-01/02; data/huelle-epochen.json, data/sia384-2.json, data/klimastationen.json; referenz/alt-calc/heatload.mjs, envelope.mjs, material-picker.mjs (Primitive + Stufenkonzept); referenz/referenzhaus-*.json; docs/wissensbasis/B_*.md, C_*.md.
Aufgabe:
- `huelle.ts`: Bauteiltypen auf Gebäudeebene (Wand-, Dach-, Boden-, Fenster-, Türtypen) mit Stufen-Picker (Bauweise, Dicke, Dämmung ja/nein, Dämmstoff, Dämmdicke; Fenster: Generation, Rahmen); Auflösung als EINE Schichtkette: Epochen-Default Bestand → bekannte Stufen ersetzen ihre Schicht → U nach ISO 6946 (uFromLayers) → Clamp in Epochen-Spanne mit Hinweis; Sanierung «ab Jahr X» je Bauteiltyp; manueller U-Override; Ergebnis `Wert` mit Herkunft/Stufe/Unsicherheit (±% aus Spanne) und Klartext-Begründung («geschätzt aus Baujahr 1965, Backstein 30 cm ungedämmt, ±25 %»).
- `raumweise.ts`: Raum {name, geschoss, typ (→ θint-Default, n_min), A oder L×B, h, θint}, Bauteile als Referenz auf Gebäude-Typ + Fläche + Anschluss (aussen / unbeheizt b_u / Erdreich U_equiv / beheizt Nachbar mit θ) + optional Override; Φ_T mit ΔU_WB; Φ_V = V·n_min·0.34 (Tabelle, kein n50, kein f_RH); Σ Räume (für Heizflächen) UND Gebäude-Heizlast saldiert (nur Hülle nach aussen/unbeheizt/Erdreich) getrennt ausgewiesen; EBF aus Räumen (Σ NGF × Faktor, Faktor mit Herkunft) oder manuell; nicht raumweise erfasster Rest: Gebäude-Hüllflächen-Eingabe (A_AW, A_F, A_D, A_B) oder Φ'·A nach Epoche — explizit als Schätzung, kein «1 m² pro m² EBF».
- `klima.ts`: PLZ/Ort → Station → θe + Höhenkorrektur, Override mit Herkunft.
Tests: Referenzhaus 238/5 (Räume ±2 %, Flur echt gerechnet, Abweichung dokumentiert), IBO über echte Bauteil-Eingaben, eigenes CH-EFH-Beispiel von Hand (im Test dokumentiert; SIA 4009 wenn verfügbar), Property-Tests: Dämmung↑ ⇒ U↓; mehr bekannte Stufen ⇒ |ΔU| ≤ 25 % gegen Spannenmitte; Dicke↑ ⇒ U↓ bei gleichem Material; Saldierung ≤ Σ Räume; Hülle→Raum-Vererbung; Override gewinnt und ist als solcher markiert. Prüfung: Tests/lint grün. PROTOKOLL, README, knapp berichten.
```

### Session 5 — Kern Wärmeabgabe / Heizkörper (Fable)
```
Repo klonen. Lies KONTEXT.md (§1 Priorität, §2 «Wärmeabgabe»), befund_heizkoerper.md vollständig (Zielbild §6 ist die Spezifikation), befund_ux-datenfluss.md FLOW-01/09, data/heizkoerper-tabellen.json, docs/wissensbasis/E_*.md, F_*.md, referenz/alt-calc/distribution.mjs + heizkoerper.mjs (dTm, leistungsFaktor übernehmen).
Aufgabe: `waermeabgabe.ts` als reines Modul:
- Datenmodell je Heizfläche: bauart (Enum: platte_10/11/20/21/22/30/33, guss_glieder, roehren_2…6, konvektor_passiv, konvektor_geblaese, bad_handtuch, design_vertikal, fbh, wandheizung), bedingte Masse (hoehe, laenge, tiefe | saeulen, glieder, gliedbreite | A, verlegeabstand, belag), optional modellId, typenschild {qN, tVL, tRL, tRaum}, minderungen (Nische, Verkleidung, Anschluss), kreisId; abgeleitet (nie im State): Q_N 75/65/20 mit Herkunft/Unsicherheit (Tabelle ±15 %, Modell ±5 %, Typenschild ±2 %).
- Rechenkette: Q_N aus Tabellen (Interpolation über Höhe; Glieder × W/Glied; Konvektor W/m) × Minderungen; n aus einer Tabelle; Q(θ_VL, θ_RL, θ_int) mit log. Übertemperatur; Raum: Σ Q / Φ_HL,Raum → Deckung + Ampel (Schwellen dokumentiert); θ_VL,req je Raum per Bisektion über Σ Q(θ_VL) bei Kreis-Spreizung; Gebäude: max θ_VL,req über beheizte Räume (Liste Top 3, Option «ausklammern»), Ampel ≤55 / 55–65 / >65 °C mit Klartext; Massnahmen je rotem Raum (Typ-Upgrade gleiche Nische → neue θ_VL,req, nötige Länge bei Ziel-VL, FBH/Gebläsekonvektor, Hybrid); alte Heizkurve (θ_VL,alt) als Fallback-Stufe zur Schätzung der Mindest-Q_N bei unbekannten Massen; Betrieb ohne raumweise Heizlast (FWS-Modus): Φ_HL,Raum aus Gebäude-Qhl nach Raumfläche verteilt oder manuell, als Schätzung markiert.
- Ausgabe `Ergebnis.waermeabgabe` {räume[], gebaeude: {auslegungsVL, ampel, kritischeRaeume[]}, annahmen[]}; `auslegungsVL` ist die einzige VL für Gerätefilter/JAZ/Bericht (Override mit Hinweis).
Tests (extern): B1 Typ 22 600×1000 @55/45 ≈ 842–873 W (Purmo/Kermi/KB-E), B2 Guss 10 Gl. 600×160 @70/55 ≈ 600–780 W, B3 Raum 1200 W T21 600×800 → θ_VL,req ≈ 81 °C; T22 → 72, T33 → 61; Charleston 3-Säuler H600 ≈ 60 W/Glied (KB-E 3.5); Konvektor n=1.4 (45/35 → f 0.27); 90/70-Umrechnung 0.795; Mischraum FBH+HK summiert; Typ-Wechsel setzt Masse zurück; Bisektion vs. arithmetische Näherung (Fehler < 0.1 K); ohne Räume. Prüfung: Tests/lint grün, Herkunft an jedem Wert. PROTOKOLL, README, knapp berichten.
```

### Session 6 — Ergebnis, State, Persistenz (Opus)
```
Repo klonen. Lies KONTEXT.md (§2 «Eine Quelle», «Herkunftsmodell», «Relevanz», «Modus», «State»), befund_ux-datenfluss.md §2.2, §2.3, §2.4, §5.3; befund_code-qualitaet.md CODE-02/04/05/08, BUILD-05/09/10/11; src/kern/* (Sessions 3–5), referenz/alt-calc für Gerätefilter (heatpump.mjs: inverterCheck, Filter übernehmen; Bivalenz als FWS-Tabelle Folie 93–95 statt synthetischer Kennlinie).
Aufgabe:
1. `state/schema.ts`: State v2 (nur Rohangaben): projekt, methode, gebaeude (inkl. standort→klima, baujahr, geschosse, keller, dachform, ebfModus), sanierungen[], verbrauch (Jahresraster, konvention, wwBisher, abzug), huelle (Bauteiltypen), raeume[], warmwasser (wwKuenftig, personen|direkt, tLade), waermeabgabe (heizkreise[], heizflaechen je Raum), zuschlaege, speicher (overrides, aktiv), geraet (auswahl, filterOverrides), zusatz (foerderung, bewilligung, offerte), meta {schemaVersion, erstellt, geaendert}. Typen + Zod-/eigene Validierung.
2. `kern/berechne.ts`: einziger Rechenpfad → `Ergebnis` (heizlast.massgebend + beide Methoden, warmwasser, zuschlaege, speicher, waermeabgabe, geraet, plausi, annahmen[], vollstaendigkeit[] (fehlende Pflichtangaben je Schritt), status je Schritt). `kern/relevanz.ts`: `relevant(pfad, state)` — Tabelle aller bedingten Felder (u. a. WW bisher/künftig, Keller, Räume vorhanden, Modus, Verbrauch vorhanden, HK vorhanden, Sperrzeit aktiv).
3. `state/store.ts` (Signals), `state/hydrate.ts` (schemaVersion, Migrationskette, Fixtures), `state/persistenz.ts`: Entwurf-Slot + Projektliste (localStorage), Autosave debounced (≥ 1 s), Fehler sichtbar (Quota), «Neu»/Laden mit Rückfrage bei ungespeicherten Änderungen, Cloud-Schnittstelle vorbereitet (Session 10).
Tests: Snapshot `berechne()` je Modus mit realistischem Fixture (Werte aus Session-3–5-Tests), Relevanz-Tabelle (inkl. Auftraggeber-Fall: WW bisher ja, künftig nein → personen/komfort nicht relevant, Abzug relevant), Migration v1→v2 Fixture, Persistenz mit gemocktem localStorage (Quota-Fehler). Prüfung: Tests/lint/build grün; kein ui-Import im Kern. PROTOKOLL, README, knapp berichten.
```

### Session 7 — UI Teil 1 (Opus, Skill frontend-design laden)
```
Repo klonen. Lies KONTEXT.md, befund_ux-datenfluss.md §2.1, §2.2, §2.5, §5 (Ziel-Navigationskonzept = Spezifikation), shots/ (Ist-Zustand), src/kern/berechne.ts, relevanz.ts, state/*.
Aufgabe: Schritte 0–4 und Rahmen in src/ui/ (Preact, Signals):
- Shell: Topbar (Projektname = eine Quelle, Speichern-Status, Projekte, Export), Schrittleiste mit Status je Schritt (offen / vollständig / mit Annahmen / Warnung) nur für relevante Schritte, Weiter/Zurück, Desktop-Seitenleiste «Dashboard» (liest nur Ergebnis: Q_h gross mit Methode+Badge, Aufschlüsselung, spez. W/m² mit EBF-Herkunft, Auslegungs-VL + kritische Räume, Speicher effektiv, WP-Ampel, Annahmen-Zähler mit Liste und Sprungziel, Fortschritt); mobil als aufklappbare Leiste; Stepper sticky kompakt.
- Komponenten: Feld (Label, Einheit, ⓘ-Popover statt Hinweisleisten, Fehler inline, Validierung), Wert-Anzeige mit Herkunfts-Chip («geschätzt aus Baujahr 1965 · ±25 %» → Klick zeigt Begründung), Stufen-Picker eingeklappt mit Klartext, Ampel mit Legende, Tabelle.
- Schritt 0 Projekt & Methode (Moduswahl mit Erklärung, Wechselhinweis), 1 Gebäude (Standort→Station, Baujahr, Geschosse, Keller, Dachform, EBF-Modus), 2 Sanierungen (Liste Jahr/Bauteil/Umfang; wirkt je Modus), 3A Verbrauch (Frage «Verbrauchsdaten vorhanden?», Jahresraster, η-Vorschlag, Streuungs-Ampel, «Enthielt der Verbrauch WW?» → Abzugsblock, Alternative WP-Zähler/kWh, Konvention), 3B Hülle & Räume (Bauteiltypen kompakt mit Picker; Räume als Tabelle/Karten mit Lage-Fragen, Bauteile als Referenz + Fläche, Override markiert, Σ ↔ EBF), 4 Heizlast (massgebend mit Herkunft+Band, Raumtabelle Φ_T/Φ_V/Φ_HL bzw. Rechenweg kompakt, Gegenprobe nur wenn Daten echt vorhanden).
Regeln: Irrelevante Felder werden nicht gerendert; kein Rechencode in ui; keine innerHTML; Schweizer Deutsch, echte Umlaute; Empty State «—» statt 0.00 + rot.
Tests: Playwright Desktop 1280 / Mobil 390: Durchlauf FWS-Fall (Moosseedorf) und raumweise-Fall (2 Räume), Screenshots nach docs/revision/shots-neu/; Prüfung bedingter Felder (WW-Fall), Stepper mobil sichtbar nach Scroll, keine stale Anzeige nach Picker-Änderung. Prüfung: e2e/lint/build grün; Deploy per Fetch der Staging-URL verifizieren (warten bis fertig), Playwright-Smoke gegen Staging; Screenshots an Daniel zur Ansicht. PROTOKOLL, knapp berichten.
```

### Session 8 — UI Teil 2 (Opus)
```
Repo klonen. Lies KONTEXT.md, befund_heizkoerper.md §6.1/6.3, befund_ux-datenfluss.md §5.1 Schritte 5–9 und §5.2, src/ui (Session 7), src/kern/waermeabgabe.ts, berechne.ts.
Aufgabe: Schritte 5–9 + Zusatzmodul-Gruppe:
- 5 Warmwasser künftig («Bereitet die neue WP WW?» → Personen/Komfort oder V_W,u, Ladetemperatur → ΔT abgeleitet, Zirkulation bedingt; nein → nur Hinweis).
- 6 Wärmeabgabe (optional, beide Modi): Heizkreise (interne IDs, Typ, VL/RL, Spreizung), je Raum «+ Heizfläche» mit bedingter Maske (Bauart → Masse: Höhe/Länge/Tiefe bzw. Säulen/Glieder/Gliedbreite bzw. Fläche/VA/Belag; «Genauer» eingeklappt: Marke/Modell, Typenschild mit Bezugstemperaturen, Minderungen), Live-Zeile je Raum (Φ_HL · Σ Q bei VL · Deckung · θ_VL,req · Ampel · Massnahme), Gebäude-Box (Auslegungs-VL, WP-Tauglichkeit, kritische Räume, Ausklammern), Herkunfts-Chips; alte Heizkurve als Fallback-Eingabe.
- 7 Zuschläge & Leistung (Sperrzeit h/d, verbundene Systeme, Q_h-Aufschlüsselung), 8 Speicher & Hydraulik (WW-Speicher nur wenn 5 = ja, Puffer mit Kriterium/Hersteller-Minimum, Overrides wirken überall, MAG/SV), 9 Wärmepumpe (Filter übernimmt Auslegungs-VL mit Hinweis «aus Heizflächen, max. Raum: Bad», Override; Liste aus Ergebnis; Auswahl → Bivalenz nach FWS-Tabelle, JAZ-Schätzung markiert, Modulation; eine Ampel-Logik).
- Zusatzmodule-Gruppe (Platzhalter-Seiten Förderung/Bewilligung/Offerte, Anbindung in Session 11).
Tests: Playwright: HK-Fluss (Guss 10 Glieder → θ_VL,req sichtbar → Dashboard-KPI → Gerätefilter-VL), Mischraum, Typ-Wechsel, FWS-Modus mit HK ohne Räume; Mobil-Durchlauf; Screenshots. Prüfung: e2e/lint/build grün; Deploy per Fetch verifizieren, HK-Fluss in der deployten App selbst durchspielen; fachliche Fragen zur HK-Maske an Daniel bündeln (Fragerunde). PROTOKOLL, knapp berichten.
```

### Session 9 — Bericht (Opus)
```
Repo klonen. Lies KONTEXT.md, befund_ux-datenfluss.md §2.6, §2.7, befund_heizkoerper.md HK-13/14 + §6.3, befund_fachlogik.md §3 Punkt 4; altes referenz/alt-export (export.mjs: BROSCH_CSS und Rechenweg-Format als Layout-Vorlage — Session 1 hat es unter referenz/ abgelegt, sonst aus dem alten Tool holen).
Aufgabe: src/bericht/: HTML-Bericht aus `Ergebnis` (nie aus State rechnen), Kapitel: Deckblatt/Objekt (nur relevante Werte, mit Herkunft), Zusammenfassung (Q_h, Methode wörtlich, z. B. «SIA 384/2:2020 … θe −8 °C Station Bern-Zollikofen (SIA 2028)»), Rechenweg je Modus (FWS: Formel → eingesetzte Werte → Ergebnis inkl. Mittelung, Sanierungsfaktoren je Jahr, Konvention; raumweise: Tabelle je Raum U·A·b, Φ_T, Φ_V, Φ_HL; Gebäude saldiert vs. Σ), Warmwasser, Zuschläge, **Wärmeabgabe** (Tabelle je Raum: Bauart, Masse/Glieder, Herkunft, Q_N, Q bei Ziel-VL, Deckung, θ_VL,req, Massnahme; Gebäude-Fazit WP-Tauglichkeit), Speicher (effektiv), Wärmepumpe (gewähltes Gerät korrekt aus DB, Bivalenz, JAZ-Schätzung markiert), **Annahmen & Unsicherheiten** (automatisch aus Ergebnis.annahmen, mit Band), Plausibilität, Fussnoten/Normen. Druck-CSS A4 aus BROSCH_CSS, PDF via Print (Vorschau als eigener Schritt 10 mit Vollständigkeits-Checkliste, Warnungen übersteuerbar), JSON-Export des Projekts.
Tests: Snapshot Bericht = Dashboard-Werte (gleiches Ergebnis-Objekt), Relevanz (WW-nein → keine WW-Kapitel), Playwright-Print-Smoke Desktop/Mobil. Prüfung: Tests/e2e/lint/build grün; Deploy verifiziert; Beispiel-PDF (Moosseedorf + raumweise-Fall) selbst gegen Dashboard-Werte geprüft, dann an Daniel zur fachlichen Sichtung. PROTOKOLL, knapp berichten.
```

### Session 10 — Backend & Cloud-Sync (Opus)
```
Repo klonen. Lies KONTEXT.md §2 «Backend», befund_code-qualitaet.md §G (BUILD-06…13), state/persistenz.ts (Session 6), functions/api/heizlast-*.js, wrangler.toml, migrations/.
Aufgabe: functions/api/heizlast-auth.js neu (HMAC-signiertes Cookie mit Ablauf 30 d, HEIZLAST_COOKIE_SECRET, timing-safe Passwortvergleich via Hash, Rate-Limit 5/15 min via D1-Tabelle `login_attempts`, Logout mit Widerruf (Token-ID in D1)), heizlast-projects.js (Auth-Prüfung, Validierung: id-Format, stateJson ≤ 512 KB + gültiges JSON + schemaVersion, optimistisches Locking über `updated_at` → 409 mit Server-Stand, 404 bei unbekannter ID, keine D1-Fehlertexte nach aussen), D1-Schema als migrations/000X_heizlast_v2.sql (inkl. Indizes), Client: persistenz.ts Cloud-Sync (Liste, Laden, Speichern mit Versionsprüfung, Konflikt-Dialog «Server neuer – überschreiben / Kopie»), Drift ohne Löschen (nur markieren), Offline-/Login-Status sichtbar. Falls Session 0 gelaufen ist: deren Auth übernehmen und erweitern.
Tests: Vitest mit Mock-D1 (Auth gültig/abgelaufen/gefälscht, Locking 409, Validierung), curl-Protokoll gegen Preview, Playwright: zwei Browserkontexte → Konflikt. Secret selbst erzeugen und im Cloudflare-Dashboard setzen (Browser-Tools; nur falls unmöglich: Klickanleitung in Alltagssprache an Daniel, Secret-Wert im Chat). Prüfung: Tests grün; nach Deploy warten und curl gegen Staging: gefälschter Cookie → 401, echter Login → 200; erst abschliessen, wenn bestätigt. PROTOKOLL, README (Endpoints), knapp berichten.
```

### Session 11 — Zusatzmodule (Sonnet)
```
Repo klonen. Lies KONTEXT.md §2 «Zusatzmodule», befund_code-qualitaet.md §5 (foerderung, offerte), referenz/alt-calc/foerderung.mjs, offerte.mjs, alte Tests; data/foerderungen.json, baubewilligungen.json, offerten-*.json (Session 1 hat sie übernommen).
Aufgabe: Module nach src/kern/zusatz/ portieren (TypeScript, Re-Export-Shims entfernen), an State v2 anbinden (kanton/massnahme/wp_quelle aus Gebäude/Projekt; Offerte liest Ergebnis statt window.__heizlast), UI-Seiten in der Zusatzmodul-Gruppe (Förderung: Programme + Schätzbetrag; Bewilligung: Kantonsregel; Offerte: Paket, Positionen-Editor, Pre-Sales-Checks, MwSt, Netto nach Förderung, Offerten-PDF aus altem Layout), Bericht-Anhang optional. Hydraulik-Schemas: nicht portieren; in README unter «Zurückgestellt» mit Verweis auf alten Ordner.
Tests: alte Modul-Tests portiert und grün; Playwright-Smoke der drei Seiten. Prüfung: Tests/e2e/lint/build grün. PROTOKOLL, knapp berichten.
```

### Session 12 — Abnahme & Go-Live (Fable als Audit-Agent, Opus für Fixes)
```
Repo klonen; PC-Zugriff auf Thermowerk\Heizlast Tool\REVISION. Lies KONTEXT.md, BEFUND.md (alle 198 IDs als Checkliste), PLAN.md.
Aufgabe:
1. Unabhängiger Audit (Agent, der den Code nicht geschrieben hat): jede KRITISCH/HOCH-ID im BEFUND gegen den Neubau prüfen (behoben / nicht zutreffend / offen, mit Beleg: Test oder Probe); Funktions-Checkliste des alten Tools (Projekte lokal/cloud, Export, Förderung, Bewilligung, Offerte, WP-Auswahl, Mobile); neue Referenzrechnungen (Kurs-Aufgaben, Referenzhäuser, HK-Beispiele) durch die UI (Playwright) bis in den Bericht.
2. Fixes für alles Offene (Opus), erneuter Audit-Durchlauf.
3. Drei reale Projekte alt und neu erfassen (Claude über die UI, Eingabedaten von Daniel erfragen); Abweichungen erklären (erwartet: alt zu tief/zu hoch gemäss Befund); Daniel sichtet nur das Resultat.
4. Go-Live: Vite-Output nach public/heizlast/, altes Bundle nach _to_delete/, Redirect/Staging-Pfad entfernen, README/CLAUDE.md der Website aktualisieren (altes CLAUDE.md-Kapitel Heizlast ersetzen), altes Tool-Verzeichnis als «archiviert» markieren.
5. Nach Daniels Freigabe: REVISION\_work\backups und PROTOKOLL.md löschen (Regel 3), finaler Commit.
Prüfung: Audit ohne offene KRITISCH/HOCH; e2e grün; Live-URL /heizlast/ nach Cutover per Fetch verifiziert (warten bis fertig); Daniel-Freigabe nur als Ja/Nein für den Cutover. Knapp berichten.
```

## 5. Modell-Empfehlung (Zusammenfassung)
- **Fable 5.x**: Sessions 2, 3, 4, 5 (Fachlogik, Normen, Datenrecherche mit Belegpflicht) und Audit in 12 — hier zählt fachliche Tiefe und Nachrechnen.
- **Opus**: Sessions 0, 1, 6, 7, 8, 9, 10 und Fixes in 12 — Architektur/UI/Backend mit klarer Spezifikation.
- **Sonnet**: Session 11 sowie Routine (Doku-Pflege, Daten-Normalisierung nach Vorlage).
- **Haiku**: nicht für Code; allenfalls für Transfer-/Kopieraufgaben.
