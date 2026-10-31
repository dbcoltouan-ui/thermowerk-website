import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Session 12 — Abnahme: externe Referenzrechnungen durch die Oberfläche bis in den Bericht (Desktop 1280 / Mobil 390).
 * Sollwerte aus Kurslösungen (FWS M3 Aufgaben 1A/2/3/4, docs/fws), dem Befund (HK-Beispiele B1/B3,
 * befund_heizkoerper.md §5) und den Formblättern des Referenzhauses 238/5 (referenz/referenzhaus-etagenwohnung.json).
 * Ausnahme: der letzte Test (FWS-Rechner-Vergleich Öl) ist eine Regression auf Neubau-Werte; der externe Wert des
 * FWS-Rechners (16.5 kW) und die Erklärung der Abweichung stehen in docs/revision/audit-s12/fws-vergleich.md.
 */
const SHOTS = 'docs/revision/shots-neu';
const lokal = (info: TestInfo) => String(info.project.use.baseURL ?? '').includes('127.0.0.1');
const fixturePfad = (name: string) => fileURLToPath(new URL(`../tests/fixtures/${name}`, import.meta.url));
const foto = async (page: Page, info: TestInfo, name: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: lokal(info) ? `${SHOTS}/s12-${name}-${info.project.name}.png` : info.outputPath(`s12-${name}.png`), fullPage: true });
};
/** Zahl aus einem Anzeige-Element («12.55 kW» → 12.55, «1'003 W» → 1003). */
const zahl = async (page: Page, testid: string) => Number((await page.getByTestId(testid).first().textContent())!.replace(/\u2212/g, '-').replace(/[^\d.-]/g, ''));
/** Erwartung innerhalb ±prozent um den externen Sollwert. */
const nahe = (ist: number, soll: number, prozent: number, was: string) => {
  const abw = (Math.abs(ist - soll) / Math.abs(soll)) * 100;
  expect(abw, `${was}: ist ${ist}, soll ${soll} (±${prozent} %), Abweichung ${abw.toFixed(2)} %`).toBeLessThanOrEqual(prozent);
};

async function dashboardWert(page: Page, info: TestInfo, testid: string): Promise<string> {
  if (info.project.name === 'desktop') return (await page.getByTestId('dashboard').getByTestId(testid).textContent())!.trim();
  const leiste = page.getByTestId('dashboard-leiste');
  if ((await leiste.getAttribute('data-offen')) === 'false') await leiste.getByRole('button').first().click();
  const t = (await leiste.getByTestId(testid).textContent())!.trim();
  await leiste.getByRole('button').first().click();
  return t;
}

async function zumBericht(page: Page) {
  if (await page.getByTestId('export').isVisible()) await page.getByTestId('export').click();
  else await page.getByTestId('schritt-bericht').click();
  await expect(page.getByTestId('bericht')).toBeVisible();
}

/** Neues FWS-Projekt mit Gebäude-Grunddaten (Mittelland: ohne Höhe → t_voll 2 000 h/a als Standardwert). */
async function fwsProjekt(page: Page, name: string, g: { typ?: 'efh' | 'mfh'; baujahr: string; plz?: string; kanton?: string; hoehe?: string; ebf: string }) {
  await page.goto('./');
  await page.getByTestId('projektname-eingabe').fill(name);
  await page.getByTestId('methode-fws').click();
  await page.getByTestId('weiter').click();
  await page.getByTestId(`gebaeude-typ-${g.typ ?? 'efh'}`).click();
  await page.getByTestId('gebaeude-baujahr').fill(g.baujahr);
  if (g.plz) await page.getByTestId('standort-plz').fill(g.plz);
  if (g.kanton) await page.getByTestId('standort-kanton').selectOption({ label: g.kanton });
  if (g.hoehe) await page.getByTestId('standort-hoehe').fill(g.hoehe);
  await page.getByTestId('ebf-modus-manuell').click();
  await page.getByTestId('ebf-manuell').fill(g.ebf);
}

/** Kalenderjahr-Eintrag einer Verbrauchsreihe (erste Reihe = Heizöl vorbelegt). */
async function kalenderjahr(page: Page, reihe: number, traeger: string | null, menge: string, jahr = '2024') {
  await page.getByTestId('reihe-neu').click();
  if (traeger) await page.getByTestId(`reihe-${reihe}-traeger`).selectOption({ label: traeger });
  await page.getByTestId(`reihe-${reihe}-art`).selectOption({ label: 'Zeiträume oder Kalenderjahre' });
  await page.getByTestId(`reihe-${reihe}-zeitraum-neu`).click();
  await page.getByTestId(`reihe-${reihe}-zeitraum-1-jahr`).fill(jahr);
  await page.getByTestId(`reihe-${reihe}-zeitraum-1-menge`).fill(menge);
}

/** Schritt 7 lesen: Q_hl, Q_off, Q_w, Q_h in W. */
async function zuschlaege(page: Page) {
  await page.getByTestId('schritt-zuschlaege').click();
  const w = async (id: string) => (await page.getByTestId(id).count()) ? (await zahl(page, id)) * 1000 : 0;
  return { qhl: await w('zu-qhl'), qoff: await w('zu-qoff'), qw: await w('zu-qw'), qh: await w('zu-qh') };
}

test('Kurs Aufgabe 1A (Öl 2 800 l, η 0.85, t_off 2 h): 12.5 / 1.14 / 13.64 kW bis in den Bericht', async ({ page }, info) => {
  await fwsProjekt(page, 'Kurs 1A Objekt A', { baujahr: '1980', ebf: '200' });
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
  await kalenderjahr(page, 1, null, '2800');
  await page.getByTestId('eta-heizoel-preset').selectOption({ label: 'Heizkessel älteres Modell, ohne WW-Bereitung' });
  await expect(page.getByTestId('eta-heizoel')).toHaveValue('0.85');
  await expect(page.getByTestId('tvoll')).toHaveValue('2000');
  await page.getByTestId('ww-bisher-nein').click();
  await page.getByTestId('schritt-warmwasser').click();
  await page.getByTestId('ww-kuenftig-nein').click();
  await page.getByTestId('schritt-zuschlaege').click();
  await page.getByTestId('sperrzeit-ja').click();
  await page.getByTestId('sperrzeit-h').fill('2');
  const z = await zuschlaege(page);
  nahe(z.qhl, 12_500, 1, 'Q_hl');
  nahe(z.qoff, 1_140, 1, 'Q_off');
  expect(z.qw).toBe(0);
  nahe(z.qh, 13_640, 1, 'Q_h');
  await foto(page, info, 'kurs-1a-zuschlaege');
  await zumBericht(page);
  const b = page.getByTestId('bericht');
  nahe((await zahl(page, 'bericht-qhl')) * 1000, 12_500, 1, 'Bericht Q_hl');
  nahe((await zahl(page, 'bericht-qh')) * 1000, 13_640, 1, 'Bericht Q_h');
  await expect(b.getByTestId('kapitel-rechenweg')).toContainText("Kalenderjahr 2024: 2'800 l");
  await expect(b.getByTestId('bericht-methode')).toContainText('FWS-Kurs');
  await expect(b.getByTestId('kapitel-warmwasser')).toHaveCount(0);
  expect(await dashboardWert(page, info, 'kpi-qh')).toBe((await b.getByTestId('bericht-qh').textContent())!.trim());
});

test('Kurs Aufgabe 2 (EFH 1975 Bern, Öl 3 500 l inkl. WW 160 l/d, η 0.8, t_off 3 h): 12.55 / 1.79 / 0.51 / 14.85 kW; geplante Massnahmen → 8.83 / 10.58 kW', async ({ page }, info) => {
  await fwsProjekt(page, 'Kurs Aufgabe 2', { baujahr: '1975', plz: '3011', kanton: 'BE', ebf: '270' });
  await expect(page.getByTestId('klima-bezeichnung')).toContainText('Bern');
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
  await kalenderjahr(page, 1, null, '3500');
  await page.getByTestId('eta-heizoel-preset').selectOption({ label: 'Heizkessel älteres Modell, mit WW-Bereitung' });
  await expect(page.getByTestId('eta-heizoel')).toHaveValue('0.8');
  // WW bisher über die Heizung: 160 l/d, Speicherverlust 10 %, Ausstoss 15 % (Standardwerte), Elektro-Warmhalteband
  await page.getByTestId('ww-bisher-ja').click();
  await page.getByTestId('abzug-methode-direkt').click();
  await page.getByTestId('abzug-vwu').fill('160');
  await page.getByTestId('abzug').locator('summary').click();
  await expect(page.getByTestId('abzug-speicherverlust')).toHaveValue('10');
  await expect(page.getByTestId('abzug-ausstoss')).toHaveValue('15');
  await page.getByTestId('abzug-zirkulation').selectOption({ label: 'Warmhalteband' });
  nahe(await zahl(page, 'ww-abzug'), 4_309, 1.5, 'WW-Abzug (Kurs 4 309 multiplikativ; Neubau additiv 4 258 = −1.2 %, PROTOKOLL S3)');
  // WW künftig über die WP, gleiche Angaben
  await page.getByTestId('schritt-warmwasser').click();
  await page.getByTestId('ww-kuenftig-ja').click();
  await page.getByTestId('wwk-methode-direkt').click();
  await page.getByTestId('wwk-vwu').fill('160');
  await page.getByTestId('wwk').locator('summary').click();
  await page.getByTestId('wwk-zirkulation').selectOption({ label: 'Warmhalteband' });
  await page.getByTestId('schritt-zuschlaege').click();
  await page.getByTestId('sperrzeit-ja').click();
  await page.getByTestId('sperrzeit-h').fill('3');
  const z = await zuschlaege(page);
  nahe(z.qhl, 12_550, 1, 'Q_hl');
  nahe(z.qoff, 1_790, 1, 'Q_off');
  nahe(z.qw, 510, 2, 'Q_w');
  nahe(z.qh, 14_850, 1, 'Q_h');

  // Geplante Massnahmen Fenster 15 % / Kellerdecke 8 % / Estrich 10 % → Q_hl,korr 12.55 · 0.85 · 0.92 · 0.9 = 8.83 kW
  await page.getByTestId('schritt-sanierungen').click();
  for (const [nr, label] of [[1, 'Fenster ersetzt'], [2, 'Kellerdecke gedämmt'], [3, 'Estrichboden / Dach gedämmt']] as const) {
    await page.getByTestId('sanierung-neu').click();
    await page.getByTestId(`sanierung-${nr}-massnahme`).selectOption({ label });
    await page.getByTestId(`sanierung-${nr}-status-geplant`).click();
  }
  await expect(page.getByTestId('sanierung-faktor-geplant')).toContainText('0.70');
  await foto(page, info, 'kurs-2-sanierungen');
  const s = await zuschlaege(page);
  nahe(s.qhl, 8_830, 1, 'Q_hl korr');
  nahe(s.qoff, 1_260, 1, 'Q_off');
  nahe(s.qw, 520, 2, 'Q_w');
  nahe(s.qh, 10_580, 1, 'Q_h');
  await zumBericht(page);
  const b = page.getByTestId('bericht');
  nahe((await zahl(page, 'bericht-qhl')) * 1000, 8_830, 1, 'Bericht Q_hl');
  nahe((await zahl(page, 'bericht-qh')) * 1000, 10_580, 1, 'Bericht Q_h');
  await expect(b.getByTestId('bericht-sanierungen')).toContainText('Fenster');
  await expect(b.getByTestId('bericht-ww-abzug')).toBeVisible();
  await expect(b.getByTestId('kapitel-warmwasser')).toBeVisible();
  await foto(page, info, 'kurs-2-bericht');
});

test('Kurs Aufgabe 3 (MFH Minergie-P, Wärmezähler 23 000 kWh/a, EBF 1 832 m², 27.4 Personen gehoben): 11.5 / 5.64 / 17.14 kW; 6.3 W/m² unplausibel', async ({ page }) => {
  await fwsProjekt(page, 'Kurs Aufgabe 3', { typ: 'mfh', baujahr: '2012', hoehe: '408', ebf: '1832' });
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-messung').click();
  await page.getByTestId('messung-qn').fill('23000');
  await expect(page.getByTestId('tvoll')).toHaveValue('2000');
  // Pointe der Aufgabe: 11.5 kW / 1 832 m² = 6.3 W/m² liegt unter dem Minergie-P-Band — die Plausibilität meldet es
  await page.getByTestId('schritt-heizlast').click();
  await expect(page.getByTestId('heizlast-spez')).toContainText('6.3');
  await expect(page.getByTestId('plausi')).not.toHaveAttribute('data-ampel', 'gruen');
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('schritt-warmwasser').click();
  await page.getByTestId('ww-kuenftig-ja').click();
  await page.getByTestId('wwk-methode-personen').click();
  await page.getByTestId('wwk-personen').fill('27.4');
  await page.getByTestId('wwk-bedarf').selectOption({ label: 'Mehrfamilienhaus, gehobener Wohnungsbau (45 l/P·d)' });
  await page.getByTestId('wwk').locator('summary').click();
  await page.getByTestId('wwk-zirkulation').selectOption({ label: 'Warmhalteband' });
  nahe(await zahl(page, 'wwk-qnww'), 33_210, 1.5, 'Q_n,WW (Kurs multiplikativ)');
  const z = await zuschlaege(page);
  expect(z.qhl).toBeCloseTo(11_500, 0);
  nahe(z.qw, 5_640, 2, 'Q_w');
  nahe(z.qh, 17_140, 1, 'Q_h');
  await zumBericht(page);
  nahe((await zahl(page, 'bericht-qh')) * 1000, 17_140, 1, 'Bericht Q_h');
  await expect(page.getByTestId('bericht').getByTestId('kapitel-rechenweg')).toContainText('23');
});

test('Kurs Aufgabe 4 (WP-Betriebsstunden 14 000 h / 10 a, 12 kW, 4 Personen einfach): Q_hl 8.4, Q_w 0.6, Q_h 9.0 kW — nicht die WP-Nennleistung', async ({ page }) => {
  await fwsProjekt(page, 'Kurs Aufgabe 4', { baujahr: '2005', ebf: '180' });
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-wpBetriebsstunden').click();
  await page.getByTestId('wp-zaehler').fill('14000');
  await page.getByTestId('wp-jahre').fill('10');
  await page.getByTestId('wp-leistung').fill('12');
  await page.getByTestId('wp-cop').fill('4.2');
  await page.getByTestId('schritt-heizlast').click();
  nahe((await zahl(page, 'heizlast-qhl')) * 1000, 8_400, 1, 'Q_hl');
  await page.getByTestId('schritt-warmwasser').click();
  await page.getByTestId('ww-kuenftig-ja').click();
  await page.getByTestId('wwk-methode-personen').click();
  await page.getByTestId('wwk-personen').fill('4');
  await page.getByTestId('wwk-bedarf').selectOption({ label: 'Einfamilienhaus, Eigentumswohnung, einfacher Standard (40 l/P·d)' });
  await page.getByTestId('wwk').locator('summary').click();
  await page.getByTestId('wwk-zirkulation').selectOption({ label: 'unbekannt' });
  const z = await zuschlaege(page);
  nahe(z.qhl, 8_400, 1, 'Q_hl');
  nahe(z.qw, 600, 4, 'Q_w (Kurs verkettet multiplikativ)');
  nahe(z.qh, 9_000, 1, 'Q_h');
  await zumBericht(page);
  nahe((await zahl(page, 'bericht-qhl')) * 1000, 8_400, 1, 'Bericht Q_hl');
  await expect(page.getByTestId('bericht').getByTestId('kapitel-rechenweg')).toContainText('1\'400');
});

test('HK-Beispiele B1/B3 (Befund §5): Typ 22 600×1000 @55/45 = 842–873 W; Raum 1 200 W mit T21 600×800 → θ_VL,req ≈ 81 °C, T22 ≈ 72, T33 ≈ 61', async ({ page }, info) => {
  await fwsProjekt(page, 'HK-Beispiele B1/B3', { baujahr: '1988', plz: '3302', kanton: 'BE', hoehe: '550', ebf: '150' });
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
  await kalenderjahr(page, 1, 'Erdgas', '2500');
  await page.getByTestId('eta-erdgas').fill('0.9');
  await page.getByTestId('ww-bisher-nein').click();
  await page.getByTestId('schritt-waermeabgabe').click();
  await page.getByTestId('wa-raum-neu').click();
  await page.getByTestId('wa-raum-1-name').fill('Wohnen');
  await page.getByTestId('wa-raum-1-flaeche').fill('20');
  await page.getByTestId('wa-raum-1-phihl').fill('1200');
  // B1: Typ 22 600 × 1000 — Q bei Ziel-VL 55/45/20 im Band 842–873 W (Purmo/Kermi/KB-E)
  await page.getByTestId('wa-raum-1-hf-bauart').selectOption('platte_22');
  await page.getByTestId('wa-raum-1-hf-neu').click();
  await page.getByTestId('wa-raum-1-hf-1-hoehe').fill('600');
  await page.getByTestId('wa-raum-1-hf-1-laenge').fill('1000');
  await expect(page.getByTestId('wa-zielvl')).toHaveValue('55');
  const q55 = await zahl(page, 'wa-raum-1-hf-1-qziel');
  expect(q55, 'B1 Q(55/45)').toBeGreaterThanOrEqual(842);
  expect(q55, 'B1 Q(55/45)').toBeLessThanOrEqual(873);
  // B3: Raum 1 200 W, T21 600 × 800 → θ_VL,req ≈ 81 °C (Befund mit Q_N 1 032 W; neue Tabelle 1 064 W → 79.7, PROTOKOLL S5)
  await page.getByTestId('wa-raum-1-hf-1-bauart').selectOption('platte_21');
  await page.getByTestId('wa-raum-1-hf-1-laenge').fill('800');
  const t21 = await zahl(page, 'wa-raum-1-tvlreq');
  expect(Math.abs(t21 - 81), `T21 θ_VL,req ${t21}`).toBeLessThanOrEqual(2);
  await expect(page.getByTestId('wa-raum-1-ampel')).toHaveAttribute('data-ampel', 'rot');
  await expect(page.getByTestId('wa-skala')).toHaveAttribute('data-ampel', 'rot');
  await page.getByTestId('wa-raum-1-hf-1-bauart').selectOption('platte_22');
  await expect(page.getByTestId('wa-raum-1-hf-1-laenge')).toHaveValue('800');
  const t22 = await zahl(page, 'wa-raum-1-tvlreq');
  expect(Math.abs(t22 - 72), `T22 θ_VL,req ${t22}`).toBeLessThanOrEqual(2);
  await page.getByTestId('wa-raum-1-hf-1-bauart').selectOption('platte_33');
  const t33 = await zahl(page, 'wa-raum-1-tvlreq');
  expect(Math.abs(t33 - 61), `T33 θ_VL,req ${t33}`).toBeLessThanOrEqual(2);
  expect(t21).toBeGreaterThan(t22);
  expect(t22).toBeGreaterThan(t33);
  await foto(page, info, 'hk-b3');
  // Bericht: Wärmeabgabe-Kapitel nennt denselben Raum-Vorlauf und die Auslegungs-VL
  await zumBericht(page);
  const b = page.getByTestId('bericht');
  await expect(b.getByTestId('kapitel-waermeabgabe')).toBeVisible();
  const vlBericht = Number((await b.locator('[data-testid^="bericht-wa-raum-"][data-testid$="-vl"]').first().textContent())!.replace(/[^\d.]/g, ''));
  expect(Math.abs(vlBericht - t33)).toBeLessThanOrEqual(0.6);
  expect(Math.abs((await zahl(page, 'bericht-wa-vl')) - t33)).toBeLessThanOrEqual(0.6);
});

test('Referenzhaus 238/5 (DIN EN 12831 Formblätter) aus Datei: Räume ±2 %, Σ Räume ±1 %, saldiert ≤ Σ — bis in den Bericht', async ({ page }, info) => {
  await page.goto('./');
  page.on('dialog', (d) => d.accept());
  await page.getByTestId('projekte').click();
  await page.getByTestId('projekt-datei').setInputFiles(fixturePfad('state-v4-raumweise-238-5.json'));
  await expect(page.getByTestId('projektname')).toContainText('238/5');
  await expect(page.getByTestId('lademeldungen')).toContainText('Aus Datei geladen');
  const ref = JSON.parse(readFileSync(fileURLToPath(new URL('../referenz/referenzhaus-etagenwohnung.json', import.meta.url)), 'utf8')) as {
    raeume: { id: number; name: string; soll: { phiHL_W: number } }[];
    soll_gebaeude: { summe_raeume_W: number };
  };
  // Schritt 4: Raumtabelle
  await page.getByTestId('schritt-heizlast').click();
  await expect(page.getByTestId('heizlast-methode')).toContainText('SIA 384/2');
  for (const r of ref.raeume) {
    const ist = await zahl(page, `heizlast-raum-r${r.id}-phihl`);
    // Flur: dokumentierte Abweichung −106 W statt −95 W (Formblatt rundet f_RT auf −0.18; PROTOKOLL S4) → ±12 W
    if (r.id === 3) expect(Math.abs(ist - r.soll.phiHL_W), `Flur ${ist} / ${r.soll.phiHL_W}`).toBeLessThanOrEqual(12);
    else nahe(ist, r.soll.phiHL_W, 2, `${r.name} Φ_HL`);
  }
  const summe = await zahl(page, 'summe-raeume');
  nahe(summe, ref.soll_gebaeude.summe_raeume_W, 1, 'Σ Räume');
  const saldiert = await zahl(page, 'saldiert');
  expect(saldiert).toBeLessThanOrEqual(summe);
  // Formblatt G 3 560 W (DIN-Erdreichfaktoren auf Gebäudeebene, nicht reproduzierbar) ist nur eine Schranke, kein Sollwert
  expect(saldiert).toBeGreaterThan(3560);
  await foto(page, info, '238-5-heizlast');
  // Bericht: dieselben Raumwerte, Gebäude saldiert = Dashboard
  await zumBericht(page);
  const b = page.getByTestId('bericht');
  for (const r of ref.raeume.filter((x) => x.id !== 3)) nahe(await zahl(page, `bericht-raum-r${r.id}-phihl`), r.soll.phiHL_W, 2, `Bericht ${r.name}`);
  await expect(b.getByTestId('bericht-gebaeude-heizlast')).toContainText(`${Math.round(saldiert).toLocaleString('de-CH').replace(/’|’/g, "'")} W`);
  await expect(b.getByTestId('bericht-methode')).toContainText('SIA 384/2:2020');
  expect(await dashboardWert(page, info, 'kpi-qhl')).toBe((await b.getByTestId('bericht-qhl').textContent())!.trim());
});

test('Gas mit Zählerständen (Session 7b): Differenzen je Kalenderjahr und Mittel bis in den Bericht', async ({ page }) => {
  await fwsProjekt(page, 'Gas-Zähler Bern', { baujahr: '1975', plz: '3011', kanton: 'BE', ebf: '180' });
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('quelle-rechnungen').click();
  await page.getByTestId('reihe-neu').click();
  await page.getByTestId('reihe-1-traeger').selectOption({ label: 'Erdgas' });
  const staende: [string, string][] = [['2022-01-01', '10000'], ['2023-01-01', '12500'], ['2024-01-01', '14900'], ['2025-01-01', '17500']];
  for (const [i, [datum, stand]] of staende.entries()) {
    await page.getByTestId('reihe-1-zaehler-neu').click();
    await page.getByTestId(`reihe-1-zaehler-${i + 1}-datum`).fill(datum);
    await page.getByTestId(`reihe-1-zaehler-${i + 1}-stand`).fill(stand);
  }
  await page.getByTestId('eta-erdgas-preset').selectOption({ label: 'Heizkessel neueres Modell, kondensierend' });
  await page.getByTestId('ww-bisher-nein').click();
  // Jahreswert = Σ Menge · 365 / Σ Tage (KONTEXT §2 «FWS»): 2024 ist ein Schaltjahr (366 d) → 2 600 · 365/366 = 2 593;
  // Mittel (2 500 + 2 400 + 2 593) / 3 = 2 498 m³/a. Q_hl = 2 498 · 10.4 · 0.92 / 2 000 = 11.95 kW (Kurs-Konvention)
  await expect(page.getByTestId('traeger-erdgas-menge')).toHaveText("2'498 m³/a");
  await page.getByTestId('schritt-heizlast').click();
  nahe((await zahl(page, 'heizlast-qhl')) * 1000, 11_950, 1, 'Q_hl');
  await zumBericht(page);
  const b = page.getByTestId('bericht');
  const z = b.getByTestId('bericht-zeitraeume-erdgas');
  await expect(z).toContainText("2'500 m³");
  await expect(z).toContainText("2'400 m³");
  await expect(z).toContainText("2'600 m³");
  await expect(b.getByTestId('kapitel-rechenweg')).toContainText('Zählerstände');
  nahe((await zahl(page, 'bericht-qhl')) * 1000, 11_950, 1, 'Bericht Q_hl');
});

test('FWS-Rechner-Vergleich Öl (Regression auf Neubau-Werte; FWS-Rechner 16.5 kW, +4.5 % erklärt in fws-vergleich.md): 3 865 l/a, Q_hl 17.25 kW (Kurs) / 21.60 kW (Klimabereinigung SIA 2028)', async ({ page }) => {
  // FWS-Rechner mit denselben Eingaben (SEPARATE/NO): t_voll 2 150, Hi 9.91, η 0.85, HGT 2 901 → Mittel 3 222 Kd, 4 220 l/a, Φ_H 16.5 kW.
  // Neubau: 3 800 l × HGT_ref 2 805 / HGT 2 758 = 3 865 l/a; × 10.5 × 0.85 / 2 000 = 17.25 kW; SIA-Normjahr 3 513 Kd → 21.6 kW.
  await fwsProjekt(page, 'FWS-Vergleich Öl', { baujahr: '1975', plz: '3011', kanton: 'BE', ebf: '180' });
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
  await page.getByTestId('reihe-1-lieferung-1-menge').fill('2500');
  await page.getByTestId('reihe-1-lieferung-neu').click();
  await page.getByTestId('reihe-1-lieferung-2-datum').fill('2024-01-10');
  await page.getByTestId('reihe-1-lieferung-2-menge').fill('1800');
  await page.getByTestId('eta-heizoel-preset').selectOption({ label: 'Heizkessel älteres Modell, ohne WW-Bereitung' });
  await page.getByTestId('ww-bisher-nein').click();
  await expect(page.getByTestId('reihe-1-ergebnis-1-menge')).toHaveText("3'800 l");
  await expect(page.getByTestId('reihe-1-ergebnis-1-jahr')).toContainText("3'865");
  await expect(page.getByTestId('traeger-heizoel-menge')).toHaveText("3'865 l/a");
  await page.getByTestId('schritt-warmwasser').click();
  await page.getByTestId('ww-kuenftig-nein').click();
  await page.getByTestId('schritt-heizlast').click();
  await expect(page.getByTestId('heizlast-qhl')).toHaveText('17.25 kW');
  await page.getByTestId('schritt-verbrauch').click();
  await page.getByTestId('klimabereinigung').check();
  await page.getByTestId('schritt-heizlast').click();
  await expect(page.getByTestId('heizlast-qhl')).toHaveText('21.6 kW');
  await expect(page.getByTestId('rechenweg-fws')).toContainText('nicht FWS-Kurs');
});
