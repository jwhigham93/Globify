import { useContext, useMemo } from 'react';
import { TilesRendererContext } from '3d-tiles-renderer/r3f';
import { transformToDataPoints } from '@jw-dev/globify-services';
import type { DataPoint } from '@jw-dev/globify-services';
import { useSupplyChainData } from '../../hooks/useSupplyChainData';
import { latLngToEcef } from '../../services/ecefBridge';

/**
 * Marker size in meters. Real-world scale (unlike v1's globe-relative
 * units) — 8km is visible without dominating the view at typical camera
 * distances. Tunable; see design.md's open question on carModel-style
 * scale factors for real-world rendering.
 */
const MARKER_SIZE_M = 8000;

/** Cone = supplier, box = DC, sphere = restaurant — matches v1's
 * createLocationMarker convention (GlobeScene.tsx), reimplemented here
 * since the original is three-globe-specific (globe-relative altitude
 * placement), not directly reusable at ECEF scale. */
function markerShape(locationType: DataPoint['locationType']): 'cone' | 'box' | 'sphere' {
  switch (locationType) {
    case 'supplier':
      return 'cone';
    case 'dc':
      return 'box';
    case 'restaurant':
    default:
      return 'sphere';
  }
}

function Marker({ point }: { point: DataPoint }) {
  const tiles = useContext(TilesRendererContext);

  const position = useMemo(() => {
    if (!tiles?.ellipsoid) return null;
    return latLngToEcef(tiles.ellipsoid, point.lat, point.lng, 0);
  }, [tiles, point.lat, point.lng]);

  if (!position) return null;

  const shape = markerShape(point.locationType);

  return (
    <mesh position={position}>
      {shape === 'cone' && (
        <coneGeometry args={[MARKER_SIZE_M / 2, MARKER_SIZE_M, 8]} />
      )}
      {shape === 'box' && (
        <boxGeometry args={[MARKER_SIZE_M, MARKER_SIZE_M, MARKER_SIZE_M]} />
      )}
      {shape === 'sphere' && (
        <sphereGeometry args={[MARKER_SIZE_M / 2, 12, 12]} />
      )}
      <meshBasicMaterial color={point.color ?? '#ffffff'} />
    </mesh>
  );
}

/** Renders every supplier/DC/restaurant location as a marker, positioned
 * via the ellipsoid coordinate bridge. Must be a child of <TilesRenderer>. */
export function LocationMarkers() {
  const { locations, isLoading, isError } = useSupplyChainData();
  const points = useMemo(() => transformToDataPoints(locations), [locations]);

  if (isLoading || isError) return null;

  return (
    <>
      {points.map((point) => (
        <Marker key={point.id} point={point} />
      ))}
    </>
  );
}
