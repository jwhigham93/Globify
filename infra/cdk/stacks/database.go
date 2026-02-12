package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsrds"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// DatabaseStackProps includes the VPC from the NetworkStack.
type DatabaseStackProps struct {
	awscdk.StackProps
	Vpc awsec2.Vpc
}

// DatabaseStack creates an RDS PostgreSQL 16 instance in a private subnet
// with an auto-generated password stored in Secrets Manager.
type DatabaseStack struct {
	awscdk.Stack
	RdsSecurityGroup awsec2.SecurityGroup
	Instance         awsrds.DatabaseInstance
}

func NewDatabaseStack(scope constructs.Construct, id string, props *DatabaseStackProps) *DatabaseStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	// ── Security Group — inbound 5432 will be opened by ClusterStack ─
	rdssg := awsec2.NewSecurityGroup(stack, jsii.String("RdsSecurityGroup"), &awsec2.SecurityGroupProps{
		Vpc:              props.Vpc,
		Description:      jsii.String("Allow PostgreSQL access from EKS only"),
		AllowAllOutbound: jsii.Bool(true),
	})

	// ── Instance class from CDK context (default: db.t4g.micro) ──
	instanceClassCtx := stack.Node().TryGetContext(jsii.String("instanceClass"))
	instanceClassStr := "db.t4g.micro"
	if v, ok := instanceClassCtx.(string); ok && v != "" {
		instanceClassStr = v
	}

	instanceType := awsec2.InstanceType_Of(
		awsec2.InstanceClass_BURSTABLE4_GRAVITON,
		awsec2.InstanceSize_MICRO,
	)
	// Override if context provides a non-default class
	if instanceClassStr != "db.t4g.micro" {
		instanceType = awsec2.NewInstanceType(jsii.String(instanceClassStr))
	}

	// ── RDS PostgreSQL 16 ────────────────────────────────────────
	dbInstance := awsrds.NewDatabaseInstance(stack, jsii.String("SupplyChainDb"), &awsrds.DatabaseInstanceProps{
		Engine: awsrds.DatabaseInstanceEngine_Postgres(&awsrds.PostgresInstanceEngineProps{
			Version: awsrds.PostgresEngineVersion_VER_16(),
		}),
		InstanceType: instanceType,
		Vpc:          props.Vpc,
		VpcSubnets: &awsec2.SubnetSelection{
			SubnetType: awsec2.SubnetType_PRIVATE_WITH_EGRESS,
		},
		SecurityGroups: &[]awsec2.ISecurityGroup{rdssg},
		DatabaseName:           jsii.String("supplychain"),
		MultiAz:               jsii.Bool(false), // dev — override for prod
		PubliclyAccessible:     jsii.Bool(false),
		AllocatedStorage:      jsii.Number(20),
		StorageEncrypted:      jsii.Bool(true),
		BackupRetention:       awscdk.Duration_Days(jsii.Number(7)),
		RemovalPolicy:         awscdk.RemovalPolicy_DESTROY, // dev — change for prod
		DeletionProtection:    jsii.Bool(false),
		Credentials:           awsrds.Credentials_FromGeneratedSecret(jsii.String("supplychain"), nil),
	})

	// ── Stack outputs ────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("RdsEndpoint"), &awscdk.CfnOutputProps{
		Value:       dbInstance.DbInstanceEndpointAddress(),
		Description: jsii.String("RDS instance endpoint"),
		ExportName:  jsii.String("SupplyChain-RdsEndpoint"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("RdsPort"), &awscdk.CfnOutputProps{
		Value:       dbInstance.DbInstanceEndpointPort(),
		Description: jsii.String("RDS instance port"),
		ExportName:  jsii.String("SupplyChain-RdsPort"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("RdsDatabaseName"), &awscdk.CfnOutputProps{
		Value:       jsii.String("supplychain"),
		Description: jsii.String("Database name"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("RdsSecretArn"), &awscdk.CfnOutputProps{
		Value:       dbInstance.Secret().SecretArn(),
		Description: jsii.String("Secrets Manager ARN for DB credentials"),
		ExportName:  jsii.String("SupplyChain-RdsSecretArn"),
	})

	return &DatabaseStack{
		Stack:            stack,
		RdsSecurityGroup: rdssg,
		Instance:         dbInstance,
	}
}
