import { render } from 'preact';
import { App } from './ui/App';
import { verwaltung } from './state/app';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/shell.css';
import './ui/styles/komponenten.css';
import './bericht/bericht.css';

// Entwurf laden und Autosave starten; ausstehende Sicherung beim Verlassen/Verbergen sofort schreiben.
verwaltung.starten();
window.addEventListener('pagehide', () => verwaltung.sichern());
// Cloud: beim Zurückkehren (höchstens alle 30 s) und bei wiederhergestellter Verbindung abgleichen.
let letzterAbgleich = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') verwaltung.sichern();
  else if (Date.now() - letzterAbgleich > 30_000) {
    letzterAbgleich = Date.now();
    void verwaltung.cloudAbgleichen();
  }
});
window.addEventListener('online', () => void verwaltung.cloudAbgleichen());
window.addEventListener('offline', () => verwaltung.cloudOffline());

const wurzel = document.getElementById('app');
if (!wurzel) throw new Error('Element #app fehlt in index.html');
render(<App />, wurzel);
