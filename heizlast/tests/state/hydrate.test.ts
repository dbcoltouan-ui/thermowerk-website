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
    expect(h.state.meta.schemaVersion).toBe(SCHEMA_VERSION);
    expect(h.state.projekt.name).toBe('EFH Muster, Bern');
    expect(h.state.methode).toBe('raumweise');
    expect(h.protokoll[0]).toContain('v1 → v2');
    expect(h.protokoll.some((z) => z.includes('v2 → v3'))).toBe(true);
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

describe('Migration v2 → v3 → v4 (Session 7b: Verbrauchsreihen; Session 8: ohne Zusatzmodule)', () => {
  it('Moosseedorf v2 (eintraege) ergibt denselben State wie die v4-Fixture (reihen, ohne zusatz), Ergebnis identisch', () => {
    const h = hydrateState(fixtureRoh('state-v2-fws-moosseedorf.json'), KONTEXT);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.vonVersion).toBe(2);
    expect(h.protokoll.join(' ')).toContain('1 Verbrauchseinträge → 1 Reihe(n): erdgas (1)');
    expect(h.probleme).toEqual([]);
    expect(h.state).toEqual(JSON.parse(fixtureRoh('state-v4-fws-moosseedorf.json')));
    const e2 = berechne(h.state, alleDaten());
    const e3 = berechne(JSON.parse(fixtureRoh('state-v4-fws-moosseedorf.json')) as never, alleDaten());
    expect(e2.zuschlaege.qh?.wert).toBeCloseTo(e3.zuschlaege.qh!.wert, 6);
  });

  it('raumweise v2 (explizite Arten/Anschlüsse) bleibt gültig und rechnet unverändert', () => {
    const h = hydrateState(fixtureRoh('state-v2-raumweise-efh.json'), KONTEXT);
    expect(h.ok && h.probleme).toEqual([]);
    if (!h.ok) return;
    expect(h.state.verbrauch.reihen).toEqual([]);
    expect(h.state.raeume[2]!.bauteile[0]).toMatchObject({ art: 'dachSteil', anschluss: { art: 'aussen' } });
    const e = berechne(h.state, alleDaten());
    expect(e.heizlast.massgebend.wert!.wert).toBeCloseTo(2678.7, 0);
  });
});

describe('Migration v3 → v4 (Session 8: Platzhalter der Zusatzmodule entfällt)', () => {
  for (const n of ['fws-moosseedorf', 'raumweise-efh']) {
    it(`state-v3-${n}: leerer Platzhalter fällt still weg, sonst identisch mit v4, Ergebnis unverändert`, () => {
      const h = hydrateState(fixtureRoh(`state-v3-${n}.json`), KONTEXT);
      expect(h.ok).toBe(true);
      if (!h.ok) return;
      expect(h.vonVersion).toBe(3);
      expect(h.protokoll).toEqual([]);
      expect(h.probleme).toEqual([]);
      expect(h.state).toEqual(JSON.parse(fixtureRoh(`state-v4-${n}.json`)));
      expect(berechne(h.state, alleDaten()).zuschlaege.qh?.wert).toBeCloseTo(berechne(JSON.parse(fixtureRoh(`state-v4-${n}.json`)) as never, alleDaten()).zuschlaege.qh!.wert, 6);
    });
  }
  it('erfasste Angaben im Platzhalter werden protokolliert entfernt', () => {
    const roh = JSON.parse(fixtureRoh('state-v3-fws-moosseedorf.json'));
    roh.zusatz.offerte = { paket: 'standard' };
    const h = hydrateState(roh, KONTEXT);
    expect(h.ok && h.protokoll.join(' ')).toContain('Förderung/Bewilligung/Offerte entfernt');
    expect(h.ok && 'zusatz' in h.state).toBe(false);
  });
});

describe('v4-Fixtures: Validierung ist verlustfrei für gültige Stände', () => {
  for (const name of ['state-v4-fws-moosseedorf.json', 'state-v4-raumweise-efh.json']) {
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
    const roh = JSON.parse(fixtureRoh('state-v3-fws-moosseedorf.json'));
    roh.gebaeude.baujahr = 'neunzehnhundert';
    roh.verbrauch.reihen.push({ id: 'r2', energietraeger: 'kohle', art: 'zeitraeume', zeitraeume: [] });
    roh.verbrauch.reihen.push({ energietraeger: 'erdgas', art: 'zeitraeume' });
    roh.verbrauch.reihen[0].zeitraeume.push({ id: 'v2', menge: 'viel', jahr: 2023 });
    roh.raeume = [{ id: 'r1', name: 'A', typ: 'wohnen', bauteile: [{ id: 'b1', flaecheM2: 'x', anschluss: { art: 'mond' } }] }];
    roh.waermeabgabe.raeume = { r1: { heizflaechen: [{ id: 'h1', bauart: 'kachelofen' }, { id: 'h2', bauart: 'platte_22', hoeheMm: 600, typenschild: { qNW: 1000 } }] } };
    roh.methode = 'bauchgefuehl';
    roh.unbekannt = 42;
    const h = hydrateState(roh, KONTEXT);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.state.gebaeude.baujahr).toBeUndefined();
    expect(h.state.verbrauch.reihen.map((r) => r.id)).toEqual(['r-erdgas']);
    expect(h.state.verbrauch.reihen[0]!.zeitraeume!.map((e) => e.id)).toEqual(['v1', 'v2']);
    expect(h.state.verbrauch.reihen[0]!.zeitraeume![1]!.menge).toBe(0);
    expect(h.state.raeume[0]!.bauteile[0]).toMatchObject({ flaecheM2: 0, anschluss: { art: 'aussen' } });
    expect(h.state.waermeabgabe.raeume.r1!.heizflaechen).toEqual([{ id: 'h2', bauart: 'platte_22', hoeheMm: 600 }]);
    expect(h.state.methode).toBeNull();
    expect('unbekannt' in h.state).toBe(false);
    const p = h.probleme.join('\n');
    for (const t of ['gebaeude.baujahr', 'energietraeger', 'ohne id', 'flaecheM2', 'Anschluss', 'kachelofen', 'Typenschild', 'methode']) expect(p).toContain(t);
  });

  it('doppelte ids in Listen werden verworfen (stabile Referenzen)', () => {
    const roh = JSON.parse(fixtureRoh('state-v3-raumweise-efh.json'));
    roh.raeume.push({ ...roh.raeume[0] });
    const h = hydrateState(roh, KONTEXT);
    expect(h.ok && h.state.raeume.length).toBe(3);
    expect(h.ok && h.probleme.join(' ')).toContain('doppelt');
  });
});
