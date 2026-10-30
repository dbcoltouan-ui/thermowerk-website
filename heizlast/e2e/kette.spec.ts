import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

/**
 * Session 7b — Raumweise ohne Pflicht-Klick: Räume rechnen sofort mit Standardaufbauten aus dem Baujahr;
 * Baujahr, Keller, Dachform und Sanierung nachträglich ändern → U im Raum, Φ_HL, Heizlast und Dashboard ändern mit;
 * eigener U-Wert bleibt. Keine veraltete Anzeige.
 */
const SHOTS = 'docs/revision/shots-neu';
const foto = async (page: Page, info: TestInfo, name: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const lokal = String(info.project.use.baseURL ?? '').includes('127.0.0.1');
  await page.screenshot({ path: lokal ? `${SHOTS}/s7b-${name}-${info.project.name}.png` : info.outputPath(`s7b-${name}.png`), fullPage: true });
};
const zahl = async (page: Page, testid: string) => Number((await page.getByTestId(testid).textContent())!.replace(/[^\d.-]/g, ''));
const dashboardQhl = async (page: Page, info: TestInfo) => {
  if (info.project.name === 'desktop') return page.getByTestId('dashboard').getByTestId('kpi-qhl').textContent();
  const leiste = page.getByTestId('dashboard-leiste');
  if ((await leiste.getAttribute('data-offen')) === 'false') await leiste.getByRole('button').first().click();
  const t = await leiste.getByTestId('kpi-qhl').textContent();
  await leiste.getByRole('button').first().click();
  return t;
};

test('Baujahr-Kette: Standardaufbauten ohne Klick, Baujahr/Keller/Dachform/Sanierung ändern U und Heizlast sofort', async ({ page }, info) => {
  await page.goto('./');
  await page.getByTestId('projektname-eingabe').fill('Kette 1965');
  await page.getByTestId('methode-raumweise').click();
  await page.getByTestId('weiter').click();
  await page.getByTestId('gebaeude-typ-efh').click();
  await page.getByTestId('gebaeude-baujahr').fill('1965');
  await page.getByTestId('standort-plz').fill('3000');
  await page.getByTestId('standort-kanton').selectOption({ label: 'BE' });
  await page.getByTestId('gebaeude-keller-unbeheizt').click();
  await page.getByTestId('gebaeude-dachform-steil').click();
  await page.getByTestId('gebaeude-dachraum-ja').click();
  await page.getByTestId('ebf-modus-raeume').click();

  // Schritt 3B: KEIN «Bauteiltypen vorschlagen» — Raum mit Lage-Fragen (wie Gebäude) direkt anlegen
  await page.getByTestId('schritt-huelle').click();
  await expect(page.getByTestId('typen-leer')).toBeVisible();
  await page.getByTestId('raum-neu').click();
  await page.getByTestId('raum-1-name').fill('Wohnen');
  await page.getByTestId('raum-1-flaeche').fill('25');
  await page.getByTestId('raum-1-lage-oben-auto').click();
  await page.getByTestId('raum-1-lage-anlegen').click();
  const r1 = page.getByTestId('raum-1');
  await r1.getByTestId('raum-1-bauteil-1-flaeche').fill('19');
  await r1.getByTestId('raum-1-bauteil-2-flaeche').fill('6');
  // Bauteil 3 = Boden «wie Gebäude» → unbeheizter Keller; Bauteil 4 = Decke «wie Gebäude» → Steildach
  await expect(page.getByTestId('raum-1-bauteil-3-konkret')).toContainText('unbeheizten Keller');
  await expect(page.getByTestId('raum-1-bauteil-4-konkret')).toContainText('Steildach');
  // Standardaufbauten sichtbar, U als Standardwert mit Baujahr-Hinweis
  const uAw = page.getByTestId('raum-1-bauteil-1-u');
  await expect(uAw).toHaveAttribute('data-standard', 'ja');
  await expect(page.getByTestId('raum-1-bauteil-1-standard')).toContainText('Standard');
  await page.getByTestId('raum-1-bauteil-1-standard').click();
  await expect(page.locator('.popover__fenster')).toContainText('Standard aus Baujahr 1965');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('standardtypen')).toContainText('1965');
  const u1965 = Number(await uAw.inputValue());
  const phi1965 = await zahl(page, 'raum-1-phihl');
  expect(u1965).toBeGreaterThan(0.5);
  expect(phi1965).toBeGreaterThan(500);
  await foto(page, info, 'kette-standard');

  // Baujahr 1965 → 1995 in Schritt 1: U im Raum und Φ_HL ändern sofort, Dashboard folgt
  await page.getByTestId('schritt-gebaeude').click();
  await page.getByTestId('gebaeude-baujahr').fill('1995');
  await page.getByTestId('schritt-huelle').click();
  const u1995 = Number(await page.getByTestId('raum-1-bauteil-1-u').inputValue());
  const phi1995 = await zahl(page, 'raum-1-phihl');
  expect(u1995).toBeLessThan(u1965);
  expect(phi1995).toBeLessThan(phi1965);
  await expect(page.getByTestId('standardtypen')).toContainText('1995');
  await page.getByTestId('schritt-heizlast').click();
  const qhl1995 = await page.getByTestId('heizlast-qhl').textContent();
  expect(await dashboardQhl(page, info)).toBe(qhl1995);

  // Keller «unbeheizt» → «kein Keller»: Boden-Bauteil wird Erdreich, Φ_HL ändert
  await page.getByTestId('schritt-gebaeude').click();
  await page.getByTestId('gebaeude-keller-keiner').click();
  await page.getByTestId('schritt-huelle').click();
  await expect(page.getByTestId('raum-1-bauteil-3-konkret')).toContainText('Erdreich');
  const phiErdreich = await zahl(page, 'raum-1-phihl');
  expect(phiErdreich).not.toBe(phi1995);

  // Dachform → flach: Decke wird Flachdach
  await page.getByTestId('schritt-gebaeude').click();
  await page.getByTestId('gebaeude-dachform-flach').click();
  await page.getByTestId('schritt-huelle').click();
  await expect(page.getByTestId('raum-1-bauteil-4-konkret')).toContainText('Flachdach');

  // Sanierung Fenster 2015 (Monat/Jahr): Fenster-U sinkt sofort, Φ_HL sinkt
  const uFensterVorher = Number(await page.getByTestId('raum-1-bauteil-2-u').inputValue());
  const phiVorSan = await zahl(page, 'raum-1-phihl');
  await page.getByTestId('schritt-sanierungen').click();
  await page.getByTestId('sanierung-neu').click();
  await page.getByTestId('sanierung-1-datum-jahr').selectOption('2015');
  await page.getByTestId('sanierung-1-datum-monat').selectOption('06');
  await page.getByTestId('schritt-huelle').click();
  expect(Number(await page.getByTestId('raum-1-bauteil-2-u').inputValue())).toBeLessThan(uFensterVorher);
  expect(await zahl(page, 'raum-1-phihl')).toBeLessThan(phiVorSan);

  // Eigener U-Wert gewinnt und bleibt bei Baujahr-Änderung; «Standard verwenden» setzt zurück
  await page.getByTestId('raum-1-bauteil-1-u').fill('0.7');
  await expect(page.getByTestId('raum-1-bauteil-1-u')).toHaveAttribute('data-eigen', 'ja');
  await page.getByTestId('schritt-gebaeude').click();
  await page.getByTestId('gebaeude-baujahr').fill('1950');
  await page.getByTestId('schritt-huelle').click();
  await expect(page.getByTestId('raum-1-bauteil-1-u')).toHaveValue('0.7');
  await page.getByTestId('raum-1-bauteil-1-u-zuruecksetzen').click();
  await expect(page.getByTestId('raum-1-bauteil-1-u')).toHaveAttribute('data-standard', 'ja');
  // Standard 1950 (Epoche 1946–1960) ist der Wert der Standardaufbauten-Tabelle und nicht kleiner als 1965
  const uStd1950 = Number((await page.getByTestId('std-aussenwand-u').textContent())!.replace(/[^\d.]/g, ''));
  expect(Number(await page.getByTestId('raum-1-bauteil-1-u').inputValue())).toBeCloseTo(uStd1950, 2);
  expect(uStd1950).toBeGreaterThanOrEqual(u1965);

  // «Anpassen» macht aus dem Standard-Fenster einen eigenen Typ; das Raum-Bauteil verweist darauf
  await page.getByTestId('std-fenster-anpassen').click();
  await expect(page.getByTestId('raum-1-bauteil-2-typ')).toHaveValue(/^typ:/);
  await expect(page.locator('[data-testid^="typ-"][data-testid$="-picker"]')).toHaveCount(1);
  await foto(page, info, 'kette-angepasst');
});
