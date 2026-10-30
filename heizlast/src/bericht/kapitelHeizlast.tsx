/**
 * Bericht — Objekt, Zusammenfassung und Rechenweg der Heizlast je Modus (Session 9).
 * Zahlen und Rechenwege kommen aus dem Ergebnis (Begründungen des Kerns = eingesetzte Werte); Formate wie im
 * Dashboard (`ui/format.ts`), damit Bericht und Dashboard dieselben Zahlen zeigen.
 */
import type { FwsErgebnis, TraegerErgebnis, ZeitraumErgebnis } from '../kern/fws';
import type { BauteilErgebnis, RaumErgebnis } from '../kern/raumweise';
import { relevant } from '../kern/relevanz';
import { ERFASSUNGSARTEN } from '../kern/verbrauchsreihe';
import { fmt } from '../kern/wert';
import { Skala } from '../ui/komponenten/Skala';
import { datumKurz, kW, zahl } from '../ui/format';
import { methodeKurz, sanierungBezugTexte } from '../ui/ergebnisTexte';
import type { BerichtDaten } from './kontext';
import { ENERGIESTANDARD, GEBAEUDETYP, KELLER, traegerText } from './kontext';
import type { KvZeile } from './teile';
import { AmpelMarke, berichtText, HerkunftNotiz, KvTabelle, Rechenschritt, Tabelle, Unterkapitel } from './teile';

const STATUS_TEXT = { gemessen: 'aus Verbrauch (FWS-Kurs)', raumweise: 'raumweise nach SIA 384/2', schaetzung: 'Schätzung', fehlt: '—' } as const;

/** Text zur Auslegungs-Aussentemperatur: Station mit Höhenkorrektur (SIA 2028) bzw. eigene Angabe oder Standardwert. */
export function thetaEText(b: BerichtDaten): string {
  const e = b.ergebnis;
  if (e.thetaE.herkunft === 'override' || e.thetaE.herkunft === 'eingabe') return berichtText(e.thetaE.begruendung);
  return e.klima?.station ? e.klima.bezeichnung : berichtText(e.thetaE.begruendung);
}

/** Auslegungs-Vorlauf als Standardwert des Wärmeabgabesystems (ohne bewertete Heizflächen). */
function vlStandardText(b: BerichtDaten): string {
  const sys = b.state.waermeabgabe.system;
  const art = sys === 'fbh' ? 'Fussbodenheizung' : sys === 'radiatoren' ? 'Radiatoren' : sys === 'gemischt' ? 'Radiatoren und Fussbodenheizung' : null;
  return art ? `Standardwert für ${art}` : 'Standardwert (Grenze «gut» der WP-Tauglichkeit)';
}

/* ---------------------------------------------------------------------------------------------- */
/* Objekt                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

export function KapitelObjekt({ b }: { b: BerichtDaten }) {
  const { state: s, ergebnis: e, daten } = b;
  const p = s.projekt;
  const g = s.gebaeude;
  const st = g.standort;
  const ort = [st.plz, st.ort].filter(Boolean).join(' ');
  const standort = [ort, st.kanton].filter(Boolean).join(', ');
  const station = e.klima?.station;
  const sanierungen = s.sanierungen.map((x) => {
    const m = daten.fws.sanierungen.massnahmen.find((y) => y.key === x.massnahme);
    return `${x.bezeichnung || m?.label || x.massnahme}${x.datum ? ` ${x.datum}` : ''} (${x.status === 'ausgefuehrt' ? 'ausgeführt' : 'geplant'})`;
  });
  const dach = g.dachform === 'flach' ? 'Flachdach' : g.dachform === 'steil' ? (relevant('gebaeude.dachraumBeheizt', s) && g.dachraumBeheizt !== undefined ? (g.dachraumBeheizt ? 'Steildach, Dachraum beheizt' : 'Steildach, Estrich unbeheizt') : 'Steildach') : null;
  const zeilen: (KvZeile | false | null | undefined | '')[] = [
    { label: 'Projekt', wert: p.name || '—', testid: 'bericht-projekt' },
    p.kunde && { label: 'Kundschaft', wert: p.kunde },
    p.adresse && { label: 'Objektadresse', wert: p.adresse },
    p.bearbeiter && { label: 'Bearbeitet von', wert: p.bearbeiter },
    standort && { label: 'Standort', wert: `${standort}${st.hoeheM !== undefined ? `, ${fmt(st.hoeheM, 0)} m ü. M.` : ''}` },
    station && { label: 'Klimastation', wert: `${station.name} (${fmt(station.hoeheM, 0)} m ü. M.)` },
    { label: <>Auslegungs-Aussentemperatur θ<sub>e</sub></>, wert: zahl(e.thetaE.wert, '°C', 1), herkunft: e.thetaE, notiz: thetaEText(b), testid: 'bericht-thetae' },
    g.typ && { label: 'Gebäudetyp', wert: GEBAEUDETYP[g.typ] ?? g.typ },
    g.baujahr !== undefined && { label: 'Baujahr', wert: String(g.baujahr) },
    g.geschosse !== undefined && { label: 'Beheizte Geschosse', wert: String(g.geschosse) },
    g.typ === 'mfh' && g.wohneinheiten !== undefined && { label: 'Wohneinheiten', wert: String(g.wohneinheiten) },
    relevant('gebaeude.keller', s) && g.keller && { label: 'Keller', wert: KELLER[g.keller] ?? g.keller },
    relevant('gebaeude.dachform', s) && dach && { label: 'Dach', wert: dach },
    g.energiestandard !== 'keiner' && { label: 'Energiestandard', wert: ENERGIESTANDARD[g.energiestandard] ?? g.energiestandard },
    e.ebf && { label: 'Energiebezugsfläche EBF', wert: zahl(e.ebf.wert, 'm²'), herkunft: e.ebf, notiz: e.ebf.herkunft === 'eingabe' ? undefined : berichtText(e.ebf.begruendung), testid: 'bericht-ebf' },
    sanierungen.length > 0 && { label: 'Sanierungen', wert: sanierungen.join('; ') },
    { label: 'Methode Heizlast', wert: e.methode === 'fws' ? 'FWS-Kurs Modul 3 (Verbrauch)' : e.methode === 'raumweise' ? 'raumweise nach SIA 384/2:2020' : methodeKurz(e.methode) },
  ];
  return <KvTabelle zeilen={zeilen.filter((z): z is KvZeile => !!z)} testid="bericht-objekt" />;
}

/* ---------------------------------------------------------------------------------------------- */
/* Zusammenfassung                                                                                 */
/* ---------------------------------------------------------------------------------------------- */

export function KapitelZusammenfassung({ b }: { b: BerichtDaten }) {
  const { state: s, ergebnis: e } = b;
  const m = e.heizlast.massgebend;
  const z = e.zuschlaege;
  const wab = e.waermeabgabe;
  const vlFallback = e.auslegungsVL.herkunft === 'fallback';
  const gw = e.geraet.gewaehlt;
  const zeilen: (KvZeile | false | null | undefined)[] = [
    { label: <>Auslegungsleistung Wärmepumpe Q<sub>h</sub></>, wert: kW(z.qh?.wert), testid: 'bericht-qh', hervorheben: true },
    { label: <>Heizlast Q<sub>hl</sub></>, wert: kW(z.qhl?.wert), herkunft: m.wert, notiz: STATUS_TEXT[m.status], testid: 'bericht-qhl' },
    s.warmwasser.wwKuenftig === true && { label: <>Leistungszuschlag Warmwasser Q<sub>w</sub></>, wert: kW(z.qw.wert), testid: 'bericht-qw' },
    s.zuschlaege.sperrzeitAktiv === true && { label: <>Leistungszuschlag Sperrzeit Q<sub>off</sub></>, wert: kW(z.qoff.wert), testid: 'bericht-qoff' },
    s.zuschlaege.zusatz.length > 0 && { label: <>Verbundene Systeme Q<sub>as</sub></>, wert: kW(z.qas.wert), testid: 'bericht-qas' },
    e.heizlast.spezifisch && { label: 'Spezifische Heizlast', wert: zahl(e.heizlast.spezifisch.wert, 'W/m²', 1), notiz: e.ebf ? `bezogen auf EBF ${zahl(e.ebf.wert, 'm²')}` : undefined, testid: 'bericht-spez' },
    {
      label: 'Auslegungs-Vorlauf',
      wert: zahl(e.auslegungsVL.wert, '°C'),
      herkunft: e.auslegungsVL,
      notiz: vlFallback ? vlStandardText(b) : wab ? wab.gebaeude.urteil : berichtText(e.auslegungsVL.begruendung),
      testid: 'bericht-vl',
    },
    e.speicher.ww && { label: 'Warmwasserspeicher', wert: zahl(e.speicher.ww.volumenEffektiv.wert, 'l'), testid: 'bericht-speicher-ww' },
    { label: 'Pufferspeicher', wert: zahl(e.speicher.pufferEffektiv.wert, 'l'), testid: 'bericht-puffer' },
    gw && { label: 'Wärmepumpe', wert: `${gw.bezeichnung}, ${kW(gw.qWpMassgebend.wert, 1)}`, notiz: gw.dimensionierung.text, testid: 'bericht-wp' },
  ];
  return (
    <>
      <KvTabelle zeilen={zeilen} testid="bericht-zusammenfassung" />
      <p class="bericht__absatz" data-testid="bericht-methode">
        <strong>Methode:</strong> {m.label}.
      </p>
      <p class="bericht__absatz">
        <strong>Auslegungs-Aussentemperatur:</strong> {thetaEText(b)}.
      </p>
      {!vlFallback && (
        <div class="bericht__skala">
          <Skala skala={e.skalen.vorlauf} text={wab?.gebaeude.urteil} testid="bericht-skala-vorlauf" />
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Rechenweg FWS                                                                                   */
/* ---------------------------------------------------------------------------------------------- */

function hgtHerkunft(z: ZeitraumErgebnis, station: string | null): string {
  const h = z.hgtIst;
  if (!h) return '';
  if (h.herkunft === 'override') return 'manuell';
  return station ? `MeteoSchweiz, ${station}` : 'MeteoSchweiz';
}

function anteilBasis(z: ZeitraumErgebnis): string {
  if (z.klimaFaktor !== null) return 'HGT / Normjahr';
  if (z.ganzesJahr) return 'Tage / 365';
  return z.anteilBasis === 'hgt' ? 'HGT-Anteil' : 'nach Tagen';
}

function ZeitraumTabelle({ b, t }: { b: BerichtDaten; t: TraegerErgebnis }) {
  const { einheit } = traegerText(b, t.energietraeger);
  const station = b.ergebnis.klima?.station?.name ?? null;
  const mitHgt = t.zeitraeume.some((z) => z.hgtIst);
  const mitSanierung = t.zeitraeume.some((z) => z.sanierung.bezug.length > 0);
  const kopf = ['Zeitraum', 'Herleitung der Menge', ...(mitHgt ? ['Heizgradtage'] : []), 'Jahresanteil', 'pro Jahr', ...(mitSanierung ? ['Sanierungen'] : [])];
  const zahlSpalten = mitHgt ? [2, 3, 4] : [2, 3];
  return (
    <Tabelle kopf={kopf} zahlSpalten={zahlSpalten} testid={`bericht-zeitraeume-${t.energietraeger}`}>
      {t.zeitraeume.map((z) => (
        <tr key={z.id}>
          <td>
            {datumKurz(z.zeitraum.vonMs)} – {datumKurz(z.zeitraum.bisMs)}
            <span class="bericht__zelle-notiz">
              {z.zeitraum.tage} Tage{z.ganzesJahr ? ', ganzes Jahr' : ''}
              {!z.inStreuung && !z.ganzesJahr ? ', nur im Mittel' : ''}
            </span>
          </td>
          <td class="bericht__herleitung">{berichtText(z.menge.begruendung)}</td>
          {mitHgt && (
            <td class="zahl">
              {z.hgtIst ? `${fmt(z.hgtIst.wert, 0)} Kd` : '—'}
              {z.hgtIst && <span class="bericht__zelle-notiz">{hgtHerkunft(z, station)}</span>}
            </td>
          )}
          <td class="zahl">
            {fmt(z.anteil.wert, 3)}
            <span class="bericht__zelle-notiz">{anteilBasis(z)}</span>
          </td>
          <td class="zahl">{zahl(z.hochgerechnet.wert, `${einheit}/a`)}</td>
          {mitSanierung && <td>{sanierungBezugTexte(z).map((x) => <span class="bericht__zelle-zeile" key={x.schluessel}>{x.text}</span>)}</td>}
        </tr>
      ))}
    </Tabelle>
  );
}

function RechenwegVerbrauch({ b, f }: { b: BerichtDaten; f: FwsErgebnis }) {
  const s = b.state;
  const e = b.ergebnis;
  const station = e.klima?.station;
  const konvention = s.verbrauch.konvention === 'hi' ? 'unterer Heizwert Hi (BFE), η auf Hi bezogen' : 'FWS-Kurs (Ho 10.5 kWh/l Öl, 10.4 kWh/m³ Gas, Kurs-Nutzungsgrade)';
  const ww = e.warmwasser.bisher;
  return (
    <>
      <p class="bericht__absatz">
        Verbrauchsmethode nach FWS-Kurs Modul 3: Jahresmenge je Energieträger = Σ Menge / Σ Jahresanteile (Mittel über alle Zeiträume), Nutzwärme = Jahresmenge × Heizwert × η, Heizlast = Heizwärme / Volllaststunden. Heizwert-Konvention: {konvention}.
      </p>
      {f.klimabereinigungAktiv && (
        <p class="bericht__hinweisblock" data-testid="bericht-klimabereinigung">
          <strong>Klimabereinigung aktiv — nicht FWS-Kurs:</strong> alle Zeiträume (auch ganze Kalenderjahre) sind mit ihren Heizgradtagen auf das Normjahr
          {station ? ` der Station ${station.name} (HGT 20/12 ${fmt(station.hgt2012Kd, 0)} Kd, SIA 2028)` : ' der Station (SIA 2028)'} umgerechnet.
        </p>
      )}
      {f.traeger.map((t) => {
        const tt = traegerText(b, t.energietraeger);
        const reihe = s.verbrauch.reihen.find((r) => r.energietraeger === t.energietraeger);
        const art = ERFASSUNGSARTEN.find((a) => a.key === reihe?.art)?.label;
        return (
          <Unterkapitel titel={`${tt.label}${art ? ` — ${art}` : ''}`} key={t.energietraeger} testid={`bericht-traeger-${t.energietraeger}`}>
            <ZeitraumTabelle b={b} t={t} />
            <Rechenschritt titel="Mittlere Jahresmenge" wert={t.jahresmenge} text={zahl(t.jahresmenge.wert, `${tt.einheit}/a`)} />
            <Rechenschritt titel="Heizwert" wert={t.heizwert} text={zahl(t.heizwert.wert, `kWh/${tt.einheit}`, 2)} />
            <Rechenschritt titel="Jahresnutzungsgrad η" wert={t.eta} text={fmt(t.eta.wert, 3)} />
            <Rechenschritt titel="Nutzwärme" wert={t.qnBrutto} text={zahl(t.qnBrutto.wert, 'kWh/a')} />
          </Unterkapitel>
        );
      })}
      {f.traeger.length > 1 && <Rechenschritt titel="Nutzwärme gesamt" wert={f.qnBrutto} text={zahl(f.qnBrutto?.wert, 'kWh/a')} />}
      {f.wwAbzug && ww && (
        <Unterkapitel titel="Abzug Warmwasser (bisher über die Heizung)" testid="bericht-ww-abzug">
          <Rechenschritt titel="Nutzwarmwasser" wert={ww.vwu} text={zahl(ww.vwu.wert, 'l/d')} />
          <Rechenschritt titel="Wärmebedarf Warmwasser" wert={ww.qww} text={zahl(ww.qww.wert, 'kWh/d', 1)} />
          <Rechenschritt titel="Abzug vom Verbrauch" wert={f.wwAbzug} text={zahl(f.wwAbzug.wert, 'kWh/a')} />
        </Unterkapitel>
      )}
      <FwsSchluss f={f} />
    </>
  );
}

/** Sanierungen, Volllaststunden und Heizlast (alle FWS-Methoden). */
function FwsSchluss({ f }: { f: FwsErgebnis }) {
  const san = [...f.sanierungen.ausgefuehrt, ...f.sanierungen.geplant];
  return (
    <>
      <Rechenschritt titel="Heizwärme vor Sanierungen" wert={f.qnHeizungUnsaniert} text={zahl(f.qnHeizungUnsaniert?.wert, 'kWh/a')} />
      {san.length > 0 && (
        <Unterkapitel titel="Sanierungen (jahresgenau gewichtet)" testid="bericht-sanierungen">
          <Tabelle kopf={['Massnahme', 'Status', 'Datum', 'Einsparung']} zahlSpalten={[3]}>
            {san.map((x, i) => (
              <tr key={i}>
                <td>{x.label}</td>
                <td>{x.sanierung.status === 'ausgefuehrt' ? 'ausgeführt' : 'geplant'}</td>
                <td>{x.sanierung.datum ?? '—'}</td>
                <td class="zahl">
                  {fmt(x.einsparung.wert, 0)} %
                  <HerkunftNotiz wert={x.einsparung} />
                </td>
              </tr>
            ))}
          </Tabelle>
          {f.sanierungen.ausgefuehrt.length > 0 && <Rechenschritt titel="Faktor ausgeführte Massnahmen" wert={f.sanierungen.faktorIst} text={fmt(f.sanierungen.faktorIst.wert, 4)} />}
          {f.sanierungen.geplant.length > 0 && <Rechenschritt titel="Faktor geplante Massnahmen" wert={f.sanierungen.faktorGeplant} text={fmt(f.sanierungen.faktorGeplant.wert, 4)} />}
          {f.sanierungen.ausgefuehrt.length > 0 && <Rechenschritt titel="Heizwärme heute" wert={f.qnHeizungIst} text={zahl(f.qnHeizungIst?.wert, 'kWh/a')} />}
        </Unterkapitel>
      )}
      <Rechenschritt titel={<>Volllaststunden t<sub>voll</sub></>} wert={f.tvoll} text={zahl(f.tvoll.wert, 'h/a')} />
      {san.length > 0 && <Rechenschritt titel="Heizlast vor Sanierungen" wert={f.qhlUnsaniert} text={kW(f.qhlUnsaniert?.wert)} />}
      {f.sanierungen.geplant.length > 0 && <Rechenschritt titel="Heizlast heute" wert={f.qhlIst} text={kW(f.qhlIst?.wert)} />}
      <Rechenschritt titel={<>Heizlast Q<sub>hl</sub></>} wert={f.qhl} text={kW(f.qhl?.wert)} akzent testid="bericht-rechenweg-qhl" />
    </>
  );
}

function RechenwegFws({ b, f }: { b: BerichtDaten; f: FwsErgebnis }) {
  if (f.methode === 'verbrauch') return <RechenwegVerbrauch b={b} f={f} />;
  return (
    <>
      <p class="bericht__absatz">{f.methodeLabel}.</p>
      {f.wp && <Rechenschritt titel="Betriebsstunden pro Jahr" wert={f.wp.betriebsstundenProJahr} text={zahl(f.wp.betriebsstundenProJahr.wert, 'h/a')} />}
      {f.bauperiodeBand && <p class="bericht__absatz">Bauperiode {f.bauperiodeBand.label}: {fmt(f.bauperiodeBand.kwhM2a[0], 0)}–{fmt(f.bauperiodeBand.kwhM2a[1], 0)} kWh/(m²·a) (FWS Folie 36).</p>}
      <Rechenschritt titel="Nutzwärme" wert={f.qnBrutto} text={zahl(f.qnBrutto?.wert, 'kWh/a')} />
      {f.wp?.qk && <Rechenschritt titel="Kälteleistung" wert={f.wp.qk} text={kW(f.wp.qk.wert)} />}
      {f.wp?.entzugsleistung && <Rechenschritt titel="Spezifische Entzugsleistung Erdsonde" wert={f.wp.entzugsleistung} text={zahl(f.wp.entzugsleistung.wert, 'W/m')} />}
      <FwsSchluss f={f} />
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Rechenweg raumweise                                                                             */
/* ---------------------------------------------------------------------------------------------- */

const ANSCHLUSS: Record<BauteilErgebnis['anschluss'], string> = { aussen: 'aussen', unbeheizt: 'unbeheizt (b_u)', erdreich: 'Erdreich', beheizt: 'beheizter Nachbar', faktor: 'Faktor' };

/** Kennzeichnung der Bauteil-Grundlage: Standard aus Baujahr, eigener Typ oder eigener U-Wert. */
function grundlage(b: BerichtDaten, raumId: string, bt: BauteilErgebnis): string {
  if (bt.u.herkunft === 'override') return 'eigener U-Wert';
  const k = b.ergebnis.heizlast.raumBauteile[raumId]?.[bt.id];
  if (k?.standardTyp) return `Standard aus Baujahr ${b.state.gebaeude.baujahr ?? ''}`.trim();
  const typ = k?.typId ? b.state.huelle.bauteiltypen.find((t) => t.id === k.typId) : undefined;
  return typ ? `eigener Typ «${typ.bezeichnung ?? typ.id}»` : 'eigener Typ';
}

function RaumBlock({ b, r }: { b: BerichtDaten; r: RaumErgebnis }) {
  return (
    <Unterkapitel
      titel={
        <>
          {r.name} <span class="bericht__h3-zusatz">({r.typLabel}{!r.beheizt ? ', unbeheizt' : ''}) · θ<sub>int</sub> {zahl(r.thetaInt.wert, '°C', 1)} · {zahl(r.flaeche.wert, 'm²', 1)} · V {zahl(r.volumen.wert, 'm³', 1)}</span>
        </>
      }
      testid={`bericht-raum-${r.id}`}
    >
      <Tabelle kopf={['Bauteil', 'Grundlage', 'A [m²]', 'U [W/m²K]', 'ΔU_WB', 'f / b', 'H_T [W/K]', 'Φ_T [W]']} zahlSpalten={[2, 3, 4, 5, 6, 7]}>
        {r.bauteile.map((bt) => (
          <tr key={bt.id}>
            <td>
              {bt.bezeichnung}
              <span class="bericht__zelle-notiz">{ANSCHLUSS[bt.anschluss]}</span>
            </td>
            <td>{grundlage(b, r.id, bt)}</td>
            <td class="zahl">{fmt(bt.flaeche.wert, 2)}</td>
            <td class="zahl">{fmt(bt.u.wert, 2)}</td>
            <td class="zahl">{fmt(bt.deltaUWb.wert, 2)}</td>
            <td class="zahl">{fmt(bt.faktor.wert, 2)}</td>
            <td class="zahl">{fmt(bt.hT.wert, 2)}</td>
            <td class="zahl">{fmt(bt.phiT.wert, 0)}</td>
          </tr>
        ))}
        <tr class="bericht__zeile-lueftung">
          <td colSpan={6}>
            Lüftung: {berichtText(r.nMin.begruendung)}
          </td>
          <td class="zahl">{fmt(r.hV.wert, 2)}</td>
          <td class="zahl">{fmt(r.phiV.wert, 0)}</td>
        </tr>
      </Tabelle>
      <p class="bericht__formel">
        Φ<sub>HL</sub> = Φ<sub>T</sub> + Φ<sub>V</sub> = {fmt(r.phiT.wert, 0)} + {fmt(r.phiV.wert, 0)} = <strong data-testid={`bericht-raum-${r.id}-phihl`}>{zahl(r.phiHL.wert, 'W')}</strong> ({fmt(r.phiSpez.wert, 0)} W/m²)
      </p>
    </Unterkapitel>
  );
}

function RechenwegRaumweise({ b }: { b: BerichtDaten }) {
  const rw = b.ergebnis.heizlast.raumweise;
  if (!rw) return null;
  return (
    <>
      <p class="bericht__absatz">
        Raumweise Norm-Heizlast: Φ<sub>T</sub> = Σ (U + ΔU<sub>WB</sub>) · A · f · (θ<sub>int</sub> − θ<sub>e</sub>), f = 1 (aussen), b<sub>u</sub> (unbeheizt) bzw. Erdreich-Ansatz; Φ<sub>V</sub> = V · n<sub>min</sub> · 0.34 · (θ<sub>int</sub> − θ<sub>e</sub>). θ<sub>e</sub> = {zahl(rw.thetaE.wert, '°C', 1)}.
      </p>
      <KvTabelle
        zeilen={[
          { label: 'Wärmebrücken ΔU_WB', wert: `${fmt(rw.deltaUWb.wert, 2)} W/(m²·K)`, herkunft: rw.deltaUWb },
          rw.erdreich.bStrich && { label: "Erdreich B'", wert: zahl(rw.erdreich.bStrich.wert, 'm', 2), herkunft: rw.erdreich.bStrich },
          { label: 'EBF', wert: zahl(rw.ebf.wert, 'm²', 1), herkunft: rw.ebf, notiz: berichtText(rw.ebf.begruendung) },
        ]}
      />
      {rw.raeume.map((r) => (
        <RaumBlock b={b} r={r} key={r.id} />
      ))}
      {rw.rest && (
        <Unterkapitel titel="Nicht raumweise erfasste Flächen" testid="bericht-rest">
          {rw.rest.bauteile.length > 0 && (
            <Tabelle kopf={['Bauteil', 'A [m²]', 'U [W/m²K]', 'f / b', 'Φ_T [W]']} zahlSpalten={[1, 2, 3, 4]}>
              {rw.rest.bauteile.map((bt) => (
                <tr key={bt.id}>
                  <td>{bt.bezeichnung}</td>
                  <td class="zahl">{fmt(bt.flaeche.wert, 2)}</td>
                  <td class="zahl">{fmt(bt.u.wert, 2)}</td>
                  <td class="zahl">{fmt(bt.faktor.wert, 2)}</td>
                  <td class="zahl">{fmt(bt.phiT.wert, 0)}</td>
                </tr>
              ))}
            </Tabelle>
          )}
          <Rechenschritt titel="Heizlast Rest" wert={rw.rest.phiHL} text={zahl(rw.rest.phiHL.wert, 'W')} />
        </Unterkapitel>
      )}
      <Unterkapitel titel="Gebäude" testid="bericht-gebaeude-heizlast">
        <KvTabelle
          zeilen={[
            { label: 'Summe der Räume (für die Heizflächen)', wert: zahl(rw.summeRaeume.wert, 'W'), testid: 'bericht-summe-raeume' },
            { label: 'Gebäudehülle saldiert (ohne Wärmeflüsse zwischen beheizten Räumen)', wert: zahl(rw.saldiertRaeume.wert, 'W'), testid: 'bericht-saldiert' },
            rw.rest && { label: 'Nicht erfasste Flächen', wert: zahl(rw.rest.phiHL.wert, 'W') },
            { label: 'Gebäude-Heizlast (massgebend für den Wärmeerzeuger)', wert: zahl(rw.gebaeude.wert, 'W'), notiz: berichtText(rw.gebaeude.begruendung), hervorheben: true, testid: 'bericht-gebaeude' },
          ]}
        />
        <p class="bericht__notiz-absatz">{berichtText(rw.innentransmissionAnteil.begruendung)}.</p>
      </Unterkapitel>
    </>
  );
}

export function KapitelRechenweg({ b }: { b: BerichtDaten }) {
  const e = b.ergebnis;
  const f = e.heizlast.fws;
  return (
    <>
      {e.methode === 'fws' && f && <RechenwegFws b={b} f={f} />}
      {e.methode === 'raumweise' && <RechenwegRaumweise b={b} />}
      {e.methode === 'fws' && f && f.streuung.prozent !== null && (
        <p class="bericht__absatz">
          Streuung der hochgerechneten Zeiträume: grösste Abweichung vom Mittel {fmt(f.streuung.prozent, 0)} % <AmpelMarke ampel={f.streuung.ampel} text={f.streuung.ampel === 'gruen' ? 'passt' : f.streuung.ampel === 'gelb' ? 'prüfen' : f.streuung.ampel === 'rot' ? 'auffällig' : '—'} />
        </p>
      )}
    </>
  );
}

/** Titel des Rechenweg-Kapitels je Modus. */
export function rechenwegTitel(b: BerichtDaten): string {
  return b.ergebnis.methode === 'raumweise' ? 'Rechenweg Heizlast — raumweise nach SIA 384/2' : 'Rechenweg Heizlast — FWS-Kurs Modul 3';
}
