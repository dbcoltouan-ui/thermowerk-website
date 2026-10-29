// tests/sanierungs-plausi.test.mjs
// Wärmeübergabe Phase C (2026-04-30) — Sanierungs-Plausi-Tests.
//
// Geprüft wird die End-to-End-Kette:
//   data/heizkoerper.json  →  qNormFromModell / qNormFromFallback
//   →  plausibilitaetHeizflaeche (mit q_norm_W_pro_m2 + n_exponent-Override)
//   →  computeDistribution() aus state.detail.raeume
//
// Referenz: Buderus Logatrend C-Profil T22 H600 L1000 →
//   Q_norm @ 75/65/20 = 1617 W (DB-Wert direkt aus Hersteller-Datenblatt).
//   Frontfläche A = 0.6 m² (600 mm × 1000 mm).
//   n = 1.30 (Plattenheizkörper).
// Sanierungs-Vorlauftemperaturen 35 / 40 / 45 °C, Spreizung 10 K.
// Erwartete Ampel-Bands: ≥ 1.00 grün, ≥ 0.85 gelb, sonst rot.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  plausibilitaetHeizflaeche, leistungsFaktor, computeDistribution
} from '../src/calc/distribution.mjs';
import {
  findModell, qNormFromModell, qNormFromFallback, getFallback, flaecheVonHL
} from '../src/calc/heizkoerper.mjs';

const DB = JSON.parse(readFileSync(new URL('../data/heizkoerper.json', import.meta.url), 'utf8'));

/* --------------------------------------------------------------------------
   1) BUDERUS T22 H600 L1000 — VL 35 / 40 / 45 °C × Phi 200..1000 W
   -------------------------------------------------------------------------- */

test('Buderus T22 H600 L1000: Stammdaten aus DB sind exakt', () => {
  const m = findModell(DB, 'buderus-logatrend-c-profil-22-h600');
  assert.ok(m, 'Modell muss in DB existieren');
  assert.equal(m.q_norm_75_65, 1617, 'Q_norm @ 75/65 stimmt');
  assert.equal(m.n_exponent, 1.3, 'n-Exponent = 1.3');
  const Q = qNormFromModell(m, 1000);
  assert.equal(Q, 1617, 'Q_norm bei L=1000 mm = 1617 W');
  const A = flaecheVonHL(600, 1000);
  assert.equal(A, 0.6, 'Frontfläche = 0.6 m²');
});

test('Plausi VL 45 °C: Q_real ≈ DB-Wert (480 W bei 45/35) — Formel trifft DB', () => {
  const m = findModell(DB, 'buderus-logatrend-c-profil-22-h600');
  const A = 0.6;
  const q_norm = m.q_norm_75_65 / A;            // = 2695 W/m²
  const pl = plausibilitaetHeizflaeche({
    phiHL_raum: 470, A_heizflaeche: A, typ: 'heizkoerper',
    tVL_neu: 45, tRL_neu: 35, tInnen: 20,
    q_norm_W_pro_m2: q_norm, n_exponent: m.n_exponent
  });
  // DB liefert q_norm_45_35 = 480 W (gerundet) — die Korrekturkurven-Formel
  // trifft das exakt (Q_real ≈ 479.95 W). Bei phi=470 → deckungsgrad ≈ 1.02 → grün.
  assert.ok(pl.Q_real > 470 && pl.Q_real < 490, `Q_real ${pl.Q_real.toFixed(1)} W approx DB 480 W`);
  assert.ok(pl.deckungsgrad > 1.00, `Deckungsgrad ${pl.deckungsgrad.toFixed(3)} > 1.00`);
  assert.equal(pl.ampel, 'gruen');
});

test('Plausi VL 45 / 40 / 35 °C: Ampel-Bands über Phi 200..1000 W', () => {
  const m = findModell(DB, 'buderus-logatrend-c-profil-22-h600');
  const A = 0.6;
  const q_norm = m.q_norm_75_65 / A;
  const VLs = [35, 40, 45];
  const phis = [200, 400, 600, 800, 1000];
  // Deckungsgrad muss monoton sinken bei steigendem phi (gleiche VL),
  // und monoton steigen bei steigender VL (gleiches phi).
  const grid = {};
  for (const tVL of VLs){
    grid[tVL] = phis.map(phi => plausibilitaetHeizflaeche({
      phiHL_raum: phi, A_heizflaeche: A, typ: 'heizkoerper',
      tVL_neu: tVL, tRL_neu: tVL - 10, tInnen: 20,
      q_norm_W_pro_m2: q_norm, n_exponent: m.n_exponent
    }));
  }
  // a) je höher phi, desto schlechter
  for (const tVL of VLs){
    const ds = grid[tVL].map(p => p.deckungsgrad);
    for (let i = 1; i < ds.length; i++){
      assert.ok(ds[i] < ds[i-1], `VL ${tVL}: deckungsgrad faellt mit phi`);
    }
  }
  // b) je höher VL, desto besser
  for (let i = 0; i < phis.length; i++){
    assert.ok(grid[35][i].deckungsgrad < grid[40][i].deckungsgrad);
    assert.ok(grid[40][i].deckungsgrad < grid[45][i].deckungsgrad);
  }
  // c) konkrete Bands: bei VL 45 / phi 200 → klar grün; bei VL 35 / phi 1000 → klar rot
  assert.equal(grid[45][0].ampel, 'gruen', 'VL 45 / phi 200 → grün');
  assert.equal(grid[35][4].ampel, 'rot',   'VL 35 / phi 1000 → rot');
});

/* --------------------------------------------------------------------------
   2) KONVEKTOR-PASSIV-FALLBACK (n = 1.40) — stärkerer Einbruch
   -------------------------------------------------------------------------- */

test('Konvektor-passiv-Fallback: n=1.40 bricht stärker ein als HK n=1.30', () => {
  const fb = getFallback(DB, 'konvektor_passiv');
  assert.ok(fb, 'Fallback konvektor_passiv existiert');
  assert.equal(fb.n_exponent, 1.40);
  const A = 0.6;
  const Q_norm_konv = qNormFromFallback(fb, A); // 3500 * 0.6 = 2100 W
  assert.equal(Q_norm_konv, 2100);
  // Beide rechnen mit denselben tVL/tRL und derselben spez. Norm-Leistung,
  // nur n unterscheidet sich: 1.30 (HK Default) vs 1.40 (Konvektor passiv).
  const args_n13 = {
    phiHL_raum: 200, A_heizflaeche: A, typ: 'konvektor',
    tVL_neu: 35, tRL_neu: 25, tInnen: 20,
    q_norm_W_pro_m2: Q_norm_konv / A, n_exponent: 1.30
  };
  const args_n14 = { ...args_n13, n_exponent: 1.40 };
  const pl_n13 = plausibilitaetHeizflaeche(args_n13);
  const pl_n14 = plausibilitaetHeizflaeche(args_n14);
  assert.ok(pl_n14.Q_real < pl_n13.Q_real,
    `n=1.4 Q_real ${pl_n14.Q_real.toFixed(1)} < n=1.3 Q_real ${pl_n13.Q_real.toFixed(1)} W`);
  // Bei VL 35 °C ist der Einbruch beim Konvektor-passiv besonders deutlich
  assert.ok(pl_n14.deckungsgrad < pl_n13.deckungsgrad);
});

test('leistungsFaktor: n_exponent-Override greift', () => {
  const f_default = leistungsFaktor({ typ: 'heizkoerper', tVL: 45, tRL: 35, tInnen: 20 });
  const f_n12     = leistungsFaktor({ typ: 'heizkoerper', tVL: 45, tRL: 35, tInnen: 20, n_exponent: 1.20 });
  const f_n14     = leistungsFaktor({ typ: 'heizkoerper', tVL: 45, tRL: 35, tInnen: 20, n_exponent: 1.40 });
  // Bei dT < dT_ref: kleinerer n → grösserer f, grösserer n → kleinerer f
  assert.ok(f_n12 > f_default, `n=1.2: f=${f_n12} > default f=${f_default}`);
  assert.ok(f_n14 < f_default, `n=1.4: f=${f_n14} < default f=${f_default}`);
});

/* --------------------------------------------------------------------------
   3) END-TO-END: computeDistribution aus State (Stammdaten-Pfad)
   -------------------------------------------------------------------------- */

function makeState({ phiHL = 800, q_norm = 1617, n_exponent = 1.30, A = 0.6, tVL = 45 } = {}){
  return {
    detail: {
      raeume: [
        {
          name: 'Wohnen',
          theta_int: 20,
          heizflaechen: [
            {
              typ: 'heizkoerper',
              A,
              kreis_id: 'k1',
              hersteller: 'Buderus',
              modell: 'buderus-logatrend-c-profil-22-h600',
              hoehe: 600, laenge: 1000, tiefe: 102,
              q_norm,
              n_exponent
            }
          ]
        }
      ],
      verteilung: {
        global: { tVL_neu: tVL, tRL_neu: tVL - 10, typ: 'heizkoerper' },
        heizkreise: [{ id: 'k1', tVL, tRL: tVL - 10 }]
      }
    }
  };
}

test('computeDistribution: 1 Raum + 1 HF (Buderus T22) → Plausi aus State', () => {
  const state = makeState({ phiHL: 800, tVL: 45 });
  // Detail-Heatload-Fake mit phiHL = 800 W für Raum 0
  const detailLoad = { roomResults: [{ phiHL: 800 }], phiHL_total: 800 };
  const out = computeDistribution(state, detailLoad);
  assert.ok(out, 'Output != null');
  assert.equal(out.flat.length, 1);
  const f = out.flat[0];
  assert.equal(f.modell, 'buderus-logatrend-c-profil-22-h600');
  assert.equal(f.q_norm, 1617);
  assert.equal(f.n_exponent, 1.30);
  assert.ok(Math.abs(f.phiHL - 800) < 1, 'phi_anteil = 800 W (1 HF im Raum)');
  // Bei VL 45 °C ist Q_real ≈ 480 W → deckungsgrad ≈ 0.6 → rot
  assert.ok(f.plausi.Q_real > 460 && f.plausi.Q_real < 500,
    `Q_real ${f.plausi.Q_real.toFixed(0)} W approx DB 480 W`);
  assert.ok(f.plausi.deckungsgrad > 0.55 && f.plausi.deckungsgrad < 0.65,
    `deckungsgrad ${f.plausi.deckungsgrad.toFixed(2)} approx 0.6`);
  assert.equal(f.plausi.ampel, 'rot');
  // tVL_max für phi=800 W muss höher als 45 °C sein
  assert.ok(f.tVL_max > 45, `tVL_max ${f.tVL_max?.toFixed(1)} > 45 °C`);
});

test('computeDistribution: Stammdaten-Pfad ändert deckungsgrad ggü. REF_AUSLEGUNG-Default', () => {
  // Mit q_norm=1617 W → q_norm_W_pro_m2 = 2695 W/m² (Stammdaten)
  const stamm = makeState({ phiHL: 600, tVL: 45 });
  // Ohne q_norm → fällt auf REF_AUSLEGUNG.heizkoerper.q_W_pro_m2 = 1000 W/m² zurück
  const default_ = makeState({ phiHL: 600, tVL: 45, q_norm: 0 });
  const dl = { roomResults: [{ phiHL: 600 }], phiHL_total: 600 };
  const out_s = computeDistribution(stamm, dl).flat[0];
  const out_d = computeDistribution(default_, dl).flat[0];
  // Stammdaten-Q_real (Buderus 480 W) > Default (1000·0.6·f) — letzteres nutzt
  // generischen 1000 W/m²-Wert, der unter dem realen Buderus-T22 liegt.
  assert.ok(out_s.plausi.Q_real > out_d.plausi.Q_real,
    `Stamm Q_real ${out_s.plausi.Q_real.toFixed(0)} W > Default ${out_d.plausi.Q_real.toFixed(0)} W`);
});

test('computeDistribution: Konvektor-passiv (n=1.40) liefert kleineren Q_real', () => {
  const fb = getFallback(DB, 'konvektor_passiv');
  const A = 0.6;
  const Q_norm = qNormFromFallback(fb, A); // 2100 W absolut bei A = 0.6 m²
  // Zwei States: identisch ausser n_exponent (1.30 vs 1.40)
  const mk = (n) => ({
    detail: {
      raeume: [{
        name: 'Schlafen', theta_int: 20,
        heizflaechen: [{
          typ: 'konvektor', A, kreis_id: 'k1',
          hersteller: '', modell: '',
          hoehe: 0, laenge: 0, tiefe: fb.tiefe_typ_mm,
          q_norm: Q_norm, n_exponent: n
        }]
      }],
      verteilung: {
        global: { tVL_neu: 35, tRL_neu: 25, typ: 'konvektor' },
        heizkreise: [{ id: 'k1', tVL: 35, tRL: 25 }]
      }
    }
  });
  const dl = { roomResults: [{ phiHL: 200 }], phiHL_total: 200 };
  const out_n13 = computeDistribution(mk(1.30), dl).flat[0];
  const out_n14 = computeDistribution(mk(1.40), dl).flat[0];
  assert.ok(out_n14.plausi.Q_real < out_n13.plausi.Q_real,
    `n=1.4 Q_real ${out_n14.plausi.Q_real.toFixed(1)} < n=1.3 Q_real ${out_n13.plausi.Q_real.toFixed(1)} W`);
  assert.ok(out_n14.plausi.deckungsgrad < out_n13.plausi.deckungsgrad);
});
