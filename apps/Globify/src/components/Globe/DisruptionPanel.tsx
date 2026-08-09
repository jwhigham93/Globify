/**
 * Disruption Impact Panel Component
 *
 * Displays disruption simulation metrics when nodes are disabled.
 * Shows disabled node count/names, affected routes, orphaned restaurants,
 * and a "Reset All" button to clear all disruptions.
 *
 * Only rendered when at least one node is disabled.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { color, space, type, surface } from '../ui/theme';
import { useHudLayout } from '../ui/layout';
import { ShapeCell } from '../ui/Shape';
import type { ShapeKind } from '../ui/Shape';
import type { DisruptionMetrics } from './types';

export interface DisruptionPanelProps {
  metrics: DisruptionMetrics;
  visible: boolean;
  onResetAll: () => void;
}

/**
 * Marker shape for disabled nodes
 */
function typeShape(nodeType: string): ShapeKind {
  if (nodeType === 'supplier') return 'triangle';
  if (nodeType === 'dc') return 'square';
  return 'dot';
}

/** Reduced-supply / orphaned accents, shared by the metric tiles and lists. */
const PARTIAL_COLOR = '#EE8800';
const ORPHAN_COLOR = '#FF4444';

function typeColor(nodeType: string): string {
  if (nodeType === 'supplier') return '#FF9933';
  if (nodeType === 'dc') return '#44AADD';
  return '#FF2244';
}

const DisruptionPanelImpl: React.FC<DisruptionPanelProps> = ({
  metrics,
  visible,
  onResetAll,
}) => {
  const { slot, isNarrow } = useHudLayout();

  if (!visible) return null;

  const { disabledCount, disabledNodes, affectedRouteCount, orphanedRestaurants, partiallyServedRestaurants } =
    metrics;

  return (
    <View
      style={[
        surface.panel,
        panelStyles.container,
        isNarrow && panelStyles.containerNarrow,
        slot('top-right'),
      ]}
      testID="disruption-panel"
    >
      <ScrollView
        style={panelStyles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={panelStyles.headerRow}>
          <Text style={panelStyles.title}>Disruption Simulation</Text>
          <TouchableOpacity
            style={panelStyles.resetButton}
            onPress={onResetAll}
            activeOpacity={0.7}
          >
            <Text style={panelStyles.resetText}>Reset All</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Metrics */}
        <View style={panelStyles.metricsRow}>
          <View style={panelStyles.metricBox}>
            <Text style={panelStyles.metricValue}>{disabledCount}</Text>
            <Text style={panelStyles.metricLabel}>Disabled</Text>
          </View>
          <View style={panelStyles.metricBox}>
            <Text style={panelStyles.metricValue}>{affectedRouteCount}</Text>
            <Text style={panelStyles.metricLabel}>Routes Hit</Text>
          </View>
          <View style={panelStyles.metricBox}>
            <Text style={[panelStyles.metricValue, partiallyServedRestaurants.length > 0 && panelStyles.partialMetric]}>
              {partiallyServedRestaurants.length}
            </Text>
            <Text style={panelStyles.metricLabel}>Reduced</Text>
          </View>
          <View style={panelStyles.metricBox}>
            <Text style={[panelStyles.metricValue, orphanedRestaurants.length > 0 && panelStyles.orphanMetric]}>
              {orphanedRestaurants.length}
            </Text>
            <Text style={panelStyles.metricLabel}>Orphaned</Text>
          </View>
        </View>

        {/* Disabled Nodes List */}
        <Text style={panelStyles.sectionTitle}>Disabled Nodes</Text>
        {disabledNodes.map((node) => (
          <View key={node.id} style={panelStyles.nodeRow}>
            <ShapeCell kind={typeShape(node.type)} tint={typeColor(node.type)} />
            <Text style={panelStyles.nodeName} numberOfLines={1}>
              {node.name}
            </Text>
            <Text style={panelStyles.nodeType}>
              {node.type === 'dc' ? 'DC' : 'Supplier'}
            </Text>
          </View>
        ))}

        {/* Partially Served Restaurants */}
        <Text style={panelStyles.sectionTitle}>Reduced Supply</Text>
        {partiallyServedRestaurants.length === 0 ? (
          <Text style={panelStyles.emptyText}>No reduced-supply restaurants</Text>
        ) : (
          partiallyServedRestaurants.map((rest) => (
            <View key={rest.id} style={panelStyles.orphanRow}>
              <ShapeCell kind="dot" tint={PARTIAL_COLOR} />
              <Text style={panelStyles.partialName} numberOfLines={1}>
                {rest.name}
              </Text>
            </View>
          ))
        )}

        {/* Orphaned Restaurants */}
        <Text style={panelStyles.sectionTitle}>Orphaned Restaurants</Text>
        {orphanedRestaurants.length === 0 ? (
          <Text style={panelStyles.emptyText}>No orphaned restaurants</Text>
        ) : (
          orphanedRestaurants.map((rest) => (
            <View key={rest.id} style={panelStyles.orphanRow}>
              <ShapeCell kind="dot" tint={ORPHAN_COLOR} />
              <Text style={panelStyles.orphanName} numberOfLines={1}>
                {rest.name}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const panelStyles = StyleSheet.create({
  container: {
    width: 260,
    maxHeight: '60%',
    borderColor: color.danger,
    overflow: 'hidden',
  },
  containerNarrow: {
    width: 210,
    maxHeight: '50%',
  },
  scroll: {
    paddingHorizontal: space.md,
    paddingTop: space.md,
    // Rows carry a bottom margin; a full pad here would stack with it.
    paddingBottom: space.md - space.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm + 2,
  },
  title: {
    ...type.title,
    color: color.danger,
    flex: 1,
  },
  resetButton: {
    ...surface.button,
    borderColor: color.danger,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
  },
  resetText: {
    ...type.label,
    fontSize: 10,
    color: color.danger,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.md,
    gap: space.xs + 2,
  },
  metricBox: {
    ...surface.inset,
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  metricValue: {
    ...type.metric,
  },
  metricLabel: {
    ...type.label,
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  orphanMetric: {
    color: ORPHAN_COLOR,
  },
  partialMetric: {
    color: PARTIAL_COLOR,
  },
  sectionTitle: {
    ...type.label,
    marginBottom: space.xs + 2,
    marginTop: space.xs,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    marginBottom: space.xs,
  },
  nodeName: {
    ...type.body,
    flex: 1,
  },
  nodeType: {
    ...type.bodyDim,
    fontSize: 9,
    fontWeight: '700',
  },
  orphanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    marginBottom: 3,
  },
  orphanName: {
    ...type.body,
    flex: 1,
    color: ORPHAN_COLOR,
  },
  partialName: {
    ...type.body,
    flex: 1,
    color: PARTIAL_COLOR,
  },
  emptyText: {
    ...type.bodyDim,
    fontSize: 11,
    marginBottom: space.xs,
  },
});

/** Memoized: the HUD re-renders on unrelated state changes. */
export const DisruptionPanel = React.memo(DisruptionPanelImpl);

export default DisruptionPanel;
