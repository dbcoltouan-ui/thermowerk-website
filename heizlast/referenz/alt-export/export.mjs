// src/export.mjs
// Session 7 — Export im FWS-Broschüren-Stil (portiert aus dem Original-FWS-
// Single-File-Tool). Drei Formate: PDF (Browser-Print) · HTML (Standalone) · JSON.
// Die Broschüre besteht aus zwei Blättern:
//   Blatt 1: Auslegungsbericht (Kundschaft, Objektdaten, Leistungen, Speicher)
//   Blatt 2: Berechnungsgrundlagen + ausführlicher Rechenweg + Notizen
// Detail-Modus ergänzt: Hülle-Tabelle, Räume-Übersicht, Cockpit-Vergleich
// Norm↔Verbrauch, Geräte-Karte, Förderungs-Tabelle.

import { getState } from './state.mjs';
import { compute, HEIZWERT, TOFF_DEFAULTS, F_STO_PRESETS, SANIERUNG_PRESETS,
         effectiveTvoll, tvollAuto, sanFactor, effectiveVWu, periodEta } from './calc/fws.mjs';
import { computeBuildingDetailLoad } from './calc/heatload.mjs';
import { computeDistribution } from './calc/distribution.mjs';
import { computeHeatpumpResult } from './calc/heatpump.mjs';
import { resolveHuelleUWerte, getWpDb, getFoerderDb, getBauDb,
         enrichRaeumeWithResolvedUFrt, resolveBauteilUFrt } from './ui.mjs';
import { filterFoerderungen, lookupBaubewilligung,
         schaetzeBetrag, gruppiereProgramme } from './calc/foerderung.mjs';
import { vergleichNormVerbrauch } from './calc/plausi.mjs';
import { getActiveMeta } from './persistence.mjs';
import { exportOfferte } from './export-offerte.mjs';

const FIRMA = {
  name:  'Gebäudetechnik Coltouan',
  adr:   'Rankstrasse 18, 8413 Neftenbach',
  tel:   '+41 76 504 03 68',
  email: 'info@thermowerk.ch',
  uid:   'CHE-489.162.528'
};
// CH-Kantone (Vollständig) — Code → Label. Spiegelt CH_KANTONE in src/ui.mjs,
// damit der Bericht den Kanton ausgeschrieben anzeigt (z.B. "Aargau" statt "AG").
const KANTON_NAMES = {
  ZH:'Zürich', BE:'Bern', LU:'Luzern', UR:'Uri', SZ:'Schwyz', OW:'Obwalden',
  NW:'Nidwalden', GL:'Glarus', ZG:'Zug', FR:'Freiburg', SO:'Solothurn',
  BS:'Basel-Stadt', BL:'Basel-Landschaft', SH:'Schaffhausen',
  AR:'Appenzell A.Rh.', AI:'Appenzell I.Rh.', SG:'St. Gallen', GR:'Graubünden',
  AG:'Aargau', TG:'Thurgau', TI:'Tessin', VD:'Waadt', VS:'Wallis',
  NE:'Neuenburg', GE:'Genf', JU:'Jura'
};
function kantonLabel(code){
  if (!code) return '';
  const k = String(code).trim().toUpperCase();
  return KANTON_NAMES[k] || code;
}

const BAUPERIODE_LABEL = {
  '<1919':'vor 1919', '1919-1945':'1919–1945', '1946-1960':'1946–1960',
  '1961-1970':'1961–1970', '1971-1980':'1971–1980', '1981-1985':'1981–1985',
  '1986-1990':'1986–1990', '1991-1995':'1991–1995', '1996-2000':'1996–2000',
  '2001-2005':'2001–2005', '2006-2010':'2006–2010', '2011-heute':'2011–heute'
};

/* ======================================================
   Modal
   ====================================================== */
export function renderExportModal(){
  return `
  <div class="modal" id="modalExport" hidden>
    <div class="modal__backdrop" data-close="modalExport"></div>
    <div class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="modalExportTitle">
      <header class="modal__head">
        <h2 class="modal__title" id="modalExportTitle">Export</h2>
        <button class="modal__close" type="button" data-close="modalExport" aria-label="Schliessen">×</button>
      </header>
      <div class="modal__body">
        <p class="field__hint">Auslegungsbericht im Thermowerk-Stil. Stammdaten, Leistungen und Ergebnis sind immer enthalten.</p>
        <div class="export-opts" id="exportOpts">
          <label class="chk"><input type="checkbox" id="opt-rechenweg" checked> <span>Detaillierter Rechenweg (Schritt-für-Schritt mit Formeln)</span></label>
          <label class="chk"><input type="checkbox" id="opt-notizen" checked>   <span>Notizen (alle Bereiche + Räume)</span></label>
          <label class="chk"><input type="checkbox" id="opt-foerder"  checked>  <span>Förderungs-Übersicht</span></label>
          <label class="chk" id="opt-vergleich-wrap"><input type="checkbox" id="opt-vergleich" checked> <span>Vergleich Verbrauch ↔ Norm-Heizlast (Detail-Modus)</span></label>
          <label class="chk" id="opt-huelle-wrap"><input type="checkbox" id="opt-huelle" checked> <span>Hülle &amp; Räume (Detail-Modus)</span></label>
          <label class="chk" id="opt-geraet-wrap"><input type="checkbox" id="opt-geraet" checked> <span>Geräte-Auswahl (Detail-Modus)</span></label>
          <label class="chk" id="opt-offerte-wrap"><input type="checkbox" id="opt-offerte"> <span>Offerte exportieren (separates PDF mit Briefkopf, Positionen, Zahlungsplan, AGB)</span></label>
        </div>
        <div class="export-opts" id="exportOpts-offerte" style="margin-top:8px; display:none;">
          <label class="field__label" for="opt-zahlungsplan">Zahlungsplan-Vorlage</label>
          <select class="input" id="opt-zahlungsplan">
            <option value="klassisch" selected>Klassisch (30 / 60 / 10)</option>
            <option value="drittel">Drittel (33 / 33 / 34)</option>
            <option value="schluss">Schluss (50 / 50)</option>
          </select>
        </div>
      </div>
      <footer class="modal__foot modal__foot--export">
        <button class="btn btn--ghost"   type="button" data-close="modalExport">Schliessen</button>
        <button class="btn btn--primary" type="button" id="btnExportPdf">PDF (Auslegung)</button>
        <button class="btn btn--primary" type="button" id="btnExportOfferte">Offerte PDF</button>
        <button class="btn btn--primary" type="button" id="btnExportJson">JSON (Rohdaten)</button>
      </footer>
    </div>
  </div>`;
}

export function initExportUi(){
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('button');
    if (!t) return;
    if (t.id === 'btnExport') openExportModal();
    else if (t.id === 'btnExportPdf')  doExport('pdf');
    else if (t.id === 'btnExportJson') doExport('json');
    else if (t.id === 'btnExportOfferte') doExport('offerte');
  });
  // "Offerte exportieren"-Checkbox: Zahlungsplan-Selector ein-/ausblenden.
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (!t || t.id !== 'opt-offerte') return;
    const wrap = document.getElementById('exportOpts-offerte');
    if (wrap) wrap.style.display = t.checked ? '' : 'none';
  });
}

function openExportModal(){
  const m = document.getElementById('modalExport');
  if (!m) return;
  const detail = !!getState()?.detail?.aktiv;
  ['opt-vergleich-wrap','opt-huelle-wrap','opt-geraet-wrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = detail ? '' : 'none';
  });
  m.hidden = false;
  document.body.classList.add('modal-open');
}

function closeExportModal(){
  const m = document.getElementById('modalExport');
  if (m) m.hidden = true;
  if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('modal-open');
}

function readOptions(){
  return {
    rechenweg: !!document.getElementById('opt-rechenweg')?.checked,
    notizen:   !!document.getElementById('opt-notizen')?.checked,
    foerder:   !!document.getElementById('opt-foerder')?.checked,
    vergleich: !!document.getElementById('opt-vergleich')?.checked,
    huelle:    !!document.getElementById('opt-huelle')?.checked,
    geraet:    !!document.getElementById('opt-geraet')?.checked,
    offerte:   !!document.getElementById('opt-offerte')?.checked,
    zahlungsplan: document.getElementById('opt-zahlungsplan')?.value || 'klassisch'
  };
}

/* ======================================================
   Hauptfunktion
   ====================================================== */
function doExport(format){
  try {
    const state = getState();
    const calc  = computeFullCalc(state);
    const opts  = readOptions();
    const meta  = getActiveMeta();

    if (format === 'json'){
      const payload = { meta, state, calc: stripFunctions(calc),
        exportedAt: new Date().toISOString(), options: opts };
      download(blob(JSON.stringify(payload, null, 2), 'application/json;charset=utf-8'),
               buildFilename(meta, 'json'));
      closeExportModal();
      return;
    }

    if (format === 'offerte'){
      // Eigenes Layout — separat vom Auslegungsbericht. Lädt zusätzlich
      // ein Markdown-File mit allen _isCustom-Positionen herunter, falls
      // welche im State sind (Stammdaten-Patch fuer spaetere Pflege).
      try {
        exportOfferte(state, calc, { zahlungsplan: opts.zahlungsplan || 'klassisch' });
      } catch(e){
        console.error('[export-offerte] failed:', e);
        alert('Offerten-Export fehlgeschlagen: ' + (e && e.message ? e.message : e));
      }
      closeExportModal();
      return;
    }

    const html = buildFullHtml(state, calc, opts, meta);
    if (format === 'pdf'){
      const w = window.open('', '_blank', 'width=900,height=1200');
      if (w && !w.closed){
        try {
          w.document.open(); w.document.write(html); w.document.close();
          setTimeout(() => { try { w.focus(); w.print(); } catch(_){} }, 400);
        } catch(e){ alert('PDF-Fenster konnte nicht geschrieben werden: ' + (e.message || e)); }
        closeExportModal();
        return;
      }
      // Fallback: hidden iframe
      const old = document.getElementById('exportPrintFrame');
      if (old) old.remove();
      const iframe = document.createElement('iframe');
      iframe.id = 'exportPrintFrame';
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(iframe);
      iframe.onload = () => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch(e){} };
      iframe.srcdoc = html;
      closeExportModal();
      return;
    }
  } catch(err){
    console.error('[export] doExport failed:', err);
    alert('Export fehlgeschlagen: ' + (err && err.message ? err.message : err));
  }
}

/* ======================================================
   Calc-Wrapper
   ====================================================== */
function computeFullCalc(state){
  const calc = compute(state);
  if (state.detail && state.detail.aktiv){
    try {
      const { uHuelle } = resolveHuelleUWerte(state);
      const enriched = enrichRaeumeWithResolvedUFrt(state);
      calc.detail = computeBuildingDetailLoad(enriched, uHuelle);
    } catch(e){ calc.detail = null; }
    try { calc.distribution = computeDistribution(state, calc.detail); } catch(e){ calc.distribution = null; }
    try { calc.heatpump = computeHeatpumpResult(state, getWpDb(), calc.Qh); } catch(e){ calc.heatpump = null; }
  }
  return calc;
}

/* ======================================================
   Full HTML
   ====================================================== */
function buildFullHtml(state, calc, opts, meta){
  const heute = new Date().toLocaleDateString('de-CH');
  const projName = state.projekt?.name || meta.name || 'Heizlast-Bericht';
  const detail = !!state?.detail?.aktiv;
  const parts = [];

  // === Blatt 1: Auslegungsbericht ===
  parts.push(buildReportHeader());
  parts.push(buildPageHead('Auslegungsbericht Wärmepumpe', heute, 'title'));
  parts.push(buildKundschaftTable(state));
  parts.push(buildObjektdatenTable(state, calc));
  parts.push(buildLeistungenTable(state, calc));
  // buildDetailCockpitTable wird seit Daniel-Smoke-Test 2026-04-29 nicht mehr
  // im Bericht angezeigt — der Inhalt (Norm + Verbrauchs-Heizlast) steht
  // bereits in buildLeistungenTable inkl. Mixed-Mode-Aufschlüsselung. Funktion
  // bleibt im Code für Tests / spätere Wiederverwendung erhalten.
  parts.push(buildSpeicherTable(state, calc));
  if (detail && opts.geraet && state?.geraet?.gewaehlt_id){
    parts.push(buildGeraeteTable(state, calc));
  }

  // === Blatt 2: Berechnung ===
  parts.push(`<div class="brosch__page-break"></div>`);
  parts.push(buildReportHeader());
  parts.push(buildPageHead('Berechnungsgrundlagen', heute, 'subtitle'));
  parts.push(buildBerechnungsgrundlagen(state));
  if (calc.primary && opts.rechenweg !== false){
    parts.push(`<h2 class="brosch__h2">Detaillierte Berechnung</h2>`);
    parts.push(`<p class="brosch__note">Jeder Schritt zeigt Formel, eingesetzte Werte und Zwischenergebnis. Einheiten werden explizit geführt.</p>`);
    parts.push(buildRechenwegDetail(state, calc));
  }
  if (detail && opts.huelle){
    parts.push(`<div class="brosch__page-break"></div>`);
    parts.push(buildReportHeader());
    parts.push(buildPageHead('Gebäudehülle &amp; Räume', heute, 'subtitle'));
    parts.push(buildHuelleTable(state));
    parts.push(buildRaeumeTable(state, calc));
  }
  if (opts.foerder){
    parts.push(`<div class="brosch__page-break"></div>`);
    parts.push(buildReportHeader());
    parts.push(buildPageHead('Förderprogramme &amp; Baubewilligung', heute, 'subtitle'));
    parts.push(buildFoerderTable(state, calc));
  }
  if (opts.notizen){
    parts.push(buildNotizenBlock(state));
  }

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"/>
<title>${esc(projName)} — Auslegungsbericht</title>
<style>${BROSCH_CSS}</style>
</head>
<body class="brosch brosch--report">
${parts.join('\n')}
</body></html>`;
}

/* ======================================================
   BUILDERS — adaptiert aus FWS-Original
   ====================================================== */
function buildReportHeader(){
  return `
    <div class="brosch__header">
      <img class="brosch__header-logo" src="${(typeof location !== 'undefined' && location.href.indexOf('/heizlast') >= 0) ? './img/Logo.png' : 'https://thermowerk.ch/heizlast/img/Logo.png'}" alt="Thermowerk" onerror="this.style.display='none'"/>
      <div class="brosch__header-firm">
        <strong>${esc(FIRMA.name)}</strong>
        <span>${esc(FIRMA.adr)}</span>
        <span>${esc(FIRMA.tel)} · ${esc(FIRMA.email)}</span>
        <span>UID ${esc(FIRMA.uid)}</span>
      </div>
    </div>
  `;
}

function buildPageHead(title, date, variant){
  const cls = variant === 'subtitle' ? 'brosch__page-subtitle' : 'brosch__page-title';
  const tag = variant === 'subtitle' ? 'h2' : 'h1';
  return `<div class="brosch__page-head"><${tag} class="${cls}">${title}</${tag}><span class="brosch__page-head-date">${esc(date)}</span></div>`;
}

function buildKundschaftTable(s){
  const rows = [];
  const p = s.projekt || {};
  if (p.name?.trim()) rows.push(['Projekt', esc(p.name)]);
  if (p.bauherrschaft?.trim()) rows.push(['Bauherrschaft', esc(p.bauherrschaft)]);
  const adr = [p.strasse, [p.plz, p.ort].filter(Boolean).join(' ')].filter(x => x && x.trim());
  if (adr.length) rows.push(['Anschrift', esc(adr.join(', '))]);
  // Gemeinde steht bereits in der Anschrift — hier nur den ausgeschriebenen Kanton.
  if (p.kanton) rows.push(['Kanton', esc(kantonLabel(p.kanton))]);
  if (p.planer?.trim()) rows.push(['Planer / Verfasser', esc(p.planer)]);
  if (!rows.length) return '';
  return `<h2 class="brosch__h2">Kundschaft</h2>
    <table class="brosch__kv-table"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
}

function buildObjektdatenTable(s, c){
  const o = s.objekt || {};
  const rows = [
    ['Gebäudetyp', o.typ === 'efh' ? 'Einfamilienhaus' : 'Mehrfamilienhaus'],
    ['Lage', cap(o.lage)],
    ['Bauperiode', BAUPERIODE_LABEL[o.bauperiode] || '—'],
    ['Sanierungsstand', cap(o.sanierungsstand)],
    ['Energiebezugsfläche EBF', `${fmt(num(o.ebf), 0)} m²`],
    ['Wohneinheiten', String(o.wohneinheiten || 1)],
    ['Auslegungs-Aussentemperatur T<sub>N</sub>', `${fmt(o.tAussenAuslegung, 1)} °C`],
    ['Vorlauf Heizung max. T<sub>VL,H</sub>', `${fmt(o.tVLMaxHeizung, 0)} °C`],
    ['Verbrauch (Basis der Berechnung)', verbrauchBasisText(s, c)]
  ];
  return `<h2 class="brosch__h2">Objektdaten</h2>
    <table class="brosch__kv-table"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
}

// AUDIT 3.12 — Bericht-Logik Hülle/Mixed-Mode.
// Erkennt, ob die Auslegung primär aus Verbrauch (FWS) oder Hülle (EN 12831)
// kommt, und passt Q_hl, Q_w/Q_off und Q_h entsprechend an. Wenn Hülle primär
// ist, wird compute(s, { phiHuelle }) erneut aufgerufen, damit Q_w und Q_off
// auf dem Hüllen-Q_hl basieren.
export function buildLeistungenTable(s, c){
  const detail = !!s?.detail?.aktiv;
  const phiHuelle_kW = (c?.detail?.phiHL_total || 0) / 1000;
  const QhlVerbrauch = Number(c?.Qhl) || 0;
  const verbrauchAktiv = !!s?.heizung?.verbrauchAktiv && c?.primary?.key === 'verbrauch';
  const huelleVorhanden = detail && phiHuelle_kW >= 0.1;

  // Primary-Strategie ableiten und ggf. Cascade mit phiHuelle-Override neu rechnen.
  let primaryQhl = QhlVerbrauch;
  let basisLabel = '';
  let mixedNote = '';
  let cPrimary = c;

  if (verbrauchAktiv && !huelleVorhanden){
    // Fall 1 — Verbrauch primär (heutiger Default)
    primaryQhl = QhlVerbrauch;
    basisLabel = 'aus Verbrauchsmethode (FWS)';
  } else if (huelleVorhanden && !verbrauchAktiv){
    // Fall 2 — Hülle primär (Detail-Modus, kein Verbrauch)
    const A_R = Number(c?.detail?.A_raeume) || 0;
    const A_rest = Number(c?.detail?.A_rest) || 0;
    const phiR_kW   = (Number(c?.detail?.phi_raeume) || 0) / 1000;
    const phiRest_kW = (Number(c?.detail?.phi_rest)  || 0) / 1000;
    // BUG-NEU-1: Mixed-Mode-Label nur wenn echter Pauschal-Rest vorhanden ist
    // (phi_rest > 0.05 kW UND Pauschal-Rest-Toggle nicht explizit aus).
    // Sonst raumweiser EN-12831-Label, auch wenn rein technisch A_rest > 0.
    const restGlobalAus = s?.detail?.misch?.rest_global === false;
    const restRelevant  = !restGlobalAus && phiRest_kW > 0.05;
    if (A_R > 0 && A_rest > 0 && restRelevant){
      basisLabel = 'aus Mixed-Mode-Hüllenberechnung';
      mixedNote  = `Σ Räume ${fmtKW(phiR_kW)} kW + Gebäudehülle ${fmtKW(phiRest_kW)} kW`;
    } else if (A_R > 0){
      basisLabel = 'aus raumweiser EN-12831-Berechnung';
    } else {
      basisLabel = 'aus Pauschal-Hüllenberechnung (EBF × Globalhülle)';
    }
    primaryQhl = phiHuelle_kW;
    // Q_w / Q_off / Q_h aus dem Hüllen-Q_hl neu rechnen.
    try { cPrimary = compute(s, { phiHuelle: phiHuelle_kW }); }
    catch(_){ cPrimary = c; }
  } else if (verbrauchAktiv && huelleVorhanden){
    // Fall 3 — beide aktiv: Verbrauch primär + Hülle als Vergleichswert
    primaryQhl = QhlVerbrauch;
    basisLabel = 'aus Verbrauchsmethode (FWS)';
  } else {
    // Fall 4 — nichts spezifisches (z. B. Bauperioden-Fallback ohne Detail)
    primaryQhl = QhlVerbrauch;
  }

  const rows = [];
  const labelText = basisLabel
    ? `Norm-Heizlast Q<sub>hl</sub> ${basisLabel}`
    : 'Norm-Heizlast Q<sub>hl</sub>';
  rows.push([labelText, `${fmtKW(primaryQhl)} kW`]);
  if (mixedNote){
    rows.push([
      '<span class="brosch__sub">└ Aufschlüsselung</span>',
      `<span class="brosch__sub">${mixedNote}</span>`
    ]);
  }
  if (verbrauchAktiv && huelleVorhanden){
    rows.push(['Vergleichswert Hülle Q<sub>hl,Norm</sub>', `${fmtKW(phiHuelle_kW)} kW`]);
  }
  if (s.zuschlaege?.sperrzeitAktiv) rows.push(['Leistungszuschlag Sperrzeit Q<sub>off</sub>', `${fmtKW(cPrimary.Qoff)} kW`]);
  if (s.warmwasser?.aktiv)          rows.push(['Leistungszuschlag Warmwasser Q<sub>w</sub>',  `${fmtKW(cPrimary.Qw)} kW`]);
  if (s.zuschlaege?.verbundenAktiv) rows.push(['Zuschlag verbundene Systeme Q<sub>as</sub>', `${fmtKW(cPrimary.Qas)} kW`]);
  return `<h2 class="brosch__h2">Dimensionsrelevante Leistungen</h2>
    <table class="brosch__kv-table"><tbody>
      ${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}
      <tr class="is-highlight"><td>Auslegungsleistung Wärmepumpe Q<sub>h</sub></td><td>${fmtKW(cPrimary.Qh)} kW</td></tr>
    </tbody></table>`;
}

function buildDetailCockpitTable(s, c){
  if (!c.detail) return '';
  // Property-Namen aus computeBuildingDetailLoad: Qhl_kW (kW).
  const Qnorm = Number(c.detail.Qhl_kW) || 0;
  const Qfws = Number(c.Qhl) || 0;
  // Wenn keiner der beiden Werte echte Information liefert, Section ganz weg.
  if (Qnorm <= 0 && Qfws <= 0) return '';
  const rows = [];
  if (Qnorm > 0) rows.push(['Norm-Heizlast nach Gebäudehülle (EN 12831) Q<sub>hl,Norm</sub>', `${fmtKW(Qnorm)} kW`]);
  if (Qfws > 0)  rows.push(['Verbrauchs-Heizlast (Schweizer Wärmepumpen-Fachvereinigung) Q<sub>hl,FWS</sub>', `${fmtKW(Qfws)} kW`]);
  if (!rows.length) return '';
  return `<h2 class="brosch__h2">Auslegung-Cockpit · Norm vs. Verbrauch</h2>
    <table class="brosch__kv-table"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
}

function buildSpeicherTable(s, c){
  const showB = s.warmwasser?.aktiv && c.VW_Sto > 0;
  const showP = c.VP_Sto > 0;
  if (!showB && !showP) return '';
  const rows = [];
  if (showB){
    const dT = fmt(num(s.warmwasser.dT) || 50, 0);
    rows.push(['Warmwasserspeicher (empfohlen)', `${c.VW_Sto} Liter (ΔT ${dT} K)`]);
  }
  if (showP) rows.push(['Heizungs-Pufferspeicher (Richtwert)', `${c.VP_Sto} Liter (Abtau-Sicherung L/W-WP)`]);
  return `<h2 class="brosch__h2">Empfohlene Speichervolumen</h2>
    <table class="brosch__kv-table"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
}

function buildGeraeteTable(s, c){
  const wpId = s.geraet?.gewaehlt_id;
  const wp = (getWpDb() || []).find(x => (x.id || x._id) === wpId);
  if (!wp) return '';
  const rows = [
    ['Marke / Modell', `${esc(wp.marke || wp.brand || '')} ${esc(wp.modell || wp.name || wp.id || '')}`],
    ['Aufstellung', esc(wp.aufstellung || '—')],
    ['Quelle',      esc(wp.quelle || '—')],
    ['Q<sub>n</sub> @ A−7/W35', wp?.leistung?.A_minus7_W35 != null ? `${fmtKW(wp.leistung.A_minus7_W35)} kW` : '—'],
    ['COP @ A2/W35', wp?.leistung?.COP_A2_W35 != null ? fmt(wp.leistung.COP_A2_W35, 2) : '—'],
    ['T<sub>VL,max</sub>', wp.tvl_max != null ? `${fmt(wp.tvl_max, 0)} °C` : '—'],
    ['Schalldruck Tag (1 m)', wp.schall_db != null ? `${fmt(wp.schall_db, 0)} dB(A)` : '—']
  ];
  if (c.heatpump){
    if (c.heatpump.bivalenz_T  != null) rows.push(['Bivalenzpunkt',  `${fmt(c.heatpump.bivalenz_T, 1)} °C`]);
    if (c.heatpump.jaz_est     != null) rows.push(['JAZ-Schätzung',  fmt(c.heatpump.jaz_est, 2)]);
    if (c.heatpump.deckung_proz != null) rows.push(['Q<sub>n</sub>/Q<sub>h</sub>-Deckung', `${fmt(c.heatpump.deckung_proz, 0)} %`]);
  }
  return `<h2 class="brosch__h2">Gewählte Wärmepumpe</h2>
    <table class="brosch__kv-table"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
}

function buildHuelleTable(s){
  const det = s.detail?.huelle || {};
  const types = ['wand','fenster','dach','boden','tueren'];
  const labels = { wand:'Aussenwand', fenster:'Fenster', dach:'Dach', boden:'Boden', tueren:'Türen' };
  const rows = types.map(k => {
    const slot = det[k] || {};
    const fakeB = { typ: k, variant: slot.variant || 'unbekannt', layers: slot.layers,
      u_override: slot.u_user, anschluss: ANSCHLUSS_DEF[k],
      dach_variant: slot.dach_variant, fenster_gen: slot.fenster_gen, fenster_rahmen: slot.fenster_rahmen };
    let u = '—', src = '';
    try { const r = resolveBauteilUFrt(s, fakeB); u = `${fmt(r.u, 2)} W/(m²·K)`; src = r.source || ''; } catch(_){}
    return [labels[k], u, src];
  });
  return `<h2 class="brosch__h2">Globale Hülle (Defaults für Räume)</h2>
    <table class="brosch__kv-table brosch__kv-table--3col"><thead><tr><th>Bauteil</th><th>U-Wert</th><th>Quelle</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table>`;
}
const ANSCHLUSS_DEF = { wand:'aussenluft', dach:'aussenluft', fenster:'aussenluft', tueren:'aussenluft', boden:'erdreich' };

function buildRaeumeTable(s, c){
  const raeume = s.detail?.raeume || [];
  if (!raeume.length) return `<p class="brosch__note">Keine Räume erfasst — Heizlast wurde rein pauschal über die EBF gerechnet.</p>`;
  const rows = raeume.map((r, i) => {
    const A_eff = (Number(r.A) || (Number(r.l) > 0 && Number(r.b) > 0 ? Number(r.l) * Number(r.b) : 0));
    const tInt = r.theta_int || '—';
    const beheizt = r.beheizt === false ? 'nein' : 'ja';
    const phi = c.detail?.roomResults?.[i]?.phiHL;
    const phiTxt = (phi != null && Number.isFinite(phi)) ? `${fmt(phi/1000, 2)} kW` : '—';
    return `<tr><td>${i+1}</td><td>${esc(r.name || '—')}</td><td>${fmt(A_eff,1)} m²</td><td>${tInt} °C</td><td>${beheizt}</td><td>${phiTxt}</td></tr>`;
  }).join('');
  const sum = c.detail ? `<tr class="is-highlight"><td colspan="5">Σ Raumweise + Gebäudehülle</td><td>${fmtKW(c.detail.Qhl_kW)} kW</td></tr>` : '';
  return `<h2 class="brosch__h2">Räume</h2>
    <table class="brosch__kv-table brosch__kv-table--6col"><thead><tr><th>#</th><th>Name</th><th>Fläche</th><th>θ<sub>int</sub></th><th>beheizt</th><th>Φ<sub>HL</sub></th></tr></thead>
    <tbody>${rows}${sum}</tbody></table>`;
}

function buildFoerderTable(s, c){
  const db = getFoerderDb();
  const bauDb = getBauDb();
  if (!db) return `<p class="brosch__note">Förder-Datenbank nicht verfügbar.</p>`;
  // Wichtige Ctx-Keys: schaetzeBetrag liest `Qh_kW` (chf/kW) und
  // `A_bauteil_m2`/`kollektor_m2`/`kWp` (chf/m² etc.). Die alte Variante mit
  // `Qh` führte dazu, dass pro-Programm-Schätzungen leer blieben, obwohl der
  // Total > 0 war (Pauschalprogramme).
  const ctx = {
    Qh_kW: c.Qh || 0,
    A_bauteil_m2: 0,
    kollektor_m2: 0,
    kWp: 0,
    objekt: { ebf: num(s.objekt?.ebf) },
    detail: { huelle: {} }
  };
  let progs = [];
  try {
    progs = filterFoerderungen(db, {
      kanton: s.projekt?.kanton, massnahme: s.projekt?.massnahme, wp_quelle: s.projekt?.wp_quelle
    });
  } catch(e){}
  if (!progs.length) return `<p class="brosch__note">Keine passenden Förderprogramme gefunden — Kanton/Massnahme prüfen.</p>`;
  let total = 0;
  try { const g = gruppiereProgramme(progs, ctx); total = g.total_geschaetzt || 0; } catch(_){}
  const rows = progs.map(p => {
    let betr = null;
    try { betr = schaetzeBetrag(p, ctx); } catch(_){}
    const beitragText = (p.beitrag?.text || '').trim();
    const schaetzText = (betr != null && Number.isFinite(betr) && betr > 0)
      ? '≈ CHF ' + fmt(betr, 0) : '';
    // Spalten zusammenführen: wenn Schätzung > 0 zeigen, sonst nur Beitragstext.
    const cell = schaetzText
      ? (beitragText ? `${esc(beitragText)} · <strong>${schaetzText}</strong>` : `<strong>${schaetzText}</strong>`)
      : (beitragText || '—');
    return `<tr><td>${esc(p.ebene === 'bund' ? 'Bund' : kantonLabel(p.kanton || ''))}</td><td>${esc(p.name)}</td><td>${cell}</td></tr>`;
  }).join('');
  // Baubewilligung: Erdsonde komplett ausgeblendet (Daniel macht keine Sonden);
  // LSV-Zeile nur wenn echter Hinweis vorhanden ist; ganze Section nur wenn
  // mindestens eine Zeile etwas Sinnvolles enthält.
  let bewBox = '';
  if (bauDb && s.projekt?.kanton){
    const b = lookupBaubewilligung(bauDb, s.projekt.kanton);
    if (b){
      const bewRows = [];
      if (b.heizungsersatz){
        // Daten-Schema: bewilligungspflichtig (bool), kurz / details / frist (string).
        // Aufgeteilt in mehrere Zeilen, damit "Bewilligungspflicht / Hinweis /
        // Frist" sauber lesbar bleiben. Der `kurz`-Text beginnt in einigen
        // Kantonen bereits mit "Bewilligungspflichtig" — wir strippen das
        // Wort vorne, damit es nicht doppelt erscheint.
        const pflicht = !!b.heizungsersatz.bewilligungspflichtig;
        const status = pflicht ? 'Bewilligungspflichtig' : 'Meldepflichtig';
        bewRows.push(['Heizungsersatz', '<strong>' + status + '</strong>']);
        let kurz = (b.heizungsersatz.kurz || '').trim();
        kurz = kurz.replace(/^(Bewilligungs?pflichtig|Meldepflichtig|bewilligungs?pflichtig|meldepflichtig)[\s\.\:\-—()a-zäöü]*?\.?\s*/i, '').trim();
        if (kurz) bewRows.push(['Hinweis', esc(kurz)]);
        const details = (b.heizungsersatz.details || '').trim();
        if (details && details !== kurz) bewRows.push(['Detail', esc(details)]);
        if (b.heizungsersatz.frist){
          bewRows.push(['Frist', '<em>' + esc(b.heizungsersatz.frist) + '</em>']);
        }
      }
      const lswHinweis = (b.lwwp_aussen?.details || b.lwwp?.hinweis || '').trim();
      if (lswHinweis && lswHinweis !== '—'){
        bewRows.push(['Lärmschutz Luft/Wasser-WP', esc(lswHinweis)]);
      }
      if (bewRows.length){
        bewBox = `<h2 class="brosch__h2">Baubewilligung — ${esc(kantonLabel(s.projekt.kanton))}</h2>
          <table class="brosch__kv-table"><tbody>${bewRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
      }
    }
  }
  return `<h2 class="brosch__h2">Förderprogramme · ${esc(kantonLabel(s.projekt?.kanton) || '—')}</h2>
    <table class="brosch__kv-table brosch__kv-table--3col"><thead><tr><th>Ebene</th><th>Programm</th><th>Beitrag (geschätzt)</th></tr></thead><tbody>${rows}</tbody></table>
    ${total > 0 ? `<p class="brosch__note"><strong>Total Schätzung:</strong> ≈ CHF ${fmt(total, 0)} (Bund + Kanton, in der Regel kombinierbar)</p>` : ''}
    ${bewBox}
    <p class="brosch__footnote">Förder-Beträge sind Richtwerte — verbindlich nur über das jeweilige Antragsportal. Antrag VOR Baubeginn stellen.</p>`;
}

function buildBerechnungsgrundlagen(s){
  // Detail-Block nur ausweisen, wenn der Detail-Modus auch wirklich gerechnet
  // wurde. Sonst genügt der Verbrauchspfad.
  const detail = !!s?.detail?.aktiv;
  const detailLine = detail
    ? `<p class="brosch__note">SIA 384/1:2022 / EN 12831 (raumweise Norm-Heizlast), SIA 385/1:2020 (Warmwasser), VDI 4645 (Pufferspeicher).</p>`
    : '';
  return `<p class="brosch__note">Die Heizlast wurde nach dem Verbrauchsverfahren gemäss Schweizer Wärmepumpen-Fachvereinigung ermittelt. Leistungszuschläge für Sperrzeiten und Warmwasserbereitung folgen denselben Grundlagen.</p>
    ${detailLine}
    <p class="brosch__footnote">Die berechneten Werte basieren auf den vom Kunden/Planer zur Verfügung gestellten Angaben (Brennstoffverbrauch, Gebäudekennwerte, Sanierungszustand, Bauteile). Abweichungen im Nutzerverhalten oder in der Gebäudehülle können das Ergebnis beeinflussen.</p>`;
}

/* ======================================================
   Detaillierter Rechenweg (FWS-Style mit Formeln)
   ====================================================== */
function buildRechenwegDetail(s, c){
  const out = [];
  const primary = c.primary;
  const tv = effectiveTvoll(s);
  const tvA = tvollAuto(s);
  out.push(`<div class="brosch__calc-step">
    <div class="brosch__calc-title">1 · Vollbetriebsstunden t<sub>voll</sub></div>
    <div class="brosch__calc-list">Gebäudetyp = <code>${esc(s.objekt.typ.toUpperCase())}</code> · Lage = <code>${esc(s.objekt.lage)}</code> · WW-Betrieb = <code>${s.warmwasser.aktiv?'mit':'ohne'}</code></div>
    <span class="brosch__calc-formula">t<sub>voll,auto</sub> = FWS-Tabelle(${esc(s.objekt.typ.toUpperCase())}, ${esc(s.objekt.lage)}) = <strong>${fmt(tvA,0)} h/a</strong>${num(s.heizung.tvollOverride)>0?` · Override = ${fmt(num(s.heizung.tvollOverride),0)} h/a`:''}</span>
    <div class="brosch__calc-result">t<sub>voll</sub> = ${fmt(tv,0)} h/a</div>
  </div>`);
  if (primary && primary.key === 'verbrauch' && s.heizung.perioden.length){
    const rows = s.heizung.perioden.map((p, i) => {
      const h = HEIZWERT[p.energy]; if (!h) return '';
      const menge = num(p.menge); if (menge <= 0) return `<li>Periode ${i+1} — <em>keine Menge erfasst</em></li>`;
      const d = periodDays(p);
      const annual = menge * (365/d);
      const eta = periodEta(p);
      const Qn_i = annual * h.Ho * eta;
      const scaled = d !== 365;
      return `<div class="brosch__calc-step brosch__calc-step--accent" style="margin:8px 0 8px 12px; padding:8px 12px;">
        <div class="brosch__calc-subtitle">Periode ${i+1}: ${esc(h.name)}</div>
        <ul class="brosch__calc-list">
          <li>Mess-Menge = <code>${fmt(menge,1)} ${esc(h.unit)}</code>${p.von&&p.bis?` · Zeitraum <code>${esc(p.von)} … ${esc(p.bis)}</code> = <code>${d} d</code>`:` · Annahme <code>365 d</code>`}</li>
          ${scaled?`<li>Annualisierung: ${fmt(menge,1)} × (365/${d}) = <code>${fmt(annual,1)} ${esc(h.unit)}/a</code></li>`:`<li>Annualisierte Menge = <code>${fmt(annual,1)} ${esc(h.unit)}/a</code></li>`}
          <li>Heizwert = <code>${h.Ho} kWh/${esc(h.unit)}</code> · η = <code>${fmt(eta,3)}</code></li>
        </ul>
        <span class="brosch__calc-formula">Q<sub>n,${i+1}</sub> = ${fmt(annual,1)} × ${h.Ho} × ${fmt(eta,3)} = <strong>${fmtKWh(Qn_i)} kWh/a</strong></span>
      </div>`;
    }).join('');
    out.push(`<div class="brosch__calc-step">
      <div class="brosch__calc-title">2 · Brennstoff-Verbrauch → Q<sub>n</sub> (Bruttoenergie)</div>
      <span class="brosch__calc-formula">Q<sub>n</sub> = Σ [ Menge × (365 / T<sub>Mess</sub>) × H × η ]</span>
      ${rows}
      <div class="brosch__calc-result">Σ Q<sub>n</sub> = ${fmtKWh(primary.Qn)} kWh/a</div>
    </div>`);
  }
  if (primary && primary.key === 'betriebsstunden'){
    const kwh = num(s.heizung.bstd_kwh), std = num(s.heizung.bstd_stunden), cop = num(s.heizung.bstd_cop)||1;
    out.push(`<div class="brosch__calc-step"><div class="brosch__calc-title">2 · Methode B — WP-Betriebsstunden</div>
      <ul class="brosch__calc-list"><li>Strombezug = <code>${fmtKWh(kwh)} kWh/a</code> · Stunden = <code>${fmt(std,0)} h</code> · COP = <code>${fmt(cop,2)}</code></li></ul>
      <span class="brosch__calc-formula">Q<sub>n,H</sub> = ${fmtKWh(kwh)} × ${fmt(cop,2)} = <strong>${fmtKWh(primary.QnH)} kWh/a</strong></span></div>`);
  }
  if (primary && primary.key === 'kwh'){
    out.push(`<div class="brosch__calc-step"><div class="brosch__calc-title">2 · Methode C — Nutzenergie direkt</div>
      <span class="brosch__calc-formula">Q<sub>n,H</sub> = <strong>${fmtKWh(primary.QnH)} kWh/a</strong></span></div>`);
  }
  // Step 3 — Warmwasser
  const showWW = s.warmwasser.aktiv || (s.heizung.verbrauchInklWW && primary && primary.QnWW > 0);
  if (showWW){
    const V = effectiveVWu(s);
    const cp = 4.2, dT = num(s.warmwasser.dT) || 50;
    const perDay = V*cp*dT/3600;
    const perYear = perDay * 365;
    const fS = num(s.warmwasser.speicherverluste)/100;
    const fZ = num(s.warmwasser.zirkulation)/100;
    const fA = num(s.warmwasser.ausstoss)/100;
    const pf = (1+fS)*(1+fZ)*(1+fA);
    const QnWW = perYear * pf;
    const vLine = s.warmwasser.modus === 'personen'
      ? `${num(s.warmwasser.personen)} P × ${num(s.warmwasser.lProPerson)||40} l/(P·d) = <code>${fmt(V,0)} l/d</code>`
      : `direkt eingegeben = <code>${fmt(V,0)} l/d</code>`;
    out.push(`<div class="brosch__calc-step"><div class="brosch__calc-title">3 · Warmwasser-Nutzenergie Q<sub>n,WW</sub></div>
      <ul class="brosch__calc-list">
        <li>V<sub>W,u</sub>: ${vLine}</li>
        <li>Tages-Nutzenergie: ${fmt(V,0)} × 4.2 × ${dT} / 3600 = <code>${fmtKWh(perDay)} kWh/d</code></li>
        <li>× 365 d → <code>${fmtKWh(perYear)} kWh/a</code> · Verlust-Faktor (1+${fS.toFixed(2)})·(1+${fZ.toFixed(2)})·(1+${fA.toFixed(2)}) = <code>${pf.toFixed(3)}</code></li>
      </ul>
      <span class="brosch__calc-formula">Q<sub>n,WW</sub> = V × c<sub>p</sub> × ΔT × 365 / 3600 × Π(1+f) = <strong>${fmtKWh(QnWW)} kWh/a</strong></span></div>`);
  }
  // Step 4 — QnH
  if (primary){
    const inclWW = s.heizung.verbrauchInklWW && primary.key==='verbrauch' && primary.QnWW > 0;
    out.push(`<div class="brosch__calc-step"><div class="brosch__calc-title">4 · Heizanteil Q<sub>n,H</sub></div>
      ${inclWW
        ? `<span class="brosch__calc-formula">Q<sub>n,H</sub> = Q<sub>n</sub> − Q<sub>n,WW</sub> = ${fmtKWh(primary.Qn)} − ${fmtKWh(primary.QnWW)} = <strong>${fmtKWh(primary.QnH)} kWh/a</strong></span>`
        : `<span class="brosch__calc-formula">Q<sub>n,H</sub> = <strong>${fmtKWh(primary.QnH)} kWh/a</strong>${primary.key==='verbrauch'?' (Verbrauch enthält kein WW)':''}</span>`}
      </div>`);
    out.push(`<div class="brosch__calc-step"><div class="brosch__calc-title">5 · Norm-Heizlast roh Q<sub>hl,roh</sub></div>
      <span class="brosch__calc-formula">Q<sub>hl,roh</sub> = Q<sub>n,H</sub> / t<sub>voll</sub> = ${fmtKWh(primary.QnH)} / ${fmt(primary.tvoll,0)} = <strong>${fmtKW(primary.Qhl_roh)} kW</strong></span>
      <p class="brosch__calc-note">Einheiten: kWh/a ÷ h/a = kW.</p></div>`);
  }
  // Step 6 — Sanierungsfaktor
  if (primary){
    const f = sanFactor(s);
    out.push(`<div class="brosch__calc-step"><div class="brosch__calc-title">6 · Sanierungsfaktor</div>
      <span class="brosch__calc-formula">Faktor = <strong>${f.toFixed(4)}</strong> · Q<sub>hl</sub> = Q<sub>hl,roh</sub> × ${f.toFixed(4)} = <strong>${fmtKW(primary.Qhl)} kW</strong></span></div>`);
  }
  // Step 7 — Q_w
  if (s.warmwasser.aktiv && primary){
    out.push(`<div class="brosch__calc-step"><div class="brosch__calc-title">7 · Warmwasser-Nachheizung Q<sub>w</sub></div>
      <span class="brosch__calc-formula">Q<sub>w</sub> = Q<sub>hl</sub> × (24/(24 − t<sub>d</sub>) − 1) = <strong>${fmtKW(c.Qw)} kW</strong></span></div>`);
  }
  // Step 8 — Q_off
  if (s.zuschlaege.sperrzeitAktiv){
    const ov = num(s.zuschlaege.toffOverride);
    const toff = ov > 0 ? ov : (TOFF_DEFAULTS[s.zuschlaege.sperrzeitTyp] || 0);
    out.push(`<div class="brosch__calc-step"><div class="brosch__calc-title">8 · EVU-Sperrzeit Q<sub>off</sub></div>
      <span class="brosch__calc-formula">t<sub>off</sub> = ${toff} h/d · Q<sub>off</sub> = Q<sub>hl</sub> × (24/(24 − ${toff}) − 1) = <strong>${fmtKW(c.Qoff)} kW</strong></span></div>`);
  }
  // Step Final
  out.push(`<div class="brosch__calc-step brosch__calc-step--accent">
    <div class="brosch__calc-title">∑ · WP-Auslegungsleistung Q<sub>h</sub></div>
    <span class="brosch__calc-formula">Q<sub>h</sub> = ${fmtKW(c.Qhl)} + ${fmtKW(c.Qw)} + ${fmtKW(c.Qoff)} + ${fmtKW(c.Qas)} = <strong>${fmtKW(c.Qh)} kW</strong></span>
    <div class="brosch__calc-result">Q<sub>h</sub> = ${fmtKW(c.Qh)} kW</div></div>`);
  return out.join('');
}

function buildNotizenBlock(s){
  const n = s.notes || {};
  const order = [
    ['Stammdaten', n.stamm], ['Hülle', n.huelle], ['Räume', n.raeume],
    ['Warmwasser', n.ww], ['Wärmeübergabe', n.verteilung],
    ['Zuschläge', n.zuschlaege], ['Heizlast', n.heizlast],
    ['Speicher · Puffer · MAG', n.speicher], ['Gerät', n.geraet],
    ['Förderungen', n.foerder], ['Baubewilligung', n.bau]
  ].filter(([_, t]) => t && String(t).trim());
  const raum = (s.detail?.raeume || []).map((r, i) => [r.name || ('Raum ' + (i+1)), r.notiz]).filter(([_, t]) => t && String(t).trim());
  if (!order.length && !raum.length) return '';
  let html = `<div class="brosch__page-break"></div>${buildReportHeader()}${buildPageHead('Notizen', new Date().toLocaleDateString('de-CH'), 'subtitle')}`;
  order.forEach(([k, v]) => {
    html += `<div class="brosch__note-block"><strong>${esc(k)}</strong><p>${esc(v).replace(/\n/g,'<br>')}</p></div>`;
  });
  if (raum.length) html += `<h2 class="brosch__h2">Raum-Notizen</h2>`;
  raum.forEach(([k, v]) => {
    html += `<div class="brosch__note-block"><strong>${esc(k)}</strong><p>${esc(v).replace(/\n/g,'<br>')}</p></div>`;
  });
  return html;
}

/* ======================================================
   Helpers
   ====================================================== */
function verbrauchBasisText(s, c){
  const p = c.primary; if (!p) return '— (keine Methode aktiv)';
  if (p.key === 'verbrauch'){
    const parts = (s.heizung.perioden||[]).filter(x => num(x.menge) > 0).map(x => {
      const h = HEIZWERT[x.energy]; const d = periodDays(x);
      return `${fmt(num(x.menge)*(365/d), 0)} ${h?h.unit:''}/a ${h?h.name:x.energy}`;
    });
    return parts.length ? esc(parts.join(' + ')) : '— (keine Menge erfasst)';
  }
  if (p.key === 'betriebsstunden') return `${fmtKWh(num(s.heizung.bstd_kwh))} kWh/a Strombezug · COP ${fmt(num(s.heizung.bstd_cop), 2)}`;
  if (p.key === 'kwh') return `${fmtKWh(num(s.heizung.kwhManual))} kWh/a Nutzenergie (direkt)`;
  if (p.key === 'bauperiode') return `Bauperioden-Schätzung · ${BAUPERIODE_LABEL[s.objekt.bauperiode] || '—'}`;
  return '—';
}
function periodDays(p){ if (!p.von || !p.bis) return 365; const dv = new Date(p.von), db = new Date(p.bis); if (isNaN(dv) || isNaN(db)) return 365; const d = Math.round((db-dv)/86400000)+1; return d>0?d:365; }
function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmt(v, d=2){ const n = Number(v); if (!Number.isFinite(n)) return '–'; return n.toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function fmtKW(v){ return fmt(v, 2); }
function fmtKWh(v){ return fmt(v, 0); }
function cap(s){ return String(s||'').charAt(0).toUpperCase() + String(s||'').slice(1); }
function esc(s){ return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function blob(content, mime){ return new Blob([content], { type: mime }); }
function download(b, filename){
  const a = document.createElement('a'); const url = URL.createObjectURL(b);
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
}
function buildFilename(meta, ext){
  const safe = (meta.name || 'Heizlast').replace(/[^\wäöüÄÖÜß\-]+/g, '_').slice(0, 40) || 'Heizlast';
  const today = new Date().toISOString().slice(0, 10);
  return `${safe}_${today}.${ext}`;
}
function stripFunctions(obj){ try { return JSON.parse(JSON.stringify(obj)); } catch(_){ return null; } }

/* ======================================================
   Brosch-CSS — komplett inline (Standalone-HTML-fähig)
   ====================================================== */
const BROSCH_CSS = `
:root {
  --ink-0:#fff; --ink-50:#f7f9fb; --ink-100:#eef2f6; --ink-200:#e2e8f0;
  --ink-300:#cbd5e1; --ink-400:#94a3b8; --ink-500:#64748b; --ink-600:#475569;
  --ink-700:#334155; --ink-800:#1e293b; --ink-900:#0f172a;
  --navy:#1B2A4A; --accent:#D93025; --accent-ink:#B71C1C;
  --r-sm:2px; --r-md:3px;
}
* { box-sizing:border-box; }
body { font-family:'Inter','Segoe UI',Roboto,sans-serif; color:var(--ink-900); margin:0; background:#fff; }
.brosch { max-width:880px; margin:0 auto; padding:8mm 8mm; display:flex; flex-direction:column; gap:0; background:#fff; }
.brosch--report { padding:6mm 6mm; max-width:860px; }
.brosch__page-break { page-break-before:always; break-before:page; height:0; }

.brosch__header {
  display:flex; align-items:flex-start; justify-content:space-between;
  gap:18px; padding:0 0 6px; margin:0 0 4px;
  border-bottom:2px solid var(--ink-900);
}
.brosch__header-logo { max-height:42px; width:auto; display:block; flex-shrink:0; }
.brosch__header-firm {
  flex:1; display:flex; flex-direction:column; gap:1px;
  font-size:8.5pt; color:var(--ink-600); line-height:1.35;
  text-align:right; align-items:flex-end;
}
.brosch__header-firm strong { color:var(--ink-900); font-size:9pt; font-weight:700; }

.brosch__page-head {
  display:flex; align-items:baseline; justify-content:space-between;
  gap:16px; margin:14px 0 8px; padding:0;
}
.brosch__page-head-date {
  font-size:10pt; color:var(--ink-700); white-space:nowrap;
  font-variant-numeric:tabular-nums;
}
.brosch__page-title {
  font-size:17pt; font-weight:700; color:var(--accent);
  margin:0; padding:0; letter-spacing:0.01em; line-height:1.2;
}
.brosch__page-subtitle {
  font-size:11.5pt; font-weight:700; color:var(--ink-900);
  margin:0; padding:0; line-height:1.25;
}

.brosch__h2 {
  font-size:11.5pt; font-weight:700; color:var(--ink-900);
  margin:14px 0 6px; padding-bottom:4px;
  border-bottom:1px solid var(--ink-300);
}

.brosch__kv-table { width:100%; border-collapse:collapse; font-size:9.5pt; margin:0 0 6px; }
.brosch__kv-table td, .brosch__kv-table th {
  padding:3px 4px; border-bottom:1px solid var(--ink-100);
  color:var(--ink-700); vertical-align:baseline; line-height:1.3;
}
.brosch__kv-table th {
  text-align:left; color:var(--ink-500); font-size:8.5pt;
  text-transform:uppercase; letter-spacing:0.04em; font-weight:600;
  border-bottom:2px solid var(--ink-300);
}
.brosch__kv-table td:last-child {
  text-align:right; font-weight:600; color:var(--ink-900);
  font-variant-numeric:tabular-nums;
}
.brosch__kv-table--3col td:nth-child(2),
.brosch__kv-table--4col td:nth-child(2),
.brosch__kv-table--6col td:nth-child(2) {
  text-align:left; font-weight:500; color:var(--ink-900);
}
.brosch__kv-table--6col td { font-size:9pt; }
.brosch__kv-table tr.is-highlight td {
  background:var(--accent); color:#fff; font-weight:800;
  border:none; padding:10px 12px; font-size:12pt; letter-spacing:0.2px;
}
.brosch__kv-table tr.is-highlight td:last-child { font-size:15pt; color:#fff; }

.brosch__note { font-size:9pt; color:var(--ink-700); line-height:1.5; margin:0 0 6px; }
.brosch__footnote {
  font-size:8pt; color:var(--ink-500); line-height:1.4;
  margin-top:8px; padding-top:6px; border-top:1px solid var(--ink-100);
}

.brosch__ampel { display:inline-block; padding:2px 8px; border-radius:var(--r-sm); font-size:9pt; font-weight:700; color:#fff; }
.brosch__ampel--gruen { background:#16a34a; }
.brosch__ampel--gelb  { background:#d97706; }
.brosch__ampel--rot   { background:var(--accent); }
.brosch__ampel--grau  { background:var(--ink-500); }

.brosch__note-block { margin:8px 0; padding:6px 10px; border-left:3px solid var(--ink-300); background:var(--ink-50); }
.brosch__note-block strong { color:var(--navy); font-size:10pt; }
.brosch__note-block p { margin:3px 0 0; font-size:9.5pt; color:var(--ink-700); white-space:pre-wrap; }

/* Rechenweg */
.brosch__calc-step {
  margin:8px 0; padding:8px 12px 10px;
  background:var(--ink-50); border-left:3px solid var(--ink-900);
  border-radius:0 var(--r-sm) var(--r-sm) 0;
  page-break-inside:avoid;
}
.brosch__calc-step--accent { border-left-color:var(--accent); }
.brosch__calc-title { font-size:10.5pt; font-weight:700; color:var(--ink-900); margin:0 0 4px; }
.brosch__calc-subtitle { margin:6px 0 3px; font-size:10pt; font-weight:600; color:var(--ink-900); }
.brosch__calc-formula {
  font-family:ui-monospace,'SF Mono',Consolas,monospace;
  font-size:9.5pt; color:var(--ink-700); background:#fff;
  border:1px dashed var(--ink-300); border-radius:var(--r-sm);
  padding:4px 8px; margin:2px 0; display:block;
  font-variant-numeric:tabular-nums; white-space:pre-wrap;
}
.brosch__calc-formula strong { color:var(--ink-900); }
.brosch__calc-list { margin:3px 0 4px 16px; padding:0; font-size:9.5pt; color:var(--ink-700); line-height:1.5; }
.brosch__calc-list li { margin-bottom:2px; }
.brosch__calc-list code { font-family:ui-monospace,'SF Mono',Consolas,monospace; color:var(--ink-900); font-weight:600; }
.brosch__calc-result {
  margin-top:6px; padding:5px 10px; background:var(--ink-900); color:#fff;
  border-radius:var(--r-sm); font-size:10pt; font-weight:600;
  font-variant-numeric:tabular-nums; display:inline-block;
}
.brosch__calc-note { font-size:8.5pt; color:var(--ink-500); margin:3px 0 0; font-style:italic; }

@media print {
  @page { margin:10mm 10mm; size:A4; }
  body { background:#fff; }
  .brosch { padding:0; max-width:none; }
}
`;
