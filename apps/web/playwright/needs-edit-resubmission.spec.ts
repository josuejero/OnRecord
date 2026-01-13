import { test, expect, type Page } from '@playwright/test';

const roomPath = '/rooms/demo-figure/demo-room';

async function login(page: Page, email: string, password = 'password123!') {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('whoami-title')).toBeVisible();
}

test('reporter can resubmit only when needs_edit', async ({ browser }) => {
  const modCtx = await browser.newContext();
  const modPage = await modCtx.newPage();
  await login(modPage, 'moderator@onrecord.local');
  await modPage.goto(roomPath);

  const repCtx = await browser.newContext();
  const repPage = await repCtx.newPage();
  await login(repPage, 'reporter@onrecord.local');
  await repPage.goto(roomPath);

  const q = 'what about the plan?';
  await repPage.getByTestId('question-body').fill(q);
  await repPage.getByTestId('question-submit').click();

  await expect(modPage.getByTestId('queue-list')).toContainText(q, { timeout: 15_000 });

  // Mark as needs_edit
  await modPage.getByTestId('moderate-needs-edit').first().click();

  // Reporter should see needs edit
  await expect(repPage.getByTestId('question-status').first()).toHaveText(/needs edit/i, { timeout: 15_000 });

  // Resubmit
  const revised = 'can you share a specific timeline for the plan, including milestones?';
  await repPage.getByTestId('needs-edit-body').first().fill(revised);
  await repPage.getByTestId('needs-edit-submit').first().click();

  // Back to pending
  await expect(repPage.getByTestId('question-status').first()).toHaveText(/pending/i, { timeout: 15_000 });
});
