package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/db"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/disruption"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/risk"
)

// Handlers holds dependencies for HTTP handler functions.
type Handlers struct {
	queries *db.Queries
	pool    *pgxpool.Pool
}

// NewHandlers creates a new Handlers with the given database connection.
func NewHandlers(pool *pgxpool.Pool) *Handlers {
	return &Handlers{
		queries: db.New(pool),
		pool:    pool,
	}
}

// ListLocations handles GET /api/v1/locations
func (h *Handlers) ListLocations(w http.ResponseWriter, r *http.Request) {
	typeFilter := r.URL.Query().Get("type")

	var (
		dbLocs []db.Location
		err    error
	)

	if typeFilter != "" {
		dbLocs, err = h.queries.ListLocationsByType(r.Context(), db.LocationType(typeFilter))
	} else {
		dbLocs, err = h.queries.ListLocations(r.Context())
	}
	if err != nil {
		log.Error().Err(err).Msg("failed to list locations")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	locs := make([]models.Location, len(dbLocs))
	for i, l := range dbLocs {
		locs[i] = toModelLocation(l)
	}

	writeJSON(w, http.StatusOK, locs)
}

// GetLocation handles GET /api/v1/locations/{id}
func (h *Handlers) GetLocation(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	dbLoc, err := h.queries.GetLocation(r.Context(), id)
	if err != nil {
		log.Debug().Err(err).Str("id", id).Msg("location not found")
		writeError(w, http.StatusNotFound, "location not found")
		return
	}

	writeJSON(w, http.StatusOK, toModelLocation(dbLoc))
}

// ListRoutes handles GET /api/v1/routes
func (h *Handlers) ListRoutes(w http.ResponseWriter, r *http.Request) {
	routeTypeFilter := r.URL.Query().Get("routeType")

	var (
		dbRoutes []db.SupplyRoute
		err      error
	)

	if routeTypeFilter != "" {
		dbRoutes, err = h.queries.ListRoutesByType(r.Context(), db.RouteType(routeTypeFilter))
	} else {
		dbRoutes, err = h.queries.ListRoutes(r.Context())
	}
	if err != nil {
		log.Error().Err(err).Msg("failed to list routes")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	routes := make([]models.SupplyRoute, len(dbRoutes))
	for i, r := range dbRoutes {
		routes[i] = toModelRoute(r)
	}

	writeJSON(w, http.StatusOK, routes)
}

// GetVisualizationData handles GET /api/v1/supply-chain/visualization
func (h *Handlers) GetVisualizationData(w http.ResponseWriter, r *http.Request) {
	dbLocs, err := h.queries.ListLocations(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to list locations for visualization")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	dbRoutes, err := h.queries.ListActiveRoutes(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to list routes for visualization")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	locs := make([]models.Location, len(dbLocs))
	for i, l := range dbLocs {
		locs[i] = toModelLocation(l)
	}

	routes := make([]models.SupplyRoute, len(dbRoutes))
	for i, r := range dbRoutes {
		routes[i] = toModelRoute(r)
	}

	writeJSON(w, http.StatusOK, models.VisualizationData{
		Locations: locs,
		Routes:    routes,
	})
}

// GetNetworkRiskMetrics handles GET /api/v1/risk/network
func (h *Handlers) GetNetworkRiskMetrics(w http.ResponseWriter, r *http.Request) {
	dbLocs, err := h.queries.ListLocations(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to load locations for risk")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	dbRoutes, err := h.queries.ListRoutes(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to load routes for risk")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	locs := toModelLocations(dbLocs)
	routes := toModelRoutes(dbRoutes)
	metrics := risk.ComputeNetworkRiskMetrics(routes, locs)

	writeJSON(w, http.StatusOK, metrics)
}

// SimulateDisruption handles POST /api/v1/disruption/simulate
func (h *Handlers) SimulateDisruption(w http.ResponseWriter, r *http.Request) {
	var req models.DisruptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	dbLocs, err := h.queries.ListLocations(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to load locations for disruption")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	dbRoutes, err := h.queries.ListRoutes(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to load routes for disruption")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	locs := toModelLocations(dbLocs)
	routes := toModelRoutes(dbRoutes)
	metrics := disruption.ComputeDisruptionMetrics(req.DisabledIDs, routes, locs)

	writeJSON(w, http.StatusOK, metrics)
}

// GetEntityDetail handles GET /api/v1/entities/{id}
func (h *Handlers) GetEntityDetail(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	dbLoc, err := h.queries.GetLocation(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "entity not found")
		return
	}

	location := toModelLocation(dbLoc)

	// Fetch all routes for this entity.
	inbound, err := h.queries.ListRoutesByDestId(r.Context(), id)
	if err != nil {
		log.Error().Err(err).Msg("failed to fetch inbound routes")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	outbound, err := h.queries.ListRoutesBySourceId(r.Context(), id)
	if err != nil {
		log.Error().Err(err).Msg("failed to fetch outbound routes")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	inboundRoutes := toModelRoutes(inbound)
	outboundRoutes := toModelRoutes(outbound)

	switch location.Type {
	case models.LocationTypeSupplier:
		dcIDs := make(map[string]struct{})
		for _, r := range outboundRoutes {
			dcIDs[r.DestID] = struct{}{}
		}
		writeJSON(w, http.StatusOK, models.SelectedSupplier{
			Type:           "supplier",
			Location:       location,
			DCCount:        len(dcIDs),
			OutboundRoutes: outboundRoutes,
			TotalVolume:    sumVolume(outboundRoutes),
		})

	case models.LocationTypeDC:
		writeJSON(w, http.StatusOK, models.SelectedDC{
			Type:                "dc",
			Location:            location,
			InboundRoutes:       inboundRoutes,
			OutboundRoutes:      outboundRoutes,
			TotalInboundVolume:  sumVolume(inboundRoutes),
			TotalOutboundVolume: sumVolume(outboundRoutes),
		})

	case models.LocationTypeRestaurant:
		// Resolve serving DC names.
		dcNameSet := make(map[string]struct{})
		for _, route := range inboundRoutes {
			dcLoc, err := h.queries.GetLocation(r.Context(), route.SourceID)
			if err == nil {
				dcNameSet[dcLoc.Name] = struct{}{}
			}
		}
		servingDCs := make([]string, 0, len(dcNameSet))
		for name := range dcNameSet {
			servingDCs = append(servingDCs, name)
		}

		writeJSON(w, http.StatusOK, models.SelectedRestaurant{
			Type:               "restaurant",
			Location:           location,
			InboundRoutes:      inboundRoutes,
			TotalInboundVolume: sumVolume(inboundRoutes),
			ServingDCs:         servingDCs,
		})

	default:
		writeError(w, http.StatusNotFound, "entity not found")
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────

func sumVolume(routes []models.SupplyRoute) int {
	total := 0
	for _, r := range routes {
		total += r.Volume
	}
	return total
}

func toModelLocation(l db.Location) models.Location {
	return models.Location{
		ID:   l.ID,
		Name: l.Name,
		Lat:  l.Lat,
		Lng:  l.Lng,
		Type: models.LocationType(l.Type),
	}
}

func toModelRoute(r db.SupplyRoute) models.SupplyRoute {
	return models.SupplyRoute{
		ID:        r.ID,
		SourceID:  r.SourceID,
		DestID:    r.DestID,
		RouteType: models.RouteType(r.RouteType),
		Volume:    int(r.Volume),
		IsActive:  r.IsActive,
	}
}

func toModelLocations(dbLocs []db.Location) []models.Location {
	locs := make([]models.Location, len(dbLocs))
	for i, l := range dbLocs {
		locs[i] = toModelLocation(l)
	}
	return locs
}

func toModelRoutes(dbRoutes []db.SupplyRoute) []models.SupplyRoute {
	routes := make([]models.SupplyRoute, len(dbRoutes))
	for i, r := range dbRoutes {
		routes[i] = toModelRoute(r)
	}
	return routes
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Error().Err(err).Msg("failed to encode response")
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
