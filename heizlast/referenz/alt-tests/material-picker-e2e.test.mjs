// tests/material-picker-e2e.test.mjs
// E2E-Tests fuer den Material-Picker im realen UI-Resolver-Pfad
// (state → resolveBauteilUFrt → enrichRaeumeWithResolvedUFrt →
//  computeBuildingDetailLoad). Erstellt 2026-04-29 nach AUDIT 3.13.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { freshState } from '../src/state.mjs';
import {
  setUWerteData, resolveBauteilUFrt,
  enrichRaeumeWithResolvedUFrt, mapPeriodeToBaujahr, normalizePicker
} from '../src/ui.mjs';
import { computeBuildingDetailLoad } from '../src/calc/heatload.mjs';
import { computeUWert } from '../src/calc/material-picker.mjs';
import { migrateBauteilePicker } from '../src/persistence.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const UWERTE = JSON.parse(readFileSync(resolve(here, '../data/u-werte.json'), 'utf-8'));
setUWerteData(UWERTE);

/* ------------------------------------------------------------------------- *
   1. Picker-State greift im Resolver
 * ------------------------------------------------------------------------- */

test('Picker · resolver nutzt computeUWert wenn b.picker definiert ist (AW)', () => {
  const state = freshState();
  state.objekt.bauperiode = '1971-1980';
  const b = {
    typ: 'wand',
    picker: { bauweise: 'hochlochziegel', dicke: 0.24, hatDaemmung: true, daemmstoff: 'eps', daemmDicke: 0.14 },
    anschluss: 'aussenluft', A: 10
  };
  const r = resolveBauteilUFrt(state, b);
  // Erwartet: U ~0.21 (HLZ24 + EPS14)
  assert.ok(r.u > 0.18 && r.u < 0.25, `U=${r.u} aus Picker-Pfad ausserhalb 0.18..0.25`);
  assert.match(r.source, /Picker/, `Resolver-Source sollte "Picker" enthalten, got "${r.source}"`);
});

test('Picker · leerer picker {} → Resolver fällt auf Bauklasse-Default', () => {
  const state = freshState();
  state.objekt.bauperiode = '<1919';   // → vor1945 → AW Default 1.8
  const b = { typ: 'wand', picker: {}, anschluss: 'aussenluft', A: 10 };
  const r = resolveBauteilUFrt(state, b);
  assert.ok(Math.abs(r.u - 1.8) < 0.05, `vor1945 Default erwartet U=1.8, got ${r.u}`);
});

test('Picker · Fenster mit picker.generation=3fach_passiv → Uw=0.80', () => {
  const state = freshState();
  state.objekt.bauperiode = '2010-heute';
  const b = { typ: 'fenster', picker: { generation: '3fach_passiv' }, anschluss: 'aussenluft', A: 5 };
  const r = resolveBauteilUFrt(state, b);
  assert.ok(Math.abs(r.u - 0.80) < 0.02, `Fenster 3fach_passiv erwartet Uw=0.80, got ${r.u}`);
});

test('Picker · ohne picker → alter variant/layers-Pfad bleibt aktiv (Backwards-Compat)', () => {
  const state = freshState();
  state.objekt.bauperiode = '1986-1990';
  const b = { typ: 'wand', variant: 'unbekannt', anschluss: 'aussenluft', A: 10 };
  // KEIN b.picker → alter Pfad
  const r = resolveBauteilUFrt(state, b);
  assert.ok(r.u > 0 && r.u < 5, `Backwards-Compat-Pfad liefert plausiblen U-Wert, got ${r.u}`);
  assert.ok(!/Picker/.test(r.source), `Source sollte NICHT "Picker" enthalten, got "${r.source}"`);
});

/* ------------------------------------------------------------------------- *
   2. Picker-Variation bewirkt phiHL-Variation (E2E)
 * ------------------------------------------------------------------------- */

test('Picker · E2E Fenster-Generation-Wechsel ändert phiHL_total signifikant', () => {
  const buildState = (gen) => {
    const s = freshState();
    s.objekt.bauperiode = '1986-1990';
    s.objekt.tAussenAuslegung = -8;
    s.objekt.ebf = 30;
    s.detail.aktiv = true;
    s.detail.misch.rest_global = false;
    s.detail.raeume = [{
      name: 'Test', A: 30, h: 2.5, V: 75, theta_int: 20, beheizt: true,
      bauteile: [{ typ: 'fenster', picker: { generation: gen }, A: 5 }]
    }];
    return s;
  };
  const stOld = buildState('einfach');         // Uw=5.20
  const stNew = buildState('3fach_passiv');    // Uw=0.80
  const eOld = enrichRaeumeWithResolvedUFrt(stOld);
  const eNew = enrichRaeumeWithResolvedUFrt(stNew);
  const rOld = computeBuildingDetailLoad(eOld, {});
  const rNew = computeBuildingDetailLoad(eNew, {});
  assert.ok(rOld.phiHL_total > 0 && rNew.phiHL_total > 0, 'phiHL_total > 0 erwartet');
  // einfach (5.20) vs 3fach_passiv (0.80) → Faktor ~6.5 in U → grosse phiHL-Differenz
  const ratio = rOld.phiHL_total / rNew.phiHL_total;
  assert.ok(ratio > 1.5, `Picker-Wechsel sollte phiHL stark ändern, ratio=${ratio.toFixed(2)}`);
});

/* ------------------------------------------------------------------------- *
   3. Etagenwohnung-Approx mit Picker — Σ phiHL Plausi
 * ------------------------------------------------------------------------- */

test('Picker · E2E Etagenwohnung-Approx (1971-1980) mit Picker-State → Σ phiHL plausibel', () => {
  // Vereinfachte Etagenwohnung mit 4 Räumen, Picker-Eingaben für den 1961_1977-
  // Bauklasse-Default-Pfad. Wir prüfen, dass Σ phiHL > 0 und nicht absurd hoch.
  // Ziel: zeigen, dass der Picker-Pfad ein zusammenhängendes Ergebnis liefert,
  // nicht exakt 4'447 W (das Soll basiert auf manuell gesetzten U-Werten).
  const state = freshState();
  state.objekt.bauperiode = '1971-1980';
  state.objekt.tInnenAuslegung = 20;
  state.objekt.tAussenAuslegung = -12;
  state.objekt.ebf = 48;
  state.detail.aktiv = true;
  state.detail.misch.rest_global = false;
  state.detail.raeume = [
    { name: 'Küche',    A: 10.83, h: 2.5, V: 27.1, theta_int: 20, beheizt: true,
      bauteile: [
        { typ: 'wand',    picker: { bauweise: 'hochlochziegel', dicke: 0.30, hatDaemmung: false }, anschluss: 'aussenluft', A: 10.1 },
        { typ: 'fenster', picker: { generation: '2fach_unbeschichtet' }, A: 1.8 },
        { typ: 'dach',    picker: { bauweise: 'flachdach_beton', dicke: 0.20, hatDaemmung: true, daemmstoff: 'mineralwolle', daemmDicke: 0.06 }, anschluss: 'aussenluft', A: 13.1 },
        { typ: 'boden',   picker: { bauweise: 'stahlbeton', dicke: 0.20, hatDaemmung: false }, anschluss: 'unbeheizt', A: 13.1 }
      ] },
    { name: 'Wohnen',   A: 18.5,  h: 2.5, V: 46.3, theta_int: 20, beheizt: true,
      bauteile: [
        { typ: 'wand',    picker: { bauweise: 'hochlochziegel', dicke: 0.30, hatDaemmung: false }, anschluss: 'aussenluft', A: 18 },
        { typ: 'fenster', picker: { generation: '2fach_unbeschichtet' }, A: 4 },
        { typ: 'dach',    picker: { bauweise: 'flachdach_beton', dicke: 0.20, hatDaemmung: true, daemmstoff: 'mineralwolle', daemmDicke: 0.06 }, anschluss: 'aussenluft', A: 18.5 },
        { typ: 'boden',   picker: { bauweise: 'stahlbeton', dicke: 0.20, hatDaemmung: false }, anschluss: 'unbeheizt', A: 18.5 }
      ] }
  ];
  const enriched = enrichRaeumeWithResolvedUFrt(state);
  const r = computeBuildingDetailLoad(enriched, {});
  assert.ok(r.phiHL_total > 1000 && r.phiHL_total < 6000,
    `Etagenwohnung Σ phiHL plausibel (1-6 kW erwartet), got ${r.phiHL_total} W`);
});

/* ------------------------------------------------------------------------- *
   4. Tool ↔ Pro Konsistenz: identische Picker-Inputs → identische U-Werte
 * ------------------------------------------------------------------------- */

test('Picker · Tool ↔ Pro Konsistenz: AW HLZ24+EPS14 → U ~0.21', () => {
  const r = computeUWert('aussenwand', 1980, {
    bauweise: 'hochlochziegel', dicke: 0.24,
    hatDaemmung: true, daemmstoff: 'eps', daemmDicke: 0.14
  });
  // Pro-Test garantiert 0.18..0.25 — Tool muss identisch sein
  assert.ok(r.uWert > 0.18 && r.uWert < 0.25, `Tool-Pro-Konsistenz: U=${r.uWert} ausserhalb 0.18..0.25`);
});

test('Picker · Tool ↔ Pro Konsistenz: Dach Flachdach + PUR20 → U < 0.20', () => {
  const r = computeUWert('dach', 2010, {
    bauweise: 'flachdach_beton', dicke: 0.20,
    hatDaemmung: true, daemmstoff: 'pur', daemmDicke: 0.20
  });
  assert.ok(r.uWert < 0.20, `Tool-Pro-Konsistenz: U=${r.uWert} >= 0.20`);
});

test('Picker · Tool ↔ Pro Konsistenz: Boden Stahlbeton + XPS12 → U 0.20..0.30', () => {
  const r = computeUWert('boden', 2005, {
    bauweise: 'stahlbeton', dicke: 0.20,
    hatDaemmung: true, daemmstoff: 'xps', daemmDicke: 0.12
  });
  assert.ok(r.uWert > 0.20 && r.uWert < 0.30, `Tool-Pro-Konsistenz: U=${r.uWert} ausserhalb 0.20..0.30`);
});

test('Picker · Tool ↔ Pro Konsistenz: Fenster 3fach → Uw=0.95', () => {
  const r = computeUWert('fenster', 2010, { generation: '3fach' });
  assert.equal(r.uWert, 0.95);
});

/* ------------------------------------------------------------------------- *
   5. Migration alter Projekte (persistence.mjs:migrateBauteilePicker)
 * ------------------------------------------------------------------------- */

test('Migration · alte Bauteile bekommen leeres picker:{}', () => {
  const state = {
    detail: { raeume: [{
      bauteile: [
        { typ: 'wand', variant: 'unbekannt', A: 10 },
        { typ: 'dach', variant: 'schichten', A: 20 },
        { typ: 'tueren', variant: 'unbekannt', A: 2 } // bleibt unangetastet
      ]
    }]}
  };
  migrateBauteilePicker(state);
  assert.deepEqual(state.detail.raeume[0].bauteile[0].picker, {}, 'Wand bekommt picker:{}');
  assert.deepEqual(state.detail.raeume[0].bauteile[1].picker, {}, 'Dach bekommt picker:{}');
  assert.equal(state.detail.raeume[0].bauteile[2].picker, undefined, 'Tueren bleibt ohne picker');
});

test('Migration · Fenster mit altem variant bekommt picker.generation gemappt', () => {
  const state = {
    detail: { raeume: [{
      bauteile: [
        { typ: 'fenster', variant: 'isolierglas_3fach_high_end', A: 4 },
        { typ: 'fenster', variant: 'einfachverglasung', A: 2 },
        { typ: 'fenster', variant: 'isolierglas_2fach_low_e_argon', A: 3 }
      ]
    }]}
  };
  migrateBauteilePicker(state);
  assert.equal(state.detail.raeume[0].bauteile[0].picker.generation, '3fach_passiv');
  assert.equal(state.detail.raeume[0].bauteile[1].picker.generation, 'einfach');
  assert.equal(state.detail.raeume[0].bauteile[2].picker.generation, '2fach_low_e');
});

test('Migration · Bauteile mit existierendem picker werden NICHT überschrieben', () => {
  const state = {
    detail: { raeume: [{
      bauteile: [
        { typ: 'wand', picker: { bauweise: 'vollziegel', dicke: 0.5 }, A: 10 }
      ]
    }]}
  };
  migrateBauteilePicker(state);
  assert.equal(state.detail.raeume[0].bauteile[0].picker.bauweise, 'vollziegel');
  assert.equal(state.detail.raeume[0].bauteile[0].picker.dicke, 0.5);
});

/* ------------------------------------------------------------------------- *
   6. Helper-Tests: mapPeriodeToBaujahr + normalizePicker
 * ------------------------------------------------------------------------- */

test('mapPeriodeToBaujahr · Spannweite zur Mitte', () => {
  assert.equal(mapPeriodeToBaujahr('1971-1980'), 1976);
  assert.equal(mapPeriodeToBaujahr('1986-1990'), 1988);
  assert.equal(mapPeriodeToBaujahr('<1919'), 1900);
  assert.equal(mapPeriodeToBaujahr('minergie'), 2018);
  assert.equal(mapPeriodeToBaujahr('2011-heute'), 2018);
});

test('normalizePicker · String-Input wird korrekt typisiert', () => {
  const r = normalizePicker({
    bauweise: 'hochlochziegel',
    dicke: '0.24',
    hatDaemmung: 'true',
    daemmstoff: '',
    daemmDicke: 'invalid'
  });
  assert.equal(r.bauweise, 'hochlochziegel');
  assert.equal(r.dicke, 0.24);
  assert.equal(r.hatDaemmung, true);
  assert.equal(r.daemmstoff, null);
  assert.equal(r.daemmDicke, null);
});
