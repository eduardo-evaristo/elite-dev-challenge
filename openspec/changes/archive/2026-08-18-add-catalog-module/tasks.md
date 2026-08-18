## 1. Shared types package

- [x] 1.1 Create `packages/shared/package.json` (name `@elite-dev/shared`, private, `type: module`, `exports` pointing at `./src/index.ts`)
- [x] 1.2 Create `packages/shared/tsconfig.json` (`moduleResolution: bundler`, `strict`, `verbatimModuleSyntax`, `declaration`, `noEmit`)
- [x] 1.3 Create `packages/shared/src/index.ts` exporting `CatalogType`, `ExternalSource`, `CatalogItem`, `CatalogItemDetail`, `SearchParams`, `PaginatedCatalogResult`
- [x] 1.4 Add `"@elite-dev/shared": "*"` dependency to `apps/backend/package.json` and `apps/frontend/package.json`
- [x] 1.5 Add `paths` mapping for `@elite-dev/shared` to `apps/backend/tsconfig.json` alongside existing `baseUrl`
- [x] 1.6 From repo root run `npm install --workspace=apps/backend --workspace=apps/frontend` to symlink the new workspace package

## 2. Backend dependencies and config

- [x] 2.1 From repo root run `npm install @nestjs/axios axios --workspace=apps/backend`
- [x] 2.2 Add catalog env vars to `apps/backend/.env` (`TMDB_ACCESS_TOKEN`, `TMDB_BASE_URL`, `TMDB_IMAGE_BASE_URL`, `TICKETMASTER_API_KEY`, `TICKETMASTER_BASE_URL`) with empty/placeholder credentials
- [x] 2.3 Create `apps/backend/.env.example` documenting all required vars (DB, JWT, port, node env, and the five catalog vars)

## 3. Catalog module scaffolding

- [x] 3.1 Create `src/catalog/interfaces/catalog-provider.interface.ts` defining `CatalogProvider` (`findAll`, `findOne`) and the `CATALOG_PROVIDER` symbol, importing shared types as `import type`
- [x] 3.2 Create `src/catalog/dto/search-catalog.dto.ts` with `SearchCatalogDto` (validated `type` ∈ `['movie','show']`, optional `query`, `page` ≥ 1, `size` 1–50) using `class-validator`
- [x] 3.3 Create `src/catalog/catalog.module.ts` importing `HttpModule.register({ timeout: 10000, maxRedirects: 5 })`, declaring controller/providers and exporting `CatalogService`

## 4. External providers

- [x] 4.1 Implement `src/catalog/providers/tmdb.provider.ts`: `findAll` (search `/search/movie` when `query` present, else `/trending/movie/week`), `findOne` (`/movie/{id}`); Bearer token auth; normalize `id`→`externalId` (string), `poster_path`→absolute `posterUrl`, `title`/`overview`/`release_date`/`vote_average`, and detail-only `genres`/`runtime`/`tagline`; 1-indexed paging; defaults `page=1`, `size=20`
- [x] 4.2 Implement `src/catalog/providers/ticketmaster.provider.ts`: `findAll` (`/events.json` with `keyword` when query present, else no keyword), `findOne` (`/events/{id}.json`); `apikey` query-param auth; convert 1-indexed→0-indexed on request and back on response; normalize `name`→`title`, `info`→`overview`, `dates.start.localDate`→`date`, `images[]`→single best `posterUrl` (prefer 16:9, non-fallback, highest width), `venues[0].name`→`venue`, detail-only `city`/`priceRanges`; treat absent `_embedded` as `items: []` with zero totals

## 5. Service and controller

- [x] 5.1 Implement `src/catalog/catalog.service.ts` selecting the provider by `type` (`movie`→Tmdb, `show`→Ticketmaster) and delegating `findAll`/`findOne`, returning the shared contract types
- [x] 5.2 Implement `src/catalog/catalog.controller.ts`: `@Controller('catalog')` with `JwtGuard` + `RolesGuard` and `@Roles(Role.ORGANIZER, Role.ADMIN)`; `@Get()` returning `catalogService.findAll(dto.type, { query, page ?? 1, size ?? 20 })`; `@Get(':type/:externalId')` returning `catalogService.findOne(type, externalId)`; map external not-found to `404` and external errors to an appropriate client-facing status
- [x] 5.3 Register `CatalogModule` in `src/app.module.ts` imports array

## 6. Verification

- [x] 6.1 From `apps/backend` run `npx prisma generate`
- [x] 6.2 From `apps/backend` run `npm run lint` and resolve any issues
- [x] 6.3 From `apps/backend` run `npm run build` and confirm it compiles
- [x] 6.4 From `apps/frontend` run `npm run lint` and confirm the shared package resolves
- [x] 6.5 From `apps/frontend` run `npm run build` and confirm `tsc -b` + Vite build pass
- [x] 6.6 Manually verify catalog endpoints respond (with real or mocked credentials): `GET /catalog?type=movie&page=1`, `GET /catalog?type=show&query=taylor&page=1`, `GET /catalog/movie/550`, `GET /catalog/show/{id}`
