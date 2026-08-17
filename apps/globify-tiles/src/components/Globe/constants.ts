/**
 * Cesium Ion asset ID for Google's Photorealistic 3D Tiles dataset.
 * See openspec/changes/tiles-globe-v2-init/design.md.
 */
export const GOOGLE_PHOTOREALISTIC_TILES_ASSET_ID = '2275207';

/**
 * Public Draco decoder CDN path — same one three.js's own examples use.
 * Avoids bundling/serving WASM decoder assets ourselves (see task 4.3).
 */
export const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

/** Initial camera framing: above Chicago, IL — a recognizable point roughly
 * central to this app's US-focused supply-chain dataset. Tune once real
 * data/markers exist (task 7); this is only a first-paint starting point.
 *
 * Altitude matches the three.js webgl_loader_3dtiles reference example's
 * 500m "flying above the city" framing, not an orbital overview — that's
 * the altitude at which Google's photorealistic building-level tile detail
 * is actually visible, which is the whole point of this dataset. An
 * earlier 2,000,000m orbital altitude (task 9 bug-fix) also produced a
 * near/far camera-clipping ratio of ~1e9, which is far outside safe
 * WebGL depth-buffer precision and manifested as "microscope"-like
 * z-fighting/distortion when zooming in — see TilesGlobeScene.tsx's
 * near/far comment. */
export const INITIAL_CAMERA_LAT_DEG = 41.8781;
export const INITIAL_CAMERA_LON_DEG = -87.6298;
export const INITIAL_CAMERA_ALTITUDE_M = 500;
