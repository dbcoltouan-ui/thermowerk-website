// Thermowerk Heizlast — Konstanten & FWS-Tabellen
// Quellen: FWS Modul 3 (1-2025), SIA 384/1:2022, SIA 385/1:2020, SIA 385/2
// Alle Werte sind Default-Vorlagen — der User kann jeden Wert in der UI überschreiben.

import type {
  Brennwert,
  Wirkungsgrad,
  VollaststundenZeile,
  BauperiodenZeile,
  SpezHeizleistungZeile,
  SanierungsMassnahme,
  WwStandard,
  SpeicherVerlustZeile,
  FstoZeile,
  WtFaustformelZeile,
  BivalenzZeile,
} from './types.ts';

// Brennwerte (§2)
export const BRENNWERTE: Record<string, Brennwert> = {
  oel:       { label: 'Heizöl EL',                   ho: 10.5, einheit: 'kWh/l',   verbrauchEinheit: 'l/a' },
  gas:       { label: 'Erdgas',                      ho: 10.4, einheit: 'kWh/m³',  verbrauchEinheit: 'm³/a' },
  hartholz:  { label: 'Hartholz (500–530 kg/Ster)',  ho: 2500, einheit: 'kWh/rm',  verbrauchEinheit: 'rm/a' },
  nadelholz: { label: 'Nadelholz (340–380 kg/Ster)', ho: 1800, einheit: 'kWh/rm',  verbrauchEinheit: 'rm/a' },
  pellets:   { label: 'Pellets',                     ho: 5.3,  einheit: 'kWh/kg',  verbrauchEinheit: 'kg/a' },
  elektro:   { label: 'Elektrospeicher',             ho: 1.0,  einheit: 'kWh/kWh', verbrauchEinheit: 'kWh/a' },
};

// Jahresnutzungsgrad-Vorschläge (§2)
export const WIRKUNGSGRADE: Wirkungsgrad[] = [
  { id: 'oel_gas_alt_mWW', label: 'Öl/Gas älter, MIT WW-Bereitung',  min: 0.70, max: 0.75, default: 0.73 },
  { id: 'oel_gas_alt_oWW', label: 'Öl/Gas älter, OHNE WW-Bereitung', min: 0.80, max: 0.85, default: 0.82 },
  { id: 'oel_gas_kond',    label: 'Öl/Gas kondensierend (neu)',      min: 0.85, max: 0.95, default: 0.90 },
  { id: 'holz_stueck_neu', label: 'Stückholz (neu)',                 min: 0.65, max: 0.75, default: 0.70 },
  { id: 'holz_stueck_alt', label: 'Stückholz (alt)',                 min: 0.45, max: 0.65, default: 0.55 },
  { id: 'holz_pellets',    label: 'Pellets',                         min: 0.65, max: 0.75, default: 0.70 },
  { id: 'elektrospeicher', label: 'Elektrospeicher',                 min: 0.95, max: 0.95, default: 0.95 },
];

// Vollbetriebsstunden tvoll (§3)
export const VOLLASTSTUNDEN: VollaststundenZeile[] = [
  { gebaeudetyp: 'wohnen_ohneWW',     lage: 'mittelland', tvoll: 2000, label: 'Wohngebäude, ohne WW, Mittelland' },
  { gebaeudetyp: 'wohnen_ohneWW',     lage: 'hoehe',      tvoll: 2300, label: 'Wohngebäude, ohne WW, ab 800 m ü. M.' },
  { gebaeudetyp: 'wohnen_mitWW',      lage: 'mittelland', tvoll: 2300, label: 'Wohngebäude, mit WW, Mittelland' },
  { gebaeudetyp: 'wohnen_mitWW',      lage: 'hoehe',      tvoll: 2500, label: 'Wohngebäude, mit WW, ab 800 m ü. M.' },
  { gebaeudetyp: 'gewerbe_absenkung', lage: 'mittelland', tvoll: 1900, label: 'Schulhaus/Industrie/Büro, Wochenendabsenkung, Mittelland' },
  { gebaeudetyp: 'gewerbe_absenkung', lage: 'hoehe',      tvoll: 2100, label: 'Schulhaus/Industrie/Büro, Wochenendabsenkung, ab 800 m ü. M.' },
];

// Spezifischer Heizwärmebedarf kWh/m²·a (§6, unsaniert, ohne WW)
export const BAUPERIODEN: BauperiodenZeile[] = [
  { id: 'vor1919',    label: 'vor 1919',     efh: [55, 125], mfh: [65, 115] },
  { id: '1919_45',    label: '1919–1945',    efh: [80, 135], mfh: [80, 120] },
  { id: '1946_60',    label: '1946–1960',    efh: [80, 140], mfh: [70, 115] },
  { id: '1961_70',    label: '1961–1970',    efh: [80, 145], mfh: [75, 120] },
  { id: '1971_80',    label: '1971–1980',    efh: [70, 125], mfh: [75, 115] },
  { id: '1981_85',    label: '1981–1985',    efh: [55, 105], mfh: [70, 105] },
  { id: '1986_90',    label: '1986–1990',    efh: [60, 95],  mfh: [65, 95]  },
  { id: '1991_95',    label: '1991–1995',    efh: [50, 90],  mfh: [60, 85]  },
  { id: '1996_00',    label: '1996–2000',    efh: [45, 85],  mfh: [55, 75]  },
  { id: '2001_05',    label: '2001–2005',    efh: [35, 80],  mfh: [55, 75]  },
  { id: '2006_10',    label: '2006–2010',    efh: [35, 75],  mfh: [45, 65]  },
  { id: '2011_heute', label: '2011–heute',   efh: [30, 45],  mfh: [30, 40]  },
];

// Spezifische Heizleistung W/m² (§7, Kontrollwerte)
export const SPEZ_HEIZLEISTUNG: SpezHeizleistungZeile[] = [
  { id: 'vor1919',    efh: [28, 63], mfh: [33, 58] },
  { id: '1919_45',    efh: [40, 68], mfh: [40, 60] },
  { id: '1946_60',    efh: [40, 70], mfh: [35, 58] },
  { id: '1961_70',    efh: [40, 73], mfh: [38, 60] },
  { id: '1971_80',    efh: [35, 63], mfh: [38, 58] },
  { id: '1981_85',    efh: [28, 53], mfh: [35, 53] },
  { id: '1986_90',    efh: [30, 48], mfh: [33, 48] },
  { id: '1991_95',    efh: [25, 45], mfh: [30, 43] },
  { id: '1996_00',    efh: [23, 43], mfh: [28, 38] },
  { id: '2001_05',    efh: [18, 40], mfh: [28, 38] },
  { id: '2006_10',    efh: [18, 38], mfh: [23, 33] },
  { id: '2011_heute', efh: [15, 23], mfh: [15, 20] },
];

// Sanierungsmassnahmen (§6)
export const SANIERUNGS_MASSNAHMEN: SanierungsMassnahme[] = [
  { id: 'fenster',     label: 'Fenstersanierung',            einsparung: [10, 20], default: 15 },
  { id: 'fassade',     label: 'Fassadendämmung',             einsparung: [25, 40], default: 32 },
  { id: 'estrich',     label: 'Estrichboden-/decke Dämmung', einsparung: [10, 15], default: 12 },
  { id: 'kellerdecke', label: 'Kellerdecke Dämmung',         einsparung: [8, 12],  default: 10 },
  { id: 'kwl',         label: 'KWL (Komfortlüftung)',        einsparung: [5, 10],  default: 7  },
];

// Nutzwarmwasserbedarf pro Person (§8.1, SIA 385/2)
export const WW_STANDARDS: WwStandard[] = [
  { gebaeudetyp: 'efh',   label: 'EFH / Eigentumswohnung, einfach',        vwu: 40 },
  { gebaeudetyp: 'efh',   label: 'EFH / Eigentumswohnung, mittel',         vwu: 45 },
  { gebaeudetyp: 'efh',   label: 'EFH / Eigentumswohnung, gehoben',        vwu: 55 },
  { gebaeudetyp: 'mfh',   label: 'MFH allgemeiner Wohnungsbau',            vwu: 35 },
  { gebaeudetyp: 'mfh',   label: 'MFH gehobener Wohnungsbau',              vwu: 45 },
  { gebaeudetyp: 'buero', label: 'Bürogebäude ohne Personalrestaurant',    vwu: 3  },
];

// Sperrzeiten-Korrekturfaktoren (§4, Tabelle)
export const SPERRZEIT_FAKTOREN: Record<number, number> = {
  0: 1.00, 1: 1.04, 2: 1.09, 3: 1.14, 4: 1.20,
  5: 1.26, 6: 1.33, 7: 1.41, 8: 1.50,
};

// WW-Speicherverluste Diagramm-Näherung (§8.2)
export const SPEICHER_VERLUSTE: SpeicherVerlustZeile[] = [
  { volumen: 200,  verlust: 1.5 },
  { volumen: 500,  verlust: 2.8 },
  { volumen: 800,  verlust: 3.3 },
  { volumen: 1000, verlust: 3.8 },
  { volumen: 1500, verlust: 4.3 },
  { volumen: 2000, verlust: 4.8 },
];

// fsto Faktoren (§10.2)
export const FSTO: FstoZeile[] = [
  { id: 'misch_kalt',  label: 'Mischzone + Kaltzone (innenlieg. WT)', faktor: 1.25 },
  { id: 'nur_misch',   label: 'Nur Mischzone (aussenliegender WT)',   faktor: 1.10 },
  { id: 'keine_zonen', label: 'Weder Misch- noch Kaltzone',           faktor: 1.00 },
];

// Wärmetauscherflächen-Faustformeln (§11.2)
export const WT_FAUSTFORMEL: WtFaustformelZeile[] = [
  { id: 'innen_mitWH',     label: 'Innen, mit Warmhaltung (65°C / 60°C)',  mPerKw: 0.65 },
  { id: 'innen_ohneWH_65', label: 'Innen, ohne Warmhaltung (65°C / 55°C)', mPerKw: 0.40 },
  { id: 'innen_ohneWH_60', label: 'Innen, ohne Warmhaltung (60°C / 55°C)', mPerKw: 0.65 },
  { id: 'aussen',          label: 'Aussen (FRIWA/Magroladung)',            mPerKw: 0.05 },
];

// Bivalenz-Deckungsgrad (§18)
export const BIVALENZ: BivalenzZeile[] = [
  { wpAnteil: 0.50, energieanteil: [80, 85] },
  { wpAnteil: 0.33, energieanteil: [50, 60] },
  { wpAnteil: 0.25, energieanteil: [30, 40] },
];

// Heizpuffer / Pufferspeicher (nicht FWS — SWKI BT 102-01, VDI 4645, Herstellerhandbücher)
export const HEIZPUFFER = {
  cp: 4.2,                         // kJ/(kg·K)
  abtauZeitMin: 5,                 // min typische Prozessumkehr
  abtauDeltaT: 5,                  // K zulässige Absenkung
  taktZeitMin: 6,                  // min Mindestlaufzeit Scrollverdichter
  taktDeltaT: 5,                   // K Temperaturhub Puffer
  errBand: [15, 25] as [number, number],  // l/kW
  typen: {
    lw_abtau: { label: 'L/W-WP mit Abtauung (Prozessumkehr)', braucht: ['abtau'],       empfehlung: [20, 25] as [number, number] },
    lw_ohne:  { label: 'L/W-WP ohne Abtauung',                braucht: ['takt', 'err'], empfehlung: [15, 20] as [number, number] },
    sw:       { label: 'S/W-WP (Sole)',                       braucht: ['takt', 'err'], empfehlung: [10, 15] as [number, number] },
    ww:       { label: 'W/W-WP (Grundwasser)',                braucht: ['takt', 'err'], empfehlung: [10, 15] as [number, number] },
  },
} as const;

// Physik-Konstanten
export const PHYSIK = {
  cp_wasser:    4.2,     // kJ/(kg·K)
  rho_wasser:   1.0,     // kg/l
  kJzukWh:      1 / 3600,
  t_kaltwasser: 10,      // °C (SIA 385/2)
  deltaT_ww:    50,      // K (10 → 60 °C)
} as const;
