/**
 * Audit S12, Durchlauf 2 — Punkt 3: UX §3.2 U-Overrides je Raum-Bauteil in `annahmen[]` und im Bericht-Kapitel «Annahmen».
 * Punkt 6: Fachlogik N2, Φ'-Schätzung des Rests «spezifisch» in `annahmen[]` (über berechne(), nicht nur Kern-API).
 * Render mit preact-render-to-string (Muster tests/bericht/bericht.test.tsx). Fixture: CH-EFH (9 Bauteile mit U-Override).
 */
import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { Bericht } from '../../../src/bericht/Bericht';
import type { BerichtDaten } from '../../../src/bericht/kontext';
import { alleDaten } from '../../../src/daten/index';
import { firmaDaten } from '../../../src/daten/firma';
import { berechne } from '../../../src/kern/berechne';
import type { State } from '../../../src/state/schema';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
const firma = firmaDaten();
const kopie = (s: State): State => JSON.parse(JSON.stringify(s)) as State;
const nurText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
/** Inhalt eines Elements mit data-testid bis zum nächsten Unterkapitel. */
function abschnitt(html: string, testid: string): string {
  const i = html.indexOf(`data-testid="${testid}"`);
  expect(i, `Abschnitt ${testid} fehlt`).toBeGreaterThanOrEqual(0);
  const rest = html.slice(i);
  const j = rest.indexOf('data-testid="bericht-annahmen-', 10);
  return nurText(j > 0 ? rest.slice(0, j) : rest);
}
function bericht(s: State) {
  const b: BerichtDaten = { state: s, ergebnis: berechne(s, daten), daten, firma, datum: '2026-10-31' };
  return { e: b.ergebnis, html: renderToString(<Bericht {...b} />) };
}

describe('Punkt 3 — U-Overrides je Raum-Bauteil (CH-EFH, 9 Overrides)', () => {
  const s = fixture('state-v4-raumweise-efh.json');
  const { e, html } = bericht(s);
  const overrides = e.heizlast.raumweise!.raeume.flatMap((r) => r.bauteile.map((b) => b.u)).filter((u) => u.herkunft === 'override');

  it('alle U-Overrides stehen in annahmen[] mit Schritt «huelle»; Snapshot-Zahl 36 (27 + 9) bestätigt', () => {
    expect(overrides).toHaveLength(9);
    for (const u of overrides) expect(e.annahmen.find((a) => a.wert === u)?.schritt).toBe('huelle');
    expect(e.annahmen).toHaveLength(36);
    // keine Objekt-Duplikate (Dedupe in berechne per Identität)
    expect(new Set(e.annahmen.map((a) => a.wert)).size).toBe(36);
  });

  it('Bericht-Kapitel «Annahmen und Unsicherheiten», Unterkapitel Hülle & Räume: jede Override-Zeile («U x.xx W/m²K manuell für dieses Bauteil») erscheint', () => {
    const t = abschnitt(html, 'bericht-annahmen-huelle');
    for (const u of overrides) {
      const kurz = u.begruendung.replace(/\s*\(Hülle:.*$/, ''); // «U 0.20 W/m²K manuell für dieses Bauteil»
      expect(t, kurz).toContain(kurz);
    }
    expect((t.match(/manuell für dieses Bauteil/g) ?? []).length).toBe(9);
    expect(nurText(html)).toContain('Insgesamt 36 Annahmen');
  });
});

describe('Punkt 6 — Rest «spezifisch»: Φ′-Schätzung in annahmen[] (über berechne())', () => {
  it('Bandmitte Folie 37 als «schaetzung» mit Band in annahmen[] (Schritt huelle) und im Bericht; manueller Φ′ als «override» ebenfalls', () => {
    const s = kopie(fixture('state-v4-raumweise-efh.json'));
    s.gebaeude.ebfModus = 'manuell';
    s.gebaeude.ebfManuellM2 = 150;
    s.huelle.rest = { modus: 'spezifisch' };
    const { e, html } = bericht(s);
    const rest = e.heizlast.raumweise!.rest!;
    expect(rest.modus).toBe('spezifisch');
    const phiSpez = rest.phiSpez!;
    expect(phiSpez.herkunft).toBe('schaetzung');
    expect(phiSpez.band).toBeDefined();
    expect(phiSpez.unsicherheit).toBeGreaterThan(0);
    const a = e.annahmen.find((x) => x.wert === phiSpez);
    expect(a?.schritt).toBe('huelle');
    expect(abschnitt(html, 'bericht-annahmen-huelle')).toContain(phiSpez.begruendung.slice(0, 30));
    console.log(`Φ′ Rest: ${phiSpez.wert} W/m² ±${phiSpez.unsicherheit} % «${phiSpez.begruendung.slice(0, 80)}»`);
    // Eigener Wert
    s.huelle.rest = { modus: 'spezifisch', phiSpezWm2: 45 };
    const o = berechne(s, daten);
    const ov = o.heizlast.raumweise!.rest!.phiSpez!;
    expect(ov.herkunft).toBe('override');
    expect(o.annahmen.some((x) => x.wert === ov)).toBe(true);
  });
});
