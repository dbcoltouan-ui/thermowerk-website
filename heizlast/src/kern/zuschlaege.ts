/**
 * Leistungszuschläge und WP-Auslegungsleistung (SIA 384/1:2022 Pos. 4.2.1.4, FWS M3 Folien 11, 30–32):
 *   Q_off = Q_hl · (24/(24 − t_off) − 1)     Sperrzeit, t_off = kumulierte Sperrzeit pro Tag 0–8 h
 *   Q_as  = Σ verbundene Systeme (Pool, Lüftungsregister, Nachbargebäude …)
 *   Q_h   = Q_hl + Q_w + Q_off + Q_as
 * Reine Funktionen, Leistungen in W.
 */
import type { FwsDaten } from '../daten/fws';
import type { Hinweis, Wert } from './wert';
import { berechnet, eingabe, fmt, unsicherheitSumme } from './wert';

export interface SperrzeitErgebnis {
  /** Kumulierte Sperrzeit pro Tag [h]. */
  toff: Wert;
  /** Faktor (Q_hl + Q_off)/Q_hl. */
  faktor: Wert;
  qoff: Wert;
  hinweise: Hinweis[];
}

/** Sperrzeit-Zuschlag (Folie 30–32). Eine kumulierte Tages-Sperrzeit, keine Werktag/Sonntag-Unterscheidung (Befund FACH-08). */
export function sperrzeitZuschlag(qhlW: Wert, toffH: number, daten: FwsDaten): SperrzeitErgebnis {
  const hinweise: Hinweis[] = [];
  const quelle = 'FWS M3 Folie 30–32 «Sperrzeiten für Wärmepumpen»';
  const toff = eingabe(Math.max(0, toffH || 0), 'h/d', `Sperrzeit ${fmt(Math.max(0, toffH || 0), 1)} h/d kumuliert (Eingabe)`);
  if (toff.wert <= 0) {
    return {
      toff,
      faktor: berechnet(1, '', 'Keine Sperrzeit', [], { quelle }),
      qoff: berechnet(0, 'W', 'Q_off = 0 (keine Sperrzeit)', [], { quelle }),
      hinweise,
    };
  }
  if (toff.wert >= 24) {
    hinweise.push({ stufe: 'fehler', code: 'sperrzeit.ungueltig', text: 'Sperrzeit muss unter 24 h/d liegen.', pfad: 'zuschlaege.sperrzeitH' });
    return { toff, faktor: berechnet(1, '', 'ungültig', [], { quelle }), qoff: berechnet(0, 'W', 'ungültig', [], { quelle }), hinweise };
  }
  if (toff.wert > daten.sperrzeit.toffMaxH) {
    hinweise.push({ stufe: 'warnung', code: 'sperrzeit.ueberTabelle', text: `Sperrzeit ${fmt(toff.wert, 1)} h/d liegt über der Kurstabelle (0–${daten.sperrzeit.toffMaxH} h) — Angabe des EW prüfen.`, pfad: 'zuschlaege.sperrzeitH' });
  }
  const f = 24 / (24 - toff.wert);
  const qoffW = qhlW.wert * (f - 1);
  return {
    toff,
    faktor: berechnet(f, '', `24/(24 − ${fmt(toff.wert, 1)}) = ${fmt(f, 3)}`, [toff], { quelle }),
    qoff: berechnet(qoffW, 'W', `Q_off = Q_hl · (24/(24 − t_off) − 1) = ${fmt(qhlW.wert / 1000, 2)} kW × ${fmt(f - 1, 4)} = ${fmt(qoffW / 1000, 2)} kW`, [qhlW], { quelle }),
    hinweise,
  };
}

export interface Zusatzverbraucher {
  bezeichnung: string;
  leistungW: number;
}

/** Zusatzleistung verbundener Systeme Q_as (SIA 384/1; FWS Folie 29 «Verbundene Systeme»). */
export function zusatzleistung(verbraucher: Zusatzverbraucher[]): Wert {
  const summe = verbraucher.reduce((s, v) => s + Math.max(0, v.leistungW || 0), 0);
  if (!verbraucher.length) return eingabe(0, 'W', 'Keine verbundenen Systeme');
  return eingabe(summe, 'W', `Q_as = ${verbraucher.map((v) => `${v.bezeichnung} ${fmt(v.leistungW / 1000, 2)} kW`).join(' + ')} = ${fmt(summe / 1000, 2)} kW`);
}

/** WP-Auslegungsleistung Q_h = Q_hl + Q_w + Q_off + Q_as (SIA 384/1:2022 Pos. 4.2.1.4, Folie 11). */
export function auslegungsleistung(teile: { qhl: Wert; qw: Wert; qoff: Wert; qas: Wert }): Wert {
  const { qhl, qw, qoff, qas } = teile;
  const summe = qhl.wert + qw.wert + qoff.wert + qas.wert;
  const text = `Q_h = Q_hl ${fmt(qhl.wert / 1000, 2)} + Q_w ${fmt(qw.wert / 1000, 2)} + Q_off ${fmt(qoff.wert / 1000, 2)}${qas.wert > 0 ? ` + Q_as ${fmt(qas.wert / 1000, 2)}` : ''} = ${fmt(summe / 1000, 2)} kW`;
  return berechnet(summe, 'W', text, [], { unsicherheit: unsicherheitSumme([qhl, qw, qoff, qas]), quelle: 'SIA 384/1:2022 Pos. 4.2.1.4 (FWS M3 Folie 11)' });
}
