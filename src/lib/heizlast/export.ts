// Thermowerk Heizlast — Export-Logik (PDF via Print-CSS + JSON-Download).
// --------------------------------------------------------------------
// Einstiegspunkt: `runExport(options)` im heizlast.astro.
// - Befuellt PrintCover-Slots aus aktuellem State/Compute.
// - Setzt body-Klassen fuer Teil-Auswahl (cover/objekt/resultate/diagramm/formeln/grundlagen/notizen).
// - PDF: konvertiert Chart.js-Canvas einmalig in <img>, ruft window.print(),
//        raeumt nach afterprint wieder auf.
// - JSON: generiert Blob mit komplettem State + Compute-Summary + Timestamp
//         und triggert Download.

import { heizlastState } from './state.ts';
import { heizlastCompute } from './compute.ts';
import { BAUPERIODEN } from './constants.ts';

export type ExportPart =
  | 'cover'
  | 'objekt'
  | 'resultate'
  | 'diagramm'
  | 'formeln'
  | 'grundlagen'
  | 'notizen'
  | 'plausi';

export interface ExportOptions {
  format: 'pdf' | 'json';
  parts: Record<ExportPart, boolean>;
  filename: string;
}

// ---------------------------------------------------------------
// Helpers (lokale Duplikate der heizlast.astro-Labels, damit das
// Export-Modul eigenstaendig bleibt)
// ---------------------------------------------------------------

function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || !isFinite(n)) return '—';
  return n.toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtInt(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  return Math.round(n).toLocaleString('de-CH');
}
function labelBauperiode(id: string): string {
  const p = BAUPERIODEN.find((b) => b.id === id);
  return p ? p.label : id;
}
function labelTyp(id: string): string {
  const map: Record<string, string> = {
    efh: 'Einfamilienhaus',
    mfh: 'Mehrfamilienhaus',
    buero: 'Buero / Gewerbe',
  };
  return map[id] || id;
}
function labelLage(id: string): string {
  const map: Record<string, string> = {
    mittelland: 'Mittelland (<800 m)',
    hoehe: 'ab 800 m ue. M.',
  };
  return map[id] || id;
}
function labelStatus(id: string): string {
  const map: Record<string, string> = {
    arbeit: 'In Arbeit',
    offeriert: 'Offeriert',
    bestellt: 'Bestellt',
    abgeschlossen: 'Abgeschlossen',
    archiv: 'Archiv',
  };
  return map[id] || id;
}

function setSlot(key: string, value: string): void {
  document.querySelectorAll(`[data-print-slot="${key}"]`).forEach((el) => {
    el.textContent = value;
  });
}

function sanitizeFilename(name: string): string {
  const cleaned = (name || 'Thermowerk-Heizlast')
    .replace(/[^\w\-. ]/g, '')
    .replace(/\s+/g, '-')
    .trim();
  return cleaned || 'Thermowerk-Heizlast';
}

// ---------------------------------------------------------------
// Deckblatt-Slots befuellen
// ---------------------------------------------------------------

function fillCoverSlots(): void {
  const s = heizlastState.get();
  const r = heizlastCompute.get();
  const today = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

  setSlot('projectName', s.projectName || 'Unbenanntes Projekt');
  setSlot('customerName', s.customerName || '');
  setSlot('address', s.address || '');
  setSlot('typ', labelTyp(s.gebaeude.typ));
  setSlot('lage', labelLage(s.gebaeude.lage));
  setSlot('bauperiode', labelBauperiode(s.gebaeude.bauperiode));
  setSlot('ebf', fmt(s.gebaeude.ebf, 0));
  setSlot('tvoll', fmtInt(r.tvoll));
  setSlot('status', labelStatus(s.status));
  setSlot('qh', fmt(r.qh?.value));
  setSlot('qhl', fmt(r.qhlKorr?.value));
  setSlot('wwSpeicher', fmtInt(r.wwSpeicherGerundet));
  setSlot('puffer', fmtInt(r.pufferGerundet));
  setSlot('today', today);

  // Optionaler Trenner zwischen projectName und customerName
  document.querySelectorAll('[data-print-slot-if]').forEach((el) => {
    const key = el.getAttribute('data-print-slot-if');
    const has = key === 'customerName' ? Boolean(s.customerName) : false;
    (el as HTMLElement).style.display = has ? '' : 'none';
  });
}

// ---------------------------------------------------------------
// Chart-Canvas -> <img>-Fallback fuer Print
// ---------------------------------------------------------------

function replaceChartWithImage(): HTMLImageElement | null {
  const canvas = document.getElementById('hz-diag-canvas') as HTMLCanvasElement | null;
  if (!canvas) return null;
  try {
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'hz-diag__print-img';
    img.alt = 'Leistungsdiagramm';
    img.setAttribute('data-print-chart', '');
    canvas.parentElement?.appendChild(img);
    return img;
  } catch {
    return null;
  }
}

function removeChartImage(img: HTMLImageElement | null): void {
  if (img && img.parentElement) img.parentElement.removeChild(img);
}

// ---------------------------------------------------------------
// Body-Klassen fuer Part-Toggles
// ---------------------------------------------------------------

const PART_CLASS: Record<ExportPart, string> = {
  cover: 'hz-print-cover-on',
  objekt: 'hz-print-objekt-on',
  resultate: 'hz-print-resultate-on',
  diagramm: 'hz-print-diagramm-on',
  formeln: 'hz-print-formeln-on',
  grundlagen: 'hz-print-grundlagen-on',
  notizen: 'hz-print-notizen-on',
  plausi: 'hz-print-plausi-on',
};

function applyPartClasses(parts: Record<ExportPart, boolean>): void {
  const body = document.body;
  (Object.keys(PART_CLASS) as ExportPart[]).forEach((k) => {
    body.classList.toggle(PART_CLASS[k], Boolean(parts[k]));
  });
}
function clearPartClasses(): void {
  const body = document.body;
  Object.values(PART_CLASS).forEach((c) => body.classList.remove(c));
}

// ---------------------------------------------------------------
// PDF-Export (Print-CSS)
// ---------------------------------------------------------------

function runPdfExport(options: ExportOptions): void {
  fillCoverSlots();
  const chartImg = replaceChartWithImage();
  applyPartClasses(options.parts);

  const body = document.body;
  const originalTitle = document.title;
  document.title = sanitizeFilename(options.filename);
  body.classList.add('hz-print-mode');

  const cleanup = () => {
    body.classList.remove('hz-print-mode');
    clearPartClasses();
    removeChartImage(chartImg);
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  // Kleine Verzoegerung, damit der Chart-Screenshot sicher im DOM ist.
  setTimeout(() => {
    window.print();
  }, 80);
}

// ---------------------------------------------------------------
// JSON-Export
// ---------------------------------------------------------------

function runJsonExport(options: ExportOptions): void {
  const state = heizlastState.get();
  const compute = heizlastCompute.get();
  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: 'Thermowerk Heizlast-Rechner',
    state,
    results: compute.summary,
    detail: {
      qhlRaw: compute.qhlRaw?.value ?? null,
      qhlKorr: compute.qhlKorr?.value ?? null,
      plausi: compute.plausi?.value ?? null,
      qw: compute.qw?.value ?? null,
      qwwTag: compute.qwwTagVal?.value ?? null,
      vwu: compute.vwu?.value ?? null,
      qoff: compute.qoff?.value ?? null,
      qh: compute.qh?.value ?? null,
      wwSpeicher: compute.wwSpeicherGerundet,
      puffer: compute.pufferGerundet,
      tvoll: compute.tvoll,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(options.filename) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 400);
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

export function runExport(options: ExportOptions): void {
  if (options.format === 'json') {
    runJsonExport(options);
    return;
  }
  runPdfExport(options);
}

/** Standard-Dateiname aus aktuellen Projektdaten (z. B. "Thermowerk-Heizlast-Mueller"). */
export function defaultFilename(): string {
  const s = heizlastState.get();
  const parts = ['Thermowerk-Heizlast'];
  if (s.projectName) parts.push(s.projectName);
  else if (s.customerName) parts.push(s.customerName);
  return sanitizeFilename(parts.join('-'));
}
