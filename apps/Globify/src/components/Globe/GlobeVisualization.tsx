/**
 * GlobeVisualization Component
 * Unified React Three Fiber + three-globe implementation for web and native
 *
 * Uses babel-plugin-transform-import-meta to handle ESM compatibility
 * See: https://github.com/expo/expo/issues/30323
 */

import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import { View, Platform, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Canvas } from '@react-three/fiber';
import type { GlobeVisualizationProps, ViewMode, DataPoint, SelectedEntity, NetworkRiskMetrics, DisruptionMetrics, RoutePathSegment } from './types';
import { CAMERA_POSITION, CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, CONTROLS_HINT_HIDE_DISTANCE, ROUTE_PATH_COMPLETED_STROKE, ROUTE_PATH_REMAINING_STROKE, TRUCK_COLOR_LIVE, TRUCK_COLOR_STALE, TRUCK_COLOR_LOST } from './constants';
import { styles } from './styles';
import { LoadingFallback } from './LoadingFallback';
import { GlobeScene } from './GlobeScene';
import { GlobeErrorBoundary } from './GlobeErrorBoundary';
import { ViewModeToggle } from './ViewModeToggle';
import { RiskPanel } from './RiskPanel';
import { LegendPanel } from './LegendPanel';
import { DisruptionPanel } from './DisruptionPanel';
import { EntityDetailPanel } from './EntityDetailPanel';
import { TruckDetailPanel } from './TruckDetailPanel';
import { TruckLayerToggle } from './TruckLayerToggle';
import { computeNetworkRiskMetrics } from '../../services/concentrationRisk';
import { applyRiskColorsToPoints, applyRiskColorsToArcs } from '../../services/riskVisuals';
import { computeDisruptionMetrics } from '../../services/disruptionAnalysis';
import { applyDisruptionToPoints, applyDisruptionToArcs } from '../../services/disruptionVisuals';
import { allLocations, allRoutes, getLocationById, getInboundRoutes, buildSelectedEntity } from '../../services/supplyChainData';
import { applySelectionToPoints, applySelectionToArcs, SELECTION_DIM_NODE_COLOR, SELECTION_DIM_ARC_COLOR, SELECTION_DIM_STROKE_MULTIPLIER } from '../../services/selectionHighlight';
import { clusterByZoom, isClusterId, getClusterById, LOD_CLUSTER_CAMERA_THRESHOLD } from '../../services/lodClustering';
import { config } from '../../services/config';
import { useVehiclePositions } from '../../services/useVehiclePositions';
import { getMockVehiclePositions, tickMockVehicles } from '../../services/mockVehicleData';
import * as apiClient from '../../services/apiClient';

/**
 * Main GlobeVisualization component
 * Works on both web and native platforms using React Three Fiber
 */
/** Empty disruption metrics used as initial/default state */
const EMPTY_DISRUPTION: DisruptionMetrics = {
  disabledCount: 0,
  disabledNodes: [],
  affectedRouteCount: 0,
  orphanedRestaurants: [],
  partiallyServedRestaurants: [],
};

export const GlobeVisualization: React.FC<GlobeVisualizationProps> = ({
  dataPoints = [],
  arcsData = [],
  locations: propLocations,
  routes: propRoutes,
  onPointClick,
  onReady,
  onError,
  onStateChange,
  backgroundColor = '#000000',
  testID = 'globe-visualization',
}) => {
  // Use prop data if provided (API mode), else fall back to local mock data
  const locations = propLocations ?? allLocations;
  const routes = propRoutes ?? allRoutes;
  const useApi = !config.isDevMode;

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

  // ── Truck GPS layer ──────────────────────────────────────────────
  const [showTrucks, setShowTrucks] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const wsUrl = useApi ? config.resolvedWsUrl : undefined;
  const apiBaseUrl = useApi ? config.apiBaseUrl : undefined;
  const { positions: livePositions } = useVehiclePositions(wsUrl, apiBaseUrl);
  // In dev mode, use mock vehicles so the truck layer is visible without an API
  const [mockPositions, setMockPositions] = useState<Map<string, import('../../services/useVehiclePositions').VehiclePosition>>(
    getMockVehiclePositions,
  );
  const vehiclePositions = useApi ? livePositions : mockPositions;

  // Animate mock trucks in dev mode
  useEffect(() => {
    if (useApi || !showTrucks) return;
    const id = setInterval(() => {
      setMockPositions(tickMockVehicles());
    }, 800);
    return () => clearInterval(id);
  }, [useApi, showTrucks]);

  const selectedTruck = selectedTruckId
    ? vehiclePositions.get(selectedTruckId) ?? null
    : null;

  // ── Route polyline for selected truck ────────────────────────────
  const [routeEndpoints, setRouteEndpoints] = useState<{
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  } | null>(null);

  // Fetch route endpoints when truck selection changes
  useEffect(() => {
    if (!selectedTruckId) {
      setRouteEndpoints(null);
      return;
    }

    if (useApi) {
      let cancelled = false;
      apiClient.get<{
        originLat: number; originLng: number;
        destinationLat: number; destinationLng: number;
      }>(`/vehicles/${selectedTruckId}/route`)
        .then((route) => {
          if (!cancelled) {
            setRouteEndpoints({
              origin: { lat: route.originLat, lng: route.originLng },
              destination: { lat: route.destinationLat, lng: route.destinationLng },
            });
          }
        })
        .catch(() => {
          if (!cancelled) setRouteEndpoints(null);
        });
      return () => { cancelled = true; };
    }

    // Dev mode: look up origin/destination by name from local data
    const truck = vehiclePositions.get(selectedTruckId);
    if (truck?.originName && truck?.destinationName) {
      const origin = locations.find(l => l.name === truck.originName);
      const dest = locations.find(l => l.name === truck.destinationName);
      if (origin && dest) {
        setRouteEndpoints({
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: dest.lat, lng: dest.lng },
        });
        return undefined;
      }
    }
    setRouteEndpoints(null);
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTruckId, useApi]);

  // Build route path segments from endpoints + truck position
  const routePathData: RoutePathSegment[] = useMemo(() => {
    if (!routeEndpoints || !selectedTruck) return [];
    const truckPos = { lat: selectedTruck.lat, lng: selectedTruck.lng };
    const statusColorMap: Record<string, string> = {
      live: TRUCK_COLOR_LIVE,
      stale: TRUCK_COLOR_STALE,
      lost: TRUCK_COLOR_LOST,
    };
    const baseColor = statusColorMap[selectedTruck.gpsStatus] ?? TRUCK_COLOR_LOST;
    return [
      {
        pnts: [routeEndpoints.origin, truckPos],
        color: baseColor + '59', // 35% opacity
        strokeWidth: ROUTE_PATH_COMPLETED_STROKE,
      },
      {
        pnts: [truckPos, routeEndpoints.destination],
        color: baseColor + 'D9', // 85% opacity
        strokeWidth: ROUTE_PATH_REMAINING_STROKE,
      },
    ];
  }, [routeEndpoints, selectedTruck]);

  const handleTruckClick = useCallback((vehicleId: string) => {
    setSelectedTruckId(vehicleId);
    setSelectedEntity(null); // close entity panel to avoid overlap
  }, []);

  const handleCloseTruck = useCallback(() => {
    setSelectedTruckId(null);
  }, []);

  const toggleTrucks = useCallback(() => {
    setShowTrucks((prev) => !prev);
  }, []);

  // Detect WebGL support on web so we fail fast instead of showing a stuck overlay
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document;
      if (!doc) return;
      const canvas = doc.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        setIsTextureLoading(false);
        setError(new Error('WebGL is not supported in this browser'));
      }
    } catch {
      setIsTextureLoading(false);
      setError(new Error('WebGL is not supported in this browser'));
    }
  }, []);

  const isMobile = Platform.OS !== 'web';

  // ── Network Risk Metrics ─────────────────────────────────────────
  const [networkRiskMetrics, setNetworkRiskMetrics] = useState<NetworkRiskMetrics>(
    () => computeNetworkRiskMetrics(routes, locations)
  );

  useEffect(() => {
    if (!useApi) {
      setNetworkRiskMetrics(computeNetworkRiskMetrics(routes, locations));
      return;
    }
    let cancelled = false;
    apiClient.get<NetworkRiskMetrics>('/risk/network').then((metrics) => {
      if (!cancelled) setNetworkRiskMetrics(metrics);
    }).catch(() => {
      // Fall back to local computation on error
      if (!cancelled) setNetworkRiskMetrics(computeNetworkRiskMetrics(routes, locations));
    });
    return () => { cancelled = true; };
  }, [useApi, routes, locations]);

  // ── Disruption Metrics (debounced) ───────────────────────────────
  const [disruptionMetrics, setDisruptionMetrics] = useState<DisruptionMetrics>(EMPTY_DISRUPTION);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disabledNodeIds.size === 0) {
      setDisruptionMetrics(EMPTY_DISRUPTION);
      return;
    }

    if (!useApi) {
      setDisruptionMetrics(computeDisruptionMetrics(disabledNodeIds, routes, locations));
      return;
    }

    // Debounce 300ms for rapid toggles
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    let cancelled = false;
    debounceTimerRef.current = setTimeout(() => {
      const disabledNodes = Array.from(disabledNodeIds).map((id) => {
        const loc = locations.find((l) => l.id === id);
        return { id, type: loc?.type ?? 'dc' };
      });
      apiClient.post<DisruptionMetrics>('/disruption/simulate', { disabledNodes }).then((metrics) => {
        if (!cancelled) setDisruptionMetrics(metrics);
      }).catch(() => {
        if (!cancelled) setDisruptionMetrics(computeDisruptionMetrics(disabledNodeIds, routes, locations));
      });
    }, 300);

    return () => {
      cancelled = true;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [disabledNodeIds, useApi, routes, locations]);

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

  // When zooming past the cluster threshold while a cluster is selected,
  // clear the selection so individual markers appear normally (same as "Zoom to Expand").
  useEffect(() => {
    if (
      selectedEntity &&
      selectedEntity.type === 'cluster' &&
      cameraDistance < LOD_CLUSTER_CAMERA_THRESHOLD
    ) {
      setSelectedEntity(null);
    }
  }, [cameraDistance, selectedEntity]);

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
      return applyRiskColorsToPoints(lodDataPoints, networkRiskMetrics, locations);
    }
    if (viewMode === 'disruption') {
      return applyDisruptionToPoints(lodDataPoints, disabledNodeIds, orphanedIds, partiallyServedIds);
    }
    return lodDataPoints;
  }, [viewMode, lodDataPoints, networkRiskMetrics, disabledNodeIds, orphanedIds, partiallyServedIds, locations]);

  // Final pass: spotlight the selected entity (or dim for truck isolation)
  const highlightedDataPoints = useMemo(() => {
    if (selectedEntity) return applySelectionToPoints(effectiveDataPoints, selectedEntity);
    // When a truck is selected, dim all location points so the truck stands out
    if (selectedTruckId) {
      return effectiveDataPoints.map((p) => ({ ...p, color: SELECTION_DIM_NODE_COLOR }));
    }
    return effectiveDataPoints;
  }, [effectiveDataPoints, selectedEntity, selectedTruckId]);

  const highlightedArcsData = useMemo(() => {
    if (selectedEntity) return applySelectionToArcs(effectiveArcsData, selectedEntity);
    // When a truck is selected, dim all arcs so the truck stands out
    if (selectedTruckId) {
      return effectiveArcsData.map((a) => ({
        ...a,
        color: SELECTION_DIM_ARC_COLOR,
        strokeWidth: a.strokeWidth * SELECTION_DIM_STROKE_MULTIPLIER,
      }));
    }
    return effectiveArcsData;
  }, [effectiveArcsData, selectedEntity, selectedTruckId]);

  // When a truck is selected, show only that truck (hide others)
  const isolatedVehiclePositions = useMemo(() => {
    if (!selectedTruckId || !vehiclePositions) return vehiclePositions;
    const selected = vehiclePositions.get(selectedTruckId);
    if (!selected) return vehiclePositions;
    const filtered = new Map<string, typeof selected>();
    filtered.set(selectedTruckId, selected);
    return filtered;
  }, [vehiclePositions, selectedTruckId]);

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

  // Track the latest entity selection to ignore stale API responses
  const latestSelectionRef = useRef<string | null>(null);
  const [entityLoading, setEntityLoading] = useState(false);

  // Toggle a node's disabled state (only suppliers and DCs) in disruption mode,
  // or open the inspect panel in other modes.
  const handlePointClick = useCallback(
    (point: DataPoint) => {
      const pointId = point.id;
      if (!pointId) return;

      // Close truck panel when selecting an entity to avoid overlap
      setSelectedTruckId(null);

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
              const memberRoutes = getInboundRoutes(memberId);
              for (const r of memberRoutes) {
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

      // If same entity is already selected, close the panel
      setSelectedEntity((prev) => {
        if (prev && prev.type !== 'route' && prev.location.id === pointId) {
          latestSelectionRef.current = null;
          return null;
        }
        return prev; // Will be replaced by API/local result below
      });

      // Check if we just toggled off
      latestSelectionRef.current = pointId;

      if (!useApi) {
        // Dev mode — use local data
        const location = getLocationById(pointId);
        if (location) {
          setSelectedEntity(buildSelectedEntity(location));
        }
        return;
      }

      // API mode — fetch entity detail
      setEntityLoading(true);
      apiClient.get<SelectedEntity>(`/entities/${pointId}`).then((entity) => {
        // Ignore stale responses
        if (latestSelectionRef.current !== pointId) return;
        setSelectedEntity(entity);
      }).catch(() => {
        // Fall back to local on error
        if (latestSelectionRef.current !== pointId) return;
        const location = getLocationById(pointId);
        if (location) setSelectedEntity(buildSelectedEntity(location));
      }).finally(() => {
        if (latestSelectionRef.current === pointId) setEntityLoading(false);
      });
    },
    [viewMode, useApi, locations]
  );

  // Reset all disruption state
  const handleResetAll = useCallback(() => {
    setDisabledNodeIds(new Set());
  }, []);

  const handleCloseEntity = useCallback(() => {
    setSelectedEntity(null);
    setSelectedTruckId(null);
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
      <GlobeErrorBoundary>
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
              tileCdnUrl={config.resolvedTileCdnUrl}
              vehiclePositions={isolatedVehiclePositions}
              showTrucks={showTrucks}
              onTruckClick={handleTruckClick}
              routePathData={routePathData}
            />
          </Canvas>
        </Suspense>
      </GlobeErrorBoundary>
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
      {/* Bottom-right button row: truck toggle + view mode toggle */}
      <View style={{ position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TruckLayerToggle
          visible={showTrucks}
          onToggle={toggleTrucks}
          vehicleCount={vehiclePositions.size}
        />
        <ViewModeToggle viewMode={viewMode} onToggle={toggleViewMode} />
      </View>
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
      {/* Truck detail panel */}
      <TruckDetailPanel vehicle={selectedTruck} onClose={handleCloseTruck} />
    </View>
  );
};

export default GlobeVisualization;
