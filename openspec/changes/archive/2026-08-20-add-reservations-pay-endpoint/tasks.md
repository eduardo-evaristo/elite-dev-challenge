## 1. DTO

- [x] 1.1 Create `src/reservations/dto/pay-reservation.dto.ts` with a single `cardNumber: string` field (`@IsString`, `@IsNotEmpty`). No `amount` field — the global `ValidationPipe` with `whitelist: true` strips any extra properties.

## 2. Repository

- [x] 2.1 Add `findByIdWithRelations(id: string)` to `ReservationsRepository` — `prisma.reservation.findUnique` with `include: { ticketType: true, seat: true, event: { include: { ticketTypes: true } }, user: { select: { name: true, lastName: true, email: true } } }`.
- [x] 2.2 Add `confirm(id: string)` to `ReservationsRepository` — `prisma.reservation.update` setting `status: 'CONFIRMED'` and `paymentStatus: 'APPROVED'`.
- [x] 2.3 Add `markDeclined(id: string)` to `ReservationsRepository` — `prisma.reservation.update` setting `paymentStatus: 'DECLINED'` only (status stays `PENDING`).

## 3. Module wiring

- [x] 3.1 Add `imports: [TicketsModule, PaymentsModule]` to `ReservationsModule` in `src/reservations/reservations.module.ts`. Import `TicketsModule` from `src/tickets/tickets.module` and `PaymentsModule` from `src/payments/payments.module` (absolute `src/...` paths).

## 4. Service

- [x] 4.1 Add constructor injections to `ReservationsService`: `@Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider` and `private readonly ticketsService: TicketsService`. Import `Inject` from `@nestjs/common`, `PAYMENT_PROVIDER` + `PaymentProvider` type from `../payments/interfaces/payment-provider.interface`, and `TicketsService` from `../tickets/tickets.service`.
- [x] 4.2 Implement `pay(reservationId: string, userId: string, cardNumber: string)` method: load reservation with relations via `findByIdWithRelations`; throw `NotFoundException` if not found or `userId` mismatch; throw `BadRequestException` if `status !== 'PENDING'`; compute `amount` from `reservation.ticketType.price` (sector) or `reservation.event.ticketTypes[0].price` (seat), throw `ConflictException` if no price source; call `paymentProvider.charge({ reservationId, amount, cardNumber, customer: { name, email } })`.
- [x] 4.3 In the `pay` method dispatch: on `APPROVED` — call `reservationsRepository.confirm(reservationId)` then `ticketsService.issueForReservation(reservationId)` and return the ticket; on `DECLINED` — call `reservationsRepository.markDeclined(reservationId)` and return `{ status: 'DECLINED', message: 'Pagamento recusado' }`; on any other status — throw `InternalServerErrorException('Estado de pagamento não suportado')`.
- [x] 4.4 Add `InternalServerErrorException` to the `@nestjs/common` import block in `reservations.service.ts`.

## 5. Controller

- [x] 5.1 Add `@Post(':id/pay')` endpoint to `ReservationsController` with `@UseGuards(JwtGuard, RolesGuard)` + `@Roles(Role.CLIENT)`. Extract `id` via `@Param('id')`, `cardNumber` via `@Body() dto: PayReservationDto`, and `userId` via `@Req() req.user.userId`. Call `reservationsService.pay(id, req.user.userId, dto.cardNumber)`.
- [x] 5.2 Add `Param` to the `@nestjs/common` import block and import `PayReservationDto` in `reservations.controller.ts`.

## 6. Tests

- [x] 6.1 Create `src/reservations/reservations.service.spec.ts` with mocked `ReservationsRepository` (jest.fn per method), `PaymentProvider` (object with `charge: jest.fn`), and `TicketsService` (object with `issueForReservation: jest.fn`).
- [x] 6.2 Test: approved payment for a sector reservation — asserts `charge` called with correct `amount` (from `ticketType.price`), `confirm` called, `issueForReservation` called, and ticket returned.
- [x] 6.3 Test: declined payment for a seat reservation — asserts `markDeclined` called, `confirm` not called, `issueForReservation` not called, and `{ status: 'DECLINED', message }` returned.
- [x] 6.4 Test: seat-based reservation amount derived from `event.ticketTypes[0].price` — asserts `charge` called with correct amount.
- [x] 6.5 Test: reservation belonging to another user — asserts `NotFoundException` thrown and `charge` not called.
- [x] 6.6 Test: reservation not `PENDING` — asserts `BadRequestException` thrown and `charge` not called.
- [x] 6.7 Test: no price source (seat reservation, event has no ticket types) — asserts `ConflictException` thrown and `charge` not called.
- [x] 6.8 Test: pending payment result — asserts `InternalServerErrorException` thrown, no repository mutations, no ticket issued.

## 7. Verification

- [x] 7.1 Run `npx prisma generate` in `apps/backend` (generated client is gitignored; required before compile/lint/test).
- [x] 7.2 Run `npm run lint` in `apps/backend` (eslint with `--fix`).
- [x] 7.3 Run `npm test` in `apps/backend` (jest — includes new `reservations.service.spec.ts` + existing ticket specs).
- [x] 7.4 Run `npm run build` in `apps/backend` (`nest build` → `dist/`).
