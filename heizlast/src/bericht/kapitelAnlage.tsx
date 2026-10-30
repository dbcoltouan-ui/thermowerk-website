/**
 * Bericht — Warmwasser, Auslegungsleistung, Wärmeabgabe (Schwerpunkt), Speicher, Wärmepumpe (Session 9).
 * Alles aus dem Ergebnis; der State liefert nur Beschriftungen (Masse der Heizflächen, Namen der Zusätze).
 */
import type { HeizflaecheEingabe, HeizflaecheErgebnis, MassFeld, RaumWaermeabgabe } from '../kern/waermeabgabe';
import { relevanteMasse } from '../kern/waermeabgabe';
import { fmt } from '../kern/wert';
import type { Wert } from '../kern/wert';
import { Skala } from '../ui/komponenten/Skala';
import { kW, zahl } from '../ui/format';
import { filterVorlaufHerkunft } from '../ui/ergebnisTexte';
import type { BerichtDaten } from './kontext';
import { WP_QUELLE } from './kontext';
import type { KvZeile } from './teile';
import { AmpelMarke, berichtText, HerkunftNotiz, KvTabelle, Rechenschritt, Tabelle, Unterkapitel } from './teile';

/* ---------------------------------------------------------------------------------------------- */
/* Warmwasser                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

export function KapitelWarmwasser({ b }: { b: BerichtDaten }) {
  const e = b.ergebnis;
  const w = e.warmwasser.kuenftig;
  if (!w) return null;
  const sp = e.speicher.ww;
  const zu = e.warmwasser.zuschlag;
  return (
    <>
      <p class="bericht__absatz">Die neue Wärmepumpe bereitet das Warmwasser. Nutzwarmwasser bei 60 °C nach SIA 385/2; Verluste werden zum Nutzbedarf addiert (FWS-Kurs Folie 49).</p>
      {w.personen && <Rechenschritt titel="Personen" wert={w.personen} text={fmt(w.personen.wert, 0)} />}
      <Rechenschritt titel={<>Nutzwarmwasser V<sub>W,u</sub></>} wert={w.vwu} text={zahl(w.vwu.wert, 'l/d')} />
      <Rechenschritt titel={<>Nutzwärme Q<sub>W,u</sub></>} wert={w.qwu} text={zahl(w.qwu.wert, 'kWh/d', 1)} />
      <Rechenschritt titel="Speicherverlust" wert={w.verluste.speicher} text={zahl(w.verluste.speicher.wert, 'kWh/d', 2)} />
      <Rechenschritt titel="Leitungsverlust" wert={w.verluste.leitungen} text={zahl(w.verluste.leitungen.wert, 'kWh/d', 2)} />
      <Rechenschritt titel="Ausstossverlust" wert={w.verluste.ausstoss} text={zahl(w.verluste.ausstoss.wert, 'kWh/d', 2)} />
      <Rechenschritt titel={<>Wärmebedarf Warmwasser Q<sub>WW</sub></>} wert={w.qww} text={zahl(w.qww.wert, 'kWh/d', 1)} />
      <Rechenschritt titel="Jahresenergie Warmwasser" wert={w.qnWw} text={zahl(w.qnWw.wert, 'kWh/a')} />
      {sp && <Rechenschritt titel="Ladetemperatur Speicher" wert={sp.tLade} text={zahl(sp.tLade.wert, '°C')} />}
      {sp && <Rechenschritt titel="Temperaturdifferenz ΔT" wert={sp.deltaT} text={zahl(sp.deltaT.wert, 'K')} />}
      {zu && <Rechenschritt titel={<>Ladezeit pro Tag t<sub>d</sub></>} wert={zu.td} text={zahl(zu.td.wert, 'h', 2)} />}
      {zu && <Rechenschritt titel={<>Leistungszuschlag Q<sub>w</sub></>} wert={zu.qw} text={kW(zu.qw.wert)} akzent />}
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Auslegungsleistung                                                                              */
/* ---------------------------------------------------------------------------------------------- */

export function KapitelLeistung({ b }: { b: BerichtDaten }) {
  const { state: s, ergebnis: e } = b;
  const z = e.zuschlaege;
  const sp = z.sperrzeit;
  return (
    <>
      <p class="bericht__absatz">
        Q<sub>h</sub> = Q<sub>hl</sub> + Q<sub>w</sub> + Q<sub>off</sub> + Q<sub>as</sub> (SIA 384/1:2022 Pos. 4.2.1.4, FWS-Kurs Modul 3) — die Leistung, die die Wärmepumpe am Auslegungspunkt liefern muss.
      </p>
      {s.zuschlaege.sperrzeitAktiv === true && sp && (
        <>
          <Rechenschritt titel={<>Sperrzeit t<sub>off</sub></>} wert={sp.toff} text={zahl(sp.toff.wert, 'h/d', 1)} />
          <Rechenschritt titel="Faktor Sperrzeit" wert={sp.faktor} text={fmt(sp.faktor.wert, 3)} />
          <Rechenschritt titel={<>Leistungszuschlag Sperrzeit Q<sub>off</sub></>} wert={sp.qoff} text={kW(sp.qoff.wert)} />
        </>
      )}
      {s.zuschlaege.zusatz.length > 0 && (
        <Tabelle kopf={['Verbundenes System', 'Leistung']} zahlSpalten={[1]} testid="bericht-zusatz">
          {s.zuschlaege.zusatz.map((x, i) => (
            <tr key={i}>
              <td>{x.bezeichnung}</td>
              <td class="zahl">{kW(x.leistungW)}</td>
            </tr>
          ))}
        </Tabelle>
      )}
      <KvTabelle
        zeilen={[
          { label: <>Heizlast Q<sub>hl</sub></>, wert: kW(z.qhl?.wert) },
          s.warmwasser.wwKuenftig === true && { label: <>Warmwasser Q<sub>w</sub></>, wert: kW(z.qw.wert) },
          s.zuschlaege.sperrzeitAktiv === true && { label: <>Sperrzeit Q<sub>off</sub></>, wert: kW(z.qoff.wert) },
          s.zuschlaege.zusatz.length > 0 && { label: <>Verbundene Systeme Q<sub>as</sub></>, wert: kW(z.qas.wert) },
          { label: <>Auslegungsleistung Q<sub>h</sub></>, wert: kW(z.qh?.wert), notiz: z.qh ? berichtText(z.qh.begruendung) : undefined, hervorheben: true, testid: 'bericht-leistung-qh' },
        ]}
      />
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Wärmeabgabe                                                                                     */
/* ---------------------------------------------------------------------------------------------- */

const STUFE_TEXT: Record<HeizflaecheErgebnis['stufe'], string> = {
  typenschild: 'Typenschild',
  modell: 'Datenblatt (Modell)',
  bauartMasse: 'Tabelle aus Bauart und Massen',
  heizkurve: 'aus alter Heizkurve geschätzt',
  fehlt: '—',
};

const MASS_FOLGE: ReadonlyArray<MassFeld> = ['hoeheMm', 'nabenabstandMm', 'laengeMm', 'tiefeMm', 'glieder', 'gliedbreiteMm', 'designTyp', 'einbau', 'flaecheM2', 'verlegeabstandMm', 'belag', 'rlb', 'system'];
const BELAG: Record<string, string> = { keramik: 'Keramik/Stein', pvc_linoleum: 'PVC/Linoleum', parkett: 'Parkett', laminat: 'Laminat', teppich: 'Teppich', teppichDick: 'Teppich dick' };

function massText(feld: MassFeld, wert: number | string, kat: string): string {
  switch (feld) {
    case 'hoeheMm':
      return `H ${fmt(Number(wert), 0)} mm`;
    case 'nabenabstandMm':
      return `NA ${fmt(Number(wert), 0)} mm`;
    case 'laengeMm':
      return `${kat === 'bad' || kat === 'vertikal' ? 'B' : 'L'} ${fmt(Number(wert), 0)} mm`;
    case 'tiefeMm':
      return `T ${fmt(Number(wert), 0)} mm`;
    case 'glieder':
      return `${fmt(Number(wert), 0)} Glieder`;
    case 'gliedbreiteMm':
      return `Glied ${fmt(Number(wert), 0)} mm`;
    case 'designTyp':
      return `Typ ${wert}`;
    case 'einbau':
      return wert === 'unterflur' ? 'Unterflur' : 'verkleidet';
    case 'flaecheM2':
      return `${fmt(Number(wert), 1)} m²`;
    case 'verlegeabstandMm':
      return `VA ${fmt(Number(wert), 0)} mm`;
    case 'belag':
      return BELAG[String(wert)] ?? String(wert);
    case 'rlb':
      return `Rλ,B ${fmt(Number(wert), 2)}`;
    case 'system':
      return wert === 'nassputz' ? 'Nassputz' : 'Trockenbau';
  }
}

/** Masse einer Heizfläche: eigene Angaben, eingesetzte Standardwerte mit «*» (Fussnote). */
function masse(b: BerichtDaten, hf: HeizflaecheEingabe, erg: HeizflaecheErgebnis): { text: string; standard: boolean } {
  const teile: string[] = [];
  let standard = false;
  if (hf.typenschild) teile.push(`Typenschild ${fmt(hf.typenschild.qNW, 0)} W bei ${hf.typenschild.tVLC}/${hf.typenschild.tRLC}/${hf.typenschild.tRaumC} °C`);
  const modell = hf.modellId ? b.daten.hk.modelle.find((m) => m.id === hf.modellId) : undefined;
  if (modell) teile.push(`${modell.hersteller} ${modell.modellreihe}`);
  const rel = relevanteMasse(hf.bauart, b.daten.hk);
  for (const f of MASS_FOLGE) {
    if (!rel.includes(f)) continue;
    const eigen = hf[f as keyof HeizflaecheEingabe] as number | string | undefined;
    const std = erg.standardwerte[f] as Wert<number | string> | undefined;
    if (eigen !== undefined) teile.push(massText(f, eigen, erg.kategorie));
    else if (std) {
      teile.push(`${massText(f, std.wert, erg.kategorie)}*`);
      standard = true;
    }
  }
  return { text: teile.join(' · ') || '—', standard };
}

function vlReqText(r: RaumWaermeabgabe, vlMax: number): string {
  if (r.tVLReq) return zahl(r.tVLReq.wert, '°C', 1);
  return r.phiHL && r.qZiel && !r.erreichbar ? `> ${fmt(vlMax, 0)} °C` : '—';
}

function beurteilung(r: RaumWaermeabgabe): { ampel: RaumWaermeabgabe['ampel']; text: string } {
  if (r.ausgeklammert) return { ampel: 'grau', text: 'ausgeklammert' };
  return r.ampel === 'gruen' ? { ampel: 'gruen', text: 'gedeckt' } : r.ampel === 'gelb' ? { ampel: 'gelb', text: 'knapp' } : r.ampel === 'rot' ? { ampel: 'rot', text: 'zu klein' } : { ampel: 'grau', text: '—' };
}

/** Räume mit erfasster Heizfläche — nur sie sind beurteilbar und erscheinen im Bericht. */
export function raeumeMitHeizflaechen(b: BerichtDaten): RaumWaermeabgabe[] {
  return b.ergebnis.waermeabgabe?.raeume.filter((r) => r.heizflaechen.length > 0) ?? [];
}

export function KapitelWaermeabgabe({ b }: { b: BerichtDaten }) {
  const e = b.ergebnis;
  const wab = e.waermeabgabe;
  const raeume = raeumeMitHeizflaechen(b);
  if (!wab || !raeume.length) return null;
  const g = wab.gebaeude;
  const vlMax = b.daten.hk.auslegung.vlSuchbereichC[1] ?? 90;
  const hfState = (raumId: string, id: string) => b.state.waermeabgabe.raeume[raumId]?.heizflaechen.find((x) => x.id === id);
  let mitStandard = false;
  const zeilenHf = raeume.flatMap((r) =>
    r.heizflaechen.map((hf, i) => {
      const st = hfState(r.id, hf.id);
      const m = st ? masse(b, st, hf) : { text: '—', standard: false };
      if (m.standard) mitStandard = true;
      return (
        <tr key={`${r.id}-${hf.id}`} data-testid={`bericht-hf-${hf.id}`}>
          <td>{i === 0 ? r.name : ''}</td>
          <td>
            {hf.bauartLabel}
            {st?.bezeichnung && <span class="bericht__zelle-notiz">{st.bezeichnung}</span>}
          </td>
          <td>{m.text}</td>
          <td>
            {STUFE_TEXT[hf.stufe]}
            {hf.qN?.unsicherheit ? <span class="bericht__zelle-notiz">±{fmt(hf.qN.unsicherheit, 0)} %</span> : null}
          </td>
          <td class="zahl">
            {zahl(hf.qN?.wert, 'W')}
            <span class="bericht__zelle-notiz">
              {hf.bezug.tVL}/{hf.bezug.tRL}/{hf.bezug.tInt} °C{hf.fm.wert < 0.999 ? `, f_m ${fmt(hf.fm.wert, 2)}` : ''}
            </span>
          </td>
          <td class="zahl">
            {zahl(hf.qZiel?.wert, 'W')}
            <span class="bericht__zelle-notiz">
              {fmt(hf.vlZiel.wert, 0)}/{fmt(hf.vlZiel.wert - hf.spreizung.wert, 0)} °C
            </span>
          </td>
        </tr>
      );
    }),
  );
  const massnahmen = raeume.filter((r) => !r.ausgeklammert && r.ampel !== 'gruen' && r.massnahmen.length > 0);
  return (
    <>
      <p class="bericht__absatz">
        Je Raum: Normleistung Q<sub>N</sub> der Heizflächen (EN 442 bei 75/65/20 °C, Flächenheizung 35/28/20 °C), Leistung beim Ziel-Vorlauf {zahl(g.zielVL.wert, '°C')} mit logarithmischer Übertemperatur und Exponent n je Bauart, Deckung = Σ Q / Φ<sub>HL</sub>, nötiger Vorlauf θ<sub>VL,req</sub> je Raum (Bisektion bei der Spreizung des Heizkreises, ohne Aufheizreserve). Der höchste Wert der beheizten Räume ist der Auslegungs-Vorlauf.
      </p>
      <div class="bericht__fazit" data-ampel={g.ampel} data-testid="bericht-wa-fazit">
        <div class="bericht__fazit-kopf">
          <span>Auslegungs-Vorlauf</span>
          <strong data-testid="bericht-wa-vl">{zahl(e.auslegungsVL.wert, '°C', 1)}</strong>
        </div>
        <HerkunftNotiz wert={e.auslegungsVL} />
        <p class="bericht__fazit-urteil" data-testid="bericht-wa-urteil">
          {g.urteil}
        </p>
        <Skala skala={e.skalen.vorlauf} testid="bericht-wa-skala" />
        <p class="bericht__notiz-absatz">
          {g.raeumeRot === 0 ? `Alle ${g.raeumeBewertet} bewerteten Räume bei ${fmt(g.zielVL.wert, 0)} °C gedeckt.` : `${g.raeumeRot} von ${g.raeumeBewertet} bewerteten Räumen: Heizfläche zu klein bei ${fmt(g.zielVL.wert, 0)} °C.`}
          {g.kritischeRaeume.length > 0 && ` Höchster Bedarf: ${g.kritischeRaeume.map((r) => `${r.name} ${r.tVLReq === null ? `> ${fmt(vlMax, 0)}` : fmt(r.tVLReq, 0)} °C`).join(', ')}.`}
          {g.ausgeklammert.length > 0 && ` Ausgeklammert: ${g.ausgeklammert.map((r) => (r.grund ? `${r.name} (${r.grund})` : r.name)).join(', ')}.`}
        </p>
      </div>
      <Unterkapitel titel="Räume" testid="bericht-wa-raeume">
        <Tabelle kopf={['Raum', 'θ_int', 'Φ_HL', 'Σ Q bei Ziel-VL', 'Deckung', 'θ_VL,req', 'Beurteilung']} zahlSpalten={[1, 2, 3, 4, 5]}>
          {raeume.map((r) => {
            const u = beurteilung(r);
            return (
              <tr key={r.id} data-testid={`bericht-wa-raum-${r.id}`}>
                <td>{r.name}</td>
                <td class="zahl">{zahl(r.thetaInt.wert, '°C', 1)}</td>
                <td class="zahl">
                  {zahl(r.phiHL?.wert, 'W')}
                  {r.phiHL && <HerkunftNotiz wert={r.phiHL} />}
                </td>
                <td class="zahl">{zahl(r.qZiel?.wert, 'W')}</td>
                <td class="zahl">{r.deckung ? `${fmt(r.deckung.wert * 100, 0)} %` : '—'}</td>
                <td class="zahl" data-testid={`bericht-wa-raum-${r.id}-vl`}>
                  {vlReqText(r, vlMax)}
                </td>
                <td>
                  <AmpelMarke ampel={u.ampel} text={u.text} />
                </td>
              </tr>
            );
          })}
        </Tabelle>
      </Unterkapitel>
      <Unterkapitel titel="Heizflächen" testid="bericht-wa-heizflaechen">
        <Tabelle kopf={['Raum', 'Bauart', 'Masse', 'Herkunft Q_N', 'Q_N', 'Q bei Ziel-VL']} zahlSpalten={[4, 5]}>
          {zeilenHf}
        </Tabelle>
        {mitStandard && <p class="bericht__fussnote">* Standardwert des Rechenkerns (Mass nicht angegeben).</p>}
      </Unterkapitel>
      {massnahmen.length > 0 && (
        <Unterkapitel titel="Massnahmen" testid="bericht-wa-massnahmen">
          <ul class="bericht__liste">
            {massnahmen.map((r) => (
              <li key={r.id} data-testid={`bericht-wa-massnahmen-${r.id}`}>
                <strong>{r.name}</strong> (θ<sub>VL,req</sub> {vlReqText(r, vlMax)}):
                <ul class="bericht__liste bericht__liste--innen">
                  {r.massnahmen.map((m, i) => (
                    <li key={i}>{m.text}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Unterkapitel>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Speicher & Hydraulik                                                                            */
/* ---------------------------------------------------------------------------------------------- */

export function KapitelSpeicher({ b }: { b: BerichtDaten }) {
  const { state: s, ergebnis: e } = b;
  const ww = e.speicher.ww;
  const pu = e.speicher.puffer;
  const m = e.speicher.mag;
  const sv = e.speicher.sicherheitsventil;
  const abgewaehlt = s.speicher.puffer.aktiv === false;
  return (
    <>
      {ww && (
        <Unterkapitel titel="Warmwasserspeicher" testid="bericht-speicher-ww-block">
          <Rechenschritt titel="Volumen ohne Schichtung" wert={ww.volumenRoh} text={zahl(ww.volumenRoh.wert, 'l')} />
          <Rechenschritt titel="Schichtungsfaktor" wert={ww.fSto} text={fmt(ww.fSto.wert, 2)} />
          <Rechenschritt titel="Volumen" wert={ww.volumen} text={zahl(ww.volumen.wert, 'l')} />
          <Rechenschritt titel="Spitzendeckung (min.)" wert={ww.spitzendeckung} text={zahl(ww.spitzendeckung?.wert, 'l')} />
          <Rechenschritt titel="Speicher" wert={ww.volumenEffektiv} text={zahl(ww.volumenEffektiv.wert, 'l')} akzent />
        </Unterkapitel>
      )}
      <Unterkapitel titel="Pufferspeicher" testid="bericht-puffer-block">
        {!abgewaehlt && pu && pu.kriterien.length > 0 && (
          <Tabelle kopf={['Kriterium', 'Volumen']} zahlSpalten={[1]}>
            {pu.kriterien.map((k) => (
              <tr key={k.key}>
                <td>
                  {k.label}
                  {k.key === pu.massgebend && <span class="bericht__zelle-notiz">massgebend</span>}
                </td>
                <td class="zahl">{zahl(k.liter.wert, 'l')}</td>
              </tr>
            ))}
          </Tabelle>
        )}
        <KvTabelle zeilen={[{ label: 'Puffer', wert: zahl(e.speicher.pufferEffektiv.wert, 'l'), herkunft: e.speicher.pufferEffektiv, notiz: abgewaehlt ? berichtText(e.speicher.pufferEffektiv.begruendung) : pu ? berichtText(pu.begruendung) : undefined, testid: 'bericht-puffer-effektiv' }]} />
      </Unterkapitel>
      {m && (
        <Unterkapitel titel="Ausdehnungsgefäss und Sicherheitsventil (DIN EN 12828)" testid="bericht-mag">
          <Rechenschritt titel="Anlagenvolumen" wert={m.anlagenvolumen} text={zahl(m.anlagenvolumen.wert, 'l')} />
          <Rechenschritt titel="Ausdehnung n" wert={m.n} text={zahl(m.n.wert, '%', 2)} />
          <Rechenschritt titel={<>Vordruck p<sub>0</sub></>} wert={m.p0} text={zahl(m.p0.wert, 'bar', 1)} />
          <Rechenschritt titel={<>Enddruck p<sub>e</sub></>} wert={m.pe} text={zahl(m.pe.wert, 'bar', 1)} />
          <Rechenschritt titel="Mindest-Nennvolumen" wert={m.vn} text={zahl(m.vn.wert, 'l', 1)} />
          <Rechenschritt titel="Ausdehnungsgefäss" wert={m.vnMarkt} text={zahl(m.vnMarkt.wert, 'l')} akzent />
          {sv && (
            <KvTabelle zeilen={[{ label: 'Sicherheitsventil', wert: `${sv.dn}, ${fmt(sv.ansprechdruckBar, 1)} bar`, notiz: `${sv.anschluss}, Ausblaseleitung ${sv.ausblaseleitung}. ${sv.begruendung}` }]} />
          )}
        </Unterkapitel>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Wärmepumpe                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

export function KapitelWaermepumpe({ b }: { b: BerichtDaten }) {
  const e = b.ergebnis;
  const ge = e.geraet;
  const g = ge.gewaehlt;
  if (!g) return null;
  const bv = g.bivalenz;
  const mod = g.modulation;
  const eigeneFilterVl = b.state.geraet.filterOverrides.vorlaufC !== undefined;
  const zeilen: (KvZeile | null | false)[] = [
    { label: 'Gerät', wert: g.bezeichnung, testid: 'bericht-wp-geraet' },
    { label: 'Wärmequelle', wert: WP_QUELLE[ge.quelle] },
    { label: 'Heizleistung laut Datenbank', wert: kW(g.qWp.wert), notiz: berichtText(g.qWp.begruendung) },
    g.qWpMassgebend !== g.qWp && { label: 'Heizleistung am Auslegungspunkt', wert: kW(g.qWpMassgebend.wert), herkunft: g.qWpMassgebend, notiz: berichtText(g.qWpMassgebend.begruendung) },
    g.vorlaufMax && { label: 'Vorlauf max.', wert: zahl(g.vorlaufMax.wert, '°C') },
    ge.filterVorlauf && { label: 'Vorlauf für die Geräteauswahl', wert: zahl(ge.filterVorlauf.wert, '°C', 1), notiz: eigeneFilterVl ? 'eigene Angabe' : filterVorlaufHerkunft(e) },
    { label: <>Grösse gegenüber Q<sub>h</sub></>, wert: `${g.dimensionierung.uebergroesse.wert > 0 ? '+' : ''}${fmt(g.dimensionierung.uebergroesse.wert, 0)} %`, notiz: g.dimensionierung.text },
    { label: <>Leistungsanteil an Q<sub>h</sub></>, wert: `${fmt(bv.leistungsanteil.wert * 100, 0)} %` },
    { label: 'Energieanteil der Wärmepumpe (Bivalenz)', wert: bv.energieanteil ? (bv.monovalent ? '100 % (monovalent)' : bv.energieanteil.band ? `${fmt(bv.energieanteil.band[0] * 100, 0)}–${fmt(bv.energieanteil.band[1] * 100, 0)} %` : `${fmt(bv.energieanteil.wert * 100, 0)} %`) : '—', notiz: bv.text },
    g.mindestPuffer && { label: 'Mindest-Puffer laut Hersteller', wert: zahl(g.mindestPuffer.wert, 'l') },
    mod && { label: 'Modulation', wert: `${kW(mod.minW.wert, 1)} – ${kW(mod.maxW.wert, 1)}`, notiz: mod.anteilMinAnQh ? `untere Grenze ${fmt(mod.anteilMinAnQh.wert * 100, 0)} % von Q_h` : undefined },
  ];
  return (
    <>
      <KvTabelle zeilen={zeilen} testid="bericht-wp-tabelle" />
      <div class="bericht__skala">
        <Skala skala={e.skalen.wpGroesse} text={g.dimensionierung.text} testid="bericht-skala-wp" />
      </div>
    </>
  );
}
