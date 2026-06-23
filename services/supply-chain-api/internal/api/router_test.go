package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRouter_HealthzIsPublic(t *testing.T) {
	r := NewRouter(nil, testVerifier(), nil)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected /healthz to be public (200), got %d", rec.Code)
	}
}

func TestRouter_ReadyzRequiresAuth(t *testing.T) {
	r := NewRouter(nil, testVerifier(), nil)

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected /readyz to require auth (401), got %d", rec.Code)
	}
}

func TestRouter_ApiV1RequiresAuth(t *testing.T) {
	r := NewRouter(nil, testVerifier(), nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/locations", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected /api/v1/locations to require auth (401), got %d", rec.Code)
	}
}

func TestParseAllowedOrigins_NeverWildcard(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "")
	for _, o := range parseAllowedOrigins() {
		if o == "*" {
			t.Fatal("parseAllowedOrigins must never return a wildcard")
		}
	}

	t.Setenv("ALLOWED_ORIGINS", "https://app.example.com, https://admin.example.com")
	got := parseAllowedOrigins()
	if len(got) != 2 || got[0] != "https://app.example.com" || got[1] != "https://admin.example.com" {
		t.Errorf("unexpected origins: %v", got)
	}
}
