/**
 * FailureBanner — surfaces backend query failures across the top of the HUD.
 *
 * Rendered above every other overlay; `useHudLayout` shifts top-anchored panels
 * down by `HUD.bannerHeight` while this is visible so they never overlap.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, border, space, type, RADIUS } from '../ui/theme';

export interface FailureBannerProps {
  /** Human-readable names of the queries that failed. */
  failures: string[];
  style?: object;
}

export const FailureBanner: React.FC<FailureBannerProps> = ({
  failures,
  style,
}) => {
  if (failures.length === 0) return null;

  return (
    <View style={[bannerStyles.wrap, style]} pointerEvents="none">
      {/* testID on the visible block so layout assertions measure the banner,
          not the full-width container that centers it. */}
      <View style={bannerStyles.block} testID="failure-banner">
        <Text style={bannerStyles.text}>
          Failed to load {failures.join(', ')}
        </Text>
      </View>
    </View>
  );
};

const bannerStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  block: {
    backgroundColor: color.surface,
    borderWidth: border.thick,
    borderColor: color.danger,
    borderRadius: RADIUS,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  text: {
    ...type.body,
    color: color.danger,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default FailureBanner;
