/**
 * Unit tests for tile coordinate math
 */
import {
  latLngToTileIndex,
  tileToLatLngBounds,
  getVisibleTileIndices,
} from './tileCoordinates';

describe('latLngToTileIndex', () => {
  it('maps (0, 0) to center tile in a 4x2 grid', () => {
    const { x, y } = latLngToTileIndex(0, 0, 4, 2);
    expect(x).toBe(2);
    expect(y).toBe(1);
  });

  it('maps north pole (90, 0) to top-left area', () => {
    const { x, y } = latLngToTileIndex(90, -180, 4, 2);
    expect(y).toBe(0); // top row
    expect(x).toBe(0); // leftmost column
  });

  it('maps south pole (-90, 180) to bottom-right area', () => {
    const { x, y } = latLngToTileIndex(-90, 179, 4, 2);
    expect(y).toBe(1); // bottom row
  });

  it('clamps latitude beyond +-90', () => {
    const { y: y1 } = latLngToTileIndex(100, 0, 4, 4);
    const { y: y2 } = latLngToTileIndex(90, 0, 4, 4);
    expect(y1).toBe(y2);
  });

  it('normalizes longitude wrapping', () => {
    const a = latLngToTileIndex(0, 10, 4, 2);
    const b = latLngToTileIndex(0, 370, 4, 2);
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });

  it('returns valid indices within grid bounds', () => {
    for (let lat = -90; lat <= 90; lat += 30) {
      for (let lng = -180; lng <= 180; lng += 60) {
        const { x, y } = latLngToTileIndex(lat, lng, 8, 4);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(8);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(4);
      }
    }
  });
});

describe('tileToLatLngBounds', () => {
  it('computes correct bounds for top-left tile', () => {
    const bounds = tileToLatLngBounds(1, 0, 0, 4, 2);
    expect(bounds.west).toBe(-180);
    expect(bounds.north).toBe(90);
    expect(bounds.east).toBe(-90);
    expect(bounds.south).toBe(0);
  });

  it('covers the full globe at z=0 (1x1)', () => {
    const bounds = tileToLatLngBounds(0, 0, 0, 1, 1);
    expect(bounds.west).toBe(-180);
    expect(bounds.east).toBe(180);
    expect(bounds.north).toBe(90);
    expect(bounds.south).toBe(-90);
  });

  it('all tiles in a grid cover 360 longitude', () => {
    const cols = 4;
    let totalLng = 0;
    for (let x = 0; x < cols; x++) {
      const b = tileToLatLngBounds(1, x, 0, cols, 2);
      totalLng += b.east - b.west;
    }
    expect(totalLng).toBeCloseTo(360, 5);
  });
});

describe('getVisibleTileIndices', () => {
  const zoomLevel = { z: 1, cols: 4, rows: 2, tileWidth: 90, tileHeight: 90 };
  const bigGrid = { z: 2, cols: 8, rows: 4, tileWidth: 45, tileHeight: 45 };

  it('returns center tile and 8 neighbors (interior)', () => {
    // Use a 8x4 grid so row 1 or 2 is truly interior
    const indices = getVisibleTileIndices(10, -90, bigGrid);
    expect(indices.length).toBe(9);
  });

  it('returns fewer tiles at pole edges (no wrap on Y)', () => {
    // North pole — top row has no row above it
    const indices = getVisibleTileIndices(89, 0, zoomLevel);
    // y=0 means no dy=-1 row → only 6 tiles
    expect(indices.length).toBeLessThanOrEqual(6);
  });

  it('wraps X around the antimeridian', () => {
    // At longitude ~180 — should wrap X
    const indices = getVisibleTileIndices(0, 179, zoomLevel);
    const xValues = indices.map((i) => i.x);
    // Should include both far-right and wrapped-around far-left columns
    expect(xValues).toContain(0); // wrapped
    expect(xValues).toContain(3); // rightmost
  });

  it('returns no duplicate tiles', () => {
    const indices = getVisibleTileIndices(0, 0, zoomLevel);
    const keys = indices.map((i) => `${i.z}/${i.x}/${i.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('all returned tiles are within grid bounds', () => {
    const indices = getVisibleTileIndices(0, 0, zoomLevel);
    for (const idx of indices) {
      expect(idx.x).toBeGreaterThanOrEqual(0);
      expect(idx.x).toBeLessThan(zoomLevel.cols);
      expect(idx.y).toBeGreaterThanOrEqual(0);
      expect(idx.y).toBeLessThan(zoomLevel.rows);
    }
  });
});
