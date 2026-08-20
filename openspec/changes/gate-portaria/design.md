## Context

The `TicketsModule` already has `POST /tickets/validate` with a 4-state state machine (VALID / INVALID / ALREADY_USED / WRONG_EVENT), HMAC-SHA256 signature verification, and atomic single-winner `markUsed`. The `GATE` role exists in the Prisma enum and is enforced on the validate endpoint. The frontend has no routes, components, or guards for the `GATE` role. The Pencil designs define 7 screens (events list, empty state, QR scan, 4 result states) at 390px mobile-first width. The existing `ExactlyOneOf` validator lives in `src/reservations/dto/` and needs to be shared with the tickets module. No rate limiting is configured anywhere in the backend.

## Goals / Non-Goals

**Goals:**
- Add a manual entry validation path that is cryptographically verified (not a signature-skip lookup), so gate operators can validate tickets when the camera is unavailable
- Enrich the validate response with contextual data (holder name, ticket label, used-at time, wrong-event name) to match the Pencil designs
- Build a mobile-first portaria UI that works on desktop too (max-w-md centered, full-screen result overlays)
- Confine GATE users to `/portaria*` routes — they never see the public home, navbar, or other authenticated routes
- Rate-limit the validate endpoint to make the 8-char manualCode (2^40 entropy) resistant to brute force

**Non-Goals:**
- Offline-first scanning or PWA installability (the scanner requires a live camera and network)
- Gate operator analytics or audit trail (no separate check-in log table)
- Multi-event simultaneous scanning (the operator selects one event, then scans for that event)
- QR code generation on the backend (already handled by `qrcode.react` on the frontend)
- Replacing the QR/signature validation path — the manual code path is additive

## Decisions

### 1. Two new Ticket fields: `shortId` + `manualCode` (not a single combined field)

**Decision:** Add `shortId` (String, @unique, 8 chars) and `manualCode` (String, 8 chars) as separate columns. The operator types `shortId-manualCode` as one string; the service splits on `-`.

**Rationale:** `shortId` needs a unique index for direct lookup (like `publicId` in the QR path). `manualCode` does not need uniqueness — it is verified against a ticket already located by `shortId`. Combining them into one column would prevent indexed lookup.

**Alternatives considered:**
- Single `manualEntryCode` column with the combined value: would require substring matching or full-table semantics for lookup, no index.
- `shortId` only, no `manualCode`: would be a pure lookup with no authenticity proof — anyone who sees or guesses the `shortId` could validate. Rejected by user (breaks "QR not forgeable" guarantee).
- Derive `manualCode` from HMAC: would make it recomputable from public data, defeating the purpose. Must be an independent random secret.

### 2. Alphabet: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (32 chars, no ambiguous glyphs)

**Decision:** Use `crypto.randomInt(32)` to index into this alphabet.

**Rationale:** Excludes `0`/`O`, `1`/`I`/`l` which are visually confusable when read from a screen or typed. 32^8 ≈ 2^40 entropy per code — sufficient when combined with rate limiting. `crypto.randomInt` (Node built-in) avoids modulo bias.

### 3. `html5-qrcode` for camera scanning

**Decision:** Install `html5-qrcode` on the frontend. Use `Html5QrcodeScanner` (the full-UI variant) inside a React `useEffect` wrapper.

**Rationale:** Mature library (High reputation on Context7, 169 code snippets), provides ready camera UI with viewfinder, scan region, torch/zoom controls. No custom `getUserMedia` code needed. User confirmed UI customization is not required — only QR reading matters.

**Alternatives considered:**
- `@zxing/browser`: more low-level, would require custom UI for the viewfinder. Rejected since UI customization is not needed.
- Native `BarcodeDetector` API: not supported in all browsers (Firefox/Safari). `html5-qrcode` uses it as a fast path when available and falls back to its own decoder.

### 4. Validation result as component state, not a separate route

**Decision:** The scan route (`/portaria/$eventId/validar`) manages a `useState<ValidateTicketResponse | null>` that toggles between the scanner UI and the full-screen result overlay. "Validar próximo" resets state to `null`, which re-renders the scanner.

**Rationale:** The result is transient and tightly coupled to the scan action — the operator sees the result and immediately wants to scan the next ticket. A route change would unmount/remount the camera (slow re-initialization) and require passing the `eventId` again. State toggle is instant.

### 5. GATE confinement via `beforeLoad` guards on `index.tsx` and `_authenticated.tsx`

**Decision:** 
- `index.tsx` (home, public): `beforeLoad` fetches `['me']`, redirects `GATE` → `/portaria`
- `_authenticated.tsx`: after the existing `!user` check, if `user.role === 'GATE'` and `!location.pathname.startsWith('/portaria')` → redirect `/portaria`

**Rationale:** Two layers ensure GATE users can never see non-portaria screens. The home guard catches the post-login navigation (login navigates to `/`). The authenticated layout guard catches any attempt to access other authenticated routes. Both use `beforeLoad` (runs before render), consistent with the existing pattern in `_authenticated/organizador/eventos/novo.tsx`.

### 6. Gate screens use `<GateHeader>`, not `<Navbar>`

**Decision:** Build a minimal `GateHeader` component (logo + shield icon + "Portaria" badge) for portaria screens. The standard `Navbar` is not rendered on gate routes.

**Rationale:** GATE users don't need search, location, "Meus ingressos", or "Criar evento" buttons. The Pencil designs show a simplified header. Defensive handling in `navbar.tsx` (empty `gateLinks`) is added in case `Navbar` is somehow rendered for a GATE user.

### 7. `@nestjs/throttler` globally registered, per-route override on validate

**Decision:** `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` in `AppModule`. `ThrottlerGuard` applied only on `POST /tickets/validate` via `@UseGuards` (not as `APP_GUARD`), with `@Throttle({ default: { limit: 10, ttl: 60000 } })`.

**Rationale:** Global `APP_GUARD` would rate-limit every endpoint, which is unnecessary and could interfere with development. Per-route application is surgical. 10 req/min is generous for real gate operation (one scan every ~6 seconds) but blocks brute force on the 8-char manualCode (32^8 ≈ 1.1 trillion combinations → infeasible at 10/min).

### 8. `ExactlyOneOf` moved to `src/common/validators/`

**Decision:** Move `exactly-one-of.validator.ts` from `src/reservations/dto/` to `src/common/validators/`. Update the import in `CreateReservationDto`. Import in `ValidateTicketDto`.

**Rationale:** The validator is generic (not reservation-specific). Both `CreateReservationDto` (seatId vs ticketTypeId) and `ValidateTicketDto` (signature vs manualEntryCode) need it. `src/common/` already houses `roles.decorator.ts` and `roles.guard.ts`, so validators fit there too.

### 9. `VALIDATE_INCLUDE` adds `user: { select: { name, lastName } }`

**Decision:** Define a separate include for the validate path that extends `TICKET_INCLUDE` with the user's name fields.

**Rationale:** The enriched response needs `holderName` = `user.name + ' ' + user.lastName`. The existing `TICKET_INCLUDE` does not load the user relation. Adding it globally to `TICKET_INCLUDE` would load user data on every ticket query (including `findMine` which already has `userId` but doesn't need name fields). A validate-specific include is more precise.

## Risks / Trade-offs

- **[Manual code brute force]** 8 chars from 32-symbol alphabet = 2^40 entropy. At 10 req/min, exhaustive search takes ~2 billion minutes. **Mitigation:** throttler at 10/min/IP. If a determined attacker uses multiple IPs, consider per-`shortId` tracking in the future.
- **[shortId collision]** 32^8 = ~1.1 trillion possible values. With birthday paradox, collision probability exceeds 50% at ~33k tickets (sqrt of 2^40). **Mitigation:** `@unique` constraint catches collisions at the DB level (P2002). `issueForReservation` should retry generation on P2002. For a challenge project, 33k tickets is unlikely; for production, increase to 10-12 chars.
- **[Camera permissions in non-HTTPS]** `getUserMedia` requires HTTPS (or localhost). The Vite dev server on `localhost:5173` works. Production deployment must use HTTPS. **Mitigation:** documented; manual entry is the fallback.
- **[html5-qrcode bundle size]** ~200KB minified. **Mitigation:** acceptable for a gate-specific route; can be code-split via dynamic import if needed.
- **[Throttler bypass via cookies]** The default `ThrottlerGuard` tracks by IP. Behind a reverse proxy, all requests may share an IP. **Mitigation:** for production, configure `ThrottlerGuard` to read `X-Forwarded-For` (set `trustProxy` or a custom tracker). For this challenge, IP-based is sufficient.

## Migration Plan

1. **Schema migration**: `npx prisma migrate dev --name add-ticket-short-id-and-manual-code` — adds `shortId` (varchar, unique) and `manualCode` (varchar) columns to `tickets`. Existing tickets will have NULL values for these columns. Since the challenge DB is dev-only (docker-compose), no data backfill is needed. If production data existed, a backfill script would generate codes for existing tickets.
2. **Dependency installation**: `@nestjs/throttler` (backend), `html5-qrcode` (frontend) — both are additive, no version conflicts expected.
3. **Rollback**: revert the migration (`npx prisma migrate resolve --rolled-back`) and remove the npm packages. The existing QR/signature validation path continues to work unchanged since the manual code path is additive.
