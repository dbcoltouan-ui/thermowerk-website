/**
 * Audit S12, Durchlauf 2 — Sichtung: Fixture `tests/fixtures/state-v4-raumweise-238-5.json` (e2e/abnahme.spec.ts «Referenzhaus 238/5»)
 * bildet die Formblatt-Bauteile wie `raum238` in tests/kern/raumweise.test.ts ab (Flur mit den 8 Innenbauteilen zu den
 * Nachbarräumen). Sollwerte: referenz/referenzhaus-etagenwohnung.json (Formblätter R/G1/G2/V), Toleranzen wie im e2e-Test.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
type RefBauteil = { label: string; typ: string; u: number; A: number; fRT: number; thetaNb?: number; anschluss?: string };
type RefRaum = { id: number; name: string; tint: number; nmin: number; geometrie: { A: number; h: number }; bauteile: RefBauteil[]; soll: Record<string, number> };
const ref = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'referenz', 'referenzhaus-etagenwohnung.json'), 'utf8')) as { raeume: RefRaum[]; soll_gebaeude: Record<string, number> };
const pct = (ist: number, soll: number) => (Math.abs(ist - soll) / Math.abs(soll)) * 100;

describe('Sichtung — Fixture 238/5 gegen die Formblätter', () => {
  const s = fixture('state-v4-raumweise-238-5.json');
  const e = berechne(s, daten);
  const rw = e.heizlast.raumweise!;

  it('Abbildung: je Raum dieselben Bauteile (Fläche, U, Anschluss) wie das Formblatt; Flur zusätzlich 8 Innenbauteile zu Küche/Dusche/Wohnen/Schlafen', () => {
    for (const r of ref.raeume) {
      const fx = s.raeume.find((x) => x.id === `r${r.id}`)!;
      expect(fx.thetaIntC).toBe(r.tint);
      expect(fx.flaecheM2).toBeCloseTo(r.geometrie.A, 6);
      expect(fx.nMinOverride).toBe(r.nmin);
      for (const [i, b] of r.bauteile.entries()) {
        const fb = fx.bauteile[i]!;
        expect(fb.bezeichnung).toBe(b.label);
        expect(fb.flaecheM2).toBeCloseTo(b.A, 6);
        expect(fb.uOverride).toBeCloseTo(b.u, 6);
        if (b.typ === 'AW' || b.typ === 'AF') expect(fb.anschluss.art).toBe('aussen');
        else if (b.anschluss === 'unbeheizt') expect(fb.anschluss).toMatchObject({ art: 'unbeheizt', bU: b.fRT });
        else if (b.typ === 'FB') expect(fb.anschluss).toMatchObject({ art: 'unbeheizt', situation: 'keller', bU: 0.5 });
        else if (b.thetaNb !== undefined) expect(fb.anschluss).toMatchObject({ art: 'beheizt', thetaNachbarC: b.thetaNb, andereEinheit: b.label.includes('Nachbarw') });
        else expect(fb.anschluss).toMatchObject({ art: 'faktor', f: b.fRT });
      }
      if (r.id === 3) {
        const innen = fx.bauteile.slice(r.bauteile.length);
        expect(innen).toHaveLength(8);
        // Gegenflächen der «→Flur»-Bauteile der Nachbarräume (Küche 3.2/1.6, Dusche 5.7/1.3, Wohnen 7.0/1.6, Schlafen 5.4/1.6)
        expect(innen.map((b) => [b.flaecheM2, b.uOverride, (b.anschluss as { thetaNachbarC?: number }).thetaNachbarC])).toEqual([
          [3.2, 1.94, 20], [1.6, 2, 20], [5.7, 2, 24], [1.3, 2, 24], [7, 1.94, 20], [1.6, 2, 20], [5.4, 1.94, 20], [1.6, 2, 20],
        ]);
      } else expect(fx.bauteile).toHaveLength(r.bauteile.length);
    }
    expect(s.gebaeude.standort.thetaEOverrideC).toBe(-12);
    expect(e.thetaE.wert).toBe(-12);
    expect(rw.deltaUWb.wert).toBe(0.05);
  });

  it('Sollwerte über berechne(): Küche/Dusche/Wohnen/Schlafen ±2 %, Flur −95 W ±12 W, Σ Räume 4 447 W ±1 %, saldiert ≤ Σ', () => {
    for (const r of ref.raeume) {
      const x = rw.raeume.find((q) => q.id === `r${r.id}`)!;
      if (r.id === 3) expect(Math.abs(x.phiHL.wert - r.soll.phiHL_W!)).toBeLessThanOrEqual(12);
      else expect(pct(x.phiHL.wert, r.soll.phiHL_W!), `${r.name} ${x.phiHL.wert.toFixed(0)} / ${r.soll.phiHL_W}`).toBeLessThanOrEqual(2);
      console.log(`${r.name}: ${x.phiHL.wert.toFixed(0)} W (Soll ${r.soll.phiHL_W} W, ${pct(x.phiHL.wert, r.soll.phiHL_W!).toFixed(2)} %)`);
    }
    expect(pct(rw.summeRaeume.wert, ref.soll_gebaeude.summe_raeume_W!)).toBeLessThanOrEqual(1);
    expect(rw.saldiertRaeume.wert).toBeLessThanOrEqual(rw.summeRaeume.wert);
    console.log(`Σ Räume ${rw.summeRaeume.wert.toFixed(0)} W (Soll 4 447), saldiert ${rw.saldiertRaeume.wert.toFixed(0)} W (Formblatt G 3 560 W, nicht reproduzierbar — dokumentiert)`);
    expect(e.heizlast.massgebend.wert).toBe(rw.gebaeude);
    expect(rw.vollstaendig).toBe(true);
  });
});
