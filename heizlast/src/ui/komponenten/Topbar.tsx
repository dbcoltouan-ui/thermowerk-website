import { useEffect, useRef, useState } from 'preact/hooks';
import { verwaltung } from '../../state/app';
import { geheZu, projektnameAnzeige, speicherfehler, speicherstatus } from '../../state/ui';
import { kW } from '../format';

const STATUS: Record<string, string> = {
  neu: 'Neues Projekt',
  ungespeichert: 'Entwurf, nicht gespeichert',
  gespeichert: 'Gespeichert',
  fehler: 'Speichern fehlgeschlagen',
};

function datum(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Projektliste (lokal; Cloud folgt in Session 10). Laden fragt bei ungespeicherten Änderungen nach. */
function ProjekteDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);
  const liste = verwaltung.liste.value;
  return (
    <dialog ref={ref} class="dialog" onClose={onSchliessen} onCancel={onSchliessen} aria-labelledby="projekte-titel" data-testid="projekte-dialog">
      <div class="dialog__kopf">
        <h2 id="projekte-titel">Gespeicherte Projekte</h2>
        <button type="button" class="btn btn--ghost" onClick={onSchliessen} data-testid="projekte-schliessen">
          Schliessen
        </button>
      </div>
      {liste.length === 0 ? (
        <p class="leerzustand">Noch keine Projekte gespeichert. «Speichern» legt das aktuelle Projekt hier ab.</p>
      ) : (
        <ul class="projektliste">
          {liste.map((p) => (
            <li class="projektliste__eintrag" key={p.id} data-testid={`projekt-${p.id}`}>
              <div>
                <strong>{p.name || 'Ohne Namen'}</strong>
                <span class="mute">
                  {p.methode === 'fws' ? 'FWS-Kurs' : p.methode === 'raumweise' ? 'SIA 384/2' : 'Methode offen'}, Q<sub>h</sub> {kW(p.qhW)}, gespeichert {datum(p.gespeichert)}
                </span>
              </div>
              <div class="projektliste__aktionen">
                <button
                  type="button"
                  class="btn"
                  onClick={async () => {
                    if (await verwaltung.laden(p.id)) {
                      onSchliessen();
                      geheZu('projekt');
                    }
                  }}
                  data-testid={`projekt-${p.id}-laden`}
                >
                  Öffnen
                </button>
                <button
                  type="button"
                  class="btn btn--ghost link-knopf--gefahr"
                  onClick={() => {
                    if (globalThis.confirm?.(`Projekt «${p.name || 'Ohne Namen'}» endgültig löschen?`)) verwaltung.loeschen(p.id);
                  }}
                  data-testid={`projekt-${p.id}-loeschen`}
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  );
}

export function Topbar() {
  const [projekteOffen, setProjekteOffen] = useState(false);
  return (
    <header class="topbar">
      <div class="topbar__marke">
        Thermowerk <small>Heizlast</small>
      </div>
      <div class="topbar__projekt">
        <span class="topbar__projektname" data-testid="projektname">
          {projektnameAnzeige.value}
        </span>
        <span class={`topbar__status topbar__status--${speicherstatus.value}`} data-testid="speicherstatus" title={speicherfehler.value ?? undefined}>
          {STATUS[speicherstatus.value]}
        </span>
      </div>
      <div class="topbar__aktionen">
        <button type="button" class="btn btn--ghost" onClick={async () => { if (await verwaltung.neu()) geheZu('projekt'); }} data-testid="projekt-neu">
          Neu
        </button>
        <button type="button" class="btn btn--ghost" onClick={() => setProjekteOffen(true)} data-testid="projekte">
          Projekte
        </button>
        <button type="button" class="btn btn--ghost" disabled title="Bericht und Export folgen mit Schritt 10">
          Export
        </button>
        <button type="button" class="btn btn--primary" onClick={() => verwaltung.speichern()} data-testid="projekt-speichern">
          Speichern
        </button>
      </div>
      {projekteOffen && <ProjekteDialog onSchliessen={() => setProjekteOffen(false)} />}
    </header>
  );
}
