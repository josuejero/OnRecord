import { test, expect } from '@playwright/test';

test('home to demo room renders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('nav-demo-room')).toBeVisible();
  await page.getByTestId('nav-demo-room').click();

  await expect(page.getByTestId('demo-room-title')).toHaveText('Press Room: Demo');
});
