/**
 * Speicher und Hydraulik — reine Funktionen.
 *
 * Warmwasserspeicher (FWS M3 Folien 54–57, SIA 385/2:2015):
 *   V_W,sto = Q_WW / (1 kg/l · 4.2 kJ/(kg·K) · 1/3600 kWh/kJ · (T_Lade − 10 °C)) · f_sto
 *   ΔT = T_Lade − 10 (eine Regel, Befund FACH-13); f_sto nach SIA 385/2 §4.3.2.5; Spitzendeckung ≥ 9 % von V_W,u;
 *   Marktrundung auf das nächste Nennvolumen (eine Rundungsregel, Befund FACH-41).
 * Heizungspuffer: V = max(Hersteller-Minimum, Kriterium nach Wärmequelle) mit Begründung (Befund FACH-11).
 * MAG / Sicherheitsventil nach DIN EN 12828 (Wissensbasis K, data/hydraulik.json) — nicht FWS.
 */
import type { FwsDaten, HydraulikDaten } from '../daten/fws';
import type { Gebaeudetyp, WpQuelle } from './typen';
import type { Hinweis, Wert } from './wert';
import { berechnet, eingabe, fallback, fmt, sammleAnnahmen, schaetzung, tabelle } from './wert';

/* ------------------------------------------------------------------------------------------------
   Rundung
   ------------------------------------------------------------------------------------------------ */

/** Aufrunden auf die nächste Stufe einer Nennvolumen-Reihe; darüber in `schrittDarueber`-Schritten. */
export function aufMarktstufe(liter: number, reihe: number[], schrittDarueber: number): number {
  if (!(liter > 0)) return 0;
  for (const s of reihe) if (s >= liter) return s;
  return Math.ceil(liter / schrittDarueber) * schrittDarueber;
}

/* ------------------------------------------------------------------------------------------------
   Warmwasserspeicher
   ------------------------------------------------------------------------------------------------ */

export interface WwSpeicherEingabe {
  /** Gesamtenergiebedarf WW [kWh/d] (aus warmwasser.ts, künftiger Zustand). */
  qwwKwhTag: Wert;
  /** Nutzwarmwasser [l/d] für das Spitzendeckungsvolumen. */
  vwuLiterTag?: Wert;
  /** Ladetemperatur des Speichers [°C]; Default 60 °C (Folie 57, EFH). */
  tLadeC?: number;
  /** Schlüssel aus fws.json speicherWarmwasser.fSto; Default der Tabellen-Default (Misch- und Kaltzone, 1.25). */
  fStoKey?: string;
  gebaeudetyp?: Gebaeudetyp;
  /** Manuelle Wahl des Nennvolumens [l] (Override). */
  volumenOverrideLiter?: number;
}

export interface WwSpeicherErgebnis {
  tLade: Wert;
  deltaT: Wert;
  /** V_W,sto,cont (ohne f_sto) [l]. */
  volumenRoh: Wert;
  fSto: Wert;
  /** V_W,sto,1 = roh · f_sto [l]. */
  volumen: Wert;
  /** Marktübliches Nennvolumen bzw. Override [l]. */
  volumenEffektiv: Wert;
  /** Mindest-Spitzendeckungsvolumen [l] (Folie 56), null ohne V_W,u. */
  spitzendeckung: Wert | null;
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
}

export function wwSpeicher(e: WwSpeicherEingabe, daten: FwsDaten): WwSpeicherErgebnis {
  const hinweise: Hinweis[] = [];
  const d = daten.speicherWarmwasser;
  const tLade = e.tLadeC !== undefined && e.tLadeC > 0 ? eingabe(e.tLadeC, '°C', `Ladetemperatur ${fmt(e.tLadeC, 0)} °C (Eingabe)`) : fallback(d.empfehlungen.efh.ladetemperaturC, '°C', `Ladetemperatur ${d.empfehlungen.efh.ladetemperaturC} °C — Standardwert (Folie 57)`, { quelle: 'FWS M3 Folie 57', stufe: 'standardwert' });
  const dT = tLade.wert - d.tKaltwasserC;
  const deltaT = berechnet(dT, 'K', `ΔT = T_Lade − T_Kaltwasser = ${fmt(tLade.wert, 0)} − ${d.tKaltwasserC} = ${fmt(dT, 0)} K`, [tLade], { quelle: 'FWS M3 Folie 54 (SIA 385/2: T_ein 10 °C)' });
  if (dT < 30) hinweise.push({ stufe: 'warnung', code: 'speicher.ww.deltaT.klein', text: `Ladetemperatur ${fmt(tLade.wert, 0)} °C ergibt nur ${fmt(dT, 0)} K Nutzdifferenz — Speicher wird gross; Legionellenschutz beachten.` });
  const kwhProL = (daten.warmwasser.cpKjKgK * dT) / 3600;
  const rohL = dT > 0 ? e.qwwKwhTag.wert / kwhProL : 0;
  const volumenRoh = berechnet(rohL, 'l', `V_W,sto = Q_WW / (4.2 · ΔT / 3600) = ${fmt(e.qwwKwhTag.wert, 1)} kWh/d / ${fmt(kwhProL, 4)} kWh/l = ${fmt(rohL, 0)} l`, [e.qwwKwhTag, deltaT], { quelle: 'FWS M3 Folie 54' });

  const fStoDef = d.fSto.find((f) => (e.fStoKey ? f.key === e.fStoKey : f.default)) ?? d.fSto[0]!;
  const fSto = e.fStoKey
    ? tabelle(fStoDef.wert, '', `f_sto ${fmt(fStoDef.wert, 2)}: ${fStoDef.label}`, 'SIA 385/2:2015 §4.3.2.5 (FWS M3 Folie 54)')
    : fallback(fStoDef.wert, '', `f_sto ${fmt(fStoDef.wert, 2)}: ${fStoDef.label} — Standardwert`, { quelle: 'SIA 385/2:2015 §4.3.2.5 (FWS M3 Folie 54)', stufe: 'standardwert' });
  const volL = rohL * fSto.wert;
  const volumen = berechnet(volL, 'l', `V_W,sto,1 = ${fmt(rohL, 0)} l × f_sto ${fmt(fSto.wert, 2)} = ${fmt(volL, 0)} l`, [volumenRoh, fSto], { quelle: 'SIA 385/2:2015 §4.3.2.5' });

  const maxStufe = d.marktrundungLiter[d.marktrundungLiter.length - 1] ?? 2000;
  const markt = aufMarktstufe(volL, d.marktrundungLiter, maxStufe >= 1000 ? 500 : 100);
  let volumenEffektiv: Wert;
  if (e.volumenOverrideLiter !== undefined && e.volumenOverrideLiter > 0) {
    volumenEffektiv = { wert: e.volumenOverrideLiter, einheit: 'l', herkunft: 'override', begruendung: `Speicher ${fmt(e.volumenOverrideLiter, 0)} l manuell gewählt (rechnerisch ${fmt(volL, 0)} l → ${fmt(markt, 0)} l)` };
    if (e.volumenOverrideLiter < volL) hinweise.push({ stufe: 'warnung', code: 'speicher.ww.override.klein', text: `Gewählter Speicher ${fmt(e.volumenOverrideLiter, 0)} l liegt unter dem rechnerischen Bedarf ${fmt(volL, 0)} l.` });
  } else {
    volumenEffektiv = schaetzung(markt, 'l', `Marktübliches Nennvolumen: ${fmt(volL, 0)} l → ${fmt(markt, 0)} l (Aufrundung auf die nächste Stufe)`, { quelle: 'fws.json speicherWarmwasser.marktrundungLiter (Thermowerk-Annahme)', stufe: 'marktrundung' });
  }

  let spitzendeckung: Wert | null = null;
  if (e.vwuLiterTag && e.vwuLiterTag.wert > 0) {
    const sp = e.vwuLiterTag.wert * d.spitzendeckung.anteilVwuMax;
    spitzendeckung = tabelle(sp, 'l', `Mindest-Spitzendeckungsvolumen ≈ ${fmt(d.spitzendeckung.anteilVwuMax * 100, 0)} % von V_W,u ${fmt(e.vwuLiterTag.wert, 0)} l/d = ${fmt(sp, 0)} l (Wohnbauten, grösste Stundenspitze)`, 'SIA 385/2:2015 Säulendiagramm (FWS M3 Folie 56)', { unsicherheit: 11 });
    if (spitzendeckung.wert > volumenEffektiv.wert) hinweise.push({ stufe: 'warnung', code: 'speicher.ww.spitzendeckung', text: `Spitzendeckungsvolumen ${fmt(sp, 0)} l übersteigt das Speichervolumen — Speicher vergrössern oder Ladestrategie anpassen.` });
  }
  if ((e.gebaeudetyp ?? 'efh') === 'efh' && volumenEffektiv.wert > d.empfehlungen.efh.literTypisch * 1.5) {
    hinweise.push({ stufe: 'info', code: 'speicher.ww.efhGross', text: `Kurs-Empfehlung EFH: Tagesbedarf à 60 °C, meistens ${d.empfehlungen.efh.literTypisch} l (Folie 57); hier ${fmt(volumenEffektiv.wert, 0)} l — Hygiene (SVGW: tägliche Erneuerung) beachten.` });
  }
  if (e.gebaeudetyp === 'mfh') {
    hinweise.push({ stufe: 'info', code: 'speicher.ww.mfhLadezyklen', text: `Kurs-Empfehlung MFH: ${d.empfehlungen.mfh.ladezyklenProTag.join('–')} Ladezyklen pro Tag (Folie 57) — Volumen entsprechend kleiner als der Tagesbedarf wählbar.` });
  }

  return { tLade, deltaT, volumenRoh, fSto, volumen, volumenEffektiv, spitzendeckung, annahmen: sammleAnnahmen([tLade, fSto, volumenEffektiv, spitzendeckung]), hinweise };
}

/* ------------------------------------------------------------------------------------------------
   Heizungs-Pufferspeicher
   ------------------------------------------------------------------------------------------------ */

export interface PufferEingabe {
  quelle: WpQuelle;
  /** WP-Heizleistung am Normpunkt [W] (Bezug für Abtau-/Taktkriterium). */
  qWpW?: Wert;
  /** Heizlast [W] (Bezug für Sperrzeit-Überbrückung). */
  qhlW?: Wert;
  heizflaechen: 'fbh' | 'heizkoerper' | 'gemischt';
  einzelraumregelung: boolean;
  /** Hersteller-Mindestpuffer des gewählten Geräts [l] (waermepumpen.json). */
  herstellerMinimumLiter?: number;
  /** Sperrzeit-Überbrückung ausdrücklich gewünscht (Folie 91: meist unrealistisch). */
  sperrzeitUeberbrueckung?: boolean;
  sperrzeitH?: number;
  volumenOverrideLiter?: number;
}

export interface PufferKriterium {
  key: string;
  label: string;
  liter: Wert;
}

export interface PufferErgebnis {
  kriterien: PufferKriterium[];
  massgebend: string;
  volumen: Wert;
  volumenEffektiv: Wert;
  begruendung: string;
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
}

export function puffer(e: PufferEingabe, daten: FwsDaten): PufferErgebnis {
  const hinweise: Hinweis[] = [];
  const k = daten.puffer.kriterien;
  const kriterien: PufferKriterium[] = [];
  const qWpKw = (e.qWpW?.wert ?? 0) / 1000;
  const qhlKw = (e.qhlW?.wert ?? 0) / 1000;
  const quelleJ = 'Wissensbasis J §3.4/3.5 (Herstellerkonventionen); FWS M3 Folie 91';

  if (e.herstellerMinimumLiter !== undefined && e.herstellerMinimumLiter > 0) {
    kriterien.push({ key: 'hersteller', label: 'Hersteller-Minimum des Geräts', liter: eingabe(e.herstellerMinimumLiter, 'l', `Hersteller-Mindestpuffer ${fmt(e.herstellerMinimumLiter, 0)} l (Gerätedaten)`) });
  }
  if (e.quelle === 'luftWasser') {
    if (qWpKw > 0) {
      const [lo, hi] = k.luftWasser.abtau.empfehlungLiterProKw as [number, number];
      const mitte = (lo + hi) / 2;
      kriterien.push({
        key: 'abtau',
        label: 'Abtau-/Taktreserve Luft/Wasser-WP',
        liter: schaetzung(qWpKw * mitte, 'l', `Abtau-/Taktreserve ${fmt(mitte, 0)} l/kW × Q_WP ${fmt(qWpKw, 1)} kW = ${fmt(qWpKw * mitte, 0)} l (Band ${lo}–${hi} l/kW)`, { quelle: quelleJ, band: [qWpKw * lo, qWpKw * hi], unsicherheit: Math.round(((hi - lo) / 2 / mitte) * 100) }),
      });
    } else hinweise.push({ stufe: 'warnung', code: 'puffer.qWp.fehlt', text: 'Für das Abtau-/Taktkriterium der Luft/Wasser-WP fehlt die WP-Leistung — Puffer wird erst mit gewähltem Gerät berechnet.' });
    if (e.einzelraumregelung && e.heizflaechen !== 'fbh') {
      const [lo, hi] = k.luftWasser.err.trennpufferLiter as [number, number];
      kriterien.push({ key: 'err', label: 'Hydraulische Entkopplung bei Einzelraumregelung', liter: schaetzung((lo + hi) / 2, 'l', `Trennpuffer ${lo}–${hi} l bei Einzelraumregelung (Mitte)`, { quelle: quelleJ, band: [lo, hi] }) });
    }
  } else if (e.quelle === 'soleWasser') {
    if (e.heizflaechen !== 'fbh' && e.einzelraumregelung) {
      const lpk = k.soleWasser.hkMitErr.literProKw;
      if (qWpKw > 0) kriterien.push({ key: 'hkErr', label: 'Sole-WP mit Heizkörpern + Einzelraumregelung', liter: schaetzung(qWpKw * lpk, 'l', `${k.soleWasser.hkMitErr.art ?? 'Puffer'} ${lpk} l/kW × Q_WP ${fmt(qWpKw, 1)} kW = ${fmt(qWpKw * lpk, 0)} l`, { quelle: quelleJ }) });
      else hinweise.push({ stufe: 'warnung', code: 'puffer.qWp.fehlt', text: 'Für das Puffer-Kriterium fehlt die WP-Leistung.' });
    } else {
      kriterien.push({ key: 'fbh', label: 'Sole-WP mit FBH ohne Einzelraumregelung', liter: tabelle(k.soleWasser.fbhOhneErr.literProKw, 'l', `${k.soleWasser.fbhOhneErr.hinweis ?? 'kein Puffer nötig'}`, quelleJ) });
    }
  } else {
    kriterien.push({ key: 'wasser', label: 'Wasser/Wasser-WP', liter: tabelle(k.wasserWasser.literProKw, 'l', `${k.wasserWasser.hinweis ?? 'kein Puffer'}`, quelleJ) });
  }
  if (e.sperrzeitUeberbrueckung && (e.sperrzeitH ?? 0) > 0) {
    const lpk = e.quelle === 'soleWasser' ? k.soleWasser.sperrzeit.literProKw : k.luftWasser.sperrzeit.empfehlungLiterProKw[0] ?? k.luftWasser.sperrzeit.literProKwMin;
    if (qhlKw > 0) {
      kriterien.push({ key: 'sperrzeit', label: 'Sperrzeiten-Überbrückung', liter: schaetzung(qhlKw * lpk, 'l', `Sperrzeit-Überbrückung ${lpk} l/kW × Q_hl ${fmt(qhlKw, 1)} kW = ${fmt(qhlKw * lpk, 0)} l — nach Kurs meist unrealistisch gross (Folie 91)`, { quelle: quelleJ }) });
      hinweise.push({ stufe: 'info', code: 'puffer.sperrzeit', text: 'Sperrzeit-Überbrückung über den Puffer ist gemäss Kurs (Folie 91) meist nicht sinnvoll realisierbar — nur informativ.' });
    }
  }

  let massgebend: PufferKriterium | null = null;
  for (const kr of kriterien) if (!massgebend || kr.liter.wert > massgebend.liter.wert) massgebend = kr;
  const volL = massgebend?.liter.wert ?? 0;
  const volumen = berechnet(volL, 'l', massgebend ? `V_Puffer = max(${kriterien.map((x) => `${x.label} ${fmt(x.liter.wert, 0)} l`).join('; ')}) = ${fmt(volL, 0)} l` : 'Kein Puffer-Kriterium zutreffend', kriterien.map((x) => x.liter), { quelle: 'Thermowerk-Regel: max(Hersteller-Minimum, Quellen-Kriterium)' });
  const reihe = daten.puffer.marktrundungLiter;
  const markt = aufMarktstufe(volL, reihe, 500);
  let volumenEffektiv: Wert;
  if (e.volumenOverrideLiter !== undefined && e.volumenOverrideLiter > 0) {
    volumenEffektiv = { wert: e.volumenOverrideLiter, einheit: 'l', herkunft: 'override', begruendung: `Puffer ${fmt(e.volumenOverrideLiter, 0)} l manuell gewählt (rechnerisch ${fmt(volL, 0)} l)` };
    if (e.herstellerMinimumLiter !== undefined && e.volumenOverrideLiter < e.herstellerMinimumLiter) hinweise.push({ stufe: 'warnung', code: 'puffer.override.unterMinimum', text: `Gewählter Puffer ${fmt(e.volumenOverrideLiter, 0)} l liegt unter dem Hersteller-Minimum ${fmt(e.herstellerMinimumLiter, 0)} l.` });
  } else {
    volumenEffektiv = volL > 0 ? schaetzung(markt, 'l', `Marktübliches Nennvolumen: ${fmt(volL, 0)} l → ${fmt(markt, 0)} l`, { quelle: 'fws.json puffer.marktrundungLiter (Thermowerk-Annahme)', stufe: 'marktrundung' }) : berechnet(0, 'l', 'Kein Puffer (ggf. hydraulische Weiche)', []);
  }
  const begruendung = massgebend ? `${massgebend.label}: ${massgebend.liter.begruendung}` : 'Kein Puffer-Kriterium zutreffend — ggf. hydraulische Weiche.';
  return { kriterien, massgebend: massgebend?.key ?? 'keins', volumen, volumenEffektiv, begruendung, annahmen: sammleAnnahmen([...kriterien.map((x) => x.liter), volumenEffektiv]), hinweise };
}

/* ------------------------------------------------------------------------------------------------
   MAG und Sicherheitsventil (DIN EN 12828; nicht FWS)
   ------------------------------------------------------------------------------------------------ */

/** Ausdehnungsfaktor n [%] bei Befülltemperatur 10 °C und max. Vorlauftemperatur (Tabellenbuch B4 S.400), linear interpoliert. */
export function ausdehnungsfaktor(tVlMaxC: number, daten: HydraulikDaten): Wert {
  const sp = daten.mag.ausdehnungsfaktor.stuetzpunkte;
  const quelle = 'Tabellenbuch SHK B4 S.400 (Wissensbasis K §3.2)';
  const a0 = sp[0]!;
  const a1 = sp[1]!;
  const letzter = sp[sp.length - 1]!;
  let n: number;
  let stufe = 'tabelle';
  if (tVlMaxC <= a0.tVlMaxC) {
    n = Math.max(0.3, a0.nProzent + ((tVlMaxC - a0.tVlMaxC) * (a1.nProzent - a0.nProzent)) / (a1.tVlMaxC - a0.tVlMaxC));
    stufe = 'extrapoliert';
  } else if (tVlMaxC >= letzter.tVlMaxC) n = letzter.nProzent;
  else {
    n = letzter.nProzent;
    for (let i = 0; i < sp.length - 1; i++) {
      const a = sp[i]!;
      const b = sp[i + 1]!;
      if (tVlMaxC >= a.tVlMaxC && tVlMaxC <= b.tVlMaxC) {
        n = a.nProzent + ((tVlMaxC - a.tVlMaxC) * (b.nProzent - a.nProzent)) / (b.tVlMaxC - a.tVlMaxC);
        break;
      }
    }
  }
  return tabelle(n, '%', `Ausdehnungsfaktor n = ${fmt(n, 2)} % bei max. Vorlauf ${fmt(tVlMaxC, 0)} °C (Befüllung 10 °C)${stufe === 'extrapoliert' ? ', unter 40 °C extrapoliert' : ''}`, quelle, { stufe });
}

export interface MagEingabe {
  /** Anlagenvolumen bekannt [l]; sonst Schätzung aus Q_h × l/kW + Speicher. */
  anlagenvolumenLiter?: number;
  qhW?: Wert;
  heizflaechen?: 'konvektoren' | 'plattenheizkoerper' | 'radiatoren' | 'fbh' | 'gemischt';
  pufferLiter?: number;
  /** WW-Speicherinhalt nur, wenn er im Heizkreis liegt (Puffer-/Kombispeicher). */
  wwSpeicherImHeizkreisLiter?: number;
  tVlMaxC?: number;
  p0Bar?: number;
  pSvBar?: number;
}

export interface MagErgebnis {
  anlagenvolumen: Wert;
  n: Wert;
  ve: Wert;
  vv: Wert;
  p0: Wert;
  pe: Wert;
  /** Rechnerisches Mindest-Nennvolumen [l]. */
  vn: Wert;
  /** Nächste Marktstufe [l]. */
  vnMarkt: Wert;
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
}

export function mag(e: MagEingabe, daten: HydraulikDaten): MagErgebnis {
  const hinweise: Hinweis[] = [];
  const m = daten.mag;
  const quelle = 'DIN EN 12828; Tabellenbuch SHK B4 S.400/401 (Wissensbasis K)';
  let anlagenvolumen: Wert;
  if (e.anlagenvolumenLiter !== undefined && e.anlagenvolumenLiter > 0) anlagenvolumen = eingabe(e.anlagenvolumenLiter, 'l', `Anlagenvolumen ${fmt(e.anlagenvolumenLiter, 0)} l (Eingabe)`);
  else {
    const art = e.heizflaechen ?? 'gemischt';
    const lpk = m.anlageninhaltLiterProKw.werte[art] ?? m.anlageninhaltLiterProKw.werte.gemischt ?? 15;
    const qhKw = (e.qhW?.wert ?? 0) / 1000;
    const rohr = qhKw * lpk;
    const va = rohr + (e.pufferLiter ?? 0) + (e.wwSpeicherImHeizkreisLiter ?? 0);
    if (qhKw <= 0) hinweise.push({ stufe: 'warnung', code: 'mag.qh.fehlt', text: 'Anlagenvolumen kann ohne Heizleistung nicht geschätzt werden.' });
    anlagenvolumen = schaetzung(va, 'l', `V_A ≈ ${fmt(qhKw, 1)} kW × ${lpk} l/kW (${art}) = ${fmt(rohr, 0)} l${e.pufferLiter ? ` + Puffer ${fmt(e.pufferLiter, 0)} l` : ''}${e.wwSpeicherImHeizkreisLiter ? ` + Speicher ${fmt(e.wwSpeicherImHeizkreisLiter, 0)} l` : ''} = ${fmt(va, 0)} l`, { quelle, unsicherheit: 25, stufe: 'richtwert' });
  }
  const tVl = e.tVlMaxC ?? 55;
  const n = ausdehnungsfaktor(tVl, daten);
  const veL = (n.wert * anlagenvolumen.wert) / 100;
  const ve = berechnet(veL, 'l', `V_e = n · V_A / 100 = ${fmt(n.wert, 2)} % × ${fmt(anlagenvolumen.wert, 0)} l = ${fmt(veL, 1)} l`, [n, anlagenvolumen], { quelle });
  const vvL = Math.max(m.wasservorlage.minimumLiter, m.wasservorlage.anteil * anlagenvolumen.wert);
  const vv = berechnet(vvL, 'l', `V_V = max(${m.wasservorlage.minimumLiter} l, ${m.wasservorlage.anteil * 100} % × V_A) = ${fmt(vvL, 1)} l`, [anlagenvolumen], { quelle });
  const p0 = e.p0Bar !== undefined && e.p0Bar > 0 ? eingabe(e.p0Bar, 'bar', `Vordruck p_0 ${fmt(e.p0Bar, 1)} bar (Eingabe)`) : fallback(m.druckDefaults.p0Bar, 'bar', `Vordruck p_0 ${fmt(m.druckDefaults.p0Bar, 1)} bar — Standardwert (statische Höhe/10 + ${m.druckDefaults.p0ZuschlagBar} bar)`, { quelle, stufe: 'standardwert' });
  const pSv = e.pSvBar !== undefined && e.pSvBar > 0 ? e.pSvBar : m.druckDefaults.pSvBar;
  const peBar = pSv - m.druckDefaults.peAbstandZuSvBar;
  const pe = berechnet(peBar, 'bar', `Enddruck p_e = p_SV ${fmt(pSv, 1)} − ${m.druckDefaults.peAbstandZuSvBar} = ${fmt(peBar, 1)} bar`, [], { quelle });
  let vnL = 0;
  if (peBar <= p0.wert) hinweise.push({ stufe: 'fehler', code: 'mag.druck.ungueltig', text: `Enddruck ${fmt(peBar, 1)} bar muss über dem Vordruck ${fmt(p0.wert, 1)} bar liegen.` });
  else vnL = ((veL + vvL) * (peBar + 1)) / (peBar - p0.wert);
  const vn = berechnet(vnL, 'l', `V_N,min = (V_e + V_V) · (p_e + 1)/(p_e − p_0) = (${fmt(veL, 1)} + ${fmt(vvL, 1)}) × ${fmt(peBar + 1, 1)}/${fmt(peBar - p0.wert, 1)} = ${fmt(vnL, 1)} l`, [ve, vv, p0], { quelle });
  const markt = aufMarktstufe(vnL, m.nennvolumenReiheLiter.werte, 50);
  const vnMarkt = schaetzung(markt, 'l', `MAG-Nennvolumen ${fmt(vnL, 1)} l → ${fmt(markt, 0)} l (nächste Herstellerstufe)`, { quelle: 'Tabellenbuch SHK B4 S.401 (Herstellerreihe)', stufe: 'marktrundung' });
  return { anlagenvolumen, n, ve, vv, p0, pe, vn, vnMarkt, annahmen: sammleAnnahmen([anlagenvolumen, n, p0, vnMarkt]), hinweise };
}

export interface SicherheitsventilErgebnis {
  dn: string;
  anschluss: string;
  ausblaseleitung: string;
  ansprechdruckBar: number;
  abblaseleistungW: number;
  begruendung: string;
}

/** Sicherheitsventil nach Abblaseleistung = WP-Leistung + Elektro-Heizstab (B4 S.399, DIN EN 12828). */
export function sicherheitsventil(abblaseleistungW: number, daten: HydraulikDaten): SicherheitsventilErgebnis | null {
  if (!(abblaseleistungW > 0)) return null;
  const kw = abblaseleistungW / 1000;
  const stufe = daten.sicherheitsventil.stufen.find((s) => kw <= s.bisKw) ?? daten.sicherheitsventil.stufen[daten.sicherheitsventil.stufen.length - 1]!;
  return {
    dn: stufe.dn,
    anschluss: stufe.anschluss,
    ausblaseleitung: stufe.ausblaseleitung,
    ansprechdruckBar: daten.sicherheitsventil.ansprechdruckBar,
    abblaseleistungW,
    begruendung: `Abblaseleistung ${fmt(kw, 1)} kW ≤ ${stufe.bisKw} kW → ${stufe.dn} (${stufe.anschluss}), Ansprechdruck ${fmt(daten.sicherheitsventil.ansprechdruckBar, 1)} bar (DIN EN 12828, Tabellenbuch B4 S.399)`,
  };
}
