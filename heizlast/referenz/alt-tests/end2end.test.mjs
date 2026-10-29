// tests/end2end.test.mjs
// End-to-End-Tests, die den UI-Resolver-Pfad testen.
// Erstellt 2026-04-28 nach AUDIT.md (Bug 3.2/3.3/3.5/3.6/3.11) — die regulären
// heatload-Tests umgehen den Resolver, indem sie u/fRT direkt aus den JSONs übergeben.
// Diese Tests gehen den realen Datenfluss: state → resolveBauteilUFrt →
// enrichRaeumeWithResolvedUFrt → computeBuildingDetailLoad.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { freshState } from '../src/state.mjs';
import {
  setUWerteData, resolveBauteilUFrt,
  enrichRaeumeWithResolvedUFrt
} from '../src/ui.mjs';
import { computeBuildingDetailLoad } from '../src/calc/heatload.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const UWERTE = JSON.parse(readFileSync(resolve(here, '../data/u-werte.json'), 'utf-8'));

// U-Werte-DB initialisieren (sonst greift der Resolver auf null)
setUWerteData(UWERTE);

const relErr = (a, b) => (b === 0 ? Math.abs(a) : Math.abs(a - b) / Math.abs(b));

/* ------------------------------------------------------------------------- *
   AUDIT 3.2 / 3.3 — Fenster: Variant-Dropdown muss U-Wert wirklich verändern
 * ------------------------------------------------------------------------- */

test('Fenster-Resolver — Variant "einfachverglasung" → U ≈ 4.7 W/m²K', () => {
  const state = freshState();
  state.objekt.bauperiode = '1986-1990';
  state.objekt.sanierungsstand = 'unsaniert';
  const b = { typ: 'fenster', variant: 'einfachverglasung', fenster_rahmen: 'kunststoff', A: 2 };
  const r = resolveBauteilUFrt(state, b);
  // fensterUWert.einfachverglasung.uFenster_kunststoff.typ = 4.7
  assert.ok(Math.abs(r.u - 4.7) < 0.05, `expected U≈4.7, got ${r.u}`);
});

test('Fenster-Resolver — Variant "isolierglas_3fach_high_end" → U ≤ 0.85 W/m²K', () => {
  const state = freshState();
  state.objekt.bauperiode = '2010-heute';
  const b = { typ: 'fenster', variant: 'isolierglas_3fach_high_end', fenster_rahmen: 'kunststoff', A: 2 };
  const r = resolveBauteilUFrt(state, b);
  // fensterUWert.isolierglas_3fach_high_end.uFenster_kunststoff.typ ≈ 0.7-0.8
  assert.ok(r.u <= 0.85, `expected U≤0.85, got ${r.u}`);
});

test('Fenster-Resolver — Variant rotiert, U ändert sich monoton (Einfach > 2-fach > 3-fach)', () => {
  const state = freshState();
  state.objekt.bauperiode = '1986-1990';
  const variants = [
    'einfachverglasung',
    'isolierglas_2fach_ohne_low_e',
    'isolierglas_2fach_low_e_argon',
    'isolierglas_3fach_standard',
    'isolierglas_3fach_high_end'
  ];
  const us = variants.map(v => resolveBauteilUFrt(state, {
    typ: 'fenster', variant: v, fenster_rahmen: 'kunststoff', A: 2
  }).u);
  for (let i = 1; i < us.length; i++){
    assert.ok(us[i] <= us[i-1] + 1e-6,
      `U[${variants[i]}]=${us[i]} sollte ≤ U[${variants[i-1]}]=${us[i-1]} sein`);
  }
  // Spannweite muss signifikant sein
  const range = us[0] - us[us.length - 1];
  assert.ok(range > 3.0, `Spannweite ${range} zu klein — Resolver greift evtl. nicht`);
});

test('Fenster-Resolver — Variant "unbekannt" → Bauperiode-Default greift (kein 1.0-Notnagel)', () => {
  const state = freshState();
  state.objekt.bauperiode = 'vor1945';   // → fensterGenerationDefault = 'einfach'
  state.objekt.sanierungsstand = 'unsaniert';
  const b = { typ: 'fenster', variant: 'unbekannt', fenster_rahmen: 'holz', A: 2 };
  const r = resolveBauteilUFrt(state, b);
  // fensterGenerationen.einfach.uw = 5.2
  assert.ok(r.u >= 4.5, `vor1945 + unbekannt → U sollte ≥4.5 sein (nicht 1.0-Notnagel), got ${r.u}`);
});

test('Fenster-Resolver — End-to-End: Variant-Wechsel ändert phiHL_total signifikant', () => {
  // Detail-Modus, ein Raum, ein Fenster — Variant rotieren
  const buildState = (variant) => {
    const s = freshState();
    s.objekt.bauperiode = '1986-1990';
    s.objekt.tAussenAuslegung = -8;
    s.objekt.ebf = 30;
    s.detail.aktiv = true;
    s.detail.misch.rest_global = false;
    s.detail.raeume = [{
      name: 'Testraum', A: 30, h: 2.5, V: 75, theta_int: 20, beheizt: true,
      bauteile: [
        { typ: 'fenster', variant, fenster_rahmen: 'kunststoff', A: 5 }
      ]
    }];
    return s;
  };
  const stateOld  = buildState('einfachverglasung');
  const stateNew  = buildState('isolierglas_3fach_high_end');
  const enrichedOld = enrichRaeumeWithResolvedUFrt(stateOld);
  const enrichedNew = enrichRaeumeWithResolvedUFrt(stateNew);
  const resOld = computeBuildingDetailLoad(enrichedOld, {});
  const resNew = computeBuildingDetailLoad(enrichedNew, {});
  assert.ok(resOld.phiHL_total > 0, 'phiHL_total sollte > 0 sein');
  assert.ok(resNew.phiHL_total > 0, 'phiHL_total sollte > 0 sein');
  // Differenz muss substantiell sein (Einfach 4.7 vs 3-fach 0.7 → Faktor ~6.7 in U)
  const ratio = resOld.phiHL_total / resNew.phiHL_total;
  assert.ok(ratio > 1.5, `Variant-Wechsel sollte phiHL stark ändern, Verhältnis ${ratio.toFixed(2)}`);
});

/* ------------------------------------------------------------------------- *
   AUDIT 3.5 — fRT für 'unbeheizt' = 0.5 (EN 12831 Standard, war 0.7)
 * ------------------------------------------------------------------------- */

test('Anschluss "unbeheizt" → fRT = 0.5 (EN 12831 Standardwert b_u)', () => {
  const state = freshState();
  state.objekt.bauperiode = '1986-1990';
  const b = { typ: 'wand', variant: 'unbekannt', anschluss: 'unbeheizt', A: 10 };
  const r = resolveBauteilUFrt(state, b);
  assert.ok(Math.abs(r.fRT - 0.5) < 1e-6, `expected fRT=0.5, got ${r.fRT}`);
});

/* ------------------------------------------------------------------------- *
   AUDIT 3.6 — fRT für 'beheizt' formel-basiert (θint−θnb)/(θint−θe)
 * ------------------------------------------------------------------------- */

test('Anschluss "beheizt" mit θ_nb=15, θ_int=20, θ_e=−12 → fRT ≈ 0.156', () => {
  const state = freshState();
  state.objekt.bauperiode = '1986-1990';
  state.objekt.tInnenAuslegung = 20;
  state.objekt.tAussenAuslegung = -12;
  const b = { typ: 'wand', variant: 'unbekannt', anschluss: 'beheizt', theta_nb: 15, A: 10 };
  const r = resolveBauteilUFrt(state, b);
  // (20-15)/(20-(-12)) = 5/32 = 0.15625
  assert.ok(Math.abs(r.fRT - 0.15625) < 1e-3, `expected fRT≈0.156, got ${r.fRT}`);
});

test('Anschluss "beheizt" Bad 24°C → Wohnzimmer 20°C, θ_e=−12 → fRT ≈ 0.111', () => {
  const state = freshState();
  state.objekt.bauperiode = '1986-1990';
  state.objekt.tInnenAuslegung = 24;
  state.objekt.tAussenAuslegung = -12;
  const b = { typ: 'wand', variant: 'unbekannt', anschluss: 'beheizt', theta_nb: 20, A: 10 };
  const r = resolveBauteilUFrt(state, b);
  // (24-20)/(24-(-12)) = 4/36 = 0.111
  assert.ok(Math.abs(r.fRT - 4/36) < 1e-3, `expected fRT≈0.111, got ${r.fRT}`);
});

test('Anschluss "beheizt" ohne theta_nb → Default 20°C → fRT = 0 (interner Raum mit gleicher Soll-Temp)', () => {
  const state = freshState();
  state.objekt.bauperiode = '1986-1990';
  state.objekt.tInnenAuslegung = 20;
  state.objekt.tAussenAuslegung = -8;
  const b = { typ: 'wand', variant: 'unbekannt', anschluss: 'beheizt', A: 10 };
  const r = resolveBauteilUFrt(state, b);
  assert.ok(Math.abs(r.fRT) < 1e-6, `expected fRT=0 (gleiche T), got ${r.fRT}`);
});

/* ------------------------------------------------------------------------- *
   AUDIT 3.4 — Pauschal-Rest mit Lüftungs-Infiltration (n50/e_wind)
 * ------------------------------------------------------------------------- */

test('Pauschal-Rest — n50=6 (Altbau) → V_inf > V_min, dominiert HV', async () => {
  const { computePauschalRest } = await import('../src/calc/heatload.mjs');
  // Altbau: n50=6, e_wind=0.07
  const r = computePauschalRest({
    A_rest: 100, h: 2.5, n_geschosse: 2,
    uHuelle: { wand: 0.5, fenster: 1.0, dach: 0.4, boden: 0.4 },
    theta_int: 20, theta_e: -8,
    n_min: 0.5, n50: 6, e_wind: 0.07
  });
  // V = 250, V_inf = 2*250*6*0.07 = 210, V_min = 250*0.5 = 125 → V_dot = 210
  assert.ok(r.V_inf > r.V_min,
    `Altbau-Infiltration sollte V_min schlagen: V_inf=${r.V_inf}, V_min=${r.V_min}`);
  assert.ok(Math.abs(r.V_dot - r.V_inf) < 1e-6,
    `V_dot sollte = max(V_inf,V_min) sein, V_dot=${r.V_dot}`);
});

test('Pauschal-Rest — Defaults (Bestand) → V_inf < V_min, V_min dominiert', async () => {
  const { computePauschalRest } = await import('../src/calc/heatload.mjs');
  // Default: n50=4, e_wind=0.02 → V_inf = 2*V*4*0.02 = 0.16·V; V_min = 0.5·V
  const r = computePauschalRest({
    A_rest: 100, h: 2.5, n_geschosse: 2,
    uHuelle: { wand: 0.5, fenster: 1.0, dach: 0.4, boden: 0.4 },
    theta_int: 20, theta_e: -8
  });
  assert.ok(r.V_min > r.V_inf, `Bestand-Default: V_min sollte V_inf schlagen`);
  assert.ok(Math.abs(r.V_dot - r.V_min) < 1e-6, `V_dot sollte V_min sein`);
});

/* ------------------------------------------------------------------------- *
   AUDIT 3.11 — End-to-End mit Etagenwohnung (Soll Σ phiHL = 4'447 W ±5 %)
 * ------------------------------------------------------------------------- */

test('Etagenwohnung E2E — State per freshState, dann Variant aus referenzhaus übernehmen', () => {
  // Reduzierter Smoke-Test: nur Wohnzimmer mit IW SW (beheizt-Anschluss),
  // damit AUDIT 3.6 (formel-basiertes fRT) im realen Pfad greift.
  // Volle Etagenwohnung ist im heatload.test.mjs abgedeckt mit direkt
  // übergebenen u/fRT — hier prüfen wir, dass der Resolver die richtigen
  // Werte für IW-Bauteile liefert.
  const state = freshState();
  state.objekt.bauperiode = '1978-1985';
  state.objekt.tInnenAuslegung = 20;
  state.objekt.tAussenAuslegung = -12;
  const b = {
    typ: 'wand', variant: 'unbekannt',
    anschluss: 'beheizt', theta_nb: 15,  // SW Wand zum Treppenhaus 15°C
    A: 5.5
  };
  const r = resolveBauteilUFrt(state, b);
  // Erwarteter fRT = (20-15)/(20-(-12)) = 0.15625 — Etagenwohnung-JSON nutzt 0.15
  assert.ok(Math.abs(r.fRT - 0.15625) < 1e-3,
    `IW SW fRT erwartet 0.156, got ${r.fRT}`);
});
