/**
 * Tests for the HUD overlay arrangement.
 *
 * The collision fix is structural: the bottom-right overlays are children of a
 * single flex column rather than independently positioned boxes, and the
 * ambient ones stand down when the narrow-screen detail sheet is open. These
 * tests pin both properties — the E2E `overlay-layout.spec.ts` then checks the
 * rendered geometry in a real browser.
 */

import React from 'react';
import * as RN from 'react-native';
import { render } from '@testing-library/react-native';
import { GlobeHud } from './GlobeHud';
import type { GlobeHudProps } from './GlobeHud';
import { HudContext } from '../ui/layout';
import type { HudState } from '../ui/layout';
import type { VehiclePosition } from '@jw-dev/globify-services';

jest.mock('../../hooks/queries/useSupplyChainData', () => ({
  useSupplyChainData: () => ({ locationsById: new Map() }),
}));

// react-native re-exports useWindowDimensions through a getter, so it can't be
// spied on via the module object — mock the module it delegates to instead.
let mockWidth = 1200;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 800, scale: 2, fontScale: 1 }),
}));

const EMPTY_RISK = {
  networkDiversificationScore: 0,
  hhi: 0,
  supplierRisks: [],
  dcDiversification: [],
  restaurantRisks: [],
};

const EMPTY_DISRUPTION = {
  disabledCount: 0,
  disabledNodes: [],
  affectedRouteCount: 0,
  orphanedRestaurants: [],
  partiallyServedRestaurants: [],
};

const VEHICLE: VehiclePosition = {
  vehicleId: 'v-1',
  vehicleName: 'Truck 1',
  lat: 39,
  lng: -94,
  recordedAt: new Date('2026-01-01T12:00:00Z').toISOString(),
  gpsStatus: 'live',
  updatedAt: Date.now(),
} as VehiclePosition;

function baseProps(overrides: Partial<GlobeHudProps> = {}): GlobeHudProps {
  return {
    viewMode: 'standard',
    onToggleViewMode: jest.fn(),
    isStarsSpinning: true,
    onToggleStarsSpinning: jest.fn(),
    showTrucks: false,
    onToggleTrucks: jest.fn(),
    vehicleCount: 0,
    failedQueries: [],
    showDisruptionHint: false,
    showControlsHint: true,
    networkRiskMetrics: EMPTY_RISK,
    riskPanelVisible: false,
    disruptionMetrics: EMPTY_DISRUPTION,
    disruptionPanelVisible: false,
    onResetDisruptions: jest.fn(),
    activeEntity: null,
    onCloseEntity: jest.fn(),
    onZoomToExpand: jest.fn(),
    selectedTruck: null,
    onCloseTruck: jest.fn(),
    ...overrides,
  };
}

function setWidth(width: number): void {
  mockWidth = width;
}

function renderHud(
  props: Partial<GlobeHudProps> = {},
  hud: Partial<HudState> = {},
) {
  const state: HudState = { bannerVisible: false, sheetOpen: false, ...hud };
  return render(
    <HudContext.Provider value={state}>
      <GlobeHud {...baseProps(props)} />
    </HudContext.Provider>,
  );
}

/** Walk up from a node looking for the bottom-right stack container. */
function isInsideStack(node: RN.View | null): boolean {
  let current = node as unknown as { parent: unknown; props?: { testID?: string } } | null;
  while (current) {
    if (current.props?.testID === 'hud-stack') return true;
    current = current.parent as typeof current;
  }
  return false;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GlobeHud', () => {
  describe('wide layout', () => {
    beforeEach(() => setWidth(1200));

    it('renders the ambient bottom overlays inside one stack', () => {
      const { getByTestId } = renderHud({ showDisruptionHint: true });

      // Everything that used to be positioned independently at the bottom
      // right now shares a single flex column, so overlap is impossible.
      for (const id of ['disruption-hint', 'controls-hint', 'legend-panel', 'hud-control-bar']) {
        expect(isInsideStack(getByTestId(id))).toBe(true);
      }
    });

    it('keeps the spin toggle out of the stack', () => {
      const { getByTestId } = renderHud();
      expect(isInsideStack(getByTestId('spin-toggle'))).toBe(false);
    });

    it('keeps ambient overlays when a detail panel is open', () => {
      // There is room beside a top-left panel on a wide viewport.
      const { queryByTestId } = renderHud(
        { selectedTruck: VEHICLE },
        { sheetOpen: true },
      );
      expect(queryByTestId('legend-panel')).not.toBeNull();
      expect(queryByTestId('truck-detail-panel')).not.toBeNull();
    });
  });

  describe('narrow layout', () => {
    beforeEach(() => setWidth(390));

    it('yields the bottom strip to the detail sheet', () => {
      const { queryByTestId } = renderHud(
        { selectedTruck: VEHICLE, showDisruptionHint: true },
        { sheetOpen: true },
      );

      // The sheet occupies the bottom; legend and hints stand down rather than
      // stacking on top of it — the reported collision.
      expect(queryByTestId('legend-panel')).toBeNull();
      expect(queryByTestId('controls-hint')).toBeNull();
      expect(queryByTestId('disruption-hint')).toBeNull();

      // The control bar stays reachable underneath the sheet.
      expect(queryByTestId('hud-control-bar')).not.toBeNull();
      expect(queryByTestId('truck-detail-panel')).not.toBeNull();
    });

    it('restores the ambient overlays once the sheet closes', () => {
      const { queryByTestId } = renderHud({ showDisruptionHint: true });
      expect(queryByTestId('legend-panel')).not.toBeNull();
      expect(queryByTestId('disruption-hint')).not.toBeNull();
    });

    it('caps the stack width so it cannot reach the spin toggle', () => {
      const { getByTestId } = renderHud();
      const maxWidth = RN.StyleSheet.flatten(
        getByTestId('hud-stack').props.style,
      )?.maxWidth as number;

      // 390 - 2*10 gutter - 44 spin toggle - 8 gap
      expect(maxWidth).toBeLessThanOrEqual(390 - 20 - 44 - 8);
      expect(maxWidth).toBeGreaterThan(0);
    });
  });

  it('shows the failure banner only when a query failed', () => {
    setWidth(1200);
    expect(renderHud().queryByTestId('failure-banner')).toBeNull();
    expect(
      renderHud({ failedQueries: ['risk metrics'] }, { bannerVisible: true })
        .queryByTestId('failure-banner'),
    ).not.toBeNull();
  });
});
