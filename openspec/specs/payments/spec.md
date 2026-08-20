## Purpose

Abstracts charging a payment behind a swappable provider selected at application startup, with a deterministic simulated implementation for development and testing.

## Requirements

### Requirement: Payment provider is selected at startup by configuration

The system SHALL select exactly one payment provider at application startup based on the `PAYMENT_PROVIDER` environment variable. When the variable is absent, the system SHALL use the simulated provider. When the variable names an unknown provider, the system SHALL fail to start. The selected provider SHALL be the only payment provider initialized; no unselected provider SHALL be constructed.

#### Scenario: Default provider when env var absent
- **WHEN** the `PAYMENT_PROVIDER` environment variable is not set
- **THEN** the system starts with the simulated provider as the active payment provider

#### Scenario: Explicit simulated provider
- **WHEN** `PAYMENT_PROVIDER` is set to `simulated`
- **THEN** the system starts with the simulated provider as the active payment provider

#### Scenario: Unknown provider name fails startup
- **WHEN** `PAYMENT_PROVIDER` is set to a value other than a supported provider name
- **THEN** the system fails to start with an error indicating the unknown provider

### Requirement: Charge outcome contract

A charge SHALL resolve to exactly one of three outcomes: approved, declined, or pending. A pending outcome SHALL always carry an external identifier that identifies the charge at the upstream gateway; an approved or declined outcome SHALL NOT require an external identifier. A charge SHALL never resolve with a pending outcome unless it also provides that external identifier.

#### Scenario: Approved outcome
- **WHEN** a charge is submitted that the provider accepts
- **THEN** the charge resolves to an approved outcome and no external identifier is required

#### Scenario: Declined outcome
- **WHEN** a charge is submitted that the provider rejects
- **THEN** the charge resolves to a declined outcome and no external identifier is required

#### Scenario: Pending outcome carries an external identifier
- **WHEN** a charge is submitted that the provider places in a pending state awaiting upstream confirmation
- **THEN** the charge resolves to a pending outcome together with an external identifier identifying the charge at the upstream gateway

### Requirement: Simulated provider resolves deterministically by card number parity

The simulated provider SHALL resolve each charge synchronously and deterministically based on the last digit of the submitted card number: an even last digit SHALL resolve to approved, and an odd last digit SHALL resolve to declined. The simulated provider SHALL never resolve to a pending outcome. The simulated provider SHALL reject a charge whose card number has no numeric last digit with a bad-request error.

#### Scenario: Even last digit is approved
- **WHEN** a charge is submitted to the simulated provider with a card number whose last digit is even
- **THEN** the charge resolves to approved

#### Scenario: Odd last digit is declined
- **WHEN** a charge is submitted to the simulated provider with a card number whose last digit is odd
- **THEN** the charge resolves to declined

#### Scenario: Card number with no numeric last digit is rejected
- **WHEN** a charge is submitted to the simulated provider with a card number whose last character is not a digit
- **THEN** the simulated provider rejects the charge with a bad-request error

#### Scenario: Simulated provider never returns pending
- **WHEN** any valid charge is submitted to the simulated provider
- **THEN** the outcome is either approved or declined, never pending
