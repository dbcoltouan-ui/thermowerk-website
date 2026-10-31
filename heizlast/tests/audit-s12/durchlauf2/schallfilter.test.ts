/**
 * Audit S12, Durchlauf 2 — Punkt 1: DATA-04 Rest (Schallfilter).
 * Erwartung laut Fix: Geräte ohne Schallwert bleiben bei gesetztem Filter in der Liste, sind als `schallUnbekannt`
 * markiert (Badge «Schall unbekannt» nur in der UI-Liste), Hinweis `geraet.schallUnbekannt` mit Pfad
 * `geraet.filterOverrides.schallNachtMaxDb`; Geräte mit Wert über dem Grenzwert fallen weg; ohne Filter keine Markierung.
 * Sollwerte: die Gerätedatenbank selbst (waermepumpen.json), kein Kernwert.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { geraetWaehlen } from '../../../src/kern/geraet';
import { eingabe } from '../../../src/kern/wert';
import type { State } from '../../../src/state/schema';
import { setzeImState } from '../../../src/state/store';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
const wp = daten.wp;
const SRC = join(__dirname, '..', '..', '..', 'src');

describe('Punkt 1 — Schallfilter (DATA-04 Rest)', () => {
  const qh = eingabe(10_000, 'W');
  const ohneWert = wp.geraete.filter((d) => d.kategorie === 'heizung' && d.schallNachtMaxDb === null);
  it('Datenbank: es gibt Heizungsgeräte ohne Schallwert (sonst wäre die Probe leer)', () => {
    expect(ohneWert.length).toBeGreaterThan(0);
    console.log(`Heizungsgeräte ohne Schallwert: ${ohneWert.length} von ${wp.geraete.filter((d) => d.kategorie === 'heizung').length}`);
  });

  it('ohne Filter: keine Markierung, kein Hinweis, schallNachtMaxDb trotzdem aus der DB im Treffer', () => {
    const r = geraetWaehlen({ qh, auslegungsVL: null, filter: { quelle: 'luftWasser' } }, { fws: daten.fws, wp });
    expect(r.liste.length).toBeGreaterThan(0);
    expect(r.liste.some((g) => g.schallUnbekannt)).toBe(false);
    expect(r.hinweise.some((h) => h.code === 'geraet.schallUnbekannt')).toBe(false);
    for (const g of r.liste) expect(g.schallNachtMaxDb).toBe(wp.geraete.find((d) => d.id === g.id)!.schallNachtMaxDb);
  });

  it.each([30, 45, 60])('Filter %s dB(A): Geräte > Grenzwert weg, Geräte ohne Wert bleiben markiert, Hinweis mit Zahl und Pfad', (grenze) => {
    const alle = geraetWaehlen({ qh, auslegungsVL: null, filter: { quelle: 'luftWasser' } }, { fws: daten.fws, wp });
    const r = geraetWaehlen({ qh, auslegungsVL: null, filter: { quelle: 'luftWasser', schallNachtMaxDb: grenze } }, { fws: daten.fws, wp });
    const sollBleiben = alle.liste.filter((g) => g.schallNachtMaxDb === null || g.schallNachtMaxDb <= grenze).map((g) => g.id).sort();
    expect(r.liste.map((g) => g.id).sort()).toEqual(sollBleiben);
    for (const g of r.liste) {
      const d = wp.geraete.find((x) => x.id === g.id)!;
      expect(g.schallUnbekannt).toBe(d.schallNachtMaxDb === null);
      if (d.schallNachtMaxDb !== null) expect(d.schallNachtMaxDb).toBeLessThanOrEqual(grenze);
    }
    const n = r.liste.filter((g) => g.schallUnbekannt).length;
    const h = r.hinweise.find((x) => x.code === 'geraet.schallUnbekannt');
    if (n > 0) {
      expect(h).toBeDefined();
      expect(h!.stufe).toBe('info');
      expect(h!.pfad).toBe('geraet.filterOverrides.schallNachtMaxDb');
      expect(h!.text).toMatch(new RegExp(`^Schallfilter: ${n} `));
    } else expect(h).toBeUndefined();
    console.log(`Filter ≤ ${grenze} dB(A): ${r.liste.length} Treffer, davon ${n} «Schall unbekannt»; weggefallen: ${alle.liste.length - r.liste.length}`);
  });

  it('über berechne(): Hinweis landet mit Schritt «waermepumpe» im Ergebnis und ist dem Filterfeld zugeordnet', () => {
    const s: State = setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'geraet.filterOverrides.schallNachtMaxDb', 30);
    const e = berechne(s, daten);
    const h = e.hinweise.find((x) => x.code === 'geraet.schallUnbekannt');
    expect(h?.schritt).toBe('waermepumpe');
    expect(h?.pfad).toBe('geraet.filterOverrides.schallNachtMaxDb');
    expect(e.geraet.liste.filter((g) => g.schallUnbekannt).length).toBeGreaterThan(0);
    // Geräte mit Wert ≤ 30 dB(A) wären erlaubt — falls keines passt, besteht die Liste nur aus «unbekannt» (das ist jetzt sichtbar)
    const mitWert = e.geraet.liste.filter((g) => !g.schallUnbekannt);
    for (const g of mitWert) expect(g.schallNachtMaxDb!).toBeLessThanOrEqual(30);
    console.log(`Moosseedorf, Schall ≤ 30: Liste ${e.geraet.liste.map((g) => `${g.id}${g.schallUnbekannt ? '?' : `(${g.schallNachtMaxDb})`}`).join(', ')}`);
    // Ohne Filter: kein Hinweis
    expect(berechne(fixture('state-v4-fws-moosseedorf.json'), daten).hinweise.some((x) => x.code === 'geraet.schallUnbekannt')).toBe(false);
  });

  it('statisch: Badge «Schall unbekannt» nur in der Geräteliste der UI (Waermepumpe.tsx), nicht im Bericht; Feld und Liste sind an den Hinweis-Pfad gebunden', () => {
    const treffer: string[] = [];
    const walk = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(n) && readFileSync(p, 'utf8').includes('schallUnbekannt')) treffer.push(p.slice(SRC.length + 1));
      }
    };
    walk(SRC);
    expect(treffer.sort()).toEqual(['kern/geraet.ts', 'ui/seiten/Waermepumpe.tsx']);
    const ui = readFileSync(join(SRC, 'ui', 'seiten', 'Waermepumpe.tsx'), 'utf8');
    expect(ui).toContain('Schall unbekannt');
    expect(ui).toContain('pfad="geraet.filterOverrides.schallNachtMaxDb"');
    // Hinweis-Code ist weder in LISTE_CODES noch in FELD_CODES ausgeschlossen: erscheint am Feld (FeldHinweise) UND im Meldungsblock der Auswahl
    expect(ui).not.toMatch(/geraet\.schallUnbekannt/);
  });
});
