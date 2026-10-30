/**
 * D1-Schema (Session 10): Migration `migrations/0003_heizlast_neu.sql` und die Anweisungen, mit denen die
 * Functions die Tabellen beim ersten Zugriff anlegen, sind identisch (eine Quelle); beide idempotent; das
 * Schema der Projekte nutzt dieselbe Schemaversion wie der Client.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SCHEMA_ANWEISUNGEN, stelleSchemaSicher } from '../../../functions/_lib/heizlast-schema.js';
import { SCHEMA_VERSION as VERSION_SCHEMA } from '../../src/state/schema';
import { SCHEMA_VERSION } from '../../src/state/version';
import { d1 } from './hilfen';

const SQL = readFileSync(fileURLToPath(new URL('../../../migrations/0003_heizlast_neu.sql', import.meta.url)), 'utf8');
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const ausDatei = SQL.split('\n')
  .filter((z) => !z.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map(norm)
  .filter(Boolean);

describe('D1-Schema eine Quelle', () => {
  it('Migration = Anweisungen der Functions (gleiche Reihenfolge, gleicher Text)', () => {
    expect(ausDatei).toEqual(SCHEMA_ANWEISUNGEN.map(norm));
  });
  it('idempotent: zweimal ausführen schadet nicht; Tabellen und Indizes vorhanden', async () => {
    const db = d1();
    db.roh.exec(SQL);
    db.roh.exec(SQL);
    await stelleSchemaSicher(db);
    const namen = (db.roh.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>).map((r) => r.name);
    expect(namen).toEqual(['heizlast_projekt', 'heizlast_sitzung', 'idx_heizlast_projekt_name', 'idx_heizlast_projekt_updated', 'idx_heizlast_sitzung_ablauf', 'idx_login_attempts_key', 'login_attempts']);
  });
  it('Spalte schema_version vorhanden; altes heizlast_project bleibt unberührt', () => {
    expect(SQL).toMatch(/schema_version\s+INTEGER NOT NULL/);
    expect(SQL).not.toMatch(/DROP|ALTER TABLE heizlast_project/i);
  });
  it('Server und Client teilen die Schemaversion', () => {
    expect(SCHEMA_VERSION).toBe(VERSION_SCHEMA);
  });
});
