## Entity Detail Panel Spec

### Behaviour

| User Action | Result |
|---|---|
| Click supplier marker (standard/risk mode) | Panel slides in on the left showing supplier details |
| Click DC marker (standard/risk mode) | Panel slides in showing DC details |
| Click restaurant marker (standard/risk mode) | Panel slides in showing restaurant details |
| Click same marker again | Panel closes (toggle) |
| Click a different marker | Panel updates to new entity |
| Switch view mode | Panel closes automatically |
| Click ✕ button | Panel closes |
| Click marker in disruption mode | Disruption toggle (no inspect panel) |

### Supplier Panel Content
- Header: ▲ icon, supplier name, "Supplier" label, coordinates
- Metrics: DCs Served, Routes count, Volume / Wk
- Route list: each outbound route with → arrow, destination name, volume

### DC Panel Content
- Header: ■ icon, DC name, "Distribution Center" label, coordinates
- Metrics (row 1): Suppliers count, Restaurants count
- Metrics (row 2): Inbound / Wk, Outbound / Wk
- Inbound route list: ← arrow, supplier name, volume
- Outbound route list: → arrow, restaurant name, volume

### Restaurant Panel Content
- Header: ● icon, restaurant name, "Restaurant" label, coordinates
- Metrics: Serving DCs count, Volume / Wk
- Serving DCs list: ← arrow, DC name
- Inbound route list: ← arrow, source name, volume

### Visual Design
- Position: top-left (20px inset), 270px wide, max 75% height
- Background: rgba(0, 0, 0, 0.88) with 12px border-radius
- Border color: entity accent color at 27% opacity
- Accent colours: supplier=#FF9933, DC=#44AADD, restaurant=#FF2244
- Metric boxes: white text, 18px value, 8px uppercase label
- Route rows: arrow (accent coloured), white name, grey volume

### Test Coverage
- 17 unit tests in `entityLookup.spec.ts`
- Covers: getLocationById, getOutboundRoutes, getInboundRoutes, buildSelectedEntity
- Integration: verified all 87 service tests pass (including existing disruption, risk, concentration tests)
