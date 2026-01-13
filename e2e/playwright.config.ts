import { defineConfig } from '@playwright/test';

const webServerCommand = 'pnpm --filter @onrecord/web dev --hostname 0.0.0.0 --port 3000';
const reuseExistingServer = !process.env.CI;

console.info('[e2e] Playwright e2e config loaded');
console.info(`[e2e] Web server command: ${webServerCommand}`);
console.info(`[e2e] Reuse existing server: ${reuseExistingServer}`);

export default defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: webServerCommand,
    url: 'http://localhost:3000',
    reuseExistingServer,
    timeout: 120000,
  },
});
