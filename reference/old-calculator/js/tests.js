// Verifikation der Rechenengine gegen die 4 Aufgaben des FWS-Aufgabenblatts.
// Kann direkt im Browser geladen werden: <script type="module" src="js/tests.js"></script>
// Ausgabe in Konsole.

import {
  qnAusVerbrauch, qnSumme, qhlAusQn, qoff, qhGesamt, spezHeizleistung,
  qhlNachSanierung, qnwwJahr, qw, qnAusBetriebsstunden, kaelteleistung,
  spezEntzugsleistung, vwuTotal, qwuTag,
} from './heizlast.js';

const assert = (bez, ist, soll, tol = 0.05) => {
  const ok = Math.abs(ist - soll) <= tol;
  console.log(`${ok ? '✓' : '✗'} ${bez}  ist=${ist.toFixed(2)}  soll=${soll.toFixed(2)}`);
  if (!ok) console.warn(`     Abweichung: ${(ist - soll).toFixed(3)}`);
  return ok;
};

console.log('═══ Aufgabe 1A (Öl 2800 l/a) ═══');
const a1a_qn   = qnAusVerbrauch(2800, 10.5, 0.85, { label: 'Öl' });
const a1a_qhl  = qhlAusQn(a1a_qn.wert, 2000);
const a1a_qoff = qoff(a1a_qhl.wert, 2);
const a1a_qh   = qhGesamt(a1a_qhl.wert, 0, a1a_qoff.wert, 0);
assert('Qn',   a1a_qn.wert,   24990, 1);
assert('Qhl',  a1a_qhl.wert,  12.50);
assert('Qoff', a1a_qoff.wert, 1.14);
assert('Qh',   a1a_qh.wert,   13.64);

console.log('\n═══ Aufgabe 1B (Bivalent Gas + Holz) ═══');
const a1b_qnGas  = qnAusVerbrauch(2500, 10.4, 0.92, { label: 'Gas' });
const a1b_qnHolz = qnAusVerbrauch(5, 2500, 0.75, { label: 'Hartholz' });
const a1b_qn    = qnSumme([a1b_qnGas, a1b_qnHolz]);
const a1b_qhl   = qhlAusQn(a1b_qn.wert, 2000);
const a1b_qoff  = qoff(a1b_qhl.wert, 4);
const a1b_qh    = qhGesamt(a1b_qhl.wert, 0, a1b_qoff.wert, 0);
assert('Qn gesamt', a1b_qn.wert,   33295, 5);
assert('Qhl',       a1b_qhl.wert,  16.65);
assert('Qoff',      a1b_qoff.wert, 3.33, 0.02);
assert('Qh',        a1b_qh.wert,   19.98, 0.02);

console.log('\n═══ Aufgabe 2 (EFH 1975, Öl inkl. WW) ═══');
const a2_qnHWW  = qnAusVerbrauch(3500, 10.5, 0.8, { label: 'Öl inkl. WW' });
const a2_qnWW   = qnwwJahr(160, { speicher: 0.10, zirk: 0, ausstoss: 0.15 });
const a2_qnH    = a2_qnHWW.wert - a2_qnWW.wert;
const a2_qhl    = qhlAusQn(a2_qnH, 2000);
const a2_spez   = spezHeizleistung(a2_qhl.wert, 270, '1971_80', 'efh');
const a2_qoff   = qoff(a2_qhl.wert, 3);
const a2_qwwTag = a2_qnWW.wert / 365;
const a2_qw     = qw(a2_qhl.wert, a2_qwwTag);
const a2_qhWP   = qhGesamt(a2_qhl.wert, a2_qw.wert, a2_qoff.wert, 0);
assert('Qn (H+WW)',     a2_qnHWW.wert,  29400, 1);
assert('Qn,WW',         a2_qnWW.wert,    4309, 5);
assert('Qn,H',          a2_qnH,         25091, 10);
assert('Qhl',           a2_qhl.wert,    12.55, 0.02);
assert('spez. W/m²',    a2_spez.wert,   46.5,  0.5);
assert('Qoff',          a2_qoff.wert,    1.79, 0.02);
assert('Qw',            a2_qw.wert,      0.51, 0.02);
assert('Qh,WP',         a2_qhWP.wert,   14.85, 0.05);

console.log('\n—— Mit Dämmmassnahmen (Fenster 15, Keller 8, Estrich 10) ——');
const a2_qhlNeu = qhlNachSanierung(a2_qhl.wert, [
  { id: 'fenster',     label: 'Fenster',     einsparungProzent: 15 },
  { id: 'kellerdecke', label: 'Kellerdecke', einsparungProzent: 8  },
  { id: 'estrich',     label: 'Estrich',     einsparungProzent: 10 },
]);
const a2_qoffN  = qoff(a2_qhlNeu.wert, 3);
const a2_qwN    = qw(a2_qhlNeu.wert, a2_qwwTag);
const a2_qhWPn  = qhGesamt(a2_qhlNeu.wert, a2_qwN.wert, a2_qoffN.wert, 0);
assert('Qhl,neu',  a2_qhlNeu.wert, 8.80, 0.05);
assert('Qoff,neu', a2_qoffN.wert,  1.26, 0.02);
assert('Qw,neu',   a2_qwN.wert,    0.52, 0.05);
assert('Qh,WP neu', a2_qhWPn.wert, 10.58, 0.1);

console.log('\n═══ Aufgabe 3 (MFH Minergie-P, 11 Whg) ═══');
// VW,u aus Personen Annahme 27.4 × 45 l/P (gem. Lösung)
const a3_qnww = qnwwJahr(27.4 * 45, { speicher: 0.10, zirk: 0, ausstoss: 0.15 });
assert('Qn,WW geschätzt', a3_qnww.wert, 33210, 20);

const a3_qhl    = qhlAusQn(23000, 2000);
const a3_spez   = spezHeizleistung(a3_qhl.wert, 1832, '2011_heute', 'mfh');
assert('Qhl Messung', a3_qhl.wert, 11.5);
assert('spez W/m²',   a3_spez.wert, 6.28, 0.1);
console.log(`   Plausibilität: ${a3_spez.ampel.toUpperCase()} – ${a3_spez.hinweis}`);

const a3_qwTag = a3_qnww.wert / 365;
const a3_qw    = qw(a3_qhl.wert, a3_qwTag);
assert('Qw', a3_qw.wert, 5.64, 0.05);

console.log('\n═══ Aufgabe 4 (Betriebsstundenzähler) ═══');
const a4_qnH   = qnAusBetriebsstunden(14000, 10, 12);
const a4_qhl   = qhlAusQn(a4_qnH.wert, 2000);
const a4_qnWW  = qnwwJahr(160, { speicher: 0.10, zirk: 0.15, ausstoss: 0.15 });
const a4_qwTag = a4_qnWW.wert / 365;
const a4_qw    = qw(a4_qhl.wert, a4_qwTag);
const a4_qhWP  = qhGesamt(a4_qhl.wert, a4_qw.wert, 0, 0);
const a4_qk    = kaelteleistung(12, 4.2);
const a4_spezS = spezEntzugsleistung(a4_qk.wert, 160);
assert('Qn,H (Betriebsstd)', a4_qnH.wert,  16800, 1);
assert('Qhl',                 a4_qhl.wert,   8.4);
assert('Qn,WW',               a4_qnWW.wert,  4956, 5);
assert('Qw',                  a4_qw.wert,    0.6, 0.02);
assert('Qh,WP',               a4_qhWP.wert,  9.0, 0.02);
assert('Qk',                  a4_qk.wert,    9.14, 0.02);
assert('spez Entzug',         a4_spezS.wert, 57.1, 0.1);
console.log(`   Sonden-Beurteilung: ${a4_spezS.ampel.toUpperCase()} – ${a4_spezS.hinweis}`);

console.log('\n✓ Alle Referenzaufgaben durchgerechnet.');
