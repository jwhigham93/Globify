## ADDED Requirements

### Requirement: API client service

The Globify app SHALL have an API client service (`apiClient.ts`) that communicates with the Go supply chain API over HTTP.

#### Scenario: Successful GET request

- **WHEN** `apiClient.get('/locations')` is called with a valid JWT token
- **THEN** the request SHALL include `Authorization: Bearer <token>` header
- **AND** the response SHALL be parsed as JSON and returned

#### Scenario: Automatic retry on network failure

- **WHEN** a request fails due to a network error
- **THEN** the client SHALL retry up to 3 times with exponential backoff (1s, 2s, 4s)
- **AND** if all retries fail, the error SHALL be thrown to the caller

#### Scenario: API base URL is configurable

- **WHEN** the API client is initialized
- **THEN** the base URL SHALL be read from the app's environment configuration
- **AND** all requests SHALL be prefixed with this base URL + `/api/v1/`

#### Scenario: HTTP error response

- **WHEN** the API returns a non-2xx status code
- **THEN** the client SHALL throw an error containing the status code and error message from the response body
