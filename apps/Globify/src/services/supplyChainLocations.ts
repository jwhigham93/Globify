/**
 * Supply chain location mock data
 *
 * Based on real CFA footprint as of early 2026:
 * - 3,355+ US restaurants (we model ~200 representative locations)
 * - 10 distribution centers operated by CFA Supply
 * - 12 major supplier facilities (poultry, baking, packaging)
 *
 * Metro clusters are intentionally dense to test LOD clustering:
 *   Atlanta 25+, Dallas/FW 15+, Houston 12+, Charlotte 8, etc.
 *
 * Sources: chick-fil-a.com/locations, cfa-supply.com, Wikipedia, public filings
 */

import type { Location } from '../components/Globe/types';

// ────────────────────────────────────────────────────────────────────────────
// Distribution Centers (10)
// CFA Supply operates DCs in GA, NC, IL, TX, CA, TN, and FL
// ────────────────────────────────────────────────────────────────────────────

export const distributionCenters: Location[] = [
  { id: 'dc-atlanta', name: 'Atlanta DC', lat: 33.7490, lng: -84.3880, type: 'dc' },
  { id: 'dc-conley', name: 'Conley DC', lat: 33.6451, lng: -84.3224, type: 'dc' },
  { id: 'dc-cartersville', name: 'Cartersville DC', lat: 34.1651, lng: -84.7999, type: 'dc' },
  { id: 'dc-mebane', name: 'Mebane DC', lat: 36.0960, lng: -79.2669, type: 'dc' },
  { id: 'dc-dallas', name: 'Dallas DC', lat: 32.7767, lng: -96.7970, type: 'dc' },
  { id: 'dc-elgin', name: 'Elgin DC (TX)', lat: 30.3499, lng: -97.3703, type: 'dc' },
  { id: 'dc-joliet', name: 'Joliet DC', lat: 41.5250, lng: -88.0817, type: 'dc' },
  { id: 'dc-lebanon', name: 'Lebanon DC (TN)', lat: 36.2082, lng: -86.2911, type: 'dc' },
  { id: 'dc-fontana', name: 'Fontana DC (CA)', lat: 34.0922, lng: -117.4350, type: 'dc' },
  { id: 'dc-lakeland', name: 'Lakeland DC (FL)', lat: 28.0395, lng: -81.9498, type: 'dc' },
];

// ────────────────────────────────────────────────────────────────────────────
// Suppliers (12)
// Major poultry, baking, and cold-storage partners
// ────────────────────────────────────────────────────────────────────────────

export const suppliers: Location[] = [
  // Poultry
  { id: 'sup-tyson', name: 'Tyson Foods (Arkansas)', lat: 36.3729, lng: -94.2088, type: 'supplier' },
  { id: 'sup-perdue', name: 'Perdue Farms (Maryland)', lat: 38.3607, lng: -75.5994, type: 'supplier' },
  { id: 'sup-koch', name: 'Koch Foods (Illinois)', lat: 41.8781, lng: -87.6298, type: 'supplier' },
  { id: 'sup-pilgrims', name: "Pilgrim's Pride (Colorado)", lat: 40.4233, lng: -104.7091, type: 'supplier' },
  { id: 'sup-sanderson', name: 'Wayne-Sanderson (Mississippi)', lat: 31.6941, lng: -89.1306, type: 'supplier' },
  { id: 'sup-marjac', name: 'Mar-Jac Poultry (Georgia)', lat: 34.2979, lng: -83.8241, type: 'supplier' },
  { id: 'sup-claxton', name: 'Claxton Poultry (Georgia)', lat: 32.1613, lng: -81.9040, type: 'supplier' },
  { id: 'sup-brakebush', name: 'Brakebush Chicken (Wisconsin)', lat: 44.1539, lng: -89.5643, type: 'supplier' },

  // Bakery / Packaging / Cold storage
  { id: 'sup-flowers', name: 'Flowers Foods (Georgia)', lat: 31.5785, lng: -84.1558, type: 'supplier' },
  { id: 'sup-cargill', name: 'Cargill (Minnesota)', lat: 44.9778, lng: -93.2650, type: 'supplier' },
  { id: 'sup-sysco', name: 'Sysco (Texas)', lat: 29.7604, lng: -95.3698, type: 'supplier' },
  { id: 'sup-americold', name: 'Americold (Georgia)', lat: 33.7573, lng: -84.3963, type: 'supplier' },
];

// ────────────────────────────────────────────────────────────────────────────
// Restaurants (~200)
// Dense clusters in major CFA metros for LOD testing
// ────────────────────────────────────────────────────────────────────────────

export const restaurants: Location[] = [
  // ── Atlanta Metro (25) ────────────────────────────────────────────────────
  { id: 'rest-atl-001', name: 'CFA Midtown Atlanta', lat: 33.7844, lng: -84.3834, type: 'restaurant' },
  { id: 'rest-atl-002', name: 'CFA Buckhead', lat: 33.8381, lng: -84.3793, type: 'restaurant' },
  { id: 'rest-atl-003', name: 'CFA Downtown Atlanta', lat: 33.7537, lng: -84.3863, type: 'restaurant' },
  { id: 'rest-atl-004', name: 'CFA Decatur', lat: 33.7748, lng: -84.2963, type: 'restaurant' },
  { id: 'rest-atl-005', name: 'CFA Sandy Springs', lat: 33.9304, lng: -84.3733, type: 'restaurant' },
  { id: 'rest-atl-006', name: 'CFA Dunwoody', lat: 33.9462, lng: -84.3346, type: 'restaurant' },
  { id: 'rest-atl-007', name: 'CFA Roswell', lat: 34.0232, lng: -84.3616, type: 'restaurant' },
  { id: 'rest-atl-008', name: 'CFA Alpharetta', lat: 34.0754, lng: -84.2941, type: 'restaurant' },
  { id: 'rest-atl-009', name: 'CFA Marietta', lat: 33.9526, lng: -84.5499, type: 'restaurant' },
  { id: 'rest-atl-010', name: 'CFA Kennesaw', lat: 34.0234, lng: -84.6155, type: 'restaurant' },
  { id: 'rest-atl-011', name: 'CFA Smyrna', lat: 33.8839, lng: -84.5143, type: 'restaurant' },
  { id: 'rest-atl-012', name: 'CFA East Point', lat: 33.6795, lng: -84.4393, type: 'restaurant' },
  { id: 'rest-atl-013', name: 'CFA College Park', lat: 33.6535, lng: -84.4494, type: 'restaurant' },
  { id: 'rest-atl-014', name: 'CFA Stockbridge', lat: 33.5443, lng: -84.2338, type: 'restaurant' },
  { id: 'rest-atl-015', name: 'CFA Peachtree City', lat: 33.3968, lng: -84.5966, type: 'restaurant' },
  { id: 'rest-atl-016', name: 'CFA Newnan', lat: 33.3810, lng: -84.7997, type: 'restaurant' },
  { id: 'rest-atl-017', name: 'CFA Lawrenceville', lat: 33.9565, lng: -83.9880, type: 'restaurant' },
  { id: 'rest-atl-018', name: 'CFA Duluth', lat: 34.0029, lng: -84.1446, type: 'restaurant' },
  { id: 'rest-atl-019', name: 'CFA Suwanee', lat: 34.0515, lng: -84.0713, type: 'restaurant' },
  { id: 'rest-atl-020', name: 'CFA Johns Creek', lat: 34.0289, lng: -84.1986, type: 'restaurant' },
  { id: 'rest-atl-021', name: 'CFA Tucker', lat: 33.8554, lng: -84.2171, type: 'restaurant' },
  { id: 'rest-atl-022', name: 'CFA Stone Mountain', lat: 33.8081, lng: -84.1702, type: 'restaurant' },
  { id: 'rest-atl-023', name: 'CFA Douglasville', lat: 33.7515, lng: -84.7477, type: 'restaurant' },
  { id: 'rest-atl-024', name: 'CFA Woodstock', lat: 34.1015, lng: -84.5194, type: 'restaurant' },
  { id: 'rest-atl-025', name: 'CFA Canton', lat: 34.2368, lng: -84.4908, type: 'restaurant' },

  // ── Dallas / Fort Worth Metro (15) ────────────────────────────────────────
  { id: 'rest-dfw-001', name: 'CFA Downtown Dallas', lat: 32.7801, lng: -96.8005, type: 'restaurant' },
  { id: 'rest-dfw-002', name: 'CFA Uptown Dallas', lat: 32.8034, lng: -96.7985, type: 'restaurant' },
  { id: 'rest-dfw-003', name: 'CFA North Dallas', lat: 32.9204, lng: -96.7701, type: 'restaurant' },
  { id: 'rest-dfw-004', name: 'CFA Richardson', lat: 32.9483, lng: -96.7299, type: 'restaurant' },
  { id: 'rest-dfw-005', name: 'CFA Plano', lat: 33.0198, lng: -96.6989, type: 'restaurant' },
  { id: 'rest-dfw-006', name: 'CFA Frisco', lat: 33.1507, lng: -96.8236, type: 'restaurant' },
  { id: 'rest-dfw-007', name: 'CFA McKinney', lat: 33.1972, lng: -96.6397, type: 'restaurant' },
  { id: 'rest-dfw-008', name: 'CFA Allen', lat: 33.1032, lng: -96.6706, type: 'restaurant' },
  { id: 'rest-dfw-009', name: 'CFA Irving', lat: 32.8140, lng: -96.9489, type: 'restaurant' },
  { id: 'rest-dfw-010', name: 'CFA Arlington', lat: 32.7357, lng: -97.1081, type: 'restaurant' },
  { id: 'rest-dfw-011', name: 'CFA Fort Worth', lat: 32.7555, lng: -97.3308, type: 'restaurant' },
  { id: 'rest-dfw-012', name: 'CFA Garland', lat: 32.9126, lng: -96.6389, type: 'restaurant' },
  { id: 'rest-dfw-013', name: 'CFA Mesquite', lat: 32.7668, lng: -96.5992, type: 'restaurant' },
  { id: 'rest-dfw-014', name: 'CFA Denton', lat: 33.2148, lng: -97.1331, type: 'restaurant' },
  { id: 'rest-dfw-015', name: 'CFA Southlake', lat: 32.9413, lng: -97.1342, type: 'restaurant' },

  // ── Houston Metro (12) ────────────────────────────────────────────────────
  { id: 'rest-hou-001', name: 'CFA Downtown Houston', lat: 29.7604, lng: -95.3698, type: 'restaurant' },
  { id: 'rest-hou-002', name: 'CFA Galleria Houston', lat: 29.7398, lng: -95.4610, type: 'restaurant' },
  { id: 'rest-hou-003', name: 'CFA Katy', lat: 29.7858, lng: -95.8245, type: 'restaurant' },
  { id: 'rest-hou-004', name: 'CFA Sugar Land', lat: 29.6197, lng: -95.6349, type: 'restaurant' },
  { id: 'rest-hou-005', name: 'CFA Pearland', lat: 29.5636, lng: -95.2860, type: 'restaurant' },
  { id: 'rest-hou-006', name: 'CFA The Woodlands', lat: 30.1658, lng: -95.4613, type: 'restaurant' },
  { id: 'rest-hou-007', name: 'CFA Cypress', lat: 29.9691, lng: -95.6972, type: 'restaurant' },
  { id: 'rest-hou-008', name: 'CFA League City', lat: 29.5075, lng: -95.0949, type: 'restaurant' },
  { id: 'rest-hou-009', name: 'CFA Spring', lat: 30.0799, lng: -95.4172, type: 'restaurant' },
  { id: 'rest-hou-010', name: 'CFA Baytown', lat: 29.7355, lng: -94.9774, type: 'restaurant' },
  { id: 'rest-hou-011', name: 'CFA Pasadena TX', lat: 29.6911, lng: -95.2091, type: 'restaurant' },
  { id: 'rest-hou-012', name: 'CFA Humble', lat: 29.9988, lng: -95.2622, type: 'restaurant' },

  // ── Charlotte Metro (8) ───────────────────────────────────────────────────
  { id: 'rest-clt-001', name: 'CFA Uptown Charlotte', lat: 35.2271, lng: -80.8431, type: 'restaurant' },
  { id: 'rest-clt-002', name: 'CFA South Charlotte', lat: 35.1269, lng: -80.8554, type: 'restaurant' },
  { id: 'rest-clt-003', name: 'CFA Matthews', lat: 35.1168, lng: -80.7235, type: 'restaurant' },
  { id: 'rest-clt-004', name: 'CFA Huntersville', lat: 35.4107, lng: -80.8428, type: 'restaurant' },
  { id: 'rest-clt-005', name: 'CFA Concord', lat: 35.4088, lng: -80.5795, type: 'restaurant' },
  { id: 'rest-clt-006', name: 'CFA Gastonia', lat: 35.2621, lng: -81.1873, type: 'restaurant' },
  { id: 'rest-clt-007', name: 'CFA Rock Hill SC', lat: 34.9249, lng: -81.0251, type: 'restaurant' },
  { id: 'rest-clt-008', name: 'CFA Mooresville', lat: 35.5846, lng: -80.8101, type: 'restaurant' },

  // ── Nashville Metro (7) ───────────────────────────────────────────────────
  { id: 'rest-nas-001', name: 'CFA Downtown Nashville', lat: 36.1627, lng: -86.7816, type: 'restaurant' },
  { id: 'rest-nas-002', name: 'CFA Brentwood TN', lat: 36.0331, lng: -86.7828, type: 'restaurant' },
  { id: 'rest-nas-003', name: 'CFA Franklin TN', lat: 35.9251, lng: -86.8689, type: 'restaurant' },
  { id: 'rest-nas-004', name: 'CFA Murfreesboro', lat: 35.8456, lng: -86.3903, type: 'restaurant' },
  { id: 'rest-nas-005', name: 'CFA Hendersonville TN', lat: 36.3048, lng: -86.6200, type: 'restaurant' },
  { id: 'rest-nas-006', name: 'CFA Mt. Juliet', lat: 36.2001, lng: -86.5186, type: 'restaurant' },
  { id: 'rest-nas-007', name: 'CFA Cool Springs', lat: 35.9650, lng: -86.8125, type: 'restaurant' },

  // ── Chicago Metro (8) ─────────────────────────────────────────────────────
  { id: 'rest-chi-001', name: 'CFA Chicago Loop', lat: 41.8827, lng: -87.6233, type: 'restaurant' },
  { id: 'rest-chi-002', name: 'CFA Magnificent Mile', lat: 41.8953, lng: -87.6244, type: 'restaurant' },
  { id: 'rest-chi-003', name: 'CFA Naperville', lat: 41.7508, lng: -88.1535, type: 'restaurant' },
  { id: 'rest-chi-004', name: 'CFA Schaumburg', lat: 42.0334, lng: -88.0834, type: 'restaurant' },
  { id: 'rest-chi-005', name: 'CFA Orland Park', lat: 41.6303, lng: -87.8539, type: 'restaurant' },
  { id: 'rest-chi-006', name: 'CFA Oak Brook', lat: 41.8328, lng: -87.9289, type: 'restaurant' },
  { id: 'rest-chi-007', name: 'CFA Evanston', lat: 42.0451, lng: -87.6878, type: 'restaurant' },
  { id: 'rest-chi-008', name: 'CFA Bolingbrook', lat: 41.6986, lng: -88.0684, type: 'restaurant' },

  // ── Florida Metros ────────────────────────────────────────────────────────
  // Orlando (6)
  { id: 'rest-orl-001', name: 'CFA Downtown Orlando', lat: 28.5383, lng: -81.3792, type: 'restaurant' },
  { id: 'rest-orl-002', name: 'CFA I-Drive Orlando', lat: 28.4316, lng: -81.4699, type: 'restaurant' },
  { id: 'rest-orl-003', name: 'CFA Winter Park', lat: 28.5999, lng: -81.3392, type: 'restaurant' },
  { id: 'rest-orl-004', name: 'CFA Kissimmee', lat: 28.2920, lng: -81.4076, type: 'restaurant' },
  { id: 'rest-orl-005', name: 'CFA Altamonte Springs', lat: 28.6611, lng: -81.3656, type: 'restaurant' },
  { id: 'rest-orl-006', name: 'CFA Lake Mary', lat: 28.7589, lng: -81.3178, type: 'restaurant' },
  // Tampa Bay (5)
  { id: 'rest-tpa-001', name: 'CFA Downtown Tampa', lat: 27.9506, lng: -82.4572, type: 'restaurant' },
  { id: 'rest-tpa-002', name: 'CFA Brandon FL', lat: 27.9378, lng: -82.2859, type: 'restaurant' },
  { id: 'rest-tpa-003', name: 'CFA St. Petersburg', lat: 27.7676, lng: -82.6403, type: 'restaurant' },
  { id: 'rest-tpa-004', name: 'CFA Wesley Chapel', lat: 28.2397, lng: -82.3276, type: 'restaurant' },
  { id: 'rest-tpa-005', name: 'CFA Clearwater', lat: 27.9659, lng: -82.8001, type: 'restaurant' },
  // Miami-South FL (5)
  { id: 'rest-mia-001', name: 'CFA Miami', lat: 25.7617, lng: -80.1918, type: 'restaurant' },
  { id: 'rest-mia-002', name: 'CFA Coral Gables', lat: 25.7217, lng: -80.2684, type: 'restaurant' },
  { id: 'rest-mia-003', name: 'CFA Ft. Lauderdale', lat: 26.1224, lng: -80.1373, type: 'restaurant' },
  { id: 'rest-mia-004', name: 'CFA Boca Raton', lat: 26.3683, lng: -80.1289, type: 'restaurant' },
  { id: 'rest-mia-005', name: 'CFA West Palm Beach', lat: 26.7153, lng: -80.0534, type: 'restaurant' },
  // Jacksonville (3)
  { id: 'rest-jax-001', name: 'CFA Jacksonville Southside', lat: 30.2824, lng: -81.5490, type: 'restaurant' },
  { id: 'rest-jax-002', name: 'CFA Jacksonville Town Ctr', lat: 30.2427, lng: -81.5195, type: 'restaurant' },
  { id: 'rest-jax-003', name: 'CFA Jacksonville Northside', lat: 30.3922, lng: -81.5685, type: 'restaurant' },

  // ── Carolinas ─────────────────────────────────────────────────────────────
  { id: 'rest-car-001', name: 'CFA Raleigh', lat: 35.7796, lng: -78.6382, type: 'restaurant' },
  { id: 'rest-car-002', name: 'CFA Durham', lat: 35.9940, lng: -78.8986, type: 'restaurant' },
  { id: 'rest-car-003', name: 'CFA Greensboro', lat: 36.0726, lng: -79.7920, type: 'restaurant' },
  { id: 'rest-car-004', name: 'CFA Winston-Salem', lat: 36.0999, lng: -80.2442, type: 'restaurant' },
  { id: 'rest-car-005', name: 'CFA Fayetteville NC', lat: 35.0527, lng: -78.8784, type: 'restaurant' },
  { id: 'rest-car-006', name: 'CFA Wilmington NC', lat: 34.2257, lng: -77.9447, type: 'restaurant' },
  { id: 'rest-car-007', name: 'CFA Charleston SC', lat: 32.7765, lng: -79.9311, type: 'restaurant' },
  { id: 'rest-car-008', name: 'CFA Columbia SC', lat: 34.0007, lng: -81.0348, type: 'restaurant' },
  { id: 'rest-car-009', name: 'CFA Greenville SC', lat: 34.8526, lng: -82.3940, type: 'restaurant' },

  // ── Other Southeast ───────────────────────────────────────────────────────
  { id: 'rest-se-001', name: 'CFA Savannah', lat: 32.0809, lng: -81.0912, type: 'restaurant' },
  { id: 'rest-se-002', name: 'CFA Birmingham', lat: 33.5186, lng: -86.8104, type: 'restaurant' },
  { id: 'rest-se-003', name: 'CFA Huntsville', lat: 34.7304, lng: -86.5861, type: 'restaurant' },
  { id: 'rest-se-004', name: 'CFA Montgomery', lat: 32.3792, lng: -86.3077, type: 'restaurant' },
  { id: 'rest-se-005', name: 'CFA Mobile', lat: 30.6954, lng: -88.0399, type: 'restaurant' },
  { id: 'rest-se-006', name: 'CFA Chattanooga', lat: 35.0456, lng: -85.3097, type: 'restaurant' },
  { id: 'rest-se-007', name: 'CFA Knoxville', lat: 35.9606, lng: -83.9207, type: 'restaurant' },
  { id: 'rest-se-008', name: 'CFA Memphis', lat: 35.1495, lng: -90.0490, type: 'restaurant' },
  { id: 'rest-se-009', name: 'CFA Jackson MS', lat: 32.2988, lng: -90.1848, type: 'restaurant' },
  { id: 'rest-se-010', name: 'CFA New Orleans', lat: 29.9511, lng: -90.0715, type: 'restaurant' },
  { id: 'rest-se-011', name: 'CFA Baton Rouge', lat: 30.4515, lng: -91.1871, type: 'restaurant' },
  { id: 'rest-se-012', name: 'CFA Little Rock', lat: 34.7465, lng: -92.2896, type: 'restaurant' },

  // ── Texas (other than DFW/Houston) ────────────────────────────────────────
  { id: 'rest-tx-001', name: 'CFA San Antonio', lat: 29.4241, lng: -98.4936, type: 'restaurant' },
  { id: 'rest-tx-002', name: 'CFA Austin', lat: 30.2672, lng: -97.7431, type: 'restaurant' },
  { id: 'rest-tx-003', name: 'CFA San Marcos', lat: 29.8833, lng: -97.9414, type: 'restaurant' },
  { id: 'rest-tx-004', name: 'CFA El Paso', lat: 31.7619, lng: -106.4850, type: 'restaurant' },
  { id: 'rest-tx-005', name: 'CFA Lubbock', lat: 33.5779, lng: -101.8552, type: 'restaurant' },
  { id: 'rest-tx-006', name: 'CFA Waco', lat: 31.5493, lng: -97.1467, type: 'restaurant' },
  { id: 'rest-tx-007', name: 'CFA College Station', lat: 30.6280, lng: -96.3344, type: 'restaurant' },
  { id: 'rest-tx-008', name: 'CFA Corpus Christi', lat: 27.8006, lng: -97.3964, type: 'restaurant' },

  // ── Midwest ───────────────────────────────────────────────────────────────
  { id: 'rest-mw-001', name: 'CFA Indianapolis', lat: 39.7684, lng: -86.1581, type: 'restaurant' },
  { id: 'rest-mw-002', name: 'CFA Columbus OH', lat: 39.9612, lng: -82.9988, type: 'restaurant' },
  { id: 'rest-mw-003', name: 'CFA Cincinnati', lat: 39.1031, lng: -84.5120, type: 'restaurant' },
  { id: 'rest-mw-004', name: 'CFA Detroit', lat: 42.3314, lng: -83.0458, type: 'restaurant' },
  { id: 'rest-mw-005', name: 'CFA Milwaukee', lat: 43.0389, lng: -87.9065, type: 'restaurant' },
  { id: 'rest-mw-006', name: 'CFA St. Louis', lat: 38.6270, lng: -90.1994, type: 'restaurant' },
  { id: 'rest-mw-007', name: 'CFA Kansas City', lat: 39.0997, lng: -94.5786, type: 'restaurant' },
  { id: 'rest-mw-008', name: 'CFA Minneapolis', lat: 44.9778, lng: -93.2650, type: 'restaurant' },
  { id: 'rest-mw-009', name: 'CFA Omaha', lat: 41.2565, lng: -95.9345, type: 'restaurant' },
  { id: 'rest-mw-010', name: 'CFA Des Moines', lat: 41.5868, lng: -93.6250, type: 'restaurant' },
  { id: 'rest-mw-011', name: 'CFA Cleveland', lat: 41.4993, lng: -81.6944, type: 'restaurant' },

  // ── Northeast / Mid-Atlantic ──────────────────────────────────────────────
  { id: 'rest-ne-001', name: 'CFA New York Manhattan', lat: 40.7580, lng: -73.9855, type: 'restaurant' },
  { id: 'rest-ne-002', name: 'CFA New York Fulton', lat: 40.7098, lng: -74.0065, type: 'restaurant' },
  { id: 'rest-ne-003', name: 'CFA Queens', lat: 40.7282, lng: -73.7949, type: 'restaurant' },
  { id: 'rest-ne-004', name: 'CFA Long Island', lat: 40.7891, lng: -73.1350, type: 'restaurant' },
  { id: 'rest-ne-005', name: 'CFA White Plains NY', lat: 41.0340, lng: -73.7629, type: 'restaurant' },
  { id: 'rest-ne-006', name: 'CFA Philadelphia Center City', lat: 39.9526, lng: -75.1652, type: 'restaurant' },
  { id: 'rest-ne-007', name: 'CFA King of Prussia', lat: 40.0912, lng: -75.3849, type: 'restaurant' },
  { id: 'rest-ne-008', name: 'CFA Cherry Hill NJ', lat: 39.9348, lng: -74.9956, type: 'restaurant' },
  { id: 'rest-ne-009', name: 'CFA Boston', lat: 42.3601, lng: -71.0589, type: 'restaurant' },
  { id: 'rest-ne-010', name: 'CFA Pittsburgh', lat: 40.4406, lng: -79.9959, type: 'restaurant' },
  { id: 'rest-ne-011', name: 'CFA Baltimore', lat: 39.2904, lng: -76.6122, type: 'restaurant' },
  { id: 'rest-ne-012', name: 'CFA Washington DC', lat: 38.9072, lng: -77.0369, type: 'restaurant' },
  { id: 'rest-ne-013', name: 'CFA Silver Spring MD', lat: 38.9907, lng: -77.0261, type: 'restaurant' },
  { id: 'rest-ne-014', name: 'CFA Virginia Beach', lat: 36.8529, lng: -75.9780, type: 'restaurant' },
  { id: 'rest-ne-015', name: 'CFA Richmond', lat: 37.5407, lng: -77.4360, type: 'restaurant' },
  { id: 'rest-ne-016', name: 'CFA Norfolk', lat: 36.8508, lng: -76.2859, type: 'restaurant' },
  { id: 'rest-ne-017', name: 'CFA Hartford CT', lat: 41.7658, lng: -72.6734, type: 'restaurant' },

  // ── West / Mountain ───────────────────────────────────────────────────────
  { id: 'rest-w-001', name: 'CFA Denver', lat: 39.7392, lng: -104.9903, type: 'restaurant' },
  { id: 'rest-w-002', name: 'CFA Colorado Springs', lat: 38.8339, lng: -104.8214, type: 'restaurant' },
  { id: 'rest-w-003', name: 'CFA Phoenix Scottsdale', lat: 33.4942, lng: -111.9261, type: 'restaurant' },
  { id: 'rest-w-004', name: 'CFA Phoenix Tempe', lat: 33.4255, lng: -111.9400, type: 'restaurant' },
  { id: 'rest-w-005', name: 'CFA Phoenix Chandler', lat: 33.3062, lng: -111.8413, type: 'restaurant' },
  { id: 'rest-w-006', name: 'CFA Phoenix Gilbert', lat: 33.3528, lng: -111.7890, type: 'restaurant' },
  { id: 'rest-w-007', name: 'CFA Tucson', lat: 32.2226, lng: -110.9747, type: 'restaurant' },
  { id: 'rest-w-008', name: 'CFA Las Vegas', lat: 36.1699, lng: -115.1398, type: 'restaurant' },
  { id: 'rest-w-009', name: 'CFA Henderson NV', lat: 36.0395, lng: -114.9817, type: 'restaurant' },
  { id: 'rest-w-010', name: 'CFA Salt Lake City', lat: 40.7608, lng: -111.8910, type: 'restaurant' },
  { id: 'rest-w-011', name: 'CFA Boise', lat: 43.6150, lng: -116.2023, type: 'restaurant' },
  { id: 'rest-w-012', name: 'CFA Albuquerque', lat: 35.0844, lng: -106.6504, type: 'restaurant' },

  // ── Pacific ───────────────────────────────────────────────────────────────
  // Los Angeles Metro (6)
  { id: 'rest-la-001', name: 'CFA Hollywood', lat: 34.0928, lng: -118.3287, type: 'restaurant' },
  { id: 'rest-la-002', name: 'CFA Pasadena CA', lat: 34.1478, lng: -118.1445, type: 'restaurant' },
  { id: 'rest-la-003', name: 'CFA Torrance', lat: 33.8358, lng: -118.3406, type: 'restaurant' },
  { id: 'rest-la-004', name: 'CFA Santa Clarita', lat: 34.3917, lng: -118.5426, type: 'restaurant' },
  { id: 'rest-la-005', name: 'CFA Irvine', lat: 33.6846, lng: -117.8265, type: 'restaurant' },
  { id: 'rest-la-006', name: 'CFA Ontario CA', lat: 34.0633, lng: -117.6509, type: 'restaurant' },
  // San Diego (3)
  { id: 'rest-sd-001', name: 'CFA San Diego Mission Valley', lat: 32.7710, lng: -117.1664, type: 'restaurant' },
  { id: 'rest-sd-002', name: 'CFA Chula Vista', lat: 32.6401, lng: -117.0842, type: 'restaurant' },
  { id: 'rest-sd-003', name: 'CFA Escondido', lat: 33.1192, lng: -117.0864, type: 'restaurant' },
  // Bay Area (3)
  { id: 'rest-sf-001', name: 'CFA San Francisco', lat: 37.7749, lng: -122.4194, type: 'restaurant' },
  { id: 'rest-sf-002', name: 'CFA Walnut Creek', lat: 37.9101, lng: -122.0652, type: 'restaurant' },
  { id: 'rest-sf-003', name: 'CFA San Jose', lat: 37.3382, lng: -121.8863, type: 'restaurant' },
  // Pacific NW (3)
  { id: 'rest-pnw-001', name: 'CFA Seattle', lat: 47.6062, lng: -122.3321, type: 'restaurant' },
  { id: 'rest-pnw-002', name: 'CFA Bellevue WA', lat: 47.6101, lng: -122.2015, type: 'restaurant' },
  { id: 'rest-pnw-003', name: 'CFA Portland', lat: 45.5155, lng: -122.6789, type: 'restaurant' },

  // ── International — Canada ────────────────────────────────────────────────
  { id: 'rest-can-001', name: 'CFA Toronto Yonge & Bloor', lat: 43.6703, lng: -79.3868, type: 'restaurant' },
  { id: 'rest-can-002', name: 'CFA Toronto Yorkdale', lat: 43.7254, lng: -79.4522, type: 'restaurant' },
  { id: 'rest-can-003', name: 'CFA Kitchener ON', lat: 43.4516, lng: -80.4925, type: 'restaurant' },
  { id: 'rest-can-004', name: 'CFA Windsor ON', lat: 42.3149, lng: -83.0364, type: 'restaurant' },
  { id: 'rest-can-005', name: 'CFA Calgary', lat: 51.0486, lng: -114.0708, type: 'restaurant' },
  { id: 'rest-can-006', name: 'CFA Edmonton', lat: 53.5461, lng: -113.4938, type: 'restaurant' },

  // ── International — United Kingdom ────────────────────────────────────────
  { id: 'rest-uk-001', name: 'CFA Lisburn NI', lat: 54.5162, lng: -6.0580, type: 'restaurant' },
  { id: 'rest-uk-002', name: 'CFA Templepatrick NI', lat: 54.6925, lng: -6.1033, type: 'restaurant' },
  { id: 'rest-uk-003', name: 'CFA Leeds', lat: 53.8008, lng: -1.5491, type: 'restaurant' },

  // ── International — Singapore ─────────────────────────────────────────────
  { id: 'rest-sg-001', name: 'CFA Singapore Orchard', lat: 1.3048, lng: 103.8318, type: 'restaurant' },

  // ── Puerto Rico ───────────────────────────────────────────────────────────
  { id: 'rest-pr-001', name: 'CFA San Juan', lat: 18.4655, lng: -66.1057, type: 'restaurant' },
  { id: 'rest-pr-002', name: 'CFA Bayamón', lat: 18.3985, lng: -66.1553, type: 'restaurant' },
  { id: 'rest-pr-003', name: 'CFA Carolina PR', lat: 18.3809, lng: -65.9572, type: 'restaurant' },
];

/**
 * All locations combined
 */
export const allLocations: Location[] = [
  ...distributionCenters,
  ...suppliers,
  ...restaurants,
];
