/**
 * Unit tests for entity lookup utilities in supplyChainData
 */

import {
  getLocationById,
  getOutboundRoutes,
  getInboundRoutes,
  buildSelectedEntity,
  allLocations,
  allRoutes,
} from './supplyChainData';

describe('getLocationById', () => {
  it('returns a location for a valid supplier ID', () => {
    const loc = getLocationById('sup-tyson');
    expect(loc).toBeDefined();
    expect(loc!.name).toContain('Tyson');
    expect(loc!.type).toBe('supplier');
  });

  it('returns a location for a valid DC ID', () => {
    const loc = getLocationById('dc-atlanta');
    expect(loc).toBeDefined();
    expect(loc!.type).toBe('dc');
  });

  it('returns a location for a valid restaurant ID', () => {
    const loc = getLocationById('rest-atl-001');
    expect(loc).toBeDefined();
    expect(loc!.type).toBe('restaurant');
  });

  it('returns undefined for an unknown ID', () => {
    expect(getLocationById('nonexistent')).toBeUndefined();
  });
});

describe('getOutboundRoutes', () => {
  it('returns outbound routes for a supplier', () => {
    const routes = getOutboundRoutes('sup-tyson');
    expect(routes.length).toBeGreaterThan(0);
    routes.forEach((r) => {
      expect(r.sourceId).toBe('sup-tyson');
      expect(r.routeType).toBe('supplier_to_dc');
    });
  });

  it('returns outbound routes for a DC', () => {
    const routes = getOutboundRoutes('dc-atlanta');
    expect(routes.length).toBeGreaterThan(0);
    routes.forEach((r) => {
      expect(r.sourceId).toBe('dc-atlanta');
      expect(r.routeType).toBe('dc_to_restaurant');
    });
  });

  it('returns empty array for a restaurant (no outbound routes)', () => {
    const routes = getOutboundRoutes('rest-atl-001');
    expect(routes).toHaveLength(0);
  });

  it('returns empty array for unknown ID', () => {
    expect(getOutboundRoutes('nonexistent')).toHaveLength(0);
  });
});

describe('getInboundRoutes', () => {
  it('returns inbound routes for a DC', () => {
    const routes = getInboundRoutes('dc-atlanta');
    expect(routes.length).toBeGreaterThan(0);
    routes.forEach((r) => {
      expect(r.destId).toBe('dc-atlanta');
      expect(r.routeType).toBe('supplier_to_dc');
    });
  });

  it('returns inbound routes for a restaurant', () => {
    const routes = getInboundRoutes('rest-atl-001');
    expect(routes.length).toBeGreaterThan(0);
    routes.forEach((r) => {
      expect(r.destId).toBe('rest-atl-001');
    });
  });

  it('returns empty array for a supplier (no inbound routes)', () => {
    const routes = getInboundRoutes('sup-tyson');
    expect(routes).toHaveLength(0);
  });
});

describe('buildSelectedEntity', () => {
  it('builds a SelectedSupplier with correct fields', () => {
    const loc = getLocationById('sup-tyson')!;
    const entity = buildSelectedEntity(loc);

    expect(entity.type).toBe('supplier');
    if (entity.type !== 'supplier') return;

    expect(entity.location).toBe(loc);
    expect(entity.dcCount).toBeGreaterThan(0);
    expect(entity.outboundRoutes.length).toBeGreaterThan(0);
    expect(entity.totalVolume).toBeGreaterThan(0);
  });

  it('builds a SelectedDC with inbound and outbound routes', () => {
    const loc = getLocationById('dc-atlanta')!;
    const entity = buildSelectedEntity(loc);

    expect(entity.type).toBe('dc');
    if (entity.type !== 'dc') return;

    expect(entity.inboundRoutes.length).toBeGreaterThan(0);
    expect(entity.outboundRoutes.length).toBeGreaterThan(0);
    expect(entity.totalInboundVolume).toBeGreaterThan(0);
    expect(entity.totalOutboundVolume).toBeGreaterThan(0);
  });

  it('builds a SelectedRestaurant with serving DCs', () => {
    const loc = getLocationById('rest-atl-001')!;
    const entity = buildSelectedEntity(loc);

    expect(entity.type).toBe('restaurant');
    if (entity.type !== 'restaurant') return;

    expect(entity.servingDCs.length).toBeGreaterThan(0);
    expect(entity.inboundRoutes.length).toBeGreaterThan(0);
    expect(entity.totalInboundVolume).toBeGreaterThan(0);
  });

  it('multi-DC restaurant lists multiple serving DCs', () => {
    // Nashville (rest-nas-001) is served by both Lebanon and Atlanta (overlap)
    const loc = getLocationById('rest-nas-001')!;
    const entity = buildSelectedEntity(loc);

    expect(entity.type).toBe('restaurant');
    if (entity.type !== 'restaurant') return;

    expect(entity.servingDCs.length).toBeGreaterThanOrEqual(2);
    expect(entity.inboundRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('supplier dcCount matches unique destination DCs', () => {
    const loc = getLocationById('sup-tyson')!;
    const entity = buildSelectedEntity(loc);

    if (entity.type !== 'supplier') return;

    const uniqueDCs = new Set(entity.outboundRoutes.map((r) => r.destId));
    expect(entity.dcCount).toBe(uniqueDCs.size);
  });

  it('DC total volumes match sum of route volumes', () => {
    const loc = getLocationById('dc-joliet')!;
    const entity = buildSelectedEntity(loc);

    if (entity.type !== 'dc') return;

    const inboundSum = entity.inboundRoutes.reduce((s, r) => s + r.volume, 0);
    const outboundSum = entity.outboundRoutes.reduce((s, r) => s + r.volume, 0);
    expect(entity.totalInboundVolume).toBe(inboundSum);
    expect(entity.totalOutboundVolume).toBe(outboundSum);
  });
});
