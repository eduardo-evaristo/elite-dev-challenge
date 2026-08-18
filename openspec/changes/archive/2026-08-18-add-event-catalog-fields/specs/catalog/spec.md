## MODIFIED Requirements

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

### Requirement: Shared type contract

The frontend and backend SHALL share the catalog response types via a workspace package (`@elite-dev/shared`) exporting `CatalogItem`, `CatalogItemDetail`, `SearchParams`, and `PaginatedCatalogResult`. `CatalogItemDetail` SHALL include an optional `certification` field (string) representing the age rating extracted from the external source. The backend SHALL use these types as its response contract; the frontend SHALL import them as type-only imports.

#### Scenario: Frontend imports shared types
- **WHEN** the frontend renders catalog search results
- **THEN** it imports `CatalogItem` and `PaginatedCatalogResult` as types from `@elite-dev/shared` matching the backend response shape

#### Scenario: Frontend uses certification from catalog detail
- **WHEN** the frontend fetches a movie detail via `GET /catalog/movie/:id` and the response includes `certification`
- **THEN** the frontend can use the `certification` field from `CatalogItemDetail` to pre-fill the event creation form
