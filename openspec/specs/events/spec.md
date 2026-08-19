## Purpose

Lets organizers create, edit, and soft-delete events sourced from TMDB and Ticketmaster, and lets any visitor browse published events with pagination and view full event details including seats and ticket types.

## Requirements

### Requirement: List published events with pagination

The system SHALL expose a public `GET /events` endpoint that returns published events in a paginated result. The endpoint SHALL accept optional `page` (default 1, min 1), `size` (default 20, min 1, max 50), `query` (case-insensitive name search), and `type` (lowercase `movie` or `show`) query parameters. Only events with `status=PUBLISHED` SHALL be returned. The response SHALL include scalar event fields only (no seats or ticket types) and a pagination envelope with `page`, `totalPages`, and `totalResults`. Each event item SHALL include the denormalized catalog fields `imageUrl` (string or null), `eventClassification` (string), `description` (string or null), and `duration` (integer, minutes).

#### Scenario: Default pagination
- **WHEN** a client requests `GET /events` with no query parameters
- **THEN** the system returns page 1 with up to 20 published events, `totalPages` calculated from total results, and `totalResults` reflecting the count of all published events

#### Scenario: Custom page and size
- **WHEN** a client requests `GET /events?page=2&size=10`
- **THEN** the system returns the second page of up to 10 published events, skipping the first 10

#### Scenario: Filter by type
- **WHEN** a client requests `GET /events?type=movie`
- **THEN** the system returns only published events whose type is `MOVIE`

#### Scenario: Search by name
- **WHEN** a client requests `GET /events?query=avengers`
- **THEN** the system returns only published events whose name contains "avengers" (case-insensitive)

#### Scenario: Size exceeds maximum
- **WHEN** a client requests `GET /events?size=100`
- **THEN** the system rejects the request with a validation error

#### Scenario: Response includes denormalized catalog fields
- **WHEN** a client requests `GET /events` and published events exist
- **THEN** each event item in the response includes `imageUrl`, `eventClassification`, `description`, and `duration` fields sourced from the persisted `Event` record

### Requirement: Get event detail by ID

The system SHALL expose a public `GET /events/:id` endpoint that returns a single published event with its seats and ticket types included. If the event does not exist or its status is not `PUBLISHED`, the system SHALL return a 404 error. The response SHALL include the denormalized catalog fields `imageUrl` (string or null), `eventClassification` (string), `description` (string or null), and `duration` (integer, minutes).

#### Scenario: Existing published event
- **WHEN** a client requests `GET /events/:id` with a valid ID of a published event
- **THEN** the system returns the event with all scalar fields (including `imageUrl`, `eventClassification`, `description`, `duration`) plus its `seats` and `ticketTypes` arrays

#### Scenario: Non-existent event
- **WHEN** a client requests `GET /events/:id` with an ID that does not exist
- **THEN** the system returns a 404 Not Found error

#### Scenario: Unpublished event
- **WHEN** a client requests `GET /events/:id` with an ID of an event whose status is `DRAFT` or `CANCELLED`
- **THEN** the system returns a 404 Not Found error

### Requirement: Create event

The system SHALL expose a `POST /events` endpoint authenticated via JWT that allows users with role `ORGANIZER` or `ADMIN` to create a new event. The request body SHALL accept `name`, `date`, `location`, `type` (lowercase `movie` or `show`), `externalId`, `externalSource` (`TMDB` or `TICKETMASTER`), `eventClassification` (non-empty string), `duration` (positive integer, minutes), and optional `seats` and `ticketTypes` arrays. The request body MAY also include optional `imageUrl` (string) and `description` (string). The `organizerId` SHALL be taken from the authenticated user. The event SHALL be created with `status=PUBLISHED`. For each ticket type, `availableCount` SHALL be set equal to `capacity`.

#### Scenario: Create movie event with seats
- **WHEN** an authenticated ORGANIZER submits a valid request with `type=movie`, a non-empty `seats` array, `eventClassification="14"`, and `duration=120`
- **THEN** the system creates the event with status `PUBLISHED`, persists the seats, and returns the full event detail including the denormalized fields

#### Scenario: Create show event with ticket types
- **WHEN** an authenticated ORGANIZER submits a valid request with `type=show`, a non-empty `ticketTypes` array, `eventClassification="Livre"`, and `duration=180`
- **THEN** the system creates the event, persists the ticket types with `availableCount=capacity`, and returns the full event detail including the denormalized fields

#### Scenario: Create event with optional imageUrl and description
- **WHEN** an authenticated ORGANIZER submits a valid request including `imageUrl` and `description`
- **THEN** the system persists those fields on the event and returns them in the response

#### Scenario: Create event without optional imageUrl and description
- **WHEN** an authenticated ORGANIZER submits a valid request without `imageUrl` or `description`
- **THEN** the system creates the event with `imageUrl=null` and `description=null`

#### Scenario: Create event without required eventClassification
- **WHEN** an authenticated ORGANIZER submits a request without `eventClassification`
- **THEN** the system rejects the request with a 400 Bad Request validation error

#### Scenario: Create event without required duration
- **WHEN** an authenticated ORGANIZER submits a request without `duration`
- **THEN** the system rejects the request with a 400 Bad Request validation error

#### Scenario: Create event with non-positive duration
- **WHEN** an authenticated ORGANIZER submits a request with `duration=0` or `duration=-1`
- **THEN** the system rejects the request with a 400 Bad Request validation error

#### Scenario: Create movie event without seats
- **WHEN** an authenticated ORGANIZER submits a request with `type=movie` and no `seats` array
- **THEN** the system rejects the request with a 400 Bad Request error

#### Scenario: Create show event without seats or ticket types
- **WHEN** an authenticated ORGANIZER submits a request with `type=show` and neither `seats` nor `ticketTypes`
- **THEN** the system rejects the request with a 400 Bad Request error

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated client submits a create request
- **THEN** the system returns a 401 Unauthorized error

#### Scenario: Non-organizer role
- **WHEN** an authenticated user with role `CLIENT` submits a create request
- **THEN** the system returns a 403 Forbidden error

### Requirement: Edit event

The system SHALL expose a `PATCH /events/:id` endpoint authenticated via JWT that allows users with role `ORGANIZER` or `ADMIN` to update scalar fields of an existing event. The editable scalar fields SHALL be `name`, `date`, `location`, `status`, `imageUrl`, `eventClassification`, `description`, and `duration`. An `ORGANIZER` SHALL only be allowed to edit events they own; an `ADMIN` SHALL be allowed to edit any event. The `status` field accepts lowercase values (`draft`, `published`, `cancelled`).

#### Scenario: Organizer edits own event
- **WHEN** an authenticated ORGANIZER submits a valid patch for an event they own
- **THEN** the system updates the specified scalar fields and returns the updated event item

#### Scenario: Organizer edits another organizer's event
- **WHEN** an authenticated ORGANIZER submits a patch for an event owned by a different organizer
- **THEN** the system returns a 403 Forbidden error

#### Scenario: Admin edits any event
- **WHEN** an authenticated ADMIN submits a valid patch for any event
- **THEN** the system updates the specified scalar fields and returns the updated event item

#### Scenario: Edit non-existent event
- **WHEN** an authenticated ORGANIZER submits a patch for an ID that does not exist
- **THEN** the system returns a 404 Not Found error

#### Scenario: Organizer edits denormalized catalog fields
- **WHEN** an authenticated ORGANIZER submits a patch with `imageUrl`, `eventClassification`, `description`, or `duration`
- **THEN** the system updates those fields on the event and returns the updated event item

### Requirement: Soft-delete event

The system SHALL expose a `DELETE /events/:id` endpoint authenticated via JWT that performs a soft delete by setting the event's `status` to `CANCELLED`. Ownership rules identical to the edit endpoint apply: `ORGANIZER` may only delete their own events; `ADMIN` may delete any event. The response SHALL return the event ID and the cancelled status.

#### Scenario: Organizer deletes own event
- **WHEN** an authenticated ORGANIZER deletes an event they own
- **THEN** the system sets the event status to `CANCELLED` and returns `{ id, status: 'CANCELLED' }`

#### Scenario: Organizer deletes another organizer's event
- **WHEN** an authenticated ORGANIZER deletes an event owned by a different organizer
- **THEN** the system returns a 403 Forbidden error

#### Scenario: Admin deletes any event
- **WHEN** an authenticated ADMIN deletes any event
- **THEN** the system sets the event status to `CANCELLED` and returns `{ id, status: 'CANCELLED' }`

#### Scenario: Delete non-existent event
- **WHEN** an authenticated user deletes an ID that does not exist
- **THEN** the system returns a 404 Not Found error

### Requirement: Enum casing convention

The system SHALL accept lowercase enum values in URL query parameters and request body fields (`type`, `status`) and SHALL map them to uppercase Prisma enum values internally. Response payloads SHALL return uppercase enum values matching the Prisma representation. The `externalSource` field SHALL use uppercase values (`TMDB`, `TICKETMASTER`) in both request and response.

#### Scenario: Lowercase type in request, uppercase in response
- **WHEN** a client creates an event with `type=movie`
- **THEN** the response returns `type=MOVIE`

#### Scenario: Lowercase status in patch, uppercase in response
- **WHEN** an organizer patches an event with `status=cancelled`
- **THEN** the response returns `status=CANCELLED`

### Requirement: Shared types for cross-app consumption

The system SHALL export event-related TypeScript types from `@elite-dev/shared` so both backend and frontend can share the same contracts. These SHALL include `EventType`, `EventStatus`, `SeatStatus`, request interfaces (`SeatRequest`, `TicketTypeRequest`, `CreateEventRequest`, `UpdateEventRequest`, `QueryEventsParams`), response interfaces (`SeatResponse`, `TicketTypeResponse`, `EventItem`, `EventDetailResponse`), and `PaginatedEventResult`. `CreateEventRequest` SHALL include `eventClassification` (required string), `duration` (required number), and optional `imageUrl` and `description`. `UpdateEventRequest` SHALL include optional `imageUrl`, `eventClassification`, `description`, and `duration`. `EventItem` SHALL include `imageUrl` (string | null), `eventClassification` (string), `description` (string | null), and `duration` (number). The system SHALL additionally export aggregated-movie response interfaces consumed by the `/events/movies` endpoints: `MovieListItem` (with `externalId`, `name`, `imageUrl`, `description`, `eventClassification`, `duration`, `nextSessionDate` as ISO string, and `sessionCount`), `PaginatedMovieListResult` (with `items: MovieListItem[]`, `page`, `totalPages`, `totalResults`), `MovieSession` (with `id` and `date` as ISO string), `MovieSessionsByLocation` (with `location` and `sessions: MovieSession[]`), and `MovieAggregatedDetail` (with the movie display fields plus `sessionsByLocation: MovieSessionsByLocation[]`).

#### Scenario: Frontend imports event types
- **WHEN** the frontend imports from `@elite-dev/shared`
- **THEN** all event-related types are available with uppercase enum values matching the backend response shape, including the denormalized catalog fields

#### Scenario: Frontend imports aggregated movie types
- **WHEN** the frontend imports from `@elite-dev/shared`
- **THEN** `MovieListItem`, `PaginatedMovieListResult`, `MovieSession`, `MovieSessionsByLocation`, and `MovieAggregatedDetail` are available and match the `/events/movies` response shapes

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
