/**
 * Texture assets configuration
 * Earth texture sourced from NASA Earth Observatory's Black Marble project:
 * https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
 *
 * Only the two textures actually rendered live here. Metro bundles whatever
 * a `require()` call points at regardless of whether the resulting property
 * is ever read at runtime — so a medium-res tier, an un-dimmed high-res
 * tier, and a day-side (Blue Marble) texture previously sat in this object
 * unused, adding ~42MB to every build for zero runtime benefit. Swapping
 * quality tiers already requires a code change and rebuild, so there's no
 * "keep it bundled in case someone flips a flag" case for the others —
 * re-add a texture here (and restore its file under assets/textures/) only
 * when something actually renders it.
 */

import { Asset } from 'expo-asset';

// Local texture assets - bundled with the app for reliability
export const TEXTURE_ASSETS = {
  // NASA Black Marble 2016 Grayscale - High resolution (13500x6750, 3km) - Dimmed lights
  earthNightHighResDimmed: require('../../../assets/textures/earth-night-2016-highres-gray-dimmed-2.jpg'),
  // Starry background
  nightSky: require('../../../assets/textures/night-sky.png'),
};

/**
 * Helper to resolve asset URI for both web and native platforms
 * On web, require() returns the URL string directly
 * On native, require() returns a module ID that needs expo-asset to resolve
 */
export const resolveAssetUri = (asset: string | number): string => {
  // On web, Metro returns the URL string directly from require()
  if (typeof asset === 'string') {
    return asset;
  }
  // On native, we need to use expo-asset to resolve the module ID
  return Asset.fromModule(asset).uri;
};
