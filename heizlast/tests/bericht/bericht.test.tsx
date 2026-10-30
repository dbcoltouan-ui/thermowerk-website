/**
 * Bericht (Session 9): eine Quelle der Wahrheit, Relevanz, Export.
 *
 *  - Bericht = Dashboard: beide werden aus demselben Ergebnis-Objekt des Stores gerendert; die Kennzahlen
 *    (Q_h, Q_hl, Q_w, Q_off, spezifisch, Auslegungs-VL, Speicher, Gerät, Anzahl Annahmen) sind textgleich.
 *  - Relevanz: WW nein → kein Warmwasser-Kapitel; Erfassungsart bestimmt die Herleitung der Menge in der
 *    Zeitraum-Tabelle; Klimabereinigung aus → kein Normjahr-Hinweis; Wärmeabgabe nur mit Heizflächen; keine JAZ.
 *  - Sollwerte extern: Moosseedorf (Q_h 10.73 kW wie e2e/skala.spec.ts), Öl 1 200 + 2 500 + 1 800 − 1 700 = 3 800 l
 *    in 248 Tagen (Handrechnung Session 7b), CH-EFH Wohnen 2 099 W (Handrechnung Session 6).
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'preact-render-to-string';
import { alleDaten } from '../../src/daten/index';
import { firmaDaten } from '../../src/daten/firma';
import { berechne } from '../../src/kern/berechne';
import type { State } from '../../src/state/schema';
import { hydrateState } from '../../src/state/hydrate';
import { store } from '../../src/state/app';
import { Bericht, berichtKapitel } from '../../src/bericht/Bericht';
import type { BerichtDaten } from '../../src/bericht/kontext';
import { dateiname, projektJson } from '../../src/bericht/export';
import { druckFreigegeben, pruefliste } from '../../src/bericht/pruefliste';
import { berichtText } from '../../src/bericht/teile';
import { Dashboard } from '../../src/ui/komponenten/Dashboard';
import { sichtbareSchritte } from '../../src/ui/schritte';
import { fixture, KONTEXT } from '../state/hilfen';

const daten = alleDaten();
const firma = firmaDaten();
const DATUM = '2026-10-30';

function kopie(s: State): State {
  return JSON.parse(JSON.stringify(s)) as State;
}

function bericht(s: State): { b: BerichtDaten; html: string } {
  const b: BerichtDaten = { state: s, ergebnis: berechne(s, daten), daten, firma, datum: DATUM };
  return { b, html: renderToString(<Bericht {...b} />) };
}

/** Text eines Elements mit `data-testid` (direkter Textinhalt bis zum nächsten Tag). */
function textVon(html: string, testid: string): string | null {
  const m = new RegExp(`data-testid="${testid}"[^>]*>([^<]*)<`).exec(html);
  return m ? m[1]!.replace(/&nbsp;/g, ' ').trim() : null;
}

function nurText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function fwsMitGeraet(): State {
  const s = kopie(fixture('state-v4-fws-moosseedorf.json'));
  s.geraet.auswahlId = 'OE-0001';
  return s;
}

/** Öl mit Lieferungen und Tankständen wie e2e/verbrauch.spec.ts (Session 7b). */
function oelMitTankstaenden(): State {
  const s = kopie(fixture('state-v4-fws-moosseedorf.json'));
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
  return s;
}

describe('Bericht = Dashboard (gleiches Ergebnis-Objekt)', () => {
  const faelle: [string, () => State][] = [
    ['FWS Moosseedorf mit Gerät', fwsMitGeraet],
    ['raumweise CH-EFH mit Heizflächen', () => kopie(fixture('state-v4-raumweise-efh.json'))],
    ['FWS Öl mit Tankständen', oelMitTankstaenden],
  ];
  for (const [name, erzeuge] of faelle) {
    it(`${name}: Kennzahlen textgleich`, () => {
      store.ersetze(erzeuge());
      const e = store.ergebnis.value;
      const dash = renderToString(<Dashboard schritte={sichtbareSchritte(e.relevanteSchritte)} status={e.status} />);
      const html = renderToString(<Bericht state={store.state.value} ergebnis={e} daten={daten} firma={firma} datum={DATUM} />);
      expect(textVon(html, 'bericht-qh')).toBe(textVon(dash, 'kpi-qh'));
      expect(textVon(html, 'bericht-qhl')).toBe(textVon(dash, 'kpi-qhl'));
      expect(textVon(html, 'bericht-spez')).toBe(textVon(dash, 'kpi-spez'));
      expect(textVon(html, 'bericht-vl')).toBe(textVon(dash, 'kpi-vl'));
      if (store.state.value.warmwasser.wwKuenftig) expect(textVon(html, 'bericht-qw')).toBe(textVon(dash, 'kpi-qw'));
      if (store.state.value.zuschlaege.sperrzeitAktiv) expect(textVon(html, 'bericht-qoff')).toBe(textVon(dash, 'kpi-qoff'));
      const [ww, puffer] = (textVon(dash, 'kpi-speicher') ?? '').split(' / ');
      if (e.speicher.ww) expect(textVon(html, 'bericht-speicher-ww')).toBe(ww);
      expect(textVon(html, 'bericht-puffer')).toBe(puffer);
      if (e.geraet.gewaehlt) expect(textVon(html, 'bericht-wp')).toBe(textVon(dash, 'kpi-wp'));
      const n = Number(textVon(dash, 'kpi-annahmen'));
      expect(n).toBe(e.annahmen.length);
      expect(nurText(html)).toContain(`Insgesamt ${n} Annahmen`);
    });
  }

  it('Moosseedorf: Q_h 10.73 kW, Q_hl 9.3 kW (Sollwerte wie Dashboard-Test Session 6)', () => {
    const { html } = bericht(fwsMitGeraet());
    expect(textVon(html, 'bericht-qh')).toBe('10.73 kW');
    expect(textVon(html, 'bericht-qhl')).toBe('9.3 kW');
    expect(textVon(html, 'bericht-rechenweg-qhl')).toBe('9.3 kW');
  });

  it('Snapshot: Kapitel und Kennzahlen je Modus', () => {
    const sicht = (s: State) => {
      const { b, html } = bericht(s);
      const werte: Record<string, string | null> = {};
      for (const id of ['bericht-qh', 'bericht-qhl', 'bericht-qw', 'bericht-qoff', 'bericht-spez', 'bericht-vl', 'bericht-speicher-ww', 'bericht-puffer', 'bericht-wp', 'bericht-ebf', 'bericht-thetae', 'bericht-wa-vl', 'bericht-summe-raeume', 'bericht-saldiert', 'bericht-gebaeude']) werte[id] = textVon(html, id);
      return { kapitel: berichtKapitel(b).map((k) => `${k.id}: ${k.titel}`), werte };
    };
    expect({ fws: sicht(fwsMitGeraet()), raumweise: sicht(kopie(fixture('state-v4-raumweise-efh.json'))), oel: sicht(oelMitTankstaenden()) }).toMatchSnapshot();
  });
});

describe('Relevanz der Kapitel', () => {
  it('WW künftig nein → kein Warmwasser-Kapitel, kein Q_w, kein WW-Speicher', () => {
    const s = fwsMitGeraet();
    s.warmwasser.wwKuenftig = false;
    const { b, html } = bericht(s);
    const ids = berichtKapitel(b).map((k) => k.id);
    expect(ids).not.toContain('warmwasser');
    expect(html).not.toContain('data-testid="bericht-qw"');
    expect(html).not.toContain('data-testid="bericht-speicher-ww"');
    expect(html).not.toContain('bericht-speicher-ww-block');
    // Abzug WW bisher bleibt im Rechenweg (eigener Ast, keine Kopplung)
    expect(html).toContain('data-testid="bericht-ww-abzug"');
  });

  it('WW künftig ja → Kapitel Warmwasser mit Ladezeit und Q_w', () => {
    const { b, html } = bericht(fwsMitGeraet());
    expect(berichtKapitel(b).map((k) => k.id)).toContain('warmwasser');
    expect(nurText(html)).toContain('Ladezeit pro Tag');
  });

  it('Erfassungsart Lieferungen → Herleitung «Stand + Lieferungen − Stand», Heizgradtage MeteoSchweiz', () => {
    const { b, html } = bericht(oelMitTankstaenden());
    const t = nurText(html);
    expect(t).toContain('Heizöl EL — Lieferungen und Tank-/Lagerstände'.replace('Heizöl EL', b.daten.fws.heizwerte.konventionen.fwsKurs!.traeger.heizoel!.label));
    expect(t).toContain("Stand 15.9.2023 1'200 + Lieferungen 2'500 + 1'800 − Stand 20.5.2024 1'700 = 3'800 l in 248 Tagen");
    expect(t).toMatch(/MeteoSchweiz, Bern/);
    expect(t).toContain('HGT-Anteil');
    expect(html).toContain('data-testid="bericht-zeitraeume-heizoel"');
  });

  it('Erfassungsart Zählerstände → Herleitung als Zählerdifferenz', () => {
    const s = kopie(fixture('state-v4-fws-moosseedorf.json'));
    s.verbrauch.reihen = [
      {
        id: 'r-gas',
        energietraeger: 'erdgas',
        art: 'zaehlerstaende',
        zaehlerstaende: [
          { id: 'z1', datum: '2022-01-01', stand: 10000 },
          { id: 'z2', datum: '2023-01-01', stand: 12500 },
          { id: 'z3', datum: '2024-01-01', stand: 14900 },
        ],
      },
    ];
    const t = nurText(bericht(s).html);
    expect(t).toContain("Zähler 1.1.2023 12'500 − 1.1.2022 10'000 = 2'500 m³ in 365 Tagen");
    expect(t).toContain('Zählerstände');
    expect(t).not.toContain('Lieferungen 2');
  });

  it('Erfassungsart Kalenderjahre → «Kalenderjahr 2024», Jahresanteil Tage/365', () => {
    const t = nurText(bericht(fwsMitGeraet()).html);
    expect(t).toContain("Kalenderjahr 2024: 2'500 m³");
    expect(t).toContain('Tage / 365');
  });

  it('Klimabereinigung aus → kein Normjahr-Hinweis; ein → ausdrücklich «nicht FWS-Kurs, alle Zeiträume auf Normjahr»', () => {
    const aus = bericht(oelMitTankstaenden()).html;
    expect(aus).not.toContain('bericht-klimabereinigung');
    expect(nurText(aus)).not.toContain('Normjahr');
    const s = oelMitTankstaenden();
    s.verbrauch.klimabereinigung = true;
    const ein = nurText(bericht(s).html);
    expect(ein).toContain('Klimabereinigung aktiv — nicht FWS-Kurs');
    expect(ein).toContain('alle Zeiträume (auch ganze Kalenderjahre)');
    expect(ein).toContain('Normjahr der Station Bern');
    expect(ein).toContain('HGT / Normjahr');
  });

  it('Wärmeabgabe nur mit Heizflächen; raumweise: Tabelle je Raum, θ_VL,req, Fazit = Auslegungs-VL', () => {
    const fws = bericht(fwsMitGeraet());
    expect(berichtKapitel(fws.b).map((k) => k.id)).not.toContain('waermeabgabe');
    const rw = bericht(kopie(fixture('state-v4-raumweise-efh.json')));
    const e = rw.b.ergebnis;
    expect(berichtKapitel(rw.b).map((k) => k.id)).toContain('waermeabgabe');
    const raum = e.waermeabgabe!.raeume.find((r) => r.heizflaechen.length)!;
    expect(textVon(rw.html, `bericht-wa-raum-${raum.id}-vl`)).toBe(`${raum.tVLReq!.wert.toFixed(1)} °C`.replace(/\.0 /, ' '));
    expect(textVon(rw.html, 'bericht-wa-vl')).toBe(`${e.auslegungsVL.wert.toFixed(1)} °C`.replace(/\.0 /, ' '));
    expect(textVon(rw.html, 'bericht-wa-urteil')).toBe(e.waermeabgabe!.gebaeude.urteil);
    const t = nurText(rw.html);
    expect(t).toContain('Plattenheizkörper Typ 22');
    expect(t).toMatch(/H 600 mm · L 1'000 mm/);
    expect(t).toContain('Tabelle aus Bauart und Massen');
  });

  it('Standardwerte der Masse sind markiert (*), eigene Masse nicht', () => {
    const s = kopie(fixture('state-v4-raumweise-efh.json'));
    const r = s.raeume[0]!;
    s.waermeabgabe.raeume[r.id] = { heizflaechen: [{ id: 'hfg', bauart: 'guss_glieder', hoeheMm: 600, glieder: 10 }] };
    const t = nurText(bericht(s).html);
    expect(t).toContain('H 600 mm · T 160 mm* · 10 Glieder');
    expect(t).toContain('* Standardwert des Rechenkerns');
  });

  it('raumweise: Methode wörtlich, θe mit Station, Bauteil-Grundlage «Standard aus Baujahr» bzw. «eigener U-Wert»', () => {
    const s = kopie(fixture('state-v4-raumweise-efh.json'));
    const mitU = bericht(s);
    const t = nurText(mitU.html);
    expect(t).toContain('Methode: SIA 384/2:2020 (Anwendung von SN EN 12831-1:2017); θe aus SIA 2028');
    expect(t).toContain('Fensterlüftung, Bestand ohne Luftdichtheitsnachweis');
    expect(t).toMatch(/Auslegungs-Aussentemperatur: [^.]*Station Bern/);
    expect(t).not.toContain('natuerlich');
    expect(t).toContain('eigener U-Wert');
    // ohne eigene U-Werte: Standard aus Baujahr
    for (const r of s.raeume) for (const bt of r.bauteile) delete bt.uOverride;
    const ohneU = nurText(bericht(s).html);
    expect(ohneU).toContain(`Standard aus Baujahr ${s.gebaeude.baujahr}`);
    expect(ohneU).toContain('Gebäudehülle saldiert');
  });

  it('keine JAZ und keine Zusatzmodule im Bericht', () => {
    for (const s of [fwsMitGeraet(), kopie(fixture('state-v4-raumweise-efh.json'))]) {
      const t = nurText(bericht(s).html);
      expect(t).not.toMatch(/\bJAZ\b|Jahresarbeitszahl|Förderung|Bewilligung|Offerte/);
    }
  });

  it('Annahmen-Kapitel: jede Annahme mit Herkunft, Unsicherheit/Spanne und gekürzter Quelle', () => {
    const { b, html } = bericht(kopie(fixture('state-v4-raumweise-efh.json')));
    expect(html).toContain('data-testid="kapitel-annahmen"');
    for (const a of b.ergebnis.annahmen.slice(0, 5)) expect(nurText(html)).toContain(berichtText(a.wert.begruendung).slice(0, 30));
    const quellen = [...html.matchAll(/class="bericht__quelle">([^<]*)</g)].map((m) => m[1]!);
    expect(quellen.length).toBe(b.ergebnis.annahmen.length);
    for (const q of quellen) expect(q.length).toBeLessThanOrEqual(200);
  });

  it('Quellen: nur verwendete Normen (raumweise ohne FWS-Kurs, FWS mit MeteoSchweiz nur bei HGT aus der Tabelle)', () => {
    const rw = nurText(bericht(kopie(fixture('state-v4-raumweise-efh.json'))).html);
    expect(rw).toContain('SIA 384/2:2020');
    expect(rw).not.toContain('Modul 3 «Dimensionierung»');
    const kalender = nurText(bericht(fwsMitGeraet()).html);
    expect(kalender).toContain('Modul 3 «Dimensionierung»');
    const oel = nurText(bericht(oelMitTankstaenden()).html);
    expect(oel).toContain('MeteoSchweiz Open Government Data');
  });
});

describe('Vollständigkeit, Export', () => {
  it('Offene Pflichtangaben sperren den Druck, Warnungen sind übersteuerbar; ohne Gerät nur Warnung', () => {
    const s = fwsMitGeraet();
    s.zuschlaege.sperrzeitAktiv = null;
    const offen = pruefliste(berechne(s, daten));
    expect(offen.offen.map((p) => p.text)).toContain('Frage «EVU-Sperrzeit vorhanden?» offen');
    expect(druckFreigegeben(offen, true)).toBe(false);
    const ohneGeraet = pruefliste(berechne(fixture('state-v4-fws-moosseedorf.json'), daten));
    expect(ohneGeraet.offen).toEqual([]);
    expect(ohneGeraet.warnungen.map((p) => p.text)).toContain('Kein Gerät gewählt — der Bericht erscheint ohne Kapitel Wärmepumpe.');
    expect(druckFreigegeben(ohneGeraet, false)).toBe(false);
    expect(druckFreigegeben(ohneGeraet, true)).toBe(true);
    const p = pruefliste(berechne(fwsMitGeraet(), daten));
    expect(p.offen).toEqual([]);
    if (p.warnungen.length) {
      expect(druckFreigegeben(p, false)).toBe(false);
      expect(druckFreigegeben(p, true)).toBe(true);
    } else expect(druckFreigegeben(p, false)).toBe(true);
  });

  it('JSON-Export (State v4) lädt über hydrateState verlustfrei wieder — gleiches Ergebnis', () => {
    const s = oelMitTankstaenden();
    const text = projektJson(s);
    expect(JSON.parse(text).meta.schemaVersion).toBe(4);
    const h = hydrateState(text, KONTEXT);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.probleme).toEqual([]);
    expect(h.state).toEqual(s);
    expect(berechne(h.state, daten).zuschlaege.qh?.wert).toBeCloseTo(berechne(s, daten).zuschlaege.qh!.wert, 6);
  });

  it('Dateiname: sichere Zeichen, Datum, Endung', () => {
    expect(dateiname('Referenzhaus Moosseedorf', '2026-10-30', 'pdf')).toBe('heizlast-referenzhaus-moosseedorf-2026-10-30.pdf');
    expect(dateiname('Öl / Bühl', '2026-10-30T10:00', 'json')).toBe('heizlast-oel-buehl-2026-10-30.json');
    expect(dateiname('  ', '2026-10-30', 'json')).toBe('heizlast-projekt-2026-10-30.json');
  });

  it('berichtText entfernt Bedienhinweise, Inhalt bleibt', () => {
    expect(berichtText('θe −8 °C — Standardwert, solange kein Standort mit Klimastation erfasst ist (überschreibbar)')).toBe('θe −8 °C — Standardwert, solange kein Standort mit Klimastation erfasst ist');
    expect(berichtText('Auslegungs-VL 55 °C für Radiatoren (Standardwert, überschreibbar)')).toBe('Auslegungs-VL 55 °C für Radiatoren (Standardwert)');
    expect(berichtText('Q_hl = 9.3 kW')).toBe('Q_hl = 9.3 kW');
  });
});
