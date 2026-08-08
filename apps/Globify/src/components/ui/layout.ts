/**
 * HUD layout system for the globe overlays.
 *
 * Every floating overlay is a sibling of the `<Canvas>`, so before this module
 * each one carried its own absolute offsets and its own copy of the narrow
 * breakpoint. That is how the legend, the control bar, and the narrow detail
 * sheet ended up stacked on the same pixels.
 *
 * Here instead: one breakpoint, one set of named anchor slots, and one place
 * where safe-area insets and the failure banner's height get folded into the
 * offsets. Panels declare *which* slot they live in and nothing else.
 */
import { createContext, useContext, useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets, ZERO_INSETS } from './useSafeAreaInsets';
import type { Insets } from './useSafeAreaInsets';

/** Below this width the HUD switches to its stacked/sheet arrangement. */
export const NARROW_BREAKPOINT = 600;

export const HUD = {
  gutterWide: 20,
  gutterNarrow: 10,
  gap: 8,
  /** Height of the bottom-right control bar; things stack above it. */
  barHeight: 44,
  /** Height of the top failure banner; top-anchored panels shift below it. */
  bannerHeight: 34,
} as const;

/** Stacking order. Overlays are siblings, so paint order alone is not enough. */
export const Z = {
  hint: 1,
  legend: 2,
  bar: 3,
  panel: 4,
  banner: 5,
  loading: 10,
} as const;

export type Slot =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  /** Narrow-screen detail panel: full-width, floating above the control bar. */
  | 'sheet';

export interface SlotOptions {
  /** Extra bottom offset, for overlays that stack above another one. */
  stackAbove?: number;
  /** Stacking layer; defaults to `panel`. */
  layer?: keyof typeof Z;
  /** Set on the banner itself so it does not offset below its own height. */
  ignoreBanner?: boolean;
}

export interface HudState {
  /** A backend-failure banner is showing across the top. */
  bannerVisible: boolean;
  /** A detail panel is open. On narrow screens it occupies the whole bottom. */
  sheetOpen: boolean;
}

const DEFAULT_HUD_STATE: HudState = { bannerVisible: false, sheetOpen: false };

export const HudContext = createContext<HudState>(DEFAULT_HUD_STATE);

export interface SlotContext extends HudState {
  isNarrow: boolean;
  insets: Insets;
}

/**
 * Absolute positioning for a named slot. Pure — the hook below just supplies
 * the context, which keeps this directly testable.
 */
export function computeSlotStyle(
  slot: Slot,
  options: SlotOptions,
  ctx: SlotContext,
): ViewStyle {
  const { isNarrow, insets, bannerVisible } = ctx;
  const { stackAbove = 0, layer = 'panel', ignoreBanner = false } = options;

  const gutter = isNarrow ? HUD.gutterNarrow : HUD.gutterWide;
  const bannerOffset =
    bannerVisible && !ignoreBanner ? HUD.bannerHeight + HUD.gap : 0;

  const top = insets.top + gutter + bannerOffset;
  const bottom = insets.bottom + gutter + stackAbove;
  const left = insets.left + gutter;
  const right = insets.right + gutter;

  const base: ViewStyle = { position: 'absolute', zIndex: Z[layer] };

  switch (slot) {
    case 'top-left':
      return { ...base, top, left };
    case 'top-right':
      return { ...base, top, right };
    case 'top-center':
      return { ...base, top, left, right, alignItems: 'center' };
    case 'bottom-left':
      return { ...base, bottom, left };
    case 'bottom-right':
      return { ...base, bottom, right };
    case 'bottom-center':
      return { ...base, bottom, left, right, alignItems: 'center' };
    case 'sheet':
      // Floats above the control bar so the toggles stay tappable underneath.
      return {
        ...base,
        bottom: insets.bottom + gutter + HUD.barHeight + HUD.gap + stackAbove,
        left,
        right,
      };
  }
}

export interface HudLayout extends SlotContext {
  /** Current window width in px. */
  width: number;
  gutter: number;
  slot: (slot: Slot, options?: SlotOptions) => ViewStyle;
}

/** Slot positioning bound to the current window size, insets, and HUD state. */
export function useHudLayout(): HudLayout {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { bannerVisible, sheetOpen } = useContext(HudContext);

  const isNarrow = width < NARROW_BREAKPOINT;

  return useMemo(() => {
    const ctx: SlotContext = { isNarrow, insets, bannerVisible, sheetOpen };
    return {
      ...ctx,
      width,
      gutter: isNarrow ? HUD.gutterNarrow : HUD.gutterWide,
      slot: (slot: Slot, options: SlotOptions = {}) =>
        computeSlotStyle(slot, options, ctx),
    };
  }, [width, isNarrow, insets, bannerVisible, sheetOpen]);
}

/**
 * Whether the device takes touch input.
 *
 * `Platform.OS !== 'web'` is false in mobile Safari, so it cannot be used to
 * decide between "tap" and "click" copy for phone browser users.
 */
export function useIsTouch(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof navigator === 'undefined') return false;
  return navigator.maxTouchPoints > 0;
}

export { ZERO_INSETS };
export type { Insets };
