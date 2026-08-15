/**
 * Backend API mocks for E2E runs. The app no longer ships frontend seed data or
 * a dev-mode fallback — all domain data comes from the Go API — so E2E stubs the
 * /api/v1 endpoints with a small representative topology instead of requiring a
 * running backend. Call mockApi(page) before page.goto().
 */
import type { Page } from '@playwright/test';

const locations = [
  { id: 'sup-1', name: 'Prairie Beef Co', lat: 41.2, lng: -95.9, type: 'supplier' },
  { id: 'sup-2', name: 'Golden Grain Bakery', lat: 39.1, lng: -94.6, type: 'supplier' },
  { id: 'dc-1', name: 'Kansas City DC', lat: 39.0, lng: -94.5, type: 'dc' },
  { id: 'rest-1', name: 'Store #1042', lat: 38.6, lng: -90.2, type: 'restaurant' },
  { id: 'rest-2', name: 'Store #2213', lat: 39.8, lng: -89.7, type: 'restaurant' },
];

const routes = [
  { id: 'r1', sourceId: 'sup-1', destId: 'dc-1', volume: 500 },
  { id: 'r2', sourceId: 'sup-2', destId: 'dc-1', volume: 300 },
  { id: 'r3', sourceId: 'dc-1', destId: 'rest-1', volume: 400 },
  { id: 'r4', sourceId: 'dc-1', destId: 'rest-2', volume: 400 },
];

const networkRisk = {
  networkDiversificationScore: 62,
  hhi: 0.4531,
  supplierRisks: [
    { supplierId: 'sup-1', name: 'Prairie Beef Co', totalVolume: 500, volumeShare: 62.5, riskScore: 62.5, riskLevel: 'high' },
    { supplierId: 'sup-2', name: 'Golden Grain Bakery', totalVolume: 300, volumeShare: 37.5, riskScore: 37.5, riskLevel: 'medium' },
  ],
  dcDiversification: [
    {
      dcId: 'dc-1',
      name: 'Kansas City DC',
      supplierCount: 2,
      diversificationScore: 53,
      supplierBreakdown: [
        { supplierId: 'sup-1', name: 'Prairie Beef Co', volumeShare: 62.5 },
        { supplierId: 'sup-2', name: 'Golden Grain Bakery', volumeShare: 37.5 },
      ],
    },
  ],
  restaurantRisks: [
    { restaurantId: 'rest-1', name: 'Store #1042', servingDcId: 'dc-1', dcDiversificationScore: 53, riskScore: 47, riskLevel: 'medium' },
    { restaurantId: 'rest-2', name: 'Store #2213', servingDcId: 'dc-1', dcDiversificationScore: 53, riskScore: 47, riskLevel: 'medium' },
  ],
};

/**
 * Vehicles spread across the visible face with distinct headings, so the truck
 * layer has something to render and orient.
 */
export const vehiclePositions = Array.from({ length: 6 }, (_, i) => ({
  vehicleId: `veh-${i}`,
  vehicleName: `Truck ${i + 1}`,
  lat: 35 + (i % 3) * 3.5,
  lng: -100 + Math.floor(i / 3) * 9 + (i % 3) * 3,
  heading: i * 60,
  speedMph: 55,
  recordedAt: new Date().toISOString(),
  gpsStatus: ['live', 'stale', 'lost'][i % 3],
  originName: 'Kansas City DC',
  destinationName: 'Store #1042',
}));

export async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/v1/supply-chain/visualization', (route) =>
    route.fulfill({ json: { locations, routes } }),
  );

  await page.route('**/api/v1/risk/network', (route) => route.fulfill({ json: networkRisk }));

  await page.route('**/api/v1/disruption/simulate', (route) => {
    const { disabledIds = [] } = route.request().postDataJSON() ?? {};
    return route.fulfill({
      json: {
        disabledCount: disabledIds.length,
        disabledNodes: disabledIds,
        affectedRouteCount: disabledIds.length > 0 ? 2 : 0,
        orphanedRestaurants: [],
        partiallyServedRestaurants: [],
      },
    });
  });

  await page.route('**/api/v1/entities/*', (route) => {
    const id = route.request().url().split('/').pop();
    const location = locations.find((l) => l.id === id);
    if (!location) return route.fulfill({ status: 404, json: { error: 'not found' } });
    return route.fulfill({ json: { type: location.type, location } });
  });

  await page.route('**/api/v1/vehicles/**', (route) =>
    route.fulfill({
      json: { originLat: 39.0, originLng: -94.5, destinationLat: 38.6, destinationLng: -90.2 },
    }),
  );

  // Registered last so it wins over the catch-all above — Playwright matches
  // the most recently registered route first.
  await page.route('**/api/v1/vehicles/positions', (route) =>
    route.fulfill({ json: vehiclePositions }),
  );
}
