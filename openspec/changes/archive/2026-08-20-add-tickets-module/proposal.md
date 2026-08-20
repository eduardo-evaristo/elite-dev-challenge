## Why

The `Ticket` model already exists in the Prisma schema (`schema.prisma:186-201`) but no code populates it. Reservations today only ever reach `PENDING`; there is no path from an approved payment to an issued, verifiable ticket, and no way for a client to see their tickets or for a gate to validate entry. This change builds the standalone `TicketsModule` — issuance, ownership-scoped reads, a public share view, and gate validation — so the ticket lifecycle exists before the payment-confirm wiring (next step) attaches to it.

## What Changes

- Add `TicketsModule` (backend) following the repo's repository/service/controller layering: `tickets.repository.ts`, `tickets.service.ts`, `tickets.controller.ts`, `tickets.module.ts`, plus DTOs.
- Add `TicketsService.issueForReservation(reservationId)` — a non-HTTP method that creates a `Ticket` with a server-generated UUID `id` (which doubles as the public id; no duplicated field) and a `signature` computed as `HMAC-SHA256("${ticketId}:${eventId}", TICKET_SECRET)` via Node `crypto`. This is the seam the `ReservationsModule` will call when a payment is approved (next step).
- Add `GET /tickets/mine` — authenticated (`CLIENT`), lists the caller's tickets with the associated event (join `ticket → reservation → event`), each item including a `qrContent` string.
- Add `GET /tickets/mine/:publicId` — authenticated (`CLIENT`), returns a single ticket with `qrContent`, but only to its owner; a `publicId` that exists but belongs to another user returns 404 (does not reveal existence).
- Add `GET /tickets/:publicId` — public (no auth), returns ticket metadata + a `used` boolean, but never the `signature` or `qrContent` (so a leaked share link cannot be used to burn someone else's ticket at the gate).
- Add `POST /tickets/validate` — authenticated (`GATE`/`ADMIN`), receives `{ publicId, signature, expectedEventId? }` and returns one of four states: `VALID`, `INVALID`, `ALREADY_USED`, `WRONG_EVENT`. On `VALID`, sets `usedAt` atomically in the same request.
- Define the QR payload format as versioned JSON `{"v":1,"id":"<uuid>","sig":"<hex>"}` owned by the backend; the frontend renders the `qrContent` string as an image and parses the scanned payload before calling `/validate`.
- Add `TICKET_SECRET` to `.env.example`/`.env`, consumed via `ConfigService.getOrThrow` (crash-fast, mirroring `JWT_SECRET`).
- Register `TicketsModule` in `app.module.ts`; export `TicketsService` so `ReservationsModule` can import and call it in the next step.

Out of scope (deferred to a follow-up change): the `POST /reservations/:id/pay` (or confirm) endpoint that wires `PaymentsModule` + `TicketsService.issueForReservation` together inside a transaction, transitions `Reservation.status` to `CONFIRMED`, and sets `paymentStatus = APPROVED`. No migration is needed here — the `Ticket` table already exists.

## Capabilities

### New Capabilities
- `tickets`: Issuance of signed tickets tied to a confirmed reservation, ownership-scoped reads for the holder (with QR content), a public metadata-only share view, and gate-side validation with a four-state result and atomic single-winner use-marking.

### Modified Capabilities
<!-- None. This change does not alter the requirements of any existing capability.
     The reservations → payment → ticket-issuance wiring is explicitly deferred to
     a follow-up change; reservations behavior is unchanged in this change. -->

## Impact

- **New code**: `apps/backend/src/tickets/` (module, controller, service, repository, repository spec, two DTOs).
- **Modified files**: `apps/backend/.env.example` and `.env` (add `TICKET_SECRET`), `apps/backend/src/app.module.ts` (register `TicketsModule`).
- **New HTTP routes**: `GET /tickets/mine`, `GET /tickets/mine/:publicId`, `GET /tickets/:publicId`, `POST /tickets/validate`.
- **New env var**: `TICKET_SECRET` (required, no default — boot fails fast if absent).
- **Dependencies**: none new; uses Node built-in `crypto` for HMAC and `timingSafeEqual`. No `qrcode` library — the backend returns the `qrContent` string and the frontend renders the image.
- **No schema/migration changes**: the `Ticket` model already exists; this change only starts writing to it.
- **No changes** to `ReservationsModule`, `PaymentsModule`, `EventsModule`, `AuthModule`, or `UsersModule` in this step.
