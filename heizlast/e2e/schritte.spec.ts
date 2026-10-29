import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

/**
 * Session 7: Schritte 0–4 über die Oberfläche (Desktop 1280 / Mobil 390).
 * Sollwerte extern: Moosseedorf (BEISPIELRECHNUNG / Befund A1, Q_hl 9 304.7 W) und CH-EFH Bern 1965 von Hand
 * (tests/kern/raumweise.test.ts: Wohnen 2 098.6 W, Bad 570.3 W bei θe −7 °C).
 */
const SHOTS = 'docs/revision/shots-neu';

const dashboard = async (page: Page, info: TestInfo) => {
  if (info.project.name === 'desktop') return page.getByTestId('dashboard');
  const leiste = page.getByTestId('dashboard-leiste');
  if ((await leiste.getAttribute('data-offen')) === 'false') await leiste.getByRole('button').first().click();
  return leiste;
};
const zuklappen = async (page: Page, info: TestInfo) => {
  if (info.project.name === 'desktop') return;
  const leiste = page.getByTestId('dashboard-leiste');
  if ((await leiste.getAttribute('data-offen')) === 'true') await leiste.getByRole('button').first().click();
};
const foto = async (page: Page, info: TestInfo, name: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOTS}/s7-${name}-${info.project.name}.png`, fullPage: true });
};

test('FWS-Fall Moosseedorf: Projekt → Gebäude → Verbrauch → Heizlast', async ({ page }, info) => {
  await page.goto('./');
  await page.getByTestId('projektname-eingabe').fill('Referenzhaus Moosseedorf');
  await page.getByTestId('methode-fws').click();
  await foto(page, info, 'projekt');
  await page.getByTestId('weiter').click();

  // Schritt 1
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gebäude');
  // Ohne Standort: θe −8 °C steht als Standardwert im Feld
  await expect(page.getByTestId('standort-thetae')).toHaveValue('-8');
  await expect(page.getByTestId('standort-thetae')).toHaveAttribute('data-standard', 'ja');
  await page.getByTestId('gebaeude-typ-efh').click();
  await page.getByTestId('gebaeude-baujahr').fill('1988');
  await page.getByTestId('standort-plz').fill('3302');
  await page.getByTestId('standort-ort').fill('Moosseedorf');
  await page.getByTestId('standort-kanton').selectOption({ label: 'BE' });
  await page.getByTestId('standort-hoehe').fill('550');
  // Keller/Dach sind im FWS-Modus nicht relevant → nicht gerendert
  await expect(page.getByTestId('gebaeude-keller')).toHaveCount(0);
  await page.getByTestId('ebf-modus-manuell').click();
  await page.getByTestId('ebf-manuell').fill('150');
  await expect(page.getByTestId('klima-bezeichnung')).toContainText('Wynau');
  await expect(page.getByTestId('standort-thetae')).toHaveValue('-7');
  await foto(page, info, 'gebaeude');

  // Schritt 3A
  await page.getByTestId('schritt-verbrauch').click();
  await expect(page.getByTestId('abzug')).toHaveCount(0);
  await page.getByTestId('quelle-rechnungen').click();
  await page.getByTestId('eintrag-neu').click();
  await page.getByTestId('eintrag-1-traeger').selectOption({ label: 'Erdgas' });
  await page.getByTestId('eintrag-1-jahr').fill('2024');
  await page.getByTestId('eintrag-1-menge').fill('2500');
  await page.getByTestId('eta-erdgas').fill('0.9');

  // Bedingte Felder: WW-Abzug nur bei «WW bisher über die Heizung»; Personen- oder Liter-Felder je Methode
  await page.getByTestId('ww-bisher-nein').click();
  await expect(page.getByTestId('abzug')).toHaveCount(0);
  await page.getByTestId('ww-bisher-ja').click();
  await expect(page.getByTestId('abzug')).toBeVisible();
  await expect(page.getByTestId('abzug-personen')).toBeVisible();
  await expect(page.getByTestId('abzug-vwu')).toHaveCount(0);
  await page.getByTestId('abzug-methode-direkt').click();
  await expect(page.getByTestId('abzug-personen')).toHaveCount(0);
  await page.getByTestId('abzug-vwu').fill('180');
  await expect(page.getByTestId('ww-abzug')).toBeVisible();
  await zuklappen(page, info);
  await foto(page, info, 'verbrauch');

  // Mobil: Schrittleiste bleibt nach dem Scrollen sichtbar
  await page.mouse.wheel(0, 1500);
  await expect(page.getByRole('navigation', { name: 'Schritte' })).toBeInViewport();

  // Schritt 4 — Moosseedorf: Q_hl 9 304.7 W (Befund A1)
  await page.getByTestId('schritt-heizlast').click();
  await expect(page.getByTestId('heizlast-qhl')).toHaveText('9.3 kW');
  await expect(page.getByTestId('heizlast-status')).toHaveText('aus Verbrauch');
  await expect(page.getByTestId('heizlast-methode')).toContainText('FWS-Kurs');
  await expect(page.getByTestId('rechenweg-qhl')).toHaveText('9.3 kW');
  await expect(page.getByTestId('raumtabelle')).toHaveCount(0);
  await foto(page, info, 'heizlast-fws');

  // Dashboard liest dasselbe Ergebnis
  const dash = await dashboard(page, info);
  await expect(dash.getByTestId('kpi-qhl')).toHaveText('9.3 kW');
  await expect(dash.getByTestId('kpi-methode')).toHaveText('FWS-Kurs');
  // Annahmen-Liste mit Sprungziel
  await dash.getByTestId('annahmen').locator('summary').click();
  await dash.getByTestId('annahmen-sprung-gebaeude').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gebäude');
});

test('Raumweise-Fall CH-EFH: Hülle, zwei Räume, Picker ohne stale Anzeige, Heizlast', async ({ page }, info) => {
  await page.goto('./');
  await page.getByTestId('projektname-eingabe').fill('CH-EFH Bern 1965');
  await page.getByTestId('methode-raumweise').click();
  await page.getByTestId('weiter').click();

  await page.getByTestId('gebaeude-typ-efh').click();
  await page.getByTestId('gebaeude-baujahr').fill('1965');
  await page.getByTestId('standort-plz').fill('3000');
  await page.getByTestId('standort-kanton').selectOption({ label: 'BE' });
  await page.getByTestId('standort-thetae').fill('-7');
  await page.getByTestId('gebaeude-keller-unbeheizt').click();
  await page.getByTestId('gebaeude-dachform-steil').click();
  await page.getByTestId('gebaeude-dachraum-ja').click();
  await page.getByTestId('ebf-modus-raeume').click();

  // Schritt 3B: Bauteiltypen vorschlagen, Lüftung/Wärmebrücken wie Handrechnung
  await page.getByTestId('schritt-huelle').click();
  await page.getByTestId('typen-anlegen').click();
  await expect(page.getByTestId('typ-aw')).toBeVisible();
  await page.getByTestId('lueftung-konzept').selectOption({ index: 1 });
  await page.getByTestId('lueftung-dichtheit').selectOption({ label: 'Bestand ohne Nachweis' });
  await page.getByTestId('waermebruecken').selectOption({ index: 1 });
  await page.getByTestId('geschosshoehe').fill('2.5');

  // Raum 1 Wohnen: 25 m², Aussenwand + Fenster, darunter unbeheizter Keller
  await page.getByTestId('raum-neu').click();
  await page.getByTestId('raum-1-name').fill('Wohnen');
  await page.getByTestId('raum-1-flaeche').fill('25');
  await page.getByTestId('raum-1-lage-unten-keller').click();
  await page.getByTestId('raum-1-lage-oben-beheizt').click();
  const r1 = page.getByTestId('raum-1');
  await r1.getByTestId(/-lage-anlegen$/).click();
  const aw = r1.getByTestId(/-bauteil-1-u$/);
  await r1.getByTestId(/-bauteil-1-flaeche$/).fill('19');
  await r1.getByTestId(/-bauteil-2-flaeche$/).fill('6');

  // U erbt aus der Hülle (Standardwert im Feld) — Picker-Änderung wirkt sofort auf Feld und Raum (keine stale Anzeige)
  await expect(aw).toHaveAttribute('data-standard', 'ja');
  const uVorher = await aw.inputValue();
  const phiVorher = await r1.getByTestId('raum-1-phihl').textContent();
  await page.getByTestId('typ-aw-picker').locator('summary').click();
  await page.getByTestId('typ-aw-picker-daemmung').selectOption({ label: 'Ja' });
  await expect(aw).not.toHaveValue(uVorher);
  await expect(r1.getByTestId('raum-1-phihl')).not.toHaveText(phiVorher ?? '');
  await expect(page.getByTestId('typ-aw-picker-klartext')).toContainText('1965');

  // Eigene U-Werte wie Handrechnung (markiert als eigener Wert)
  await aw.fill('1.1');
  await expect(aw).toHaveAttribute('data-eigen', 'ja');
  await r1.getByTestId(/-bauteil-2-u$/).fill('2.7');
  await r1.getByTestId(/-bauteil-3-u$/).fill('2.1');
  await expect(r1.getByTestId('raum-1-phihl')).toHaveText("2'099 W");

  // Raum 2 Bad: 2 × 3 m, Aussenwand + Fenster, Dach darüber, Innenwand/-decke zu beheizten Räumen
  await page.getByTestId('raum-neu').click();
  const r2 = page.getByTestId('raum-2');
  await page.getByTestId('raum-2-name').fill('Bad');
  await page.getByTestId('raum-2-typ').selectOption({ index: 4 });
  await page.getByTestId('raum-2-flaeche-umschalten').click();
  await page.getByTestId('raum-2-laenge').fill('2');
  await page.getByTestId('raum-2-breite').fill('3');
  await page.getByTestId('raum-2-lage-unten-beheizt').click();
  await page.getByTestId('raum-2-lage-oben-dach').click();
  await r2.getByTestId(/-lage-anlegen$/).click();
  await r2.getByTestId(/-bauteil-1-flaeche$/).fill('6.5');
  await r2.getByTestId(/-bauteil-1-u$/).fill('1.1');
  await r2.getByTestId(/-bauteil-2-flaeche$/).fill('1');
  await r2.getByTestId(/-bauteil-2-u$/).fill('2.7');
  await expect(r2.getByTestId(/-bauteil-3-flaeche$/)).toHaveValue('6');
  await r2.getByTestId(/-bauteil-3-u$/).fill('0.5');
  for (const [nr, typ, flaeche, u] of [[4, 'Innenwand', '5', '1.9'], [5, 'Innendecke / Zwischenboden', '6', '3']] as const) {
    await page.getByTestId('raum-2-bauteil-neu').click();
    await r2.getByTestId(new RegExp(`-bauteil-${nr}-typ$`)).selectOption({ label: typ });
    await r2.getByTestId(new RegExp(`-bauteil-${nr}-flaeche$`)).fill(flaeche);
    await r2.getByTestId(new RegExp(`-bauteil-${nr}-anschluss$`)).selectOption('beheizt');
    await r2.getByTestId(new RegExp(`-bauteil-${nr}-nachbar$`)).fill('20');
    await r2.getByTestId(new RegExp(`-bauteil-${nr}-u$`)).fill(u);
  }
  await expect(r2.getByTestId('raum-2-phihl')).toHaveText('570 W');
  await expect(page.getByTestId('huelle-ebf')).toHaveText('34.1 m²');
  await zuklappen(page, info);
  await foto(page, info, 'huelle');

  // Schritt 4: Raumtabelle und Gebäude-Heizlast; Dashboard = Seite
  await page.getByTestId('schritt-heizlast').click();
  const zeilen = page.locator('[data-testid^="heizlast-raum-"][data-testid$="-phihl"]');
  await expect(zeilen).toHaveCount(2);
  await expect(zeilen.nth(0)).toHaveText("2'099 W");
  await expect(zeilen.nth(1)).toHaveText('570 W');
  await expect(page.getByTestId('heizlast-status')).toHaveText('raumweise');
  await expect(page.getByTestId('heizlast-methode')).toContainText('SIA 384/2');
  const qhl = await page.getByTestId('heizlast-qhl').textContent();
  await foto(page, info, 'heizlast-raumweise');
  const dash = await dashboard(page, info);
  await expect(dash.getByTestId('kpi-qhl')).toHaveText(qhl ?? '');
  await expect(dash.getByTestId('kpi-methode')).toHaveText('SIA 384/2');
});

test('Moduswechsel: Daten bleiben, ruhende Angaben werden genannt', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('methode-fws').click();
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
  await page.getByTestId('eintrag-neu').click();
  await page.getByTestId('schritt-projekt').click();
  await page.getByTestId('methode-raumweise').click();
  await expect(page.getByTestId('ruhende-angaben')).toContainText('Verbrauchsdaten (1 Einträge)');
  await page.getByTestId('methode-fws').click();
  await page.getByTestId('schritt-verbrauch').click();
  await expect(page.getByTestId('eintrag-1')).toBeVisible();
});
