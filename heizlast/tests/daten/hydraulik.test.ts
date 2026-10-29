import { describe, expect, it } from 'vitest';
import { ladeJson } from './meta.test';
import type { HydraulikDaten } from '../../src/daten/fws';
import { fwsDaten, hydraulikDaten } from '../../src/daten/fws';

const h = ladeJson<HydraulikDaten>('hydraulik.json');

describe('hydraulik.json — MAG / Sicherheitsventil (Wissensbasis K, DIN EN 12828)', () => {
  it('Ausdehnungsfaktor 40–95 °C streng monoton steigend, 55 °C = 1.42 %, 75 °C = 2.57 % (B4 S.400)', () => {
    const sp = h.mag.ausdehnungsfaktor.stuetzpunkte;
    expect(sp[0]!.tVlMaxC).toBe(40);
    expect(sp[sp.length - 1]!.tVlMaxC).toBe(95);
    for (let i = 1; i < sp.length; i++) {
      expect(sp[i]!.tVlMaxC).toBeGreaterThan(sp[i - 1]!.tVlMaxC);
      expect(sp[i]!.nProzent).toBeGreaterThan(sp[i - 1]!.nProzent);
    }
    expect(sp.find((s) => s.tVlMaxC === 55)!.nProzent).toBe(1.42);
    expect(sp.find((s) => s.tVlMaxC === 75)!.nProzent).toBe(2.57);
  });
  it('Anlageninhalt je Heizflächenart: Konvektoren 7 < Platten 9 < Radiatoren 15 ≤ gemischt 15 < FBH 20 l/kW', () => {
    const w = h.mag.anlageninhaltLiterProKw.werte;
    expect(w.konvektoren).toBeLessThan(w.plattenheizkoerper!);
    expect(w.plattenheizkoerper).toBeLessThan(w.radiatoren!);
    expect(w.radiatoren).toBeLessThanOrEqual(w.gemischt!);
    expect(w.gemischt).toBeLessThan(w.fbh!);
  });
  it('Kontrollbeispiel ist mit den Formeln der Datei reproduzierbar (V_A 620 → V_N 27.8 l)', () => {
    const k = h.mag.kontrollbeispiel;
    const va = (k.qhlW / 1000) * h.mag.anlageninhaltLiterProKw.werte.gemischt! + k.pufferLiter + k.wwSpeicherLiter;
    expect(va).toBe(k.vaLiter);
    const n = h.mag.ausdehnungsfaktor.stuetzpunkte.find((s) => s.tVlMaxC === k.tVlMaxC)!.nProzent;
    const ve = (n * va) / 100;
    const vv = Math.max(h.mag.wasservorlage.minimumLiter, h.mag.wasservorlage.anteil * va);
    const pe = h.mag.druckDefaults.pSvBar - h.mag.druckDefaults.peAbstandZuSvBar;
    const vn = ((ve + vv) * (pe + 1)) / (pe - h.mag.druckDefaults.p0Bar);
    expect(ve).toBeCloseTo(k.veLiter, 1);
    expect(vv).toBeCloseTo(k.vvLiter, 1);
    expect(vn).toBeCloseTo(k.vnMinLiter, 1);
  });
  it('Sicherheitsventil-Stufen aufsteigend (50/100/200/350/600 kW → DN15…DN40); MAG-Reihe aufsteigend', () => {
    const st = h.sicherheitsventil.stufen;
    expect(st.map((s) => s.bisKw)).toEqual([50, 100, 200, 350, 600]);
    expect(st.map((s) => s.dn)).toEqual(['DN15', 'DN20', 'DN25', 'DN32', 'DN40']);
    const r = h.mag.nennvolumenReiheLiter.werte;
    for (let i = 1; i < r.length; i++) expect(r[i]!).toBeGreaterThan(r[i - 1]!);
  });
  it('Loader liefert dieselben Daten wie die Datei (Schema per tsc geprüft)', () => {
    expect(hydraulikDaten()._meta.version).toBe(h._meta.version);
    expect(fwsDaten().verbrauch.streuung.gelbAbProzent).toBeLessThan(fwsDaten().verbrauch.streuung.rotAbProzent);
    expect(fwsDaten().plausibilitaet.bandToleranzProzent).toBe(15);
    expect(fwsDaten().klimabereinigung.defaultAktiv).toBe(false);
    const p = fwsDaten().puffer.marktrundungLiter;
    for (let i = 1; i < p.length; i++) expect(p[i]!).toBeGreaterThan(p[i - 1]!);
  });
});
