package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
)

func testVerifier(t *testing.T) *auth.Verifier {
	t.Helper()
	v, err := auth.NewVerifier(auth.Config{
		UserPoolID: "us-east-1_test",
		Region:     "us-east-1",
		ClientID:   "test-client-id",
	})
	if err != nil {
		t.Fatalf("NewVerifier: %v", err)
	}
	return v
}

func TestWebSocketUpgrade_RejectsMissingTicket(t *testing.T) {
	// authEnabled=true with no ?ticket=: RedeemWSTicket short-circuits on the
	// empty ticket before touching the pool, so a nil pool is safe here.
	h := HandleWebSocketUpgrade(nil, nil, true)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/vehicles/stream", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for missing ticket, got %d", rec.Code)
	}
}

func TestWebSocketUpgrade_AuthDisabledSkipsTicketCheck(t *testing.T) {
	// With authEnabled=false (AUTH_DISABLED), the handler must not 401 on a
	// missing ticket — it falls through to the upgrade attempt instead.
	h := HandleWebSocketUpgrade(nil, nil, false)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/vehicles/stream", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code == http.StatusUnauthorized {
		t.Error("expected ticket check to be skipped when auth disabled, got 401")
	}
}
