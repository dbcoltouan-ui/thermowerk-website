import { heizkoerperDaten } from '../../../src/daten/heizkoerper';
import { fwsDaten } from '../../../src/daten/fws';
import { siaDaten } from '../../../src/daten/sia384';
import { normleistung, waermeabgabe } from '../../../src/kern/waermeabgabe';

const hk = heizkoerperDaten();
const daten = { hk, fws: fwsDaten(), sia: siaDaten() };

// (c) FBH in gemischtem Kreis zu klein
const r = waermeabgabe(
  {
    heizkreise: [{ id: 'fbh', tVLC: 35, spreizungK: 7, gemischt: true }],
    raeume: [{ id: 'w', name: 'Wohnen', thetaIntC: 20, phiHLManuellW: 1500, heizflaechen: [{ id: 'f', bauart: 'fbh', flaecheM2: 5, verlegeabstandMm: 100, rlb: 0, kreisId: 'fbh' }] }],
  },
  daten,
);
console.log('gemischt FBH zu klein:', JSON.stringify({ tVLReq: r.raeume[0]!.tVLReq, erreichbar: r.raeume[0]!.erreichbar, deckung: r.raeume[0]!.deckung?.wert, ampel: r.raeume[0]!.ampel, geb: r.gebaeude.auslegungsVL?.wert, gAmpel: r.gebaeude.ampel, urteil: r.gebaeude.urteil, massnahmen: r.raeume[0]!.massnahmen.map((m) => m.text), hinweise: r.hinweise.map((h) => h.code + ': ' + h.text) }, null, 1));

// Platte T22 H300/600/900
for (const h of [300, 600, 900, 1200]) {
  const a = normleistung({ id: 'x', bauart: 'platte_22', hoeheMm: h, laengeMm: 1000 }, hk);
  console.log('T22 H', h, a.qN!.wert, 'W/m²front', (a.qN!.wert / (h / 1000)).toFixed(0), a.qN!.unsicherheit, a.qN!.begruendung);
}
// Guss H600 (snap 580) T110/160/220, Glieder 10
for (const t of [110, 160, 220]) {
  const a = normleistung({ id: 'g', bauart: 'guss_glieder', hoeheMm: 600, tiefeMm: t, glieder: 10 }, hk);
  console.log('Guss H600 T', t, (a.qN!.wert / 10).toFixed(1), 'W/Glied', a.qN!.begruendung);
}
// Guss NA 600 / T 220 (extrapoliert)
const g = normleistung({ id: 'g', bauart: 'guss_glieder', nabenabstandMm: 600, tiefeMm: 220, glieder: 10 }, hk);
console.log('Guss NA600 T220', g.qN!.wert / 10, g.qN!.unsicherheit, g.qN!.begruendung);
// Charleston
for (const s of ['roehren_2', 'roehren_3', 'roehren_4', 'roehren_5', 'roehren_6'] as const) {
  const a = normleistung({ id: 'c', bauart: s, hoeheMm: 600, glieder: 1 }, hk);
  console.log(s, 'H600', a.qN!.wert);
}
// FBH belag raw token
const f = normleistung({ id: 'f', bauart: 'fbh', flaecheM2: 10, belag: 'pvc_linoleum' }, hk);
console.log('FBH belag begruendung:', f.qN!.begruendung);
// Modell-Bauart-Konflikt Hinweis
const m = hk.modelle.find((x) => x.bauart === 'platte_22' && x.hoeheMm === 600)!;
const mm = normleistung({ id: 'm', bauart: 'platte_21', hoeheMm: 600, laengeMm: 1000, modellId: m.id }, hk);
console.log('Modell-Konflikt:', mm.hinweise.map((h) => h.text));
// Platte ohne Masse
const o = waermeabgabe({ raeume: [{ id: 'w', name: 'W', thetaIntC: 20, phiHLManuellW: 1000, heizflaechen: [{ id: 'p', bauart: 'platte_22' }] }] }, daten);
console.log('ohne Masse:', o.raeume[0]!.ampel, o.raeume[0]!.heizflaechen[0]!.qN, o.hinweise.map((h) => h.stufe + ' ' + h.code), o.gebaeude.auslegungsVL, o.vollstaendig);
// Konvektor verkleidet hoch (574 mm Heizwand)
const kv = normleistung({ id: 'k', bauart: 'konvektor_passiv', hoeheMm: 574, tiefeMm: 93, laengeMm: 1000, einbau: 'verkleidet' }, hk);
console.log('Konvektor H574:', kv.qN!.wert, kv.qN!.begruendung);
// Typenschild mit tRaum 24
const ts = normleistung({ id: 't', bauart: 'bad_handtuch', typenschild: { qNW: 500, tVLC: 55, tRLC: 45, tRaumC: 24 } }, hk);
console.log('Typenschild 55/45/24:', ts.qN!.wert.toFixed(1), ts.qN!.begruendung);
