import { test, expect } from './test.setup';
import { roomPath } from './helpers/rooms';
import { moderatorState, reporterState } from './helpers/storage-state';

test.describe('reporter navigation polish', () => {
  test.use({ storageState: reporterState });

  test('navigating from /rooms to a room surfaces the loading UI before the content', async ({
    page,
  }) => {
    await page.goto('/whoami');
    await expect(page.getByTestId('toaster-mounted')).toBeVisible();

    const origin = new URL(page.url()).origin;

    await page.context().addCookies([{ name: 'e2e_delay_rooms_ms', value: '2500', url: origin }]);

    await page.getByRole('link', { name: 'Rooms' }).click();
    await expect(page.getByTestId('rooms-loading')).toBeVisible({ timeout: 6000 });

    await page.context().addCookies([{ name: 'e2e_delay_rooms_ms', value: '0', url: origin }]);

    await page.waitForURL('**/rooms');
    await expect(page.getByTestId('rooms-title')).toBeVisible();
    await expect(page.getByTestId('toaster-mounted')).toBeVisible();

    await page
      .context()
      .addCookies([{ name: 'e2e_delay_room_detail_ms', value: '2500', url: origin }]);

    await page.getByRole('link', { name: 'Open room' }).first().click();
    await expect(page.getByTestId('room-detail-loading')).toBeVisible({ timeout: 6000 });

    await page
      .context()
      .addCookies([{ name: 'e2e_delay_room_detail_ms', value: '0', url: origin }]);

    await page.waitForURL('**/rooms/**');
    await expect(page.getByTestId('room-title')).toBeVisible();
  });
});

test.describe('moderator polish', () => {
  test.use({ storageState: moderatorState });

  test('room error boundary renders friendly UI when the data request fails', async ({ page }) => {
    const roomErrorPath = `${roomPath}?__e2e_room_error=1`;
    await page.goto(roomErrorPath);

    await expect(page.getByText('Something went wrong loading this room')).toBeVisible();
    const tryAgain = page.getByRole('button', { name: 'Try again' });
    await expect(tryAgain).toBeVisible();
    await tryAgain.click();

    await expect(page.getByTestId('room-title')).toBeVisible();
  });

  test('publishing a recap surfaces the recap published toast', async ({ page }) => {
    await page.goto(roomPath);
    await expect(page.getByTestId('toaster-mounted')).toBeVisible();
    const publishButton = page.getByRole('button', { name: 'Publish recap' }).first();
    await expect(publishButton).toBeVisible();

    await publishButton.click();

    await expect(page.getByText('Recap published')).toBeVisible({ timeout: 10000 });
  });
});

test('dialog traps focus and closes when pressing Escape', async ({ page }) => {
  await page.goto('/dev/dialog');
  const trigger = page.getByTestId('dialog-trigger');
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Keyboard trap check' });
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  const focusedInside = await page.evaluate(() => {
    const el = document.activeElement;
    return Boolean(el?.closest('[role="dialog"]'));
  });
  expect(focusedInside).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
