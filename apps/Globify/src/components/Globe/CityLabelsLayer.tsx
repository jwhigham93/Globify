/**
 * CityLabelsLayer — vectorized white city-name labels on the globe.
 *
 * Positions come from the globe's own `getCoords`, same as TruckLayer and
 * the route/arc layers — the owned group is parented to the globe (not the
 * scene) so those globe-local coordinates apply correctly. Unlike
 * TruckLayer, the label meshes themselves are declared as normal JSX
 * (`<Billboard>`/`<Text>`) rather than built imperatively: nesting JSX
 * inside `<primitive object={group}>` lets r3f manage them as usual while
 * the group's own parent (`globe`) is still attached by hand — the city
 * list is static, so there's no per-item reconciliation to hand-roll here.
 *
 * There is no off-the-shelf collision/decluttering system for text on a
 * Three.js globe (that's a MapLibre/Mapbox symbol-layer feature, and this
 * app uses neither). Each frame (throttled), every label's current world
 * position is projected to screen space and handed to
 * services/labelCollision.ts, which greedily keeps the highest-priority
 * non-overlapping labels visible and hides the rest. Depth testing is left
 * on (the default), so the opaque globe naturally occludes labels on the
 * far side — no separate horizon culling is needed.
 */
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
// Import from the RN-safe entry point, not the package root: the default
// barrel pulls in drei utilities that reach zustand's devtools middleware,
// which references `import.meta.env` — valid in a real ES module, but
// Metro's bundle output isn't one, so it throws at runtime ("Cannot use
// 'import.meta' outside a module") on both web and native. `@react-three/
// drei/native` is drei's own curated subset built for exactly this.
import { Billboard, Text } from '@react-three/drei/native';
import * as THREE from 'three';
import { MAJOR_CITY_LABELS } from '../../data/majorCityLabels';
import { selectVisibleLabels, type ProjectedLabel } from '../../services/labelCollision';
import { color as themeColor } from '../ui/theme';
import {
  CITY_LABEL_ALTITUDE,
  CITY_LABEL_FONT_SIZE,
  CITY_LABEL_LETTER_SPACING,
  CITY_LABEL_COLLISION_CHECK_INTERVAL_MS,
  CITY_LABEL_CHAR_WIDTH_PX,
  CITY_LABEL_HEIGHT_PX,
  CITY_LABEL_SCALE_MIN,
  CITY_LABEL_SCALE_MAX,
  MARKER_SCALE_NEAR_DIST,
  MARKER_SCALE_FAR_DIST,
} from './constants';
import { resolveAssetUri } from './textures';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CITY_LABEL_FONT_URL = resolveAssetUri(require('../../../assets/fonts/JetBrainsMono-Regular.ttf'));

export interface CityLabelsLayerProps {
  /** The ThreeGlobe instance; labels are parented to it. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globeRef: React.MutableRefObject<any>;
  /** Set once the globe exists, so the layer can attach. */
  isReady: boolean;
  /** Whether the layer is shown at all — the HUD toggle. */
  visible: boolean;
}

export const CityLabelsLayer: React.FC<CityLabelsLayerProps> = ({ globeRef, isReady, visible }) => {
  // Created once, up front — JSX can target it via <primitive> from the
  // very first render, no waiting on a second render to attach children.
  const [group] = useState(() => {
    const g = new THREE.Group();
    g.name = 'city-labels-layer';
    return g;
  });
  const textRefs = useRef<Map<string, THREE.Object3D>>(new Map());
  // Each city's own wrapper group — scaled per-frame for zoom, independent
  // of Billboard's own quaternion-only per-frame update.
  const scaleRefs = useRef<Map<string, THREE.Object3D>>(new Map());
  const lastCheckRef = useRef(0);
  const worldPosRef = useRef(new THREE.Vector3());
  const cornerRef = useRef(new THREE.Vector3());

  // Parent the group to the globe once it exists. Required, not cosmetic:
  // globe.getCoords() returns globe-local coordinates (see TruckLayer.tsx).
  useEffect(() => {
    const globe = globeRef.current;
    if (!isReady || !globe) return;
    globe.add(group);
    return () => {
      globe.remove(group);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeRef, isReady, group]);

  const cities = useMemo(() => {
    const globe = globeRef.current;
    if (!isReady || !globe) return [];
    return MAJOR_CITY_LABELS.map((city) => {
      const { x, y, z } = globe.getCoords(city.lat, city.lng, CITY_LABEL_ALTITUDE);
      return { ...city, position: [x, y, z] as [number, number, number] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  useFrame(({ camera, size }) => {
    group.visible = visible;
    if (!visible || cities.length === 0) return;

    // Continuous zoom-based scale — every frame, not throttled, same as
    // GlobeScene's own marker-scale loop. Keeps labels from ballooning as
    // the camera approaches (fixed world-unit text would otherwise grow
    // under perspective, the opposite of every other marker on the globe).
    const dist = camera.position.length();
    const zoomT = Math.max(0, Math.min(1,
      (dist - MARKER_SCALE_NEAR_DIST) / (MARKER_SCALE_FAR_DIST - MARKER_SCALE_NEAR_DIST),
    ));
    const scale = CITY_LABEL_SCALE_MIN + zoomT * (CITY_LABEL_SCALE_MAX - CITY_LABEL_SCALE_MIN);
    for (const city of cities) {
      scaleRefs.current.get(city.id)?.scale.setScalar(scale);
    }

    const now = performance.now();
    if (now - lastCheckRef.current < CITY_LABEL_COLLISION_CHECK_INTERVAL_MS) return;
    lastCheckRef.current = now;

    const halfW = size.width / 2;
    const halfH = size.height / 2;
    const projected: ProjectedLabel[] = [];

    for (const city of cities) {
      const obj = textRefs.current.get(city.id);
      if (!obj) continue;

      obj.getWorldPosition(worldPosRef.current);
      worldPosRef.current.project(camera);

      // Standard "behind the camera" check post-projection — keep it out of
      // the declutter pass entirely so it can't shadow a real label. The
      // globe's own depth test is what actually hides far-side labels
      // visually; this only protects the screen-space math.
      if (worldPosRef.current.z > 1) {
        obj.visible = false;
        continue;
      }

      const x = worldPosRef.current.x * halfW + halfW;
      const y = -worldPosRef.current.y * halfH + halfH;

      // Measure the real rendered size in screen space rather than
      // estimating from character count: troika exposes the synced glyph
      // geometry's bounding box in the mesh's own local space, so project
      // its left/right/top/bottom edges through the mesh's *current* world
      // matrix — that bakes in the zoom-based scale above automatically,
      // instead of drifting out of sync with it like a fixed px-per-char
      // estimate would (that mismatch let real overlaps through at some
      // zoom levels). Falls back to the rough estimate for the handful of
      // frames before the first sync, when no bounding box exists yet.
      const bbox = (obj as unknown as THREE.Mesh).geometry?.boundingBox;
      let halfWidth: number;
      let halfHeight: number;
      if (bbox && Number.isFinite(bbox.min.x)) {
        cornerRef.current.set(bbox.min.x, 0, 0).applyMatrix4(obj.matrixWorld).project(camera);
        const leftNdcX = cornerRef.current.x;
        cornerRef.current.set(bbox.max.x, 0, 0).applyMatrix4(obj.matrixWorld).project(camera);
        const rightNdcX = cornerRef.current.x;
        cornerRef.current.set(0, bbox.min.y, 0).applyMatrix4(obj.matrixWorld).project(camera);
        const bottomNdcY = cornerRef.current.y;
        cornerRef.current.set(0, bbox.max.y, 0).applyMatrix4(obj.matrixWorld).project(camera);
        const topNdcY = cornerRef.current.y;
        halfWidth = (Math.abs(rightNdcX - leftNdcX) * halfW) / 2;
        halfHeight = (Math.abs(topNdcY - bottomNdcY) * halfH) / 2;
      } else {
        halfWidth = (city.name.length * CITY_LABEL_CHAR_WIDTH_PX * scale) / 2;
        halfHeight = (CITY_LABEL_HEIGHT_PX * scale) / 2;
      }

      projected.push({
        id: city.id,
        x,
        y,
        halfWidth,
        halfHeight,
        priority: city.priority,
      });
    }

    const visibleIds = selectVisibleLabels(projected);
    for (const city of cities) {
      const obj = textRefs.current.get(city.id);
      if (obj) obj.visible = visibleIds.has(city.id);
    }
  });

  return (
    <Suspense fallback={null}>
      <primitive object={group}>
        {cities.map((city) => (
          <group
            key={city.id}
            position={city.position}
            ref={(obj: THREE.Object3D | null) => {
              if (obj) scaleRefs.current.set(city.id, obj);
              else scaleRefs.current.delete(city.id);
            }}
          >
            <Billboard>
              <Text
                ref={(obj: THREE.Object3D | null) => {
                  if (obj) textRefs.current.set(city.id, obj);
                  else textRefs.current.delete(city.id);
                }}
                font={CITY_LABEL_FONT_URL}
                fontSize={CITY_LABEL_FONT_SIZE}
                letterSpacing={CITY_LABEL_LETTER_SPACING}
                color={themeColor.text}
                anchorX="center"
                anchorY="bottom"
              >
                {city.name.toUpperCase()}
              </Text>
            </Billboard>
          </group>
        ))}
      </primitive>
    </Suspense>
  );
};

export default CityLabelsLayer;
