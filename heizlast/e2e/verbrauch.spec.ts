import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

/**
 * Session 7b: Verbrauchserfassung wie im FWS-Rechner oder besser — Öl mit Lieferungen und Tankständen, Gas mit
 * Zählerständen, Sanierung mitten im Zeitraum, Heizgradtage automatisch (Station Bern), Klimabereinigung.
 * Sollwerte: tests/kern/verbrauchsreihe.test.ts (3 800 l in 248 Tagen; Zähler 2 500/2 400/2 600 m³).
 */
const SHOTS = 'docs/revision/shots-neu';
const foto = async (page: Page, info: TestInfo, name: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const lokal = String(info.project.use.baseURL ?? '').includes('127.0.0.1');
  await page.screenshot({ path: lokal ? `${SHOTS}/s7b-${name}-${info.project.name}.png` : info.outputPath(`s7b-${name}.png`), fullPage: true });
};

async function projektBern(page: Page, name: string) {
  await page.goto('./');
  await page.getByTestId('projektname-eingabe').fill(name);
  await page.getByTestId('methode-fws').click();
  await page.getByTestId('weiter').click();
  await page.getByTestId('gebaeude-typ-efh').click();
  await page.getByTestId('gebaeude-baujahr').fill('1975');
  await page.getByTestId('standort-plz').fill('3011');
  await page.getByTestId('standort-kanton').selectOption({ label: 'BE' });
  await page.getByTestId('ebf-modus-manuell').click();
  await page.getByTestId('ebf-manuell').fill('180');
  await expect(page.getByTestId('klima-bezeichnung')).toContainText('Bern');
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
}

test('Öl mit Lieferungen und Tankständen: Verbrauch aus Ständen, HGT automatisch, Hochrechnung nach HGT-Anteil', async ({ page }, info) => {
  await projektBern(page, 'Öl-Lieferungen Bern');
  await page.getByTestId('reihe-neu').click();
  // Erste Reihe: Heizöl → Erfassungsart Lieferungen vorbelegt
  await expect(page.getByTestId('reihe-1-art')).toHaveValue('1');
  await expect(page.getByTestId('reihe-1-staende')).toBeVisible();
  await page.getByTestId('reihe-1-stand-neu').click();
  await page.getByTestId('reihe-1-stand-1-datum').fill('2023-09-15');
  await page.getByTestId('reihe-1-stand-1-bestand').fill('1200');
  await page.getByTestId('reihe-1-stand-neu').click();
  await page.getByTestId('reihe-1-stand-2-datum').fill('2024-05-20');
  await page.getByTestId('reihe-1-stand-2-bestand').fill('1700');
  await page.getByTestId('reihe-1-lieferung-neu').click();
  await page.getByTestId('reihe-1-lieferung-1-datum').fill('2023-09-15');
  await page.getByTestId('reihe-1-lieferung-1-menge').fill('2500');
  await page.getByTestId('reihe-1-lieferung-neu').click();
  await page.getByTestId('reihe-1-lieferung-2-datum').fill('2024-01-10');
  await page.getByTestId('reihe-1-lieferung-2-menge').fill('1800');
  await page.getByTestId('ww-bisher-nein').click();

  // Abgeleiteter Zeitraum: 1 200 + 2 500 + 1 800 − 1 700 = 3 800 l in 248 Tagen
  const zeile = page.getByTestId('reihe-1-ergebnis-1');
  await expect(zeile).toContainText('15.9.2023 – 19.5.2024');
  await expect(zeile).toContainText('248');
  await expect(page.getByTestId('reihe-1-ergebnis-1-menge')).toHaveText("3'800 l");
  // Heizgradtage automatisch als Tabellenwert (Station Bern), Jahresanteil nach HGT ≈ 0.9…1.0, pro Jahr < 3 800 × 365/248
  const hgt = page.getByTestId('reihe-1-ergebnis-1-hgt');
  await expect(hgt).toHaveAttribute('data-standard', 'ja');
  const hgtWert = Number(await hgt.inputValue());
  expect(hgtWert).toBeGreaterThan(2000);
  expect(hgtWert).toBeLessThan(3500);
  const anteil = Number(await page.getByTestId('reihe-1-ergebnis-1-anteil').textContent());
  expect(anteil).toBeGreaterThan(0.85);
  expect(anteil).toBeLessThan(1);
  const proJahr = Number((await page.getByTestId('reihe-1-ergebnis-1-jahr').textContent())!.replace(/[^\d]/g, ''));
  expect(proJahr).toBeGreaterThan(3800);
  expect(proJahr).toBeLessThan(Math.round((3800 * 365) / 248));
  await expect(page.getByTestId('traeger-heizoel-menge')).toHaveText(`${proJahr.toLocaleString('de-CH').replace(/’|’/g, "'")} l/a`);

  // HGT manuell überschreiben → Jahresanteil ändert, «Standard verwenden» setzt zurück
  await hgt.fill('2000');
  await expect(hgt).toHaveAttribute('data-eigen', 'ja');
  await expect(page.getByTestId('reihe-1-ergebnis-1-anteil')).not.toHaveText(String(anteil.toFixed(2)));
  await page.getByTestId('reihe-1-ergebnis-1-hgt-zuruecksetzen').click();
  await expect(hgt).toHaveAttribute('data-standard', 'ja');
  await expect(page.getByTestId('reihe-1-ergebnis-1-anteil')).toHaveText(anteil.toFixed(2));

  // Negativer Verbrauch wird als Fehler gemeldet, Heizlast fehlt
  await page.getByTestId('reihe-1-stand-2-bestand').fill('9000');
  await expect(page.getByTestId('verbrauch-meldungen')).toContainText('negativer Verbrauch');
  await page.getByTestId('reihe-1-stand-2-bestand').fill('1700');
  await foto(page, info, 'oel-lieferungen');

  // Heizlast vorhanden
  await page.getByTestId('schritt-heizlast').click();
  await expect(page.getByTestId('heizlast-status')).toHaveText('aus Verbrauch');
  await expect(page.getByTestId('heizlast-qhl')).not.toHaveText('—');
});

test('Gas mit Zählerständen: Differenzen je Kalenderjahr, Streuung grün, Klimabereinigung schaltet alle Zeiträume um', async ({ page }, info) => {
  await projektBern(page, 'Gas-Zähler Bern');
  await page.getByTestId('reihe-neu').click();
  await page.getByTestId('reihe-1-traeger').selectOption({ label: 'Erdgas' });
  await expect(page.getByTestId('reihe-1-art')).toHaveValue('2'); // Zählerstände
  const staende: [string, string][] = [
    ['2022-01-01', '10000'],
    ['2023-01-01', '12500'],
    ['2024-01-01', '14900'],
    ['2025-01-01', '17500'],
  ];
  for (const [i, [datum, stand]] of staende.entries()) {
    await page.getByTestId('reihe-1-zaehler-neu').click();
    await page.getByTestId(`reihe-1-zaehler-${i + 1}-datum`).fill(datum);
    await page.getByTestId(`reihe-1-zaehler-${i + 1}-stand`).fill(stand);
  }
  await page.getByTestId('ww-bisher-nein').click();
  await expect(page.getByTestId('reihe-1-ergebnis-1-menge')).toHaveText("2'500 m³");
  await expect(page.getByTestId('reihe-1-ergebnis-2-menge')).toHaveText("2'400 m³");
  await expect(page.getByTestId('reihe-1-ergebnis-3-menge')).toHaveText("2'600 m³");
  await expect(page.getByTestId('reihe-1-ergebnis-3')).toContainText('ganzes Jahr');
  await expect(page.getByTestId('reihe-1-ergebnis-1-anteil')).toHaveText('1.00');
  await expect(page.getByTestId('streuung')).toHaveAttribute('data-ampel', 'gruen');
  const mittelAus = await page.getByTestId('traeger-erdgas-menge').textContent();
  const qnAus = await page.getByTestId('traeger-erdgas-qn').textContent();

  // Klimabereinigung: Jahresanteil = HGT/HGT_norm (< 1 in den warmen Jahren), Klimafaktor sichtbar, Nutzwärme (brutto) unverändert
  await page.getByTestId('klimabereinigung').check();
  await expect(page.getByTestId('reihe-1-ergebnis-1-anteil')).not.toHaveText('1.00');
  await expect(page.getByTestId('reihe-1-ergebnis-1')).toContainText('Klimafaktor');
  await expect(page.getByTestId('traeger-erdgas-qn')).toHaveText(qnAus ?? '');
  await expect(page.getByTestId('traeger-erdgas-menge')).toHaveText(mittelAus ?? '');
  await foto(page, info, 'gas-zaehler-klima');
  await page.getByTestId('klimabereinigung').uncheck();
  await expect(page.getByTestId('reihe-1-ergebnis-1-anteil')).toHaveText('1.00');
});

test('Sanierung mitten in einer Lieferperiode: Teilperioden in Schritt 3 und Wirkung je Zeitraum in Schritt 2 sichtbar', async ({ page }, info) => {
  await projektBern(page, 'Sanierung im Zeitraum');
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
  await page.getByTestId('ww-bisher-nein').click();
  await page.getByTestId('schritt-heizlast').click();
  const qhlVorher = await page.getByTestId('heizlast-qhl').textContent();

  // Schritt 2: Fenster ausgeführt Januar 2024 (Monat/Jahr-Auswahl)
  await page.getByTestId('schritt-sanierungen').click();
  await page.getByTestId('sanierung-neu').click();
  await page.getByTestId('sanierung-1-datum-jahr').selectOption('2024');
  await page.getByTestId('sanierung-1-datum-monat').selectOption('01');
  const wirkung = page.getByTestId('sanierung-1-wirkung');
  await expect(wirkung).toContainText('15.9.2023 – 19.5.2024');
  await expect(wirkung).toContainText('mitten im Zeitraum');
  await expect(wirkung).toContainText('108 d × 1.00 + 140 d × 0.85');
  await foto(page, info, 'sanierung-wirkung');

  // Schritt 3: Teilperioden in der Zeitraum-Tabelle; Heizlast kleiner als vorher
  await page.getByTestId('schritt-verbrauch').click();
  await expect(page.getByTestId('reihe-1-ergebnis-1')).toContainText('108 d × 1.00 + 140 d × 0.85');
  await page.getByTestId('schritt-heizlast').click();
  await expect(page.getByTestId('heizlast-qhl')).not.toHaveText(qhlVorher ?? '');
  await expect(page.getByTestId('rechenweg-fws')).toContainText('Heizwärme heute');
});

test('Zeiträume nach Monaten und ohne Station: Hochrechnung nach Tagen mit Warnung', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('methode-fws').click();
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
  await page.getByTestId('reihe-neu').click();
  await page.getByTestId('reihe-1-traeger').selectOption({ label: 'Erdgas' });
  await page.getByTestId('reihe-1-art').selectOption({ label: 'Zeiträume oder Kalenderjahre' });
  await page.getByTestId('reihe-1-zeitraum-neu').click();
  await page.getByTestId('reihe-1-zeitraum-1-modus-monate').click();
  await page.getByTestId('reihe-1-zeitraum-1-von-jahr').selectOption('2023');
  await page.getByTestId('reihe-1-zeitraum-1-von-monat').selectOption('10');
  await page.getByTestId('reihe-1-zeitraum-1-bis-jahr').selectOption('2024');
  await page.getByTestId('reihe-1-zeitraum-1-bis-monat').selectOption('04');
  await page.getByTestId('reihe-1-zeitraum-1-menge').fill('1800');
  await expect(page.getByTestId('reihe-1-ergebnis-1')).toContainText('1.10.2023 – 30.4.2024');
  await expect(page.getByTestId('reihe-1-ergebnis-1-hgt-fehlt')).toBeVisible();
  await expect(page.getByTestId('reihe-1-ergebnis-1-anteil-herkunft')).toContainText('nach Tagen');
});
