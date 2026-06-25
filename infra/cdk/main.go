package main

import (
	"fmt"
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/jsii-runtime-go"

	"github.com/jwhig/jw-dev/infra/cdk/stacks"
)

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	// ── Deployment profile ──────────────────────────────────────
	//   "full"       — EKS + RDS + NAT Gateway + WAF       (~$196/mo)
	//   "lite"       — App Runner + RDS + NAT instance      (~$25/mo)
	//   "ultra-lite" — Lambda + Neon (external DB) + no VPC (~$1-3/mo)
	profileCtx := app.Node().TryGetContext(jsii.String("profile"))
	profile := "ultra-lite" // default
	if v, ok := profileCtx.(string); ok && v != "" {
		profile = v
	}

	fmt.Printf("CDK profile: %s\n", profile)

	// ── Shared environment (account/region from CLI profile) ─────
	// Account comes from CDK_DEFAULT_ACCOUNT (set by the AWS CLI/credentials)
	// when available. Leaving it unset yields an account-agnostic synth — an
	// empty-string account is invalid ("aws:///us-east-1") and breaks synth.
	env := &awscdk.Environment{
		Region: jsii.String("us-east-1"),
	}
	if acct := os.Getenv("CDK_DEFAULT_ACCOUNT"); acct != "" {
		env.Account = jsii.String(acct)
	}

	// ── 1. Auth — Cognito User Pool (all profiles) ──────────────
	stacks.NewAuthStack(app, "SupplyChainAuth", &awscdk.StackProps{
		Env:         env,
		Description: jsii.String("Supply Chain API — Cognito User Pool (admin-only signup)"),
	})

	// ── 2. Container — ECR repository (all profiles) ────────────
	containerStack := stacks.NewContainerStack(app, "SupplyChainContainer", &awscdk.StackProps{
		Env:         env,
		Description: jsii.String("Supply Chain API — ECR repository"),
	})

	// ── 3. Network — VPC (full & lite only, ultra-lite has no VPC) ─
	var vpc awsec2.Vpc
	var dbStack *stacks.DatabaseStack

	if profile != "ultra-lite" {
		if profile == "full" {
			netStack := stacks.NewNetworkStack(app, "SupplyChainNetwork", &awscdk.StackProps{
				Env:         env,
				Description: jsii.String("Supply Chain API — VPC, subnets, NAT gateway"),
			})
			vpc = netStack.Vpc
		} else {
			netStack := stacks.NewNetworkLiteStack(app, "SupplyChainNetwork", &awscdk.StackProps{
				Env:         env,
				Description: jsii.String("Supply Chain API — VPC, subnets, NAT instance (lite)"),
			})
			vpc = netStack.Vpc
		}

		// ── 4. Database — RDS PostgreSQL (full & lite only) ─────────
		dbStack = stacks.NewDatabaseStack(app, "SupplyChainDatabase", &stacks.DatabaseStackProps{
			StackProps: awscdk.StackProps{
				Env:         env,
				Description: jsii.String("Supply Chain API — RDS PostgreSQL 16"),
			},
			Vpc: vpc,
		})
	}

	// ── 5. Security — WAF (full & lite only) ────────────────────
	// Ultra-lite: Lambda has built-in throttling + CloudFront has Shield Standard
	var securityStack *stacks.SecurityStack
	if profile != "ultra-lite" {
		securityStack = stacks.NewSecurityStack(app, "SupplyChainSecurity", &awscdk.StackProps{
			Env:         env,
			Description: jsii.String("Supply Chain — WAF rate limiting + managed rules"),
		})
	}

	// ── 6. Web Hosting — S3 + CloudFront (all profiles) ─────────
	// Created before compute so the Lambda (ultra-lite) can lock its CORS to the
	// CloudFront origin via a cross-stack reference.
	var cfWebAclArn *string
	if securityStack != nil {
		cfWebAclArn = securityStack.CloudFrontWebAclArn
	}
	webHosting := stacks.NewWebHostingStack(app, "GlobifyWebHosting", &stacks.WebHostingStackProps{
		StackProps: awscdk.StackProps{
			Env:         env,
			Description: jsii.String("Globify — S3 + CloudFront static web hosting"),
		},
		CloudFrontWebAclArn: cfWebAclArn,
	})
	webOrigin := jsii.String("https://" + *webHosting.Distribution.DistributionDomainName())

	// ── 7. Compute ──────────────────────────────────────────────
	switch profile {
	case "full":
		stacks.NewClusterStack(app, "SupplyChainCluster", &stacks.ClusterStackProps{
			StackProps: awscdk.StackProps{
				Env:         env,
				Description: jsii.String("Supply Chain API — EKS cluster, node group, ALB controller"),
			},
			Vpc:              vpc,
			RdsSecurityGroup: dbStack.RdsSecurityGroup,
			EcrRepository:    containerStack.Repository,
		})
	case "lite":
		stacks.NewAppRunnerStack(app, "SupplyChainAppRunner", &stacks.AppRunnerStackProps{
			StackProps: awscdk.StackProps{
				Env:         env,
				Description: jsii.String("Supply Chain API — App Runner (lite)"),
			},
			Vpc:              vpc,
			RdsSecurityGroup: dbStack.RdsSecurityGroup,
			EcrRepository:    containerStack.Repository,
		})
	case "ultra-lite":
		stacks.NewLambdaApiStack(app, "SupplyChainLambdaApi", &stacks.LambdaApiStackProps{
			StackProps: awscdk.StackProps{
				Env:         env,
				Description: jsii.String("Supply Chain API — Lambda + Function URL (ultra-lite)"),
			},
			EcrRepository: containerStack.Repository,
			WebOrigin:     webOrigin,
		})
	}

	// ── 7b. Tile Hosting — disabled pending visual quality improvements
	// stacks.NewTileHostingStack(app, "GlobifyTileHosting", &stacks.TileHostingStackProps{
	// 	StackProps: awscdk.StackProps{
	// 		Env:         env,
	// 		Description: jsii.String("Globify — S3 + CloudFront NASA tile imagery CDN"),
	// 	},
	// 	CloudFrontWebAclArn: cfWebAclArn,
	// })

	// ── 8. Budget alarm (all profiles, different limits) ────────
	budgetLimit := 250.0
	switch profile {
	case "lite":
		budgetLimit = 50.0
	case "ultra-lite":
		budgetLimit = 10.0
	}
	stacks.NewBudgetStack(app, "SupplyChainBudget", &stacks.BudgetStackProps{
		StackProps: awscdk.StackProps{
			Env:         env,
			Description: jsii.String("Supply Chain — monthly cost budget with email alerts"),
		},
		MonthlyLimitUSD: budgetLimit,
		AlertEmail:      "your-email@example.com", // ← replace with your email
	})

	app.Synth(nil)
}
