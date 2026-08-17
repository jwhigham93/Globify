import { StyleSheet, Text, View } from 'react-native';

/**
 * Shown instead of the tiles scene when no Cesium Ion token is configured,
 * per the v2-tiles-app-shell spec's "missing token fails loudly, not
 * silently" requirement. Minimal/unstyled for now — task 8 replaces this
 * with the ported brutalist HUD chrome (ui/theme.ts) once it exists here.
 */
export function MissingCesiumTokenNotice() {
  return (
    <View style={styles.container} testID="missing-cesium-token-notice">
      <Text style={styles.title}>Cesium Ion token not configured</Text>
      <Text style={styles.body}>
        Set EXPO_PUBLIC_CESIUM_ION_TOKEN before starting the app. See
        apps/globify-tiles/README.md for local-dev and EAS/CI setup.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
});
