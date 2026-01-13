import { test, expect, type Page } from '@playwright/test';

const roomPath = '/rooms/demo-figure/demo-room';

async function login(page: Page, email: string, password = 'password123!') {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('whoami-title')).toBeVisible();
}

test('reporter submission appears in moderator queue without refresh', async ({ browser }) => {
  const modCtx = await browser.newContext();
  const modPage = await modCtx.newPage();
  await login(modPage, 'moderator@onrecord.local');

  await modPage.goto(roomPath);
  await expect(modPage.getByTestId('room-title')).toHaveText('Press Room: Demo');

  const startBtn = modPage.getByTestId('session-start');
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await expect(modPage.locator('text=live')).toBeVisible();
  }

  await expect(modPage.getByTestId('queue-list').or(modPage.getByTestId('queue-empty'))).toBeVisible();

  const repCtx = await browser.newContext();
  const repPage = await repCtx.newPage();
  await login(repPage, 'reporter@onrecord.local');
  await repPage.goto(roomPath);

  await expect(repPage.getByTestId('question-body')).toBeVisible();
  const q = 'what is the plan for the next quarter?';
  await repPage.getByTestId('question-body').fill(q);
  await repPage.getByTestId('question-submit').click();

  await expect(repPage.getByTestId('question-item').first()).toContainText(q);
  await expect(repPage.getByTestId('question-status').first()).toHaveText(/pending/i);

  await expect(modPage.getByTestId('queue-list')).toContainText(q, { timeout: 15_000 });
});
