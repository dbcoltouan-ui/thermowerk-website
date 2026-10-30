import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Session 7b — Mobil/Responsivität: Popover (ⓘ, Herkunfts-Chip, Ampel-Legende) liegen immer vollständig im
 * Bildschirm, der aktive Schritt ist nach Weiter/Zurück/Sprung in der Leiste sichtbar (ohne Seitensprung), und
 * keine Seite erzeugt horizontales Scrollen (scrollWidth ≤ Viewport). Läuft auf Desktop 1280 und Mobil 390.
 */

/** Fenster eines Popovers muss vollständig im Viewport liegen. */
async function imViewport(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, selector).not.toBeNull();
  const vw = page.viewportSize()!;
  expect(box!.x, `${selector} links`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${selector} rechts (${box!.x + box!.width} > ${vw.width})`).toBeLessThanOrEqual(vw.width + 0.5);
  expect(box!.y + box!.height, `${selector} unten`).toBeLessThanOrEqual(vw.height + 0.5);
  expect(box!.y, `${selector} oben`).toBeGreaterThanOrEqual(0);
}

/** Kein horizontales Scrollen: Dokument und alle sichtbaren Elemente innerhalb der Viewport-Breite. */
async function keinHorizontalesScrollen(page: Page, name: string) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const zuBreit: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Inhalte von Scroll-Containern (Schrittleiste, Tabellenrahmen) dürfen intern scrollen
      let p: HTMLElement | null = el.parentElement;
      let inScroller = false;
      while (p && p !== document.body) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === 'auto' || ov === 'scroll') {
          inScroller = true;
          break;
        }
        p = p.parentElement;
      }
      if (inScroller) continue;
      if (rect.right > vw + 1 || rect.left < -1) zuBreit.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(rect.left)}–${Math.round(rect.right)}`);
    }
    return { scrollWidth: document.documentElement.scrollWidth, vw, zuBreit: zuBreit.slice(0, 8) };
  });
  expect(r.scrollWidth, `${name}: scrollWidth`).toBeLessThanOrEqual(r.vw);
  expect(r.zuBreit, `${name}: Elemente ausserhalb`).toEqual([]);
}

test('Popover liegen im Viewport: ⓘ, Herkunfts-Chip, Ampel-Legende', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('methode-fws').click();
  await page.getByTestId('weiter').click();
  // ⓘ am Baujahr (links) und am Energiestandard
  await page.locator('[data-testid="gebaeude-baujahr"]').locator('xpath=ancestor::div[contains(@class,"feld")][1]').locator('.info-knopf').click();
  await imViewport(page, '.popover__fenster');
  await page.keyboard.press('Escape');
  await expect(page.locator('.popover__fenster')).toHaveCount(0);
  // Herkunfts-Chip am θe-Standardwert (rechts im Raster → auf Mobil typischer Abschneide-Fall)
  await page.getByTestId('standort-thetae-standard').click();
  await imViewport(page, '.popover__fenster');
  await expect(page.locator('.popover__fenster')).toContainText('Standardwert');
  await page.keyboard.press('Escape');
  // Ampel-Legende (rechts ausgerichtet) auf der Heizlast-Seite mit Verbrauch
  await page.getByTestId('gebaeude-typ-efh').click();
  await page.getByTestId('gebaeude-baujahr').fill('1988');
  await page.getByTestId('ebf-modus-manuell').click();
  await page.getByTestId('ebf-manuell').fill('150');
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
  await page.getByTestId('reihe-neu').click();
  await page.getByTestId('reihe-1-traeger').selectOption({ label: 'Erdgas' });
  await page.getByTestId('reihe-1-art').selectOption({ label: 'Zeiträume oder Kalenderjahre' });
  const jahre: [string, string][] = [
    ['2024', '2500'],
    ['2023', '2400'],
  ];
  for (const [i, [jahr, menge]] of jahre.entries()) {
    await page.getByTestId('reihe-1-zeitraum-neu').click();
    await page.getByTestId(`reihe-1-zeitraum-${i + 1}-jahr`).fill(jahr);
    await page.getByTestId(`reihe-1-zeitraum-${i + 1}-menge`).fill(menge);
  }
  await page.getByTestId('ww-bisher-nein').click();
  await page.getByTestId('streuung').getByRole('button', { name: 'Legende der Ampel' }).click();
  await imViewport(page, '.popover__fenster');
  await expect(page.locator('.popover__fenster')).toContainText('Jahre passen zusammen');
  await page.keyboard.press('Escape');
  await keinHorizontalesScrollen(page, 'verbrauch');
});

test('Schrittleiste: aktiver Schritt nach Weiter/Zurück/Sprung sichtbar, Seite springt nicht', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('methode-raumweise').click();
  const aktiv = () => page.locator('.stepper__btn[aria-current="step"]');
  const leiste = page.getByRole('navigation', { name: 'Schritte' });
  const sichtbarInLeiste = async () => {
    const a = await aktiv().boundingBox();
    const l = await leiste.boundingBox();
    expect(a).not.toBeNull();
    expect(a!.x).toBeGreaterThanOrEqual(l!.x - 0.5);
    expect(a!.x + a!.width).toBeLessThanOrEqual(l!.x + l!.width + 0.5);
  };
  // Sprung ans Ende (Bericht) und zurück nach vorn
  await page.getByTestId('schritt-bericht').click();
  await page.waitForTimeout(600);
  await sichtbarInLeiste();
  await page.getByTestId('zurueck').click();
  await page.waitForTimeout(600);
  await expect(aktiv()).toHaveAttribute('data-testid', 'schritt-waermepumpe');
  await sichtbarInLeiste();
  await page.getByTestId('schritt-projekt').click();
  await page.waitForTimeout(600);
  await sichtbarInLeiste();
  // Weiter durch alle Schritte: aktiver Schritt bleibt sichtbar; Seite steht oben (kein Sprung durch scrollIntoView)
  for (let i = 0; i < 10; i++) {
    await page.getByTestId('weiter').click();
    await page.waitForTimeout(500);
    await sichtbarInLeiste();
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  }
});

test('Alle Schritte ohne horizontales Scrollen (FWS und raumweise)', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('projektname-eingabe').fill('Breite');
  await page.getByTestId('methode-fws').click();
  await page.getByTestId('weiter').click();
  await page.getByTestId('gebaeude-typ-efh').click();
  await page.getByTestId('gebaeude-baujahr').fill('1975');
  await page.getByTestId('standort-plz').fill('3011');
  await page.getByTestId('standort-kanton').selectOption({ label: 'BE' });
  await page.getByTestId('ebf-modus-manuell').click();
  await page.getByTestId('ebf-manuell').fill('180');
  await page.getByTestId('schritt-sanierungen').click();
  await page.getByTestId('sanierung-neu').click();
  await page.getByTestId('sanierung-1-datum-jahr').selectOption('2024');
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
  await page.getByTestId('reihe-neu').click();
  await page.getByTestId('reihe-1-stand-neu').click();
  await page.getByTestId('reihe-1-stand-1-datum').fill('2023-09-15');
  await page.getByTestId('reihe-1-stand-1-bestand').fill('1200');
  await page.getByTestId('reihe-1-stand-neu').click();
  await page.getByTestId('reihe-1-stand-2-datum').fill('2024-05-20');
  await page.getByTestId('reihe-1-stand-2-bestand').fill('1700');
  await page.getByTestId('reihe-1-lieferung-neu').click();
  await page.getByTestId('reihe-1-lieferung-1-datum').fill('2023-09-15');
  await page.getByTestId('reihe-1-lieferung-1-menge').fill('4300');
  await page.getByTestId('ww-bisher-ja').click();
  const schritte = ['projekt', 'gebaeude', 'sanierungen', 'verbrauch', 'heizlast', 'warmwasser', 'waermeabgabe', 'zuschlaege', 'speicher', 'waermepumpe', 'bericht'];
  for (const s of schritte) {
    await page.getByTestId(`schritt-${s}`).click();
    await keinHorizontalesScrollen(page, `fws/${s}`);
  }
  // raumweise mit Räumen
  await page.getByTestId('schritt-projekt').click();
  await page.getByTestId('methode-raumweise').click();
  await page.getByTestId('schritt-huelle').click();
  await page.getByTestId('raum-neu').click();
  await page.getByTestId('raum-1-flaeche').fill('25');
  await page.getByTestId('raum-1-lage-anlegen').click();
  await page.getByTestId('raum-1-bauteil-1-flaeche').fill('19');
  for (const s of ['huelle', 'heizlast', 'sanierungen']) {
    await page.getByTestId(`schritt-${s}`).click();
    await keinHorizontalesScrollen(page, `raumweise/${s}`);
  }
});
