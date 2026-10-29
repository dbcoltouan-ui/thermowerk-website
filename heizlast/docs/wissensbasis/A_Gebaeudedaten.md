# Bereich A – Gebäude- und Nutzerdaten

## 1. Zweck & Anwendung im Tool

Eingabebereich für Standort, Gebäudetyp, Nutzung und Temperatur-Randbedingungen. Liefert Parameter (θe, θm,e, θint, nmin) für alle nachfolgenden Bereiche. Bei Sanierung: Baujahr steuert Default-Vorschläge in Bereich B/C.

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| θm,e = Jahresmittel-Außentemperatur | Referenz für JAZ/Bivalenz | °C | B4 S.338 |
| θe = Norm-Außentemperatur am Standort | Auslegungs-θa | °C | B4 S.338 |
| θnb = (θint,i + θm,e) / 2 | Temperatur angrenzender Einheit | °C | B4 S.339 |

---

## 3. Tabellen & Richtwerte

### 3.1 Norm-Innentemperaturen θint nach Raumtyp (DIN/TS 12831-1:2020-04)

| Raumtyp | θint [°C] | Bekleidung [clo] | Aktivität [met] | Operative T [°C] |
|---------|-----------|-------------------|------------------|-------------------|
| Wohnungen, Hotelzimmer, WC | 20 | 1,0 | 1,2 | 21,0 – 23,0 |
| Badezimmer | 24 | 0,2 | 1,6 | 24,5 – 27,0 |
| Büro, Konferenz, Klassenzimmer | 20 | 1,0 | 1,2 | 19,0 – 25,0 |
| Kaufhäuser, Museen | 16 | 1,0 | 1,6 | 16,0 – 23,0 |
| Kirchen, ungeheizte Nebenräume | 15 | 1,5 | 1,3 | 4,0 – 22,0 |
| Schlafzimmer (Konvention DE) | 20 | – | – | – |
| Küche (Konvention DE) | 20 | – | – | – |
| Flur/Treppenhaus (Konvention DE) | 15 | – | – | – |
| Nebenraum unbeheizt | 10 | – | – | – |

*Quelle: B4 S.339; Konventionswerte DE = übliche Praxis.*

### 3.2 Norm-Außentemperaturen θe – ausgewählte Städte (DIN/TS 12831-1:2020-04)

| Stadt | θe [°C] | θm,e [°C] |
|-------|---------|-----------|
| Aachen | −8,8 | 10,1 |
| Berlin | −13,3 | 9,5 |
| Hamburg | −10,5 | 9,5 |
| München | −13,9 | 8,6 |

*Quelle: B4 S.338 – Vollständige Tabelle mit allen Referenzorten dort.*

### 3.3 Klimazonen Deutschland (15 Zonen)

| Zone | Bezeichnung | Repräsentant | θm,e [°C] |
|------|-------------|--------------|-----------|
| 1 | Nordseeküste | Bremerhaven | 9,0 |
| 2 | Ostseeküste | Rostock-Warnemünde | 8,4 |
| 6 | Nördl./westl. Mittelgebirge | Bad Marienberg | 6,8 |
| 8 | Oberharz/Schwarzwald | Braunlage | 6,0 |
| 15 | Alpenland/Täler | Garmisch-Partenkirchen | 6,8 |

*Quelle: B4 S.338 – Vollständige Zonentabelle dort. Default für Tool ohne Standort: θe=−12 °C, θm,e=9 °C.*

### 3.4 Luftwechsel n50 bei 50 Pa Druckdifferenz nach Gebäudekategorie

| Typ | Gebäudekategorie | n50 [h⁻¹] |
|-----|-------------------|-----------|
| Ia | Errichtet mit RLT-/Wohnungslüftungsanlage | 1,5 |
| Ib | Errichtet ohne raumlufttechnische Anlage | 3 |
| II | Errichtet mit mittlerer Dichtheit | 4 |
| **III** | **Andere Fälle (Wohngebäude im Bestand)** | **6** |
| IV | Offensichtliche Undichtheiten, offene Fugen | 10 |

*Quelle: B4 S.340.*

### 3.5 Abschirmkoeffizient e nach Windexposition

| Abschirmung | Hinweis | 0 / 1 / >1 exponierte Fassaden |
|-------------|---------|--------------------------------|
| keine | windreich, Hochhäuser, Stadtzentren | 0 / 0,03 / 0,05 |
| moderat | Vororte, Bäume/Gebäude | 0 / 0,02 / 0,03 |
| gut | Stadtzentrum mittlerer Höhe, Wald | 0 / 0,01 / 0,02 |

*Quelle: B4 S.340.*

### 3.6 Höhenkorrekturfaktor ε nach Raumhöhe h

| h [m] | 0–10 | 10–20 | 20–30 | 30–40 | 40–50 | 50–60 | 60–70 | 70–80 | 80–90 | 90–100 |
|-------|------|-------|-------|-------|-------|-------|-------|-------|-------|--------|
| ε | 1,0 | 1,2 | 1,5 | 1,7 | 2,0 | 2,1 | 2,3 | 2,4 | 2,6 | 2,8 |

*Quelle: B4 S.340. Für EFH (h<10 m) → ε=1,0.*

### 3.7 Nachbarraum-Temperaturkonventionen

| Nachbarraum | θ-Ansatz |
|-------------|----------|
| in gleicher Gebäudeeinheit | Raumtyp-θint (z. B. Bad 24 °C) |
| andere Gebäudeeinheit (Apartment) | (θint,i + θm,e) / 2 |
| separates Gebäude | θm,e |

*Quelle: B4 S.339.*

### 3.8 Heizgrenztemperaturen (Konvention, für JAZ/Betriebsstunden-Schätzung)

| Gebäudestandard | Heizgrenze [°C] |
|-----------------|------------------|
| EFH Bestand unsaniert | 15 |
| EFH teilsaniert | 13 |
| EFH GEG/Neubau | 12 |
| KfW-Effizienzhaus 70 | 10 |
| Passivhaus | 8 |

---

## 4. Exakt-Modus Workflow (bekannte Daten)

1. Standort → Postleitzahl/Stadt → θe + θm,e aus Tabelle 3.2 (B4 S.338)
2. Raumtyp je Raum → θint aus Tabelle 3.1
3. Gebäudekategorie I–IV → n50 aus Tabelle 3.4
4. Windexposition → e aus Tabelle 3.5
5. Raumhöhe → ε aus Tabelle 3.6

## 5. Richtwert-Modus Workflow (Sanierung/Unbekannt)

1. Standort unbekannt → Default θe=−12 °C / θm,e=9,0 °C
2. Raumtypen auto aus Grundriss-Schema (Wohnzimmer=20, Bad=24, Schlaf=20, Flur=15)
3. Gebäudekategorie aus Baujahr:
   - vor 1978 unsaniert → **III** (n50=6)
   - 1978–1994 → **II** (n50=4)
   - ab 1995 / fenstermodernisiert → **Ib** (n50=3)
   - KfW-Sanierung mit Lüftung → **Ia** (n50=1,5)
4. Abschirmung Default = moderat, 1 Fassade exponiert → e=0,02

---

## 6. Plausibilitätsprüfungen

- θe muss < 0 °C sein (deutsche Klimazonen)
- θm,e zwischen 6 und 11 °C
- θint-θe > 25 K (sonst unrealistisches Auslegungskriterium)
- n50 ≤ 10 (höhere Werte signalisieren Sanierungsbedarf-Priorität)

---

## 7. Normenverweise

- **DIN EN 12831-1:2017-09** (Hauptnorm Heizlast)
- **DIN/TS 12831-1:2020-04** (nationaler Anhang, Tabellen θe, θint, n50)
- **DIN EN 12831 Beiblatt 1:2017-07** (Klimadaten, Nutzungsprofile)

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| Formelzeichen-Konvertierung DIN 4701→EN 12831 | B4 S.328 |
| Norm-Heizlast-Prozess 5 Schritte | B4 S.327 |
| Klimazonen + θe/θm,e Städte | B4 S.338 |
| θint Raumtypen | B4 S.339 |
| Nachbarraum-θ-Ansatz | B4 S.339 |
| n50 Kategorien I–IV | B4 S.340 |
| Abschirmkoeffizient e | B4 S.340 |
| Höhenkorrektur ε | B4 S.340 |
| DIN EN 12831 Kontext (Software nötig) | B1 LF07 S.433 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref)

Aus B3 Formelsammlung Kap.5 – Heizungstechnik (S.51–66) zur direkten Anwendung im Tool:

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| Δϑ = ϑint − ϑe | Auslegungs-Temperaturdifferenz | K |
| ϑm = (ϑV + ϑR) / 2 | Mittlere Heizmitteltemperatur | °C |
| ϑnb = (ϑint,i + ϑm,e) / 2 | Nachbargebäudeeinheit | °C |

*Keine weiteren Standort-/Nutzer-Formeln in B3. Bereich A bleibt vollständig durch B4 S.338/339 abgedeckt.*

---

## 10. Validierungs-Beispiele (aus B5 Lösungen Kap.8)

**Beispiel aus Formblatt R (B5 S.140, Etagenwohnung Küche):**

- Raumgeometrie: b×l×h = 2,62 m × 4,135 m × 2,75 m → AR = 10,83 m², VR = 27,1 m³
- Randbedingungen: ϑint = 20 °C, ϑe = −12 °C, n50 = 4 h⁻¹, e = 0,01, ε = 1,0
- Mindest-Luftwechsel: V̇min = 0,5 h⁻¹ · 27,1 m³ = 13,55 m³/h
- Infiltration: V̇inf = 2 · 27,1 · 4 · 0,01 · 1 = 2,17 m³/h
- V̇therm = max(V̇min, V̇inf) = 13,55 m³/h
- → Input in Bereich C für HV/ΦV-Berechnung

**Merksatz Validierung:** Bei EFH mit nmin = 0,5 h⁻¹ und moderater Abschirmung dominiert der Mindestluftwechsel die Infiltration (Faktor ~6). Tool-Prüfung: V̇min ≥ V̇inf → dann mit V̇min rechnen.
