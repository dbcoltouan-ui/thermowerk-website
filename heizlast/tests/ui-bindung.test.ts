import { describe, expect, it } from 'vitest';
import { parseZahl, zahlFuerFeld } from '../src/ui/bindung';
import { erstelleStore, leseAusState } from '../src/state/store';
import { alleDaten } from '../src/daten/index';

/** Session 7: Eingabe-Parsing (Schweizer Schreibweise) und Listenpfade für die UI-Bindung. */
describe('UI-Bindung', () => {
  it('parst Zahlen in Schweizer Schreibweise', () => {
    expect(parseZahl("23'000.5")).toBe(23000.5);
    expect(parseZahl('12,5')).toBe(12.5);
    expect(parseZahl(' -7 ')).toBe(-7);
    expect(parseZahl('')).toBeUndefined();
    expect(parseZahl('12a')).toBeNaN();
    expect(zahlFuerFeld(0.1 + 0.2)).toBe('0.3');
    expect(zahlFuerFeld(undefined)).toBe('');
  });

  it('liest und ergänzt Listen über ids (eine Neuberechnung, keine abgeleiteten Werte im State)', () => {
    let n = 0;
    const store = erstelleStore({ daten: alleDaten(), uhr: () => '2026-10-29T12:00:00.000Z', neueId: (p) => `${p}${++n}` });
    const id = store.hinzufuegen('sanierungen', { massnahme: 'fenster', status: 'ausgefuehrt' }, 's');
    expect(id).toBe('s2');
    expect(leseAusState(store.state.value, `sanierungen.${id}.massnahme`)).toBe('fenster');
    const r = store.raumHinzufuegen({ flaecheM2: 20 });
    const b = store.hinzufuegen(`raeume.${r}.bauteile`, { art: 'aussenwand', flaecheM2: 10, anschluss: { art: 'aussen' } }, 'b');
    expect(leseAusState(store.state.value, `raeume.${r}.bauteile.${b}.flaecheM2`)).toBe(10);
    store.setze(`raeume.${r}.bauteile.${b}`, undefined);
    expect(leseAusState(store.state.value, `raeume.${r}.bauteile`)).toEqual([]);
    expect(leseAusState(store.state.value, 'gibt.es.nicht')).toBeUndefined();
  });
});
