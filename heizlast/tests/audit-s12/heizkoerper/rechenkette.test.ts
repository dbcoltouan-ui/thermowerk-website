/**
 * Audit S12 (heizkoerper) — Probe Rechenkette (Zielbild befund_heizkoerper.md §6.2).
 *
 * Sollwerte ausschliesslich extern (nicht aus dem Neubau-Code abgeleitet):
 *  - Befund §5 B1/B2/B3, HK-02 (Bisektion), HK-03 (Konvektor n 1.40 → f(45/35) 0.27), HK-05/06 (Tiefe/Höhe als
 *    Rechengrössen; Purmo C22 W/m² Front 3206/2847/2653 für H300/600/900), HK-08 (90/70 → 75/65 = 0.795).
 *  - Datenblätter laut docs/datenquellen.md §6 bzw. docs/recherche/2026-10-29_*.md: Purmo Compact 22/600 1709 W/m,
 *    Kermi Profil-K 22/600 1666 W/m, HG-TEC Guss DIN 4703 NA 500 × T 110/160/220 = 72/96/122 W/Glied, V&N 500/160
 *    1980 W/lfm @90/70, Zehnder Charleston H600 2–6 Säuler 45.3/60.9/79.8/98.6/117 W/Element.
 *  - Wissensbasis E Tab. 3.5 (Röhren H600: 44/60/77/95/113 W/Glied), Tab. 3.2 (fᵤ 55/45 = 0.52), Tab. 3.3 (n).
 * Eigene Hilfsrechnung (Δθ_log, Bisektion) ist hier unabhängig implementiert — kein Import der Kern-Primitive für die
 * Sollwerte; der Kern wird nur über seine öffentliche API aufgerufen.
 */
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../../src/daten/fws';
import { heizkoerperDaten } from '../../../src/daten/heizkoerper';
import { siaDaten } from '../../../src/daten/sia384';
import type { HeizflaecheEingabe, WaermeabgabeEingabe } from '../../../src/kern/waermeabgabe';
import { normleistung, vorlaufNaeherungArithmetisch, waermeabgabe } from '../../../src/kern/waermeabgabe';

const hk = heizkoerperDaten();
const daten = { hk, fws: fwsDaten(), sia: siaDaten() };

/* ---------- unabhängige Referenzrechnung (EN 442-2) ---------- */
const dtl = (tv: number, tr: number, ti: number) => (tv - tr) / Math.log((tv - ti) / (tr - ti));
const DTN = dtl(75, 65, 20); // 49.83 K
const f = (tv: number, tr: number, ti: number, n: number) => Math.pow(dtl(tv, tr, ti) / DTN, n);
/** θ_VL mit Σ Q_N·f(θ, θ−Δ, θi)^n = Φ, eigene Bisektion (60 Schritte). */
function vlReqRef(teile: { qN: number; n: number }[], phi: number, spreiz: number, ti = 20): number {
  let lo = ti + spreiz + 0.01;
  let hi = 120;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    const q = teile.reduce((s, t) => s + t.qN * f(m, m - spreiz, ti, t.n), 0);
    if (q < phi) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
const pct = (ist: number, soll: number) => (Math.abs(ist - soll) / Math.abs(soll)) * 100;

function einRaum(phi: number, hf: HeizflaecheEingabe[], spreizungK = 10, zusatz: Partial<WaermeabgabeEingabe> = {}) {
  const e: WaermeabgabeEingabe = { heizkreise: [{ id: 'k1', spreizungK }], raeume: [{ id: 'r1', name: 'Wohnen', thetaIntC: 20, phiHLManuellW: phi, heizflaechen: hf.map((x) => ({ kreisId: 'k1', ...x })) }], ...zusatz };
  return waermeabgabe(e, daten);
}

describe('Audit HK — Primitive gegen externe Kontrollwerte', () => {
  it('Konvektor ohne Gebläse: n 1.40 aus der einen Tabelle → f(45/35/20) = 0.270 (HK-03); Gebläse 1.10 (nicht 1.10 für passiv)', () => {
    const k = normleistung({ id: 'k', bauart: 'konvektor_passiv', hoeheMm: 142, tiefeMm: 93, laengeMm: 1000 }, hk);
    expect(k.n.wert).toBe(1.4);
    expect(k.n.quelle).toBeTruthy();
    // Kern-Leistung bei 45/35 gegen eigene Rechnung mit n 1.4
    const r = einRaum(300, [{ id: 'k', bauart: 'konvektor_passiv', hoeheMm: 142, tiefeMm: 93, laengeMm: 1000 }], 10, { zielVLC: 45 });
    const hf = r.raeume[0]!.heizflaechen[0]!;
    expect(pct(hf.qZiel!.wert / hf.qN!.wert, 0.27)).toBeLessThan(1);
    expect(pct(hf.qZiel!.wert / hf.qN!.wert, f(45, 35, 20, 1.4))).toBeLessThan(0.1);
    // Faktor mit n 1.10 wäre 0.358 (+33 %) — darf nicht herauskommen
    expect(hf.qZiel!.wert / hf.qN!.wert).toBeLessThan(0.30);
    const g = normleistung({ id: 'g', bauart: 'konvektor_geblaese', typenschild: { qNW: 1500, tVLC: 75, tRLC: 65, tRaumC: 20 } }, hk);
    expect(g.n.wert).toBe(1.1);
  });

  it('Umrechnung 90/70/20 → 75/65/20 = 0.795 (HK-08, nicht 0.67): Typenschild 1000 W → 795 W', () => {
    const a = normleistung({ id: 't', bauart: 'guss_glieder', typenschild: { qNW: 1000, tVLC: 90, tRLC: 70, tRaumC: 20 } }, hk);
    expect(pct(a.qN!.wert, 1000 * Math.pow(DTN / dtl(90, 70, 20), 1.3))).toBeLessThan(0.2);
    expect(pct(a.qN!.wert, 795)).toBeLessThan(0.5);
    expect(a.qN!.unsicherheit).toBe(2);
  });

  it('Bisektion exakt mit log. Übertemperatur (HK-02): 300 W an Q_N 1620 W, n 1.3, Spreizung 20 K → 46.0 °C (eigene Bisektion < 0.1 K); Näherung 43.6 °C', () => {
    const r = einRaum(300, [{ id: 'h', bauart: 'platte_22', nOverride: 1.3, typenschild: { qNW: 1620, tVLC: 75, tRLC: 65, tRaumC: 20 } }], 20);
    const t = r.raeume[0]!.tVLReq!.wert;
    const ref = vlReqRef([{ qN: 1620, n: 1.3 }], 300, 20);
    expect(Math.abs(t - ref)).toBeLessThan(0.1);
    expect(Math.abs(ref - 46.0)).toBeLessThan(0.1);
    expect(Math.abs(vorlaufNaeherungArithmetisch(300, 1620, 1.3, 20, 20) - 43.6)).toBeLessThan(0.1);
    // Die Näherung weicht hier 2.4 K ab — der Kern darf sie nicht verwenden
    expect(Math.abs(t - 43.6)).toBeGreaterThan(2);
  });
});

describe('Audit HK — Normleistung ohne Marke (HK-04/05/06/16)', () => {
  it('B1: Typ 22 600×1000 @55/45/20 → 842–873 W; Q_N im Band der Datenblätter Kermi 1666 … Purmo 1709 ±2 %', () => {
    const a = normleistung({ id: 'b1', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 }, hk);
    expect(a.stufe).toBe('bauartMasse');
    expect(a.qN!.wert).toBeGreaterThanOrEqual(1666 * 0.98);
    expect(a.qN!.wert).toBeLessThanOrEqual(1709 * 1.02);
    const q5545 = a.qN!.wert * f(55, 45, 20, a.n.wert);
    expect(q5545).toBeGreaterThanOrEqual(842);
    expect(q5545).toBeLessThanOrEqual(873);
    // Wissensbasis E Tab. 3.2: fᵤ(55/45) = 0.52 (n 1.30, gerundet) → Kern-Faktor mit n 1.33 im ±4 %
    expect(pct(f(55, 45, 20, a.n.wert), 0.52)).toBeLessThan(4);
  });

  it('HK-04 n. z.: ohne Masse keine stille Pauschale (kein 1000 W/m²) — Q_N null, Fehler-Hinweis, Raum grau', () => {
    const r = waermeabgabe({ raeume: [{ id: 'w', name: 'W', thetaIntC: 20, phiHLManuellW: 1000, heizflaechen: [{ id: 'p', bauart: 'platte_22' }] }] }, daten);
    expect(r.raeume[0]!.heizflaechen[0]!.qN).toBeNull();
    expect(r.raeume[0]!.ampel).toBe('grau');
    expect(r.hinweise.some((h) => h.stufe === 'fehler' && h.code === 'waermeabgabe.masse.fehlen')).toBe(true);
    expect(r.gebaeude.auslegungsVL).toBeNull();
    expect(r.vollstaendig).toBe(false);
  });

  it('HK-06: Höhe ist Rechengrösse — T22 L1000: W/m steigt H300→H900, W/m² Front fällt; ±6 % zu Purmo C22 (3206/2847/2653 W/m²)', () => {
    const purmoFront: Record<number, number> = { 300: 3206, 600: 2847, 900: 2653 };
    let wVor = 0;
    let frontVor = Infinity;
    for (const h of [300, 600, 900]) {
      const a = normleistung({ id: 'x', bauart: 'platte_22', hoeheMm: h, laengeMm: 1000 }, hk);
      const w = a.qN!.wert;
      const front = w / (h / 1000);
      expect(w).toBeGreaterThan(wVor);
      expect(front).toBeLessThan(frontVor);
      expect(pct(front, purmoFront[h]!), `H${h}`).toBeLessThan(6);
      wVor = w;
      frontVor = front;
    }
    // Zwischenhöhe wird interpoliert, Höhe ausserhalb 300–900 proportional mit erhöhter Unsicherheit und Kennzeichnung
    const z = normleistung({ id: 'x', bauart: 'platte_22', hoeheMm: 450, laengeMm: 1000 }, hk).qN!.wert;
    expect(z).toBeGreaterThan(normleistung({ id: 'x', bauart: 'platte_22', hoeheMm: 400, laengeMm: 1000 }, hk).qN!.wert);
    expect(z).toBeLessThan(normleistung({ id: 'x', bauart: 'platte_22', hoeheMm: 500, laengeMm: 1000 }, hk).qN!.wert);
    const hoch = normleistung({ id: 'x', bauart: 'platte_22', hoeheMm: 1200, laengeMm: 1000 }, hk).qN!;
    expect(hoch.unsicherheit!).toBeGreaterThan(15);
    expect(hoch.begruendung).toMatch(/extrapoliert/);
    // Kermi Profil-K Typ 10: H300 335 W/m, H900 872 W/m (Befund HK-06) — Tabelle ±5 %
    expect(pct(normleistung({ id: 'x', bauart: 'platte_10', hoeheMm: 300, laengeMm: 1000 }, hk).qN!.wert, 335)).toBeLessThan(5);
    expect(pct(normleistung({ id: 'x', bauart: 'platte_10', hoeheMm: 900, laengeMm: 1000 }, hk).qN!.wert, 872)).toBeLessThan(5);
  });

  it('HK-05: Tiefe und Gliederzahl sind Rechengrössen — Guss H600 (DIN 580/NA 500) T110/160/220 = 72/96/122 W/Glied (HG-TEC ±3 %), ×Glieder linear', () => {
    const hgtec: Record<number, number> = { 110: 72, 160: 96, 220: 122 };
    let vor = 0;
    for (const t of [110, 160, 220]) {
      const a = normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 600, tiefeMm: t, glieder: 10 }, hk);
      const jeGlied = a.qN!.wert / 10;
      expect(pct(jeGlied, hgtec[t]!), `T${t}`).toBeLessThan(3);
      expect(jeGlied).toBeGreaterThan(vor);
      vor = jeGlied;
    }
    // V&N Ersatztabelle 500/160: 1980 W/lfm @90/70 × 0.795 / 16.67 Glieder = 94.4 W/Glied → Kern ±3 %
    const vn = (1980 * Math.pow(DTN / dtl(90, 70, 20), 1.3)) / (1000 / 60);
    expect(pct(normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 600, tiefeMm: 160, glieder: 1 }, hk).qN!.wert, vn)).toBeLessThan(3);
    const g5 = normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 600, tiefeMm: 160, glieder: 5 }, hk).qN!.wert;
    const g15 = normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 600, tiefeMm: 160, glieder: 15 }, hk).qN!.wert;
    expect(g15 / g5).toBeCloseTo(3, 6);
    // Tiefe weggelassen → Standardwert 160 mm sichtbar als fallback/standardwert, nicht still
    const ohne = normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 600, glieder: 10 }, hk);
    expect(ohne.qN!.herkunft).toBe('fallback');
    expect(ohne.qN!.stufe).toBe('standardwert');
    expect(ohne.qN!.begruendung).toContain('Standardwert');
  });

  it('B2: Guss 10 Glieder H600 T160 @70/55/20 → 600–780 W (Befund-Band), Faktor ≥ 1.6 zum alten Tool (375 W)', () => {
    const a = normleistung({ id: 'b2', bauart: 'guss_glieder', hoeheMm: 600, tiefeMm: 160, glieder: 10 }, hk);
    const q = a.qN!.wert * f(70, 55, 20, a.n.wert);
    expect(q).toBeGreaterThanOrEqual(600);
    expect(q).toBeLessThanOrEqual(780);
    expect(q / 375).toBeGreaterThan(1.6);
    // im Raum: dieselbe Zahl (eine Rechnung)
    const r = einRaum(700, [{ id: 'b2', bauart: 'guss_glieder', hoeheMm: 600, tiefeMm: 160, glieder: 10 }], 15, { zielVLC: 70 });
    expect(pct(r.raeume[0]!.heizflaechen[0]!.qZiel!.wert, q)).toBeLessThan(0.01);
  });

  it('Charleston 2–6-Säuler H600: 45.3/60.9/79.8/98.6/117 W/Element (Zehnder) und Wissensbasis E Tab. 3.5 (44/60/77/95/113) ±5 %', () => {
    const zehnder: Record<string, number> = { roehren_2: 45.3, roehren_3: 60.9, roehren_4: 79.8, roehren_5: 98.6, roehren_6: 117 };
    const wb: Record<string, number> = { roehren_2: 44, roehren_3: 60, roehren_4: 77, roehren_5: 95, roehren_6: 113 };
    for (const b of Object.keys(zehnder) as (keyof typeof zehnder & HeizflaecheEingabe['bauart'])[]) {
      const a = normleistung({ id: 'c', bauart: b, hoeheMm: 600, glieder: 1 }, hk);
      expect(pct(a.qN!.wert, zehnder[b]!), b).toBeLessThan(0.5);
      expect(pct(a.qN!.wert, wb[b]!), `${b} vs Wissensbasis`).toBeLessThan(5);
    }
    // 3-Säuler ≈ 60 W/Glied (Auftrag); Gliederzahl aus Länge (L − 26)/46; H750 = 75 (Wissensbasis)
    expect(pct(normleistung({ id: 'c', bauart: 'roehren_3', hoeheMm: 600, glieder: 1 }, hk).qN!.wert, 60)).toBeLessThan(3);
    expect(normleistung({ id: 'c', bauart: 'roehren_3', hoeheMm: 600, laengeMm: 20 * 46 + 26 }, hk).qN!.wert).toBeCloseTo(20 * 60.9, 3);
    expect(pct(normleistung({ id: 'c', bauart: 'roehren_3', hoeheMm: 750, glieder: 1 }, hk).qN!.wert, 75)).toBeLessThan(3);
  });
});

describe('Audit HK — Raum und Gebäude (HK-12/19/20)', () => {
  it('B3: Raum 1200 W, T21 600×800 → ≈ 81 °C, T22 → 72, T33 → 61 (±2 K); Kern-Bisektion = eigene Bisektion (< 0.1 K); mit Q_N 1032 W/n 1.3 exakt 81.1 °C', () => {
    const soll: Record<string, number> = { platte_21: 81, platte_22: 72, platte_33: 61 };
    for (const bt of ['platte_21', 'platte_22', 'platte_33'] as const) {
      const r = einRaum(1200, [{ id: 'h', bauart: bt, hoeheMm: 600, laengeMm: 800 }]);
      const hf = r.raeume[0]!.heizflaechen[0]!;
      const t = r.raeume[0]!.tVLReq!.wert;
      // eigene Bisektion mit Q_N und n des Kerns → Rechenweg stimmt
      expect(Math.abs(t - vlReqRef([{ qN: hf.qN!.wert, n: hf.n.wert }], 1200, 10)), bt).toBeLessThan(0.1);
      expect(Math.abs(t - soll[bt]!), bt).toBeLessThanOrEqual(2);
    }
    // Befund rechnete mit Q_N 1032 W (alter Fallback 2150 W/m² × 0.48 m²) und n 1.3 → 81.1 °C: so muss es exakt herauskommen
    const befund = einRaum(1200, [{ id: 'h', bauart: 'platte_21', nOverride: 1.3, typenschild: { qNW: 1032, tVLC: 75, tRLC: 65, tRaumC: 20 } }]);
    expect(Math.abs(befund.raeume[0]!.tVLReq!.wert - 81.1)).toBeLessThan(0.1);
    // Begründung der ±2-K-Toleranz (PROTOKOLL S5): Differenz kommt allein aus Q_N (Tabelle 1064 W statt 1032 W)
    const neu = einRaum(1200, [{ id: 'h', bauart: 'platte_21', hoeheMm: 600, laengeMm: 800 }]).raeume[0]!;
    expect(pct(neu.heizflaechen[0]!.qN!.wert, 1064)).toBeLessThan(0.5);
    const mitAltemQn = vlReqRef([{ qN: 1032, n: neu.heizflaechen[0]!.n.wert }], 1200, 10);
    expect(Math.abs(mitAltemQn - 81)).toBeLessThan(1);
  });

  it('B3 Massnahmen als Sätze: Typ-Upgrade gleiche Nische (T22 → ≈ 72, T33 → ≈ 61), Länge T33 für 55 °C ≈ 1.0–1.2 m, FBH, Gebläse, Hybrid', () => {
    const r = einRaum(1200, [{ id: 'h', bauart: 'platte_21', hoeheMm: 600, laengeMm: 800 }]).raeume[0]!;
    expect(r.ampel).toBe('rot');
    const up = (bt: string) => r.massnahmen.find((m) => m.art === 'typUpgrade' && m.nachBauart === bt)!;
    expect(Math.abs(up('platte_22').tVLReqNeu! - 72)).toBeLessThanOrEqual(2);
    expect(Math.abs(up('platte_33').tVLReqNeu! - 61)).toBeLessThanOrEqual(2);
    const l33 = r.massnahmen.find((m) => m.art === 'laenge' && m.nachBauart === 'platte_33')!;
    expect(l33.bedarf!).toBeGreaterThanOrEqual(1000);
    expect(l33.bedarf!).toBeLessThanOrEqual(1200);
    for (const art of ['laenge', 'fbh', 'geblaesekonvektor', 'hybrid']) expect(r.massnahmen.some((m) => m.art === art), art).toBe(true);
    for (const m of r.massnahmen) expect(m.text.length).toBeGreaterThan(20);
  });

  it('HK-19: Mischraum FBH 20 m² + T22 600×1000 bei 35/28 — Σ Q gegen Φ_HL 1500 W; HK allein ≈ 231 W (rot), Raum grün', () => {
    const r = einRaum(1500, [
      { id: 'f', bauart: 'fbh', flaecheM2: 20, verlegeabstandMm: 100, belag: 'keramik' },
      { id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 },
    ], 7, { zielVLC: 35 }).raeume[0]!;
    const [fbh, hkr] = r.heizflaechen;
    // HK bei 35/28/20: Q_N × f(n 1.33) — Befund HK-19 nennt 231 W
    expect(pct(hkr!.qZiel!.wert, hkr!.qN!.wert * f(35, 28, 20, hkr!.n.wert))).toBeLessThan(0.1);
    expect(pct(hkr!.qZiel!.wert, 231)).toBeLessThan(3);
    expect(hkr!.qZiel!.wert / 1500).toBeLessThan(0.85); // einzeln wäre der HK rot
    expect(fbh!.qZiel!.wert).toBeGreaterThan(1000);
    expect(pct(r.qZiel!.wert, fbh!.qZiel!.wert + hkr!.qZiel!.wert)).toBeLessThan(0.01);
    expect(r.deckung!.wert).toBeGreaterThanOrEqual(1);
    expect(r.ampel).toBe('gruen');
    expect(r.tVLReq!.wert).toBeLessThanOrEqual(35);
    expect(r.massnahmen).toEqual([]);
  });

  it('Gebäude: Auslegungs-VL = max θ_VL,req, Top 3, massgebender Raum, Ampel ≤55/≤65/>65 mit Klartext; Ausklammern wirkt', () => {
    const raeume = (): WaermeabgabeEingabe['raeume'] => [
      { id: 'schlafen', name: 'Schlafen', thetaIntC: 20, phiHLManuellW: 600, heizflaechen: [{ id: 'a', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1200 }] },
      { id: 'wohnen', name: 'Wohnen', thetaIntC: 20, phiHLManuellW: 1200, heizflaechen: [{ id: 'b', bauart: 'platte_21', hoeheMm: 600, laengeMm: 800 }] },
      { id: 'kueche', name: 'Küche', thetaIntC: 20, phiHLManuellW: 700, heizflaechen: [{ id: 'c', bauart: 'guss_glieder', hoeheMm: 580, tiefeMm: 160, glieder: 10 }] },
      { id: 'bad', name: 'Bad', thetaIntC: 22, phiHLManuellW: 450, heizflaechen: [{ id: 'd', bauart: 'bad_handtuch', hoeheMm: 1172, laengeMm: 600 }] },
    ];
    const r = waermeabgabe({ raeume: raeume() }, daten);
    const g = r.gebaeude;
    const max = Math.max(...r.raeume.map((x) => x.tVLReq!.wert));
    expect(g.auslegungsVL!.wert).toBeCloseTo(max, 6);
    expect(g.massgebenderRaum!.name).toBe('Wohnen');
    expect(g.kritischeRaeume.map((x) => x.name)[0]).toBe('Wohnen');
    expect(g.kritischeRaeume).toHaveLength(3);
    expect(g.ampel).toBe('rot');
    expect(g.urteil).toMatch(/Ungeeignet/);
    expect(g.raeumeBewertet).toBe(4);
    const rr = raeume();
    rr[1]!.ausklammern = true;
    rr[1]!.ausklammernGrund = 'wird saniert';
    const o = waermeabgabe({ raeume: rr }, daten);
    expect(o.gebaeude.massgebenderRaum!.name).not.toBe('Wohnen');
    expect(o.gebaeude.auslegungsVL!.wert).toBeLessThan(max);
    expect(o.gebaeude.ausgeklammert[0]).toMatchObject({ name: 'Wohnen', grund: 'wird saniert' });
    // Ampelgrenzen
    const t = (l: number) => einRaum(1000, [{ id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: l }]).gebaeude;
    expect(t(2000).ampel).toBe('gruen');
    expect(t(2000).auslegungsVL!.wert).toBeLessThanOrEqual(55);
    expect(t(1000).ampel).toBe('gelb');
    expect(t(600).ampel).toBe('rot');
  });

  it('Spreizung je Heizkreis ist Parameter (HK-02): 5 K statt 10 K senkt θ_VL,req um 1–3 K', () => {
    const t10 = einRaum(1000, [{ id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 }], 10).raeume[0]!.tVLReq!.wert;
    const t5 = einRaum(1000, [{ id: 'h', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 }], 5).raeume[0]!.tVLReq!.wert;
    expect(t10 - t5).toBeGreaterThan(1);
    expect(t10 - t5).toBeLessThan(3.5);
    expect(Math.abs(t5 - vlReqRef([{ qN: 1697, n: 1.33 }], 1000, 5))).toBeLessThan(0.3);
  });
});

describe('Audit HK — Grenzfälle (neue Befunde prüfen)', () => {
  it('Gemischter FBH-Kreis zu klein (behoben S12): Mischer-Grenze gemeldet, θ_VL,req ohne Deckel, Gebäude-VL nicht 90 °C, keine FBH-Massnahme für einen FBH-Raum', () => {
    const r = waermeabgabe(
      {
        heizkreise: [{ id: 'fbh', tVLC: 35, spreizungK: 7, gemischt: true }],
        raeume: [{ id: 'w', name: 'Wohnen', thetaIntC: 20, phiHLManuellW: 1500, heizflaechen: [{ id: 'f', bauart: 'fbh', flaecheM2: 20, verlegeabstandMm: 100, rlb: 0, kreisId: 'fbh' }] }],
      },
      daten,
    );
    // Befund §3.1 (MITTEL), behoben: der Deckel des Mischers ist die Grenze, nicht die Heizfläche (FBH 20 m² deckt 1 500 W bei ≈ 40 °C)
    const w = r.raeume[0]!;
    expect(w.mischerGrenze).not.toBeNull();
    expect(w.mischerGrenze!.kreisVLC).toBe(35);
    expect(w.mischerGrenze!.qBeiKreisVL).toBeLessThan(1500);
    expect(w.tVLReq).not.toBeNull();
    expect(w.tVLReq!.wert).toBeGreaterThan(35);
    expect(w.tVLReq!.wert).toBeLessThan(90);
    expect(w.tVLReq!.begruendung).toContain('ohne Mischer-Grenze');
    expect(w.hinweise.some((x) => x.code === 'waermeabgabe.raum.mischerGrenze' && /35 °C/.test(x.text))).toBe(true);
    expect(w.hinweise.some((x) => x.code === 'waermeabgabe.raum.nichtErreichbar')).toBe(false);
    expect(r.gebaeude.auslegungsVL!.wert).toBeCloseTo(w.tVLReq!.wert, 6);
    expect(r.gebaeude.urteil).not.toMatch(/90 °C nicht warm/);
    expect(w.massnahmen.some((m) => m.art === 'fbh')).toBe(false);

    // Zu kleine Flächenheizung (5 m², 1 500 W): wirklich nicht erreichbar — Text nennt die Oberflächengrenze statt «90 °C», keine FBH-Massnahme
    const k = waermeabgabe(
      {
        heizkreise: [{ id: 'fbh', tVLC: 35, spreizungK: 7, gemischt: true }],
        raeume: [{ id: 'w', name: 'Wohnen', thetaIntC: 20, phiHLManuellW: 1500, heizflaechen: [{ id: 'f', bauart: 'fbh', flaecheM2: 5, verlegeabstandMm: 100, rlb: 0, kreisId: 'fbh' }] }],
      },
      daten,
    );
    expect(k.raeume[0]!.tVLReq).toBeNull();
    expect(k.raeume[0]!.mischerGrenze).toBeNull();
    expect(k.raeume[0]!.hinweise.find((x) => x.code === 'waermeabgabe.raum.nichtErreichbar')?.text).toMatch(/Oberflächentemperatur/);
    expect(k.gebaeude.urteil).toMatch(/Flächenheizung .* zu klein/);
    expect(k.raeume[0]!.massnahmen.some((m) => m.art === 'fbh')).toBe(false);
  });

  it('Rohe Schlüssel in Begründungen/Hinweisen (HK-28 in neuer Form): «Belag pvc_linoleum», «Bauart platte_22»', () => {
    const fb = normleistung({ id: 'f', bauart: 'fbh', flaecheM2: 10, belag: 'pvc_linoleum' }, hk);
    expect(fb.qN!.begruendung).toContain('pvc_linoleum');
    const m = hk.modelle.find((x) => x.bauart === 'platte_22' && x.hoeheMm === 600)!;
    const mm = normleistung({ id: 'm', bauart: 'platte_21', hoeheMm: 600, laengeMm: 1000, modellId: m.id }, hk);
    expect(mm.hinweise.some((h) => /platte_22/.test(h.text))).toBe(true);
  });
});
