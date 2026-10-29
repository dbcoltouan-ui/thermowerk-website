import { render } from 'preact';
import { App } from './ui/App';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/shell.css';

const wurzel = document.getElementById('app');
if (!wurzel) throw new Error('Element #app fehlt in index.html');
render(<App />, wurzel);
