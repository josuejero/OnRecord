import { test, expect } from './test.setup';
import type { Request } from './test.setup';
import { loginAs } from './helpers/auth';
import { roomPath } from './helpers/rooms';

const ROOM_LIST_RSC = '**/rooms?*';
const ROOM_DETAIL_RSC = `**${roomPath}?*`;

const isRsc = (req: Request) => {
  const headers = req.headers();
  return (
    headers['rsc'] === '1' || (headers['accept'] ?? '').includes('text/x-component')
  );
};

test('navigating from /rooms to a room surfaces the loading UI before the content', async ({
  page,
}) => {
  await loginAs(page, { email: 'reporter@onrecord.local' });

  let shouldDelayRooms = false;
  let roomListHandled = false;

  await page.route(ROOM_LIST_RSC, async (route) => {
    const req = route.request();
    if (!isRsc(req)) {
      return route.fallback();
    }

    if (!shouldDelayRooms || roomListHandled) {
      await route.continue();
      return;
    }

    roomListHandled = true;
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });

  let shouldDelayRoomDetail = false;
  let roomDetailHandled = false;

  await page.route(ROOM_DETAIL_RSC, async (route) => {
    const req = route.request();
    if (!isRsc(req)) {
      return route.fallback();
    }

    if (!shouldDelayRoomDetail || roomDetailHandled) {
      await route.continue();
      return;
    }

    roomDetailHandled = true;
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });

  shouldDelayRooms = true;
  await page.getByRole('link', { name: 'Rooms' }).click();
  await expect(page.getByTestId('rooms-loading')).toBeVisible({ timeout: 6000 });
  shouldDelayRooms = false;
  await page.waitForURL('**/rooms');
  await expect(page.getByTestId('rooms-title')).toBeVisible();
  expect(roomListHandled).toBe(true);

  shouldDelayRoomDetail = true;
  await page.getByRole('link', { name: 'Open room' }).first().click();
  await expect(page.getByTestId('room-detail-loading')).toBeVisible({ timeout: 6000 });
  shouldDelayRoomDetail = false;
  await page.waitForURL('**/rooms/**');
  await expect(page.getByTestId('room-title')).toBeVisible();
  expect(roomDetailHandled).toBe(true);
});

test('room error boundary renders friendly UI when the data request fails', async ({ page }) => {
  await loginAs(page, { email: 'moderator@onrecord.local' });

  let failedOnce = false;
  await page.route(ROOM_DETAIL_RSC, async (route) => {
    const req = route.request();
    if (!isRsc(req)) {
      return route.fallback();
    }

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

  await page.goto('/rooms');
  await page.locator(`a[href="${roomPath}"]`).click();

  await expect(page.getByText('Something went wrong loading this room')).toBeVisible();
  const tryAgain = page.getByRole('button', { name: 'Try again' });
  await expect(tryAgain).toBeVisible();
  await tryAgain.click();

  await expect(page.getByTestId('room-title')).toBeVisible();
});

test('publishing a recap surfaces the recap published toast', async ({ page }) => {
  await loginAs(page, { email: 'moderator@onrecord.local' });

  await page.goto(roomPath);
  const publishButton = page.getByRole('button', { name: 'Publish recap' }).first();
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
