package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfront"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfrontorigins"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// TileHostingStackProps includes optional WAF ACL ARN for CloudFront.
type TileHostingStackProps struct {
	awscdk.StackProps
	CloudFrontWebAclArn *string
}

// TileHostingStack creates an S3 bucket + CloudFront distribution
// for serving pre-processed NASA Earth imagery tiles.
type TileHostingStack struct {
	awscdk.Stack
	Bucket       awss3.Bucket
	Distribution awscloudfront.Distribution
}

func NewTileHostingStack(scope constructs.Construct, id string, props *TileHostingStackProps) *TileHostingStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	// ── S3 Bucket (private, CloudFront-only access) ─────────────
	bucket := awss3.NewBucket(stack, jsii.String("NasaTileBucket"), &awss3.BucketProps{
		BucketName:        jsii.String("globify-nasa-tiles"),
		BlockPublicAccess: awss3.BlockPublicAccess_BLOCK_ALL(),
		RemovalPolicy:     awscdk.RemovalPolicy_DESTROY,
		AutoDeleteObjects: jsii.Bool(true),
		Versioned:         jsii.Bool(false),
	})

	// ── Origin Access Identity for CloudFront → S3 ──────────────
	oai := awscloudfront.NewOriginAccessIdentity(stack, jsii.String("TileOAI"), &awscloudfront.OriginAccessIdentityProps{
		Comment: jsii.String("OAI for Globify NASA tile CDN"),
	})

	bucket.GrantRead(oai, jsii.String("*"))

	// ── CloudFront Distribution ─────────────────────────────────
	distributionProps := &awscloudfront.DistributionProps{
		Comment: jsii.String("Globify NASA tile imagery CDN"),
		DefaultBehavior: &awscloudfront.BehaviorOptions{
			Origin: awscloudfrontorigins.NewS3Origin(bucket, &awscloudfrontorigins.S3OriginProps{
				OriginAccessIdentity: oai,
			}),
			ViewerProtocolPolicy: awscloudfront.ViewerProtocolPolicy_REDIRECT_TO_HTTPS,
			CachePolicy:          awscloudfront.CachePolicy_CACHING_OPTIMIZED(),
			Compress:             jsii.Bool(true),
		},
		// 403→404 mapping — S3 returns 403 for missing keys with OAI
		ErrorResponses: &[]*awscloudfront.ErrorResponse{
			{
				HttpStatus:         jsii.Number(403),
				ResponseHttpStatus: jsii.Number(404),
				ResponsePagePath:   jsii.String("/404.html"),
				Ttl:                awscdk.Duration_Seconds(jsii.Number(60)),
			},
		},
		PriceClass: awscloudfront.PriceClass_PRICE_CLASS_100,
	}

	if props.CloudFrontWebAclArn != nil && *props.CloudFrontWebAclArn != "" {
		distributionProps.WebAclId = props.CloudFrontWebAclArn
	}

	distribution := awscloudfront.NewDistribution(stack, jsii.String("TileDistribution"), distributionProps)

	// ── Bucket policy granting CloudFront OAI read access ───────
	bucket.AddToResourcePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   &[]*string{jsii.String("s3:GetObject")},
		Resources: &[]*string{bucket.ArnForObjects(jsii.String("*"))},
		Principals: &[]awsiam.IPrincipal{
			awsiam.NewCanonicalUserPrincipal(oai.CloudFrontOriginAccessIdentityS3CanonicalUserId()),
		},
	}))

	// ── Stack outputs ────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("TileBucketName"), &awscdk.CfnOutputProps{
		Value:       bucket.BucketName(),
		Description: jsii.String("S3 bucket for NASA tile imagery"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("TileCDNDomain"), &awscdk.CfnOutputProps{
		Value:       jsii.String("https://" + *distribution.DistributionDomainName()),
		Description: jsii.String("CloudFront URL for tile CDN"),
		ExportName:  jsii.String("Globify-TileCDNDomain"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("TileDistributionId"), &awscdk.CfnOutputProps{
		Value:       distribution.DistributionId(),
		Description: jsii.String("CloudFront distribution ID for tile CDN"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("TileDeployCommand"), &awscdk.CfnOutputProps{
		Value: jsii.String(
			"bash tools/scripts/sync-tiles-s3.sh globify-nasa-tiles <DIST_ID>",
		),
		Description: jsii.String("Command to upload tiles and invalidate CDN cache"),
	})

	return &TileHostingStack{
		Stack:        stack,
		Bucket:       bucket,
		Distribution: distribution,
	}
}
