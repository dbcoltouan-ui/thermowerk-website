// tests/dhw.test.mjs
// Tests für src/calc/dhw.mjs gegen reference/BEISPIELRECHNUNG.md (FWS-Beispiel
// Referenzhaus Moosseedorf) und Wissensbasis-Werte.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  effectiveVWu, qwuTag, qwwTag, qnwwJahr, qw, vwStoRoh,
  rundeSpeicherMarkt, rundePufferMarkt, speichervolumen,
  computeDhw,
  C_P, F_STO_PRESETS, VERLUST_DEFAULTS,
  // S5
  sicherheitsventilEmpfehlung, ausdehnungsfaktor, anlagenvolumenSchaetzung,
  magVolumen, MAG_STUFEN
} from '../src/calc/dhw.mjs';

const close = (a, b, tol) => Math.abs(a - b) <= tol;
function assertClose(a, b, tol, msg){
  if (!close(a, b, tol)) assert.fail(`${msg||''} expected ${b}±${tol}, got ${a}`);
}

/* --- effectiveVWu --- */

test('effectiveVWu — direkt liefert VW_u', () => {
  assert.equal(effectiveVWu({ modus:'direkt', VW_u: 180 }), 180);
});

test('effectiveVWu — personen × l/(P·d)', () => {
  assert.equal(effectiveVWu({ modus:'personen', personen: 4, lProPerson: 45 }), 180);
});

test('effectiveVWu — lProPerson default 40', () => {
  assert.equal(effectiveVWu({ modus:'personen', personen: 4 }), 160);
});

/* --- Primitive Formeln (BEISPIELRECHNUNG Schritt 2/6/7/10) --- */

test('qwuTag — 180 l/d × 4.2 × 50 / 3600 = 10.5 kWh/d', () => {
  // Achtung: BEISPIELRECHNUNG-„Basis 3832.5 kWh/a" entspricht QW,u/365·365 = 3832.5
  // d.h. QW,u = 3832.5/365 = 10.5 kWh/d
  const Q = qwuTag({ V_l_d: 180, cp: C_P, dT: 50 });
  assertClose(Q, 10.5, 1e-6, 'QW,u');
});

test('qwwTag — Faktor 1.265 → QWW_Tag ≈ 13.28 kWh/d', () => {
  const QWW = qwwTag({ QW_u: 10.5, fSpeicher: 10, fZirk: 0, fAusstoss: 15 });
  assertClose(QWW, 10.5 * 1.265, 1e-6, 'QWW_Tag');
  assertClose(QWW, 13.2825, 1e-3, 'QWW_Tag ≈ 13.28');
});

test('qnwwJahr — BEISPIELRECHNUNG Schritt 2 → 4848.1 kWh/a', () => {
  const Qn = qnwwJahr({ V_l_d: 180, cp: C_P, dT: 50, fSpeicher: 10, fZirk: 0, fAusstoss: 15 });
  assertClose(Qn, 4848.125, 0.5, 'Qn,WW');
});

test('qw — BEISPIELRECHNUNG Schritt 7 → Qw ≈ 0.588 kW', () => {
  const r = qw({ Qhl: 9.276, QWW_Tag: 13.282 });
  assertClose(r.td, 1.4319, 1e-3, 'td');
  assertClose(r.Qw, 0.5887, 5e-3, 'Qw');
  assert.equal(r.tdClamped, false);
});

test('qw — clamp tdRaw > 12', () => {
  const r = qw({ Qhl: 1, QWW_Tag: 20 });
  assertClose(r.td, 12, 1e-9);
  assert.equal(r.tdClamped, true);
});

test('vwStoRoh — BEISPIELRECHNUNG Schritt 10 → 227.7 l', () => {
  const V = vwStoRoh({ QWW_Tag: 13.282, cp: C_P, dT: 50 });
  assertClose(V, 227.7, 0.5, 'V_Sto roh');
});

test('rundeSpeicherMarkt — Staffelung', () => {
  assert.equal(rundeSpeicherMarkt(150), 150);
  assert.equal(rundeSpeicherMarkt(151), 200);
  assert.equal(rundeSpeicherMarkt(201), 300);
  assert.equal(rundeSpeicherMarkt(290), 300);
  assert.equal(rundeSpeicherMarkt(501), 750);
  assert.equal(rundeSpeicherMarkt(800), 1000);
  assert.equal(rundeSpeicherMarkt(1100), 1500);
});

test('rundePufferMarkt — feinere Staffelung ≤ 500 L', () => {
  assert.equal(rundePufferMarkt(180), 200);
  assert.equal(rundePufferMarkt(290), 300);
  assert.equal(rundePufferMarkt(500), 500);
  assert.equal(rundePufferMarkt(700), 800);
});

test('speichervolumen — fSto=1.0 → 230 L (BEISPIELRECHNUNG)', () => {
  assert.equal(speichervolumen({ QWW_Tag: 13.282, cp: C_P, dT: 50, fSto: 1.0 }), 230);
});

test('speichervolumen — fSto=1.25 → 290 L', () => {
  assert.equal(speichervolumen({ QWW_Tag: 13.282, cp: C_P, dT: 50, fSto: 1.25 }), 290);
});

/* --- Cascade BEISPIELRECHNUNG.md (Moosseedorf) --- */

test('computeDhw — komplette Cascade (BEISPIELRECHNUNG Moosseedorf)', () => {
  const r = computeDhw({
    modus: 'direkt', VW_u: 180, dT: 50,
    fSpeicher: 10, fZirk: 0, fAusstoss: 15,
    Qhl: 9.276, fSto: 1.0
  });
  assertClose(r.V_l_d,    180,      1e-9, 'V_l_d');
  assertClose(r.QW_u,     10.5,     1e-3, 'QW_u');
  assertClose(r.QWW_Tag,  13.2825,  5e-3, 'QWW_Tag');
  assertClose(r.Qn_WW,    4848.13,  0.5,  'Qn_WW');
  assertClose(r.Qw,       0.589,    5e-3, 'Qw');
  assertClose(r.td,       1.432,    1e-3, 'td');
  assertClose(r.V_Sto_roh, 227.7,   0.5,  'V_Sto_roh');
  assert.equal(r.V_Sto, 230, 'V_Sto (fSto=1.0, 10er)');
});

test('computeDhw — Personen-Modus (4P × 45 l/(P·d) = 180 l/d) liefert dieselbe Cascade', () => {
  const r = computeDhw({
    modus: 'personen', personen: 4, lProPerson: 45, dT: 50,
    fSpeicher: 10, fZirk: 0, fAusstoss: 15,
    Qhl: 9.276, fSto: 1.0
  });
  assertClose(r.QWW_Tag, 13.2825, 5e-3);
  assert.equal(r.V_Sto, 230);
});

test('computeDhw — Messung (QW,u direkt) übergeht V/QW,u-Berechnung', () => {
  const r = computeDhw({
    modus: 'messung', QW_u_messung: 11.0,
    fSpeicher: 10, fZirk: 0, fAusstoss: 15,
    Qhl: 9.276, fSto: 1.0
  });
  assertClose(r.QW_u, 11.0, 1e-9);
  assertClose(r.QWW_Tag, 11.0 * 1.265, 1e-9);
});

test('computeDhw — Defaults für Verlustfaktoren', () => {
  // Wenn keine f_* angegeben werden, sollten Defaults greifen (10/0/15)
  const r = computeDhw({ modus:'direkt', VW_u: 180, Qhl: 9, dT: 50, fSto: 1.0 });
  assertClose(r.QWW_Tag, 10.5 * (1.10 * 1.0 * 1.15), 1e-3);
});

/* --- Constants stabil --- */

test('Konstanten — VERLUST_DEFAULTS und F_STO_PRESETS', () => {
  assert.equal(VERLUST_DEFAULTS.speicher, 10);
  assert.equal(VERLUST_DEFAULTS.zirk, 0);
  assert.equal(VERLUST_DEFAULTS.ausstoss, 15);
  const innen = F_STO_PRESETS.find(x => x.key === 'innen');
  assert.equal(innen.fSto, 1.25);
});

/* ===========================================================================
   S5 — Sicherheitsventil + MAG
   =========================================================================== */

test('sicherheitsventilEmpfehlung — 8 kW EFH → DN15 / 1/2"', () => {
  const r = sicherheitsventilEmpfehlung(8);
  assert.equal(r.dn, 'DN15');
  assert.equal(r.anschluss, '1/2"');
  assert.equal(r.p_ansprech_bar, 3.0);
});

test('sicherheitsventilEmpfehlung — 75 kW MFH → DN20 / 3/4"', () => {
  const r = sicherheitsventilEmpfehlung(75);
  assert.equal(r.dn, 'DN20');
});

test('sicherheitsventilEmpfehlung — 0 kW → null', () => {
  assert.equal(sicherheitsventilEmpfehlung(0), null);
});

test('ausdehnungsfaktor — 70 K ≈ 0.0226', () => {
  assertClose(ausdehnungsfaktor(70), 0.0226, 0.001);
});

test('ausdehnungsfaktor — 50 K ≈ 0.0143, clamping bei 100', () => {
  assertClose(ausdehnungsfaktor(50), 0.0143, 0.001);
  assertClose(ausdehnungsfaktor(150), 0.0408, 0.001); // clampt auf 100
});

test('anlagenvolumenSchaetzung — 8 kW + 200 L Puffer = 96 + 200 = 296 L', () => {
  const r = anlagenvolumenSchaetzung({ Qh_kW: 8, V_puffer: 200 });
  assert.equal(r, 296);
});

test('magVolumen — V_a=200, ΔT=70, p_e=2.5, p_0=1.0 → ca. 12 L', () => {
  const r = magVolumen({ V_a: 200, deltaT_K: 70, p_e: 2.5, p_0: 1.0 });
  // V_v = max(3, 1) = 3
  // V_n = (200·0.0226 + 3) · 3.5 / 1.5 = (4.52 + 3) · 2.333 = 17.55
  // Marktstufe ≥ 17.55 → 18
  assertClose(r.V_n, 17.55, 0.5);
  assert.equal(r.V_n_markt, 18);
});

test('magVolumen — V_a=0 → Hinweis', () => {
  const r = magVolumen({ V_a: 0 });
  assert.equal(r.V_n, 0);
  assert.ok(r.hinweis);
});

test('magVolumen — p_e ≤ p_0 → ungültig', () => {
  const r = magVolumen({ V_a: 200, p_e: 1.0, p_0: 1.0 });
  assert.equal(r.V_n, 0);
});

test('MAG_STUFEN — gängige Stufen vorhanden', () => {
  assert.ok(MAG_STUFEN.includes(18));
  assert.ok(MAG_STUFEN.includes(50));
  assert.ok(MAG_STUFEN.includes(200));
});
