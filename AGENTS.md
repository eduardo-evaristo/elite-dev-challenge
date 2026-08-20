# AGENTS.md

## Repository layout
npm workspaces monorepo (`apps/*`, `packages/*`). Root `package.json` has no scripts — run all commands inside `apps/backend` or `apps/frontend`. Install everything from the repo root: `npm install`.

### `packages/shared` (`@elite-dev/shared`)
Shared catalog types (`CatalogItem`, `CatalogType`, `SearchParams`, `PaginatedCatalogResult`, etc.) consumed by both apps. Source is raw TS (`src/index.ts`) exposed via package `exports` — **no build step** (`noEmit`). Import as `@elite-dev/shared`.

## Backend — `apps/backend` (NestJS 11, Prisma 7, Postgres)

### Commands (run from `apps/backend`)
- `npm run dev` — dev server (watch), listens on `PORT` env or 3000
- `npm run build` — `nest build` → `dist/`; `npm run start:prod` = `node dist/main`
- `npm run lint` — eslint **with `--fix`** (auto-fixes). Type-aware rules (`recommendedTypeChecked` + `projectService`) need the tsconfig and can be slow.
- `npm test` — jest unit tests (`src/**/*.spec.ts`); `npm run test:e2e` — e2e (`test/**/*.e2e-spec.ts`); `npm run test:cov` — coverage
- Single test: `npx jest <file-or-pattern>`
- `npm run format` — prettier write on `src/` and `test/`

### Prisma — critical setup
- Prisma 7's `prisma-client` generator writes to `src/generated/prisma` (`moduleFormat: cjs`). **This generated client is gitignored** (`.gitignore` matches `generated`) — run `npx prisma generate` from `apps/backend` before the backend will compile, run, or pass tests. There is no `prisma` npm script; use `npx prisma <cmd>`.
- Config lives in `prisma.config.ts` (Prisma 7 config file; loads `dotenv`, points at `prisma/schema.prisma`, reads `DATABASE_URL`).
- Uses the `@prisma/adapter-pg` driver adapter (`src/prisma.service.ts`), not the default Prisma connection pool.
- Import generated types via `../generated/prisma/{enums,models,client}`.
- Migrations in `prisma/migrations/`; `npx prisma migrate dev` (dev) / `migrate deploy` (prod).

### Database
Postgres 16 via `docker-compose.yml` (repo root): host port **15432** → container 5432, db `elite-dev-challenge`, user `postgres`. `docker compose up -d` before running the backend.

### Required env vars (`.env`, gitignored; see `.env.example`)
- Core: `DATABASE_URL`, `JWT_SECRET`, `PORT` (default 3000), `NODE_ENV`, `CORS_ORIGINS` (comma-separated, required). `ConfigModule` loads in order: `.env.production`, `.env`, `.env.development`.
- Catalog module (external APIs): `TMDB_ACCESS_TOKEN`, `TMDB_BASE_URL`, `TMDB_IMAGE_BASE_URL`, `TICKETMASTER_API_KEY`, `TICKETMASTER_BASE_URL`. Providers fall back to default URLs but need keys to return real data.

### Import convention
Cross-module imports use the tsconfig `baseUrl: "./"` absolute form, e.g. `from 'src/users/users.module'`, `from 'src/prisma.service'`. Relative `./` or `../` imports are used within a module; match neighboring code.

### TypeScript
`module`/`moduleResolution`: `nodenext`. Full `strict` is **not** enabled, but `strictNullChecks` is on; `noImplicitAny` and `strictPropertyInitialization` are false.

### App wiring (`src/main.ts`)
- Global `ValidationPipe({ transform: true, whitelist: true })` — DTOs must use `class-validator` decorators; extra props are stripped automatically.
- `cookie-parser` enabled; JWT auth uses httpOnly cookies — frontend sends credentials.
- CORS reads allowed origins from `CORS_ORIGINS` env var (comma-separated); app fails at startup if missing.

### Auth
JWT + Passport (`passport-jwt`, `passport-local`), bcrypt-hashed passwords. Roles enum: `CLIENT`, `ORGANIZER`, `GATE`, `ADMIN`. Enforced via `RolesGuard` + `@Roles()` decorator in `src/common/`.

### Modules
`UsersModule`, `AuthModule`, `CatalogModule`. Catalog integrates TMDB (movies) and Ticketmaster (shows) via `@nestjs/axios` `HttpModule` + provider classes in `src/catalog/providers/`.

## Frontend — `apps/frontend` (React 19, Vite 8, TanStack Router + Query)

### Commands (run from `apps/frontend`)
- `npm run dev` — vite dev server on port **5173**
- `npm run build` — `tsc -b && vite build`. **`tsc -b` is the typecheck step** (project references, `noEmit`); there is no separate `typecheck` script.
- `npm run lint` — `eslint .` (no `--fix`, unlike backend)
- `npm run preview` — vite preview. No test runner is configured.

### Dev server proxy
Vite proxies `/api` → `http://localhost:3000` (strips the `/api` prefix). `VITE_API_URL` (`.env.development`, committed) also points at the backend for direct cross-origin calls.

### Path alias
`@/*` → `./src/*` (configured in `tsconfig.app.json` `paths` + `vite.config.ts` `resolve.alias`).

### TanStack Router codegen
File-based routes live in `src/routes/`. `src/routeTree.gen.ts` is **generated** by `@tanstack/router-plugin` (see `vite.config.ts`, `autoCodeSplitting`) but is **committed to git**. Don't hand-edit; it regenerates on `dev`/`build`. Add routes as files under `src/routes/`.

### Styling
Tailwind CSS 4 via `@tailwindcss/vite` plugin. Component utils use `class-variance-authority` + `clsx` + `tailwind-merge` (shadcn-style). UI primitives from Radix UI; icons from `lucide-react`.

### TypeScript
TypeScript 6, `verbatimModuleSyntax` + `allowImportingTsExtensions` are on: use `import type` for type-only imports.

## Suggested verification order
- Backend: `npx prisma generate` → `docker compose up -d` → `npm run lint` → `npm test` → `npm run build`
- Frontend: `npm run lint` → `npm run build`

## Git conventions
Conventional commits (e.g. `feat(backend):`, `chore:`).
