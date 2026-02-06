/**
 * Supply chain route mock data
 * Defines connections between suppliers, DCs, and restaurants
 *
 * Expanded to ~230 routes covering 10 DCs, 12 suppliers, and ~200 restaurants.
 * Multi-DC overlap routes enable "partially served" (orange) disruption state.
 */

import type { SupplyRoute } from '../components/Globe/types';

// ────────────────────────────────────────────────────────────────────────────
// Supplier → DC routes (~28)
//
// Concentration-risk profiles:
//   Tyson  ≈ 35 % (dominant, 6 DCs)        → HIGH
//   Koch   ≈ 15 % (sole-source to Joliet)   → MEDIUM
//   Perdue ≈ 12 %                            → MEDIUM
//   Pilgrims ≈  8 % (Fontana dominant)       → MEDIUM
//   Sanderson ≈ 8 % (Lakeland/Lebanon)       → MEDIUM
//   Others ≈ 22 % combined                   → LOW
// ────────────────────────────────────────────────────────────────────────────

export const supplierToDcRoutes: SupplyRoute[] = [
  // Tyson Foods — dominant supplier, feeds 6 DCs
  { id: 'route-s2d-001', sourceId: 'sup-tyson', destId: 'dc-atlanta', routeType: 'supplier_to_dc', volume: 6000, isActive: true },
  { id: 'route-s2d-002', sourceId: 'sup-tyson', destId: 'dc-dallas', routeType: 'supplier_to_dc', volume: 5500, isActive: true },
  { id: 'route-s2d-003', sourceId: 'sup-tyson', destId: 'dc-elgin', routeType: 'supplier_to_dc', volume: 4500, isActive: true },
  { id: 'route-s2d-004', sourceId: 'sup-tyson', destId: 'dc-mebane', routeType: 'supplier_to_dc', volume: 3500, isActive: true },
  { id: 'route-s2d-005', sourceId: 'sup-tyson', destId: 'dc-lebanon', routeType: 'supplier_to_dc', volume: 3000, isActive: true },
  { id: 'route-s2d-006', sourceId: 'sup-tyson', destId: 'dc-fontana', routeType: 'supplier_to_dc', volume: 2800, isActive: true },

  // Koch Foods — sole supplier to Joliet (0 diversification!)
  { id: 'route-s2d-007', sourceId: 'sup-koch', destId: 'dc-joliet', routeType: 'supplier_to_dc', volume: 8500, isActive: true },
  { id: 'route-s2d-008', sourceId: 'sup-koch', destId: 'dc-atlanta', routeType: 'supplier_to_dc', volume: 2500, isActive: true },
  { id: 'route-s2d-009', sourceId: 'sup-koch', destId: 'dc-cartersville', routeType: 'supplier_to_dc', volume: 1800, isActive: true },

  // Perdue Farms — dominates Conley, large share of Mebane
  { id: 'route-s2d-010', sourceId: 'sup-perdue', destId: 'dc-conley', routeType: 'supplier_to_dc', volume: 5500, isActive: true },
  { id: 'route-s2d-011', sourceId: 'sup-perdue', destId: 'dc-mebane', routeType: 'supplier_to_dc', volume: 5000, isActive: true },

  // Pilgrim's Pride — dominates Fontana (West Coast)
  { id: 'route-s2d-012', sourceId: 'sup-pilgrims', destId: 'dc-fontana', routeType: 'supplier_to_dc', volume: 5200, isActive: true },
  { id: 'route-s2d-013', sourceId: 'sup-pilgrims', destId: 'dc-dallas', routeType: 'supplier_to_dc', volume: 2000, isActive: true },

  // Wayne-Sanderson — dominates Lakeland (FL), feeds Lebanon
  { id: 'route-s2d-014', sourceId: 'sup-sanderson', destId: 'dc-lakeland', routeType: 'supplier_to_dc', volume: 4800, isActive: true },
  { id: 'route-s2d-015', sourceId: 'sup-sanderson', destId: 'dc-lebanon', routeType: 'supplier_to_dc', volume: 2200, isActive: true },
  { id: 'route-s2d-016', sourceId: 'sup-sanderson', destId: 'dc-conley', routeType: 'supplier_to_dc', volume: 1800, isActive: true },

  // Mar-Jac Poultry — regional GA supplier
  { id: 'route-s2d-017', sourceId: 'sup-marjac', destId: 'dc-atlanta', routeType: 'supplier_to_dc', volume: 2200, isActive: true },
  { id: 'route-s2d-018', sourceId: 'sup-marjac', destId: 'dc-cartersville', routeType: 'supplier_to_dc', volume: 1800, isActive: true },

  // Claxton Poultry — regional GA
  { id: 'route-s2d-019', sourceId: 'sup-claxton', destId: 'dc-conley', routeType: 'supplier_to_dc', volume: 2000, isActive: true },

  // Brakebush Chicken — Midwest
  { id: 'route-s2d-020', sourceId: 'sup-brakebush', destId: 'dc-joliet', routeType: 'supplier_to_dc', volume: 2500, isActive: true },
  { id: 'route-s2d-021', sourceId: 'sup-brakebush', destId: 'dc-lebanon', routeType: 'supplier_to_dc', volume: 1500, isActive: true },

  // Sysco — regional TX
  { id: 'route-s2d-022', sourceId: 'sup-sysco', destId: 'dc-elgin', routeType: 'supplier_to_dc', volume: 2500, isActive: true },
  { id: 'route-s2d-023', sourceId: 'sup-sysco', destId: 'dc-dallas', routeType: 'supplier_to_dc', volume: 2000, isActive: true },

  // Cargill — small footprint
  { id: 'route-s2d-024', sourceId: 'sup-cargill', destId: 'dc-mebane', routeType: 'supplier_to_dc', volume: 1500, isActive: true },

  // Flowers Foods — bakery products to SE
  { id: 'route-s2d-025', sourceId: 'sup-flowers', destId: 'dc-atlanta', routeType: 'supplier_to_dc', volume: 1800, isActive: true },
  { id: 'route-s2d-026', sourceId: 'sup-flowers', destId: 'dc-lakeland', routeType: 'supplier_to_dc', volume: 1200, isActive: true },

  // Americold — cold storage logistics
  { id: 'route-s2d-027', sourceId: 'sup-americold', destId: 'dc-conley', routeType: 'supplier_to_dc', volume: 1400, isActive: true },
  { id: 'route-s2d-028', sourceId: 'sup-americold', destId: 'dc-atlanta', routeType: 'supplier_to_dc', volume: 1200, isActive: true },
];

// ────────────────────────────────────────────────────────────────────────────
// DC → Restaurant routes
// Each DC serves restaurants in its geographic region.
// ~192 primary routes + ~15 multi-DC overlap routes for resilience.
// ────────────────────────────────────────────────────────────────────────────

let _routeCounter = 0;
function d2r(sourceId: string, destId: string, volume: number): SupplyRoute {
  _routeCounter++;
  const num = String(_routeCounter).padStart(3, '0');
  return { id: `route-d2r-${num}`, sourceId, destId, routeType: 'dc_to_restaurant' as const, volume, isActive: true };
}

// ── Atlanta DC — core Atlanta metro ─────────────────────────────────────
const atlantaDcRoutes: SupplyRoute[] = [
  d2r('dc-atlanta', 'rest-atl-001', 550),
  d2r('dc-atlanta', 'rest-atl-002', 620),
  d2r('dc-atlanta', 'rest-atl-003', 480),
  d2r('dc-atlanta', 'rest-atl-004', 420),
  d2r('dc-atlanta', 'rest-atl-005', 380),
  d2r('dc-atlanta', 'rest-atl-006', 400),
  d2r('dc-atlanta', 'rest-atl-007', 360),
  d2r('dc-atlanta', 'rest-atl-008', 340),
  d2r('dc-atlanta', 'rest-atl-009', 450),
  d2r('dc-atlanta', 'rest-atl-010', 320),
  d2r('dc-atlanta', 'rest-atl-011', 410),
  d2r('dc-atlanta', 'rest-atl-012', 280),
  d2r('dc-atlanta', 'rest-atl-013', 300),
];

// ── Conley DC — south Atlanta, Savannah, international ──────────────────
const conleyDcRoutes: SupplyRoute[] = [
  d2r('dc-conley', 'rest-atl-014', 450),
  d2r('dc-conley', 'rest-atl-015', 380),
  d2r('dc-conley', 'rest-atl-016', 340),
  d2r('dc-conley', 'rest-atl-017', 400),
  d2r('dc-conley', 'rest-atl-018', 360),
  d2r('dc-conley', 'rest-atl-019', 320),
  d2r('dc-conley', 'rest-atl-020', 380),
  d2r('dc-conley', 'rest-se-001', 420),   // Savannah
  // International (lower volume — long supply chains)
  d2r('dc-conley', 'rest-uk-001', 180),
  d2r('dc-conley', 'rest-uk-002', 150),
  d2r('dc-conley', 'rest-uk-003', 160),
  d2r('dc-conley', 'rest-sg-001', 120),
  d2r('dc-conley', 'rest-pr-001', 200),
  d2r('dc-conley', 'rest-pr-002', 180),
  d2r('dc-conley', 'rest-pr-003', 160),
];

// ── Cartersville DC — north Atlanta suburbs, north GA, east TN ──────────
const cartersvilleDcRoutes: SupplyRoute[] = [
  d2r('dc-cartersville', 'rest-atl-021', 350),
  d2r('dc-cartersville', 'rest-atl-022', 320),
  d2r('dc-cartersville', 'rest-atl-023', 280),
  d2r('dc-cartersville', 'rest-atl-024', 400),
  d2r('dc-cartersville', 'rest-atl-025', 360),
  d2r('dc-cartersville', 'rest-se-006', 380),  // Chattanooga
  d2r('dc-cartersville', 'rest-se-007', 340),  // Knoxville
];

// ── Mebane DC — Carolinas, Mid-Atlantic, Northeast ──────────────────────
const mebaneDcRoutes: SupplyRoute[] = [
  // Charlotte metro
  d2r('dc-mebane', 'rest-clt-001', 520),
  d2r('dc-mebane', 'rest-clt-002', 480),
  d2r('dc-mebane', 'rest-clt-003', 440),
  d2r('dc-mebane', 'rest-clt-004', 400),
  d2r('dc-mebane', 'rest-clt-005', 380),
  d2r('dc-mebane', 'rest-clt-006', 350),
  d2r('dc-mebane', 'rest-clt-007', 320),
  d2r('dc-mebane', 'rest-clt-008', 360),
  // Carolinas
  d2r('dc-mebane', 'rest-car-001', 550),
  d2r('dc-mebane', 'rest-car-002', 480),
  d2r('dc-mebane', 'rest-car-003', 420),
  d2r('dc-mebane', 'rest-car-004', 380),
  d2r('dc-mebane', 'rest-car-005', 340),
  d2r('dc-mebane', 'rest-car-006', 300),
  d2r('dc-mebane', 'rest-car-007', 350),
  d2r('dc-mebane', 'rest-car-008', 380),
  d2r('dc-mebane', 'rest-car-009', 360),
  // Northeast / Mid-Atlantic
  d2r('dc-mebane', 'rest-ne-001', 400),  // NYC Manhattan
  d2r('dc-mebane', 'rest-ne-002', 380),  // NYC Fulton
  d2r('dc-mebane', 'rest-ne-003', 350),  // Queens
  d2r('dc-mebane', 'rest-ne-004', 320),  // Long Island
  d2r('dc-mebane', 'rest-ne-005', 340),  // White Plains
  d2r('dc-mebane', 'rest-ne-006', 450),  // Philly
  d2r('dc-mebane', 'rest-ne-007', 380),  // King of Prussia
  d2r('dc-mebane', 'rest-ne-008', 400),  // Cherry Hill NJ
  d2r('dc-mebane', 'rest-ne-009', 280),  // Boston
  d2r('dc-mebane', 'rest-ne-011', 480),  // Baltimore
  d2r('dc-mebane', 'rest-ne-012', 520),  // DC
  d2r('dc-mebane', 'rest-ne-013', 450),  // Silver Spring
  d2r('dc-mebane', 'rest-ne-014', 420),  // VA Beach
  d2r('dc-mebane', 'rest-ne-015', 460),  // Richmond
  d2r('dc-mebane', 'rest-ne-016', 380),  // Norfolk
  d2r('dc-mebane', 'rest-ne-017', 300),  // Hartford
];

// ── Dallas DC — DFW metro, west TX, some west ───────────────────────────
const dallasDcRoutes: SupplyRoute[] = [
  d2r('dc-dallas', 'rest-dfw-001', 600),
  d2r('dc-dallas', 'rest-dfw-002', 550),
  d2r('dc-dallas', 'rest-dfw-003', 520),
  d2r('dc-dallas', 'rest-dfw-004', 480),
  d2r('dc-dallas', 'rest-dfw-005', 500),
  d2r('dc-dallas', 'rest-dfw-006', 460),
  d2r('dc-dallas', 'rest-dfw-007', 420),
  d2r('dc-dallas', 'rest-dfw-008', 440),
  d2r('dc-dallas', 'rest-dfw-009', 380),
  d2r('dc-dallas', 'rest-dfw-010', 480),
  d2r('dc-dallas', 'rest-dfw-011', 520),
  d2r('dc-dallas', 'rest-dfw-012', 360),
  d2r('dc-dallas', 'rest-dfw-013', 340),
  d2r('dc-dallas', 'rest-dfw-014', 300),
  d2r('dc-dallas', 'rest-dfw-015', 420),
  d2r('dc-dallas', 'rest-tx-004', 250),  // El Paso
  d2r('dc-dallas', 'rest-tx-005', 280),  // Lubbock
  d2r('dc-dallas', 'rest-tx-006', 350),  // Waco
  d2r('dc-dallas', 'rest-w-008', 220),   // Las Vegas
  d2r('dc-dallas', 'rest-w-009', 200),   // Henderson NV
];

// ── Elgin DC (TX) — Houston, south / central TX ─────────────────────────
const elginDcRoutes: SupplyRoute[] = [
  d2r('dc-elgin', 'rest-hou-001', 580),
  d2r('dc-elgin', 'rest-hou-002', 540),
  d2r('dc-elgin', 'rest-hou-003', 460),
  d2r('dc-elgin', 'rest-hou-004', 420),
  d2r('dc-elgin', 'rest-hou-005', 400),
  d2r('dc-elgin', 'rest-hou-006', 380),
  d2r('dc-elgin', 'rest-hou-007', 360),
  d2r('dc-elgin', 'rest-hou-008', 340),
  d2r('dc-elgin', 'rest-hou-009', 350),
  d2r('dc-elgin', 'rest-hou-010', 280),
  d2r('dc-elgin', 'rest-hou-011', 300),
  d2r('dc-elgin', 'rest-hou-012', 320),
  d2r('dc-elgin', 'rest-tx-001', 480),   // San Antonio
  d2r('dc-elgin', 'rest-tx-002', 550),   // Austin
  d2r('dc-elgin', 'rest-tx-003', 400),   // San Marcos
  d2r('dc-elgin', 'rest-tx-007', 360),   // College Station
  d2r('dc-elgin', 'rest-tx-008', 280),   // Corpus Christi
];

// ── Joliet DC — Chicago metro, Midwest, Ontario Canada ──────────────────
const jolietDcRoutes: SupplyRoute[] = [
  d2r('dc-joliet', 'rest-chi-001', 700),
  d2r('dc-joliet', 'rest-chi-002', 650),
  d2r('dc-joliet', 'rest-chi-003', 520),
  d2r('dc-joliet', 'rest-chi-004', 480),
  d2r('dc-joliet', 'rest-chi-005', 420),
  d2r('dc-joliet', 'rest-chi-006', 460),
  d2r('dc-joliet', 'rest-chi-007', 380),
  d2r('dc-joliet', 'rest-chi-008', 400),
  d2r('dc-joliet', 'rest-mw-001', 450),  // Indianapolis
  d2r('dc-joliet', 'rest-mw-002', 420),  // Columbus OH
  d2r('dc-joliet', 'rest-mw-003', 380),  // Cincinnati
  d2r('dc-joliet', 'rest-mw-004', 350),  // Detroit
  d2r('dc-joliet', 'rest-mw-005', 340),  // Milwaukee
  d2r('dc-joliet', 'rest-mw-006', 400),  // St. Louis
  d2r('dc-joliet', 'rest-mw-007', 360),  // Kansas City
  d2r('dc-joliet', 'rest-mw-008', 300),  // Minneapolis
  d2r('dc-joliet', 'rest-mw-009', 260),  // Omaha
  d2r('dc-joliet', 'rest-mw-010', 280),  // Des Moines
  d2r('dc-joliet', 'rest-mw-011', 350),  // Cleveland
  d2r('dc-joliet', 'rest-ne-010', 380),  // Pittsburgh
  d2r('dc-joliet', 'rest-can-001', 280), // Toronto Yonge
  d2r('dc-joliet', 'rest-can-002', 260), // Toronto Yorkdale
  d2r('dc-joliet', 'rest-can-003', 220), // Kitchener
  d2r('dc-joliet', 'rest-can-004', 240), // Windsor
];

// ── Lebanon DC (TN) — Nashville, deep south, mid-south ──────────────────
const lebanonDcRoutes: SupplyRoute[] = [
  d2r('dc-lebanon', 'rest-nas-001', 580),
  d2r('dc-lebanon', 'rest-nas-002', 520),
  d2r('dc-lebanon', 'rest-nas-003', 480),
  d2r('dc-lebanon', 'rest-nas-004', 420),
  d2r('dc-lebanon', 'rest-nas-005', 380),
  d2r('dc-lebanon', 'rest-nas-006', 360),
  d2r('dc-lebanon', 'rest-nas-007', 400),
  d2r('dc-lebanon', 'rest-se-002', 420),  // Birmingham
  d2r('dc-lebanon', 'rest-se-003', 380),  // Huntsville
  d2r('dc-lebanon', 'rest-se-004', 320),  // Montgomery
  d2r('dc-lebanon', 'rest-se-005', 280),  // Mobile
  d2r('dc-lebanon', 'rest-se-008', 450),  // Memphis
  d2r('dc-lebanon', 'rest-se-009', 340),  // Jackson MS
  d2r('dc-lebanon', 'rest-se-010', 300),  // New Orleans
  d2r('dc-lebanon', 'rest-se-011', 280),  // Baton Rouge
  d2r('dc-lebanon', 'rest-se-012', 320),  // Little Rock
];

// ── Fontana DC (CA) — Pacific, Mountain West, Alberta Canada ────────────
const fontanaDcRoutes: SupplyRoute[] = [
  // LA metro
  d2r('dc-fontana', 'rest-la-001', 580),
  d2r('dc-fontana', 'rest-la-002', 520),
  d2r('dc-fontana', 'rest-la-003', 480),
  d2r('dc-fontana', 'rest-la-004', 440),
  d2r('dc-fontana', 'rest-la-005', 500),
  d2r('dc-fontana', 'rest-la-006', 550),
  // San Diego
  d2r('dc-fontana', 'rest-sd-001', 420),
  d2r('dc-fontana', 'rest-sd-002', 380),
  d2r('dc-fontana', 'rest-sd-003', 340),
  // Bay Area
  d2r('dc-fontana', 'rest-sf-001', 350),
  d2r('dc-fontana', 'rest-sf-002', 320),
  d2r('dc-fontana', 'rest-sf-003', 380),
  // Pacific NW
  d2r('dc-fontana', 'rest-pnw-001', 280),
  d2r('dc-fontana', 'rest-pnw-002', 260),
  d2r('dc-fontana', 'rest-pnw-003', 300),
  // Mountain West
  d2r('dc-fontana', 'rest-w-001', 320),   // Denver
  d2r('dc-fontana', 'rest-w-002', 300),   // CO Springs
  d2r('dc-fontana', 'rest-w-003', 450),   // Phoenix Scottsdale
  d2r('dc-fontana', 'rest-w-004', 420),   // Phoenix Tempe
  d2r('dc-fontana', 'rest-w-005', 400),   // Phoenix Chandler
  d2r('dc-fontana', 'rest-w-006', 380),   // Phoenix Gilbert
  d2r('dc-fontana', 'rest-w-007', 340),   // Tucson
  d2r('dc-fontana', 'rest-w-010', 280),   // SLC
  d2r('dc-fontana', 'rest-w-011', 240),   // Boise
  d2r('dc-fontana', 'rest-w-012', 300),   // Albuquerque
  // Alberta
  d2r('dc-fontana', 'rest-can-005', 200),
  d2r('dc-fontana', 'rest-can-006', 180),
];

// ── Lakeland DC (FL) — all Florida ──────────────────────────────────────
const lakelandDcRoutes: SupplyRoute[] = [
  // Orlando
  d2r('dc-lakeland', 'rest-orl-001', 520),
  d2r('dc-lakeland', 'rest-orl-002', 480),
  d2r('dc-lakeland', 'rest-orl-003', 440),
  d2r('dc-lakeland', 'rest-orl-004', 420),
  d2r('dc-lakeland', 'rest-orl-005', 380),
  d2r('dc-lakeland', 'rest-orl-006', 360),
  // Tampa Bay
  d2r('dc-lakeland', 'rest-tpa-001', 500),
  d2r('dc-lakeland', 'rest-tpa-002', 460),
  d2r('dc-lakeland', 'rest-tpa-003', 420),
  d2r('dc-lakeland', 'rest-tpa-004', 380),
  d2r('dc-lakeland', 'rest-tpa-005', 400),
  // South Florida
  d2r('dc-lakeland', 'rest-mia-001', 380),
  d2r('dc-lakeland', 'rest-mia-002', 350),
  d2r('dc-lakeland', 'rest-mia-003', 400),
  d2r('dc-lakeland', 'rest-mia-004', 360),
  d2r('dc-lakeland', 'rest-mia-005', 340),
  // Jacksonville
  d2r('dc-lakeland', 'rest-jax-001', 420),
  d2r('dc-lakeland', 'rest-jax-002', 400),
  d2r('dc-lakeland', 'rest-jax-003', 380),
];

// ── Multi-DC overlap routes ─────────────────────────────────────────────
// Restaurants near regional borders served by a secondary DC for resilience.
// These enable "partially served" (orange) in disruption mode.
const overlapRoutes: SupplyRoute[] = [
  // Nashville — secondary from Atlanta DC (primary: Lebanon)
  d2r('dc-atlanta', 'rest-nas-001', 280),
  // Birmingham — secondary from Atlanta DC (primary: Lebanon)
  d2r('dc-atlanta', 'rest-se-002', 200),
  // Charlotte — secondary from Conley DC (primary: Mebane)
  d2r('dc-conley', 'rest-clt-001', 250),
  // Washington DC — secondary from Conley DC (primary: Mebane)
  d2r('dc-conley', 'rest-ne-012', 250),
  // Fort Worth — secondary from Elgin DC (primary: Dallas)
  d2r('dc-elgin', 'rest-dfw-011', 220),
  // Austin — secondary from Dallas DC (primary: Elgin)
  d2r('dc-dallas', 'rest-tx-002', 240),
  // Denver — secondary from Dallas DC (primary: Fontana)
  d2r('dc-dallas', 'rest-w-001', 180),
  // Indianapolis — secondary from Mebane DC (primary: Joliet)
  d2r('dc-mebane', 'rest-mw-001', 160),
  // St. Louis — secondary from Lebanon DC (primary: Joliet)
  d2r('dc-lebanon', 'rest-mw-006', 200),
  // Jacksonville — secondary from Conley DC (primary: Lakeland)
  d2r('dc-conley', 'rest-jax-001', 200),
  // Chattanooga — secondary from Lebanon DC (primary: Cartersville)
  d2r('dc-lebanon', 'rest-se-006', 220),
  // Pittsburgh — secondary from Mebane DC (primary: Joliet)
  d2r('dc-mebane', 'rest-ne-010', 220),
  // Toronto — secondary from Mebane DC (primary: Joliet)
  d2r('dc-mebane', 'rest-can-001', 180),
  // SLC — secondary from Dallas DC (primary: Fontana)
  d2r('dc-dallas', 'rest-w-010', 160),
  // Greenville SC — secondary from Conley DC (primary: Mebane)
  d2r('dc-conley', 'rest-car-009', 200),
];

export const dcToRestaurantRoutes: SupplyRoute[] = [
  ...atlantaDcRoutes,
  ...conleyDcRoutes,
  ...cartersvilleDcRoutes,
  ...mebaneDcRoutes,
  ...dallasDcRoutes,
  ...elginDcRoutes,
  ...jolietDcRoutes,
  ...lebanonDcRoutes,
  ...fontanaDcRoutes,
  ...lakelandDcRoutes,
  ...overlapRoutes,
];

/**
 * All routes combined
 */
export const allRoutes: SupplyRoute[] = [
  ...supplierToDcRoutes,
  ...dcToRestaurantRoutes,
];
