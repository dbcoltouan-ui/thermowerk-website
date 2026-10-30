import type { ZeitraumErgebnis } from '../../kern/fws';
import { etaPresetsFuer } from '../../kern/fws';
import type { Energietraeger } from '../../kern/typen';
import { ENERGIETRAEGER } from '../../kern/typen';
import { ERFASSUNGSARTEN } from '../../kern/verbrauchsreihe';
import { fmt } from '../../kern/wert';
import type { VerbrauchsReiheState } from '../../state/schema';
import { daten, lese, rel, setze, store } from '../bindung';
import { Ampel } from '../komponenten/Ampel';
import { Abschnitt, AuswahlFeld, DatumFeld, FeldHinweise, JaNeinFeld, MonatFeld, OptionKarten, Raster, SegmentFeld, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { Info } from '../komponenten/Popover';
import { kW, zahl } from '../format';
import { WwAngaben } from './WwAngaben';

const QUELLEN = [
  { wert: 'rechnungen', label: 'Energierechnungen, Lieferungen oder Zählerstände', text: 'Öl, Gas, Holz, Strom oder Fernwärme — idealerweise drei Heizperioden. Teilzeiträume werden über die Heizgradtage der Station aufs Jahr hochgerechnet.' },
  { wert: 'wpBetriebsstunden', label: 'Bestehende Wärmepumpe', text: 'Betriebsstundenzähler mit Nennleistung oder Stromverbrauch mit COP.' },
  { wert: 'messung', label: 'Wärmezähler', text: 'Gemessene Heizwärme in kWh pro Jahr.' },
  { wert: 'keine', label: 'Keine Verbrauchsdaten', text: 'Grobe Schätzung aus Bauperiode und EBF — als Schätzung mit Spanne markiert.' },
] as const;

const STREUUNG = daten.fws.verbrauch.streuung;
const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function traegerInfo(t: Energietraeger) {
  const konv = store.state.value.verbrauch.konvention;
  return daten.fws.heizwerte.konventionen[konv]?.traeger[t];
}

/** Anzeige-Einheit (Daten: ASCII, z. B. m3n → m³). */
function einheitAnzeige(e: string | undefined): string {
  return (e ?? '').replace('m3n', 'm³').replace('m3', 'm³');
}

function datumKurz(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
}

function datumMonat(ms: number): string {
  const d = new Date(ms);
  return `${MONATE_KURZ[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

type ZeitraumModus = 'jahr' | 'monate' | 'tage';

/** Erfassungsart, die zum Energieträger passt (gelieferte Brennstoffe → Lieferungen, leitungsgebundene → Zählerstände). */
function standardArt(t: Energietraeger): VerbrauchsReiheState['art'] {
  return t === 'heizoel' || t === 'pellets' || t === 'hartholz' || t === 'nadelholz' ? 'lieferungen' : 'zaehlerstaende';
}

function reiheLeer(r: VerbrauchsReiheState): boolean {
  return !(r.zeitraeume?.length || r.ablesungen?.length || r.lieferungen?.length || r.zaehlerstaende?.length);
}

function zeitraumModus(e: { jahr?: number; von?: string; bis?: string }): ZeitraumModus {
  if (e.jahr !== undefined) return 'jahr';
  if (/^\d{4}-\d{2}-\d{2}$/.test(e.von ?? '') || /^\d{4}-\d{2}-\d{2}$/.test(e.bis ?? '')) return 'tage';
  return 'monate';
}

/* ---------------------------------------------------------------------------------------------- */
/* Eingabearten                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

function ZeitraumZeile({ reihe, p, nr, eintrag, einheit, t }: { reihe: VerbrauchsReiheState; p: string; nr: number; eintrag: { id: string; jahr?: number; von?: string; bis?: string }; einheit: string; t: string }) {
  const ep = `${p}.zeitraeume.${eintrag.id}`;
  const modus = zeitraumModus(eintrag);
  const setzeModus = (m: ZeitraumModus) =>
    store.aktion((s) => ({
      ...s,
      verbrauch: {
        ...s.verbrauch,
        reihen: s.verbrauch.reihen.map((r) => {
          if (r.id !== reihe.id) return r;
          return {
            ...r,
            zeitraeume: (r.zeitraeume ?? []).map((x) => {
              if (x.id !== eintrag.id) return x;
              const { jahr: _j, von: _v, bis: _b, ...rest } = x;
              return m === 'jahr' ? { ...rest, jahr: new Date().getFullYear() - 1 } : rest;
            }),
          };
        }),
      },
    }));
  return (
    <div class="raster-zeile raster-zeile--zeitraum" data-testid={t}>
      <div class="feld">
        <div class="feld__kopf">
          <span class="feld__label">Zeitraum</span>
        </div>
        <div class="segment segment--klein" role="radiogroup" aria-label="Art des Zeitraums">
          {(
            [
              ['jahr', 'Kalenderjahr'],
              ['monate', 'Monate'],
              ['tage', 'Tage'],
            ] as const
          ).map(([m, l]) => (
            <button type="button" role="radio" class="segment__knopf" aria-checked={modus === m} onClick={() => modus !== m && setzeModus(m)} key={m} data-testid={`${t}-modus-${m}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {modus === 'jahr' && <ZahlFeld pfad={`${ep}.jahr`} label="Jahr" min={1990} max={2100} ganz testid={`${t}-jahr`} />}
      {modus === 'monate' && (
        <div class="paar">
          <MonatFeld pfad={`${ep}.von`} label="von (Monat)" vonJahr={1990} testid={`${t}-von`} hinweisPfad={ep} />
          <MonatFeld pfad={`${ep}.bis`} label="bis (Monat, inklusive)" vonJahr={1990} testid={`${t}-bis`} hinweisPfad={ep} />
        </div>
      )}
      {modus === 'tage' && (
        <div class="paar">
          <DatumFeld pfad={`${ep}.von`} label="von" testid={`${t}-von`} hinweisPfad={ep} />
          <DatumFeld pfad={`${ep}.bis`} label="bis (inklusive)" testid={`${t}-bis`} hinweisPfad={ep} />
        </div>
      )}
      <ZahlFeld pfad={`${ep}.menge`} label="Menge" einheit={einheit} min={0} testid={`${t}-menge`} />
      <button type="button" class="link-knopf link-knopf--gefahr raster-zeile__weg" onClick={() => setze(ep, undefined)} aria-label={`Zeitraum ${nr} entfernen`} data-testid={`${t}-entfernen`}>
        Entfernen
      </button>
    </div>
  );
}

function Zeitraeume({ reihe, p, einheit, t }: { reihe: VerbrauchsReiheState; p: string; einheit: string; t: string }) {
  const liste = reihe.zeitraeume ?? [];
  const naechster = (): Record<string, unknown> => {
    const letzt = liste[liste.length - 1];
    if (!letzt || letzt.jahr !== undefined) return { jahr: letzt?.jahr !== undefined ? letzt.jahr - 1 : new Date().getFullYear() - 1, menge: 0 };
    return { menge: 0 };
  };
  return (
    <div class="eingabeliste">
      {liste.length === 0 && <p class="leerzustand">Noch kein Zeitraum. Je Zeile ein Kalenderjahr, ein Monatsbereich oder ein taggenauer Zeitraum mit der verbrauchten Menge.</p>}
      {liste.map((e, i) => (
        <ZeitraumZeile reihe={reihe} p={p} nr={i + 1} eintrag={e} einheit={einheit} t={`${t}-zeitraum-${i + 1}`} key={e.id} />
      ))}
      <button type="button" class="btn btn--klein" onClick={() => store.hinzufuegen(`${p}.zeitraeume`, naechster(), 'z')} data-testid={`${t}-zeitraum-neu`}>
        Zeitraum hinzufügen
      </button>
    </div>
  );
}

function Lieferungen({ reihe, p, einheit, t }: { reihe: VerbrauchsReiheState; p: string; einheit: string; t: string }) {
  const staende = reihe.ablesungen ?? [];
  const lieferungen = reihe.lieferungen ?? [];
  return (
    <div class="zweispaltig">
      <div class="eingabeliste" data-testid={`${t}-staende`}>
        <h4 class="eingabeliste__titel">
          Tank- bzw. Lagerstand mit Datum
          <Info text="Mindestens Anfangs- und Endstand. Zwischenstände (z. B. jedes Jahr vor der Sommerlieferung) sind freiwillig und erlauben den Vergleich der einzelnen Jahre. Ein Stand am Tag einer Lieferung ist der Stand VOR der Lieferung (wie «Tankinhalt Anfang» im FWS-Rechner)." />
        </h4>
        {staende.length === 0 && <p class="leerzustand">Noch kein Stand erfasst.</p>}
        {staende.map((a, i) => {
          const ap = `${p}.ablesungen.${a.id}`;
          return (
            <div class="paar paar--mitWeg" key={a.id} data-testid={`${t}-stand-${i + 1}`}>
              <DatumFeld pfad={`${ap}.datum`} label="Datum" testid={`${t}-stand-${i + 1}-datum`} hinweisPfad={ap} />
              <ZahlFeld pfad={`${ap}.bestand`} label="Stand" einheit={einheit} min={0} testid={`${t}-stand-${i + 1}-bestand`} />
              <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => setze(ap, undefined)} aria-label={`Stand ${i + 1} entfernen`} data-testid={`${t}-stand-${i + 1}-entfernen`}>
                Entfernen
              </button>
            </div>
          );
        })}
        <button type="button" class="btn btn--klein" onClick={() => store.hinzufuegen(`${p}.ablesungen`, { datum: '', bestand: 0 }, 'a')} data-testid={`${t}-stand-neu`}>
          Stand hinzufügen
        </button>
      </div>
      <div class="eingabeliste" data-testid={`${t}-lieferungen`}>
        <h4 class="eingabeliste__titel">Lieferungen mit Datum und Menge</h4>
        {lieferungen.length === 0 && <p class="leerzustand">Noch keine Lieferung erfasst.</p>}
        {lieferungen.map((l, i) => {
          const lp = `${p}.lieferungen.${l.id}`;
          return (
            <div class="paar paar--mitWeg" key={l.id} data-testid={`${t}-lieferung-${i + 1}`}>
              <DatumFeld pfad={`${lp}.datum`} label="Datum" testid={`${t}-lieferung-${i + 1}-datum`} hinweisPfad={lp} />
              <ZahlFeld pfad={`${lp}.menge`} label="Menge" einheit={einheit} min={0} testid={`${t}-lieferung-${i + 1}-menge`} />
              <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => setze(lp, undefined)} aria-label={`Lieferung ${i + 1} entfernen`} data-testid={`${t}-lieferung-${i + 1}-entfernen`}>
                Entfernen
              </button>
            </div>
          );
        })}
        <button type="button" class="btn btn--klein" onClick={() => store.hinzufuegen(`${p}.lieferungen`, { datum: '', menge: 0 }, 'l')} data-testid={`${t}-lieferung-neu`}>
          Lieferung hinzufügen
        </button>
      </div>
    </div>
  );
}

function Zaehlerstaende({ reihe, p, einheit, t }: { reihe: VerbrauchsReiheState; p: string; einheit: string; t: string }) {
  const staende = reihe.zaehlerstaende ?? [];
  return (
    <div class="eingabeliste" data-testid={`${t}-zaehler`}>
      <h4 class="eingabeliste__titel">
        Zählerstände mit Datum
        <Info text="Abgelesene Stände, mindestens zwei. Der Verbrauch ist die Differenz aufeinanderfolgender Stände; bei einem Zählerwechsel eine neue Reihe beginnen." />
      </h4>
      {staende.length === 0 && <p class="leerzustand">Noch kein Zählerstand erfasst.</p>}
      {staende.map((z, i) => {
        const zp = `${p}.zaehlerstaende.${z.id}`;
        return (
          <div class="paar paar--mitWeg" key={z.id} data-testid={`${t}-zaehler-${i + 1}`}>
            <DatumFeld pfad={`${zp}.datum`} label="Datum" testid={`${t}-zaehler-${i + 1}-datum`} hinweisPfad={zp} />
            <ZahlFeld pfad={`${zp}.stand`} label="Zählerstand" einheit={einheit} min={0} testid={`${t}-zaehler-${i + 1}-stand`} />
            <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => setze(zp, undefined)} aria-label={`Zählerstand ${i + 1} entfernen`} data-testid={`${t}-zaehler-${i + 1}-entfernen`}>
              Entfernen
            </button>
          </div>
        );
      })}
      <button type="button" class="btn btn--klein" onClick={() => store.hinzufuegen(`${p}.zaehlerstaende`, { datum: '', stand: 0 }, 'zs')} data-testid={`${t}-zaehler-neu`}>
        Zählerstand hinzufügen
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Zeitraum-Tabelle (Ergebnis je Reihe)                                                            */
/* ---------------------------------------------------------------------------------------------- */

function SanierungText({ z }: { z: ZeitraumErgebnis }) {
  const s = z.sanierung;
  if (!s.bezug.length) return <span class="mute">—</span>;
  return (
    <span class="sanierungsbezug">
      {s.bezug.map((b) => (
        <span class={`sanierungsbezug__eintrag sanierungsbezug__eintrag--${b.lage}`} key={`${b.id ?? b.label}${b.datumMs}`}>
          {b.label} {datumMonat(b.datumMs)}: {b.lage === 'innerhalb' ? `mitten im Zeitraum (${s.subperioden.map((sp) => `${sp.tage} d × ${sp.faktor.toFixed(2)}`).join(' + ')})` : b.lage === 'vorher' ? `nach dem Zeitraum — Verbrauch wird um Faktor ${(s.faktorIst / s.faktorUnsaniert).toFixed(3)} umgerechnet` : 'vor dem Zeitraum — bereits im Verbrauch enthalten'}
        </span>
      ))}
    </span>
  );
}

function ZeitraumTabelle({ zeitraeume, einheit, t }: { zeitraeume: ZeitraumErgebnis[]; einheit: string; t: string }) {
  if (!zeitraeume.length) return null;
  const klima = store.state.value.verbrauch.klimabereinigung;
  return (
    <div class="zr-liste" data-testid={`${t}-zeitraeume`}>
      <div class="zr zr--kopf" aria-hidden="true">
        <span>Zeitraum</span>
        <span>Menge</span>
        <span>
          Heizgradtage <Info text="HGT 20/12 der Klimastation aus Schritt 1 für genau diesen Zeitraum (MeteoSchweiz-Monatswerte, Teilmonate anteilig). Überschreibbar; «Standard verwenden» setzt auf den Tabellenwert zurück. Ohne Standort gibt es keinen Wert — dann wird nach Tagen hochgerechnet." />
        </span>
        <span>
          Jahresanteil <Info text="Wie viel eines Heizjahres der Zeitraum abdeckt. Ganze Kalenderjahre: Tage/365 (FWS-Kurs). Andere Zeiträume: Heizgradtage des Zeitraums geteilt durch die Jahres-Heizgradtage der umgebenden Kalenderjahre. Mit Klimabereinigung: Heizgradtage geteilt durch das Normjahr der Station." />
        </span>
        <span>pro Jahr</span>
      </div>
      {zeitraeume.map((z, i) => (
        <div class="zr" key={z.id} data-testid={`${t}-ergebnis-${i + 1}`}>
          <div class="zr__zelle zr__zeitraum">
            <span class="zr__label">Zeitraum</span>
            <strong>
              {datumKurz(z.zeitraum.vonMs)} – {datumKurz(z.zeitraum.bisMs)}
            </strong>
            <span class="mute">
              {z.zeitraum.tage} Tage{z.ganzesJahr ? ' · ganzes Jahr' : ''}
              {!z.inStreuung && !z.ganzesJahr ? ' · nur im Mittel' : ''}
            </span>
            <FeldHinweise pfad={`${z.pfad}.zeitraum`} />
          </div>
          <div class="zr__zelle">
            <span class="zr__label">Menge</span>
            <WertAnzeige wert={z.menge} text={zahl(z.menge.wert, einheit)} testid={`${t}-ergebnis-${i + 1}-menge`} immerChip={z.menge.herkunft === 'berechnet'} />
          </div>
          <div class="zr__zelle zr__hgt">
            <ZahlFeld pfad={`${z.pfad}.hgtIstKd`} label="Heizgradtage" einheit="Kd" min={0} max={9000} ganz standard={z.hgtTabelle} testid={`${t}-ergebnis-${i + 1}-hgt`} />
            {!z.hgtIst && (
              <span class="feld__hinweis feld__hinweis--warnung" data-testid={`${t}-ergebnis-${i + 1}-hgt-fehlt`}>
                keine Heizgradtage — Standort in Schritt 1
              </span>
            )}
          </div>
          <div class="zr__zelle">
            <span class="zr__label">Jahresanteil</span>
            <WertAnzeige wert={z.anteil} text={z.anteil.wert.toFixed(2)} testid={`${t}-ergebnis-${i + 1}-anteil`} immerChip />
            {klima && z.klimaFaktor !== null && <span class="mute">Klimafaktor {z.klimaFaktor.toFixed(2)}</span>}
          </div>
          <div class="zr__zelle">
            <span class="zr__label">pro Jahr</span>
            <strong data-testid={`${t}-ergebnis-${i + 1}-jahr`}>{zahl(z.hochgerechnet.wert, `${einheit}/a`)}</strong>
          </div>
          {z.sanierung.bezug.length > 0 && (
            <div class="zr__zelle zr__sanierung">
              <span class="zr__label">Sanierungen</span>
              <SanierungText z={z} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Reihe                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

function Reihe({ reihe, nr }: { reihe: VerbrauchsReiheState; nr: number }) {
  const e = store.ergebnis.value;
  const fws = e.heizlast.fws;
  const p = `verbrauch.reihen.${reihe.id}`;
  const t = `reihe-${nr}`;
  const info = traegerInfo(reihe.energietraeger);
  const einheit = einheitAnzeige(info?.einheit);
  const traeger = fws?.traeger.find((x) => x.energietraeger === reihe.energietraeger);
  const re = e.heizlast.verbrauchsreihen.find((x) => x.energietraeger === reihe.energietraeger);
  const presets = etaPresetsFuer(reihe.energietraeger, daten.fws);
  return (
    <div class="unterblock reihe" data-testid={t}>
      <div class="liste__kopf">
        <span class="liste__nr">{nr}</span>
        <strong>{info?.label ?? reihe.energietraeger}</strong>
        <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => setze(p, undefined)} data-testid={`${t}-entfernen`}>
          Entfernen
        </button>
      </div>
      <Raster>
        <AuswahlFeld
          pfad={`${p}.energietraeger`}
          label="Energieträger"
          optionen={ENERGIETRAEGER.map((x) => ({ wert: x, label: traegerInfo(x)?.label ?? x }))}
          testid={`${t}-traeger`}
          beiWahl={(w) => {
            if (!w) return;
            // Energieträger wechseln; eine noch leere Reihe bekommt die passende Erfassungsart.
            store.aktion((s) => ({ ...s, verbrauch: { ...s.verbrauch, reihen: s.verbrauch.reihen.map((r) => (r.id === reihe.id ? { ...r, energietraeger: w, ...(reiheLeer(r) ? { art: standardArt(w) } : {}) } : r)) } }));
          }}
        />
        <AuswahlFeld pfad={`${p}.art`} label="Erfassung" optionen={ERFASSUNGSARTEN.map((a) => ({ wert: a.key, label: a.label }))} testid={`${t}-art`} beiWahl={(w) => w && setze(`${p}.art`, w)} info={<>{ERFASSUNGSARTEN.map((a) => <span key={a.key}><strong>{a.label}:</strong> {a.text}<br /></span>)}</>} />
      </Raster>
      {reihe.art === 'zeitraeume' && <Zeitraeume reihe={reihe} p={p} einheit={einheit} t={t} />}
      {reihe.art === 'lieferungen' && <Lieferungen reihe={reihe} p={p} einheit={einheit} t={t} />}
      {reihe.art === 'zaehlerstaende' && <Zaehlerstaende reihe={reihe} p={p} einheit={einheit} t={t} />}
      <FeldHinweise pfad={p} />
      <FeldHinweise pfad={`${p}.ablesungen`} />
      <FeldHinweise pfad={`${p}.zaehlerstaende`} />
      {re && re.zeitraeume.length > 0 && (
        <details class="genauer" open>
          <summary>
            Abgeleitete Zeiträume ({re.zeitraeume.length}){traeger ? ` — Mittel ${zahl(traeger.jahresmenge.wert, `${einheit}/a`)}` : ''}
          </summary>
          {traeger ? <ZeitraumTabelle zeitraeume={traeger.zeitraeume} einheit={einheit} t={t} /> : <p class="zeile-info">Zeiträume erkannt, aber noch nicht auswertbar — Meldungen oben beachten.</p>}
        </details>
      )}
      <Raster>
        {presets.length > 0 && <AuswahlFeld pfad={`verbrauch.eta.${reihe.energietraeger}.preset`} label="Wärmeerzeuger bisher" optionen={presets.map((x) => ({ wert: x.key, label: x.label }))} leerText="— nicht gewählt —" testid={`eta-${reihe.energietraeger}-preset`} />}
        <ZahlFeld pfad={`verbrauch.eta.${reihe.energietraeger}.wert`} label="Jahresnutzungsgrad η" min={0.3} max={1.1} dez={3} standard={traeger?.eta} testid={`eta-${reihe.energietraeger}`} />
      </Raster>
      {traeger && (
        <table class="tabelle tabelle--kompakt">
          <tbody>
            <tr><td>Mittlere Jahresmenge</td><td class="zahl"><WertAnzeige wert={traeger.jahresmenge} text={zahl(traeger.jahresmenge.wert, `${einheit}/a`)} testid={`traeger-${reihe.energietraeger}-menge`} immerChip /></td></tr>
            <tr><td>Heizwert</td><td class="zahl"><WertAnzeige wert={traeger.heizwert} text={zahl(traeger.heizwert.wert, `kWh/${einheit}`, 2)} /></td></tr>
            <tr><td>Nutzwärme</td><td class="zahl"><WertAnzeige wert={traeger.qnBrutto} text={zahl(traeger.qnBrutto.wert, 'kWh/a')} testid={`traeger-${reihe.energietraeger}-qn`} /></td></tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

function Rechnungen() {
  const s = store.state.value;
  const e = store.ergebnis.value;
  const fws = e.heizlast.fws;
  const v = s.verbrauch;
  const naechste = (): Record<string, unknown> => {
    const benutzt = new Set(v.reihen.map((r) => r.energietraeger));
    const frei = ENERGIETRAEGER.find((x) => !benutzt.has(x)) ?? 'heizoel';
    return { energietraeger: frei, art: standardArt(frei) };
  };
  const station = e.klima?.station;
  return (
    <>
      <Abschnitt
        titel="Verbrauch je Energieträger"
        text={
          station
            ? `Je Energieträger eine Reihe: Zeiträume/Kalenderjahre, Lieferungen mit Tankständen oder Zählerstände. Heizgradtage kommen automatisch von der Station ${station.name}; Teilzeiträume werden damit aufs Jahr hochgerechnet.`
            : 'Je Energieträger eine Reihe: Zeiträume/Kalenderjahre, Lieferungen mit Tankständen oder Zählerstände. Ohne Standort (Schritt 1) fehlen die Heizgradtage — Teilzeiträume werden dann nur nach Tagen hochgerechnet.'
        }
        aktion={
          <button type="button" class="btn" onClick={() => store.hinzufuegen('verbrauch.reihen', naechste(), 'r')} data-testid="reihe-neu">
            Energieträger hinzufügen
          </button>
        }
      >
        {v.reihen.length === 0 ? (
          <p class="leerzustand">Noch keine Verbrauchsangaben. Mit «Energieträger hinzufügen» die erste Reihe anlegen.</p>
        ) : (
          v.reihen.map((r, i) => <Reihe reihe={r} nr={i + 1} key={r.id} />)
        )}
        {fws && fws.streuung.prozent !== null && (
          <Ampel
            ampel={fws.streuung.ampel}
            text={`Grösste Abweichung eines hochgerechneten Jahres vom Mittel: ${fmt(fws.streuung.prozent, 0)} %`}
            legende={[
              { ampel: 'gruen', text: `unter ${STREUUNG.gelbAbProzent} % — Jahre passen zusammen` },
              { ampel: 'gelb', text: `${STREUUNG.gelbAbProzent}–${STREUUNG.rotAbProzent} % — Ursache prüfen (Leerstand, Wetter, Sanierung)` },
              { ampel: 'rot', text: `ab ${STREUUNG.rotAbProzent} % — Werte prüfen` },
              { ampel: 'grau', text: 'nur ein vergleichbarer Zeitraum — nicht beurteilbar' },
            ]}
            testid="streuung"
          />
        )}
        <Meldungen schritt="verbrauch" codes={['verbrauch.', 'klima.']} ohne={['verbrauch.hgt.', 'verbrauch.zeitraum.kurzerEintrag']} testid="verbrauch-meldungen" />
      </Abschnitt>

      {v.reihen.length > 0 && (
        <Abschnitt titel="Heizwert-Konvention" text="Der Jahresnutzungsgrad η des bisherigen Wärmeerzeugers (je Reihe oben) rechnet den Energieinhalt in Nutzwärme um.">
          <SegmentFeld pfad="verbrauch.konvention" label="Heizwert-Konvention" optionen={[{ wert: 'fwsKurs', label: 'FWS-Kurs (Ho, Kurs-η)' }, { wert: 'hi', label: 'unterer Heizwert Hi (BFE)' }]} testid="konvention" info="FWS-Kurs reproduziert die Kurslösungen (Öl 10.5 kWh/l, Gas 10.4 kWh/m³ mit Kurs-Nutzungsgraden). Hi ist die BFE-Konvention; dann muss η auf Hi bezogen sein." />
        </Abschnitt>
      )}

      <Abschnitt titel="Warmwasser im bisherigen Verbrauch">
        <JaNeinFeld pfad="verbrauch.wwBisher" label="Enthielt der bisherige Verbrauch auch das Warmwasser?" testid="ww-bisher" info="Wenn ja, wird der Warmwasseranteil vom Verbrauch abgezogen. Ob die neue Wärmepumpe Warmwasser bereitet, wird separat in Schritt 5 gefragt." />
        {rel('verbrauch.abzug') && <WwAngaben basis="verbrauch.abzug" ergebnis={store.ergebnis.value.warmwasser.bisher} testid="abzug" />}
        {fws?.wwAbzug && (
          <div class="ergebniszeile">
            <span>Abzug vom Verbrauch</span>
            <WertAnzeige wert={fws.wwAbzug} text={zahl(fws.wwAbzug.wert, 'kWh/a')} testid="ww-abzug" />
          </div>
        )}
      </Abschnitt>

      <Abschnitt titel="Klimabereinigung">
        <label class="kaestchen__eintrag">
          <input type="checkbox" checked={v.klimabereinigung} onChange={(ev) => setze('verbrauch.klimabereinigung', (ev.currentTarget as HTMLInputElement).checked)} data-testid="klimabereinigung" />
          Alle Zeiträume mit Heizgradtagen auf das Normjahr der Station umrechnen (nicht Teil des FWS-Kurses)
        </label>
        <p class="zeile-info">
          {v.klimabereinigung
            ? `Ein: jeder Zeitraum wird mit HGT des Zeitraums / HGT Normjahr${station ? ` (${station.name}: ${fmt(station.hgt2012Kd, 0)} Kd, SIA 2028)` : ''} umgerechnet — auch ganze Jahre.`
            : 'Aus: ganze Kalenderjahre zählen wie im FWS-Kurs; nur Teilzeiträume werden über die Heizgradtage aufs Jahr hochgerechnet.'}
        </p>
      </Abschnitt>
    </>
  );
}

function Volllaststunden() {
  const fws = store.ergebnis.value.heizlast.fws;
  const bedarf = Object.entries(daten.fws.tvoll.bedarfsarten).map(([k, b]) => ({ wert: k, label: b.label }));
  return (
    <Abschnitt titel="Volllaststunden" text="Teilen die Jahres-Nutzwärme durch die Stunden, in denen die Heizung rechnerisch mit voller Leistung läuft (FWS Folie 16).">
      <Raster>
        <AuswahlFeld pfad="verbrauch.bedarfsart" label="Nutzung" optionen={bedarf} testid="bedarfsart" beiWahl={(w) => w && setze('verbrauch.bedarfsart', w)} />
        <ZahlFeld pfad="verbrauch.tvollOverride" label={<>Volllaststunden t<sub>voll</sub></>} einheit="h/a" min={500} max={5000} ganz standard={fws?.tvoll} testid="tvoll" />
      </Raster>
    </Abschnitt>
  );
}

/** Schritt 3A — Verbrauch (nur FWS). */
export function Verbrauch() {
  const v = store.state.value.verbrauch;
  const e = store.ergebnis.value;
  const fws = e.heizlast.fws;
  return (
    <>
      <Fehlend schritt="verbrauch" />
      <Abschnitt titel="Liegen Verbrauchsdaten vor?">
        <OptionKarten pfad="verbrauch.quelle" label="Datenquelle" optionen={QUELLEN} testid="quelle" />
      </Abschnitt>

      {v.quelle === 'rechnungen' && <Rechnungen />}

      {rel('verbrauch.wpBetriebsstunden') && (
        <Abschnitt titel="Bestehende Wärmepumpe" text="Betriebsstunden pro Jahr mal Nennleistung ergeben die Nutzwärme (FWS Aufgabe 4); alternativ Strom × COP.">
          <Raster>
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.zaehlerH" label="Betriebsstunden Zählerstand" einheit="h" min={0} testid="wp-zaehler" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.betriebsjahre" label="Betriebsjahre" einheit="a" min={0.5} max={50} testid="wp-jahre" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.qWpW" label="Heizleistung der WP (Normpunkt)" einheit="kW" faktor={1000} min={0.5} max={500} testid="wp-leistung" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.stromKwhA" label="oder: Stromverbrauch WP" einheit="kWh/a" min={0} testid="wp-strom" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.cop" label="mit COP bzw. JAZ" min={1} max={8} dez={2} testid="wp-cop" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.erdsondeLaengeM" label="Erdsondenlänge (optional)" einheit="m" min={0} testid="wp-sonde" />
          </Raster>
          <Meldungen schritt="verbrauch" codes={['wp', 'methodeB']} />
        </Abschnitt>
      )}

      {rel('verbrauch.messung') && (
        <Abschnitt titel="Wärmezähler">
          <Raster spalten={3}>
            <ZahlFeld pfad="verbrauch.messung.qnHeizungKwhA" label="Heizwärme pro Jahr" einheit="kWh/a" min={0} testid="messung-qn" />
            <DatumFeld pfad="verbrauch.messung.von" label="Messung von" testid="messung-von" />
            <DatumFeld pfad="verbrauch.messung.bis" label="bis" testid="messung-bis" />
          </Raster>
        </Abschnitt>
      )}

      {v.quelle === 'keine' && (
        <Abschnitt titel="Schätzung nach Bauperiode" text="Ohne Verbrauch schätzt der FWS-Kurs die Heizlast aus dem typischen Energiebedarf der Bauperiode. Das ist nur ein Richtwert.">
          {fws?.bauperiodeBand ? (
            <div class="ergebniszeile">
              <span>
                {fws.bauperiodeBand.label}: {fmt(fws.bauperiodeBand.kwhM2a[0], 0)}–{fmt(fws.bauperiodeBand.kwhM2a[1], 0)} kWh/m²a
              </span>
              <WertAnzeige wert={fws.qhl} text={kW(fws.qhl?.wert)} testid="bauperiode-qhl" />
            </div>
          ) : (
            <p class="leerzustand">Für die Schätzung braucht es in Schritt 1 Gebäudetyp, Baujahr und EBF.</p>
          )}
        </Abschnitt>
      )}

      {rel('verbrauch.tvollOverride') && <Volllaststunden />}
      {lese('verbrauch.quelle') === null && <p class="leerzustand">Datenquelle wählen — die passenden Eingaben erscheinen darunter.</p>}
    </>
  );
}
