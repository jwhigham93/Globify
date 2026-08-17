import { StyleSheet, Text, View } from 'react-native';
import { TimeOfDaySlider } from './TimeOfDaySlider';

/**
 * Plain/unstyled overlay control for the time-of-day slider — matches
 * MissingCesiumTokenNotice's precedent of staying unstyled for now. Task 8
 * (porting the brutalist HUD chrome from apps/Globify) replaces this with
 * the real theme/slot system.
 *
 * No on/off toggle — atmosphere/clouds are always on now (see
 * TilesGlobeScene.tsx's header comment for why), matching the reference,
 * which has no "off" state either. `unavailable` still exists: it reflects
 * AtmosphereCloudsErrorBoundary having caught a failure and permanently
 * falling back to the base tiles scene, which the slider becoming
 * meaningless is real information worth surfacing, not a toggle to
 * control.
 *
 * Time-of-day is a continuous drag slider (TimeOfDaySlider — plain
 * View/PanResponder, not `@react-native-community/slider`), matching the
 * reference example's live `<input type="range">` behavior.
 */
export function AtmosphereCloudsControls({
  unavailable,
  hour,
  onHourChange,
}: {
  unavailable: boolean;
  hour: number;
  onHourChange: (hour: number) => void;
}) {
  if (unavailable) {
    return (
      <View style={styles.container} pointerEvents="box-none">
        <View style={styles.row}>
          <Text style={styles.label}>Atmosphere/clouds unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.row}>
        <Text style={styles.label}>Time of day: {formatHour(hour)}</Text>
        <TimeOfDaySlider hour={hour} onHourChange={onHourChange} />
      </View>
    </View>
  );
}

function formatHour(hour: number): string {
  const wholeHour = Math.floor(hour);
  const minutes = Math.round((hour - wholeHour) * 60);
  return `${String(wholeHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  row: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 12,
  },
});
