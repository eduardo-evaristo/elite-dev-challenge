## Why

The platform can create and browse events with seats and ticket types, but clients cannot yet reserve a seat or a sector ticket. Without a reservation endpoint there is no path from "browse" to "buy", and the `availableCount` decrement on `TicketType` (initialized at event creation) is never exercised. This change introduces the `ReservationsModule` exposing `POST /reservations`, with concurrency-safe semantics for the two mutually exclusive reservation models the schema already supports: named-seat events (guarded by `Reservation.seatId @unique`) and standing-sector events (guarded by an atomic `availableCount` decrement).

## What Changes

- Add `ReservationsModule` (controller, service, repository, DTOs) to the NestJS backend following the existing module pattern (events, users, catalog)
- Add `POST /reservations` endpoint authenticated via JWT, restricted to role `CLIENT`; `userId` is taken from the authenticated user, never from the request body
- Add `CreateReservationDto` with a custom class-validator `ExactlyOneOf` decorator that enforces the XOR rule: a valid reservation provides `eventId` plus exactly one of `seatId` or `ticketTypeId` — both filled and neither filled are rejected at the DTO layer
- Implement two creation paths with distinct concurrency strategies:
  - **Named seat** (`seatId`): precondition read (`findSeat` — exists? belongs to event?), then raw `reservation.create`; relies on `Reservation.seatId @unique` for concurrency safety, catching Prisma error `P2002` and converting to `409 ConflictException`
  - **Standing sector** (`ticketTypeId`): precondition read (`findTicketType` — exists? belongs to event?), then an atomic `$transaction` that decrements `TicketType.availableCount` with `where availableCount >= 1` and creates the `Reservation` only if the decrement affected a row; zero rows affected → `409 ConflictException` (genuine sold-out)
- Distinguish `404` (seat/ticketType does not exist), `400` (does not belong to the given `eventId`), and `409` (genuine concurrency conflict / sold-out) — never collapse "id does not exist" into the sold-out message
- Do NOT consult or write `Seat.status` in this flow (documented limitation: `SeatStatus` exists in the schema but is not kept synchronized; the single source of truth for seat reservations is `Reservation.seatId @unique`)
- Add unit tests for the DTO mutex rule (both-filled rejected, neither-filled rejected, exactly-one accepted)
- Wire `ReservationsModule` into `app.module.ts`

## Capabilities

### New Capabilities
- `reservations`: Creating seat and sector reservations with concurrency-safe semantics under contention

### Modified Capabilities
<!-- none -->

## Impact

- **Backend code**: New `apps/backend/src/reservations/` directory (module, controller, service, repository, DTOs, validator, spec); `apps/backend/src/app.module.ts` modified to import `ReservationsModule`
- **API surface**: 1 new HTTP endpoint `POST /reservations` — no existing endpoints affected
- **Dependencies**: No new external dependencies; uses existing Prisma models (`Reservation`, `Seat`, `TicketType`), class-validator (`registerDecorator`, `ValidatorConstraint`), and the existing `JwtGuard`/`RolesGuard` infrastructure
- **Database**: No schema changes — uses existing `Reservation.seatId @unique` constraint and `TicketType.availableCount` counter; no migrations
- **Shared package**: No changes to `@elite-dev/shared` (response shape is backend-only in this change; shared contracts can be added when the frontend consumes the endpoint)
