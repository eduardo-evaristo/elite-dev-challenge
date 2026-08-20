# Plano: Módulo Payments (Backend) — Etapa 1 (interface + simulado)

## Escopo desta etapa

Apenas o contrato `PaymentProvider`, o `SimulatedPaymentProvider` e o module com factory baseada em `ConfigService`. **Não** implementa o provider Asaas (deixa o `case 'asaas'` comentado pronto pra receber), **não** cria service/controller de pagamentos, **não** integra com o fluxo de `Reservation`. Próxima etapa (Bloco 5 — Asaas) fecha o enum, a persistência de `PENDING` e a integração com reserva.

## Decisões

- **Strategy via `useFactory` + token `Symbol`, NÃO replicando o wiring real do CatalogModule.** Apesar de `catalog/interfaces/catalog-provider.interface.ts` definir `CATALOG_PROVIDER = Symbol(...)` e a interface `CatalogProvider`, esse token é **código morto** (única ocorrência no repo é a própria definição; grep confirma). O padrão real do catálogo é registrar **ambos** os providers como classes concretas em `providers: []` e despachar por **chave de runtime** (`type: 'movie' | 'show'`) num `getProvider(type)` privado no service. Isso serve quando **N providers ficam ativos simultaneamente** e cada request seleciona um. Pagamento tem semântica oposta: **1 provider ativo por boot**, selecionado por env var (`PAYMENT_PROVIDER`), sem discriminador por-request. Replicar o wiring do catálogo aqui instanciaria o futuro `AsaasPaymentProvider` mesmo em dev/test — ele validaria `ASAAS_API_KEY` no construtor e quebraria o boot de quem só usa o simulado. Logo, completa-se o esqueleto **pretendido** (mas nunca terminado) pelo catálogo: token `Symbol` + interface comum, agora de fato wired via `useFactory` + `inject: [ConfigService]`. É o mesmo shape do único `useFactory` real do repo (`JwtModule.registerAsync` em `auth.module.ts:14-20`).
- **`useFactory` instancia manualmente só o provider selecionado (`new SimulatedPaymentProvider()`).** Container de DI do Nest não participa da construção do provider (a factory chama `new`). Decoração `@Injectable()` no `SimulatedPaymentProvider` fica sem efeito enquanto a classe não tiver dependência de construtor — inofensivo, mas registrar mentalmente: se um dia ela ganhar dep injetada, alguém pode assumir erroneamente que o Nest resolve via DI, quando não está. Sem ação agora.
- **`default: throw new Error(...)` para driver desconhecido.** Falha rápida na inicialização em vez de deixar passar silenciosamente uma env var mal configurada. Boot explode = operador vê o erro imediatamente.
- **Default `'simulated'` quando `PAYMENT_PROVIDER` ausente.** Garante que ambientes sem a env var (dev local, CI sem integração) bootam com o provider de teste.
- **`ChargeInput` com `reservationId` + `customer: { name, email }`, justificado pelo Asaas futuro.** `reservationId` → idempotência do webhook do Asaas; `customer` → obrigatório na API do Asaas. O provider simulado ignora ambos (só lê `cardNumber`). `amount` e `cardNumber` completam o shape mínimo de um "charge". Antecipar esses campos evita quebrar o contrato `PaymentProvider` quando o Asaas entrar.
- **`PaymentResult` union com literais `'APPROVED' | 'DECLINED' | 'PENDING'`, SEM importar o enum Prisma `PaymentStatus`.** O enum do schema (`prisma/schema.prisma:51-54`) só tem `APPROVED`/`DECLINED` — **não tem `PENDING`** — então é estruturalmente incompatível com a union. Importar `PaymentStatus` seria import morto (`@typescript-eslint/no-unused-vars` acusa) e o comentário "alinhamento de nomes" seria enganoso. Literais ficam como disciplina de nomenclatura manual; o alinhamento real com o enum só acontece no Bloco 5, quando `PENDING` for adicionado ao enum via migration.
- **`charge()` retorna `Promise<PaymentResult>` no contrato, mesmo o simulado sendo síncrono.** Asaas será assíncrono (rede). O simulado resolve dentro de `async charge()` e retorna imediatamente — nunca retorna `PENDING` (síncrono por definição).
- **Sem `*.spec.ts` nesta etapa.** Precedente do `CatalogModule` (não tem specs). A regra de paridade do simulado (último dígito par→aprovado) é trivialmente testável se/quando fizer sentido.
- **`PaymentResult` local em `src/payments/interfaces/`, não em `packages/shared`.** Contrato interno backend (provider ↔ service). Não há consumidor frontend nesta etapa; expor pra `@elite-dev/shared` seria prematuro.

## Dívidas registradas (fora desta etapa)

- **Enum `PaymentStatus` precisa de `PENDING` (Bloco 5).** Hoje `APPROVED`/`DECLINED` only. Quando o Asaas (assíncrono) entrar, `PENDING` terá de ser persistido em `Reservation.paymentStatus`. Hoje esse campo só recebe `null` (`reservations.repository.spec.ts:45`), nunca é escrito em produção — sem impacto nesta etapa.
- **Correção do `prompts-implementacao-reserva.md` (arquivo externo ao repo):** o item 1 do Bloco 5 desse prompt menciona só as colunas `asaasCustomerId`/`asaasPaymentId` — não menciona a migration do enum `PaymentStatus` pra incluir `PENDING`. Lacuna identificada aqui; a edição do prompt é externa (o arquivo não vive no workspace).

## Estrutura de arquivos

```
apps/backend/src/payments/
├── payments.module.ts
├── interfaces/
│   └── payment-provider.interface.ts
└── providers/
    └── simulated.provider.ts
```

## Interface — `payment-provider.interface.ts` (`src/payments/interfaces/`)

```ts
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface Customer {
  name: string;
  email: string;
}

// reservationId -> idempotência do webhook do Asaas (futuro);
// customer -> obrigatório na API do Asaas; simulado ignora ambos.
export interface ChargeInput {
  reservationId: string;
  amount: number;
  cardNumber: string;
  customer: Customer;
}

export type PaymentResult =
  | { status: 'APPROVED' }
  | { status: 'DECLINED' }
  | { status: 'PENDING'; externalId: string };

export interface PaymentProvider {
  charge(input: ChargeInput): Promise<PaymentResult>;
}
```

Sem `import type { PaymentStatus }` (morto + incompatível — ver Decisões).

## Provider simulado — `simulated.provider.ts` (`src/payments/providers/`)

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ChargeInput,
  PaymentResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class SimulatedPaymentProvider implements PaymentProvider {
  async charge({ cardNumber }: ChargeInput): Promise<PaymentResult> {
    const last = cardNumber?.trim().slice(-1);
    if (!last || !/\d/.test(last)) {
      throw new BadRequestException('Número de cartão inválido');
    }
    const digit = Number(last);
    return digit % 2 === 0
      ? { status: 'APPROVED' }
      : { status: 'DECLINED' };
  }
}
```

Regra determinística de teste: último dígito **par → APPROVED**, **ímpar → DECLINED**. Nunca retorna `PENDING` (síncrono). Sem dependências de construtor.

## Module — `payments.module.ts` (`src/payments/`)

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './interfaces/payment-provider.interface';
import { SimulatedPaymentProvider } from './providers/simulated.provider';

@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (config: ConfigService): PaymentProvider => {
        const driver = config.get<string>('PAYMENT_PROVIDER') ?? 'simulated';
        switch (driver) {
          case 'simulated':
            return new SimulatedPaymentProvider();
          // case 'asaas': return new AsaasPaymentProvider(config);
          default:
            throw new Error(`Unknown PAYMENT_PROVIDER: ${driver}`);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
```

`inject: [ConfigService]` já prepara o shape pra quando `AsaasPaymentProvider` precisar de `config` (credenciais/URLs). O `case 'asaas'` comentado é o gancho pronto pra receber o provider depois.

## Arquivos a modificar

1. `apps/backend/.env.example` — adicionar:
   ```
   # Payment module — provider selection ('simulated' default)
   PAYMENT_PROVIDER=simulated
   ```
2. `apps/backend/src/app.module.ts` — importar `PaymentsModule` no array `imports`.

## Convenções

- Nome de pasta plural (`payments`) — consistente com `reservations`/`events`/`users`.
- Imports cross-module: absolutos `src/...` (ex.: `src/payments/...` se consumido de outro módulo).
- Imports dentro do módulo: relativos `./`, `../`.
- `import type` para tipos-only (`ChargeInput`, `PaymentResult`).
- `@Injectable()` em todos os providers (mesmo o simulado, por consistência — ver nota em Decisões sobre o efeito nulo no DI container).

## Verificação (em `apps/backend`)

1. `npx prisma generate` → 2. `npm run lint` → 3. `npm run build`

Sem `npm test` novo nesta etapa (precedente do CatalogModule).
