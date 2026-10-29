# Bereich I – Wärmepumpe

## 1. Zweck & Anwendung im Tool

Auswahl und Auslegung der Wärmepumpe (WP) als zentraler Wärmeerzeuger. Bestimmt: Quellen-Art (LW/SW/WW), Nennleistung Q̇WP bei Normbetriebspunkt, Leistungszahl ε / COP, Jahresarbeitszahl β (JAZ), Bivalenzpunkt (bei Luft-WP), Integration mit Puffer/Heizstab. Liefert Input für Bereich H (Förderstrom intern), J (Puffer-Volumen), K (MAG/Sicherheit) und L (Regelung/Heizkurve). Zwei Modi: Exakt (Herstellerkennlinie + stündliche Temperaturverteilung) oder Richtwert (Normbetriebspunkt + JAZ-Erfahrungswert nach Quelle und System).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| **Q̇ab = Q̇zu + Pel** | Energiebilanz WP (1. Hauptsatz) | W | B1 LF12 S.719 |
| **ε = Q̇ab / Pel** | Leistungszahl (Momentanwert) | – | B1 LF12 S.721 |
| εCarnot = T / (T − T₀) | Idealprozess (T in K) | – | B1 LF12 S.721 |
| **εH = 0,5 · T / (T − T₀)** | Realwert Kompressions-WP (50 % Carnot) | – | B1 LF12 S.721 |
| **COP nach DIN EN 14511** | Prüfstand-Leistungszahl (z. B. A2/W35) | – | B1 LF12 S.721 |
| **β (JAZ) = Q̇ab,Jahr / Pel,Jahr** | Jahresarbeitszahl (inkl. Hilfs-Strom) | – | B1 LF12 S.722 |
| ΔT_Hub = T_Kond − T_Verd | Temperaturhub (je kleiner, desto besser) | K | B1 LF12 S.721 |
| Q̇WP,Bivalenz = Q̇HL · (ϑi − ϑBiv) / (ϑi − ϑn) | Leistung am Bivalenzpunkt | W | B1 LF12 S.723, Konvention |
| **Deckungsgrad α = Q̇WP / Q̇HL** | WP-Anteil an Heizlast | – | Konvention |

*Merkbeispiel (B1 LF12 S.719): Q̇ab = 6,3 kW, Pel = 2,1 kW → ε = 3,0. Ab ε ≥ 3 arbeitet WP sinnvoll CO₂-sparender als Öl/Gas bei deutschem Strommix.*

---

## 3. Tabellen & Richtwerte

### 3.1 Bezeichnungssystematik Betriebspunkte nach DIN EN 14511 (B1 LF12 S.722)

| Kürzel | Bedeutung | Beispiel |
|--------|------------|----------|
| **A x / W y** | Air (Außenluft) x °C → Water y °C Vorlauf | **A2/W35** = Luft 2 °C, VL 35 °C |
| **B x / W y** | Brine (Sole) → Wasser | B0/W35 |
| **W x / W y** | Wasser (Brunnen) → Wasser | W10/W35 |

**Standard-Auslegungspunkte:**
| Quelle | Prüfpunkt | Auslegungspunkt Deutschland |
|--------|-----------|-------------------------------|
| Luft | A2/W35 | A−7/W35 (Norm-Außentemp) |
| Sole | B0/W35 | B−5/W35 |
| Wasser | W10/W35 | W10/W35 (ganzjährig stabil) |

### 3.2 Mindest-JAZ β nach GEG / BEG-Förderung (B1 LF12 S.722)

| Quelle + Typ | β_min |
|---------------|--------|
| **Luft-WP** | **> 3,5** |
| **Sole-WP** | **> 3,8** |
| **Wasser-WP** | **> 3,8** |
| **Luft-WP Nichtwohngebäude (NWG)** | **> 4,0** |

**Auslegungsziel WP-Sanierung EFH:**
- Luft: β 3,5 – 4,0
- Sole: β 4,0 – 4,8
- Wasser: β 4,5 – 5,2

### 3.3 Wärmequellen-Vergleich (B1 LF12 S.723)

| Quelle | Temperaturbereich | Bedarf pro kW WP | Aufwand | JAZ |
|--------|---------------------|--------------------|---------|-----|
| **Außenluft (LW)** | −20 … +30 °C (Einsatz bis ca. −20 °C, Hub groß im Winter) | Ventilator, Fläche für Außengerät | gering | **3,0 – 4,0** |
| **Erdsonde (SW-Tief)** | ca. 10 °C ganzjährig | Bohrung ca. 20 m / kW (bis 100 m) | hoch, Genehmigung | **4,0 – 4,8** |
| **Erdkollektor flach (SW-Flach)** | 1,3 – 1,8 m Tiefe, 5–12 °C | ca. 30 m² / kW | mittel, große Gartenfläche | **3,8 – 4,5** |
| **Grundwasser (WW)** | ~ 10 °C ganzjährig | Förder- + Schluckbrunnen | hoch, Wasserrechtsgenehmigung | **4,5 – 5,5** |
| Abluft | ~ 20 °C (aus Wohnung) | Lüftungssystem | gering | 2,5 – 3,5 |
| Abwärme | je nach Quelle | Spezial | projektabhängig | 4,0 – 6,0 |

### 3.4 Kompressions- vs. Absorptions-WP (B1 LF12 S.720)

| Aspekt | Kompression | Absorption |
|--------|---------------|-------------|
| Antrieb | Elektromotor (Verdichter) | Wärme (Gasflamme, Solar) |
| Verbreitung | Wohnbau Standard | Industrie, KWK, Gas-WP |
| Kältemittel | R32, R290, R454B, R744 | Wasser/LiBr, NH₃/H₂O |
| ε / COP | 3 – 5 | 1,3 – 1,7 (thermisch) |
| GEG-Relevanz | **Standard Sanierung** | selten |

### 3.5 Kältemittel-Kurzübersicht (Konvention, B1 LF12 S.730)

| Kältemittel | GWP | Typ WP | Bemerkung |
|--------------|------|---------|-----------|
| **R32** | 675 | LW/SW-Split | aktueller Standard |
| **R290 (Propan)** | 3 | Luft-Monoblock | natürlich, zukunftsfähig, brennbar |
| R454B | 466 | LW-Split | R32-Nachfolger |
| R744 (CO₂) | 1 | Hochtemperatur-WP, TWW | > 80 °C möglich |
| R134a | 1.430 | Altgeräte | EU-Phase-out |

### 3.6 Kennwerte Verdichter / Inverter (B1 LF12 S.730)

| Bauart | Modulation | Typ. Einsatz |
|--------|--------------|----------------|
| Rollkolben | 30 – 100 % (Inverter) | **EFH-WP Standard** |
| Scroll | 50 – 100 % | größere WP, MFH |
| Schraubenverdichter | 25 – 100 % | Industrie |
| Kolben | fest / 2-stufig | alt, kaum neu |

**Inverter-Vorteile:** leistungsmodulierend, weniger Takte, JAZ-Bonus ≈ 0,3 – 0,5, höhere Lebensdauer.

### 3.7 Bivalenz-Konzepte Luft-WP (Konvention)

| Konzept | Bivalenzpunkt ϑBiv | Zusatzheizer | Anwendung |
|---------|----------------------|----------------|------------|
| **Monoenergetisch** | −5 … −7 °C | **Elektro-Heizstab (1–9 kW)** | **Standard-Sanierung EFH** |
| Monovalent | ϑn erreicht | keiner | nur Sole/Wasser ≤ 12 kW |
| Bivalent-parallel | 0 … −3 °C | Gas/Öl-Kessel | Hybrid-Sanierung |
| Bivalent-alternativ | +3 … 0 °C | Kessel | Sanierung großer Altbau |

### 3.8 WP-Leistung und JAZ-Deckung (BEG-Konvention)

| α (Deckungsgrad) | Betriebsart | Kommentar |
|--------------------|--------------|------------|
| 100 % (monovalent) | nur WP | Sole/Wasser |
| **~ 95 – 98 %** | **monoenergetisch** | **E-Stab deckt Rest an ≤ ϑBiv** |
| 60 – 80 % | bivalent-parallel | Hybrid Gas + WP |
| < 60 % | bivalent-alternativ | WP als Grundlast |

### 3.9 Typische WP-Dimensionierung nach Heizlast EFH

| Q̇HL [kW] | Luft-WP (Monoblock) | Sole-WP | E-Stab | Puffer |
|------------|----------------------|---------|---------|---------|
| 3 – 5 | 4 / 6 kW | 4 / 6 kW | 3 kW | 40 – 80 L |
| 5 – 8 | 6 / 8 / 10 kW | 6 / 8 kW | 6 kW | 80 – 200 L |
| **8 – 12** | **10 / 12 kW** | **10 / 12 kW** | **6 – 9 kW** | **200 – 400 L** |
| 12 – 16 | 14 / 16 kW | 14 / 16 kW | 9 kW | 400 – 500 L |

### 3.10 Schalltechnische Beurteilung Luft-WP nach LSV CH (Anhang 6)

**Maßgebend in der Schweiz:** Lärmschutz-Verordnung LSV (SR 814.41) Anhang 6 «Industrie- und Gewerbelärm». WP gelten als ortsfeste Anlage (Neuanlage: Lr ≤ Planungswert; bestehende: Lr ≤ Immissionsgrenzwert). Vollzugshilfe **Cercle Bruit 6.21** «Lärmrechtliche Beurteilung von Luft/Wasser-Wärmepumpen» konkretisiert die Methode für WP. Ab **01.11.2024** wird Tag- und Nacht-Beurteilung einheitlich aus dem Schallleistungspegel **L_WA bei 2 °C Aussentemperatur** geführt (= konservativer Auslegungspunkt im Heizbetrieb).

**Beurteilungspegel-Formel (LSV Anhang 6 Ziff. 32):**

```
Lr = Leq + K1 + K2 + K3 + 10·log₁₀(t / t₀)
```

| Symbol | Bedeutung | Wert |
|--------|-----------|------|
| **L_eq** | Mittlerer A-Schalldruckpegel am Immissionsort | aus L_WA + Ausbreitungsdämpfung + Richtfaktor − Massnahmen |
| **K1**  | Niveau-Korrektur Anlagenart | **Tag 5 dB, Nacht 10 dB** für WP (CB 6.21) |
| **K2**  | Tonhaltigkeit | 0 / +2 / +4 / +6 dB (nicht / schwach / deutlich / stark hörbar) |
| **K3**  | Impulshaltigkeit | 0 / +2 / +4 / +6 dB (nicht / schwach / deutlich / stark) |
| **t / t₀** | Betriebsdauer-Korrektur | t = mittl. tägl. Betriebsdauer in min, t₀ = 720 min/Periode (Tag oder Nacht je 12 h) |

Standard-Defaults Cercle Bruit (Planung): K1 = 5 dB Tag / 10 dB Nacht; K2 = +2 dB (schwach hörbar) bzw. +4 dB bei Kompressor mit Schalldämpfer; K3 = 0 dB (Inverter, keine Impulse); 10·log(t/t₀) = 0 dB (Dauerbetrieb angenommen).

**L_eq am Empfänger (Halbraum-Freifeld-Modell, Cercle Bruit 6.21):**

```
Leq = L_WA − 8 − 20·log₁₀(r) + DI − Σ Massnahmen
```

- 8 dB = Halbraum-Geometrie über reflektierender Bodenfläche (nicht 11 dB Vollraum).
- 20·log₁₀(r) = Distanzdämpfung bei Punktquelle, r in m (mind. 1 m).
- **DI = Richtwirkungs-Korrektur** je Aufstellung (Cercle Bruit 6.21 Tab. 2):

| Code | Aufstellung | DI [dB] |
|------|-------------|---------|
| dc1 | Schacht freistehend (> 3 m zur Wand) | **0** |
| dc2 | Fassadenöffnung / Schacht an Fassade (< 3 m) | **+3** |
| dc3 | Fassadenöffnung in einspringender Fassadenecke | **+6** |
| dc4 | Fassade, Empfänger an gleicher Fassade | **+3** |
| dc5 | Ecke, Empfänger an gleicher Fassade | **+6** |

- **Σ Massnahmen** = Schall-mindernde Massnahmen (additiv abgezogen):
  - Wetterschutzgitter schallgedämmt: bis −3 dB
  - Schacht 1,5–2 m tief: bis −5 bis −6 dB
  - Schalldämmhaube (Hersteller): nach Datenblatt
  - Flüstermodus (Hersteller, zeitgesteuert): Differenz L_WA(normal) − L_WA(Flüster)

**Belastungsgrenzwerte LSV Anhang 6 Ziff. 2 (Industrie- und Gewerbelärm):**

| Empfindlichkeitsstufe ES | **Planungswert PW** | Immissionsgrenzwert IGW | Alarmwert |
|---|---|---|---|
| | **Tag / Nacht [dB(A)]** | Tag / Nacht | Tag / Nacht |
| **ES I** (Erholungszone) | **50 / 40** | 55 / 45 | 65 / 60 |
| **ES II** (Wohnzone) | **55 / 45** | 60 / 50 | 70 / 65 |
| **ES III** (Misch-/Gewerbezone) | **60 / 50** | 65 / 55 | 70 / 65 |
| **ES IV** (Industriezone) | **65 / 55** | 70 / 60 | 75 / 70 |

Tag = 07:00–19:00 Uhr · Nacht = 19:00–07:00 Uhr. ES-Zuordnung aus kommunalem Zonen-/Empfindlichkeitsstufenplan (Cercle Bruit 2.12).

**Zielkriterium WP-Neuanlage:** Lr_Tag ≤ PW_Tag UND Lr_Nacht ≤ PW_Nacht am Fenster eines lärmempfindlichen Raums (Wohn-/Schlafzimmer) auf dem Nachbargrundstück, gemessen 1 m vor dem Fenster. Vorsorgeprinzip USG Art. 11: zusätzlich „so weit wie technisch und betrieblich möglich und wirtschaftlich tragbar".

**Methoden-Spiegel — FWS-Schallrechner (Online-Tool fws.ch/laermschutznachweis/, basiert auf Cercle Bruit 6.21):**

Eingaben FWS-Tool und ihre Mappung auf die Tool-Variablen:

| FWS-Feld | Tool-Variable | Bedeutung |
|----------|---------------|-----------|
| `audibility_a2` | `lwaA2` | L_WA der WP bei A2/W35 [dB(A)] |
| `audibility_erp` | `lwaErp` | L_WA gemäss ErP-Datenblatt (alternativ) |
| `acoustic_power_a2_measure4` | `lwaSilent` | L_WA im Flüstermodus |
| `setting` | `aufstellung` | inside / outside / split |
| `sensitive_rooms` | `empfRaum` | rooms_in_apartments / rooms_in_businesses |
| `planning_value` | `es` | ES I / ES II / ES III / ES IV |
| `directivity_correction` | `di` | dc1…dc5 (Tab. 3.10) |
| `distance` | `r` | Abstand WP ↔ Empfänger [m] |
| `noise_abatement_measure1` | `dWetterschutz` | Wetterschutzgitter −3 dB |
| `noise_abatement_measure2` | `dSchacht` | Schacht 1.5–2m −5 dB |
| `noise_abatement_measure_other1/2` | `dCustom1/2` | Andere Massnahmen mit eigenem Wert |
| `noise_abatement_measure4` | `flusterAktiv` + Zeitfenster | Flüstermodus (zeitgesteuert) |
| `cascading_heatpumps` + `_number` | `nKaskade` | n WP in Kaskade → +10·log(n) |
| `audibility` | `k2` | k2at1=0 / k2at2=+2 / k2at3=+4 / k2at4=+6 dB |
| `impulse_audibility` | `k3` | k3ai1=0 / k3ai2=+2 / k3ai3=+4 / k3ai4=+6 dB |
| `volume_correction` | `k4` (Betriebszeit) | k4lc1=Dauer / k4lc2=eingeschr. Nacht / k4lc3=nur Tag |
| `blocked_operation_from/to` | `sperrzeit` | EVU-Sperrzeit Nachtbetrieb |

Quellen: [FWS Lärmschutznachweis](https://www.fws.ch/laermschutznachweis/), [Reglement 2024-10-07](https://www.fws.ch/wp-content/uploads/2024/10/241007_Reglement_Webapplikation_LSV-de.pdf), [Cercle Bruit 6.21](https://www.cerclebruit.ch/enforcement/6/CB_Vollzugshilfe_621_Waermepumpen_DE.pdf), [LSV SR 814.41 Anhang 6](https://www.fedlex.admin.ch/eli/cc/1987/338_338_338/de).

### 3.11 R290-Sicherheitszonen (SN EN 378-1/-3, SUVA 66161, EKAS 6517)

R290 (Propan, GWP=3) ist nach SN EN 378 Sicherheitsklasse **A3** (gering toxisch, **brennbar**). Schwerer als Luft → sammelt sich in Senken. **Aufstellung nur im Freien** für typische Monoblock-EFH-WP (≤ 0,494 kg Füllung in geschlossenen Räumen ohne Zusatzmassnahmen sehr restriktiv → in Praxis Aussenaufstellung).

**Mindestabstände im Freien (Konvention SN EN 378-3 / Hersteller-Praxis Alpha innotec, NIBE, Viessmann, Vaillant):**

| Schutzziel | Mindestabstand |
|------------|----------------|
| Fenster, Türen lärmempfindlicher Räume | **≥ 1,0 m** (oft 1,5 m je Hersteller) |
| Lüftungsöffnungen / Aussenluft-Ansaug | ≥ 1,0 m |
| **Lichtschacht / Kellerschacht / Kellerabgang** | **≥ 1,0 m horizontal + Schacht muss höher liegen oder oben offen** |
| Fallrohr / Kanalisations-Schacht | ≥ 1,0 m, Schacht abgedichtet |
| Senke / Mulde / Geländevertiefung | **Aufstellung verboten** (Propan sammelt sich) |
| Zündquelle (Schaltschrank, offene Flamme) | gemäss Ex-Zonenplan (typ. 1–2 m horizontal + 0,5 m vertikal) |

**Ex-Zone (SN EN 378-3 Anhang B):**
- **Zone 2** rund um WP-Aussengerät: zylindrisch 1 m Radius × 1,5 m Höhe ab Boden (für Füllmenge ≤ 1 kg R290; bei grösserer Füllung erweitert).
- Innerhalb Zone 2 dürfen keine Zündquellen (Steckdosen IP54+ erforderlich, keine Kellerschächte mit Fenstern, keine Lüftungsabsaugung).
- **Zone 1** existiert bei Aussenaufstellung normalerweise nicht (nur in geschlossenen Aufstellräumen mit Leckage-Sammelraum).

**Praxis-Regeln Aufstellung:**
1. Freie Aussenaufstellung auf festem Untergrund, nicht in Senke/Mulde.
2. Mindestens 1 m allseitig zu Wänden/Öffnungen freihalten.
3. Lichtschacht **niemals direkt unter** WP — wenn vorhanden, ≥ 1 m horizontaler Abstand UND Schacht-Oberkante über WP-Sockel (Propan kann nicht „abkippen").
4. Kanalisationszuläufe in Aufstellnähe abdichten (Geruchsverschluss reicht).
5. Aufkleber Ex-Zone an Gerät, Schaltkasten ausserhalb Zone 2 oder Ex-geschützt.
6. Wartungsraum 0,5 m allseitig zusätzlich (Hersteller-Vorgabe).

**Quellen:** [SUVA 66161 Wärmepumpen mit brennbaren Kältemitteln](https://www.suva.ch/de-CH/material/Richtlinien-Gesetzestexte/66161-d-waermepumpen) (von Daniel zu beschaffen), [EKAS Richtlinie 6517](https://www.ekas.admin.ch/), SN EN 378-1/-3:2017, [Alpha innotec R290 Sicherheitsabstände PDF](https://www.alpha-innotec.ch/fileadmin/content/documents/deutsch/03%20Luft-Wasser%20Aussen/06%20Aufstellungshinweise/Sicherheitsabstaende_R290.pdf).

### 3.12 TRY-Bins Schweiz (Bin-Methode VDI 4650)

Stundenhäufigkeit der Aussentemperatur über Heizperiode (≈ 5500 h, T_ext ≤ Heizgrenze 15 °C). Vereinfachte Verteilung Mittelland (basis SIA 2028 + DWD-TRY adaptiert auf Norm-Aussentemp ϑn = −8 °C):

| Bin ϑa [°C] | Klassenmitte | Stunden h_i (Mittelland, ϑn=−8 °C) |
|-------------|-------------:|-----------------------------------:|
| < −10 | −12 | 80 |
| −10 … −5 | −7 | 350 |
| −5 … 0 | −2 | 900 |
| 0 … +5 | +2 | 1500 |
| +5 … +10 | +7 | 1700 |
| +10 … +15 | +12 | 970 |
| **Summe Heizperiode** |  | **5500 h** |

Anpassung Klimaregion (Multiplikator auf Bin-Stunden, additiv summenneutral):

| Region | ϑn [°C] | Bin-Verschiebung |
|--------|--------:|------------------|
| Mittelland (Standard) | −8 | Tabelle wie oben |
| Alpennordhang (z.B. Davos 1560 m) | −15 | tiefe Bins (< −5) ×2.0; mittlere Bins ×0.8 |
| Alpensüd / Tessin (Lugano) | −5 | tiefe Bins ×0.4; obere Bins ×1.2 |

Quelle: [SIA 2028 Klimadaten](https://www.sia.ch/de/dienstleistungen/sia-norm/) (Daniel hat bereits `data/klimadaten-ch.json` mit ϑn und Heizgrenztemperatur — Bins werden daraus algorithmisch erzeugt: Heizgradtage / Bin-Anteil je 5°C-Klasse).

### 3.13 Schallkurz: Cercle-Bruit-Defaults für Auto-Fill

Default-Werte, die Tool im Schall-Block bei „Auto" einsetzen darf (Cercle Bruit 6.21 Empfehlung Planung):

| Feld | Default | Quelle |
|------|---------|--------|
| K1 (Tag) | 5 dB | CB 6.21 Tab. 1 |
| K1 (Nacht) | 10 dB | CB 6.21 Tab. 1 |
| K2 (Tonhaltigkeit) | +2 dB (schwach hörbar) | CB 6.21 §3.2 (Inverter-Kompressor Standard) |
| K3 (Impulshaltigkeit) | 0 dB (nicht hörbar) | CB 6.21 §3.3 (moderne Inverter ohne Schaltimpulse) |
| t/t₀ | 1 (Dauerbetrieb) | konservativ; bei Sperrzeit/Flüstermodus reduziert |
| DI (Richtfaktor) | dc2 = +3 dB | CB 6.21 Tab. 2 (Standard Anbau Aussenwand) |
| ES-Default | ES II Wohnzone | LSV Art. 43 (häufigster Fall EFH) |

---

## 4. Exakt-Modus Workflow

### Schritt 1 – Heizlast + TWW
Q̇HL aus Bereich C (DIN EN 12831). Zusätzlich Q̇TWW-Sperrzeit-Reserve + ca. 0,2 kW/Person aus Bereich D.

### Schritt 2 – Auslegungspunkt wählen
- LW: A−7/W_Vorlauf_Heizkreis (Bereich E/F).
- SW: B0/W_Vorlauf.
- WW: W10/W_Vorlauf.
Vorlauf so niedrig wie möglich halten (FBH < HK) → kleiner Hub → hohe JAZ.

### Schritt 3 – Herstellerkennlinie
Hersteller-Datenblatt: Q̇WP(ϑQuelle, ϑVL) und COP(ϑQuelle, ϑVL). Punkt im Diagramm suchen → Q̇WP(Ausleg).

### Schritt 4 – Bivalenzpunkt (Luft-WP)
Schnittpunkt Gebäude-Heizlastgerade (Q̇HL · (ϑi − ϑa)/(ϑi − ϑn)) mit WP-Leistungsgerade.
- Unterdimensionierung (WP-Q̇ < HL) bei ϑBiv → E-Heizstab.
- Ziel: ϑBiv −5 bis −7 °C (monoenergetisch).

### Schritt 5 – JAZ-Abschätzung nach VDI 4650
β = Σ(Q̇ab,i · h_i) / Σ(Pel,i · h_i + P_Hilfs).
Tool nutzt Temperatur-Stundenhäufigkeit (TRY) × COP-Kennlinie.

### Schritt 6 – Heizstab / Hilfsleistung
P_Heizstab = Q̇HL(ϑn) − Q̇WP(ϑn). Typisch 2–9 kW. 3×400 V-Anschluss.

### Schritt 7 – Hydraulische Einbindung
- Direkt: WP → Heizkreis (nur FBH, großer Wasserinhalt, keine ERR).
- Mit Weiche / Puffer (Reihen- oder Parallelpuffer) bei HK-Systemen mit ERR.
- Mindestumlauf WP (Hersteller, oft 25 – 40 % Nenn-V̇) muss garantiert sein.

### Schritt 8 – TWW-Einbindung
Monovalent mit WP (40–55 °C) + periodischer Legionellenschaltung (Heizstab/E-Patrone) → Bereich D.

### Schritt 9 – Regelung
Heizkurve (Bereich L), witterungsgeführt, Warmwasser-Vorrang, Nachtabsenkung nur bei WP ≈ aus (bei Inverter oft kontraproduktiv).

### Schritt 10 – Kontrolle
- Prüfe ε (real) ≥ 3,0 im Auslegungspunkt.
- Prüfe Taktfrequenz ≤ 3/h unter Teillast.
- Prüfe JAZ-Ziel (Tab. 3.2).

---

## 5. Richtwert-Modus Workflow (Sanierung)

1. **Heizlast** Q̇HL aus Bereich C (oder 50 W/m² als Sanierungs-Default).
2. **Quellen-Wahl:**
   - Kein Garten / einfach: **Luft-WP Monoblock Außenaufstellung**
   - Garten > 200 m² + Dämmung: **Sole-Flachkollektor**
   - Genehmigung + Brunnen: **Grundwasser-WP**
3. **Leistungswahl** aus Tab. 3.9 nach Q̇HL.
   - **Faustregel Luft-WP (monoenergetisch):** Q̇WP,A−7/W35 ≈ 0,9 · Q̇HL, E-Stab 6 kW.
   - **Sole-WP monovalent:** Q̇WP,B−5/W35 ≥ Q̇HL + 2 kW TWW-Reserve.
4. **Vorlauftemperatur** aus Bereich E/F übernehmen (Ziel ≤ 55 °C, optimal ≤ 45 °C).
5. **JAZ-Erwartung** aus Tab. 3.2 als Plausibilität.
6. **Puffer** aus Tab. 3.9 / Bereich J.
7. **E-Stab** 6 kW Standard (3×400 V, separate Absicherung 3×16 A).
8. **Aufstellung / Schall** nach TA Lärm (Tab. 3.10), Abstand zum Nachbarn ≥ 3 m.
9. **Förderung prüfen:** BEG EM / BEG EH 2025, Zuschuss an β und Kältemittel (R290-Bonus).

**Standard-Default für 150 m² EFH saniert, Q̇HL = 8 kW, VL 45 °C:**
- Luft-Monoblock 10 kW (A−7/W35 ≈ 7 kW) + 6 kW E-Stab
- JAZ-Ziel β ≈ 3,8
- Puffer 200 L + TWW-Speicher 300 L (Bereich J)
- Kältemittel R290 (förderbonus)

---

## 6. Plausibilitätsprüfungen

- Vorlauftemperatur > 55 °C → WP-Bereich verlassen, Heizflächen vergrößern.
- WP überdimensioniert (> 1,2 · Q̇HL bei Luft) → taktet, JAZ sinkt.
- WP unterdimensioniert (< 0,7 · Q̇HL bei Luft) → E-Stab dominiert, JAZ unter GEG-Grenzwert.
- Bivalenzpunkt wärmer als −3 °C bei Luft-WP → WP zu klein oder HL falsch.
- Bivalenzpunkt kälter als −10 °C → WP zu groß.
- ε_Carnot-Ausnutzungsgrad < 40 % (Wirkungsgradfaktor) → Wärmetauscher/Prozess ineffizient.
- Quellenauslegung: Sole > 30 W/m Entzugsleistung (Sonde) → Auskühlgefahr.
- Grundwasser-Förderstrom < 0,2 m³/h je kW → zu klein, Abschaltrisiko.
- Takt/h > 3 im Teillast → Inverter überdimensioniert oder Puffer zu klein.
- TWW-Vorlauf > 55 °C ohne Heizstab-Option → Legionellenrisiko oder JAZ-Verlust.
- Schallpegel nachts > 35 dB(A) am Nachbargrundstück → Aufstellungsort korrigieren, Schalldämmhaube.
- Hilfsstromverbrauch (Ventilator, Pumpen, Abtauen) > 10 % des WP-Stroms → JAZ-Minderung berücksichtigen.
- Monoblock ohne Frostschutz-Glykol + Absperrung → Zuleitung > 1,5 m unfrei → Frostschaden.
- Kältemittel R290: Aufstellungsraum muss VDE-/DIN EN 378-konform sein (Außen, keine Kellerschächte).

---

## 7. Normenverweise

- **DIN EN 14511-1/-2/-3/-4** (Prüfung Leistung & COP bei Normbetriebspunkten)
- **DIN EN 14825** (saisonale Effizienz SCOP für ErP-Label)
- **VDI 4650 Bl. 1** (Berechnung JAZ Kompressions-WP)
- **VDI 4640 Bl. 1/2** (Erdwärmenutzung, Entzugsleistungen, Abstände)
- **DIN 8960** (Kältemittel, Stoffwerte)
- **DIN EN 378** (Kälteanlagen-Sicherheit, Kältemittelmengen)
- **DIN EN 12831-1** (Heizlast als Input)
- **VDI 2035** (Wasserqualität)
- **TA Lärm** / **DIN 4109** (Schallimmissionsschutz DE — Vergleichsbasis)
- **LSV CH** (Lärmschutz-Verordnung SR 814.41 Anhang 6) — verbindlich CH
- **Cercle Bruit Vollzugshilfe 6.21** (WP-Lärmbeurteilung CH-Konkretisierung)
- **SN EN 378-1/-3** (Kälteanlagen-Sicherheit, Füllmengen, Ex-Zonen)
- **SUVA 66161** (WP mit brennbaren Kältemitteln R290)
- **EKAS Richtlinie 6517** (Brennbare Stoffe, Sicherheitsabstände)
- **GEG § 71 Abs. 3 Nr. 4** (Wärmepumpe als Erfüllung 65-%-EE-Pflicht — DE)
- **BEG EM / BEG EH 2025** (Förderung DE, β-Mindestwerte, R290-Bonus)
- **DIN V 18599** (Gesamtenergetische Bewertung, JAZ als Faktor)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| WP-Grundlagen, Schema, Bilanz Q̇ab = Q̇zu + Pel, Beispiel Leistungszahl 3 | B1 LF12 S.719 |
| Kompressions- vs. Absorptionswärmepumpen (Typen, Antrieb, Einsatz) | B1 LF12 S.720 |
| Leistungszahl εH = 0,5 · T/(T−T₀), COP nach DIN EN 14511, Carnot, Hub | B1 LF12 S.721 |
| JAZ-Mindestwerte (LW > 3,5; SW/WW > 3,8; NWG > 4,0), Bezeichnungssystematik A2/W35 etc. | B1 LF12 S.722 |
| Wärmequellen: Luft −20…+30 °C, Grundwasser, Sole Flach 1,3–1,8 m, Erdsonde bis 100 m | B1 LF12 S.723 |
| Rollkolbenverdichter, Inverter-Modulation, Expansionsventil, LW-Winter-Ineffizienz | B1 LF12 S.730 |
| Kesselwirkungsgrad, feuerungstechn. Grundlagen (Vergleichsbasis zu WP) | B1 LF09 S.557 |
| WP-Wirtschaftlichkeit, Carnot-Bezug, JAZ-Auslegungsbeispiele | B2 Kap.4 S.136–137 |
| Heizlast/Bivalenz Detail Heizung, Heizgrenztemperatur, Heizleistungs-Linie | B2 Kap.8 S.228–238 |
| WP/Solar-Formeln Quick-Ref (ε_theor, ε_real, β JAZ) | **B3 Kap.8 S.79–80** |
| Heizungs-Formeln Heizlast/Vorlauf | B3 Kap.5 S.51–54 |
| TWE-WP-Beispielrechnungen (Carnot, JAZ, Energiebilanz) | B5 Kap.4 |
| Heizungs-/WP-Beispielaufgaben (Heizlast → WP-Auslegung, Bivalenz) | B5 Kap.8 S.130–145 |
| Beurteilungspegel Lr = Leq + K1+K2+K3 + 10·log(t/t₀) | LSV SR 814.41 Anhang 6 Ziff. 32 |
| Belastungsgrenzwerte ES I/II/III/IV Tag/Nacht | LSV Anhang 6 Ziff. 2 |
| K1=5/10 dB Tag/Nacht WP, K2-/K3-Korrekturen, Halbraum-Modell, DI-Tabelle dc1–dc5 | Cercle Bruit Vollzugshilfe 6.21 |
| FWS-Schallrechner Eingabefeld-Mapping, L_WA bei A2 als Auslegungspunkt ab 11/2024 | FWS Reglement Webapplikation 2024-10-07 |
| R290-Mindestabstände 1 m zu Öffnungen/Lichtschacht, Verbot Senke/Mulde, Zone-2-Zylinder | SN EN 378-1/-3, SUVA 66161, EKAS 6517 |
| TRY-Bin-Verteilung Mittelland, Klimaregion-Anpassung | abgeleitet aus SIA 2028 + DWD-TRY |
| VDI 4650-1 Korrekturfaktoren F_Δϑ / F_HW / F_P, JAZ-Bin-Methode | VDI 4650-1:2019 Tab. 13–18 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 + Kap.8)

### 9.1 Heizungs-/WP-Energiebilanz (B3 Kap.5 S.51–54)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| **Q̇H = Q̇HL · fx** | Auslegungsleistung WE | W |
| Q̇(ϑa) = Q̇HL · (ϑi − ϑa)/(ϑi − ϑn) | Heizlast bei aktueller Außentemp. | W |

### 9.2 ⭐ WP-Kennzahlen (B3 Kap.8 S.79–80)

| Formel | Bedeutung |
|--------|-----------|
| **εtheor = TN / (TN − TQ)** | Carnot-Leistungszahl (T in Kelvin!) |
| **εreal = εtheor · ν = Q̇N / Pel** | Reale momentane Leistungszahl (ν = Gütegrad ≈ 0,4–0,5) |
| **β = QWP,Jahr / Wel,Jahr** | Jahresarbeitszahl (JAZ) |
| Q̇ab = Q̇zu + Pel | Energiebilanz WP (1. HS) |
| ΔT_Hub = TN − TQ | Temperaturhub (kleiner = besser) |

*B3 Kap.8 ist die kompakte Quick-Reference für alle WP-Berechnungen. Identisch zu B1 LF12 S.721. Tool nutzt B3 als formale Kurz-Referenz.*

**Beispiel (B3-konform):** Luft-WP A−7/W45 → TN = 318 K, TQ = 266 K → εtheor = 318/52 = **6,12** · ν=0,45 → εreal ≈ **2,75**. JAZ-Erwartung über Jahr ca. **3,5–3,8** (gewichtetes TRY).

---

## 10. B2 Detailergänzungen – Kap.4 S.136–137 & Kap.8 S.228–238

### 10.1 WP-Kennzahlen-Detail (B2 Kap.4 S.136–137)

**Theoretische Carnot-Leistungszahl (B2 S.136):**
ε_th = T_K / (T_K − T_V)
- T_K = Kondensator-(Heizmittel-)Temperatur in K
- T_V = Verdampfer-(Quellen-)Temperatur in K
- Maximaler thermodynamisch möglicher Wert.

**Reale Leistungszahl (B2 S.136–137):**
ε_real = Q̇_N / P_el = ν · ε_th
- **ν (Gütegrad) typisch 0,40 – 0,55** je nach Verdichter-Bauart und Wärmetauscher-Auslegung.
- Inverter-Scroll-Verdichter (modern): ν bis 0,55.
- Hubkolben (alt): ν 0,35 – 0,40.

**Jahresarbeitszahl β (B2 S.137):**
β = Σ(Q̇_ab,i · h_i) / Σ(P_el,i · h_i + P_Hilfs,i · h_i)
- enthält Hilfsstromverbrauch (Ventilator LW-WP, Quellenpumpe SW-WP).
- VDI 4650-1 standardisiert TRY-basierte Berechnung.
- BEG-Förderung an β gekoppelt (Tab. 3.2).

**Worked Example B2 S.137:**
- Sole-WP B0/W35 → T_K = 308 K, T_V = 273 K → ε_th = 308/35 = **8,8**
- ν = 0,50 → ε_real = **4,4**
- über Jahr: β ≈ **4,5** (typisch SW-WP mit FBH).

### 10.2 Heizgrenztemperatur & Bivalenzpunkt (B2 Kap.8 S.228, S.238)

**Heizleistungslinie Gebäude (B2 S.228):**
Q̇(ϑa) = Q̇HL · (ϑi − ϑa) / (ϑi − ϑn)
→ Lineare Abhängigkeit der momentanen Heizlast von der Außentemperatur.

**Bivalenzpunkt-Konstruktion:**
1. Heizleistungslinie Gebäude (linear, fallend mit steigender ϑa) eintragen.
2. WP-Leistungskennlinie (steigend mit ϑa, Hersteller-Diagramm).
3. **Schnittpunkt = Bivalenzpunkt ϑBiv.**
4. Unterhalb ϑBiv → Heizstab/Zweitkessel deckt Differenz.

**Wirtschaftliche Auslegung Luft-WP (B2 S.238):**
- ϑBiv zwischen **−5 °C und −7 °C** → 95–98 % Energiedeckung WP, 2–5 % E-Stab.
- ϑBiv > −3 °C → WP zu klein, E-Stab dominiert (JAZ < 3,0 → BEG-Verlust).
- ϑBiv < −10 °C → WP überdimensioniert, taktet im Sommer.

**Tool-Logik:** Default ϑBiv = −5 °C; Schnittpunkt-Berechnung iterativ aus Q̇HL + WP-Datenblatt-Kennlinie.

### 10.3 VDI 4650-1 Bin-Methode — Korrekturfaktoren (Ausgabe März 2019)

**Grundprinzip:** Aus Hersteller-COP an wenigen Prüfpunkten (A−7/W35, A2/W35, A7/W35 etc.) wird die JAZ über die Heizperiode geschätzt, indem ϑa in 5 °C-Bins gestaffelt mit der Stundenhäufigkeit gewichtet und der COP per Korrekturfaktoren auf die jeweils realen Betriebsbedingungen angepasst wird.

**Vereinfachte Tool-Formel:**

```
β = Σ_i (Q̇_HL(ϑa_i) · h_i)
   ─────────────────────────────────────
   Σ_i (Q̇_HL(ϑa_i) / COP_korr,i · h_i)  +  P_aux,Pumpen · 5500 h
```

mit `Q̇_HL(ϑa_i) = Q̇_HL · (ϑi − ϑa_i) / (ϑi − ϑn)` aus §10.2 und

```
COP_korr,i = COP_DB(ϑa_i, ϑVL) · F_Δϑ · F_HW · F_P
```

wobei `COP_DB` aus dem Hersteller-Datenblatt linear zwischen Prüfpunkten interpoliert wird.

**Korrekturfaktoren VDI 4650-1 (Tab. 13–18 vereinfacht für Tool-Anwendung):**

| Faktor | Bedeutung | Wert (Tool-Default) |
|--------|-----------|---------------------|
| **F_Δϑ** | Spreizung Heizkreis ≠ Norm-Spreizung | LW-WP Norm 5 K · FBH 5–7 K → F_Δϑ = 1,00; HK 10–15 K → F_Δϑ = 0,98 ; SW-WP/WW Norm 7 K → F_Δϑ = 1,00 |
| **F_HW** | Heizgrenze ≠ 15 °C | HG 15 °C → 1,00 (Standard EFH ungedämmt); HG 12 °C → 0,98; HG 10 °C → 0,96 |
| **F_P** | Hilfsstrom Quellenpumpe (nur SW/WW) | Standard 1,000 ; Hocheffizienzpumpe 1,035 (JAZ-Bonus); LW-WP/Direktverdampfung F_P = 1 |

**Anteils-Zerlegung Heizstab (monoenergetisch):**

```
Q_WP = Σ_i min(Q̇_HL(ϑa_i), Q̇_WP(ϑa_i)) · h_i
Q_HS = Σ_i max(0, Q̇_HL(ϑa_i) − Q̇_WP(ϑa_i)) · h_i
α = Q_WP / (Q_WP + Q_HS)        [Deckungsgrad WP]
β_System = (Q_WP + Q_HS) / (Q_WP/COP̄ + Q_HS/η_HS + P_Hilfs · h_Heiz)
```

mit η_HS = 1,0 (Heizstab direkt) und COP̄ = bin-gewichteter WP-Mittel-COP.

**Pumpen-Kopplung (Phase 9):** P_aux liest sich aus `state.stamm.pumpen[].kandidaten[0].pumpe.pNenn` (alle ausgewählten Heizkreis-Pumpen + Quellenpumpe) — Annahme: 80 % Laufzeit über Heizperiode → P_aux,eff ≈ 0,8 · Σ P_Pumpe.

**Q_W-Anteil (Phase 10):** zu Q_WP wird `state.stamm.warmwasser.qWp,Jahr` addiert (TWW-Anteil aus Phase 10) — die WP läuft auch im Sommer für TWW; in den Sommerstunden (3260 h ausserhalb Heizperiode) gilt ein anderer COP (typ. A20/W50 → COP ≈ 2,8 für Luft).

**Tool-Plausibilität nach Berechnung:**
- α ≥ 0,95 (monoenergetisch) ⇒ ϑBiv ∈ [−7 …−5 °C] ✓
- β_System ≥ Tab. 3.2-Mindestwert (LW > 3,5 / SW > 3,8 / WW > 3,8)
- Wenn β < Tab. 3.2: WP zu klein oder VL zu hoch — UI-Warnung.

Quelle: [VDI 4650-1:2019](https://www.vdi.de/richtlinien/unsere-richtlinien-highlights/vdi-4650), Erläuterung [TGA-Fachplaner](https://www.tga-fachplaner.de/heizungstechnik/vdi-4650-blatt-1-teil-2-berechnungshintergruende-des-verfahrens-energetische), [SBZ-Online](https://www.sbz-online.de/top-thema/vdi-4650-blatt-1-beschreibung-des-verfahrens-energetische-bewertung-von-waermepumpen).

---

## 11. Validierungs-Beispiele (B5 Kap.4 + Kap.8 S.130–145)

### 11.1 WP-Carnot-Berechnung (B5 Kap.4, parallel zu B2 Kap.4)

**Aufgabenstellung:** Sole-WP B0/W35, Q̇N = 8 kW, Pel = 1,8 kW gemessen.

Lösung:
- ε_real = 8 / 1,8 = **4,44**
- T_K = 35 + 273 = 308 K, T_V = 0 + 273 = 273 K
- ε_theor = 308 / (308 − 273) = 308 / 35 = **8,80**
- ν = ε_real / ε_theor = 4,44 / 8,80 = **0,505** ✓ (typisch SW-WP).

**Tool-Validierung:** ν im erwarteten Bereich 0,4–0,55 → Plausibilitätsprüfung Auslegung. Bei ν < 0,35 Gerät defekt oder falsch dimensioniert.

### 11.2 Bivalenz-Auslegung Luft-WP (B5 Kap.8 S.143)

**Gegeben:**
- Q̇HL = 9 kW bei ϑn = −12 °C, ϑi = 20 °C
- Luft-WP 8 kW Nennleistung bei A2/W35; Hersteller-Kennlinie:
  - bei A−7/W35: 6 kW
  - bei A−12/W35: 4,5 kW

**Schritt 1 – Heizlastlinie:**
| ϑa [°C] | +15 | +10 | +5 | 0 | −5 | −7 | −10 | −12 |
|---------|-----|-----|----|----|----|----|----|-----|
| Q̇HL [kW] | 1,4 | 2,8 | 4,2 | 5,6 | 7,0 | 7,6 | 8,4 | 9,0 |

**Schritt 2 – WP-Linie:** lineare Interpolation aus Datenblatt → bei ϑa = −5 °C → ca. 6,5 kW WP-Leistung.

**Schritt 3 – Bivalenzpunkt:** Schnittpunkt bei ca. **ϑBiv = −5 °C → 7,0 kW**.

**Schritt 4 – E-Stab-Bedarf:**
P_HS = Q̇HL(ϑn) − Q̇WP(ϑn) = 9 − 4,5 = **4,5 kW** → Standard 6 kW E-Stab gewählt.

**Schritt 5 – Energieanteil E-Stab:** über TRY-Wichtung ca. **3 % Jahresenergie** (Stunden < ϑBiv selten) → JAZ ca. 3,7 ✓ BEG-konform.

**Tool-Validierung:**
1. ϑBiv im Soll-Korridor −5…−7 °C ✓
2. P_HS ≤ 6 kW (Standard 3×400 V) ✓
3. JAZ ≥ 3,5 (BEG-Mindestwert Luft-WP) ✓

### 11.3 Cross-Check B2 / B3 / B4 zur WP-Methode

| Aspekt | B2 Kap.4 S.136 / Kap.8 S.228 | B3 Kap.8 S.79–80 | B4 S.403–413 / B1 LF12 | Fazit |
|--------|------------------------------|-------------------|-------------------------|-------|
| Carnot-Formel ε_th | T_K/(T_K−T_V) | identisch | identisch | konsistent |
| Gütegrad ν | 0,40–0,55 (B2 detailliert) | 0,4–0,5 (B3 Quick-Ref) | nicht explizit | **B2 Primärquelle ν** |
| JAZ β Definition | inkl. Hilfsstrom | inkl. Hilfsstrom | inkl. Hilfsstrom | konsistent |
| Bivalenzkonstruktion | S.238 grafisch | nicht enthalten | nicht detailliert | **B2 Primärquelle Bivalenz** |
| Heizlastlinie linear | S.228 | nicht enthalten | implizit | konsistent |
| Mindest-JAZ-Vorgabe | nicht enthalten | nicht enthalten | B1 LF12 S.722 | **B1 Primärquelle GEG/BEG** |
