import { methode, projektname, setzeMethode, setzeProjektname } from '../../state/ui';
import { METHODEN } from '../../state/typen';

/** Schritt 0 — Projekt & Methode (Session 1: Projektname + Moduswahl; Rest folgt in Session 7). */
export function ProjektMethode() {
  return (
    <>
      <div class="karte">
        <div class="karte__titel">Projekt</div>
        <label class="feld">
          <span class="feld__label">Projektname</span>
          <input
            class="feld__input"
            type="text"
            value={projektname.value}
            onInput={(e) => setzeProjektname((e.currentTarget as HTMLInputElement).value)}
            placeholder="z. B. EFH Muster, Musterstrasse 1, 3000 Bern"
            data-testid="projektname-eingabe"
            autocomplete="off"
          />
          <span class="feld__hilfe">Erscheint in der Kopfzeile und auf dem Bericht — eine Quelle.</span>
        </label>
      </div>

      <div class="karte">
        <div class="karte__titel">Methode</div>
        <div class="moduswahl" role="radiogroup" aria-label="Methode">
          {METHODEN.map((m) => (
            <button
              type="button"
              role="radio"
              class="modus"
              aria-checked={methode.value === m.id}
              onClick={() => setzeMethode(m.id)}
              key={m.id}
              data-testid={`methode-${m.id}`}
            >
              <span class="modus__radio" aria-hidden="true" />
              <span>
                <span class="modus__titel">{m.titel}</span>
                <p class="modus__text">{m.text}</p>
              </span>
            </button>
          ))}
        </div>
        {methode.value && (
          <p class="hinweis" style={{ marginTop: 'var(--s-4)' }}>
            Die Methode kann jederzeit gewechselt werden. Eingaben bleiben erhalten; Angaben, die im anderen Modus
            nicht gebraucht werden, ruhen und werden nicht gedruckt.
          </p>
        )}
      </div>
    </>
  );
}
