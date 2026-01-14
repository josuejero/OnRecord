import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('accessibility (smoke)', () => {
  test('home page has no obvious violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('login errors are announced via aria-live', async ({ page }) => {
    await page.goto('/login');

    // Fake a login failure so we can assert the aria-live region.
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      });
    });

    await page.getByLabel('Email').fill('a11y@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    const errorMessage = 'Invalid login credentials';

    const alert = page.getByTestId('login-error');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(errorMessage);
    await expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
