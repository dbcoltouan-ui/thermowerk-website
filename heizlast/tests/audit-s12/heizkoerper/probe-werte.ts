/* Audit S12 (heizkoerper): Zahlen für den Prüfbericht ausgeben (npx vite-node tests/audit-s12/heizkoerper/probe-werte.ts). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { hydrateState } from '../../../src/state/hydrate';
import type { State } from '../../../src/state/schema';
import { setzeImState } from '../../../src/state/store';

const daten = alleDaten();
const K = { id: 'p', jetzt: '2026-10-31T00:00:00.000Z' };
const fx = (n: string): State => {
  const h = hydrateState(readFileSync(join(__dirname, '..', '..', 'fixtures', n), 'utf8'), K);
  if (!h.ok) throw new Error(h.text);
  return h.state;
};

let s = fx('state-v4-fws-moosseedorf.json');
s = { ...s, raeume: [
  { id: 'wohnen', name: 'Wohnen', typ: 'wohnen', flaecheM2: 30, bauteile: [] },
  { id: 'schlafen', name: 'Schlafen', typ: 'schlafen', flaecheM2: 16, bauteile: [] },
  { id: 'bad', name: 'Bad', typ: 'bad', flaecheM2: 8, bauteile: [] },
] };
s = setzeImState(s, 'waermeabgabe.raeume.wohnen', { phiHLManuellW: 1200, heizflaechen: [{ id: 'h1', bauart: 'platte_21', hoeheMm: 600, laengeMm: 800 }] });
s = setzeImState(s, 'waermeabgabe.raeume.schlafen', { phiHLManuellW: 600, heizflaechen: [{ id: 'h2', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1200 }] });
s = setzeImState(s, 'waermeabgabe.raeume.bad', { phiHLManuellW: 450, heizflaechen: [{ id: 'h3', bauart: 'bad_handtuch', hoeheMm: 1172, laengeMm: 600 }] });
const e = berechne(s, daten);
const out = {
  raeume: e.waermeabgabe!.raeume.map((r) => ({ name: r.name, phi: r.phiHL?.wert, qZiel: Math.round(r.qZiel!.wert), deckung: Math.round(r.deckung!.wert * 100), tVLReq: r.tVLReq?.wert.toFixed(1), ampel: r.ampel, massnahmen: r.massnahmen.length })),
  gebaeude: { vl: e.auslegungsVL.wert.toFixed(1), stufe: e.auslegungsVL.stufe, ampel: e.waermeabgabe!.gebaeude.ampel, urteil: e.waermeabgabe!.gebaeude.urteil, kritisch: e.waermeabgabe!.gebaeude.kritischeRaeume },
  filter: { vl: e.geraet.filterVorlauf?.wert, std: e.geraet.filterVorlaufStandard?.wert, treffer: e.geraet.liste.length, hinweise: e.geraet.hinweise.map((h) => h.code) },
  massnahmenWohnen: e.waermeabgabe!.raeume[0]!.massnahmen.map((m) => m.text),
};
console.warn(JSON.stringify(out, null, 1));

const rw = berechne(fx('state-v4-raumweise-efh.json'), daten);
console.warn(JSON.stringify({ wohnen: rw.waermeabgabe!.raeume.map((r) => ({ name: r.name, phi: r.phiHL?.wert?.toFixed(0), q: r.qZiel?.wert?.toFixed(0), d: r.deckung?.wert?.toFixed(2), t: r.tVLReq?.wert?.toFixed(1), ampel: r.ampel })), vl: rw.auslegungsVL.wert.toFixed(1), filter: rw.geraet.filterVorlauf?.wert, tLade: rw.speicher.ww?.tLade.wert }, null, 1));
