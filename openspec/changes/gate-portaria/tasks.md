## 1. Backend — Shared validators & dependencies

- [x] 1.1 Move `src/reservations/dto/exactly-one-of.validator.ts` to `src/common/validators/exactly-one-of.validator.ts`
- [x] 1.2 Update import in `src/reservations/dto/create-reservation.dto.ts` to `src/common/validators/exactly-one-of.validator`
- [x] 1.3 Install `@nestjs/throttler` in `apps/backend`
- [x] 1.4 Register `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` in `src/app.module.ts`

## 2. Backend — Prisma schema & migration

- [x] 2.1 Add `shortId String @unique` and `manualCode String` to `Ticket` model in `prisma/schema.prisma`
- [x] 2.2 Run `npx prisma migrate dev --name add-ticket-short-id-and-manual-code`
- [x] 2.3 Run `npx prisma generate` to update generated client types

## 3. Backend — Shared types

- [x] 3.1 Add `ValidateTicketRequest` and `ValidateTicketResponse` types to `packages/shared/src/index.ts`
- [x] 3.2 Add `shortId: string` and `manualCode: string` to `PaymentApprovedResponse` in `packages/shared/src/index.ts`
- [x] 3.3 Add `'shortId' | 'manualCode'` to the `Omit` in `PublicTicketResponse` in `packages/shared/src/index.ts`

## 4. Backend — Tickets module

- [x] 4.1 Update `ValidateTicketDto`: make `publicId` optional, make `signature` optional with `@ExactlyOneOf(['signature', 'manualEntryCode'])`, add `manualEntryCode?: string` optional field
- [x] 4.2 Add `findByShortId(shortId, include)` method to `TicketsRepository`
- [x] 4.3 Add `UNAMBIGUOUS_ALPHABET` constant and `generateCode(length)` private method to `TicketsService`
- [x] 4.4 Add `safeEqualStr(a, b)` private method to `TicketsService` (timing-safe string comparison)
- [x] 4.5 Update `issueForReservation` to generate and persist `shortId` and `manualCode` alongside `signature`
- [x] 4.6 Update `toResponse` to include `shortId` and `manualCode` when `withQr: true`
- [x] 4.7 Define `VALIDATE_INCLUDE` (extends TICKET_INCLUDE with `user: { select: { name, lastName } }`) and define `ValidateTicketResponse` type
- [x] 4.8 Update `validate()` method: add manual entry branch (split `manualEntryCode` on `-`, lookup by `shortId`, verify `manualCode` via `safeEqualStr`), enrich response with `holderName`/`ticketLabel`/`usedAt`/`ticketEventName`
- [x] 4.9 Add `ThrottlerGuard` to `@UseGuards` on `POST /tickets/validate` in `TicketsController` with `@Throttle({ default: { limit: 10, ttl: 60000 } })`

## 5. Backend — Events date filter

- [x] 5.1 Add optional `date?: string` field to `QueryEventsDto` with `@IsOptional() @IsString()`
- [x] 5.2 Update `EventsService.findAll` to compute date range filter when `query.date` is `'today'` or an ISO date string

## 6. Backend — Tests

- [x] 6.1 Update `buildTicket` mock in `tickets.service.spec.ts` to include `shortId`, `manualCode`, and `user` fields
- [x] 6.2 Update existing validate test expectations for enriched response shape (VALID with holderName/ticketLabel, ALREADY_USED with holderName/usedAt, WRONG_EVENT with ticketEventName)
- [x] 6.3 Add test: manual entry valid path (shortId lookup + manualCode match → VALID)
- [x] 6.4 Add test: manual entry code mismatch (shortId found but manualCode wrong → INVALID)
- [x] 6.5 Add test: manual entry malformed code (no hyphen → INVALID without DB lookup)
- [x] 6.6 Add test: issueForReservation generates 8-char shortId and manualCode from unambiguous alphabet

## 7. Backend — Verification

- [x] 7.1 Run `npm run lint` in `apps/backend`
- [x] 7.2 Run `npm test` in `apps/backend`
- [x] 7.3 Run `npm run build` in `apps/backend`

## 8. Frontend — Dependencies & gate feature module

- [x] 8.1 Install `html5-qrcode` in `apps/frontend`
- [x] 8.2 Create `src/features/gate/api.ts` with `getTodayEvents()` and `validateTicket()`
- [x] 8.3 Create `src/features/gate/queries.ts` with `todayEventsOptions`
- [x] 8.4 Create `src/features/gate/hooks/use-today-events.ts`
- [x] 8.5 Create `src/features/gate/hooks/use-validate-ticket.ts`

## 9. Frontend — Gate components

- [x] 9.1 Create `src/features/gate/components/gate-header.tsx` (logo + shield-check + "Portaria" badge)
- [x] 9.2 Create `src/features/gate/components/gate-event-card.tsx` (event card with name + time/location meta)
- [x] 9.3 Create `src/features/gate/components/qr-scanner.tsx` (Html5QrcodeScanner wrapper with useEffect lifecycle)
- [x] 9.4 Create `src/features/gate/components/manual-entry.tsx` (input + "Validar" button)
- [x] 9.5 Create `src/features/gate/components/validation-result.tsx` (full-screen overlay with 4 states + "Validar próximo")

## 10. Frontend — Gate routes

- [x] 10.1 Create `src/routes/_authenticated/portaria.tsx` (events list with GATE/ADMIN guard + loader + empty state)
- [x] 10.2 Create `src/routes/_authenticated/portaria.$eventId.validar.tsx` (scan + result state toggle + GATE/ADMIN guard + event detail loader)

## 11. Frontend — GATE confinement guards

- [x] 11.1 Add `beforeLoad` guard to `src/routes/index.tsx`: fetch `['me']`, redirect `GATE` → `/portaria`
- [x] 11.2 Update `src/routes/_authenticated.tsx` `beforeLoad`: after `!user` check, redirect `GATE` non-portaria paths → `/portaria`

## 12. Frontend — Existing component updates

- [x] 12.1 Update `src/components/navbar.tsx`: add `gateLinks = []` and branch `role === 'GATE'` to use it
- [x] 12.2 Update `src/features/tickets/components/ticket-detail-card.tsx`: add manual entry code display (`shortId-manualCode`) below QR in owner mode

## 13. Frontend — Verification

- [x] 13.1 Run `npm run lint` in `apps/frontend`
- [x] 13.2 Run `npm run build` in `apps/frontend` (tsc -b + vite build)
