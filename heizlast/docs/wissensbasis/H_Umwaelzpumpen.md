# Bereich H – Umwälzpumpen

## 1. Zweck & Anwendung im Tool

Auslegung und Regelungswahl der Heizungs-Umwälzpumpe. Bestimmt Förderstrom V̇, Förderhöhe H / Differenzdruck Δp, Hocheffizienz-Modell, Regelungsart (Δp-c, Δp-v, Δp-T). Nutzt ṁ_ges und Δpges aus Bereich G, stimmt gegen Heizkreis-Druckverlust aus Bereich E/F ab. Liefert Vorgabe für WP-interne Pumpe vs. Sekundärpumpe. Zwei Modi: Exakt (Kennlinien-Methode) oder Richtwert (Hocheffizienzpumpe Klasse A, EEI ≤ 0,23, Standardtyp nach Q̇H).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| **V̇ = Q̇H / (c · Δϑ · ρ)** | Förderstrom aus Heizleistung | m³/h | B1 LF07 S.396, B4 S.396 |
| **Δp_Pumpe ≥ Δp_Rohrnetz + Δp_Erzeuger + Δp_Abgleich** | Pumpen-Förderdruck | Pa / mbar | B1 LF07 S.396 |
| H = Δp / (ρ·g) | Förderhöhe (1 mbar ≈ 10,2 mm WS) | m WS | B1 LF07 S.396 |
| P_hydr = V̇ · Δp | hydraulische Leistung | W | B4 S.395 |
| P_el = P_hydr / η_ges | elektrische Leistungsaufnahme | W | B4 S.395 |
| **V̇₂/V̇₁ = n₂/n₁** | Proportionalgesetz 1 (Volumenstrom) | – | B4 S.395 |
| **Δp₂/Δp₁ = (n₂/n₁)²** | Proportionalgesetz 2 (Druck) | – | B4 S.395 |
| **P₂/P₁ = (n₂/n₁)³** | Proportionalgesetz 3 (Leistung) | – | B4 S.395 |
| EEI = P_el_gewichtet / P_ref | Energieeffizienz-Index (ErP) | – | ErP / ÖkoDesign |

*Merksatz (B1 LF07 S.396): Halbierung V̇ → Viertelung Δp → Achtelung P_el bei quadratischer Rohrkennlinie.*

---

## 3. Tabellen & Richtwerte

### 3.1 Pumpen-Arten (B1 LF07 S.394)

| Typ | Funktion | Einsatz Heizung |
|-----|----------|------------------|
| **Kreisel-Nassläufer** | Rotor im Fördermedium, wartungsarm | **Standard Wohnheizung ≤ 30 m³/h** |
| Kreisel-Trockenläufer | Motor außen, große Leistungen | > 50 kW, MFH, Industrie |
| Axialpumpe | hoher V̇, wenig Δp | nicht Heizung |
| Strahlpumpe | ohne Antrieb | Fernwärme-Übergabe |

### 3.2 Einbau-Regeln (B1 LF07 S.395)

- **Pumpe im Vorlauf oder Rücklauf** zulässig; bei Gas-Brennwert-/WP-Systemen herstellerspezifisch.
- **Nullpunkt = MAG-Anschluss am Saugstutzen** (vor der Pumpe), damit Dynamikdruck nicht auf MAG wirkt.
- Waagerechter Motor (Nassläufer) wegen Kugellagerschmierung.
- Durchflussrichtungspfeil beachten.
- Schmutzfänger stromaufwärts; Absperrungen vor und nach.

### 3.3 Regelungsarten elektronisch geregelter Pumpen (B1 LF07 S.397, B4 S.395)

| Modus | Prinzip | Einsatz WP-Sanierung |
|-------|---------|------------------------|
| **Δp-c (konstant)** | Hält Förderdruck konstant bei variablem V̇ | **FBH mit Einzelraumregelung (viele Thermostate)** |
| **Δp-v (variabel, linear)** | Δp sinkt auf 50 % bei V̇ = 0 | **HK-Anlage mit Thermostatventilen** (Standard) |
| Δp-T (temperaturgeführt) | Δp folgt Vorlauftemperatur | Niedrigenergie-Systeme, Fernwärme |
| Konstantdrehzahl | feste Drehzahl | veraltet, Austausch bei Sanierung Pflicht |
| PWM / 0–10 V | Fremdansteuerung durch WP-Regler | **Moderne WP-Integration (interne Pumpe)** |

### 3.4 Förderhöhen-Schnelltabelle Hocheffizienzpumpe EFH (Konvention, B4 S.396)

| Gebäude | Q̇H | σ | V̇ | Typischer Δp | Pumpe |
|---------|-----|----|----|----------------|--------|
| **EFH WP saniert, FBH** | 6 kW | 7 K | 0,75 m³/h | 150–250 mbar | 25-40 (1,5-4,0 m) |
| **EFH WP Bestand, HK** | 10 kW | 10 K | 0,9 m³/h | 300–500 mbar | 25-60 (3–6 m) |
| MFH Brennwert, HK | 20 kW | 15 K | 1,2 m³/h | 400–600 mbar | 25-70 / 30-60 |
| Einzelraum FBH | 2 kW | 5 K | 0,35 m³/h | 150–200 mbar | 25-25 (integriert) |
| Heizkreis-FBH-Verteiler | 6 kW | 7 K | 0,75 m³/h | 200–300 mbar | 25-40 |

### 3.5 Pumpenauswahl – 3 Schritte (B4 S.396)

1. **Heizleistung Q̇H** aus Bereich C (Heizlast).
2. **Förderstrom V̇** = Q̇H / (c · σ · ρ).
3. **Förderdruck H_Pumpe** aus Δp_Rohrnetz (Bereich G) + Δp_Erzeuger (WP herstellerspezifisch, typ. 100 mbar) + Δp_Abgleich (~ 100 mbar).

Kennlinie der Pumpe in Diagramm eintragen, Betriebspunkt = Schnittpunkt Pumpen- und Anlagenkennlinie. Anlagenkennlinie ist quadratisch (Δp ~ V̇²).

### 3.6 ErP / EEI-Grenzwerte (GEG-Pflicht ab 2013 / 2015 / 2020)

| Klasse | EEI | Status |
|--------|-----|--------|
| A | ≤ 0,20 | Hocheffizienzpumpe, BEG-förderfähig |
| **Pflicht bei Sanierung** | **≤ 0,23** | **ErP-Verordnung** |
| B | 0,23 – 0,27 | nur Altbestand |
| C / D / E | > 0,27 | verboten |

### 3.7 WP-integrierte vs. externe Pumpe

| Aspekt | WP-interne Pumpe | Externe Sekundärpumpe |
|--------|--------------------|---------------------------|
| Einsatz | Monoblock/Split mit hydraulischer Weiche, Puffer | Verteilerkreise hinter Weiche, FBH-Verteiler |
| Auslegung | Mindest-Umlauf der WP (laut Hersteller) | separat auf Heizkreis ausgelegt |
| Regelung | oft 0–10 V, PWM, modulierend | Δp-v / Δp-c autonom |
| Förderhöhe | WP-Datenblatt (typ. 400–700 mbar) | Heizkreis-Δp |

### 3.8 Heizkurve & Pumpenlaufzeit (Konvention)

- WP-Pumpe läuft bei Bedarf + Enteisung + Legionellen-Takt; Nennlaufzeit 2.000 – 4.000 h/a.
- Bei Abschaltung Ventilator/Pumpe: MAG-Nullpunkt prüfen, Schwerkraftbremse zur Vermeidung von Selbstumlauf.

---

## 4. Exakt-Modus Workflow

### Schritt 1 – Eingangsdaten
Aus Bereich C: Q̇H. Aus Bereich E/F: Auslegungs-σ. Aus Bereich G: Δp_Rohrnetz, Δp_Einzelwiderstände, WP-Hersteller-Δp.

### Schritt 2 – Förderstrom
V̇ = Q̇H / (c · σ · ρ). Wahl Δϑ WP-typisch 5–7 K (FBH), 7–10 K (HK).

### Schritt 3 – Gesamt-Förderdruck
Δp_Pumpe = Δp_Rohrnetz + Δp_Erzeuger (WP, Puffer) + Δp_Heizkreis + Δp_Abgleich (~ 100 mbar).

### Schritt 4 – Anlagenkennlinie
Δp(V̇) = Δp_Ausl · (V̇/V̇_Ausl)² → Parabel durch Ursprung und Betriebspunkt.

### Schritt 5 – Pumpenauswahl
Kennlinie wählen, dass Betriebspunkt ≈ 80 % der max. Förderhöhe (Wirkungsgrad-Optimum). Hocheffizienz (EEI ≤ 0,23), Regelung Δp-v (HK) oder Δp-c (FBH).

### Schritt 6 – Drehzahl-/Leistungsbedarf
Nach Proportionalgesetzen im Teillast prüfen:
- Halber V̇ → viertel Δp → achtel P_el.
- Elektrische Leistung im Jahresmittel für JAZ-Berechnung (Bereich I) relevant.

### Schritt 7 – Kompatibilität mit WP-Regler
PWM oder 0–10 V-Eingang an WP-Regler prüfen (besonders bei Monoblock WP).

### Schritt 8 – Hydraulische Weiche / Puffer
Wenn WP-Mindestumlauf > Heizkreis-ṁ: Weiche oder Reihenpuffer einplanen → zwei Pumpen (primär WP, sekundär Heizkreis).

---

## 5. Richtwert-Modus Workflow (Sanierung)

1. **Gebäude + Heizsystem** identifizieren (Tab. 3.4) → Vor-Default V̇ und Δp ablesen.
2. Standard-Hocheffizienzpumpe 25-40 / 25-60 (Baulänge 180 mm) wählen.
3. **FBH / Einzelraumregelung** → Δp-c.
**HK mit Thermostatventilen** → Δp-v.
4. **Monoblock-WP**: Meistens interne Pumpe ausreichend; nur bei großer Entfernung zum Puffer + Δp_Rohrnetz > 400 mbar zusätzliche Sekundärpumpe.
5. **Auswahl-Quickcheck:**
   - Q̇ ≤ 8 kW: Pumpe 25-40 (1-4 m WS), Dauerleistung 5–25 W
   - Q̇ 8–12 kW: 25-60 (1-6 m WS), 10–45 W
   - Q̇ 12–20 kW: 25-70 / 30-60, 15–70 W
6. **Altpumpe tauschen** bei Sanierung ist GEG-Pflicht (EEI ≤ 0,23).
7. **Voreinstellungen Thermostatventile** aus hydr. Abgleich (Bereich G) eintragen; Pumpe lernt bei Δp-v automatisch niedriger.

---

## 6. Plausibilitätsprüfungen

- V̇_ausgelegt > 2 · nötiger V̇ → überdimensioniert, Geräusch, Erosion, ErP-Verstoß.
- Pumpe läuft konstant am Maximum → Rohrnetz unterdimensioniert (Bereich G prüfen).
- Betriebspunkt in Kennlinien-Randbereich (< 30 % oder > 90 %) → anderer Typ wählen.
- P_el > 0,5 % · Q̇H → Ineffizient, alte Pumpe.
- Regelungsart Δp-c bei HK-Anlage mit vielen Thermostatventilen → Thermostate schließen, Pumpe übersteuert.
- Regelungsart Δp-v bei FBH ohne ERR → kann zu träger Reaktion führen, besser Δp-c.
- Δp_Pumpe > 600 mbar im EFH → Rohrnetz/Abgleich nicht sauber, DN vergrößern.
- Pumpe vor WP bei Monoblock → Hydraulikschema prüfen, meist falsch; WP-Primärpumpe ist werkseitig integriert.
- MAG nicht am Saugstutzen → Kavitation + Druckpulsation.
- Schallpegel > 35 dB(A) im Aufstellraum → Pumpe zu groß oder Rohrbefestigung fehlt.
- Zirkulation trotz abgeschalteter Pumpe → Schwerkraftbremse defekt.
- Bei WP-Verbund Kaskade: jede WP eigene Primärpumpe, sonst unzulässige Durchmischung.

---

## 7. Normenverweise

- **ErP-Richtlinie 2009/125/EG** + Verordnung **(EU) 641/2009 / 622/2012** (Nassläufer-Pumpen, EEI)
- **DIN EN 16297-1/-2/-3** (Prüfung Umwälzpumpen, EEI-Ermittlung)
- **DIN EN 12828** (Heizungsanlagen – Planung)
- **GEG § 60c / § 64 / § 71** (hydraulischer Abgleich, Pumpentausch bei Heizungserneuerung)
- **VDI 3805 Bl. 3** (Datenaustausch Pumpendaten)
- **DIN EN 60034** (Elektromotoren Wirkungsgradklassen IE1–IE5)
- **BAFA BEG EM** (Förderbedingungen Hocheffizienzpumpe, hydr. Abgleich)
- **VdZ-Formular "Hydraulischer Abgleich Verfahren B"** (ZVSHK / BDH)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| Heizungspumpen-Grundlagen, Bauarten (Kreisel, Nass-/Trockenläufer) | B1 LF07 S.394 |
| Einbauregeln Vorlauf/Rücklauf, MAG-Nullpunkt, Durchflussrichtung, Wartung | B1 LF07 S.395 |
| Pumpenauswahl, Kennlinie, Betriebspunkt, Merksatz halbe V̇→¼ Δp→⅛ P | B1 LF07 S.396 |
| Regelbare Pumpen Δp-c, Δp-v, ErP-Hocheffizienzpumpe, Austauschpflicht | B1 LF07 S.397 |
| Kupferrohrtabelle (für Anbindung Pumpe-Netz) | B1 LF07 S.440 |
| Pumpendiagramm-Beispiele (Betriebspunktfindung) | B1 LF07 S.441 |
| Regelventile, hydraulische Weiche | B4 S.394 |
| Proportionalgesetze V̇/n, Δp/n², P/n³; Anwendungen Δp-c, Δp-v, Δp-T | B4 S.395 |
| Pumpenauswahl in 3 Schritten (Heizleistung, Förderstrom, Förderdruck) | B4 S.396 |
| Pumpen-Berechnung, Kennlinie, Betriebspunkt, hydraulische Leistung | B2 Kap.3 S.72–77 |
| Pumpen-/Druckverlust-Integration in Rohrnetz Heizung, Affinitätsgesetze | B2 Kap.8 S.251–252 |
| Pumpen-Formeln Quick-Ref (V̇, P_hydr, Proportional) | B3 Kap.5 S.56 |
| Pumpen-Beispielrechnungen (Auslegung, Leistung, Teillast) | B5 Kap.8 S.147–155 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 S.56)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| **V̇ = Q̇ / (c · Δϑ · ρ)** | Förderstrom aus Heizleistung | m³/h |
| **P_hydr = V̇ · Δp** | hydraulische Leistung | W |
| P_el = P_hydr / (η_P · η_M) | elektrische Leistungsaufnahme | W |
| H = Δp / (ρ · g) | Förderhöhe (10 mbar ≈ 0,1 m WS) | m |
| **V̇₂/V̇₁ = n₂/n₁** | Proportionalgesetz 1 | – |
| **Δp₂/Δp₁ = (n₂/n₁)²** | Proportionalgesetz 2 | – |
| **P₂/P₁ = (n₂/n₁)³** | Proportionalgesetz 3 | – |
| η_ges = η_P · η_M · η_Freq | Gesamtwirkungsgrad (Laufrad · Motor · Umrichter) | – |

*B3 Kap.5 S.56 deckt sowohl Rohrnetz- als auch Pumpen-Grundlagen ab. Identisch zu B1 LF07 S.396 und B4 S.395. Für Tool-Plausibilität nutzbar.*

---

## 10. B2 Detailergänzungen – Kap.3 S.72–77 & Kap.8 S.251–252

### 10.1 Pumpen-Grundlagen (B2 Kap.3 S.72–77)

**Hydraulische Leistung vs. elektrische Aufnahme:**
- P_hydr = V̇ · Δp (reine Förderarbeit)
- η_P (Laufradwirkungsgrad): 0,50 – 0,75 (je größer die Pumpe, desto höher)
- η_M (Motor-Wirkungsgrad Nassläufer): 0,50 – 0,70
- **η_ges Hocheffizienz-Nassläufer (EEI ≤ 0,23): 0,40 – 0,55**

**Merksatz (B2 S.73):** Typische EFH-Pumpe zieht bei V̇ = 1 m³/h / Δp = 40 kPa → P_hydr = 11 W / P_el ≈ 25 W → η_ges ≈ 0,44.

### 10.2 Anlagenkennlinie & Betriebspunkt (B2 Kap.8 S.251)

**Anlagen-(Rohrnetz-)Kennlinie:** Δp(V̇) = Δp_Ausl · (V̇/V̇_Ausl)² → quadratische Parabel durch den Ursprung.

**Pumpenkennlinie:** Herstellerdiagramm H(V̇) – meist fallend.

**Betriebspunkt:** Schnittpunkt. Ziel: ca. **80 % der Maximalförderhöhe** → Wirkungsgradoptimum.

**Wichtig für WP-Sanierung:** Wenn Thermostatventile schließen, wandert der Betriebspunkt nach links → Δp steigt (bei Δp-c konstant gehalten) oder sinkt (Δp-v, reduziert sich auf ~50 %). Darum bei HK-Anlage **Δp-v bevorzugt**, spart Strom + verhindert Geräuschanregung in geschlossenen Ventilen.

### 10.3 Affinitätsgesetze – Detail (B2 Kap.8 S.252)

| Zustand | V̇ | Δp | P_el (≈) |
|---------|-----|------|----------|
| Nenndrehzahl 100 % | 1,0 · V̇_N | 1,0 · Δp_N | 1,0 · P_N |
| 75 % Drehzahl | 0,75 | 0,56 | **0,42** |
| 50 % Drehzahl | 0,50 | 0,25 | **0,125** |
| 25 % Drehzahl | 0,25 | 0,0625 | **0,016** |

→ Hocheffizienzpumpe mit Inverter erreicht in Schwachlast (z. B. Übergangszeit, nur 30 % Last) **unter 5 W Dauerleistung**, wenn Δp-v sinnvoll eingestellt ist.

**Tool-Logik:** JAZ-Berechnung (Bereich I) nutzt Jahresmittel-P_el_Pumpe aus Durchschnittsdrehzahl – bei Δp-v typisch 30 – 50 % Nennleistung.

---

## 11. Validierungs-Beispiele (B5 Kap.8 S.147–155)

### 11.1 Pumpenauslegung EFH-Sanierung (Worked Example, B5 S.147–148)

**Gegeben:**
- Q̇HL = 10 kW, Δϑ = 10 K, ρ = 978 kg/m³, c = 1,163 Wh/(kg·K)
- Δp_Rohrnetz = 200 mbar (aus Bereich G Beispiel 11.1, skaliert)
- Δp_WP-intern = 100 mbar, Δp_Schmutzfänger = 30 mbar, Δp_Abgleich = 100 mbar

**Schritt 1 – Förderstrom:**
ṁ = 10.000 / (1,163 · 10) = **860 kg/h** → V̇ = 860 / 978 = **0,88 m³/h**

**Schritt 2 – Förderdruck:**
Δp_Pumpe = 200 + 100 + 30 + 100 = **430 mbar = 4,3 m WS**

**Schritt 3 – Typ:**
Standard-Hocheffizienz **25-60** (1–6 m WS) → Betriebspunkt 0,88 m³/h / 4,3 m ca. **75 % Förderhöhenbereich** → ✓.

**Tool-Validierung:**
1. Betriebspunkt im mittleren Drittel der Kennlinie ✓
2. EEI ≤ 0,23 (Hocheffizienz), P_el im Normalbetrieb 15–25 W ✓
3. Regelung Δp-v wegen HK-Thermostatventile ✓

### 11.2 Leistungsreduktion Teillast (B5 S.149)

**Szenario:** Übergangszeit, nur 40 % der Heizlast → Thermostatventile teils geschlossen → V̇ sinkt auf 0,35 m³/h.

Pumpe reagiert:
- **Δp-v-Modus:** Δp sinkt linear mit V̇ von 4,3 m auf ca. 2,5 m → P_el ≈ 25 · (0,35/0,88)^2,3 ≈ **5 W**
- **Δp-c-Modus:** Δp bleibt 4,3 m → P_el ≈ 25 · (0,35/0,88)^1 ≈ **10 W** (doppelt so viel!)

**Fazit:** Δp-v spart bei HK-Anlage im Jahr ca. 50 – 80 kWh Pumpenstrom (EFH).

### 11.3 Cross-Check B2 / B3 / B4

| Thema | B2 Kap.3+8 | B3 Kap.5 S.56 | B4 S.395–396 | Fazit |
|-------|------------|----------------|---------------|-------|
| Kernformel V̇ | V̇ = ṁ/ρ | identisch | identisch | konsistent |
| Proportionalgesetze | S.252 detailliert | Quick-Ref | S.395 grafisch | konsistent |
| η_ges Hocheffizienz | S.73 (0,40–0,55) | nicht enthalten | implizit EEI | B2 Primärquelle η |
| Betriebspunkt-Methodik | S.251 ausführlich | nicht enthalten | S.396 Kennlinie | **B2 Primärquelle Theorie**, B4 Primärquelle Anwendung |
| Δp-v vs. Δp-c Bewertung | S.252 | nicht enthalten | S.395 Tabelle | konsistent |
