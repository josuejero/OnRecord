import { expect, test } from '@playwright/test';

async function disableWebSpeech(page: any) {
  await page.addInitScript(() => {
    const w = window as any;

    // Make Web Speech "unsupported" deterministically
    try {
      delete w.SpeechRecognition;
    } catch {}
    try {
      delete w.webkitSpeechRecognition;
    } catch {}

    w.SpeechRecognition = undefined;
    w.webkitSpeechRecognition = undefined;
  });
}

function waitForServerActionRequest(page: any) {
  // Next Server Action requests include the `next-action` header
  // (header keys are lowercase in Playwright’s req.headers()).
  return page.waitForRequest((req: any) => {
    const h = req.headers();
    return req.method() === 'POST' && Boolean(h['next-action']);
  });
}

test.describe('voice input fixture', () => {
  test('displays fallback banner when Web Speech API is absent', async ({ page }, testInfo) => {
    console.info(`[e2e] Starting ${testInfo.title}`);

    await disableWebSpeech(page);
    await page.goto('/dev/audio-input');

    await expect(page.getByTestId('voice-input-fallback')).toBeVisible();

    console.info(`[e2e] Completed ${testInfo.title}`);
  });

  test('transcript save and processing requests are still reachable', async ({
    page,
  }, testInfo) => {
    console.info(`[e2e] Starting ${testInfo.title}`);

    await page.goto('/dev/audio-input');

    await page.getByTestId('transcript-textarea').fill('Playwright transcript test.');

    const saveReq = waitForServerActionRequest(page);
    await page.getByTestId('save-transcript-button').click();
    await saveReq;

    const processReq = waitForServerActionRequest(page);
    await page.getByTestId('process-transcript-button').click();
    await processReq;

    console.info(`[e2e] Completed ${testInfo.title}`);
  });
});
