import { test, expect } from './test.setup';
import { roomPath } from './helpers/rooms';
import { moderatorState, reporterState } from './helpers/storage-state';

test('moderator can start a session and reporter can observe after reload', async ({
  browser,
  baseURL,
}) => {
  const modCtx = await browser.newContext({ storageState: moderatorState, baseURL });
  const modPage = await modCtx.newPage();

  await modPage.goto(roomPath);
  await expect(modPage.getByTestId('room-title')).toHaveText('Press Room: Demo');

  await expect(modPage.getByTestId('session-start')).toBeVisible();
  await Promise.all([
    modPage.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    modPage.getByTestId('session-start').click(),
  ]);

  await expect(modPage.getByTestId('session-status-badge')).toHaveText(/live/i);
  await expect(modPage.getByTestId('session-start')).toHaveCount(0);

  const repCtx = await browser.newContext({ storageState: reporterState, baseURL });
  const repPage = await repCtx.newPage();

  await repPage.goto(roomPath);
  await expect(repPage.getByTestId('room-title')).toHaveText('Press Room: Demo');
  await repPage.reload();
  await expect(repPage.getByTestId('session-status-badge')).toHaveText(/live/i);
  const questionBody = repPage.locator('[data-testid="question-body"]:visible');
  await expect(questionBody).toBeEnabled();
});
