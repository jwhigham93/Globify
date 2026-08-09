/**
 * GlobeVisualization Component
 * Unified React Three Fiber + three-globe implementation for web and native
 *
 * Uses babel-plugin-transform-import-meta to handle ESM compatibility
 * See: https://github.com/expo/expo/issues/30323
 */

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { View, Platform, Text } from 'react-native';
import { Canvas } from '@react-three/fiber';
import type { GlobeVisualizationProps, ViewMode, DataPoint, SelectedEntity, NetworkRiskMetrics, DisruptionMetrics, RoutePathSegment } from './types';
import { CAMERA_POSITION, CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, DPR_MAX_TOUCH, DPR_MAX_DESKTOP, ROUTE_PATH_COMPLETED_STROKE, ROUTE_PATH_REMAINING_STROKE, TRUCK_COLOR_LIVE, TRUCK_COLOR_STALE, TRUCK_COLOR_LOST } from './constants';
import { styles } from './styles';
import { LoadingFallback } from './LoadingFallback';
import { GlobeScene } from './GlobeScene';
import { GlobeErrorBoundary } from './GlobeErrorBoundary';
import { GlobeHud } from './GlobeHud';
import { Loader } from '../ui/Loader';
import { computeZoomBand } from '../../services/zoomBands';
import type { ZoomBand } from '../../services/zoomBands';
import { HudContext, useIsTouch } from '../ui/layout';
import type { HudState } from '../ui/layout';
import { applyRiskColorsToPoints, applyRiskColorsToArcs } from '../../services/riskVisuals';
import { applyDisruptionToPoints, applyDisruptionToArcs } from '../../services/disruptionVisuals';
import { applySelectionToPoints, applySelectionToArcs, SELECTION_DIM_NODE_COLOR, SELECTION_DIM_ARC_COLOR, SELECTION_DIM_STROKE_MULTIPLIER } from '../../services/selectionHighlight';
import { clusterByZoom, isClusterId, getClusterById, LOD_CLUSTER_CAMERA_THRESHOLD } from '../../services/lodClustering';
import { config } from '../../services/config';
import { useVehiclePositions } from '../../services/useVehiclePositions';
import { useSupplyChainData } from '../../hooks/queries/useSupplyChainData';
import { useNetworkRisk } from '../../hooks/queries/useNetworkRisk';
import { useDisruptionSimulation } from '../../hooks/queries/useDisruptionSimulation';
import { useEntityDetail } from '../../hooks/queries/useEntityDetail';
import { useVehicleRoute } from '../../hooks/queries/useVehicleRoute';

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

/** Empty network risk metrics used before the risk query resolves */
const EMPTY_NETWORK_RISK: NetworkRiskMetrics = {
  networkDiversificationScore: 0,
  hhi: 0,
  supplierRisks: [],
  dcDiversification: [],
  restaurantRisks: [],
};

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
  // Topology (and derived lookup indexes) from the backend, shared via the query cache.
  const { locations, locationsById, inboundByLocationId } = useSupplyChainData();

  const [error, setError] = useState<Error | null>(null);
  const [isTextureLoading, setIsTextureLoading] = useState(true);
  const [isStarsSpinning, setIsStarsSpinning] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [disabledNodeIds, setDisabledNodeIds] = useState<Set<string>>(new Set());
  // Client-built selections (cluster / route) live here; supplier/dc/restaurant
  // selections are driven by selectedLocationId + the entity-detail query below.
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  // Only the two booleans the UI actually branches on, not the raw distance.
  // Reporting every 1-unit change re-rendered this whole tree ~70 times per
  // zoom sweep, each render re-clustering the dataset and rebuilding markers.
  const [zoomBand, setZoomBand] = useState<ZoomBand>(() =>
    computeZoomBand(
      Math.sqrt(CAMERA_POSITION[0] ** 2 + CAMERA_POSITION[1] ** 2 + CAMERA_POSITION[2] ** 2),
    ),
  );
  const [zoomTarget, setZoomTarget] = useState<number | null>(null);

  const isTouch = useIsTouch();
  const maxDpr = isTouch ? DPR_MAX_TOUCH : DPR_MAX_DESKTOP;

  // ── Truck GPS layer ──────────────────────────────────────────────
  const [showTrucks, setShowTrucks] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const { positions: vehiclePositions } = useVehiclePositions(
    config.resolvedWsUrl,
    config.apiBaseUrl,
  );

  const selectedTruck = selectedTruckId
    ? vehiclePositions.get(selectedTruckId) ?? null
    : null;

  // ── Route polyline for selected truck ────────────────────────────
  const { data: vehicleRoute, isError: isRouteError } = useVehicleRoute(selectedTruckId);
  const routeEndpoints = useMemo(
    () =>
      vehicleRoute
        ? {
            origin: { lat: vehicleRoute.originLat, lng: vehicleRoute.originLng },
            destination: {
              lat: vehicleRoute.destinationLat,
              lng: vehicleRoute.destinationLng,
            },
          }
        : null,
    [vehicleRoute],
  );

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
    setSelectedLocationId(null);
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

  // ── Network Risk Metrics ─────────────────────────────────────────
  const {
    data: networkRiskMetrics = EMPTY_NETWORK_RISK,
    isSuccess: isRiskSuccess,
    isError: isRiskError,
  } = useNetworkRisk();

  // ── Disruption Metrics ───────────────────────────────────────────
  // Keyed by the disabled-node set; React Query dedupes requests, so no manual
  // debounce/cancellation is needed. No placeholder data: the panel is gated on
  // isSuccess so a failed or in-flight simulation never renders as zero impact.
  const disabledIdList = useMemo(() => Array.from(disabledNodeIds), [disabledNodeIds]);
  const {
    data: disruptionData,
    isSuccess: isDisruptionSuccess,
    isError: isDisruptionError,
  } = useDisruptionSimulation(disabledIdList);
  const disruptionMetrics =
    disabledNodeIds.size === 0 ? EMPTY_DISRUPTION : disruptionData ?? EMPTY_DISRUPTION;

  // ── Entity detail for a clicked supplier/dc/restaurant ───────────
  const { data: entityDetail, isError: isEntityError } = useEntityDetail(selectedLocationId);
  // The active inspect-panel entity: a client-built cluster/route, else the
  // fetched location detail.
  const activeEntity: SelectedEntity | null = selectedEntity ?? entityDetail ?? null;

  // Backend query failures for the currently relevant data — surfaced as a
  // banner rather than silently rendering empty/zeroed domain data.
  const failedQueries = [
    viewMode === 'concentration-risk' && isRiskError ? 'risk metrics' : null,
    viewMode === 'disruption' && disabledNodeIds.size > 0 && isDisruptionError
      ? 'disruption simulation'
      : null,
    selectedLocationId && isEntityError ? 'location details' : null,
    selectedTruckId && isRouteError ? 'vehicle route' : null,
  ].filter((label): label is string => !!label);

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
    () => clusterByZoom(dataPoints, arcsData, zoomBand.lodClustered),
    [dataPoints, arcsData, zoomBand.lodClustered],
  );

  // When zooming past the cluster threshold while a cluster is selected,
  // clear the selection so individual markers appear normally (same as "Zoom to Expand").
  useEffect(() => {
    if (!zoomBand.lodClustered && selectedEntity?.type === 'cluster') {
      setSelectedEntity(null);
    }
  }, [zoomBand.lodClustered, selectedEntity]);

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
    if (activeEntity) return applySelectionToPoints(effectiveDataPoints, activeEntity);
    // When a truck is selected, dim all location points so the truck stands out
    if (selectedTruckId) {
      return effectiveDataPoints.map((p) => ({ ...p, color: SELECTION_DIM_NODE_COLOR }));
    }
    return effectiveDataPoints;
  }, [effectiveDataPoints, activeEntity, selectedTruckId]);

  const highlightedArcsData = useMemo(() => {
    if (activeEntity) return applySelectionToArcs(effectiveArcsData, activeEntity);
    // When a truck is selected, dim all arcs so the truck stands out
    if (selectedTruckId) {
      return effectiveArcsData.map((a) => ({
        ...a,
        color: SELECTION_DIM_ARC_COLOR,
        strokeWidth: a.strokeWidth * SELECTION_DIM_STROKE_MULTIPLIER,
      }));
    }
    return effectiveArcsData;
  }, [effectiveArcsData, activeEntity, selectedTruckId]);

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
    setSelectedLocationId(null);
  };

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
          setSelectedLocationId(null); // clear any location detail selection
          setSelectedEntity((prev) => {
            if (prev && prev.type !== 'route' && prev.location.id === pointId) return null;

            // Build rich cluster info with member names and serving DCs
            const memberNames = cluster.memberIds
              .map((id) => locationsById.get(id)?.name ?? id)
              .sort();

            const dcSet = new Set<string>();
            let totalVolume = 0;
            for (const memberId of cluster.memberIds) {
              const memberRoutes = inboundByLocationId.get(memberId) ?? [];
              for (const r of memberRoutes) {
                totalVolume += r.volume;
                const dc = locationsById.get(r.sourceId);
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

      // Location click (supplier/dc/restaurant): clear any cluster selection and
      // toggle the location detail query. useEntityDetail(selectedLocationId)
      // fetches and caches the detail; activeEntity surfaces it to the panel.
      setSelectedEntity(null);
      setSelectedLocationId((prev) => (prev === pointId ? null : pointId));
    },
    [viewMode, locationsById, inboundByLocationId]
  );

  // Reset all disruption state
  const handleResetAll = useCallback(() => {
    setDisabledNodeIds(new Set());
  }, []);

  const handleCloseEntity = useCallback(() => {
    setSelectedEntity(null);
    setSelectedLocationId(null);
    setSelectedTruckId(null);
  }, []);

  // Zoom in to break a cluster apart into individual markers
  const handleZoomToExpand = useCallback(() => {
    setZoomTarget(LOD_CLUSTER_CAMERA_THRESHOLD - 5);
    setSelectedEntity(null);
    setSelectedLocationId(null);
  }, []);

  // Clear zoom target when animation completes
  const handleZoomTargetReached = useCallback(() => {
    setZoomTarget(null);
  }, []);

  // Published to every overlay so slot offsets are computed in one place rather
  // than each panel guessing what else is on screen.
  const hudState: HudState = useMemo(
    () => ({
      bannerVisible: failedQueries.length > 0,
      sheetOpen: !!(activeEntity || selectedTruck),
    }),
    [failedQueries.length, activeEntity, selectedTruck],
  );

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
          <Loader label="Loading Earth texture..." />
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
            // R3F would otherwise default to dpr [1,2] with MSAA, which on a
            // 3x phone is ~4x the fragment work every frame — enough to pin the
            // GPU and thermally throttle the device within a minute.
            dpr={[1, maxDpr]}
            gl={{
              antialias: !isTouch,
              powerPreference: 'high-performance',
              alpha: false,
              stencil: false,
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
              onZoomBandChange={setZoomBand}
              maxDpr={maxDpr}
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
      <HudContext.Provider value={hudState}>
        <GlobeHud
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          isStarsSpinning={isStarsSpinning}
          onToggleStarsSpinning={toggleStarsSpinning}
          showTrucks={showTrucks}
          onToggleTrucks={toggleTrucks}
          vehicleCount={vehiclePositions.size}
          failedQueries={failedQueries}
          showDisruptionHint={viewMode === 'disruption' && disabledNodeIds.size === 0}
          showControlsHint={zoomBand.showHint}
          networkRiskMetrics={networkRiskMetrics}
          riskPanelVisible={viewMode === 'concentration-risk' && isRiskSuccess}
          disruptionMetrics={disruptionMetrics}
          disruptionPanelVisible={
            viewMode === 'disruption' && disabledNodeIds.size > 0 && isDisruptionSuccess
          }
          onResetDisruptions={handleResetAll}
          activeEntity={activeEntity}
          onCloseEntity={handleCloseEntity}
          onZoomToExpand={handleZoomToExpand}
          selectedTruck={selectedTruck}
          onCloseTruck={handleCloseTruck}
        />
      </HudContext.Provider>
    </View>
  );
};

export default GlobeVisualization;
