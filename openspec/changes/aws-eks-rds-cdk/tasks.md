## 1. CDK Project Scaffolding

- [ ] 1.1 Create `infra/cdk/` directory, initialize Go module with `go mod init`, and install CDK Go dependencies (`aws-cdk-go/awscdk/v2` and construct libraries)
- [ ] 1.2 Create `infra/cdk/main.go` CDK app entrypoint that instantiates all stacks in dependency order with cross-stack references

## 2. Network Stack

- [ ] 2.1 Create `infra/cdk/stacks/network.go` — VPC with 2 AZs, public + private subnets, NAT Gateway (1 for dev cost savings)
- [ ] 2.2 Export VPC and subnet references for other stacks to consume

## 3. Database Stack

- [ ] 3.1 Create `infra/cdk/stacks/database.go` — RDS PostgreSQL 16, `db.t4g.micro` (parameterized via CDK context `instanceClass`), private subnet placement, auto-generated password in Secrets Manager
- [ ] 3.2 Configure security group allowing inbound 5432 only from the EKS cluster security group
- [ ] 3.3 Output RDS endpoint, port, database name, and Secrets Manager ARN as stack outputs

## 4. Auth Stack

- [ ] 4.1 Create `infra/cdk/stacks/auth.go` — Cognito User Pool (email sign-in, email verification required), App Client (no secret, USER_PASSWORD_AUTH + USER_SRP_AUTH flows)
- [ ] 4.2 Configure token expiration: ID token 1 hour, refresh token 30 days
- [ ] 4.3 Output User Pool ID, App Client ID, and region as stack outputs

## 5. Container Stack

- [ ] 5.1 Create `infra/cdk/stacks/container.go` — ECR repository with image tag immutability, lifecycle policy to retain last 10 images

## 6. Cluster Stack

- [ ] 6.1 Create `infra/cdk/stacks/cluster.go` — EKS cluster in the VPC's private subnets, OIDC provider for IRSA
- [ ] 6.2 Add managed node group: t3.medium, min 2 / max 4, private subnets
- [ ] 6.3 Install AWS Load Balancer Controller via Helm chart with proper IAM policy

## 7. Kubernetes Manifests

- [ ] 7.1 Create `services/supply-chain-api/k8s/namespace.yaml` — dedicated namespace for the supply chain workload
- [ ] 7.2 Create `services/supply-chain-api/k8s/configmap.yaml` — non-sensitive config: COGNITO_USER_POOL_ID, COGNITO_REGION, COGNITO_CLIENT_ID, ALLOWED_ORIGINS
- [ ] 7.3 Create `services/supply-chain-api/k8s/deployment.yaml` — API container from ECR, resource requests/limits (128Mi/256Mi memory, 100m/250m CPU), liveness probe `/healthz`, readiness probe `/readyz`, env from ConfigMap and Secret
- [ ] 7.4 Create `services/supply-chain-api/k8s/service.yaml` — ClusterIP service on port 80 targeting container port 8080
- [ ] 7.5 Create `services/supply-chain-api/k8s/ingress.yaml` — ALB Ingress with annotations: `alb.ingress.kubernetes.io/scheme: internet-facing`, `alb.ingress.kubernetes.io/target-type: ip`
- [ ] 7.6 Create `services/supply-chain-api/k8s/hpa.yaml` — HPA targeting 70% CPU, min 2 / max 6 replicas
- [ ] 7.7 Create `services/supply-chain-api/k8s/migration-job.yaml` — Kubernetes Job running `golang-migrate` against the RDS endpoint

## 8. Documentation

- [ ] 8.1 Create `infra/cdk/README.md` documenting: prerequisites (AWS CLI, CDK CLI, Go, kubectl, helm), CDK bootstrap command, deployment order, environment variables, stack outputs, cost estimates, and teardown instructions
- [ ] 8.2 Add deployment steps section covering: Docker build + ECR push, kubectl secret creation, migration job execution, and manifest apply order
