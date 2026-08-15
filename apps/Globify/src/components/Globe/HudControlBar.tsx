/**
 * HudControlBar — bottom-right row holding the truck-layer and view-mode
 * toggles. Owns the row layout only; its position comes from a HUD slot.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HUD } from '../ui/layout';
import { TruckLayerToggle } from './TruckLayerToggle';
import { ViewModeToggle } from './ViewModeToggle';
import type { ViewMode } from './types';

export interface HudControlBarProps {
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  showTrucks: boolean;
  onToggleTrucks: () => void;
  vehicleCount: number;
  style?: object;
}

export const HudControlBar: React.FC<HudControlBarProps> = ({
  viewMode,
  onToggleViewMode,
  showTrucks,
  onToggleTrucks,
  vehicleCount,
  style,
}) => (
  <View style={[barStyles.row, style]} testID="hud-control-bar">
    <TruckLayerToggle
      visible={showTrucks}
      onToggle={onToggleTrucks}
      vehicleCount={vehicleCount}
    />
    <ViewModeToggle viewMode={viewMode} onToggle={onToggleViewMode} />
  </View>
);

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: HUD.gap,
  },
});

export default HudControlBar;
