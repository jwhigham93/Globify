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

// CognitoMiddleware returns an HTTP middleware that validates Cognito JWTs.
// It fetches and caches the JWKS from the Cognito User Pool endpoint.
func CognitoMiddleware(cfg Config) func(http.Handler) http.Handler {
	// Set up JWKS cache with auto-refresh.
	cache := jwk.NewCache(context.Background())
	_ = cache.Register(cfg.jwksURL(), jwk.WithMinRefreshInterval(15*time.Minute))

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeAuthError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				writeAuthError(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}
			tokenStr := parts[1]

			// Fetch cached JWKS.
			keySet, err := cache.Get(r.Context(), cfg.jwksURL())
			if err != nil {
				log.Error().Err(err).Msg("failed to fetch JWKS")
				writeAuthError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			// Parse and validate the JWT.
			token, err := jwt.Parse([]byte(tokenStr),
				jwt.WithKeySet(keySet),
				jwt.WithIssuer(cfg.issuerURL()),
				jwt.WithAudience(cfg.ClientID),
				jwt.WithValidate(true),
			)
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

			// Store claims in request context for downstream handlers.
			ctx := context.WithValue(r.Context(), claimsContextKey, token)
			next.ServeHTTP(w, r.WithContext(ctx))
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
