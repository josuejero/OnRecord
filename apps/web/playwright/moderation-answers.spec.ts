import { test, expect } from './test.setup';
import { loginAs } from './helpers/auth';
import { ensureSessionLive, roomPath } from './helpers/rooms';

test('moderator can approve + answer and reporter sees it live', async ({ browser }) => {
  const modCtx = await browser.newContext();
  const modPage = await modCtx.newPage();
  await loginAs(modPage, { email: 'moderator@onrecord.local' });
  await modPage.goto(roomPath);
  await ensureSessionLive(modPage);

  const repCtx = await browser.newContext();
  const repPage = await repCtx.newPage();
  await loginAs(repPage, { email: 'reporter@onrecord.local' });
  await repPage.goto(roomPath);

  const q = 'will you commit to a public timeline for the policy rollout?';
  await repPage.locator('[data-testid="question-body"]:visible').fill(q);
  await repPage.locator('[data-testid="question-submit"]:visible').click();

  // Moderator sees it appear
  await expect(modPage.locator('[data-testid="queue-list"]:visible')).toContainText(q, {
    timeout: 15_000,
  });

  // Approve
  await modPage.getByTestId('moderate-approve').first().click();

  // Reporter sees approved
  await expect(repPage.getByTestId('question-status').first()).toHaveText(/approved/i, {
    timeout: 15_000,
  });

  // Moderator sets active
  await modPage.getByTestId('active-set').first().click();

  // Post answer
  const a = 'Yes. We will publish a timeline on the public recap page and update it monthly.';
  await modPage.getByTestId('answer-body').fill(a);
  await modPage.getByTestId('answer-submit').click();

  // Reporter sees answer
  await expect(repPage.getByTestId('answer-display').first()).toContainText(a, { timeout: 15_000 });
});
