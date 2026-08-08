/**
 * Tests for the camera zoom-band quantizer.
 *
 * Controls previously reported the rounded camera distance to React, so every
 * 1-unit change re-rendered the tree and re-derived the whole dataset. It now
 * reports only the two booleans the UI branches on, and only when one flips —
 * so the exact threshold and hysteresis behaviour is what matters here.
 */
import { computeZoomBand } from './zoomBands';
import { CONTROLS_HINT_HIDE_DISTANCE, ZOOM_BAND_HYSTERESIS } from '../components/Globe/constants';
import { LOD_CLUSTER_CAMERA_THRESHOLD } from './lodClustering';

describe('computeZoomBand', () => {
  describe('without a previous band', () => {
    it('does not cluster at or below the threshold', () => {
      expect(
        computeZoomBand(LOD_CLUSTER_CAMERA_THRESHOLD).lodClustered,
      ).toBe(false);
      expect(computeZoomBand(107).lodClustered).toBe(false);
    });

    it('clusters above the threshold', () => {
      expect(
        computeZoomBand(LOD_CLUSTER_CAMERA_THRESHOLD + 0.1).lodClustered,
      ).toBe(true);
      expect(computeZoomBand(200).lodClustered).toBe(true);
    });

    it('shows the controls hint only when zoomed out', () => {
      expect(computeZoomBand(CONTROLS_HINT_HIDE_DISTANCE + 1).showHint).toBe(true);
      expect(computeZoomBand(CONTROLS_HINT_HIDE_DISTANCE).showHint).toBe(false);
    });
  });

  describe('hysteresis', () => {
    const on = { lodClustered: true, showHint: true };
    const off = { lodClustered: false, showHint: false };

    it('holds a set flag until the camera clears the dead zone below', () => {
      // Just inside the dead zone — stays clustered rather than flapping.
      const inside = LOD_CLUSTER_CAMERA_THRESHOLD - ZOOM_BAND_HYSTERESIS + 0.5;
      expect(computeZoomBand(inside, on).lodClustered).toBe(true);

      const beyond = LOD_CLUSTER_CAMERA_THRESHOLD - ZOOM_BAND_HYSTERESIS - 0.5;
      expect(computeZoomBand(beyond, on).lodClustered).toBe(false);
    });

    it('holds a cleared flag until the camera clears the dead zone above', () => {
      const inside = LOD_CLUSTER_CAMERA_THRESHOLD + ZOOM_BAND_HYSTERESIS - 0.5;
      expect(computeZoomBand(inside, off).lodClustered).toBe(false);

      const beyond = LOD_CLUSTER_CAMERA_THRESHOLD + ZOOM_BAND_HYSTERESIS + 0.5;
      expect(computeZoomBand(beyond, off).lodClustered).toBe(true);
    });

    it('cannot oscillate while the camera sits on the threshold', () => {
      // Dithering across the boundary must not flip the band back and forth.
      let band = computeZoomBand(LOD_CLUSTER_CAMERA_THRESHOLD - 10);
      const seen = new Set<boolean>([band.lodClustered]);
      for (let i = 0; i < 20; i++) {
        const jitter = LOD_CLUSTER_CAMERA_THRESHOLD + (i % 2 === 0 ? 0.4 : -0.4);
        band = computeZoomBand(jitter, band);
        seen.add(band.lodClustered);
      }
      expect(seen.size).toBe(1);
    });
  });

  it('tracks both flags independently', () => {
    // Between the two thresholds: clustered, but the hint is hidden.
    const between = (LOD_CLUSTER_CAMERA_THRESHOLD + CONTROLS_HINT_HIDE_DISTANCE) / 2;
    expect(computeZoomBand(between)).toEqual({
      lodClustered: true,
      showHint: false,
    });
  });
});
