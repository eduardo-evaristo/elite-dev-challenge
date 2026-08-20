## Purpose

Lets a holder view their issued tickets (with a scannable QR), share a public metadata-only view of a ticket, and lets a gate validate a ticket's authenticity and mark it used exactly once.

## ADDED Requirements

### Requirement: Ticket issuance contract

When a ticket is issued for a reservation, the system SHALL generate the ticket's `id` as a server-side UUID, set that same `id` as the publicly exposed ticket identifier (no separate public-id field), and compute a `signature` equal to the hexadecimal digest of `HMAC-SHA256("${ticketId}:${eventId}", TICKET_SECRET)` where `eventId` is the event of the reservation being ticketed. The issued ticket SHALL be linked to exactly one reservation and to that reservation's user. The `signature` SHALL be persisted and SHALL serve as the authenticity proof consumed at gate validation. The signing key SHALL be read from a required environment variable named `TICKET_SECRET`; the system SHALL fail to start if that variable is absent.

#### Scenario: Issued ticket carries a verifiable signature
- **WHEN** a ticket is issued for a reservation whose event is `eventId`
- **THEN** the ticket's `signature` equals `HMAC-SHA256("${ticket.id}:${eventId}", TICKET_SECRET)` as a hex string, the ticket's `id` is a server-generated UUID, and the public ticket identifier equals that `id`

#### Scenario: Issued ticket is linked to the reservation and its user
- **WHEN** a ticket is issued for reservation `R` owned by user `U`
- **THEN** the ticket references `R` (one-to-one) and references `U`, and `U` is derived from the reservation, not supplied by the caller

#### Scenario: Missing signing secret prevents startup
- **WHEN** the `TICKET_SECRET` environment variable is not set
- **THEN** the system fails to start rather than issuing tickets signed with an absent or default key

### Requirement: Holder lists their own tickets

The system SHALL expose `GET /tickets/mine` authenticated via JWT. Only users with role `CLIENT` SHALL be permitted to call it. The endpoint SHALL return only tickets belonging to the authenticated user, each item including the associated event's identity (id, name, date, location), the seat or ticket-type sector when present, a `used` boolean, and a `qrContent` string. The list SHALL be paginated with the shape `{ items, page, totalPages, totalResults }`. The `userId` of the returned tickets SHALL always equal the authenticated principal; the request SHALL NOT accept a `userId` filter.

#### Scenario: Authenticated client lists their tickets
- **WHEN** an authenticated user with role `CLIENT` requests `GET /tickets/mine`
- **THEN** the system returns 200 with only that user's tickets, each item carrying the event data, the seat or sector, `used`, and `qrContent`

#### Scenario: Empty list when the holder has no tickets
- **WHEN** an authenticated `CLIENT` with zero tickets requests `GET /tickets/mine`
- **THEN** the system returns 200 with `items: []`, `totalResults: 0`, and a `totalPages` of at least 1

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated client requests `GET /tickets/mine`
- **THEN** the system returns 401 Unauthorized

#### Scenario: Non-client role
- **WHEN** an authenticated user with role `ORGANIZER`, `GATE`, or `ADMIN` requests `GET /tickets/mine`
- **THEN** the system returns 403 Forbidden

### Requirement: Holder views a single own ticket with QR

The system SHALL expose `GET /tickets/mine/:publicId` authenticated via JWT with role `CLIENT`. The endpoint SHALL return the full ticket detail including `signature` and `qrContent` only when the ticket's holder equals the authenticated user. If the `publicId` does not exist, the system SHALL return 404 Not Found. If the `publicId` exists but belongs to a different user, the system SHALL return 404 Not Found (not 403), so that existence of another user's ticket identifier is not confirmed.

#### Scenario: Owner retrieves their own ticket
- **WHEN** an authenticated `CLIENT` requests `GET /tickets/mine/:publicId` for a ticket they own
- **THEN** the system returns 200 with the ticket detail including `signature` and `qrContent`

#### Scenario: Existing ticket owned by another user
- **WHEN** an authenticated `CLIENT` requests `GET /tickets/mine/:publicId` for a ticket whose holder is a different user
- **THEN** the system returns 404 Not Found, indistinguishable from a non-existent `publicId`

#### Scenario: Non-existent public id
- **WHEN** an authenticated `CLIENT` requests `GET /tickets/mine/:publicId` for an id no ticket has
- **THEN** the system returns 404 Not Found

#### Scenario: Unauthenticated or non-client request
- **WHEN** an unauthenticated client, or an authenticated non-`CLIENT`, requests `GET /tickets/mine/:publicId`
- **THEN** the system returns 401 or 403 respectively

### Requirement: Public share view exposes no signature

The system SHALL expose `GET /tickets/:publicId` with no authentication. The endpoint SHALL return the ticket's event data, the seat or sector, a `used` boolean, and `usedAt`, but SHALL NOT include the `signature` or the `qrContent`. This ensures a leaked share link cannot be used to obtain the authenticity proof required to validate (and thereby burn) the ticket at the gate. If the `publicId` does not exist, the system SHALL return 404 Not Found.

#### Scenario: Anonymous visitor opens a share link
- **WHEN** any client, with or without credentials, requests `GET /tickets/:publicId` for an existing ticket
- **THEN** the system returns 200 with event, seat/sector, `used`, and `usedAt`, and the response body does not contain `signature` or `qrContent`

#### Scenario: Non-existent public id
- **WHEN** any client requests `GET /tickets/:publicId` for an id no ticket has
- **THEN** the system returns 404 Not Found

### Requirement: QR payload format

The `qrContent` string returned to the holder SHALL be a JSON object with a `v` (version) integer equal to `1`, an `id` string equal to the ticket's public identifier, and a `sig` string equal to the ticket's signature. The QR payload SHALL carry the ticket identifier and the signature; it SHALL NOT carry the `eventId` (the backend recomputes it from the stored ticket at validation time).

#### Scenario: qrContent shape
- **WHEN** the holder retrieves a ticket via `GET /tickets/mine` or `GET /tickets/mine/:publicId`
- **THEN** the `qrContent` is valid JSON equal to `{"v":1,"id":"<ticket.id>","sig":"<ticket.signature>"}` and contains no `eventId` field

### Requirement: Gate validation with four states and single-winner use-marking

The system SHALL expose `POST /tickets/validate` authenticated via JWT with role `GATE` or `ADMIN`. The request body SHALL accept `publicId` (required), `signature` (required), and `expectedEventId` (optional). The endpoint SHALL return one of exactly four status objects: `{status:'VALID'}`, `{status:'INVALID'}`, `{status:'ALREADY_USED'}`, or `{status:'WRONG_EVENT'}`. The evaluation order SHALL be: (1) ticket not found → `INVALID` (does not reveal existence); (2) `expectedEventId` provided and not equal to the ticket's event → `WRONG_EVENT`; (3) recomputed `HMAC-SHA256("${publicId}:${eventId}", TICKET_SECRET)` not equal to the supplied `signature` → `INVALID`; (4) otherwise mark `usedAt` to the current time. The use-marking SHALL be atomic and single-winner: under concurrent valid validations of the same ticket, exactly one SHALL receive `VALID` (and have `usedAt` set in that request) and all others SHALL receive `ALREADY_USED`. A ticket whose `usedAt` is already set SHALL always yield `ALREADY_USED`. Only the `VALID` outcome SHALL mutate `usedAt`.

#### Scenario: First valid validation marks the ticket used
- **WHEN** a `GATE`/`ADMIN` submits a `publicId` and `signature` that match an unused ticket, with no `expectedEventId` or a matching one
- **THEN** the system returns `{status:'VALID'}` and sets `usedAt` to the current time in the same request

#### Scenario: Signature mismatch
- **WHEN** the supplied `signature` does not equal the recomputed HMAC for the ticket
- **THEN** the system returns `{status:'INVALID'}` and does not modify `usedAt`

#### Scenario: Ticket not found does not reveal existence
- **WHEN** the supplied `publicId` matches no ticket
- **THEN** the system returns `{status:'INVALID'}` (not 404), indistinguishable from a signature mismatch

#### Scenario: Wrong event expected
- **WHEN** `expectedEventId` is provided and differs from the ticket's event
- **THEN** the system returns `{status:'WRONG_EVENT'}` and does not modify `usedAt`, and this check occurs before signature verification

#### Scenario: Already-used ticket
- **WHEN** the ticket's `usedAt` is already set and a valid validation is submitted
- **THEN** the system returns `{status:'ALREADY_USED'}` and does not change `usedAt`

#### Scenario: Concurrent validations of the same valid ticket
- **WHEN** two `GATE`/`ADMIN` clients submit valid validations for the same unused ticket simultaneously
- **THEN** exactly one receives `{status:'VALID'}` (and `usedAt` becomes set), the other receives `{status:'ALREADY_USED'}`, and `usedAt` is set exactly once

#### Scenario: Unauthenticated or unauthorized role
- **WHEN** an unauthenticated client, or an authenticated user whose role is not `GATE` or `ADMIN`, submits a validation request
- **THEN** the system returns 401 or 403 respectively
