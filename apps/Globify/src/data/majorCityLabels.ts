/**
 * Major city labels for the globe.
 *
 * Curated, not exhaustive — anchored to the supply-chain footprint rather
 * than a general world-cities gazetteer (no such dataset exists in this
 * repo). Coordinates are taken from the real restaurant/DC location rows in
 * services/supply-chain-api/migrations/000002_seed_data.up.sql wherever one
 * exists; a handful of cities with no exact row (Phoenix, San Diego's
 * downtown) use their well-known public city-center coordinates instead.
 * `priority` is a manual rank (1 = shown first when space is tight), very
 * roughly ordered by size/prominence — precise population data isn't
 * needed since `services/labelCollision.ts` only compares priority between
 * labels that are close enough on screen to compete in the first place.
 *
 * Deliberately excluded, to avoid the exact "too much overlap" failure
 * mode this is meant to guard against:
 *  - Neighborhoods/suburbs of a city already covered by its own metro
 *    anchor below (e.g. Buckhead, Decatur, and 20+ other Atlanta suburbs;
 *    Plano/Frisco/Irving for Dallas–Fort Worth; Naperville/Schaumburg for
 *    Chicago; Coral Gables for Miami; Hollywood/Pasadena CA/Torrance for
 *    Los Angeles). These are real places, but at globe scale they'd sit on
 *    top of their metro's own label with no useful separation.
 *
 * Included beyond the original 12 metro anchors: every other genuinely
 * distinct, standalone city with a restaurant or DC nearby in the seed
 * data — including cities that share a metro with a bigger one already
 * listed but are notable enough in their own right (Fort Lauderdale and
 * West Palm Beach alongside Miami; St. Petersburg alongside Tampa).
 */

export interface MajorCityLabel {
  /** Stable identifier, kebab-case */
  id: string;
  /** Display name (natural case — renderers apply their own text-transform) */
  name: string;
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lng: number;
  /** Manual priority rank; lower = kept first when labels would collide */
  priority: number;
}

export const MAJOR_CITY_LABELS: MajorCityLabel[] = [
  // ── Supply-chain hub metros (original 12) ──────────────────────────
  { id: 'atlanta', name: 'Atlanta', lat: 33.7537, lng: -84.3863, priority: 1 },
  { id: 'dallas-fort-worth', name: 'Dallas–Fort Worth', lat: 32.7801, lng: -96.8005, priority: 2 },
  { id: 'houston', name: 'Houston', lat: 29.7604, lng: -95.3698, priority: 3 },
  { id: 'chicago', name: 'Chicago', lat: 41.8827, lng: -87.6233, priority: 4 },
  { id: 'los-angeles', name: 'Los Angeles', lat: 34.0522, lng: -118.2437, priority: 5 },
  { id: 'charlotte', name: 'Charlotte', lat: 35.2271, lng: -80.8431, priority: 6 },
  { id: 'nashville', name: 'Nashville', lat: 36.1627, lng: -86.7816, priority: 7 },
  { id: 'orlando', name: 'Orlando', lat: 28.5383, lng: -81.3792, priority: 8 },
  { id: 'tampa', name: 'Tampa', lat: 27.9506, lng: -82.4572, priority: 9 },
  { id: 'miami', name: 'Miami', lat: 25.7617, lng: -80.1918, priority: 10 },
  { id: 'seattle', name: 'Seattle', lat: 47.6062, lng: -122.3321, priority: 11 },
  { id: 'jacksonville', name: 'Jacksonville', lat: 30.2824, lng: -81.5490, priority: 12 },

  // ── Other major, widely-recognized cities ──────────────────────────
  { id: 'new-york', name: 'New York', lat: 40.7580, lng: -73.9855, priority: 13 },
  { id: 'washington-dc', name: 'Washington DC', lat: 38.9072, lng: -77.0369, priority: 14 },
  { id: 'philadelphia', name: 'Philadelphia', lat: 39.9526, lng: -75.1652, priority: 15 },
  { id: 'boston', name: 'Boston', lat: 42.3601, lng: -71.0589, priority: 16 },
  { id: 'phoenix', name: 'Phoenix', lat: 33.4484, lng: -112.0740, priority: 17 },
  { id: 'san-antonio', name: 'San Antonio', lat: 29.4241, lng: -98.4936, priority: 18 },
  { id: 'san-diego', name: 'San Diego', lat: 32.7710, lng: -117.1664, priority: 19 },
  { id: 'austin', name: 'Austin', lat: 30.2672, lng: -97.7431, priority: 20 },
  { id: 'san-jose', name: 'San Jose', lat: 37.3382, lng: -121.8863, priority: 21 },
  { id: 'san-francisco', name: 'San Francisco', lat: 37.7749, lng: -122.4194, priority: 22 },
  { id: 'columbus', name: 'Columbus', lat: 39.9612, lng: -82.9988, priority: 23 },
  { id: 'indianapolis', name: 'Indianapolis', lat: 39.7684, lng: -86.1581, priority: 24 },
  { id: 'denver', name: 'Denver', lat: 39.7392, lng: -104.9903, priority: 25 },
  { id: 'detroit', name: 'Detroit', lat: 42.3314, lng: -83.0458, priority: 26 },
  { id: 'memphis', name: 'Memphis', lat: 35.1495, lng: -90.0490, priority: 27 },
  { id: 'portland', name: 'Portland', lat: 45.5155, lng: -122.6789, priority: 28 },
  { id: 'las-vegas', name: 'Las Vegas', lat: 36.1699, lng: -115.1398, priority: 29 },
  { id: 'baltimore', name: 'Baltimore', lat: 39.2904, lng: -76.6122, priority: 30 },
  { id: 'milwaukee', name: 'Milwaukee', lat: 43.0389, lng: -87.9065, priority: 31 },
  { id: 'albuquerque', name: 'Albuquerque', lat: 35.0844, lng: -106.6504, priority: 32 },
  { id: 'kansas-city', name: 'Kansas City', lat: 39.0997, lng: -94.5786, priority: 33 },
  { id: 'cleveland', name: 'Cleveland', lat: 41.4993, lng: -81.6944, priority: 34 },
  { id: 'virginia-beach', name: 'Virginia Beach', lat: 36.8529, lng: -75.9780, priority: 35 },
  { id: 'new-orleans', name: 'New Orleans', lat: 29.9511, lng: -90.0715, priority: 36 },
  { id: 'minneapolis', name: 'Minneapolis', lat: 44.9778, lng: -93.2650, priority: 37 },
  { id: 'pittsburgh', name: 'Pittsburgh', lat: 40.4406, lng: -79.9959, priority: 38 },
  { id: 'st-louis', name: 'St. Louis', lat: 38.6270, lng: -90.1994, priority: 39 },
  { id: 'cincinnati', name: 'Cincinnati', lat: 39.1031, lng: -84.5120, priority: 40 },

  // ── Notable cities sharing a metro with a bigger anchor above ──────
  { id: 'fort-lauderdale', name: 'Fort Lauderdale', lat: 26.1224, lng: -80.1373, priority: 41 },
  { id: 'west-palm-beach', name: 'West Palm Beach', lat: 26.7153, lng: -80.0534, priority: 42 },
  { id: 'st-petersburg', name: 'St. Petersburg', lat: 27.7676, lng: -82.6403, priority: 43 },

  // ── Smaller but still real, distinct cities ────────────────────────
  { id: 'raleigh', name: 'Raleigh', lat: 35.7796, lng: -78.6382, priority: 44 },
  { id: 'durham', name: 'Durham', lat: 35.9940, lng: -78.8986, priority: 45 },
  { id: 'greensboro', name: 'Greensboro', lat: 36.0726, lng: -79.7920, priority: 46 },
  { id: 'winston-salem', name: 'Winston-Salem', lat: 36.0999, lng: -80.2442, priority: 47 },
  { id: 'charleston', name: 'Charleston', lat: 32.7765, lng: -79.9311, priority: 48 },
  { id: 'columbia', name: 'Columbia', lat: 34.0007, lng: -81.0348, priority: 49 },
  { id: 'greenville', name: 'Greenville', lat: 34.8526, lng: -82.3940, priority: 50 },
  { id: 'savannah', name: 'Savannah', lat: 32.0809, lng: -81.0912, priority: 51 },
  { id: 'birmingham', name: 'Birmingham', lat: 33.5186, lng: -86.8104, priority: 52 },
  { id: 'huntsville', name: 'Huntsville', lat: 34.7304, lng: -86.5861, priority: 53 },
  { id: 'montgomery', name: 'Montgomery', lat: 32.3792, lng: -86.3077, priority: 54 },
  { id: 'mobile', name: 'Mobile', lat: 30.6954, lng: -88.0399, priority: 55 },
  { id: 'chattanooga', name: 'Chattanooga', lat: 35.0456, lng: -85.3097, priority: 56 },
  { id: 'knoxville', name: 'Knoxville', lat: 35.9606, lng: -83.9207, priority: 57 },
  { id: 'jackson', name: 'Jackson', lat: 32.2988, lng: -90.1848, priority: 58 },
  { id: 'baton-rouge', name: 'Baton Rouge', lat: 30.4515, lng: -91.1871, priority: 59 },
  { id: 'little-rock', name: 'Little Rock', lat: 34.7465, lng: -92.2896, priority: 60 },
  { id: 'fayetteville', name: 'Fayetteville', lat: 35.0527, lng: -78.8784, priority: 61 },
  { id: 'wilmington', name: 'Wilmington', lat: 34.2257, lng: -77.9447, priority: 62 },
  { id: 'el-paso', name: 'El Paso', lat: 31.7619, lng: -106.4850, priority: 63 },
  { id: 'lubbock', name: 'Lubbock', lat: 33.5779, lng: -101.8552, priority: 64 },
  { id: 'waco', name: 'Waco', lat: 31.5493, lng: -97.1467, priority: 65 },
  { id: 'college-station', name: 'College Station', lat: 30.6280, lng: -96.3344, priority: 66 },
  { id: 'corpus-christi', name: 'Corpus Christi', lat: 27.8006, lng: -97.3964, priority: 67 },
  { id: 'san-marcos', name: 'San Marcos', lat: 29.8833, lng: -97.9414, priority: 68 },
  { id: 'omaha', name: 'Omaha', lat: 41.2565, lng: -95.9345, priority: 69 },
  { id: 'des-moines', name: 'Des Moines', lat: 41.5868, lng: -93.6250, priority: 70 },
  { id: 'richmond', name: 'Richmond', lat: 37.5407, lng: -77.4360, priority: 71 },
  { id: 'norfolk', name: 'Norfolk', lat: 36.8508, lng: -76.2859, priority: 72 },
  { id: 'hartford', name: 'Hartford', lat: 41.7658, lng: -72.6734, priority: 73 },
  { id: 'colorado-springs', name: 'Colorado Springs', lat: 38.8339, lng: -104.8214, priority: 74 },
  { id: 'tucson', name: 'Tucson', lat: 32.2226, lng: -110.9747, priority: 75 },
  { id: 'salt-lake-city', name: 'Salt Lake City', lat: 40.7608, lng: -111.8910, priority: 76 },
  { id: 'boise', name: 'Boise', lat: 43.6150, lng: -116.2023, priority: 77 },

  // ── International (the supply chain also has restaurants here) ─────
  { id: 'toronto', name: 'Toronto', lat: 43.6703, lng: -79.3868, priority: 78 },
  { id: 'calgary', name: 'Calgary', lat: 51.0486, lng: -114.0708, priority: 79 },
  { id: 'edmonton', name: 'Edmonton', lat: 53.5461, lng: -113.4938, priority: 80 },
  { id: 'kitchener', name: 'Kitchener', lat: 43.4516, lng: -80.4925, priority: 81 },
  { id: 'windsor', name: 'Windsor', lat: 42.3149, lng: -83.0364, priority: 82 },
  { id: 'singapore', name: 'Singapore', lat: 1.3048, lng: 103.8318, priority: 83 },
  // Belfast, not either individual NI restaurant row (Lisburn/Templepatrick
  // are both ~10mi commuter towns of it) — same one-anchor-per-cluster call
  // as everywhere else in this file.
  { id: 'belfast', name: 'Belfast', lat: 54.5973, lng: -5.9301, priority: 84 },
  { id: 'leeds', name: 'Leeds', lat: 53.8008, lng: -1.5491, priority: 85 },
  // San Juan anchors Bayamón/Carolina too — both are immediate PR-metro suburbs.
  { id: 'san-juan', name: 'San Juan', lat: 18.4655, lng: -66.1057, priority: 86 },
];
