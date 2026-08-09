/**
 * Brutalist UI tokens for the globe HUD.
 *
 * The look: zero corner radius, hard high-contrast borders, monospace
 * uppercase labels, and solid inverted blocks for active states.
 *
 * Fills stay translucent. Squaring everything off *and* making it opaque turned
 * each panel into a black slab pasted over the globe; the corners in particular
 * read as unexplained boxes. The square corners and hard borders carry the
 * style on their own.
 *
 * Two rules that are load-bearing elsewhere:
 *  - Uppercasing is done with `textTransform`, never by uppercasing source
 *    strings. On react-native-web that compiles to CSS and the DOM text node
 *    keeps its original casing, so `getByText('Risk View')` keeps working.
 *  - Icons are drawn with Views, not glyphs. Emoji and symbol glyphs resolve to
 *    different fonts per platform with different metrics, which is what pushed
 *    the old pause icon off-center on iOS.
 */
import { Platform, StyleSheet } from 'react-native';
import {
  RISK_COLOR_LOW,
  RISK_COLOR_MEDIUM,
  RISK_COLOR_HIGH,
  TRUCK_COLOR_LIVE,
  TRUCK_COLOR_STALE,
  TRUCK_COLOR_LOST,
} from '../Globe/constants';

/** Brutalism has no rounded corners. Exported so the intent stays greppable. */
export const RADIUS = 0 as const;

export const color = {
  bg: '#000000',
  // Fills are translucent on purpose. Fully opaque panels read as black slabs
  // pasted over the scene — the globe and stars should still show through.
  // Brutalism here comes from the square corners and hard borders, not from
  // blocking out what is behind.
  surface: 'rgba(6, 6, 6, 0.74)',
  surfaceAlt: 'rgba(30, 30, 30, 0.6)',
  /** Opaque variant, for the full-screen loading cover. */
  surfaceSolid: '#0A0A0A',
  /** Fill for inactive buttons. */
  buttonFill: 'rgba(0, 0, 0, 0.6)',

  line: '#FFFFFF',
  lineDim: '#4A4A4A',

  text: '#FFFFFF',
  textDim: '#9A9A9A',
  textFaint: '#5E5E5E',

  accent: '#00FF66',
  warn: '#FFB300',
  danger: '#FF2D2D',
  /** Text/graphics drawn on top of an `accent` fill. */
  inverse: '#000000',

  risk: {
    low: RISK_COLOR_LOW,
    med: RISK_COLOR_MEDIUM,
    high: RISK_COLOR_HIGH,
  },
  gps: {
    live: TRUCK_COLOR_LIVE,
    stale: TRUCK_COLOR_STALE,
    lost: TRUCK_COLOR_LOST,
  },
} as const;

export const border = { hair: 1, thick: 2 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const font = {
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  }) as string,
  size: {
    micro: 9,
    tiny: 10,
    small: 11,
    body: 12,
    label: 13,
    title: 14,
    metric: 20,
    hero: 32,
  },
  tracking: { label: 1.2, wide: 2 },
} as const;

export const type = StyleSheet.create({
  /** Section headers and field labels. */
  label: {
    fontFamily: font.mono,
    fontSize: font.size.micro,
    fontWeight: '700',
    letterSpacing: font.tracking.wide,
    textTransform: 'uppercase',
    color: color.textDim,
  },
  /** Panel titles. */
  title: {
    fontFamily: font.mono,
    fontSize: font.size.title,
    fontWeight: '700',
    letterSpacing: font.tracking.label,
    textTransform: 'uppercase',
    color: color.text,
  },
  body: {
    fontFamily: font.mono,
    fontSize: font.size.small,
    color: color.text,
  },
  bodyDim: {
    fontFamily: font.mono,
    fontSize: font.size.tiny,
    color: color.textDim,
  },
  /** Right-hand side of a label/value row. */
  value: {
    fontFamily: font.mono,
    fontSize: font.size.small,
    fontWeight: '700',
    color: color.text,
  },
  metric: {
    fontFamily: font.mono,
    fontSize: font.size.metric,
    fontWeight: '700',
    color: color.text,
    textAlign: 'center',
  },
  hero: {
    fontFamily: font.mono,
    fontSize: font.size.hero,
    fontWeight: '700',
    color: color.text,
  },
  button: {
    fontFamily: font.mono,
    fontSize: font.size.body,
    fontWeight: '700',
    letterSpacing: font.tracking.label,
    textTransform: 'uppercase',
    color: color.text,
  },
  /** Pairs with `surface.buttonActive` — dark text on the solid accent block. */
  buttonActiveLabel: {
    fontFamily: font.mono,
    fontSize: font.size.body,
    fontWeight: '700',
    letterSpacing: font.tracking.label,
    textTransform: 'uppercase',
    color: color.inverse,
  },
});

export const surface = StyleSheet.create({
  /** Outer chrome for every floating panel. */
  panel: {
    backgroundColor: color.surface,
    borderWidth: border.thick,
    borderColor: color.line,
    borderRadius: RADIUS,
  },
  /** Inset wells: metric boxes, bar tracks, badges. */
  inset: {
    backgroundColor: color.surfaceAlt,
    borderWidth: border.hair,
    borderColor: color.lineDim,
    borderRadius: RADIUS,
  },
  button: {
    backgroundColor: color.buttonFill,
    borderWidth: border.hair,
    borderColor: color.line,
    borderRadius: RADIUS,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  /** Active state is a solid inverted block, never a translucent tint. */
  buttonActive: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  divider: {
    height: border.hair,
    backgroundColor: color.lineDim,
  },
});
