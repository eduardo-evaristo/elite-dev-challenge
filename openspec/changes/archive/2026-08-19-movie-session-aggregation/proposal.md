## Why

`GET /events?type=MOVIE` returns one record per `Event` (per session), so the home screen renders a separate card for every cinema/showtime of the same film. Organizers create many sessions per movie, and visitors expect one movie card that links to an aggregated page listing all its sessions. The organizer panel still needs the raw session-by-session list, so the existing endpoint must stay untouched.

## What Changes

- Add public `GET /events/movies` — returns one movie per `externalId` (deduplicated), with `nextSessionDate` (nearest future session) used for sorting and `sessionCount`. Paginated like `GET /events`. Future-only: sessions with `date >= now()`; movies with no future session simply don't appear.
- Add public `GET /events/movies/:externalId/sessions` — aggregated movie page: movie data plus sessions grouped by `location`, each group's sessions sorted by `date` ascending. Returns `404` when there is no published future session for that `externalId`.
- Add `findPublishedMoviesFrom(now, externalId?)` to `EventsRepository` (intention-revealing, keeps Prisma query syntax in the repository boundary — does not leak `where` clauses into the service).
- Add `QueryMoviesDto` (page/size only).
- The two endpoints share a private service method that fetches and groups by `externalId`; aggregation happens in memory (dataset is small).

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `events`: Adds requirements for two new public read endpoints that aggregate `MOVIE` events by `externalId` (home movie list and aggregated movie session page), with future-only filtering and location grouping.

## Impact

- **Code**: `apps/backend/src/events/` — `events.repository.ts`, `events.service.ts`, `events.controller.ts`, new `events/dto/query-movies.dto.ts`. No changes to existing `GET /events`, `GET /events/:id`, or mutation endpoints.
- **API**: Two new public GET routes under `/events/movies`. No breaking changes; `GET /events?type=MOVIE` and the rest of the events API are unchanged.
- **Dependencies**: None new. Uses existing `@prisma/adapter-pg` driver, Prisma `Event` model (`type`, `status`, `externalId`, `externalSource`, `date`, `location`, denormalized catalog fields).
- **Shared types**: Adds aggregated-movie response interfaces to `@elite-dev/shared`: `MovieListItem`, `PaginatedMovieListResult`, `MovieSession`, `MovieSessionsByLocation`, and `MovieAggregatedDetail`. These extend the existing `Shared types for cross-app consumption` contract so the frontend can consume the new endpoints with shared types.
