/** Audit S12 (code-qualitaet) — Probe DATA-03/04/05: WP-DB normalisiert? Ausführen: npx vite-node tests/audit-s12/code-qualitaet/probe-wp.ts */
import { waermepumpenDaten } from '@daten/waermepumpen';
import { statSync } from 'node:fs';

const d = waermepumpenDaten();
const g = d.geraete;
const bytes = statSync(new URL('../../../data/waermepumpen.json', import.meta.url)).size;
console.log('Dateigrösse data/waermepumpen.json:', bytes, 'Bytes');
console.log('Top-Level-Schlüssel:', Object.keys(d).join(', '));
console.log('Geräte gesamt:', g.length, '| heizung:', g.filter((x) => x.kategorie === 'heizung').length, '| brauchwasser:', g.filter((x) => x.kategorie === 'brauchwasser').length);
console.log('Marken:', [...new Set(g.map((x) => x.marke))].join(', '));
// Strings in Zahlenfeldern / «—»
const felder = ['heizleistungA7W35KW', 'copA7W35', 'copA2W35', 'aufnahmeleistungA2W35KW', 'vorlaufMaxC', 'mindestPufferLiter', 'schallNachtMaxDb', 'preisChf', 'scop', 'schallTagMaxDb'] as const;
let strings = 0;
for (const x of g) for (const f of felder) { const v = (x as unknown as Record<string, unknown>)[f]; if (v !== null && typeof v !== 'number') { strings++; console.log('  STRING', x.id, f, JSON.stringify(v)); } }
console.log('Strings in Zahlenfeldern:', strings);
const strich = JSON.stringify(d).match(/"—"/g)?.length ?? 0;
console.log('«—»-Strings im ganzen JSON:', strich);
// Brauchwasser-Filterprobe: Qh 2.5 kW → nur Heizungsgeräte?
const kandidaten = g.filter((x) => x.kategorie === 'heizung' && (x.heizleistungA7W35KW ?? 0) >= 2.5 * 0.9);
console.log('Heizungs-Kandidaten Qh≥2.25 kW:', kandidaten.length, '| davon TWH/DHW:', kandidaten.filter((x) => /TWH|DHW/.test(x.modell)).length);
console.log('vorlaufMaxC null bei Heizung:', g.filter((x) => x.kategorie === 'heizung' && x.vorlaufMaxC === null).map((x) => x.id).join(', ') || 'keine');
console.log('schallNachtMaxDb null bei Heizung:', g.filter((x) => x.kategorie === 'heizung' && x.schallNachtMaxDb === null).map((x) => x.id).join(', ') || 'keine');
console.log('unplausibel markiert:', g.filter((x) => x.plausibilitaet.unplausibel).map((x) => `${x.id} (${x.plausibilitaet.verhaeltnisQA2ZuQm7})`).join(', '));
console.log('Preis null:', g.filter((x) => x.preisChf === null).map((x) => `${x.id}:${(x as unknown as { preisHinweis: string | null }).preisHinweis}`).join(', '));
console.log('verifiziertVon-Werte:', [...new Set(g.map((x) => (x as unknown as { verifiziertVon: string }).verifiziertVon))].join(' | '));
