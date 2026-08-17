import { Vector3 } from 'three';
import type { Ellipsoid } from '3d-tiles-renderer/three';

/**
 * Converts a lat/lng/altitude point (the shape every existing
 * @jw-dev/globify-services service already returns) into an ECEF position
 * on the given ellipsoid — the one new coordinate-math surface v2 needs,
 * since everything upstream of this (location/route/risk data) is already
 * plain decimal-degree lat/lng with no rendering-specific shape baked in.
 *
 * Delegates to the tiles ellipsoid's own getCartographicToPosition rather
 * than hand-deriving ECEF vector math, so the result is guaranteed to use
 * the exact same frame/axis convention the TilesRenderer and GlobeControls
 * themselves use — no risk of an independently-reasoned implementation
 * disagreeing with the library on axis order or up-direction.
 *
 * @param ellipsoid - The TilesRenderer instance's `.ellipsoid` (or any
 *   Ellipsoid, e.g. WGS84_ELLIPSOID for contexts without a live renderer).
 * @param latDeg - Latitude in decimal degrees (-90 to 90).
 * @param lngDeg - Longitude in decimal degrees (-180 to 180).
 * @param altitudeM - Height above the ellipsoid surface, in meters.
 * @param target - Optional Vector3 to write into (avoids an allocation
 *   when converting many points per frame, e.g. truck positions).
 */
export function latLngToEcef(
  ellipsoid: Ellipsoid,
  latDeg: number,
  lngDeg: number,
  altitudeM = 0,
  target: Vector3 = new Vector3(),
): Vector3 {
  const latRad = (latDeg * Math.PI) / 180;
  const lngRad = (lngDeg * Math.PI) / 180;
  return ellipsoid.getCartographicToPosition(latRad, lngRad, altitudeM, target);
}
