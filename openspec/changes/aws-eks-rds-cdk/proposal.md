## Why

The Go supply chain API and PostgreSQL database need a production hosting environment. An enterprise-grade AWS setup using EKS (Kubernetes), RDS PostgreSQL, and Cognito provides the reliability, scalability, and security expected of a mainstream production deployment. All infrastructure is defined as code using AWS CDK in Go for repeatable provisioning and teardown.

## What Changes

- Create a CDK (Go) project at `infra/cdk/` defining all AWS resources as code
- Provision VPC with public/private subnets across 2 AZs
- Deploy RDS PostgreSQL 16 in a private subnet with security groups restricting access to EKS only
- Create an EKS cluster with managed node groups for running the Go API
- Set up Cognito User Pool for JWT-based authentication
- Configure ECR for Docker image storage
- Define Kubernetes manifests (Deployment, Service, Ingress, HPA) for the Go API
- Set up AWS Load Balancer Controller for ALB ingress

## Capabilities

### New Capabilities
- `aws-network-infrastructure`: VPC, subnets, NAT gateway, and security group configuration
- `aws-eks-cluster`: EKS cluster, managed node groups, IRSA (IAM Roles for Service Accounts), and Kubernetes manifests for the Go API workload
- `aws-rds-database`: RDS PostgreSQL instance in private subnet with migration execution strategy
- `aws-cognito-auth`: Cognito User Pool and App Client configuration for mobile app authentication
- `aws-cdk-project`: CDK Go project structure, stack organization, and deployment workflow

### Modified Capabilities

## Impact

- **New directories**: `infra/cdk/` (CDK Go project), `services/supply-chain-api/k8s/` (Kubernetes manifests)
- **Dependencies**: AWS CDK CLI, Go 1.23+, AWS account with appropriate permissions, `kubectl`, `helm`
- **AWS resources created**: VPC, subnets, NAT Gateway, RDS instance, EKS cluster, EC2 node group, ECR repo, Cognito pool, ALB
- **Cost implications**: EKS cluster ($0.10/hr) + EC2 nodes (t3.medium ~$0.04/hr × 2) + RDS (db.t4g.micro ~$0.016/hr) + NAT Gateway (~$0.045/hr) ≈ ~$180/month for dev environment
- **Downstream**: The `globify-api-integration` change will need the API URL and Cognito credentials from this deployment
