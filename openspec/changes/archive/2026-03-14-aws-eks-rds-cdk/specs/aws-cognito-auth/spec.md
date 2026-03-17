## ADDED Requirements

### Requirement: Cognito User Pool for mobile auth

The CDK AuthStack SHALL create a Cognito User Pool with an App Client configured for the Globify mobile app. The User Pool SHALL support email-based sign-up and sign-in.

#### Scenario: User Pool supports email sign-in

- **WHEN** the AuthStack is deployed
- **THEN** the Cognito User Pool SHALL allow email as a sign-in alias
- **AND** email verification SHALL be required

#### Scenario: App Client has correct settings

- **WHEN** the App Client is created
- **THEN** it SHALL NOT generate a client secret (required for mobile/SPA apps)
- **AND** it SHALL support `USER_PASSWORD_AUTH` and `USER_SRP_AUTH` auth flows

#### Scenario: JWT token configuration

- **WHEN** a user authenticates
- **THEN** the ID token SHALL expire after 1 hour
- **AND** the refresh token SHALL expire after 30 days

#### Scenario: User Pool outputs are available

- **WHEN** the AuthStack is deployed
- **THEN** the User Pool ID, App Client ID, and region SHALL be available as CDK stack outputs
