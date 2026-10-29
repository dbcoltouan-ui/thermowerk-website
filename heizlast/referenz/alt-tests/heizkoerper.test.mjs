// tests/heizkoerper.test.mjs
// Wärmeübergabe Phase A (2026-04-30):
//   1) Schema-Validierung Stammdaten data/heizkoerper.json
//   2) VDI-6030 / DIN-EN-442-Berechnung gegen Hersteller-Werte
//   3) Sanierungs-Plausi bei VL 35/40/45 °C
//   4) freshHeizflaeche() + migrateHeizkoerperFelder() Round-Trip

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  dTm, leistungsFaktor, plausibilitaetHeizflaeche
} from '../src/calc/distribution.mjs';
import { freshHeizflaeche } from '../src/state.mjs';
import { migrateHeizkoerperFelder } from '../src/persistence.mjs';

const DB = JSON.parse(readFileSync(new URL('../data/heizkoerper.json', import.meta.url), 'utf8'));

const close = (a, b, tol) => Math.abs(a - b) <= tol;
function assertClose(a, b, tol, msg){
  if (!close(a, b, tol)) assert.fail(`${msg || ''} expected ${b}±${tol}, got ${a}`);
}

/* ==========================================================================
   1) SCHEMA-VALIDIERUNG STAMMDATEN
   ========================================================================== */

const REQUIRED_MODEL_KEYS = [
  'id', 'hersteller', 'modellreihe', 'typ',
  'hoehe', 'laenge_min', 'laenge_max', 'tiefe',
  'q_norm_75_65', 'q_norm_55_45', 'q_norm_45_35',
  'n_exponent', 'quelle_url'
];

const REQUIRED_FALLBACK_KEYS = [
  'typ', 'label', 'tiefe_typ_mm',
  'q_75_65_W_pro_m2_front', 'q_55_45_W_pro_m2_front', 'q_45_35_W_pro_m2_front',
  'n_exponent', 'hinweis'
];

const VALID_TYPEN = new Set([
  'platte_t10', 'platte_t11', 'platte_t21', 'platte_t22', 'platte_t33',
  'gliederheizkoerper', 'gussradiator',
  'konvektor_passiv', 'designheizkoerper', 'bad_handtuchwaermer',
  'fbh', 'wandheizung', 'fan_coil'
]);

test('Schema — _meta/version/anzahl_modelle vorhanden', () => {
  assert.ok(DB._meta && DB._meta.version && DB._meta.schema_version === 'heizkoerper.v1');
  assert.equal(DB._meta.anzahl_modelle, DB.modelle.length, 'anzahl_modelle muss zur Liste passen');
  assert.equal(DB._meta.anzahl_fallback_typen, DB.typen_fallback.length, 'anzahl_fallback_typen muss zur Liste passen');
});

test('Schema — Modelle: alle Pflichtfelder vorhanden + plausible Werte', () => {
  assert.ok(Array.isArray(DB.modelle) && DB.modelle.length >= 30, 'Mindestens 30 Modelle erwartet');
  const ids = new Set();
  for (const m of DB.modelle){
    for (const k of REQUIRED_MODEL_KEYS){
      assert.ok(k in m, `Modell ${m.id || '<?>'} fehlt Feld ${k}`);
    }
    assert.ok(typeof m.id === 'string' && m.id.length > 5, `Modell-ID zu kurz: ${m.id}`);
    assert.ok(!ids.has(m.id), `Doppelte Modell-ID: ${m.id}`);
    ids.add(m.id);
    assert.ok(VALID_TYPEN.has(m.typ), `${m.id}: unbekannter Typ ${m.typ}`);
    assert.ok(m.hoehe > 0 && m.hoehe < 3000, `${m.id}: Höhe ausserhalb 0–3000`);
    assert.ok(m.laenge_min > 0 && m.laenge_max >= m.laenge_min, `${m.id}: laenge_min/max unplausibel`);
    assert.ok(m.tiefe > 30 && m.tiefe < 250, `${m.id}: Tiefe ausserhalb 30–250 mm`);
    assert.ok(m.q_norm_75_65 > 0, `${m.id}: q_norm_75_65 nicht > 0`);
    assert.ok(m.q_norm_55_45 > 0 && m.q_norm_55_45 < m.q_norm_75_65,
      `${m.id}: q_norm_55_45 muss zwischen 0 und q_norm_75_65 liegen`);
    assert.ok(m.q_norm_45_35 > 0 && m.q_norm_45_35 < m.q_norm_55_45,
      `${m.id}: q_norm_45_35 muss zwischen 0 und q_norm_55_45 liegen`);
    assert.ok(m.n_exponent >= 1.0 && m.n_exponent <= 1.5, `${m.id}: n_exponent ausserhalb 1.0–1.5`);
    assert.ok(typeof m.quelle_url === 'string' && m.quelle_url.startsWith('http'),
      `${m.id}: quelle_url muss URL sein`);
  }
});

test('Schema — Fallback-Tabelle: alle Pflichtfelder + jede Bauart genau einmal', () => {
  assert.ok(Array.isArray(DB.typen_fallback) && DB.typen_fallback.length >= 5);
  const seenTypen = new Set();
  for (const f of DB.typen_fallback){
    for (const k of REQUIRED_FALLBACK_KEYS){
      assert.ok(k in f, `Fallback ${f.typ || '<?>'} fehlt Feld ${k}`);
    }
    assert.ok(VALID_TYPEN.has(f.typ), `Fallback unbekannter Typ ${f.typ}`);
    assert.ok(!seenTypen.has(f.typ), `Doppelter Fallback-Typ ${f.typ}`);
    seenTypen.add(f.typ);
    assert.ok(f.q_75_65_W_pro_m2_front > f.q_55_45_W_pro_m2_front, `${f.typ}: 75/65 > 55/45`);
    assert.ok(f.q_55_45_W_pro_m2_front > f.q_45_35_W_pro_m2_front, `${f.typ}: 55/45 > 45/35`);
  }
});

test('Schema — Plattenheizkörper-Reihen 11→21→22→33 sind aufsteigend Q_norm', () => {
  // Innerhalb derselben Modellreihe und Höhe muss die Leistung mit Typ steigen.
  const grouped = new Map();
  for (const m of DB.modelle){
    if (!m.typ.startsWith('platte_')) continue;
    const key = m.hersteller + '|' + m.modellreihe + '|' + m.hoehe;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(m);
  }
  for (const [key, list] of grouped){
    if (list.length < 2) continue;
    const order = { platte_t10: 0, platte_t11: 1, platte_t21: 2, platte_t22: 3, platte_t33: 4 };
    list.sort((a, b) => order[a.typ] - order[b.typ]);
    for (let i = 1; i < list.length; i++){
      assert.ok(list[i].q_norm_75_65 > list[i-1].q_norm_75_65,
        `Reihe ${key}: ${list[i].typ} muss > ${list[i-1].typ} sein`);
    }
  }
});

/* ==========================================================================
   2) VDI 6030 / DIN EN 442 — Rechen-Konsistenz mit DB-Werten
   ========================================================================== */

test('VDI — dT_log Norm 75/65/20 ≈ 49.83 K (DB-Konvention)', () => {
  assertClose(dTm({ tVL: 75, tRL: 65, tInnen: 20 }), 49.83, 0.05);
  assertClose(DB._meta.konvention.dt_log_75_65_20, 49.83, 0.05);
});

test('VDI — dT_log 55/45/20 ≈ 29.72 K', () => {
  assertClose(dTm({ tVL: 55, tRL: 45, tInnen: 20 }), 29.72, 0.05);
});

test('VDI — dT_log 45/35/20 ≈ 19.58 K', () => {
  assertClose(dTm({ tVL: 45, tRL: 35, tInnen: 20 }), 19.58, 0.05);
});

test('VDI — Buderus C-Profil T22 H600: q_55_45 ≈ q_75_65 · (29.72/49.83)^1.30', () => {
  const m = DB.modelle.find(x => x.id === 'buderus-logatrend-c-profil-22-h600');
  assert.ok(m, 'Modell vorhanden');
  const f = Math.pow(29.72/49.83, m.n_exponent);
  const expected = m.q_norm_75_65 * f;
  // ±2 % Toleranz (Hersteller-Datenblatt vs. analytisch)
  assertClose(m.q_norm_55_45, expected, expected * 0.02, '55/45-Wert');
});

test('VDI — Buderus C-Profil T22 H600: q_45_35 ≈ q_75_65 · (19.58/49.83)^1.30', () => {
  const m = DB.modelle.find(x => x.id === 'buderus-logatrend-c-profil-22-h600');
  const f = Math.pow(19.58/49.83, m.n_exponent);
  const expected = m.q_norm_75_65 * f;
  assertClose(m.q_norm_45_35, expected, expected * 0.03, '45/35-Wert');
});

test('VDI — Stelrad Novello Eco T22 H600 hat identische Q_norm-Reihe wie Buderus T22 (gleiche Bauklasse)', () => {
  const a = DB.modelle.find(x => x.id === 'buderus-logatrend-c-profil-22-h600');
  const b = DB.modelle.find(x => x.id === 'stelrad-novello-eco-22-h600');
  assertClose(a.q_norm_75_65, b.q_norm_75_65, 50, 'T22 H600 Q_norm vergleichbar');
});

test('VDI — Buderus C-Profil T22 H600 ↔ Buderus C-Profil T22 H400: Skalierung mit Höhe', () => {
  const h6 = DB.modelle.find(x => x.id === 'buderus-logatrend-c-profil-22-h600');
  const h4 = DB.modelle.find(x => x.id === 'buderus-logatrend-c-profil-22-h400');
  // H600 muss messbar mehr leisten als H400 (mehr Strahlungsfläche)
  assert.ok(h6.q_norm_75_65 > h4.q_norm_75_65 * 1.2,
    `H600/H400-Verhältnis sollte deutlich > 1.2 sein, ist ${(h6.q_norm_75_65 / h4.q_norm_75_65).toFixed(2)}`);
});

test('VDI — Q_norm-Linearskalierung mit Länge (Frontfläche-Normierung)', () => {
  // Buderus C-Profil T22 H600: Q_norm @ 1000 mm = 1617 W
  // Bei 2000 mm Länge erwarten wir ≈ 3234 W (linear)
  const m = DB.modelle.find(x => x.id === 'buderus-logatrend-c-profil-22-h600');
  const Q_2m = m.q_norm_75_65 * (2000 / 1000);
  assertClose(Q_2m, 3234, 30, 'Linearskalierung 2 m');
});

/* ==========================================================================
   3) SANIERUNGS-PLAUSI BEI VL 35 / 40 / 45 °C
   ========================================================================== */

// Reale Sanierungs-Frage: Buderus Logatrend C-Profil Typ 22 H=600 mm,
// Länge 1000 mm (= 0.6 m² Frontfläche), Raumheizlast 800 W.
//   → Q_norm 75/65/20 = 1617 W (Hersteller).
//   → q_norm pro m² Front = 1617 / 0.6 = 2695 W/m²
// distribution.plausibilitaetHeizflaeche() bekommt q_norm_W_pro_m2 als Override.

const BUDERUS_T22_H600_L1000 = {
  q_norm_total: 1617, // W bei 75/65/20
  A_front_m2: 0.6     // 0.6 m × 1.0 m
};

function plausi(args){
  const q_pro_m2 = BUDERUS_T22_H600_L1000.q_norm_total / BUDERUS_T22_H600_L1000.A_front_m2;
  return plausibilitaetHeizflaeche({
    typ: 'heizkoerper',
    A_heizflaeche: BUDERUS_T22_H600_L1000.A_front_m2,
    tInnen: 20,
    q_norm_W_pro_m2: q_pro_m2,
    ...args
  });
}

test('Sanierungs-Plausi VL 45/35: T22 H600 L1000 deckt 480 W → grün bei phi=400 W', () => {
  const r = plausi({ phiHL_raum: 400, tVL_neu: 45, tRL_neu: 35 });
  assert.equal(r.ampel, 'gruen', `Erwartet grün, ist ${r.ampel} (Q_real=${Math.round(r.Q_real)} W)`);
  assertClose(r.Q_real, 480, 30, 'Q_real bei 45/35');
});

test('Sanierungs-Plausi VL 45/35: T22 H600 L1000 (480 W) → rot bei phi=800 W (Tausch nötig)', () => {
  const r = plausi({ phiHL_raum: 800, tVL_neu: 45, tRL_neu: 35 });
  assert.equal(r.ampel, 'rot', `Erwartet rot, ist ${r.ampel} (Deckung=${(r.deckungsgrad*100).toFixed(0)}%)`);
  assert.ok(r.deckungsgrad < 0.85, 'Deckungsgrad < 85 % bei zu kleinem HK');
});

test('Sanierungs-Plausi VL 40/30: T22 H600 L1000 — zwischen 45/35 und 35/30', () => {
  const r45 = plausi({ phiHL_raum: 1, tVL_neu: 45, tRL_neu: 35 }); // nur Q_real
  const r40 = plausi({ phiHL_raum: 1, tVL_neu: 40, tRL_neu: 30 });
  const r35 = plausi({ phiHL_raum: 1, tVL_neu: 35, tRL_neu: 30 });
  assert.ok(r45.Q_real > r40.Q_real && r40.Q_real > r35.Q_real,
    `Q_real-Monotonie verletzt: 45=${r45.Q_real.toFixed(0)} 40=${r40.Q_real.toFixed(0)} 35=${r35.Q_real.toFixed(0)}`);
});

test('Sanierungs-Plausi VL 35/30: T22 H600 L1000 ≈ 280 W (sehr niedrige VL)', () => {
  const r = plausi({ phiHL_raum: 1, tVL_neu: 35, tRL_neu: 30 });
  // dT_log = (15-10)/ln(15/10) = 12.33 ; Faktor = (12.33/49.83)^1.3 = 0.157
  // Q_real = 1617 · 0.157 ≈ 254 W
  assertClose(r.Q_real, 254, 25, 'Q_real bei 35/30');
});

test('Sanierungs-Plausi 85%-Schwelle: bei phi=565 W (T22 H600 1m, 45/35) → gelb', () => {
  // Q_real ≈ 480 W, Deckung 480/565 = 0.85 → gerade gelb
  const r = plausi({ phiHL_raum: 565, tVL_neu: 45, tRL_neu: 35 });
  assert.ok(r.ampel === 'gelb' || r.ampel === 'rot',
    `Erwartet gelb/rot bei 565 W, ist ${r.ampel} (Deckung=${(r.deckungsgrad*100).toFixed(0)}%)`);
});

test('Sanierungs-Plausi Konvektor-Exponent 1.40: bricht stärker ein als Plattenheizkörper', () => {
  // Identische Geometrie/Q_norm, aber typ=konvektor → in distribution.mjs n=1.10.
  // Trotzdem: gleicher Q_norm-Punkt → gleicher Faktor — die DB-Konvektor-Werte
  // (Fallback-Tabelle) sind bei 45/35 prozentual niedriger als Platte:
  const platte = DB.typen_fallback.find(t => t.typ === 'platte_t22');
  const konv   = DB.typen_fallback.find(t => t.typ === 'konvektor_passiv');
  const ratioPlatte = platte.q_45_35_W_pro_m2_front / platte.q_75_65_W_pro_m2_front;
  const ratioKonv   = konv.q_45_35_W_pro_m2_front   / konv.q_75_65_W_pro_m2_front;
  assert.ok(ratioKonv < ratioPlatte,
    `Konvektor (n=1.40) muss bei 45/35 stärker abfallen als Platte (n=1.30): K=${ratioKonv.toFixed(3)} vs. P=${ratioPlatte.toFixed(3)}`);
});

/* ==========================================================================
   4) freshHeizflaeche() + migrateHeizkoerperFelder() Round-Trip
   ========================================================================== */

test('freshHeizflaeche() liefert alle Pflicht-Felder mit sicheren Defaults', () => {
  const h = freshHeizflaeche();
  assert.equal(h.typ, 'fbh');
  assert.equal(h.A, 0);
  assert.equal(h.kreis_id, '');
  assert.equal(h.hersteller, '');
  assert.equal(h.modell, '');
  assert.equal(h.hoehe, 0);
  assert.equal(h.laenge, 0);
  assert.equal(h.tiefe, 0);
  assert.equal(h.q_norm, 0);
});

test('freshHeizflaeche(overrides) übernimmt Override-Felder', () => {
  const h = freshHeizflaeche({ typ: 'heizkoerper', A: 1.2, modell: 'kermi-thermx2-profil-k-22-h600' });
  assert.equal(h.typ, 'heizkoerper');
  assert.equal(h.A, 1.2);
  assert.equal(h.modell, 'kermi-thermx2-profil-k-22-h600');
  // Default-Felder weiter gefüllt:
  assert.equal(h.hersteller, '');
  assert.equal(h.q_norm, 0);
});

test('migrateHeizkoerperFelder — Legacy-Heizflaeche (nur typ/A/kreis_id) bekommt neue Felder', () => {
  const state = {
    detail: {
      raeume: [
        { name: 'Wohnzimmer', heizflaechen: [
          { typ: 'heizkoerper', A: 1.0, kreis_id: 'k1' } // Legacy ohne neue Felder
        ]}
      ]
    }
  };
  migrateHeizkoerperFelder(state);
  const h = state.detail.raeume[0].heizflaechen[0];
  assert.equal(h.typ, 'heizkoerper', 'typ unverändert');
  assert.equal(h.A, 1.0, 'A unverändert');
  assert.equal(h.hersteller, '', 'hersteller default');
  assert.equal(h.modell, '', 'modell default');
  assert.equal(h.hoehe, 0, 'hoehe default');
  assert.equal(h.laenge, 0, 'laenge default');
  assert.equal(h.tiefe, 0, 'tiefe default');
  assert.equal(h.q_norm, 0, 'q_norm default');
});

test('migrateHeizkoerperFelder — bestehende Werte werden NICHT überschrieben', () => {
  const state = {
    detail: {
      raeume: [{ name: 'Bad', heizflaechen: [{
        typ: 'heizkoerper', A: 0.6, kreis_id: 'k1',
        hersteller: 'Buderus', modell: 'buderus-logatrend-c-profil-22-h600',
        hoehe: 600, laenge: 1000, tiefe: 102, q_norm: 1617
      }]}]
    }
  };
  migrateHeizkoerperFelder(state);
  const h = state.detail.raeume[0].heizflaechen[0];
  assert.equal(h.hersteller, 'Buderus');
  assert.equal(h.modell, 'buderus-logatrend-c-profil-22-h600');
  assert.equal(h.hoehe, 600);
  assert.equal(h.laenge, 1000);
  assert.equal(h.q_norm, 1617);
});

test('migrateHeizkoerperFelder — robust gegen leeren / fehlerhaften State', () => {
  assert.doesNotThrow(() => migrateHeizkoerperFelder(null));
  assert.doesNotThrow(() => migrateHeizkoerperFelder({}));
  assert.doesNotThrow(() => migrateHeizkoerperFelder({ detail: {} }));
  assert.doesNotThrow(() => migrateHeizkoerperFelder({ detail: { raeume: [{ heizflaechen: null }] } }));
  assert.doesNotThrow(() => migrateHeizkoerperFelder({ detail: { raeume: [null] } }));
});
