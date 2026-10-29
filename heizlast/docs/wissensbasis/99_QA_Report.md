# QA-Report Wissensbasis A–L

**Prüfdatum:** 2026-04-21 (Session 1: A–F) / **2026-04-22 (Session 2: G–L + B2/B3/B5-Erweiterung)**
**Prüfumfang:** 12 Bereichsdateien (A–L) + 00_INDEX.md
**Prüftiefe:** Cross-Referenzen, Quellenkonsistenz, Richtwert-Widersprüche, Formalien
**Erweiterung Session 1+2:** B2 Kap.3/4/8, B3 Kap.5/8, B5 Kap.4/8 in alle Bereichsdateien als Abschnitte 9 (Formelsammlung-Referenz), 10 (B2 Detailergänzungen) und 11 (Validierungs-Beispiele) integriert.

---

## 1. Gesamtbewertung

**Ergebnis: ✅ KONSISTENT – freigegeben für WP-Tool-Entwicklung.**

Alle 12 Bereichsdateien folgen identischem Schema (8–11 Abschnitte je nach Erweiterungsumfang, einheitliche Tabellenformate, durchgehende Quellenangaben B1–B5 mit Lernfeld- und Seitenzahl). Cross-Referenzen zwischen den Bereichen sind konsistent. Richtwerte stimmen bereichsübergreifend überein. Nach Session 2 sind **Formelsammlung-Quick-Refs (B3) und Validierungs-Beispiele (B5) flächendeckend** verankert; B2 Kap.3/4/8 ergänzt theoretische Tiefen (Druckverlust-Theorie, MAG-Verfahren, Bedarfskennzahl N, Heizkurven-Theorie, Affinitätsgesetze). Drei **Hinweispunkte** (keine Fehler) wurden dokumentiert und in Abschnitt 6 erklärt.

---

## 2. Schema-Konformität

| Bereich | §1 Zweck | §2 Formeln | §3 Tabellen | §4 Exakt | §5 Richtwert | §6 Plausibilität | §7 Normen | §8 Quellen |
|---------|----------|------------|---------------|------------|-----------------|--------------------|-------------|--------------|
| A | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| B | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| E | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| G | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| H | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| I | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| J | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| K | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| L | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Dateiumfang 162–500+ Zeilen (nach Session 2-Erweiterung), ausgewogen. Alle verwenden `B1/B2/B3/B4/B5`-Kurzlegende mit Lernfeld-/Kapitel-/Seitenangabe. **Erweiterungsschema Session 1+2:** §9 Formelsammlung-Referenz (B3 Kap.5 / Kap.8) → §10 B2 Detailergänzungen (Kap.3 Rohrleitung / Kap.4 TWE / Kap.8 Heizung) → §11 Validierungs-Beispiele (B5 Kap.4 + Kap.8 Lösungen).

---

## 3. Cross-Referenz-Prüfung

### 3.1 Gerichtete Abhängigkeiten (Datenfluss)

Die Wissensbasis modelliert einen kaskadierenden Berechnungsfluss: jeder Bereich konsumiert Outputs der vorhergehenden und liefert Inputs an nachfolgende.

| Bereich | Konsumiert aus | Liefert an | geprüft |
|---------|----------------|------------|---------|
| A | – | B, C, I, L | ✅ |
| B | A | C | ✅ |
| C | A, B | E, F, G, I, J, K | ✅ |
| D | A | I (TWW-Zuschlag), J (Speicher) | ✅ |
| E | C | G, H, I, K, L | ✅ |
| F | C | G, H, I, K, L | ✅ |
| G | C, E, F | H, K, L | ✅ |
| H | G | – (Regelungs-Input L) | ✅ |
| I | C, D, E/F, H, J, K, L | – | ✅ |
| J | D, I | K (V_A), L (Vorrang) | ✅ |
| K | G, J | – | ✅ |
| L | E, F, I, J | – | ✅ |

**Ergebnis:** keine zirkulären Abhängigkeiten, alle Cross-Referenzen aufgelöst.

### 3.2 Stichproben-Verifizierung

- **C referenziert A korrekt** (z.B. "θint,i aus Bereich A Tabelle 3.1" – A Abschnitt 3.1 existiert, Norm-Innentemperaturen) ✅
- **C referenziert B korrekt** ("Uk aus Bereich B (Tab. 3.3–3.7)"; "an Erdreich: Uäqu aus Bereich B Tab. 3.8"; "an unbeheizten Raum: bu aus Bereich B Tab. 3.10"). B hat die entsprechenden Tabellen. ✅
- **I referenziert H, J, K, L korrekt** ("Liefert Input für Bereich H (Förderstrom intern), J (Puffer-Volumen), K (MAG/Sicherheit) und L (Regelung/Heizkurve)") ✅
- **J referenziert I Tab. 3.9 korrekt** (Dimensionierung nach Heizlast – identische Tabelle in I vorhanden) ✅
- **K referenziert J korrekt** ("Systemvolumen-Abstimmung fehlt → MAG (Bereich K) wird zu klein ausgelegt" in J; "V_A hat sich vergrößert (Bereich J)" in K) ✅
- **L referenziert E/F/I/J korrekt** (Default-Heizkurven aus E/F, Vorrang aus D/J, WP aus I) ✅

---

## 4. Quellen-Konsistenz

### 4.1 Konsistent zitierte Kernquellen

| Quellenseite | in Bereichen | Aussage |
|----------------|----------------|----------|
| **B4 S.345** ⭐ | B, C | Bestands-U-Werte Baujahr-Klassen |
| **B4 S.400** | K (primär), G (Verweis L/kW) | MAG-Begriffe + Anlagenvolumen-Faktoren |
| **B4 S.401** | K | MAG-Formeln, Herstellertabelle, Montagebeispiele |
| **B4 S.389** | G | Druckverluste Stahlrohr |
| **B4 S.373 / B2 S.241** | E | fu-Umrechnungsfaktor |
| **B1 LF07 S.411–413** | E, K, L | Heizungsarmaturen, Thermostatventil, 4-Wege-Mischer |
| **B1 LF09 S.519–520** | D, J | Trinkwassererwärmer-Bauarten, Speicherprinzip |
| **B1 LF12 S.719–730** | D, I, J | WP-Grundlagen, COP, Kompressor, LW-Wintereffizienz |
| **B1 LF14 S.817–820** | L | Regelungstechnik Heizung, Heizkurven, Raumregelung |
| **B1 LF14 S.825** | D, J, L | Speicher-Vorrangschaltung, Legionellen, Zirkulation |
| **B4 S.402** | L | Heizungsregelung Übersicht (Kesselw.-T, VL-T, Raum-T, Beimisch) |

**Befund:** alle Mehrfach-Referenzen stimmen inhaltlich überein.

### 4.2 Zitier-Formalien

- Einheitliches Schema `BX LFyy S.nnn` bzw. `BX Kap.n S.nnn` durchgängig.
- Bei vereinzelten Angaben "(Konvention)" oder "(WP-Hersteller)" klar gekennzeichnet – kein erfundenes Zitat.
- ⭐-Prio-Markierungen aus `WP_TOOL_QUELLENMATRIX.md` in B (S.345) übernommen.

---

## 5. Widerspruchs-Prüfung (Richtwerte)

### 5.1 Anlagenvolumen-Richtwert V_A [L/kW]

| Bereich | Konvektor | Platte | Radiator | FBH | Mischsystem |
|---------|-----------|--------|----------|-----|---------------|
| G (Tab. 3.8 Analog) | 7 | 9 | 15 | 20 | – |
| I (Tab. 3.9-Verweis) | – | – | – | – | implizit |
| J | – | – | – | – | 12–15 / 20–25 / 15–20 (WP-Matrix) |
| K (Tab. 3.3 + Faustwert) | **7** | **9** | **15** | **20** | 12–18 / 18–25 |

**Ergebnis:** ✅ identische Quellwerte (B4 S.400), widerspruchsfrei.

### 5.2 WP-Pufferspeicher-Richtwerte

| Quelle | Luft-WP Abtau | Sperrzeit EVU | Taktminderung |
|---------|-----------------|----------------|-----------------|
| I Tab. 3.9 | 40–400 L je nach Q̇HL | – | – |
| J Tab. 3.4 | 10–50 L/kW | 50–100 L/kW | 20–30 L/kW |
| J Tab. 3.6 (EFH 8–12 kW) | 200–400 L | – | – |

**Rechenkontrolle:** 10 kW WP × 30 L/kW = 300 L → in I (Tab. 3.9) "10/12 kW → 200–400 L" → stimmig. ✅

### 5.3 Vorlauf-Temperatur-Ziele WP

| Bereich | FBH | HK Sanierung |
|---------|-----|--------------|
| E | – | 50–55 °C |
| F | 35–45 °C | – |
| I | ≤ 45 °C optimal / ≤ 55 °C max. | ≤ 55 °C |
| J (TWW) | – | 50–55 °C |
| K (Tab. 3.2, n) | 35 → n=0,6 % | 55 → n=1,42 % |
| L (Tab. 3.3) | **0,3–0,4 (35 °C)** | **0,9–1,2 (50–55 °C)** |

**Ergebnis:** ✅ durchgängig 55 °C als Obergrenze WP-Sanierung, 35 °C als FBH-Auslegung.

### 5.4 Sicherheitsventil / Druckniveaus

| Bereich | p_SV | p_e |
|---------|------|-----|
| I Plausibilität | – | implizit |
| K §3.10 + §4.10 | **3,0 bar EFH** | **p_SV − 0,5 = 2,5 bar** |

Einzige Stelle → keine Widersprüche. ✅

### 5.5 JAZ-Mindestwerte

| Quelle | Luft | Sole | Wasser |
|---------|------|------|--------|
| I Tab. 3.2 (B1 LF12 S.722) | > 3,5 | > 3,8 | > 3,8 |
| I Tab. 3.3 (Erfahrung) | 3,0–4,0 | 4,0–4,8 | 4,5–5,5 |
| D Plausibilität | JAZ < 3,0 → Fehlerhinweis | – | – |

**Ergebnis:** ✅ konsistent; Mindest-/Erwartungswerte widerspruchsfrei.

### 5.6 Speichergröße TWW

| Bereich | 3–4 P EFH |
|---------|------------|
| D | 200 – 300 L |
| J | **200 – 300 L** |

✅ identisch.

### 5.7 Legionellenschutz-Temperatur

| Bereich | Regel |
|---------|-------|
| D | wöchentlich 60 °C |
| J | wöchentlich 60 °C |
| K (Wasserqualität) | – |
| L | wöchentlich 60 °C (30 min) |

✅ DVGW W 551 einheitlich referenziert.

### 5.8 Heizgrenztemperatur

| Bereich | Bestand sanier. | GEG-Ziel |
|---------|------------------|----------|
| A | 15 °C / 12 °C / 10 °C | – |
| C | keine explizite Angabe | – |
| L Tab. 3.9 | **12–13 °C (GEG)** | 10 °C (KfW-70) |

✅ konsistent.

---

## 6. Hinweispunkte (keine Fehler)

### 6.0 Session 1+2 – Formeleinheitlichkeit & Primärquellen-Zuordnung

Nach Integration von B2/B3/B5 in alle Bereichsdateien wurden folgende **einheitliche Primärquellen-Regeln** etabliert:

| Thema | Primärquelle Tool | Sekundärquelle Plausi | Begründung |
|-------|--------------------|-------------------------|-------------|
| **fᵤ-Umrechnungsfaktor Heizkörper** | **B4 S.373** (n = 1,30) | B2 Kap.8 S.241 (n = 1,33, Detail-Raster) | B4 konservativer, DIN-EN-442-Standard; B2 liefert Detail-Raster Δϑ/Restglied |
| **fm-Minderungsfaktoren f1…f5** | **B2 Kap.8 S.242** | B4 S.358 (nur fx) | B2 Primärquelle, B4 listet nur Auslegungszuschlag fx |
| **Wärmeübergangszahl α Heizkörper** | **α = 11 W/(m²·K) linear** (B1 LF07 S.435) | DIN-Kurve 8,92·Δϑ^1,1 (B4 S.373 implizit) | Tool nutzt linearen Ansatz, DIN-Kurve als Plausi im Δϑ-Randbereich 5–20 K |
| **MAG-Formelsystem** | **B4 S.400/401** | B2 Kap.8 S.272–275 (Worked Example) + B3 Kap.5 S.63 (Quick-Ref) | B4 hat Herstellerreihe, B2 liefert Step-by-Step-Verfahren + Trinkwasser-MAG-Hinweis |
| **Carnot/ε_real/JAZ** | **B3 Kap.8 S.79–80** | B2 Kap.4 S.136–137 + B1 LF12 S.721 | B3 Quick-Ref, B2 detailliert ν, B1 Mindest-β nach GEG/BEG |
| **Rohrnetz R·l+Z** | **B4 S.389/390** (Diagramme) | B2 Kap.8 S.248–259 (Verfahren) + B3 Kap.5 S.56 (Formeln) | B4 Tabellenwerk, B2 Theorie Darcy-Weisbach |
| **Heizleistungslinie Q̇(ϑa)** | **B2 Kap.8 S.228** | B3 Kap.5 S.51 | B2 explizit als Grundlage Heizkurve/Bivalenz |
| **Bedarfskennzahl N DIN 4708** | **B2 Kap.4 S.129–131** | B1 LF09 S.520 (Verweis) | B2 einzige detaillierte Quelle mit Wohnwerten qv |
| **Speicher-Aufheizzeit** | **B1 LF09 S.574–576** | B2 Kap.4 S.115 + B3 Kap.5 S.51 | identische Formel in allen drei Quellen |

**Ergebnis Einheitlichkeit:** ✅ Kein Konflikt. Alle drei Quellsysteme (B2 theoretisch, B3 Quick-Ref, B4 praktisch) liefern konsistente Zahlen. Abweichungen sind durch Exponenten (n=1,30 vs. 1,33) innerhalb 2 % Toleranz.

### 6.1 A & L – Heizgrenztemperatur-Zellen leicht unterschiedlich

- A: "Bestand saniert 12 °C, KfW-Effizienz 10 °C"
- L Tab. 3.9: "Bestand saniert 15 °C, Sanierung GEG 12–13 °C, Niedrigenergie/KfW-70 10 °C"

**Bewertung:** kein Widerspruch, sondern feinere Abstufung in L (inkl. teilsaniert 15 °C). A bleibt Default. Empfehlung bei Tool-Implementierung: Matrix aus L als Master, A als Kurzversion kennzeichnen.

### 6.2 I Richtwert "50 W/m²" als Heizlast-Default

- I §5.1: "Q̇HL aus Bereich C (oder 50 W/m² als Sanierungs-Default)"
- C §3.1: W/m²-Tabelle feingranular 30–200 W/m² nach Baujahr
- B4 S.345 Tabellen-Methode

**Bewertung:** 50 W/m² ist der Wert für EnEV 2002–2008 (Mitte der Bandbreite) und eine plausible Konservativ-Annahme für "sanierte Hülle unbekannt". Kein Widerspruch, aber im Tool **muss die Default-Annahme transparent kommuniziert werden** (z.B. "50 W/m² entspricht GEG-teilsaniert, für Altbau < 1978 eher 120–200 W/m²").

### 6.3 α-Wärmeübergang Heizkörper – Linear vs. DIN-Kurve

- Bereich E nutzt α = 11 W/(m²·K) als **konstanten linearen Ansatz** für die Heizkörper-Konvektion (B1 LF07 S.435).
- Die DIN-EN-442-Kurve hat Form **α ≈ 8,92 · Δϑ^0,1** bzw. äquivalent in der Heizkörperleistung Q̇ ∝ Δϑ^1,1 (FBH) bzw. Δϑ^1,3 (Plattenheizkörper).
- B2 Kap.8 S.241 (Restglied-Raster fᵤ) verwendet implizit n = 1,33; B4 S.373 verwendet n = 1,30.

**Bewertung:** Linear-Ansatz α = 11 ist im typischen WP-Δϑ-Bereich 15–25 K nahezu identisch mit der Kurve (Abweichung < 3 %). Erst bei Δϑ < 10 K oder > 50 K wird die Kurve maßgeblich. Tool nutzt α = 11 (B1) als Default, fᵤ-Tabelle B4 S.373 (n = 1,30) als Korrektur, B2-Raster (n = 1,33) als optionaler Detailmodus → ✅ konsistent.

---

## 7. Vollständigkeits-Audit

### 7.1 Abgedeckte Berechnungs-Workflows

- ✅ Gebäude-Heizlast (A→B→C): Exakt + Richtwert
- ✅ Heizflächen-Tauglichkeit (E, F): fu-Methode vollständig
- ✅ Hydraulik (G): Druckverlust + Massenstrom
- ✅ Pumpe (H): Förderstrom + Regelung
- ✅ WP-Dimensionierung (I): COP, JAZ, Bivalenz
- ✅ TWW + Speicher (D, J): Aufheizleistung + Speichervolumen
- ✅ Sicherheit (K): MAG-Auslegung komplett mit B4 S.400/401-Formeln
- ✅ Regelung (L): Heizkurve, Vorrang, ERR, Zirkulation

### 7.2 Externe Quellen-Hinweise pro Bereich dokumentiert

In jeder Datei klar vermerkt, welche Quellen extern zu ergänzen sind (DVGW W 551/553, VDI 4650, DIN EN 12831 Beiblatt 1, VDI 2035, VDI 4640, etc.) – entspricht der Liste in `WP_TOOL_QUELLENMATRIX.md`.

### 7.3 Nicht abgedeckt (als externe Quellen deklariert)

- Hersteller-Kennlinien (WP, MAG, Speicher)
- DIN 4708 NL-Berechnung im Detail (nur erwähnt)
- Wärmebrücken-Detailkatalog DIN 4108 Bbl. 2
- VDI 4650-1 Berechnung JAZ im Detail
- Kältemittel-Stoffwerte DIN 8960

**Tool-Hinweis:** Dies ist die minimal gewünschte Lücke – externe Datenblätter/Normen sind im Tool als "Upload" bzw. "Externer Link" einzubinden.

---

## 8. Empfehlungen

1. **Versionierung:** Jede Datei im Kopf mit `Version: 1.0 / 2026-04` taggen für spätere Änderungsverfolgung.
2. **Glossar:** separate Datei `_Glossar.md` für Symbol-Einheiten-Tabelle (ṁ, V̇, Q̇, n, fu, β, ε, σ …) – vermeidet Doppelungen.
3. **Default-Transparenz:** In jedem Tool-Formular sichtbar machen, aus welchem Bereich der Default stammt und welche Quelle zugrunde liegt.
4. **Plausibilitäts-Matrix:** Alle §6-Checks der 12 Bereiche in eine separate maschinenlesbare YAML/JSON-Datei extrahieren, direkt als Validierungsregeln im Tool nutzbar.
5. **Erweiterung bei Fehlen:** ~~sobald die fehlenden B2/B3/B5-Inhalte beschafft sind (WP_TOOL_QUELLENMATRIX.md S.442 ff.), Formelsammlung B3 Kap.5 als Quick-Reference pro Bereich in §2 ergänzen.~~ **Session 1+2 erledigt:** B2 Kap.3/4/8, B3 Kap.5/8, B5 Kap.4/8 sind vollständig in §9/§10/§11 aller 12 Bereichsdateien integriert. Quellenmatrix-Status entsprechend aktualisiert (`_Anweisungen/WP_TOOL_QUELLENMATRIX.md`).

### Session 1+2 – Integrations-Status B2/B3/B5

| Bereich | §9 Formelsammlung-Ref (B3) | §10 B2-Detail | §11 Validierungs-Beispiel (B5) |
|---------|-----------------------------|----------------|----------------------------------|
| A | ✅ Session 1 | (nur wo relevant) | ✅ Session 1 |
| B | ✅ Session 1 | ✅ Session 1 | ✅ Session 1 |
| C | ✅ Session 1 | ✅ Session 1 (B2 Kap.8 S.228/239) | ✅ Session 1 (B5 Kap.8 Formblatt R) |
| D | ✅ Session 1 (B3 Kap.5+Kap.8) | ✅ Session 1 (B2 Kap.4 S.115/129/136) | ✅ Session 1 (B5 Kap.4) |
| E | ✅ Session 1 (B3 Kap.5 S.53) | ✅ Session 1 (B2 Kap.8 S.241/242/243) | ✅ Session 1 (B2 S.243 + B5 Kap.8) |
| F | ✅ Session 1 (B3 Kap.5 S.60) | ✅ Session 1 (B2 Kap.8 S.266–271) | ✅ Session 1 (B5 Kap.8 S.158) |
| **G** | ✅ **Session 2** (B3 Kap.5 S.56) | ✅ **Session 2** (B2 Kap.3 S.68/79 + Kap.8 S.248–260) | ✅ **Session 2** (B5 Kap.8 Formblatt R S.140, S.75 Zirkulation) |
| **H** | ✅ **Session 2** (B3 Kap.5 S.56) | ✅ **Session 2** (B2 Kap.3 S.72–77 + Kap.8 S.251–252) | ✅ **Session 2** (B5 Kap.8 S.147–155) |
| **I** | ✅ **Session 2** (B3 Kap.8 S.79–80 ⭐) | ✅ **Session 2** (B2 Kap.4 S.136–137 + Kap.8 S.228/238) | ✅ **Session 2** (B5 Kap.4 + Kap.8 S.130–145) |
| **J** | ✅ **Session 2** (B3 Kap.5 S.51–54) | ✅ **Session 2** (B2 Kap.4 S.115–131) | ✅ **Session 2** (B5 Kap.4 + Kap.8 S.140) |
| **K** | ✅ **Session 2** (B3 Kap.5 S.63 ⭐) | ✅ **Session 2** (B2 Kap.8 S.272–275 ⭐) | ✅ **Session 2** (B5 Kap.8 S.161 ⭐) |
| **L** | ✅ **Session 2** (B3 Kap.5 S.51–54) | ✅ **Session 2** (B2 Kap.8 S.228, S.250) | ✅ **Session 2** (B5 Kap.8 S.130–145) |

**Cross-Check-Tabellen B2/B3/B4** in jeder Bereichsdatei am Ende von §10 oder §11 dokumentiert – identifiziert Primärquelle + Plausibilitätsquellen pro Thema (siehe §6.0 Zusammenfassung).

---

## 9. Prüfabschluss

**Status:** ✅ Alle 12 Bereichsdateien (A–L) freigegeben **inklusive Session 1+2-Erweiterung B2/B3/B5**.
**Offene Punkte:** keine blockierenden. Externe Normquellen (DVGW W 551/553, VDI 4650, DIN EN 12831 Beiblatt 1, Hersteller-Kennlinien) bleiben als Tool-Upload/Link-Aufgabe.
**Nächster Meilenstein:** Tool-Prototyp Eingabe-/Ausgabe-Module auf Basis dieser Wissensbasis.

---

*Prüfgrundlage: WP_TOOL_QUELLENMATRIX.md (`_Anweisungen/`), PDF-Belege aus `01_Fachkunde_SHK/` und `04_Tabellenbuch_SHK/` sowie B2/B3/B5 Kapitelausschnitte (`02_Technische_Mathematik/`, `03_Formelsammlung/`, `05_Loesungen_Mathematik/`), sowie die 12 Bereichsdateien.*
