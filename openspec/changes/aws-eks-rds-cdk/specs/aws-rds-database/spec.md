## ADDED Requirements

### Requirement: RDS PostgreSQL in private subnet

The CDK DatabaseStack SHALL create an RDS PostgreSQL 16 instance in a private subnet. The security group SHALL allow inbound connections on port 5432 only from the EKS cluster's security group.

#### Scenario: RDS is not publicly accessible

- **WHEN** the DatabaseStack is deployed
- **THEN** the RDS instance SHALL have `PubliclyAccessible: false`
- **AND** it SHALL reside in private subnets

#### Scenario: Only EKS can connect to RDS

- **WHEN** a connection attempt is made from outside the EKS security group
- **THEN** the connection SHALL be rejected by the security group

#### Scenario: Instance class is parameterized

- **WHEN** the CDK app is deployed with `-c instanceClass=db.r6g.large`
- **THEN** the RDS instance SHALL use that instance class instead of the default `db.t4g.micro`

### Requirement: Database credentials management

The RDS instance password SHALL be generated and stored in AWS Secrets Manager by CDK. The RDS endpoint and credentials SHALL be available as CDK stack outputs for constructing the `DATABASE_URL`.

#### Scenario: Credentials are in Secrets Manager

- **WHEN** the DatabaseStack is deployed
- **THEN** the database master password SHALL be stored in AWS Secrets Manager
- **AND** the secret ARN SHALL be a stack output
