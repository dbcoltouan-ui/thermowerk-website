/** Audit S12 — DATA-04 Teilaspekt: besteht ein Gerät ohne Schallwert jeden Schallfilter? npx vite-node tests/audit-s12/code-qualitaet/probe-schall.ts */
import { alleDaten } from '@daten/index';
import { berechne } from '@kern/berechne';
import { hydrateState } from '@state/hydrate';
import { setzeImState } from '@state/store';
import { readFileSync } from 'node:fs';

const daten = alleDaten();
const h = hydrateState(readFileSync(new URL('../../fixtures/state-v4-fws-moosseedorf.json', import.meta.url), 'utf8'), { id: 'p', jetzt: '2026-10-31T00:00:00.000Z' });
if (!h.ok) throw new Error(h.text);
const ohne = berechne(h.state, daten);
const mit = berechne(setzeImState(h.state, 'geraet.filterOverrides.schallNachtMaxDb', 30), daten);
const db = new Map(daten.wp.geraete.map((g) => [g.id, g]));
console.log('Q_h', Math.round(ohne.zuschlaege.qh!.wert), 'W; Treffer ohne Schallfilter:', ohne.geraet.liste.map((g) => g.id).join(', '));
console.log('Schallfilter ≤ 30 dB(A) → Treffer:', mit.geraet.liste.map((g) => `${g.id} (Schall ${db.get(g.id)!.schallNachtMaxDb ?? 'null'})`).join(', ') || 'keine');
console.log('Hinweise mit «schall»:', mit.hinweise.filter((x) => /schall/i.test(x.text)).map((x) => x.code).join(', ') || 'keine');
console.log('GeraetTreffer-Felder:', Object.keys(mit.geraet.liste[0] ?? ohne.geraet.liste[0] ?? {}).join(', '));
