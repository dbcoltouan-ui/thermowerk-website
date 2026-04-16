// Regressions- und Verifikations-Tests für den Heizlast-Rechenkern.
// Ausführen: node --experimental-strip-types scripts/test-heizlast.ts
// Requires: Node 22.6+ (für --experimental-strip-types).
//
// Geprüft wird:
//   1. Die 4 Aufgaben des FWS-Aufgabenblatts (Referenz-Werte aus Lösungsschlüssel).
//   2. Ein eigens konstruiertes Beispiel „Referenzhaus Moosseedorf" (Vorwärtsrechnung).
//   3. Die Rückrechnung des eigenen Beispiels (Invertierbarkeit der Formeln).

import {
  qnAusVerbrauch, qnSumme, qhlAusQn, qoff, qhGesamt, spezHeizleistung,
  qhlNachSanierung, qnwwJahr, qw, qnAusBetriebsstunden, kaelteleistung,
  spezEntzugsleistung, speichervolumen, rundeSpeicher,
} from '../src/lib/heizlast/calculations.ts';
import { PHYSIK } from '../src/lib/heizlast/constants.ts';

// --------------------------------------------------------------
// Test-Infrastruktur
// --------------------------------------------------------------
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assertClose(
  bez: string,
  ist: number,
  soll: number,
  tol = 0.05,
): boolean {
  const ok = Math.abs(ist - soll) <= tol;
  const istStr = ist.toFixed(4);
  const sollStr = soll.toFixed(4);
  const symbol = ok ? '\u2713' : '\u2717';
  console.log(`  ${symbol} ${bez}  ist=${istStr}  soll=${sollStr}  (\u0394=${(ist - soll).toFixed(4)}, tol=${tol})`);
  if (ok) {
    passed++;
  } else {
    failed++;
    failures.push(`${bez}: ist ${istStr}, soll ${sollStr}`);
  }
  return ok;
}

function section(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(title);
  console.log('='.repeat(60));
}

// --------------------------------------------------------------
// 1. FWS-Aufgabenblatt — Referenz-Regression
// --------------------------------------------------------------
section('AUFGABE 1A — EFH, Öl 2800 l/a, η 0.85, toff 2 h');
{
  const qn = qnAusVerbrauch(2800, 10.5, 0.85);
  const qhl = qhlAusQn(qn.value, 2000);
  const qoffV = qoff(qhl.value, 2);
  const qhWP = qhGesamt(qhl.value, 0, qoffV.value, 0);
  assertClose('Qn', qn.value, 24990, 1);
  assertClose('Qhl', qhl.value, 12.50);
  assertClose('Qoff (toff=2h)', qoffV.value, 1.14);
  assertClose('Qh', qhWP.value, 13.64);
}

section('AUFGABE 1B — Bivalent Gas + Hartholz');
{
  const qnGas = qnAusVerbrauch(2500, 10.4, 0.92);
  const qnHolz = qnAusVerbrauch(5, 2500, 0.75);
  const qnTot = qnSumme([qnGas, qnHolz]);
  const qhl = qhlAusQn(qnTot.value, 2000);
  const qoffV = qoff(qhl.value, 4);
  const qhWP = qhGesamt(qhl.value, 0, qoffV.value, 0);
  assertClose('Qn gesamt', qnTot.value, 33295, 5);
  assertClose('Qhl', qhl.value, 16.65);
  assertClose('Qoff (toff=4h)', qoffV.value, 3.33, 0.02);
  assertClose('Qh', qhWP.value, 19.98, 0.02);
}

section('AUFGABE 2 — EFH 1975, Öl 3500 l/a inkl. WW (KRITISCHER REGRESSIONS-TEST)');
{
  const qnHWW = qnAusVerbrauch(3500, 10.5, 0.8);
  const qnWW = qnwwJahr(160, { speicher: 0.10, zirk: 0, ausstoss: 0.15 });
  const qnH = qnHWW.value - qnWW.value;
  const qhl = qhlAusQn(qnH, 2000);
  const spez = spezHeizleistung(qhl.value, 270, '1971_80', 'efh');
  const qoffV = qoff(qhl.value, 3);
  const qwwPerDay = qnWW.value / 365;
  const qwV = qw(qhl.value, qwwPerDay);
  const qhWP = qhGesamt(qhl.value, qwV.value, qoffV.value, 0);
  assertClose('Qn (H+WW)', qnHWW.value, 29400, 1);
  assertClose('Qn,WW', qnWW.value, 4309, 5);
  assertClose('Qn,H', qnH, 25091, 10);
  assertClose('Qhl ⭐', qhl.value, 12.55, 0.02);
  assertClose('spez. W/m²', spez!.value, 46.5, 0.5);
  assertClose('Qoff', qoffV.value, 1.79, 0.02);
  assertClose('Qw', qwV.value, 0.51, 0.02);
  assertClose('Qh,WP', qhWP.value, 14.85, 0.05);

  // Sanierungs-Erweiterung
  const qhlNeu = qhlNachSanierung(qhl.value, [
    { id: 'fenster', label: 'Fenster', einsparungProzent: 15 },
    { id: 'kellerdecke', label: 'Kellerdecke', einsparungProzent: 8 },
    { id: 'estrich', label: 'Estrich', einsparungProzent: 10 },
  ]);
  const qoffN = qoff(qhlNeu.value, 3);
  const qwN = qw(qhlNeu.value, qwwPerDay);
  const qhWPn = qhGesamt(qhlNeu.value, qwN.value, qoffN.value, 0);
  assertClose('Qhl,neu (mit Sanierung)', qhlNeu.value, 8.80, 0.05);
  assertClose('Qoff,neu', qoffN.value, 1.26, 0.02);
  assertClose('Qw,neu', qwN.value, 0.52, 0.05);
  assertClose('Qh,WP,neu', qhWPn.value, 10.58, 0.1);
}

section('AUFGABE 3 — MFH Minergie-P, 11 Whg');
{
  const qnww = qnwwJahr(27.4 * 45, { speicher: 0.10, zirk: 0, ausstoss: 0.15 });
  assertClose('Qn,WW geschätzt', qnww.value, 33210, 20);
  const qhl = qhlAusQn(23000, 2000);
  const spez = spezHeizleistung(qhl.value, 1832, '2011_heute', 'mfh');
  assertClose('Qhl Messung', qhl.value, 11.5);
  assertClose('spez W/m²', spez!.value, 6.28, 0.1);
  console.log(`  \u2139 Plausibilität: ${spez!.ampel!.toUpperCase()} – ${spez!.hinweis}`);
  const qwPerDay = qnww.value / 365;
  const qwV = qw(qhl.value, qwPerDay);
  assertClose('Qw', qwV.value, 5.64, 0.05);
}

section('AUFGABE 4 — S/W-WP mit Betriebsstundenzähler');
{
  const qnH = qnAusBetriebsstunden(14000, 10, 12);
  const qhl = qhlAusQn(qnH.value, 2000);
  const qnWW = qnwwJahr(160, { speicher: 0.10, zirk: 0.15, ausstoss: 0.15 });
  const qwPerDay = qnWW.value / 365;
  const qwV = qw(qhl.value, qwPerDay);
  const qhWP = qhGesamt(qhl.value, qwV.value, 0, 0);
  const qk = kaelteleistung(12, 4.2);
  const spezE = spezEntzugsleistung(qk.value, 160);
  assertClose('Qn,H (Betriebsstd)', qnH.value, 16800, 1);
  assertClose('Qhl', qhl.value, 8.4);
  assertClose('Qn,WW', qnWW.value, 4956, 5);
  assertClose('Qw', qwV.value, 0.6, 0.02);
  assertClose('Qh,WP', qhWP.value, 9.0, 0.02);
  assertClose('Qk', qk.value, 9.14, 0.02);
  assertClose('spez. Entzugsleistung', spezE.value, 57.1, 0.1);
  console.log(`  \u2139 Sonden-Beurteilung: ${spezE.ampel!.toUpperCase()} – ${spezE.hinweis}`);
}

// --------------------------------------------------------------
// 2. EIGENES BEISPIEL — „Referenzhaus Moosseedorf"
//    Zweck: Verifikation dass der Rechenweg auch mit frei gewählten,
//    handnachrechenbar runden Werten das konsistente Ergebnis liefert.
// --------------------------------------------------------------
section('EIGENES BEISPIEL — „Referenzhaus Moosseedorf" (Vorwärts)');
{
  // Eingaben
  const EBF = 150;                 // m²
  const TVOLL = 2000;              // h, Wohngebäude ohne WW, Mittelland
  const BA = 2500;                 // m³/a Erdgas
  const HO = 10.4;                 // kWh/m³
  const ETA = 0.90;                // kondensierend neu
  const VWU = 180;                 // l/d
  const VERLUSTE = { speicher: 0.10, zirk: 0, ausstoss: 0.15 };
  const TOFF = 2;                  // h/d Sperrzeit

  // Schritt 1: Qn brutto (inkl. WW)
  const qnBrutto = qnAusVerbrauch(BA, HO, ETA);
  // händisch: 2500 · 10.4 · 0.90 = 23'400 kWh/a
  assertClose('Qn brutto (inkl. WW)', qnBrutto.value, 23400, 1);

  // Schritt 2: Qn,WW jährlich
  const qnWW = qnwwJahr(VWU, VERLUSTE);
  // händisch: 180 · 4.2/3600 · 50 · 365 · 1.265 = 4'848.11 kWh/a
  assertClose('Qn,WW', qnWW.value, 4848.1, 0.2);

  // Schritt 3: Qn,H (nach WW-Abzug)
  const qnH = qnBrutto.value - qnWW.value;
  assertClose('Qn,H (Heizung netto)', qnH, 18551.9, 0.5);

  // Schritt 4: Qhl
  const qhl = qhlAusQn(qnH, TVOLL);
  // händisch: 18551.9 / 2000 = 9.276 kW
  assertClose('Qhl', qhl.value, 9.276, 0.005);

  // Schritt 5: Plausi W/m² — Bauperiode 1986–1990 EFH → Band 30–48 W/m²
  const spez = spezHeizleistung(qhl.value, EBF, '1986_90', 'efh');
  // händisch: 9276 / 150 = 61.84 W/m² → deutlich über Band → ROT
  assertClose('spez. W/m²', spez!.value, 61.84, 0.05);
  const okAmpel = spez!.ampel === 'rot';
  console.log(`  ${okAmpel ? '\u2713' : '\u2717'} Ampel = rot (erwartet, Verbrauch passt nicht zur angegebenen Bauperiode)`);
  if (okAmpel) passed++; else { failed++; failures.push('Plausi-Ampel nicht rot'); }

  // Schritt 6: QWW pro Tag aus jährlichem Qn,WW
  const qwwPerDay = qnWW.value / 365;
  // händisch: 4848.1 / 365 = 13.2826 kWh/d
  assertClose('QWW/Tag', qwwPerDay, 13.2826, 0.005);

  // Schritt 7: Qw (WW-Leistungszuschlag)
  const qwV = qw(qhl.value, qwwPerDay);
  // händisch: td = 13.2826 / 9.276 = 1.4319 h/d
  //          Qw = 9.276 · (24/22.5681 − 1) = 9.276 · 0.06345 = 0.588 kW
  assertClose('td (Zwischenwert)', qwV.td as number, 1.4319, 0.002);
  assertClose('Qw', qwV.value, 0.588, 0.005);

  // Schritt 8: Qoff (Sperrzeit 2 h)
  const qoffV = qoff(qhl.value, TOFF);
  // händisch: 9.276 · (24/22 − 1) = 9.276 · 0.090909 = 0.8433 kW
  assertClose('Qoff', qoffV.value, 0.8433, 0.005);

  // Schritt 9: Qh gesamt
  const qhWP = qhGesamt(qhl.value, qwV.value, qoffV.value, 0);
  // händisch: 9.276 + 0.588 + 0.8433 + 0 = 10.7073 kW
  assertClose('Qh gesamt', qhWP.value, 10.707, 0.005);

  // Schritt 10: WW-Speichervolumen (mit QWW/d · 3600 / (cp · ΔT))
  //             bei Bereitschaftstemp. 60 °C, Kaltwasser 10 °C
  const vWSto = speichervolumen(qwwPerDay);
  // händisch: 13.2826 / (4.2 · 50 / 3600) = 13.2826 / 0.05833 = 227.7 l
  assertClose('VW,Sto (roh)', vWSto.value, 227.7, 0.2);
  const vWStoGerundet = rundeSpeicher(vWSto.value, 10);
  console.log(`  \u2139 VW,Sto gerundet (10-L): ${vWStoGerundet} l (erwartet 230)`);
  if (vWStoGerundet === 230) passed++; else { failed++; failures.push(`VW,Sto gerundet: ist ${vWStoGerundet}, soll 230`); }
}

// --------------------------------------------------------------
// 3. RÜCKRECHNUNG — verifiziert die Invertierbarkeit der Formeln
// --------------------------------------------------------------
section('EIGENES BEISPIEL — Rückrechnung (Invertierbarkeits-Check)');
{
  // Bekannte Ergebnisse aus dem Vorwärts-Test:
  const qhl = 9.276;               // kW
  const tvoll = 2000;              // h
  const qnWW = 4848.1;             // kWh/a
  const ho = 10.4, eta = 0.90;

  // Rück 1: aus Qhl zurück zu Qn,H
  const qnH_rev = qhl * tvoll;
  assertClose('Rück: Qn,H = Qhl · tvoll', qnH_rev, 18552, 1);

  // Rück 2: aus Qn,H + Qn,WW zurück zu Qn brutto
  const qnBrutto_rev = qnH_rev + qnWW;
  assertClose('Rück: Qn brutto = Qn,H + Qn,WW', qnBrutto_rev, 23400.1, 0.5);

  // Rück 3: aus Qn brutto zurück zu Ba (Brennstoffverbrauch)
  const ba_rev = qnBrutto_rev / (ho * eta);
  assertClose('Rück: Ba = Qn / (Ho · η)', ba_rev, 2500.01, 0.5);

  // Rück 4: aus VW,Sto zurück zu QWW/Tag
  const vWSto = 227.7;
  const deltaT = 60 - PHYSIK.t_kaltwasser;  // 50 K
  const qwwPerDay_rev = vWSto * (PHYSIK.cp_wasser * PHYSIK.kJzukWh * deltaT);
  assertClose('Rück: QWW/Tag = VW,Sto · cp · ΔT / 3600', qwwPerDay_rev, 13.2825, 0.005);

  // Rück 5: aus Qh zurück zu Qhl (bei bekanntem Qw und Qoff)
  const qhGesamt_val = 10.707, qwVal = 0.588, qoffVal = 0.8433;
  const qhl_rev = qhGesamt_val - qwVal - qoffVal;
  assertClose('Rück: Qhl = Qh − Qw − Qoff', qhl_rev, 9.276, 0.005);
}

// --------------------------------------------------------------
// Zusammenfassung
// --------------------------------------------------------------
section('ZUSAMMENFASSUNG');
console.log(`  Bestanden: ${passed}`);
console.log(`  Fehler:    ${failed}`);
if (failed > 0) {
  console.log('\n  Fehlerdetails:');
  failures.forEach((f) => console.log(`    - ${f}`));
  process.exit(1);
} else {
  console.log('\n  \u2713 Alle Tests erfolgreich.');
  process.exit(0);
}
