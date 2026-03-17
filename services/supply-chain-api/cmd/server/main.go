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
	if dbURL == "" {
		log.Fatal().Msg("DATABASE_URL environment variable is required")
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
