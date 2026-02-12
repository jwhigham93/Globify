# ── Build stage ────────────────────────────────────────────────
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

# ── Runtime stage ─────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=builder /server /server
COPY --from=builder /app/migrations /migrations

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
