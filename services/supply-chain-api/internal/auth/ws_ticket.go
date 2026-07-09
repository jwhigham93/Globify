package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// wsTicketTTL is how long an issued WebSocket ticket remains redeemable.
const wsTicketTTL = 30 * time.Second

// ErrInvalidWSTicket is returned when a ticket is missing, expired, or already
// redeemed.
var ErrInvalidWSTicket = errors.New("invalid or expired ticket")

// hashTicket returns the hex-encoded SHA-256 of a raw ticket string. Only the
// hash is ever stored, so a database leak does not expose usable tickets.
func hashTicket(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// IssueWSTicket mints a short-lived, single-use ticket bound to userSub and
// stores its hash. It returns the opaque raw ticket (handed to the client) and
// the TTL in seconds. Expired tickets are swept opportunistically.
func IssueWSTicket(ctx context.Context, pool *pgxpool.Pool, userSub string) (string, int, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", 0, fmt.Errorf("generating ticket: %w", err)
	}
	raw := base64.RawURLEncoding.EncodeToString(buf)

	// Opportunistic cleanup keeps the table tiny without a background job.
	if _, err := pool.Exec(ctx, `DELETE FROM ws_tickets WHERE expires_at < now()`); err != nil {
		return "", 0, fmt.Errorf("sweeping expired tickets: %w", err)
	}

	_, err := pool.Exec(ctx,
		`INSERT INTO ws_tickets (ticket_hash, user_sub, expires_at)
		 VALUES ($1, $2, now() + $3::interval)`,
		hashTicket(raw), userSub, fmt.Sprintf("%d seconds", int(wsTicketTTL.Seconds())))
	if err != nil {
		return "", 0, fmt.Errorf("storing ticket: %w", err)
	}

	return raw, int(wsTicketTTL.Seconds()), nil
}

// RedeemWSTicket atomically validates and consumes a ticket, returning the
// userSub it was issued to. The DELETE ... RETURNING guarantees single use:
// only the first redemption of an unexpired ticket succeeds. Returns
// ErrInvalidWSTicket if the ticket is missing, expired, or already redeemed.
func RedeemWSTicket(ctx context.Context, pool *pgxpool.Pool, raw string) (string, error) {
	if raw == "" {
		return "", ErrInvalidWSTicket
	}

	var userSub string
	err := pool.QueryRow(ctx,
		`DELETE FROM ws_tickets
		 WHERE ticket_hash = $1 AND expires_at > now()
		 RETURNING user_sub`, hashTicket(raw)).Scan(&userSub)
	if err != nil {
		return "", ErrInvalidWSTicket
	}
	return userSub, nil
}
