import { test, expect } from '@playwright/test';

/** Session 6: Entwurf überlebt Neuladen (Autosave ≥ 1 s), Speichern, «Neu» mit Rückfrage bei ungespeicherten Änderungen. */
test('Entwurf, Speichern und «Neu» mit Rückfrage', async ({ page }, info) => {
  // Mobil blendet den Speicherstatus der Topbar aus — dort nur der Entwurf.
  const desktop = info.project.name === 'desktop';
  await page.goto('./');
  if (desktop) await expect(page.getByTestId('speicherstatus')).toHaveText('Neues Projekt');

  await page.getByTestId('projektname-eingabe').fill('EFH Autosave');
  await page.getByTestId('methode-fws').click();
  if (desktop) await expect(page.getByTestId('speicherstatus')).toContainText('nicht gespeichert');

  // Autosave entprellt: nach > 1 s liegt der Entwurf im localStorage
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('thermowerk-heizlast-v2-entwurf')?.includes('EFH Autosave') ?? false), { timeout: 5000 })
    .toBe(true);
  await page.reload();
  await expect(page.getByTestId('projektname')).toHaveText('EFH Autosave');
  await expect(page.getByTestId('methode-fws')).toHaveAttribute('aria-checked', 'true');
  if (!desktop) return;
  await expect(page.getByTestId('speicherstatus')).toContainText('nicht gespeichert');

  // Speichern → Status «Gespeichert», «Neu» ohne Rückfrage
  await page.getByTestId('projekt-speichern').click();
  await expect(page.getByTestId('speicherstatus')).toHaveText('Gespeichert');

  // Ändern → «Neu» fragt nach; Abbrechen behält den Stand
  await page.getByTestId('projektname-eingabe').fill('EFH geändert');
  let fragen = 0;
  page.once('dialog', (d) => {
    fragen++;
    void d.dismiss();
  });
  await page.getByTestId('projekt-neu').click();
  await expect.poll(() => fragen).toBe(1);
  await expect(page.getByTestId('projektname')).toHaveText('EFH geändert');

  // Bestätigen → leeres Projekt
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('projekt-neu').click();
  await expect(page.getByTestId('projektname')).toHaveText('Neues Projekt');
  await expect(page.getByTestId('speicherstatus')).toHaveText('Neues Projekt');
});
