import { test, expect } from '@playwright/test';

const SHOTS = 'docs/revision/shots-neu';

test('Shell rendert und Moduswahl steuert Schrittleiste', async ({ page }, info) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/Thermowerk Heizlast/);
  await expect(page.getByTestId('projektname')).toHaveText('Neues Projekt');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Projekt & Methode');

  // Ohne Methode: kein Schritt 3 in der Leiste
  await expect(page.getByTestId('schritt-verbrauch')).toHaveCount(0);
  await expect(page.getByTestId('schritt-huelle')).toHaveCount(0);

  await page.getByTestId('projektname-eingabe').fill('EFH Muster, Bern');
  await expect(page.getByTestId('projektname')).toHaveText('EFH Muster, Bern');

  await page.getByTestId('methode-fws').click();
  await expect(page.getByTestId('methode-fws')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('schritt-verbrauch')).toBeVisible();
  await expect(page.getByTestId('schritt-huelle')).toHaveCount(0);

  await page.getByTestId('methode-raumweise').click();
  await expect(page.getByTestId('schritt-huelle')).toBeVisible();
  await expect(page.getByTestId('schritt-verbrauch')).toHaveCount(0);

  await page.screenshot({ path: `${SHOTS}/s1-shell-${info.project.name}.png`, fullPage: true });

  await page.getByTestId('weiter').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Gebäude');
});

test('Dashboard: Seitenleiste auf Desktop, Leiste auf Mobil', async ({ page }, info) => {
  await page.goto('./');
  const seitenleiste = page.getByTestId('dashboard');
  const leiste = page.getByTestId('dashboard-leiste');
  if (info.project.name === 'desktop') {
    await expect(seitenleiste).toBeVisible();
    await expect(leiste).toBeHidden();
    await expect(seitenleiste.getByTestId('kpi-qh')).toHaveText('—');
  } else {
    await expect(seitenleiste).toBeHidden();
    await expect(leiste).toBeVisible();
    await expect(leiste).toHaveAttribute('data-offen', 'false');
    await leiste.getByRole('button').click();
    await expect(leiste).toHaveAttribute('data-offen', 'true');
    await expect(leiste.getByTestId('kpi-qh')).toBeVisible();
    // Schrittleiste bleibt sichtbar nach Scroll (sticky)
    await page.mouse.wheel(0, 600);
    await expect(page.getByRole('navigation', { name: 'Schritte' })).toBeInViewport();
    await page.screenshot({ path: `${SHOTS}/s1-dashboard-${info.project.name}.png` });
  }
});
