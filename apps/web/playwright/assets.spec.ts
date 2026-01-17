import { test, expect } from './test.setup';
import { roomPath, buildRecapSlug } from './helpers/rooms';
import { randomUUID } from 'node:crypto';
import { moderatorState } from './helpers/storage-state';

function newAssetPayload() {
  return {
    name: 'asset-sample.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(`private-asset-${randomUUID()}`),
  };
}

test.use({ storageState: moderatorState });

test('private asset does not appear on public recap', async ({ page, baseURL }) => {
  await page.goto(roomPath);

  const sessionId = (await page.getByTestId('session-id').textContent()) ?? '';
  const recapSlug = buildRecapSlug(sessionId);
  await page.getByRole('button', { name: 'Publish recap' }).first().click();

  const baselineCtx = await page.context().browser()?.newContext({ baseURL });
  if (!baselineCtx) throw new Error('browser context missing');
  const baselinePage = await baselineCtx.newPage();
  await baselinePage.goto(`/recaps/${recapSlug}`);
  const baselineAssets = baselinePage.locator('[data-testid="public-assets"] a');
  const baselineCount = await baselineAssets.count();
  await baselineCtx.close();

  await page.locator('[data-testid="asset-visibility"]:visible').selectOption('private');
  await page.locator('[data-testid="asset-file"]:visible').setInputFiles(newAssetPayload());
  await page.locator('[data-testid="asset-submit"]:visible').click();
  await page.waitForTimeout(1000);

  const ctx = await page.context().browser()?.newContext({ baseURL });
  if (!ctx) throw new Error('browser context missing');

  const pub = await ctx.newPage();
  await pub.goto(`/recaps/${recapSlug}`);
  const publicAssets = pub.locator('[data-testid="public-assets"] a');
  const publicCount = await publicAssets.count();
  expect(publicCount).toBe(baselineCount);

  await ctx.close();
});

test('public asset shows on recap and is publicly readable', async ({ page, request, baseURL }) => {
  await page.goto(roomPath);

  const sessionId = (await page.getByTestId('session-id').textContent()) ?? '';
  const recapSlug = buildRecapSlug(sessionId);
  await page.getByRole('button', { name: 'Publish recap' }).first().click();

  await page.locator('[data-testid="asset-visibility"]:visible').selectOption('public');
  await page.locator('[data-testid="asset-file"]:visible').setInputFiles(newAssetPayload());
  await page.locator('[data-testid="asset-submit"]:visible').click();
  await page.waitForTimeout(1000);

  const ctx = await page.context().browser()?.newContext({ baseURL });
  if (!ctx) throw new Error('browser context missing');

  const pub = await ctx.newPage();
  const res = await pub.goto(`/recaps/${recapSlug}`);
  expect(res?.status()).toBe(200);
  await expect(pub.getByTestId('public-assets')).toBeVisible();

  const firstLink = pub.locator('[data-testid="public-assets"] a').first();
  const href = await firstLink.getAttribute('href');
  expect(href).toBeTruthy();

  const assetUrl = new URL(href!, pub.url()).toString();
  const assetRes = await request.get(assetUrl);
  expect(assetRes.ok()).toBeTruthy();

  await ctx.close();
});
