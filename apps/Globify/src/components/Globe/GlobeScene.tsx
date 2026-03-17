/**
 * Globe Scene Component - handles the Three.js globe rendering
 */

import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import ThreeGlobe from 'three-globe';
import * as THREE from 'three';
import type { DataPoint, ArcData, RoutePathSegment } from './types';
import { TEXTURE_ASSETS, resolveAssetUri } from './textures';
import {
  MEDIUM_CANDY_APPLE_RED,
  ATMOSPHERE_COLOR,
  ATMOSPHERE_ALTITUDE,
  ARC_DASH_LENGTH,
  ARC_DASH_GAP,
  ARC_ANIMATE_TIME,
  MARKER_SUPPLIER_RADIUS,
  MARKER_SUPPLIER_HEIGHT,
  MARKER_DC_SIZE,
  MARKER_RESTAURANT_RADIUS,
  MARKER_EMISSIVE_INTENSITY,
  MARKER_CLUSTER_RING_RADIUS,
  MARKER_CLUSTER_RING_TUBE,
  MARKER_CLUSTER_DISC_HEIGHT,
  MARKER_CLUSTER_COLOR,
  MARKER_CLUSTER_GLOW_INTENSITY,
  TILE_FADE_DURATION,
  TILE_CHECK_INTERVAL,
  TILE_ZOOM_THRESHOLD_Z1,
  TRUCK_MARKER_ALTITUDE,
  MARKER_SCALE_FAR_DIST,
  MARKER_SCALE_NEAR_DIST,
  MARKER_SCALE_MAX,
  MARKER_SCALE_MIN,
  TRUCK_SCALE_MULTIPLIER,
  TRUCK_LOST_SIZE_BOOST,
  ARC_STROKE_SCALE_MIN,
  ROUTE_PATH_ALTITUDE,
  ROUTE_PATH_DASH_LENGTH,
  ROUTE_PATH_DASH_GAP,
  ROUTE_PATH_ANIMATE_TIME,
} from './constants';
import {
  createTileCompositeMaterial,
  updateTileOverlay,
  animateTileFadeIn,
  findAvailableSlot,
  type TileShaderMaterial,
} from './tileShader';
import { TileManager } from '../../services/tileManager';
import { tileToLatLngBounds } from '../../services/tileCoordinates';
import {
  createTruckMarker,
  updateTruckMarkerStatus,
  computePulseScale,
  getTruckColor,
  disposeTruckResources,
  type GpsStatus,
} from '../../services/truckVisuals';
import type { VehiclePosition } from '../../services/useVehiclePositions';
import { buildAltitudeMap } from '../../services/collisionDetection';
import { StarryBackground } from './StarryBackground';
import { Controls } from './Controls';

export interface GlobeSceneProps {
  dataPoints: DataPoint[];
  arcsData?: ArcData[];
  onReady?: () => void;
  onError?: (error: Error) => void;
  onTextureLoading?: (isLoading: boolean) => void;
  isStarsSpinning?: boolean;
  onPointClick?: (point: DataPoint) => void;
  /** Called when the user clicks on empty space (no marker hit) */
  onBackgroundClick?: () => void;
  onZoomChange?: (distance: number) => void;
  /** When set, smoothly animate the camera to this distance */
  zoomTarget?: number | null;
  /** Called when the camera reaches the zoom target */
  onZoomTargetReached?: () => void;
  /** CDN base URL for progressive tile loading (empty = disabled) */
  tileCdnUrl?: string;
  /** Callback when tile loading state changes */
  onTilesLoading?: (isLoading: boolean) => void;
  /** Vehicle positions for truck layer (from WebSocket/REST) */
  vehiclePositions?: Map<string, VehiclePosition>;
  /** Whether the truck layer is visible */
  showTrucks?: boolean;
  /** Called when user clicks a truck marker */
  onTruckClick?: (vehicleId: string) => void;
  /** Route path segments for selected truck (origin→truck, truck→destination) */
  routePathData?: RoutePathSegment[];
}

/**
 * Create a distinct 3D marker for metro cluster markers.
 * Uses a glowing ring (torus) + flat disc — a radar / target indicator.
 */
function createClusterMarker(pointColor?: string): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(pointColor || MARKER_CLUSTER_COLOR);

  // Outer ring (torus) — lies flat in XY, +Z is radially outward from globe
  const ringMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: MARKER_CLUSTER_GLOW_INTENSITY,
    roughness: 0.3,
    metalness: 0.6,
    transparent: true,
    opacity: 0.9,
  });
  const ringGeo = new THREE.TorusGeometry(
    MARKER_CLUSTER_RING_RADIUS, MARKER_CLUSTER_RING_TUBE, 8, 24,
  );
  ringGeo.translate(0, 0, 0.1); // lift slightly above surface
  group.add(new THREE.Mesh(ringGeo, ringMat));

  // Inner disc (flat cylinder) — rotate so flat faces point along +Z
  const discMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: MARKER_CLUSTER_GLOW_INTENSITY * 0.6,
    roughness: 0.5,
    metalness: 0.3,
    transparent: true,
    opacity: 0.6,
  });
  const discRadius = MARKER_CLUSTER_RING_RADIUS * 0.6;
  const discGeo = new THREE.CylinderGeometry(
    discRadius, discRadius, MARKER_CLUSTER_DISC_HEIGHT, 16,
  );
  discGeo.rotateX(Math.PI / 2);
  discGeo.translate(0, 0, MARKER_CLUSTER_DISC_HEIGHT / 2 + 0.05);
  group.add(new THREE.Mesh(discGeo, discMat));

  return group;
}

/**
 * Create a custom 3D marker based on location type.
 * Clusters → ring+disc, Suppliers → cone, DCs → box, Restaurants → sphere
 */
function createLocationMarker(point: DataPoint): THREE.Object3D {
  // Cluster markers get a distinct ring shape
  if (point.id?.startsWith('cluster-')) {
    return createClusterMarker(point.color);
  }

  const color = new THREE.Color(point.color || MEDIUM_CANDY_APPLE_RED);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: MARKER_EMISSIVE_INTENSITY,
    roughness: 0.8,
    metalness: 0.4,
  });

  let geometry: THREE.BufferGeometry;

  // three-globe objectsData orients objects with local +Z pointing radially
  // outward from the globe surface. ConeGeometry points along +Y by default,
  // so we rotate -PI/2 on X to aim the tip along +Z (outward).
  switch (point.locationType) {
    case 'supplier': {
      geometry = new THREE.ConeGeometry(MARKER_SUPPLIER_RADIUS, MARKER_SUPPLIER_HEIGHT, 6);
      // Shift so base is at origin, then rotate so tip points along +Z
      geometry.translate(0, MARKER_SUPPLIER_HEIGHT / 2, 0);
      geometry.rotateX(Math.PI / 2);
      break;
    }
    case 'dc': {
      const boxH = MARKER_DC_SIZE * 0.6;
      geometry = new THREE.BoxGeometry(MARKER_DC_SIZE, MARKER_DC_SIZE, boxH);
      // Shift so bottom face sits at origin along +Z
      geometry.translate(0, 0, boxH / 2);
      break;
    }
    default: {
      geometry = new THREE.SphereGeometry(MARKER_RESTAURANT_RADIUS, 8, 6);
      geometry.translate(0, 0, MARKER_RESTAURANT_RADIUS);
      break;
    }
  }

  return new THREE.Mesh(geometry, material);
}

export const GlobeScene: React.FC<GlobeSceneProps> = ({
  dataPoints,
  arcsData = [],
  onReady,
  onError,
  onTextureLoading,
  isStarsSpinning = true,
  onPointClick,
  onBackgroundClick,
  onZoomChange,
  zoomTarget,
  onZoomTargetReached,
  tileCdnUrl = '',
  onTilesLoading,
  vehiclePositions,
  showTrucks = false,
  onTruckClick,
  routePathData = [],
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const { scene, camera, gl } = useThree();

  // Track ALL object meshes for per-frame zoom scaling
  const objectMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  // Subset: truck meshes (for pulse animation + status updates)
  const truckMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Arc stroke scaling: ref for current scale + ref for current arcsData prop
  const arcStrokeScaleRef = useRef(1);
  const arcsDataRef = useRef(arcsData);
  arcsDataRef.current = arcsData;
  const lastArcRefreshDist = useRef(0);

  // Tile system refs
  const tileManagerRef = useRef<TileManager | null>(null);
  const tileMaterialRef = useRef<TileShaderMaterial | null>(null);
  const lastTileCheckRef = useRef<number>(0);

  // Initialize globe once on mount - separate from data updates
  useEffect(() => {
    // Signal that texture loading has started
    onTextureLoading?.(true);
    
    // Clean up any existing globe first
    if (globeRef.current) {
      scene.remove(globeRef.current);
      globeRef.current = null;
    }
    
    try {
      // Pre-compute collision-aware altitude offsets
      const altitudeMap = buildAltitudeMap(dataPoints);
      
      // Create globe instance matching submarine cables example style
      // Using NASA Black Marble 2016 high-resolution texture (13500x6750)
      // Options: earthNightHighRes (high-res), earthNightMediumRes (lighter weight)
      const earthTextureUri = resolveAssetUri(TEXTURE_ASSETS.earthNightHighResDimmed);
      
      const globe = new ThreeGlobe({ animateIn: false })
        .globeImageUrl(earthTextureUri)
        // Note: bump map (topology) removed - not visible on dark night lights texture
        .showAtmosphere(true)
        .atmosphereColor(ATMOSPHERE_COLOR)
        .atmosphereAltitude(ATMOSPHERE_ALTITUDE)
        // Custom 3D markers per location type (cone/box/sphere)
        .objectsData(dataPoints)
        .objectLat((d: object) => (d as DataPoint).lat)
        .objectLng((d: object) => (d as DataPoint).lng)
        .objectAltitude((d: object) => {
          const item = d as { __kind?: string; id?: string };
          if (item.__kind === 'truck') return TRUCK_MARKER_ALTITUDE;
          const point = d as DataPoint;
          return altitudeMap.get(point.id || '') || 0;
        })
        .objectThreeObject((d: object) => {
          const item = d as { __kind?: string; gpsStatus?: GpsStatus; id?: string };
          if (item.__kind === 'truck') {
            const mesh = createTruckMarker(item.gpsStatus as GpsStatus);
            mesh.userData.vehicleId = item.id;
            truckMeshesRef.current.set(item.id!, mesh);
            objectMeshesRef.current.set(`truck:${item.id}`, mesh);
            return mesh;
          }
          const marker = createLocationMarker(d as DataPoint);
          const point = d as DataPoint;
          if (point.id) objectMeshesRef.current.set(`loc:${point.id}`, marker);
          return marker;
        })
        .objectRotation((d: object) => {
          const item = d as { __kind?: string; heading?: number };
          if (item.__kind === 'truck' && item.heading != null) {
            // three-globe applies deg2Rad internally, so pass degrees.
            // heading 0 = North (+Y in local space). Rotate CW around Z (outward).
            return { x: 0, y: 0, z: -item.heading };
          }
          return { x: 0, y: 0, z: 0 };
        })
        // Arc configuration for supply chain visualization
        .arcsData(arcsData)
        .arcStartLat((d: object) => (d as ArcData).startLat)
        .arcStartLng((d: object) => (d as ArcData).startLng)
        .arcEndLat((d: object) => (d as ArcData).endLat)
        .arcEndLng((d: object) => (d as ArcData).endLng)
        .arcColor((d: object) => (d as ArcData).color)
        .arcStroke((d: object) => (d as ArcData).strokeWidth * arcStrokeScaleRef.current)
        // Arc altitude based on distance - short arcs stay low, long arcs go higher
        .arcAltitudeAutoScale(0.3) // Scale factor for auto-calculated altitude
        .arcDashLength(ARC_DASH_LENGTH)
        .arcDashGap(ARC_DASH_GAP)
        .arcDashAnimateTime(ARC_ANIMATE_TIME)
        .arcsTransitionDuration(0) // Instant update for zoom-based stroke scaling
        // Route polyline for selected truck
        .pathsData([])
        .pathPoints('pnts')
        .pathPointLat('lat')
        .pathPointLng('lng')
        .pathPointAlt(ROUTE_PATH_ALTITUDE)
        .pathColor((d: object) => (d as RoutePathSegment).color)
        .pathStroke((d: object) => (d as RoutePathSegment).strokeWidth)
        .pathDashLength(ROUTE_PATH_DASH_LENGTH)
        .pathDashGap(ROUTE_PATH_DASH_GAP)
        .pathDashAnimateTime(ROUTE_PATH_ANIMATE_TIME)
        .pathTransitionDuration(0)
        // Note: arcLabel not available in three-globe (only globe.gl)
        // Tooltip functionality would require custom implementation
        // Callback when globe texture finishes loading
        .onGlobeReady(() => {
          onTextureLoading?.(false);
          setIsGlobeReady(true);
        });

      globeRef.current = globe;
      scene.add(globe);
      setIsInitialized(true);
      onReady?.();
    } catch (error) {
      console.error('Error initializing globe:', error);
      onError?.(error as Error);
    }

    return () => {
      if (globeRef.current) {
        scene.remove(globeRef.current);
        globeRef.current = null;
      }
    };
    // Only depend on scene - data updates handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // Update data points (and truck markers) when they change
  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;
    if (dataPoints.length === 0 && (!showTrucks || !vehiclePositions || vehiclePositions.size === 0)) return;

    // Recompute collision altitudes for location markers
    const altitudeMap = buildAltitudeMap(dataPoints);

    // Tag location objects so the callbacks can distinguish them from trucks
    const locationObjects = dataPoints.map(dp => ({ ...dp, __kind: 'location' as const }));

    // Build truck objects when layer is visible
    const truckObjects = showTrucks && vehiclePositions && vehiclePositions.size > 0
      ? Array.from(vehiclePositions.values()).map(vp => ({
          __kind: 'truck' as const,
          id: vp.vehicleId,
          lat: vp.lat,
          lng: vp.lng,
          heading: vp.heading,
          gpsStatus: vp.gpsStatus as GpsStatus,
        }))
      : [];

    // When hiding trucks, immediately make meshes invisible so three-globe's
    // exit transition doesn't show a "blow up" scale animation.
    if (!showTrucks && truckMeshesRef.current.size > 0) {
      truckMeshesRef.current.forEach(mesh => { mesh.visible = false; });
      truckMeshesRef.current.clear();
    }

    globeRef.current
      .objectAltitude((d: object) => {
        const item = d as { __kind?: string };
        if (item.__kind === 'truck') return TRUCK_MARKER_ALTITUDE;
        const point = d as DataPoint;
        return altitudeMap.get(point.id || '') || 0;
      })
      .objectsData([...locationObjects, ...truckObjects]);
  }, [dataPoints, isInitialized, showTrucks, vehiclePositions]);

  // Update arcs data when it changes (separate from initialization)
  useEffect(() => {
    if (globeRef.current && isInitialized) {
      globeRef.current.arcsData(arcsData);
    }
  }, [arcsData, isInitialized]);

  // Update route paths when selected truck path changes
  useEffect(() => {
    if (globeRef.current && isInitialized) {
      globeRef.current.pathsData(routePathData);
    }
  }, [routePathData, isInitialized]);

  // Raycaster-based click handler for object markers.
  // three-globe (unlike globe.gl) does not provide onObjectClick,
  // so we manually raycast against the globe's child meshes.
  // NOTE: DOM types unavailable (RN tsconfig excludes "dom" lib), hence `any` casts.
  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;
    if (!onPointClick && !onBackgroundClick) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas: any = gl.domElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMouseDown = (e: any) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMouseUp = (e: any) => {
      // Ignore drags (orbit control) — only fire on genuine clicks (< 5 px)
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) return;

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Raycast against all children of the globe (includes object markers)
      const intersects = raycaster.intersectObjects(
        globeRef.current.children,
        true
      );

      for (const hit of intersects) {
        // Walk up the parent chain to find the node with __data
        // (three-globe attaches the data item to wrapper groups)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let obj: any = hit.object;
        while (obj && obj !== globeRef.current) {
          if (obj.__data) {
            const data = obj.__data as { __kind?: string; id?: string };
            if (data.__kind === 'truck' && data.id) {
              onTruckClick?.(data.id);
              return;
            }
            onPointClick?.(obj.__data as DataPoint);
            return;
          }
          obj = obj.parent;
        }
      }

      // No marker was hit — notify parent to deselect
      onBackgroundClick?.();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onPointClick, onBackgroundClick, onTruckClick, isInitialized, camera, gl]);

  // No auto-rotation - user controls the globe manually

  // ── Tile system initialization ──────────────────────────────────
  useEffect(() => {
    if (!tileCdnUrl || !isGlobeReady || !globeRef.current) return;

    let cancelled = false;

    // Probe first to avoid console noise when tile server isn't running
    TileManager.probe(tileCdnUrl).then((reachable) => {
      if (cancelled || !reachable || !globeRef.current) return;

      const manager = new TileManager(tileCdnUrl);
      tileManagerRef.current = manager;

      // Get the globe mesh's material to create tile composite shader
      const globeMesh = globeRef.current.globeMaterial?.();
      if (globeMesh?.map) {
        const tileMat = createTileCompositeMaterial(globeMesh.map);
        tileMaterialRef.current = tileMat;
        // Replace the globe's material with our custom shader
        globeRef.current.globeMaterial(tileMat);
      }

      // Set up tile loaded callback
      manager.onTileLoaded = (key, texture, tile) => {
        const mat = tileMaterialRef.current;
        if (!mat) return;
        const slot = findAvailableSlot(mat);
        const zl = manager['manifest']?.zoomLevels.find(
          (z: { z: number }) => z.z === tile.z,
        );
        if (!zl) return;
        const bounds = tileToLatLngBounds(tile.z, tile.x, tile.y, zl.cols, zl.rows);
        updateTileOverlay(mat, slot, texture, bounds, 0);
        mat.__tileSlots[slot] = {
          key,
          alpha: 0,
          startTime: performance.now(),
        };

        // Notify loading state
        onTilesLoading?.(manager.activeLoadCount > 0);
      };

      manager.init();
    });

    return () => {
      cancelled = true;
      tileManagerRef.current?.dispose();
      tileManagerRef.current = null;
      tileMaterialRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileCdnUrl, isGlobeReady]);

  // ── Tile render loop (throttled) ────────────────────────────────
  useFrame((_state, _delta) => {
    const manager = tileManagerRef.current;
    const mat = tileMaterialRef.current;

    if (mat) {
      animateTileFadeIn(mat, TILE_FADE_DURATION);
    }

    if (!manager) return;

    const now = performance.now();
    if (now - lastTileCheckRef.current < TILE_CHECK_INTERVAL) return;
    lastTileCheckRef.current = now;

    const dist = camera.position.length();
    if (dist > TILE_ZOOM_THRESHOLD_Z1) return;

    // Compute center lat/lng from camera position
    const dir = camera.position.clone().normalize();
    const lat = Math.asin(dir.y) * (180 / Math.PI);
    const lng = Math.atan2(dir.x, dir.z) * (180 / Math.PI);

    manager.requestTiles(lat, lng, dist);
  });

  // ── Zoom-based scaling for ALL markers + truck pulse (per-frame) ─────
  useFrame(() => {
    // Compute distance-based scale: MARKER_SCALE_MAX at far, MARKER_SCALE_MIN at near
    const dist = camera.position.length();
    const zoomT = Math.max(0, Math.min(1,
      (dist - MARKER_SCALE_NEAR_DIST) / (MARKER_SCALE_FAR_DIST - MARKER_SCALE_NEAR_DIST),
    ));
    const zoomScale = MARKER_SCALE_MIN + zoomT * (MARKER_SCALE_MAX - MARKER_SCALE_MIN);
    const truckScale = zoomScale * TRUCK_SCALE_MULTIPLIER;

    // Scale all object markers (locations use zoomScale, trucks use truckScale)
    objectMeshesRef.current.forEach((obj, key) => {
      if (!obj.parent) {
        objectMeshesRef.current.delete(key);
        return;
      }
      const isTruck = truckMeshesRef.current.has(key);
      obj.scale.setScalar(isTruck ? truckScale : zoomScale);
    });

    // Truck-specific: pulse animation + status color updates
    if (showTrucks) {
      const t = performance.now() / 1000;
      truckMeshesRef.current.forEach((mesh, id) => {
        if (!mesh.parent) {
          truckMeshesRef.current.delete(id);
          return;
        }
        const vp = vehiclePositions?.get(id);
        if (vp) {
          updateTruckMarkerStatus(mesh, vp.gpsStatus as GpsStatus);
          const pulse = computePulseScale(vp.gpsStatus as GpsStatus, t);
          const boost = vp.gpsStatus === 'lost' ? TRUCK_LOST_SIZE_BOOST : 1;
          mesh.scale.setScalar(pulse * truckScale * boost);
        }
      });
    }

    // Arc stroke scaling — refresh when zoom changes by >3 units
    const newArcScale = ARC_STROKE_SCALE_MIN + zoomT * (1 - ARC_STROKE_SCALE_MIN);
    arcStrokeScaleRef.current = newArcScale;
    if (globeRef.current && Math.abs(dist - lastArcRefreshDist.current) > 3) {
      lastArcRefreshDist.current = dist;
      globeRef.current.arcsData(arcsDataRef.current);
    }
  });

  return (
    <>
      {/* Starry night sky background */}
      <StarryBackground isSpinning={isStarsSpinning} />
      {/* Match globe.gl default lighting: 0.6 * Math.PI ≈ 1.88 intensity */}
      <ambientLight color={0xcccccc} intensity={2.6 * Math.PI} />
      <directionalLight position={[-2, 2, 0]} intensity={1.6 * Math.PI} />
      <Controls
        onZoomChange={onZoomChange}
        zoomTarget={zoomTarget}
        onZoomTargetReached={onZoomTargetReached}
      />
    </>
  );
};
