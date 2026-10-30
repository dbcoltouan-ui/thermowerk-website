import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke gegen die deployte Staging-URL (KONTEXT §4: Claude prüft den Deploy selbst).
 * Gleiche Tests wie lokal, ohne lokalen Server; Screenshots landen im Ausgabeordner, nicht in docs/.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['shell.spec.ts', 'schritte.spec.ts', 'verbrauch.spec.ts', 'mobil.spec.ts', 'kette.spec.ts', 'waermeabgabe.spec.ts'],
  timeout: 60_000,
  retries: 1,
  reporter: 'list',
  outputDir: 'test-results-staging',
  use: { baseURL: process.env.STAGING_URL ?? 'https://thermowerk.ch/heizlast-neu/', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobil', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
