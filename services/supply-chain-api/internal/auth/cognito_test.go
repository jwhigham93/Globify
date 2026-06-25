package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// mustVerifier builds a Verifier for tests, failing the test on error.
func mustVerifier(t *testing.T, cfg Config) *Verifier {
	t.Helper()
	v, err := NewVerifier(cfg)
	if err != nil {
		t.Fatalf("NewVerifier: %v", err)
	}
	return v
}

func TestCognitoMiddleware_MissingAuthHeader(t *testing.T) {
	cfg := Config{
		UserPoolID: "us-east-1_test",
		Region:     "us-east-1",
		ClientID:   "test-client-id",
	}

	handler := mustVerifier(t, cfg).Middleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/locations", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if body := rec.Body.String(); body == "" {
		t.Error("expected error body")
	}
}

func TestCognitoMiddleware_InvalidAuthFormat(t *testing.T) {
	cfg := Config{
		UserPoolID: "us-east-1_test",
		Region:     "us-east-1",
		ClientID:   "test-client-id",
	}

	handler := mustVerifier(t, cfg).Middleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/locations", nil)
	req.Header.Set("Authorization", "Basic dXNlcjpwYXNz")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestCognitoMiddleware_InvalidToken(t *testing.T) {
	cfg := Config{
		UserPoolID: "us-east-1_test",
		Region:     "us-east-1",
		ClientID:   "test-client-id",
	}

	handler := mustVerifier(t, cfg).Middleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/locations", nil)
	req.Header.Set("Authorization", "Bearer invalid.jwt.token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestConfigFromEnv(t *testing.T) {
	t.Setenv("COGNITO_USER_POOL_ID", "us-east-1_abc123")
	t.Setenv("COGNITO_REGION", "us-east-1")
	t.Setenv("COGNITO_CLIENT_ID", "my-client-id")

	cfg := ConfigFromEnv()
	if cfg.UserPoolID != "us-east-1_abc123" {
		t.Errorf("expected us-east-1_abc123, got %s", cfg.UserPoolID)
	}
	if cfg.Region != "us-east-1" {
		t.Errorf("expected us-east-1, got %s", cfg.Region)
	}
	if cfg.ClientID != "my-client-id" {
		t.Errorf("expected my-client-id, got %s", cfg.ClientID)
	}
}
