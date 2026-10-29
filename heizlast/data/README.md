# data — Fachdaten (JSON)

Gefüllt in Session 2 (2026-10-29). Jede Datei: `_meta { version, stand, beschreibung, quellen[] }`; jede Tabelle verweist mit `quelle: [id…]` auf `_meta.quellen`. Keine Rechenlogik, keine Kopien im Code (DATA-01); der Kern (`src/kern`) bekommt die Daten über `src/daten` injiziert. Ableitungen sind mit `abgeleitet: true` bzw. Quelle `tw-abgeleitet`/`tw-annahme` markiert. Stichproben-Protokoll: `docs/datenquellen.md`; Recherche-Berichte mit allen Fundstellen: `docs/recherche/`.

| Datei | Inhalt | Primärquellen |
|---|---|---|
| `fws.json` | t_voll (Folie 16), Heizwerte (Kurs-Ho / Hi), η-Presets mit Band, Jahresraster-Regeln + Streuungs-Schwellen (`verbrauch`), Klimabereinigung-Option (`klimabereinigung`, nicht FWS), Sperrzeit-Faktoren, Bauperioden kWh/m²a + W/m², Sanierungsbänder, Warmwasser (SIA 385/2, Verluste additiv, Speicherverlust-Stützpunkte, Ladezeit-Zuschlag), WW-Speicher (f_sto, Spitzendeckung, EFH 400 l, Marktrundung), Puffer-Kriterien + Regel + Marktrundung, Bivalenz, Plausi-Toleranzen, Methode B | FWS M3 Skript/Aufgaben 1-2025, SIA 384/1:2022, SIA 385/2:2015, BFE; Thermowerk-Annahmen markiert |
| `hydraulik.json` | MAG nach DIN EN 12828 (Ausdehnungsfaktor-Tabelle 40–95 °C, Anlageninhalt l/kW je Heizflächenart, Wasservorlage, Druck-Defaults, Nennvolumen-Reihe, Kontrollbeispiel), Sicherheitsventil-Stufen (Session 3) | Wissensbasis K (Tabellenbuch SHK B4 S.399–401, B2 Kap. 8) |
| `waermepumpen.json` | 47 Geräte (41 Heizung, 6 Brauchwasser), Zahlen als Zahlen, null statt «—», `kategorie`, Preis null = auf Anfrage, Plausibilitätsflag COP×P | Herstellerkataloge Bosch/Oertli/Panasonic 2026 (Seiten je Gerät) |
| `klimastationen.json` | 40 SIA-2028-Stationen (θe «kalt», 1-h-Min, HGT 20/12, ATD 12, Höhe, Kanton), PLZ-/Kantons-Zuordnung, Höhenkorrektur-Regel, 58 Vergleichsstationen SIA 381/2 | SIA 2028-C1:2015, Ergänzung 2010, MeteoSchweiz, SIA 384.201-C1:2014 |
| `huelle-epochen.json` | 7 Epochen × 6 Bauteile: Default-Schichtaufbau Bestand, U-Spanne min/max, Kontrollwert; λ-Kataloge; Bauweisen; Fenster Generation × Rahmen; Türen; SIA-380/1-Grenzwerte je Ausgabe | BFE Bauteilekatalog 2002, GEAK, BFE-UFELD, eREN, EnFK Merkblatt Fenster 2021, EnFK EN-2/EN-102 |
| `sia384-2.json` | Methodenregeln, n_min (NA.7), b_u (ND.3), ΔU_WB, Rsi/Rse, U_equiv Erdreich (B'), Innentemperaturen | SIA 384/2:2020 (Vorschau), SN EN 12831-1/C1:2020, SIA 384.201-C1:2014, Bauteilekatalog, Wissensbasis |
| `heizkoerper-tabellen.json` | Bauarten + eine Exponententabelle, Umrechnungs-Kontrollwerte, Platten W/m (Mittel 6 Hersteller), Guss/Stahl-Glieder DIN 4703, Röhren (Charleston), Konvektoren, Bad, Vertikal, FBH, Wandheizung, Minderungen f1–f5, Ampel-Schwellen, Modell-DB (205 belegte Einträge) | Hersteller-Datenblätter (Buderus, Kermi, Purmo/Radson, V&N, Stelrad, Brugman, HG-TEC, Zehnder, JOCO, Kermi, Uponor, WEM, Variotherm), Wissensbasis E/F |

Generatorskripte (Session 2, nicht im Repo): `huelle_bauen.py`, `hk_bauen.py`, `klima_bauen.py`, `wp_normalisieren.py` — die JSON-Dateien sind die Wahrheit; Änderungen direkt im JSON mit Quellenangabe.

Loader: `src/daten/fws.ts` (`fwsDaten()`, `hydraulikDaten()`); die TypeScript-Interfaces dort sind das Schema, tsc prüft die JSON-Dateien beim Build dagegen.

Alte Daten zum Nachschlagen: `referenz/alt-data/`.
