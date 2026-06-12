package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	wsHub "github.com/jwhig/jw-dev/services/supply-chain-api/internal/ws"
)

// HealthzHandler returns a liveness probe — always 200 OK.
func HealthzHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}
}

// readyzResponse is the JSON body for /readyz.
type readyzResponse struct {
	Status    string `json:"status"`
	Error     string `json:"error,omitempty"`
	WSClients int    `json:"wsClients"`
}

// ReadyzHandler returns a readiness probe — 200 if the database is reachable.
func ReadyzHandler(pool *pgxpool.Pool, hub *wsHub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		w.Header().Set("Content-Type", "application/json")

		wsClients := 0
		if hub != nil {
			wsClients = hub.ClientCount()
		}

		if err := pool.Ping(ctx); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(readyzResponse{
				Status:    "unavailable",
				Error:     err.Error(),
				WSClients: wsClients,
			})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(readyzResponse{
			Status:    "ready",
			WSClients: wsClients,
		})
	}
}
