/**
 * Eingabefelder (Session 7). Jedes Feld ist an einen State-Pfad gebunden, zeigt Hinweise des Ergebnisses zu
 * diesem Pfad inline und validiert Zahlen lokal (ungültige Eingaben werden nicht in den State geschrieben).
 *
 * Standardwerte (Daniel 29.10.): Liefert der Kern für ein leeres Feld einen Wert (Station, Tabelle,
 * Standardwert), steht diese Zahl im Feld und ist als «Standardwert» bzw. mit ihrer Herkunft markiert.
 * Wer eine eigene Zahl eintippt, überschreibt; «Standard verwenden» löscht die eigene Angabe wieder.
 */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { Wert } from '../../kern/wert';
import { hinweiseFuer, lese, parseZahl, setze, zahlFuerFeld } from '../bindung';
import { HerkunftChip, herkunftKlasse } from './Herkunft';
import { Info } from './Popover';

let zaehler = 0;
const neueFeldId = () => `f${(zaehler++).toString(36)}`;
function useFeldId(): string {
  const [id] = useState(neueFeldId);
  return id;
}

/** Hinweise zu einem Pfad (Fehler/Warnung/Info) als kurze Zeilen unter dem Feld. */
export function FeldHinweise({ pfad, exakt = true, lokal }: { pfad: string; exakt?: boolean; lokal?: string | null }) {
  const hs = hinweiseFuer(pfad, exakt);
  if (!hs.length && !lokal) return null;
  return (
    <ul class="feld__hinweise">
      {lokal && (
        <li class="feld__hinweis feld__hinweis--fehler" role="alert">
          {lokal}
        </li>
      )}
      {hs.map((h) => (
        <li class={`feld__hinweis feld__hinweis--${h.stufe}`} key={`${h.code}${h.text}`}>
          {h.text}
        </li>
      ))}
    </ul>
  );
}

interface Rahmen {
  label: ComponentChildren;
  info?: ComponentChildren | undefined;
  id: string;
  zusatz?: ComponentChildren;
  breit?: boolean | undefined;
  children: ComponentChildren;
  testid?: string | undefined;
}

function FeldRahmen({ label, info, id, zusatz, breit, children, testid }: Rahmen) {
  return (
    <div class={`feld${breit ? ' feld--breit' : ''}`} data-testid={testid}>
      <div class="feld__kopf">
        <label class="feld__label" for={id}>
          {label}
        </label>
        {info && <Info text={info} />}
        {zusatz}
      </div>
      {children}
    </div>
  );
}

export interface ZahlFeldProps {
  pfad: string;
  label: ComponentChildren;
  einheit?: string;
  info?: ComponentChildren;
  min?: number;
  max?: number;
  /** Ganzzahl verlangen. */
  ganz?: boolean;
  /** Anzeige = gespeichert / faktor (z. B. W → kW mit 1000). Nur Formatierung. */
  faktor?: number;
  dez?: number;
  /** Wert, den der Kern ohne eigene Angabe verwendet (Standardwert, Station, Tabelle). */
  standard?: Wert | null | undefined;
  platzhalter?: string;
  testid?: string;
  breit?: boolean;
  /** Pfad, unter dem Ergebnis-Hinweise zu diesem Feld gemeldet werden (falls abweichend). */
  hinweisPfad?: string;
  /** Text des Rücksetz-Knopfs (Standard: «Standard verwenden»). */
  zuruecksetzenText?: string;
}

export function ZahlFeld({ pfad, label, einheit, info, min, max, ganz, faktor = 1, dez, standard, platzhalter, testid, breit, hinweisPfad, zuruecksetzenText = 'Standard verwenden' }: ZahlFeldProps) {
  const id = useFeldId();
  const [text, setText] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const roh = lese<number>(pfad);
  const hatEigen = roh !== undefined;
  const zeigtStandard = !hatEigen && !!standard && text === null;
  const anzeige = text ?? (hatEigen ? zahlFuerFeld(roh / faktor, dez) : standard ? zahlFuerFeld(standard.wert / faktor, dez ?? 2) : '');

  const pruefe = (t: string): void => {
    const n = parseZahl(t);
    if (n === undefined) {
      setFehler(null);
      setze(pfad, undefined);
      return;
    }
    if (Number.isNaN(n)) return setFehler('Bitte eine Zahl eingeben (z. B. 12.5).');
    if (ganz && !Number.isInteger(n)) return setFehler('Bitte eine ganze Zahl eingeben.');
    if (min !== undefined && n < min) return setFehler(`Wert ab ${zahlFuerFeld(min)}${einheit ? ` ${einheit}` : ''} eingeben.`);
    if (max !== undefined && n > max) return setFehler(`Wert bis ${zahlFuerFeld(max)}${einheit ? ` ${einheit}` : ''} eingeben.`);
    setFehler(null);
    setze(pfad, n * faktor);
  };

  const zusatz = (
    <>
      {zeigtStandard && standard && <HerkunftChip wert={standard} testid={testid ? `${testid}-standard` : undefined} />}
      {hatEigen && standard && (
        <button type="button" class="link-knopf" onClick={() => { setze(pfad, undefined); setText(null); setFehler(null); }} data-testid={testid ? `${testid}-zuruecksetzen` : undefined}>
          {zuruecksetzenText}
        </button>
      )}
    </>
  );

  return (
    <FeldRahmen label={label} info={info} id={id} zusatz={zusatz} breit={breit}>
      <div class={`eingabe${zeigtStandard ? ` eingabe--${standard ? herkunftKlasse(standard) : 'standard'}` : ''}${hatEigen && standard ? ' eingabe--override' : ''}${fehler ? ' eingabe--fehler' : ''}`}>
        <input
          id={id}
          class="eingabe__feld"
          type="text"
          inputMode="decimal"
          autocomplete="off"
          value={anzeige}
          placeholder={platzhalter}
          aria-invalid={fehler ? true : undefined}
          data-testid={testid}
          data-standard={zeigtStandard ? 'ja' : undefined}
          data-eigen={hatEigen && standard ? 'ja' : undefined}
          onFocus={() => setText(anzeige)}
          onInput={(e) => {
            const t = (e.currentTarget as HTMLInputElement).value;
            setText(t);
            pruefe(t);
          }}
          onBlur={() => setText(null)}
        />
        {einheit && <span class="eingabe__einheit">{einheit}</span>}
      </div>
      <FeldHinweise pfad={hinweisPfad ?? pfad} lokal={fehler} />
    </FeldRahmen>
  );
}

export function TextFeld({ pfad, label, info, platzhalter, testid, breit, muster, musterText }: { pfad: string; label: ComponentChildren; info?: ComponentChildren; platzhalter?: string; testid?: string; breit?: boolean; muster?: RegExp; musterText?: string }) {
  const id = useFeldId();
  const [fehler, setFehler] = useState<string | null>(null);
  const wert = lese<string>(pfad) ?? '';
  return (
    <FeldRahmen label={label} info={info} id={id} breit={breit}>
      <div class={`eingabe${fehler ? ' eingabe--fehler' : ''}`}>
        <input
          id={id}
          class="eingabe__feld"
          type="text"
          autocomplete="off"
          value={wert}
          placeholder={platzhalter}
          data-testid={testid}
          onInput={(e) => {
            const t = (e.currentTarget as HTMLInputElement).value;
            if (muster && t.trim() && !muster.test(t.trim())) {
              setFehler(musterText ?? 'Format prüfen.');
              return;
            }
            setFehler(null);
            setze(pfad, t.trim() === '' && pfad !== 'projekt.name' ? undefined : t);
          }}
        />
      </div>
      <FeldHinweise pfad={pfad} lokal={fehler} />
    </FeldRahmen>
  );
}

export interface Option<T> {
  wert: T;
  label: string;
}

export function AuswahlFeld<T>({ pfad, label, info, optionen, leerText = '— bitte wählen —', standardText, testid, breit, beiWahl, leerWert }: {
  pfad: string;
  label: ComponentChildren;
  info?: ComponentChildren;
  optionen: ReadonlyArray<Option<T>>;
  /** Text der leeren Auswahl (ohne Standard). */
  leerText?: string;
  /** Wenn gesetzt: leere Auswahl heisst «Standard: …» (Kern verwendet dann seinen Standardwert). */
  standardText?: string | undefined;
  testid?: string;
  breit?: boolean;
  /** Eigene Schreiblogik (z. B. Store-Aktion) statt `setze(pfad, wert)`. */
  beiWahl?: (w: T | undefined) => void;
  /** Wert für «leer» (null bei offenen Fragen, sonst undefined). */
  leerWert?: null;
}) {
  const id = useFeldId();
  const roh = lese<T>(pfad);
  const index = optionen.findIndex((o) => o.wert === roh);
  return (
    <FeldRahmen label={label} info={info} id={id} breit={breit}>
      <div class={`eingabe eingabe--auswahl${index < 0 && standardText ? ' eingabe--standard' : ''}`}>
        <select
          id={id}
          class="eingabe__feld"
          value={index < 0 ? '' : String(index)}
          data-testid={testid}
          data-standard={index < 0 && standardText ? 'ja' : undefined}
          onChange={(e) => {
            const v = (e.currentTarget as HTMLSelectElement).value;
            const w = v === '' ? undefined : optionen[Number(v)]?.wert;
            if (beiWahl) beiWahl(w);
            else setze(pfad, w === undefined ? leerWert : w);
          }}
        >
          <option value="">{standardText ? `Standard: ${standardText}` : leerText}</option>
          {optionen.map((o, i) => (
            <option value={String(i)} key={o.label}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <FeldHinweise pfad={pfad} />
    </FeldRahmen>
  );
}

/** Ja/Nein-Frage (null = offen). */
export function JaNeinFeld({ pfad, label, info, testid, jaText = 'Ja', neinText = 'Nein' }: { pfad: string; label: ComponentChildren; info?: ComponentChildren; testid?: string; jaText?: string; neinText?: string }) {
  const wert = lese<boolean | null>(pfad);
  return (
    <div class="feld feld--frage" data-testid={testid}>
      <div class="feld__kopf">
        <span class="feld__label" id={`${testid ?? pfad}-l`}>
          {label}
        </span>
        {info && <Info text={info} />}
      </div>
      <div class="segment" role="radiogroup" aria-labelledby={`${testid ?? pfad}-l`}>
        <button type="button" role="radio" class="segment__knopf" aria-checked={wert === true} onClick={() => setze(pfad, true)} data-testid={testid ? `${testid}-ja` : undefined}>
          {jaText}
        </button>
        <button type="button" role="radio" class="segment__knopf" aria-checked={wert === false} onClick={() => setze(pfad, false)} data-testid={testid ? `${testid}-nein` : undefined}>
          {neinText}
        </button>
      </div>
      <FeldHinweise pfad={pfad} />
    </div>
  );
}

/** Auswahl als Segmente (wenige, kurze Optionen). */
export function SegmentFeld<T>({ pfad, label, info, optionen, testid, beiWahl }: { pfad: string; label: ComponentChildren; info?: ComponentChildren; optionen: ReadonlyArray<Option<T>>; testid?: string; beiWahl?: (w: T) => void }) {
  const wert = lese<T>(pfad);
  return (
    <div class="feld feld--frage" data-testid={testid}>
      <div class="feld__kopf">
        <span class="feld__label" id={`${testid ?? pfad}-l`}>
          {label}
        </span>
        {info && <Info text={info} />}
      </div>
      <div class="segment" role="radiogroup" aria-labelledby={`${testid ?? pfad}-l`}>
        {optionen.map((o) => (
          <button
            type="button"
            role="radio"
            class="segment__knopf"
            aria-checked={wert === o.wert}
            key={o.label}
            onClick={() => (beiWahl ? beiWahl(o.wert) : setze(pfad, o.wert))}
            data-testid={testid ? `${testid}-${String(o.wert)}` : undefined}
          >
            {o.label}
          </button>
        ))}
      </div>
      <FeldHinweise pfad={pfad} />
    </div>
  );
}

/** Grosse Auswahlkarten (Methode, Datenquelle) mit Erklärung. */
export function OptionKarten<T>({ pfad, label, optionen, testid, beiWahl }: { pfad: string; label: string; optionen: ReadonlyArray<Option<T> & { text: string }>; testid?: string; beiWahl?: (w: T) => void }) {
  const wert = lese<T>(pfad);
  return (
    <div class="optionen" role="radiogroup" aria-label={label}>
      {optionen.map((o) => (
        <button
          type="button"
          role="radio"
          class="option"
          aria-checked={wert === o.wert}
          onClick={() => (beiWahl ? beiWahl(o.wert) : setze(pfad, o.wert))}
          key={o.label}
          data-testid={testid ? `${testid}-${String(o.wert)}` : undefined}
        >
          <span class="option__radio" aria-hidden="true" />
          <span>
            <span class="option__titel">{o.label}</span>
            <span class="option__text">{o.text}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Abschnitt einer Schrittseite. */
export function Abschnitt({ titel, text, children, testid, aktion }: { titel: ComponentChildren; text?: ComponentChildren; children: ComponentChildren; testid?: string; aktion?: ComponentChildren }) {
  return (
    <section class="abschnitt" data-testid={testid}>
      <div class="abschnitt__kopf">
        <div>
          <h2 class="abschnitt__titel">{titel}</h2>
          {text && <p class="abschnitt__text">{text}</p>}
        </div>
        {aktion}
      </div>
      {children}
    </section>
  );
}

export function Raster({ children, spalten = 2 }: { children: ComponentChildren; spalten?: 2 | 3 | 4 }) {
  return <div class={`raster raster--${spalten}`}>{children}</div>;
}
