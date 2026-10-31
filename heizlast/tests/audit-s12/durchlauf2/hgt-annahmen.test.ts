/**
 * Audit S12, Durchlauf 2 — Punkt 2: UX §3.1 Heizgradtage in `annahmen[]`.
 * Erwartung laut Fix: Teilzeiträume (anteilBasis «hgt») liefern `hgtIst` und `hgtRef` als Annahme; bei Klimabereinigung
 * zusätzlich `hgtNorm` je Zeitraum; ganze Kalenderjahre ohne Klimabereinigung ohne HGT-Annahme (Kurs: nach Tagen).
 * Geprüft über `berechne()` (ein Rechenpfad): Schritt «verbrauch», keine Objekt-Duplikate.
 * Fixtures: Öl mit Tankständen (e2e/bericht.spec.ts bzw. annahmen-detail.test.ts), Gas-Zählerstände (verbrauchsreihe.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import type { Ergebnis } from '../../../src/kern/berechne';
import { berechne } from '../../../src/kern/berechne';
import type { State } from '../../../src/state/schema';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
const kopie = (s: State): State => JSON.parse(JSON.stringify(s)) as State;

function oelTankstaende(klima = false): State {
  const s = kopie(fixture('state-v4-fws-moosseedorf.json'));
  s.gebaeude.standort = { plz: '3011', kanton: 'BE' };
  s.verbrauch.wwBisher = false;
  s.verbrauch.eta = {};
  s.verbrauch.klimabereinigung = klima;
  s.verbrauch.reihen = [{ id: 'r-oel', energietraeger: 'heizoel', art: 'lieferungen', ablesungen: [{ id: 'a1', datum: '2023-09-15', bestand: 1200 }, { id: 'a2', datum: '2024-05-20', bestand: 1700 }], lieferungen: [{ id: 'l1', datum: '2023-09-15', menge: 2500 }, { id: 'l2', datum: '2024-01-10', menge: 1800 }] }];
  return s;
}
function gasKalenderjahre(klima = false): State {
  const s = kopie(fixture('state-v4-fws-moosseedorf.json'));
  s.gebaeude.standort = { plz: '3011', kanton: 'BE' };
  s.verbrauch.wwBisher = false;
  s.verbrauch.eta = {};
  s.verbrauch.klimabereinigung = klima;
  s.verbrauch.reihen = [{ id: 'r-gas', energietraeger: 'erdgas', art: 'zaehlerstaende', zaehlerstaende: [{ id: 'z1', datum: '2022-01-01', stand: 10_000 }, { id: 'z2', datum: '2023-01-01', stand: 12_500 }, { id: 'z3', datum: '2024-01-01', stand: 14_900 }, { id: 'z4', datum: '2025-01-01', stand: 17_500 }] }];
  return s;
}
const kd = (e: Ergebnis) => e.annahmen.filter((a) => a.wert.einheit === 'Kd');
const keineObjektDuplikate = (e: Ergebnis) => expect(new Set(e.annahmen.map((a) => a.wert)).size).toBe(e.annahmen.length);

describe('Punkt 2 — Heizgradtage im Annahmen-Protokoll (über berechne())', () => {
  it('Öl mit Tankständen (248 Tage, anteilBasis hgt): hgtIst und hgtRef je Zeitraum in annahmen[] mit Schritt «verbrauch»; keine Duplikate', () => {
    const e = berechne(oelTankstaende(), daten);
    const t = e.heizlast.fws!.traeger[0]!;
    expect(t.zeitraeume).toHaveLength(1);
    const z = t.zeitraeume[0]!;
    expect(z.anteilBasis).toBe('hgt');
    expect(z.hgtIst?.herkunft).toBe('tabelle');
    expect(z.hgtRef?.herkunft).toBe('tabelle');
    const ist = e.annahmen.find((a) => a.wert === z.hgtIst);
    const ref = e.annahmen.find((a) => a.wert === z.hgtRef);
    expect(ist?.schritt).toBe('verbrauch');
    expect(ref?.schritt).toBe('verbrauch');
    expect(kd(e)).toHaveLength(2); // ohne Klimabereinigung kein Normjahr
    keineObjektDuplikate(e);
    console.log('Öl Kd-Annahmen: ' + kd(e).map((a) => `${a.wert.wert} Kd «${a.wert.begruendung.slice(0, 70)}»`).join(' | '));
  });

  it('Öl mit Klimabereinigung: zusätzlich hgtNorm (SIA 2028 Normjahr) in annahmen[]; Objekt des Zeitraums, nicht das Klima-Objekt', () => {
    const e = berechne(oelTankstaende(true), daten);
    expect(e.heizlast.fws!.klimabereinigungAktiv).toBe(true);
    const liste = kd(e);
    expect(liste).toHaveLength(3);
    const norm = liste.filter((a) => /Normjahr/.test(a.wert.begruendung));
    expect(norm).toHaveLength(1);
    expect(norm[0]!.wert.wert).toBe(e.klima!.hgt!.wert); // gleicher Zahlenwert wie das Stations-Objekt
    expect(norm[0]!.schritt).toBe('verbrauch');
    keineObjektDuplikate(e);
  });

  it('Gas: drei ganze Kalenderjahre ohne Klimabereinigung → keine Kd-Annahme (Kurs: nach Tagen)', () => {
    const e = berechne(gasKalenderjahre(false), daten);
    const t = e.heizlast.fws!.traeger[0]!;
    expect(t.zeitraeume.every((z) => z.anteilBasis === 'tage' && z.klimaFaktor === null)).toBe(true);
    expect(kd(e)).toHaveLength(0);
    keineObjektDuplikate(e);
  });

  it('Gas mit Klimabereinigung: hgtIst je Jahr und das Normjahr der Station genau einmal in annahmen[] (Dedupe nach Wert und Text, S12)', () => {
    const e = berechne(gasKalenderjahre(true), daten);
    const t = e.heizlast.fws!.traeger[0]!;
    expect(t.zeitraeume).toHaveLength(3);
    for (const z of t.zeitraeume) {
      expect(z.klimaFaktor).not.toBeNull();
      expect(e.annahmen.some((a) => a.wert === z.hgtIst && a.schritt === 'verbrauch')).toBe(true);
    }
    keineObjektDuplikate(e);
    const norm = kd(e).filter((a) => /Normjahr/.test(a.wert.begruendung));
    const texte = new Set(norm.map((a) => `${a.wert.begruendung}|${a.wert.wert}`));
    console.log(`Gas+Klima: ${kd(e).length} Kd-Annahmen, davon ${norm.length} Normjahr-Zeilen mit ${texte.size} verschiedenen Texten`);
    expect(norm.length).toBe(1); // behoben S12 (Durchlauf 2, Punkt 2)
    expect(texte.size).toBe(1);
  });
});
