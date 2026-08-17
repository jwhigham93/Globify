import { useContext, useMemo } from 'react';
import { Line } from '@react-three/drei';
import { TilesRendererContext } from '3d-tiles-renderer/r3f';
import type { Ellipsoid } from '3d-tiles-renderer/three';
import { transformToArcs } from '@jw-dev/globify-services';
import type { ArcData } from '@jw-dev/globify-services';
import { useSupplyChainData } from '../../hooks/useSupplyChainData';
import { latLngToEcef } from '../../services/ecefBridge';

const ARC_SEGMENTS = 32;
/** Peak arc height above the surface — visible at a glance, well clear of
 * terrain. Matches v1's visual convention of routes floating above the
 * globe rather than hugging the surface. */
const ARC_PEAK_ALTITUDE_M = 200_000;

/**
 * Interpolates lat/lng linearly between the two endpoints (not a true
 * great-circle path) and bumps altitude along a sine curve peaking at the
 * midpoint. Good enough for this app's US-only dataset; would need
 * antimeridian-aware interpolation (like v1's tile system had, before it
 * was removed) if routes ever crossed the +180/-180 line.
 */
function Arc({ arc, ellipsoid }: { arc: ArcData; ellipsoid: Ellipsoid }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const t = i / ARC_SEGMENTS;
      const lat = arc.startLat + (arc.endLat - arc.startLat) * t;
      const lng = arc.startLng + (arc.endLng - arc.startLng) * t;
      const altitude = Math.sin(Math.PI * t) * ARC_PEAK_ALTITUDE_M;
      const p = latLngToEcef(ellipsoid, lat, lng, altitude);
      pts.push([p.x, p.y, p.z]);
    }
    return pts;
  }, [arc, ellipsoid]);

  return <Line points={points} color={arc.color[0]} lineWidth={2} />;
}

/** Renders every active supply route as an arc between its bridged
 * endpoints, colored per the shared library's route-coloring logic. Must
 * be a child of <TilesRenderer>. */
export function RouteArcs() {
  const { locations, routes, isLoading, isError } = useSupplyChainData();
  const tiles = useContext(TilesRendererContext);
  const arcs = useMemo(() => transformToArcs(locations, routes), [locations, routes]);

  if (isLoading || isError || !tiles?.ellipsoid) return null;

  return (
    <>
      {arcs.map((arc, i) => (
        <Arc
          key={`${arc.sourceId ?? 'unknown'}-${arc.destId ?? 'unknown'}-${i}`}
          arc={arc}
          ellipsoid={tiles.ellipsoid}
        />
      ))}
    </>
  );
}
