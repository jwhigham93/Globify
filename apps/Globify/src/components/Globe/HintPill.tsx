/**
 * HintPill — non-interactive instructional text floating over the globe.
 *
 * Two variants: a bordered block ('block') for the disruption-mode instruction,
 * and bare text ('bare') for the camera-controls hint.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, border, space, font, type, RADIUS } from '../ui/theme';

export interface HintPillProps {
  variant?: 'block' | 'bare';
  /** Border/text accent for the block variant. Defaults to the accent color. */
  accent?: string;
  style?: object;
  testID?: string;
  children: React.ReactNode;
}

export const HintPill: React.FC<HintPillProps> = ({
  variant = 'block',
  accent = color.accent,
  style,
  testID,
  children,
}) => {
  if (variant === 'bare') {
    return (
      <View style={[hintStyles.wrap, style]} pointerEvents="none">
        {/* testID sits on the text, not the wrapper, so layout assertions
            measure the visible bounds rather than a full-width container. */}
        <Text style={hintStyles.bareText} testID={testID}>
          {children}
        </Text>
      </View>
    );
  }

  return (
    <View style={[hintStyles.wrap, style]} pointerEvents="none">
      <View style={[hintStyles.block, { borderColor: accent }]} testID={testID}>
        <Text style={hintStyles.blockText}>{children}</Text>
      </View>
    </View>
  );
};

const hintStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  block: {
    backgroundColor: color.surface,
    borderWidth: border.hair,
    borderRadius: RADIUS,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  blockText: {
    ...type.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  bareText: {
    fontFamily: font.mono,
    fontSize: font.size.small,
    letterSpacing: font.tracking.label,
    color: color.textFaint,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

export default HintPill;
