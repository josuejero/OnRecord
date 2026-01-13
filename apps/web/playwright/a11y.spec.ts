import { test, expect } from './test.setup';
import AxeBuilder from '@axe-core/playwright';

test('public pages have no serious/critical a11y violations', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page })
    // Exclude any dev-only debug containers if needed.
    .exclude('[data-testid="dev-only"]')
    .analyze();

  const seriousOrCritical = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
});
