/**
 * Legend Panel Component
 *
 * Always-visible compact legend showing location type shapes and colors.
 * Expands to show risk color gradient when in concentration-risk view mode.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ViewMode } from './types';

export interface LegendPanelProps {
  viewMode: ViewMode;
}

export const LegendPanel: React.FC<LegendPanelProps> = ({ viewMode }) => {
  const isRiskMode = viewMode === 'concentration-risk';
  const isDisruptionMode = viewMode === 'disruption';

  // Shape icon colors change per mode to match on-globe appearance
  const supplierColor = isDisruptionMode ? '#22AA44' : '#FF9933';
  const dcColor = isDisruptionMode ? '#22AA44' : '#003e5f';
  const restaurantColor = isDisruptionMode ? '#22AA44' : '#FF2244';

  return (
    <View style={legendStyles.container}>
      <Text style={legendStyles.title}>Legend</Text>

      {/* Location type shapes */}
      <View style={legendStyles.row}>
        <Text style={[legendStyles.shapeIcon, { color: supplierColor }]}>▲</Text>
        <Text style={legendStyles.label}>Supplier</Text>
      </View>
      <View style={legendStyles.row}>
        <Text style={[legendStyles.shapeIcon, { color: dcColor }]}>■</Text>
        <Text style={legendStyles.label}>Dist. Center</Text>
      </View>
      <View style={legendStyles.row}>
        <Text style={[legendStyles.shapeIcon, { color: restaurantColor }]}>●</Text>
        <Text style={legendStyles.label}>Restaurant</Text>
      </View>

      {/* Risk color gradient - only shown in risk mode */}
      {isRiskMode && (
        <>
          <View style={legendStyles.divider} />
          <Text style={legendStyles.subtitle}>Risk Level</Text>
          <View style={legendStyles.gradientRow}>
            <View style={[legendStyles.gradientBlock, { backgroundColor: '#00CC00' }]} />
            <View style={[legendStyles.gradientBlock, { backgroundColor: '#66CC00' }]} />
            <View style={[legendStyles.gradientBlock, { backgroundColor: '#CCCC00' }]} />
            <View style={[legendStyles.gradientBlock, { backgroundColor: '#CC6600' }]} />
            <View style={[legendStyles.gradientBlock, { backgroundColor: '#CC0000' }]} />
          </View>
          <View style={legendStyles.gradientLabels}>
            <Text style={legendStyles.gradientLabel}>Low</Text>
            <Text style={legendStyles.gradientLabel}>Med</Text>
            <Text style={legendStyles.gradientLabel}>High</Text>
          </View>
        </>
      )}

      {/* Disruption mode legend */}
      {isDisruptionMode && (
        <>
          <View style={legendStyles.divider} />
          <Text style={legendStyles.subtitle}>Disruption</Text>
          <View style={legendStyles.row}>
            <Text style={[legendStyles.shapeIcon, { color: '#22AA44' }]}>◆</Text>
            <Text style={legendStyles.label}>Healthy</Text>
          </View>
          <View style={legendStyles.row}>
            <Text style={[legendStyles.shapeIcon, { color: '#CC2222' }]}>◼</Text>
            <Text style={legendStyles.label}>Disabled</Text>
          </View>
          <View style={legendStyles.row}>
            <Text style={[legendStyles.shapeIcon, { color: '#EE8800' }]}>●</Text>
            <Text style={legendStyles.label}>Reduced Supply</Text>
          </View>
          <View style={legendStyles.row}>
            <Text style={[legendStyles.shapeIcon, { color: '#CC2222' }]}>━</Text>
            <Text style={legendStyles.label}>Broken Route</Text>
          </View>
          <View style={legendStyles.row}>
            <Text style={[legendStyles.shapeIcon, { color: '#EE8800' }]}>╌</Text>
            <Text style={legendStyles.label}>Degraded Route</Text>
          </View>
          <View style={legendStyles.row}>
            <Text style={[legendStyles.shapeIcon, { color: '#FF4444' }]}>●</Text>
            <Text style={legendStyles.label}>Orphaned</Text>
          </View>
        </>
      )}
    </View>
  );
};

const legendStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 74,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  shapeIcon: {
    fontSize: 12,
    width: 14,
    textAlign: 'center',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 6,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  gradientRow: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradientBlock: {
    flex: 1,
  },
  gradientLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  gradientLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
  },
});

export default LegendPanel;
