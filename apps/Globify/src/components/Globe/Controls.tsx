/**
 * Camera controls component for user interaction
 */

import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const Controls: React.FC = () => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  React.useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controlsRef.current = controls;

    return () => {
      controls.dispose();
    };
  }, [camera, gl]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return null;
};
