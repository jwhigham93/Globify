/**
 * Entity Detail Panel Component
 *
 * Slide-in panel that displays detailed information about a clicked entity
 * (supplier, DC, or restaurant). Shows contextual metrics and connected entities.
 *
 * Only one panel can be open at a time; dismissed by tapping the ✕ button
 * or clicking elsewhere on the globe.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type {
  SelectedEntity,
  SelectedSupplier,
  SelectedDC,
  SelectedRestaurant,
  SelectedCluster,
} from './types';
import { useSupplyChainData } from '../../hooks/queries/useSupplyChainData';

const NARROW_BREAKPOINT = 600;

export interface EntityDetailPanelProps {
  entity: SelectedEntity | null;
  onClose: () => void;
  /** Callback to zoom camera in, expanding a cluster into individual markers */
  onZoomToExpand?: () => void;
}

// ── Sub-panels ─────────────────────────────────────────────────────────────

const SupplierDetail: React.FC<{ data: SelectedSupplier }> = ({ data }) => {
  const { locationsById } = useSupplyChainData();
  return (
    <>
      <View style={s.metricsRow}>
        <MetricBox label="DCs Served" value={data.dcCount} />
        <MetricBox label="Routes" value={data.outboundRoutes.length} />
        <MetricBox
          label="Vol / Wk"
          value={formatVolume(data.totalVolume)}
        />
      </View>

      <Text style={s.sectionTitle}>Outbound Routes</Text>
      {data.outboundRoutes.map((route) => {
        const dest = locationsById.get(route.destId);
        return (
          <View key={route.id} style={s.routeRow}>
            <Text style={s.routeArrow}>→</Text>
            <Text style={s.routeName} numberOfLines={1}>
              {dest?.name ?? route.destId}
            </Text>
            <Text style={s.routeVolume}>
              {route.volume.toLocaleString()}
            </Text>
          </View>
        );
      })}
    </>
  );
};

const DCDetail: React.FC<{ data: SelectedDC }> = ({ data }) => {
  const { locationsById } = useSupplyChainData();
  return (
    <>
      <View style={s.metricsRow}>
        <MetricBox label="Suppliers" value={data.inboundRoutes.length} />
        <MetricBox label="Restaurants" value={data.outboundRoutes.length} />
      </View>
      <View style={s.metricsRow}>
        <MetricBox
          label="Inbound / Wk"
          value={formatVolume(data.totalInboundVolume)}
        />
        <MetricBox
          label="Outbound / Wk"
          value={formatVolume(data.totalOutboundVolume)}
        />
      </View>

      <Text style={s.sectionTitle}>Inbound (Suppliers)</Text>
      {data.inboundRoutes.map((route) => {
        const src = locationsById.get(route.sourceId);
        return (
          <View key={route.id} style={s.routeRow}>
            <Text style={s.routeArrowIn}>←</Text>
            <Text style={s.routeName} numberOfLines={1}>
              {src?.name ?? route.sourceId}
            </Text>
            <Text style={s.routeVolume}>
              {route.volume.toLocaleString()}
            </Text>
          </View>
        );
      })}

      <Text style={s.sectionTitle}>Outbound (Restaurants)</Text>
      {data.outboundRoutes.map((route) => {
        const dest = locationsById.get(route.destId);
        return (
          <View key={route.id} style={s.routeRow}>
            <Text style={s.routeArrow}>→</Text>
            <Text style={s.routeName} numberOfLines={1}>
              {dest?.name ?? route.destId}
            </Text>
            <Text style={s.routeVolume}>
              {route.volume.toLocaleString()}
            </Text>
          </View>
        );
      })}
    </>
  );
};

const RestaurantDetail: React.FC<{ data: SelectedRestaurant }> = ({ data }) => {
  const { locationsById } = useSupplyChainData();
  return (
    <>
      <View style={s.metricsRow}>
        <MetricBox label="Serving DCs" value={data.servingDCs.length} />
        <MetricBox
          label="Vol / Wk"
          value={formatVolume(data.totalInboundVolume)}
        />
      </View>

      <Text style={s.sectionTitle}>Serving DCs</Text>
      {data.servingDCs.map((dcName) => (
        <View key={dcName} style={s.routeRow}>
          <Text style={s.routeArrowIn}>←</Text>
          <Text style={s.routeName} numberOfLines={1}>
            {dcName}
          </Text>
        </View>
      ))}

      <Text style={s.sectionTitle}>Inbound Routes</Text>
      {data.inboundRoutes.map((route) => {
        const src = locationsById.get(route.sourceId);
        return (
          <View key={route.id} style={s.routeRow}>
            <Text style={s.routeArrowIn}>←</Text>
            <Text style={s.routeName} numberOfLines={1}>
              {src?.name ?? route.sourceId}
            </Text>
            <Text style={s.routeVolume}>
              {route.volume.toLocaleString()}
            </Text>
          </View>
        );
      })}
    </>
  );
};

// ── Shared sub-components ──────────────────────────────────────────────────

const MetricBox: React.FC<{ label: string; value: string | number }> = ({
  label,
  value,
}) => (
  <View style={s.metricBox}>
    <Text style={s.metricValue}>{value}</Text>
    <Text style={s.metricLabel}>{label}</Text>
  </View>
);

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString();
}

function entityIcon(type: string): string {
  if (type === 'supplier') return '▲';
  if (type === 'dc') return '■';
  if (type === 'cluster') return '◎';
  return '●';
}

function entityAccentColor(type: string): string {
  if (type === 'supplier') return '#FF9933';
  if (type === 'dc') return '#44AADD';
  if (type === 'cluster') return '#FF4488';
  return '#FF2244';
}

const ClusterDetail: React.FC<{ data: SelectedCluster; onZoomIn?: () => void }> = ({
  data,
  onZoomIn,
}) => {
  return (
    <>
      <View style={s.metricsRow}>
        <MetricBox label="Restaurants" value={data.memberCount} />
        <MetricBox label="Serving DCs" value={data.servingDCs.length} />
        <MetricBox label="Vol / Wk" value={formatVolume(data.totalInboundVolume)} />
      </View>

      {onZoomIn && (
        <TouchableOpacity
          style={s.zoomButton}
          onPress={onZoomIn}
          activeOpacity={0.7}
        >
          <Text style={s.zoomButtonText}>⊕  Zoom to Expand</Text>
        </TouchableOpacity>
      )}

      <Text style={s.sectionTitle}>Restaurants ({data.memberCount})</Text>
      {data.memberNames.map((name, i) => (
        <View key={i} style={s.routeRow}>
          <Text style={s.clusterDot}>●</Text>
          <Text style={s.routeName} numberOfLines={1}>
            {name}
          </Text>
        </View>
      ))}

      {data.servingDCs.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Serving DCs</Text>
          {data.servingDCs.map((dcName) => (
            <View key={dcName} style={s.routeRow}>
              <Text style={s.routeArrowIn}>■</Text>
              <Text style={s.routeName} numberOfLines={1}>
                {dcName}
              </Text>
            </View>
          ))}
        </>
      )}
    </>
  );
};

// ── Main Panel ─────────────────────────────────────────────────────────────

export const EntityDetailPanel: React.FC<EntityDetailPanelProps> = ({
  entity,
  onClose,
  onZoomToExpand,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < NARROW_BREAKPOINT;

  if (!entity) return null;

  const name =
    entity.type === 'route'
      ? `${entity.source.name} → ${entity.destination.name}`
      : entity.location.name;

  const accent = entityAccentColor(entity.type);
  const icon = entity.type === 'route' ? '⟶' : entityIcon(entity.type);
  const typeLabel =
    entity.type === 'dc'
      ? 'Distribution Center'
      : entity.type === 'cluster'
      ? 'Metro Cluster'
      : entity.type.charAt(0).toUpperCase() + entity.type.slice(1);

  const containerStyle = isNarrow
    ? [s.containerNarrow, { borderColor: accent + '44' }]
    : [s.container, { borderColor: accent + '44' }];

  return (
    <View style={containerStyle}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={[s.headerIcon, { color: accent }]}>{icon}</Text>
            <View style={s.headerTextWrap}>
              <Text style={s.headerName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[s.headerType, { color: accent }]}>
                {typeLabel}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Coords */}
        {entity.type !== 'route' && (
          <Text style={s.coords}>
            {entity.location.lat.toFixed(2)}°{entity.location.lat >= 0 ? 'N' : 'S'},{' '}
            {Math.abs(entity.location.lng).toFixed(2)}°{entity.location.lng >= 0 ? 'E' : 'W'}
          </Text>
        )}

        {/* Type-specific content */}
        {entity.type === 'supplier' && <SupplierDetail data={entity} />}
        {entity.type === 'dc' && <DCDetail data={entity} />}
        {entity.type === 'restaurant' && <RestaurantDetail data={entity} />}
        {entity.type === 'cluster' && <ClusterDetail data={entity} onZoomIn={onZoomToExpand} />}
      </ScrollView>
    </View>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 270,
    maxHeight: '75%',
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  containerNarrow: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    right: 10,
    maxHeight: '45%',
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerType: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  closeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '700',
  },
  coords: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    marginBottom: 10,
    marginLeft: 24,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 8,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  routeArrow: {
    color: '#FF9933',
    fontSize: 11,
    width: 14,
    textAlign: 'center',
    fontWeight: '700',
  },
  routeArrowIn: {
    color: '#44AADD',
    fontSize: 11,
    width: 14,
    textAlign: 'center',
    fontWeight: '700',
  },
  routeName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
  },
  routeVolume: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '600',
  },
  zoomButton: {
    backgroundColor: 'rgba(255, 68, 136, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 136, 0.4)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginVertical: 8,
  },
  zoomButtonText: {
    color: '#FF4488',
    fontSize: 13,
    fontWeight: '700',
  },
  clusterDot: {
    color: '#E60E33',
    fontSize: 6,
    width: 14,
    textAlign: 'center',
  },
});

export default EntityDetailPanel;
