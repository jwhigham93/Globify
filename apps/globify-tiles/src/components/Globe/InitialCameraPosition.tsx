import { useContext, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Matrix4 } from 'three';
import { TilesRendererContext } from '3d-tiles-renderer/r3f';
import { CAMERA_FRAME } from '3d-tiles-renderer/three';

const DEG2RAD = Math.PI / 180;

// Matches the three.js webgl_loader_3dtiles reference example's framing
// exactly: -90° azimuth / -10° elevation / 0° roll — a "flying just above
// and looking slightly down at" cinematic angle, not a straight-down or
// look-at-Earth-center view. See constants.ts for why this matters more at
// the low altitude this app now uses (task 9 bug-fix: at the vanilla
// example's 500m altitude, "look at ECEF origin" is nearly indistinguishable
// from straight down, which reads as a much flatter, less flyover-like shot
// than the reference).
const CAMERA_AZIMUTH_DEG = -90;
const CAMERA_ELEVATION_DEG = -10;
const CAMERA_ROLL_DEG = 0;

const scratchMatrix = new Matrix4();

/**
 * Positions and orients the camera above a fixed lat/lon/altitude once the
 * tiles renderer is available. Must be a child of <TilesRenderer>.
 *
 * Uses TilesRendererContext (properly typed) rather than the r3f package's
 * EllipsoidContext — the latter is exported at runtime but missing from
 * its own .d.ts, a real upstream type-declaration gap.
 *
 * Uses `ellipsoid.getObjectFrame(..., CAMERA_FRAME)` (matching the
 * reference example) rather than `getCartographicToPosition` + `lookAt`
 * (this component's original implementation) — the former sets both
 * position AND a deliberate cinematic orientation in one matrix; the
 * latter only set position and pointed the camera at the ECEF origin,
 * which is a materially different, flatter-looking shot once the altitude
 * is low enough for the two to diverge (see constants.ts).
 */
export function InitialCameraPosition({
  latDeg,
  lonDeg,
  altitudeM,
}: {
  latDeg: number;
  lonDeg: number;
  altitudeM: number;
}) {
  const tiles = useContext(TilesRendererContext);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const hasPositioned = useRef(false);

  useEffect(() => {
    if (hasPositioned.current || !tiles?.ellipsoid) return;

    const latRad = latDeg * DEG2RAD;
    const lonRad = lonDeg * DEG2RAD;

    tiles.ellipsoid.getObjectFrame(
      latRad,
      lonRad,
      altitudeM,
      CAMERA_AZIMUTH_DEG * DEG2RAD,
      CAMERA_ELEVATION_DEG * DEG2RAD,
      CAMERA_ROLL_DEG * DEG2RAD,
      scratchMatrix,
      CAMERA_FRAME,
    );
    scratchMatrix.decompose(camera.position, camera.quaternion, camera.scale);

    hasPositioned.current = true;
    invalidate();
  }, [tiles, latDeg, lonDeg, altitudeM, camera, invalidate]);

  return null;
}
