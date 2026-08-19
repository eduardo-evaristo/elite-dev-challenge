## 1. Feature-based folder restructure (Phase 1 — commit isolated)

- [x] 1.1 Create `src/features/home/components/` directory and move `src/components/hero.tsx` → `src/features/home/components/hero.tsx`
- [x] 1.2 Move `src/components/footer.tsx` → `src/features/home/components/footer.tsx`
- [x] 1.3 Move `src/components/section-header.tsx` → `src/features/home/components/section-header.tsx`
- [x] 1.4 Create `src/features/home/types.ts` with the `HeroSlide` interface (extracted from `mock-home.ts`)
- [x] 1.5 Create `src/features/home/constants.ts` with the `heroSlides` hardcoded array (extracted from `mockSlides` in `mock-home.ts`)
- [x] 1.6 Create `src/features/home/mocks.ts` (temporary) with `MockMovie`, `MockEvent`, `mockMovies`, `mockEvents` (extracted from `mock-home.ts`)
- [x] 1.7 Update `src/features/home/components/hero.tsx` to import `HeroSlide` from `@/features/home/types` instead of `@/data/mock-home`
- [x] 1.8 Update `src/routes/index.tsx` imports: `Hero` → `@/features/home/components/hero`, `Footer` → `@/features/home/components/footer`, `SectionHeader` → `@/features/home/components/section-header`, `mockSlides` → `@/features/home/constants`, `mockMovies`/`mockEvents` → `@/features/home/mocks`; keep `Navbar` from `@/components/navbar`, `MovieCard` from `@/components/movie-card`, `EventCard` from `@/components/event-card`
- [x] 1.9 Delete `src/data/mock-home.ts` and `src/data/` directory if empty
- [x] 1.10 Run `npm run lint` and `npm run build` in `apps/frontend` to verify no broken imports
- [x] 1.11 Commit: `refactor(frontend): move home-specific code into features/home/`

## 2. Data layer in features/events (Phase 2)

- [x] 2.1 Add `listEvents` function to `src/features/events/api.ts` calling `GET /events` with `type`, `page`, `size`, `query` params; return type `PaginatedEventResult` from `@elite-dev/shared`; parameter `type` typed as `'movie' | 'show'`
- [x] 2.2 Create `src/features/events/queries.ts` with `eventsInfiniteListOptions(type: CatalogType)` factory using `infiniteQueryOptions` — `queryKey: ['events', 'list', type]`, `initialPageParam: 1`, `getNextPageParam` based on `page < totalPages`
- [x] 2.3 Create `src/features/events/hooks/use-events-list.ts` with `useEventsList(type: CatalogType)` hook wrapping `useInfiniteQuery(eventsInfiniteListOptions(type))`

## 3. Utility and infinite scroll hook (Phase 2)

- [x] 3.1 Add `formatEventDate(isoDate: string)` function to `src/lib/datetime.ts` — parses ISO timestamp via `new Date(isoDate)`, formats with `toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })`, capitalizes first letter and removes periods; falls back to raw string on error
- [x] 3.2 Create `src/features/home/hooks/use-infinite-scroll.ts` with `useInfiniteScroll` hook — accepts `rootRef`, `sentinelRef`, `onLoadMore`, `enabled`, `rootMargin` (default `'0px 300px 0px 0px'`); sets up `IntersectionObserver` with `root` and lateral `rootMargin`; calls `onLoadMore` when sentinel intersects and `enabled` is true; disconnects on cleanup

## 4. Route loader and real data wiring (Phase 3)

- [x] 4.1 Add `loader` to the `/` route in `src/routes/index.tsx` — `Promise.all` of `context.queryClient.ensureInfiniteQueryData(eventsInfiniteListOptions('movie'))` and `eventsInfiniteListOptions('show')` to pre-fetch page 1 of both queries in parallel
- [x] 4.2 Replace mock data usage in the route component with `useEventsList('movie')` and `useEventsList('show')` — flatten `data.pages` into `movies` and `shows` arrays via `flatMap((p) => p.items)`
- [x] 4.3 Add `moviesSentinelRef` and `eventsSentinelRef` refs; call `useInfiniteScroll` for each row with `fetchNextPage` as `onLoadMore` and `hasNextPage && !isFetchingNextPage` as `enabled`
- [x] 4.4 Map movie `EventItem`s to `MovieCard` props: `title=item.name`, `meta=\`${formatDuration(item.duration)} · ${item.eventClassification}\``, `posterUrl=item.imageUrl`
- [x] 4.5 Map show `EventItem`s to `EventCard` props: `title=item.name`, `date=formatEventDate(item.date)`, `venue=item.location`, `category=item.eventClassification`, `posterUrl=item.imageUrl`
- [x] 4.6 Add sentinel `<div ref={...} className='h-1 w-1 shrink-0' />` at the end of each horizontal scroll row (after the mapped cards, inside the `overflow-x-auto` container)
- [x] 4.7 Update `Hero` import to use `heroSlides` from `@/features/home/constants` (already done in Phase 1 — verify it still renders correctly)

## 5. Cleanup and verification (Phase 3)

- [x] 5.1 Delete `src/features/home/mocks.ts` (temporary file from Phase 1)
- [x] 5.2 Run `npm run lint` in `apps/frontend`
- [x] 5.3 Run `npm run build` in `apps/frontend` (`tsc -b && vite build`)
- [x] 5.4 Manual test: with backend running and PUBLISHED events in the database (types MOVIE and SHOW), verify home loads without loading flash, cards render real data, and scrolling near the end of a row fetches the next page
- [x] 5.5 Commit: `feat(frontend): wire home to real events data via infinite query loader`
