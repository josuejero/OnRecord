import { test, expect } from './test.setup';
import { loginAs } from './helpers/auth';
import { roomPath } from './helpers/rooms';

const ROOM_DATA_PATTERN = '**/rooms.json';
const ROOM_DETAIL_DATA = '**/rooms/demo-figure/demo-room.json';

test('navigating from /rooms to a room surfaces the loading UI before the content', async ({ page }) => {
  await loginAs(page, { email: 'reporter@onrecord.local' });

  let shouldDelayRooms = false;
  let roomListHandled = false;

  await page.route(ROOM_DATA_PATTERN, async (route) => {
    if (!shouldDelayRooms || roomListHandled) {
      await route.continue();
      return;
    }

    roomListHandled = true;
    try {
      await expect(page.getByTestId('rooms-loading')).toBeVisible({ timeout: 6000 });
    } finally {
      await route.continue();
      shouldDelayRooms = false;
    }
  });

  let shouldDelayRoomDetail = false;
  let roomDetailHandled = false;

  await page.route(ROOM_DETAIL_DATA, async (route) => {
    if (!shouldDelayRoomDetail || roomDetailHandled) {
      await route.continue();
      return;
    }

    roomDetailHandled = true;
    try {
      await expect(page.getByTestId('room-detail-loading')).toBeVisible({ timeout: 6000 });
    } finally {
      await route.continue();
      shouldDelayRoomDetail = false;
    }
  });

  shouldDelayRooms = true;
  await page.goto('/rooms', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('rooms-title')).toBeVisible();
  expect(roomListHandled).toBe(true);

  shouldDelayRoomDetail = true;
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.getByRole('link', { name: 'Open room' }).first().click(),
  ]);

  await expect(page.getByTestId('room-title')).toBeVisible();
  expect(roomDetailHandled).toBe(true);
});

test('room error boundary renders friendly UI when the data request fails', async ({ page }) => {
  await loginAs(page, { email: 'moderator@onrecord.local' });

  let failedOnce = false;
  await page.route(ROOM_DETAIL_DATA, async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.fulfill({
        status: 500,
        body: 'simulated supabase failure',
        headers: { 'content-type': 'text/plain' },
      });
      return;
    }

    await route.continue();
  });

  await page.goto(roomPath);

  await expect(page.getByText('Something went wrong loading this room')).toBeVisible();
  const tryAgain = page.getByRole('button', { name: 'Try again' });
  await expect(tryAgain).toBeVisible();
  await tryAgain.click();

  await expect(page.getByTestId('room-title')).toBeVisible();
});

test('publishing a recap surfaces the recap published toast', async ({ page }) => {
  await loginAs(page, { email: 'moderator@onrecord.local' });

  await page.goto(roomPath);
  const publishButton = page.getByRole('button', { name: 'Publish recap' });
  await expect(publishButton).toBeVisible();

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    publishButton.click(),
  ]);

  await expect(page.getByText('Recap published')).toBeVisible({ timeout: 10000 });
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
