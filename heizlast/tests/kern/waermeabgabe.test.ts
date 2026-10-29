/**
 * Wärmeabgabe / Heizkörper — Sollwerte extern (keine Werte aus dem Code abgeleitet):
 *  - Befund B1 (befund_heizkoerper.md §5): Platte Typ 22 600×1000 @55/45/20 = 842–873 W (Wissensbasis E Tab. 3.2 f_u 0.52 → 842,
 *    Kermi Profil-K 1666 W → 851, Purmo CV22 1709 W → 873).
 *  - Befund B2: Gussradiator 10 Glieder H 600 T 160 @70/55/20 = 600–780 W (V&N Kontec, 42watt, Interpolation 110/220);
 *    Kontrolle V&N-Ersatztabelle DIN 500/160: 1980 W/lfm @90/70 × 0.795 / 16.67 Glieder/m ≈ 94 W/Glied.
 *  - Befund B3: Raum 1200 W, Typ 21 600×800, Spreizung 10 K → θ_VL,req ≈ 81 °C; Typ 22 → 72; Typ 33 → 61 (Befund rechnete mit
 *    dem alten Fallback 2150 W/m², Q_N 1032 W; exakt per Bisektion 81.1 °C). Neue Tabelle (Mittel 6 Hersteller) gibt
 *    Q_N 1064 W → Toleranz ±2 K, mit Q_N 1032 W (Typenschild, n 1.3) muss 81.1 °C exakt herauskommen.
 *  - Befund HK-02: 300 W an Q_N 1620 W (n 1.3), Spreizung 20 K: exakt 46.0 °C, arithmetische Näherung 43.6 °C.
 *  - Wissensbasis E Tab. 3.5: Röhrenradiator 3-säulig H 600 = 60 W/Glied (Zehnder Charleston 60.9).
 *  - Wissensbasis E Tab. 3.3: Konvektor ohne Gebläse n 1.40 → f(45/35/20) = 0.27 (Befund HK-03).
 *  - Wissensbasis E Tab. 3.2 / Befund HK-08: Typenschild 90/70/20 → 75/65/20 Faktor 0.795 (n 1.3).
 *  - Viessmann-FBH-Kontrollwert: VA 100, Rλ,B 0.05, ΔθH 15 K → 70 W/m².
 *  - Wissensbasis E §10.3 (B2 S.242): f1 Nische typ. 7 %, f4 Baulänge 1000 mm −1 %, f5 reitend 10 K −4 %.
 */
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../src/daten/fws';
import { heizkoerperDaten } from '../../src/daten/heizkoerper';
import { siaDaten } from '../../src/daten/sia384';
import type { HeizflaecheEingabe, WaermeabgabeEingabe, WaermeabgabeRaumEingabe } from '../../src/kern/waermeabgabe';
import {
  BAUARTEN,
  bisektionVorlauf,
  dTlog,
  heizflaecheBauartWechseln,
  leistungsfaktor,
  normleistung,
  relevanteMasse,
  vorlaufNaeherungArithmetisch,
  waermeabgabe,
} from '../../src/kern/waermeabgabe';
import { eingabe, istAnnahme } from '../../src/kern/wert';
import { erwarteNahe, pruefeWert } from './hilfen';

const hk = heizkoerperDaten();
const daten = { hk, fws: fwsDaten(), sia: siaDaten() };

function raum(phi: number, heizflaechen: HeizflaecheEingabe[], o: Partial<WaermeabgabeRaumEingabe> = {}): WaermeabgabeRaumEingabe {
  return { id: o.id ?? 'r1', name: o.name ?? 'Wohnen', thetaIntC: 20, phiHLManuellW: phi, heizflaechen, ...o };
}

function einRaum(phi: number, hf: HeizflaecheEingabe[], spreizungK = 10, zusatz: Partial<WaermeabgabeEingabe> = {}) {
  const e: WaermeabgabeEingabe = { heizkreise: [{ id: 'k1', spreizungK }], raeume: [raum(phi, hf.map((x) => ({ kreisId: 'k1', ...x })))], ...zusatz };
  return waermeabgabe(e, daten);
}

describe('Primitive: log. Übertemperatur, Leistungsfaktor, Bisektion', () => {
  it('Δθ_log 75/65/20 = 49.83 K, 55/45/20 = 29.72 K, 45/35/20 = 19.58 K (Befund HK-01)', () => {
    expect(dTlog(75, 65, 20)).toBeCloseTo(49.83, 2);
    expect(dTlog(55, 45, 20)).toBeCloseTo(29.72, 2);
    expect(dTlog(45, 35, 20)).toBeCloseTo(19.58, 2);
    expect(dTlog(30, 20, 20)).toBe(0);
  });

  it('Konvektor ohne Gebläse: n aus der einen Tabelle = 1.40 → f(45/35/20) = 0.27 (Wissensbasis E Tab. 3.3, HK-03)', () => {
    const k = normleistung({ id: 'k', bauart: 'konvektor_passiv', hoeheMm: 142, tiefeMm: 93, laengeMm: 1000 }, hk);
    expect(k.n.wert).toBe(1.4);
    expect(k.n.herkunft).toBe('tabelle');
    erwarteNahe(leistungsfaktor(45, 35, 20, k.n.wert), 0.27, 1, 'f(45/35)');
    // gleiche Rechnung im Raum: Q bei 45/35 = Q_N · 0.27
    const r = einRaum(300, [{ id: 'k', bauart: 'konvektor_passiv', hoeheMm: 142, tiefeMm: 93, laengeMm: 1000 }], 10, { zielVLC: 45 });
    const hf = r.raeume[0]!.heizflaechen[0]!;
    erwarteNahe(hf.qZiel!.wert, hf.qN!.wert * 0.27, 1, 'Q(45/35)');
  });

  it('Typenschild 1000 W bei 90/70/20 → Q_N 75/65/20 = 795 W (Faktor 0.795, nicht 0.67; HK-08)', () => {
    const a = normleistung({ id: 't', bauart: 'guss_glieder', typenschild: { qNW: 1000, tVLC: 90, tRLC: 70, tRaumC: 20 } }, hk);
    erwarteNahe(a.qN!.wert, 795, 0.5, 'Q_N aus 90/70');
    expect(a.stufe).toBe('typenschild');
    expect(a.qN!.unsicherheit).toBe(2);
    pruefeWert(a.qN, 'Typenschild');
  });

  it('Bisektion exakt (Befund HK-02): 300 W an Q_N 1620 W, n 1.3, Spreizung 20 K → 46.0 °C; Näherung 43.6 °C', () => {
    const r = einRaum(300, [{ id: 'h', bauart: 'platte_22', nOverride: 1.3, typenschild: { qNW: 1620, tVLC: 75, tRLC: 65, tRaumC: 20 } }], 20);
    const t = r.raeume[0]!.tVLReq!.wert;
    expect(Math.abs(t - 46.0)).toBeLessThan(0.1);
    expect(Math.abs(vorlaufNaeherungArithmetisch(300, 1620, 1.3, 20, 20) - 43.6)).toBeLessThan(0.1);
    // Probe: Lösung erfüllt Q(θ) = Φ, Fehler < 0.1 K
    const q = (th: number) => 1620 * leistungsfaktor(th, th - 20, 20, 1.3);
    expect(q(t - 0.1)).toBeLessThan(300);
    expect(q(t + 0.1)).toBeGreaterThan(300);
  });

  it('Bisektion: null wenn unerreichbar, monoton', () => {
    expect(bisektionVorlauf((t) => t, 100, 20, 90)).toBeNull();
    expect(bisektionVorlauf((t) => t, 50, 20, 90)!).toBeCloseTo(50, 2);
  });
});

describe('Normleistung aus Bauart + Massen (ohne Marke)', () => {
  it('B1: Typ 22 600×1000 @55/45/20 im Band 842–873 W (Purmo/Kermi/KB-E); Q_N ±2 % zu Purmo 1709 W', () => {
    const a = normleistung({ id: 'b1', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 }, hk);
    erwarteNahe(a.qN!.wert, 1709, 2, 'Q_N T22 600×1000');
    const q = a.qN!.wert * leistungsfaktor(55, 45, 20, a.n.wert);
    expect(q).toBeGreaterThanOrEqual(842);
    expect(q).toBeLessThanOrEqual(873);
    expect(a.qN!.herkunft).toBe('tabelle');
    expect(a.qN!.unsicherheit).toBe(15);
    expect(a.stufe).toBe('bauartMasse');
  });

  it('B2: Guss 10 Glieder H 600 T 160 @70/55/20 im Band 600–780 W; W/Glied ±3 % zur V&N-Ersatztabelle (94 W)', () => {
    const a = normleistung({ id: 'b2', bauart: 'guss_glieder', hoeheMm: 600, tiefeMm: 160, glieder: 10 }, hk);
    const vnJeGlied = (1980 * 0.795) / (1000 / 60);
    erwarteNahe(a.qN!.wert / 10, vnJeGlied, 3, 'W/Glied gegen V&N');
    const q = a.qN!.wert * leistungsfaktor(70, 55, 20, a.n.wert);
    expect(q).toBeGreaterThanOrEqual(600);
    expect(q).toBeLessThanOrEqual(780);
    expect(q / 375).toBeGreaterThan(1.6); // altes Tool 375 W (HK-05)
  });

  it('Charleston 3-Säuler H 600 ≈ 60 W/Glied (Wissensbasis E Tab. 3.5) ±3 %; Gliederzahl aus Länge (L − 26)/46', () => {
    const a = normleistung({ id: 'c', bauart: 'roehren_3', hoeheMm: 600, glieder: 1 }, hk);
    erwarteNahe(a.qN!.wert, 60, 3, 'Röhren 3-Säuler H600');
    const b = normleistung({ id: 'c2', bauart: 'roehren_3', hoeheMm: 600, laengeMm: 20 * 46 + 26 }, hk);
    erwarteNahe(b.qN!.wert, 20 * a.qN!.wert, 0.1, '20 Glieder aus Länge');
    expect(b.hinweise.some((x) => x.code === 'waermeabgabe.glieder.ausLaenge')).toBe(true);
  });

  it('FBH: VA 100, Rλ,B 0.05 bei ΔθH 15 K ≈ 70 W/m² (Viessmann) → Bezug 35/28/20 mit n 1.10; Standardwerte markiert', () => {
    const a = normleistung({ id: 'f', bauart: 'fbh', flaecheM2: 1, verlegeabstandMm: 100, rlb: 0.05 }, hk);
    const q15 = a.qN!.wert / leistungsfaktor(35, 28, 20, 1.1, { tVL: 40, tRL: 30, tInt: 20 });
    erwarteNahe(q15, 70, 3, 'FBH q bei 15 K');
    expect(a.bezug).toEqual({ tVL: 35, tRL: 28, tInt: 20 });
    expect(a.n.wert).toBe(1.1);
    const s = normleistung({ id: 'f2', bauart: 'fbh', flaecheM2: 20 }, hk);
    expect(s.qN!.herkunft).toBe('fallback');
    expect(s.qN!.stufe).toBe('standardwert');
    expect(s.qN!.begruendung).toContain('Standardwert');
  });

  it('Modell-DB gewinnt über Tabelle (±5 %); Typenschild gewinnt über Modell (±2 %)', () => {
    const m = hk.modelle.find((x) => x.hersteller === 'Purmo' && x.bauart === 'platte_22' && x.hoeheMm === 600)!;
    const a = normleistung({ id: 'm', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000, modellId: m.id }, hk);
    expect(a.stufe).toBe('modell');
    expect(a.qN!.wert).toBe(1709); // Purmo-Datenblatt (Befund HK-07)
    expect(a.qN!.unsicherheit).toBe(5);
    const b = normleistung({ id: 'm', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000, modellId: m.id, typenschild: { qNW: 1650, tVLC: 75, tRLC: 65, tRaumC: 20 } }, hk);
    expect(b.stufe).toBe('typenschild');
    expect(b.qN!.wert).toBeCloseTo(1650, 6);
  });

  it('Monotonie: Höhe↑, Länge↑, Gliederzahl↑, Tiefe↑ ⇒ Q_N↑; T22 > T21 > T11 > T10 je Höhe', () => {
    for (const bt of ['platte_10', 'platte_11', 'platte_21', 'platte_22', 'platte_33'] as const) {
      let vorher = 0;
      for (const hh of [300, 450, 600, 750, 900, 1000]) {
        const q = normleistung({ id: 'x', bauart: bt, hoeheMm: hh, laengeMm: 1000 }, hk).qN!.wert;
        expect(q, `${bt} H${hh}`).toBeGreaterThan(vorher);
        vorher = q;
      }
    }
    for (const hh of [400, 600, 900]) {
      const q = (bt: 'platte_10' | 'platte_11' | 'platte_21' | 'platte_22') => normleistung({ id: 'x', bauart: bt, hoeheMm: hh, laengeMm: 1000 }, hk).qN!.wert;
      expect(q('platte_10')).toBeLessThan(q('platte_11'));
      expect(q('platte_11')).toBeLessThan(q('platte_21'));
      expect(q('platte_21')).toBeLessThan(q('platte_22'));
    }
    let v = 0;
    for (const t of [70, 110, 160, 220]) {
      const q = normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 580, tiefeMm: t, glieder: 10 }, hk).qN!.wert;
      expect(q, `Tiefe ${t}`).toBeGreaterThan(v);
      v = q;
    }
    const g8 = normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 980, tiefeMm: 160, glieder: 8 }, hk).qN!.wert;
    const g12 = normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 980, tiefeMm: 160, glieder: 12 }, hk).qN!.wert;
    expect(g12 / g8).toBeCloseTo(1.5, 6);
  });

  it('Guss ohne Tiefe: Standardwert 160 mm sichtbar (fallback, Unsicherheit erhöht); Höhe ausserhalb der Tabelle: extrapoliert ±25 %', () => {
    const a = normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 580, glieder: 10 }, hk);
    expect(a.qN!.herkunft).toBe('fallback');
    expect(a.qN!.begruendung).toContain('160 mm (Standardwert)');
    expect(a.qN!.unsicherheit!).toBeGreaterThan(15);
    const b = normleistung({ id: 'p', bauart: 'platte_22', hoeheMm: 1200, laengeMm: 1000 }, hk);
    expect(b.qN!.begruendung).toContain('extrapoliert');
    expect(b.qN!.unsicherheit!).toBeGreaterThanOrEqual(25);
  });

  it('Plausi Tiefe: Typ 22 mit 60 mm Tiefe → Warnung mit Typ-Vorschlag', () => {
    const a = normleistung({ id: 'p', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000, tiefeMm: 61 }, hk);
    const w = a.hinweise.find((x) => x.code === 'waermeabgabe.platte.tiefe');
    expect(w?.text).toContain('Typ 11');
  });

  it('Minderungen (E §10.3): Nische typisch −7 %; reitend 10 K bei L 1000 → f4 −1 %, f5 −4 %', () => {
    const r = einRaum(800, [{ id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000, minderungen: { nische: true, anschluss: 'reitend' } }]);
    const fm = r.raeume[0]!.heizflaechen[0]!.fm;
    erwarteNahe(fm.wert, 0.93 * 0.99 * 0.96, 0.01, 'f_m');
    expect(fm.herkunft).toBe('tabelle');
    const ohne = einRaum(800, [{ id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 }]);
    expect(ohne.raeume[0]!.heizflaechen[0]!.fm.wert).toBe(1);
    expect(r.raeume[0]!.tVLReq!.wert).toBeGreaterThan(ohne.raeume[0]!.tVLReq!.wert);
  });

  it('Gebläsekonvektor ohne Typenschild → Fehler-Hinweis; mit Typenschild n 1.10', () => {
    const a = normleistung({ id: 'g', bauart: 'konvektor_geblaese', laengeMm: 1000 }, hk);
    expect(a.qN).toBeNull();
    expect(a.hinweise.some((x) => x.code === 'waermeabgabe.geblaese.typenschild')).toBe(true);
    const b = normleistung({ id: 'g', bauart: 'konvektor_geblaese', typenschild: { qNW: 1500, tVLC: 75, tRLC: 65, tRaumC: 20 } }, hk);
    expect(b.n.wert).toBe(1.1);
  });

  it('jede Bauart liefert mit typischen Massen eine Normleistung mit Herkunft', () => {
    const masse: Record<string, Partial<HeizflaecheEingabe>> = {
      platte: { hoeheMm: 600, laengeMm: 1000 },
      glieder: { hoeheMm: 680, tiefeMm: 160, glieder: 10 },
      roehren: { hoeheMm: 600, glieder: 10 },
      konvektor: { hoeheMm: 142, tiefeMm: 93, laengeMm: 1000 },
      bad: { hoeheMm: 1172, laengeMm: 600 },
      vertikal: { hoeheMm: 1800, laengeMm: 600, designTyp: '22' },
      flaeche: { flaecheM2: 10, verlegeabstandMm: 100, belag: 'parkett', system: 'nassputz' },
    };
    for (const bt of BAUARTEN) {
      if (bt === 'konvektor_geblaese') continue;
      const kat = hk.bauarten.find((b) => b.key === bt)!.kategorie;
      const a = normleistung({ id: 'x', bauart: bt, ...masse[kat] }, hk);
      expect(a.qN, bt).not.toBeNull();
      pruefeWert(a.qN, bt);
      pruefeWert(a.n, `${bt} n`);
      expect(a.n.wert).toBe(hk.exponenten.werte[bt]);
    }
  });
});

describe('Raum: Deckung, θ_VL,req, Massnahmen', () => {
  it('B3: Raum 1200 W, Typ 21 600×800 → ≈ 81 °C; Typ 22 → 72; Typ 33 → 61 (±2 K); mit Q_N 1032 W exakt 81.1 °C', () => {
    const t = (bt: 'platte_21' | 'platte_22' | 'platte_33') => einRaum(1200, [{ id: 'h', bauart: bt, hoeheMm: 600, laengeMm: 800 }]).raeume[0]!.tVLReq!.wert;
    expect(Math.abs(t('platte_21') - 81)).toBeLessThanOrEqual(2);
    expect(Math.abs(t('platte_22') - 72)).toBeLessThanOrEqual(2);
    expect(Math.abs(t('platte_33') - 61)).toBeLessThanOrEqual(2);
    const befund = einRaum(1200, [{ id: 'h', bauart: 'platte_21', nOverride: 1.3, typenschild: { qNW: 1032, tVLC: 75, tRLC: 65, tRaumC: 20 } }]);
    expect(Math.abs(befund.raeume[0]!.tVLReq!.wert - 81.1)).toBeLessThan(0.1);
  });

  it('B3 Massnahmen: Typ-Upgrade gleiche Nische (T22, T33 mit neuer θ_VL,req), Länge bei 55 °C, FBH, Gebläse, Hybrid', () => {
    const r = einRaum(1200, [{ id: 'h', bauart: 'platte_21', hoeheMm: 600, laengeMm: 800 }]).raeume[0]!;
    expect(r.ampel).toBe('rot');
    const up = (bt: string) => r.massnahmen.find((m) => m.art === 'typUpgrade' && m.nachBauart === bt)!;
    expect(Math.abs(up('platte_22').tVLReqNeu! - 72)).toBeLessThanOrEqual(2);
    expect(Math.abs(up('platte_33').tVLReqNeu! - 61)).toBeLessThanOrEqual(2);
    const l33 = r.massnahmen.find((m) => m.art === 'laenge' && m.nachBauart === 'platte_33')!;
    expect(l33.bedarf).toBeGreaterThanOrEqual(1000); // Befund: «für 55 °C T33 mit 1.0 m Länge»
    expect(l33.bedarf).toBeLessThanOrEqual(1200);
    for (const art of ['laenge', 'fbh', 'geblaesekonvektor', 'hybrid']) expect(r.massnahmen.some((m) => m.art === art), art).toBe(true);
    // Massnahme hält: T33 1100 mm deckt bei 55 °C
    const check = einRaum(1200, [{ id: 'h', bauart: 'platte_33', hoeheMm: 600, laengeMm: l33.bedarf! }]).raeume[0]!;
    expect(check.tVLReq!.wert).toBeLessThanOrEqual(55);
  });

  it('Mischraum FBH + HK: Σ Q gegen Φ_HL (nicht jede Heizfläche einzeln, HK-19)', () => {
    const r = einRaum(
      1500,
      [
        { id: 'f', bauart: 'fbh', flaecheM2: 20, verlegeabstandMm: 100, belag: 'keramik' },
        { id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 },
      ],
      7,
      { zielVLC: 35 },
    ).raeume[0]!;
    const [fbh, hkr] = r.heizflaechen;
    erwarteNahe(r.qZiel!.wert, fbh!.qZiel!.wert + hkr!.qZiel!.wert, 0.01, 'Σ Q');
    expect(hkr!.qZiel!.wert / 1500).toBeLessThan(0.2); // einzeln wäre der HK rot
    expect(r.deckung!.wert).toBeGreaterThanOrEqual(1);
    expect(r.ampel).toBe('gruen');
    expect(r.tVLReq!.wert).toBeLessThanOrEqual(35);
  });

  it('gemischter FBH-Kreis bleibt bei seiner VL, der HK-Kreis trägt den Rest', () => {
    const e: WaermeabgabeEingabe = {
      heizkreise: [
        { id: 'fbh', tVLC: 35, spreizungK: 7, gemischt: true },
        { id: 'hk', spreizungK: 10 },
      ],
      raeume: [raum(2000, [
        { id: 'f', bauart: 'fbh', flaecheM2: 10, verlegeabstandMm: 100, rlb: 0, kreisId: 'fbh' },
        { id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000, kreisId: 'hk' },
      ])],
    };
    const r = waermeabgabe(e, daten).raeume[0]!;
    const qF = r.heizflaechen[0]!.qZiel!.wert;
    const t = r.tVLReq!.wert;
    const qH = r.heizflaechen[1]!.qN!.wert * leistungsfaktor(t, t - 10, 20, r.heizflaechen[1]!.n.wert);
    erwarteNahe(qF + qH, 2000, 0.1, 'Σ bei θ_VL,req');
  });

  it('Monotonie θ_VL,req: Φ↑, θ_int↑, Spreizung↑ ⇒ θ↑; Länge↑ ⇒ θ↓', () => {
    const hf = (l = 1000): HeizflaecheEingabe => ({ id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: l });
    const t = (phi: number, s = 10, l = 1000, ti = 20) => waermeabgabe({ heizkreise: [{ id: 'k', spreizungK: s }], raeume: [raum(phi, [{ ...hf(l), kreisId: 'k' }], { thetaIntC: ti })] }, daten).raeume[0]!.tVLReq!.wert;
    expect(t(1000)).toBeGreaterThan(t(800));
    expect(t(800, 10, 1000, 22)).toBeGreaterThan(t(800));
    expect(t(800, 15)).toBeGreaterThan(t(800, 5));
    expect(t(800, 10, 1400)).toBeLessThan(t(800));
  });

  it('Typ-Wechsel setzt Masse zurück (HK-20): T22 → FBH ohne Höhe/Länge/Modell/Typenschild; T21 → T22 behält Nische', () => {
    const alt: HeizflaecheEingabe = { id: 'h', bauart: 'platte_22', kreisId: 'k1', bezeichnung: 'Fenster', hoeheMm: 600, laengeMm: 1000, tiefeMm: 100, modellId: 'x', typenschild: { qNW: 1600, tVLC: 75, tRLC: 65, tRaumC: 20 }, minderungen: { nische: true } };
    const fbh = heizflaecheBauartWechseln(alt, 'fbh', hk);
    expect(fbh).toEqual({ id: 'h', bauart: 'fbh', kreisId: 'k1', bezeichnung: 'Fenster' });
    const t21 = heizflaecheBauartWechseln({ ...alt, bauart: 'platte_21' }, 'platte_33', hk);
    expect(t21.hoeheMm).toBe(600);
    expect(t21.laengeMm).toBe(1000);
    expect(t21.tiefeMm).toBeUndefined();
    expect(t21.modellId).toBeUndefined();
    expect(t21.typenschild).toBeUndefined();
    expect(t21.minderungen).toEqual({ nische: true });
    const guss = heizflaecheBauartWechseln({ id: 'g', bauart: 'guss_glieder', hoeheMm: 680, tiefeMm: 160, glieder: 10 }, 'stahl_glieder', hk);
    expect(guss).toMatchObject({ hoeheMm: 680, tiefeMm: 160, glieder: 10 });
    // Kern ignoriert fremde Felder: FBH mit liegengebliebenem Typenschild rechnet nur aus der Fläche
    const stale = normleistung({ id: 'f', bauart: 'fbh', flaecheM2: 5, verlegeabstandMm: 100, rlb: 0.05, typenschild: { qNW: 3000, tVLC: 75, tRLC: 65, tRaumC: 20 }, hoeheMm: 600 }, hk);
    expect(stale.qN!.wert).toBeLessThan(500);
    expect(relevanteMasse('fbh', hk)).not.toContain('hoeheMm');
    expect(relevanteMasse('guss_glieder', hk)).toEqual(expect.arrayContaining(['tiefeMm', 'glieder']));
  });

  it('alte Heizkurve als Fallback-Stufe: unbekannte Masse → Mindest-Q_N, θ_VL,req = alte VL (obere Schranke)', () => {
    const r = einRaum(1000, [{ id: 'h', bauart: 'platte_22' }], 10, { heizkurveAlt: { tVLC: 60, tRLC: 50 } }).raeume[0]!;
    const hf = r.heizflaechen[0]!;
    expect(hf.stufe).toBe('heizkurve');
    expect(hf.qN!.herkunft).toBe('schaetzung');
    erwarteNahe(hf.qN!.wert, 1000 / leistungsfaktor(60, 50, 20, 1.33), 0.1, 'Mindest-Q_N');
    expect(Math.abs(r.tVLReq!.wert - 60)).toBeLessThan(0.05);
    // ohne Heizkurve: Fehler-Hinweis, Raum grau
    const ohne = einRaum(1000, [{ id: 'h', bauart: 'platte_22' }]).raeume[0]!;
    expect(ohne.ampel).toBe('grau');
    expect(ohne.hinweise.some((x) => x.code === 'waermeabgabe.masse.fehlen')).toBe(true);
  });

  it('Raum mit Φ_HL ≤ 0 (Innengewinne) → keine VL-Anforderung', () => {
    const r = einRaum(-50, [{ id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 }]).raeume[0]!;
    expect(r.tVLReq).toBeNull();
    expect(r.ampel).toBe('gruen');
  });
});

describe('Gebäude: Auslegungs-VL, Ampel, kritische Räume', () => {
  const raeume = (): WaermeabgabeRaumEingabe[] => [
    raum(600, [{ id: 'a', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1200 }], { id: 'schlafen', name: 'Schlafen' }),
    raum(1200, [{ id: 'b', bauart: 'platte_21', hoeheMm: 600, laengeMm: 800 }], { id: 'wohnen', name: 'Wohnen' }),
    raum(700, [{ id: 'c', bauart: 'guss_glieder', hoeheMm: 580, tiefeMm: 160, glieder: 10 }], { id: 'kueche', name: 'Küche' }),
    raum(450, [{ id: 'd', bauart: 'bad_handtuch', hoeheMm: 1172, laengeMm: 600 }], { id: 'bad', name: 'Bad', thetaIntC: 22 }),
  ];

  it('Auslegungs-VL = max θ_VL,req, Top 3 absteigend, Ampel > 65 rot mit Klartext', () => {
    const r = waermeabgabe({ raeume: raeume() }, daten);
    const g = r.gebaeude;
    const tReq = r.raeume.map((x) => x.tVLReq!.wert);
    expect(g.auslegungsVL!.wert).toBeCloseTo(Math.max(...tReq), 6);
    expect(g.massgebenderRaum!.name).toBe('Wohnen');
    expect(g.kritischeRaeume).toHaveLength(3);
    const k = g.kritischeRaeume.map((x) => x.tVLReq!);
    expect(k[0]!).toBeGreaterThanOrEqual(k[1]!);
    expect(k[1]!).toBeGreaterThanOrEqual(k[2]!);
    expect(g.ampel).toBe('rot');
    expect(g.urteil).toContain('Ungeeignet');
    expect(g.urteil).toContain('Wohnen');
    pruefeWert(g.auslegungsVL, 'auslegungsVL');
  });

  it('Ausklammern: Wohnen raus → nächster Raum massgebend, Raum gelistet', () => {
    const rr = raeume();
    rr[1]!.ausklammern = true;
    rr[1]!.ausklammernGrund = 'wird saniert';
    const r = waermeabgabe({ raeume: rr }, daten);
    expect(r.gebaeude.massgebenderRaum!.name).not.toBe('Wohnen');
    expect(r.gebaeude.ausgeklammert).toEqual([{ raumId: 'wohnen', name: 'Wohnen', grund: 'wird saniert' }]);
    expect(r.gebaeude.auslegungsVL!.wert).toBeLessThan(waermeabgabe({ raeume: raeume() }, daten).gebaeude.auslegungsVL!.wert);
  });

  it('Ampel-Schwellen ≤ 55 gut / 55–65 kritisch / > 65 ungeeignet', () => {
    const t = (l: number) => waermeabgabe({ heizkreise: [{ id: 'k', spreizungK: 10 }], raeume: [raum(1000, [{ id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: l, kreisId: 'k' }])] }, daten).gebaeude;
    const gut = t(2000);
    expect(gut.auslegungsVL!.wert).toBeLessThanOrEqual(55);
    expect(gut.ampel).toBe('gruen');
    const krit = t(1000);
    expect(krit.auslegungsVL!.wert).toBeGreaterThan(55);
    expect(krit.auslegungsVL!.wert).toBeLessThanOrEqual(65);
    expect(krit.ampel).toBe('gelb');
    expect(t(600).ampel).toBe('rot');
  });

  it('Override gewinnt mit Hinweis; zu tiefer Override warnt', () => {
    const r = waermeabgabe({ raeume: raeume(), auslegungsVLOverrideC: 50 }, daten);
    expect(r.gebaeude.auslegungsVL!.herkunft).toBe('override');
    expect(r.gebaeude.auslegungsVL!.wert).toBe(50);
    expect(r.gebaeude.auslegungsVLAusHeizflaechen!.wert).toBeGreaterThan(65);
    expect(r.hinweise.some((x) => x.code === 'waermeabgabe.gebaeude.overrideZuTief')).toBe(true);
    expect(r.annahmen.some((a) => a.herkunft === 'override')).toBe(true);
  });

  it('unerreichbar (> 90 °C) → Auslegungs-VL 90 °C, rot', () => {
    const r = einRaum(3000, [{ id: 'h', bauart: 'platte_11', hoeheMm: 300, laengeMm: 600 }]);
    expect(r.raeume[0]!.erreichbar).toBe(false);
    expect(r.gebaeude.auslegungsVL!.wert).toBe(90);
    expect(r.gebaeude.ampel).toBe('rot');
    expect(r.gebaeude.kritischeRaeume[0]!.tVLReq).toBeNull();
  });
});

describe('FWS-Modus ohne raumweise Heizlast', () => {
  it('Φ_HL,Raum = Q_hl / EBF × 1.10 × A_Raum (Schätzung ±25 %), Heizflächen-Check läuft', () => {
    const r = waermeabgabe(
      {
        verteilung: { qhl: eingabe(8000, 'W', 'Q_hl FWS'), ebfM2: 150 },
        raeume: [{ id: 'w', name: 'Wohnen', flaecheM2: 30, heizflaechen: [{ id: 'g', bauart: 'guss_glieder', hoeheMm: 680, tiefeMm: 160, glieder: 20 }] }],
      },
      daten,
    );
    const rr = r.raeume[0]!;
    erwarteNahe(rr.phiHL!.wert, (8000 / 150) * 1.1 * 30, 0.01, 'Φ_HL verteilt');
    expect(rr.phiHL!.herkunft).toBe('schaetzung');
    expect(rr.phiHL!.unsicherheit).toBe(25);
    expect(rr.thetaInt.herkunft).toBe('fallback');
    expect(rr.tVLReq).not.toBeNull();
    expect(r.gebaeude.auslegungsVL).not.toBeNull();
    expect(r.annahmen.some((a) => a.stufe === 'verteilung')).toBe(true);
  });

  it('ohne EBF: Anteil der erfassten Raumflächen mit Hinweis', () => {
    const r = waermeabgabe(
      {
        verteilung: { qhl: eingabe(6000, 'W') },
        raeume: [
          { id: 'a', name: 'A', flaecheM2: 20, heizflaechen: [{ id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 }] },
          { id: 'b', name: 'B', flaecheM2: 40, typ: 'bad', heizflaechen: [{ id: 'i', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1600 }] },
        ],
      },
      daten,
    );
    expect(r.raeume[0]!.phiHL!.wert).toBeCloseTo(2000, 6);
    expect(r.raeume[1]!.phiHL!.wert).toBeCloseTo(4000, 6);
    expect(r.raeume[1]!.thetaInt.wert).toBe(22); // Raumtyp Bad (SIA, Entscheid Daniel)
    expect(r.hinweise.some((x) => x.code === 'waermeabgabe.verteilung.anteil')).toBe(true);
  });

  it('ohne Räume/Heizflächen: Auslegungs-VL aus Heizkreis, sonst null mit Hinweis', () => {
    const k = waermeabgabe({ heizkreise: [{ id: 'k', tVLC: 50 }, { id: 'k2', tVLC: 45 }], raeume: [] }, daten);
    expect(k.gebaeude.auslegungsVL!.wert).toBe(50);
    expect(k.gebaeude.auslegungsVL!.stufe).toBe('heizkreis');
    expect(k.gebaeude.ampel).toBe('gruen');
    const leer = waermeabgabe({ raeume: [] }, daten);
    expect(leer.gebaeude.auslegungsVL).toBeNull();
    expect(leer.gebaeude.ampel).toBe('grau');
    expect(leer.vollstaendig).toBe(false);
  });
});

describe('Herkunft an jedem Wert', () => {
  it('Räume, Heizflächen, Gebäude: jeder Wert mit Herkunft und Begründung; annahmen nur Nicht-Eingaben, ohne Dubletten', () => {
    const r = waermeabgabe(
      {
        raeume: [
          raum(1200, [{ id: 'b', bauart: 'platte_21', hoeheMm: 600, laengeMm: 800, minderungen: { verkleidung: true } }, { id: 'f', bauart: 'fbh', flaecheM2: 8 }], { id: 'w', name: 'Wohnen' }),
          raum(500, [{ id: 'c', bauart: 'roehren_4', hoeheMm: 900, laengeMm: 600 }], { id: 's', name: 'Schlafen' }),
        ],
      },
      daten,
    );
    for (const rr of r.raeume) {
      pruefeWert(rr.thetaInt, `${rr.name} θ_int`);
      pruefeWert(rr.phiHL, `${rr.name} Φ_HL`);
      pruefeWert(rr.qZiel, `${rr.name} ΣQ`);
      pruefeWert(rr.deckung, `${rr.name} Deckung`);
      pruefeWert(rr.tVLReq, `${rr.name} θ_VL,req`);
      pruefeWert(rr.vlZiel, `${rr.name} Ziel-VL`);
      for (const hf of rr.heizflaechen) {
        for (const [k, w] of Object.entries({ qN: hf.qN, n: hf.n, fm: hf.fm, spreizung: hf.spreizung, vlZiel: hf.vlZiel, qZiel: hf.qZiel })) pruefeWert(w, `${rr.name}/${hf.id} ${k}`);
      }
    }
    pruefeWert(r.gebaeude.auslegungsVL, 'auslegungsVL');
    expect(r.annahmen.length).toBeGreaterThan(0);
    for (const a of r.annahmen) expect(istAnnahme(a)).toBe(true);
    const keys = r.annahmen.map((a) => `${a.herkunft}|${a.begruendung}|${String(a.wert)}`);
    expect(new Set(keys).size).toBe(keys.length);
    // Standardwerte sind als solche markiert (Daniel 29.10.)
    expect(r.annahmen.some((a) => a.stufe === 'standardwert' && a.begruendung.includes('Spreizung 10 K'))).toBe(true);
    expect(r.annahmen.some((a) => a.stufe === 'standardwert' && a.begruendung.includes('Ziel-Vorlauf 55'))).toBe(true);
  });
});
