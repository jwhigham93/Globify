/**
 * Resolves a raycaster's intersection list to the marker the user actually
 * clicked, for GlobeScene's manual raycast-based click handler.
 *
 * Pulled out as a pure function because `THREE.Raycaster.intersectObjects`
 * does not consult `Object3D.visible` — a hidden truck's mesh is still hit —
 * so "was this truck visible" has to be checked explicitly here rather than
 * relying on the scene graph to exclude it.
 */
import type * as THREE from 'three';
import type { DataPoint } from './types';

/** The subset of THREE.Intersection this only needs. */
export interface RaycastHit {
  object: THREE.Object3D;
}

export type ClickTarget =
  | { type: 'truck'; vehicleId: string }
  | { type: 'point'; data: DataPoint };

/**
 * Walks each hit's parent chain (nearest hit first) looking for either a
 * truck wrapper (`userData.vehicleId`, set by TruckLayer) or a three-globe
 * object marker (`__data`, attached directly to the object by three-globe).
 * A truck hit is only honored when `showTrucks` is true — otherwise it's
 * skipped and the walk continues, exactly as if the truck weren't there.
 */
export function resolveClickTarget(
  intersects: RaycastHit[],
  globeRoot: THREE.Object3D,
  showTrucks: boolean,
): ClickTarget | null {
  for (const hit of intersects) {
    let obj: THREE.Object3D | null = hit.object;
    while (obj && obj !== globeRoot) {
      const vehicleId = obj.userData?.vehicleId as string | undefined;
      if (vehicleId && showTrucks) {
        return { type: 'truck', vehicleId };
      }
      const data = (obj as unknown as { __data?: DataPoint }).__data;
      if (data) {
        return { type: 'point', data };
      }
      obj = obj.parent;
    }
  }
  return null;
}
