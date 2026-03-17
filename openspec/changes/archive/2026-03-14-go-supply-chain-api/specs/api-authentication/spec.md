## ADDED Requirements

### Requirement: Cognito JWT authentication

All API endpoints (except health checks) SHALL require a valid AWS Cognito JWT token in the `Authorization: Bearer <token>` header.

#### Scenario: Valid JWT grants access

- **WHEN** a request includes a valid, non-expired Cognito JWT in the Authorization header
- **THEN** the request SHALL be processed normally

#### Scenario: Missing Authorization header returns 401

- **WHEN** a request is made without an Authorization header
- **THEN** the response SHALL return HTTP 401 with `{ "error": "missing authorization header" }`

#### Scenario: Expired JWT returns 401

- **WHEN** a request includes an expired JWT token
- **THEN** the response SHALL return HTTP 401 with `{ "error": "token expired" }`

#### Scenario: Invalid JWT signature returns 401

- **WHEN** a request includes a JWT with an invalid signature (not signed by the configured Cognito User Pool)
- **THEN** the response SHALL return HTTP 401 with `{ "error": "invalid token" }`

#### Scenario: Health check endpoints bypass auth

- **WHEN** a GET request is made to `/healthz` or `/readyz`
- **THEN** the response SHALL return HTTP 200 without requiring an Authorization header

### Requirement: CORS configuration

The API SHALL allow cross-origin requests from the Globify client.

#### Scenario: Preflight OPTIONS request

- **WHEN** an OPTIONS request is made with an Origin header
- **THEN** the response SHALL include `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` headers

#### Scenario: Allowed origins are configurable

- **WHEN** the `ALLOWED_ORIGINS` environment variable is set
- **THEN** only origins listed in that variable SHALL be accepted by the CORS middleware
