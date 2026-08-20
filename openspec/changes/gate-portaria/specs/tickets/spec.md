## MODIFIED Requirements

### Requirement: Ticket issuance contract

When a ticket is issued for a reservation, the system SHALL generate the ticket's `id` as a server-side UUID, set that same `id` as the publicly exposed ticket identifier (no separate public-id field), and compute a `signature` equal to the hexadecimal digest of `HMAC-SHA256("${ticketId}:${eventId}", TICKET_SECRET)` where `eventId` is the event of the reservation being ticketed. The system SHALL also generate a `shortId` (8 characters from the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, no visually ambiguous characters) that is unique across all tickets and a `manualCode` (8 characters from the same alphabet) that is an independent random secret not derivable from any other field. The issued ticket SHALL be linked to exactly one reservation and to that reservation's user. The `signature`, `shortId`, and `manualCode` SHALL be persisted. The `signature` SHALL serve as the authenticity proof for QR-based gate validation; the `manualCode` SHALL serve as the authenticity proof for manual-entry gate validation. The `shortId` SHALL serve as the lookup key for manual-entry validation. The signing key SHALL be read from a required environment variable named `TICKET_SECRET`; the system SHALL fail to start if that variable is absent.

#### Scenario: Issued ticket carries a verifiable signature
- **WHEN** a ticket is issued for a reservation whose event is `eventId`
- **THEN** the ticket's `signature` equals `HMAC-SHA256("${ticket.id}:${eventId}", TICKET_SECRET)` as a hex string, the ticket's `id` is a server-generated UUID, and the public ticket identifier equals that `id`

#### Scenario: Issued ticket carries a unique shortId and a random manualCode
- **WHEN** a ticket is issued for a reservation
- **THEN** the ticket's `shortId` is 8 characters from the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, the ticket's `manualCode` is 8 characters from the same alphabet, the `shortId` is unique across all tickets, and the `manualCode` is not derivable from `shortId`, `id`, `signature`, or `eventId`

#### Scenario: Issued ticket is linked to the reservation and its user
- **WHEN** a ticket is issued for reservation `R` owned by user `U`
- **THEN** the ticket references `R` (one-to-one) and references `U`, and `U` is derived from the reservation, not supplied by the caller

#### Scenario: Missing signing secret prevents startup
- **WHEN** the `TICKET_SECRET` environment variable is not set
- **THEN** the system fails to start rather than issuing tickets signed with an absent or default key

### Requirement: Holder lists their own tickets

The system SHALL expose `GET /tickets/mine` authenticated via JWT. Only users with role `CLIENT` SHALL be permitted to call it. The endpoint SHALL return only tickets belonging to the authenticated user, each item including the associated event's identity (id, name, date, location), the seat or ticket-type sector when present, a `used` boolean, a `qrContent` string, a `shortId` string, and a `manualCode` string. The list SHALL be paginated with the shape `{ items, page, totalPages, totalResults }`. The `userId` of the returned tickets SHALL always equal the authenticated principal; the request SHALL NOT accept a `userId` filter.

#### Scenario: Authenticated client lists their tickets
- **WHEN** an authenticated user with role `CLIENT` requests `GET /tickets/mine`
- **THEN** the system returns 200 with only that user's tickets, each item carrying the event data, the seat or sector, `used`, `qrContent`, `shortId`, and `manualCode`

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

The system SHALL expose `GET /tickets/mine/:publicId` authenticated via JWT with role `CLIENT`. The endpoint SHALL return the full ticket detail including `signature`, `qrContent`, `shortId`, and `manualCode` only when the ticket's holder equals the authenticated user. If the `publicId` does not exist, the system SHALL return 404 Not Found. If the `publicId` exists but belongs to a different user, the system SHALL return 404 Not Found (not 403), so that existence of another user's ticket identifier is not confirmed.

#### Scenario: Owner retrieves their own ticket
- **WHEN** an authenticated `CLIENT` requests `GET /tickets/mine/:publicId` for a ticket they own
- **THEN** the system returns 200 with the ticket detail including `signature`, `qrContent`, `shortId`, and `manualCode`

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

The system SHALL expose `GET /tickets/:publicId` with no authentication. The endpoint SHALL return the ticket's event data, the seat or sector, a `used` boolean, and `usedAt`, but SHALL NOT include the `signature`, `qrContent`, `shortId`, or `manualCode`. This ensures a leaked share link cannot be used to obtain any authenticity proof required to validate (and thereby burn) the ticket at the gate. If the `publicId` does not exist, the system SHALL return 404 Not Found.

#### Scenario: Anonymous visitor opens a share link
- **WHEN** any client, with or without credentials, requests `GET /tickets/:publicId` for an existing ticket
- **THEN** the system returns 200 with event, seat/sector, `used`, and `usedAt`, and the response body does not contain `signature`, `qrContent`, `shortId`, or `manualCode`

#### Scenario: Non-existent public id
- **WHEN** any client requests `GET /tickets/:publicId` for an id no ticket has
- **THEN** the system returns 404 Not Found

### Requirement: Gate validation with four states and single-winner use-marking

The system SHALL expose `POST /tickets/validate` authenticated via JWT with role `GATE` or `ADMIN`. The endpoint SHALL be rate-limited to at most 10 requests per minute per client IP; requests exceeding this limit SHALL receive HTTP 429. The request body SHALL accept exactly one of two proof fields: `signature` (the HMAC hex string, accompanied by `publicId`) or `manualEntryCode` (a combined `shortId-manualCode` string). The `publicId` field SHALL be required when `signature` is provided and SHALL be optional otherwise. The `expectedEventId` field SHALL be optional in both paths. The endpoint SHALL return one of exactly four status objects: `{status:'VALID', holderName, ticketLabel}`, `{status:'INVALID'}`, `{status:'ALREADY_USED', holderName, usedAt}`, or `{status:'WRONG_EVENT', ticketEventName}`. The evaluation order SHALL be: (1) locate the ticket — by `publicId` when `signature` is provided, or by splitting `manualEntryCode` on `-` and looking up the `shortId` portion — if not found or the `manualEntryCode` format is invalid → `INVALID` (does not reveal existence); (2) `expectedEventId` provided and not equal to the ticket's event → `WRONG_EVENT` (with `ticketEventName`); (3) verify authenticity — if `signature` path, recompute `HMAC-SHA256("${publicId}:${eventId}", TICKET_SECRET)` and compare to the supplied `signature` via timing-safe comparison; if `manualEntryCode` path, compare the `manualCode` portion to the stored `manualCode` via timing-safe comparison — mismatch → `INVALID`; (4) otherwise attempt to mark `usedAt` to the current time. The use-marking SHALL be atomic and single-winner: under concurrent valid validations of the same ticket, exactly one SHALL receive `VALID` (and have `usedAt` set in that request) and all others SHALL receive `ALREADY_USED` (with `holderName` and `usedAt` from the already-stored value). A ticket whose `usedAt` is already set SHALL always yield `ALREADY_USED`. Only the `VALID` outcome SHALL mutate `usedAt`.

#### Scenario: First valid validation marks the ticket used
- **WHEN** a `GATE`/`ADMIN` submits a `publicId` and `signature` (QR path) or a `manualEntryCode` (manual path) that match an unused ticket, with no `expectedEventId` or a matching one
- **THEN** the system returns `{status:'VALID', holderName, ticketLabel}` and sets `usedAt` to the current time in the same request

#### Scenario: First valid validation via manual entry code marks the ticket used
- **WHEN** a `GATE`/`ADMIN` submits a `manualEntryCode` of `XXXXXXXX-XXXXXXXX` where `XXXXXXXX` (before the hyphen) matches a ticket's `shortId` and `XXXXXXXX` (after the hyphen) matches that ticket's `manualCode`, with no `expectedEventId` or a matching one
- **THEN** the system returns `{status:'VALID', holderName, ticketLabel}` and sets `usedAt` to the current time in the same request

#### Scenario: Signature mismatch
- **WHEN** the supplied `signature` does not equal the recomputed HMAC for the ticket
- **THEN** the system returns `{status:'INVALID'}` and does not modify `usedAt`

#### Scenario: Manual code mismatch
- **WHEN** the `manualEntryCode` splits into a `shortId` that matches a ticket but the `manualCode` portion does not match the stored `manualCode`
- **THEN** the system returns `{status:'INVALID'}` and does not modify `usedAt`

#### Scenario: Malformed manual entry code
- **WHEN** the supplied `manualEntryCode` does not contain a hyphen separator or either segment is empty
- **THEN** the system returns `{status:'INVALID'}` without performing a database lookup

#### Scenario: Ticket not found does not reveal existence
- **WHEN** the supplied `publicId` matches no ticket, or the `shortId` portion of `manualEntryCode` matches no ticket
- **THEN** the system returns `{status:'INVALID'}` (not 404), indistinguishable from a proof mismatch

#### Scenario: Wrong event expected
- **WHEN** `expectedEventId` is provided and differs from the ticket's event
- **THEN** the system returns `{status:'WRONG_EVENT', ticketEventName}` and does not modify `usedAt`, and this check occurs before authenticity verification

#### Scenario: Already-used ticket
- **WHEN** the ticket's `usedAt` is already set and a valid validation is submitted via either proof path
- **THEN** the system returns `{status:'ALREADY_USED', holderName, usedAt}` and does not change `usedAt`

#### Scenario: Concurrent validations of the same valid ticket
- **WHEN** two `GATE`/`ADMIN` clients submit valid validations for the same unused ticket simultaneously
- **THEN** exactly one receives `{status:'VALID', holderName, ticketLabel}` (and `usedAt` becomes set), the other receives `{status:'ALREADY_USED', holderName, usedAt}`, and `usedAt` is set exactly once

#### Scenario: Rate limit exceeded
- **WHEN** a single client IP submits more than 10 validation requests within one minute
- **THEN** the system returns HTTP 429 for requests beyond the limit

#### Scenario: Unauthenticated or unauthorized role
- **WHEN** an unauthenticated client, or an authenticated user whose role is not `GATE` or `ADMIN`, submits a validation request
- **THEN** the system returns 401 or 403 respectively

#### Scenario: Both proof fields provided
- **WHEN** the request body contains both `signature` and `manualEntryCode`
- **THEN** the system rejects the request with a validation error indicating exactly one proof field must be provided
