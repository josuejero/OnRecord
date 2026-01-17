import { test, expect, type TestInfo } from '@playwright/test';

test('home to demo room renders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('nav-demo-room')).toBeVisible();
  await page.getByTestId('nav-demo-room').click();

  await expect(page.getByTestId('demo-room-title')).toHaveText('Press Room: Demo');
  await expect(page.getByTestId('question-q_001')).toBeVisible();
});

test('home demo room link supports keyboard navigation', async ({ page }, testInfo: TestInfo) => {
  console.info(`[e2e] Starting ${testInfo.title}`);
  await page.goto('/');

  for (let i = 0; i < 12; i += 1) {
    const focused = await page.evaluate(() =>
      document.activeElement?.getAttribute('data-testid'),
    );
    if (focused === 'nav-demo-room') break;
    await page.keyboard.press('Tab');
  }

  await expect(page.getByTestId('nav-demo-room')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('demo-room-title')).toHaveText('Press Room: Demo');
});
