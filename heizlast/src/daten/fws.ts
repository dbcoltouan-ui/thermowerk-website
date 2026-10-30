/**
 * Loader + Schema für `data/fws.json` und `data/hydraulik.json` (Session 3).
 *
 * Die Interfaces beschreiben die vom Kern genutzten Teile; `fwsDaten()` gibt das JSON ohne Cast
 * zurück, d. h. tsc prüft beim Build, dass die Datei zum Schema passt (zusätzlich zu den
 * Vitest-Schema-Tests in tests/daten/). Der Kern liest nie selbst Dateien, er bekommt diese
 * Objekte als Parameter (KONTEXT §2 «Eine Quelle der Wahrheit», «Daten»).
 */
import fwsJson from '@data/fws.json';
import hydraulikJson from '@data/hydraulik.json';

export type Band = [number, number];

export interface Quelle {
  id: string;
  titel: string;
  art?: string;
  url?: string;
  fundort?: string;
  datum?: string;
  abgerufen?: string;
}

export interface Meta {
  version: string;
  stand: string;
  beschreibung?: string;
  quellen: Quelle[];
}

export interface TvollBedarfsart {
  label: string;
  mittelland: number;
  ab800m: number;
}

export interface HeizwertTraeger {
  label: string;
  einheit: string;
  kwhProEinheit: number;
  bezug?: string;
  spanne?: number[];
  unsicherheitProzent?: number;
}

export interface EtaPreset {
  key: string;
  label: string;
  min: number;
  max: number;
  typ: number;
  kurs?: number;
  kursHinweis?: string;
  hinweis?: string;
}

export interface BauperiodeEintrag {
  key: string;
  label: string;
  von: number | null;
  bis: number | null;
  kwhM2a: { efh: number[]; mfh: number[] };
  wM2: { efh: number[]; mfh: number[] };
}

export interface SanierungsMassnahme {
  key: string;
  label: string;
  min: number;
  max: number;
  typ: number | null;
  bauteile: string[];
  kursHinweis?: string;
}

export interface WwBedarfEintrag {
  key: string;
  gebaeudeart: string;
  standard: string;
  literProPersonTag: number;
  default: boolean;
}

export interface ProzentBand {
  min: number;
  max: number;
  typ: number;
  hinweis?: string;
}

export interface FwsDaten {
  _meta: Meta;
  tvoll: {
    hoehenschwelleM: number;
    bedarfsarten: Record<string, TvollBedarfsart>;
    fundstelle: string;
  };
  heizwerte: {
    konventionen: Record<string, { label: string; default: boolean; traeger: Record<string, HeizwertTraeger> }>;
    etaPresets: Record<string, EtaPreset[] | string>;
    etaBezugHinweis: string;
    fundstelle: string;
  };
  verbrauch: {
    mindestJahreEmpfohlen: number;
    maxJahreEmpfohlen: number;
    lueckeHinweisAbTagen: number;
    streuung: { mindestTageJeEintrag: number; mindestHgtAnteil: number; gelbAbProzent: number; rotAbProzent: number };
  };
  klimabereinigung: { defaultAktiv: boolean; faktorPlausibelMin: number; faktorPlausibelMax: number };
  sperrzeit: { toffMaxH: number; faktorTabelle: Record<string, number>; fundstelle: string };
  bauperioden: {
    perioden: BauperiodeEintrag[];
    minergie: { wM2: { minergieP: number[] } };
    fundstelle: string;
  };
  sanierungen: { massnahmen: SanierungsMassnahme[]; fundstelle: string };
  warmwasser: {
    deltaTNutzK: number;
    cpKjKgK: number;
    bedarfProPersonLiterTag: { werte: WwBedarfEintrag[] };
    personenbelegung: { a0M2: number; stuetzpunkte: { anfM2: number; personen: number }[] };
    verluste: {
      speicher: {
        ohneVolumen: ProzentBand;
        ausVolumen: { deltaThetaK: number; stuetzpunkte: { liter: number; kwhTag: number }[]; naeherung: string };
      };
      leitungen: {
        rohrAnRohrKwhProMeterTag: number;
        separatKwhProMeterTag: number;
        laengeUnbekanntProzent: ProzentBand;
        warmhaltebandProzent: number;
        keineZirkulationProzent: number;
      };
      ausstoss: ProzentBand;
    };
    leistungszuschlag: { warnungTdAbH: number; kursbeispiel: { qhlKW: number; qwwKwhTag: number; tdH: number; qwKW: number } };
    wwBisherUeberHeizung: { tageProJahr: number };
    fundstelle: string;
  };
  speicherWarmwasser: {
    tKaltwasserC: number;
    fSto: { key: string; label: string; wert: number; default?: boolean }[];
    spitzendeckung: { anteilVwuMax: number };
    empfehlungen: { efh: { literTypisch: number; ladetemperaturC: number }; mfh: { ladezyklenProTag: number[] } };
    marktrundungLiter: number[];
    fundstelle: string;
  };
  puffer: {
    kriterien: {
      luftWasser: {
        abtau: { empfehlungLiterProKw: number[]; literProKwMin: number };
        takt: { empfehlungLiterProKw: number[]; literProKwMin: number };
        sperrzeit: { literProKwMin: number; literProKwMax: number; empfehlungLiterProKw: number[] };
        err: { trennpufferLiter: number[] };
      };
      soleWasser: {
        fbhOhneErr: { literProKw: number; hinweis?: string };
        hkMitErr: { literProKw: number; art?: string };
        sperrzeit: { literProKw: number };
      };
      wasserWasser: { literProKw: number; hinweis?: string };
    };
    marktrundungLiter: number[];
    fundstelle: string;
  };
  bivalenz: { tabelle: { leistungsanteilWP: number; energieanteilWP: number[] }[]; fundstelle: string };
  /** Dimensionierungs-Ampel + Gerätefilter Wärmepumpe (Session 6). */
  geraetewahl: { inverterMinVerhaeltnis: number; rotAbUebergroesseProzent: number; knappGelbBis: number; filterToleranzUntenProzent: number; fundstelle: string; hinweise: string[] };
  plausibilitaet: {
    normReserveProzent: number[];
    qhlNormMinusVerbrauchErwartungProzent: number[];
    bandToleranzProzent: number;
    vergleichNormVerbrauch: { gelbBisProzent: number };
  };
  methodeB: {
    entzugsleistungAmpelWProM: { gruenBis: number; gelbBis: number };
    kursbeispiel: { zaehlerH: number; jahre: number; qWpKW: number; cop: number; qnKwhA: number; qhlKW: number; qkKW: number; sondeM: number; entzugWProM: number };
  };
  /** Energiebezugsfläche aus Nettowohnfläche (Folie 33–35), Session 4. */
  ebf: { beschreibung: string; faktorNwfZuEbf: { typ: number; spanne: number[] }; fundstelle: string };
}

export interface HydraulikDaten {
  _meta: Meta;
  mag: {
    ausdehnungsfaktor: { befuelltemperaturC: number; stuetzpunkte: { tVlMaxC: number; nProzent: number }[] };
    anlageninhaltLiterProKw: { werte: Record<string, number> };
    wasservorlage: { anteil: number; minimumLiter: number; anteilKleinesMag: number; kleinesMagBisLiter: number };
    druckDefaults: { p0Bar: number; pSvBar: number; peAbstandZuSvBar: number; p0ZuschlagBar: number };
    nennvolumenReiheLiter: { werte: number[] };
    kontrollbeispiel: { qhlW: number; pufferLiter: number; wwSpeicherLiter: number; tVlMaxC: number; vaLiter: number; veLiter: number; vvLiter: number; vnMinLiter: number; vnMarktLiter: number };
  };
  sicherheitsventil: {
    ansprechdruckBar: number;
    stufen: { bisKw: number; dn: string; anschluss: string; ausblaseleitung: string }[];
  };
}

/** Fachdaten FWS-Modus (data/fws.json). */
export function fwsDaten(): FwsDaten {
  return fwsJson;
}

/** Hydraulik-Daten MAG/Sicherheitsventil (data/hydraulik.json). */
export function hydraulikDaten(): HydraulikDaten {
  return hydraulikJson;
}
