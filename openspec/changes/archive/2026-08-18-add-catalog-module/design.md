## Context

The backend is a NestJS 11 monorepo app (`apps/backend`) using Prisma 7 + Postgres, with an npm workspaces layout (`apps/*`, `packages/*`) where no `packages/` exist yet. The Prisma schema already declares `EventType` (`SHOW`/`MOVIE`) and `ExternalSource` (`TMDB`/`TICKETMASTER`) enums plus an `Event` model, but no catalog code exists (`src/catalog/` is empty). Auth is JWT + Passport with a `RolesGuard` + `@Roles()` decorator in `src/common/`. See `proposal.md` for motivation.

The catalog is a read-through proxy to two external APIs:
- **TMDB** — `api.themoviedb.org/3`, Bearer token auth, 1-indexed pagination, relative image paths.
- **TicketMaster Discovery** — `app.ticketmaster.com/discovery/v2`, API-key query param, 0-indexed pagination, absolute image arrays, results under `_embedded.events[]` (absent when empty).

## Goals / Non-Goals

**Goals:**
- Provide one normalized, role-protected REST surface for searching, browsing, and detailing both external catalogs.
- Establish a shared types package so FE and BE cannot drift on response shapes.
- Isolate external-API specifics behind a provider interface so the controller/service stay source-agnostic.

**Non-Goals:**
- Persisting catalog items. Selection-to-event persistence is a future `events` module keyed by `externalId` + `externalSource`.
- Caching, rate-limiting, or retry policies beyond the HTTP client timeout/redirect config.
- Aggregating movies + shows into a single combined result; each call targets one `type`.
- Frontend implementation of catalog UI (separate change).

## Decisions

### HTTP client: `@nestjs/axios` + `axios`
**Choice:** Use `@nestjs/axios` `HttpModule`/`HttpService` in the catalog module.
**Rationale:** Idiomatic NestJS, injectable `HttpService`, mockable in unit tests via DI. Raw `fetch` would bypass the NestJS DI/test ergonomics.
**Alternatives considered:** Native `fetch` (no DI, harder to mock), `got` (extra dep, less NestJS integration).

### Single `GET /catalog?type=` param instead of per-source routes
**Choice:** One search endpoint with a `type` (`movie`|`show`) query param; the service selects the provider. Details at `GET /catalog/{type}/{externalId}`.
**Rationale:** Simplest FE contract — one call shape per intent, provider chosen by `type`. Keeps `type` lowercase to match REST conventions; it maps to Prisma `EventType` internally.
**Alternatives considered:** Separate `/catalog/movies` and `/catalog/shows` routes (more routes, duplicated controller logic); combined multi-source search (rejected — non-goal).

### Provider strategy pattern via `CatalogProvider` interface
**Choice:** Define `CatalogProvider` (`findAll`, `findOne`) with a `CATALOG_PROVIDER` symbol token; `TmdbProvider` and `TicketmasterProvider` implement it; `CatalogService` selects by `type`.
**Rationale:** Keeps external normalization logic isolated per source and the service/controller source-agnostic. Adding a third source later only adds a provider + a service branch.
**Note:** Providers are concrete injectables (not multi-provided under one token) because selection is by `type` from exactly two known sources; a multi-provider `find()` array would be over-engineering for two providers.

### Shared types as a types-only workspace package (`packages/shared`)
**Choice:** New `@elite-dev/shared` workspace package exporting `.ts` source directly (no build step). FE resolves via Vite/npm workspaces symlink; BE resolves via a `tsconfig` `paths` mapping (`@elite-dev/shared` → `../../packages/shared/src/index.ts`). Only `import type` is used, so types are erased at compile time and no runtime resolution is needed in the BE.
**Rationale:** Monorepo already has workspaces configured; a types-only package avoids a build pipeline and drift. `paths` avoids the `nodenext` + `allowImportingTsExtensions` + `outDir` conflict in the BE tsconfig.
**Alternatives considered:** Codegen from OpenAPI (overkill for one contract); duplicating types in each app (drift risk); a built JS package (unnecessary build step for type-only usage).

### Pagination normalization to 1-indexed
**Choice:** External contract is always 1-indexed. TMDB passes through (already 1-indexed). TicketMaster receives `page - 1` internally and the response converts its 0-indexed `page.number` back to 1-indexed.
**Rationale:** FE deals with one consistent paging model; the 0-indexed quirk is contained inside `TicketmasterProvider`.

### Image normalization
**Choice:** TMDB `poster_path` → `posterUrl` = `{TMDB_IMAGE_BASE_URL}{poster_path}` (null when absent). TicketMaster `images[]` → pick the best single image preferring 16:9 ratio, non-fallback, highest width; null when absent.
**Rationale:** FE always receives an absolute URL or null, never a relative path or an array.

### Auth: `JwtGuard` + `RolesGuard`, roles `ORGANIZER` + `ADMIN`
**Choice:** Both endpoints guarded by `JwtGuard` then `RolesGuard` with `@Roles(Role.ORGANIZER, Role.ADMIN)`.
**Rationale:** Only organizers/admins source events from the catalog; matches the existing guard/decorator pattern in `src/common/` and `src/auth/guards/`.

## Risks / Trade-offs

- **External API outages / rate limits** → No retry/cache yet. Mitigation: surface `502`/`503` to the client rather than crashing; timeouts configured on `HttpModule` (10s). A future change can add caching/rate-limiting.
- **Missing/changed external fields** → Normalization reads optional fields defensively (null when absent). Mitigation: providers map only documented fields; unit tests cover missing-field cases.
- **TicketMaster empty results** → `_embedded` may be absent. Mitigation: `TicketmasterProvider` treats absent `_embedded` as `items: []` with zero totals.
- **Secrets in env** → `TMDB_ACCESS_TOKEN`/`TICKETMASTER_API_KEY` are empty in `.env` and committed only in `.env.example`; real values stay in gitignored `.env`.
- **Shared package resolution differs per app** → FE uses Vite native `.ts` resolution; BE relies on `tsconfig` `paths` (type-only). Mitigation: documented in AGENTS.md-style notes; both apps verified via `npm run build` in tasks.

## Migration Plan

1. Add `packages/shared` and wire it into both apps' `package.json` + BE `tsconfig` `paths`.
2. `npm install` from repo root to symlink the new workspace package.
3. Install `@nestjs/axios` + `axios` in the backend.
4. Implement the catalog module and register it in `AppModule`.
5. Add env vars to `.env` and create `.env.example`.
6. Verify: `npx prisma generate`, backend `lint` + `build`, frontend `lint` + `build`.
7. Rollback: remove `CatalogModule` from `AppModule` imports; the new files/packages are additive and no DB migrations are involved, so removal is safe and reversible.
