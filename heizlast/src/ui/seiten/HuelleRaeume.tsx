import { useState } from 'preact/hooks';
import type { BauteilArt } from '../../kern/huelle';
import { bauteilArtLabel } from '../../kern/huelle';
import type { Anschluss, RaumBauteilEingabe, RaumEingabe, RaumErgebnis } from '../../kern/raumweise';
import type { HuelleBauteiltyp } from '../../state/schema';
import { daten, rel, setze, store } from '../bindung';
import { Abschnitt, AuswahlFeld, FeldHinweise, JaNeinFeld, Raster, SegmentFeld, TextFeld, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { StufenPicker } from '../komponenten/StufenPicker';
import { zahl } from '../format';

const ARTEN: ReadonlyArray<BauteilArt> = ['aussenwand', 'dachSteil', 'dachFlach', 'deckeEstrich', 'bodenKeller', 'bodenErdreich', 'fenster', 'tuer', 'innenwand', 'innendecke', 'innentuer'];
const RAUMTYPEN = daten.sia.innentemperaturen.raumtypen.map((r) => ({ wert: r.key, label: `${r.label} (${r.thetaIntC} °C)` }));
const KONZEPTE = daten.sia.nMin.lueftungskonzepte.map((k) => ({ wert: k.key, label: k.label }));
const KONZEPT_STD = daten.sia.nMin.lueftungskonzepte.find((k) => k.default);
const WB = daten.sia.deltaUWb.werte.map((w) => ({ wert: w.key, label: `${w.label} (ΔU ${w.deltaU})` }));

const typLabel = (t: HuelleBauteiltyp) => t.bezeichnung ?? bauteilArtLabel(t.art, daten.huelle);

/* ---------------------------------------------------------------------------------------------- */
/* Bauteiltypen                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

function Bauteiltyp({ typ, baujahr }: { typ: HuelleBauteiltyp; baujahr: number }) {
  const e = store.ergebnis.value;
  const b = e.heizlast.huelle?.bauteile[typ.id];
  const p = `huelle.bauteiltypen.${typ.id}`;
  return (
    <div class="typ" data-testid={`typ-${typ.id}`}>
      <div class="typ__kopf">
        <strong class="typ__name">{typLabel(typ)}</strong>
        <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => setze(p, undefined)} data-testid={`typ-${typ.id}-entfernen`}>
          Entfernen
        </button>
      </div>
      <StufenPicker pfad={p} art={typ.art} baujahr={baujahr} stufen={typ.stufen} ergebnis={b} testid={`typ-${typ.id}-picker`} />
      <details class="genauer">
        <summary>Bezeichnung oder U-Wert aus Nachweis</summary>
        <Raster>
          <TextFeld pfad={`${p}.bezeichnung`} label="Bezeichnung" platzhalter={bauteilArtLabel(typ.art, daten.huelle)} testid={`typ-${typ.id}-bezeichnung`} />
          <ZahlFeld pfad={`${p}.uOverride`} label="U-Wert (überschreibt den Aufbau)" einheit="W/m²K" min={0.05} max={6} dez={2} testid={`typ-${typ.id}-u`} />
        </Raster>
      </details>
    </div>
  );
}

function Bauteiltypen() {
  const s = store.state.value;
  const [neueArt, setNeueArt] = useState<BauteilArt>('aussenwand');
  const baujahr = s.gebaeude.baujahr;
  if (baujahr === undefined) return <p class="leerzustand">Baujahr in Schritt 1 erfassen — daraus werden die typischen Bauteilaufbauten geschätzt.</p>;
  return (
    <>
      {s.huelle.bauteiltypen.length === 0 ? (
        <div class="leerzustand">
          <p>Noch keine Bauteiltypen. Vorschlag aus Baujahr, Keller und Dachform anlegen und danach anpassen.</p>
          <button type="button" class="btn btn--primary" onClick={() => store.standardBauteiltypenAnlegen()} data-testid="typen-anlegen">
            Bauteiltypen vorschlagen
          </button>
        </div>
      ) : (
        <div class="typen">{s.huelle.bauteiltypen.map((t) => <Bauteiltyp typ={t} baujahr={baujahr} key={t.id} />)}</div>
      )}
      <div class="hinzufuegen">
        <label class="visually-hidden" for="neue-art">
          Bauteilart
        </label>
        <select id="neue-art" class="eingabe__feld eingabe__feld--klein" value={neueArt} onChange={(e) => setNeueArt((e.currentTarget as HTMLSelectElement).value as BauteilArt)} data-testid="typ-neu-art">
          {ARTEN.map((a) => (
            <option value={a} key={a}>
              {bauteilArtLabel(a, daten.huelle)}
            </option>
          ))}
        </select>
        <button type="button" class="btn" onClick={() => store.hinzufuegen('huelle.bauteiltypen', { art: neueArt }, 't')} data-testid="typ-neu">
          Typ hinzufügen
        </button>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Räume                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

const ANSCHLUSS: ReadonlyArray<{ key: string; label: string; wert: Anschluss }> = [
  { key: 'aussen', label: 'gegen aussen', wert: { art: 'aussen' } },
  { key: 'u:keller', label: 'gegen unbeheizten Keller', wert: { art: 'unbeheizt', situation: 'keller' } },
  { key: 'u:dachraum', label: 'gegen unbeheizten Dachraum', wert: { art: 'unbeheizt', situation: 'dachraum' } },
  { key: 'u:garage', label: 'gegen unbeheizte Garage', wert: { art: 'unbeheizt', situation: 'garage' } },
  { key: 'u:treppenhaus', label: 'gegen unbeheiztes Treppenhaus', wert: { art: 'unbeheizt', situation: 'treppenhaus' } },
  { key: 'u:nebenraum', label: 'gegen unbeheizten Nebenraum', wert: { art: 'unbeheizt', situation: 'nebenraum' } },
  { key: 'erdreich', label: 'gegen Erdreich', wert: { art: 'erdreich' } },
  { key: 'beheizt', label: 'gegen beheizten Nachbarraum', wert: { art: 'beheizt' } },
];
function anschlussKey(a: Anschluss): string {
  if (a.art === 'unbeheizt') return `u:${a.situation ?? 'keller'}`;
  if (a.art === 'faktor') return 'aussen';
  return a.art;
}

function BauteilZeile({ raum, raumNr, bauteil, nr, erg }: { raum: RaumEingabe; raumNr: number; bauteil: RaumBauteilEingabe & { id: string }; nr: number; erg: RaumErgebnis | undefined }) {
  const typen = store.state.value.huelle.bauteiltypen;
  const p = `raeume.${raum.id}.bauteile.${bauteil.id}`;
  const be = erg?.bauteile.find((x) => x.id === bauteil.id);
  const t = `raum-${raumNr}-bauteil-${nr}`;
  return (
    <div class="bauteil" data-testid={t}>
      <AuswahlFeld
        pfad={`${p}.typId`}
        label="Bauteil"
        optionen={typen.map((x) => ({ wert: x.id, label: typLabel(x) }))}
        leerText={bauteil.art ? `${bauteilArtLabel(bauteil.art, daten.huelle)} (ohne Typ)` : '— Typ wählen —'}
        testid={`${t}-typ`}
      />
      <ZahlFeld pfad={`${p}.flaecheM2`} label="Fläche" einheit="m²" min={0} max={10000} dez={2} testid={`${t}-flaeche`} />
      <div class="bauteil__anschluss">
        <div class="feld">
          <div class="feld__kopf">
            <label class="feld__label" for={`${t}-anschluss`}>
              Grenzt an
            </label>
          </div>
          <div class="eingabe eingabe--auswahl">
            <select id={`${t}-anschluss`} class="eingabe__feld" value={anschlussKey(bauteil.anschluss)} data-testid={`${t}-anschluss`} onChange={(e) => setze(`${p}.anschluss`, ANSCHLUSS.find((a) => a.key === (e.currentTarget as HTMLSelectElement).value)?.wert ?? { art: 'aussen' })}>
              {ANSCHLUSS.map((a) => (
                <option value={a.key} key={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {bauteil.anschluss.art === 'beheizt' && <ZahlFeld pfad={`${p}.anschluss.thetaNachbarC`} label="Nachbarraum" einheit="°C" min={-10} max={30} dez={1} testid={`${t}-nachbar`} />}
      </div>
      <ZahlFeld pfad={`${p}.uOverride`} label="U-Wert" einheit="W/m²K" min={0.05} max={6} dez={2} standard={be && be.u.herkunft !== 'override' ? be.u : bauteil.typId ? store.ergebnis.value.heizlast.huelle?.bauteile[bauteil.typId]?.u : undefined} zuruecksetzenText="Wert aus Hülle verwenden" testid={`${t}-u`} hinweisPfad={`${p}.typId`} />
      <div class="bauteil__ergebnis">
        <span class="mute">Φ<sub>T</sub></span>
        <span data-testid={`${t}-phit`}>{zahl(be?.phiT.wert, 'W')}</span>
        <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => setze(p, undefined)} aria-label={`Bauteil ${nr} entfernen`} data-testid={`${t}-entfernen`}>
          Entfernen
        </button>
      </div>
    </div>
  );
}

/** Lage-Fragen für einen Raum ohne Bauteile: legt Bauteile als Referenz auf die Hüllentypen an. */
function LageFragen({ raum, nr, flaecheM2 }: { raum: RaumEingabe; nr: number; flaecheM2: number | undefined }) {
  const typen = store.state.value.huelle.bauteiltypen;
  const [aussen, setAussen] = useState(true);
  const [unten, setUnten] = useState<'keller' | 'erdreich' | 'beheizt'>(store.state.value.gebaeude.keller === 'unbeheizt' ? 'keller' : 'beheizt');
  const [oben, setOben] = useState<'dach' | 'estrich' | 'beheizt'>('beheizt');
  const typVon = (...arten: BauteilArt[]) => typen.find((t) => arten.includes(t.art))?.id;
  const t = `raum-${nr}-lage`;
  const anlegen = () => {
    const flaeche = flaecheM2 ?? 0;
    const neu: Omit<RaumBauteilEingabe, 'id'>[] = [];
    const mit = (typId: string | undefined, art: BauteilArt, flaecheM2: number, anschluss: Anschluss) => neu.push(typId ? { typId, flaecheM2, anschluss } : { art, flaecheM2, anschluss });
    if (aussen) {
      mit(typVon('aussenwand'), 'aussenwand', 0, { art: 'aussen' });
      mit(typVon('fenster'), 'fenster', 0, { art: 'aussen' });
    }
    if (unten === 'keller') mit(typVon('bodenKeller'), 'bodenKeller', flaeche, { art: 'unbeheizt', situation: 'keller' });
    if (unten === 'erdreich') mit(typVon('bodenErdreich'), 'bodenErdreich', flaeche, { art: 'erdreich' });
    if (oben === 'dach') mit(typVon('dachSteil', 'dachFlach'), 'dachSteil', flaeche, { art: 'aussen' });
    if (oben === 'estrich') mit(typVon('deckeEstrich'), 'deckeEstrich', flaeche, { art: 'unbeheizt', situation: 'dachraum' });
    for (const b of neu) store.hinzufuegen(`raeume.${raum.id}.bauteile`, b as unknown as Record<string, unknown>, 'b');
  };
  const seg = <T extends string>(label: string, wert: T, setzen: (v: T) => void, opt: ReadonlyArray<[T, string]>, id: string) => (
    <div class="feld feld--frage">
      <span class="feld__label">{label}</span>
      <div class="segment" role="radiogroup" aria-label={label}>
        {opt.map(([v, l]) => (
          <button type="button" role="radio" class="segment__knopf" aria-checked={wert === v} onClick={() => setzen(v)} key={v} data-testid={`${t}-${id}-${v}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div class="lage" data-testid={t}>
      <p class="lage__text">Wo liegt der Raum? Daraus entstehen die Bauteile; Flächen von Wand und Fenster danach eintragen.</p>
      {seg('Aussenwand mit Fenster', aussen ? 'ja' : 'nein', (v) => setAussen(v === 'ja'), [['ja', 'ja'], ['nein', 'nein']], 'aussen')}
      {seg('Darunter', unten, setUnten, [['keller', 'unbeheizter Keller'], ['erdreich', 'Erdreich'], ['beheizt', 'beheizter Raum']], 'unten')}
      {seg('Darüber', oben, setOben, [['dach', 'Dach'], ['estrich', 'unbeheizter Estrich'], ['beheizt', 'beheizter Raum']], 'oben')}
      <button type="button" class="btn" onClick={anlegen} data-testid={`${t}-anlegen`}>
        Bauteile anlegen
      </button>
    </div>
  );
}

function Raum({ raum, nr }: { raum: RaumEingabe; nr: number }) {
  const e = store.ergebnis.value;
  const erg = e.heizlast.raumweise?.raeume.find((r) => r.id === raum.id);
  const p = `raeume.${raum.id}`;
  const [mitMassen, setMitMassen] = useState(raum.flaecheM2 === undefined && (raum.laengeM !== undefined || raum.breiteM !== undefined));
  const t = `raum-${nr}`;
  return (
    <article class="raum" data-testid={t} data-raum-id={raum.id}>
      <header class="raum__kopf">
        <span class="liste__nr">{nr}</span>
        <TextFeld pfad={`${p}.name`} label="Raum" testid={`${t}-name`} />
        <div class="raum__last">
          <span class="mute">Φ<sub>HL</sub></span>
          <WertAnzeige wert={erg?.phiHL} text={zahl(erg?.phiHL.wert, 'W')} testid={`${t}-phihl`} />
        </div>
      </header>
      <Raster spalten={3}>
        <AuswahlFeld pfad={`${p}.typ`} label="Raumtyp" optionen={RAUMTYPEN} testid={`${t}-typ`} beiWahl={(w) => w && setze(`${p}.typ`, w)} />
        <TextFeld pfad={`${p}.geschoss`} label="Geschoss" platzhalter="EG, OG, DG" testid={`${t}-geschoss`} />
        <ZahlFeld pfad={`${p}.thetaIntC`} label={<>Raumtemperatur θ<sub>int</sub></>} einheit="°C" min={5} max={30} dez={1} standard={erg?.thetaInt} testid={`${t}-thetaint`} />
      </Raster>
      <div class="raum__flaeche">
        {mitMassen ? (
          <Raster spalten={3}>
            <ZahlFeld pfad={`${p}.laengeM`} label="Länge" einheit="m" min={0.1} max={200} dez={2} testid={`${t}-laenge`} />
            <ZahlFeld pfad={`${p}.breiteM`} label="Breite" einheit="m" min={0.1} max={200} dez={2} testid={`${t}-breite`} />
            {rel(`${p}.hoeheM`) && <ZahlFeld pfad={`${p}.hoeheM`} label="Raumhöhe" einheit="m" min={1.5} max={12} dez={2} standard={erg?.hoehe} testid={`${t}-hoehe`} />}
          </Raster>
        ) : (
          <Raster spalten={3}>
            <ZahlFeld pfad={`${p}.flaecheM2`} label="Nettofläche" einheit="m²" min={0.1} max={5000} dez={2} testid={`${t}-flaeche`} hinweisPfad={`${p}.flaecheM2`} />
            {rel(`${p}.hoeheM`) && <ZahlFeld pfad={`${p}.hoeheM`} label="Raumhöhe" einheit="m" min={1.5} max={12} dez={2} standard={erg?.hoehe} testid={`${t}-hoehe`} />}
          </Raster>
        )}
        <button
          type="button"
          class="link-knopf"
          data-testid={`${t}-flaeche-umschalten`}
          onClick={() => {
            setMitMassen(!mitMassen);
            store.aktion((s) => ({
              ...s,
              raeume: s.raeume.map((r) => {
                if (r.id !== raum.id) return r;
                const { flaecheM2: _f, laengeM: _l, breiteM: _b, ...rest } = r;
                return rest;
              }) as RaumEingabe[],
            }));
          }}
        >
          {mitMassen ? 'Fläche direkt eingeben' : 'Länge × Breite eingeben'}
        </button>
      </div>

      {raum.bauteile.length === 0 ? (
        <LageFragen raum={raum} nr={nr} flaecheM2={erg?.flaeche.wert} />
      ) : (
        <div class="bauteile">
          {raum.bauteile.map((b, i) => (
            <BauteilZeile raum={raum} raumNr={nr} bauteil={b as RaumBauteilEingabe & { id: string }} nr={i + 1} erg={erg} key={b.id} />
          ))}
          <button type="button" class="btn btn--klein" onClick={() => store.hinzufuegen(`${p}.bauteile`, { flaecheM2: 0, anschluss: { art: 'aussen' }, ...(store.state.value.huelle.bauteiltypen[0] ? { typId: store.state.value.huelle.bauteiltypen[0].id } : { art: 'aussenwand' }) }, 'b')} data-testid={`${t}-bauteil-neu`}>
            Bauteil hinzufügen
          </button>
        </div>
      )}
      {erg && (
        <dl class="raum__summen">
          <div><dt>Transmission Φ<sub>T</sub></dt><dd data-testid={`${t}-phit`}>{zahl(erg.phiT.wert, 'W')}</dd></div>
          <div><dt>Lüftung Φ<sub>V</sub></dt><dd data-testid={`${t}-phiv`}>{zahl(erg.phiV.wert, 'W')}</dd></div>
          <div><dt>Luftwechsel n<sub>min</sub></dt><dd><WertAnzeige wert={erg.nMin} text={zahl(erg.nMin.wert, '1/h', 2)} /></dd></div>
        </dl>
      )}
      <FeldHinweise pfad={p} />
      <div class="raum__fuss">
        <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => store.raumEntfernen(raum.id)} data-testid={`${t}-entfernen`}>
          Raum entfernen
        </button>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Seite                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

/** Schritt 3B — Hülle & Räume (nur raumweise). */
export function HuelleRaeume() {
  const s = store.state.value;
  const e = store.ergebnis.value;
  const rw = e.heizlast.raumweise;
  const hoeheStandard = rw?.raeume.find((r) => r.hoehe.herkunft === 'fallback')?.hoehe;
  const rest = s.huelle.rest;
  return (
    <>
      <Fehlend schritt="huelle" />
      <Abschnitt titel="Bauteiltypen des Gebäudes" text="Jeder Typ wird einmal beschrieben; Räume verweisen nur darauf. Ohne Angaben gilt der typische Aufbau der Bauperiode.">
        <Bauteiltypen />
        <Meldungen schritt="huelle" codes={['huelle.']} testid="huelle-meldungen" />
      </Abschnitt>

      <Abschnitt titel="Lüftung und Wärmebrücken">
        <Raster>
          <AuswahlFeld pfad="huelle.lueftung.konzept" label="Lüftungskonzept" optionen={KONZEPTE} standardText={KONZEPT_STD?.label} testid="lueftung-konzept" />
          <AuswahlFeld pfad="huelle.lueftung.dichtheit" label="Luftdichtheit" optionen={[{ wert: 'neubau', label: 'Neubau-Grenzwerte erfüllt' }, { wert: 'altbau', label: 'Bestand ohne Nachweis' }]} standardText={rw ? (rw.nMinDichtheit === 'altbau' ? 'Bestand ohne Nachweis' : 'Neubau-Grenzwerte erfüllt') : undefined} testid="lueftung-dichtheit" />
          <AuswahlFeld pfad="huelle.waermebruecken.key" label="Wärmebrücken" optionen={WB} standardText={rw ? `ΔU ${rw.deltaUWb.wert} W/m²K` : undefined} testid="waermebruecken" />
          <ZahlFeld pfad="huelle.geschosshoeheM" label="Raumhöhe (Standard für alle Räume)" einheit="m" min={1.8} max={6} dez={2} standard={hoeheStandard} testid="geschosshoehe" />
        </Raster>
        <JaNeinFeld pfad="huelle.lueftung.fensterErsetzt" label="Wurden die Fenster ersetzt?" testid="fenster-ersetzt" info="Bestimmt mit dem Baujahr, ob für den Mindestluftwechsel Neubau- oder Bestandswerte gelten." />
        <details class="genauer">
          <summary>Erdreich (für Böden gegen Erdreich)</summary>
          <Raster spalten={3}>
            <ZahlFeld pfad="huelle.erdreich.bodenflaecheM2" label="Bodenplatte gesamt" einheit="m²" min={0} testid="erdreich-flaeche" />
            <ZahlFeld pfad="huelle.erdreich.umfangM" label="Umfang" einheit="m" min={0} testid="erdreich-umfang" />
            <SegmentFeld pfad="huelle.erdreich.grundwasserNah" label="Grundwasser nah" optionen={[{ wert: true, label: 'ja' }, { wert: false, label: 'nein' }]} testid="erdreich-gw" />
          </Raster>
        </details>
      </Abschnitt>

      <Abschnitt
        titel="Räume"
        text="Nettofläche, Raumtyp und Bauteile. Bauteile verweisen auf die Typen oben; ein eigener U-Wert ist als «eigener Wert» markiert."
        aktion={
          <button type="button" class="btn" onClick={() => store.raumHinzufuegen()} data-testid="raum-neu">
            Raum hinzufügen
          </button>
        }
      >
        {s.raeume.length === 0 ? (
          <p class="leerzustand">Noch keine Räume. Beheizte Räume einzeln erfassen; nicht erfasste Flächen können unten pauschal ergänzt werden.</p>
        ) : (
          <div class="raeume">{s.raeume.map((r, i) => <Raum raum={r} nr={i + 1} key={r.id} />)}</div>
        )}
        <div class="ergebniszeile ergebniszeile--summe">
          <span>EBF ({s.gebaeude.ebfModus === 'raeume' ? 'aus den Räumen' : 'eigene Angabe'})</span>
          <WertAnzeige wert={e.ebf} text={zahl(e.ebf?.wert, 'm²', 1)} testid="huelle-ebf" immerChip />
        </div>
        <Meldungen schritt="gebaeude" codes={['ebf.']} />
      </Abschnitt>

      {rel('huelle.rest') && (
        <Abschnitt titel="Nicht erfasste Flächen" text="Wenn nicht alle beheizten Räume erfasst sind: den Rest über die Hüllflächen oder grob über einen spezifischen Wert ergänzen.">
          <SegmentFeld pfad="huelle.rest.modus" label="Rest" optionen={[{ wert: 'keiner', label: 'alle Räume erfasst' }, { wert: 'huellflaechen', label: 'über Hüllflächen' }, { wert: 'spezifisch', label: 'grob in W/m²' }]} testid="rest-modus" beiWahl={(m) => setze('huelle.rest', { modus: m })} />
          {rest.modus === 'huellflaechen' && (
            <Raster spalten={3}>
              <ZahlFeld pfad="huelle.rest.flaecheM2" label="Grundfläche Rest" einheit="m²" min={0} testid="rest-flaeche" />
              <ZahlFeld pfad="huelle.rest.aAussenwandM2" label="Aussenwand" einheit="m²" min={0} testid="rest-aw" />
              <ZahlFeld pfad="huelle.rest.aFensterM2" label="Fenster" einheit="m²" min={0} testid="rest-fenster" />
              <ZahlFeld pfad="huelle.rest.aDachM2" label="Dach" einheit="m²" min={0} testid="rest-dach" />
              <ZahlFeld pfad="huelle.rest.aDeckeEstrichM2" label="Estrichdecke" einheit="m²" min={0} testid="rest-decke" />
              <ZahlFeld pfad="huelle.rest.aBodenM2" label="Boden" einheit="m²" min={0} testid="rest-boden" />
            </Raster>
          )}
          {rest.modus === 'spezifisch' && (
            <Raster>
              <ZahlFeld pfad="huelle.rest.flaecheM2" label="Fläche Rest" einheit="m²" min={0} testid="rest-flaeche" />
              <ZahlFeld pfad="huelle.rest.phiSpezWm2" label="Spezifische Heizlast" einheit="W/m²" min={5} max={200} testid="rest-spez" />
            </Raster>
          )}
          {rw?.rest && (
            <div class="ergebniszeile">
              <span>Heizlast Rest</span>
              <WertAnzeige wert={rw.rest.phiHL} text={zahl(rw.rest.phiHL.wert, 'W')} testid="rest-phi" />
            </div>
          )}
          <Meldungen schritt="huelle" codes={['rest.']} />
        </Abschnitt>
      )}
    </>
  );
}
