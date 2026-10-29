import { useComputed } from '@preact/signals';
import { Topbar } from './komponenten/Topbar';
import { Schrittleiste } from './komponenten/Schrittleiste';
import { Dashboard, DashboardLeiste } from './komponenten/Dashboard';
import { SchrittSeite } from './komponenten/SchrittSeite';
import { ProjektMethode } from './seiten/ProjektMethode';
import { Platzhalter } from './seiten/Platzhalter';
import { aktiverSchritt, ergebnis, methode, geheZuSchritt } from '../state/ui';
import { sichtbareSchritte } from './schritte';
import type { SchrittStatus } from './schritte';

export function App() {
  const schritte = useComputed(() => sichtbareSchritte(methode.value));
  const index = Math.min(aktiverSchritt.value, schritte.value.length - 1);
  const schritt = schritte.value[index];
  if (!schritt) return null;

  // Status je Schritt aus dem einen Ergebnis (berechne), nie aus eigener UI-Logik.
  const status = ergebnis.value.status as Record<string, SchrittStatus>;

  return (
    <div class="shell">
      <Topbar />
      <Schrittleiste
        schritte={schritte.value}
        aktiv={index}
        status={status}
        onWahl={(i) => geheZuSchritt(i, schritte.value.length)}
      />
      <main class="haupt">
        <SchrittSeite
          schritt={schritt}
          istErster={index === 0}
          istLetzter={index === schritte.value.length - 1}
          onZurueck={() => geheZuSchritt(index - 1, schritte.value.length)}
          onWeiter={() => geheZuSchritt(index + 1, schritte.value.length)}
        >
          {schritt.id === 'projekt' ? <ProjektMethode /> : <Platzhalter schritt={schritt} />}
        </SchrittSeite>
        <Dashboard anzahlSchritte={schritte.value.length} status={status} />
      </main>
      <DashboardLeiste anzahlSchritte={schritte.value.length} status={status} />
    </div>
  );
}
