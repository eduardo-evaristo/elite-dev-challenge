## Purpose

Lets an authenticated client reserve a single unit of an event's inventory — either one named seat or one standing-sector ticket — with concurrency-safe semantics that prevent double-reservation of the same seat and overselling a sector beyond its remaining availability.

## Requirements

### Requirement: Create reservation

The system SHALL expose a `POST /reservations` endpoint authenticated via JWT. Only users with role `CLIENT` SHALL be permitted to create reservations. The `userId` of the new reservation SHALL be taken from the authenticated principal; the request body SHALL NOT supply `userId`. A newly created reservation SHALL have status `PENDING`. The response SHALL include the reservation's `id`, `eventId`, `userId`, exactly one of `seatId` or `ticketTypeId` (whichever was supplied in the request), `status`, and `createdAt` as an ISO 8601 string.

#### Scenario: Authenticated client creates a reservation
- **WHEN** an authenticated user with role `CLIENT` submits a valid reservation request
- **THEN** the system creates a reservation with status `PENDING`, sets its `userId` to the authenticated user's id, and returns 201 with the reservation's `id`, `eventId`, `userId`, the supplied `seatId` or `ticketTypeId`, `status`, and `createdAt`

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated client submits a create request
- **THEN** the system returns 401 Unauthorized

#### Scenario: Non-client role
- **WHEN** an authenticated user with role `ORGANIZER`, `GATE`, or `ADMIN` submits a create request
- **THEN** the system returns 403 Forbidden

#### Scenario: userId supplied in the body is ignored
- **WHEN** an authenticated client submits a reservation request that includes a `userId` field in the body
- **THEN** the system ignores the body `userId` and creates the reservation with the authenticated user's id

### Requirement: Mutually exclusive reservation target

A valid reservation request SHALL provide `eventId` (required) plus exactly one of `seatId` or `ticketTypeId`. The system SHALL reject with a 400 Bad Request validation error any request that provides both `seatId` and `ticketTypeId`, and any request that provides neither. A request missing `eventId` SHALL be rejected with a 400 validation error.

#### Scenario: Both seat and ticket type provided
- **WHEN** a client submits a request with `eventId`, `seatId`, and `ticketTypeId` all set
- **THEN** the system rejects the request with a 400 validation error indicating that exactly one of seatId or ticketTypeId must be provided

#### Scenario: Neither seat nor ticket type provided
- **WHEN** a client submits a request with only `eventId`
- **THEN** the system rejects the request with a 400 validation error indicating that exactly one of seatId or ticketTypeId must be provided

#### Scenario: Only seatId provided
- **WHEN** a client submits a request with `eventId` and `seatId` (no `ticketTypeId`)
- **THEN** the request passes validation and proceeds to seat reservation

#### Scenario: Only ticketTypeId provided
- **WHEN** a client submits a request with `eventId` and `ticketTypeId` (no `seatId`)
- **THEN** the request passes validation and proceeds to sector reservation

#### Scenario: Missing eventId
- **WHEN** a client submits a request without `eventId`
- **THEN** the system rejects the request with a 400 validation error

### Requirement: Reserve a named seat

For a request providing `seatId`, the system SHALL look up the seat. If the seat does not exist, the system SHALL return 404 Not Found. If the seat exists but does not belong to the event identified by `eventId`, the system SHALL return 400 Bad Request. Otherwise the system SHALL create a reservation for that seat with status `PENDING` and return 201 with the reservation.

#### Scenario: Seat not found
- **WHEN** a client reserves a `seatId` that does not exist
- **THEN** the system returns 404 Not Found

#### Scenario: Seat belongs to a different event
- **WHEN** a client reserves a `seatId` that exists but whose event is not the one identified by `eventId`
- **THEN** the system returns 400 Bad Request indicating the seat does not belong to this event

#### Scenario: Successful seat reservation
- **WHEN** a client reserves an available `seatId` that belongs to the given `eventId`
- **THEN** the system creates a reservation with status `PENDING` for that seat and returns 201 with the reservation

### Requirement: Named-seat reservation is single-winner under contention

A given seat SHALL be reservable at most once. The system SHALL ensure that under simultaneous reservation requests for the same `seatId`, exactly one request succeeds with 201 and all concurrent contenders SHALL receive 409 Conflict indicating the seat was just reserved by another person. After any such contention, exactly one reservation SHALL exist for that `seatId`.

#### Scenario: Two simultaneous requests for the same seat
- **WHEN** two authenticated clients submit reservation requests for the same `seatId` at the same time
- **THEN** exactly one request receives 201 and the other receives 409 Conflict, and exactly one reservation exists for that `seatId`

#### Scenario: Sequential reservation of an already-reserved seat
- **WHEN** a client reserves a `seatId` that already has a reservation
- **THEN** the system returns 409 Conflict indicating the seat was just reserved by another person

### Requirement: Reserve a standing-sector ticket

For a request providing `ticketTypeId`, the system SHALL look up the ticket type. If it does not exist, the system SHALL return 404 Not Found. If it exists but does not belong to the event identified by `eventId`, the system SHALL return 400 Bad Request. Otherwise the system SHALL create a reservation with status `PENDING` and decrement the sector's remaining availability by exactly one, provided at least one unit remains available.

#### Scenario: Ticket type not found
- **WHEN** a client reserves a `ticketTypeId` that does not exist
- **THEN** the system returns 404 Not Found

#### Scenario: Ticket type belongs to a different event
- **WHEN** a client reserves a `ticketTypeId` that exists but whose event is not the one identified by `eventId`
- **THEN** the system returns 400 Bad Request indicating the sector does not belong to this event

#### Scenario: Successful sector reservation
- **WHEN** a client reserves a `ticketTypeId` whose remaining availability is at least one
- **THEN** the system creates a reservation with status `PENDING`, decrements the remaining availability by one, and returns 201 with the reservation

### Requirement: Standing-sector reservation never oversells under contention

The system SHALL ensure that the number of successful reservations for a given `ticketTypeId` never exceeds its remaining availability at the time of the requests. Under N simultaneous requests against a sector with remaining availability K where K < N, exactly K requests SHALL succeed with 201 and the remaining N-K SHALL receive 409 Conflict indicating the sector is sold out. The remaining availability SHALL never become negative.

#### Scenario: Availability of one with two simultaneous requests
- **WHEN** two authenticated clients submit reservation requests for the same `ticketTypeId` whose remaining availability is one
- **THEN** exactly one request receives 201, the other receives 409 Conflict sold-out, the final remaining availability is zero, and exactly one reservation exists for that `ticketTypeId`

#### Scenario: Already sold-out sector
- **WHEN** a client reserves a `ticketTypeId` whose remaining availability is zero
- **THEN** the system returns 409 Conflict indicating the sector is sold out

#### Scenario: Oversell stress with availability of one
- **WHEN** ten authenticated clients submit reservation requests for the same `ticketTypeId` whose remaining availability is one
- **THEN** exactly one request receives 201, nine receive 409 Conflict sold-out, the final remaining availability is zero, and exactly one reservation exists for that `ticketTypeId`

### Requirement: Conflict is distinct from not-found and wrong-event

The system SHALL return 409 Conflict only when the reservation target genuinely cannot be fulfilled due to contention or exhaustion — the seat was just reserved by another request, or the sector has no remaining availability. The system SHALL NOT return 409 for a `seatId` or `ticketTypeId` that does not exist (that SHALL be 404) or that belongs to a different event (that SHALL be 400).

#### Scenario: Non-existent target is not a conflict
- **WHEN** a client reserves a `seatId` or `ticketTypeId` that does not exist
- **THEN** the system returns 404 Not Found, not 409 Conflict

#### Scenario: Wrong-event target is not a conflict
- **WHEN** a client reserves a `seatId` or `ticketTypeId` that belongs to a different event
- **THEN** the system returns 400 Bad Request, not 409 Conflict

#### Scenario: Genuine concurrent seat conflict is a conflict
- **WHEN** a client reserves a `seatId` that another concurrent request just reserved
- **THEN** the system returns 409 Conflict indicating the seat was just reserved by another person

#### Scenario: Genuine sector exhaustion is a conflict
- **WHEN** a client reserves a `ticketTypeId` whose remaining availability is zero
- **THEN** the system returns 409 Conflict indicating the sector is sold out
