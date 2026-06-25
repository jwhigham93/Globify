package api

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/cors"
	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
	wsHub "github.com/jwhig/jw-dev/services/supply-chain-api/internal/ws"
)

// defaultDevOrigin is used when ALLOWED_ORIGINS is unset (local Expo web dev).
// In deployed environments ALLOWED_ORIGINS must be set to the real web origin.
const defaultDevOrigin = "http://localhost:8081"

// parseAllowedOrigins reads the comma-separated ALLOWED_ORIGINS env var. It
// never returns a wildcard: an unset value falls back to the local dev origin
// so a misconfiguration fails closed rather than opening CORS to the world.
func parseAllowedOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if raw == "" {
		return []string{defaultDevOrigin}
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	if len(origins) == 0 {
		return []string{defaultDevOrigin}
	}
	return origins
}

// NewRouter sets up the chi router with all routes, middleware, and CORS.
//
// verifier validates Cognito access tokens; pass nil to disable authentication
// (local dev only — the server only does this when AUTH_DISABLED=true).
func NewRouter(pool *pgxpool.Pool, verifier *auth.Verifier, hub *wsHub.Hub) *chi.Mux {
	r := chi.NewRouter()

	// ── Global middleware ─────────────────────────────────────────────
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(zerologRequestLogger)
	r.Use(middleware.Recoverer)

	// ── CORS ─────────────────────────────────────────────────────────
	r.Use(cors.New(cors.Options{
		AllowedOrigins:   parseAllowedOrigins(),
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Device-API-Key"},
		AllowCredentials: true,
		MaxAge:           300,
	}).Handler)

	// ── Health checks (no auth — infra probes) ───────────────────────
	// Liveness (/healthz) and readiness (/readyz) must be reachable by
	// orchestrator probes (e.g. the EKS readinessProbe in k8s/deployment.yaml)
	// without credentials. /readyz only exposes DB-up status and a WS client
	// count — operational data, not user data — so it stays public.
	r.Get("/healthz", HealthzHandler())
	r.Get("/readyz", ReadyzHandler(pool, hub))

	h := NewHandlers(pool)

	// ── Authenticated API routes ─────────────────────────────────────
	r.Group(func(r chi.Router) {
		// Per-IP rate limit (in-process — defense-in-depth only; on ultra-lite
		// the Lambda reserved-concurrency cap is the hard ceiling, since
		// per-instance counters aren't shared across execution environments).
		r.Use(httprate.LimitByIP(100, time.Minute))
		if verifier != nil {
			r.Use(verifier.Middleware())
		}

		r.Route("/api/v1", func(r chi.Router) {
			// Locations
			r.Get("/locations", h.ListLocations)
			r.Get("/locations/{id}", h.GetLocation)

			// Routes
			r.Get("/routes", h.ListRoutes)

			// Visualization bundle
			r.Get("/supply-chain/visualization", h.GetVisualizationData)

			// Risk metrics
			r.Get("/risk/network", h.GetNetworkRiskMetrics)

			// Disruption simulation (mutating — tighter rate limit; RBAC-ready:
			// wrap with auth.RequireGroups("analysts","admins") to restrict).
			r.With(httprate.LimitByIP(20, time.Minute)).
				Post("/disruption/simulate", h.SimulateDisruption)

			// Entity detail
			r.Get("/entities/{id}", h.GetEntityDetail)

			// Vehicles (read endpoints)
			r.Get("/vehicles", h.HandleListVehicles)
			r.Get("/vehicles/positions", h.HandleBulkPositions)
			r.Get("/vehicles/{id}", h.HandleGetVehicle)
			r.Get("/vehicles/{id}/route", h.HandleGetVehicleRoute)

			// Short-lived ticket for opening the WebSocket stream (authed).
			r.Post("/vehicles/stream/ticket", h.HandleIssueStreamTicket)
		})
	})

	// ── Device GPS ingestion (device API key auth, not Cognito) ──────
	r.Route("/api/v1/vehicles/{id}/gps", func(r chi.Router) {
		r.Use(httprate.LimitByIP(60, time.Minute))
		r.Use(auth.DeviceKeyMiddleware(pool))
		r.Post("/", h.HandleIngestGpsPing)
	})

	// ── WebSocket stream (single-use ticket auth via ?ticket=) ───────
	if hub != nil {
		r.Get("/api/v1/vehicles/stream", HandleWebSocketUpgrade(pool, hub, verifier != nil))
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
