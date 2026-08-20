## Context

The backend follows a controller → service → repository → `PrismaService` layering established in the `events`, `users`, and `catalog` modules. The Prisma schema already models `Reservation` with two mutually exclusive inventory references: `seatId String? @unique` (a named seat can be referenced by at most one reservation) and `ticketTypeId String?` (no unique constraint). `TicketType` carries an `availableCount Int` counter initialized to `capacity` at event creation. `Seat` carries a `SeatStatus` enum (`AVAILABLE`/`RESERVED`/`SOLD`) that is currently never written by any flow. Auth is JWT in httpOnly cookies via `JwtGuard`; role enforcement uses `RolesGuard` + `@Roles()`. The global `ValidationPipe({ transform: true, whitelist: true })` in `main.ts` runs class-validator on DTOs and strips unknown properties (so a body `userId` is dropped automatically). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Provide a `ReservationsModule` that fits the existing module/repository pattern
- Enforce the `eventId` + exactly-one-of-(`seatId`, `ticketTypeId`) XOR rule at the DTO layer, before it reaches the service
- Guarantee concurrency safety for both inventory models using the database as the source of truth, without application-level locks
- Keep the concurrency guard and the input-validation precondition as separate, clearly labeled responsibilities

**Non-Goals:**
- Payment, confirmation, ticket issuance, or cancellation flows (reservation is created as `PENDING`; later transitions are out of scope)
- Synchronizing `Seat.status` with reservation state
- Listing, fetching, or managing existing reservations
- Frontend integration or shared-type contracts in `@elite-dev/shared` (added when the frontend consumes the endpoint)
- Application-level locking, queues, or rate limiting

## Decisions

### 1. Custom class-level validator for the XOR rule, not `@ValidateIf`

The `eventId` + exactly-one-of-(`seatId`, `ticketTypeId`) rule is a cross-field XOR constraint. class-validator's `@ValidateIf` only **skips** a single field's validators based on object state; it can express "make `seatId` required when `ticketTypeId` is absent" (covering the "neither filled" case) but it **cannot reject "both filled"** — when both are present, no `@ValidateIf` condition fires and no error is raised. A custom `@ValidatorConstraint` + `registerDecorator` validator (`ExactlyOneOf`) reads the whole object, counts how many of the named fields are non-null, and requires `count === 1`, producing one clear class-level error for both invalid cases.

**Alternative considered:** `@ValidateIf` with `@IsNotEmpty` on each field. Rejected because it cannot catch the "both filled" case and scatters the rule across two field-level messages. **Alternative considered:** enforce the rule in the service (as `events.service.ts` does for "MOVIE needs seats"). Rejected because it contradicts the requirement to reject via class-validator at the DTO layer.

### 2. Precondition reads are input validation, not concurrency guards

`findSeat`/`findTicketType` are read-before-write lookups that produce the 404 (does not exist) and 400 (belongs to a different event) responses. They are **not** part of the concurrency guarantee. There is a TOCTOU window between the precondition read and the write; it is harmless because the real guard (the `@unique` constraint for seats, the atomic decrement for sectors) catches the concurrent contender. The code comments must state this separation explicitly so a reader does not mistake the precondition read for a lock.

**Alternative considered:** fold the existence/belonging check into the same query as the write. Rejected for seats because the write is a `reservation.create` whose only concurrency signal is the `P2002` error (it cannot distinguish "seat doesn't exist" from "seat already reserved"); a separate read keeps 404 distinct from 409. For sectors the transaction's `updateMany` collapses "doesn't exist" and "sold out" into `count === 0`, so a separate read is required to keep 404 distinct from 409.

### 3. Named-seat concurrency via the `@unique` constraint + `P2002`

The schema already declares `Reservation.seatId String? @unique`. The seat path does a raw `reservation.create`; under contention the second insert violates the unique constraint and Prisma raises `PrismaClientKnownRequestError` with code `P2002`. The service catches `P2002` and converts it to `409 ConflictException` with the message "Esse assento acabou de ser reservado por outra pessoa". No application-level lock, no transaction, no seat-status flag is involved.

**Alternative considered:** flip `Seat.status` to `RESERVED` in a transaction with a `where status = 'AVAILABLE'` guard (analogous to the sector path). Rejected to keep a single source of truth; `Seat.status` is not maintained elsewhere, so consulting it here would create a second, divergent authority for "is this seat taken".

### 4. Standing-sector concurrency via an atomic conditional decrement in a transaction

There is no unique constraint on `Reservation.ticketTypeId`, so the guarantee comes from `TicketType.availableCount`. The repository runs an interactive `$transaction` that executes `ticketType.updateMany({ where: { id, availableCount: { gte: 1 } }, data: { availableCount: { decrement: 1 } } })` and, only if `result.count === 1`, creates the reservation in the same transaction. If `count === 0`, the transaction returns `null` and the service raises `409 ConflictException` ("Ingressos esgotados para este setor"). Postgres acquires a row-level lock on the `UPDATE`; a second concurrent transaction blocks, and on re-evaluation of `availableCount >= 1` (now `0`) updates zero rows, so exactly one contender wins.

**Alternative considered:** read `availableCount`, check `>= 1`, then decrement in a separate write. Rejected — classic read-then-write race that oversells. **Alternative considered:** a `SELECT ... FOR UPDATE` then conditional update. Rejected as redundant; the `updateMany` with the `availableCount >= 1` predicate is already atomic and idiomatic Prisma.

### 5. Repository returns bare `ReservationModel`; no speculative `include?` parameter

Both write methods return `ReservationModel` with no `include` option. The `POST /reservations` response needs only scalar fields of the reservation (`id`, `eventId`, `userId`, `seatId`/`ticketTypeId`, `status`, `createdAt`), so there is no current consumer of relations. Adding an optional `include?` "for the future" would be speculative parameter anticipation. The service maps the model to the response.

**Alternative considered:** mirror `EventsRepository` which accepts `include?`. Rejected because `events` has an immediate consumer (`toEventDetailResponse` reads `event.seats`/`event.ticketTypes`); reservations does not. If a later response needs relations, `include` is added with a real consumer at that time.

### 6. `Seat.status` is neither consulted nor written (documented limitation)

`SeatStatus` exists in the schema but is not kept synchronized by any flow. This change deliberately does not read or write `Seat.status`; the single source of truth for "is this seat reserved" is the existence of a `Reservation` with that `seatId` (enforced by `@unique`). Consequently `Seat.status` stays `AVAILABLE` even after a reservation — a known limitation. In particular, the precondition check `seat.status === 'AVAILABLE'` is omitted because under this limitation it is always true and would be dead code that falsely implies the field is maintained. A code comment near the seat method documents this. This is an explicit exception to the repo's "no comments" convention.

### 7. `userId` from the JWT; `CLIENT` role only

The controller extracts `req.user.userId` from the authenticated principal and passes it to the service; the body never supplies `userId` (and `whitelist: true` would strip it anyway). `POST /reservations` is guarded by `JwtGuard` + `RolesGuard` with `@Roles(Role.CLIENT)` — only buyers reserve.

## Risks / Trade-offs

- **[TOCTOU between precondition read and write]** → Mitigated: the real concurrency guard (`@unique`/atomic decrement) catches the contender; the precondition read only converts "doesn't exist" and "wrong event" into 404/400. The window is small and harmless.
- **[Interactive `$transaction` with the `@prisma/adapter-pg` driver adapter]** → Accepted: interactive transactions are supported by the pg adapter; the project already uses `PrismaPg` in `prisma.service.ts`.
- **[`Seat.status` drifts from reality]** → Accepted as a known limitation and documented in code; single source of truth remains `Reservation.seatId @unique`. A future change that wants to surface seat status on the event detail endpoint must backfill and maintain it as a separate, consistent authority.
- **[No idempotency key for retries]** → Out of scope: a client retrying after a network blip may create a second reservation for a different seat/sector. Idempotency belongs to a later payment/checkout change.

## Open Questions

- The exact import path of `PrismaClientKnownRequestError` under Prisma 7's `prisma-client` generator (likely `../generated/prisma/client`, the same path `prisma.service.ts` uses for `PrismaClient`) is to be confirmed after `npx prisma generate`, since the generated client is gitignored. This does not change the approach, the specs, or the task breakdown — it only affects a single import line.
