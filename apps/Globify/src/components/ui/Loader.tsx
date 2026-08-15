/**
 * Loader — brutalist busy indicator.
 *
 * Replaces RN's `ActivityIndicator`, whose spinner is an inherently circular
 * platform widget and can't be squared off. This is a row of blocks that cycle
 * instead: same read at a glance, no curves, and identical on every platform.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, space, type } from './theme';

export interface LoaderProps {
  /** Optional caption rendered under the blocks. */
  label?: string;
  size?: 'small' | 'large';
  testID?: string;
}

const BLOCKS = 4;
const STEP_MS = 140;

export const Loader: React.FC<LoaderProps> = ({
  label,
  size = 'large',
  testID = 'loader',
}) => {
  const [active, setActive] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      frame.current = (frame.current + 1) % BLOCKS;
      setActive(frame.current);
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  const dim = size === 'large' ? 14 : 9;
  const gap = size === 'large' ? 6 : 4;

  return (
    <View style={s.wrap} testID={testID} accessibilityRole="progressbar">
      <View style={[s.row, { gap }]}>
        {Array.from({ length: BLOCKS }, (_, i) => (
          <View
            key={i}
            testID="loader-block"
            style={{
              width: dim,
              height: dim,
              backgroundColor: i === active ? color.accent : color.lineDim,
            }}
          />
        ))}
      </View>
      {label ? <Text style={s.label}>{label}</Text> : null}
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    ...type.label,
    marginTop: space.md,
    textAlign: 'center',
  },
});

export default Loader;
