/**
 * Audit S12 (ux-datenfluss), Detailprobe zu UX-50/52: welche Nicht-Eingaben fehlen in `Ergebnis.annahmen[]`
 * (Dashboard-Zähler, Bericht-Kapitel «Annahmen und Unsicherheiten»)?
 *  - Overrides (θe, Auslegungs-VL, Puffer, U je Raum-Bauteil): laut KONTEXT §2 Teil von annahmen[].
 *  - Heizgradtage (Tabelle MeteoSchweiz, Teilmonate ±5 %), wenn sie in die Hochrechnung eingehen (Öl mit Tankständen).
 *  - HGT-Normjahr (SIA 2028) bei aktiver Klimabereinigung.
 *  - Standardmasse einer Heizfläche (Guss-Bautiefe 160 mm).
 * Gibt den Ist-Stand aus und hält ihn fest (keine Sollwert-Rechnung; nur Herkunfts-Buchführung).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { hydrateState } from '../../../src/state/hydrate';
import type { State } from '../../../src/state/schema';
import { setzeImState } from '../../../src/state/store';

const daten = alleDaten();
const K = { id: 'p-test', jetzt: '2026-10-29T12:00:00.000Z' };
function fixture(name: string): State {
  const h = hydrateState(readFileSync(join(__dirname, '..', '..', 'fixtures', name), 'utf8'), K);
  if (!h.ok) throw new Error(h.text);
  return JSON.parse(JSON.stringify(h.state)) as State;
}
const inAnnahmen = (e: ReturnType<typeof berechne>, w: unknown) => e.annahmen.some((a) => a.wert === w);
const text = (e: ReturnType<typeof berechne>, re: RegExp) => e.annahmen.filter((a) => re.test(a.wert.begruendung)).map((a) => `${a.schritt}: ${a.wert.herkunft} «${a.wert.begruendung.slice(0, 90)}»`);

function oelMitTankstaenden(): State {
  const s = fixture('state-v4-fws-moosseedorf.json');
  s.gebaeude.standort = { plz: '3011', kanton: 'BE' };
  s.verbrauch.wwBisher = false;
  s.verbrauch.eta = {};
  s.verbrauch.reihen = [{ id: 'r-oel', energietraeger: 'heizoel', art: 'lieferungen', ablesungen: [{ id: 'a1', datum: '2023-09-15', bestand: 1200 }, { id: 'a2', datum: '2024-05-20', bestand: 1700 }], lieferungen: [{ id: 'l1', datum: '2023-09-15', menge: 2500 }, { id: 'l2', datum: '2024-01-10', menge: 1800 }] }];
  return s;
}

describe('annahmen[] — Overrides', () => {
  it('θe-Override, Auslegungs-VL-Override, Puffer-Override und U-Override je Raum-Bauteil: in annahmen[] (U-Override seit S12)', () => {
    const rw = fixture('state-v4-raumweise-efh.json');
    const e = berechne(rw, daten);
    expect(e.thetaE.herkunft).toBe('override');
    expect(inAnnahmen(e, e.thetaE)).toBe(true);
    const uOverrides = e.heizlast.raumweise!.raeume.flatMap((r) => r.bauteile.map((b) => b.u)).filter((u) => u.herkunft === 'override');
    expect(uOverrides.length).toBe(9); // 9 Bauteile mit U-Override (die Fixture hat 9, nicht 11: der Flur-Boden und ein Bad-Bauteil haben keinen)
    const drin = uOverrides.filter((u) => inAnnahmen(e, u)).length;
    console.log(`U-Overrides je Raum-Bauteil: ${uOverrides.length}, davon in annahmen[]: ${drin}`);
    expect(drin).toBe(9); // behoben S12 (Prüfbericht §3.2)

    const ov = berechne(setzeImState(rw, 'waermeabgabe.auslegungsVLOverrideC', 60), daten);
    expect(ov.auslegungsVL.herkunft).toBe('override');
    expect(inAnnahmen(ov, ov.auslegungsVL)).toBe(true);
    const pu = berechne(setzeImState(setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'geraet.auswahlId', 'OE-0001'), 'speicher.puffer.volumenOverrideLiter', 500), daten);
    expect(pu.speicher.pufferEffektiv.herkunft).toBe('override');
    console.log(`Puffer-Override in annahmen[]: ${inAnnahmen(pu, pu.speicher.pufferEffektiv)}`);
    const ww = berechne(setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'speicher.ww.volumenOverrideLiter', 400), daten);
    console.log(`WW-Speicher-Override: herkunft=${ww.speicher.ww!.volumenEffektiv.herkunft}, in annahmen[]: ${inAnnahmen(ww, ww.speicher.ww!.volumenEffektiv)}`);
    const tv = berechne(setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'verbrauch.tvollOverride', 2000), daten);
    console.log(`t_voll-Override: herkunft=${tv.heizlast.fws!.tvoll.herkunft}, in annahmen[]: ${inAnnahmen(tv, tv.heizlast.fws!.tvoll)}`);
    const eta = berechne(setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'verbrauch.eta.erdgas', { wert: 0.9 }), daten);
    const t0 = eta.heizlast.fws!.traeger[0]!;
    console.log(`η eigene Angabe: herkunft=${t0.eta.herkunft}, in annahmen[]: ${inAnnahmen(eta, t0.eta)}`);
  });
});

describe('annahmen[] — Heizgradtage und Klimabereinigung', () => {
  it('Öl mit Tankständen (Teilzeitraum, Hochrechnung nach HGT): HGT-Tabellenwert in annahmen[]?', () => {
    const e = berechne(oelMitTankstaenden(), daten);
    const z = e.heizlast.fws!.traeger[0]!.zeitraeume[0]!;
    expect(z.anteilBasis).toBe('hgt');
    console.log(`HGT-Zeitraum: herkunft=${z.hgtIst?.herkunft}/${z.hgtIst?.stufe}, ±${z.hgtIst?.unsicherheit ?? '—'} %, in annahmen[]: ${z.hgtIst ? inAnnahmen(e, z.hgtIst) : '—'}`);
    console.log(`Anteil: herkunft=${z.anteil.herkunft}, ±${z.anteil.unsicherheit ?? '—'} %`);
    console.log('Annahmen mit «HGT»/«Heizgradtag»: ' + JSON.stringify(text(e, /HGT|Heizgradtag/)));
    expect(e.annahmen.length).toBeGreaterThan(0);
  });

  it('Klimabereinigung aktiv: Normjahr-HGT (SIA 2028) in annahmen[]?', () => {
    const s = oelMitTankstaenden();
    s.verbrauch.klimabereinigung = true;
    const e = berechne(s, daten);
    expect(e.heizlast.fws!.klimabereinigungAktiv).toBe(true);
    console.log(`Normjahr-HGT: herkunft=${e.klima!.hgt!.herkunft}, in annahmen[]: ${inAnnahmen(e, e.klima!.hgt!)}`);
    console.log('Annahmen mit «Normjahr»/«Klima»: ' + JSON.stringify(text(e, /Normjahr|Klima|HGT/)));
  });
});

describe('annahmen[] — Standardmasse der Heizflächen', () => {
  it('Guss 10 Glieder H 600 ohne Tiefe: Standard-Bautiefe 160 mm als eigene Annahme oder in Q_N gefaltet?', () => {
    const s = setzeImState(setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'raeume', [{ id: 'r1', name: 'Bad', typ: 'bad', flaecheM2: 10, bauteile: [] }]), 'waermeabgabe.raeume.r1', { heizflaechen: [{ id: 'h1', bauart: 'guss_glieder', hoeheMm: 600, glieder: 10 }] });
    const e = berechne(s, daten);
    const hf = e.waermeabgabe!.raeume[0]!.heizflaechen[0]!;
    console.log(`Q_N: ${hf.qN?.wert} W, herkunft=${hf.qN?.herkunft}, ±${hf.qN?.unsicherheit} %, begründung «${hf.qN?.begruendung}»`);
    console.log(`standardwerte: ${JSON.stringify(hf.standardwerte)}; in annahmen[] (Q_N): ${inAnnahmen(e, hf.qN)}; eigener Eintrag Bautiefe: ${text(e, /Bautiefe/).length > 0}`);
    expect(hf.qN).not.toBeNull();
  });
});
