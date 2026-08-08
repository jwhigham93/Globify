/**
 * Drawn marker shapes for the HUD.
 *
 * These replace the ▲ ■ ● ◆ ━ ╌ glyphs the panels used to render. Symbol
 * characters fall back to a different font on each platform, so their size and
 * baseline never matched the label text beside them — and on iOS several have
 * emoji presentation, which shifts them further. Views have no such problem.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';

export type ShapeKind =
  | 'triangle'
  | 'square'
  | 'dot'
  | 'diamond'
  | 'bar'
  | 'dashed'
  | 'arrowRight'
  | 'arrowLeft';

/** Width of the column a shape occupies, so rows stay aligned. */
export const SHAPE_CELL = 14;

export interface ShapeProps {
  kind: ShapeKind;
  tint: string;
}

export const Shape: React.FC<ShapeProps> = ({ kind, tint }) => {
  switch (kind) {
    case 'triangle':
      return <View style={[s.triangle, { borderBottomColor: tint }]} />;
    case 'square':
      return <View style={[s.square, { backgroundColor: tint }]} />;
    case 'dot':
      return <View style={[s.dot, { backgroundColor: tint }]} />;
    case 'diamond':
      return <View style={[s.diamond, { backgroundColor: tint }]} />;
    case 'bar':
      return <View style={[s.bar, { backgroundColor: tint }]} />;
    case 'dashed':
      return (
        <View style={s.dashedWrap}>
          <View style={[s.dash, { backgroundColor: tint }]} />
          <View style={[s.dash, { backgroundColor: tint }]} />
        </View>
      );
    case 'arrowRight':
      return <View style={[s.arrowRight, { borderLeftColor: tint }]} />;
    case 'arrowLeft':
      return <View style={[s.arrowLeft, { borderRightColor: tint }]} />;
  }
};

/** A fixed-width cell that keeps shapes and labels on a common grid. */
export const ShapeCell: React.FC<ShapeProps> = (props) => (
  <View style={s.cell}>
    <Shape {...props} />
  </View>
);

const s = StyleSheet.create({
  cell: {
    width: SHAPE_CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  square: { width: 10, height: 10 },
  dot: { width: 8, height: 8 },
  diamond: { width: 8, height: 8, transform: [{ rotate: '45deg' }] },
  bar: { width: SHAPE_CELL, height: 3 },
  dashedWrap: { flexDirection: 'row', gap: 3 },
  dash: { width: 5, height: 3 },
  arrowRight: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  arrowLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderRightWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});

export default Shape;
