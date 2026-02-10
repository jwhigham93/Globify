/**
 * Sample data points for MVP globe visualization
 * Based on react-globe.gl basic example
 */

import type { DataPoint } from '../components/Globe/types';

/**
 * Sample data points for MVP.
 * 10 major cities around the world with streaming intensity values.
 */
export const SAMPLE_DATA_POINTS: DataPoint[] = [
  { lat: 40.7128, lng: -74.006, label: 'New York', value: 95 },
  { lat: 51.5074, lng: -0.1278, label: 'London', value: 88 },
  { lat: 35.6762, lng: 139.6503, label: 'Tokyo', value: 92 },
  { lat: -33.8688, lng: 151.2093, label: 'Sydney', value: 65 },
  { lat: 48.8566, lng: 2.3522, label: 'Paris', value: 78 },
  { lat: 55.7558, lng: 37.6173, label: 'Moscow', value: 55 },
  { lat: -23.5505, lng: -46.6333, label: 'São Paulo', value: 82 },
  { lat: 19.4326, lng: -99.1332, label: 'Mexico City', value: 70 },
  { lat: 1.3521, lng: 103.8198, label: 'Singapore', value: 60 },
  { lat: 25.2048, lng: 55.2708, label: 'Dubai', value: 45 },
];
