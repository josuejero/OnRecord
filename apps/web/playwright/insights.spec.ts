import { test, expect } from './test.setup';
import { loginAs } from './helpers/auth';

test('staff can view insights', async ({ page }) => {
  await loginAs(page, { email: 'staff@onrecord.local' });
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
});
