/**
 * Audit S12, Durchlauf 2 — Punkt 5: Fachlogik N1, Bedarfsart «Raumwärme und Warmwasser» (t_voll 2 300) zusammen mit
 * WW-Abzug und/oder Leistungszuschlag Q_w → Warnung `tvoll.wwDoppelt` (Pfad `verbrauch.bedarfsart`).
 * Drei Fälle: Abzug allein, Q_w allein, keins von beiden (keine Warnung); dazu: Warnung erscheint am Feld in Schritt 3
 * (Verbrauch.tsx → AuswahlFeld → FeldHinweise, gerendert mit preact-render-to-string aus dem App-Store).
 * Sollwert extern: Kurs Folie 16 (2 300 h/a gilt für Q_n inkl. Warmwasser), Aufgabe 2 (Q_n = Q_n,HWW − Q_n,WW bei 2 000 h/a).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { store } from '../../../src/state/app';
import type { State } from '../../../src/state/schema';
import { Verbrauch } from '../../../src/ui/seiten/Verbrauch';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
const kopie = (s: State): State => JSON.parse(JSON.stringify(s)) as State;

/** Moosseedorf (Rechnungen, wwBisher true mit Abzug 180 l/d, wwKuenftig true) mit Bedarfsart «Raumwärme und Warmwasser». */
function basis(wwBisher: boolean, wwKuenftig: boolean, bedarfsart: State['verbrauch']['bedarfsart'] = 'raumwaerme_ww_wohnen'): State {
  const s = kopie(fixture('state-v4-fws-moosseedorf.json'));
  s.verbrauch.bedarfsart = bedarfsart;
  s.verbrauch.wwBisher = wwBisher;
  s.warmwasser.wwKuenftig = wwKuenftig;
  return s;
}
const warnung = (s: State) => berechne(s, daten).hinweise.find((h) => h.code === 'tvoll.wwDoppelt');

describe('Punkt 5 — Bedarfsart «Raumwärme und Warmwasser» + WW-Abzug / Q_w', () => {
  it('Abzug allein (WW bisher ja, künftig nein): Warnung nennt den Abzug, nicht Q_w; t_voll 2 300 bleibt', () => {
    const s = basis(true, false);
    const e = berechne(s, daten);
    expect(e.heizlast.fws!.tvoll.wert).toBe(2300);
    expect(e.heizlast.fws!.wwAbzug).not.toBeNull();
    expect(e.warmwasser.zuschlag).toBeNull();
    const h = warnung(s);
    expect(h).toMatchObject({ stufe: 'warnung', pfad: 'verbrauch.bedarfsart', schritt: 'verbrauch' });
    expect(h!.text).toContain('zusammen mit dem Warmwasser-Abzug vom Verbrauch:');
    expect(h!.text).not.toContain('Leistungszuschlag');
    expect(h!.text).toContain("2'300");
  });

  it('Q_w allein (WW bisher nein, künftig ja): Warnung nennt den Leistungszuschlag Q_w, nicht den Abzug', () => {
    const s = basis(false, true);
    const e = berechne(s, daten);
    expect(e.heizlast.fws!.wwAbzug).toBeNull();
    expect(e.warmwasser.zuschlag).not.toBeNull();
    expect(e.zuschlaege.qw.wert).toBeGreaterThan(0);
    const h = warnung(s);
    expect(h).toMatchObject({ stufe: 'warnung', pfad: 'verbrauch.bedarfsart' });
    expect(h!.text).toContain('zusammen mit dem Leistungszuschlag Q_w:');
    expect(h!.text).not.toContain('Warmwasser-Abzug');
  });

  it('beides: Warnung nennt beides; keins von beiden (WW separat bisher und künftig): keine Warnung — Bedarfsart legitim', () => {
    const beide = warnung(basis(true, true));
    expect(beide!.text).toContain('Abzug');
    expect(beide!.text).toContain('Q_w');
    expect(warnung(basis(false, false))).toBeUndefined();
    // Bedarfsart «Raumwärme» (2 000 h/a) mit Abzug und Q_w: Kurs-Fall Aufgabe 2 → keine Warnung
    expect(warnung(basis(true, true, 'raumwaerme_wohnen'))).toBeUndefined();
    // Rechenwirkung bleibt (Kern meldet nur): Q_hl mit 2 300 h/a kleiner als mit 2 000 h/a
    const q2300 = berechne(basis(true, true), daten).zuschlaege.qhl!.wert;
    const q2000 = berechne(basis(true, true, 'raumwaerme_wohnen'), daten).zuschlaege.qhl!.wert;
    expect(q2300 / q2000).toBeCloseTo(2000 / 2300, 6);
    console.log(`Q_hl 2 300 h/a: ${q2300.toFixed(0)} W vs 2 000 h/a: ${q2000.toFixed(0)} W (−${((1 - q2300 / q2000) * 100).toFixed(0)} %)`);
  });

  it('Schrittstatus «verbrauch» wird «warnung»; die Warnung ist in Schritt 3 dem Feld «Nutzung» (verbrauch.bedarfsart) zugeordnet', () => {
    const s = basis(true, true);
    const e = berechne(s, daten);
    expect(e.status.verbrauch).toBe('warnung');
    // Verbrauch-Seite aus dem Store rendern: Hinweis unter dem Feld (FeldHinweise im selben FeldRahmen)
    store.ersetze(s);
    const html = renderToString(<Verbrauch />);
    const i = html.indexOf('data-testid="bedarfsart"');
    expect(i).toBeGreaterThanOrEqual(0);
    const feld = html.slice(i, html.indexOf('data-testid="tvoll"', i));
    expect(feld).toContain('feld__hinweis--warnung');
    expect(feld).toContain('doppelt berücksichtigt');
    // ohne Kombination: kein Hinweis am Feld
    store.ersetze(basis(false, false));
    const h2 = renderToString(<Verbrauch />);
    const j = h2.indexOf('data-testid="bedarfsart"');
    expect(h2.slice(j, h2.indexOf('data-testid="tvoll"', j))).not.toContain('feld__hinweis');
  });

  it('statisch: AuswahlFeld rendert FeldHinweise für seinen Pfad; Verbrauch.tsx bindet das Feld an verbrauch.bedarfsart', () => {
    const felder = readFileSync(join(__dirname, '..', '..', '..', 'src', 'ui', 'komponenten', 'Felder.tsx'), 'utf8');
    const auswahl = felder.slice(felder.indexOf('export function AuswahlFeld'), felder.indexOf('export function JaNeinFeld'));
    expect(auswahl).toContain('<FeldHinweise pfad={pfad} />');
    const verbrauch = readFileSync(join(__dirname, '..', '..', '..', 'src', 'ui', 'seiten', 'Verbrauch.tsx'), 'utf8');
    expect(verbrauch).toContain('<AuswahlFeld pfad="verbrauch.bedarfsart"');
  });
});
