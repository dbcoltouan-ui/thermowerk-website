// tests/foerderung.test.mjs
// S6 — Förderungs- und Baubewilligungs-Lookup

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  filterFoerderungen, lookupBaubewilligung,
  schaetzeBetrag, gruppiereProgramme
} from '../src/calc/foerderung.mjs';
import { vergleichNormVerbrauch } from '../src/calc/plausi.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '..', 'data');

let foerderDb, bauDb;
async function loadDbs(){
  if (!foerderDb){
    foerderDb = JSON.parse(await readFile(resolve(dataDir, 'foerderungen.json'), 'utf8'));
  }
  if (!bauDb){
    bauDb = JSON.parse(await readFile(resolve(dataDir, 'baubewilligungen.json'), 'utf8'));
  }
  return { foerderDb, bauDb };
}

/* -------------------- Förder-Mapping (Akzeptanzkriterium S6) -------------------- */

test('S6 Förder-Mapping ZH · Heizungsersatz · WP Luft', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, {
    kanton: 'ZH', massnahme: 'heizungsersatz', wp_quelle: 'luft'
  });
  // Erwartung: Bund-Programme zu heizungsersatz (keine in unserer DB rein für heizungsersatz)
  // + ZH-spezifische Heizungsersatz-Programme (mehrere).
  assert.ok(list.length >= 3, `Mind. 3 Programme erwartet für ZH heizungsersatz luft, gefunden: ${list.length}`);
  const ids = list.map(p => p.id);
  assert.ok(ids.includes('zh-heizung-luft-wp'), 'ZH Luft-WP-Programm fehlt');
  // Sole-spezifische Programme dürfen NICHT erscheinen wenn wp_quelle=luft
  assert.ok(!ids.includes('zh-heizung-wp'), 'Sole-spezifisches ZH-Programm wurde irrtümlich gelistet');
  // Holz, Fernwärme, Pellet sind nicht WP-spezifisch — sollten erscheinen
  assert.ok(ids.includes('zh-fernwaerme'), 'ZH Fernwärme fehlt');
  assert.ok(ids.includes('zh-holz-pellet'), 'ZH Holz/Pellet fehlt');
});

test('S6 Förder-Mapping ZH · Heizungsersatz · WP Sole', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, {
    kanton: 'ZH', massnahme: 'heizungsersatz', wp_quelle: 'sole'
  });
  const ids = list.map(p => p.id);
  assert.ok(ids.includes('zh-heizung-wp'), 'ZH Sole-WP-Programm fehlt');
  // Luft-spezifisches Programm sollte ausgeblendet sein
  assert.ok(!ids.includes('zh-heizung-luft-wp'), 'Luft-WP wurde irrtümlich für Sole gelistet');
});

test('S6 Förder-Mapping BE · Heizungsersatz · WP Sole', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, {
    kanton: 'BE', massnahme: 'heizungsersatz', wp_quelle: 'sole'
  });
  const ids = list.map(p => p.id);
  assert.ok(ids.includes('be-wp-sole'), 'BE Sole-WP fehlt');
  assert.ok(!ids.includes('be-wp-luft'), 'BE Luft-WP fälschlich bei Sole');
  assert.ok(ids.includes('be-holz'), 'BE Holzheizung fehlt');
  // Bund-Programme tauchen auf wenn Massnahme matcht
});

test('S6 Förder-Mapping LU · Heizungsersatz · WP Luft', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, {
    kanton: 'LU', massnahme: 'heizungsersatz', wp_quelle: 'luft'
  });
  const ids = list.map(p => p.id);
  assert.ok(ids.includes('lu-wp-luft'), 'LU Luft-WP fehlt');
  assert.ok(!ids.includes('lu-wp-sole'), 'LU Sole-WP fälschlich bei Luft');
  assert.ok(ids.includes('lu-holz'), 'LU Holzheizung fehlt');
});

test('S6 Förder-Mapping GR · Heizungsersatz · WP Sole', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, {
    kanton: 'GR', massnahme: 'heizungsersatz', wp_quelle: 'sole'
  });
  const ids = list.map(p => p.id);
  assert.ok(ids.includes('gr-wp-sole'), 'GR Sole-WP fehlt');
  assert.ok(!ids.includes('gr-wp-luft'), 'GR Luft-WP fälschlich bei Sole');
});

test('S6 Förder-Mapping ZH · Sanierung Hülle (mit Bundesprogramm)', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, {
    kanton: 'ZH', massnahme: 'sanierung_huelle'
  });
  const ids = list.map(p => p.id);
  assert.ok(ids.includes('bund-m01-wand'), 'Bund M-01 Wand fehlt');
  // Kanton: M-02-Bonus auch sichtbar wenn er sanierung_huelle hat
  assert.ok(ids.includes('bund-m02'), 'Bund M-02 GEAK-Bonus fehlt für sanierung_huelle');
  // Bund zuerst
  assert.equal(list[0].kanton, '*', 'Bund-Programm muss zuerst sortiert sein');
});

test('S6 Förder-Mapping VS · Heizungsersatz · WP Luft (französischsprachig)', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, {
    kanton: 'VS', massnahme: 'heizungsersatz', wp_quelle: 'luft'
  });
  const ids = list.map(p => p.id);
  assert.ok(ids.includes('vs-wp-luft'), 'VS Luft-PAC fehlt');
});

test('S6 Förder-Mapping unbekannter Kanton liefert leere Liste (kein Crash)', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, { kanton: 'XX', massnahme: 'heizungsersatz' });
  assert.equal(list.length, 0, 'Unbekannter Kanton sollte 0 Treffer liefern');
});

test('S6 Förder-Mapping ohne Massnahme liefert leere Liste', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, { kanton: 'ZH', massnahme: '' });
  assert.equal(list.length, 0);
});

test('S6 schaetzeBetrag · CHF/kW Programm', async () => {
  const { foerderDb } = await loadDbs();
  const prog = foerderDb.programme.find(p => p.id === 'zh-heizung-luft-wp');
  assert.ok(prog, 'ZH Luft-WP Programm fehlt in DB');
  const b = schaetzeBetrag(prog, { Qh_kW: 8 });
  // 4'000 + 100 * 8 = 4'800
  assert.equal(b, 4800, 'Betrag-Schätzung ZH Luft-WP @ 8kW falsch');
});

test('S6 schaetzeBetrag · Pauschal-Programm (GEAK)', async () => {
  const { foerderDb } = await loadDbs();
  const prog = foerderDb.programme.find(p => p.id === 'zh-geak-plus');
  assert.ok(prog);
  const b = schaetzeBetrag(prog, { Qh_kW: 8 });
  assert.equal(b, 1500, 'Pauschal sollte 1500 sein');
});

test('S6 gruppiereProgramme · Bund/Kanton-Splittung', async () => {
  const { foerderDb } = await loadDbs();
  const list = filterFoerderungen(foerderDb, {
    kanton: 'ZH', massnahme: 'sanierung_huelle'
  });
  const grp = gruppiereProgramme(list, { Qh_kW: 8, A_bauteil_m2: 100 });
  assert.ok(grp.bund.length >= 1, 'Bund-Gruppe leer');
  // total_geschaetzt soll bei A_bauteil > 0 nicht null sein
  assert.ok(grp.total_geschaetzt > 0, 'total_geschaetzt sollte > 0 sein');
});

/* -------------------- Baubewilligung -------------------- */

test('S6 Baubewilligung ZH', async () => {
  const { bauDb } = await loadDbs();
  const k = lookupBaubewilligung(bauDb, 'ZH');
  assert.ok(k, 'ZH-Eintrag fehlt');
  assert.equal(k.kanton_name, 'Zürich');
  assert.equal(k.heizungsersatz.bewilligungspflichtig, true);
  assert.match(k.heizungsersatz.kurz, /erneuerbar/i);
  assert.match(k.portal, /^https?:\/\//);
});

test('S6 Baubewilligung BE', async () => {
  const { bauDb } = await loadDbs();
  const k = lookupBaubewilligung(bauDb, 'BE');
  assert.ok(k);
  assert.equal(k.kanton_name, 'Bern');
  assert.equal(k.heizungsersatz.bewilligungspflichtig, true);
});

test('S6 Baubewilligung LU', async () => {
  const { bauDb } = await loadDbs();
  const k = lookupBaubewilligung(bauDb, 'LU');
  assert.ok(k);
  assert.equal(k.kanton_name, 'Luzern');
});

test('S6 Baubewilligung GR', async () => {
  const { bauDb } = await loadDbs();
  const k = lookupBaubewilligung(bauDb, 'GR');
  assert.ok(k);
  assert.equal(k.kanton_name, 'Graubünden');
});

test('S6 Baubewilligung — alle 26 Kantone vorhanden', async () => {
  const { bauDb } = await loadDbs();
  const expected = ['ZH','BE','LU','UR','SZ','OW','NW','GL','ZG','FR','SO','BS','BL','SH','AR','AI','SG','GR','AG','TG','TI','VD','VS','NE','GE','JU'];
  for (const c of expected){
    assert.ok(bauDb.kantone[c], `Kanton ${c} fehlt in baubewilligungen.json`);
    assert.ok(bauDb.kantone[c].heizungsersatz, `Heizungsersatz-Eintrag fehlt für ${c}`);
  }
});

test('S6 Baubewilligung unbekannter Kanton', async () => {
  const { bauDb } = await loadDbs();
  assert.equal(lookupBaubewilligung(bauDb, 'XX'), null);
  assert.equal(lookupBaubewilligung(bauDb, ''), null);
});

/* -------------------- DB-Sanity -------------------- */

test('S6 foerderungen.json Sanity', async () => {
  const { foerderDb } = await loadDbs();
  assert.ok(Array.isArray(foerderDb.programme));
  assert.ok(foerderDb.programme.length >= 30, `Mindestens 30 Programme erwartet, gefunden: ${foerderDb.programme.length}`);
  // Jedes Programm hat Pflichtfelder
  for (const p of foerderDb.programme){
    assert.ok(p.id, 'Programm ohne id');
    assert.ok(p.name, `Programm ${p.id} ohne Name`);
    assert.ok(p.kanton, `Programm ${p.id} ohne Kanton`);
    assert.ok(Array.isArray(p.massnahmen) && p.massnahmen.length > 0, `Programm ${p.id} ohne Massnahmen`);
    assert.ok(p.antrag_link, `Programm ${p.id} ohne Antrag-Link`);
  }
});

test('S6 baubewilligungen.json Sanity', async () => {
  const { bauDb } = await loadDbs();
  assert.ok(bauDb.kantone);
  assert.equal(Object.keys(bauDb.kantone).length, 26, 'Es müssen 26 Kantone sein');
});

/* -------------------- Cockpit-Vergleich (Norm vs. FWS) -------------------- */

test('S6 Vergleich · grün bei <10 % Abweichung', () => {
  const v = vergleichNormVerbrauch(8.0, 8.5);
  // Δ = 0.5 / 8.5 = 5.88 %
  assert.equal(v.ampel, 'gruen');
  assert.ok(v.abweichung_proz < 10, `Abweichung ${v.abweichung_proz} sollte <10 % sein`);
});

test('S6 Vergleich · gelb bei 10–25 % Abweichung', () => {
  const v = vergleichNormVerbrauch(8.0, 10.0);
  // Δ = 2.0 / 10.0 = 20 %
  assert.equal(v.ampel, 'gelb');
  assert.ok(v.abweichung_proz >= 10 && v.abweichung_proz < 25);
});

test('S6 Vergleich · rot bei >25 % Abweichung', () => {
  const v = vergleichNormVerbrauch(6.0, 12.0);
  // Δ = 6.0 / 12.0 = 50 %
  assert.equal(v.ampel, 'rot');
  assert.ok(v.abweichung_proz >= 25);
});

test('S6 Vergleich · grau wenn Werte fehlen', () => {
  assert.equal(vergleichNormVerbrauch(0, 8.0).ampel, 'grau');
  assert.equal(vergleichNormVerbrauch(8.0, 0).ampel, 'grau');
  assert.equal(vergleichNormVerbrauch(NaN, 8.0).ampel, 'grau');
  assert.equal(vergleichNormVerbrauch(null, null).ampel, 'grau');
});

test('S6 Vergleich · symmetrisch (max im Nenner)', () => {
  // Beide Reihenfolgen sollen identisch sein
  const v1 = vergleichNormVerbrauch(7, 10);
  const v2 = vergleichNormVerbrauch(10, 7);
  assert.equal(v1.abweichung_proz, v2.abweichung_proz);
});
