#!/usr/bin/env node
// scripts/import-to-d1.mjs
//
// Liest einen Sanity-JSON-Export (aus Phase 0) und erzeugt ein SQL-File mit
// INSERT OR REPLACE-Statements, das anschliessend via wrangler gegen D1
// ausgefuehrt werden kann.
//
// Aufruf:
//   node scripts/import-to-d1.mjs <path-to-sanity-export.json> [--out migrations/0003_import_data.sql]
//
// Danach:
//   wrangler d1 execute thermowerk-data --file=migrations/0003_import_data.sql
//
// Erwartetes Eingabe-Format (Sanity export):
//   {
//     "contactSubmissions": [ { _id, name, email, phone, interest, message, submittedAt, status, notes }, ... ],
//     "heizlastProjects":   [ { _id, projectName, customerName, address, qhl, qh, ebf, stateJson, status, notes, createdAt, updatedAt }, ... ]
//   }
// Alternativ: ein Array von Sanity-Dokumenten mit _type-Feld (Standard sanity export).
// Das Script akzeptiert beide Formen.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node scripts/import-to-d1.mjs <sanity-export.json> [--out <file.sql>]');
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outIdx = args.indexOf('--out');
const outputPath = outIdx > -1
  ? path.resolve(args[outIdx + 1])
  : path.resolve('migrations/0003_import_data.sql');

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf-8');
let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to parse JSON: ${err.message}`);
  process.exit(1);
}

// Normalisieren: akzeptiert beide Eingabe-Formen
function normalise(input) {
  const contact = [];
  const heizlast = [];
  if (Array.isArray(input)) {
    for (const doc of input) {
      if (doc._type === 'contactSubmission') contact.push(doc);
      else if (doc._type === 'heizlastProject') heizlast.push(doc);
    }
  } else if (input && typeof input === 'object') {
    if (Array.isArray(input.contactSubmissions)) contact.push(...input.contactSubmissions);
    if (Array.isArray(input.heizlastProjects))   heizlast.push(...input.heizlastProjects);
  }
  return { contact, heizlast };
}

const { contact, heizlast } = normalise(data);

// SQL-Escape: einfache Anfuehrungszeichen verdoppeln, NULL bei undefined/null
function sqlStr(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlNum(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : 'NULL';
}

const lines = [];
lines.push('-- Auto-generated import from Sanity JSON export');
lines.push(`-- Source: ${path.basename(inputPath)}`);
lines.push(`-- Generated: ${new Date().toISOString()}`);
lines.push(`-- Counts: contact=${contact.length}, heizlast=${heizlast.length}`);
lines.push('');
lines.push('BEGIN TRANSACTION;');
lines.push('');

// contact_submission: AUTOINCREMENT-id, wir ignorieren das Sanity-_id
for (const c of contact) {
  lines.push(
    `INSERT INTO contact_submission (name, email, phone, interest, message, submitted_at, status, notes) VALUES (`
    + `${sqlStr(c.name)}, ${sqlStr(c.email)}, ${sqlStr(c.phone)}, ${sqlStr(c.interest)}, `
    + `${sqlStr(c.message)}, ${sqlStr(c.submittedAt || new Date().toISOString())}, `
    + `${sqlStr(c.status || 'neu')}, ${sqlStr(c.notes)}`
    + `);`
  );
}

if (contact.length) lines.push('');

// heizlast_project: nutzt Sanity-_id als Primary Key → idempotent via REPLACE
for (const h of heizlast) {
  lines.push(
    `INSERT OR REPLACE INTO heizlast_project (id, project_name, customer_name, address, qhl, qh, ebf, state_json, status, notes, created_at, updated_at) VALUES (`
    + `${sqlStr(h._id)}, ${sqlStr(h.projectName || 'Unbenannt')}, ${sqlStr(h.customerName)}, `
    + `${sqlStr(h.address)}, ${sqlNum(h.qhl)}, ${sqlNum(h.qh)}, ${sqlNum(h.ebf)}, `
    + `${sqlStr(h.stateJson || '{}')}, ${sqlStr(h.status || 'arbeit')}, ${sqlStr(h.notes)}, `
    + `${sqlStr(h.createdAt || new Date().toISOString())}, ${sqlStr(h.updatedAt || new Date().toISOString())}`
    + `);`
  );
}

lines.push('');
lines.push('COMMIT;');
lines.push('');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');

console.log(`Wrote ${outputPath}`);
console.log(`  contact_submission rows: ${contact.length}`);
console.log(`  heizlast_project   rows: ${heizlast.length}`);
console.log('');
console.log('Next:');
console.log(`  wrangler d1 execute thermowerk-data --file=${path.relative(process.cwd(), outputPath)}`);
