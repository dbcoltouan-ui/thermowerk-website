// Haupt-App-Orchestrator
import { el, $, $$, toast } from './ui.js';
import { saveProject, listProjects, loadProject, deleteProject, exportJSON, importJSON } from './storage.js';

import { renderM1 } from './modules/m1-stammdaten.js';
import { renderM2 } from './modules/m2-heizlast.js';
import { renderM3 } from './modules/m3-plausibilitaet.js';
import { renderM4 } from './modules/m4-sanierung.js';
import { renderM5 } from './modules/m5-warmwasser.js';
import { renderM6 } from './modules/m6-zuschlaege.js';
import { renderM7 } from './modules/m7-wp-auslegung.js';
import { renderM8 } from './modules/m8-speicher.js';
import { renderM9 } from './modules/m9-heizpuffer.js';

const state = {};
let modules = [];

function buildApp() {
  const root = $('#app');
  root.innerHTML = '';

  const m1Body = renderM1(state, onStateChange);
  const m2Body = renderM2(state, onStateChange);
  const m4Body = renderM4(state, onStateChange);
  const m3Body = renderM3(state);
  const m5Body = renderM5(state, onStateChange);
  const m6Body = renderM6(state, onStateChange);
  const m7Body = renderM7(state);
  const m8Body = renderM8(state);
  const m9Body = renderM9(state);

  modules = [
    { id: 'm1', title: 'M1 · Stammdaten',                     badge: 'Gebäude',       body: m1Body },
    { id: 'm2', title: 'M2 · Norm-Heizlast Qhl',              badge: 'Kernberechnung', body: m2Body },
    { id: 'm4', title: 'M4 · Sanierungs-Delta',               badge: '§6 multiplikativ', body: m4Body },
    { id: 'm3', title: 'M3 · Plausibilitätskontrolle (§7)',   badge: 'W/m²',           body: m3Body },
    { id: 'm5', title: 'M5 · Warmwasser',                     badge: 'QW,u · Qw',      body: m5Body },
    { id: 'm6', title: 'M6 · Leistungszuschläge Qoff · Qas',  badge: 'Sperrzeit',      body: m6Body },
    { id: 'm7', title: 'M7 · WP-Auslegung Qh',                badge: 'Auslegung',      body: m7Body },
    { id: 'm8', title: 'M8 · WW-Speicher & WT-Fläche',        badge: '§10 · §11',      body: m8Body },
    { id: 'm9', title: 'M9 · Heizungs-Pufferspeicher',        badge: 'SWKI · VDI',     body: m9Body },
  ];

  modules.forEach(m => {
    const mod = el('section', { class: 'module', id: m.id },
      el('div', { class: 'module-head', onclick: () => mod.classList.toggle('collapsed') },
        el('h2', {}, m.title, el('span', { class: 'badge' }, m.badge)),
        el('span', { class: 'chev' }, '▾')),
      el('div', { class: 'module-body' }, m.body));
    root.appendChild(mod);
  });
}

let _cascading = false;
function onStateChange() {
  if (_cascading) return;
  _cascading = true;
  try {
    // kaskadierend neu rechnen – M4 zuerst (wirkt auf Qhl)
    $('#m4 .module-body')?.firstChild?._recompute?.();
    $('#m3 .module-body')?.firstChild?._render?.();
    $('#m5 .module-body')?.firstChild?._recompute?.();
    $('#m6 .module-body')?.firstChild?._recompute?.();
    $('#m7 .module-body')?.firstChild?._recompute?.();
    $('#m8 .module-body')?.firstChild?._recompute?.();
    $('#m9 .module-body')?.firstChild?._recompute?.();
  } finally {
    _cascading = false;
  }
}

// ═══ Projekt-Management ═══
function refreshProjectList() {
  const sel = $('#project-select');
  if (!sel) return;
  const all = listProjects();
  const current = sel.value;
  sel.innerHTML = '<option value="">— Projekt laden —</option>';
  Object.keys(all).sort().forEach(name => {
    sel.appendChild(el('option', { value: name }, name));
  });
  if (current && all[current]) sel.value = current;
}

function doSave() {
  const name = prompt('Projektname:', state._projectName || '');
  if (!name) return;
  state._projectName = name;
  saveProject(name, { state: { ...state, _projectName: undefined }});
  refreshProjectList();
  toast(`Projekt "${name}" gespeichert`);
}

function doLoad(name) {
  if (!name) return;
  const p = loadProject(name);
  if (!p) return;
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, p.state || {});
  state._projectName = name;
  buildApp();
  toast(`"${name}" geladen`);
}

function doDelete() {
  const name = $('#project-select')?.value;
  if (!name) return;
  if (!confirm(`Projekt "${name}" wirklich löschen?`)) return;
  deleteProject(name);
  refreshProjectList();
  toast('Gelöscht');
}

function doExportJson() {
  const name = state._projectName || 'heizlast';
  exportJSON({ state, exportedAt: new Date().toISOString(), version: 1 }, `${name}.json`);
}

async function doImportJson(file) {
  try {
    const data = await importJSON(file);
    if (data.state) {
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, data.state);
      buildApp();
      toast('Import erfolgreich');
    } else toast('Ungültiges JSON');
  } catch (e) { toast('Fehler beim Import'); }
}

function updatePrintMeta() {
  const meta = $('#print-meta');
  if (!meta) return;
  const d = new Date();
  const datum = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const proj = state._projectName ? `Projekt: ${state._projectName}<br>` : '';
  meta.innerHTML = `${proj}Datum: ${datum}`;
}

function loadLogo() {
  const dataUrl = localStorage.getItem('thermowerk_logo');
  const img = $('#print-logo');
  if (img) img.src = dataUrl || img.getAttribute('data-default') || '';
}

function doLogoUpload(file) {
  const r = new FileReader();
  r.onload = () => {
    localStorage.setItem('thermowerk_logo', r.result);
    loadLogo();
    toast('Logo gespeichert');
  };
  r.readAsDataURL(file);
}

function buildKundenReport() {
  // Angebots-Template aus state rendern
  const m1 = state.m1 || {};
  const m2 = state.m2 || {};
  const last = state._last || {};
  const ww  = state._lastWW || {};
  const qw  = state._lastQw;
  const qoff = state._lastZuschlaege?.qoff;
  const qh  = state._lastQh?.qh;
  const m4  = state.m4 || {};
  const m8  = state.m8 || {};
  const m9  = state._m9 || {};

  const fmt = (v, d=2) => v != null && isFinite(v) ? v.toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
  const int = v => v != null && isFinite(v) ? Math.round(v).toLocaleString('de-CH') : '—';
  const datum = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const proj = state._projectName || '—';

  // Sanierungsmassnahmen als Klartext
  let sanText = 'Keine zusätzlichen Sanierungsmassnahmen in der Berechnung berücksichtigt (Verbrauchsbasis entspricht dem Ist-Zustand).';
  if (m4.aktiv && m4.auswahl) {
    const aktive = Object.entries(m4.auswahl).filter(([,v]) => v.enabled);
    if (aktive.length) {
      sanText = 'Bei der Auslegung berücksichtigte energetische Verbesserungen:<ul>' +
        aktive.map(([id, v]) => {
          const labels = { fenster: 'Fensterersatz auf 2-/3-fach Isolierverglasung',
                           fassade: 'Fassadendämmung',
                           estrich: 'Estrichboden-/deckendämmung',
                           kellerdecke: 'Kellerdeckendämmung',
                           kwl: 'Kontrollierte Wohnraumlüftung (KWL)' };
          return `<li>${labels[id] || id}</li>`;
        }).join('') + '</ul>';
    }
  }

  // Verbrauchsangaben
  const traegerText = (m2.traeger || []).filter(t => parseFloat(t.verbrauch) > 0)
    .map(t => {
      const et = { oel: 'Heizöl EL', gas: 'Erdgas', stueck: 'Stückholz', pellets: 'Holz-Pellets', elektro: 'Elektrospeicherheizung' }[t.energietraeger] || t.energietraeger;
      return `${int(parseFloat(t.verbrauch))} ${({oel:'L/a',gas:'m³/a',stueck:'Ster/a',pellets:'kg/a',elektro:'kWh/a'}[t.energietraeger]||'')} ${et}`;
    }).join(', ');

  const report = el('div', { class: 'kunden-report' });
  // Briefkopf mit grossem Logo
  report.appendChild(el('div', { class: 'kr-header' },
    el('div', { class: 'kr-logo' }, el('img', { id: 'kr-logo-img' })),
    el('div', { class: 'kr-head-right' },
      el('div', { class: 'kr-doctype' }, 'Heizlast-Auslegung'),
      el('div', { class: 'kr-meta' },
        el('div', {}, el('strong', {}, 'Projekt: '), proj),
        el('div', {}, el('strong', {}, 'Datum: '), datum),
        el('div', {}, el('strong', {}, 'Grundlage: '), 'FWS Modul 3 · Ausgabe 1-2025')))));

  // Titel
  report.appendChild(el('h1', { class: 'kr-title' }, 'Auslegungsbericht Wärmepumpe'));
  report.appendChild(el('div', { class: 'kr-lead' },
    'Basierend auf dem gemessenen Energieverbrauch sowie den dokumentierten Gebäudemerkmalen ' +
    'wurde die Norm-Heizlast nach FWS Modul 3 (Ausgabe 1-2025) berechnet. Die ausgewiesenen Leistungen ' +
    'dienen als technische Grundlage für die Dimensionierung von Wärmepumpe, Wärme- und Warmwasserspeicher.'));

  // Objektblock
  report.appendChild(el('h2', { class: 'kr-h2' }, 'Objektdaten'));
  const bauperiodeLabels = {
    'vor_1947':'vor 1947','1947_70':'1947–1970','1971_80':'1971–1980','1981_90':'1981–1990',
    '1991_00':'1991–2000','2001_10':'2001–2010','nach_2010':'nach 2010','minergie':'Minergie-Standard',
  };
  report.appendChild(kvTable([
    ['Gebäudetyp', ({efh:'Einfamilienhaus',mfh:'Mehrfamilienhaus',buero:'Büro / Gewerbe'}[m1.gebaeudetyp] || '—')],
    ['Lage', m1.lage === 'hoehe' ? 'ab 800 m ü. M.' : 'Mittelland'],
    ['Bauperiode', bauperiodeLabels[m1.bauperiode] || m1.bauperiode || '—'],
    ['Energiebezugsfläche EBF', m1.ebf ? `${int(m1.ebf)} m²` : '—'],
    ['Wohneinheiten', m1.wohneinheiten || '—'],
    ['Verbrauch (Basis der Berechnung)', traegerText || '—'],
  ]));

  // Ergebnis-Tabelle
  report.appendChild(el('h2', { class: 'kr-h2' }, 'Dimensionsrelevante Leistungen'));
  report.appendChild(kvTable([
    ['Norm-Heizlast Qhl', `${fmt(last.qhl)} kW`],
    ['Leistungszuschlag Sperrzeit Qoff', qoff != null ? `${fmt(qoff)} kW` : '—'],
    ['Leistungszuschlag Warmwasser Qw', qw?.qw != null ? `${fmt(qw.qw)} kW` : 'entfällt (separate Warmwasseraufbereitung)'],
    ['Auslegungsleistung Wärmepumpe Qh', qh != null ? `${fmt(qh)} kW` : '—'],
  ], { highlight: 3 }));

  // Sanierungsblock
  report.appendChild(el('h2', { class: 'kr-h2' }, 'Energetische Gebäudemerkmale'));
  const sanDiv = el('div', { class: 'kr-text' });
  sanDiv.innerHTML = sanText;
  report.appendChild(sanDiv);

  // Speicher-Empfehlung
  const zeilen = [];
  if (state._lastWW?.qwwTag) {
    // Speichervolumen-Empfehlung aus M8 berechnen (vereinfacht: aus letztem recompute lesen)
    const qww = state._lastWW.qwwTag;
    const dt = (m8.tStoAus || 60) - (m8.tStoEin || 10);
    const vSto = qww / (4.2 * dt / 3600);
    const fak  = ({keine_zonen:1.25, mit_zonen:1.10, bivalent:1.00}[m8.fstoId] || 1.25);
    zeilen.push(['Warmwasserspeicher (empfohlen)', `${int(vSto * fak)} Liter (${m8.tStoAus || 60} °C)`]);
  }
  if (qh && qh > 0) {
    // grobe Empfehlung Puffer 20 l/kW bei L/W mit Abtau
    const puff = Math.round(qh * 20);
    zeilen.push(['Heizungs-Pufferspeicher (Richtwert)', `${puff} Liter (Abtau-Sicherung L/W-WP)`]);
  }
  if (zeilen.length) {
    report.appendChild(el('h2', { class: 'kr-h2' }, 'Empfohlene Speichervolumen'));
    report.appendChild(kvTable(zeilen));
  }

  // Grundlagen / Fussnote
  report.appendChild(el('h2', { class: 'kr-h2' }, 'Berechnungsgrundlagen'));
  report.appendChild(el('div', { class: 'kr-text' },
    el('p', {}, 'Die Heizlast wurde nach dem Verbrauchsverfahren gemäss FWS Modul 3 (Ausgabe 1-2025, Schweizer Wärmepumpen-Fachvereinigung) ermittelt. Leistungszuschläge für Sperrzeiten und Warmwasserbereitung folgen denselben Grundlagen.'),
    el('p', {}, 'Weitere Grundlagen: SIA 384/1:2022 (Heizlast in Gebäuden), SIA 385/1:2020 und 385/2 (Warmwasseranlagen). Speichervolumen nach FWS M3 §10, Wärmetauscher-Dimensionierung nach §11. Der Heizungs-Pufferspeicher ist als Richtwert aus SWKI BT 102-01 und VDI 4645 abgeleitet.'),
    el('p', { style: { fontSize: '9pt', color: '#555' }},
      'Die berechneten Werte basieren auf den vom Kunden/Planer zur Verfügung gestellten Angaben (Brennstoffverbrauch, Gebäudekennwerte, Sanierungszustand). Abweichungen im Nutzerverhalten oder in der Gebäudehülle können das Ergebnis beeinflussen.')));

  return report;
}

function kvTable(rows, opts = {}) {
  const tbl = el('table', { class: 'kr-kv' });
  rows.forEach((r, i) => {
    const tr = el('tr', { class: opts.highlight === i ? 'hl' : '' },
      el('td', { class: 'kv-k' }, r[0]),
      el('td', { class: 'kv-v' }, r[1]));
    tbl.appendChild(tr);
  });
  return tbl;
}

let _kundenMount = null;
function doPrint(modus = 'intern') {
  document.body.classList.toggle('print-kunde', modus === 'kunde');
  $$('details.steps').forEach(d => d.open = modus === 'intern');
  updatePrintMeta();

  if (modus === 'kunde') {
    // Kunden-Report als separates Overlay einfügen
    if (_kundenMount) _kundenMount.remove();
    _kundenMount = buildKundenReport();
    document.body.insertBefore(_kundenMount, document.querySelector('main'));
    // Logo für Report setzen
    const krImg = $('#kr-logo-img');
    if (krImg) {
      const custom = localStorage.getItem('thermowerk_logo');
      const def = $('#print-logo')?.getAttribute('data-default');
      krImg.src = custom || def || '';
    }
  } else if (_kundenMount) {
    _kundenMount.remove(); _kundenMount = null;
  }

  toast('Tipp: Im Druckdialog "Kopf-/Fusszeilen" abwählen');
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-kunde');
      if (_kundenMount) { _kundenMount.remove(); _kundenMount = null; }
    }, 500);
  }, 250);
}

// ═══ Init ═══
window.addEventListener('DOMContentLoaded', () => {
  buildApp();
  refreshProjectList();

  $('#btn-save')?.addEventListener('click', doSave);
  $('#btn-delete')?.addEventListener('click', doDelete);
  $('#project-select')?.addEventListener('change', e => doLoad(e.target.value));
  $('#btn-export-json')?.addEventListener('click', doExportJson);
  $('#btn-import-json')?.addEventListener('click', () => $('#file-import').click());
  $('#file-import')?.addEventListener('change', e => { if (e.target.files[0]) doImportJson(e.target.files[0]); });
  $('#btn-print-full') ?.addEventListener('click', () => doPrint('intern'));
  $('#btn-print-kunde')?.addEventListener('click', () => doPrint('kunde'));
  $('#btn-logo-upload')?.addEventListener('click', () => $('#file-logo').click());
  $('#file-logo')     ?.addEventListener('change', e => { if (e.target.files[0]) doLogoUpload(e.target.files[0]); });
  loadLogo();
  $('#btn-neu')?.addEventListener('click', () => {
    if (!confirm('Neues leeres Projekt beginnen?')) return;
    Object.keys(state).forEach(k => delete state[k]);
    buildApp();
  });
});
