import { expect, type Page } from '@playwright/test';

export const roomPath = '/rooms/demo-figure/demo-room';

export function buildRecapSlug(sessionId: string) {
  return `demo-figure-demo-room-${sessionId.trim().slice(0, 8)}`;
}

export async function ensureSessionLive(page: Page) {
  await expect(page.getByTestId('room-title')).toHaveText('Press Room: Demo');

  const startButton = page.getByTestId('session-start');
  if (await startButton.count()) {
    await expect(startButton).toBeVisible();
    await startButton.click();
  }

  const statusBadge = page.getByTestId('session-status-badge');
  await expect(statusBadge).toHaveText(/live/i);
  await expect(statusBadge).toBeVisible();
}
