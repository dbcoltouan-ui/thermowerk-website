import { describe, expect, it } from 'vitest';
import { ladeJson } from './meta.test';

type Geraet = {
  id: string; kategorie: 'heizung' | 'brauchwasser'; marke: string; modell: string;
  heizleistungA7W35KW: number | null; copA2W35: number | null; aufnahmeleistungA2W35KW: number | null;
  vorlaufMaxC: number | null; mindestPufferLiter: number | null; preisChf: number | null; preisHinweis: string | null;
  schallNachtMaxDb: number | null; schallNachtBereich: string | null;
  plausibilitaet: { unplausibel: boolean; verhaeltnisQA2ZuQm7: number | null; hinweis: string | null };
};
type Wp = { _meta: { anzahl: { heizung: number; brauchwasser: number; unplausibel: number } }; geraete: Geraet[] };

const wp = ladeJson<Wp>('waermepumpen.json');
const istZahlOderNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));

describe('waermepumpen.json — Normalisierung (DATA-04/05)', () => {
  it('alle Geräte haben id, kategorie, Marke; IDs eindeutig; Zähler in _meta stimmen', () => {
    const ids = wp.geraete.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of wp.geraete) {
      expect(['heizung', 'brauchwasser']).toContain(g.kategorie);
      expect(g.marke).toBeTruthy();
    }
    expect(wp._meta.anzahl.heizung).toBe(wp.geraete.filter((g) => g.kategorie === 'heizung').length);
    expect(wp._meta.anzahl.brauchwasser).toBe(wp.geraete.filter((g) => g.kategorie === 'brauchwasser').length);
    expect(wp._meta.anzahl.unplausibel).toBe(wp.geraete.filter((g) => g.plausibilitaet.unplausibel).length);
  });

  it('Zahlenfelder sind Zahlen oder null — nie «—» oder Strings', () => {
    for (const g of wp.geraete) {
      for (const k of ['heizleistungA7W35KW', 'copA2W35', 'aufnahmeleistungA2W35KW', 'vorlaufMaxC', 'mindestPufferLiter', 'preisChf', 'schallNachtMaxDb'] as const) {
        expect(istZahlOderNull(g[k]), `${g.id}.${k} = ${String(g[k])}`).toBe(true);
      }
      if (g.schallNachtBereich !== null) expect(g.schallNachtBereich).not.toBe('—');
    }
  });

  it('Brauchwasser-WP (TWH/DHW) sind als brauchwasser markiert und haben keine Heizleistung A−7/W35', () => {
    const ww = wp.geraete.filter((g) => /TWH|DHW/.test(g.modell));
    expect(ww.length).toBe(6);
    for (const g of ww) {
      expect(g.kategorie).toBe('brauchwasser');
      expect(g.heizleistungA7W35KW).toBeNull();
    }
    // Ein Heizungsfilter «Qh ≥ 2.5 kW» darf keine Brauchwasser-WP liefern
    const heiz = wp.geraete.filter((g) => g.kategorie === 'heizung' && (g.heizleistungA7W35KW ?? 0) >= 2.5);
    expect(heiz.some((g) => /TWH|DHW/.test(g.modell))).toBe(false);
  });

  it('Heizungs-WP: Heizleistung > 0, Vorlauf max 55–80 °C, Puffer-Minimum vorhanden', () => {
    for (const g of wp.geraete.filter((x) => x.kategorie === 'heizung')) {
      expect(g.heizleistungA7W35KW, g.id).toBeGreaterThan(0);
      expect(g.vorlaufMaxC, g.id).toBeGreaterThanOrEqual(55);
      expect(g.vorlaufMaxC, g.id).toBeLessThanOrEqual(80);
      expect(g.mindestPufferLiter, g.id).not.toBeNull();
    }
  });

  it('Preis 0 → null mit Hinweis «auf Anfrage» (OE-0011/0012)', () => {
    for (const id of ['OE-0011', 'OE-0012']) {
      const g = wp.geraete.find((x) => x.id === id)!;
      expect(g.preisChf).toBeNull();
      expect(g.preisHinweis).toBe('auf Anfrage');
    }
    for (const g of wp.geraete) if (g.preisChf !== null) expect(g.preisChf).toBeGreaterThan(0);
  });

  it('Plausibilitätsflag: COP×P vs. Q(A−7) ausserhalb 0.75–1.8 wird markiert (DATA-05-Fälle BO-0003, OE-0001)', () => {
    for (const g of wp.geraete.filter((x) => x.kategorie === 'heizung')) {
      const r = g.plausibilitaet.verhaeltnisQA2ZuQm7;
      if (r !== null) expect(g.plausibilitaet.unplausibel).toBe(r < 0.75 || r > 1.8);
      if (g.plausibilitaet.unplausibel) expect(g.plausibilitaet.hinweis).toMatch(/DATA-05/);
    }
    expect(wp.geraete.find((x) => x.id === 'BO-0003')!.plausibilitaet.unplausibel).toBe(true);
    expect(wp.geraete.find((x) => x.id === 'OE-0001')!.plausibilitaet.unplausibel).toBe(true);
    expect(wp.geraete.find((x) => x.id === 'PA-0001')!.plausibilitaet.unplausibel).toBe(false);
  });
});
