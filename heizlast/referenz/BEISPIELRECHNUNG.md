# Beispielrechnung — „Referenzhaus Moosseedorf"

> Diese Rechnung ist ein frei konstruiertes Beispiel, das bewusst rund bleibt, damit sich der komplette Rechenweg von Hand nachvollziehen und am Ende rückrechnen lässt. Sie dient als Referenz für den Rechenkern in `src/calc/fws.mjs` und wird vom Tool-Smoketest verifiziert.
>
> **S1 (2026-04-30)** — Hi-Konvention nach suissetec FWS-Online-Tool. Die alte Notation „Ho = 10.4 kWh/m³" (Brennwert) ist durch „Hi = 10.04 kWh/m³" (unterer Heizwert) ersetzt; die η-Werte sind weiterhin auf den Heizwert bezogen. Q<sub>hl</sub> beträgt damit **8.871 kW** (vorher 9.276 kW mit der Brennwert-Konvention).

## Objekt

| | |
|---|---|
| Gebäudetyp | EFH |
| Lage | Mittelland |
| Bauperiode (deklariert) | 1986–1990 |
| Energiebezugsfläche (EBF) | 150 m² |
| Wohneinheiten | 1 |
| WP produziert Warmwasser | ja |

## Eingaben

| Parameter | Wert | Quelle / Bemerkung |
|---|---|---|
| Vollbetriebsstunden tvoll | 2'000 h | FWS §3, Wohngebäude ohne WW, Mittelland |
| Energieträger | Erdgas | |
| Heizwert Hi | 10.04 kWh/m³ | suissetec FWS-Online-Tool, unterer Heizwert |
| Jahresverbrauch Ba | 2'500 m³/a | (frei gewählt, rund) |
| Jahresnutzungsgrad η | 0.90 | kondensierender Kessel (neu), bezogen auf Hi |
| Verbrauch inkl. WW | ja | |
| WW-Nutzvolumen VW,u | 180 l/d | |
| Speicherverluste | 10 % | FWS §8 |
| Zirkulationsverluste | 0 % | kein Zirk |
| Ausstossverluste | 15 % | FWS §8 |
| Sperrzeit toff | 2 h/d | EW-Sperrzeit Werktag |
| Zusatzleistung Qas | 0 kW | keine Zusatzverbraucher |

---

## Vorwärtsrechnung

### Schritt 1 — Nutzenergie brutto (inkl. WW)

    Qn = Ba · Hi · η
    Qn = 2'500 · 10.04 · 0.90
    Qn = 22'590 kWh/a

### Schritt 2 — Nutzenergie Warmwasser (jährlich)

Kompakt-Jahresformel FWS §8:

    Qn,WW = V · cp · ΔT / 3600 · Π(1+f) · 365
    Basis = 180 · 4.2 / 3600 · 50 · 365 = 3'832.5 kWh/a
    Faktor = (1+0.10) · (1+0) · (1+0.15) = 1.265
    Qn,WW = 3'832.5 · 1.265 = 4'848.1 kWh/a

### Schritt 3 — Nutzenergie Heizung (nach WW-Abzug)

    Qn,H = Qn − Qn,WW
    Qn,H = 22'590 − 4'848.1 = 17'741.9 kWh/a

### Schritt 4 — Norm-Heizlast

    Qhl = Qn,H / tvoll
    Qhl = 17'741.9 / 2'000
    Qhl = 8.871 kW

### Schritt 5 — Plausibilitätskontrolle (W/m²)

    spez = Qhl · 1000 / EBF
    spez = 8'871 / 150 = 59.1 W/m²
    Referenzband 1986–1990 EFH: 30–48 W/m²
    Ergebnis: ROT (deutlich über Band)

Hinweis: Das Beispiel ist bewusst so gewählt, dass der Plausi-Check rot wird — Verbrauch und angegebene Bauperiode passen nicht zueinander. Das ist das korrekte Verhalten und zeigt, dass der Rechner den Widerspruch erkennt.

### Schritt 6 — Warmwasserbedarf pro Tag

    QWW,Tag = Qn,WW / 365
    QWW,Tag = 4'848.1 / 365 = 13.28 kWh/d

### Schritt 7 — Leistungszuschlag Warmwasser

    td = QWW,Tag / Qhl = 13.28 / 8.871 = 1.497 h/d
    Qw = Qhl · (24 / (24 − td) − 1)
    Qw = 8.871 · (24 / 22.503 − 1)
    Qw = 8.871 · 0.0665 = 0.590 kW

### Schritt 8 — Leistungszuschlag Sperrzeit

    Qoff = Qhl · (24 / (24 − toff) − 1)
    Qoff = 8.871 · (24 / 22 − 1)
    Qoff = 8.871 · 0.0909 = 0.806 kW

### Schritt 9 — Gesamte WP-Auslegungsleistung

    Qh = Qhl + Qw + Qoff + Qas
    Qh = 8.871 + 0.590 + 0.806 + 0
    Qh = 10.267 kW

### Schritt 10 — WW-Speichervolumen (FWS §10)

    VW,Sto = QWW,Tag / (cp · ΔT / 3600)
    VW,Sto = 13.28 / (4.2 · 50 / 3600)
    VW,Sto = 13.28 / 0.0583
    VW,Sto = 227.7 l → gerundet 230 l (10-L-Schritt)

---

## Rückrechnung (Invertierbarkeits-Check)

Aus den Endresultaten zurück zu den Eingaben — muss die gleichen Werte liefern, sonst ist eine Formel fehlerhaft.

| Rück-Schritt | Formel | Ergebnis | Erwartet |
|---|---|---|---|
| Qhl → Qn,H | Qn,H = Qhl · tvoll | 8.871 · 2'000 = 17'742 kWh/a | 17'742 ✓ |
| Qn,H + Qn,WW → Qn brutto | 17'742 + 4'848.1 | 22'590.1 kWh/a | 22'590 ✓ |
| Qn brutto → Ba | Ba = Qn / (Hi · η) | 22'590 / 9.036 | 2'500 m³/a ✓ |
| VW,Sto → QWW,Tag | QWW,Tag = VW,Sto · cp · ΔT / 3600 | 227.7 · 0.0583 | 13.28 kWh/d ✓ |
| Qh − Qw − Qoff → Qhl | Qhl = 10.267 − 0.590 − 0.806 | 8.871 kW | 8.871 kW ✓ |

Alle Rückwärts-Schritte landen bei den ursprünglichen Eingaben. Die Formeln sind invertierbar und konsistent.

---

## Zusammenfassung

| Grösse | Wert | Einheit |
|---|---|---|
| Qn (brutto inkl. WW) | 22'590 | kWh/a |
| Qn,WW | 4'848 | kWh/a |
| Qn,H (netto) | 17'742 | kWh/a |
| Qhl (Norm-Heizlast) | 8.87 | kW |
| spez. Heizleistung | 59.1 | W/m² (→ rot) |
| Qw (WW-Zuschlag) | 0.59 | kW |
| Qoff (Sperrzeit-Zuschlag) | 0.81 | kW |
| **Qh (WP-Auslegung)** | **10.27** | **kW** |
| VW,Sto (gerundet 10 L) | 230 | l |

---

## Verifikation im Testskript

Dieses Beispiel ist im automatischen Regressionstest enthalten:

```bash
node --test tests/fws.test.mjs
```

Erwartete Ausgabe: alle Tests grün. Insbesondere ist **Q<sub>hl</sub> = 8.871 kW** der Referenzwert für die Hi-Konvention.

---

*Stand: 2026-04-30 (S1) · Hi-Konvention nach suissetec FWS-Online-Tool · vorher 2026-04-16 (Phase 1 Rechenkern-Port mit Brennwert-Konvention)*
