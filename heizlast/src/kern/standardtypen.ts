/**
 * Standard-Bauteiltypen und generische Raum-Bauteile (Session 7b, Daniel 30.10.: «Raumweise ohne Pflicht-Klick»).
 *
 * Ein Raum-Bauteil braucht keinen eigenen Bauteiltyp mehr: ohne `typId` leitet der Kern aus Baujahr, Keller,
 * Dachform und Sanierungen einen Standard-Typ ab (`std-<art>`, nicht im State gespeichert). Generische Arten
 * `boden` (unten) und `decke` (oben) sowie der Anschluss `auto` werden aus dem Gebäude konkretisiert, damit
 * Keller/Dachform nachträglich ändern → Bauteile, U-Werte und Heizlast sofort mitziehen.
 *
 *   boden + unbeheizt (Keller)  → bodenKeller          boden + erdreich → bodenErdreich   boden + beheizt → innendecke
 *   decke + aussen              → dachSteil/dachFlach  decke + unbeheizt (Dachraum) → deckeEstrich   decke + beheizt → innendecke
 *   anschluss auto: boden nach Keller (unbeheizt → Keller, keiner → Erdreich, beheizt → beheizter Raum);
 *                   decke nach Dachform/Dachraum (Steildach mit unbeheiztem Estrich → Estrichdecke, sonst Dach);
 *                   andere Arten → aussen (Aussenwand, Fenster, Tür) bzw. beheizt (Innenbauteile).
 */
import type { HuelleDaten } from '../daten/huelle';
import type { BauteilArt, Bauteiltyp } from './huelle';
import { bauteilArtLabel } from './huelle';
import type { Anschluss, RaumBauteilEingabe } from './raumweise';

export type RaumBauteilArtGenerisch = BauteilArt | 'boden' | 'decke';
export type AnschlussAuto = { art: 'auto' };

export interface GebaeudeLage {
  keller: 'unbeheizt' | 'beheizt' | 'keiner' | null;
  dachform: 'steil' | 'flach' | null;
  dachraumBeheizt?: boolean | undefined;
}

export const STD_PRAEFIX = 'std-';

export function standardTypId(art: BauteilArt): string {
  return `${STD_PRAEFIX}${art}`;
}

export function istStandardTypId(id: string | undefined): boolean {
  return !!id && id.startsWith(STD_PRAEFIX);
}

/** Anschluss «auto» → konkreter Anschluss aus dem Gebäude. */
export function anschlussAuto(art: RaumBauteilArtGenerisch | undefined, g: GebaeudeLage): Anschluss {
  if (art === 'boden' || art === 'bodenKeller' || art === 'bodenErdreich') {
    if (g.keller === 'keiner') return { art: 'erdreich' };
    if (g.keller === 'beheizt') return { art: 'beheizt' };
    return { art: 'unbeheizt', situation: 'keller' };
  }
  if (art === 'decke' || art === 'deckeEstrich' || art === 'dachSteil' || art === 'dachFlach') {
    const estrich = (g.dachform ?? 'steil') === 'steil' && g.dachraumBeheizt === false;
    return estrich ? { art: 'unbeheizt', situation: 'dachraum' } : { art: 'aussen' };
  }
  if (art === 'innenwand' || art === 'innendecke' || art === 'innentuer') return { art: 'beheizt' };
  return { art: 'aussen' };
}

/** Generische Art → konkrete Bauteilart aus Anschluss und Gebäude. */
export function konkreteArt(art: RaumBauteilArtGenerisch | undefined, anschluss: Anschluss, g: GebaeudeLage): BauteilArt | undefined {
  if (art === 'boden') {
    if (anschluss.art === 'erdreich') return 'bodenErdreich';
    if (anschluss.art === 'beheizt') return 'innendecke';
    return 'bodenKeller';
  }
  if (art === 'decke') {
    if (anschluss.art === 'unbeheizt') return 'deckeEstrich';
    if (anschluss.art === 'beheizt') return 'innendecke';
    return (g.dachform ?? 'steil') === 'flach' ? 'dachFlach' : 'dachSteil';
  }
  return art;
}

export interface RaumBauteilRoh extends Omit<RaumBauteilEingabe, 'art' | 'anschluss'> {
  art?: RaumBauteilArtGenerisch | undefined;
  anschluss: Anschluss | AnschlussAuto;
}

export interface KonkretesBauteil extends RaumBauteilEingabe {
  /** true, wenn der Bauteiltyp ein Standard-Typ des Kerns ist (kein eigener Typ im State). */
  standardTyp: boolean;
  /** true, wenn Art oder Anschluss aus dem Gebäude abgeleitet wurden. */
  ausGebaeude: boolean;
}

/**
 * Konkretisiert ein Raum-Bauteil: Anschluss `auto` und generische Art aus dem Gebäude; ohne `typId`
 * (oder mit `typId`, die es nicht gibt) wird der Standard-Typ der Art eingesetzt.
 */
export function konkretisiereBauteil(b: RaumBauteilRoh, g: GebaeudeLage, eigeneTypen: ReadonlyArray<Bauteiltyp>): KonkretesBauteil {
  const auto = b.anschluss.art === 'auto';
  const anschluss: Anschluss = auto ? anschlussAuto(b.art, g) : (b.anschluss as Anschluss);
  const eigener = b.typId ? eigeneTypen.find((t) => t.id === b.typId) : undefined;
  const generisch = b.art === 'boden' || b.art === 'decke';
  const art = eigener ? eigener.art : konkreteArt(b.art, anschluss, g);
  const { art: _a, anschluss: _x, typId: _t, ...rest } = b;
  const out: KonkretesBauteil = { ...rest, anschluss, standardTyp: !eigener, ausGebaeude: auto || generisch };
  if (eigener) out.typId = eigener.id;
  else if (art) {
    out.typId = standardTypId(art);
    out.art = art;
  }
  return out;
}

/** Standard-Bauteiltypen (ohne Stufen = Epochen-Default) für alle Arten, die Räume oder Rest ohne eigenen Typ brauchen. */
export function standardTypenFuer(arten: Iterable<BauteilArt>, daten: HuelleDaten): Bauteiltyp[] {
  const out: Bauteiltyp[] = [];
  const gesehen = new Set<BauteilArt>();
  for (const art of arten) {
    if (gesehen.has(art)) continue;
    gesehen.add(art);
    out.push({ id: standardTypId(art), art, bezeichnung: `${bauteilArtLabel(art, daten)} (Standard)` });
  }
  return out;
}

/** Alle konkreten Bauteilarten (für Standard-Typen) — Reihenfolge wie in der UI. */
export const ALLE_ARTEN: ReadonlyArray<BauteilArt> = ['aussenwand', 'fenster', 'tuer', 'dachSteil', 'dachFlach', 'deckeEstrich', 'bodenKeller', 'bodenErdreich', 'innenwand', 'innendecke', 'innentuer'];
