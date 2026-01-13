import { test, expect } from './test.setup';
import { loginAs } from './helpers/auth';

test('reporter can sign in and reach /reporter', async ({ page }) => {
  await loginAs(page, { email: 'reporter@onrecord.local' });
  await expect(page.getByTestId('whoami-role')).toHaveText(/reporter/);

  await page.goto('/reporter');
  await expect(page.getByTestId('reporter-title')).toBeVisible();
});

test('reporter is blocked from /moderator', async ({ page }) => {
  await loginAs(page, { email: 'reporter@onrecord.local' });
  await page.goto('/moderator');
  await expect(page.getByTestId('whoami-title')).toBeVisible();
});

test('moderator can reach /moderator', async ({ page }) => {
  await loginAs(page, { email: 'moderator@onrecord.local' });

  await page.goto('/moderator');
  await expect(page.getByTestId('moderator-title')).toBeVisible();
});
