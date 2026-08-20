## Why

The `GATE` role exists in the schema and the `POST /tickets/validate` endpoint already enforces it, but there is no UI for gate operators and the validate endpoint returns a sparse response that doesn't match the Pencil designs (no holder name, no ticket info, no used-at timestamp). Gate operators need a mobile-first portaria screen to scan QR codes or type a manual code, see contextual validation results, and re-scan quickly. The 64-char HMAC signature is impractical to type manually, so a separate 8-char manual entry code is needed — but it must still be cryptographically verified, not skipped.

## What Changes

- **New `shortId` and `manualCode` fields on `Ticket`**: 8-char unambiguous-alphabet codes generated at issuance. `shortId` (@unique) is used for direct lookup; `manualCode` is verified via `timingSafeEqual` (not recomputable, independent random secret).
- **Manual entry path in `POST /tickets/validate`**: accepts `manualEntryCode` (`shortId-manualCode` combined string) as a mutually exclusive alternative to `signature`. Same 4-state machine, different proof method. `publicId` becomes optional (required only with `signature`).
- **Enriched validate response**: `VALID` returns `holderName` + `ticketLabel`; `ALREADY_USED` returns `holderName` + `usedAt`; `WRONG_EVENT` returns `ticketEventName`. `INVALID` stays minimal.
- **Rate limiting on validate**: `@nestjs/throttler` at 10 req/min per IP — the 8-char manualCode (2^40 entropy) requires throttling to prevent brute force.
- **`shortId`/`manualCode` exposure**: returned only on authenticated owner endpoints (`GET /tickets/mine`, `GET /tickets/mine/:publicId`), never on the public share view.
- **`ExactlyOneOf` validator moved to `src/common/validators/`**: reused by both `CreateReservationDto` and `ValidateTicketDto`.
- **Date filter on `GET /events`**: optional `date` param (`'today'` or ISO date) to list events happening on a given day. Used by the gate events list.
- **Gate feature module (frontend)**: `src/features/gate/` with API layer, queries, hooks, and components (gate header, event cards, QR scanner via `html5-qrcode`, manual entry, validation result overlay).
- **Gate routes**: `/portaria` (today's events list) and `/portaria/$eventId/validar` (scan + result), both guarded to `GATE`/`ADMIN` roles.
- **GATE role confinement**: GATE users redirect to `/portaria` from home and from any non-`/portaria*` authenticated route.
- **Ticket detail card shows manual code**: `shortId-manualCode` displayed below the QR code in owner mode only.
- **Navbar defensive handling**: `GATE` role gets empty links list.
- **`html5-qrcode` dependency**: installed for camera QR scanning (library provides ready UI, no custom viewfinder needed).
- **Shared types**: `ValidateTicketRequest`, `ValidateTicketResponse` added to `@elite-dev/shared`; `PaymentApprovedResponse` gains `shortId` + `manualCode`; `PublicTicketResponse` omits them.

## Capabilities

### New Capabilities
- `gate`: Gate operator portaria UI — event list for today, QR camera scanner, manual code entry, validation result overlay with 4 states, GATE role route confinement

### Modified Capabilities
- `tickets`: Validate endpoint gains manual entry code path (mutually exclusive with signature), enriched response with contextual data, rate limiting, and new `shortId`/`manualCode` fields on ticket issuance and owner endpoints

## Impact

- **Backend**: `prisma/schema.prisma` (new columns + migration), `TicketsService` (generateCode, validate branch, enriched response, toResponse), `TicketsRepository` (findByShortId), `ValidateTicketDto` (manualEntryCode, ExactlyOneOf), `TicketsController` (ThrottlerGuard), `AppModule` (ThrottlerModule), `EventsService` + `QueryEventsDto` (date filter), `ExactlyOneOf` moved to `src/common/validators/`, `CreateReservationDto` import updated
- **Shared package**: New types, updated `PaymentApprovedResponse` and `PublicTicketResponse`
- **Frontend**: New `features/gate/` module (5 components, 2 hooks, api, queries), 2 new routes under `_authenticated/`, modified `index.tsx` + `_authenticated.tsx` (guards), `navbar.tsx` (defensive), `ticket-detail-card.tsx` (manual code display)
- **Dependencies**: `@nestjs/throttler` (backend), `html5-qrcode` (frontend)
- **Tests**: `tickets.service.spec.ts` updated for new response shape + 4 new test cases (manual entry path)
