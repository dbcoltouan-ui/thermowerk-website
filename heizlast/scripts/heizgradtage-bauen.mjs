#!/usr/bin/env node
/**
 * Erzeugt data/heizgradtage.json: Monats-Heizgradtage HGT 20/12 je SIA-2028-Station aus den Tagesmitteln der
 * MeteoSchweiz-Open-Data (SwissMetNet, Parameter tre200d0 = Lufttemperatur 2 m, Tagesmittel).
 *
 * Definition (SIA 2028 / MeteoSchweiz): HGT 20/12 = Σ über alle Tage mit Tagesmittel < 12 °C von (20 − Tagesmittel).
 * Teilmonate werden im Kern anteilig nach Tagen aus dem Monatswert genähert (kern/heizgradtage.ts).
 *
 * Aufruf (aus heizlast/):   node scripts/heizgradtage-bauen.mjs [--von 2015] [--bis 2026-09]
 * Quelle je Station:        https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/<abk>/ogd-smn_<abk>_d_historical.csv
 *                           https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/<abk>/ogd-smn_<abk>_d_recent.csv
 * Lizenz: MeteoSchweiz Open Government Data (opendata.swiss «BY», Quellenangabe nötig).
 *
 * Kontrolle: je Station wird zusätzlich das langjährige Mittel 1984–2003 (Referenzperiode von SIA 2028 Tabelle 6)
 * aus denselben Tagesdaten gerechnet und mit dem SIA-Wert in klimastationen.json verglichen (_meta.kontrolle).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const BASIS = 'https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn';

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const JAHR_VON = Number(arg('--von', '2015'));
const heute = new Date();
// letzter vollständiger Monat (UTC)
const letzterMonat = new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), 1) - 1);
const BIS = arg('--bis', `${letzterMonat.getUTCFullYear()}-${String(letzterMonat.getUTCMonth() + 1).padStart(2, '0')}`);
const [BIS_JAHR, BIS_MONAT] = BIS.split('-').map(Number);

const klima = JSON.parse(readFileSync(join(WURZEL, 'data', 'klimastationen.json'), 'utf8'));
const stationen = klima.stationen.map((s) => ({ key: s.key, abk: s.abk, name: s.name, siaHgt: s.hgt2012Kd }));

const RAUM = 20;
const GRENZE = 12;

async function lade(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.text();
}

/** CSV → Map 'YYYY-MM-DD' → Tagesmittel (null bei Lücke). */
function tagesmittel(csv) {
  const zeilen = csv.split(/\r?\n/).filter(Boolean);
  const kopf = zeilen[0].split(';');
  const iT = kopf.indexOf('reference_timestamp');
  const iV = kopf.indexOf('tre200d0');
  if (iT < 0 || iV < 0) throw new Error('Spalten reference_timestamp/tre200d0 fehlen');
  const out = new Map();
  for (const z of zeilen.slice(1)) {
    const f = z.split(';');
    const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(f[iT]);
    if (!m) continue;
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    const v = f[iV];
    out.set(iso, v === '' || v === undefined ? null : Number(v));
  }
  return out;
}

function tageImMonat(j, m) {
  return new Date(Date.UTC(j, m, 0)).getUTCDate();
}

async function station(s) {
  const [hist, recent] = await Promise.all([lade(`${BASIS}/${s.abk.toLowerCase()}/ogd-smn_${s.abk.toLowerCase()}_d_historical.csv`), lade(`${BASIS}/${s.abk.toLowerCase()}/ogd-smn_${s.abk.toLowerCase()}_d_recent.csv`).catch(() => '')]);
  const t = tagesmittel(hist);
  if (recent) for (const [k, v] of tagesmittel(recent)) t.set(k, v);

  const monate = {};
  const luecken = {};
  let ersterMonat = null;
  for (let j = JAHR_VON; j <= BIS_JAHR; j++) {
    const werte = [];
    const fehl = [];
    for (let m = 1; m <= 12; m++) {
      if (j === BIS_JAHR && m > BIS_MONAT) break;
      const n = tageImMonat(j, m);
      let hgt = 0;
      let fehlend = 0;
      for (let d = 1; d <= n; d++) {
        const iso = `${j}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const v = t.get(iso);
        if (v === null || v === undefined || Number.isNaN(v)) {
          fehlend++;
          continue;
        }
        if (v < GRENZE) hgt += RAUM - v;
      }
      // Monat nur gültig, wenn höchstens 3 Tage fehlen (dann anteilig hochgerechnet).
      if (fehlend > 3 || fehlend === n) {
        werte.push(null);
        fehl.push(fehlend);
      } else {
        werte.push(Math.round((hgt * n) / (n - fehlend)));
        fehl.push(fehlend);
        if (!ersterMonat) ersterMonat = `${j}-${String(m).padStart(2, '0')}`;
      }
    }
    monate[j] = werte;
    if (fehl.some((x) => x > 0)) luecken[j] = fehl;
  }

  // Kontrolle: Jahresmittel 1984–2003 (SIA 2028 Referenzperiode)
  let summe = 0;
  let jahre = 0;
  for (let j = 1984; j <= 2003; j++) {
    let hgt = 0;
    let fehlend = 0;
    for (let m = 1; m <= 12; m++) {
      const n = tageImMonat(j, m);
      for (let d = 1; d <= n; d++) {
        const v = t.get(`${j}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        if (v === null || v === undefined || Number.isNaN(v)) fehlend++;
        else if (v < GRENZE) hgt += RAUM - v;
      }
    }
    if (fehlend <= 10) {
      summe += hgt;
      jahre++;
    }
  }
  const mittel8403 = jahre ? Math.round(summe / jahre) : null;
  return { key: s.key, abk: s.abk, name: s.name, monate, luecken, kontrolle: { mittel1984_2003: mittel8403, jahre, sia2028: s.siaHgt, abweichungProzent: mittel8403 && s.siaHgt ? Math.round(((mittel8403 - s.siaHgt) / s.siaHgt) * 1000) / 10 : null } };
}

const ergebnisse = [];
for (const s of stationen) {
  process.stderr.write(`${s.abk} … `);
  try {
    ergebnisse.push(await station(s));
    process.stderr.write('ok\n');
  } catch (e) {
    process.stderr.write(`FEHLER ${e.message}\n`);
    ergebnisse.push({ key: s.key, abk: s.abk, name: s.name, monate: {}, luecken: {}, fehler: String(e.message) });
  }
}

const stand = heute.toISOString().slice(0, 10);
const out = {
  _meta: {
    version: '1.0.0',
    stand,
    beschreibung: `Monats-Heizgradtage HGT 20/12 [Kd] je SIA-2028-Station, ${JAHR_VON}-01 bis ${BIS}, aus MeteoSchweiz-Tagesmitteln (tre200d0, SwissMetNet). HGT 20/12 = Σ (20 − θ_Tagesmittel) über Tage mit θ < 12 °C. Monate mit mehr als 3 fehlenden Tagen sind null; bis 3 fehlende Tage anteilig hochgerechnet (luecken). Erzeugt mit scripts/heizgradtage-bauen.mjs. Keine Rechenlogik.`,
    quellen: [
      {
        id: 'meteoschweiz-ogd-smn',
        titel: 'MeteoSchweiz Open Government Data, automatische Wetterstationen (SwissMetNet), Tageswerte: Parameter tre200d0 «Lufttemperatur 2 m über Boden; Tagesmittel» (ogd-smn_<station>_d_historical.csv / _recent.csv)',
        art: 'Behördendaten (OGD, opendata.swiss «BY» — Quellenangabe nötig)',
        url: 'https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/',
        abgerufen: stand,
      },
      {
        id: 'meteoschweiz-hgt',
        titel: 'MeteoSchweiz, Definition Heizgradtage HGT 20/12 (Raumtemperatur 20 °C, Heizgrenze 12 °C, Tagesmittel) — gleiche Definition wie SIA 2028 Tabelle 6 / SIA 380/1',
        art: 'Fachdokumentation',
        url: 'https://www.meteoschweiz.admin.ch/service-und-publikationen/applikationen/heizgradtage.html',
        abgerufen: stand,
      },
      {
        id: 'sia2028-c1',
        titel: 'SIA 2028-C1:2015 Tabelle 6: langjährige HGT 20/12 (Mittel 1984–2003) — Kontrollwerte (klimastationen.json)',
        art: 'Norm (öffentliche Korrigenda)',
        url: 'https://shop.sia.ch/882ade35-34e4-419f-8dd5-2c44bdfcc7f7/D/DownloadAnhang',
        abgerufen: '2026-10-29',
      },
    ],
    parameter: { raumtemperaturC: RAUM, heizgrenzeC: GRENZE, parameterOgd: 'tre200d0', maxFehltageJeMonat: 3 },
    zeitraum: { von: `${JAHR_VON}-01`, bis: BIS },
    kontrolle: 'Je Station: eigenes Mittel 1984–2003 aus denselben Tagesdaten gegen SIA 2028 (Abweichung in %); Stationsverlegungen (z. B. Bern-Liebefeld → Zollikofen) erklären Abweichungen.',
  },
  stationen: Object.fromEntries(ergebnisse.map((e) => [e.key, { abk: e.abk, name: e.name, quelle: ['meteoschweiz-ogd-smn'], monate: e.monate, luecken: e.luecken, kontrolle: e.kontrolle ?? null, ...(e.fehler ? { fehler: e.fehler } : {}) }])),
};
writeFileSync(join(WURZEL, 'data', 'heizgradtage.json'), JSON.stringify(out, null, 1) + '\n');
process.stderr.write(`data/heizgradtage.json geschrieben (${ergebnisse.filter((e) => !e.fehler).length}/${stationen.length} Stationen)\n`);
