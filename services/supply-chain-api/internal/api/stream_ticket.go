package api

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
)

// streamTicketResponse is the JSON body returned when issuing a WS ticket.
type streamTicketResponse struct {
	Ticket    string `json:"ticket"`
	ExpiresIn int    `json:"expiresIn"`
}

// HandleIssueStreamTicket issues a short-lived, single-use ticket for opening
// the GPS WebSocket stream. It runs inside the authenticated group, so the
// caller's identity comes from the validated access token; the ticket is bound
// to that subject. POST /api/v1/vehicles/stream/ticket
func (h *Handlers) HandleIssueStreamTicket(w http.ResponseWriter, r *http.Request) {
	token, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthenticated"}`, http.StatusUnauthorized)
		return
	}

	ticket, ttl, err := auth.IssueWSTicket(r.Context(), h.pool, token.Subject())
	if err != nil {
		log.Error().Err(err).Msg("failed to issue ws ticket")
		http.Error(w, `{"error":"failed to issue ticket"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(streamTicketResponse{Ticket: ticket, ExpiresIn: ttl})
}
