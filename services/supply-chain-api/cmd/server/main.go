package main

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/api"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/db"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/ws"
)

func main() {
	// ── Logging ──────────────────────────────────────────────────────
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("LOG_FORMAT") != "json" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	// ── Database ─────────────────────────────────────────────────────
	dbURL := os.Getenv("DATABASE_URL")

	// If SSM_DATABASE_URL is set, read the real connection string from
	// AWS SSM Parameter Store (SecureString). This keeps the Neon password
	// out of Lambda env vars. Falls back to DATABASE_URL for local dev.
	if ssmName := os.Getenv("SSM_DATABASE_URL"); ssmName != "" {
		val, err := readSSMParameter(context.Background(), ssmName)
		if err != nil {
			log.Fatal().Err(err).Str("param", ssmName).Msg("failed to read DATABASE_URL from SSM")
		}
		dbURL = val
		log.Info().Str("param", ssmName).Msg("loaded DATABASE_URL from SSM Parameter Store")
	}

	if dbURL == "" {
		log.Fatal().Msg("DATABASE_URL environment variable (or SSM_DATABASE_URL parameter) is required")
	}

	pool, err := db.ConnectPool(context.Background(), dbURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()

	// ── Auth config ──────────────────────────────────────────────────
	authCfg := auth.ConfigFromEnv()

	// ── WebSocket hub ────────────────────────────────────────────────
	hub := ws.NewHub()
	go hub.Run()

	// ── Router ───────────────────────────────────────────────────────
	router := api.NewRouter(pool, authCfg, hub)

	// ── Server ───────────────────────────────────────────────────────
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:              net.JoinHostPort("", port),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// ── Graceful shutdown (Go 1.26: NotifyContext propagates cancel cause) ──
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Info().Str("addr", srv.Addr).Msg("starting server")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	// Block until signal received.
	<-ctx.Done()
	stop() // allow second signal to force-kill

	// In Go 1.26, context.Cause(ctx) returns the signal that triggered cancellation.
	if cause := context.Cause(ctx); cause != nil {
		log.Info().Str("cause", fmt.Sprintf("%v", cause)).Msg("shutdown signal received")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	log.Info().Msg("shutting down gracefully…")
	hub.Shutdown()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("forced shutdown")
	}
	log.Info().Msg("server stopped")
}

// readSSMParameter reads a SecureString parameter from AWS SSM Parameter Store.
func readSSMParameter(ctx context.Context, name string) (string, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return "", fmt.Errorf("loading AWS config: %w", err)
	}

	client := ssm.NewFromConfig(cfg)
	out, err := client.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           &name,
		WithDecryption: boolPtr(true),
	})
	if err != nil {
		return "", fmt.Errorf("getting SSM parameter %q: %w", name, err)
	}

	if out.Parameter == nil || out.Parameter.Value == nil {
		return "", fmt.Errorf("SSM parameter %q has no value", name)
	}

	return *out.Parameter.Value, nil
}

func boolPtr(b bool) *bool { return &b }
