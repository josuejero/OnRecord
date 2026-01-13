import { test, expect, type Page } from './test.setup';
import { roomPath, buildRecapSlug } from './helpers/rooms';

async function login(page: Page, email: string, password = 'password123!') {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('whoami-title')).toBeVisible();
}

test('public recap is 404 until published, then becomes public', async ({ page }) => {
  await login(page, 'moderator@onrecord.local');
  await page.goto(roomPath);

  const sessionId = (await page.getByTestId('session-id').textContent()) ?? '';
  expect(sessionId).toBeTruthy();
  const recapSlug = buildRecapSlug(sessionId);

  await page.context().clearCookies();
  const res1 = await page.goto(`/recaps/${recapSlug}`);
  expect(res1?.status()).toBe(404);

  await login(page, 'moderator@onrecord.local');
  await page.goto(roomPath);
  await page.getByRole('button', { name: 'Publish recap' }).first().click();

  await page.context().clearCookies();
  const res2 = await page.goto(`/recaps/${recapSlug}`);
  expect(res2?.status()).toBe(200);
  await expect(page.getByText(/public recap/i)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /q & a/i })).toBeVisible();

  await login(page, 'moderator@onrecord.local');
  await page.goto(roomPath);
  await page.getByRole('button', { name: 'Unpublish recap' }).click();

  await page.context().clearCookies();
  const res3 = await page.goto(`/recaps/${recapSlug}`);
  expect(res3?.status()).toBe(404);
});
