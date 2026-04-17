// Phase-3-Integrations-Test:
// Faehrt den gesamten State -> Compute-Cascade-Pfad mit der FWS-Aufgabe 2
// als Eingabe und prueft, dass das Endergebnis Qhl = 12.55 kW matcht.
//
// Ausfuehren: node --experimental-strip-types scripts/test-heizlast-state.ts

import { heizlastState, createDefaultState, replaceState } from '../src/lib/heizlast/state.ts';
import { runCascade } from '../src/lib/heizlast/compute.ts';
import {
  serializeState, deserializeState, saveNow, loadFromStorage, clearStorage,
  STORAGE_KEY_CURRENT,
} from '../src/lib/heizlast/storage.ts';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(bez: string, cond: boolean, actual: unknown = '', expected: unknown = ''): void {
  const symbol = cond ? '\u2713' : '\u2717';
  const a = actual !== '' ? `  ist=${actual}` : '';
  const e = expected !== '' ? `  soll=${expected}` : '';
  console.log(`  ${symbol} ${bez}${a}${e}`);
  if (cond) { passed++; } else { failed++; failures.push(bez); }
}

function close(bez: string, ist: number, soll: number, tol = 0.02): void {
  check(bez, Math.abs(ist - soll) <= tol, ist.toFixed(4), soll.toFixed(4));
}

function section(t: string): void {
  console.log(`\n${'='.repeat(60)}\n${t}\n${'='.repeat(60)}`);
}

// 1. FWS-Aufgabe 2 via State -> Cascade
section('INTEGRATION — FWS-Aufgabe 2 via State + runCascade');

const s = createDefaultState();
s.gebaeude.typ = 'efh';
s.gebaeude.lage = 'mittelland';
s.gebaeude.bauperiode = '1971_80';
s.gebaeude.ebf = 270;
s.gebaeude.tvollProfil = 'wohnen_mitWW';
s.gebaeude.tvollOverride = 2000;

s.heizlast.methodsEnabled = { verbrauch: true, messung: false, bstd: false, override: false };
s.heizlast.verbrauch.energietraeger = 'oel';
s.heizlast.verbrauch.ba = 3500;
s.heizlast.verbrauch.etaOverride = 0.80;
s.heizlast.verbrauch.etaWirkungsgradId = null;
s.heizlast.verbrauch.inklWW = true;
s.heizlast.verbrauch.vwuAbzug = 160;

s.warmwasser.deltaTOverride = 50;
s.warmwasser.speicherProzent = 10;
s.warmwasser.zirkProzent = 0;
s.warmwasser.ausstossProzent = 15;

replaceState(s);

const result = runCascade(heizlastState.get());
close('Qhl (kW) — FWS Referenzwert 12.55', result.qhlRaw?.value ?? 0, 12.55, 0.05);
close('Qhl_korr == Qhl_raw (keine Sanierung)', result.qhlKorr?.value ?? 0, result.qhlRaw?.value ?? 0, 0.001);
check('tvoll effektiv = 2000', result.tvoll === 2000, result.tvoll, 2000);

// 2. Sanierung hinzu -> Wert muss kleiner werden
section('INTEGRATION — Sanierung aktiviert reduziert Qhl');

const s2 = heizlastState.get();
const qhlVorher = result.qhlRaw?.value ?? 0;
heizlastState.set({
  ...s2,
  heizlast: {
    ...s2.heizlast,
    sanierungActive: true,
    sanierungMassnahmen: [
      { id: 'fenster', label: 'Fenstersanierung', einsparungProzent: 15 },
    ],
  },
});
const r2 = runCascade(heizlastState.get());
close('Qhl_korr nach 15% Fenster = Qhl * 0.85', r2.qhlKorr?.value ?? 0, qhlVorher * 0.85, 0.005);
check('Qhl_raw unveraendert durch Sanierung', Math.abs((r2.qhlRaw?.value ?? 0) - qhlVorher) < 0.001);

// 3. Qh = Qhl + Qw + Qoff
section('INTEGRATION — Qh-Summe konsistent');

const r3 = runCascade(heizlastState.get());
if (r3.qh && r3.qhlKorr && r3.qoff) {
  const erwartet = (r3.qhlKorr.value) + (r3.qw?.value ?? 0) + r3.qoff.value;
  close('Qh = Qhl_korr + Qw + Qoff', r3.qh.value, erwartet, 0.01);
} else {
  check('Qh, Qhl_korr, Qoff alle vorhanden', false);
}

// 4. Serialisierung round-trip
section('PERSISTIERUNG — Serialisierung round-trip');

const vorher = heizlastState.get();
const json = serializeState(vorher);
const wieder = deserializeState(json);
check('deserializeState ergibt nicht null', wieder !== null);
if (wieder) {
  check('version erhalten', wieder.version === vorher.version);
  check('EBF erhalten', wieder.gebaeude.ebf === vorher.gebaeude.ebf);
  check('Sanierung-Flag erhalten', wieder.heizlast.sanierungActive === vorher.heizlast.sanierungActive);
  check('Anzahl Massnahmen erhalten', wieder.heizlast.sanierungMassnahmen.length === vorher.heizlast.sanierungMassnahmen.length);
}

// 5. Unbekannte Version -> null
section('PERSISTIERUNG — Unbekannte Version wird abgelehnt');

const fremd = JSON.stringify({ ...vorher, version: 999 });
const frResult = deserializeState(fremd);
check('deserializeState(version=999) === null', frResult === null);

// 6. SSR-Safety
section('PERSISTIERUNG — SSR-Safety');

let crashed = false;
try {
  saveNow(vorher);
  loadFromStorage();
  clearStorage();
} catch (e) {
  crashed = true;
}
check('saveNow/load/clear crashen nicht ohne window', !crashed);
check('STORAGE_KEY hat Version-Suffix', STORAGE_KEY_CURRENT.endsWith('.v1'), STORAGE_KEY_CURRENT);

// 7. WW-Speicher-Rundung
section('INTEGRATION — WW-Speicher wird auf 10-L-Schritt gerundet');

if (r3.wwSpeicherGerundet != null) {
  check('wwSpeicherGerundet % 10 === 0', r3.wwSpeicherGerundet % 10 === 0, r3.wwSpeicherGerundet);
  check('wwSpeicherGerundet > 0', r3.wwSpeicherGerundet > 0, r3.wwSpeicherGerundet);
}

console.log(`\n${'='.repeat(60)}\nZUSAMMENFASSUNG (Phase 3)\n${'='.repeat(60)}`);
console.log(`  Bestanden: ${passed}`);
console.log(`  Fehler:    ${failed}`);
if (failed > 0) {
  console.log('\n  Fehlende Checks:');
  for (const f of failures) console.log(`    - ${f}`);
  process.exit(1);
} else {
  console.log('\n  \u2713 Alle Integrations-Tests erfolgreich.');
}
