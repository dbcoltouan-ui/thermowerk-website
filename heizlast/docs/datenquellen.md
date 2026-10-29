# Datenquellen und Stichproben-Protokoll (`data/*.json`)

Stand: 2026-10-29 (Session 2). Jede Datei trägt `_meta { version, stand, beschreibung, quellen[] }`; jede Tabelle verweist mit `quelle: [id…]` auf diese Liste. Ableitungen sind mit `abgeleitet: true` oder Quelle `tw-abgeleitet` / `tw-annahme` gekennzeichnet und im Bericht als Annahme auszuweisen. Vollständige Recherche-Berichte mit allen Fundstellen: `docs/recherche/2026-10-29_*.md`. Tests: `tests/daten/*.test.ts` (Schema, Plausibilität, externe Referenzwerte).

Legende Status: **P** = Primärquelle (Norm, Hersteller-Datenblatt, Behörde), **S** = Sekundärquelle (Wissensbasis/Tabellenbuch DE, Software-Doku), **A** = Thermowerk-Ableitung/Annahme (belegte Nachbarwerte, dokumentiert).

## 1. `fws.json` — FWS-Modus (Kurs Modul 3, Version 1-2025)

| Zahl | Wert | Quelle | Status |
|---|---|---|---|
| t_voll Wohnen Mittelland / ab 800 m | 2000 / 2300 h/a | FWS M3 Folie 16 | P |
| t_voll Wohnen inkl. WW | 2300 / 2500 h/a | FWS M3 Folie 16 | P |
| t_voll Schule/Büro/Gewerbe | 1900 / 2100 h/a | FWS M3 Folie 16 | P |
| Heizwert Kurs: Heizöl 10.5 kWh/l, Erdgas 10.4 kWh/m³n, Hartholz 2500, Nadelholz 1800 kWh/rm, Pellets 5.2–5.5 kWh/kg | — | FWS M3 Folie 12; Aufgaben S. 2 | P |
| η-Bänder Öl/Gas: alt mit WW 0.70–0.75, alt ohne WW 0.80–0.85, Brennwert 0.85–0.95; Holz neu 0.65–0.75, alt 0.45–0.65; Pellets 0.65–0.75; Elektro 0.95 | — | FWS M3 Folie 12/13 (BFE Leistungsgarantie) | P |
| Kurslösungen η: 0.85 (Öl 25 J.), 0.80 (Öl mit WW), 0.92 (Gas kond.), 0.75 (Holz) | — | FWS Aufgaben 1A/1B/2 | P |
| Heizwert Hi: Heizöl EL 42.9 MJ/kg (Brennwert 45.7), Erdgas Hu 36.3 / Ho 40.3 MJ/m³n | 10.0 kWh/l (Dichte 0.84 Annahme), 10.08 kWh/m³n | BFE Faktenblatt 2014; BFE Gesamtenergiestatistik 2013/2017 | P (Dichte: A) |
| Sperrzeit-Faktoren 0–8 h | 1.00 … 1.50 (= 24/(24−t)) | FWS M3 Folie 30/31 | P |
| Bauperioden kWh/m²a und W/m² (EFH/MFH, 12 Perioden) | z. B. 1971–80 EFH 70–125 / 35–63 | FWS M3 Folie 36/37 (Schneider 2014) | P |
| Minergie-P 8–12 W/m²; unsaniert 1975 «40–50 W/m²» | — | FWS Aufgaben 3/2 | P |
| Sanierungsbänder Fenster 10–20, Fassade 25–40, Estrich 10–15, Keller 8–12 % | Kurs: 15/8/10 % | FWS M3 Folie 36; Aufgabe 2 | P |
| WW-Bedarf l/P·d: 40/45/55 (EFH), 35/45 (MFH), 3 (Büro) | — | SIA 385/2:2015 via FWS Folie 42 | P |
| Personenbelegung n = 3.3 − 2/(1+(A/100)³) | 150 m² → 2.8 | SIA 385/2:2015 via Folie 43/48 | P |
| Verluste: Speicher 8–10 %, Zirkulation 10–15 % (0.15 / 0.12 kWh/m·d), Ausstoss 15–20 %, additiv | 40.3 kWh/d Beispiel | FWS Folien 45–49 | P |
| Speicherverlust-Stützpunkte 0–2000 l (ΔΘ 45 K) | 800 l → 3.1 kWh/d | prSIA 385/2:2023 Diagramm Folie 45, abgelesen ±0.15 | P (Ablesung: A) |
| Qw über Ladezeit: td = Qww/Qhl; Qw = Qhl·(24/(24−td)−1) | 15 kW / 40.3 → 2.69 h / 1.89 kW | SIA 384/1:2022 Pos. 4.2.4 via Folie 50–52 | P |
| f_sto 1.25 / 1.10 / 1.00 | — | SIA 385/2:2015 §4.3.2.5 via Folie 54 | P |
| Spitzendeckungsvolumen ≈ 9 % V_W,u | — | SIA 385/2:2015 Säulendiagramm Folie 56, abgelesen | P (A) |
| EFH-Speicher meist 400 l à 60 °C; MFH 2–3 Ladezyklen | — | FWS Folie 57 | P |
| Puffer-Kriterien (Abtau 10–20, Takt 20, Sperrzeit 50–100 l/kW …) | — | Wissensbasis J §3.4–3.6 (Herstellerkonventionen DE) | S |
| Bivalenz: Leistungsanteil 50/33/25 % → Energie 80–85/50–60/30–40 % | — | FWS M3 Folie 95 | P |
| Gerätewahl (Session 6): Inverter-Faustregel Q_h ≥ 0.75 · Q_WP; gelb 0.60–0.75 und 1.00–1.10, rot darunter/darüber; Filter Q_WP ≥ Q_h · 0.9 | Aufgabe 4: 9.0/12 = 0.75 (Grenzfall) | FWS M3 Folie 3 Frage 4 (Antwort nicht abgedruckt, 0.75 gemäss FWS-RECHENWEGE §16.2); Bänder/Filter Thermowerk-Annahme | S/A |
| Bivalenz zwischen 50 % und 100 % Leistungsanteil linear gegen «monovalent = 100 %» interpoliert | — | Thermowerk-Annahme (Tabelle Folie 95 endet bei 50 %) | A |
| Norm-Reserve SIA 384/2 10–20 %; Feldmessung 30 % Überdimensionierung | — | FWS Aufgabe 3 Diskussion; Folie 8 | P |
| Jahresraster: Mittel über 3–5 relevante Jahre; Jahreswert = Σ Menge·365/Σ Tage | — | FWS M3 Folie 29; Aufgabe 2 (Ø 5 Jahre); FWS-RECHENWEGE §3a | P |
| Streuungs-Ampel 10 / 20 %, Mindestlänge 300 d je Eintrag (Session 3) | — | Thermowerk-Annahme (Kurs nennt keine Schwelle) | A |
| Klimabereinigung HGT_norm/HGT_ist, Plausibilitätsfenster 0.7–1.4 (Default aus, nicht FWS) | — | Thermowerk-Annahme; HGT-Norm aus klimastationen.json | A |
| Puffer-Regel max(Hersteller-Minimum, Kriterium): L/W 30–50 l/kW Q_WP (Mitte 40), Sole HK+ERR 20 l/kW, Marktrundung 50–2000 l | — | Wissensbasis J §5; FWS Folie 91; Thermowerk-Annahme | S/A |
| Plausi-Toleranz ±15 % um das Band; Norm/Verbrauch grün 10–25 %, gelb bis 40 % | — | FWS-RECHENWEGE §5; Thermowerk-Annahme | A |

### 1a. `hydraulik.json` — MAG / Sicherheitsventil (Session 3, nicht FWS)

| Zahl | Wert | Quelle | Status |
|---|---|---|---|
| Ausdehnungsfaktor n bei 10 °C Befüllung, 40–95 °C | 45 °C 0.96 %, 55 °C 1.42 %, 75 °C 2.57 % | Tabellenbuch SHK B4 S.400 via Wissensbasis K §3.2 | S |
| Anlageninhalt l/kW: Konvektoren 7, Platten 9, Radiatoren 15, FBH 20; gemischt 12–18 | gemischt 15 | B4 S.400 via Wissensbasis K §3.3 | S |
| Wasservorlage max(3 l, 0.5 %·V_A); V_N = (V_e+V_V)(p_e+1)/(p_e−p_0); p_e = p_SV − 0.5 bar | — | B4 S.400/401, DIN EN 12828 via Wissensbasis K | S |
| Kontrollbeispiel EFH 8 kW + Puffer 200 + WW 300 → V_A 620, V_N 27.8 → 35 l | — | Wissensbasis K §5 | S |
| MAG-Nennvolumen-Reihe 8…500 l | — | Herstellerreihe (B4 S.401); Thermowerk-Annahme | S/A |
| Sicherheitsventil DN15/20/25/32/40 bis 50/100/200/350/600 kW, 3.0 bar | — | B4 S.399, DIN EN 12828 via Wissensbasis K §3.6 | S |

## 2. `waermepumpen.json` — Gerätedatenbank (normalisiert)

| Zahl | Wert | Quelle | Status |
|---|---|---|---|
| 47 Geräte (41 Heizung, 6 Brauchwasser), Felder je Gerät | — | Datenbank_Waermepumpen_v1.0.1.xlsx aus Herstellerkatalogen Bosch/Oertli/Panasonic (Katalogseite je Gerät) | P (Verifikation nur KI-Session, so gekennzeichnet) |
| Plausibilitätsflag: COP(A2)×P(A2)/Q(A−7) ausserhalb 0.75–1.8 | 9 Geräte markiert (z. B. BO-0003: 2.08, OE-0001: 0.50) | Befund DATA-05 | A |
| Preis 0 → null «auf Anfrage» (OE-0011/0012) | — | Katalog 2026 | P |

## 3. `klimastationen.json` — SIA 2028 Klimastationen

| Zahl | Wert | Quelle | Status |
|---|---|---|---|
| θe «kalt», θ min 1 h, HGT 20/12, ATD 12 für 40 Stationen | z. B. Zürich-Kloten −8 / −15 / 3432; Bern-Liebefeld −7 / −14 / 3513; Davos −13 / −20 / 5689; Samedan −18 / −26 / 6375; Lugano −1 / −4 / 2438 | SIA 2028-C1:2015 Tabellen 1, 5, 6 (shop.sia.ch DownloadAnhang), Abruf 2026-10-29 | P |
| Definition θe (Mittel kälteste 4-Tagesmittel 1984–2003), 1-h = 1 %-Quantil Januar | — | Ergänzung 2010 zu SIA 2028 Ziff. 2.2/4.2 | P |
| Stationshöhen | z. B. Kloten 426, Adelboden 1321, Montana 1423 (ETH 1508) | MeteoSchweiz-Metadaten (CC BY), Wehrli et al. 2024 Tab. A1 | P (SIA-Tabelle 1a nicht öffentlich) |
| Ausgabe SIA 2028:2010, keine neuere | — | SIA-Publikationsliste 30.07.2026 | P |
| Höhenkorrektur: Regel (Höhendifferenz + τ) | Schwelle 200 m | SIA 384.201-C1:2014 ND.1.1; SIA 384/2:2020 Kap. 4/5; LINEAR-Doku | P / S |
| Gradient 0.6 K/100 m | Mittel 10 Stationspaare 0.66 (0.39–0.94) | Thermowerk-Ableitung aus SIA-2028-Werten | A |
| PLZ-/Kantonszuordnung | 2-/3-stellige Präfixe | Thermowerk-Regel; kantonale Regeln AG/GR/VD/SH/BS | A / P |
| Jahresmittel (alt), 58 Vergleichsstationen SIA 381/2 | z. B. Bern 8.6 °C, Zürich SMA 8.5 | LESOSAI-4-Handbuch (EPFL) Tab. 14 | S (veraltet, nur Vergleich) |

## 4. `huelle-epochen.json` — Gebäudehülle Bestand

| Zahl | Wert | Quelle | Status |
|---|---|---|---|
| λ Baustoffe (Vollbackstein 0.80, Sichtbackstein 0.52, Modulbackstein 0.44, KS 1.00, Beton 2.3, Innenputz 0.70, Aussenputz 0.87, Nutzholz 0.13 …) | — | BFE Bauteilekatalog Sanierungen 2002 S. 13 (SIA D0170) | P |
| λ Dämmstoffe (Glaswolle 0.031–0.048, EPS 0.032–0.042, XPS 0.028–0.038, PUR 0.022–0.027, nicht überwacht 0.046–0.064) | — | ebd. S. 12 (SIA 279) | P |
| Unbekannter Dämmstoff 0.040 (LU: 0.05) | — | Bauteilekatalog S. 17; Kanton LU Vollzugshilfe C | P |
| Bruchsteinmauerwerk λ_eff 0.90, Schlackenschüttung λ 0.20 | — | kalibriert auf Bauteilekatalog Ws 4 (0.9) / Dsi 5 (0.9) | A |
| Bauteil-U «ca.» Bestand: 30 cm Backstein 1.1, Naturstein 0.9, Zweischalen Luft 1.2, Fachwerk 1.9, Kellerdecke Beton 2.4, Holzbalken+Schlacke 0.9, Bodenplatte 4.5, Flachdach 3.0–3.5, Steildach ungedämmt 4.0, mit 6 cm 0.6 | — | Bauteilekatalog Kap. 4 S. 26–61 | P |
| GEAK-Richtwerte: Wand bis 1960 1.2–1.4, «1970» 0.6–0.8, «1980» 0.4–0.6, ab 1990 0.2–0.3; Dach 1.2–1.4 / 0.6–0.8 / 0.3–0.5 / 0.15–0.2; Fenster 3–5 / 2.5–3 / 1.5–2.5 / 1–1.5 | — | GEAK-Schulungsfolie «Typische U-Werte» S. 3/5 | P |
| GEAK-Tool Wand vor 1975: 1.4 schwer / 2.0 leicht (vor 1948); 1976–85: 0.8/0.6; UFELD-Messung 50–60 % tiefer | — | BFE-Fachbeitrag UFELD 2017 S. 2–3 | P |
| Bauhistorie Perioden (Wanddicken 45–70 cm bis 1930er, Hohlmauer ab Ende 40er, Dämmung ab 70er, Kellerdecke bis 90er selten) | — | HES-SO eREN 2018 S. 10–12 | P |
| Dämmstärken je Jahrzehnt (< 6 cm vor 1980 … ≥ 14 cm ab 2010) | — | Kanton VS «Grundlagen der Wärmedämmung» | P |
| SIA 380/1 Grenzwerte: 1988 (ZH-WDV 1991) Dach 0.3 / Wand 0.4 / Fenster 2.2; 2001 0.30/0.40/1.7; 2007 0.25/0.30/1.5; 2009 0.20 (0.17)/0.25–0.28/1.3; 2016 0.17/0.25/1.0, Türen 1.2 | — | ZH-WDV 1991; SIA-Vorwort 380/1:2007; EnFK EN-2 2013 + AG SR 773.116; EnFK EN-102 2016 + MuKEn 2014 | P |
| Fenster Uw-Matrix Generation × Uf (1.4/1.9/2.5/3.3): DV 2.5–3.5; 2-IV Luft 2.7–3.5; 3-IV alt 2.0–2.5; 2-IV-IR 1.6–2.1; 3-IV-IR 1.3–1.8; 3-IV-IR-IR 1.1–1.6 | — | EnDK/EnFK Merkblatt Fenster 2021 Tab. 5/6/7 S. 9 | P |
| Einfachglas Uw ≈ 5.0 (bis Mitte 60er), Ug 5.8 | — | GEAK-Folie S. 5; eREN S. 12; Denkmalpflege Bern | P (Uf-Spalten: A) |
| Türen U 1.1–2.8 je Aufbau; Metall ungedämmt 5.5 | — | Bauteilekatalog S. 67; Wissensbasis B Tab. 3.6 | P / S; Epochenzuordnung A |
| Default-Aufbau je Bauteil × Epoche, berechnetes U innerhalb Spanne (z. B. AW 1919–45 Backstein 30 cm → 1.26; AW 1978–94 Kerndämmung 4 cm → 0.62; Kellerdecke 1946–60 → 2.10) | — | Schichtrechnung ISO 6946 aus obigen λ, kalibriert auf Spannen | A (Test prüft Nachrechnung, Monotonie, Dämmung↑ ⇒ U↓) |

## 5. `sia384-2.json` — raumweise Norm-Heizlast

| Zahl | Wert | Quelle | Status |
|---|---|---|---|
| Methode: nur Mindestluftwechsel, kein Wiederaufheizzuschlag, U_eq 0–5 m, Anhang A/B | — | SIA 384/2:2020 Vorschau (Vorwort/Änderungen); ZH EnergiePraxis 2021 | P |
| n_min Tabelle NA.7 (natürlich: Bad 0.50/0.70, weitere 0.30/0.50; WRG 0.20/0.40, Durchström 0.10/0.30; Lufterwärmung 0.10/0.30; Abluft Dauer 0.50/0.70; innenliegend 0) | — | SN EN 12831-1:2017/C1:2020 (= SIA 384.201-C1:2020) S. 3 | P |
| b_u Tabelle ND.3 (seitlich 0.6/0.8 … 0.4/0.6; Keller 0.5/0.7 … 0.3/0.5; Estrich 0.7/0.9) | — | SIA 384.201-C1:2014 S. 2 | P (SIA 384/2 Anhang A nicht öffentlich) |
| ΔU_WB 0.10 Bestand / 0.05 Neubau / 0.02 Nachweis | — | Wissensbasis B Tab. 3.9 (DIN); SIA-Wert nicht öffentlich | S / A |
| Rsi 0.10/0.13/0.17, Rse 0.04, Erdreich 0, hinterlüftet = Rsi, FBH Rsi 0 | — | Bauteilekatalog S. 11/15/17; LU Vollzugshilfe C Folie 9; Wissensbasis B Tab. 3.1 | P / S |
| U_equiv Bodenplatte nach B' × R_f (B' 4 ungedämmt 0.88; 2 cm/R 0.5: 0.59 …), f_θann 1.45, f_GW 1.15 | — | Wissensbasis B Tab. 3.8 (ISO 13370 via Tabellenbuch); DIN/TS-Beispiel (Beuth Errata) 0.58 → 0.37 | S (SIA Anhang B nicht öffentlich) |
| B' = A_g/(0.5·P) | — | DIN/TS 12831-1 Beispiel (Beuth) | P |
| θint: Wohnen 20, Bad 24, Flur 15, Dusche/Garderobe 21, unbeheizt 5–10 | — | SIA 2024 Tab. 11 (nur Zeile 12.08 öffentlich); DIN/TS 12831-1 (Wissensbasis A); FWS Folie 17 | P / S / A |

## 6. `heizkoerper-tabellen.json` — Heizflächen

| Zahl | Wert | Quelle | Status |
|---|---|---|---|
| Platten W/m 75/65/20, Typ 10/11/20/21/22/30/33 × 300–900 | Mittel aus Buderus Logatrend C-Profil.2 (2025), Kermi Profil-K (2017/2023), Purmo Compact (2020/2023), V&N Kompakt (2012/2022), Stelrad Novello (2014/2024), Brugman Compact 4 (2025); z. B. Typ 22/600: 1679 / 1666 / 1709 / 1713 / 1732 / 1683 → 1697 W/m | Datenblätter mit PDF-Seite (siehe `_meta.quellen`, `platten.belege`) | P (Mittel: A) |
| Exponent n je Typ 1.29–1.33 | Mittel der Herstellerangaben | ebd. | P |
| 55/45-Kontrolle: alle Hersteller ±1 % der Umrechnung mit n über Δθ_log | — | ebd. | P |
| Guss DIN 4703 W/Glied 75/65 (NA 200–900 × T 70–250), z. B. 600/160: 111 W (70/55: 89) | — | HG-TEC 8/2009; Buderus Katalog 04/2026 (70/55, 55/45 ±1 W) | P |
| Stahl-Glieder DIN 4703 W/Glied | 500/160: 73 W | HG-TEC 8/2009 | P |
| V&N Gliederradiatoren W/lfm bei 90/70/20 | 500/160: 1980 | V&N Modernisierung 08/2010 | P (nur 90/70) |
| Charleston W/Element 2–6 Säuler × 200–2000 mm; n 1.25–1.33 | 3-Säuler H600: 60.9 W (Wissensbasis Tab. 3.5: 60) | Zehnder UK 2020; PL 2015 | P |
| Konvektoren: V&N Kontec W/m + n 1.19–1.38; JOCO W/lfm n 1.41; Terraline n 1.37–1.55; Gebläse 1.02–1.22 | — | V&N 07/2022; JOCO 2022; Zehnder Terraline ZGCH 605 | P |
| Bad: Kermi Basic-D (n 1.195–1.233), Zehnder Zeno | 1172×599: 662 W | Kermi I/2023 S. 286; Zehnder Zeno 2021 | P |
| Vertikal: Purmo Vertical, Stelrad Vertex (W/m, n 1.30–1.33) | — | Purmo RO 2009/10; Stelrad PDS 2023 | P |
| FBH W/m² VA 50–300 × Rλ,B 0–0.15 × ΔθH 15–30 K | VA100/0.05/15 K: 71 (Viessmann: 70) | V&N Floortec 2012 S. 28–31; Viessmann 2023 S. 37 | P |
| EN-1264-Grenzwerte 29/33/35 °C, ≈100/175 W/m², q = 8.92·Δθ^1.1 | — | V&N Floortec, Viessmann, Uponor, Danfoss | P (Normtext nicht eingesehen) |
| Wandheizung 85/100 W/m² bei 35/30; 84 W/m² bei 35/28 | — | WEM 2022/2020; Variotherm | P |
| Minderungen f1–f5 | f5 reitend 20 K: 12 % | Wissensbasis E §10.3 (B2 S.242) | S |
| 90/70 → 75/65 = 0.795 (n 1.3) | — | EN 442 Rechnung; Befund HK-08 | P |
| Ampel-Schwellen Deckung 1.0/0.85, VL 55/65 °C | — | Befund §6.2; Wissensbasis E §5 | A |

## 6a. Ergänzungen Session 4 (2026-10-29)

| Datei / Tabelle | Zahl | Quelle | Status |
|---|---|---|---|
| `huelle-epochen.json` bauweisen: Schichtvorlagen bruchstein (50 cm), holz_blockwand (12 cm), kalksandstein (17.5), beton (20), porenbeton (25), innendaemmung (4 cm bestand_alt), holzrahmen (16 cm MW, homogen) | λ je Material aus Bauteilekatalog; Aufbau = Annahme | BFE Bauteilekatalog 2002 (λ), tw-session4 (Aufbau) | A |
| `huelle-epochen.json` bodenKeller.gewoelbe uPauschal 1.5 | 1.2–1.69 Mitte | Wissensbasis B Tab. 3.4 (B4 S.345) Kellerdecke 1919–1977 | S |
| `huelle-epochen.json` innenbauteile: Backstein 12/15, Beton 20, Ständerwand, Holz; Betondecke ± Trittschall, Holzbalkendecke; Innentür 2.0 | Innentür 2.0 | Wissensbasis B Tab. 3.6 (B1 LF07 S.431); Aufbauten tw-session4 | S/A |
| `sia384-2.json` erdreich.formelIso13370: d_t = w + λ(Rsi + R_f + Rse), U = 2λ/(πB'+d_t)·ln(πB'/d_t+1) bzw. λ/(0.457B'+d_t); w 0.3 m, λ 2.0 | reproduziert Tabelle B 3.8 (20 Stützpunkte) auf ±2 %, B'2/R_f2 +7.6 % | ISO 13370 (Wissensbasis B §3.8, alt normwerte.json erdreich_iso13370) | P |
| `sia384-2.json` erdreich.faktoren f_g1 1.45, f_g2 = (θint − θm,e)/(θint − θe), f_GW 1.0/1.15 | Beuth-Errata 1.45; IBO 1.45/1.15; 238/5 θm,e 10.2 | EN 12831:2003 §7.1.3 (SIA 384.201), DIN/TS 12831-1 Beispiel | S |
| `klimastationen.json` jahresmittel: 11.5 °C − 0.5 K/100 m, RMSE 0.8 K | Regression über 53 SIA-381/2-Stationen < 2000 m | lesosai-sia381-2, tw-abgeleitet | A |
| `fws.json` ebf.faktorNwfZuEbf 1.10 (1.10–1.15) | EBF ≈ NWF × 1.1–1.15; Beispiel 50+100+80 = 230 m² | FWS M3 Folie 33–35 | P |

## 6b. Ergänzungen Session 5 (2026-10-29)

| Datei / Tabelle | Zahl | Quelle | Status |
|---|---|---|---|
| `heizkoerper-tabellen.json` auslegung.spreizungDefaultK Radiatoren 10 K, Flächen 7 K | wie f_u-Tabellen 55/45, 45/35 bzw. Auslegung 35/28 | Wissensbasis E Tab. 3.2/3.10, F | S / A |
| auslegung.zielVLDefaultC 55 °C | Grenze «gut» der WP-Tauglichkeit | Befund §6.2; FWS M3 Senkentemperatur 55 °C @ A−8 | A |
| auslegung.vlSuchbereichC 20–90 °C, hoeheEinrastenToleranzMm 30 | — | tw-annahme | A |
| auslegung.unsicherheitProzent Typenschild 2, Modell 5, Tabelle 15, extrapoliert 25, Standardwert-Mass 25, Heizkurve 30, Verteilung nach Fläche 25 | — | Befund §6.1 (2/5/15); Rest tw-annahme | S / A |
| auslegung.gussTiefeDefaultMm 160; fbhDefault VA 150, Rλ,B 0.10 (Bad 0.00); Konvektor-Einbau verkleidet | Rλ,B 0.10 = Planungswert Wohnen | fbh.rlbTypisch (V&N/Viessmann); tw-annahme | S / A |

## 7. Nicht belegt (offen, als Annahme gekennzeichnet)

- Höhengradient θe (K/100 m) und τ-Korrektur nach SIA 384/2 Kap. 4/5 (Normtext nicht öffentlich) → 0.6 K/100 m ab 200 m Differenz.
- SIA 384/2 Anhang A (b-Faktoren), Anhang B (U_eq) und Wärmebrückenzuschlag → Ersatz: SIA 384.201 ND.3, ISO-13370-Formel mit f_g1·f_g2·f_GW (EN 12831:2003), DIN-Pauschale 0.10/0.05.
- Unsicherheits-Stufen der Hüllen-Kaskade (Epoche: halbe Spanne/U; Dämmung bekannt ±30 %; Dämmdicke bekannt ±20 %; alle Stufen ±10 %; Fenster ±10/5 %; Innenbauteile ±15 %) → Thermowerk-Annahme.
- SIA 2024 Tabelle 11 Innentemperaturen (nur eine Zeile öffentlich) → DIN/TS-Werte.
- Exponent n für Guss-/Stahl-Gliederradiatoren (kein Datenblatt nennt n) → 1.30 (Wissensbasis; HG-TEC-Werte 75/65→55/45 implizieren ≈1.30).
- FBH-Tabelle bei exakt 35/28/20 → Kern skaliert von ΔθH 15 K mit n 1.10.
- Epochenzuordnung von Böden gegen Erdreich, Kellerdecken und Aussentüren (keine CH-Quelle mit Periode) → Bauteilekatalog + Bauhistorie (eREN).
- Heizwert-Dichte Heizöl 0.84 kg/l (BFE nennt nur MJ/kg).
- WP-Datenbank: Herstellerwerte durch KI-Session erfasst, nicht fachlich geprüft; 9 Geräte mit Plausibilitätsflag.
