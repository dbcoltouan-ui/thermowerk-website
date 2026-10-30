/**
 * Bericht (Session 9; KONTEXT §2 «Eine Quelle der Wahrheit», PLAN Session 9): liest ausschliesslich das Ergebnis
 * von `berechne()` (Zahlen, Rechenwege, Annahmen) und den State nur für Beschriftungen. Kapitel erscheinen nur,
 * wenn ihr Inhalt vollständig ableitbar ist — keine Platzhalter, keine Verweise auf Fehlendes (Daniel 30.10.).
 *
 * Dieselbe Komponente ist Vorschau in Schritt 10 und Druckvorlage (A4 über `bericht.css`, PDF über den Druckdialog).
 */
import type { VNode } from 'preact';
import { methodeKurz } from '../ui/ergebnisTexte';
import type { BerichtDaten } from './kontext';
import { datumText } from './kontext';
import { KapitelObjekt, KapitelRechenweg, KapitelZusammenfassung, rechenwegTitel } from './kapitelHeizlast';
import { KapitelLeistung, KapitelSpeicher, KapitelWaermeabgabe, KapitelWaermepumpe, KapitelWarmwasser, raeumeMitHeizflaechen } from './kapitelAnlage';
import { KapitelAnnahmen, KapitelPlausi, KapitelQuellen, plausiVorhanden, quellenListe } from './kapitelAnhang';
import { Kapitel } from './teile';

export type KapitelId = 'objekt' | 'zusammenfassung' | 'rechenweg' | 'warmwasser' | 'leistung' | 'waermeabgabe' | 'speicher' | 'waermepumpe' | 'plausi' | 'annahmen' | 'quellen';

interface KapitelDef {
  id: KapitelId;
  titel: string;
  /** Neue Seite im Druck. */
  umbruch?: boolean;
  inhalt: () => VNode;
}

/**
 * Kapitel in Berichtsreihenfolge — nur die, deren Inhalt vollständig vorliegt (Relevanz und Ableitbarkeit).
 * Reihenfolge wie die Schrittfolge: Objekt → Ergebnis → Heizlast → Warmwasser → Leistung → Wärmeabgabe → Speicher → Gerät.
 */
export function berichtKapitel(b: BerichtDaten): KapitelDef[] {
  const e = b.ergebnis;
  const liste: (KapitelDef | false)[] = [
    { id: 'objekt', titel: 'Objekt', inhalt: () => <KapitelObjekt b={b} /> },
    { id: 'zusammenfassung', titel: 'Zusammenfassung', inhalt: () => <KapitelZusammenfassung b={b} /> },
    !!e.heizlast.massgebend.wert && { id: 'rechenweg', titel: rechenwegTitel(b), umbruch: true, inhalt: () => <KapitelRechenweg b={b} /> },
    b.state.warmwasser.wwKuenftig === true && !!e.warmwasser.kuenftig && { id: 'warmwasser', titel: 'Warmwasser', inhalt: () => <KapitelWarmwasser b={b} /> },
    !!e.zuschlaege.qh && { id: 'leistung', titel: 'Zuschläge und Auslegungsleistung', inhalt: () => <KapitelLeistung b={b} /> },
    raeumeMitHeizflaechen(b).length > 0 && { id: 'waermeabgabe', titel: 'Wärmeabgabe — Heizflächen und Vorlauftemperatur', umbruch: true, inhalt: () => <KapitelWaermeabgabe b={b} /> },
    { id: 'speicher', titel: 'Speicher und Hydraulik', inhalt: () => <KapitelSpeicher b={b} /> },
    !!e.geraet.gewaehlt && { id: 'waermepumpe', titel: 'Wärmepumpe', inhalt: () => <KapitelWaermepumpe b={b} /> },
    plausiVorhanden(b) && { id: 'plausi', titel: 'Plausibilität', inhalt: () => <KapitelPlausi b={b} /> },
    e.annahmen.length > 0 && { id: 'annahmen', titel: 'Annahmen und Unsicherheiten', umbruch: true, inhalt: () => <KapitelAnnahmen b={b} /> },
    quellenListe(b).length > 0 && { id: 'quellen', titel: 'Normen und Quellen', inhalt: () => <KapitelQuellen b={b} /> },
  ];
  return liste.filter((k): k is KapitelDef => !!k);
}

function Kopf({ b }: { b: BerichtDaten }) {
  const f = b.firma;
  return (
    <header class="bericht__kopf">
      {b.logoUrl ? <img class="bericht__logo" src={b.logoUrl} alt={f.marke} /> : <span class="bericht__marke">{f.marke}</span>}
      <div class="bericht__absender">
        <strong>{f.firma}</strong>
        <span>
          {f.adresse}, {f.plzOrt}
        </span>
        <span>
          {f.telefon} · {f.email}
        </span>
        <span>UID {f.uid}</span>
      </div>
    </header>
  );
}

export function Bericht(b: BerichtDaten) {
  const kapitel = berichtKapitel(b);
  const p = b.state.projekt;
  return (
    <article class="bericht" data-testid="bericht" data-methode={b.ergebnis.methode ?? ''} lang="de-CH">
      <Kopf b={b} />
      <div class="bericht__titelblock">
        <div>
          <h1 class="bericht__titel">Heizlast und Auslegung Wärmepumpe</h1>
          <p class="bericht__untertitel" data-testid="bericht-untertitel">
            {p.name.trim() || 'Projekt'}
            {p.adresse ? ` · ${p.adresse}` : ''}
          </p>
        </div>
        <div class="bericht__datum">
          <span data-testid="bericht-datum">{datumText(b.datum)}</span>
          <span class="bericht__methode-kurz">{methodeKurz(b.ergebnis.methode)}</span>
        </div>
      </div>
      {kapitel.map((k, i) => (
        <Kapitel nr={i + 1} titel={k.titel} id={k.id} umbruch={k.umbruch} key={k.id}>
          {k.inhalt()}
        </Kapitel>
      ))}
      <footer class="bericht__fuss">
        {b.firma.marke} · {b.firma.web} · Heizlastberechnung vom {datumText(b.datum)}
      </footer>
    </article>
  );
}
