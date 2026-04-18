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
export const STATE_VERSION = 2 as const;

/**
 * Phase 9 / Block B — Methodenwahl ist weggefallen. Statt einer Enum gibt es jetzt
 * einen Record `methodsEnabled`, in dem der User jede verfügbare Methode einzeln
 * ein- oder ausschalten kann. `bauperiode` ist IMMER als Fallback aktiv und liegt
 * deshalb NICHT im Record. Die Compute-Hierarchie (siehe compute.ts) arbeitet die
 * eingeschalteten Methoden in fester Reihenfolge ab: override → bstd → messung →
 * verbrauch → bauperiode.
 */
export interface HeizlastMethodsEnabled {
  verbrauch: boolean;
  messung: boolean;
  bstd: boolean;
  override: boolean;
}

// ============================================================================
// Perioden-Modell (Phase 10 / Paket B — neu)
// ============================================================================

/**
 * Datumsbereich einer Messperiode.
 * - `vonDatum` inklusiv (00:00 dieses Tages), `bisDatum` exklusiv.
 * - ISO-Format YYYY-MM-DD (keine Zeitzone — CH lokal).
 */
export interface DatumsRange {
  vonDatum: string; // '2024-01-01'
  bisDatum: string; // '2025-01-01'
}

export interface VerbrauchPeriode extends DatumsRange {
  id: string;
  /** Brennstoff/Energie-Menge in der Einheit des Energieträgers. */
  wert: number;
  /** Optionale User-Notiz. */
  notiz?: string;
}

export interface MessungPeriode extends DatumsRange {
  id: string;
  /** Gemessene Nutzenergie in kWh — absolut für die Periode, nicht annualisiert. */
  wertKWh: number;
  notiz?: string;
}

export interface BstdPeriode extends DatumsRange {
  id: string;
  /** Aufgelaufene Betriebsstunden (Differenz, nicht kumuliert). */
  stunden: number;
  notiz?: string;
}

/**
 * Zeitpunkt einer Sanierung:
 * - 'vergangen'  — bereits umgesetzt. Falls in einer Messperiode, wird der
 *   Messwert rekonstruiert (compute.ts § 3.2).
 * - 'geplant'    — kommt noch. Reduziert Qhl klassisch multiplikativ.
 */
export type SanierungsZeitpunkt = 'vergangen' | 'geplant';

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
  /** Phase 10 / Paket B. YYYY-MM-DD. null → als 'geplant' behandelt. */
  datum: string | null;
  /** Phase 10 / Paket B. Default 'geplant'. */
  zeitpunkt: SanierungsZeitpunkt;
}

export interface PersonenEinheitInput {
  anf: number; // m²
  vwui: number; // l/P/d
}

/** Einzelnes Zimmer im EBF-Helper. Flaeche wird aus Laenge x Breite berechnet,
 *  oder direkt als Flaeche eingegeben (flaecheDirekt, Phase 9 / Block E).
 *  `beheizt` steuert, ob die Flaeche in die Netto-EBF einfliesst (true) oder
 *  nur separat ausgewiesen wird (false). */
export interface RaumInput {
  id: string;
  name: string;
  laenge: number | null; // m
  breite: number | null; // m
  /** Phase 9 / Block E — wenn gesetzt, Vorrang vor laenge x breite. */
  flaecheDirekt: number | null; // m^2
  /** Phase 9 / Block E — wenn false, Flaeche NICHT in Netto-EBF-Summe. */
  beheizt: boolean;
  /** Legacy (Phase 4) — bleibt erhalten fuer alte gespeicherte States,
   *  kuenftig ersetzt durch flaecheDirekt. */
  flaecheOverride: number | null;
}

export interface GebaeudeState {
  typ: Gebaeudetyp;
  lage: Lage;
  bauperiode: string; // ID aus constants.BAUPERIODEN
  ebf: number; // m²
  tvollProfil: TvollProfil;
  /** Override der Vollbetriebsstunden. null = Richtwert aus tvollRichtwert verwenden. */
  tvollOverride: number | null;
  /** EBF-Helper: Zimmer-Liste. Summe der Flächen kann in `ebf` übernommen werden. */
  raeume: RaumInput[];
  /** True, wenn EBF automatisch aus der Zimmer-Liste gespeist wird (live Summe). */
  raeumeAktiv: boolean;
}

export interface VerbrauchState {
  energietraeger: string; // ID aus constants.BRENNWERTE
  /** Legacy-Fallback: greift nur wenn `perioden.length === 0`. */
  ba: number; // Verbrauch in Einheit des Trägers (l/a, m³/a, kg/a, kWh/a, …)
  /** null = Default-η aus Wirkungsgrad-Tabelle. */
  etaOverride: number | null;
  etaWirkungsgradId: string | null; // null = manuelle Eingabe
  inklWW: boolean;
  vwuAbzug: number; // l/d, nur relevant wenn inklWW=true
  /** Phase 10 / Paket B. Leer = Einzelwert aus `ba` wird verwendet. */
  perioden: VerbrauchPeriode[];
}

export interface MessungState {
  /** Legacy-Fallback. */
  qnPerJahr: number; // kWh/a
  /** Phase 10 / Paket B. */
  perioden: MessungPeriode[];
}

export interface BstdState {
  /** Legacy-Fallback. */
  stundenGesamt: number;
  jahre: number;
  qhWP: number; // kW
  /** Phase 10 / Paket B. Stunden-Zuwachssumme pro Abschnitt (keine kumulierten Zähler). */
  perioden: BstdPeriode[];
}

export interface OverrideMethodState {
  qhl: number; // kW
}

export interface HeizlastSectionState {
  methodsEnabled: HeizlastMethodsEnabled;
  verbrauch: VerbrauchState;
  messung: MessungState;
  bstd: BstdState;
  override: OverrideMethodState;

  /** M4: multiplikatives Sanierungs-Delta */
  sanierungActive: boolean;
  sanierungMassnahmen: SanierungsMassnahme[];

  /** M3: Plausibilitäts-Kontrolle W/m² — Phase 9 / Block H: always-on, Feld bleibt als Legacy. */
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
  /** Phase 9 / Block D — Ja/Nein-Schalter. Nur wenn true wird Qoff gerechnet
   *  und das toff-Feld in der UI sichtbar. */
  sperrzeitActive: boolean;
  toff: number; // h Sperrzeit (nur wirksam wenn sperrzeitActive === true)
  /** Legacy seit Phase 9 / Block D — Wert wird nicht mehr als Gate genutzt.
   *  Qas wird automatisch addiert, sobald `qas > 0`. Feld bleibt aus
   *  Migrations-Gruenden erhalten. */
  qasActive: boolean;
  qas: number; // kW Zuschlag fuer verbundene Systeme (Lueftung, Pool u. Ae.)
  /** Paket C / Block G — Pool-Leistung (kW). Zusammen mit qasLueftung automatisch in qas summiert. */
  qasPool: number;
  /** Paket C / Block G — Lueftungs-Leistung (kW). Zusammen mit qasPool automatisch in qas summiert. */
  qasLueftung: number;
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

/** Notiz-Slot (Sektion oder Projekt). Freitext; Export-Ein-/Ausschluss wird
 *  seit Phase 9 / Block L zentral im Export-Modal gesteuert (nicht mehr pro
 *  Notiz). */
export interface SectionNote {
  /** Freitext */
  text: string;
}

export interface NotizenState {
  sektion1: SectionNote;
  sektion2: SectionNote;
  sektion3: SectionNote;
  sektion4: SectionNote;
  /** Diagramm-/Leistungsdiagramm-Notiz (uebernimmt den Slot der alten Sektion 5). */
  sektion5: SectionNote;
  sektion6: SectionNote;
  /** Phase 9 / Block L — Projekt-uebergreifende Notiz. Ersetzt die alte
   *  Sektion-7-Notiz im UI; die Migration in storage.ts uebertraegt
   *  bestehende sektion7.text-Inhalte in diesen Slot. */
  projekt: SectionNote;
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

  /** Sektions-Notizen (pro Sektion ein Feld, inkl. Export-Flag). */
  notizen: NotizenState;

  /**
   * Pro Feld-Pfad ein Boolean: true = vom User ueberschrieben, false/absent = Default aus
   * Vorbedingungen (Lage, Bauperiode, Konstanten). Gesteuert via setOverride()/clearOverride().
   * Beispiel-Pfade: "gebaeude.tvoll", "warmwasser.deltaT", "speicher.wwTAustritt", ...
   */
  overrides: Record<string, boolean>;
}

function emptyNote(): SectionNote {
  return { text: '' };
}

function defaultNotizen(): NotizenState {
  return {
    sektion1: emptyNote(),
    sektion2: emptyNote(),
    sektion3: emptyNote(),
    sektion4: emptyNote(),
    sektion5: emptyNote(),
    sektion6: emptyNote(),
    projekt: emptyNote(),
  };
}

export type NotizenKey = keyof NotizenState;

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
      tvollProfil: 'wohnen_mitWW',
      tvollOverride: null,
      raeume: [],
      raeumeAktiv: false,
    },

    heizlast: {
      methodsEnabled: {
        verbrauch: false,
        messung: false,
        bstd: false,
        override: false,
      },
      verbrauch: {
        energietraeger: 'oel',
        ba: 3200,
        etaOverride: null,
        etaWirkungsgradId: 'oel_bestand',
        inklWW: true,
        vwuAbzug: 200,
        perioden: [],
      },
      messung: { qnPerJahr: 18000, perioden: [] },
      bstd: { stundenGesamt: 6000, jahre: 3, qhWP: 8.5, perioden: [] },
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
      // Block C: sichtbare Defaults aus zentraler Konstante (WW_VERLUSTE_DEFAULTS).
      speicherProzent: WW_VERLUSTE_DEFAULTS.speicher,
      zirkProzent: WW_VERLUSTE_DEFAULTS.zirk,
      ausstossProzent: WW_VERLUSTE_DEFAULTS.ausstoss,
    },

    zuschlaege: {
      // Block D: Sperrzeit standardmaessig aus — der User aktiviert sie bewusst.
      sperrzeitActive: false,
      toff: 2,
      qasActive: false,
      qas: 0,
      qasPool: 0,
      qasLueftung: 0,
    },

    speicher: {
      wwActive: true,
      // Block C: Default aus WW_SPEICHER_DEFAULTS (Austritt 60 °C gem. FWS/SIA).
      wwTStoAus: WW_SPEICHER_DEFAULTS.tAustritt,
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

    notizen: defaultNotizen(),

    overrides: {},
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
import { VOLLASTSTUNDEN, PHYSIK, WW_VERLUSTE_DEFAULTS, WW_SPEICHER_DEFAULTS } from './constants.ts';
function tvollLookup(profil: TvollProfil, lage: Lage): number {
  const row = VOLLASTSTUNDEN.find((r) => r.gebaeudetyp === profil && r.lage === lage);
  return row ? row.tvoll : 2000;
}

// ---------------------------------------------------------------
// Helper: Notizen
// ---------------------------------------------------------------

/** Setzt Text einer Sektions-Notiz. */
export function setNoteText(key: NotizenKey, text: string): void {
  const current = heizlastState.get().notizen;
  heizlastState.setKey('notizen', {
    ...current,
    [key]: { ...current[key], text },
  });
  isDirty.set(true);
}

// ---------------------------------------------------------------
// Helper: EBF-Zimmer-Liste
// ---------------------------------------------------------------

/** Anhängen eines neuen Zimmers. */
export function addRaum(name = ''): void {
  const g = heizlastState.get().gebaeude;
  const nextId = 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  const raeume: RaumInput[] = [
    ...g.raeume,
    {
      id: nextId,
      name,
      laenge: null,
      breite: null,
      flaecheDirekt: null,
      beheizt: true,
      flaecheOverride: null,
    },
  ];
  heizlastState.setKey('gebaeude', { ...g, raeume });
  isDirty.set(true);
}

/** Zimmer entfernen. */
export function removeRaum(id: string): void {
  const g = heizlastState.get().gebaeude;
  heizlastState.setKey('gebaeude', { ...g, raeume: g.raeume.filter((r) => r.id !== id) });
  isDirty.set(true);
}

/** Zimmer aktualisieren. */
export function updateRaum(id: string, patch: Partial<RaumInput>): void {
  const g = heizlastState.get().gebaeude;
  const raeume = g.raeume.map((r) => (r.id === id ? { ...r, ...patch } : r));
  heizlastState.setKey('gebaeude', { ...g, raeume });
  isDirty.set(true);
}

/** Liefert die Flaeche eines Zimmers. flaecheDirekt > flaecheOverride (legacy) >
 *  laenge * breite. Ergibt 0 wenn nichts sinnvoll gesetzt ist. */
export function raumFlaeche(r: RaumInput): number {
  if (r.flaecheDirekt != null && r.flaecheDirekt > 0) return r.flaecheDirekt;
  if (r.flaecheOverride != null && r.flaecheOverride > 0) return r.flaecheOverride;
  const l = r.laenge ?? 0;
  const b = r.breite ?? 0;
  if (l > 0 && b > 0) return l * b;
  return 0;
}

/** Phase 9 / Block E — Netto-Summe der Zimmerflaechen.
 *  - `beheizt`: Summe aller beheizten Raeume (fliesst in EBF).
 *  - `unbeheizt`: Summe aller unbeheizten Raeume (nur informativ).
 *  - `netto`: beheizte Summe (gerundet auf 0.1 m^2). Das ist der Wert, der
 *    beim "Uebernehmen" in `gebaeude.ebf` landet. */
export function sumRaumFlaechenNetto(
  raeume: RaumInput[],
): { beheizt: number; unbeheizt: number; netto: number } {
  let beheizt = 0;
  let unbeheizt = 0;
  for (const r of raeume) {
    const a = raumFlaeche(r);
    if (a <= 0) continue;
    if (r.beheizt === false) {
      unbeheizt += a;
    } else {
      beheizt += a;
    }
  }
  const bh = Math.round(beheizt * 10) / 10;
  const uh = Math.round(unbeheizt * 10) / 10;
  return { beheizt: bh, unbeheizt: uh, netto: bh };
}

/** Rueckwaertskompatibler Alias fuer alten Aufrufer — liefert die Netto-Summe
 *  (nur beheizte Raeume). Phase 9 / Block E: UI verwendet direkt `sumRaumFlaechenNetto`. */
export function sumRaumFlaechen(raeume: RaumInput[]): number {
  return sumRaumFlaechenNetto(raeume).netto;
}

// ---------------------------------------------------------------
// Helper: Overrides — Block A (Phase 9)
// ---------------------------------------------------------------
// Der Override-Record steuert, ob ein Feld vom User manuell gesetzt wurde oder
// ob es aus Vorbedingungen (Lage + Bauperiode + Konstanten) abgeleitet wird.
// UI zeigt den Default-Wert sichtbar im Feld; sobald der User einen Wert
// schreibt, wird overrides[path] = true gesetzt und ein Reset-Knopf erscheint.

/** Pfade aller bekannten Override-Felder. */
export type OverrideFieldPath =
  | 'gebaeude.tvoll'
  | 'warmwasser.deltaT'
  | 'warmwasser.speicher'
  | 'warmwasser.zirk'
  | 'warmwasser.ausstoss'
  | 'speicher.wwTEintritt'
  | 'speicher.wwTAustritt'
  | 'zuschlaege.toff';

/** Default-Werte pro Pfad. Einige sind dynamisch (tvoll aus Lage+Bauperiode). */
export function resolveDefault(state: HeizlastState, path: string): number | null {
  switch (path) {
    case 'gebaeude.tvoll':
      return tvollLookup(state.gebaeude.tvollProfil, state.gebaeude.lage);
    case 'warmwasser.deltaT':
      return PHYSIK.deltaT_ww;
    case 'warmwasser.speicher':
      return WW_VERLUSTE_DEFAULTS.speicher;
    case 'warmwasser.zirk':
      return WW_VERLUSTE_DEFAULTS.zirk;
    case 'warmwasser.ausstoss':
      return WW_VERLUSTE_DEFAULTS.ausstoss;
    case 'speicher.wwTEintritt':
      return WW_SPEICHER_DEFAULTS.tEintritt;
    case 'speicher.wwTAustritt':
      return WW_SPEICHER_DEFAULTS.tAustritt;
    case 'zuschlaege.toff':
      return 2;
    default:
      return null;
  }
}

/** Markiert ein Feld als vom User ueberschrieben. */
export function setOverride(path: string, overridden = true): void {
  const current = heizlastState.get().overrides ?? {};
  if (Boolean(current[path]) === overridden) return;
  heizlastState.setKey('overrides', { ...current, [path]: overridden });
  isDirty.set(true);
}

/** Entfernt die Override-Markierung (Feld faellt zurueck auf Default). */
export function clearOverride(path: string): void {
  const current = heizlastState.get().overrides ?? {};
  if (!current[path]) return;
  const next = { ...current };
  delete next[path];
  heizlastState.setKey('overrides', next);
  isDirty.set(true);
}

/** Prueft, ob ein Feld vom User ueberschrieben wurde. */
export function isOverridden(state: HeizlastState, path: string): boolean {
  return Boolean(state.overrides?.[path]);
}

// ---------------------------------------------------------------
// Helper: Verbrauch-Perioden (Phase 10 / Paket B)
// ---------------------------------------------------------------

function makePeriodeId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

/** Fügt eine Verbrauch-Periode ans Ende der Liste. */
export function addVerbrauchPeriode(): void {
  const h = heizlastState.get().heizlast;
  const perioden = h.verbrauch.perioden || [];
  const last = perioden[perioden.length - 1];
  const vonDatum = last ? last.bisDatum : currentYearStart();
  const bisDatum = nextYearStart(vonDatum);
  const next: VerbrauchPeriode[] = [
    ...perioden,
    { id: makePeriodeId('vp'), vonDatum, bisDatum, wert: 0 },
  ];
  heizlastState.setKey('heizlast', { ...h, verbrauch: { ...h.verbrauch, perioden: next } });
  isDirty.set(true);
}

/** Entfernt eine Verbrauch-Periode. */
export function removeVerbrauchPeriode(id: string): void {
  const h = heizlastState.get().heizlast;
  const next = (h.verbrauch.perioden || []).filter((p) => p.id !== id);
  heizlastState.setKey('heizlast', { ...h, verbrauch: { ...h.verbrauch, perioden: next } });
  isDirty.set(true);
}

/** Aktualisiert Felder einer Verbrauch-Periode. */
export function updateVerbrauchPeriode(id: string, patch: Partial<VerbrauchPeriode>): void {
  const h = heizlastState.get().heizlast;
  const next = (h.verbrauch.perioden || []).map((p) => (p.id === id ? { ...p, ...patch } : p));
  heizlastState.setKey('heizlast', { ...h, verbrauch: { ...h.verbrauch, perioden: next } });
  isDirty.set(true);
}

// ---------------------------------------------------------------
// Helper: Messung-Perioden (Phase 10 / Paket B)
// ---------------------------------------------------------------

/** Fügt eine Messung-Periode ans Ende der Liste. */
export function addMessungPeriode(): void {
  const h = heizlastState.get().heizlast;
  const perioden = h.messung.perioden || [];
  const last = perioden[perioden.length - 1];
  const vonDatum = last ? last.bisDatum : currentYearStart();
  const bisDatum = nextYearStart(vonDatum);
  const next: MessungPeriode[] = [
    ...perioden,
    { id: makePeriodeId('mp'), vonDatum, bisDatum, wertKWh: 0 },
  ];
  heizlastState.setKey('heizlast', { ...h, messung: { ...h.messung, perioden: next } });
  isDirty.set(true);
}

/** Entfernt eine Messung-Periode. */
export function removeMessungPeriode(id: string): void {
  const h = heizlastState.get().heizlast;
  const next = (h.messung.perioden || []).filter((p) => p.id !== id);
  heizlastState.setKey('heizlast', { ...h, messung: { ...h.messung, perioden: next } });
  isDirty.set(true);
}

/** Aktualisiert Felder einer Messung-Periode. */
export function updateMessungPeriode(id: string, patch: Partial<MessungPeriode>): void {
  const h = heizlastState.get().heizlast;
  const next = (h.messung.perioden || []).map((p) => (p.id === id ? { ...p, ...patch } : p));
  heizlastState.setKey('heizlast', { ...h, messung: { ...h.messung, perioden: next } });
  isDirty.set(true);
}

// ---------------------------------------------------------------
// Helper: Betriebsstunden-Perioden (Phase 10 / Paket B)
// ---------------------------------------------------------------

/** Fügt eine Bstd-Periode ans Ende der Liste. */
export function addBstdPeriode(): void {
  const h = heizlastState.get().heizlast;
  const perioden = h.bstd.perioden || [];
  const last = perioden[perioden.length - 1];
  const vonDatum = last ? last.bisDatum : currentYearStart();
  const bisDatum = nextYearStart(vonDatum);
  const next: BstdPeriode[] = [
    ...perioden,
    { id: makePeriodeId('bp'), vonDatum, bisDatum, stunden: 0 },
  ];
  heizlastState.setKey('heizlast', { ...h, bstd: { ...h.bstd, perioden: next } });
  isDirty.set(true);
}

/** Entfernt eine Bstd-Periode. */
export function removeBstdPeriode(id: string): void {
  const h = heizlastState.get().heizlast;
  const next = (h.bstd.perioden || []).filter((p) => p.id !== id);
  heizlastState.setKey('heizlast', { ...h, bstd: { ...h.bstd, perioden: next } });
  isDirty.set(true);
}

/** Aktualisiert Felder einer Bstd-Periode. */
export function updateBstdPeriode(id: string, patch: Partial<BstdPeriode>): void {
  const h = heizlastState.get().heizlast;
  const next = (h.bstd.perioden || []).map((p) => (p.id === id ? { ...p, ...patch } : p));
  heizlastState.setKey('heizlast', { ...h, bstd: { ...h.bstd, perioden: next } });
  isDirty.set(true);
}

// ---------------------------------------------------------------
// Datum-Utilities
// ---------------------------------------------------------------

/** Ergibt '2024-01-01' für das aktuelle Jahr. */
function currentYearStart(): string {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

/** Gibt das Startdatum des Folgejahres von vonDatum. */
function nextYearStart(vonDatum: string): string {
  const y = parseInt(vonDatum.slice(0, 4), 10) + 1;
  return `${y}-01-01`;
}
