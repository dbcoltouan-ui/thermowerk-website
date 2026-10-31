/**
 * Gerätewahl (Session 6): Dimensionierungs-Ampel nach Kurs-Faustregel (Folie 3: Q_h,max ≥ 0.75 · Q_WP) und
 * Bivalenz aus der FWS-Tabelle (Folie 95: 50/33/25 % Leistung → 80–85/50–60/30–40 % Energie). Externe Sollwerte.
 */
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../src/daten/fws';
import { waermepumpenDaten } from '../../src/daten/waermepumpen';
import { heizkoerperDaten } from '../../src/daten/heizkoerper';
import { bivalenz, dimensionierung, geraetWaehlen } from '../../src/kern/geraet';
import { ampelAufSkala, skalaVorlauf, skalaWpGroesse } from '../../src/kern/skala';
import { eingabe } from '../../src/kern/wert';

const fws = fwsDaten();
const wp = waermepumpenDaten();

describe('Dimensionierung r = Q_h / Q_WP', () => {
  it('Kurs-Faustregel: r ≥ 0.75 und WP deckt Q_h → grün; WP 35 % zu gross → gelb, 40 % → rot', () => {
    expect(dimensionierung(7500, 10000, fws).ampel).toBe('gruen');
    expect(dimensionierung(10000, 10000, fws).ampel).toBe('gruen');
    expect(dimensionierung(7400, 10000, fws).ampel).toBe('gelb');
    expect(dimensionierung(7150, 10000, fws).ampel).toBe('rot');
    expect(dimensionierung(5900, 10000, fws).ampel).toBe('rot');
  });
  it('Aufgabe 4 (Q_h 9.0 kW, Q_WP 12 kW): r = 0.75 — Grenzfall der Faustregel, Text nennt die Übergrösse', () => {
    const d = dimensionierung(9000, 12000, fws);
    expect(d.verhaeltnis.wert).toBeCloseTo(0.75, 6);
    expect(d.ampel).toBe('gruen');
    expect(d.text).toContain('33 %');
  });
  it('WP kleiner als Q_h: knapp (gelb) bis 10 %, darüber rot (bivalent)', () => {
    expect(dimensionierung(10500, 10000, fws).ampel).toBe('gelb');
    expect(dimensionierung(11500, 10000, fws).ampel).toBe('rot');
    expect(dimensionierung(0, 10000, fws).ampel).toBe('grau');
  });
});

describe('Bivalenz nach Folie 95', () => {
  it.each([
    [0.5, 0.8, 0.85],
    [0.33, 0.5, 0.6],
    [0.25, 0.3, 0.4],
  ])('Leistungsanteil %s → Energieanteil %s–%s (Tabellenwert)', (a, lo, hi) => {
    const b = bivalenz(10000, a * 10000, fws);
    expect(b.monovalent).toBe(false);
    expect(b.energieanteil!.band![0]).toBeCloseTo(lo, 6);
    expect(b.energieanteil!.band![1]).toBeCloseTo(hi, 6);
    expect(b.energieanteil!.herkunft).toBe('tabelle');
  });
  it('monovalent bei Q_WP ≥ Q_h; unter 25 % nicht abschätzbar; zwischen 50 % und 100 % als Schätzung markiert', () => {
    expect(bivalenz(8000, 10000, fws)).toMatchObject({ monovalent: true });
    expect(bivalenz(10000, 2000, fws).energieanteil).toBeNull();
    const b = bivalenz(10000, 7500, fws);
    expect(b.energieanteil!.herkunft).toBe('schaetzung');
    expect(b.energieanteil!.wert).toBeGreaterThan(0.825);
    expect(b.energieanteil!.wert).toBeLessThan(1);
  });
});

describe('Gerätefilter', () => {
  const qh = eingabe(10000, 'W');
  it('nur Heizungs-WP im Bereich [Q_h·0.9, Q_h/0.75], Vorlauf ≥ Auslegungs-VL, sortiert nach Passung', () => {
    const r = geraetWaehlen({ qh, auslegungsVL: eingabe(65, '°C'), filter: { quelle: 'luftWasser' } }, { fws, wp });
    expect(r.liste.length).toBeGreaterThan(0);
    for (const g of r.liste) {
      expect(g.qWpW).toBeGreaterThanOrEqual(9000);
      expect(g.qWpW).toBeLessThanOrEqual(10000 / 0.75 + 1e-6);
      expect(g.vorlaufMaxC ?? 99).toBeGreaterThanOrEqual(65);
      expect(wp.geraete.find((d) => d.id === g.id)!.kategorie).toBe('heizung');
    }
    const abst = r.liste.map((g) => Math.abs(g.qWpW - 10000));
    expect(abst).toEqual([...abst].sort((a, b) => a - b));
  });
  it('WW-Ladetemperatur hebt den Filter-Vorlauf an; Override gewinnt mit Warnung bei zu tief', () => {
    const r = geraetWaehlen({ qh, auslegungsVL: eingabe(50, '°C'), wwLadetemperaturC: 60, filter: { quelle: 'luftWasser' } }, { fws, wp });
    expect(r.filterVorlauf!.wert).toBe(60);
    const o = geraetWaehlen({ qh, auslegungsVL: eingabe(58, '°C'), filter: { quelle: 'luftWasser', vorlaufC: 50 } }, { fws, wp });
    expect(o.filterVorlauf!.herkunft).toBe('override');
    expect(o.hinweise.some((h) => h.code === 'geraet.filterVorlaufZuTief')).toBe(true);
  });
  it('Schallfilter: Geräte über dem Grenzwert fallen weg, Geräte ohne Schallwert bleiben als «Schall unbekannt» gekennzeichnet mit Hinweis (DATA-04)', () => {
    const ohne = geraetWaehlen({ qh, auslegungsVL: null, filter: { quelle: 'luftWasser' } }, { fws, wp });
    expect(ohne.liste.every((g) => !g.schallUnbekannt)).toBe(true);
    expect(ohne.hinweise.some((h) => h.code === 'geraet.schallUnbekannt')).toBe(false);
    const r = geraetWaehlen({ qh, auslegungsVL: null, filter: { quelle: 'luftWasser', schallNachtMaxDb: 30 } }, { fws, wp });
    expect(r.liste.length).toBeGreaterThan(0);
    for (const g of r.liste) {
      const d = wp.geraete.find((x) => x.id === g.id)!;
      expect(g.schallNachtMaxDb).toBe(d.schallNachtMaxDb);
      if (d.schallNachtMaxDb === null) expect(g.schallUnbekannt).toBe(true);
      else {
        expect(d.schallNachtMaxDb).toBeLessThanOrEqual(30);
        expect(g.schallUnbekannt).toBe(false);
      }
    }
    const unbekannt = r.liste.filter((g) => g.schallUnbekannt).length;
    expect(unbekannt).toBeGreaterThan(0);
    const h = r.hinweise.find((x) => x.code === 'geraet.schallUnbekannt');
    expect(h?.text).toContain(`${unbekannt} `);
    expect(h?.pfad).toBe('geraet.filterOverrides.schallNachtMaxDb');
  });
  it('Brauchwasser-WP als Auswahl → Fehler; unbekannte id → Warnung', () => {
    const ww = wp.geraete.find((d) => d.kategorie === 'brauchwasser')!;
    const r = geraetWaehlen({ qh, auslegungsVL: null, filter: { quelle: 'luftWasser' }, auswahlId: ww.id }, { fws, wp });
    expect(r.hinweise.some((h) => h.code === 'geraet.keineHeizungsWp' && h.stufe === 'fehler')).toBe(true);
    const u = geraetWaehlen({ qh, auslegungsVL: null, filter: { quelle: 'luftWasser' }, auswahlId: 'XX-9999' }, { fws, wp });
    expect(u.gewaehlt).toBeNull();
    expect(u.hinweise.some((h) => h.code === 'geraet.auswahlUnbekannt')).toBe(true);
  });
});

describe('Prozent-Skala WP-Grösse (Wunsch Daniel 29.10.)', () => {
  it('Bereiche: grün 0 … +33 % (Kurs), gelb −9 … 0 und +33 … +37 %, sonst rot; Grenzen zum milderen Bereich', () => {
    const s = skalaWpGroesse(fws, null);
    expect(s.wert).toBeNull();
    expect(s.ampel).toBe('grau');
    const gruen = s.bereiche.find((b) => b.ampel === 'gruen')!;
    expect(gruen.von).toBe(0);
    expect(gruen.bis).toBeCloseTo(33.33, 2);
    expect(ampelAufSkala(s.bereiche, 0)).toBe('gruen');
    expect(ampelAufSkala(s.bereiche, 100 / 3)).toBe('gruen');
    expect(ampelAufSkala(s.bereiche, (1 / 1.1 - 1) * 100)).toBe('gelb');
    expect(ampelAufSkala(s.bereiche, -15)).toBe('rot');
    expect(ampelAufSkala(s.bereiche, 35)).toBe('gelb');
    expect(ampelAufSkala(s.bereiche, 37)).toBe('gelb');
    expect(ampelAufSkala(s.bereiche, 38)).toBe('rot');
    expect(ampelAufSkala(s.bereiche, 50)).toBe('rot');
  });
  it('Beispiel Leistungsstufen: Bedarf 11 kW → 12-kW-Gerät +9 % grün, 10-kW-Gerät −9 % gelb (knapp)', () => {
    const gross = dimensionierung(11000, 12000, fws);
    expect(gross.uebergroesse.wert).toBeCloseTo(9.09, 1);
    expect(gross.skala.wert).toBeCloseTo(9.09, 1);
    expect(gross.ampel).toBe('gruen');
    expect(gross.text).toContain('9 % grösser');
    const klein = dimensionierung(11000, 10000, fws);
    expect(klein.uebergroesse.wert).toBeCloseTo(-9.09, 1);
    expect(klein.ampel).toBe('gelb');
    expect(klein.text).toContain('kleiner');
  });
  it('Datenblattwert am Auslegungspunkt (Folie 93) ersetzt den Datenbankwert A−7/W35 für die Ampel', () => {
    const qh = eingabe(10000, 'W');
    const nenn = geraetWaehlen({ qh, auslegungsVL: eingabe(55, '°C'), filter: { quelle: 'luftWasser' }, auswahlId: 'OE-0001' }, { fws, wp });
    expect(nenn.gewaehlt!.qWpMassgebend).toBe(nenn.gewaehlt!.qWp);
    const ap = geraetWaehlen({ qh, auslegungsVL: eingabe(55, '°C'), filter: { quelle: 'luftWasser' }, auswahlId: 'OE-0001', qWpAuslegungW: 9500 }, { fws, wp });
    expect(ap.gewaehlt!.qWpMassgebend).toMatchObject({ wert: 9500, herkunft: 'eingabe' });
    expect(ap.gewaehlt!.dimensionierung.ampel).toBe('gelb');
    expect(nenn.gewaehlt!.dimensionierung.ampel).toBe('gruen');
  });
});

describe('Skala Auslegungs-Vorlauf', () => {
  it('≤ 55 grün, ≤ 65 gelb, darüber rot (heizkoerper-tabellen.json ampel.vorlaufC)', () => {
    const hk = heizkoerperDaten();
    expect(skalaVorlauf(hk, 55).ampel).toBe('gruen');
    expect(skalaVorlauf(hk, 60).ampel).toBe('gelb');
    expect(skalaVorlauf(hk, 65).ampel).toBe('gelb');
    expect(skalaVorlauf(hk, 70).ampel).toBe('rot');
    expect(skalaVorlauf(hk, null).ampel).toBe('grau');
  });
});

describe('Filter-Vorlauf-Standard und Modulation (Session 8)', () => {
  const qh = eingabe(10000, 'W');
  const vl = eingabe(58, '°C');
  it('Standard = Auslegungs-VL bzw. höhere WW-Ladetemperatur; eigene Angabe ersetzt nur den Filterwert', () => {
    expect(geraetWaehlen({ qh, auslegungsVL: vl, filter: { quelle: 'luftWasser' } }, { fws, wp }).filterVorlaufStandard?.wert).toBe(58);
    const ww = geraetWaehlen({ qh, auslegungsVL: eingabe(45, '°C'), wwLadetemperaturC: 60, filter: { quelle: 'luftWasser' } }, { fws, wp });
    expect(ww.filterVorlaufStandard?.wert).toBe(60);
    expect(ww.filterVorlauf?.wert).toBe(60);
    const o = geraetWaehlen({ qh, auslegungsVL: vl, filter: { quelle: 'luftWasser', vorlaufC: 65 } }, { fws, wp });
    expect(o.filterVorlauf).toMatchObject({ wert: 65, herkunft: 'override' });
    expect(o.filterVorlaufStandard?.wert).toBe(58);
  });
  it('Modulation aus der Datenbank (Oertli, Katalog): untere Grenze als Anteil von Q_h; ohne Eintrag null', () => {
    const g = geraetWaehlen({ qh: eingabe(8000, 'W'), auslegungsVL: vl, filter: { quelle: 'luftWasser' }, auswahlId: 'OE-0006' }, { fws, wp }).gewaehlt!;
    expect(g.modulation!.minW.wert).toBeCloseTo(2100, 6);
    expect(g.modulation!.maxW.wert).toBeCloseTo(8300, 6);
    expect(g.modulation!.anteilMinAnQh!.wert).toBeCloseTo(2100 / 8000, 6);
    expect(geraetWaehlen({ qh, auslegungsVL: vl, filter: { quelle: 'luftWasser' }, auswahlId: 'BO-0003' }, { fws, wp }).gewaehlt!.modulation).toBeNull();
  });
});
