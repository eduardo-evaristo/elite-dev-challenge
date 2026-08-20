# Plan: Catalog Module + Shared Types Package

## Overview

A backend catalog module that consumes two external APIs — **TMDB** (movies) and **TicketMaster Discovery** (events) — through a normalized interface, plus a shared types package so the frontend can import the same response shapes.

Three deliverables:

1. **`packages/shared`** — new npm workspace package for types shared between BE and FE
2. **`apps/backend/src/catalog/`** — NestJS catalog module (search, browse, details)
3. **Env vars** — new keys for external API credentials

---

## Research Summary (via Context7)

### TMDB API (movies)

| Aspect | Detail |
|---|---|
| Base URL | `https://api.themoviedb.org/3` |
| Auth | Bearer token header: `Authorization: Bearer {TMDB_ACCESS_TOKEN}` |
| Search | `GET /search/movie?query={q}&page={n}&language=en-US` |
| Browse (no query) | `GET /trending/movie/week?page={n}` or `GET /movie/popular?page={n}` |
| Details | `GET /movie/{movie_id}` |
| Pagination | `page` (1-indexed), response has `total_pages`, `total_results` |
| Movie fields (list) | `id` (int), `title`, `overview`, `poster_path` (relative), `release_date`, `vote_average`, `genre_ids` |
| Movie fields (detail) | + `runtime` (int, minutes), `genres[].name`, `tagline`, `imdb_id`, `status` |
| Images | Relative paths (`/abc.jpg`) — must prepend `https://image.tmdb.org/t/p/w500` |

### TicketMaster Discovery API (events)

| Aspect | Detail |
|---|---|
| Base URL | `https://app.ticketmaster.com/discovery/v2` |
| Auth | API key as query param: `?apikey={TICKETMASTER_API_KEY}` |
| Search | `GET /events.json?keyword={q}&size={n}&page={n}` |
| Browse (no query) | `GET /events.json?size={n}&page={n}` (no keyword) |
| Details | `GET /events/{id}.json` |
| Pagination | `page` (0-indexed!), `size` (page size, max 500); response `page: { size, totalElements, totalPages, number }` |
| Event fields (list) | `id` (string), `name`, `info`, `dates.start.localDate`, `images[]` (absolute URLs), `_embedded.venues[].name`, `url` |
| Event fields (detail) | + `priceRanges[]` (`{ min, max, currency }`), `_embedded.venues[].city.name`, `pleaseNote`, `classifications` |
| Images | Already absolute URLs in `images[]` array (pick best by ratio/width) |

### Key normalization challenges

1. **Pagination offset**: TMDB is 1-indexed, TicketMaster is 0-indexed -> normalize to 1-indexed externally
2. **ID types**: TMDB `int`, TicketMaster `string` -> normalize to `string`
3. **Title field**: TMDB `title`, TicketMaster `name` -> normalize to `title`
4. **Description**: TMDB `overview`, TicketMaster `info` -> normalize to `overview`
5. **Images**: TMDB relative (needs base URL), TicketMaster absolute (pick best from array) -> normalize to `posterUrl`
6. **Date**: TMDB `release_date` (YYYY-MM-DD), TicketMaster `dates.start.localDate` (YYYY-MM-DD) -> normalize to `date`
7. **Response envelope**: TMDB `results[]`, TicketMaster `_embedded.events[]` (may be absent when empty)

---

## 1. Shared Types Package: `packages/shared`

### File structure

```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

### `packages/shared/package.json`

```json
{
  "name": "@elite-dev/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
```

No build step — types-only package, `.ts` source consumed directly via npm workspaces symlink. Both apps use `import type` so no runtime resolution needed.

### `packages/shared/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### `packages/shared/src/index.ts`

All catalog types that the FE needs:

```typescript
export type CatalogType = 'movie' | 'show';

export type ExternalSource = 'TMDB' | 'TICKETMASTER';

export interface CatalogItem {
  externalId: string;
  externalSource: ExternalSource;
  type: CatalogType;
  title: string;
  overview: string;
  posterUrl: string | null;
  date: string | null;
  rating?: number;
  venue?: string;
  externalUrl?: string;
}

export interface CatalogItemDetail extends CatalogItem {
  runtime?: number;
  genres?: string[];
  tagline?: string;
  city?: string;
  priceRange?: { min: number; max: number; currency: string };
}

export interface SearchParams {
  query?: string;
  page?: number;
  size?: number;
}

export interface PaginatedCatalogResult {
  items: CatalogItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}
```

### Wiring

| App | How it resolves `@elite-dev/shared` |
|---|---|
| Frontend | Vite dev/build resolves via npm workspaces symlink -> `exports` -> `.ts` source (Vite handles `.ts` natively). `moduleResolution: "bundler"` + `allowImportingTsExtensions` makes `tsc -b` happy. No tsconfig changes needed. |
| Backend | Add `paths` to `apps/backend/tsconfig.json` (see below). `nodenext` can't resolve `.ts` from `exports` without `allowImportingTsExtensions` (which conflicts with `outDir`). Since only `import type` is used, types are erased at compile time — `paths` is sufficient for typecheck/build, no runtime resolution needed. |

### `apps/backend/tsconfig.json` — add `paths` alongside existing `baseUrl`

```json
"paths": {
  "@elite-dev/shared": ["../../packages/shared/src/index.ts"]
}
```

### Both `apps/backend/package.json` and `apps/frontend/package.json` — add dependency

```json
"@elite-dev/shared": "*"
```

Then from repo root:

```bash
npm install --workspace=apps/backend
npm install --workspace=apps/frontend
```

This re-symlinks the new workspace package into both apps.

---

## 2. Backend Catalog Module

### Dependencies (run from repo root)

```bash
npm install @nestjs/axios axios --workspace=apps/backend
```

### File structure

```
src/catalog/
├── catalog.module.ts
├── catalog.controller.ts
├── catalog.service.ts
├── interfaces/
│   └── catalog-provider.interface.ts
├── providers/
│   ├── tmdb.provider.ts
│   └── ticketmaster.provider.ts
└── dto/
    └── search-catalog.dto.ts
```

### Provider interface (`interfaces/catalog-provider.interface.ts`)

```typescript
import type {
  CatalogItemDetail,
  PaginatedCatalogResult,
  SearchParams,
} from '@elite-dev/shared';

export const CATALOG_PROVIDER = Symbol('CATALOG_PROVIDER');

export interface CatalogProvider {
  findAll(params: SearchParams): Promise<PaginatedCatalogResult>;
  findOne(externalId: string): Promise<CatalogItemDetail>;
}
```

### DTO (`dto/search-catalog.dto.ts`) — lowercase `type`

```typescript
import { IsIn, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class SearchCatalogDto {
  @IsString()
  @IsIn(['movie', 'show'])
  type: 'movie' | 'show';

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number;
}
```

### TmdbProvider (`providers/tmdb.provider.ts`)

Uses `HttpService` (from `@nestjs/axios`) + `ConfigService` for credentials.

| Method | Endpoint | Behavior |
|---|---|---|
| `findAll({ query, page })` | query present -> `GET /search/movie?query={q}&page={p}` | Search by keyword |
| `findAll({ page })` | query absent -> `GET /trending/movie/week?page={p}` | Browse trending |
| `findOne(id)` | `GET /movie/{id}` | Full details |

Normalization:

- `id` (int) -> `externalId` (string)
- `poster_path` -> `posterUrl` = `{TMDB_IMAGE_BASE_URL}{poster_path}` (null if absent)
- `title` -> `title`, `overview` -> `overview`, `release_date` -> `date`
- `vote_average` -> `rating`
- `genres[].name` -> `genres` (findOne only)
- `runtime` -> `runtime` (findOne only)
- `tagline` -> `tagline` (findOne only)
- `externalSource: 'TMDB'`, `type: 'movie'`
- Page is 1-indexed -> pass through directly
- Auth: `Authorization: Bearer {TMDB_ACCESS_TOKEN}` header
- Defaults: `page=1`, `size=20`

### TicketmasterProvider (`providers/ticketmaster.provider.ts`)

| Method | Endpoint | Behavior |
|---|---|---|
| `findAll({ query, page, size })` | `GET /events.json?keyword={q}&size={s}&page={p-1}` | Search (page converted to 0-indexed) |
| `findAll({ page, size })` | `GET /events.json?size={s}&page={p-1}` | Browse (no keyword) |
| `findOne(id)` | `GET /events/{id}.json` | Full details |

Normalization:

- `id` -> `externalId` (already string)
- `images[]` -> `posterUrl` = pick best image (prefer `16_9` ratio, non-fallback, highest width; null if absent)
- `name` -> `title`, `info` -> `overview`, `dates.start.localDate` -> `date`
- `_embedded.venues[0].name` -> `venue`
- `_embedded.venues[0].city.name` -> `city` (findOne only)
- `priceRanges[0]` -> `priceRange` (findOne only)
- `url` -> `externalUrl`
- `externalSource: 'TICKETMASTER'`, `type: 'show'`
- Page: convert TM 0-indexed -> 1-indexed in response
- `page.totalElements` -> `totalResults`, `page.totalPages` -> `totalPages`
- Handle missing `_embedded` (empty results) -> return `items: []`
- Auth: `apikey` query param
- Defaults: `page=1`, `size=20`

### CatalogService (`catalog.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { TmdbProvider } from './providers/tmdb.provider';
import { TicketmasterProvider } from './providers/ticketmaster.provider';
import { CatalogProvider } from './interfaces/catalog-provider.interface';
import type { CatalogItemDetail, PaginatedCatalogResult, SearchParams } from '@elite-dev/shared';

@Injectable()
export class CatalogService {
  constructor(
    private readonly tmdbProvider: TmdbProvider,
    private readonly ticketmasterProvider: TicketmasterProvider,
  ) {}

  findAll(type: 'movie' | 'show', params: SearchParams): Promise<PaginatedCatalogResult> {
    return this.getProvider(type).findAll(params);
  }

  findOne(type: 'movie' | 'show', externalId: string): Promise<CatalogItemDetail> {
    return this.getProvider(type).findOne(externalId);
  }

  private getProvider(type: 'movie' | 'show'): CatalogProvider {
    return type === 'movie' ? this.tmdbProvider : this.ticketmasterProvider;
  }
}
```

### Controller (`catalog.controller.ts`) — lowercase params

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { SearchCatalogDto } from './dto/search-catalog.dto';
import { Roles } from 'src/common/roles.decorator';
import { RolesGuard } from 'src/common/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import JwtGuard from 'src/auth/guards/jwt.guard';

@Controller('catalog')
@UseGuards(JwtGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @Roles(Role.ORGANIZER, Role.ADMIN)
  findAll(@Query() dto: SearchCatalogDto) {
    return this.catalogService.findAll(dto.type, {
      query: dto.query,
      page: dto.page ?? 1,
      size: dto.size ?? 20,
    });
  }

  @Get(':type/:externalId')
  @Roles(Role.ORGANIZER, Role.ADMIN)
  findOne(
    @Param('type') type: 'movie' | 'show',
    @Param('externalId') externalId: string,
  ) {
    return this.catalogService.findOne(type, externalId);
  }
}
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/catalog?type=movie&query=inception&page=1` | Search movies on TMDB |
| `GET` | `/catalog?type=movie&page=1` | Browse trending movies |
| `GET` | `/catalog?type=show&query=taylor&page=1` | Search events on TicketMaster |
| `GET` | `/catalog?type=show&page=1` | Browse events |
| `GET` | `/catalog/movie/550` | Movie details by TMDB id |
| `GET` | `/catalog/show/G5diZfkn0B-bh` | Event details by TicketMaster id |

### Module (`catalog.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TmdbProvider } from './providers/tmdb.provider';
import { TicketmasterProvider } from './providers/ticketmaster.provider';

@Module({
  imports: [HttpModule.register({ timeout: 10000, maxRedirects: 5 })],
  controllers: [CatalogController],
  providers: [CatalogService, TmdbProvider, TicketmasterProvider],
  exports: [CatalogService],
})
export class CatalogModule {}
```

Register `CatalogModule` in `src/app.module.ts` imports array.

---

## 3. Environment Variables

### Add to `apps/backend/.env` (empty values — fill in keys later)

```env
TMDB_ACCESS_TOKEN=
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/w500
TICKETMASTER_API_KEY=
TICKETMASTER_BASE_URL=https://app.ticketmaster.com/discovery/v2
```

### Create `apps/backend/.env.example` documenting all required vars

```env
DATABASE_URL=postgres://postgres:password@localhost:15432/elite-dev-challenge
JWT_SECRET=your-jwt-secret-here
PORT=3000
NODE_ENV=development

# Catalog module — external APIs
TMDB_ACCESS_TOKEN=
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/w500
TICKETMASTER_API_KEY=
TICKETMASTER_BASE_URL=https://app.ticketmaster.com/discovery/v2
```

---

## 4. Implementation Order

| Step | Action |
|---|---|
| 1 | Create `packages/shared/` (package.json, tsconfig.json, src/index.ts) |
| 2 | Add `"@elite-dev/shared": "*"` to both `apps/backend/package.json` and `apps/frontend/package.json` |
| 3 | Add `paths` mapping to `apps/backend/tsconfig.json` |
| 4 | From repo root: `npm install --workspace=apps/backend --workspace=apps/frontend` (symlinks the new workspace package) |
| 5 | From repo root: `npm install @nestjs/axios axios --workspace=apps/backend` |
| 6 | Create `src/catalog/interfaces/catalog-provider.interface.ts` |
| 7 | Create `src/catalog/dto/search-catalog.dto.ts` |
| 8 | Create `src/catalog/providers/tmdb.provider.ts` |
| 9 | Create `src/catalog/providers/ticketmaster.provider.ts` |
| 10 | Create `src/catalog/catalog.service.ts` |
| 11 | Create `src/catalog/catalog.controller.ts` |
| 12 | Create `src/catalog/catalog.module.ts` |
| 13 | Register `CatalogModule` in `src/app.module.ts` |
| 14 | Add env vars to `apps/backend/.env` |
| 15 | Create `apps/backend/.env.example` |

---

## 5. Verification

```bash
# From repo root — regenerate prisma client (needed for build)
cd apps/backend && npx prisma generate

# Backend
npm run lint
npm run build

# Frontend (verify shared package doesn't break FE typecheck)
cd ../frontend
npm run lint
npm run build
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| HTTP client | `@nestjs/axios` + `axios` | Idiomatic NestJS, injectable `HttpService`, better testability via mocking |
| Auth on catalog endpoints | `JwtGuard` + `RolesGuard` (`ORGANIZER`, `ADMIN`) | Only organizers/admins browse the catalog (for event creation) |
| Scope | `findAll` (search/browse) + `findOne` (details) | FE needs both: list for selection step, details for confirmation step |
| Endpoint design | Single `GET /catalog?type=` param | Simplest for FE — one API call per type, service selects provider |
| `type` param values | lowercase (`movie`, `show`) | Matches REST conventions; mapped to Prisma `EventType` enum internally |
| Shared types | `packages/shared` workspace package | Monorepo already has workspaces configured; FE (Vite/bundler) and BE (via `paths`) both resolve `.ts` source |
| No repository/Prisma layer | Pure read-through proxy | Catalog is a passthrough to external APIs; persistence happens later in a separate `events` module using `externalId` + `externalSource` |
