/**
 * Relevanz-Tabelle (KONTEXT §2 «Relevanz», UX-10…14): zentral getestet, auch vom Bericht genutzt.
 * Jede Zeile: State-Variante → Pfad → erwartet relevant ja/nein.
 */
import { describe, expect, it } from 'vitest';
import { heizkoerperDaten } from '../../src/daten/heizkoerper';
import { RELEVANZ_REGELN, relevant, ruhendeAngaben, schrittRelevant, schrittVonPfad } from '../../src/kern/relevanz';
import type { State } from '../../src/state/schema';
import { neuerState } from '../../src/state/schema';
import { setzeImState } from '../../src/state/store';
import { fixture, KONTEXT } from './hilfen';

const setze = (s: State, werte: Record<string, unknown>) => Object.entries(werte).reduce((acc, [p, v]) => setzeImState(acc, p, v), s);

const fws = setze(neuerState(KONTEXT), { methode: 'fws' });
const raumweise = setze(neuerState(KONTEXT), { methode: 'raumweise' });

/** Auftraggeber-Fall: Verbrauch mit WW (bisher über Heizung), künftig separater WP-Boiler. */
const auftraggeber = setze(fws, { 'verbrauch.quelle': 'rechnungen', 'verbrauch.wwBisher': true, 'verbrauch.abzug.methode': 'personen', 'warmwasser.wwKuenftig': false });

const FAELLE: ReadonlyArray<[string, State, string, boolean]> = [
  // Auftraggeber-Fall
  ['Auftraggeber: Abzug relevant', auftraggeber, 'verbrauch.abzug', true],
  ['Auftraggeber: Abzug-Personen relevant', auftraggeber, 'verbrauch.abzug.personen', true],
  ['Auftraggeber: Abzug-V_W,u nicht (Methode Personen)', auftraggeber, 'verbrauch.abzug.vwuLiterTag', false],
  ['Auftraggeber: künftige Personen nicht relevant', auftraggeber, 'warmwasser.personen', false],
  ['Auftraggeber: künftiger Komfort (l/P·d) nicht relevant', auftraggeber, 'warmwasser.bedarfKey', false],
  ['Auftraggeber: Ladetemperatur nicht relevant', auftraggeber, 'warmwasser.tLadeC', false],
  ['Auftraggeber: WW-Speicher nicht relevant', auftraggeber, 'speicher.ww.volumenOverrideLiter', false],
  ['Auftraggeber: Frage «WW künftig?» bleibt', auftraggeber, 'warmwasser.wwKuenftig', true],
  // WW bisher nein
  ['WW bisher nein: kein Abzug', setze(auftraggeber, { 'verbrauch.wwBisher': false }), 'verbrauch.abzug.personen', false],
  ['WW bisher offen: kein Abzug', setze(auftraggeber, { 'verbrauch.wwBisher': null }), 'verbrauch.abzug', false],
  // WW künftig ja
  ['WW künftig ja, Personen: Personen relevant', setze(auftraggeber, { 'warmwasser.wwKuenftig': true }), 'warmwasser.personen', true],
  ['WW künftig ja, direkt: Personen nicht', setze(auftraggeber, { 'warmwasser.wwKuenftig': true, 'warmwasser.methode': 'direkt' }), 'warmwasser.personen', false],
  ['WW künftig ja, direkt: V_W,u relevant', setze(auftraggeber, { 'warmwasser.wwKuenftig': true, 'warmwasser.methode': 'direkt' }), 'warmwasser.vwuLiterTag', true],
  ['Zirkulationslänge nur mit Leitung', setze(auftraggeber, { 'warmwasser.wwKuenftig': true }), 'warmwasser.zirkulationLaengeM', false],
  ['Zirkulationslänge bei Rohr-an-Rohr', setze(auftraggeber, { 'warmwasser.wwKuenftig': true, 'warmwasser.zirkulation': 'rohrAnRohr' }), 'warmwasser.zirkulationLaengeM', true],
  // Modus
  ['raumweise: Verbrauch ruht', raumweise, 'verbrauch.eintraege', false],
  ['raumweise: Hülle relevant', raumweise, 'huelle.bauteiltypen', true],
  ['FWS: Hülle ruht', fws, 'huelle.bauteiltypen', false],
  ['FWS: Raum-Bauteile ruhen', fws, 'raeume.r1.bauteile', false],
  ['FWS: Raumname relevant (Heizflächen)', fws, 'raeume.r1.name', true],
  ['FWS: Einsparung der Sanierung relevant', fws, 'sanierungen.s1.einsparungProzent', true],
  ['raumweise: Einsparung nicht, Stufen ja', raumweise, 'sanierungen.s1.einsparungProzent', false],
  ['raumweise: Sanierungs-Stufen relevant', raumweise, 'sanierungen.s1.stufen', true],
  // Verbrauch vorhanden?
  ['Verbrauch offen: Reihen nicht relevant', fws, 'verbrauch.reihen', false],
  ['Rechnungen: Reihen relevant', setze(fws, { 'verbrauch.quelle': 'rechnungen' }), 'verbrauch.reihen', true],
  ['Reihe Lieferungen: Ablesungen relevant, Zeiträume nicht', setze(fws, { 'verbrauch.quelle': 'rechnungen', 'verbrauch.reihen': [{ id: 'r1', energietraeger: 'heizoel', art: 'lieferungen' }] }), 'verbrauch.reihen.r1.ablesungen', true],
  ['Reihe Lieferungen: Zeiträume nicht relevant', setze(fws, { 'verbrauch.quelle': 'rechnungen', 'verbrauch.reihen': [{ id: 'r1', energietraeger: 'heizoel', art: 'lieferungen' }] }), 'verbrauch.reihen.r1.zeitraeume.e1.menge', false],
  ['Reihe Zählerstände relevant', setze(fws, { 'verbrauch.quelle': 'rechnungen', 'verbrauch.reihen': [{ id: 'r1', energietraeger: 'erdgas', art: 'zaehlerstaende' }] }), 'verbrauch.reihen.r1.zaehlerstaende.z1.stand', true],
  ['WP-Zähler: Raster nicht, Betriebsstunden ja', setze(fws, { 'verbrauch.quelle': 'wpBetriebsstunden' }), 'verbrauch.wpBetriebsstunden.zaehlerH', true],
  ['keine Daten: t_voll nicht relevant', setze(fws, { 'verbrauch.quelle': 'keine' }), 'verbrauch.bedarfsart', false],
  // Keller / Dach / EBF
  ['FWS: Keller nicht relevant', fws, 'gebaeude.keller', false],
  ['raumweise: Keller relevant', raumweise, 'gebaeude.keller', true],
  ['raumweise Flachdach: Dachraum nicht relevant', setze(raumweise, { 'gebaeude.dachform': 'flach' }), 'gebaeude.dachraumBeheizt', false],
  ['raumweise Steildach: Dachraum relevant', setze(raumweise, { 'gebaeude.dachform': 'steil' }), 'gebaeude.dachraumBeheizt', true],
  ['EBF aus Räumen: manuelle EBF nicht relevant', setze(raumweise, { 'gebaeude.ebfModus': 'raeume' }), 'gebaeude.ebfManuellM2', false],
  ['EBF manuell: relevant', fws, 'gebaeude.ebfManuellM2', true],
  // Räume vorhanden
  ['ohne Räume: Rest nicht relevant', raumweise, 'huelle.rest', false],
  ['mit Räumen: Rest relevant', setze(raumweise, { raeume: [{ id: 'r1', name: 'A', typ: 'wohnen', bauteile: [] }] }), 'huelle.rest', true],
  // Sperrzeit
  ['Sperrzeit offen: h/d nicht relevant', fws, 'zuschlaege.sperrzeitH', false],
  ['Sperrzeit ja: h/d relevant', setze(fws, { 'zuschlaege.sperrzeitAktiv': true }), 'zuschlaege.sperrzeitH', true],
  ['Sperrzeit nein: Puffer-Überbrückung nicht', setze(fws, { 'zuschlaege.sperrzeitAktiv': false }), 'speicher.puffer.sperrzeitUeberbrueckung', false],
  ['Puffer abgewählt: Override nicht relevant', setze(fws, { 'speicher.puffer.aktiv': false }), 'speicher.puffer.volumenOverrideLiter', false],
  // HK vorhanden
  ['ohne Heizflächen: Wärmeabgabesystem relevant', fws, 'waermeabgabe.system', true],
  ['ohne Heizflächen: Ziel-VL/alte Heizkurve nicht relevant', fws, 'waermeabgabe.heizkurveAlt', false],
  // Session 8: Wärmeabgabe-Maske
  ['Raum nicht ausgeklammert: Grund nicht relevant', setze(fws, { raeume: [{ id: 'r1', name: 'A', typ: 'wohnen', bauteile: [] }], 'waermeabgabe.raeume.r1': { heizflaechen: [] } }), 'waermeabgabe.raeume.r1.ausklammernGrund', false],
  ['Raum ausgeklammert: Grund relevant', setze(fws, { raeume: [{ id: 'r1', name: 'A', typ: 'wohnen', bauteile: [] }], 'waermeabgabe.raeume.r1': { heizflaechen: [], ausklammern: true } }), 'waermeabgabe.raeume.r1.ausklammernGrund', true],
  ['ohne Heizkreise: Kreis-Zuordnung nicht relevant', setze(fws, { raeume: [{ id: 'r1', name: 'A', typ: 'wohnen', bauteile: [] }], 'waermeabgabe.raeume.r1': { heizflaechen: [{ id: 'h1', bauart: 'platte_22' }] } }), 'waermeabgabe.raeume.r1.heizflaechen.h1.kreisId', false],
  ['mit Heizkreis: Kreis-Zuordnung relevant', setze(fws, { raeume: [{ id: 'r1', name: 'A', typ: 'wohnen', bauteile: [] }], 'waermeabgabe.heizkreise': [{ id: 'k1' }], 'waermeabgabe.raeume.r1': { heizflaechen: [{ id: 'h1', bauart: 'platte_22' }] } }), 'waermeabgabe.raeume.r1.heizflaechen.h1.kreisId', true],
];

describe('relevant(pfad, state) — Relevanz-Tabelle', () => {
  it.each(FAELLE)('%s', (_name, s, pfad, erwartet) => {
    expect(relevant(pfad, s)).toBe(erwartet);
  });

  it('mit Heizflächen: Wärmeabgabesystem abgeleitet (nicht relevant), Ziel-VL relevant; Masse je Bauart', () => {
    const s = fixture('state-v2-raumweise-efh.json');
    const hk = { hk: heizkoerperDaten() };
    expect(relevant('waermeabgabe.system', s)).toBe(false);
    expect(relevant('waermeabgabe.zielVLC', s)).toBe(true);
    expect(relevant('waermeabgabe.raeume.wohnen.heizflaechen.hf1.hoeheMm', s, hk)).toBe(true);
    expect(relevant('waermeabgabe.raeume.wohnen.heizflaechen.hf1.glieder', s, hk)).toBe(false);
    expect(relevant('waermeabgabe.raeume.wohnen.heizflaechen.hf1.verlegeabstandMm', s, hk)).toBe(false);
    const fbh = setzeImState(s, 'waermeabgabe.raeume.wohnen.heizflaechen.hf1.bauart', 'fbh');
    expect(relevant('waermeabgabe.raeume.wohnen.heizflaechen.hf1.verlegeabstandMm', fbh, hk)).toBe(true);
    expect(relevant('waermeabgabe.raeume.wohnen.heizflaechen.hf1.hoeheMm', fbh, hk)).toBe(false);
    expect(relevant('waermeabgabe.raeume.geloescht', s)).toBe(false);
  });

  it('jede Regel ist dokumentiert und eindeutig; Muster beginnen mit einem State-Schlüssel', () => {
    const schluessel = Object.keys(neuerState(KONTEXT));
    const muster = RELEVANZ_REGELN.map((r) => r.muster);
    expect(new Set(muster).size).toBe(muster.length);
    for (const r of RELEVANZ_REGELN) {
      expect(r.wenn.length).toBeGreaterThan(3);
      expect(schluessel).toContain(r.muster.split('.')[0]);
    }
  });
});

describe('Schritte und ruhende Angaben', () => {
  it('Schritt 3 je Modus; ohne Methode keiner', () => {
    expect(schrittRelevant('verbrauch', fws)).toBe(true);
    expect(schrittRelevant('huelle', fws)).toBe(false);
    expect(schrittRelevant('huelle', raumweise)).toBe(true);
    expect(schrittRelevant('verbrauch', neuerState(KONTEXT))).toBe(false);
    expect(schrittVonPfad('raeume.r1.name', fws)).toBe('waermeabgabe');
    expect(schrittVonPfad('raeume.r1.name', raumweise)).toBe('huelle');
    expect(schrittVonPfad('geraet.auswahlId', fws)).toBe('waermepumpe');
  });

  it('Moduswechsel: erfasste Verbrauchsdaten ruhen und werden gemeldet', () => {
    const s = setzeImState(fixture('state-v2-fws-moosseedorf.json'), 'methode', 'raumweise');
    expect(ruhendeAngaben(s).map((r) => r.pfad)).toContain('verbrauch');
    expect(ruhendeAngaben(fixture('state-v2-fws-moosseedorf.json'))).toEqual([]);
    const r = setzeImState(fixture('state-v2-raumweise-efh.json'), 'methode', 'fws');
    expect(ruhendeAngaben(r).map((x) => x.pfad)).toContain('raeume');
  });
});
