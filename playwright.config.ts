import { defineConfig, devices } from '@playwright/test';

// CI runs the production build (E2E_COMMAND="npm start"); locally the dev server is used.
// E2E_PORT avoids clashing with another app already listening on 3000.
// E2E_BASE_URL runs the suite against an already-deployed site (no local server is started).
const port = Number(process.env.E2E_PORT ?? 3000);
const remote = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const baseURL = remote ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  // Seeds the local database directly; never run it against a remote deployment
  globalSetup: remote ? undefined : require.resolve('./tests/global-setup'),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: remote
    ? undefined
    : {
        command: `${process.env.E2E_COMMAND ?? 'npm run dev'} -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
