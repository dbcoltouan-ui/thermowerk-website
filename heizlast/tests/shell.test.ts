import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SCHRITTE, sichtbareSchritte } from '../src/ui/schritte';
import { SCHRITT_IDS, schrittRelevant } from '../src/kern/relevanz';
import { neuerState } from '../src/state/schema';
import type { Methode } from '../src/state/schema';

/** Sichtbare Schritte wie in der App: Relevanz aus dem Kern. */
const sicht = (m: Methode | null) => {
  const s = { ...neuerState({ id: 't', jetzt: '2026-10-29T00:00:00.000Z' }), methode: m };
  return sichtbareSchritte(SCHRITT_IDS.filter((id) => schrittRelevant(id, s)));
};
import { eingabe, istAnnahme } from '../src/kern/wert';

describe('Schrittdefinitionen', () => {
  it('zeigt ohne Methode nur modusunabhängige Schritte', () => {
    const ids = sicht(null).map((s) => s.id);
    expect(ids).not.toContain('verbrauch');
    expect(ids).not.toContain('huelle');
    expect(ids[0]).toBe('projekt');
  });

  it('zeigt je Modus genau eine Variante von Schritt 3', () => {
    expect(sicht('fws').map((s) => s.id)).toContain('verbrauch');
    expect(sicht('fws').map((s) => s.id)).not.toContain('huelle');
    expect(sicht('raumweise').map((s) => s.id)).toContain('huelle');
    expect(sicht('raumweise').map((s) => s.id)).not.toContain('verbrauch');
  });

  it('nummeriert sichtbare Schritte lückenlos 0…10', () => {
    for (const m of ['fws', 'raumweise'] as const) {
      expect(sicht(m).map((s) => s.nr)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
    expect(new Set(SCHRITTE.map((s) => s.id)).size).toBe(SCHRITTE.length);
  });
});

describe('Herkunftsmodell', () => {
  it('Eingaben sind keine Annahmen', () => {
    expect(istAnnahme(eingabe(1965, 'a'))).toBe(false);
    expect(istAnnahme({ wert: 1.2, einheit: 'W/m²K', herkunft: 'fallback', begruendung: 'Epoche' })).toBe(true);
  });
});

/** Schichtregel (KONTEXT §2): der Kern importiert nie aus ui/bericht — zusätzlich zur eslint-Regel. */
describe('Schichten', () => {
  const kern = join(__dirname, '..', 'src', 'kern');
  const dateien = (dir: string): string[] =>
    readdirSync(dir).flatMap((n: string) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? dateien(p) : /\.tsx?$/.test(n) ? [p] : [];
    });
  it('src/kern importiert nicht aus src/ui, src/bericht oder preact', () => {
    for (const f of dateien(kern)) {
      const quelle = readFileSync(f, 'utf8');
      expect(quelle, f).not.toMatch(/from\s+['"][^'"]*\/(ui|bericht)\//);
      expect(quelle, f).not.toMatch(/from\s+['"]@?preact/);
    }
  });
});
