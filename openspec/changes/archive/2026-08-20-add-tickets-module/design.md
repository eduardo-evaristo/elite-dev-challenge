## Context

The `Ticket` Prisma model already exists (`schema.prisma:186-201`) with `id`, `reservationId` (unique), `userId`, `signature`, and `usedAt`. No code writes to it. `ReservationsModule` only ever creates `PENDING` reservations; `PaymentsModule` is a provider shell with no controller. The repo's feature modules follow a fixed repository → service → controller layering with `PrismaService` re-listed per module, per-route `@UseGuards(JwtGuard, RolesGuard)` + `@Roles(...)`, and raw (unwrapped) responses. Auth attaches `AuthenticatedUser` (`{ userId, email, role }`) to `req.user` via the JWT cookie strategy. See `proposal.md` for motivation and `specs/tickets/spec.md` for the behavior contract; this document covers the how.

## Goals / Non-Goals

**Goals:**
- Stand up the `TicketsModule` so the ticket lifecycle (issue, read, share, validate) exists and is independently testable before any payment wiring.
- Define the QR payload as a backend-owned string so the format has one producer.
- Make gate validation atomic under concurrent scans of the same ticket.

**Non-Goals:**
- The `POST /reservations/:id/pay` (confirm) endpoint, `Reservation.status → CONFIRMED` transition, `paymentStatus = APPROVED`, and the transaction that calls `issueForReservation`. That wiring is a separate follow-up change.
- Frontend ticket/QR/gate screens.
- `TICKET_SECRET` rotation or key-versioning. No tickets exist yet; revisit at real deployment.
- Rate limiting on `/validate` (the gate is authenticated and the signature is 64-char hex; brute force is infeasible and can be added later without a spec change).

## Decisions

### QR payload is versioned JSON owned by the backend
`qrContent = {"v":1,"id":"<uuid>","sig":"<hex sha256>"}`. The QR carries the ticket `id` (which is the public id) and the `signature`; it does **not** carry `eventId` — at validation the backend recomputes the HMAC by joining `ticket → reservation → event`, so including `eventId` would be redundant and enlarge the scannable surface. The `v` field lets the format evolve without ambiguity.
- *Alternative considered:* compact `<uuid>.<hex>` (~101 chars). Denser, but not self-describing and harder to extend; rejected.
- *Alternative considered:* a signed JWT-like token. Overkill — the signature is already stored and recomputed server-side; a second token adds complexity without benefit.

### Backend owns `qrContent`; frontend renders the image
`GET /tickets/mine` and `GET /tickets/mine/:publicId` return the `qrContent` string; the frontend renders it as a QR image with a client-side library (`qrcode.react`). The format is defined in exactly one place (the backend ticket service).
- *Alternative considered:* backend generates a PNG data URL via the `qrcode` npm package. Rejected — adds a runtime dependency and an encoding step with no real benefit; rendering client-side is standard for "show my ticket" screens.

### Frontend parses the scanned payload; validation takes a structured DTO
The frontend `JSON.parse`s the scanned `qrContent` and sends `{ publicId, signature, expectedEventId? }` to `POST /tickets/validate`. The validate endpoint is agnostic to the QR encoding.
- Rationale: the gate also supports **manual entry** (an operator transcribes `publicId` + `signature` from a printed ticket), which needs the structured DTO regardless. Keeping the validate contract encoding-agnostic means the QR format can change without touching the validate path or its tests.
- *Alternative considered:* frontend forwards the raw scanned string and the backend parses it. Single source of truth, but couples validation to the QR encoding and complicates the manual-entry path; rejected.

### Public share view exposes no signature
`GET /tickets/:publicId` is unauthenticated and returns metadata + a `used` boolean, but **never** `signature` or `qrContent`. A leaked share link cannot therefore be used to obtain the authenticity proof and burn someone else's ticket at the gate before the holder arrives.
- *Alternative considered:* the public endpoint returns everything (one endpoint serves both owner and share). Simpler, but leaks the signature to anyone who gets the link — a real attack (vazou o link = perdeu o ingresso). Rejected.
- Consequence: "My Tickets → tap a ticket → see QR" uses the authenticated `GET /tickets/mine/:publicId`, not the public endpoint.

### Ownership check lives in the service and returns 404, not 403
`findMineOne` reuses the shared `findByPublicId(publicId, include)` and checks `ticket.userId !== userId` in the service, throwing `NotFoundException` for both "not found" and "not yours". This (a) matches the repo convention of service-level authorization (`events.service.ts:288-290`), and (b) makes the "don't reveal existence" principle explicit in code (two `NotFoundException` throws in one method). It deliberately deviates from the `events` 403 pattern because here confirming that a `publicId` belongs to someone is itself the leak.
- *Alternative considered:* a repository method `findByPublicIdForUser(publicId, userId)` with a `where: { id, userId }` that returns `null` for both cases. Works identically; rejected to avoid a second repo method that duplicates `findByPublicId` with a different where-clause, and to keep the ownership branch visible at the service layer.

### HMAC over `"${ticketId}:${eventId}"`, compared with `timingSafeEqual`
`signature = HMAC-SHA256("${ticketId}:${eventId}", TICKET_SECRET)` (hex). The `:` separator is stable and never appears in a UUID. Validation recomputes this and compares with `crypto.timingSafeEqual`, guarded by a length check first (since `timingSafeEqual` throws on unequal-length buffers). The length is not secret — the signature is fixed-length hex — so the length guard leaks nothing.
- *Alternative considered:* base64url digest. Hex is more ergonomic for manual transcription at the gate; rejected base64.

### `TICKET_SECRET` via `getOrThrow`, crash-fast
`configService.getOrThrow<string>('TICKET_SECRET')` in the service constructor, mirroring `JWT_SECRET` (`jwt.strategy.ts:18`). No default, no soft fallback — a missing signing secret crashes the service at instantiation rather than silently producing unsigned/invalid tickets.
- *Alternative considered:* a default secret for dev. Rejected — a default would let a misconfigured production boot and issue tickets signed with a known key.

### Validation state machine has a fixed order
Evaluate in this order: (1) not found → `INVALID`; (2) `expectedEventId` mismatch → `WRONG_EVENT`; (3) signature mismatch → `INVALID`; (4) mark used → `VALID`/`ALREADY_USED`. `WRONG_EVENT` is checked before signature verification because it's a cheap string compare and lets the gate short-circuit without recomputing the HMAC. Only the `VALID` branch mutates `usedAt`.

### Concurrency guard is an atomic `updateMany`, not a transaction
`markUsed(id)` runs `prisma.ticket.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } })`. The `where: { id, usedAt: null }` makes it single-winner at the row level: exactly one concurrent call affects the row (`count = 1` → `VALID`); others see `usedAt` already set (`count = 0` → `ALREADY_USED`). No `$transaction` is needed because this is a single atomic write — unlike `reservations.repository.ts:31`, which wraps a conditional `updateMany` + `create` in one unit.
- *Alternative considered:* load + `update` inside `$transaction` with a re-check. Equivalent safety, more code; the `updateMany` already provides the guarantee.

### Route ordering: static segments before `:publicId`
`@Get('mine')` and `@Get('mine/:publicId')` are declared **before** `@Get(':publicId')` so `GET /tickets/mine` is not captured as `publicId = "mine"`. This mirrors `events.controller.ts:33-43` (`movies` before `:id`). `@Post('validate')` is a different verb and has no ordering constraint.

### `id` doubles as `publicId`
The ticket's `id` (server-generated UUID) is the publicly exposed identifier. There is no separate `publicId` column, so the schema stays as-is and issuance produces one identifier.

## Risks / Trade-offs

- **[TICKET_SECRET rotation invalidates all existing signatures]** → There is no key-id/rotation mechanism; rotating the secret makes every prior ticket's signature unverifiable (they'd return `INVALID`). Mitigation: documented as a known limitation; revisit when real deployments exist (likely by adding a `keyId` column and a key ring, which would be a spec change). Acceptable now because no tickets exist yet.
- **[Frontend QR parsing is coupled to the format]** → If the QR format changes, frontend parsing must change. Mitigation: the `v` field enables version dispatch; the format is intentionally minimal and unlikely to change.
- **[Public endpoint leaks `used` status]** → Anyone with the share link can see whether a ticket has been used. Accepted: `used` is not sensitive enough to require auth, and hiding it would force the share view behind login, defeating its purpose.
- **[Manual entry requires transcribing 64 hex chars]** → The primary gate path is scanning; manual entry is a fallback. Mitigation: hex (not base64) is chosen for transcription ergonomics; the frontend can group digits.
- **[No rate limiting on `/validate`]** → A malicious gate credential could hammer the endpoint. Mitigation: `GATE`/`ADMIN` is authenticated, the signature space is 2^256, and a successful brute force still burns only one ticket. Rate limiting can be layered on later without a spec change.

## Migration Plan

- **No database migration.** The `tickets` table already exists; this change only begins writing to it.
- **Deploy:** add `TICKET_SECRET` to the deployment environment (required — the service crashes at boot if absent), then ship the new `tickets/` module and the `app.module.ts` registration.
- **Rollback:** remove the `TicketsModule` import from `app.module.ts`. No data cleanup is needed (no rows reference tickets yet, and the `issueForReservation` seam has no callers in this step).
- **Forward safety:** `issueForReservation` is exported but uncalled until the follow-up payment-confirm change wires `ReservationsModule` to call it. Deploying this change standalone is safe — the routes exist and the seam is inert.

## Open Questions

None that would change the specs, approach, or task breakdown. (Rate limiting and key rotation are deferred per Non-Goals and can be added later without amending this change.)
