import { expect, type Page } from '@playwright/test';

export async function loginAs(page: Page, opts: { email: string; password?: string }) {
  const password = opts.password ?? 'password123!';

  await page.goto('/login');
  await page.getByTestId('login-email').fill(opts.email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  // Stable “logged in” assertion on /login.
  await expect(page.getByTestId('login-signed-in')).toBeVisible();
  await expect(page.getByTestId('login-signed-in-email')).toContainText(opts.email);

  // Now land on the canonical page the rest of the suite expects.
  await page.goto('/whoami');
  await expect(page.getByTestId('whoami-role')).toBeVisible();
  await expect(page.getByTestId('whoami-title')).toBeVisible();
}
