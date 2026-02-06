## Why

Supply chain volumes aren't static — they fluctuate by week, season, and in response to events like new restaurant openings or menu changes. Currently, Globify shows a single snapshot of volume data with no temporal dimension. Animating volume over time would reveal demand patterns, seasonal peaks, and growth trends that are invisible in a static view.

## What Changes

- Add a time scrubber control allowing users to move through weekly volume data
- Arc thickness animates smoothly as the scrubber moves, reflecting volume changes per period
- Support play/pause auto-advance through the timeline at configurable speed
- Highlight volume spikes and drops with color intensity changes (brighter = above average, dimmer = below)
- Show a volume trend mini-chart for the currently selected route or node
- Support mock time-series data spanning 12+ months with seasonal patterns

## Capabilities

### New Capabilities
- `time-series-volume-data`: Time-indexed volume data model with weekly granularity and mock data generation including seasonal patterns
- `timeline-animation`: Time scrubber UI control with play/pause, speed adjustment, and smooth arc thickness/color interpolation driven by temporal volume data

### Modified Capabilities
- `supply-chain-arcs`: Extend arc rendering to accept time-varying volume data and interpolate stroke width and color intensity per frame

## Impact

- `apps/Globify/src/components/Globe/types.ts`: Add TimeSeriesVolume interface, extend SupplyRoute with temporal data
- `apps/Globify/src/services/`: New time-series data module with mock seasonal volume generation
- `apps/Globify/src/components/Globe/GlobeScene.tsx`: Dynamic arc data updates driven by timeline state
- New timeline UI component (scrubber, play/pause, speed controls)
- State management for current time position and animation playback
