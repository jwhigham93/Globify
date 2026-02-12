package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfront"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfrontorigins"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3deployment"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// WebHostingStackProps includes optional WAF ACL ARN for CloudFront.
type WebHostingStackProps struct {
	awscdk.StackProps
	// CloudFrontWebAclArn is the ARN of the WAF Web ACL to associate with CloudFront.
	// If empty, no WAF is attached.
	CloudFrontWebAclArn *string
}

// WebHostingStack creates an S3 bucket + CloudFront distribution
// for serving the Expo web build as a static site.
type WebHostingStack struct {
	awscdk.Stack
	Bucket       awss3.Bucket
	Distribution awscloudfront.Distribution
}

func NewWebHostingStack(scope constructs.Construct, id string, props *WebHostingStackProps) *WebHostingStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	// ── S3 Bucket (private, CloudFront-only access) ─────────────
	bucket := awss3.NewBucket(stack, jsii.String("GlobifyWebBucket"), &awss3.BucketProps{
		BucketName:        jsii.String("globify-web-app"),
		BlockPublicAccess: awss3.BlockPublicAccess_BLOCK_ALL(),
		RemovalPolicy:     awscdk.RemovalPolicy_DESTROY,
		AutoDeleteObjects: jsii.Bool(true), // dev — remove for prod
		Versioned:         jsii.Bool(false),
	})

	// ── Origin Access Identity for CloudFront → S3 ──────────────
	oai := awscloudfront.NewOriginAccessIdentity(stack, jsii.String("GlobifyOAI"), &awscloudfront.OriginAccessIdentityProps{
		Comment: jsii.String("OAI for Globify web app"),
	})

	bucket.GrantRead(oai, jsii.String("*"))

	// ── CloudFront Distribution ─────────────────────────────────
	distributionProps := &awscloudfront.DistributionProps{
		Comment:          jsii.String("Globify Expo web app"),
		DefaultRootObject: jsii.String("index.html"),
		DefaultBehavior: &awscloudfront.BehaviorOptions{
			Origin: awscloudfrontorigins.NewS3Origin(bucket, &awscloudfrontorigins.S3OriginProps{
				OriginAccessIdentity: oai,
			}),
			ViewerProtocolPolicy: awscloudfront.ViewerProtocolPolicy_REDIRECT_TO_HTTPS,
			CachePolicy:          awscloudfront.CachePolicy_CACHING_OPTIMIZED(),
			Compress:             jsii.Bool(true),
		},
		// SPA fallback — serve index.html for all 404s so client-side routing works
		ErrorResponses: &[]*awscloudfront.ErrorResponse{
			{
				HttpStatus:         jsii.Number(403),
				ResponseHttpStatus: jsii.Number(200),
				ResponsePagePath:   jsii.String("/index.html"),
				Ttl:                awscdk.Duration_Seconds(jsii.Number(0)),
			},
			{
				HttpStatus:         jsii.Number(404),
				ResponseHttpStatus: jsii.Number(200),
				ResponsePagePath:   jsii.String("/index.html"),
				Ttl:                awscdk.Duration_Seconds(jsii.Number(0)),
			},
		},
		PriceClass: awscloudfront.PriceClass_PRICE_CLASS_100, // US + Europe only (cheapest)
	}

	// Attach WAF if provided
	if props.CloudFrontWebAclArn != nil && *props.CloudFrontWebAclArn != "" {
		distributionProps.WebAclId = props.CloudFrontWebAclArn
	}

	distribution := awscloudfront.NewDistribution(stack, jsii.String("GlobifyDistribution"), distributionProps)

	// ── S3 Deployment (placeholder — real deploy is via CLI/CI) ──
	// This deploys a placeholder; actual builds use the CLI command documented below.
	// Uncomment to auto-deploy from a local build directory:
	// awss3deployment.NewBucketDeployment(stack, jsii.String("DeployWeb"), &awss3deployment.BucketDeploymentProps{
	//   Sources:      &[]awss3deployment.ISource{awss3deployment.Source_Asset(jsii.String("../../apps/Globify/dist"), nil)},
	//   DestinationBucket: bucket,
	//   Distribution: distribution,
	//   DistributionPaths: &[]*string{jsii.String("/*")},
	// })

	// Suppress unused import warning for s3deployment (used in commented code above)
	_ = awss3deployment.Source_Asset

	// ── Grant CloudFront read access via bucket policy ───────────
	bucket.AddToResourcePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   &[]*string{jsii.String("s3:GetObject")},
		Resources: &[]*string{bucket.ArnForObjects(jsii.String("*"))},
		Principals: &[]awsiam.IPrincipal{
			awsiam.NewCanonicalUserPrincipal(oai.CloudFrontOriginAccessIdentityS3CanonicalUserId()),
		},
	}))

	// ── Stack outputs ────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("WebBucketName"), &awscdk.CfnOutputProps{
		Value:       bucket.BucketName(),
		Description: jsii.String("S3 bucket for Globify web build"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("CloudFrontURL"), &awscdk.CfnOutputProps{
		Value:       jsii.String("https://" + *distribution.DistributionDomainName()),
		Description: jsii.String("CloudFront URL for Globify web app"),
		ExportName:  jsii.String("Globify-CloudFrontURL"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("DistributionId"), &awscdk.CfnOutputProps{
		Value:       distribution.DistributionId(),
		Description: jsii.String("CloudFront distribution ID (for cache invalidation)"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("DeployCommand"), &awscdk.CfnOutputProps{
		Value: jsii.String(
			"aws s3 sync apps/Globify/dist s3://globify-web-app --delete && " +
				"aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths '/*'",
		),
		Description: jsii.String("Command to deploy a new web build"),
	})

	return &WebHostingStack{
		Stack:        stack,
		Bucket:       bucket,
		Distribution: distribution,
	}
}
