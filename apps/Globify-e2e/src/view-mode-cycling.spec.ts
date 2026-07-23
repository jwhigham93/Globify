/**
 * E2E tests for view mode cycling
 *
 * The toggle button cycles: Standard → Risk View → Disruption → Standard.
 * Each mode shows/hides specific panels and legend sections.
 */

import { test, expect } from '@playwright/test';
import { mockApi } from './support/mockApi';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test.describe('View Mode Cycling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the toggle to be ready
    await expect(page.getByText('Standard')).toBeVisible({ timeout: 5000 });
  });

  test('cycles from Standard to Risk View on first click', async ({ page }) => {
    await page.getByText('Standard').click();
    await expect(page.getByText('Risk View')).toBeVisible({ timeout: 3000 });
  });

  test('risk panel appears in concentration-risk mode', async ({ page }) => {
    // Click to enter risk mode
    await page.getByText('Standard').click();
    await expect(page.getByText('Risk View')).toBeVisible({ timeout: 3000 });

    // Risk panel content should be visible
    await expect(page.getByText('Network Risk')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Supplier Concentration')).toBeVisible();
    await expect(page.getByText('DC Diversification')).toBeVisible();
  });

  test('legend shows risk gradient in risk mode', async ({ page }) => {
    await page.getByText('Standard').click();
    await expect(page.getByText('Risk View')).toBeVisible({ timeout: 3000 });

    await expect(page.getByText('Risk Level')).toBeVisible({ timeout: 3000 });
  });

  test('cycles from Risk View to Disruption on second click', async ({ page }) => {
    // Standard → Risk
    await page.getByText('Standard').click();
    await expect(page.getByText('Risk View')).toBeVisible({ timeout: 3000 });

    // Risk → Disruption
    await page.getByText('Risk View').click();
    await expect(page.getByText('Disruption').first()).toBeVisible({ timeout: 3000 });
  });

  test('disruption hint appears in disruption mode', async ({ page }) => {
    // Standard → Risk → Disruption
    await page.getByText('Standard').click();
    await page.getByText('Risk View').click();
    await expect(page.getByText('Disruption').first()).toBeVisible({ timeout: 3000 });

    // Instruction hint should be visible
    await expect(
      page.getByText(/Click a supplier/)
    ).toBeVisible({ timeout: 3000 });
  });

  test('legend shows disruption items in disruption mode', async ({ page }) => {
    // Standard → Risk → Disruption
    await page.getByText('Standard').click();
    await page.getByText('Risk View').click();
    await expect(page.getByText('Disruption').first()).toBeVisible({ timeout: 3000 });

    await expect(page.getByText('Healthy')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Disabled')).toBeVisible();
  });

  test('cycles back to Standard from Disruption on third click', async ({ page }) => {
    // Standard → Risk → Disruption → Standard
    await page.getByText('Standard').click();
    await page.getByText('Risk View').click();

    // Wait for Disruption to appear, then click the toggle button
    const disruptionToggle = page.locator('[data-testid="view-mode-toggle"]');
    await expect(disruptionToggle).toBeVisible({ timeout: 3000 });
    await disruptionToggle.click();

    await expect(page.getByText('Standard')).toBeVisible({ timeout: 3000 });
  });

  test('risk panel disappears when leaving risk mode', async ({ page }) => {
    // Enter risk mode
    await page.getByText('Standard').click();
    await expect(page.getByText('Network Risk')).toBeVisible({ timeout: 3000 });

    // Advance to disruption mode
    await page.getByText('Risk View').click();
    await expect(page.getByText('Disruption').first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Network Risk')).not.toBeVisible({ timeout: 3000 });
  });
});
