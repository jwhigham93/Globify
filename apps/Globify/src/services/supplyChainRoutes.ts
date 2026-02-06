/**
 * Supply chain route mock data
 * Defines connections between suppliers, DCs, and restaurants
 */

import type { SupplyRoute } from '../components/Globe/types';

/**
 * Supplier → DC routes
 * Each supplier serves multiple DCs
 */
export const supplierToDcRoutes: SupplyRoute[] = [
  // Tyson Foods (Arkansas) - serves southern DCs
  { id: 'route-s2d-001', sourceId: 'sup-tyson', destId: 'dc-atlanta', routeType: 'supplier_to_dc', volume: 5000, isActive: true },
  { id: 'route-s2d-002', sourceId: 'sup-tyson', destId: 'dc-dallas', routeType: 'supplier_to_dc', volume: 4500, isActive: true },
  { id: 'route-s2d-003', sourceId: 'sup-tyson', destId: 'dc-elgin', routeType: 'supplier_to_dc', volume: 3500, isActive: true },
  
  // Cargill (Minnesota) - serves northern DCs
  { id: 'route-s2d-004', sourceId: 'sup-cargill', destId: 'dc-joliet', routeType: 'supplier_to_dc', volume: 4000, isActive: true },
  { id: 'route-s2d-005', sourceId: 'sup-cargill', destId: 'dc-mebane', routeType: 'supplier_to_dc', volume: 2500, isActive: true },
  
  // Sysco (Texas) - serves Texas DCs primarily
  { id: 'route-s2d-006', sourceId: 'sup-sysco', destId: 'dc-dallas', routeType: 'supplier_to_dc', volume: 3800, isActive: true },
  { id: 'route-s2d-007', sourceId: 'sup-sysco', destId: 'dc-elgin', routeType: 'supplier_to_dc', volume: 4200, isActive: true },
  
  // Koch Foods (Illinois) - serves midwest and south
  { id: 'route-s2d-008', sourceId: 'sup-koch', destId: 'dc-joliet', routeType: 'supplier_to_dc', volume: 5500, isActive: true },
  { id: 'route-s2d-009', sourceId: 'sup-koch', destId: 'dc-atlanta', routeType: 'supplier_to_dc', volume: 3000, isActive: true },
  { id: 'route-s2d-010', sourceId: 'sup-koch', destId: 'dc-conley', routeType: 'supplier_to_dc', volume: 2800, isActive: true },
  
  // Perdue Farms (Maryland) - serves east coast
  { id: 'route-s2d-011', sourceId: 'sup-perdue', destId: 'dc-mebane', routeType: 'supplier_to_dc', volume: 4800, isActive: true },
  { id: 'route-s2d-012', sourceId: 'sup-perdue', destId: 'dc-conley', routeType: 'supplier_to_dc', volume: 3200, isActive: true },
  { id: 'route-s2d-013', sourceId: 'sup-perdue', destId: 'dc-atlanta', routeType: 'supplier_to_dc', volume: 2000, isActive: true },
];

/**
 * DC → Restaurant routes
 * Each DC serves restaurants in its region
 */
export const dcToRestaurantRoutes: SupplyRoute[] = [
  // Atlanta DC - Southeast
  { id: 'route-d2r-001', sourceId: 'dc-atlanta', destId: 'rest-004', routeType: 'dc_to_restaurant', volume: 450, isActive: true },
  { id: 'route-d2r-002', sourceId: 'dc-atlanta', destId: 'rest-005', routeType: 'dc_to_restaurant', volume: 380, isActive: true },
  { id: 'route-d2r-003', sourceId: 'dc-atlanta', destId: 'rest-006', routeType: 'dc_to_restaurant', volume: 520, isActive: true },
  { id: 'route-d2r-004', sourceId: 'dc-atlanta', destId: 'rest-007', routeType: 'dc_to_restaurant', volume: 400, isActive: true },
  { id: 'route-d2r-005', sourceId: 'dc-atlanta', destId: 'rest-008', routeType: 'dc_to_restaurant', volume: 320, isActive: true },
  { id: 'route-d2r-006', sourceId: 'dc-atlanta', destId: 'rest-009', routeType: 'dc_to_restaurant', volume: 280, isActive: true },
  
  // Dallas DC - Texas & Southwest
  { id: 'route-d2r-007', sourceId: 'dc-dallas', destId: 'rest-011', routeType: 'dc_to_restaurant', volume: 600, isActive: true },
  { id: 'route-d2r-008', sourceId: 'dc-dallas', destId: 'rest-012', routeType: 'dc_to_restaurant', volume: 480, isActive: true },
  { id: 'route-d2r-009', sourceId: 'dc-dallas', destId: 'rest-014', routeType: 'dc_to_restaurant', volume: 420, isActive: true },
  { id: 'route-d2r-010', sourceId: 'dc-dallas', destId: 'rest-015', routeType: 'dc_to_restaurant', volume: 250, isActive: true },
  { id: 'route-d2r-011', sourceId: 'dc-dallas', destId: 'rest-031', routeType: 'dc_to_restaurant', volume: 350, isActive: true },
  { id: 'route-d2r-012', sourceId: 'dc-dallas', destId: 'rest-032', routeType: 'dc_to_restaurant', volume: 300, isActive: true },
  
  // Mebane DC - East Coast
  { id: 'route-d2r-013', sourceId: 'dc-mebane', destId: 'rest-001', routeType: 'dc_to_restaurant', volume: 550, isActive: true },
  { id: 'route-d2r-014', sourceId: 'dc-mebane', destId: 'rest-002', routeType: 'dc_to_restaurant', volume: 480, isActive: true },
  { id: 'route-d2r-015', sourceId: 'dc-mebane', destId: 'rest-010', routeType: 'dc_to_restaurant', volume: 320, isActive: true },
  { id: 'route-d2r-016', sourceId: 'dc-mebane', destId: 'rest-024', routeType: 'dc_to_restaurant', volume: 700, isActive: true },
  { id: 'route-d2r-017', sourceId: 'dc-mebane', destId: 'rest-025', routeType: 'dc_to_restaurant', volume: 520, isActive: true },
  { id: 'route-d2r-018', sourceId: 'dc-mebane', destId: 'rest-026', routeType: 'dc_to_restaurant', volume: 380, isActive: true },
  { id: 'route-d2r-019', sourceId: 'dc-mebane', destId: 'rest-027', routeType: 'dc_to_restaurant', volume: 290, isActive: true },
  { id: 'route-d2r-020', sourceId: 'dc-mebane', destId: 'rest-028', routeType: 'dc_to_restaurant', volume: 340, isActive: true },
  { id: 'route-d2r-021', sourceId: 'dc-mebane', destId: 'rest-029', routeType: 'dc_to_restaurant', volume: 620, isActive: true },
  
  // Joliet DC - Midwest
  { id: 'route-d2r-022', sourceId: 'dc-joliet', destId: 'rest-016', routeType: 'dc_to_restaurant', volume: 750, isActive: true },
  { id: 'route-d2r-023', sourceId: 'dc-joliet', destId: 'rest-017', routeType: 'dc_to_restaurant', volume: 420, isActive: true },
  { id: 'route-d2r-024', sourceId: 'dc-joliet', destId: 'rest-018', routeType: 'dc_to_restaurant', volume: 380, isActive: true },
  { id: 'route-d2r-025', sourceId: 'dc-joliet', destId: 'rest-019', routeType: 'dc_to_restaurant', volume: 450, isActive: true },
  { id: 'route-d2r-026', sourceId: 'dc-joliet', destId: 'rest-020', routeType: 'dc_to_restaurant', volume: 320, isActive: true },
  { id: 'route-d2r-027', sourceId: 'dc-joliet', destId: 'rest-021', routeType: 'dc_to_restaurant', volume: 400, isActive: true },
  { id: 'route-d2r-028', sourceId: 'dc-joliet', destId: 'rest-022', routeType: 'dc_to_restaurant', volume: 350, isActive: true },
  { id: 'route-d2r-029', sourceId: 'dc-joliet', destId: 'rest-023', routeType: 'dc_to_restaurant', volume: 280, isActive: true },
  
  // Elgin DC (TX) - Texas & West
  { id: 'route-d2r-030', sourceId: 'dc-elgin', destId: 'rest-013', routeType: 'dc_to_restaurant', volume: 580, isActive: true },
  { id: 'route-d2r-031', sourceId: 'dc-elgin', destId: 'rest-030', routeType: 'dc_to_restaurant', volume: 420, isActive: true },
  { id: 'route-d2r-032', sourceId: 'dc-elgin', destId: 'rest-033', routeType: 'dc_to_restaurant', volume: 650, isActive: true },
  { id: 'route-d2r-033', sourceId: 'dc-elgin', destId: 'rest-034', routeType: 'dc_to_restaurant', volume: 480, isActive: true },
  { id: 'route-d2r-034', sourceId: 'dc-elgin', destId: 'rest-035', routeType: 'dc_to_restaurant', volume: 520, isActive: true },
  { id: 'route-d2r-035', sourceId: 'dc-elgin', destId: 'rest-036', routeType: 'dc_to_restaurant', volume: 380, isActive: true },
  { id: 'route-d2r-036', sourceId: 'dc-elgin', destId: 'rest-037', routeType: 'dc_to_restaurant', volume: 290, isActive: true },
  { id: 'route-d2r-037', sourceId: 'dc-elgin', destId: 'rest-038', routeType: 'dc_to_restaurant', volume: 250, isActive: true },
  
  // Conley DC - Southeast & International
  { id: 'route-d2r-038', sourceId: 'dc-conley', destId: 'rest-003', routeType: 'dc_to_restaurant', volume: 520, isActive: true },
  // International routes (longer supply chains, lower volume due to distance)
  { id: 'route-d2r-039', sourceId: 'dc-conley', destId: 'rest-039', routeType: 'dc_to_restaurant', volume: 180, isActive: true },
  { id: 'route-d2r-040', sourceId: 'dc-conley', destId: 'rest-040', routeType: 'dc_to_restaurant', volume: 150, isActive: true },
  { id: 'route-d2r-041', sourceId: 'dc-conley', destId: 'rest-041', routeType: 'dc_to_restaurant', volume: 220, isActive: true },
  { id: 'route-d2r-042', sourceId: 'dc-conley', destId: 'rest-042', routeType: 'dc_to_restaurant', volume: 200, isActive: true },
  { id: 'route-d2r-043', sourceId: 'dc-conley', destId: 'rest-043', routeType: 'dc_to_restaurant', volume: 160, isActive: true },
  { id: 'route-d2r-044', sourceId: 'dc-conley', destId: 'rest-044', routeType: 'dc_to_restaurant', volume: 180, isActive: true },
  { id: 'route-d2r-045', sourceId: 'dc-conley', destId: 'rest-045', routeType: 'dc_to_restaurant', volume: 140, isActive: true },

  // ── Multi-DC overlap routes ──────────────────────────────────────────────
  // Some restaurants near regional borders are served by two DCs for redundancy.
  // These enable the "partially served" (orange) state in disruption simulation.

  // Nashville — also served by Atlanta DC (primary: Conley)
  { id: 'route-d2r-046', sourceId: 'dc-atlanta', destId: 'rest-003', routeType: 'dc_to_restaurant', volume: 280, isActive: true },
  // Charleston — also served by Atlanta DC (primary: Mebane)
  { id: 'route-d2r-047', sourceId: 'dc-atlanta', destId: 'rest-010', routeType: 'dc_to_restaurant', volume: 200, isActive: true },
  // Birmingham — also served by Conley DC (primary: Atlanta)
  { id: 'route-d2r-048', sourceId: 'dc-conley', destId: 'rest-008', routeType: 'dc_to_restaurant', volume: 180, isActive: true },
  // Fort Worth — also served by Elgin DC (primary: Dallas)
  { id: 'route-d2r-049', sourceId: 'dc-elgin', destId: 'rest-014', routeType: 'dc_to_restaurant', volume: 220, isActive: true },
  // Austin — also served by Dallas DC (primary: Elgin)
  { id: 'route-d2r-050', sourceId: 'dc-dallas', destId: 'rest-013', routeType: 'dc_to_restaurant', volume: 240, isActive: true },
  // Denver — also served by Dallas DC (primary: Elgin)
  { id: 'route-d2r-051', sourceId: 'dc-dallas', destId: 'rest-030', routeType: 'dc_to_restaurant', volume: 180, isActive: true },
  // Indianapolis — also served by Mebane DC (primary: Joliet)
  { id: 'route-d2r-052', sourceId: 'dc-mebane', destId: 'rest-017', routeType: 'dc_to_restaurant', volume: 160, isActive: true },
  // St. Louis — also served by Atlanta DC (primary: Joliet)
  { id: 'route-d2r-053', sourceId: 'dc-atlanta', destId: 'rest-021', routeType: 'dc_to_restaurant', volume: 200, isActive: true },
  // Washington DC — also served by Conley DC (primary: Mebane)
  { id: 'route-d2r-054', sourceId: 'dc-conley', destId: 'rest-029', routeType: 'dc_to_restaurant', volume: 250, isActive: true },
];

/**
 * All routes combined
 */
export const allRoutes: SupplyRoute[] = [
  ...supplierToDcRoutes,
  ...dcToRestaurantRoutes,
];
