import { defineConfig } from '@playwright/test';

// Each test launches its own Chromium profile with the built extension
// (.output/chrome-mv3), so run `npm run build` first — `npm run test:e2e` does.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
});
