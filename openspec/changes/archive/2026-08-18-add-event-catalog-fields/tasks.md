## 1. Prisma Schema & Migration

- [x] 1.1 Add `imageUrl String?`, `eventClassification String`, `description String?`, and `duration Int` to the `Event` model in `apps/backend/prisma/schema.prisma`
- [x] 1.2 Run `npx prisma migrate dev --name add_event_catalog_fields` from `apps/backend` (ensure docker-compose Postgres is running)
- [x] 1.3 Run `npx prisma generate` from `apps/backend` to regenerate the gitignored Prisma client

## 2. Shared Types

- [x] 2.1 Add `imageUrl?: string`, `eventClassification: string`, `description?: string`, `duration: number` to `CreateEventRequest` in `packages/shared/src/index.ts`
- [x] 2.2 Add `imageUrl?: string`, `eventClassification?: string`, `description?: string`, `duration?: number` to `UpdateEventRequest` in `packages/shared/src/index.ts`
- [x] 2.3 Add `imageUrl: string | null`, `eventClassification: string`, `description: string | null`, `duration: number` to `EventItem` in `packages/shared/src/index.ts`
- [x] 2.4 Add `certification?: string` to `CatalogItemDetail` in `packages/shared/src/index.ts`

## 3. Backend DTOs

- [x] 3.1 Add `imageUrl` (`@IsOptional`, `@IsString`), `eventClassification` (`@IsString`, `@IsNotEmpty`), `description` (`@IsOptional`, `@IsString`), `duration` (`@IsInt`, `@Min(1)`) to `CreateEventDto` in `apps/backend/src/events/dto/create-event.dto.ts`
- [x] 3.2 Add `imageUrl`, `eventClassification`, `description`, `duration` to the `PickType` array in `UpdateEventDto` in `apps/backend/src/events/dto/update-event.dto.ts`

## 4. Backend Service

- [x] 4.1 Add `imageUrl`, `eventClassification`, `description`, `duration` to the `EventData` interface in `apps/backend/src/events/events.service.ts`
- [x] 4.2 Pass `dto.imageUrl`, `dto.eventClassification`, `dto.description`, `dto.duration` in the `data` object within `create()` in `apps/backend/src/events/events.service.ts`
- [x] 4.3 Add conditional passes for `imageUrl`, `eventClassification`, `description`, `duration` (using `dto.x !== undefined` pattern) in `update()` in `apps/backend/src/events/events.service.ts`
- [x] 4.4 Add `imageUrl`, `eventClassification`, `description`, `duration` to the response object in `toEventItem()` in `apps/backend/src/events/events.service.ts`

## 5. TMDB Provider

- [x] 5.1 Add `TmdbReleaseDate` and `TmdbReleaseDatesResponse` interfaces, and add `release_dates?: TmdbReleaseDatesResponse` to `TmdbMovieDetail` in `apps/backend/src/catalog/providers/tmdb.provider.ts`
- [x] 5.2 Add `append_to_response: 'release_dates'` to the params in `findOne()` in `apps/backend/src/catalog/providers/tmdb.provider.ts`
- [x] 5.3 Extract BR certification (`iso_3166_1 === 'BR'`, first `release_dates[0].certification`) and add `certification` to the return of `toCatalogItemDetail()` in `apps/backend/src/catalog/providers/tmdb.provider.ts`

## 6. Tests

- [x] 6.1 Add `imageUrl`, `eventClassification`, `description`, `duration` to `mockEvent` in `apps/backend/src/events/events.repository.spec.ts`

## 7. Verification

- [x] 7.1 Run `npm run lint` in `apps/backend` (eslint with --fix)
- [x] 7.2 Run `npm test` in `apps/backend` (jest unit tests — events.repository.spec)
- [x] 7.3 Run `npm run build` in `apps/backend` (nest build)
- [x] 7.4 Run `npm run build` in `apps/frontend` (tsc -b && vite build — validates shared types consistency)
