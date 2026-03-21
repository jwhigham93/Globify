## Tasks

### 1. Add SelectedEntity types — ✅ DONE
- [x] Add `SelectedSupplier`, `SelectedDC`, `SelectedRestaurant`, `SelectedRoute` interfaces to `types.ts`
- [x] Add `SelectedEntity` discriminated union type
- File: `apps/Globify/src/components/Globe/types.ts`

### 2. Add entity lookup utilities — ✅ DONE
- [x] Add `getLocationById()`, `getOutboundRoutes()`, `getInboundRoutes()` to `supplyChainData.ts`
- [x] Add `buildSelectedEntity()` factory function that assembles the full SelectedEntity with connected routes and metrics
- File: `apps/Globify/src/services/supplyChainData.ts`

### 3. Create EntityDetailPanel component — ✅ DONE
- [x] Create `EntityDetailPanel.tsx` with sub-panels for each entity type
- [x] SupplierDetail: DCs served, total volume, outbound routes
- [x] DCDetail: inbound/outbound counts, volume in/out, supplier and restaurant route lists
- [x] RestaurantDetail: serving DCs, total volume, inbound routes
- [x] Header with entity icon, name, type label, close button, and coordinates
- [x] Styled consistent with existing panels (dark glass, accent colors)
- File: `apps/Globify/src/components/Globe/EntityDetailPanel.tsx`

### 4. Wire up click handler for all modes — ✅ DONE
- [x] Update `handlePointClick` in GlobeVisualization to handle both disruption toggling and entity inspection
- [x] Always pass `onPointClick` to GlobeScene (not just in disruption mode)
- [x] Close inspect panel when switching view modes
- [x] Toggle behavior: clicking same entity again closes the panel
- [x] Hide inspect panel in disruption mode
- File: `apps/Globify/src/components/Globe/GlobeVisualization.tsx`

### 5. Write tests for entity lookup utilities — ✅ DONE
- [x] Tests for `getLocationById` (valid supplier/DC/restaurant, unknown ID)
- [x] Tests for `getOutboundRoutes` (supplier, DC, restaurant, unknown)
- [x] Tests for `getInboundRoutes` (DC, restaurant, supplier)
- [x] Tests for `buildSelectedEntity` (supplier with dcCount, DC with inbound/outbound, restaurant with serving DCs, multi-DC restaurant, volume sums)
- File: `apps/Globify/src/services/entityLookup.spec.ts`
- Result: 17/17 tests passing

### Deferred
- [ ] Arc click interaction (raycasting thin curved lines is unreliable with three-globe)
- [ ] Mobile bottom sheet variant (current panel works on web; mobile adaptation deferred)
