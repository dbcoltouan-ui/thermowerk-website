/**
 * Verbrauchsreihen (Session 7b): Zeiträume aus Lieferungen + Tankständen, Zählerständen, von–bis und Kalenderjahr;
 * Prüfungen; Hochrechnung nach Heizgradtag-Anteil in fws.ts. Sollwerte von Hand (im Test dokumentiert) und
 * FWS-Rechner-Logik (burner-replacement.suissetec.ch: Tankinhalt Anfang + Lieferungen − Restmenge).
 */
import { describe, expect, it } from 'vitest';
import { fwsDaten } from '../../src/daten/fws';
import { heizgradtageDaten } from '../../src/daten/heizgradtage';
import { klimaDaten } from '../../src/daten/klima';
import type { FwsEingabe } from '../../src/kern/fws';
import { heizlastFws, parseDatum, parseDatumEnde, zeitraumVonEintrag } from '../../src/kern/fws';
import { hgtFuerZeitraum, hgtJahresreferenz } from '../../src/kern/heizgradtage';
import type { HgtKontext, VerbrauchsReihe } from '../../src/kern/verbrauchsreihe';
import { eintragMitHgt, zeitraeumeAusReihe } from '../../src/kern/verbrauchsreihe';
import { pruefeWert } from './hilfen';

const daten = fwsDaten();
const hgt = heizgradtageDaten();
const klima = klimaDaten();
const d = (s: string) => parseDatum(s)!;
const bern: HgtKontext = { stationKey: 'bern', hgt, klima };
const ohneStation: HgtKontext = { stationKey: null, hgt, klima };
const mittelland = { bedarfsart: 'raumwaerme_wohnen' as const, hoeheM: 500 };

function fwsAus(reihe: VerbrauchsReihe, k: HgtKontext, extra: Partial<FwsEingabe> = {}, klimabereinigung = false) {
  const r = zeitraeumeAusReihe(reihe, 'verbrauch.reihen.r1', daten);
  const hinweise = [...r.hinweise];
  const eintraege = r.zeitraeume.map((z) => eintragMitHgt(z, k, hinweise));
  const erg = heizlastFws({ methode: 'verbrauch', tvoll: mittelland, verbrauch: { eintraege, eta: { heizoel: { wert: 0.85 }, erdgas: { wert: 0.9 } }, konvention: 'fwsKurs', klimabereinigung: { aktiv: klimabereinigung } }, ...extra }, daten);
  return { r, eintraege, erg, hinweise: [...hinweise, ...erg.hinweise] };
}

describe('Datumsformen', () => {
  it('bis als JJJJ-MM ist das Monatsende, von der Monatsanfang; Kalenderjahr = 365 Tage', () => {
    expect(parseDatumEnde('2024-02')).toBe(d('2024-02-29'));
    expect(parseDatumEnde('2023')).toBe(d('2023-12-31'));
    expect(parseDatumEnde('2023-06-15')).toBe(d('2023-06-15'));
    const z = zeitraumVonEintrag({ von: '2023-06', bis: '2024-05' })!;
    expect(z.vonMs).toBe(d('2023-06-01'));
    expect(z.bisMs).toBe(d('2024-05-31'));
    expect(z.tage).toBe(366);
    expect(zeitraumVonEintrag({ jahr: 2024 })!.tage).toBe(365);
  });
});

describe('Lieferungen und Tank-/Lagerstände (Öl)', () => {
  const reihe: VerbrauchsReihe = {
    id: 'r1',
    energietraeger: 'heizoel',
    art: 'lieferungen',
    // Stand 15.9.2023 1 200 l (vor der Lieferung am selben Tag), Lieferungen 2 500 l (15.9.2023) und 1 800 l (10.1.2024),
    // Stand 20.5.2024 1 700 l → Verbrauch 1 200 + 2 500 + 1 800 − 1 700 = 3 800 l in 248 Tagen (15.9.2023–19.5.2024)
    ablesungen: [
      { id: 'a1', datum: '2023-09-15', bestand: 1200 },
      { id: 'a2', datum: '2024-05-20', bestand: 1700 },
    ],
    lieferungen: [
      { id: 'l1', datum: '2023-09-15', menge: 2500 },
      { id: 'l2', datum: '2024-01-10', menge: 1800 },
    ],
  };

  it('Verbrauch = Stand alt + Σ Lieferungen − Stand neu; Zeitraum vom alten bis zum Tag vor dem neuen Stand; Rechenweg', () => {
    const r = zeitraeumeAusReihe(reihe, 'verbrauch.reihen.r1', daten);
    expect(r.fehler).toBe(false);
    expect(r.zeitraeume).toHaveLength(1);
    const z = r.zeitraeume[0]!;
    expect(z.menge.wert).toBe(3800);
    expect(z.zeitraum.vonMs).toBe(d('2023-09-15'));
    expect(z.zeitraum.bisMs).toBe(d('2024-05-19'));
    expect(z.zeitraum.tage).toBe(248);
    expect(z.ganzesJahr).toBe(false);
    expect(z.pfad).toBe('verbrauch.reihen.r1.ablesungen.a2');
    expect(z.menge.begruendung).toContain("1'200 + Lieferungen 2'500 + 1'800 − Stand 20.5.2024 1'700 = 3'800 l");
    expect(z.menge.einheit).toBe('l');
    expect(z.teile).toHaveLength(4);
    pruefeWert(z.menge, 'menge');
    expect(r.hinweise.some((h) => h.code === 'verbrauch.zeitraum.kurzerEintrag')).toBe(true);
  });

  it('Hochrechnung nach Heizgradtag-Anteil (Bern): 3 800 l / (HGT Periode / Jahres-HGT bis 19.5.2024) statt 3 800 × 365/248', () => {
    const { eintraege, erg, hinweise } = fwsAus(reihe, bern);
    const e = eintraege[0]!;
    expect(e.hgtIst?.herkunft).toBe('tabelle');
    const periode = hgtFuerZeitraum('bern', d('2023-09-15'), d('2024-05-19'), hgt).wert!.wert;
    const jahr = hgtJahresreferenz('bern', d('2024-05-19'), 1, hgt)!.wert;
    expect(e.hgtIst!.wert).toBe(periode);
    expect(e.hgtRef!.wert).toBe(jahr);
    const anteil = periode / jahr;
    const t = erg.traeger[0]!;
    expect(t.zeitraeume[0]!.anteil.wert).toBeCloseTo(anteil, 9);
    expect(t.zeitraeume[0]!.anteilBasis).toBe('hgt');
    expect(t.zeitraeume[0]!.hochgerechnet.wert).toBeCloseTo(3800 / anteil, 6);
    expect(t.jahresmenge.wert).toBeCloseTo(3800 / anteil, 6);
    // Nach Tagen wären es 5 593 l/a — fast die Hälfte zu viel, weil der Sommer fehlt
    expect(t.jahresmenge.wert).toBeLessThan((3800 * 365) / 248);
    expect(t.jahresmenge.wert).toBeGreaterThan(3800);
    expect(erg.qhl!.wert).toBeCloseTo(((3800 / anteil) * 10.5 * 0.85 * 1000) / 2000, 3);
    expect(hinweise.some((h) => h.code === 'verbrauch.hgt.fehlt')).toBe(false);
    expect(t.zeitraeume[0]!.inStreuung).toBe(true); // ≥ 60 % der Jahres-HGT
    // Heizgradtage bestimmen den Jahresanteil → im Annahmen-Protokoll (Audit S12)
    expect(erg.annahmen).toContain(t.zeitraeume[0]!.hgtIst);
    expect(erg.annahmen).toContain(t.zeitraeume[0]!.hgtRef);
  });

  it('ohne Station: Hochrechnung nach Tagen als Fallback mit Warnung', () => {
    const { erg, hinweise } = fwsAus(reihe, ohneStation);
    const t = erg.traeger[0]!;
    expect(t.zeitraeume[0]!.anteilBasis).toBe('tage');
    expect(t.zeitraeume[0]!.anteil.herkunft).toBe('fallback');
    expect(t.jahresmenge.wert).toBeCloseTo((3800 * 365) / 248, 6);
    expect(hinweise.some((h) => h.code === 'verbrauch.hgt.fehlt' && h.stufe === 'warnung')).toBe(true);
    expect(t.zeitraeume[0]!.inStreuung).toBe(false); // < 300 Tage
  });

  it('manuelle Heizgradtage überschreiben den Tabellenwert', () => {
    const r2: VerbrauchsReihe = { ...reihe, ablesungen: [reihe.ablesungen![0]!, { ...reihe.ablesungen![1]!, hgtIstKd: 2500 }] };
    const { eintraege } = fwsAus(r2, bern);
    expect(eintraege[0]!.hgtIst!.herkunft).toBe('override');
    expect(eintraege[0]!.hgtIst!.wert).toBe(2500);
  });

  it('Prüfungen: negativer Verbrauch → Fehler; Lieferung ohne spätere Ablesung und vor der ersten → Warnung; nur ein Stand → Fehler', () => {
    const neg = zeitraeumeAusReihe({ ...reihe, ablesungen: [{ id: 'a1', datum: '2023-09-15', bestand: 100 }, { id: 'a2', datum: '2024-05-20', bestand: 5000 }] }, 'p', daten);
    expect(neg.fehler).toBe(true);
    expect(neg.hinweise.some((h) => h.code === 'verbrauch.negativ' && h.stufe === 'fehler')).toBe(true);
    const spaet = zeitraeumeAusReihe({ ...reihe, lieferungen: [...reihe.lieferungen!, { id: 'l3', datum: '2024-08-01', menge: 2000 }, { id: 'l0', datum: '2023-01-01', menge: 500 }] }, 'p', daten);
    expect(spaet.fehler).toBe(false);
    expect(spaet.zeitraeume[0]!.menge.wert).toBe(3800); // l3 und l0 nicht gezählt
    expect(spaet.hinweise.some((h) => h.code === 'verbrauch.lieferung.ohneAblesung' && h.pfad === 'p.lieferungen.l3')).toBe(true);
    expect(spaet.hinweise.some((h) => h.code === 'verbrauch.lieferung.vorErsterAblesung' && h.pfad === 'p.lieferungen.l0')).toBe(true);
    const einer = zeitraeumeAusReihe({ ...reihe, ablesungen: [reihe.ablesungen![0]!] }, 'p', daten);
    expect(einer.fehler).toBe(true);
    expect(einer.hinweise[0]!.code).toBe('verbrauch.ablesungen.zuWenig');
  });

  it('Lieferung am Tag des Endstands zählt zum nächsten Zeitraum (Stand = vor der Lieferung); drei Stände → zwei lückenlose Zeiträume', () => {
    const r = zeitraeumeAusReihe(
      {
        ...reihe,
        ablesungen: [{ id: 'a1', datum: '2023-09-15', bestand: 1200 }, { id: 'a2', datum: '2024-05-20', bestand: 1700 }, { id: 'a3', datum: '2025-05-15', bestand: 900 }],
        lieferungen: [...reihe.lieferungen!, { id: 'l3', datum: '2024-05-20', menge: 2000 }, { id: 'l4', datum: '2024-11-01', menge: 1500 }],
      },
      'p',
      daten,
    );
    expect(r.zeitraeume).toHaveLength(2);
    expect(r.zeitraeume[0]!.menge.wert).toBe(3800);
    expect(r.zeitraeume[1]!.menge.wert).toBe(1700 + 2000 + 1500 - 900);
    expect(r.zeitraeume[1]!.zeitraum.vonMs).toBe(d('2024-05-20'));
    expect(r.zeitraeume[1]!.zeitraum.bisMs).toBe(d('2025-05-14'));
    expect(r.hinweise.some((h) => h.code === 'verbrauch.luecke' || h.code === 'verbrauch.ueberlappung')).toBe(false);
  });
});

describe('Zählerstände (Gas)', () => {
  const reihe: VerbrauchsReihe = {
    id: 'r1',
    energietraeger: 'erdgas',
    art: 'zaehlerstaende',
    zaehlerstaende: [
      { id: 'z1', datum: '2022-01-01', stand: 10_000 },
      { id: 'z2', datum: '2023-01-01', stand: 12_500 },
      { id: 'z3', datum: '2024-01-01', stand: 14_900 },
      { id: 'z4', datum: '2025-01-01', stand: 17_500 },
    ],
  };

  it('Differenzen 2 500 / 2 400 / 2 600 m³ in drei ganzen Kalenderjahren → Mittel 2 500 m³/a, Q_hl 11.7 kW (wie Session-3-Test), Streuung grün 4 %', () => {
    const { r, erg } = fwsAus(reihe, bern);
    expect(r.zeitraeume.map((z) => z.menge.wert)).toEqual([2500, 2400, 2600]);
    expect(r.zeitraeume.map((z) => z.zeitraum.tage)).toEqual([365, 365, 366]);
    expect(r.zeitraeume.every((z) => z.ganzesJahr)).toBe(true);
    const t = erg.traeger[0]!;
    expect(t.zeitraeume.every((z) => z.anteilBasis === 'tage')).toBe(true); // ganze Jahre: keine HGT-Hochrechnung
    expect(t.jahresmenge.wert).toBeCloseTo((7500 * 365) / 1096, 6);
    expect(erg.qhl!.wert).toBeCloseTo((t.jahresmenge.wert * 10.4 * 0.9 * 1000) / 2000, 3);
    expect(erg.streuung.ampel).toBe('gruen');
  });

  it('negativer Zählerstand (Zählerwechsel) → Fehler; ein Stand → Fehler', () => {
    const neg = zeitraeumeAusReihe({ ...reihe, zaehlerstaende: [{ id: 'z1', datum: '2022-01-01', stand: 10_000 }, { id: 'z2', datum: '2023-01-01', stand: 500 }] }, 'p', daten);
    expect(neg.fehler).toBe(true);
    expect(neg.hinweise[0]!.code).toBe('verbrauch.negativ');
    expect(zeitraeumeAusReihe({ ...reihe, zaehlerstaende: [reihe.zaehlerstaende![0]!] }, 'p', daten).hinweise[0]!.code).toBe('verbrauch.zaehler.zuWenig');
  });

  it('Klimabereinigung EIN: alle Zeiträume mit HGT_ist/HGT_norm (auch ganze Jahre), Brutto und WW unverändert', () => {
    const aus = fwsAus(reihe, bern, {}, false).erg;
    const an = fwsAus(reihe, bern, {}, true).erg;
    const t = an.traeger[0]!;
    expect(t.zeitraeume.every((z) => z.klimaFaktor !== null)).toBe(true);
    for (const z of t.zeitraeume) expect(z.anteil.wert).toBeCloseTo(z.hgtIst!.wert / 3513, 9); // Bern HGT_norm 3513
    expect(an.qnBrutto!.wert).toBeCloseTo(aus.qnBrutto!.wert, 6);
    // Σ heiz / Σ anteil = norm × Σ heiz / Σ HGT_ist (ohne Bereinigung: Σ heiz / (1096 Tage / 365))
    const summeHgt = t.zeitraeume.reduce((s, z) => s + z.hgtIst!.wert, 0);
    expect(an.qnHeizungIst!.wert).toBeCloseTo((aus.qnHeizungIst!.wert * (1096 / 365) * 3513) / summeHgt, 6);
    expect(an.qnHeizungIst!.wert).toBeGreaterThan(aus.qnHeizungIst!.wert); // 2022–2024 wärmer als 1984–2003
    expect(an.klimabereinigungAktiv).toBe(true);
    // Normjahr-HGT und Ist-HGT je Zeitraum stehen im Annahmen-Protokoll; ohne Klimabereinigung ganze Jahre nicht (Kurs: nach Tagen)
    expect(an.annahmen.some((a) => a.einheit === 'Kd' && /Normjahr/.test(a.begruendung))).toBe(true);
    for (const z of t.zeitraeume) expect(an.annahmen).toContain(z.hgtIst);
    expect(aus.annahmen.some((a) => a.einheit === 'Kd')).toBe(false);
  });
});

describe('Zeiträume und Kalenderjahre (Rechnungen)', () => {
  it('Monatsgenauer Zeitraum Juni 2023 bis Mai 2024 (366 Tage, ganzes Jahr) bleibt nach Tagen; Lücke zwischen Zeiträumen wird gemeldet', () => {
    const r = zeitraeumeAusReihe({ id: 'r1', energietraeger: 'erdgas', art: 'zeitraeume', zeitraeume: [{ id: 'e1', menge: 2000, von: '2023-06', bis: '2024-05' }, { id: 'e2', menge: 500, von: '2024-09-01', bis: '2024-12-31' }] }, 'p', daten);
    expect(r.zeitraeume[0]!.ganzesJahr).toBe(true);
    expect(r.zeitraeume[0]!.zeitraum.tage).toBe(366);
    expect(r.hinweise.some((h) => h.code === 'verbrauch.luecke')).toBe(true);
    expect(r.hinweise.some((h) => h.code === 'verbrauch.zeitraum.kurzerEintrag' && h.pfad === 'p.zeitraeume.e2.zeitraum')).toBe(true);
  });

  it('Kalenderjahre wie bisher: 2 500 / 2 400 / 2 600 m³ → 2 500 m³/a (Kurslösung unverändert, keine HGT-Hochrechnung)', () => {
    const { erg } = fwsAus({ id: 'r1', energietraeger: 'erdgas', art: 'zeitraeume', zeitraeume: [{ id: '22', menge: 2500, jahr: 2022 }, { id: '23', menge: 2400, jahr: 2023 }, { id: '24', menge: 2600, jahr: 2024 }] }, bern);
    expect(erg.traeger[0]!.jahresmenge.wert).toBeCloseTo(2500, 6);
    expect(erg.qhl!.wert).toBeCloseTo(11_700, 3);
    expect(erg.traeger[0]!.zeitraeume.every((z) => z.anteilBasis === 'tage' && z.hgtIst !== null)).toBe(true);
  });

  it('Überlappung → Fehler ohne Resultat', () => {
    const r = zeitraeumeAusReihe({ id: 'r1', energietraeger: 'erdgas', art: 'zeitraeume', zeitraeume: [{ id: 'a', menge: 2500, jahr: 2022 }, { id: 'b', menge: 2500, von: '2022-06-01', bis: '2023-05-31' }] }, 'p', daten);
    expect(r.fehler).toBe(true);
    expect(r.hinweise.some((h) => h.code === 'verbrauch.ueberlappung')).toBe(true);
  });
});

describe('Sanierung mitten in einer Lieferperiode (§3a) — sichtbar je Zeitraum', () => {
  it('Fenster 15 % am 1.1.2024 in der Periode 15.9.2023–19.5.2024: Teilperioden 108 d × 1 + 140 d × 0.85, Faktor wie Handrechnung', () => {
    const reihe: VerbrauchsReihe = { id: 'r1', energietraeger: 'heizoel', art: 'lieferungen', ablesungen: [{ id: 'a1', datum: '2023-09-15', bestand: 1200 }, { id: 'a2', datum: '2024-05-20', bestand: 1700 }], lieferungen: [{ id: 'l1', datum: '2023-09-15', menge: 2500 }, { id: 'l2', datum: '2024-01-10', menge: 1800 }] };
    const { erg } = fwsAus(reihe, bern, { sanierungen: [{ id: 'f', massnahme: 'fenster', einsparungProzent: 15, status: 'ausgefuehrt', datum: '2024-01-01' }] });
    const z = erg.traeger[0]!.zeitraeume[0]!;
    expect(z.sanierung.subperioden).toEqual([
      { tage: 108, faktor: 1 },
      { tage: 140, faktor: 0.85 },
    ]);
    const faktorUnsaniert = 248 / (108 * 1 + 140 * 0.85);
    expect(z.sanierung.faktorUnsaniert).toBeCloseTo(faktorUnsaniert, 9);
    expect(z.sanierung.faktorIst).toBeCloseTo(faktorUnsaniert * 0.85, 9);
    expect(z.sanierung.wirksam).toHaveLength(1);
    expect(z.sanierung.wirksam[0]!.label).toContain('Fenster');
    expect(erg.qhlIst!.wert).toBeCloseTo(erg.qhlUnsaniert!.wert * 0.85, 6);
  });
});
