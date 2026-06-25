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

// writeJSONError writes a JSON error body with the given status, keeping the
// content type consistent with success responses (http.Error would force
// text/plain).
func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(map[string]string{"error": message}); err != nil {
		log.Error().Err(err).Msg("failed to encode error response")
	}
}

// HandleIssueStreamTicket issues a short-lived, single-use ticket for opening
// the GPS WebSocket stream. It runs inside the authenticated group, so the
// caller's identity comes from the validated access token; the ticket is bound
// to that subject. POST /api/v1/vehicles/stream/ticket
func (h *Handlers) HandleIssueStreamTicket(w http.ResponseWriter, r *http.Request) {
	token, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	ticket, ttl, err := auth.IssueWSTicket(r.Context(), h.pool, token.Subject())
	if err != nil {
		log.Error().Err(err).Msg("failed to issue ws ticket")
		writeJSONError(w, http.StatusInternalServerError, "failed to issue ticket")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(streamTicketResponse{Ticket: ticket, ExpiresIn: ttl}); err != nil {
		log.Error().Err(err).Msg("failed to encode stream ticket response")
	}
}
