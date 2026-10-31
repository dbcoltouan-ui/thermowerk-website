/**
 * Raumweise Heizlast SIA 384/2 — Sollwerte extern:
 *  - Referenzhaus 238/5 (SHK-Schulung B5 Kap. 8, Formblätter R/G1/G2/V; referenz/referenzhaus-etagenwohnung.json): Räume ±2 %.
 *  - IBO Musterhaus EFH (Ingenieurbüro Oertel; referenz/referenzhaus-efh.json): Lüftungsanteile der 14 Räume, Erdreich.
 *  - Eigenes CH-EFH-Beispiel von Hand (Zahlen unten im Test; SIA 4009 nicht öffentlich).
 *  - U_equiv-Tabelle ISO 13370 (Wissensbasis B Tab. 3.8) gegen die Formel.
 * Property-Tests: Saldierung ≤ Σ Räume, Hülle→Raum-Vererbung, Override gewinnt, n_min/b_u-Tabellen, EBF, Rest.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../src/daten/fws';
import { huelleDaten } from '../../src/daten/huelle';
import { siaDaten } from '../../src/daten/sia384';
import { huelleAufloesen, standardBauteiltypen } from '../../src/kern/huelle';
import { thetaEEingabe } from '../../src/kern/klima';
import type { RaumEingabe, RaumweiseEingabe } from '../../src/kern/raumweise';
import { bUFuer, dichtheitDefault, heizlastRaumweise, nMinFuerRaum, uEquivBodenplatte } from '../../src/kern/raumweise';
import { eingabe } from '../../src/kern/wert';
import { erwarteNahe, pruefeWert } from './hilfen';

const hd = huelleDaten();
const sia = siaDaten();
const fws = fwsDaten();
const daten = { sia, fws };

type RefBauteil = { label: string; typ: string; u: number; A: number; fRT: number; thetaNb?: number; anschluss?: string };
type RefRaum = { id: number; name: string; tint: number; nmin: number; geometrie: { A: number; h: number }; bauteile: RefBauteil[]; soll: Record<string, number> };
const ref238 = JSON.parse(readFileSync(join(__dirname, '..', '..', 'referenz', 'referenzhaus-etagenwohnung.json'), 'utf8')) as { raeume: RefRaum[]; soll_gebaeude: Record<string, number> };
const refIbo = JSON.parse(readFileSync(join(__dirname, '..', '..', 'referenz', 'referenzhaus-efh.json'), 'utf8')) as { raeume: { id: string; name: string; A_m2: number; tint: number; HV_W_pro_K: number; phiV_W: number }[]; stamm: { te: number; tme: number; erdreich: { B_strich_m: number; fg1: number; GW_faktor: number } }; soll_gebaeude: { anteils_verteilung: { erdreich_W: { wert_W: number } } } };

/** Leere Hülle (alle Raumbauteile mit U-Override). */
const huelleLeer = huelleAufloesen({ baujahr: 1970, bauteiltypen: [] }, hd);

function raum238(r: RefRaum): RaumEingabe {
  return {
    id: String(r.id),
    name: r.name,
    typ: r.tint === 24 ? 'bad' : r.tint === 15 ? 'eingangsbereich' : 'wohnen',
    thetaIntC: r.tint,
    flaecheM2: r.geometrie.A,
    hoeheM: r.geometrie.h,
    nMinOverride: r.nmin, // 238/5 rechnet n_min 0.5 für alle Räume (DIN); SIA-Tabelle gäbe 0.7 im Bad
    bauteile: r.bauteile.map((b, i) => ({
      id: `${b.typ}${i}`,
      bezeichnung: b.label,
      art: b.typ === 'AW' ? 'aussenwand' : b.typ === 'AF' ? 'fenster' : b.typ === 'IW' ? 'innenwand' : b.typ === 'IT' ? 'innentuer' : 'innendecke',
      flaecheM2: b.A,
      uOverride: b.u,
      anschluss:
        b.typ === 'AW' || b.typ === 'AF'
          ? { art: 'aussen' }
          : b.anschluss === 'unbeheizt'
            ? { art: 'unbeheizt', bU: b.fRT }
            : b.typ === 'FB'
              ? { art: 'unbeheizt', situation: 'keller', bU: 0.5 }
              : b.thetaNb !== undefined
                ? { art: 'beheizt', thetaNachbarC: b.thetaNb, andereEinheit: b.label.includes('Nachbarw') }
                : { art: 'faktor', f: b.fRT },
    })),
  };
}

describe('Referenzhaus 238/5 (DIN EN 12831 Formblätter; θe −12, ΔU_WB 0.05, n_min 0.5)', () => {
  const raeume = ref238.raeume.map(raum238);
  // Flur echt gerechnet: Innenwände/-türen zu den wärmeren Nachbarräumen von der Flurseite (Flächen = Gegenseite der Nachbarräume).
  const flur = raeume.find((r) => r.id === '3')!;
  flur.bauteile.push(
    { id: 'zuKueche', art: 'innenwand', flaecheM2: 3.2, uOverride: 1.94, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
    { id: 'zuKuecheTuer', art: 'innentuer', flaecheM2: 1.6, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
    { id: 'zuDusche', art: 'innenwand', flaecheM2: 5.7, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 24 } },
    { id: 'zuDuscheTuer', art: 'innentuer', flaecheM2: 1.3, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 24 } },
    { id: 'zuWohnen', art: 'innenwand', flaecheM2: 7.0, uOverride: 1.94, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
    { id: 'zuWohnenTuer', art: 'innentuer', flaecheM2: 1.6, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
    { id: 'zuSchlafen', art: 'innenwand', flaecheM2: 5.4, uOverride: 1.94, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
    { id: 'zuSchlafenTuer', art: 'innentuer', flaecheM2: 1.6, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
  );
  const e: RaumweiseEingabe = { thetaE: thetaEEingabe(-12), huelle: huelleLeer, baujahr: 1970, waermebruecken: { deltaU: 0.05 }, raeume, lueftung: { dichtheit: 'altbau' } };
  const r = heizlastRaumweise(e, daten);

  it('Küche, Dusche, Wohnzimmer, Schlafzimmer: Φ_T, Φ_V, Φ_HL innerhalb ±2 % der Formblätter', () => {
    for (const ref of ref238.raeume.filter((x) => x.id !== 3)) {
      const x = r.raeume.find((q) => q.id === String(ref.id))!;
      erwarteNahe(x.hT.wert, ref.soll.sigma_HT_W_pro_K!, 2, `${ref.name} H_T`);
      erwarteNahe(x.phiT.wert, ref.soll.phiT_W!, 2, `${ref.name} Φ_T`);
      erwarteNahe(x.phiV.wert, ref.soll.phiV_W!, 2, `${ref.name} Φ_V`);
      erwarteNahe(x.phiHL.wert, ref.soll.phiHL_W!, 2, `${ref.name} Φ_HL`);
      pruefeWert(x.phiHL, `${ref.name} Φ_HL`);
    }
  });
  it('Flur (15 °C) echt gerechnet: Φ_T direkt 160 W, Gewinne −325 W, Φ_HL −106 W gegenüber −95 W im Formblatt (Formblatt rundet f_RT auf −0.18; Abweichung 11 W dokumentiert)', () => {
    const x = r.raeume.find((q) => q.id === '3')!;
    const direkt = x.bauteile.filter((b) => b.phiT.wert > 0).reduce((s, b) => s + b.phiT.wert, 0);
    const gewinne = x.bauteile.filter((b) => b.phiT.wert < 0).reduce((s, b) => s + b.phiT.wert, 0);
    erwarteNahe(direkt, 160, 2, 'Flur Φ_T direkt');
    expect(gewinne).toBeCloseTo(-325, 0);
    expect(Math.abs(x.phiHL.wert - -95)).toBeLessThanOrEqual(12);
    expect(x.phiHL.wert).toBeLessThan(0);
    expect(x.hinweise.some((h) => h.code === 'raum.negativ')).toBe(true);
  });
  it('Σ Räume 4466 W ≙ 4447 W (±1 %); saldierte Gebäude-Heizlast 4289 W ≤ Σ Räume (Formblatt G: 3560 W mit DIN-Erdreichfaktoren auf Gebäudeebene — nicht reproduzierbar, dokumentiert)', () => {
    erwarteNahe(r.summeRaeume.wert, ref238.soll_gebaeude.summe_raeume_W!, 1, 'Σ Räume');
    expect(r.saldiertRaeume.wert).toBeLessThanOrEqual(r.summeRaeume.wert);
    expect(r.saldiertRaeume.wert).toBeGreaterThan(3560);
    expect(r.gebaeude.wert).toBe(r.saldiertRaeume.wert);
    expect(r.innentransmissionAnteil.wert).toBeGreaterThan(0);
    expect(r.vollstaendig).toBe(true);
    expect(r.methode).toContain('SIA 384/2:2020');
  });
  it('Faktoren: Aussen 1, Nachbar (20 → 15 °C) 0.156, Dusche → Zimmer 20 °C 0.111, Decke zur Nachbarwohnung zählt zur Hülle (andere Einheit), Innenwand gleicher Einheit nicht', () => {
    const k = r.raeume.find((q) => q.name === 'Küche')!;
    expect(k.bauteile.find((b) => b.bezeichnung === 'AW NW')!.faktor.wert).toBe(1);
    expect(k.bauteile.find((b) => b.bezeichnung === 'IW NO→Flur')!.faktor.wert).toBeCloseTo(5 / 32, 4);
    expect(k.bauteile.find((b) => b.bezeichnung === 'IW N→Bad')!.faktor.wert).toBeCloseTo(-4 / 32, 4);
    expect(k.bauteile.find((b) => b.bezeichnung === 'IW NO→Flur')!.zaehltZurHuelle).toBe(false);
    const d = r.raeume.find((q) => q.name === 'Dusche')!;
    expect(d.bauteile.find((b) => b.bezeichnung === 'IW S→Raum 20°C')!.faktor.wert).toBeCloseTo(4 / 36, 4);
    expect(d.bauteile.find((b) => b.bezeichnung === 'DE→Nachbarw.')!.zaehltZurHuelle).toBe(true);
    expect(d.bauteile.find((b) => b.bezeichnung === 'IW N→Treppenh.')!.faktor.wert).toBe(0.45);
  });
});

describe('IBO Musterhaus EFH (DIN EN 12831, θe −12, n 0.5, h 2.5 m)', () => {
  it('Lüftungsanteil der 14 Räume: Φ_V = V·0.5·0.34·(θint+12) innerhalb ±2 % (V aus Formblatt H_V/(0.34·0.5); DG-Räume mit Dachschräge h < 2.5); Σ Φ_V = 2782 W (±1 %)', () => {
    const raeume: RaumEingabe[] = refIbo.raeume.map((x) => ({ id: x.id, name: x.name, typ: x.tint === 24 ? 'bad' : x.tint === 15 ? 'hobby' : 'wohnen', thetaIntC: x.tint, flaecheM2: x.A_m2, hoeheM: x.HV_W_pro_K / (0.34 * 0.5) / x.A_m2, nMinOverride: 0.5, bauteile: [] }));
    expect(raeume.find((q) => q.name === 'Büro 1')!.hoeheM).toBeCloseTo(2.5, 1);
    expect(raeume.find((q) => q.name === 'Kind 1')!.hoeheM).toBeLessThan(2.1);
    const r = heizlastRaumweise({ thetaE: thetaEEingabe(refIbo.stamm.te), huelle: huelleLeer, baujahr: 2015, raeume }, daten);
    let summe = 0;
    for (const x of refIbo.raeume) {
      const q = r.raeume.find((y) => y.id === x.id)!;
      erwarteNahe(q.hV.wert, x.HV_W_pro_K, 2, `${x.name} H_V`);
      erwarteNahe(q.phiV.wert, x.phiV_W, 2, `${x.name} Φ_V`);
      summe += x.phiV_W;
    }
    erwarteNahe(r.raeume.reduce((s, q) => s + q.phiV.wert, 0), summe, 1, 'Σ Φ_V');
    expect(r.hinweise.filter((h) => h.code === 'raum.ohneBauteile')).toHaveLength(14);
  });
  it('HWR (15 °C) zwischen 20-°C-Räumen: H_T negativ (Wärmegewinn), Φ_HL nur aus Lüftung (Referenz H_T −0.3 W/K, Φ_HL 134 W)', () => {
    const r = heizlastRaumweise({ thetaE: thetaEEingabe(-12), huelle: huelleLeer, baujahr: 2015, raeume: [{ id: 'hwr', name: 'HWR', typ: 'hobby', thetaIntC: 15, flaecheM2: 12.4, hoeheM: 2.5, nMinOverride: 0.5, bauteile: [
      { id: 'iw1', art: 'innenwand', flaecheM2: 9, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
      { id: 'aw', art: 'aussenwand', flaecheM2: 6, uOverride: 0.27, anschluss: { art: 'erdreich', tiefeM: 1 } },
    ] }] }, daten);
    const x = r.raeume[0]!;
    expect(x.bauteile[0]!.hT.wert).toBeLessThan(0);
    expect(x.hT.wert).toBeLessThan(0.5);
    expect(x.hT.wert).toBeGreaterThan(-2);
    erwarteNahe(x.phiV.wert, 142, 2, 'HWR Φ_V');
  });
  it('Erdreich: Bodenplatte 93.8 m², U 0.17, B\' 4.84, θm,e 6.8, Grundwasser → U_equiv 0.14 (ISO 13370), f = 1.45·0.4125·1.15, Φ ≈ 289 W (Referenz 246 W mit DIN-Tabelle U_equiv ≈ 0.12; Abweichung +17 % auf 4 % der Gebäudelast dokumentiert)', () => {
    const r = heizlastRaumweise({
      thetaE: thetaEEingabe(-12),
      thetaMittelJahr: eingabe(refIbo.stamm.tme, '°C'),
      huelle: huelleLeer,
      baujahr: 2015,
      erdreich: { bStrichM: refIbo.stamm.erdreich.B_strich_m, grundwasserNah: true },
      raeume: [{ id: 'k', name: 'Keller', typ: 'wohnen', flaecheM2: 93.8, hoeheM: 2.5, bauteile: [{ id: 'fb', art: 'bodenErdreich', flaecheM2: 93.8, uOverride: 0.17, anschluss: { art: 'erdreich' } }] }],
      waermebruecken: { deltaU: 0 },
    }, daten);
    const b = r.raeume[0]!.bauteile[0]!;
    expect(b.u.wert).toBeCloseTo(0.14, 2);
    expect(b.faktor.wert).toBeCloseTo(1.45 * ((20 - 6.8) / 32) * 1.15, 3);
    expect(b.phiT.wert).toBeGreaterThan(refIbo.soll_gebaeude.anteils_verteilung.erdreich_W.wert_W);
    expect(b.phiT.wert).toBeLessThan(refIbo.soll_gebaeude.anteils_verteilung.erdreich_W.wert_W * 1.25);
    expect(r.erdreich.uEquivBeispiel?.wert).toBe(b.u.wert);
    pruefeWert(b.faktor, 'Erdreich-Faktor');
  });
});

describe('U_equiv Bodenplatte (ISO 13370) gegen Tabelle Wissensbasis B 3.8 (B\' 2–10 × R_f 0–2)', () => {
  it('alle 20 Stützpunkte innerhalb ±8 % (Tabellenrundung); Monotonie in B\' und R_f', () => {
    const t = sia.erdreich.uEquivBodenplatteZ0;
    const f = sia.erdreich.formelIso13370;
    for (const b of t.bStrichM) {
      let vorher = Infinity;
      t.rfStufen.forEach((rf, i) => {
        const soll = t.werte[String(b)]![i]!;
        const u = uEquivBodenplatte(1 / (rf + f.rsiAbwaerts), b, { lambdaErde: 2, wandDickeM: f.wandDickeDefaultM, rsi: f.rsiAbwaerts, rse: f.rseErdreichOberflaeche, rseVerwendetInU: 0 }).uEquiv;
        erwarteNahe(u, soll, 8, `B' ${b} R_f ${rf}`);
        expect(u).toBeLessThan(vorher);
        vorher = u;
      });
    }
    expect(uEquivBodenplatte(0.58, 4.36, { lambdaErde: 2, wandDickeM: 0.3, rsi: 0.17, rse: 0.04, rseVerwendetInU: 0.04 }).uEquiv).toBeCloseTo(0.37, 1); // Beuth-Errata-Beispiel
  });
});

describe('Eigenes CH-EFH-Beispiel von Hand (Bern θe −7 °C, Baujahr 1965, ΔU_WB 0.10, n_min NA.7 Bestand)', () => {
  /**
   * Handrechnung (U als Eingaben: AW 1.1, Fenster 2.7, Dach 0.5, Kellerdecke 2.1, Innenwand 1.9, Innendecke 3.0):
   *  Wohnen 25 m² × 2.5 m, 20 °C, Δθ 27 K, n_min 0.5 (weitere, altbau):
   *    H_T = 1.2·19 + 2.8·6 + 2.2·25·0.5 (Keller b_u 0.5) = 22.8 + 16.8 + 27.5 = 67.1 W/K → Φ_T 1811.7 W
   *    Φ_V = 62.5 m³ · 0.5 · 0.34 · 27 = 286.9 W → Φ_HL 2098.6 W
   *  Bad 6 m², 22 °C, Δθ 29 K, n_min 0.7 (badDusche, altbau), f zu 20 °C = 2/29:
   *    H_T = 1.2·6.5 + 2.8·1 + 0.6·6 + 1.9·5·(2/29) + 3.0·6·(2/29) = 7.8 + 2.8 + 3.6 + 0.655 + 1.241 = 16.097 → Φ_T 466.8 W
   *    Φ_V = 15 · 0.7 · 0.34 · 29 = 103.5 W → Φ_HL 570.3 W; Hüllenanteil (ohne Innenbauteile) 14.2·29 + 103.5 = 515.3 W
   *  Flur 4 m², 20 °C, innenliegend (n_min 0): Φ_T = 0.6·4·27 = 64.8 W = Φ_HL
   *  Σ Räume = 2098.6 + 570.3 + 64.8 = 2733.7 W; saldiert = 2098.6 + 515.3 + 64.8 = 2678.7 W
   *  EBF = (25 + 6 + 4) · 1.10 = 38.5 m²; spez. 2678.7/38.5 = 69.6 W/m²
   */
  const e: RaumweiseEingabe = {
    thetaE: thetaEEingabe(-7),
    huelle: huelleLeer,
    baujahr: 1965,
    waermebruecken: { key: 'bestand' },
    lueftung: { konzept: 'natuerlich', dichtheit: 'altbau' },
    geschosshoeheM: 2.5,
    raeume: [
      { id: 'wohnen', name: 'Wohnen', typ: 'wohnen', flaecheM2: 25, bauteile: [
        { id: 'aw', art: 'aussenwand', flaecheM2: 19, uOverride: 1.1, anschluss: { art: 'aussen' } },
        { id: 'f', art: 'fenster', flaecheM2: 6, uOverride: 2.7, anschluss: { art: 'aussen' } },
        { id: 'b', art: 'bodenKeller', flaecheM2: 25, uOverride: 2.1, anschluss: { art: 'unbeheizt', situation: 'keller' } },
      ] },
      { id: 'bad', name: 'Bad', typ: 'bad', laengeM: 2, breiteM: 3, bauteile: [
        { id: 'aw', art: 'aussenwand', flaecheM2: 6.5, uOverride: 1.1, anschluss: { art: 'aussen' } },
        { id: 'f', art: 'fenster', flaecheM2: 1, uOverride: 2.7, anschluss: { art: 'aussen' } },
        { id: 'd', art: 'dachSteil', flaecheM2: 6, uOverride: 0.5, anschluss: { art: 'aussen' } },
        { id: 'iw', art: 'innenwand', flaecheM2: 5, uOverride: 1.9, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
        { id: 'id', art: 'innendecke', flaecheM2: 6, uOverride: 3.0, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
      ] },
      { id: 'flur', name: 'Flur', typ: 'flur', flaecheM2: 4, bauteile: [{ id: 'd', art: 'dachSteil', flaecheM2: 4, uOverride: 0.5, anschluss: { art: 'aussen' } }] },
    ],
  };
  const r = heizlastRaumweise(e, daten);
  it('Räume: Wohnen 2098.6 W, Bad 570.3 W, Flur 64.8 W (±0.5 %); θint 20/22/20 aus Tabelle, n_min 0.5/0.7/0', () => {
    const [w, b, f] = r.raeume;
    erwarteNahe(w!.phiT.wert, 1811.7, 0.5, 'Wohnen Φ_T');
    erwarteNahe(w!.phiV.wert, 286.9, 0.5, 'Wohnen Φ_V');
    erwarteNahe(w!.phiHL.wert, 2098.6, 0.5, 'Wohnen Φ_HL');
    erwarteNahe(b!.phiT.wert, 466.8, 0.5, 'Bad Φ_T');
    erwarteNahe(b!.phiV.wert, 103.5, 0.5, 'Bad Φ_V');
    erwarteNahe(b!.phiHL.wert, 570.3, 0.5, 'Bad Φ_HL');
    erwarteNahe(b!.phiHuelle.wert, 515.3, 0.5, 'Bad Hülle');
    erwarteNahe(f!.phiHL.wert, 64.8, 0.5, 'Flur Φ_HL');
    expect(f!.nMin.wert).toBe(0);
    expect(f!.phiV.wert).toBe(0);
    expect(w!.thetaInt).toMatchObject({ wert: 20, herkunft: 'tabelle' });
    expect(b!.thetaInt.wert).toBe(22);
    expect(b!.nMin).toMatchObject({ wert: 0.7, herkunft: 'tabelle' });
    expect(b!.flaeche.wert).toBe(6);
    expect(b!.volumen.wert).toBe(15);
  });
  it('Gebäude: Σ Räume 2733.7 W, saldiert 2678.7 W (massgebend), EBF 38.5 m² (Σ Flächen × 1.10, Schätzung mit Band), 69.6 W/m²; Innentransmission 2 %', () => {
    erwarteNahe(r.summeRaeume.wert, 2733.7, 0.5, 'Σ Räume');
    erwarteNahe(r.saldiertRaeume.wert, 2678.7, 0.5, 'saldiert');
    expect(r.gebaeude.wert).toBe(r.saldiertRaeume.wert);
    expect(r.ebf.wert).toBeCloseTo(38.5, 6);
    expect(r.ebf.herkunft).toBe('schaetzung');
    expect(r.ebf.band).toEqual([35 * 1.1, 35 * 1.15]);
    erwarteNahe(r.spezifisch.wert, 69.6, 0.5, 'spez');
    expect(r.innentransmissionAnteil.wert).toBeCloseTo(((2733.7 - 2678.7) / 2678.7) * 100, 0);
    expect(r.deltaUWb).toMatchObject({ wert: 0.1, herkunft: 'tabelle' });
    expect(r.rest).toBeNull();
    pruefeWert(r.gebaeude, 'Gebäude');
    pruefeWert(r.ebf, 'EBF');
    expect(r.annahmen.some((a) => a.einheit === 'm²')).toBe(true);
    expect(r.annahmen.some((a) => a.einheit === '°C' && a.wert === 22)).toBe(true);
    expect(r.annahmen.some((a) => a.einheit === 'h⁻¹')).toBe(true);
  });
});

describe('Hülle → Raum (FLOW-02): Raumbauteile referenzieren Gebäude-Bauteiltypen', () => {
  const typen = standardBauteiltypen({ dachraumBeheizt: true, keller: 'unbeheizt' });
  const raum = (uOverride?: number): RaumEingabe => ({ id: 'w', name: 'Wohnen', typ: 'wohnen', flaecheM2: 20, bauteile: [
    { id: 'aw', typId: 'aw', flaecheM2: 10, anschluss: { art: 'aussen' }, ...(uOverride !== undefined ? { uOverride } : {}) },
    { id: 'f', typId: 'fenster', flaecheM2: 2, anschluss: { art: 'aussen' } },
    { id: 'b', typId: 'boden', flaecheM2: 20, anschluss: { art: 'unbeheizt', situation: 'keller' } },
  ] });
  it('U der Aussenwand kommt aus der Hülle (1965: 1.095), Begründung nennt die Hülle; Fenster 2.7; Kellerdecke 2.10 mit b_u 0.5', () => {
    const h = huelleAufloesen({ baujahr: 1965, bauteiltypen: typen }, hd);
    const r = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h, baujahr: 1965, raeume: [raum()] }, daten);
    const b = r.raeume[0]!.bauteile;
    expect(b[0]!.u.wert).toBeCloseTo(1.095, 2);
    expect(b[0]!.u.herkunft).toBe('fallback');
    expect(b[0]!.u.begruendung).toContain('aus Hülle');
    expect(b[1]!.u.wert).toBe(2.7);
    expect(b[2]!.u.wert).toBeCloseTo(2.103, 2);
    expect(b[2]!.faktor.wert).toBe(0.5);
    expect(b[0]!.hT.wert).toBeCloseTo((1.095 + 0.1) * 10, 1);
  });
  it('Sanierung in der Hülle wirkt im Raum: Fassade 2005 → Wand-U 0.30, Φ_T sinkt', () => {
    const h0 = huelleAufloesen({ baujahr: 1965, bauteiltypen: typen }, hd);
    const h1 = huelleAufloesen({ baujahr: 1965, bauteiltypen: typen.map((t) => (t.id === 'aw' ? { ...t, sanierung: { status: 'ausgefuehrt' as const, jahr: 2005 } } : t)) }, hd);
    const r0 = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h0, baujahr: 1965, raeume: [raum()] }, daten);
    const r1 = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h1, baujahr: 1965, raeume: [raum()] }, daten);
    expect(r1.raeume[0]!.bauteile[0]!.u.wert).toBeCloseTo(0.297, 2);
    expect(r1.raeume[0]!.phiT.wert).toBeLessThan(r0.raeume[0]!.phiT.wert);
    expect(r1.nMinDichtheit).toBe('altbau'); // Fassade ersetzt, Fenster nicht → weiter altbau
  });
  it('Override am Raumbauteil gewinnt über die Hülle und ist als «override» markiert (in annahmen); fehlender Typ → Fehler', () => {
    const h = huelleAufloesen({ baujahr: 1965, bauteiltypen: typen }, hd);
    const r = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h, baujahr: 1965, raeume: [raum(0.4)] }, daten);
    const b = r.raeume[0]!.bauteile[0]!;
    expect(b.u.wert).toBe(0.4);
    expect(b.u.herkunft).toBe('override');
    expect(b.u.begruendung).toContain('Hülle: 1.09');
    expect(r.annahmen).toContain(b.u);
    const r2 = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h, baujahr: 1965, raeume: [{ id: 'x', name: 'X', typ: 'wohnen', flaecheM2: 10, bauteile: [{ id: 'q', typId: 'gibtEsNicht', flaecheM2: 5, anschluss: { art: 'aussen' } }] }] }, daten);
    expect(r2.hinweise.some((x) => x.code === 'raum.typFehlt')).toBe(true);
    expect(r2.vollstaendig).toBe(false);
  });
});

describe('Tabellen: n_min (NA.7), b_u (ND.3), Dichtheit, Erdreich-Regel, ΔU_WB', () => {
  it('n_min natürlich: Wohnen 0.5/0.3 (altbau/neubau), Bad 0.7/0.5, Flur innenliegend 0, Flur mit Fenster 0.5; WRG mit Zuluft 0.2, ohne 0.1; Abluft 0.7', () => {
    expect(nMinFuerRaum({ typ: 'wohnen', aussenbezug: true }, 'natuerlich', 'altbau', sia).wert).toBe(0.5);
    expect(nMinFuerRaum({ typ: 'wohnen', aussenbezug: true }, 'natuerlich', 'neubau', sia).wert).toBe(0.3);
    expect(nMinFuerRaum({ typ: 'bad', aussenbezug: true }, 'natuerlich', 'altbau', sia).wert).toBe(0.7);
    expect(nMinFuerRaum({ typ: 'flur', aussenbezug: false }, 'natuerlich', 'altbau', sia).wert).toBe(0);
    expect(nMinFuerRaum({ typ: 'flur', aussenbezug: true }, 'natuerlich', 'altbau', sia).wert).toBe(0.5);
    expect(nMinFuerRaum({ typ: 'wohnen', zuluft: true, aussenbezug: true }, 'wrg', 'neubau', sia).wert).toBe(0.2);
    expect(nMinFuerRaum({ typ: 'wohnen', aussenbezug: true }, 'wrg', 'neubau', sia).wert).toBe(0.1);
    expect(nMinFuerRaum({ typ: 'kueche', aussenbezug: true }, 'abluftDauer', 'altbau', sia).wert).toBe(0.7);
    expect(dichtheitDefault(1994, false)).toBe('altbau');
    expect(dichtheitDefault(1994, true)).toBe('neubau');
    expect(dichtheitDefault(1995, false)).toBe('neubau');
  });
  it('b_u: Keller 0.5, Dachraum 0.9, Garage 0.8, Treppenhaus 0.7, ND.3 seitlich/zwei Flächen/dicht 0.5, Estrich dicht 0.7', () => {
    expect(bUFuer({ art: 'unbeheizt', situation: 'keller' }, sia).wert).toBe(0.5);
    expect(bUFuer({ art: 'unbeheizt', situation: 'dachraum' }, sia).wert).toBe(0.9);
    expect(bUFuer({ art: 'unbeheizt', situation: 'garage' }, sia).wert).toBe(0.8);
    expect(bUFuer({ art: 'unbeheizt', situation: 'treppenhaus' }, sia).wert).toBe(0.7);
    expect(bUFuer({ art: 'unbeheizt', nd3: { lage: 'seitlich', flaechen: 'zweiFlaechen', dicht: true } }, sia).wert).toBe(0.5);
    expect(bUFuer({ art: 'unbeheizt', nd3: { lage: 'estrich', flaechen: 'zweiFlaechen', dicht: true } }, sia).wert).toBe(0.7);
  });
  it('unbeheizter Nachbar mit bekannter Temperatur 10 °C bei 20/−8: f 0.357; Wand gegen Erdreich < 2 m: f 1 (Standardwert), > 2 m: b_u Keller 0.5', () => {
    const r = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: huelleLeer, baujahr: 1965, raeume: [{ id: 'k', name: 'K', typ: 'wohnen', flaecheM2: 10, bauteile: [
      { id: 'a', art: 'innenwand', flaecheM2: 10, uOverride: 1.0, anschluss: { art: 'unbeheizt', thetaNachbarC: 10 } },
      { id: 'b', art: 'aussenwand', flaecheM2: 10, uOverride: 1.0, anschluss: { art: 'erdreich' } },
      { id: 'c', art: 'aussenwand', flaecheM2: 10, uOverride: 1.0, anschluss: { art: 'erdreich', tiefeM: 2.5 } },
    ] }] }, daten);
    const b = r.raeume[0]!.bauteile;
    expect(b[0]!.faktor.wert).toBeCloseTo(10 / 28, 4);
    expect(b[1]!.faktor).toMatchObject({ wert: 1, herkunft: 'fallback', stufe: 'standardwert' });
    expect(b[2]!.faktor.wert).toBe(0.5);
  });
  it('ΔU_WB: Standard 0.10 (bestand) als Standardwert, neubau 0.05, Override 0.02; Geschosshöhe Standard 2.5 m als Annahme', () => {
    const basis = { thetaE: thetaEEingabe(-8), huelle: huelleLeer, baujahr: 1965, raeume: [] as RaumEingabe[] };
    expect(heizlastRaumweise(basis, daten).deltaUWb).toMatchObject({ wert: 0.1, stufe: 'standardwert' });
    expect(heizlastRaumweise({ ...basis, waermebruecken: { key: 'neubau' } }, daten).deltaUWb).toMatchObject({ wert: 0.05, stufe: 'gewaehlt' });
    expect(heizlastRaumweise({ ...basis, waermebruecken: { deltaU: 0.02 } }, daten).deltaUWb.herkunft).toBe('override');
    const r = heizlastRaumweise(basis, daten);
    expect(r.annahmen.some((a) => a.einheit === 'm' && a.wert === 2.5)).toBe(true);
    expect(r.hinweise.some((h) => h.code === 'gebaeude.keineRaeume')).toBe(true);
    expect(r.vollstaendig).toBe(false);
  });
});

describe('EBF und nicht raumweise erfasster Rest (FACH-22, FLOW-13)', () => {
  const raeume: RaumEingabe[] = [{ id: 'w', name: 'Wohnen', typ: 'wohnen', flaecheM2: 30, bauteile: [{ id: 'aw', art: 'aussenwand', flaecheM2: 15, uOverride: 1.0, anschluss: { art: 'aussen' } }] }];
  const h = huelleAufloesen({ baujahr: 1965, bauteiltypen: standardBauteiltypen({ dachraumBeheizt: true, keller: 'unbeheizt' }) }, hd);
  it('EBF manuell 150 m²: Eingabe; Rest «spezifisch» ohne Fläche = 150 − 30·1.1 = 117 m² (Standardwert) × Bandmitte 1961–1970 EFH 40–73 → 56.5 W/m²; Gebäude = saldiert + Rest', () => {
    const r = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h, baujahr: 1965, gebaeudetyp: 'efh', raeume, ebf: { modus: 'manuell', manuellM2: 150 }, rest: { modus: 'spezifisch' } }, daten);
    expect(r.ebf).toMatchObject({ wert: 150, herkunft: 'eingabe' });
    expect(r.rest?.flaeche.wert).toBeCloseTo(117, 6);
    expect(r.rest?.flaeche.herkunft).toBe('schaetzung');
    expect(r.rest?.phiHL.wert).toBeCloseTo(117 * 56.5, 1);
    expect(r.gebaeude.wert).toBeCloseTo(r.saldiertRaeume.wert + 117 * 56.5, 1);
    expect(r.summeMitRest.wert).toBeCloseTo(r.summeRaeume.wert + 117 * 56.5, 1);
    expect(r.hinweise.some((x) => x.code === 'rest.schaetzung')).toBe(true);
    expect(r.annahmen.some((a) => a.einheit === 'm²' && a.wert === 117)).toBe(true);
    // Die Φ'-Schätzung selbst (Bandmitte, ±29 %) steht im Annahmen-Protokoll (Audit S12, Fachlogik N2)
    expect(r.rest!.phiSpez).toMatchObject({ wert: 56.5, herkunft: 'schaetzung' });
    expect(r.annahmen).toContain(r.rest!.phiSpez);
    pruefeWert(r.rest!.phiHL, 'Rest');
  });
  it('Rest über Hüllflächen (AW 60 m², Fenster 15, Dach 50, Boden 50 Keller, 100 m³): Hüllen-U, b_u, ΔU_WB und Lüftung «weitere» — kein «1 m² pro m² EBF»', () => {
    const r = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h, baujahr: 1965, raeume, rest: { modus: 'huellflaechen', flaecheM2: 40, volumenM3: 100, aAussenwandM2: 60, aFensterM2: 15, aDachM2: 50, aBodenM2: 50, bodenAnschluss: 'keller' } }, daten);
    const rest = r.rest!;
    expect(rest.modus).toBe('huellflaechen');
    expect(rest.bauteile.map((b) => b.id)).toEqual(['rest_aw', 'rest_fenster', 'rest_dach', 'rest_boden']);
    const aw = rest.bauteile[0]!;
    expect(aw.u.wert).toBeCloseTo(1.095, 2);
    erwarteNahe(aw.phiT.wert, (1.095 + 0.1) * 60 * 28, 0.5, 'Rest AW Φ_T');
    expect(rest.bauteile[3]!.faktor.wert).toBe(0.5);
    expect(rest.phiV!.wert).toBeCloseTo(100 * 0.5 * 0.34 * 28, 1);
    expect(rest.phiHL.wert).toBeCloseTo(rest.bauteile.reduce((s, b) => s + b.phiT.wert, 0) + rest.phiV!.wert, 6);
    expect(r.gebaeude.wert).toBeCloseTo(r.saldiertRaeume.wert + rest.phiHL.wert, 6);
  });
  it('Rest «spezifisch» mit Φ\'-Override 45 W/m² und Fläche 80 → 3600 W; EBF manuell kleiner als Räume → Warnung; Rest ohne Fläche ohne EBF → Fehler', () => {
    const r = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h, baujahr: 1965, raeume, rest: { modus: 'spezifisch', flaecheM2: 80, phiSpezWm2: 45 } }, daten);
    expect(r.rest?.phiHL.wert).toBe(3600);
    const r2 = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h, baujahr: 1965, raeume, ebf: { modus: 'manuell', manuellM2: 20 } }, daten);
    expect(r2.hinweise.some((x) => x.code === 'ebf.kleinerAlsRaeume')).toBe(true);
    const r3 = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: h, baujahr: 1965, raeume, rest: { modus: 'spezifisch' } }, daten);
    expect(r3.hinweise.some((x) => x.code === 'rest.flaecheFehlt')).toBe(true);
    expect(r3.vollstaendig).toBe(false);
  });
});

describe('Property: Saldierung ≤ Σ Räume, Innentransmission nur in Σ Räume', () => {
  it('Gebäude mit Innenbauteilen zu kälteren Räumen (von der warmen Seite erfasst): saldiert ≤ Σ Räume für 24 Varianten; ohne Innenbauteile: gleich', () => {
    for (const thetaE of [-4, -8, -12]) {
      for (const uIw of [0.5, 2.0]) {
        for (const aIw of [0, 5, 20, 40]) {
          const raeume: RaumEingabe[] = [
            { id: 'w', name: 'Wohnen', typ: 'wohnen', flaecheM2: 30, bauteile: [
              { id: 'aw', art: 'aussenwand', flaecheM2: 20, uOverride: 1.0, anschluss: { art: 'aussen' } },
              { id: 'iw', art: 'innenwand', flaecheM2: aIw, uOverride: uIw, anschluss: { art: 'beheizt', thetaNachbarC: 15 } },
              { id: 'b', art: 'bodenKeller', flaecheM2: 30, uOverride: 1.5, anschluss: { art: 'unbeheizt', situation: 'keller' } },
            ] },
            { id: 'bad', name: 'Bad', typ: 'bad', flaecheM2: 8, bauteile: [
              { id: 'aw', art: 'aussenwand', flaecheM2: 6, uOverride: 1.0, anschluss: { art: 'aussen' } },
              { id: 'iw', art: 'innenwand', flaecheM2: aIw / 2, uOverride: uIw, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
            ] },
            { id: 'e', name: 'Eingang', typ: 'eingangsbereich', flaecheM2: 6, bauteile: [{ id: 't', art: 'tuer', flaecheM2: 2, uOverride: 2.5, anschluss: { art: 'aussen' } }] },
          ];
          const r = heizlastRaumweise({ thetaE: thetaEEingabe(thetaE), huelle: huelleLeer, baujahr: 1980, raeume }, daten);
          expect(r.saldiertRaeume.wert, `θe ${thetaE} U ${uIw} A ${aIw}`).toBeLessThanOrEqual(r.summeRaeume.wert + 1e-9);
          if (aIw === 0) expect(r.saldiertRaeume.wert).toBeCloseTo(r.summeRaeume.wert, 6);
          else expect(r.innentransmissionAnteil.wert).toBeGreaterThan(0);
          expect(r.gebaeude.wert).toBe(r.saldiertRaeume.wert);
        }
      }
    }
  });
  it('unbeheizter Raum trägt nichts bei, zählt nicht zur EBF; doppelte Raum-ID → Fehler', () => {
    const r = heizlastRaumweise({ thetaE: thetaEEingabe(-8), huelle: huelleLeer, baujahr: 1980, raeume: [
      { id: 'w', name: 'Wohnen', typ: 'wohnen', flaecheM2: 30, bauteile: [{ id: 'aw', art: 'aussenwand', flaecheM2: 20, uOverride: 1.0, anschluss: { art: 'aussen' } }] },
      { id: 'k', name: 'Keller', typ: 'kellerUnbeheizt', flaecheM2: 40, bauteile: [{ id: 'aw', art: 'aussenwand', flaecheM2: 20, uOverride: 1.0, anschluss: { art: 'aussen' } }] },
      { id: 'w', name: 'Doppelt', typ: 'wohnen', flaecheM2: 1, bauteile: [] },
    ] }, daten);
    expect(r.raeume).toHaveLength(2);
    expect(r.raeume[1]!.beheizt).toBe(false);
    expect(r.raeume[1]!.phiHL.wert).toBe(0);
    expect(r.ebf.wert).toBeCloseTo(33, 6);
    expect(r.hinweise.some((x) => x.code === 'raum.idDoppelt')).toBe(true);
  });
});
