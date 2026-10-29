# Bereich D – Warmwasserbedarf & Trinkwassererwärmung

## 1. Zweck & Anwendung im Tool

Ermittlung des Warmwasser-Tagesbedarfs, des Speichervolumens, der Aufheizleistung und der WP-Tauglichkeit des Trinkwassererwärmers (TWE). Liefert den TWW-Zuschlag zur Gebäude-Heizlast (Bereich I) und den Speicher-Bedarfswert (Bereich J). **Zwei Modi:** Exakt (V̇, η, Aufheizzeit, Wärmetauscherleistung) oder Richtwert (Personenzahl × L/(P·d) + Standard-Speichergröße).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| Q = m · c · Δϑ | Wärmemenge WW-Erwärmung | kWh | B1 LF09 S.513, S.574 |
| mm · ϑm = mk · ϑk + mw · ϑw | Mischungsformel | kg, °C | B1 LF09 S.570 |
| mm = mk + mw | Massenbilanz Mischung | kg | B1 LF09 S.571 |
| ϑm = (mk·ϑk + mw·ϑw) / mm | Mischtemperatur | °C | B1 LF09 S.571 |
| mk = mw · (ϑw − ϑm) / (ϑm − ϑk) | Kaltwasser-Anteil | kg | B1 LF09 S.571 |
| Q̇ = Q / t | Wärmeleistung | kW | B1 LF09 S.574 |
| **t = (m · c · Δϑ) / (η · Q̇zu)** | Aufheizzeit Speicher | h | B1 LF09 S.574, S.576 |
| **Q̇zu = (m · c · Δϑ) / (η · t)** | Erforderliche Aufheizleistung | kW | B1 LF09 S.576 |
| η = Q̇ab / Q̇zu | Wirkungsgrad | – | B1 LF09 S.575 |
| ṁ = (Q̇zu · η) / (c · Δϑ) | Durchfluss-TWE Massenstrom | kg/min | B1 LF09 S.575 |
| Δϑ = (Q̇zu · η) / (c · ṁ) | Temperaturerhöhung DFE | K | B1 LF09 S.575 |
| QP = V60 · c · (60 − 10) | Tages-Wärmebedarf je Person | kWh/d | B1 LF09 S.512 |

*c = 1,163 Wh/(kg·K) = 0,001163 kWh/(kg·K) für Wasser (B1 LF09 S.513).*

---

## 3. Tabellen & Richtwerte

### 3.1 Warmwasserbedarf je Person und Tag (B1 LF09 S.512)

| Ausstattung | V₄₅ [L/(P·d)] | V₆₀ [L/(P·d)] | QP [kWh/(P·d)] |
|-------------|----------------|----------------|----------------|
| einfach (Sozialwohnung) | 15 – 30 | 10 – 20 | 0,6 – 1,2 |
| **gehoben (Standard DE)** | **30 – 60** | **20 – 40** | **1,2 – 2,4** |
| komfortabel (EFH, ETW) | 60 – 120 | 40 – 80 | 2,4 – 4,8 |

*QP bezogen auf Aufheizung von 10 °C → 60 °C.*

### 3.2 Zapf-Einzelbedarf nach Sanitärobjekt (B1 LF09 S.512)

| Vorgang | Bedarf [L] | Nutztemperatur [°C] |
|---------|-------------|----------------------|
| Duschbad | 30 – 50 | 37 |
| Vollbad (Wanne) | 150 – 180 | 38 |
| Händewaschen | 3 – 10 | 37 |
| Geschirrspüler-Zulauf | 10 – 15 | 50 |
| Heißgetränke | 1 – 2 | 100 |

### 3.3 Gewerbe-/Sonderbedarf (B1 LF09 S.513)

| Anwendung | L/d bezogen auf |
|-----------|------------------|
| Hotelzimmer mit Bad | 95 – 140 / Gast |
| Hotelzimmer mit Dusche | 50 – 100 / Gast |
| Hallenbad | 40 / Benutzer |
| Sauna | 100 / Benutzer |
| Waschanlage Industrie | 30 / Benutzer |
| Waschanlage Turnhalle | 40 / Benutzer |
| Waschanlage Wohnheim | 60 / Benutzer |
| Kindergarten Waschtisch | 2,5 / Kind |
| Friseur Herren / Damen | 40 / 100 / Nassplatz |

### 3.4 Spez. Wärmekapazität c (B1 LF09 S.513)

| Stoff | c [kJ/(kg·K)] | c [kWh/(kg·K)] | c [Wh/(kg·K)] |
|-------|----------------|-----------------|----------------|
| **Wasser** | **4,19** | **0,001 163** | **1,163** |
| Eis (0 °C) | 0,39 | 0,000 108 | 0,108 |
| Wasserdampf (100 °C) | 2,05 | 0,000 570 | 0,570 |
| PE-X | 2,03 | 0,000 565 | 0,565 |
| Kupfer | 2,10 | 0,000 583 | 0,583 |

### 3.5 Wirkungsgrade TWE (B1 LF09 S.575, S.576)

| Bauart | η |
|--------|---|
| Elektro-Durchfluss-TWE | 0,98 – 0,99 |
| Gas-Durchfluss-TWE | 0,81 – 0,87 |
| Elektro-Speicher-TWE | 0,95 – 0,98 |
| Gas-Speicher-TWE | 0,79 – 0,87 |
| Indirekter Speicher (vom WP-Kessel) | 0,90 – 0,95 (inkl. Speicher-Stillstandsverlust) |

### 3.6 Richt-Speichergrößen EFH (Konvention, abgeleitet aus 3.1)

| Haushalt | Speichervolumen bei 60 °C |
|----------|----------------------------|
| 1 – 2 Personen | 150 – 200 L |
| **3 – 4 Personen (Standard)** | **200 – 300 L** |
| 5 – 6 Personen | 300 – 400 L |
| ≥ 7 Personen | 400 – 500 L + |

### 3.7 Bauarten Trinkwassererwärmer (B1 LF09 S.519)

| Kriterium | Varianten |
|-----------|-----------|
| Zeitpunkt | Speicher / Durchfluss (DFE) |
| Druckverhältnis | offen / geschlossen |
| Beheizung | unmittelbar (elektrisch direkt) / mittelbar (Wärmetauscher, ideal für WP) |
| Versorgung | Einzel- / Gruppen- / Zentralversorgung |

### 3.8 WP-spezifische Kenngrößen TWE (B1 LF12 S.719 + Konvention)

| Parameter | Richtwert |
|-----------|-----------|
| Speicher-Solltemp. WP | 50 – 55 °C (JAZ-schonend) |
| Legionellenprogramm | wöchentlich 1× 60 °C (DVGW W 551) |
| Leistungsansatz WP-TWE | 0,20 – 0,30 kW / Person |
| Wärmetauscherfläche Speicher (WP) | ≥ 0,25 m² / kW WP-Heizleistung |
| Min. Speicher für WP-Zapfspitze | 1,5 – 2,0 × Vollbad-Bedarf |
| COP Brauchwasser-WP (Luft) | 2,5 – 3,0 |
| Frischwasserstation (hygienisch) | Plattenwärmetauscher im Durchfluss, kein stehendes WW → Legionellenrisiko minimal, WP-ideal |

### 3.9 Regelung/Legionellen (B1 LF14 S.825)

| Regel | Wert |
|-------|------|
| Speicher-Solltemperatur | 60 °C |
| Max. Abkühlung Zirkulation | 5 K (DVGW W 551) |
| Kessel-/WP-Temp. bei TWW-Ladung | bis 75 °C (Kessel) / 60 °C (WP mit E-Stab) |
| Vorrangschaltung TWW | gleitende Kesselregelung aus, HZ-Pumpe aus, Ladung vorrangig |
| Zirkulationspumpen-Laufzeit max. | 16 h/d (Zeitschaltuhr) |

### 3.10 Solar-Zuschlag Rohrleitung (B1 LF09 S.578)

| Rohrlänge (einfach) | 20 m | 30 m | 40 m |
|---------------------|------|------|------|
| Zuschlagsfaktor auf Kollektoren | 1,10 | 1,15 | 1,20 |

*Nomogramme setzen 10 m voraus.*

---

## 4. Exakt-Modus Workflow

### Schritt 1 – Bedarf je Person
V45,P = gewählter Ausstattungs-Richtwert (Tab. 3.1)

### Schritt 2 – Tagesbedarf
VTag,45 = n_Person · V45,P
VTag,60 = VTag,45 · (45−10)/(60−10) = VTag,45 · 0,70

### Schritt 3 – Wärmebedarf WW
QWW,Tag = m · c · Δϑ = VTag,60 · 1 kg/L · 1,163 Wh/(kg·K) · 50 K

### Schritt 4 – Speichergröße
VSp ≈ VTag,60 · Gleichzeitigkeitsfaktor (1,0 – 1,3 bei EFH; 0,4 – 0,7 bei MFH mit Zirkulation)

### Schritt 5 – Aufheizzeit Speicher
t = (m · c · Δϑ) / (η · Q̇zu)

### Schritt 6 – Prüfung Durchfluss-TWE
ṁ = (Q̇zu · η) / (c · Δϑ); Zapfkomfort: ṁ ≥ 8 kg/min für Dusche bei Δϑ = 35 K (Ableitung: Q̇zu ≈ 20 kW gas, 24 kW elektrisch).

### Schritt 7 – WP-TWE-Zuschlag zur Gebäude-Heizlast
QTWW,WP = 0,20 – 0,30 kW · n_Person → additiv zur Norm-Heizlast (Bereich I).

---

## 5. Richtwert-Modus Workflow (Sanierung / Unbekannt)

1. Personenzahl n eingeben (Default: Wohnfläche / 35 m² pro Person).
2. Ausstattung Default „gehoben" → V60 = 30 L/(P·d).
3. Tagesbedarf: VTag,60 = n · 30 L.
4. Speicher aus Tab. 3.6 ablesen (EFH 3–4 Pers → 300 L).
5. Wärmebedarf: QWW = n · 1,7 kWh/d (Mittelwert „gehoben").
6. WP-Leistungszuschlag: ΦTWW = n · 0,25 kW.
7. TWE-Typ-Vorschlag:
   - EFH neuwertig → indirekter Speicher mit WP-Wärmetauscher
   - EFH Altbestand mit Durchlauferhitzer → Option „Hybrid" (WP + Frischwasserstation)
   - MFH → Frischwasserstation (Legionellensicher, WP-ideal)

---

## 6. Plausibilitätsprüfungen

- QWW,Tag / n_Person muss in 0,6 – 4,8 kWh/(P·d) liegen (Tab. 3.1). Außerhalb → Eingabefehler.
- Speicher zu klein (< 40 L/Person) → Warnung Legionellen/Komforteinbruch.
- Speicher > 80 L/Person ohne Legionellenprogramm → Warnung Hygiene.
- η > 0,99 oder η < 0,6 → Eingabe prüfen.
- WP-Solltemp > 60 °C dauerhaft → Hinweis: JAZ-Einbruch, nur für Legionellenzyklus sinnvoll.
- Aufheizzeit t > 2 h bei EFH-Standardgerät → Leistung zu klein (oder Speicher zu groß).
- Zirkulation mit Abkühlung > 5 K → DVGW W 551 Verstoß.
- TWW-Zuschlag > 50 % der Gebäude-Heizlast → WP-Sommerbetrieb unwirtschaftlich, TWW-Luft-WP erwägen.

---

## 7. Normenverweise

- **DIN 1988-300** (Trinkwasser-Installation, Bedarfsberechnung)
- **DVGW W 551** (Legionellenschutz, 3-L-Regel, Speichertemperatur)
- **DVGW W 553** (Dimensionierung Zirkulation)
- **DIN EN 806** (Trinkwasser-Installation Bedarfswerte)
- **DIN EN 12897** (Speicher-Bauregeln)
- **GEG 2024** §71 (Heizungsanforderung inkl. TWW)
- **VDI 6002** (Solare TWE)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| Erwartungshaltung Nutzer + Auslegungskriterien | B1 LF09 S.511 |
| Bedarfstabelle Sanitärgegenstand + Richtwerte Person (Tab. 3.1/3.2) | B1 LF09 S.512 |
| Gewerbe-/Sonderbedarf + c-Werte Stoffe (Tab. 3.3/3.4) | B1 LF09 S.513 |
| Bauarten TWE (Speicher/DFE, direkt/indirekt, Einzel/Zentral) | B1 LF09 S.519 |
| WP als Wärmequelle für TWW, Komponenten | B1 LF09 S.557 |
| Mischungsformel mm·ϑm = mk·ϑk + mw·ϑw | B1 LF09 S.570 |
| Temperatur-/Massenberechnung + Mischungskreuz | B1 LF09 S.571, S.572 |
| Wärmeleistung Q̇ = Q/t, Aufheizzeit Speicher | B1 LF09 S.574 |
| Wirkungsgrad η, DFE-Massenstrom ṁ = Q̇·η/(c·Δϑ) | B1 LF09 S.575 |
| Speicher-TWE Aufheizzeit t = m·c·Δϑ/(η·Q̇zu) | B1 LF09 S.576 |
| Solar-TWE Nomogramm + Rohrzuschlag | B1 LF09 S.578 |
| Frischwasserstation + WP-Leistungszahl | B1 LF12 S.719 |
| Speicher-Vorrang, Legionellenschutz, Zirkulations-Laufzeit | B1 LF14 S.825 |
| Zapfstellen-Tabelle DIN 4708 (NB1=5,82 kWh, BRN=3,66 kWh) | B2 Kap.4 S.129 |
| Bedarfskennzahl N = Σ(n·p·v·qv)/(3,5·5,82) | B2 Kap.4 S.131 |
| WP-TWE Leistungszahl ε / Arbeitszahl β | B2 Kap.4 S.136–137 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 + Kap.8)

### 9.1 Grundformeln TWE (B3 Kap.5 S.51–54)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| Q = m · c · Δϑ | Wärmemenge WW-Erwärmung | kWh |
| Q̇ = Q / t | Wärmeleistung | kW |
| t = Q / Q̇ | Aufheizzeit | h |
| ṁ = V̇ · ρ | Massenstrom aus Volumenstrom | kg/h |
| η = Qnutz / Qzu | Wirkungsgrad | – |

### 9.2 WP-Kennzahlen für TWE (B3 Kap.8 S.79–80)

| Formel | Bedeutung |
|--------|-----------|
| **εtheor = TN / (TN − TQ)** | Theoretische Carnot-Leistungszahl (T in K!) |
| **εreal = εtheor · ν = Q̇N / P** | Reale Leistungszahl (ν = Gütegrad, ν ≈ 0,4–0,5) |
| **β = QWP,Jahr / WelektrJahr** | Jahresarbeitszahl (JAZ) |

*TN = Nutztemperatur (Kondensator K), TQ = Quellentemperatur (Verdampfer K). Für TWW-Betrieb: TN ≈ 55…60 °C → 328…333 K.*

**Beispiel Carnot-Berechnung WP-TWW:**
- Luft-WP bei A2/W55: TN = 328 K, TQ = 275 K → εtheor = 328/(328−275) = **6,19**
- Mit ν = 0,45 → εreal ≈ **2,8** (typischer COP Brauchwasser-WP).

---

## 10. Validierungs-Beispiele (B2 Kap.4 + B5 Lösungen)

### 10.1 Speicher-Aufheizzeit (B2 Kap.4 S.115)

**Beispiel (durchgerechnet):**
- Speicher 300 L, Aufheizung 10 °C → 60 °C, η = 0,92, Q̇zu = 15 kW
- m = 300 kg, Δϑ = 50 K, c = 1,163 Wh/(kg·K)
- Q = m·c·Δϑ = 300 · 1,163 · 50 = 17.445 Wh = 17,45 kWh
- **t = Q / (η · Q̇zu) = 17,45 / (0,92 · 15) = 1,26 h ≈ 76 min**

Tool-Plausibilität: Aufheizzeit < 2 h bei Standard-EFH-Speicher ✓

### 10.2 Bedarfskennzahl N (DIN 4708, B2 Kap.4 S.131)

**Beispiel EFH 4-Personen-Haushalt:**
Wohnwerte pro Zapfstelle:
- 1 Normalbadewanne NB1: p = 1,0, v = 1/Tag, qv = 5,82 kWh
- 1 Brausebadewanne BRN: p = 1,0, v = 2/Tag, qv = 3,66 kWh
- 1 Küchenspüle KX: p = 0,2, v = 3/Tag, qv = 0,28 kWh

N = Σ(n·p·v·qv) / (3,5 · 5,82 kWh)
N = (1·1·1·5,82 + 1·1·2·3,66 + 1·0,2·3·0,28) / 20,37
N = (5,82 + 7,32 + 0,168) / 20,37
**N = 0,65** → Speicher-Leistungskennzahl NL ≥ 0,65 erforderlich

Herstellerkatalog: Speicher 300 L / 21 kW Ladeleistung liefert NL = 1,0 ✓ ausreichend

### 10.3 Cross-Check B3 vs. B4

| Thema | B3 | B4 | Abweichung |
|-------|-----|-----|------------|
| c Wasser | 4,19 kJ/(kg·K) = 1,163 Wh/(kg·K) | 4,19 / 1,163 | keine |
| η Gas-Speicher-TWE | Kap.5 S.53: 0,80 typ. | 0,79–0,87 | B3 konservativer |
| WP εreal Formel | εreal = εtheor · ν | identisch | keine |
| β (JAZ) Definition | B3 Kap.8 S.80 | B1 LF12 S.719 | keine |
