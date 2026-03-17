/**
 * Tile Composite Shader — composites high-res tile overlays on top of the
 * base globe texture using geographic bounds for positioning.
 *
 * Supports up to 8 simultaneous tile overlay slots with per-tile alpha
 * for smooth fade-in transitions.
 */

import * as THREE from 'three';
import type { TileBounds } from '../../services/tileCoordinates';

const MAX_TILE_SLOTS = 8;

// ── GLSL Shaders ──────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Generate fragment shader with N tile overlay samplers
function buildFragmentShader(): string {
  let samplerDecls = '';
  let boundsDecls = '';
  let alphaDecls = '';
  let overlayCode = '';

  for (let i = 0; i < MAX_TILE_SLOTS; i++) {
    samplerDecls += `uniform sampler2D uTile${i};\n`;
    boundsDecls += `uniform vec4 uTileBounds${i};\n`; // x=west, y=south, z=east, w=north
    alphaDecls += `uniform float uTileAlpha${i};\n`;

    overlayCode += `
    {
      vec4 bounds = uTileBounds${i};
      float a = uTileAlpha${i};
      if (a > 0.0) {
        float west = bounds.x;
        float south = bounds.y;
        float east = bounds.z;
        float north = bounds.w;
        // Convert UV to lng/lat: u=[0,1] → lng=[-180,180], v=[0,1] → lat=[-90,90] (v=0 is south)
        float lng = mix(-180.0, 180.0, vUv.x);
        float lat = mix(-90.0, 90.0, vUv.y);
        if (lng >= west && lng <= east && lat >= south && lat <= north) {
          float tu = (lng - west) / (east - west);
          float tv = (lat - south) / (north - south);
          vec4 tileColor = texture2D(uTile${i}, vec2(tu, tv));
          color = mix(color, tileColor, a);
        }
      }
    }
    `;
  }

  return /* glsl */ `
    uniform sampler2D uBaseTexture;
    ${samplerDecls}
    ${boundsDecls}
    ${alphaDecls}
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(uBaseTexture, vUv);
      ${overlayCode}
      gl_FragColor = color;
    }
  `;
}

// ── Material Factory ──────────────────────────────────────────────────

export interface TileShaderMaterial extends THREE.ShaderMaterial {
  __tileSlots: {
    key: string;
    alpha: number;
    startTime: number;
  }[];
}

/**
 * Create a ShaderMaterial that composites tile overlays on a base globe texture.
 */
export function createTileCompositeMaterial(
  baseTexture: THREE.Texture,
): TileShaderMaterial {
  const uniforms: Record<string, THREE.IUniform> = {
    uBaseTexture: { value: baseTexture },
  };

  // Initialize empty tile slots
  const placeholderTex = new THREE.Texture();
  for (let i = 0; i < MAX_TILE_SLOTS; i++) {
    uniforms[`uTile${i}`] = { value: placeholderTex };
    uniforms[`uTileBounds${i}`] = { value: new THREE.Vector4(0, 0, 0, 0) };
    uniforms[`uTileAlpha${i}`] = { value: 0.0 };
  }

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: buildFragmentShader(),
    uniforms,
    transparent: false,
  }) as TileShaderMaterial;

  material.__tileSlots = Array.from({ length: MAX_TILE_SLOTS }, () => ({
    key: '',
    alpha: 0,
    startTime: 0,
  }));

  return material;
}

/**
 * Bind a loaded tile texture to a shader overlay slot.
 */
export function updateTileOverlay(
  material: TileShaderMaterial,
  slotIndex: number,
  tileTexture: THREE.Texture,
  bounds: TileBounds,
  alpha: number,
): void {
  if (slotIndex < 0 || slotIndex >= MAX_TILE_SLOTS) return;

  material.uniforms[`uTile${slotIndex}`].value = tileTexture;
  material.uniforms[`uTileBounds${slotIndex}`].value = new THREE.Vector4(
    bounds.west,
    bounds.south,
    bounds.east,
    bounds.north,
  );
  material.uniforms[`uTileAlpha${slotIndex}`].value = alpha;
}

/**
 * Clear a tile overlay slot.
 */
export function clearTileOverlay(
  material: TileShaderMaterial,
  slotIndex: number,
): void {
  if (slotIndex < 0 || slotIndex >= MAX_TILE_SLOTS) return;
  material.uniforms[`uTileAlpha${slotIndex}`].value = 0.0;
  material.__tileSlots[slotIndex] = { key: '', alpha: 0, startTime: 0 };
}

/**
 * Animate tile fade-in. Call per frame. Returns true if any tiles are still animating.
 */
export function animateTileFadeIn(
  material: TileShaderMaterial,
  fadeDurationMs: number,
): boolean {
  const now = performance.now();
  let animating = false;

  for (let i = 0; i < MAX_TILE_SLOTS; i++) {
    const slot = material.__tileSlots[i];
    if (slot.key && slot.alpha < 1) {
      const elapsed = now - slot.startTime;
      const newAlpha = Math.min(1, elapsed / fadeDurationMs);
      slot.alpha = newAlpha;
      material.uniforms[`uTileAlpha${i}`].value = newAlpha;
      if (newAlpha < 1) animating = true;
    }
  }

  return animating;
}

/**
 * Find an available slot index or the oldest slot to evict.
 */
export function findAvailableSlot(material: TileShaderMaterial): number {
  // First try empty slots
  for (let i = 0; i < MAX_TILE_SLOTS; i++) {
    if (!material.__tileSlots[i].key) return i;
  }
  // Evict the oldest (fully faded in) slot
  let oldest = 0;
  let oldestTime = Infinity;
  for (let i = 0; i < MAX_TILE_SLOTS; i++) {
    if (material.__tileSlots[i].startTime < oldestTime) {
      oldestTime = material.__tileSlots[i].startTime;
      oldest = i;
    }
  }
  return oldest;
}
