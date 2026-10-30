/**
 * Loader + Schema für `data/sia384-2.json` (raumweise Norm-Heizlast SIA 384/2:2020; Session 2, erweitert Session 4).
 * `siaDaten()` gibt das JSON ohne Cast zurück (tsc prüft das Schema beim Build).
 */
import siaJson from '@data/sia384-2.json';
import type { Meta } from './fws';

export type Lueftungskonzept = 'natuerlich' | 'wrg' | 'lufterwaermung' | 'abluftDauer';
export type Dichtheit = 'neubau' | 'altbau';
export type NminRaumtyp = 'ohneAussenbezug' | 'badDusche' | 'weitere' | 'mitZuluft' | 'ohneZuluftDurchstroemt';
export type BuLage = 'seitlich' | 'keller' | 'estrich';
export type BuFlaechen = 'eineFlaeche' | 'zweiFlaechen' | 'mehrFlaechen';

export interface BuTabelle {
  label: string;
  eineFlaeche: { dicht: number; undicht: number };
  zweiFlaechen: { dicht: number; undicht: number };
  mehrFlaechen: { dicht: number; undicht: number };
}

export interface RaumtypDaten {
  key: string;
  label: string;
  thetaIntC: number;
  beheizt: boolean;
  hinweis?: string;
}

export interface Sia3842Daten {
  _meta: Meta;
  methode: {
    beschreibung: string;
    quelle: string[];
    luftWaermekapazitaetWhM3K: number;
    keinInfiltrationsterm: boolean;
    keinWiederaufheizzuschlag: boolean;
    gebaeudeHeizlastSaldiert: boolean;
    hoheRaeumeAbM: number;
    hoheRaeumeHinweis: string;
    bezeichnungBericht: string;
  };
  nMin: {
    beschreibung: string;
    quelle: string[];
    lueftungskonzepte: { key: string; kurz: string; label: string; default?: boolean }[];
    raumtypen: { key: string; label: string }[];
    tabelle: Record<string, Record<string, { neubau: number; altbau: number }>>;
    zuordnungRaumtypZuNmin: Record<string, string | string[]>;
    altbauKriterium: string;
  };
  bU: {
    beschreibung: string;
    quelle: string[];
    tabelleND3: {
      seitlich: BuTabelle;
      keller: BuTabelle;
      estrich: { label: string; eineFlaeche: { dicht: number; undicht: number } };
      dichtKriterium: string;
    };
    defaults: {
      beschreibung: string;
      quelle: string[];
      kellerUnbeheizt: number;
      kellerUnbeheiztHinweis: string;
      dachraumUnbeheizt: number;
      dachraumUnbeheiztHinweis: string;
      garageUnbeheizt: number;
      garageUnbeheiztHinweis: string;
      treppenhausUnbeheizt: number;
      treppenhausUnbeheiztHinweis: string;
      nachbarBeheiztGleich: number;
      aussenluft: number;
    };
  };
  deltaUWb: {
    beschreibung: string;
    quelle: string[];
    werte: { key: string; label: string; deltaU: number; default?: boolean }[];
  };
  rsiRse: {
    rsi: Record<string, number>;
    rseAussen: number;
    rseErdreich: number;
    rsiFussbodenheizung: number;
    luftschichtRuhend: { aufwaerts: Record<string, number>; horizontal: Record<string, number>; abwaerts: Record<string, number> };
  };
  erdreich: {
    beschreibung: string;
    quelle: string[];
    formelBStrich: string;
    uEquivBodenplatteZ0: { rfStufen: number[]; bStrichM: number[]; werte: Record<string, number[]>; kontrollbeispiel: string };
    fThetaAnn: number;
    fGw: { default: number; grundwasserNah: number; kriterium: string };
    lambdaErdreichWmK: { default: number; tonLehm: number; sandKies: number; quelle: string[] };
    einfacheRegel: { beschreibung: string; quelle: string[]; tiefeGrenzeM: number };
    formelIso13370: { wandDickeDefaultM: number; rsiAbwaerts: number; rseErdreichOberflaeche: number; bStrichMinM: number; bStrichDefaultM: number; bStrichDefaultHinweis: string; quelle: string[] };
    faktoren: { fG1: number; fG2Formel: string; quelle: string[]; beschreibung: string };
  };
  innentemperaturen: {
    beschreibung: string;
    quelle: string[];
    raumtypen: RaumtypDaten[];
  };
  plausibilitaet: {
    normReserveGegenVerbrauchProzent: number[];
    innentransmissionAnteilMax: number;
    hinweisSaldierung: string;
  };
}

/** SIA-384/2-Tabellen (data/sia384-2.json). */
export function siaDaten(): Sia3842Daten {
  return siaJson;
}
