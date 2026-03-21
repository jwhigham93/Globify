## ADDED Requirements

### Requirement: Cognito sign-in flow

The Globify app SHALL authenticate users via AWS Cognito before granting access to the globe visualization.

#### Scenario: Unauthenticated user sees sign-in screen

- **WHEN** the app launches without a valid session
- **THEN** a sign-in screen SHALL be displayed
- **AND** the globe SHALL NOT be rendered

#### Scenario: Successful sign-in

- **WHEN** a user enters valid email and password and taps sign-in
- **THEN** the app SHALL authenticate via Cognito
- **AND** store the tokens (ID, access, refresh)
- **AND** transition to the globe visualization

#### Scenario: Token auto-refresh

- **WHEN** the ID token is within 5 minutes of expiry
- **THEN** the auth service SHALL automatically refresh the token using the refresh token
- **AND** API calls SHALL use the refreshed token transparently

#### Scenario: Invalid credentials

- **WHEN** a user enters incorrect email or password
- **THEN** the sign-in screen SHALL display an error message
- **AND** the user SHALL remain on the sign-in screen

#### Scenario: Sign-out

- **WHEN** the user triggers sign-out
- **THEN** all stored tokens SHALL be cleared
- **AND** the app SHALL return to the sign-in screen

### Requirement: AuthProvider context

An `AuthProvider` component SHALL wrap the app and provide authentication state and the current JWT token to child components.

#### Scenario: Token is available in context

- **WHEN** the user is authenticated
- **THEN** `useAuth()` hook SHALL return `{ isAuthenticated: true, token: string, signOut: function }`

#### Scenario: Loading state during session check

- **WHEN** the app starts and checks for an existing session
- **THEN** `useAuth()` SHALL return `{ isLoading: true }` until the check completes
