## Context

The `Event` model currently stores only `name`, `date`, `location`, `type`, `status`, `externalId`, and `externalSource`. The catalog module (`CatalogModule`) proxies TMDB and Ticketmaster APIs at runtime, but the data needed to render an event (poster image, age classification, description, duration) is not persisted — it would require live external API calls on every render. The TMDB provider's `findOne` endpoint fetches movie details via `/movie/{id}` but does not request `release_dates` (which contain age certifications). See proposal.md for motivation.

The existing module pattern is controller → service → repository → PrismaService, established in `users` and `catalog` modules. The `EventsModule` was recently added with the same pattern. Shared types live in `@elite-dev/shared` (`packages/shared/src/index.ts`).

## Goals / Non-Goals

**Goals:**
- Persist denormalized catalog data (`imageUrl`, `eventClassification`, `description`, `duration`) on the `Event` model so the backend never needs to call external APIs to render event lists or details
- Make `eventClassification` and `duration` required at creation time; `imageUrl` and `description` optional
- Expose movie age certification (`certification`) in the catalog detail endpoint so the frontend can pre-fill `eventClassification` during event creation
- Allow all 4 new fields to be edited via `PATCH /events/:id`

**Non-Goals:**
- Implementing the frontend wizard steps 3-5 (form UI, pre-fill logic, POST /events call) — separate change
- Fetching certifications in catalog list endpoints (TMDB `/trending` and `/search` do not support `append_to_response` and do not return certifications)
- Capturing `pleaseNote` from Ticketmaster events
- Validating data provenance at the backend (whether `eventClassification` originated from TMDB or was manually entered) — that is frontend responsibility
- Backfilling existing `Event` rows with default values for the new non-nullable fields (the migration will set sensible defaults for existing rows)

## Decisions

### 1. Denormalize at creation time, not at query time

The frontend fetches catalog data during the event creation wizard, pre-fills the form (movies: `overview` → `description`, `runtime` → `duration`, `certification` → `eventClassification`, `poster_path` → `imageUrl`; shows: all manual), and sends everything in `POST /events`. The backend persists and never re-fetches from external APIs.

**Alternative considered**: A "lazy enrichment" approach where the backend fetches catalog data on first access and caches it. Rejected because it adds latency to the first read, couples the events module to the catalog module, and requires error handling for external API failures during reads.

### 2. `eventClassification` required for both movies and shows

TMDB provides certifications by country (BR: `L, 10, 12, 14, 16, 18`), but Ticketmaster has no age rating field. Making `eventClassification` required for both types means show organizers must enter it manually. This is acceptable because age classification is a legal/operational requirement for ticketed events regardless of source.

**Alternative considered**: Required only for movies, optional for shows. Rejected per user decision — classification is always required for compliance.

### 3. `duration` required for both movies and shows

TMDB provides `runtime` (minutes) in movie details. Ticketmaster has no reliable duration field (`dates.end.dateTime` is frequently `null`). Making `duration` required ensures every event has a known duration for scheduling and display.

**Alternative considered**: Required only for movies, optional for shows. Rejected per user decision — duration is always required for scheduling.

### 4. `imageUrl` and `description` nullable

Not all catalog items have posters (TMDB `poster_path` can be `null`; Ticketmaster images array can be empty). Description is useful but not essential — show organizers may leave it blank, and movie organizers may prefer the TMDB overview or write their own.

### 5. `certification` added to `CatalogItemDetail` via `append_to_response`

The TMDB `/movie/{id}` endpoint supports `append_to_response=release_dates`, which returns an array of country-coded release date entries each containing a `certification` string. The provider filters for `iso_3166_1 === "BR"` and extracts the first `release_dates[0].certification`. This avoids a separate API call (would be `GET /movie/{id}/release_dates`) and keeps the detail endpoint at one request.

**Alternative considered**: Separate `/movie/{id}/release_dates` call. Rejected — doubles API calls for no benefit; `append_to_response` is the idiomatic TMDB pattern for combining related data.

### 6. Certification filtering: BR only, first entry

The BR release dates array may contain multiple entries (theatrical, home video, etc.). We take the first entry's `certification` as the primary rating. If no BR entry exists, `certification` is `undefined`.

### 7. All 4 fields editable via PATCH

The `UpdateEventDto` extends its `PickType` array to include `imageUrl`, `eventClassification`, `description`, and `duration`. This follows the existing scalar-only PATCH pattern (no nested relation edits). `PartialType` makes them all optional, so the organizer can patch any subset.

### 8. Migration strategy for existing rows

The migration adds `eventClassification` (non-nullable String) and `duration` (non-nullable Int) to a table that may have existing rows. The migration SQL will set `DEFAULT ''` for `eventClassification` and `DEFAULT 0` for `duration` so existing rows get placeholder values. After migration, the `DEFAULT` can be dropped if desired, or kept as a safety net. The Prisma schema declares them as non-nullable without defaults — the migration handles the transition.

## Risks / Trade-offs

- **[Breaking change for existing API consumers]** `POST /events` now requires `eventClassification` and `duration`. Any client calling the endpoint without these fields will get a 400. Mitigated: the frontend wizard (steps 3-5) is not yet implemented, so no existing FE flow calls this endpoint. The backend tests will be updated.
- **[Existing DB rows have placeholder values]** If there are existing `Event` rows, they will have `eventClassification=""` and `duration=0` after migration. Mitigated: these can be updated via PATCH or a manual backfill script. In practice, the database may be empty or have test data only.
- **[TMDB `append_to_response` increases response payload size]** Adding `release_dates` to the movie detail response increases the payload. This is negligible — release dates are a small array and the detail endpoint is called once per movie selection, not in bulk.
- **[No validation of `eventClassification` values]** The backend accepts any non-empty string. A typo like `"42"` would be persisted. Mitigated: this is by design — different countries have different rating systems, and the frontend will provide a curated dropdown for BR ratings.

## Migration Plan

1. Create Prisma migration: `npx prisma migrate dev --name add_event_catalog_fields`
2. The migration SQL adds 4 columns: `imageUrl` (nullable), `eventClassification` (non-nullable, default `""` for existing rows), `description` (nullable), `duration` (non-nullable, default `0` for existing rows)
3. Run `npx prisma generate` to regenerate the Prisma client (gitignored, required for compilation)
4. Update backend code (DTOs, service, provider, tests)
5. Verify: `npm run lint`, `npm test`, `npm run build` in `apps/backend`; `npm run build` in `apps/frontend`
6. Rollback: `npx prisma migrate resolve --rolled-back <migration-name>` (if needed before deployment)
