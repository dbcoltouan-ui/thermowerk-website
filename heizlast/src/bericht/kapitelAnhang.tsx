/**
 * Bericht — Plausibilität, Annahmen & Unsicherheiten, Normen und Quellen (Session 9).
 * Annahmen kommen automatisch aus `Ergebnis.annahmen` (mit Herkunft, Unsicherheit, Spanne, Quelle);
 * Quellen aus `_meta.quellen` der Datendateien — nur die, die für dieses Projekt verwendet wurden.
 */
import { fmt } from '../kern/wert';
import type { Wert } from '../kern/wert';
import { bandText, herkunftKurz } from '../ui/komponenten/Herkunft';
import { kW } from '../ui/format';
import { SCHRITTE } from '../ui/schritte';
import type { BerichtDaten } from './kontext';
import { quelleAus } from './kontext';
import { raeumeMitHeizflaechen } from './kapitelAnlage';
import { AmpelMarke, bandDezimalen, berichtText, Tabelle, Unterkapitel } from './teile';

const AMPEL_TEXT = { gruen: 'im Bereich', gelb: 'prüfen', rot: 'ausserhalb', grau: '—' } as const;

export function plausiVorhanden(b: BerichtDaten): boolean {
  return !!(b.ergebnis.plausi.spezifisch || b.ergebnis.heizlast.gegenprobe);
}

export function KapitelPlausi({ b }: { b: BerichtDaten }) {
  const sp = b.ergebnis.plausi.spezifisch;
  const gp = b.ergebnis.heizlast.gegenprobe;
  return (
    <>
      {sp && (
        <p class="bericht__absatz" data-testid="bericht-plausi-spez">
          <strong>Spezifische Heizleistung:</strong> {berichtText(sp.text)} Vergleichsbereich: {sp.bandLabel}. <AmpelMarke ampel={sp.ampel} text={AMPEL_TEXT[sp.ampel]} />
        </p>
      )}
      {gp && (
        <p class="bericht__absatz" data-testid="bericht-gegenprobe">
          <strong>Gegenprobe {gp.methode === 'raumweise' ? 'raumweise (SIA 384/2, aus den erfassten Bauteilen)' : 'Verbrauch (FWS-Kurs, aus den erfassten Rechnungen)'}:</strong> {kW(gp.wert.wert)} — {berichtText(gp.vergleich.text)} <AmpelMarke ampel={gp.vergleich.ampel} text={AMPEL_TEXT[gp.vergleich.ampel]} />
          <span class="bericht__notiz"> Erwartung: Norm-Heizlast 10–25 % über der Verbrauchs-Heizlast. Die Gegenprobe ist nicht massgebend.</span>
        </p>
      )}
    </>
  );
}

/** Lange Quellenketten (z. B. alle Datenblätter einer Tabelle) auf die ersten Angaben kürzen; vollständig im Kapitel Quellen bzw. in data/*.json. */
function quelleKurz(q: string | undefined): string {
  if (!q) return '—';
  if (q.length <= 180) return q;
  const teile = q.split(/;\s+/);
  let out = '';
  for (const s of teile) {
    if ((out ? out.length + 2 : 0) + s.length > 180) break;
    out = out ? `${out}; ${s}` : s;
  }
  return `${out || q.slice(0, 177)} u. a.`;
}

/** Herkunft ohne «± %» (steht in der eigenen Spalte). */
function herkunftOhneSpanne(w: Wert<unknown>): string {
  const { unsicherheit: _u, ...rest } = w;
  return herkunftKurz(rest);
}

function spanne(w: Wert<unknown>): string {
  const teile: string[] = [];
  if (w.unsicherheit !== undefined && w.unsicherheit > 0) teile.push(`±${fmt(w.unsicherheit, 0)} %`);
  const band = bandText(w, bandDezimalen(w));
  if (band) teile.push(band);
  return teile.join(' · ') || '—';
}

export function KapitelAnnahmen({ b }: { b: BerichtDaten }) {
  const a = b.ergebnis.annahmen;
  const gruppen = SCHRITTE.map((s) => ({ s, liste: a.filter((x) => x.schritt === s.id) })).filter((g) => g.liste.length);
  return (
    <>
      <p class="bericht__absatz">
        Alle Werte, die nicht eingegeben oder gemessen wurden, sondern aus Tabellen, Standardwerten oder Schätzungen stammen — mit Herkunft, Unsicherheit bzw. Spanne und Quelle. Insgesamt {a.length} {a.length === 1 ? 'Annahme' : 'Annahmen'}.
      </p>
      {gruppen.map(({ s, liste }) => (
        <Unterkapitel titel={`${s.nr} ${s.titel}`} key={s.id} testid={`bericht-annahmen-${s.id}`}>
          <Tabelle kopf={['Annahme', 'Herkunft', 'Unsicherheit / Spanne', 'Quelle']}>
            {liste.map((x, i) => (
              <tr key={i}>
                <td>{berichtText(x.wert.begruendung)}</td>
                <td>{herkunftOhneSpanne(x.wert)}</td>
                <td>{spanne(x.wert)}</td>
                <td class="bericht__quelle">{quelleKurz(x.wert.quelle)}</td>
              </tr>
            ))}
          </Tabelle>
        </Unterkapitel>
      ))}
    </>
  );
}

/** Verwendete Normen und Quellen (Titel aus `_meta.quellen` der Datendateien). */
export function quellenListe(b: BerichtDaten): string[] {
  const { state: s, ergebnis: e, daten: d } = b;
  const ids: [{ quellen: ReadonlyArray<{ id: string; titel: string }> }, string][] = [];
  const fws = e.methode === 'fws' ? e.heizlast.fws : null;
  if (fws) {
    ids.push([d.fws._meta, 'fws-m3']);
    if (fws.methode === 'verbrauch' && s.verbrauch.konvention === 'hi') ids.push([d.fws._meta, 'bfe-heizwerte-2014']);
    if (fws.methode === 'bauperiode') ids.push([d.fws._meta, 'schneider-2014']);
  }
  if (e.methode === 'raumweise') {
    ids.push([d.sia._meta, 'sia384-2-vorschau'], [d.sia._meta, 'sn-en-12831-1-na-c1-2020'], [d.huelle._meta, 'geak-typ'], [d.huelle._meta, 'btk-san'], [d.huelle._meta, 'sia380-1-grenzwerte']);
  }
  if (e.klima?.station) ids.push([d.klima._meta, 'sia2028-c1']);
  const hgtTabelle = fws?.traeger.some((t) => t.zeitraeume.some((z) => z.hgtIst?.herkunft === 'tabelle')) ?? false;
  if (hgtTabelle) ids.push([d.hgt._meta, 'meteoschweiz-ogd-smn'], [d.hgt._meta, 'meteoschweiz-hgt']);
  if (e.zuschlaege.qh) ids.push([d.fws._meta, 'sia-384-1-2022']);
  if (e.warmwasser.kuenftig || e.warmwasser.bisher) ids.push([d.fws._meta, 'sia-385-2-2015']);
  if (raeumeMitHeizflaechen(b).length) ids.push([d.hk._meta, 'en442']);
  if (e.speicher.mag) ids.push([d.hydraulik._meta, 'din-en-12828']);
  if (e.geraet.gewaehlt) ids.push([d.wp._meta, 'db-wp-v101']);
  const out: string[] = [];
  for (const [meta, id] of ids) {
    const t = quelleAus(meta, id);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function KapitelQuellen({ b }: { b: BerichtDaten }) {
  const liste = quellenListe(b);
  return (
    <ol class="bericht__quellen" data-testid="bericht-quellen">
      {liste.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ol>
  );
}
