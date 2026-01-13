import { expect as baseExpect, test as baseTest } from '@playwright/test';
import { resetDemoState } from './helpers/reset-demo-state';

const test = baseTest.extend({});

test.beforeEach(async () => {
  await resetDemoState();
});

export { test, baseExpect as expect };
export type { Browser, BrowserContext, Page, Request } from '@playwright/test';
