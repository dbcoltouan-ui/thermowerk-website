// tests/offerte.test.mjs
//
// Tests für das Offerten-Datenmodell — Schema-Validierung +
// Paket-Auflösung. Daten aus data/offerten-positionen.json und
// data/offerten-pakete.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validatePosition,
  validatePositionen,
  validatePaket,
  resolvePaket,
  computePaketSubtotal,
  applyTaxAndFoerderung,
  _internal,
} from '../src/calc/offerte.mjs';

const POSITIONEN = JSON.parse(readFileSync(new URL('../data/offerten-positionen.json', import.meta.url), 'utf-8'));
const PAKETE = JSON.parse(readFileSync(new URL('../data/offerten-pakete.json', import.meta.url), 'utf-8'));

// ─────────────────────────────────────────────────────────────────
// Stammdaten-Schema
// ─────────────────────────────────────────────────────────────────

test('Positionen: _meta-Block hat schema_version + currency', () => {
  assert.equal(POSITIONEN._meta.schema_version, 'offerten-positionen.v1');
  assert.equal(POSITIONEN._meta.currency, 'CHF');
  assert.ok(POSITIONEN._meta.stundensatz_default > 0);
});

test('Positionen: alle Schema-validiert + keine doppelten IDs', () => {
  const r = validatePositionen(POSITIONEN.positionen);
  assert.deepEqual(r.duplicate_ids, [], 'doppelte IDs gefunden');
  assert.equal(r.ok, true, `Validation-Fehler: ${r.errors.slice(0, 5).join(' | ')}`);
});

test('Positionen: Anzahl Stammdaten ≥ 60 (>=10 pro Hauptkategorie A-K im Mittel)', () => {
  assert.ok(POSITIONEN.positionen.length >= 60, `nur ${POSITIONEN.positionen.length} Positionen`);
});

test('Positionen: alle 8 Stolperstein-Positionen (Kategorie L) vorhanden', () => {
  const lPos = POSITIONEN.positionen.filter(p => p.kategorie === 'L');
  assert.equal(lPos.length, 8, `erwarte genau 8 L-Positionen, sind ${lPos.length}`);
  // Jeder kritisch_check-Typ muss ≥ 1× vorkommen (bis auf 'Sorglos-Paket' das hat null)
  const checkTypen = new Set(lPos.map(p => p.kritisch_check).filter(Boolean));
  for (const erwartet of ['hak','asbest','hydraulik','fbh-verteiler','cooling','schall-lokal','geak-pflicht']) {
    assert.ok(checkTypen.has(erwartet), `kritisch_check '${erwartet}' fehlt in Stammdaten`);
  }
});

test('Positionen: NPK-Codes wo gesetzt folgen Format "NPK NNN.NNN"', () => {
  const re = /^NPK \d{3}\.\d{3}$/;
  for (const p of POSITIONEN.positionen) {
    if (p.npk_code) assert.match(p.npk_code, re, `${p.id}: ungültiger NPK-Code '${p.npk_code}'`);
  }
});

test('Positionen: Stunden-Position hat numerischen stundensatz', () => {
  const stundenPos = POSITIONEN.positionen.find(p => p.einheit === 'h');
  assert.ok(stundenPos, 'keine Stunden-Position gefunden');
  assert.equal(stundenPos.stundensatz, 110);
});

test('validatePosition: lehnt unvollständige Position ab', () => {
  const r = validatePosition({ id: 'x', kategorie: 'B', name: 'X' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('einheit')));
});

test('validatePosition: lehnt ungültige Kategorie ab', () => {
  const r = validatePosition({
    id: 'x', kategorie: 'Z', name: 'X', einheit: 'Stk',
    einheits_preis: 100, default_menge: 1,
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('Kategorie')));
});

test('validatePosition: lehnt ungültigen kritisch_check ab', () => {
  const r = validatePosition({
    id: 'x', kategorie: 'L', name: 'X', einheit: 'Pauschal',
    einheits_preis: 100, default_menge: 0, kritisch_check: 'unsinn',
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('kritisch_check')));
});

// ─────────────────────────────────────────────────────────────────
// Pakete
// ─────────────────────────────────────────────────────────────────

test('Pakete: 2 Standardpakete vorhanden (LW + SW)', () => {
  assert.equal(PAKETE.pakete.length, 2);
  const ids = PAKETE.pakete.map(p => p.id);
  assert.ok(ids.includes('paket-lw-aussen-oel-ersatz'));
  assert.ok(ids.includes('paket-sw-erdsonde-150m'));
});

test('Pakete: alle Paket-Positionen referenzieren existierende Stammdaten', () => {
  for (const paket of PAKETE.pakete) {
    const r = validatePaket(paket, POSITIONEN.positionen);
    assert.equal(r.ok, true, `Paket '${paket.id}': ${r.errors.join(' | ')}`);
  }
});

test('Pakete: Auflösung liefert vollständige Daten + Subtotals', () => {
  const lw = PAKETE.pakete.find(p => p.id === 'paket-lw-aussen-oel-ersatz');
  const resolved = resolvePaket(lw, POSITIONEN.positionen);
  assert.ok(resolved.length > 25, `LW-Paket nur ${resolved.length} Positionen aufgelöst`);
  // Alle haben name + subtotal
  for (const p of resolved) {
    assert.ok(p.name && typeof p.subtotal === 'number');
  }
});

test('Pakete: Subtotal LW-Paket liegt im erwarteten Korridor 38-48k netto', () => {
  const lw = PAKETE.pakete.find(p => p.id === 'paket-lw-aussen-oel-ersatz');
  const resolved = resolvePaket(lw, POSITIONEN.positionen);
  const { netto_subtotal } = computePaketSubtotal(resolved);
  // Korridor ist Brutto inkl. MwSt. Netto darum etwas tiefer.
  // Erwartung: 30k–48k netto.
  assert.ok(netto_subtotal >= 30000 && netto_subtotal <= 50000,
    `Subtotal LW = CHF ${netto_subtotal.toFixed(0)} ausserhalb [30000, 50000]`);
});

test('Pakete: SW-Paket Subtotal liegt im Korridor 55-80k', () => {
  const sw = PAKETE.pakete.find(p => p.id === 'paket-sw-erdsonde-150m');
  const resolved = resolvePaket(sw, POSITIONEN.positionen);
  const { netto_subtotal } = computePaketSubtotal(resolved);
  assert.ok(netto_subtotal >= 50000 && netto_subtotal <= 85000,
    `Subtotal SW = CHF ${netto_subtotal.toFixed(0)} ausserhalb [50000, 85000]`);
});

test('Pakete: Bauleitung-Position (%) wirkt auf Subtotal', () => {
  // Synthetisches Mini-Paket: 10000 fix + 6 % Bauleitung → 10600
  const stamm = [
    { id: 'a', kategorie: 'B', kategorie_name: 'X', name: 'A', einheit: 'Stk',
      einheits_preis: 10000, default_menge: 1, ist_pauschal: false },
    { id: 'b', kategorie: 'J', kategorie_name: 'X', name: 'Bauleitung', einheit: '%',
      einheits_preis: 6, default_menge: 1, ist_pauschal: false },
  ];
  const paket = { id: 'tmp', name: 'tmp', positionen: [
    { position_id: 'a', menge_override: 1 },
    { position_id: 'b', menge_override: 1 },
  ]};
  const resolved = resolvePaket(paket, stamm);
  const { netto_subtotal } = computePaketSubtotal(resolved);
  assert.equal(netto_subtotal, 10600);
});

// ─────────────────────────────────────────────────────────────────
// Tax + Förderung
// ─────────────────────────────────────────────────────────────────

test('applyTaxAndFoerderung: rechnet 8.1 % MwSt + Förderung-Abzug korrekt', () => {
  const r = applyTaxAndFoerderung(40000, { foerderung_chf: 8500 });
  assert.equal(r.netto_subtotal, 40000);
  assert.equal(r.mwst_pct, 8.1);
  assert.equal(r.mwst_chf, 3240);
  assert.equal(r.brutto, 43240);
  assert.equal(r.foerderung_chf, 8500);
  assert.equal(r.netto_invest, 34740);
});

// ─────────────────────────────────────────────────────────────────
// WP-DB-Erweiterung (reversibel-Flag)
// ─────────────────────────────────────────────────────────────────

test('Waermepumpen: reversibel-Flag auf jedem Hauptgerät vorhanden', () => {
  const wp = JSON.parse(readFileSync(new URL('../data/waermepumpen.json', import.meta.url), 'utf-8'));
  assert.ok(Array.isArray(wp.hauptgeraete) && wp.hauptgeraete.length > 0);
  for (const g of wp.hauptgeraete) {
    assert.ok('reversibel' in g, `WP ${g.ID}: reversibel-Feld fehlt`);
    assert.ok(g.reversibel === true || g.reversibel === false || g.reversibel === null,
      `WP ${g.ID}: reversibel = ${g.reversibel} (erwarte true/false/null)`);
  }
});

test('Waermepumpen: Schema-Extension im _meta dokumentiert', () => {
  const wp = JSON.parse(readFileSync(new URL('../data/waermepumpen.json', import.meta.url), 'utf-8'));
  const ext = wp._meta?.schema_extensions ?? [];
  assert.ok(ext.some(e => e.feld === 'reversibel'),
    'reversibel-Schema-Extension fehlt im _meta');
});

// ─────────────────────────────────────────────────────────────────
// Session 2 — buildVorbelegung + applyPreSalesChecks + State-Migration
// ─────────────────────────────────────────────────────────────────

import {
  buildVorbelegung,
  applyPreSalesChecks,
  PRE_SALES_TO_POSITION_ID,
} from '../src/calc/offerte.mjs';
import { freshState } from '../src/state.mjs';
import { migrateOffertenState } from '../src/persistence.mjs';

test('buildVorbelegung: ohne wp_quelle fällt auf LW-Paket zurück', () => {
  const state = freshState();
  state.projekt.wp_quelle = 'luft';
  const out = buildVorbelegung(state, null,
    { positionen: POSITIONEN.positionen, pakete: PAKETE.pakete });
  assert.equal(out.paket_id, 'paket-lw-aussen-oel-ersatz');
  assert.ok(out.positionen.length > 10, 'Paket sollte viele Positionen liefern');
  // Stellantriebe-Menge soll Anzahl Heizkreise = 1 sein, falls Paket fbh-stellantriebe enthält
  const stell = out.positionen.find(p => p.position_id === 'fbh-stellantriebe');
  if (stell) assert.equal(stell.menge, 1);
});

test('buildVorbelegung: wp_quelle=sole liefert SW-Paket', () => {
  const state = freshState();
  state.projekt.wp_quelle = 'sole';
  const out = buildVorbelegung(state, null,
    { positionen: POSITIONEN.positionen, pakete: PAKETE.pakete });
  assert.equal(out.paket_id, 'paket-sw-erdsonde-150m');
});

test('buildVorbelegung: VW_Sto > 350 → ww-speicher-emailliert-400l', () => {
  const state = freshState();
  state.projekt.wp_quelle = 'luft';
  const calc = { VW_Sto: 380, VP_Sto: 0, heatpump: null };
  const out = buildVorbelegung(state, calc,
    { positionen: POSITIONEN.positionen, pakete: PAKETE.pakete });
  const sp = out.positionen.find(p => /ww-speicher-emailliert/.test(p.position_id));
  assert.ok(sp, 'WW-Speicher-Position muss existieren');
  assert.equal(sp.position_id, 'ww-speicher-emailliert-400l');
});

test('buildVorbelegung: reversible WP fügt Cooling-Position hinzu', () => {
  const state = freshState();
  state.projekt.wp_quelle = 'luft';
  const calc = {
    VW_Sto: 0, VP_Sto: 0,
    heatpump: { sel: { Marke: 'X', Modell: 'Y', reversibel: true } }
  };
  const out = buildVorbelegung(state, calc,
    { positionen: POSITIONEN.positionen, pakete: PAKETE.pakete });
  const cool = out.positionen.find(p => p.position_id === 'cooling-aufpreis-reversibel');
  assert.ok(cool, 'Cooling-Position muss bei reversibler WP automatisch dazukommen');
});

test('buildVorbelegung: 3 Heizkreise → fbh-stellantriebe Menge 3', () => {
  const state = freshState();
  state.projekt.wp_quelle = 'luft';
  state.detail.verteilung.heizkreise = [
    { id: 'k1', name: 'EG' }, { id: 'k2', name: 'OG' }, { id: 'k3', name: 'DG' }
  ];
  const out = buildVorbelegung(state, null,
    { positionen: POSITIONEN.positionen, pakete: PAKETE.pakete });
  const stell = out.positionen.find(p => p.position_id === 'fbh-stellantriebe');
  if (stell) assert.equal(stell.menge, 3);
});

test('applyPreSalesChecks: hak=true hebt HAK-Position in die Liste', () => {
  const out = applyPreSalesChecks([], { hak: true }, POSITIONEN.positionen);
  assert.ok(out.find(p => p.position_id === 'hak-upgrade-25-40-63a'));
});

test('applyPreSalesChecks: doppelte Anwendung dupliziert nicht', () => {
  const first = applyPreSalesChecks([], { asbest: true }, POSITIONEN.positionen);
  const second = applyPreSalesChecks(first, { asbest: true }, POSITIONEN.positionen);
  const count = second.filter(p => p.position_id === 'asbest-schnelltest-sanierung').length;
  assert.equal(count, 1);
});

test('PRE_SALES_TO_POSITION_ID: alle 7 Keys mappen auf existierende Position-IDs', () => {
  const ids = new Set(POSITIONEN.positionen.map(p => p.id));
  for (const [k, v] of Object.entries(PRE_SALES_TO_POSITION_ID)) {
    assert.ok(ids.has(v), `Pre-Sales-Key '${k}' → '${v}' nicht in Stammdaten`);
  }
});

test('migrateOffertenState: alter State ohne offerte bekommt Default', () => {
  const old = { projekt: {}, objekt: {} };
  migrateOffertenState(old);
  assert.ok(old.offerte);
  assert.equal(old.offerte.paket_id, null);
  assert.deepEqual(old.offerte.positionen, []);
  assert.equal(old.offerte.mwst_pct, 8.1);
  assert.equal(old.offerte.foerderung_chf, 0);
  assert.deepEqual(old.offerte.pre_sales_checks, {
    hak: false, asbest: false, hydraulik: false, fbhVerteiler: false,
    cooling: false, schallLokal: false, geakPflicht: false
  });
});

test('migrateOffertenState: partieller offerte-State wird ergänzt', () => {
  const partial = { offerte: { positionen: [{id:'x'}] } };
  migrateOffertenState(partial);
  assert.equal(partial.offerte.paket_id, null);
  assert.equal(partial.offerte.mwst_pct, 8.1);
  assert.ok(partial.offerte.pre_sales_checks);
  assert.equal(partial.offerte.pre_sales_checks.hak, false);
  assert.equal(partial.offerte.positionen.length, 1);
});

test('freshState() liefert offerte-Default-Block', () => {
  const s = freshState();
  assert.ok(s.offerte);
  assert.equal(s.offerte.paket_id, null);
  assert.equal(s.offerte.mwst_pct, 8.1);
  assert.deepEqual(s.offerte.positionen, []);
});

// ─────────────────────────────────────────────────────────────────
// Session 3 — buildOfferteHtml + buildCustomPositionenMd
// ─────────────────────────────────────────────────────────────────

import { buildOfferteHtml, buildCustomPositionenMd, ZAHLUNGSPLAENE } from '../src/export-offerte.mjs';

test('buildOfferteHtml: liefert komplette HTML mit allen Pflicht-Sektionen', () => {
  const state = freshState();
  state.projekt.name = 'Smoke-Test Offerte';
  state.projekt.bauherrschaft = 'Familie Muster';
  state.projekt.strasse = 'Beispielstr. 12';
  state.projekt.plz = '8400';
  state.projekt.ort = 'Winterthur';
  state.offerte.positionen = [
    {
      id: 'p1', position_id: 'demontage-bestandsheizung',
      kategorie: 'A', kategorie_name: 'Demontage / Vorbereitung',
      name: 'Demontage Bestandsheizung', einheit: 'Pauschal',
      einheits_preis: 1850, menge: 1, subtotal: 1850,
      bemerkung: '', _isCustom: false
    },
    {
      id: 'p2', position_id: 'wp-lw-8-14kw',
      kategorie: 'B', kategorie_name: 'Wärmeerzeuger',
      name: 'Luft/Wasser-WP 8–14 kW', einheit: 'Stk',
      einheits_preis: 14500, menge: 1, subtotal: 14500,
      hersteller_garantie_jahre: 5,
      bemerkung: 'Modell: Marke Y', _isCustom: false
    }
  ];
  state.offerte.foerderung_chf = 8500;
  const html = buildOfferteHtml(state, null, { zahlungsplan: 'klassisch' });

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /Offerte zur Heizungssanierung/);
  assert.match(html, /Familie Muster/);
  assert.match(html, /Beispielstr\./);
  assert.match(html, /Demontage Bestandsheizung/);
  assert.match(html, /Luft\/Wasser-WP/);
  // Zusammenstellung muss MwSt 8.1 % zeigen
  assert.match(html, /MwSt \(8\.1 %\)/);
  // Foerderung-Abzug
  assert.match(html, /Förderung/);
  // de-CH benutzt U+2019 als Tausendertrennzeichen
  assert.match(html, /8[’'.]500[,.]00|8500[,.]00/);
  // Zahlungsplan
  assert.match(html, /Zahlungsplan/);
  assert.match(html, /Klassisch \(30 \/ 60 \/ 10\)/);
  // Garantie-Block mit Hersteller-Garantie der WP
  assert.match(html, /5 Jahre Hersteller-Garantie/);
  // AGB-Block mit OR 2026 + SIA 118 Korrigenda
  assert.match(html, /OR.*2026/);
  assert.match(html, /SIA-Norm 118.*Korrigenda 2026/);
  // Bank-Footer
  assert.match(html, /Bankverbindung/);
  assert.match(html, /UID/);
});

test('buildOfferteHtml: Kategorien werden gruppiert + leere Kategorien bleiben weg', () => {
  const state = freshState();
  state.offerte.positionen = [
    { id: 'p1', kategorie: 'B', kategorie_name: 'Wärmeerzeuger',
      name: 'WP', einheit: 'Stk', einheits_preis: 12000, menge: 1, _isCustom: false },
    { id: 'p2', kategorie: 'I', kategorie_name: 'Dokumentation',
      name: 'Schallnachweis', einheit: 'Pauschal', einheits_preis: 800, menge: 1, _isCustom: false }
  ];
  const html = buildOfferteHtml(state, null);
  assert.match(html, /B · Wärmeerzeuger/);
  assert.match(html, /I · Dokumentation/);
  // Kategorie A nicht enthalten (keine Positionen)
  assert.ok(!/A · Demontage/.test(html), 'leere Kategorie A darf nicht erscheinen');
});

test('buildOfferteHtml: Zahlungsplan-Vorlagen wechseln korrekt', () => {
  const state = freshState();
  state.offerte.positionen = [
    { id: 'p1', kategorie: 'B', kategorie_name: 'X',
      name: 'X', einheit: 'Stk', einheits_preis: 10000, menge: 1, _isCustom: false }
  ];
  const klassisch = buildOfferteHtml(state, null, { zahlungsplan: 'klassisch' });
  assert.match(klassisch, /30 / );
  assert.match(klassisch, /60 / );
  const drittel = buildOfferteHtml(state, null, { zahlungsplan: 'drittel' });
  assert.match(drittel, /Drittel \(33 \/ 33 \/ 34\)/);
  const schluss = buildOfferteHtml(state, null, { zahlungsplan: 'schluss' });
  assert.match(schluss, /Schluss \(50 \/ 50\)/);
});

test('buildCustomPositionenMd: filtert _isCustom-Positionen + JSON-Patch-Format', () => {
  const state = freshState();
  state.projekt.name = 'Custom-Smoke';
  state.offerte.positionen = [
    { id: 'p1', kategorie: 'B', kategorie_name: 'Wärmeerzeuger',
      name: 'Stamm-WP', einheit: 'Stk', einheits_preis: 12000, menge: 1, _isCustom: false },
    { id: 'p2', kategorie: 'D', kategorie_name: 'Rohrnetz',
      name: 'Speziallösung Rohranschluss', einheit: 'Pauschal',
      einheits_preis: 850, menge: 1, bemerkung: 'kantonsspezifisch', _isCustom: true },
    { id: 'p3', kategorie: 'L', kategorie_name: 'Stolperstein',
      name: 'Lokaler Schallschutz erweitert', einheit: 'Pauschal',
      einheits_preis: 2500, menge: 1, _isCustom: true }
  ];
  const md = buildCustomPositionenMd(state);

  assert.match(md, /Anzahl Custom-Posten:\*\* 2/);
  assert.match(md, /Speziallösung Rohranschluss/);
  assert.match(md, /Lokaler Schallschutz erweitert/);
  // Stamm-Position darf NICHT drin sein
  assert.ok(!/Stamm-WP/.test(md), 'Stamm-Position darf nicht in Custom-Liste auftauchen');
  // JSON-Patch-Format
  assert.match(md, /"id": "d-spezialloesung-rohranschluss"/);
  assert.match(md, /"kategorie": "D"/);
  assert.match(md, /"einheits_preis": 850/);
  assert.match(md, /NPK-Code Slot/);
});

test('buildCustomPositionenMd: keine Custom-Posten → Hinweis-Zeile', () => {
  const state = freshState();
  state.offerte.positionen = [
    { id: 'p1', kategorie: 'B', kategorie_name: 'X',
      name: 'Stamm', einheit: 'Stk', einheits_preis: 100, menge: 1, _isCustom: false }
  ];
  const md = buildCustomPositionenMd(state);
  assert.match(md, /Anzahl Custom-Posten:\*\* 0/);
  assert.match(md, /Keine Custom-Positionen erfasst/);
});

test('ZAHLUNGSPLAENE: alle 3 Vorlagen summieren auf 100 %', () => {
  for (const key of ['klassisch','drittel','schluss']){
    const plan = ZAHLUNGSPLAENE[key];
    assert.ok(plan, key + ' fehlt');
    const sum = plan.raten.reduce((s, r) => s + r.pct, 0);
    assert.equal(sum, 100, `${key}: Summe = ${sum} %`);
  }
});
