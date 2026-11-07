import { defineConfig } from '@playwright/test';

// Each test launches its own Chromium profile with the built extension
// (.output-e2e/chrome-mv3, an E2E variant with host access) — build it with
// `npm run test:e2e`, which runs the build first.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
});
