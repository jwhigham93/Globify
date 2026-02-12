package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// NetworkStack creates a VPC with public + private subnets across 2 AZs
// and a single NAT Gateway (cost-optimized for dev).
type NetworkStack struct {
	awscdk.Stack
	Vpc awsec2.Vpc
}

func NewNetworkStack(scope constructs.Construct, id string, props *awscdk.StackProps) *NetworkStack {
	stack := awscdk.NewStack(scope, &id, props)

	vpc := awsec2.NewVpc(stack, jsii.String("SupplyChainVpc"), &awsec2.VpcProps{
		MaxAzs: jsii.Number(2),
		NatGateways: jsii.Number(1), // single NAT for dev cost savings
		SubnetConfiguration: &[]*awsec2.SubnetConfiguration{
			{
				Name:       jsii.String("Public"),
				SubnetType: awsec2.SubnetType_PUBLIC,
				CidrMask:   jsii.Number(24),
			},
			{
				Name:       jsii.String("Private"),
				SubnetType: awsec2.SubnetType_PRIVATE_WITH_EGRESS,
				CidrMask:   jsii.Number(24),
			},
		},
	})

	// ── Exports ──────────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("VpcId"), &awscdk.CfnOutputProps{
		Value:       vpc.VpcId(),
		Description: jsii.String("VPC ID"),
		ExportName:  jsii.String("SupplyChain-VpcId"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("VpcCidr"), &awscdk.CfnOutputProps{
		Value:       vpc.VpcCidrBlock(),
		Description: jsii.String("VPC CIDR block"),
	})

	return &NetworkStack{
		Stack: stack,
		Vpc:   vpc,
	}
}
