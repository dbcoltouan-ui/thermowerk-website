import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  /** Inhalt des Auslösers (Text oder Icon). */
  knopf: ComponentChildren;
  /** Zugänglicher Name des Auslösers. */
  label: string;
  knopfKlasse?: string;
  children: ComponentChildren;
  testid?: string | undefined;
  ausrichtung?: 'links' | 'rechts';
}

/**
 * Kleines Aufklapp-Fenster (ⓘ-Erklärungen, Herkunft eines Werts). Schliesst bei Escape und Klick ausserhalb.
 * Ersetzt die vollbreiten Hinweisleisten des alten Tools (UX-30).
 */
export function Popover({ knopf, label, knopfKlasse = 'popover__knopf', children, testid, ausrichtung = 'links' }: Props) {
  const [offen, setOffen] = useState(false);
  const wurzel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!offen) return;
    const klick = (e: MouseEvent) => {
      if (wurzel.current && !wurzel.current.contains(e.target as Node)) setOffen(false);
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOffen(false);
    };
    document.addEventListener('mousedown', klick);
    document.addEventListener('keydown', taste);
    return () => {
      document.removeEventListener('mousedown', klick);
      document.removeEventListener('keydown', taste);
    };
  }, [offen]);

  return (
    <span class="popover" ref={wurzel}>
      <button type="button" class={knopfKlasse} aria-label={label} aria-expanded={offen} onClick={() => setOffen(!offen)} data-testid={testid}>
        {knopf}
      </button>
      {offen && (
        <span class={`popover__fenster popover__fenster--${ausrichtung}`} role="dialog" aria-label={label} data-testid={testid ? `${testid}-fenster` : undefined}>
          {children}
        </span>
      )}
    </span>
  );
}

/** ⓘ-Erklärung an einem Label. */
export function Info({ text, label = 'Erklärung' }: { text: ComponentChildren; label?: string }) {
  return (
    <Popover knopf="i" label={label} knopfKlasse="info-knopf">
      <span class="popover__text">{text}</span>
    </Popover>
  );
}
