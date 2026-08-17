/**
 * App configuration for the v2 tiles UI.
 * Mirrors apps/Globify/src/services/config.ts's layered-precedence pattern
 * (env var first), but deliberately does NOT read cesiumIonToken from
 * app.json's `extra` block the way other fields in that file do — it's a
 * bearer credential, not an identifier, so it must only ever come from a
 * build-time env var (local `.env.local`, EAS secret, or CI secret). See
 * openspec/changes/tiles-globe-v2-init/design.md Decision 5.
 */
export const config = {
  /** Cesium Ion API token, used by CesiumIonAuthPlugin to authenticate
   * Google Photorealistic Tiles requests. Empty string = not configured. */
  cesiumIonToken: process.env.EXPO_PUBLIC_CESIUM_ION_TOKEN || '',

  /** Whether a Cesium Ion token is configured. */
  get isCesiumConfigured(): boolean {
    return !!this.cesiumIonToken;
  },
} as const;
