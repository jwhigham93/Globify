package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapprunner"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsecr"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// AppRunnerStackProps includes cross-stack references.
type AppRunnerStackProps struct {
	awscdk.StackProps
	Vpc              awsec2.Vpc
	RdsSecurityGroup awsec2.SecurityGroup
	EcrRepository    awsecr.Repository
}

// AppRunnerStack creates an App Runner service as a lightweight alternative
// to EKS. App Runner provides built-in HTTPS, load balancing, and auto-scaling
// with no cluster management overhead. Cost: ~$5-15/month for low traffic.
type AppRunnerStack struct {
	awscdk.Stack
	Service awsapprunner.CfnService
}

func NewAppRunnerStack(scope constructs.Construct, id string, props *AppRunnerStackProps) *AppRunnerStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	// ── IAM role for App Runner to pull from ECR ─────────────────
	accessRole := awsiam.NewRole(stack, jsii.String("AppRunnerAccessRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(jsii.String("build.apprunner.amazonaws.com"), nil),
		Description: jsii.String("Allows App Runner to pull images from ECR"),
	})
	props.EcrRepository.GrantPull(accessRole)

	// ── IAM role for the running task (instance role) ────────────
	instanceRole := awsiam.NewRole(stack, jsii.String("AppRunnerInstanceRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(jsii.String("tasks.apprunner.amazonaws.com"), nil),
		Description: jsii.String("Runtime role for the App Runner service"),
	})

	// ── VPC Connector — allows App Runner to reach RDS ──────────
	vpcConnectorSG := awsec2.NewSecurityGroup(stack, jsii.String("VpcConnectorSG"), &awsec2.SecurityGroupProps{
		Vpc:              props.Vpc,
		Description:      jsii.String("Security group for App Runner VPC connector"),
		AllowAllOutbound: jsii.Bool(true),
	})

	// Allow VPC connector to reach RDS
	props.RdsSecurityGroup.AddIngressRule(
		vpcConnectorSG,
		awsec2.Port_Tcp(jsii.Number(5432)),
		jsii.String("Allow App Runner to connect to RDS"),
		jsii.Bool(false),
	)

	vpcConnector := awsapprunner.NewCfnVpcConnector(stack, jsii.String("VpcConnector"), &awsapprunner.CfnVpcConnectorProps{
		VpcConnectorName: jsii.String("supply-chain-vpc-connector"),
		Subnets:          privateSubnetIds(props.Vpc),
		SecurityGroups:   &[]interface{}{vpcConnectorSG.SecurityGroupId()},
	})

	// ── App Runner Service ───────────────────────────────────────
	service := awsapprunner.NewCfnService(stack, jsii.String("SupplyChainApiService"), &awsapprunner.CfnServiceProps{
		ServiceName: jsii.String("supply-chain-api"),
		SourceConfiguration: &awsapprunner.CfnService_SourceConfigurationProperty{
			AuthenticationConfiguration: &awsapprunner.CfnService_AuthenticationConfigurationProperty{
				AccessRoleArn: accessRole.RoleArn(),
			},
			ImageRepository: &awsapprunner.CfnService_ImageRepositoryProperty{
				ImageIdentifier:     jsii.String(*props.EcrRepository.RepositoryUri() + ":latest"),
				ImageRepositoryType: jsii.String("ECR"),
				ImageConfiguration: &awsapprunner.CfnService_ImageConfigurationProperty{
					Port: jsii.String("8080"),
					RuntimeEnvironmentVariables: &[]*awsapprunner.CfnService_KeyValuePairProperty{
						{Name: jsii.String("PORT"), Value: jsii.String("8080")},
						{Name: jsii.String("LOG_FORMAT"), Value: jsii.String("json")},
						// DATABASE_URL, COGNITO_* set via console or CLI after deploy:
						// aws apprunner update-service --service-arn <ARN> ...
						{Name: jsii.String("COGNITO_USER_POOL_ID"), Value: jsii.String("")},
						{Name: jsii.String("COGNITO_CLIENT_ID"), Value: jsii.String("")},
						{Name: jsii.String("COGNITO_REGION"), Value: jsii.String("us-east-1")},
						{Name: jsii.String("ALLOWED_ORIGINS"), Value: jsii.String("*")},
					},
				},
			},
			AutoDeploymentsEnabled: jsii.Bool(true), // auto-deploy on new ECR image push
		},
		InstanceConfiguration: &awsapprunner.CfnService_InstanceConfigurationProperty{
			Cpu:             jsii.String("0.25 vCPU"), // minimum — ~$5/month if always running
			Memory:          jsii.String("0.5 GB"),
			InstanceRoleArn: instanceRole.RoleArn(),
		},
		HealthCheckConfiguration: &awsapprunner.CfnService_HealthCheckConfigurationProperty{
			Protocol:           jsii.String("HTTP"),
			Path:               jsii.String("/healthz"),
			Interval:           jsii.Number(10),
			Timeout:            jsii.Number(5),
			HealthyThreshold:   jsii.Number(2),
			UnhealthyThreshold: jsii.Number(3),
		},
		NetworkConfiguration: &awsapprunner.CfnService_NetworkConfigurationProperty{
			EgressConfiguration: &awsapprunner.CfnService_EgressConfigurationProperty{
				EgressType:       jsii.String("VPC"),
				VpcConnectorArn: vpcConnector.AttrVpcConnectorArn(),
			},
			IngressConfiguration: &awsapprunner.CfnService_IngressConfigurationProperty{
				IsPubliclyAccessible: jsii.Bool(true),
			},
		},
	})

	// ── Stack outputs ────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("AppRunnerServiceUrl"), &awscdk.CfnOutputProps{
		Value:       service.AttrServiceUrl(),
		Description: jsii.String("App Runner service URL (HTTPS included)"),
		ExportName:  jsii.String("SupplyChain-AppRunnerUrl"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("AppRunnerServiceArn"), &awscdk.CfnOutputProps{
		Value:       service.AttrServiceArn(),
		Description: jsii.String("App Runner service ARN"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("SetDatabaseUrlCommand"), &awscdk.CfnOutputProps{
		Value: jsii.String(
			"aws apprunner update-service --service-arn <SERVICE_ARN> " +
				"--source-configuration '{\"ImageRepository\":{\"ImageConfiguration\":" +
				"{\"RuntimeEnvironmentVariables\":{\"DATABASE_URL\":\"postgres://supplychain:PASSWORD@RDS_ENDPOINT:5432/supplychain?sslmode=require\"}}}}'",
		),
		Description: jsii.String("Command template to set DATABASE_URL (fill in real values)"),
	})

	return &AppRunnerStack{
		Stack:   stack,
		Service: service,
	}
}

// privateSubnetIds extracts subnet IDs from the VPC's private subnets.
func privateSubnetIds(vpc awsec2.Vpc) *[]*string {
	selection := vpc.SelectSubnets(&awsec2.SubnetSelection{
		SubnetType: awsec2.SubnetType_PRIVATE_WITH_EGRESS,
	})
	return selection.SubnetIds
}
