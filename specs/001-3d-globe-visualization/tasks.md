# Tasks: 3D Globe Data Visualization

**Input**: Design documents from `/specs/001-3d-globe-visualization/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/webview-bridge.md, quickstart.md

**Tests**: TDD is MANDATORY per project constitution (Principle III). All tests MUST be written BEFORE implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a mobile Expo app with structure:
- `apps/Globify/src/` - Application source code
- `apps/Globify/src/components/Globe/` - Globe component and tests
- `apps/Globify/src/services/` - Data services
- `apps/Globify/assets/` - Static assets (globe.html)
- `apps/Globify-e2e/src/` - E2E tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and WebView-based globe visualization foundation

- [X] T001 Install react-native-webview dependency: `npm install react-native-webview --save`
- [X] T002 [P] Create Globe component directory structure: `apps/Globify/src/components/Globe/`
- [X] T003 [P] Create types file: `apps/Globify/src/components/Globe/types.ts` (copy interfaces from data-model.md)
- [X] T004 [P] Create sample data service: `apps/Globify/src/services/sampleData.ts` (10 city data points from data-model.md)
- [X] T005 Verify project compiles and linter passes: `npx nx lint Globify && npx nx typecheck Globify`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: WebView infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create WebView HTML asset: `apps/Globify/assets/globe.html` (implement react-globe.gl basic example from research.md findings)
- [X] T007 Add globe.html to Expo asset configuration in `apps/Globify/app.json` (ensure asset bundling)
- [X] T008 Create WebView bridge message handler utilities: `apps/Globify/src/components/Globe/bridgeUtils.ts` (type guards from data-model.md)
- [X] T009 Verify WebView HTML loads standalone in browser (test CDN loading of react-globe.gl)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Interactive 3D Globe (Priority: P1) 🎯 MVP

**Goal**: Users can open the app and see an interactive 3D globe with touch gestures (rotate, zoom, pan)

**Independent Test**: Launch app on iOS/Android/web, verify globe renders centered, swipe to rotate works, pinch to zoom works, momentum physics visible

### Tests for User Story 1 (TDD - Write FIRST) ⚠️

> **CRITICAL: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T010 [P] [US1] Unit test for GlobeVisualization component rendering: `apps/Globify/src/components/Globe/GlobeVisualization.spec.tsx` (test: renders WebView with correct source URI)
- [X] T011 [P] [US1] Unit test for WebView message parsing: `apps/Globify/src/components/Globe/GlobeVisualization.spec.tsx` (test: onMessage handler parses READY message)
- [X] T012 [P] [US1] Unit test for WebView bridge utils: `apps/Globify/src/components/Globe/bridgeUtils.spec.ts` (test: type guards validate message format)
- [X] T013 [P] [US1] Component test for App integration: `apps/Globify/src/app/App.spec.tsx` (test: App renders GlobeVisualization component)
- [X] T014 [US1] E2E test for globe rendering: `apps/Globify-e2e/src/globe-rendering.spec.ts` (test: globe visible on page load within 3 seconds)
- [X] T015 [US1] Run all User Story 1 tests and verify they FAIL: `npx nx test Globify --testPathPattern=Globe`

### Implementation for User Story 1

- [X] T016 [US1] Implement GlobeVisualization component: `apps/Globify/src/components/Globe/GlobeVisualization.tsx` (WebView wrapper with props from data-model.md)
- [X] T017 [US1] Implement WebView message handler in GlobeVisualization: handle READY, STATE_UPDATE, ERROR messages per contracts/webview-bridge.md
- [X] T018 [US1] Add error handling for WebGL initialization failures: display user-friendly error message (FR-008)
- [X] T019 [US1] Replace App.tsx boilerplate with GlobeVisualization: `apps/Globify/src/app/App.tsx` (remove welcome screen, add globe)
- [X] T020 [US1] Configure WebView to use globe.html asset: set source prop to bundled asset URI (web: inline HTML, native: file path)
- [X] T021 [US1] Add globe background color configuration: default to black (#000000) per research.md
- [ ] T022 [US1] Run User Story 1 tests and verify they PASS: `npx nx test Globify --testPathPattern=Globe`
- [X] T023 [US1] Manual test on web: `npx nx serve Globify` - verify globe renders and responds to mouse drag
- [ ] T024 [US1] Manual test on iOS simulator: `npx nx run Globify:serve --platform=ios` - verify touch gestures work
- [ ] T025 [US1] Manual test on Android emulator: `npx nx run Globify:serve --platform=android` - verify touch gestures work

**Checkpoint**: At this point, User Story 1 should be fully functional - globe renders and is interactive on all platforms

---

## Phase 4: User Story 2 - Display Sample Data Points (Priority: P2)

**Goal**: Sample data points appear on globe surface at geographic coordinates

**Independent Test**: Launch app, verify 10 city data points visible on globe, rotate globe to verify points stay fixed to coordinates

### Tests for User Story 2 (TDD - Write FIRST) ⚠️

- [ ] T026 [P] [US2] Unit test for sample data validation: `apps/Globify/src/services/sampleData.spec.ts` (test: all data points have valid lat/lng ranges)
- [ ] T027 [P] [US2] Unit test for UPDATE_DATA message injection: `apps/Globify/src/components/Globe/GlobeVisualization.spec.tsx` (test: injectJavaScript called when dataPoints prop changes)
- [ ] T028 [US2] E2E test for data points rendering: `apps/Globify-e2e/src/globe-data-points.spec.ts` (test: 10 points visible on globe after load)
- [ ] T029 [US2] Integration test for data point rotation persistence: `apps/Globify-e2e/src/globe-data-points.spec.ts` (test: rotate globe, verify points move with surface)
- [ ] T030 [US2] Run all User Story 2 tests and verify they FAIL: `npx nx test Globify --testPathPattern=sampleData`

### Implementation for User Story 2

- [ ] T031 [US2] Implement UPDATE_DATA message sending: `apps/Globify/src/components/Globe/GlobeVisualization.tsx` (useEffect to send data on mount and prop change)
- [ ] T032 [US2] Add dataPoints prop to GlobeVisualization component: TypeScript interface from data-model.md
- [ ] T033 [US2] Update globe.html to handle UPDATE_DATA message: `apps/Globify/assets/globe.html` (call globe.pointsData() per contracts/webview-bridge.md)
- [ ] T034 [US2] Configure data point styling in globe.html: orange color, 0.5 radius, 0.01 altitude per research.md
- [ ] T035 [US2] Pass SAMPLE_DATA_POINTS to GlobeVisualization in App.tsx: import from services/sampleData.ts
- [ ] T036 [US2] Add data point validation error handling: log invalid points, render valid ones (per contracts error handling)
- [ ] T037 [US2] Run User Story 2 tests and verify they PASS: `npx nx test Globify --testPathPattern=sampleData`
- [ ] T038 [US2] Manual test: verify 10 cities visible on globe (New York, London, Tokyo, etc.)
- [ ] T039 [US2] Manual test: zoom in to verify data points scale appropriately

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - globe with visible data points

---

## Phase 5: User Story 3 - Smooth Performance Across Platforms (Priority: P3)

**Goal**: Globe maintains 60 FPS on iOS/Android/web during interactions

**Independent Test**: Run FPS measurement on each platform during rotation/zoom, verify ≥50 FPS on mid-range devices

### Tests for User Story 3 (TDD - Write FIRST) ⚠️

- [ ] T040 [P] [US3] E2E performance test on web: `apps/Globify-e2e/src/globe-performance.spec.ts` (test: measure JS FPS during rotation)
- [ ] T041 [P] [US3] E2E test for gesture responsiveness: `apps/Globify-e2e/src/globe-performance.spec.ts` (test: swipe gesture triggers rotation within 100ms)
- [ ] T042 [US3] Cross-platform rendering test: `apps/Globify-e2e/src/globe-performance.spec.ts` (test: globe renders without crashes on all platforms)
- [ ] T043 [US3] Run all User Story 3 tests and verify they FAIL: `npx nx e2e Globify-e2e --spec=globe-performance.spec.ts`

### Implementation for User Story 3

- [ ] T044 [US3] Optimize globe texture size: verify globe.html uses 2048x2048 texture per research.md performance guidelines
- [ ] T045 [US3] Add FPS monitoring to globe.html: console.log FPS every second for debugging (can be removed later)
- [ ] T046 [US3] Test performance on iOS simulator: verify 60 FPS using Xcode Performance Monitor
- [ ] T047 [US3] Test performance on Android emulator: verify 60 FPS using React Native Performance Monitor
- [ ] T048 [US3] Test performance on web: verify 60 FPS using Chrome DevTools Performance tab
- [ ] T049 [US3] Optimize WebView settings: enable hardware acceleration if needed (check react-native-webview docs)
- [ ] T050 [US3] Add requestAnimationFrame throttling if performance issues detected
- [ ] T051 [US3] Run User Story 3 tests and verify they PASS: `npx nx e2e Globify-e2e --spec=globe-performance.spec.ts`
- [ ] T052 [US3] Document performance results in quickstart.md: record FPS on each platform

**Checkpoint**: All user stories should now be independently functional with validated performance

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T053 [P] Add TSDoc comments to all exported functions/components: `apps/Globify/src/components/Globe/*.ts(x)`
- [ ] T054 [P] Add error boundary around GlobeVisualization: `apps/Globify/src/app/App.tsx` (graceful degradation if globe crashes)
- [ ] T055 [P] Add loading indicator while WebView initializes: show spinner until READY message received
- [ ] T056 [P] Implement app lifecycle handling: save/restore rotation state on background/resume per contracts (optional for MVP)
- [ ] T057 [P] Add POINT_CLICKED message handling: `apps/Globify/src/components/Globe/GlobeVisualization.tsx` (prepare for future interactions)
- [ ] T058 Code cleanup: remove console.logs, FPS monitoring code, debug comments
- [ ] T059 Run full test suite: `npx nx test Globify && npx nx e2e Globify-e2e`
- [ ] T060 Run linter and fix issues: `npx nx lint Globify --fix`
- [ ] T061 Run type check: `npx nx typecheck Globify`
- [ ] T062 Verify quickstart.md instructions work: follow all steps on fresh clone
- [ ] T063 Update README.md with feature description and screenshots
- [ ] T064 Create demo video or GIF of globe interaction for documentation
- [ ] T065 Run CI pipeline locally to verify all checks pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Independent after Foundational
  - User Story 2 (P2): Independent after Foundational (but builds on US1)
  - User Story 3 (P3): Independent after Foundational (validates US1 & US2)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Tests performance of US1 & US2

### Within Each User Story

**TDD Workflow (MANDATORY per constitution)**:
1. Tests FIRST - write all tests for the story
2. Verify tests FAIL - proves tests are actually testing something
3. Implementation - write minimal code to make tests pass
4. Verify tests PASS - proves implementation is correct
5. Manual testing - verify on real devices
6. Refactor - improve code quality while keeping tests passing

### Parallel Opportunities

**Setup Phase (Phase 1)**:
- T002, T003, T004 can run in parallel (different files)

**Foundational Phase (Phase 2)**:
- T006, T007, T008 can be worked on by different people (but T009 depends on T006)

**User Story 1 Tests**:
- T010, T011, T012, T013 can run in parallel (different test files)

**User Story 2 Tests**:
- T026, T027 can run in parallel (different test files)

**User Story 3 Tests**:
- T040, T041 can run in parallel (same file but different test cases)

**Polish Phase**:
- T053, T054, T055, T056, T057 can run in parallel (different files/concerns)

---

## Parallel Example: User Story 1

```bash
# Write all tests in parallel (different developers):
Developer A: T010 - GlobeVisualization rendering test
Developer B: T011 - WebView message parsing test
Developer C: T012 - Bridge utils test
Developer D: T013 - App integration test

# Then verify all fail together:
T015 - Run all tests (should all fail - RED phase)

# Then implement sequentially (dependencies):
T016 - Implement component (GREEN phase for T010, T011)
T017 - Implement message handler (GREEN phase for T011)
T018 - Implement error handling (GREEN phase for edge cases)
T019 - Update App.tsx (GREEN phase for T013)
...
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005) - ~30 minutes
2. Complete Phase 2: Foundational (T006-T009) - ~2 hours
3. Complete Phase 3: User Story 1 (T010-T025) - ~4 hours
   - Tests first (T010-T015): 1 hour
   - Implementation (T016-T022): 2 hours
   - Manual testing (T023-T025): 1 hour
4. **STOP and VALIDATE**: Test on all platforms, verify globe renders and is interactive
5. **Deploy/Demo Ready**: MVP complete - basic globe visualization working

**Estimated MVP Time**: 6.5 hours total

### Incremental Delivery

1. **Day 1**: Setup + Foundational → Foundation ready
2. **Day 2**: User Story 1 → Test independently → **Deploy MVP** 🎯
3. **Day 3**: User Story 2 → Test independently → Deploy with data points
4. **Day 4**: User Story 3 → Validate performance → Deploy production-ready
5. **Day 5**: Polish → Code cleanup, documentation → Deploy polished version

### Parallel Team Strategy

With 3 developers:

1. **Together**: Complete Setup + Foundational (Phase 1 & 2)
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 (T010-T025) - Core globe
   - **Developer B**: User Story 2 (T026-T039) - Data points
   - **Developer C**: User Story 3 (T040-T052) - Performance
3. **Integration**: Each dev tests their story independently, then integrate
4. **Together**: Polish phase (T053-T065)

**Parallel Delivery Time**: ~2-3 days vs 5 days sequential

---

## Test Coverage Requirements

Per project constitution, minimum 80% code coverage is required. Focus on:

**Critical Coverage Areas**:
- GlobeVisualization component (100% - core feature)
- WebView bridge message handling (100% - protocol compliance)
- Type guards and validators (100% - data integrity)
- Sample data service (100% - data correctness)
- App.tsx integration (80%+ - main entry point)

**E2E Coverage**:
- Globe rendering on all platforms (web, iOS, Android)
- Touch gesture interactions (rotate, zoom, pan)
- Data point visualization
- Performance metrics (FPS)
- Error scenarios (WebGL failure)

---

## Notes

- **[P] tasks** = different files, no dependencies, can parallelize
- **[Story] label** maps task to specific user story for traceability
- **TDD is MANDATORY**: Constitution Principle III requires tests before implementation
- **Each user story should be independently completable and testable**
- **Verify tests FAIL before implementing** (Red phase of TDD)
- **Commit after each task or logical group** (e.g., after T015, after T022, etc.)
- **Stop at any checkpoint to validate story independently**
- **WebView architecture decision** from research.md: simplifies integration, enables copying basic example
- **Constitution exception for react-globe.gl** is documented in plan.md

---

## Success Criteria Validation

After completing all phases, verify these success criteria from spec.md:

- [ ] **SC-001**: App launches and globe renders within 3 seconds (measure on standard devices)
- [ ] **SC-002**: Globe maintains ≥50 FPS during interactions (measure with performance tools)
- [ ] **SC-003**: 95% user success rate for rotate/zoom (user testing or analytics)
- [ ] **SC-004**: No crashes on iOS 15+, Android 10+, modern web browsers (test on each platform)
- [ ] **SC-005**: Sample data points clearly visible at default zoom (visual inspection)

---

**Total Tasks**: 65
**Test Tasks**: 16 (TDD compliance)
**Implementation Tasks**: 49

**Task Breakdown by User Story**:
- Setup: 5 tasks
- Foundational: 4 tasks (BLOCKS all stories)
- User Story 1 (P1 - MVP): 16 tasks (6 tests + 10 implementation)
- User Story 2 (P2): 14 tasks (5 tests + 9 implementation)
- User Story 3 (P3): 13 tasks (4 tests + 9 implementation)
- Polish: 13 tasks

**Parallel Opportunities**: 15 tasks marked [P] can run in parallel
**MVP Scope**: Phases 1-3 only (25 tasks, ~6.5 hours)
**Full Feature**: All phases (65 tasks, ~5 days sequential, ~2-3 days parallel)
