import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test('public asset shows on recap and is publicly readable', async ({ page, request }) => {
  await loginAs(page, { email: 'moderator@onrecord.local' });

  await page.goto('/rooms/mayor/jane-doe');

  const recapSlug = `phase6-${Math.random().toString(16).slice(2, 8)}`;
  await page.getByPlaceholder(/recap slug/i).fill(recapSlug);
  await page.getByRole('button', { name: /publish recap/i }).click();

  await page.getByTestId('asset-visibility').selectOption('public');
  await page.getByTestId('asset-file').setInputFiles('apps/web/playwright/fixtures/asset-sample.txt');
  await page.getByTestId('asset-submit').click();

  const ctx = await page.context().browser()?.newContext();
  if (!ctx) throw new Error('browser context missing');
  const pub = await ctx.newPage();
  await pub.goto(`/recaps/${recapSlug}`);

  await expect(pub.getByTestId('public-assets')).toBeVisible();
  const firstLink = pub.locator('[data-testid="public-assets"] a').first();
  const href = await firstLink.getAttribute('href');
  expect(href).toBeTruthy();

  const assetUrl = new URL(href!, pub.url()).toString();
  const assetRes = await request.get(assetUrl);
  expect(assetRes.ok()).toBeTruthy();

  await ctx.close();
});

test('private asset does not appear on public recap', async ({ page }) => {
  await loginAs(page, { email: 'moderator@onrecord.local' });

  await page.goto('/rooms/mayor/jane-doe');

  const recapSlug = `phase6-${Math.random().toString(16).slice(2, 8)}`;
  await page.getByPlaceholder(/recap slug/i).fill(recapSlug);
  await page.getByRole('button', { name: /publish recap/i }).click();

  await page.getByTestId('asset-visibility').selectOption('private');
  await page.getByTestId('asset-file').setInputFiles('apps/web/playwright/fixtures/asset-sample.txt');
  await page.getByTestId('asset-submit').click();

  const ctx = await page.context().browser()?.newContext();
  if (!ctx) throw new Error('browser context missing');
  const pub = await ctx.newPage();
  await pub.goto(`/recaps/${recapSlug}`);

  await expect(pub.getByText(/no public assets/i)).toBeVisible();
  await ctx.close();
});
