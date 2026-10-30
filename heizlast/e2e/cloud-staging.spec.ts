import { test, expect } from '@playwright/test';

/**
 * Session 10 — nur gegen die deployte Staging-URL (playwright.staging.config.ts): Die App erreicht das echte
 * Backend (Anmeldestatus «nicht angemeldet» statt «Cloud-Fehler» → Secret und D1 sind eingerichtet) und ein
 * falsches Passwort wird abgelehnt. Kein echtes Passwort im Test; die Anmeldung selbst prüft lokal
 * `cloud.spec.ts` gegen dieselben Functions.
 */
test('Staging: Cloud-Status aus dem echten Backend, falsches Passwort abgelehnt', async ({ page }) => {
  await page.goto('./');
  const status = page.getByTestId('cloud-status');
  await expect(status).toHaveAttribute('data-zustand', 'abgemeldet', { timeout: 15_000 });
  await page.getByTestId('projekte').click();
  await expect(page.getByTestId('cloud-bereich')).toContainText('nicht angemeldet');
  await page.getByTestId('cloud-passwort').fill(`falsch-staging-probe-${Date.now()}`);
  await page.getByTestId('cloud-anmelden').click();
  await expect(page.getByTestId('cloud-meldung')).toHaveText(/Falsches Passwort\.|Zu viele Fehlversuche/);
  await expect(status).toHaveAttribute('data-zustand', 'abgemeldet');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
