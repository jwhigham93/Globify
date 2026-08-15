/**
 * GlobeHud — every overlay that floats above the globe canvas.
 *
 * Lives below `HudContext.Provider` so it can read the banner/sheet state that
 * `GlobeVisualization` publishes; slot positions therefore account for the
 * failure banner's height and for the narrow-screen detail sheet.
 *
 * The bottom-right overlays (hints, legend, control bar) are a single flex
 * column rather than independently positioned boxes. Absolute offsets tuned per
 * overlay is exactly how they ended up stacked on the same pixels before —
 * inside one column, flexbox makes overlap impossible at any viewport width.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useHudLayout, useIsTouch, HUD } from '../ui/layout';
import { color } from '../ui/theme';
import { SpinToggle } from './SpinToggle';
import { CityLabelsToggle } from './CityLabelsToggle';
import { HintPill } from './HintPill';
import { FailureBanner } from './FailureBanner';
import { HudControlBar } from './HudControlBar';
import { LegendPanel } from './LegendPanel';
import { RiskPanel } from './RiskPanel';
import { DisruptionPanel } from './DisruptionPanel';
import { EntityDetailPanel } from './EntityDetailPanel';
import { TruckDetailPanel } from './TruckDetailPanel';
import type {
  ViewMode,
  SelectedEntity,
  NetworkRiskMetrics,
  DisruptionMetrics,
} from './types';
import type { VehiclePosition } from '../../services/useVehiclePositions';

/** Room reserved on the left for the spin toggle, so the column can't reach it. */
const LEFT_RESERVED = 44;

export interface GlobeHudProps {
  viewMode: ViewMode;
  onToggleViewMode: () => void;

  isStarsSpinning: boolean;
  onToggleStarsSpinning: () => void;

  showTrucks: boolean;
  onToggleTrucks: () => void;
  vehicleCount: number;

  showCityLabels: boolean;
  onToggleCityLabels: () => void;

  /** Names of backend queries that failed; drives the top banner. */
  failedQueries: string[];
  /** Disruption mode is on and no node has been disabled yet. */
  showDisruptionHint: boolean;
  /** Camera is far enough out that the controls hint is still useful. */
  showControlsHint: boolean;

  networkRiskMetrics: NetworkRiskMetrics;
  riskPanelVisible: boolean;
  disruptionMetrics: DisruptionMetrics;
  disruptionPanelVisible: boolean;
  onResetDisruptions: () => void;

  activeEntity: SelectedEntity | null;
  onCloseEntity: () => void;
  onZoomToExpand: () => void;

  selectedTruck: VehiclePosition | null;
  onCloseTruck: () => void;
}

export const GlobeHud: React.FC<GlobeHudProps> = ({
  viewMode,
  onToggleViewMode,
  isStarsSpinning,
  onToggleStarsSpinning,
  showTrucks,
  onToggleTrucks,
  vehicleCount,
  showCityLabels,
  onToggleCityLabels,
  failedQueries,
  showDisruptionHint,
  showControlsHint,
  networkRiskMetrics,
  riskPanelVisible,
  disruptionMetrics,
  disruptionPanelVisible,
  onResetDisruptions,
  activeEntity,
  onCloseEntity,
  onZoomToExpand,
  selectedTruck,
  onCloseTruck,
}) => {
  const { slot, isNarrow, sheetOpen, gutter, width, insets } = useHudLayout();
  const isTouch = useIsTouch();

  // Hard ceiling so the column can never grow left into the spin toggle.
  const columnMaxWidth = Math.max(
    160,
    width - insets.left - insets.right - gutter * 2 - LEFT_RESERVED - HUD.gap,
  );

  // On a narrow screen the detail sheet fills the bottom of the HUD, so the
  // ambient overlays that live there step aside rather than stack on top of it.
  const bottomFree = !(isNarrow && sheetOpen);

  return (
    <>
      <CityLabelsToggle
        visible={showCityLabels}
        onToggle={onToggleCityLabels}
        style={slot('bottom-left', { layer: 'bar', stackAbove: HUD.barHeight + HUD.gap })}
      />
      <SpinToggle
        isSpinning={isStarsSpinning}
        onToggle={onToggleStarsSpinning}
        style={slot('bottom-left', { layer: 'bar' })}
      />

      {/* Bottom-right column: hints → legend → control bar, bottom-anchored. */}
      <View
        style={[
          slot('bottom-right', { layer: 'bar' }),
          hudStyles.column,
          { maxWidth: columnMaxWidth },
        ]}
        pointerEvents="box-none"
        testID="hud-stack"
      >
        {showDisruptionHint && bottomFree && (
          <HintPill accent={color.accent} testID="disruption-hint">
            {isTouch ? 'Tap' : 'Click'} a supplier or DC to simulate a disruption
          </HintPill>
        )}

        {showControlsHint && bottomFree && (
          <HintPill variant="bare" testID="controls-hint">
            {isTouch
              ? 'Pinch to zoom · Swipe to rotate · Tap to inspect'
              : 'Scroll to zoom · Drag to rotate · Click to inspect'}
          </HintPill>
        )}

        {bottomFree && <LegendPanel viewMode={viewMode} />}

        <HudControlBar
          viewMode={viewMode}
          onToggleViewMode={onToggleViewMode}
          showTrucks={showTrucks}
          onToggleTrucks={onToggleTrucks}
          vehicleCount={vehicleCount}
        />
      </View>

      <FailureBanner
        failures={failedQueries}
        style={slot('top-center', { layer: 'banner', ignoreBanner: true })}
      />

      {/* Risk summary panel — only rendered from a successful query, so loading
          and failure states never appear as zeroed metrics */}
      <RiskPanel metrics={networkRiskMetrics} visible={riskPanelVisible} />

      {/* Disruption impact panel — only rendered from a successful simulation */}
      <DisruptionPanel
        metrics={disruptionMetrics}
        visible={disruptionPanelVisible}
        onResetAll={onResetDisruptions}
      />

      <EntityDetailPanel
        entity={activeEntity}
        onClose={onCloseEntity}
        onZoomToExpand={onZoomToExpand}
      />

      <TruckDetailPanel vehicle={selectedTruck} onClose={onCloseTruck} />
    </>
  );
};

const hudStyles = StyleSheet.create({
  column: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: HUD.gap,
  },
});

export default GlobeHud;
