// tests/export.test.mjs
// AUDIT 3.12 — Bericht-Logik Hülle/Mixed-Mode.
// Drei Szenarien: Verbrauch primär · Hülle primär · beide aktiv.
//
// Wir prüfen das HTML-Snippet von buildLeistungenTable(state, calc) auf:
//   - korrektes Basis-Label (Verbrauch / Hülle / Mixed)
//   - korrekten Q_hl-Wert in der ersten Zeile
//   - korrekte Q_h-Hervorhebungszeile (basiert auf primärem Q_hl)
//   - Zusatzzeile "Vergleichswert Hülle …" wenn beide aktiv

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { freshState } from '../src/state.mjs';
import { compute } from '../src/calc/fws.mjs';
import { computeBuildingDetailLoad } from '../src/calc/heatload.mjs';
import { setUWerteData, enrichRaeumeWithResolvedUFrt, resolveHuelleUWerte } from '../src/ui.mjs';
import { buildLeistungenTable } from '../src/export.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const UWERTE = JSON.parse(readFileSync(resolve(here, '../data/u-werte.json'), 'utf-8'));
setUWerteData(UWERTE);

/* Hilfsfunktion: deep clone für unabhängige State-Bäume in jedem Test. */
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ======================================================================== *
   Szenario 1 — Verbrauch primär (kein Detail-Modus)
   ======================================================================== */
test('AUDIT 3.12 — Bericht: Verbrauch primär ohne Detail', () => {
  const s = freshState();
  s.objekt.ebf = 150;
  s.objekt.bauperiode = '1986-1990';
  // Verbrauchspfad mit erkennbaren Werten (BEISPIELRECHNUNG-ähnlich)
  s.heizung.verbrauchAktiv = true;
  s.heizung.verbrauchInklWW = true;
  s.heizung.perioden = [
    { id: 'p0', energy: 'erdgas', von: '', bis: '', menge: 2500,
      etaPreset: 'alt_ohneWW', etaValue: '' }
  ];
  s.warmwasser.aktiv = false;
  s.zuschlaege.sperrzeitAktiv = false;
  s.detail.aktiv = false;

  const c = compute(s);
  assert.ok(c.Qhl > 0, 'Verbrauchspfad muss Q_hl liefern');
  assert.equal(c.primary?.key, 'verbrauch');

  const html = buildLeistungenTable(s, c);

  assert.match(html, /aus Verbrauchsmethode \(FWS\)/, 'Basis-Label fehlt');
  assert.doesNotMatch(html, /Vergleichswert Hülle/, 'Hülle-Vergleich darf nicht erscheinen');
  assert.doesNotMatch(html, /Pauschal-Rest/, 'Mixed-Note darf nicht erscheinen');
  // Q_h-Highlight-Zeile vorhanden
  assert.match(html, /Auslegungsleistung Wärmepumpe Q&lt;sub&gt;h&lt;\/sub&gt;|Auslegungsleistung Wärmepumpe Q<sub>h<\/sub>/);
  // Q_hl-Zahlenwert plausibel zur compute()-Ausgabe (de-CH, 2 Nachkommastellen)
  const qhlStr = c.Qhl.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.ok(html.includes(qhlStr + ' kW'), `Q_hl-Wert "${qhlStr} kW" nicht im HTML gefunden`);
});

/* ======================================================================== *
   Szenario 2 — Hülle primär (Detail-Modus, kein Verbrauch)
   ======================================================================== */
test('AUDIT 3.12 — Bericht: Hülle primär ohne Verbrauch', () => {
  const s = freshState();
  s.objekt.ebf = 150;
  s.objekt.bauperiode = '1986-1990';
  s.objekt.tAussenAuslegung = -8;
  s.objekt.geschosshoehe = 2.5;
  // Verbrauchspfad deaktivieren
  s.heizung.verbrauchAktiv = false;
  s.heizung.perioden = [];
  s.warmwasser.aktiv = false;
  // Detail-Modus mit einem Raum + Restfläche → Mixed-Mode
  s.detail.aktiv = true;
  s.detail.huelle = {
    wand:    { u_user: 0.4,  variant: '' },
    fenster: { u_user: 1.2,  variant: '' },
    dach:    { u_user: 0.25, variant: 'steildach' },
    boden:   { u_user: 0.4,  variant: 'gegenErdreich' },
    tueren:  { u_user: 1.5,  variant: '' }
  };
  s.detail.raeume = [
    {
      name: 'Wohnzimmer', A: 30, h: 2.5, theta_int: 20, beheizt: true,
      n_min: 0.5, n50: 4, e_wind: 0.02,
      bauteile: [
        { typ: 'wand',    A: 20, anschluss: 'aussenluft', u: 0.4 },
        { typ: 'fenster', A: 4,  anschluss: 'aussenluft', u: 1.2 }
      ]
    }
  ];
  s.detail.misch = { rest_global: true };

  const c = compute(s);
  // Hüllen-Berechnung manuell anhängen (wie in computeFullCalc)
  const { uHuelle } = resolveHuelleUWerte(s);
  const enriched = enrichRaeumeWithResolvedUFrt(s);
  c.detail = computeBuildingDetailLoad(enriched, uHuelle);
  assert.ok(c.detail, 'detail-Block fehlt');
  assert.ok(c.detail.phiHL_total > 100, 'phiHL_total sollte > 0.1 kW sein');

  const html = buildLeistungenTable(s, c);

  // Basis-Label: Mixed-Mode (Räume + Pauschal-Rest)
  assert.match(html, /aus Mixed-Mode-Hüllenberechnung|aus raumweiser EN-12831-Berechnung|aus Pauschal-Hüllenberechnung/,
    'Hüllen-Basis-Label fehlt');
  assert.doesNotMatch(html, /aus Verbrauchsmethode \(FWS\)/, 'Verbrauchsmethode darf nicht erscheinen');
  assert.doesNotMatch(html, /Vergleichswert Hülle/, 'Hülle-Vergleich darf nicht erscheinen (sie ist primär)');

  // Q_hl im HTML entspricht phiHuelle_kW (nicht c.Qhl, das wäre 0)
  const phiH = c.detail.phiHL_total / 1000;
  const phiStr = phiH.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.ok(html.includes(phiStr + ' kW'), `phiHuelle "${phiStr} kW" nicht im HTML`);

  // Mixed-Note nur wenn A_R > 0 UND A_rest > 0 — bei diesem Setup beides der Fall
  // Naming geändert: "Pauschal-Rest" → "Gebäudehülle".
  if ((c.detail.A_raeume || 0) > 0 && (c.detail.A_rest || 0) > 0){
    assert.match(html, /Gebäudehülle/, 'Mixed-Aufschlüsselung erwartet');
  }
});

/* ======================================================================== *
   Szenario 3 — Beide aktiv (Verbrauch primär + Hülle als Vergleich)
   ======================================================================== */
test('AUDIT 3.12 — Bericht: Verbrauch + Hülle (beide aktiv, Vergleichszeile)', () => {
  const s = freshState();
  s.objekt.ebf = 150;
  s.objekt.bauperiode = '1986-1990';
  s.objekt.tAussenAuslegung = -8;
  s.objekt.geschosshoehe = 2.5;
  // Verbrauch aktiv (FWS primär)
  s.heizung.verbrauchAktiv = true;
  s.heizung.verbrauchInklWW = true;
  s.heizung.perioden = [
    { id: 'p0', energy: 'erdgas', von: '', bis: '', menge: 2500,
      etaPreset: 'alt_ohneWW', etaValue: '' }
  ];
  s.warmwasser.aktiv = false;
  // Detail-Modus zusätzlich aktiv
  s.detail.aktiv = true;
  s.detail.huelle = {
    wand:    { u_user: 0.4, variant: '' },
    fenster: { u_user: 1.2, variant: '' },
    dach:    { u_user: 0.25, variant: 'steildach' },
    boden:   { u_user: 0.4, variant: 'gegenErdreich' },
    tueren:  { u_user: 1.5, variant: '' }
  };
  s.detail.raeume = [
    {
      name: 'Wohnzimmer', A: 30, h: 2.5, theta_int: 20, beheizt: true,
      bauteile: [
        { typ: 'wand', A: 20, anschluss: 'aussenluft', u: 0.4 },
        { typ: 'fenster', A: 4, anschluss: 'aussenluft', u: 1.2 }
      ]
    }
  ];
  s.detail.misch = { rest_global: true };

  const c = compute(s);
  const { uHuelle } = resolveHuelleUWerte(s);
  const enriched = enrichRaeumeWithResolvedUFrt(s);
  c.detail = computeBuildingDetailLoad(enriched, uHuelle);

  assert.ok(c.Qhl > 0, 'Verbrauchs-Q_hl muss > 0 sein');
  assert.ok((c.detail?.phiHL_total || 0) > 100, 'Hülle muss > 0.1 kW liefern');

  const html = buildLeistungenTable(s, c);

  assert.match(html, /aus Verbrauchsmethode \(FWS\)/, 'Verbrauchsmethode-Label fehlt');
  assert.match(html, /Vergleichswert Hülle Q<sub>hl,Norm<\/sub>/, 'Vergleichszeile Hülle fehlt');
  // Beide Werte im HTML
  const qhlStr  = c.Qhl.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const phiStr  = (c.detail.phiHL_total / 1000).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.ok(html.includes(qhlStr + ' kW'), 'Verbrauchs-Q_hl fehlt im HTML');
  assert.ok(html.includes(phiStr + ' kW'), 'Hüllen-Q_hl,Norm fehlt im HTML');
});

/* ======================================================================== *
   Bonus — compute() mit phiHuelle-Override
   ======================================================================== */
test('compute(s, { phiHuelle }) ersetzt Q_hl und propagiert in Q_h', () => {
  const s = freshState();
  s.objekt.ebf = 150;
  s.heizung.verbrauchAktiv = true;
  s.heizung.perioden = [
    { id: 'p0', energy: 'erdgas', von: '', bis: '', menge: 2500,
      etaPreset: 'alt_ohneWW', etaValue: '' }
  ];
  s.warmwasser.aktiv = false;
  s.zuschlaege.sperrzeitAktiv = true;
  s.zuschlaege.sperrzeitTyp = 'werktag'; // toff = 2 h

  const cBaseline = compute(s);
  const cOverride = compute(s, { phiHuelle: 12.0 });

  assert.equal(cOverride.phiHuelleUsed, true);
  assert.equal(cOverride.Qhl, 12.0);
  // Q_off skaliert mit Q_hl: Q_off = Q_hl·(24/(24-2)-1) = Q_hl·(2/22)
  const expectedQoff = 12.0 * (24 / (24 - 2) - 1);
  assert.ok(Math.abs(cOverride.Qoff - expectedQoff) < 1e-6, 'Q_off muss aus phiHuelle abgeleitet sein');
  assert.ok(cOverride.Qh > cBaseline.Qh - 1e-6, 'Q_h sollte mit grösserem Q_hl steigen');
});
