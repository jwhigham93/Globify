/**
 * Simple R3F test - just a spinning cube
 * To verify R3F works before adding three-globe
 */

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { GlobeVisualizationProps } from './types';
import * as THREE from 'three';

function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export const GlobeVisualization: React.FC<GlobeVisualizationProps> = ({
  backgroundColor = '#000000',
  testID = 'globe-visualization',
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor,
      }}
      data-testid={testID}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <RotatingCube />
        <OrbitControls />
      </Canvas>
    </div>
  );
};
