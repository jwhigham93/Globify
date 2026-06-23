package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
)

func testVerifier() *auth.Verifier {
	return auth.NewVerifier(auth.Config{
		UserPoolID: "us-east-1_test",
		Region:     "us-east-1",
		ClientID:   "test-client-id",
	})
}

func TestWebSocketUpgrade_RejectsMissingToken(t *testing.T) {
	h := HandleWebSocketUpgrade(testVerifier(), nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/vehicles/stream", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for missing token, got %d", rec.Code)
	}
}

func TestWebSocketUpgrade_AuthDisabledSkipsTokenCheck(t *testing.T) {
	// With a nil verifier (AUTH_DISABLED), the handler must not 401 on a
	// missing token — it falls through to the upgrade attempt instead.
	h := HandleWebSocketUpgrade(nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/vehicles/stream", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code == http.StatusUnauthorized {
		t.Error("expected auth to be skipped when verifier is nil, got 401")
	}
}
