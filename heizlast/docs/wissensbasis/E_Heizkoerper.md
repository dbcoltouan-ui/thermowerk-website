# Bereich E – Heizflächen / Heizkörper

## 1. Zweck & Anwendung im Tool

**WP-Kernbereich bei Sanierung:** Prüfung, ob vorhandene Heizkörper bei abgesenkter Vorlauftemperatur noch die Raumheizlast decken. Kernwerkzeug ist der **Temperatur-Umrechnungsfaktor fᵤ** (B4 S.373). Zwei Modi: Exakt (Herstellerdaten + Übertemperatur-Exponent n) oder Richtwert (Bauart-Typenleistung nach Baujahr/Baugröße + pauschaler fᵤ).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| **Q̇HK = Q̇N · fᵤ** | Leistung bei abweichenden Temperaturen | W | B4 S.373, B3 Kap.5 S.53 |
| **fᵤ = (Δϑü / Δϑü,N)ⁿ** | Umrechnungsfaktor | – | B2 Kap.8 S.241 |
| **Δϑü = ϑm − ϑi** | Übertemperatur | K | B1 LF07 S.435, B4 S.358 |
| **ϑm = (ϑV + ϑR) / 2** | Mittlere Heizmitteltemp. (arithmetisch) | °C | B1 LF07 S.435 |
| Δϑü,log = (ϑV − ϑR) / ln[(ϑV−ϑi)/(ϑR−ϑi)] | Logarithm. Übertemperatur (exakt) | K | DIN EN 442-2 |
| Q̇H = fx · ΦHL | Auslegungsleistung Heizkörper | W | B1 LF07 S.435 |
| ṁHK = Q̇HK / (c · Δϑk) | Heizkörper-Massenstrom | kg/h | B4 S.358 |
| ϑVn+1 = ϑVn − Q̇n / (c · ṁK) | Vorlauf nachfolg. HK (Reihen-/Einrohr) | °C | B4 S.358 |

*n = Heizkörper-Exponent (Strahlung/Konvektionsanteil):* Radiator n ≈ 1,30; Plattenheizkörper n = 1,25 – 1,30; Konvektor n ≈ 1,40; Röhrenradiator n ≈ 1,25; Deckenstrahlplatte n ≈ 1,10; FBH n ≈ 1,10.

---

## 3. Tabellen & Richtwerte

### 3.1 Norm-Auslegungstemperaturen (B1 LF07 S.435)

| System | ϑV / ϑR / ϑi | ϑm | Δϑü,N | Norm |
|--------|---------------|-----|-------|------|
| Altbau-Standard | 90 / 70 / 20 | 80 | **60 K** | DIN 4703 |
| EN-Standard | 75 / 65 / 20 | 70 | **50 K** | DIN EN 442 |
| Niedertemperatur-Radiator (NTR) | 55 / 45 / 20 | 50 | **30 K** | – |
| WP-Radiator sinnvoll | 55 / 45 / 20 | 50 | 30 K | – |
| WP-Flächenheizung | 35 / 28 / 20 | 31,5 | 11,5 K | – |

### 3.2 ⭐ Umrechnungsfaktor fᵤ (B4 S.373, B2 Kap.8 S.241)

**Bezugsbasis:** Prüfbedingung 75/65/20 (Δϑü,N = 50 K), Exponent n ≈ 1,30.

| Betrieb ϑV / ϑR / ϑi | Δϑü [K] | fᵤ (n=1,30) | fᵤ (n=1,25 Panel) | fᵤ (n=1,40 Konvektor) |
|----------------------|---------|--------------|--------------------|------------------------|
| 90 / 70 / 20 | 60 | 1,27 | 1,24 | 1,29 |
| **75 / 65 / 20 (Basis)** | **50** | **1,00** | **1,00** | **1,00** |
| 70 / 55 / 20 | 42,5 | 0,81 | 0,82 | 0,79 |
| 65 / 55 / 20 | 40 | 0,75 | 0,76 | 0,74 |
| 60 / 50 / 20 | 35 | 0,63 | 0,65 | 0,61 |
| **55 / 45 / 20 (WP-Radiator)** | **30** | **0,52** | **0,53** | **0,48** |
| 50 / 40 / 20 | 25 | 0,41 | 0,43 | 0,38 |
| **45 / 35 / 20 (WP-Niedrig)** | **20** | **0,30** | **0,33** | **0,25** |
| 40 / 30 / 20 | 15 | 0,20 | 0,23 | 0,16 |
| 35 / 28 / 20 | 11,5 | 0,14 | 0,16 | 0,11 |

**Merksatz:** Radiator bei 55/45/20 → nur **52 %** der Normleistung; bei 45/35/20 → nur **30 %**. Bestandsheizkörper sind meist für 90/70 ausgelegt → Reserve vorhanden, aber Prüfung nötig.

### 3.3 Heizkörper-Exponenten n (B3 Kap.5 S.53 + Herstellerkonvention)

| Bauart | n |
|--------|-----|
| Gussradiator | 1,30 |
| Stahlradiator (Glieder) | 1,30 |
| Stahlröhren-/Designradiator | 1,25 – 1,30 |
| Plattenheizkörper Typ 10–22 | 1,25 – 1,30 |
| Plattenheizkörper Typ 33 | 1,30 – 1,33 |
| Konvektor (ohne Gebläse) | 1,40 |
| Konvektor mit Gebläse | 1,10 – 1,20 |
| Deckenstrahlplatte | 1,10 – 1,15 |
| Fußbodenheizung | 1,10 |

### 3.4 Bauarten & Typenkürzel (B1 LF07 S.399–403, B4 S.368–372)

| Bauart | Merkmal | Baulänge / Glied | WP-Tauglichkeit |
|--------|---------|-------------------|-----------------|
| Gussradiator | Grauguss, Nippel, schwer, träge | 60 mm | gut bei Altbau (meist überdimensioniert) |
| Stahlradiator (Glieder) | Stahlblech, gezogen | 50 mm | gut |
| Stahlröhrenradiator (Säuler) | 2–6-säulig, Bautiefe 65 – 225 mm | 46 mm | mittel, oft klein |
| Plattenheizkörper Typ 10/11/21/22/33 | Platten + Konvektorbleche | variabel | gut bei Typ 22/33, Austausch Typ 11 nötig |
| Ventilheizkörper | vormontiertes Thermostatventil | – | gut |
| Badheizkörper (Handtuchtrockner) | Rohrregister | – | eingeschränkt (kleine Leistung) |
| Konvektor | Lamellen im Schacht | – | schlecht (n = 1,40 → fᵤ-Abfall steiler) |
| Unterflurkonvektor | Bodenkanal | – | nur mit Gebläse akzeptabel |
| Deckenstrahlplatte | Hallenheizung | – | gut (n ≈ 1,10) |
| Rohrheizkörper | Stahl-/Rippenrohr | – | Sonderfall |

### 3.5 Stahlrohr-Säulenradiator – Gliederleistung [W/Glied] (B1 LF07 S.435)

Spalte 1 = bei 75/65/20 → Δϑü = 50 K; Spalte 2 = bei 55/45/20 → Δϑü = 30 K:

| H [mm] | 2-Säuler (T=65) | 3-Säuler (T=105) | 4-Säuler (T=145) | 5-Säuler (T=185) | 6-Säuler (T=225) |
|--------|------------------|-------------------|-------------------|-------------------|-------------------|
| 190 | 14 / 7 | 20 / 10 | 26 / 13 | 29 / 15 | 32 / 16 |
| 300 | 22 / 11 | 31 / 16 | 40 / 21 | 48 / 25 | 57 / 29 |
| 500 | 37 / 19 | 51 / 26 | 65 / 33 | 80 / 41 | 94 / 48 |
| 600 | 44 / 23 | 60 / 31 | 77 / 40 | 95 / 49 | 113 / 58 |
| 750 | 55 / 28 | 75 / 39 | 95 / 49 | 117 / 60 | 137 / 71 |
| 1000 | 73 / 38 | 98 / 50 | 124 / 64 | 151 / 78 | 180 / 93 |
| 2000 | 140 / 72 | 189 / 97 | 237 / 122 | 282 / 144 | 330 / 169 |

### 3.6 Flachheizkörper-Typen (B1 LF07 S.401, DIN EN 442)

| Typ | Heizplatten | Konvektorbleche | rel. Leistung bezogen auf Typ 22 |
|-----|-------------|------------------|-----------------------------------|
| 10 | 1 | 0 | ~ 0,40 |
| 11 | 1 | 1 | ~ 0,55 |
| 21 | 2 | 1 | ~ 0,80 |
| 22 | 2 | 2 | 1,00 |
| 33 | 3 | 3 | ~ 1,45 |

**Merksatz WP-Umrüstung Typ 11 → 22:** Leistungssteigerung ~ +80 % bei gleicher Baugröße. Typ 22 → 33 bei gleicher Baulänge: ~ +45 %.

### 3.7 Konvektor-Leistungstabelle (B4 S.368, Auszug Standardkonvektor)

| H×T [mm] | Q̇L bei 75/65/20 [W/m] | Q̇L bei 55/45/20 [W/m] | n |
|----------|--------------------------|---------------------------|-----|
| 70 × 72 (2-reihig) | 349 | 283 · 0,48 ≈ 170 | 1,24 |
| 70 × 133 (m. Strahlschirm) | 458 | ≈ 220 | 1,24 |
| 140 × 133 | ~ 760 | ~ 370 | 1,24 |
| 280 × 255 | ~ 1800 | ~ 870 | 1,24 |

*Gebläsekonvektoren liefern n ≈ 1,10 → WP-freundlicher.*

### 3.8 Einrohr-Heizkörperauslegung Formblatt (B4 S.358, ϑV = 65/ϑR = 55)

Verfahren in 15 Spalten (pro Heizkörper):

1. HK-Nummer
2. Q̇H [W]
3. ṁK (Kreis-Massenstrom) [kg/h]
4. p (%-Anteil pro HK)
5. ṁH = ṁK · p/100
6. ΔϑH = Q̇H / (c · ṁH)
7. ϑV,HK
8. ϑR,HK = ϑV,HK − ΔϑH
9. ϑm,HK = (ϑV + ϑR) / 2
10. ϑi
11. Δϑü = ϑm − ϑi
12. fᵤ (aus 3.2)
13. Δϑk (Kreis)
14. ϑV nächster HK = ϑV − Q̇n / (c · ṁK)
15. Q̇Aus = Q̇H / fᵤ → **Auswahlgröße aus Katalog**

**Anwendung WP-Umrüstung:** Aus vorhandener Q̇N (Katalog 75/65/20) + WP-Solltemperatur → fᵤ → Q̇tats = Q̇N · fᵤ. Falls Q̇tats < Φ̇HL,Raum → Heizkörper zu klein.

### 3.9 Heizkörperplatzierung (B1 LF07 S.399)

- **Ideal:** unter Fenster, Baulänge ≥ Fensterbreite (Kaltluftabfall-Schutz).
- **Innenwand:** Fußkälte, Zug, Kondensat/Schimmel. Energie-Mehraufwand ca. **6 % / K höhere Raumlufttemperatur** bei suboptimaler Platzierung.
- Strahlungsschirm zum Fenster hin bei bodennahen Elementen.

### 3.10 WP-Schnellprüfung Bestand (Konvention aus fᵤ-Methode)

**Ist-Leistung Bestand (bei angenommener Norm 75/65):** Q̇N aus Typ + Baugröße (Tab. 3.5/3.6).
**Soll-Leistung bei WP-Vorlauf:** Q̇soll = Q̇N · fᵤ(WP).
**Bedingung WP-tauglich:** Q̇soll ≥ ΦHL,Raum.

| WP-Betrieb | fᵤ (Radiator n=1,30) | → Erforderliche Reserve im Bestand |
|------------|----------------------|-------------------------------------|
| 60/50/20 | 0,63 | +60 % |
| 55/45/20 | 0,52 | +92 % |
| 50/40/20 | 0,41 | +144 % |
| 45/35/20 | 0,30 | +233 % |

**Maßnahmen wenn zu klein:** (a) HK-Typ vergrößern (22 → 33), (b) Baulänge +50 %, (c) VL auf 55 °C halten (Hybrid), (d) FBH nachrüsten, (e) Niedertemperatur-Konvektor mit Gebläse, (f) Deckenstrahlplatte (Kat.).

---

## 4. Exakt-Modus Workflow (bekannte Daten)

1. Pro Raum ΦHL aus Bereich C.
2. Heizkörper-Typ + Baugröße → Q̇N (75/65/20) aus Herstellerdatenblatt oder Tab. 3.5/3.6.
3. WP-Systemtemperatur ϑV / ϑR wählen.
4. Δϑü = (ϑV + ϑR)/2 − ϑi.
5. fᵤ = (Δϑü / 50 K)ⁿ mit n aus Tab. 3.3.
6. Q̇tats = Q̇N · fᵤ.
7. Prüfung Q̇tats ≥ ΦHL. Falls nicht → Austausch/Vergrößerung.
8. Massenstrom ṁHK = Q̇tats / (c · Δϑk) mit c = 1,163 Wh/(kg·K).
9. fx-Zuschlag 1,10 – 1,15 (B1 LF07 S.435).

---

## 5. Richtwert-Modus Workflow (Sanierung)

1. Pro Raum Heizkörpertyp + Baugröße **fotografieren/messen** (H × L × T).
2. Baujahr-Annahme:
   - Altbau 75/65 → Q̇N ≈ Auslegung für 60 K Δϑü (oft 90/70 → Umrechnung nötig)
   - Bestand ab 1990 → 70/55 oder 75/65
3. Q̇N aus Tab. 3.5 (Stahlrohr) oder 3.6 (Flachheizkörper) schätzen.
4. Default WP-Vorlauf 55 °C (sanierte Hülle) bzw. 60 °C (teilsaniert).
5. fᵤ aus Tab. 3.2 ablesen.
6. Ampelbewertung:
   - Q̇tats ≥ 1,0 · ΦHL → **grün** (WP-tauglich)
   - 0,7 – 1,0 · ΦHL → **gelb** (WP mit höherer VL oder Einzelaustausch)
   - < 0,7 · ΦHL → **rot** (Austausch/FBH/Konvektor mit Gebläse)
7. Falls Bad: wegen Δϑ = 30 → Handtuchtrockner + FBH oder Elektro-Zusatzheizstab einplanen.

---

## 6. Plausibilitätsprüfungen

- Q̇tats > 2,0 · ΦHL → stark überdimensioniert, niedriger fx akzeptabel, VL weiter absenken prüfen.
- Q̇tats < 0,5 · ΦHL → kein WP-Betrieb möglich ohne Heizflächenvergrößerung.
- n < 1,10 oder > 1,50 → Eingabefehler (realistischer Bereich 1,10 – 1,40).
- Δϑü < 10 K → Rechnung instabil (sehr niedrige VL), Heizkörper ineffizient.
- ṁHK pro Thermostatventil: prüfen Mindestdurchfluss Hersteller (typ. ≥ 30 kg/h bei DN15).
- Badheizkörper-Leistung < 600 W bei 55/45 → Raumheizlast nicht gedeckt → Zusatzheizung.
- Summe Q̇tats (alle HK) ≥ Φ̇HL,Gebäude · 1,00 (ohne Sicherheitszuschlag) sonst WP untertaktet.
- fᵤ-Methode bei VL < 35 °C → lieber FBH/Wandheizung statt Radiator.

---

## 7. Normenverweise

- **DIN EN 442** (Heizkörperprüfung, Q̇N, Exponent n)
- **DIN EN 12831-1** (Heizlast als Input)
- **DIN 4703** (klass. Auslegung 90/70/20)
- **DIN EN 215** (Thermostatventil)
- **DIN 18380 (VOB)** (Heizungsmontage)
- **VDI 6030** (Auslegung Raumheizflächen)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| Heizkörperplatzierung, Wärmeabgabe Mensch | B1 LF07 S.399 |
| Gussradiator/Stahlradiator Baulänge, Bezeichnung | B1 LF07 S.400 |
| Stahlröhrenradiator (Säuler), Flachheizkörper-Typen 10/11/21/22/33 | B1 LF07 S.401 |
| Ventilheizkörper, Sonderbauformen, Konvektor-Grundlagen | B1 LF07 S.402 |
| Konvektor Einsatz, Strahlungsschirm, Unterflur-/Gebläsekonvektor | B1 LF07 S.403 |
| Heizflächenauslegung, ϑm, Δϑü, fx, Leistungstabelle Säulenradiator | B1 LF07 S.435 |
| Heizkörper-Leistungsformel Q̇ = Q̇N·(Δϑü/Δϑü,N)ⁿ | B3 Kap.5 S.53 |
| Umrechnungsfaktor fᵤ Herleitung | B2 Kap.8 S.241 |
| ⭐ Einrohr-Formblatt 15 Spalten, VL-Abfolge | **B4 S.358** |
| Konvektor-Leistung mit/ohne Strahlschirm | B4 S.368 |
| Rohrheizkörper, Rippenkörper spez. Leistung | B4 S.369 |
| Deckenstrahlplatten-Auslegung, fA, Panelabstand | B4 S.370 |
| Deckenstrahlplatten Leistungs-/Druckverlustdiagramm | B4 S.371 |
| ⭐ **fᵤ-Tabelle** | **B4 S.373** |
| ⭐ **fᵤ-Tabelle (B2-Detailrastern, Δϑ 10–70K × 0–9K)** | **B2 Kap.8 S.241** |
| Heizkörper-Leistungstabellen 75/65/20 + 55/45/20 (WP-Vergleich) | B2 Kap.8 S.240 |
| Minderungsfaktoren f1…f5 (Nische, Verkleidung, Lack, Baulänge, Spreizung) | B2 Kap.8 S.242 |
| Heizkörpergröße-Formel Q̇H = n·qn·fu·fm bzw. l·qn·fu·fm | B2 Kap.8 S.243 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 S.53–54)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| **Q̇HK = Q̇N · (Δϑü / Δϑü,N)ⁿ** | Heizkörperleistung bei abweichender Temp. | W |
| Q̇HK = n · qn · fu · fm (Radiator) | HK aus Gliederanzahl | W |
| Q̇HK = l · qn · fu · fm (Plattenheizkörper) | HK aus Baulänge | W |
| Δϑü = (ϑV + ϑR)/2 − ϑi | Arithmetische Übertemperatur | K |
| fm = f1 · f2 · f3 · f4 · f5 | Gesamtminderungsfaktor | – |
| fi = 1 − mi/100 | Einzel-Minderungsfaktor aus Minderleistung mi [%] | – |

*B3 deckt gesamtes Heizkörper-Berechnungsverfahren. Identisch zu B2/B4.*

---

## 10. B2 Kap.8 Detailergänzungen – fᵤ-Tabelle (S.241) & Minderungsfaktoren (S.242)

### 10.1 ⭐ fᵤ-Tabelle (B2 S.241) – Vollraster EN 442, Δϑü,N = 50 K, n = 1,33

Für präzise WP-Umstellungsprüfung (Zeilenwerte = K-Anteil Rücklauf unter Vorlaufspreizung):

| Δϑ [K] \\ Restglied | 0 K | 1 K | 2 K | 3 K | 4 K | 5 K | 6 K | 7 K | 8 K | 9 K |
|---------------------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| **10** | 0,11 | 0,13 | 0,15 | 0,17 | 0,19 | 0,21 | 0,23 | 0,25 | 0,27 | 0,28 |
| **20** | 0,30 | 0,32 | 0,34 | 0,36 | 0,39 | 0,41 | 0,43 | 0,45 | 0,47 | 0,49 |
| **30** | 0,51 | 0,54 | 0,56 | 0,58 | 0,61 | 0,63 | 0,65 | 0,67 | 0,70 | 0,72 |
| **40** | 0,75 | 0,77 | 0,80 | 0,82 | 0,85 | 0,87 | 0,90 | 0,92 | 0,95 | 0,97 |
| **50** | 1,00 | 1,03 | 1,05 | 1,08 | 1,10 | 1,13 | 1,16 | 1,19 | 1,22 | 1,25 |
| **60** | 1,28 | 1,30 | 1,33 | 1,36 | 1,39 | 1,42 | 1,45 | 1,48 | 1,50 | 1,52 |
| **70** | 1,56 | 1,60 | 1,63 | 1,66 | 1,69 | 1,72 | 1,75 | 1,78 | 1,81 | 1,82 |

*Ablesebeispiel: ϑm = 65 °C, ϑi = 20 °C → Δϑ = 45 K → Spalte 5, Zeile 40 → fᵤ = 0,87 → HK liefert 87 % seiner 50-K-Normleistung. (Abweichung zu Tab 3.2: B2-Raster nutzt n=1,33 statt 1,30 → ca. +2 % höher.)*

### 10.2 Heizkörper-Leistungen Bestandsvergleich (B2 Kap.8 S.240)

Die B2-Tabelle listet Heizkörperleistungen parallel für 75/65/20 (PWW-EN-442) und 55/45/20 (WP-Radiator-Auslegung). Damit Direktvergleich ohne Umrechnung möglich. → Tool-Einsatz: wenn Nutzer Heizkörpertyp angibt, q 75/65 UND q 55/45 in Vorschlagstabelle präsentieren.

### 10.3 ⭐ Minderungsfaktoren f1 … f5 (B2 S.242, neu)

Die **Normwärmeleistung gilt nur für frei aufgestellten, unverkleideten HK an glatter Wand.** Abweichungen:

| Faktor | Ursache | Minderleistung m [%] | Quelle |
|--------|---------|-----------------------|--------|
| **f1** | Nischeneinbau, Abstand Δh < 100 mm | 1 – 33 % (typisch 4–10 %) | B2 S.242 Bild 2 |
| **f2** | Verkleidung | 3 – 10 % | B2 S.242 Tab.1 |
| **f3** | Metallicfarbe, Bronze, blanke Metalloberfläche | bis 30 % | Herstellerangabe |
| **f4** | Baulänge > 500 mm (nicht bei wechselseitigem Anschluss) | 1,0 – 3,5 % | B2 S.242 Tab.2 |
| **f5** | Temperaturspreizung > 20 K | 4 – 25 % | B2 S.243 Tab.1 |

**Minderungsfaktor f2 – Verkleidungen detailliert:**

| Heizkörperart | Minderung [%] |
|---------------|---------------|
| Gliederheizkörper | 4 – 8 |
| Plattenheizkörper, einreihig, ohne Konvektorblech | 5 – 10 |
| Plattenheizkörper, einreihig, mit Konvektorblech | 4 – 8 |
| Plattenheizkörper, mehrreihig | 3 – 5 |

**Minderungsfaktor f4 – Baulängen:**

| Baulänge [mm] | Minderung [%] |
|---------------|---------------|
| 500 – 1.000 | 1,0 |
| 1.000 – 1.500 | 1,5 |
| 1.500 – 2.000 | 2,5 |
| 2.000 – 2.500 | 3,5 |

**Minderungsfaktor f5 – Spreizung + Anschlussart:**

| Temperaturspreizung | Vorlauf oben / Rücklauf unten (wechselseitig) [%] | Vorlauf unten / Rücklauf unten (reitend) [%] |
|---------------------|---------------------------------------------------|------------------------------------------------|
| 10 K | 0 | 4 |
| **20 K** | **0** | **12** |
| 30 K | 3 | 18 |
| 50 K | 5 | 25 |

**Gesamtminderungsfaktor:** fm = f1 · f2 · f3 · f4 · f5. **Leistung mit Minderung:** qm = qn · fm.

### 10.4 Heizkörper in erdreichberührten Räumen (B2 S.243)

Witterungsgeführte VL-Regelung deckt Grundwasser-Wärmeverlust in Übergangszeiten nicht → **Heizflächenvergrößerung** erforderlich:
- +25 % bei erdreichberührtem Fußboden
- +50 % bei erdreichberührtem FB und Außenwand

Tool-Empfehlung: Kellerräume automatisch mit +25 % HK-Fläche einplanen.

### 10.5 Abdeckung Heizkörper vor Fenster (Wärmeschutzverordnung, B2 S.243)

- Fenster kAF ≤ 1,5 W/(m²·K) Grenzwert
- Rückseitige Abdeckung k ≤ 0,9 W/(m²·K)

---

## 11. Validierungs-Beispiele (B2 Kap.8 S.243 Worked Example)

### 11.1 Plattenheizkörper Typ 20, 600×800, reitend mit Verkleidung (B2 S.243)

**Gegeben:**
- Q̇H = 1.800 W, H = 600 mm, System PWW 90/70
- Nischenhöhe 800 mm, Bodenfreiheit 160 mm
- Typ 20 (2-reihig), qn = 1.263 W/m (aus B2 Tab.5 S.240)

**Δh = 800 − 600 − 160 = 40 mm → Nischeneinbau!**

| Faktor | Wert | Herleitung |
|--------|------|------------|
| m1 (Nische Δh=40 mm) | 6 % | B2 Bild 2 S.242 |
| f1 | 1 − 6/100 = **0,94** | |
| m2 (Verkleidung) | 4 % | B2 Tab.1 S.242 |
| f2 | **0,96** | |
| m4 (Baulänge, vorläufig 1,43 m) | 1,5 % | B2 Tab.2 S.242 |
| f4 | **0,985** | |
| m5 (reitender Anschluss, 20 K Spreizung) | 12 % | B2 Tab.1 S.243 |
| f5 | **0,88** | |
| **fm = 0,94 · 0,96 · 0,985 · 0,88** | **= 0,782** | |
| qm = 1.263 · 0,782 | **= 987 W/m** | geminderte Leistung |
| **Lmin = 1.800 / 987** | **= 1,83 m** | erforderliche Baulänge |

**Tool-Validierung:** Auslegung eines Heizkörpers in Nische mit Verkleidung und reitendem Anschluss bei 90/70 erfordert **28 % größere Baulänge** als Nennleistung suggeriert. Bei WP-Umbau verstärkt sich dies durch fᵤ-Abfall.

### 11.2 Kombinierte WP-Umstellungsprüfung (Worked Example)

**Bestands-HK: Plattenheizkörper Typ 22, qn = 1.850 W (bei 75/65/20), verbaut in Nische, mit Verkleidung, Baulänge 1.200 mm, wechselseitig:**

Bestandszustand (gedacht: 70/55/20 WP-Betrieb):
- fᵤ bei Δϑü = 42,5 K mit n=1,30 → **0,81** (Tab. 3.2)
- fm = f1(0,94) · f2(0,96) · f4(1,0) · f5(1,0) = **0,902**
- Q̇effektiv = 1.850 · 0,81 · 0,902 = **1.351 W**

Wenn Raum-ΦHL = 1.400 W → **knapp unzureichend** → Maßnahme: Verkleidung entfernen (+4 %) oder VL auf 75 °C halten.

**Merksatz:** fᵤ ist nicht isoliert zu betrachten. Kombination fᵤ · fm entscheidet über WP-Tauglichkeit.

### 11.3 Cross-Check B2/B3/B4 zur fᵤ-Methode

| Aspekt | B2 Kap.8 S.241 | B3 Kap.5 S.53 | B4 S.373 | Fazit |
|--------|----------------|----------------|-----------|-------|
| Formel | Q̇ = Q̇N · (Δϑ/50)ⁿ | identisch | identisch | konsistent |
| Exponent n | 1,33 (im Rasterwert) | 1,30 | 1,30 | B2 leicht höher (+2 %) |
| Minderungsfaktoren | S.242 vollständig | nicht enthalten | S.358 (nur fx) | **B2 ist Primärquelle für fm** |
| Baulängenminderung f4 | S.242 Tab.2 | nicht enthalten | nicht tabelliert | **B2 primär** |

**Tool-Entscheidung:** Für fᵤ → B4 S.373 als Hauptquelle (n=1,30 konservativer). Für fm → B2 Kap.8 S.242 verwenden.
