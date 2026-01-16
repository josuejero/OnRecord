import { test, expect } from './test.setup';
import { loginAs } from './helpers/auth';
import { roomPath } from './helpers/rooms';

test('moderator can start a session and reporter can observe after reload', async ({ browser }) => {
  const modCtx = await browser.newContext();
  const modPage = await modCtx.newPage();
  await loginAs(modPage, { email: 'moderator@onrecord.local' });

  await modPage.goto(roomPath);
  await expect(modPage.getByTestId('room-title')).toHaveText('Press Room: Demo');

  await expect(modPage.getByTestId('session-start')).toBeVisible();
  await modPage.getByTestId('session-start').click();

  await expect(modPage.getByTestId('session-summary-title')).toBeVisible();
  await expect(modPage.getByTestId('session-status-badge')).toHaveText(/live/i);

  const repCtx = await browser.newContext();
  const repPage = await repCtx.newPage();
  await loginAs(repPage, { email: 'reporter@onrecord.local' });

  await repPage.goto(roomPath);
  await expect(repPage.getByTestId('room-title')).toHaveText('Press Room: Demo');
  await repPage.reload();
  await expect(repPage.getByTestId('session-status-badge')).toHaveText(/live/i);
});
