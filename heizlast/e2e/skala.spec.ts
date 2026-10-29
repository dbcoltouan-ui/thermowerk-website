import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHOTS = 'docs/revision/shots-neu';

/** Session 6: Ampel als Skala mit Bereichen — Projekt Moosseedorf mit gewähltem Gerät als Entwurf vorbelegt. */
test('Dashboard zeigt Vorlauf- und WP-Grössen-Skala aus dem Ergebnis', async ({ page }, info) => {
  const state = JSON.parse(readFileSync(fileURLToPath(new URL('../tests/fixtures/state-v2-fws-moosseedorf.json', import.meta.url)), 'utf8'));
  state.geraet.auswahlId = 'OE-0001';
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('vorbelegt')) {
      localStorage.setItem('thermowerk-heizlast-v2-entwurf', JSON.stringify({ format: 1, state: s, basisHash: null }));
      sessionStorage.setItem('vorbelegt', '1');
    }
  }, state);
  await page.goto('./');
  const dash = info.project.name === 'desktop' ? page.getByTestId('dashboard') : page.getByTestId('dashboard-leiste');
  if (info.project.name !== 'desktop') await dash.getByRole('button').first().click();
  await expect(dash.getByTestId('kpi-qh')).toHaveText('10.73 kW');
  const wp = dash.getByTestId('skala-wp');
  await expect(wp).toHaveAttribute('data-ampel', 'gruen');
  await expect(wp.getByTestId('skala-wp-wert')).toHaveText('+4 %');
  await expect(wp.getByTestId('skala-wp-zeiger')).toBeVisible();
  await expect(dash.getByTestId('skala-vorlauf')).toHaveAttribute('data-ampel', 'grau');
  await dash.screenshot({ path: `${SHOTS}/s6-skala-${info.project.name}.png` });
});
