import { defineConfig, devices } from '@playwright/test';

/**
 * The smoke suite expects SurrealDB to be up (`pnpm db:up && pnpm db:migrate && pnpm db:seed`).
 * It starts the API and the web app itself unless they are already running.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @haven/api dev',
      url: 'http://127.0.0.1:3001/api/v1/health/live',
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: '../..',
    },
    {
      command: 'pnpm --filter @haven/web dev',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: '../..',
    },
  ],
});
