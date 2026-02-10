/**
 * E2E tests for UI overlay elements
 *
 * Tests the HUD controls, legend panel, view-mode toggle, and spin button
 * that are rendered on top of the 3D globe canvas.
 */

import { test, expect } from '@playwright/test';

test.describe('UI Overlays', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the globe container to mount
    await page.locator('[data-testid="globe-visualization"]').waitFor({
      state: 'attached',
      timeout: 5000,
    });
  });

  test('legend panel is visible with location type labels', async ({ page }) => {
    await expect(page.getByText('Legend')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Supplier')).toBeVisible();
    await expect(page.getByText('Dist. Center')).toBeVisible();
    await expect(page.getByText('Restaurant')).toBeVisible();
  });

  test('view mode toggle shows Standard by default', async ({ page }) => {
    await expect(page.getByText('Standard')).toBeVisible({ timeout: 5000 });
  });

  test('star spin toggle button is visible', async ({ page }) => {
    // The pause icon is visible by default (stars are spinning)
    await expect(page.getByText('⏸')).toBeVisible({ timeout: 5000 });
  });

  test('controls hint is visible on initial load', async ({ page }) => {
    await expect(
      page.getByText('Scroll to zoom')
    ).toBeVisible({ timeout: 5000 });
  });

  test('canvas element is rendered', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeAttached({ timeout: 5000 });
  });
});
