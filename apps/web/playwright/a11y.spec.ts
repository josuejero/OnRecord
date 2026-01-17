import { test, expect, type Page } from './test.setup';
import AxeBuilder from '@axe-core/playwright';
import { ensureRecapUnpublished } from './helpers/reset-demo-state';
import { roomPath, buildRecapSlug } from './helpers/rooms';
import { moderatorState, reporterState } from './helpers/storage-state';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    // Exclude any dev-only debug containers if needed.
    .exclude('[data-testid="dev-only"]')
    .analyze();

  const seriousOrCritical = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
}

test('public landing page has no serious/critical a11y violations', async ({ page }) => {
  await page.goto('/');
  await expectNoSeriousViolations(page);
});

test('app shell rooms view has no serious/critical a11y violations', async ({ browser, baseURL }) => {
  const shellContext = await browser.newContext({
    storageState: reporterState,
    baseURL,
  });
  const shellPage = await shellContext.newPage();

  await shellPage.goto('/rooms');
  await expectNoSeriousViolations(shellPage);
  await shellContext.close();
});

test('room workstation page has no serious/critical a11y violations', async ({ browser, baseURL }) => {
  const roomContext = await browser.newContext({
    storageState: moderatorState,
    baseURL,
  });
  const roomPage = await roomContext.newPage();

  await roomPage.goto(roomPath);
  await expectNoSeriousViolations(roomPage);
  await roomContext.close();
});

test('public recap page has no serious/critical a11y violations', async ({ browser, baseURL }) => {
  const modContext = await browser.newContext({ storageState: moderatorState, baseURL });
  const modPage = await modContext.newPage();
  await modPage.goto(roomPath);

  const sessionId = (await modPage.getByTestId('session-id').textContent()) ?? '';
  expect(sessionId, 'session id').toBeTruthy();
  const recapSlug = buildRecapSlug(sessionId);

  await ensureRecapUnpublished(recapSlug);
  await modPage.goto(roomPath);

  const publishButton = modPage.getByRole('button', { name: 'Publish recap' }).first();
  await Promise.all([
    modPage.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    publishButton.click(),
  ]);

  const publicContext = await browser.newContext({ baseURL });
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`/recaps/${recapSlug}`);
  await expectNoSeriousViolations(publicPage);

  await ensureRecapUnpublished(recapSlug);
  await publicContext.close();
  await modContext.close();
});
