import { test, expect, type TestInfo } from '@playwright/test';

test('home to demo room renders', async ({ page }, testInfo) => {
  console.info(`[e2e] Starting ${testInfo.title}`);
  await page.goto('/');

  await expect(page.getByTestId('nav-demo-room')).toBeVisible();
  await page.getByTestId('nav-demo-room').click();

  await expect(page.getByTestId('demo-room-title')).toHaveText('Press Room: Demo');
  await expect(page.getByTestId('room-header-actions')).toBeVisible();
  await expect(page.getByTestId('queue-count-pending')).toBeVisible();
  console.info(`[e2e] Completed ${testInfo.title}`);
});

test('room header actions support keyboard navigation', async ({ page }, testInfo) => {
  console.info(`[e2e] Starting ${testInfo.title}`);
  await page.goto('/');
  await page.getByTestId('nav-demo-room').click();

  const searchTrigger = page.locator('[data-testid="room-search-trigger"]');
  await expect(searchTrigger).toBeVisible();

  const focusSearchTrigger = async () => {
    for (let i = 0; i < 30; i += 1) {
      const activeId = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-testid'),
      );
      if (activeId === 'room-search-trigger') {
        return;
      }
      await page.keyboard.press('Tab');
    }
    throw new Error('room-search-trigger was not reachable via keyboard navigation');
  };

  await focusSearchTrigger();
  await page.keyboard.press('Enter');

  const searchDialog = page.locator('[data-testid="room-search-dialog"]');
  await expect(searchDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(searchDialog).toBeHidden();

  console.info(`[e2e] Completed ${testInfo.title}`);
});
