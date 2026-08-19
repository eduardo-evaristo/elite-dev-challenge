## Context

The frontend (`apps/frontend`) is a stock Vite 8 + React 19 + TanStack Router scaffold with file-based routing (`autoCodeSplitting: true`), TypeScript 6 (`verbatimModuleSyntax`, `allowImportingTsExtensions`, `noEmit`), and zero styling or UI libraries installed. The backend has auth (`POST /auth/login`, `GET /auth/me`) with JWT in httpOnly cookies and four roles (`CLIENT`, `ORGANIZER`, `GATE`, `ADMIN`), but no public events endpoint exists yet.

Design tokens and component structures were extracted from a Pencil design file via MCP tools (`pencil_get_app_state`, `pencil_execute` with `GetVariables()` and `Get(path, visit, options)`). The full reference plan with all extracted values is in `specs/fe-home-navbar.md` at the repo root.

## Goals / Non-Goals

**Goals:**
- Establish the CSS variable layer (Pencil tokens -> shadcn variables + custom Tailwind utilities) that all future frontend screens inherit
- Build the home page with functional carousel and horizontal-scroll sections — not just static visuals
- Keep the frontend fully decoupled from the backend (mock data, prop-driven components) so it can be built and verified independently
- Use shadcn/ui only where it solves hard interaction/accessibility problems (DropdownMenu, Button, Input, Badge) — not for layout or custom visual components

**Non-Goals:**
- Backend integration (no axios, react-query, or auth context) — deferred to a future change
- Responsive/mobile layout — the Pencil design targets 1440px desktop; responsive breakpoints are a separate concern
- Admin or Gate navbar variants — explicitly excluded from scope
- Real images for cards — placeholders only (solid `--line` background)
- Any page beyond home and the bare login route

## Decisions

### 1. Tailwind CSS v4 (not v3) with `@tailwindcss/vite` plugin

**Rationale:** shadcn/ui's current docs recommend Tailwind v4 for new projects. v4 uses a Vite plugin instead of PostCSS, CSS-first configuration (`@theme inline` in the CSS file instead of `tailwind.config.js`), and the `@import "tailwindcss"` directive. This eliminates the need for `postcss.config.js` and `tailwind.config.js` files.

**Alternative considered:** Tailwind v3 with PostCSS — more mature, but requires more config files and shadcn's latest docs and component source target v4. The `tw-animate-css` package replaces `tailwindcss-animate` for v4.

### 2. Pencil tokens mapped to shadcn variables in `:root`, not a separate theme

**Rationale:** shadcn components reference CSS variables like `--primary`, `--border`, `--background` through Tailwind utilities (`bg-primary`, `border-border`). By setting these shadcn variables to reference Pencil tokens (`--primary: var(--curtain)`) in `:root`, every shadcn component automatically inherits the Pencil palette without per-component overrides. Custom Pencil-only colors (`--curtain-hover`, `--spotlight`, `--stage`, `--surface`, `--ink`, `--line-strong`) are registered as additional Tailwind utilities via `@theme inline` (`--color-curtain-hover: var(--curtain-hover)`, etc.) for use in custom components.

**Mapping:**
```
--background: var(--paper)        -> bg-background (page background)
--foreground: var(--ink)          -> text-foreground (primary text)
--card: var(--surface)            -> bg-card (navbar, footer, cards if needed)
--primary: var(--curtain)         -> bg-primary (sole fill button color)
--primary-foreground: #FFFFFF     -> text-primary-foreground
--muted: var(--paper)             -> bg-muted (search/location field background)
--muted-foreground: var(--muted)  -> text-muted-foreground (secondary text/icons)
--border: var(--line)             -> border-border (all standard borders)
--input: var(--line)              -> border-input
--ring: var(--line-strong)        -> ring-ring (focus rings)
--radius: 0.375rem                -> 6px = --radius-md
```

**Alternative considered:** Per-component className overrides — would require wrapping every shadcn component and would not scale to future screens.

### 3. No AuthContext — Navbar receives `role` prop directly

**Rationale:** Adding a context provider for a single consumer (Navbar) is over-engineering at this stage. The home route passes a mock `role` value. When backend integration arrives (axios + react-query `useGetMe`), the home route swaps the mock for `data?.role ?? null` — the Navbar component stays unchanged.

**Alternative considered:** AuthContext with a mock toggle — more realistic but adds a provider wrapper in `__root.tsx` and a context file for no current benefit. The user explicitly requested "no context, something simple."

### 4. Hero carousel with `useEffect` + `setInterval`, not a library

**Rationale:** The carousel has exactly three behaviors: auto-rotate every 5s, pause on hover, dot navigation. This is ~30 lines of React state + effects. Adding a carousel library (embla, swiper) for this scope would be over-engineering and would conflict with the Pencil design's specific dot styling and gradient background.

**Implementation:** `useState` for `currentSlide` + `isPaused`. `useEffect` with `setInterval(5000)` that advances `currentSlide` when `!isPaused`. `onMouseEnter`/`onMouseLeave` handlers toggle `isPaused`. Dot `onClick` sets `currentSlide` directly. The interval cleanup runs on unmount or when `isPaused` changes.

**Alternative considered:** Embla Carousel (shadcn's recommended carousel) — adds a dependency and its API constrains the custom dot styling and gradient layout.

### 5. Horizontal scroll with `useRef` + `scrollBy`, not a library

**Rationale:** Each content section (movies, events) has a scrollable row. The arrows call `ref.current.scrollBy({ left: ±scrollAmount, behavior: 'smooth' })`. The scroll amount is approximately one card width + gap (e.g. 216px for movie cards, 276px for event cards). CSS hides the scrollbar via `scrollbar-width: none` (Firefox) and `::-webkit-scrollbar { display: none }` (Chrome/Safari).

**Alternative considered:** A drag-to-scroll library or Embla — unnecessary for click-to-scroll arrows.

### 6. Loose card structure (no enclosing box)

**Rationale:** The Pencil design explicitly uses "loose" card structure — poster/image with its own `border-radius` at the top, text siblings below, no parent container with border/background wrapping them. This avoids the generic "everything in a bordered card" look. In Tailwind: `flex flex-col gap-2` with the poster as one child and text as subsequent children, no `border` or `bg-*` on the parent.

**Alternative considered:** shadcn Card component — always renders a bordered container with padding, which contradicts the design spec.

### 7. shadcn components selected: Button, Input, Badge, DropdownMenu only

**Rationale:** These four cover the interaction complexity that justifies shadcn:
- **DropdownMenu**: keyboard navigation, ARIA, focus management for the user icon menu — hard to build correctly from scratch
- **Button**: `asChild` slot pattern via Radix Slot, focus-visible ring, disabled states — consistently styled across the app
- **Input**: focus ring, aria-invalid, consistent border — used in search field and login form
- **Badge**: small component but ensures consistent padding/radius for the category badge

Not used: Card (conflicts with loose structure), Dialog/Sheet (no modals in this scope), Tabs (no tabbed UI in this scope), Select (no selects in this scope).

## Risks / Trade-offs

- **[Tailwind v4 + shadcn maturity]** Tailwind v4 is relatively new; shadcn's v4 support is active but some edge cases in `@theme inline` variable resolution may surface. → Mitigation: the mapping is straightforward (CSS variable references, not computed values); if issues arise, the `:root` variables can be set to literal hex values instead of `var(--pencil-token)` references.

- **[No responsive layout]** The design targets 1440px fixed width. On smaller screens, content will overflow or look cramped. → Mitigation: this is explicitly out of scope; a responsive pass will be a separate change once all desktop screens are built.

- **[Mock data drift]** Mock data in `src/data/mock-home.ts` may diverge from the actual backend response shape when the events endpoint is built. → Mitigation: define mock data with types that anticipate the backend shape (based on the Prisma schema's `Event` model: `name`, `date`, `location`, `type`, `status`). When the endpoint is ready, swap mock for API response with minimal prop changes.

- **[Auto-rotate accessibility]** The hero carousel auto-rotates which can be a concern for users with motion sensitivity. → Mitigation: `prefers-reduced-motion` media query can disable auto-rotation in a future pass. The carousel already pauses on hover and dots are keyboard-accessible.

- **[Vite proxy without backend running]** The `/api` proxy in `vite.config.ts` will fail silently if the backend is not running. → Mitigation: the proxy is only configured for future use; the current frontend uses no API calls, so a missing backend does not affect development.
