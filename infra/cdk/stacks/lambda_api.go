package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsecr"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsssm"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// LambdaApiStackProps contains cross-stack references for the Lambda stack.
type LambdaApiStackProps struct {
	awscdk.StackProps
	EcrRepository awsecr.Repository
}

// LambdaApiStack deploys the Supply Chain API as an AWS Lambda function
// backed by a container image from ECR. The image must include the
// AWS Lambda Web Adapter (see Dockerfile.lambda) so the existing Go
// HTTP server runs unmodified inside Lambda.
//
// Uses a Lambda Function URL for a free, public HTTPS endpoint —
// no API Gateway or ALB required.
//
// Database: the Neon PostgreSQL connection string is stored in SSM
// Parameter Store (SecureString) and read by the Go server at cold start.
// Store the connection string with:
//
//	aws ssm put-parameter --name /supply-chain/DATABASE_URL --value "postgres://..." --type SecureString
//
// Cost: ~$0/month within free tier (1M requests, 400K GB-seconds).
type LambdaApiStack struct {
	awscdk.Stack
	FunctionUrl awslambda.FunctionUrl
}

func NewLambdaApiStack(scope constructs.Construct, id string, props *LambdaApiStackProps) *LambdaApiStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	// ── SSM Parameter for DATABASE_URL (SecureString) ───────────
	// The actual value is stored via CLI after deploy:
	//   aws ssm put-parameter --name /supply-chain/DATABASE_URL --value "postgres://..." --type SecureString
	ssmParamName := "/supply-chain/DATABASE_URL"

	// Import reference so we can grant read access (parameter is created via CLI)
	ssmParam := awsssm.StringParameter_FromSecureStringParameterAttributes(stack, jsii.String("DbUrlParam"), &awsssm.SecureStringParameterAttributes{
		ParameterName: jsii.String(ssmParamName),
	})

	// ── Lambda function from ECR container image ─────────────────
	// The ECR image tagged "lambda" must include the Lambda Web Adapter
	// extension which translates Lambda invoke events into HTTP requests.
	fn := awslambda.NewDockerImageFunction(stack, jsii.String("SupplyChainApiLambda"), &awslambda.DockerImageFunctionProps{
		FunctionName: jsii.String("supply-chain-api"),
		Code: awslambda.DockerImageCode_FromEcr(props.EcrRepository, &awslambda.EcrImageCodeProps{
			TagOrDigest: jsii.String("lambda"),
		}),
		MemorySize:   jsii.Number(256),
		Timeout:      awscdk.Duration_Seconds(jsii.Number(30)),
		Architecture: awslambda.Architecture_ARM_64(),
		Environment: &map[string]*string{
			"AWS_LWA_PORT":         jsii.String("8080"),
			"PORT":                 jsii.String("8080"),
			"LOG_FORMAT":           jsii.String("json"),
			"COGNITO_USER_POOL_ID": jsii.String(""), // set after deploy
			"COGNITO_CLIENT_ID":    jsii.String(""), // set after deploy
			"COGNITO_REGION":       jsii.String("us-east-1"),
			"ALLOWED_ORIGINS":      jsii.String("*"),
			"SSM_DATABASE_URL":     jsii.String(ssmParamName), // param name, not the secret
		},
	})

	// ── Grant Lambda permission to read the SSM SecureString ─────
	ssmParam.GrantRead(fn)
	// Also grant kms:Decrypt for the default SSM key (aws/ssm)
	fn.AddToRolePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   &[]*string{jsii.String("kms:Decrypt")},
		Resources: &[]*string{jsii.String("*")},
		Conditions: &map[string]interface{}{
			"StringEquals": map[string]*string{
				"kms:ViaService": jsii.String("ssm.us-east-1.amazonaws.com"),
			},
		},
	}))

	// ── Function URL — public HTTPS endpoint, no API Gateway needed ─
	fnUrl := fn.AddFunctionUrl(&awslambda.FunctionUrlOptions{
		AuthType: awslambda.FunctionUrlAuthType_NONE,
		Cors: &awslambda.FunctionUrlCorsOptions{
			AllowedOrigins: &[]*string{jsii.String("*")},
			AllowedMethods: &[]awslambda.HttpMethod{awslambda.HttpMethod_ALL},
			AllowedHeaders: &[]*string{jsii.String("*")},
			MaxAge:         awscdk.Duration_Hours(jsii.Number(1)),
		},
	})

	// ── Stack outputs ────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("LambdaFunctionUrl"), &awscdk.CfnOutputProps{
		Value:       fnUrl.Url(),
		Description: jsii.String("Lambda Function URL (HTTPS)"),
		ExportName:  jsii.String("SupplyChain-LambdaUrl"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("LambdaFunctionName"), &awscdk.CfnOutputProps{
		Value:       fn.FunctionName(),
		Description: jsii.String("Lambda function name"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("StoreDbUrlCommand"), &awscdk.CfnOutputProps{
		Value: jsii.String(
			"aws ssm put-parameter --name /supply-chain/DATABASE_URL " +
				"--value 'postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/supplychain?sslmode=require' " +
				"--type SecureString --overwrite",
		),
		Description: jsii.String("Command template to store DATABASE_URL in SSM (fill in real values)"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("SetCognitoCommand"), &awscdk.CfnOutputProps{
		Value: jsii.String(
			"aws lambda update-function-configuration --function-name supply-chain-api " +
				"--environment 'Variables={COGNITO_USER_POOL_ID=us-east-1_xxx,COGNITO_CLIENT_ID=xxx," +
				"COGNITO_REGION=us-east-1,ALLOWED_ORIGINS=*,AWS_LWA_PORT=8080,PORT=8080," +
				"LOG_FORMAT=json,SSM_DATABASE_URL=/supply-chain/DATABASE_URL}'",
		),
		Description: jsii.String("Command template to set Cognito env vars (fill in real values)"),
	})

	return &LambdaApiStack{
		Stack:       stack,
		FunctionUrl: fnUrl,
	}
}
