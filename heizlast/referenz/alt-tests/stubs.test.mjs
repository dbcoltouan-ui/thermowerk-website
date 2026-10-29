// tests/stubs.test.mjs
// S5: distribution + heatpump sind implementiert.
// S1 (AUDIT 3.8): plausi.mjs ist aufgeräumt — alte Stub-Tests entfernt.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as distribution from '../src/calc/distribution.mjs';
import * as heatpump     from '../src/calc/heatpump.mjs';
import * as plausi       from '../src/calc/plausi.mjs';

test('distribution.mjs — S5-Funktionen exportiert (nicht mehr Stub)', () => {
  for (const name of ['plausibilitaetHeizflaeche', 'maxVorlauftemperatur',
                      'heizkreiseGruppieren', 'computeDistribution', 'leistungsFaktor']){
    assert.equal(typeof distribution[name], 'function', `Funktion ${name} fehlt`);
  }
});

test('heatpump.mjs — S5-Funktionen exportiert (nicht mehr Stub)', () => {
  for (const name of ['filterWaermepumpen', 'bivalenzpunkt', 'jazSchaetzung',
                      'inverterCheck', 'computeHeatpumpResult']){
    assert.equal(typeof heatpump[name], 'function', `Funktion ${name} fehlt`);
  }
});

test('plausi.mjs — Implementierungen vorhanden (nicht mehr Stub, S1/AUDIT 3.8)', () => {
  for (const name of ['vergleichNormVerbrauch', 'plausiAmpel', 'computePlausi']){
    assert.equal(typeof plausi[name], 'function', `Funktion ${name} fehlt`);
  }
  assert.equal(typeof plausi.SPEZ_BAND, 'object');
});
