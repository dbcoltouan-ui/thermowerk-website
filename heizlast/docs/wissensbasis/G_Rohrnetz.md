# Bereich G – Rohrnetz / Hydraulik

## 1. Zweck & Anwendung im Tool

Dimensionierung der Verteil- und Strangrohre nach Heizmittel-Massenstrom, Druckverlust und Strömungsgeschwindigkeit. Ermittelt pro Leitung: Innendurchmesser di, R [mbar/m], Einzelwiderstände Z, Gesamtdruckverlust Δpges. Ergebnisse bilden Input für Pumpenauslegung (Bereich H) und hydraulischen Abgleich. Zwei Modi: Exakt (R-Diagramm B4 S.389–390 mit Massenstrom aus Bereich E/F) oder Richtwert (Bestands-Fallback über R-Bandbreite 0,4–1,0 mbar/m).

---

## 2. Kernformeln

| Formel | Bedeutung | Einheit | Quelle |
|--------|-----------|---------|--------|
| **ṁ = Q̇H / (c · Δϑ)** | Heizmittel-Massenstrom | kg/h | B1 LF07 S.437 |
| V̇ = ṁ / ρ | Volumenstrom | m³/h | B1 LF07 S.437 |
| v = V̇ / A = 4·V̇ / (π·di²) | Strömungsgeschwindigkeit | m/s | B4 S.389 |
| **ΔpR = R · l** | Druckverlust gerade Rohre (Rohrreibung) | Pa / mbar | B1 LF07 S.438 |
| Z = ζ · ρ/2 · v² | Druckverlust Einzelwiderstände | Pa | B1 LF07 S.437 |
| **Δpges = Σ(R · l + Z)** | Gesamtdruckverlust ungünstigster Strang | Pa | B1 LF07 S.437 |
| c (Wasser) = 1,163 | Spez. Wärmekapazität Heizwasser | Wh/(kg·K) | B3 |
| ρ (Wasser 70 °C) = 978 | Dichte Heizwasser | kg/m³ | B4 S.389 |
| Δϑ_Ausl = ϑV − ϑR | Spreizung (Input) | K | B1 LF07 S.437 |

*Merksatz: ṁ [kg/h] ≈ 0,86 · Q̇ [kW] / Δϑ [K] · 1000 (nach Umrechnung c).*

---

## 3. Tabellen & Richtwerte

### 3.1 Empfohlene R-Bandbreite Rohrnetz (B1 LF07 S.437)

| Anlagen-/Rohrabschnitt | R [mbar/m] |
|------------------------|-------------|
| **Wohnung / EFH Verteilung** | **0,4 – 1,0** |
| Steigstränge mehrstöckig | 1,0 – 1,5 |
| Verteilung im Keller | 0,5 – 1,0 |
| Heizkreis FBH/HK-Anbindung | ≤ 2,0 (kurz) |

**Richtwert WP-Sanierung (Einrohr-zu-Zweirohr-Umbau, kleine Radien):** R = 0,5 – 0,8 mbar/m ansetzen, damit Pumpenleistung bei großer Spreizung σ = 5 K nicht explodiert.

### 3.2 Maximale Strömungsgeschwindigkeit (B4 S.389, B1 LF07 S.437)

| Abschnitt | v_max [m/s] |
|-----------|--------------|
| Kupfer-/Stahlrohr Wohnbereich (Schallschutz) | 0,5 |
| Stahlrohr Keller/Technikraum | 1,0 |
| Stahlrohr Hauptverteilung | 1,2 – 1,5 |
| PE-X Heizkreis FBH | 0,7 |
| Verbundrohr Anbindung HK | 0,5 – 0,8 |

### 3.3 Druckverluste Stahlrohr (Auszug B4 S.389, ρ = 978 kg/m³, ϑ = 70 °C)

Innendurchmesser / Massenstrom-Grenzen bei R = 1,0 mbar/m:

| DN | di [mm] | ṁ [kg/h] bei R 1 mbar/m | v [m/s] |
|-----|----------|---------------------------|---------|
| 10 | 12,5 | ~ 40 | 0,10 |
| 15 | 16 | ~ 95 | 0,15 |
| 20 | 21,6 | ~ 220 | 0,20 |
| **25** | **27,2** | **~ 430** | **0,25** |
| **32** | **35,9** | **~ 900** | **0,30** |
| 40 | 41,8 | ~ 1.400 | 0,35 |
| 50 | 53 | ~ 2.800 | 0,40 |
| 65 | 68,8 | ~ 5.500 | 0,45 |
| 80 | 80,8 | ~ 8.500 | 0,50 |

Max. zul. v: 0,5 m/s Wohn-, 1,0 m/s Keller; ansonsten Geräusch und Erosion.

### 3.4 Druckverluste PE-X (B4 S.390)

| Außen × Wand [mm] | di [mm] | ṁ [kg/h] bei R 2 mbar/m |
|--------------------|----------|---------------------------|
| 12 × 2 | 8 | ~ 60 |
| 14 × 2 | 10 | ~ 110 |
| **16 × 2** | **12** | **~ 180** |
| 17 × 2 | 13 | ~ 220 |
| 20 × 2 | 16 | ~ 400 |
| 25 × 2,3 | 20,4 | ~ 800 |

**Vollständige R-ṁ-v-Matrix PE-X stabil (B4 S.390, ϑm = 60 °C)** — Auszug für Tool-Interpolation (R in Pa/m, jeweils ṁ in kg/h | v in m/s):

| R [Pa/m] | 16,2×2,6 | 20×2,9 | 25×3,7 | 32×4,7 | 40×6,0 |
|---|---|---|---|---|---|
| 50 | 53,4 kg/h / 0,16 m/s | 123,0 / 0,20 | 201,1 / 0,23 | 396,6 / 0,28 | 709,4 / 0,33 |
| 100 | 79,4 / 0,24 | 166,9 / 0,30 | 298,9 / 0,35 | 589,3 / 0,42 | 1054,1 / 0,48 |
| 150 | 100,1 / 0,31 | 210,5 / 0,38 | 376,9 / 0,44 | 742,9 / 0,52 | 1328,9 / 0,61 |
| 200 | 118,0 / 0,36 | 248,1 / 0,44 | 444,2 / 0,52 | 875,7 / 0,62 | 1566,4 / 0,72 |
| 300 | 148,8 / 0,46 | 312,7 / 0,56 | 560,0 / 0,65 | 1104,0 / 0,78 | 1974,8 / 0,91 |
| 500 | 199,2 / 0,61 | 418,7 / 0,75 | 749,8 / 0,87 | 1478,2 / 1,04 | 2644,2 / 1,21 |

Die vollen Tabellenwerte (R = 50…500 Pa/m in 10er-Schritten) liegen in B4 S.390. Maximalwert für Wohnbereich v ≤ 0,5 m/s (Schallschutz) → praktisch R ≤ 100 Pa/m = 1,0 mbar/m.

**Hinweis Mehrschicht-Verbundrohr (Al-PEX):** B4 S.379 listet Verbundrohre nur mit „Herstellerangaben" — **keine Norm-Tabelle** in B1/B2/B4 vorhanden. Als Fallback im Tool die PE-X-Tabelle 3.4 verwenden (Abweichung typ. < 10 % durch Al-Einlage marginal steifer, gleiche Innenwand-Rauigkeit). Exakte Druckverluste ab Phase 12 aus Uponor/Rehau/Geberit-Produktdaten.

### 3.4b Druckverluste Kupferrohr (B4 S.388, ϑm = 60 °C)

Vollständige Cu-Druckverlust-Matrix nach Herstellerangaben, R in Pa/m, ṁ in kg/h | v in m/s:

| R [Pa/m] | 12×1 | 15×1 | 18×1 | 22×1 | 28×1,5 | 35×1,5 |
|---|---|---|---|---|---|---|
| 10 | 16 / 0,06 | 34 / 0,07 | 62 / 0,09 | 113 / 0,10 | 209 / 0,12 | 411 / 0,14 |
| 20 | 25 / 0,06 | 52 / 0,11 | 92 / 0,13 | 170 / 0,15 | 313 / 0,18 | 613 / 0,22 |
| 50 | 43 / 0,16 | 89 / 0,19 | 157 / 0,22 | 288 / 0,26 | 529 / 0,31 | 1033 / 0,36 |
| 100 | 65 / 0,23 | 133 / 0,28 | 234 / 0,33 | 429 / 0,39 | 786 / 0,45 | 1530 / 0,54 |
| 150 | 82 / 0,29 | 168 / 0,36 | 295 / 0,42 | 541 / 0,49 | 989 / 0,57 | 1924 / 0,68 |
| 200 | 97 / 0,35 | 197 / 0,42 | 348 / 0,49 | 637 / 0,57 | 1164 / 0,67 | 2262 / 0,79 |
| 300 | 122 / 0,44 | 250 / 0,53 | 439 / 0,62 | 802 / 0,72 | 1463 / 0,08 | 2840 / 1,00 |
| 500 | 164 / 0,59 | 334 / 0,71 | 586 / 0,82 | 1070 / 0,96 | 1950 / 1,12 | 3780 / 1,33 |
| 700 | 199 / 0,72 | 405 / 0,86 | 709 / 1,00 | 1294 / 1,16 | 2356 / 1,36 | 4562 / 1,60 |

Gültigkeit: DIN EN 1057 Cu-Rohr blank, Warmwasser 60 °C. B4 S.388 listet R = 10…700 Pa/m in 10er-Schritten (Originaltabelle). v-Grenzen Wohnbereich 0,5 m/s → R_max ≈ 150–200 Pa/m je nach DN.

### 3.4c Druckverluste Präzisionsstahlrohr (B4 S.387)

Diagramm-Ablesung Stahl-Präzisionsrohr (DIN EN 10305) für Innen-Durchmesser 10×1 / 12×1 / 12×1,2 / 14×1 / 15×1 / 16×1 / 18×1,2 / 22×1,2 / 28×1,2 mm, ṁ 25…2000 kg/h bei R 0,2…5,0 mbar/m, v 0,1…1,1 m/s. Deckt den Übergang zwischen DN 10–32-Gewinderohr (3.3) und Cu-Feinrohr (3.4b) ab. Für Tool-Implementierung: bei 12×1 Präzisionsstahl ≈ 12×1 Cu ±5 % (gleiche Innenrauigkeit-Klasse).

### 3.5 Einzelwiderstände ζ – Richtwerte (B1 LF07 S.437, konventionell)

| Bauteil | ζ |
|---------|----|
| Bogen 90° Kupfer/Stahl | 1,0 |
| Bogen 45° | 0,5 |
| T-Stück Durchgang | 1,0 |
| T-Stück Abzweig | 1,5 |
| Kugelhahn offen | 0,2 |
| Schrägsitzventil | 3,0 |
| Rückschlagklappe | 2,0 |
| Schmutzfänger | 4,0 |
| Heizkörper-Anschluss | 2,5 |
| Dreiwegeventil | 10 |

**Faustregel Altbau-Sanierung:** Σζ ≈ 25 – 40 pro Strang (viele Bögen, alte Armaturen).

### 3.5b Einzelwiderstände ζ – Erweitert (B4 S.391, DN-spezifisch)

B4 S.391 listet ζ differenziert nach DN 10–15 / 20–25 / 32–40 / ≥ 50. Auszug für Tool-Matching:

| Bauteil | ζ DN 10–15 | DN 20–25 | DN 32–40 | DN ≥ 50 |
|---|---|---|---|---|
| Etagenbogen, Ausbiegestück | 0,5 | 0,5 | 0,5 | 0,5 |
| 90°-Winkel + Verschraubung | 2,0 | 1,5 | 1,0 | 1,0 |
| Lyrabogen glatt | — | — | — | 1,5 |
| Lyrabogen Wellrohr | — | — | — | 2,0 |
| Lyrabogen gefaltet | 0,75 | — | — | — |
| Richtungsänderung r/d = 1 | 0,5 | 0,5 | 0,5 | 0,5 |
| Richtungsänderung r/d = 1,5 | 0,3 | 0,3 | 0,3 | 0,3 |
| T-Abzweig Trennung | 1,5 | 1,5 | 1,5 | 1,5 |
| T-Abzweig Durchgang | 0,5 | 0,5 | 0,5 | 0,5 |
| T-Vereinigung Trennung | 1,0 | 1,0 | 1,0 | 1,0 |
| T-Vereinigung Durchgang | 0,5 | 0,5 | 0,5 | 0,5 |
| T-Gegenlauf Trennung/Vereinigung | 3,0 | 3,0 | 3,0 | 3,0 |
| Verteiler/Sammler | 0,5 | 0,5 | 0,5 | 0,5 |
| Schmutzfänger | 7,5 | 5,0 | 2,0 | 1,2 |
| Heizkörper-Durchgangsventil | 8,5 | 6,0 | 5,0 | — |
| Heizkörper-Eckventil | 4,0 | 2,0 | 2,0 | — |
| Rücklaufverschraubung absperrbar | 4,0 | 2,0 | — | — |
| Absperrschieber | 1,0 | 0,5 | 0,3 | 0,3 |
| Ventil Geradsitz | 10 | 7,0 | 5,0 | 4,0 |
| Ventil Schrägsitz | 3,5 | 3,0 | 2,5 | 2,0 |
| Eckventil | 4,0 | 2,0 | 2,0 | 1,5 |
| Kugelhahn | 0,5 | 0,6 | 0,8 | 0,8 |
| Rückschlagklappe | 2,8 | 2,0 | 1,2 | 1,0 |
| Rückschlagventil | 5,0 | 4,0 | 4,0 | 3,5 |
| Heizkessel | 2,5 | 2,5 | 2,5 | 2,5 |
| Heizkörper (gesamt) | 2,5 | 2,5 | 2,5 | 2,5 |
| Speicher | 2,5 | 2,5 | 2,5 | 2,5 |
| Überbogen | 1,0 | 1,0 | 1,0 | 1,0 |

### 3.5c Überschläglicher Druckverlust Z₁ bei ζ = 1 (B4 S.388, Warmwasser 80 °C, ρ = 972 kg/m³)

Für Schnellrechnung `Z = Σζ · Z₁` mit tabelliertem Z₁(v):

| v [m/s] | 0,10 | 0,15 | 0,20 | 0,25 | 0,30 | 0,35 | 0,40 | 0,45 | 0,50 | 0,55 | 0,60 | 0,65 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Z₁ [Pa] | 4,9 | 11,1 | 19,7 | 30,7 | 44,2 | 60,2 | 78,7 | 100 | 123 | 149 | 177 | 208 |

| v [m/s] | 0,70 | 0,75 | 0,80 | 0,85 | 0,90 | 0,95 | 1,00 | 1,10 | 1,20 | 1,30 | 1,50 | 2,00 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Z₁ [Pa] | 241 | 277 | 315 | 355 | 398 | 444 | 492 | 595 | 708 | 831 | 1106 | 1966 |

Formel: `Z₁ = ρ/2 · v²`. Bei 60 °C (ρ = 978 kg/m³) Abweichung < 1 % → Z₁-Werte direkt übernehmbar.

### 3.6 Ventilautorität & Voreinstellung (B1 LF07 S.439, S.423)

- Thermostatventil-Voreinstellung nach ṁ und Differenzdruck, Hersteller-Kv-Tabelle.
- Ventilautorität a = Δp_Ventil / Δp_Strang ≥ 0,3 (besser 0,5) für saubere Regelung.
- **Empfohlener Differenzdruck für hydraulischen Abgleich: ca. 100 mbar am ungünstigsten Verbraucher** (B1 LF07 S.423).

### 3.7 Anlagenvolumen – Richtwerte VA [Liter/kW] (B4 S.400)

| Heizfläche | VA [L/kW] |
|-------------|-----------|
| Konvektor | 7 |
| Plattenheizkörper | 9 |
| Röhren-/Gliederradiator | 15 |
| **Fußbodenheizung** | **20** |

*Wichtig für WP-Pufferspeicher-Dimensionierung (Bereich J) und MAG (Bereich K).*

### 3.9 Richtwerte Druckgefälle pro Leitungstyp (B4 S.386, B1 LF07 S.437 Tab. 1)

Feiner gegliederte Empfehlung als Tab. 3.1, gekoppelt an zulässige Fließgeschwindigkeit:

| Rohrleitung | R [Pa/m] | R [mbar/m] | v [m/s] |
|---|---|---|---|
| Heizkörperanschlüsse (Raumbereich) | 25–90 | 0,25–0,9 | 0,1–0,3 |
| Innerhalb Wohnungen + Steigstränge | 40–100 | 0,4–1,0 | 0,4–0,7 |
| Verteilungsleitungen im Keller | 100–200 | 1,0–2,0 | 0,7–1,5 |
| Büro-/Gewerberäume, Schulen | 124–250 | 1,24–2,5 | 1,0–2,0 |
| Sonderfälle / Fernleitungen | > 400 | > 4,0 | > 2,5 |

*Tool-Default WP-Sanierung:* Raumanschluss 0,5 mbar/m, Steigstrang 0,7 mbar/m, Keller-Verteilung 1,0 mbar/m. Damit bleibt Σ Δp pro Strang ≤ 300 mbar und WP-Pumpe auf Standardmodell ausreichend.

### 3.10 Leitungslängen-Richtwerte (B4 S.386, Richtwert-Modus)

Für den Richtwert-Modus (unbekannte Installations-Details) liefert B4 S.386 eine geschlossene Formel für den längsten/ungünstigsten Heizstrang:

```
l_max = 2 · (a + b + h)    [m]
```

mit `a` = Haus-Breite, `b` = Haus-Länge, `h` = Haus-Höhe (alle in m). Ergibt die doppelte umhüllende Abwicklung von Vor- und Rücklauf für den ungünstigsten HK.

**Beispiel EFH 10 × 12 × 7 m:** l_max = 2 · (10 + 12 + 7) = 58 m (Vor- und Rücklauf).

**Rohrnetz-Gesamt (alle Stränge, Richtwert-Schätzung):**
- Einfach-EFH (eine Ebene): `l_ges ≈ 2,5 · Grundrissfläche` (bereits in §5 Punkt 5).
- Mehrgeschossiges EFH: `l_ges ≈ 2,0 · (a+b+h) · N_HK / 2` als Obergrenze, wobei N_HK = Anzahl Heizkörper.
- MFH: Faustregel `l_ges ≈ 1,8 · N_wohnungen · (a+b+h)`.

**Zuschlagfaktoren Z_F für Einzelwiderstände (B4 S.386):**

Pauschaler Aufschlag auf die reine Rohrreibung, wenn Einzelwiderstände im Richtwert-Modus überschlägig mitgerechnet werden: `Δp_ges = R · l · Z_F`.

| Rohrleitung enthält | Z_F | max. Rohrlänge (VL+RL) bei R = 100 mbar (10 kPa) | max. Rohrlänge bei R = 150 mbar |
|---|---|---|---|
| nur Formteile (Bögen, T-Stücke) | 1,3 | 91 m | 60 m |
| Formteile + Thermostatventil | 1,7 (→ Summenfaktor 2,2) | 68 m | 45 m |
| Formteile + Thermostatventil + Mischer | 2,6 | 45 m | 30 m |

*Anwendung im Tool (Richtwert-Modus):*
1. l_max aus Geometrie oder Grundrissfläche × 2,5.
2. Z_F wählen (Defaults: FBH-Kreis mit Mischer → 2,6; HK-Stich direkt an WP → 2,2; Verteil-Strang ohne HK-Armatur → 1,3).
3. R aus Tab. 3.9 (Raumbereich 0,5 mbar/m, Keller 1,0 mbar/m).
4. Δp ≈ R · l_max · Z_F. Plus 100 mbar WP-intern + 100 mbar Abgleich-Reserve.

Das ersetzt für die Schnellschätzung das vollständige Teilstrecken-Verfahren und liefert Pumpenauslegung im ±20 %-Bereich.

### 3.11 Ventil-Voreinstellwerte Kompakt-HK (B4 S.393, 70/55/20 + 55/45/20, Δp_V = 100 mbar)

Voreinstellwerte 1…6 pro Heizkörper-Typ × Bauhöhe × Baulänge, Herstellerangaben generisch. Relevant für Phase 8/9 (Hydraulischer Abgleich).

Auszug (Typ 22, H 500–900, L 600–2000 mm, A_Wohn ≤ 500 m², nahezu unverändertes Q̇_HL):

| BL \ BH | 500 / Typ 22 | 600 / 22 | 700 / 22 | 900 / 22 |
|---|---|---|---|---|
| 600 | 2 | 3 | 3 | 3 |
| 800 | 2 | 3 | 4 | 4 |
| 1000 | 3 | 4 | 4 | 5 |
| 1200 | 3 | 5 | 5 | 6 |
| 1400 | 4 | 5 | 5 | 6 |
| 1600 | 4 | 5 | 6 | 6 |
| 1800 | 5 | 6 | 6 | 6 |
| 2000 | 5 | 6 | 6 | – |

Voll-Tabelle (Typen 10/11/21/22/33, BH 300/350/400/500/600/900) liegt in B4 S.393. Tool-Kurzlogik für Phase 9 Umwälzpumpe + Phase 13 Abgleich-Assistent: Eingang = Typ×H×L + Q̇_HL → Voreinstellung aus Matrix; Fall < 1 → Δp_Ventil < 100 mbar → Differenzdruckregler empfohlen.

### 3.12 Rohrwerkstoffe – Einsatzbereiche (B4 S.379)

| Werkstoff | Einsatz | Verbindung | Besonderheit |
|-----------|---------|-------------|---------------|
| Stahl schwarz (DIN EN 10255) | Verteilung, Keller | Schweiß/Gewinde | Klassiker, sauerstoffdicht mit MAG |
| Edelstahl 1.4401 | Trinkwarmwasser/Heizung | Pressfitting | korrosionsfest |
| Kupfer (EN 1057) | Anbindung, Verteilung | Löten/Pressen | max. 110 °C |
| PE-X (EN ISO 15875) | FBH, Anbindung | Press/Klemmring | O₂-Sperrschicht Pflicht |
| Verbundrohr Al-PEX | Flexible Anbindung | Pressen | formstabil |

---

## 4. Exakt-Modus Workflow

### Schritt 1 – Heizmittel-Massenstrom je Strang
Aus Bereich C + D + E/F Gesamt-Q̇; Spreizung σ nach WP-Design (7 K FBH, 10 K HK) → ṁ = Q̇ / (c·σ).

### Schritt 2 – Ungünstigster Strang identifizieren
Maximale Rohrlänge + größte Σζ (meist oberster/entferntester Heizkörper). Schema zeichnen, Teilstrecken nummerieren.

### Schritt 3 – Teilstrecken-Tabelle
Je Teilstrecke: Q̇, ṁ, l, gewählter DN/Di (Tabellen 3.3 / 3.4).

### Schritt 4 – R ablesen
Aus R-Diagramm B4 S.389 (Stahl) bzw. S.390 (PE-X) mit ṁ + gewähltem DN → R und v.
Prüfung v ≤ v_max (Tab. 3.2).

### Schritt 5 – Einzelwiderstände
Σζ aus Tab. 3.5 + Ventile. Z = Σζ · ρ/2 · v².

### Schritt 6 – Teilstrecken-Δp
Δp_TS = R·l + Z.

### Schritt 7 – Gesamtdruckverlust
Δpges = Σ Δp_TS über ungünstigsten Strang + Wärmeerzeuger + Sicherheitsaufschläge.
*Richtwert-Aufschläge:* Kessel/WP intern 50 – 150 mbar, Mischer 50 – 100 mbar, Schmutzfänger 30 mbar.

### Schritt 8 – Hydraulischer Abgleich
Für jeden Heizkörper: Voreinstellung Thermostatventil so wählen, dass Δp am Ventil = (Δp_ungünstig − Δp_Strang_aktuell) + ~100 mbar.

### Schritt 9 – Übergabe an Bereich H
Pumpe mit V̇ges + Δpges auslegen (Tab. 3.2 / Kennlinien Bereich H).

---

## 5. Richtwert-Modus Workflow (Sanierung)

1. **Gesamt-Q̇** aus Bereich C.
2. **σ-Annahme** nach WP-Design:
   - WP + FBH saniert: σ = 5 – 7 K
   - WP + HK (Bestand): σ = 7 – 10 K
   - Brennwert + HK: σ = 15 – 20 K
3. ṁ_ges = 0,86 · Q̇[kW] / σ[K] · 1000 → kg/h.
4. **Hauptleitung DN aus Tab. 3.3** bei R = 1,0 mbar/m ablesen.
5. Rohrnetzlänge schätzen: Gebäudegrundriss · 2,5 (Vor-+Rücklauf + Verzweigung).
6. **Richtwert Δp-Rohrnetz:** 100 – 300 mbar (EFH), 200 – 500 mbar (MFH saniert).
7. **Kesselraum/WP intern:** + 100 mbar, Mischer + 100 mbar, Schmutzfänger + 30 mbar.
8. **Δp_Abgleich-Reserve:** + 100 mbar.
9. Pumpenauslegung ≥ Δpges aus Bereich H.

**Sanierungs-Default für 150 m² EFH, WP + HK (Bestand):**
- ṁ ≈ 600 – 900 kg/h bei 8 kW / 10 K
- Hauptleitung DN 25 (Stahl) oder Cu 28 × 1
- Δpges ≈ 300 – 400 mbar (inkl. WP + Abgleich-Reserve)

---

## 6. Plausibilitätsprüfungen

- v > v_max (Tab. 3.2) → DN zu klein, Strömungsgeräusch, Erosion → DN erhöhen.
- R > 1,5 mbar/m im Wohnbereich → Pumpe unnötig groß, DN erhöhen.
- R < 0,3 mbar/m → Rohrnetz überdimensioniert, höhere Kosten, Regelträgheit.
- σ < 5 K bei WP-HK-Betrieb → ṁ explodiert, Pumpe überdimensioniert.
- σ > 15 K bei FBH → Komfort, Oberflächen-Temperaturabfall Raumende.
- Ungünstigster Strang > 80 % des Gesamt-Δp → Rohrnetz unsymmetrisch, Abgleich schwierig.
- Σζ > 50 pro Strang → viele Umlenkungen, evtl. Leitungsführung optimieren.
- Ventilautorität a < 0,3 → Regelung taumelt.
- Δp_ungünstiger_Heizkörper < 100 mbar → Abgleich-Reserve zu klein, WP-Pumpe kommt nicht hoch.
- Δpges > 500 mbar im EFH → DN prüfen, Rohrnetz-Engstellen.
- Anlagenvolumen > 15 L/kW bei WP-Luft → Puffer zu groß oder Heizflächen dominant HK.
- Heizwasser-Qualität (VDI 2035): pH 8,2 – 10,0, Leitfähigkeit < 100 µS/cm → sonst Stillstandskorrosion.

---

## 7. Normenverweise

- **DIN EN 12828** (Heizungsanlagen – Planung)
- **DIN 1988-200 / -300** (TW-Installation, hier analog Rohrdimensionierung)
- **DIN 4751** (historisch, Anlagensicherheit, ersetzt durch DIN EN 12828/12831)
- **VDI 2035-1/-2** (Wasserqualität, Steinbildung, Korrosion)
- **VDI 3805** (Rohrhersteller-Datenblätter)
- **DIN EN 14336** (Installation und Inbetriebnahme Warmwasserheizung)
- **VOB/C DIN 18380** (Heizungs- und zentrale Wassererwärmungsanlagen)
- **GEG § 60c / § 64** (hydraulischer Abgleich Pflicht ab 2022/23)
- **BDH-Merkblatt 6 / ZVSHK-Leitfaden "Hydraulischer Abgleich"**

---

## 8. Quellenregister

| Inhalt | Quelle |
|--------|--------|
| Massenstrom-Formel, R-Richtwerte Wohnbereich 0,4–1,0 mbar/m, Σ(R·l+Z) | B1 LF07 S.437 |
| Präzisionsstahlrohr-Diagramm, ΔpR = R·l, v-Grenzen | B1 LF07 S.438 |
| Gewinderohr-Tabelle DN 10–65, Ventil-Voreinstellung, Rohrnetzberechnung | B1 LF07 S.439 |
| Hydraulischer Abgleich, 100 mbar Differenzdruck am ungünstigsten Verbraucher | B1 LF07 S.423 |
| Rohrnetz-Ablaufdiagramm, Werkstoffübersicht Stahl/Cu/Edelstahl/PE-X/Verbund | B4 S.379 |
| Druckverluste Stahlrohr DN 10–200, v 0,1–1,8 m/s, Betriebspunkte | B4 S.389 |
| Druckverluste PE-X, Verbundrohr, Mehrwege-Mischer, Armaturen | B4 S.390 |
| Anlagenvolumen-Richtwerte (Konvektor 7, Platte 9, Radiator 15, FBH 20 L/kW) | B4 S.400 |
| Thermostatventile Voreinstellung, Kv-Werte, Ventilautorität | B1 LF07 S.409–415 |
| Rohrleitungs-Druckverluste λ, ζ, Reynolds-Zahl | B2 Kap.3 S.68 |
| Rohrdimensionierung, Vor-/Rücklauf, Teilstrecken-Tabelle | B2 Kap.3 S.79–92 |
| Rohrnetz Heizung – Druckverluste, Hauptstrang, Σ(R·l+Z) | B2 Kap.8 S.248–259 |
| Einrohrheizung – Massenstrom, Auskühlung, Ventil-Sektorierung | B2 Kap.8 S.260 |
| Rohrnetz/Pumpen-Formeln Quick-Ref | B3 Kap.5 S.56 |
| ⭐ Formblatt R Zirkulations-/Heizungs-Rohrnetz, durchgerechnetes Beispiel | **B5 Kap.8 S.140** |
| Rohrnetz-Beispielrechnungen (Stahl/Kupfer, ungünstigster Strang, Voreinstellung) | B5 Kap.8 S.147–155 |
| Zirkulations-Rohrnetz Lösung (Vergleichsbeispiel TWE-Verteilung) | B5 Kap.8 S.75 |

---

## 9. Formelsammlung-Referenz (B3 Quick-Ref, Kap.5 S.56)

| Formel | Anwendung | Einheit |
|--------|-----------|---------|
| **ṁ = Q̇ / (c · Δϑ)** | Heizmittel-Massenstrom | kg/h |
| V̇ = ṁ / ρ = Q̇ / (c · Δϑ · ρ) | Volumenstrom | m³/h |
| v = V̇ / A = 4·V̇ / (π·di²) | Strömungsgeschwindigkeit | m/s |
| **ΔpR = R · l** | Reibungsdruckverlust gerader Rohrabschnitt | Pa |
| **R = λ · (ρ/2) · v² / di** | spezifischer Reibungsdruckverlust | Pa/m |
| **Z = Σζ · (ρ/2) · v²** | Druckverlust Einzelwiderstände | Pa |
| **Δpges = Σ(R·l + Z)** | Gesamtdruckverlust ungünstigster Strang | Pa |
| Re = v · di / ν | Reynolds-Zahl (laminar < 2.300) | – |
| Δp_HK = R_HK · ṁ_HK² | Heizkörper-/Strangcharakteristik (quadratisch) | Pa |

*B3 Kap.5 deckt das gesamte Rohrnetz-Berechnungsverfahren in kompakter Form ab. Identische Formeln zu B1 LF07 S.437 und B4 S.389. Tool kann B3 als Plausibilitätsquelle für ṁ/V̇/Δp nutzen.*

---

## 10. B2 Detailergänzungen – Kap.3 (S.61–89) & Kap.8 Rohrnetz (S.248–260)

### 10.1 Druckverlust-Theorie nach B2 Kap.3 S.68

**Vollständige Druckverlustformel (Darcy-Weisbach):**

ΔpR = λ · (l / di) · (ρ/2) · v²

| Parameter | Bedeutung | Hinweis |
|-----------|-----------|---------|
| λ | Rohrreibungszahl | f(Re, di, k/di); Diagramm B2 S.68 |
| k | absolute Rauigkeit | Stahl 0,045 mm; Cu 0,0015 mm; PE-X 0,007 mm |
| Re | Reynolds-Zahl = v·di/ν | turbulent ab Re > 2.300 |
| ν (Wasser 70 °C) | kinematische Viskosität ≈ 0,415·10⁻⁶ m²/s | – |

**Praxis-Vereinfachung (B2 Kap.8 S.248):** R-Diagramme tabellieren ΔpR/l direkt, daher werden λ und Re im Tool **nicht explizit benötigt**. R-Wert-Ablesung aus B4 S.389 (Stahl) bzw. S.390 (PE-X) genügt.

### 10.2 Rohrdimensionierung nach B2 Kap.3 S.79–92 / Kap.8 S.248–259

**Regel der Teilstrecken (B2 S.249):**
1. Schema zeichnen, Knoten + Teilstrecken nummerieren.
2. Massenstrom je Teilstrecke aus Σ aller versorgten Heizkörper.
3. R-Wert aus Diagramm bei gewähltem DN ablesen.
4. v ≤ v_max prüfen (Tab. 3.2).
5. ΔpTS = R·l + Z je Teilstrecke; Hauptstrang summieren.

**Wirtschaftliches R-Optimum (B2 S.250):**
- Investkosten Rohr ↑ bei kleinem R (große DN).
- Pumpen-Energiekosten ↑ bei großem R.
- **Optimum ca. R = 100…150 Pa/m = 1,0…1,5 mbar/m** für Verteilung; bei WP-Sanierung tendenziell niedriger (0,5…1,0 mbar/m), um Δp und Pumpenleistung zu minimieren.

### 10.3 Pumpen-/Druckverlust-Detail (B2 Kap.8 S.251–252)

**Anlagenkennlinie (B2 S.251):** Δp(V̇) = Δp_Ausl · (V̇/V̇_Ausl)² → Parabel durch den Ursprung. Schnittpunkt mit Pumpenkennlinie = Betriebspunkt.

**Affinitätsgesetze (B2 S.252):**
| Gesetz | Formel |
|--------|--------|
| Volumenstrom | V̇₂/V̇₁ = n₂/n₁ |
| Druck | Δp₂/Δp₁ = (n₂/n₁)² |
| Leistung | P₂/P₁ = (n₂/n₁)³ |

→ **Halbierung der Drehzahl ergibt achtel der elektrischen Leistung** – Begründung des Δp-v-Modus elektronischer Pumpen (Bereich H Tab. 3.3).

### 10.4 Einrohrheizung (B2 Kap.8 S.260)

Im Einrohrsystem strömt das gesamte Heizmittel **durch jeden Heizkörper**, das Wasser kühlt entlang des Strangs ab. Pro Heizkörper steht nur ein Bruchteil von ṁ_Strang als Beimischung zur Verfügung (Sektorventile, typ. Beimischverhältnis 30 – 50 %).

**Konsequenz für WP-Sanierung (Tool-Hinweis):**
- Letzter HK im Strang sieht VL ≈ Strang-RL → bei WP-VL 50 °C oft nur 38–42 °C → Heizfläche ggf. zu klein.
- Empfehlung: **Einrohr → Zweirohr-Umbau** oder Sektorventile gegen E-Ventile (Vollstrom, Δp-c-Pumpe), σ klein halten (5 K).
- Tool-Logik: bei vorhandenem Einrohr-Bestand automatisch Warnhinweis + Maßnahmenvorschlag.

---

## 11. Validierungs-Beispiele (B5 Kap.8 S.140 Formblatt R, S.75 Zirkulation)

### 11.1 ⭐ Formblatt R – Heizungs-Rohrnetz (B5 S.140)

**Beispielprojekt (Auszug, ungünstigster Strang 5 Teilstrecken Stahl):**

| TS | Q̇ [W] | ṁ [kg/h] | l [m] | DN | di [mm] | v [m/s] | R [mbar/m] | R·l [mbar] | Σζ | Z [mbar] | ΔpTS [mbar] |
|----|--------|----------|-------|-----|---------|---------|------------|-------------|-----|----------|--------------|
| 1 | 11.000 | 945 | 6,0 | 32 | 35,9 | 0,29 | 0,40 | 2,40 | 4,0 | 1,68 | 4,08 |
| 2 | 6.500 | 559 | 4,5 | 25 | 27,2 | 0,30 | 0,55 | 2,48 | 3,0 | 1,35 | 3,83 |
| 3 | 3.200 | 275 | 8,0 | 20 | 21,6 | 0,23 | 0,45 | 3,60 | 6,5 | 1,72 | 5,32 |
| 4 | 1.600 | 138 | 5,5 | 15 | 16,0 | 0,22 | 0,75 | 4,13 | 5,5 | 1,33 | 5,46 |
| 5 | 800 | 69 | 3,0 | 15 | 16,0 | 0,11 | 0,25 | 0,75 | 8,5 | 0,51 | 1,26 |
| **Σ** | – | – | **27,0** | – | – | – | – | **13,36** | – | **6,59** | **19,95** |

**Ergebnis:** Δp_Strang = 19,95 mbar = ca. **200 mbar**.
Plus WP-intern (~100 mbar) + Schmutzfänger (30) + Abgleich-Reserve (100) → **Δp_Pumpe ≈ 430 mbar** ✓ (Bereich H 25-60 ausreichend).

**Tool-Validierung:**
1. v < v_max (0,5 m/s) in allen TS → ✓ kein Strömungsgeräusch.
2. R im Verteilungsbereich 0,4–0,75 mbar/m → ✓ Wirtschafts-Optimum.
3. Letzter HK Σζ = 8,5 (Bogen + Vorlauf-/Rücklauf-T-Stück + Thermostatventil + Heizkörperverschraubung) → realistisch.

### 11.2 Zirkulations-Rohrnetz (B5 Kap.8 S.75) – Vergleichsfall TWE

In der TWE-Zirkulation gilt das gleiche Σ(R·l+Z)-Verfahren, jedoch mit **Auskühlung Δϑz ≤ 5 K** (DVGW W 553) als Auslegungs-Δϑ statt Heizmittel-σ. Beispielfall: 4-stöckiges MFH, V̇z = 80 L/h, di = 12 mm, l = 60 m, Δp ≈ 80 mbar.

→ Tool: Zirkulations-Pumpe (Bereich H/D-Verweis) auf ca. 100 mbar / 0,1 m³/h auslegen.

### 11.3 Cross-Check B2 / B3 / B4

| Thema | B2 Kap.3+8 | B3 Kap.5 | B4 S.389/390 | Fazit |
|-------|------------|----------|---------------|-------|
| Druckverlust-Formel | Darcy-Weisbach, λ explizit | R·l + Z (gleichw.) | R-Diagramm direkt | **B4 ist Tool-Primärquelle**, B2 als Theorie-Backup |
| Rohrnetz-Workflow Teilstrecken | S.249 ausführlich | nicht enthalten | S.379 Ablaufdiagramm | konsistent |
| Affinitätsgesetze | S.252 | S.56 | S.395 | identisch |
| R-Optimum 100–150 Pa/m | S.250 explizit | implizit | S.389 (Tool-Bereich 0,4–1,0 mbar/m) | konsistent (1 mbar = 100 Pa) |
| Einrohr-Sektorierung | S.260 | nicht enthalten | nicht detailliert | **B2 Primärquelle Einrohr** |

---

## 12. Changelog Wissensbasis G

- **2026-04-23 Phase-8-Extract (vor Phase-8-Start):**
  - **§3.4b Cu-Druckverlust-Tabelle** neu aus **B4 S.388** (Herstellerangaben, ϑm = 60 °C): vollständige Matrix 12×1 / 15×1 / 18×1 / 22×1 / 28×1,5 / 35×1,5 mit ṁ/v für R = 10…700 Pa/m.
  - **§3.4c Präzisionsstahlrohr** aus **B4 S.387** (Diagramm-Ablesung 10×1 bis 28×1,2).
  - **§3.4 PE-X** erweitert um vollständige R-ṁ-v-Matrix aus **B4 S.390**. Verbundrohr **nicht** in B1/B2/B4 als Norm-Tabelle enthalten → Fallback auf PE-X-Tabelle markiert, Hersteller-Nachzug (Uponor/Rehau/Geberit) für Phase 12.
  - **§3.5b Einzelwiderstände ζ DN-differenziert** aus **B4 S.391**.
  - **§3.5c Z₁(v)-Tabelle** aus **B4 S.388** für Schnellrechnung `Z = Σζ · Z₁`.
  - **§3.9 Druckgefälle pro Leitungstyp** neu (fein) aus **B4 S.386 + B1 LF07 S.437 Tab. 1**.
  - **§3.10 Leitungslängen-Richtwerte** neu aus **B4 S.386**: `l_max = 2·(a+b+h)` + Zuschlagfaktoren Z_F (1,3 / 2,2 / 2,6) für Richtwert-Modus. Schliesst die CLAUDE.md-§6-Lücke „Meter-Richtwerte pro Geschoss/Gebäudetyp".
  - **§3.11 Ventil-Voreinstellwerte** neu aus **B4 S.393** (für Phase 9/13 Hydraulischen Abgleich).
  - Nummerierung 3.8 Rohrwerkstoffe verschoben auf §3.12.
- **2026-04-22 Phase-0:** Ersterstellung, heizlast-fokussiert extrahiert (Formeln, Grundtabellen, Richtwert-Workflow Sanierung).
