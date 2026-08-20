## Context

The backend's only DI examples today are: (a) `CatalogModule`, which registers both concrete providers (`TmdbProvider`, `TicketmasterProvider`) in `providers: []` and dispatches between them at runtime by a per-request `type` key in `CatalogService.getProvider(type)` — the `CATALOG_PROVIDER = Symbol(...)` token in `catalog/interfaces/catalog-provider.interface.ts` is **dead code**, never wired; and (b) `JwtModule.registerAsync({ useFactory, inject: [ConfigService] })` in `auth.module.ts:14-20`, the repo's only `useFactory`. `ConfigModule` is global, so `ConfigService` is injectable anywhere. The Prisma schema's `PaymentStatus` enum has only `APPROVED`/`DECLINED` (no `PENDING`); `Reservation.paymentStatus` is nullable and currently never written in production. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Establish a `PaymentProvider` contract and a `PAYMENT_PROVIDER` Symbol token that a future Asaas provider can implement without changing the contract or its consumers
- Select the active provider at boot from `PAYMENT_PROVIDER`, instantiating only the selected provider
- Provide a deterministic `SimulatedPaymentProvider` that resolves synchronously and is usable in dev/test with no external credentials

**Non-Goals:**
- The Asaas provider (left as a commented `case 'asaas'` hook only)
- A payment service or HTTP controller (no endpoint this change)
- Wiring `charge` into the reservation flow
- Persisting a `PENDING` outcome — the Prisma `PaymentStatus` enum lacks `PENDING`; extending it is deferred to the Asaas change
- Frontend contracts in `@elite-dev/shared`

## Decisions

### 1. Strategy via `useFactory` + Symbol token, NOT the CatalogModule's actual wiring

`CatalogModule` registers **both** providers as concrete classes and dispatches per-request by a `type` discriminator (`'movie' | 'show'`) in `CatalogService.getProvider`. That pattern suits N providers live simultaneously with per-request selection. Payment has the opposite semantics: **one** provider active per boot, selected by env var, no per-request discriminator. Reusing the catalog wiring would register a future `AsaasPaymentProvider` even when `PAYMENT_PROVIDER=simulated`, and if that provider validated `ASAAS_API_KEY` in its constructor it would break the boot of anyone using only the simulator. Instead, this change completes the pattern the catalog *intended* but never finished: a `Symbol` token (`PAYMENT_PROVIDER`) plus a common interface, now actually wired via `useFactory` + `inject: [ConfigService]`, mirroring the repo's only real `useFactory` (`auth.module.ts`).

**Alternative considered:** register both providers as concrete classes and switch on a runtime key (the catalog's real pattern). Rejected — instantiates the unselected provider, wrong semantics. **Alternative considered:** a dynamic `forRootAsync` module. Rejected as overkill for two providers.

### 2. The factory instantiates only the selected provider with `new`

The `useFactory` calls `new SimulatedPaymentProvider()` directly; the Nest DI container does not participate in constructing the provider. The `@Injectable()` decorator on `SimulatedPaymentProvider` is therefore a no-op decoration while the class has no constructor dependencies — kept for consistency with the other providers, with the caveat that if it later gains an injected dependency, a reader may wrongly assume Nest resolves it via DI. `inject: [ConfigService]` is included now so the factory already has the shape the future `AsaasPaymentProvider(config)` call needs.

### 3. `default: throw` for an unknown driver

The factory's switch throws on any `PAYMENT_PROVIDER` value that is not a supported provider name. Boot fails loudly on a misconfigured env var instead of silently degrading to a default that may mask the operator's intent.

### 4. Default `'simulated'` when `PAYMENT_PROVIDER` is absent

`config.get<string>('PAYMENT_PROVIDER') ?? 'simulated'`. Environments without the var (local dev, CI without payment integration) boot with the test provider. The default is explicit (not a fallback to `undefined`).

### 5. `ChargeInput` forward-shaped for Asaas

`ChargeInput` carries `reservationId`, `amount`, `cardNumber`, and `customer: { name, email }`. `reservationId` is the idempotency key the future Asaas webhook will key on; `customer` is required by the Asaas API. The simulated provider ignores `reservationId`, `amount`, and `customer` (it reads only `cardNumber`), but including the fields now means the `PaymentProvider` contract does not break when Asaas is added.

**Alternative considered:** a minimal `{ cardNumber }` input now and expand later. Rejected — changing the interface signature when Asaas lands would churn every consumer and existing tests.

### 6. `PaymentResult` uses string literals, not the Prisma `PaymentStatus` enum

The schema's `PaymentStatus` enum is `APPROVED | DECLINED` only — it has no `PENDING`, so it is structurally incompatible with the `PaymentResult` union which includes `{ status: 'PENDING'; externalId: string }`. Importing `PaymentStatus` would be an unused import (`@typescript-eslint/no-unused-vars`) and would falsely imply alignment that cannot exist until the enum is extended in the Asaas change. The literals stay as manual naming discipline; alignment with the enum happens later, when `PENDING` is added via migration.

### 7. `charge()` returns `Promise<PaymentResult>` even though the simulated provider is synchronous

The contract is async because the real (Asaas) provider makes network calls, so the interface declares `charge(input): Promise<PaymentResult>`. `SimulatedPaymentProvider.charge` is **not** declared `async` (it has no `await` expression, and the repo's type-checked eslint config rejects `async` methods with no `await` via `@typescript-eslint/require-await`); instead it returns `Promise.resolve(...)` for the success path and throws `BadRequestException` synchronously for the bad-card-number path (the throw surfaces as a rejected promise in any async caller, identical to the `async` version's behavior). It never returns `PENDING` (synchronous by definition).

### 8. `PaymentResult` lives in the backend, not in `@elite-dev/shared`

The union is an internal contract between the provider implementations and the (future) payment service. No frontend consumer exists this change; promoting it to the shared package would be premature.

## Risks / Trade-offs

- **[Unselected provider is not type-checked by the DI container]** → Accepted: because the factory uses `new`, Nest does not validate the provider's constructor graph at registration. Mitigated by the factory being a single, small switch and by the `PaymentProvider` return-type annotation on the factory (`useFactory: (config): PaymentProvider => ...`), so a provider that drifts from the interface fails to compile.
- **[`@Injectable()` on `SimulatedPaymentProvider` is misleading]** → Accepted as a cosmetic note: it is decorative while the class has no constructor deps. If a dependency is added later, either switch to a registered provider + `useExisting`, or keep `new` and pass the dependency explicitly from the factory — re-evaluate then.
- **[No `PENDING` persistence this change]** → Accepted and deferred: the simulated provider never returns `PENDING`, so nothing needs to be persisted. The Asaas change must extend the `PaymentStatus` enum and write `PENDING` to `Reservation.paymentStatus`; that gap is recorded in the proposal and tasks so it is not rediscovered then.
- **[No idempotency on the simulated path]** → Out of scope: the simulated provider is deterministic and synchronous; idempotency belongs to the real provider + webhook change.
