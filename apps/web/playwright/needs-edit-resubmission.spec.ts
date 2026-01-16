import { test, expect } from './test.setup';
import { loginAs } from './helpers/auth';
import { ensureSessionLive, roomPath } from './helpers/rooms';

test('reporter can resubmit only when needs_edit', async ({ browser }) => {
  const modCtx = await browser.newContext();
  const modPage = await modCtx.newPage();
  await loginAs(modPage, { email: 'moderator@onrecord.local' });
  await modPage.goto(roomPath);
  await ensureSessionLive(modPage);

  const repCtx = await browser.newContext();
  const repPage = await repCtx.newPage();
  await loginAs(repPage, { email: 'reporter@onrecord.local' });
  await repPage.goto(roomPath);

  const q = 'what about the plan?';
  await repPage.locator('[data-testid="question-body"]:visible').fill(q);
  await repPage.locator('[data-testid="question-submit"]:visible').click();

  await expect(modPage.locator('[data-testid="queue-list"]:visible')).toContainText(q, {
    timeout: 15_000,
  });

  // Mark as needs_edit
  await modPage.getByTestId('moderate-needs-edit').first().click();

  // Reporter should see needs edit
  await expect(repPage.getByTestId('question-status').first()).toHaveText(/needs edit/i, {
    timeout: 15_000,
  });

  // Resubmit
  const revised = 'can you share a specific timeline for the plan, including milestones?';
  await repPage.getByTestId('needs-edit-body').first().fill(revised);
  await repPage.getByTestId('needs-edit-submit').first().click();

  // Back to pending
  await expect(repPage.getByTestId('question-status').first()).toHaveText(/pending/i, {
    timeout: 15_000,
  });
});
