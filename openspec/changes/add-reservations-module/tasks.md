## 1. Validator

- [x] 1.1 Create `apps/backend/src/reservations/dto/exactly-one-of.validator.ts` — `ExactlyOneOfConstraint` (`@ValidatorConstraint({ name: 'exactlyOneOf', async: false })` implementing `ValidatorConstraintInterface`): `validate` reads `args.object`, counts non-null/non-empty of `args.constraints[0]` fields, returns `count === 1`; `defaultMessage` lists the fields. Plus `ExactlyOneOf(fields, validationOptions?)` factory using `registerDecorator` (targets `object.constructor`, `propertyName`, `constraints: [fields]`)

## 2. DTO

- [x] 2.1 Create `apps/backend/src/reservations/dto/create-reservation.dto.ts` — `CreateReservationDto` with `@ExactlyOneOf(['seatId','ticketTypeId'], { message: 'Forneça exatamente um de seatId ou ticketTypeId' })` on `eventId` (always present so the validator always runs); `eventId` (`@IsString @IsNotEmpty`); optional `seatId?` (`@IsOptional @IsString`); optional `ticketTypeId?` (`@IsOptional @IsString`). Follow `create-event.dto.ts` convention (`@IsString`/`@IsNotEmpty`, not `@IsUUID`)

## 3. Repository

- [x] 3.1 Create `apps/backend/src/reservations/reservations.repository.ts` — `ReservationsRepository` injecting `PrismaService`. Methods: `findSeat(id): Promise<SeatModel | null>` (precondition, path a); `findTicketType(id): Promise<TicketTypeModel | null>` (precondition, path b); `create(data: ReservationCreateInput): Promise<ReservationModel>` (path a — raw create, relies on `Reservation.seatId @unique`); `createTicketTypeReservation(params: { eventId, userId, ticketTypeId }): Promise<ReservationModel | null>` (path b — `$transaction`: `tx.ticketType.updateMany({ where: { id, availableCount: { gte: 1 } }, data: { availableCount: { decrement: 1 } } })`, if `count === 0` return `null`, else `tx.reservation.create({ data: { ...params, status: 'PENDING' } })`). Import types via `import type { ... } from '../generated/prisma/models'`. No `include` parameter (returns bare models)
- [x] 3.2 (Optional) Create `apps/backend/src/reservations/reservations.repository.spec.ts` — unit tests with mocked `PrismaService` covering `findSeat`, `findTicketType`, `create`, and `createTicketTypeReservation` (count 0 → null, count 1 → creates reservation). Follow `events.repository.spec.ts` pattern

## 4. Service

- [x] 4.1 Create `apps/backend/src/reservations/reservations.service.ts` — `ReservationsService` injecting `ReservationsRepository`. Public `create(dto: CreateReservationDto, userId: string)`: if `dto.seatId` → `createSeatReservation(dto.eventId, userId, dto.seatId)`, else `createTicketTypeReservation(dto.eventId, userId, dto.ticketTypeId!)` (DTO + validator guarantee presence). Private `createSeatReservation`: `findSeat` → `NotFoundException` if null, `BadRequestException` if `seat.eventId !== eventId`; comment documenting that `Seat.status` is intentionally not consulted/written and the single source of truth is `Reservation.seatId @unique`; `try repo.create({ eventId, userId, seatId, status: 'PENDING' })`, `catch` `PrismaClientKnownRequestError` with `code === 'P2002'` → `ConflictException('Esse assento acabou de ser reservado por outra pessoa')`, rethrow others. Private `createTicketTypeReservation`: `findTicketType` → `NotFoundException` if null, `BadRequestException` if `ticketType.eventId !== eventId`; `repo.createTicketTypeReservation({ eventId, userId, ticketTypeId })` → if null `ConflictException('Ingressos esgotados para este setor')`. Private `toResponse(reservation)` mapping scalars (`id`, `eventId`, `userId`, `seatId`, `ticketTypeId`, `status`, `createdAt` ISO string). Confirm the `PrismaClientKnownRequestError` import path from `../generated/prisma/client` after `npx prisma generate` (gitignored client)

## 5. Controller

- [x] 5.1 Create `apps/backend/src/reservations/reservations.controller.ts` — `ReservationsController` with `@Controller('reservations')` and `@Post()` `create(@Body() dto: CreateReservationDto, @Req() req: Request & { user: AuthenticatedUser })` calling `reservationsService.create(dto, req.user.userId)`. Guards: `@UseGuards(JwtGuard, RolesGuard)` + `@Roles(Role.CLIENT)`. Imports: `src/common/roles.decorator`, `src/common/roles.guard`, `src/auth/guards/jwt.guard` (default export), `src/auth/auth.types` (type), `src/generated/prisma/enums` (`Role`)

## 6. Module Wiring

- [x] 6.1 Create `apps/backend/src/reservations/reservations.module.ts` — `ReservationsModule` providing `ReservationsService`, `ReservationsRepository`, `PrismaService`; declaring `ReservationsController`; exporting `ReservationsService`
- [x] 6.2 Add `ReservationsModule` to the `imports` array in `apps/backend/src/app.module.ts` (alongside `EventsModule`)

## 7. DTO Tests

- [x] 7.1 Create `apps/backend/src/reservations/dto/create-reservation.dto.spec.ts` — uses `plainToInstance` + `validate` from class-validator. Test the mutex rule only: (a) both `seatId` and `ticketTypeId` provided → expects an error matching `/exatamente um/i`; (b) neither provided (only `eventId`) → expects the same error; (c) exactly one of each → expects no mutex error (parametrize `seatId` only and `ticketTypeId` only)

## 8. Verification

- [x] 8.1 Run `npx prisma generate` in `apps/backend` (regenerates the gitignored Prisma client; required before compile and to confirm the `PrismaClientKnownRequestError` import path)
- [x] 8.2 Run `npm run lint` in `apps/backend` (eslint with `--fix`)
- [x] 8.3 Run `npm test` in `apps/backend` (runs the new `create-reservation.dto.spec.ts`)
- [x] 8.4 Run `npm run build` in `apps/backend` (`nest build`)
