## Why

Reservations are created in `PENDING` state but have no way to be paid. The `PaymentsModule` (provider contract + simulated implementation) and `TicketsModule` (ticket issuance via `issueForReservation`) both exist and are exported, but neither is wired into the reservation flow. This change connects them: a `POST /reservations/:id/pay` endpoint that charges the payment provider, confirms the reservation on approval, and delegates ticket issuance — closing the loop from reservation to issued ticket.

## What Changes

- Add `POST /reservations/:id/pay` endpoint, authenticated via JWT with role `CLIENT`.
- Add `PayReservationDto` accepting only `cardNumber` — the charge `amount` is always recalculated server-side from persisted `TicketType.price`, never accepted from the request body.
- Add `ReservationsService.pay(reservationId, userId, cardNumber)` that: loads the reservation with relations (ticketType, event.ticketTypes, user), validates ownership + `PENDING` status, computes the amount, calls the injected `PaymentProvider.charge(...)`, and dispatches by result.
- On `APPROVED`: set `Reservation.status` to `CONFIRMED` and `paymentStatus` to `APPROVED`, then delegate to `TicketsService.issueForReservation(reservationId)` — the HMAC/signature logic stays in the `TicketsModule`.
- On `DECLINED`: set `paymentStatus` to `DECLINED`, keep `status` as `PENDING` (preserves the seat/stock hold).
- On `PENDING`: throw `InternalServerErrorException` — this branch is intentionally unimplemented (no schema column for `externalId` yet; only needed when the Asaas provider is plugged).
- `ReservationsModule` imports `TicketsModule` and `PaymentsModule`; injects `TicketsService` and `@Inject(PAYMENT_PROVIDER) PaymentProvider`.
- Add `ReservationsRepository` methods: `findByIdWithRelations`, `confirm`, `markDeclined`.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `reservations`: Adds the payment/confirmation requirement — the existing spec covers reservation creation only; this change introduces the requirement that a `PENDING` reservation can be paid, confirmed, or declined, and that ticket issuance is delegated on approval.

## Impact

- **Code**: `apps/backend/src/reservations/` — module (imports), controller (new endpoint), service (new deps + `pay` method), repository (3 new methods), new DTO file, new spec file.
- **Dependencies**: `ReservationsModule` gains runtime dependencies on `TicketsModule` and `PaymentsModule` (both already registered in `app.module.ts`).
- **APIs**: New `POST /reservations/:id/pay` endpoint. No changes to existing endpoints.
- **Schema**: No migration needed — `Reservation.paymentStatus` and `PaymentStatus` enum already exist; `paymentStatus` transitions from never-written to actively populated.
- **Frontend**: No frontend changes in this change. The pay endpoint is ready for the frontend checkout screen to call.
