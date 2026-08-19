## Context

The home route (`src/routes/index.tsx`) currently imports mock data from `src/data/mock-home.ts` and passes it to `MovieCard` and `EventCard` components. The backend already exposes a public `GET /events?type=movie|show&page=&size=` endpoint returning `PaginatedEventResult` with `EventItem` records. The project already uses TanStack Router with a `QueryClient` in the router context (`src/main.tsx`, `src/routes/__root.tsx`) and follows a feature-based folder pattern (`src/features/<domain>/` with `api.ts`, `queries.ts`, `hooks/use-*.ts`, `components/`). The existing `features/catalog/` demonstrates the `infiniteQueryOptions` + `useInfiniteQuery` + `IntersectionObserver` sentinel pattern in `step-catalog.tsx`, but with vertical scroll. The home uses horizontal scroll (`overflow-x-auto`).

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Pre-fetch page 1 of movies and shows before the home route renders (no loading flash on initial load)
- Load subsequent pages on demand when the user scrolls near the end of a horizontal row
- Map `EventItem` fields to existing `MovieCard` and `EventCard` props without changing the card components
- Move home-specific components into `src/features/home/` following the established feature-based convention
- Format ISO timestamp dates correctly for display in event cards (timezone-safe)

**Non-Goals:**
- Making the Hero carousel data-driven (remains hardcoded for now)
- Adding visual loading skeletons or spinners for `isFetchingNextPage` (silent background fetch)
- Adding a route-level `errorComponent` for failed data loads (default error boundary used)
- Modifying the backend `GET /events` endpoint or any backend code
- Changing the existing `features/catalog/` queries or the wizard's catalog search
- Migrating existing `useQuery`/`beforeLoad` patterns in other routes to the loader pattern

## Decisions

### Decision 1: Use `loader` + `ensureInfiniteQueryData` instead of `beforeLoad`

The project's existing routes use `beforeLoad` + `ensureQueryData` for pre-fetching. The TanStack Router docs recommend `loader` as the dedicated pre-fetch hook, and `ensureInfiniteQueryData` is the infinite-query equivalent of `ensureQueryData`. Using `loader` here is appropriate because:
- The home route's sole purpose is displaying data — no auth guard logic is needed (unlike `_authenticated.tsx` which uses `beforeLoad` for redirect logic)
- `ensureInfiniteQueryData` populates the infinite query cache so `useInfiniteQuery` in the component picks up page 1 synchronously

**Alternative considered**: `beforeLoad` + `ensureQueryData` — rejected because `ensureQueryData` doesn't work with infinite queries, and `beforeLoad` is semantically a guard hook, not a data-loading hook.

### Decision 2: `useInfiniteQuery` (not `useSuspenseInfiniteQuery`) in the component

The loader guarantees page 1 is in the cache before render, so there's no suspense on initial load. `useInfiniteQuery` is consistent with the existing `step-catalog.tsx` pattern and avoids introducing `useSuspenseInfiniteQuery` as a new pattern.

**Alternative considered**: `useSuspenseInfiniteQuery` — rejected because it would require a Suspense boundary and the existing codebase doesn't use Suspense anywhere. The loader already prevents the loading flash that Suspense would solve.

### Decision 3: Sentinel-based pagination with lateral `rootMargin`

The home's content rows use `overflow-x-auto` (horizontal scroll). The existing `step-catalog.tsx` sentinel uses a vertical `rootMargin: '200px'` with the scroll container as `root`. For horizontal scroll, the `rootMargin` must be lateral: `'0px 300px 0px 0px'` — this triggers the observer ~300px before the sentinel enters the visible area, giving a smooth pre-fetch buffer.

The `useInfiniteScroll` hook is extracted into `src/features/home/hooks/use-infinite-scroll.ts` as a reusable hook accepting `rootRef`, `sentinelRef`, `onLoadMore`, `enabled`, and optional `rootMargin`. This keeps the IntersectionObserver logic out of the route component and is reusable for future horizontal-scroll sections.

**Alternative considered**: Button-based "load more" — rejected because the UX requirement is seamless scrolling, not explicit pagination clicks.

### Decision 4: New `formatEventDate` function instead of reusing `formatDateForDisplay`

`EventItem.date` is a full ISO timestamp (`event.date.toISOString()` in the backend, e.g. `2026-03-15T23:00:00.000Z`). The existing `formatDateForDisplay(date, time?)` constructs `new Date(\`${date}T${time ?? '00:00'}\`)` — designed for date-only strings from `<input type="date">`. Passing an ISO timestamp to it produces `new Date("2026-03-15T23:00:00.000ZT00:00")` = `Invalid Date`, which falls to the `catch` block and returns the raw ISO string.

`formatEventDate(isoDate)` does `new Date(isoDate)` directly — correctly parsing the ISO timestamp — then applies the same `toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })` formatting and the same capitalization/cleanup as `formatDateForDisplay`. The output is textually identical (e.g. "Sáb, 15 de mar") but timezone-safe.

**Alternative considered**: `formatDateForDisplay(isoDate.split('T')[0])` — rejected because splitting at 'T' extracts the UTC date portion, which can be off by one day for events that occur in the evening in a timezone behind UTC (e.g. a 22:00 BRT event on March 15 has a UTC ISO of March 16, and `split('T')[0]` would return March 16).

### Decision 5: Extend `features/events/` for list queries, keep `features/home/` UI-only

The `listEvents` API function, `eventsInfiniteListOptions` query factory, and `useEventsList` hook go into `features/events/` (alongside the existing `createEvent` API and `useCreateEvent` hook). `features/home/` holds only UI: components (`hero`, `footer`, `section-header`), types (`HeroSlide`), constants (`heroSlides`), and the `useInfiniteScroll` hook. This keeps data-access logic in the domain feature (`events`) and presentation logic in the view feature (`home`).

**Alternative considered**: Everything in `features/home/` — rejected because the events list query is domain logic that could be reused by other views (e.g. a future "all events" page), not just the home.

### Decision 6: Phased commits — restructure first, then feature

Phase 1 (restructure) is committed separately before Phase 2+3 (data layer + wiring). This isolates the pure file-move refactoring from the behavior change, making the git history clear and reviewable.

## Risks / Trade-offs

- [Empty result sets on first load if no published events exist] → The home will render empty sections. No error is thrown. The sections display no cards. This is acceptable behavior — the same would happen with any real-data integration.
- [`ensureInfiniteQueryData` is newer API] → Available in `@tanstack/react-query` v5.101.4 (installed version). Verified in Context7 docs. No risk.
- [Sentinel `rootMargin` tuning] → `300px` lateral margin is a reasonable default for ~200px-wide cards. May need adjustment if card sizes change. The `rootMargin` is configurable via the `useInfiniteScroll` hook parameter.
- [Type mismatch in shared `QueryEventsParams.type`] → The shared type declares `type?: EventType` (`'MOVIE' | 'SHOW'`) but the backend DTO accepts lowercase `'movie' | 'show'`. The `listEvents` function types its parameter as `'movie' | 'show'` (= `CatalogType`), matching the actual backend behavior. No runtime risk.
- [Horizontal IntersectionObserver browser support] → `IntersectionObserver` with horizontal scroll containers is well-supported in all modern browsers. The existing `step-catalog.tsx` already relies on it.
