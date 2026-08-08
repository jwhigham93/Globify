/**
 * Legend Panel Component
 *
 * Always-visible compact legend showing location type shapes and colors.
 * Expands to show risk color gradient when in concentration-risk view mode.
 *
 * The ▲ ■ ● ◆ ━ ╌ glyphs are drawn as Views: symbol characters fall back to
 * different fonts per platform, so their size and baseline never matched the
 * label text they sat beside.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, border, space, type, surface } from '../ui/theme';
import { ShapeCell } from '../ui/Shape';
import type { ShapeKind } from '../ui/Shape';
import type { ViewMode } from './types';

export interface LegendPanelProps {
  viewMode: ViewMode;
}

const LegendRow: React.FC<{ kind: ShapeKind; tint: string; label: string }> = ({
  kind,
  tint,
  label,
}) => (
  <View style={legendStyles.row}>
    <ShapeCell kind={kind} tint={tint} />
    <Text style={legendStyles.label}>{label}</Text>
  </View>
);

export const LegendPanel: React.FC<LegendPanelProps> = ({ viewMode }) => {
  const isRiskMode = viewMode === 'concentration-risk';
  const isDisruptionMode = viewMode === 'disruption';

  // Shape colors change per mode to match on-globe appearance
  const supplierColor = isDisruptionMode ? color.risk.low : '#FF9933';
  const dcColor = isDisruptionMode ? color.risk.low : '#003e5f';
  const restaurantColor = isDisruptionMode ? color.risk.low : '#FF2244';

  return (
    <View
      style={[surface.panel, legendStyles.container]}
      testID="legend-panel"
    >
      <Text style={legendStyles.title}>Legend</Text>

      {/* Location type shapes */}
      <LegendRow kind="triangle" tint={supplierColor} label="Supplier" />
      <LegendRow kind="square" tint={dcColor} label="Dist. Center" />
      <LegendRow kind="dot" tint={restaurantColor} label="Restaurant" />

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
          <LegendRow kind="diamond" tint={color.risk.low} label="Healthy" />
          <LegendRow kind="square" tint={color.risk.high} label="Disabled" />
          <LegendRow kind="dot" tint="#EE8800" label="Reduced Supply" />
          <LegendRow kind="bar" tint={color.risk.high} label="Broken Route" />
          <LegendRow kind="dashed" tint="#EE8800" label="Degraded Route" />
          <LegendRow kind="dot" tint="#FF4444" label="Orphaned" />
        </>
      )}
    </View>
  );
};

const legendStyles = StyleSheet.create({
  container: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  title: {
    ...type.label,
    marginBottom: space.xs + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: 3,
  },
  label: {
    ...type.body,
    color: color.textDim,
  },
  divider: {
    ...surface.divider,
    marginVertical: space.xs + 2,
  },
  subtitle: {
    ...type.label,
    marginBottom: space.xs,
  },
  gradientRow: {
    flexDirection: 'row',
    height: 8,
    borderWidth: border.hair,
    borderColor: color.lineDim,
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
    ...type.label,
    letterSpacing: 0,
  },
});

export default LegendPanel;
