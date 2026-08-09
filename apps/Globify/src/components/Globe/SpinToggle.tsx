/**
 * SpinToggle — pauses/resumes the star field rotation.
 *
 * The icons are drawn with Views rather than the '⏸' / '▶' glyphs this used to
 * render. Those characters have emoji presentation by default, so on iOS they
 * resolved to Apple Color Emoji, whose ascent and descent differ from the
 * system font — the hand-tuned `marginTop: -5` that centered the pause bar on
 * desktop pushed it visibly high on iPhone. Two Views have no font metrics to
 * disagree about, so flex centering is exact on every platform.
 */
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { color, surface, RADIUS } from '../ui/theme';

export interface SpinToggleProps {
  isSpinning: boolean;
  onToggle: () => void;
  style?: object;
}

export const SpinToggle: React.FC<SpinToggleProps> = ({
  isSpinning,
  onToggle,
  style,
}) => (
  <TouchableOpacity
    style={[surface.button, iconStyles.button, style]}
    onPress={onToggle}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={
      isSpinning ? 'Pause star rotation' : 'Resume star rotation'
    }
    testID="spin-toggle"
  >
    {isSpinning ? (
      <View style={iconStyles.pause}>
        <View style={iconStyles.pauseBar} />
        <View style={iconStyles.pauseBar} />
      </View>
    ) : (
      <View style={iconStyles.play} />
    )}
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
  pause: {
    flexDirection: 'row',
    gap: 4,
  },
  pauseBar: {
    width: 4,
    height: 16,
    backgroundColor: color.text,
  },
  play: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: color.text,
    // A triangle's visual centroid sits left of its bounding box, so flex
    // centering reads as slightly-left. This nudge is geometric, not a font
    // workaround, and is stable across platforms.
    marginLeft: 3,
  },
});


export default SpinToggle;
