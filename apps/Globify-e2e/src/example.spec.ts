import { test, expect } from '@playwright/test';
import { mockApi } from './support/mockApi';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect the page title to contain "Globify"
  await expect(page).toHaveTitle(/Globify/);
});
