# Bereich C – Heizlastberechnung (DIN EN 12831)

## 1. Zweck & Anwendung im Tool

Kernbereich: liefert Norm-Heizlast Φ̇HL pro Raum und für das Gesamtgebäude. Basis für WP-Dimensionierung (Bereich I), Heizflächen (E/F) und Volumenstrom (G). **Zwei Modi:**
- **Exakt:** Norm-Heizlast raumweise nach DIN EN 12831
- **Vereinfacht:** flächenbezogene Heizlast Φ' · A bei Sanierung

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| **Φ̇HL = Φ̇T + Φ̇V** | Norm-Heizlast (Raum oder Gebäude) | W | B4 S.327, S.344 |
| Φ̇T = HT · (θint,i − θe) | Transmissionswärmeverlust | W | B4 S.334 |
| Φ̇V = HV · (θint,i − θe) | Lüftungswärmeverlust | W | B4 S.340 |
| HT = Σ(U·A·fRT) + (Uäqu + ΔUWB)·A | Transmissions-Wärmekoeffizient | W/K | B4 S.334, S.344 |
| HV = 0,34 · V̇ · n | Lüftungs-Wärmekoeffizient | W/K | B4 S.340 |
| Φ̇RH = A · fRH | Wiederaufheizleistung | W | B4 S.340, B1 LF07 S.443 |
| **Q̇H = (Φ̇HL + Φ̇RH) · fx** | Auslegungsleistung Heizfläche | W | B4 S.344, B1 LF07 S.435 |
| Φ = A · Φ' | Vereinfacht flächenbezogen | W | B1 LF07 S.443 |

Variable: 0,34 W·h/(m³·K) = spez. Wärmekapazität Luft; fRT = Temperatur-Reduktion bei angrenzendem Raum; fx = Auslegungszuschlag (bis 1,15).

---

## 3. Tabellen & Richtwerte

### 3.1 Flächenbezogene Heizlast Φ' nach Baujahr (B1 LF07 S.443, Tabelle 1)

| Gebäudebaujahr | Gebäudetyp | Φ' [W/m²] |
|----------------|------------|-----------|
| bis 1975 | Ungedämmte Häuser | **130 – 180** |
| 1976 – 1994 | Bestandsbauten | **70 – 100** |
| ab 1995 (WSVO) | Neubauten | **50 – 70** |
| Neubau | Niedrigenergiehäuser | **25 – 40** |
| Neubau | Passivhäuser | **10 – 15** |

**Erweiterte Richtwerte (Konvention DE):**

| Standard | Φ' [W/m²] |
|----------|-----------|
| Altbau unsaniert < 1978 | 150–200 |
| Altbau teilsaniert | 100–150 |
| 1978–1994 | 80–120 |
| 1995–2001 (WSVO '95) | 60–90 |
| EnEV 2002–2008 | 50–70 |
| EnEV 2009 / GEG-saniert | 30–50 |
| KfW-Effizienzhaus 70 | ≤ 35 |
| KfW-Effizienzhaus 55/40 | ≤ 25 |
| Passivhaus | ≤ 10 |

### 3.2 Transmissionsheizlast pro m² Fläche (Bestand, B4 S.345)

Direkt ablesbar aus Baujahr → U-Wert-Klasse:

| U-Wert-Bereich [W/(m²·K)] | Transmission Außenluft [W/m²] | Transmission Erdreich/unbeheizt [W/m²] |
|----------------------------|-------------------------------|------------------------------------------|
| 2,50 – 1,70 | **74** | 44 |
| 1,69 – 1,20 | 51 | 30 |
| 1,19 – 0,70 | 33 | 21 |
| 0,69 – 0,30 | 17 | 10 |
| < 0,29 | 5 | 3 |

### 3.3 Transmissionsheizlast pro m² Fenster (B4 S.346)

| Fenster-U [W/(m²·K)] | Transmission Außenluft [W/m²] |
|-----------------------|-------------------------------|
| 5,50 – 2,50 | **140** |
| 2,49 – 1,70 | 74 |
| 1,69 – 1,20 | 51 |
| 1,19 – 0,70 | 33 |

### 3.4 Lüftungsheizlast pro m² Grundfläche (B4 S.346)

| Luftwechsel n [h⁻¹] | Lüftungsheizlast [W/m²] | Typischer Raum |
|----------------------|--------------------------|----------------|
| 1,00 – 1,70 | 32 | Raucherraum, Außenluftfenster bei Anlage |
| 0,69 – 0,60 | 23 | Normale Nutzung + dichte Fenster |
| **0,59 – 0,40** | **17** | Normale Nutzung, dichte Fenster (Default) |
| 0,39 – 0,10 | 8 | Abluftraum bei Lüftungsanlage |

### 3.5 Wiederaufheizfaktor fRH nach Nutzungsprofil (B4 S.340, S.341)

**Wohnen, Nachtabsenkung 8 h, n = 0,1 h⁻¹:**

| Gebäudemasse | tRH = 0,5 h | 1 h | 2 h | 4 h | 6 h |
|--------------|-------------|-----|-----|-----|-----|
| leicht | 12 | 8 | 5 | 2 | 0 |
| mittelschwer | 14 | 10 | 7 | 4 | 2 |
| schwer | 18 | 14 | 11 | 9 | 7 |

**Büro (8 h Absenkung, n = 0,1 h⁻¹):**
- leicht: 13,5 (0,5 h) → 0 W/m² (6 h)
- schwer: 13,5 (0,5 h) → 8 W/m² (6 h)

*Bei n = 0,5 h⁻¹ sind die Werte höher (aus B1 LF07 S.443: fRH = 21 W/m² für ΔT=2 K, tRH=2 h, mittlere Masse).*

### 3.6 Auslegungszuschlag fx (B1 LF07 S.435)

- Standard: fx = 1,00 (keine Reserve)
- Empfohlen Heizfläche: fx = 1,10 – 1,15
- Bei Sanierung/Unsicherheit: fx = 1,15

### 3.7 Abschirmkoeffizient e (für Infiltration, B4 S.340)

Siehe Bereich A Tabelle 3.5.

### 3.8 Höhenkorrekturfaktor ε (B4 S.340)

Siehe Bereich A Tabelle 3.6. Für EFH (h<10 m) ε=1,0.

---

## 4. Exakt-Modus Workflow (Raum-für-Raum)

### Schritt 1: Raumgeometrie
- Grundfläche A [m²], Höhe h [m]
- Volumen V = A · h
- θint,i aus Bereich A Tabelle 3.1

### Schritt 2: Transmissionsverluste

Für jedes Hüllflächen-Element:
1. Fläche Ak erfassen
2. Uk aus Bereich B (Tab. 3.3–3.7)
3. Reduktionsfaktor fRT bestimmen:
   - an Außenluft: fRT = 1,0
   - an Nachbarraum gleicher Einheit: fRT = (θint,i − θnachbar)/(θint,i − θe)
   - an Erdreich: Uäqu aus Bereich B Tab. 3.8
   - an unbeheizten Raum: bu aus Bereich B Tab. 3.10
4. Wärmebrücken: ΔUWB = 0,05 (mit Bauteilanschluss) oder 0,10 (pauschal)

Summe: HT = Σ(Ak·Uk·fRT) + Σ(Uäqu·A)·bg + Σ(Ak·bu·Uk) + ΔUWB·A_gesamt

### Schritt 3: Lüftungsverluste

V̇inf = 2 · V · n50 · e · ε  (Infiltration)
V̇min = V · nmin  (Hygiene-Luftwechsel nmin=0,5 bei Wohnraum)

V̇ = max(V̇inf, V̇min)
HV = 0,34 · V̇

### Schritt 4: Norm-Heizlast Raum
Φ̇HL,i = (HT + HV) · (θint,i − θe)

### Schritt 5: Wiederaufheizung
Φ̇RH = A · fRH (Tab. 3.5)

### Schritt 6: Gebäude-Heizlast
Φ̇HL,Geb = Σ Φ̇HL,i + Warmwasser-Zuschlag (Bereich D)

### Schritt 7: Auslegungsleistung
Q̇H = (Φ̇HL + Φ̇RH) · fx

---

## 5. Richtwert-Modus Workflow (Sanierung)

### Variante 5A – Flächenbezogen (schnellste Methode)

1. Beheizte Wohnfläche A [m²] eingeben
2. Baujahr + Sanierungsgrad → Φ' aus Tab. 3.1
3. Φ̇HL ≈ A · Φ'
4. + 20 % für Warmwasser-Zuschlag bei WP
5. Fertig → Gebäude-Heizlast

### Variante 5B – Hüllflächen-Richtwerte (B4 S.345-Methode)

1. Baujahr → U-Wert-Klasse aus Bereich B Tab. 3.4
2. Pro Hüllfläche: Fläche · W/m² aus Tab. 3.2 (nach U-Klasse)
3. Fenster: Fläche · W/m² aus Tab. 3.3
4. Lüftung: Grundfläche · 17 W/m² (Default "normale Nutzung, dichte Fenster")
5. Summe = Φ̇HL,i
6. Gebäude: Σ aller Räume

**Beispiel (B4 S.345) – Wohnzimmer Altbau 1920:**
- Grundfläche 20 m², Außenwand 27 m² (74 W/m²) = 1.998 W
- Fenster 2,8 m² (140 W/m²) = 392 W
- Innenwand 20 m² (17 W/m²) = 340 W
- **Summe Φ̇HL,i = 2.730 W**

---

## 6. Plausibilitätsprüfungen

- **Spezifische Heizlast** Φ̇HL,Geb / A muss zum Baujahr passen (Tab. 3.1)
  - z. B. Altbau 1920 unsaniert: 150–200 W/m² realistisch
  - Ausreißer > 250 W/m² → Eingabefehler prüfen
  - Werte < 30 W/m² → nur bei KfW-Sanierung plausibel
- Raum-Heizlast spezifisch: 40–250 W/m² je nach Sanierungsstand
- Wenn Vereinfacht vs. Exakt > 25 % abweichen → eine Methode neu rechnen
- θi − θe muss > 25 K sein
- Lüftungsanteil typisch 15–35 % der Gesamtheizlast
- fx · Φ̇HL,Geb sollte maximal Jahresverbrauch/2100 h entsprechen (grobe Plausibilität)

---

## 7. Normenverweise

- **DIN EN 12831-1:2017-09** Hauptnorm (ersetzt DIN 4701-1 bis 3)
- **DIN/TS 12831-1:2020-04** deutscher nationaler Anhang
- **DIN EN 12831 Beiblatt 1:2017-07** Nutzungsprofile, Wiederaufheizfaktoren
- **DIN EN ISO 13370** (Erdreich-Wärmeverluste, Grundlage Uäqu)
- **DIN EN ISO 6946** (U-Wert), DIN EN ISO 10211 (Wärmebrücken)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| Norm-Heizlast 5-Schritt-Prozess | B4 S.327 |
| Kernformeln Φ̇HL, Φ̇T, Φ̇V | B4 S.334, S.340, S.344 |
| Luftwechsel n50 Kategorien | B4 S.340 |
| Infiltrationsformel V̇inf = 2·V·n50·e·ε | B4 S.340 |
| Abschirmung e, Höhenfaktor ε | B4 S.340 |
| Innentemperatur-Abfall Δθ im Absenkbetrieb | B4 S.340 |
| Wiederaufheizfaktor fRH-Tabelle | B4 S.340/341 |
| Äquivalenter Uäqu Erdreich + B'-Wert | B4 S.342 |
| Reduktionsfaktor fRT/bu Nachbarraum | B4 S.343 |
| Wärmebrückenzuschlag ΔUWB | B4 S.343 |
| Formblatt-Anwendungsbeispiel Raum 4 | B4 S.344 |
| Flächenbezogene Heizlast Tabelle 1 | B1 LF07 S.443 |
| Vereinfachtes Verfahren Φ=A·Φ' | B1 LF07 S.443 |
| Heizkörperzuschlag fx | B1 LF07 S.435 |
| Beispiel Bestand 1920 Wohnzimmer | B4 S.345 |
| DIN EN 12831 Kontext (PC nötig) | B1 LF07 S.433 |
| Norm-Heizlast Einführung + Zeitkonstante | B2 Kap.8 S.228 |
| Auslegungszuschlag fx = 1,15 (DIN 4701 T.3) | B2 Kap.8 S.239 |
| Normaußentemp. Städtetabelle (DIN 4701) | B2 Kap.8 S.239 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 S.51–54)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| Φ̇HL = Φ̇T + Φ̇V | Norm-Heizlast Raum/Gebäude | W |
| Φ̇T = HT · (ϑint,i − ϑe) | Transmissionsanteil | W |
| Φ̇V = HV · (ϑint,i − ϑe) | Lüftungsanteil | W |
| HV = 0,34 · V̇ | Lüftungs-Wärmekoeffizient | W/K |
| V̇inf = 2 · V · n50 · e · ε | Infiltrationsvolumenstrom | m³/h |
| V̇min = V · nmin | Hygieneluftwechsel | m³/h |
| Q̇H = (Φ̇HL + Φ̇RH) · fx | Auslegungsleistung mit Zuschlag | W |

*B3 Kap.5 deckt gesamten DIN-EN-12831-Formelsatz. Identisch zu B4. Tool kann B3 als Plausibilitätsquelle nutzen.*

### 9.1 B2 Kap.8 Ergänzungen (S.228, S.239)

**Zeitkonstante / Außentemperatur-Korrektur (B2 S.228):**
Die Norm-Heizlast wird für Auslegungszwecke auf den tiefsten Tagesmittelwert der Außentemperatur berechnet. Bei leichten Bauten (Zeitkonstante τ ≈ 24 h) wirkt sich ein Kälteeinbruch direkt aus; bei schweren Bauten (τ > 72 h) darf mit θm-gleitend gerechnet werden. → Tool-Hinweis: bei Massivbau Altbau fRH niedriger ansetzen (schwere Masse).

**fx-Zuschlag detailliert (B2 S.239, DIN 4701 T.3):**
- fx = 1,15 bei Unsicherheit Wärmebedarf oder ungenauer Raumdatenerfassung
- fx = 1,00 nur bei vollständig dokumentiertem Bestand mit Messprotokoll
- Tool-Default: fx = 1,10 (bei Sanierung mit Richtwerten)

---

## 10. Validierungs-Beispiele (B5 Kap.8 Formblatt R, S.140)

**Beispiel Etagenwohnung Küche (Projekt 238/5, Blatt 3):**

Eingangsdaten:
- Raum: b = 2,62 m, l = 4,135 m, h = 2,75 m → AR = 10,83 m², VR = 27,1 m³
- ϑint = 20 °C, ϑe = −12 °C, Δϑ = 32 K
- n50 = 4 h⁻¹, e = 0,01, ε = 1,0, nmin = 0,5 h⁻¹

Transmissionsanteile (Auszug, NW-Außenwand):
- AW: A = 10,1 m² (netto), U = 1,29, ΔUWB = 0,05 → Uc = 1,34 W/(m²·K)
- HT,AW = 10,1 · 1,34 = 13,53 W/K
- Fenster: 1,8 m² · 2,65 = 4,77 W/K
- ΣHT (alle Flächen) = **26,72 W/K** → Φ̇T = 26,72 · 32 K = **856 W**

Lüftung:
- V̇therm = 13,55 m³/h (Mindestluftwechsel maßgebend)
- HV = 0,34 · 13,55 = **4,6 W/K** → Φ̇V = 4,6 · 32 = **147 W**

Ergebnis:
- **Φ̇HL = 856 + 147 = 1.003 W = 92,6 W/m² = 37,0 W/m³**
- Φ̇RH = AR · fRH = 10,83 · 22 = 238 W (fRH = 22 W/m²)
- **Q̇H,Auslg = 1.003 + 238 = 1.241 W**

**Tool-Validierung:**
1. Mindest-Luftwechsel dominiert (13,55 m³/h vs. V̇inf 2,17 m³/h).
2. Reduktionsfaktor fRT zu ungeheiztem Nachbarraum: fij = (20−15)/(20−(−12)) = **0,15** bestätigt.
3. Erdreich-Boden: fg2 = 0,50 bestätigt.
4. Mit Wiederaufheizung (fRH = 22 W/m²) ca. +24 % Leistung → realistisch für Wohnraum mittlerer Masse.

### 10.1 Cross-Check B3 vs. B4

| Thema | B3 (Formelsammlung) | B4 (Fachbuch) | Abweichung |
|-------|---------------------|----------------|------------|
| Lüftungsformel | HV = 0,34·V̇ | HV = 0,34·V̇ | keine |
| n50-Kategorien I–IV | nicht tabelliert | S.340 | B3 knapper |
| fRT-Berechnung | aus Formelsatz | mit Tabelle S.343 | identisch |
| fx-Zuschlag | nicht explizit | S.435 (1,10–1,15) | B3 fehlt → B4 + B2 S.239 maßgebend |
