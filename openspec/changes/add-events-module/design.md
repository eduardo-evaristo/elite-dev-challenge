## Context

The backend follows a controller → service → repository → PrismaService layering (established in `users` and `catalog` modules). Prisma models for `Event`, `Seat`, and `TicketType` already exist in the schema with enums `EventType`, `EventStatus`, `ExternalSource`, and `SeatStatus`. The global `ValidationPipe` with `transform: true, whitelist: true` is already configured in `main.ts`. JWT auth uses httpOnly cookies, extracted via `JwtGuard`; role enforcement uses `RolesGuard` + `@Roles()` decorator. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Provide a clean, testable Events module that fits the existing module pattern
- Keep enum mapping isolated at the service layer so controllers and repositories stay simple
- Share all event contracts via `@elite-dev/shared` to avoid type drift between apps

**Non-Goals:**
- Editing seats or ticket types via PATCH (scalar-only updates)
- Hard delete of events (soft delete only)
- Real-time seat locking or reservation flows
- Frontend integration (types are exported, but no FE routes are built in this change)

## Decisions

### 1. Enum mapping at service layer (lowercase in/out → uppercase to Prisma)

URL query params and body fields use lowercase (`movie`, `show`, `draft`, `published`, `cancelled`) for REST convention consistency. The service maps these to uppercase Prisma enums via static `Record<string, EnumType>` maps. Responses return uppercase directly from Prisma without reverse mapping — the shared types use uppercase, so the frontend receives and uses uppercase consistently.

**Alternative considered**: Custom `@Transform` decorators in DTOs to convert casing. Rejected because it spreads mapping logic across DTOs and makes it harder to test in isolation. Centralizing in the service keeps a single source of truth for the mapping.

### 2. `externalSource` stays uppercase

Unlike `type` and `status`, `externalSource` is not a URL path/query param — it appears only in request bodies and responses. It already exists as `'TMDB' | 'TICKETMASTER'` in `@elite-dev/shared`. Keeping it uppercase avoids a breaking change to the existing shared type and avoids unnecessary mapping.

### 3. Scalar-only PATCH (no nested relation edits)

PATCH only updates `name`, `date`, `location`, `status`. Seats and ticket types are immutable after creation. This avoids complex partial-update semantics for nested arrays and keeps the endpoint simple. If seat/ticket editing is needed later, it should be a separate sub-resource endpoint.

### 4. `availableCount = capacity` at creation time

When a ticket type is created, its `availableCount` is set equal to `capacity`. This is a creation-time initialization — no decrement logic is in scope for this change (that belongs to a future booking/ticket flow).

### 5. `Decimal` → `number` conversion at service layer

Prisma returns `Decimal` for `TicketType.price`. The service converts via `Number()` when building `TicketTypeResponse`. This is done in the mapping step alongside the event-to-response shaping, keeping the repository purely Prisma-typed.

### 6. Public GET endpoints return only `PUBLISHED` events

No JWT guard on `GET /events` or `GET /events/:id`. The `where` clause hardcodes `status: 'PUBLISHED'`. For getById, a non-published event returns 404 (not 403) to avoid leaking existence of draft/cancelled events to unauthenticated callers.

### 7. Ownership check in service (not guard)

The `RolesGuard` checks role only (ORGANIZER/ADMIN). Ownership (`organizerId === userId`) is checked in the service after fetching the event. This is because the guard doesn't have access to the event's `organizerId` without a DB lookup. ADMIN bypasses the ownership check.

### 8. DTOs use NestJS MappedTypes where applicable

`UpdateEventDto` uses `PartialType` over a base or `PickType` from `CreateEventDto` where field definitions overlap, following the `@nestjs/swagger`/`@nestjs/mapped-types` pattern. This reduces duplication and keeps validation rules in sync.

### 9. Repository follows `UsersRepository` pattern

Thin wrapper over `PrismaService` with typed methods: `create`, `findById`, `findMany`, `count`, `update`. Types imported from `../generated/prisma/models`. No business logic in the repository. `PrismaService` is provided locally in the module (same as `UsersModule`).

## Risks / Trade-offs

- **[No auth on list/detail leaks published event data]** → Mitigated: only `PUBLISHED` events are returned; draft/cancelled are hidden. This is the intended public-facing behavior.
- **[Ownership check requires a DB read before update/delete]** → Accepted: one extra `findUnique` per mutation is negligible. Alternative (embedding organizerId in a custom guard) would require parsing the route param and querying anyway.
- **[No pagination cursor — offset-based only]** → Accepted for current scale. If event count grows large, offset pagination degrades; can switch to cursor-based later without changing the response contract.
- **[Soft delete via status=CANCELLED means no unique constraint issues on re-creation]** → Accepted: a cancelled event stays in the DB. Organizers create new events rather than reviving cancelled ones.
