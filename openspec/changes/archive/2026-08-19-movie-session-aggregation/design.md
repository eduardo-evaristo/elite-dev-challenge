## Context

The `events` module already follows a three-layer NestJS pattern: a thin repository that wraps Prisma (`EventsRepository`), a service with business logic and private mappers (`EventsService`), and a controller (`EventsController`) that is a thin HTTP layer. The `Event` model denormalizes catalog fields (`imageUrl`, `eventClassification`, `description`, `duration`) from TMDB at creation. `GET /events?type=MOVIE` returns one record per `Event` (per session); the two new endpoints must deduplicate by `externalId` without touching that endpoint. See proposal.md for motivation and the delta spec in `specs/events/spec.md` for the behavior contract.

## Goals / Non-Goals

**Goals:**
- Add two public, unauthenticated aggregation endpoints under `/events/movies` that deduplicate `MOVIE` `Event`s by `externalId`.
- Keep Prisma query syntax inside the repository boundary, not the service (consistent with `UsersRepository.find*` convention).
- Share aggregation logic between the two endpoints via one private service method.
- Leave `GET /events`, `GET /events/:id`, and all mutation endpoints untouched.

**Non-Goals:**
- No new third route; no `externalSource` query param.
- No changes to `GET /events` (organizer panel keeps session-by-session view, including past events).
- No `Event` schema or migration changes.
- No frontend changes in this change (frontend linking/consumption is a separate concern).

## Decisions

### D1. Repository exposes an intention-revealing method, not a generic passthrough
Add `findPublishedMoviesFrom(now: Date, externalId?: string)` to `EventsRepository` that encapsulates the `where` clause (`type: 'MOVIE'`, `status: 'PUBLISHED'`, `date: { gte: now }`, optional `externalId`).
- **Rationale**: The existing `EventsRepository.findMany` accepts a raw `where`, but the module's convention (mirrored by `UsersRepository.findByEmail`/`findById`) is that the repository hides Prisma query syntax behind a named method. A generic `findManyByWhere(where)` would push `date: { gte: ... }` knowledge into the service and turn the repository into a pointless wrapper.
- **Alternatives considered**: (a) reuse `findMany({ where })` — rejected as it leaks Prisma syntax into the service; (b) `findPublishedMoviesFrom(now, externalId?)` — chosen; the `now` parameter is injectable for testing.

### D2. In-memory aggregation, not Prisma `groupBy`
Fetch all matching events via `findMany`, then group by `externalId` in the service.
- **Rationale**: Prisma `groupBy` returns only aggregated columns, not full rows, so it cannot produce the deduplicated item list or the location groupings directly. The dataset of published future movies is small, so fetching and grouping in memory is simpler and correct.
- **Alternatives considered**: SQL-level `groupBy` + separate detail fetches — rejected as more complex than needed for the expected volume.

### D3. Shared private service method
`groupPublishedMoviesByExternalId(externalId?)` calls `findPublishedMoviesFrom(new Date(), externalId)` and returns a `Map<string, EventData[]>`. `findMovies` uses the whole map; `findMovieSessions` uses one entry. Endpoint 2 is effectively Endpoint 1 scoped to a single group.
- **Rationale**: Avoids duplicating fetch + group logic; keeps the service free of Prisma syntax (only business logic: group, MIN(date), sort, paginate, group-by-location).

### D4. Future-only filtering centralized in the repository
`date >= now()` is applied in the `where` clause (repository), so neither endpoint ever sees past sessions. `GET /events/movies` silently omits movies with zero future sessions; `GET /events/movies/:externalId/sessions` returns `404` when the single group is empty.
- **Rationale**: These are discovery endpoints for clients; past sessions are irrelevant to the home/movie page. `GET /events` deliberately keeps no such filter for organizer history.

### D5. Response shapes and shared types
The backend service defines inline interfaces (`MovieItem`, `MovieSessionItem`, `MovieSessionsResponse`) and mappers that convert `Date` → ISO string — mirroring the existing `toEventItem`/`toEventDetailResponse` pattern. No `any`.
- **Rationale**: Matches the existing service convention (inline `EventData` interface, plain-object mappers). The aggregated shapes are also exported from `@elite-dev/shared` as `MovieListItem`, `PaginatedMovieListResult`, `MovieSession`, `MovieSessionsByLocation`, and `MovieAggregatedDetail` so the frontend consumes them with shared types (extending the existing `Shared types for cross-app consumption` contract). Backend mappers can build these shared shapes directly.

### D6. Route declaration order matters
`@Get('movies')` and `@Get('movies/:externalId/sessions')` must be declared **before** `@Get(':id')` in `EventsController`, or NestJS would match `movies` as the `:id` param.

### D7. `QueryMoviesDto` is minimal
New `events/dto/query-movies.dto.ts` with `page` (default 1, min 1) and `size` (default 20, min 1, max 50), reusing the `class-validator`/`class-transformer` decorators from `QueryEventsDto`. No `type`/`query` fields (type is fixed to `MOVIE`).

## Risks / Trade-offs

- **[In-memory pagination on grouped data]** → `totalResults` is computed as distinct-movie count after grouping; the paginated slice operates on the sorted grouped array. Correct for the expected small volume; revisit with DB-level grouping only if the published-movie count grows large.
- **[MIN(date) "next session" semantics]** → Because filtering is future-only, `nextSessionDate` is always a future date; no ambiguity about past sessions surfacing. This was a resolved decision (see delta spec scenarios).
- **[`externalId` + `externalSource` consistency]** → Since `type=MOVIE` implies `externalSource=TMDB`, grouping by `externalId` alone is sufficient; adding `externalSource` to the group key or route would be unused complexity.
- **[No tests requested]** → The change ships without unit tests per explicit user decision. Lint + build still gate correctness; runtime validation via `npm run dev` is the manual check.
