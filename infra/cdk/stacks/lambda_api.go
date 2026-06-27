package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsdynamodb"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2integrations"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsevents"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseventstargets"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsssm"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// LambdaApiStackProps contains cross-stack references for the Lambda stack.
type LambdaApiStackProps struct {
	awscdk.StackProps
	// WebOrigin is the allowed browser origin for CORS (the CloudFront URL of
	// the web app). Used for both the app-level ALLOWED_ORIGINS env var and the
	// HTTP API CORS config. Never "*". If empty, falls back to localhost dev.
	WebOrigin *string
	// Cognito values are passed as CDK context (-c flag) so they survive
	// re-deploys without being hardcoded in source. Empty strings are safe —
	// the Lambda will reject requests with a 401 when Cognito is not wired up.
	CognitoUserPoolID string
	CognitoClientID   string
}

// LambdaApiStack deploys the Supply Chain API as an AWS Lambda function
// behind an API Gateway HTTP API. Uses zip asset + Lambda Web Adapter layer.
// The existing Go HTTP server runs unmodified; LWA proxies invocations to HTTP.
//
// Cost: ~$1/million requests (HTTP API) + Lambda free tier + DynamoDB free tier.
type LambdaApiStack struct {
	awscdk.Stack
	ApiUrl *string
	WsUrl  *string
}

func NewLambdaApiStack(scope constructs.Construct, id string, props *LambdaApiStackProps) *LambdaApiStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	// ── Resolve allowed web origin (CORS) ───────────────────────────────
	webOrigin := jsii.String("http://localhost:8081")
	if props.WebOrigin != nil && *props.WebOrigin != "" {
		webOrigin = props.WebOrigin
	}

	// ── SSM Parameter for DATABASE_URL (SecureString) ────────────────────
	ssmParamName := "/supply-chain/DATABASE_URL"
	ssmParam := awsssm.StringParameter_FromSecureStringParameterAttributes(stack, jsii.String("DbUrlParam"), &awsssm.SecureStringParameterAttributes{
		ParameterName: jsii.String(ssmParamName),
	})

	// ── DynamoDB table for WebSocket connection IDs ──────────────────────
	// Pay-per-request billing; TTL auto-expires stale connections.
	// Sits entirely within the DynamoDB always-free tier for portfolio scale.
	wsTable := awsdynamodb.NewTable(stack, jsii.String("WsConnections"), &awsdynamodb.TableProps{
		TableName: jsii.String("ws-connections"),
		PartitionKey: &awsdynamodb.Attribute{
			Name: jsii.String("connectionId"),
			Type: awsdynamodb.AttributeType_STRING,
		},
		TimeToLiveAttribute: jsii.String("expiresAt"),
		BillingMode:         awsdynamodb.BillingMode_PAY_PER_REQUEST,
		RemovalPolicy:       awscdk.RemovalPolicy_DESTROY,
	})

	// ── AWS Lambda Web Adapter layer (v1.0.1, x86_64) ───────────────────
	lwaLayer := awslambda.LayerVersion_FromLayerVersionArn(
		stack,
		jsii.String("LwaLayer"),
		jsii.String("arn:aws:lambda:us-east-1:753240598075:layer:LambdaAdapterLayerX86:28"),
	)

	// ── Lambda function from zip asset ───────────────────────────────────
	fn := awslambda.NewFunction(stack, jsii.String("SupplyChainApiLambda"), &awslambda.FunctionProps{
		FunctionName: jsii.String("supply-chain-api"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2023(),
		Architecture: awslambda.Architecture_X86_64(),
		Handler:      jsii.String("bootstrap"),
		Code:         awslambda.Code_FromAsset(jsii.String("../../services/supply-chain-api/dist/lambda.zip"), nil),
		Layers:       &[]awslambda.ILayerVersion{lwaLayer},
		MemorySize:   jsii.Number(256),
		Timeout:      awscdk.Duration_Seconds(jsii.Number(30)),
		Environment: &map[string]*string{
			"AWS_LWA_PORT":         jsii.String("8080"),
			"PORT":                 jsii.String("8080"),
			"LOG_FORMAT":           jsii.String("json"),
			"COGNITO_USER_POOL_ID": jsii.String(props.CognitoUserPoolID),
			"COGNITO_CLIENT_ID":    jsii.String(props.CognitoClientID),
			"COGNITO_REGION":       jsii.String("us-east-1"),
			"ALLOWED_ORIGINS":      webOrigin,
			"SSM_DATABASE_URL":     jsii.String(ssmParamName),
			// DYNAMODB_WS_TABLE and APIGW_WS_ENDPOINT are set below after the
			// WebSocket API is created, since they depend on CDK token values.
		},
	})

	// ── Grant Lambda permission to read the SSM SecureString ─────────────
	ssmParam.GrantRead(fn)
	fn.AddToRolePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   &[]*string{jsii.String("kms:Decrypt")},
		Resources: &[]*string{jsii.String("*")},
		Conditions: &map[string]interface{}{
			"StringEquals": map[string]*string{
				"kms:ViaService": jsii.String("ssm.us-east-1.amazonaws.com"),
			},
		},
	}))

	// Grant Lambda DynamoDB read/write for WebSocket connection storage
	wsTable.GrantReadWriteData(fn)

	// ── API Gateway HTTP API (REST endpoints) ────────────────────────────
	// HTTP API is simpler and cheaper than REST API ($1/million vs $3.50/million).
	// CORS is configured here; the Go app also validates origins in-process.
	httpApi := awsapigatewayv2.NewHttpApi(stack, jsii.String("SupplyChainHttpApi"), &awsapigatewayv2.HttpApiProps{
		ApiName: jsii.String("supply-chain-api"),
		CorsPreflight: &awsapigatewayv2.CorsPreflightOptions{
			AllowOrigins: &[]*string{webOrigin, jsii.String("http://localhost:8081"), jsii.String("http://localhost:8082")},
			AllowMethods: &[]awsapigatewayv2.CorsHttpMethod{
				awsapigatewayv2.CorsHttpMethod_GET,
				awsapigatewayv2.CorsHttpMethod_POST,
				awsapigatewayv2.CorsHttpMethod_OPTIONS,
			},
			AllowHeaders: &[]*string{
				jsii.String("Authorization"),
				jsii.String("Content-Type"),
				jsii.String("X-Device-API-Key"),
			},
			MaxAge: awscdk.Duration_Hours(jsii.Number(1)),
		},
	})

	// Proxy ALL routes to the Lambda (the Go router handles routing internally)
	httpIntegration := awsapigatewayv2integrations.NewHttpLambdaIntegration(
		jsii.String("LambdaIntegration"),
		fn,
		nil,
	)
	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/{proxy+}"),
		Methods:     &[]awsapigatewayv2.HttpMethod{awsapigatewayv2.HttpMethod_ANY},
		Integration: httpIntegration,
	})

	// ── API Gateway WebSocket API (GPS streaming) ────────────────────────
	// All three routes ($connect, $disconnect, $default) invoke the same Lambda.
	// LWA maps them to POST /_ws/connect, /_ws/disconnect, /_ws/default.
	wsIntegration := awsapigatewayv2integrations.NewWebSocketLambdaIntegration(
		jsii.String("WsLambdaIntegration"),
		fn,
		nil,
	)
	wsApi := awsapigatewayv2.NewWebSocketApi(stack, jsii.String("SupplyChainWsApi"), &awsapigatewayv2.WebSocketApiProps{
		ApiName: jsii.String("supply-chain-ws"),
		ConnectRouteOptions: &awsapigatewayv2.WebSocketRouteOptions{
			Integration: wsIntegration,
		},
		DisconnectRouteOptions: &awsapigatewayv2.WebSocketRouteOptions{
			Integration: wsIntegration,
		},
		DefaultRouteOptions: &awsapigatewayv2.WebSocketRouteOptions{
			Integration: wsIntegration,
		},
	})

	wsStage := awsapigatewayv2.NewWebSocketStage(stack, jsii.String("WsApiProdStage"), &awsapigatewayv2.WebSocketStageProps{
		WebSocketApi: wsApi,
		StageName:    jsii.String("production"),
		AutoDeploy:   jsii.Bool(true),
	})

	// Grant Lambda permission to post messages back to connected WebSocket clients
	fn.AddToRolePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   &[]*string{jsii.String("execute-api:ManageConnections")},
		Resources: &[]*string{jsii.String("arn:aws:execute-api:*:*:*/@connections/*")},
	}))

	// Wire DynamoDB table name and WebSocket callback URL into Lambda env vars.
	// These use CDK tokens resolved at deploy time (not synth time).
	fn.AddEnvironment(jsii.String("DYNAMODB_WS_TABLE"), wsTable.TableName(), nil)
	fn.AddEnvironment(jsii.String("APIGW_WS_ENDPOINT"), wsStage.CallbackUrl(), nil)

	// GPS simulator: EventBridge rule fires every 2 minutes, invoking the same
	// Lambda with a simulator payload. LWA routes it to POST /events where
	// RunGPSSimulator updates truck positions and broadcasts via WebSocket.
	simulatorRule := awsevents.NewRule(stack, jsii.String("GPSSimulatorRule"), &awsevents.RuleProps{
		Schedule:    awsevents.Schedule_Rate(awscdk.Duration_Minutes(jsii.Number(2))),
		Description: jsii.String("Simulates GPS movement for active vehicles every 2 minutes"),
	})
	simulatorRule.AddTarget(awseventstargets.NewLambdaFunction(fn, &awseventstargets.LambdaFunctionProps{
		Event: awsevents.RuleTargetInput_FromObject(map[string]interface{}{
			"source":      "supply-chain.simulator",
			"detail-type": "SimulateGPS",
			"detail":      map[string]interface{}{},
		}),
	}))

	// ── Stack outputs ─────────────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("ApiGatewayUrl"), &awscdk.CfnOutputProps{
		Value:       httpApi.ApiEndpoint(),
		Description: jsii.String("API Gateway HTTP API endpoint"),
		ExportName:  jsii.String("SupplyChain-ApiUrl"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("WebSocketUrl"), &awscdk.CfnOutputProps{
		Value:       wsStage.Url(),
		Description: jsii.String("API Gateway WebSocket URL (set as EXPO_PUBLIC_WS_URL GitHub secret)"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("LambdaFunctionName"), &awscdk.CfnOutputProps{
		Value:       fn.FunctionName(),
		Description: jsii.String("Lambda function name"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("SetCognitoCommand"), &awscdk.CfnOutputProps{
		Value: jsii.String(
			"aws lambda update-function-configuration --function-name supply-chain-api " +
				"--environment 'Variables={COGNITO_USER_POOL_ID=us-east-1_xxx,COGNITO_CLIENT_ID=xxx," +
				"COGNITO_REGION=us-east-1,ALLOWED_ORIGINS=https://dxxxx.cloudfront.net,AWS_LWA_PORT=8080,PORT=8080," +
				"LOG_FORMAT=json,SSM_DATABASE_URL=/supply-chain/DATABASE_URL}'",
		),
		Description: jsii.String("Command template to set Cognito env vars (fill in real values)"),
	})

	return &LambdaApiStack{
		Stack:  stack,
		ApiUrl: httpApi.ApiEndpoint(),
		WsUrl:  wsStage.Url(),
	}
}
