# Warmwasser- und Pufferspeicher — Marktübliche Grössen Schweiz

**Stand:** April 2026
**Kontext:** Phase 9 / Block J — Speicher-Rundung an realistische CH-WP-Markt-Staffelung anpassen.

## Warmwasserspeicher (Trinkwarmwasser)

Typische Schweizer Grössen im EFH-/MFH-Segment nach Herstellerrecherche:

| Hersteller | Modellreihe | Verfügbare Grössen (Liter) |
|---|---|---|
| **Hoval** | CombiVal ER | 200, 300, 400, 500, 750, 1000 |
| **Hoval** | CombiVal ESR | 200, 300, 400 |
| **Hoval** | CombiVal ESSR | 500, 750, 1000 |
| **Hoval** | CombiVal WP(ER/EF) | 300 (Schwerpunkt CH-EFH) |
| **Hoval** | CombiVal CSR | 300, 500, 750, 1000, 1500, 2000 |
| **Viessmann** | Vitocell 100-V / 300-W | 130, 160, 200, 300, 400, 500, 750, 950 |
| **Stiebel Eltron** | WWK-I 300 Plus | 300 |
| **Stiebel Eltron** | SHP-F 300 | 300 |
| **Domotec** | NUOS Monobloc | 200, 250, 270, 300, 400 |
| **Domotec** | NUOS Extra Splitt | 300, 500, 750, 1000, 1500, 2000 |

**Kernbeobachtung:** Im EFH-Segment (200–500 L) sind 100-L-Schritte Standard (200/300/400/500). Darüber wird 250-L-gestaffelt (750/1000) oder bei Grossanlagen 500-L (1500/2000). Unterhalb von 200 L gibt es vereinzelt 130/160 L (Viessmann), für WP-Auslegungen aber selten relevant.

**Rundungsempfehlung `rundeSpeicher(v, 'ww')`:**
- `v ≤ 200 L` → auf 50er-Schritte aufrunden (100/150/200)
- `200 < v ≤ 500 L` → auf 100er-Schritte aufrunden (300/400/500)
- `500 < v ≤ 1000 L` → auf 250er-Schritte aufrunden (750/1000)
- `v > 1000 L` → auf 500er-Schritte aufrunden (1500/2000/2500)

## Pufferspeicher (Heizungsseitig)

Typische Schweizer Grössen im Wärmepumpen-Kontext:

| Hersteller | Modellreihe | Verfügbare Grössen (Liter) |
|---|---|---|
| **Jenni Energietechnik** | Pufferspeicher WP | 50, 100, 200, 300, 500, 800, 1000, 1500, 2000 |
| **Hoval** | HPX | 100, 200, 300, 500, 800, 1000 |
| **Viessmann** | Vitocell 100-E | 46, 100, 200, 400, 600, 750, 950 |
| **Stiebel Eltron** | SBP E | 100, 200, 400, 700 |

**Normen-Hinweis:**
- DIN EN 15450: 12–35 L pro kW Wärmepumpen-Heizleistung.
- VDI 4645: Richtwert 20 L/kW für kleine Wärmepumpen.

**Kernbeobachtung:** Unter 200 L sind 50er-Schritte üblich, 200–500 L sind 100er-Schritte, darüber 200–250er-Schritte. Ein 46-Liter-Puffer (Viessmann) ist eine Ausnahme — in CH-WP-Auslegungen spielen Grössen < 50 L praktisch keine Rolle.

**Rundungsempfehlung `rundeSpeicher(v, 'puffer')`:**
- `v ≤ 200 L` → auf 50er-Schritte aufrunden (50/100/150/200)
- `200 < v ≤ 500 L` → auf 100er-Schritte aufrunden (300/400/500)
- `v > 500 L` → auf 200er-Schritte aufrunden (600/800/1000/1200)

## Implementierung

- Neue Funktion `rundeSpeicherMarkt(volumenL, 'ww' | 'puffer')` in `src/lib/heizlast/calculations.ts` ersetzt den bisherigen pauschalen 10-L-/5-L-Runder für die beiden Anwendungsfälle.
- Legacy-Funktion `rundeSpeicher(v, schritt)` bleibt als pure Helper, wird aber nicht mehr im Cascade verwendet.
- State-Felder `speicher.wwRundungLiter` und `speicher.pufferRundungLiter` werden als Legacy markiert (bleiben für Migration vorhanden, werden aber nicht mehr gelesen).
- UI (`Section6Speicher.astro`) zeigt Berechnungswert und Empfehlung getrennt:
  „Berechnungswert 287 L · Empfehlung 300 L".

## Quellen

- [Hoval Schweiz — Speicher / Trinkwassererwärmung](https://www.hoval.ch/de_CH/Heiztechnik/Speicher-Trinkwassererw%C3%A4rmung/c/G_storage-tank-domestic-water-heating)
- [Hoval CombiVal WPEF (300) — Topten](https://www.topten.ch/private/product/view/HovalCombiValWPEF300)
- [Viessmann CH — Warmwasserspeicher im Vergleich](https://www.viessmann.ch/de/wissen/technik-und-systeme/warmwasserspeicher.html)
- [Viessmann CH — Heizwasser-Pufferspeicher in der Übersicht](https://www.viessmann.ch/de/wissen/technik-und-systeme/heizwasser-pufferspeicher.html)
- [Stiebel Eltron — Puffer- und Trinkwarmwasserspeicher-Produktübersicht](https://www.stiebel-eltron.de/de/home/produkte-loesungen/erneuerbare_energien/systemspeicher.html)
- [Domotec AG — Warmwasser-Wärmepumpen (WP-Boiler)](https://domotec.ch/produkte/warmwasser-waermepumpen-wp-boiler/)
- [Jenni Energietechnik — Pufferspeicher für Wärmepumpen](https://jenni.ch/geschaeftskunden/speicher/pufferspeicher/waermepumpe-pufferspeicher/)
- [Heizungsmacher — Pufferspeicher für die Wärmepumpe, ist das sinnvoll?](https://www.heizungsmacher.ch/wissen/pufferspeicher-fuer-die-waermepumpe-ist-das-sinnvoll)
