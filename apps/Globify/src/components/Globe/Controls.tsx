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
  ORBIT_DAMPING_FACTOR,
} from './constants';
import { computeZoomBand, sameZoomBand } from '../../services/zoomBands';
import type { ZoomBand } from '../../services/zoomBands';

interface ControlsProps {
  /** Fires only when a zoom band flips, not on every distance change. */
  onZoomBandChange?: (band: ZoomBand) => void;
  /** When set, smoothly animate the camera to this distance */
  zoomTarget?: number | null;
  /** Called when the camera reaches the zoom target */
  onZoomTargetReached?: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  onZoomBandChange,
  zoomTarget,
  onZoomTargetReached,
}) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const bandRef = useRef<ZoomBand | null>(null);

  React.useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableZoom = true;
    // Panning translates the orbit target off the origin, which silently
    // invalidates every camera.position.length() reading in the app — LOD
    // clustering, marker scale, tile zoom level and arc stroke all assume the
    // camera orbits the origin. Rotate and zoom only.
    controls.enablePan = false;
    controls.enableRotate = true;
    // Free under a continuous frame loop, and it is most of what makes touch
    // rotation feel smooth on a phone.
    controls.enableDamping = true;
    controls.dampingFactor = ORBIT_DAMPING_FACTOR;
    controls.minDistance = ZOOM_MIN_DISTANCE;
    controls.maxDistance = ZOOM_MAX_DISTANCE;
    controlsRef.current = controls;

    return () => {
      controls.dispose();
    };
  }, [camera, gl]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

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

    controls.update();

    const dist = camera.position.length();

    const nextBand = computeZoomBand(dist, bandRef.current ?? undefined);
    if (!bandRef.current || !sameZoomBand(bandRef.current, nextBand)) {
      bandRef.current = nextBand;
      onZoomBandChange?.(nextBand);
    }

    // Adaptive zoom speed — slow down as we approach the surface
    const t = Math.max(0, Math.min(1,
      (dist - ZOOM_MIN_DISTANCE) / (ZOOM_SLOWDOWN_DIST - ZOOM_MIN_DISTANCE),
    ));
    controls.zoomSpeed = ZOOM_SPEED_NEAR + t * (ZOOM_SPEED_FAR - ZOOM_SPEED_NEAR);
    controls.rotateSpeed = ROTATE_SPEED_NEAR + t * (ROTATE_SPEED_FAR - ROTATE_SPEED_NEAR);
  });

  return null;
};
