package auth

import (
	"context"
	"net/http"

	"github.com/lestrrat-go/jwx/v2/jwt"
)

// DevAuthMiddleware injects a synthetic JWT claims token for local development
// when AUTH_DISABLED=true. This allows handlers that call ClaimsFromContext to
// function correctly without a real Cognito token.
func DevAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, _ := jwt.NewBuilder().
			Subject("dev-user").
			Claim("email", "dev@localhost").
			Build()
		ctx := context.WithValue(r.Context(), claimsContextKey, token)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
