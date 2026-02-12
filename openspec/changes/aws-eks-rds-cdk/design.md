## Context

The Go supply chain API (from `go-supply-chain-api` change) needs a production hosting environment. The API runs as a Docker container, reads from PostgreSQL, and validates Cognito JWTs. This change provisions all AWS infrastructure via CDK (Go) and provides Kubernetes manifests for deploying the API to EKS.

The user specifically chose Kubernetes (EKS) over Lambda/ECS to learn enterprise-grade AWS patterns. This adds operational complexity (cluster management, RBAC, ingress controllers) but provides a realistic production topology.

## Goals / Non-Goals

**Goals:**
- Provision all AWS resources needed to run the Go API in production via CDK (Go)
- Deploy the API on EKS with proper health checks, autoscaling, and secrets management
- Secure the database in a private subnet accessible only from EKS pods
- Set up Cognito for mobile app user registration and JWT authentication
- Document the deployment workflow (build → push → deploy)

**Non-Goals:**
- Fully automated CI/CD pipeline (GitHub Actions / CodePipeline) — document the steps manually for now
- Multi-region or disaster recovery setup
- Domain name / Route53 / TLS certificate — use the ALB-generated URL initially
- Monitoring/observability stack (Prometheus, Grafana) — can be added later
- Cost optimization (reserved instances, spot nodes) — use on-demand for dev

## Decisions

### 1. CDK in Go over Terraform / CloudFormation

**Choice:** AWS CDK v2 with Go bindings.

**Rationale:** CDK allows writing infrastructure in the same language as the service (Go), provides higher-level constructs than raw CloudFormation, and synthesizes to CloudFormation under the hood for reliable deployment. The user explicitly chose CDK.

**Alternative considered:** Terraform — cloud-agnostic and widely used, but adds a new language (HCL) and requires state management. CloudFormation YAML — verbose and error-prone for complex stacks.

### 2. Stack decomposition: 5 stacks

**Choice:** Decompose infrastructure into 5 CDK stacks:
1. **NetworkStack** — VPC, subnets, NAT
2. **DatabaseStack** — RDS, security groups
3. **AuthStack** — Cognito User Pool, App Client
4. **ContainerStack** — ECR repository
5. **ClusterStack** — EKS cluster, node group, ALB Controller, and references Kubernetes manifests

**Rationale:** Separate stacks allow independent lifecycle management — you can update the database without touching the cluster, or modify auth without redeploying networking. Stacks share resources via CDK cross-stack references.

### 3. EKS managed node group over Fargate

**Choice:** EKS with managed EC2 node group (t3.medium × 2 min, 4 max).

**Rationale:** Managed node groups give full EC2 access for debugging (SSH, log access) while still handling AMI updates and drain/replace automatically. Fargate would be simpler but limits customization and has cold-start latency per pod.

**Alternative considered:** EKS Fargate — serverless pods but limited to 4 vCPU/30GB per pod, no DaemonSets, slower scaling. Self-managed nodes — full control but more operational burden.

### 4. RDS db.t4g.micro for dev, parameterized for prod

**Choice:** Use `db.t4g.micro` (2 vCPU, 1GB RAM, burstable) for development with the instance class as a CDK context parameter.

**Rationale:** Minimizes cost (~$12/month) for development. The CDK context parameter `instanceClass` can be overridden for production (`db.r6g.large` etc.) without code changes: `cdk deploy -c instanceClass=db.r6g.large`.

### 5. Secrets via Kubernetes Secrets + Sealed Secrets pattern

**Choice:** Store `DATABASE_URL` as a Kubernetes Secret created from the RDS endpoint output. Use `kubectl create secret` as a manual step documented in the README, not baked into CDK.

**Rationale:** CDK manages AWS resources; Kubernetes manifests reference secrets by name. Keeping secret creation as a `kubectl` command avoids coupling CDK to `kubectl` execution. For production, recommend migrating to External Secrets Operator pulling from AWS Secrets Manager.

### 6. AWS Load Balancer Controller for ingress

**Choice:** Install AWS Load Balancer Controller via Helm chart in the ClusterStack, then use `Ingress` with ALB annotations in the Kubernetes manifests.

**Rationale:** The LB Controller is the standard way to expose EKS services via ALB. It supports target-type `ip` (direct pod routing), health checks, and integrates with ACM for TLS certificates later.

## Risks / Trade-offs

- **[EKS operational complexity]** → Kubernetes adds significant operational surface (RBAC, cluster upgrades, node drains, CNI plugins). Mitigated by using managed node groups and minimal customization.
- **[NAT Gateway cost]** → NAT Gateway is the largest cost component (~$33/month + data transfer). Mitigated by being aware; can switch to NAT Instance for dev if cost is a concern.
- **[Secret rotation]** → DB password is stored as a Kubernetes secret with no rotation mechanism. Mitigated by documenting the rotation process; recommend Secrets Manager integration for production.
- **[Single-AZ risk for dev]** → RDS `MultiAZ: false` for dev to save cost. Production should enable Multi-AZ via CDK context parameter.
- **[Migration execution]** → Database migrations need to run against RDS from a pod or bastion. Mitigated by providing a Kubernetes Job manifest for running `golang-migrate` against the RDS endpoint.
