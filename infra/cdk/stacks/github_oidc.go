package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// GithubOidcStackProps configures the GitHub Actions OIDC deploy role.
type GithubOidcStackProps struct {
	awscdk.StackProps
	// GithubRepo is the "owner/repo" allowed to assume the deploy role.
	GithubRepo string
	// WebBucketName is the S3 bucket the frontend job syncs to.
	WebBucketName string
	// LambdaFunctionName is the function the backend job updates directly.
	LambdaFunctionName string
	// GoogleSecretName is the Secrets Manager secret the infra job upserts.
	GoogleSecretName string
}

// GithubOidcStack provisions an IAM OIDC identity provider for GitHub Actions
// plus a deploy role that trusts only this repository. It replaces the
// long-lived globify-deploy IAM user access keys: workflows exchange a
// short-lived GitHub OIDC token for temporary role credentials, so no static
// AWS secrets are stored in GitHub.
//
// One-time bootstrap (run once with the existing admin credentials):
//  1. cdk deploy SupplyChainGithubOidc -c profile=<profile>
//  2. Copy the GithubDeployRoleArn output into the AWS_DEPLOY_ROLE_ARN GitHub secret.
//  3. Delete the AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY GitHub secrets and the
//     globify-deploy IAM user.
//
// After bootstrap the role can redeploy itself via the cdk-* roles below.
type GithubOidcStack struct {
	awscdk.Stack
}

func NewGithubOidcStack(scope constructs.Construct, id string, props *GithubOidcStackProps) *GithubOidcStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	// The GitHub Actions OIDC provider is account-global; only one may exist per
	// URL. If your account already has it (from a prior setup), import it with
	// awsiam.OpenIdConnectProvider_FromOpenIdConnectProviderArn instead of creating.
	provider := awsiam.NewOpenIdConnectProvider(stack, jsii.String("GithubOidcProvider"), &awsiam.OpenIdConnectProviderProps{
		Url:       jsii.String("https://token.actions.githubusercontent.com"),
		ClientIds: &[]*string{jsii.String("sts.amazonaws.com")},
	})

	// Trust policy: exact-match the audience and the subject. All three deploy
	// jobs run in the `production` GitHub environment, so their OIDC token sub is
	// "repo:<repo>:environment:production" — pin to that rather than a bare ":*",
	// which would let a workflow on any branch/PR assume this write-capable role.
	// (If a deploy job stops using `environment: production`, its sub reverts to
	// the ref form and this trust policy must be updated to match.)
	principal := awsiam.NewOpenIdConnectPrincipal(provider, &map[string]interface{}{
		"StringEquals": map[string]interface{}{
			"token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
			"token.actions.githubusercontent.com:sub": "repo:" + props.GithubRepo + ":environment:production",
		},
	})

	role := awsiam.NewRole(stack, jsii.String("GithubDeployRole"), &awsiam.RoleProps{
		RoleName:           jsii.String("globify-github-deploy"),
		AssumedBy:          principal,
		Description:        jsii.String("Assumed by GitHub Actions via OIDC to deploy Globify (replaces globify-deploy user)"),
		MaxSessionDuration: awscdk.Duration_Hours(jsii.Number(1)),
	})

	account := awscdk.Aws_ACCOUNT_ID()

	// 1. CDK deploys assume the cdk-* bootstrap roles, which already carry the
	//    scoped permissions provisioned by `cdk bootstrap` — so the GitHub role
	//    itself never needs broad create/update rights on app resources.
	role.AddToPolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   &[]*string{jsii.String("sts:AssumeRole")},
		Resources: &[]*string{jsii.String("arn:aws:iam::" + *account + ":role/cdk-*")},
	}))

	// 2. Frontend job: sync the web bucket and invalidate CloudFront directly.
	role.AddToPolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions: &[]*string{
			jsii.String("s3:ListBucket"),
			jsii.String("s3:PutObject"),
			jsii.String("s3:GetObject"),
			jsii.String("s3:DeleteObject"),
		},
		Resources: &[]*string{
			jsii.String("arn:aws:s3:::" + props.WebBucketName),
			jsii.String("arn:aws:s3:::" + props.WebBucketName + "/*"),
		},
	}))
	role.AddToPolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   &[]*string{jsii.String("cloudfront:CreateInvalidation")},
		Resources: &[]*string{jsii.String("*")},
	}))

	// 3. Backend job: push new Lambda code and wait for the update directly.
	role.AddToPolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions: &[]*string{
			jsii.String("lambda:UpdateFunctionCode"),
			jsii.String("lambda:GetFunction"),
			jsii.String("lambda:GetFunctionConfiguration"),
		},
		Resources: &[]*string{jsii.String("arn:aws:lambda:*:" + *account + ":function:" + props.LambdaFunctionName)},
	}))

	// 4. Infra job: upsert the Google OAuth client secret before cdk deploy.
	role.AddToPolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions: &[]*string{
			jsii.String("secretsmanager:CreateSecret"),
			jsii.String("secretsmanager:PutSecretValue"),
			jsii.String("secretsmanager:DescribeSecret"),
			jsii.String("secretsmanager:TagResource"),
		},
		Resources: &[]*string{jsii.String("arn:aws:secretsmanager:*:" + *account + ":secret:" + props.GoogleSecretName + "*")},
	}))

	awscdk.NewCfnOutput(stack, jsii.String("GithubDeployRoleArn"), &awscdk.CfnOutputProps{
		Value:       role.RoleArn(),
		Description: jsii.String("Set as the AWS_DEPLOY_ROLE_ARN GitHub secret; used by .github/workflows/deploy.yml"),
	})

	return &GithubOidcStack{Stack: stack}
}
