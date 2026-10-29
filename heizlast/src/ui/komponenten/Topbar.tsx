import { verwaltung } from '../../state/app';
import { projektnameAnzeige, speicherfehler, speicherstatus } from '../../state/ui';

const STATUS: Record<string, string> = {
  neu: 'Neues Projekt',
  ungespeichert: 'Entwurf · nicht gespeichert',
  gespeichert: 'Gespeichert',
  fehler: 'Speichern fehlgeschlagen',
};

export function Topbar() {
  return (
    <header class="topbar">
      <div class="topbar__marke">
        Thermowerk <small>Heizlast</small>
      </div>
      <div class="topbar__projekt">
        <span class="topbar__projektname" data-testid="projektname">
          {projektnameAnzeige.value}
        </span>
        <span class="topbar__status" data-testid="speicherstatus" title={speicherfehler.value ?? undefined}>
          {STATUS[speicherstatus.value]}
        </span>
      </div>
      <div class="topbar__aktionen">
        <button type="button" class="btn btn--ghost" onClick={() => void verwaltung.neu()} data-testid="projekt-neu">
          Neu
        </button>
        <button type="button" class="btn btn--ghost" onClick={() => verwaltung.speichern()} data-testid="projekt-speichern">
          Speichern
        </button>
        <button type="button" class="btn btn--ghost" disabled title="Projektliste folgt in Session 7">
          Projekte
        </button>
        <button type="button" class="btn" disabled title="Session 9">
          Export
        </button>
      </div>
    </header>
  );
}
