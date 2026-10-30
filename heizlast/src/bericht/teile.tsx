/**
 * Bausteine des Berichts (Session 9): Kapitel, Wertetabelle, Rechenschritt, Herkunftsnotiz, Ampel-Marke.
 * Rechnen nichts — sie zeigen Werte aus dem Ergebnis mit ihrer Herkunft (KONTEXT §2 «Herkunftsmodell»).
 */
import type { ComponentChildren } from 'preact';
import type { Ampel } from '../kern/typen';
import type { Wert } from '../kern/wert';
import { istAnnahme } from '../kern/wert';
import { bandText, herkunftKurz } from '../ui/komponenten/Herkunft';

/**
 * Begründungen des Kerns sind auch für die Bedienung geschrieben; im Bericht entfallen Bedienhinweise
 * («überschreibbar»), der Inhalt bleibt wörtlich.
 */
export function berichtText(text: string): string {
  return text
    .replace(/\s*\((?:Standardwert, )?überschreibbar\)/g, (m) => (m.includes('Standardwert') ? ' (Standardwert)' : ''))
    .replace(/,\s*überschreibbar/g, '')
    .replace(/\s*—\s*überschreibbar/g, '')
    .replace(/\s+sichtbar als Annahme und überschreibbar/g, '')
    .trim();
}

/** Kurze Herkunftsangabe unter einem Wert — nur für Annahmen oder Werte mit Unsicherheit/Spanne. */
export function HerkunftNotiz({ wert, mitBand }: { wert: Wert<unknown> | null | undefined; mitBand?: boolean }) {
  if (!wert) return null;
  const zeigen = istAnnahme(wert) || (wert.unsicherheit ?? 0) > 0 || !!wert.band;
  if (!zeigen) return null;
  const band = mitBand ? bandText(wert, 0) : null;
  return (
    <span class="bericht__herkunft">
      {herkunftKurz(wert)}
      {band ? ` · Spanne ${band}` : ''}
    </span>
  );
}

export interface KvZeile {
  label: ComponentChildren;
  wert: ComponentChildren;
  /** Wert mit Herkunft (Notiz unter dem Wert). */
  herkunft?: Wert<unknown> | null | undefined;
  /** Klartext unter dem Wert (z. B. Begründung). */
  notiz?: string | undefined;
  testid?: string | undefined;
  hervorheben?: boolean;
}

/** Zweispaltige Tabelle «Bezeichnung — Wert» (BROSCH-Layout des alten Berichts). */
export function KvTabelle({ zeilen, testid }: { zeilen: ReadonlyArray<KvZeile | null | false | undefined>; testid?: string }) {
  const liste = zeilen.filter((z): z is KvZeile => !!z);
  if (!liste.length) return null;
  return (
    <table class="bericht__kv" data-testid={testid}>
      <tbody>
        {liste.map((z, i) => (
          <tr key={i} class={z.hervorheben ? 'is-hervorgehoben' : undefined}>
            <th scope="row">{z.label}</th>
            <td>
              <span class="bericht__wert" data-testid={z.testid}>
                {z.wert}
              </span>
              <HerkunftNotiz wert={z.herkunft} mitBand />
              {z.notiz && <span class="bericht__notiz">{z.notiz}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Ein Schritt im Rechenweg: Titel, Formel mit eingesetzten Werten (Begründung des Kerns), Ergebnis. */
export function Rechenschritt({ titel, wert, text, akzent, testid }: { titel: ComponentChildren; wert: Wert<unknown> | null | undefined; text: string; akzent?: boolean; testid?: string }) {
  if (!wert) return null;
  return (
    <div class={`bericht__schritt${akzent ? ' bericht__schritt--akzent' : ''}`}>
      <div class="bericht__schritt-kopf">
        <span class="bericht__schritt-titel">{titel}</span>
        <span class="bericht__schritt-ergebnis" data-testid={testid}>
          {text}
        </span>
      </div>
      <p class="bericht__formel">{berichtText(wert.begruendung)}</p>
      <HerkunftNotiz wert={wert} mitBand />
    </div>
  );
}

const AMPEL_KLASSE: Record<Ampel, string> = { gruen: 'gruen', gelb: 'gelb', rot: 'rot', grau: 'grau' };

/** Ampel als beschriftete Marke (im Druck farbig, Text trägt die Aussage). */
export function AmpelMarke({ ampel, text }: { ampel: Ampel; text: string }) {
  return <span class={`bericht__ampel bericht__ampel--${AMPEL_KLASSE[ampel]}`}>{text}</span>;
}

export function Kapitel({ nr, titel, id, umbruch, children }: { nr: number; titel: string; id: string; umbruch?: boolean | undefined; children: ComponentChildren }) {
  return (
    <section class={`bericht__kapitel${umbruch ? ' bericht__kapitel--umbruch' : ''}`} data-testid={`kapitel-${id}`} aria-labelledby={`bericht-${id}`}>
      <h2 class="bericht__h2" id={`bericht-${id}`}>
        <span class="bericht__h2-nr">{nr}</span>
        {titel}
      </h2>
      {children}
    </section>
  );
}

export function Unterkapitel({ titel, children, testid }: { titel: ComponentChildren; children: ComponentChildren; testid?: string }) {
  return (
    <div class="bericht__unterkapitel" data-testid={testid}>
      <h3 class="bericht__h3">{titel}</h3>
      {children}
    </div>
  );
}

/** Tabelle mit Kopfzeile; Zahlen-Spalten rechtsbündig (Klasse `zahl`). */
export function Tabelle({ kopf, zahlSpalten = [], children, testid, fuss }: { kopf: ReadonlyArray<ComponentChildren>; zahlSpalten?: ReadonlyArray<number>; children: ComponentChildren; testid?: string; fuss?: ComponentChildren }) {
  return (
    <div class="bericht__tabelle-rahmen">
      <table class="bericht__tabelle" data-testid={testid}>
        <thead>
          <tr>
            {kopf.map((k, i) => (
              <th key={i} scope="col" class={zahlSpalten.includes(i) ? 'zahl' : undefined}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
        {fuss && <tfoot>{fuss}</tfoot>}
      </table>
    </div>
  );
}
