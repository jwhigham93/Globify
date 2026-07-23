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

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/api"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/auth"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/db"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/ws"
	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/wshub"
)

func main() {
	// ── Logging ──────────────────────────────────────────────────────
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("LOG_FORMAT") != "json" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	// ── Shutdown context ─────────────────────────────────────────────
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// ── AWS config (shared by SSM + WebSocket hub) ───────────────────
	awsCfg, awsCfgErr := awsconfig.LoadDefaultConfig(context.Background())

	// ── Database ─────────────────────────────────────────────────────
	dbURL := os.Getenv("DATABASE_URL")

	// If SSM_DATABASE_URL is set, read the real connection string from
	// AWS SSM Parameter Store (SecureString). This keeps the Neon password
	// out of Lambda env vars. Falls back to DATABASE_URL for local dev.
	if ssmName := os.Getenv("SSM_DATABASE_URL"); ssmName != "" {
		if awsCfgErr != nil {
			log.Fatal().Err(awsCfgErr).Msg("failed to load AWS config for SSM")
		}
		val, err := readSSMParameter(context.Background(), awsCfg, ssmName)
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
	// Fail closed: authentication is required unless AUTH_DISABLED=true is set
	// explicitly (local dev only). A missing User Pool ID in any other case is
	// a fatal misconfiguration rather than a silent open door.
	authCfg := auth.ConfigFromEnv()
	var verifier *auth.Verifier
	if os.Getenv("AUTH_DISABLED") == "true" {
		log.Warn().Msg("AUTH_DISABLED=true — authentication is OFF; do not use in production")
	} else {
		if authCfg.UserPoolID == "" {
			log.Fatal().Msg("COGNITO_USER_POOL_ID is required (or set AUTH_DISABLED=true for local dev)")
		}
		v, err := auth.NewVerifier(authCfg)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to initialize Cognito verifier")
		}
		verifier = v
	}

	// ── WebSocket hub ────────────────────────────────────────────────
	// Production (Lambda): DynamoDB-backed hub via API Gateway WebSocket API.
	// Local dev: gorilla hub with persistent in-process connections.
	var gorillaHub *ws.Hub
	var ddbHub *wshub.Hub

	dynamoTable := os.Getenv("DYNAMODB_WS_TABLE")
	wsEndpoint := os.Getenv("APIGW_WS_ENDPOINT")
	if dynamoTable != "" && wsEndpoint != "" {
		if awsCfgErr != nil {
			log.Fatal().Err(awsCfgErr).Msg("failed to load AWS config for WebSocket hub")
		}
		ddbHub = wshub.New(awsCfg, dynamoTable, wsEndpoint)
		log.Info().Str("table", dynamoTable).Msg("using DynamoDB WebSocket hub")
	} else {
		gorillaHub = ws.NewHub()
		go gorillaHub.Run()
		log.Info().Msg("using local gorilla WebSocket hub")

		// Local dev has no EventBridge tick to drive RunGPSSimulator, so run
		// it on the same interval in-process — same function production uses,
		// just a different trigger.
		go runLocalGPSTicker(ctx, pool, gorillaHub)
	}

	// ── Router ───────────────────────────────────────────────────────
	simToken := os.Getenv("GPS_SIM_TOKEN")
	router := api.NewRouter(pool, verifier, gorillaHub, ddbHub, simToken)

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
	go func() {
		log.Info().Str("addr", srv.Addr).Msg("starting server")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	<-ctx.Done()
	stop() // allow second signal to force-kill

	if cause := context.Cause(ctx); cause != nil {
		log.Info().Str("cause", fmt.Sprintf("%v", cause)).Msg("shutdown signal received")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	log.Info().Msg("shutting down gracefully…")
	if gorillaHub != nil {
		gorillaHub.Shutdown()
	}
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("forced shutdown")
	}
	log.Info().Msg("server stopped")
}

// readSSMParameter reads a SecureString parameter from AWS SSM Parameter Store.
func readSSMParameter(ctx context.Context, cfg aws.Config, name string) (string, error) {
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

// runLocalGPSTicker drives api.RunGPSSimulator on the same 2-minute cadence
// EventBridge uses in production, but in-process — local dev has no
// EventBridge to send that tick, so without this every vehicle's last GPS
// ping just ages past the 15-minute staleness threshold and shows "lost".
func runLocalGPSTicker(ctx context.Context, pool *pgxpool.Pool, hub api.WSBroadcaster) {
	ticker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()

	api.RunGPSSimulator(ctx, pool, hub)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			api.RunGPSSimulator(ctx, pool, hub)
		}
	}
}

func boolPtr(b bool) *bool { return &b }
