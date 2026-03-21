/**
 * Tile Coordinate Math for equirectangular tile grids.
 *
 * Converts between geographic coordinates (lat/lng) and tile indices
 * within a Z/X/Y grid, based on the tile-manifest.json zoom levels.
 */

export interface TileIndex {
  z: number;
  x: number;
  y: number;
}

export interface TileBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ZoomLevel {
  z: number;
  cols: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
}

/**
 * Convert lat/lng to tile index within an equirectangular grid.
 *
 * Equirectangular projection:
 *   x = (lng + 180) / 360 * cols
 *   y = (90 - lat) / 180 * rows
 */
export function latLngToTileIndex(
  lat: number,
  lng: number,
  cols: number,
  rows: number,
): { x: number; y: number } {
  // Normalize longitude to [-180, 180)
  const normLng = ((lng + 180) % 360 + 360) % 360 - 180;
  // Clamp latitude to [-90, 90]
  const clampLat = Math.max(-90, Math.min(90, lat));

  const x = Math.floor(((normLng + 180) / 360) * cols);
  const y = Math.floor(((90 - clampLat) / 180) * rows);

  return {
    x: Math.max(0, Math.min(cols - 1, x)),
    y: Math.max(0, Math.min(rows - 1, y)),
  };
}

/**
 * Get the geographic bounds of a tile at position (z, x, y).
 */
export function tileToLatLngBounds(
  z: number,
  x: number,
  y: number,
  cols: number,
  rows: number,
): TileBounds {
  const tileWidth = 360 / cols;
  const tileHeight = 180 / rows;

  const west = -180 + x * tileWidth;
  const east = west + tileWidth;
  const north = 90 - y * tileHeight;
  const south = north - tileHeight;

  return { north, south, east, west };
}

/**
 * Get all tile indices visible from the given center point at the given zoom level.
 * Returns the center tile plus its 8 neighbors (clamped to grid bounds).
 */
export function getVisibleTileIndices(
  centerLat: number,
  centerLng: number,
  zoomLevel: ZoomLevel,
): TileIndex[] {
  const { z, cols, rows } = zoomLevel;
  const center = latLngToTileIndex(centerLat, centerLng, cols, rows);

  const indices: TileIndex[] = [];
  const seen = new Set<string>();

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      // Wrap X around the antimeridian
      const tx = (center.x + dx + cols) % cols;
      const ty = center.y + dy;

      // Clamp Y to valid range (poles don't wrap)
      if (ty < 0 || ty >= rows) continue;

      const key = `${z}/${tx}/${ty}`;
      if (!seen.has(key)) {
        seen.add(key);
        indices.push({ z, x: tx, y: ty });
      }
    }
  }

  return indices;
}
