/**
 * CloseButton — square dismiss control with a drawn X.
 *
 * Drawn rather than rendered from '✕' so it centers identically on every
 * platform regardless of which font ends up supplying the glyph.
 */
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { color, border, RADIUS } from './theme';

export interface CloseButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export const CloseButton: React.FC<CloseButtonProps> = ({
  onPress,
  accessibilityLabel = 'Close',
  testID = 'close-button',
}) => (
  <TouchableOpacity
    style={s.button}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    testID={testID}
  >
    <View style={s.iconBox}>
      <View style={[s.stroke, s.strokeA]} />
      <View style={[s.stroke, s.strokeB]} />
    </View>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  button: {
    width: 26,
    height: 26,
    borderWidth: border.hair,
    borderColor: color.lineDim,
    borderRadius: RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconBox: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stroke: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: color.text,
  },
  strokeA: { transform: [{ rotate: '45deg' }] },
  strokeB: { transform: [{ rotate: '-45deg' }] },
});

export default CloseButton;
