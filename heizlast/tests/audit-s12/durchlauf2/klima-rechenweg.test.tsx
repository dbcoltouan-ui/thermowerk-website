/**
 * Audit S12, Durchlauf 2 — Punkt 8: Schritt 4 Rechenweg nennt die aktive Klimabereinigung («nicht FWS-Kurs»).
 * Statische Prüfung von src/ui/seiten/Heizlast.tsx plus Render der Heizlast-Seite aus dem App-Store (preact-render-to-string);
 * e2e/abnahme.spec.ts «FWS-Rechner-Vergleich Öl» nur gelesen (Port 4173 belegt).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { store } from '../../../src/state/app';
import type { State } from '../../../src/state/schema';
import { Heizlast } from '../../../src/ui/seiten/Heizlast';
import { fixture } from '../../state/hilfen';

const kopie = (s: State): State => JSON.parse(JSON.stringify(s)) as State;
function oel(klima: boolean): State {
  const s = kopie(fixture('state-v4-fws-moosseedorf.json'));
  s.gebaeude.standort = { plz: '3011', kanton: 'BE' };
  s.verbrauch.wwBisher = false;
  s.verbrauch.eta = {};
  s.verbrauch.klimabereinigung = klima;
  s.verbrauch.reihen = [{ id: 'r-oel', energietraeger: 'heizoel', art: 'lieferungen', ablesungen: [{ id: 'a1', datum: '2023-09-15', bestand: 1200 }, { id: 'a2', datum: '2024-05-20', bestand: 1700 }], lieferungen: [{ id: 'l1', datum: '2023-09-15', menge: 2500 }, { id: 'l2', datum: '2024-01-10', menge: 1800 }] }];
  return s;
}
function rechenweg(s: State): string {
  store.ersetze(s);
  const html = renderToString(<Heizlast />);
  const i = html.indexOf('data-testid="rechenweg-fws"');
  expect(i).toBeGreaterThanOrEqual(0);
  const j = html.indexOf('<ol class="rechenweg"', i);
  return html.slice(i, j).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

describe('Punkt 8 — Klimabereinigungs-Hinweis im Rechenweg (Schritt 4)', () => {
  it('statisch: Abschnitt «Rechenweg (FWS-Kurs Modul 3)» bekommt text= nur bei f.klimabereinigungAktiv', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'src', 'ui', 'seiten', 'Heizlast.tsx'), 'utf8');
    const zeile = src.split('\n').find((l) => l.includes('testid="rechenweg-fws"'))!;
    expect(zeile).toContain('f.klimabereinigungAktiv ?');
    expect(zeile).toContain('nicht FWS-Kurs');
    expect(zeile).toContain(': undefined');
  });

  it('Render: mit Klimabereinigung steht «Klimabereinigung aktiv — nicht FWS-Kurs» über dem Rechenweg, ohne nicht', () => {
    const mit = rechenweg(oel(true));
    expect(mit).toContain('Klimabereinigung aktiv — nicht FWS-Kurs');
    expect(mit).toContain('SIA-2028-Normjahr');
    const ohne = rechenweg(oel(false));
    expect(ohne).not.toContain('Klimabereinigung');
    expect(ohne).not.toContain('nicht FWS-Kurs');
  });

  it('e2e-Abnahme (nur gelesen): «FWS-Rechner-Vergleich Öl» schaltet die Klimabereinigung ein und erwartet «nicht FWS-Kurs» in rechenweg-fws', () => {
    const spec = readFileSync(join(__dirname, '..', '..', '..', 'e2e', 'abnahme.spec.ts'), 'utf8');
    const t = spec.slice(spec.indexOf("test('FWS-Rechner-Vergleich Öl"));
    expect(t).toContain("getByTestId('klimabereinigung').check()");
    expect(t).toContain("getByTestId('rechenweg-fws')).toContainText('nicht FWS-Kurs')");
  });
});
