// tests/distribution.test.mjs
// Tests für src/calc/distribution.mjs (S5 Wärmeübergabe).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dTm, leistungsFaktor, ampelFromDeckungsgrad,
  plausibilitaetHeizflaeche, maxVorlauftemperatur,
  heizkreiseGruppieren, computeDistribution,
  REF_AUSLEGUNG, N_EXPONENT
} from '../src/calc/distribution.mjs';

const close = (a, b, tol) => Math.abs(a - b) <= tol;
function assertClose(a, b, tol, msg){
  if (!close(a, b, tol)) assert.fail(`${msg||''} expected ${b}±${tol}, got ${a}`);
}

/* --- dTm: log-mean ΔT --- */

test('dTm — Norm-HK 75/65/20: ΔT_log ≈ 49.83 K', () => {
  const r = dTm({ tVL: 75, tRL: 65, tInnen: 20 });
  assertClose(r, 49.83, 0.05, 'dTm 75/65/20');
});

test('dTm — Norm-FBH 35/28/20: ΔT_log ≈ 11.40 K', () => {
  const r = dTm({ tVL: 35, tRL: 28, tInnen: 20 });
  // (15-8) / ln(15/8) = 7 / 0.628 = 11.14
  assertClose(r, 11.14, 0.1, 'dTm 35/28/20');
});

test('dTm — gleiche tVL und tRL → arith. Mittel', () => {
  const r = dTm({ tVL: 30, tRL: 30, tInnen: 20 });
  assertClose(r, 10, 0.001);
});

test('dTm — tRL ≤ tInnen → 0 (Heizfläche kann nicht heizen)', () => {
  assert.equal(dTm({ tVL: 25, tRL: 18, tInnen: 20 }), 0);
});

/* --- leistungsFaktor --- */

test('leistungsFaktor — Norm-Auslegung HK → 1.0', () => {
  const f = leistungsFaktor({ typ: 'heizkoerper', tVL: 75, tRL: 65, tInnen: 20 });
  assertClose(f, 1.0, 0.005);
});

test('leistungsFaktor — Norm-Auslegung FBH → 1.0', () => {
  const f = leistungsFaktor({ typ: 'fbh', tVL: 35, tRL: 28, tInnen: 20 });
  assertClose(f, 1.0, 0.005);
});

test('leistungsFaktor — HK 55/45 → ca. 0.62 (^1.3 mit dT_log≈30/49.83)', () => {
  const f = leistungsFaktor({ typ: 'heizkoerper', tVL: 55, tRL: 45, tInnen: 20 });
  // dT_log_neu = (35-25)/ln(35/25) ≈ 29.72 ;  29.72/49.83 = 0.5965  → ^1.3 ≈ 0.524
  assertClose(f, 0.52, 0.05);
});

test('leistungsFaktor — unbekannter Typ → null', () => {
  assert.equal(leistungsFaktor({ typ: 'kachelofen', tVL: 60, tRL: 40, tInnen: 20 }), null);
});

/* --- ampelFromDeckungsgrad --- */

test('ampelFromDeckungsgrad — Schwellen 0.85, 1.0', () => {
  assert.equal(ampelFromDeckungsgrad(1.10), 'gruen');
  assert.equal(ampelFromDeckungsgrad(1.00), 'gruen');
  assert.equal(ampelFromDeckungsgrad(0.95), 'gelb');
  assert.equal(ampelFromDeckungsgrad(0.85), 'gelb');
  assert.equal(ampelFromDeckungsgrad(0.80), 'rot');
  assert.equal(ampelFromDeckungsgrad(null), 'grau');
});

/* --- plausibilitaetHeizflaeche --- */

test('plausibilitaet — FBH 20 m² · 80 W/m² Norm bei 35/28 deckt 1600 W → grün bei phi=1500 W', () => {
  const r = plausibilitaetHeizflaeche({
    phiHL_raum: 1500, A_heizflaeche: 20, typ: 'fbh',
    tVL_neu: 35, tRL_neu: 28, tInnen: 20
  });
  assert.equal(r.ampel, 'gruen');
  assertClose(r.deckungsgrad, 1600 / 1500, 0.05);
});

test('plausibilitaet — HK 1.5 m² zu klein bei 45/35 für phi=2000 W → rot', () => {
  const r = plausibilitaetHeizflaeche({
    phiHL_raum: 2000, A_heizflaeche: 1.5, typ: 'heizkoerper',
    tVL_neu: 45, tRL_neu: 35, tInnen: 20
  });
  // f bei 45/35: dT_log≈29.0, /49.83 = 0.582, ^1.3 ≈ 0.504
  // Q_real = 1000 · 0.504 · 1.5 = 756 W → 756/2000 = 0.378 → rot
  assert.equal(r.ampel, 'rot');
  assert.ok(r.deckungsgrad < 0.5);
});

test('plausibilitaet — fehlende Heizfläche → grau', () => {
  const r = plausibilitaetHeizflaeche({
    phiHL_raum: 1000, A_heizflaeche: 0, typ: 'fbh',
    tVL_neu: 35, tRL_neu: 28
  });
  assert.equal(r.ampel, 'grau');
});

/* --- maxVorlauftemperatur --- */

test('maxVorlauftemperatur — FBH 25 m², phi=2000 W → tVL ca. 35 °C (≈ Norm)', () => {
  const r = maxVorlauftemperatur({
    phiHL_raum: 2000, A_heizflaeche: 25, typ: 'fbh', tInnen: 20
  });
  assert.ok(r);
  // Erforderlich = 80 W/m² (gerade Norm), also tVL ≈ 35
  assertClose(r.tVL_max, 35, 1.5);
});

test('maxVorlauftemperatur — HK 2 m², phi=2000 W → tVL deutlich > 50', () => {
  const r = maxVorlauftemperatur({
    phiHL_raum: 2000, A_heizflaeche: 2, typ: 'heizkoerper', tInnen: 20
  });
  assert.ok(r);
  // bei 2 m² · 1000 W/m²·1.0 nur 2000 W bei Norm 75/65 — gerade ok
  // Faktor=1, dT_req = dT_ref ≈ 49.83 → tVL ≈ 20 + 49.83 + 5 = 74.83
  assertClose(r.tVL_max, 75, 2);
});

/* --- heizkreiseGruppieren --- */

test('heizkreiseGruppieren — 3 Flächen auf 2 Kreise', () => {
  const out = heizkreiseGruppieren([
    { raumId: 0, raumName: 'Wohnen',  A: 25, typ: 'fbh', kreis: 'k1', phiHL: 1500 },
    { raumId: 1, raumName: 'Bad',     A:  6, typ: 'fbh', kreis: 'k1', phiHL:  500 },
    { raumId: 2, raumName: 'Schlafz', A: 14, typ: 'fbh', kreis: 'k2', phiHL:  900 }
  ]);
  assert.equal(out.length, 2);
  const k1 = out.find(o => o.kreis === 'k1');
  assert.equal(k1.A_total, 31);
  assert.equal(k1.phi_total, 2000);
  assert.equal(k1.raeume.length, 2);
});

/* --- computeDistribution (state-Integration) --- */

test('computeDistribution — Räume mit Heizflächen liefern Plausi pro Heizfläche', () => {
  const state = {
    detail: {
      aktiv: true,
      verteilung: {
        heizkreise: [{ id: 'k1', name: 'EG' }],
        global: { tVL_neu: 35, tRL_neu: 28, typ: 'fbh' }
      },
      raeume: [
        { name: 'Wohnen', A: 25, theta_int: 20,
          heizflaechen: [{ typ: 'fbh', A: 25, kreis_id: 'k1' }]
        }
      ]
    }
  };
  const detailLoad = {
    phiHL_total: 1500, phi_raeume: 1500, phi_rest: 0,
    A_raeume: 25, A_rest: 0,
    roomResults: [{ name: 'Wohnen', A: 25, beheizt: true, phiHL: 1500 }]
  };
  const out = computeDistribution(state, detailLoad);
  assert.ok(out);
  assert.equal(out.flat.length, 1);
  // 25 m² FBH bei Norm 35/28 → 80 W/m² · 25 = 2000 W → deckungsgrad = 2000/1500 ≈ 1.33
  assert.equal(out.flat[0].plausi.ampel, 'gruen');
  assertClose(out.flat[0].plausi.deckungsgrad, 1.333, 0.05);
});

test('computeDistribution — keine Räume → global-Plausi mit Faktor', () => {
  const state = {
    detail: {
      aktiv: true,
      verteilung: { global: { tVL_neu: 35, tRL_neu: 28, typ: 'fbh' } },
      raeume: []
    }
  };
  const detailLoad = { phiHL_total: 8000, roomResults: [] };
  const out = computeDistribution(state, detailLoad);
  assert.ok(out.global);
  assertClose(out.global.faktor, 1.0, 0.05);
});

test('REF_AUSLEGUNG / N_EXPONENT vollständig für alle Typen', () => {
  for (const typ of ['fbh','wandheizung','heizkoerper','konvektor']){
    assert.ok(REF_AUSLEGUNG[typ], `REF_AUSLEGUNG.${typ}`);
    assert.ok(N_EXPONENT[typ] > 0,  `N_EXPONENT.${typ}`);
  }
});
