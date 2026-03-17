## 1. Constants & Types — ✅ DONE

- [x] 1.1 Add truck marker constants to `constants.ts` — `TRUCK_MARKER_RADIUS = 0.15`, `TRUCK_MARKER_HEIGHT = 0.5`, `TRUCK_MARKER_SEGMENTS = 3`, `TRUCK_ALTITUDE = 0.015`
- [x] 1.2 Add truck color constants — `TRUCK_COLOR_LIVE = '#33CC66'`, `TRUCK_COLOR_STALE = '#EE8800'`, `TRUCK_COLOR_LOST = '#CC2222'`
- [x] 1.3 Add truck visibility threshold — `TRUCK_VISIBLE_MAX_DISTANCE = 150`, `TRUCK_PULSE_SPEED = 2`, `TRUCK_PULSE_MIN = 1.0`, `TRUCK_PULSE_MAX = 1.3`. Also added stale pulse (0.8 Hz, 1.0–1.5), lost blink (3 Hz, 0.6–1.6), and `TRUCK_LOST_SIZE_BOOST = 1.25`
- [x] 1.4 Define `TruckMarkerData` type — uses `PositionUpdate` interface in `gpsStreamService.ts` with vehicleId, lat, lng, heading, speedMph, gpsStatus, vehicleName, originName, destinationName, routeStartedAt

## 2. Truck Visuals Service — ✅ DONE

- [x] 2.1 Create `apps/Globify/src/services/truckVisuals.ts` — `createTruckMarker(data: TruckMarkerData): THREE.Mesh` using ExtrudeGeometry arrow shape, oriented by heading
- [x] 2.2 Implement `getTruckColor(gpsStatus)` — returns color constant based on live/stale/lost status
- [x] 2.3 Implement `updateTruckMarkerStatus(mesh, gpsStatus)` — updates material (color + emissive) based on status
- [x] 2.4 Implement `computePulseScale(status, elapsedSec)` — live: smooth sine pulse, stale: slow throb (0.8 Hz), lost: rapid triangle wave blink (3 Hz). Enhanced emissive intensities: stale 0.9, lost 1.0

## 3. Globe Scene Truck Layer — ✅ DONE

- [x] 3.1 In `GlobeScene.tsx`, add truck layer using three-globe's `customLayerData` API — pass truck marker data array
- [x] 3.2 Implement `customThreeObject` callback to create truck arrow markers via `createTruckMarker`
- [x] 3.3 Implement `customThreeObjectUpdate` callback to update position (interpolated), heading, and color on each data change
- [x] 3.4 In `useFrame` loop, update truck positions via interpolation (lerp from previous to current position)
- [x] 3.5 In `useFrame` loop, run pulse/blink animation for all truck statuses (live, stale, lost) with `TRUCK_LOST_SIZE_BOOST` applied to lost trucks
- [x] 3.6 In `useFrame` loop, toggle truck layer visibility based on camera distance (visible < 150, hidden >= 150)

## 4. Route Polyline — ✅ DONE

- [x] 4.1 When a truck is selected, fetch its active route via `GET /vehicles/{id}/route` (API mode) or resolve origin/destination by name from local data (dev mode). `HandleGetVehicleRoute` enhanced to JOIN locations and return `originLat/Lng`, `destinationLat/Lng`.
- [x] 4.2 Render route as two path segments using three-globe's `pathsData` API — completed segment (origin → truck, dimmed 35% green, 0.6 stroke) and remaining segment (truck → destination, bright 85% green, 1.0 stroke) with animated dashes
- [x] 4.3 Clear route path when truck is deselected — `routeEndpoints` state resets to null, `routePathData` becomes empty array, `pathsData([])` clears the globe layer

## 5. Truck Detail Panel — ✅ DONE

- [x] 5.1 Create `apps/Globify/src/components/Globe/TruckDetailPanel.tsx` — panel component with vehicle name, trip status badge (colored pill with icon: 🟢 En Route, 🟡 Slow Traffic, ⏸ Stopped, ⚠️ Signal Delay, 🔴 Signal Lost)
- [x] 5.2 Add GPS info section — current speed (mph), heading (degrees), last ping time, lat/lng coordinates
- [x] 5.3 Add route info section — origin → destination with visual connector dots/line, travel time (computed from `routeStartedAt`)
- [x] 5.4 Trip status computed from GPS status + speed via `computeTripStatus()` in `truckStatus.ts` — 5 states: en-route, slow-traffic, stopped, signal-delay, signal-lost
- [x] 5.5 Signal delay/lost reflected in trip status badge color (amber/red) — replaces separate warning banners
- [x] 5.6 Style panel: top-left, 270px wide, semi-transparent dark bg, compact 11px font sizes, dividers between sections

## 6. Truck Layer Toggle & Count Badge — ✅ DONE

- [x] 6.1 Create `apps/Globify/src/components/Globe/TruckLayerToggle.tsx` — button component that toggles `isTruckLayerVisible` state
- [x] 6.2 Add active truck count badge — display "N trucks" (count of vehicles) next to toggle when visible
- [x] 6.3 Hide badge when truck layer is toggled off

## 7. GlobeVisualization Integration — ✅ DONE

- [x] 7.1 In `GlobeVisualization.tsx`, add `useVehiclePositions()` hook call
- [x] 7.2 Add `isTruckLayerVisible` state (default: true) and `selectedTruckId` state
- [x] 7.3 Pass truck data, visibility, and selection handler to `GlobeScene`
- [x] 7.4 Render `TruckDetailPanel` when a truck is selected
- [x] 7.5 Render `TruckLayerToggle` in the overlay controls area
- [x] 7.6 Handle truck click — set/clear selectedTruckId, toggle panel. Added truck isolation: when truck selected, all data points and arcs dim to `SELECTION_DIM_NODE_COLOR`/`SELECTION_DIM_ARC_COLOR`. Background click clears both entity and truck selection.

## 8. Click Handling — ✅ DONE

- [x] 8.1 Add truck marker click detection — raycaster checks truck markers before location markers (trucks at higher altitude)
- [x] 8.2 On truck click: open detail panel, isolate view (dim all points/arcs), highlight marker
- [x] 8.3 On re-click same truck: close panel, restore view, clear highlight. Mutual exclusion: truck click closes entity panel, entity click closes truck panel.

## 9. Verify

- [x] 9.1 Run `nx run Globify:lint` — 0 errors, 101 warnings (all pre-existing)
- [x] 9.2 Run `nx run Globify:test` — 24 suites, 328 tests, all passing
- [ ] 9.3 Manually verify: truck markers appear on globe with correct colors (green/orange/red)
- [ ] 9.4 Manually verify: truck markers move smoothly between GPS updates
- [ ] 9.5 Manually verify: clicking a truck shows detail panel and isolates view
- [ ] 9.6 Manually verify: stale truck markers throb slowly, lost trucks blink rapidly with size boost
- [ ] 9.7 Manually verify: truck layer toggle hides/shows all truck markers
- [ ] 9.8 Manually verify: trucks disappear when zoomed out past distance 150
