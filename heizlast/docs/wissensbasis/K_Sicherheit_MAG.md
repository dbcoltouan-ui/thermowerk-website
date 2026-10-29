# Bereich K – Sicherheitstechnik, MAG, Druckhaltung

## 1. Zweck & Anwendung im Tool

Sicherheitstechnische Anlagenausrüstung einer geschlossenen Warmwasserheizung nach **DIN EN 12828**: Membranausdehnungsgefäß (MAG), Sicherheitsventil (SV), Thermometer, Manometer, Druckbegrenzer, Temperaturregler/-begrenzer, Füll- und Entleerungseinrichtung, Wassermangelsicherung. Zentrale Aufgabe des Tools: **MAG-Nennvolumen** V_N berechnen auf Basis Anlagen-Wasserinhalt V_A (Bereich G + J), Ausdehnungsvolumen V_e, Vordruck p₀ und Fülldruck p_a. Liefert zusätzlich die Sicherheitsventil-Abblaseleistung passend zur Kesselleistung. Zwei Modi: Exakt (Anlagenberechnung nach B4 S.400/B2 S.272 ff.) oder Richtwert (MAG nach Heizkörperart und Q̇-Tabelle).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| **V_e = (n · V_A) / 100 %** | Ausdehnungsvolumen bei Erwärmung | L | B4 S.400 |
| **V_V = 0,005 · V_A** (wenn V_n > 15 L, min. 3 L) | Wasservorlage | L | B4 S.400 |
| **V_V = 0,02 · V_A** (wenn V_n ≤ 15 L) | Wasservorlage kleine MAG | L | B4 S.400 |
| **V_N,min = (V_e + V_V) · (p_e + 1) / (p_e − p₀)** | Nenn-MAG-Volumen | L | B4 S.400 |
| **p₀ = p_St + p_D** | Vordruck | bar | B4 S.400 |
| p_D = 0 bar bei ϑ_V < 100 °C | Dampfdruck | bar | B4 S.400 |
| **p_a,min = V_N · (p₀ + 1) / (V_N − V_V) − 1** | niedrigster Fülldruck | bar | B4 S.401 |
| **p_a,max = (p_e + 1) / (1 + V_e·(p_e+1)/(V_N·(p₀+1))) − 1** | höchster Fülldruck | bar | B4 S.401 |
| p_a,max − p_a,min > 0,2 bar | Fenster-Bedingung | bar | B4 S.401 |
| V_V,tat = V_N · (1 − (p₀+1)/(p_a+1)) | tatsächliche Wasservorlage | L | B4 S.401 |
| p_e = p_SV − 0,5 bar | Enddruck (Spanne zum SV) | bar | DIN EN 12828 |
| p_St = h_stat / 10 + 0,3 | statischer Druck Faustformel | bar | Konvention |
| V_A = Σ V_Erzeuger + V_HK + V_Rohrnetz + V_Speicher | Anlagenwasserinhalt | L | B4 S.400 |

*Fundamentalgleichung MAG: Bei Erwärmung dehnt sich V_A um V_e aus. Das MAG gibt durch Kompression des Gaspolsters Volumen frei. Isotherm: p·V = const → V_N muss so groß sein, dass Druck zwischen p_a (kalt) und p_e (heiß) bleibt.*

**Rechenbeispiel (B4 S.400 Ablesebeispiel):** Q̇ = 90 kW + Plattenheizkörper → V_A ≈ 800 L → bei Vorlauf 75 °C n = 2,57 % → V_e ≈ 20,6 L.

---

## 3. Tabellen & Richtwerte

### 3.1 Begriffe MAG (B4 S.400)

| Formelzeichen | Bedeutung | Einheit |
|---------------|-----------|---------|
| V_A | Wasserinhalt der Anlage | L |
| V_e | Ausdehnungsvolumen | L |
| n | Ausdehnungsfaktor | % |
| p_St | statischer Druck | bar |
| p_D | Dampfdruck bei ϑ_V > 100 °C | bar |
| p₀ | Vordruck p₀ = p_St + p_D | bar |
| p_a,min / p_a,max | niedrigster / höchster Anfangs-(Füll-)Druck | bar |
| p_e | Enddruck (bei ϑ_V,max) | bar |
| p_SV | Ansprechdruck Sicherheitsventil | bar |
| V_V | Wasservorlage (0,005 · V_A, mind. 3 L) | L |
| V_n | MAG-Volumen errechnet | L |
| V_N | Nennvolumen des MAG | L |

### 3.2 Ausdehnungsfaktor n bei Befülltemperatur 10 °C (B4 S.400)

| ϑ_V,max [°C] | 40 | 45 | 50 | 55 | 60 | 65 | 70 | **75** | 80 | 85 | 90 | 95 |
|---------------|-----|-----|-----|-----|-----|-----|-----|---------|-----|-----|-----|-----|
| **n [%]** | 0,75 | 0,96 | 1,18 | 1,42 | 1,68 | 1,96 | 2,25 | **2,57** | 2,89 | 3,23 | 3,57 | 3,96 |

**WP-Relevanz:** Bei VL 45 °C → n = 0,96 %; bei VL 55 °C → n = 1,42 %; FBH bei VL 35 °C ≈ 0,6 %.

### 3.3 Anlagenwasserinhalt V_A – Richtwert nach Heizflächenart (B4 S.400)

| Heizflächenart | Inhalt [L/kW] |
|------------------|-----------------|
| Konvektoren | 7 |
| Plattenheizkörper | 9 |
| Radiatoren | 15 |
| **Fußbodenheizung** | **20** |

*Faustwert Gesamtsystem (Konvention):* Mischsystem Heizkörper-Bestand 12–18 L/kW; reine FBH 18–25 L/kW; Puffer und TWW-Speicher additiv (aus Bereich J).

### 3.4 MAG-Nennvolumen nach Anlageninhalt und Fülldruck (B4 S.401 Herstellertabelle)

**Beispielablesung bei V_A = 800 L, p_SV = 3,0 bar, Füll­druck p_a,min = 1,3 bar:** benötigtes MAG **V_N = 80 L** (siehe B4 S.401 Tabelle, hervorgehobene Zeile).

| V_A [L] | 200 | 400 | 800 | 1200 | 1600 |
|----------|-----|-----|-----|------|------|
| V_N (bei p_SV 3 bar, p_a 1,3 bar) | 18 | 35 | 80 | 120 | 160 |

### 3.5 MAG-Gesamtinhalte und Abmessungen (B4 S.401 Herstellerangaben)

| V_N [L] | Ø [mm] | Höhe [mm] |
|---------|--------|-----------|
| 8 | 245 | 304 |
| 12 | 286 | 336 |
| 18 | 328 | 328 |
| 25 | 358 | 380 |
| 35 | 396 | 439 |
| 50 | 437 | 495 |
| 80 | 519 | 551 |
| 100 | 484 | 780 |
| 150 | 484 | 1024 |
| 200 | 484 | 1300 |
| 300 | 600 | 1153 |
| 400 | 790 | 1180 |
| 500 | 790 | 1335 |

### 3.6 Sicherheitsventil – Abblaseleistung und Anschlüsse (B4 S.399, DIN EN 12828)

| Abblaseleistung [kW] | 50 | 100 | 200 | 350 | 600 |
|------------------------|----|-----|-----|-----|-----|
| Größe SV (DN) | 15 | 20 | 25 | 32 | 40 |
| Anschlussleitung d₁₀ (R) | ½" | ¾" | 1" | 1¼" | 1½" |
| Ausblaseleitung d₂₀ (R) | ¾" | 1" | 1¼" | 1½" | 2" |

**Abblaseleistung bei 20 % Drucksteigerung (B4 S.399):**
| Ansprechdruck | Größe R 1" – 2" – Auszug |
|----------------|----------------------------|
| 3 bar | 270 / 415 / 660 / 1015 kW |
| 6 bar | 445 / 690 / 1095 / 1600 kW |

### 3.7 Sicherheitstechnische Einrichtungen – Übersicht (B4 S.399, DIN EN 12828)

| Art der Anlage | Direkt beheizt | Indirekt beheizt | Festbrennstoff | Ungeregelter WE |
|-----------------|------------------|--------------------|------------------|-------------------|
| Thermometer, Temperaturregler, Manometer, SV, MAG | X | X | X | X |
| Sicherheits-Temperaturbegrenzer (STB) | X | – | – | – |
| Sicherheits-Temperaturwächter (STW) | – | X | – | – |
| Sicherheits-Druckbegrenzer (> 300 kW), Wassermangelsicherung | X | – | X | – |
| Entspannungstopf (> 300 kW od. v_V > 105 °C) | X | X | X | X |

### 3.8 Geschlossene Anlagen ≤ 300 kW nach DIN EN 12828 (B4 S.398)

**Grenzen:** Q̇_NL ≤ 300 kW; p_e ≤ 3,0 bar; ϑ_V ≤ 105 °C.

**Pflichtausrüstung:**
1. MAG (Membranausdehnungsgefäß)
2. Sicherheitsventil (≤ 300 kW: 3 bar Standard EFH)
3. Temperaturregler
4. Sicherheitstemperaturbegrenzer (STB)
5. Manometer
6. Thermometer
7. Füll- und Entleerungseinrichtung (Kappenventil)
8. Wassermangelsicherung (bei Zwangsumlauf, Q̇ > 50 kW)

### 3.9 Zwangsumlauf-Wärmeerzeuger Grenzen (B4 S.398)

Q̇_NL < 50 kW, ϑ_V < 95 °C, V ≤ 10 L → vereinfachte Ausrüstung.

### 3.10 WP-spezifische Sicherheitseinrichtungen (Konvention / Hersteller)

| Einrichtung | Ansprechwert | Anmerkung |
|---------------|----------------|-------------|
| Sicherheitsventil Heizkreis | **3,0 bar** | Standard EFH |
| Sicherheitsventil Trinkwarmwasser | 10 bar | DIN EN 806 |
| Minimum-Druckwächter (Min-p) | 0,8 – 1,0 bar | schützt WP-Wärmetauscher |
| Frostschutzwächter (Luft-WP Monoblock) | 4 – 5 °C | aktiv Pumpe / Heizstab |
| Hochdruckwächter Kältekreis | R32: ~4,2 MPa | Herstellerfest |
| Niederdruckwächter Kältekreis | R32: ~0,2 MPa | Herstellerfest |
| Wassermangelsicherung | Flow-Switch | schützt Verdampfer |

### 3.11 Statischer Druck / Vordruck – Faustformel

| Gebäudehöhe h [m] | p_St [bar] | p₀ (= p_St + 0,3) [bar] |
|---------------------|-------------|---------------------------|
| 7 (EFH 2-geschossig) | 0,7 | **1,0** |
| 10 (EFH 3-geschossig) | 1,0 | 1,3 |
| 15 (MFH) | 1,5 | 1,8 |
| 22 (Hochhaus) | 2,2 | 2,5 |

**Fülldruck p_a = p₀ + 0,3 bar** (kalt, bei Füllung Heizungsanlage).

### 3.12 Wasserqualität VDI 2035 (Kurzfassung)

| Parameter | Grenzwert |
|------------|------------|
| pH-Wert | 8,2 – 10,0 (Al-WT: 8,5 – 9,0) |
| Gesamthärte bei < 200 L/kW | ≤ 11,2 °dH bei Al-WT; ≤ 16,8 °dH bei Stahl/Kupfer |
| **Leitfähigkeit salzarm (WP-Pflicht Al-WT)** | **< 100 µS/cm** |
| Leitfähigkeit salzhaltig | bis 1500 µS/cm (ohne Al) |
| Sauerstoff | < 0,1 mg/L |
| Füllwasser | vollentsalzt (VE) oder demineralisiert (DEMI) |

### 3.13 MAG-Montage (B4 S.401)

| Variante | Einbauort |
|-----------|------------|
| **Standard** | im Rücklauf vor der Umwälzpumpe |
| **Mit 4-Wege-Mischer** | vor Mischer, Rücklauf; ggf. 2 Gefäße (getrennte Kreise) |
| **Mehrkesselanlage** | gemeinsames MAG mit abgesicherten Einzelkreisen |
| **Zwangsumlauf-WE** | direkt am Kessel, Rücklauf |
| **Mischer + 1 MAG** | mit Drosselbypass vor Mischer |

---

## 4. Exakt-Modus Workflow

### Schritt 1 – Anlageninhalt V_A bestimmen
- Methode A: Summe Einzelvolumen (Erzeuger lt. Hersteller + Rohrnetz Bereich G + Heizkörper Bereich E/F + Puffer/TWW Bereich J + Weiche).
- Methode B (Diagramm B4 S.400): Q̇ × L/kW nach Heizflächenart (Tab. 3.3) → V_A.

### Schritt 2 – Vorlauftemperatur ϑ_V,max → n ermitteln
Aus Tab. 3.2: ϑ_V,max = max. Vorlauftemperatur der WP inkl. Legionellenprogramm. WP-Sanierung meist 55–60 °C → n ≈ 1,42–1,68 %.

### Schritt 3 – Ausdehnungsvolumen V_e
`V_e = n · V_A / 100`. *Beispiel:* V_A = 800 L, n = 2,57 % → V_e = 20,6 L.

### Schritt 4 – Statischen Druck p_St / Vordruck p₀ bestimmen
p_St = h_stat / 10 + 0,3 (bar); bei ϑ_V < 100 °C → p_D = 0; p₀ = p_St.

### Schritt 5 – Enddruck p_e festlegen
p_e = p_SV − 0,5 bar (Sicherheitsabstand). Typisch: p_SV = 3 bar → p_e = 2,5 bar.

### Schritt 6 – Wasservorlage V_V
`V_V = 0,005 · V_A` (mind. 3 L, bei V_n > 15 L). Bei V_n ≤ 15 L: V_V = 0,02 · V_A.

### Schritt 7 – Nennvolumen V_N,min berechnen
`V_N,min = (V_e + V_V) · (p_e + 1) / (p_e − p₀)`

### Schritt 8 – Nennvolumen aus Herstellerreihe wählen
Nächstgrößere Standardgröße (8, 12, 18, 25, 35, 50, 80, 100, 150, 200, 300, 400, 500 L – Tab. 3.5).

### Schritt 9 – Fülldruckbereich prüfen
- p_a,min = V_N · (p₀+1)/(V_N − V_V) − 1
- p_a,max = (p_e+1) / (1 + V_e·(p_e+1)/(V_N·(p₀+1))) − 1
- Bedingung: p_a,max − p_a,min > 0,2 bar → sonst MAG zu klein.

### Schritt 10 – Sicherheitsventil dimensionieren
SV-Abblaseleistung ≥ Wärmeerzeuger-Nennleistung (inkl. E-Heizstab!). Typisch EFH-WP 10 kW + 9 kW E-Stab = 19 kW → DN 15 (R ½") reicht, Ansprechdruck 3,0 bar.

### Schritt 11 – Ergänzende Sicherheitsarmaturen
- STB ≤ 110 °C (direkte Feuerung); bei WP oft im Heizstab integriert.
- Manometer 0–4 bar mit rotem Zeiger auf p_SV.
- Kappenventil als Füll-/Entleerungshahn.
- Entlüfter höchste Punkte + an jedem Heizkörper.

### Schritt 12 – Wasserbeschaffenheit
Füllwasser nach VDI 2035 (salzarm bei Al-WT) → Leitfähigkeit < 100 µS/cm; Härte < 11 °dH; dokumentiertes Füllprotokoll.

### Schritt 13 – Plausibilität
Prüfen Ergebnisse (siehe Abschnitt 6).

---

## 5. Richtwert-Modus Workflow (Sanierung)

1. **V_A schätzen:** Q̇HL · 15 L/kW (Mischsystem); 10 L/kW (Heizkörper); 20 L/kW (FBH).
2. **Puffer + TWW addieren** (Bereich J).
3. **ϑ_V,max:** 55 °C (Standard WP-Sanierung) → n = 1,42 % (Tab. 3.2).
4. **V_N-Schnellwahl:**
   - EFH Q̇HL 5–8 kW, V_A 100–200 L → **18 – 25 L MAG**.
   - EFH Q̇HL 8–12 kW, V_A 200–400 L → **25 – 35 L MAG**.
   - EFH + Puffer 300 L, V_A 500 L → **50 L MAG**.
   - MFH / V_A 800 L → 80 L MAG.
5. **Vordruck p₀:** statische Höhe/10 + 0,3 → typisch 1,0–1,5 bar.
6. **Fülldruck:** p₀ + 0,3 bar (kalt) → typisch 1,3–1,8 bar.
7. **Sicherheitsventil:** 3,0 bar EFH, DN 15 oder 20.
8. **MAG-Vordruck jährlich prüfen** (Serviceposten; sinkt 0,1–0,2 bar/Jahr).
9. **VDI-2035-Füllung:** Grundsätzlich entsalztes Wasser mit Leitfähigkeitsmessung; Protokoll für GEG-Nachweis.

**Standard-Default 150 m² EFH saniert, Q̇HL 8 kW, Luft-WP + Puffer 200 L + TWW 300 L, ϑ_V,max 55 °C, Gebäudehöhe 7 m:**
- V_A ≈ 8 · 15 + 200 + 300 ≈ 620 L
- n = 1,42 % → V_e = 8,8 L
- p₀ = 1,0 bar; p_e = 2,5 bar; p_SV = 3,0 bar
- V_V = 3,1 L (0,005 · 620)
- V_N,min = (8,8 + 3,1) · 3,5 / (2,5 − 1,0) = 27,8 L → **gewählt 35 L MAG**
- Fülldruck 1,3 bar kalt

---

## 6. Plausibilitätsprüfungen

- **V_N < V_N,min** → MAG zu klein, Anlage springt über SV bei Erwärmung.
- **V_N < 8 L bei V_A > 100 L** → physikalisch unterdimensioniert, Druckspitzen.
- **p_a,max − p_a,min < 0,2 bar** (B4 S.401) → MAG unterdimensioniert (kein Druckfenster).
- **p₀ falsch eingestellt (zu niedrig)** → Unterdruck im obersten Heizkörper, Luftzieher.
- **p₀ > p_a** → MAG nimmt kein Wasser auf, Manometer bleibt bei 0 bar.
- **p_e ≥ p_SV** → Sicherheitsventil springt im Normalbetrieb.
- **p_SV > 3 bar EFH** → Unnötig hoch, Dichtungen/Armaturen belastet.
- **Sicherheitsventil-Abblaseleistung < Wärmeerzeuger + Heizstab** → Normverstoß DIN EN 12828.
- **Kein STB bei Direktfeuerung** → rechtliche Pflichtverletzung.
- **Wassermangelsicherung fehlt bei Q̇ > 50 kW / Zwangsumlauf** → Pflichtverletzung.
- **Leitfähigkeit > 100 µS/cm bei Al-WT** → Korrosion, Garantieverlust WP-Hersteller.
- **Kein Schrader-Ventil / kein Prüfanschluss** am MAG → Vordruck nicht prüfbar.
- **MAG im Vorlauf statt Rücklauf** → Membrane thermisch überbelastet.
- **Offene statt geschlossene Anlage ohne Prüfung** → Sauerstoffeintrag, Korrosion.
- **Entspannungstopf fehlt bei ϑ_V > 105 °C oder > 300 kW** → DIN EN 12828 Verstoß.
- **Sanierung: MAG-Größe nicht neu berechnet obwohl Puffer dazugebaut** → V_A hat sich vergrößert (Bereich J) → V_N meist zu klein!

---

## 7. Normenverweise

- **DIN EN 12828** (Heizungssysteme in Gebäuden – Planung, Sicherheitsausrüstung; ersetzt DIN 4751-1/-2)
- **DIN EN 12953** (Großwasserraumkessel > 300 kW)
- **DIN EN 1717** (Schutz des Trinkwassers vor Rückfluss – Anschluss Füllarmatur)
- **DIN EN ISO 4126** (Sicherheitsventile)
- **VDI 2035 Bl. 1–3** (Wasserbeschaffenheit; Steinbildung, wasserseitige Korrosion)
- **DIN EN 378** (Kälteanlagen-Sicherheit – Kältemittelkreis WP)
- **GEG §§ 60 ff.** (Betreiberpflichten, jährliche Prüfung)
- **DIN 4807** (Ausdehnungsgefäße, Bauart, Prüfung; ersetzt durch DIN EN 13831)
- **DIN EN 13831** (geschlossene MAG für Heizungen)
- **DGUV Information 203-006** (Kesselbetrieb, Sicherheitsausrüstung)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| DIN EN 12828 Pflichtausstattung, geschlossene Anlagen ≤ 300 kW (p_e ≤ 3 bar, ϑ_V ≤ 105 °C), Zwangsumlauf < 50 kW / < 95 °C / V ≤ 10 L | B4 S.398 |
| Sicherheitsventile, Abblaseleistung (50–600 kW), DN-Größen, Anschlussleitungen, Entspannungstopf, Abblaseleistung 20 % Drucksteigerung | B4 S.399 |
| MAG Begriffe (V_A, V_e, n, p_St, p_D, p₀, p_a, p_e, p_SV, V_V, V_N), Anlageninhalt V_A nach Heizflächenart (Konvektoren 7, Plattenhk 9, Radiator 15, FBH 20 L/kW), Formel V_e = n·V_A/100 %, Formel V_N,min = (V_e+V_V)·(p_e+1)/(p_e−p₀) | B4 S.400 |
| Ausdehnungsfaktor n Tabelle 40–95 °C (n-Werte), Ablesebeispiel 90 kW/Plattenheizkörper → V_A = 800 L | B4 S.400 |
| MAG-Inhalte/Abmessungen Herstellerreihe 8–500 L; Gefäßgröße V_N nach Anlageninhalt und Fülldruck; p_a,min/p_a,max-Formeln; p_a,max − p_a,min > 0,2 bar; V_V,tat-Formel; Montagebeispiele (Standard RL, Mischer, Mehrkessel, Zwangsumlauf) | B4 S.401 |
| Heizungsarmaturen (Schrägsitz-/Freistrom-/Eck-/Dreiwege-/Rückschlag-/Überströmventile); Heizkörperverschraubungen als Absperrarmatur; Rückschlagventil nach Pumpe zur Schwerkraftzirkulations-Vermeidung; 4-Wege-Mischer Funktion | B1 LF07 S.411–413 |
| VDI 2035 Wasserqualität (Bereich I-Verweis) – Einsatz im Tool als Plausibilitätscheck | VDI 2035 |
| ⭐ MAG-Auslegung Rechenverfahren, Vordruck/Fülldruck, V_N-Formel, Beispielrechnung | **B2 Kap.8 S.272–275** |
| MAG-/Sicherheits-Formeln Quick-Ref (V_e, V_N, p₀, p_e) | B3 Kap.5 S.63 |
| MAG-Beispielrechnung (Anlagenvolumen → V_N, Fülldruck-Fenster) | **B5 Kap.8 S.161** |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 S.63)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| **V_e = n · V_A / 100** | Ausdehnungsvolumen | L |
| V_V = 0,005 · V_A (V_n > 15 L) | Wasservorlage | L |
| **V_N,min = (V_e + V_V) · (p_e + 1) / (p_e − p₀)** | MAG-Nennvolumen | L |
| p₀ = p_St + p_D | Vordruck Gasseite MAG | bar |
| p_St = h_stat / 10 + 0,3 | statischer Druck Faustformel | bar |
| p_e = p_SV − 0,5 | Enddruck max. Betrieb | bar |
| p_a,min = V_N · (p₀+1)/(V_N − V_V) − 1 | min. Fülldruck | bar |
| p_a,max = (p_e+1)/(1 + V_e·(p_e+1)/(V_N·(p₀+1))) − 1 | max. Fülldruck | bar |

*B3 Kap.5 S.63 listet das vollständige MAG-Formelsystem kompakt. Identisch zu B4 S.400/401 und B2 Kap.8 S.272–275. Tool nutzt B3 als Plausi-Kurzreferenz.*

**Merksatz:** Fensterbedingung **p_a,max − p_a,min > 0,2 bar** prüfen – sonst MAG zu klein oder p_SV zu niedrig.

---

## 10. B2 Kap.8 Detailergänzungen – MAG-Auslegung (S.272–275)

### 10.1 Vollständiges Berechnungsverfahren (B2 S.272)

B2 Kap.8 S.272–275 dokumentiert das DIN-EN-12828-konforme MAG-Dimensionierungsverfahren **Schritt für Schritt**:

1. **V_A ermitteln** – Summe Einzelvolumen oder L/kW-Richtwert (Tab. 3.3).
2. **n aus ϑ_V,max** (Tab. 3.2).
3. **V_e = n·V_A/100**.
4. **p_St / p₀** aus statischer Höhe + 0,3 bar Sicherheitszuschlag; bei ϑ < 100 °C ist p_D = 0.
5. **p_SV / p_e** festlegen (p_e = p_SV − 0,5 bar).
6. **V_V** nach Regel (0,005·V_A oder 0,02·V_A).
7. **V_N,min** = (V_e + V_V) · (p_e + 1) / (p_e − p₀).
8. **V_N wählen** aus Herstellerreihe, nächstgrößere Standardgröße.
9. **p_a,min und p_a,max** prüfen → Fenster > 0,2 bar.

### 10.2 Worked Example (B2 S.273–274)

**Gegeben:**
- Q̇ = 20 kW, Plattenheizkörper-System, statische Höhe 7 m
- ϑ_V,max = 75 °C, p_SV = 3,0 bar, Heizflächen-Anteil 60 % Platte + 40 % FBH

Lösung:
- V_A: 20 kW · (0,6 · 9 + 0,4 · 20) = 20 · (5,4 + 8,0) = 20 · 13,4 = **268 L**
- n = 2,57 % → V_e = 268 · 2,57/100 = **6,89 L**
- p_St = 7/10 + 0,3 = 1,0 bar; p_D = 0 (VL < 100 °C) → p₀ = 1,0 bar
- p_e = 3,0 − 0,5 = 2,5 bar
- V_V = 0,005 · 268 = 1,34 L → mindestens 3 L → V_V = 3 L
- V_N,min = (6,89 + 3) · (2,5 + 1) / (2,5 − 1,0) = 9,89 · 3,5/1,5 = **23,1 L**
- Gewählt: **25 L MAG** (nächste Herstellergröße).

**Fensterprüfung:**
- p_a,min = 25 · (1+1)/(25 − 3) − 1 = 25·2/22 − 1 = 2,27 − 1 = **1,27 bar**
- p_a,max = (2,5+1)/(1 + 6,89·(2,5+1)/(25·(1+1))) − 1 = 3,5/(1+0,482) − 1 = 3,5/1,482 − 1 = 2,36 − 1 = **1,36 bar**
- Differenz = 0,09 bar → **zu klein!** → MAG **35 L** wählen:
  - p_a,min = 35·2/(35−3) − 1 = 70/32 − 1 = **1,19 bar**
  - p_a,max = 3,5/(1 + 6,89·3,5/(35·2)) − 1 = 3,5/1,344 − 1 = **1,60 bar**
  - Differenz = **0,41 bar > 0,2** ✓

→ Endgültige Wahl: **V_N = 35 L**, Fülldruck kalt **1,3 bar**.

### 10.3 Wichtige Lehren aus B2 S.275

- **Bei Puffer/TWW-Einbindung** V_A neu rechnen, sonst MAG zu klein.
- **Maximalhöhen**: bei statischer Höhe > 15 m wird Vordruck > 1,5 bar → p_SV muss evtl. 4 bar oder p_e = 2,5 bar eng → größere Gefäße.
- **Kaltanlage füllen → Nachfüllen nur bei kaltem System**, Druckmessung am Manometer ablesen.
- **MAG-Vordruck jährlich prüfen**: Schrader-Ventil, drucklose Anlage, Vordruck gegen p_St angleichen (± 0,1 bar).

---

## 11. Validierungs-Beispiele (B5 Kap.8 S.161)

### 11.1 ⭐ MAG-Auslegung Worked Example (B5 S.161)

**Sanierung EFH 150 m², Q̇HL = 8 kW, Luft-WP, Puffer 200 L, TWW 300 L im indirekten Heizkreis, ϑ_V,max = 55 °C, Gebäudehöhe 7 m:**

**Schritt 1 – V_A:**
- Heizkörper-Bestand (Mischsystem): 8 · 15 = 120 L
- Pufferspeicher Reihenpuffer im RL: 200 L (Heizwasser)
- TWW-Speicher 300 L (Trinkwasser – **separat, nicht in V_A der Heizseite!**)
- V_A = **120 + 200 = 320 L** (nur Heizwasser-Volumen zählt)

**Hinweis B5 / B4 S.400:** TWW-Trinkwasser wird separat abgesichert (Trinkwasser-Ausdehnungsgefäß + SV 10 bar, DIN EN 806). Nur die Heizwasser-Volumen gehen in V_A der Heizungs-MAG ein. **Häufiger Planungsfehler!**

**Schritt 2 – n:**
- ϑ_V,max = 55 °C → Tab. 3.2 → **n = 1,42 %**
- V_e = 320 · 1,42/100 = **4,54 L**

**Schritt 3 – Drücke:**
- p_St = 7/10 + 0,3 = **1,0 bar** → p₀ = 1,0 bar
- p_SV = 3,0 bar → p_e = 2,5 bar

**Schritt 4 – V_V:**
- V_V = 0,005 · 320 = 1,6 L → Mindestwert 3 L → **V_V = 3 L**

**Schritt 5 – V_N,min:**
- V_N,min = (4,54 + 3) · (2,5 + 1) / (2,5 − 1) = 7,54 · 3,5/1,5 = **17,6 L**

**Schritt 6 – V_N gewählt: 18 L** (nächstgrößere Herstellergröße).

**Schritt 7 – Fensterprüfung:**
- p_a,min = 18·2/(18−3) − 1 = 36/15 − 1 = **1,40 bar**
- p_a,max = 3,5/(1 + 4,54·3,5/(18·2)) − 1 = 3,5/1,441 − 1 = **1,43 bar**
- Differenz = **0,03 bar** → **zu klein!** → **25 L MAG** wählen:
  - p_a,min = 25·2/(25−3) − 1 = **1,27 bar**
  - p_a,max = 3,5/(1 + 4,54·3,5/(25·2)) − 1 = 3,5/1,318 − 1 = **1,66 bar**
  - Differenz = **0,39 bar > 0,2** ✓

**Endgültige Wahl:** V_N = **25 L**, Fülldruck kalt **1,3 bar**, p_SV = 3 bar.

**Tool-Validierung:**
1. Ergebnis größer als rein nach V_N,min (wegen Fensterbedingung) – typischer Fall bei WP-Sanierung mit niedrigem n.
2. Hohes p_SV-Kompensation wäre nicht möglich (WP-Hersteller erlauben meist max. 3 bar).
3. **Tool-Logik: Immer beide Kriterien prüfen – rechnerisches Minimum UND Fensterbedingung!**

### 11.2 Cross-Check B2 / B3 / B4 zur MAG-Methode

| Aspekt | B2 Kap.8 S.272–275 | B3 Kap.5 S.63 | B4 S.400/401 | Fazit |
|--------|---------------------|----------------|---------------|-------|
| Kernformel V_N,min | identisch | identisch | identisch | konsistent |
| Ausdehnungsfaktor n-Tabelle | S.273 | S.63 Ausschnitt | S.400 Vollraster | **B4 Primärquelle n-Tabelle** |
| Fensterbedingung Δ > 0,2 bar | S.274 explizit | nicht explizit | S.401 explizit | **B2/B4 gleichwertig** |
| Worked Example 90-kW-Anlage | S.273 | nicht enthalten | S.400 Ablesebeispiel | konsistent |
| Wasservorlage-Regeln | S.273 | S.63 | S.400 | konsistent |
| Herstellerreihe 8–500 L | nicht tabelliert | nicht enthalten | S.401 vollständig | **B4 Primärquelle** |
| Trinkwasser-MAG separat | explizit S.275 | nicht erwähnt | B4 Sicherheitsarmaturen TWW | **B2 Primärquelle für Planungshinweis** |
