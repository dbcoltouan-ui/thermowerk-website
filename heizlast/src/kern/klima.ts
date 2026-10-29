/**
 * Klima am Standort (SIA 2028 / SIA 384/2 Kap. 4–5; Befund FACH-23) — reine Funktionen mit Herkunftsmodell.
 *
 *   Standort (PLZ, Kanton, Höhe) → Station (PLZ 3-stellig → PLZ 2-stellig → Kanton; Thermowerk-Regel)
 *   θe,Standort = θe,Station − g · (h_Standort − h_Station)/100 m   nur wenn |Δh| ≥ 200 m, g = 0.6 K/100 m
 *   (Thermowerk-Schätzung, SIA-Gradient nicht öffentlich; Rundung auf ganze °C, max. ±6 K), sonst θe,Station.
 *   θm,e (Jahresmittel, für Erdreich f_g2): Stationswert SIA 381/2, sonst Höhenregression (±1 K).
 *   Override der Station oder von θe mit Herkunft «override».
 *
 * Temperaturen in °C; Unsicherheit als Band [min, max] (Prozent sind bei Temperaturen nicht sinnvoll).
 */
import type { KlimaDaten, Station } from '../daten/klima';
import type { Hinweis, Wert } from './wert';
import { berechnet, eingabe, fmt, override, sammleAnnahmen, schaetzung, tabelle } from './wert';

export interface StandortEingabe {
  plz?: string | number;
  /** Kantonskürzel (BE, ZH, …), FL für Liechtenstein. */
  kanton?: string;
  ort?: string;
  /** Höhe des Gebäudes über Meer [m]; ohne Angabe gilt die Stationshöhe (keine Korrektur). */
  hoeheM?: number;
  /** Stations-Key aus klimastationen.json, wenn der Nutzer die Station selbst wählt. */
  stationOverride?: string;
  /** Eigene Auslegungstemperatur [°C] (z. B. kantonale Vorgabe). */
  thetaEOverrideC?: number;
  /** Eigenes Jahresmittel [°C]. */
  thetaMittelOverrideC?: number;
}

export type StationsStufe = 'override' | 'plz3' | 'plz2' | 'kanton';

export interface StationsWahl {
  station: Station;
  stufe: StationsStufe;
}

export interface KlimaErgebnis {
  station: Station | null;
  /** Wie die Station gefunden wurde (für Begründung und UI-Chip). */
  stationsStufe: StationsStufe | null;
  /** Auslegungs-Aussentemperatur θe am Standort [°C] — massgebend. */
  thetaE: Wert | null;
  /** θe der Station ohne Höhenkorrektur [°C]. */
  thetaEStation: Wert | null;
  /** Angewandte Höhenkorrektur [K] (0 wenn keine). */
  hoehenkorrektur: Wert | null;
  /** Jahresmitteltemperatur θm,e am Standort [°C] (für f_g2 Erdreich). */
  thetaMittelJahr: Wert | null;
  /** Heizgradtage HGT 20/12 der Station [Kd]. */
  hgt: Wert | null;
  /** Text für den Bericht, z. B. «θe −8 °C, Station Zürich-Kloten (SIA 2028)». */
  bezeichnung: string;
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
}

const QUELLE_THETA = 'SIA 2028:2010 Tabelle 6 (Auslegungswert «kalt», Korrigenda C1:2015)';
const QUELLE_ZUORDNUNG = 'Thermowerk-Regel PLZ/Kanton → nächste SIA-2028-Station (klimastationen.json zuordnung)';

function stationByKey(key: string, daten: KlimaDaten): Station | undefined {
  return daten.stationen.find((s) => s.key === key);
}

/** PLZ-Präfix (3- oder 2-stellig) aus einer Eingabe wie 3001, "3001", " 8050 Zürich". */
function plzZiffern(plz: string | number | undefined): string | null {
  if (plz === undefined || plz === null) return null;
  const m = String(plz).trim().match(/^(\d{4})/);
  return m ? m[1]! : null;
}

/** Station nach Thermowerk-Regel: Override → PLZ 3-stellig → PLZ 2-stellig → Kanton. */
export function findeStation(e: StandortEingabe, daten: KlimaDaten): StationsWahl | null {
  if (e.stationOverride) {
    const s = stationByKey(e.stationOverride, daten);
    if (s) return { station: s, stufe: 'override' };
  }
  const plz = plzZiffern(e.plz);
  if (plz) {
    const k3 = daten.zuordnung.plz3[plz.slice(0, 3)];
    if (k3) {
      const s = stationByKey(k3, daten);
      if (s) return { station: s, stufe: 'plz3' };
    }
    const k2 = daten.zuordnung.plz2[plz.slice(0, 2)];
    if (k2) {
      const s = stationByKey(k2, daten);
      if (s) return { station: s, stufe: 'plz2' };
    }
  }
  if (e.kanton) {
    const k = daten.zuordnung.kanton[e.kanton.trim().toUpperCase()];
    if (k) {
      const s = stationByKey(k, daten);
      if (s) return { station: s, stufe: 'kanton' };
    }
  }
  return null;
}

/**
 * Höhenkorrektur θe (Thermowerk-Regel aus klimastationen.json hoehenkorrektur): Gradient g K/100 m ab |Δh| ≥ Schwelle,
 * gerundet auf ganze °C, begrenzt auf ±maxKorrekturK. Rückgabe: Korrektur in K (negativ = kälter).
 */
export function hoehenkorrekturK(hoeheStandortM: number, hoeheStationM: number, daten: KlimaDaten): { korrekturK: number; deltaHoeheM: number; begrenzt: boolean } {
  const h = daten.hoehenkorrektur;
  const deltaHoeheM = hoeheStandortM - hoeheStationM;
  if (Math.abs(deltaHoeheM) < h.schwelleDeltaHoeheM) return { korrekturK: 0, deltaHoeheM, begrenzt: false };
  const roh = -h.gradientKPro100m * (deltaHoeheM / 100);
  const gerundet = Math.round(roh);
  const begrenzt = Math.abs(gerundet) > h.maxKorrekturK;
  const korrekturK = Math.max(-h.maxKorrekturK, Math.min(h.maxKorrekturK, gerundet));
  return { korrekturK, deltaHoeheM, begrenzt };
}

/** Jahresmitteltemperatur: Stationswert (SIA 381/2) oder Höhenregression (Thermowerk-Schätzung). */
export function jahresmittel(station: Station | null, hoeheM: number | undefined, daten: KlimaDaten): Wert {
  const j = daten.jahresmittel;
  const h = hoeheM ?? station?.hoeheM;
  if (station && station.jahresmittelAltC !== null && (hoeheM === undefined || Math.abs(hoeheM - station.hoeheM) < daten.hoehenkorrektur.schwelleDeltaHoeheM)) {
    return tabelle(station.jahresmittelAltC, '°C', `Jahresmittel ${fmt(station.jahresmittelAltC, 1)} °C der Station ${station.name} (SIA 381/2)`, 'SIA 381/2 (Vorgängerdaten, klimastationen.json vergleichSia381_2)', {
      stufe: 'station',
      band: [station.jahresmittelAltC - j.unsicherheitK, station.jahresmittelAltC + j.unsicherheitK],
    });
  }
  const hh = h ?? 500;
  const wert = Math.round((j.aC + (j.bKPro100m * hh) / 100) * 10) / 10;
  return schaetzung(wert, '°C', `Jahresmittel geschätzt aus Höhe ${fmt(hh, 0)} m ü. M.: ${fmt(j.aC, 1)} ${j.bKPro100m < 0 ? '−' : '+'} ${fmt(Math.abs(j.bKPro100m), 1)} K/100 m → ${fmt(wert, 1)} °C (±${fmt(j.unsicherheitK, 0)} K)`, {
    stufe: 'hoehenregression',
    band: [wert - j.unsicherheitK, wert + j.unsicherheitK],
    quelle: 'Thermowerk-Regression über SIA-381/2-Stationen (klimastationen.json jahresmittel)',
  });
}

/** Klima am Standort: Station, θe mit Höhenkorrektur, Jahresmittel, HGT — mit Herkunft je Wert. */
export function klimaStandort(e: StandortEingabe, daten: KlimaDaten): KlimaErgebnis {
  const hinweise: Hinweis[] = [];
  const wahl = findeStation(e, daten);
  const station = wahl?.station ?? null;

  if (!station) {
    if (e.thetaEOverrideC !== undefined && Number.isFinite(e.thetaEOverrideC)) {
      const thetaE = override(e.thetaEOverrideC, '°C', `Auslegungstemperatur ${fmt(e.thetaEOverrideC, 0)} °C manuell (keine Station zugeordnet)`);
      const thetaMittelJahr = e.thetaMittelOverrideC !== undefined ? override(e.thetaMittelOverrideC, '°C', `Jahresmittel ${fmt(e.thetaMittelOverrideC, 1)} °C manuell`) : jahresmittel(null, e.hoeheM, daten);
      hinweise.push({ stufe: 'warnung', code: 'klima.keineStation', text: 'Keine SIA-2028-Station zugeordnet (PLZ/Kanton fehlt oder unbekannt); θe stammt aus der manuellen Eingabe.', pfad: 'gebaeude.standort' });
      return { station: null, stationsStufe: null, thetaE, thetaEStation: null, hoehenkorrektur: null, thetaMittelJahr, hgt: null, bezeichnung: `θe ${fmt(thetaE.wert, 0)} °C (manuell)`, annahmen: sammleAnnahmen([thetaE, thetaMittelJahr]), hinweise };
    }
    hinweise.push({ stufe: 'fehler', code: 'klima.keineStation', text: 'Standort unvollständig: PLZ oder Kanton angeben (oder Klimastation wählen), sonst fehlt die Auslegungs-Aussentemperatur.', pfad: 'gebaeude.standort' });
    return { station: null, stationsStufe: null, thetaE: null, thetaEStation: null, hoehenkorrektur: null, thetaMittelJahr: null, hgt: null, bezeichnung: 'θe fehlt', annahmen: [], hinweise };
  }

  const stufe = wahl!.stufe;
  const stufeText = stufe === 'override' ? 'manuell gewählt' : stufe === 'plz3' ? `aus PLZ ${plzZiffern(e.plz)}` : stufe === 'plz2' ? `aus PLZ ${plzZiffern(e.plz)}` : `aus Kanton ${e.kanton?.toUpperCase()}`;
  const thetaEStation = tabelle(station.thetaEC, '°C', `θe ${fmt(station.thetaEC, 0)} °C der Station ${station.name} (${stufeText}, SIA 2028)`, QUELLE_THETA, {
    stufe: stufe === 'override' ? 'station_manuell' : `station_${stufe}`,
    band: [station.thetaEC - 1, station.thetaEC + 1],
  });
  if (stufe === 'kanton') {
    hinweise.push({ stufe: 'info', code: 'klima.stationAusKanton', text: `Station ${station.name} nur aus dem Kanton zugeordnet — PLZ angeben oder Station prüfen (${QUELLE_ZUORDNUNG}).`, pfad: 'gebaeude.standort' });
  }

  // Höhenkorrektur
  let hoehenkorrektur: Wert;
  let thetaE: Wert;
  const hk = e.hoeheM !== undefined && Number.isFinite(e.hoeheM) ? hoehenkorrekturK(e.hoeheM, station.hoeheM, daten) : { korrekturK: 0, deltaHoeheM: 0, begrenzt: false };
  if (hk.korrekturK !== 0) {
    const g = daten.hoehenkorrektur.gradientKPro100m;
    hoehenkorrektur = schaetzung(hk.korrekturK, 'K', `Höhenkorrektur: Gebäude ${fmt(e.hoeheM!, 0)} m, Station ${fmt(station.hoeheM, 0)} m (Δh ${hk.deltaHoeheM > 0 ? '+' : '−'}${fmt(Math.abs(hk.deltaHoeheM), 0)} m) × ${fmt(g, 1)} K/100 m → ${fmt(hk.korrekturK, 0)} K${hk.begrenzt ? ` (begrenzt auf ±${daten.hoehenkorrektur.maxKorrekturK} K)` : ''}`, {
      stufe: 'hoehenkorrektur',
      band: [hk.korrekturK - daten.hoehenkorrektur.unsicherheitK, hk.korrekturK + daten.hoehenkorrektur.unsicherheitK],
      quelle: 'SIA 384.201 ND.1.1 (Korrektur nach Höhe); Gradient 0.6 K/100 m = Thermowerk-Annahme aus 10 Stationspaaren (klimastationen.json hoehenkorrektur)',
    });
    const w = station.thetaEC + hk.korrekturK;
    thetaE = berechnet(w, '°C', `θe,Standort = θe,Station ${fmt(station.thetaEC, 0)} °C ${hk.korrekturK < 0 ? '−' : '+'} ${fmt(Math.abs(hk.korrekturK), 0)} K (Höhenkorrektur) = ${fmt(w, 0)} °C`, [thetaEStation, hoehenkorrektur], {
      band: [w - daten.hoehenkorrektur.unsicherheitK, w + daten.hoehenkorrektur.unsicherheitK],
      quelle: QUELLE_THETA,
    });
    if (hk.begrenzt) hinweise.push({ stufe: 'warnung', code: 'klima.hoehenkorrekturBegrenzt', text: `Höhendifferenz ${fmt(Math.abs(hk.deltaHoeheM), 0)} m zur Station ${station.name} ist sehr gross — Station mit ähnlicher Höhe wählen (Praxisregel).`, pfad: 'gebaeude.standort' });
    else hinweise.push({ stufe: 'info', code: 'klima.hoehenkorrektur', text: `θe um ${fmt(hk.korrekturK, 0)} K korrigiert (Höhendifferenz ${fmt(Math.abs(hk.deltaHoeheM), 0)} m zur Station ${station.name}); ohne Trägheitskorrektur nach SIA 384/2 Kap. 5 (konservativ).` });
  } else {
    hoehenkorrektur = berechnet(0, 'K', e.hoeheM !== undefined ? `Keine Höhenkorrektur (Δh ${fmt(Math.abs(hk.deltaHoeheM), 0)} m < ${daten.hoehenkorrektur.schwelleDeltaHoeheM} m)` : 'Keine Höhenkorrektur (Gebäudehöhe nicht angegeben, Stationshöhe angenommen)', [], { quelle: 'klimastationen.json hoehenkorrektur' });
    thetaE = { ...thetaEStation, begruendung: `${thetaEStation.begruendung}; keine Höhenkorrektur` };
    if (e.hoeheM === undefined) hinweise.push({ stufe: 'info', code: 'klima.hoeheFehlt', text: `Höhe des Gebäudes nicht angegeben — θe der Station ${station.name} (${fmt(station.hoeheM, 0)} m ü. M.) ohne Höhenkorrektur verwendet.`, pfad: 'gebaeude.standort.hoeheM' });
  }

  if (e.thetaEOverrideC !== undefined && Number.isFinite(e.thetaEOverrideC)) {
    const alt = thetaE.wert;
    thetaE = override(e.thetaEOverrideC, '°C', `Auslegungstemperatur ${fmt(e.thetaEOverrideC, 0)} °C manuell (statt ${fmt(alt, 0)} °C aus Station ${station.name})`);
    if (Math.abs(e.thetaEOverrideC - alt) >= 3) hinweise.push({ stufe: 'warnung', code: 'klima.overrideAbweichung', text: `Manuelle θe ${fmt(e.thetaEOverrideC, 0)} °C weicht ${fmt(Math.abs(e.thetaEOverrideC - alt), 0)} K vom Stationswert ab.`, pfad: 'gebaeude.standort.thetaE' });
  }

  const thetaMittelJahr = e.thetaMittelOverrideC !== undefined && Number.isFinite(e.thetaMittelOverrideC)
    ? override(e.thetaMittelOverrideC, '°C', `Jahresmittel ${fmt(e.thetaMittelOverrideC, 1)} °C manuell`)
    : jahresmittel(station, e.hoeheM, daten);

  const hgt = tabelle(station.hgt2012Kd, 'Kd', `HGT 20/12 ${fmt(station.hgt2012Kd, 0)} Kd der Station ${station.name} (SIA 2028-C1, Mittel 1984–2003)`, 'SIA 2028-C1:2015 Tabelle 6', { stufe: 'station' });

  const bezeichnung = `θe ${fmt(thetaE.wert, 0)} °C, Station ${station.name}${hk.korrekturK !== 0 ? ` (Höhenkorrektur ${fmt(hk.korrekturK, 0)} K)` : ''} (SIA 2028)`;
  return {
    station,
    stationsStufe: stufe,
    thetaE,
    thetaEStation,
    hoehenkorrektur,
    thetaMittelJahr,
    hgt,
    bezeichnung,
    annahmen: sammleAnnahmen(thetaE.herkunft === 'override' ? [thetaE, thetaMittelJahr] : [thetaEStation, hoehenkorrektur, thetaMittelJahr]),
    hinweise,
  };
}

/** Für UI-Listen: alle Stationen sortiert nach Name. */
export function stationenListe(daten: KlimaDaten): Station[] {
  return [...daten.stationen].sort((a, b) => a.name.localeCompare(b.name, 'de-CH'));
}

/** Eingabe-Konstruktor für Tests/Fixtures: fertige θe als Eingabe (z. B. Referenzhäuser mit −12 °C). */
export function thetaEEingabe(thetaC: number, begruendung = `Auslegungs-Aussentemperatur ${fmt(thetaC, 0)} °C (Eingabe)`): Wert {
  return eingabe(thetaC, '°C', begruendung);
}
