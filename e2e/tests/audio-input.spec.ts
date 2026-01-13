import { expect, test } from '@playwright/test';

test.describe('voice input fixture', () => {
  test('displays fallback banner when Web Speech API is absent', async ({ page }) => {
    await page.goto('/dev/audio-input');
    await expect(page.getByTestId('voice-input-fallback')).toBeVisible();
  });

  test('transcript save and processing requests are still reachable', async ({ page }) => {
    let saveRequested = false;
    let processRequested = false;

    await page.route('**/_actions/saveTranscript', async (route) => {
      saveRequested = true;
      await route.fulfill({ status: 200, body: 'ok' });
    });

    await page.route('**/_actions/processTranscript', async (route) => {
      processRequested = true;
      await route.fulfill({ status: 200, body: 'ok' });
    });

    await page.goto('/dev/audio-input');

    await page.getByTestId('transcript-textarea').fill('Playwright transcript test.');
    await page.getByTestId('save-transcript-button').click();
    await expect.poll(() => saveRequested).toBeTruthy();

    await page.getByTestId('process-transcript-button').click();
    await expect.poll(() => processRequested).toBeTruthy();
  });
});
