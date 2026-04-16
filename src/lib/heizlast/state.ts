// Thermowerk Heizlast — State-Management via Nano Stores
// --------------------------------------------------------------
// Zentrale Datenquelle für den Heizlastrechner. Die UI liest und schreibt
// ausschliesslich hier; storage.ts persistiert in localStorage; projects.ts
// synchronisiert mit Sanity; compute.ts liefert abgeleitete Rechenergebnisse.
//
// Entwurfs-Prinzipien:
// - Ein einziger `map`-Store (`heizlastState`) hält den kompletten Eingabe-State.
//   Das Objekt ist JSON-serialisierbar (Sanity stateJson + localStorage).
// - Für jede Sektion eine klar abgegrenzte Sub-Struktur (gebaeude, heizlast,
//   warmwasser, zuschlaege, speicher). Projekt-Metadata (Name, Kunde, …) auf
//   der Top-Ebene.
// - `version` ist der Migrations-Anker. Bei inkompatiblen Änderungen wird sie
//   hochgezählt und storage.ts führt beim Laden die Migration durch.
// - Override-Felder: `null` = Default (aus Konstanten/Berechnung) verwenden,
//   konkrete Zahl = manuell überschrieben.
// - Optionale Module (M4 Sanierung, M3 Plausi, Qas, …) via `*Active: boolean`.

import { map, atom, computed } from 'nanostores';
import type { Gebaeudetyp, Lage, TvollProfil } from './types.ts';

// ---------------------------------------------------------------
// Typen
// ---------------------------------------------------------------

/** Aktuelle State-Version. Bei breaking changes hochzählen + Migration in storage.ts ergänzen. */
export const STATE_VERSION = 1 as const;

export type HeizlastMethod =
  | 'verbrauch'
  | 'messung'
  | 'bstd'
  | 'bauperiode'
  | 'override';

export type WarmwasserMethod = 'personen' | 'direkt' | 'messung';

export type PufferMethod = 'abtau' | 'takt' | 'err' | 'sperrzeit';

export type ProjektStatus =
  | 'arbeit'
  | 'offeriert'
  | 'bestellt'
  | 'abgeschlossen'
  | 'archiv';

export interface SanierungsMassnahme {
  id: string;
  label: string;
  einsparungProzent: number; // 0–100
}

export interface PersonenEinheitInput {
  anf: number; // m²
  vwui: number; // l/P/d
}

export interface GebaeudeState {
  typ: Gebaeudetyp;
  lage: Lage;
  bauperiode: string; // ID aus constants.BAUPERIODEN
  ebf: number; // m²
  wohneinheiten: number;
  tvollProfil: TvollProfil;
  /** Override der Vollbetriebsstunden. null = Richtwert aus tvollRichtwert verwenden. */
  tvollOverride: number | null;
}

export interface VerbrauchState {
  energietraeger: string; // ID aus constants.BRENNWERTE
  ba: number; // Verbrauch in Einheit des Trägers (l/a, m³/a, kg/a, kWh/a, …)
  /** null = Default-η aus Wirkungsgrad-Tabelle. */
  etaOverride: number | null;
  etaWirkungsgradId: string | null; // null = manuelle Eingabe
  inklWW: boolean;
  vwuAbzug: number; // l/d, nur relevant wenn inklWW=true
}

export interface MessungState {
  qnPerJahr: number; // kWh/a
}

export interface BstdState {
  stundenGesamt: number;
  jahre: number;
  qhWP: number; // kW
}

export interface OverrideMethodState {
  qhl: number; // kW
}

export interface HeizlastSectionState {
  method: HeizlastMethod;
  verbrauch: VerbrauchState;
  messung: MessungState;
  bstd: BstdState;
  override: OverrideMethodState;

  /** M4: multiplikatives Sanierungs-Delta */
  sanierungActive: boolean;
  sanierungMassnahmen: SanierungsMassnahme[];

  /** M3: Plausibilitäts-Kontrolle W/m² */
  plausiActive: boolean;
}

export interface WarmwasserState {
  active: boolean;
  method: WarmwasserMethod;
  personen: PersonenEinheitInput[];
  direkt: { vwuPerTag: number };
  messung: { qwwTagKWh: number };
  /** Override für ΔT Kaltwasser→Warmwasser. null = Physik-Default (45 K). */
  deltaTOverride: number | null;
  /** Verluste in %. null = nicht berücksichtigen. */
  speicherProzent: number | null;
  zirkProzent: number | null;
  ausstossProzent: number | null;
}

export interface ZuschlaegeState {
  toff: number; // h Sperrzeit
  qasActive: boolean;
  qas: number; // kW Abtau-/Sonderzuschlag
}

export interface SpeicherState {
  wwActive: boolean;
  wwTStoAus: number; // °C
  wwTStoEinOverride: number | null; // null = PHYSIK.t_kaltwasser
  wwRundungLiter: 5 | 10;

  pufferActive: boolean;
  pufferMethod: PufferMethod;
  pufferTAbtauMin: number; // Minuten
  pufferTTaktMin: number; // Minuten
  pufferDeltaT: number; // K
  pufferErrBand: [number, number]; // l/kW Herstellerband
  pufferRundungLiter: 5 | 10;
}

export interface HeizlastState {
  version: typeof STATE_VERSION;

  // Projekt-Metadata (Top-Level, damit flach serialisierbar)
  projectId: string | null;
  projectName: string;
  customerName: string;
  address: string;
  notes: string;
  status: ProjektStatus;
  createdAt: string | null; // ISO
  updatedAt: string | null; // ISO

  gebaeude: GebaeudeState;
  heizlast: HeizlastSectionState;
  warmwasser: WarmwasserState;
  zuschlaege: ZuschlaegeState;
  speicher: SpeicherState;
}

// ---------------------------------------------------------------
// Default-State — „leerer" neuer Rechner
// ---------------------------------------------------------------

export function createDefaultState(): HeizlastState {
  return {
    version: STATE_VERSION,

    projectId: null,
    projectName: '',
    customerName: '',
    address: '',
    notes: '',
    status: 'arbeit',
    createdAt: null,
    updatedAt: null,

    gebaeude: {
      typ: 'efh',
      lage: 'mittelland',
      bauperiode: '1971_80',
      ebf: 180,
      wohneinheiten: 1,
      tvollProfil: 'wohnen_mitWW',
      tvollOverride: null,
    },

    heizlast: {
      method: 'verbrauch',
      verbrauch: {
        energietraeger: 'oel',
        ba: 3200,
        etaOverride: null,
        etaWirkungsgradId: 'oel_bestand',
        inklWW: true,
        vwuAbzug: 200,
      },
      messung: { qnPerJahr: 18000 },
      bstd: { stundenGesamt: 6000, jahre: 3, qhWP: 8.5 },
      override: { qhl: 10 },

      sanierungActive: false,
      sanierungMassnahmen: [],

      plausiActive: true,
    },

    warmwasser: {
      active: true,
      method: 'personen',
      personen: [{ anf: 120, vwui: 40 }],
      direkt: { vwuPerTag: 160 },
      messung: { qwwTagKWh: 8.5 },
      deltaTOverride: null,
      speicherProzent: 10,
      zirkProzent: null,
      ausstossProzent: null,
    },

    zuschlaege: {
      toff: 2,
      qasActive: false,
      qas: 0,
    },

    speicher: {
      wwActive: true,
      wwTStoAus: 60,
      wwTStoEinOverride: null,
      wwRundungLiter: 10,

      pufferActive: true,
      pufferMethod: 'abtau',
      pufferTAbtauMin: 5,
      pufferTTaktMin: 6,
      pufferDeltaT: 5,
      pufferErrBand: [15, 25],
      pufferRundungLiter: 10,
    },
  };
}

// ---------------------------------------------------------------
// Stores
// ---------------------------------------------------------------

/** Haupt-Store: kompletter Eingabe-State (serialisierbar). */
export const heizlastState = map<HeizlastState>(createDefaultState());

/** UI-Metadaten, die nicht persistiert werden (Modals, gerade aktive Sektion, …). */
export interface UiState {
  authModalOpen: boolean;
  exportModalOpen: boolean;
  projectsModalOpen: boolean;
  /** Ist der aktuelle User via Cookie authentifiziert? Wird beim Laden geprüft. */
  isAuthenticated: boolean;
  /** Letzte Speicherung an localStorage (Timestamp ms). */
  lastLocalSave: number | null;
  /** Letzte Speicherung in Cloud (Sanity). */
  lastCloudSave: number | null;
  /** True, solange Netzwerk-Requests laufen. */
  syncInFlight: boolean;
  /** Fehlermeldung vom letzten Sync-Versuch. null = kein Fehler. */
  lastError: string | null;
}

export const uiState = map<UiState>({
  authModalOpen: false,
  exportModalOpen: false,
  projectsModalOpen: false,
  isAuthenticated: false,
  lastLocalSave: null,
  lastCloudSave: null,
  syncInFlight: false,
  lastError: null,
});

/** Gibt true zurück wenn seit der letzten Speicherung Änderungen gemacht wurden. */
export const isDirty = atom<boolean>(false);

// ---------------------------------------------------------------
// Helper: granulare Setter für geschachtelte Felder
// ---------------------------------------------------------------

/**
 * Setzt einen Teilbereich des State atomar. Beispiel:
 *   updateSection('gebaeude', { ebf: 150 })
 * Alle nicht übergebenen Felder bleiben unberührt.
 */
export function updateSection<K extends keyof HeizlastState>(
  key: K,
  patch: Partial<HeizlastState[K]>,
): void {
  const current = heizlastState.get()[key];
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    heizlastState.setKey(key, { ...(current as object), ...patch } as HeizlastState[K]);
  } else {
    heizlastState.setKey(key, patch as HeizlastState[K]);
  }
  isDirty.set(true);
}

/** Setzt ein einzelnes Top-Level-Feld (projectName, status, …). */
export function setField<K extends keyof HeizlastState>(key: K, value: HeizlastState[K]): void {
  heizlastState.setKey(key, value);
  isDirty.set(true);
}

/** Ersetzt den kompletten State (z. B. beim Laden eines Projekts). */
export function replaceState(next: HeizlastState): void {
  heizlastState.set(next);
  isDirty.set(false);
}

/** Setzt den State auf die Default-Werte zurück (neues Projekt). */
export function resetState(): void {
  heizlastState.set(createDefaultState());
  isDirty.set(false);
}

// ---------------------------------------------------------------
// Projektliste (nur im Speicher, wird bei Bedarf geladen)
// ---------------------------------------------------------------

export interface ProjectListItem {
  _id: string;
  projectName: string;
  customerName?: string;
  address?: string;
  qhl?: number | null;
  qh?: number | null;
  ebf?: number | null;
  status?: ProjektStatus;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}

/** Cloud-Projektliste (nach Login geladen). Leer = noch nicht geladen oder keine Projekte. */
export const projectList = atom<ProjectListItem[]>([]);
export const projectListLoaded = atom<boolean>(false);

// ---------------------------------------------------------------
// Abgeleitete Kennzahlen (werden von compute.ts gesetzt)
// ---------------------------------------------------------------

/** Tvoll-Effektivwert = Override falls gesetzt, sonst Richtwert. */
export const tvollEffektiv = computed(heizlastState, (s) => {
  if (s.gebaeude.tvollOverride != null) return s.gebaeude.tvollOverride;
  // Lazy import, damit state.ts keine Abhängigkeit zu constants im Browser-Bundle hat
  // (wird nur evaluiert wenn benötigt):
  return tvollLookup(s.gebaeude.tvollProfil, s.gebaeude.lage);
});

// lokale Lookup-Funktion (spiegelt calculations.tvollRichtwert, aber synchron)
import { VOLLASTSTUNDEN } from './constants.ts';
function tvollLookup(profil: TvollProfil, lage: Lage): number {
  const row = VOLLASTSTUNDEN.find((r) => r.gebaeudetyp === profil && r.lage === lage);
  return row ? row.tvoll : 2000;
}
