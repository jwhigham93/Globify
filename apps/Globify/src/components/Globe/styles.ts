import { StyleSheet } from 'react-native';
import { color, type } from '../ui/theme';
import { Z } from '../ui/layout';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: color.bg,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: color.surfaceSolid,
    zIndex: Z.loading,
  },
  loadingText: {
    ...type.label,
    color: color.text,
    marginTop: 10,
    fontSize: 12,
  },
  errorText: {
    ...type.body,
    color: color.danger,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
