// src/calc/plausi.mjs
// Plausibilitäts-Checks für Heizlast-Auslegung.
//
// Konsolidiert (S1, 2026-04-30 — AUDIT 3.8):
//   - vergleichNormVerbrauch  → kam aus foerderung.mjs
//   - plausiAmpel + SPEZ_BAND → kam aus fws.mjs
//   - computePlausi (Wrapper) → kam aus fws.mjs
// Quelle: FWS Modul 3 §7 (spez. Heizleistung), wissensbasis-auszug.md.

/* ==========================================================================
   SPEZ-BAND-TABELLE
   Bauperiode × Gebäudetyp → spez. Heizlast in W/m² (Plausi-Quercheck).
   ========================================================================== */

export const SPEZ_BAND = {
  '<1919':      { efh: [28,  63], mfh: [33,  58] },
  '1919-1945':  { efh: [40,  68], mfh: [40,  60] },
  '1946-1960':  { efh: [40,  70], mfh: [35,  58] },
  '1961-1970':  { efh: [40,  73], mfh: [38,  60] },
  '1971-1980':  { efh: [35,  63], mfh: [38,  58] },
  '1981-1985':  { efh: [28,  53], mfh: [35,  53] },
  '1986-1990':  { efh: [30,  48], mfh: [33,  48] },
  '1991-1995':  { efh: [25,  45], mfh: [30,  43] },
  '1996-2000':  { efh: [23,  43], mfh: [28,  38] },
  '2001-2005':  { efh: [18,  40], mfh: [28,  38] },
  '2006-2010':  { efh: [18,  38], mfh: [23,  33] },
  '2011-heute': { efh: [15,  23], mfh: [15,  20] }
};

/* ==========================================================================
   PLAUSI: spez. Heizlast gegen Bauperioden-Band
   ========================================================================== */

/** FWS §7 / §12.4 — Plausi-Ampel gegen SPEZ_BAND (W/m²).
 *
 * @param {object} args
 * @param {number} args.specWm2     spez. Heizlast [W/m²]
 * @param {string} args.bauperiode  Bauperiode-Key (FWS-Notation)
 * @param {string} args.gebaeudetyp 'efh' | 'mfh'
 * @returns {{ ampel: 'gruen'|'gelb'|'rot'|'grau', band: [number,number]|null, mean: number }}
 */
export function plausiAmpel({ specWm2, bauperiode, gebaeudetyp }){
  const bp = SPEZ_BAND[bauperiode];
  if (!bp) return { ampel: 'grau', band: null, mean: 0 };
  const band = bp[gebaeudetyp] || bp.efh;
  const mean = (band[0] + band[1]) / 2;
  let ampel = 'gruen';
  if (specWm2 < band[0] * 0.8 || specWm2 > band[1] * 1.2) ampel = 'rot';
  else if (specWm2 < band[0] || specWm2 > band[1]) ampel = 'gelb';
  return { ampel, band, mean };
}

/** State-Wrapper für plausiAmpel — liest Bauperiode + Gebäudetyp aus state. */
export function computePlausi(spez, s){
  return plausiAmpel({
    specWm2: spez,
    bauperiode: s?.objekt?.bauperiode,
    gebaeudetyp: s?.objekt?.typ
  });
}

/* ==========================================================================
   VERGLEICH: Verbrauchs-Heizlast (FWS) ↔ Norm-Heizlast (EN 12831)
   ========================================================================== */

/** Vergleich Verbrauchs-Heizlast (FWS) vs. Norm-Heizlast (EN 12831).
 *
 * Schwellen (Spec S6):
 *   <10 %   → grün (Werte stimmen gut überein)
 *   10–25 % → gelb (Verbrauchsdaten prüfen)
 *   >25 %   → rot  (Konflikt — einer der Werte stimmt nicht)
 *
 * @param {number} Qhl_norm_kW Norm-Heizlast (Detail) in kW
 * @param {number} Qhl_fws_kW  FWS-Verbrauchs-Heizlast in kW
 * @returns {{ abweichung_proz:(number|null), ampel:('gruen'|'gelb'|'rot'|'grau'), hinweis:string }}
 */
export function vergleichNormVerbrauch(Qhl_norm_kW, Qhl_fws_kW){
  const a = Number(Qhl_norm_kW), b = Number(Qhl_fws_kW);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0){
    return { abweichung_proz: null, ampel: 'grau', hinweis: 'Werte unvollständig — Vergleich nicht möglich.' };
  }
  const abw = Math.abs(a - b) / Math.max(a, b) * 100;
  if (abw < 10){
    return { abweichung_proz: abw, ampel: 'gruen', hinweis: 'Werte stimmen gut überein — Auslegung plausibel.' };
  }
  if (abw < 25){
    return { abweichung_proz: abw, ampel: 'gelb',
      hinweis: 'Mittlere Abweichung — Verbrauchsdaten prüfen (Klimakorrektur, WW-Anteil, Stillstand).' };
  }
  return { abweichung_proz: abw, ampel: 'rot',
    hinweis: 'Grosse Abweichung — einer der Werte stimmt nicht (Bauteilflächen / U-Werte / Verbrauchsbilanz).' };
}
