package api

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/cors"
	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
	wsHub "github.com/jwhig/jw-dev/services/supply-chain-api/internal/ws"
)

// NewRouter sets up the chi router with all routes, middleware, and CORS.
func NewRouter(pool *pgxpool.Pool, authCfg auth.Config, hub *wsHub.Hub) *chi.Mux {
	r := chi.NewRouter()

	// ── Global middleware ─────────────────────────────────────────────
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(zerologRequestLogger)
	r.Use(middleware.Recoverer)

	// ── CORS ─────────────────────────────────────────────────────────
	allowedOrigins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
	if len(allowedOrigins) == 1 && allowedOrigins[0] == "" {
		allowedOrigins = []string{"*"}
	}
	r.Use(cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Device-API-Key"},
		AllowCredentials: true,
		MaxAge:           300,
	}).Handler)

	// ── Health checks (no auth) ──────────────────────────────────────
	r.Get("/healthz", HealthzHandler())
	r.Get("/readyz", ReadyzHandler(pool, hub))

	// ── API v1 routes (with auth) ────────────────────────────────────
	h := NewHandlers(pool)

	r.Route("/api/v1", func(r chi.Router) {
		// Apply Cognito auth to all /api/v1 routes.
		if authCfg.UserPoolID != "" {
			r.Use(auth.CognitoMiddleware(authCfg))
		}

		// Locations
		r.Get("/locations", h.ListLocations)
		r.Get("/locations/{id}", h.GetLocation)

		// Routes
		r.Get("/routes", h.ListRoutes)

		// Visualization bundle
		r.Get("/supply-chain/visualization", h.GetVisualizationData)

		// Risk metrics
		r.Get("/risk/network", h.GetNetworkRiskMetrics)

		// Disruption simulation
		r.Post("/disruption/simulate", h.SimulateDisruption)

		// Entity detail
		r.Get("/entities/{id}", h.GetEntityDetail)

		// Vehicles (read endpoints — Cognito auth)
		r.Get("/vehicles", h.HandleListVehicles)
		r.Get("/vehicles/positions", h.HandleBulkPositions)
		r.Get("/vehicles/{id}", h.HandleGetVehicle)
		r.Get("/vehicles/{id}/route", h.HandleGetVehicleRoute)
	})

	// ── Device GPS ingestion (device API key auth, no Cognito) ───────
	r.Route("/api/v1/vehicles/{id}/gps", func(r chi.Router) {
		r.Use(auth.DeviceKeyMiddleware(pool))
		r.Post("/", h.HandleIngestGpsPing)
	})

	// ── WebSocket stream (no auth — read-only broadcast) ─────────────
	if hub != nil {
		r.Get("/api/v1/vehicles/stream", HandleWebSocketUpgrade(hub))
		h.hub = hub
	}

	return r
}

// zerologRequestLogger is a chi middleware that logs requests via zerolog.
func zerologRequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

		defer func() {
			evt := log.Info().
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", ww.Status()).
				Dur("latency", time.Since(start)).
				Str("requestId", middleware.GetReqID(r.Context()))

			if token, ok := auth.ClaimsFromContext(r.Context()); ok {
				evt = evt.Str("userSub", token.Subject())
			}

			evt.Msg("request")
		}()

		next.ServeHTTP(ww, r)
	})
}
