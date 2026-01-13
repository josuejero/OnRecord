import { expect, type Page } from '@playwright/test';

export async function loginAs(page: Page, opts: { email: string; password?: string }) {
  const password = opts.password ?? 'password123!';

  await page.goto('/login');
  await page.getByTestId('login-email').fill(opts.email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  // One stable “logged in” assertion.
  await expect(page.getByTestId('whoami-title')).toBeVisible();
}
