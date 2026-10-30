// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Projektregeln (KONTEXT.md §2):
 *  - Schweizer Schreibweise: kein Eszett in Quelltext, Strings, Kommentaren.
 *  - Schichten: src/kern importiert nie aus src/ui (und nicht aus preact/DOM).
 */

/** Schweizer Deutsch: kein Eszett (U+00DF) — gilt für Literale, Template-Strings, JSX-Text und Kommentare. */
const ESZETT = '\u00DF';
const keinEszett = {
  meta: { type: 'problem', messages: { eszett: 'Kein \u00AB\u00DF\u00BB \u2014 Schweizer Schreibweise (ss) verwenden.' } },
  create(context) {
    const src = context.sourceCode;
    return {
      Program() {
        const text = src.text;
        let idx = text.indexOf(ESZETT);
        while (idx !== -1) {
          context.report({ loc: src.getLocFromIndex(idx), messageId: 'eszett' });
          idx = text.indexOf(ESZETT, idx + 1);
        }
      },
    };
  },
};

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'referenz/**',
      'docs/**',
      'playwright-report/**',
      'test-results/**',
      '../public/heizlast-neu/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    plugins: { thermowerk: { rules: { 'kein-eszett': keinEszett } } },
    rules: {
      'thermowerk/kein-eszett': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Node-Skripte (Datengeneratoren): Node-Globals erlaubt.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', fetch: 'readonly', console: 'readonly' } },
  },
  {
    // Rechenkern: rein, DOM-frei, kein UI-Import.
    files: ['src/kern/**/*.{ts,tsx}', 'src/daten/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/ui/**', '@ui/*'], message: 'Kern/Daten importieren nie aus src/ui (KONTEXT §2 Schichten).' },
            { group: ['**/bericht/**', '@bericht/*'], message: 'Kern/Daten importieren nie aus src/bericht.' },
            { group: ['preact', 'preact/*', '@preact/*'], message: 'Kern ist UI-frei: kein preact im Kern.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'fetch'],
    },
  },
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    rules: { 'no-console': 'off' },
  },
);
