// Phase-3-Integrations-Test:
// Faehrt den gesamten State -> Compute-Cascade-Pfad mit der FWS-Aufgabe 2
// als Eingabe und prueft, dass das Endergebnis Qhl = 12.55 kW matcht.
//
// Ausfuehren: node --experimental-strip-types scripts/test-heizlast-state.ts

import {
  heizlastState,
  createDefaultState,
  replaceState,
  raumFlaeche,
  sumRaumFlaechenNetto,
  sumRaumFlaechen,
} from '../src/lib/heizlast/state.ts';
import type { RaumInput } from '../src/lib/heizlast/state.ts';
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
section('INTEGRATION \u2014 FWS-Aufgabe 2 via State + runCascade');

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

// Phase 9 / Block D: Sperrzeit-Toggle ist neu. FWS-Aufgabe 2 hat toff = 2 h
// und rechnet Qoff als Zuschlag, also muss der Schalter hier aktiv sein.
s.zuschlaege.sperrzeitActive = true;

replaceState(s);

const result = runCascade(heizlastState.get());
close('Qhl (kW) \u2014 FWS Referenzwert 12.55', result.qhlRaw?.value ?? 0, 12.55, 0.05);
close('Qhl_korr == Qhl_raw (keine Sanierung)', result.qhlKorr?.value ?? 0, result.qhlRaw?.value ?? 0, 0.001);
check('tvoll effektiv = 2000', result.tvoll === 2000, result.tvoll, 2000);

// 2. Sanierung hinzu -> Wert muss kleiner werden
section('INTEGRATION \u2014 Sanierung aktiviert reduziert Qhl');

const s2 = heizlastState.get();
const qhlVorher = result.qhlRaw?.value ?? 0;
heizlastState.set({
  ...s2,
  heizlast: {
    ...s2.heizlast,
    sanierungActive: true,
    sanierungMassnahmen: [
      { id: 'fenster', label: 'Fenstersanierung', einsparungProzent: 15, datum: null, zeitpunkt: 'geplant' },
    ],
  },
});
const r2 = runCascade(heizlastState.get());
close('Qhl_korr nach 15% Fenster = Qhl * 0.85', r2.qhlKorr?.value ?? 0, qhlVorher * 0.85, 0.005);
check('Qhl_raw unveraendert durch Sanierung', Math.abs((r2.qhlRaw?.value ?? 0) - qhlVorher) < 0.001);

// 3. Qh = Qhl + Qw + Qoff
section('INTEGRATION \u2014 Qh-Summe konsistent');

const r3 = runCascade(heizlastState.get());
if (r3.qh && r3.qhlKorr && r3.qoff) {
  const erwartet = (r3.qhlKorr.value) + (r3.qw?.value ?? 0) + r3.qoff.value;
  close('Qh = Qhl_korr + Qw + Qoff', r3.qh.value, erwartet, 0.01);
} else {
  check('Qh, Qhl_korr, Qoff alle vorhanden', false);
}

// 4. Serialisierung round-trip
section('PERSISTIERUNG \u2014 Serialisierung round-trip');

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
section('PERSISTIERUNG \u2014 Unbekannte Version wird abgelehnt');

const fremd = JSON.stringify({ ...vorher, version: 999 });
const frResult = deserializeState(fremd);
check('deserializeState(version=999) === null', frResult === null);

// 6. SSR-Safety
section('PERSISTIERUNG \u2014 SSR-Safety');

let crashed = false;
try {
  saveNow(vorher);
  loadFromStorage();
  clearStorage();
} catch (e) {
  crashed = true;
}
check('saveNow/load/clear crashen nicht ohne window', !crashed);
check('STORAGE_KEY hat Version-Suffix', STORAGE_KEY_CURRENT.endsWith('.v2'), STORAGE_KEY_CURRENT);

// 7. WW-Speicher-Rundung (Phase 9 / Block J: marktrealistische Staffelung)
section('INTEGRATION \u2014 WW-Speicher folgt CH-WP-Marktstaffelung');

if (r3.wwSpeicherGerundet != null) {
  const v = r3.wwSpeicherGerundet;
  // Erwartete Staffelung: <=200 -> 50er, <=500 -> 100er, <=1000 -> 250er, sonst 500er
  let step = 500;
  if (v <= 200) step = 50;
  else if (v <= 500) step = 100;
  else if (v <= 1000) step = 250;
  check(`wwSpeicherGerundet % ${step} === 0`, v % step === 0, v);
  check('wwSpeicherGerundet > 0', v > 0, v);
  if (r3.wwSpeicherRoh?.value != null) {
    check('wwSpeicherGerundet >= Berechnungswert (Aufrundung)', v >= r3.wwSpeicherRoh.value, v);
  }
}

// 8. Block D \u2014 Sperrzeit-Toggle gated Qoff
section('INTEGRATION \u2014 Sperrzeit-Toggle (Block D)');

const sSperr = heizlastState.get();
// Gate aus -> Qoff = 0, unabhaengig von toff
heizlastState.set({ ...sSperr, zuschlaege: { ...sSperr.zuschlaege, sperrzeitActive: false, toff: 2 } });
const rOff = runCascade(heizlastState.get());
check('Qoff == 0 wenn sperrzeitActive=false', (rOff.qoff?.value ?? -1) === 0, rOff.qoff?.value);

// Gate an -> Qoff > 0 mit toff=2
heizlastState.set({ ...sSperr, zuschlaege: { ...sSperr.zuschlaege, sperrzeitActive: true, toff: 2 } });
const rOn = runCascade(heizlastState.get());
check('Qoff > 0 wenn sperrzeitActive=true und toff=2', (rOn.qoff?.value ?? 0) > 0, rOn.qoff?.value);

// Qas-Auto: Wert > 0 wird automatisch addiert, kein qasActive mehr noetig
const baseQh = rOn.qh?.value ?? 0;
heizlastState.set({ ...sSperr, zuschlaege: { ...sSperr.zuschlaege, sperrzeitActive: true, toff: 2, qas: 0.75, qasActive: false } });
const rQas = runCascade(heizlastState.get());
close('Qh mit qas=0.75 steigt um 0.75', (rQas.qh?.value ?? 0) - baseQh, 0.75, 0.01);

// 9. Block E (Phase 9) \u2014 EBF-Helfer Netto-Summe
section('INTEGRATION \u2014 EBF-Helfer beheizt/unbeheizt + flaecheDirekt (Block E)');

const raeumeE: RaumInput[] = [
  { id: 'r1', name: 'Wohnen', laenge: null, breite: null, flaecheDirekt: 20, beheizt: true, flaecheOverride: null },
  { id: 'r2', name: 'Kueche', laenge: 5, breite: 3, flaecheDirekt: null, beheizt: true, flaecheOverride: null },
  { id: 'r3', name: 'Keller', laenge: null, breite: null, flaecheDirekt: 10, beheizt: false, flaecheOverride: null },
];
const aggE = sumRaumFlaechenNetto(raeumeE);
check('sumRaumFlaechenNetto.beheizt === 35', aggE.beheizt === 35, aggE.beheizt, 35);
check('sumRaumFlaechenNetto.unbeheizt === 10', aggE.unbeheizt === 10, aggE.unbeheizt, 10);
check('sumRaumFlaechenNetto.netto === 35', aggE.netto === 35, aggE.netto, 35);
check('sumRaumFlaechen (alias) === 35', sumRaumFlaechen(raeumeE) === 35, sumRaumFlaechen(raeumeE), 35);

// flaecheDirekt hat Vorrang vor L x B
const beide: RaumInput = {
  id: 'rb', name: 'Bad', laenge: 2, breite: 2, flaecheDirekt: 9, beheizt: true, flaecheOverride: null,
};
check('raumFlaeche: flaecheDirekt hat Vorrang vor laenge*breite', raumFlaeche(beide) === 9, raumFlaeche(beide), 9);

// Fallback: weder flaecheDirekt noch L/B gesetzt -> 0
const leer: RaumInput = {
  id: 'rl', name: '', laenge: null, breite: null, flaecheDirekt: null, beheizt: true, flaecheOverride: null,
};
check('raumFlaeche: leerer Raum -> 0', raumFlaeche(leer) === 0, raumFlaeche(leer), 0);

// Migration: alter State mit nur laenge/breite/name wird gelesen, beheizt defaultet auf true
section('PERSISTIERUNG \u2014 Migration alter RaumInput (Block E)');

const altState = createDefaultState();
// Simuliere alten Serialisierungs-Stand (pre-Block-E): ohne beheizt/flaecheDirekt
const altRaw = JSON.stringify({
  ...altState,
  gebaeude: {
    ...altState.gebaeude,
    raeume: [
      { id: 'old1', name: 'Wohnen', laenge: 4, breite: 5, flaecheOverride: null },
      { id: 'old2', name: 'Kueche', laenge: 3, breite: 4, flaecheOverride: null },
    ],
  },
});
const altMigriert = deserializeState(altRaw);
check('Migration: State wird akzeptiert', altMigriert !== null);
if (altMigriert) {
  const r0 = altMigriert.gebaeude.raeume[0];
  const r1 = altMigriert.gebaeude.raeume[1];
  check('Migration: r0.beheizt defaultet auf true', r0.beheizt === true, r0.beheizt, true);
  check('Migration: r0.flaecheDirekt defaultet auf null', r0.flaecheDirekt === null, r0.flaecheDirekt, null);
  check('Migration: r0.laenge === 4', r0.laenge === 4, r0.laenge, 4);
  check('Migration: r1.breite === 4', r1.breite === 4, r1.breite, 4);
  const aggMig = sumRaumFlaechenNetto(altMigriert.gebaeude.raeume);
  check('Migration: sumRaumFlaechenNetto.unbeheizt === 0', aggMig.unbeheizt === 0, aggMig.unbeheizt, 0);
  check('Migration: sumRaumFlaechenNetto.beheizt === 32', aggMig.beheizt === 32, aggMig.beheizt, 32);
}

// 10. v1 → v2 Migration (Paket B)
section('PERSISTIERUNG \u2014 v1 \u2192 v2 Migration (Paket B)');

const fws2Base = createDefaultState();
const v1Rohdaten: any = {
  ...fws2Base,
  version: 1,
  heizlast: {
    ...fws2Base.heizlast,
    verbrauch: {
      energietraeger: 'oel',
      ba: 3500,
      etaOverride: 0.80,
      etaWirkungsgradId: null,
      inklWW: true,
      vwuAbzug: 160,
      // KEIN perioden-Feld (simuliert v1-State)
    },
    messung: { qnPerJahr: 0 },
    bstd: { stundenGesamt: 0, jahre: 0, qhWP: 8 },
    methodsEnabled: { verbrauch: true, messung: false, bstd: false, override: false },
    sanierungActive: true,
    sanierungMassnahmen: [
      { id: 'f', label: 'Fenster', einsparungProzent: 10 },
      { id: 'd', label: 'Dach', einsparungProzent: 20 },
      { id: 'k', label: 'Keller', einsparungProzent: 5 },
    ],
  },
  gebaeude: { ...fws2Base.gebaeude, ebf: 270, tvollOverride: 2000 },
  warmwasser: { ...fws2Base.warmwasser, deltaTOverride: 50, speicherProzent: 10, zirkProzent: 0, ausstossProzent: 15 },
  zuschlaege: { ...fws2Base.zuschlaege, sperrzeitActive: true, toff: 2 },
};
const v1Json = JSON.stringify(v1Rohdaten);
const migV1 = deserializeState(v1Json);
check('v1\u2192v2: State akzeptiert (nicht null)', migV1 !== null);
if (migV1) {
  check('v1\u2192v2: version === 2', migV1.version === 2, migV1.version, 2);
  check('v1\u2192v2: verbrauch.perioden ist Array', Array.isArray(migV1.heizlast.verbrauch.perioden));
  check('v1\u2192v2: 1 migrierte Periode (aus ba=3500)', migV1.heizlast.verbrauch.perioden.length === 1, migV1.heizlast.verbrauch.perioden.length, 1);
  check('v1\u2192v2: periode.wert === 3500', migV1.heizlast.verbrauch.perioden[0]?.wert === 3500, migV1.heizlast.verbrauch.perioden[0]?.wert, 3500);
  const allGeplant = migV1.heizlast.sanierungMassnahmen.every((m: any) => m.zeitpunkt === 'geplant' && m.datum === null);
  check('v1\u2192v2: alle 3 Sanierungen datum=null, zeitpunkt=geplant', allGeplant);
  check('v1\u2192v2: Anzahl Sanierungen erhalten (3)', migV1.heizlast.sanierungMassnahmen.length === 3, migV1.heizlast.sanierungMassnahmen.length, 3);
  // Qhl nach Migration muss ungefaehr gleich bleiben (Toleranz 0.10 wegen Schaltjahr-Periode 2024: 366 Tage)
  replaceState(migV1);
  const rMig = runCascade(heizlastState.get());
  close('v1\u2192v2: Qhl_raw nach Migration \u2248 12.55 kW (tol 0.10 wegen Schaltjahr)', rMig.qhlRaw?.value ?? 0, 12.55, 0.10);
}

// 11. \u00a7 4 Integrationstest — Perioden + Sanierungs-Timeline (Paket B)
section('INTEGRATION \u2014 \u00a7\u20094 Perioden + vergangene/geplante Sanierung (Ho=10.5)');
// Objekt: EFH Mittelland, EBF 150 m\u00b2, tvoll 2000 h, \u00d6l, \u03b7 0.85, kein WW-Abzug
// Perioden: p1 2023-01-01..2024-01-01 Ba=2500 l; p2 2024-01-01..2025-01-01 Ba=2200 l
// S1: Fenstertausch 15 %, vergangen, datum 2023-07-01 (innerhalb p1)
// S2: Dachsanierung  20 %, geplant,  datum 2025-09-01
// Erwartete Werte (Handrechnung mit Ho=10.5 statt 10.0 aus Spec):
//   ba_jahr \u2248 2246.3 l/a, Qn \u2248 20048 kWh/a, Qhl_ist \u2248 10.024 kW, Qhl_zukunft \u2248 8.019 kW
const s4 = createDefaultState();
s4.gebaeude.typ = 'efh';
s4.gebaeude.lage = 'mittelland';
s4.gebaeude.bauperiode = '1971_80';
s4.gebaeude.ebf = 150;
s4.gebaeude.tvollOverride = 2000;
s4.heizlast.methodsEnabled = { verbrauch: true, messung: false, bstd: false, override: false };
s4.heizlast.verbrauch.energietraeger = 'oel';
s4.heizlast.verbrauch.etaOverride = 0.85;
s4.heizlast.verbrauch.etaWirkungsgradId = null;
s4.heizlast.verbrauch.inklWW = false;
s4.heizlast.verbrauch.perioden = [
  { id: 'p1', vonDatum: '2023-01-01', bisDatum: '2024-01-01', wert: 2500 },
  { id: 'p2', vonDatum: '2024-01-01', bisDatum: '2025-01-01', wert: 2200 },
];
s4.heizlast.sanierungActive = true;
s4.heizlast.sanierungMassnahmen = [
  { id: 's1', label: 'Fenstertausch', einsparungProzent: 15, datum: '2023-07-01', zeitpunkt: 'vergangen' as const },
  { id: 's2', label: 'Dachsanierung', einsparungProzent: 20, datum: '2025-09-01', zeitpunkt: 'geplant' as const },
];
s4.zuschlaege.sperrzeitActive = false;
replaceState(s4);
const r4 = runCascade(heizlastState.get());
close('\u00a74 Qhl_ist (qhlRaw, nach vergangener San., Ho=10.5)', r4.qhlRaw?.value ?? 0, 10.024, 0.05);
close('\u00a74 Qhl_zukunft (qhlKorr, nach geplanter San. -20%)', r4.qhlKorr?.value ?? 0, 8.019, 0.05);

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
