import { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

const TRACK_WIDTH = 200;
const HOURS_IN_DAY = 24;
const THUMB_SIZE = 16;

/**
 * Continuous time-of-day slider — a plain draggable `View` thumb over a
 * `View` track, not `@react-native-community/slider`. The reference
 * example uses a live `<input type="range" min="0" max="24" step="0.01">`
 * (see AtmosphereCloudsLayer.tsx's header comment for the full reference
 * source); this component matches that live-drag behavior (calling
 * `onHourChange` continuously while dragging, not just on release) while
 * staying a pure React Native primitive — no new native-module dependency,
 * after this session already spent real effort tracing one new-dependency
 * bug (zustand/import.meta, see tasks.md task 2.3) through to a fix.
 *
 * Track width is a fixed constant rather than measured via `onLayout`,
 * matching this app's "plain/unstyled for now" precedent elsewhere
 * (MissingCesiumTokenNotice, AtmosphereCloudsControls) pending task 8's
 * real HUD chrome.
 */
export function TimeOfDaySlider({
  hour,
  onHourChange,
}: {
  hour: number;
  onHourChange: (hour: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const trackPageX = useRef(0);

  const hourFromPageX = (pageX: number): number => {
    const relativeX = pageX - trackPageX.current;
    const clampedX = Math.max(0, Math.min(TRACK_WIDTH, relativeX));
    // No snapping/rounding — the reference's own slider is step="0.01"
    // (effectively continuous). An earlier version snapped to the nearest
    // 15 minutes, which — reported live — made lighting transitions look
    // like discrete steps rather than the reference's smooth fade; raw
    // pixel-resolution granularity here (200px track / 24h ≈ 8px/hour) is
    // already far finer than that snap was.
    return (clampedX / TRACK_WIDTH) * HOURS_IN_DAY;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => onHourChange(hourFromPageX(event.nativeEvent.pageX)),
      onPanResponderMove: (event) => onHourChange(hourFromPageX(event.nativeEvent.pageX)),
    }),
  ).current;

  const handleTrackLayout = () => {
    // measure() (rather than reading onLayout's own event, which reports
    // position relative to the parent, not the screen) is the standard RN
    // way to get a node's on-screen (page) coordinates, needed since
    // PanResponder's touch events report pageX in screen space.
    trackRef.current?.measure((_x, _y, _width, _height, pageX) => {
      trackPageX.current = pageX;
    });
  };

  const thumbLeft = (hour / HOURS_IN_DAY) * TRACK_WIDTH - THUMB_SIZE / 2;

  return (
    <View
      ref={trackRef}
      style={styles.track}
      onLayout={handleTrackLayout}
      testID="time-of-day-slider"
      {...panResponder.panHandlers}
    >
      <View style={[styles.thumb, { left: thumbLeft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: THUMB_SIZE,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
  },
});
