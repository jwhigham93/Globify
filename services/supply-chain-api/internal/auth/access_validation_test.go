package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lestrrat-go/jwx/v2/jwt"
)

func testCfg() Config {
	return Config{UserPoolID: "us-east-1_test", Region: "us-east-1", ClientID: "test-client-id"}
}

// buildToken builds an unsigned jwt.Token with the standard access-token claims,
// applying mutate (if non-nil) to override claims for a given test case.
func buildToken(t *testing.T, cfg Config, mutate func(b *jwt.Builder)) jwt.Token {
	t.Helper()
	b := jwt.NewBuilder().
		Issuer(cfg.issuerURL()).
		Claim("token_use", "access").
		Claim("client_id", cfg.ClientID)
	if mutate != nil {
		mutate(b)
	}
	tok, err := b.Build()
	if err != nil {
		t.Fatalf("build token: %v", err)
	}
	return tok
}

func TestValidateAccessClaims_ValidAccessToken(t *testing.T) {
	cfg := testCfg()
	tok := buildToken(t, cfg, nil)
	if err := validateAccessClaims(tok, cfg); err != nil {
		t.Errorf("expected valid access token, got error: %v", err)
	}
}

func TestValidateAccessClaims_RejectsIDToken(t *testing.T) {
	cfg := testCfg()
	tok := buildToken(t, cfg, func(b *jwt.Builder) { b.Claim("token_use", "id") })
	if err := validateAccessClaims(tok, cfg); err == nil {
		t.Error("expected error for ID token (token_use=id), got nil")
	}
}

func TestValidateAccessClaims_RejectsWrongClientID(t *testing.T) {
	cfg := testCfg()
	tok := buildToken(t, cfg, func(b *jwt.Builder) { b.Claim("client_id", "some-other-client") })
	if err := validateAccessClaims(tok, cfg); err == nil {
		t.Error("expected error for mismatched client_id, got nil")
	}
}

func TestValidateAccessClaims_RejectsMissingClientID(t *testing.T) {
	cfg := testCfg()
	tok, err := jwt.NewBuilder().
		Issuer(cfg.issuerURL()).
		Claim("token_use", "access").
		Build()
	if err != nil {
		t.Fatalf("build token: %v", err)
	}
	if err := validateAccessClaims(tok, cfg); err == nil {
		t.Error("expected error for missing client_id, got nil")
	}
}

func TestGroupsFromContext_ReturnsGroups(t *testing.T) {
	cfg := testCfg()
	tok := buildToken(t, cfg, func(b *jwt.Builder) {
		b.Claim("cognito:groups", []interface{}{"admins", "analysts"})
	})
	ctx := context.WithValue(context.Background(), claimsContextKey, tok)

	groups := GroupsFromContext(ctx)
	if len(groups) != 2 || groups[0] != "admins" || groups[1] != "analysts" {
		t.Errorf("expected [admins analysts], got %v", groups)
	}
}

func TestGroupsFromContext_NoToken(t *testing.T) {
	if groups := GroupsFromContext(context.Background()); len(groups) != 0 {
		t.Errorf("expected no groups, got %v", groups)
	}
}

func TestGroupsFromContext_NoGroupsClaim(t *testing.T) {
	cfg := testCfg()
	tok := buildToken(t, cfg, nil)
	ctx := context.WithValue(context.Background(), claimsContextKey, tok)
	if groups := GroupsFromContext(ctx); len(groups) != 0 {
		t.Errorf("expected no groups, got %v", groups)
	}
}

func TestRequireGroups_AllowsMatchingGroup(t *testing.T) {
	cfg := testCfg()
	tok := buildToken(t, cfg, func(b *jwt.Builder) {
		b.Claim("cognito:groups", []interface{}{"admins"})
	})
	called := false
	h := RequireGroups("admins")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/x", nil).
		WithContext(context.WithValue(context.Background(), claimsContextKey, tok))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if !called {
		t.Error("expected next handler to be called")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestRequireGroups_DeniesWithoutMatchingGroup(t *testing.T) {
	cfg := testCfg()
	tok := buildToken(t, cfg, func(b *jwt.Builder) {
		b.Claim("cognito:groups", []interface{}{"viewers"})
	})
	h := RequireGroups("admins")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Error("next handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/x", nil).
		WithContext(context.WithValue(context.Background(), claimsContextKey, tok))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
}

func TestRequireGroups_DeniesWithoutToken(t *testing.T) {
	h := RequireGroups("admins")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Error("next handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
}
