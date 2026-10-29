import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SCHRITTE, sichtbareSchritte } from '../src/ui/schritte';
import { eingabe, istAnnahme } from '../src/kern/wert';

describe('Schrittdefinitionen', () => {
  it('zeigt ohne Methode nur modusunabhängige Schritte', () => {
    const ids = sichtbareSchritte(null).map((s) => s.id);
    expect(ids).not.toContain('verbrauch');
    expect(ids).not.toContain('huelle');
    expect(ids[0]).toBe('projekt');
  });

  it('zeigt je Modus genau eine Variante von Schritt 3', () => {
    expect(sichtbareSchritte('fws').map((s) => s.id)).toContain('verbrauch');
    expect(sichtbareSchritte('fws').map((s) => s.id)).not.toContain('huelle');
    expect(sichtbareSchritte('raumweise').map((s) => s.id)).toContain('huelle');
    expect(sichtbareSchritte('raumweise').map((s) => s.id)).not.toContain('verbrauch');
  });

  it('nummeriert sichtbare Schritte lückenlos 0…10', () => {
    for (const m of ['fws', 'raumweise'] as const) {
      expect(sichtbareSchritte(m).map((s) => s.nr)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
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
