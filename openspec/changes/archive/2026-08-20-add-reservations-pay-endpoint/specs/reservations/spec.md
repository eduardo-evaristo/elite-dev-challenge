## ADDED Requirements

### Requirement: Pay a pending reservation

The system SHALL expose a `POST /reservations/:id/pay` endpoint authenticated via JWT. Only users with role `CLIENT` SHALL be permitted to pay a reservation. The request body SHALL accept a `cardNumber` string and SHALL NOT accept an `amount` field — any `amount` supplied in the body SHALL be silently stripped. The `userId` used for ownership verification SHALL be taken from the authenticated principal, not from the body. The system SHALL return 404 Not Found if the reservation does not exist or if it exists but belongs to a different user (so that existence of another user's reservation is not confirmed). The system SHALL return 400 Bad Request if the reservation's status is not `PENDING`.

#### Scenario: Authenticated client pays their own pending reservation
- **WHEN** an authenticated user with role `CLIENT` submits a pay request for their own reservation whose status is `PENDING`
- **THEN** the system processes the payment and returns either the issued ticket (on approval) or a declined response

#### Scenario: Reservation belongs to another user
- **WHEN** an authenticated `CLIENT` submits a pay request for a reservation whose `userId` differs from the authenticated principal
- **THEN** the system returns 404 Not Found, indistinguishable from a non-existent reservation

#### Scenario: Non-existent reservation
- **WHEN** an authenticated `CLIENT` submits a pay request for a reservation id that does not exist
- **THEN** the system returns 404 Not Found

#### Scenario: Reservation is not pending
- **WHEN** an authenticated `CLIENT` submits a pay request for their own reservation whose status is `CONFIRMED` or `CANCELLED`
- **THEN** the system returns 400 Bad Request indicating the reservation is not pending

#### Scenario: Unauthenticated or non-client request
- **WHEN** an unauthenticated client, or an authenticated user whose role is not `CLIENT`, submits a pay request
- **THEN** the system returns 401 or 403 respectively

#### Scenario: Amount field in the body is ignored
- **WHEN** an authenticated `CLIENT` submits a pay request that includes an `amount` field in the body
- **THEN** the system ignores the body `amount` and computes the charge amount from persisted data

### Requirement: Charge amount is always derived from persisted price

The system SHALL compute the charge amount exclusively from data already persisted in the database, never from the request body. For a reservation linked to a ticket type, the amount SHALL be the ticket type's persisted price. For a reservation linked to a seat, the amount SHALL be the price of the first ticket type of the reservation's event. If no ticket type can be found to derive a price, the system SHALL return 409 Conflict indicating the price could not be determined.

#### Scenario: Amount derived from the reservation's ticket type
- **WHEN** a pay request is processed for a reservation linked to a ticket type whose price is 150.00
- **THEN** the charge submitted to the payment provider uses 150 as the amount

#### Scenario: Amount derived from the event's ticket type for a seat reservation
- **WHEN** a pay request is processed for a seat-based reservation whose event has a ticket type priced at 45.00
- **THEN** the charge submitted to the payment provider uses 45 as the amount

#### Scenario: No ticket type exists to derive a price
- **WHEN** a pay request is processed for a seat-based reservation whose event has no ticket types
- **THEN** the system returns 409 Conflict indicating the price could not be determined

### Requirement: Approved payment confirms the reservation and triggers ticket issuance

When the payment provider resolves the charge to approved, the system SHALL set the reservation's status to `CONFIRMED` and its `paymentStatus` to `APPROVED`. The system SHALL then delegate ticket issuance to the tickets capability, which SHALL create a ticket linked to the reservation with an HMAC signature. The pay endpoint SHALL return the issued ticket (including its `signature` and `qrContent`) as the response. The reservation module SHALL NOT compute the ticket signature itself; it SHALL only decide that payment was approved and delegate.

#### Scenario: Approved payment confirms and issues a ticket
- **WHEN** the payment provider resolves a charge to approved for a pending reservation
- **THEN** the reservation's status becomes `CONFIRMED`, its `paymentStatus` becomes `APPROVED`, a ticket is issued for that reservation, and the pay endpoint returns the ticket with its signature and QR content

#### Scenario: Customer receives ticket immediately on payment
- **WHEN** a pay request results in an approved charge
- **THEN** the response body contains the issued ticket's `id`, `signature`, and `qrContent`

### Requirement: Declined payment preserves the reservation hold

When the payment provider resolves the charge to declined, the system SHALL set the reservation's `paymentStatus` to `DECLINED` and SHALL leave the reservation's status as `PENDING`. The seat or sector inventory hold SHALL remain in effect — the reservation is not released, and the client may attempt payment again. The pay endpoint SHALL return HTTP 200 with a body of `{ "status": "DECLINED", "message": "Pagamento recusado" }`.

#### Scenario: Declined payment keeps the reservation pending
- **WHEN** the payment provider resolves a charge to declined for a pending reservation
- **THEN** the reservation's `paymentStatus` becomes `DECLINED`, its `status` remains `PENDING`, no ticket is issued, and the pay endpoint returns 200 with `{ "status": "DECLINED", "message": "Pagamento recusado" }`

#### Scenario: Client can retry payment after a decline
- **WHEN** a client submits a new pay request for a reservation whose `paymentStatus` is `DECLINED` and whose `status` is still `PENDING`
- **THEN** the system processes the new payment request normally

### Requirement: Pending payment outcome is not handled

The payment provider contract allows a pending outcome that carries an external identifier. The system SHALL NOT implement handling for a pending payment outcome at this stage. If the payment provider returns a pending result, the system SHALL respond with a 500 Internal Server Error. This limitation exists because persisting a pending payment requires a schema column and webhook handling that are introduced when a real asynchronous payment provider is integrated.

#### Scenario: Pending payment result yields an error
- **WHEN** the payment provider resolves a charge to pending with an external identifier
- **THEN** the system returns 500 Internal Server Error, the reservation's status and paymentStatus are not modified, and no ticket is issued
