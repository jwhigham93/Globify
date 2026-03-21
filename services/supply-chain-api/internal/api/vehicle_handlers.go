package api

import (
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
)

// HandleListVehicles handles GET /api/v1/vehicles
func (h *Handlers) HandleListVehicles(w http.ResponseWriter, r *http.Request) {
	typeFilter := r.URL.Query().Get("type")

	rows, err := h.pool.Query(r.Context(),
		`SELECT v.id, v.name, v.type, v.status, v.created_at, v.updated_at,
		        p.lat, p.lng, p.heading, p.speed_mph, p.recorded_at
		 FROM vehicles v
		 LEFT JOIN LATERAL (
		    SELECT lat, lng, heading, speed_mph, recorded_at
		    FROM gps_pings
		    WHERE vehicle_id = v.id
		    ORDER BY received_at DESC LIMIT 1
		 ) p ON true
		 WHERE ($1 = '' OR v.type::text = $1)
		 ORDER BY v.name`, typeFilter)
	if err != nil {
		log.Error().Err(err).Msg("failed to list vehicles")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	vehicles := make([]models.VehicleWithPosition, 0)
	for rows.Next() {
		var vp models.VehicleWithPosition
		if err := rows.Scan(
			&vp.ID, &vp.Name, &vp.Type, &vp.Status,
			&vp.CreatedAt, &vp.UpdatedAt,
			&vp.Lat, &vp.Lng, &vp.Heading, &vp.SpeedMph, &vp.RecordedAt,
		); err != nil {
			log.Error().Err(err).Msg("failed to scan vehicle row")
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if vp.RecordedAt != nil {
			vp.GpsStatus = models.ComputeGpsStatus(*vp.RecordedAt)
		} else {
			vp.GpsStatus = models.GpsStatusLost
		}
		vehicles = append(vehicles, vp)
	}

	writeJSON(w, http.StatusOK, vehicles)
}

// HandleGetVehicle handles GET /api/v1/vehicles/{id}
func (h *Handlers) HandleGetVehicle(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var v models.Vehicle
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, name, type, status, created_at, updated_at
		 FROM vehicles WHERE id = $1`, id).
		Scan(&v.ID, &v.Name, &v.Type, &v.Status, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "vehicle not found")
		return
	}

	// Recent pings
	pingRows, err := h.pool.Query(r.Context(),
		`SELECT id, vehicle_id, lat, lng, heading, speed_mph, recorded_at, received_at
		 FROM gps_pings WHERE vehicle_id = $1
		 ORDER BY received_at DESC LIMIT 50`, id)
	if err != nil {
		log.Error().Err(err).Msg("failed to load pings")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer pingRows.Close()

	pings := make([]models.GpsPing, 0)
	for pingRows.Next() {
		var p models.GpsPing
		if err := pingRows.Scan(
			&p.ID, &p.VehicleID, &p.Lat, &p.Lng,
			&p.Heading, &p.SpeedMph, &p.RecordedAt, &p.ReceivedAt,
		); err != nil {
			log.Error().Err(err).Msg("failed to scan ping")
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		pings = append(pings, p)
	}

	// Current route
	var route *models.VehicleRoute
	var vr models.VehicleRoute
	err = h.pool.QueryRow(r.Context(),
		`SELECT id, vehicle_id, origin_id, destination_id, status, started_at, completed_at, created_at
		 FROM vehicle_routes WHERE vehicle_id = $1 AND status = 'in_progress'
		 LIMIT 1`, id).
		Scan(&vr.ID, &vr.VehicleID, &vr.OriginID, &vr.DestinationID,
			&vr.Status, &vr.StartedAt, &vr.CompletedAt, &vr.CreatedAt)
	if err == nil {
		route = &vr
	}

	gpsStatus := models.GpsStatusLost
	if len(pings) > 0 {
		gpsStatus = models.ComputeGpsStatus(pings[0].RecordedAt)
	}

	writeJSON(w, http.StatusOK, models.VehicleDetail{
		Vehicle:      v,
		RecentPings:  pings,
		CurrentRoute: route,
		GpsStatus:    gpsStatus,
	})
}

// HandleGetVehicleRoute handles GET /api/v1/vehicles/{id}/route
func (h *Handlers) HandleGetVehicleRoute(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var vr models.VehicleRouteWithCoords
	err := h.pool.QueryRow(r.Context(),
		`SELECT vr.id, vr.vehicle_id, vr.origin_id, vr.destination_id,
		        vr.status, vr.started_at, vr.completed_at, vr.created_at,
		        ol.lat, ol.lng, dl.lat, dl.lng
		 FROM vehicle_routes vr
		 JOIN locations ol ON ol.id = vr.origin_id
		 JOIN locations dl ON dl.id = vr.destination_id
		 WHERE vr.vehicle_id = $1 AND vr.status = 'in_progress'
		 LIMIT 1`, id).
		Scan(&vr.ID, &vr.VehicleID, &vr.OriginID, &vr.DestinationID,
			&vr.Status, &vr.StartedAt, &vr.CompletedAt, &vr.CreatedAt,
			&vr.OriginLat, &vr.OriginLng, &vr.DestinationLat, &vr.DestinationLng)
	if err != nil {
		writeError(w, http.StatusNotFound, "no active route found")
		return
	}

	writeJSON(w, http.StatusOK, vr)
}

// HandleBulkPositions handles GET /api/v1/vehicles/positions
func (h *Handlers) HandleBulkPositions(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT v.id, v.name, p.lat, p.lng, p.heading, p.speed_mph, p.recorded_at,
		        ol.name AS origin_name, dl.name AS dest_name, vr.started_at
		 FROM vehicles v
		 INNER JOIN LATERAL (
		    SELECT lat, lng, heading, speed_mph, recorded_at
		    FROM gps_pings
		    WHERE vehicle_id = v.id
		    ORDER BY received_at DESC LIMIT 1
		 ) p ON true
		 LEFT JOIN vehicle_routes vr ON vr.vehicle_id = v.id AND vr.status = 'in_progress'
		 LEFT JOIN locations ol ON ol.id = vr.origin_id
		 LEFT JOIN locations dl ON dl.id = vr.destination_id
		 WHERE v.status = 'active'`)
	if err != nil {
		log.Error().Err(err).Msg("failed to get bulk positions")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	positions := make([]models.BulkPosition, 0)
	for rows.Next() {
		var bp models.BulkPosition
		if err := rows.Scan(
			&bp.VehicleID, &bp.VehicleName, &bp.Lat, &bp.Lng,
			&bp.Heading, &bp.SpeedMph, &bp.RecordedAt,
			&bp.OriginName, &bp.DestinationName, &bp.RouteStartedAt,
		); err != nil {
			log.Error().Err(err).Msg("failed to scan position")
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		bp.GpsStatus = models.ComputeGpsStatus(bp.RecordedAt)
		positions = append(positions, bp)
	}

	writeJSON(w, http.StatusOK, positions)
}

// HandleIngestGpsPing handles POST /api/v1/vehicles/{id}/gps
// Requires DeviceKeyMiddleware (X-Device-API-Key header).
func (h *Handlers) HandleIngestGpsPing(w http.ResponseWriter, r *http.Request) {
	pathID := chi.URLParam(r, "id")

	// Validate device owns this vehicle
	ctxVehicleID, ok := auth.VehicleIDFromContext(r.Context())
	if !ok || ctxVehicleID != pathID {
		writeError(w, http.StatusForbidden, "key does not match vehicle")
		return
	}

	var req struct {
		Lat        float64  `json:"lat"`
		Lng        float64  `json:"lng"`
		Heading    *float64 `json:"heading,omitempty"`
		SpeedMph   *float64 `json:"speedMph,omitempty"`
		RecordedAt string   `json:"recordedAt"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate coordinates
	if req.Lat < -90 || req.Lat > 90 || req.Lng < -180 || req.Lng > 180 {
		writeError(w, http.StatusBadRequest, "lat must be [-90,90], lng must be [-180,180]")
		return
	}
	if math.IsNaN(req.Lat) || math.IsNaN(req.Lng) || math.IsInf(req.Lat, 0) || math.IsInf(req.Lng, 0) {
		writeError(w, http.StatusBadRequest, "invalid coordinate values")
		return
	}

	recordedAt, err := time.Parse(time.RFC3339, req.RecordedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "recordedAt must be RFC3339")
		return
	}

	// Fetch previous GPS status before inserting the new ping
	var prevStatus models.GpsStatus
	var prevRecordedAt time.Time
	err = h.pool.QueryRow(r.Context(),
		`SELECT recorded_at FROM gps_pings
		 WHERE vehicle_id = $1
		 ORDER BY received_at DESC LIMIT 1`, pathID).
		Scan(&prevRecordedAt)
	if err != nil {
		prevStatus = models.GpsStatusLost // no previous ping
	} else {
		prevStatus = models.ComputeGpsStatus(prevRecordedAt)
	}

	_, err = h.pool.Exec(r.Context(),
		`INSERT INTO gps_pings (vehicle_id, lat, lng, heading, speed_mph, recorded_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (vehicle_id, recorded_at) DO NOTHING`,
		pathID, req.Lat, req.Lng, req.Heading, req.SpeedMph, recordedAt)
	if err != nil {
		log.Error().Err(err).Msg("failed to insert GPS ping")
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Broadcast position update via WebSocket
	if h.hub != nil {
		newStatus := models.GpsStatusLive
		h.hub.Broadcast("position_update", models.BulkPosition{
			VehicleID:  pathID,
			Lat:        req.Lat,
			Lng:        req.Lng,
			Heading:    req.Heading,
			SpeedMph:   req.SpeedMph,
			RecordedAt: recordedAt,
			GpsStatus:  newStatus,
		})

		// Detect status transition (e.g., stale/lost → live)
		if prevStatus != newStatus {
			h.hub.Broadcast("status_change", map[string]string{
				"vehicleId":  pathID,
				"prevStatus": string(prevStatus),
				"newStatus":  string(newStatus),
			})
		}
	}

	w.WriteHeader(http.StatusCreated)
}
