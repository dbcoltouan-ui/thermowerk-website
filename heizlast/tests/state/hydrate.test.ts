/**
 * Ein Ladepfad (hydrateState) mit versionierter Migrationskette und Validierung (FLOW-03/04, BUILD-11).
 * Fixtures sind eingefroren (tests/fixtures/*.json) — sie dürfen nicht an neue Schemas angepasst werden;
 * neue Versionen bekommen eine Migration und eine neue Fixture.
 */
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../src/daten/index';
import { berechne } from '../../src/kern/berechne';
import { erkenneVersion, hydrateState, MIGRATIONEN } from '../../src/state/hydrate';
import { neuerState, normalisiereState, SCHEMA_VERSION } from '../../src/state/schema';
import { fixtureRoh, KONTEXT } from './hilfen';

describe('Migration v1 → v2 (Shell-Entwurf Session 1)', () => {
  const h = hydrateState(fixtureRoh('state-v1-shell.json'), KONTEXT);

  it('übernimmt Projektname und Methode, protokolliert jeden Schritt', () => {
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.vonVersion).toBe(1);
    expect(h.state.meta.schemaVersion).toBe(2);
    expect(h.state.projekt.name).toBe('EFH Muster, Bern');
    expect(h.state.methode).toBe('raumweise');
    expect(h.protokoll[0]).toContain('v1 → v2');
    expect(h.protokoll.join(' ')).toContain('EFH Muster, Bern');
    expect(h.probleme).toEqual([]);
  });

  it('Ergebnis ist ein gültiger, rechenbarer v2-State (alles andere Standard)', () => {
    if (!h.ok) throw new Error('nicht ok');
    const { meta: _m1, projekt: _p1, methode: _x1, ...rest } = h.state;
    const { meta: _m2, projekt: _p2, methode: _x2, ...leer } = neuerState(KONTEXT);
    expect(rest).toEqual(leer);
    expect(() => berechne(h.state, alleDaten())).not.toThrow();
  });

  it('Kette deckt alle Versionen bis zur aktuellen ab', () => {
    for (let v = 1; v < SCHEMA_VERSION; v++) expect(MIGRATIONEN[v], `Migration ${v} → ${v + 1}`).toBeTypeOf('function');
  });
});

describe('v2-Fixtures: Validierung ist verlustfrei für gültige Stände', () => {
  for (const name of ['state-v2-fws-moosseedorf.json', 'state-v2-raumweise-efh.json']) {
    it(`${name}: normalisiereState(fixture) = fixture (Schema-Spezifikation vollständig)`, () => {
      const roh = JSON.parse(fixtureRoh(name));
      const { state, probleme } = normalisiereState(roh, KONTEXT);
      expect(probleme).toEqual([]);
      expect(state).toEqual(roh);
      // Rundlauf über JSON
      const h = hydrateState(JSON.stringify(state), KONTEXT);
      expect(h.ok && h.state).toEqual(roh);
    });
  }
});

describe('Ablehnung und Fehlertoleranz', () => {
  it('Projekte des alten Tools werden mit klarer Meldung abgelehnt', () => {
    const h = hydrateState({ objekt: { ebf: 150 }, heizung: { verbrauch: [] } }, KONTEXT);
    expect(h).toMatchObject({ ok: false, grund: 'altesTool' });
    expect(erkenneVersion({ detail: { aktiv: true } })).toBe('altesTool');
  });

  it('neuere Schemaversion, kaputtes JSON und Fremdformat werden abgelehnt, nie geworfen', () => {
    expect(hydrateState({ meta: { schemaVersion: SCHEMA_VERSION + 1 } }, KONTEXT)).toMatchObject({ ok: false, grund: 'neuereVersion' });
    expect(hydrateState('{kaputt', KONTEXT)).toMatchObject({ ok: false, grund: 'unlesbar' });
    expect(hydrateState([1, 2, 3], KONTEXT)).toMatchObject({ ok: false, grund: 'unlesbar' });
    expect(hydrateState({ foo: 1 }, KONTEXT)).toMatchObject({ ok: false, grund: 'unlesbar' });
  });

  it('falsche Typen werden verworfen und protokolliert, der Rest bleibt', () => {
    const roh = JSON.parse(fixtureRoh('state-v2-fws-moosseedorf.json'));
    roh.gebaeude.baujahr = 'neunzehnhundert';
    roh.verbrauch.eintraege.push({ id: 'v2', energietraeger: 'kohle', menge: 5 });
    roh.verbrauch.eintraege.push({ energietraeger: 'erdgas', menge: 5 });
    roh.raeume = [{ id: 'r1', name: 'A', typ: 'wohnen', bauteile: [{ id: 'b1', flaecheM2: 'x', anschluss: { art: 'mond' } }] }];
    roh.waermeabgabe.raeume = { r1: { heizflaechen: [{ id: 'h1', bauart: 'kachelofen' }, { id: 'h2', bauart: 'platte_22', hoeheMm: 600, typenschild: { qNW: 1000 } }] } };
    roh.methode = 'bauchgefuehl';
    roh.unbekannt = 42;
    const h = hydrateState(roh, KONTEXT);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.state.gebaeude.baujahr).toBeUndefined();
    expect(h.state.verbrauch.eintraege.map((e) => e.id)).toEqual(['v1']);
    expect(h.state.raeume[0]!.bauteile[0]).toMatchObject({ flaecheM2: 0, anschluss: { art: 'aussen' } });
    expect(h.state.waermeabgabe.raeume.r1!.heizflaechen).toEqual([{ id: 'h2', bauart: 'platte_22', hoeheMm: 600 }]);
    expect(h.state.methode).toBeNull();
    expect('unbekannt' in h.state).toBe(false);
    const p = h.probleme.join('\n');
    for (const t of ['gebaeude.baujahr', 'energietraeger', 'ohne id', 'flaecheM2', 'Anschluss', 'kachelofen', 'Typenschild', 'methode']) expect(p).toContain(t);
  });

  it('doppelte ids in Listen werden verworfen (stabile Referenzen)', () => {
    const roh = JSON.parse(fixtureRoh('state-v2-raumweise-efh.json'));
    roh.raeume.push({ ...roh.raeume[0] });
    const h = hydrateState(roh, KONTEXT);
    expect(h.ok && h.state.raeume.length).toBe(3);
    expect(h.ok && h.probleme.join(' ')).toContain('doppelt');
  });
});
