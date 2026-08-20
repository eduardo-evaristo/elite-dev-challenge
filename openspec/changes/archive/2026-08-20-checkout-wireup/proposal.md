## Why

The checkout UI (Stage 1) is committed but inert — "Comprar ingressos" navigates to `/checkout` with `reservationIds: []` and "Finalizar compra" is a `console.log` stub. The backend already exposes `POST /reservations` (create PENDING) and `POST /reservations/:id/pay` (charge + issue ticket), but the frontend never calls them. This change wires those endpoints into the existing UI so a logged-in client can complete a real purchase end-to-end.

## What Changes

- **Reserve on click**: "Comprar ingressos" on the event detail page calls `POST /reservations` for each selected seat (or once for a standing-sector ticket type), collecting real `reservationIds`, then navigates to `/checkout` with them.
- **Auth toggle on the buy button**: when the user is not logged in, the button label changes to "Faça login para comprar" and redirects to `/login?redirect=<currentPath>`. The existing login route already handles the redirect param.
- **Pay on "Finalizar compra"**: the Step 2 button calls `POST /reservations/:id/pay` sequentially for each `reservationId`, sending only `cardNumber` (cpf/telefone/expiry/cvv/name are collected but not transmitted — the backend has no columns for them).
- **Approved flow**: on all-approved, navigate to a new `/meus-ingressos` route that lists the user's tickets via `GET /tickets/mine`.
- **Declined flow**: on any declined payment, show inline "Pagamento recusado" on Step 2, keep the form values, and leave already-approved reservations confirmed (tickets already issued — no rollback).
- **Conflict (409) handling**: if a seat is taken between selection and click, show an inline error on the detail page and do not navigate. Already-created PENDINGs from earlier in the batch remain orphaned (known limitation — backend has no cancel endpoint).
- **Shared types**: add `CreateReservationRequest`, `ReservationResponse`, `PayReservationRequest`, `PaymentResultResponse` to `@elite-dev/shared`.
- **New `/meus-ingressos` route**: authenticated route consuming `GET /tickets/mine` (paginated) with a minimal ticket list rendering.

## Capabilities

### New Capabilities

- `frontend-checkout`: Frontend checkout wire-up — reserve-on-click, payment execution, auth-gated buy button, and post-payment ticket list route. Covers the externally observable behavior of the purchase flow from event detail through `/checkout` to `/meus-ingressos`.

### Modified Capabilities

(none — backend reservations/payments/tickets specs are unchanged; this change only consumes existing endpoints from the frontend)

## Impact

- **`packages/shared`**: new domain types exported from `src/index.ts` (no build step — raw TS consumed via package exports).
- **`apps/frontend` (new files)**: `features/checkout/api.ts`, `features/checkout/hooks/use-create-reservation.ts`, `features/checkout/hooks/use-pay-reservation.ts`, `features/tickets/api.ts`, `features/tickets/queries.ts`, `features/tickets/hooks/use-my-tickets.ts`, `routes/_authenticated/meus-ingressos.tsx`.
- **`apps/frontend` (modified)**: `seat-selection.tsx` and `ticket-selection.tsx` (auth toggle + reserve-on-click + navigate with real IDs), `payment-form.tsx` (pay wire-up + post-pay navigation), `buyer-data-form.tsx` (defaultValues from `useGetMe`).
- **Backend**: no changes. Endpoints `POST /reservations`, `POST /reservations/:id/pay`, `GET /tickets/mine` already exist and are spec'd.
- **Known limitations**: orphan PENDING reservations on abandoned/failed checkouts (no cancel endpoint); seat selection lost on login redirect round-trip (useState does not survive full page reload); collected form fields (cpf, telefone, card expiry/cvv/name) are UX-only and never persisted.
