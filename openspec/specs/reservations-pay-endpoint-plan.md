# Plano: Endpoint POST /reservations/:id/pay (Backend) — Etapa 2 (integração pagamento → confirmação → emissão)

## Escopo desta etapa

Wire-up do `POST /reservations/:id/pay`: o `ReservationsModule` importa `TicketsModule` + `PaymentsModule`, injeta `TicketsService` + `@Inject(PAYMENT_PROVIDER)`, e adiciona o método `ReservationsService.pay(reservationId, userId, cardNumber)`. O fluxo: carrega a reserva com relações → valida `PENDING` + ownership → recalcula `amount` do persistido → chama `paymentProvider.charge(...)` → em `APPROVED` confirma a reserva e delega emissão do ticket ao `TicketsService.issueForReservation`; em `DECLINED` marca `paymentStatus` e mantém `PENDING`. **Não** implementa o branch `PENDING` do `PaymentResult` (só existirá quando o Asaas for plugado, acompanhado de coluna de schema que ainda não existe).

## Pré-requisitos confirmados

- **`TicketsModule` existe e está pronto.** `TicketsService.issueForReservation(reservationId: string)` implementado em `src/tickets/tickets.service.ts:66`, testado (`tickets.service.spec.ts:70-99`), e `TicketsModule` já faz `exports: [TicketsService]` com o comentário "ReservationsModule imports this in the next step".
- **`PaymentsModule` existe e está pronto.** Token `PAYMENT_PROVIDER = Symbol(...)`, `useFactory` + `inject: [ConfigService]`, `exports: [PAYMENT_PROVIDER]`. `SimulatedPaymentProvider` retorna `APPROVED` (último dígito par) ou `DECLINED` (ímpar); nunca `PENDING`.
- **`Reservation.paymentStatus` existe no schema** (`prisma/schema.prisma:170`, nullable `PaymentStatus?`). Hoje nunca é escrito por código de produção — passa a ser populado nesta etapa.
- **`PaymentStatus` enum** (`schema.prisma:51-54`) tem apenas `APPROVED`/`DECLINED` — **não tem `PENDING`**. Alinhado com a decisão do `payments-module-plan.md` de não importar o enum no contrato `PaymentProvider`.

## Decisões

- **Preço sempre recalculado do persistido, nunca do corpo da requisição.** O DTO `PayReservationDto` só aceita `cardNumber`. O `ValidationPipe` com `whitelist: true` (global em `main.ts:13`) stripa qualquer propriedade extra — se o cliente enviar `amount` no body, ela é descartada antes de chegar ao service. O service lê o preço das relações já persistidas na reserva.
- **Origem do preço difere por tipo de reserva, mas ambas passam por `TicketType.price`.** (a) Reserva por setor (`ticketTypeId` preenchido): `amount = Number(reservation.ticketType.price)` — a relação `ticketType` vem do `include` na query. (b) Reserva por assento (`seatId` preenchido, `ticketTypeId = null`): `amount = Number(reservation.event.ticketTypes[0].price)` — o wizard do organizador sempre cria exatamente um `TicketType` chamado "Geral" para eventos com assentos (confirmado em `apps/frontend/src/routes/_authenticated/organizador/eventos/novo.tsx:214-235`), e a tela de `filmes/:externalId` lê `sessionEvent.ticketTypes[0].price` como preço por assento (`apps/frontend/src/routes/filmes/$externalId.tsx:82-83`). Se o evento não tiver nenhum `TicketType` (caso teoricamente possível via API direta, embora o wizard nunca permita), lança `ConflictException` — preço não determinável.
- **Ownership: `NotFoundException` para inexistente OU não-proprietário.** Se `reservation.userId !== userId`, lança `NotFoundException` — não revela que a reserva existe mas pertence a outro. Espelha `TicketsService.findMineOne` (`tickets.service.ts:180-188`: dois `NotFoundException` no mesmo método, um para `null`, um para `userId` divergente). Não usa `ForbiddenException` (que confirmaria existência).
- **Ordem: confirmar reserva → depois emitir ticket.** O `ReservationsService` chama `reservationsRepository.confirm(reservationId)` (update `status=CONFIRMED` + `paymentStatus=APPROVED`) **antes** de `ticketsService.issueForReservation(reservationId)`. Conforme instruído: o `ReservationsModule` só decide "pagamento aprovado, pode emitir" e delega; a criação do Ticket (inclusive HMAC) fica no `TicketsModule`. `issueForReservation` não transita `Reservation.status` — só cria o `Ticket` — então a confirmação deve preceder a emissão.
- **Sem `$transaction` entre `confirm` e `issueForReservation`.** O `issueForReservation` usa o `PrismaService` do `TicketsModule` (instância distinta do `PrismaService` do `ReservationsModule` — não há `@Global()` nem provider compartilhado). Um `$transaction` cross-module exigiria passar o `PrismaClient` do `ReservationsRepository` para o `TicketsRepository`, quebrando o encapsulamento. Se `issueForReservation` falhar após `confirm`, a reserva fica `CONFIRMED` sem ticket — limitação conhecida, ajustável na etapa do Asaas com pattern de compensação ou retry. O `Ticket.reservationId @unique` (`schema.prisma:188`) previne duplicação se houver retry.
- **Sem branch `PENDING` no `PaymentResult`.** O `SimulatedPaymentProvider` nunca retorna `PENDING` (síncrono por definição — ver `payments-module-plan.md` Decisões). O enum `PaymentStatus` não tem `PENDING`. Adicionar o branch agora seria código morto até o Asaas ser plugado, acompanhado de uma coluna de schema (`externalId`) que ainda não existe. O `switch`/`if` cobre `APPROVED` e `DECLINED`; o caso default (qualquer outro status) lança `InternalServerErrorException` como rede de segurança — não é "tratamento de PENDING", é falha explícita.
- **`customer` preenchido do `User` persistido, não do body.** O `ChargeInput.customer: { name, email }` vem do `reservation.user` (carregado via `include user: { select: { name, lastName, email } }`). O simulado ignora `customer`, mas o Asaas o exigirá — preencher agora evita quebrar o contrato depois.
- **Retorno `APPROVED`: o ticket emitido.** `issueForReservation` já retorna `{ id, reservationId, ..., signature, qrContent }` (com `withQr: true`). O cliente recebe imediatamente seu ingresso ao pagar — UX direta sem segundo round-trip.
- **Retorno `DECLINED`: `{ status: 'DECLINED', message: 'Pagamento recusado' }` com HTTP 200.** Pagamento recusado é um outcome de negócio, não um erro de servidor. Lançar exceção (4xx) faria o TanStack Query tratar como erro genérico; retornar 200 com `{ status: 'DECLINED' }` permite ao frontend decidir a UI (mensagem + botão "tentar novamente"). O `paymentStatus` é persistido como `DECLINED`; `status` permanece `PENDING` (não perde a trava do assento/estoque).
- **Idempotência parcial via checagem de `PENDING`.** Se o cliente reenvia o pay para uma reserva já `CONFIRMED` (retry após timeout), o service rejeita com `BadRequestException('Reserva não está pendente')` — o check `status !== 'PENDING'` age como guard. Não há proteção contra concorrência real (dois pays simultâneos para a mesma reserva `PENDING`): ambos poderiam chamar `charge`, ambos receber `APPROVED`, mas o `Ticket.reservationId @unique` previne dois tickets — o segundo `issueForReservation` lança `P2002`. Limitação aceitável para o provider simulado; o Asaas (com `reservationId` para idempotência no webhook) resolverá nativamente.
- **`@Roles(Role.CLIENT)` no endpoint.** Mesmo padrão do `POST /reservations` existente (`reservations.controller.ts:15-16`): `@UseGuards(JwtGuard, RolesGuard)` + `@Roles(Role.CLIENT)`. Apenas o dono da reserva paga — `userId` do JWT, nunca do body.

## Endpoint

| Método | Rota | Auth | Retorna |
|--------|------|------|---------|
| `POST` | `/reservations/:id/pay` | JWT + `RolesGuard` + `@Roles(Role.CLIENT)` | `APPROVED` → `TicketResponse` (com `signature` + `qrContent`); `DECLINED` → `{ status: 'DECLINED', message: string }` |

## DTO — `PayReservationDto` (`src/reservations/dto/pay-reservation.dto.ts`)

```ts
import { IsNotEmpty, IsString } from 'class-validator';

export class PayReservationDto {
  @IsString()
  @IsNotEmpty()
  cardNumber: string;
}
```

Sem campo `amount` — explicitamente ausente. O `whitelist: true` do `ValidationPipe` global rejeita props extras se enviadas.

## Repository — `ReservationsRepository` (métodos adicionais)

Thin wrapper sobre `PrismaService` (igual aos métodos existentes). Tipos via `import type { ... } from '../generated/prisma/models'`.

```ts
// Carrega reserva com tudo que o pay precisa: preço (ticketType próprio
// ou ticketTypes do evento), e customer (name/email do user).
findByIdWithRelations(id: string) {
  return this.prisma.reservation.findUnique({
    where: { id },
    include: {
      ticketType: true,
      seat: true,
      event: { include: { ticketTypes: true } },
      user: { select: { name: true, lastName: true, email: true } },
    },
  });
}

// APPROVED: status -> CONFIRMED, paymentStatus -> APPROVED.
confirm(id: string) {
  return this.prisma.reservation.update({
    where: { id },
    data: { status: 'CONFIRMED', paymentStatus: 'APPROVED' },
  });
}

// DECLINED: paymentStatus -> DECLINED; status permanece PENDING.
markDeclined(id: string) {
  return this.prisma.reservation.update({
    where: { id },
    data: { paymentStatus: 'DECLINED' },
  });
}
```

## Service — `ReservationsService` (constructor + método `pay`)

### Constructor — 2 novas injeções

```ts
import { Inject } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../payments/interfaces/payment-provider.interface';

constructor(
  private readonly reservationsRepository: ReservationsRepository,
  @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  private readonly ticketsService: TicketsService,
) {}
```

### Método `pay`

```ts
async pay(reservationId: string, userId: string, cardNumber: string) {
  // 1. Carrega reserva com relações (preço + customer).
  const reservation =
    await this.reservationsRepository.findByIdWithRelations(reservationId);

  // 2. Ownership: não revela existência para não-proprietário.
  if (!reservation || reservation.userId !== userId) {
    throw new NotFoundException(`Reserva ${reservationId} não encontrada`);
  }

  // 3. Valida PENDING (idempotência: retry de reserva já paga é rejeitado).
  if (reservation.status !== 'PENDING') {
    throw new BadRequestException('Reserva não está pendente');
  }

  // 4. Amount recalculado do persistido — nunca do body.
  let amount: number;
  if (reservation.ticketType) {
    amount = Number(reservation.ticketType.price);
  } else if (reservation.event?.ticketTypes?.length) {
    amount = Number(reservation.event.ticketTypes[0].price);
  } else {
    throw new ConflictException('Preço da reserva não encontrado');
  }

  // 5. Charge via provider injetado (simulado agora, Asaas depois).
  const result = await this.paymentProvider.charge({
    reservationId,
    amount,
    cardNumber,
    customer: {
      name: reservation.user.name,
      email: reservation.user.email,
    },
  });

  // 6. Dispatch por status do resultado.
  if (result.status === 'APPROVED') {
    await this.reservationsRepository.confirm(reservationId);
    return this.ticketsService.issueForReservation(reservationId);
  }

  if (result.status === 'DECLINED') {
    await this.reservationsRepository.markDeclined(reservationId);
    return { status: 'DECLINED', message: 'Pagamento recusado' };
  }

  // PENDING: não implementado nesta etapa. Sem coluna no schema para
  // externalId; sem uso até o Asaas ser plugado. Falha explícita.
  throw new InternalServerErrorException('Estado de pagamento não suportado');
}
```

### Imports adicionais no service

```ts
import { InternalServerErrorException } from '@nestjs/common';
```

Acrescentar `InternalServerErrorException` ao import block existente de `@nestjs/common` (linha 1-6).

## Controller — `ReservationsController` (endpoint adicional)

```ts
@Post(':id/pay')
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.CLIENT)
pay(
  @Param('id') id: string,
  @Body() dto: PayReservationDto,
  @Req() req: Request & { user: AuthenticatedUser },
) {
  return this.reservationsService.pay(id, req.user.userId, dto.cardNumber);
}
```

Imports adicionais: `Param` no import de `@nestjs/common`; `PayReservationDto` no import do `dto/`.

## Module — `ReservationsModule` (imports adicionados)

```ts
import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsRepository } from './reservations.repository';
import { PrismaService } from 'src/prisma.service';
import { TicketsModule } from 'src/tickets/tickets.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [TicketsModule, PaymentsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsRepository, PrismaService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
```

`TicketsModule` exporta `TicketsService` (`tickets.module.ts:10`); `PaymentsModule` exporta `PAYMENT_PROVIDER` (`payments.module.ts:20`). Ambos ficam visíveis ao DI container do `ReservationsModule` após `imports`.

## Estrutura de arquivos

```
apps/backend/src/reservations/
├── reservations.module.ts          (alterado — adiciona imports)
├── reservations.controller.ts      (alterado — adiciona endpoint pay)
├── reservations.service.ts         (alterado — injeta deps + método pay)
├── reservations.repository.ts      (alterado — 3 métodos novos)
├── reservations.service.spec.ts     (novo — specs do pay)
└── dto/
    ├── create-reservation.dto.ts
    ├── exactly-one-of.validator.ts
    ├── create-reservation.dto.spec.ts
    └── pay-reservation.dto.ts       (novo)
```

## Arquivos a modificar

1. `apps/backend/src/reservations/dto/pay-reservation.dto.ts` — **novo** DTO.
2. `apps/backend/src/reservations/reservations.repository.ts` — adicionar `findByIdWithRelations`, `confirm`, `markDeclined`.
3. `apps/backend/src/reservations/reservations.service.ts` — injetar `PaymentProvider` + `TicketsService`; adicionar método `pay`.
4. `apps/backend/src/reservations/reservations.controller.ts` — adicionar `@Post(':id/pay')`.
5. `apps/backend/src/reservations/reservations.module.ts` — adicionar `imports: [TicketsModule, PaymentsModule]`.

Nenhuma mudança em `app.module.ts` (já importa `ReservationsModule`, `TicketsModule`, `PaymentsModule`).

## Dívidas registradas (fora desta etapa)

- **Branch `PENDING` do `PaymentResult`.** Quando o Asaas (assíncrono) for plugado, `charge()` poderá retornar `{ status: 'PENDING', externalId: string }`. Isso exige: (a) adicionar `PENDING` ao enum `PaymentStatus` via migration; (b) adicionar coluna `externalId` (ou `asaasPaymentId`) em `Reservation` para persistir o id externo; (c) webhook handler para receber a confirmação final do Asaas e então chamar `confirm` + `issueForReservation`. Tudo fora do escopo desta etapa.
- **Transaction entre `confirm` e `issueForReservation`.** Hoje não há atomicidade: se `issueForReservation` falhar após `confirm`, a reserva fica `CONFIRMED` sem ticket. Na etapa do Asaas, considerar: pattern de compensação (reverter `confirm` em catch) ou retry com idempotência (o `Ticket.reservationId @unique` já previne duplicação). Alternativa arquitetural: tornar `PrismaService` `@Global()` e passar o client via contexto de transação — mudança estrutural maior.
- **Concorrência no pay (double-pay simultâneo).** Dois requests `pay` simultâneos para a mesma reserva `PENDING`: ambos passam pelo check `status === 'PENDING'`, ambos chamam `charge`. Se ambos retornam `APPROVED`, ambos chamam `confirm` (segundo é no-op se já `CONFIRMED`) e `issueForReservation` (segundo falha com `P2002` no `Ticket.reservationId @unique`). Mitigação futura: `updateMany where: { id, status: 'PENDING' }` atômico como guard antes de chamar `charge` — se `count === 0`, outra requisição já está processando.

## Convenções

- Imports cross-module: absolutos `src/...` (ex.: `src/tickets/tickets.module`, `src/payments/payments.module`, `src/common/roles.decorator`, `src/auth/guards/jwt.guard`).
- Imports dentro do módulo: relativos `./`, `../`.
- `import type` para tipos-only (`PaymentProvider`, `AuthenticatedUser`, `ReservationModel`).
- Token `PAYMENT_PROVIDER` é `Symbol` — injetar via `@Inject(PAYMENT_PROVIDER)`, não via tipo.
- `@Injectable()` já no `ReservationsService` (existente); sem mudança.
- Guard `JwtGuard` é default export — `import JwtGuard from 'src/auth/guards/jwt.guard'`.
- DTOs com `class-validator` (`@IsString`/`@IsNotEmpty`, nunca `@IsUUID` mesmo ids sendo UUIDs).
- Response objeto cru, sem wrapper; datas em `.toISOString()`.

## Testes — `reservations.service.spec.ts` (novo)

Mock de `ReservationsRepository` (jest.fn por método), `PaymentProvider` (objeto com `charge: jest.fn`), e `TicketsService` (objeto com `issueForReservation: jest.fn`).

```ts
describe('ReservationsService.pay', () => {
  // Happy path: PENDING + ticketType -> charge APPROVED -> confirm + issue
  it('confirms reservation and issues ticket on APPROVED', async () => {
    reservationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'r1', userId: 'u1', status: 'PENDING',
      ticketType: { price: 150.00 },
      event: { ticketTypes: [] },
      user: { name: 'João', email: 'joao@test.com' },
    });
    paymentProvider.charge.mockResolvedValue({ status: 'APPROVED' });
    ticketsService.issueForReservation.mockResolvedValue({ id: 't1', signature: '...' });

    const result = await service.pay('r1', 'u1', '1234567890');

    expect(paymentProvider.charge).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'r1', amount: 150, cardNumber: '1234567890' })
    );
    expect(reservationsRepository.confirm).toHaveBeenCalledWith('r1');
    expect(ticketsService.issueForReservation).toHaveBeenCalledWith('r1');
    expect(result).toEqual({ id: 't1', signature: '...' });
  });

  // Declined path: marks DECLINED, keeps PENDING, no ticket issued
  it('marks declined and keeps PENDING on DECLINED', async () => {
    reservationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'r2', userId: 'u1', status: 'PENDING',
      ticketType: null,
      event: { ticketTypes: [{ price: 80.00 }] },
      user: { name: 'João', email: 'joao@test.com' },
    });
    paymentProvider.charge.mockResolvedValue({ status: 'DECLINED' });

    const result = await service.pay('r2', 'u1', '1234567891');

    expect(reservationsRepository.markDeclined).toHaveBeenCalledWith('r2');
    expect(reservationsRepository.confirm).not.toHaveBeenCalled();
    expect(ticketsService.issueForReservation).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'DECLINED', message: 'Pagamento recusado' });
  });

  // Seat-based reservation: amount from event.ticketTypes[0].price
  it('computes amount from event ticketTypes for seat-based reservation', async () => {
    reservationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'r3', userId: 'u1', status: 'PENDING',
      ticketType: null,
      seatId: 'seat-1',
      event: { ticketTypes: [{ price: 45.00 }] },
      user: { name: 'João', email: 'joao@test.com' },
    });
    paymentProvider.charge.mockResolvedValue({ status: 'APPROVED' });
    ticketsService.issueForReservation.mockResolvedValue({ id: 't3' });

    await service.pay('r3', 'u1', '2222');

    expect(paymentProvider.charge).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 45 })
    );
  });

  // Ownership: NotFoundException for other user's reservation
  it('throws NotFoundException when reservation belongs to another user', async () => {
    reservationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'r4', userId: 'other-user', status: 'PENDING',
      ticketType: { price: 100 }, event: { ticketTypes: [] },
      user: { name: 'Outro', email: 'outro@test.com' },
    });

    await expect(service.pay('r4', 'u1', '1234'))
      .rejects.toThrow(NotFoundException);
    expect(paymentProvider.charge).not.toHaveBeenCalled();
  });

  // Not PENDING: BadRequestException
  it('throws BadRequestException when reservation is not PENDING', async () => {
    reservationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'r5', userId: 'u1', status: 'CONFIRMED',
      ticketType: { price: 100 }, event: { ticketTypes: [] },
      user: { name: 'João', email: 'joao@test.com' },
    });

    await expect(service.pay('r5', 'u1', '1234'))
      .rejects.toThrow(BadRequestException);
  });

  // No price source: ConflictException
  it('throws ConflictException when no price source exists', async () => {
    reservationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'r6', userId: 'u1', status: 'PENDING',
      ticketType: null, seatId: 'seat-1',
      event: { ticketTypes: [] },
      user: { name: 'João', email: 'joao@test.com' },
    });

    await expect(service.pay('r6', 'u1', '1234'))
      .rejects.toThrow(ConflictException);
  });

  // PENDING result: InternalServerErrorException (not implemented)
  it('throws InternalServerErrorException on PENDING payment result', async () => {
    reservationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'r7', userId: 'u1', status: 'PENDING',
      ticketType: { price: 100 }, event: { ticketTypes: [] },
      user: { name: 'João', email: 'joao@test.com' },
    });
    paymentProvider.charge.mockResolvedValue({ status: 'PENDING', externalId: 'ext-1' });

    await expect(service.pay('r7', 'u1', '1234'))
      .rejects.toThrow(InternalServerErrorException);
  });
});
```

## Verificação (em `apps/backend`)

1. `npx prisma generate` → 2. `npm run lint` → 3. `npm test` (roda o `reservations.service.spec.ts` novo + specs existentes de tickets) → 4. `npm run build`
