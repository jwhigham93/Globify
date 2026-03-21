/**
 * Camera controls component for user interaction
 */

import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ZOOM_MIN_DISTANCE,
  ZOOM_MAX_DISTANCE,
  ZOOM_SPEED_FAR,
  ZOOM_SPEED_NEAR,
  ZOOM_SLOWDOWN_DIST,
  ROTATE_SPEED_FAR,
  ROTATE_SPEED_NEAR,
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
        console.log(`[zoom] camera distance: ${dist}`);
      }

      // Adaptive zoom speed — slow down as we approach the surface
      const rawDist = camera.position.length();
      const t = Math.max(0, Math.min(1,
        (rawDist - ZOOM_MIN_DISTANCE) / (ZOOM_SLOWDOWN_DIST - ZOOM_MIN_DISTANCE),
      ));
      controlsRef.current.zoomSpeed = ZOOM_SPEED_NEAR + t * (ZOOM_SPEED_FAR - ZOOM_SPEED_NEAR);
      controlsRef.current.rotateSpeed = ROTATE_SPEED_NEAR + t * (ROTATE_SPEED_FAR - ROTATE_SPEED_NEAR);
    }
  });

  return null;
};
