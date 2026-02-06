/**
 * GlobeVisualization Component
 * Unified React Three Fiber + three-globe implementation for web and native
 *
 * Uses babel-plugin-transform-import-meta to handle ESM compatibility
 * See: https://github.com/expo/expo/issues/30323
 */

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { View, Platform, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Canvas } from '@react-three/fiber';
import type { GlobeVisualizationProps, ViewMode, DataPoint } from './types';
import { CAMERA_POSITION, CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR } from './constants';
import { styles } from './styles';
import { LoadingFallback } from './LoadingFallback';
import { GlobeScene } from './GlobeScene';
import { ViewModeToggle } from './ViewModeToggle';
import { RiskPanel } from './RiskPanel';
import { LegendPanel } from './LegendPanel';
import { DisruptionPanel } from './DisruptionPanel';
import { computeNetworkRiskMetrics } from '../../services/concentrationRisk';
import { applyRiskColorsToPoints, applyRiskColorsToArcs } from '../../services/riskVisuals';
import { computeDisruptionMetrics } from '../../services/disruptionAnalysis';
import { applyDisruptionToPoints, applyDisruptionToArcs } from '../../services/disruptionVisuals';
import { allLocations, allRoutes } from '../../services/supplyChainData';

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
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [disabledNodeIds, setDisabledNodeIds] = useState<Set<string>>(new Set());

  // Compute network risk metrics once (only depends on static route/location data)
  const networkRiskMetrics = useMemo(
    () => computeNetworkRiskMetrics(allRoutes, allLocations),
    []
  );

  // Compute disruption metrics when nodes are disabled
  const disruptionMetrics = useMemo(
    () => computeDisruptionMetrics(disabledNodeIds, allRoutes, allLocations),
    [disabledNodeIds]
  );

  // Set of orphaned restaurant IDs for visual highlighting
  const orphanedIds = useMemo(
    () => new Set(disruptionMetrics.orphanedRestaurants.map((r) => r.id)),
    [disruptionMetrics]
  );

  // Set of partially served restaurant IDs for orange visual highlighting
  const partiallyServedIds = useMemo(
    () => new Set(disruptionMetrics.partiallyServedRestaurants.map((r) => r.id)),
    [disruptionMetrics]
  );

  // Derive risk-colored arcs when in concentration-risk view
  const effectiveArcsData = useMemo(() => {
    if (viewMode === 'concentration-risk') {
      return applyRiskColorsToArcs(arcsData, networkRiskMetrics);
    }
    if (viewMode === 'disruption') {
      return applyDisruptionToArcs(arcsData, disabledNodeIds, partiallyServedIds);
    }
    return arcsData;
  }, [viewMode, arcsData, networkRiskMetrics, disabledNodeIds, partiallyServedIds]);

  // Derive disruption-colored data points when in disruption view
  const effectiveDataPoints = useMemo(() => {
    if (viewMode === 'concentration-risk') {
      return applyRiskColorsToPoints(dataPoints, networkRiskMetrics, allLocations);
    }
    if (viewMode === 'disruption') {
      return applyDisruptionToPoints(dataPoints, disabledNodeIds, orphanedIds, partiallyServedIds);
    }
    return dataPoints;
  }, [viewMode, dataPoints, networkRiskMetrics, disabledNodeIds, orphanedIds, partiallyServedIds]);

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

  // Cycle through standard → concentration-risk → disruption → standard
  const toggleViewMode = () => {
    setViewMode((prev) => {
      switch (prev) {
        case 'standard':
          return 'concentration-risk';
        case 'concentration-risk':
          return 'disruption';
        case 'disruption':
          // When leaving disruption mode, clear disabled nodes
          setDisabledNodeIds(new Set());
          return 'standard';
        default:
          return 'standard';
      }
    });
  };

  // Toggle a node's disabled state (only suppliers and DCs)
  const handlePointClick = useCallback(
    (point: DataPoint) => {
      if (viewMode !== 'disruption') return;
      const pointId = point.id;
      if (!pointId) return;
      // Only suppliers and DCs are toggleable
      if (point.locationType === 'restaurant') return;

      setDisabledNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(pointId)) {
          next.delete(pointId);
        } else {
          next.add(pointId);
        }
        return next;
      });
    },
    [viewMode]
  );

  // Reset all disruption state
  const handleResetAll = useCallback(() => {
    setDisabledNodeIds(new Set());
  }, []);

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
            dataPoints={effectiveDataPoints}
            arcsData={effectiveArcsData}
            onReady={onReady} 
            onError={handleError}
            onTextureLoading={handleTextureLoading}
            isStarsSpinning={isStarsSpinning}
            onPointClick={viewMode === 'disruption' ? handlePointClick : undefined}
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
      {/* Location type and risk color legend */}
      <LegendPanel viewMode={viewMode} />
      {/* Disruption mode instruction hint */}
      {viewMode === 'disruption' && disabledNodeIds.size === 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 74,
            left: 0,
            right: 0,
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: 'rgba(34, 170, 68, 0.4)',
            }}
          >
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 12,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Click a supplier{' '}
              <Text style={{ color: '#22AA44' }}>▲</Text> or DC{' '}
              <Text style={{ color: '#22AA44' }}>■</Text> to simulate a
              disruption
            </Text>
          </View>
        </View>
      )}
      {/* View mode toggle */}
      <ViewModeToggle viewMode={viewMode} onToggle={toggleViewMode} />
      {/* Risk summary panel */}
      <RiskPanel
        metrics={networkRiskMetrics}
        visible={viewMode === 'concentration-risk'}
      />
      {/* Disruption impact panel */}
      <DisruptionPanel
        metrics={disruptionMetrics}
        visible={viewMode === 'disruption' && disabledNodeIds.size > 0}
        onResetAll={handleResetAll}
      />
    </View>
  );
};

export default GlobeVisualization;
