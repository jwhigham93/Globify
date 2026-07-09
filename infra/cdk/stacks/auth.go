package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscognito"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// AuthStackProps holds credentials needed to configure federated identity providers.
type AuthStackProps struct {
	awscdk.StackProps
	// GoogleClientId is the OAuth 2.0 client ID from Google Cloud Console.
	GoogleClientId string
	// GoogleClientSecretName is the name of the AWS Secrets Manager secret holding
	// the OAuth 2.0 client secret. The value is referenced via a CloudFormation
	// dynamic reference so it never appears in plaintext in the synthesized
	// template. The CI deploy job upserts this secret before running cdk deploy.
	GoogleClientSecretName string
	// WebOrigin is the CloudFront URL used as the OAuth callback + logout URL.
	WebOrigin string
}

// AuthStack creates a Cognito User Pool with Google social sign-in via the
// Hosted UI. The authorization_code flow is used: the browser redirects to
// Cognito, authenticates with Google, then returns to the app with a code that
// is exchanged server-to-server for tokens.
type AuthStack struct {
	awscdk.Stack
	UserPool  awscognito.UserPool
	AppClient awscognito.UserPoolClient
}

func NewAuthStack(scope constructs.Construct, id string, props *AuthStackProps) *AuthStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	callbackUrl := "https://d2oqi8rhtjt2i6.cloudfront.net"
	if props.WebOrigin != "" {
		callbackUrl = props.WebOrigin
	}

	// ── User Pool ────────────────────────────────────────────────────────────
	userPool := awscognito.NewUserPool(stack, jsii.String("SupplyChainUserPool"), &awscognito.UserPoolProps{
		UserPoolName:      jsii.String("supply-chain-users"),
		SelfSignUpEnabled: jsii.Bool(false),
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
			MinLength:        jsii.Number(12),
			RequireLowercase: jsii.Bool(true),
			RequireUppercase: jsii.Bool(true),
			RequireDigits:    jsii.Bool(true),
			RequireSymbols:   jsii.Bool(true),
		},
		Mfa: awscognito.Mfa_OPTIONAL,
		MfaSecondFactor: &awscognito.MfaSecondFactor{
			Otp: jsii.Bool(true),
			Sms: jsii.Bool(false),
		},
		AccountRecovery: awscognito.AccountRecovery_EMAIL_ONLY,
		RemovalPolicy:   awscdk.RemovalPolicy_DESTROY,
	})

	// ── Hosted UI domain (globify-auth.auth.us-east-1.amazoncognito.com) ────
	userPool.AddDomain(jsii.String("GlobifyAuthDomain"), &awscognito.UserPoolDomainOptions{
		CognitoDomain: &awscognito.CognitoDomainOptions{
			DomainPrefix: jsii.String("globify-auth"),
		},
	})

	// ── Google Identity Provider ─────────────────────────────────────────────
	googleIDP := awscognito.NewUserPoolIdentityProviderGoogle(stack, jsii.String("GoogleIDP"), &awscognito.UserPoolIdentityProviderGoogleProps{
		UserPool:          userPool,
		ClientId:          jsii.String(props.GoogleClientId),
		ClientSecretValue: awscdk.SecretValue_SecretsManager(jsii.String(props.GoogleClientSecretName), nil),
		Scopes:            &[]*string{jsii.String("openid"), jsii.String("email"), jsii.String("profile")},
		AttributeMapping: &awscognito.AttributeMapping{
			Email:          awscognito.ProviderAttribute_GOOGLE_EMAIL(),
			Fullname:       awscognito.ProviderAttribute_GOOGLE_NAME(),
			ProfilePicture: awscognito.ProviderAttribute_GOOGLE_PICTURE(),
		},
	})

	// ── App Client — authorization_code flow with Google ────────────────────
	appClient := userPool.AddClient(jsii.String("GlobifyAppClient"), &awscognito.UserPoolClientOptions{
		UserPoolClientName: jsii.String("globify-app"),
		GenerateSecret:     jsii.Bool(false),
		SupportedIdentityProviders: &[]awscognito.UserPoolClientIdentityProvider{
			awscognito.UserPoolClientIdentityProvider_GOOGLE(),
		},
		OAuth: &awscognito.OAuthSettings{
			Flows: &awscognito.OAuthFlows{
				AuthorizationCodeGrant: jsii.Bool(true),
			},
			Scopes: &[]awscognito.OAuthScope{
				awscognito.OAuthScope_OPENID(),
				awscognito.OAuthScope_EMAIL(),
				awscognito.OAuthScope_PROFILE(),
			},
			CallbackUrls: &[]*string{
				jsii.String(callbackUrl),
				jsii.String("http://localhost:8081"),
			},
			LogoutUrls: &[]*string{
				jsii.String(callbackUrl),
				jsii.String("http://localhost:8081"),
			},
		},
		IdTokenValidity:            awscdk.Duration_Hours(jsii.Number(1)),
		RefreshTokenValidity:       awscdk.Duration_Days(jsii.Number(30)),
		PreventUserExistenceErrors: jsii.Bool(true),
	})

	// App client must be created after the IDP is registered
	appClient.Node().AddDependency(googleIDP)

	// ── Stack outputs ────────────────────────────────────────────────────────
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

	awscdk.NewCfnOutput(stack, jsii.String("HostedUiDomain"), &awscdk.CfnOutputProps{
		Value:       jsii.String("https://globify-auth.auth.us-east-1.amazoncognito.com"),
		Description: jsii.String("Cognito Hosted UI base URL (set as EXPO_PUBLIC_COGNITO_DOMAIN GitHub secret)"),
	})

	return &AuthStack{
		Stack:     stack,
		UserPool:  userPool,
		AppClient: appClient,
	}
}
