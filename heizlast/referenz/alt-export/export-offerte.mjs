// src/export-offerte.mjs
// Session 3 (2026-04-29) — Offerten-PDF-Export.
//
// Eigenes Modul mit eigenem Layout (separat vom Auslegungsbericht aus
// export.mjs). Wird aus export.mjs aufgerufen, wenn Daniel im Export-Modal
// "Offerte PDF" wählt.
//
// Verantwortet:
//   - buildOfferteHtml(state, calc, opts)  → standalone HTML-String fuer Browser-Print
//   - buildCustomPositionenMd(state, opts) → Markdown-Stammdaten-Patch der Custom-Posten
//   - exportOfferte(state, calc, opts)     → oeffnet Print-Tab + lädt MD-Datei
//
// Layout der Offerte:
//   1. Briefkopf (Logo + Firma + UID)
//   2. Empfaenger-Adresse aus state.projekt
//   3. Anrede + Einleitungstext
//   4. Positionstabelle gruppiert nach Kategorie A–L (nur nicht-leere)
//   5. Subtotal Fix → Prozent-Posten → Netto-Subtotal → MwSt 8.1 % → Brutto
//      → Förderung-Abzug → Netto-Investition Bauherrschaft
//   6. Zahlungsplan (Daniel waehlt aus 3 Vorlagen, Default "klassisch")
//   7. AGB-Block (Verweis OR 2026 + SIA 118 Korrigenda)
//   8. Garantie-Block (Werkleistung 2 J + Hersteller-Garantie pro verbautem Geraet)
//   9. Bank-Footer (UID + Bank + Kontakt)
//
// @see OFFERTEN-GAMEPLAN.md Session 3
// @see SYNTHESE.md §3 (OR 2026 / SIA 118 Korrigenda)

import { computePaketSubtotal, applyTaxAndFoerderung } from './calc/offerte.mjs';
import { getActiveMeta } from './persistence.mjs';

const FIRMA = {
  name:  'Gebäudetechnik Coltouan',
  adr:   'Rankstrasse 18, 8413 Neftenbach',
  tel:   '+41 76 504 03 68',
  email: 'info@thermowerk.ch',
  web:   'thermowerk.ch',
  uid:   'CHE-489.162.528',
  bank_name: 'Raiffeisenbank Winterthur',
  bank_iban: 'CH00 0000 0000 0000 0000 0',
  bank_bic:  'RAIFCH22'
};

// 3 Zahlungsplan-Vorlagen (Research §5)
export const ZAHLUNGSPLAENE = {
  klassisch: {
    label: 'Klassisch (30 / 60 / 10)',
    raten: [
      { pct: 30,  text: 'Bei Auftragsbestätigung' },
      { pct: 60,  text: 'Bei Materiallieferung auf Baustelle' },
      { pct: 10,  text: 'Nach Abnahme + Inbetriebnahme-Protokoll' }
    ]
  },
  drittel: {
    label: 'Drittel (33 / 33 / 34)',
    raten: [
      { pct: 33, text: 'Bei Auftragsbestätigung' },
      { pct: 33, text: 'Bei Beginn der Montagearbeiten' },
      { pct: 34, text: 'Nach Abnahme + Inbetriebnahme-Protokoll' }
    ]
  },
  schluss: {
    label: 'Schluss (50 / 50)',
    raten: [
      { pct: 50, text: 'Bei Auftragsbestätigung' },
      { pct: 50, text: 'Nach Abnahme + Inbetriebnahme-Protokoll' }
    ]
  }
};

const KATEGORIEN_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// ───────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────

/**
 * Baut den vollstaendigen HTML-String der Offerte (standalone, inline-CSS).
 * @param {object} state  - vollstaendiger State
 * @param {object} calc   - compute()-Resultat (optional, fuer WP-Modell)
 * @param {object} opts   - { zahlungsplan?: 'klassisch'|'drittel'|'schluss', anrede?, einleitung? }
 * @returns {string} HTML-Dokument
 */
export function buildOfferteHtml(state, calc, opts){
  opts = opts || {};
  const offerte = (state && state.offerte) || {};
  const positionen = Array.isArray(offerte.positionen) ? offerte.positionen : [];

  const totals = computeTotals({
    positionen,
    mwst_pct: typeof offerte.mwst_pct === 'number' ? offerte.mwst_pct : 8.1,
    foerderung_chf: typeof offerte.foerderung_chf === 'number' ? offerte.foerderung_chf : 0
  });

  const heute = new Date().toLocaleDateString('de-CH');
  const meta = safeActiveMeta();
  const projName = (state.projekt && state.projekt.name) || (meta && meta.name) || 'Heizlast-Projekt';
  const offerteNr = buildOfferteNumber(meta);
  const zahlungsplanKey = opts.zahlungsplan || 'klassisch';
  const zahlungsplan = ZAHLUNGSPLAENE[zahlungsplanKey] || ZAHLUNGSPLAENE.klassisch;
  const anrede = opts.anrede || defaultAnrede(state);
  const einleitung = opts.einleitung || defaultEinleitung(state);

  const parts = [];
  parts.push(buildBriefkopf());
  parts.push(buildAdressblock(state, offerteNr, heute));
  parts.push(buildAnrede(anrede, einleitung, projName));
  parts.push(buildPositionstabelle(positionen));
  parts.push(buildTotalsTable(totals));
  parts.push(buildZahlungsplan(zahlungsplan, totals));
  parts.push(buildGarantieBlock(positionen));
  parts.push(buildAgbBlock());
  parts.push(buildBankFooter());

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"/>
<title>Offerte ${escapeHtml(offerteNr)} — ${escapeHtml(projName)}</title>
<style>${OFFERTE_CSS}</style>
</head>
<body class="off">
${parts.join('\n')}
</body></html>`;
}

/**
 * Baut den Markdown-Patch für alle Custom-Positionen (_isCustom: true).
 * Format: ein YAML-aehnlicher Block pro Position, den Claude in
 * data/offerten-positionen.json einpflegen kann.
 *
 * @param {object} state
 * @returns {string} Markdown
 */
export function buildCustomPositionenMd(state){
  const offerte = (state && state.offerte) || {};
  const customs = (Array.isArray(offerte.positionen) ? offerte.positionen : [])
                  .filter(p => p && p._isCustom);
  const heute = new Date().toLocaleDateString('de-CH');
  const projName = (state.projekt && state.projekt.name) || 'Heizlast-Projekt';
  const lines = [];
  lines.push(`# Custom-Positionen aus Offerte`);
  lines.push('');
  lines.push(`**Projekt:** ${projName}`);
  lines.push(`**Erstellt:** ${heute}`);
  lines.push(`**Anzahl Custom-Posten:** ${customs.length}`);
  lines.push('');
  lines.push(`> Diese Datei enthält alle manuell während der Offerten-Erstellung`);
  lines.push(`> erfassten Positionen. Format ist als Patch für`);
  lines.push(`> \`data/offerten-positionen.json\` gedacht — Claude in der`);
  lines.push(`> nächsten Stammdaten-Pflege-Session direkt einarbeiten.`);
  lines.push('');
  if (!customs.length){
    lines.push('_Keine Custom-Positionen erfasst._');
    return lines.join('\n');
  }
  customs.forEach((p, i) => {
    const idVorschlag = suggestId(p);
    lines.push(`## ${i + 1}. ${p.name || '(unbenannt)'}`);
    lines.push('');
    lines.push('```json');
    lines.push('{');
    lines.push(`  "id": "${idVorschlag}",`);
    lines.push(`  "kategorie": "${p.kategorie || ''}",`);
    lines.push(`  "kategorie_name": "${p.kategorie_name || ''}",`);
    lines.push(`  "name": ${JSON.stringify(p.name || '')},`);
    lines.push(`  "einheit": "${p.einheit || 'Pauschal'}",`);
    lines.push(`  "einheits_preis": ${Number(p.einheits_preis) || 0},`);
    lines.push(`  "default_menge": ${Number(p.menge) || 1},`);
    lines.push(`  "stundensatz": ${p.einheit === 'h' ? (p.stundensatz || 110) : 'null'},`);
    lines.push(`  "default_stunden": null,`);
    lines.push(`  "bemerkung": ${JSON.stringify(p.bemerkung || '')},`);
    lines.push(`  "marke": null,`);
    lines.push(`  "modell": null,`);
    lines.push(`  "hersteller_garantie_jahre": null,`);
    lines.push(`  "ist_pauschal": ${!!p.ist_pauschal},`);
    lines.push(`  "npk_code": null,`);
    lines.push(`  "kritisch_check": null,`);
    lines.push(`  "herkunft": "custom-import"`);
    lines.push('}');
    lines.push('```');
    lines.push('');
    lines.push(`- **NPK-Code Slot:** _bitte ergänzen (z. B. NPK 384.xxx)_`);
    if (p.bemerkung) lines.push(`- **Bemerkung:** ${p.bemerkung}`);
    lines.push('');
  });
  return lines.join('\n');
}

/**
 * Triggert den Print-Dialog mit dem Offerten-HTML + lädt die Custom-Posten-MD.
 * @param {object} state
 * @param {object} calc
 * @param {object} opts
 */
export function exportOfferte(state, calc, opts){
  const html = buildOfferteHtml(state, calc, opts);
  // Print-Tab
  if (typeof window !== 'undefined' && typeof document !== 'undefined'){
    let w = null;
    try { w = window.open('', '_blank', 'width=900,height=1200'); } catch(_){}
    if (w && !w.closed){
      try {
        w.document.open(); w.document.write(html); w.document.close();
        setTimeout(() => { try { w.focus(); w.print(); } catch(_){} }, 400);
      } catch(_){}
    } else {
      // Fallback: hidden iframe
      const old = document.getElementById('offertePrintFrame');
      if (old) old.remove();
      const iframe = document.createElement('iframe');
      iframe.id = 'offertePrintFrame';
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(iframe);
      iframe.onload = () => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch(_){} };
      iframe.srcdoc = html;
    }
    // Custom-Positionen-MD herunterladen (nur wenn Custom-Posten vorhanden)
    const customs = (state.offerte && Array.isArray(state.offerte.positionen) ? state.offerte.positionen : [])
                    .filter(p => p && p._isCustom);
    if (customs.length > 0){
      const md = buildCustomPositionenMd(state);
      const datum = new Date().toISOString().slice(0, 10);
      const filename = `custom-positionen-${datum}.md`;
      try { downloadText(md, filename, 'text/markdown;charset=utf-8'); } catch(_){}
    }
  }
}

// ───────────────────────────────────────────────────────────────────
// Builders
// ───────────────────────────────────────────────────────────────────

function buildBriefkopf(){
  const logoSrc = (typeof location !== 'undefined' && location.href.indexOf('/heizlast') >= 0)
                    ? './img/Logo.png'
                    : 'https://thermowerk.ch/heizlast/img/Logo.png';
  return `
  <header class="off__brief">
    <img class="off__brief-logo" src="${logoSrc}" alt="Thermowerk" onerror="this.style.display='none'"/>
    <div class="off__brief-firma">
      <strong>${escapeHtml(FIRMA.name)}</strong>
      <span>${escapeHtml(FIRMA.adr)}</span>
      <span>${escapeHtml(FIRMA.tel)} · ${escapeHtml(FIRMA.email)}</span>
      <span>${escapeHtml(FIRMA.web)} · UID ${escapeHtml(FIRMA.uid)}</span>
    </div>
  </header>`;
}

function buildAdressblock(state, offerteNr, heute){
  const p = (state && state.projekt) || {};
  const empfaenger = [];
  if (p.bauherrschaft && p.bauherrschaft.trim()) empfaenger.push(escapeHtml(p.bauherrschaft));
  if (p.strasse && p.strasse.trim()) empfaenger.push(escapeHtml(p.strasse));
  const ortZeile = [p.plz, p.ort].filter(x => x && x.trim()).join(' ');
  if (ortZeile) empfaenger.push(escapeHtml(ortZeile));
  const empfHtml = empfaenger.length
    ? empfaenger.map(z => `<span>${z}</span>`).join('')
    : '<span class="off__placeholder">Empfänger-Adresse — bitte in Stammdaten ergänzen</span>';
  return `
  <div class="off__adress">
    <div class="off__adress-empfaenger">
      ${empfHtml}
    </div>
    <div class="off__adress-meta">
      <div><strong>Offerte ${escapeHtml(offerteNr)}</strong></div>
      <div>Datum: ${escapeHtml(heute)}</div>
      <div>Gültig bis: ${escapeHtml(plus30Days(heute))}</div>
    </div>
  </div>`;
}

function buildAnrede(anrede, einleitung, projName){
  return `
  <div class="off__anrede">
    <h1 class="off__title">Offerte zur Heizungssanierung</h1>
    <p class="off__projekt"><strong>Projekt:</strong> ${escapeHtml(projName)}</p>
    <p class="off__greeting">${escapeHtml(anrede)}</p>
    <p class="off__intro">${escapeHtml(einleitung)}</p>
  </div>`;
}

function buildPositionstabelle(positionen){
  if (!positionen.length){
    return `<div class="off__empty">— Keine Offerten-Positionen erfasst —</div>`;
  }
  const grouped = {};
  KATEGORIEN_ORDER.forEach(k => { grouped[k] = []; });
  positionen.forEach(p => {
    const k = p.kategorie || (p._stamm && p._stamm.kategorie) || 'J';
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(p);
  });

  const blocks = KATEGORIEN_ORDER
    .filter(k => grouped[k] && grouped[k].length > 0)
    .map(k => {
      const items = grouped[k];
      const katName = items[0].kategorie_name || k;
      const rows = items.map(p => {
        const menge = Number(p.menge) || 0;
        const preis = Number(p.einheits_preis) || 0;
        const isProz = p.einheit === '%';
        // Subtotal in der Tabelle: bei %-Positionen "auf Subtotal" anzeigen,
        // weil der eigentliche CHF-Wert erst in computeTotals berechnet wird.
        const subTxt = isProz ? '<em class="off__pct">auf Subtotal</em>' : fmtCHF(menge * preis);
        const bem = p.bemerkung && p.bemerkung.trim() ? `<div class="off__pos-bem">${escapeHtml(p.bemerkung)}</div>` : '';
        const npk = p.npk_code ? ` <span class="off__pos-npk">${escapeHtml(p.npk_code)}</span>` : '';
        return `
          <tr>
            <td class="off__pos-name">
              <strong>${escapeHtml(p.name || '–')}</strong>${npk}
              ${bem}
            </td>
            <td class="num">${fmtNum(menge)}</td>
            <td>${escapeHtml(p.einheit || '')}</td>
            <td class="num">${isProz ? fmtNum(preis) + ' %' : fmtCHF(preis)}</td>
            <td class="num">${subTxt}</td>
          </tr>`;
      }).join('');
      return `
        <h3 class="off__kat-title">${escapeHtml(k)} · ${escapeHtml(katName)}</h3>
        <table class="off__pos-table">
          <thead>
            <tr>
              <th>Position</th>
              <th class="num">Menge</th>
              <th>Einheit</th>
              <th class="num">Stückpreis</th>
              <th class="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    }).join('');
  return `<section class="off__leistungen"><h2 class="off__h2">Leistungen</h2>${blocks}</section>`;
}

function buildTotalsTable(t){
  return `
  <section class="off__totals">
    <h2 class="off__h2">Zusammenstellung</h2>
    <table class="off__totals-table">
      <tbody>
        <tr><td>Subtotal Fixposten netto</td><td class="num">CHF ${fmtCHF(t.fix_sum)}</td></tr>
        <tr><td>Prozent-Posten (Bauleitung etc.)</td><td class="num">CHF ${fmtCHF(t.proz_sum)}</td></tr>
        <tr class="off__totals-sum"><td><strong>Netto-Subtotal</strong></td><td class="num"><strong>CHF ${fmtCHF(t.netto_subtotal)}</strong></td></tr>
        <tr><td>+ MwSt (${fmtNum(t.mwst_pct)} %)</td><td class="num">CHF ${fmtCHF(t.mwst_chf)}</td></tr>
        <tr class="off__totals-sum"><td><strong>Brutto inkl. MwSt</strong></td><td class="num"><strong>CHF ${fmtCHF(t.brutto)}</strong></td></tr>
        <tr><td>− Förderung (Bund + Kanton, Schätzung)</td><td class="num">CHF ${fmtCHF(t.foerderung_chf)}</td></tr>
        <tr class="off__totals-final"><td><strong>Netto-Investition Bauherrschaft</strong></td><td class="num"><strong>CHF ${fmtCHF(t.netto_invest)}</strong></td></tr>
      </tbody>
    </table>
    <p class="off__totals-note">Förderbeträge sind Richtwerte — verbindlich nur über das jeweilige Antragsportal. Antrag VOR Baubeginn stellen.</p>
  </section>`;
}

function buildZahlungsplan(plan, t){
  const summe = Number(t.brutto) || 0;
  const rows = plan.raten.map(r => {
    const chf = Math.round(summe * (r.pct / 100));
    return `<tr><td>${escapeHtml(r.text)}</td><td class="num">${fmtNum(r.pct)} %</td><td class="num">CHF ${fmtCHF(chf)}</td></tr>`;
  }).join('');
  return `
  <section class="off__zahlplan">
    <h2 class="off__h2">Zahlungsplan</h2>
    <p class="off__note">Vorlage: <strong>${escapeHtml(plan.label)}</strong>. Beträge berechnet auf Bruttosumme inkl. MwSt.</p>
    <table class="off__zahlplan-table">
      <thead><tr><th>Fälligkeit</th><th class="num">Anteil</th><th class="num">Betrag</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function buildGarantieBlock(positionen){
  // Sammle Hersteller-Garantien aus den Positionen (Geräte mit hersteller_garantie_jahre).
  const geraete = positionen
    .filter(p => p && Number.isFinite(Number(p.hersteller_garantie_jahre)) && Number(p.hersteller_garantie_jahre) > 0)
    .map(p => ({ name: p.name, jahre: Number(p.hersteller_garantie_jahre) }));
  const dedup = [];
  const seen = new Set();
  for (const g of geraete){
    const key = g.name + '__' + g.jahre;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(g);
  }
  const geraeteHtml = dedup.length
    ? '<ul class="off__garantie-list">'
      + dedup.map(g => `<li><strong>${escapeHtml(g.name)}:</strong> ${g.jahre} Jahre Hersteller-Garantie</li>`).join('')
      + '</ul>'
    : '<p class="off__note">Hersteller-Garantien gemäss Datenblatt der jeweiligen Geräte.</p>';
  return `
  <section class="off__garantie">
    <h2 class="off__h2">Garantie</h2>
    <p><strong>Werkleistung:</strong> 2 Jahre Garantie auf Montage- und Installationsleistungen ab Abnahme der Anlage.</p>
    <p><strong>Geräte:</strong> Es gelten die Hersteller-Garantiebestimmungen pro verbautem Gerät:</p>
    ${geraeteHtml}
  </section>`;
}

function buildAgbBlock(){
  return `
  <section class="off__agb">
    <h2 class="off__h2">Allgemeine Geschäftsbedingungen</h2>
    <ol class="off__agb-list">
      <li><strong>Vertragsgrundlagen:</strong> Es gelten die Bestimmungen des Schweizerischen Obligationenrechts (OR, Stand 2026) sowie die SIA-Norm 118 (inkl. Korrigenda 2026) als ergänzende Vertragsgrundlage.</li>
      <li><strong>Gültigkeit der Offerte:</strong> Diese Offerte ist 30 Tage ab Ausstellungsdatum verbindlich. Preise verstehen sich in CHF, netto, exkl. 8.1 % MwSt.</li>
      <li><strong>Mängelrechte:</strong> Mängelanzeigen erfolgen nach OR Art. 367 ff. (revidierte Fassung 2026). Versteckte Mängel sind unverzüglich nach Entdeckung anzuzeigen. Annahmeprotokoll bei Inbetriebnahme ist Voraussetzung für die Schlussrechnung.</li>
      <li><strong>Förderbeiträge:</strong> Angaben zu Bundes-/Kantons-Förderbeiträgen sind Schätzungen aufgrund der aktuellen Programme. Verbindlich ist der Bescheid des Antragsportals. Auszahlung erfolgt direkt an die Bauherrschaft. Antrag VOR Baubeginn.</li>
      <li><strong>Ausführungsfristen:</strong> Termine werden nach Auftragsbestätigung verbindlich vereinbart. Verzögerungen aufgrund höherer Gewalt, Lieferengpässen oder Witterung berechtigen nicht zu Schadenersatzforderungen.</li>
      <li><strong>Eigentumsvorbehalt:</strong> Sämtliche Geräte und Materialien bleiben bis zur vollständigen Zahlung Eigentum der Auftragnehmerin.</li>
      <li><strong>Gerichtsstand:</strong> Ausschliesslicher Gerichtsstand ist Winterthur ZH. Es gilt schweizerisches Recht.</li>
    </ol>
  </section>`;
}

function buildBankFooter(){
  return `
  <footer class="off__footer">
    <div class="off__footer-grid">
      <div>
        <strong>${escapeHtml(FIRMA.name)}</strong><br>
        ${escapeHtml(FIRMA.adr)}<br>
        ${escapeHtml(FIRMA.tel)}<br>
        ${escapeHtml(FIRMA.email)}
      </div>
      <div>
        <strong>Bankverbindung</strong><br>
        ${escapeHtml(FIRMA.bank_name)}<br>
        IBAN ${escapeHtml(FIRMA.bank_iban)}<br>
        BIC ${escapeHtml(FIRMA.bank_bic)}
      </div>
      <div>
        <strong>Steuern / Register</strong><br>
        UID: ${escapeHtml(FIRMA.uid)}<br>
        MwSt-Pflichtig: Ja<br>
        Web: ${escapeHtml(FIRMA.web)}
      </div>
    </div>
  </footer>`;
}

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

function safeActiveMeta(){
  try { return getActiveMeta(); } catch(_){ return null; }
}

function buildOfferteNumber(meta){
  const dt = new Date();
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const idTail = (meta && meta.id) ? String(meta.id).slice(0, 6).toUpperCase() : 'NEU';
  return `${yyyy}${mm}${dd}-${idTail}`;
}

function plus30Days(dateStr){
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString('de-CH');
}

function defaultAnrede(state){
  const p = (state && state.projekt) || {};
  const bh = (p.bauherrschaft || '').trim();
  if (bh){
    return `Sehr geehrte Damen und Herren der ${bh}`;
  }
  return 'Sehr geehrte Damen und Herren';
}

function defaultEinleitung(state){
  return 'Wir freuen uns, Ihnen für die geplante Heizungssanierung mit Wärmepumpe nachfolgende Offerte unterbreiten zu dürfen. Die Auslegung basiert auf der raumweisen Norm-Heizlast (EN 12831) bzw. dem Verbrauchsverfahren der Schweizer Wärmepumpen-Fachvereinigung. Sämtliche Komponenten sind aufeinander abgestimmt und entsprechen dem aktuellen Stand der Technik.';
}

function suggestId(p){
  // Bsp: "Erweiterung Spuelung" → "erweiterung-spuelung"
  const base = String(p.name || 'custom-position')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const kat = (p.kategorie || 'X').toLowerCase();
  return `${kat}-${base}`.slice(0, 60);
}

function computeTotals(o){
  const sub = computePaketSubtotal(o.positionen);
  const tax = applyTaxAndFoerderung(sub.netto_subtotal, {
    mwst_pct: o.mwst_pct, foerderung_chf: o.foerderung_chf
  });
  return Object.assign({}, sub, tax);
}

function fmtCHF(v){
  const n = Number(v);
  if (!Number.isFinite(n)) return '–';
  return n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(v){
  const n = Number(v);
  if (!Number.isFinite(n)) return '–';
  // Kein fixed: 0.5, 1, 6 etc. lesbar belassen
  return Math.abs(n - Math.round(n)) < 1e-9
    ? n.toLocaleString('de-CH', { maximumFractionDigits: 0 })
    : n.toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function downloadText(text, filename, mime){
  if (typeof document === 'undefined') return;
  const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
}

// ───────────────────────────────────────────────────────────────────
// Inline-CSS — eigenes Layout, bewusst getrennt vom Auslegungsbericht
// ───────────────────────────────────────────────────────────────────
const OFFERTE_CSS = `
:root {
  --ink-50:#f7f9fb; --ink-100:#eef2f6; --ink-200:#e2e8f0;
  --ink-300:#cbd5e1; --ink-400:#94a3b8; --ink-500:#64748b;
  --ink-600:#475569; --ink-700:#334155; --ink-800:#1e293b;
  --ink-900:#0f172a;
  --navy:#1B2A4A; --accent:#D93025;
}
* { box-sizing: border-box; }
body.off { font-family:'Inter','Segoe UI',Roboto,sans-serif; color:var(--ink-900); margin:0; background:#fff; }
body.off { max-width:880px; margin:0 auto; padding:10mm 12mm; font-size:10pt; line-height:1.45; }

.off__brief {
  display:flex; justify-content:space-between; align-items:flex-start;
  gap:18px; padding-bottom:8px; margin-bottom:12px;
  border-bottom:2px solid var(--navy);
}
.off__brief-logo { max-height:42px; width:auto; flex-shrink:0; }
.off__brief-firma { display:flex; flex-direction:column; gap:1px; text-align:right; font-size:9pt; color:var(--ink-700); }
.off__brief-firma strong { color:var(--ink-900); font-size:10pt; }

.off__adress { display:flex; justify-content:space-between; gap:24px; margin:18px 0; }
.off__adress-empfaenger { display:flex; flex-direction:column; font-size:10.5pt; line-height:1.45; }
.off__adress-meta { text-align:right; font-size:9.5pt; color:var(--ink-700); }
.off__adress-meta div { margin-bottom:2px; }
.off__placeholder { color:var(--ink-400); font-style:italic; }

.off__anrede { margin:14px 0 18px; }
.off__title { font-size:16pt; font-weight:700; color:var(--accent); margin:0 0 4px; }
.off__projekt { margin:0 0 8px; font-size:10.5pt; }
.off__greeting { margin:8px 0; }
.off__intro { margin:6px 0; color:var(--ink-700); }

.off__h2 {
  font-size:12pt; font-weight:700; color:var(--ink-900);
  margin:18px 0 8px; padding-bottom:4px;
  border-bottom:1px solid var(--ink-300);
}
.off__kat-title {
  font-size:10.5pt; font-weight:700; color:var(--navy);
  margin:14px 0 6px; padding:4px 8px;
  background:var(--ink-50); border-left:3px solid var(--navy);
}

.off__pos-table, .off__totals-table, .off__zahlplan-table {
  width:100%; border-collapse:collapse; font-size:9.5pt;
  margin:0 0 6px;
}
.off__pos-table th, .off__pos-table td,
.off__totals-table td,
.off__zahlplan-table th, .off__zahlplan-table td {
  padding:5px 6px; border-bottom:1px solid var(--ink-100);
  vertical-align:top; line-height:1.35;
}
.off__pos-table th, .off__zahlplan-table th {
  background:var(--ink-50); color:var(--ink-700);
  font-size:8.5pt; text-transform:uppercase; letter-spacing:0.04em;
  font-weight:600; text-align:left;
  border-bottom:2px solid var(--ink-300);
}
.off__pos-table th.num, .off__pos-table td.num,
.off__totals-table td.num,
.off__zahlplan-table th.num, .off__zahlplan-table td.num {
  text-align:right; font-variant-numeric:tabular-nums;
}
.off__pos-table th { white-space:nowrap; }

.off__pos-name strong { color:var(--ink-900); }
.off__pos-bem { font-size:9pt; color:var(--ink-500); margin-top:2px; }
.off__pos-npk {
  display:inline-block; padding:1px 6px; margin-left:6px;
  font-size:8pt; color:var(--ink-500);
  border:1px solid var(--ink-300); border-radius:3px;
  font-variant-numeric:tabular-nums;
}
.off__pct { color:var(--ink-500); font-style:italic; }

.off__totals-table { max-width:520px; margin-left:auto; }
.off__totals-table tr.off__totals-sum td {
  border-top:1px solid var(--ink-700);
  border-bottom:1px solid var(--ink-700);
  background:var(--ink-50);
}
.off__totals-table tr.off__totals-final td {
  background:var(--accent); color:#fff; font-size:11.5pt;
  border:none; padding:8px 10px;
}
.off__totals-note { font-size:8.5pt; color:var(--ink-500); margin-top:4px; text-align:right; }

.off__zahlplan-table { max-width:560px; }

.off__garantie-list { margin:6px 0 0 18px; padding:0; }
.off__garantie-list li { margin-bottom:3px; font-size:9.5pt; }

.off__agb-list { margin:6px 0 0 22px; padding:0; }
.off__agb-list li { margin-bottom:5px; font-size:9pt; line-height:1.45; }

.off__footer {
  margin-top:24px; padding-top:10px;
  border-top:2px solid var(--ink-700);
}
.off__footer-grid {
  display:grid; grid-template-columns:repeat(3, 1fr); gap:14px;
  font-size:8.5pt; color:var(--ink-700); line-height:1.45;
}
.off__footer-grid strong { color:var(--ink-900); display:block; margin-bottom:2px; }

.off__empty { padding:20px; text-align:center; color:var(--ink-400); font-style:italic; border:1px dashed var(--ink-300); }
.off__note { font-size:9pt; color:var(--ink-700); margin:4px 0; }

@media print {
  @page { margin:10mm 10mm; size:A4; }
  body.off { padding:0; max-width:none; }
  .off__leistungen, .off__totals, .off__zahlplan, .off__garantie, .off__agb { page-break-inside:avoid; }
  .off__footer { page-break-inside:avoid; }
}
`;
