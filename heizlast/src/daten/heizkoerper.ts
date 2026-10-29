/**
 * Loader + Schema für `data/heizkoerper-tabellen.json` (Wärmeabgabe; Session 2, erweitert Session 5 um `auslegung`).
 * `heizkoerperDaten()` gibt das JSON ohne Cast zurück (tsc prüft das Schema beim Build). Beschrieben ist nur,
 * was der Kern liest; weitere Felder (Belege, Kontrolltabellen) bleiben im JSON für Tests und Bericht.
 */
import hkJson from '@data/heizkoerper-tabellen.json';
import type { Meta } from './fws';

export interface HkBauartDaten {
  key: string;
  label: string;
  kategorie: string;
  n: number;
  tiefeTypMm?: number[];
  gliedbreiteMm?: number;
  saeulen?: number;
  quelleExponent?: string[];
  exponentHinweis?: string;
}

export interface GliedZeile {
  bauhoeheMm: number;
  nabenabstandMm: number;
  tiefeMm: number;
  w7565: number;
  w7055: number;
  w5545: number;
}

export interface KontecZeile {
  typ: string;
  tiefeMm: number;
  hoeheMm: number;
  wProM7565: number;
  n: number;
}

export interface BadZeile {
  hoeheMm: number;
  breiteMm: number;
  w7565: number;
}

/** Bodenbeläge mit typischem Wärmeleitwiderstand Rλ,B (fbh.rlbTypisch). */
export type FbhBelag = 'keramik' | 'pvc_linoleum' | 'parkett' | 'laminat' | 'teppich' | 'teppichDick';

export interface HkModell {
  id: string;
  hersteller: string;
  modellreihe: string;
  bauart: string;
  quelle: string[];
  quelleSeite?: string;
  stand?: string;
  abgeleitet: boolean;
  abgeleitetHinweis?: string | null;
  hoeheMm?: number;
  tiefeMm?: number;
  gliedbreiteMm?: number;
  n?: number;
  wProM7565?: number;
  wProElement7565JeHoehe?: Record<string, number>;
  wProMBreite7565?: Record<string, number>;
  wJeHoeheBreite7565?: Record<string, number> | Record<string, Record<string, number>>;
  wJeBreiteHoehe7565?: Record<string, Record<string, number>>;
}

export interface HkDaten {
  _meta: Meta & { referenzbedingung: { tVL: number; tRL: number; tInt: number; dTlog: number }; konvention: string };
  bauarten: HkBauartDaten[];
  exponenten: { beschreibung: string; quelle: string[]; werte: Record<string, number>; bereichGueltig: number[] };
  umrechnung: { faktor9070Zu7565: { n1_3: number; hinweis: string } };
  platten: { beschreibung: string; quelle: string[]; hoehenMm: number[]; wProM7565: Record<string, Record<string, number>> };
  glieder: { quelle: string[]; guss: { gliedbreiteMm: number; werte: GliedZeile[] }; stahl: { gliedbreiteMm: number; werte: GliedZeile[] } };
  roehren: {
    quelle: string[];
    charleston: { gliedbreiteMm: number; tiefeMmJeSaeulen: Record<string, number>; wProElement7565: Record<string, Record<string, number>> };
  };
  konvektoren: {
    quelle: string[];
    wandkonvektorVerkleidet: { hersteller: string; werte: KontecZeile[] };
    lamellenpaket: { hersteller: string; n: number; wProM7565und5545: Record<string, Record<string, number[]>> };
  };
  bad: { quelle: string[]; kermiBasicD: BadZeile[] };
  vertikal: { quelle: string[]; stelradVertex: { wProMBreite: Record<string, Record<string, number>> } };
  fbh: {
    quelle: string[];
    verlegeabstandMm: number[];
    rlbStufen: string[];
    dThStufenK: number[];
    qWm2: Record<string, Record<string, number[]>>;
    rlbTypisch: Record<FbhBelag | 'planungWohnen' | 'planungBad', number>;
    grenzwerte: { qMaxAufenthaltWm2: number; thetaFmaxAufenthaltC: number };
  };
  wandheizung: { quelle: string[]; wemKlimaelement: Record<string, number>; wemKlimaregister: Record<string, number>; fallbackQ3528Wm2: number; fallbackHinweis: string };
  minderungen: {
    quelle: string[];
    f1Nische: { mProzentTyp: number };
    f2Verkleidung: { mProzent: Record<string, number[]>; mProzentTyp: number };
    f3Oberflaeche: { mProzentTyp: number };
    f4Baulaenge: { stufen: { bisMm: number; mProzent: number }[] };
    f5Anschluss: { stufen: { spreizungK: number; wechselseitig: number; reitend: number }[] };
  };
  ampel: { quelle: string[]; deckung: { gruenAb: number; gelbAb: number }; vorlaufC: { gutBis: number; kritischBis: number }; starkUeberdimensioniertAb: number };
  auslegung: {
    quelle: string[];
    spreizungDefaultK: { radiator: number; flaeche: number };
    zielVLDefaultC: number;
    vlSuchbereichC: number[];
    hoeheEinrastenToleranzMm: number;
    unsicherheitProzent: { typenschild: number; modell: number; tabelle: number; extrapoliert: number; standardMass: number; heizkurve: number; verteilungNachFlaeche: number };
    gussTiefeDefaultMm: number;
    fbhDefault: { verlegeabstandMm: number; rlb: number; rlbBad: number };
    konvektorEinbauDefault: string;
    hinweis: string;
    /** Auslegungs-VL ohne bewertete Heizflächen je Wärmeabgabesystem (Session 6, Fachentscheid Daniel). */
    standardVLJeSystemC: { fbh: number; radiatoren: number; gemischt: number };
    standardVLHinweis: string;
  };
  modelle: HkModell[];
}

/** Heizflächen-Tabellen (data/heizkoerper-tabellen.json). */
export function heizkoerperDaten(): HkDaten {
  return hkJson;
}
