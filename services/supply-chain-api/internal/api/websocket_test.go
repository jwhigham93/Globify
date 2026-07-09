package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestHandleWsDisconnect_RejectsForgedRequest(t *testing.T) {
	// A public POST that only supplies a connection ID (no API Gateway-set
	// x-event-type header) must be rejected before any DynamoDB delete, so a
	// nil hub is safe: the guard returns 400 before hub.Disconnect is reached.
	h := HandleWsDisconnect(nil)

	req := httptest.NewRequest(http.MethodPost, "/_ws/disconnect", nil)
	req.Header.Set("x-connection-id", "victim-connection-id")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for disconnect without x-event-type header, got %d", rec.Code)
	}
}

func TestHandleLambdaEvents_DisconnectRequiresEventType(t *testing.T) {
	// A crafted POST with routeKey "$disconnect" but no matching eventType must
	// be rejected before hub.Disconnect, so a nil pool/hub is safe here.
	h := HandleLambdaEvents(nil, nil, true, "")

	body := `{"requestContext":{"routeKey":"$disconnect","connectionId":"victim-connection-id"}}`
	req := httptest.NewRequest(http.MethodPost, "/events", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for $disconnect without eventType=DISCONNECT, got %d", rec.Code)
	}
}
