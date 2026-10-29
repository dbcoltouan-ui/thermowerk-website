/**
 * Warmwasser — Sollwerte aus FWS M3 Folien 43/45/48/49/52 und SIA 385/2:2015 (docs/fws/FWS M3_1-25.txt).
 */
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../src/daten/fws';
import { leistungszuschlagWarmwasser, personenbelegung, speicherverlustAusVolumen, warmwasserBedarf } from '../../src/kern/warmwasser';
import { eingabe, istAnnahme } from '../../src/kern/wert';
import { erwarteNahe, pruefeWert } from './hilfen';

const daten = fwsDaten();

describe('Folie 49 — MFH 5 Wohnungen à 150 m², 35 l/P, Speicher 800 l, Zirkulation Rohr-an-Rohr (Länge unbekannt)', () => {
  // Kurs: 2.8 P/Whg (Grafik) → 490 l/d → Q_W,u 28.6; Speicher 3.1 (Diagramm); Zirkulation 4.3; Ausstoss 4.3 → Q_WW 40.3 kWh/d
  const r = warmwasserBedarf({ methode: 'personen', personen: 5 * 2.8, bedarfKey: 'mfh_allgemein', speicherVolumenLiter: 800, zirkulation: { art: 'rohrAnRohr' } }, daten);
  it('V_W,u 490 l/d, Q_W,u 28.6, Speicher 3.1, Zirkulation 4.3, Ausstoss 4.3, Q_WW 40.3 kWh/d (additiv)', () => {
    expect(r.hinweise.filter((h) => h.stufe === 'fehler')).toHaveLength(0);
    expect(r.vwu.wert).toBeCloseTo(490, 6);
    erwarteNahe(r.qwu.wert, 28.6, 0.2, 'Q_W,u');
    expect(r.verluste.speicher.wert).toBeCloseTo(3.1, 2);
    expect(r.verluste.speicher.herkunft).toBe('tabelle');
    erwarteNahe(r.verluste.leitungen.wert, 4.3, 0.5, 'Zirkulation 15 %');
    erwarteNahe(r.verluste.ausstoss.wert, 4.3, 0.5, 'Ausstoss 15 %');
    erwarteNahe(r.qww.wert, 40.3, 0.2, 'Q_WW');
    expect(r.qww.begruendung).toContain('additiv');
    for (const w of [r.vwu, r.qwu, r.qww, r.qnWw, r.verluste.speicher, r.verluste.leitungen, r.verluste.ausstoss]) pruefeWert(w, 'F49');
  });
  it('Folie 52 — Leistungszuschlag: Q_hl 15 kW, Q_WW 40.3 kWh/d → t_d 2.69 h, Q_w 1.89 kW', () => {
    const z = leistungszuschlagWarmwasser(eingabe(15_000, 'W'), r.qww, daten);
    erwarteNahe(z.td.wert, 2.69, 0.5, 't_d');
    erwarteNahe(z.qw.wert, 1_890, 0.5, 'Q_w');
    expect(z.hinweise).toHaveLength(0);
  });
  it('Annahmen enthalten Bedarf je Person (Tabelle), Speicherverlust (Diagramm) und Richtwerte, nicht die Eingaben', () => {
    expect(r.annahmen.every((a) => istAnnahme(a))).toBe(true);
    expect(r.annahmen.some((a) => a.einheit === 'l/(P·d)')).toBe(true);
    expect(r.annahmen.some((a) => a.einheit === 'kWh/d' && a.herkunft === 'tabelle')).toBe(true);
  });
});

describe('Personenbelegung SIA 385/2 (Folie 43/48)', () => {
  it('Formel n_P = 3.3 − 2/(1+(A/100)³): 100 m² → 2.3, 150 m² → 2.84 (Kurs liest 2.8), Stützpunkte der Datei', () => {
    expect(personenbelegung(100, daten)).toBeCloseTo(2.3, 6);
    erwarteNahe(personenbelegung(150, daten), 2.8, 2, '150 m²');
    for (const s of daten.warmwasser.personenbelegung.stuetzpunkte) erwarteNahe(personenbelegung(s.anfM2, daten), s.personen, 1, `${s.anfM2} m²`);
  });
  it('Methode «belegung» summiert die Wohneinheiten (Aufgabe 3: 11 Wohnungen → 26.6 P nach Formel, Kurs 27.4 aus Grafik)', () => {
    const r = warmwasserBedarf({ methode: 'belegung', wohneinheiten: [100, 94, 109, 112, 109, 112, 94, 127, 94, 127, 124].map((anfM2) => ({ anfM2 })), bedarfKey: 'mfh_gehoben', zirkulation: { art: 'keine' } }, daten);
    expect(r.personen!.wert).toBeCloseTo(26.62, 1);
    erwarteNahe(r.personen!.wert, 27.4, 3, 'Belegung');
    expect(r.personen!.herkunft).toBe('berechnet');
    expect(r.vwu.wert).toBeCloseTo(r.personen!.wert * 45, 6);
  });
});

describe('Speicherverlust aus Volumen (Folie 45) und Richtwerte', () => {
  it('Stützpunkte exakt, dazwischen linear, monoton steigend', () => {
    for (const s of daten.warmwasser.verluste.speicher.ausVolumen.stuetzpunkte) expect(speicherverlustAusVolumen(s.liter, daten).wert).toBeCloseTo(s.kwhTag, 2);
    expect(speicherverlustAusVolumen(650, daten).wert).toBeCloseTo(2.8, 2); // zwischen 500 (2.5) und 800 (3.1)
    let letzter = 0;
    for (let v = 50; v <= 3000; v += 50) {
      const w = speicherverlustAusVolumen(v, daten).wert;
      expect(w).toBeGreaterThanOrEqual(letzter);
      letzter = w;
    }
    expect(speicherverlustAusVolumen(2500, daten).herkunft).toBe('schaetzung');
  });
  it('Standardwert 45 l/P·d als Fallback-Annahme («Standardwert»); Speicher 10 % und Ausstoss 15 % ohne Angaben', () => {
    const r = warmwasserBedarf({ methode: 'personen', personen: 4, zirkulation: { art: 'keine' } }, daten);
    expect(r.literProPersonTag!.wert).toBe(45);
    expect(r.literProPersonTag!.herkunft).toBe('fallback');
    expect(r.literProPersonTag!.stufe).toBe('standardwert');
    expect(r.vwu.wert).toBe(180);
    expect(r.verluste.speicher.wert).toBeCloseTo(0.1 * r.qwu.wert, 6);
    expect(r.verluste.ausstoss.wert).toBeCloseTo(0.15 * r.qwu.wert, 6);
    expect(r.verluste.leitungen.wert).toBe(0);
  });
  it('Leitungsverluste aus Länge: Rohr-an-Rohr 0.15 kWh/(m·d), separat 0.12 kWh/(m·d) (SIA 385/2, Folie 46)', () => {
    const a = warmwasserBedarf({ methode: 'direkt', vwuLiterTag: 160, zirkulation: { art: 'rohrAnRohr', laengeM: 20 } }, daten);
    expect(a.verluste.leitungen.wert).toBeCloseTo(3.0, 6);
    const b = warmwasserBedarf({ methode: 'direkt', vwuLiterTag: 160, zirkulation: { art: 'separat', laengeM: 30 } }, daten);
    expect(b.verluste.leitungen.wert).toBeCloseTo(3.6, 6);
  });
});

describe('Messmethode und Leistungszuschlag-Grenzen', () => {
  it('Messung am Erzeuger (inkl. Verluste): Q_WW = kWh/365; Q_W,u zurückgerechnet und als Schätzung markiert', () => {
    const r = warmwasserBedarf({ methode: 'messung', messungKwhA: 20_000, messungEnthaeltVerluste: true, zirkulation: { art: 'keine' } }, daten);
    expect(r.qww.wert).toBeCloseTo(20_000 / 365, 3);
    expect(r.qwu.herkunft).toBe('schaetzung');
    expect(r.qwu.wert).toBeCloseTo(20_000 / 365 / 1.25, 3);
  });
  it('Messung der Nutzwärme (ohne Verluste): Verluste werden addiert', () => {
    const r = warmwasserBedarf({ methode: 'messung', messungKwhA: 20_000, zirkulation: { art: 'keine' } }, daten);
    expect(r.qwu.herkunft).toBe('messung');
    expect(r.qww.wert).toBeCloseTo((20_000 / 365) * 1.25, 3);
  });
  it('kein Clamp bei t_d > 12 h, aber Warnung; t_d ≥ 24 h → Fehler, Q_w 0', () => {
    const lang = leistungszuschlagWarmwasser(eingabe(5_000, 'W'), eingabe(70, 'kWh/d'), daten); // t_d 14 h
    expect(lang.td.wert).toBeCloseTo(14, 6);
    expect(lang.qw.wert).toBeCloseTo(5000 * (24 / 10 - 1), 3);
    expect(lang.hinweise.some((h) => h.code === 'warmwasser.ladezeit.lang')).toBe(true);
    const zuLang = leistungszuschlagWarmwasser(eingabe(2_000, 'W'), eingabe(60, 'kWh/d'), daten); // t_d 30 h
    expect(zuLang.qw.wert).toBe(0);
    expect(zuLang.hinweise.some((h) => h.stufe === 'fehler')).toBe(true);
    const nichts = leistungszuschlagWarmwasser(eingabe(10_000, 'W'), eingabe(0, 'kWh/d'), daten);
    expect(nichts.qw.wert).toBe(0);
  });
  it('Monotonie: mehr Warmwasser ⇒ grösserer Zuschlag', () => {
    let letzter = -1;
    for (const q of [5, 10, 20, 40, 80]) {
      const w = leistungszuschlagWarmwasser(eingabe(10_000, 'W'), eingabe(q, 'kWh/d'), daten).qw.wert;
      expect(w).toBeGreaterThan(letzter);
      letzter = w;
    }
  });
  it('fehlende Pflichtangaben liefern Fehler-Hinweise', () => {
    expect(warmwasserBedarf({ methode: 'personen', zirkulation: { art: 'keine' } }, daten).hinweise.some((h) => h.code === 'warmwasser.personen.fehlt')).toBe(true);
    expect(warmwasserBedarf({ methode: 'direkt', zirkulation: { art: 'keine' } }, daten).hinweise.some((h) => h.code === 'warmwasser.vwu.fehlt')).toBe(true);
    expect(warmwasserBedarf({ methode: 'belegung', zirkulation: { art: 'keine' } }, daten).hinweise.some((h) => h.code === 'warmwasser.belegung.fehlt')).toBe(true);
  });
});
