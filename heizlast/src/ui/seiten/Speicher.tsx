import type { ComponentChildren } from 'preact';
import type { Wert } from '../../kern/wert';
import { fmt } from '../../kern/wert';
import { daten, lese, rel, store } from '../bindung';
import { Abschnitt, AuswahlFeld, JaNeinFeld, Raster, SegmentFeld, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { zahl } from '../format';

const FSTO = daten.fws.speicherWarmwasser.fSto.map((f) => ({ wert: f.key, label: `${f.label} (f = ${f.wert})` }));
const FSTO_STD = daten.fws.speicherWarmwasser.fSto.find((f) => f.default);
const DRUCK = daten.hydraulik.mag.druckDefaults;
/** Ansprechdruck Sicherheitsventil als sichtbarer Standardwert (dieselbe Zahl nimmt der Kern ohne Angabe). */
const PSV_STD: Wert = { wert: DRUCK.pSvBar, einheit: 'bar', herkunft: 'fallback', stufe: 'standardwert', begruendung: `Ansprechdruck Sicherheitsventil ${fmt(DRUCK.pSvBar, 1)} bar (Standardwert EFH)`, quelle: 'DIN EN 12828; Tabellenbuch SHK B4 S.399 (Wissensbasis K)' };

/** Zeile «Bezeichnung · Rechenweg · Wert». */
function Schritt({ label, wert, einheit, dez = 0, testid }: { label: ComponentChildren; wert: Wert | null | undefined; einheit: string; dez?: number; testid?: string }) {
  if (!wert) return null;
  return (
    <li class="rechenweg__schritt">
      <span class="rechenweg__label">{label}</span>
      <span class="rechenweg__formel">{wert.begruendung}</span>
      <span class="rechenweg__wert">
        <WertAnzeige wert={wert} text={zahl(wert.wert, einheit, dez)} testid={testid} />
      </span>
    </li>
  );
}

function WwSpeicher() {
  const e = store.ergebnis.value;
  const sp = e.speicher.ww;
  const override = lese<number>('speicher.ww.volumenOverrideLiter') !== undefined;
  if (!rel('speicher.ww')) {
    return (
      <Abschnitt titel="Warmwasserspeicher" testid="speicher-ww">
        <p class="zeile-info" data-testid="speicher-ww-keiner">
          Kein Warmwasserspeicher in dieser Auslegung: die neue Wärmepumpe bereitet kein Warmwasser (Schritt 5).
        </p>
      </Abschnitt>
    );
  }
  return (
    <Abschnitt titel="Warmwasserspeicher" text="Volumen aus dem Tagesbedarf und der Temperaturdifferenz (SIA 385/2, FWS Folien 54–57), danach auf die nächste Marktgrösse." testid="speicher-ww">
      <Raster>
        <AuswahlFeld pfad="warmwasser.fStoKey" label="Schichtung im Speicher" optionen={FSTO} standardText={FSTO_STD ? `${FSTO_STD.label} (f = ${FSTO_STD.wert})` : undefined} testid="speicher-fsto" />
        <ZahlFeld pfad="speicher.ww.volumenOverrideLiter" label="Gewähltes Speichervolumen" einheit="l" min={50} max={5000} dez={0} standard={override ? sp?.volumen : sp?.volumenEffektiv} zuruecksetzenText="Vorschlag verwenden" testid="speicher-ww-volumen" info="Eigene Wahl gilt überall: Speicherverluste (Schritt 5), Dashboard und Bericht." />
      </Raster>
      {sp && (
        <ol class="rechenweg">
          <Schritt label="Volumen ohne Schichtung" wert={sp.volumenRoh} einheit="l" />
          <Schritt label="Schichtungsfaktor" wert={sp.fSto} einheit="" dez={2} />
          <Schritt label="Volumen" wert={sp.volumen} einheit="l" />
          <Schritt label="Spitzendeckung (min.)" wert={sp.spitzendeckung} einheit="l" />
          <Schritt label="Speicher effektiv" wert={sp.volumenEffektiv} einheit="l" testid="speicher-ww-effektiv" />
        </ol>
      )}
    </Abschnitt>
  );
}

function Puffer() {
  const s = store.state.value;
  const e = store.ergebnis.value;
  const pu = e.speicher.puffer;
  const aktiv = s.speicher.puffer.aktiv;
  return (
    <Abschnitt titel="Pufferspeicher" text="Puffer = grösster Wert aus Hersteller-Minimum und den Kriterien der Wärmequelle (Abtauung, Taktung, Sperrzeit). Eine eigene Wahl wirkt in Dashboard, MAG und Bericht." testid="speicher-puffer">
      <SegmentFeld
        pfad="speicher.puffer.aktiv"
        label="Puffer"
        optionen={[{ wert: null, label: 'nach Vorschlag' }, { wert: true, label: 'ja' }, { wert: false, label: 'kein Puffer' }]}
        testid="puffer-aktiv"
        info="«Kein Puffer» ist eine bewusste Wahl (z. B. Hersteller verlangt keinen, genug Wasserinhalt in der Anlage) — das effektive Volumen ist dann 0 l."
      />
      {rel('speicher.puffer.einzelraumregelung') && (
        <Raster>
          <JaNeinFeld pfad="speicher.puffer.einzelraumregelung" label="Einzelraumregelung (Thermostatventile)?" testid="puffer-err" info="Mit Einzelraumregelung kann der Durchfluss stark sinken — der Puffer sichert die Mindestumlaufmenge." />
          {rel('speicher.puffer.sperrzeitUeberbrueckung') && <SegmentFeld pfad="speicher.puffer.sperrzeitUeberbrueckung" label="Puffer überbrückt die Sperrzeit?" optionen={[{ wert: true, label: 'ja' }, { wert: false, label: 'nein' }]} testid="puffer-sperrzeit" />}
        </Raster>
      )}
      {pu && aktiv !== false && (
        <>
          {pu.kriterien.length > 0 && (
          <div class="tabelle-rahmen">
            <table class="tabelle tabelle--kompakt" data-testid="puffer-kriterien">
              <thead>
                <tr>
                  <th>Kriterium</th>
                  <th class="zahl">Volumen</th>
                </tr>
              </thead>
              <tbody>
                {pu.kriterien.map((k) => (
                  <tr key={k.key} class={k.key === pu.massgebend ? 'tabelle__massgebend' : undefined}>
                    <td>
                      {k.label}
                      {k.key === pu.massgebend && <span class="badge badge--brand"> massgebend</span>}
                    </td>
                    <td class="zahl">
                      <WertAnzeige wert={k.liter} text={zahl(k.liter.wert, 'l')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          <p class="zeile-info">{pu.begruendung}</p>
          {rel('speicher.puffer.volumenOverrideLiter') && (
            <Raster>
              <ZahlFeld pfad="speicher.puffer.volumenOverrideLiter" label="Gewähltes Puffervolumen" einheit="l" min={0} max={10000} dez={0} standard={pu.volumen} zuruecksetzenText="Vorschlag verwenden" testid="puffer-volumen" />
            </Raster>
          )}
        </>
      )}
      <div class="ergebniszeile ergebniszeile--summe">
        <span>Puffer effektiv</span>
        <WertAnzeige wert={e.speicher.pufferEffektiv} text={zahl(e.speicher.pufferEffektiv.wert, 'l')} testid="puffer-effektiv" immerChip />
      </div>
      <Meldungen schritt="speicher" codes={['puffer.']} testid="puffer-meldungen" />
    </Abschnitt>
  );
}

function MagSv() {
  const e = store.ergebnis.value;
  const m = e.speicher.mag;
  const sv = e.speicher.sicherheitsventil;
  return (
    <Abschnitt titel="Ausdehnungsgefäss und Sicherheitsventil" text={`Nach DIN EN 12828 mit der Auslegungs-VL ${zahl(e.auslegungsVL.wert, '°C', 0)} als höchster Vorlauftemperatur.`} testid="speicher-mag">
      <Raster spalten={3}>
        <ZahlFeld pfad="speicher.mag.anlagenvolumenLiter" label="Anlagenvolumen" einheit="l" min={10} max={20000} dez={0} standard={m?.anlagenvolumen} testid="mag-volumen" info="Wasserinhalt von Leitungen, Heizflächen und Puffer. Ohne Angabe aus der Heizleistung geschätzt (l/kW je Heizflächenart) plus Puffer." />
        <ZahlFeld pfad="speicher.mag.p0Bar" label="Vordruck p₀" einheit="bar" min={0.3} max={6} dez={1} standard={m?.p0} testid="mag-p0" info="Statische Höhe / 10 + Zuschlag. EFH meist 1.0–1.5 bar." />
        <ZahlFeld pfad="speicher.mag.pSvBar" label="Sicherheitsventil" einheit="bar" min={1.5} max={10} dez={1} standard={PSV_STD} testid="mag-psv" />
      </Raster>
      {m && (
        <ol class="rechenweg">
          <Schritt label="Ausdehnung n" wert={m.n} einheit="%" dez={2} />
          <Schritt label="Ausdehnungsvolumen V_e" wert={m.ve} einheit="l" dez={1} />
          <Schritt label="Wasservorlage V_V" wert={m.vv} einheit="l" dez={1} />
          <Schritt label="Enddruck p_e" wert={m.pe} einheit="bar" dez={1} />
          <Schritt label="Mindest-Nennvolumen" wert={m.vn} einheit="l" dez={1} />
          <Schritt label="MAG" wert={m.vnMarkt} einheit="l" testid="mag-markt" />
        </ol>
      )}
      {sv && (
        <div class="ergebniszeile" data-testid="sv">
          <span>Sicherheitsventil</span>
          <span class="ergebniszeile__werte">
            <strong>{sv.dn}</strong>
            <span>
              {sv.anschluss}, Ausblaseleitung {sv.ausblaseleitung}, {fmt(sv.ansprechdruckBar, 1)} bar
            </span>
          </span>
          <span class="zeile-info zeile-info--klein">{sv.begruendung}</span>
        </div>
      )}
      <Meldungen schritt="speicher" codes={['mag.']} />
    </Abschnitt>
  );
}

/** Schritt 8 — Speicher & Hydraulik: WW-Speicher (nur wenn die WP Warmwasser bereitet), Puffer, MAG/SV; Overrides wirken überall. */
export function Speicher() {
  return (
    <>
      <Fehlend schritt="speicher" />
      <WwSpeicher />
      <Puffer />
      <MagSv />
      <Meldungen schritt="speicher" ohne={['puffer.', 'mag.']} />
    </>
  );
}
