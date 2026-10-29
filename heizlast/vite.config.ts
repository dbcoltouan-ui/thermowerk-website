/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath, URL } from 'node:url';

// Staging-Pfad bis zum Go-Live (Session 12): /heizlast-neu/ — Live /heizlast/ bleibt unberührt.
export const BASE_PFAD = '/heizlast-neu/';

const alias = {
  '@kern': fileURLToPath(new URL('./src/kern', import.meta.url)),
  '@daten': fileURLToPath(new URL('./src/daten', import.meta.url)),
  '@state': fileURLToPath(new URL('./src/state', import.meta.url)),
  '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
  '@bericht': fileURLToPath(new URL('./src/bericht', import.meta.url)),
  '@data': fileURLToPath(new URL('./data', import.meta.url)),
};

export default defineConfig({
  base: BASE_PFAD,
  plugins: [preact()],
  resolve: { alias },
  build: {
    // Output direkt in den Astro-public-Ordner der Website → Pages liefert ihn mit aus.
    outDir: fileURLToPath(new URL('../public/heizlast-neu', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'referenz/**'],
    environment: 'node',
  },
});
