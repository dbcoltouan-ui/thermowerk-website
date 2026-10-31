/**
 * `berechne(state, daten)` — der einzige Rechenpfad (Session 6).
 *
 * Sollwerte extern (keine Zirkelschlüsse, Befund FACH-60):
 *  - FWS: Referenzhaus Moosseedorf (referenz/BEISPIELRECHNUNG.md) mit Handrechnung additiver WW-Verluste wie in
 *    tests/kern/fws.test.ts: Q_hl 9 304.7 W, Q_w 581.0 W, Q_off 845.9 W, Q_h 10 731.6 W (Befund A1 Ho: 9 276 / 10 708).
 *  - raumweise: eigenes CH-EFH von Hand (tests/kern/raumweise.test.ts): Wohnen 2 098.6 W, Bad 570.3 W,
 *    Flur 64.8 W, saldiert 2 678.7 W, EBF 38.5 m² (θe −7 °C als Eingabe in der Fixture).
 *  - Wärmeabgabe: Typ 22 600 × 1000 @ 55/45/20 = 842–873 W je Heizkörper (Purmo/Kermi/KB-E, Befund B1).
 * Zusätzlich ein Snapshot je Modus (Struktur, Status, Hinweis-Codes) gegen unbeabsichtigte Änderungen.
 */
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../src/daten/index';
import type { Ergebnis } from '../../src/kern/berechne';
import { berechne } from '../../src/kern/berechne';
import { neuerState } from '../../src/state/schema';
import type { State } from '../../src/state/schema';
import { setzeImState } from '../../src/state/store';
import { erwarteNahe, pruefeWert } from '../kern/hilfen';
import { fixture, KONTEXT } from './hilfen';

const daten = alleDaten();
const r1 = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

/** Reduzierte, stabile Sicht für den Snapshot. */
function sicht(e: Ergebnis) {
  return {
    massgebend: { wert: r1(e.heizlast.massgebend.wert?.wert), quelle: e.heizlast.massgebend.quelle, art: e.heizlast.massgebend.art, status: e.heizlast.massgebend.status },
    ebf: r1(e.ebf?.wert),
    qh: r1(e.zuschlaege.qh?.wert),
    qw: r1(e.zuschlaege.qw.wert),
    qoff: r1(e.zuschlaege.qoff.wert),
    auslegungsVL: { wert: r1(e.auslegungsVL.wert), herkunft: e.auslegungsVL.herkunft },
    wwSpeicher: r1(e.speicher.ww?.volumenEffektiv.wert),
    puffer: r1(e.speicher.pufferEffektiv.wert),
    mag: r1(e.speicher.mag?.vnMarkt.wert),
    raeume: e.heizlast.raumweise?.raeume.map((r) => [r.id, r1(r.phiHL.wert)]) ?? [],
    waermeabgabe: e.waermeabgabe?.raeume.map((r) => [r.id, r1(r.qZiel?.wert), r1(r.tVLReq?.wert), r.ampel]) ?? [],
    geraete: e.geraet.liste.map((g) => g.id),
    status: e.status,
    vollstaendigkeit: e.vollstaendigkeit.map((f) => `${f.schritt}:${f.pfad}`),
    hinweise: e.hinweise.map((h) => `${h.schritt}:${h.stufe}:${h.code}`),
    annahmen: e.annahmen.length,
  };
}

describe('berechne — FWS-Modus (Moosseedorf)', () => {
  const s = fixture('state-v2-fws-moosseedorf.json');
  const e = berechne(s, daten);

  it('reproduziert die Handrechnung: Q_hl 9.30 kW, Q_w 0.58, Q_off 0.85, Q_h 10.73 kW', () => {
    expect(e.heizlast.massgebend.quelle).toBe('fws');
    expect(e.heizlast.massgebend.status).toBe('gemessen');
    erwarteNahe(e.zuschlaege.qhl!.wert, 9304.7, 0.05, 'Q_hl');
    erwarteNahe(e.zuschlaege.qw.wert, 581.0, 0.1, 'Q_w');
    erwarteNahe(e.zuschlaege.qoff.wert, 845.9, 0.1, 'Q_off');
    erwarteNahe(e.zuschlaege.qh!.wert, 10731.6, 0.05, 'Q_h');
    erwarteNahe(e.zuschlaege.qh!.wert, 10708, 0.5, 'Q_h gegen Befund A1');
    expect(e.heizlast.massgebend.label).toContain('FWS-Kurs');
    expect(e.heizlast.fws!.wwAbzug!.wert).toBeCloseTo(4790.6, 0);
  });

  it('eine Quelle: Q_hl der Zuschläge ist die massgebende Heizlast; EBF = Eingabe; ohne Heizflächen VL = Standardwert 55 °C', () => {
    expect(e.zuschlaege.qhl).toBe(e.heizlast.massgebend.wert);
    expect(e.ebf).toMatchObject({ wert: 150, herkunft: 'eingabe' });
    expect(e.auslegungsVL).toMatchObject({ wert: 55, herkunft: 'fallback', stufe: 'standardwert' });
    expect(e.annahmen.some((a) => a.wert === e.auslegungsVL && a.schritt === 'waermeabgabe')).toBe(true);
    // Gerätefilter nutzt die höhere WW-Ladetemperatur (60 °C Standard) statt der Heizungs-VL
    expect(e.geraet.filterVorlauf!.wert).toBe(60);
    for (const g of e.geraet.liste) expect(g.vorlaufMaxC ?? 99).toBeGreaterThanOrEqual(60);
    // MAG rechnet mit derselben Auslegungs-VL
    expect(e.speicher.mag!.n.begruendung).toContain('55 °C');
  });

  it('Herkunft an jedem Kernwert, Annahmen mit Schritt', () => {
    for (const [w, was] of [[e.zuschlaege.qhl, 'Q_hl'], [e.zuschlaege.qh, 'Q_h'], [e.ebf, 'EBF'], [e.auslegungsVL, 'VL'], [e.speicher.pufferEffektiv, 'Puffer'], [e.speicher.ww?.volumenEffektiv, 'WW-Speicher']] as const) pruefeWert(w, was);
    expect(e.annahmen.length).toBeGreaterThan(5);
    for (const a of e.annahmen) expect(e.relevanteSchritte).toContain(a.schritt);
  });

  it('Snapshot', () => {
    expect(sicht(e)).toMatchSnapshot();
  });
});

describe('berechne — raumweise (CH-EFH von Hand)', () => {
  const s = fixture('state-v2-raumweise-efh.json');
  const e = berechne(s, daten);
  const rw = e.heizlast.raumweise!;

  it('Räume und Gebäude wie Handrechnung (±0.5 %), massgebend = saldiert; θe = Eingabe −7 °C', () => {
    const [w, b, f] = rw.raeume;
    erwarteNahe(w!.phiHL.wert, 2098.6, 0.5, 'Wohnen');
    erwarteNahe(b!.phiHL.wert, 570.3, 0.5, 'Bad');
    erwarteNahe(f!.phiHL.wert, 64.8, 0.5, 'Flur');
    erwarteNahe(e.heizlast.massgebend.wert!.wert, 2678.7, 0.5, 'saldiert');
    expect(e.thetaE).toMatchObject({ wert: -7, herkunft: 'override' });
    expect(rw.thetaE).toBe(e.thetaE);
    expect(e.heizlast.massgebend).toMatchObject({ quelle: 'raumweise', status: 'raumweise' });
    expect(e.heizlast.massgebend.label).toContain('SIA 384/2:2020');
    expect(e.ebf!.wert).toBeCloseTo(38.5, 6);
  });

  it('Wärmeabgabe: 2 × Typ 22 600×1000 bei 55/45 = 2 × (842–873) W; Deckung < 1 → θ_VL,req > 55 °C wird DIE Auslegungs-VL', () => {
    const wohnen = e.waermeabgabe!.raeume.find((r) => r.id === 'wohnen')!;
    expect(wohnen.qZiel!.wert).toBeGreaterThanOrEqual(2 * 842);
    expect(wohnen.qZiel!.wert).toBeLessThanOrEqual(2 * 873);
    expect(wohnen.phiHL).toBe(rw.raeume[0]!.phiHL);
    expect(wohnen.deckung!.wert).toBeLessThan(1);
    expect(wohnen.tVLReq!.wert).toBeGreaterThan(55);
    expect(e.auslegungsVL).toBe(e.waermeabgabe!.gebaeude.auslegungsVL);
    expect(e.auslegungsVL.wert).toBeCloseTo(wohnen.tVLReq!.wert, 6);
    // Gerätefilter und MAG lesen dieselbe VL (keine zweite Vorlauftemperatur, FLOW-01)
    expect(e.geraet.filterVorlauf!.wert).toBeCloseTo(Math.max(e.auslegungsVL.wert, e.speicher.ww!.tLade.wert), 6);
    expect(e.speicher.mag!.n.begruendung).toContain(`${Math.round(e.auslegungsVL.wert)} °C`);
    expect(e.skalen.vorlauf.wert).toBeCloseTo(e.auslegungsVL.wert, 6);
    expect(e.skalen.vorlauf.ampel).toBe('gelb');
  });

  it('Snapshot', () => {
    expect(sicht(e)).toMatchSnapshot();
  });
});

describe('berechne — Fälle und Leitplanken', () => {
  it('leeres Projekt: keine Exception, alles «offen», Q_h null, Status je relevantem Schritt', () => {
    const e = berechne(neuerState(KONTEXT), daten);
    expect(e.zuschlaege.qh).toBeNull();
    expect(e.heizlast.massgebend.status).toBe('fehlt');
    expect(e.vollstaendigkeit.map((f) => f.pfad)).toEqual(expect.arrayContaining(['methode', 'projekt.name', 'gebaeude.baujahr', 'gebaeude.typ', 'warmwasser.wwKuenftig', 'zuschlaege.sperrzeitAktiv']));
    expect(e.relevanteSchritte).not.toContain('verbrauch');
    expect(e.relevanteSchritte).not.toContain('huelle');
    expect(e.status.projekt).toBe('offen');
    expect(e.status.bericht).toBe('offen');
  });

  it('Auftraggeber-Fall: WW bisher über Heizung, künftig separat → Abzug wirkt, kein Q_w, kein WW-Speicher', () => {
    let s = fixture('state-v2-fws-moosseedorf.json');
    s = setzeImState(s, 'warmwasser.wwKuenftig', false);
    const e = berechne(s, daten);
    expect(e.heizlast.fws!.wwAbzug!.wert).toBeCloseTo(4790.6, 0);
    expect(e.warmwasser.bisher).not.toBeNull();
    expect(e.warmwasser.kuenftig).toBeNull();
    expect(e.zuschlaege.qw.wert).toBe(0);
    expect(e.speicher.ww).toBeNull();
    erwarteNahe(e.zuschlaege.qh!.wert, 9304.7 + 845.9, 0.05, 'Q_h ohne Q_w');
    // keine stille Kopplung über den künftigen Ast (UX-13): Personen künftig ändern ändert nichts
    const e2 = berechne(setzeImState(setzeImState(s, 'warmwasser.methode', 'personen'), 'warmwasser.personen', 8), daten);
    expect(e2.zuschlaege.qh!.wert).toBe(e.zuschlaege.qh!.wert);
  });

  it('Modus-Wechsel behält die Daten; massgebend wechselt die Quelle; Gegenprobe nur mit echten Daten', () => {
    const fwsState = fixture('state-v2-fws-moosseedorf.json');
    const umgeschaltet = setzeImState(fwsState, 'methode', 'raumweise');
    const e = berechne(umgeschaltet, daten);
    expect(umgeschaltet.verbrauch.reihen).toHaveLength(1);
    expect(e.heizlast.massgebend.quelle).toBe('raumweise');
    expect(e.heizlast.massgebend.wert).toBeNull(); // keine Räume erfasst
    expect(e.vollstaendigkeit.some((f) => f.pfad === 'raeume')).toBe(true);
    expect(e.heizlast.gegenprobe).toBeNull();

    // raumweise mit echten Rechnungen → Gegenprobe FWS
    let rw = fixture('state-v2-raumweise-efh.json');
    rw = setzeImState(rw, 'verbrauch', { ...fwsState.verbrauch, reihen: [{ id: 'r1', energietraeger: 'erdgas', art: 'zeitraeume', zeitraeume: [{ id: 'v1', menge: 800, jahr: 2024 }] }] });
    const e2 = berechne(rw, daten);
    expect(e2.heizlast.gegenprobe?.methode).toBe('fws');
    expect(e2.heizlast.massgebend.quelle).toBe('raumweise');
    expect(['gruen', 'gelb', 'rot']).toContain(e2.heizlast.gegenprobe!.vergleich.ampel);
  });

  it('Bedarfsart «Raumwärme und Warmwasser» (t_voll 2 300) zusammen mit WW-Abzug oder Q_w → Warnung «doppelt» am Feld (Audit S12, Fachlogik N1)', () => {
    const s = fixture('state-v4-fws-moosseedorf.json');
    const ohne = berechne(s, daten);
    expect(ohne.hinweise.some((h) => h.code === 'tvoll.wwDoppelt')).toBe(false);
    s.verbrauch.bedarfsart = 'raumwaerme_ww_wohnen';
    const e = berechne(s, daten);
    const h = e.hinweise.find((x) => x.code === 'tvoll.wwDoppelt');
    expect(h?.stufe).toBe('warnung');
    expect(h?.pfad).toBe('verbrauch.bedarfsart');
    expect(h?.text).toContain('Abzug');
    expect(h?.text).toContain('Q_w');
    expect(e.heizlast.fws!.tvoll.wert).toBe(2300);
    // ohne Abzug und ohne Q_w (WW separat) ist die Bedarfsart legitim → keine Warnung
    s.verbrauch.wwBisher = false;
    s.warmwasser.wwKuenftig = false;
    expect(berechne(s, daten).hinweise.some((x) => x.code === 'tvoll.wwDoppelt')).toBe(false);
  });
  it('FWS ohne Verbrauch: Bauperioden-Schätzung mit Status «Schätzung»', () => {
    const s = setzeImState(fixture('state-v2-fws-moosseedorf.json'), 'verbrauch.quelle', 'keine');
    const e = berechne(s, daten);
    expect(e.heizlast.massgebend).toMatchObject({ art: 'bauperiode', status: 'schaetzung' });
    expect(e.status.heizlast === 'annahmen' || e.status.heizlast === 'warnung').toBe(true);
    expect(e.heizlast.massgebend.wert!.band).toBeDefined();
  });

  it('Speicher-Overrides wirken überall: Puffer abgewählt → effektiv 0 l; Override → Override', () => {
    let s = fixture('state-v2-fws-moosseedorf.json');
    s = setzeImState(s, 'geraet.auswahlId', 'OE-0001');
    const vorschlag = berechne(s, daten).speicher.pufferEffektiv;
    expect(vorschlag.wert).toBeGreaterThan(0);
    const aus = berechne(setzeImState(s, 'speicher.puffer.aktiv', false), daten);
    expect(aus.speicher.pufferEffektiv.wert).toBe(0);
    expect(aus.speicher.mag!.anlagenvolumen.begruendung).not.toContain('Puffer');
    const ov = berechne(setzeImState(s, 'speicher.puffer.volumenOverrideLiter', 500), daten);
    expect(ov.speicher.pufferEffektiv).toMatchObject({ wert: 500, herkunft: 'override' });
    expect(ov.speicher.mag!.anlagenvolumen.begruendung).toContain('Puffer 500 l');
  });

  it('Gerätewahl: Dimensionierung und Bivalenz aus dem gewählten Gerät; Hersteller-Minimum speist den Puffer', () => {
    const s = setzeImState(fixture('state-v2-fws-moosseedorf.json'), 'geraet.auswahlId', 'OE-0001');
    const e = berechne(s, daten);
    const g = e.geraet.gewaehlt!;
    expect(g.qWp.wert).toBe(11200);
    expect(g.dimensionierung.ampel).toBe('gruen');
    expect(g.bivalenz.monovalent).toBe(true);
    expect(e.status.waermepumpe).not.toBe('offen');
    if (g.mindestPuffer) expect(e.speicher.puffer!.kriterien.some((k) => k.key === 'hersteller')).toBe(true);
    // Prozent-Skala im Ergebnis: Übergrösse 11.2 / 10.73 kW − 1 = +4.4 %, grün
    expect(e.skalen.wpGroesse).toBe(g.dimensionierung.skala);
    expect(e.skalen.wpGroesse.wert).toBeCloseTo((11200 / 10731.6 - 1) * 100, 1);
    expect(e.skalen.wpGroesse.ampel).toBe('gruen');
    // ohne Heizflächen keine Vorlauf-Marke (nur Standardwert)
    expect(e.skalen.vorlauf.wert).toBeNull();
  });

  it('Sanierung raumweise: Massnahme «Fenster» setzt die Fenstertypen auf «saniert ab Jahr» (eine Liste für beide Modi)', () => {
    let s: State = fixture('state-v2-raumweise-efh.json');
    s = setzeImState(s, 'huelle.bauteiltypen', [{ id: 'fe', art: 'fenster' }, { id: 'aw', art: 'aussenwand' }]);
    const vorher = berechne(s, daten).heizlast.huelle!.bauteile;
    s = setzeImState(s, 'sanierungen', [{ id: 's1', massnahme: 'fenster', status: 'ausgefuehrt', datum: '2005' }]);
    const nachher = berechne(s, daten).heizlast.huelle!.bauteile;
    expect(nachher.fe!.u.wert).toBeLessThan(vorher.fe!.u.wert);
    expect(nachher.fe!.sanierungWirkt).toBe(true);
    expect(nachher.aw!.u.wert).toBe(vorher.aw!.u.wert);
  });

  it('θe: ohne Standort Standardwert −8 °C (Annahme); mit Station deren Wert (auch −7 °C); eigene Angabe gewinnt', () => {
    const basis = fixture('state-v2-raumweise-efh.json');
    const ohne = berechne(setzeImState(basis, 'gebaeude.standort', {}), daten);
    expect(ohne.thetaE).toMatchObject({ wert: -8, herkunft: 'fallback', stufe: 'standardwert' });
    expect(ohne.annahmen.some((a) => a.wert === ohne.thetaE && a.schritt === 'gebaeude')).toBe(true);
    expect(ohne.hinweise.some((h) => h.code === 'klima.standardwert')).toBe(true);
    expect(ohne.heizlast.massgebend.wert).not.toBeNull();
    expect(ohne.vollstaendigkeit.some((f) => f.pfad === 'gebaeude.standort')).toBe(false);
    const station = berechne(setzeImState(basis, 'gebaeude.standort', { plz: '3302', kanton: 'BE' }), daten);
    expect(station.thetaE.wert).toBe(-7);
    expect(station.thetaE.herkunft).not.toBe('fallback');
    expect(station.hinweise.some((h) => h.code === 'klima.standardwert')).toBe(false);
    const eigen = berechne(setzeImState(basis, 'gebaeude.standort.thetaEOverrideC', -12), daten);
    expect(eigen.thetaE).toMatchObject({ wert: -12, herkunft: 'override' });
  });

  it('ohne Heizflächen: Standard-VL nach Wärmeabgabesystem (FBH 35 °C, Radiatoren 55 °C), Override gewinnt', () => {
    const basis = fixture('state-v2-fws-moosseedorf.json');
    expect(berechne(basis, daten).auslegungsVL.wert).toBe(55);
    const fbh = berechne(setzeImState(basis, 'waermeabgabe.system', 'fbh'), daten);
    expect(fbh.auslegungsVL).toMatchObject({ wert: 35, herkunft: 'fallback', stufe: 'standardwert' });
    expect(fbh.auslegungsVL.begruendung).toContain('Fussbodenheizung');
    expect(fbh.speicher.mag!.anlagenvolumen.begruendung).toContain('fbh');
    expect(berechne(setzeImState(basis, 'waermeabgabe.system', 'radiatoren'), daten).auslegungsVL.wert).toBe(55);
    const ov = berechne(setzeImState(setzeImState(basis, 'waermeabgabe.system', 'fbh'), 'waermeabgabe.auslegungsVLOverrideC', 40), daten);
    expect(ov.auslegungsVL).toMatchObject({ wert: 40, herkunft: 'override' });
  });

  it('Heizflächen eines gelöschten Raums werden ignoriert und gemeldet', () => {
    let s = fixture('state-v2-raumweise-efh.json');
    s = { ...s, raeume: s.raeume.filter((r) => r.id !== 'wohnen') };
    const e = berechne(s, daten);
    expect(e.hinweise.some((h) => h.code === 'waermeabgabe.raumFehlt')).toBe(true);
    expect(e.waermeabgabe?.raeume.some((r) => r.id === 'wohnen') ?? false).toBe(false);
  });
});

describe('berechne — FWS mit Räumen nur für Heizflächen (Session 8)', () => {
  // Moosseedorf Q_hl 9 304.7 W (Handrechnung), EBF 150 m², FWS Folie 33: EBF ≈ NWF × 1.10
  // → Raum 20 m²: 9 304.7 / 150 × 1.10 × 20 = 1 364.7 W (Verteilung nach Fläche, Schätzung).
  const basis = fixture('state-v4-fws-moosseedorf.json');
  const mitRaum = setzeImState(basis, 'raeume', [{ id: 'r1', name: 'Wohnen', typ: 'wohnen', flaecheM2: 20, bauteile: [] }]);

  it('Raumheizlast ist schon ohne Heizfläche sichtbar; Auslegungs-VL bleibt der Standardwert', () => {
    const e = berechne(mitRaum, daten);
    const r = e.waermeabgabe!.raeume[0]!;
    erwarteNahe(r.phiHL!.wert, 1364.7, 0.1, 'Φ_HL verteilt');
    expect(r.phiHL!.herkunft).toBe('schaetzung');
    expect(e.auslegungsVL).toMatchObject({ wert: 55, herkunft: 'fallback' });
    expect(e.zuschlaege.qh!.wert).toBeCloseTo(berechne(basis, daten).zuschlaege.qh!.wert, 6);
  });

  it('Guss 10 Glieder H 600 im Raum → θ_VL,req wird die eine Auslegungs-VL (Gerätefilter, MAG)', () => {
    // 10 m² → Φ_HL ≈ 682 W; Q_N ≈ 960 W (Befund B2: 96 W/Glied) → erreichbar unter 90 °C
    const s = setzeImState(setzeImState(mitRaum, 'raeume.r1.flaecheM2', 10), 'waermeabgabe.raeume.r1', { heizflaechen: [{ id: 'h1', bauart: 'guss_glieder', hoeheMm: 600, glieder: 10 }] });
    const e = berechne(s, daten);
    const r = e.waermeabgabe!.raeume[0]!;
    expect(r.tVLReq).not.toBeNull();
    expect(e.auslegungsVL.wert).toBeCloseTo(r.tVLReq!.wert, 6);
    expect(e.geraet.filterVorlaufStandard!.wert).toBeGreaterThanOrEqual(r.tVLReq!.wert - 1e-6);
    expect(e.speicher.mag!.n.begruendung).toContain(`${Math.round(r.tVLReq!.wert)} °C`);
  });
});
