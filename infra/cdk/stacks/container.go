package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsecr"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// ContainerStack creates an ECR repository for the Go API Docker image.
type ContainerStack struct {
	awscdk.Stack
	Repository awsecr.Repository
}

func NewContainerStack(scope constructs.Construct, id string, props *awscdk.StackProps) *ContainerStack {
	stack := awscdk.NewStack(scope, &id, props)

	repo := awsecr.NewRepository(stack, jsii.String("SupplyChainApiRepo"), &awsecr.RepositoryProps{
		RepositoryName:     jsii.String("supply-chain-api"),
		// MUTABLE for dev convenience (re-push :latest without new tags).
		// Switch to TagMutability_IMMUTABLE in production to enforce image provenance.
		ImageTagMutability: awsecr.TagMutability_MUTABLE,
		RemovalPolicy:      awscdk.RemovalPolicy_DESTROY, // dev — change for prod
		EmptyOnDelete:      jsii.Bool(true),
		LifecycleRules: &[]*awsecr.LifecycleRule{
			{
				Description:   jsii.String("Retain last 10 images"),
				MaxImageCount: jsii.Number(10),
				RulePriority:  jsii.Number(1),
			},
		},
	})

	// ── Stack outputs ────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("EcrRepositoryUri"), &awscdk.CfnOutputProps{
		Value:       repo.RepositoryUri(),
		Description: jsii.String("ECR repository URI"),
		ExportName:  jsii.String("SupplyChain-EcrRepoUri"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("EcrRepositoryArn"), &awscdk.CfnOutputProps{
		Value:       repo.RepositoryArn(),
		Description: jsii.String("ECR repository ARN"),
	})

	return &ContainerStack{
		Stack:      stack,
		Repository: repo,
	}
}
