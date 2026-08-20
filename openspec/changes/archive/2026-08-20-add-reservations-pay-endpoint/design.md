## Context

The `ReservationsModule` is currently self-contained: it creates `PENDING` reservations (seat-based or sector-based) but has no payment flow. Two sibling modules are already built and exported:

- **`PaymentsModule`** — exposes a `PAYMENT_PROVIDER` token (Symbol) via `useFactory` + `ConfigService`. The `SimulatedPaymentProvider` resolves synchronously: even last digit → approved, odd → declined, never pending.
- **`TicketsModule`** — exports `TicketsService`, whose `issueForReservation(reservationId)` creates a `Ticket` with an HMAC-SHA256 signature and returns the ticket response (with `signature` + `qrContent`). It does not mutate `Reservation.status`.

The `Reservation` model already has `status` (`ReservationStatus`, default `PENDING`) and `paymentStatus` (`PaymentStatus?`, nullable — currently never written). The `PaymentStatus` enum has `APPROVED` and `DECLINED` only (no `PENDING`).

The `ReservationsModule` needs to import both modules and wire them into a `pay` method on the service.

## Goals / Non-Goals

**Goals:**
- Wire `PaymentsModule` and `TicketsModule` into `ReservationsModule` via NestJS DI.
- Implement `POST /reservations/:id/pay` that charges the provider, confirms the reservation on approval, and delegates ticket issuance.
- Ensure the charge amount is always derived from persisted data, never from the request body.

**Non-Goals:**
- Asynchronous payment handling (PENDING outcome + webhook). Deferred to the Asaas integration — requires a schema migration (`externalId` column, `PENDING` enum value) and a webhook endpoint.
- Atomicity between reservation confirmation and ticket issuance. The two operations use separate `PrismaService` instances (one per module); a cross-module `$transaction` is not feasible without architectural changes.
- Concurrency protection against simultaneous pay requests for the same reservation. The simulated provider is synchronous; double-pay is mitigated by `Ticket.reservationId @unique` (second issuance fails with P2002). Full protection is deferred to the Asaas integration.
- Frontend checkout screen. The endpoint is ready for the frontend to call, but no frontend work is in scope.

## Decisions

### 1. Amount derivation: `ticketType.price` for sector reservations, `event.ticketTypes[0].price` for seat reservations

For sector-based reservations (`ticketTypeId` is set), the amount comes directly from the reservation's linked `TicketType.price`. For seat-based reservations (`seatId` is set, `ticketTypeId` is null), the `Seat` model has no price field and the `Event` model has no price field. The organizer wizard always creates exactly one `TicketType` named "Geral" for seated events, and the movie detail page (`filmes/:externalId`) reads `ticketTypes[0].price` as the per-seat price. The pay endpoint follows the same source: `reservation.event.ticketTypes[0].price`.

**Alternative considered:** Adding a `price` field to `Event` or `Seat` (schema migration). Rejected — would duplicate data already on `TicketType` and require a migration for no behavioral benefit.

**Alternative considered:** Storing `amount` on `Reservation` at creation time (price snapshot). Rejected for this stage — would require a migration and changes to the creation flow; deferred to a future hardening pass if price-mutation-during-pending becomes a real concern.

### 2. No `$transaction` between confirm and issueForReservation

The `ReservationsRepository` and `TicketsRepository` each have their own `PrismaService` instance (not `@Global`). A `$transaction` would require passing the Prisma client from one module's repository to another's, breaking module encapsulation. Instead: confirm the reservation first (`status=CONFIRMED`, `paymentStatus=APPROVED`), then call `issueForReservation`. If issuance fails, the reservation is `CONFIRMED` without a ticket — a known inconsistency.

**Mitigation:** `Ticket.reservationId` is `@unique`, so a retry of `issueForReservation` is safe (it will either succeed if no ticket exists yet, or fail with P2002 if one does). A compensating action (revert `CONFIRMED` → `PENDING` on catch) could be added later.

**Alternative considered:** Making `PrismaService` `@Global()` and sharing one instance. Rejected — larger architectural change affecting all modules, not justified for this stage.

### 3. PENDING outcome throws InternalServerErrorException

The `PaymentResult` type includes `{ status: 'PENDING'; externalId: string }`, but the simulated provider never returns it. The `PaymentStatus` enum has no `PENDING` value, and there is no schema column to persist `externalId`. Implementing the branch now would be dead code. The `if/else` covers `APPROVED` and `DECLINED`; the fall-through throws `InternalServerErrorException`.

**Alternative considered:** Returning a 200 with `{ status: 'PENDING' }`. Rejected — would imply the system handles pending payments when it does not, misleading the frontend.

### 4. Ownership check returns 404, not 403

If `reservation.userId !== userId`, the endpoint returns `NotFoundException`. This matches the pattern in `TicketsService.findMineOne` (two `NotFoundException`s — one for not-found, one for not-owned) and avoids confirming that another user's reservation exists.

### 5. Declined payment returns HTTP 200 with a status body

A declined payment is a business outcome, not a server error. Returning 200 with `{ status: 'DECLINED', message: 'Pagamento recusado' }` lets the frontend's TanStack Query treat it as a successful response and handle the `DECLINED` status in the UI (message + retry button), rather than landing in an error handler.

### 6. `customer` populated from the persisted `User`, not the body

The `ChargeInput.customer: { name, email }` is populated from `reservation.user` (loaded via `include`). The simulated provider ignores `customer`, but the Asaas provider will require it. Filling it now avoids a contract change later.

## Risks / Trade-offs

- **[Non-atomic confirm + issue]** If `issueForReservation` fails after `confirm`, the reservation is `CONFIRMED` with no ticket. → Mitigation: retry is safe via `Ticket.reservationId @unique`; a compensating revert could be added. Low risk with the simulated provider (synchronous, no network failures).
- **[Double-pay concurrency]** Two simultaneous `pay` requests for the same `PENDING` reservation both pass the status check, both charge, and both call `issueForReservation`. The second fails with P2002 on `Ticket.reservationId @unique`. → Mitigation: acceptable for the simulated provider; the Asaas integration will use `reservationId` for idempotency at the gateway level.
- **[Price mutation during pending]** A reservation is created `PENDING`; the organizer could theoretically change the `TicketType.price` before the client pays. The pay endpoint reads the current price, not the price at reservation time. → Mitigation: accepted for now; a price snapshot on `Reservation` would address this in a future pass.
- **[No PENDING handling]** If the Asaas provider is plugged before the PENDING branch is implemented, pending charges will return 500. → Mitigation: the Asaas integration task explicitly includes the schema migration and webhook handler.
