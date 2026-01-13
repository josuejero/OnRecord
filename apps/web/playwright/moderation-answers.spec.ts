import { test, expect, type Page } from '@playwright/test';

const roomPath = '/rooms/demo-figure/demo-room';

async function login(page: Page, email: string, password = 'password123!') {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('whoami-title')).toBeVisible();
}

test('moderator can approve + answer and reporter sees it live', async ({ browser }) => {
  const modCtx = await browser.newContext();
  const modPage = await modCtx.newPage();
  await login(modPage, 'moderator@onrecord.local');
  await modPage.goto(roomPath);

  const repCtx = await browser.newContext();
  const repPage = await repCtx.newPage();
  await login(repPage, 'reporter@onrecord.local');
  await repPage.goto(roomPath);

  const q = 'will you commit to a public timeline for the policy rollout?';
  await repPage.getByTestId('question-body').fill(q);
  await repPage.getByTestId('question-submit').click();

  // Moderator sees it appear
  await expect(modPage.getByTestId('queue-list')).toContainText(q, { timeout: 15_000 });

  // Approve
  await modPage.getByTestId('moderate-approve').first().click();

  // Reporter sees approved
  await expect(repPage.getByTestId('question-status').first()).toHaveText(/approved/i, { timeout: 15_000 });

  // Moderator sets active
  await modPage.getByTestId('active-set').first().click();

  // Post answer
  const a = 'Yes. We will publish a timeline on the public recap page and update it monthly.';
  await modPage.getByTestId('answer-body').fill(a);
  await modPage.getByTestId('answer-submit').click();

  // Reporter sees answer
  await expect(repPage.getByTestId('answer-display').first()).toContainText(a, { timeout: 15_000 });
});
