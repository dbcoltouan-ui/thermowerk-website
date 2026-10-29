import { describe, expect, it } from 'vitest';
import { ladeJson } from './meta.test';

type Band = [number, number];
type Periode = { key: string; von: number | null; bis: number | null; kwhM2a: { efh: Band; mfh: Band }; wM2: { efh: Band; mfh: Band } };
type Preset = { key: string; min: number; max: number; typ: number | null; kurs?: number };
type Fws = {
  tvoll: { hoehenschwelleM: number; bedarfsarten: Record<string, { mittelland: number; ab800m: number }> };
  heizwerte: { konventionen: Record<string, { default: boolean; traeger: Record<string, { kwhProEinheit: number; einheit: string }> }>; etaPresets: Record<string, Preset[]> };
  sperrzeit: { faktorTabelle: Record<string, number>; toffMaxH: number };
  bauperioden: { perioden: Periode[] };
  sanierungen: { massnahmen: { key: string; min: number; max: number; typ: number | null }[] };
  warmwasser: {
    bedarfProPersonLiterTag: { werte: { key: string; literProPersonTag: number }[] };
    personenbelegung: { formel: string; a0M2: number; stuetzpunkte: { anfM2: number; personen: number }[] };
    verluste: { speicher: { ausVolumen: { stuetzpunkte: { liter: number; kwhTag: number }[] } }; ausstoss: { typ: number } };
    leistungszuschlag: { kursbeispiel: { qhlKW: number; qwwKwhTag: number; tdH: number; qwKW: number } };
  };
  speicherWarmwasser: { fSto: { wert: number; default?: boolean }[]; tKaltwasserC: number; spitzendeckung: { anteilVwuMax: number } };
  bivalenz: { tabelle: { leistungsanteilWP: number; energieanteilWP: Band }[] };
  geraetewahl: { inverterMinVerhaeltnis: number; rotAbUebergroesseProzent: number; knappGelbBis: number; filterToleranzUntenProzent: number; quelle: string[]; fundstelle: string };
};

const fws = ladeJson<Fws>('fws.json');

describe('fws.json — Volllaststunden (Folie 16)', () => {
  it('enthält die drei Kurs-Bedarfsarten mit den Kurswerten', () => {
    expect(fws.tvoll.bedarfsarten.raumwaerme_wohnen).toEqual(expect.objectContaining({ mittelland: 2000, ab800m: 2300 }));
    expect(fws.tvoll.bedarfsarten.raumwaerme_ww_wohnen).toEqual(expect.objectContaining({ mittelland: 2300, ab800m: 2500 }));
    expect(fws.tvoll.bedarfsarten.raumwaerme_wochenendabsenkung).toEqual(expect.objectContaining({ mittelland: 1900, ab800m: 2100 }));
    expect(fws.tvoll.hoehenschwelleM).toBe(800);
    expect(Object.keys(fws.tvoll.bedarfsarten)).not.toContain('jura');
  });
  it('ab 800 m immer höher als Mittelland', () => {
    for (const b of Object.values(fws.tvoll.bedarfsarten)) expect(b.ab800m).toBeGreaterThan(b.mittelland);
  });
});

describe('fws.json — Heizwerte und η', () => {
  it('Konvention fwsKurs ist Default und trägt die Kurszahlen 10.5 / 10.4 / 2500 / 1800', () => {
    const k = fws.heizwerte.konventionen.fwsKurs!;
    expect(k.default).toBe(true);
    expect(k.traeger.heizoel!.kwhProEinheit).toBe(10.5);
    expect(k.traeger.erdgas!.kwhProEinheit).toBe(10.4);
    expect(k.traeger.hartholz!.kwhProEinheit).toBe(2500);
    expect(k.traeger.nadelholz!.kwhProEinheit).toBe(1800);
    expect(Object.values(fws.heizwerte.konventionen).filter((x) => x.default)).toHaveLength(1);
  });
  it('Konvention hi liegt für Öl/Gas unter der Kurs-Konvention (Hi < Ho) und über 0.9·Ho', () => {
    const k = fws.heizwerte.konventionen.fwsKurs!.traeger;
    const h = fws.heizwerte.konventionen.hi!.traeger;
    for (const t of ['heizoel', 'erdgas']) {
      expect(h[t]!.kwhProEinheit).toBeLessThan(k[t]!.kwhProEinheit);
      expect(h[t]!.kwhProEinheit).toBeGreaterThan(0.9 * k[t]!.kwhProEinheit);
    }
    expect(Object.keys(h).sort()).toEqual(Object.keys(k).sort());
  });
  it('η-Presets: min ≤ typ ≤ max, alle in (0.4, 1.0]; Kursloesungswerte innerhalb ±0.1 des Bands', () => {
    for (const [traeger, presets] of Object.entries(fws.heizwerte.etaPresets)) {
      if (!Array.isArray(presets)) continue; // beschreibung
      expect(presets.length, traeger).toBeGreaterThan(0);
      for (const p of presets) {
        expect(p.min).toBeGreaterThan(0.4);
        expect(p.max).toBeLessThanOrEqual(1.0);
        expect(p.min).toBeLessThanOrEqual(p.max);
        if (p.typ !== null) {
          expect(p.typ).toBeGreaterThanOrEqual(p.min);
          expect(p.typ).toBeLessThanOrEqual(p.max);
        }
        if (p.kurs !== undefined) {
          expect(p.kurs).toBeGreaterThanOrEqual(p.min - 0.1);
          expect(p.kurs).toBeLessThanOrEqual(p.max + 0.1);
        }
      }
    }
  });
});

describe('fws.json — Sperrzeit (Folie 30)', () => {
  it('Faktortabelle 0–8 h entspricht 24/(24−t) auf ±1 % und ist streng monoton', () => {
    let vorher = 0;
    for (let t = 0; t <= fws.sperrzeit.toffMaxH; t++) {
      const f = fws.sperrzeit.faktorTabelle[String(t)]!;
      expect(f).toBeCloseTo(24 / (24 - t), 1);
      expect(Math.abs(f - 24 / (24 - t))).toBeLessThan(0.01);
      expect(f).toBeGreaterThan(vorher);
      vorher = f;
    }
    expect(fws.sperrzeit.faktorTabelle['8']).toBe(1.5);
  });
});

describe('fws.json — Bauperioden (Folie 36/37)', () => {
  it('12 Perioden lückenlos, Bänder min < max, Kurs-Stichproben', () => {
    const p = fws.bauperioden.perioden;
    expect(p).toHaveLength(12);
    for (let i = 1; i < p.length; i++) expect(p[i]!.von, p[i]!.key).toBe((p[i - 1]!.bis ?? 0) + 1);
    for (const x of p) {
      for (const typ of ['efh', 'mfh'] as const) {
        expect(x.kwhM2a[typ][0]).toBeLessThan(x.kwhM2a[typ][1]);
        expect(x.wM2[typ][0]).toBeLessThan(x.wM2[typ][1]);
      }
    }
    expect(p.find((x) => x.key === '1971_1980')!.kwhM2a.efh).toEqual([70, 125]);
    expect(p.find((x) => x.key === '1971_1980')!.wM2.efh).toEqual([35, 63]);
    expect(p.find((x) => x.key === 'ab2011')!.wM2.mfh).toEqual([15, 20]);
  });
  it('Obergrenzen W/m² fallen ab 1961 monoton (Dämmvorschriften)', () => {
    const p = fws.bauperioden.perioden.filter((x) => (x.von ?? 0) >= 1961);
    for (let i = 1; i < p.length; i++) {
      expect(p[i]!.wM2.efh[1], p[i]!.key).toBeLessThanOrEqual(p[i - 1]!.wM2.efh[1]);
      expect(p[i]!.wM2.mfh[1], p[i]!.key).toBeLessThanOrEqual(p[i - 1]!.wM2.mfh[1]);
    }
  });
  it('Kursbeispiel Aufgabe 2 (EFH 1975, 46.5 W/m²) liegt im Band 1971–1980', () => {
    const b = fws.bauperioden.perioden.find((x) => x.key === '1971_1980')!.wM2.efh;
    expect(46.5).toBeGreaterThanOrEqual(b[0]);
    expect(46.5).toBeLessThanOrEqual(b[1]);
  });
});

describe('fws.json — Sanierungen (Folie 36, Aufgabe 2)', () => {
  it('Bänder plausibel, Aufgabe-2-Werte 15/8/10 % enthalten', () => {
    const m = Object.fromEntries(fws.sanierungen.massnahmen.map((x) => [x.key, x]));
    expect(m.fenster).toEqual(expect.objectContaining({ min: 10, max: 20, typ: 15 }));
    expect(m.kellerdecke!.typ).toBe(8);
    expect(m.estrich!.typ).toBe(10);
    expect(m.fassade).toEqual(expect.objectContaining({ min: 25, max: 40 }));
    for (const x of fws.sanierungen.massnahmen) if (x.typ !== null) expect(x.typ).toBeGreaterThanOrEqual(x.min);
    // Kurs: 12.55 · 0.85 · 0.92 · 0.90 = 8.8 kW
    expect(12.55 * (1 - 15 / 100) * (1 - 8 / 100) * (1 - 10 / 100)).toBeCloseTo(8.8, 1);
  });
});

describe('fws.json — Warmwasser (SIA 385/2, Folien 42–52)', () => {
  it('Nutzwarmwasserbedarf je Person nach SIA 385/2:2015', () => {
    const w = Object.fromEntries(fws.warmwasser.bedarfProPersonLiterTag.werte.map((x) => [x.key, x.literProPersonTag]));
    expect(w).toEqual({ efh_einfach: 40, efh_mittel: 45, efh_gehoben: 55, mfh_allgemein: 35, mfh_gehoben: 45, buero: 3 });
    const defaults = fws.warmwasser.bedarfProPersonLiterTag.werte.filter((x) => (x as { default?: boolean }).default);
    expect(defaults.map((x) => x.key)).toEqual(['efh_mittel']); // Standardwert 45 l (Daniel 29.10.)
  });
  it('Personenbelegung: Stützpunkte entsprechen der Formel n = 3.3 − 2/(1+(A/100)³)', () => {
    const a0 = fws.warmwasser.personenbelegung.a0M2;
    for (const s of fws.warmwasser.personenbelegung.stuetzpunkte) {
      const n = 3.3 - 2 / (1 + Math.pow(s.anfM2 / a0, 3));
      expect(s.personen).toBeCloseTo(n, 2);
    }
    // Kurs Folie 48: 150 m² → 2.8 P/Whg.
    expect(3.3 - 2 / (1 + Math.pow(150 / a0, 3))).toBeCloseTo(2.8, 1);
  });
  it('Speicherverlust-Stützpunkte monoton steigend, 800 l → 3.1 kWh/d (Folie 49)', () => {
    const s = fws.warmwasser.verluste.speicher.ausVolumen.stuetzpunkte;
    for (let i = 1; i < s.length; i++) {
      expect(s[i]!.liter).toBeGreaterThan(s[i - 1]!.liter);
      expect(s[i]!.kwhTag).toBeGreaterThan(s[i - 1]!.kwhTag);
    }
    expect(s.find((x) => x.liter === 800)!.kwhTag).toBe(3.1);
  });
  it('Kursbeispiel Folie 49/52: 28.6 + 3.1 + 4.3 + 4.3 = 40.3 kWh/d; td 2.69 h; Qw 1.89 kW', () => {
    const qwu = 490 * 4.2 * 50 / 3600; // 28.58
    const qww = qwu + 3.1 + 0.15 * qwu + 0.15 * qwu;
    expect(qww).toBeCloseTo(40.3, 1);
    const k = fws.warmwasser.leistungszuschlag.kursbeispiel;
    const td = k.qwwKwhTag / k.qhlKW;
    expect(td).toBeCloseTo(k.tdH, 2);
    expect(k.qhlKW * (24 / (24 - td) - 1)).toBeCloseTo(k.qwKW, 2);
  });
  it('Speicher: f_sto 1.25 (Default) / 1.10 / 1.00, Kaltwasser 10 °C, Spitzendeckung ≈ 9 %', () => {
    expect(fws.speicherWarmwasser.fSto.map((x) => x.wert)).toEqual([1.25, 1.1, 1.0]);
    expect(fws.speicherWarmwasser.fSto.filter((x) => x.default)).toHaveLength(1);
    expect(fws.speicherWarmwasser.tKaltwasserC).toBe(10);
    expect(fws.speicherWarmwasser.spitzendeckung.anteilVwuMax).toBeGreaterThan(0.05);
    expect(fws.speicherWarmwasser.spitzendeckung.anteilVwuMax).toBeLessThan(0.15);
  });
});

describe('fws.json — Bivalenz (Folie 95)', () => {
  it('Energieanteil wächst mit Leistungsanteil', () => {
    const t = [...fws.bivalenz.tabelle].sort((a, b) => a.leistungsanteilWP - b.leistungsanteilWP);
    for (let i = 1; i < t.length; i++) expect(t[i]!.energieanteilWP[0]).toBeGreaterThan(t[i - 1]!.energieanteilWP[1] - 0.01);
    expect(t.find((x) => x.leistungsanteilWP === 0.5)!.energieanteilWP).toEqual([0.8, 0.85]);
  });
});

describe('fws.json — Gerätewahl (Folie 3, Session 6)', () => {
  it('Kurs-Faustregel Q_h ≥ 0.75 · Q_WP; Thermowerk-Bänder geordnet und als Annahme gekennzeichnet', () => {
    const g = fws.geraetewahl;
    expect(g.inverterMinVerhaeltnis).toBe(0.75);
    expect(g.rotAbUebergroesseProzent).toBe(37);
    expect(g.rotAbUebergroesseProzent).toBeGreaterThan((1 / g.inverterMinVerhaeltnis - 1) * 100);
    expect(g.knappGelbBis).toBeGreaterThan(1);
    expect(g.filterToleranzUntenProzent).toBeGreaterThan(0);
    expect(g.filterToleranzUntenProzent).toBeLessThan(25);
    expect(g.quelle).toEqual(expect.arrayContaining(['fws-m3', 'tw-annahme']));
    expect(g.fundstelle).toContain('Folie 3');
  });
});
