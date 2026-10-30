import { test, expect } from '@playwright/test';
import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import { TEST_PASSWORT, testServer } from '../tests/backend/hilfen';

/**
 * Session 10 — Cloud-Sync mit zwei Browsern: Die echten Pages Functions laufen im Testprozess auf SQLite
 * (`tests/backend/hilfen.ts`); jeder Browserkontext leitet `/api/heizlast-*` dorthin um (eigene IP, eigene
 * Cookies). So prüft der Test Client und Server zusammen: Anmeldung, Hochladen, Öffnen aus der Cloud,
 * Konflikt-Dialog «überschreiben / Kopie», Drift nur markiert, Status mobil wie Desktop.
 * Lokal (Test-Passwort); gegen Staging prüft das curl-Protokoll (PROTOKOLL Session 10).
 */

type Server = ReturnType<typeof testServer>;

async function geraet(browser: Browser, info: TestInfo, server: Server, ip: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const u = info.project.use;
  const ctx = await browser.newContext({
    ...(u.baseURL ? { baseURL: u.baseURL } : {}),
    ...(u.viewport ? { viewport: u.viewport } : {}),
    ...(u.isMobile !== undefined ? { isMobile: u.isMobile } : {}),
    ...(u.hasTouch !== undefined ? { hasTouch: u.hasTouch } : {}),
  });
  await ctx.route('**/api/heizlast-*', async (route) => {
    const req = route.request();
    const h = await req.allHeaders();
    const headers = new Headers({ 'CF-Connecting-IP': ip });
    for (const k of ['cookie', 'content-type']) if (h[k]) headers.set(k, h[k]);
    const body = req.method() === 'GET' || req.method() === 'HEAD' ? null : req.postData();
    const res = await server.bearbeiten(new Request(req.url(), { method: req.method(), headers, ...(body !== null ? { body } : {}) }));
    const kopf: Record<string, string> = {};
    res.headers.forEach((v, k) => (kopf[k] = v));
    await route.fulfill({ status: res.status, headers: kopf, body: await res.text() });
  });
  const page = await ctx.newPage();
  await page.goto('./');
  return { ctx, page };
}

const zustand = (page: Page) => page.getByTestId('cloud-status');

async function anmelden(page: Page) {
  await expect(zustand(page)).toHaveAttribute('data-zustand', 'abgemeldet');
  await page.getByTestId('projekte').click();
  await page.getByTestId('cloud-passwort').fill(TEST_PASSWORT);
  await page.getByTestId('cloud-anmelden').click();
  await expect(zustand(page)).toHaveAttribute('data-zustand', 'angemeldet');
  await expect(page.getByTestId('cloud-bereich')).toContainText('Cloud verbunden');
  await page.getByTestId('projekte-schliessen').click();
}

const projektId = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('thermowerk-heizlast-v2-entwurf') ?? '{}').state?.meta?.id as string);

function serverNamen(server: Server): string[] {
  const roh = server.db.roh;
  if (!roh.prepare("SELECT name FROM sqlite_master WHERE name = 'heizlast_projekt'").get()) return [];
  return (roh.prepare('SELECT name FROM heizlast_projekt ORDER BY name').all() as Array<{ name: string }>).map((r) => r.name);
}

async function name(page: Page, wert: string) {
  await page.getByTestId('projektname-eingabe').fill(wert);
  await expect(page.getByTestId('projektname')).toHaveText(wert);
}

test('zwei Browser: Hochladen, Öffnen aus der Cloud, Konflikt → Kopie', async ({ browser }, info) => {
  const server = testServer();
  const a = await geraet(browser, info, server, '203.0.113.31');
  const b = await geraet(browser, info, server, '203.0.113.32');

  // A meldet sich an, erfasst und speichert → landet in der Cloud
  await anmelden(a.page);
  await name(a.page, 'Konflikt-Test');
  await a.page.getByTestId('methode-fws').click();
  await a.page.getByTestId('projekt-speichern').click();
  await expect.poll(() => serverNamen(server)).toEqual(['Konflikt-Test']);
  await expect(zustand(a.page)).toHaveAttribute('data-zustand', 'angemeldet');
  const id = await projektId(a.page);

  // B meldet sich an: Projekt «nur in der Cloud» → öffnen, ändern, speichern
  await anmelden(b.page);
  await b.page.getByTestId('projekte').click();
  await expect(b.page.getByTestId(`projekt-${id}-cloud`)).toHaveAttribute('data-zustand', 'nurCloud');
  await b.page.getByTestId(`projekt-${id}-laden`).click();
  await expect(b.page.getByTestId('projektname')).toHaveText('Konflikt-Test');
  await name(b.page, 'Konflikt-Test B');
  await b.page.getByTestId('projekt-speichern').click();
  await expect.poll(() => serverNamen(server)).toEqual(['Konflikt-Test B']);

  // A ändert denselben Stand ohne Abgleich → Konflikt-Dialog
  await name(a.page, 'Konflikt-Test A');
  await a.page.getByTestId('projekt-speichern').click();
  const dialog = a.page.getByTestId('konflikt-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Konflikt-Test A');
  await expect(dialog).toContainText('Konflikt-Test B');
  await expect(zustand(a.page)).toHaveAttribute('data-zustand', 'konflikt');
  // Knöpfe im Dialog lesbar (nicht weiss auf weiss wie die Topbar-Knöpfe)
  for (const t of ['konflikt-kopie', 'konflikt-spaeter']) expect(await a.page.getByTestId(t).evaluate((e) => getComputedStyle(e).color)).not.toBe('rgb(255, 255, 255)');
  if (info.project.name === 'desktop') await a.page.screenshot({ path: 'docs/revision/shots-neu/s10-konflikt-desktop.png' });
  else await a.page.screenshot({ path: 'docs/revision/shots-neu/s10-konflikt-mobil.png' });
  expect(serverNamen(server)).toEqual(['Konflikt-Test B']);

  await a.page.getByTestId('konflikt-kopie').click();
  await expect(dialog).toBeHidden();
  await expect(a.page.getByTestId('projektname')).toHaveText('Konflikt-Test A (Kopie)');
  await expect.poll(() => serverNamen(server)).toEqual(['Konflikt-Test A (Kopie)', 'Konflikt-Test B']);
  await expect(zustand(a.page)).toHaveAttribute('data-zustand', 'angemeldet');

  // B gleicht ab: beide Projekte, das eigene unverändert «in der Cloud»
  await b.page.getByTestId('projekte').click();
  await b.page.getByTestId('cloud-abgleichen').click();
  await expect(b.page.getByTestId(`projekt-${id}-cloud`)).toHaveAttribute('data-zustand', 'synchron');
  await expect(b.page.getByTestId('projekte-dialog')).toContainText('Konflikt-Test A (Kopie)');
  if (info.project.name === 'desktop') await b.page.screenshot({ path: 'docs/revision/shots-neu/s10-projekte-cloud.png' });

  await a.ctx.close();
  await b.ctx.close();
});

test('Konflikt → überschreiben; in der Cloud gelöscht → nur markiert', async ({ browser }, info) => {
  const server = testServer();
  const a = await geraet(browser, info, server, '203.0.113.41');
  const b = await geraet(browser, info, server, '203.0.113.42');
  await anmelden(a.page);
  await name(a.page, 'Haus Ost');
  await a.page.getByTestId('projekt-speichern').click();
  await expect.poll(() => serverNamen(server)).toEqual(['Haus Ost']);
  const id = await projektId(a.page);

  await anmelden(b.page);
  await b.page.getByTestId('projekte').click();
  await b.page.getByTestId(`projekt-${id}-laden`).click();
  await name(b.page, 'Haus Ost (B)');
  await b.page.getByTestId('projekt-speichern').click();
  await expect.poll(() => serverNamen(server)).toEqual(['Haus Ost (B)']);

  await name(a.page, 'Haus Ost (A)');
  await a.page.getByTestId('projekt-speichern').click();
  await a.page.getByTestId('konflikt-ueberschreiben').click();
  await expect.poll(() => serverNamen(server)).toEqual(['Haus Ost (A)']);
  await expect(a.page.getByTestId('projektname')).toHaveText('Haus Ost (A)');

  // B löscht das Projekt überall (nach Abgleich) → A behält es, nur markiert
  await b.page.getByTestId('projekte').click();
  await b.page.getByTestId('cloud-abgleichen').click();
  await expect(b.page.getByTestId(`projekt-${id}-cloud`)).toHaveAttribute('data-zustand', 'serverNeuer');
  b.page.once('dialog', (d) => void d.accept());
  await b.page.getByTestId(`projekt-${id}-loeschen`).click();
  await expect.poll(() => serverNamen(server)).toEqual([]);
  await expect(b.page.getByTestId(`projekt-${id}`)).toHaveCount(0);

  await a.page.getByTestId('projekte').click();
  await expect(a.page.getByTestId(`projekt-${id}-cloud`)).toHaveAttribute('data-zustand', 'nichtMehrInCloud');
  await expect(a.page.getByTestId(`projekt-${id}-cloud`)).toHaveText('In der Cloud gelöscht — nur noch hier');
  expect(serverNamen(server)).toEqual([]);

  await a.ctx.close();
  await b.ctx.close();
});

test('Anmeldung: falsches Passwort, Abmelden, offline sichtbar (ohne horizontales Scrollen)', async ({ browser }, info) => {
  const server = testServer();
  const a = await geraet(browser, info, server, '203.0.113.51');
  await expect(zustand(a.page)).toHaveAttribute('data-zustand', 'abgemeldet');
  await a.page.getByTestId('projekte').click();
  await a.page.getByTestId('cloud-passwort').fill('falsch');
  await a.page.getByTestId('cloud-anmelden').click();
  await expect(a.page.getByTestId('cloud-meldung')).toHaveText('Falsches Passwort.');
  const breite = () => a.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await breite()).toBeLessThanOrEqual(0);
  if (info.project.name === 'mobil') await a.page.screenshot({ path: 'docs/revision/shots-neu/s10-anmelden-mobil.png' });

  await a.page.getByTestId('cloud-passwort').fill(TEST_PASSWORT);
  await a.page.getByTestId('cloud-anmelden').click();
  await expect(zustand(a.page)).toHaveAttribute('data-zustand', 'angemeldet');
  await a.page.getByTestId('cloud-abmelden').click();
  await expect(zustand(a.page)).toHaveAttribute('data-zustand', 'abgemeldet');
  await expect(a.page.getByTestId('cloud-passwort')).toBeVisible();
  await a.page.getByTestId('projekte-schliessen').click();

  await a.ctx.setOffline(true);
  await expect(zustand(a.page)).toHaveAttribute('data-zustand', 'offline');
  await expect(zustand(a.page)).toContainText('Offline');
  await expect(zustand(a.page).locator('.cloudchip__text')).toBeVisible();
  expect(await breite()).toBeLessThanOrEqual(0);
  if (info.project.name === 'mobil') await a.page.screenshot({ path: 'docs/revision/shots-neu/s10-offline-mobil.png', clip: { x: 0, y: 0, width: 390, height: 120 } });
  await a.ctx.setOffline(false);
  await expect(zustand(a.page)).toHaveAttribute('data-zustand', 'abgemeldet');
  await a.ctx.close();
});
