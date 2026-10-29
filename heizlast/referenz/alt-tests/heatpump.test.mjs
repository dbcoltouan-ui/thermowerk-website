// tests/heatpump.test.mjs
// Tests für src/calc/heatpump.mjs (S5 WP-Auswahl).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  filterWaermepumpen, bivalenzpunkt, jazSchaetzung, inverterCheck,
  nennleistungA7W35, maxVorlauf, copA2W35, copAm7W35,
  interpolatePowerCurve, getSelectedWp, computeHeatpumpResult
} from '../src/calc/heatpump.mjs';

const close = (a, b, tol) => Math.abs(a - b) <= tol;

const SAMPLE_DB = [
  // CH-Markt-Format (waermepumpen.json hauptgeraete)
  {
    ID: 'BO-0001', Marke: 'Bosch', Modell: 'CS5800i AW 5',
    Aufstellung: 'Aussen', 'Heizleistung A-7/W35 [kW]': 5.42,
    'COP A-7/W35': 2.51, 'COP A2/W35': 3.92,
    'Vorlauf max. [°C]': 60, 'Schall Tag max [dB(A)]': 53
  },
  {
    ID: 'BO-0002', Marke: 'Bosch', Modell: 'CS5800i AW 7',
    Aufstellung: 'Aussen', 'Heizleistung A-7/W35 [kW]': 6.71,
    'COP A-7/W35': 2.36, 'COP A2/W35': 4.06,
    'Vorlauf max. [°C]': 60, 'Schall Tag max [dB(A)]': 57.7
  },
  {
    ID: 'BO-0003', Marke: 'Bosch', Modell: 'CS5800i AW 10',
    Aufstellung: 'Aussen', 'Heizleistung A-7/W35 [kW]': 9.57,
    'COP A-7/W35': 2.47, 'COP A2/W35': 4.84,
    'Vorlauf max. [°C]': 60, 'Schall Tag max [dB(A)]': 59
  },
  {
    ID: 'OE-0001', Marke: 'Oertli', Modell: 'LIN 8',
    Aufstellung: 'Innen', 'Heizleistung A-7/W35 [kW]': 7.20,
    'COP A-7/W35': 2.60, 'COP A2/W35': 3.80,
    'Vorlauf max. [°C]': 65, 'Schall Tag max [dB(A)]': 48
  }
];

/* --- Field readers --- */

test('nennleistungA7W35 — CH-Format', () => {
  assert.equal(nennleistungA7W35(SAMPLE_DB[0]), 5.42);
});
test('nennleistungA7W35 — produkte.json-Format', () => {
  const wp = { powerCurve: [{ tSource: -7, tSink: 35, qWp: 7.2, cop: 2.95 }] };
  assert.equal(nennleistungA7W35(wp), 7.2);
});
test('maxVorlauf — beide Formate', () => {
  assert.equal(maxVorlauf(SAMPLE_DB[0]), 60);
  assert.equal(maxVorlauf({ maxFlowTemp: 75 }), 75);
});

/* --- filterWaermepumpen --- */

test('filterWaermepumpen — Q_h 7 kW ± 20 % filtert auf 6.71/7.20', () => {
  const out = filterWaermepumpen(SAMPLE_DB, { Qh_kw: 7, toleranz_proz: 20 });
  // 5.42 (-23%), 6.71 (-4%), 9.57 (+37%), 7.20 (+3%) → erlaubt: 5.6..8.4 → 6.71 + 7.20
  const ids = out.map(w => w.ID);
  assert.deepEqual(ids.sort(), ['BO-0002', 'OE-0001'].sort());
});

test('filterWaermepumpen — Aufstellung "Innen" filtert nur Oertli', () => {
  const out = filterWaermepumpen(SAMPLE_DB, { Qh_kw: 7, toleranz_proz: 50, aufstellung: 'Innen' });
  assert.equal(out.length, 1);
  assert.equal(out[0].ID, 'OE-0001');
});

test('filterWaermepumpen — Schallklasse 50 dB filtert auf Oertli', () => {
  const out = filterWaermepumpen(SAMPLE_DB, { Qh_kw: 7, toleranz_proz: 50, schallklasse_max: 50 });
  assert.equal(out.length, 1);
  assert.equal(out[0].ID, 'OE-0001');
});

test('filterWaermepumpen — tVL_max 65 erlaubt nur Oertli', () => {
  const out = filterWaermepumpen(SAMPLE_DB, { Qh_kw: 7, toleranz_proz: 50, tVL_max: 65 });
  // alle ≥ 65? Bosch=60 → raus.
  const ids = out.map(w => w.ID);
  assert.ok(ids.includes('OE-0001'));
  assert.ok(!ids.includes('BO-0001'));
});

test('filterWaermepumpen — Sortierung nach |ΔQ|', () => {
  const out = filterWaermepumpen(SAMPLE_DB, { Qh_kw: 7, toleranz_proz: 50 });
  // |6.71-7|=0.29 vs |7.2-7|=0.20 vs |5.42-7|=1.58 vs |9.57-7|=2.57
  // OE-0001 (0.20) sollte erste sein
  assert.equal(out[0].ID, 'OE-0001');
});

/* --- interpolatePowerCurve --- */

test('interpolatePowerCurve — linear zwischen Stützpunkten', () => {
  const k = [
    { T_aussen: -7, Qh_wp: 5.42, COP: 2.51 },
    { T_aussen:  2, Qh_wp: 7.50, COP: 4.06 }
  ];
  const r = interpolatePowerCurve(k, -2.5);
  // Mitte: Qh ≈ 6.46
  assert.ok(close(r.Qh_wp, 6.46, 0.05));
});

test('interpolatePowerCurve — extrapoliert nicht, klemmt am Rand', () => {
  const k = [{ T_aussen: -7, Qh_wp: 5, COP: 2.5 }, { T_aussen: 2, Qh_wp: 8, COP: 4 }];
  const r = interpolatePowerCurve(k, -20);
  assert.equal(r.Qh_wp, 5);
});

/* --- bivalenzpunkt --- */

test('bivalenzpunkt — typischer Fall: 8 kW Last, WP deckt bis ca. -3°C', () => {
  // Heizgrenze 15, T_N = -8, Qh_geb = 8 kW
  // WP-Kennlinie: bei -7 → 6 kW, bei 2 → 8 kW, bei 7 → 9 kW
  const r = bivalenzpunkt({
    Qh_geb: 8,
    kennlinie: [
      { T_aussen: -7, Qh_wp: 6, COP: 2.5 },
      { T_aussen:  2, Qh_wp: 8, COP: 3.8 },
      { T_aussen:  7, Qh_wp: 9, COP: 4.5 }
    ],
    T_N: -8, T_HG: 15
  });
  assert.ok(r.T_biv != null);
  assert.ok(r.T_biv > -8 && r.T_biv < 5, `T_biv ${r.T_biv} sollte zwischen -8 und 5 sein`);
  assert.ok(r.deckungEnergie > 0.85, `deckungEnergie ${r.deckungEnergie} sollte > 0.85 sein`);
});

test('bivalenzpunkt — leere Kennlinie → null', () => {
  const r = bivalenzpunkt({ Qh_geb: 8, kennlinie: [] });
  assert.equal(r.T_biv, null);
});

/* --- jazSchaetzung --- */

test('jazSchaetzung — Luft, tVL 35, anteilWW 15 % → JAZ ca. 3.5', () => {
  const r = jazSchaetzung({
    quelle: 'luft', tVL_heizung: 35, anteilWW: 0.15, tVL_WW: 55,
    COP_ref: 4.0, COP_WW_ref: 2.8
  });
  assert.ok(r.JAZ > 3.0 && r.JAZ < 4.2, `JAZ ${r.JAZ} sollte 3.0..4.2 sein`);
  assert.ok(r.COP_heizen > r.COP_WW);
});

test('jazSchaetzung — Sole-Bonus erhöht JAZ', () => {
  const a = jazSchaetzung({ quelle: 'luft', tVL_heizung: 35 }).JAZ;
  const b = jazSchaetzung({ quelle: 'sole', tVL_heizung: 35 }).JAZ;
  assert.ok(b > a, `Sole sollte besser sein als Luft (${b} vs ${a})`);
});

test('jazSchaetzung — höherer tVL → niedrigere JAZ', () => {
  const a = jazSchaetzung({ tVL_heizung: 35 }).JAZ;
  const b = jazSchaetzung({ tVL_heizung: 55 }).JAZ;
  assert.ok(a > b);
});

/* --- inverterCheck --- */

test('inverterCheck — Q_HL/Q_WP 0.85 → grün', () => {
  const r = inverterCheck(8, 9.4);
  assert.equal(r.ampel, 'gruen');
});
test('inverterCheck — 0.65 → gelb (übergrösse)', () => {
  const r = inverterCheck(6, 9.2);
  assert.equal(r.ampel, 'gelb');
});
test('inverterCheck — 0.5 → rot', () => {
  const r = inverterCheck(5, 10);
  assert.equal(r.ampel, 'rot');
});

/* --- getSelectedWp --- */

test('getSelectedWp — findet by ID', () => {
  const sel = getSelectedWp(SAMPLE_DB, { gewaehlt_id: 'OE-0001' });
  assert.ok(sel);
  assert.equal(sel.Marke, 'Oertli');
});

test('getSelectedWp — null wenn keine ID', () => {
  assert.equal(getSelectedWp(SAMPLE_DB, {}), null);
});

/* --- computeHeatpumpResult (state-Integration) --- */

test('computeHeatpumpResult — Q_h 7 kW + Auswahl liefert Liste, Inverter, Bivalenz, JAZ', () => {
  const state = {
    objekt: { tVLMaxHeizung: 50, tAussenAuslegung: -8 },
    geraet: { gewaehlt_id: 'OE-0001', filter: { toleranz_proz: 50, aufstellung: 'alle' } },
    warmwasser: { tLadeWW: 55 }
  };
  const r = computeHeatpumpResult(state, SAMPLE_DB, 7);
  assert.ok(r.liste.length > 0);
  assert.ok(r.sel);
  assert.equal(r.sel.ID, 'OE-0001');
  assert.ok(r.inverter);
  assert.ok(r.biv);
  assert.ok(r.jaz);
  assert.ok(r.jaz.JAZ > 0);
});
