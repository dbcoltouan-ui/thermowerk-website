import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Session 9 — Bericht (Schritt 10) über die Oberfläche, Desktop 1280 / Mobil 390:
 *  - Vorschau = Dashboard (Q_h, Q_hl, Auslegungs-VL aus demselben Ergebnis), Vollständigkeits-Check sperrt bzw.
 *    gibt den Druck frei, Warnungen übersteuerbar.
 *  - Druck-Smoke: Druckansicht zeigt nur den Bericht (Topbar, Schrittleiste, Dashboard, Steuerung weg), PDF A4 wird erzeugt.
 *  - JSON-Export und Laden aus Datei (gleicher Ladepfad hydrateState).
 * Sollwerte extern: Moosseedorf Q_h 10.73 kW (tests/state/berechne.test.ts), Öl 3 800 l in 248 Tagen (Session 7b).
 * Beispiel-PDFs (lokal): test-results/beispiele/*.pdf — zur fachlichen Sichtung an Daniel.
 */
const SHOTS = 'docs/revision/shots-neu';
const fixture = (name: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../tests/fixtures/${name}`, import.meta.url)), 'utf8'));
const lokal = (info: TestInfo) => String(info.project.use.baseURL ?? '').includes('127.0.0.1');

async function vorbelegen(page: Page, state: unknown) {
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('vorbelegt')) {
      localStorage.setItem('thermowerk-heizlast-v2-entwurf', JSON.stringify({ format: 1, state: s, basisHash: null }));
      sessionStorage.setItem('vorbelegt', '1');
    }
  }, state);
  await page.goto('./');
}

async function dashboardWert(page: Page, info: TestInfo, testid: string): Promise<string> {
  if (info.project.name === 'desktop') return (await page.getByTestId('dashboard').getByTestId(testid).textContent())!.trim();
  const leiste = page.getByTestId('dashboard-leiste');
  if ((await leiste.getAttribute('data-offen')) === 'false') await leiste.getByRole('button').first().click();
  const t = (await leiste.getByTestId(testid).textContent())!.trim();
  await leiste.getByRole('button').first().click();
  return t;
}

/** Zu Schritt 10: Desktop über «Export» in der Topbar, mobil (dort ausgeblendet) über die Schrittleiste. */
async function zumBericht(page: Page) {
  if (await page.getByTestId('export').isVisible()) await page.getByTestId('export').click();
  else await page.getByTestId('schritt-bericht').click();
  await expect(page.getByTestId('seite-bericht')).toBeVisible();
  await expect(page.getByTestId('bericht')).toBeVisible();
}

/** Druck freigeben (Warnungen bestätigen, falls vorhanden). */
async function freigeben(page: Page) {
  await expect(page.getByTestId('bericht-offen')).toHaveCount(0);
  if (await page.getByTestId('bericht-warnungen').count()) {
    await expect(page.getByTestId('bericht-drucken')).toBeDisabled();
    await page.getByTestId('bericht-warnungen-ok').check();
  }
  await expect(page.getByTestId('bericht-drucken')).toBeEnabled();
}

/** Druckansicht prüfen und PDF erzeugen (Chromium). */
async function druckSmoke(page: Page, info: TestInfo, name: string) {
  await page.emulateMedia({ media: 'print' });
  for (const sel of ['.topbar', '.stepper', '.bericht-steuerung', '.inhalt__nav', '.inhalt__kopf']) await expect(page.locator(sel).first()).toBeHidden();
  await expect(page.getByTestId('dashboard')).toBeHidden();
  await expect(page.getByTestId('dashboard-leiste')).toBeHidden();
  await expect(page.getByTestId('bericht')).toBeVisible();
  const pfad = lokal(info) ? `test-results/beispiele/${name}-${info.project.name}.pdf` : info.outputPath(`${name}.pdf`);
  const pdf = await page.pdf({ path: pfad, format: 'A4', printBackground: true, preferCSSPageSize: true });
  expect(pdf.byteLength).toBeGreaterThan(20_000);
  // mehrere A4-Seiten (Objekt/Zusammenfassung, Rechenweg, Annahmen …)
  const seiten = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(seiten).toBeGreaterThanOrEqual(3);
  await page.emulateMedia({ media: 'screen' });
}

async function foto(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: lokal(info) ? `${SHOTS}/s9-${name}-${info.project.name}.png` : info.outputPath(`s9-${name}.png`), fullPage: true });
}

/** Erstes passendes Gerät in Schritt 9 wählen (Liste aus dem Ergebnis). */
async function geraetWaehlen(page: Page) {
  await page.getByTestId('schritt-waermepumpe').click();
  const knopf = page.locator('[data-testid^="geraet-"][data-testid$="-waehlen"]').first();
  await expect(knopf).toBeVisible();
  await knopf.click();
  await expect(page.getByTestId('wp-gewaehlt')).toBeVisible();
}

test('FWS Moosseedorf: Vorschau = Dashboard, Druck frei, Druckansicht nur Bericht, PDF', async ({ page }, info) => {
  const s = fixture('state-v4-fws-moosseedorf.json');
  s.geraet.auswahlId = 'OE-0001';
  await vorbelegen(page, s);
  const qh = await dashboardWert(page, info, 'kpi-qh');
  const qhl = await dashboardWert(page, info, 'kpi-qhl');
  const vl = await dashboardWert(page, info, 'kpi-vl');
  expect(qh).toBe('10.73 kW');
  await zumBericht(page);
  const b = page.getByTestId('bericht');
  await expect(b.getByTestId('bericht-qh')).toHaveText(qh);
  await expect(b.getByTestId('bericht-qhl')).toHaveText(qhl);
  await expect(b.getByTestId('bericht-vl')).toHaveText(vl);
  await expect(b.getByTestId('bericht-methode')).toContainText('FWS-Kurs Modul 3');
  await expect(b.getByTestId('kapitel-rechenweg')).toContainText("Kalenderjahr 2024: 2'500 m³");
  await expect(b.getByTestId('kapitel-warmwasser')).toBeVisible();
  await expect(b.getByTestId('kapitel-waermepumpe')).toContainText('Oertli');
  await expect(b).not.toContainText('JAZ');
  await freigeben(page);
  await foto(page, info, 'bericht-fws');
  await druckSmoke(page, info, 'moosseedorf');
});

test('Öl mit Tankständen: Herleitung der Menge, Heizgradtage MeteoSchweiz, PDF', async ({ page }, info) => {
  const s = fixture('state-v4-fws-moosseedorf.json');
  s.projekt.name = 'Öl mit Tankständen';
  s.gebaeude.baujahr = 1975;
  s.gebaeude.standort = { plz: '3011', kanton: 'BE' };
  s.gebaeude.ebfManuellM2 = 180;
  s.verbrauch.wwBisher = false;
  s.verbrauch.eta = {};
  s.verbrauch.reihen = [
    {
      id: 'r-oel',
      energietraeger: 'heizoel',
      art: 'lieferungen',
      ablesungen: [
        { id: 'a1', datum: '2023-09-15', bestand: 1200 },
        { id: 'a2', datum: '2024-05-20', bestand: 1700 },
      ],
      lieferungen: [
        { id: 'l1', datum: '2023-09-15', menge: 2500 },
        { id: 'l2', datum: '2024-01-10', menge: 1800 },
      ],
    },
  ];
  await vorbelegen(page, s);
  await geraetWaehlen(page);
  await zumBericht(page);
  const rw = page.getByTestId('bericht').getByTestId('kapitel-rechenweg');
  await expect(rw).toContainText('Lieferungen und Tank-/Lagerstände');
  await expect(rw).toContainText("Stand 15.9.2023 1'200 + Lieferungen 2'500 + 1'800 − Stand 20.5.2024 1'700 = 3'800 l in 248 Tagen");
  await expect(rw).toContainText('MeteoSchweiz, Bern');
  await expect(rw.getByTestId('bericht-klimabereinigung')).toHaveCount(0);
  await expect(page.getByTestId('bericht').getByTestId('bericht-qh')).toHaveText(await dashboardWert(page, info, 'kpi-qh'));
  await freigeben(page);
  await druckSmoke(page, info, 'oel-tankstaende');
});

test('raumweise mit Standardaufbauten: Wärmeabgabe-Kapitel = Schritt 6, Bauteil-Grundlage, PDF', async ({ page }, info) => {
  const s = fixture('state-v4-raumweise-efh.json');
  s.projekt.name = 'CH-EFH 1965 mit Standardaufbauten';
  for (const r of s.raeume) for (const bt of r.bauteile) delete bt.uOverride;
  await vorbelegen(page, s);
  await page.getByTestId('schritt-waermeabgabe').click();
  const vlKopf = (await page.getByTestId('wa-raum-1-kopf-vl').textContent())!.trim();
  const auslegung = (await page.getByTestId('wa-auslegungsvl').textContent())!.trim();
  const geraete = page.locator('[data-testid^="geraet-"][data-testid$="-waehlen"]');
  await page.getByTestId('schritt-waermepumpe').click();
  if (await geraete.count()) await geraete.first().click();
  await zumBericht(page);
  const b = page.getByTestId('bericht');
  await expect(b.getByTestId('kapitel-waermeabgabe')).toBeVisible();
  await expect(b.getByTestId('bericht-wa-vl')).toHaveText(auslegung);
  // Kopf in Schritt 6 ist gerundet (0 Dezimalen), der Bericht zeigt 1 Dezimale
  const berichtVl = Number((await b.locator('[data-testid^="bericht-wa-raum-"][data-testid$="-vl"]').first().textContent())!.replace(/[^\d.]/g, ''));
  expect(Math.round(berichtVl)).toBe(Number(vlKopf.replace(/[^\d.]/g, '')));
  await expect(b.getByTestId('kapitel-rechenweg')).toContainText('Standard aus Baujahr 1965');
  await expect(b.getByTestId('bericht-methode')).toContainText('SIA 384/2:2020');
  await expect(b.getByTestId('kapitel-annahmen')).toBeVisible();
  // ohne passendes Gerät: nur Warnung, Druck nach Bestätigung frei
  await freigeben(page);
  await foto(page, info, 'bericht-raumweise');
  await druckSmoke(page, info, 'raumweise-standardaufbauten');
});

test('Leeres Projekt: Druck gesperrt, offene Punkte mit Sprung in den Schritt', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('methode-fws').click();
  await zumBericht(page);
  await expect(page.getByTestId('bericht-offen')).toBeVisible();
  await expect(page.getByTestId('bericht-drucken')).toBeDisabled();
  await expect(page.getByTestId('bericht-offen-text')).toContainText('gesperrt');
  await page.getByTestId('bericht-offen').getByRole('button', { name: /Gebäude/ }).first().click();
  await expect(page.getByTestId('seite-gebaeude')).toBeVisible();
});

test('JSON-Export und Laden aus Datei: gleiches Projekt, gleiches Ergebnis', async ({ page }, info) => {
  const s = fixture('state-v4-fws-moosseedorf.json');
  s.geraet.auswahlId = 'OE-0001';
  await vorbelegen(page, s);
  await zumBericht(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('bericht-json').click()]);
  expect(download.suggestedFilename()).toMatch(/^heizlast-referenzhaus-moosseedorf-\d{4}-\d{2}-\d{2}\.json$/);
  const pfad = info.outputPath('export.json');
  await download.saveAs(pfad);
  const json = JSON.parse(readFileSync(pfad, 'utf8'));
  expect(json.meta.schemaVersion).toBe(4);
  expect(json.projekt.name).toBe('Referenzhaus Moosseedorf');
  // neues Projekt, dann aus Datei laden
  page.on('dialog', (d) => d.accept());
  await page.getByTestId('projekt-neu').click();
  await expect(page.getByTestId('projektname')).toHaveText('Neues Projekt');
  await page.getByTestId('projekte').click();
  await page.getByTestId('projekt-datei').setInputFiles(pfad);
  await expect(page.getByTestId('projektname')).toHaveText('Referenzhaus Moosseedorf');
  await expect(page.getByTestId('lademeldungen')).toContainText('Aus Datei geladen');
  expect(await dashboardWert(page, info, 'kpi-qh')).toBe('10.73 kW');
});
