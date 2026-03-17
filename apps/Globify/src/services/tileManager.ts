/**
 * Tile Manager — orchestrates progressive tile loading for the globe.
 *
 * Fetches tile-manifest.json from CDN, determines which tiles to load
 * based on camera zoom, and manages an LRU texture cache.
 */

import * as THREE from 'three';
import {
  getVisibleTileIndices,
  latLngToTileIndex,
  type TileIndex,
  type ZoomLevel,
} from './tileCoordinates';
import {
  TILE_CACHE_MAX_SIZE,
  TILE_ZOOM_THRESHOLD_Z1,
  TILE_ZOOM_THRESHOLD_Z2,
} from '../components/Globe/constants';

export interface TileManifest {
  dataset: string;
  generatedAt: string;
  urlPattern: string;
  formats: string[];
  zoomLevels: ZoomLevel[];
}

// ── LRU Cache ─────────────────────────────────────────────────────────

class LRUTextureCache {
  private maxSize: number;
  private cache = new Map<string, THREE.Texture>();

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): THREE.Texture | undefined {
    const tex = this.cache.get(key);
    if (tex) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, tex);
    }
    return tex;
  }

  put(key: string, texture: THREE.Texture): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, texture);
    this.evict();
  }

  private evict(): void {
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey === undefined) break;
      const tex = this.cache.get(firstKey);
      tex?.dispose();
      this.cache.delete(firstKey);
    }
  }

  clear(): void {
    for (const tex of this.cache.values()) {
      tex.dispose();
    }
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ── Tile Manager ──────────────────────────────────────────────────────

export type TileLoadedCallback = (
  key: string,
  texture: THREE.Texture,
  tile: TileIndex,
) => void;

export class TileManager {
  private cdnBaseUrl: string;
  private manifest: TileManifest | null = null;
  private cache: LRUTextureCache;
  private loader = new THREE.TextureLoader();
  private pendingLoads = new Set<string>();
  private _onTileLoaded: TileLoadedCallback | null = null;
  private _activeLoadCount = 0;

  constructor(cdnBaseUrl: string) {
    this.cdnBaseUrl = cdnBaseUrl.replace(/\/$/, '');
    this.cache = new LRUTextureCache(TILE_CACHE_MAX_SIZE);
  }

  set onTileLoaded(cb: TileLoadedCallback | null) {
    this._onTileLoaded = cb;
  }

  get activeLoadCount(): number {
    return this._activeLoadCount;
  }

  async init(): Promise<void> {
    if (!this.cdnBaseUrl) return;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.cdnBaseUrl}/tile-manifest.json`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return;
      this.manifest = await res.json();
    } catch {
      // Silently fail — tile system is optional (server may not be running)
    }
  }

  /** Quick connectivity check — resolves true if the manifest is reachable. */
  static async probe(baseUrl: string): Promise<boolean> {
    if (!baseUrl) return false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${baseUrl}/tile-manifest.json`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Determine the appropriate zoom level based on camera distance.
   */
  private getZoomLevel(cameraDistance: number): ZoomLevel | null {
    if (!this.manifest) return null;
    if (cameraDistance > TILE_ZOOM_THRESHOLD_Z1) return null; // Too far, base texture only

    const targetZ = cameraDistance <= TILE_ZOOM_THRESHOLD_Z2 ? 2 : 1;
    return this.manifest.zoomLevels.find((zl) => zl.z === targetZ) ?? null;
  }

  /**
   * Request tiles for the current view. Called from the render loop.
   */
  requestTiles(centerLat: number, centerLng: number, cameraDistance: number): void {
    const zoomLevel = this.getZoomLevel(cameraDistance);
    if (!zoomLevel) return;

    const tiles = getVisibleTileIndices(centerLat, centerLng, zoomLevel);

    // Sort by distance from center tile (load center first)
    const center = latLngToTileIndex(centerLat, centerLng, zoomLevel.cols, zoomLevel.rows);
    tiles.sort((a, b) => {
      const da = Math.abs(a.x - center.x) + Math.abs(a.y - center.y);
      const db = Math.abs(b.x - center.x) + Math.abs(b.y - center.y);
      return da - db;
    });

    for (const tile of tiles) {
      this.loadTile(tile);
    }
  }

  private loadTile(tile: TileIndex): void {
    const key = `${tile.z}/${tile.x}/${tile.y}`;

    // Already cached or loading
    if (this.cache.get(key) || this.pendingLoads.has(key)) return;

    this.pendingLoads.add(key);
    this._activeLoadCount++;

    // Prefer WebP, fallback to JPG
    const url = `${this.cdnBaseUrl}/${key}.webp`;

    this.loader.load(
      url,
      (texture) => {
        this.cache.put(key, texture);
        this.pendingLoads.delete(key);
        this._activeLoadCount--;
        this._onTileLoaded?.(key, texture, tile);
      },
      undefined,
      () => {
        // WebP failed, try JPG
        const jpgUrl = `${this.cdnBaseUrl}/${key}.jpg`;
        this.loader.load(
          jpgUrl,
          (texture) => {
            this.cache.put(key, texture);
            this.pendingLoads.delete(key);
            this._activeLoadCount--;
            this._onTileLoaded?.(key, texture, tile);
          },
          undefined,
          () => {
            // Both failed — skip silently
            this.pendingLoads.delete(key);
            this._activeLoadCount--;
          },
        );
      },
    );
  }

  getCachedTexture(key: string): THREE.Texture | undefined {
    return this.cache.get(key);
  }

  dispose(): void {
    this.cache.clear();
    this.pendingLoads.clear();
    this._activeLoadCount = 0;
  }
}
