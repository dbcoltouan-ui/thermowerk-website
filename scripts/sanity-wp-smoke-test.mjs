#!/usr/bin/env node
/**
 * Smoke-Test — Round-Trip BO-0001 + PA-0001
 * ------------------------------------------
 * Prueft, ob der Konfigurator gleiche Komponenten-Liste + Preis-Summe liefert,
 * wenn die Daten aus
 *   (a) datenbank_export_v1.0.json  (Excel-Source)        ← Referenz
 *   (b) Sanity-Production-Dataset (GROQ-Pull)              ← nach --push
 * gelesen werden.
 *
 * Modi:
 *   node scripts/sanity-wp-smoke-test.mjs            # nur (a) lokal — Konfigurator-Demo-Reproduktion
 *   node scripts/sanity-wp-smoke-test.mjs --sanity   # (a) + (b) gegeneinander vergleichen
 *
 * Test-Faelle:
 *   BO-0001   (Bosch CS5800i AW 5 ORE-S — keine User-Konfig, alle Defaults)
 *   PA-0001   (Panasonic Aquarea 9-16 — Aufstellort=Sockel, BWW-Funktion=true)
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { createClient } from '@sanity/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
dotenvConfig({ path: join(PROJECT_ROOT, '.env') });

const DEFAULT_DB_ROOT = 'C:\\Users\\Daniel\\Documents\\Thermowerk\\Review_WP_Datenbank_v0.2';
const DB_ROOT = process.env.WP_DB_ROOT || DEFAULT_DB_ROOT;
const JSON_PATH = join(DB_ROOT, '04_Tool_Uebernahme', 'datenbank_export_v1.0.json');

const argv = process.argv.slice(2);
const useSanity = argv.includes('--sanity');

// ─── Konfigurator-Logik (port of konfigurator_demo.py) ──────────────

function parseValue(s) {
  const sl = String(s).toLowerCase();
  if (sl === 'true') return true;
  if (sl === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function evalBedingt(expr, vars) {
  if (!expr || String(expr).trim() === '' || String(expr).trim() === 'None' || expr === null) return true;
  if (/\sODER\s/.test(expr)) return expr.split(/\s+ODER\s+/).some((p) => evalBedingt(p, vars));
  if (/\sUND\s/.test(expr)) return expr.split(/\s+UND\s+/).every((p) => evalBedingt(p, vars));
  for (const op of ['!=', '>=', '<=', '=', '>', '<']) {
    const idx = expr.indexOf(op);
    if (idx > 0) {
      const variable = expr.slice(0, idx).trim();
      const valStr = expr.slice(idx + op.length).trim();
      const v = vars[variable];
      if (v === undefined) return false;
      const target = parseValue(valStr);
      if (op === '=') return String(v) === String(target);
      if (op === '!=') return String(v) !== String(target);
      try {
        const a = Number(v), b = Number(target);
        if (op === '>') return a > b;
        if (op === '<') return a < b;
        if (op === '>=') return a >= b;
        if (op === '<=') return a <= b;
      } catch {
        return false;
      }
    }
  }
  return false;
}

function configure(db, geraeteId, userKonfig = {}, groupChoice = {}) {
  const stammIdx = new Map(db.komponenten_stamm.map((c) => [c['Art.-Nr.'], c]));
  const geraet = db.hauptgeraete.find((g) => g.ID === geraeteId);
  if (!geraet) throw new Error(`Geraet ${geraeteId} nicht gefunden`);

  const mappings = db.komponenten_mapping.filter((m) => m['Geräte-ID'] === geraeteId);
  const aktiv = mappings.filter((m) => evalBedingt(m['Bedingt_durch'], userKonfig));

  const grouped = new Map();
  for (const m of aktiv) {
    const key = `${m['Pflicht-Typ']}|${m['Gruppen-ID'] || m['Komponente Art.-Nr.']}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(m);
  }

  const selected = [];
  for (const [keyComposite, gruppe] of grouped) {
    const [pflicht, key] = keyComposite.split('|');
    if (pflicht === 'required') {
      selected.push(...gruppe);
    } else if (pflicht === 'oneOf') {
      const chosenArtNr = groupChoice[key];
      let pick = chosenArtNr ? gruppe.find((m) => m['Komponente Art.-Nr.'] === chosenArtNr) : null;
      if (!pick) pick = gruppe.find((m) => String(m['Default'] || '').toLowerCase() === 'ja') || gruppe[0];
      if (pick) selected.push(pick);
    } else if (pflicht === 'anyOf') {
      const chosenSet = new Set(groupChoice[key] || []);
      for (const m of gruppe) if (chosenSet.has(m['Komponente Art.-Nr.'])) selected.push(m);
    } else if (pflicht === 'optional') {
      if (groupChoice[key] === true) selected.push(...gruppe);
    } else if (pflicht === 'dienstleistung') {
      if (key && key.includes('_') && gruppe.length > 1) {
        const chosenArtNr = groupChoice[key];
        let pick = chosenArtNr ? gruppe.find((m) => m['Komponente Art.-Nr.'] === chosenArtNr) : null;
        if (!pick) pick = gruppe.find((m) => String(m['Default'] || '').toLowerCase() === 'ja') || gruppe[0];
        if (pick) selected.push(pick);
      } else {
        selected.push(...gruppe);
      }
    }
  }

  let summeKomp = 0;
  const enriched = selected.map((m) => {
    const stamm = stammIdx.get(m['Komponente Art.-Nr.']);
    const preis = Number(stamm?.['Preis CHF']) || 0;
    const menge = Number(m['Menge'] || 1);
    summeKomp += preis * menge;
    return { ...m, _preisStamm: preis, _summeChf: preis * menge };
  });

  const summeGeraet = Number(geraet['Preis CHF']) || 0;
  return {
    geraet,
    selected: enriched,
    summeGeraetChf: summeGeraet,
    summeKomponentenChf: Math.round(summeKomp * 100) / 100,
    summeTotalChf: Math.round((summeGeraet + summeKomp) * 100) / 100,
  };
}

// ─── Sanity → JSON-Format zurueck konvertieren ──────────────────────

async function loadFromSanity() {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || 'production';
  const token = process.env.SANITY_API_TOKEN;
  if (!projectId || !token) throw new Error('SANITY_PROJECT_ID/SANITY_API_TOKEN fehlen');

  const client = createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false });

  console.log('[sanity] GROQ-Pull aller wp*-Docs ...');
  const result = await client.fetch(
    `{
      "hauptgeraete": *[_type == "wpHauptgeraet"]{ id, marke, serie, modell, preis, "Preis CHF": preis.preisChf },
      "komponenten_stamm": *[_type == "wpKomponenteStamm"]{ artNr, "Art.-Nr.": artNr, preisChf, "Preis CHF": preisChf, bezeichnung, kategorie },
      "komponenten_mapping": *[_type == "wpMapping"]{
        mapId,
        "Map-ID": mapId,
        "Geräte-ID": geraet->id,
        "Komponente Art.-Nr.": komponente->artNr,
        "Komponente Bezeichnung": komponente->bezeichnung,
        "Pflicht-Typ": pflichtTyp,
        "Gruppen-ID": gruppenId,
        "Default": default,
        "Bedingt_durch": bedingtDurch,
        "Menge": menge,
        "Einheit": einheit
      }
    }`
  );

  // Hauptgeraete: einheitliche ID-Spalte rebuilden
  result.hauptgeraete = result.hauptgeraete.map((h) => ({
    ID: h.id,
    Marke: h.marke,
    Serie: h.serie,
    Modell: h.modell,
    'Preis CHF': h.preis?.preisChf,
  }));

  console.log(
    `         hauptgeraete=${result.hauptgeraete.length} ` +
      `komponenten_stamm=${result.komponenten_stamm.length} ` +
      `komponenten_mapping=${result.komponenten_mapping.length}`
  );
  return result;
}

// ─── Test-Faelle ────────────────────────────────────────────────────

const TEST_CASES = [
  { id: 'BO-0001', userKonfig: {}, label: 'Default (alle Defaults)' },
  { id: 'PA-0001', userKonfig: { Aufstellort: 'Sockel', 'BWW-Funktion': true, Hydraulik: 'Trennspeicher' }, label: 'Sockel + BWW + Trennspeicher' },
];

function summarize(result, label) {
  return {
    label,
    geraet: `${result.geraet.ID} — ${result.geraet.Marke} ${result.geraet.Serie} ${result.geraet.Modell || ''}`.trim(),
    selectedCount: result.selected.length,
    summeKomp: result.summeKomponentenChf,
    summeGeraet: result.summeGeraetChf,
    summeTotal: result.summeTotalChf,
    artNrs: result.selected.map((m) => m['Komponente Art.-Nr.']).sort(),
  };
}

function compare(local, sanity) {
  const sameCount = local.selectedCount === sanity.selectedCount;
  const sameGeraet = Math.abs(local.summeGeraet - sanity.summeGeraet) < 0.01;
  const sameKomp = Math.abs(local.summeKomp - sanity.summeKomp) < 0.01;
  const sameTotal = Math.abs(local.summeTotal - sanity.summeTotal) < 0.01;
  const localSet = new Set(local.artNrs);
  const sanitySet = new Set(sanity.artNrs);
  const missingInSanity = local.artNrs.filter((a) => !sanitySet.has(a));
  const extraInSanity = sanity.artNrs.filter((a) => !localSet.has(a));
  return { sameCount, sameGeraet, sameKomp, sameTotal, missingInSanity, extraInSanity };
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('── Smoke-Test Sanity Round-Trip ──\n');

  if (!existsSync(JSON_PATH)) {
    console.error(`✗ JSON-Quelle nicht gefunden: ${JSON_PATH}`);
    process.exit(1);
  }
  const localDb = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  const sanityDb = useSanity ? await loadFromSanity() : null;

  let allOk = true;
  for (const tc of TEST_CASES) {
    console.log(`\n─── ${tc.id} | ${tc.label} ───`);
    console.log(`  user_konfig: ${JSON.stringify(tc.userKonfig)}`);

    const localRes = configure(localDb, tc.id, tc.userKonfig);
    const localSum = summarize(localRes, 'local');
    console.log(
      `  local : ${localSum.selectedCount} Komp · Geraet ${localSum.summeGeraet} CHF · Komp ${localSum.summeKomp} CHF · TOTAL ${localSum.summeTotal} CHF`
    );

    if (sanityDb) {
      const sanityRes = configure(sanityDb, tc.id, tc.userKonfig);
      const sanitySum = summarize(sanityRes, 'sanity');
      console.log(
        `  sanity: ${sanitySum.selectedCount} Komp · Geraet ${sanitySum.summeGeraet} CHF · Komp ${sanitySum.summeKomp} CHF · TOTAL ${sanitySum.summeTotal} CHF`
      );

      const cmp = compare(localSum, sanitySum);
      const ok = cmp.sameCount && cmp.sameGeraet && cmp.sameKomp && cmp.sameTotal;
      console.log(
        `  match : count=${cmp.sameCount?'✓':'✗'} geraet=${cmp.sameGeraet?'✓':'✗'} komp=${cmp.sameKomp?'✓':'✗'} total=${cmp.sameTotal?'✓':'✗'}`
      );
      if (cmp.missingInSanity.length) console.log(`    ! fehlen in Sanity: ${cmp.missingInSanity.join(', ')}`);
      if (cmp.extraInSanity.length) console.log(`    ! extra in Sanity:  ${cmp.extraInSanity.join(', ')}`);
      if (!ok) allOk = false;
    }
  }

  console.log('');
  if (sanityDb && allOk) console.log('✓ Round-Trip OK — Sanity-Output identisch zu Excel-JSON.');
  else if (sanityDb) console.log('✗ Round-Trip Mismatch — siehe oben.');
  else console.log('ℹ Lokaler Test fertig. Mit --sanity nach --push erneut starten fuer Round-Trip.');

  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('\n✗ Fehler:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
