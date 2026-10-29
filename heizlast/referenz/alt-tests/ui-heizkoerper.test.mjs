// tests/ui-heizkoerper.test.mjs
// Wärmeübergabe Phase B (2026-04-30) — UI-Helpers für den HK-Modell-Picker.
// Testet die pure Logik-Schicht (calc/heizkoerper.mjs):
//   1) Hersteller-Dropdown enthält alle Marken aus DB
//   2) Modellreihen-Dropdown filtert korrekt nach Hersteller
//   3) Höhen-Dropdown filtert korrekt nach Modellreihe
//   4) Modell-Lookup nach ID funktioniert
//   5) l × b → A-Berechnung (mm² → m²)
//   6) Unbekannt-Fallback liefert q_norm aus W/m²-Front × A
//   7) "Aus Modell" Q_norm-Berechnung mit Längen-Skalierung
//   8) Längen-Validation gegen laenge_min / laenge_max
// Die Phase-B-UI-Mutationen in src/ui.mjs::onInputChange greifen auf genau
// diese Helper zu — wenn die hier korrekt sind, ist der Picker konsistent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getHersteller, getModellreihen, getHoehen,
  findModelle, findModell,
  getFallback, getFallbackTypen,
  qNormFromModell, qNormFromFallback,
  flaecheVonHL, flaecheVonLB,
  isLaengeValid, pickModellByTyp
} from '../src/calc/heizkoerper.mjs';

const DB = JSON.parse(readFileSync(new URL('../data/heizkoerper.json', import.meta.url), 'utf8'));

const close = (a, b, tol) => Math.abs(a - b) <= tol;

/* ==========================================================================
   1) Hersteller-Dropdown
   ========================================================================== */

test('Hersteller-Dropdown enthält alle Marken aus DB', () => {
  const hers = getHersteller(DB);
  assert.ok(Array.isArray(hers) && hers.length >= 5,
    `Mindestens 5 Hersteller erwartet, gefunden: ${hers.length}`);
  // Konkret die 6 Hersteller aus der Phase-A-Datenbank:
  const required = ['Buderus', 'Stelrad', 'Purmo', 'Vogel & Noot', 'Zehnder', 'Kermi'];
  for (const r of required){
    assert.ok(hers.includes(r), `Hersteller ${r} fehlt in Dropdown-Liste (${hers.join(', ')})`);
  }
  // Keine Duplikate
  assert.equal(new Set(hers).size, hers.length, 'Hersteller-Liste enthält Duplikate');
});

test('Hersteller-Dropdown sortiert alphabetisch (Schweizer Locale)', () => {
  const hers = getHersteller(DB);
  const sorted = [...hers].sort((a, b) => a.localeCompare(b, 'de'));
  assert.deepEqual(hers, sorted, 'Hersteller-Liste ist nicht sortiert');
});

/* ==========================================================================
   2) Modellreihen-Dropdown
   ========================================================================== */

test('Modellreihen-Dropdown filtert nach Hersteller (Buderus)', () => {
  const reihen = getModellreihen(DB, 'Buderus');
  assert.ok(reihen.length >= 2, `Mindestens 2 Buderus-Reihen erwartet, gefunden: ${reihen.length}`);
  // C-Profil.2 muss enthalten sein (siehe data/heizkoerper.json)
  assert.ok(reihen.some(r => r.includes('C-Profil')), `Buderus C-Profil-Reihe fehlt: ${reihen.join(', ')}`);
});

test('Modellreihen-Dropdown ist leer ohne Hersteller', () => {
  assert.deepEqual(getModellreihen(DB, ''), []);
  assert.deepEqual(getModellreihen(DB, null), []);
});

test('Modellreihen-Dropdown enthält keine fremden Hersteller', () => {
  const reihenBuderus = getModellreihen(DB, 'Buderus');
  // In data/heizkoerper.json gibt es keine Buderus-Reihe namens "Novello Eco"
  assert.ok(!reihenBuderus.includes('Novello Eco'),
    'Stelrad-Modellreihe darf nicht in Buderus-Liste auftauchen');
});

/* ==========================================================================
   3) Höhen-Dropdown
   ========================================================================== */

test('Höhen-Dropdown filtert nach Modellreihe (Buderus C-Profil.2)', () => {
  const hoehen = getHoehen(DB, 'Buderus', 'Logatrend C-Profil.2');
  assert.ok(hoehen.length >= 2, `Mindestens 2 Höhen erwartet, gefunden: ${hoehen.length}`);
  assert.ok(hoehen.includes(400) && hoehen.includes(600),
    `H400 und H600 müssen vorhanden sein: ${hoehen.join(', ')}`);
});

test('Höhen-Dropdown ist numerisch aufsteigend sortiert', () => {
  const hoehen = getHoehen(DB, 'Buderus', 'Logatrend C-Profil.2');
  const sorted = [...hoehen].sort((a, b) => a - b);
  assert.deepEqual(hoehen, sorted, 'Höhen sind nicht sortiert');
});

test('Höhen-Dropdown ist leer ohne Modellreihe', () => {
  assert.deepEqual(getHoehen(DB, 'Buderus', ''), []);
});

/* ==========================================================================
   4) Modell-Lookup nach ID
   ========================================================================== */

test('findModelle liefert Bauarten-Liste für Hersteller+Reihe+Höhe', () => {
  const list = findModelle(DB, 'Buderus', 'Logatrend C-Profil.2', 600);
  assert.ok(list.length >= 3, `Mindestens 3 Bauarten erwartet (T11/T21/T22 + ggf. T33), gefunden: ${list.length}`);
  const ids = list.map(m => m.id);
  assert.ok(ids.some(i => i.includes('22-h600')), `T22 H600 muss enthalten sein: ${ids.join(', ')}`);
});

test('findModell liefert das Modell zur ID', () => {
  const m = findModell(DB, 'buderus-logatrend-c-profil-22-h600');
  assert.ok(m, 'Modell muss gefunden werden');
  assert.equal(m.hersteller, 'Buderus');
  assert.equal(m.typ, 'platte_t22');
  assert.equal(m.hoehe, 600);
  assert.equal(m.q_norm_75_65, 1617);
});

test('findModell liefert null bei unbekannter ID', () => {
  assert.equal(findModell(DB, 'gibts-nicht-12345'), null);
  assert.equal(findModell(DB, ''), null);
  assert.equal(findModell(DB, null), null);
});

/* ==========================================================================
   5) l × b → A
   ========================================================================== */

test('flaecheVonLB rechnet mm × mm → m² korrekt (1000 × 600)', () => {
  // 1000 mm × 600 mm = 600'000 mm² = 0.6 m²
  assert.equal(flaecheVonLB(1000, 600), 0.6);
});

test('flaecheVonLB liefert 0 bei ungültigen Eingaben', () => {
  assert.equal(flaecheVonLB(0, 600), 0);
  assert.equal(flaecheVonLB(1000, 0), 0);
  assert.equal(flaecheVonLB(-100, 600), 0);
  assert.equal(flaecheVonLB('', ''), 0);
  assert.equal(flaecheVonLB(undefined, undefined), 0);
});

test('flaecheVonHL identisch zu flaecheVonLB für gleiche Massen', () => {
  assert.equal(flaecheVonHL(600, 1000), flaecheVonLB(1000, 600));
  // Buderus T22 H600 mit L=1000 → 0.6 m² Frontfläche
  assert.equal(flaecheVonHL(600, 1000), 0.6);
});

/* ==========================================================================
   6) Unbekannt-Fallback
   ========================================================================== */

test('Unbekannt-Fallback liefert die 9 Bauart-Optionen aus DB', () => {
  const types = getFallbackTypen(DB);
  assert.equal(types.length, 9, '9 Fallback-Bauarten erwartet');
  const typIds = types.map(t => t.typ);
  // Pflicht-Typen, die im UI-Dropdown sichtbar sein müssen
  const required = ['platte_t11', 'platte_t22', 'platte_t33', 'konvektor_passiv',
                    'designheizkoerper', 'bad_handtuchwaermer'];
  for (const t of required){
    assert.ok(typIds.includes(t), `Fallback-Typ ${t} fehlt: ${typIds.join(', ')}`);
  }
});

test('getFallback findet Bauart-Eintrag mit Tiefe + n_exponent + W/m²', () => {
  const fb = getFallback(DB, 'platte_t22');
  assert.ok(fb, 'Fallback platte_t22 muss existieren');
  assert.equal(fb.tiefe_typ_mm, 100);
  assert.equal(fb.n_exponent, 1.30);
  assert.equal(fb.q_75_65_W_pro_m2_front, 2700);
});

test('Unbekannt-Fallback q_norm aus W/m²-Front × A', () => {
  const fb = getFallback(DB, 'platte_t22');
  // Frontfläche 0.6 m² → Q_norm = 2700 × 0.6 = 1620 W bei 75/65/20
  assert.equal(qNormFromFallback(fb, 0.6), 1620);
  // 1.5 m² → 4050 W
  assert.equal(qNormFromFallback(fb, 1.5), 4050);
});

test('Unbekannt-Fallback q_norm = 0 bei ungültigen Eingaben', () => {
  assert.equal(qNormFromFallback(null, 0.6), 0);
  assert.equal(qNormFromFallback(getFallback(DB, 'platte_t22'), 0), 0);
  assert.equal(qNormFromFallback(getFallback(DB, 'platte_t22'), -1), 0);
});

/* ==========================================================================
   7) Q_norm aus Modell × Länge (Längen-Skalierung)
   ========================================================================== */

test('"Aus Modell" Q_norm-Berechnung mit Längen-Skalierung trifft DB-Wert (Buderus T22 H600)', () => {
  const m = findModell(DB, 'buderus-logatrend-c-profil-22-h600');
  assert.ok(m);
  // L = 1000 mm → exakt q_norm_75_65 = 1617 W
  assert.equal(qNormFromModell(m, 1000), 1617);
  // L = 2000 mm → linear skaliert = 3234 W
  assert.equal(qNormFromModell(m, 2000), 3234);
  // L = 500 mm → halbiert = 808.5 W
  assert.ok(close(qNormFromModell(m, 500), 808.5, 0.1),
    `qNormFromModell L=500 erwartet 808.5, ist ${qNormFromModell(m, 500)}`);
});

test('Q_norm-Berechnung mit Stelrad Novello Eco T22 H600 (gleiche Bauklasse)', () => {
  const m = findModell(DB, 'stelrad-novello-eco-22-h600');
  assert.ok(m);
  // L = 1500 mm
  const Q = qNormFromModell(m, 1500);
  // ≈ q_norm_75_65 × 1.5
  assert.ok(close(Q, m.q_norm_75_65 * 1.5, 0.1),
    `Erwartet ${m.q_norm_75_65 * 1.5}, ist ${Q}`);
});

test('Q_norm = 0 bei fehlendem Modell oder L ≤ 0', () => {
  assert.equal(qNormFromModell(null, 1000), 0);
  const m = findModell(DB, 'buderus-logatrend-c-profil-22-h600');
  assert.equal(qNormFromModell(m, 0), 0);
  assert.equal(qNormFromModell(m, -10), 0);
});

/* ==========================================================================
   8) Längen-Validation
   ========================================================================== */

test('isLaengeValid akzeptiert Werte im Hersteller-Bereich', () => {
  const m = findModell(DB, 'buderus-logatrend-c-profil-22-h600');
  // laenge_min = 400, laenge_max = 3000 (siehe data/heizkoerper.json)
  assert.ok(isLaengeValid(m, 400),  'Untergrenze 400 muss gültig sein');
  assert.ok(isLaengeValid(m, 1000), 'Mittelwert 1000 muss gültig sein');
  assert.ok(isLaengeValid(m, 3000), 'Obergrenze 3000 muss gültig sein');
});

test('isLaengeValid lehnt Werte ausserhalb des Bereichs ab', () => {
  const m = findModell(DB, 'buderus-logatrend-c-profil-22-h600');
  assert.ok(!isLaengeValid(m, 399),  'Unter Untergrenze muss invalid sein');
  assert.ok(!isLaengeValid(m, 3001), 'Über Obergrenze muss invalid sein');
  assert.ok(!isLaengeValid(m, 0),    'Null muss invalid sein');
  assert.ok(!isLaengeValid(m, -100), 'Negativ muss invalid sein');
});

test('isLaengeValid ist robust gegen null-Modell', () => {
  assert.ok(!isLaengeValid(null, 1000));
});

/* ==========================================================================
   9) pickModellByTyp (Repick beim Höhen-Wechsel)
   ========================================================================== */

test('pickModellByTyp wählt das Modell mit gewünschtem Typ aus der Liste', () => {
  const list = findModelle(DB, 'Buderus', 'Logatrend C-Profil.2', 600);
  const m = pickModellByTyp(list, 'platte_t22');
  assert.ok(m);
  assert.equal(m.typ, 'platte_t22');
  assert.equal(m.hoehe, 600);
});

test('pickModellByTyp fällt auf erstes Element zurück, wenn Typ nicht vorhanden', () => {
  const list = findModelle(DB, 'Buderus', 'Logatrend C-Profil.2', 600);
  const m = pickModellByTyp(list, 'platte_t10');
  assert.ok(m, 'Es muss ein Modell zurückkommen (Fallback)');
});

test('pickModellByTyp robust gegen leere Liste', () => {
  assert.equal(pickModellByTyp([], 'platte_t22'), null);
  assert.equal(pickModellByTyp(null, 'platte_t22'), null);
});
