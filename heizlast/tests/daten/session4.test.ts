/** Datenergänzungen Session 4: Schichtvorlagen/Innenbauteile (huelle-epochen 1.1.0), Erdreich-Formel (sia384-2 1.1.0), Jahresmittel-Regression (klimastationen 1.1.0), EBF-Faktor (fws 1.2.0). */
import { describe, expect, it } from 'vitest';
import { ladeJson } from './meta.test';

type Schicht = { material?: string; daemmstoff?: string; dickeM: number; rolle: string; label: string };
type Huelle = {
  _meta: { version: string };
  materialien: Record<string, { lambda: number | null }>;
  daemmstoffe: Record<string, { lambda: number }>;
  bauweisen: Record<string, Record<string, { schichten?: Schicht[]; uPauschal?: number; traglschicht?: string; epochenTypisch: string[] }>>;
  bauteile: Record<string, { epochen: Record<string, { bauweise: string }> }>;
  innenbauteile: { innenwand: Innen; innendecke: Innen; innentuer: Innen; quelle: string[] };
};
type Innen = { richtung: string; default: string; bauweisen: Record<string, { label: string; schichten?: Schicht[]; uPauschal?: number }> };
type Klima = { _meta: { version: string }; jahresmittel: { aC: number; bKPro100m: number; unsicherheitK: number; rmseK: number }; vergleichSia381_2: { stationen: { hoeheM: number; jahresmittelC: number }[] } };
type Sia = { _meta: { version: string }; erdreich: { formelIso13370: { wandDickeDefaultM: number; rsiAbwaerts: number; bStrichDefaultM: number }; faktoren: { fG1: number } } };
type Fws = { _meta: { version: string }; ebf: { faktorNwfZuEbf: { typ: number; spanne: number[] } } };

const h = ladeJson<Huelle>('huelle-epochen.json');
const k = ladeJson<Klima>('klimastationen.json');
const s = ladeJson<Sia>('sia384-2.json');
const f = ladeJson<Fws>('fws.json');

function schichtenGueltig(schichten: Schicht[], wo: string) {
  for (const x of schichten) {
    if (x.daemmstoff) expect(h.daemmstoffe[x.daemmstoff], `${wo}: Dämmstoff ${x.daemmstoff}`).toBeDefined();
    else expect(h.materialien[x.material!], `${wo}: Material ${x.material}`).toBeDefined();
    expect(x.dickeM, wo).toBeGreaterThan(0);
    expect(x.rolle.length, wo).toBeGreaterThan(0);
  }
}

describe('huelle-epochen.json 1.1.0 — jede Bauweise ist auflösbar (Epochen-Default, Schichtvorlage oder Pauschal-U)', () => {
  it('alle Bauweisen haben einen Pfad; Vorlagen verwenden nur bekannte Materialien', () => {
    expect(h._meta.version).toBe('1.1.0');
    for (const [art, bws] of Object.entries(h.bauweisen)) {
      const defaults = new Set(Object.values(h.bauteile[art]!.epochen).map((e) => e.bauweise));
      for (const [key, bw] of Object.entries(bws)) {
        const ok = defaults.has(key) || !!bw.schichten || bw.uPauschal !== undefined;
        expect(ok, `${art}/${key} ohne Default, Vorlage oder Pauschal-U`).toBe(true);
        if (bw.schichten) schichtenGueltig(bw.schichten, `${art}/${key}`);
        if (bw.traglschicht) expect(h.materialien[bw.traglschicht], `${art}/${key} Tragschicht`).toBeDefined();
      }
    }
    expect(h.bauweisen.bodenKeller!.gewoelbe!.uPauschal).toBe(1.5);
  });
  it('Innenbauteile: Default existiert, Schichten gültig, Innentür 2.0 (Wissensbasis B Tab. 3.6)', () => {
    for (const art of ['innenwand', 'innendecke', 'innentuer'] as const) {
      const ib = h.innenbauteile[art];
      expect(ib.bauweisen[ib.default], art).toBeDefined();
      expect(['horizontal', 'aufwaerts', 'abwaerts']).toContain(ib.richtung);
      for (const [key, bw] of Object.entries(ib.bauweisen)) {
        expect(!!bw.schichten || bw.uPauschal !== undefined, `${art}/${key}`).toBe(true);
        if (bw.schichten) schichtenGueltig(bw.schichten, `${art}/${key}`);
      }
    }
    expect(h.innenbauteile.innentuer.bauweisen.holz!.uPauschal).toBe(2.0);
    expect(h.innenbauteile.quelle).toContain('tw-session4');
  });
});

describe('klimastationen.json 1.1.0 — Jahresmittel-Regression', () => {
  it('θm,e ≈ 11.5 − 0.5 K/100 m reproduziert die 53 SIA-381/2-Stationen < 2000 m mit RMSE ≤ 1 K', () => {
    expect(Number(k._meta.version.split('.')[1])).toBeGreaterThanOrEqual(1); // ≥ 1.1.0 (Session 6: 1.2.0 standardThetaE)
    const j = k.jahresmittel;
    const pts = k.vergleichSia381_2.stationen.filter((x) => x.hoeheM < 2000);
    expect(pts.length).toBeGreaterThanOrEqual(50);
    const se = pts.reduce((acc, x) => acc + (x.jahresmittelC - (j.aC + (j.bKPro100m * x.hoeheM) / 100)) ** 2, 0);
    const rmse = Math.sqrt(se / pts.length);
    expect(rmse).toBeLessThanOrEqual(1.0);
    expect(rmse).toBeCloseTo(j.rmseK, 0);
    expect(j.unsicherheitK).toBe(1);
  });
});

describe('sia384-2.json 1.1.0 und fws.json 1.2.0', () => {
  it('Erdreich-Formelparameter (Wand 0.3 m, Rsi 0.17, B\' Standard 5 m, f_g1 1.45); EBF-Faktor 1.10 (Spanne 1.10–1.15, Folie 33)', () => {
    expect(s._meta.version).toBe('1.1.0');
    expect(s.erdreich.formelIso13370).toMatchObject({ wandDickeDefaultM: 0.3, rsiAbwaerts: 0.17, bStrichDefaultM: 5 });
    expect(s.erdreich.faktoren.fG1).toBe(1.45);
    expect(Number(f._meta.version.split('.')[1])).toBeGreaterThanOrEqual(2); // ≥ 1.2.0 (Session 6: 1.3.0 geraetewahl)
    expect(f.ebf.faktorNwfZuEbf).toEqual({ typ: 1.1, spanne: [1.1, 1.15] });
  });
});
