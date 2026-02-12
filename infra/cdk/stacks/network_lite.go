package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// NetworkLiteStack creates the same VPC topology as NetworkStack but uses
// a t4g.nano NAT instance (~$3/month) instead of a NAT Gateway (~$33/month).
type NetworkLiteStack struct {
	awscdk.Stack
	Vpc awsec2.Vpc
}

func NewNetworkLiteStack(scope constructs.Construct, id string, props *awscdk.StackProps) *NetworkLiteStack {
	stack := awscdk.NewStack(scope, &id, props)

	// NAT instance (t4g.nano) — dramatically cheaper than NAT Gateway
	natProvider := awsec2.NatProvider_InstanceV2(&awsec2.NatInstanceProps{
		InstanceType: awsec2.NewInstanceType(jsii.String("t4g.nano")),
		MachineImage: awsec2.MachineImage_LatestAmazonLinux2023(&awsec2.AmazonLinux2023ImageSsmParameterProps{
			CpuType: awsec2.AmazonLinuxCpuType_ARM_64,
		}),
	})

	vpc := awsec2.NewVpc(stack, jsii.String("SupplyChainVpcLite"), &awsec2.VpcProps{
		MaxAzs:      jsii.Number(2),
		NatGatewayProvider: natProvider,
		NatGateways: jsii.Number(1), // single NAT instance
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
		Description: jsii.String("VPC ID (lite — NAT instance)"),
		ExportName:  jsii.String("SupplyChain-VpcId"),
	})

	return &NetworkLiteStack{
		Stack: stack,
		Vpc:   vpc,
	}
}
