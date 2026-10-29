/** Zuschläge — Sollwerte aus FWS M3 Folie 31 (Q_hl 10 kW, t_off 4 h → 2.0 kW), Faktor-Tabelle Folie 32, SIA 384/1 Pos. 4.2.1.4. */
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../src/daten/fws';
import { auslegungsleistung, sperrzeitZuschlag, zusatzleistung } from '../../src/kern/zuschlaege';
import { eingabe } from '../../src/kern/wert';
import { pruefeWert } from './hilfen';

const daten = fwsDaten();

describe('Sperrzeit-Zuschlag', () => {
  it('Kursbeispiel Folie 31: 10 kW, 4 h → 2.0 kW', () => {
    const r = sperrzeitZuschlag(eingabe(10_000, 'W'), 4, daten);
    expect(r.qoff.wert).toBeCloseTo(2000, 6);
    expect(r.faktor.wert).toBeCloseTo(1.2, 6);
    pruefeWert(r.qoff, 'Q_off');
  });
  it('Faktor-Tabelle Folie 32 (1.04 … 1.50 für 1–8 h, auf 2 Dezimalen)', () => {
    for (const [h, f] of Object.entries(daten.sperrzeit.faktorTabelle)) {
      expect(sperrzeitZuschlag(eingabe(1000, 'W'), Number(h), daten).faktor.wert).toBeCloseTo(f, 2);
    }
  });
  it('0 h → 0; > 8 h Warnung; ≥ 24 h Fehler; monoton steigend', () => {
    expect(sperrzeitZuschlag(eingabe(10_000, 'W'), 0, daten).qoff.wert).toBe(0);
    expect(sperrzeitZuschlag(eingabe(10_000, 'W'), 10, daten).hinweise.some((h) => h.code === 'sperrzeit.ueberTabelle')).toBe(true);
    const f = sperrzeitZuschlag(eingabe(10_000, 'W'), 24, daten);
    expect(f.qoff.wert).toBe(0);
    expect(f.hinweise.some((h) => h.stufe === 'fehler')).toBe(true);
    let letzter = -1;
    for (let h = 0; h <= 8; h++) {
      const q = sperrzeitZuschlag(eingabe(10_000, 'W'), h, daten).qoff.wert;
      expect(q).toBeGreaterThan(letzter);
      letzter = q;
    }
  });
});

describe('Q_as und Q_h', () => {
  it('Q_as summiert verbundene Systeme; Q_h = Q_hl + Q_w + Q_off + Q_as (Moosseedorf: 8.871 + 0.590 + 0.806 = 10.267)', () => {
    expect(zusatzleistung([]).wert).toBe(0);
    expect(zusatzleistung([{ bezeichnung: 'Pool', leistungW: 3000 }, { bezeichnung: 'Lüftung', leistungW: 1500 }]).wert).toBe(4500);
    const qh = auslegungsleistung({ qhl: eingabe(8871, 'W'), qw: eingabe(590, 'W'), qoff: eingabe(806, 'W'), qas: zusatzleistung([]) });
    expect(qh.wert).toBeCloseTo(10_267, 6);
    expect(qh.begruendung).toContain('Q_h = Q_hl 8.87 + Q_w 0.59 + Q_off 0.81 = 10.27 kW');
    pruefeWert(qh, 'Q_h');
  });
});
