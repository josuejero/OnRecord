import { test, expect } from '@playwright/test';

test('reporter can sign in and reach /reporter', async ({ page }) => {
  await page.goto('/login');

  await page.getByTestId('login-email').fill('reporter@onrecord.local');
  await page.getByTestId('login-password').fill('password123!');
  await page.getByTestId('login-submit').click();

  await expect(page.getByTestId('whoami-title')).toBeVisible();
  await expect(page.getByTestId('whoami-role')).toHaveText(/reporter/);

  await page.goto('/reporter');
  await expect(page.getByTestId('reporter-title')).toBeVisible();
});

test('reporter is blocked from /moderator', async ({ page }) => {
  await page.goto('/login');

  await page.getByTestId('login-email').fill('reporter@onrecord.local');
  await page.getByTestId('login-password').fill('password123!');
  await page.getByTestId('login-submit').click();

  await page.goto('/moderator');
  await expect(page.getByTestId('whoami-title')).toBeVisible();
});

test('moderator can reach /moderator', async ({ page }) => {
  await page.goto('/login');

  await page.getByTestId('login-email').fill('moderator@onrecord.local');
  await page.getByTestId('login-password').fill('password123!');
  await page.getByTestId('login-submit').click();

  await page.goto('/moderator');
  await expect(page.getByTestId('moderator-title')).toBeVisible();
});
