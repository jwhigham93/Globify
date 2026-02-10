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
import type { GlobeVisualizationProps, ViewMode, DataPoint, SelectedEntity } from './types';
import { CAMERA_POSITION, CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, CONTROLS_HINT_HIDE_DISTANCE } from './constants';
import { styles } from './styles';
import { LoadingFallback } from './LoadingFallback';
import { GlobeScene } from './GlobeScene';
import { ViewModeToggle } from './ViewModeToggle';
import { RiskPanel } from './RiskPanel';
import { LegendPanel } from './LegendPanel';
import { DisruptionPanel } from './DisruptionPanel';
import { EntityDetailPanel } from './EntityDetailPanel';
import { computeNetworkRiskMetrics } from '../../services/concentrationRisk';
import { applyRiskColorsToPoints, applyRiskColorsToArcs } from '../../services/riskVisuals';
import { computeDisruptionMetrics } from '../../services/disruptionAnalysis';
import { applyDisruptionToPoints, applyDisruptionToArcs } from '../../services/disruptionVisuals';
import { allLocations, allRoutes, getLocationById, getInboundRoutes, buildSelectedEntity } from '../../services/supplyChainData';
import { applySelectionToPoints, applySelectionToArcs } from '../../services/selectionHighlight';
import { clusterByZoom, isClusterId, getClusterById, LOD_CLUSTER_CAMERA_THRESHOLD } from '../../services/lodClustering';

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
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [cameraDistance, setCameraDistance] = useState<number>(
    Math.round(Math.sqrt(CAMERA_POSITION[0] ** 2 + CAMERA_POSITION[1] ** 2 + CAMERA_POSITION[2] ** 2))
  );
  const [zoomTarget, setZoomTarget] = useState<number | null>(null);

  const isMobile = Platform.OS !== 'web';

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

  // LOD clustering — aggregate nearby restaurants at far zoom
  const { dataPoints: lodDataPoints, arcsData: lodArcsData } = useMemo(
    () => clusterByZoom(dataPoints, arcsData, cameraDistance),
    [dataPoints, arcsData, cameraDistance],
  );

  // Derive risk-colored arcs when in concentration-risk view
  const effectiveArcsData = useMemo(() => {
    if (viewMode === 'concentration-risk') {
      return applyRiskColorsToArcs(lodArcsData, networkRiskMetrics);
    }
    if (viewMode === 'disruption') {
      return applyDisruptionToArcs(lodArcsData, disabledNodeIds, partiallyServedIds);
    }
    return lodArcsData;
  }, [viewMode, lodArcsData, networkRiskMetrics, disabledNodeIds, partiallyServedIds]);

  // Derive disruption-colored data points when in disruption view
  const effectiveDataPoints = useMemo(() => {
    if (viewMode === 'concentration-risk') {
      return applyRiskColorsToPoints(lodDataPoints, networkRiskMetrics, allLocations);
    }
    if (viewMode === 'disruption') {
      return applyDisruptionToPoints(lodDataPoints, disabledNodeIds, orphanedIds, partiallyServedIds);
    }
    return lodDataPoints;
  }, [viewMode, lodDataPoints, networkRiskMetrics, disabledNodeIds, orphanedIds, partiallyServedIds]);

  // Final pass: spotlight the selected entity and dim everything else
  const highlightedDataPoints = useMemo(() => {
    if (!selectedEntity) return effectiveDataPoints;
    return applySelectionToPoints(effectiveDataPoints, selectedEntity);
  }, [effectiveDataPoints, selectedEntity]);

  const highlightedArcsData = useMemo(() => {
    if (!selectedEntity) return effectiveArcsData;
    return applySelectionToArcs(effectiveArcsData, selectedEntity);
  }, [effectiveArcsData, selectedEntity]);

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
    // Close the inspect panel when switching modes
    setSelectedEntity(null);
  };

  // Toggle a node's disabled state (only suppliers and DCs) in disruption mode,
  // or open the inspect panel in other modes.
  const handlePointClick = useCallback(
    (point: DataPoint) => {
      const pointId = point.id;
      if (!pointId) return;

      if (viewMode === 'disruption') {
        // Suppliers and DCs toggle their disruption state
        if (point.locationType !== 'restaurant') {
          setDisabledNodeIds((prev) => {
            const next = new Set(prev);
            if (next.has(pointId)) {
              next.delete(pointId);
            } else {
              next.add(pointId);
            }
            return next;
          });
          return;
        }
        // Restaurants open the inspect panel in disruption mode
        // (fall through to entity selection below)
      }

      // Open entity detail panel (all modes, or restaurants in disruption mode)
      // Handle cluster markers — build a summary from member restaurants
      if (isClusterId(pointId)) {
        const cluster = getClusterById(pointId);
        if (cluster) {
          setSelectedEntity((prev) => {
            if (prev && prev.type !== 'route' && prev.location.id === pointId) return null;

            // Build rich cluster info with member names and serving DCs
            const memberNames = cluster.memberIds
              .map((id) => getLocationById(id)?.name ?? id)
              .sort();

            const dcSet = new Set<string>();
            let totalVolume = 0;
            for (const memberId of cluster.memberIds) {
              const routes = getInboundRoutes(memberId);
              for (const r of routes) {
                totalVolume += r.volume;
                const dc = getLocationById(r.sourceId);
                if (dc) dcSet.add(dc.name);
              }
            }

            return {
              type: 'cluster',
              location: {
                id: cluster.id,
                name: `${cluster.size} Restaurants (${cluster.metro.toUpperCase()})`,
                lat: cluster.lat,
                lng: cluster.lng,
                type: 'restaurant',
              },
              metro: cluster.metro,
              memberCount: cluster.size,
              memberNames,
              servingDCs: [...dcSet].sort(),
              totalInboundVolume: totalVolume,
            };
          });
        }
        return;
      }

      const location = getLocationById(pointId);
      if (!location) return;
      setSelectedEntity((prev) => {
        // If same entity is already selected, close the panel
        if (prev && prev.type !== 'route' && prev.location.id === pointId) {
          return null;
        }
        return buildSelectedEntity(location);
      });
    },
    [viewMode]
  );

  // Reset all disruption state
  const handleResetAll = useCallback(() => {
    setDisabledNodeIds(new Set());
  }, []);

  // Close the entity detail panel
  const handleCloseEntity = useCallback(() => {
    setSelectedEntity(null);
  }, []);

  // Zoom in to break a cluster apart into individual markers
  const handleZoomToExpand = useCallback(() => {
    setZoomTarget(LOD_CLUSTER_CAMERA_THRESHOLD - 5);
    setSelectedEntity(null);
  }, []);

  // Clear zoom target when animation completes
  const handleZoomTargetReached = useCallback(() => {
    setZoomTarget(null);
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
            dataPoints={highlightedDataPoints}
            arcsData={highlightedArcsData}
            onReady={onReady}
            onError={handleError}
            onTextureLoading={handleTextureLoading}
            isStarsSpinning={isStarsSpinning}
            onPointClick={handlePointClick}
            onBackgroundClick={handleCloseEntity}
            onZoomChange={setCameraDistance}
            zoomTarget={zoomTarget}
            onZoomTargetReached={handleZoomTargetReached}
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
              {isMobile ? 'Tap' : 'Click'} a supplier{' '}
              <Text style={{ color: '#22AA44' }}>▲</Text> or DC{' '}
              <Text style={{ color: '#22AA44' }}>■</Text> to simulate a
              disruption
            </Text>
          </View>
        </View>
      )}
      {/* Controls hint — hidden when zoomed in */}
      {cameraDistance > CONTROLS_HINT_HIDE_DISTANCE && (
        <View
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 11,
              fontWeight: '400',
              letterSpacing: 0.5,
              textAlign: 'center',
            }}
          >
            {isMobile
              ? 'Pinch to zoom · Swipe to rotate · Tap to inspect'
              : 'Scroll to zoom · Drag to rotate · Click to inspect'}
          </Text>
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
      {/* Entity detail inspect panel */}
      <EntityDetailPanel
        entity={selectedEntity}
        onClose={handleCloseEntity}
        onZoomToExpand={handleZoomToExpand}
      />
    </View>
  );
};

export default GlobeVisualization;
