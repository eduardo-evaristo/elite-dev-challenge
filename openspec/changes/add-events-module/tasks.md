## 1. Shared Types

- [x] 1.1 Add event types to `packages/shared/src/index.ts`: `EventType`, `EventStatus`, `SeatStatus`, `SeatRequest`, `TicketTypeRequest`, `CreateEventRequest`, `UpdateEventRequest`, `QueryEventsParams`, `SeatResponse`, `TicketTypeResponse`, `EventItem`, `EventDetailResponse`, `PaginatedEventResult`

## 2. DTOs

- [x] 2.1 Create `apps/backend/src/events/dto/seat.dto.ts` — `SeatDto` with `@IsString row`, `@IsInt @Min(1) number`
- [x] 2.2 Create `apps/backend/src/events/dto/ticket-type.dto.ts` — `TicketTypeDto` with `@IsString name`, `@IsNumber @Min(0) price`, `@IsInt @Min(1) capacity`
- [x] 2.3 Create `apps/backend/src/events/dto/create-event.dto.ts` — `CreateEventDto` with `name`, `date` (`@IsDateString`), `location`, `type` (`@IsIn(['movie','show'])`), `externalId`, `externalSource` (`@IsIn(['TMDB','TICKETMASTER'])`), optional `seats` (`@ValidateNested({each:true})` + `@Type(()=>SeatDto)`), optional `ticketTypes` (`@ValidateNested({each:true})` + `@Type(()=>TicketTypeDto)`)
- [x] 2.4 Create `apps/backend/src/events/dto/update-event.dto.ts` — `UpdateEventDto` using `PartialType`/`PickType` from `CreateEventDto` for overlapping fields (`name`, `date`, `location`) plus optional `status` (`@IsIn(['draft','published','cancelled'])`)
- [x] 2.5 Create `apps/backend/src/events/dto/query-events.dto.ts` — `QueryEventsDto` with `page` (`@Type(Number)`, `@IsInt`, `@Min(1)`, default 1), `size` (`@Type(Number)`, `@IsInt`, `@Min(1)`, `@Max(50)`, default 20), `query` (`@IsOptional`, `@IsString`), `type` (`@IsOptional`, `@IsIn(['movie','show'])`)

## 3. Repository

- [x] 3.1 Create `apps/backend/src/events/events.repository.ts` — `EventsRepository` with methods: `create(data)`, `findById(id, include?)`, `findMany({ where, skip, take, include? })`, `count({ where })`, `update(id, data)`. Import types from `../generated/prisma/models`. Inject `PrismaService`
- [x] 3.2 Create `apps/backend/src/events/events.repository.spec.ts` — unit tests with mocked PrismaService covering: create with nested seats, create with nested ticketTypes, findById with include, findMany pagination (skip/take), count, update (soft delete). Follow `users.repository.spec.ts` pattern

## 4. Service

- [x] 4.1 Create `apps/backend/src/events/events.service.ts` — `EventsService` with: `TYPE_MAP` and `STATUS_MAP` constants, `findAll(query)` (builds where clause, calls repo findMany+count, returns `PaginatedEventResult`), `findOne(id)` (returns `EventDetailResponse` or 404 if not found/unpublished, converts Decimal→number), `create(dto, userId)` (validates MOVIE needs seats, SHOW needs seats or ticketTypes, sets organizerId, status=PUBLISHED, availableCount=capacity, calls repo create with nested creates), `update(id, dto, user)` (fetch→404, ownership check for ORGANIZER, maps status, calls repo update, returns `EventItem`), `remove(id, user)` (fetch→404, ownership check, soft delete to CANCELLED, returns `{ id, status }`)

## 5. Controller

- [x] 5.1 Create `apps/backend/src/events/events.controller.ts` — `EventsController` with: `GET /events` (`@Query()` → `findAll`), `GET /events/:id` (`@Param('id')` → `findOne`), `POST /events` (`@Body() CreateEventDto`, `@UseGuards(JwtGuard, RolesGuard)`, `@Roles(ORGANIZER, ADMIN)`, `@Req()` for userId → `create`), `PATCH /events/:id` (same guards, `@Body() UpdateEventDto` → `update`), `DELETE /events/:id` (same guards → `remove`)

## 6. Module Wiring

- [x] 6.1 Create `apps/backend/src/events/events.module.ts` — `EventsModule` providing `EventsService`, `EventsRepository`, `PrismaService`; declaring `EventsController`; exporting `EventsService`
- [x] 6.2 Add `EventsModule` to imports in `apps/backend/src/app.module.ts`

## 7. Verification

- [x] 7.1 Run `npx prisma generate` in `apps/backend`
- [x] 7.2 Run `npm run lint` in `apps/backend` (eslint with --fix)
- [x] 7.3 Run `npm test` in `apps/backend` (jest unit tests)
- [x] 7.4 Run `npm run build` in `apps/backend` (nest build)
