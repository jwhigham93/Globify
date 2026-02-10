/**
 * Globe Scene Component - handles the Three.js globe rendering
 */

import React, { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import ThreeGlobe from 'three-globe';
import * as THREE from 'three';
import type { DataPoint, ArcData } from './types';
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
} from './constants';
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
}

/**
 * Create a distinct 3D marker for metro cluster markers.
 * Uses a glowing ring (torus) + flat disc — a radar / target indicator.
 */
function createClusterMarker(): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(MARKER_CLUSTER_COLOR);

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
    return createClusterMarker();
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
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { scene, camera, gl } = useThree();

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
        .objectLat((d) => (d as DataPoint).lat)
        .objectLng((d) => (d as DataPoint).lng)
        .objectAltitude((d) => {
          const point = d as DataPoint;
          return altitudeMap.get(point.id || '') || 0;
        })
        .objectThreeObject((d) => createLocationMarker(d as DataPoint))
        // Arc configuration for supply chain visualization
        .arcsData(arcsData)
        .arcStartLat((d) => (d as ArcData).startLat)
        .arcStartLng((d) => (d as ArcData).startLng)
        .arcEndLat((d) => (d as ArcData).endLat)
        .arcEndLng((d) => (d as ArcData).endLng)
        .arcColor((d) => (d as ArcData).color)
        .arcStroke((d) => (d as ArcData).strokeWidth)
        // Arc altitude based on distance - short arcs stay low, long arcs go higher
        .arcAltitudeAutoScale(0.3) // Scale factor for auto-calculated altitude
        .arcDashLength(ARC_DASH_LENGTH)
        .arcDashGap(ARC_DASH_GAP)
        .arcDashAnimateTime(ARC_ANIMATE_TIME)
        // Note: arcLabel not available in three-globe (only globe.gl)
        // Tooltip functionality would require custom implementation
        // Callback when globe texture finishes loading
        .onGlobeReady(() => {
          onTextureLoading?.(false);
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

  // Update data points when they change (separate from initialization)
  useEffect(() => {
    if (globeRef.current && isInitialized && dataPoints.length > 0) {
      // Recompute collision altitudes for the updated data set
      const altitudeMap = buildAltitudeMap(dataPoints);
      globeRef.current
        .objectAltitude((d: object) => {
          const point = d as DataPoint;
          return altitudeMap.get(point.id || '') || 0;
        })
        .objectsData(dataPoints);
    }
  }, [dataPoints, isInitialized]);

  // Update arcs data when it changes (separate from initialization)
  useEffect(() => {
    if (globeRef.current && isInitialized) {
      globeRef.current.arcsData(arcsData);
    }
  }, [arcsData, isInitialized]);

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
  }, [onPointClick, onBackgroundClick, isInitialized, camera, gl]);

  // No auto-rotation - user controls the globe manually

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
