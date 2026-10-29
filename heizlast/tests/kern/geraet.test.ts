/**
 * Gerätewahl (Session 6): Dimensionierungs-Ampel nach Kurs-Faustregel (Folie 3: Q_h,max ≥ 0.75 · Q_WP) und
 * Bivalenz aus der FWS-Tabelle (Folie 95: 50/33/25 % Leistung → 80–85/50–60/30–40 % Energie). Externe Sollwerte.
 */
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../src/daten/fws';
import { waermepumpenDaten } from '../../src/daten/waermepumpen';
import { bivalenz, dimensionierung, geraetWaehlen } from '../../src/kern/geraet';
import { eingabe } from '../../src/kern/wert';

const fws = fwsDaten();
const wp = waermepumpenDaten();

describe('Dimensionierung r = Q_h / Q_WP', () => {
  it('Kurs-Faustregel: r ≥ 0.75 und WP deckt Q_h → grün; WP 34 % zu gross → nicht grün', () => {
    expect(dimensionierung(7500, 10000, fws).ampel).toBe('gruen');
    expect(dimensionierung(10000, 10000, fws).ampel).toBe('gruen');
    expect(dimensionierung(7400, 10000, fws).ampel).toBe('gelb');
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
  it('Brauchwasser-WP als Auswahl → Fehler; unbekannte id → Warnung', () => {
    const ww = wp.geraete.find((d) => d.kategorie === 'brauchwasser')!;
    const r = geraetWaehlen({ qh, auslegungsVL: null, filter: { quelle: 'luftWasser' }, auswahlId: ww.id }, { fws, wp });
    expect(r.hinweise.some((h) => h.code === 'geraet.keineHeizungsWp' && h.stufe === 'fehler')).toBe(true);
    const u = geraetWaehlen({ qh, auslegungsVL: null, filter: { quelle: 'luftWasser' }, auswahlId: 'XX-9999' }, { fws, wp });
    expect(u.gewaehlt).toBeNull();
    expect(u.hinweise.some((h) => h.code === 'geraet.auswahlUnbekannt')).toBe(true);
  });
});
