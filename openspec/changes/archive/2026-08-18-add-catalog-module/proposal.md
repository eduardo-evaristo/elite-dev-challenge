## Why

Organizers/admins need to search and browse external movie (TMDB) and show (TicketMaster) catalogs so they can pick items to publish as bookable events. Today there is no way to discover external content from the backend; event creation would require organizers to supply all event metadata by hand. A normalized, read-through catalog endpoint gives the frontend a single source of selection data and aligns with the existing `EventType`/`ExternalSource` Prisma enums already in the schema.

## What Changes

- Add a new `packages/shared` workspace package exporting the catalog response types (`CatalogItem`, `CatalogItemDetail`, `SearchParams`, `PaginatedCatalogResult`) so the frontend and backend share one contract.
- Add a NestJS `CatalogModule` under `apps/backend/src/catalog/` that proxies two external APIs through a normalized `CatalogProvider` interface:
  - `TmdbProvider` for movies (search, trending browse, details).
  - `TicketmasterProvider` for shows (search, browse, details).
- Expose authenticated, role-restricted REST endpoints: `GET /catalog?type={movie|show}&query=&page=&size=` (search/browse) and `GET /catalog/{type}/{externalId}` (details), restricted to `ORGANIZER` and `ADMIN`.
- Normalize divergent external shapes (pagination indexing, ID types, title/description/image/date fields) into the shared `CatalogItem`/`CatalogItemDetail` contract.
- Add `@nestjs/axios` + `axios` backend dependencies.
- Add new env vars (`TMDB_ACCESS_TOKEN`, `TMDB_BASE_URL`, `TMDB_IMAGE_BASE_URL`, `TICKETMASTER_API_KEY`, `TICKETMASTER_BASE_URL`) and a `.env.example` documenting them.
- Register `CatalogModule` in `AppModule`.

## Capabilities

### New Capabilities
- `catalog`: External catalog search, browse, and details proxy that normalizes TMDB (movies) and TicketMaster (shows) responses into a shared contract for organizer/admin event sourcing.

### Modified Capabilities
<!-- None. The catalog is a brand-new capability; no existing spec-level behavior changes. -->

## Impact

- **New code**: `packages/shared/` (new workspace package), `apps/backend/src/catalog/` (module, controller, service, provider interface, two providers, DTO).
- **Modified code**: `apps/backend/src/app.module.ts` (register `CatalogModule`), `apps/backend/tsconfig.json` (add `paths` for `@elite-dev/shared`), `apps/backend/package.json` and `apps/frontend/package.json` (add `@elite-dev/shared` dependency).
- **Dependencies**: `@nestjs/axios`, `axios` added to backend.
- **External APIs**: TMDB (`api.themoviedb.org/3`) and TicketMaster Discovery (`app.ticketmaster.com/discovery/v2`) — read-only, no persistence.
- **Config**: New env vars for external API credentials and base URLs; `.env.example` updated.
- **No DB changes**: Catalog is a passthrough; persistence of selected items happens later in a separate `events` module keyed by `externalId` + `externalSource`.
