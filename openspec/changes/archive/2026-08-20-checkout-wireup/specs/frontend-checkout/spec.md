## Purpose

Lets an authenticated client reserve selected seats or ticket types, pay for those reservations with a card number, and view their issued tickets — the end-to-end purchase flow from event detail through checkout to the ticket list.

## ADDED Requirements

### Requirement: Reserve selected seats on buy click

When an authenticated client with one or more selected seats clicks "Comprar ingressos", the frontend SHALL create one reservation per selected seat by calling `POST /reservations` with `{ eventId, seatId }` for each. Reservations SHALL be created sequentially so that the first conflict stops the batch. On full success, the frontend SHALL navigate to `/checkout` carrying the event id, seat ids, total price, and the collected reservation ids. While reservations are being created, the button SHALL display "Reservando..." and be disabled.

#### Scenario: All seats reserved successfully
- **WHEN** an authenticated client with seats A1 and A2 selected clicks "Comprar ingressos"
- **THEN** the frontend creates a PENDING reservation for A1, then for A2, and navigates to `/checkout` with both reservation ids, the seat ids, the event id, and the total price

#### Scenario: One seat is taken mid-batch
- **WHEN** an authenticated client with seats A1 and A2 clicks "Comprar ingressos" and A2 was just reserved by another user
- **THEN** the frontend creates the reservation for A1 successfully, receives a 409 for A2, displays an inline error on the detail page indicating the seat is no longer available, and does not navigate to checkout

#### Scenario: Reserving button state
- **WHEN** reservations are being created
- **THEN** the buy button label is "Reservando..." and the button is disabled

### Requirement: Reserve a ticket type on buy click

When an authenticated client with a selected standing-sector ticket type clicks "Comprar ingressos", the frontend SHALL create a single reservation by calling `POST /reservations` with `{ eventId, ticketTypeId }`. On success, the frontend SHALL navigate to `/checkout` carrying the event id, ticket type id, price, and the reservation id. On error, the frontend SHALL display an inline error on the detail page and shall not navigate.

#### Scenario: Ticket type reserved successfully
- **WHEN** an authenticated client selects the "Pista Inteira" ticket type and clicks "Comprar ingressos"
- **THEN** the frontend creates one PENDING reservation and navigates to `/checkout` with the reservation id, ticket type id, event id, and price

#### Scenario: Sector sold out
- **WHEN** an authenticated client clicks "Comprar ingressos" for a ticket type whose availability is exhausted
- **THEN** the frontend receives a 409, displays an inline error on the detail page indicating the sector is sold out, and does not navigate

### Requirement: Auth-gated buy button

When the current user is not authenticated, the buy button SHALL display "Faça login para comprar" instead of "Comprar ingressos". Clicking it SHALL redirect to `/login` with a `redirect` search parameter set to the current page URL. After successful login, the user SHALL be returned to the event detail page. The seat or ticket type selection in memory SHALL NOT survive the redirect round-trip; the user must re-select.

#### Scenario: Unauthenticated buy button
- **WHEN** an unauthenticated visitor views an event detail page with seat selection
- **THEN** the buy button label is "Faça login para comprar" and clicking it navigates to `/login?redirect=<currentUrl>`

#### Scenario: Return after login
- **WHEN** the user completes login after being redirected from the buy button
- **THEN** the user is returned to the event detail page they were on, with no seats pre-selected

### Requirement: Pay pending reservations

On the checkout Step 2, "Finalizar compra" SHALL pay each reservation sequentially by calling `POST /reservations/:id/pay` with `{ cardNumber }` only. No other form fields (cardholder name, expiry, CVV, CPF, telefone) SHALL be transmitted. While payments are being processed, the button SHALL display "Processando..." and be disabled.

#### Scenario: Single reservation payment (ticket type mode)
- **WHEN** a client with one reservation clicks "Finalizar compra" with card number ending in an even digit
- **THEN** the frontend pays that reservation, receives an approved ticket, and navigates to `/meus-ingressos`

#### Scenario: Multi-seat sequential payment all approved
- **WHEN** a client with three reservations clicks "Finalizar compra" with a card number ending in an even digit
- **THEN** the frontend pays all three sequentially, all approve, and the frontend navigates to `/meus-ingressos`

#### Scenario: Processing button state
- **WHEN** payments are being processed
- **THEN** the "Finalizar compra" button label is "Processando..." and the button is disabled

### Requirement: Declined payment preserves form and stays on step 2

When any payment in the sequence is declined, the frontend SHALL display an inline error "Pagamento recusado" on Step 2, SHALL keep the form field values intact, and SHALL NOT navigate away. Reservations already approved earlier in the sequence SHALL remain confirmed with their tickets issued — the frontend SHALL NOT attempt to roll them back. The user may retry payment with a different card number.

#### Scenario: Declined on first reservation
- **WHEN** a client with two reservations clicks "Finalizar compra" with a card number ending in an odd digit
- **THEN** the first payment is declined, the frontend displays "Pagamento recusado" inline, the form values are preserved, and the frontend does not navigate

#### Scenario: Declined after some approved
- **WHEN** a client with three reservations pays and the first two approve but the third is declined
- **THEN** the first two reservations are confirmed with tickets issued, the frontend displays "Pagamento recusado" inline, stays on Step 2, and the user can retry the remaining reservation

#### Scenario: Retry after decline
- **WHEN** a client whose payment was declined changes the card number to one ending in an even digit and clicks "Finalizar compra" again
- **THEN** the remaining unpaid reservation is paid and, on approval, the frontend navigates to `/meus-ingressos`

### Requirement: Buyer data pre-filled from authenticated user

The checkout Step 1 form SHALL pre-fill the name and email fields from the authenticated user's profile. The CPF and telefone fields SHALL be empty. These fields SHALL be collected for UX but SHALL NOT be transmitted to the backend at any point in the flow.

#### Scenario: Pre-filled buyer data
- **WHEN** an authenticated client navigates to checkout Step 1
- **THEN** the name field contains the user's display name and the email field contains the user's email, while CPF and telefone are empty

### Requirement: Checkout order summary reflects real selection

The checkout order summary SHALL derive its content from the URL search parameters (`seatIds` or `ticketTypeId`) and the event data fetched by the route loader — not from mockup data. When multiple seats are selected, the summary SHALL list each seat. When a ticket type is selected, the summary SHALL show the ticket type name and quantity.

#### Scenario: Summary with multiple seats
- **WHEN** checkout loads with `mode=seat` and `seatIds=['A1','A2']`
- **THEN** the order summary lists both seats with the event's ticket price per seat and the total for two

#### Scenario: Summary with ticket type
- **WHEN** checkout loads with `mode=ticket` and `ticketTypeId=' pista-id'`
- **THEN** the order summary shows the ticket type name and the single reservation price

### Requirement: My tickets list route

The frontend SHALL provide a `/meus-ingressos` route accessible only to authenticated users. The route SHALL fetch the user's tickets via `GET /tickets/mine` and display them as a list. Each ticket SHALL show the event name, date, location, the seat (row + number) or ticket type sector, and a QR content string. When the user has no tickets, the route SHALL display an empty state.

#### Scenario: Authenticated client views their tickets
- **WHEN** an authenticated client navigates to `/meus-ingressos`
- **THEN** the page displays a list of their tickets, each showing event name, date, location, seat or sector, and QR content

#### Scenario: No tickets
- **WHEN** an authenticated client with zero tickets navigates to `/meus-ingressos`
- **THEN** the page displays an empty state indicating no tickets

#### Scenario: Unauthenticated access redirected
- **WHEN** an unauthenticated visitor navigates to `/meus-ingressos`
- **THEN** the auth guard redirects them to `/login`
