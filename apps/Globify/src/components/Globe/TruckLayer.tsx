/**
 * TruckLayer — owns every vehicle marker as a group parented to the globe.
 *
 * Trucks used to ride three-globe's `objectsData` layer alongside the static
 * locations. Owning them directly fixes three things at once:
 *
 *  1. three-globe's removal path disposes an object's geometry and material.
 *     Every truck shared one module-level geometry and a per-status material
 *     cache, so removing a single truck disposed the GPU resources for all of
 *     them. Objects we own are never touched by that path.
 *  2. Vehicle updates no longer force the ~213 location markers to rebuild —
 *     they shared one `objectsData` array.
 *  3. `objectRotation` is a discrete accessor, so heading could only snap.
 *     Here every vehicle has a per-frame state, letting position and heading
 *     be interpolated: cars glide between pings and sweep into turns.
 *
 * Positions come from the globe's own `getCoords`, and the wrapper orientation
 * mirrors what the objects layer does (`Euler(-lat, lng, 0, 'YXZ')`), which
 * puts local +Z radially outward and +Y toward north.
 */
import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createCarMesh,
  setCarColor,
  setCarHaloStrength,
  disposeCarMesh,
  disposeCarResources,
  smoothAngle,
  smoothScalar,
  type CarMesh,
} from '../../services/carModel';
import { getTruckColor, computePulseScale, type GpsStatus } from '../../services/truckVisuals';
import type { VehiclePosition } from '../../services/useVehiclePositions';
import {
  TRUCK_MARKER_ALTITUDE,
  TRUCK_HEADING_SMOOTH_K,
  TRUCK_POSITION_SMOOTH_K,
  TRUCK_LOST_SIZE_BOOST,
  TRUCK_SCALE_MULTIPLIER,
  MARKER_SCALE_FAR_DIST,
  MARKER_SCALE_NEAR_DIST,
  MARKER_SCALE_MAX,
  MARKER_SCALE_MIN,
} from './constants';

const DEG2RAD = Math.PI / 180;

interface TruckState {
  wrapper: THREE.Group;
  car: CarMesh;
  status: GpsStatus;
  /** Rendered values, eased toward the target each frame. */
  curLat: number;
  curLng: number;
  curHeading: number;
  /** Latest values received from the stream. */
  tgtLat: number;
  tgtLng: number;
  tgtHeading: number;
}

export interface TruckLayerProps {
  /** The ThreeGlobe instance; trucks are parented to it. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globeRef: React.MutableRefObject<any>;
  vehiclePositions?: Map<string, VehiclePosition>;
  showTrucks: boolean;
  /** Set once the globe exists, so the layer can attach. */
  isReady: boolean;
}

export const TruckLayer: React.FC<TruckLayerProps> = ({
  globeRef,
  vehiclePositions,
  showTrucks,
  isReady,
}) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const statesRef = useRef<Map<string, TruckState>>(new Map());
  // Reused every frame so the update loop allocates nothing.
  const eulerRef = useRef(new THREE.Euler());

  // Attach a group to the globe. Parenting to the globe (not the scene) is
  // required: getCoords returns globe-local coordinates.
  useEffect(() => {
    const globe = globeRef.current;
    if (!isReady || !globe) return;

    const group = new THREE.Group();
    group.name = 'truck-layer';
    globe.add(group);
    groupRef.current = group;

    const states = statesRef.current;
    return () => {
      for (const state of states.values()) disposeCarMesh(state.car);
      states.clear();
      globe.remove(group);
      groupRef.current = null;
      // Shared geometry outlives individual cars; release it with the layer.
      disposeCarResources();
    };
  }, [globeRef, isReady]);

  // Reconcile the vehicle set. This only writes targets — no React state, and
  // no work proportional to anything but the number of vehicles that changed.
  //
  // `isReady` is a dependency even though it is not read: positions usually
  // arrive before the globe finishes initialising, and without it this effect
  // bails on a null group and never re-runs (the position map does not change
  // again), leaving the layer permanently empty.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const states = statesRef.current;
    const seen = new Set<string>();

    for (const [id, position] of vehiclePositions ?? []) {
      seen.add(id);
      const status = position.gpsStatus as GpsStatus;
      const heading = (position.heading ?? 0) * DEG2RAD;
      const existing = states.get(id);

      if (existing) {
        existing.tgtLat = position.lat;
        existing.tgtLng = position.lng;
        existing.tgtHeading = heading;
        if (existing.status !== status) {
          existing.status = status;
          setCarColor(existing.car, getTruckColor(status));
        }
        continue;
      }

      const car = createCarMesh(getTruckColor(status));
      const wrapper = new THREE.Group();
      wrapper.userData.vehicleId = id;
      wrapper.add(car);
      group.add(wrapper);

      // Seed current = target so a new vehicle appears in place rather than
      // flying in from wherever the defaults happened to be.
      states.set(id, {
        wrapper,
        car,
        status,
        curLat: position.lat,
        curLng: position.lng,
        curHeading: heading,
        tgtLat: position.lat,
        tgtLng: position.lng,
        tgtHeading: heading,
      });
    }

    for (const [id, state] of states) {
      if (seen.has(id)) continue;
      group.remove(state.wrapper);
      disposeCarMesh(state.car);
      states.delete(id);
    }
  }, [vehiclePositions, isReady]);

  useFrame(({ camera, clock }, delta) => {
    const group = groupRef.current;
    const globe = globeRef.current;
    if (!group || !globe) return;

    group.visible = showTrucks;
    if (!showTrucks) return;

    const dist = camera.position.length();
    const zoomT = Math.max(0, Math.min(1,
      (dist - MARKER_SCALE_NEAR_DIST) / (MARKER_SCALE_FAR_DIST - MARKER_SCALE_NEAR_DIST),
    ));
    const baseScale =
      (MARKER_SCALE_MIN + zoomT * (MARKER_SCALE_MAX - MARKER_SCALE_MIN)) *
      TRUCK_SCALE_MULTIPLIER;
    const elapsed = clock.elapsedTime;

    // `delta` can spike after a stall or a hidden tab; clamping keeps the
    // easing from jumping the whole way in a single frame.
    const dt = Math.min(delta, 0.1);

    for (const state of statesRef.current.values()) {
      state.curLat = smoothScalar(state.curLat, state.tgtLat, TRUCK_POSITION_SMOOTH_K, dt);
      state.curLng = smoothScalar(state.curLng, state.tgtLng, TRUCK_POSITION_SMOOTH_K, dt);
      state.curHeading = smoothAngle(
        state.curHeading,
        state.tgtHeading,
        TRUCK_HEADING_SMOOTH_K,
        dt,
      );

      const { x, y, z } = globe.getCoords(
        state.curLat,
        state.curLng,
        TRUCK_MARKER_ALTITUDE,
      );
      state.wrapper.position.set(x, y, z);
      state.wrapper.setRotationFromEuler(
        eulerRef.current.set(-state.curLat * DEG2RAD, state.curLng * DEG2RAD, 0, 'YXZ'),
      );

      // Heading turns the car within the surface plane; the pulse scales it.
      // Independent transform channels, so neither fights the other.
      state.car.rotation.z = -state.curHeading;
      const boost = state.status === 'lost' ? TRUCK_LOST_SIZE_BOOST : 1;
      state.car.scale.setScalar(
        computePulseScale(state.status, elapsed) * baseScale * boost,
      );
      setCarHaloStrength(state.car, zoomT);
    }
  });

  return null;
};

export default TruckLayer;
