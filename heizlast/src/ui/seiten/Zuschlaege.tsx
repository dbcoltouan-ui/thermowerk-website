import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { Wert } from '../../kern/wert';
import { fmt } from '../../kern/wert';
import { parseZahl, rel, store } from '../bindung';
import { Abschnitt, JaNeinFeld, Raster, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { kW } from '../format';

/** Zeile des Rechenwegs Q_h = Q_hl + Q_w + Q_off + Q_as (Begründung = eingesetzte Zahlen aus dem Kern). */
function Zeile({ label, wert, testid, summe }: { label: ComponentChildren; wert: Wert | null; testid: string; summe?: boolean }) {
  return (
    <li class={`rechenweg__schritt${summe ? ' rechenweg__schritt--summe' : ''}`}>
      <span class="rechenweg__label">{label}</span>
      <span class="rechenweg__formel">{wert?.begruendung ?? '—'}</span>
      <span class="rechenweg__wert">
        <WertAnzeige wert={wert} text={kW(wert?.wert)} testid={testid} />
      </span>
    </li>
  );
}

/** Verbundene Systeme (Q_as): Liste ohne ids im Schema — Pfade über den Index, Anlegen erst mit gültiger Leistung. */
function Zusatzverbraucher() {
  const liste = store.state.value.zuschlaege.zusatz;
  const [name, setName] = useState('');
  const [leistung, setLeistung] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const anlegen = () => {
    const kw = parseZahl(leistung);
    if (kw === undefined || Number.isNaN(kw) || kw <= 0) return setFehler('Leistung in kW eingeben (z. B. 1.5).');
    store.aktion((s) => ({ ...s, zuschlaege: { ...s.zuschlaege, zusatz: [...s.zuschlaege.zusatz, { bezeichnung: name.trim() || `Zusatz ${s.zuschlaege.zusatz.length + 1}`, leistungW: kw * 1000 }] } }));
    setName('');
    setLeistung('');
    setFehler(null);
  };
  return (
    <div class="zusatz" data-testid="zusatz">
      {liste.length > 0 && (
        <ul class="zusatz__liste">
          {liste.map((z, i) => (
            <li class="zusatz__zeile" key={`${i}${z.bezeichnung}`} data-testid={`zusatz-${i + 1}`}>
              <span class="zusatz__name">{z.bezeichnung}</span>
              <span class="zusatz__wert" data-testid={`zusatz-${i + 1}-leistung`}>{kW(z.leistungW)}</span>
              <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => store.aktion((s) => ({ ...s, zuschlaege: { ...s.zuschlaege, zusatz: s.zuschlaege.zusatz.filter((_, j) => j !== i) } }))} data-testid={`zusatz-${i + 1}-entfernen`}>
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}
      <div class="zusatz__neu">
        <div class="feld">
          <label class="feld__label" for="zusatz-name">
            Verbundenes System
          </label>
          <div class="eingabe">
            <input id="zusatz-name" class="eingabe__feld" type="text" value={name} placeholder="z. B. Schwimmbad, Lüftung" onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} data-testid="zusatz-name" />
          </div>
        </div>
        <div class="feld">
          <label class="feld__label" for="zusatz-leistung">
            Leistung
          </label>
          <div class={`eingabe${fehler ? ' eingabe--fehler' : ''}`}>
            <input id="zusatz-leistung" class="eingabe__feld" type="text" inputMode="decimal" value={leistung} onInput={(e) => setLeistung((e.currentTarget as HTMLInputElement).value)} data-testid="zusatz-leistung" />
            <span class="eingabe__einheit">kW</span>
          </div>
          {fehler && (
            <ul class="feld__hinweise">
              <li class="feld__hinweis feld__hinweis--fehler" role="alert">
                {fehler}
              </li>
            </ul>
          )}
        </div>
        <button type="button" class="btn btn--klein" onClick={anlegen} data-testid="zusatz-neu">
          Hinzufügen
        </button>
      </div>
    </div>
  );
}

/** Schritt 7 — Zuschläge & Leistung: Sperrzeit, verbundene Systeme, Aufschlüsselung Q_h (alles aus dem Ergebnis). */
export function Zuschlaege() {
  const e = store.ergebnis.value;
  const z = e.zuschlaege;
  const sp = z.sperrzeit;
  return (
    <>
      <Fehlend schritt="zuschlaege" />
      <Abschnitt titel="Sperrzeit" text="Während der EVU-Sperrzeit läuft die WP nicht; die Heizlast muss in der übrigen Zeit nachgeliefert werden: Q_off = Q_hl × t_off / (24 − t_off).">
        <JaNeinFeld pfad="zuschlaege.sperrzeitAktiv" label="Gibt es eine Sperrzeit des Elektrizitätswerks?" testid="sperrzeit" info="Angabe des Netzbetreibers. Massgebend ist die Summe aller Sperrfenster pro Tag (z. B. 3 × 2 h = 6 h)." />
        {rel('zuschlaege.sperrzeitH') && (
          <Raster>
            <ZahlFeld pfad="zuschlaege.sperrzeitH" label="Sperrzeit pro Tag (Summe)" einheit="h/d" min={0} max={8} dez={1} testid="sperrzeit-h" />
            {sp && (
              <div class="feld feld--wert">
                <span class="feld__label">Faktor t_off / (24 − t_off)</span>
                <WertAnzeige wert={sp.faktor} text={fmt(sp.faktor.wert, 3)} testid="sperrzeit-faktor" />
              </div>
            )}
          </Raster>
        )}
        <Meldungen schritt="zuschlaege" testid="zuschlaege-meldungen" />
      </Abschnitt>

      <Abschnitt titel="Verbundene Systeme" text="Zusätzliche Wärmeabnehmer, die gleichzeitig mit der Heizung versorgt werden müssen (Q_as), z. B. Schwimmbad oder Lufterhitzer.">
        <Zusatzverbraucher />
      </Abschnitt>

      <Abschnitt titel="Auslegungsleistung" text="Q_h = Q_hl + Q_w + Q_off + Q_as (FWS-Kurs Modul 3) — diese Leistung braucht die Wärmepumpe am Auslegungspunkt." testid="qh-aufschluesselung">
        <ol class="rechenweg">
          <Zeile label={<>Heizlast Q<sub>hl</sub></>} wert={z.qhl} testid="zu-qhl" />
          <Zeile label={<>Warmwasser Q<sub>w</sub></>} wert={z.qw} testid="zu-qw" />
          <Zeile label={<>Sperrzeit Q<sub>off</sub></>} wert={z.qoff} testid="zu-qoff" />
          <Zeile label={<>Verbundene Systeme Q<sub>as</sub></>} wert={z.qas} testid="zu-qas" />
          <Zeile label={<>Auslegungsleistung Q<sub>h</sub></>} wert={z.qh} testid="zu-qh" summe />
        </ol>
        {!z.qh && <p class="zeile-info">Q<sub>h</sub> folgt, sobald die Heizlast (Schritt 4) feststeht.</p>}
      </Abschnitt>
    </>
  );
}
