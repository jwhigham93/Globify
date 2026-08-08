/**
 * Starry background — an equirectangular scene background.
 *
 * This used to be a textured sphere of radius 20000 rendered with BackSide.
 * That cost a full-screen textured draw every frame and forced CAMERA_FAR to
 * 50000, giving a 50000:1 depth range that wrecked precision for the small
 * surface markers. `scene.background` is composited by the renderer instead,
 * and `scene.backgroundRotation` keeps the spin control working.
 */

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TEXTURE_ASSETS, resolveAssetUri } from './textures';
import { STAR_ROTATION_SPEED_Y, STAR_ROTATION_SPEED_X } from './constants';

export interface StarryBackgroundProps {
  isSpinning?: boolean;
}

export const StarryBackground: React.FC<StarryBackgroundProps> = ({
  isSpinning = true,
}) => {
  const { scene } = useThree();
  const textureRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    // Dark fill until the star texture arrives.
    scene.background = new THREE.Color(0x000011);

    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      resolveAssetUri(TEXTURE_ASSETS.nightSky),
      (loadedTexture) => {
        if (cancelled) {
          loadedTexture.dispose();
          return;
        }
        loadedTexture.mapping = THREE.EquirectangularReflectionMapping;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = loadedTexture;
        scene.background = loadedTexture;
      },
      undefined,
      (error) => {
        console.error('Error loading star texture:', error);
      },
    );

    return () => {
      cancelled = true;
      scene.background = null;
      textureRef.current?.dispose();
      textureRef.current = null;
    };
  }, [scene]);

  useFrame(() => {
    // Only meaningful once the equirect texture is installed; rotating a solid
    // Color background is a no-op, which is the correct fallback behaviour.
    if (!isSpinning || !textureRef.current) return;
    scene.backgroundRotation.y += STAR_ROTATION_SPEED_Y;
    scene.backgroundRotation.x += STAR_ROTATION_SPEED_X;
  });

  return null;
};
