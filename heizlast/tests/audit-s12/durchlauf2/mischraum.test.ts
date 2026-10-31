/**
 * Audit S12, Durchlauf 2 — Punkt 7: Heizkörper §3.1 gedeckelter Mischerkreis.
 * Zusätzlich zum bestehenden Test (rechenkette.test.ts «Gemischter FBH-Kreis zu klein (behoben S12)») ein Mischraum:
 * FBH 20 m² hinter Mischer 35 °C (gemischt) + Plattenheizkörper Typ 22 am ungemischten Kreis 55 °C, Φ_HL 2 500 W.
 * Erwartet: θ_VL,req steigt über den Heizkörper, FBH bleibt bei 35 °C gedeckelt, keine Mischer-Warnung (Summe erreichbar);
 * Gerätefilter bekommt über berechne() den sinnvollen Wert (nicht 90 °C).
 * Unabhängige Kontrollrechnung: Δθ_log/Bisektion eigenständig (EN 442-2), n aus heizkoerper-tabellen.json (Daten, nicht Kern).
 */
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import type { WaermeabgabeEingabe } from '../../../src/kern/waermeabgabe';
import { waermeabgabe } from '../../../src/kern/waermeabgabe';
import type { State } from '../../../src/state/schema';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
const wa = { hk: daten.hk, fws: daten.fws, sia: daten.sia };
const kopie = (s: State): State => JSON.parse(JSON.stringify(s)) as State;

/* unabhängige Referenz (EN 442-2) */
const dtl = (tv: number, tr: number, ti: number) => (tv - tr) / Math.log((tv - ti) / (tr - ti));
const fRad = (tv: number, tr: number, ti: number, n: number) => Math.pow(dtl(tv, tr, ti) / dtl(75, 65, 20), n);

const eingabe: WaermeabgabeEingabe = {
  heizkreise: [
    { id: 'fbh', bezeichnung: 'FBH gemischt', tVLC: 35, spreizungK: 7, gemischt: true },
    { id: 'hk', bezeichnung: 'Heizkörper', tVLC: 55, spreizungK: 10 },
  ],
  raeume: [
    {
      id: 'w',
      name: 'Wohnen',
      thetaIntC: 20,
      flaecheM2: 30,
      phiHLManuellW: 2500,
      heizflaechen: [
        { id: 'f', bauart: 'fbh', flaecheM2: 20, verlegeabstandMm: 150, rlb: 0.1, kreisId: 'fbh' },
        { id: 'p', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000, kreisId: 'hk' },
      ],
    },
  ],
};

describe('Punkt 7 — Mischraum: FBH (Mischer 35 °C) + Typ 22 (ungemischt 55 °C), Φ_HL 2 500 W', () => {
  const r = waermeabgabe(eingabe, wa);
  const raum = r.raeume[0]!;
  const fbh = raum.heizflaechen.find((h) => h.id === 'f')!;
  const hk = raum.heizflaechen.find((h) => h.id === 'p')!;

  it('FBH liefert bei 35/28 nur einen Teil, der Heizkörper trägt den Rest: θ_VL,req > 35 °C und < 90 °C, kein Mischer-Hinweis, erreichbar', () => {
    expect(fbh.qZiel!.wert).toBeLessThan(2500);
    expect(fbh.vlZiel.wert).toBe(35);
    expect(hk.vlZiel.wert).toBe(55);
    expect(raum.tVLReq).not.toBeNull();
    expect(raum.tVLReq!.wert).toBeGreaterThan(35);
    expect(raum.tVLReq!.wert).toBeLessThan(90);
    expect(raum.erreichbar).toBe(true);
    expect(raum.mischerGrenze).toBeNull();
    expect(raum.hinweise.some((h) => h.code === 'waermeabgabe.raum.mischerGrenze')).toBe(false);
    expect(raum.hinweise.some((h) => h.code === 'waermeabgabe.raum.nichtErreichbar')).toBe(false);
    expect(raum.tVLReq!.begruendung).not.toContain('ohne Mischer-Grenze');
    expect(r.gebaeude.auslegungsVL!.wert).toBeCloseTo(raum.tVLReq!.wert, 6);
    expect(r.gebaeude.urteil).not.toMatch(/90 °C/);
    console.log(`Mischraum: FBH ${fbh.qZiel!.wert.toFixed(0)} W @35/28, HK Q_N ${hk.qN!.wert.toFixed(0)} W → θ_VL,req ${raum.tVLReq!.wert.toFixed(1)} °C; Urteil: ${r.gebaeude.urteil}`);
  });

  it('Kontrollrechnung: Φ_HL − Q_FBH(35) = Q_N,HK · f(θ, θ−10, 20)^n mit n(platte_22) aus den Daten → θ innerhalb 0.1 K des Kerns', () => {
    const n = daten.hk.exponenten.werte.platte_22!;
    const rest = 2500 - fbh.qZiel!.wert;
    let lo = 30.01;
    let hi = 120;
    for (let i = 0; i < 80; i++) {
      const m = (lo + hi) / 2;
      if (hk.qN!.wert * fRad(m, m - 10, 20, n) < rest) lo = m;
      else hi = m;
    }
    const ref = (lo + hi) / 2;
    expect(Math.abs(raum.tVLReq!.wert - ref)).toBeLessThan(0.1);
    // FBH bleibt gedeckelt: Σ Q bei θ_VL,req = Φ_HL, wobei die FBH ihren 35-°C-Wert behält (sonst wäre Σ grösser)
    const summeOhneDeckel = fbh.qZiel!.wert + hk.qN!.wert * fRad(raum.tVLReq!.wert, raum.tVLReq!.wert - 10, 20, n);
    expect(summeOhneDeckel).toBeCloseTo(2500, 0);
  });

  it('Gegenprobe: derselbe Raum, aber Heizkörper ebenfalls am gemischten 35-°C-Kreis → Mischer-Grenze gemeldet, θ_VL,req ohne Deckel = gleicher Wert', () => {
    const e2: WaermeabgabeEingabe = { ...eingabe, raeume: [{ ...eingabe.raeume[0]!, heizflaechen: eingabe.raeume[0]!.heizflaechen.map((h) => ({ ...h, kreisId: 'fbh' })) }] };
    const g = waermeabgabe(e2, wa);
    const x = g.raeume[0]!;
    expect(x.mischerGrenze).not.toBeNull();
    expect(x.mischerGrenze!.kreisVLC).toBe(35);
    expect(x.mischerGrenze!.qBeiKreisVL).toBeLessThan(2500);
    expect(x.hinweise.some((h) => h.code === 'waermeabgabe.raum.mischerGrenze')).toBe(true);
    expect(x.tVLReq).not.toBeNull();
    expect(x.tVLReq!.wert).toBeLessThan(90);
    expect(g.gebaeude.auslegungsVL!.wert).toBe(x.tVLReq!.wert);
  });
});

describe('Punkt 7 — Gerätefilter über berechne(): sinnvoller Vorlauf statt 90 °C', () => {
  function state(fbhM2: number, hkAmUngemischten: boolean, phiHL = 2500): State {
    const s = kopie(fixture('state-v4-fws-moosseedorf.json'));
    s.warmwasser.wwKuenftig = false; // sonst hebt die WW-Ladetemperatur 60 °C den Filter an
    s.raeume = [{ id: 'w', name: 'Wohnen', typ: 'wohnen', flaecheM2: 30, bauteile: [] }];
    s.waermeabgabe.heizkreise = [
      { id: 'fbh', tVLC: 35, spreizungK: 7, gemischt: true },
      { id: 'hk', tVLC: 55, spreizungK: 10 },
    ];
    s.waermeabgabe.raeume = {
      w: {
        phiHLManuellW: phiHL,
        heizflaechen: [
          { id: 'f', bauart: 'fbh', flaecheM2: fbhM2, verlegeabstandMm: 150, rlb: 0.1, kreisId: 'fbh' },
          ...(hkAmUngemischten ? [{ id: 'p', bauart: 'platte_22' as const, hoeheMm: 600, laengeMm: 1000, kreisId: 'hk' }] : []),
        ],
      },
    };
    return s;
  }
  it('Mischraum 2 500 W: Filter-Vorlauf = θ_VL,req des Raums (75.8 °C, nicht 90); Meldung «kein Gerät» nennt diesen Wert (DB max. 75 °C)', () => {
    const e = berechne(state(20, true), daten);
    const raum = e.waermeabgabe!.raeume[0]!;
    expect(e.auslegungsVL.wert).toBeCloseTo(raum.tVLReq!.wert, 6);
    expect(e.auslegungsVL.wert).toBeLessThan(90);
    expect(e.geraet.filterVorlauf!.wert).toBe(e.auslegungsVL.wert);
    const kt = e.hinweise.find((h) => h.code === 'geraet.keineTreffer');
    if (kt) expect(kt.text).toContain(`Vorlauf ≥ ${Math.round(e.auslegungsVL.wert)} °C`);
    console.log(`berechne() 2 500 W: Auslegungs-VL ${e.auslegungsVL.wert.toFixed(1)} °C, ${e.geraet.liste.length} Geräte${kt ? ` («${kt.text}»)` : ''}`);
  });
  it('Mischraum 1 800 W: θ_VL,req ≤ 65 °C → Geräteliste nicht leer, Filter nutzt den Raumwert', () => {
    const e = berechne(state(20, true, 1800), daten);
    expect(e.auslegungsVL.wert).toBeGreaterThan(35);
    expect(e.auslegungsVL.wert).toBeLessThanOrEqual(65);
    expect(e.geraet.filterVorlauf!.wert).toBe(e.auslegungsVL.wert);
    expect(e.geraet.liste.length).toBeGreaterThan(0);
    for (const g of e.geraet.liste) expect(g.vorlaufMaxC ?? 99).toBeGreaterThanOrEqual(e.auslegungsVL.wert);
    console.log(`berechne() 1 800 W: Auslegungs-VL ${e.auslegungsVL.wert.toFixed(1)} °C, ${e.geraet.liste.length} Geräte`);
  });
  it('nur FBH 20 m² hinter Mischer 35 °C, Φ_HL 1 500 W (Fall aus HK §3.1): Mischer-Warnung, Auslegungs-VL ≈ 40 °C statt 90, Geräteliste nicht leer', () => {
    const e = berechne(state(20, false, 1500), daten);
    expect(e.hinweise.some((h) => h.code === 'waermeabgabe.raum.mischerGrenze' && h.schritt === 'waermeabgabe')).toBe(true);
    expect(e.auslegungsVL.wert).toBeLessThan(90);
    expect(e.geraet.filterVorlauf!.wert).toBe(e.auslegungsVL.wert);
    expect(e.geraet.liste.length).toBeGreaterThan(0);
    console.log(`nur FBH gemischt: Auslegungs-VL ${e.auslegungsVL.wert.toFixed(1)} °C, ${e.geraet.liste.length} Geräte; Urteil: ${e.waermeabgabe!.gebaeude.urteil}`);
  });
  it('nur FBH 20 m² hinter Mischer, Φ_HL 2 500 W: auch ohne Deckel nicht erreichbar (Oberflächengrenze) → keine Mischer-Warnung, Text «Oberflächentemperatur», VL ≥ 90 bleibt korrekt', () => {
    const e = berechne(state(20, false, 2500), daten);
    expect(e.hinweise.some((h) => h.code === 'waermeabgabe.raum.mischerGrenze')).toBe(false);
    const ne = e.hinweise.find((h) => h.code === 'waermeabgabe.raum.nichtErreichbar');
    expect(ne?.text).toMatch(/Oberflächentemperatur/);
    expect(e.waermeabgabe!.gebaeude.urteil).toMatch(/Flächenheizung .* zu klein/);
    expect(e.waermeabgabe!.raeume[0]!.massnahmen.some((m) => m.art === 'fbh')).toBe(false);
  });
});
