import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect the page title to contain "Globify"
  await expect(page).toHaveTitle(/Globify/);
});
