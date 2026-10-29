import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Gemeinsame Konvention aller Fachdaten (KONTEXT §2 «Daten»): `_meta { version, stand, quellen[] }`, jede Quelle mit id + titel. */
const DATA = join(__dirname, '..', '..', 'data');
const DATEIEN = readdirSync(DATA).filter((n) => n.endsWith('.json'));

type Quelle = { id: string; titel: string; art?: string; url?: string };
type Meta = { version: string; stand: string; beschreibung?: string; quellen: Quelle[] };

export function ladeJson<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(join(DATA, name), 'utf8')) as T;
}

/** Sammelt rekursiv alle `quelle`-Verweise (Arrays von IDs) in einem Objekt. */
export function quellenVerweise(o: unknown, acc: string[] = []): string[] {
  if (Array.isArray(o)) o.forEach((v) => quellenVerweise(v, acc));
  else if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (k === 'quelle' && Array.isArray(v)) acc.push(...(v as string[]));
      else quellenVerweise(v, acc);
    }
  }
  return acc;
}

describe('data/*.json — Meta-Konvention', () => {
  it('es gibt die sechs Dateien der Session 2', () => {
    for (const n of ['klimastationen.json', 'huelle-epochen.json', 'sia384-2.json', 'fws.json', 'heizkoerper-tabellen.json', 'waermepumpen.json']) {
      expect(DATEIEN, n).toContain(n);
    }
  });

  for (const n of DATEIEN) {
    it(`${n}: _meta vollständig, Quellen-IDs eindeutig, alle quelle-Verweise auflösbar`, () => {
      const d = ladeJson<{ _meta: Meta }>(n);
      expect(d._meta).toBeDefined();
      expect(d._meta.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(d._meta.stand).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(d._meta.quellen)).toBe(true);
      expect(d._meta.quellen.length).toBeGreaterThan(0);
      const ids = d._meta.quellen.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const q of d._meta.quellen) {
        expect(q.titel, q.id).toBeTruthy();
      }
      const verweise = quellenVerweise(d);
      for (const v of verweise) expect(ids, `${n}: Quelle «${v}» nicht in _meta.quellen`).toContain(v);
    });

    it(`${n}: kein Eszett und keine ae/oe/ue-Umschreibung in sichtbaren Texten`, () => {
      const text = readFileSync(join(DATA, n), 'utf8');
      expect(text).not.toMatch(new RegExp(String.fromCharCode(0xdf)));
      // Stichprobe häufiger Umschreibungen in Werten (Schlüssel bleiben ASCII)
      const werte = (text.match(/:\s*"[^"]*"/g) ?? []).filter((w) => !/https?:\/\//.test(w));
      const verdaechtig = werte.filter((w) => /\b(Waerme|Gebaeude|fuer|Laenge|Hoehe|Heizoel|Lueft|Daemm|Kaelte)\w*/.test(w));
      expect(verdaechtig, verdaechtig.slice(0, 5).join('\n')).toHaveLength(0);
    });
  }
});
