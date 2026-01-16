import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  globalSetup: require.resolve('./playwright/global-setup'),
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html']] : 'line',
  use: {
    trace: 'on-first-retry',
    baseURL: 'http://127.0.0.1:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev --hostname 0.0.0.0 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_DISABLE_ROOM_PREFETCH: 'true',
      NEXT_PUBLIC_E2E: '1',
    },
  },
});
