package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awswafv2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// SecurityStack creates WAF Web ACLs for both the ALB (API) and
// CloudFront (web app) with rate limiting and AWS managed rule sets.
type SecurityStack struct {
	awscdk.Stack
	ApiWebAclArn       *string
	CloudFrontWebAclArn *string
}

// awsManagedRules returns a shared set of AWS managed WAF rules.
// Each call produces fresh rule structs (required by CDK — no sharing pointers).
func awsManagedRules(startPriority float64) *[]*awswafv2.CfnWebACL_RuleProperty {
	return &[]*awswafv2.CfnWebACL_RuleProperty{
		{
			// ── Rate limiting: 1000 requests per 5 minutes per IP ────
			Name:     jsii.String("RateLimit"),
			Priority: jsii.Number(0),
			Action:   &awswafv2.CfnWebACL_RuleActionProperty{Block: &map[string]interface{}{}},
			Statement: &awswafv2.CfnWebACL_StatementProperty{
				RateBasedStatement: &awswafv2.CfnWebACL_RateBasedStatementProperty{
					Limit:              jsii.Number(1000),
					AggregateKeyType:   jsii.String("IP"),
					EvaluationWindowSec: jsii.Number(300),
				},
			},
			VisibilityConfig: &awswafv2.CfnWebACL_VisibilityConfigProperty{
				SampledRequestsEnabled:   jsii.Bool(true),
				CloudWatchMetricsEnabled: jsii.Bool(true),
				MetricName:              jsii.String("RateLimit"),
			},
		},
		{
			// ── AWS Managed: Common Rule Set (XSS, SQLi, bad inputs) ─
			Name:     jsii.String("AWSManagedCommonRuleSet"),
			Priority: jsii.Number(startPriority + 1),
			OverrideAction: &awswafv2.CfnWebACL_OverrideActionProperty{
				None: &map[string]interface{}{},
			},
			Statement: &awswafv2.CfnWebACL_StatementProperty{
				ManagedRuleGroupStatement: &awswafv2.CfnWebACL_ManagedRuleGroupStatementProperty{
					VendorName: jsii.String("AWS"),
					Name:       jsii.String("AWSManagedRulesCommonRuleSet"),
				},
			},
			VisibilityConfig: &awswafv2.CfnWebACL_VisibilityConfigProperty{
				SampledRequestsEnabled:   jsii.Bool(true),
				CloudWatchMetricsEnabled: jsii.Bool(true),
				MetricName:              jsii.String("AWSCommonRules"),
			},
		},
		{
			// ── AWS Managed: Known Bad Inputs ────────────────────────
			Name:     jsii.String("AWSManagedKnownBadInputs"),
			Priority: jsii.Number(startPriority + 2),
			OverrideAction: &awswafv2.CfnWebACL_OverrideActionProperty{
				None: &map[string]interface{}{},
			},
			Statement: &awswafv2.CfnWebACL_StatementProperty{
				ManagedRuleGroupStatement: &awswafv2.CfnWebACL_ManagedRuleGroupStatementProperty{
					VendorName: jsii.String("AWS"),
					Name:       jsii.String("AWSManagedRulesKnownBadInputsRuleSet"),
				},
			},
			VisibilityConfig: &awswafv2.CfnWebACL_VisibilityConfigProperty{
				SampledRequestsEnabled:   jsii.Bool(true),
				CloudWatchMetricsEnabled: jsii.Bool(true),
				MetricName:              jsii.String("AWSKnownBadInputs"),
			},
		},
		{
			// ── AWS Managed: IP Reputation List ──────────────────────
			Name:     jsii.String("AWSManagedIPReputation"),
			Priority: jsii.Number(startPriority + 3),
			OverrideAction: &awswafv2.CfnWebACL_OverrideActionProperty{
				None: &map[string]interface{}{},
			},
			Statement: &awswafv2.CfnWebACL_StatementProperty{
				ManagedRuleGroupStatement: &awswafv2.CfnWebACL_ManagedRuleGroupStatementProperty{
					VendorName: jsii.String("AWS"),
					Name:       jsii.String("AWSManagedRulesAmazonIpReputationList"),
				},
			},
			VisibilityConfig: &awswafv2.CfnWebACL_VisibilityConfigProperty{
				SampledRequestsEnabled:   jsii.Bool(true),
				CloudWatchMetricsEnabled: jsii.Bool(true),
				MetricName:              jsii.String("AWSIPReputation"),
			},
		},
		{
			// ── AWS Managed: Bot Control (targeted) ──────────────────
			Name:     jsii.String("AWSManagedBotControl"),
			Priority: jsii.Number(startPriority + 4),
			OverrideAction: &awswafv2.CfnWebACL_OverrideActionProperty{
				None: &map[string]interface{}{},
			},
			Statement: &awswafv2.CfnWebACL_StatementProperty{
				ManagedRuleGroupStatement: &awswafv2.CfnWebACL_ManagedRuleGroupStatementProperty{
					VendorName: jsii.String("AWS"),
					Name:       jsii.String("AWSManagedRulesBotControlRuleSet"),
				},
			},
			VisibilityConfig: &awswafv2.CfnWebACL_VisibilityConfigProperty{
				SampledRequestsEnabled:   jsii.Bool(true),
				CloudWatchMetricsEnabled: jsii.Bool(true),
				MetricName:              jsii.String("AWSBotControl"),
			},
		},
	}
}

func NewSecurityStack(scope constructs.Construct, id string, props *awscdk.StackProps) *SecurityStack {
	stack := awscdk.NewStack(scope, &id, props)

	// ── WAF Web ACL for ALB (REGIONAL scope) ─────────────────────
	apiAcl := awswafv2.NewCfnWebACL(stack, jsii.String("ApiWebAcl"), &awswafv2.CfnWebACLProps{
		Name:        jsii.String("supply-chain-api-waf"),
		Description: jsii.String("WAF for Supply Chain API ALB — rate limiting + managed rules"),
		Scope:       jsii.String("REGIONAL"),
		DefaultAction: &awswafv2.CfnWebACL_DefaultActionProperty{
			Allow: &map[string]interface{}{},
		},
		Rules: awsManagedRules(0),
		VisibilityConfig: &awswafv2.CfnWebACL_VisibilityConfigProperty{
			SampledRequestsEnabled:   jsii.Bool(true),
			CloudWatchMetricsEnabled: jsii.Bool(true),
			MetricName:              jsii.String("SupplyChainApiWAF"),
		},
	})

	// ── WAF Web ACL for CloudFront (CLOUDFRONT scope) ────────────
	// Note: CloudFront WAFs must be in us-east-1, which is our region.
	cfAcl := awswafv2.NewCfnWebACL(stack, jsii.String("CloudFrontWebAcl"), &awswafv2.CfnWebACLProps{
		Name:        jsii.String("globify-web-waf"),
		Description: jsii.String("WAF for Globify CloudFront — rate limiting + managed rules"),
		Scope:       jsii.String("CLOUDFRONT"),
		DefaultAction: &awswafv2.CfnWebACL_DefaultActionProperty{
			Allow: &map[string]interface{}{},
		},
		Rules: awsManagedRules(0),
		VisibilityConfig: &awswafv2.CfnWebACL_VisibilityConfigProperty{
			SampledRequestsEnabled:   jsii.Bool(true),
			CloudWatchMetricsEnabled: jsii.Bool(true),
			MetricName:              jsii.String("GlobifyWebWAF"),
		},
	})

	// ── Stack outputs ────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("ApiWebAclArn"), &awscdk.CfnOutputProps{
		Value:       apiAcl.AttrArn(),
		Description: jsii.String("WAF Web ACL ARN for API ALB"),
		ExportName:  jsii.String("SupplyChain-ApiWebAclArn"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("CloudFrontWebAclArn"), &awscdk.CfnOutputProps{
		Value:       cfAcl.AttrArn(),
		Description: jsii.String("WAF Web ACL ARN for CloudFront"),
		ExportName:  jsii.String("SupplyChain-CloudFrontWebAclArn"),
	})

	return &SecurityStack{
		Stack:              stack,
		ApiWebAclArn:       apiAcl.AttrArn(),
		CloudFrontWebAclArn: cfAcl.AttrArn(),
	}
}
