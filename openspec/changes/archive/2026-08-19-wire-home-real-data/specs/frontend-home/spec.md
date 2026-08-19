## MODIFIED Requirements

### Requirement: Horizontal-scrolling content sections

The home page SHALL display a "Filmes em cartaz" section and an "Eventos em cartaz" section. Each section SHALL have a header with a title (24px, weight 600, `--ink`) and left/right navigation arrows. The arrows SHALL scroll the content row horizontally using `scrollBy` when clicked. The content rows SHALL scroll horizontally with `overflow-x-auto` and hide the scrollbar. Cards in a row SHALL be spaced with a 16px gap. Navigation arrows SHALL use `--muted` color and change to `--ink` on hover without scaling. Each content row SHALL load its data from the public `GET /events` endpoint filtered by type (`movie` or `show`) via a TanStack Router route loader that pre-fetches the first page before the route renders. Each row SHALL support infinite pagination: when the user scrolls near the end of a row (via arrows, drag, or any horizontal scroll method), the row SHALL fetch the next page of results if more pages are available. A sentinel element positioned at the end of each row SHALL trigger the next-page fetch via `IntersectionObserver` with a lateral root margin. Card components SHALL receive their data via props from the route component — they SHALL NOT fetch data directly.

#### Scenario: Scroll right with arrow
- **WHEN** the user clicks the right arrow on a content section
- **THEN** the content row scrolls right by a fixed amount (approximately the width of one card plus gap) via `scrollBy`

#### Scenario: Scroll left with arrow
- **WHEN** the user clicks the left arrow on a content section
- **THEN** the content row scrolls left by the same fixed amount

#### Scenario: Hidden scrollbar
- **WHEN** a content section row is displayed
- **THEN** the native scrollbar is hidden (via CSS) while horizontal scrolling remains functional

#### Scenario: First page pre-loaded by route loader
- **WHEN** the home route is navigated to
- **THEN** the route loader pre-fetches page 1 of both movie and show event lists in parallel before the route component renders, so the initial render shows data without a loading flash

#### Scenario: Infinite pagination on horizontal scroll
- **WHEN** the user scrolls a content row horizontally and the sentinel element at the end of the row becomes visible within the scroll container's lateral root margin
- **THEN** the row fetches the next page of events if more pages are available (`hasNextPage` is true and no fetch is already in progress)

#### Scenario: No more pages to fetch
- **WHEN** the sentinel element becomes visible but there are no more pages available (`hasNextPage` is false)
- **THEN** no fetch is triggered and the sentinel remains inert

### Requirement: Data decoupling via props

All listing card components (MovieCard, EventCard) SHALL receive their data via props and SHALL NOT fetch data from any API. The home route SHALL source movie and event data from the public `GET /events` endpoint via TanStack Query infinite queries and SHALL map each `EventItem` to the corresponding card props before rendering. Movie cards SHALL display the event name as the title, the event image URL as the poster, and a meta string composed of the formatted duration and event classification. Event cards SHALL display the event name as the title, the event image URL as the poster, the event date formatted as a pt-BR locale string as the date line, the event location as the venue line, and the event classification as the category badge. Card components SHALL remain presentational and unaware of the data source.

#### Scenario: Movie card receives data via props
- **WHEN** a MovieCard is rendered with `{ title: "Duna: Parte Dois", meta: "2h 15min · 14 anos" }`
- **THEN** it displays "Duna: Parte Dois" as the title and "2h 15min · 14 anos" as the meta text

#### Scenario: Event card receives data via props
- **WHEN** an EventCard is rendered with `{ title: "Festival de Jazz", date: "Sáb, 15 de mar", venue: "Teatro Municipal", category: "Música" }`
- **THEN** it displays the title, date, venue, and a category badge labeled "Música"

#### Scenario: Movie card mapped from EventItem
- **WHEN** the home route renders a movie-type `EventItem` with `{ name: "Duna: Parte Dois", duration: 155, eventClassification: "14", imageUrl: "https://..." }`
- **THEN** the MovieCard receives `title="Duna: Parte Dois"`, `meta="2h 35min · 14"`, and `posterUrl` set to the event's image URL

#### Scenario: Event card mapped from EventItem
- **WHEN** the home route renders a show-type `EventItem` with `{ name: "Festival de Jazz", date: "2026-03-15T23:00:00.000Z", location: "Teatro Municipal", eventClassification: "Livre", imageUrl: "https://..." }`
- **THEN** the EventCard receives `title="Festival de Jazz"`, `date` as a formatted pt-BR locale string derived from the ISO timestamp, `venue="Teatro Municipal"`, `category="Livre"`, and `posterUrl` set to the event's image URL

#### Scenario: Event date formatted from ISO timestamp
- **WHEN** an EventItem has a `date` field containing a full ISO timestamp (e.g. `2026-03-15T23:00:00.000Z`)
- **THEN** the date is parsed as a JavaScript Date and formatted using `toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })` with the first letter capitalized and periods removed, producing a display string like "Sáb, 15 de mar" without a time component

### Requirement: Feature-based folder organization

Home-specific components (Hero, Footer, SectionHeader) SHALL reside under `src/features/home/components/`. Home-specific types and constants (HeroSlide type, hardcoded hero slides) SHALL reside under `src/features/home/`. Home-specific hooks (infinite scroll) SHALL reside under `src/features/home/hooks/`. Components shared across multiple features (Navbar, MovieCard, EventCard, UI primitives) SHALL remain in `src/components/`. The home route file (`src/routes/index.tsx`) SHALL import home-specific code from `@/features/home/` and shared components from `@/components/`.

#### Scenario: Home-specific components located in feature folder
- **WHEN** a developer looks for the Hero, Footer, or SectionHeader component
- **THEN** they are found under `src/features/home/components/` — not in `src/components/`

#### Scenario: Shared components remain in shared directory
- **WHEN** a developer looks for the Navbar, MovieCard, EventCard, or UI primitives
- **THEN** they are found under `src/components/` — shared across features

#### Scenario: Hero slides are hardcoded constants
- **WHEN** the home route renders the Hero component
- **THEN** the slides are sourced from a hardcoded constant array in `src/features/home/constants.ts` — not from any API or mock data module
