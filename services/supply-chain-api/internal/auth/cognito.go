package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/rs/zerolog/log"
)

// Config holds Cognito authentication configuration.
type Config struct {
	UserPoolID string
	Region     string
	ClientID   string
}

// ConfigFromEnv reads auth configuration from environment variables.
func ConfigFromEnv() Config {
	return Config{
		UserPoolID: os.Getenv("COGNITO_USER_POOL_ID"),
		Region:     os.Getenv("COGNITO_REGION"),
		ClientID:   os.Getenv("COGNITO_CLIENT_ID"),
	}
}

// jwksURL returns the Cognito JWKS endpoint URL.
func (c Config) jwksURL() string {
	return fmt.Sprintf(
		"https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json",
		c.Region, c.UserPoolID,
	)
}

// issuerURL returns the expected JWT issuer claim.
func (c Config) issuerURL() string {
	return fmt.Sprintf(
		"https://cognito-idp.%s.amazonaws.com/%s",
		c.Region, c.UserPoolID,
	)
}

// Verifier validates Cognito access tokens. It holds a JWKS cache with
// auto-refresh and is safe to share across the HTTP middleware and the
// WebSocket upgrade handler so both use one validation code path.
type Verifier struct {
	cfg   Config
	cache *jwk.Cache
}

// NewVerifier constructs a Verifier and registers the Cognito JWKS endpoint
// for cached, auto-refreshing key retrieval.
func NewVerifier(cfg Config) *Verifier {
	cache := jwk.NewCache(context.Background())
	_ = cache.Register(cfg.jwksURL(), jwk.WithMinRefreshInterval(15*time.Minute))
	return &Verifier{cfg: cfg, cache: cache}
}

// ValidateToken parses a token string, verifies its signature against the
// cached JWKS, validates the issuer and expiry, and asserts the Cognito
// access-token claims (token_use, client_id). It returns the parsed token
// on success.
func (v *Verifier) ValidateToken(ctx context.Context, tokenStr string) (jwt.Token, error) {
	keySet, err := v.cache.Get(ctx, v.cfg.jwksURL())
	if err != nil {
		return nil, fmt.Errorf("fetching JWKS: %w", err)
	}

	token, err := jwt.Parse([]byte(tokenStr),
		jwt.WithKeySet(keySet),
		jwt.WithIssuer(v.cfg.issuerURL()),
		jwt.WithValidate(true),
	)
	if err != nil {
		return nil, err
	}

	if err := validateAccessClaims(token, v.cfg); err != nil {
		return nil, err
	}

	return token, nil
}

// Middleware returns an HTTP middleware that validates the Bearer access token
// on each request and stores the parsed claims in the request context.
func (v *Verifier) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr, err := bearerToken(r)
			if err != nil {
				writeAuthError(w, http.StatusUnauthorized, err.Error())
				return
			}

			token, err := v.ValidateToken(r.Context(), tokenStr)
			if err != nil {
				// Use Go 1.26 errors.AsType for type-safe error matching.
				if validationErr, ok := errors.AsType[jwt.ValidationError](err); ok {
					_ = validationErr
					writeAuthError(w, http.StatusUnauthorized, "token expired")
					return
				}
				log.Debug().Err(err).Msg("JWT validation failed")
				writeAuthError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			ctx := context.WithValue(r.Context(), claimsContextKey, token)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// CognitoMiddleware returns an HTTP middleware that validates Cognito access
// tokens. Retained for backward compatibility; it constructs a Verifier
// internally. Prefer sharing a single Verifier (NewVerifier) when the JWKS
// cache should be reused across handlers (e.g. HTTP + WebSocket).
func CognitoMiddleware(cfg Config) func(http.Handler) http.Handler {
	return NewVerifier(cfg).Middleware()
}

// bearerToken extracts the token from an "Authorization: Bearer <token>" header.
func bearerToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", errors.New("missing authorization header")
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", errors.New("invalid authorization header format")
	}
	return parts[1], nil
}

// validateAccessClaims asserts the Cognito access-token-specific claims.
// Cognito access tokens carry "token_use": "access" and "client_id" (they do
// NOT carry an "aud" claim — that is ID-token semantics). Using the access
// token for API authorization is the correct choice; this rejects ID tokens.
func validateAccessClaims(token jwt.Token, cfg Config) error {
	tokenUse, _ := claimString(token, "token_use")
	if tokenUse != "access" {
		return fmt.Errorf("unexpected token_use %q: an access token is required", tokenUse)
	}

	clientID, _ := claimString(token, "client_id")
	if clientID == "" || clientID != cfg.ClientID {
		return errors.New("token client_id does not match the expected app client")
	}

	return nil
}

// claimString reads a string claim from a token.
func claimString(token jwt.Token, name string) (string, bool) {
	v, ok := token.Get(name)
	if !ok {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}

// groupsFromToken extracts the "cognito:groups" claim, coercing the JSON
// array Cognito emits ([]interface{}) into []string.
func groupsFromToken(token jwt.Token) []string {
	v, ok := token.Get("cognito:groups")
	if !ok {
		return nil
	}
	switch g := v.(type) {
	case []string:
		return g
	case []interface{}:
		out := make([]string, 0, len(g))
		for _, item := range g {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

// GroupsFromContext returns the Cognito groups of the authenticated user, or
// nil if there is no validated token or no groups claim.
func GroupsFromContext(ctx context.Context) []string {
	token, ok := ClaimsFromContext(ctx)
	if !ok {
		return nil
	}
	return groupsFromToken(token)
}

// RequireGroups returns an authorization middleware that allows the request
// only if the authenticated user belongs to at least one of the named groups,
// otherwise responding 403. It must run after the authentication middleware.
//
// Scaffold for per-route RBAC — e.g. wrap POST /api/v1/disruption/simulate with
// RequireGroups("analysts", "admins") to restrict the mutating endpoint.
func RequireGroups(groups ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userGroups := GroupsFromContext(r.Context())
			for _, required := range groups {
				for _, ug := range userGroups {
					if ug == required {
						next.ServeHTTP(w, r)
						return
					}
				}
			}
			writeAuthError(w, http.StatusForbidden, "insufficient permissions")
		})
	}
}

// contextKey is an unexported type for context keys in this package.
type contextKey string

const claimsContextKey contextKey = "claims"

// ClaimsFromContext extracts the validated JWT token from the request context.
func ClaimsFromContext(ctx context.Context) (jwt.Token, bool) {
	token, ok := ctx.Value(claimsContextKey).(jwt.Token)
	return token, ok
}

// writeAuthError writes a JSON error response for authentication failures.
func writeAuthError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
