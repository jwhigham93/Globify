/**
 * E2E tests for runtime stability
 *
 * Ensures the app doesn't throw unhandled errors during common interactions
 * and verifies the loading sequence completes gracefully.
 */

import { test, expect } from '@playwright/test';

test.describe('Runtime Stability', () => {
  test('no unhandled JS errors during initial load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.locator('[data-testid="globe-visualization"]').waitFor({
      state: 'attached',
      timeout: 5000,
    });

    // Allow a moment for any deferred errors to surface
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('no unhandled errors during view mode cycling', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await expect(page.getByText('Standard')).toBeVisible({ timeout: 5000 });

    // Cycle through all modes
    await page.getByText('Standard').click();
    await expect(page.getByText('Risk View')).toBeVisible({ timeout: 3000 });

    await page.getByText('Risk View').click();
    await expect(page.getByText('Disruption')).toBeVisible({ timeout: 3000 });

    await page.getByText('Disruption').click();
    await expect(page.getByText('Standard')).toBeVisible({ timeout: 3000 });

    expect(errors).toHaveLength(0);
  });

  test('star spin toggle does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await expect(page.getByText('⏸')).toBeVisible({ timeout: 5000 });

    // Toggle pause/play twice
    await page.getByText('⏸').click();
    await expect(page.getByText('▶')).toBeVisible({ timeout: 2000 });

    await page.getByText('▶').click();
    await expect(page.getByText('⏸')).toBeVisible({ timeout: 2000 });

    expect(errors).toHaveLength(0);
  });

  test('loading overlay eventually disappears', async ({ page }) => {
    await page.goto('/');

    // The loading overlay might flash briefly; wait for it to go away
    const loadingText = page.getByText('Loading Earth texture...');

    // Either it was never shown (fast load) or it disappears within 10s
    await expect(loadingText).not.toBeVisible({ timeout: 10000 });
  });
});
