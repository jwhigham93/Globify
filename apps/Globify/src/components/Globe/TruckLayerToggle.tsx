/**
 * TruckLayerToggle — small toggle button to show/hide the truck GPS layer.
 *
 * The 🚚 emoji is replaced with a drawn swatch: emoji render in a different
 * font with different metrics on every platform, which misaligns the row.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { color, surface, type, space } from '../ui/theme';
import { HUD } from '../ui/layout';

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
      style={[
        surface.button,
        toggleStyles.button,
        visible && surface.buttonActive,
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
      testID="truck-layer-toggle"
    >
      <View
        style={[
          toggleStyles.swatch,
          { backgroundColor: visible ? color.inverse : color.gps.live },
        ]}
      />
      <View>
        <Text style={visible ? type.buttonActiveLabel : type.button}>
          {visible ? 'Hide' : 'Show'} Trucks
        </Text>
        {vehicleCount > 0 && (
          <Text
            style={[
              toggleStyles.count,
              visible && { color: color.inverse },
            ]}
          >
            {vehicleCount} active
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const toggleStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: HUD.barHeight,
  },
  swatch: {
    width: 10,
    height: 8,
  },
  count: {
    ...type.bodyDim,
    fontSize: 9,
    marginTop: 1,
  },
});
