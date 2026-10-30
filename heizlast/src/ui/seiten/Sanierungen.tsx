import type { SanierungState } from '../../state/schema';
import { daten, lese, rel, setze, store } from '../bindung';
import { AuswahlFeld, Abschnitt, MonatFeld, Raster, SegmentFeld, TextFeld, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Meldungen } from '../komponenten/Meldungen';
import { zahl } from '../format';
import { fmt } from '../../kern/wert';

const MASSNAHMEN = daten.fws.sanierungen.massnahmen.map((m) => ({ wert: m.key as SanierungState['massnahme'], label: m.label }));

function SanierungZeile({ san, nr }: { san: SanierungState; nr: number }) {
  const e = store.ergebnis.value;
  const p = `sanierungen.${san.id}`;
  const fwsSan = e.heizlast.fws ? [...e.heizlast.fws.sanierungen.ausgefuehrt, ...e.heizlast.fws.sanierungen.geplant].find((x) => x.sanierung.id === san.id) : undefined;
  const typen = store.state.value.huelle.bauteiltypen;
  const gewaehlt = san.bauteiltypIds ?? [];
  return (
    <div class="liste__eintrag" data-testid={`sanierung-${nr}`}>
      <div class="liste__kopf">
        <span class="liste__nr">{nr}</span>
        <strong>{MASSNAHMEN.find((m) => m.wert === san.massnahme)?.label ?? san.massnahme}</strong>
        <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => setze(p, undefined)} data-testid={`sanierung-${nr}-entfernen`}>
          Entfernen
        </button>
      </div>
      <Raster spalten={3}>
        <AuswahlFeld pfad={`${p}.massnahme`} label="Massnahme" optionen={MASSNAHMEN} testid={`sanierung-${nr}-massnahme`} beiWahl={(w) => w && setze(`${p}.massnahme`, w)} />
        <SegmentFeld pfad={`${p}.status`} label="Stand" optionen={[{ wert: 'ausgefuehrt', label: 'ausgeführt' }, { wert: 'geplant', label: 'geplant' }]} testid={`sanierung-${nr}-status`} />
        <MonatFeld pfad={`${p}.datum`} label={san.status === 'geplant' ? 'Geplant für (Monat/Jahr)' : 'Ausgeführt im (Monat/Jahr)'} vonJahr={1950} nurJahrErlaubt testid={`sanierung-${nr}-datum`} info="Monat und Jahr genügen. Bei der Verbrauchsmethode teilt das Datum die Verbrauchszeiträume in «vor» und «nach» der Massnahme (FWS-Rechenweg mit Teilperioden); raumweise bestimmt es die Dämm-Standards der Sanierungsepoche." />
      </Raster>
      {san.massnahme === 'individuell' && <TextFeld pfad={`${p}.bezeichnung`} label="Bezeichnung" testid={`sanierung-${nr}-bezeichnung`} />}
      {rel(`${p}.einsparungProzent`) && (
        <ZahlFeld
          pfad={`${p}.einsparungProzent`}
          label="Einsparung am Heizwärmebedarf"
          einheit="%"
          min={0}
          max={90}
          standard={fwsSan?.einsparung}
          testid={`sanierung-${nr}-einsparung`}
          info="Kurswert der Massnahme (FWS Folie 36); eigene Angabe überschreibt. Wirkt auf die Verbrauchsjahre nach dem Datum."
        />
      )}
      {rel(`${p}.bauteiltypIds`) && typen.length > 0 && (
        <fieldset class="feld feld--frage">
          <legend class="feld__label">Betroffene Bauteiltypen (ohne Auswahl: alle der passenden Art)</legend>
          <div class="kaestchen">
            {typen.map((t) => (
              <label class="kaestchen__eintrag" key={t.id}>
                <input
                  type="checkbox"
                  checked={gewaehlt.includes(t.id)}
                  onChange={(ev) => {
                    const an = (ev.currentTarget as HTMLInputElement).checked;
                    const neu = an ? [...gewaehlt, t.id] : gewaehlt.filter((x) => x !== t.id);
                    setze(`${p}.bauteiltypIds`, neu.length ? neu : undefined);
                  }}
                />
                {t.bezeichnung ?? e.heizlast.huelle?.bauteile[t.id]?.bezeichnung ?? t.art}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {rel(`${p}.uOverride`) && <ZahlFeld pfad={`${p}.uOverride`} label="U-Wert nach Sanierung (falls bekannt)" einheit="W/m²K" min={0.05} max={6} dez={2} testid={`sanierung-${nr}-u`} />}
      {san.status === 'ausgefuehrt' && e.heizlast.fws && e.heizlast.fws.traeger.length > 0 && <WirkungAufZeitraeume sanId={san.id} nr={nr} />}
    </div>
  );
}

const datumKurz = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
};

/** Welche Verbrauchszeiträume eine ausgeführte Massnahme betrifft (aus dem Ergebnis, Session 7b). */
function WirkungAufZeitraeume({ sanId, nr }: { sanId: string; nr: number }) {
  const fws = store.ergebnis.value.heizlast.fws;
  if (!fws) return null;
  const zeilen = fws.traeger.flatMap((t) =>
    t.zeitraeume.flatMap((z) => {
      const b = z.sanierung.bezug.find((x) => x.id === sanId);
      if (!b) return [];
      return [{ key: `${t.energietraeger}-${z.id}`, text: `${datumKurz(z.zeitraum.vonMs)} – ${datumKurz(z.zeitraum.bisMs)}`, lage: b.lage, faktor: z.sanierung.faktorIst / z.sanierung.faktorUnsaniert, sub: z.sanierung.subperioden }];
    }),
  );
  if (!zeilen.length) return <p class="zeile-info" data-testid={`sanierung-${nr}-wirkung`}>Ohne Datum keine Zuordnung zu den Verbrauchszeiträumen (gilt als vor dem Betrachtungszeitraum).</p>;
  return (
    <div class="wirkung" data-testid={`sanierung-${nr}-wirkung`}>
      <span class="feld__label">Wirkung auf die Verbrauchszeiträume</span>
      <ul class="wirkung__liste">
        {zeilen.map((z) => (
          <li class={`wirkung__zeile wirkung__zeile--${z.lage}`} key={z.key} data-lage={z.lage}>
            <span>{z.text}</span>
            <span class="mute">
              {z.lage === 'nachher' && 'nach der Massnahme — bereits enthalten'}
              {z.lage === 'vorher' && `vor der Massnahme — wird mit Faktor ${z.faktor.toFixed(3)} auf heute umgerechnet`}
              {z.lage === 'innerhalb' && `Massnahme mitten im Zeitraum — Teilperioden ${z.sub.map((sp) => `${sp.tage} d × ${sp.faktor.toFixed(2)}`).join(' + ')}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Schritt 2 — Sanierungen: eine Liste für beide Modi. */
export function Sanierungen() {
  const s = store.state.value;
  const e = store.ergebnis.value;
  const fws = e.heizlast.fws;
  const huelle = e.heizlast.huelle;
  const wirkt = huelle ? Object.values(huelle.bauteile).filter((b) => b.sanierungWirkt) : [];
  return (
    <>
      <Abschnitt
        titel="Massnahmen"
        text={s.methode === 'raumweise' ? 'Jede Massnahme setzt die passenden Bauteiltypen auf «saniert ab Jahr X» — ohne weitere Angaben mit der Dämmung, die in jenem Jahr üblich war.' : 'Jede Massnahme wird den Verbrauchsjahren nach ihrem Datum zugeordnet (FWS-Rechenweg mit Teilperioden); geplante Massnahmen mindern die künftige Heizlast.'}
        aktion={
          <button type="button" class="btn" onClick={() => store.hinzufuegen('sanierungen', { massnahme: 'fenster', status: 'ausgefuehrt' }, 's')} data-testid="sanierung-neu">
            Massnahme hinzufügen
          </button>
        }
      >
        {s.sanierungen.length === 0 ? (
          <p class="leerzustand">Keine Sanierungen erfasst. Das Gebäude gilt als im Originalzustand.</p>
        ) : (
          <div class="liste">
            {s.sanierungen.map((x, i) => (
              <SanierungZeile san={x} nr={i + 1} key={x.id} />
            ))}
          </div>
        )}
        <Meldungen schritt="sanierungen" testid="sanierung-meldungen" />
      </Abschnitt>

      {fws && s.sanierungen.length > 0 && (
        <Abschnitt titel="Wirkung auf die Heizlast">
          <div class="ergebniszeile">
            <span>Faktor ausgeführte Massnahmen</span>
            <WertAnzeige wert={fws.sanierungen.faktorIst} text={fmt(fws.sanierungen.faktorIst.wert, 3)} testid="sanierung-faktor-ist" immerChip />
          </div>
          <div class="ergebniszeile">
            <span>Faktor geplante Massnahmen</span>
            <WertAnzeige wert={fws.sanierungen.faktorGeplant} text={fmt(fws.sanierungen.faktorGeplant.wert, 3)} testid="sanierung-faktor-geplant" immerChip />
          </div>
        </Abschnitt>
      )}
      {wirkt.length > 0 && (
        <Abschnitt titel="Wirkung auf die Bauteile">
          <table class="tabelle">
            <thead>
              <tr>
                <th>Bauteiltyp</th>
                <th class="zahl">U vorher</th>
                <th class="zahl">U nachher</th>
              </tr>
            </thead>
            <tbody>
              {wirkt.map((b) => (
                <tr key={b.typId}>
                  <td>{b.bezeichnung}</td>
                  <td class="zahl">{zahl(b.uUnsaniert?.wert, 'W/m²K', 2)}</td>
                  <td class="zahl">
                    <WertAnzeige wert={b.u} text={zahl(b.u.wert, 'W/m²K', 2)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Abschnitt>
      )}
      {lese('methode') === null && <p class="leerzustand">Methode in Schritt 0 wählen, damit die Wirkung berechnet wird.</p>}
    </>
  );
}
