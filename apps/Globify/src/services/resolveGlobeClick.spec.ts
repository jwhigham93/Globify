/**
 * Tests for resolveGlobeClick — the raycast-hit-to-marker resolution used by
 * GlobeScene's click handler.
 */
import * as THREE from 'three';
import { resolveClickTarget } from './resolveGlobeClick';
import type { DataPoint } from '../components/Globe/types';

/** A minimal DataPoint, matching how three-globe attaches `__data`. */
function dataPoint(id: string): DataPoint {
  return { id, name: id, lat: 0, lng: 0, type: 'supplier' } as DataPoint;
}

describe('resolveClickTarget', () => {
  it('returns null when there are no hits', () => {
    const globe = new THREE.Group();
    expect(resolveClickTarget([], globe, true)).toBeNull();
  });

  it('resolves a truck hit to its vehicleId when trucks are visible', () => {
    const globe = new THREE.Group();
    const truckLayer = new THREE.Group();
    const wrapper = new THREE.Group();
    wrapper.userData.vehicleId = 'v-1';
    const car = new THREE.Mesh();
    wrapper.add(car);
    truckLayer.add(wrapper);
    globe.add(truckLayer);

    const result = resolveClickTarget([{ object: car }], globe, true);
    expect(result).toEqual({ type: 'truck', vehicleId: 'v-1' });
  });

  it('ignores a truck hit when trucks are hidden, even though the mesh was still hit', () => {
    // Raycaster.intersectObjects does not consult Object3D.visible, so a hit
    // on a hidden truck's mesh is exactly what a real hidden-but-raycastable
    // truck would produce.
    const globe = new THREE.Group();
    const wrapper = new THREE.Group();
    wrapper.userData.vehicleId = 'v-1';
    const car = new THREE.Mesh();
    wrapper.add(car);
    globe.add(wrapper);

    const result = resolveClickTarget([{ object: car }], globe, false);
    expect(result).toBeNull();
  });

  it('falls through to a location marker hit behind a hidden truck', () => {
    const globe = new THREE.Group();

    const truckWrapper = new THREE.Group();
    truckWrapper.userData.vehicleId = 'v-1';
    const car = new THREE.Mesh();
    truckWrapper.add(car);
    globe.add(truckWrapper);

    const marker = new THREE.Mesh();
    (marker as unknown as { __data: DataPoint }).__data = dataPoint('dc-1');
    globe.add(marker);

    // Raycaster hits are nearest-first; the truck mesh is nearer.
    const result = resolveClickTarget(
      [{ object: car }, { object: marker }],
      globe,
      false,
    );
    expect(result).toEqual({ type: 'point', data: dataPoint('dc-1') });
  });

  it('resolves a location point hit to its data', () => {
    const globe = new THREE.Group();
    const marker = new THREE.Mesh();
    (marker as unknown as { __data: DataPoint }).__data = dataPoint('dc-1');
    globe.add(marker);

    const result = resolveClickTarget([{ object: marker }], globe, true);
    expect(result).toEqual({ type: 'point', data: dataPoint('dc-1') });
  });

  it('returns null when the hit chain reaches the globe root without a match', () => {
    const globe = new THREE.Group();
    const unrelated = new THREE.Mesh();
    globe.add(unrelated);

    const result = resolveClickTarget([{ object: unrelated }], globe, true);
    expect(result).toBeNull();
  });
});
