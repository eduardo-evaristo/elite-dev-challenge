## Context

Stage 1 (committed) built the `/checkout` route with two form steps and an order summary, plus navigation from event detail pages with `reservationIds: []` as a stub. The backend already exposes `POST /reservations`, `POST /reservations/:id/pay`, and `GET /tickets/mine` — all spec'd and tested. The frontend follows a 3-layer pattern per feature (`api.ts` → `queries.ts` → `hooks/use-*.ts`) with an axios-based `httpClient` that sends credentials via httpOnly cookies. This change replaces the stubs with real API calls and adds the missing `/meus-ingressos` route. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Wire "Comprar ingressos" to create real PENDING reservations before navigating to `/checkout`.
- Wire "Finalizar compra" to pay each reservation and navigate to `/meus-ingressos` on success.
- Gate the buy button behind authentication with a login redirect that returns to the detail page.
- Add a minimal `/meus-ingressos` route that lists the user's tickets.
- Add shared domain types for reservation/payment responses.

**Non-Goals:**
- Backend changes (endpoints already exist and are spec'd).
- Cancelling orphan PENDING reservations (no backend endpoint — known limitation).
- Persisting seat selection across the login redirect round-trip (would require encoding selection in the URL — future work).
- Transmitting CPF, telefone, cardholder name, expiry, or CVV to the backend (no backend columns — these are UX-only).
- Client-side role gating for `CLIENT` (consistent with the rest of the app — the backend enforces roles).

## Decisions

### 1. Sequential reservation creation (not parallel)

Reservations for multiple seats are created one at a time with `for...of` + `break` on first error, not `Promise.all`.

**Rationale**: A 409 on seat 3 should stop the batch immediately rather than creating all remaining seats in parallel. Sequential creation minimizes orphan PENDINGs by failing fast. The latency cost (N sequential HTTP calls) is acceptable for typical selections of 1–6 seats.

**Alternative considered**: `Promise.all` for parallelism — rejected because it creates all reservations simultaneously, maximizing orphaned PENDINGs on partial failure and making error attribution harder.

### 2. Pay also sequential, stop on first DECLINED

Payment calls are sequential. On the first DECLINED response, the loop stops. Already-approved reservations keep their issued tickets (no rollback).

**Rationale**: The simulated provider approves/denies based on card-number parity, so all calls with the same card would get the same result — but a real gateway could approve some and decline others. Stopping on first decline gives the user a clear error point and avoids unnecessary calls. Already-issued tickets cannot be un-issued without a refund flow that doesn't exist.

**Alternative considered**: `Promise.all` — rejected for the same orphan/rollback reasons as reservations.

### 3. Reservation IDs carried via URL search params, not server-fetched

Checkout derives its order summary from `seatIds`/`ticketTypeId` + the event data from the route loader. `reservationIds` are passed through the URL search params and used only for the pay calls. There is no `GET /reservations/:id` endpoint to re-fetch them.

**Rationale**: The backend intentionally omits a reservation fetch endpoint. The URL already carries `eventId`, `seatIds`/`ticketTypeId`, and `price` from Stage 1 — adding `reservationIds` to the existing `checkoutSearchSchema` (already has the field) is the natural extension.

### 4. Shared types in `@elite-dev/shared`, not frontend-local

New types (`CreateReservationRequest`, `ReservationResponse`, `PayReservationRequest`, `PaymentResultResponse`) are added to `packages/shared/src/index.ts`.

**Rationale**: The shared package is the established location for cross-app domain types. It has no build step (raw TS via package `exports`), so adding interfaces is zero-cost. The backend's `TicketData` response shape (id, reservationId, userId, event, seat, ticketType, used, usedAt, createdAt, signature, qrContent) should be verified against `tickets.service.ts:toResponse` during implementation.

### 5. Auth toggle via `useGetMe()` in the selection components

`seat-selection.tsx` and `ticket-selection.tsx` call `useGetMe()` to check if the user is authenticated. If not, the button label changes and the onClick navigates to `/login` with a `redirect` search param.

**Rationale**: `useGetMe()` is already used across the app and backed by a TanStack Query. The login route (`login.tsx`) already handles the `redirect` param via `window.location.href`. No new auth infrastructure needed.

### 6. Tickets feature follows the established 3-layer pattern

New `features/tickets/` directory mirrors `features/events/`: `api.ts` (httpClient calls) → `queries.ts` (`queryOptions`) → `hooks/use-my-tickets.ts` (`useQuery`). Query key: `['tickets', 'mine']`.

**Rationale**: Consistency with the existing events and auth feature structure. The `GET /tickets/mine` endpoint returns a paginated shape `{ items, page, totalPages, totalResults }` — for the initial minimal route, a simple `useQuery` with page 1 is sufficient; infinite scroll can be added later.

### 7. `/meus-ingressos` route under `_authenticated`

The route lives at `src/routes/_authenticated/meus-ingressos.tsx`, inheriting the auth guard from `_authenticated.tsx` which redirects to `/login` if unauthenticated.

**Rationale**: The `_authenticated` layout route already guards `/checkout` and `/organizador/eventos/novo`. Placing the tickets route there reuses the same guard without additional code.

## Risks / Trade-offs

- **[Orphan PENDING reservations]** → Abandoned checkouts (user navigates away after reserve but before pay) and partial 409s leave PENDING reservations in the database with no cancel endpoint. *Mitigation*: No financial impact (no payment was made). Document as a known limitation. Future: add `DELETE /reservations/:id` or a TTL-based expiry.
- **[Selection lost on login redirect]** → The auth-gated flow redirects to login, then back to the detail page, but `useState` selection does not survive a full page reload. *Mitigation*: User re-selects seats and clicks again. Future: encode selection in the detail page URL to survive the round-trip.
- **[Partial payment failure]** → If 2 of 3 seats approve and the 3rd declines, the user has 2 tickets but sees an error. Retrying pays only the remaining reservation. *Mitigation*: The `/meus-ingressos` page shows all issued tickets, so the user can verify what they got. The error message is clear about the decline.
- **[UX-only fields not persisted]** → CPF, telefone, cardholder name, expiry, and CVV are collected but never sent. *Mitigation*: Frontend-only. When a real payment gateway (Asaas slot exists in `payments.module.ts`) is integrated, these fields will be transmitted.
- **[No client-side role gate]** → An `ORGANIZER` who clicks "Comprar ingressos" will get a 403 from the backend. *Mitigation*: Consistent with the rest of the app. The error is surfaced as an inline message.
