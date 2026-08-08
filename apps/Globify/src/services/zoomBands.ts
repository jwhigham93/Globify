/**
 * Camera distance → discrete zoom bands.
 *
 * Controls used to report the rounded camera distance to React, so every
 * 1-unit change re-rendered the component tree — roughly 70 times per zoom
 * sweep, each render re-clustering the dataset and rebuilding every marker.
 *
 * React only ever branches on two booleans, so that is all that is reported,
 * and only when one of them flips. Everything else that varies continuously
 * with distance (marker scale, arc stroke, tile level) reads
 * `camera.position.length()` directly inside a frame callback.
 *
 * Pure module with no three.js imports so it stays cheap to test.
 */
import { CONTROLS_HINT_HIDE_DISTANCE, ZOOM_BAND_HYSTERESIS } from '../components/Globe/constants';
import { LOD_CLUSTER_CAMERA_THRESHOLD } from './lodClustering';

export interface ZoomBand {
  /** Camera is far enough out that restaurants should aggregate into clusters. */
  lodClustered: boolean;
  /** Camera is far enough out that the controls hint is still worth showing. */
  showHint: boolean;
}

/**
 * True when `distance` is above `threshold`, with a dead zone around the
 * boundary so jitter while sitting on it can't oscillate the flag.
 */
function applyHysteresis(
  distance: number,
  threshold: number,
  previous: boolean | undefined,
): boolean {
  if (previous === undefined) return distance > threshold;
  return previous
    ? distance > threshold - ZOOM_BAND_HYSTERESIS
    : distance > threshold + ZOOM_BAND_HYSTERESIS;
}

/** Quantize a camera distance into the band flags, relative to a previous band. */
export function computeZoomBand(distance: number, previous?: ZoomBand): ZoomBand {
  return {
    lodClustered: applyHysteresis(
      distance,
      LOD_CLUSTER_CAMERA_THRESHOLD,
      previous?.lodClustered,
    ),
    showHint: applyHysteresis(
      distance,
      CONTROLS_HINT_HIDE_DISTANCE,
      previous?.showHint,
    ),
  };
}

export function sameZoomBand(a: ZoomBand, b: ZoomBand): boolean {
  return a.lodClustered === b.lodClustered && a.showHint === b.showHint;
}
