package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscognito"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// AuthStack creates a Cognito User Pool and App Client for mobile authentication.
type AuthStack struct {
	awscdk.Stack
	UserPool  awscognito.UserPool
	AppClient awscognito.UserPoolClient
}

func NewAuthStack(scope constructs.Construct, id string, props *awscdk.StackProps) *AuthStack {
	stack := awscdk.NewStack(scope, &id, props)

	// ── User Pool — email sign-in, email verification required ──
	userPool := awscognito.NewUserPool(stack, jsii.String("SupplyChainUserPool"), &awscognito.UserPoolProps{
		UserPoolName: jsii.String("supply-chain-users"),
		SelfSignUpEnabled: jsii.Bool(false), // admin-only — create users via CLI
		SignInAliases: &awscognito.SignInAliases{
			Email: jsii.Bool(true),
		},
		AutoVerify: &awscognito.AutoVerifiedAttrs{
			Email: jsii.Bool(true),
		},
		StandardAttributes: &awscognito.StandardAttributes{
			Email: &awscognito.StandardAttribute{
				Required: jsii.Bool(true),
				Mutable:  jsii.Bool(true),
			},
		},
		PasswordPolicy: &awscognito.PasswordPolicy{
			MinLength:        jsii.Number(8),
			RequireLowercase: jsii.Bool(true),
			RequireUppercase: jsii.Bool(true),
			RequireDigits:    jsii.Bool(true),
			RequireSymbols:   jsii.Bool(false),
		},
		AccountRecovery: awscognito.AccountRecovery_EMAIL_ONLY,
		RemovalPolicy:   awscdk.RemovalPolicy_DESTROY, // dev — change for prod
	})

	// ── App Client — no secret, SRP + password auth flows ───────
	appClient := userPool.AddClient(jsii.String("GlobifyAppClient"), &awscognito.UserPoolClientOptions{
		UserPoolClientName: jsii.String("globify-app"),
		GenerateSecret:     jsii.Bool(false), // required for mobile/SPA
		AuthFlows: &awscognito.AuthFlow{
			UserPassword: jsii.Bool(true), // USER_PASSWORD_AUTH
			UserSrp:      jsii.Bool(true), // USER_SRP_AUTH
		},
		IdTokenValidity:      awscdk.Duration_Hours(jsii.Number(1)),
		RefreshTokenValidity: awscdk.Duration_Days(jsii.Number(30)),
		PreventUserExistenceErrors: jsii.Bool(true),
	})

	// ── Stack outputs ────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("UserPoolId"), &awscdk.CfnOutputProps{
		Value:       userPool.UserPoolId(),
		Description: jsii.String("Cognito User Pool ID"),
		ExportName:  jsii.String("SupplyChain-UserPoolId"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("AppClientId"), &awscdk.CfnOutputProps{
		Value:       appClient.UserPoolClientId(),
		Description: jsii.String("Cognito App Client ID"),
		ExportName:  jsii.String("SupplyChain-AppClientId"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("CognitoRegion"), &awscdk.CfnOutputProps{
		Value:       stack.Region(),
		Description: jsii.String("AWS region for Cognito"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("CreateUserCommand"), &awscdk.CfnOutputProps{
		Value:       jsii.String("aws cognito-idp admin-create-user --user-pool-id <POOL_ID> --username user@example.com --temporary-password 'TempPass1!' --user-attributes Name=email,Value=user@example.com Name=email_verified,Value=true"),
		Description: jsii.String("Command to create a new user (admin-only signup)"),
	})

	return &AuthStack{
		Stack:     stack,
		UserPool:  userPool,
		AppClient: appClient,
	}
}
