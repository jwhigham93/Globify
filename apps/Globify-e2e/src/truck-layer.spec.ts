/**
 * E2E guard for the vehicle layer.
 *
 * TruckLayer owns its meshes directly rather than going through three-globe's
 * objectsData, so nothing in the DOM reflects whether cars actually rendered —
 * and the layer once shipped attaching an empty group, because vehicle
 * positions arrive before the globe finishes initialising and the reconcile
 * effect never re-ran. Counting WebGL draw calls is the cheapest honest check
 * that meshes exist, and it is exactly what would have caught that.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockApi, vehiclePositions } from './support/mockApi';

declare global {
  interface Window {
    __draws: number;
    __sampleDraws: (ms?: number) => Promise<number>;
  }
}

/** Wraps the GL draw entry points and exposes a per-frame average sampler. */
const DRAW_CALL_PROBE = `
  window.__draws = 0;
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced']) {
      const orig = proto[fn];
      if (!orig) continue;
      proto[fn] = function (...a) { window.__draws++; return orig.apply(this, a); };
    }
  }
  window.__sampleDraws = (ms = 1200) => new Promise((resolve) => {
    const start = window.__draws;
    let frames = 0;
    let raf;
    const tick = () => { frames++; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    setTimeout(() => {
      cancelAnimationFrame(raf);
      resolve((window.__draws - start) / Math.max(frames, 1));
    }, ms);
  });
`;

async function bootGlobe(page: Page): Promise<void> {
  await page.addInitScript(DRAW_CALL_PROBE);
  await mockApi(page);
  await page.goto('/');
  await page.getByTestId('hud-control-bar').waitFor({ state: 'visible', timeout: 30000 });
  // Let the texture land and the scene settle before sampling.
  await page.waitForTimeout(6000);
}

test.describe('Truck layer', () => {
  test('reports the vehicles it received', async ({ page }) => {
    await bootGlobe(page);
    await expect(page.getByTestId('truck-layer-toggle')).toContainText(
      `${vehiclePositions.length} active`,
    );
  });

  test('renders car meshes when enabled and removes them when disabled', async ({ page }) => {
    await bootGlobe(page);

    const before = await page.evaluate(() => window.__sampleDraws());

    await page.getByTestId('truck-layer-toggle').click();
    await page.waitForTimeout(2500);
    const withTrucks = await page.evaluate(() => window.__sampleDraws());

    // Each vehicle contributes a car body and a halo, so the layer must add a
    // clear number of draws. A zero delta means the group attached empty.
    expect(
      withTrucks - before,
      `expected the truck layer to add draw calls (before=${before.toFixed(1)}, after=${withTrucks.toFixed(1)})`,
    ).toBeGreaterThan(vehiclePositions.length);

    await page.getByTestId('truck-layer-toggle').click();
    await page.waitForTimeout(2500);
    const trucksOff = await page.evaluate(() => window.__sampleDraws());

    // Back to roughly the baseline; the layer is hidden, not merely faded.
    expect(trucksOff).toBeLessThan(withTrucks - vehiclePositions.length);
  });

  test('opens the detail panel for a clicked vehicle', async ({ page }) => {
    await bootGlobe(page);
    await page.getByTestId('truck-layer-toggle').click();
    await page.waitForTimeout(2500);

    // Raycasting against a small mesh needs a real target, so sweep a grid over
    // the globe until a truck is hit rather than guessing one point.
    const box = await page.locator('canvas').boundingBox();
    if (!box) throw new Error('no canvas');

    const panel = page.getByTestId('truck-detail-panel');
    for (let gx = 0.3; gx <= 0.7 && !(await panel.isVisible()); gx += 0.04) {
      for (let gy = 0.3; gy <= 0.7; gy += 0.04) {
        await page.mouse.click(box.x + box.width * gx, box.y + box.height * gy);
        await page.waitForTimeout(60);
        if (await panel.isVisible()) break;
      }
    }

    await expect(panel).toBeVisible();
    // Heading is what the car model orients to; it must reach the panel too.
    await expect(panel).toContainText('Heading');
  });
});
