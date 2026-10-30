import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

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

/** Unter dieser Breite erscheint das Fenster als Leiste am unteren Bildschirmrand (volle Breite). */
const SCHMAL_PX = 640;
const RAND_PX = 8;

/**
 * Kleines Aufklapp-Fenster (ⓘ-Erklärungen, Herkunft eines Werts). Schliesst bei Escape und Klick ausserhalb.
 * Liegt immer vollständig im Bildschirm (Session 7b): auf breiten Bildschirmen wird es horizontal so verschoben,
 * dass es nicht rechts oder links abgeschnitten wird; auf schmalen Bildschirmen klappt es unten als volle
 * Breite auf. Ersetzt die vollbreiten Hinweisleisten des alten Tools (UX-30).
 */
export function Popover({ knopf, label, knopfKlasse = 'popover__knopf', children, testid, ausrichtung = 'links' }: Props) {
  const [offen, setOffen] = useState(false);
  const [lage, setLage] = useState<{ modus: 'leiste' | 'schwebend'; verschiebung: number }>({ modus: 'schwebend', verschiebung: 0 });
  const wurzel = useRef<HTMLSpanElement>(null);
  const fenster = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!offen) return;
    const klick = (e: MouseEvent | TouchEvent) => {
      if (wurzel.current && !wurzel.current.contains(e.target as Node)) setOffen(false);
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOffen(false);
    };
    document.addEventListener('mousedown', klick);
    document.addEventListener('touchstart', klick, { passive: true });
    document.addEventListener('keydown', taste);
    return () => {
      document.removeEventListener('mousedown', klick);
      document.removeEventListener('touchstart', klick);
      document.removeEventListener('keydown', taste);
    };
  }, [offen]);

  // Nach dem Öffnen messen: ragt das Fenster über den Bildschirmrand, verschieben bzw. als Leiste zeigen.
  useLayoutEffect(() => {
    if (!offen) return;
    const messen = () => {
      const breite = window.innerWidth;
      if (breite < SCHMAL_PX) {
        setLage({ modus: 'leiste', verschiebung: 0 });
        return;
      }
      const el = fenster.current;
      if (!el) return;
      el.style.transform = '';
      const r = el.getBoundingClientRect();
      let dx = 0;
      if (r.right > breite - RAND_PX) dx = breite - RAND_PX - r.right;
      if (r.left + dx < RAND_PX) dx = RAND_PX - r.left;
      setLage({ modus: 'schwebend', verschiebung: Math.round(dx) });
    };
    messen();
    window.addEventListener('resize', messen);
    return () => window.removeEventListener('resize', messen);
  }, [offen]);

  return (
    <span class="popover" ref={wurzel}>
      <button type="button" class={knopfKlasse} aria-label={label} aria-expanded={offen} onClick={() => setOffen(!offen)} data-testid={testid}>
        {knopf}
      </button>
      {offen && (
        <span
          ref={fenster}
          class={`popover__fenster popover__fenster--${ausrichtung}${lage.modus === 'leiste' ? ' popover__fenster--leiste' : ''}`}
          style={lage.modus === 'schwebend' && lage.verschiebung ? { transform: `translateX(${lage.verschiebung}px)` } : undefined}
          role="dialog"
          aria-label={label}
          data-testid={testid ? `${testid}-fenster` : undefined}
          data-modus={lage.modus}
        >
          {lage.modus === 'leiste' && (
            <button type="button" class="popover__schliessen" aria-label="Schliessen" onClick={() => setOffen(false)}>
              ×
            </button>
          )}
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
