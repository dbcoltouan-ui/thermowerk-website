/**
 * Raumweise ohne Pflicht-Klick (Session 7b): Raum-Bauteile ohne eigenen Bauteiltyp bekommen im Kern einen
 * Standard-Typ aus Baujahr/Keller/Dachform/Sanierungen (nicht im State). Ketten-Properties: Baujahr, Keller,
 * Dachform, Sanierung und Sanierungsdatum nachträglich ändern → U, Bauteile aus den Lage-Fragen, Φ_HL ändern mit;
 * eigene Typen, Stufen und U-Werte gehen vor.
 */
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../src/daten/index';
import { berechne } from '../../src/kern/berechne';
import { aufloesenBauteiltyp } from '../../src/kern/huelle';
import { anschlussAuto, konkreteArt, konkretisiereBauteil, standardTypId } from '../../src/kern/standardtypen';
import type { State } from '../../src/state/schema';
import { neuerState } from '../../src/state/schema';
import { setzeImState } from '../../src/state/store';
import { KONTEXT } from './hilfen';

const daten = alleDaten();

/** Raumweise-Projekt 1965 mit einem Raum, dessen Bauteile nur über die Art definiert sind (kein eigener Typ). */
function basis(): State {
  let s = neuerState(KONTEXT);
  s = setzeImState(s, 'methode', 'raumweise');
  s = setzeImState(s, 'projekt.name', 'Kette');
  s = setzeImState(s, 'gebaeude', { ...s.gebaeude, typ: 'efh', baujahr: 1965, keller: 'unbeheizt', dachform: 'steil', dachraumBeheizt: true, ebfModus: 'raeume', standort: { thetaEOverrideC: -8 } });
  s = setzeImState(s, 'huelle.geschosshoeheM', 2.5);
  s = setzeImState(s, 'raeume', [
    {
      id: 'r1',
      name: 'Wohnen',
      typ: 'wohnen',
      flaecheM2: 25,
      bauteile: [
        { id: 'aw', art: 'aussenwand', flaecheM2: 19, anschluss: { art: 'aussen' } },
        { id: 'f', art: 'fenster', flaecheM2: 6, anschluss: { art: 'aussen' } },
        { id: 'unten', art: 'boden', flaecheM2: 25, anschluss: { art: 'auto' } },
        { id: 'oben', art: 'decke', flaecheM2: 25, anschluss: { art: 'auto' } },
      ],
    },
  ]);
  return s;
}

const raum = (s: State) => berechne(s, daten).heizlast.raumweise!.raeume[0]!;
const bauteilU = (s: State, id: string) => raum(s).bauteile.find((b) => b.id === id)!.u;

describe('Konkretisierung generischer Bauteile', () => {
  it('Anschluss auto und Art boden/decke folgen Keller, Dachform und Dachraum', () => {
    expect(anschlussAuto('boden', { keller: 'unbeheizt', dachform: 'steil' })).toEqual({ art: 'unbeheizt', situation: 'keller' });
    expect(anschlussAuto('boden', { keller: 'keiner', dachform: 'steil' })).toEqual({ art: 'erdreich' });
    expect(anschlussAuto('boden', { keller: 'beheizt', dachform: 'steil' })).toEqual({ art: 'beheizt' });
    expect(anschlussAuto('decke', { keller: null, dachform: 'steil', dachraumBeheizt: false })).toEqual({ art: 'unbeheizt', situation: 'dachraum' });
    expect(anschlussAuto('decke', { keller: null, dachform: 'flach' })).toEqual({ art: 'aussen' });
    expect(anschlussAuto('innenwand', { keller: null, dachform: null })).toEqual({ art: 'beheizt' });
    expect(konkreteArt('boden', { art: 'erdreich' }, { keller: 'keiner', dachform: null })).toBe('bodenErdreich');
    expect(konkreteArt('boden', { art: 'unbeheizt', situation: 'keller' }, { keller: 'unbeheizt', dachform: null })).toBe('bodenKeller');
    expect(konkreteArt('decke', { art: 'aussen' }, { keller: null, dachform: 'flach' })).toBe('dachFlach');
    expect(konkreteArt('decke', { art: 'unbeheizt', situation: 'dachraum' }, { keller: null, dachform: 'steil' })).toBe('deckeEstrich');
    expect(konkreteArt('decke', { art: 'beheizt' }, { keller: null, dachform: 'steil' })).toBe('innendecke');
    expect(konkreteArt('aussenwand', { art: 'aussen' }, { keller: null, dachform: null })).toBe('aussenwand');
  });

  it('ohne eigenen Typ → Standard-Typ std-<art>; eigener Typ gewinnt; unbekannte typId fällt auf den Standard zurück', () => {
    const g = { keller: 'unbeheizt' as const, dachform: 'steil' as const };
    const k = konkretisiereBauteil({ id: 'b', art: 'boden', flaecheM2: 10, anschluss: { art: 'auto' } }, g, []);
    expect(k).toMatchObject({ typId: standardTypId('bodenKeller'), art: 'bodenKeller', anschluss: { art: 'unbeheizt', situation: 'keller' }, standardTyp: true, ausGebaeude: true });
    const eigen = konkretisiereBauteil({ id: 'b', typId: 'meinBoden', flaecheM2: 10, anschluss: { art: 'erdreich' } }, g, [{ id: 'meinBoden', art: 'bodenErdreich' }]);
    expect(eigen).toMatchObject({ typId: 'meinBoden', standardTyp: false, ausGebaeude: false });
    const weg = konkretisiereBauteil({ id: 'b', typId: 'gibtsNicht', art: 'aussenwand', flaecheM2: 10, anschluss: { art: 'aussen' } }, g, []);
    expect(weg.typId).toBe(standardTypId('aussenwand'));
  });
});

describe('Ketten: Gebäudeangaben wirken sofort auf Räume und Heizlast', () => {
  const s0 = basis();

  it('Standard-Typen liefern den Epochen-Default (= aufloesenBauteiltyp ohne Stufen) als Standardwert mit Baujahr-Hinweis', () => {
    const e = berechne(s0, daten);
    const stdAw = e.heizlast.huelle!.bauteile[standardTypId('aussenwand')]!;
    const direkt = aufloesenBauteiltyp({ id: 'x', art: 'aussenwand' }, { baujahr: 1965 }, daten.huelle);
    expect(stdAw.u.wert).toBeCloseTo(direkt.u.wert, 9);
    expect(stdAw.u.herkunft).toBe('fallback');
    expect(stdAw.u.begruendung).toMatch(/^Standard aus Baujahr 1965/);
    expect(bauteilU(s0, 'aw').wert).toBeCloseTo(direkt.u.wert, 9);
    expect(e.heizlast.raumBauteile.r1!.unten).toMatchObject({ art: 'bodenKeller', standardTyp: true, ausGebaeude: true });
    expect(e.heizlast.raumBauteile.r1!.oben).toMatchObject({ art: 'dachSteil', standardTyp: true });
    // Annahmen: nur genutzte Standard-Typen (4 Arten) + Raum-Standardwerte, keine ungenutzten
    expect(e.annahmen.filter((a) => a.wert.begruendung.startsWith('Standard aus Baujahr')).length).toBe(4);
    expect(e.vollstaendigkeit.filter((f) => f.schritt === 'huelle')).toEqual([]);
  });

  it('Baujahr 1965 → 1995: alle Standard-U sinken, Φ_HL sinkt', () => {
    const s1 = setzeImState(s0, 'gebaeude.baujahr', 1995);
    for (const id of ['aw', 'f', 'unten', 'oben']) expect(bauteilU(s1, id).wert, id).toBeLessThan(bauteilU(s0, id).wert);
    expect(raum(s1).phiHL.wert).toBeLessThan(raum(s0).phiHL.wert);
    expect(bauteilU(s1, 'aw').begruendung).toContain('1995');
  });

  it('Keller unbeheizt → kein Keller: Boden wird Erdreich-Boden (anderer Typ, anderer Faktor); beheizt → Innendecke ohne Verlust', () => {
    const erd = setzeImState(s0, 'gebaeude.keller', 'keiner');
    const b0 = raum(s0).bauteile.find((b) => b.id === 'unten')!;
    const b1 = raum(erd).bauteile.find((b) => b.id === 'unten')!;
    expect(b0.art).toBe('bodenKeller');
    expect(b1.art).toBe('bodenErdreich');
    expect(b0.anschluss).toBe('unbeheizt');
    expect(b1.anschluss).toBe('erdreich');
    expect(b1.phiT.wert).not.toBeCloseTo(b0.phiT.wert, 0);
    const beh = setzeImState(s0, 'gebaeude.keller', 'beheizt');
    const b2 = raum(beh).bauteile.find((b) => b.id === 'unten')!;
    expect(b2.art).toBe('innendecke');
    expect(b2.phiT.wert).toBe(0);
  });

  it('Dachform steil → flach und Dachraum unbeheizt → Estrichdecke gegen Dachraum', () => {
    const flach = setzeImState(s0, 'gebaeude.dachform', 'flach');
    expect(raum(flach).bauteile.find((b) => b.id === 'oben')!.art).toBe('dachFlach');
    expect(bauteilU(flach, 'oben').wert).not.toBeCloseTo(bauteilU(s0, 'oben').wert, 3);
    const estrich = setzeImState(s0, 'gebaeude.dachraumBeheizt', false);
    const b = raum(estrich).bauteile.find((b) => b.id === 'oben')!;
    expect(b.art).toBe('deckeEstrich');
    expect(b.anschluss).toBe('unbeheizt');
    expect(b.faktor.wert).toBeLessThan(1);
  });

  it('Sanierung «Fenster» 2005 senkt das Standard-Fenster-U; Datum 2015 (neuere Epoche) senkt weiter; geplant wirkt im Zustand geplant', () => {
    const san = (datum: string, status: 'ausgefuehrt' | 'geplant' = 'ausgefuehrt') => setzeImState(s0, 'sanierungen', [{ id: 's1', massnahme: 'fenster', status, datum }]);
    const u0 = bauteilU(s0, 'f').wert;
    const u05 = bauteilU(san('2005'), 'f').wert;
    const u15 = bauteilU(san('2015'), 'f').wert;
    expect(u05).toBeLessThan(u0);
    expect(u15).toBeLessThan(u05);
    expect(bauteilU(san('2015'), 'aw').wert).toBeCloseTo(bauteilU(s0, 'aw').wert, 9); // Wand unberührt
    expect(raum(san('2015')).phiHL.wert).toBeLessThan(raum(s0).phiHL.wert);
    expect(bauteilU(san('2030', 'geplant'), 'f').wert).toBeLessThan(u0); // raumweise rechnet mit geplanten (wie FWS qhlKorr)
    const e = berechne(san('2015'), daten);
    expect(e.heizlast.huelle!.bauteile[standardTypId('fenster')]!.sanierungWirkt).toBe(true);
  });

  it('eigener U-Wert am Raum-Bauteil gewinnt und bleibt markiert; Baujahr ändert ihn nicht; Standard-U ist dann keine Annahme', () => {
    const s1 = setzeImState(s0, 'raeume.r1.bauteile.aw.uOverride', 0.7);
    expect(bauteilU(s1, 'aw')).toMatchObject({ wert: 0.7, herkunft: 'override' });
    expect(bauteilU(setzeImState(s1, 'gebaeude.baujahr', 2000), 'aw').wert).toBe(0.7);
    const e = berechne(s1, daten);
    expect(e.annahmen.some((a) => a.wert.begruendung.includes('Standard aus Baujahr') && a.wert.begruendung.includes('Aussenwand'))).toBe(false);
  });

  it('eigener Bauteiltyp mit Stufen gewinnt über den Standard, Standard-Typ bleibt für andere Bauteile', () => {
    let s1 = setzeImState(s0, 'huelle.bauteiltypen', [{ id: 'awEigen', art: 'aussenwand', stufen: { daemmung: true, daemmdickeM: 0.12 } }]);
    s1 = setzeImState(s1, 'raeume.r1.bauteile.aw.typId', 'awEigen');
    const e = berechne(s1, daten);
    const aw = e.heizlast.raumweise!.raeume[0]!.bauteile.find((b) => b.id === 'aw')!;
    expect(aw.u.wert).toBeLessThan(bauteilU(s0, 'aw').wert);
    expect(aw.u.begruendung).toContain('Dämmdicke'); // eigener Aufbau, nicht «Standard aus Baujahr»
    expect(aw.u.begruendung).not.toContain('Standard aus Baujahr');
    expect(e.heizlast.raumBauteile.r1!.aw!.standardTyp).toBe(false);
    expect(e.heizlast.huelle!.bauteile[standardTypId('aussenwand')]).toBeUndefined(); // nicht mehr gebraucht
    expect(e.heizlast.huelle!.bauteile[standardTypId('fenster')]).toBeDefined();
  });

  it('Rest über Hüllflächen ohne eigene Typen nutzt die Standard-Typen', () => {
    const s1 = setzeImState(s0, 'huelle.rest', { modus: 'huellflaechen', flaecheM2: 40, aAussenwandM2: 30, aFensterM2: 8, aBodenM2: 40, bodenAnschluss: 'keller' });
    const e = berechne(s1, daten);
    expect(e.heizlast.raumweise!.rest!.phiHL.wert).toBeGreaterThan(0);
    expect(e.heizlast.raumweise!.rest!.bauteile.map((b) => b.art)).toEqual(['aussenwand', 'fenster', 'bodenKeller']);
  });
});
