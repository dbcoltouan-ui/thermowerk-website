/**
 * Hüllen-Kaskade — Sollwerte extern: ISO-6946-Handrechnungen (im Test), Kontrollwerte der Epochen-Defaults
 * (huelle-epochen.json, Session 2 gegen Bauteilekatalog/GEAK/UFELD kalibriert), EnFK-Fenstertabelle, Bauteilekatalog-Türen.
 * Property-Tests: Monotonie (Dämmung↑ ⇒ U↓, Dicke↑ ⇒ U↓, jüngere Fenstergeneration ⇒ U↓), «mehr Wissen»-Regeln
 * (Bestätigen des Defaults ändert nichts; eine bekannte Stufe mit epochentypischem Wert bleibt in der Epochen-Spanne),
 * Override gewinnt und ist markiert.
 */
import { describe, expect, it } from 'vitest';
import { huelleDaten } from '../../src/daten/huelle';
import type { Bauteiltyp, HuellBauteilArt, Stufen } from '../../src/kern/huelle';
import { aufloesenBauteiltyp, epocheFuerBaujahr, HUELL_ARTEN, huelleAufloesen, standardBauteiltypen, stufenDefinition, uAusWiderstaenden } from '../../src/kern/huelle';
import { istAnnahme } from '../../src/kern/wert';
import { erwarteNahe, pruefeWert } from './hilfen';

const d = huelleDaten();
const JAHR: Record<string, number> = { vor1919: 1900, '1919_1945': 1930, '1946_1960': 1950, '1961_1977': 1965, '1978_1994': 1985, '1995_2010': 2000, ab2011: 2015 };
const E = { bezugsjahr: 2026 };

function u(art: Bauteiltyp['art'], baujahr: number, stufen: Stufen = {}, extra: Partial<Bauteiltyp> = {}) {
  return aufloesenBauteiltyp({ id: 'x', art, stufen, ...extra }, { baujahr, ...E }, d);
}

describe('Epochen und ISO-6946-Primitive', () => {
  it('Epoche aus Baujahr: 1918 → vor1919, 1919 → 1919_1945, 1977/1978, 2010/2011', () => {
    expect(epocheFuerBaujahr(1918, d)).toBe('vor1919');
    expect(epocheFuerBaujahr(1919, d)).toBe('1919_1945');
    expect(epocheFuerBaujahr(1977, d)).toBe('1961_1977');
    expect(epocheFuerBaujahr(1978, d)).toBe('1978_1994');
    expect(epocheFuerBaujahr(2010, d)).toBe('1995_2010');
    expect(epocheFuerBaujahr(2011, d)).toBe('ab2011');
  });
  it('U = 1/(Rsi + ΣR + Rse): Backstein 30 cm verputzt von Hand = 1.264 W/m²K (0.13 + 0.015/0.7 + 0.3/0.52 + 0.02/0.87 + 0.04)', () => {
    const r = [0.015 / 0.7, 0.3 / 0.52, 0.02 / 0.87];
    expect(uAusWiderstaenden(r, 0.13, 0.04)).toBeCloseTo(1 / 0.79134, 3);
    expect(uAusWiderstaenden([], 0.13, 0.04)).toBeCloseTo(5.882, 2);
    expect(uAusWiderstaenden([Number.NaN, -1, 1], 0.13, 0.04)).toBeCloseTo(1 / 1.17, 3);
  });
});

describe('Epochen-Default (alles unbekannt)', () => {
  it('jedes Hüllbauteil × Epoche: U = Kontrollwert der Daten, Herkunft fallback/Stufe epoche, Band = Unsicherheit, Wert in der Spanne, Begründung nennt Baujahr und Epoche', () => {
    for (const art of HUELL_ARTEN) {
      for (const [ep, jahr] of Object.entries(JAHR)) {
        const def = d.bauteile[art]!.epochen[ep]!;
        const r = u(art, jahr);
        expect(r.u.wert, `${art}/${ep}`).toBeCloseTo(def.uDefaultBerechnet, 1);
        expect(r.u.herkunft).toBe('fallback');
        expect(r.u.stufe).toBe('epoche');
        expect(r.u.wert).toBeGreaterThanOrEqual(def.uSpanne.min - 1e-9);
        expect(r.u.wert).toBeLessThanOrEqual(def.uSpanne.max + 1e-9);
        expect(r.u.unsicherheit).toBe(Math.min(100, def.unsicherheitProzent));
        expect(r.u.begruendung).toContain(`Baujahr ${jahr}`);
        expect(r.stufenBekannt).toEqual([]);
        expect(r.stufenStandard).toContain('bauweise');
        expect(r.geclampt).toBe(false);
        pruefeWert(r.u, `${art}/${ep}`);
      }
    }
  });
  it('Klartext (KONTEXT §2): «geschätzt aus Baujahr 1965 … Backstein 30 cm ungedämmt … ±%»', () => {
    const r = u('aussenwand', 1965, { bauweise: 'backstein_30', dickeM: 0.3, daemmung: false });
    expect(r.u.begruendung).toMatch(/Baujahr 1965/);
    expect(r.u.begruendung).toMatch(/Backstein/);
    expect(r.u.begruendung).toMatch(/ungedämmt/);
    expect(r.u.begruendung).toMatch(/±10 %/);
    expect(r.u.wert).toBeCloseTo(1.264, 2); // Handrechnung oben
    expect(r.u.herkunft).toBe('schaetzung');
    expect(r.u.stufe).toBe('stufen_vollstaendig');
    expect(r.stufenStandard).toEqual([]);
  });
});

describe('Eine Schichtkette: bekannte Stufen ersetzen genau ihre Schicht (FACH-21, DATA-02)', () => {
  it('P2: Bestätigen der Default-Stufen ändert U nicht (kein Sprung durch Wissensgewinn ohne neue Information)', () => {
    for (const art of HUELL_ARTEN) {
      for (const [ep, jahr] of Object.entries(JAHR)) {
        const def = d.bauteile[art]!.epochen[ep]!;
        const r0 = u(art, jahr);
        const trag = def.schichten.find((s) => s.rolle === 'tragschicht');
        const zweischalig = def.schichten.some((s) => s.rolle === 'aussenschale');
        const gesamt = def.schichten.filter((s) => ['tragschicht', 'aussenschale', 'luftschicht', 'daemmung'].includes(s.rolle)).reduce((a, s) => a + s.dickeM, 0);
        const daemm = def.schichten.find((s) => s.daemmstoff);
        const stufen: Stufen = { bauweise: def.bauweise, daemmung: !!daemm };
        if (trag) stufen.dickeM = zweischalig ? gesamt : trag.dickeM;
        if (daemm) {
          stufen.daemmstoff = daemm.daemmstoff!;
          stufen.daemmdickeM = daemm.dickeM;
        }
        const r1 = u(art, jahr, stufen);
        expect(r1.u.wert, `${art}/${ep}`).toBeCloseTo(r0.u.wert, 6);
        expect(r1.u.unsicherheit, `${art}/${ep} Unsicherheit sinkt`).toBeLessThan(r0.u.unsicherheit!);
        // Schrittweise bestätigen: jeder Zwischenschritt = Default
        const schritte: Stufen[] = [{ bauweise: def.bauweise }];
        if (trag) schritte.push({ ...schritte[schritte.length - 1], dickeM: stufen.dickeM! });
        schritte.push({ ...schritte[schritte.length - 1], daemmung: !!daemm });
        for (const s of schritte) expect(u(art, jahr, s).u.wert, `${art}/${ep} ${JSON.stringify(s)}`).toBeCloseTo(r0.u.wert, 6);
      }
    }
  });
  it('P3: eine einzelne bekannte Stufe mit epochentypischem Wert (Bauweise aus epochenTypisch, Dämmstoff der Epoche) bleibt in der Epochen-Spanne', () => {
    for (const art of HUELL_ARTEN) {
      for (const [ep, jahr] of Object.entries(JAHR)) {
        const def = d.bauteile[art]!.epochen[ep]!;
        for (const [bk, bw] of Object.entries(d.bauweisen[art]!)) {
          if (!bw.epochenTypisch.includes(ep)) continue;
          const r = u(art, jahr, { bauweise: bk });
          expect(r.u.wert, `${art}/${ep}/${bk}`).toBeGreaterThanOrEqual(def.uSpanne.min - 1e-9);
          expect(r.u.wert, `${art}/${ep}/${bk}`).toBeLessThanOrEqual(def.uSpanne.max + 1e-9);
          expect(r.stufenBekannt).toContain('bauweise');
        }
        const daemm = def.schichten.find((s) => s.daemmstoff);
        if (daemm) {
          const r = u(art, jahr, { daemmstoff: daemm.daemmstoff! });
          expect(r.u.wert, `${art}/${ep} Dämmstoff`).toBeCloseTo(def.uDefaultBerechnet, 1);
        }
      }
    }
  });
  it('Dicke ±1 typische Stufe bei Default-Bauweise (massiv): |ΔU| ≤ 25 % der Spannenmitte, Dicke↑ ⇒ U↓', () => {
    for (const ep of ['vor1919', '1919_1945'] as const) {
      const def = d.bauteile.aussenwand!.epochen[ep]!;
      const bw = d.bauweisen.aussenwand![def.bauweise]!;
      const trag = def.schichten.find((s) => s.rolle === 'tragschicht')!;
      const dicken = bw.dickenTypischM!;
      const i = dicken.indexOf(trag.dickeM);
      expect(i).toBeGreaterThanOrEqual(0);
      const mid = (def.uSpanne.min + def.uSpanne.max) / 2;
      let vorher = Infinity;
      for (const dk of dicken) {
        const r = u('aussenwand', JAHR[ep]!, { dickeM: dk });
        expect(r.u.wert, `${ep} ${dk}`).toBeLessThan(vorher);
        vorher = r.u.wert;
        if (Math.abs(dicken.indexOf(dk) - i) <= 1) expect(Math.abs(r.u.wert - def.uDefaultBerechnet) / mid, `${ep} ${dk}`).toBeLessThanOrEqual(0.25);
      }
    }
  });
  it('Monotonie Dämmung: ja < nein; Dämmdicke↑ ⇒ U↓ streng; besserer Dämmstoff (λ kleiner) ⇒ U↓', () => {
    for (const art of HUELL_ARTEN) {
      for (const jahr of Object.values(JAHR)) {
        const ja = u(art, jahr, { daemmung: true }).u.wert;
        const nein = u(art, jahr, { daemmung: false }).u.wert;
        expect(ja, `${art}/${jahr}`).toBeLessThan(nein);
        let vorher = Infinity;
        for (const dd of [0.02, 0.04, 0.06, 0.1, 0.16, 0.24, 0.3]) {
          const w = u(art, jahr, { daemmung: true, daemmdickeM: dd }).u.wert;
          expect(w, `${art}/${jahr}/${dd}`).toBeLessThan(vorher);
          vorher = w;
        }
        const mw = u(art, jahr, { daemmung: true, daemmstoff: 'mineralwolle', daemmdickeM: 0.1 }).u.wert;
        const pur = u(art, jahr, { daemmung: true, daemmstoff: 'pur_pir', daemmdickeM: 0.1 }).u.wert;
        expect(pur).toBeLessThan(mw);
      }
    }
  });
  it('Zweischalenmauerwerk: Dicke = Gesamtdicke (Innenschale = Gesamt − Aussenschale − Zwischenraum); «ungedämmt» macht aus Kerndämmung eine Luftschicht', () => {
    const r31 = u('aussenwand', 1965, { dickeM: 0.31 });
    expect(r31.u.wert).toBeCloseTo(u('aussenwand', 1965).u.wert, 6);
    const r40 = u('aussenwand', 1965, { dickeM: 0.4 });
    expect(r40.u.wert).toBeLessThan(r31.u.wert);
    expect(r40.schichten.find((s) => s.rolle === 'tragschicht')!.dickeM).toBeCloseTo(0.24, 6);
    const kern = u('aussenwand', 1985);
    const ohne = u('aussenwand', 1985, { daemmung: false });
    expect(kern.schichten.some((s) => s.rolle === 'daemmung')).toBe(true);
    expect(ohne.schichten.some((s) => s.rolle === 'daemmung')).toBe(false);
    expect(ohne.schichten.some((s) => s.rolle === 'luftschicht')).toBe(true);
    expect(ohne.u.wert).toBeCloseTo(u('aussenwand', 1965).u.wert, 6); // = Hohlmauer 1961–77
    expect(u('aussenwand', 1965, { dickeM: 0.1 }).hinweise.some((h) => h.code === 'huelle.dickeZweischalig')).toBe(true);
  });
  it('Clamp: Beton 20 cm ungedämmt 1965 rechnet 3.32, wird auf Spannenmaximum 1.6 begrenzt (Hinweis); mit Dämmung bekannt kein Clamp, nur Info', () => {
    const r = u('aussenwand', 1965, { bauweise: 'beton' });
    expect(r.geclampt).toBe(true);
    expect(r.u.wert).toBe(1.6);
    expect(r.u.begruendung).toContain('U 3.32');
    expect(r.hinweise.some((h) => h.code === 'huelle.clamp')).toBe(true);
    const r2 = u('aussenwand', 1965, { bauweise: 'beton', daemmung: true, daemmdickeM: 0.12 });
    expect(r2.geclampt).toBe(false);
    expect(r2.u.wert).toBeCloseTo(1 / (0.13 + 0.015 / 0.7 + 0.2 / 2.3 + 0.12 / 0.045 + 0.02 / 0.87 + 0.04), 3);
    expect(r2.hinweise.some((h) => h.code === 'huelle.ausserhalbSpanne')).toBe(true);
    expect(r2.u.unsicherheit).toBe(20);
  });
  it('Dämmung ja bei Epoche ohne Dämm-Default: Dämmdicke der nächsten gedämmten Epoche (geringste typische Dicke), ±30 %', () => {
    const r = u('aussenwand', 1950, { daemmung: true });
    const l = r.schichten.find((s) => s.rolle === 'daemmung')!;
    expect(l.dickeM).toBe(0.04); // 1978–1994: Kerndämmung 4 cm
    expect(l.daemmstoff).toBe('bestand_alt');
    expect(r.u.unsicherheit).toBe(30);
    expect(r.geclampt).toBe(false);
  });
  it('Pauschal-Bauweise (Fachwerk 1.9) nimmt Dämmung an, Dicke ohne Wirkung (Info)', () => {
    expect(u('aussenwand', 1900, { bauweise: 'fachwerk' }).u.wert).toBeCloseTo(1.9, 9);
    const r = u('aussenwand', 1900, { bauweise: 'fachwerk', dickeM: 0.3, daemmung: true, daemmdickeM: 0.08 });
    expect(r.u.wert).toBeCloseTo(1 / (1 / 1.9 + 0.08 / 0.045), 3);
    expect(r.hinweise.some((h) => h.code === 'huelle.dickeOhneWirkung')).toBe(true);
  });
  it('Steildach: «ungedämmt» ergibt die ungedämmte Sparrendach-Kette (1.52), 12 cm Zwischensparren 0.30', () => {
    expect(u('dachSteil', 1965, { daemmung: false }).u.wert).toBeCloseTo(1.515, 2);
    expect(u('dachSteil', 1965, { daemmung: true, daemmdickeM: 0.12 }).u.wert).toBeCloseTo(1 / (0.1 + 0.015 / 0.13 + 0.12 / 0.045 + 0.16 + 0.024 / 0.13 + 0.1), 2);
  });
  it('unbekannte Bauweise/Dämmstoff → Warnung, Default bleibt', () => {
    const r = u('aussenwand', 1965, { bauweise: 'gibtEsNicht', daemmstoff: 'kork' });
    expect(r.hinweise.map((h) => h.code)).toContain('huelle.bauweiseUnbekannt');
    expect(r.u.wert).toBeGreaterThan(0.5);
  });
});

describe('Sanierung «ab Jahr X» je Bauteiltyp', () => {
  it('Hohlmauer 1950, Fassade saniert 2005 ohne Angaben: Dämm-Default 1995–2010 (10 cm MW) → 0.30, Spanne 1995–2010, uUnsaniert 1.09', () => {
    const r = u('aussenwand', 1950, {}, { sanierung: { status: 'ausgefuehrt', jahr: 2005 } });
    expect(r.sanierungWirkt).toBe(true);
    expect(r.u.wert).toBeCloseTo(0.297, 2);
    expect(r.uUnsaniert?.wert).toBeCloseTo(1.095, 2);
    expect(r.spanne).toEqual([0.2, 0.4]);
    expect(r.stufenBekannt).toContain('sanierung');
    expect(r.u.begruendung).toContain('Sanierung ausgeführt 2005');
    pruefeWert(r.u, 'saniert');
  });
  it('mit Angaben (16 cm EPS 2015): Schichtrechnung ohne Clamp; mehr Dämmung ⇒ kleineres U als Default-Sanierung', () => {
    const r = u('aussenwand', 1950, {}, { sanierung: { status: 'ausgefuehrt', jahr: 2015, stufen: { daemmstoff: 'eps', daemmdickeM: 0.16 } } });
    expect(r.u.wert).toBeCloseTo(1 / (0.13 + 0.015 / 0.7 + 0.15 / 0.52 + 0.16 / 0.036 + 0.12 / 0.52 + 0.02 / 0.87 + 0.04), 3);
    expect(r.geclampt).toBe(false);
    expect(r.u.wert).toBeLessThan(u('aussenwand', 1950, {}, { sanierung: { status: 'ausgefuehrt', jahr: 2015 } }).u.wert);
  });
  it('geplante Sanierung: im Ist-Zustand wirkt sie nicht (uNachSanierung informativ); zustand «geplant» wendet sie an', () => {
    const typ: Bauteiltyp = { id: 'aw', art: 'aussenwand', sanierung: { status: 'geplant', jahr: 2027, stufen: { daemmstoff: 'eps', daemmdickeM: 0.2 } } };
    const ist = aufloesenBauteiltyp(typ, { baujahr: 1950, bezugsjahr: 2026 }, d);
    expect(ist.sanierungWirkt).toBe(false);
    expect(ist.u.wert).toBeCloseTo(1.095, 2);
    expect(ist.uNachSanierung?.wert).toBeLessThan(0.2);
    const geplant = aufloesenBauteiltyp(typ, { baujahr: 1950, bezugsjahr: 2026, zustand: 'geplant' }, d);
    expect(geplant.sanierungWirkt).toBe(true);
    expect(geplant.u.wert).toBeLessThan(0.2);
  });
  it('Sanierung ohne Jahr → Info, Epoche des Bezugsjahrs; U-Override der Sanierung gewinnt', () => {
    const r = u('aussenwand', 1950, {}, { sanierung: { status: 'ausgefuehrt' } });
    expect(r.hinweise.some((h) => h.code === 'huelle.sanierungOhneJahr')).toBe(true);
    expect(r.spanne).toEqual([0.12, 0.25]);
    const o = u('aussenwand', 1950, {}, { sanierung: { status: 'ausgefuehrt', jahr: 2010, uOverride: 0.25 } });
    expect(o.u.wert).toBe(0.25);
    expect(o.u.herkunft).toBe('override');
  });
  it('Fenster ersetzt 2010 ohne Angaben → Default 1995–2010 (1.6, Standard markiert); mit Generation → Tabellenwert; Tür ersetzt → Epochentyp', () => {
    const f = u('fenster', 1965, {}, { sanierung: { status: 'ausgefuehrt', jahr: 2010 } });
    expect(f.u.wert).toBe(1.6);
    expect(f.u.begruendung).toContain('Fenster ersetzt 2010');
    expect(f.u.begruendung).toContain('Standard');
    expect(f.uUnsaniert?.wert).toBe(2.7);
    const f2 = u('fenster', 1965, {}, { sanierung: { status: 'ausgefuehrt', jahr: 2018, stufen: { generation: 'iv3_neu', rahmen: 'kunststoff' } } });
    expect(f2.u.wert).toBe(1.0);
    const t = u('tuer', 1965, {}, { sanierung: { status: 'ausgefuehrt', jahr: 2018 } });
    expect(t.u.wert).toBe(1.2);
  });
});

describe('Fenster und Türen (eine Tabelle Generation × Rahmen, FACH-29)', () => {
  it('Default 1965: 2-IV Luft/Holz 2.7 ±19 %, Band = Spanne; Generation bekannt ±10 %; + Rahmen Kunststoff 2.8 ±5 %', () => {
    const f = u('fenster', 1965);
    expect(f.u.wert).toBe(2.7);
    expect(f.u.herkunft).toBe('fallback');
    expect(f.u.unsicherheit).toBe(19);
    expect(f.u.band).toEqual([2.5, 3.5]);
    const g = u('fenster', 1965, { generation: 'iv2_luft' });
    expect(g.u.wert).toBe(2.7);
    expect(g.u.herkunft).toBe('tabelle');
    expect(g.u.unsicherheit).toBe(10);
    const k = u('fenster', 1965, { generation: 'iv2_luft', rahmen: 'kunststoff' });
    expect(k.u.wert).toBe(2.8);
    expect(k.u.unsicherheit).toBe(5);
    expect(k.stufenStandard).toEqual([]);
  });
  it('Monotonie: jüngere Generation ⇒ Uw fällt (Holzrahmen); jüngere Epoche ⇒ Default fällt; schlechterer Rahmen ⇒ Uw steigt', () => {
    let vorher = Infinity;
    for (const g of ['einfach', 'iv2_luft', 'iv2_argon', 'iv3_alt', 'iv2_ir', 'iv3_ir', 'iv3_ir_ir', 'iv3_neu']) {
      const w = u('fenster', 1965, { generation: g, rahmen: 'holz' }).u.wert;
      expect(w, g).toBeLessThanOrEqual(vorher);
      vorher = w;
    }
    vorher = Infinity;
    for (const jahr of Object.values(JAHR)) {
      const w = u('fenster', jahr).u.wert;
      expect(w, String(jahr)).toBeLessThanOrEqual(vorher);
      vorher = w;
    }
    expect(u('fenster', 2000, { generation: 'iv2_ir', rahmen: 'metall' }).u.wert).toBeGreaterThan(u('fenster', 2000, { generation: 'iv2_ir', rahmen: 'holz' }).u.wert);
    expect(u('fenster', 1965, { generation: 'xy' }).hinweise.some((h) => h.code === 'huelle.generationUnbekannt')).toBe(true);
  });
  it('Tür: Epochen-Default 1965 Spanplatte/Alu 2.5 (Spanne 1.6–2.8); Typ bekannt → Tabellenwert ±10 %', () => {
    const t = u('tuer', 1965);
    expect(t.u.wert).toBe(2.5);
    expect(t.u.herkunft).toBe('fallback');
    expect(t.spanne).toEqual([1.6, 2.8]);
    const t2 = u('tuer', 1965, { typ: 'holz_daemm30' });
    expect(t2.u.wert).toBe(1.1);
    expect(t2.u.herkunft).toBe('tabelle');
    expect(u('tuer', 1965, { typ: 'xy' }).hinweise.some((h) => h.code === 'huelle.tuertypUnbekannt')).toBe(true);
  });
});

describe('Innenbauteile (Rsi beidseitig)', () => {
  it('Innenwand Backstein 12 cm verputzt: 1/(0.26 + 2·0.015/0.7 + 0.12/0.52) = 1.874; Innendecke Beton 2.98; Innentür 2.0; Bauweise wählbar', () => {
    expect(u('innenwand', 1965).u.wert).toBeCloseTo(1 / (0.26 + 0.03 / 0.7 + 0.12 / 0.52), 3);
    expect(u('innendecke', 1965).u.wert).toBeCloseTo(1 / (0.2 + 0.015 / 0.7 + 0.18 / 2.3 + 0.05 / 1.4), 3);
    expect(u('innentuer', 1965).u.wert).toBe(2.0);
    const st = u('innenwand', 1965, { bauweise: 'staender_gedaemmt' });
    expect(st.u.wert).toBeLessThan(0.4);
    expect(st.u.herkunft).toBe('schaetzung');
    expect(u('innenwand', 1965).u.herkunft).toBe('fallback');
  });
});

describe('Override, Gebäude, UI-Hilfen', () => {
  it('manueller U gewinnt, Herkunft override, Warnung bei > 50 % Abweichung, keine Clamp-Markierung', () => {
    const r = u('aussenwand', 1965, { bauweise: 'beton' }, { uOverride: 0.3 });
    expect(r.u.herkunft).toBe('override');
    expect(r.u.wert).toBe(0.3);
    expect(r.geclampt).toBe(false);
    expect(r.stufenBekannt).toEqual(['override']);
    expect(r.hinweise.some((h) => h.code === 'huelle.overrideAbweichung')).toBe(true);
    expect(istAnnahme(r.u)).toBe(true);
    expect(u('aussenwand', 1965, {}, { uOverride: 1.0 }).hinweise.some((h) => h.code === 'huelle.overrideAbweichung')).toBe(false);
  });
  it('huelleAufloesen: Standard-Satz 1965 mit Keller/Steildach → 9 Typen, Annahmen = alle geschätzten U; doppelte ID → Fehler; Baujahr fehlt → Fehler', () => {
    const typen = standardBauteiltypen({ dachform: 'steil', dachraumBeheizt: true, keller: 'unbeheizt' });
    expect(typen.map((t) => t.id)).toEqual(['aw', 'dach', 'boden', 'fenster', 'tuer', 'iw', 'id', 'it']);
    const h = huelleAufloesen({ baujahr: 1965, bauteiltypen: typen }, d);
    expect(Object.keys(h.bauteile)).toHaveLength(8);
    expect(h.epoche).toBe('1961_1977');
    expect(h.annahmen).toHaveLength(8);
    expect(h.bauteile.boden!.art).toBe('bodenKeller');
    expect(h.hinweise.filter((x) => x.stufe === 'fehler')).toHaveLength(0);
    const flach = standardBauteiltypen({ dachform: 'flach', keller: 'keiner' });
    expect(flach.find((t) => t.id === 'dach')!.art).toBe('dachFlach');
    expect(flach.find((t) => t.id === 'boden')!.art).toBe('bodenErdreich');
    expect(standardBauteiltypen({ dachraumBeheizt: false }).some((t) => t.art === 'deckeEstrich')).toBe(true);
    const dup = huelleAufloesen({ baujahr: 1965, bauteiltypen: [{ id: 'a', art: 'aussenwand' }, { id: 'a', art: 'fenster' }] }, d);
    expect(dup.hinweise.some((x) => x.code === 'huelle.idDoppelt')).toBe(true);
    expect(huelleAufloesen({ baujahr: Number.NaN, bauteiltypen: [] }, d).hinweise[0]?.code).toBe('huelle.baujahrFehlt');
  });
  it('stufenDefinition liefert je Stufe Optionen und den sichtbaren Standardwert (Daniel 29.10.: Standardwerte als Zahl markiert)', () => {
    const s = stufenDefinition('aussenwand', 1965, {}, d);
    expect(s.map((x) => x.key)).toEqual(['bauweise', 'dickeM', 'daemmung']);
    expect(s[0]!.standard).toBe('zweischalen_luft');
    expect(s[0]!.options.some((o) => String(o.label).includes('typisch für die Epoche'))).toBe(true);
    expect(s[1]!.standardLabel).toBe('31 cm');
    expect(s[2]!.standardLabel).toBe('Nein');
    const s2 = stufenDefinition('aussenwand', 1965, { daemmung: true }, d);
    expect(s2.map((x) => x.key)).toEqual(['bauweise', 'dickeM', 'daemmung', 'daemmstoff', 'daemmdickeM']);
    expect(s2[4]!.standardLabel).toBe('4 cm');
    expect(stufenDefinition('fenster', 1965, {}, d).map((x) => x.key)).toEqual(['generation', 'rahmen']);
    expect(stufenDefinition('tuer', 1965, {}, d)[0]!.standardLabel).toContain('Spanplatte');
    expect(stufenDefinition('innenwand', 1965, {}, d)[0]!.standard).toBe('backstein_12');
    const art: HuellBauteilArt = 'dachSteil';
    expect(stufenDefinition(art, 1965, {}, d)[2]!.standardLabel).toBe('Ja');
  });
  it('Abweichung gegenüber dem alten Tool (Befund A8): 1965 nur Dicke 30 cm → kein Sprung (1.12 statt 1.09), 1930 nur Vollziegel → 1.45 (statt 1.80 → 1.20); Boden 1965 nur Beton → 2.10 (statt 0.80 → 3.05)', () => {
    erwarteNahe(u('aussenwand', 1965, { dickeM: 0.3 }).u.wert, 1.095, 5, '1965 Dicke 30');
    expect(u('aussenwand', 1930, { bauweise: 'vollbackstein' }).u.wert).toBeCloseTo(1.451, 2);
    expect(u('bodenKeller', 1965, { bauweise: 'beton_ungedaemmt' }).u.wert).toBeCloseTo(u('bodenKeller', 1965).u.wert, 6);
  });
});
