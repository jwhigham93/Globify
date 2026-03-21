/**
 * TruckLayerToggle — small toggle button to show/hide the truck GPS layer.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { TRUCK_COLOR_LIVE } from './constants';

interface TruckLayerToggleProps {
  visible: boolean;
  onToggle: () => void;
  vehicleCount: number;
}

export const TruckLayerToggle: React.FC<TruckLayerToggleProps> = ({
  visible,
  onToggle,
  vehicleCount,
}) => {
  return (
    <TouchableOpacity
      style={[toggleStyles.button, visible && toggleStyles.active]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={toggleStyles.icon}>🚚</Text>
      <View>
        <Text style={toggleStyles.label}>
          {visible ? 'Hide' : 'Show'} Trucks
        </Text>
        {vehicleCount > 0 && (
          <Text style={toggleStyles.count}>{vehicleCount} active</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const toggleStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  active: {
    borderColor: TRUCK_COLOR_LIVE,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  icon: {
    fontSize: 16,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  count: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
  },
});
