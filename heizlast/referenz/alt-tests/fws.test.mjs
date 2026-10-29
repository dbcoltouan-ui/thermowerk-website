// tests/fws.test.mjs
// Tests für src/calc/fws.mjs gegen reference/BEISPIELRECHNUNG.md
// und FWS-RECHENWEGE.md (Aufgabe 1A, 2).
//
// Bugfix-Pass 2026-04-29 (AUDIT 3.1, REVIDIERT): Brennwert-Konstanten
// auf Hi-Konvention (suissetec-FWS-Online-Tool):
//   Hi_heizoel = 9.91 kWh/l, Hi_erdgas = 10.04 kWh/mn³.
// Konsequenz: Verbrauchs-Pfad liefert für die BEISPIELRECHNUNG
// jetzt Qhl ≈ 8.871 kW (vorher 9.276 mit Ho=10.4) — passt zur
// suissetec-Pflicht-PDF, die für Förderanträge gebraucht wird.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  qnwwJahr, qhlAusQn, qwDetail, qoffFormel, speichervolumen, plausiAmpel,
  computeQnVerbrauch, computeQnWW, computeQnWWRaw,
  computeMethodKwh, computeMethodVerbrauch, compute,
  effectiveTvoll, effectiveVWu, sanFactor,
  freshFwsState, HEIZWERT, TVOLL_TABLE, TOFF_DEFAULTS
} from '../src/calc/fws.mjs';

const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
function assertClose(actual, expected, tol, msg){
  if (!close(actual, expected, tol)){
    assert.fail(`${msg || ''} expected ${expected}±${tol}, got ${actual}`);
  }
}

/* --- Primitive Formel-Tests (BEISPIELRECHNUNG.md, Schritt für Schritt) --- */

test('qnwwJahr — BEISPIELRECHNUNG Schritt 2 → 4848.1 kWh/a', () => {
  const Q = qnwwJahr({ V_l_d: 180, cp: 4.2, dT: 50, fSpeicher: 10, fZirk: 0, fAusstoss: 15 });
  assertClose(Q, 4848.125, 0.5, 'Qn,WW');
});

test('qhlAusQn — BEISPIELRECHNUNG Schritt 4 → 9.276 kW', () => {
  const Qhl = qhlAusQn({ QnH: 18551.875, tvoll: 2000 });
  assertClose(Qhl, 9.276, 1e-3, 'Qhl');
});

test('qwDetail — BEISPIELRECHNUNG Schritt 7 → Qw ≈ 0.588 kW, td ≈ 1.432 h', () => {
  const Qhl = 9.276;
  const QnWW = 4848.125;
  const r = qwDetail({ Qhl, QnWW });
  assertClose(r.td, 1.432, 1e-3, 'td');
  assertClose(r.Qw, 0.5885, 5e-3, 'Qw');
  assert.equal(r.tdClamped, false);
});

test('qwDetail — clamp auf td=12 wenn QWW_Tag/Qhl > 12', () => {
  const r = qwDetail({ Qhl: 1, QnWW: 365 * 20 }); // QWW_Tag=20, td_raw=20
  assert.equal(r.tdClamped, true);
  assertClose(r.td, 12, 1e-9);
});

test('qoffFormel — BEISPIELRECHNUNG Schritt 8 → Qoff ≈ 0.843 kW', () => {
  const Qoff = qoffFormel({ Qhl: 9.276, toff: 2 });
  assertClose(Qoff, 0.843, 5e-3, 'Qoff');
});

test('qoffFormel — toff = 0 → 0', () => {
  assert.equal(qoffFormel({ Qhl: 10, toff: 0 }), 0);
});

test('speichervolumen — BEISPIELRECHNUNG Schritt 10 → 230 L (fSto=1.0, 10-L-Schritt)', () => {
  const V = speichervolumen({ QWW_Tag: 13.282, cp: 4.2, dT: 50, fSto: 1.0 });
  assert.equal(V, 230);
});

test('speichervolumen — fSto=1.25 (innen) verschiebt auf 290 L', () => {
  const V = speichervolumen({ QWW_Tag: 13.282, cp: 4.2, dT: 50, fSto: 1.25 });
  assert.equal(V, 290); // 13.282/(4.2*50/3600)*1.25 = 284.65 → ceil(/10)*10 = 290
});

test('plausiAmpel — 61.8 W/m² bei 1986-1990 EFH (Band 30–48) → rot', () => {
  const p = plausiAmpel({ specWm2: 61.8, bauperiode: '1986-1990', gebaeudetyp: 'efh' });
  assert.equal(p.ampel, 'rot');
});

test('plausiAmpel — 40 W/m² bei 1986-1990 EFH → grün', () => {
  const p = plausiAmpel({ specWm2: 40, bauperiode: '1986-1990', gebaeudetyp: 'efh' });
  assert.equal(p.ampel, 'gruen');
});

test('plausiAmpel — 50 W/m² bei 1986-1990 EFH (Band 30–48) → gelb (knapp drüber)', () => {
  const p = plausiAmpel({ specWm2: 50, bauperiode: '1986-1990', gebaeudetyp: 'efh' });
  assert.equal(p.ampel, 'gelb');
});

/* --- BEISPIELRECHNUNG.md über Methode C (kwhManual = QnH) --- */

function buildBeispielState(){
  const s = freshFwsState();
  s.objekt = { typ: 'efh', lage: 'mittelland', bauperiode: '1986-1990', ebf: 150, wohneinheiten: 1 };
  // Methode C: QnH direkt vorgeben (umgeht Ho-Drift Erdgas 10.04 vs Doku 10.4)
  s.heizung.kwhAktiv = true;
  s.heizung.kwhManual = 18551.875; // = 23400 − 4848.125
  // Warmwasser identisch zu Doku
  s.warmwasser = {
    aktiv: true, modus: 'direkt', VW_u: 180,
    personen: 0, lProPerson: 40,
    speicherverluste: 10, zirkulation: 0, ausstoss: 15, dT: 50, tLadeWW: 60
  };
  s.zuschlaege = { sperrzeitAktiv: true, sperrzeitTyp: 'werktag', toffOverride: 0,
                   verbundenAktiv: false, qas: 0 };
  s.speicher = { dT: 50, fStoPreset: 'ohne', awtPreset: 'innen-60-55' }; // fSto=1.0
  return s;
}

test('compute — BEISPIELRECHNUNG Cascade (Methode C) → Qhl, Qw, Qoff, Qh, VW_Sto', () => {
  const s = buildBeispielState();
  const r = compute(s);
  assertClose(r.Qhl,    9.276, 1e-2, 'Qhl');
  assertClose(r.Qw,     0.588, 5e-3, 'Qw');
  assertClose(r.Qoff,   0.843, 5e-3, 'Qoff');
  assertClose(r.Qh,    10.708, 1e-2, 'Qh');
  assert.equal(r.VW_Sto, 230, 'VW_Sto (10-L-Schritt, fSto=1.0)');
  assert.equal(r.plausi.ampel, 'rot', 'Plausi (61.8 W/m² in Band 30–48 → rot)');
});

test('compute — Toleranz < 0.1% gegen BEISPIELRECHNUNG-Sollwerte', () => {
  const s = buildBeispielState();
  const r = compute(s);
  // FWS-BEISPIELRECHNUNG-Toleranz ±0.1 %
  const relErr = (a, b) => Math.abs(a - b) / b;
  assert.ok(relErr(r.Qhl, 9.276) < 1e-3, `Qhl rel.err ${relErr(r.Qhl, 9.276)}`);
  assert.ok(relErr(r.Qh, 10.707) < 1e-3, `Qh rel.err ${relErr(r.Qh, 10.707)}`);
});

/* --- Method-Selection-Priorität --- */

test('compute — Priorität: Verbrauch vor Bauperiode-Fallback', () => {
  const s = freshFwsState();
  s.objekt.ebf = 150;
  s.heizung.verbrauchAktiv = true;
  s.heizung.perioden = [{ id:'p1', energy:'erdgas', etaPreset:'brennwert', etaValue:'',
                          von:'', bis:'', menge: 2500 }];
  s.heizung.verbrauchInklWW = false;
  s.warmwasser.aktiv = false;
  const r = compute(s);
  assert.equal(r.primary?.key, 'verbrauch');
  assert.ok(r.fallback === null);
});

test('compute — Bauperiode-Fallback wenn keine Methode aktiv', () => {
  const s = freshFwsState();
  s.objekt.ebf = 150;
  const r = compute(s);
  assert.equal(r.primary?.key, 'bauperiode');
});

/* --- Verbrauch-Methode mit Hi-Konvention (suissetec) --- */

test('computeQnVerbrauch — 2500 m³ Erdgas × 10.04 × 0.90 = 22 590 kWh/a', () => {
  const s = freshFwsState();
  s.heizung.perioden = [{ id:'p1', energy:'erdgas', etaPreset:'custom', etaValue: 0.90,
                          von:'', bis:'', menge: 2500 }];
  const Qn = computeQnVerbrauch(s);
  assertClose(Qn, 2500 * 10.04 * 0.90, 0.01);
});

test('computeMethodVerbrauch — BEISPIELRECHNUNG (Hi=10.04) → Qhl ≈ 8.871 kW', () => {
  const s = freshFwsState();
  s.objekt = { typ:'efh', lage:'mittelland', bauperiode:'1986-1990', ebf:150, wohneinheiten:1 };
  s.heizung.verbrauchAktiv = true;
  s.heizung.verbrauchInklWW = true;
  s.heizung.perioden = [{ id:'p1', energy:'erdgas', etaPreset:'custom', etaValue: 0.90,
                          von:'', bis:'', menge: 2500 }];
  s.warmwasser = { aktiv:true, modus:'direkt', VW_u:180, personen:0, lProPerson:40,
                   speicherverluste:10, zirkulation:0, ausstoss:15, dT:50, tLadeWW:60 };
  const r = computeMethodVerbrauch(s);
  // Qn = 22590, QnWW = 4848.125, QnH = 17741.875, Qhl = 17741.875/2000 ≈ 8.871
  assertClose(r.Qn,    22590,     1, 'Qn');
  assertClose(r.QnWW,   4848.125, 1, 'QnWW');
  assertClose(r.QnH,   17741.875, 1, 'QnH');
  assertClose(r.Qhl,    8.871,    1e-2, 'Qhl (Hi=10.04 suissetec)');
});

/* --- Aufgabe 1A (FWS-RECHENWEGE.md, jetzt mit Hi=9.91) --- */

test('Aufgabe 1A (Hi_heizoel=9.91) — 2800 l × 9.91 × 0.85 → Qhl ≈ 11.793 kW, Qoff ≈ 1.072 kW', () => {
  const s = freshFwsState();
  s.objekt = { typ:'efh', lage:'mittelland', bauperiode:'1986-1990', ebf:200, wohneinheiten:1 };
  s.heizung.verbrauchAktiv = true;
  s.heizung.verbrauchInklWW = false;
  s.heizung.perioden = [{ id:'p1', energy:'heizoel', etaPreset:'custom', etaValue: 0.85,
                          von:'', bis:'', menge: 2800 }];
  s.warmwasser = { aktiv:false, modus:'direkt', VW_u:0, personen:0, lProPerson:40,
                   speicherverluste:10, zirkulation:0, ausstoss:15, dT:50, tLadeWW:60 };
  s.zuschlaege = { sperrzeitAktiv:true, sperrzeitTyp:'werktag', toffOverride:0,
                   verbundenAktiv:false, qas:0 };
  const r = compute(s);
  // Qn = 2800·9.91·0.85 = 23'585.8 kWh/a, Qhl = 23585.8/2000 ≈ 11.793 kW
  assertClose(r.Qhl,  11.793, 5e-3, 'Qhl');
  // Qoff = 11.793 · (24/22 − 1) = 11.793 · 0.0909 ≈ 1.072 kW
  assertClose(r.Qoff,  1.072, 5e-3, 'Qoff');
});


/* --- Suissetec-Pflicht-PDF Verifikation (Hi-Konvention) --- */

test('Suissetec-PDF (Hi_heizoel=9.91) — 1790 l × 9.91 × 0.85 / 2000 → Qhl ≈ 7.539 kW', () => {
  const s = freshFwsState();
  s.objekt = { typ:'efh', lage:'mittelland', bauperiode:'1986-1990', ebf:190, wohneinheiten:1 };
  s.heizung.verbrauchAktiv = true;
  s.heizung.verbrauchInklWW = false;
  s.heizung.perioden = [{ id:'p1', energy:'heizoel', etaPreset:'alt_ohneWW', etaValue: 0.85,
                          von:'', bis:'', menge: 1790 }];
  s.warmwasser = { aktiv:false, modus:'direkt', VW_u:0, personen:0, lProPerson:40,
                   speicherverluste:10, zirkulation:0, ausstoss:15, dT:50, tLadeWW:60 };
  const r = compute(s);
  // 1790·9.91·0.85/2000 = 7.5393 kW (suissetec-Online-Tool)
  assertClose(r.Qhl, 7.539, 0.01, 'Qhl Suissetec-PDF');
});

/* --- effectiveTvoll / effectiveVWu / Konstanten --- */

test('effectiveTvoll — Mittelland EFH default 2000', () => {
  const s = freshFwsState();
  assert.equal(effectiveTvoll(s), 2000);
});

test('effectiveTvoll — Override > 0 hat Vorrang', () => {
  const s = freshFwsState();
  s.heizung.tvollOverride = 1800;
  assert.equal(effectiveTvoll(s), 1800);
});

test('effectiveVWu — Personen-Modus', () => {
  const s = freshFwsState();
  s.warmwasser.modus = 'personen';
  s.warmwasser.personen = 4;
  s.warmwasser.lProPerson = 45;
  assert.equal(effectiveVWu(s), 180);
});

test('TOFF_DEFAULTS / TVOLL_TABLE / HEIZWERT — Schlüsselwerte stabil', () => {
  assert.equal(TOFF_DEFAULTS.werktag, 2);
  assert.equal(TOFF_DEFAULTS.sonntag, 4);
  assert.equal(TVOLL_TABLE.mittelland.efh, 2000);
  // Hi-Konvention (suissetec-FWS-Online-Tool)
  assert.equal(HEIZWERT.erdgas.Hi,  10.04);
  assert.equal(HEIZWERT.heizoel.Hi,  9.91);
  // Backwards-Compat: Ho-Alias liefert denselben Zahlenwert
  assert.equal(HEIZWERT.erdgas.Ho,  10.04);
  assert.equal(HEIZWERT.heizoel.Ho,  9.91);
});

/* --- Sanierungs-Faktor --- */

test('sanFactor — Π(1-p) bei zukünftigen Sanierungen', () => {
  const s = freshFwsState();
  s.heizung.sanierungen = [
    { proz: 15, zeitpunkt: 'zukunft' },
    { proz:  8, zeitpunkt: 'zukunft' },
    { proz: 10, zeitpunkt: 'zukunft' }
  ];
  // (0.85)(0.92)(0.90) = 0.7038
  assertClose(sanFactor(s), 0.85 * 0.92 * 0.90, 1e-9);
});

test('sanFactor — Vergangenheit mit anteilEffective', () => {
  const s = freshFwsState();
  // p=0.20, a=0.5 → (1-0.2)/(1-0.5·0.2) = 0.80/0.90 = 0.889
  s.heizung.sanierungen = [{ proz: 20, zeitpunkt: 'vergangenheit', anteilEffective: 0.5 }];
  assertClose(sanFactor(s), 0.80/0.90, 1e-9);
});
