import { useEffect, useRef, useState } from 'preact/hooks';
import { verwaltung } from '../../state/app';
import { geheZu, projektnameAnzeige, speicherfehler, speicherstatus } from '../../state/ui';
import { kW } from '../format';
import { methodeKurz } from '../ergebnisTexte';
import { CloudBereich, CloudChip, datumZeit, KonfliktDialog, ZUSTAND } from './Cloud';

const STATUS: Record<string, string> = {
  neu: 'Neues Projekt',
  ungespeichert: 'Entwurf, nicht gespeichert',
  gespeichert: 'Gespeichert',
  fehler: 'Speichern fehlgeschlagen',
};

/**
 * Projektliste: lokale und Cloud-Projekte in einer Liste (jedes Projekt einmal, mit Abgleich-Zustand), oben
 * Anmeldung/Cloud-Status. Laden fragt bei ungespeicherten Änderungen nach; Öffnen eines Cloud-Projekts lädt es.
 */
function ProjekteDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    void verwaltung.cloudAbgleichen();
  }, []);
  const liste = verwaltung.zeilen.value;
  return (
    <dialog ref={ref} class="dialog" onClose={onSchliessen} onCancel={onSchliessen} aria-labelledby="projekte-titel" data-testid="projekte-dialog">
      <div class="dialog__kopf">
        <h2 id="projekte-titel">Gespeicherte Projekte</h2>
        <button type="button" class="btn btn--ghost" onClick={onSchliessen} data-testid="projekte-schliessen">
          Schliessen
        </button>
      </div>
      <CloudBereich />
      {meldung && (
        <p class="meldung meldung--warnung" role="alert" data-testid="projekte-meldung">
          {meldung}
        </p>
      )}
      {liste.length === 0 ? (
        <p class="leerzustand">Noch keine Projekte gespeichert. «Speichern» legt das aktuelle Projekt hier ab.</p>
      ) : (
        <ul class="projektliste">
          {liste.map((p) => (
            <li class="projektliste__eintrag" key={p.id} data-testid={`projekt-${p.id}`}>
              <div>
                <strong>{p.name || 'Ohne Namen'}</strong>
                <span class="mute">
                  {methodeKurz(p.methode)}, Q<sub>h</sub> {kW(p.qhW)}, gespeichert {datumZeit(p.datum)}
                </span>
                {p.cloud && (
                  <span class={`cloudmarke cloudmarke--${p.cloud}`} data-testid={`projekt-${p.id}-cloud`} data-zustand={p.cloud}>
                    {ZUSTAND[p.cloud]}
                  </span>
                )}
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
                  onClick={async () => {
                    const name = p.name || 'Ohne Namen';
                    const inCloud = p.cloud === 'synchron' || p.cloud === 'lokalNeuer' || p.cloud === 'serverNeuer' || p.cloud === 'nurCloud';
                    if (!inCloud) {
                      if (globalThis.confirm?.(`Projekt «${name}» auf diesem Gerät endgültig löschen?`)) verwaltung.loeschen(p.id);
                      return;
                    }
                    if (!globalThis.confirm?.(`Projekt «${name}» endgültig löschen — auf diesem Gerät und in der Cloud (für alle Geräte)?`)) return;
                    const r = await verwaltung.ueberallLoeschen(p.id);
                    setMeldung(r.ok ? null : r.text);
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
      <div class="dialog__fuss">
        <label class="btn" for="projekt-datei">
          Projekt aus Datei laden (JSON)
        </label>
        <input
          id="projekt-datei"
          class="visually-hidden"
          type="file"
          accept="application/json,.json"
          data-testid="projekt-datei"
          onChange={async (ev) => {
            const input = ev.currentTarget as HTMLInputElement;
            const datei = input.files?.[0];
            input.value = '';
            if (!datei) return;
            if (await verwaltung.importieren(await datei.text())) {
              onSchliessen();
              geheZu('projekt');
            } else onSchliessen();
          }}
        />
        <span class="zeile-info zeile-info--klein">Datei aus «Projekt als Datei» in Schritt 10.</span>
      </div>
    </dialog>
  );
}

export function Topbar() {
  const [projekteOffen, setProjekteOffen] = useState(false);
  const cloudAus = verwaltung.cloudStatus.value === 'aus';
  return (
    <header class="topbar">
      <div class="topbar__marke" data-testid="topbar-marke">
        <img class="topbar__logo" src={`${import.meta.env.BASE_URL}img/logo.png`} alt="Thermowerk" width={900} height={130} />
        <span class="topbar__produkt">Heizlast</span>
      </div>
      <div class="topbar__projekt">
        <span class="topbar__projektname" data-testid="projektname">
          {projektnameAnzeige.value}
        </span>
        <span class={`topbar__status topbar__status--${speicherstatus.value}`} data-testid="speicherstatus" title={speicherfehler.value ?? undefined}>
          {STATUS[speicherstatus.value]}
        </span>
      </div>
      {!cloudAus && <CloudChip onKlick={() => setProjekteOffen(true)} />}
      <div class="topbar__aktionen">
        <button type="button" class="btn btn--ghost" onClick={async () => { if (await verwaltung.neu()) geheZu('projekt'); }} data-testid="projekt-neu">
          Neu
        </button>
        <button type="button" class="btn btn--ghost" onClick={() => setProjekteOffen(true)} data-testid="projekte">
          Projekte
        </button>
        <button type="button" class="btn btn--ghost" onClick={() => geheZu('bericht')} data-testid="export">
          Export
        </button>
        <button type="button" class="btn btn--primary" onClick={() => verwaltung.speichern()} data-testid="projekt-speichern">
          Speichern
        </button>
      </div>
      {projekteOffen && <ProjekteDialog onSchliessen={() => setProjekteOffen(false)} />}
      <KonfliktDialog />
    </header>
  );
}
