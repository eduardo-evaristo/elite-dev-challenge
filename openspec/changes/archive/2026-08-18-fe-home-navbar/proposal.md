## Why

The frontend is a blank Vite + React 19 + TanStack Router scaffold with zero styling, zero components, and zero UI library. The home page is the primary entry point for all users (clients browsing events/movies, organizers managing content). Without it, there is no user-facing surface to build upon. This change establishes the design system foundation (Tailwind v4 + shadcn with Pencil design tokens), the role-aware navbar, the hero carousel, event/movie card components, and the footer — the structural backbone of the entire frontend.

## What Changes

- Install Tailwind CSS v4 (`@tailwindcss/vite`), `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `tw-animate-css` in `apps/frontend`
- Configure `@/*` path alias in `tsconfig.json` + `vite.config.ts` and add Tailwind plugin + API proxy to vite config
- Create `src/index.css` with Pencil design tokens mapped to shadcn CSS variables, IBM Plex Sans font, `@theme inline` registrations, and border reset using `--line`
- Create `src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
- Add shadcn components: `button`, `input`, `badge`, `dropdown-menu` (for accessibility/ARIA on interactive elements only)
- Create `src/types/auth.ts` with `Role` and `User` types matching backend
- Create `src/data/mock-home.ts` with 1 mock movie + 1 mock event (frontend decoupled from backend until events endpoint exists)
- Create role-aware `Navbar` component (prop `role: Role | null`) with 3 variants: logout, CLIENT ("Meus ingressos" button), ORGANIZER ("Criar evento" button + different nav links)
- Create `Hero` component with functional carousel (auto-rotate every 5s, navigable dots, pause on hover, gradient background)
- Create `SectionHeader` component (title + functional scroll arrows using `scrollBy`)
- Create `MovieCard` component (poster placeholder + title + meta, loose flex-col structure, no enclosing box)
- Create `EventCard` component (image placeholder + title + date + venue + category badge, loose flex-col structure)
- Create `Footer` component (4 columns + divider + copyright + payment/social subfooter)
- Compose home route (`src/routes/index.tsx`) with Navbar + Hero + Movies section + Events section + Footer
- Add basic unstyled login route (`src/routes/login.tsx`) with email/password fields — no styling, no backend integration
- Override shadcn global CSS variables with Pencil design tokens: `--primary` -> `--curtain`, `--background` -> `--paper`, `--border` -> `--line`, etc.

## Capabilities

### New Capabilities
- `frontend-home`: The public home page with role-aware navigation, hero carousel, horizontal-scrolling sections for movies and events, card components, and footer — built on a Pencil-derived design system with shadcn/ui primitives

### Modified Capabilities
<!-- No existing capabilities are modified. The catalog spec remains unchanged. -->

## Impact

- **Code**: `apps/frontend/` — new `src/index.css`, `src/lib/`, `src/types/`, `src/data/`, `src/components/` (ui/ + 6 custom components), route files (`index.tsx`, `login.tsx`, `__root.tsx`), `vite.config.ts`, `tsconfig.json`, `main.tsx`
- **Dependencies**: New npm packages installed at `apps/frontend` level: `tailwindcss`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `tw-animate-css` + shadcn Radix dependencies (`@radix-ui/react-dropdown-menu`, `@radix-ui/react-slot`)
- **APIs**: No backend changes. Frontend uses mock data. Vite proxy configured for future `/api` -> `localhost:3000` routing
- **Design system**: Establishes the CSS variable layer that all future frontend screens will build upon — Pencil tokens (`--paper`, `--ink`, `--curtain`, `--line`, etc.) mapped to both shadcn utilities and custom Tailwind utilities
