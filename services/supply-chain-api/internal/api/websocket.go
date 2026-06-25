package api

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
	wsHub "github.com/jwhig/jw-dev/services/supply-chain-api/internal/ws"
)

// newUpgrader builds a WebSocket upgrader whose CheckOrigin allows only the
// configured origins. When authDisabled (local dev) it allows any origin.
func newUpgrader(authDisabled bool) websocket.Upgrader {
	return websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			if authDisabled {
				return true // dev mode
			}
			origin := r.Header.Get("Origin")
			for _, a := range parseAllowedOrigins() {
				if a == origin {
					return true
				}
			}
			return false
		},
	}
}

// HandleWebSocketUpgrade authenticates the request and upgrades it to a
// WebSocket. Browsers cannot set an Authorization header on a WebSocket, so the
// client first obtains a short-lived single-use ticket from an authenticated
// HTTP call and connects with "?ticket=". The ticket is redeemed (and deleted)
// here, keeping the JWT out of the URL and any access logs. When authEnabled is
// false (local dev) the ticket check is skipped.
func HandleWebSocketUpgrade(pool *pgxpool.Pool, hub *wsHub.Hub, authEnabled bool) http.HandlerFunc {
	upgrader := newUpgrader(!authEnabled)
	return func(w http.ResponseWriter, r *http.Request) {
		if authEnabled {
			ticket := r.URL.Query().Get("ticket")
			if _, err := auth.RedeemWSTicket(r.Context(), pool, ticket); err != nil {
				http.Error(w, `{"error":"invalid or expired ticket"}`, http.StatusUnauthorized)
				return
			}
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Error().Err(err).Msg("ws upgrade failed")
			return
		}
		hub.ServeClient(conn)
	}
}
