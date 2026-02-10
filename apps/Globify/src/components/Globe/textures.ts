/**
 * Texture assets configuration
 * Earth textures sourced from NASA Earth Observatory
 * - Night: Black Marble project https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
 * - Day: Blue Marble Next Generation https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/
 */

import { Asset } from 'expo-asset';

// Local texture assets - bundled with the app for reliability
export const TEXTURE_ASSETS = {
  // NASA Black Marble 2016 Grayscale - Medium resolution (3600x1800) - lighter weight
  earthNightMediumRes: require('../../../assets/textures/earth-night-2016-mediumres-gray.jpg'),
  // NASA Black Marble 2016 Grayscale - High resolution (13500x6750, 3km)
  earthNightHighRes: require('../../../assets/textures/earth-night-2016-highres-gray.jpg'),
  // NASA Black Marble 2016 Grayscale - High resolution (13500x6750, 3km) - Dimmed lights
  earthNightHighResDimmed: require('../../../assets/textures/earth-night-2016-highres-gray-dimmed-2.jpg'),
  // NASA Blue Marble Next Generation - Medium resolution (5400x2700, 8km) - July 2004
  earthDayMediumRes: require('../../../assets/textures/earth-day-bluemarble-mediumres.jpg'),
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
