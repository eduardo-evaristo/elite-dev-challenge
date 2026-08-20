## 1. Interface

- [x] 1.1 Create `apps/backend/src/payments/interfaces/payment-provider.interface.ts` — export `PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER')`; `export interface Customer { name: string; email: string }`; `export interface ChargeInput { reservationId: string; amount: number; cardNumber: string; customer: Customer }`; `export type PaymentResult = { status: 'APPROVED' } | { status: 'DECLINED' } | { status: 'PENDING'; externalId: string }`; `export interface PaymentProvider { charge(input: ChargeInput): Promise<PaymentResult> }`. Do NOT import the Prisma `PaymentStatus` enum (it lacks `PENDING` — dead import; literals stay manual naming discipline)

## 2. Simulated Provider

- [x] 2.1 Create `apps/backend/src/payments/providers/simulated.provider.ts` — `@Injectable() class SimulatedPaymentProvider implements PaymentProvider`; `charge({ cardNumber }: ChargeInput): Promise<PaymentResult>` (NOT declared `async` — `@typescript-eslint/require-await` rejects an `async` method with no `await`; instead returns `Promise.resolve(...)` for the success path and throws `BadRequestException` synchronously for the bad-card path, surfacing as a rejected promise in any async caller). Takes `cardNumber?.trim().slice(-1)`, throws `BadRequestException('Número de cartão inválido')` when the last char is not a digit (`!last || !/\d/.test(last)`), else returns `{ status: 'APPROVED' }` for even `Number(last)` and `{ status: 'DECLINED' }` for odd. Never returns `PENDING`. No constructor dependencies. Imports: `BadRequestException, Injectable` from `@nestjs/common`; `ChargeInput, PaymentProvider, PaymentResult` as `import type` from `../interfaces/payment-provider.interface`

## 3. Module Wiring

- [x] 3.1 Create `apps/backend/src/payments/payments.module.ts` — `PaymentsModule` with a single provider entry `{ provide: PAYMENT_PROVIDER, useFactory: (config: ConfigService): PaymentProvider => { const driver = config.get<string>('PAYMENT_PROVIDER') ?? 'simulated'; switch (driver) { case 'simulated': return new SimulatedPaymentProvider(); /* case 'asaas': return new AsaasPaymentProvider(config); */ default: throw new Error(`Unknown PAYMENT_PROVIDER: ${driver}`); } }, inject: [ConfigService] }`; `exports: [PAYMENT_PROVIDER]`. Imports: `Module` from `@nestjs/common`, `ConfigService` from `@nestjs/config`, `PAYMENT_PROVIDER` + `PaymentProvider` (as `import type`) from `./interfaces/payment-provider.interface`, `SimulatedPaymentProvider` from `./providers/simulated.provider`
- [x] 3.2 Add `PAYMENT_PROVIDER=simulated` to `apps/backend/.env.example` with a `# Payment module — provider selection ('simulated' default)` comment line above it
- [x] 3.3 Add `PaymentsModule` to the `imports` array in `apps/backend/src/app.module.ts` (alongside `ReservationsModule`); add the `import { PaymentsModule } from './payments/payments.module'` line

## 4. Verification

- [x] 4.1 Run `npx prisma generate` in `apps/backend` (regenerates the gitignored Prisma client; required before compile)
- [x] 4.2 Run `npm run lint` in `apps/backend` (eslint with `--fix`); confirm no `no-unused-vars` on the interface file (the `PaymentStatus` import was deliberately omitted)
- [x] 4.3 Run `npm run build` in `apps/backend` (`nest build`); confirm the `useFactory` return-type annotation (`PaymentProvider`) type-checks against `SimulatedPaymentProvider`
