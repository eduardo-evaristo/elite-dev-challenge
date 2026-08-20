## 1. Shared domain types

- [x] 1.1 Add `CreateReservationRequest` interface to `packages/shared/src/index.ts` (`eventId: string`, `seatId?: string`, `ticketTypeId?: string`)
- [x] 1.2 Add `ReservationResponse` interface (`id`, `eventId`, `userId`, `seatId | null`, `ticketTypeId | null`, `status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'`, `createdAt: string`)
- [x] 1.3 Add `PayReservationRequest` interface (`cardNumber: string`)
- [x] 1.4 Add `PaymentResultResponse` type — union of approved Ticket shape (verify fields against `apps/backend/src/tickets/tickets.service.ts` `toResponse` method: `id`, `reservationId`, `userId`, `event`, `seat`, `ticketType`, `used`, `usedAt`, `createdAt`, `signature`, `qrContent`) and declined shape (`{ status: 'DECLINED'; message: string }`)

## 2. Checkout API layer

- [x] 2.1 Create `apps/frontend/src/features/checkout/api.ts` with `createReservation(payload)` — `httpClient.post('/reservations', payload)` returning `ReservationResponse`
- [x] 2.2 Add `payReservation(id, payload)` to `api.ts` — `httpClient.post(\`/reservations/${id}/pay\`, payload)` returning `PaymentResultResponse`

## 3. Checkout hooks

- [x] 3.1 Create `apps/frontend/src/features/checkout/hooks/use-create-reservation.ts` — `useMutation` wrapping `createReservation`
- [x] 3.2 Create `apps/frontend/src/features/checkout/hooks/use-pay-reservation.ts` — `useMutation` wrapping `payReservation`, with `onSuccess` invalidating `['tickets']` and `['me']` query keys

## 4. Wire seat-selection buy button

- [x] 4.1 Add `useGetMe()` and `useCreateReservation()` to `seat-selection.tsx`
- [x] 4.2 Implement auth toggle: no user → button label "Faça login para comprar", onClick navigates to `/login` with `redirect: window.location.href`
- [x] 4.3 Implement reserve-on-click: user present → button label "Comprar ingressos", onClick creates reservations sequentially per `selectedSeatId` with `for...of`, collecting `id`s; loading state → label "Reservando..." + disabled
- [x] 4.4 On all-success → `navigate({ to: '/checkout', search: { eventId, mode: 'seat', seatIds, price, reservationIds } })`
- [x] 4.5 On 409 error → display inline error message on the detail page, do not navigate

## 5. Wire ticket-selection buy button

- [x] 5.1 Add `useGetMe()` and `useCreateReservation()` to `ticket-selection.tsx`
- [x] 5.2 Implement auth toggle: no user → "Faça login para comprar" → login redirect (same as seat-selection)
- [x] 5.3 Implement reserve-on-click: user present + selected → `createReservation({ eventId, ticketTypeId })`, loading state → "Reservando..." + disabled
- [x] 5.4 On success → `navigate({ to: '/checkout', search: { eventId, mode: 'ticket', ticketTypeId, price, reservationIds: [res.id] } })`
- [x] 5.5 On error → display inline error message, do not navigate

## 6. Wire payment-form "Finalizar compra"

- [x] 6.1 Add `usePayReservation()` and `useNavigate()` to `payment-form.tsx`
- [x] 6.2 Implement sequential pay: for each `reservationId` in `search.reservationIds`, call `payReservation({ id, cardNumber })` — extract only `cardNumber` from form, ignore other fields
- [x] 6.3 On all-approved → `navigate({ to: '/meus-ingressos' })`
- [x] 6.4 On first DECLINED → stop loop, display inline "Pagamento recusado", keep form values, stay on Step 2
- [x] 6.5 Loading state → button label "Processando..." + disabled

## 7. Wire buyer-data-form defaults

- [x] 7.1 Update `buyer-data-form.tsx` `defaultValues`: `name` from `${user.name} ${user.lastName ?? ''}`.trim()`, `email` from `user.email`, cpf/telefone empty

## 8. Tickets feature (3-layer)

- [x] 8.1 Create `apps/frontend/src/features/tickets/api.ts` with `getMyTickets(params?)` — `httpClient.get('/tickets/mine')` returning paginated `{ items, page, totalPages, totalResults }`
- [x] 8.2 Create `apps/frontend/src/features/tickets/queries.ts` with `myTicketsOptions()` — `queryOptions` with query key `['tickets', 'mine']`
- [x] 8.3 Create `apps/frontend/src/features/tickets/hooks/use-my-tickets.ts` — `useQuery(myTicketsOptions)`

## 9. /meus-ingressos route

- [x] 9.1 Create `apps/frontend/src/routes/_authenticated/meus-ingressos.tsx` — route uses `useMyTickets()` to fetch and display ticket list
- [x] 9.2 Render each ticket with event name, date, location, seat (row + number) or ticket type sector, and qrContent
- [x] 9.3 Render empty state when `items` is empty
- [x] 9.4 Include navbar + footer for layout consistency

## 10. Verification

- [x] 10.1 Run `npm run lint` in `apps/frontend` — must pass clean
- [x] 10.2 Run `npm run build` in `apps/frontend` (`tsc -b && vite build`) — must pass clean
