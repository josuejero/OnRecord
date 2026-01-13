import { test, expect, type Page } from './test.setup';
import { roomPath } from './helpers/rooms';

async function login(page: Page, email: string, password = 'password123!') {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('whoami-title')).toBeVisible();
}

test('moderator can start a session and reporter can observe after reload', async ({ browser }) => {
  const modCtx = await browser.newContext();
  const modPage = await modCtx.newPage();
  await login(modPage, 'moderator@onrecord.local');

  await modPage.goto(roomPath);
  await expect(modPage.getByTestId('room-title')).toHaveText('Press Room: Demo');

  await expect(modPage.getByTestId('session-start')).toBeVisible();
  await modPage.getByTestId('session-start').click();

  await expect(modPage.getByTestId('session-summary-title')).toBeVisible();
  await expect(modPage.getByTestId('session-status-badge')).toHaveText(/live/i);

  const repCtx = await browser.newContext();
  const repPage = await repCtx.newPage();
  await login(repPage, 'reporter@onrecord.local');

  await repPage.goto(roomPath);
  await expect(repPage.getByTestId('room-title')).toHaveText('Press Room: Demo');
  await repPage.reload();
  await expect(repPage.getByTestId('session-status-badge')).toHaveText(/live/i);
});
