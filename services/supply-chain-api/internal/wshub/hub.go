package wshub

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/apigatewaymanagementapi"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/rs/zerolog/log"
)

// Hub broadcasts WebSocket messages via API Gateway WebSocket API, storing
// active connection IDs in DynamoDB. This replaces the gorilla-based Hub for
// Lambda deployments where persistent goroutines aren't possible.
type Hub struct {
	ddb   *dynamodb.Client
	mgmt  *apigatewaymanagementapi.Client
	table string
}

// New creates a Hub. wsEndpoint is the API Gateway callback URL, e.g.
// "https://abc123.execute-api.us-east-1.amazonaws.com/production".
func New(cfg aws.Config, table, wsEndpoint string) *Hub {
	return &Hub{
		ddb: dynamodb.NewFromConfig(cfg),
		mgmt: apigatewaymanagementapi.NewFromConfig(cfg, func(o *apigatewaymanagementapi.Options) {
			o.BaseEndpoint = aws.String(wsEndpoint)
		}),
		table: table,
	}
}

// Connect stores the connection ID in DynamoDB with a 2-hour TTL.
func (h *Hub) Connect(ctx context.Context, connectionID string) error {
	ttl := fmt.Sprintf("%d", time.Now().Add(2*time.Hour).Unix())
	_, err := h.ddb.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(h.table),
		Item: map[string]types.AttributeValue{
			"connectionId": &types.AttributeValueMemberS{Value: connectionID},
			"expiresAt":    &types.AttributeValueMemberN{Value: ttl},
		},
	})
	return err
}

// Disconnect removes the connection ID from DynamoDB.
func (h *Hub) Disconnect(ctx context.Context, connectionID string) error {
	_, err := h.ddb.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(h.table),
		Key: map[string]types.AttributeValue{
			"connectionId": &types.AttributeValueMemberS{Value: connectionID},
		},
	})
	return err
}

// Broadcast implements api.WSBroadcaster: marshals a typed envelope and sends
// it to all active connections, removing stale ones (410 GoneException).
func (h *Hub) Broadcast(msgType string, data interface{}) {
	payload, err := json.Marshal(map[string]interface{}{"type": msgType, "data": data})
	if err != nil {
		log.Error().Err(err).Msg("wshub: failed to marshal message")
		return
	}

	ctx := context.Background()
	out, err := h.ddb.Scan(ctx, &dynamodb.ScanInput{
		TableName:            aws.String(h.table),
		ProjectionExpression: aws.String("connectionId"),
	})
	if err != nil {
		log.Error().Err(err).Msg("wshub: DynamoDB scan failed")
		return
	}

	for _, item := range out.Items {
		attr, ok := item["connectionId"].(*types.AttributeValueMemberS)
		if !ok {
			continue
		}
		connID := attr.Value
		if _, postErr := h.mgmt.PostToConnection(ctx, &apigatewaymanagementapi.PostToConnectionInput{
			ConnectionId: aws.String(connID),
			Data:         payload,
		}); postErr != nil {
			log.Debug().Str("connectionId", connID).Msg("wshub: removing stale connection")
			_ = h.Disconnect(ctx, connID)
		}
	}
}
