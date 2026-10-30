import { useEffect, useRef, useState } from 'preact/hooks';
import { verwaltung } from '../../state/app';
import type { CloudAnzeige, CloudZustand } from '../../state/persistenz';

/** Kurztext (Topbar, auch mobil) und Langtext (Tooltip, Dialog) je Cloud-Zustand. */
const ANZEIGE: Record<CloudAnzeige, { kurz: string; lang: string }> = {
  aus: { kurz: 'Lokal', lang: 'Nur auf diesem Gerät' },
  pruefen: { kurz: 'Cloud …', lang: 'Verbindung zur Cloud wird geprüft' },
  angemeldet: { kurz: 'Cloud', lang: 'Cloud verbunden — alles abgeglichen' },
  abgleich: { kurz: 'Abgleich …', lang: 'Abgleich mit der Cloud läuft' },
  ausstehend: { kurz: 'Cloud', lang: 'Cloud verbunden — noch nicht alles abgeglichen' },
  konflikt: { kurz: 'Konflikt', lang: 'Cloud: neuerer Stand auf einem anderen Gerät' },
  abgemeldet: { kurz: 'Anmelden', lang: 'Cloud: nicht angemeldet — gespeichert wird nur auf diesem Gerät' },
  offline: { kurz: 'Offline', lang: 'Offline — gespeichert wird nur auf diesem Gerät' },
  fehler: { kurz: 'Cloud-Fehler', lang: 'Cloud nicht erreichbar — gespeichert wird nur auf diesem Gerät' },
};

/** Abgleich-Zustand eines Projekts in der Liste. */
export const ZUSTAND: Record<CloudZustand, string> = {
  synchron: 'In der Cloud',
  lokalNeuer: 'Noch nicht abgeglichen',
  serverNeuer: 'Neuerer Stand in der Cloud',
  nurLokal: 'Nur auf diesem Gerät',
  nurCloud: 'Nur in der Cloud',
  nichtMehrInCloud: 'In der Cloud gelöscht — nur noch hier',
};

export function datumZeit(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Cloud-Status in der Topbar (Desktop und mobil); Klick öffnet die Projekte mit Anmeldung. */
export function CloudChip({ onKlick }: { onKlick: () => void }) {
  const art = verwaltung.cloudAnzeige.value;
  const a = ANZEIGE[art];
  const text = verwaltung.cloudText.value;
  const titel = text && text !== a.lang ? `${a.lang}. ${text}` : a.lang;
  return (
    <button type="button" class={`cloudchip cloudchip--${art}`} onClick={onKlick} title={titel} aria-label={titel} data-testid="cloud-status" data-zustand={art}>
      <span class="cloudchip__punkt" aria-hidden="true" />
      <span class="cloudchip__text">{a.kurz}</span>
    </button>
  );
}

/** Kopf des Projekte-Dialogs: Status, Anmelden/Abmelden, erneut verbinden. */
export function CloudBereich() {
  const st = verwaltung.cloudStatus.value;
  const art = verwaltung.cloudAnzeige.value;
  const text = verwaltung.cloudText.value;
  const [passwort, setPasswort] = useState('');
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  if (st === 'aus') return null;

  const anmelden = async (ev: Event) => {
    ev.preventDefault();
    if (!passwort || laeuft) return;
    setLaeuft(true);
    const r = await verwaltung.anmelden(passwort);
    setLaeuft(false);
    setPasswort('');
    setMeldung(r.ok ? null : r.text);
  };

  return (
    <section class={`cloudbereich cloudbereich--${art}`} data-testid="cloud-bereich" aria-live="polite">
      <p class="cloudbereich__status">
        <span class={`cloudchip__punkt cloudchip--${art}`} aria-hidden="true" />
        <strong>{ANZEIGE[art].lang}</strong>
      </p>
      {st === 'angemeldet' && (
        <>
          <p class="zeile-info zeile-info--klein">Gespeicherte Projekte werden auch in der Cloud abgelegt und sind auf allen angemeldeten Geräten verfügbar.</p>
          <div class="cloudbereich__aktionen">
            <button type="button" class="btn" onClick={() => void verwaltung.cloudAbgleichen()} data-testid="cloud-abgleichen">
              Jetzt abgleichen
            </button>
            <button type="button" class="btn btn--ghost" onClick={() => void verwaltung.abmelden()} data-testid="cloud-abmelden">
              Abmelden
            </button>
          </div>
        </>
      )}
      {st === 'abgemeldet' && (
        <form class="cloudbereich__anmelden" onSubmit={anmelden}>
          <label class="cloudbereich__label" for="cloud-passwort">
            Passwort für die Cloud
          </label>
          <div class="cloudbereich__zeile">
            <span class="eingabe">
              <input
                id="cloud-passwort"
                class="eingabe__feld"
                type="password"
                autocomplete="current-password"
                value={passwort}
                onInput={(e) => setPasswort((e.currentTarget as HTMLInputElement).value)}
                data-testid="cloud-passwort"
              />
            </span>
            <button type="submit" class="btn btn--primary" disabled={!passwort || laeuft} data-testid="cloud-anmelden">
              {laeuft ? 'Anmelden …' : 'Anmelden'}
            </button>
          </div>
        </form>
      )}
      {(st === 'offline' || st === 'fehler') && (
        <div class="cloudbereich__aktionen">
          <button type="button" class="btn" onClick={() => void verwaltung.cloudAbgleichen()} data-testid="cloud-erneut">
            Erneut verbinden
          </button>
        </div>
      )}
      {(meldung ?? text) && (
        <p class="meldung meldung--warnung" role="status" data-testid="cloud-meldung">
          {meldung ?? text}
        </p>
      )}
    </section>
  );
}

/** «Server neuer – überschreiben / Kopie» (BUILD-08: kein stilles Überschreiben). */
export function KonfliktDialog() {
  const k = verwaltung.konflikt.value;
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (k && d && !d.open) d.showModal?.();
  }, [k]);
  if (!k) return null;
  return (
    <dialog
      ref={ref}
      class="dialog"
      aria-labelledby="konflikt-titel"
      data-testid="konflikt-dialog"
      onCancel={(e) => {
        e.preventDefault();
        void verwaltung.konfliktLoesen('spaeter');
      }}
    >
      <div class="dialog__kopf">
        <h2 id="konflikt-titel">Neuerer Stand in der Cloud</h2>
      </div>
      <p>
        Das Projekt wurde am {datumZeit(k.serverGeaendert)} auf einem anderen Gerät gespeichert{k.serverName !== k.name ? ` (dort: «${k.serverName}»)` : ''}. Ihr Stand «{k.name}»
        liegt bisher nur auf diesem Gerät.
      </p>
      <div class="konflikt__aktionen">
        <button type="button" class="btn btn--primary" onClick={() => void verwaltung.konfliktLoesen('ueberschreiben')} data-testid="konflikt-ueberschreiben">
          Meinen Stand behalten (Cloud überschreiben)
        </button>
        <button type="button" class="btn" onClick={() => void verwaltung.konfliktLoesen('kopie')} data-testid="konflikt-kopie">
          Meinen Stand als Kopie speichern
        </button>
        <button type="button" class="btn btn--ghost" onClick={() => void verwaltung.konfliktLoesen('spaeter')} data-testid="konflikt-spaeter">
          Später entscheiden
        </button>
      </div>
      <p class="zeile-info zeile-info--klein">Bei «Kopie» bleibt der Cloud-Stand unter dem bisherigen Namen erhalten, Ihr Stand wird ein eigenes Projekt.</p>
    </dialog>
  );
}
