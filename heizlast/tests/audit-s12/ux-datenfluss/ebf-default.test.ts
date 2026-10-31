/** Audit S12: §5.1 Schritt 1 — «EBF: aus Räumen (Default in B)». Neues Projekt, Methode raumweise, Räume erfasst, EBF unberührt. */
import { describe, expect, it } from 'vitest';
import { alleDaten } from '../../../src/daten/index';
import { berechne } from '../../../src/kern/berechne';
import { neuerState } from '../../../src/state/schema';
import { setzeImState } from '../../../src/state/store';

describe('EBF-Default im raumweisen Modus', () => {
  it('ohne Eingriff: ebfModus bleibt «manuell» → Warnung «EBF manuell gewählt, aber kein Wert» obwohl Räume da sind (Ist-Stand)', () => {
    let s = neuerState({ id: 'p', jetzt: '2026-10-31T00:00:00.000Z' });
    s = setzeImState(s, 'methode', 'raumweise');
    s = setzeImState(s, 'gebaeude.baujahr', 1965);
    s = setzeImState(s, 'gebaeude.typ', 'efh');
    s = setzeImState(s, 'raeume', [{ id: 'r1', name: 'Wohnen', typ: 'wohnen', flaecheM2: 25, bauteile: [{ id: 'b1', art: 'aussenwand', flaecheM2: 10, anschluss: { art: 'aussen' } }] }]);
    const e = berechne(s, daten());
    console.log(`ebfModus=${s.gebaeude.ebfModus}; EBF=${e.ebf?.wert} (${e.ebf?.herkunft}); Hinweise gebaeude: ${e.hinweise.filter((h) => h.schritt === 'gebaeude').map((h) => `${h.stufe}:${h.code}`).join(', ')}; status.gebaeude=${e.status.gebaeude}`);
    expect(s.gebaeude.ebfModus).toBe('manuell');
    expect(e.ebf?.wert).toBeCloseTo(27.5, 1);
    expect(e.hinweise.some((h) => h.code === 'ebf.manuellFehlt' && h.stufe === 'warnung')).toBe(true);
    expect(e.status.gebaeude).toBe('warnung');
  });
});
const daten = () => alleDaten();
