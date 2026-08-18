## Why

Events are sourced from external catalog APIs (TMDB for movies, Ticketmaster for shows), but the catalog data needed to render an event (poster image, age classification, description, duration) is not persisted on the `Event` model. This forces the frontend to re-fetch from external APIs on every render, risking rate limits and adding latency. Additionally, the catalog detail endpoint does not expose movie age certifications, preventing the frontend from pre-filling classification during event creation.

## What Changes

- Add 4 denormalized fields to the `Event` Prisma model: `imageUrl` (nullable), `eventClassification` (required), `description` (nullable), `duration` (required int, minutes)
- **BREAKING**: `POST /events` now requires `eventClassification` and `duration` in the request body; `imageUrl` and `description` are optional
- `PATCH /events/:id` now accepts `imageUrl`, `eventClassification`, `description`, and `duration` as editable scalar fields
- `GET /events` and `GET /events/:id` responses include the 4 new fields
- Add `certification` field to `CatalogItemDetail` in `@elite-dev/shared`
- Modify TMDB provider `findOne` to use `append_to_response=release_dates` and extract the BR certification into `CatalogItemDetail.certification`
- Update shared types (`CreateEventRequest`, `UpdateEventRequest`, `EventItem`, `CatalogItemDetail`) in `@elite-dev/shared`
- Prisma migration to add the 4 columns to the `events` table
- Update `events.repository.spec.ts` mock data to include the new fields

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `events`: Event create/update endpoints gain required fields (`eventClassification`, `duration`) and optional fields (`imageUrl`, `description`); list/detail responses include the 4 new denormalized fields
- `catalog`: Movie detail endpoint (`GET /catalog/movie/:externalId`) now returns `certification` (BR age rating) via TMDB `append_to_response=release_dates`

## Impact

- **Database**: New Prisma migration adding 4 columns to `events` table (`imageUrl String?`, `eventClassification String`, `description String?`, `duration Int`); existing rows would need backfill or default values for non-nullable fields
- **Backend code**: `apps/backend/src/events/` (DTOs, service, repository spec); `apps/backend/src/catalog/providers/tmdb.provider.ts`; `apps/backend/prisma/schema.prisma`
- **Shared package**: `packages/shared/src/index.ts` — `CreateEventRequest`, `UpdateEventRequest`, `EventItem`, `CatalogItemDetail` interfaces updated
- **API surface**: `POST /events` and `PATCH /events/:id` accept new body fields; `GET /events` and `GET /events/:id` return new response fields; `GET /catalog/movie/:externalId` returns `certification`
- **Frontend**: No FE changes in this change; the wizard steps 3-5 (not yet implemented) will consume these fields when built
- **Dependencies**: No new external dependencies
