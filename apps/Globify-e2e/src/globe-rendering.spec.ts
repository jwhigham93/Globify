/**
 * E2E tests for globe rendering
 * Tests visual rendering and initial load performance
 */

import { test, expect } from '@playwright/test';
import { mockApi } from './support/mockApi';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test.describe('Globe Rendering', () => {
  test('should display globe on page load within 3 seconds', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Wait for globe container to be visible (within 3 seconds per success criteria SC-001)
    const globeContainer = page.locator('[data-testid="globe-visualization"]');
    await expect(globeContainer).toBeVisible({ timeout: 3000 });
  });

  test('should render WebView with globe content', async ({ page }) => {
    await page.goto('/');

    // Check that the page has loaded
    await expect(page).toHaveTitle(/Globify/);

    // Globe visualization should be present
    const globeElement = page.locator('[data-testid="globe-visualization"]');
    await expect(globeElement).toBeAttached();
  });

  test('should not crash on initial load', async ({ page }) => {
    const errors: string[] = [];
    
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for globe container to be visible
    await page.locator('[data-testid="globe-visualization"]').waitFor({ state: 'visible', timeout: 3000 });

    // Should not have any critical errors
    const criticalErrors = errors.filter(
      (err) => err.includes('WebGL') || err.includes('crash') || err.includes('fatal')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
