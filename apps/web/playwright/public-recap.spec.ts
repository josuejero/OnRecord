import { test, expect } from './test.setup';
import { loginAs } from './helpers/auth';
import { roomPath, buildRecapSlug } from './helpers/rooms';
import { ensureRecapUnpublished } from './helpers/reset-demo-state';

test('public recap is 404 until published, then becomes public', async ({ page }) => {
  await loginAs(page, { email: 'moderator@onrecord.local' });
  await page.goto(roomPath);

  const sessionId = (await page.getByTestId('session-id').textContent()) ?? '';
  expect(sessionId).toBeTruthy();
  const recapSlug = buildRecapSlug(sessionId);
  await ensureRecapUnpublished(recapSlug);

  await page.context().clearCookies();
  await page.goto(`/recaps/${recapSlug}`);
  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: /This page could not be found/i }),
  ).toBeVisible();

  await loginAs(page, { email: 'moderator@onrecord.local' });
  await page.goto(roomPath);
  await page.getByRole('button', { name: 'Publish recap' }).first().click();

  await page.context().clearCookies();
  const res2 = await page.goto(`/recaps/${recapSlug}`);
  expect(res2?.status()).toBe(200);
  await expect(page.getByText(/public recap/i)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /q\s*&\s*a/i })).toBeVisible();

  await loginAs(page, { email: 'moderator@onrecord.local' });
  await page.goto(roomPath);
  await page.getByRole('button', { name: 'Unpublish recap' }).click();

  await page.context().clearCookies();
  await page.goto(`/recaps/${recapSlug}`);
  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: /This page could not be found/i }),
  ).toBeVisible();
});
