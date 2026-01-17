import { test, expect } from './test.setup';
import { roomPath, buildRecapSlug } from './helpers/rooms';
import { ensureRecapUnpublished } from './helpers/reset-demo-state';
import { moderatorState } from './helpers/storage-state';

test('public recap is 404 until published, then becomes public', async ({ browser, baseURL }) => {
  const modCtx = await browser.newContext({ storageState: moderatorState, baseURL });
  const modPage = await modCtx.newPage();
  await modPage.goto(roomPath);

  const sessionId = (await modPage.getByTestId('session-id').textContent()) ?? '';
  expect(sessionId).toBeTruthy();
  const recapSlug = buildRecapSlug(sessionId);
  await ensureRecapUnpublished(recapSlug);

  const publicCtx = await browser.newContext({ baseURL });
  const publicPage = await publicCtx.newPage();
  await publicPage.goto(`/recaps/${recapSlug}`);
  await expect(publicPage.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
  await expect(
    publicPage.getByRole('heading', { level: 2, name: /This page could not be found/i }),
  ).toBeVisible();

  await modPage.goto(roomPath);
  await modPage.getByRole('button', { name: 'Publish recap' }).first().click();

  const res2 = await publicPage.goto(`/recaps/${recapSlug}`);
  expect(res2?.status()).toBe(200);
  await expect(publicPage.getByText(/public recap/i)).toBeVisible();
  await expect(publicPage.getByRole('heading', { level: 2, name: /q\s*&\s*a/i })).toBeVisible();

  await modPage.goto(roomPath);
  await modPage.getByRole('button', { name: 'Unpublish recap' }).click();

  await publicPage.goto(`/recaps/${recapSlug}`);
  await expect(publicPage.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
  await expect(
    publicPage.getByRole('heading', { level: 2, name: /This page could not be found/i }),
  ).toBeVisible();

  await publicCtx.close();
  await modCtx.close();
});
