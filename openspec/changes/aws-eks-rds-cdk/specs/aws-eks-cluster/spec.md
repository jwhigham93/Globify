## ADDED Requirements

### Requirement: EKS cluster with managed node group

The CDK ClusterStack SHALL create an EKS cluster with a managed node group. The node group SHALL use t3.medium instances with a minimum of 2 and maximum of 4 nodes.

#### Scenario: Cluster is operational

- **WHEN** the ClusterStack is deployed
- **THEN** `kubectl get nodes` SHALL return at least 2 Ready nodes

#### Scenario: IRSA is configured

- **WHEN** the EKS cluster is created
- **THEN** an OIDC provider SHALL be configured to support IAM Roles for Service Accounts

### Requirement: Kubernetes manifests for the Go API

Kubernetes manifests SHALL be provided in `services/supply-chain-api/k8s/` for deploying the Go API to EKS.

#### Scenario: Deployment manifest

- **WHEN** `kubectl apply -f k8s/` is run
- **THEN** a Deployment SHALL create pods running the Go API container from ECR
- **AND** pods SHALL have resource requests/limits, liveness probe on `/healthz`, and readiness probe on `/readyz`

#### Scenario: Service and Ingress

- **WHEN** the Kubernetes manifests are applied
- **THEN** a ClusterIP Service SHALL route traffic to the API pods
- **AND** an Ingress with ALB annotations SHALL create an internet-facing ALB

#### Scenario: Horizontal Pod Autoscaler

- **WHEN** CPU utilization exceeds 70% across API pods
- **THEN** the HPA SHALL scale the deployment up to a maximum of 6 replicas

#### Scenario: Environment configuration

- **WHEN** the API pods start
- **THEN** non-sensitive config (Cognito pool ID, region) SHALL be loaded from a ConfigMap
- **AND** sensitive config (DATABASE_URL) SHALL be loaded from a Kubernetes Secret

### Requirement: AWS Load Balancer Controller

The ClusterStack SHALL install the AWS Load Balancer Controller via Helm to enable ALB Ingress resources.

#### Scenario: ALB is created from Ingress

- **WHEN** an Ingress resource with `alb.ingress.kubernetes.io` annotations is applied
- **THEN** the LB Controller SHALL provision an Application Load Balancer routing to the Service

### Requirement: Database migration Job

A Kubernetes Job manifest SHALL be provided for running `golang-migrate` against the RDS instance.

#### Scenario: Migration job runs successfully

- **WHEN** `kubectl apply -f k8s/migration-job.yaml` is run
- **THEN** a Job SHALL execute `migrate -path /migrations -database $DATABASE_URL up` and complete successfully
