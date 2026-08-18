## Purpose

Lets organizers and admins search, browse, and inspect external movie (TMDB) and show (TicketMaster) catalog entries through a single normalized read-through API, so they can source content to publish as bookable events.

## Requirements

### Requirement: Catalog search by keyword

The system SHALL expose an authenticated `GET /catalog` endpoint that accepts `type` (`movie` | `show`), an optional `query`, and optional `page`/`size` parameters, and returns a paginated list of normalized catalog items for the requested type. When `query` is present, the system SHALL perform a keyword search against the external source mapped to `type`. When `query` is absent, the system SHALL return a default browse list (trending/popular) for that type.

#### Scenario: Search movies by keyword
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog?type=movie&query=inception&page=1`
- **THEN** the system returns a `PaginatedCatalogResult` whose `items` are movies from TMDB matching "inception", each normalized to a `CatalogItem` with `externalSource: "TMDB"` and `type: "movie"`

#### Scenario: Browse movies without a query
- **WHEN** an authenticated `ADMIN` requests `GET /catalog?type=movie&page=1`
- **THEN** the system returns trending movies from TMDB normalized to `CatalogItem` entries

#### Scenario: Search shows by keyword
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog?type=show&query=taylor&page=1`
- **THEN** the system returns events from TicketMaster matching "taylor", each normalized to a `CatalogItem` with `externalSource: "TICKETMASTER"` and `type: "show"`

#### Scenario: Browse shows without a query
- **WHEN** an authenticated `ADMIN` requests `GET /catalog?type=show&page=1`
- **THEN** the system returns a browse list of TicketMaster events normalized to `CatalogItem` entries

### Requirement: Catalog item details

The system SHALL expose an authenticated `GET /catalog/{type}/{externalId}` endpoint that returns the full normalized details for a single catalog entry from the external source mapped to `type`. For movies (`type=movie`), the system SHALL fetch release date information from TMDB using `append_to_response=release_dates` and extract the Brazilian age certification (`iso_3166_1 === "BR"`) into the `certification` field of `CatalogItemDetail` when available.

#### Scenario: Movie details by TMDB id
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog/movie/550`
- **THEN** the system returns a `CatalogItemDetail` from TMDB for movie id 550, including `genres`, `runtime`, `tagline`, and `certification` when present

#### Scenario: Movie details with Brazilian certification
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog/movie/550` and TMDB returns release dates containing a BR entry with `certification: "14"`
- **THEN** the returned `CatalogItemDetail` includes `certification: "14"`

#### Scenario: Movie details without Brazilian certification
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog/movie/550` and TMDB returns release dates with no BR entry
- **THEN** the returned `CatalogItemDetail` includes `certification: undefined`

#### Scenario: Show details by TicketMaster id
- **WHEN** an authenticated `ADMIN` requests `GET /catalog/show/G5diZfkn0B-bh`
- **THEN** the system returns a `CatalogItemDetail` from TicketMaster for that event id, including `venue`, `city`, and `priceRange` when present, and `certification` is not present (shows have no age rating)

#### Scenario: Detail not found
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog/movie/999999999` and the external source returns no such resource
- **THEN** the system responds with a `404 Not Found`

### Requirement: Access control

The catalog endpoints SHALL require a valid JWT and SHALL only allow users with role `ORGANIZER` or `ADMIN`. All other roles and unauthenticated requests SHALL be rejected.

#### Scenario: Unauthenticated request rejected
- **WHEN** an unauthenticated client requests `GET /catalog?type=movie&page=1`
- **THEN** the system responds with `401 Unauthorized`

#### Scenario: Unauthorized role rejected
- **WHEN** an authenticated `CLIENT` requests `GET /catalog?type=movie&page=1`
- **THEN** the system responds with `403 Forbidden`

### Requirement: Input validation

The system SHALL validate catalog query parameters. `type` SHALL be exactly `movie` or `show`; `page` SHALL be an integer >= 1 when present; `size` SHALL be an integer between 1 and 50 when present; `query` SHALL be a string when present.

#### Scenario: Invalid type rejected
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog?type=concert&page=1`
- **THEN** the system responds with `400 Bad Request`

#### Scenario: Out-of-range page rejected
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog?type=movie&page=0`
- **THEN** the system responds with `400 Bad Request`

### Requirement: Normalized pagination contract

The system SHALL expose pagination as 1-indexed externally. The response `page`, `totalPages`, and `totalResults` SHALL reflect the external source's totals converted to 1-indexed paging, regardless of the external source's native indexing. When `page` is omitted it SHALL default to 1; when `size` is omitted it SHALL default to 20.

#### Scenario: TicketMaster 0-indexed pagination normalized to 1-indexed
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog?type=show&page=2`
- **THEN** the response `page` is `2` and the system requested page `1` from TicketMaster internally

#### Scenario: Defaults applied
- **WHEN** an authenticated `ORGANIZER` requests `GET /catalog?type=movie` with no `page` or `size`
- **THEN** the system uses `page=1` and `size=20` against the external source

### Requirement: Normalized item contract

Each catalog item returned SHALL conform to a shared `CatalogItem` shape: `externalId` (string), `externalSource` (`TMDB` | `TICKETMASTER`), `type` (`movie` | `show`), `title`, `overview`, `posterUrl` (absolute URL or null), and `date` (ISO date string or null). The system SHALL normalize source-specific fields into this contract: TMDB `title`/`overview`/`release_date`/`poster_path` and TicketMaster `name`/`info`/`dates.start.localDate`/`images[]`.

#### Scenario: TMDB relative poster path normalized to absolute URL
- **WHEN** a TMDB movie has `poster_path: "/abc.jpg"`
- **THEN** the returned `posterUrl` is an absolute URL combining the configured TMDB image base URL with `/abc.jpg`

#### Scenario: TMDB integer id normalized to string
- **WHEN** a TMDB movie has `id: 550` (integer)
- **THEN** the returned `externalId` is `"550"` (string)

#### Scenario: TicketMaster image array reduced to single best image
- **WHEN** a TicketMaster event has an `images[]` array of multiple ratios
- **THEN** the returned `posterUrl` is the single best image (preferring 16:9 ratio, non-fallback, highest width), or null when no images exist

### Requirement: Empty result handling

The system SHALL return an empty `items` array (not an error) when an external source returns no matches.

#### Scenario: TicketMaster missing embedded events
- **WHEN** a TicketMaster search returns a response with no `_embedded` field
- **THEN** the system returns `items: []` with zero totals rather than throwing

### Requirement: External source failure handling

When an external catalog source returns an error or is unreachable, the system SHALL surface a client-facing error response rather than crashing, and SHALL not persist partial results.

#### Scenario: External API error
- **WHEN** TMDB responds with a `5xx` status during a search
- **THEN** the system responds to the client with an appropriate error status (e.g. `502 Bad Gateway` or `503`) and returns no items

### Requirement: Shared type contract

The frontend and backend SHALL share the catalog response types via a workspace package (`@elite-dev/shared`) exporting `CatalogItem`, `CatalogItemDetail`, `SearchParams`, and `PaginatedCatalogResult`. `CatalogItemDetail` SHALL include an optional `certification` field (string) representing the age rating extracted from the external source. The backend SHALL use these types as its response contract; the frontend SHALL import them as type-only imports.

#### Scenario: Frontend imports shared types
- **WHEN** the frontend renders catalog search results
- **THEN** it imports `CatalogItem` and `PaginatedCatalogResult` as types from `@elite-dev/shared` matching the backend response shape

#### Scenario: Frontend uses certification from catalog detail
- **WHEN** the frontend fetches a movie detail via `GET /catalog/movie/:id` and the response includes `certification`
- **THEN** the frontend can use the `certification` field from `CatalogItemDetail` to pre-fill the event creation form
