import { test, expect } from './test.setup';
import { moderatorState, reporterState } from './helpers/storage-state';

test.describe('reporter auth', () => {
  test.use({ storageState: reporterState });

  test('reporter can sign in and reach /reporter', async ({ page }) => {
    await page.goto('/whoami');
    await expect(page.getByTestId('whoami-role')).toHaveText(/reporter/);

    await page.goto('/reporter');
    await expect(page.getByTestId('reporter-title')).toBeVisible();
  });

  test('reporter is blocked from /moderator', async ({ page }) => {
    await page.goto('/moderator');
    await expect(page.getByTestId('whoami-title')).toBeVisible();
  });
});

test.describe('moderator auth', () => {
  test.use({ storageState: moderatorState });

  test('moderator can reach /moderator', async ({ page }) => {
    await page.goto('/moderator');
    await expect(page.getByTestId('moderator-title')).toBeVisible();
  });
});
