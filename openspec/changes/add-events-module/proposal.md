## Why

The platform needs an Events module so organizers can create, edit, and soft-delete events (movies and shows) sourced from TMDB and Ticketmaster, while any visitor can browse published events with pagination and view full event details including seats and ticket types. This unlocks the core business workflow — event management and discovery — on top of the existing Prisma Event/Seat/TicketType models that currently have no API surface.

## What Changes

- Add `EventsModule` (controller, service, repository, DTOs) to the NestJS backend following the existing module pattern (users, catalog)
- Add 5 endpoints: `GET /events` (public, paginated), `GET /events/:id` (public, detail with relations), `POST /events` (auth: ORGANIZER/ADMIN), `PATCH /events/:id` (auth + ownership), `DELETE /events/:id` (auth + ownership, soft delete)
- Add shared TypeScript types to `@elite-dev/shared` for cross-app consumption (`EventType`, `EventStatus`, `SeatStatus`, request/response interfaces, `PaginatedEventResult`)
- Enforce business validation: MOVIE events require `seats`; SHOW events require `seats` OR `ticketTypes`
- Enforce ownership: ORGANIZER can only edit/delete their own events; ADMIN can edit/delete any
- Map lowercase URL/body params to uppercase Prisma enums at the service layer
- Add unit tests for `EventsRepository` following the `users.repository.spec.ts` pattern
- Wire `EventsModule` into `app.module.ts`

## Capabilities

### New Capabilities
- `events`: Event lifecycle management — creation, editing, soft-deletion, and public browsing of events with seats and ticket types

### Modified Capabilities
<!-- none -->

## Impact

- **Backend code**: New `apps/backend/src/events/` directory (module, controller, service, repository, DTOs, spec); `apps/backend/src/app.module.ts` modified to import `EventsModule`
- **Shared package**: `packages/shared/src/index.ts` gains new event-related type exports
- **API surface**: 5 new HTTP endpoints under `/events` — no existing endpoints affected
- **Dependencies**: No new external dependencies; uses existing Prisma models, `@nestjs/axios`, class-validator, and NestJS MappedTypes already in the project
- **Database**: No schema changes — uses existing `Event`, `Seat`, `TicketType` tables and enums
