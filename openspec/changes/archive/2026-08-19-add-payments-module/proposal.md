## Why

The backend can create `PENDING` reservations but has no payment abstraction to transition them to `CONFIRMED`. Before integrating a real gateway (Asaas, future change), this change introduces the `PaymentsModule` foundation: a swappable `PaymentProvider` interface selected by env var, plus a deterministic `SimulatedPaymentProvider` for dev/test. Establishing the boot-time Strategy wiring now means the Asaas provider slots in later without touching the contract or its consumers.

## What Changes

- Add `PaymentsModule` to the NestJS backend exposing a `PaymentProvider` interface behind a `PAYMENT_PROVIDER` Symbol token
- Add `SimulatedPaymentProvider` implementing `PaymentProvider` — synchronous, deterministic test rule (last digit of `cardNumber`: even → `APPROVED`, odd → `DECLINED`; never returns `PENDING`)
- Wire the provider via a `useFactory` + `ConfigService` factory that reads `PAYMENT_PROVIDER` (default `'simulated'`), instantiates only the selected provider with `new`, and throws on unknown values
- Define `ChargeInput` (`reservationId`, `amount`, `cardNumber`, `customer: { name, email }`) forward-shaped for Asaas (idempotency key + required customer), and a `PaymentResult` union (`APPROVED` | `DECLINED` | `{ status: 'PENDING', externalId }`)
- Add `PAYMENT_PROVIDER=simulated` to `.env.example`; wire `PaymentsModule` into `app.module.ts`
- Do NOT implement the Asaas provider (a commented `case 'asaas'` hook only), a payment service/controller, reservation integration, or `PENDING` persistence — the Prisma `PaymentStatus` enum lacks `PENDING` today, so persisting a pending state is deferred to the Asaas change

## Capabilities

### New Capabilities
- `payments`: A swappable payment-provider abstraction with boot-time selection via env var and a deterministic simulated implementation

### Modified Capabilities
<!-- none -->

## Impact

- **Backend code**: New `apps/backend/src/payments/` directory (module, interface, simulated provider); `apps/backend/src/app.module.ts` modified to import `PaymentsModule`; `apps/backend/.env.example` documents `PAYMENT_PROVIDER`
- **API surface**: No new HTTP endpoints (no controller/service in this change)
- **Dependencies**: No new external dependencies; uses existing `@nestjs/config` `ConfigService`
- **Database**: No schema changes — the `PaymentStatus` enum (`APPROVED`/`DECLINED`) is not extended and `PENDING` is not persisted this change
- **Shared package**: No changes to `@elite-dev/shared` — the `PaymentResult` union is a backend-internal contract
