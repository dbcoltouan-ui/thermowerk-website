# Bereich B – Gebäudehülle / U-Werte

## 1. Zweck & Anwendung im Tool

Ermittlung der U-Werte aller Hüllflächen (Außenwand, Dach, Kellerdecke, Boden, Fenster, Türen). Liefert Eingangswerte für Transmissionsheizlast in Bereich C. **Sanierungs-Kernseite: B4 S.345 – Bestands-U-Werte nach Baujahr.** Zwei Eingabemodi: Schichtaufbau (exakt) oder Baujahr-Klasse (Richtwert).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| U = 1 / RT | Wärmedurchgangskoeffizient | W/(m²·K) | B4 S.329, B1 LF07 S.430 |
| RT = Rsi + ΣRi + Rse | Gesamtwärmedurchlasswiderstand | m²·K/W | B4 S.329 |
| Ri = di / λi | Schicht-Wärmedurchlasswiderstand | m²·K/W | B4 S.329 |
| HT = U·A·fRT + Ueq + ΔUWB | Transmissionswärmekoeffizient | W/K | B4 S.334, S.344 |
| ΔUWB Wärmebrückenzuschlag pauschal | Zuschlag | W/(m²·K) | B4 S.343 |

---

## 3. Tabellen & Richtwerte

### 3.1 Wärmeübergangswiderstände Rsi, Rse (DIN EN ISO 6946)

| Wärmestromrichtung | Rsi [m²·K/W] | Rse [m²·K/W] |
|---------------------|--------------|--------------|
| aufwärts (Decken) | 0,10 | 0,04 |
| horizontal (Wände) | 0,13 | 0,04 |
| abwärts (Fußböden) | 0,17 | 0,04 |

*Quelle: B4 S.329, B1 LF07 S.430.*

### 3.2 Wärmedurchlasswiderstand R ruhender Luftschichten

| Schichtdicke [mm] | aufwärts | horizontal | abwärts |
|--------------------|----------|------------|---------|
| 5 | 0,11 | 0,11 | 0,11 |
| 7 | 0,13 | 0,13 | 0,13 |
| 10 | 0,15 | 0,15 | 0,15 |
| 15 | 0,16 | 0,17 | 0,17 |
| 25 | 0,16 | 0,18 | 0,19 |
| 50 | 0,16 | 0,18 | 0,21 |
| 100 | 0,16 | 0,18 | 0,22 |
| 300 | 0,16 | 0,18 | 0,23 |

*Quelle: B4 S.329.*

### 3.3 Wärmeleitfähigkeit λ Baustoffe/Dämmstoffe [W/(m·K)]

| Material | λ |
|----------|---|
| Kalk-/Kalkzementmörtel | 0,87 – 1,40 |
| Zementestrich/-putz | 0,70 – 1,40 |
| Gipsputz | 0,35 |
| Gipskartonplatte (900 kg/m³) | 0,21 |
| Normalbeton | 2,10 |
| Leichtbeton (800 kg/m³) | 0,39 |
| Leichtbeton (1400 kg/m³) | 0,79 |
| Leichtbeton (2000 kg/m³) | 1,60 |
| Porenbeton (600/500 kg/m³) | 0,24 / 0,16 |
| Vollziegel (2000 kg/m³) | 0,96 |
| Vollziegel/Lochziegel (1800) | 0,81 |
| Lochziegel (1200) | 0,50 |
| Kalksandstein | 0,79 |
| Gasbetonblockstein | 0,27 |
| Marmor | 3,50 |
| Fichte/Kiefer/Tanne | 0,13 |
| Buche/Eiche | 0,20 |
| Sperrholz (700) | 0,17 |
| Holzfaserplatte (400) | 0,07 |
| Mineralische Faserdämmstoffe (MW 035) | 0,035 |
| Polystyrol-Hartschaum (EPS 030) | 0,030 |
| Polyurethan-Hartschaum (PUR 020) | 0,020 |
| Korkdämmstoffe | 0,055 |
| Stahl unlegiert | 14 |
| Stahl legiert | 48 – 58 |
| Kupfer | 380 |
| Luft (ruhig) | 0,026 |

*Quellen: B4 S.65, S.330, B1 LF07 S.431.*

### 3.4 ⭐ BESTANDS-U-WERTE NACH BAUJAHR (B4 S.345)

**Kern-Fallback für Sanierung. Bei unbekanntem Schichtaufbau diese Werte verwenden.**

#### Außenwand (Außenluft)

| Baujahr | U [W/(m²·K)] | Typische Konstruktion |
|---------|--------------|------------------------|
| < 1948 | **2,50 – 1,70** | Vollziegel bis 38 cm, Fachwerkwand |
| 1949 – 1977 | **1,69 – 1,20** | Vollziegel 38–51 cm, Gitterziegel 24 cm |
| 1978 – 1994 | **1,19 – 0,70** | Bimshohlsteine, Gitterziegel 36 cm, mit Dämmung |
| > 1995 | **< 0,29** | Konstruktion mit Dämmschichten (Niedrigenergiehaus) |

#### Dachfläche (Außenluft)

| Baujahr | U [W/(m²·K)] | Typische Konstruktion |
|---------|--------------|------------------------|
| < 1948 | 2,50 – 1,70 | Stahlbetondecke mit Putz + Ziegel |
| 1949 – 1958 | 1,69 – 1,20 | Stahlbetonflachdach, Bimssteine |
| 1959 – 1977 | 1,19 – 0,70 | Holzbalkendecke, Heraklit-Platten |
| > 1984 | < 0,29 | Stahlbeton mit Schaumglas + Kies / Dämmschicht |

#### Kellerdecke / gegen Erdreich/unbeheizt

| Baujahr | U [W/(m²·K)] | Typische Konstruktion |
|---------|--------------|------------------------|
| < 1918 | 2,50 – 1,70 | Feldsteine, Stahlbeton, Stahlplatten mit Guss |
| 1919 – 1977 | 1,69 – 1,20 | Gewölbe mit Dielen, Holzbalkendecke Schlackenschüttung |
| > 1978 | < 0,29 | Konstruktion mit Dämmschichten |

#### Transmissionsheizlast pro m² Fläche (B4 S.345)

| Außenluft [W/m²] | Erdreich/unbeheizt [W/m²] | U-Wert-Spanne [W/(m²·K)] |
|-------------------|----------------------------|----------------------------|
| **74** | 44 | 2,50 – 1,70 |
| 51 | 30 | 1,69 – 1,20 |
| 33 | 21 | 1,19 – 0,70 |
| 17 | 10 | 0,69 – 0,30 |
| 5 | 3 | < 0,29 |

*Gilt für Δθ ≈ 34 K (θi=20, θe=−14).*

### 3.5 Fenster-Uw nach Baujahr und Glastyp (B4 S.332, S.346)

| Baujahr / Typ | Uw [W/(m²·K)] |
|----------------|----------------|
| Einfachverglasung (< 1977) | 5,20 – 5,70 |
| Zweischeibenisolierglas 8–10 mm Luft | 2,6 – 2,8 |
| Zweischeibenisolierglas 10–16 mm | 2,5 – 2,6 |
| Doppelverglasung 20–100 mm Scheibenabstand | 2,5 |
| Doppel-Wärmeschutzglas (1978–1994) | 2,4 – 1,7 |
| Dreischeiben-Isolierverglasung | 0,8 – 1,4 |
| Wärmeschutzglas (> 1994) | 1,19 – 0,70 |
| Lichtkuppel zweischalig | 3,5 |
| Lichtkuppel dreischalig | 2,5 |

### 3.6 Türen (B1 LF07 S.431)

| Typ | U [W/(m²·K)] |
|-----|---------------|
| Außentür Holz/Kunststoff | 3,5 |
| Außentür Metall, wärmegedämmt | 4,0 |
| Außentür Metall, ungedämmt | 5,5 |
| Innentür | 2,0 |

### 3.7 GEG-Umax bei Sanierung (GEG 2024-01, B4 S.357)

| Bauteil | Wohngebäude θint ≥ 19 °C | Nichtwohn 12–19 °C |
|---------|----------------------------|----------------------|
| Außenwand, Dach, oberste Geschossdecke | 0,24 | 0,35 |
| Fenster, Fenstertüren (normal / Sonderverglasung) | 1,30 / 2,00 | 1,90 / 2,80 |
| Dachflächenfenster | 1,40 / 2,00 | 1,90 / 2,80 |
| Verglasungen | 1,10 / 1,60 | keine |
| Vorhangfassaden | 1,50 / 2,30 | 1,90 / 3,00 |
| Dachflächen m. Abdichtung/Glasdach | 0,20 / 2,00 | 0,35 / 2,70 |
| Wände gegen Erdreich/unbeheizt | 0,30 | keine |
| Fußbodenaufbau | 0,50 | keine |
| Decken nach unten gegen Außenluft | 0,24 | 0,35 |

### 3.8 Äquivalenter Wärmedurchgangskoeffizient Uäqu (Erdreich, B4 S.342)

Bodenplatte (z = 0 m, ohne Dämmung):

| B' [m] | Keine Dämmung | Dämmung 0,5 cm | 1 cm | 2 cm |
|--------|---------------|------------------|-------|-------|
| 2 | 1,30 | 0,33 | 0,55 | 0,77 |
| 4 | 0,88 | 0,30 | 0,45 | 0,59 |
| 6 | 0,68 | 0,27 | 0,38 | 0,48 |
| 8 | 0,55 | 0,25 | 0,33 | 0,41 |
| 10 | 0,47 | 0,23 | 0,30 | 0,36 |

**B'-Wert:** B' = Ag / (0,5·P) mit Ag = Bodenfläche, P = Umfang.

### 3.9 Wärmebrücken-Zuschlag ΔUWB (B4 S.343)

| Nachweisart | ΔUWB [W/(m²·K)] |
|-------------|------------------|
| Ohne bauseitige Berücksichtigung | 0,10 |
| Mit Bauteilanschlüssen nach DIN 4108 Beibl.2 | 0,05 |
| Detaillierter Nachweis (DIN EN ISO 10211) | individuell |

### 3.10 Temperatur-Reduktionsfaktor bu (unbeheizte Nachbarräume, B4 S.343)

| Situation | bu |
|-----------|-----|
| Nachbarraum mit 1 Außenwand (ohne Fenster) | 0,4 |
| Nachbarraum mit Außenwand + Fenster/Tür | 0,5 – 0,6 |
| Innenliegendes Treppenhaus | 0,8 |
| Geschlossener Dachraum | 0,4 – 0,5 |
| Kellerräume (Hausgröße > 20 m) | 0,25 – 0,38 |

---

## 4. Exakt-Modus Workflow

1. Bauteil definieren (Typ, Orientierung)
2. Schichten erfassen: Dicke [m] + Material → λ aus Tabelle 3.3
3. Ri berechnen: Ri = di / λi
4. Rsi/Rse aus Tabelle 3.1 (nach Orientierung)
5. RT = Rsi + ΣRi + Rse
6. U = 1/RT
7. Wärmebrücken: ΔUWB aus Tabelle 3.9
8. Plausibilität gegen GEG (Tabelle 3.7)

## 5. Richtwert-Modus Workflow (Sanierung)

1. Baujahr + Gebäudetyp eingeben
2. Auto-Zuordnung zu Baujahr-Klasse (Tabelle 3.4)
3. Für jede Hüllfläche Default-U aus Tabelle 3.4 (Mitte der Spanne)
4. Bei sichtbaren Fenstern Glastyp wählen → Uw aus Tabelle 3.5
5. Wärmebrücken pauschal ΔUWB=0,10
6. Optional: "Bereich teilsaniert" → nächstjüngere Baujahr-Klasse anwenden

**Default-Werte Sanierung (Mittelwert der Spanne):**

| Baujahr-Klasse | AW | Dach | Kellerdecke | Fenster |
|----------------|-----|------|--------------|---------|
| < 1948 | 2,10 | 2,10 | 2,10 | 5,5 |
| 1949 – 1977 | 1,45 | 1,45 | 1,45 | 2,7 |
| 1978 – 1994 | 0,95 | 0,65 | 0,65 | 2,0 |
| 1995 – 2001 | 0,45 | 0,30 | 0,45 | 1,6 |
| 2002 – 2008 | 0,30 | 0,22 | 0,35 | 1,5 |
| ab 2009 GEG | 0,24 | 0,20 | 0,30 | 1,3 |

---

## 6. Plausibilitätsprüfungen

- U > 3,0 W/(m²·K) → Warnung: extremer Altbau/Wärmebrücke (prüfen)
- U < 0,10 W/(m²·K) → unrealistisch niedrig (Schichtaufbau prüfen)
- U > GEG-Umax (Tab. 3.7) → Hinweis: bei Sanierung wäre GEG-Nachweis Pflicht
- ΔUWB fehlt → mind. 0,05 ansetzen
- Fenster-Uw > Wand-U → Check ob Einfachverglasung realistisch

---

## 7. Normenverweise

- **DIN EN ISO 6946:2018** (U-Wert-Berechnung)
- **DIN 4108-4:2020-11** (Wärmeleitfähigkeiten)
- **DIN EN ISO 10456** (λ-Werte)
- **DIN EN ISO 10211** (Wärmebrücken-Detailnachweis)
- **GEG 2024** (Umax-Werte bei Sanierung)
- **DIN 4108 Beiblatt 2** (Wärmebrückenzuschlag 0,05)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| U = 1/RT, RT = Rsi+ΣR+Rse | B4 S.329; B1 LF07 S.430 |
| Rsi/Rse nach Orientierung | B4 S.329; B1 LF07 S.430 |
| R ruhender Luftschichten | B4 S.329 |
| λ-Tabellen Baustoffe | B4 S.65, S.330, S.331, B1 LF07 S.431 |
| Fenster-Uw Standardtabelle | B4 S.332 |
| Fenster-Uw Bestand nach Baujahr | B4 S.346 |
| Türen-U | B1 LF07 S.431 |
| ⭐ Bestands-U-Werte Baujahr-Klassen | **B4 S.345** |
| Transmissionsheizlast pro m² | B4 S.345, S.346 |
| GEG Umax Sanierung | B4 S.357 |
| Äquivalenter U Erdreich + B' | B4 S.342 |
| Wärmebrücken-Zuschlag ΔUWB | B4 S.343 |
| Reduktionsfaktor bu Nachbarraum | B4 S.343 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 S.51–53)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| U = 1 / RT | Wärmedurchgangskoeffizient | W/(m²·K) |
| RT = Rsi + ΣR + Rse | Wärmedurchgangswiderstand (Schichtaufbau) | m²·K/W |
| R = d / λ | Einzelschicht-Widerstand | m²·K/W |
| Φ̇T = HT · (ϑint − ϑe) | Transmissionsverlust | W |
| HT = Σ(U·A·fRT) | Transmissions-Wärmekoeffizient | W/K |

*B3 bestätigt B4-Formelsatz; keine zusätzlichen Tabellen in B3 Kap.5 für U-Werte. Baujahrtabelle weiterhin aus B4 S.345 als Hauptquelle.*

---

## 10. Validierungs-Beispiele (B4 S.345 + Tool-Workflow)

**Altbau 1920 Wohnzimmer (nachgerechnet für Tool-Kalibrierung):**

| Bauteil | Fläche [m²] | U-Wert aus Baujahrtabelle | U·A [W/K] |
|---------|-------------|----------------------------|-----------|
| Außenwand (massiv, ungedämmt) | 27 | 1,70 | 45,9 |
| Fenster (Einfach-/Kastenfenster) | 2,8 | 4,00 – 5,50 | 11,2 – 15,4 |
| Innenwand (zu unbeheiztem Nachbarraum) | 20 | 1,40 | 28,0 (×fRT) |
| **ΣHT (ohne Wärmebrücken)** | | | **≈ 85 – 89 W/K** |

Bei (ϑint − ϑe) = 32 K → Φ̇T ≈ 2.700 – 2.850 W
Summe mit Lüftung ≈ 2.730 W (vgl. Bereich C Tab.-Beispiel).

**Cross-Check B3 vs B4:** Formel U = 1/RT identisch; Rsi-Werte (0,13 innen Wand, 0,17 innen Dach, 0,04 außen) in beiden Quellen gleich → keine Abweichung, Tool-Defaults konsistent.
