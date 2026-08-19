## ADDED Requirements

### Requirement: List aggregated movies for home

The system SHALL expose a public `GET /events/movies` endpoint that returns one entry per distinct movie (`externalId`), aggregating all published `MOVIE` events that share the same `externalId`. Only events with `status=PUBLISHED` and `date >= now()` SHALL be considered. Movies with no remaining future published session SHALL NOT appear in the result (this is expected absence, not an error). The endpoint SHALL filter by `type=MOVIE` and SHALL NOT require or accept an `externalSource` parameter, since `MOVIE` events are sourced from TMDB in the current domain.

Each list item SHALL include `externalId` (for the frontend to link to `/filmes/:externalId`), `name`, `imageUrl` (string or null), `description` (string or null), `eventClassification` (string), `duration` (integer minutes), `nextSessionDate` (the earliest `date` among the group's future sessions, as an ISO string, used for ordering), and `sessionCount` (number of future sessions in the group). The display fields (`name`, `imageUrl`, `description`, `eventClassification`, `duration`) SHALL be taken from any one event in the group, as these are denormalized from the catalog at creation and are consistent across sessions of the same movie.

The list SHALL be sorted ascending by `nextSessionDate` (nearest upcoming session first) and returned in a paginated envelope `{ items, page, totalPages, totalResults }`, where `totalResults` reflects the count of distinct movies (distinct `externalId`), not the count of `Event` records. Pagination SHALL accept `page` (default 1, min 1) and `size` (default 20, min 1, max 50). This endpoint SHALL NOT alter the behavior of `GET /events` or `GET /events?type=MOVIE`.

#### Scenario: Movies aggregated by externalId
- **WHEN** a client requests `GET /events/movies` and multiple published future `MOVIE` events share the same `externalId` across different locations/dates
- **THEN** the system returns exactly one item per distinct `externalId`, each with `sessionCount` equal to the number of future events in that group and `nextSessionDate` equal to the earliest future session

#### Scenario: Future-only filtering excludes past sessions
- **WHEN** a movie has both past and future published sessions
- **THEN** only the future sessions count toward `sessionCount` and `nextSessionDate`, and the earliest future session determines ordering

#### Scenario: Movie with no future session does not appear
- **WHEN** all published events for a given `externalId` have `date < now()`
- **THEN** that movie is omitted from the `GET /events/movies` response without error

#### Scenario: Sorted by nearest upcoming session
- **WHEN** a client requests `GET /events/movies`
- **THEN** the returned items are ordered ascending by `nextSessionDate`, so movies with the soonest upcoming session are listed first

#### Scenario: Pagination envelope uses distinct movie count
- **WHEN** a client requests `GET /events/movies?page=2&size=10`
- **THEN** the response contains a page of at most 10 distinct movie items and `totalResults` equals the total number of distinct movies (externalId), not the number of Event records

#### Scenario: Size exceeds maximum
- **WHEN** a client requests `GET /events/movies?size=100`
- **THEN** the system rejects the request with a validation error

#### Scenario: Existing session-by-session endpoint unaffected
- **WHEN** a client requests `GET /events?type=MOVIE`
- **THEN** the system still returns one record per `Event` (per session), unchanged by the addition of `GET /events/movies`

### Requirement: Get aggregated movie sessions by externalId

The system SHALL expose a public `GET /events/movies/:externalId/sessions` endpoint that returns the aggregated detail of a single movie identified by `externalId`. Only published `MOVIE` events with `date >= now()` SHALL be considered. The response SHALL include the movie's display fields (`externalId`, `name`, `imageUrl`, `description`, `eventClassification`, `duration`) taken from any one matching event, plus a `sessionsByLocation` array.

`sessionsByLocation` SHALL group the matching sessions by `location`; each entry SHALL contain `location` (string) and a `sessions` array of `{ id, date }` objects, where `id` is the internal `Event` id (used by the frontend to navigate to checkout) and `date` is the session date as an ISO string. Within each location group, the sessions SHALL be sorted ascending by `date`.

If no published future session exists for the given `externalId`, the system SHALL return a `404 Not Found` error, treating "no future sessions" as equivalent to "nothing to show" from the client's perspective.

#### Scenario: Aggregated movie page with grouped sessions
- **WHEN** a client requests `GET /events/movies/:externalId/sessions` with an `externalId` that has multiple future published sessions across locations
- **THEN** the system returns the movie display fields and `sessionsByLocation` containing one entry per distinct `location`, each with its sessions sorted by `date` ascending, and each session carrying the internal `Event` `id` and `date`

#### Scenario: Sessions sorted by date within location
- **WHEN** a location has multiple future sessions
- **THEN** that location's `sessions` array is ordered by `date` ascending

#### Scenario: No future sessions for externalId
- **WHEN** a client requests `GET /events/movies/:externalId/sessions` and there are no published future `MOVIE` events for that `externalId`
- **THEN** the system returns a `404 Not Found` error

#### Scenario: Non-movie or unpublished events ignored
- **WHEN** events exist for the `externalId` but are `SHOW` type, `DRAFT`/`CANCELLED`, or have only past dates
- **THEN** they are excluded and, if none remain, the endpoint returns `404`

## MODIFIED Requirements

### Requirement: Shared types for cross-app consumption

The system SHALL export event-related TypeScript types from `@elite-dev/shared` so both backend and frontend can share the same contracts. These SHALL include `EventType`, `EventStatus`, `SeatStatus`, request interfaces (`SeatRequest`, `TicketTypeRequest`, `CreateEventRequest`, `UpdateEventRequest`, `QueryEventsParams`), response interfaces (`SeatResponse`, `TicketTypeResponse`, `EventItem`, `EventDetailResponse`), and `PaginatedEventResult`. `CreateEventRequest` SHALL include `eventClassification` (required string), `duration` (required number), and optional `imageUrl` and `description`. `UpdateEventRequest` SHALL include optional `imageUrl`, `eventClassification`, `description`, and `duration`. `EventItem` SHALL include `imageUrl` (string | null), `eventClassification` (string), `description` (string | null), and `duration` (number). The system SHALL additionally export aggregated-movie response interfaces consumed by the `/events/movies` endpoints: `MovieListItem` (with `externalId`, `name`, `imageUrl`, `description`, `eventClassification`, `duration`, `nextSessionDate` as ISO string, and `sessionCount`), `PaginatedMovieListResult` (with `items: MovieListItem[]`, `page`, `totalPages`, `totalResults`), `MovieSession` (with `id` and `date` as ISO string), `MovieSessionsByLocation` (with `location` and `sessions: MovieSession[]`), and `MovieAggregatedDetail` (with the movie display fields plus `sessionsByLocation: MovieSessionsByLocation[]`).

#### Scenario: Frontend imports event types
- **WHEN** the frontend imports from `@elite-dev/shared`
- **THEN** all event-related types are available with uppercase enum values matching the backend response shape, including the denormalized catalog fields

#### Scenario: Frontend imports aggregated movie types
- **WHEN** the frontend imports from `@elite-dev/shared`
- **THEN** `MovieListItem`, `PaginatedMovieListResult`, `MovieSession`, `MovieSessionsByLocation`, and `MovieAggregatedDetail` are available and match the `/events/movies` response shapes
