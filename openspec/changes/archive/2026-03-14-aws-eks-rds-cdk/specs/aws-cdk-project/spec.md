## ADDED Requirements

### Requirement: CDK Go project structure

The CDK project SHALL reside at `infra/cdk/` with a Go module, and SHALL define stacks for Network, Database, Auth, Container (ECR), and Cluster (EKS).

#### Scenario: CDK synth produces valid CloudFormation

- **WHEN** `cdk synth` is run in the `infra/cdk/` directory
- **THEN** it SHALL produce valid CloudFormation templates for all stacks without errors

#### Scenario: Stacks have cross-references

- **WHEN** the DatabaseStack needs the VPC
- **THEN** it SHALL receive the VPC from the NetworkStack via CDK cross-stack references
- **AND** the ClusterStack SHALL receive the VPC, RDS security group, and ECR repository from their respective stacks

### Requirement: ECR repository

The CDK ContainerStack SHALL create an ECR repository for the Go API Docker image.

#### Scenario: ECR repo exists

- **WHEN** the ContainerStack is deployed
- **THEN** an ECR repository named `supply-chain-api` SHALL exist
- **AND** it SHALL have image tag immutability enabled

### Requirement: Deployment documentation

A `README.md` SHALL be provided in `infra/cdk/` documenting: prerequisites, CDK bootstrap, deployment order, environment variables, cost estimates, and teardown instructions.

#### Scenario: README covers deployment workflow

- **WHEN** a developer reads the README
- **THEN** they SHALL be able to deploy the full stack from scratch following the documented steps
