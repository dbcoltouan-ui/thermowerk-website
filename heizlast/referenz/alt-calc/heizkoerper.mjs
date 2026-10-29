// src/calc/heizkoerper.mjs
// Wärmeübergabe Phase B (2026-04-30) — pure Helpers für die HK-Stammdatenbank.
// Eingabe: data/heizkoerper.json (siehe data/heizkoerper.json `_meta.konvention`).
// Keine DOM-Abhängigkeit → leicht testbar.
//
// Konventionen (DIN EN 442):
//   q_norm_75_65 ist die Norm-Leistung in W bei 75/65/20 für Baulänge L = 1000 mm.
//   Skalierung mit Länge: linear (Q(L) = q_norm * L_mm / 1000).
//   Skalierung mit Temperatur über Exponent n (in distribution.mjs).
//
// Fallback-Tabelle (data.typen_fallback) liefert W/m² Frontfläche pro Bauart
// für unbekannte Heizkörper.

/* ==========================================================================
   1) DB-LOOKUPS — DROPDOWN-INHALTE
   ========================================================================== */

/** Liefert die Liste aller Hersteller aus der DB (sortiert, deduped). */
export function getHersteller(db){
  const set = new Set();
  for (const m of (db?.modelle || [])){
    if (m && m.hersteller) set.add(m.hersteller);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
}

/** Liefert die Modellreihen eines Herstellers (sortiert, deduped). */
export function getModellreihen(db, hersteller){
  if (!hersteller) return [];
  const set = new Set();
  for (const m of (db?.modelle || [])){
    if (m && m.hersteller === hersteller && m.modellreihe) set.add(m.modellreihe);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
}

/** Liefert die verfügbaren Bauhöhen einer Modellreihe (numerisch sortiert). */
export function getHoehen(db, hersteller, modellreihe){
  if (!hersteller || !modellreihe) return [];
  const set = new Set();
  for (const m of (db?.modelle || [])){
    if (m && m.hersteller === hersteller && m.modellreihe === modellreihe && Number(m.hoehe) > 0){
      set.add(Number(m.hoehe));
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

/** Liefert alle Modelle (Typen) zu Hersteller + Modellreihe + Höhe (sortiert nach Typ). */
export function findModelle(db, hersteller, modellreihe, hoehe){
  if (!hersteller || !modellreihe || !(Number(hoehe) > 0)) return [];
  return (db?.modelle || []).filter(m =>
    m && m.hersteller === hersteller && m.modellreihe === modellreihe && Number(m.hoehe) === Number(hoehe)
  ).sort((a, b) => String(a.typ).localeCompare(String(b.typ)));
}

/** Findet ein Modell anhand seiner ID. */
export function findModell(db, modellId){
  if (!modellId) return null;
  return (db?.modelle || []).find(m => m && m.id === modellId) || null;
}

/** Fallback-Eintrag für einen Bauart-Typ ('platte_t22', 'konvektor_passiv', …). */
export function getFallback(db, typ){
  if (!typ) return null;
  return (db?.typen_fallback || []).find(f => f && f.typ === typ) || null;
}

/** Liste aller Fallback-Bauarten (typ + label) — für „Unbekannt"-Dropdown. */
export function getFallbackTypen(db){
  return (db?.typen_fallback || []).map(f => ({ typ: f.typ, label: f.label }));
}

/* ==========================================================================
   2) Q_NORM-BERECHNUNG
   ========================================================================== */

/** Q_norm @ 75/65/20 für ein konkretes Modell, hochskaliert auf gewählte Baulänge.
 *  @param {object} model    — DB-Modell-Eintrag (q_norm_75_65 ist W bei L=1000 mm)
 *  @param {number} laenge_mm — gewählte Baulänge [mm]
 *  @returns {number} W bei 75/65/20 — 0 falls Inputs ungültig.
 */
export function qNormFromModell(model, laenge_mm){
  if (!model || !(Number(model.q_norm_75_65) > 0)) return 0;
  const L = Number(laenge_mm);
  if (!(L > 0)) return 0;
  return model.q_norm_75_65 * (L / 1000);
}

/** Q_norm @ 75/65/20 für einen Fallback-Typ × Frontfläche (W/m²-Front × A).
 *  @param {object} fallback — Fallback-Eintrag (q_75_65_W_pro_m2_front)
 *  @param {number} A_m2     — Frontfläche [m²]
 *  @returns {number} W
 */
export function qNormFromFallback(fallback, A_m2){
  if (!fallback || !(Number(fallback.q_75_65_W_pro_m2_front) > 0)) return 0;
  const A = Number(A_m2);
  if (!(A > 0)) return 0;
  return fallback.q_75_65_W_pro_m2_front * A;
}

/* ==========================================================================
   3) GEOMETRIE-HELFER
   ========================================================================== */

/** Frontfläche aus Bauhöhe × Baulänge in m² (beide in mm). */
export function flaecheVonHL(hoehe_mm, laenge_mm){
  const h = Number(hoehe_mm), l = Number(laenge_mm);
  if (!(h > 0) || !(l > 0)) return 0;
  return (h * l) / 1_000_000; // mm² → m²
}

/** Allgemein: Fläche aus 2 Massen in mm → m². */
export function flaecheVonLB(l_mm, b_mm){
  const a = Number(l_mm), b = Number(b_mm);
  if (!(a > 0) || !(b > 0)) return 0;
  return (a * b) / 1_000_000;
}

/* ==========================================================================
   4) VALIDIERUNG
   ========================================================================== */

/** Prüft, ob die Länge im Hersteller-Bereich [laenge_min, laenge_max] liegt. */
export function isLaengeValid(model, laenge_mm){
  if (!model) return false;
  const L = Number(laenge_mm);
  if (!(L > 0)) return false;
  const min = Number(model.laenge_min) || 0;
  const max = Number(model.laenge_max) || Infinity;
  return L >= min && L <= max;
}

/** Liefert das nächstkleinere Modell in der Reihe (Höhe kleiner, gleiche Modellreihe).
 *  Hilft beim Re-Pick, wenn der User die Höhe wechselt und das alte Modell wegfällt.
 */
export function pickModellByTyp(modelle, typ){
  if (!Array.isArray(modelle) || modelle.length === 0) return null;
  const found = modelle.find(m => m && m.typ === typ);
  return found || modelle[0];
}
