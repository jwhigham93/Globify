/**
 * View Mode Toggle Component
 *
 * Provides a button to cycle between standard, concentration risk,
 * and disruption simulation view modes.
 *
 * Active modes render as a solid inverted block rather than a translucent tint,
 * and the ⚠/⚡ glyphs are gone — the uppercase label plus the fill carries the
 * state without depending on per-platform emoji metrics.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { color, surface, type } from '../ui/theme';
import { HUD } from '../ui/layout';
import type { ViewMode } from './types';

export interface ViewModeToggleProps {
  viewMode: ViewMode;
  onToggle: () => void;
}

function getModeLabel(mode: ViewMode): string {
  switch (mode) {
    case 'concentration-risk':
      return 'Risk View';
    case 'disruption':
      return 'Disruption';
    default:
      return 'Standard';
  }
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ viewMode, onToggle }) => {
  const isActive = viewMode !== 'standard';
  const isDisruption = viewMode === 'disruption';
  const fill = isDisruption ? color.danger : color.warn;

  return (
    <TouchableOpacity
      style={[
        surface.button,
        toggleStyles.button,
        isActive && { backgroundColor: fill, borderColor: fill },
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
      testID="view-mode-toggle"
    >
      <Text style={isActive ? type.buttonActiveLabel : type.button}>
        {getModeLabel(viewMode)}
      </Text>
    </TouchableOpacity>
  );
};

const toggleStyles = StyleSheet.create({
  button: {
    minHeight: HUD.barHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


export default ViewModeToggle;
