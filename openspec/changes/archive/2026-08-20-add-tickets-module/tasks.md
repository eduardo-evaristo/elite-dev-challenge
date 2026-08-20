## 1. Setup & configuration

- [x] 1.1 Create `apps/backend/src/tickets/` directory with the module file layout (module, controller, service, repository, `dto/`).
- [x] 1.2 Add `TICKET_SECRET=your-ticket-signing-secret-here` (with the `# Tickets module` comment) to `apps/backend/.env.example`.
- [x] 1.3 Add a real `TICKET_SECRET` value to `apps/backend/.env`.

## 2. Repository

- [x] 2.1 Create `apps/backend/src/tickets/tickets.repository.ts`: `@Injectable`, inject `PrismaService`, import types from `../generated/prisma/models` with `import type`.
- [x] 2.2 Implement `create(data, include?)`, `findByPublicId(id, include?)`, `findManyByUser(userId, {skip,take,include?})`, `countByUser(userId)`.
- [x] 2.3 Implement `markUsed(id)` as `prisma.ticket.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } })` and `findReservationWithEvent(reservationId)` selecting `{ id, eventId, userId, status }`.

## 3. DTOs

- [x] 3.1 Create `apps/backend/src/tickets/dto/validate-ticket.dto.ts` with `@IsString publicId`, `@IsString signature`, `@IsOptional @IsString expectedEventId?`.
- [x] 3.2 Create `apps/backend/src/tickets/dto/query-my-tickets.dto.ts` mirroring `query-events.dto.ts`: `@IsOptional @Type(()=>Number) @IsInt @Min(1) page = 1` and `@IsOptional @Type(()=>Number) @IsInt @Min(1) @Max(50) size = 20`.

## 4. Service

- [x] 4.1 Create `apps/backend/src/tickets/tickets.service.ts`: `@Injectable`, inject `TicketsRepository` + `ConfigService`; read `TICKET_SECRET` via `getOrThrow` in the constructor; define the shared `TICKET_INCLUDE` constant (`reservation: { include: { event, seat, ticketType } }`).
- [x] 4.2 Implement `issueForReservation(reservationId)`: load reservation via repo, throw `NotFoundException` if missing, generate `id = randomUUID()`, compute `signature = createHmac('sha256', secret).update(\`${id}:${eventId}\`).digest('hex')`, create the ticket with `reservation: { connect }` + `user: { connect: reservation.userId }` + `signature`, return via `toResponse(..., { withQr: true })`.
- [x] 4.3 Implement `findMine(userId, query)` returning `{ items, page, totalPages, totalResults }` with `Promise.all` of `findManyByUser` + `countByUser`, each item mapped with `withQr: true`.
- [x] 4.4 Implement `findMineOne(publicId, userId)`: `findByPublicId`; throw `NotFoundException` if missing **and** if `ticket.userId !== userId` (don't reveal existence); return `toResponse(..., { withQr: true })`.
- [x] 4.5 Implement `findOne(publicId)` (public): `findByPublicId`; `NotFoundException` if missing; return `toPublicResponse` (no signature, no qrContent).
- [x] 4.6 Implement `validate(dto)` in the fixed order: not-found → `INVALID`; `expectedEventId` mismatch → `WRONG_EVENT`; recompute HMAC and compare via `timingSafeEqual` (length-guarded) → `INVALID` on mismatch; `markUsed` and `count === 0` → `ALREADY_USED`; else `VALID`.
- [x] 4.7 Implement private helpers `signTicket`, `safeEqualHex`, `toQrContent` (JSON `{"v":1,"id","sig"}`), `toResponse` (adds `signature`+`qrContent` when `withQr`), `toPublicResponse` (metadata + `used` boolean, no signature/qrContent).

## 5. Controller & module

- [x] 5.1 Create `apps/backend/src/tickets/tickets.controller.ts` with routes declared in this order: `@Get('mine')`, `@Get('mine/:publicId')`, `@Get(':publicId')`, `@Post('validate')` (static segments before `:publicId` to avoid shadowing).
- [x] 5.2 Apply `@UseGuards(JwtGuard, RolesGuard)` + `@Roles(Role.CLIENT)` to the two `/mine` routes; `@Roles(Role.GATE, Role.ADMIN)` to `/validate`; no guard on `/tickets/:publicId`. Obtain the user via `@Req() req: Request & { user: AuthenticatedUser }`.
- [x] 5.3 Create `apps/backend/src/tickets/tickets.module.ts`: `controllers: [TicketsController]`, `providers: [TicketsService, TicketsRepository, PrismaService]`, `exports: [TicketsService]`.
- [x] 5.4 Register `TicketsModule` in `apps/backend/src/app.module.ts` imports array.

## 6. Tests

- [x] 6.1 Create `apps/backend/src/tickets/tickets.repository.spec.ts` mirroring `reservations.repository.spec.ts`: mock `PrismaService` per-delegate; assert `markUsed` uses `where: { id, usedAt: null }`; cover `create`, `findByPublicId`, `findManyByUser`, `countByUser`, `findReservationWithEvent`.
- [x] 6.2 (Optional) Create `apps/backend/src/tickets/tickets.service.spec.ts` covering the four `validate` states, `issueForReservation` (assert `id` is a UUID and `signature` matches recomputed HMAC), and `findMineOne` returning `NotFoundException` for both non-existent and non-owned `publicId`.

## 7. Verification (in `apps/backend`)

- [x] 7.1 `npx prisma generate` (generated client is gitignored; required before compile).
- [ ] 7.2 `npm run lint` passes. — **Blocked**: tickets module lints clean (`eslint src/tickets/**` exit 0), but the global `npm run lint` fails with 9 pre-existing errors in files outside this change (`auth.service.ts` unused `User` import; `users.repository.spec.ts` unsafe-call/unbound-method). These were not introduced by this change (see `git status` — `auth.service.ts`/`main.ts` unmodified, `users.repository.spec.ts` is a pre-existing untracked file).
- [x] 7.3 `npm test` passes (including the new spec). — 6 suites, 48 tests, all pass.
- [x] 7.4 `npm run build` passes. — `nest build` exit 0.
