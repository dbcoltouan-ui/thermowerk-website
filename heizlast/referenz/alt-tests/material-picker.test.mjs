/**
 * Tests — Material-Picker (portiert aus Heizlast Pro · 2026-04-29 Session 2)
 * ===========================================================================
 * Quelle: Heizlast Pro/tests/test-material-picker.mjs
 *
 * Deckt die 4 Bauteile (aussenwand/dach/boden/fenster) mit jeweils
 * 5+ Faellen ab:
 *   1. Alles bekannt
 *   2. Nur Bauweise unbekannt (gemischt)
 *   3. Nur Daemm-Dicke unbekannt (gemischt)
 *   4. Alles unbekannt (voll-unbekannt → Baujahr-Lookup)
 *   5. Doppelmauerwerk-Sonderregel (nur AW)
 *
 * Plus: getStufen-Strukturpruefung, Quellcode-Shape-Pruefung
 * (im Tool: Source-Module statt scripts/material-picker-inline.js,
 * weil das Tool ueber build/bundle.mjs zu einer einzigen index.html
 * gebundelt wird — kein separater Inline-Spiegel noetig).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  BAUWEISEN,
  DAEMM_DICKEN,
  FENSTER_GEN_DEFAULT_BY_BK,
  getStufen,
  computeUWert,
} from '../src/calc/material-picker.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/* ==============================================================
   getStufen — Struktur-Tests
   ============================================================== */
describe('Material-Picker · getStufen Struktur', () => {
  it('AW liefert 5 Stufen mit den erwarteten keys', () => {
    const r = getStufen('aw', 1980, {});
    assert.equal(r.fenster, false);
    assert.equal(r.stufen.length, 5);
    const keys = r.stufen.map(s => s.key);
    assert.deepEqual(keys, ['bauweise', 'dicke', 'hatDaemmung', 'daemmstoff', 'daemmDicke']);
  });

  it('Dach liefert 5 Stufen', () => {
    const r = getStufen('dach', 1980, {});
    assert.equal(r.stufen.length, 5);
    assert.equal(r.stufen[0].key, 'bauweise');
  });

  it('Boden liefert 5 Stufen', () => {
    const r = getStufen('boden', 1980, {});
    assert.equal(r.stufen.length, 5);
  });

  it('Fenster liefert 1 Stufe (Generation)', () => {
    const r = getStufen('fenster', 1980, {});
    assert.equal(r.fenster, true);
    assert.equal(r.stufen.length, 1);
    assert.equal(r.stufen[0].key, 'generation');
  });

  it('AW Bauweise-Stufe enthaelt Unbekannt-Option', () => {
    const r = getStufen('aw', 1980, {});
    const opts = r.stufen[0].options;
    assert.ok(opts.some(o => o.value === null), 'Unbekannt-Option fehlt');
    assert.match(opts[opts.length - 1].label, /Unbekannt/);
  });

  it('Alle 5 Stufen haben eine Unbekannt-Option (AW)', () => {
    const r = getStufen('aw', 1980, {});
    for (const stufe of r.stufen) {
      const hatNull = stufe.options.some(o => o.value === null);
      assert.ok(hatNull, `Stufe ${stufe.key} hat keine Unbekannt-Option`);
    }
  });

  it('AW Bauweise-Default fuer 1980 = hochlochziegel', () => {
    const r = getStufen('aw', 1980, {});
    assert.equal(r.stufen[0].defaultIfUnknown, 'hochlochziegel');
  });

  it('AW Bauweise-Default fuer vor1945 = vollziegel', () => {
    const r = getStufen('aw', 1900, {});
    assert.equal(r.stufen[0].defaultIfUnknown, 'vollziegel');
  });

  it('AW hatDaemmung-Default ist false fuer vor1978, true ab 1978', () => {
    assert.equal(getStufen('aw', 1900, {}).stufen[2].defaultIfUnknown, false);
    assert.equal(getStufen('aw', 1970, {}).stufen[2].defaultIfUnknown, false);
    assert.equal(getStufen('aw', 1985, {}).stufen[2].defaultIfUnknown, true);
    assert.equal(getStufen('aw', 2010, {}).stufen[2].defaultIfUnknown, true);
  });

  it('Doppelmauerwerk: hatDaemmung-Stufe nur "Ja"-Option, locked', () => {
    const r = getStufen('aw', 1980, { bauweise: 'doppelmauerwerk' });
    assert.equal(r.isDoppelmauerwerk, true);
    assert.equal(r.stufen[2].options.length, 1);
    assert.equal(r.stufen[2].options[0].value, true);
    assert.equal(r.stufen[2].locked, true);
  });

  it('Fenster Generation-Default fuer 1980 = 2fach_unbeschichtet', () => {
    const r = getStufen('fenster', 1980, {});
    assert.equal(r.stufen[0].defaultIfUnknown, '2fach_unbeschichtet');
  });
});

/* ==============================================================
   AW · 5 Faelle
   ============================================================== */
describe('Material-Picker · Aussenwand', () => {
  it('Fall 1: alles bekannt (HLZ 24, EPS 14 cm) → U ≈ 0.21', () => {
    const r = computeUWert('aw', 1980, {
      bauweise: 'hochlochziegel', dicke: 0.24,
      hatDaemmung: true, daemmstoff: 'eps', daemmDicke: 0.14,
    });
    assert.equal(r.quelle, 'voll-bekannt');
    assert.equal(r.unbekanntStufen.length, 0);
    assert.ok(r.uWert > 0.18 && r.uWert < 0.25, `U=${r.uWert} ausserhalb 0.18..0.25`);
    assert.equal(r.marker, 'gemessen');
  });

  it('Fall 2: nur Bauweise unbekannt → quelle=gemischt, Default greift', () => {
    const r = computeUWert('aw', 1980, {
      bauweise: null, dicke: 0.24,
      hatDaemmung: true, daemmstoff: 'eps', daemmDicke: 0.14,
    });
    assert.equal(r.quelle, 'gemischt');
    assert.deepEqual(r.unbekanntStufen, ['bauweise']);
    assert.equal(r.defaultsAngewendet.bauweise, 'hochlochziegel');
    assert.equal(r.marker, 'gemischt');
  });

  it('Fall 3: nur Daemm-Dicke unbekannt → quelle=gemischt, Default 8 cm', () => {
    const r = computeUWert('aw', 1980, {
      bauweise: 'hochlochziegel', dicke: 0.24,
      hatDaemmung: true, daemmstoff: 'eps', daemmDicke: null,
    });
    assert.equal(r.quelle, 'gemischt');
    assert.deepEqual(r.unbekanntStufen, ['daemmDicke']);
    assert.equal(r.defaultsAngewendet.daemmDicke, 0.08);
    assert.ok(r.uWert != null);
  });

  it('Fall 4: alles unbekannt vor1945 → voll-unbekannt, Baujahr-typ 1.8', () => {
    const r = computeUWert('aw', 1900, {});
    assert.equal(r.quelle, 'voll-unbekannt');
    assert.equal(r.uWert, 1.8);
    assert.equal(r.marker, 'baujahr');
    assert.equal(r.defaultsAngewendet.quelle, 'baujahr-typ-uwert');
  });

  it('Fall 4b: alles unbekannt 2010 → voll-unbekannt, Baujahr-typ 0.20', () => {
    const r = computeUWert('aw', 2010, {});
    assert.equal(r.quelle, 'voll-unbekannt');
    assert.equal(r.uWert, 0.20);
  });

  it('Fall 5: Doppelmauerwerk-Sonderregel → hatDaemmung auto-true', () => {
    const r = computeUWert('aw', 1980, {
      bauweise: 'doppelmauerwerk', dicke: 0.40,
      daemmstoff: 'mineralwolle', daemmDicke: 0.06,
    });
    assert.equal(r.quelle, 'voll-bekannt');
    assert.equal(r.defaultsAngewendet.hatDaemmung, true);
    assert.ok(r.uWert > 0.40 && r.uWert < 0.55, `U=${r.uWert} fuer Doppelmauerwerk MW6 nicht plausibel`);
    // hatDaemmung darf NICHT in unbekanntStufen sein bei Doppel:
    assert.ok(!r.unbekanntStufen.includes('hatDaemmung'));
  });

  it('Fall 5b: Doppelmauerwerk + sel.hatDaemmung=false wird ignoriert', () => {
    const r = computeUWert('aw', 1980, {
      bauweise: 'doppelmauerwerk', dicke: 0.40, hatDaemmung: false,
      daemmstoff: 'mineralwolle', daemmDicke: 0.06,
    });
    assert.equal(r.defaultsAngewendet.hatDaemmung, true);
  });

  it('Fall 6: hatDaemmung=false explizit → keine Daemm-Schicht im Stack', () => {
    const r = computeUWert('aw', 1980, {
      bauweise: 'hochlochziegel', dicke: 0.24, hatDaemmung: false,
    });
    assert.equal(r.quelle, 'voll-bekannt');
    assert.ok(r.uWert > 0.7, `U=${r.uWert} sollte hoch sein bei HLZ24 ohne Daemmung`);
    // daemmstoff und daemmDicke nicht in defaultsAngewendet:
    assert.equal(r.defaultsAngewendet.daemmstoff, undefined);
  });

  it('U-Wert sinkt bei zunehmender Daemm-Dicke (Plausi)', () => {
    const u4 = computeUWert('aw', 1980, { bauweise:'hochlochziegel', dicke:0.24, hatDaemmung:true, daemmstoff:'eps', daemmDicke:0.04 }).uWert;
    const u14 = computeUWert('aw', 1980, { bauweise:'hochlochziegel', dicke:0.24, hatDaemmung:true, daemmstoff:'eps', daemmDicke:0.14 }).uWert;
    const u24 = computeUWert('aw', 1980, { bauweise:'hochlochziegel', dicke:0.24, hatDaemmung:true, daemmstoff:'eps', daemmDicke:0.24 }).uWert;
    assert.ok(u4 > u14, `u4=${u4} sollte > u14=${u14}`);
    assert.ok(u14 > u24, `u14=${u14} sollte > u24=${u24}`);
  });
});

/* ==============================================================
   Dach · 5 Faelle
   ============================================================== */
describe('Material-Picker · Dach', () => {
  it('Fall 1: alles bekannt (Steildach Holz, MW 20 cm) → U < 0.20', () => {
    const r = computeUWert('dach', 2000, {
      bauweise: 'steildach_holz', dicke: 0.20,
      hatDaemmung: true, daemmstoff: 'mineralwolle', daemmDicke: 0.20,
    });
    assert.equal(r.quelle, 'voll-bekannt');
    assert.ok(r.uWert < 0.22, `U=${r.uWert} sollte < 0.22 sein`);
  });

  it('Fall 2: nur Bauweise unbekannt → Default steildach_holz', () => {
    const r = computeUWert('dach', 2000, {
      bauweise: null, dicke: 0.20,
      hatDaemmung: true, daemmstoff: 'mineralwolle', daemmDicke: 0.20,
    });
    assert.equal(r.quelle, 'gemischt');
    assert.equal(r.defaultsAngewendet.bauweise, 'steildach_holz');
  });

  it('Fall 3: nur Daemm-Dicke unbekannt → Default 22 cm fuer 2000', () => {
    const r = computeUWert('dach', 2005, {
      bauweise: 'steildach_holz', dicke: 0.20,
      hatDaemmung: true, daemmstoff: 'mineralwolle', daemmDicke: null,
    });
    assert.equal(r.quelle, 'gemischt');
    assert.equal(r.defaultsAngewendet.daemmDicke, 0.22);
  });

  it('Fall 4: alles unbekannt 2005 → voll-unbekannt, Baujahr-typ 0.20', () => {
    const r = computeUWert('dach', 2005, {});
    assert.equal(r.quelle, 'voll-unbekannt');
    assert.equal(r.uWert, 0.20);
  });

  it('Fall 4b: alles unbekannt vor1945 → 1.50 (Steildach-typ)', () => {
    const r = computeUWert('dach', 1900, {});
    assert.equal(r.quelle, 'voll-unbekannt');
    assert.equal(r.uWert, 1.5);
  });

  it('Fall 5: Flachdach Beton voll-bekannt → plausibler U-Wert', () => {
    const r = computeUWert('dach', 2010, {
      bauweise: 'flachdach_beton', dicke: 0.20,
      hatDaemmung: true, daemmstoff: 'pur', daemmDicke: 0.20,
    });
    assert.equal(r.quelle, 'voll-bekannt');
    assert.ok(r.uWert < 0.20, `U=${r.uWert} fuer Flachdach 20cm PUR sollte < 0.20`);
  });
});

/* ==============================================================
   Boden · 5 Faelle
   ============================================================== */
describe('Material-Picker · Boden', () => {
  it('Fall 1: alles bekannt (Stahlbeton 20, XPS 12) → U ≈ 0.25', () => {
    const r = computeUWert('boden', 2005, {
      bauweise: 'stahlbeton', dicke: 0.20,
      hatDaemmung: true, daemmstoff: 'xps', daemmDicke: 0.12,
    });
    assert.equal(r.quelle, 'voll-bekannt');
    assert.ok(r.uWert > 0.20 && r.uWert < 0.30, `U=${r.uWert} ausserhalb 0.20..0.30`);
  });

  it('Fall 2: nur Bauweise unbekannt → Default stahlbeton', () => {
    const r = computeUWert('boden', 2005, {
      bauweise: null, dicke: 0.20,
      hatDaemmung: true, daemmstoff: 'xps', daemmDicke: 0.12,
    });
    assert.equal(r.quelle, 'gemischt');
    assert.equal(r.defaultsAngewendet.bauweise, 'stahlbeton');
  });

  it('Fall 3: nur Daemm-Dicke unbekannt → Default 12 cm fuer 2005', () => {
    const r = computeUWert('boden', 2005, {
      bauweise: 'stahlbeton', dicke: 0.20,
      hatDaemmung: true, daemmstoff: 'xps', daemmDicke: null,
    });
    assert.equal(r.quelle, 'gemischt');
    assert.equal(r.defaultsAngewendet.daemmDicke, 0.12);
  });

  it('Fall 4: alles unbekannt 1980 → voll-unbekannt, Baujahr-typ 0.50', () => {
    const r = computeUWert('boden', 1980, {});
    assert.equal(r.quelle, 'voll-unbekannt');
    assert.equal(r.uWert, 0.50);
  });

  it('Fall 5: Holzbalkendecke voll-bekannt → plausibler U-Wert', () => {
    const r = computeUWert('boden', 1980, {
      bauweise: 'holzbalken', dicke: 0.22,
      hatDaemmung: true, daemmstoff: 'mineralwolle', daemmDicke: 0.10,
    });
    assert.equal(r.quelle, 'voll-bekannt');
    assert.ok(r.uWert != null && r.uWert < 0.50);
  });
});

/* ==============================================================
   Fenster · 5 Faelle
   ============================================================== */
describe('Material-Picker · Fenster', () => {
  it('Fall 1: 2-fach unbeschichtet → Uw 2.80', () => {
    const r = computeUWert('fenster', 1980, { generation: '2fach_unbeschichtet' });
    assert.equal(r.uWert, 2.8);
    assert.equal(r.quelle, 'voll-bekannt');
  });

  it('Fall 2: Einfach → Uw 5.20', () => {
    const r = computeUWert('fenster', 1900, { generation: 'einfach' });
    assert.equal(r.uWert, 5.2);
  });

  it('Fall 3: 3-fach Standard → Uw 0.95', () => {
    const r = computeUWert('fenster', 2010, { generation: '3fach' });
    assert.equal(r.uWert, 0.95);
  });

  it('Fall 4: Generation null → Default per Baujahr (2010 → 3fach)', () => {
    const r = computeUWert('fenster', 2010, {});
    assert.equal(r.uWert, 0.95);
    assert.equal(r.quelle, 'voll-unbekannt');
    assert.equal(r.defaultsAngewendet.generation, '3fach');
  });

  it('Fall 5: Generation null vor1945 → einfach (Uw 5.20)', () => {
    const r = computeUWert('fenster', 1900, {});
    assert.equal(r.uWert, 5.2);
    assert.equal(r.defaultsAngewendet.generation, 'einfach');
  });

  it('FENSTER_GEN_DEFAULT_BY_BK liefert alle 9 Baujahrsklassen', () => {
    const erwartet = ['vor1945', '1946_1960', '1961_1977', '1978_1994', '1995_2000', '2001_2009', '2010_2015', '2016_heute', 'minergie'];
    for (const k of erwartet) {
      assert.ok(FENSTER_GEN_DEFAULT_BY_BK[k], `FENSTER_GEN_DEFAULT_BY_BK fehlt fuer ${k}`);
    }
  });
});

/* ==============================================================
   Source-Code-Shape-Pruefung (im Pro: Sync mit Inline-Spiegel;
   im Tool: keine separaten Inline-Spiegel — wir bestaetigen statt-
   dessen, dass die Source-Module die wesentlichen Symbole/Pfade
   enthalten. Der Bundle-Build via build/bundle.mjs zieht diese
   Source-Module spaeter inline ins index.html.)
   ============================================================== */
describe('Material-Picker · Source-Code-Shape', () => {
  const pickerSrc   = readFileSync(resolve(ROOT, 'src/calc/material-picker.mjs'), 'utf-8');
  const envelopeSrc = readFileSync(resolve(ROOT, 'src/calc/envelope.mjs'), 'utf-8');

  it('material-picker.mjs exportiert computeUWert + getStufen', () => {
    assert.match(pickerSrc, /export\s+function\s+computeUWert\s*\(/);
    assert.match(pickerSrc, /export\s+function\s+getStufen\s*\(/);
  });

  it('material-picker.mjs hat alle 8 AW-Bauweisen-Keys textuell', () => {
    const esmKeys = BAUWEISEN.aussenwand.map(b => b.key);
    for (const key of esmKeys) {
      assert.ok(pickerSrc.includes(`'${key}'`) || pickerSrc.includes(`"${key}"`),
        `Picker-Source fehlt Bauweise-Key ${key}`);
    }
  });

  it('material-picker.mjs hat 12 Daemm-Dicken (DAEMM_DICKEN-Konstante)', () => {
    assert.equal(DAEMM_DICKEN.length, 12);
    assert.match(pickerSrc, /export\s+const\s+DAEMM_DICKEN\s*=\s*\[/);
  });

  it('envelope.mjs hat uWertAusSchichten + bauteilDefaultsFor exportiert', () => {
    assert.match(envelopeSrc, /export\s+function\s+uWertAusSchichten\s*\(/);
    assert.match(envelopeSrc, /export\s+function\s+bauteilDefaultsFor\s*\(/);
  });

  it('envelope.mjs hat BAUJAHR_UWERT-Tabelle mit aussenwand vor1945 = 1.8', () => {
    assert.match(envelopeSrc, /BAUJAHR_UWERT\s*=\s*\{/);
    // wandUWert.EFH.vor1945 = 1.8
    assert.match(envelopeSrc, /vor1945:\s*\{\s*typ:\s*1\.8\s*\}/);
  });

  it('material-picker.mjs hat Doppelmauerwerk-Sonderregel-Pfad', () => {
    assert.match(pickerSrc, /isDoppel\s*=\s*bwKey\s*===\s*'doppelmauerwerk'/);
    assert.match(pickerSrc, /Kerndaemmung/);
  });
});
