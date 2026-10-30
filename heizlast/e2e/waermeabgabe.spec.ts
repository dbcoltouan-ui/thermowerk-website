import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Session 8 — Schritte 5–9 und Zusatzmodule über die Oberfläche (Desktop 1280 / Mobil 390).
 * Sollwerte extern:
 *  - Befund B2 (befund_heizkoerper.md §5): Gussradiator 10 Glieder H 600 T 160 ≈ 94–96 W/Glied bei 75/65/20 (V&N).
 *    Bad der CH-EFH-Handrechnung (tests/kern/raumweise.test.ts): Φ_HL 570.3 W bei θint 22 °C, Kreis 55/45 (10 K)
 *    → θ_VL,req = 22 + x mit ln(x/(x − 10)) = 10 / (49.83 · (570.3/960)^(1/1.3)) → x ≈ 38.6 K → ≈ 60.6 °C (Band 59–63 °C).
 *  - Befund B1: Typ 22 600 × 1000 Q_N ≈ 1697–1709 W (Purmo/Kermi). Moosseedorf Q_hl 9 304.7 W, EBF 150 m²,
 *    FWS Folie 33 (EBF ≈ NWF × 1.10): Raum 20 m² → Φ_HL ≈ 1 365 W (Verteilung nach Fläche).
 *  - Moosseedorf Q_h 10.73 kW (tests/state/berechne.test.ts).
 * Kernaussage aller Prüfungen: Seite, Dashboard und Gerätefilter zeigen denselben Wert (eine Quelle, Ergebnis).
 */
const SHOTS = 'docs/revision/shots-neu';
const fixture = (name: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../tests/fixtures/${name}`, import.meta.url)), 'utf8'));

/** Entwurf vorbelegen (nur beim ersten Laden des Tabs, wie e2e/skala.spec.ts). */
async function vorbelegen(page: Page, state: unknown) {
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('vorbelegt')) {
      localStorage.setItem('thermowerk-heizlast-v2-entwurf', JSON.stringify({ format: 1, state: s, basisHash: null }));
      sessionStorage.setItem('vorbelegt', '1');
    }
  }, state);
  await page.goto('./');
}
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
  await zuklappen(page, info);
  await page.evaluate(() => window.scrollTo(0, 0));
  const lokal = String(info.project.use.baseURL ?? '').includes('127.0.0.1');
  await page.screenshot({ path: lokal ? `${SHOTS}/s8-${name}-${info.project.name}.png` : info.outputPath(`s8-${name}.png`), fullPage: true });
};
const zahlAus = async (page: Page, testid: string) => Number((await page.getByTestId(testid).first().textContent())!.replace(/[^\d.-]/g, ''));

/** Kein horizontales Scrollen (wie e2e/mobil.spec.ts): Dokument und sichtbare Elemente innerhalb der Viewport-Breite. */
async function keinHorizontalesScrollen(page: Page, name: string) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const zuBreit: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
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

test('HK-Fluss: Guss 10 Glieder im Bad → θ_VL,req → Auslegungs-VL → Dashboard → Gerätefilter', async ({ page }, info) => {
  await vorbelegen(page, fixture('state-v3-raumweise-efh.json'));
  await page.getByTestId('schritt-waermeabgabe').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wärmeabgabe');

  // Raum 2 = Bad (ohne Heizfläche): Bauart wählen, anlegen, Masse nach Bauart
  const bad = page.getByTestId('wa-raum-2');
  await expect(bad).toContainText('Bad');
  await bad.getByTestId('wa-raum-2-hf-bauart').selectOption('guss_glieder');
  await bad.getByTestId('wa-raum-2-hf-neu').click();
  await expect(bad.getByTestId('wa-raum-2-hf-1-bauart')).toHaveValue('guss_glieder');
  // Gussradiator: Glieder/Nabenabstand/Gliedbreite sichtbar, keine Fläche/kein Verlegeabstand
  await expect(bad.getByTestId('wa-raum-2-hf-1-glieder')).toBeVisible();
  await expect(bad.getByTestId('wa-raum-2-hf-1-nabenabstand')).toBeVisible();
  await expect(bad.getByTestId('wa-raum-2-hf-1-flaeche')).toHaveCount(0);
  await bad.getByTestId('wa-raum-2-hf-1-hoehe').fill('600');
  await bad.getByTestId('wa-raum-2-hf-1-glieder').fill('10');
  // Standardwerte sichtbar als Zahl: Bautiefe 160 mm, Gliedbreite aus der DIN-Tabelle
  await expect(bad.getByTestId('wa-raum-2-hf-1-tiefe')).toHaveValue('160');
  await expect(bad.getByTestId('wa-raum-2-hf-1-tiefe')).toHaveAttribute('data-standard', 'ja');
  await expect(bad.getByTestId('wa-raum-2-hf-1-gliedbreite')).toHaveAttribute('data-standard', 'ja');
  // Q_N ≈ 10 × 94–96 W (Befund B2)
  const qn = await zahlAus(page, 'wa-raum-2-hf-1-qn');
  expect(qn).toBeGreaterThan(900);
  expect(qn).toBeLessThan(1000);
  // θ_VL,req je Raum sichtbar (Band aus der Handrechnung oben), Ampel und Massnahmen
  const tvl = await zahlAus(page, 'wa-raum-2-tvlreq');
  expect(tvl).toBeGreaterThan(59);
  expect(tvl).toBeLessThan(63);
  await expect(bad.getByTestId('wa-raum-2-ampel')).toHaveAttribute('data-ampel', 'rot');
  await expect(bad.getByTestId('wa-raum-2-massnahmen')).toContainText('Glieder');
  // Gebäude: Bad ist massgebend → Auslegungs-VL = θ_VL,req Bad (gleicher Wert, eine Quelle)
  const tvlText = (await page.getByTestId('wa-raum-2-tvlreq').textContent())!;
  await expect(page.getByTestId('wa-auslegungsvl')).toHaveText(tvlText);
  await expect(page.getByTestId('wa-skala')).toHaveAttribute('data-ampel', 'gelb');
  await expect(page.getByTestId('wa-kritisch')).toContainText('Bad');
  await foto(page, info, 'waermeabgabe');

  // Dashboard liest dasselbe Ergebnis
  const dash = await dashboard(page, info);
  await expect(dash.getByTestId('kpi-vl')).toHaveText(`${Math.round(tvl)} °C`);
  await expect(dash.getByTestId('skala-vorlauf')).toHaveAttribute('data-ampel', 'gelb');
  await expect(dash.getByTestId('kpi-kritisch')).toContainText('Bad');
  await expect(dash.getByTestId('kpi-raeume-rot')).toContainText('von 2 Räumen');
  await zuklappen(page, info);

  // Gerätefilter übernimmt die Auslegungs-VL mit Herkunft
  await page.getByTestId('schritt-waermepumpe').click();
  await expect(page.getByTestId('wp-vorlauf')).toHaveValue(String(Math.round(tvl * 10) / 10));
  await expect(page.getByTestId('wp-vorlauf')).toHaveAttribute('data-standard', 'ja');
  await expect(page.getByTestId('wp-vorlauf-herkunft')).toHaveText('aus Heizflächen, max. Raum: Bad');
  // Override des Filter-Vorlaufs ist markiert und zurücksetzbar
  await page.getByTestId('wp-vorlauf').fill('65');
  await expect(page.getByTestId('wp-vorlauf')).toHaveAttribute('data-eigen', 'ja');
  await expect(page.getByTestId('wp-vorlauf-herkunft')).toHaveText('eigene Angabe');
  await page.getByTestId('wp-vorlauf-zuruecksetzen').click();
  await expect(page.getByTestId('wp-vorlauf-herkunft')).toHaveText('aus Heizflächen, max. Raum: Bad');

  // Ausklammern: Bad zählt nicht mehr, Wohnen wird massgebend
  await page.getByTestId('schritt-waermeabgabe').click();
  await page.getByTestId('wa-raum-2-ausklammern').check();
  await page.getByTestId('wa-raum-2-grund').fill('Heizkörper wird ersetzt');
  await expect(page.getByTestId('wa-ausgeklammert')).toContainText('Bad (Heizkörper wird ersetzt)');
  await expect(page.getByTestId('wa-kritisch')).not.toContainText('Bad');
  const tvlWohnen = (await page.getByTestId('wa-raum-1-tvlreq').textContent())!;
  await expect(page.getByTestId('wa-auslegungsvl')).toHaveText(tvlWohnen);
});

test('Mischraum und Typ-Wechsel: FBH + Platten summiert; Platte → Platte behält die Nische, Guss setzt Masse zurück', async ({ page }, info) => {
  await vorbelegen(page, fixture('state-v3-raumweise-efh.json'));
  await page.getByTestId('schritt-waermeabgabe').click();
  const wohnen = page.getByTestId('wa-raum-1');
  const vorher = await zahlAus(page, 'wa-raum-1-qsumme');
  const tvlVorher = await zahlAus(page, 'wa-raum-1-tvlreq');
  // Mischraum: Fussbodenheizung dazu, Fläche aus dem Raum übernehmen
  await wohnen.getByTestId('wa-raum-1-hf-bauart').selectOption('fbh');
  await wohnen.getByTestId('wa-raum-1-hf-neu').click();
  await expect(wohnen.getByTestId('wa-raum-1-hf-3-va')).toHaveValue('150');
  await expect(wohnen.getByTestId('wa-raum-1-hf-3-va')).toHaveAttribute('data-standard', 'ja');
  await wohnen.getByTestId('wa-raum-1-hf-3-flaeche-raum').click();
  await expect(wohnen.getByTestId('wa-raum-1-hf-3-flaeche')).toHaveValue('25');
  const fbh = await zahlAus(page, 'wa-raum-1-hf-3-qziel');
  expect(fbh).toBeGreaterThan(0);
  const p1 = await zahlAus(page, 'wa-raum-1-hf-1-qziel');
  const p2 = await zahlAus(page, 'wa-raum-1-hf-2-qziel');
  const summe = await zahlAus(page, 'wa-raum-1-qsumme');
  expect(summe).toBeGreaterThan(vorher);
  expect(Math.abs(summe - (p1 + p2 + fbh))).toBeLessThanOrEqual(2); // Σ Q (gerundete Anzeige)
  expect(await zahlAus(page, 'wa-raum-1-tvlreq')).toBeLessThan(tvlVorher);
  await foto(page, info, 'mischraum');

  // Typ-Wechsel Platte 22 → 33: Höhe/Länge bleiben (gleiche Nische), Tiefe gehört zum alten Typ
  await wohnen.getByTestId('wa-raum-1-hf-1-tiefe').fill('100');
  await wohnen.getByTestId('wa-raum-1-hf-1-bauart').selectOption('platte_33');
  await expect(wohnen.getByTestId('wa-raum-1-hf-1-hoehe')).toHaveValue('600');
  await expect(wohnen.getByTestId('wa-raum-1-hf-1-laenge')).toHaveValue('1000');
  await expect(wohnen.getByTestId('wa-raum-1-hf-1-tiefe')).toHaveValue('');
  // Platte → Guss: andere Bauart, Masse zurückgesetzt, Maske wechselt
  await wohnen.getByTestId('wa-raum-1-hf-1-bauart').selectOption('guss_glieder');
  await expect(wohnen.getByTestId('wa-raum-1-hf-1-hoehe')).toHaveValue('');
  await expect(wohnen.getByTestId('wa-raum-1-hf-1-glieder')).toBeVisible();
  await expect(wohnen.getByTestId('wa-raum-1-hf-1-hinweise')).toContainText('Masse fehlen');
  // Flächenheizung: keine Typenschild-/Einbau-Felder
  await wohnen.getByTestId('wa-raum-1-hf-3-genauer').locator('summary').click();
  await expect(wohnen.getByTestId('wa-raum-1-hf-3-ts-qn')).toHaveCount(0);
  await expect(wohnen.getByTestId('wa-raum-1-hf-3-nische')).toHaveCount(0);
});

test('FWS-Modus (Moosseedorf über Reihe/Kalenderjahr): Heizfläche ohne raumweise Räume, Raumheizlast verteilt oder eigene Angabe', async ({ page }, info) => {
  await page.goto('./');
  await page.getByTestId('projektname-eingabe').fill('Moosseedorf mit Heizkörper');
  await page.getByTestId('methode-fws').click();
  await page.getByTestId('weiter').click();
  await page.getByTestId('gebaeude-typ-efh').click();
  await page.getByTestId('gebaeude-baujahr').fill('1988');
  await page.getByTestId('standort-plz').fill('3302');
  await page.getByTestId('standort-kanton').selectOption({ label: 'BE' });
  await page.getByTestId('standort-hoehe').fill('550');
  await page.getByTestId('ebf-modus-manuell').click();
  await page.getByTestId('ebf-manuell').fill('150');
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
  await page.getByTestId('reihe-neu').click();
  await page.getByTestId('reihe-1-traeger').selectOption({ label: 'Erdgas' });
  await page.getByTestId('reihe-1-art').selectOption({ label: 'Zeiträume oder Kalenderjahre' });
  await page.getByTestId('reihe-1-zeitraum-neu').click();
  await page.getByTestId('reihe-1-zeitraum-1-jahr').fill('2024');
  await page.getByTestId('reihe-1-zeitraum-1-menge').fill('2500');
  await page.getByTestId('eta-erdgas').fill('0.9');
  await page.getByTestId('ww-bisher-ja').click();
  await page.getByTestId('abzug-methode-direkt').click();
  await page.getByTestId('abzug-vwu').fill('180');
  await page.getByTestId('schritt-heizlast').click();
  await expect(page.getByTestId('heizlast-qhl')).toHaveText('9.3 kW');

  // Schritt 6 im FWS-Modus: Räume nur für die Heizflächen
  await page.getByTestId('schritt-waermeabgabe').click();
  await expect(page.getByTestId('wa-leer')).toBeVisible();
  await expect(page.getByTestId('wa-system')).toBeVisible();
  await page.getByTestId('wa-raum-neu').click();
  await page.getByTestId('wa-raum-1-name').fill('Wohnen');
  await page.getByTestId('wa-raum-1-flaeche').fill('20');
  // Raumheizlast aus der Verteilung (9 304.7 / 150 × 1.10 × 20 ≈ 1 365 W) als geschätzter Wert im Feld
  await expect(page.getByTestId('wa-raum-1-phihl')).toHaveAttribute('data-standard', 'ja');
  const phi = Number(await page.getByTestId('wa-raum-1-phihl').inputValue());
  expect(phi).toBeGreaterThan(1355);
  expect(phi).toBeLessThan(1375);
  await expect(page.getByTestId('wa-raum-1-phihl-standard')).toContainText('geschätzt');
  // Heizfläche Typ 22 600 × 1000 (Befund B1)
  await page.getByTestId('wa-raum-1-hf-neu').click();
  await page.getByTestId('wa-raum-1-hf-1-hoehe').fill('600');
  await page.getByTestId('wa-raum-1-hf-1-laenge').fill('1000');
  const qn = await zahlAus(page, 'wa-raum-1-hf-1-qn');
  expect(qn).toBeGreaterThan(1650);
  expect(qn).toBeLessThan(1750);
  const tvlVerteilt = await zahlAus(page, 'wa-raum-1-tvlreq');
  // Eigene Raumheizlast überschreibt (markiert), Ergebnis folgt sofort
  await page.getByTestId('wa-raum-1-phihl').fill('1200');
  await expect(page.getByTestId('wa-raum-1-phihl')).toHaveAttribute('data-eigen', 'ja');
  const tvlEigen = await zahlAus(page, 'wa-raum-1-tvlreq');
  expect(tvlEigen).toBeLessThan(tvlVerteilt);
  await expect(page.getByTestId('wa-raum-1-live-phihl')).toHaveText('1\'200 W');
  // System-Wahl ist mit Heizflächen nicht mehr relevant (VL aus den Heizflächen)
  await expect(page.getByTestId('wa-system')).toHaveCount(0);
  await expect(page.getByTestId('wa-auslegungsvl')).toHaveText((await page.getByTestId('wa-raum-1-tvlreq').textContent())!);
  await foto(page, info, 'fws-heizflaeche');
  const dash = await dashboard(page, info);
  await expect(dash.getByTestId('kpi-vl')).toHaveText(`${Math.round(tvlEigen)} °C`);
  await zuklappen(page, info);
  await page.getByTestId('schritt-waermepumpe').click();
  await expect(page.getByTestId('wp-vorlauf-herkunft')).toHaveText('aus Heizflächen, max. Raum: Wohnen');
});

test('Warmwasser künftig ja/nein: bedingte Felder, Auftraggeber-Fall bis Zuschläge, Speicher und Dashboard', async ({ page }, info) => {
  // Moosseedorf: WW bisher über die Heizung (Abzug in Schritt 3)
  await vorbelegen(page, fixture('state-v3-fws-moosseedorf.json'));
  await page.getByTestId('schritt-warmwasser').click();
  await expect(page.getByTestId('wwk-vwu')).toHaveValue('180');
  await expect(page.getByTestId('wwk-personen')).toHaveCount(0);
  await page.getByTestId('wwk-methode-personen').click();
  await expect(page.getByTestId('wwk-personen')).toBeVisible();
  await expect(page.getByTestId('wwk-vwu')).toHaveCount(0);
  await page.getByTestId('wwk-personen').fill('4');
  await expect(page.getByTestId('wwk-bedarf')).toHaveAttribute('data-standard', 'ja');
  // Ladetemperatur als Standardwert, ΔT abgeleitet (T_Lade − 10)
  await expect(page.getByTestId('ww-tlade')).toHaveValue('60');
  await expect(page.getByTestId('ww-tlade')).toHaveAttribute('data-standard', 'ja');
  await expect(page.getByTestId('ww-deltat')).toHaveText('50 K');
  await page.getByTestId('ww-tlade').fill('55');
  await expect(page.getByTestId('ww-deltat')).toHaveText('45 K');
  await expect(page.getByTestId('ww-qw')).toBeVisible();

  // Auftraggeber-Fall: WW künftig separat → keine Personen-/Komfort-Felder, Q_w 0, kein WW-Speicher
  await page.getByTestId('ww-kuenftig-nein').click();
  await expect(page.getByTestId('ww-separat')).toContainText('Schritt 3');
  await expect(page.getByTestId('wwk-personen')).toHaveCount(0);
  await expect(page.getByTestId('wwk-bedarf')).toHaveCount(0);
  await expect(page.getByTestId('ww-tlade')).toHaveCount(0);
  await foto(page, info, 'ww-nein');
  await page.getByTestId('schritt-zuschlaege').click();
  await expect(page.getByTestId('zu-qw')).toHaveText('0 kW');
  await expect(page.getByTestId('zu-qhl')).toHaveText('9.3 kW');
  await page.getByTestId('schritt-speicher').click();
  await expect(page.getByTestId('speicher-ww-keiner')).toBeVisible();
  await expect(page.getByTestId('speicher-fsto')).toHaveCount(0);
  const dash = await dashboard(page, info);
  await expect(dash.getByTestId('kpi-qw')).toHaveText('0 kW');
  await expect(dash.getByTestId('kpi-speicher')).toContainText('— /');
  await zuklappen(page, info);
  // Abzug in Schritt 3 bleibt unberührt
  await page.getByTestId('schritt-verbrauch').click();
  await expect(page.getByTestId('abzug')).toBeVisible();

  // Zurück auf ja: Felder und WW-Speicher wieder da
  await page.getByTestId('schritt-warmwasser').click();
  await page.getByTestId('ww-kuenftig-ja').click();
  await expect(page.getByTestId('wwk-personen')).toHaveValue('4');
  await page.getByTestId('schritt-speicher').click();
  await expect(page.getByTestId('speicher-ww-effektiv')).toBeVisible();
});

test('Zuschläge, Puffer abgewählt/Override und Gerätewahl wirken bis ins Dashboard', async ({ page }, info) => {
  await vorbelegen(page, fixture('state-v3-fws-moosseedorf.json'));
  // Schritt 7: Sperrzeit 2 h/d (Fixture), verbundenes System dazu → Q_h steigt um genau diese Leistung
  await page.getByTestId('schritt-zuschlaege').click();
  await expect(page.getByTestId('sperrzeit-h')).toHaveValue('2');
  await expect(page.getByTestId('zu-qh')).toHaveText('10.73 kW');
  await page.getByTestId('zusatz-name').fill('Lufterhitzer Garage');
  await page.getByTestId('zusatz-leistung').fill('1.5');
  await page.getByTestId('zusatz-neu').click();
  await expect(page.getByTestId('zusatz-1')).toContainText('Lufterhitzer Garage');
  await expect(page.getByTestId('zu-qas')).toHaveText('1.5 kW');
  await expect(page.getByTestId('zu-qh')).toHaveText('12.23 kW');
  await page.getByTestId('zusatz-1-entfernen').click();
  await expect(page.getByTestId('zu-qh')).toHaveText('10.73 kW');

  // Schritt 9: Gerät wählen → Skala, Bivalenz, Modulation; Leistung am Auslegungspunkt überschreibt den DB-Wert
  await page.getByTestId('schritt-waermepumpe').click();
  await expect(page.getByTestId('wp-qh')).toHaveText('10.73 kW');
  await page.getByTestId('geraet-OE-0007-waehlen').click();
  await expect(page.getByTestId('wp-gewaehlt')).toBeVisible();
  await expect(page.getByTestId('wp-modulation')).toContainText('4.4 kW');
  await expect(page.getByTestId('wp-qwp-auslegung')).toHaveAttribute('data-standard', 'ja');
  await page.getByTestId('wp-qwp-auslegung').fill('9.5');
  await expect(page.getByTestId('wp-skala-wert')).toHaveText('−11 %');
  await expect(page.getByTestId('wp-skala')).toHaveAttribute('data-ampel', 'rot');
  await expect(page.getByTestId('wp-bivalenz')).toContainText('%');
  await expect(page.getByTestId('wp-jaz')).toContainText('WPesti');
  await foto(page, info, 'waermepumpe');
  let dash = await dashboard(page, info);
  await expect(dash.getByTestId('kpi-wp')).toContainText('9.5 kW');
  await expect(dash.getByTestId('skala-wp-wert')).toHaveText('−11 %');
  await zuklappen(page, info);

  // Schritt 8: Puffer bewusst abgewählt → 0 l überall; Override → überall
  await page.getByTestId('schritt-speicher').click();
  await page.getByTestId('puffer-aktiv-false').click();
  await expect(page.getByTestId('puffer-effektiv')).toHaveText('0 l');
  await expect(page.getByTestId('puffer-volumen')).toHaveCount(0);
  dash = await dashboard(page, info);
  await expect(dash.getByTestId('kpi-speicher')).toContainText('/ 0 l');
  await zuklappen(page, info);
  await page.getByTestId('puffer-aktiv-null').click();
  await page.getByTestId('puffer-volumen').fill('300');
  await expect(page.getByTestId('puffer-effektiv')).toHaveText('300 l');
  await page.getByTestId('speicher-ww-volumen').fill('400');
  await expect(page.getByTestId('speicher-ww-volumen')).toHaveAttribute('data-eigen', 'ja');
  await foto(page, info, 'speicher');
  dash = await dashboard(page, info);
  await expect(dash.getByTestId('kpi-speicher')).toHaveText('400 l / 300 l');
  await zuklappen(page, info);
});

test('Zusatzmodule als eigene Gruppe; Schritte 5–9 ohne horizontales Scrollen (gefüllte Seiten)', async ({ page }, info) => {
  const s = fixture('state-v3-raumweise-efh.json');
  s.waermeabgabe.raeume.bad = { heizflaechen: [{ id: 'hfb', bauart: 'guss_glieder', kreisId: 'k1', hoeheMm: 600, glieder: 10 }] };
  s.waermeabgabe.raeume.flur = { heizflaechen: [{ id: 'hff', bauart: 'fbh', flaecheM2: 4 }] };
  await vorbelegen(page, s);
  for (const schritt of ['warmwasser', 'waermeabgabe', 'zuschlaege', 'speicher', 'waermepumpe']) {
    await page.getByTestId(`schritt-${schritt}`).click();
    await keinHorizontalesScrollen(page, schritt);
  }
  // Genauer-Bereich und Massnahmen offen ebenfalls ohne Überbreite
  await page.getByTestId('schritt-waermeabgabe').click();
  await page.getByTestId('wa-raum-1-hf-1-genauer').locator('summary').click();
  await keinHorizontalesScrollen(page, 'waermeabgabe/genauer');

  // Zusatzmodule: eigene Gruppe in der Leiste, nicht in Weiter/Zurück
  await page.getByTestId('schritt-bericht').click();
  await expect(page.getByTestId('weiter')).toBeDisabled();
  await page.getByTestId('schritt-zusatz').click();
  await expect(page.getByTestId('zusatz-foerderung')).toBeVisible();
  await expect(page.getByTestId('schritt-zusatz')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.stepper__btn[aria-current="step"]')).toHaveCount(0);
  await page.getByTestId('zusatz-tab-offerte').click();
  await expect(page.getByTestId('zusatz-offerte')).toBeVisible();
  await keinHorizontalesScrollen(page, 'zusatz');
  await foto(page, info, 'zusatz');
  await page.getByTestId('zusatz-zurueck').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bericht');
});
