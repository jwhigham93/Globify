/**
 * E2E tests for UI overlay elements
 *
 * Tests the HUD controls, legend panel, view-mode toggle, and spin button
 * that are rendered on top of the 3D globe canvas.
 */

import { test, expect } from '@playwright/test';
import { mockApi } from './support/mockApi';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

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
    // The icon is drawn with Views rather than a glyph, so the control is
    // identified by testID and its state read from the accessible label.
    const toggle = page.getByTestId('spin-toggle');
    await expect(toggle).toBeVisible({ timeout: 5000 });
    // Stars spin by default, so the button offers "pause".
    await expect(toggle).toHaveAttribute('aria-label', /Pause/);
  });

  test('controls hint is visible on initial load', async ({ page }) => {
    // Copy differs between pointer and touch devices.
    await expect(
      page.getByText(/(Scroll|Pinch) to zoom/)
    ).toBeVisible({ timeout: 5000 });
  });

  test('canvas element is rendered', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeAttached({ timeout: 5000 });
  });
});
