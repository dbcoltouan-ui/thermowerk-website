/**
 * Audit S12 — Fachlogik, raumweise SIA 384/2 und Hülle (FACH-20, 21, 22, 23, 30).
 *
 * Sollwerte extern:
 *  - U-Werte Bestand: Befund FACH-20 (KB-B Tab. 3.4: AW 1961–77 1.20–1.69, Mitte 1.45); CH-Primärquellen laut
 *    docs/recherche/2026-10-29_huelle-u-werte-bauperioden.md: Bauteilekatalog 2002 Zweischalenmauerwerk mit Hohlraum 1.2,
 *    GEAK-Tool vor 1975 1.4, UFELD-Messung 1.0, eREN Wand 1970 0.8–1.4; Dach 1961–77: Bauteilekatalog 6 cm 0.6, GEAK 0.6–0.8.
 *  - ISO-6946-Handrechnung (im Test): Backstein 30 cm verputzt = 1/(0.13 + 0.015/0.7 + 0.3/0.52 + 0.02/0.87 + 0.04) = 1.264.
 *  - SIA 2028-C1 Tabelle 6 (docs/recherche/2026-10-29_klima-sia2028-sia384-2.md): Bern −7, Adelboden −10, Davos −13, Chur −7.
 *  - Handrechnung CH-EFH (tests/kern/raumweise.test.ts Kommentar, von Hand): Σ Räume 2 733.7 W, saldiert 2 678.7 W.
 *  - Tabellen: ND.3 b_u Keller 0.5, NA.7 n_min Wohnen altbau 0.5 / Bad 0.7, ΔU_WB 0.10 (DIN-Pauschale als Annahme).
 */
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { huelleDaten } from '../../../src/daten/huelle';
import { berechne } from '../../../src/kern/berechne';
import type { Stufen } from '../../../src/kern/huelle';
import { aufloesenBauteiltyp, HUELL_ARTEN } from '../../../src/kern/huelle';
import type { State } from '../../../src/state/schema';
import { setzeImState } from '../../../src/state/store';
import { erwarteNahe } from '../../kern/hilfen';
import { fixture } from '../../state/hilfen';

const daten = alleDaten();
const hd = huelleDaten();
const basis = (): State => fixture('state-v4-raumweise-efh.json');
const setzeAlle = (s: State, paare: Record<string, unknown>): State => Object.entries(paare).reduce((acc, [p, w]) => setzeImState(acc, p, w), s);
const u = (art: (typeof HUELL_ARTEN)[number] | 'fenster' | 'tuer', baujahr: number, stufen: Stufen = {}) => aufloesenBauteiltyp({ id: 'x', art, stufen }, { baujahr, bezugsjahr: 2026 }, hd);

describe('FACH-20 — Bestands-U-Werte 1946–1994 nicht mehr optimistisch, Quellen primär (CH)', () => {
  it('Aussenwand 1961–1977 Default 1.09 (alt: 0.60): ≥ 1.0 (UFELD-Messung) und innerhalb Bauteilekatalog/GEAK 1.0–1.4; Band 0.6–1.6 überdeckt KB-B 1.2–1.6', () => {
    const r = u('aussenwand', 1965);
    expect(r.u.wert).toBeGreaterThanOrEqual(1.0);
    expect(r.u.wert).toBeLessThanOrEqual(1.4);
    // Band = U·(1 ± 46 %) = 0.59–1.60 (entspricht der Epochen-Spanne 0.6–1.6)
    expect(r.u.band![0]).toBeLessThanOrEqual(1.2);
    expect(r.u.band![1]).toBeGreaterThanOrEqual(1.59);
    expect(r.u.herkunft).toBe('fallback');
    expect(r.u.unsicherheit).toBeGreaterThanOrEqual(40); // halbe Spanne/U → ehrlich breit
    // Befund-Band KB-B 1.20–1.69 (DIN): Default liegt 9 % unter der Untergrenze — bewusst CH-Quellen (siehe Bericht)
    expect(r.u.wert).toBeLessThan(1.2);
  });
  it('Aussenwand 1978–1994 Default 0.62 (alt: 0.50) innerhalb GEAK-Tool 0.6–0.8 / UFELD 0.6; Kellerdecke 1961–77 2.10 (alt 0.80) über KB-B 1.2–1.69', () => {
    const aw = u('aussenwand', 1985).u.wert;
    expect(aw).toBeGreaterThanOrEqual(0.6);
    expect(aw).toBeLessThanOrEqual(0.8);
    const kd = u('bodenKeller', 1965).u.wert;
    expect(kd).toBeGreaterThanOrEqual(1.2);
  });
  it('Steildach 1961–1977 Default 0.50: unter Bauteilekatalog (6 cm: 0.6) und GEAK «1970» 0.6–0.8 (neuer Befund, NIEDRIG)', () => {
    const r = u('dachSteil', 1965);
    expect(r.u.wert).toBeCloseTo(0.5, 1);
    expect(r.u.wert).toBeLessThan(0.6);
    expect(r.u.band![1]).toBeGreaterThanOrEqual(0.8);
  });
  it('Quellen: huelle-epochen.json nennt keine KI-Recherche als Quelle; jede Epoche hat Quellen-IDs aus _meta', () => {
    const ids = new Set(hd._meta.quellen.map((q) => q.id));
    expect([...ids].some((id) => /perplexity|ki-|gpt/i.test(id))).toBe(false);
    for (const art of HUELL_ARTEN) for (const ep of Object.values(hd.bauteile[art]!.epochen)) for (const q of ep.quelle) expect(ids.has(q), `${art}: ${q}`).toBe(true);
  });
  it('Monotonie über die Epochen: Default-U fällt mit jüngerer Epoche — zwei Ausnahmen am Epochenwechsel 1945/46 (Bauweisenwechsel Holzbalken/Hourdis → Beton): Estrichdecke 0.89 → 2.98, Kellerdecke 1.58 → 2.10 (neuer Befund NIEDRIG)', () => {
    const jahre = [1900, 1930, 1950, 1965, 1985, 2000, 2015];
    const spruenge: string[] = [];
    for (const art of HUELL_ARTEN) {
      let vorher = Infinity;
      for (const j of jahre) {
        const w = u(art, j).u.wert;
        if (w > vorher + 1e-9) spruenge.push(`${art} ${j}: ${vorher.toFixed(2)} → ${w.toFixed(2)}`);
        vorher = w;
      }
    }
    expect(spruenge).toEqual(['deckeEstrich 1950: 0.89 → 2.98', 'bodenKeller 1950: 1.58 → 2.10']);
  });
});

describe('FACH-21 — Eine Schichtkette: Bestätigen der Defaults ändert nichts, Dicke und Dämmung wirken monoton', () => {
  it('Aussenwand 1965 (Hohlmauer): Bauweise bestätigen → 0 %; Gesamtdicke 31 cm bestätigen → 0 %; «ungedämmt» bestätigen → 0 %', () => {
    const d0 = u('aussenwand', 1965).u.wert;
    expect(u('aussenwand', 1965, { bauweise: 'zweischalen_luft' }).u.wert).toBeCloseTo(d0, 9);
    expect(u('aussenwand', 1965, { bauweise: 'zweischalen_luft', dickeM: 0.31 }).u.wert).toBeCloseTo(d0, 9);
    expect(u('aussenwand', 1965, { bauweise: 'zweischalen_luft', dickeM: 0.31, daemmung: false }).u.wert).toBeCloseTo(d0, 9);
    const r = u('aussenwand', 1965, { bauweise: 'zweischalen_luft', dickeM: 0.31, daemmung: false });
    expect(r.u.unsicherheit).toBeLessThan(u('aussenwand', 1965).u.unsicherheit!);
    expect(r.u.herkunft).toBe('schaetzung');
  });
  it('Wanddicke wirkt: Backstein 1930 25/30/38/51 cm → U streng fallend; 30 cm = ISO-6946-Handrechnung 1.264', () => {
    const werte = [0.25, 0.3, 0.38, 0.51].map((dk) => u('aussenwand', 1930, { bauweise: 'backstein_30', dickeM: dk, daemmung: false }).u.wert);
    for (let i = 1; i < werte.length; i++) expect(werte[i]!).toBeLessThan(werte[i - 1]!);
    expect(werte[1]).toBeCloseTo(1 / (0.13 + 0.015 / 0.7 + 0.3 / 0.52 + 0.02 / 0.87 + 0.04), 3);
    // Zweischalig 1965: Gesamtdicke 31 → 40 cm senkt U
    expect(u('aussenwand', 1965, { dickeM: 0.4 }).u.wert).toBeLessThan(u('aussenwand', 1965, { dickeM: 0.31 }).u.wert);
  });
  it('Dämmung wirkt monoton für alle Hüllbauteile × Epochen: ja < nein; 4 < 8 < 12 < 20 cm; PUR < Mineralwolle', () => {
    for (const art of HUELL_ARTEN) {
      for (const j of [1900, 1950, 1965, 1985, 2015]) {
        expect(u(art, j, { daemmung: true }).u.wert, `${art}/${j} ja<nein`).toBeLessThan(u(art, j, { daemmung: false }).u.wert);
        let vorher = Infinity;
        for (const dd of [0.04, 0.08, 0.12, 0.2]) {
          const w = u(art, j, { daemmung: true, daemmdickeM: dd }).u.wert;
          expect(w, `${art}/${j}/${dd}`).toBeLessThan(vorher);
          vorher = w;
        }
        expect(u(art, j, { daemmung: true, daemmstoff: 'pur_pir', daemmdickeM: 0.1 }).u.wert).toBeLessThan(u(art, j, { daemmung: true, daemmstoff: 'mineralwolle', daemmdickeM: 0.1 }).u.wert);
      }
    }
  });
  it('Befund-A8-Fälle: mehr Wissen erzeugt keinen Sprung ausserhalb der Epochen-Spanne (1930 Vollziegel, 1965 Dicke 30, 1985 Dicke 24, Boden 1965 Beton)', () => {
    const faelle: [Parameters<typeof u>[0], number, Stufen][] = [
      ['aussenwand', 1930, { bauweise: 'vollbackstein' }],
      ['aussenwand', 1965, { dickeM: 0.3 }],
      ['aussenwand', 1965, { bauweise: 'zweischalen_luft', dickeM: 0.3 }],
      ['aussenwand', 1985, { dickeM: 0.24 }],
      ['bodenKeller', 1965, { bauweise: 'beton_ungedaemmt' }],
    ];
    for (const [art, j, st] of faelle) {
      const r = u(art, j, st);
      const sp = hd.bauteile[art as (typeof HUELL_ARTEN)[number]]!.epochen[r.epoche]!.uSpanne;
      expect(r.u.wert, `${art}/${j}/${JSON.stringify(st)}`).toBeGreaterThanOrEqual(sp.min - 1e-9);
      expect(r.u.wert, `${art}/${j}/${JSON.stringify(st)}`).toBeLessThanOrEqual(sp.max + 1e-9);
    }
    // Clamp ist sichtbar: Beton 20 cm ungedämmt 1965 rechnet > Spanne → auf 1.6 begrenzt mit Hinweis
    const beton = u('aussenwand', 1965, { bauweise: 'beton' });
    expect(beton.geclampt).toBe(true);
    expect(beton.hinweise.some((h) => h.code === 'huelle.clamp')).toBe(true);
  });
  it('kein zweiter Pfad: Tabellen-U nur als Kontrollwert (uDefaultBerechnet) — Default = Schichtrechnung (±0.05) für alle Bauteile × Epochen', () => {
    const JAHR: Record<string, number> = { vor1919: 1900, '1919_1945': 1930, '1946_1960': 1950, '1961_1977': 1965, '1978_1994': 1985, '1995_2010': 2000, ab2011: 2015 };
    for (const art of HUELL_ARTEN) {
      for (const [ep, j] of Object.entries(JAHR)) {
        const r = u(art, j);
        expect(r.schichten.length).toBeGreaterThan(1);
        const uSchicht = 1 / r.schichten.reduce((a, s) => a + s.rWert, 0.13 + 0.04); // grob: horizontal/aussen; nur Grössenordnung
        expect(Math.abs(r.u.wert - hd.bauteile[art]!.epochen[ep]!.uDefaultBerechnet)).toBeLessThan(0.05);
        expect(uSchicht).toBeGreaterThan(0);
      }
    }
  });
});

describe('FACH-22 — Rest nicht raumweise erfasst: Hüllflächen-Eingabe oder Φ′·A, kein «1 m² Wand pro m² EBF»', () => {
  it('Rest «huellflaechen» mit AW 60 m², Fenster 15 m², Boden 50 m² Keller, 100 m³: Φ_T aus den EINGEGEBENEN Flächen × Standard-U × f, nicht aus der EBF', () => {
    const s = setzeAlle(basis(), {
      'gebaeude.ebfModus': 'manuell',
      'gebaeude.ebfManuellM2': 150,
      'huelle.rest': { modus: 'huellflaechen', aAussenwandM2: 60, aFensterM2: 15, aBodenM2: 50, bodenAnschluss: 'keller', volumenM3: 100 },
    });
    const e = berechne(s, daten);
    const rest = e.heizlast.raumweise!.rest!;
    expect(rest.modus).toBe('huellflaechen');
    expect(rest.bauteile.map((b) => [b.art, b.flaeche.wert])).toEqual([['aussenwand', 60], ['fenster', 15], ['bodenKeller', 50]]);
    const aw = rest.bauteile[0]!;
    // Standard-Typ 1965 Hohlmauer 1.09 + ΔU_WB 0.10, Δθ 27 K
    erwarteNahe(aw.phiT.wert, (1.09 + 0.1) * 60 * 27, 1, 'Φ_T Rest-AW');
    expect(rest.bauteile[2]!.faktor.wert).toBe(0.5); // b_u Keller
    // Restfläche = EBF − Σ Räume × 1.1 = 150 − 35·1.1 = 111.5 m² (Standardwert)
    expect(rest.flaeche.wert).toBeCloseTo(150 - 35 * 1.1, 6);
    expect(e.heizlast.raumweise!.gebaeude.wert).toBeCloseTo(e.heizlast.raumweise!.saldiertRaeume.wert + rest.phiHL.wert, 6);
    // Die Geometrie stammt aus der Eingabe: doppelte AW-Fläche ⇒ doppelter Φ_T der AW
    const e2 = berechne(setzeImState(s, 'huelle.rest.aAussenwandM2', 120), daten);
    expect(e2.heizlast.raumweise!.rest!.bauteile[0]!.phiT.wert).toBeCloseTo(2 * aw.phiT.wert, 6);
  });
  it('Rest «spezifisch»: Φ′ = Bandmitte Folie 37 (1961–70 EFH 40–73 → 56.5 W/m²) als Schätzung markiert, Hinweis «grob»', () => {
    const s = setzeAlle(basis(), { 'gebaeude.ebfModus': 'manuell', 'gebaeude.ebfManuellM2': 150, 'huelle.rest': { modus: 'spezifisch' } });
    const e = berechne(s, daten);
    const rest = e.heizlast.raumweise!.rest!;
    expect(rest.modus).toBe('spezifisch');
    expect(rest.phiHL.wert).toBeCloseTo(56.5 * (150 - 35 * 1.1), 3);
    expect(e.hinweise.some((h) => h.code === 'rest.schaetzung')).toBe(true);
    // Unsicherheit ist fortgepflanzt (Φ' ±29 %, Fläche ±20 % → ±35 %) …
    expect(rest.phiHL.unsicherheit).toBeGreaterThanOrEqual(30);
    // … und die Φ'-Schätzung selbst steht in annahmen[] (neuer Befund MITTEL, behoben S12)
    expect(e.annahmen.some((a) => a.wert.einheit === 'W/m²' && a.wert.stufe === 'bauperiode')).toBe(true);
    expect(e.annahmen.some((a) => a.wert === rest.phiSpez)).toBe(true);
    expect(e.annahmen.some((a) => a.wert === rest.flaeche)).toBe(true);
  });
});

describe('FACH-23 — θe aus SIA-2028-Station (PLZ → Station) mit Höhenkorrektur, nicht pauschal je Kanton', () => {
  const ohneOverride = (): State => setzeImState(basis(), 'gebaeude.standort', { plz: '3000', ort: 'Bern', kanton: 'BE', hoeheM: 560 });

  it('Bern PLZ 3000, 560 m → Station Bern −7 °C (Tabelle), keine Höhenkorrektur (Δh < 200 m); Label nennt Station und SIA 2028', () => {
    const e = berechne(ohneOverride(), daten);
    expect(e.klima!.station!.key).toBe('bern');
    expect(e.thetaE).toMatchObject({ wert: -7, herkunft: 'tabelle' });
    expect(e.klima!.bezeichnung).toContain('Station Bern');
    expect(e.klima!.bezeichnung).toContain('SIA 2028');
    expect(e.heizlast.raumweise!.thetaE).toBe(e.thetaE);
  });
  it('Kanton BE ist NICHT pauschal: PLZ 3715 Adelboden → Station Adelboden −10 °C; PLZ 3000 → Bern −7 °C', () => {
    const e = berechne(setzeImState(basis(), 'gebaeude.standort', { plz: '3715', kanton: 'BE', hoeheM: 1350 }), daten);
    expect(e.klima!.station!.key).toBe('adelboden');
    expect(e.thetaE.wert).toBe(-10);
  });
  it('Höhenkorrektur: Kanton GR, 1 500 m ohne PLZ → Chur −7 °C − 0.6 K/100 m × 944 m = −6 K → −13 °C (Herkunft berechnet, Annahme sichtbar)', () => {
    const e = berechne(setzeImState(basis(), 'gebaeude.standort', { kanton: 'GR', hoeheM: 1500 }), daten);
    expect(e.klima!.station!.key).toBe('chur');
    expect(e.klima!.hoehenkorrektur!.wert).toBe(-6);
    expect(e.thetaE).toMatchObject({ wert: -13, herkunft: 'berechnet' });
    expect(e.annahmen.some((a) => a.wert === e.klima!.hoehenkorrektur)).toBe(true);
    expect(e.hinweise.some((h) => h.code === 'klima.stationAusKanton')).toBe(true);
    // PLZ 7270 Davos → Station Davos −13 direkt (plz2 «72»)
    const d = berechne(setzeImState(basis(), 'gebaeude.standort', { plz: '7270', kanton: 'GR', hoeheM: 1560 }), daten);
    expect(d.klima!.station!.key).toBe('davos');
    expect(d.thetaE.wert).toBe(-13);
  });
  it('Raumweise rechnet mit der Stations-θe: Wohnen Φ_HL bei −7 °C aus Station = Handrechnung 2 098.6 W (±0.5 %)', () => {
    const e = berechne(ohneOverride(), daten);
    erwarteNahe(e.heizlast.raumweise!.raeume[0]!.phiHL.wert, 2098.6, 0.5, 'Wohnen bei Stations-θe');
  });
  it('Override bleibt möglich und ist als «override» markiert (Fixture −7 manuell); Standardwert −8 nur ohne Standort', () => {
    expect(berechne(basis(), daten).thetaE).toMatchObject({ wert: -7, herkunft: 'override' });
    const e = berechne(setzeImState(basis(), 'gebaeude.standort', {}), daten);
    expect(e.thetaE).toMatchObject({ wert: -8, herkunft: 'fallback', stufe: 'standardwert' });
    expect(e.hinweise.some((h) => h.code === 'klima.standardwert')).toBe(true);
  });
});

describe('FACH-24/25/26 (via berechne, raumweises Fixture) — ΔU_WB gesetzt, b_u/n_min aus Tabellen, U_equiv Erdreich', () => {
  const e = berechne(basis(), daten);
  const rw = e.heizlast.raumweise!;

  it('ΔU_WB 0.10 (bestand) wirkt auf Hüllbauteile, nicht auf Innenbauteile; Methode nennt es', () => {
    expect(rw.deltaUWb).toMatchObject({ wert: 0.1, herkunft: 'tabelle' });
    const wohnen = rw.raeume[0]!;
    expect(wohnen.bauteile.find((b) => b.id === 'aw')!.deltaUWb.wert).toBe(0.1);
    const bad = rw.raeume[1]!;
    expect(bad.bauteile.find((b) => b.id === 'iw')!.deltaUWb.wert).toBe(0);
    expect(rw.methode).toMatch(/ΔU_WB 0\.10? W/);
    // Hand: AW Wohnen H_T = (1.1 + 0.1)·19·1 = 22.8 W/K
    expect(wohnen.bauteile.find((b) => b.id === 'aw')!.hT.wert).toBeCloseTo(22.8, 6);
  });
  it('b_u Keller 0.5 aus Tabelle ND.3 (Herkunft tabelle), n_min Wohnen 0.5 / Bad 0.7 / Flur innenliegend 0 aus NA.7 (Herkunft tabelle)', () => {
    const boden = rw.raeume[0]!.bauteile.find((b) => b.id === 'b')!;
    expect(boden.faktor).toMatchObject({ wert: 0.5, herkunft: 'tabelle' });
    expect(boden.faktor.quelle).toContain('ND.3');
    expect(rw.raeume.map((r) => r.nMin.wert)).toEqual([0.5, 0.7, 0]);
    expect(rw.raeume[0]!.nMin.herkunft).toBe('tabelle');
    expect(rw.raeume[0]!.nMin.quelle).toContain('NA.7');
    expect(rw.methode).not.toMatch(/n50/);
    expect(rw.methode).toContain('kein Infiltrations-/Wiederaufheizterm');
  });
  it('Erdreich: Keller «keiner» + generischer Boden → bodenErdreich mit U_equiv (ISO 13370, B′ Standard 5 m) und f = 1.45·f_g2·f_GW', () => {
    const s = setzeAlle(basis(), { 'gebaeude.keller': 'keiner', 'raeume.wohnen.bauteile.b': { id: 'b', art: 'boden', flaecheM2: 25, anschluss: { art: 'auto' } } });
    const e2 = berechne(s, daten);
    const b = e2.heizlast.raumweise!.raeume[0]!.bauteile.find((x) => x.id === 'b')!;
    expect(b.art).toBe('bodenErdreich');
    expect(b.anschluss).toBe('erdreich');
    expect(b.u.herkunft).toBe('berechnet');
    expect(b.u.begruendung).toContain('U_equiv');
    expect(b.u.wert).toBeLessThan(1.0); // Standard-Bodenplatte 1965 U 3.37 → U_equiv deutlich kleiner
    expect(b.faktor.begruendung).toMatch(/f_g1 · f_g2 · f_GW/);
    expect(e2.heizlast.raumweise!.erdreich.bStrich).toMatchObject({ wert: 5, herkunft: 'fallback' });
    expect(e2.annahmen.some((a) => a.wert === e2.heizlast.raumweise!.erdreich.bStrich)).toBe(true);
    // Rechenprobe ISO 13370: U_Boden 3.37, Rsi 0.17 → R_f = 1/3.37 − 0.17 = 0.127; d_t = 0.3 + 2·(0.17 + 0.127 + 0.04) = 0.974 < B′ 5
    // U_equiv = 2·2/(π·5 + 0.974)·ln(π·5/0.974 + 1) = 0.2403·ln(17.13) = 0.683
    const uBoden = e2.heizlast.huelle!.bauteile['std-bodenErdreich']!.u.wert;
    const rf = 1 / uBoden - 0.17;
    const dt = 0.3 + 2 * (0.17 + rf + 0.04);
    const uEq = ((2 * 2) / (Math.PI * 5 + dt)) * Math.log((Math.PI * 5) / dt + 1);
    expect(b.u.wert).toBeCloseTo(uEq, 4);
  });
});

describe('FACH-30 — Gebäude-Heizlast saldiert ≠ Σ Räume; beide ausgewiesen; massgebend = saldiert', () => {
  const e = berechne(basis(), daten);
  const rw = e.heizlast.raumweise!;
  it('Σ Räume 2 733.7 W, saldiert 2 678.7 W (Handrechnung ±0.5 %); massgebend = saldiert; Innentransmission 2 %', () => {
    erwarteNahe(rw.summeRaeume.wert, 2733.7, 0.5, 'Σ Räume');
    erwarteNahe(rw.saldiertRaeume.wert, 2678.7, 0.5, 'saldiert');
    expect(rw.summeRaeume.wert).toBeGreaterThan(rw.saldiertRaeume.wert);
    expect(e.heizlast.massgebend.wert).toBe(rw.gebaeude);
    expect(rw.gebaeude.wert).toBe(rw.saldiertRaeume.wert);
    expect(rw.innentransmissionAnteil.wert).toBeCloseTo(((2733.7 - 2678.7) / 2678.7) * 100, 0);
  });
  it('Σ Räume speist die Heizflächen (Wärmeabgabe nutzt Raum-Φ_HL), das Gerät die saldierte Gebäude-Heizlast', () => {
    expect(e.waermeabgabe!.raeume.find((r) => r.id === 'bad')!.phiHL).toBe(rw.raeume[1]!.phiHL);
    expect(e.zuschlaege.qhl).toBe(rw.gebaeude);
  });
  it('Gegenprobe-Vergleich Norm/Verbrauch nutzt die saldierte Gebäude-Heizlast (FWS-Modus mit Räumen)', () => {
    const fwsS = fixture('state-v4-fws-moosseedorf.json');
    const mitRaeumen = setzeAlle(fwsS, { raeume: basis().raeume, 'gebaeude.baujahr': 1965, 'gebaeude.keller': 'unbeheizt', 'gebaeude.dachform': 'steil', 'gebaeude.dachraumBeheizt': true, 'huelle.lueftung': { konzept: 'natuerlich', dichtheit: 'altbau' } });
    const g = berechne(mitRaeumen, daten);
    expect(g.heizlast.gegenprobe!.methode).toBe('raumweise');
    expect(g.heizlast.gegenprobe!.wert.begruendung).toMatch(/saldiert/);
  });
});
