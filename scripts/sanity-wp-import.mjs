#!/usr/bin/env node
/**
 * Sanity-Import — WP-Datenbank v1.0
 * Source-of-Truth: Review_WP_Datenbank_v0.2/Datenbank_Waermepumpen_v1.0.xlsx
 *
 * Aufruf:
 *   node scripts/sanity-wp-import.mjs                  # Dry-Run NDJSON
 *   node scripts/sanity-wp-import.mjs --push           # Push createOrReplace
 *   node scripts/sanity-wp-import.mjs --push --pdfs    # + PDF-Asset-Upload
 *   node scripts/sanity-wp-import.mjs --push --replace # vorher alle wp*-Docs loeschen
 */

import { readFileSync, writeFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { createClient } from '@sanity/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
dotenvConfig({ path: join(PROJECT_ROOT, '.env') });

const DEFAULT_DB_ROOT = 'C:\\Users\\Daniel\\Documents\\Thermowerk\\Review_WP_Datenbank_v0.2';
const DB_ROOT = process.env.WP_DB_ROOT || DEFAULT_DB_ROOT;
const JSON_PATH = join(DB_ROOT, '04_Tool_Uebernahme', 'datenbank_export_v1.0.json');
const PDF_DIR = join(DB_ROOT, '02_Datenblätter');
const NDJSON_OUT = join(PROJECT_ROOT, 'scripts', '_sanity-wp-import.ndjson');
const REPORT_OUT = join(PROJECT_ROOT, 'scripts', '_sanity-wp-import-report.txt');

const argv = process.argv.slice(2);
const flags = {
  push: argv.includes('--push'),
  pdfs: argv.includes('--pdfs'),
  replace: argv.includes('--replace'),
};

const numOrNull = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : null);
const strOrNull = (v) => (v == null || v === '' ? null : String(v));
const dropNulls = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined));

const geraetSanityId = (id) => `wp-hauptgeraet-${id}`;
const komponenteSanityId = (artNr) => `wp-komponente-${String(artNr).replace(/\./g, '-')}`;
const mappingSanityId = (mapId) => `wp-mapping-${mapId}`;
const konfigVariableSanityId = (n) => `wp-konfig-${n}`;
const datenblattSanityId = (f) => `wp-datenblatt-${f.replace(/_/g, '-')}`;
const ref = (id) => ({ _type: 'reference', _ref: id });

function mapHauptgeraet(g) {
  return dropNulls({
    _id: geraetSanityId(g.ID),
    _type: 'wpHauptgeraet',
    id: g.ID,
    marke: strOrNull(g.Marke),
    serie: strOrNull(g.Serie),
    modell: strOrNull(g.Modell),
    variante: strOrNull(g['Variante (Inneneinheit)']),
    bauformFamilie: g['Bauform-Familie'] ? ref(datenblattSanityId(g['Bauform-Familie'])) : null,
    aufstellung: strOrNull(g.Aufstellung),
    stromversorgung: strOrNull(g.Stromversorgung),
    leistung: dropNulls({
      heizleistungA7W35: numOrNull(g['Heizleistung A-7/W35 [kW]']),
      copA7W35: numOrNull(g['COP A-7/W35']),
      copA2W35: numOrNull(g['COP A2/W35']),
      scop: strOrNull(g.SCOP),
      vorlaufMax: numOrNull(g['Vorlauf max. [°C]']),
      einsatzgrenzeLuftMin: numOrNull(g['Einsatzgrenze Luft min [°C]']),
      einsatzgrenzeLuftMax: numOrNull(g['Einsatzgrenze Luft max [°C]']),
      effizienzklasseVL35: strOrNull(g['Effizienzklasse VL35']),
      effizienzklasseVL55: strOrNull(g['Effizienzklasse VL55']),
      aufnahmeleistungA2W35: numOrNull(g['Aufnahmeleistung A2/W35 [kW]']),
      anlaufstrom: numOrNull(g['Anlaufstrom [A]']),
      absicherung: strOrNull(g.Absicherung),
    }),
    kaeltemittel: dropNulls({
      typ: strOrNull(g['Kältemittel']),
      fuellmenge: numOrNull(g['Kältemittel-Füllmenge [kg]']),
      co2Aequivalent: numOrNull(g['CO2-Äquivalent [t]']),
    }),
    schall: dropNulls({
      erp: numOrNull(g['Schall ErP [dB(A)]']),
      tagMax: numOrNull(g['Schall Tag max [dB(A)]']),
      nachtMax: strOrNull(g['Schall Nacht max [dB(A)]']),
    }),
    masse: dropNulls({
      aussenHxBxT: strOrNull(g['Aussenmasse HxBxT [mm]']),
      gewichtAussen: numOrNull(g['Gewicht Aussen [kg]']),
      heizungsanschluss: strOrNull(g['Heizungsanschluss']),
      mindestPufferspeicher: numOrNull(g['Mindest-Pufferspeicher [L]']),
    }),
    preis: dropNulls({
      artNr: strOrNull(g['Art.-Nr.']),
      rabattgruppe: strOrNull(g['Rabattgruppe']),
      preisChf: numOrNull(g['Preis CHF']),
      katalogseite: numOrNull(g['Katalogseite']),
    }),
    verifizierung: dropNulls({
      quellePdfSeite: numOrNull(g['Quelle PDF-Seite']),
      verifiziertAm: strOrNull(g['Verifiziert am']),
      verifiziertVon: strOrNull(g['Verifiziert von']),
    }),
    lieferumfang: strOrNull(g['Im Lieferumfang (Inneneinheit)']),
    bemerkung: strOrNull(g.Bemerkung),
  });
}

function mapKomponenteStamm(k) {
  const bezeichnung = String(k.Bezeichnung || '');
  const deprecated = /\[DEPRECATED\b/i.test(bezeichnung);
  const bauseits =
    /^BAUSEITS-/i.test(String(k['Art.-Nr.'] || '')) || bezeichnung.toLowerCase().includes('bauseits');
  return dropNulls({
    _id: komponenteSanityId(k['Art.-Nr.']),
    _type: 'wpKomponenteStamm',
    artNr: String(k['Art.-Nr.']),
    kategorie: strOrNull(k.Kategorie),
    bezeichnung,
    variante: strOrNull(k.Variante),
    rabattgruppe: strOrNull(k.Rabattgruppe),
    preisChf: numOrNull(k['Preis CHF']),
    einheit: strOrNull(k.Einheit),
    markeUniversal: strOrNull(k['Marke/Universal']),
    katalogseite: numOrNull(k.Katalogseite),
    quellePdfSeite: numOrNull(k['Quelle PDF-Seite']),
    verifiziertAm: strOrNull(k['Verifiziert am']),
    bemerkung: strOrNull(k.Bemerkung),
    deprecated,
    bauseits,
  });
}

function mapMapping(m) {
  return dropNulls({
    _id: mappingSanityId(m['Map-ID']),
    _type: 'wpMapping',
    mapId: m['Map-ID'],
    geraet: ref(geraetSanityId(m['Geräte-ID'])),
    komponente: ref(komponenteSanityId(m['Komponente Art.-Nr.'])),
    pflichtTyp: strOrNull(m['Pflicht-Typ']),
    gruppenId: strOrNull(m['Gruppen-ID']),
    minAuswahl: numOrNull(m['Min-Auswahl']),
    maxAuswahl: numOrNull(m['Max-Auswahl']),
    default: strOrNull(m['Default']),
    bedingtDurch: strOrNull(m['Bedingt_durch']),
    menge: numOrNull(m['Menge']),
    einheit: strOrNull(m['Einheit']),
    preisChfVlookup: numOrNull(m['Preis CHF (VLOOKUP)']),
    bemerkung: strOrNull(m.Bemerkung),
  });
}

function mapKonfigVariable(v) {
  return dropNulls({
    _id: konfigVariableSanityId(v.Variable),
    _type: 'wpKonfigVariable',
    variable: v.Variable,
    typ: strOrNull(v.Typ),
    werteWertebereich: strOrNull(v['Werte / Wertebereich']),
    beschreibung: strOrNull(v.Beschreibung),
    beispielVerwendung: strOrNull(v['Beispiel-Verwendung in Bedingt_durch']),
  });
}

function mapDatenblatt(d) {
  const ids = parseGeraeteIds(String(d['Abdeckt Geräte (IDs)'] || ''));
  return dropNulls({
    _id: datenblattSanityId(d['Bauform-Familie']),
    _type: 'wpDatenblatt',
    bauformFamilie: d['Bauform-Familie'],
    modellVorlauf: numOrNull(d['Modell-Vorlauf [°C]']),
    abdecktGeraete: ids.length
      ? ids.map((id, idx) => ({ _key: `g${idx}`, ...ref(geraetSanityId(id)) }))
      : null,
    katalogSeitenbereich: strOrNull(d['Katalog-Seitenbereich (Druck)']),
    pdfSeitenbereich: strOrNull(d['PDF-Seitenbereich']),
    inhalt: strOrNull(d.Inhalt),
    bemerkung: strOrNull(d.Bemerkung),
    _meta_pdfDatei: strOrNull(d['Datenblatt-Datei']),
  });
}

function parseGeraeteIds(raw) {
  if (!raw) return [];
  const result = new Set();
  for (const segment of raw.split(/[,;]/)) {
    const seg = segment.trim();
    const m = seg.match(/^([A-Z]{2})-(\d{4})\s+bis\s+([A-Z]{2})-(\d{4})$/);
    if (m && m[1] === m[3]) {
      const start = parseInt(m[2], 10);
      const end = parseInt(m[4], 10);
      for (let i = start; i <= end; i++) {
        result.add(`${m[1]}-${String(i).padStart(4, '0')}`);
      }
    } else if (/^[A-Z]{2}-\d{4}$/.test(seg)) {
      result.add(seg);
    } else if (seg) {
      console.warn(`[parseGeraeteIds] unbekanntes Format: "${seg}"`);
    }
  }
  return [...result].sort();
}

function buildNdjson() {
  if (!existsSync(JSON_PATH)) {
    console.error(`✗ JSON-Quelle nicht gefunden: ${JSON_PATH}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  console.log(`[json] ${JSON_PATH} (${(statSync(JSON_PATH).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`       version=${data._meta?.version} preise_stand=${data._meta?.preise_stand}`);

  const warnings = [];
  const docs = [];

  data.datenblaetter.forEach((d) => docs.push(mapDatenblatt(d)));
  const datenblattIds = new Set(docs.filter((d) => d._type === 'wpDatenblatt').map((d) => d._id));

  data.hauptgeraete.forEach((g) => {
    const doc = mapHauptgeraet(g);
    if (doc.bauformFamilie && !datenblattIds.has(doc.bauformFamilie._ref)) {
      warnings.push(`HG ${doc.id}: bauformFamilie="${g['Bauform-Familie']}" hat kein Datenblatt — ref entfernt`);
      delete doc.bauformFamilie;
    }
    docs.push(doc);
  });
  const hauptgeraetIds = new Set(docs.filter((d) => d._type === 'wpHauptgeraet').map((d) => d._id));

  const seenKompIds = new Map();
  data.komponenten_stamm.forEach((k) => {
    const doc = mapKomponenteStamm(k);
    const baseId = doc._id;
    if (seenKompIds.has(baseId)) {
      const count = seenKompIds.get(baseId) + 1;
      seenKompIds.set(baseId, count);
      const newId = `${baseId}-dup${count}`;
      warnings.push(`KOMP duplicate Art.-Nr. ${k['Art.-Nr.']}: zweites Vorkommen → ${newId}`);
      doc._id = newId;
      doc.bemerkung = `[Doppelt vergebene Art.-Nr. ${k['Art.-Nr.']} — siehe ${baseId}] ${doc.bemerkung || ''}`.trim();
    } else {
      seenKompIds.set(baseId, 1);
    }
    docs.push(doc);
  });
  const komponenteIds = new Set(docs.filter((d) => d._type === 'wpKomponenteStamm').map((d) => d._id));

  data.komponenten_mapping.forEach((m) => {
    const doc = mapMapping(m);
    if (doc.geraet && !hauptgeraetIds.has(doc.geraet._ref)) {
      warnings.push(`MAP ${doc.mapId}: Geraet ref "${doc.geraet._ref}" nicht gefunden — Mapping uebersprungen`);
      return;
    }
    if (doc.komponente && !komponenteIds.has(doc.komponente._ref)) {
      warnings.push(`MAP ${doc.mapId}: Komponente ref "${doc.komponente._ref}" nicht gefunden — Mapping uebersprungen`);
      return;
    }
    docs.push(doc);
  });

  data.konfig_variablen.forEach((v) => docs.push(mapKonfigVariable(v)));

  const ndjson = docs.map((d) => JSON.stringify(d)).join('\n') + '\n';
  writeFileSync(NDJSON_OUT, ndjson);
  console.log(`[ndjson] ${NDJSON_OUT} (${(ndjson.length / 1024 / 1024).toFixed(2)} MB, ${docs.length} Docs)`);

  const counts = {};
  for (const d of docs) counts[d._type] = (counts[d._type] || 0) + 1;
  console.log(
    `         wpHauptgeraet=${counts.wpHauptgeraet} wpKomponenteStamm=${counts.wpKomponenteStamm} ` +
    `wpMapping=${counts.wpMapping} wpKonfigVariable=${counts.wpKonfigVariable} wpDatenblatt=${counts.wpDatenblatt}`
  );

  if (warnings.length) {
    writeFileSync(
      REPORT_OUT,
      `Import-Report ${new Date().toISOString()}\nQuelle: ${JSON_PATH}\n\n${warnings.length} Warnungen:\n` +
      warnings.map((w) => `  ${w}`).join('\n') + '\n'
    );
    console.log(`\n[warnings] ${warnings.length} Warnungen → ${REPORT_OUT}`);
    warnings.slice(0, 8).forEach((w) => console.log(`  ${w}`));
    if (warnings.length > 8) console.log(`  ... +${warnings.length - 8} weitere im Report`);
  }
  return docs;
}

function getClient() {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || 'production';
  const token = process.env.SANITY_API_TOKEN;
  if (!projectId) throw new Error('SANITY_PROJECT_ID fehlt im Environment');
  if (!token) throw new Error('SANITY_API_TOKEN fehlt im Environment');
  return createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false });
}

async function deleteAllWpDocs(client) {
  console.log('[replace] Loesche alle wp*-Docs...');
  const types = ['wpMapping', 'wpHauptgeraet', 'wpKomponenteStamm', 'wpDatenblatt', 'wpKonfigVariable'];
  for (const t of types) {
    const ids = await client.fetch('*[_type == $t]._id', { t });
    console.log(`  ${t}: ${ids.length} Docs`);
    for (let i = 0; i < ids.length; i += 250) {
      const batch = ids.slice(i, i + 250);
      const tx = client.transaction();
      batch.flatMap((id) => [id, `drafts.${id}`]).forEach((id) => tx.delete(id));
      await tx.commit({ visibility: 'async' }).catch((e) => console.warn(`  Warn: ${e.message?.slice(0, 200)}`));
    }
  }
}

async function pushDocs(client, docs) {
  console.log(`[push] ${docs.length} Docs via createOrReplace ...`);
  const cleaned = docs.map(({ _meta_pdfDatei, ...rest }) => rest);
  const BATCH = 100;
  let done = 0;
  for (let i = 0; i < cleaned.length; i += BATCH) {
    const batch = cleaned.slice(i, i + BATCH);
    const tx = client.transaction();
    batch.forEach((d) => tx.createOrReplace(d));
    await tx.commit({ visibility: 'async' });
    done += batch.length;
    process.stdout.write(`\r  ${done}/${cleaned.length}`);
  }
  process.stdout.write('\n');
  console.log('[push] OK');
}

async function uploadPdfs(client, datenblattDocs) {
  if (!existsSync(PDF_DIR)) {
    console.warn(`[pdfs] Ordner nicht gefunden: ${PDF_DIR}`);
    return;
  }
  console.log(`[pdfs] Upload aus ${PDF_DIR} ...`);
  let ok = 0, skipped = 0;
  for (const d of datenblattDocs) {
    if (!d._meta_pdfDatei) { skipped++; continue; }
    const pdfPath = join(PDF_DIR, d._meta_pdfDatei);
    if (!existsSync(pdfPath)) {
      console.warn(`  ${d._id}: PDF nicht gefunden: ${pdfPath}`);
      skipped++;
      continue;
    }
    const stream = createReadStream(pdfPath);
    const asset = await client.assets.upload('file', stream, {
      filename: basename(pdfPath),
      contentType: 'application/pdf',
    });
    await client.patch(d._id).set({
      datenblattDatei: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } }
    }).commit({ visibility: 'async' });
    ok++;
    console.log(`  ✓ ${basename(pdfPath)} → ${d._id}`);
  }
  console.log(`[pdfs] ${ok} hochgeladen, ${skipped} uebersprungen`);
}

async function main() {
  console.log('── Sanity-WP-Import v1.0 ──');
  console.log(`   Project: ${process.env.SANITY_PROJECT_ID || '(env fehlt)'}`);
  console.log(`   Dataset: ${process.env.SANITY_DATASET || 'production'}`);
  console.log(`   Modus:   ${flags.push ? 'PUSH' : 'DRY-RUN'}${flags.replace ? ' + REPLACE' : ''}${flags.pdfs ? ' + PDFs' : ''}`);
  console.log('');

  const docs = buildNdjson();

  if (!flags.push) {
    console.log('\n[dry-run] kein Push. Mit --push erneut aufrufen, um Daten in Sanity zu schreiben.');
    process.exit(0);
  }

  const client = getClient();
  if (flags.replace) await deleteAllWpDocs(client);
  await pushDocs(client, docs);

  if (flags.pdfs) {
    const datenblattDocs = docs.filter((d) => d._type === 'wpDatenblatt');
    await uploadPdfs(client, datenblattDocs);
  }

  console.log('\n✓ Import fertig.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ Fehler:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
