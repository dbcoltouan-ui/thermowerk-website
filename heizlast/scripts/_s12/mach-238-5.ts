// Erzeugt tests/fixtures/state-v4-raumweise-238-5.json aus referenz/referenzhaus-etagenwohnung.json
// (gleiche Abbildung wie tests/kern/raumweise.test.ts) und prüft das Ergebnis über berechne().
import { readFileSync, writeFileSync } from 'node:fs';
import { berechne } from '../../src/kern/berechne';
import { alleDaten } from '../../src/daten/index';
import { hydrateState } from '../../src/state/hydrate';

const H = '/home/claude/thermowerk-website/heizlast';
type RefBauteil = { label: string; typ: string; u: number; A: number; fRT: number; thetaNb?: number; anschluss?: string };
type RefRaum = { id: number; name: string; tint: number; nmin: number; geometrie: { A: number; h: number }; bauteile: RefBauteil[]; soll: Record<string, number> };
const ref = JSON.parse(readFileSync(`${H}/referenz/referenzhaus-etagenwohnung.json`, 'utf8')) as { raeume: RefRaum[]; soll_gebaeude: Record<string, number> };

const raeume = ref.raeume.map((r) => ({
  id: `r${r.id}`,
  name: r.name,
  typ: r.tint === 24 ? 'bad' : r.tint === 15 ? 'eingangsbereich' : 'wohnen',
  thetaIntC: r.tint,
  flaecheM2: r.geometrie.A,
  hoeheM: r.geometrie.h,
  nMinOverride: r.nmin,
  bauteile: r.bauteile.map((b, i) => ({
    id: `${b.typ.toLowerCase()}${i}`,
    bezeichnung: b.label,
    art: b.typ === 'AW' ? 'aussenwand' : b.typ === 'AF' ? 'fenster' : b.typ === 'IW' ? 'innenwand' : b.typ === 'IT' ? 'innentuer' : 'innendecke',
    flaecheM2: b.A,
    uOverride: b.u,
    anschluss:
      b.typ === 'AW' || b.typ === 'AF'
        ? { art: 'aussen' }
        : b.anschluss === 'unbeheizt'
          ? { art: 'unbeheizt', bU: b.fRT }
          : b.typ === 'FB'
            ? { art: 'unbeheizt', situation: 'keller', bU: 0.5 }
            : b.thetaNb !== undefined
              ? { art: 'beheizt', thetaNachbarC: b.thetaNb, andereEinheit: b.label.includes('Nachbarw') }
              : { art: 'faktor', f: b.fRT },
  })),
}));
const flur = raeume.find((r) => r.id === 'r3')!;
flur.bauteile.push(
  { id: 'zuKueche', bezeichnung: 'IW → Küche', art: 'innenwand', flaecheM2: 3.2, uOverride: 1.94, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
  { id: 'zuKuecheTuer', bezeichnung: 'IT → Küche', art: 'innentuer', flaecheM2: 1.6, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
  { id: 'zuDusche', bezeichnung: 'IW → Dusche', art: 'innenwand', flaecheM2: 5.7, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 24 } },
  { id: 'zuDuscheTuer', bezeichnung: 'IT → Dusche', art: 'innentuer', flaecheM2: 1.3, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 24 } },
  { id: 'zuWohnen', bezeichnung: 'IW → Wohnen', art: 'innenwand', flaecheM2: 7.0, uOverride: 1.94, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
  { id: 'zuWohnenTuer', bezeichnung: 'IT → Wohnen', art: 'innentuer', flaecheM2: 1.6, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
  { id: 'zuSchlafen', bezeichnung: 'IW → Schlafen', art: 'innenwand', flaecheM2: 5.4, uOverride: 1.94, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
  { id: 'zuSchlafenTuer', bezeichnung: 'IT → Schlafen', art: 'innentuer', flaecheM2: 1.6, uOverride: 2.0, anschluss: { art: 'beheizt', thetaNachbarC: 20 } },
);

const state = {
  meta: { schemaVersion: 4, id: 'p-238-5', erstellt: '2026-10-31T10:00:00.000Z', geaendert: '2026-10-31T10:00:00.000Z' },
  projekt: { name: 'Referenzhaus 238/5 (Etagenwohnung, DIN EN 12831 Formblätter)', bezugsdatum: '2026-10-31' },
  methode: 'raumweise',
  gebaeude: { typ: 'mfh', standort: { thetaEOverrideC: -12 }, baujahr: 1970, keller: 'unbeheizt', dachform: 'flach', ebfModus: 'raeume', energiestandard: 'keiner' },
  sanierungen: [],
  verbrauch: { quelle: null, reihen: [], eta: {}, konvention: 'fwsKurs', bedarfsart: 'raumwaerme_wohnen', klimabereinigung: false, wwBisher: null, abzug: { methode: 'personen', zirkulation: 'keine' }, wpBetriebsstunden: {}, messung: {} },
  huelle: { bauteiltypen: [], lueftung: { konzept: 'natuerlich', dichtheit: 'altbau' }, waermebruecken: { key: 'neubau', deltaU: 0.05 }, erdreich: {}, geschosshoeheM: 2.5, rest: { modus: 'keiner' } },
  raeume,
  warmwasser: { wwKuenftig: false, methode: 'personen', zirkulation: 'keine' },
  waermeabgabe: { heizkreise: [], raeume: {} },
  zuschlaege: { sperrzeitAktiv: false, zusatz: [] },
  speicher: { ww: {}, puffer: { aktiv: null, einzelraumregelung: false, sperrzeitUeberbrueckung: false }, mag: {} },
  geraet: { quelle: 'luftWasser', auswahlId: null, filterOverrides: {} },
};

const h = hydrateState(state, { id: 'p-238-5', jetzt: '2026-10-31T10:00:00.000Z' });
if (!h.ok) { console.error(h); process.exit(1); } if (h.probleme.length) console.log('Probleme', h.probleme);
const erg = berechne(h.state, alleDaten());
const rw = erg.heizlast.raumweise!;
for (const r of ref.raeume) {
  const x = rw.raeume.find((q) => q.id === `r${r.id}`)!;
  const soll = r.soll.phiHL_W!;
  console.log(r.name.padEnd(14), 'ist', Math.round(x.phiHL.wert), 'soll', soll, 'Abw', ((x.phiHL.wert - soll) / Math.abs(soll) * 100).toFixed(1) + ' %');
}
console.log('Σ Räume', Math.round(rw.summeRaeume.wert), 'soll', ref.soll_gebaeude.summe_raeume_W, '| saldiert', Math.round(rw.saldiertRaeume.wert), '| massgebend', erg.heizlast.massgebend?.wert, '| Fehler', erg.fehler?.length ?? 0);
writeFileSync(`${H}/tests/fixtures/state-v4-raumweise-238-5.json`, JSON.stringify(state, null, 2) + '\n');
console.log('geschrieben');
