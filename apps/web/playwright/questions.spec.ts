import { test, expect } from './test.setup';
import { loginAs } from './helpers/auth';
import { ensureSessionLive, roomPath } from './helpers/rooms';

test('reporter submission appears in moderator queue without refresh', async ({ browser }) => {
  const modCtx = await browser.newContext();
  const modPage = await modCtx.newPage();
  await loginAs(modPage, { email: 'moderator@onrecord.local' });

  await modPage.goto(roomPath);
  await ensureSessionLive(modPage);

  await expect(
    modPage.locator(
      '[data-testid="queue-list"]:visible, [data-testid="queue-empty"]:visible',
    ),
  ).toBeVisible();

  const repCtx = await browser.newContext();
  const repPage = await repCtx.newPage();
  await loginAs(repPage, { email: 'reporter@onrecord.local' });
  await repPage.goto(roomPath);

  await expect(repPage.locator('[data-testid="question-body"]:visible')).toBeVisible();
  const q = 'what is the plan for the next quarter?';
  await repPage.locator('[data-testid="question-body"]:visible').fill(q);
  await repPage.locator('[data-testid="question-submit"]:visible').click();

  await expect(repPage.getByTestId('question-item').first()).toContainText(q);
  await expect(repPage.getByTestId('question-status').first()).toHaveText(/pending/i);

  await expect(modPage.locator('[data-testid="queue-list"]:visible')).toContainText(q, {
    timeout: 15_000,
  });
});
