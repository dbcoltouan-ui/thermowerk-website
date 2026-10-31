/**
 * Audit S12 — Fachlogik: FACH-60 (Sollwerte der Kern-Tests extern belegt?) und Kurzproben zu den MITTEL-Befunden
 * (FACH-08, 09, 10, 11, 12, 13, 14, 24–29, 40, 41, 50, 51).
 *
 * FACH-60: Die Sollwerte in tests/kern/fws.test.ts werden hier gegen den Textdump der Kurslösungen geprüft
 * (docs/fws/FWS M3_Aufgaben und Lösungen 1-25.txt) — jede Zahl muss dort wörtlich stehen. Zusätzlich Folie 37
 * (W/m²-Bänder) und Folie 36 (kWh/m²a) gegen fws.json.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { heizlastFws } from '../../../src/kern/fws';
import { spezifischeHeizleistung } from '../../../src/kern/plausi';
import { wwSpeicher } from '../../../src/kern/speicher';
import { leistungszuschlagWarmwasser, warmwasserBedarf } from '../../../src/kern/warmwasser';
import { eingabe } from '../../../src/kern/wert';
import { sperrzeitZuschlag } from '../../../src/kern/zuschlaege';
import type { State } from '../../../src/state/schema';
import { setzeImState } from '../../../src/state/store';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
const docs = (name: string) => readFileSync(join(__dirname, '..', '..', '..', 'docs', 'fws', name), 'utf8');
const loesungen = docs('FWS M3_Aufgaben und Lösungen 1-25.txt');
const skript = docs('FWS M3_1-25.txt');
const kernTest = readFileSync(join(__dirname, '..', '..', 'kern', 'fws.test.ts'), 'utf8');

describe('FACH-60 — Sollwerte der Kern-Tests sind Kurslösungen (Stichprobe ≥ 5), keine Code-Ableitungen', () => {
  const stichprobe: [string, string, RegExp][] = [
    ['A1 Q_hl 12.5 kW', '24’990 [kWh/a] / 2\'000 [h/a] = 12.5 KW', /12_500, 1, 'Q_hl'/],
    ['A1 Q_off 1.14 kW', '(24/(24-2)-1) = 1.14 KW', /1_140, 1, 'Q_off'/],
    ['1B Q_n 33 295 kWh/a', "= 33'295 KWh/a", /33_295, 3/],
    ['1B Q_h,WP 19.98 kW', '16.65 KW+3.33 KW=19.98 KW', /19_980, 1, 'Q_h'/],
    ['A2 Q_hl 12.55 kW', "25’091 [kWh/a] / 2'000 [h/a] = 12.55 KW", /12_550, 1, 'Q_hl'/],
    ['A2 saniert 8.8 kW', '12.55 KW * 0.85 * 0.92 * 0.9 = 8.8 KW', /8_830, 1, 'Q_hl korr'/],
    ['A3 Q_w 5.64 kW', '(24/(24-7.9)-1) = 5.64 KW', /5_640, 2, 'Q_w/],
    ['A4 Q_hl 8.4 kW', '16’800 [KWh/a] / 2000 = 8.4 [KW]', /toBeCloseTo\(8_400, 6\)/],
    ['A4 Betriebsstunden neu 1813 h/a', '21\'756 [kWh/a] / 12 [KW] = 1813 h/a', /toBeCloseTo\(1813, 0\)/],
    ['A4 Entzug 57 W/m', '9.14 KW / 160m= 57 W/m', /57, 1, 'spez. Entzug'/],
  ];
  it.each(stichprobe)('%s: steht wörtlich in der Kurslösung und wird im Kern-Test als Soll verwendet', (_name, kursText, testMuster) => {
    expect(loesungen).toContain(kursText);
    expect(kernTest).toMatch(testMuster);
  });
  it('Folie 49/52 (40.3 kWh/d, 2.69 h, 1.89 kW) stehen im Skript und in tests/kern/warmwasser.test.ts', () => {
    for (const z of ['= 40.3 kWh/d', 'td = 2.69 h', 'Qw = 1.89 KW']) expect(skript).toContain(z);
    const ww = readFileSync(join(__dirname, '..', '..', 'kern', 'warmwasser.test.ts'), 'utf8');
    expect(ww).toMatch(/40\.3, 0\.2/);
    expect(ww).toMatch(/2\.69, 0\.5/);
    expect(ww).toMatch(/1_890, 0\.5/);
  });
  it('Folie 36/37-Bänder in fws.json entsprechen dem Skript (Stichprobe 1971–1980 EFH 70–125 kWh/m²a und 35–63 W/m²; 2011–heute MFH 15–20 W/m²)', () => {
    const p = daten.fws.bauperioden.perioden.find((x) => x.von === 1971)!;
    expect(p.kwhM2a.efh).toEqual([70, 125]);
    expect(p.wM2.efh).toEqual([35, 63]);
    expect(skript).toMatch(/1971 – 1980\s+70 – 125\s+75 – 115/);
    expect(skript).toMatch(/1971 – 1980\s+35 – 63\s+38 – 58/);
    const neu = daten.fws.bauperioden.perioden.find((x) => x.von === 2011)!;
    expect(neu.wM2.mfh).toEqual([15, 20]);
    expect(skript).toMatch(/2011 – heute\s+15 – 23\s+15 – 20/);
  });
  it('Kein Kern-Test prüft eine Formel gegen sich selbst (keine Zeile der Form expect(x).toBeCloseTo(x…) mit identischem Ausdruck)', () => {
    const zeilen = kernTest.split('\n').filter((l) => /toBeCloseTo\(/.test(l));
    for (const l of zeilen) {
      const m = /expect\(([^)]*\))\)?\.toBeCloseTo\(([^,]+),/.exec(l);
      if (m) expect(m[1]!.trim(), l).not.toBe(m[2]!.trim());
    }
  });
});

describe('MITTEL-Kurzproben (FWS)', () => {
  const basis = (): State => fixture('state-v4-fws-moosseedorf.json');

  it('FACH-08: Sperrzeit = eine kumulierte Tageszahl; Kurs-Folie 31 Q_hl 10 kW, 4 h → Q_off 2.0 kW; > 8 h Warnung; 23 h kein Faktor 23, ≥ 24 h Fehler', () => {
    const r4 = sperrzeitZuschlag(eingabe(10_000, 'W'), 4, daten.fws);
    expect(r4.qoff.wert).toBeCloseTo(2000, 6);
    expect(sperrzeitZuschlag(eingabe(10_000, 'W'), 10, daten.fws).hinweise.some((h) => h.code === 'sperrzeit.ueberTabelle')).toBe(true);
    expect(sperrzeitZuschlag(eingabe(10_000, 'W'), 23, daten.fws).qoff.wert).toBeCloseTo(10_000 * 23, 3); // Formel 24/(24−23)−1 = 23 (mathematisch korrekt, mit Warnung)
    expect(sperrzeitZuschlag(eingabe(10_000, 'W'), 24, daten.fws).hinweise.some((h) => h.stufe === 'fehler')).toBe(true);
    expect(JSON.stringify(basis().zuschlaege)).not.toMatch(/werktag|sonntag/i);
  });

  it('FACH-09: kein 12-h-Clamp der Ladezeit; t_d 14 h → Q_w nach Formel mit Warnung', () => {
    const z = leistungszuschlagWarmwasser(eingabe(10_000, 'W'), eingabe(140, 'kWh/d'), daten.fws);
    expect(z.td.wert).toBeCloseTo(14, 6);
    expect(z.qw.wert).toBeCloseTo(10_000 * (24 / 10 - 1), 3);
    expect(z.hinweise.some((h) => h.code === 'warmwasser.ladezeit.lang')).toBe(true);
  });

  it('FACH-10: Methode ist explizit (State verbrauch.quelle); Bauperiode nur mit quelle «keine», mit Band und Warnung; keine stille Priorität', () => {
    const s = setzeImState(setzeImState(basis(), 'verbrauch.quelle', 'keine'), 'verbrauch.wwBisher', false);
    const e = berechne(s, daten);
    expect(e.heizlast.massgebend.status).toBe('schaetzung');
    expect(e.heizlast.fws!.bauperiodeBand!.kwhM2a).toEqual([60, 95]); // 1986–1990 EFH
    expect(e.heizlast.massgebend.wert!.band).toBeDefined();
    expect(e.hinweise.some((h) => h.code === 'bauperiode.fallback')).toBe(true);
    // gleiche Fixture mit Rechnungen UND WP-Zähler-Feldern: nur die gewählte Quelle zählt
    const s2 = setzeImState(basis(), 'verbrauch.wpBetriebsstunden', { zaehlerH: 14_000, betriebsjahre: 10, qWpW: 12_000 });
    expect(berechne(s2, daten).heizlast.fws!.methode).toBe('verbrauch');
  });

  it('FACH-11: Puffer = max(Hersteller-Minimum, Quellen-Kriterium) mit Bezug Q_WP (nicht 20 l/kW Q_h); ohne Gerät Warnung statt Pauschale', () => {
    const ohne = berechne(basis(), daten);
    expect(ohne.speicher.puffer!.massgebend).toBe('keins');
    expect(ohne.hinweise.some((h) => h.code === 'puffer.qWp.fehlt')).toBe(true);
    const id = ohne.geraet.liste[0]!.id;
    const mit = berechne(setzeImState(basis(), 'geraet.auswahlId', id), daten);
    const p = mit.speicher.puffer!;
    expect(p.kriterien.some((k) => k.key === 'abtau' && /l\/kW × Q_WP/.test(k.liter.begruendung))).toBe(true);
    expect(p.volumen.begruendung).toMatch(/^V_Puffer = max\(/);
    expect(p.volumen.wert).toBeCloseTo(Math.max(...p.kriterien.map((k) => k.liter.wert)), 6);
    expect(JSON.stringify(daten.fws.puffer)).not.toMatch(/20 l\/kW Q_h\b/);
  });

  it('FACH-12/13: f_sto als Annahme mit Quelle markiert; ΔT = T_Lade − 10 (eine Regel): 55 °C → 45 K', () => {
    const r = wwSpeicher({ qwwKwhTag: eingabe(13.28, 'kWh/d'), tLadeC: 55 }, daten.fws);
    expect(r.deltaT.wert).toBe(45);
    expect(r.fSto.herkunft).toBe('fallback');
    expect(r.fSto.quelle ?? r.fSto.begruendung).toBeTruthy();
    expect(basis().speicher.ww).not.toHaveProperty('dT');
    expect(basis().warmwasser).not.toHaveProperty('dT');
  });

  it('FACH-14: «WW bisher über Heizung?» und «WW künftig über WP?» sind zwei explizite Fragen ohne stille Kopplung', () => {
    const s = basis();
    expect(s.verbrauch.wwBisher).toBe(true);
    expect(s.warmwasser.wwKuenftig).toBe(true);
    const nurBisher = berechne(setzeImState(s, 'warmwasser.wwKuenftig', false), daten);
    expect(nurBisher.heizlast.fws!.wwAbzug!.wert).toBeGreaterThan(0);
    expect(nurBisher.zuschlaege.qw.wert).toBe(0);
    expect(nurBisher.warmwasser.kuenftig).toBeNull();
    const nurKuenftig = berechne(setzeImState(s, 'verbrauch.wwBisher', false), daten);
    expect(nurKuenftig.heizlast.fws!.wwAbzug).toBeNull();
    expect(nurKuenftig.zuschlaege.qw.wert).toBeGreaterThan(0);
    const offen = berechne(setzeImState(s, 'verbrauch.wwBisher', null), daten);
    expect(offen.vollstaendigkeit.some((f) => f.pfad === 'verbrauch.wwBisher')).toBe(true);
  });

  it('FACH-40/41: WW-Verluste additiv (Folie 49: 28.6 + 3.1 + 4.3 + 4.3 = 40.3); nur ein WW-Modul (warmwasser.ts), fws.ts rechnet kein WW', () => {
    const r = warmwasserBedarf({ methode: 'personen', personen: 14, bedarfKey: 'mfh_allgemein', speicherVolumenLiter: 800, zirkulation: { art: 'rohrAnRohr' } }, daten.fws);
    expect(r.qww.wert).toBeCloseTo(28.58 + 3.1 + 0.15 * 28.58 * 2, 1);
    const fwsQuelle = readFileSync(join(__dirname, '..', '..', '..', 'src', 'kern', 'fws.ts'), 'utf8');
    expect(fwsQuelle).not.toMatch(/function (qnwwJahr|qwDetail|speichervolumen|effectiveVWu)/);
  });

  it('FACH-50: Plausi-Band gilt für den UNSANIERTEN Zustand (qhlUnsaniert), ±15 % gelb, Minergie-P 8–12; Sanierung macht die Ampel nicht «rot unten»', () => {
    const s = setzeImState(setzeImState(basis(), 'verbrauch.wwBisher', false), 'sanierungen', [{ id: 's1', massnahme: 'fassade', status: 'ausgefuehrt', datum: '2010-06' }]);
    const e = berechne(s, daten);
    // Q_hl,ist 11.7 kW (Fassade bereits im Verbrauch enthalten) → unsaniert 11.7/0.68 = 17.2 kW → 114.7 W/m² → rot (über Band 30–48!)
    expect(e.plausi.spezifisch!.spez.wert).toBeCloseTo(e.heizlast.fws!.qhlUnsaniert!.wert / 150, 6);
    expect(e.plausi.spezifisch!.bandLabel).toContain('unsaniert');
    expect(daten.fws.plausibilitaet.bandToleranzProzent).toBe(15);
    const mp = spezifischeHeizleistung({ qhlUnsaniertW: eingabe(1500, 'W'), ebfM2: eingabe(150, 'm²'), baujahr: 2015, gebaeudetyp: 'efh', energiestandard: 'minergieP' }, daten.fws);
    expect(mp.band).toEqual([8, 12]);
    expect(mp.ampel).toBe('gruen');
  });

  it('FACH-51: Vergleich Norm/Verbrauch grün bei +10…25 %, gelb 0…10 und 25…40, rot darunter/darüber (fws.json); Text ohne Verweis auf fehlende Klimakorrektur', () => {
    const p = daten.fws.plausibilitaet;
    expect(p.qhlNormMinusVerbrauchErwartungProzent).toEqual([10, 25]);
    expect(p.vergleichNormVerbrauch.gelbBisProzent).toBe(40);
    const r = heizlastFws({ methode: 'messung', tvoll: { hoeheM: 500 }, messung: { qnHeizungKwhA: 20_000 } }, daten.fws);
    expect(r.qhl!.wert).toBe(10_000);
  });
});

describe('MITTEL-Kurzproben (raumweise, Daten)', () => {
  it('FACH-27: Baujahr ist eine Zahl (gebaeude.baujahr), Epoche daraus (1977 → 1961_1977, 1978 → 1978_1994); keine globale Klasse «teilsaniert»', () => {
    const s = fixture('state-v4-raumweise-efh.json');
    expect(typeof s.gebaeude.baujahr).toBe('number');
    expect(berechne(setzeImState(s, 'gebaeude.baujahr', 1977), daten).heizlast.huelle!.epoche).toBe('1961_1977');
    expect(berechne(setzeImState(s, 'gebaeude.baujahr', 1978), daten).heizlast.huelle!.epoche).toBe('1978_1994');
    expect(JSON.stringify(s)).not.toMatch(/teilsaniert|sanierungsstand/);
  });
  it('FACH-28/29: eine Fenstertabelle Generation × Rahmen (Einfachglas Holz 4.8, 2-IV Luft 2.7 Default 1965); kein toter Doppelmauerwerk-Zweig (Schichtfolge Aussenschale = Backstein)', () => {
    const f = daten.huelle.fenster;
    expect(f.generationen.find((g) => g.key === 'einfach')!.uwJeUf[0]).toBe(4.8);
    const e = berechne(fixture('state-v4-raumweise-efh.json'), daten);
    const aw = e.heizlast.huelle!.bauteile['std-aussenwand']!;
    expect(aw.schichten.find((x) => x.rolle === 'aussenschale')!.material).toBe('sichtbackstein');
    expect(aw.schichten.map((x) => x.rolle)).toEqual(['innen', 'tragschicht', 'luftschicht', 'aussenschale', 'aussen']);
  });
  it('FACH-26: keine n50/e/ε-Parameter im raumweisen Kern; n_min-Tabelle NA.7 mit Dichtheit (Fenster ersetzt → neubau)', () => {
    const rw = readFileSync(join(__dirname, '..', '..', '..', 'src', 'kern', 'raumweise.ts'), 'utf8');
    expect(rw).not.toMatch(/n50\s*[*·]|fRH|f_RH\s*[*·]/);
    const s = fixture('state-v4-raumweise-efh.json');
    const neu = berechne(setzeImState(s, 'huelle.lueftung', { konzept: 'natuerlich', fensterErsetzt: true }), daten);
    expect(neu.heizlast.raumweise!.nMinDichtheit).toBe('neubau');
    expect(neu.heizlast.raumweise!.raeume[0]!.nMin.wert).toBe(0.3);
  });
});
