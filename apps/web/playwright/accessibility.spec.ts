import { test, expect } from './test.setup';

test.describe('accessibility patterns', () => {
  test('dialog focus trap restores focus to the trigger after close', async ({ page }) => {
    await page.goto('/dev/dialog');
    const trigger = page.getByTestId('dialog-trigger');
    await trigger.click();

    const dialog = page.getByTestId('dialog-content');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedInside = await page.evaluate(() => {
      const active = document.activeElement;
      return Boolean(active?.closest('[role="dialog"]'));
    });
    expect(focusedInside).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('login errors announce via an alert with aria-live="assertive"', async ({ page }) => {
    const errorMessage = 'Invalid login for accessibility smoke';
    let intercepted = false;

    await page.route('**/auth/v1/token', async (route) => {
      if (intercepted || route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      intercepted = true;
      await route.fulfill({
        status: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error_description: errorMessage, error: 'invalid_grant' }),
      });
    });

    await page.goto('/login');
    await page.getByTestId('login-email').fill('reporter@onrecord.local');
    await page.getByTestId('login-password').fill('wrong-password');
    await page.getByTestId('login-submit').click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(errorMessage);
    await expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
