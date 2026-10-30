import { verwaltung } from '../state/app';
import { aktiverSchritt, ergebnis, geheZu, speicherfehler } from '../state/ui';
import { Dashboard, DashboardLeiste } from './komponenten/Dashboard';
import { Schrittleiste } from './komponenten/Schrittleiste';
import { SchrittSeite } from './komponenten/SchrittSeite';
import { Topbar } from './komponenten/Topbar';
import { sichtbareSchritte } from './schritte';
import type { SchrittDef } from './schritte';
import { BerichtSeite } from './seiten/BerichtSeite';
import { Gebaeude } from './seiten/Gebaeude';
import { Heizlast } from './seiten/Heizlast';
import { HuelleRaeume } from './seiten/HuelleRaeume';
import { ProjektMethode } from './seiten/ProjektMethode';
import { Sanierungen } from './seiten/Sanierungen';
import { Speicher } from './seiten/Speicher';
import { Verbrauch } from './seiten/Verbrauch';
import { Waermeabgabe } from './seiten/Waermeabgabe';
import { Waermepumpe } from './seiten/Waermepumpe';
import { Warmwasser } from './seiten/Warmwasser';
import { Zuschlaege } from './seiten/Zuschlaege';

function Seite({ schritt }: { schritt: SchrittDef }) {
  switch (schritt.id) {
    case 'projekt':
      return <ProjektMethode />;
    case 'gebaeude':
      return <Gebaeude />;
    case 'sanierungen':
      return <Sanierungen />;
    case 'verbrauch':
      return <Verbrauch />;
    case 'huelle':
      return <HuelleRaeume />;
    case 'heizlast':
      return <Heizlast />;
    case 'warmwasser':
      return <Warmwasser />;
    case 'waermeabgabe':
      return <Waermeabgabe />;
    case 'zuschlaege':
      return <Zuschlaege />;
    case 'speicher':
      return <Speicher />;
    case 'waermepumpe':
      return <Waermepumpe />;
    case 'bericht':
      return <BerichtSeite />;
  }
}

export function App() {
  const e = ergebnis.value;
  const schritte = sichtbareSchritte(e.relevanteSchritte);
  // Ein ruhender Schritt (z. B. nach Moduswechsel) fällt auf die andere Variante von Schritt 3 bzw. auf Schritt 0 zurück.
  const gewuenscht = aktiverSchritt.value;
  const schritt = schritte.find((s) => s.id === gewuenscht) ?? schritte.find((s) => (gewuenscht === 'verbrauch' || gewuenscht === 'huelle') && s.nr === 3) ?? schritte[0]!;
  const i = schritte.indexOf(schritt);
  // Status je Schritt aus dem einen Ergebnis (berechne), nie aus eigener UI-Logik.
  const status = e.status;
  const meldungen = verwaltung.ladeMeldungen.value;

  return (
    <div class="shell">
      <Topbar />
      <Schrittleiste schritte={schritte} aktiv={schritt.id} status={status} onWahl={geheZu} />
      <main class="haupt">
        <div class="haupt__spalte">
          {speicherfehler.value && (
            <div class="meldung meldung--fehler" role="alert" data-testid="speicherfehler">
              {speicherfehler.value}
            </div>
          )}
          {meldungen.length > 0 && (
            <details class="meldung meldung--info" data-testid="lademeldungen">
              <summary>Beim Laden angepasst ({meldungen.length})</summary>
              <ul>
                {meldungen.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </details>
          )}
          <SchrittSeite schritt={schritt} vorher={schritte[i - 1]} nachher={schritte[i + 1]} onWahl={(s) => geheZu(s.id)}>
            <Seite schritt={schritt} />
          </SchrittSeite>
        </div>
        <Dashboard schritte={schritte} status={status} />
      </main>
      <DashboardLeiste schritte={schritte} status={status} />
    </div>
  );
}
