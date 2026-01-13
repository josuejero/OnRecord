import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';

test('staff can label spans and persistence remains after reload', async ({ page }) => {
  await loginAs(page, { email: 'staff@onrecord.local' });
  await page.goto('/rooms');
  await page.getByRole('link', { name: 'Open room' }).first().click();

  const sessionId = await page.getByTestId('session-id').textContent();
  expect(sessionId).toBeTruthy();

  await page.goto(`/labeler/${encodeURIComponent(sessionId?.trim() ?? '')}`);

  const transcriptArea = page.getByTestId('labeler-transcript');
  const transcriptValue = await transcriptArea.inputValue();
  const snippet = 'policy rollout';
  const start = transcriptValue.indexOf(snippet);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = start + snippet.length;

  await transcriptArea.evaluate(
    (el, selection) => {
      el.setSelectionRange(selection[0], selection[1]);
      el.dispatchEvent(new Event('select'));
    },
    [start, end]
  );

  await page.getByLabel('Label value (optional)').fill('policy rollout');
  await page.getByTestId('create-label-button').click();

  const snippetLocator = page.getByText(snippet, { exact: false });
  await expect(snippetLocator).toBeVisible();

  await page.reload();
  await expect(page.getByText(snippet, { exact: false })).toBeVisible();

  const labelRow = page.locator('div[data-testid^="label-row-"]').filter({ hasText: snippet });
  await expect(labelRow).toBeVisible();
  await labelRow.getByRole('button', { name: 'Delete' }).click();
  const deletedRow = page.locator('div[data-testid^="label-row-"]').filter({ hasText: snippet });
  await expect(deletedRow).toHaveCount(0);
});
