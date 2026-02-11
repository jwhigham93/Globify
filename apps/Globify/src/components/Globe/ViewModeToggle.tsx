/**
 * View Mode Toggle Component
 *
 * Provides a button to cycle between standard, concentration risk,
 * and disruption simulation view modes.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
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

function getModeIcon(mode: ViewMode): string {
  switch (mode) {
    case 'concentration-risk':
      return '⚠';
    case 'disruption':
      return '⚡';
    default:
      return '⚠';
  }
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ viewMode, onToggle }) => {
  const isActive = viewMode !== 'standard';
  const isDisruption = viewMode === 'disruption';

  return (
    <TouchableOpacity
      style={[
        toggleStyles.button,
        isActive && !isDisruption && toggleStyles.activeButton,
        isDisruption && toggleStyles.disruptionButton,
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
      testID="view-mode-toggle"
    >
      <Text style={toggleStyles.icon}>{getModeIcon(viewMode)}</Text>
      <Text style={[
        toggleStyles.label,
        isActive && !isDisruption && toggleStyles.activeLabel,
        isDisruption && toggleStyles.disruptionLabel,
      ]}>
        {getModeLabel(viewMode)}
      </Text>
    </TouchableOpacity>
  );
};

const toggleStyles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 6,
  },
  activeButton: {
    backgroundColor: 'rgba(204, 0, 0, 0.3)',
    borderColor: 'rgba(204, 0, 0, 0.6)',
  },
  disruptionButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    borderColor: 'rgba(255, 68, 68, 0.6)',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  activeLabel: {
    color: '#ff6666',
  },
  disruptionLabel: {
    color: '#FF4444',
  },
});

export default ViewModeToggle;
