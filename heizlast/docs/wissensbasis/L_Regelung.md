# Bereich L – Regelungstechnik & Hydraulik-Einbindung

## 1. Zweck & Anwendung im Tool

Regelungskonzept für das WP-Heizsystem: **witterungsgeführte Heizkurve**, Einzelraumregelung (Thermostatventile), TWW-Vorrangschaltung, Mischerkreise bei Multikreisanlagen, Zirkulationssteuerung. Regelung ist Software-seitig die wichtigste Stellschraube der **JAZ-Optimierung**: niedrige Vorlauftemperaturen maximieren ε; fehlerhaft eingestellte Heizkurven sind die Hauptursache für schlechte WP-JAZ im Bestand. Liefert Default-Heizkurven aus den Bereichen E (Heizkörper) und F (FBH), Vorrangsteuerung aus Bereich D/J, und die Integration zur WP aus Bereich I. Zwei Modi: Exakt (Heizkurven-Fußpunkt + Steilheit + Parallelverschiebung, Mischereinstellung) oder Richtwert (System- und Baujahr-bezogene Default-Heizkurve).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| **ϑ_VL(ϑ_a) = ϑ_i − s · (ϑ_a − ϑ_i) · f_Steigung** | Heizkennlinie allgemein | °C | B1 LF14 S.818, Konvention |
| **Q̇(ϑ_a) = Q̇HL · (ϑ_i − ϑ_a) / (ϑ_i − ϑ_n)** | Momentane Heizlast | W | B1 LF14 S.818 |
| **ϑ_VL = ϑ_i + Δϑ_LW · (Q̇/Q̇HL)^(1/n)** | exakte Heizkurve (Heizflächenexponent n) | °C | Konvention, Bereich E |
| Sollwert = Istwert → keine Regelabweichung | Grundprinzip Regelkreis | – | B1 LF14 S.816 |
| Regelabweichung x_w = x_Soll − x_Ist | Regler-Eingang | – | B1 LF14 S.816 |
| Proportionalverhalten: y = K_P · x_w | P-Regler (z.B. Thermostatventil) | – | B1 LF14 S.816 |
| PI/PID: y = K_P·x_w + K_I·∫x_w·dt (+K_D·dx_w/dt) | Heizkessel-/WP-Regler | – | B1 LF14 S.816 |
| **K_v-Wert** = V̇ / √(Δp/bar) | Ventilkennwert Thermostatventil | m³/h | B1 LF07 S.423 |
| Ventilautorität a_V = Δp_Ventil / Δp_Kreis | Qualität Ventil | – | B1 LF07 S.414 |

*Merke (B1 LF14 S.816): Bei einer Regelung beeinflusst die Eingangsgröße stets die Ausgangsgröße; über den Regelkreis erfolgt eine Rückwirkung (geschlossener Wirkungsablauf).*

---

## 3. Tabellen & Richtwerte

### 3.1 Regelungsarten Heizung nach GEG (B1 LF14 S.817, B4 S.402)

| Regelung | Zweck | Anwendung |
|----------|-------|-----------|
| **Kesselwasser-Temperaturregelung** | Wärmeerzeuger-T witterungsgeführt | Einkreis-EFH, auch WP-Vorlauf |
| **Vorlauftemperatur-Regelung** | mehrere Heizkreise mit 3- oder 4-Wege-Mischer | größere Gebäude, Multi-Kreis |
| **Raumtemperatur-Regelung** | Einzelraumregelung (ERR) | Thermostatventile GEG-Pflicht |
| **Beimischregelung** | Anhebung/Absenkung über 3/4-Wege-Mischer | FBH-Integration an HK-Kessel |

**GEG-Pflicht (B1 LF14 S.817):** Zentrale Einrichtungen zur (a) Verringerung/Abschaltung der Wärmezufuhr, (b) Ein-/Abschaltung der elektrischen Antriebe zum Wärmetransport, (c) selbsttätige Regelung der Raumtemperatur in Abhängigkeit der Zeit.

### 3.2 Witterungsgeführte Heizkurve (B1 LF14 S.818–820)

**Prinzip:** Außenfühler (Istwert) + eingestellte Heizkennlinie → Soll-VL. Bei Abweichung Sollwert↔Istwert (Kessel- oder VL-Fühler) Brenner / Mischer / WP-Modulation nachregeln.

**Heizkurvenparameter:**
| Parameter | Einfluss |
|-----------|----------|
| **Fußpunkt** ϑ_VL bei ϑ_a = 20 °C | meist 20–25 °C (FBH) bzw. 25–30 °C (HK) |
| **Steigung / Neigung** | legt Abstand VL bei tiefer ϑ_a fest |
| **Parallelverschiebung** | Komfortanpassung ± 3 K |
| **Heizgrenztemperatur** | oberhalb schaltet Heizung ab |

### 3.3 Empfohlene Heizkurven-Neigung für WP (Konvention)

| System | Auslegungs-VL bei ϑ_n | Neigung (Fußpunkt 20 °C) |
|--------|-----------------------|-----------------------------|
| **FBH Neubau / KfW** | 35 °C | **0,3 – 0,4** |
| **FBH Sanierung** | 40 °C | **0,4 – 0,5** |
| Heizkörper Neubau/Niedertemperatur | 45 °C | 0,6 – 0,8 |
| **Heizkörper Sanierung (WP-tauglich)** | 50 – 55 °C | **0,9 – 1,2** |
| Heizkörper Bestand unsaniert | 65 – 75 °C | 1,4 – 1,8 (**WP-Grenze überschritten!**) |

*B1 LF14 S.818 Diagramm: Werkseinstellung Nr. 18 → bei ϑ_a 0 °C → VL 55 °C; bei ϑ_a −10 °C → VL 65 °C (Kessel typisch).*

### 3.4 Nachtabsenkung – WP-spezifisch (B1 LF14 S.820)

| Betriebsart | Wirkung | WP-Bewertung |
|---------------|----------|----------------|
| Normal-Heizkennlinie | Sollwert konstant | Referenz |
| **Nachtabsenkung (Parallelverschiebung −3 bis −5 K)** | Wiederaufheizspitze am Morgen | **meist kontraproduktiv bei WP** – hohe VL nötig, taktet, JAZ sinkt |
| **Eco-Modus / leichte Absenkung (−1 K)** | geringer Komfort-Abzug | WP-tauglich |
| Wochenend-/Ferienprogramm | komplette Reduktion | nur Ferien sinnvoll |

### 3.5 Heizungsregler – Regler-Verhalten (B1 LF14 S.816, B4 S.402)

| Regler-Typ | Verhalten | Einsatz |
|--------------|-------------|----------|
| **P-Regler** | proportional, bleibende Regelabweichung | Thermostatventil, Thermostatmischbatterie |
| PI-Regler | proportional + integral, keine Regelabweichung | Heizungsregelung Kessel |
| PID-Regler | +Differenzial, schnell | WP, Inverter |
| Zweipunkt-Regler (EIN/AUS) | einfach | Heizstab, WW-Speicher-Thermostat |

### 3.6 Mischer-Regelung (B1 LF07 S.413, B4 S.402)

| Mischerart | Funktion | Einsatz |
|--------------|-----------|----------|
| **3-Wege-Mischer Beimischregelung** | Vorlauf-Beimischung aus Kessel, RL-Anteil zumischen | FBH-Kreis am HK-System |
| **4-Wege-Mischer** | VL-Regelung + RL-Anhebung gleichzeitig | Standardkessel (keine Brennwertnutzung) |
| 3-Wege-Umschaltventil | Vorrang zwischen Heiz- und TWW-Kreis | **WP-Standard: TWW-Vorrang** |
| Durchgangsventil mit Stellmotor | Einzelraum-Zonenregelung | FBH-Verteiler |

### 3.7 TWW-Vorrangschaltung (B1 LF14 S.825)

**Ablauf:**
1. Speicher-Sensor meldet Unterschreitung Sollwert (meist 50–55 °C bei WP).
2. Speicherladepumpe **EIN**, Heizungs-Umwälzpumpe **AUS**.
3. Wärmeerzeuger/WP läuft mit **TWW-Soll-Temperatur** (z.B. 55 °C oder 75 °C Legionellen).
4. Nach Erreichen Soll → Speicherladepumpe AUS, Heizung AUS.
5. Heizungsumwälzpumpe wieder EIN.

**Merke (B1 LF14 S.825):** Wird gleichzeitig Wärme für Heizung und TWW angefordert, wird zuerst Trinkwasser erwärmt. Bei z.B. 160-L-Speicher in 20 min Aufheizung → ca. 30 kW erforderlich → nur durch volle WP-/Kesselleistung erreichbar.

**WP-Besonderheit:** TWW-Ladezeit 20–40 min mit hoher VL (55 °C) → JAZ-Dip während Ladung eingeplant.

### 3.8 Thermostatventile (B1 LF07 S.411–413, B1 LF14 S.820)

| Bauart | Regelverhalten | WP-Relevanz |
|----------|------------------|---------------|
| Thermostatventil mit Dehnflüssigkeit/Wellrohr | P-Regler, langsam | Standard Bestand |
| Elektronischer Thermostatkopf | programmierbar (Tag/Nacht, Lüften) | Komfort, aber teurer |
| Extern geregelt (Raumthermostat + Kapillarrohr) | Einzelraum-Temperatur zentral | Bad, Schlafzimmer |
| Elektrisches Stellventil + Raumthermostat | zonale Regelung | Smart-Home |

**WP-Grundregel:** Thermostatventil **NICHT zudrosseln**, sondern auf "WP-Voreinstellung" = großzügig (max. Öffnung in Führungsräumen Wohnzimmer, Küche) → minimaler Druckverlust, Mindest-ṁ der WP gesichert.

**Voreinstellung** = hydraulischer Abgleich (Bereich G) → legt den kv-Wert fest (B1 LF07 S.423).

### 3.9 Heizgrenztemperatur / Sommerabschaltung (Konvention GEG)

| Gebäudestandard | Heizgrenze |
|--------------------|--------------|
| Altbau unsaniert | 17 °C |
| Bestand teilsaniert | 15 °C |
| **Sanierung GEG** | **12 – 13 °C** |
| Niedrigenergie / KfW-70 | 10 °C |
| Passivhaus | 8 – 10 °C |

→ Bei **ϑ_a > Heizgrenze** Heizkreis aus, WP nur noch für TWW.

### 3.10 Hydraulische Weiche & Pufferintegration (Bereich J, Konvention)

| Hydraulische Variante | Einsatz | Regelstrategie |
|--------------------------|----------|-----------------|
| **Direkt (kein Puffer)** | reine FBH, großer Inhalt | WP-Regelung direkt Heizkreis, keine ERR |
| **Reihenpuffer im RL** | Standard Luft-WP | WP-Kennlinie übernimmt, Puffer nur als V-Reserve |
| **Parallelpuffer mit Weiche** | Multi-Kreis, ERR | separate Ladung + Heizkreise |
| **Hydraulische Weiche** (>10 kW, Multi) | entkoppelt primär/sekundär | Drehzahlregelung beider Pumpen |

### 3.11 Zirkulationspumpen-Regelung (B1 LF14 S.825)

- Zirkulationspumpe **max. 16 h/d** per Zeitschaltuhr (Rest: Hygiene wahren).
- Wärmedämmung der Zirkulationsleitung Pflicht (GEG).
- Temperaturabkühlung Zirkulation **max. 5 K** (DVGW W 551).
- WP-Optimierung: Zirkulation bedarfsgesteuert (Taster / Strömungserkennung) → Standby-Strom und Wärmeverluste minimieren.

### 3.12 Außentemperaturfühler – Montage (B1 LF14 S.819)

- **Fassade Nordseite**, ca. **3,0 m Höhe**.
- Keine Sonneneinstrahlung, keine Abluftkanäle / Abgasrohre in der Nähe.
- Keine direkte Fensterbeflutung (falsche Istwert-Erfassung).

### 3.13 WP-Regelstrategien (Konvention, Hersteller)

| Strategie | Beschreibung | JAZ-Wirkung |
|-------------|----------------|----------------|
| **Reine Außentemperatur-Regelung** | Heizkurve, keine Raumkorrektur | Standard |
| **Raum-Referenzregelung** (Führungsraum) | Fühler im Wohnzimmer korrigiert Heizkurve | Komfort+, JAZ ≈ |
| **Inverter-Teillastregelung** | WP moduliert Q̇_ab statt Takt | JAZ +0,3 – 0,5 |
| **Stille Nacht / Silentmode** | Reduzierung Ventilator nachts | leichter JAZ-Abfall (< 0,1) |
| **Smart-Grid-Ready (SG-Ready)** | Freigabe-/Sperrzeiten durch EVU | Tarifoptimierung |
| **PV-gekoppelt** | WP läuft bei PV-Überschuss, auch TWW-Überhub | Eigenverbrauch+, JAZ leicht variabel |

---

## 4. Exakt-Modus Workflow

### Schritt 1 – Heizkurve dimensionieren
- Fußpunkt ϑ_VL,F = ϑ_i + (1 – 3) K bei ϑ_a = 20 °C (FBH 22 °C; HK 25 °C).
- Auslegungspunkt ϑ_VL,n bei Norm-Außentemperatur ϑ_n (aus Bereich E/F).
- Steigung s = (ϑ_VL,n − ϑ_VL,F) / (ϑ_i − ϑ_n).

### Schritt 2 – Parallelverschiebung
Nutzer-Komfort: ± 3 K als Default, Feinabstimmung nach Probebetrieb.

### Schritt 3 – Heizgrenztemperatur
Aus Gebäudestandard (Tab. 3.9); Sommerabschaltung über Software aktivieren.

### Schritt 4 – TWW-Regelung & Vorrang
Speicher-Sollwert (50–55 °C WP, periodisch 60 °C Legionellen). 3-Wege-Umschaltventil zwischen TWW und Heizung. Vorrangzeit 20–40 min je Ladung.

### Schritt 5 – Einzelraumregelung
Thermostatventile oder Raumthermostate in allen Nebenräumen. Führungsraum (Wohnzimmer) ohne oder voll geöffnet → Raum-Referenzfühler.

### Schritt 6 – Hydraulischer Abgleich & kv
Voreinstellung Ventile nach Heizlast je Raum (Bereich G). kv-Wert = V̇/√(Δp). Dokumentieren im Protokoll (GEG, Förderung BEG).

### Schritt 7 – Zirkulationsregelung
Zeitschaltuhr (Freigabezeiten; Pflicht ≤16 h/d); alternativ bedarfsgesteuert. Abkühlung ≤ 5 K überprüfen.

### Schritt 8 – Mischerkreise
Falls FBH + HK gemischt: 3-Wege-Mischer mit eigenem Fühler, eigene Pumpe, eigene Heizkurve. WP läuft am Primärkreis mit "VL hoch genug für HK".

### Schritt 9 – Witterungsfühler montieren
Nordfassade, 3 m Höhe, kein Abgaseinfluss.

### Schritt 10 – Testbetrieb & Feintuning
- 1–2 Wochen beobachten.
- Zu kalt → Steigung erhöhen um 0,1 oder Parallelverschiebung +1 K.
- Takten → Steigung prüfen, Mindest-Pufferinhalt kontrollieren.

### Schritt 11 – Dokumentation
GEG-Protokoll: Heizkurve, Grenzwerte, Voreinstellungen, Zirkulationszeiten – signiert.

---

## 5. Richtwert-Modus Workflow (Sanierung)

1. **Heizkurve Standard WP:**
   - FBH: **Fußpunkt 22 °C / ϑ_n VL 35 °C → Neigung 0,4**.
   - HK-Sanierung: **Fußpunkt 25 °C / ϑ_n VL 50 °C → Neigung 1,0**.
2. **Parallelverschiebung** ± 0 K (Default, später ± 3 K Nutzer).
3. **Heizgrenze** 15 °C (Bestand saniert) / 12 °C (GEG-Ziel).
4. **TWW-Speichersoll** 52 °C; Legionellen-Programm einmal wöchentlich 60 °C 30 min.
5. **TWW-Vorrang** immer aktiv (3-Wege-Umschaltventil an WP).
6. **Thermostatventile:** Voreinstellung nach Heizlast (Bereich G); Führungsraum offen.
7. **Mischerkreis FBH** wenn parallele HK vorhanden: eigene Heizkurve 0,4 / 35 °C.
8. **Zirkulationspumpe** nur Morgens (06–08) und Abends (17–22), Schaltuhr.
9. **Nachtabsenkung** bei WP deaktivieren oder max. –1 K (kein Wirtschaftlichkeitsvorteil).
10. **Raum-Referenzfühler** im Wohnzimmer aktivieren (WP-Komfort+).

**Standard-Default 150 m² EFH saniert, HK-Bestand Typ 22 vergrößert, VL_n 50 °C, Luft-WP 10 kW:**
- Heizkurve 0,9 / Fußpunkt 25 °C / Heizgrenze 15 °C.
- TWW-Soll 52 °C; Legionellen So 03:00 60 °C/30 min.
- Pufferladung bei WP-Wärmeanforderung, keine Nachtabsenkung.
- Thermostatventile Voreinstellung aus HA-Berechnung; Wohnzimmer Stufe 5.
- Zirkulation 06–08 / 17–22 Uhr.

---

## 6. Plausibilitätsprüfungen

- **Heizkurve zu steil** (z.B. 1,5 bei FBH) → unnötig hohe VL im Winter → JAZ-Verlust.
- **Heizkurve zu flach** → unterversorgt, Heizkörper kalt bei −10 °C → Beschwerden.
- **Fußpunkt zu hoch** → Dauerüberhitzung Übergangszeit.
- **Fußpunkt zu niedrig** → träge Aufheizung Morgens.
- **Außenfühler an Südseite / Sonne** → Istwert zu hoch → VL zu niedrig → Untertemperatur Räume.
- **Nachtabsenkung aktiv bei Luft-WP** → Morgens Spitzenlast, hohe VL, taktet.
- **TWW-Vorrang fehlt** → Heizkreis zieht Energie, TWW läuft nicht heiß genug.
- **TWW-Soll > 55 °C dauerhaft (ohne Heizstab)** → WP läuft außerhalb effizienter Kennlinie.
- **Legionellenprogramm fehlt** → DVGW W 551 Verstoß, Gesundheitsrisiko.
- **Einzelraumregelung fehlt** → GEG-Verstoß (Pflicht seit 1978).
- **Thermostatventile zu weit zugedreht (Voreinstellung 1–2)** → WP-Mindest-ṁ unterschritten, Störung.
- **Zirkulationspumpe 24 h** → Wärmeverlust 1000–2000 kWh/a EFH, GEG-Verstoß.
- **Mischerregelung an Brennwertkessel** (4-Wege-Mischer) → RL zu hoch → keine Kondensation.
- **WP-Heizkurve nicht unabhängig von Mischerkreis** → Doppelte Beimischung, Energieverlust.
- **Heizgrenztemperatur zu hoch** → Heizung läuft im Mai → Energieverschwendung.
- **Regler-Firmware veraltet (> 5 Jahre)** → fehlende Optimierungsalgorithmen → JAZ-Potenzial ungenutzt.
- **SG-Ready nicht verdrahtet** → keine Tarifoptimierung, Zuschussverlust BEG.

---

## 7. Normenverweise

- **DIN EN 12098-1/-3/-5** (Regelung von Heizungsanlagen – witterungsgeführt, Zeitprogramme, Kennwerte)
- **DIN EN 15232** (Energieeffizienz von Gebäuden durch Gebäudeautomation, Klassen A–D)
- **GEG §§ 64 – 65** (Pflicht Einzelraum-Temperaturregelung, zentrale Einrichtungen)
- **GEG § 71** (Vorgaben Heizungsregelung; Pflicht ab 2024 hydraulischer Abgleich bei Sanierung)
- **DVGW W 551** (Legionellenschutz: Betrieb/Regelung TWW ≥ 55 °C, Speicher 60 °C-Regelung)
- **DVGW W 553** (Zirkulation: Abkühlung ≤ 5 K, Temperaturhaltung)
- **VDI 3814** (Gebäudeautomation, BACnet/KNX)
- **VDI 2067** (Wirtschaftlichkeitsrechnung, Heizkurven-Optimierung)
- **DIN EN 14908** (LonWorks Bus-Kommunikation)
- **SG-Ready-Label BWP** (Smart-Grid-Ready Einbindung)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| Heizungsregelung Kundenauftrag, Wohngebäude mit UG/EG/OG gemischt HK+FBH, GEG + Energieeinsparung | B1 LF14 S.811 |
| Regelung als geschlossener Wirkungsablauf, Sollwert/Istwert/Regelabweichung/Stellgröße, Thermostatmischbatterie als Proportionalregler, Fachbegriffe Regeleinrichtung | B1 LF14 S.816–817 |
| Vier Regelungsarten Heizung (Kesselwasser-T, Vorlauf-T, Raum-T, Beimisch), GEG-Pflicht zentrale Einrichtungen | B1 LF14 S.817 |
| Gleitende Kesselwassertemperaturregelung, Heizkennlinien-Diagramm (Werkseinstellung Nr. 18, Kurven Nr. 23–40), Regelkreis AT/Kesselfühler/Brenner als Stellglied, Einsatz bei Niedertemp/Brennwert | B1 LF14 S.818 |
| Außenfühler Nordseite 3 m Höhe, Zeitschaltuhr Sommer/Winter/Feiertag/Ferien, Fernbedienung; Vorlauf-Temperaturregelung Mehrkreis mit Mischer, konstanter Kesselwassersollwert (65/70 °C) | B1 LF14 S.819 |
| Vorlauftemperatur-Regelung Aufbau, Heizkurven-Anhebung (Nachtabsenkung parallel abgesenkt), Raumtemperaturregelung durch Thermostatventile/programmierbar/elektr. Stellantrieb, witterungsgeführte Regelung Merksatz | B1 LF14 S.820 |
| Speicher-Vorrangschaltung, 160-L-Beispiel 20 min = 30 kW, Ladepumpe EIN/Heizpumpe AUS, Kessel kurzfristig 75 °C, Zirkulationspumpe ≤16 h Zeitschaltuhr, Legionellen 60 °C, Zirkulation-Abkühlung 5 K; "erst TWW, dann Heizung"-Merke | B1 LF14 S.825 |
| Heizungsarmaturen (Schrägsitz-, Dreiwege-, Rückschlag-, Überströmventil), 4-Wege-Mischer Einbau/Funktion, Rücklaufanhebung | B1 LF07 S.411–413 |
| Heizungsregelung Übersicht (Schaltschema/Kennlinien/Regelkreis für Kesselwasser-T, Vorlauf-T, Raumtemperatur mit Thermostatventil und externer Regelung, Beimischregelung) | B4 S.402 |
| WP-spezifische Regelstrategien (Raum-Referenz, SG-Ready, PV-gekoppelt, Nachtabsenkung-Bewertung) | Konvention / WP-Hersteller |
| Heizkennlinie / Heizleistung aus Außentemperatur (Q̇(ϑa)-Linearisierung), Mischregelung Beispiel | B2 Kap.8 S.228, S.250 |
| Heizungs-/Regel-Formeln Quick-Ref (Heizleistungslinie, Heizgrenze) | B3 Kap.5 S.51–54 |
| Heizkurven-Auslegungs-Beispielrechnung (Fußpunkt, Steigung, Bivalenz) | B5 Kap.8 S.130–145 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 S.51–54)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| **Q̇(ϑa) = Q̇HL · (ϑi − ϑa)/(ϑi − ϑn)** | Momentane Heizlast als Grundlage Heizkurve | W |
| **ϑ_VL(ϑa) = ϑi + Δϑ_LW · (Q̇/Q̇HL)^(1/n)** | Heizkurven-Vorlauftemperatur (HK-Exponent n) | °C |
| ϑ_RL(ϑa) = ϑ_VL − σ · (Q̇/Q̇HL) | Rücklauftemperatur (Spreizung σ konstant in HK-Anlagen) | °C |
| Heizgrenze: Q̇HL · (ϑi − ϑGrenz)/(ϑi − ϑn) ≤ Q̇_intern | Sommerabschaltung | – |
| K_v = V̇ / √(Δp/bar) | Ventilkennwert (Voreinstellung Thermostat) | m³/h |
| Ventilautorität a = Δp_V / Δp_Strang | Regelqualität Thermostatventil | – |

*B3 Kap.5 enthält Heizleistungslinie und HK-Exponent als Quick-Ref. Die kombinierte Heizkurven-Formel folgt aus B3 + Bereich E (HK-Exponent n=1,1 FBH / 1,3 HK).*

---

## 10. B2 Kap.8 Detailergänzungen – Heizkurven & Mischregelung (S.228, S.250)

### 10.1 Heizleistungslinie (B2 Kap.8 S.228)

**Lineare Beziehung Heizlast – Außentemperatur:**

Q̇(ϑa) = Q̇HL · (ϑi − ϑa) / (ϑi − ϑn)

| ϑa [°C] | Anteil an Q̇HL (ϑi=20, ϑn=−12) |
|---------|--------------------------------|
| 20 | 0 % |
| 15 | 16 % |
| 10 | 31 % |
| 5 | 47 % |
| 0 | 63 % |
| −5 | 78 % |
| −10 | 94 % |
| −12 | 100 % |

**Tool-Anwendung (Bereich L):**
- Lineare Heizleistungslinie ist Basis der **Heizkurven-Konstruktion**.
- Schnittpunkt mit WP-Kennlinie = Bivalenzpunkt (Bereich I).
- **Heizgrenztemperatur** = ϑa, ab der Q̇(ϑa) ≤ interne Wärmequellen (Personen, Geräte) → Tab. 3.9.

### 10.2 Vorlauf-Temperaturkurve & Heizflächenexponent (B2 S.243, hier integriert)

Die **exakte** Vorlauftemperatur-Kurve folgt aus der Heizflächenleistung:

ϑ_VL(ϑa) = ϑi + Δϑ_LW(ausl) · (Q̇/Q̇HL)^(1/n)

mit:
- Δϑ_LW(ausl) = (ϑVL,n + ϑRL,n)/2 − ϑi = arithmetische Übertemperatur bei Norm
- n = Heizflächen-Exponent (FBH 1,1; Plattenheizkörper 1,3; Konvektor 1,4)

**Praxisbeispiel HK-Sanierung (Δϑ_LW = 30 K, n = 1,3, ϑi = 20 °C, ϑn = −12 °C):**

| ϑa [°C] | Q̇/Q̇HL | (Q̇/Q̇HL)^(1/1,3) | Δϑü [K] | **ϑ_VL berechnet [°C]** |
|---------|---------|--------------------|---------|---------------------------|
| 15 | 0,156 | 0,243 | 7,3 | 27,3 + Hälfte σ → ~32 |
| 10 | 0,313 | 0,418 | 12,5 | 32,5 + ½σ → 37 |
| 5 | 0,469 | 0,564 | 16,9 | 36,9 + ½σ → 42 |
| 0 | 0,625 | 0,696 | 20,9 | 40,9 + ½σ → 46 |
| −5 | 0,781 | 0,820 | 24,6 | 44,6 + ½σ → 50 |
| −10 | 0,938 | 0,939 | 28,2 | 48,2 + ½σ → 53 |
| −12 | 1,000 | 1,000 | 30,0 | 50,0 + ½σ → 55 |

→ **HK-Sanierung-Standardkurve VL_n = 55 °C, Fußpunkt 25 °C, Neigung ≈ 1,0** entspricht exakt dieser Tabelle.

### 10.3 Mischer-Beimischregelung (B2 Kap.8 S.250)

**3-Wege-Mischer:** Mischt Vorlauf-Heißwasser (vom Erzeuger) mit Rücklauf des Sekundärkreises → ϑ_VL,Sekundär stetig regelbar.

Mischungs-Bilanz:
ṁ_VL · ϑ_VL = ṁ_KW · ϑ_KW + ṁ_RL · ϑ_RL

**Anwendung WP + FBH-Sekundärkreis:**
- WP läuft am Primärkreis mit z. B. ϑ_VL = 50 °C (für HK).
- 3-Wege-Mischer mischt FBH-Kreis auf 35 °C herunter.
- Vorteil: WP arbeitet im optimalen Kennfeld einer Anlagenart, ohne dass FBH überhitzt wird.
- Nachteil: zusätzliche Pumpe und Mischerverlust ca. 50–100 mbar (Bereich G/H).

**4-Wege-Mischer:** Zusätzlich Rücklauf-Anhebung am Erzeuger → klassisch bei Niedertemperaturkesseln (nicht Brennwert!). Bei WP **nicht eingesetzt** – Rücklauf-Absenkung ist gewünscht (besseres COP).

---

## 11. Validierungs-Beispiele (B5 Kap.8 S.130–145)

### 11.1 Heizkurven-Auslegung HK-Sanierung (B5 S.142)

**Gegeben:**
- EFH 150 m², Q̇HL = 8 kW, ϑi = 20 °C, ϑn = −12 °C
- Bestand: Plattenheizkörper Typ 22, vergrößert (fᵤ-Methode aus Bereich E ergibt VL_n = 50 °C)
- Spreizung σ = 8 K → ϑ_RL,n = 42 °C, Δϑ_LW = 26 K

**Schritt 1 – Heizleistungslinie aus B2 S.228:**
| ϑa [°C] | Q̇/Q̇HL | Q̇ [W] |
|---------|---------|--------|
| 15 | 0,156 | 1.250 |
| 0 | 0,625 | 5.000 |
| −12 | 1,000 | 8.000 |

**Schritt 2 – ϑ_VL aus exakter Heizkurvenformel (n = 1,3):**
| ϑa [°C] | (Q̇/Q̇HL)^(1/1,3) | Δϑü [K] | ϑm [°C] | σ_aktuell [K] | **ϑ_VL [°C]** |
|---------|--------------------|---------|---------|----------------|----------------|
| 15 | 0,243 | 6,3 | 26,3 | 1,3 | 27 |
| 10 | 0,418 | 10,9 | 30,9 | 2,5 | 32 |
| 5 | 0,564 | 14,7 | 34,7 | 3,8 | 37 |
| 0 | 0,696 | 18,1 | 38,1 | 5,0 | 41 |
| −5 | 0,820 | 21,3 | 41,3 | 6,3 | 44 |
| −10 | 0,939 | 24,4 | 44,4 | 7,5 | 48 |
| −12 | 1,000 | 26,0 | 46,0 | 8,0 | **50** |

**Schritt 3 – Heizkurven-Parameter:**
- Fußpunkt: bei ϑa = 20 °C → ϑ_VL = ϑi + 1 K = **21 °C** (Praxis 25 °C wegen Strömungsbedarf)
- Auslegung: bei ϑa = −12 °C → ϑ_VL = **50 °C**
- **Steigung s ≈ (50 − 25) / (20 − (−12)) = 25/32 ≈ 0,78 → praktisch 0,9** (Tab. 3.3 Bereich „HK Sanierung").

**Tool-Validierung:**
1. VL_max = 50 °C ≤ 55 °C WP-Grenze ✓ (Bereich I)
2. Steigung 0,9 entspricht Default-Tab. 3.3 (HK Sanierung) ✓
3. Fußpunkt 25 °C statt 21 °C ist Praxis-Konvention (Mindest-Strömung WP) → Anpassung nach Probebetrieb möglich

### 11.2 Heizgrenze & Sommerabschaltung (B5 S.144)

**Berechnung Heizgrenztemperatur ϑGrenz:**
- Bei sanierter Hülle (50 W/m²) und internen Lasten Pi ≈ 5 W/m² (Personen + Geräte + Strahlung) → ϑGrenz, ab der Q̇HL · (ϑi − ϑGrenz)/(ϑi − ϑn) ≤ Pi · A

Beispiel:
- Pi = 5 · 150 = 750 W; Q̇HL = 8.000 W; ϑi = 20, ϑn = −12 → 8.000 · (20 − ϑGrenz)/32 ≤ 750
- (20 − ϑGrenz) ≤ 750 · 32 / 8.000 = **3,0 K** → ϑGrenz ≥ **17 °C**

→ Bei sanierter Hülle ist physikalische Heizgrenze rein rechnerisch 17 °C, das **GEG-Ziel 12–13 °C** bleibt aber praktisch (Komfort, Wandtemperaturen).

### 11.3 Cross-Check B2 / B3 / B4

| Thema | B2 Kap.8 | B3 Kap.5 | B4 S.402 | Fazit |
|-------|----------|----------|-----------|-------|
| Heizleistungslinie Q̇(ϑa) | S.228 explizit | S.51 | implizit (Diagramm) | konsistent |
| Heizkurvenformel ϑ_VL(ϑa) | S.243 mit n | nicht detailliert | S.402 Diagramm-Form | **B2 Primärquelle Theorie** |
| Heizflächen-Exponent n | S.243 (1,1/1,3/1,4) | S.53 (gleicher Ansatz) | S.373 fᵤ implizit | konsistent |
| Mischer-Beimischung | S.250 ausführlich | nicht enthalten | S.402 Diagramm | **B2 Primärquelle Mischer** |
| Werkseinstellung Heizkurven-Nr. | nicht enthalten | nicht enthalten | implizit B1 LF14 S.818 | **B1 Primärquelle Praxis** |
| GEG-Pflicht-Regelungen | nicht enthalten | nicht enthalten | nicht enthalten | **B1 LF14 S.817 Primärquelle** |
