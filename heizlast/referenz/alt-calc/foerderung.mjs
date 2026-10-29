// src/calc/foerderung.mjs
// S6 — Förderungs- und Baubewilligungs-Lookup.
// Pure Funktionen: keine DOM-/Fetch-Aufrufe. Daten werden vom Caller injiziert.

/**
 * Filtert Förderprogramme nach Kanton + Massnahme.
 *
 * @param {{programme: Array}} foerderDb  geladene foerderungen.json
 * @param {object} kriterien
 * @param {string} kriterien.kanton        2-Letter-Code (ZH, BE, ...) — leer = nur Bund
 * @param {string} kriterien.massnahme     Massnahme-ID
 * @param {string} [kriterien.wp_quelle]   'luft' | 'sole' | 'wasser' — filtert WP-Programme heuristisch
 * @returns {Array} passende Programme, sortiert: Bund zuerst, dann Kanton.
 */
export function filterFoerderungen(foerderDb, kriterien){
  if (!foerderDb || !Array.isArray(foerderDb.programme)) return [];
  const k = (kriterien && kriterien.kanton || '').toUpperCase().trim();
  const m = kriterien && kriterien.massnahme || '';
  const q = (kriterien && kriterien.wp_quelle || '').toLowerCase();
  if (!m) return [];

  const matches = [];
  for (const p of foerderDb.programme){
    if (!Array.isArray(p.massnahmen) || !p.massnahmen.includes(m)) continue;
    // Kanton-Match: '*' = bundesweit, sonst exakter Kanton.
    const programKanton = (p.kanton || '').toUpperCase();
    if (programKanton !== '*' && programKanton !== k) continue;
    // WP-Quelle: wenn Programm-Name auf spezifische Quelle hinweist und User andere wählt, ausblenden.
    if (m === 'heizungsersatz' && q){
      const nameLower = (p.name || '').toLowerCase();
      const isSole = /sol[e/]|wasser\/wasser|sol\/eau|eau\/eau|salamoia/.test(nameLower);
      const isLuft = /luft\/wasser|air\/eau|aria\/acqua/.test(nameLower);
      const isWasser = /wasser\/wasser|eau\/eau/.test(nameLower);
      // Wenn Programm spezifisch ist und nicht zur Quelle passt, ausblenden.
      if (q === 'luft' && (isSole || isWasser) && !isLuft) continue;
      if (q === 'sole' && isLuft && !isSole) continue;
      if (q === 'wasser' && isLuft && !(isWasser || isSole)) continue;
    }
    matches.push(p);
  }

  // Sortierung: Bund (kanton === '*') zuerst, dann nach Kanton-Code, dann Name.
  matches.sort((a, b) => {
    const ka = (a.kanton || '').toUpperCase(), kb = (b.kanton || '').toUpperCase();
    if (ka === '*' && kb !== '*') return -1;
    if (kb === '*' && ka !== '*') return 1;
    if (ka !== kb) return ka < kb ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });
  return matches;
}

/**
 * Liefert kantonale Baubewilligungs-Hinweise für gegebenen Kanton.
 *
 * @param {object} bauDb  geladene baubewilligungen.json
 * @param {string} kanton 2-Letter-Code
 * @returns {object|null} kantonsspezifische Hinweise oder null
 */
export function lookupBaubewilligung(bauDb, kanton){
  if (!bauDb || !bauDb.kantone) return null;
  const k = (kanton || '').toUpperCase().trim();
  if (!k) return null;
  return bauDb.kantone[k] || null;
}

/**
 * Schätzt einen Förderbetrag auf Basis der Q_h-Auslegungsleistung bzw. Bauteilfläche.
 * Nur Richtwert für Anzeige — verbindlich ist immer das Antragsportal.
 *
 * @param {object} program     Programm-Eintrag
 * @param {object} kontext     { Qh_kW, A_bauteil_m2, kollektor_m2, kWp }
 * @returns {number|null} CHF-Betrag oder null wenn nicht ableitbar.
 */
export function schaetzeBetrag(program, kontext){
  if (!program) return null;
  const grund = Number(program.betrag_chf_grund) || 0;
  const perUnit = Number(program.betrag_chf_per_unit) || 0;
  const einheit = (program.einheit || '').toLowerCase();
  let menge = 0;
  if (einheit === 'chf/kw') menge = Number(kontext && kontext.Qh_kW) || 0;
  else if (einheit === 'chf/m²' || einheit === 'chf/m2') {
    // Bauteilfläche / Kollektor / je nach Massnahme
    if ((program.massnahmen || []).includes('thermische_solar')){
      menge = Number(kontext && kontext.kollektor_m2) || 0;
    } else {
      menge = Number(kontext && kontext.A_bauteil_m2) || 0;
    }
  }
  else if (einheit === 'chf/kwp') menge = Number(kontext && kontext.kWp) || 0;
  else if (einheit === 'pauschal') return grund > 0 ? grund : null;

  if (grund <= 0 && perUnit <= 0) return null;
  if (menge <= 0 && perUnit > 0 && grund <= 0) return null;
  return grund + perUnit * menge;
}

// vergleichNormVerbrauch → verschoben nach `./plausi.mjs` (S1 / AUDIT 3.8).
// Re-Export hier für Backwards-Compat (`export … from` ist im IIFE-Bundler
// nicht implementiert, daher import-then-export-const).
import { vergleichNormVerbrauch as _vNV } from './plausi.mjs';
export const vergleichNormVerbrauch = _vNV;

/**
 * Gruppiert/aggregiert die Liste — sinnvoll fürs Cockpit.
 * @returns {{ bund: Array, kanton: Array, total_geschaetzt: number|null }}
 */
export function gruppiereProgramme(programme, kontext){
  const bund = [], kanton = [];
  let total = 0; let any = false;
  for (const p of programme){
    if ((p.kanton || '').toUpperCase() === '*') bund.push(p);
    else kanton.push(p);
    const b = schaetzeBetrag(p, kontext);
    if (b != null && Number.isFinite(b) && b > 0){ total += b; any = true; }
  }
  return { bund, kanton, total_geschaetzt: any ? total : null };
}
