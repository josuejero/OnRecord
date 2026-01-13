import { test, expect, type TestInfo } from '@playwright/test';

test('home to demo room renders', async ({ page }, testInfo) => {
  console.info(`[e2e] Starting ${testInfo.title}`);
  await page.goto('/');

  await expect(page.getByTestId('nav-demo-room')).toBeVisible();
  await page.getByTestId('nav-demo-room').click();

  await expect(page.getByTestId('demo-room-title')).toHaveText('Press Room: Demo');
  console.info(`[e2e] Completed ${testInfo.title}`);
});
