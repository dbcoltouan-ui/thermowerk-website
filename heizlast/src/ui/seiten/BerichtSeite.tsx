import { useEffect, useState } from 'preact/hooks';
import { Bericht } from '../../bericht/Bericht';
import { dateiname, projektJson } from '../../bericht/export';
import type { PruefPunkt } from '../../bericht/pruefliste';
import { druckFreigegeben, pruefliste } from '../../bericht/pruefliste';
import { firmaDaten } from '../../daten/firma';
import { geheZu } from '../../state/ui';
import { daten, store } from '../bindung';
import { Abschnitt } from '../komponenten/Felder';
import { SCHRITTE } from '../schritte';

const FIRMA = firmaDaten();

/** Heutiges Datum (lokal) als JJJJ-MM-TT. */
function heuteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function schrittTitel(id: string): string {
  const s = SCHRITTE.find((x) => x.id === id);
  return s ? `${s.nr} ${s.titel}` : id;
}

function PunktListe({ punkte, art, testid }: { punkte: ReadonlyArray<PruefPunkt>; art: 'offen' | 'warnung'; testid: string }) {
  return (
    <ul class={`pruefliste pruefliste--${art}`} data-testid={testid}>
      {punkte.map((p, i) => (
        <li key={`${p.schritt}-${i}`} class="pruefliste__punkt">
          <button type="button" class="link-knopf" onClick={() => geheZu(p.schritt)}>
            {schrittTitel(p.schritt)}
          </button>
          <span>{p.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Datei herunterladen (Blob + Link). */
function herunterladen(inhalt: string, name: string, typ: string) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Schritt 10 — Bericht: Vollständigkeits-Check (offene Punkte sperren den Druck, Warnungen sind nach Durchsicht
 * übersteuerbar), Druck als PDF über den Druckdialog des Browsers, JSON-Export des Projekts, Vorschau des Berichts.
 * Vorschau und Druck sind dieselbe Komponente aus dem einen Ergebnis.
 */
export function BerichtSeite() {
  const s = store.state.value;
  const e = store.ergebnis.value;
  const p = pruefliste(e);
  const [warnungenOk, setWarnungenOk] = useState(false);
  const frei = druckFreigegeben(p, warnungenOk);
  const datum = heuteIso();

  // Dateiname des PDFs = Dokumenttitel während des Drucks.
  useEffect(() => {
    const alt = document.title;
    const vor = () => (document.title = dateiname(s.projekt.name, datum, 'pdf').replace(/\.pdf$/, ''));
    const nach = () => (document.title = alt);
    window.addEventListener('beforeprint', vor);
    window.addEventListener('afterprint', nach);
    return () => {
      window.removeEventListener('beforeprint', vor);
      window.removeEventListener('afterprint', nach);
      document.title = alt;
    };
  }, [s.projekt.name, datum]);

  return (
    <>
      <div class="bericht-steuerung">
        <Abschnitt titel="Vollständigkeit" testid="bericht-pruefung">
          {p.offen.length === 0 && p.warnungen.length === 0 && (
            <p class="zeile-info" data-testid="bericht-vollstaendig">
              Alle Angaben vollständig — der Bericht kann gedruckt werden.
            </p>
          )}
          {p.offen.length > 0 && (
            <>
              <p class="zeile-info zeile-info--fehler" data-testid="bericht-offen-text">
                {p.offen.length === 1 ? 'Ein Punkt ist' : `${p.offen.length} Punkte sind`} noch offen. Der Bericht enthält nur, was vollständig berechnet ist — darum ist der Druck gesperrt, bis diese Angaben ergänzt sind.
              </p>
              <PunktListe punkte={p.offen} art="offen" testid="bericht-offen" />
            </>
          )}
          {p.warnungen.length > 0 && (
            <>
              <p class="zeile-info">Warnungen — bitte prüfen; sie verhindern den Druck nicht, wenn sie bestätigt sind:</p>
              <PunktListe punkte={p.warnungen} art="warnung" testid="bericht-warnungen" />
              <label class="kaestchen__eintrag">
                <input type="checkbox" checked={warnungenOk} onChange={(ev) => setWarnungenOk((ev.currentTarget as HTMLInputElement).checked)} data-testid="bericht-warnungen-ok" />
                Warnungen geprüft — trotzdem drucken
              </label>
            </>
          )}
        </Abschnitt>
        <Abschnitt titel="Export" text="PDF über den Druckdialog des Browsers («Als PDF sichern»). Das Projekt als Datei lässt sich unter «Projekte» wieder laden.">
          <div class="bericht-aktionen">
            <button type="button" class="btn btn--primary" disabled={!frei} onClick={() => window.print()} data-testid="bericht-drucken">
              Bericht drucken / als PDF sichern
            </button>
            <button type="button" class="btn" onClick={() => herunterladen(projektJson(s), dateiname(s.projekt.name, datum, 'json'), 'application/json')} data-testid="bericht-json">
              Projekt als Datei (JSON)
            </button>
          </div>
        </Abschnitt>
        <h2 class="bericht-vorschau__titel">Vorschau</h2>
      </div>
      <div class="bericht-rahmen" data-testid="bericht-vorschau">
        <Bericht state={s} ergebnis={e} daten={daten} firma={FIRMA} datum={datum} logoUrl={`${import.meta.env.BASE_URL}${FIRMA.logo}`} />
      </div>
    </>
  );
}
