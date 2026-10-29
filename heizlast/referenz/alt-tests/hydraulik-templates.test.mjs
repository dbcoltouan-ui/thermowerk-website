/**
 * tests/hydraulik-templates.test.mjs
 *
 * Phase B des Hydraulik-Schema-Generators.
 *
 * Pruefdimensionen
 * ----------------
 * 1. Strukturelle Integritaet pro Master-Template:
 *    - Render-Funktion liefert {svg, komponenten, modi, quelle, id, titel}
 *    - SVG ist wohlgeformt (faengt mit <svg an, schliesst mit </svg>)
 *    - Mindestens 1 VL-Linie und 1 RL-Linie
 *    - Reversible Templates haben mindestens einen [data-only="kuehl"]-Layer
 *
 * 2. Symbol-Referenz-Konsistenz:
 *    - Jede #sym-* ID, die per <use href="#sym-..."> referenziert wird,
 *      existiert in SYMBOL_LIST aus symbols.mjs.
 *
 * 3. Schema-Mapping-Konsistenz:
 *    - Jede Schema-ID in SCHEMA_MAP zeigt auf ein registriertes Template.
 *    - Jedes Template-`schemas`-Array enthaelt nur Eintraege, die im
 *      SCHEMA_MAP auch wirklich auf dieses Template zeigen.
 *    - Alle 30 erwarteten L/W-Schemas sind abgedeckt.
 *    - Alle 20 Sole/W-Schemas (NICHT_ABGEDECKT_SOLE_W) werfen geziel-
 *      ten Fehler.
 *
 * 4. Komponenten-Liste:
 *    - Mindestens WP + Sicherheitsgruppe + MAG + ein Verbraucher.
 *    - Jeder Eintrag hat id, label, kategorie, pflicht-Boolean.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SYMBOL_LIST } from '../src/hydraulik/symbols.mjs';
import { TEMPLATES, SCHEMA_MAP, NICHT_ABGEDECKT_SOLE_W,
         getCoveredSchemaIds, renderSchema } from '../src/hydraulik/templates/index.mjs';

const SYMBOL_IDS = new Set(SYMBOL_LIST.map(s => s.id));

// ---------------------------------------------------------------------------

test('Templates — alle 12 Master-Templates registriert', () => {
  const expected = ['direkt_1hk', 'direkt_kombi', 'direkt_2hk', 'direkt_2hk_parallelww',
                    'mehrkreis_hw', 'kaskade_hw', 'puffer_reihe_1hk', 'puffer_reihe_2hk',
                    'compact_allinone', 'trenntauscher_puffer',
                    'universal_3hk', 'universal_schwimmbad'];
  for (const id of expected) {
    assert.ok(TEMPLATES[id], `Template ${id} fehlt`);
    assert.equal(typeof TEMPLATES[id].render, 'function', `${id}.render keine Funktion`);
    assert.ok(Array.isArray(TEMPLATES[id].schemas), `${id}.schemas fehlt`);
  }
  assert.equal(Object.keys(TEMPLATES).length, expected.length, 'Anzahl Templates stimmt nicht');
});

test('Schema-Mapping — alle 30 L/W-Schemas abgedeckt', () => {
  const ids = getCoveredSchemaIds();
  assert.equal(ids.length, 30, 'Soll: 30 L/W-Schemas (Sole/W ausgelassen)');
  for (const id of ids) {
    assert.ok(SCHEMA_MAP[id], `Schema ${id} fehlt im SCHEMA_MAP`);
    const tplId = SCHEMA_MAP[id].templateId;
    assert.ok(TEMPLATES[tplId], `Schema ${id} zeigt auf nicht-existentes Template ${tplId}`);
  }
});

test('Schema-Mapping — Sole/W-Schemas werfen erkennbaren Fehler', () => {
  for (const id of NICHT_ABGEDECKT_SOLE_W) {
    assert.throws(() => renderSchema(id), /Sole\/W/, `${id} sollte Sole/W-Hinweis werfen`);
  }
});

test('Schema-Mapping — Template.schemas und SCHEMA_MAP sind konsistent', () => {
  for (const [tplId, tpl] of Object.entries(TEMPLATES)) {
    for (const sid of tpl.schemas) {
      assert.ok(SCHEMA_MAP[sid], `Template ${tplId} listet ${sid} auf, aber SCHEMA_MAP kennt es nicht`);
      assert.equal(SCHEMA_MAP[sid].templateId, tplId,
                   `${sid} ist in ${tplId}.schemas, aber SCHEMA_MAP zeigt auf ${SCHEMA_MAP[sid].templateId}`);
    }
  }
  // Umgekehrt
  for (const [sid, entry] of Object.entries(SCHEMA_MAP)) {
    const tpl = TEMPLATES[entry.templateId];
    assert.ok(tpl.schemas.includes(sid),
              `SCHEMA_MAP[${sid}] zeigt auf ${entry.templateId}, aber das Template listet es nicht`);
  }
});

// ---------------------------------------------------------------------------

test('Render — pro Schema: SVG-Struktur wohlgeformt', () => {
  for (const sid of getCoveredSchemaIds()) {
    const r = renderSchema(sid);
    assert.equal(typeof r, 'object', `${sid}: Result kein Objekt`);
    assert.ok(typeof r.svg === 'string' && r.svg.length > 100, `${sid}: SVG zu kurz`);
    assert.ok(r.svg.startsWith('<svg'), `${sid}: SVG faengt nicht mit <svg> an`);
    assert.ok(r.svg.trim().endsWith('</svg>'), `${sid}: SVG endet nicht auf </svg>`);
    assert.ok(/viewBox="\d+ \d+ \d+ \d+"/.test(r.svg), `${sid}: viewBox fehlt`);
    assert.ok(/data-mode="(heiz|kuehl)"/.test(r.svg), `${sid}: data-mode fehlt`);
    assert.ok(Array.isArray(r.komponenten) && r.komponenten.length > 0,
              `${sid}: komponenten leer`);
    assert.ok(Array.isArray(r.modi), `${sid}: modi fehlt`);
    assert.ok(typeof r.titel === 'string' && r.titel.length > 0, `${sid}: titel fehlt`);
    assert.ok(typeof r.quelle === 'string', `${sid}: quelle fehlt`);
  }
});

test('Render — pro Schema mind. 1 VL-Linie und 1 RL-Linie', () => {
  for (const sid of getCoveredSchemaIds()) {
    const { svg } = renderSchema(sid);
    assert.match(svg, /class="vl"/, `${sid}: keine VL-Linie`);
    assert.match(svg, /class="rl"/, `${sid}: keine RL-Linie`);
  }
});

test('Render — referenzierte Symbol-IDs existieren in SYMBOL_LIST', () => {
  const refRe = /href="#(sym-[a-z0-9-]+)"/g;
  for (const sid of getCoveredSchemaIds()) {
    const { svg } = renderSchema(sid);
    let m;
    const refs = new Set();
    while ((m = refRe.exec(svg)) !== null) refs.add(m[1]);
    for (const ref of refs) {
      assert.ok(SYMBOL_IDS.has(ref),
                `${sid}: Symbol-Referenz #${ref} nicht in SYMBOL_LIST`);
    }
    assert.ok(refs.size > 0, `${sid}: Keine Symbole referenziert`);
  }
});

test('Render — Komponenten haben id+label+kategorie+pflicht', () => {
  for (const sid of getCoveredSchemaIds()) {
    const { komponenten } = renderSchema(sid);
    for (const k of komponenten) {
      assert.ok(typeof k.id === 'string' && k.id.length > 0, `${sid}: komponente ohne id`);
      assert.ok(typeof k.label === 'string' && k.label.length > 0,
                `${sid}: komponente ${k.id} ohne label`);
      assert.ok(typeof k.kategorie === 'string', `${sid}: ${k.id} ohne kategorie`);
      assert.equal(typeof k.pflicht, 'boolean', `${sid}: ${k.id} ohne pflicht-Bool`);
    }
  }
});

test('Render — Komponenten enthalten WP + Sicherheit + Verbraucher', () => {
  for (const sid of getCoveredSchemaIds()) {
    const { komponenten } = renderSchema(sid);
    const hatWp = komponenten.some(k => k.kategorie === 'Waermeerzeuger');
    const hatSicherheit = komponenten.some(k => k.kategorie === 'Sicherheit');
    const hatVerbraucher = komponenten.some(k => k.kategorie === 'Verbraucher');
    assert.ok(hatWp, `${sid}: kein Waermeerzeuger in Komponenten-Liste`);
    assert.ok(hatSicherheit, `${sid}: keine Sicherheit (SG/MAG/SV)`);
    assert.ok(hatVerbraucher, `${sid}: kein Verbraucher (HK/FBH/Pool)`);
  }
});

test('Render — Reversible Schemas haben Kuehl-Layer', () => {
  for (const sid of getCoveredSchemaIds()) {
    const r = renderSchema(sid);
    if (r.modi.includes('kuehl')) {
      assert.match(r.svg, /data-only="kuehl"/,
                   `${sid}: reversibel, aber kein data-only="kuehl"-Element`);
    }
  }
});

test('Render — Modus-Override wirkt', () => {
  // direkt_1hk mit cooling=active sollte 'kuehl' in modi haben
  const aktiv = renderSchema('schema_002');
  assert.ok(aktiv.modi.includes('kuehl'), 'Schema 002 (Active Cooling) sollte kuehl-Modus haben');
  // schema_001 (kein Cooling) sollte kein kuehl haben
  const noCooling = renderSchema('schema_001');
  assert.equal(noCooling.modi.includes('kuehl'), false, 'Schema 001 (kein Cooling) hat kuehl');
});

// ---------------------------------------------------------------------------

test('SCHEMA_MAP + NICHT_ABGEDECKT decken alle 50 Katalog-Schemas ab', () => {
  const allCovered = new Set([...Object.keys(SCHEMA_MAP), ...NICHT_ABGEDECKT_SOLE_W]);
  for (let i = 1; i <= 50; i++) {
    const sid = 'schema_' + String(i).padStart(3, '0');
    assert.ok(allCovered.has(sid),
              `Katalog-Schema ${sid} ist weder im SCHEMA_MAP noch in NICHT_ABGEDECKT_SOLE_W`);
  }
});

test('Performance — alle 30 Schemas rendern unter 200ms gesamt', () => {
  const t0 = Date.now();
  for (const sid of getCoveredSchemaIds()) renderSchema(sid);
  const dt = Date.now() - t0;
  assert.ok(dt < 200, `Render dauerte ${dt} ms (Schwelle 200 ms)`);
});
