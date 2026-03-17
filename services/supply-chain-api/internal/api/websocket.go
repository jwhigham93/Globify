package api

import (
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"

	wsHub "github.com/jwhig/jw-dev/services/supply-chain-api/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		allowed := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
		if len(allowed) == 1 && allowed[0] == "" {
			return true // dev mode
		}
		origin := r.Header.Get("Origin")
		for _, a := range allowed {
			if strings.TrimSpace(a) == origin {
				return true
			}
		}
		return false
	},
}

// HandleWebSocketUpgrade upgrades the HTTP connection to a WebSocket.
func HandleWebSocketUpgrade(hub *wsHub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Error().Err(err).Msg("ws upgrade failed")
			return
		}
		hub.ServeClient(conn)
	}
}
