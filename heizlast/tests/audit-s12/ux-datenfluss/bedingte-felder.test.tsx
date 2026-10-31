/**
 * Audit S12 (ux-datenfluss), Proben zu UX-10/11/12/13 (bedingte Felder), UX-14 (irrelevante Felder je Modus),
 * CODE-08/FLOW-07 (State nur Rohangaben), FLOW-01/07/09 (UI rechnet nichts).
 *
 * Die Schrittseiten werden mit `preact-render-to-string` aus dem App-Store gerendert (kein Browser); geprüft wird,
 * welche `data-testid` im HTML vorkommen — ein irrelevantes Feld darf gar nicht im DOM sein (kein `hidden`, kein Dimmen).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { hydrateState } from '../../../src/state/hydrate';
import type { State } from '../../../src/state/schema';
import { neuerState } from '../../../src/state/schema';
import { store } from '../../../src/state/app';
import { setzeImState } from '../../../src/state/store';
import { Verbrauch } from '../../../src/ui/seiten/Verbrauch';
import { Warmwasser } from '../../../src/ui/seiten/Warmwasser';
import { Speicher } from '../../../src/ui/seiten/Speicher';
import { Gebaeude } from '../../../src/ui/seiten/Gebaeude';
import { Zuschlaege } from '../../../src/ui/seiten/Zuschlaege';
import { Waermeabgabe } from '../../../src/ui/seiten/Waermeabgabe';

const daten = alleDaten();
const K = { id: 'p-test', jetzt: '2026-10-29T12:00:00.000Z' };
function fixture(name: string): State {
  const h = hydrateState(readFileSync(join(__dirname, '..', '..', 'fixtures', name), 'utf8'), K);
  if (!h.ok) throw new Error(h.text);
  return h.state;
}
const hat = (html: string, testid: string) => html.includes(`data-testid="${testid}"`);
function render(s: State, Seite: () => preact.JSX.Element | null): string {
  store.ersetze(s);
  return renderToString(<Seite />);
}

describe('UX-10/11/12/13 — Auftraggeber-Fall «WW bisher über Heizung ja, künftig nein»', () => {
  // Moosseedorf: rechnungen, wwBisher true, abzug.methode direkt (180 l/d); künftig: direkt
  const basis = fixture('state-v4-fws-moosseedorf.json');
  const auftraggeber = setzeImState(basis, 'warmwasser.wwKuenftig', false);

  it('Schritt 3: Abzug-Block gerendert, nur die Felder der gewählten Abzug-Methode; Umschalten der Methode schaltet die EIGENEN Felder (UX-12)', () => {
    const html = render(auftraggeber, Verbrauch);
    expect(hat(html, 'abzug')).toBe(true);
    expect(hat(html, 'abzug-vwu')).toBe(true); // Methode direkt
    expect(hat(html, 'abzug-personen')).toBe(false);
    expect(hat(html, 'abzug-bedarf')).toBe(false);
    expect(hat(html, 'ww-abzug')).toBe(true);
    // Abzug-Methode auf Personen: Personen/Bedarf erscheinen, V_W,u verschwindet; der KÜNFTIGE Ast (warmwasser.methode) bleibt unberührt
    const pers = setzeImState(auftraggeber, 'verbrauch.abzug.methode', 'personen');
    const h2 = render(pers, Verbrauch);
    expect(hat(h2, 'abzug-personen')).toBe(true);
    expect(hat(h2, 'abzug-bedarf')).toBe(true);
    expect(hat(h2, 'abzug-vwu')).toBe(false);
    expect(pers.warmwasser.methode).toBe('direkt');
    // WW bisher nein → kein Abzug-Block
    const nein = setzeImState(auftraggeber, 'verbrauch.wwBisher', false);
    const h3 = render(nein, Verbrauch);
    expect(hat(h3, 'abzug')).toBe(false);
    expect(hat(h3, 'ww-abzug')).toBe(false);
  });

  it('Schritt 5: WW künftig nein → keine Personen-/Komfort-/Ladetemperatur-Felder im DOM (kein hidden, kein Dimmen)', () => {
    const html = render(auftraggeber, Warmwasser);
    expect(hat(html, 'ww-kuenftig')).toBe(true);
    expect(hat(html, 'ww-separat')).toBe(true);
    for (const id of ['wwk', 'wwk-personen', 'wwk-bedarf', 'wwk-vwu', 'wwk-methode', 'ww-tlade', 'ww-deltat', 'ww-zuschlag']) expect(hat(html, id), id).toBe(false);
    expect(html).not.toMatch(/\bhidden\b/);
    expect(html).not.toMatch(/opacity/);
    expect(html).not.toMatch(/display:\s*none/);
    // Ja → Felder der Methode direkt (Fixture) sichtbar; Personen nicht
    const ja = setzeImState(auftraggeber, 'warmwasser.wwKuenftig', true);
    const h2 = render(ja, Warmwasser);
    expect(hat(h2, 'wwk-vwu')).toBe(true);
    expect(hat(h2, 'wwk-personen')).toBe(false);
    expect(hat(h2, 'ww-tlade')).toBe(true);
  });

  it('Schritt 8: WW künftig nein → kein WW-Speicher-Block (nur Hinweis), Puffer und MAG bleiben', () => {
    const html = render(auftraggeber, Speicher);
    expect(hat(html, 'speicher-ww-keiner')).toBe(true);
    expect(hat(html, 'speicher-fsto')).toBe(false);
    expect(hat(html, 'speicher-ww-volumen')).toBe(false);
    expect(hat(html, 'speicher-puffer')).toBe(true);
    expect(hat(html, 'speicher-mag')).toBe(true);
  });

  it('UX-13: Abzug kommt NUR aus verbrauch.abzug — künftige WW-Angaben ändern den Abzug nicht; ohne Abzugsangaben kein stiller Rückgriff', () => {
    const e0 = berechne(auftraggeber, daten);
    expect(e0.heizlast.fws!.wwAbzug!.wert).toBeCloseTo(4790.6, 0);
    const e1 = berechne(setzeImState(setzeImState(auftraggeber, 'warmwasser.methode', 'personen'), 'warmwasser.personen', 12), daten);
    expect(e1.heizlast.fws!.wwAbzug!.wert).toBeCloseTo(4790.6, 0);
    // Abzug-Ast leer (Methode direkt ohne V_W,u) → Kern meldet Fehler/Hinweis statt stillem Rückgriff auf künftige Werte
    const leer = setzeImState(setzeImState(auftraggeber, 'verbrauch.abzug.vwuLiterTag', undefined), 'warmwasser.wwKuenftig', true);
    const e2 = berechne(leer, daten);
    const abzug = e2.heizlast.fws!.wwAbzug?.wert ?? 0;
    const kuenftigQnWw = e2.warmwasser.kuenftig?.qnWw.wert ?? -1;
    expect(abzug).not.toBeCloseTo(kuenftigQnWw, 0);
    expect(e2.hinweise.some((h) => h.schritt === 'verbrauch' && h.stufe === 'fehler') || abzug === 0).toBe(true);
  });
});

describe('UX-14 — modusfremde Felder werden nicht gerendert', () => {
  it('FWS: Keller/Dachform nicht in Schritt 1; raumweise: vorhanden', () => {
    const fws = render(fixture('state-v4-fws-moosseedorf.json'), Gebaeude);
    expect(hat(fws, 'gebaeude-keller')).toBe(false);
    expect(hat(fws, 'gebaeude-dachform')).toBe(false);
    const rw = render(fixture('state-v4-raumweise-efh.json'), Gebaeude);
    expect(hat(rw, 'gebaeude-keller')).toBe(true);
    expect(hat(rw, 'gebaeude-dachraum')).toBe(true);
    const flach = render(setzeImState(fixture('state-v4-raumweise-efh.json'), 'gebaeude.dachform', 'flach'), Gebaeude);
    expect(hat(flach, 'gebaeude-dachraum')).toBe(false);
    // Wohneinheiten nur MFH
    expect(hat(fws, 'gebaeude-wohneinheiten')).toBe(false);
    expect(hat(render(setzeImState(fixture('state-v4-fws-moosseedorf.json'), 'gebaeude.typ', 'mfh'), Gebaeude), 'gebaeude-wohneinheiten')).toBe(true);
  });

  it('Sperrzeit nein → kein h/d-Feld; Puffer abgewählt → kein Override-Feld; Wärmeabgabesystem nur ohne Heizflächen', () => {
    const s = fixture('state-v4-fws-moosseedorf.json');
    expect(hat(render(setzeImState(s, 'zuschlaege.sperrzeitAktiv', false), Zuschlaege), 'sperrzeit-h')).toBe(false);
    expect(hat(render(s, Zuschlaege), 'sperrzeit-h')).toBe(true);
    expect(hat(render(setzeImState(s, 'speicher.puffer.aktiv', false), Speicher), 'puffer-volumen')).toBe(false);
    expect(hat(render(s, Waermeabgabe), 'wa-system')).toBe(true);
    expect(hat(render(fixture('state-v4-raumweise-efh.json'), Waermeabgabe), 'wa-system')).toBe(false);
    expect(hat(render(fixture('state-v4-raumweise-efh.json'), Waermeabgabe), 'wa-zielvl')).toBe(true);
  });

  it('Heizflächen-Masse folgen der Bauart (Platte: Höhe/Länge; Guss: Höhe/Glieder/Tiefe, keine Länge-Pflicht; FBH: Fläche/VA/Belag)', () => {
    const s = fixture('state-v4-raumweise-efh.json');
    const platte = render(s, Waermeabgabe);
    expect(hat(platte, 'wa-raum-1-hf-1-hoehe')).toBe(true);
    expect(hat(platte, 'wa-raum-1-hf-1-laenge')).toBe(true);
    expect(hat(platte, 'wa-raum-1-hf-1-glieder')).toBe(false);
    expect(hat(platte, 'wa-raum-1-hf-1-flaeche')).toBe(false);
    const fbh = render(setzeImState(s, 'waermeabgabe.raeume.wohnen.heizflaechen.hf1.bauart', 'fbh'), Waermeabgabe);
    expect(hat(fbh, 'wa-raum-1-hf-1-flaeche')).toBe(true);
    expect(hat(fbh, 'wa-raum-1-hf-1-va')).toBe(true);
    expect(hat(fbh, 'wa-raum-1-hf-1-hoehe')).toBe(false);
  });
});

describe('CODE-08 / FLOW-07 — State enthält nur Rohangaben', () => {
  it('Schema-Schlüssel: kein abgeleiteter Wert (U, q_norm, EBF aus Räumen, Heizlast, Volumen-Vorschlag, θe berechnet) im State', () => {
    const verboten = /^(u|uWert|qNorm|qN|phiHL|phiT|phiV|qhl|qh|ebf|thetaE|volumen|vorschlag|tVLReq|auslegungsVL|hgt|ergebnis|calc|berechnet)$/i;
    const pfade: string[] = [];
    const walk = (o: unknown, pfad: string) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) return o.forEach((x, i) => walk(x, `${pfad}[${i}]`));
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        if (verboten.test(k)) pfade.push(`${pfad}.${k}`);
        walk(v, `${pfad}.${k}`);
      }
    };
    for (const n of ['state-v4-fws-moosseedorf.json', 'state-v4-raumweise-efh.json']) walk(fixture(n), n);
    walk(neuerState(K), 'neu');
    expect(pfade).toEqual([]);
  });

  it('Alle State-Schlüssel der ersten zwei Ebenen sind Eingaben (Liste zur Durchsicht im Prüfbericht)', () => {
    const s = fixture('state-v4-raumweise-efh.json');
    const ebene2 = Object.entries(s).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).map((kk) => `${k}.${kk}`) : [k]));
    // Erwartete, dokumentierte Rohangaben-Schlüssel (Schema v4)
    const erwartet = ['meta.schemaVersion', 'meta.id', 'meta.erstellt', 'meta.geaendert', 'projekt.name', 'projekt.bezugsdatum', 'methode', 'gebaeude.typ', 'gebaeude.standort', 'gebaeude.baujahr', 'gebaeude.keller', 'gebaeude.dachform', 'gebaeude.dachraumBeheizt', 'gebaeude.ebfModus', 'gebaeude.energiestandard', 'sanierungen', 'verbrauch.quelle', 'verbrauch.reihen', 'verbrauch.eta', 'verbrauch.konvention', 'verbrauch.bedarfsart', 'verbrauch.klimabereinigung', 'verbrauch.wwBisher', 'verbrauch.abzug', 'verbrauch.wpBetriebsstunden', 'verbrauch.messung', 'huelle.bauteiltypen', 'huelle.lueftung', 'huelle.waermebruecken', 'huelle.erdreich', 'huelle.geschosshoeheM', 'huelle.rest', 'raeume', 'warmwasser.wwKuenftig', 'warmwasser.methode', 'warmwasser.personen', 'warmwasser.zirkulation', 'waermeabgabe.heizkreise', 'waermeabgabe.raeume', 'zuschlaege.sperrzeitAktiv', 'zuschlaege.zusatz', 'speicher.ww', 'speicher.puffer', 'speicher.mag', 'geraet.quelle', 'geraet.auswahlId', 'geraet.filterOverrides'];
    expect(ebene2.sort()).toEqual(erwartet.sort());
  });
});

describe('FLOW-01/07/09 — UI und Bericht rechnen nichts (grep-Probe)', () => {
  const dateien = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? dateien(p) : /\.tsx?$/.test(n) ? [p] : [];
    });
  const wurzel = join(__dirname, '..', '..', '..', 'src');

  it('keine Kern-Rechenfunktionen und keine physikalischen Formeln in src/ui und src/bericht', () => {
    const treffer: string[] = [];
    for (const f of [...dateien(join(wurzel, 'ui')), ...dateien(join(wurzel, 'bericht'))]) {
      // Nur Code: Kommentare, String-Literale und JSX-Textknoten entfernen (Formelbeschriftungen sind erlaubt).
      const q = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""')
        .replace(/>[^<{}]*</g, '><');
      const rel = f.slice(wurzel.length + 1);
      // Aufrufe von Rechenfunktionen des Kerns (nur berechne() im Store erlaubt)
      for (const fn of ['heizlastFws(', 'heizlastRaumweise(', 'waermeabgabe(', 'warmwasserBedarf(', 'wwSpeicher(', 'puffer(', 'mag(', 'huelleAufloesen(', 'geraetWaehlen(', 'klimaStandort(', 'berechne(', 'dTlog(', 'bisektionVorlauf(', 'leistungsfaktor(', 'normleistung(']) {
        if (q.includes(fn)) treffer.push(`${rel}: ${fn}`);
      }
      // Physik-Konstanten / typische Formeln
      for (const m of q.matchAll(/\b0\.34\b|\* ?365|\/ ?365|Math\.pow|\*\* ?n\b|Math\.log\(|\(24 ?- ?/g)) treffer.push(`${rel}: «${m[0]}»`);
    }
    expect(treffer).toEqual([]);
  });

  it('Multiplikationen/Divisionen in src/ui und src/bericht sind nur Formatierung (×100 %, /1000 kW, Rundung, Layout) oder Eingabe-Umrechnung (kW→W)', () => {
    const erlaubt = [/\* ?100\b/, /\/ ?1000\b/, /\* ?1000\b/, /Math\.round\([^)]*\* ?10\) ?\/ ?10/, /1e6/, /10 \*\* dez/, /\* ?faktor/, /\/ ?faktor/, /scrollLeft|clientWidth|scrollWidth|verschiebung|\(x - s\.min\)|s\.max - s\.min/, /band\[[01]\] ?\* ?100/, /\.wert ?\* ?100/, /Math\.abs\(m\.hoeheMm - hf\.hoeheMm\)/, /Math\.abs\(geschrieben - roh\)|1e-9 ?\* ?Math\.max/, /Math\.max\(Math\.abs\(w\.band/, /kw ?\* ?1000/];
    const treffer: string[] = [];
    const sichtung: string[] = [];
    for (const f of [...dateien(join(wurzel, 'ui')), ...dateien(join(wurzel, 'bericht'))]) {
      const zeilen = readFileSync(f, 'utf8').split('\n');
      zeilen.forEach((z, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(z)) return;
        // Nur Code: String-Literale, Regex-Literale und JSX-Textknoten entfernen
        const code = z
          .replace(/\{\/\*.*?\*\/\}/g, '')
          .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""')
          .replace(/\.replace\(\/(?:[^/\\]|\\.)*\/[gimsuy]*/g, '.replace(RE')
          .replace(/\/(?:[^/\\\s]|\\.)+\/[gimsuy]*\.test\(/g, 'RE.test(')
          .replace(/>[^<{}]*</g, '><')
          .replace(/>[^<{}]*$/g, '>')
          .replace(/^[^<{}]*</g, '<');
        const imTemplate = /\$\{[^}'"]*[\w)\]]\s*[*/]\s*[\w(][^}'"]*\}/.test(z); // Rechnung in einem Template-String (`${a / b}`), nicht `${x ? 'SIA 384/2' : …}`
        if (!imTemplate && !/[\w)\]]\s*[*/]\s*[\w(]/.test(code)) return;
        if (erlaubt.some((r) => r.test(z))) return;
        // Reine JSX-Textzeilen (kein `=`, kein `(`-Aufruf ausser fmt/zahl/kW in {}-Ausdrücken): Beschriftungen wie «Σ Menge / Σ Jahresanteile»
        const ohneAusdruecke = z.replace(/\{[^{}]*\}/g, '').replace(/<[^>]+>/g, '');
        const rest = z.replace(/\{(fmt|zahl|kW)\([^{}]*\)\}/g, 'X').replace(/<[^>]+>/g, '').trim();
        const nurAnzeige = !imTemplate && !/;|=>/.test(rest) && !/^(return|const|let|if|for|export|import|function|\}|\)|\.)/.test(rest);
        if (nurAnzeige && /[A-Za-zÄÖÜäöüΣΦθ]/.test(ohneAusdruecke)) {
          sichtung.push(`${f.slice(wurzel.length + 1)}:${i + 1}: Anzeigetext «${ohneAusdruecke.trim().slice(0, 60)}»`);
          return;
        }
        treffer.push(`${f.slice(wurzel.length + 1)}:${i + 1}: ${z.trim().slice(0, 120)}`);
      });
    }
    console.log('Arithmetik in UI/Bericht ausserhalb der Formatier-Ausnahmen:\n  ' + (treffer.join('\n  ') || '—'));
    console.log('Als Anzeigetext gesichtet (Schrägstrich/Stern nur in Beschriftung):\n  ' + (sichtung.join('\n  ') || '—'));
    // Befund (Audit S12, neu): die UI bildet aus zwei Kern-Werten den Quotienten f_heute = faktorIst/faktorUnsaniert
    // (Anzeige «wird mit Faktor x umgerechnet») — Kern liefert `fHeute` in subperiodenKorrektur, reicht ihn aber nicht
    // in ZeitraumErgebnis.sanierung durch. Reine Darstellung, aber eine Rechnung ausserhalb des Kerns.
    expect(treffer.map((t) => t.split(':').slice(0, 2).join(':'))).toEqual(['ui/ergebnisTexte.ts:35', 'ui/seiten/Sanierungen.tsx:84']);
  });
});
