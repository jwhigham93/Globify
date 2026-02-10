## ADDED Requirements

### Requirement: VPC with public and private subnets

The CDK NetworkStack SHALL create a VPC with public and private subnets across 2 Availability Zones. A NAT Gateway SHALL be provisioned to allow private subnet resources to reach the internet.

#### Scenario: VPC spans 2 AZs

- **WHEN** the NetworkStack is deployed
- **THEN** the VPC SHALL have subnets in at least 2 Availability Zones
- **AND** each AZ SHALL have one public and one private subnet

#### Scenario: Private subnets route through NAT

- **WHEN** a resource in a private subnet makes an outbound internet request
- **THEN** the traffic SHALL route through the NAT Gateway in the public subnet
