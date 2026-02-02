/**
 * GlobeVisualization Component
 * Unified React Three Fiber + three-globe implementation for web and native
 *
 * Uses babel-plugin-transform-import-meta to handle ESM compatibility
 * See: https://github.com/expo/expo/issues/30323
 */

import React, { useState, Suspense } from 'react';
import { View, Platform, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Canvas } from '@react-three/fiber';
import type { GlobeVisualizationProps } from './types';
import { CAMERA_POSITION, CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR } from './constants';
import { styles } from './styles';
import { LoadingFallback } from './LoadingFallback';
import { GlobeScene } from './GlobeScene';

/**
 * Main GlobeVisualization component
 * Works on both web and native platforms using React Three Fiber
 */
export const GlobeVisualization: React.FC<GlobeVisualizationProps> = ({
  dataPoints = [],
  arcsData = [],
  onPointClick,
  onReady,
  onError,
  onStateChange,
  backgroundColor = '#000000',
  testID = 'globe-visualization',
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [isTextureLoading, setIsTextureLoading] = useState(true);
  const [isStarsSpinning, setIsStarsSpinning] = useState(true);

  const handleError = (err: Error) => {
    setError(err);
    onError?.(err);
  };

  const handleTextureLoading = (isLoading: boolean) => {
    setIsTextureLoading(isLoading);
  };

  const toggleStarsSpinning = () => {
    setIsStarsSpinning((prev) => !prev);
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
      {/* Show loading overlay while texture is downloading */}
      {isTextureLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading Earth texture...</Text>
        </View>
      )}
      <Suspense fallback={<LoadingFallback />}>
        <Canvas 
          camera={{ 
            position: CAMERA_POSITION, 
            fov: CAMERA_FOV, 
            near: CAMERA_NEAR, 
            far: CAMERA_FAR 
          }} 
          style={styles.canvas}
        >
          <GlobeScene 
            dataPoints={dataPoints}
            arcsData={arcsData}
            onReady={onReady} 
            onError={handleError}
            onTextureLoading={handleTextureLoading}
            isStarsSpinning={isStarsSpinning}
          />
        </Canvas>
      </Suspense>
      {/* Star spin toggle button */}
      <TouchableOpacity 
        style={styles.spinButton} 
        onPress={toggleStarsSpinning}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.spinButtonText,
          isStarsSpinning ? styles.pauseIcon : styles.playIcon
        ]}>
          {isStarsSpinning ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default GlobeVisualization;
