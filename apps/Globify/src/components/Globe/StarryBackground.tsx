/**
 * Starry background component - creates a rotating star sphere
 */

import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TEXTURE_ASSETS, resolveAssetUri } from './textures';
import { STAR_SPHERE_RADIUS } from './constants';

export interface StarryBackgroundProps {
  isSpinning?: boolean;
}

export const StarryBackground: React.FC<StarryBackgroundProps> = ({ isSpinning = true }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    // Set a dark background color as fallback
    scene.background = new THREE.Color(0x000011);

    // Load the star texture from local assets
    const textureUri = resolveAssetUri(TEXTURE_ASSETS.nightSky);
    const loader = new THREE.TextureLoader();
    loader.load(
      textureUri,
      (loadedTexture) => {
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('Error loading star texture:', error);
      }
    );
  }, [scene]);

  // Rotate the star sphere slowly (only when spinning is enabled)
  useFrame(() => {
    if (meshRef.current && isSpinning) {
      meshRef.current.rotation.y += 0.0001;
      meshRef.current.rotation.x += 0.00005;
    }
  });

  if (!texture) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[STAR_SPHERE_RADIUS, 32, 32]} />
      <meshBasicMaterial side={THREE.BackSide} map={texture} />
    </mesh>
  );
};
