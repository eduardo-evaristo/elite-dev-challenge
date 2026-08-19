## 1. Shared types

- [x] 1.1 Add to `packages/shared/src/index.ts`: `MovieListItem` (externalId, name, imageUrl, description, eventClassification, duration, nextSessionDate as ISO string, sessionCount), `PaginatedMovieListResult` ({ items: MovieListItem[], page, totalPages, totalResults }), `MovieSession` ({ id, date as ISO string }), `MovieSessionsByLocation` ({ location, sessions: MovieSession[] }), and `MovieAggregatedDetail` (display fields + `sessionsByLocation: MovieSessionsByLocation[]`).

## 2. Repository

- [x] 2.1 Add `findPublishedMoviesFrom(now: Date, externalId?: string)` to `EventsRepository` returning `EventModel[]`, with `where: { type: 'MOVIE', status: 'PUBLISHED', date: { gte: now }, ...(externalId && { externalId }) }` via `this.prisma.event.findMany`.

## 3. DTO

- [x] 3.1 Create `apps/backend/src/events/dto/query-movies.dto.ts` with `QueryMoviesDto` (`page` default 1 min 1, `size` default 20 min 1 max 50) using `class-validator`/`class-transformer` decorators matching `QueryEventsDto`.

## 4. Service

- [x] 4.1 Add inline response interfaces in `EventsService` (`MovieItem`, `MovieSessionItem`, `MovieSessionsResponse`) and ISO-date mappers.
- [x] 4.2 Add private `groupPublishedMoviesByExternalId(externalId?: string)` that calls `findPublishedMoviesFrom(new Date(), externalId)` and returns `Map<string, EventData[]>`.
- [x] 4.3 Add `findMovies(query: QueryMoviesDto)`: build `MovieItem` per group (MIN(date) → `nextSessionDate`, `sessionCount`), sort asc by `nextSessionDate`, paginate the grouped array in memory, return `{ items, page, totalPages, totalResults }` where `totalResults` = distinct movie count.
- [x] 4.4 Add `findMovieSessions(externalId: string)`: look up the single group; if empty throw `NotFoundException` (404). Return movie data + `sessionsByLocation` array (group by `location`, sessions `{ id, date }` sorted asc by `date`).

## 5. Controller

- [x] 5.1 Add `@Get('movies') findMovies(@Query() query: QueryMoviesDto)` and `@Get('movies/:externalId/sessions') findMovieSessions(@Param('externalId') externalId: string)` to `EventsController`, declared BEFORE `@Get(':id')`, both public (no guards).

## 6. Verification

- [x] 6.1 Run `npx prisma generate` from `apps/backend`, then `npm run lint`, `npm test`, `npm run build` and confirm all pass.
