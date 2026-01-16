import { test, expect } from './test.setup';
import { staffState } from './helpers/storage-state';

test.use({ storageState: staffState });

test('staff can view insights', async ({ page }) => {
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
});
