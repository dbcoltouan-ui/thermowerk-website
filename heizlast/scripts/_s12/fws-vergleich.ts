// Session 12 — Vergleich mit dem FWS-Rechner (burner-replacement.suissetec.ch, Version 8.6.3):
// dieselben Eingaben wie die beiden dort gerechneten Beispiele, durch den einen Rechenpfad berechne().
import { berechne } from '../../src/kern/berechne';
import { alleDaten } from '../../src/daten/index';
import { hydrateState } from '../../src/state/hydrate';

const daten = alleDaten();
const K = { id: 'p-fws', jetzt: '2026-10-31T10:00:00.000Z' };

function basis(name: string, verbrauch: Record<string, unknown>, warmwasser: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    meta: { schemaVersion: 4, id: 'p-fws', erstellt: K.jetzt, geaendert: K.jetzt },
    projekt: { name, bezugsdatum: '2026-10-31' },
    methode: 'fws',
    gebaeude: { typ: 'efh', standort: { plz: '3011', ort: 'Bern', kanton: 'BE' }, baujahr: 1975, ebfModus: 'manuell', ebfManuellM2: 180, energiestandard: 'keiner' },
    sanierungen: [],
    verbrauch: { quelle: 'rechnungen', konvention: 'fwsKurs', bedarfsart: 'raumwaerme_wohnen', klimabereinigung: false, abzug: { methode: 'personen', zirkulation: 'keine' }, wpBetriebsstunden: {}, messung: {}, ...verbrauch },
    huelle: { bauteiltypen: [], lueftung: {}, waermebruecken: {}, erdreich: {}, rest: { modus: 'keiner' } },
    raeume: [],
    warmwasser,
    waermeabgabe: { heizkreise: [], raeume: {} },
    zuschlaege: { sperrzeitAktiv: false, zusatz: [] },
    speicher: { ww: {}, puffer: { aktiv: null, einzelraumregelung: false, sperrzeitUeberbrueckung: false }, mag: {} },
    geraet: { quelle: 'luftWasser', auswahlId: null, filterOverrides: {} },
    ...extra,
  };
}

const oelReihe = {
  reihen: [
    {
      id: 'r-oel',
      energietraeger: 'heizoel',
      art: 'lieferungen',
      ablesungen: [
        { id: 'a1', datum: '2023-09-15', bestand: 1200 },
        { id: 'a2', datum: '2024-05-20', bestand: 1700 },
      ],
      lieferungen: [
        { id: 'l1', datum: '2023-09-15', menge: 2500 },
        { id: 'l2', datum: '2024-01-10', menge: 1800 },
      ],
    },
  ],
  eta: { heizoel: { preset: 'alt_ohneWW' } },
  wwBisher: false,
};
const gasReihe = {
  reihen: [
    {
      id: 'r-gas',
      energietraeger: 'erdgas',
      art: 'zaehlerstaende',
      zaehlerstaende: [
        { id: 'z1', datum: '2022-01-01', stand: 10000 },
        { id: 'z2', datum: '2023-01-01', stand: 12500 },
        { id: 'z3', datum: '2024-01-01', stand: 14900 },
        { id: 'z4', datum: '2025-01-01', stand: 17500 },
      ],
    },
  ],
  eta: { erdgas: { preset: 'brennwert' } },
  wwBisher: true,
  abzug: { methode: 'personen', personen: 4, zirkulation: 'keine' },
};

function rechne(name: string, state: unknown) {
  const h = hydrateState(state, K);
  if (!h.ok) throw new Error(`${name}: ${h.text}`);
  if (h.probleme.length) console.log(name, 'Probleme:', h.probleme);
  const e = berechne(h.state, daten);
  const f = e.heizlast.fws!;
  const zeilen = f.traeger.flatMap((t) =>
    t.zeitraeume.map((z) => `    ${new Date(z.zeitraum.vonMs).toISOString().slice(0,10)}–${new Date(z.zeitraum.bisMs).toISOString().slice(0,10)} ${z.zeitraum.tage} d: ${Math.round(z.menge.wert)} ${t.einheit}, HGT ${z.hgtIst ? Math.round(z.hgtIst.wert) : '—'} / Ref ${z.hgtRef ? Math.round(z.hgtRef.wert) : '—'}${z.klimaFaktor !== null ? ` / Klimafaktor ${z.klimaFaktor.toFixed(3)}` : ''}, Anteil ${z.anteil.wert.toFixed(3)} (${z.anteilBasis}), hochgerechnet ${Math.round(z.hochgerechnet.wert)} ${t.einheit}/a`),
  );
  const t0 = f.traeger[0]!;
  console.log(`\n== ${name}`);
  console.log(zeilen.join('\n'));
  console.log(`  Jahresmenge ${Math.round(t0.jahresmenge.wert)} ${t0.einheit}/a · Heizwert ${t0.heizwert.wert} kWh/${t0.einheit} · η ${t0.eta.wert} · t_voll ${f.tvoll.wert} h/a`);
  console.log(`  Q_n brutto ${Math.round(f.qnBrutto!.wert)} kWh/a${f.wwAbzug ? ` · WW-Abzug ${Math.round(f.wwAbzug.wert)} kWh/a` : ''} · Q_n Heizung ${Math.round(f.qnHeizungIst!.wert)} kWh/a`);
  const z = e.zuschlaege;
  console.log(`  Q_hl ${(z.qhl!.wert / 1000).toFixed(2)} kW · Q_w ${z.qw ? (z.qw.wert / 1000).toFixed(2) : '0'} kW · Q_off ${(z.qoff.wert / 1000).toFixed(2)} kW · Q_h ${(z.qh!.wert / 1000).toFixed(2)} kW · spez. ${e.heizlast.spezifisch ? e.heizlast.spezifisch.wert.toFixed(1) : '—'} W/m²`);
  return e;
}

// Öl: WW separat, künftig separat (FWS-Rechner SEPARATE/NO: t_voll 2 150, Hi 9.91, η 0.85, HGT 2 901 → 3 222, 4 220 l/a, Φ_H 16.5 kW)
rechne('Öl Kurs-Konvention, ohne Klimabereinigung', basis('Öl', oelReihe, { wwKuenftig: false }));
rechne('Öl Kurs-Konvention, mit Klimabereinigung (SIA 2028)', basis('Öl', { ...oelReihe, klimabereinigung: true }, { wwKuenftig: false }));
rechne('Öl Hi-Konvention (η-Preset umgerechnet), ohne Klimabereinigung', basis('Öl', { ...oelReihe, konvention: 'hi' }, { wwKuenftig: false }));
rechne('Öl Hi-Konvention mit eigenem η 0.85 (wie FWS-Rechner), ohne Klimabereinigung', basis('Öl', { ...oelReihe, konvention: 'hi', eta: { heizoel: { wert: 0.85 } } }, { wwKuenftig: false }));
rechne('Öl Hi-Konvention, η 0.85, t_voll 2 150 (wie FWS-Rechner), ohne Klimabereinigung', basis('Öl', { ...oelReihe, konvention: 'hi', eta: { heizoel: { wert: 0.85 } }, tvollOverride: 2150 }, { wwKuenftig: false }));
rechne('Öl Sperrzeit 2 h (Kurs)', basis('Öl', oelReihe, { wwKuenftig: false }, { zuschlaege: { sperrzeitAktiv: true, sperrzeitH: 2, zusatz: [] } }));

// Gas: WW bisher über die Heizung, künftig über die WP (FWS-Rechner WITH_HEATING/YES: t_voll 2 450, Hi 10.04, η 0.9, Σ HGT 8 950 → 3 222, 2 700 m³/a, Φ_H 10.0 kW)
rechne('Gas Kurs-Konvention, ohne Klimabereinigung', basis('Gas', gasReihe, { wwKuenftig: true, methode: 'personen', personen: 4, zirkulation: 'keine' }));
rechne('Gas Kurs-Konvention, mit Klimabereinigung (SIA 2028)', basis('Gas', { ...gasReihe, klimabereinigung: true }, { wwKuenftig: true, methode: 'personen', personen: 4, zirkulation: 'keine' }));
rechne('Gas Hi-Konvention, η 0.9, t_voll 2 450, ohne Klimabereinigung (wie FWS-Rechner, aber mit WW-Abzug)', basis('Gas', { ...gasReihe, konvention: 'hi', eta: { erdgas: { wert: 0.9 } }, tvollOverride: 2450 }, { wwKuenftig: true, methode: 'personen', personen: 4, zirkulation: 'keine' }));
rechne('Gas Kurs-Konvention, Bedarfsart Raumwärme + WW (t_voll 2 300), ohne WW-Abzug', basis('Gas', { ...gasReihe, bedarfsart: 'raumwaerme_ww_wohnen', wwBisher: false }, { wwKuenftig: true, methode: 'personen', personen: 4, zirkulation: 'keine' }));
