import { expect, test } from './test.setup';
import { roomPath } from './helpers/rooms';
import { staffState } from './helpers/storage-state';

test.use({ storageState: staffState });

test('staff can label spans and persistence remains after reload', async ({ page }) => {
  await page.goto(roomPath);

  const sessionId = await page.getByTestId('session-id').textContent();
  expect(sessionId).toBeTruthy();

  await page.goto(`/labeler/${encodeURIComponent(sessionId?.trim() ?? '')}`);

  const transcriptArea = page.getByTestId('labeler-transcript');
  await transcriptArea.focus();
  const transcriptValue = await transcriptArea.inputValue();
  const snippet = 'policy rollout';
  const start = transcriptValue.indexOf(snippet);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = start + snippet.length;

  await page.getByLabel('Label value (optional)').fill('policy rollout');

  await transcriptArea.evaluate(
    (el: HTMLTextAreaElement, selection: number[]) => {
      if (selection.length < 2) return;
      el.focus();
      el.setSelectionRange(selection[0], selection[1]);
      el.dispatchEvent(new Event('select', { bubbles: true }));
      el.dispatchEvent(new Event('mouseup', { bubbles: true }));
    },
    [start, end],
  );

  await expect(page.getByTestId('create-label-button')).toBeEnabled();
  await page.getByTestId('create-label-button').click();

  const snippetLocator = page
    .locator('div[data-testid^="label-snippet-"]')
    .filter({ hasText: snippet });
  await expect(snippetLocator.first()).toBeVisible();

  await page.reload();
  await expect(snippetLocator.first()).toBeVisible();

  const labelRow = page.locator('div[data-testid^="label-row-"]').filter({ hasText: snippet });
  await expect(labelRow).toBeVisible();
  await labelRow.getByRole('button', { name: 'Delete' }).click();
  const deletedRow = page.locator('div[data-testid^="label-row-"]').filter({ hasText: snippet });
  await expect(deletedRow).toHaveCount(0);
});
