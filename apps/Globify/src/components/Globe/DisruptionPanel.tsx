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
import type { DisruptionMetrics } from './types';

export interface DisruptionPanelProps {
  metrics: DisruptionMetrics;
  visible: boolean;
  onResetAll: () => void;
}

/**
 * Type icon for disabled nodes
 */
function typeIcon(type: string): string {
  if (type === 'supplier') return '▲';
  if (type === 'dc') return '■';
  return '●';
}

function typeColor(type: string): string {
  if (type === 'supplier') return '#CC7722';
  if (type === 'dc') return '#00A3FF';
  return '#E60E33';
}

export const DisruptionPanel: React.FC<DisruptionPanelProps> = ({
  metrics,
  visible,
  onResetAll,
}) => {
  if (!visible) return null;

  const { disabledCount, disabledNodes, affectedRouteCount, orphanedRestaurants, partiallyServedRestaurants } =
    metrics;

  return (
    <View style={panelStyles.container}>
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
            <Text style={[panelStyles.nodeIcon, { color: typeColor(node.type) }]}>
              {typeIcon(node.type)}
            </Text>
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
              <Text style={panelStyles.partialDot}>●</Text>
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
              <Text style={panelStyles.orphanDot}>●</Text>
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
    position: 'absolute',
    top: 20,
    right: 20,
    width: 260,
    maxHeight: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(204, 34, 34, 0.3)',
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#CC2222',
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(204, 34, 34, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(204, 34, 34, 0.4)',
  },
  resetText: {
    color: '#CC2222',
    fontSize: 10,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 6,
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
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  orphanMetric: {
    color: '#FF4444',
  },
  partialMetric: {
    color: '#EE8800',
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  nodeIcon: {
    fontSize: 10,
    width: 14,
    textAlign: 'center',
  },
  nodeName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
  },
  nodeType: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 9,
    fontWeight: '600',
  },
  orphanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  orphanDot: {
    color: '#FF4444',
    fontSize: 8,
    width: 14,
    textAlign: 'center',
  },
  orphanName: {
    flex: 1,
    color: '#FF4444',
    fontSize: 11,
  },
  partialDot: {
    color: '#EE8800',
    fontSize: 8,
    width: 14,
    textAlign: 'center',
  },
  partialName: {
    flex: 1,
    color: '#EE8800',
    fontSize: 11,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
  },
});

export default DisruptionPanel;
