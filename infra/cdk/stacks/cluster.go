package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsecr"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// ClusterStackProps includes cross-stack references.
type ClusterStackProps struct {
	awscdk.StackProps
	Vpc              awsec2.Vpc
	RdsSecurityGroup awsec2.SecurityGroup
	EcrRepository    awsecr.Repository
}

// ClusterStack creates an EKS cluster with managed node group, IRSA, and
// installs the AWS Load Balancer Controller via Helm.
type ClusterStack struct {
	awscdk.Stack
	Cluster awseks.Cluster
}

func NewClusterStack(scope constructs.Construct, id string, props *ClusterStackProps) *ClusterStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	// ── Admin Role for kubectl access ────────────────────────────
	adminRole := awsiam.NewRole(stack, jsii.String("ClusterAdminRole"), &awsiam.RoleProps{
		AssumedBy:   awsiam.NewAccountRootPrincipal(),
		Description: jsii.String("Role for EKS cluster administration"),
	})

	// ── EKS Cluster ──────────────────────────────────────────────
	cluster := awseks.NewCluster(stack, jsii.String("SupplyChainCluster"), &awseks.ClusterProps{
		ClusterName:   jsii.String("supply-chain"),
		Version:       awseks.KubernetesVersion_V1_29(),
		Vpc:           props.Vpc,
		VpcSubnets: &[]*awsec2.SubnetSelection{
			{SubnetType: awsec2.SubnetType_PRIVATE_WITH_EGRESS},
		},
		DefaultCapacity: jsii.Number(0), // we add our own managed node group below
		MastersRole:     adminRole,
		OutputClusterName: jsii.Bool(true),
		OutputMastersRoleArn: jsii.Bool(true),
	})

	// ── Managed Node Group: t3.medium, 2–4 ──────────────────────
	cluster.AddNodegroupCapacity(jsii.String("WorkerNodes"), &awseks.NodegroupOptions{
		InstanceTypes: &[]awsec2.InstanceType{
			awsec2.NewInstanceType(jsii.String("t3.medium")),
		},
		MinSize:    jsii.Number(2),
		MaxSize:    jsii.Number(4),
		DesiredSize: jsii.Number(2),
		Subnets: &awsec2.SubnetSelection{
			SubnetType: awsec2.SubnetType_PRIVATE_WITH_EGRESS,
		},
		DiskSize: jsii.Number(20),
	})

	// ── Allow EKS worker nodes to connect to RDS on port 5432 ───
	props.RdsSecurityGroup.AddIngressRule(
		cluster.ClusterSecurityGroup(),
		awsec2.Port_Tcp(jsii.Number(5432)),
		jsii.String("Allow EKS pods to connect to RDS"),
		jsii.Bool(false),
	)

	// ── Grant EKS node role pull access to ECR ──────────────────
	props.EcrRepository.GrantPull(cluster.Role())

	// ── AWS Load Balancer Controller via Helm ────────────────────
	lbControllerSA := cluster.AddServiceAccount(jsii.String("AwsLbControllerSA"), &awseks.ServiceAccountOptions{
		Name:      jsii.String("aws-load-balancer-controller"),
		Namespace: jsii.String("kube-system"),
	})

	// Attach the LB Controller IAM policy
	lbControllerSA.Role().AddManagedPolicy(
		awsiam.ManagedPolicy_FromAwsManagedPolicyName(jsii.String("ElasticLoadBalancingFullAccess")),
	)

	cluster.AddHelmChart(jsii.String("AwsLbController"), &awseks.HelmChartOptions{
		Chart:      jsii.String("aws-load-balancer-controller"),
		Repository: jsii.String("https://aws.github.io/eks-charts"),
		Namespace:  jsii.String("kube-system"),
		Release:    jsii.String("aws-load-balancer-controller"),
		Values: &map[string]interface{}{
			"clusterName": "supply-chain",
			"serviceAccount": map[string]interface{}{
				"create": false,
				"name":   "aws-load-balancer-controller",
			},
			"region":  "us-east-1",
			"vpcId":   props.Vpc.VpcId(),
		},
	})

	// ── Stack outputs ────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("ClusterEndpoint"), &awscdk.CfnOutputProps{
		Value:       cluster.ClusterEndpoint(),
		Description: jsii.String("EKS cluster API endpoint"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("ClusterSecurityGroupId"), &awscdk.CfnOutputProps{
		Value:       cluster.ClusterSecurityGroup().SecurityGroupId(),
		Description: jsii.String("EKS cluster security group ID"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("KubeconfigCommand"), &awscdk.CfnOutputProps{
		Value:       jsii.String("aws eks update-kubeconfig --name supply-chain --region us-east-1"),
		Description: jsii.String("Command to configure kubectl"),
	})

	return &ClusterStack{
		Stack:   stack,
		Cluster: cluster,
	}
}
