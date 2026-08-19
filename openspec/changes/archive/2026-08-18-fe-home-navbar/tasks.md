## 1. Foundation — Tailwind v4, shadcn, path alias

- [x] 1.1 Install dependencies in `apps/frontend`: `tailwindcss @tailwindcss/vite clsx tailwind-merge class-variance-authority lucide-react tw-animate-css`
- [x] 1.2 Update `vite.config.ts`: add `tailwindcss()` plugin before `react()`, add `resolve.alias` for `@` -> `./src`, add `server.proxy` for `/api` -> `http://localhost:3000`
- [x] 1.3 Update `tsconfig.json`: add `compilerOptions.baseUrl: "."` and `paths: { "@/*": ["./src/*"] }`
- [x] 1.4 Create `src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge export)
- [x] 1.5 Create `src/index.css` with: `@import "tailwindcss"`, `@import "tw-animate-css"`, Google Fonts IBM Plex Sans import, `:root` with Pencil tokens + shadcn variable mapping, `@theme inline` registering all color utilities, `@layer base` border reset using `--line`
- [x] 1.6 Update `src/main.tsx` to import `./index.css`
- [x] 1.7 Create `components.json` for shadcn (style: default, rsc: false, tailwind css: src/index.css, aliases: @/components, @/lib/utils, iconLibrary: lucide)
- [x] 1.8 Add shadcn components: `npx shadcn@latest add button input badge dropdown-menu` (or create manually in `src/components/ui/`)

## 2. Types and Mock Data

- [x] 2.1 Create `src/types/auth.ts` with `Role` type (`'CLIENT' | 'ORGANIZER' | 'GATE' | 'ADMIN'`) and `User` interface (`id, name, lastName, email, role`) matching backend `PublicUser` shape
- [x] 2.2 Create `src/data/mock-home.ts` with types (`MockMovie`, `MockEvent`), 1 mock movie, 1 mock event, and a `mockSlides` array for the hero carousel (1 slide with title, description, CTA label)

## 3. Components — Listing cards and section header

- [x] 3.1 Create `src/components/movie-card.tsx`: loose `flex flex-col gap-2` — poster placeholder (`aspect-[5/7] rounded-md bg-line`), title (`text-sm font-semibold text-ink group-hover:text-curtain`), meta (`text-xs text-muted-foreground`). Props: `title: string`, `meta: string`
- [x] 3.2 Create `src/components/event-card.tsx`: loose `flex flex-col gap-2` — image placeholder (`aspect-square rounded-md bg-line` relative), category badge (`absolute bottom-2 left-2 bg-curtain text-white text-[11px] font-semibold rounded-sm px-2 py-1`), title, date, venue. Props: `title, date, venue, category`
- [x] 3.3 Create `src/components/section-header.tsx`: `flex justify-between items-center` — title (`text-2xl font-semibold text-ink`) + arrow frame with `ChevronLeft`/`ChevronRight` icons (lucide, `size-6 text-muted-foreground hover:text-ink`). Props: `title, onPrev, onNext`

## 4. Components — Navbar, Footer, Hero

- [x] 4.1 Create `src/components/navbar.tsx`: `role: Role | null` prop. Structure: `bg-surface border-b border-line` top bar, `flex justify-between items-center px-8`. Left: logo "guichê" (`text-[22px] font-bold text-ink`) + nav links (role-dependent). Right: search field (`bg-paper border border-line rounded-md px-3 py-2` with Search icon), location indicator (MapPin icon + text), role button (curtain fill) when applicable, User icon (opens shadcn DropdownMenu). Link hover: `text-muted-foreground hover:text-ink`
- [x] 4.2 Create `src/components/footer.tsx`: `bg-surface` with `px-20 py-12 flex flex-col gap-8`. Four columns (brand + 3 link columns), `bg-line` divider (`h-px`), copyright row, subfooter with payment placeholders and social icons (lucide: `Instagram`, `Facebook`, `Twitter`, `Youtube`)
- [x] 4.3 Create `src/components/hero.tsx`: gradient background (`linear-gradient(135deg, #2E0A10 0%, #9B2531 40%, #4A1E0A 100%)`), `flex items-center px-20 h-[520px]`. Left: title (`text-5xl font-bold text-white`), description (`text-lg text-white`), CTA (shadcn Button `bg-curtain hover:bg-curtain-hover text-white font-semibold rounded-md px-6 py-3`). Right: poster placeholder (`w-[520px] h-[300px] bg-line/20 rounded-md`). Bottom: dots (`flex gap-2` — active `bg-white`, inactive `bg-white/40`). State: `useState` for `currentSlide` + `isPaused`, `useEffect` with `setInterval(5000)`, `onMouseEnter`/`onMouseLeave` handlers. Props: `slides: HeroSlide[]`

## 5. Home route composition

- [x] 5.1 Rewrite `src/routes/index.tsx`: render `<Navbar role={null} />`, `<Hero slides={mockSlides} />`, movies section (`<SectionHeader title="Filmes em cartaz" .../>` + scrollable row with `MovieCard`), events section (`<SectionHeader title="Eventos em cartaz" .../>` + scrollable row with `EventCard`), `<Footer />`. Use `useRef` for each scrollable row, pass `scrollBy` callbacks to `SectionHeader`. Row CSS: `flex gap-4 overflow-x-auto scrollbar-none`
- [x] 5.2 Verify `src/routes/__root.tsx` remains a bare `<Outlet />` (no provider wrapping)

## 6. Login route

- [x] 6.1 Create `src/routes/login.tsx`: route `/login` with unstyled `<form>` containing `<input type="email">`, `<input type="password">`, `<button type="submit">`. No Tailwind classes, no backend call. Just a functional form element

## 7. Verification

- [x] 7.1 Run `npm run lint` in `apps/frontend` — fix any lint errors
- [x] 7.2 Run `npm run build` in `apps/frontend` (executes `tsc -b && vite build`) — fix any type errors or build failures
- [ ] 7.3 Run `npm run dev` and visually verify the home page renders: navbar with logout state, hero with gradient + 1 slide, movies section with 1 card, events section with 1 card, footer with 4 columns
