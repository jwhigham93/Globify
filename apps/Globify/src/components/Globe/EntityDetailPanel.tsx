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
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { color, border, space, type, surface } from '../ui/theme';
import { useHudLayout } from '../ui/layout';
import { ShapeCell } from '../ui/Shape';
import type { ShapeKind } from '../ui/Shape';
import { CloseButton } from '../ui/CloseButton';
import type {
  SelectedEntity,
  SelectedSupplier,
  SelectedDC,
  SelectedRestaurant,
  SelectedCluster,
} from './types';
import { useSupplyChainData } from '../../hooks/queries/useSupplyChainData';

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
            <ShapeCell kind="arrowRight" tint={ARROW_OUT_COLOR} />
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
            <ShapeCell kind="arrowLeft" tint={ARROW_IN_COLOR} />
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
            <ShapeCell kind="arrowRight" tint={ARROW_OUT_COLOR} />
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
          <ShapeCell kind="arrowLeft" tint={ARROW_IN_COLOR} />
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
            <ShapeCell kind="arrowLeft" tint={ARROW_IN_COLOR} />
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

function entityShape(entityType: string): ShapeKind {
  if (entityType === 'supplier') return 'triangle';
  if (entityType === 'dc') return 'square';
  if (entityType === 'cluster') return 'diamond';
  if (entityType === 'route') return 'arrowRight';
  return 'dot';
}

function entityAccentColor(entityType: string): string {
  if (entityType === 'supplier') return '#FF9933';
  if (entityType === 'dc') return '#44AADD';
  if (entityType === 'cluster') return '#FF4488';
  return '#FF2244';
}

/** Direction accents for inbound/outbound route rows. */
const ARROW_OUT_COLOR = '#FF9933';
const ARROW_IN_COLOR = '#44AADD';

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
          <Text style={s.zoomButtonText}>Zoom to Expand</Text>
        </TouchableOpacity>
      )}

      <Text style={s.sectionTitle}>Restaurants ({data.memberCount})</Text>
      {data.memberNames.map((name, i) => (
        <View key={i} style={s.routeRow}>
          <ShapeCell kind="dot" tint="#E60E33" />
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
              <ShapeCell kind="square" tint={ARROW_IN_COLOR} />
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

const EntityDetailPanelImpl: React.FC<EntityDetailPanelProps> = ({
  entity,
  onClose,
  onZoomToExpand,
}) => {
  const { slot, isNarrow } = useHudLayout();

  if (!entity) return null;

  const name =
    entity.type === 'route'
      ? `${entity.source.name} → ${entity.destination.name}`
      : entity.location.name;

  const accent = entityAccentColor(entity.type);
  const typeLabel =
    entity.type === 'dc'
      ? 'Distribution Center'
      : entity.type === 'cluster'
      ? 'Metro Cluster'
      : entity.type.charAt(0).toUpperCase() + entity.type.slice(1);

  return (
    <View
      style={[
        surface.panel,
        s.container,
        isNarrow && s.containerNarrow,
        { borderColor: accent },
        slot(isNarrow ? 'sheet' : 'top-left'),
      ]}
      testID="entity-detail-panel"
    >
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <ShapeCell kind={entityShape(entity.type)} tint={accent} />
            <View style={s.headerTextWrap}>
              <Text style={s.headerName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[s.headerType, { color: accent }]}>
                {typeLabel}
              </Text>
            </View>
          </View>
          <CloseButton
            onPress={onClose}
            accessibilityLabel="Close entity details"
            testID="entity-detail-close"
          />
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
    width: 270,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  containerNarrow: {
    width: undefined,
    maxHeight: '45%',
  },
  scroll: {
    paddingHorizontal: space.md,
    paddingTop: space.md,
    // Rows carry a bottom margin, so a full `space.md` here stacks with the
    // last one and leaves a visibly empty band under the final entry.
    paddingBottom: space.md - space.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.xs + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: space.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerName: {
    ...type.title,
    textTransform: 'none',
  },
  headerType: {
    ...type.label,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  coords: {
    ...type.bodyDim,
    color: color.textFaint,
    marginBottom: space.sm + 2,
    marginLeft: space.xl,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.xs + 2,
    marginBottom: space.sm,
  },
  metricBox: {
    ...surface.inset,
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  metricValue: {
    ...type.metric,
    fontSize: 18,
  },
  metricLabel: {
    ...type.label,
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    ...type.label,
    marginBottom: 5,
    marginTop: space.sm,
    borderTopWidth: border.hair,
    borderTopColor: color.lineDim,
    paddingTop: space.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    marginBottom: space.xs,
  },
  routeName: {
    ...type.body,
    flex: 1,
  },
  routeVolume: {
    ...type.bodyDim,
    fontWeight: '700',
  },
  zoomButton: {
    ...surface.button,
    borderColor: '#FF4488',
    paddingVertical: space.sm + 2,
    alignItems: 'center',
    marginVertical: space.sm,
  },
  zoomButtonText: {
    ...type.button,
    color: '#FF4488',
  },
});

/** Memoized: the HUD re-renders on unrelated state changes. */
export const EntityDetailPanel = React.memo(EntityDetailPanelImpl);

export default EntityDetailPanel;
