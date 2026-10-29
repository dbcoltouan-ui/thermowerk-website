import { projektnameAnzeige, speicherstatus } from '../../state/ui';

const STATUS: Record<string, string> = {
  entwurf: 'Entwurf · nicht gespeichert',
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
        <span class="topbar__status">{STATUS[speicherstatus.value]}</span>
      </div>
      <div class="topbar__aktionen">
        <button type="button" class="btn btn--ghost" disabled title="Session 6">
          Projekte
        </button>
        <button type="button" class="btn" disabled title="Session 9">
          Export
        </button>
      </div>
    </header>
  );
}
