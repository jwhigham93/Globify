-- 000005_ws_tickets.up.sql
-- Short-lived, single-use tickets for authenticating WebSocket connections.
-- Browsers cannot set Authorization headers on WebSocket connections, so the
-- client first requests a ticket over an authenticated HTTP call and then
-- connects with ?ticket=<opaque>. The ticket is redeemed (deleted) once on
-- upgrade, keeping the real JWT out of the URL and any access logs.
CREATE TABLE ws_tickets (
    ticket_hash TEXT PRIMARY KEY,          -- SHA-256 hash of the opaque ticket
    user_sub    TEXT NOT NULL,             -- Cognito subject the ticket was issued to
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL       -- short TTL (~30s); redeem rejects if past
);

-- Supports cheap expiry sweeps performed at issue time.
CREATE INDEX idx_ws_tickets_expires ON ws_tickets(expires_at);
