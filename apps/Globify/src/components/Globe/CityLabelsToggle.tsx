/**
 * CityLabelsToggle — small toggle button to show/hide the major-city labels.
 *
 * Compact icon-only footprint (44×44), matching SpinToggle rather than
 * TruckLayerToggle's text button: it shares SpinToggle's bottom-left slot
 * (stacked above it), and that slot's width is reserved for a single
 * fixed-size icon button elsewhere in the HUD layout (GlobeHud's
 * `LEFT_RESERVED`). The icon itself — a drawn "T" — stays constant; on/off
 * is conveyed by the button's active treatment (solid accent fill, inverted
 * icon color), the same convention TruckLayerToggle uses.
 */
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { color, surface, RADIUS } from '../ui/theme';

export interface CityLabelsToggleProps {
  visible: boolean;
  onToggle: () => void;
  style?: object;
}

export const CityLabelsToggle: React.FC<CityLabelsToggleProps> = ({
  visible,
  onToggle,
  style,
}) => (
  <TouchableOpacity
    style={[surface.button, iconStyles.button, visible && surface.buttonActive, style]}
    onPress={onToggle}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={visible ? 'Hide city labels' : 'Show city labels'}
    testID="city-labels-toggle"
  >
    <View style={iconStyles.tGlyph}>
      <View
        style={[
          iconStyles.tBar,
          { backgroundColor: visible ? color.inverse : color.text },
        ]}
      />
      <View
        style={[
          iconStyles.tStem,
          { backgroundColor: visible ? color.inverse : color.text },
        ]}
      />
    </View>
  </TouchableOpacity>
);

const iconStyles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS,
  },
  tGlyph: {
    width: 16,
    height: 16,
    alignItems: 'center',
  },
  tBar: {
    width: 16,
    height: 3,
  },
  tStem: {
    width: 3,
    height: 13,
  },
});

export default CityLabelsToggle;
