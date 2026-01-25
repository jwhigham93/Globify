/**
 * GlobeVisualization Component
 * Unified React Three Fiber + three-globe implementation for web and native
 *
 * Uses babel-plugin-transform-import-meta to handle ESM compatibility
 * See: https://github.com/expo/expo/issues/30323
 */

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { View, StyleSheet, Platform, Text, ActivityIndicator } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';
import { Asset } from 'expo-asset';
import type { GlobeVisualizationProps, DataPoint } from './types';

// Local texture assets - bundled with the app for reliability
// Earth textures sourced from NASA Earth Observatory Black Marble project
// https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
const TEXTURE_ASSETS = {
  // NASA Black Marble 2016 - High resolution city lights (13500x6750, 3km)
  // Source: https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/
  earthNightHires: require('../../../assets/textures/earth-night-2016-3km.jpg'),
  // NASA Black Marble 2016 - Medium resolution (3600x1800) - lighter weight option
  earthNightMedium: require('../../../assets/textures/earth-night-2016-hires.jpg'),
  // NASA Blue Marble - daytime Earth with clouds
  earthBlueMarble: require('../../../assets/textures/earth-blue-marble.jpg'),
  // Original three-globe textures (fallback)
  earthNightLights: require('../../../assets/textures/earth-night-lights.jpg'),
  earthDark: require('../../../assets/textures/earth-dark.jpg'),
  // Topology/bump map for terrain detail
  earthTopology: require('../../../assets/textures/earth-topology.png'),
  // Starry background
  nightSky: require('../../../assets/textures/night-sky.png'),
};

/**
 * Helper to resolve asset URI for both web and native platforms
 * On web, require() returns the URL string directly
 * On native, require() returns a module ID that needs expo-asset to resolve
 */
const resolveAssetUri = (asset: string | number): string => {
  // On web, Metro returns the URL string directly from require()
  if (typeof asset === 'string') {
    return asset;
  }
  // On native, we need to use expo-asset to resolve the module ID
  return Asset.fromModule(asset).uri;
};

/**
 * Loading fallback component
 */
const LoadingFallback: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#ffffff" />
    <Text style={styles.loadingText}>Loading Globe...</Text>
  </View>
);

/**
 * Custom OrbitControls component using Three.js directly
 */
const Controls: React.FC = () => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controlsRef.current = controls;

    return () => {
      controls.dispose();
    };
  }, [camera, gl]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return null;
};

/**
 * Starry background component - creates a rotating star sphere
 */
const StarryBackground: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    // Set a dark background color as fallback
    scene.background = new THREE.Color(0x000011);

    // Load the star texture from local assets
    const textureUri = resolveAssetUri(TEXTURE_ASSETS.nightSky);
    const loader = new THREE.TextureLoader();
    loader.load(
      textureUri,
      (loadedTexture) => {
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('Error loading star texture:', error);
      }
    );
  }, [scene]);

  // Rotate the star sphere slowly
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0001;
      meshRef.current.rotation.x += 0.00005;
    }
  });

  if (!texture) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[20000, 32, 32]} />
      <meshBasicMaterial side={THREE.BackSide} map={texture} />
    </mesh>
  );
};

/**
 * Globe Scene Component - handles the Three.js globe rendering
 */
interface GlobeSceneProps {
  dataPoints: DataPoint[];
  onReady?: () => void;
  onError?: (error: Error) => void;
}

// Spotify brand green color
const SPOTIFY_GREEN = '#1DB954';

const GlobeScene: React.FC<GlobeSceneProps> = ({ dataPoints, onReady, onError }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { scene } = useThree();

  // Initialize globe once on mount - separate from data updates
  useEffect(() => {
    console.log('GlobeScene mount - initializing globe');
    
    // Clean up any existing globe first
    if (globeRef.current) {
      scene.remove(globeRef.current);
      globeRef.current = null;
    }
    
    try {
      // Create globe instance matching submarine cables example style
      // Using NASA Black Marble 2016 high-resolution texture (13500x6750)
      // Source: https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
      const earthTextureUri = resolveAssetUri(TEXTURE_ASSETS.earthNightHires);
      const earthTopologyUri = resolveAssetUri(TEXTURE_ASSETS.earthTopology);
      
      const globe = new ThreeGlobe({ animateIn: false })
        .globeImageUrl(earthTextureUri)
        .bumpImageUrl(earthTopologyUri)
        .showAtmosphere(true)
        .atmosphereColor('#ffffff')
        .atmosphereAltitude(0.20)
        // Use points/bars for visualization
        .pointsData(dataPoints)
        .pointAltitude((d) => ((d as DataPoint).value || 50) / 100) // Height based on value (0-1)
        .pointRadius(0.25)
        .pointColor(() => SPOTIFY_GREEN);

      console.log('Globe created:', globe);
      globeRef.current = globe;
      scene.add(globe);
      setIsInitialized(true);

      console.log('three-globe initialized with Spotify green points (R3F unified)');
      onReady?.();
    } catch (error) {
      console.error('Error initializing globe:', error);
      onError?.(error as Error);
    }

    return () => {
      console.log('GlobeScene unmount - cleaning up');
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
      console.log('Updating globe data points:', dataPoints.length);
      globeRef.current.pointsData(dataPoints);
    }
  }, [dataPoints, isInitialized]);

  // No auto-rotation - user controls the globe manually

  return (
    <>
      {/* Starry night sky background */}
      <StarryBackground />
      {/* Match globe.gl default lighting: 0.6 * Math.PI ≈ 1.88 intensity */}
      <ambientLight color={0xcccccc} intensity={2.6 * Math.PI} />
      <directionalLight position={[-2, 2, 0]} intensity={1.6 * Math.PI} />
      <Controls />
    </>
  );
};

/**
 * Main GlobeVisualization component
 * Works on both web and native platforms using React Three Fiber
 */
export const GlobeVisualization: React.FC<GlobeVisualizationProps> = ({
  dataPoints = [],
  onPointClick,
  onReady,
  onError,
  onStateChange,
  backgroundColor = '#000000',
  testID = 'globe-visualization',
}) => {
  const [error, setError] = useState<Error | null>(null);

  const handleError = (err: Error) => {
    setError(err);
    onError?.(err);
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor }]} testID={testID}>
        <Text style={styles.errorText}>Error loading globe: {error.message}</Text>
      </View>
    );
  }

  // Use a wrapper appropriate for the platform
  const containerStyle =
    Platform.OS === 'web'
      ? { width: '100%', height: '100%', backgroundColor }
      : [styles.container, { backgroundColor }];

  return (
    <View style={containerStyle as object} testID={testID}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas 
          camera={{ position: [0, 0, 300], fov: 75, near: 1, far: 50000 }} 
          style={styles.canvas}
        >
          <GlobeScene dataPoints={dataPoints} onReady={onReady} onError={handleError} />
        </Canvas>
      </Suspense>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});

export default GlobeVisualization;
