/**
 * Mock vehicle position data for dev mode (no API).
 *
 * Trucks are derived from the actual supply chain routes so they
 * travel between suppliers → DCs and DCs → restaurants, aligning
 * with the arc visualisation on the globe.
 */
import type { VehiclePosition } from './useVehiclePositions';
import { TRUCK_SIM_MINUTES_PER_TICK } from '../components/Globe/constants';
import { distributionCenters, suppliers, restaurants } from './supplyChainLocations';
import { supplierToDcRoutes, dcToRestaurantRoutes } from './supplyChainRoutes';

// ── Build a location lookup by ID ────────────────────────────────────
const locationById = new Map<string, { lat: number; lng: number; name: string }>();
for (const loc of [...distributionCenters, ...suppliers, ...restaurants]) {
  locationById.set(loc.id, { lat: loc.lat, lng: loc.lng, name: loc.name });
}

// ── Derive corridors from supply chain routes ────────────────────────
interface Corridor {
  name: string;
  waypoints: { lat: number; lng: number }[];
  count: number;
  originName: string;
  destinationName: string;
}

/**
 * Truck-count heuristic: scale volume to a reasonable number of trucks.
 * Supplier→DC routes have higher volumes → more trucks.
 * DC→Restaurant routes have lower volumes → 1–2 trucks each (but many routes).
 */
function truckCountForRoute(volume: number, routeType: string): number {
  if (routeType === 'supplier_to_dc') {
    // 1 truck per ~1500 units, minimum 1, max 5
    return Math.max(1, Math.min(5, Math.round(volume / 1500)));
  }
  // DC→restaurant: most routes get 1 truck, high-volume gets 2
  return volume >= 500 ? 2 : 1;
}

const CORRIDORS: Corridor[] = [];

// Supplier → DC corridors
for (const route of supplierToDcRoutes) {
  const src = locationById.get(route.sourceId);
  const dst = locationById.get(route.destId);
  if (!src || !dst) continue;
  CORRIDORS.push({
    name: `${route.sourceId}→${route.destId}`,
    waypoints: [src, dst],
    count: truckCountForRoute(route.volume, 'supplier_to_dc'),
    originName: src.name,
    destinationName: dst.name,
  });
}

// DC → Restaurant corridors (only domestic — skip very long international routes)
for (const route of dcToRestaurantRoutes) {
  const src = locationById.get(route.sourceId);
  const dst = locationById.get(route.destId);
  if (!src || !dst) continue;

  // Skip international routes (UK, Singapore, Canada, Puerto Rico) —
  // trucks don't literally drive across oceans
  const dstId = route.destId;
  if (dstId.startsWith('rest-uk-') || dstId.startsWith('rest-sg-') ||
      dstId.startsWith('rest-ca-') || dstId.startsWith('rest-pr-')) continue;

  CORRIDORS.push({
    name: `${route.sourceId}→${route.destId}`,
    waypoints: [src, dst],
    count: truckCountForRoute(route.volume, 'dc_to_restaurant'),
    originName: src.name,
    destinationName: dst.name,
  });
}

// ── Seeded PRNG (deterministic across sessions) ────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

// ── Build initial truck fleet ────────────────────────────────────────
interface TruckState {
  vp: VehiclePosition;
  corridorIdx: number;
  corridor: Corridor;
  dir: 1 | -1;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function headingBetween(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function positionOnCorridor(c: Corridor, idx: number) {
  const seg = Math.min(Math.floor(idx), c.waypoints.length - 2);
  const t = idx - seg;
  const a = c.waypoints[seg];
  const b = c.waypoints[Math.min(seg + 1, c.waypoints.length - 1)];
  return {
    lat: lerp(a.lat, b.lat, t),
    lng: lerp(a.lng, b.lng, t),
    heading: headingBetween(a.lat, a.lng, b.lat, b.lng),
  };
}

const trucks: TruckState[] = [];
let truckCounter = 0;

for (const corridor of CORRIDORS) {
  const totalSegs = corridor.waypoints.length - 1;
  for (let i = 0; i < corridor.count; i++) {
    truckCounter++;
    const id = `truck-${String(truckCounter).padStart(3, '0')}`;
    const corridorIdx = rand() * totalSegs;
    const pos = positionOnCorridor(corridor, corridorIdx);
    const speed = 45 + rand() * 30;

    const r = rand();
    const gpsStatus: VehiclePosition['gpsStatus'] = r < 0.85 ? 'live' : r < 0.95 ? 'stale' : 'lost';

    const jitterLat = (rand() - 0.5) * 0.02;
    const jitterLng = (rand() - 0.5) * 0.02;

    // Stagger route start times: 30 min to 4 hours ago
    const startedMinutesAgo = 30 + Math.floor(rand() * 210);
    const routeStartedAt = new Date(Date.now() - startedMinutesAgo * 60 * 1000).toISOString();

    trucks.push({
      corridorIdx,
      corridor,
      dir: rand() > 0.3 ? 1 : -1,
      vp: {
        vehicleId: id,
        lat: pos.lat + jitterLat,
        lng: pos.lng + jitterLng,
        heading: pos.heading,
        speedMph: Math.round(speed),
        recordedAt: new Date().toISOString(),
        gpsStatus,
        updatedAt: Date.now(),
        vehicleName: `CFA-${id.replace('truck-', 'T')}`,
        originName: corridor.originName,
        destinationName: corridor.destinationName,
        routeStartedAt,
      },
    });
  }
}

// ── Position map ─────────────────────────────────────────────────────
const _mockMap = new Map<string, VehiclePosition>();
for (const t of trucks) {
  _mockMap.set(t.vp.vehicleId, t.vp);
}

export function getMockVehiclePositions(): Map<string, VehiclePosition> {
  return _mockMap;
}

/**
 * Advance every truck along its corridor.
 * Call this on a timer to animate movement.
 */
export function tickMockVehicles(): Map<string, VehiclePosition> {
  const simMinutes = TRUCK_SIM_MINUTES_PER_TICK;

  for (const t of trucks) {
    if (t.vp.gpsStatus === 'lost') continue;

    const segs = t.corridor.waypoints.length - 1;
    const speed = t.vp.speedMph;
    const degPerTick = (speed / 60) * simMinutes / 69;
    const segA = t.corridor.waypoints[Math.floor(Math.min(t.corridorIdx, segs - 1))];
    const segB = t.corridor.waypoints[Math.min(Math.floor(t.corridorIdx) + 1, segs)];
    const segLen = Math.sqrt((segB.lat - segA.lat) ** 2 + (segB.lng - segA.lng) ** 2);
    const step = segLen > 0.01 ? degPerTick / segLen : 0.02;

    t.corridorIdx += step * t.dir;

    if (t.corridorIdx >= segs) {
      t.corridorIdx = segs - 0.01;
      t.dir = -1;
    } else if (t.corridorIdx < 0) {
      t.corridorIdx = 0.01;
      t.dir = 1;
    }

    const pos = positionOnCorridor(t.corridor, t.corridorIdx);
    t.vp.lat = pos.lat;
    t.vp.lng = pos.lng;
    t.vp.heading = t.dir === 1 ? pos.heading : (pos.heading + 180) % 360;
    t.vp.recordedAt = new Date().toISOString();
    t.vp.updatedAt = Date.now();
    t.vp.speedMph = Math.round(45 + rand() * 30);

    const flip = rand();
    if (t.vp.gpsStatus === 'live' && flip < 0.003) t.vp.gpsStatus = 'stale';
    else if (t.vp.gpsStatus === 'stale' && flip < 0.01) t.vp.gpsStatus = 'live';
  }

  const updated = new Map<string, VehiclePosition>();
  for (const t of trucks) {
    updated.set(t.vp.vehicleId, { ...t.vp });
  }
  return updated;
}
