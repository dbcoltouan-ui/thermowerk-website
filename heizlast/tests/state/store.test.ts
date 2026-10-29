/**
 * Store: unveränderliche Updates über Pfade mit ids, ein Render-Zyklus (state → berechne → ergebnis),
 * Aktionen ohne verwaiste Referenzen (FLOW-15/18, HK-20), nie abgeleitete Werte im State (CODE-08).
 */
import { effect } from '@preact/signals';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../src/daten/index';
import { erstelleStore, setzeImState } from '../../src/state/store';
import { fixture, testOptionen } from './hilfen';

const daten = alleDaten();

describe('setzeImState', () => {
  it('adressiert Listenelemente über ihre id, Arrays werden kopiert (unveränderlich)', () => {
    const s = fixture('state-v2-raumweise-efh.json');
    const n = setzeImState(s, 'raeume.bad.bauteile.f.flaecheM2', 1.5);
    expect(n.raeume[1]!.bauteile[1]!.flaecheM2).toBe(1.5);
    expect(s.raeume[1]!.bauteile[1]!.flaecheM2).toBe(1);
    expect(n.raeume[0]).toBe(s.raeume[0]);
    expect(n.huelle).toBe(s.huelle);
  });
  it('undefined löscht ein Feld bzw. ein Listenelement; unbekannte ids werfen', () => {
    const s = fixture('state-v2-raumweise-efh.json');
    expect('uOverride' in setzeImState(s, 'raeume.wohnen.bauteile.aw.uOverride', undefined).raeume[0]!.bauteile[0]!).toBe(false);
    expect(setzeImState(s, 'raeume.flur', undefined).raeume.map((r) => r.id)).toEqual(['wohnen', 'bad']);
    expect(() => setzeImState(s, 'raeume.gibtsnicht.name', 'x')).toThrow(/Pfad unbekannt/);
  });
  it('legt fehlende Heizflächen-Einträge eines Raums mit leerer Liste an', () => {
    const s = fixture('state-v2-raumweise-efh.json');
    expect(setzeImState(s, 'waermeabgabe.raeume.bad.ausklammern', true).waermeabgabe.raeume.bad).toEqual({ heizflaechen: [], ausklammern: true });
  });
});

describe('Store', () => {
  it('jede Änderung = eine Neuberechnung; Ergebnis folgt dem State; meta.geaendert läuft mit', () => {
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v2-fws-moosseedorf.json') });
    let laeufe = 0;
    const stopp = effect(() => {
      void store.ergebnis.value;
      laeufe++;
    });
    const qhVorher = store.ergebnis.value.zuschlaege.qh!.wert;
    const zeitVorher = store.state.value.meta.geaendert;
    store.setze('zuschlaege.sperrzeitH', 4);
    expect(laeufe).toBe(2);
    expect(store.ergebnis.value.zuschlaege.qh!.wert).toBeGreaterThan(qhVorher);
    expect(store.state.value.meta.geaendert > zeitVorher).toBe(true);
    stopp();
  });

  it('State enthält nach Rechnen keine abgeleiteten Werte (nur Rohangaben)', () => {
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v2-raumweise-efh.json') });
    const vorher = JSON.stringify(store.state.value);
    void store.ergebnis.value.waermeabgabe;
    expect(JSON.stringify(store.state.value)).toBe(vorher);
    expect(vorher).not.toMatch(/"(qN|phiHL|uWert|tVLReq|auslegungsVL|ebf)"/);
  });

  it('Raum entfernen nimmt seine Heizflächen mit (keine verwaisten Referenzen)', () => {
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v2-raumweise-efh.json') });
    store.raumEntfernen('wohnen');
    expect(store.state.value.raeume.map((r) => r.id)).toEqual(['bad', 'flur']);
    expect(store.state.value.waermeabgabe.raeume.wohnen).toBeUndefined();
  });

  it('Heizkreis entfernen: Heizflächen gehen an den Ersatzkreis oder bleiben ohne Kreis', () => {
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v2-raumweise-efh.json') });
    const k2 = store.heizkreisHinzufuegen({ tVLC: 45 });
    store.heizkreisEntfernen('k1', k2);
    expect(store.state.value.waermeabgabe.raeume.wohnen!.heizflaechen.map((h) => h.kreisId)).toEqual([k2, k2]);
    store.heizkreisEntfernen(k2);
    expect(store.state.value.waermeabgabe.raeume.wohnen!.heizflaechen.every((h) => !('kreisId' in h))).toBe(true);
  });

  it('Heizfläche hinzufügen (einziger Kreis wird zugeordnet) und Bauart wechseln setzt fremde Masse zurück', () => {
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v2-raumweise-efh.json') });
    const id = store.heizflaecheHinzufuegen('bad', 'platte_21');
    store.setze(`waermeabgabe.raeume.bad.heizflaechen.${id}.hoeheMm`, 600);
    store.setze(`waermeabgabe.raeume.bad.heizflaechen.${id}.laengeMm`, 500);
    store.heizflaecheBauart('bad', id, 'guss_glieder');
    const hf = store.state.value.waermeabgabe.raeume.bad!.heizflaechen[0]!;
    expect(hf).toMatchObject({ id, bauart: 'guss_glieder', kreisId: 'k1' });
    expect(hf.laengeMm).toBeUndefined();
  });

  it('Standard-Bauteiltypen aus Keller/Dachform, nur wenn noch keine erfasst sind', () => {
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v2-raumweise-efh.json') });
    store.standardBauteiltypenAnlegen();
    const arten = store.state.value.huelle.bauteiltypen.map((t) => t.art);
    expect(arten).toEqual(expect.arrayContaining(['aussenwand', 'fenster', 'dachSteil', 'bodenKeller']));
    expect(store.state.value.huelle.bauteiltypen.every((t) => !('sanierung' in t))).toBe(true);
    const anzahl = arten.length;
    store.standardBauteiltypenAnlegen();
    expect(store.state.value.huelle.bauteiltypen.length).toBe(anzahl);
  });
});
