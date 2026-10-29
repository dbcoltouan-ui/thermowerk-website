/**
 * Speicher — Sollwerte: FWS M3 Folie 49/54 (Q_WW 40.3 kWh/d, 800-l-Speicher), BEISPIELRECHNUNG (227.7 l bei 13.28 kWh/d),
 * Wissensbasis J §5 (Luft-WP 30–50 l/kW; EFH 10 kW → 200–300 l), Wissensbasis K §5 (MAG-Kontrollbeispiel 27.8 → 35 l).
 */
import { describe, expect, it } from 'vitest';
import { fwsDaten, hydraulikDaten } from '../../src/daten/fws';
import { aufMarktstufe, ausdehnungsfaktor, mag, puffer, sicherheitsventil, wwSpeicher } from '../../src/kern/speicher';
import { eingabe } from '../../src/kern/wert';
import { erwarteNahe, pruefeWert } from './hilfen';

const daten = fwsDaten();
const hyd = hydraulikDaten();

describe('Warmwasserspeicher (Folie 54–57)', () => {
  it('Folie 49/54: Q_WW 40.3 kWh/d, 60 °C → ΔT 50 K → 690.9 l; f_sto 1.1 (nur Mischzone) → 760 l → Markt 800 l (Kursbeispiel hat 800 l)', () => {
    const r = wwSpeicher({ qwwKwhTag: eingabe(40.3, 'kWh/d'), vwuLiterTag: eingabe(490, 'l/d'), tLadeC: 60, fStoKey: 'nurMischzone', gebaeudetyp: 'mfh' }, daten);
    expect(r.deltaT.wert).toBe(50);
    erwarteNahe(r.volumenRoh.wert, 690.9, 0.1, 'V_roh');
    expect(r.fSto.wert).toBe(1.1);
    erwarteNahe(r.volumen.wert, 759.9, 0.1, 'V · f_sto');
    expect(r.volumenEffektiv.wert).toBe(800);
    expect(r.spitzendeckung!.wert).toBeCloseTo(490 * 0.09, 6);
    for (const w of [r.tLade, r.deltaT, r.volumenRoh, r.fSto, r.volumen, r.volumenEffektiv, r.spitzendeckung]) pruefeWert(w, 'WW-Speicher');
  });
  it('BEISPIELRECHNUNG Schritt 10: 13.28 kWh/d → 227.7 l (f_sto 1.0); Standard f_sto 1.25 ist Fallback «Standardwert»', () => {
    const r = wwSpeicher({ qwwKwhTag: eingabe(13.28, 'kWh/d'), tLadeC: 60, fStoKey: 'keine' }, daten);
    erwarteNahe(r.volumenRoh.wert, 227.7, 0.1, 'V_roh');
    expect(r.volumenEffektiv.wert).toBe(300);
    const d = wwSpeicher({ qwwKwhTag: eingabe(13.28, 'kWh/d') }, daten);
    expect(d.fSto.wert).toBe(1.25);
    expect(d.fSto.herkunft).toBe('fallback');
    expect(d.tLade.herkunft).toBe('fallback');
    expect(d.volumen.wert).toBeCloseTo(227.7 * 1.25, 0);
  });
  it('ΔT folgt der Ladetemperatur (eine Regel): 55 °C → 45 K → grösserer Speicher; Override gewinnt mit Warnung wenn zu klein', () => {
    const a = wwSpeicher({ qwwKwhTag: eingabe(13.28, 'kWh/d'), tLadeC: 60, fStoKey: 'keine' }, daten);
    const b = wwSpeicher({ qwwKwhTag: eingabe(13.28, 'kWh/d'), tLadeC: 55, fStoKey: 'keine' }, daten);
    expect(b.deltaT.wert).toBe(45);
    expect(b.volumenRoh.wert / a.volumenRoh.wert).toBeCloseTo(50 / 45, 6);
    const o = wwSpeicher({ qwwKwhTag: eingabe(13.28, 'kWh/d'), tLadeC: 60, fStoKey: 'keine', volumenOverrideLiter: 200 }, daten);
    expect(o.volumenEffektiv.wert).toBe(200);
    expect(o.volumenEffektiv.herkunft).toBe('override');
    expect(o.hinweise.some((h) => h.code === 'speicher.ww.override.klein')).toBe(true);
  });
  it('Marktrundung: nächste Stufe aufwärts, über 2000 l in 500er-Schritten', () => {
    expect(aufMarktstufe(227.7, daten.speicherWarmwasser.marktrundungLiter, 500)).toBe(300);
    expect(aufMarktstufe(300, daten.speicherWarmwasser.marktrundungLiter, 500)).toBe(300);
    expect(aufMarktstufe(2100, daten.speicherWarmwasser.marktrundungLiter, 500)).toBe(2500);
    expect(aufMarktstufe(0, daten.speicherWarmwasser.marktrundungLiter, 500)).toBe(0);
  });
});

describe('Heizungspuffer = max(Hersteller-Minimum, Kriterium nach Quelle)', () => {
  it('Luft/Wasser 10 kW: 40 l/kW (Band 30–50) → 400 l; Hersteller-Minimum 140 l unterliegt, 500 l gewinnt', () => {
    const r = puffer({ quelle: 'luftWasser', qWpW: eingabe(10_000, 'W'), heizflaechen: 'fbh', einzelraumregelung: false, herstellerMinimumLiter: 140 }, daten);
    expect(r.massgebend).toBe('abtau');
    expect(r.volumen.wert).toBe(400);
    expect(r.volumenEffektiv.wert).toBe(400);
    expect(r.kriterien.find((k) => k.key === 'abtau')!.liter.band).toEqual([300, 500]);
    expect(r.begruendung).toContain('Abtau');
    const h = puffer({ quelle: 'luftWasser', qWpW: eingabe(10_000, 'W'), heizflaechen: 'fbh', einzelraumregelung: false, herstellerMinimumLiter: 500 }, daten);
    expect(h.massgebend).toBe('hersteller');
    expect(h.volumenEffektiv.wert).toBe(500);
    for (const w of [r.volumen, r.volumenEffektiv]) pruefeWert(w, 'Puffer');
  });
  it('Sole/Wasser: FBH ohne ERR → 0 (Weiche); Heizkörper mit ERR 10 kW → 200 l; Wasser/Wasser → 0', () => {
    expect(puffer({ quelle: 'soleWasser', qWpW: eingabe(10_000, 'W'), heizflaechen: 'fbh', einzelraumregelung: false }, daten).volumenEffektiv.wert).toBe(0);
    const hk = puffer({ quelle: 'soleWasser', qWpW: eingabe(10_000, 'W'), heizflaechen: 'heizkoerper', einzelraumregelung: true }, daten);
    expect(hk.volumen.wert).toBe(200);
    expect(hk.volumenEffektiv.wert).toBe(200);
    expect(puffer({ quelle: 'wasserWasser', heizflaechen: 'gemischt', einzelraumregelung: true }, daten).volumenEffektiv.wert).toBe(0);
  });
  it('Sperrzeit-Überbrückung nur auf Wunsch (Bezug Q_hl): Sole 50 l/kW × 8 kW = 400 l, mit Info-Hinweis', () => {
    const r = puffer({ quelle: 'soleWasser', qWpW: eingabe(10_000, 'W'), qhlW: eingabe(8_000, 'W'), heizflaechen: 'fbh', einzelraumregelung: false, sperrzeitUeberbrueckung: true, sperrzeitH: 4 }, daten);
    expect(r.massgebend).toBe('sperrzeit');
    expect(r.volumen.wert).toBe(400);
    expect(r.hinweise.some((h) => h.code === 'puffer.sperrzeit')).toBe(true);
    const ohne = puffer({ quelle: 'soleWasser', qWpW: eingabe(10_000, 'W'), qhlW: eingabe(8_000, 'W'), heizflaechen: 'fbh', einzelraumregelung: false, sperrzeitH: 4 }, daten);
    expect(ohne.volumen.wert).toBe(0);
  });
  it('Luft/Wasser ohne WP-Leistung: Warnung, Puffer noch 0', () => {
    const r = puffer({ quelle: 'luftWasser', heizflaechen: 'heizkoerper', einzelraumregelung: false }, daten);
    expect(r.hinweise.some((h) => h.code === 'puffer.qWp.fehlt')).toBe(true);
    expect(r.volumenEffektiv.wert).toBe(0);
  });
});

describe('MAG und Sicherheitsventil (DIN EN 12828, Wissensbasis K)', () => {
  it('Ausdehnungsfaktor-Tabelle B4 S.400: 45 °C 0.96 %, 55 °C 1.42 %, 75 °C 2.57 %; dazwischen linear; monoton', () => {
    expect(ausdehnungsfaktor(45, hyd).wert).toBeCloseTo(0.96, 6);
    expect(ausdehnungsfaktor(55, hyd).wert).toBeCloseTo(1.42, 6);
    expect(ausdehnungsfaktor(75, hyd).wert).toBeCloseTo(2.57, 6);
    expect(ausdehnungsfaktor(52.5, hyd).wert).toBeCloseTo(1.3, 6);
    erwarteNahe(ausdehnungsfaktor(35, hyd).wert, 0.6, 15, 'FBH 35 °C ≈ 0.6 %'); // extrapoliert (0.54)
    let letzter = 0;
    for (let t = 30; t <= 95; t += 5) {
      const n = ausdehnungsfaktor(t, hyd).wert;
      expect(n).toBeGreaterThan(letzter);
      letzter = n;
    }
  });
  it('Kontrollbeispiel Wissensbasis K §5: 8 kW gemischt + Puffer 200 + WW 300 → V_A 620 l, V_e 8.8, V_V 3.1, V_N 27.8 → 35 l', () => {
    const k = hyd.mag.kontrollbeispiel;
    const r = mag({ qhW: eingabe(k.qhlW, 'W'), heizflaechen: 'gemischt', pufferLiter: k.pufferLiter, wwSpeicherImHeizkreisLiter: k.wwSpeicherLiter, tVlMaxC: k.tVlMaxC }, hyd);
    expect(r.anlagenvolumen.wert).toBe(k.vaLiter);
    expect(r.ve.wert).toBeCloseTo(k.veLiter, 1);
    expect(r.vv.wert).toBeCloseTo(k.vvLiter, 1);
    expect(r.pe.wert).toBe(2.5);
    expect(r.vn.wert).toBeCloseTo(k.vnMinLiter, 1);
    expect(r.vnMarkt.wert).toBe(k.vnMarktLiter);
    expect(r.hinweise).toHaveLength(0);
    for (const w of [r.anlagenvolumen, r.n, r.ve, r.vv, r.p0, r.pe, r.vn, r.vnMarkt]) pruefeWert(w, 'MAG');
  });
  it('bekanntes Anlagenvolumen ist Eingabe; p_e ≤ p_0 → Fehler', () => {
    const r = mag({ anlagenvolumenLiter: 800, tVlMaxC: 75, p0Bar: 1.0, pSvBar: 3.0 }, hyd);
    expect(r.anlagenvolumen.herkunft).toBe('eingabe');
    expect(r.ve.wert).toBeCloseTo(20.56, 1); // B4 S.400 Ablesebeispiel 90 kW/Platten → 800 l, 75 °C → 20.6 l
    const f = mag({ anlagenvolumenLiter: 800, p0Bar: 3.0, pSvBar: 3.0 }, hyd);
    expect(f.hinweise.some((h) => h.code === 'mag.druck.ungueltig')).toBe(true);
  });
  it('Sicherheitsventil: 19 kW → DN15, 80 kW → DN20, 150 kW → DN25, 3.0 bar', () => {
    expect(sicherheitsventil(19_000, hyd)!.dn).toBe('DN15');
    expect(sicherheitsventil(80_000, hyd)!.dn).toBe('DN20');
    expect(sicherheitsventil(150_000, hyd)!.dn).toBe('DN25');
    expect(sicherheitsventil(19_000, hyd)!.ansprechdruckBar).toBe(3);
    expect(sicherheitsventil(0, hyd)).toBeNull();
  });
});
