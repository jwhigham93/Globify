import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { GlobeVisualization } from '../components/Globe/GlobeVisualization';
import { SAMPLE_DATA_POINTS } from '../services/sampleData';
import { DEFAULT_BACKGROUND_COLOR } from '../components/Globe';

export const App = () => {
  // On web, use a div container for proper iframe rendering
  if (Platform.OS === 'web') {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: DEFAULT_BACKGROUND_COLOR }}>
        <GlobeVisualization 
          dataPoints={SAMPLE_DATA_POINTS}
          testID="globe-visualization"
        />
      </div>
    );
  }

  // Native platforms use SafeAreaView
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <GlobeVisualization 
          dataPoints={SAMPLE_DATA_POINTS}
          testID="globe-visualization"
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
  },
});

export default App;
