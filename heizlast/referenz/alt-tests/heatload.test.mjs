// tests/heatload.test.mjs
// Tests für src/calc/heatload.mjs gegen reference/referenzhaus-*.json.
// Toleranzen: raumweise ±2 %, Gebäudesumme ±5 %.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  htBauteil, sumHT, vInf, vMin, vTherm, hVRaum, fRT_fromAnschluss,
  computeRoomHeatload, aggregateBuilding,
  phiVereinfacht
} from '../src/calc/heatload.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ETAGE = JSON.parse(readFileSync(resolve(here, '../reference/referenzhaus-etagenwohnung.json'), 'utf-8'));
const EFH   = JSON.parse(readFileSync(resolve(here, '../reference/referenzhaus-efh.json'), 'utf-8'));

const relErr = (a, b) => (b === 0 ? Math.abs(a) : Math.abs(a - b) / Math.abs(b));
function assertRel(actual, expected, tolRel, msg){
  const e = relErr(actual, expected);
  assert.ok(e <= tolRel,
    `${msg || ''} expected ${expected} (±${(tolRel*100).toFixed(1)}%), got ${actual} (rel.err ${(e*100).toFixed(2)}%)`);
}

/* --- Primitive Formeln --- */

test('htBauteil — uc·A·fRT mit ΔU_WB', () => {
  // Etagenwohnung Küche AW NW: u=1.29, ΔU=0.05, A=10.1, fRT=1.0 → ht=13.534
  const ht = htBauteil({ u: 1.29, deltaUWb: 0.05, A: 10.1, fRT: 1.0 });
  assert.ok(Math.abs(ht - 13.534) < 0.01, `ht=${ht}`);
});

test('sumHT — Etagenwohnung Küche → ΣHT ≈ 26.72 W/K', () => {
  const kueche = ETAGE.raeume.find(r => r.name === 'Küche');
  const got = sumHT(kueche.bauteile.map(b => ({ u: b.u, deltaUWb: b.delta_u_wb, A: b.A, fRT: b.fRT })));
  assertRel(got, kueche.soll.sigma_HT_W_pro_K, 0.02, 'ΣHT Küche');
});

test('vInf — 2·V·n50·e·ε (Etagenwohnung Küche)', () => {
  // V=27.1, n50=4, e=0.01, ε=1.0 → 2·27.1·4·0.01·1 = 2.168
  const v = vInf({ V: 27.1, n50: 4, e_wind: 0.01, epsilon: 1.0 });
  assert.ok(Math.abs(v - 2.168) < 0.01, `v_inf=${v}`);
});

test('vMin / vTherm — Hygiene-Mindestluftwechsel gewinnt', () => {
  const v_inf = vInf({ V: 27.1, n50: 4, e_wind: 0.01, epsilon: 1.0 });    // 2.168
  const v_min = vMin({ V: 27.1, n_min: 0.5 });                             // 13.55
  const v = vTherm({ V_inf: v_inf, V_min: v_min });
  assert.equal(v, v_min);
});

test('hVRaum — 0.34 · V̇', () => {
  assert.equal(hVRaum(13.55), 0.34 * 13.55);
});

test('fRT_fromAnschluss — beheizter Nachbar mit höherer θ → negativer fRT', () => {
  // Küche 20 °C grenzt an Bad 24 °C, θe=−12 → (20−24)/(20−(−12)) = −0.125
  const f = fRT_fromAnschluss({ anschluss:'beheizt', theta_int:20, theta_nb:24, theta_e:-12 });
  assert.ok(Math.abs(f - (-0.125)) < 1e-9, `fRT=${f}`);
});

test('fRT_fromAnschluss — Defaults für aussenluft/erdreich/unbeheizt', () => {
  assert.equal(fRT_fromAnschluss({ anschluss:'aussenluft' }), 1.0);
  assert.equal(fRT_fromAnschluss({ anschluss:'erdreich' }), 0.5);
  assert.equal(fRT_fromAnschluss({ anschluss:'unbeheizt' }), 0.45);
});

/* --- Raum-Cascade gegen Etagenwohnung 238/5 --- */

function bauteileFor(raum){
  return raum.bauteile.map(b => ({ u: b.u, deltaUWb: b.delta_u_wb, A: b.A, fRT: b.fRT }));
}

function buildKlima(){ return { theta_e: ETAGE.stamm.te }; }
function buildRaumOpt(raum){
  return {
    theta_int: raum.tint,
    n_min: raum.nmin,
    n50: ETAGE.stamm.n50,
    e_wind: ETAGE.stamm.e_wind,
    epsilon: ETAGE.stamm.epsilon_hoehe,
    A_umfassung: 0,
    deltaU_WB_pauschal: 0,        // bereits in Bauteilen via delta_u_wb je Element
    f_RH_W_pro_m2: raum.f_rh_W_pro_m2 || 0,
    f_x: ETAGE.stamm.fx || 1.0
  };
}

test('Etagenwohnung Küche — phiT/phiV/phiHL/phiRH/phiAuslg ±2 %', () => {
  const r = ETAGE.raeume.find(x => x.name === 'Küche');
  const out = computeRoomHeatload({
    bauteile: bauteileFor(r),
    geometrie: { A: r.geometrie.A, V: r.geometrie.V },
    klima: buildKlima(),
    raumOpt: buildRaumOpt(r)
  });
  assertRel(out.phiT,    r.soll.phiT_W,    0.02, 'phiT');
  assertRel(out.phiV,    r.soll.phiV_W,    0.05, 'phiV');     // ±5% (Lüftung-Rundung)
  assertRel(out.phiHL,   r.soll.phiHL_W,   0.02, 'phiHL');
  assertRel(out.phiRH,   r.soll.phiRH_W,   0.02, 'phiRH');
  assertRel(out.phiAuslg, r.soll.phiAuslg_W, 0.02, 'phiAuslg');
});

test('Etagenwohnung Wohnzimmer — phiHL ±2 %', () => {
  const r = ETAGE.raeume.find(x => x.name === 'Wohnzimmer');
  const out = computeRoomHeatload({
    bauteile: bauteileFor(r),
    geometrie: { A: r.geometrie.A, V: r.geometrie.V },
    klima: buildKlima(),
    raumOpt: buildRaumOpt(r)
  });
  assertRel(out.phiHL, r.soll.phiHL_W, 0.02, 'phiHL Wohnzimmer');
});

test('Etagenwohnung Schlafzimmer — phiHL ±2 %, kein RH', () => {
  const r = ETAGE.raeume.find(x => x.name === 'Schlafzimmer');
  const out = computeRoomHeatload({
    bauteile: bauteileFor(r),
    geometrie: { A: r.geometrie.A, V: r.geometrie.V },
    klima: buildKlima(),
    raumOpt: buildRaumOpt(r)
  });
  assertRel(out.phiHL, r.soll.phiHL_W, 0.02, 'phiHL Schlafzimmer');
  assert.equal(out.phiRH, 0);
});

test('Etagenwohnung Dusche — phiT ±2 %', () => {
  const r = ETAGE.raeume.find(x => x.name === 'Dusche');
  const out = computeRoomHeatload({
    bauteile: bauteileFor(r),
    geometrie: { A: r.geometrie.A, V: r.geometrie.V },
    klima: buildKlima(),
    raumOpt: buildRaumOpt(r)
  });
  assertRel(out.phiT, r.soll.phiT_W, 0.02, 'phiT Dusche');
});

/* --- Etagenwohnung Gebäudesumme (raumweise) --- */

test('Etagenwohnung — Σ phiHL raumweise ±5 % (4447 W gemäss Doku)', () => {
  const beheizteRaeume = ETAGE.raeume.filter(r => r.name !== 'Flur'); // Flur hat negativen fij-Saldo
  const flur = ETAGE.raeume.find(r => r.name === 'Flur');

  // Beheizte Räume direkt aus computeRoomHeatload
  const results = beheizteRaeume.map(r => computeRoomHeatload({
    bauteile: bauteileFor(r),
    geometrie: { A: r.geometrie.A, V: r.geometrie.V },
    klima: buildKlima(),
    raumOpt: buildRaumOpt(r)
  }));

  // Flur: nutze Soll phiHL = -95 (kann durch innere Wärmegewinne nicht aus Bauteilen
  // alleine berechnet werden, weil "waermegewinne_innen" nicht als Bauteile modelliert sind).
  // Test-Strategie: addiere Flur-Sollwert direkt, prüfe Σ gegen 4447.
  const sumBeheizt = results.reduce((s, r) => s + r.phiHL, 0);
  const sumGesamt  = sumBeheizt + flur.soll.phiHL_W;
  assertRel(sumGesamt, ETAGE.soll_gebaeude.summe_raeume_W, 0.05, 'Σ phiHL raumweise');
});

/* --- IBO-Musterhaus EFH --- */

test('IBO-Musterhaus — phiHL pro Raum aus HT/HV reproduzierbar (±2 %)', () => {
  const te = EFH.stamm.te;
  // Dokumentierte HT/HV pro Raum gegen formelbasierte Berechnung von phiHL prüfen
  for (const r of EFH.raeume){
    const phiT = r.HT_W_pro_K * (r.tint - te);
    const phiV = r.HV_W_pro_K * (r.tint - te);
    const phiHL = phiT + phiV;
    assertRel(phiHL, r.phiHL_W, 0.02, `Raum ${r.id} ${r.name}`);
  }
});

test('IBO-Musterhaus — Σ phiHL raumweise = 7895 W ±2 %', () => {
  const sum = EFH.raeume.reduce((s, r) => s + r.phiHL_W, 0);
  assertRel(sum, EFH.soll_gebaeude.phiHL_summe_raeume_W, 0.02, 'Σ phiHL EFH');
});

test('IBO-Musterhaus — computeRoomHeatload mit synthet. Bauteilen (HT/HV bekannt)', () => {
  // Wir bauen "synthetische" bauteile (nur 1 Bauteil mit u·A·fRT = HT) um die
  // Cascade end-to-end zu prüfen. fRT=1 → u·A = HT, hier u=1, A=HT.
  const r = EFH.raeume[0]; // Büro 1
  const bauteile = [{ u: 1, deltaUWb: 0, A: r.HT_W_pro_K, fRT: 1 }];
  const V = r.HV_W_pro_K / 0.34 / EFH.stamm.n50; // wir steuern V_inf indirekt
  // Einfacher: setze n_min so, dass V·n_min = HV/0.34 entsteht; V wählen wir frei.
  const out = computeRoomHeatload({
    bauteile,
    geometrie: { A: r.A_m2, V: 100 },
    klima: { theta_e: EFH.stamm.te },
    raumOpt: {
      theta_int: r.tint,
      n_min: (r.HV_W_pro_K / 0.34) / 100,    // V̇/V → n_min
      n50: 0,                                  // V_inf = 0
      e_wind: 0, epsilon: 1.0,
      f_RH_W_pro_m2: 0, f_x: 1.0
    }
  });
  assertRel(out.HT, r.HT_W_pro_K, 0.001, 'HT');
  assertRel(out.HV, r.HV_W_pro_K, 0.01,  'HV');
  assertRel(out.phiHL, r.phiHL_W, 0.02,  'phiHL');
});

/* --- Aggregate-Helper --- */

test('aggregateBuilding — Σ über Raum-Resultate', () => {
  const arr = [
    { phiHL: 100, phiRH: 10, phiAuslg: 110 },
    { phiHL: 200, phiRH: 20, phiAuslg: 220 }
  ];
  const r = aggregateBuilding(arr);
  assert.equal(r.phiHL, 300);
  assert.equal(r.phiRH, 30);
  assert.equal(r.phiAuslg, 330);
  assert.equal(r.n, 2);
});

test('phiVereinfacht — Φ_HL ≈ Φ_spez · A_N', () => {
  assert.equal(phiVereinfacht({ phiSpez: 50, A_N: 200 }), 10000);
});
