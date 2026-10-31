/**
 * Audit S12 (heizkoerper) — Probe State/UI: HK-18 (eine Quelle, UI rechnet nicht), HK-20/21 (Typ-Wechsel, keine
 * abgeleiteten HK-Werte im State), HK-16/25 (Maske nach Bauart, Kreis-IDs intern), HK-14 (kein Altfeld tVLMaxHeizung).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { relevant } from '../../../src/kern/relevanz';
import { relevanteMasse } from '../../../src/kern/waermeabgabe';
import { hydrateState } from '../../../src/state/hydrate';
import type { State } from '../../../src/state/schema';
import { erstelleStore } from '../../../src/state/store';
import { fixture, testOptionen } from '../../state/hilfen';

const daten = alleDaten();
const ROOT = join(__dirname, '..', '..', '..');

function dateien(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) dateien(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}

/** Quelltext ohne Kommentare (Block und Zeile) — damit Formeln in JSDoc nicht als Rechnung zählen. */
function ohneKommentare(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('HK-18 / FLOW-09: UI und Bericht rechnen nichts (kein zweiter Rechenpfad)', () => {
  it('kein Math.log/pow/exp, kein Potenz-Operator, keine Übertemperatur-Konstante in src/ui und src/bericht', () => {
    const treffer: string[] = [];
    for (const f of [...dateien(join(ROOT, 'src', 'ui')), ...dateien(join(ROOT, 'src', 'bericht'))]) {
      const code = ohneKommentare(readFileSync(f, 'utf8'));
      const rel = f.slice(ROOT.length + 1);
      if (/Math\.(log|pow|exp)\b/.test(code)) treffer.push(`${rel}: Math.log/pow/exp`);
      if (/[^*/]\*\*[^*/]/.test(code) && !/10 \*\* dez/.test(code)) treffer.push(`${rel}: **`);
      if (/49\.83|\bdTlog\(|leistungsfaktor\(|bisektionVorlauf\(|normleistung\(/.test(code)) treffer.push(`${rel}: Kern-Primitive`);
    }
    expect(treffer).toEqual([]);
  });

  it('src/ui importiert aus dem Kern nur Typen, Labels/Lookups und fmt — keine Rechenfunktionen', () => {
    const erlaubt = new Set(['fmt', 'BAUARTEN', 'kategorieVon', 'relevanteMasse', 'relevant', 'istAnnahme', 'SCHRITT_IDS', 'schrittVonPfad', 'ruhendeAngaben', 'heizflaechenVorhanden', 'stufenDefinition', 'standardTypId', 'istStandardTypId', 'bauteilArtLabel', 'ALLE_ARTEN', 'konkreteArt', 'anschlussAuto', 'ebfBestimmen', 'flaecheAus', 'etaPresetsFuer', 'stationenListe', 'geraetBezeichnung', 'parseDatum', 'ENERGIETRAEGER', 'ERFASSUNGSARTEN']);
    const verdaechtig: string[] = [];
    for (const f of [...dateien(join(ROOT, 'src', 'ui')), ...dateien(join(ROOT, 'src', 'bericht'))]) {
      const code = readFileSync(f, 'utf8');
      for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']*\/kern\/[^']+'/g)) {
        for (const name of m[1]!.split(',').map((x) => x.trim().replace(/^type\s+/, '')).filter(Boolean)) {
          if (!erlaubt.has(name)) verdaechtig.push(`${f.slice(ROOT.length + 1)}: ${name}`);
        }
      }
    }
    // Nur Lookups/Formatierung — die Liste wird im Bericht zitiert
    expect(verdaechtig).toEqual([]);
  });

  it('HK-14: Altfeld «tVLMaxHeizung» existiert nirgends; Bericht und Dashboard lesen e.auslegungsVL', () => {
    const alle = [...dateien(join(ROOT, 'src'))].map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(alle).not.toMatch(/tVLMaxHeizung|tVL_neu|tVL_max/);
    const dash = readFileSync(join(ROOT, 'src', 'ui', 'komponenten', 'Dashboard.tsx'), 'utf8');
    const bericht = readFileSync(join(ROOT, 'src', 'bericht', 'kapitelHeizlast.tsx'), 'utf8');
    expect(dash).toMatch(/e\.auslegungsVL/);
    expect(bericht).toMatch(/e\.auslegungsVL/);
  });
});

describe('HK-20 / HK-21: Typ-Wechsel und State ohne abgeleitete HK-Werte', () => {
  it('Store: T22 mit Höhe/Länge/Tiefe/Modell/Typenschild → FBH: nur id, bauart, kreisId bleiben; → Guss: Masse weg; Platte → Platte behält Nische ohne Tiefe', () => {
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v4-raumweise-efh.json') });
    const m = daten.hk.modelle.find((x) => x.bauart === 'platte_22' && x.hoeheMm === 600)!;
    const id = store.heizflaecheHinzufuegen('bad', 'platte_22');
    const p = `waermeabgabe.raeume.bad.heizflaechen.${id}`;
    store.setze(`${p}.hoeheMm`, 600);
    store.setze(`${p}.laengeMm`, 1000);
    store.setze(`${p}.tiefeMm`, 100);
    store.setze(`${p}.modellId`, m.id);
    store.setze(`${p}.typenschild`, { qNW: 1600, tVLC: 75, tRLC: 65, tRaumC: 20 });
    store.setze(`${p}.minderungen.nische`, true);
    const vorher = store.state.value.waermeabgabe.raeume.bad!.heizflaechen.find((h) => h.id === id)!;
    expect(vorher.modellId).toBe(m.id);
    const qVor = store.ergebnis.value.waermeabgabe!.raeume.find((r) => r.id === 'bad')!.heizflaechen.find((h) => h.id === id)!;
    expect(qVor.stufe).toBe('typenschild');

    store.heizflaecheBauart('bad', id, 'fbh');
    const fbh = store.state.value.waermeabgabe.raeume.bad!.heizflaechen.find((h) => h.id === id)!;
    expect(fbh).toEqual({ id, bauart: 'fbh', kreisId: 'k1' });
    const eFbh = store.ergebnis.value.waermeabgabe!.raeume.find((r) => r.id === 'bad')!.heizflaechen.find((h) => h.id === id)!;
    expect(eFbh.qN).toBeNull(); // Fläche fehlt — nichts hängt vom alten Typenschild/Modell
    expect(eFbh.stufe).toBe('fehlt');
    expect(eFbh.bezug).toEqual({ tVL: 35, tRL: 28, tInt: 20 });

    store.setze(`${p}.flaecheM2`, 6);
    store.heizflaecheBauart('bad', id, 'guss_glieder');
    const guss = store.state.value.waermeabgabe.raeume.bad!.heizflaechen.find((h) => h.id === id)!;
    expect(guss).toEqual({ id, bauart: 'guss_glieder', kreisId: 'k1' });
    // Standardwert Tiefe 160 erscheint im Ergebnis, nicht im State
    store.setze(`${p}.hoeheMm`, 600);
    store.setze(`${p}.glieder`, 10);
    const eG = store.ergebnis.value.waermeabgabe!.raeume.find((r) => r.id === 'bad')!.heizflaechen.find((h) => h.id === id)!;
    expect(eG.standardwerte.tiefeMm).toMatchObject({ wert: 160, stufe: 'standardwert' });
    expect(store.state.value.waermeabgabe.raeume.bad!.heizflaechen.find((h) => h.id === id)!.tiefeMm).toBeUndefined();

    store.heizflaecheBauart('bad', id, 'platte_21');
    store.setze(`${p}.hoeheMm`, 600);
    store.setze(`${p}.laengeMm`, 800);
    store.setze(`${p}.tiefeMm`, 66);
    store.heizflaecheBauart('bad', id, 'platte_33');
    const p33 = store.state.value.waermeabgabe.raeume.bad!.heizflaechen.find((h) => h.id === id)!;
    expect(p33).toEqual({ id, bauart: 'platte_33', kreisId: 'k1', hoeheMm: 600, laengeMm: 800 });
  });

  it('State-Schema: abgeleitete Felder (q_norm, n_exponent, _fallbackTyp, qN, tiefe-Default …) werden beim Laden verworfen; bauart ist Pflicht-Enum', () => {
    const roh = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'state-v4-raumweise-efh.json'), 'utf8'));
    roh.waermeabgabe.raeume.wohnen.heizflaechen[0] = {
      id: 'hf1', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000,
      q_norm: 1617, n_exponent: 1.3, _fallbackTyp: 'platte_t22', qN: 1697, tVLReq: 60, typ: 'heizkoerper', A: 0.6, _useLB: true, tiefeDefault: 100,
    };
    roh.waermeabgabe.raeume.wohnen.heizflaechen.push({ id: 'hfx', typ: 'heizkoerper', A: 0.5 }); // ohne bauart
    const h = hydrateState(JSON.stringify(roh), { id: 'p', jetzt: '2026-10-31T00:00:00.000Z' });
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    const hfs = h.state.waermeabgabe.raeume.wohnen!.heizflaechen;
    expect(hfs.map((x) => x.id)).toEqual(['hf1', 'hf2']);
    expect(hfs[0]).toEqual({ id: 'hf1', bauart: 'platte_22', hoeheMm: 600, laengeMm: 1000 });
    expect(h.probleme.some((p) => /hfx|Bauart/.test(p))).toBe(true);
    // Schema-Typ: nur Rohangaben
    const erlaubt = ['id', 'bauart', 'kreisId', 'bezeichnung', 'hoeheMm', 'laengeMm', 'tiefeMm', 'nabenabstandMm', 'glieder', 'gliedbreiteMm', 'einbau', 'designTyp', 'flaecheM2', 'verlegeabstandMm', 'belag', 'rlb', 'system', 'modellId', 'typenschild', 'minderungen', 'nOverride'];
    const schema = readFileSync(join(ROOT, 'src', 'state', 'schema.ts'), 'utf8');
    const block = /function heizflaeche\([\s\S]*?\n}\n/.exec(schema)![0];
    for (const k of block.matchAll(/^\s{4}(\w+):/gm)) expect(erlaubt, k[1]).toContain(k[1]!);
    expect(block).not.toMatch(/qNorm|q_norm|nExponent|_fallbackTyp|stufe|herkunft/);
  });

  it('berechne() verändert den State nicht; State-JSON enthält keine Ergebnisgrössen', () => {
    const s: State = fixture('state-v4-raumweise-efh.json');
    const vorher = JSON.stringify(s);
    const e = berechne(s, daten);
    expect(e.waermeabgabe!.raeume[0]!.tVLReq).not.toBeNull();
    expect(JSON.stringify(s)).toBe(vorher);
    expect(vorher).not.toMatch(/"(qN|qZiel|tVLReq|deckung|auslegungsVL|standardwerte|fm|n)":/);
  });
});

describe('HK-16 / HK-25: Maske folgt der Bauart, Kreis-IDs intern', () => {
  it('relevanteMasse je Bauart deckt das Zielbild §6.1 ab; relevant() blendet fremde Masse aus', () => {
    const s = fixture('state-v4-raumweise-efh.json');
    const hk = daten.hk;
    expect(relevanteMasse('platte_22', hk)).toEqual(['hoeheMm', 'laengeMm', 'tiefeMm']);
    expect(relevanteMasse('guss_glieder', hk)).toEqual(expect.arrayContaining(['hoeheMm', 'nabenabstandMm', 'tiefeMm', 'glieder', 'gliedbreiteMm']));
    expect(relevanteMasse('roehren_3', hk)).toEqual(expect.arrayContaining(['hoeheMm', 'glieder']));
    expect(relevanteMasse('konvektor_passiv', hk)).toEqual(expect.arrayContaining(['hoeheMm', 'tiefeMm', 'laengeMm', 'einbau']));
    expect(relevanteMasse('fbh', hk)).toEqual(expect.arrayContaining(['flaecheM2', 'verlegeabstandMm', 'belag', 'rlb']));
    expect(relevanteMasse('wandheizung', hk)).toEqual(['flaecheM2', 'system']);
    expect(relevant('waermeabgabe.raeume.wohnen.heizflaechen.hf1.hoeheMm', s, { hk })).toBe(true);
    expect(relevant('waermeabgabe.raeume.wohnen.heizflaechen.hf1.glieder', s, { hk })).toBe(false);
    expect(relevant('waermeabgabe.raeume.wohnen.heizflaechen.hf1.flaecheM2', s, { hk })).toBe(false);
  });

  it('Heizkreis-IDs werden intern vergeben; Entfernen eines Kreises lässt keine verwaisten Referenzen', () => {
    const store = erstelleStore({ daten, ...testOptionen(), anfang: fixture('state-v4-raumweise-efh.json') });
    const k2 = store.heizkreisHinzufuegen({ bezeichnung: 'FBH' });
    expect(k2).toMatch(/^k\d+$/);
    store.heizkreisEntfernen('k1', k2);
    expect(store.state.value.waermeabgabe.raeume.wohnen!.heizflaechen.every((h) => h.kreisId === k2)).toBe(true);
    store.heizkreisEntfernen(k2);
    expect(store.state.value.waermeabgabe.raeume.wohnen!.heizflaechen.every((h) => !('kreisId' in h))).toBe(true);
    expect(store.ergebnis.value.hinweise.some((h) => h.code === 'waermeabgabe.kreis.unbekannt')).toBe(false);
  });
});
