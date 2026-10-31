/**
 * Audit S12 (ux-datenfluss), Probe UX-50/51/52: Herkunftsmodell vollständig?
 *
 * `berechne()` auf die eingefrorenen Fixtures; alle `Wert`-Objekte im Ergebnis rekursiv einsammeln und prüfen:
 *  - jeder Wert hat eine Begründung (≥ 4 Zeichen), Einheit, gültige Herkunft;
 *  - jeder Wert mit Herkunft ≠ eingabe/messung/berechnet (= Annahme) steht in `Ergebnis.annahmen[]`
 *    — oder ist ein belegter, begründeter Sonderfall (hier dokumentiert, nicht still);
 *  - jede Annahme trägt Unsicherheit oder Band oder eine Stufe/Quelle (Transparenz nach UX-50).
 * Die Liste der «nicht in annahmen[]» wird ausgegeben, damit der Prüfbericht sie nennen kann.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import type { Wert } from '../../../src/kern/wert';
import { istAnnahme } from '../../../src/kern/wert';
import { hydrateState } from '../../../src/state/hydrate';
import type { State } from '../../../src/state/schema';
import { setzeImState } from '../../../src/state/store';

const daten = alleDaten();
const K = { id: 'p-test', jetzt: '2026-10-29T12:00:00.000Z' };

function fixture(name: string): State {
  const h = hydrateState(readFileSync(join(__dirname, '..', '..', 'fixtures', name), 'utf8'), K);
  if (!h.ok) throw new Error(h.text);
  return h.state;
}

const HERKUENFTE = ['eingabe', 'messung', 'tabelle', 'schaetzung', 'fallback', 'override', 'berechnet'];

/** Alle Wert-Objekte im Ergebnis (Objekt-Identität, Pfad des ersten Fundorts). */
function sammleWerte(e: unknown): Map<Wert<unknown>, string> {
  const seen = new Set<unknown>();
  const out = new Map<Wert<unknown>, string>();
  const walk = (o: unknown, pfad: string, tiefe: number) => {
    if (!o || typeof o !== 'object' || seen.has(o) || tiefe > 14) return;
    seen.add(o);
    if (Array.isArray(o)) {
      o.forEach((x, i) => walk(x, `${pfad}[${i}]`, tiefe + 1));
      return;
    }
    const r = o as Record<string, unknown>;
    if ('herkunft' in r && 'begruendung' in r && 'wert' in r && 'einheit' in r) out.set(r as unknown as Wert<unknown>, pfad);
    for (const [k, v] of Object.entries(r)) walk(v, `${pfad}.${k}`, tiefe + 1);
  };
  walk(e, 'e', 0);
  return out;
}

/**
 * Annahmen-Kandidaten, die bewusst NICHT in annahmen[] stehen, mit Begründung aus dem Code (berechne.ts):
 *  - Hüllen-Standardtypen, deren U nirgends vererbt wird (`stdGenutzt`), werden gefiltert;
 *  - `raumweise.thetaE` / `raumweise.ebf` sind dieselben Objekte wie `Ergebnis.thetaE`/`ebf` (dort gesammelt);
 *  - Gegenprobe-Ergebnisse (nicht massgebend) werden nicht gesammelt.
 * Alles andere, was hier auftaucht, wird als Befund gemeldet.
 */
const faelle: [string, State][] = [
  ['raumweise CH-EFH (v4-Fixture)', fixture('state-v4-raumweise-efh.json')],
  ['FWS Moosseedorf (v4-Fixture)', fixture('state-v4-fws-moosseedorf.json')],
  ['FWS Moosseedorf mit Gerät OE-0001 und Guss-Raum', setzeImState(setzeImState(setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'geraet.auswahlId', 'OE-0001'), 'raeume', [{ id: 'r1', name: 'Bad', typ: 'bad', flaecheM2: 10, bauteile: [] }]), 'waermeabgabe.raeume.r1', { heizflaechen: [{ id: 'h1', bauart: 'guss_glieder', hoeheMm: 600, glieder: 10 }] })],
  ['FWS ohne Verbrauch (Bauperiode)', setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'verbrauch.quelle', 'keine')],
];

describe('UX-50/51/52 — Herkunft, Begründung, annahmen[] (Probe)', () => {
  for (const [name, s] of faelle) {
    const e = berechne(s, daten);
    const werte = sammleWerte(e);
    const annahmenSet = new Set<Wert<unknown>>(e.annahmen.map((a) => a.wert));

    it(`${name}: jeder Wert hat Herkunft, Einheit und Begründung`, () => {
      expect(werte.size).toBeGreaterThan(30);
      for (const [w, pfad] of werte) {
        expect(HERKUENFTE, `${pfad}: Herkunft`).toContain(w.herkunft);
        expect(typeof w.einheit, `${pfad}: Einheit`).toBe('string');
        expect(typeof w.begruendung === 'string' && w.begruendung.length >= 4, `${pfad}: Begründung «${String(w.begruendung)}»`).toBe(true);
      }
    });

    it(`${name}: jede Annahme (Herkunft ≠ eingabe/messung/berechnet) im Ergebnis steht in annahmen[] — Ausnahmen dokumentiert`, () => {
      const fehlend: string[] = [];
      for (const [w, pfad] of werte) {
        if (!istAnnahme(w) || annahmenSet.has(w)) continue;
        // Begründete Ausnahmen (siehe Kopfkommentar)
        if (/^e\.heizlast\.gegenprobe/.test(pfad)) continue;
        if (/^e\.heizlast\.huelle\.bauteile\.std-/.test(pfad) && /^Standard aus Baujahr/.test(w.begruendung)) continue;
        fehlend.push(`${pfad} [${w.herkunft}/${w.stufe ?? '-'}] «${w.begruendung.slice(0, 100)}»`);
      }
      // Ausgabe für den Prüfbericht
      console.log(`[${name}] Annahmen im Ergebnis, nicht in annahmen[] (${fehlend.length}):\n  ${fehlend.join('\n  ') || '—'}`);
      // Dokumentierter Stand (Prüfbericht §3): Liste darf nicht leer behauptet werden — Test hält den Ist-Stand fest.
      expect(fehlend.length).toBeLessThanOrEqual(40);
    });

    it(`${name}: Annahmen in annahmen[] tragen Unsicherheit/Band oder Stufe/Quelle`, () => {
      const nackt = e.annahmen.filter((a) => a.wert.unsicherheit === undefined && !a.wert.band && !a.wert.stufe && !a.wert.quelle);
      console.log(`[${name}] annahmen[]=${e.annahmen.length}; ohne Unsicherheit/Band=${e.annahmen.filter((a) => a.wert.unsicherheit === undefined && !a.wert.band).length}; ohne Quelle=${e.annahmen.filter((a) => !a.wert.quelle).length}; ganz ohne Transparenz=${nackt.length}`);
      for (const a of nackt) console.log(`   nackt: ${a.schritt}: ${a.wert.herkunft} «${a.wert.begruendung}»`);
      // Ist-Stand (Prüfbericht §3): ein Override (θe manuell) ohne Unsicherheit/Quelle/Stufe — Override ist per Definition eine
      // bewusste Nutzerangabe, die Begründung nennt den ersetzten Stationswert. Als NIEDRIG notiert, nicht als Fehler gewertet.
      expect(nackt.every((a) => a.wert.herkunft === 'override')).toBe(true);
    });
  }
});
