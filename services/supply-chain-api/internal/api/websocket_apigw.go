package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/wshub"
)

// HandleWsConnect processes API Gateway $connect events forwarded by Lambda
// Web Adapter as POST /_ws/connect. It validates the single-use WS ticket
// then stores the connection ID in DynamoDB so Broadcast can reach it.
func HandleWsConnect(pool *pgxpool.Pool, hub *wshub.Hub, authEnabled bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		connectionID := r.Header.Get("x-connection-id")
		if connectionID == "" {
			http.Error(w, `{"error":"missing connection ID"}`, http.StatusBadRequest)
			return
		}

		if authEnabled {
			ticket := r.URL.Query().Get("ticket")
			if _, err := auth.RedeemWSTicket(r.Context(), pool, ticket); err != nil {
				http.Error(w, `{"error":"invalid or expired ticket"}`, http.StatusUnauthorized)
				return
			}
		}

		if err := hub.Connect(r.Context(), connectionID); err != nil {
			log.Error().Err(err).Str("connectionId", connectionID).Msg("ws: failed to store connection")
			http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

// HandleWsDisconnect processes $disconnect events (POST /_ws/disconnect).
// Always returns 200 — the connection is best-effort removed from DynamoDB.
func HandleWsDisconnect(hub *wshub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if connectionID := r.Header.Get("x-connection-id"); connectionID != "" {
			if err := hub.Disconnect(r.Context(), connectionID); err != nil {
				log.Debug().Err(err).Str("connectionId", connectionID).Msg("ws: disconnect cleanup failed")
			}
		}
		w.WriteHeader(http.StatusOK)
	}
}

// HandleWsDefault processes $default (catch-all) messages from WebSocket clients
// (POST /_ws/default). Client-to-server messages are not used in this protocol.
func HandleWsDefault() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}
}

// HandleLambdaEvents handles raw Lambda events forwarded by Lambda Web Adapter
// to POST /events. LWA routes non-HTTP Lambda events here — this includes both
// API Gateway WebSocket events ($connect/$disconnect/$default) and EventBridge
// scheduled events (GPS simulator). We parse the raw JSON and dispatch.
func HandleLambdaEvents(pool *pgxpool.Pool, hub *wshub.Hub, authEnabled bool) http.HandlerFunc {
	type wsRequestContext struct {
		RouteKey     string `json:"routeKey"`
		ConnectionID string `json:"connectionId"`
	}
	type lambdaEvent struct {
		// API Gateway WebSocket events
		RequestContext        wsRequestContext  `json:"requestContext"`
		QueryStringParameters map[string]string `json:"queryStringParameters"`
		// EventBridge events
		Source     string `json:"source"`
		DetailType string `json:"detail-type"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, `{"error":"failed to read event"}`, http.StatusInternalServerError)
			return
		}

		var event lambdaEvent
		if err := json.Unmarshal(body, &event); err != nil {
			w.WriteHeader(http.StatusOK)
			return
		}

		// EventBridge GPS simulator tick.
		if event.Source == "supply-chain.simulator" {
			log.Debug().Str("detailType", event.DetailType).Msg("gps-sim: trigger received")
			RunGPSSimulator(r.Context(), pool, hub)
			w.WriteHeader(http.StatusOK)
			return
		}

		// API Gateway WebSocket event.
		if event.RequestContext.RouteKey == "" {
			// Unknown event type — return 200 so LWA doesn't retry.
			w.WriteHeader(http.StatusOK)
			return
		}

		connectionID := event.RequestContext.ConnectionID
		log.Debug().Str("routeKey", event.RequestContext.RouteKey).Str("connectionId", connectionID).Msg("ws: lambda event")

		switch event.RequestContext.RouteKey {
		case "$connect":
			if connectionID == "" {
				http.Error(w, `{"error":"missing connection ID"}`, http.StatusBadRequest)
				return
			}
			if authEnabled {
				ticket := event.QueryStringParameters["ticket"]
				if _, err := auth.RedeemWSTicket(r.Context(), pool, ticket); err != nil {
					log.Warn().Err(err).Msg("ws: $connect rejected — invalid ticket")
					http.Error(w, `{"error":"invalid or expired ticket"}`, http.StatusUnauthorized)
					return
				}
			}
			if err := hub.Connect(r.Context(), connectionID); err != nil {
				log.Error().Err(err).Str("connectionId", connectionID).Msg("ws: failed to store connection")
				http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)

		case "$disconnect":
			if connectionID != "" {
				if err := hub.Disconnect(r.Context(), connectionID); err != nil {
					log.Debug().Err(err).Str("connectionId", connectionID).Msg("ws: disconnect cleanup failed")
				}
			}
			w.WriteHeader(http.StatusOK)

		default:
			// $default and any future route keys — nothing to do server-side.
			w.WriteHeader(http.StatusOK)
		}
	}
}
