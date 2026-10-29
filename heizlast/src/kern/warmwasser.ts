/**
 * Warmwasser nach FWS M3 (Folien 40–52) und SIA 385/2:2015 — reine Funktionen.
 *
 *   V_W,u  Nutzwarmwasser pro Tag [l/d]  (Personen × l/P·d, Belegung nach SIA 385/2, oder direkt)
 *   Q_W,u  = V_W,u · 4.2 · 50 / 3600                         [kWh/d]   (Folie 41, 60-°C-Äquivalent)
 *   Q_WW   = Q_W,u + Q_W,sto,ls + Q_W,hl,ls + Q_W,em,ls      [kWh/d]   (Folie 49, ADDITIV)
 *   Q_n,WW = Q_WW · 365                                       [kWh/a]   (Abzug vom Verbrauch, Aufgabe 2)
 *   t_d    = Q_WW / Q_hl ;  Q_w = Q_hl · (24/(24 − t_d) − 1)  [h], [W]  (Folie 50–52, SIA 384/1 Pos. 4.2.4)
 *
 * Verluste werden additiv auf Q_W,u bezogen (Folien-Formel). Die Kurslösungen der Aufgaben 2–4
 * verketten dieselben Prozentsätze multiplikativ (1.1·1.15·1.15); das weicht bis ca. 4 % ab und ist
 * im Kurs selbst inkonsistent (Befund FACH-40). Massgebend ist hier die SIA-/Folien-Formel.
 */
import type { FwsDaten } from '../daten/fws';
import type { Hinweis, Wert } from './wert';
import { berechnet, eingabe, fallback, fmt, messung, sammleAnnahmen, schaetzung, tabelle, unsicherheitSumme } from './wert';

export type Zirkulation =
  | { art: 'keine' }
  | { art: 'rohrAnRohr'; laengeM?: number }
  | { art: 'separat'; laengeM?: number }
  | { art: 'unbekannt' }
  | { art: 'warmhalteband' };

export interface WarmwasserEingabe {
  /** personen: Personen × l/(P·d); belegung: Wohneinheiten mit Nutzfläche → SIA 385/2; direkt: V_W,u; messung: kWh/a Zähler. */
  methode: 'personen' | 'belegung' | 'direkt' | 'messung';
  personen?: number;
  /** Nutzfläche A_NF je Wohneinheit [m²] für die Belegungsformel n_P = 3.3 − 2/(1 + (A_NF/100)³). */
  wohneinheiten?: { anfM2: number }[];
  /** Schlüssel aus fws.json `bedarfProPersonLiterTag.werte` (Default: Eintrag mit `default: true`, 45 l/P·d). */
  bedarfKey?: string;
  /** Override l/(P·d). */
  literProPersonTag?: number;
  /** Bei `direkt`: Nutzwarmwasser [l/d]. */
  vwuLiterTag?: number;
  /** Bei `messung`: Jahresenergie Warmwasser [kWh/a]; `enthaeltVerluste` = Zählerwert am Erzeuger (inkl. Speicher-/Leitungsverluste). */
  messungKwhA?: number;
  messungEnthaeltVerluste?: boolean;
  /** Speichervolumen bekannt → Verlust aus Diagramm (Folie 45); sonst Prozent-Richtwert. */
  speicherVolumenLiter?: number;
  speicherverlustProzent?: number;
  zirkulation: Zirkulation;
  ausstossProzent?: number;
}

export interface WarmwasserErgebnis {
  personen: Wert | null;
  literProPersonTag: Wert | null;
  /** Nutzwarmwasser [l/d]; bei Messung mit Verlusten geschätzt. */
  vwu: Wert;
  /** Nutzwärme [kWh/d]. */
  qwu: Wert;
  verluste: { speicher: Wert; leitungen: Wert; ausstoss: Wert };
  /** Gesamtenergiebedarf WW [kWh/d]. */
  qww: Wert;
  /** Jahresenergie WW [kWh/a]. */
  qnWw: Wert;
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
}

const KWH_PRO_LITER = (cp: number, dT: number) => (cp * dT) / 3600;

/** Personenbelegung einer Wohneinheit nach SIA 385/2:2015 (Folie 43): n_P = 3.3 − 2 / (1 + (A_NF/A_0)³). */
export function personenbelegung(anfM2: number, daten: FwsDaten): number {
  const a0 = daten.warmwasser.personenbelegung.a0M2;
  return 3.3 - 2 / (1 + Math.pow(anfM2 / a0, 3));
}

/** Speicherwärmeverlust [kWh/d] aus dem Volumen (Diagramm prSIA 385/2:2023, Folie 45), linear interpoliert. */
export function speicherverlustAusVolumen(liter: number, daten: FwsDaten): Wert {
  const sp = daten.warmwasser.verluste.speicher.ausVolumen.stuetzpunkte;
  const quelle = 'FWS M3 Folie 45 (Diagramm prSIA 385/2:2023, Kurve «Für Speicherdimensionierung»)';
  const letzter = sp[sp.length - 1]!;
  if (liter > letzter.liter) {
    // Über dem Diagrammbereich: Kurvenanpassung (nur Kontrolle, deshalb Schätzung).
    const q = 0.155 * Math.pow(liter, 0.447);
    return schaetzung(Math.round(q * 100) / 100, 'kWh/d', `Speicherverlust ${fmt(liter, 0)} l ausserhalb des Diagramms (≤ ${letzter.liter} l), Näherung 0.155·V^0.447`, { unsicherheit: 15, quelle });
  }
  for (let i = 0; i < sp.length - 1; i++) {
    const a = sp[i]!;
    const b = sp[i + 1]!;
    if (liter >= a.liter && liter <= b.liter) {
      const k = (liter - a.liter) / (b.liter - a.liter);
      const q = a.kwhTag + k * (b.kwhTag - a.kwhTag);
      const abs = 0.15; // Ablesegenauigkeit ±0.15 kWh/d
      return tabelle(Math.round(q * 100) / 100, 'kWh/d', `Speicherverlust aus Diagramm für ${fmt(liter, 0)} l (Folie 45)`, quelle, {
        unsicherheit: Math.round((abs / q) * 1000) / 10,
        stufe: 'volumen',
      });
    }
  }
  return fallback(sp[0]!.kwhTag, 'kWh/d', 'Speichervolumen unter dem Diagrammbereich', { quelle });
}

function bedarfProPerson(e: WarmwasserEingabe, daten: FwsDaten): Wert {
  const werte = daten.warmwasser.bedarfProPersonLiterTag.werte;
  if (e.literProPersonTag !== undefined && e.literProPersonTag > 0) return eingabe(e.literProPersonTag, 'l/(P·d)', 'Nutzwarmwasserbedarf je Person (Eingabe)');
  const quelle = 'SIA 385/2:2015 Tab. Nutzwarmwasserbedarf (FWS M3 Folie 42)';
  if (e.bedarfKey) {
    const w = werte.find((x) => x.key === e.bedarfKey);
    if (w) return tabelle(w.literProPersonTag, 'l/(P·d)', `${w.gebaeudeart}, ${w.standard}`, quelle, { stufe: 'tabelle' });
  }
  const d = werte.find((x) => x.default) ?? werte[0]!;
  return fallback(d.literProPersonTag, 'l/(P·d)', `Standardwert ${d.gebaeudeart}, ${d.standard} (Entscheid Thermowerk 29.10.2026)`, { quelle, stufe: 'standardwert' });
}

/** Warmwasserbedarf (V_W,u → Q_W,u → Verluste → Q_WW, Q_n,WW). */
export function warmwasserBedarf(e: WarmwasserEingabe, daten: FwsDaten): WarmwasserErgebnis {
  const hinweise: Hinweis[] = [];
  const dT = daten.warmwasser.deltaTNutzK;
  const cp = daten.warmwasser.cpKjKgK;
  const kwhProL = KWH_PRO_LITER(cp, dT);
  const tage = daten.warmwasser.wwBisherUeberHeizung.tageProJahr;

  let personen: Wert | null = null;
  let literProPersonTag: Wert | null = null;
  let vwu: Wert;
  let qwu: Wert;

  // Verlustanteile (Prozent von Q_W,u) — vorab, weil die Messmethode sie zum Rückrechnen braucht.
  const v = daten.warmwasser.verluste;
  const ausstossProzent: Wert =
    e.ausstossProzent !== undefined
      ? eingabe(e.ausstossProzent, '%', 'Ausstossverluste (Eingabe)')
      : tabelle(v.ausstoss.typ, '%', `Ausstossverluste Richtwert ${v.ausstoss.min}–${v.ausstoss.max} % von Q_W,u (Kurs rechnet ${v.ausstoss.typ} %)`, 'FWS M3 Folie 46', {
          band: [v.ausstoss.min, v.ausstoss.max],
          unsicherheit: Math.round(((v.ausstoss.max - v.ausstoss.min) / 2 / v.ausstoss.typ) * 100),
        });

  let leitungenProzent: Wert | null = null;
  let leitungenAbs: ((qwuKwh: number) => Wert) | null = null;
  const z = e.zirkulation;
  if (z.art === 'keine') leitungenProzent = tabelle(v.leitungen.keineZirkulationProzent, '%', 'Keine Zirkulation: keine Leitungsverluste', 'FWS M3 Folie 46');
  else if (z.art === 'warmhalteband') leitungenProzent = tabelle(v.leitungen.warmhaltebandProzent, '%', 'Elektro-Warmhalteband: bei der WP-Dimensionierung nicht berücksichtigt', 'FWS M3 Folie 46');
  else if (z.art === 'unbekannt' || z.laengeM === undefined) {
    const b = v.leitungen.laengeUnbekanntProzent;
    leitungenProzent = tabelle(b.typ, '%', `Zirkulation vorhanden, Länge unbekannt: Richtwert ${b.min}–${b.max} % von Q_W,u (Kurs rechnet ${b.typ} %)`, 'FWS M3 Folie 46', {
      band: [b.min, b.max],
      unsicherheit: Math.round(((b.max - b.min) / 2 / b.typ) * 100),
    });
  } else {
    const spez = z.art === 'rohrAnRohr' ? v.leitungen.rohrAnRohrKwhProMeterTag : v.leitungen.separatKwhProMeterTag;
    const laenge = z.laengeM;
    leitungenAbs = () =>
      berechnet(
        spez * laenge,
        'kWh/d',
        `Leitungsverluste ${fmt(spez)} kWh/(m·d) × ${fmt(laenge, 1)} m (${z.art === 'rohrAnRohr' ? 'Rohr-an-Rohr' : 'separat gedämmte WW- und Zirkulationsleitung'})`,
        [],
        { quelle: 'SIA 385/2:2015 (FWS M3 Folie 46)' },
      );
  }

  let speicherProzent: Wert | null = null;
  let speicherAbs: Wert | null = null;
  if (e.speicherVolumenLiter !== undefined && e.speicherVolumenLiter > 0) speicherAbs = speicherverlustAusVolumen(e.speicherVolumenLiter, daten);
  else if (e.speicherverlustProzent !== undefined) speicherProzent = eingabe(e.speicherverlustProzent, '%', 'Speicherverluste (Eingabe)');
  else {
    const b = v.speicher.ohneVolumen;
    speicherProzent = tabelle(b.typ, '%', `Speichervolumen unbekannt: Richtwert ${b.min}–${b.max} % von Q_W,u (Kurs rechnet ${b.typ} %)`, 'FWS M3 Folie 45', {
      band: [b.min, b.max],
      unsicherheit: Math.round(((b.max - b.min) / 2 / b.typ) * 100),
    });
  }

  if (e.methode === 'messung') {
    const kwhA = e.messungKwhA ?? 0;
    if (kwhA <= 0) hinweise.push({ stufe: 'fehler', code: 'warmwasser.messung.fehlt', text: 'Messwert Warmwasser (kWh/a) fehlt.', pfad: 'warmwasser.messungKwhA' });
    const proTag = kwhA / tage;
    if (e.messungEnthaeltVerluste) {
      // Zähler am Erzeuger: Q_WW gemessen → Q_W,u über die Verlustanteile zurückrechnen (Schätzung).
      const prozentSumme = (speicherProzent?.wert ?? 0) + (leitungenProzent?.wert ?? 0) + ausstossProzent.wert;
      const abs = (speicherAbs?.wert ?? 0) + (leitungenAbs ? leitungenAbs(0).wert : 0);
      const qwuW = Math.max(0, (proTag - abs) / (1 + prozentSumme / 100));
      qwu = schaetzung(qwuW, 'kWh/d', `Nutzwärme aus Messung ${fmt(kwhA, 0)} kWh/a abzüglich Verlustanteile (Rückrechnung)`, { unsicherheit: 10 });
    } else {
      qwu = messung(proTag, 'kWh/d', `Nutzwärme Warmwasser gemessen ${fmt(kwhA, 0)} kWh/a / ${tage} d`);
    }
    vwu = berechnet(qwu.wert / kwhProL, 'l/d', `V_W,u = Q_W,u / ${fmt(kwhProL, 5)} kWh/l`, [qwu]);
  } else {
    if (e.methode === 'direkt') {
      const l = e.vwuLiterTag ?? 0;
      if (l <= 0) hinweise.push({ stufe: 'fehler', code: 'warmwasser.vwu.fehlt', text: 'Nutzwarmwasser V_W,u (l/d) fehlt.', pfad: 'warmwasser.vwuLiterTag' });
      vwu = eingabe(l, 'l/d', 'Nutzwarmwasser pro Tag (Eingabe)');
    } else {
      literProPersonTag = bedarfProPerson(e, daten);
      if (e.methode === 'belegung') {
        const we = e.wohneinheiten ?? [];
        if (!we.length) hinweise.push({ stufe: 'fehler', code: 'warmwasser.belegung.fehlt', text: 'Keine Wohneinheiten mit Nutzfläche angegeben.', pfad: 'warmwasser.wohneinheiten' });
        const n = we.reduce((s, w) => s + personenbelegung(w.anfM2, daten), 0);
        personen = berechnet(
          n,
          'P',
          `Personenbelegung nach SIA 385/2 aus ${we.length} Wohneinheit(en): Σ (3.3 − 2/(1 + (A_NF/100)³)) = ${fmt(n, 2)} P`,
          [],
          { quelle: 'SIA 385/2:2015 (FWS M3 Folie 43)' },
        );
      } else {
        const p = e.personen ?? 0;
        if (p <= 0) hinweise.push({ stufe: 'fehler', code: 'warmwasser.personen.fehlt', text: 'Personenzahl fehlt.', pfad: 'warmwasser.personen' });
        personen = eingabe(p, 'P', 'Personen (Eingabe)');
      }
      vwu = berechnet(personen.wert * literProPersonTag.wert, 'l/d', `V_W,u = ${fmt(personen.wert, 2)} P × ${fmt(literProPersonTag.wert, 0)} l/(P·d)`, [personen, literProPersonTag]);
    }
    qwu = berechnet(vwu.wert * kwhProL, 'kWh/d', `Q_W,u = ${fmt(vwu.wert, 0)} l/d × ${fmt(cp, 1)} kJ/(kg·K) × ${dT} K / 3600`, [vwu], { quelle: 'FWS M3 Folie 41/49' });
  }

  const speicher: Wert = speicherAbs ?? berechnet((qwu.wert * speicherProzent!.wert) / 100, 'kWh/d', `Q_W,sto,ls = ${fmt(speicherProzent!.wert, 1)} % × ${fmt(qwu.wert, 2)} kWh/d`, [qwu, speicherProzent]);
  const leitungen: Wert = leitungenAbs
    ? leitungenAbs(qwu.wert)
    : berechnet((qwu.wert * leitungenProzent!.wert) / 100, 'kWh/d', `Q_W,hl,ls = ${fmt(leitungenProzent!.wert, 1)} % × ${fmt(qwu.wert, 2)} kWh/d`, [qwu, leitungenProzent]);
  const ausstoss: Wert = berechnet((qwu.wert * ausstossProzent.wert) / 100, 'kWh/d', `Q_W,em,ls = ${fmt(ausstossProzent.wert, 1)} % × ${fmt(qwu.wert, 2)} kWh/d`, [qwu, ausstossProzent]);

  const qwwW = qwu.wert + speicher.wert + leitungen.wert + ausstoss.wert;
  const qww = berechnet(
    qwwW,
    'kWh/d',
    `Q_WW = ${fmt(qwu.wert, 1)} + ${fmt(speicher.wert, 1)} + ${fmt(leitungen.wert, 1)} + ${fmt(ausstoss.wert, 1)} = ${fmt(qwwW, 1)} kWh/d (additiv, Folie 49)`,
    [],
    { unsicherheit: unsicherheitSumme([qwu, speicher, leitungen, ausstoss]), quelle: 'FWS M3 Folie 49; SIA 385/2:2015' },
  );
  const qnWw = berechnet(qwwW * tage, 'kWh/a', `Q_n,WW = ${fmt(qwwW, 2)} kWh/d × ${tage} d`, [qww]);

  return {
    personen,
    literProPersonTag,
    vwu,
    qwu,
    verluste: { speicher, leitungen, ausstoss },
    qww,
    qnWw,
    annahmen: sammleAnnahmen([personen, literProPersonTag, vwu, qwu, speicherProzent, speicherAbs, leitungenProzent, ausstossProzent]),
    hinweise,
  };
}

export interface LeistungszuschlagErgebnis {
  /** Ladezeit pro Tag [h]. */
  td: Wert;
  /** Leistungszuschlag Warmwasser [W]. */
  qw: Wert;
  hinweise: Hinweis[];
}

/** Leistungszuschlag Warmwasser über die Ladezeit (Folie 50–52, SIA 384/1:2022 Pos. 4.2.4). Kein Clamp; Warnung ab 12 h. */
export function leistungszuschlagWarmwasser(qhlW: Wert, qwwKwhTag: Wert, daten: FwsDaten): LeistungszuschlagErgebnis {
  const hinweise: Hinweis[] = [];
  const quelle = 'SIA 384/1:2022 Pos. 4.2.4 (FWS M3 Folie 50–52)';
  if (!(qhlW.wert > 0) || !(qwwKwhTag.wert > 0)) {
    return {
      td: berechnet(0, 'h', 'Keine Ladezeit (Heizlast oder Warmwasserbedarf 0)', [], { quelle }),
      qw: berechnet(0, 'W', 'Kein Warmwasser-Zuschlag', [], { quelle }),
      hinweise,
    };
  }
  const tdH = qwwKwhTag.wert / (qhlW.wert / 1000);
  if (tdH >= 24) {
    hinweise.push({ stufe: 'fehler', code: 'warmwasser.ladezeit.ueber24h', text: `Ladezeit ${fmt(tdH, 1)} h/d ≥ 24 h: Warmwasserbedarf übersteigt die Heizlast um ein Vielfaches; Formel nicht anwendbar.` });
    return {
      td: berechnet(tdH, 'h', `t_d = ${fmt(qwwKwhTag.wert, 1)} kWh/d / ${fmt(qhlW.wert / 1000, 2)} kW`, [qwwKwhTag, qhlW], { quelle }),
      qw: berechnet(0, 'W', 'Kein Zuschlag berechenbar (t_d ≥ 24 h)', [], { quelle }),
      hinweise,
    };
  }
  if (tdH > daten.warmwasser.leistungszuschlag.warnungTdAbH) {
    hinweise.push({ stufe: 'warnung', code: 'warmwasser.ladezeit.lang', text: `Ladezeit ${fmt(tdH, 1)} h/d über ${daten.warmwasser.leistungszuschlag.warnungTdAbH} h: Warmwasser dominiert die Auslegung — Speicher und Ladestrategie prüfen.` });
  }
  const faktor = 24 / (24 - tdH) - 1;
  const qwW = qhlW.wert * faktor;
  return {
    td: berechnet(tdH, 'h', `t_d = Q_WW / Q_hl = ${fmt(qwwKwhTag.wert, 1)} kWh/d / ${fmt(qhlW.wert / 1000, 2)} kW = ${fmt(tdH, 2)} h/d`, [qwwKwhTag, qhlW], { quelle }),
    qw: berechnet(qwW, 'W', `Q_w = Q_hl · (24/(24 − t_d) − 1) = ${fmt(qhlW.wert / 1000, 2)} kW × ${fmt(faktor, 4)} = ${fmt(qwW / 1000, 2)} kW`, [qhlW, qwwKwhTag], { quelle }),
    hinweise,
  };
}
