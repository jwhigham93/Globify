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
//
// This fallback route (like /_ws/connect) is publicly reachable via the HTTP
// API catch-all, so it must not delete a connection record on a caller-supplied
// ID alone. We require the API Gateway-set x-event-type header to match, mirroring
// the x-connection-id header mapping this path already assumes. The robust fix is
// to route these paths only from API Gateway at the infra layer (tracked backlog).
func HandleWsDisconnect(hub *wshub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-event-type") != "DISCONNECT" {
			http.Error(w, `{"error":"invalid event"}`, http.StatusBadRequest)
			return
		}
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

// maxEventBodyBytes caps the body read in HandleLambdaEvents. Lambda payloads
// are at most 6 MB; WebSocket events and EventBridge ticks are well under 64 KB.
const maxEventBodyBytes = 64 * 1024

// HandleLambdaEvents handles raw Lambda events forwarded by Lambda Web Adapter
// to POST /events. LWA routes non-HTTP Lambda events here — this includes both
// API Gateway WebSocket events ($connect/$disconnect/$default) and EventBridge
// scheduled events (GPS simulator). We parse the raw JSON and dispatch.
//
// simToken is the value of the GPS_SIM_TOKEN env var. A non-empty token is
// required in the EventBridge event detail, preventing public HTTP callers from
// triggering the GPS simulator via the publicly reachable /events endpoint.
func HandleLambdaEvents(pool *pgxpool.Pool, hub *wshub.Hub, authEnabled bool, simToken string) http.HandlerFunc {
	type wsRequestContext struct {
		RouteKey     string `json:"routeKey"`
		ConnectionID string `json:"connectionId"`
		// EventType is set by API Gateway ("CONNECT", "DISCONNECT", "MESSAGE").
		// We require it to match the expected value so that a public HTTP POST
		// with a crafted routeKey cannot inject connection IDs into DynamoDB.
		EventType string `json:"eventType"`
	}
	type lambdaEvent struct {
		// API Gateway WebSocket events
		RequestContext        wsRequestContext  `json:"requestContext"`
		QueryStringParameters map[string]string `json:"queryStringParameters"`
		// EventBridge events
		Source     string            `json:"source"`
		DetailType string            `json:"detail-type"`
		Detail     map[string]string `json:"detail"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		// Fix #2: cap body size to prevent slow-loris / OOM.
		body, err := io.ReadAll(io.LimitReader(r.Body, maxEventBodyBytes))
		if err != nil {
			http.Error(w, `{"error":"failed to read event"}`, http.StatusInternalServerError)
			return
		}

		var event lambdaEvent
		if err := json.Unmarshal(body, &event); err != nil {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Fix #3: EventBridge GPS simulator tick — require matching secret token.
		// simToken is empty only in local dev (no env var), in which case the
		// simulator is disabled at the /events path entirely.
		if event.Source == "supply-chain.simulator" {
			if simToken == "" || event.Detail["token"] != simToken {
				log.Warn().Msg("gps-sim: rejected — missing or invalid token")
				// Return 200 so EventBridge doesn't retry; this is either a
				// misconfigured rule or a public caller probing the endpoint.
				w.WriteHeader(http.StatusOK)
				return
			}
			log.Debug().Str("detailType", event.DetailType).Msg("gps-sim: trigger received")
			RunGPSSimulator(r.Context(), pool, hub)
			w.WriteHeader(http.StatusOK)
			return
		}

		// API Gateway WebSocket event — require routeKey to be present.
		if event.RequestContext.RouteKey == "" {
			w.WriteHeader(http.StatusOK)
			return
		}

		connectionID := event.RequestContext.ConnectionID
		log.Debug().Str("routeKey", event.RequestContext.RouteKey).Str("connectionId", connectionID).Msg("ws: lambda event")

		switch event.RequestContext.RouteKey {
		case "$connect":
			// Fix #6: require API Gateway's eventType field to match; a public HTTP
			// POST can craft routeKey but is unlikely to know this field is checked.
			if event.RequestContext.EventType != "CONNECT" {
				http.Error(w, `{"error":"invalid event"}`, http.StatusBadRequest)
				return
			}
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
			// Require the eventType field to match, same as $connect (Fix #6): a
			// public HTTP POST can craft routeKey but not the API Gateway-set
			// eventType, so a crafted request cannot drop a known connection.
			if event.RequestContext.EventType != "DISCONNECT" {
				http.Error(w, `{"error":"invalid event"}`, http.StatusBadRequest)
				return
			}
			if connectionID != "" {
				if err := hub.Disconnect(r.Context(), connectionID); err != nil {
					log.Debug().Err(err).Str("connectionId", connectionID).Msg("ws: disconnect cleanup failed")
				}
			}
			w.WriteHeader(http.StatusOK)

		default:
			w.WriteHeader(http.StatusOK)
		}
	}
}
