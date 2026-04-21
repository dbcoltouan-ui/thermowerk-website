# FWS Rechenwege — Thermowerk Heizlast

> Vollständige Referenz aller Berechnungen, die das Tool durchführt. Quelle pro Formel in eckigen Klammern, dahinter der Code-Pfad im Projekt (`src/lib/heizlast/…`). Reihenfolge in diesem Dokument = Reihenfolge, in der der Rechenkern arbeitet (`compute.ts → runCascade`).
>
> **Normgrundlagen**
> - FWS AWB WP-Kurs Modul 3, Ausgabe 1-2025 (Hauptreferenz, §-Nummern beziehen sich hierauf)
> - SIA 384/1:2022 (Heizlast in Gebäuden)
> - SIA 385/1:2020 und 385/2:2015 (Warmwasser)
> - SWKI BT 102-01 + VDI 4645 + Herstellerhandbücher (Heizpuffer — nicht FWS)

---

## 0. Reihenfolge (Cascade)

Der Rechenkern verarbeitet einen State-Snapshot einmal oben nach unten. Jede Stufe liest nur Stufen darüber, niemals darunter — keine Rückgriffe.

```
0. tvoll ermitteln           (Lage + Profil oder User-Override)
1. Qhl,roh                   (eine von 5 Methoden in fester Priorität)
2. Qhl,korr                  (geplante Sanierungen ×Π(1−Einsparung))
3. Plausi (W/m²)             (Ampel grün/gelb/rot gegen Bauperiode)
4. Warmwasser                (VW,u → Qwu → QWW → Qw)
5. Qoff                      (Sperrzeit-Zuschlag, falls aktiv)
6. Qh                        (Qhl + Qw + Qoff + Qas)
7. WW-Speichervolumen        (FWS §10)
8. Heizpuffervolumen         (SWKI/VDI — nicht FWS)
```

Methoden-Priorität in Schritt 1 (wer zuerst liefert, gewinnt):
**override → Betriebsstunden → Messung → Verbrauch → Bauperiode**

---

## 1. Eingabe: Flächen & Zimmer

Datenquelle für die EBF ist entweder ein direkter Wert im Gebäude-Stammdatenblock (`gebaeude.ebf`) oder eine Zimmerliste, die in diese EBF übernommen werden kann.

### 1.1 Flächenberechnung je Zimmer

Priorität (fällt auf die nächste Stufe, wenn die vorherige leer oder ≤ 0 ist):

```
A_raum = flaecheDirekt
       → flaecheOverride  (legacy)
       → länge × breite
       → 0
```

Code: `raumFlaeche()` in `state.ts`.

### 1.2 Summierung & Netto

Jedes Zimmer trägt einen Flag `beheizt: boolean`.

```
A_beheizt   = Σ A_raum   über alle r mit beheizt=true
A_unbeheizt = Σ A_raum   über alle r mit beheizt=false   (informativ)
A_netto     = round(A_beheizt · 10) / 10                 [m², 1 Nachkomma]
```

Nur `A_netto` fliesst auf Wunsch des Users in `gebaeude.ebf`. `A_unbeheizt` wird nur angezeigt. Code: `sumRaumFlaechenNetto()` in `state.ts`.

---

## 2. tvoll — Vollbetriebsstunden

```
tvoll = Lookup(gebaeudetyp, lage)           [h/a, FWS §3]
```

| Profil | Mittelland | ab 800 m ü. M. |
|---|---:|---:|
| Wohngebäude, ohne WW | **2'000** | 2'300 |
| Wohngebäude, mit WW | 2'300 | 2'500 |
| Schulhaus/Industrie/Büro (Wochenendabsenkung) | 1'900 | 2'100 |

**Wichtig:** Die Zeile "Wohnen, OHNE WW" wird immer dann genutzt, wenn WW im Tool separat als Zuschlag `Qw` gerechnet wird (M5). Wählt der User "mit WW" UND nutzt gleichzeitig M5, entsteht eine Doppelzählung. Default-Konfiguration: immer **ohne WW** + Qw in M5.

**User-Override** wird nur akzeptiert, wenn `overrides['gebaeude.tvoll'] === true` UND der Wert im Band 500–3'500 h/a liegt. Sonst fällt der Rechenkern auf die Tabelle zurück (schützt vor alten Bug-Werten). Code: `resolveTvoll()` in `compute.ts`.

---

## 3. Qhl — Rohwert der Heizlast (5 Methoden)

Der Rechenkern probiert die aktivierten Methoden in dieser Reihenfolge durch und nimmt die erste, die ein sinnvolles Ergebnis liefert:

### 3.1 Override (User-Direkteingabe)

```
Qhl = Qhl_manuell                           [kW]
```

Kein Rechenweg. Code: `qhlOverride()`.

### 3.2 Betriebsstundenzähler (FWS Aufgabe 4)

```
h/a = Stunden_gesamt / Jahre                               [h/a]
Qn  = (h/a) · Qh,WP                                        [kWh/a]
Qhl = Qn / tvoll                                           [kW]
```

Code: `qhlBstd()` → `qnAusBetriebsstunden()` → `qhlAusQn()`.

### 3.3 Messung (direkter Nutzenergiewert)

```
Qhl = Qn,Messung / tvoll                                   [kW]
```

Code: `qhlMessung()` → `qhlAusQn()`.

### 3.4 Verbrauch (FWS §2 + §3 + §8, Aufgaben 1–2)

```
Qn,brutto = Ba · Ho · η                                    [kWh/a]   (§2)
```

Bei bivalenter Anlage (mehrere Träger):

```
Qn,total = Σ Qn,i
```

Wenn der Verbrauch WW enthält (inklusiv-Schalter + Feld VW,u,Abzug):

```
Qn,WW    = VW,u · cp · ΔT / 3600 · Π(1+f_speicher)(1+f_zirk)(1+f_ausstoss) · 365
Qn,Heiz  = Qn,brutto − Qn,WW
Qhl      = Qn,Heiz / tvoll
```

Code: `qhlVerbrauch()` → `qnAusVerbrauch()` / `qnSumme()` ± `qnwwJahr()` → `qhlAusQn()`.

### 3.5 Bauperiode (Fallback, FWS §6)

```
spezKwhM2 = [min, max] aus Tabelle (Bauperiode × EFH/MFH)
Qn        = spezKwhM2 · EBF                                [kWh/a]
Qhl       = Qn / tvoll                                     [kW]
```

Tool rechnet mit dem Mittelwert (min+max)/2 und zeigt die Bandbreite als Hinweis. Code: `qhlBauperiode()` → `qhlAusBauperiode()`.

---

## 3a. Perioden-Modell (§3.1 / §3.2 intern — Kalender-Logik)

Statt eines einzelnen Jahreswerts kann der User pro Methode **mehrere Datumsbereiche** eingeben (z. B. Heizöllieferungen über 3 Jahre, Zählerablesungen, Betriebsstundenzähler-Intervalle). Das Tool normiert jeden Bereich auf ein Jahresäquivalent und berücksichtigt bereits vergangene Sanierungen innerhalb dieser Bereiche.

### Tage zwischen zwei Daten (bisDatum exklusiv)

```
T_i = (bisDatum_i − vonDatum_i) in Tagen
```

### Aggregation zum Jahreswert

```
Jahreswert = (Σ wert_i) · 365 / (Σ T_i)
```

Überlappungen von Bereichen liefern `null` (User muss korrigieren). Code: `aggregierePerioden()` in `compute.ts`.

### Korrektur auf Ist-Zustand wenn Sanierungen IN der Periode liegen

Sei `F_kum(t)` der kumulative Einsparfaktor aller bereits durchgeführten Sanierungen bis Datum `t`:

```
F_kum(t) = Π (1 − Einsparung_k/100)   über alle k mit datum_k ≤ t
```

Die Periode wird in Sub-Perioden zwischen den Sanierungsdaten gesplittet. Der gemessene Wert `W` ist dann

```
W = W_pre · Σ (L_j · F_j) / L_gesamt
```

wobei `W_pre` der (unbekannte) Vor-Sanierungs-Wert ist. Umgestellt:

```
W_pre = W · L_gesamt / Σ (L_j · F_j)
```

Der korrigierte Ist-Wert der Periode ist dann

```
W_ist = W_pre · F_ende-der-Periode · F_nach-der-Periode
```

Sanierungen **nach** dem Periodenende werden einfach multipliziert (keine Sub-Periode nötig). Code: `periodeAufIstZustand()` in `compute.ts`.

**Merksatz:** Vergangene Sanierungen werden in diesem Schritt eingearbeitet, **nicht** noch einmal in Schritt 4.

---

## 4. Qhl,korr — Korrektur für geplante Sanierungen

Nur Massnahmen mit `zeitpunkt: 'geplant'` (oder ohne Datum) wirken hier. Multiplikativ:

```
Qhl,korr = Qhl,roh · Π (1 − Einsparung_i/100)              [kW]   (§6)
```

Beispiel (Aufgabe 2, Dämmmassnahmen Fensterersatz 15 %, Kellerdecke 8 %, Estrich 10 %):

```
Qhl,korr = 12.55 · 0.85 · 0.92 · 0.90 = 8.83 kW
```

**Default-Presets** (einsparung in %, Bandbreite Minimum–Maximum, Standardwert):

| ID | Massnahme | Band | Default |
|---|---|---:|---:|
| `fenster` | Fenstersanierung | 10–20 | 15 |
| `fassade` | Fassadendämmung | 25–40 | 32 |
| `estrich` | Estrichboden-/-decke-Dämmung | 10–15 | 12 |
| `kellerdecke` | Kellerdecke-Dämmung | 8–12 | 10 |
| `kwl` | KWL (Komfortlüftung) | 5–10 | 7 |

Code: `computeQhlKorr()` → `qhlNachSanierung()`.

---

## 5. Plausibilität — spezifische Heizleistung (§7)

```
W/m² = Qhl,korr · 1000 / EBF
```

Ampel gegen Referenzband aus `SPEZ_HEIZLEISTUNG[bauperiode][typ]`:

- **grün**: im Band
- **gelb**: max. 15 % knapp drüber oder unter Minimum
- **rot (oben)**: > Max · 1.15 — Eingaben prüfen (η, Ho, Verbrauch)
- **rot (unten)**: < Min · 0.85 — Vollaststunden-Methode vermutlich ungenau (Minergie-P, Leichtbau, hoher Glasanteil)

Code: `computePlausi()` → `spezHeizleistung()`.

---

## 6. Warmwasser — Qw-Zuschlag (§8, §9)

Nur aktiv wenn `warmwasser.active === true`. Drei Methoden für den Tagesbedarf.

### 6.1 VW,u — Tagesbedarf Nutzwarmwasser

**Methode A: Personen (SIA 385/2)**

```
np       = 3.3 − 2 / (1 + (ANF/100)³)                      [P/Einheit]
VW,u     = Σ (np_i · VW,u,i)                               [l/d]
```

`ANF` = Aufenthalts-Nutzfläche pro Wohneinheit, `VW,u,i` = Personenbedarf je Einheit in l/P·d (Presets: EFH einfach 40 / mittel 45 / gehoben 55; MFH allgemein 35 / gehoben 45; Büro ohne Restaurant 3).

**Methode B: direkt**

```
VW,u = Zahl direkt eingegeben                              [l/d]
```

**Methode C: Messung**

```
QW,u = Zahl direkt eingegeben                              [kWh/d]
(VW,u wird übersprungen, Qwu ist direkt die Messung)
```

### 6.2 QW,u — Tages-Nutzwärmebedarf (Energie)

```
QW,u = VW,u · ρ · cp · ΔT / 3600                           [kWh/d]

     mit ρ  = 1 kg/l
         cp = 4.2 kJ/(kg·K)
         ΔT = 50 K (10 → 60 °C, Override möglich)
```

### 6.3 QWW — inkl. Verluste

```
QWW = QW,u + QW,sto,ls + QW,hl,ls + QW,em,ls               [kWh/d]
```

Verlustkomponenten entweder als absolute `kWh/d` (wenn bekannt) oder als Prozent von `QW,u`:

- `QW,sto,ls`  — Speicherverluste (Default 10 %)
- `QW,hl,ls`   — Zirkulationsverluste (Default 0 % — nur wenn Zirkulation vorhanden)
- `QW,em,ls`   — Ausstoss-/Leitungsverluste (Default 15 %)

### 6.4 Qnww — Jahres-Kompaktformel (wie im FWS-Aufgabenblatt)

Wird nur für den WW-Abzug aus dem Heizenergieverbrauch verwendet (§3.4):

```
Qn,WW = V[l/d] · cp · ΔT / 3600 · Π(1+f_i) · 365           [kWh/a]
```

### 6.5 Qw — Leistungszuschlag

```
td  = QWW / Qhl                                            [h/d]
Qw  = Qhl · (24 / (24 − td) − 1)                           [kW]   (§9)
```

Code: `computeWarmwasser()` → `vwuTotal()` / `qwuTag()` / `qwwTag()` / `qw()`.

---

## 7. Qoff — Sperrzeit-Zuschlag (§4)

Nur aktiv wenn `zuschlaege.sperrzeitActive === true`. Sonst Qoff ≡ 0.

```
Qoff = Qhl · (24 / (24 − toff) − 1)                        [kW]
```

Kontrolle über Tabelle:

| toff [h/d] | Faktor |
|---:|---:|
| 0 | 1.00 |
| 1 | 1.04 |
| 2 | 1.09 |
| 3 | 1.14 |
| 4 | 1.20 |
| 5 | 1.26 |
| 6 | 1.33 |
| 7 | 1.41 |
| 8 | 1.50 |

Code: `computeQoff()` → `qoff()`.

---

## 8. Qh — Wärmepumpen-Auslegleistung (§1)

```
Qh = Qhl + Qw + Qoff + Qas                                 [kW]
```

- `Qas` = beliebiger Zusatzbedarf (Poolheizung, Lüftungsheizregister, …), wird automatisch addiert sobald > 0. Im Tool setzt sich `Qas` aus `qasPool + qasLueftung` zusammen.

**Inverter-Faustregel (§16.2)**

```
Qh,Gebäude ≥ 0.75 · Qh,WP
```

Grüne Ampel bei ≥ 0.75, sonst WP > 25 % überdimensioniert. Code: `qhGesamt()` / `inverterCheck()`.

---

## 9. WW-Speichervolumen (§10)

```
VW,Sto = QWW / (cp · ΔT / 3600)                            [l]

        mit ΔT = TSto,aus − TSto,ein (Default 60−10 = 50 K)
```

Anschliessend marktrealistische Staffelung (AUFRUNDEN):

- V ≤ 200 L  → 50er-Schritte
- 200 < V ≤ 500 L → 100er-Schritte
- 500 < V ≤ 1000 L → 250er-Schritte
- V > 1000 L → 500er-Schritte

Quelle: `reference/SPEICHER-MARKT-CH.md`. Code: `computeWwSpeicher()` → `speichervolumen()` → `rundeSpeicherMarkt()`.

---

## 10. Heizpufferspeicher (nicht FWS)

Tool nimmt das **Maximum** der zutreffenden Kriterien und rundet marktrealistisch (Puffer-Staffelung: ≤ 200 L → 50er, ≤ 500 L → 100er, sonst 200er).

### 10.1 Abtauvolumen (L/W-WP mit Prozessumkehr)

```
V = Q_WP · t_Abtau · 3600 / (cp · ΔT)                      [l]

    Defaults: t_Abtau = 5 min, ΔT = 5 K, cp = 4.2
```

### 10.2 Taktschutz (alle WP-Typen ohne Abtauung)

```
V = Q_WP · t_min · 3600 / (cp · ΔT)                        [l]

    Defaults: t_min = 6 min, ΔT = 5 K
```

### 10.3 ERR-Entkopplung (Hersteller-Band)

```
V = Q_WP · 15…25 l/kW
```

### 10.4 Sperrzeitüberbrückung (informativ — meist unrealistisch gross)

```
V = Qhl · toff · 3600 / (cp · ΔT)                          [l]
```

Code: `computePuffer()` → `puffer_abtau()` / `puffer_takt()` / `puffer_err()` / `puffer_sperrzeit()`.

---

## 11. Rückrechnungen & Nebenformeln

### 11.1 Betriebsstunden → Nutzenergie (Aufgabe 4)

```
h/a = Stunden_Zähler / Jahre_Betrieb
Qn  = h/a · Qh,WP                                          [kWh/a]
```

### 11.2 Kälteleistung aus WP-Leistung + COP (Aufgabe 4)

```
Qk = Qh · (COP − 1) / COP                                  [kW]
```

### 11.3 Spezifische Entzugsleistung Erdsonde

```
spez = Qk · 1000 / L_Sonde                                 [W/m]
```

Ampel: < 50 grün, 50–60 gelb, > 60 rot (SIA 384/6).

### 11.4 Speicherverluste aus Volumen (FWS §8.2, Diagramm-Näherung)

Lineare Interpolation zwischen:

| V [l] | Verlust [kWh/d] |
|---:|---:|
| 200 | 1.5 |
| 500 | 2.8 |
| 800 | 3.3 |
| 1000 | 3.8 |
| 1500 | 4.3 |
| 2000 | 4.8 |

### 11.5 fsto — Speicher-Faktor für Auslege-Leistung (§10.2)

| Zone | Faktor |
|---|---:|
| Mischzone + Kaltzone (innenliegender WT) | 1.25 |
| Nur Mischzone (aussenliegender WT) | 1.10 |
| Weder Misch- noch Kaltzone | 1.00 |

### 11.6 WT-Flächen-Faustformeln (§11.2)

| Anordnung | m²/kW |
|---|---:|
| Innen, mit Warmhaltung (65 °C / 60 °C) | 0.65 |
| Innen, ohne Warmhaltung (65 °C / 55 °C) | 0.40 |
| Innen, ohne Warmhaltung (60 °C / 55 °C) | 0.65 |
| Aussen (FRIWA/Magroladung) | 0.05 |

### 11.7 Bivalenz-Deckungsgrad (§18)

| Anteil Qh,WP | Energieanteil |
|---:|---:|
| 0.50 | 80–85 % |
| 0.33 | 50–60 % |
| 0.25 | 30–40 % |

---

## 12. Konstanten-Tabellen

### 12.1 Brennwerte Ho (§2)

| Träger | Ho | Einheit | Verbrauchseinheit |
|---|---:|---|---|
| Heizöl EL | 10.5 | kWh/l | l/a |
| Erdgas | 10.4 | kWh/m³ | m³/a |
| Hartholz (500–530 kg/Ster) | 2'500 | kWh/rm | rm/a |
| Nadelholz (340–380 kg/Ster) | 1'800 | kWh/rm | rm/a |
| Pellets | 5.3 | kWh/kg | kg/a |
| Elektrospeicher | 1.0 | kWh/kWh | kWh/a |

### 12.2 Jahresnutzungsgrad η (§2)

| Situation | Band | Default |
|---|---:|---:|
| Öl/Gas älter, MIT WW-Bereitung | 0.70–0.75 | 0.73 |
| Öl/Gas älter, OHNE WW-Bereitung | 0.80–0.85 | 0.82 |
| Öl/Gas kondensierend (neu) | 0.85–0.95 | 0.90 |
| Stückholz (neu) | 0.65–0.75 | 0.70 |
| Stückholz (alt) | 0.45–0.65 | 0.55 |
| Pellets | 0.65–0.75 | 0.70 |
| Elektrospeicher | 0.95 | 0.95 |

### 12.3 Spez. Heizwärmebedarf kWh/m²·a (§6, unsaniert, ohne WW)

| Bauperiode | EFH | MFH |
|---|---|---|
| vor 1919 | 55–125 | 65–115 |
| 1919–1945 | 80–135 | 80–120 |
| 1946–1960 | 80–140 | 70–115 |
| 1961–1970 | 80–145 | 75–120 |
| 1971–1980 | 70–125 | 75–115 |
| 1981–1985 | 55–105 | 70–105 |
| 1986–1990 | 60–95 | 65–95 |
| 1991–1995 | 50–90 | 60–85 |
| 1996–2000 | 45–85 | 55–75 |
| 2001–2005 | 35–80 | 55–75 |
| 2006–2010 | 35–75 | 45–65 |
| 2011–heute | 30–45 | 30–40 |

### 12.4 Spez. Heizleistung W/m² (§7, Kontrollband)

| Bauperiode | EFH | MFH |
|---|---|---|
| vor 1919 | 28–63 | 33–58 |
| 1919–1945 | 40–68 | 40–60 |
| 1946–1960 | 40–70 | 35–58 |
| 1961–1970 | 40–73 | 38–60 |
| 1971–1980 | 35–63 | 38–58 |
| 1981–1985 | 28–53 | 35–53 |
| 1986–1990 | 30–48 | 33–48 |
| 1991–1995 | 25–45 | 30–43 |
| 1996–2000 | 23–43 | 28–38 |
| 2001–2005 | 18–40 | 28–38 |
| 2006–2010 | 18–38 | 23–33 |
| 2011–heute | 15–23 | 15–20 |

### 12.5 WW-Nutzbedarf pro Person (§8.1, SIA 385/2)

| Gebäudetyp | Bedarf [l/P·d] |
|---|---:|
| EFH / ETW einfach | 40 |
| EFH / ETW mittel | 45 |
| EFH / ETW gehoben | 55 |
| MFH allgemein | 35 |
| MFH gehoben | 45 |
| Bürogebäude (ohne Restaurant) | 3 |

---

## 13. Vollständige Referenz-Beispiele (FWS-Aufgabenblatt)

### 13.1 Aufgabe 1 — Objekt A (Öl, Heizkörper 60/50, toff = 2 h)

Gegeben: 2'800 l/a Heizöl, η = 0.85, Mittelland, WW separat.

```
Qn   = 2'800 · 10.5 · 0.85                      = 24'990 kWh/a
Qh   = 24'990 / 2'000 (tvoll Wohnen ohne WW)    = 12.5  kW
Qoff = 12.5 · (24/(24−2) − 1)                   = 1.14  kW
Qh,WP= 12.5 + 1.14                              = 13.64 kW
```

### 13.2 Aufgabe 1 — Objekt B (bivalent Gas + Hartholz)

```
Qn,Gas = 2'500 · 10.4 · 0.92                    = 23'920 kWh/a
Qn,Hz  = 5     · 2'500 · 0.75                   =  9'375 kWh/a
Qn     = 23'920 + 9'375                         = 33'295 kWh/a
Qh     = 33'295 / 2'000                         = 16.65 kW
Qoff   = 16.65 · (24/(24−4) − 1)                = 3.33  kW
Qh,WP  = 16.65 + 3.33                           = 19.98 kW
```

### 13.3 Aufgabe 2 — EFH 1975 Bern (Verbrauch inkl. WW, WW-Abzug)

Gegeben: 3'500 l Öl/a, η = 0.8, VW,u = 160 l/d, Speicher 10 %, Ausstoss 15 %, Zirk 0 %, toff = 3 h, EBF = 270 m².

```
Qn,HW  = 3'500 · 10.5 · 0.8                     = 29'400 kWh/a
Qn,WW  = 160 · 4.2/3600 · 50 · 1.10 · 1.15 · 365 =  4'309 kWh/a
Qn,H   = 29'400 − 4'309                         = 25'091 kWh/a
Qhl    = 25'091 / 2'000                         = 12.55 kW
Plausi = 12'550 / 270                           = 46.5  W/m²  (grün, 1971–80 EFH 35–63)
Qoff   = 12.55 · (24/(24−3) − 1)                = 1.79  kW
QW,u   = Qn,WW / 365                            = 11.8  kWh/d
td     = 11.8 / 12.55                           = 0.94  h/d
Qw     = 12.55 · (24/(24−0.94) − 1)             = 0.51  kW
Qh,WP  = 12.55 + 0.51 + 1.79                    = 14.85 kW
```

Mit Sanierung (Fenster 15 %, Kellerdecke 8 %, Estrich 10 %):

```
Qhl,n  = 12.55 · 0.85 · 0.92 · 0.90             = 8.83  kW
Qoff   = 8.83  · (24/(24−3) − 1)                = 1.26  kW
td     = 11.8 / 8.83                            = 1.34  h/d
Qw     = 8.83  · (24/(24−1.34) − 1)             = 0.52  kW
Qh,WP  = 8.83 + 0.52 + 1.26                     = 10.61 kW
```

### 13.4 Aufgabe 3 — MFH Minergie-P (Messung H + WW getrennt)

Gegeben: Qn,H = 23'000 kWh/a Messung, Qn,WW,Messung = 20'000 kWh/a (zur Plausibilitätskontrolle), 27.4 P theoretisch, EBF = 1832 m², keine Sperrzeit.

```
Qhl    = 23'000 / 2'000                         = 11.5  kW
Plausi = 11'500 / 1832                          = 6.3   W/m²  (rot — Minergie-P → Methode ungenau)

Schätzung WW theoretisch (Personen):
Tages  = 27.4 · 45                              = 1'233 l/d
Qn,WW  = 1'233 · 4.2/3600 · 50 · 1.1 · 1.15 · 365 = 33'210 kWh/a
QW,u/d = 33'210 / 365                           = 91    kWh/d
td     = 91 / 11.5                              = 7.9   h/d
Qw     = 11.5 · (24/(24−7.9) − 1)               = 5.64  kW
Qh,WP  = 11.5 + 5.64                            = 17.14 kW
```

Interpretation (vom FWS-Autor): bei Minergie-P ist Vollaststunden-Methode zu grob. Zum Vergleich SIA 384/2-Rechnung (inkl. üblicher 10–20 % Reserve).

### 13.5 Aufgabe 4 — Rückrechnung aus Betriebsstundenzähler

Gegeben: WP 12 kW, 14'000 h über 10 Jahre, 4 Personen, Zirk-Länge unbekannt, keine Sperrzeit, COP 4.2 bei B0/W35.

```
h/a    = 14'000 / 10                            = 1'400 h/a
Qn,H   = 1'400 · 12                             = 16'800 kWh/a
Qhl    = 16'800 / 2'000                         = 8.4   kW   (WP mit 12 kW überdim.)

Qn,WW  = 160 · 4.2/3600 · 50 · 1.1 · 1.15 · 1.15 · 365 = 4'956 kWh/a
QW,u/d = 4'956 / 365                            = 13.6  kWh/d
td     = 13.6 / 8.4                             = 1.62  h/d
Qw     = 8.4 · (24/(24−1.62) − 1)               = 0.6   kW
Qh,WP  = 8.4 + 0.6                              = 9.0   kW

Neue Betriebsstunden mit WW:
Qn,neu = 16'800 + 4'956                         = 21'756 kWh/a
h/a    = 21'756 / 12                            = 1'813 h/a

Kälteleistung Erdsonde:
Qk     = 12 · (4.2−1) / 4.2                     = 9.14  kW
spez.L = 9'140 / 160                            = 57    W/m   (rot — SIA 384/6 ≥ 200 m)
```

---

## 14. Ein- und Ausgabeformat der Cascade

**Rückgabe** von `runCascade(state)` — das ist der Datensatz, aus dem die UI-Kacheln (`heizlastCompute`-Subscriber) ihre Werte ziehen:

```ts
{
  tvoll:              h/a,
  qhlRaw:             { value: kW, steps: [...] },   // vor Sanierung
  qhlKorr:            { value: kW, steps: [...] },   // nach geplanten Sanierungen
  plausi:             { value: W/m², ampel, refBand },
  vwu:                { value: l/d, steps },
  qwu:                { value: kWh/d, steps },
  qwwTagVal:          { value: kWh/d, anteile: {qwu, sto, hl, em} },
  qw:                 { value: kW, td },
  qoff:               { value: kW },
  qh:                 { value: kW },
  wwSpeicherRoh:      { value: l },
  wwSpeicherGerundet: l (Markt-Staffel),
  pufferRoh:          { value: l },
  pufferGerundet:     l (Markt-Staffel),
  summary:            { qhlKw, qhKw, wm2, wwSpeicherL, pufferL },
}
```

Jede Kachel bekommt zusätzlich die `steps`-Liste geliefert — die werden in der UI beim Auf-/Zuklappen des Gates "Formeln einbeziehen" gerendert.

---

## 15. Verifikations-Tests

Das Projekt enthält automatisierte Tests, die die wichtigsten FWS-Aufgaben nachrechnen und bei Abweichung > 0.05 kW fehlschlagen:

- `scripts/test-heizlast.ts` — rechnet Aufgaben 1–4 direkt mit den Formeln (Isoliert-Test der `formulas`-API in `calculations.ts`).
- `scripts/test-heizlast-state.ts` — baut den kompletten State auf, lässt `runCascade` laufen und vergleicht Aufgabe 2 (Qhl = 12.55 kW bei tvoll-Override + sperrzeitActive).

**Soll-Werte Aufgabe 2 (Referenz):** Qhl = 12.55 kW, Qw = 0.51 kW, Qoff = 1.79 kW, Qh,WP = 14.85 kW.

---

*Stand: 2026-04-18 — erzeugt als lebendes Dokument. Bei Änderungen an `calculations.ts` / `constants.ts` / `compute.ts` hier nachziehen.*
