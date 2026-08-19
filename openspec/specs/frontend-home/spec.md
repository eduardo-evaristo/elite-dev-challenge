## Purpose

Provides the public-facing home page with role-aware navigation, a hero carousel, horizontal-scrolling sections for movies and events, listing cards, and a footer — the structural entry point for all users of the platform.

## Requirements

### Requirement: Design system foundation

The frontend SHALL establish a CSS variable layer that maps Pencil design tokens (`--paper`, `--surface`, `--ink`, `--muted`, `--line`, `--line-strong`, `--curtain`, `--curtain-hover`, `--spotlight`, `--stage`) to both shadcn/ui CSS variables and custom Tailwind utilities via `@theme inline`. The font family SHALL be IBM Plex Sans (weights 400, 500, 600, 700) loaded from Google Fonts. All borders SHALL use `--line` or `--line-strong` — never `--ink` pure black. The `--curtain` color SHALL be the only fill color for solid action buttons.

#### Scenario: shadcn variables overridden by Pencil tokens
- **WHEN** any shadcn component renders (e.g. Button with `variant="default"`)
- **THEN** the component uses `--curtain` as its background (via `--primary: var(--curtain)`) instead of shadcn's default neutral primary

#### Scenario: border color never uses pure ink
- **WHEN** any element in the app has a border
- **THEN** the border color is `--line` (#D8D2C4) or `--line-strong` (#B9AFA0), never `--ink` (#221F1C)

#### Scenario: IBM Plex Sans applied globally
- **WHEN** the home page loads in a browser
- **THEN** all text renders in IBM Plex Sans with weights 400, 500, 600, or 700 as specified per element

### Requirement: Role-aware navbar

The navbar SHALL accept a `role` prop (`Role | null`) and render different navigation options based on its value. When `role` is `null` (logged out), the navbar SHALL show "Filmes" and "Eventos" links with no role-specific button. When `role` is `CLIENT`, the navbar SHALL show a "Meus ingressos" button filled with `--curtain`. When `role` is `ORGANIZER`, the navbar SHALL show "Painel", "Eventos", and "Relatórios" links plus a "Criar evento" button filled with `--curtain`. Admin and Gate roles SHALL render the same as logged out for now. The navbar SHALL always display a search field, a location indicator, and a user icon that opens a dropdown menu. Navigation links SHALL use `--muted` text color and change to `--ink` on hover without scaling.

#### Scenario: Logged out navbar
- **WHEN** the navbar renders with `role={null}`
- **THEN** it shows the "guichê" logo, "Filmes" and "Eventos" links, a search field, a location indicator, and a user icon — with no curtain-filled action button

#### Scenario: Client navbar
- **WHEN** the navbar renders with `role="CLIENT"`
- **THEN** it shows the same base elements plus a "Meus ingressos" button with `--curtain` background and white text

#### Scenario: Organizer navbar
- **WHEN** the navbar renders with `role="ORGANIZER"`
- **THEN** it shows "Painel", "Eventos", and "Relatórios" links instead of "Filmes"/"Eventos", a "Criar evento" button with `--curtain` background and white text, and a shorter search field

#### Scenario: Navigation link hover
- **WHEN** a user hovers over any navbar navigation link
- **THEN** the link text color changes from `--muted` to `--ink` without any scale transform

#### Scenario: User icon dropdown
- **WHEN** a user clicks the user icon in the navbar
- **THEN** a dropdown menu opens (via shadcn DropdownMenu) with accessible keyboard navigation and ARIA attributes

### Requirement: Hero carousel

The hero section SHALL display a carousel of slides over a 135-degree linear gradient background (from #2E0A10 through #9B2531 at 40% to #4A1E0A). Each slide SHALL show a title (48px, weight 700, white), a description (18px, white), a CTA button filled with `--curtain`, and a poster placeholder on the right. The carousel SHALL auto-rotate every 5 seconds. The carousel SHALL pause auto-rotation when the user hovers over it and resume when the mouse leaves. Navigation dots SHALL be displayed at the bottom — the active dot SHALL be solid white and inactive dots SHALL be white at 40% opacity. Clicking a dot SHALL navigate to the corresponding slide and reset the auto-rotate timer.

#### Scenario: Auto-rotate advances slides
- **WHEN** the hero carousel is displayed and the user does not interact for 5 seconds
- **THEN** the carousel advances to the next slide (wrapping from last to first)

#### Scenario: Pause on hover
- **WHEN** the user hovers the mouse over the hero carousel
- **THEN** auto-rotation pauses until the mouse leaves the carousel area

#### Scenario: Dot navigation
- **WHEN** the user clicks the third dot in the carousel
- **THEN** the carousel shows the third slide and the auto-rotate timer resets to a full 5-second interval

#### Scenario: CTA button styling
- **WHEN** the hero CTA button renders
- **THEN** it has `--curtain` background, white text, weight 600, and on hover the background changes to `--curtain-hover` without scaling

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

### Requirement: Movie card component

The movie card SHALL render as a loose vertical flex column with a poster placeholder at the top (5:7 aspect ratio, `--line` background, rounded corners), a title (14px, weight 600, `--ink`), and a meta line (12px, `--muted`). There SHALL be no enclosing container with a border or background around the poster and text together. On hover, the title color SHALL change to `--curtain` without scaling or shadow.

#### Scenario: Card structure
- **WHEN** a movie card renders
- **THEN** the poster and text are siblings in a flex column with no parent box wrapping them together — the poster has its own border-radius and the text sits loose below

#### Scenario: Title hover
- **WHEN** the user hovers over a movie card
- **THEN** the title color changes from `--ink` to `--curtain` with no scale or shadow effect

### Requirement: Event card component

The event card SHALL render as a loose vertical flex column with an image placeholder at the top (1:1 aspect ratio, `--line` background, rounded corners), a title (14px, weight 600, `--ink`), a date line (12px, `--muted`), a venue line (12px, `--muted`), and a category badge positioned over the image at the bottom-left corner. The category badge SHALL have `--curtain` background, white text, 11px weight 600, and small padding. On hover, the title color SHALL change to `--curtain` without scaling or shadow.

#### Scenario: Category badge over image
- **WHEN** an event card renders
- **THEN** the category badge is positioned absolutely over the image placeholder at the bottom-left, with `--curtain` background and white text

#### Scenario: Title hover
- **WHEN** the user hovers over an event card
- **THEN** the title color changes from `--ink` to `--curtain` with no scale or shadow effect

### Requirement: Footer

The footer SHALL display four columns of links on a `--surface` background: brand column (logo + tagline), "Plataforma", "Para organizadores", and "Atendimento". A horizontal divider (`--line`) SHALL separate the columns from the bottom section. The bottom section SHALL show a copyright notice and a subfooter with payment method placeholders and social media icons. Footer links SHALL use `--muted` text color and change to `--ink` on hover without scaling.

#### Scenario: Footer link hover
- **WHEN** a user hovers over any footer link
- **THEN** the link text color changes from `--muted` to `--ink` without any scale transform

#### Scenario: Divider between sections
- **WHEN** the footer renders
- **THEN** a 1px horizontal line with `--line` background separates the link columns from the copyright/subfooter area

### Requirement: Basic login route

The app SHALL provide a `/login` route with email and password input fields and a submit button. This route SHALL have no custom styling (browser defaults only). The login route SHALL NOT integrate with the backend — it is a placeholder for future authentication work.

#### Scenario: Login form renders
- **WHEN** a user navigates to `/login`
- **THEN** the page shows an email input, a password input, and a submit button with browser default styling

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
