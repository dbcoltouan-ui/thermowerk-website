import { describe, expect, it } from 'vitest';
import { ladeJson } from './meta.test';

type Schicht = { material?: string; daemmstoff?: string; dickeM: number; rolle: string };
type Epoche = { bauweise: string; schichten: Schicht[]; uSpanne: { min: number; max: number }; uDefaultBerechnet: number; unsicherheitProzent: number; begruendung: string; quelle: string[] };
type Bauteil = { label: string; richtung: 'horizontal' | 'aufwaerts' | 'abwaerts'; grenze: 'aussen' | 'erdreich' | 'hinterlueftet' | 'unbeheizt'; epochen: Record<string, Epoche> };
type Huelle = {
  _meta: { konventionen: { rsi: Record<string, number>; rseAussen: number } };
  epochen: { key: string; von: number | null; bis: number | null }[];
  materialien: Record<string, { lambda: number | null; rHorizontal?: number; rAufwaerts?: number; rAbwaerts?: number; abgeleitet?: boolean }>;
  daemmstoffe: Record<string, { lambda: number; spanne: [number, number] }>;
  bauweisen: Record<string, Record<string, { label: string; epochenTypisch: string[]; traglschicht?: string; uPauschal?: number }>>;
  bauteile: Record<string, Bauteil>;
  fenster: { ufSpalten: number[]; generationen: { key: string; ug: number; uwJeUf: number[] }[]; epochen: Record<string, { generation: string; uwDefault: number; uSpanne: { min: number; max: number } }>; rahmen: Record<string, { uf: number; spalte: number }> };
  tueren: { typen: { key: string; u: number }[]; epochen: Record<string, { typ: string; spanne: [number, number] }> };
  sia380_1Grenzwerte: { ausgaben: { gueltigAb: number; fenster: number }[] };
};

const h = ladeJson<Huelle>('huelle-epochen.json');
const EPOCHEN = h.epochen.map((e) => e.key);
const BAUTEILE = ['aussenwand', 'dachSteil', 'dachFlach', 'deckeEstrich', 'bodenKeller', 'bodenErdreich'];

/** ISO 6946 Reihenschaltung (Test-Nachrechnung, kein Kern-Code). */
function uWert(bt: Bauteil): Record<string, number> {
  const rsi = h._meta.konventionen.rsi[bt.richtung]!;
  const rse = bt.grenze === 'aussen' ? h._meta.konventionen.rseAussen : bt.grenze === 'erdreich' ? 0 : rsi;
  const out: Record<string, number> = {};
  for (const [k, e] of Object.entries(bt.epochen)) {
    let r = rsi + rse;
    for (const s of e.schichten) {
      if (s.material === 'luftschicht_ruhend') {
        const m = h.materialien.luftschicht_ruhend!;
        r += bt.richtung === 'horizontal' ? m.rHorizontal! : bt.richtung === 'aufwaerts' ? m.rAufwaerts! : m.rAbwaerts!;
      } else if (s.daemmstoff) r += s.dickeM / h.daemmstoffe[s.daemmstoff]!.lambda;
      else r += s.dickeM / h.materialien[s.material!]!.lambda!;
    }
    out[k] = Math.round(100 / r) / 100;
  }
  return out;
}

describe('huelle-epochen.json — Struktur', () => {
  it('7 Epochen lückenlos (vor 1919 … ab 2011)', () => {
    expect(EPOCHEN).toEqual(['vor1919', '1919_1945', '1946_1960', '1961_1977', '1978_1994', '1995_2010', 'ab2011']);
    for (let i = 1; i < h.epochen.length; i++) expect(h.epochen[i]!.von).toBe((h.epochen[i - 1]!.bis ?? 0) + 1);
  });
  it('alle sechs Bauteile haben je Epoche einen Default-Aufbau mit bekannter Bauweise, Materialien/Dämmstoffen und Spanne', () => {
    for (const b of BAUTEILE) {
      const bt = h.bauteile[b]!;
      expect(bt, b).toBeDefined();
      for (const k of EPOCHEN) {
        const e = bt.epochen[k]!;
        expect(e, `${b}/${k}`).toBeDefined();
        expect(Object.keys(h.bauweisen[b]!), `${b}/${k} Bauweise`).toContain(e.bauweise);
        expect(e.schichten.length).toBeGreaterThan(0);
        for (const s of e.schichten) {
          if (s.daemmstoff) expect(h.daemmstoffe[s.daemmstoff], `${b}/${k} Dämmstoff ${s.daemmstoff}`).toBeDefined();
          else expect(h.materialien[s.material!], `${b}/${k} Material ${s.material}`).toBeDefined();
          expect(s.dickeM).toBeGreaterThan(0);
          expect(s.dickeM).toBeLessThan(1);
        }
        expect(e.uSpanne.min).toBeLessThan(e.uSpanne.max);
        expect(e.begruendung.length).toBeGreaterThan(10);
        expect(e.quelle.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('huelle-epochen.json — Plausibilität (DATA-02, FACH-20/21)', () => {
  it('Nachrechnung ISO 6946 reproduziert uDefaultBerechnet, und der Wert liegt in der Spanne', () => {
    for (const b of BAUTEILE) {
      const u = uWert(h.bauteile[b]!);
      for (const k of EPOCHEN) {
        const e = h.bauteile[b]!.epochen[k]!;
        expect(u[k], `${b}/${k}`).toBeCloseTo(e.uDefaultBerechnet, 1);
        expect(e.uDefaultBerechnet, `${b}/${k}`).toBeGreaterThanOrEqual(e.uSpanne.min);
        expect(e.uDefaultBerechnet, `${b}/${k}`).toBeLessThanOrEqual(e.uSpanne.max);
      }
    }
  });
  it('U-Spannen (min und max) fallen über die Epochen monoton', () => {
    for (const b of BAUTEILE) {
      for (let i = 1; i < EPOCHEN.length; i++) {
        const a = h.bauteile[b]!.epochen[EPOCHEN[i - 1]!]!.uSpanne;
        const c = h.bauteile[b]!.epochen[EPOCHEN[i]!]!.uSpanne;
        expect(c.max, `${b}/${EPOCHEN[i]} max`).toBeLessThanOrEqual(a.max);
        expect(c.min, `${b}/${EPOCHEN[i]} min`).toBeLessThanOrEqual(a.min);
      }
    }
  });
  it('ab 1978 enthält jeder Default-Aufbau eine Dämmschicht, davor keine (Bestand, nicht Sanierung)', () => {
    for (const b of BAUTEILE) {
      for (const k of EPOCHEN) {
        const hatDaemmung = h.bauteile[b]!.epochen[k]!.schichten.some((s) => s.daemmstoff);
        if (['1978_1994', '1995_2010', 'ab2011'].includes(k)) expect(hatDaemmung, `${b}/${k}`).toBe(true);
        if (['vor1919', '1919_1945', '1946_1960'].includes(k)) expect(hatDaemmung, `${b}/${k}`).toBe(false);
      }
    }
  });
  it('Kalibrierung gegen belegte Stichproben: AW 30 cm Backstein ≈ 1.1–1.3, Kellerdecke Beton ≈ 2.1–2.4, Steildach ungedämmt 1.2–4.0', () => {
    expect(h.bauteile.aussenwand!.epochen['1919_1945']!.uDefaultBerechnet).toBeGreaterThanOrEqual(1.1);
    expect(h.bauteile.aussenwand!.epochen['1919_1945']!.uDefaultBerechnet).toBeLessThanOrEqual(1.4);
    expect(h.bauteile.bodenKeller!.epochen['1946_1960']!.uDefaultBerechnet).toBeGreaterThanOrEqual(2.0);
    expect(h.bauteile.bodenKeller!.epochen['1946_1960']!.uDefaultBerechnet).toBeLessThanOrEqual(2.4);
    expect(h.bauteile.aussenwand!.epochen['ab2011']!.uDefaultBerechnet).toBeLessThanOrEqual(0.25);
  });
  it('Monotonie Dämmung: mehr Dämmdicke im Default-Aufbau ⇒ kleineres U (Nachrechnung mit 2 cm mehr)', () => {
    for (const b of BAUTEILE) {
      const bt = h.bauteile[b]!;
      for (const k of ['1978_1994', '1995_2010', 'ab2011']) {
        const e = bt.epochen[k]!;
        const dicker: Bauteil = { ...bt, epochen: { x: { ...e, schichten: e.schichten.map((s) => (s.daemmstoff ? { ...s, dickeM: s.dickeM + 0.02 } : s)) } } };
        expect(uWert(dicker).x!, `${b}/${k}`).toBeLessThan(e.uDefaultBerechnet);
      }
    }
  });
});

describe('huelle-epochen.json — λ, Fenster, Türen, SIA 380/1', () => {
  it('λ-Werte in plausiblen Bereichen (Baustoffe 0.07–3.5, Dämmstoffe 0.02–0.11)', () => {
    for (const [k, m] of Object.entries(h.materialien)) {
      if (m.lambda === null) continue;
      expect(m.lambda, k).toBeGreaterThanOrEqual(0.07);
      expect(m.lambda, k).toBeLessThanOrEqual(3.5);
    }
    for (const [k, d] of Object.entries(h.daemmstoffe)) {
      expect(d.lambda, k).toBeGreaterThanOrEqual(0.02);
      expect(d.lambda, k).toBeLessThanOrEqual(0.11);
      expect(d.lambda, k).toBeGreaterThanOrEqual(d.spanne[0] - 1e-9);
      expect(d.lambda, k).toBeLessThanOrEqual(Math.max(d.spanne[1], d.lambda));
    }
    expect(h.materialien.vollbackstein!.lambda).toBe(0.8);
    expect(h.materialien.beton!.lambda).toBe(2.3);
    expect(h.daemmstoffe.pur_pir!.lambda).toBe(0.025);
  });
  it('Fenster: Uw steigt mit Uf-Spalte, fällt über die Generationen; EnFK-Stichprobe 2-IV Luft Holz 2.7, 3-IV-IR-IR Holz 1.1', () => {
    expect(h.fenster.ufSpalten).toEqual([1.4, 1.9, 2.5, 3.3]);
    const gens = h.fenster.generationen;
    for (const g of gens) {
      expect(g.uwJeUf).toHaveLength(4);
      for (let i = 1; i < 4; i++) expect(g.uwJeUf[i], g.key).toBeGreaterThanOrEqual(g.uwJeUf[i - 1]!);
      expect(g.uwJeUf[0]).toBeGreaterThan(g.ug * 0.7);
    }
    expect(gens[0]!.ug).toBeGreaterThanOrEqual(5);
    expect(gens[gens.length - 1]!.ug).toBeLessThanOrEqual(0.8);
    expect(gens.find((g) => g.key === 'iv2_luft')!.uwJeUf).toEqual([2.7, 2.8, 3.0, 3.5]);
    expect(gens.find((g) => g.key === 'iv3_ir_ir')!.uwJeUf[0]).toBe(1.1);
    for (const k of EPOCHEN) {
      const e = h.fenster.epochen[k]!;
      expect(gens.map((g) => g.key)).toContain(e.generation);
      expect(e.uwDefault).toBeGreaterThanOrEqual(e.uSpanne.min);
      expect(e.uwDefault).toBeLessThanOrEqual(e.uSpanne.max);
    }
    for (let i = 1; i < EPOCHEN.length; i++) expect(h.fenster.epochen[EPOCHEN[i]!]!.uwDefault).toBeLessThanOrEqual(h.fenster.epochen[EPOCHEN[i - 1]!]!.uwDefault);
  });
  it('Türen: Epochen-Default existiert und liegt in der Spanne', () => {
    for (const k of EPOCHEN) {
      const e = h.tueren.epochen[k]!;
      const t = h.tueren.typen.find((x) => x.key === e.typ)!;
      expect(t, k).toBeDefined();
      expect(t.u).toBeGreaterThanOrEqual(e.spanne[0]);
      expect(t.u).toBeLessThanOrEqual(e.spanne[1]);
    }
  });
  it('SIA 380/1 Fenster-Grenzwerte fallen über die Ausgaben: 2.2 → 1.7 → 1.5 → 1.3 → 1.0', () => {
    expect(h.sia380_1Grenzwerte.ausgaben.map((a) => a.fenster)).toEqual([2.2, 1.7, 1.5, 1.3, 1.0]);
  });
});
