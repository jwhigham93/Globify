package api

import (
	"net/http"

	"github.com/gorilla/websocket"
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
// Cognito access token is passed as a "?token=" query parameter and validated
// with the same Verifier used for HTTP requests. A nil verifier disables auth
// (local dev only).
func HandleWebSocketUpgrade(verifier *auth.Verifier, hub *wsHub.Hub) http.HandlerFunc {
	upgrader := newUpgrader(verifier == nil)
	return func(w http.ResponseWriter, r *http.Request) {
		if verifier != nil {
			tokenStr := r.URL.Query().Get("token")
			if tokenStr == "" {
				http.Error(w, `{"error":"missing token query parameter"}`, http.StatusUnauthorized)
				return
			}
			if _, err := verifier.ValidateToken(r.Context(), tokenStr); err != nil {
				log.Debug().Err(err).Msg("ws token validation failed")
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
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
