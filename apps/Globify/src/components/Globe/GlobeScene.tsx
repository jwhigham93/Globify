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
  POINT_RADIUS,
  ARC_DASH_LENGTH,
  ARC_DASH_GAP,
  ARC_ANIMATE_TIME,
} from './constants';
import { StarryBackground } from './StarryBackground';
import { Controls } from './Controls';

export interface GlobeSceneProps {
  dataPoints: DataPoint[];
  arcsData?: ArcData[];
  onReady?: () => void;
  onError?: (error: Error) => void;
  onTextureLoading?: (isLoading: boolean) => void;
  isStarsSpinning?: boolean;
}

export const GlobeScene: React.FC<GlobeSceneProps> = ({ 
  dataPoints, 
  arcsData = [],
  onReady, 
  onError, 
  onTextureLoading, 
  isStarsSpinning = true 
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { scene } = useThree();

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
      // Create globe instance matching submarine cables example style
      // Using NASA Black Marble 2016 high-resolution texture (13500x6750)
      // Options: earthNightHighRes (high-res), earthNightMediumRes (lighter weight)
      const earthTextureUri = resolveAssetUri(TEXTURE_ASSETS.earthNightHighRes);
      
      const globe = new ThreeGlobe({ animateIn: false })
        .globeImageUrl(earthTextureUri)
        // Note: bump map (topology) removed - not visible on dark night lights texture
        .showAtmosphere(true)
        .atmosphereColor(ATMOSPHERE_COLOR)
        .atmosphereAltitude(ATMOSPHERE_ALTITUDE)
        // Use points/bars for visualization
        .pointsData(dataPoints)
        .pointAltitude((d) => ((d as DataPoint).value || 50) / 100) // Height based on value (0-1)
        .pointRadius((d) => (d as DataPoint).size || POINT_RADIUS)
        .pointColor((d) => (d as DataPoint).color || MEDIUM_CANDY_APPLE_RED)
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
      globeRef.current.pointsData(dataPoints);
    }
  }, [dataPoints, isInitialized]);

  // Update arcs data when it changes (separate from initialization)
  useEffect(() => {
    if (globeRef.current && isInitialized) {
      globeRef.current.arcsData(arcsData);
    }
  }, [arcsData, isInitialized]);

  // No auto-rotation - user controls the globe manually

  return (
    <>
      {/* Starry night sky background */}
      <StarryBackground isSpinning={isStarsSpinning} />
      {/* Match globe.gl default lighting: 0.6 * Math.PI ≈ 1.88 intensity */}
      <ambientLight color={0xcccccc} intensity={2.6 * Math.PI} />
      <directionalLight position={[-2, 2, 0]} intensity={1.6 * Math.PI} />
      <Controls />
    </>
  );
};
