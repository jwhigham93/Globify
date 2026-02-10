/**
 * Camera controls component for user interaction
 */

import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ZOOM_MIN_DISTANCE,
  ZOOM_MAX_DISTANCE,
} from './constants';

interface ControlsProps {
  onZoomChange?: (distance: number) => void;
  /** When set, smoothly animate the camera to this distance */
  zoomTarget?: number | null;
  /** Called when the camera reaches the zoom target */
  onZoomTargetReached?: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ onZoomChange, zoomTarget, onZoomTargetReached }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const lastDistance = useRef<number>(0);

  React.useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.minDistance = ZOOM_MIN_DISTANCE;
    controls.maxDistance = ZOOM_MAX_DISTANCE;
    controlsRef.current = controls;

    return () => {
      controls.dispose();
    };
  }, [camera, gl]);

  useFrame(() => {
    if (controlsRef.current) {
      // Smooth zoom animation toward target distance
      if (zoomTarget != null) {
        const currentDist = camera.position.length();
        if (Math.abs(currentDist - zoomTarget) < 2) {
          onZoomTargetReached?.();
        } else {
          const newDist = currentDist + (zoomTarget - currentDist) * 0.06;
          camera.position.normalize().multiplyScalar(newDist);
        }
      }

      controlsRef.current.update();
      // Report distance changes (rounded to avoid excessive re-renders)
      const dist = Math.round(camera.position.length());
      if (dist !== lastDistance.current) {
        lastDistance.current = dist;
        onZoomChange?.(dist);
      }
    }
  });

  return null;
};
