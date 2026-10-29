import { describe, expect, it } from 'vitest';
import { ladeJson } from './meta.test';

type Station = { key: string; name: string; abk: string; kanton: string; hoeheM: number; thetaEC: number; thetaMin1hC: number; hgt2012Kd: number; atd12Kd: number; jahresmittelAltC: number | null };
type Klima = {
  stationen: Station[];
  zuordnung: { plz3: Record<string, string>; plz2: Record<string, string>; kanton: Record<string, string> };
  hoehenkorrektur: { schwelleDeltaHoeheM: number; gradientKPro100m: number; gradientSpanne: [number, number]; gradientMittelStationspaare: number; stationspaare: { kPro100m: number }[] };
};
type Sia = {
  methode: { luftWaermekapazitaetWhM3K: number; keinInfiltrationsterm: boolean; keinWiederaufheizzuschlag: boolean; gebaeudeHeizlastSaldiert: boolean };
  nMin: { lueftungskonzepte: { key: string; default?: boolean }[]; raumtypen: { key: string }[]; tabelle: Record<string, Record<string, { neubau: number; altbau: number }>>; zuordnungRaumtypZuNmin: Record<string, string | string[]> };
  bU: { tabelleND3: Record<string, Record<string, { dicht?: number; undicht?: number } | string>>; defaults: Record<string, number | string> };
  deltaUWb: { werte: { key: string; deltaU: number; default?: boolean }[] };
  rsiRse: { rsi: Record<string, number>; rseAussen: number; rseErdreich: number };
  erdreich: { uEquivBodenplatteZ0: { rfStufen: number[]; bStrichM: number[]; werte: Record<string, number[]> }; fThetaAnn: number };
  innentemperaturen: { raumtypen: { key: string; thetaIntC: number; beheizt: boolean }[] };
};

const k = ladeJson<Klima>('klimastationen.json');
const s = ladeJson<Sia>('sia384-2.json');

describe('klimastationen.json — SIA 2028 Tabelle 6 (40 Stationen)', () => {
  it('40 Stationen mit eindeutigen Keys/Abkürzungen; θe in [−18, −1], 1-h-Minimum unter θe, HGT 2400–7500', () => {
    expect(k.stationen).toHaveLength(40);
    expect(new Set(k.stationen.map((x) => x.key)).size).toBe(40);
    expect(new Set(k.stationen.map((x) => x.abk)).size).toBe(40);
    for (const x of k.stationen) {
      expect(x.thetaEC, x.key).toBeGreaterThanOrEqual(-18);
      expect(x.thetaEC, x.key).toBeLessThanOrEqual(-1);
      expect(x.thetaMin1hC, x.key).toBeLessThan(x.thetaEC);
      expect(x.hgt2012Kd, x.key).toBeGreaterThan(2400);
      expect(x.hgt2012Kd, x.key).toBeLessThan(7500);
      expect(x.hoeheM).toBeGreaterThan(150);
      expect(x.kanton).toMatch(/^[A-Z]{2}$/);
    }
  });
  it('Stichproben SIA 2028-C1: Zürich-Kloten −8 / 3432, Bern −7 / 3513, Davos −13 / 5689, Lugano −1 / 2438, Samedan −18', () => {
    const st = Object.fromEntries(k.stationen.map((x) => [x.key, x]));
    expect(st.zuerich_kloten).toEqual(expect.objectContaining({ thetaEC: -8, hgt2012Kd: 3432 }));
    expect(st.bern).toEqual(expect.objectContaining({ thetaEC: -7, hgt2012Kd: 3513 }));
    expect(st.davos).toEqual(expect.objectContaining({ thetaEC: -13, hgt2012Kd: 5689 }));
    expect(st.lugano).toEqual(expect.objectContaining({ thetaEC: -1, hgt2012Kd: 2438 }));
    expect(st.samedan!.thetaEC).toBe(-18);
    expect(st.adelboden!.thetaEC).toBe(-10); // Kanton BE ≠ Bern (FACH-23)
  });
  it('HGT steigt tendenziell mit der Höhe (Korrelation > 0.8), θe fällt mit der Höhe (Korrelation < −0.8)', () => {
    const corr = (a: number[], b: number[]) => {
      const ma = a.reduce((x, y) => x + y) / a.length, mb = b.reduce((x, y) => x + y) / b.length;
      const num = a.reduce((acc, _, i) => acc + (a[i]! - ma) * (b[i]! - mb), 0);
      const da = Math.sqrt(a.reduce((acc, x) => acc + (x - ma) ** 2, 0)), db = Math.sqrt(b.reduce((acc, x) => acc + (x - mb) ** 2, 0));
      return num / (da * db);
    };
    const h = k.stationen.map((x) => x.hoeheM);
    expect(corr(h, k.stationen.map((x) => x.hgt2012Kd))).toBeGreaterThan(0.8);
    expect(corr(h, k.stationen.map((x) => x.thetaEC))).toBeLessThan(-0.8);
  });
  it('Zuordnung: alle PLZ-Präfixe 10–99 abgedeckt, alle Ziele sind Stationen, Kantonsliste vollständig (26 + FL)', () => {
    const keys = new Set(k.stationen.map((x) => x.key));
    for (let p = 10; p <= 99; p++) {
      if ([58, 59, 78, 79].includes(p)) continue; // nicht vergebene Präfixe
      expect(k.zuordnung.plz2[String(p)], `PLZ ${p}`).toBeDefined();
    }
    for (const v of [...Object.values(k.zuordnung.plz2), ...Object.values(k.zuordnung.plz3), ...Object.values(k.zuordnung.kanton)]) expect(keys).toContain(v);
    expect(Object.keys(k.zuordnung.kanton)).toHaveLength(27);
    expect(k.zuordnung.plz2['30']).toBe('bern');
    expect(k.zuordnung.plz3['371']).toBe('adelboden');
    expect(k.zuordnung.kanton.GR).toBe('chur');
  });
  it('Höhenkorrektur: Schwelle 200 m, Gradient 0.6 K/100 m innerhalb der Spanne der Stationspaare (0.4–0.9)', () => {
    expect(k.hoehenkorrektur.schwelleDeltaHoeheM).toBe(200);
    expect(k.hoehenkorrektur.gradientKPro100m).toBe(0.6);
    expect(k.hoehenkorrektur.gradientKPro100m).toBeGreaterThanOrEqual(k.hoehenkorrektur.gradientSpanne[0]);
    expect(k.hoehenkorrektur.gradientKPro100m).toBeLessThanOrEqual(k.hoehenkorrektur.gradientSpanne[1]);
    expect(Math.abs(k.hoehenkorrektur.gradientMittelStationspaare - 0.6)).toBeLessThan(0.15);
    for (const p of k.hoehenkorrektur.stationspaare) expect(p.kPro100m).toBeGreaterThan(0);
  });
});

describe('sia384-2.json — Methode, n_min (NA.7), b_u (ND.3), ΔU_WB, Rsi/Rse, Erdreich, θint', () => {
  it('Methodenregeln SIA 384/2: 0.34 Wh/(m³K), kein n50, kein Aufheizzuschlag, saldiert', () => {
    expect(s.methode.luftWaermekapazitaetWhM3K).toBe(0.34);
    expect(s.methode.keinInfiltrationsterm).toBe(true);
    expect(s.methode.keinWiederaufheizzuschlag).toBe(true);
    expect(s.methode.gebaeudeHeizlastSaldiert).toBe(true);
  });
  it('n_min Tabelle NA.7: natürlich Bad 0.50/0.70, weitere 0.30/0.50; WRG Zuluft 0.20/0.40; Altbau = Neubau + 0.2 ausser 0; genau ein Default-Konzept', () => {
    const t = s.nMin.tabelle;
    expect(t.natuerlich!.badDusche).toEqual({ neubau: 0.5, altbau: 0.7 });
    expect(t.natuerlich!.weitere).toEqual({ neubau: 0.3, altbau: 0.5 });
    expect(t.wrg!.mitZuluft).toEqual({ neubau: 0.2, altbau: 0.4 });
    expect(t.abluftDauer!.weitere).toEqual({ neubau: 0.5, altbau: 0.7 });
    for (const konzept of Object.values(t)) for (const r of Object.values(konzept)) {
      if (r.neubau === 0) expect(r.altbau).toBe(0);
      else expect(r.altbau).toBeCloseTo(r.neubau + 0.2, 5);
      expect(r.neubau).toBeLessThanOrEqual(0.5);
    }
    expect(s.nMin.lueftungskonzepte.filter((x) => x.default)).toHaveLength(1);
    const konzepte = s.nMin.lueftungskonzepte.map((x) => x.key);
    for (const key of Object.keys(t)) expect(konzepte).toContain(key);
    const raumtypen = s.nMin.raumtypen.map((x) => x.key);
    for (const konzept of Object.values(t)) for (const key of Object.keys(konzept)) expect(raumtypen).toContain(key);
    for (const [kk, v] of Object.entries(s.nMin.zuordnungRaumtypZuNmin)) if (!['beschreibung', 'quelle'].includes(kk)) expect(raumtypen).toContain(v);
  });
  it('b_u Tabelle ND.3: Werte in (0, 1), undicht > dicht, mehr Flächen → kleiner; Defaults Keller 0.5, Estrich 0.9', () => {
    for (const lage of ['seitlich', 'keller', 'estrich']) {
      const z = s.bU.tabelleND3[lage]!;
      const stufen = ['eineFlaeche', 'zweiFlaechen', 'mehrFlaechen'].filter((x) => typeof z[x] === 'object');
      let vorher = 1;
      for (const st of stufen) {
        const w = z[st] as { dicht: number; undicht: number };
        expect(w.dicht).toBeGreaterThan(0);
        expect(w.undicht).toBeLessThan(1);
        expect(w.undicht).toBeGreaterThan(w.dicht);
        expect(w.dicht).toBeLessThanOrEqual(vorher);
        vorher = w.dicht;
      }
    }
    expect((s.bU.tabelleND3.keller!.mehrFlaechen as { dicht: number }).dicht).toBe(0.3);
    expect(s.bU.defaults.kellerUnbeheizt).toBe(0.5);
    expect(s.bU.defaults.dachraumUnbeheizt).toBe(0.9);
    expect(s.bU.defaults.aussenluft).toBe(1.0);
  });
  it('ΔU_WB: 0.10 Bestand (Default), 0.05 Neubau; Rsi 0.10/0.13/0.17, Rse 0.04, Erdreich 0', () => {
    expect(s.deltaUWb.werte.find((w) => w.default)!.deltaU).toBe(0.1);
    expect(s.deltaUWb.werte.find((w) => w.key === 'neubau')!.deltaU).toBe(0.05);
    expect(s.rsiRse.rsi).toEqual({ aufwaerts: 0.1, horizontal: 0.13, abwaerts: 0.17 });
    expect(s.rsiRse.rseAussen).toBe(0.04);
    expect(s.rsiRse.rseErdreich).toBe(0);
  });
  it('U_equiv Bodenplatte: fällt mit B′ und mit Dämmung; B′ 4 ungedämmt 0.88; f_θann 1.45', () => {
    const u = s.erdreich.uEquivBodenplatteZ0;
    expect(u.rfStufen).toEqual([0, 0.5, 1.0, 2.0]);
    for (const b of u.bStrichM) {
      const zeile = u.werte[String(b)]!;
      expect(zeile).toHaveLength(4);
      for (let i = 1; i < 4; i++) expect(zeile[i]!, `B' ${b}`).toBeLessThan(zeile[i - 1]!);
    }
    for (let j = 0; j < 4; j++) for (let i = 1; i < u.bStrichM.length; i++) expect(u.werte[String(u.bStrichM[i])]![j]!).toBeLessThan(u.werte[String(u.bStrichM[i - 1])]![j]!);
    expect(u.werte['4']![0]).toBe(0.88);
    expect(s.erdreich.fThetaAnn).toBe(1.45);
  });
  it('Innentemperaturen: Wohnen 20, Bad 24, Flur 15, unbeheizte Räume ≤ 10 °C; Keys eindeutig und von nMin-Zuordnung referenzierbar', () => {
    const t = Object.fromEntries(s.innentemperaturen.raumtypen.map((r) => [r.key, r]));
    expect(t.wohnen!.thetaIntC).toBe(20);
    expect(t.bad!.thetaIntC).toBe(24);
    expect(t.flur!.thetaIntC).toBe(15);
    for (const r of s.innentemperaturen.raumtypen) {
      if (!r.beheizt) expect(r.thetaIntC, r.key).toBeLessThanOrEqual(10);
      else expect(r.thetaIntC, r.key).toBeGreaterThanOrEqual(15);
    }
    expect(new Set(Object.keys(t)).size).toBe(s.innentemperaturen.raumtypen.length);
    for (const key of Object.keys(s.nMin.zuordnungRaumtypZuNmin)) if (!['beschreibung', 'quelle'].includes(key)) expect(t[key], key).toBeDefined();
  });
});
