## Why

The home page renders movie and event cards from hardcoded mock data, even though the backend already exposes a public `GET /events` endpoint that returns published events with pagination, and the shared types (`EventItem`, `PaginatedEventResult`) are already defined. The home needs to display real data so users can browse published events and proceed to purchase tickets. Additionally, the home-specific components (Hero, Footer, SectionHeader) live in the generic `src/components/` directory instead of following the project's feature-based folder convention.

## What Changes

- Move home-specific components (`hero.tsx`, `footer.tsx`, `section-header.tsx`) from `src/components/` into `src/features/home/components/` to follow the feature-based folder convention
- Extract `HeroSlide` type and hardcoded hero slides into `src/features/home/types.ts` and `src/features/home/constants.ts`
- Add `listEvents` function to `src/features/events/api.ts` calling the public `GET /events?type=movie|show` endpoint
- Add `eventsInfiniteListOptions` factory in `src/features/events/queries.ts` using `infiniteQueryOptions` with page-based pagination
- Add `useEventsList` hook in `src/features/events/hooks/use-events-list.ts` wrapping `useInfiniteQuery`
- Add `formatEventDate` function to `src/lib/datetime.ts` to format ISO timestamps into pt-BR display strings (timezone-safe, unlike the existing `formatDateForDisplay` which expects date-only strings)
- Add `useInfiniteScroll` hook in `src/features/home/hooks/use-infinite-scroll.ts` using `IntersectionObserver` with lateral `rootMargin` for horizontal scroll pagination
- Add a `loader` to the `/` route that pre-fetches page 1 of both movie and show queries in parallel via `ensureInfiniteQueryData`
- Replace mock data in the home route with real `EventItem` data mapped to `MovieCard` and `EventCard` props
- Add sentinel `<div>` elements at the end of each horizontal scroll row to trigger `fetchNextPage` when scrolled near the end
- Delete `src/data/mock-home.ts` and the temporary `src/features/home/mocks.ts`
- The "Data decoupling via props" requirement is updated: card components still receive data via props (no change to the cards), but the home route now sources data from the real API instead of mocks
- The "Horizontal-scrolling content sections" requirement is extended: sections now load additional pages via infinite scroll when the user scrolls near the end of a row

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `frontend-home`: The "Data decoupling via props" requirement changes from mandating mock data to mandating real API data via TanStack Router loader + TanStack Query infinite queries. The "Horizontal-scrolling content sections" requirement gains infinite-scroll pagination triggered by a sentinel element near the end of each row.

## Impact

- **Frontend code**: `src/routes/index.tsx` (loader + component rewrite), `src/features/home/` (new directory with components, types, constants, hooks), `src/features/events/` (new api function, queries, hook), `src/lib/datetime.ts` (new function), `src/components/` (three files moved out), `src/data/mock-home.ts` (deleted)
- **Backend**: No changes — consumes the existing public `GET /events` endpoint
- **Dependencies**: No new dependencies — uses existing `@tanstack/react-query` (`useInfiniteQuery`, `infiniteQueryOptions`, `ensureInfiniteQueryData`) and `@tanstack/react-router` (`loader`)
- **Shared types**: No changes — reuses existing `EventItem`, `PaginatedEventResult`, `CatalogType` from `@elite-dev/shared`
