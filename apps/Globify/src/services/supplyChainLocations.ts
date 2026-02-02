/**
 * Supply chain location mock data
 * Includes DCs, suppliers, and restaurants
 */

import type { Location } from '../components/Globe/types';

/**
 * 6 Real CFA Supply Distribution Centers
 */
export const distributionCenters: Location[] = [
  { id: 'dc-atlanta', name: 'Atlanta DC', lat: 33.7490, lng: -84.3880, type: 'dc' },
  { id: 'dc-dallas', name: 'Dallas DC', lat: 32.7767, lng: -96.7970, type: 'dc' },
  { id: 'dc-mebane', name: 'Mebane DC', lat: 36.0960, lng: -79.2669, type: 'dc' },
  { id: 'dc-joliet', name: 'Joliet DC', lat: 41.5250, lng: -88.0817, type: 'dc' },
  { id: 'dc-elgin', name: 'Elgin DC (TX)', lat: 30.3499, lng: -97.3703, type: 'dc' },
  { id: 'dc-conley', name: 'Conley DC', lat: 33.6451, lng: -84.3224, type: 'dc' },
];

/**
 * 5 Mock Supplier Locations
 */
export const suppliers: Location[] = [
  { id: 'sup-tyson', name: 'Tyson Foods (Arkansas)', lat: 36.3729, lng: -94.2088, type: 'supplier' },
  { id: 'sup-cargill', name: 'Cargill (Minnesota)', lat: 44.9778, lng: -93.2650, type: 'supplier' },
  { id: 'sup-sysco', name: 'Sysco (Texas)', lat: 29.7604, lng: -95.3698, type: 'supplier' },
  { id: 'sup-koch', name: 'Koch Foods (Illinois)', lat: 41.8781, lng: -87.6298, type: 'supplier' },
  { id: 'sup-perdue', name: 'Perdue Farms (Maryland)', lat: 38.3607, lng: -75.5994, type: 'supplier' },
];

/**
 * Mock Restaurant Locations
 * Mix of US cities plus international (Singapore, UK)
 */
export const restaurants: Location[] = [
  // Southeast US
  { id: 'rest-001', name: 'CFA Charlotte', lat: 35.2271, lng: -80.8431, type: 'restaurant' },
  { id: 'rest-002', name: 'CFA Raleigh', lat: 35.7796, lng: -78.6382, type: 'restaurant' },
  { id: 'rest-003', name: 'CFA Nashville', lat: 36.1627, lng: -86.7816, type: 'restaurant' },
  { id: 'rest-004', name: 'CFA Jacksonville', lat: 30.3322, lng: -81.6557, type: 'restaurant' },
  { id: 'rest-005', name: 'CFA Tampa', lat: 27.9506, lng: -82.4572, type: 'restaurant' },
  { id: 'rest-006', name: 'CFA Orlando', lat: 28.5383, lng: -81.3792, type: 'restaurant' },
  { id: 'rest-007', name: 'CFA Miami', lat: 25.7617, lng: -80.1918, type: 'restaurant' },
  { id: 'rest-008', name: 'CFA Birmingham', lat: 33.5186, lng: -86.8104, type: 'restaurant' },
  { id: 'rest-009', name: 'CFA Savannah', lat: 32.0809, lng: -81.0912, type: 'restaurant' },
  { id: 'rest-010', name: 'CFA Charleston', lat: 32.7765, lng: -79.9311, type: 'restaurant' },
  
  // Texas
  { id: 'rest-011', name: 'CFA Houston', lat: 29.7604, lng: -95.3698, type: 'restaurant' },
  { id: 'rest-012', name: 'CFA San Antonio', lat: 29.4241, lng: -98.4936, type: 'restaurant' },
  { id: 'rest-013', name: 'CFA Austin', lat: 30.2672, lng: -97.7431, type: 'restaurant' },
  { id: 'rest-014', name: 'CFA Fort Worth', lat: 32.7555, lng: -97.3308, type: 'restaurant' },
  { id: 'rest-015', name: 'CFA El Paso', lat: 31.7619, lng: -106.4850, type: 'restaurant' },
  
  // Midwest
  { id: 'rest-016', name: 'CFA Chicago', lat: 41.8781, lng: -87.6298, type: 'restaurant' },
  { id: 'rest-017', name: 'CFA Indianapolis', lat: 39.7684, lng: -86.1581, type: 'restaurant' },
  { id: 'rest-018', name: 'CFA Columbus', lat: 39.9612, lng: -82.9988, type: 'restaurant' },
  { id: 'rest-019', name: 'CFA Detroit', lat: 42.3314, lng: -83.0458, type: 'restaurant' },
  { id: 'rest-020', name: 'CFA Milwaukee', lat: 43.0389, lng: -87.9065, type: 'restaurant' },
  { id: 'rest-021', name: 'CFA St. Louis', lat: 38.6270, lng: -90.1994, type: 'restaurant' },
  { id: 'rest-022', name: 'CFA Kansas City', lat: 39.0997, lng: -94.5786, type: 'restaurant' },
  { id: 'rest-023', name: 'CFA Minneapolis', lat: 44.9778, lng: -93.2650, type: 'restaurant' },
  
  // Northeast
  { id: 'rest-024', name: 'CFA New York', lat: 40.7128, lng: -74.0060, type: 'restaurant' },
  { id: 'rest-025', name: 'CFA Philadelphia', lat: 39.9526, lng: -75.1652, type: 'restaurant' },
  { id: 'rest-026', name: 'CFA Boston', lat: 42.3601, lng: -71.0589, type: 'restaurant' },
  { id: 'rest-027', name: 'CFA Pittsburgh', lat: 40.4406, lng: -79.9959, type: 'restaurant' },
  { id: 'rest-028', name: 'CFA Baltimore', lat: 39.2904, lng: -76.6122, type: 'restaurant' },
  { id: 'rest-029', name: 'CFA Washington DC', lat: 38.9072, lng: -77.0369, type: 'restaurant' },
  
  // West
  { id: 'rest-030', name: 'CFA Denver', lat: 39.7392, lng: -104.9903, type: 'restaurant' },
  { id: 'rest-031', name: 'CFA Phoenix', lat: 33.4484, lng: -112.0740, type: 'restaurant' },
  { id: 'rest-032', name: 'CFA Las Vegas', lat: 36.1699, lng: -115.1398, type: 'restaurant' },
  { id: 'rest-033', name: 'CFA Los Angeles', lat: 34.0522, lng: -118.2437, type: 'restaurant' },
  { id: 'rest-034', name: 'CFA San Diego', lat: 32.7157, lng: -117.1611, type: 'restaurant' },
  { id: 'rest-035', name: 'CFA San Francisco', lat: 37.7749, lng: -122.4194, type: 'restaurant' },
  { id: 'rest-036', name: 'CFA Seattle', lat: 47.6062, lng: -122.3321, type: 'restaurant' },
  { id: 'rest-037', name: 'CFA Portland', lat: 45.5155, lng: -122.6789, type: 'restaurant' },
  { id: 'rest-038', name: 'CFA Salt Lake City', lat: 40.7608, lng: -111.8910, type: 'restaurant' },
  
  // International - Singapore
  { id: 'rest-039', name: 'CFA Singapore Orchard', lat: 1.3048, lng: 103.8318, type: 'restaurant' },
  { id: 'rest-040', name: 'CFA Singapore Marina', lat: 1.2834, lng: 103.8607, type: 'restaurant' },
  
  // International - UK
  { id: 'rest-041', name: 'CFA London Leicester Sq', lat: 51.5103, lng: -0.1306, type: 'restaurant' },
  { id: 'rest-042', name: 'CFA London Oxford St', lat: 51.5154, lng: -0.1410, type: 'restaurant' },
  { id: 'rest-043', name: 'CFA Birmingham UK', lat: 52.4862, lng: -1.8904, type: 'restaurant' },
  { id: 'rest-044', name: 'CFA Manchester', lat: 53.4808, lng: -2.2426, type: 'restaurant' },
  { id: 'rest-045', name: 'CFA Edinburgh', lat: 55.9533, lng: -3.1883, type: 'restaurant' },
];

/**
 * All locations combined
 */
export const allLocations: Location[] = [
  ...distributionCenters,
  ...suppliers,
  ...restaurants,
];
