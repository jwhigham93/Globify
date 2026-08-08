/**
 * Slot-math tests for the HUD layout system.
 *
 * These encode the rules that stop overlays from landing on each other:
 * insets fold into every edge, the failure banner pushes top-anchored panels
 * down, and the narrow-screen sheet floats above the control bar.
 */
import { computeSlotStyle, HUD, Z, NARROW_BREAKPOINT } from './layout';
import type { SlotContext } from './layout';
import { ZERO_INSETS } from './useSafeAreaInsets';

const WIDE: SlotContext = {
  isNarrow: false,
  insets: ZERO_INSETS,
  bannerVisible: false,
  sheetOpen: false,
};

const NOTCHED: SlotContext = {
  ...WIDE,
  isNarrow: true,
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

describe('computeSlotStyle', () => {
  it('uses the wide gutter above the breakpoint and the narrow one below', () => {
    expect(computeSlotStyle('top-left', {}, WIDE)).toMatchObject({
      top: HUD.gutterWide,
      left: HUD.gutterWide,
    });
    expect(
      computeSlotStyle('top-left', {}, { ...WIDE, isNarrow: true }),
    ).toMatchObject({ top: HUD.gutterNarrow, left: HUD.gutterNarrow });
  });

  it('folds safe-area insets into every edge', () => {
    expect(computeSlotStyle('top-right', {}, NOTCHED)).toMatchObject({
      top: 47 + HUD.gutterNarrow,
      right: HUD.gutterNarrow,
    });
    expect(computeSlotStyle('bottom-left', {}, NOTCHED)).toMatchObject({
      bottom: 34 + HUD.gutterNarrow,
      left: HUD.gutterNarrow,
    });
  });

  it('pushes top-anchored slots below the failure banner', () => {
    const withBanner = { ...WIDE, bannerVisible: true };
    const shift = HUD.bannerHeight + HUD.gap;

    for (const slot of ['top-left', 'top-right', 'top-center'] as const) {
      expect(computeSlotStyle(slot, {}, withBanner)).toMatchObject({
        top: HUD.gutterWide + shift,
      });
    }
  });

  it('does not push the banner below itself', () => {
    expect(
      computeSlotStyle(
        'top-center',
        { ignoreBanner: true },
        { ...WIDE, bannerVisible: true },
      ),
    ).toMatchObject({ top: HUD.gutterWide });
  });

  it('leaves bottom-anchored slots alone when the banner shows', () => {
    expect(
      computeSlotStyle('bottom-right', {}, { ...WIDE, bannerVisible: true }),
    ).toMatchObject({ bottom: HUD.gutterWide });
  });

  it('stacks overlays above the control bar via stackAbove', () => {
    const stack = HUD.barHeight + HUD.gap;
    expect(
      computeSlotStyle('bottom-right', { stackAbove: stack }, WIDE),
    ).toMatchObject({ bottom: HUD.gutterWide + stack });
  });

  it('floats the narrow sheet clear of the control bar', () => {
    const sheet = computeSlotStyle('sheet', {}, NOTCHED);
    const bar = computeSlotStyle('bottom-right', {}, NOTCHED);

    expect(sheet.bottom).toBe(
      34 + HUD.gutterNarrow + HUD.barHeight + HUD.gap,
    );
    // The sheet must start above the bar's top edge, not overlap it.
    expect(sheet.bottom as number).toBeGreaterThanOrEqual(
      (bar.bottom as number) + HUD.barHeight,
    );
  });

  it('spans the full width for centered slots', () => {
    expect(computeSlotStyle('bottom-center', {}, WIDE)).toMatchObject({
      left: HUD.gutterWide,
      right: HUD.gutterWide,
      alignItems: 'center',
    });
  });

  it('applies the requested stacking layer', () => {
    expect(
      computeSlotStyle('bottom-left', { layer: 'bar' }, WIDE).zIndex,
    ).toBe(Z.bar);
    // Panels sit above the legend and hints, below the banner.
    expect(Z.panel).toBeGreaterThan(Z.legend);
    expect(Z.panel).toBeGreaterThan(Z.hint);
    expect(Z.banner).toBeGreaterThan(Z.panel);
  });

  it('always positions absolutely', () => {
    const slots = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'sheet',
    ] as const;
    for (const slot of slots) {
      expect(computeSlotStyle(slot, {}, WIDE).position).toBe('absolute');
    }
  });

  it('exposes a single breakpoint for every panel', () => {
    expect(NARROW_BREAKPOINT).toBe(600);
  });
});
