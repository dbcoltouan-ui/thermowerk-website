# Bereich J – Speicher (Puffer, Kombi, TWW)

## 1. Zweck & Anwendung im Tool

Auslegung aller thermischen Speicher im WP-System: **Trinkwasserspeicher (TWW)** für Warmwasserbereitung, **Heizungs-Pufferspeicher** zur Taktminderung, Abtaureserve, Sperrzeitenüberbrückung und hydraulischer Entkopplung, sowie **Kombispeicher** für Multi-Source-Systeme (WP + Solar + Kamin). Liefert Input an Bereich D (TWW-Aufheizleistung Q̇zu), Bereich I (WP-Integration, Minimal-Volumen zum Einhalten des Herstellerdurchlaufs), Bereich K (Systemvolumen = MAG-Input) und Bereich L (Speicher-Vorrangschaltung). Zwei Modi: Exakt (Aufheizzeit nach B1 LF09 S.574, Speicher-Kennzahl NL nach DIN 4708) oder Richtwert (L/kW und L/Person nach Konvention).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| **Q = m · c · Δϑ** | Speicherinhalt an Wärmemenge | kWh | B1 LF09 S.513 |
| **t = (m · c · Δϑ) / (η · Q̇zu)** | Aufheizzeit Speicher | h | B1 LF09 S.574 |
| **Q̇zu = (m · c · Δϑ) / (η · t)** | Erforderliche Aufheizleistung | kW | B1 LF09 S.576 |
| V_Puffer ≥ V_spez · Q̇WP | Mindest-Pufferinhalt | L | Konvention WP-Hersteller |
| V_Abtau = Q̇_Abtau · t_Abtau / (c · Δϑ_zul) | Abtaureserve Luft-WP | L | Konvention, B1 LF12 S.730 |
| t_Sperr = V_Puffer · c · Δϑ / Q̇HL | Überbrückungszeit Sperrzeit | h | Konvention |
| Q_Verlust = U · A · (ϑS − ϑU) · t | Bereitschaftsverluste | kWh | B1 LF07 S.430 |
| NL = Bedarfskennzahl (DIN 4708) | TWW-Leistungsindex | – | DIN 4708 |

*c = 1,163 Wh/(kg·K) = 0,001163 kWh/(kg·K) für Wasser. Für Wasser gilt 1 L ≈ 1 kg.*

**Merkbeispiel (B1 LF14 S.825):** 160-L-Speicher in 20 min von z.B. 10 → 60 °C aufzuheizen, benötigt ca. 30 kW Wärmeenergie → Speichervorrang erforderlich.

---

## 3. Tabellen & Richtwerte

### 3.1 Bauarten von Trinkwassererwärmern (B1 LF09 S.519–520)

| Unterscheidung | Varianten |
|-----------------|-----------|
| **Zeitpunkt** | Speicher / Durchfluss-Wassererwärmer |
| **Betriebsüberdruck** | offen / geschlossen |
| **Beheizungsart** | unmittelbar (direkt, elektrisch) / mittelbar (indirekt, Zwischenmedium) |
| **Versorgungsart** | Einzel- / Gruppen- / Zentralversorgung |
| **Energieart** | elektrisch / gasbeheizt / solarbeheizt / umweltwärmebeheizt |

**Speicherprinzip-Vorteile (B1 LF09 S.520):** konstante WW-Temperatur unabhängig vom Volumenstrom; hohe Zapfvolumenströme; keine Mindestvolumenströme; geringer Druckverlust; Aufheizung mit kleiner Leistung möglich.

**Speicherprinzip-Nachteile (B1 LF09 S.520):** Baugröße, Auskühlungs-/Verteilungsverluste, Hygiene (Legionellen).

### 3.2 TWW-Speichergröße – Richtwert nach Personenzahl (Konvention, Bereich D)

| Haushalt | Speichergröße TWW |
|----------|---------------------|
| 1 – 2 Personen | 150 – 200 L |
| **3 – 4 Personen (EFH-Standard)** | **200 – 300 L** |
| 5 Personen | 300 – 400 L |
| 6+ Personen | 400 – 500 L |
| Mehrfamilienhaus | Berechnung nach DIN 4708 (NL-Zahl) |

*Bei Zentralversorgung mehrerer Wohnungen → DIN 4708, Speicher-Kennzahl NL aus Bedarfsprofil (B1 LF09 S.520).*

### 3.3 TWW-Speichertemperaturen bei WP-Betrieb

| Temperaturniveau | Zweck | Auswirkung |
|--------------------|-------|--------------|
| **45 – 50 °C** | WP-optimal | maximale JAZ, aber Legionellenrisiko |
| **50 – 55 °C** | **WP-Standard** | **guter Kompromiss JAZ / Hygiene** |
| 60 °C (wöchentlich) | Legionellenprogramm (DVGW W 551) | Heizstab, kurzzeitig |
| ≥ 60 °C dauerhaft | Altanlage / Pflicht bei Verteilungssystem | JAZ-Verlust, Kalkbildung |

*TWW-Speicher in Anlagen mit Zirkulationsleitung → Verteilung ≥ 55 °C, Abkühlung Zirkulation ≤ 5 K (B1 LF14 S.825).*

### 3.4 Heizungs-Pufferspeicher bei Luft-WP (Konvention / WP-Hersteller)

| Funktion | Mindest-Spezifikation | Empfehlung |
|----------|-------------------------|--------------|
| **Abtauenergie-Reserve (KRITISCH LW-WP)** | **10 – 20 L/kW Q̇WP** | **30 – 50 L/kW** |
| Mindestumlauf-Sicherung | nach Hersteller (25 – 40 % Nenn-V̇) | Reihenpuffer im RL |
| **Sperrzeiten-Überbrückung (EVU 2×2 h/d)** | **50 – 100 L/kW Q̇HL** | 100 L/kW |
| Takt-Minderung (Inverter-WP) | 20 L/kW | 30 L/kW |
| Hydraulische Entkopplung (ERR-Anlage) | Weiche oder Puffer | Trennpuffer 100–200 L |

### 3.5 Heizungs-Pufferspeicher bei Sole-/Wasser-WP

| System | Pufferbedarf |
|--------|----------------|
| Sole-WP mit FBH, ohne ERR | oft keiner / kleine Weiche 50 L |
| Sole-WP mit Heizkörper + Einzelraumregelung | 20 L/kW Reihenpuffer |
| Sperrzeiten-Tarif (Sole) | 50 L/kW |
| Wasser-WP | meist keiner, ggf. Weiche |

### 3.6 Dimensionierungs-Richtwerte EFH (aus Bereich I Tab. 3.9)

| Q̇HL [kW] | WP-Typ | Heizungspuffer | TWW-Speicher |
|------------|---------|------------------|----------------|
| 3 – 5 | 4 / 6 kW | 40 – 80 L | 200 L |
| 5 – 8 | 6 / 8 kW | 80 – 200 L | 200 – 300 L |
| **8 – 12** | **10 / 12 kW** | **200 – 400 L** | **300 L** |
| 12 – 16 | 14 / 16 kW | 400 – 500 L | 300 – 400 L |

### 3.7 Kombispeicher / Multivalent (Konvention)

| Speichertyp | Volumen EFH | Einsatz |
|--------------|--------------|-----------|
| **Kombispeicher WP + Solar** | **500 – 800 L** | FBH + solare TWW |
| Kombispeicher WP + Solar + Kamin | 800 – 1200 L | Hybrid-Sanierung |
| Schichtladespeicher mit TWW-Modul (Frischwasserstation) | 500 – 1000 L | legionellenarm, WP-ideal |
| Hygienespeicher (Edelstahl-Wellrohr) | 300 – 800 L | TWW-Durchlauf im Puffer |

**Frischwasserstation (B1 LF12 S.719):** externes WW-Modul, kein stehendes Trinkwasser → Legionellenrisiko minimal, ideal für WP, sekundärseitig niedrige Vorlauftemperaturen möglich.

### 3.8 Speicher-Wärmeübertragerleistung (B1 LF09 S.574)

| Wärmetauscher-Typ | Leistungsansatz | Bemerkung |
|----------------------|-------------------|-------------|
| Rohrwärmetauscher klein (1-stufig) | 0,8 – 1,2 kW/m² | Altgeräte |
| Rohrwärmetauscher groß (Doppelmantel) | 1,5 – 2,5 kW/m² | WP-geeignet |
| Glattrohr Sole-WP | WP-Leistung · 1,2 | Herstellerangabe |
| Heizstab (Zusatz TWW) | 2 – 6 kW (1×230 V) / 6 – 9 kW (3×400 V) | Legionellenschaltung |

### 3.9 Speicher-Schichtung & Einbau (B1 LF09 S.520)

- **VL oben, RL unten** (Dichteschichtung nutzen; warm nach oben).
- **Schichtrohr/Schichtenlader** bei Kombispeicher (Einschichtung in passender Höhe).
- **WP-Vorlauf** oben → Heizkreis-VL direkt; Rücklauf am unteren Drittel.
- **TWW-Ladung** oben ein / unten aus (Gegenstrom → hohe Speicherausnutzung).
- Kein direkter Heizkörper-Einbindung am kalten Teil (Kurzschluss vermeiden).

### 3.10 Bereitschaftsverluste (Konvention)

| Speichergröße | Dämmung (PU 50 mm) | Verlust [kWh/d] |
|------------------|---------------------|-------------------|
| 200 L | Klasse C | 1,2 – 1,8 |
| 300 L | Klasse B | 1,5 – 2,5 |
| 500 L | Klasse A | 2,0 – 3,5 |
| 800 L | Klasse A+ | 2,5 – 4,0 |

*ErP-Label Pflicht seit 2017 (Klasse A–G).*

### 3.11 Elektrische Speicher mit Niedertarif-Strom (B1 LF09 S.520)

- Elektrisch beheizte Speicher müssen bei **NT-Nutzung** die bis zur nächsten Freigabe benötigte Wärmemenge bevorraten.
- Ungewöhnlich hoher Bedarf → Nachheizen mit HT-Strom (teurer).
- **Solarspeicher:** Bevorratung 1,5 – 2 Tage (B1 LF09 S.520).

---

## 4. Exakt-Modus Workflow

### Schritt 1 – TWW-Bedarfsermittlung
Aus Bereich D: V₆₀ [L/d] aller Personen + Gewerbezuschlag. Pro EFH Nutzspitze = Summe Gleichzeitigkeits-Zapfungen (DIN 4708 NL-Zahl).

### Schritt 2 – TWW-Speichergröße festlegen
- EFH: V_Speicher = 1,5 × Tagesspitze oder direkt aus Tab. 3.2.
- MFH: V_Speicher + Nachheizleistung nach DIN 4708 NL-Zahl.

### Schritt 3 – TWW-Aufheizleistung Q̇zu
`Q̇zu = (m · c · Δϑ) / (η · t)`; Δϑ = 45 K (10 → 55 °C); η ≈ 0,95; t = Wunsch-Aufheizzeit (1 – 2 h bei WP, Sperrzeit beachten).

### Schritt 4 – Heizungs-Pufferbedarf prüfen
- WP-Hersteller-Mindestumlauf V̇_min → V_Puffer ≥ V̇_min · t_Abtau (Luft-WP).
- Sperrzeit EVU: V_Puffer ≥ Q̇HL · t_Sperr / (c · Δϑ_zul); Δϑ_zul ≈ 10 K.
- Taktung Inverter: Taktfrequenz ≤ 3/h → V_Puffer ≥ Q̇WP_min · t_min / (c · Δϑ).

### Schritt 5 – Systemanordnung wählen
- **Reihenpuffer im RL:** Standard, WP und Heizkreis teilen Volumen.
- **Trenn-/Parallelpuffer:** hydraulisch entkoppelt, zwei Pumpen.
- **Kombispeicher:** Multi-Source (Solar, Kamin) → größer.
- **Hygienespeicher / Frischwasser:** TWW legionellenfrei.

### Schritt 6 – Wärmeübertrager dimensionieren
Leistungstabelle Hersteller (m² · kW/m²), 1,2-fache WP-Leistung als Sicherheit. Sole-WP: Glattrohr; Luft-WP: oft einfacher Glattrohrtauscher ausreichend.

### Schritt 7 – Elektroeinsatz-/Heizstab-Einbindung
Bei TWW: 1 – 3 kW Elektroheizstab für Legionellenschaltung (einmal/Woche 60 °C). Bei Puffer (monoenergetisch): 6 kW 3×400 V Heizstab (Bereich I).

### Schritt 8 – Aufstellung & Dämmung
- Schwerpunkt ermitteln, Tragfähigkeit Aufstellraum.
- PUR-Schaum ≥ 50 mm, ErP-Klasse A oder besser.
- Abstand zur Wand ≥ 10 cm (Dämmung, Montagezugang).
- Anschlüsse barrierefrei, Entleerung tief.

### Schritt 9 – Regelung & Vorrang
Speicher-Vorrangschaltung (Bereich L / B1 LF14 S.825):
- Bei Abfall Speicher-Sollwert → Speicherladepumpe EIN, Heizungspumpe AUS.
- Kessel/WP kurzzeitig auf Ladetemperatur (TWW 55 °C; Legionellen 60 °C).
- Ladezeit 20 – 40 min EFH.

### Schritt 10 – Plausibilität
- Speicher-Ladeleistung passt zur WP (Q̇WP bei VL_TWW).
- Wärmetauscher-Fläche reicht (> WP-Nennleistung).
- Pufferinhalt ≥ Hersteller-Mindestangabe.
- Bereitschaftsverluste < 10 % Jahresenergie.

---

## 5. Richtwert-Modus Workflow (Sanierung)

1. **TWW-Speicher:** Personenzahl × Tab. 3.2 → 1 – 2 P: 200 L; 3 – 4 P: 300 L; 5+ P: 400 L.
2. **TWW-Typ:** WP-Standard = indirekter Emailspeicher mit Glattrohr; alternativ Brauchwasser-WP (Luft/Wasser) bei abgesetzter Aufstellung.
3. **Heizungspuffer Luft-WP:** 30 – 50 L/kW Q̇WP als Abtau-/Taktreserve. **Standard EFH 10 kW:** 200 – 300 L Pufferspeicher.
4. **Heizungspuffer Sole-/Wasser-WP:** nur bei Sperrzeit EVU (50 L/kW); sonst Weiche oder direkt.
5. **Kombispeicher:** nur wenn Solar/Kamin eingebunden → 600 – 800 L.
6. **Heizstab TWW:** 3 kW Legionellenschaltung (1×230 V, 16 A) Standard.
7. **Heizstab Puffer (monoenergetisch):** 6 kW 3×400 V mit eigener Absicherung.
8. **Dämmung:** ErP ≥ Klasse B; Aufstellraum frostsicher, trocken.
9. **Schichtung:** VL oben / RL unten; bei Kombi Schichtrohr setzen.
10. **Zirkulation:** nur wenn Weglänge > 5 m (DVGW); mit Zeitschaltuhr ≤ 16 h/d (B1 LF14 S.825).

**Standard-Default EFH 150 m² saniert, Q̇HL 8 kW, 4 Personen:**
- TWW-Speicher 300 L, indirekt, Glattrohr, Email, ErP-A.
- Heizungspuffer 200 L als Reihenpuffer im Rücklauf.
- E-Heizstab 3 kW für Legionellenschaltung, zusätzlich 6 kW im Puffer (monoenergetisch).
- Standort: Technikraum, gedämmt, Entleerung vorsehen.

---

## 6. Plausibilitätsprüfungen

- **Pufferinhalt < Hersteller-Minimum Luft-WP** → Abtaustörung, Anlage taktet/stört.
- **Pufferinhalt > 100 L/kW ohne Sperrzeit** → Überdimensionierung, hohe Bereitschaftsverluste, längere Aufheizzeit.
- **TWW-Speicher zu klein** (< 50 L/Person) → Zapfkomfort unzureichend oder dauernd auf 60 °C → JAZ-Verlust.
- **TWW-Speicher zu groß** → Legionellenrisiko im unteren Drittel (Stagnation); DVGW W 551 Kontrolle nötig.
- **WT-Fläche unterdimensioniert** → WP taktet (niedrige Ladeleistung, lange Laufzeit).
- **TWW-Speicher-Soll > 55 °C ohne Heizstab** → WP läuft außerhalb effizienten Kennfelds, JAZ < 3,0.
- **Kein Vorrang Speicher** → Heizkreis und TWW kämpfen gegen Kessel/WP, Komfortverlust.
- **Kombispeicher ohne Schichtrohr** → Durchmischung zerstört Schichtung, solarer Ertrag sinkt.
- **Pufferverbindungen falsch (VL unten / RL oben)** → Schichtung invertiert, WP geht auf zu hohe RL → ineffizient.
- **Bereitschaftsverluste > 10 % des TWW-Jahresenergiebedarfs** → Speicher zu groß oder Dämmung zu schlecht.
- **Frischwasserstation ohne Pumpendruck-Prüfung** → Komforteinbußen bei Parallelzapfung.
- **Legionellenschaltung fehlt oder < 60 °C / < 3 min** → DVGW W 551 nicht erfüllt.
- **NT-Speicher elektrisch unterdimensioniert** → Wärmemenge nicht bis zur nächsten Freigabe gedeckt (B1 LF09 S.520).
- **Systemvolumen-Abstimmung fehlt** → MAG (Bereich K) wird zu klein ausgelegt.

---

## 7. Normenverweise

- **DIN 4708-1/-2/-3** (zentrale Wassererwärmungsanlagen, Bedarfskennzahl NL, Leistungskennzahl)
- **DIN EN 12897** (Speicher-Trinkwassererwärmer, Geschlossene Anlagen)
- **DIN EN 12828** (Heizungssysteme in Gebäuden – Planung; Einbindung Puffer)
- **DVGW W 551** (Legionellenschutz, 60 °C-Regel, TWW ≥ 55 °C)
- **DVGW W 553** (Zirkulationsleitungen, 5-K-Grenze)
- **VDI 4645** (Planung WP-Anlagen, Puffer-Auslegung)
- **EU-Verordnung 812/2013 & 814/2013 (ErP-Label Speicher)** Effizienzklassen A+–G
- **GEG § 71** (Anforderungen an Heizsysteme inkl. Speicher)
- **DIN 1988-200 / 300** (Trinkwasserinstallation)
- **VDI 2035** (Wasserbeschaffenheit – auch für Heizungs-Speicher)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| Bauarten Trinkwassererwärmer (Speicher/Durchfluss, offen/geschlossen, direkt/indirekt, Einzel/Gruppe/Zentral) | B1 LF09 S.519 |
| Speicherprinzip, Vor- und Nachteile, DIN 4708-Verweis, Solarspeicher 1,5–2 Tage, NT-Strom-Bevorratung | B1 LF09 S.520 |
| Aufheizzeit / Aufheizleistung Speicher-Formeln (Q = m·c·Δϑ, t = m·c·Δϑ/(η·Q̇zu), Q̇zu = m·c·Δϑ/(η·t)) | B1 LF09 S.513, S.574–576 |
| Speicher-Vorrangschaltung, 160-L-Beispiel 20 min = 30 kW, Kesselwasser kurzfristig 75 °C | B1 LF14 S.825 |
| Legionellenschutz, 60 °C-Regel, Zirkulations-Abkühlung 5 K, Zirkulationspumpe ≤ 16 h/d Zeitschaltuhr | B1 LF14 S.825 |
| Holzvergaser/Scheitholz: Pufferspeicher im Heizkreis nötig (Kombi) | B4 S.413 |
| Speichergröße / Puffer-Richtwerte Sanierung (L/kW, L/Person) | Konvention / WP-Herstellerangaben |
| Frischwasserstation, WP-Eignung, Legionellenminimierung | B1 LF12 S.719 |
| Speicher-Aufheizzeit/Wärmeleistung Detailrechnungen (TWE) | B2 Kap.4 S.115–129 |
| Bedarfskennzahl N (DIN 4708), NL-Speicher-Auslegung Wohngebäude | B2 Kap.4 S.129–131 |
| Speicher-/TWE-Formeln Quick-Ref (Q = m·c·Δϑ, t = Q/Q̇zu) | B3 Kap.5 S.51–54 |
| Speicher-Aufheizzeit Worked Example (300 L, 10→60 °C, 15 kW) | B5 Kap.4 |
| Speicher-Vorrang-Beispielrechnung im Heizungs-Kontext | B5 Kap.8 S.130–145 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 S.51–54)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| **Q = m · c · Δϑ** | Speicherinhalt Wärmemenge | kWh / Wh |
| **Q̇ = Q / t** | Wärmeleistung (Aufheiz/Entladen) | kW |
| **t = Q / (η · Q̇zu) = m·c·Δϑ / (η·Q̇zu)** | Aufheizzeit Speicher | h |
| ṁ_Lade = Q̇zu / (c · Δϑ_Lade) | Ladestrom | kg/h |
| η_Speicher = Qnutz / Qzu | Speicher-Wirkungsgrad | – |
| Q_Verlust = U · A · (ϑS − ϑU) · t | Bereitschaftsverluste | kWh |

*B3 Kap.5 deckt das Speicher-Berechnungsverfahren in kompakter Form ab. Identisch zu B1 LF09 S.574 und B2 Kap.4. Tool nutzt B3 als Plausibilitätsquelle.*

---

## 10. B2 Detailergänzungen – Kap.4 S.115–131

### 10.1 Speicher-Aufheizzeit & -Leistung (B2 Kap.4 S.115)

**Formelsystem (analog zu B1 LF09 S.574):**

| Berechnungsziel | Formel | Hinweis |
|------------------|--------|---------|
| Wärmemenge | Q = m · c · Δϑ | Δϑ = ϑZiel − ϑStart |
| Aufheizzeit | t = Q / (η · Q̇zu) | η ≈ 0,90 – 0,95 indirekt |
| Erforderliche Leistung | Q̇zu = Q / (η · t_soll) | Wenn t_soll vorgegeben |
| Massenstrom Ladekreis | ṁ = Q̇zu / (c · Δϑ_L) | Δϑ_L Lade-Spreizung |

**Worked Example B2 S.115:**
- Speicher 200 L, Aufheizung 12 °C → 55 °C, η = 0,93, t = 1,5 h
- Q = 200 · 1,163 · 43 = 10.002 Wh = **10,0 kWh**
- Q̇zu = 10,0 / (0,93 · 1,5) = **7,2 kW** → typische WP-Leistung ausreichend ✓

### 10.2 Bedarfskennzahl N nach DIN 4708 (B2 Kap.4 S.129–131)

**Formel:**
N = Σ(n · p · v · qv) / (3,5 · qv,NB1)
mit qv,NB1 = 5,82 kWh (Normalbadewanne).

**Eingangsgrößen:**
| Symbol | Bedeutung | Beispiel |
|--------|-----------|----------|
| n | Anzahl gleichartiger Wohneinheiten | EFH = 1 |
| p | Belegung (Personen/WE) | 4 |
| v | Anzahl Zapfungen pro Tag | NB 1, BR 2 |
| qv | Wärmebedarf pro Zapfung [kWh] | NB1 5,82; BRN 3,66; KX 0,28 |

**Wohnwerte aus B2 S.129:**
| Sanitärgegenstand | Symbol | qv [kWh] |
|-------------------|--------|----------|
| Normalbadewanne 1.700 mm | NB1 | 5,82 |
| Großbadewanne 1.800 mm | NB2 | 6,98 |
| Kleinbadewanne 1.500 mm | KB | 4,07 |
| Brausebad mit Normbrause | BRN | 3,66 |
| Küchenspüle | KX | 0,28 |
| Waschtisch | WT | 0,12 |

**Beispiel B2 S.131 (4-Pers.-EFH):**
- 1 NB1 × 1 Zapfung/d → 5,82 kWh
- 1 BRN × 2 Zapfungen/d → 7,32 kWh
- 1 KX × 3 Zapfungen/d × 0,2 Belegung → 0,168 kWh
- Σ = 13,3 kWh
- N = 13,3 / (3,5 · 5,82) = 13,3 / 20,37 = **0,65**

→ Speicher-Leistungskennzahl NL ≥ 0,65 erforderlich → Hersteller-Katalog: **300 L / 21 kW Ladeleistung** liefert NL = 1,0 → ausreichend ✓.

**Tool-Logik:** N-Berechnung als optionaler MFH-Modus (B2-Verfahren); EFH-Default direkt aus Tab. 3.2 (200/300/400 L).

---

## 11. Validierungs-Beispiele (B5 Kap.4 + Kap.8 S.130–145)

### 11.1 ⭐ TWW-Speicher-Aufheizzeit (B5 Kap.4, identisch B2 S.115)

**Aufgabe:**
- Speicher 300 L, ϑStart = 10 °C, ϑZiel = 60 °C, η = 0,92, Q̇zu = 15 kW (z. B. Brennwertkessel oder hybride WP+Heizstab).

Lösung:
- m = 300 kg, Δϑ = 50 K, c = 1,163 Wh/(kg·K)
- Q = 300 · 1,163 · 50 = 17.445 Wh = **17,45 kWh**
- t = 17,45 / (0,92 · 15) = **1,26 h ≈ 76 min**

**Tool-Validierung:**
1. Ladezeit < 2 h für Standard-EFH-Speicher ✓ (Komfort).
2. Bei reiner WP (5 kW Brauchwasser-Modus): t = 17,45 / (0,92 · 5) = 3,8 h → zu lang im EFH; daher Heizstab-Boost für Legionellenschaltung sinnvoll.
3. Speicher-Vorrang aktiv halten (Bereich L); Heizkreis pausiert während TWW-Ladung.

### 11.2 Speicher-Vorrang im Heizungs-Kontext (B5 Kap.8 S.140)

**Worked Beispiel (160-L-Speicher, B1 LF14 S.825 zugleich Lehrtext):**
- Aufheizung 20 → 60 °C in **20 min** Komfort-Ziel
- m·c·Δϑ = 160 · 1,163 · 40 = **7.443 Wh = 7,44 kWh**
- Q̇ = 7,44 / (1/3 h) = **22,3 kW** Leistungsbedarf

→ in EFH-WP-Kontext nicht erreichbar (10 kW WP) → **Vorrang + längere Ladezeit (40 min) akzeptieren** oder TWW-Soll auf 52 °C senken.

**Tool-Logik:** TWW-Vorrangzeit defaultmäßig 30 min anzeigen, Plausi-Warnung wenn Q̇WP < (V·c·Δϑ)/(t_Soll).

### 11.3 Cross-Check B2 / B3 / B4

| Thema | B2 Kap.4 | B3 Kap.5 | B1 LF09 / B4 | Fazit |
|-------|----------|----------|---------------|-------|
| Aufheizformel t = Q/(η·Q̇zu) | S.115 | S.51 (allgemein) | LF09 S.574 | konsistent |
| η Speicher-Wirkungsgrad | 0,90 – 0,95 | 0,80 – 0,95 | 0,80 – 0,92 (LF09 S.575) | konsistent |
| Bedarfskennzahl N (DIN 4708) | S.131 | nicht enthalten | LF09 S.520 (Verweis) | **B2 Primärquelle** |
| Wohnwerte qv (NB1, BRN, KX…) | S.129 | nicht enthalten | nicht enthalten | **B2 Primärquelle** |
| Pufferspeicher-Volumen L/kW | nicht enthalten | nicht enthalten | Konvention (Tab. 3.4) | Hersteller/Konvention |
| TWW-Speicher-Größe L/Person | nicht enthalten | nicht enthalten | LF09 S.520 + Tab. 3.2 | konsistent |
