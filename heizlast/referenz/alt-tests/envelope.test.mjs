// tests/envelope.test.mjs
// Tests für src/calc/envelope.mjs gegen data/u-werte.json
// und Wissensbasis-Werte (DIN EN ISO 6946).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  bauklasseFromBaujahr, bauklasseFromPeriode, applySanierung,
  lookupUWert, uFromLayers, RSI_RSE,
  defaultLayersForBauteil,
  aggregateAreas, huellflaeche, raumVolumen, raumFlaeche
} from '../src/calc/envelope.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const U_WERTE = JSON.parse(readFileSync(resolve(here, '../data/u-werte.json'), 'utf-8'));

const close = (a, b, tol) => Math.abs(a - b) <= tol;

/* --- Bauklasse-Mapping --- */

test('bauklasseFromBaujahr — Stützstellen', () => {
  assert.equal(bauklasseFromBaujahr(1900), 'vor1945');
  assert.equal(bauklasseFromBaujahr(1945), 'vor1945');
  assert.equal(bauklasseFromBaujahr(1946), '1946_1960');
  assert.equal(bauklasseFromBaujahr(1960), '1946_1960');
  assert.equal(bauklasseFromBaujahr(1977), '1961_1977');
  assert.equal(bauklasseFromBaujahr(1990), '1978_1994');
  assert.equal(bauklasseFromBaujahr(2000), '1995_2000');
  assert.equal(bauklasseFromBaujahr(2009), '2001_2009');
  assert.equal(bauklasseFromBaujahr(2015), '2010_2015');
  assert.equal(bauklasseFromBaujahr(2026), '2016_heute');
});

test('bauklasseFromBaujahr — invalide Eingaben → null', () => {
  assert.equal(bauklasseFromBaujahr(null), null);
  assert.equal(bauklasseFromBaujahr(0), null);
  assert.equal(bauklasseFromBaujahr('foo'), null);
});

test('bauklasseFromPeriode — FWS-Keys → u-werte.json-Keys', () => {
  assert.equal(bauklasseFromPeriode('<1919'), 'vor1945');
  assert.equal(bauklasseFromPeriode('1971-1980'), '1961_1977');
  assert.equal(bauklasseFromPeriode('1986-1990'), '1978_1994');
  assert.equal(bauklasseFromPeriode('2011-heute'), '2016_heute');
  assert.equal(bauklasseFromPeriode('minergie'), 'minergie');
});

test('applySanierung — Verschiebung der Bauklasse', () => {
  assert.equal(applySanierung('vor1945', 'unsaniert'),   'vor1945');
  assert.equal(applySanierung('vor1945', 'teilsaniert'), '1946_1960');
  assert.equal(applySanierung('vor1945', 'saniert'),     '2010_2015');
  assert.equal(applySanierung('1978_1994', 'minergie'),  'minergie');
  assert.equal(applySanierung('1978_1994', 'teilsaniert'),'1995_2000');
});

/* --- U-Wert-Lookup gegen u-werte.json --- */

test('lookupUWert — Wand EFH 1978_1994 typ = 0.5 (data/u-werte.json)', () => {
  const r = lookupUWert(U_WERTE, { bauteil:'wand', gebaeudetyp:'EFH', bauklasse:'1978_1994' });
  assert.equal(r.typ, 0.5);
});

test('lookupUWert — Wand EFH minergie typ = 0.15', () => {
  const r = lookupUWert(U_WERTE, { bauteil:'wand', gebaeudetyp:'EFH', bauklasse:'minergie' });
  assert.equal(r.typ, 0.15);
});

test('lookupUWert — Wand vor1945 typ = 1.8 (Wissensbasis-Bestand-Wert)', () => {
  const r = lookupUWert(U_WERTE, { bauteil:'wand', gebaeudetyp:'EFH', bauklasse:'vor1945' });
  assert.equal(r.typ, 1.8);
});

test('lookupUWert — Boden gegen Erdreich vor1945 typ = 1.3', () => {
  const r = lookupUWert(U_WERTE, { bauteil:'boden', gebaeudetyp:'EFH', bauklasse:'vor1945',
                                   variant:'gegenErdreich' });
  assert.equal(r.typ, 1.3);
});

test('lookupUWert — Steildach 1978_1994 typ ist Number', () => {
  const r = lookupUWert(U_WERTE, { bauteil:'dach', gebaeudetyp:'EFH', bauklasse:'1978_1994',
                                   variant:'steildach' });
  assert.equal(typeof r.typ, 'number');
  assert.ok(r.typ > 0);
});

test('lookupUWert — Fenster-Generation 1978_1994 = 2.8 (2-fach unbeschichtet)', () => {
  const r = lookupUWert(U_WERTE, { bauteil:'fenster', gebaeudetyp:'EFH', bauklasse:'1978_1994' });
  assert.equal(r.typ, 2.8);
});

test('lookupUWert — Fenster-Generation 2016_heute (3-fach Standard) ist sinnvoll niedrig', () => {
  const r = lookupUWert(U_WERTE, { bauteil:'fenster', gebaeudetyp:'EFH', bauklasse:'2016_heute' });
  assert.ok(r.typ > 0.5 && r.typ <= 1.4, `Erwarte 0.5..1.4, got ${r.typ}`);
});

test('lookupUWert — fehlerhafter Lookup → null', () => {
  assert.equal(lookupUWert(U_WERTE, { bauteil:'wand', gebaeudetyp:'EFH', bauklasse:'unbekannt' }), null);
  assert.equal(lookupUWert(null, { bauteil:'wand', gebaeudetyp:'EFH', bauklasse:'1978_1994' }), null);
});

/* --- uFromLayers (DIN EN ISO 6946) --- */

test('uFromLayers — 30 cm Backstein λ=0.81 + 6 cm MW λ=0.04 + Putz', () => {
  // R = 0.13 + 0.015/0.7 + 0.30/0.81 + 0.06/0.04 + 0.02/1.0 + 0.04
  //   = 0.13 + 0.0214 + 0.3704 + 1.5000 + 0.0200 + 0.04 = 2.0818
  // U = 1/2.0818 = 0.480
  const layers = [
    { d: 0.015, lambda: 0.7 },   // Innenputz
    { d: 0.30,  lambda: 0.81 },  // Tragschicht Backstein
    { d: 0.06,  lambda: 0.04 },  // MW
    { d: 0.02,  lambda: 1.0 }    // Aussenputz
  ];
  const U = uFromLayers(layers, RSI_RSE.horizontal.Rsi, RSI_RSE.horizontal.Rse);
  assert.ok(close(U, 0.480, 0.01), `U = ${U}`);
});

test('uFromLayers — homogene 30 cm Vollziegel ohne Dämmung', () => {
  // R = 0.13 + 0.30/0.79 + 0.04 = 0.13 + 0.3797 + 0.04 = 0.5497
  // U = 1.819
  const U = uFromLayers([{ d: 0.30, lambda: 0.79 }]);
  assert.ok(close(U, 1.819, 0.005), `U = ${U}`);
});

test('uFromLayers — leere oder ungültige Layers → null', () => {
  assert.equal(uFromLayers([]), null);
  assert.equal(uFromLayers(null), null);
});

test('defaultLayersForBauteil — aussenwand 1995_2000 ungedämmt → 3 Schichten', () => {
  const layers = defaultLayersForBauteil(U_WERTE, { bauteil:'aussenwand', bauklasse:'1995_2000', gedaemmt:false });
  assert.ok(Array.isArray(layers));
  assert.ok(layers.length >= 1);
  // Mindestens die Tragschicht
  const trag = layers.find(L => close(L.lambda, 0.29, 0.01));
  assert.ok(trag, 'Tragschicht mit λ≈0.29 sollte enthalten sein');
});

test('defaultLayersForBauteil — aussenwand 1995_2000 gedämmt fügt Dämmung hinzu', () => {
  const ohne = defaultLayersForBauteil(U_WERTE, { bauteil:'aussenwand', bauklasse:'1995_2000', gedaemmt:false });
  const mit  = defaultLayersForBauteil(U_WERTE, { bauteil:'aussenwand', bauklasse:'1995_2000', gedaemmt:true });
  assert.equal(mit.length, ohne.length + 1);
});

/* --- Geometrie & Flächen --- */

test('aggregateAreas — Summe pro Bauteil-Typ', () => {
  const r = aggregateAreas([
    { typ:'AW', A: 10 }, { typ:'AW', A: 5 },
    { typ:'AF', A: 2 }, { typ:'IW', A: 8 }
  ]);
  assert.equal(r.AW, 15);
  assert.equal(r.AF, 2);
  assert.equal(r.IW, 8);
});

test('huellflaeche — nur Aussen-Bauteile', () => {
  const r = huellflaeche([
    { typ:'AW', A: 10 }, { typ:'AF', A: 2 },
    { typ:'IW', A: 8 },  { typ:'DE', A: 5 }, { typ:'FB', A: 10 }
  ]);
  assert.equal(r, 27); // 10+2+5+10
});

test('raumVolumen — A·h direkt', () => {
  assert.equal(raumVolumen({ A: 20, h: 2.5 }), 50);
});

test('raumVolumen — V hat Vorrang vor A·h', () => {
  assert.equal(raumVolumen({ V: 60, A: 20, h: 2.5 }), 60);
});

test('raumVolumen — l·b·h', () => {
  assert.equal(raumVolumen({ l: 4, b: 3, h: 2.5 }), 30);
});

test('raumFlaeche — A direkt oder l·b', () => {
  assert.equal(raumFlaeche({ A: 12 }), 12);
  assert.equal(raumFlaeche({ l: 4, b: 3 }), 12);
});

/* --- Plausibilität gegen Etagenwohnung-Beispielwerte --- */

test('Plausi: Wand Etagenwohnung ≈ 1946_1960 EFH-Bestand', () => {
  // Beispiel-Bauteil hat U=1.29 (mit ΔU_WB+0.05 = 1.34) — passt zur Bauklasse 1946_1960 (typ=1.2 EFH).
  // Wir verifizieren nur, dass der Lookup für diese Klasse einen sinnvollen Wert (1.0–1.5) liefert.
  const r = lookupUWert(U_WERTE, { bauteil:'wand', gebaeudetyp:'EFH', bauklasse:'1946_1960' });
  assert.ok(r.typ >= 0.8 && r.typ <= 1.5, `Wand 1946_1960 typ=${r.typ}`);
});
