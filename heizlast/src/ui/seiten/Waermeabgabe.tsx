import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { ErgebnisHinweis } from '../../kern/berechne';
import type { Bauart, HeizflaecheEingabe, HeizflaecheErgebnis, MassFeld, RaumWaermeabgabe } from '../../kern/waermeabgabe';
import { BAUARTEN, kategorieVon } from '../../kern/waermeabgabe';
import { fmt } from '../../kern/wert';
import type { Wert } from '../../kern/wert';
import type { RaumState } from '../../state/schema';
import { geheZu } from '../../state/ui';
import { daten, rel, setze, store } from '../bindung';
import { Ampel } from '../komponenten/Ampel';
import type { Option } from '../komponenten/Felder';
import { Abschnitt, AuswahlFeld, Raster, SegmentFeld, TextFeld, ZahlFeld } from '../komponenten/Felder';
import { HerkunftChip, WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { Info } from '../komponenten/Popover';
import { Skala } from '../komponenten/Skala';
import { zahl } from '../format';

const HK = daten.hk;
const bauartLabel = (b: string) => HK.bauarten.find((x) => x.key === b)?.label ?? b;
/** Bauarten in Gruppen für die Auswahl (Reihenfolge der Bauart-Liste im Kern). */
const GRUPPEN: ReadonlyArray<[string, ReadonlyArray<Bauart>]> = [
  ['Plattenheizkörper', BAUARTEN.filter((b) => b.startsWith('platte_'))],
  ['Radiatoren (Glieder, Röhren)', BAUARTEN.filter((b) => ['glieder', 'roehren'].includes(kategorieVon(b, HK)))],
  ['Konvektoren', BAUARTEN.filter((b) => kategorieVon(b, HK) === 'konvektor')],
  ['Bad und Design', BAUARTEN.filter((b) => ['bad', 'vertikal'].includes(kategorieVon(b, HK)))],
  ['Flächenheizung', BAUARTEN.filter((b) => kategorieVon(b, HK) === 'flaeche')],
];
const RAUMTYPEN = daten.sia.innentemperaturen.raumtypen.map((r) => ({ wert: r.key, label: `${r.label} (${r.thetaIntC} °C)` }));
const BELAEGE: ReadonlyArray<Option<string>> = [
  { wert: 'keramik', label: 'Keramik/Stein' },
  { wert: 'pvc_linoleum', label: 'PVC/Linoleum' },
  { wert: 'parkett', label: 'Parkett' },
  { wert: 'laminat', label: 'Laminat' },
  { wert: 'teppich', label: 'Teppich' },
  { wert: 'teppichDick', label: 'Teppich dick' },
];
const BEZUEGE: ReadonlyArray<{ key: string; label: string; t: [number, number, number] }> = [
  { key: '75/65/20', label: '75/65/20 (EN 442)', t: [75, 65, 20] },
  { key: '90/70/20', label: '90/70/20 (ältere Kataloge)', t: [90, 70, 20] },
  { key: '70/55/20', label: '70/55/20', t: [70, 55, 20] },
  { key: '55/45/20', label: '55/45/20', t: [55, 45, 20] },
];
const DECKUNG = HK.ampel.deckung;
const DECKUNG_LEGENDE = [
  { ampel: 'gruen' as const, text: `deckt ≥ ${fmt(DECKUNG.gruenAb * 100, 0)} % der Raumheizlast beim Ziel-Vorlauf` },
  { ampel: 'gelb' as const, text: `deckt ${fmt(DECKUNG.gelbAb * 100, 0)}–${fmt(DECKUNG.gruenAb * 100, 0)} % — knapp` },
  { ampel: 'rot' as const, text: `deckt < ${fmt(DECKUNG.gelbAb * 100, 0)} % — Heizfläche zu klein für den Ziel-Vorlauf` },
];

/** Hinweise des Schritts Wärmeabgabe zu einem Pfad (Kern meldet Heizflächen unter `waermeabgabe.heizflaechen.<id>`). */
function hinweiseWa(pfad: string): ErgebnisHinweis[] {
  return store.ergebnis.value.hinweise.filter((h) => h.schritt === 'waermeabgabe' && h.pfad === pfad);
}
function HinweisListe({ hs, testid }: { hs: ReadonlyArray<ErgebnisHinweis>; testid?: string }) {
  if (!hs.length) return null;
  return (
    <ul class="feld__hinweise" data-testid={testid}>
      {hs.map((h) => (
        <li class={`feld__hinweis feld__hinweis--${h.stufe}`} key={h.code + h.text}>
          {h.text}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Heizfläche                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

/** Felder je Kategorie in Erfassungsreihenfolge; angezeigt wird nur, was `rel()` (relevanteMasse) erlaubt. */
const FELDREIHE: ReadonlyArray<MassFeld> = ['hoeheMm', 'nabenabstandMm', 'glieder', 'laengeMm', 'tiefeMm', 'gliedbreiteMm', 'designTyp', 'einbau', 'flaecheM2', 'verlegeabstandMm', 'belag', 'rlb', 'system'];

function massLabel(feld: MassFeld, kat: string): { label: string; info?: string | undefined } {
  switch (feld) {
    case 'hoeheMm':
      return { label: kat === 'bad' ? 'Höhe' : 'Bauhöhe', info: kat === 'glieder' ? 'Gesamthöhe des Radiators; wird auf die nächste DIN-4703-Stufe eingerastet (±30 mm). Alternativ Nabenabstand angeben.' : undefined };
    case 'laengeMm':
      return kat === 'glieder' || kat === 'roehren' ? { label: 'Baulänge', info: 'Nur nötig, wenn die Gliederzahl unbekannt ist — daraus wird sie geschätzt.' } : { label: kat === 'bad' || kat === 'vertikal' ? 'Breite' : 'Baulänge' };
    case 'tiefeMm':
      return kat === 'platte' ? { label: 'Bautiefe (optional)', info: 'Nur zur Kontrolle, ob der Typ passt (z. B. Typ 22 ≈ 100 mm). Gerechnet wird mit Typ, Höhe und Länge.' } : kat === 'roehren' ? { label: 'Bautiefe (optional)', info: 'Kontrolle der Säulenzahl.' } : { label: 'Bautiefe' };
    case 'nabenabstandMm':
      return { label: 'Nabenabstand', info: 'Abstand der Anschlüsse (Mitte–Mitte). Statt der Bauhöhe, wenn bekannt.' };
    case 'glieder':
      return { label: 'Gliederzahl' };
    case 'gliedbreiteMm':
      return { label: 'Gliedbreite' };
    case 'flaecheM2':
      return { label: 'Belegte Fläche', info: 'Fläche mit verlegten Heizrohren (ohne Randzonen unter festen Einbauten).' };
    case 'verlegeabstandMm':
      return { label: 'Verlegeabstand' };
    case 'rlb':
      return { label: 'Belag Rλ,B (statt Belagsart)', info: 'Wärmeleitwiderstand des Bodenbelags in m²K/W (EN 1264).' };
    default:
      return { label: feld };
  }
}

function MassFeldEingabe({ hf, feld, p, t, std, raumFlaeche }: { hf: HeizflaecheEingabe; feld: MassFeld; p: string; t: string; std: HeizflaecheErgebnis['standardwerte'] | undefined; raumFlaeche: number | undefined }) {
  const kat = kategorieVon(hf.bauart, HK);
  const { label, info } = massLabel(feld, kat);
  const pfad = `${p}.${feld}`;
  const hinweisPfad = `waermeabgabe.heizflaechen.${hf.id}.${feld}`;
  const s = std?.[feld];
  const zahlStd = s && typeof s.wert === 'number' ? (s as Wert) : undefined;
  if (feld === 'einbau') {
    return <AuswahlFeld pfad={pfad} label="Einbau" optionen={[{ wert: 'verkleidet', label: 'Wand/Bank, verkleidet' }, { wert: 'unterflur', label: 'Unterflur (Bodenkanal)' }]} standardText={s ? (s.wert === 'unterflur' ? 'Unterflur' : 'verkleidet') : undefined} testid={`${t}-einbau`} />;
  }
  if (feld === 'designTyp') {
    return <AuswahlFeld pfad={pfad} label="Bautyp" optionen={[{ wert: '20', label: 'Typ 20 (2 Platten)' }, { wert: '22', label: 'Typ 22 (2 Platten + Konvektorbleche)' }]} standardText={s ? 'Typ 22' : undefined} testid={`${t}-designtyp`} />;
  }
  if (feld === 'belag') {
    return <AuswahlFeld pfad={pfad} label="Bodenbelag" optionen={BELAEGE} leerText="— unbekannt —" testid={`${t}-belag`} />;
  }
  if (feld === 'system') {
    return <AuswahlFeld pfad={pfad} label="System" optionen={[{ wert: 'trockenbau', label: 'Trockenbau (Klimaelement)' }, { wert: 'nassputz', label: 'Nassputz (Klimaregister)' }]} standardText={`unbekannt (${fmt(HK.wandheizung.fallbackQ3528Wm2, 0)} W/m² bei 35/28)`} testid={`${t}-system`} />;
  }
  const einheit = feld === 'flaecheM2' ? 'm²' : feld === 'glieder' ? 'Gl.' : feld === 'rlb' ? 'm²K/W' : 'mm';
  const kurz = { hoeheMm: 'hoehe', laengeMm: 'laenge', tiefeMm: 'tiefe', nabenabstandMm: 'nabenabstand', glieder: 'glieder', gliedbreiteMm: 'gliedbreite', flaecheM2: 'flaeche', verlegeabstandMm: 'va', rlb: 'rlb' }[feld as string] ?? feld;
  const grenzen: Partial<Record<MassFeld, [number, number]>> = { hoeheMm: [100, 3000], laengeMm: [100, 6000], tiefeMm: [20, 400], nabenabstandMm: [100, 2500], glieder: [1, 80], gliedbreiteMm: [20, 120], flaecheM2: [0.1, 500], verlegeabstandMm: [50, 400], rlb: [0, 0.3] };
  const [min, max] = grenzen[feld] ?? [0, 100000];
  return (
    <div class="hf__mass">
      <ZahlFeld pfad={pfad} label={label} einheit={einheit} info={info} min={min} max={max} ganz={feld === 'glieder'} dez={feld === 'rlb' ? 2 : feld === 'flaecheM2' ? 1 : 0} standard={zahlStd} testid={`${t}-${kurz}`} hinweisPfad={hinweisPfad} />
      {feld === 'flaecheM2' && raumFlaeche !== undefined && hf.flaecheM2 === undefined && (
        <button type="button" class="link-knopf" onClick={() => setze(pfad, Math.round(raumFlaeche * 10) / 10)} data-testid={`${t}-flaeche-raum`}>
          Raumfläche {fmt(raumFlaeche, 1)} m² übernehmen
        </button>
      )}
    </div>
  );
}

/** Typenschild: Leistung + Bezugstemperaturen werden als ganzes Objekt geschrieben (nie halb, Kern verlangt alle vier Werte). */
function Typenschild({ hf, p, t }: { hf: HeizflaecheEingabe; p: string; t: string }) {
  const ts = hf.typenschild;
  const bezug = ts ? `${ts.tVLC}/${ts.tRLC}/${ts.tRaumC}` : '75/65/20';
  const tBezug = BEZUEGE.find((b) => b.key === bezug)?.t ?? [75, 65, 20];
  const schreibe = (qNW: number | undefined, t3: [number, number, number]) => setze(`${p}.typenschild`, qNW && qNW > 0 ? { qNW, tVLC: t3[0], tRLC: t3[1], tRaumC: t3[2] } : undefined);
  return (
    <div class="hf__typenschild">
      <div class="feld">
        <div class="feld__kopf">
          <label class="feld__label" for={`${t}-ts-qn`}>
            Leistung laut Typenschild/Datenblatt
          </label>
          <Info text="Wird automatisch auf die Normbedingung 75/65/20 °C umgerechnet (log. Übertemperatur, Exponent n der Bauart). Hat Vorrang vor Modell und Massen." />
        </div>
        <div class="eingabe">
          <input
            id={`${t}-ts-qn`}
            class="eingabe__feld"
            type="text"
            inputMode="decimal"
            value={ts ? String(ts.qNW) : ''}
            data-testid={`${t}-ts-qn`}
            onInput={(e) => {
              const v = Number((e.currentTarget as HTMLInputElement).value.replace(/['’\s]/g, '').replace(',', '.'));
              schreibe(Number.isFinite(v) ? v : undefined, tBezug);
            }}
          />
          <span class="eingabe__einheit">W</span>
        </div>
      </div>
      <div class="feld">
        <div class="feld__kopf">
          <label class="feld__label" for={`${t}-ts-bezug`}>
            bei
          </label>
        </div>
        <div class="eingabe eingabe--auswahl">
          <select id={`${t}-ts-bezug`} class="eingabe__feld" value={bezug} disabled={!ts} data-testid={`${t}-ts-bezug`} onChange={(e) => schreibe(ts?.qNW, BEZUEGE.find((b) => b.key === (e.currentTarget as HTMLSelectElement).value)?.t ?? [75, 65, 20])}>
            {BEZUEGE.map((b) => (
              <option value={b.key} key={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <HinweisListe hs={hinweiseWa(`waermeabgabe.heizflaechen.${hf.id}.typenschild`)} />
    </div>
  );
}

function Minderungen({ hf, p, t }: { hf: HeizflaecheEingabe; p: string; t: string }) {
  const m = hf.minderungen ?? {};
  const md = HK.minderungen;
  const schalter = (feld: 'nische' | 'verkleidung' | 'oberflaeche', label: string, typ: number) => (
    <label class="kaestchen__eintrag">
      <input type="checkbox" checked={m[feld] !== undefined && m[feld] !== false} data-testid={`${t}-${feld}`} onChange={(e) => setze(`${p}.minderungen.${feld}`, (e.currentTarget as HTMLInputElement).checked ? true : undefined)} />
      {label} <span class="mute">(typ. −{fmt(typ, 0)} %)</span>
    </label>
  );
  return (
    <div class="hf__minderungen">
      <span class="feld__label">Einbausituation</span>
      <div class="kaestchen">
        {schalter('nische', 'in Nische', md.f1Nische.mProzentTyp)}
        {schalter('verkleidung', 'verkleidet', md.f2Verkleidung.mProzentTyp)}
        {schalter('oberflaeche', 'Metallic-/Bronzeanstrich', md.f3Oberflaeche.mProzentTyp)}
      </div>
      <SegmentFeld pfad={`${p}.minderungen.anschluss`} label="Anschluss" optionen={[{ wert: 'wechselseitig', label: 'normal (VL oben)' }, { wert: 'reitend', label: 'reitend (beide unten)' }]} testid={`${t}-anschluss`} />
    </div>
  );
}

function Heizflaeche({ raum, hf, nr, raumNr, erg, raumFlaeche }: { raum: RaumState; hf: HeizflaecheEingabe; nr: number; raumNr: number; erg: HeizflaecheErgebnis | undefined; raumFlaeche: number | undefined }) {
  const p = `waermeabgabe.raeume.${raum.id}.heizflaechen.${hf.id}`;
  const t = `wa-raum-${raumNr}-hf-${nr}`;
  const kreise = store.state.value.waermeabgabe.heizkreise;
  const kat = kategorieVon(hf.bauart, HK);
  const modelle = kat === 'flaeche' ? [] : HK.modelle.filter((m) => m.bauart === hf.bauart && (!hf.hoeheMm || !m.hoeheMm || Math.abs(m.hoeheMm - hf.hoeheMm) <= HK.auslegung.hoeheEinrastenToleranzMm));
  const genauerOffen = hf.bauart === 'konvektor_geblaese' || !!hf.typenschild || !!hf.modellId || !!hf.minderungen;
  return (
    <div class="hf" data-testid={t} data-hf-id={hf.id}>
      <div class="hf__kopf">
        <div class="feld hf__bauart">
          <div class="feld__kopf">
            <label class="feld__label" for={`${t}-bauart`}>
              Heizfläche {nr}
            </label>
            {erg?.qN && <HerkunftChip wert={erg.qN} testid={`${t}-herkunft`} />}
          </div>
          <div class="eingabe eingabe--auswahl">
            <select id={`${t}-bauart`} class="eingabe__feld" value={hf.bauart} data-testid={`${t}-bauart`} onChange={(e) => store.heizflaecheBauart(raum.id, hf.id, (e.currentTarget as HTMLSelectElement).value as Bauart)}>
              {GRUPPEN.map(([g, liste]) => (
                <optgroup label={g} key={g}>
                  {liste.map((b) => (
                    <option value={b} key={b}>
                      {bauartLabel(b)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <HinweisListe hs={hinweiseWa(`waermeabgabe.heizflaechen.${hf.id}.bauart`)} />
        </div>
        {rel(`${p}.kreisId`) && (
          <AuswahlFeld pfad={`${p}.kreisId`} label="Heizkreis" optionen={kreise.map((k, i) => ({ wert: k.id, label: k.bezeichnung || `Heizkreis ${i + 1}` }))} leerText="— ohne Kreis (Standardwerte) —" testid={`${t}-kreis`} />
        )}
        <button type="button" class="link-knopf link-knopf--gefahr hf__weg" onClick={() => setze(p, undefined)} data-testid={`${t}-entfernen`} aria-label={`Heizfläche ${nr} entfernen`}>
          Entfernen
        </button>
      </div>
      <div class="raster raster--3 hf__masse">
        {FELDREIHE.filter((f) => rel(`${p}.${f}`)).map((f) => (
          <MassFeldEingabe hf={hf} feld={f} p={p} t={t} std={erg?.standardwerte} raumFlaeche={raumFlaeche} key={f} />
        ))}
      </div>
      <details class="genauer" open={genauerOffen} data-testid={`${t}-genauer`}>
        <summary>Genauer: Modell, Typenschild, Einbau</summary>
        <div class="hf__genauer">
          <TextFeld pfad={`${p}.bezeichnung`} label="Bezeichnung" platzhalter="z. B. unter Fenster Süd" testid={`${t}-bezeichnung`} />
          {kat !== 'flaeche' && <Typenschild hf={hf} p={p} t={t} />}
          {modelle.length > 0 && (
            <AuswahlFeld pfad={`${p}.modellId`} label="Marke/Modell (Datenblatt)" optionen={modelle.map((m) => ({ wert: m.id, label: `${m.hersteller} ${m.modellreihe}${m.hoeheMm ? ` H ${m.hoeheMm}` : ''}` }))} leerText="— unbekannt (aus Bauart und Massen) —" testid={`${t}-modell`} />
          )}
          {kat !== 'flaeche' && <Minderungen hf={hf} p={p} t={t} />}
        </div>
      </details>
      <div class="hf__ergebnis">
        <span>
          <span class="mute">Q<sub>N</sub> {erg?.bezug.tVL === 35 ? '35/28/20' : '75/65/20'}</span>{' '}
          <WertAnzeige wert={erg?.qN} text={zahl(erg?.qN?.wert, 'W')} testid={`${t}-qn`} />
        </span>
        <span>
          <span class="mute">Q bei {erg ? `${fmt(erg.vlZiel.wert, 0)}/${fmt(erg.vlZiel.wert - erg.spreizung.wert, 0)} °C` : 'Ziel-VL'}</span>{' '}
          <WertAnzeige wert={erg?.qZiel} text={zahl(erg?.qZiel?.wert, 'W')} testid={`${t}-qziel`} />
        </span>
        {erg && erg.fm.wert < 0.999 && (
          <span>
            <span class="mute">Minderung f<sub>m</sub></span> <WertAnzeige wert={erg.fm} text={fmt(erg.fm.wert, 2)} />
          </span>
        )}
      </div>
      <HinweisListe hs={hinweiseWa(`waermeabgabe.heizflaechen.${hf.id}`)} testid={`${t}-hinweise`} />
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Raum                                                                                            */
/* ---------------------------------------------------------------------------------------------- */

function LiveZeile({ wr, t }: { wr: RaumWaermeabgabe | undefined; t: string }) {
  if (!wr || !wr.heizflaechen.length) return null;
  const d = wr.deckung;
  const ampelText = wr.ausgeklammert
    ? 'ausgeklammert — zählt nicht für die Auslegungs-VL'
    : !wr.phiHL
      ? 'keine Raumheizlast — nicht beurteilbar'
      : d
        ? `Deckung ${fmt(d.wert * 100, 0)} % bei ${fmt(wr.vlZiel.wert, 0)} °C`
        : wr.qZiel
          ? 'Raumheizlast ≤ 0 W'
          : 'Masse fehlen — nicht beurteilbar';
  return (
    <div class="wa-live" data-testid={`${t}-live`}>
      <dl class="wa-live__werte">
        <div>
          <dt>Φ<sub>HL</sub></dt>
          <dd><WertAnzeige wert={wr.phiHL} text={zahl(wr.phiHL?.wert, 'W')} testid={`${t}-live-phihl`} /></dd>
        </div>
        <div>
          <dt>Σ Q bei {fmt(wr.vlZiel.wert, 0)} °C</dt>
          <dd><WertAnzeige wert={wr.qZiel} text={zahl(wr.qZiel?.wert, 'W')} testid={`${t}-qsumme`} /></dd>
        </div>
        <div>
          <dt>Deckung</dt>
          <dd data-testid={`${t}-deckung`}>{d ? `${fmt(d.wert * 100, 0)} %` : '—'}</dd>
        </div>
        <div>
          <dt>nötiger Vorlauf θ<sub>VL,req</sub></dt>
          <dd class="wa-live__vl">
            {wr.tVLReq ? <WertAnzeige wert={wr.tVLReq} text={zahl(wr.tVLReq.wert, '°C', 1)} testid={`${t}-tvlreq`} /> : <span data-testid={`${t}-tvlreq`}>{wr.phiHL && wr.qZiel && !wr.erreichbar ? `> ${fmt(HK.auslegung.vlSuchbereichC[1] ?? 90, 0)} °C` : '—'}</span>}
          </dd>
        </div>
      </dl>
      <Ampel ampel={wr.ausgeklammert ? 'grau' : wr.ampel} text={ampelText} legende={DECKUNG_LEGENDE} testid={`${t}-ampel`} />
      {wr.massnahmen.length > 0 && !wr.ausgeklammert && (
        <details class="genauer wa-massnahmen" open={wr.ampel === 'rot'} data-testid={`${t}-massnahmen`}>
          <summary>Massnahmen ({wr.massnahmen.length})</summary>
          <ul class="wa-massnahmen__liste">
            {wr.massnahmen.map((m, i) => (
              <li key={i} data-art={m.art}>
                {m.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function RaumKarte({ raum, nr }: { raum: RaumState; nr: number }) {
  const s = store.state.value;
  const e = store.ergebnis.value;
  const fwsModus = s.methode === 'fws';
  const st = s.waermeabgabe.raeume[raum.id];
  const hfs = st?.heizflaechen ?? [];
  const wr = e.waermeabgabe?.raeume.find((r) => r.id === raum.id);
  const rw = e.heizlast.raumweise?.raeume.find((r) => r.id === raum.id);
  const flaeche = rw?.flaeche.wert ?? raum.flaecheM2;
  const t = `wa-raum-${nr}`;
  const pR = `raeume.${raum.id}`;
  const pW = `waermeabgabe.raeume.${raum.id}`;
  return (
    <article class="raum wa-raum" data-testid={t} data-raum-id={raum.id} data-ampel={wr?.ampel}>
      <header class="raum__kopf">
        <span class="liste__nr">{nr}</span>
        {fwsModus ? <TextFeld pfad={`${pR}.name`} label="Raum" testid={`${t}-name`} /> : <strong class="wa-raum__name">{raum.name || `Raum ${nr}`}</strong>}
        <div class="raum__last">
          <span class="mute">θ<sub>VL,req</sub></span>
          <span class={`wa-raum__vl wa-raum__vl--${wr?.ausgeklammert ? 'grau' : (wr?.ampel ?? 'grau')}`} data-testid={`${t}-kopf-vl`}>
            {wr?.tVLReq ? zahl(wr.tVLReq.wert, '°C', 0) : wr?.heizflaechen.length && wr.phiHL && wr.qZiel && !wr.erreichbar ? '> 90 °C' : '—'}
          </span>
        </div>
      </header>
      {fwsModus ? (
        <Raster spalten={3}>
          <AuswahlFeld pfad={`${pR}.typ`} label="Raumtyp" optionen={RAUMTYPEN} testid={`${t}-typ`} beiWahl={(w) => w && setze(`${pR}.typ`, w)} />
          <ZahlFeld pfad={`${pR}.flaecheM2`} label="Nettofläche" einheit="m²" min={0.1} max={5000} dez={1} testid={`${t}-flaeche`} />
          <ZahlFeld pfad={`${pW}.phiHLManuellW`} label={<>Raumheizlast Φ<sub>HL</sub></>} einheit="W" min={0} max={100000} dez={0} standard={wr?.phiHL ?? undefined} testid={`${t}-phihl`} info="Ohne eigene Angabe: Gebäude-Heizlast nach Fläche verteilt (Q_hl / EBF × 1.10 × Raumfläche, ±25 %). Aussenräume und Bäder brauchen eher mehr. Eine raumweise Berechnung ist genauer." zuruecksetzenText="Verteilung verwenden" />
        </Raster>
      ) : (
        <p class="zeile-info" data-testid={`${t}-info`}>
          {rw ? `${zahl(rw.flaeche.wert, 'm²', 1)} · θint ${zahl(rw.thetaInt.wert, '°C', 0)} · Raumheizlast ${zahl(rw.phiHL.wert, 'W')} (raumweise, Schritt 3)` : 'Raum aus Schritt 3'}
        </p>
      )}
      {fwsModus && rel(`${pR}.thetaIntC`) && wr && (
        <details class="genauer">
          <summary>Raumtemperatur</summary>
          <Raster>
            <ZahlFeld pfad={`${pR}.thetaIntC`} label={<>Raumtemperatur θ<sub>int</sub></>} einheit="°C" min={5} max={30} dez={1} standard={wr.thetaInt} testid={`${t}-thetaint`} />
          </Raster>
        </details>
      )}

      <div class="hf-liste">
        {hfs.map((hf, i) => (
          <Heizflaeche raum={raum} hf={hf} nr={i + 1} raumNr={nr} erg={wr?.heizflaechen.find((x) => x.id === hf.id)} raumFlaeche={flaeche} key={hf.id} />
        ))}
      </div>
      <NeueHeizflaeche raumId={raum.id} t={t} leer={hfs.length === 0} />

      <LiveZeile wr={wr} t={t} />
      <HinweisListe hs={hinweiseWa(`raeume.${raum.id}`)} testid={`${t}-hinweise`} />

      <div class="wa-raum__fuss">
        <label class="kaestchen__eintrag">
          <input type="checkbox" checked={!!st?.ausklammern} data-testid={`${t}-ausklammern`} onChange={(ev) => setze(`${pW}.ausklammern`, (ev.currentTarget as HTMLInputElement).checked ? true : undefined)} />
          Für die Auslegungs-VL ausklammern (wird saniert, elektrisch beheizt …)
        </label>
        {rel(`${pW}.ausklammernGrund`) && <TextFeld pfad={`${pW}.ausklammernGrund`} label="Grund" platzhalter="z. B. Heizkörper wird ersetzt" testid={`${t}-grund`} />}
        {fwsModus && (
          <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => store.raumEntfernen(raum.id)} data-testid={`${t}-entfernen`}>
            Raum entfernen
          </button>
        )}
      </div>
    </article>
  );
}

/** «+ Heizfläche»: Bauart wählen, dann anlegen (Masse folgen der Bauart). */
function NeueHeizflaeche({ raumId, t, leer }: { raumId: string; t: string; leer: boolean }) {
  const id = `${t}-hf-neu-bauart`;
  const [bauart, setBauart] = useState<Bauart>('platte_22');
  return (
    <div class="hinzufuegen">
      <label class="visually-hidden" for={id}>
        Bauart der neuen Heizfläche
      </label>
      <select id={id} class="eingabe__feld eingabe__feld--klein" data-testid={`${t}-hf-bauart`} value={bauart} onChange={(e) => setBauart((e.currentTarget as HTMLSelectElement).value as Bauart)}>
        {GRUPPEN.map(([g, liste]) => (
          <optgroup label={g} key={g}>
            {liste.map((b) => (
              <option value={b} key={b}>
                {bauartLabel(b)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <button
        type="button"
        class="btn btn--klein"
        data-testid={`${t}-hf-neu`}
        onClick={() => store.heizflaecheHinzufuegen(raumId, bauart)}
      >
        + Heizfläche
      </button>
      {leer && <span class="zeile-info zeile-info--klein">Bauart wählen; Masse folgen der Bauart.</span>}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Gebäude, Heizkreise                                                                             */
/* ---------------------------------------------------------------------------------------------- */

function GebaeudeBox() {
  const e = store.ergebnis.value;
  const wab = e.waermeabgabe;
  const g = wab?.gebaeude;
  const vl = e.auslegungsVL;
  const ausHf = g?.auslegungsVLAusHeizflaechen;
  const standardOverride = ausHf ?? (vl.herkunft === 'override' ? undefined : vl);
  return (
    <section class="leistung wa-gebaeude" data-testid="wa-gebaeude" data-ampel={g?.ampel ?? 'grau'}>
      <div class="leistung__kopf">
        <span class="leistung__titel">Auslegungs-Vorlauf</span>
        <span class="mute">die eine Vorlauftemperatur für Gerätefilter, Speicher und Bericht</span>
      </div>
      <div class="leistung__zahl">
        <WertAnzeige wert={vl} text={zahl(vl.wert, '°C', 1)} gross testid="wa-auslegungsvl" immerChip />
      </div>
      <Skala skala={e.skalen.vorlauf} testid="wa-skala" />
      <p class="wa-gebaeude__urteil" data-testid="wa-urteil">
        {g ? g.urteil : 'Noch keine Heizflächen bewertet — gerechnet wird mit dem Standardwert des Wärmeabgabesystems.'}
      </p>
      {g && g.raeumeBewertet > 0 && (
        <dl class="leistung__fakten">
          <div>
            <dt>Räume bewertet</dt>
            <dd data-testid="wa-bewertet">{g.raeumeBewertet}</dd>
          </div>
          <div>
            <dt>Heizfläche zu klein bei {fmt(g.zielVL.wert, 0)} °C</dt>
            <dd data-testid="wa-rot">{g.raeumeRot}</dd>
          </div>
          {g.kritischeRaeume.length > 0 && (
            <div class="wa-gebaeude__kritisch">
              <dt>Höchster Bedarf</dt>
              <dd data-testid="wa-kritisch">{g.kritischeRaeume.map((r) => `${r.name} ${r.tVLReq === null ? '> 90' : fmt(r.tVLReq, 0)} °C`).join(' · ')}</dd>
            </div>
          )}
          {g.ausgeklammert.length > 0 && (
            <div>
              <dt>Ausgeklammert</dt>
              <dd data-testid="wa-ausgeklammert">{g.ausgeklammert.map((r) => (r.grund ? `${r.name} (${r.grund})` : r.name)).join(', ')}</dd>
            </div>
          )}
        </dl>
      )}
      <details class="genauer">
        <summary>Auslegungs-Vorlauf selbst festlegen</summary>
        <Raster>
          <ZahlFeld pfad="waermeabgabe.auslegungsVLOverrideC" label="Auslegungs-Vorlauf" einheit="°C" min={25} max={90} dez={0} standard={standardOverride} testid="wa-override" hinweisPfad="waermeabgabe.auslegungsVLOverrideC.box" zuruecksetzenText="Aus Heizflächen verwenden" info="Überschreibt den Wert aus den Heizflächen für Gerätefilter, MAG und Bericht. Liegt er unter dem Bedarf, werden Räume nicht warm (Warnung)." />
        </Raster>
      </details>
      <Meldungen schritt="waermeabgabe" codes={['waermeabgabe.gebaeude']} />
    </section>
  );
}

function Heizkreise() {
  const s = store.state.value;
  const e = store.ergebnis.value;
  const wab = e.waermeabgabe;
  const kreise = s.waermeabgabe.heizkreise;
  const alleHf = wab?.raeume.flatMap((r) => r.heizflaechen) ?? [];
  return (
    <Abschnitt
      titel="Heizkreise und Vorlauf"
      text="Ohne Heizkreis gelten Ziel-Vorlauf und Standard-Spreizung (Radiatoren 10 K, Flächenheizung 7 K). Heizkreise braucht es für unterschiedliche Vorläufe, z. B. Fussbodenheizung hinter Mischer."
      aktion={
        <button type="button" class="btn" onClick={() => store.heizkreisHinzufuegen({ bezeichnung: `Heizkreis ${kreise.length + 1}` })} data-testid="wa-kreis-neu">
          Heizkreis hinzufügen
        </button>
      }
      testid="wa-heizkreise"
    >
      {rel('waermeabgabe.system') && (
        <SegmentFeld
          pfad="waermeabgabe.system"
          label="Wärmeabgabe heute (solange keine Heizflächen erfasst sind)"
          optionen={[{ wert: 'radiatoren', label: 'Radiatoren' }, { wert: 'fbh', label: 'Fussbodenheizung' }, { wert: 'gemischt', label: 'gemischt' }]}
          testid="wa-system"
          info="Bestimmt den Standard-Vorlauf (Fussbodenheizung 35 °C, Radiatoren/gemischt 55 °C), das Puffer- und das MAG-Kriterium. Mit erfassten Heizflächen wird der Vorlauf daraus abgeleitet."
        />
      )}
      {rel('waermeabgabe.zielVLC') && (
        <Raster>
          <ZahlFeld pfad="waermeabgabe.zielVLC" label="Ziel-Vorlauf (Prüfung der Deckung)" einheit="°C" min={25} max={90} dez={0} standard={wab?.gebaeude.zielVL} testid="wa-zielvl" info="Bei diesem Vorlauf wird geprüft, ob jede Heizfläche ihren Raum deckt; Massnahmen zielen darauf. Standard 55 °C = Grenze «gut» für Wärmepumpen." />
        </Raster>
      )}
      {kreise.length > 0 && (
        <div class="liste">
          {kreise.map((k, i) => {
            const p = `waermeabgabe.heizkreise.${k.id}`;
            const t = `wa-kreis-${i + 1}`;
            const imKreis = alleHf.filter((x) => x.kreisId === k.id);
            const spreizStd = imKreis.find((x) => x.spreizung.herkunft !== 'eingabe')?.spreizung;
            return (
              <div class="liste__eintrag" key={k.id} data-testid={t}>
                <div class="liste__kopf">
                  <span class="liste__nr">{i + 1}</span>
                  <span class="zeile-info">{imKreis.length === 1 ? '1 Heizfläche' : `${imKreis.length} Heizflächen`}</span>
                  <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => store.heizkreisEntfernen(k.id)} data-testid={`${t}-entfernen`}>
                    Entfernen
                  </button>
                </div>
                <div class="raster raster--4">
                  <TextFeld pfad={`${p}.bezeichnung`} label="Bezeichnung" testid={`${t}-bezeichnung`} />
                  <ZahlFeld pfad={`${p}.tVLC`} label="Vorlauf" einheit="°C" min={20} max={90} dez={0} standard={wab?.gebaeude.zielVL} testid={`${t}-vl`} zuruecksetzenText="Ziel-Vorlauf verwenden" />
                  <ZahlFeld pfad={`${p}.spreizungK`} label="Spreizung" einheit="K" min={2} max={30} dez={0} standard={spreizStd} testid={`${t}-spreizung`} />
                  <SegmentFeld pfad={`${p}.gemischt`} label="Mischer" optionen={[{ wert: true, label: 'ja' }, { wert: false, label: 'nein' }]} testid={`${t}-gemischt`} info="Gemischter Kreis: der Vorlauf ist auf den Kreiswert begrenzt (z. B. Fussbodenheizung hinter Mischer)." />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {rel('waermeabgabe.heizkurveAlt') && (
        <details class="genauer" data-testid="wa-heizkurve">
          <summary>Alte Heizkurve (für Heizflächen mit unbekannten Massen)</summary>
          <p class="zeile-info">Waren die Räume mit der bisherigen Heizkurve warm, ergibt sich daraus eine Mindest-Normleistung für Heizflächen ohne Masse (Schätzung ±30 %, nötiger Vorlauf als obere Schranke).</p>
          <Raster>
            <ZahlFeld pfad="waermeabgabe.heizkurveAlt.tVLC" label="Vorlauf bisher bei Auslegung" einheit="°C" min={30} max={90} dez={0} testid="wa-heizkurve-vl" />
            <ZahlFeld pfad="waermeabgabe.heizkurveAlt.tRLC" label="Rücklauf bisher (optional)" einheit="°C" min={20} max={85} dez={0} testid="wa-heizkurve-rl" />
          </Raster>
        </details>
      )}
    </Abschnitt>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Seite                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

function RaeumeAbschnitt({ children }: { children: ComponentChildren }) {
  const s = store.state.value;
  const fwsModus = s.methode === 'fws';
  return (
    <Abschnitt
      titel="Räume und Heizflächen"
      text={
        fwsModus
          ? 'Im FWS-Modus nur für die Heizflächen: Raumheizlast aus der Gebäude-Heizlast nach Fläche verteilt (Schätzung) oder als eigene Angabe.'
          : 'Räume und Raumheizlasten aus Schritt 3 (raumweise). Je Raum die vorhandenen Heizflächen erfassen.'
      }
      aktion={
        fwsModus ? (
          <button type="button" class="btn" onClick={() => store.raumHinzufuegen()} data-testid="wa-raum-neu">
            Raum hinzufügen
          </button>
        ) : undefined
      }
      testid="wa-raeume"
    >
      {children}
    </Abschnitt>
  );
}

/** Schritt 6 — Wärmeabgabe (optional, beide Modi): Heizflächen je Raum → nötiger Vorlauf je Raum → Auslegungs-VL. */
export function Waermeabgabe() {
  const s = store.state.value;
  const fwsModus = s.methode === 'fws';
  return (
    <>
      <Fehlend schritt="waermeabgabe" />
      <GebaeudeBox />
      <Heizkreise />
      <RaeumeAbschnitt>
        {s.raeume.length === 0 ? (
          fwsModus ? (
            <p class="leerzustand" data-testid="wa-leer">
              Noch keine Räume. Für die Prüfung der Heizkörper je Raum: Raum hinzufügen, Fläche eintragen, Heizflächen erfassen. Ohne Räume gilt der Standard-Vorlauf des Systems oben.
            </p>
          ) : (
            <div class="leerzustand" data-testid="wa-leer">
              Noch keine Räume erfasst.
              <button type="button" class="btn btn--klein" onClick={() => geheZu('huelle')}>
                Zu Schritt 3: Hülle & Räume
              </button>
            </div>
          )
        ) : (
          <div class="raeume">{s.raeume.map((r, i) => <RaumKarte raum={r} nr={i + 1} key={r.id} />)}</div>
        )}
      </RaeumeAbschnitt>
      <Meldungen schritt="waermeabgabe" codes={['waermeabgabe.raumFehlt', 'waermeabgabe.verteilung']} />
    </>
  );
}
