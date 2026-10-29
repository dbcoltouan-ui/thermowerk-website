import { ruhendeAngaben } from '../../kern/relevanz';
import { METHODEN } from '../../state/typen';
import { setzeMethode } from '../../state/ui';
import { store } from '../bindung';
import { Abschnitt, OptionKarten, Raster, TextFeld } from '../komponenten/Felder';

/** Schritt 0 — Projekt & Methode. */
export function ProjektMethode() {
  const s = store.state.value;
  const ruhend = ruhendeAngaben(s);
  return (
    <>
      <Abschnitt titel="Projekt">
        <Raster>
          <TextFeld pfad="projekt.name" label="Projektname" platzhalter="z. B. EFH Muster, Bern" testid="projektname-eingabe" breit info="Erscheint in der Kopfzeile, in der Projektliste und auf dem Bericht." />
          <TextFeld pfad="projekt.kunde" label="Kunde" testid="projekt-kunde" />
          <TextFeld pfad="projekt.adresse" label="Objektadresse" testid="projekt-adresse" />
          <TextFeld pfad="projekt.bearbeiter" label="Bearbeitet von" testid="projekt-bearbeiter" />
        </Raster>
      </Abschnitt>

      <Abschnitt titel="Wie wird die Heizlast bestimmt?" text="Die Wahl bestimmt Schritt 3. Sie lässt sich jederzeit ändern; Eingaben gehen dabei nicht verloren.">
        <OptionKarten pfad="methode" label="Methode" optionen={METHODEN.map((m) => ({ wert: m.id, label: m.titel, text: m.text }))} testid="methode" beiWahl={setzeMethode} />
        {s.methode && ruhend.length > 0 && (
          <div class="meldung meldung--info" data-testid="ruhende-angaben">
            <strong>Diese Angaben ruhen im gewählten Modus</strong> — sie bleiben gespeichert, werden aber weder gerechnet noch gedruckt:
            <ul>
              {ruhend.map((r) => (
                <li key={r.pfad}>{r.text}</li>
              ))}
            </ul>
          </div>
        )}
      </Abschnitt>
    </>
  );
}
