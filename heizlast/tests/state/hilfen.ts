import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hydrateState } from '../../src/state/hydrate';
import type { State } from '../../src/state/schema';

export const KONTEXT = { id: 'p-test', jetzt: '2026-10-29T12:00:00.000Z' };

export function fixtureRoh(name: string): string {
  return readFileSync(join(__dirname, '..', 'fixtures', name), 'utf8');
}

/** Lädt eine eingefrorene Fixture über den einen Ladepfad (hydrateState). */
export function fixture(name: string): State {
  const h = hydrateState(fixtureRoh(name), KONTEXT);
  if (!h.ok) throw new Error(`${name}: ${h.text}`);
  if (h.probleme.length) throw new Error(`${name}: ${h.probleme.join('; ')}`);
  return h.state;
}

/** Feste Uhr und deterministische ids für Store-Tests. */
export function testOptionen() {
  let n = 0;
  let t = Date.UTC(2026, 9, 29, 12, 0, 0);
  return {
    uhr: () => new Date((t += 1000)).toISOString(),
    neueId: (p: string) => `${p}${++n}`,
  };
}
