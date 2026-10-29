import { describe, expect, it } from 'vitest';
import { ladeJson } from './meta.test';

type Hk = {
  _meta: { referenzbedingung: { dTlog: number } };
  bauarten: { key: string; kategorie: string; n: number }[];
  exponenten: { werte: Record<string, number>; bereichGueltig: [number, number] };
  umrechnung: { tabelle: { tVL: number; tRL: number; dTlog: number; f: Record<string, number> }[]; faktor9070Zu7565: { n1_3: number } };
  platten: { hoehenMm: number[]; wProM7565: Record<string, Record<string, number>>; belege: Record<string, Record<string, Record<string, number>>>; anzahlBelegeJeWert: Record<string, Record<string, number>>; nMittelJeTyp: Record<string, number> };
  glieder: { guss: { werte: { bauhoeheMm: number; nabenabstandMm: number; tiefeMm: number; w7565: number; w7055: number; w5545: number }[] }; stahl: { werte: { nabenabstandMm: number; tiefeMm: number; w7565: number }[] } };
  roehren: { charleston: { wProElement7565: Record<string, Record<string, number>>; tiefeMmJeSaeulen: Record<string, number> }; wissensbasisTab35: { wProGlied7565und5545: Record<string, Record<string, [number, number]>> } };
  konvektoren: { lamellenpaket: { n: number; wProM7565und5545: Record<string, Record<string, [number, number]>> }; wandkonvektorVerkleidet: { werte: { hoeheMm: number; tiefeMm: number; wProM7565: number; n: number }[] } };
  bad: { kermiBasicD: { hoeheMm: number; breiteMm: number; n: number; w7565: number; w5545: number }[] };
  fbh: { verlegeabstandMm: number[]; rlbStufen: string[]; dThStufenK: number[]; qWm2: Record<string, Record<string, number[]>>; grenzwerte: { qMaxAufenthaltWm2: number; thetaFmaxAufenthaltC: number } };
  minderungen: { f4Baulaenge: { stufen: { bisMm: number; mProzent: number }[] }; f5Anschluss: { stufen: { spreizungK: number; wechselseitig: number; reitend: number }[] } };
  modelle: { id: string; bauart: string; quelle: string[]; abgeleitet: boolean; wProM7565?: number; hoeheMm?: number; hersteller: string }[];
};

const hk = ladeJson<Hk>('heizkoerper-tabellen.json');
const dtlog = (tv: number, tr: number, ti: number) => (tv - tr) / Math.log((tv - ti) / (tr - ti));
const DTN = dtlog(75, 65, 20);

describe('heizkoerper-tabellen.json — Exponenten und Umrechnung', () => {
  it('eine Exponententabelle, alle n in [1.0, 1.45]; Konvektor passiv 1.40, Gebläse 1.10, FBH 1.10, Platten 1.29–1.33', () => {
    for (const b of hk.bauarten) {
      expect(b.n, b.key).toBeGreaterThanOrEqual(1.0);
      expect(b.n, b.key).toBeLessThanOrEqual(1.45);
      expect(hk.exponenten.werte[b.key]).toBe(b.n);
    }
    expect(hk.exponenten.werte.konvektor_passiv).toBe(1.4);
    expect(hk.exponenten.werte.konvektor_geblaese).toBe(1.1);
    expect(hk.exponenten.werte.fbh).toBe(1.1);
    for (const t of ['10', '11', '20', '21', '22', '30', '33']) {
      expect(hk.exponenten.werte[`platte_${t}`]).toBeGreaterThanOrEqual(1.29);
      expect(hk.exponenten.werte[`platte_${t}`]).toBeLessThanOrEqual(1.33);
    }
  });
  it('Referenz Δθ_log 75/65/20 = 49.83 K; 90/70 → 75/65 = 0.795 (nicht 0.67, HK-08); 55/45 n 1.3 → 0.52 (Wissensbasis E Tab. 3.2); 45/35 n 1.4 → 0.27', () => {
    expect(hk._meta.referenzbedingung.dTlog).toBeCloseTo(49.83, 2);
    expect(hk.umrechnung.faktor9070Zu7565.n1_3).toBeCloseTo(0.795, 3);
    const z5545 = hk.umrechnung.tabelle.find((z) => z.tVL === 55 && z.tRL === 45)!;
    expect(z5545.f['1.3']).toBeCloseTo(0.51, 1);
    expect(Math.round(z5545.f['1.3']! * 100) / 100).toBeGreaterThanOrEqual(0.5);
    const z4535 = hk.umrechnung.tabelle.find((z) => z.tVL === 45 && z.tRL === 35)!;
    expect(z4535.f['1.4']).toBeCloseTo(0.27, 2);
    expect(z4535.f['1.1']).toBeGreaterThan(z4535.f['1.4']!);
  });
});

describe('heizkoerper-tabellen.json — Plattenheizkörper (Mittel aus ≥ 3 Datenblättern)', () => {
  const typen = ['10', '11', '20', '21', '22', '30', '33'];
  it('alle Typen × Höhen 300–900 vorhanden; W/m steigt mit der Höhe, W/m² Front fällt mit der Höhe (HK-06)', () => {
    for (const t of typen) {
      const h = hk.platten.wProM7565[t]!;
      expect(h, t).toBeDefined();
      let vorher = 0;
      let vorherFront = Infinity;
      for (const hh of hk.platten.hoehenMm) {
        const w = h[String(hh)]!;
        expect(w, `${t}/${hh}`).toBeGreaterThan(vorher);
        const front = (w / hh) * 1000;
        expect(front, `${t}/${hh} W/m² Front`).toBeLessThan(vorherFront);
        vorher = w;
        vorherFront = front;
      }
    }
  });
  it('Typ-Reihenfolge je Höhe: 10 < 11 < 20 < 21 < 22 < 33 und 10 < 20 < 30 < 33 (Typ 30 ohne Konvektorbleche liegt unter Typ 22)', () => {
    for (const hh of hk.platten.hoehenMm) {
      const w = (t: string) => hk.platten.wProM7565[t]![String(hh)]!;
      expect(w('10')).toBeLessThan(w('11'));
      expect(w('11')).toBeLessThan(w('20'));
      expect(w('20')).toBeLessThan(w('21'));
      expect(w('21')).toBeLessThan(w('22'));
      expect(w('22')).toBeLessThan(w('33'));
      expect(w('20')).toBeLessThan(w('30'));
      expect(w('30')).toBeLessThan(w('33'));
      expect(w('30')).toBeLessThan(w('22'));
    }
  });
  it('Mittelwert = arithmetisches Mittel der Belege; Höhen 300–600/900 mit ≥ 3 Herstellern', () => {
    for (const t of typen) {
      for (const hh of hk.platten.hoehenMm) {
        const belege = Object.values(hk.platten.belege[t]![String(hh)]!);
        const mittel = belege.reduce((a, b) => a + b, 0) / belege.length;
        expect(Math.abs(mittel - hk.platten.wProM7565[t]![String(hh)]!), `${t}/${hh}`).toBeLessThanOrEqual(1);
        if (hh !== 750) expect(belege.length, `${t}/${hh}`).toBeGreaterThanOrEqual(3);
        // Streuung der Hersteller < ±15 % um den Mittelwert
        for (const b of belege) expect(Math.abs(b / mittel - 1), `${t}/${hh}`).toBeLessThan(0.15);
      }
    }
  });
  it('Befund B1: Typ 22 600×1000 @55/45/20 ≈ 842–873 W (Purmo/Kermi/Wissensbasis)', () => {
    const qN = hk.platten.wProM7565['22']!['600']!; // 1 m
    const n = hk.exponenten.werte.platte_22!;
    const q = qN * Math.pow(dtlog(55, 45, 20) / DTN, n);
    expect(q).toBeGreaterThanOrEqual(840);
    expect(q).toBeLessThanOrEqual(875);
  });
  it('Befund B3: Raum 1200 W, Typ 21 600×800 → θ_VL,req ≈ 81 °C; Typ 22 → ≈ 72; Typ 33 → ≈ 61 (Spreizung 10 K, Bisektion)', () => {
    const vlReq = (typ: string) => {
      const qN = (hk.platten.wProM7565[typ]!['600']! * 800) / 1000;
      const n = hk.exponenten.werte[`platte_${typ}`]!;
      let lo = 25, hi = 95;
      for (let i = 0; i < 60; i++) {
        const m = (lo + hi) / 2;
        const q = qN * Math.pow(dtlog(m, m - 10, 20) / DTN, n);
        if (q < 1200) lo = m; else hi = m;
      }
      return (lo + hi) / 2;
    };
    expect(vlReq('21')).toBeGreaterThan(78);
    expect(vlReq('21')).toBeLessThan(84);
    expect(vlReq('22')).toBeGreaterThan(69);
    expect(vlReq('22')).toBeLessThan(75);
    expect(vlReq('33')).toBeGreaterThan(58);
    expect(vlReq('33')).toBeLessThan(64);
  });
});

describe('heizkoerper-tabellen.json — Glieder, Röhren, Konvektoren, Bad, FBH', () => {
  it('Guss DIN 4703: W/Glied steigt mit Tiefe und Nabenabstand; 70/55 und 55/45 konsistent mit n ≈ 1.3 (±5 %); Befund B2: 10 Glieder 600/160 @70/55 ≈ 600–900 W', () => {
    const g = hk.glieder.guss.werte;
    for (const z of g) {
      const f7055 = Math.pow(dtlog(70, 55, 20) / DTN, 1.3);
      const f5545 = Math.pow(dtlog(55, 45, 20) / DTN, 1.3);
      expect(Math.abs(z.w7055 / (z.w7565 * f7055) - 1), `${z.nabenabstandMm}/${z.tiefeMm}`).toBeLessThan(0.05);
      expect(Math.abs(z.w5545 / (z.w7565 * f5545) - 1), `${z.nabenabstandMm}/${z.tiefeMm}`).toBeLessThan(0.06);
    }
    for (const na of [350, 500, 900]) {
      const zeilen = g.filter((z) => z.nabenabstandMm === na).sort((a, b) => a.tiefeMm - b.tiefeMm);
      for (let i = 1; i < zeilen.length; i++) expect(zeilen[i]!.w7565).toBeGreaterThan(zeilen[i - 1]!.w7565);
    }
    const b2 = g.find((z) => z.nabenabstandMm === 600 && z.tiefeMm === 160)!;
    expect(10 * b2.w7055).toBeGreaterThanOrEqual(600);
    expect(10 * b2.w7055).toBeLessThanOrEqual(900);
  });
  it('Röhren: Charleston 3-Säuler H600 ≈ 60 W/Element (Wissensbasis E Tab. 3.5: 60 W/Glied); Leistung steigt mit Säulen und Höhe', () => {
    const c = hk.roehren.charleston.wProElement7565;
    expect(c['600']!['3']).toBeCloseTo(60, -0.5); // 60.9 vs. 60 (+1.5 %)
    expect(Math.abs(c['600']!['3']! / 60 - 1)).toBeLessThan(0.03);
    expect(hk.roehren.wissensbasisTab35.wProGlied7565und5545['600']!['3']![0]).toBe(60);
    for (const h of Object.keys(c)) {
      const s = c[h]!;
      const keys = Object.keys(s).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < keys.length; i++) expect(s[String(keys[i])]!).toBeGreaterThan(s[String(keys[i - 1])]!);
    }
    const hoehen = Object.keys(c).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < hoehen.length; i++) {
      const a = c[String(hoehen[i - 1])]!['3'];
      const b = c[String(hoehen[i])]!['3'];
      if (a !== undefined && b !== undefined) expect(b).toBeGreaterThan(a);
    }
    // Charleston vs. Wissensbasis Tab. 3.5 (Tiefen ähnlich): Abweichung je Säulenzahl bei H600 < 8 %
    for (const s of ['2', '3', '4', '5', '6']) expect(Math.abs(c['600']![s]! / hk.roehren.wissensbasisTab35.wProGlied7565und5545['600']![s]![0] - 1), s).toBeLessThan(0.08);
  });
  it('Konvektoren: JOCO n 1.41, 55/45-Werte entsprechen n 1.4 (±5 %); W/m steigt mit Höhe und Tiefe', () => {
    expect(hk.konvektoren.lamellenpaket.n).toBeGreaterThanOrEqual(1.4);
    const f = Math.pow(dtlog(55, 45, 20) / DTN, 1.41);
    const t = hk.konvektoren.lamellenpaket.wProM7565und5545;
    for (const h of Object.keys(t)) for (const d of Object.keys(t[h]!)) {
      const [w75, w55] = t[h]![d]!;
      expect(Math.abs(w55 / (w75 * f) - 1), `${h}/${d}`).toBeLessThan(0.05);
    }
    const h60 = t['60']!;
    const tiefen = Object.keys(h60).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < tiefen.length; i++) expect(h60[String(tiefen[i])]![0]).toBeGreaterThan(h60[String(tiefen[i - 1])]![0]);
    expect(t['120']!['120']![0]).toBeGreaterThan(t['60']!['120']![0]);
  });
  it('Bad: Kermi Basic-D n 1.19–1.24, W steigt mit Höhe und Breite', () => {
    for (const z of hk.bad.kermiBasicD) {
      expect(z.n).toBeGreaterThan(1.19);
      expect(z.n).toBeLessThan(1.24);
      const f = Math.pow(dtlog(55, 45, 20) / DTN, z.n);
      expect(Math.abs(z.w5545 / (z.w7565 * f) - 1)).toBeLessThan(0.03);
    }
    const z804 = hk.bad.kermiBasicD.filter((z) => z.hoeheMm === 804).sort((a, b) => a.breiteMm - b.breiteMm);
    for (let i = 1; i < z804.length; i++) expect(z804[i]!.w7565).toBeGreaterThan(z804[i - 1]!.w7565);
  });
  it('FBH: q fällt mit Verlegeabstand und Belagwiderstand, steigt mit ΔθH; Aufenthaltszone max 100 W/m² / 29 °C; Viessmann-Kontrolle VA100/Rλ 0.05/15 K ≈ 70 W/m²', () => {
    for (const r of hk.fbh.rlbStufen) {
      for (const dt of hk.fbh.dThStufenK) {
        const zeile = hk.fbh.qWm2[r]![String(dt)]!;
        expect(zeile).toHaveLength(hk.fbh.verlegeabstandMm.length);
        for (let i = 1; i < zeile.length; i++) expect(zeile[i]!, `${r}/${dt}`).toBeLessThan(zeile[i - 1]!);
      }
      for (let i = 1; i < hk.fbh.dThStufenK.length; i++) {
        const a = hk.fbh.qWm2[r]![String(hk.fbh.dThStufenK[i - 1])]![1]!;
        const b = hk.fbh.qWm2[r]![String(hk.fbh.dThStufenK[i])]![1]!;
        expect(b).toBeGreaterThan(a);
      }
    }
    for (const dt of hk.fbh.dThStufenK) expect(hk.fbh.qWm2['0.10']![String(dt)]![2]!).toBeLessThan(hk.fbh.qWm2['0.00']![String(dt)]![2]!);
    expect(hk.fbh.grenzwerte.qMaxAufenthaltWm2).toBe(100);
    expect(hk.fbh.grenzwerte.thetaFmaxAufenthaltC).toBe(29);
    expect(hk.fbh.qWm2['0.05']!['15']![1]).toBeCloseTo(70, -1);
  });
  it('Minderungen: f4 und f5 monoton', () => {
    const f4 = hk.minderungen.f4Baulaenge.stufen;
    for (let i = 1; i < f4.length; i++) expect(f4[i]!.mProzent).toBeGreaterThanOrEqual(f4[i - 1]!.mProzent);
    const f5 = hk.minderungen.f5Anschluss.stufen;
    for (const s of f5) expect(s.reitend).toBeGreaterThan(s.wechselseitig);
    expect(f5.find((s) => s.spreizungK === 20)!.reitend).toBe(12);
  });
});

describe('heizkoerper-tabellen.json — Modell-DB (HK-07, DATA-06)', () => {
  it('jedes Modell hat Quelle + Stand, keine Dublette, bekannte Bauart; Platten-Modelle nur mit Datenblattwert', () => {
    const ids = hk.modelle.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const bauarten = hk.bauarten.map((b) => b.key);
    for (const m of hk.modelle) {
      expect(m.quelle.length, m.id).toBeGreaterThan(0);
      expect(bauarten, m.id).toContain(m.bauart);
      expect(typeof m.abgeleitet).toBe('boolean');
    }
    // Buderus und Stelrad Typ 22 H600 dürfen nicht byte-identisch sein (alte Dublette)
    const bud = hk.modelle.find((m) => m.hersteller === 'Buderus' && m.bauart === 'platte_22' && m.hoeheMm === 600)!;
    const ste = hk.modelle.find((m) => m.hersteller === 'Stelrad' && m.bauart === 'platte_22' && m.hoeheMm === 600)!;
    expect(bud.wProM7565).not.toBe(ste.wProM7565);
    // Purmo Compact 22 H600: 1709 W/m (HK-07: alt 1462)
    const pur = hk.modelle.find((m) => m.hersteller === 'Purmo' && m.bauart === 'platte_22' && m.hoeheMm === 600)!;
    expect(pur.wProM7565).toBe(1709);
  });
});

describe('heizkoerper-tabellen.json — auslegung (Session 5)', () => {
  type A = { auslegung: { spreizungDefaultK: { radiator: number; flaeche: number }; zielVLDefaultC: number; vlSuchbereichC: number[]; unsicherheitProzent: Record<string, number>; gussTiefeDefaultMm: number; fbhDefault: { verlegeabstandMm: number; rlb: number } }; ampel: { vorlaufC: { gutBis: number } }; glieder: { guss: { werte: { tiefeMm: number }[] } }; fbh: { verlegeabstandMm: number[]; rlbStufen: string[] } };
  const d = ladeJson<A>('heizkoerper-tabellen.json');
  it('Standardwerte konsistent mit den Tabellen: Ziel-VL = Grenze «gut», Guss-Tiefe und FBH-System in den Tabellen, Unsicherheit Typenschild < Modell < Tabelle', () => {
    const a = d.auslegung;
    expect(a.zielVLDefaultC).toBe(d.ampel.vorlaufC.gutBis);
    expect(a.spreizungDefaultK.radiator).toBeGreaterThan(0);
    expect(a.spreizungDefaultK.flaeche).toBeGreaterThan(0);
    expect(a.vlSuchbereichC[1]).toBeGreaterThan(a.zielVLDefaultC);
    expect(d.glieder.guss.werte.map((w) => w.tiefeMm)).toContain(a.gussTiefeDefaultMm);
    expect(d.fbh.verlegeabstandMm).toContain(a.fbhDefault.verlegeabstandMm);
    expect(d.fbh.rlbStufen.map(Number)).toContain(a.fbhDefault.rlb);
    const u = a.unsicherheitProzent;
    expect(u.typenschild!).toBeLessThan(u.modell!);
    expect(u.modell!).toBeLessThan(u.tabelle!);
    expect(u.tabelle!).toBeLessThan(u.heizkurve!);
  });
});
