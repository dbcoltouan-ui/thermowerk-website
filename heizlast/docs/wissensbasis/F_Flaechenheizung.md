# Bereich F – Flächenheizung (Fußboden-, Wand-, Deckenheizung)

## 1. Zweck & Anwendung im Tool

Auslegung der WP-idealen Niedertemperatur-Flächenheizung. Ermittelt Wärmestromdichte q̇, Oberflächentemperatur ϑF,m, Verlegeabstand VA, Vorlauftemperatur ϑV, Massenstrom ṁH und Druckverlust pro Heizkreis. Zwei Modi: Exakt (Formblatt B4 S.372–378 nach DIN EN 1264) oder Richtwert (Tabellenverfahren bei bekannter Baustruktur/Nachrüstung).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| q̇ges = Q̇H / AF | Auslegungs-Wärmestromdichte | W/m² | B4 S.372, S.374 |
| Q̇H = Φ̇HL − Q̇T,nach_unten | Bereinigte Raumheizlast | W | B4 S.374 |
| **ϑF,m = ϑi + (q̇ / 8,92)^(1/1,1)** | Mittlere Oberflächentemp. (DIN EN 1264) | °C | B4 S.374, S.375 |
| **q̇ = 8,92 · (ϑF,m − ϑi)^1,1** | Basiskennlinie Flächenheizung | W/m² | B4 S.375 |
| ΔϑH = (ϑV + ϑR)/2 − ϑi | Heizmittel-Übertemperatur | K | B4 S.375 |
| σ = ϑV − ϑR | Temperaturspreizung | K | B4 S.377 |
| Δϑydes = ΔϑH,des + σ/2 (wenn σ/ΔϑH ≤ 0,5) | Auslegungs-Vorlauf-Übertemperatur | K | B4 S.375 |
| Δϑydes = ΔϑH,des + σ/2 + σ²/(12·ΔϑH,des) (σ/ΔϑH > 0,5) | dito, hohe Spreizung | K | B4 S.375 |
| ṁH = Q̇F / (σ · c) | Heizmittel-Massenstrom | kg/h | B4 S.377 |
| LH = 1000 · AF / VA | Rohrlänge Heizfläche | m | B4 S.377 |
| LKr = LH + LAnb | Gesamtrohrlänge Heizkreis | m | B4 S.377 |
| Δpges = R · LH + ΔpV | Druckverlust Heizkreis | Pa | B4 S.377, S.378 |
| q̇u = [q̇ · Ro + (ϑi − ϑu)] / Ru | Wärmeverlust nach unten | W/m² | B4 S.377 |
| R_o = R_o,B + s_u/λ_u | Wärmewiderstand nach oben | m²·K/W | B4 S.376 |
| R_u = R_u,DA + R_u,De + R_u,Putz + R_u,De | Wärmewiderstand nach unten | m²·K/W | B4 S.376 |

*c = 1,163 Wh/(kg·K). Exponent 1,1 der Grenzkurve aus DIN EN 1264 (freie Konvektion + Strahlung am Fußboden).*

---

## 3. Tabellen & Richtwerte

### 3.1 Maximale Oberflächentemperaturen & Wärmestromdichten (DIN EN 1264, B4 S.372)

| Zone | ϑi [°C] | Δϑ_F,max [K] | ϑ_F,max [°C] | q̇_F,max [W/m²] |
|------|---------|---------------|----------------|-------------------|
| **Aufenthaltszone (Wohnen, Büro)** | 20 | 9 | **29** | **100** |
| **Bäder, Duschen** | 24 | 9 | **33** | **100** |
| **Randzone (1 m um Außenwand)** | 20 | 15 | **35** | **175** |

**Merksatz WP-FBH:** Auslegungs-q̇ typisch 40 – 70 W/m² im Wohnbereich, 70 – 100 in Rand-/Bad, bei modern gedämmtem Bau < 50 W/m² möglich.

### 3.2 Auslegungs-Vor-/Rücklauftemperaturen FBH (Konvention, B4 S.374)

| Situation | ϑV / ϑR / ϑi | σ | ΔϑH |
|-----------|---------------|---|------|
| **WP sanierter Neubau** | 35 / 28 / 20 | 7 K | 11,5 K |
| **WP Bestand gedämmt** | 40 / 30 / 20 | 10 K | 15 K |
| **WP Teilsanierung** | 45 / 35 / 20 | 10 K | 20 K |
| **Brennwert-FBH** | 45 / 35 / 20 | 10 K | 20 K |
| Alt-FBH mit hoher Heizlast | 55 / 45 / 20 | 10 K | 30 K |

### 3.3 Verlegeabstand VA → Rohrlänge pro m² (B4 S.374)

| VA [mm] | 50 | 100 | 150 | 200 | 250 | 300 |
|---------|-----|-----|------|------|------|------|
| Rohrlänge Lø [m/m²] | 20 | 10 | 6,7 | 5,0 | 4,0 | 3,3 |

### 3.4 Verlegeabstands-Empfehlung nach Rohr und Zone (B4 S.374)

| Rohr | Aufenthalt | Randzone | Bad |
|------|-------------|-----------|-----|
| 14 × 2 mm | 150 – 200 | 50 – 100 | 50 – 100 |
| 16 × 2 mm | 150 – 200 | 100 – 150 | 100 – 150 |
| 17 × 2 mm | 150 – 250 | 100 – 200 | 100 – 150 |
| 20 × 2 mm | 200 – 300 | 100 – 200 | 150 – 200 |

### 3.5 Bodenbelag-Wärmewiderstand Ro,B (B4 S.377)

| Belag | λ [W/(m·K)] | d [mm] | Ro,B [m²·K/W] |
|-------|--------------|---------|-----------------|
| Teppich (dick) | 0,06 | 7 – 18 | 0,10 – 0,15 |
| Linoleum, PVC, Gummi | 0,19 | 2 – 5 | 0,01 – 0,03 |
| Parkett (Eiche, Buche) | 0,21 | 10 – 22 | 0,05 – 0,10 |
| Laminat | 0,18 | 8 – 10 | 0,04 – 0,06 |
| Tonplatten, Gasbeton | 0,40 | 10 – 40 | 0,03 – 0,10 |
| Keramik / Feinsteinzeug | 1,05 – 1,3 | 8 – 15 | 0,005 – 0,014 |
| Naturstein (Marmor) | 3,5 | 20 – 40 | 0,005 – 0,012 |

*DIN EN 1264 Grenzwert Belagwiderstand Ro,B,zul ≤ 0,15 m²·K/W.*

### 3.6 Fußbodenaufbau – Wärmedurchgangswiderstand nach unten Ru (DIN EN 1264-4, B4 S.376)

| Darunter liegend | Min. Ru [m²·K/W] | Min. Dämmung WLG 035 |
|------------------|---------------------|--------------------------|
| Über beheiztem Raum | 0,75 | 35 mm |
| Über unbeheiztem Raum / Keller | 1,25 | 45 mm |
| Außenluft / Erdreich ϑ ≥ 0 °C | 1,25 | 45 mm |
| Außenluft ϑ bis −5 °C | 1,50 | 55 mm |
| Außenluft ϑ bis −15 °C | 2,00 | 70 mm |

**Typische Decke U = 0,35 W/(m²·K) → Ru ≈ 2,86 m²·K/W (moderner Neubau).**
**Typische Decke U = 0,50 W/(m²·K) → Ru ≈ 2,00 m²·K/W.**

### 3.7 Aufbausysteme (B4 S.376)

| System | Aufbauhöhe | max. Nutzlast | WLG | Besonderheit |
|--------|-------------|----------------|------|---------------|
| Noppenplatte + Nassestrich | 54 mm + Belag | 5 kN/m² | 040 | Standardverlegung |
| Dämmrolle/Faltplatte + Nassestrich | 35 mm + Belag | 4 kN/m² | 045 | dünn, Sanierung |
| Trockensystem (Trockenestrich) | 25 – 50 mm | 60 kN/m² | 035 | Sanierung, keine Estrich-Trocknung |
| Klimaboden / Flächentemperierung | ~ 15 mm | wie Untergrund | – | sehr dünn, WP-geeignet |

### 3.8 Schnellauslegung-Ablesewerte bei ϑi = 20 °C, Estrich 45 mm (B4 S.378)

Bei q̇ = 60 W/m²:

| Belag Ro,B | ϑV = 40 °C | ϑV = 45 °C |
|-------------|-------------|-------------|
| 0,02 (Keramik) | VA 150, ΔϑH 18 K | VA 200, ΔϑH 20 K |
| 0,05 (Parkett) | VA 100, ΔϑH 20 K | VA 150, ΔϑH 22 K |
| **0,10 (Teppich/Standard)** | **VA 100, ΔϑH 21 K** | **VA 100, ΔϑH 23 K** |

Bei q̇ = 40 W/m² (saniertes EFH):

| Belag Ro,B | ϑV 35 °C | ϑV 40 °C |
|-------------|-----------|-----------|
| 0,10 | VA 200, ΔϑH 13 K | VA 250, ΔϑH 15 K |

### 3.9 Wand- und Deckenheizung – Eckwerte (B1 LF07 S.404, Konvention)

| Parameter | Wandheizung | Deckenheizung |
|-----------|--------------|-----------------|
| Max. Oberflächentemp. | 35 – 40 °C | 29 – 30 °C (Strahlungskomfort) |
| Max. q̇ | ~ 160 W/m² | ~ 70 W/m² |
| Vorlauf WP typ. | 35 – 45 °C | 30 – 40 °C |
| Belag | Putz, Lehm, Trockenbau | abgehängte Decke / Putz |
| Einsatz | Räume ohne Bodenzugang | Sanierung ohne Bodenaufbruch |

### 3.10 Richtwerte bei FBH-Nachrüstung im Bestand

| Situation | q̇ realistisch | ϑV realistisch |
|-----------|-----------------|-----------------|
| FBH in Bestand teilsaniert, Aufbau 45 mm | 40 – 60 W/m² | 40 – 45 °C |
| Nachgerüstet Trockensystem | 40 – 55 W/m² | 40 – 45 °C |
| Klimaboden (Fräskanal) | 30 – 50 W/m² | 35 – 40 °C |
| FBH kombiniert mit Bestands-HK (Hybrid) | HK-dominant | 45 – 50 °C |

---

## 4. Exakt-Modus Workflow (Formblatt DIN EN 1264)

### Schritt 1 – Raumgrundlagen
- AF, ϑi, Φ̇HL aus Bereich C; darunterliegende Raumtemperatur ϑu.
- Zoneneinteilung: Aufenthalt AAZ, Randzone ARZ, Blindfläche AB (Möbel).

### Schritt 2 – Soll-Wärmestromdichte
q̇_AZ = Φ̇HL / AAZ (Standard: Aufenthaltsbereich deckt gesamte Heizlast)
Bei q̇ > q̇max → Randzonenanteil erhöhen oder Zusatzheizkörper Q̇Zus einplanen.

### Schritt 3 – Oberflächentemperatur-Check
ϑF,m = ϑi + (q̇ / 8,92)^(1/1,1).
Prüfung ϑF,m ≤ ϑF,max (Tab. 3.1).

### Schritt 4 – Widerstände
Ro aus Belag (Tab. 3.5) + Estrichschicht.
Ru aus Aufbau (Tab. 3.6).

### Schritt 5 – Heizmittel-Übertemperatur + Vorlauf
σ wählen (Tab. 3.2).
ΔϑH aus Leistungsdiagramm B4 S.374 (q̇, VA, Ro,B) oder Schnelltabelle (Tab. 3.8).
Δϑydes aus Fall 1/2 (σ/ΔϑH-Verhältnis, §2).
ϑV = ϑi + ΔϑH + σ/2.

### Schritt 6 – Verlegeabstand & Rohrlänge
VA aus Tab. 3.4 / Diagramm.
LH = 1000 · AF / VA.
Prüfung Heizkreislänge ≤ 120 m (Standard PE-X 16×2) bzw. Hersteller-Limit.

### Schritt 7 – Massenstrom & Druckverlust
ṁH = Q̇F / (σ · c).
Aus R-Diagramm B4 S.378 → R [mbar/m] → Δp = R · LH + ΔpV.
Vergleich gegen Pumpe Δp_max → Drosselung ΔpD = Δp_max − Δpges am Regulierventil.

### Schritt 8 – Zusatzheizleistung
Q̇u = AF · q̇u (Verlust nach unten) als Transmissions-Korrektur zur Bereinigung.

---

## 5. Richtwert-Modus Workflow (Sanierung / Auslegung ohne Detail)

1. Baujahr + Dämmstand → Default-ϑV wählen (Tab. 3.2).
2. Default-VA:
   - Sanierter Neubau: 150 mm (Aufenthalt), 100 mm (Rand)
   - Teilsanierter Bestand: 100 mm überall
   - Bad: 100 mm + Handtuchtrockner-Zuschlag
3. Aus Schnelltabelle (Tab. 3.8) ΔϑH ablesen nach q̇ = Φ̇HL / AF.
4. ϑV-Plausibilität gegen WP-Max (55 °C).
5. Heizkreisanzahl: max. 120 m pro Kreis → AF,max ≈ 12 m² bei VA 100 / 18 m² bei VA 150.
6. Zusatzheizung Bad (Handtuchtrockner 400 – 800 W) addieren.
7. Massenstrom mit σ = 7 K (WP) überschlagen: ṁ = 0,86 · Q̇[kW] / 7 K · 1000 kg/h.

---

## 6. Plausibilitätsprüfungen

- q̇_Aufenthalt > 100 W/m² → Randzonenaufteilung nötig oder Zusatzheizkörper.
- q̇_Rand > 175 W/m² → unzulässig, VA verringern reicht nicht, Heizlast-Reduktion oder HK kombinieren.
- ϑF,m > ϑF,max → Vorlauf senken, VA verringern, Belag ändern (niedrigeres Ro,B).
- ϑV > 45 °C bei moderner Hülle → FBH eher überdimensioniert oder Belag zu dämmend.
- Ro,B > 0,15 m²·K/W → DIN-Grenzwert überschritten, Belag ungeeignet.
- LH > 120 m / Kreis → Kreis teilen.
- σ < 5 K → Massenstrom zu hoch, Pumpenleistung/Druckverlust prüfen.
- σ > 10 K bei WP-FBH → Oberflächentemperaturspreizung über Raum zu groß (Komfort).
- q̇_u (Verlust nach unten) > 15 % von q̇ → Dämmung unter FBH zu gering.
- Δpges (Heizkreis) > 250 mbar → Pumpe/Verteiler prüfen.
- Massenstrom pro Kreis außerhalb 30 – 180 kg/h → Kreisaufteilung korrigieren.

---

## 7. Normenverweise

- **DIN EN 1264-1 bis -5** (Fußboden-/Wand-/Deckenheizung: Grenzwerte, Auslegung, Estrich, Prüfung)
- **DIN 18560-2 / -4** (Heizestriche: Zement, Calciumsulfat)
- **DIN EN 12831-1** (Heizlast als Input)
- **DIN EN ISO 6946** (Wärmewiderstände Schichtaufbau)
- **VDI 6030** (Raumheizflächen)
- **DIN 4725** (historisch Flächenheizung, durch EN 1264 ersetzt)
- **BEG-Förderung** (FBH als Einzelmaßnahme förderfähig, WP-Bonus)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| Flächenheizung-Grundlagen, Arten, Vor-/Nachteile, Rohrwerkstoffe | B1 LF07 S.404 |
| FBH-Auswahlkriterien, Auslegungs-Stichworte, Dämm-/Estrich-/Belagkonzept | B4 S.372 |
| FBH-Formblatt Beispielrechnung (Heizkreis 1–5) | B4 S.373 |
| Wärmestromdichte q̇ges, Randzonen/Blindfläche, Zusatzleistung, Basiskennlinie | B4 S.374 |
| Mittlere Oberflächentemperatur, Vorlauf-Übertemperatur (Fall 1/2), Leistungsdiagramm, Verlegeabstand | B4 S.375 |
| Fußbodenaufbau nach DIN EN 1264-4, Ro/Ru-Formeln, Aufbausysteme | B4 S.376 |
| Belag-Ro,B, Calciumsulfat-/Zementestrich, Massenstrom, Rohrlänge, Druckverlust | B4 S.377 |
| Druckverlust-Diagramm PE-X 14/16, Leistungs-/Schnellauslegungstabelle | B4 S.378 |
| FBH-Grundlagen (Aufbau, Verlegemuster, max. ϑF) | B2 Kap.8 S.266 |
| Wärmestromdichte, Oberflächentemperatur-Formel q̇F = 11·(ϑFm−ϑi) | B2 Kap.8 S.267 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 S.53)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| q̇F = Q̇F / AF | Wärmestromdichte | W/m² |
| **q̇F = α · (ϑFm − ϑi)** | Vereinfacht (α = 11 W/(m²·K)) | W/m² |
| **q̇F = 8,92 · (ϑFm − ϑi)^1,1** | DIN EN 1264 Grenzkurve | W/m² |
| AF = Q̇F / q̇F | Erforderliche Fußbodenfläche | m² |
| Q̇F = f · Q̇N' (f=1,15) | Fußboden-Auslegungsleistung | W |
| Q̇N' = Q̇N − Q̇FB | Bereinigter Wärmebedarf | W |

*B3 Kap.5 bestätigt Grundformeln. Die vereinfachte α-Formel (11 W/m²K) ist Praxis-Näherung der DIN-Grenzkurve.*

---

## 10. B2 Kap.8 Detailergänzungen – FBH-Auslegung (S.266–267)

### 10.1 Vereinfachungs-Faktor α = 11 W/(m²·K) (B2 S.267)

Wärmeübergangskoeffizient wird in der Praxis mit **α = 11,0 W/(m²·K)** angesetzt. Daraus folgt:

- q̇F = 11 · (ϑFm − ϑi) [linear, Schnellabschätzung]
- Δϑ = q̇F / 11 [für Oberflächentemperatur-Check]

**Vergleich zur DIN-Kurve (8,92·Δϑ^1,1):**
- Bei Δϑ = 6 K: linear q̇ = 66 W/m² vs. DIN q̇ = 64 W/m² (Abweichung −3 %)
- Bei Δϑ = 10 K: linear q̇ = 110 W/m² vs. DIN q̇ = 112 W/m² (Abweichung +2 %)
→ **α=11 ist für Überschlagsrechnung ausreichend, bei präziser Auslegung DIN-Kurve verwenden.**

### 10.2 Auslegungszuschlag f = 1,15 (B2 S.266, DIN 4701 T.3)

Zur Kompensation der Wärmeabstrahlung nach unten wird **+15 % auf den bereinigten Wärmebedarf** addiert:

Q̇F = f · (Q̇N − Q̇FB) mit f = 1,15

→ Tool-Default für FBH-Auslegung bei unbekanntem Aufbau: **Q̇F = 1,15 · Φ̇HL,Raum**

### 10.3 Maximale Oberflächentemperaturen (B2 S.267)

- Aufenthaltsbereich (Bewegungsflächen): **ϑF,max ≤ 29 °C**
- Bäder, Duschen: **ϑF,max ≤ 33 °C**
- Randzonen: **ϑF,max ≤ 35 °C**

Mittlere Oberflächentemperatur **ϑFm = ϑF,max − 2 K** (Welligkeit durch Rohrabstand).

### 10.4 Verlegung (B2 S.266)

- Rohrabstand (Verlegeabstand) a = **50 – 350 mm**
- Muster: schlangenförmig (mäanderförmig) oder spiralförmig (bifilar = WP-ideal wegen gleichmäßiger Oberflächentemperatur)

---

## 11. Validierungs-Beispiele (B2 Kap.8 S.267 worked examples)

### 11.1 Beispiel Wärmestromdichte bei bekannter Oberflächentemp. (B2 S.267)

**Gegeben:** ϑi = 20 °C, ϑFm = 26,5 °C, α = 11 W/(m²·K)

q̇F = 11 · (26,5 − 20) = **71,5 W/m²**

→ Liegt unter 100 W/m² (Aufenthalt max) → **zulässig**.

### 11.2 Beispiel mittlere Oberflächentemp. aus q̇ rückgerechnet (B2 S.267)

**Gegeben:** q̇F = 75,2 W/m², ϑi = 20 °C

Δϑ = 75,2 / 11,0 = 6,84 K
ϑFm = 20 + 6,84 = **26,84 °C**
ϑF,max = ϑFm + 2 K = **28,84 °C ≤ 29 °C** → **zulässig** (knapp)

### 11.3 Beispiel Wärmestromdichte aus Raumheizlast (B2 S.267)

**Gegeben:** Φ̇HL,Raum = 1.120 W, Q̇FB (Transmission Fußboden) = 85 W, AF = 16,3 m², f = 1,15

Q̇N' = 1.120 − 85 = **1.035 W**
Q̇F = 1,15 · 1.035 = **1.190 W**
q̇F = 1.190 / 16,3 = **73,0 W/m²**

→ Tool-Ablauf bestätigt: bei 16 m² Raum und ca. 1 kW Heizlast ist q̇ ≈ 73 W/m² → VA 100 mm, ϑV ca. 40 °C (vgl. Tab. 3.8).

### 11.4 Cross-Check B2 vs. B4

| Thema | B2 Kap.8 | B4 S.372–378 | Abweichung |
|-------|----------|---------------|------------|
| α-Faktor | 11 W/(m²·K) linear | 8,92·Δϑ^1,1 DIN | B2 vereinfacht, identisch im relevanten Bereich |
| Auslegungszuschlag | f = 1,15 | – (nicht explizit) | B2 liefert diesen zusätzlich |
| max. ϑF | 29/33/35 °C | 29/33/35 °C | identisch |
| Verlegeabstand | 50–350 mm | 50–300 mm Tab. | B4 enger |

**Tool-Entscheidung:** α = 11 für Schnellabschätzung (Tool-Tooltip), für Endauslegung weiterhin B4 S.375 DIN-Kennlinie.
