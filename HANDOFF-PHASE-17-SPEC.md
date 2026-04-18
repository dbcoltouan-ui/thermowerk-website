# HANDOFF-PHASE-17 — Architektur-Spec: Perioden-Modell + Sanierungs-Timeline

> **Status:** Reine Spezifikation. Kein Code, kein State-Migrations-Commit. Das Dokument beschreibt die Ziel-Architektur für die Pakete B + C.
> **Stand:** 2026-04-18 · Thermowerk Heizlast · Paket A (Architektur-Spec)
> **Folgt:** `HANDOFF-PHASE-17-PAKET-B.md` (UI-Redesign Section 2) + `HANDOFF-PHASE-17-PAKET-C.md` (Compute-Erweiterung + Migration).

---

## Copy-Paste Prompt für nächsten Chat (Paket B — UI-Implementierung)

```
Neuer Chat für Thermowerk Heizlast. Paket B — Section 2 UI-Redesign für Perioden-Modell und Sanierungs-Timeline.

Zuerst lesen (Reihenfolge einhalten):
1. C:\Users\Daniel\Documents\thermowerk-website\CLAUDE.md
2. C:\Users\Daniel\Documents\thermowerk-website\HANDOFF-PHASE-17-SPEC.md  (diese Spec!)
3. C:\Users\Daniel\Documents\thermowerk-website\src\lib\heizlast\state.ts
4. C:\Users\Daniel\Documents\thermowerk-website\src\components\heizlast\sections\Section2Heizlast.astro
5. C:\Users\Daniel\Documents\thermowerk-website\src\lib\heizlast\bindings.ts

Aufgabe: Setze die State-Type-Diffs und die UX-Skizze aus Abschnitt 2 + 6 der Spec um. KEINE Compute-Änderungen (das ist Paket C) — der neue State muss aber von compute.ts so konsumierbar sein, dass die bisherige Cascade weiter läuft (Fallback auf Single-Value, wenn perioden leer).

Konkret:
- state.ts: VerbrauchPeriode, MessungPeriode, BstdPeriode, SanierungMitDatum (siehe Spec § 2)
- storage.ts: Migration v1 → v2 (siehe Spec § 5)
- Section2Heizlast.astro: Perioden-Editor + Sanierungs-Datumspicker (siehe Spec § 6)
- Regressionstest: FWS-Aufgabe 2 muss weiterhin Qhl = 12.55 kW liefern

Tests laufen lassen: `node --experimental-strip-types scripts/test-heizlast*.ts`.
Ergebnis: Phase-1-Tests (49) + Phase-3-Tests (16) bleiben grün.

Am Ende: Commit-Message „Phase 10 / Paket B: Section 2 UI + State für Perioden & Sanierungs-Timeline".
```

---

## § 1 Überblick & Ziele

Der bestehende Rechner verarbeitet **einen Einzelwert pro Methode** (`ba`, `qnPerJahr`, `stundenGesamt + jahre`). Sanierungen werden als **datumslose Prozent-Liste** multiplikativ auf die berechnete Heizlast angewendet. Beides deckt die FWS-Aufgaben ab, wird aber unrealistisch, sobald:

- mehrere Heizperioden mit unterschiedlichem Verbrauchsverhalten vorliegen (Winter mild / streng, Wohnsituation geändert),
- eine Sanierung mitten in einer Messperiode stattfand (Messwert ist ein Mischwert),
- eine geplante Sanierung erst nach der Inbetriebnahme der neuen WP kommt.

**Ziele dieser Phase:**

1. Perioden-Modell für Verbrauch (Ba), Direktmessung (Qn) und Betriebsstunden.
2. Sanierungen mit Datum + Zeitpunkt (vergangen / geplant) + physikalisch korrekte Behandlung von Sanierungen mitten in einer Messperiode.
3. State-Modell kompatibel zur aktuellen Methoden-UX (ein Tab aktiv, `methodsEnabled` bleibt Quelle der Wahrheit).
4. Bestehende FWS-Regressions-Tests (Aufgabe 1A/1B/2/3/4) bleiben grün, weil der Einzelwert-Fallback unverändert funktioniert.

**Nicht-Ziele:**

- Stundenaufgelöste Lastganglinien (Sanity-Payload würde explodieren).
- Heating-Degree-Day-Normierung (HDD-Korrektur). Offenes Thema, siehe § 9.
- Grafische Timeline-UI (Gantt-Stil). Für Paket B reicht eine Listenansicht.

---

## § 2 State-Diffs (TypeScript-Interfaces)

### 2.1 Neue Typen

```ts
// ============================================================================
// Perioden-Modell (Paket A — neu)
// ============================================================================

/**
 * Datumsbereich einer Messperiode.
 * - `vonDatum` ist inklusiv (00:00 dieses Tages).
 * - `bisDatum` ist exklusiv (00:00 des Folgetages). D. h. Periode
 *   2024-01-01 .. 2025-01-01 umfasst genau 366 Tage.
 * - ISO-Format YYYY-MM-DD (keine Zeitzone — CH lokal).
 */
export interface DatumsRange {
  vonDatum: string; // '2024-01-01'
  bisDatum: string; // '2025-01-01'
}

export interface VerbrauchPeriode extends DatumsRange {
  id: string;
  /** Brennstoff/Energie-Menge in der Einheit des Energieträgers. */
  wert: number;
  /** Für Sanity-Audit: User-Notiz (optional). */
  notiz?: string;
}

export interface MessungPeriode extends DatumsRange {
  id: string;
  /** Gemessene Nutzenergie in kWh (nicht kWh/a — der Wert ist absolut
   *  für die Periode, annualisiert wird im Compute). */
  wertKWh: number;
  notiz?: string;
}

export interface BstdPeriode extends DatumsRange {
  id: string;
  /** Aufgelaufene Betriebsstunden in der Periode. */
  stunden: number;
  notiz?: string;
}

// ============================================================================
// Sanierung mit Datum (Paket A — neu)
// ============================================================================

/**
 * Zeitpunkt einer Sanierung:
 * - 'vergangen'  — Massnahme ist bereits umgesetzt. Falls sie IN einer
 *   Messperiode liegt, wird der Messwert rekonstruiert (Spec § 3.2).
 * - 'geplant'    — Massnahme kommt in der Zukunft. Reduziert die aus dem
 *   Bestand berechnete Qhl klassisch multiplikativ (wie bisher).
 */
export type SanierungsZeitpunkt = 'vergangen' | 'geplant';

export interface SanierungsMassnahme {
  id: string;
  label: string;
  einsparungProzent: number; // 0–100
  /** Paket A neu. YYYY-MM-DD. Fehlend → als 'geplant' behandelt. */
  datum: string | null;
  /** Paket A neu. Default 'geplant'. */
  zeitpunkt: SanierungsZeitpunkt;
}
```

### 2.2 Erweiterung der bestehenden Sektions-States

```ts
export interface VerbrauchState {
  energietraeger: string;
  /** Legacy-Fallback: greift nur wenn `perioden.length === 0`.
   *  Bei leerer Liste verhält sich der Rechner wie bisher. */
  ba: number;
  etaOverride: number | null;
  etaWirkungsgradId: string | null;
  inklWW: boolean;
  vwuAbzug: number;

  /** Paket A neu. Leer = Einzelwert aus `ba` wird verwendet. */
  perioden: VerbrauchPeriode[];
}

export interface MessungState {
  /** Legacy-Fallback. */
  qnPerJahr: number;

  /** Paket A neu. */
  perioden: MessungPeriode[];
}

export interface BstdState {
  /** Legacy-Fallback. */
  stundenGesamt: number;
  jahre: number;
  qhWP: number;

  /** Paket A neu. Perioden-Liste der abgelesenen Stundenzähler-Abschnitte.
   *  Jede Periode trägt eine Stunden-Zuwachs-Summe (keine kumulierten
   *  Zählerwerte — der User gibt die Differenz ein). qhWP bleibt global,
   *  weil Kessel-Nennleistung nicht pro Periode wechselt. */
  perioden: BstdPeriode[];
}

/** Sperrzeit bleibt in diesem Sprint unverändert. Begründung in § 7. */
export interface ZuschlaegeState {
  sperrzeitActive: boolean;
  toff: number;
  qasActive: boolean;
  qas: number;
  qasPool: number;
  qasLueftung: number;
}
```

### 2.3 State-Version und Methoden-Modell

- `STATE_VERSION = 2` (von 1). Migration in `storage.ts` (§ 5).
- `HeizlastMethodsEnabled` **bleibt unverändert** (`{verbrauch, messung, bstd, override: boolean}`). Die Semantik („nur eine Methode aktiv, Direktmessung ist UI-seitig im bstd-Tab integriert") wird in § 8 dokumentiert — ohne Type-Change.

---

## § 3 Compute-Algorithmus (Pseudo-Code)

### 3.1 Aggregation einer Perioden-Liste zum Jahresäquivalent

Die nachgelagerten Formeln (`qnAusVerbrauch`, `qhlAusQn`, `qnAusBetriebsstunden`) erwarten Jahreswerte. Der neue Schritt ist die **gewichtete Hochrechnung** einer Perioden-Liste auf einen äquivalenten 365-Tage-Wert.

```text
FUNKTION aggregiere_perioden(liste, kategorie):
  // kategorie ∈ {verbrauch, messung, bstd}
  WENN liste IST LEER:
    RÜCKGABE null          // Fallback auf Legacy-Einzelwert im Aufrufer

  // Summen über alle Perioden
  tage_total  = SUM(tage_zwischen(p.vonDatum, p.bisDatum))  FÜR p IN liste
  wert_total  = SUM(p.wert)                                  FÜR p IN liste

  WENN tage_total <= 0: FEHLER "Leere Zeitspanne"
  WENN ein_p.tage < 30: WARNUNG "Periode unter 30 Tagen — Ergebnis unsicher"

  // Skalierung auf 365 Tage
  jahresaequivalent = wert_total * 365 / tage_total

  RÜCKGABE jahresaequivalent
```

**Wichtige Eigenschaft:** Unterbrechungen (Lücken zwischen Perioden) sind erlaubt und werden **nicht** hochgerechnet. `tage_total` ist die Summe der tatsächlich gemessenen Tage, nicht die Spanne vom frühesten `vonDatum` zum spätesten `bisDatum`. Das verhindert, dass ein fehlender Winter durch einen gemessenen Sommer überkompensiert wird.

### 3.2 Vergangenheits-Korrektur für Sanierungen innerhalb einer Periode

Jede Messperiode wird einzeln in den **Zustand nach allen vergangenen Sanierungen** überführt, bevor sie aggregiert wird.

```text
FUNKTION periode_auf_ist_zustand(p, sanierungen_vergangen):
  // sanierungen_vergangen: nach Datum aufsteigend sortiert,
  // nur solche mit zeitpunkt = 'vergangen' und datum != null.

  L = tage_zwischen(p.vonDatum, p.bisDatum)

  // 1. Sanierungen relativ zur Periode klassifizieren
  vor_periode   = [s FÜR s IN sanierungen_vergangen WENN s.datum <= p.vonDatum]
  in_periode    = [s FÜR s IN sanierungen_vergangen WENN p.vonDatum < s.datum < p.bisDatum]
  nach_periode  = [s FÜR s IN sanierungen_vergangen WENN s.datum >= p.bisDatum]

  // 2. In-Periode-Sanierungen → Sub-Perioden (durch jedes Datum gespalten)
  grenzen = [p.vonDatum] ++ [s.datum FÜR s IN in_periode] ++ [p.bisDatum]
  sub = zip(grenzen[0..], grenzen[1..])        // Paare (start, ende)

  // 3. Split-Faktoren F_j = Π (1 − f_i) über alle Sanierungen,
  //    deren datum < Start des Sub-Abschnitts j liegt
  F = []
  F_kumuliert = 1.0
  F.append(1.0)                                // Sub-Abschnitt 0 ist pre-reno
  FÜR EACH s IN in_periode (sortiert):
    F_kumuliert = F_kumuliert * (1 - s.einsparungProzent/100)
    F.append(F_kumuliert)

  // 4. Auflösen: wert_pre = gemessener_wert · L / Σ(L_j · F_j)
  nenner = SUM(tage_zwischen(sub[j].start, sub[j].ende) * F[j]  FÜR j)
  WENN nenner <= 0: FEHLER "Degenerate periode/reno-daten"
  wert_pre_reno = p.wert * L / nenner

  // 5. Auf Post-In-Periode-Zustand bringen
  F_inperiode_total = letzter(F)
  wert_post_inperiode = wert_pre_reno * F_inperiode_total

  // 6. Nach-Periode-Sanierungen noch draufrechnen (waren zum Messzeitpunkt
  //    noch nicht passiert, sind aber jetzt ist-Zustand)
  F_nach = PRODUKT(1 - s.einsparungProzent/100  FÜR s IN nach_periode)
  wert_ist = wert_post_inperiode * F_nach

  RÜCKGABE (vonDatum: p.vonDatum, bisDatum: p.bisDatum, wert: wert_ist)
```

**Invariante:** Wenn `sanierungen_vergangen` leer ist, liefert die Funktion die Periode unverändert zurück.

### 3.3 Hauptalgorithmus (ersetzt `computeQhlRaw` gedanklich)

```text
FUNKTION compute_qhl_mit_perioden(state):
  tvoll = resolve_tvoll(state)
  san_vergangen = sort_nach_datum([s FÜR s IN state.heizlast.sanierungMassnahmen
                                    WENN s.zeitpunkt == 'vergangen'
                                     UND s.datum != null])
  san_geplant   = [s FÜR s IN state.heizlast.sanierungMassnahmen
                    WENN s.zeitpunkt == 'geplant' ODER s.datum == null]

  // Methoden-Auto-Erkennung (bestehende Hierarchie bleibt)
  qhl_bestand = null
  m = state.heizlast.methodsEnabled

  WENN m.override:
    qhl_bestand = state.heizlast.override.qhl
  SONST WENN m.bstd:
    qhl_bestand = qhl_aus_bstd_perioden(state, tvoll, san_vergangen)
  SONST WENN m.messung:
    qhl_bestand = qhl_aus_messung_perioden(state, tvoll, san_vergangen)
  SONST WENN m.verbrauch:
    qhl_bestand = qhl_aus_verbrauch_perioden(state, tvoll, san_vergangen)

  WENN qhl_bestand IST null:
    qhl_bestand = qhl_aus_bauperiode(state, tvoll)   // Fallback wie bisher

  // Geplante Sanierungen auf Zukunftszustand anwenden (klassischer FWS-Abzug)
  f_geplant = PRODUKT(1 - s.einsparungProzent/100  FÜR s IN san_geplant)
  qhl_zukunft = qhl_bestand * f_geplant

  RÜCKGABE qhl_zukunft
```

```text
FUNKTION qhl_aus_verbrauch_perioden(state, tvoll, san_vergangen):
  v = state.heizlast.verbrauch

  // Perioden normalisieren
  WENN v.perioden IST LEER:
    // Legacy-Fallback: alter Einzelwert
    ba_jahr = v.ba
  SONST:
    perioden_ist = [periode_auf_ist_zustand(p, san_vergangen) FÜR p IN v.perioden]
    ba_jahr = aggregiere_perioden(perioden_ist, 'verbrauch')

  WENN ba_jahr IST null ODER ba_jahr <= 0: RÜCKGABE null
  brenn = BRENNWERTE[v.energietraeger]
  eta   = resolve_eta(state)

  qn = qn_aus_verbrauch(ba_jahr, brenn.ho, eta)
  WENN v.inklWW UND v.vwuAbzug > 0:
    qn = qn - qn_ww_jahr(v.vwuAbzug, ...)

  RÜCKGABE qhl_aus_qn(qn, tvoll)
```

```text
FUNKTION qhl_aus_messung_perioden(state, tvoll, san_vergangen):
  m = state.heizlast.messung
  WENN m.perioden IST LEER:
    qn_jahr = m.qnPerJahr
  SONST:
    perioden_ist = [periode_auf_ist_zustand(p, san_vergangen) FÜR p IN m.perioden]
    qn_jahr = aggregiere_perioden(perioden_ist, 'messung')  // annualisiert kWh

  WENN qn_jahr <= 0: RÜCKGABE null
  RÜCKGABE qhl_aus_qn(qn_jahr, tvoll)
```

```text
FUNKTION qhl_aus_bstd_perioden(state, tvoll, san_vergangen):
  b = state.heizlast.bstd
  WENN b.perioden IST LEER:
    // Legacy-Fallback
    stunden_pro_jahr = b.stundenGesamt / b.jahre
  SONST:
    // Sanierungs-Korrektur: weniger Stunden pro Tag wegen besserem Gebäude
    perioden_ist = [periode_auf_ist_zustand(
                     (vonDatum, bisDatum, wert = p.stunden), san_vergangen)
                     FÜR p IN b.perioden]
    stunden_pro_jahr = aggregiere_perioden(perioden_ist, 'bstd')

  qn_jahr = stunden_pro_jahr * b.qhWP
  RÜCKGABE qhl_aus_qn(qn_jahr, tvoll)
```

### 3.4 Warn-/Fehlerfälle

| Fall | Verhalten |
|---|---|
| `perioden[]` leer | Fallback auf Legacy-Einzelfeld (Hinweis im UI) |
| Periode kürzer als 30 Tage | Warnung `warnings.push('Periode zu kurz — Sommer-/Winterverzerrung möglich')` |
| Überlappende Perioden | Fehler, Berechnung stoppt für diese Methode (Fallback auf Legacy oder nächst-niedrigere Methode) |
| `vonDatum >= bisDatum` | Fehler, Periode ignoriert |
| Sanierung `vergangen` mit Datum nach letzter Periode | Wie „nach_periode" behandelt (F_nach wird angewendet) |
| Sanierung `vergangen` ohne Datum | Als `geplant` interpretiert (siehe § 2.1-Kommentar) |
| Sanierung `geplant` mit Datum in Vergangenheit | Ignoriert Datum, klassischer Abzug |

---

## § 4 Beispielrechnung per Hand

**Objekt:** EFH Mittelland, EBF 150 m², tvoll 2 000 h, Energieträger Öl, Ho 10.0 kWh/l, η 0.85, ohne WW-Abzug (zur Vereinfachung).

**Messperioden:**

| Periode | vonDatum | bisDatum | Tage | Verbrauch Ba |
|---|---|---|---|---|
| 1 | 2023-01-01 | 2024-01-01 | 365 | 2 500 l |
| 2 | 2024-01-01 | 2025-01-01 | 366 | 2 200 l |

**Sanierungen:**

| Nr. | Label | Einsparung | Datum | Zeitpunkt |
|---|---|---|---|---|
| S1 | Fenstertausch | 15 % | 2023-07-01 | vergangen |
| S2 | Dachsanierung | 20 % | 2025-09-01 | geplant |

### Schritt A — Periode 1 auf Ist-Zustand rekonstruieren

S1 liegt **innerhalb** Periode 1.

- Sub-Abschnitt 0: 2023-01-01 … 2023-07-01 → L₀ = 181 d, F₀ = 1.000
- Sub-Abschnitt 1: 2023-07-01 … 2024-01-01 → L₁ = 184 d, F₁ = 0.850

Nenner = 181·1.000 + 184·0.850 = 181.0 + 156.4 = **337.4**

`wert_pre_reno = 2500 · 365 / 337.4 … ` — Achtung: in der Formel in § 3.2 wird mit **L_p** multipliziert, nicht mit 365. Richtig also:

`wert_pre_reno = 2500 · L_p / 337.4 = 2500 · 365 / 337.4 = 2 704.80 l` (hypothetischer Vor-Sanierungs-Jahresverbrauch, skaliert auf 365 Tage? Nein — `wert_pre_reno` ist weiterhin ein Periodenwert über 365 Tage, weil L_p = 365.)

Klarstellung: die Formel operiert auf **absoluten Mengen pro Periode**. L_p ist die Perioden-Länge, `p.wert` ist die Gesamt-Menge in diesen L_p Tagen.

`wert_pre_reno = p.wert · L_p / Σ(L_j · F_j) = 2500 · 365 / 337.4 = 2 704.8 l`

→ Das ist der hypothetische Gesamt-Verbrauch über 365 Tage, **wenn S1 noch nicht passiert wäre**.

`F_inperiode_total = 0.850`  
`wert_post_inperiode = 2 704.8 · 0.850 = 2 299.1 l`  (Periode 1 so, als hätte S1 bereits am Anfang gewirkt)

Keine Nach-Periode-Sanierungen für Periode 1 (S2 ist geplant, nicht vergangen).

**Periode-1-Ist-Wert = 2 299.1 l über 365 Tage.**

### Schritt B — Periode 2 auf Ist-Zustand rekonstruieren

S1 liegt **vor** Periode 2 (2023-07-01 < 2024-01-01) → bereits in der Messung enthalten.  
Keine In-Periode-Sanierung. Keine nachgelagerte vergangene Sanierung.

**Periode-2-Ist-Wert = 2 200.0 l über 366 Tage** (unverändert).

### Schritt C — Aggregation

Summen:
- Σ Tage = 365 + 366 = 731
- Σ Ist-Werte = 2 299.1 + 2 200.0 = 4 499.1 l

Jahresäquivalent (auf 365 Tage normiert):

`ba_jahr = 4 499.1 · 365 / 731 = 2 246.3 l/a`

### Schritt D — Qhl (Ist-Zustand)

`Qn = Ba · Ho · η = 2 246.3 · 10.0 · 0.85 = 19 093.5 kWh/a`  
`Qhl_ist = Qn / tvoll = 19 093.5 / 2 000 = 9.547 kW`

### Schritt E — Geplante Sanierung anwenden

`f_geplant = 1 − 0.20 = 0.800`  
`Qhl_zukunft = 9.547 · 0.800 = 7.638 kW`

### Schritt F — Plausibilität

`spez = 7 638 / 150 = 50.9 W/m²`

Je nach deklarierter Bauperiode landet das im grünen oder gelben Band (FWS-Referenzband 1971–1980 EFH z. B. 60–100 W/m² → grün, wenn als Sanierungs-Ziel deklariert).

### Schritt G — Sanity-Check

Ohne Sanierungs-Timeline hätte der alte Code gerechnet:

- `ba_alt = 2500 + 2200 = 4700 l` gewichtet mit `365/731` = 2 347.5 l/a  
- `Qhl_alt_ist = 19 949 / 2000 = 9.97 kW`  
- Mit alter Logik und BEIDEN Sanierungen als datumslos: `9.97 · 0.85 · 0.80 = 6.78 kW`

Der neue Wert **7.64 kW** ist **0.86 kW höher** als der naive alte Wert, weil die vergangene Sanierung nur **halb wirksam** in Periode 1 mitgemessen wurde, also die Messung die Reduktion überzeichnet hätte. Das ist genau der Korrektur-Effekt, den wir wollen.

---

## § 5 Migrationsplan (localStorage + Sanity)

### 5.1 Version-Bump

`STATE_VERSION`: 1 → **2**.  
Migrations-Richtung: v1 → v2 in `storage.ts::migrateIfNeeded()`. Keine Rückwärts-Migration (wer v2 einmal gespeichert hat, bleibt auf v2).

### 5.2 Transformation alter States

Für jeden alten v1-State:

```text
FUNKTION migriere_v1_zu_v2(alt):
  neu = deepClone(alt)
  neu.version = 2

  // Verbrauch
  WENN alt.heizlast.verbrauch.ba > 0:
    neu.heizlast.verbrauch.perioden = [{
      id: 'p-migrated-verbrauch',
      vonDatum: '2024-01-01',
      bisDatum: '2025-01-01',
      wert: alt.heizlast.verbrauch.ba,
      notiz: 'Migriert aus v1 (datumsloser Einzelwert)'
    }]
  SONST:
    neu.heizlast.verbrauch.perioden = []

  // Messung
  WENN alt.heizlast.messung.qnPerJahr > 0:
    neu.heizlast.messung.perioden = [{
      id: 'p-migrated-messung',
      vonDatum: '2024-01-01',
      bisDatum: '2025-01-01',
      wertKWh: alt.heizlast.messung.qnPerJahr,
      notiz: 'Migriert aus v1'
    }]
  SONST:
    neu.heizlast.messung.perioden = []

  // Betriebsstunden
  WENN alt.heizlast.bstd.stundenGesamt > 0 UND alt.heizlast.bstd.jahre > 0:
    // „jahre" wird als Spanne bis Ende 2024 interpretiert
    jahr_ende = 2025
    jahr_start = 2025 - alt.heizlast.bstd.jahre
    neu.heizlast.bstd.perioden = [{
      id: 'p-migrated-bstd',
      vonDatum: jahr_start + '-01-01',
      bisDatum: jahr_ende + '-01-01',
      stunden: alt.heizlast.bstd.stundenGesamt,
      notiz: 'Migriert aus v1 (' + alt.heizlast.bstd.jahre + ' Jahre kumuliert)'
    }]
  SONST:
    neu.heizlast.bstd.perioden = []

  // Sanierungen: jede bekommt datum=null und zeitpunkt='geplant'
  //   (entspricht dem bisherigen Verhalten: klassischer multiplikativer Abzug)
  neu.heizlast.sanierungMassnahmen = alt.heizlast.sanierungMassnahmen.map(s => ({
    ...s,
    datum: null,
    zeitpunkt: 'geplant'
  }))

  RÜCKGABE neu
```

**Kernprinzip der Migration:** Der Rechner liefert nach der Migration **exakt denselben Qhl-Wert** wie vor der Migration. Das ist testbar:

- FWS-Aufgabe 2 (bisher Qhl = 12.55 kW) → muss nach Migration weiterhin 12.55 kW liefern.
- Dies bedingt: wenn `perioden` aus einem Einzelwert rekonstruiert wird und die Sanierungen als „geplant ohne Datum" klassifiziert werden, greift der klassische Pfad (`qhl_zukunft = qhl_bestand · Π_geplant`).

### 5.3 Sanity-Projekte (Cloud)

- `heizlast-project`-Schema in Sanity speichert den kompletten `stateJson`. Keine Schema-Änderung nötig, weil `stateJson` ein freier Text-Blob ist.
- Beim Laden eines Cloud-Projekts mit v1-Payload: die clientseitige `migrateIfNeeded` greift, der Migrations-Patch wird beim ersten Speichern zurück in die Cloud geschrieben.
- **Keine** serverseitige Migration nötig.

### 5.4 Backout-Strategie

Falls die v2-Migration einen Bug hat:

1. `STATE_VERSION` auf 1 zurücksetzen und die neuen Felder wieder ignorieren (Code bleibt rückwärtskompatibel, weil die Legacy-Einzelwerte noch da sind).
2. Nutzer mit v2-States im localStorage verlieren die manuell eingegebenen Perioden (die Einzelwerte bleiben intakt).
3. Cloud-Projekte: gleiches Verhalten, v2-Erweiterungen werden ignoriert.

Risiko der Datenverlust ist gering, weil die Migration **additiv** ist: alte Felder bleiben bestehen, neue kommen dazu.

---

## § 6 UX-Skizze — Section 2 nach der Änderung

Kern-Layout bleibt: Radio-Tab-Leiste oben (Verbrauch / Betriebsstunden / Direkteingabe Qhl), darunter das Panel der aktiven Methode, danach Plausibilisierungs-Hinweis aus Bauperiode und Sanierungs-Block.

### 6.1 Tab: Verbrauch

```
┌──────────────────────────────────────────────────────────────────┐
│  Energieträger [Öl ▼]    Wirkungsgrad η [Bestand 0.85 ▼]         │
│  WW im Verbrauch?  ☑ Ja      Vw,u Abzug [200 l/d]                │
│                                                                  │
│  Messperioden                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Von         Bis         Verbrauch   Einheit     ⋯       │   │
│  │  [2023-01-01][2024-01-01] [  2500 ]   l/a       [ 🗑 ]   │   │
│  │  [2024-01-01][2025-01-01] [  2200 ]   l/a       [ 🗑 ]   │   │
│  │  + Periode hinzufügen                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ℹ Gesamtspanne 731 Tage · Jahresäquivalent 2 246 l/a           │
└──────────────────────────────────────────────────────────────────┘
```

**UI-Regeln:**
- Standardmässig **eine leere Periode** vorgewählt (Default-vonDatum: 1. Januar des Vorjahres, bisDatum: 1. Januar dieses Jahres).
- Der Button „+ Periode hinzufügen" fügt eine neue Zeile mit Default-Werten an, deren `vonDatum` = `bisDatum` der letzten Zeile (zum Kettenbilden).
- Wenn alle Perioden gelöscht werden, wird der Legacy-Einzelwert aus `verbrauch.ba` sichtbar mit einem Hinweis „Einzelwert-Fallback aktiv".
- Eine **Info-Zeile** unten zeigt live (a) die Gesamt-Tage, (b) das Jahresäquivalent, (c) eine Warnung bei Periode < 30 Tagen oder bei Überlappung.

### 6.2 Tab: Betriebsstunden

```
┌──────────────────────────────────────────────────────────────────┐
│  Nennleistung Qh_WP  [8.5 kW]                                    │
│                                                                  │
│  Betriebsstunden-Perioden                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Von         Bis         Stunden          ⋯             │   │
│  │  [2022-01-01][2025-01-01]  [18000]        [ 🗑 ]        │   │
│  │  + Periode hinzufügen                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Alternative: Direktmessung (Wärmezähler / Kessel-Protokoll)    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Von         Bis         Qn [kWh]         ⋯             │   │
│  │  [2024-01-01][2025-01-01] [22500]         [ 🗑 ]        │   │
│  │  + Periode hinzufügen                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

- Direktmessung bleibt State-seitig eigene Methode (`messung`), UI-seitig im Bstd-Panel integriert.
- Priorität wie bisher: Direktmessung > Betriebsstunden (wenn beide Listen gefüllt sind).

### 6.3 Tab: Direkteingabe Qhl

Unverändert — ein Feld, keine Perioden.

### 6.4 Sanierungs-Block

```
┌──────────────────────────────────────────────────────────────────┐
│  Durchgeführte oder geplante Sanierungen                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Fenstertausch            15 %   [2023-07-01] (vergangen)│   │
│  │                                                   [ 🗑 ] │   │
│  │  Dachsanierung            20 %   [2025-09-01] (geplant) │   │
│  │                                                   [ 🗑 ] │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Massnahme hinzufügen  [Fenstertausch (15 %) ▼]   [+ hinzu]     │
│                                                                  │
│  ℹ Vergangene Sanierungen innerhalb einer Messperiode werden    │
│     automatisch aus dem Messwert herausgerechnet.               │
└──────────────────────────────────────────────────────────────────┘
```

Jede Zeile zeigt:
- Label (readonly nach Auswahl)
- Einsparung in Prozent (editierbar)
- **Datum** (ein `<input type="date">`)
- **Zeitpunkt-Toggle** (`<select>` oder zwei Chips): `vergangen` | `geplant` — **Default ist `geplant`** wenn kein Datum gesetzt, **`vergangen`** wenn Datum in der Vergangenheit.

### 6.5 Bauperiode-Legende

Unverändert — der bestehende `hz-bauperiode-info`-Block bleibt.

### 6.6 Darstellung der Live-Berechnung

Unter dem Sanierungs-Block wird eine Mini-Zusammenfassung gerendert (nur Live-Anzeige, kein Input):

```
ℹ Ist-Zustand Qhl:   9.55 kW     (aus Messperioden + vergangene Sanierungen)
  Zukunfts-Qhl:       7.64 kW    (nach geplanter Sanierung −20 %)
```

Das ersetzt den bisherigen Plausi-Hinweis nicht, sondern ergänzt ihn. Der bestehende Mechanismus (`data-kpi="qhlKorr"` in `ExecutiveSummary` + Section 5) liefert nach wie vor den **Zukunfts-Qhl** — das ist der Wert, den alle nachgelagerten Komponenten (WW-Zuschlag, Qoff, Qh) konsumieren.

---

## § 7 Sperrzeit mit Datum — Designbewertung

### 7.1 Markt-Realität CH

In der Schweiz gilt:

1. **Neu-Installationen** mit EVU-Sperrzeit: sind im Rahmen der Auslegung bekannt (Werkvertrag mit EW) und betreffen nur die Zukunft. Qoff-Mechanik deckt das ab (bereits implementiert).
2. **Bestands-Messungen** mit Sperrzeit: Die gemessenen Verbräuche oder Betriebsstunden wurden **unter** Sperrzeit erfasst. Im Normalfall ist das kein Korrektur-Bedarf, weil die Sperrzeit beim WP-Neubau **gleich bleibt** (EW-Vertrag ändert sich selten).
3. **Bestands-Messung ohne Sperrzeit → Neu-WP mit Sperrzeit** (häufiger Fall bei Öl→WP-Umstellung): Messung bildet den Bedarf im Dauerbetrieb ab. Qoff wird klassisch auf den aus der Messung berechneten Qhl aufgeschlagen → **kein** Korrekturbedarf in den Perioden-Messwerten.
4. **Bestands-Messung mit Sperrzeit → Neu-WP ohne Sperrzeit**: theoretisch Überdimensionierung, praktisch vernachlässigbar, weil Sperrzeit meist nur 2–4 h/Tag und das Gebäude die Überhöhung durch thermische Masse puffert. Real relevant nur bei sehr leicht gebauten Gebäuden.

### 7.2 Empfehlung

**Nicht implementieren in dieser Phase.** Gründe:

- Mehraufwand (State + Migration + UI + Tests) für sehr selten auftretende Fälle.
- Die physikalische Abschätzung (Perioden-Wechsel von „mit" zu „ohne" Sperrzeit) ist unscharf — das Delta wird fast immer von anderen Unsicherheiten (η, Ho, Nutzerverhalten) überdeckt.
- Die aktuelle Qoff-Mechanik (FWS-Formel mit Zukunfts-toff) ist FWS-konform und ausreichend.

**Fallback-Workaround für Anwender:** Wer den Sperrzeit-Effekt trotzdem in den Messwerten korrigieren will, kann manuell den `ba`-Wert um `24 / (24 − toff_historisch)` umrechnen und so eingeben. Das ist dokumentationswürdig, aber kein Code-Feature.

### 7.3 Wenn doch irgendwann umgesetzt — State-Skizze

```ts
export interface SperrzeitPeriode extends DatumsRange {
  id: string;
  stundenProTag: number;
}

export interface ZuschlaegeState {
  // ... bestehend ...
  /** Historische Sperrzeit-Phasen, die in den Messperioden enthalten waren. */
  sperrzeitPerioden: SperrzeitPeriode[];
  /** Zukunfts-Sperrzeit (heute = Qoff-Eingabe). */
  sperrzeitZukunft: { aktiv: boolean; stundenProTag: number };
}
```

Compute-Korrektur: pro Messperiode den Sperrzeit-Lastfaktor `24 / (24 − toff)` rausmultiplizieren, bevor `aggregiere_perioden` läuft. Für Zukunfts-Qoff bleibt die bestehende Mechanik. Aufwand ≈ ein halber Tag.

---

## § 8 Methoden-UX — Kurz-Spec (State-Teil)

UI wird in Paket B gebaut. Der State ändert sich für die Methoden-Auswahl **nicht**:

- `HeizlastMethodsEnabled = { verbrauch, messung, bstd, override: boolean }` bleibt.
- Semantisch gilt künftig: **genau einer** der vier Flags ist `true` (UI-Invariante, per Radio-Buttons erzwungen).
- Direktmessung (`messung`) wird UI-seitig **im Bstd-Panel** als Alternative angeboten. Wenn der User die Messung-Felder ausfüllt und die Bstd-Felder leer lässt, schaltet der Radio-Tab weiterhin auf `bstd = true` — aber die Compute-Hierarchie (override → bstd → messung → verbrauch) erkennt das automatisch und bevorzugt Messung.

### Compute-Hierarchie bleibt (mit Perioden-Awareness)

```
override → bstd.perioden oder bstd.einzelwert
        → messung.perioden oder messung.einzelwert
        → verbrauch.perioden oder verbrauch.einzelwert
        → bauperiode
```

Erste Methode, die **mit vorhandenen Daten** ein valides Ergebnis liefert, gewinnt. Wenn in einem Tab weder Perioden noch Einzelwerte gefüllt sind, fällt die Hierarchie auf die nächste Methode durch.

---

## § 9 Offene Fragen & Risiken

### 9.1 Heating-Degree-Day-Gewichtung

Perioden werden aktuell nur nach Kalendertagen gewichtet. Ein Winter-dominanter 90-Tage-Zeitraum (Dez–Feb) hat aber ≈ 3× mehr Heizlast pro Tag als ein Jahres-Mittel. Wer nur Winterperioden misst, überschätzt die Jahressumme massiv.

**Mitigation jetzt:** UI-Warnung bei Periodenlänge < 180 Tagen („Messung deckt keinen vollen Jahresgang ab — Jahresäquivalent mit Vorsicht geniessen").

**Optional später:** HDD-Korrektur anhand MeteoSchweiz-Norm-Heizgradtage pro Postleitzahl. Aufwand: Datenbank HDD-Tabellen + Stationszuordnung. Nicht in dieser Phase.

### 9.2 Verbrauchsanteil Warmwasser

Die aktuelle `inklWW`-Logik zieht pauschal `Vw,u · Verlustfaktoren · 365` als WW-Anteil vom Brennstoffverbrauch ab — **auf Jahresbasis**. Bei einer Teilperiode (z. B. nur Winter 90 Tage) ist das anteilig zu korrigieren: WW-Abzug sollte `· L_p / 365` sein, nicht global 365 Tage.

**Entscheidung:** In dieser Phase vereinfacht lassen. Der WW-Abzug wird **nach** der Aggregation zu einem Jahresäquivalent abgezogen, also implizit auf 365 Tage skaliert. Das ist leicht ungenau für Teil-Jahres-Messungen, aber konsistent mit der FWS-Praxis. Dokumentation im UI-Hint.

### 9.3 Überlappende Perioden

Der User könnte zwei sich überlappende Zeiträume eingeben (z. B. 2023-01-01/2024-01-01 und 2023-06-01/2024-06-01). Physikalisch sinnfrei.

**Entscheidung:** Beim Aggregations-Schritt überlappende Perioden erkennen (Sortierung nach `vonDatum`, dann Vergleich mit `bisDatum` des Vorgängers) und Fehler werfen. UI zeigt rote Inline-Warnung an der zweiten überlappenden Periode.

### 9.4 Zeitzonen / Sommerzeit

Kein Thema — wir rechnen auf Tages-Granularität. ISO-Date ohne Zeit. `DatumsRange.bisDatum` ist exklusiv, also kann ein User 2024-01-01 … 2025-01-01 eingeben, um genau 365 (bzw. 366) Tage zu erfassen.

### 9.5 Sanierungs-Reihenfolge bei gleichem Datum

Zwei Sanierungen am selben Tag: Reihenfolge ist undefiniert. Weil Multiplikation kommutativ ist, spielt die Reihenfolge für das Endergebnis keine Rolle — aber für die Sub-Periode-Aufteilung in § 3.2 wird die Liste als sortiert angenommen.

**Entscheidung:** Sortier-Key ist `(datum, id)`. Zwei Sanierungen am selben Tag erzeugen eine Sub-Periode der Länge 0 — die wird durch `L_j · F_j = 0` sauber übersprungen. Kein Bug.

### 9.6 Sanierung exakt am Periodenanfang / -ende

- `datum == p.vonDatum`: Sanierung wird als „vor der Periode" behandelt (Sub-Periode 0 hat Länge 0).
- `datum == p.bisDatum`: Sanierung wird als „nach der Periode" behandelt (`nach_periode`-Liste).

Begründung: `vonDatum` inklusiv, `bisDatum` exklusiv (vgl. § 2.1). Der Tag der Sanierung selbst zählt als „nachher".

### 9.7 UI-Usability bei vielen Perioden

Wenn ein Nutzer 5 Jahre mit 10 Ablese-Perioden eingibt, wird die Tabelle unübersichtlich.

**Mitigation:** UI-Limit „max. 12 Perioden" (weiche Warnung, kein Hard-Stop). CSV-Import für Bulk-Eingabe in einer späteren Phase offen.

### 9.8 Sanity-Payload-Grösse

`perioden` + `sanierungMassnahmen` mit Datum erweitern den `stateJson` um max. ~2 KB pro Projekt. Sanity-Document-Limit ist 4 MB → unkritisch.

### 9.9 Auswirkungen auf Regressions-Tests

- FWS-Aufgabe 1A/1B/2/3/4: Tests rufen calculations.ts-Funktionen **direkt** auf, bekommen Jahresäquivalente. Die Aggregations-Logik ist im Compute-Layer. Tests bleiben unverändert.
- `scripts/test-heizlast-state.ts`: prüft `runCascade(state)`. Hier ist entscheidend, dass die Migration (v1 → v2) oder das explizite Setzen von `perioden: []` (Einzelwert-Fallback) **exakt** denselben Qhl liefert. Neuer Test-Fall nötig: 2 Perioden + 1 vergangene + 1 geplante Sanierung → Qhl entspricht der Hand-Rechnung in § 4 (`Qhl_zukunft = 7.64 kW`, Toleranz 0.05).

### 9.10 Paket-Reihenfolge

- **Paket A (jetzt, dieser Chat):** Spec. Kein Code.
- **Paket B (nächster Chat):** State-Types + Storage-Migration + Section-2-UI + ein neuer Integrationstest. Compute unverändert (liest Perioden noch nicht — der Einzelwert-Fallback greift). Tests 49 + 16 bleiben grün.
- **Paket C (übernächster Chat):** Compute-Erweiterung — `aggregiere_perioden` + `periode_auf_ist_zustand` + Hauptalgorithmus + zweiter neuer Integrationstest mit der Hand-Rechnung aus § 4 als Regressionsfall. Tests 49 + 17 oder 18 grün.

Das Splitten erlaubt Paket B ohne Kernphysik-Risiko auszurollen (UI-Abnahme möglich, bevor die komplizierte Mathematik scharf geschaltet wird).

---

## § 10 Akzeptanzkriterien für Paket B (nächster Chat)

- [ ] `state.ts` kennt `VerbrauchPeriode`, `MessungPeriode`, `BstdPeriode`, `SanierungsZeitpunkt` und erweitert `SanierungsMassnahme` + die drei Methoden-States wie in § 2.
- [ ] `STATE_VERSION = 2`, Migrations-Funktion gemäss § 5.2.
- [ ] `Section2Heizlast.astro` zeigt Perioden-Tabellen (Verbrauch + Betriebsstunden + Messung) mit Add-/Remove-Buttons.
- [ ] Sanierungs-Block zeigt `datum` + `zeitpunkt`-Chip.
- [ ] Live-Info-Zeilen (Gesamt-Tage, Jahresäquivalent) werden gerendert — Datenquelle ist ein **temporärer UI-Compute-Helper**, nicht `compute.ts` (Paket C übernimmt).
- [ ] `bindings.ts` unterstützt die neuen Array-Pfade (analog zu `raeume` / `sanierungMassnahmen`).
- [ ] Regressionstest `scripts/test-heizlast-state.ts`: FWS-Aufgabe 2 liefert weiterhin Qhl = 12.55 kW nach v1→v2-Migration.
- [ ] Neuer Test: Migration eines v1-States mit 3 Sanierungen → alle bekommen `datum: null`, `zeitpunkt: 'geplant'`, Qhl bleibt identisch.
- [ ] Cloudflare-Build des Commits grün, `/heizlast` live erreichbar.

---

*Erstellt: 2026-04-18 · Paket A · keine Code-Änderungen · Follow-up: Paket B (UI) + Paket C (Compute).*
