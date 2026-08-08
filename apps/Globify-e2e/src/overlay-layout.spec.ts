/**
 * E2E guards for HUD overlay layout.
 *
 * Two failure modes are covered:
 *  - Overlays escaping the viewport. On iOS Safari/Chrome the page used to be
 *    laid out at 100vh, which is the *large* viewport, so bottom-anchored
 *    overlays sat under the collapsing toolbar.
 *  - Overlays landing on each other. The legend, the control bar, and the
 *    narrow-screen detail sheet all previously claimed the same bottom strip.
 *
 * Playwright emulates the mobile viewport but not the collapsing toolbar, so
 * the toolbar case still needs a manual pass on a real device.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockApi } from './support/mockApi';

/** Every overlay that can float above the canvas. */
const OVERLAY_IDS = [
  'legend-panel',
  'risk-panel',
  'disruption-panel',
  'entity-detail-panel',
  'truck-detail-panel',
  'hud-control-bar',
  'disruption-hint',
  'controls-hint',
  'failure-banner',
  'spin-toggle',
] as const;

interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Bounding boxes of the overlays currently on screen. */
async function visibleOverlays(page: Page): Promise<Box[]> {
  const boxes: Box[] = [];
  for (const id of OVERLAY_IDS) {
    const locator = page.getByTestId(id);
    if ((await locator.count()) === 0) continue;
    if (!(await locator.first().isVisible())) continue;
    const box = await locator.first().boundingBox();
    if (!box || box.width === 0 || box.height === 0) continue;
    boxes.push({ id, ...box });
  }
  return boxes;
}

function overlaps(a: Box, b: Box): boolean {
  // Touching edges are fine; only genuine area overlap is a defect.
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

async function assertLayoutIsSane(page: Page, context: string): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport size');

  const boxes = await visibleOverlays(page);
  expect(boxes.length, `${context}: expected at least one overlay`).toBeGreaterThan(0);

  for (const box of boxes) {
    const within =
      box.x >= -1 &&
      box.y >= -1 &&
      box.x + box.width <= viewport.width + 1 &&
      box.y + box.height <= viewport.height + 1;
    expect(
      within,
      `${context}: "${box.id}" escapes the viewport — ` +
        `box ${JSON.stringify(box)} vs viewport ${JSON.stringify(viewport)}`,
    ).toBe(true);
  }

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(
        overlaps(boxes[i], boxes[j]),
        `${context}: "${boxes[i].id}" overlaps "${boxes[j].id}" — ` +
          `${JSON.stringify(boxes[i])} vs ${JSON.stringify(boxes[j])}`,
      ).toBe(false);
    }
  }
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.locator('[data-testid="globe-visualization"]').waitFor({
    state: 'attached',
    timeout: 10000,
  });
  await expect(page.getByTestId('hud-control-bar')).toBeVisible({ timeout: 10000 });
});

test.describe('HUD overlay layout', () => {
  test('standard view: overlays fit and do not collide', async ({ page }) => {
    await assertLayoutIsSane(page, 'standard');
  });

  test('risk view: overlays fit and do not collide', async ({ page }) => {
    await page.getByTestId('view-mode-toggle').click();
    await expect(page.getByTestId('risk-panel')).toBeVisible({ timeout: 5000 });
    await assertLayoutIsSane(page, 'risk');
  });

  test('disruption view: overlays fit and do not collide', async ({ page }) => {
    await page.getByTestId('view-mode-toggle').click();
    await page.getByTestId('view-mode-toggle').click();
    await expect(page.getByTestId('disruption-hint')).toBeVisible({ timeout: 5000 });
    await assertLayoutIsSane(page, 'disruption');
  });

  test('truck layer enabled: overlays fit and do not collide', async ({ page }) => {
    await page.getByTestId('truck-layer-toggle').click();
    await assertLayoutIsSane(page, 'trucks on');
  });

  test('control bar stays inside the viewport', async ({ page }) => {
    // This is the direct regression for the iOS toolbar clipping the bottom of
    // the HUD: the bar is the lowest interactive overlay we ship.
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('no viewport size');

    const box = await page.getByTestId('hud-control-bar').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  });

  test('spin toggle stays inside the viewport', async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('no viewport size');

    const box = await page.getByTestId('spin-toggle').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(box!.x).toBeGreaterThanOrEqual(0);
  });
});
