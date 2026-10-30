/**
 * Heizgradtage (Session 7b): HGT 20/12 je Zeitraum aus den Monatswerten (data/heizgradtage.json).
 * Sollwerte extern: MeteoSchweiz-Tagesmittel Bern/Zollikofen Januar 2024 (OGD, tre200d0) von Hand summiert;
 * SIA 2028 Tabelle 6 (Mittel 1984–2003) als Kontrolle der Datenbasis.
 */
import { describe, expect, it } from 'vitest';
import { heizgradtageDaten } from '../../src/daten/heizgradtage';
import { klimaDaten } from '../../src/daten/klima';
import { parseDatum } from '../../src/kern/fws';
import { hgtFuerZeitraum, hgtJahresreferenz, hgtVerfuegbar, referenzJahre } from '../../src/kern/heizgradtage';

const hgt = heizgradtageDaten();
const klima = klimaDaten();
const d = (s: string) => parseDatum(s)!;

// Tagesmittel Bern/Zollikofen (BER) 1.–31.1.2024, MeteoSchweiz OGD ogd-smn_ber_d_historical.csv, Spalte tre200d0
const BER_JAN_2024 = [4.3, 5.6, 9.4, 5.9, 3.8, 3.1, 1.4, -2.9, -3.3, -2.8, -2.3, -3, -3.5, -2.4, 1.7, -1.1, 4.4, 5.4, -3.2, -6.8, -4.2, 1.6, 6.7, 10.9, 11, 8, 4.4, 4.3, 3.1, 3.2, 3.2];

describe('Datenbasis heizgradtage.json', () => {
  it('Januar 2024 Bern: Σ (20 − θ) über Tage mit θ < 12 °C aus den Tagesmitteln = 554 Kd (Monatswert der Tabelle)', () => {
    const vonHand = BER_JAN_2024.reduce((s, t) => s + (t < 12 ? 20 - t : 0), 0);
    expect(vonHand).toBeCloseTo(554.1, 1);
    expect(hgt.stationen.bern!.monate['2024']![0]).toBe(Math.round(vonHand));
    expect(hgt.stationen.bern!.monate['2024']![6]).toBe(0); // Juli: kein Heiztag
  });

  it('alle 40 SIA-2028-Stationen vorhanden; eigenes Mittel 1984–2003 trifft SIA 2028 Tabelle 6 auf ±1 %', () => {
    for (const st of klima.stationen) {
      const h = hgt.stationen[st.key];
      expect(h, st.key).toBeDefined();
      expect(h!.abk).toBe(st.abk);
      expect(h!.kontrolle?.sia2028).toBe(st.hgt2012Kd);
      expect(Math.abs(h!.kontrolle?.abweichungProzent ?? 99), `${st.key}: ${h!.kontrolle?.mittel1984_2003} vs ${st.hgt2012Kd}`).toBeLessThanOrEqual(1);
      for (const [jahr, werte] of Object.entries(h!.monate)) {
        expect(werte.length, `${st.key} ${jahr}`).toBeLessThanOrEqual(12);
        for (const w of werte) if (w !== null) expect(w).toBeGreaterThanOrEqual(0);
      }
      // Jahressumme eines ganzen Jahres plausibel: 50–110 % des SIA-Normwerts
      const j2023 = h!.monate['2023']!.reduce((acc: number, w) => acc + (w ?? 0), 0);
      expect(j2023 / st.hgt2012Kd, `${st.key} 2023`).toBeGreaterThan(0.5);
      expect(j2023 / st.hgt2012Kd, `${st.key} 2023`).toBeLessThan(1.1);
    }
  });

  it('Datenbereich: ab 2015-01 bis mindestens 2026-09', () => {
    const v = hgtVerfuegbar('bern', hgt)!;
    expect(v.von).toBe('2015-01');
    expect(v.bis >= '2026-09').toBe(true);
    expect(hgtVerfuegbar('nirgendwo', hgt)).toBeNull();
  });
});

describe('hgtFuerZeitraum', () => {
  it('ganze Monate: Kalenderjahr 2024 Bern = Σ der 12 Monatswerte (2 995 Kd), Herkunft Tabelle', () => {
    const r = hgtFuerZeitraum('bern', d('2024-01-01'), d('2024-12-31'), hgt);
    const soll = hgt.stationen.bern!.monate['2024']!.reduce((acc: number, w) => acc + (w ?? 0), 0);
    expect(r.wert!.wert).toBe(soll);
    expect(soll).toBe(2995);
    expect(r.monate).toHaveLength(12);
    expect(r.teilmonate).toBe(0);
    expect(r.wert!.herkunft).toBe('tabelle');
    expect(r.wert!.stufe).toBe('monate');
  });

  it('Teilmonate anteilig nach Tagen: 16.1.–15.2.2024 = 554 × 16/31 + 400 × 15/29', () => {
    const r = hgtFuerZeitraum('bern', d('2024-01-16'), d('2024-02-15'), hgt);
    expect(r.teilmonate).toBe(2);
    expect(r.wert!.wert).toBe(Math.round((554 * 16) / 31 + (400 * 15) / 29));
    expect(r.wert!.stufe).toBe('teilmonate');
    expect(r.wert!.begruendung).toContain('Teilmonate');
  });

  it('Heizperiode 15.9.2023–20.5.2024 Bern: nur Heizmonate, Anteil am Jahr ≈ 0.95 (Sommer fast ohne HGT)', () => {
    const periode = hgtFuerZeitraum('bern', d('2023-09-15'), d('2024-05-20'), hgt).wert!.wert;
    const jahr = hgtJahresreferenz('bern', d('2024-05-20'), 1, hgt)!.wert;
    expect(periode / jahr).toBeGreaterThan(0.9);
    expect(periode / jahr).toBeLessThan(1);
  });

  it('fehlende Monate (vor 2015, laufender Monat) → null mit Liste; unbekannte Station → null', () => {
    const alt = hgtFuerZeitraum('bern', d('2014-11-01'), d('2015-01-31'), hgt);
    expect(alt.wert).toBeNull();
    expect(alt.fehlend).toEqual(['2014-11', '2014-12']);
    expect(hgtFuerZeitraum('nirgendwo', d('2024-01-01'), d('2024-12-31'), hgt).wert).toBeNull();
    expect(hgtFuerZeitraum('bern', d('2024-02-01'), d('2024-01-01'), hgt).wert).toBeNull();
  });

  it('Jahresreferenz: 12 Monate bis 31.12.2024 = Kalenderjahr 2024; 2 Jahre = Mittel 2023/2024; Referenzjahre nach Länge', () => {
    expect(hgtJahresreferenz('bern', d('2024-12-31'), 1, hgt)!.wert).toBe(2995);
    const m2 = hgtJahresreferenz('bern', d('2024-12-31'), 2, hgt)!.wert;
    const j2023 = hgt.stationen.bern!.monate['2023']!.reduce((acc: number, w) => acc + (w ?? 0), 0);
    expect(m2).toBe(Math.round((2995 + j2023) / 2));
    expect(referenzJahre(248)).toBe(1);
    expect(referenzJahre(366)).toBe(1);
    expect(referenzJahre(367)).toBe(2);
    expect(referenzJahre(879)).toBe(3);
  });
});
