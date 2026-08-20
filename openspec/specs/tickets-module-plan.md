# Plano: Módulo Tickets (Backend) — Etapa 1 (standalone + emissão + validação)

## Escopo desta etapa

Apenas o `TicketsModule` com suas 4 rotas (`GET /tickets/mine`, `GET /tickets/mine/:publicId`, `GET /tickets/:publicId`, `POST /tickets/validate`) e o método `TicketsService.issueForReservation(reservationId)` chamável por outro serviço. **Não** integra com o fluxo de pagamento/confirm (não cria `POST /reservations/:id/pay`, não transita `Reservation.status` para `CONFIRMED`, não escreve `paymentStatus`). O `ReservationsModule` será modificado na próxima etapa para importar `TicketsModule` e chamar `issueForReservation` quando o `PAYMENT_PROVIDER` retornar `APPROVED`. O `Ticket.signature` (campo `schema.prisma:195`) passa a ser populado nesta etapa; hoje não é escrito por nenhum código.

## Decisões

- **QR payload = JSON versionado `{"v":1,"id":"<uuid>","sig":"<hex sha256>"}`.** O QR carrega só `publicId` (= `Ticket.id`, o próprio UUID, sem campo duplicado) + `signature`. O `eventId` **não** vai no QR porque no `validate` o BE pega o `eventId` via join `ticket → reservation → event` e recompute o HMAC; incluir `eventId` no QR seria redundante e aumentaria a área de dados escaneável. O campo `v` permite evoluir o formato sem ambiguidade. ~120 chars, trivial para QR.
- **BE é dono da string `qrContent`; FE só renderiza a imagem.** `GET /tickets/mine` e `GET /tickets/mine/:publicId` devolvem o `qrContent` (o JSON acima já serializado) e o FE renderiza o QR com uma lib client-side (`qrcode.react`). Não se adiciona `qrcode` (npm) ao backend — gerar PNG server-side não traz benefício e engorda o bundle.
- **FE parseia o QR escaneado; `POST /tickets/validate` recebe DTO estruturado.** O FE faz `JSON.parse` do conteúdo escaneado (trivial) e envia `{ publicId, signature, expectedEventId? }`. O endpoint de validate é **agnóstico ao encoding** do QR. Motivos: (1) a portaria também suporta **digitação manual** (operador digita `publicId`+`signature` de um ticket impresso) — esse caminho precisa do DTO estruturado de qualquer forma; (2) o contrato de validate fica estável se o formato do QR evoluir; (3) a lógica de validate é testável sem acoplamento ao formato. O `expectedEventId` é opcional — só preenchido quando a tela de portaria sabe em qual evento está operando (caso clássico: portaria de um cinema/show com múltiplas sessões no mesmo local).
- **Split de segurança: `GET /tickets/:publicId` é público mas **não** devolve signature/qrContent.** Se uma URL pública, sem auth, devolvesse a `signature`, qualquer pessoa que recebesse o link de compartilhamento copiaria a assinatura e conseguiria validar (e portanto "burnar"/marcar `usedAt`) o ticket alheio na portaria antes do dono. Vetor de ataque real: vazou o link = perdeu o ingresso. Logo: a rota pública devolve só metadados (evento, setor/assento, `used: boolean`); o QR/scannable só vem para o dono autenticado via `/mine`. O `publicId` sozinho (UUID) é inexequível para adivinhar e não permite validar sem a `signature`.
- **HMAC-SHA256 sobre `"${ticketId}:${eventId}"`, chave em `TICKET_SECRET`.** Separador `:` escolhido por ser estável e não aparecer em UUIDs nem em `eventId` (UUIDs). `crypto.createHmac('sha256', secret).update(...).digest('hex')` — Node built-in, sem dependência nova. Comparação no `validate` via `crypto.timingSafeEqual` (guardando diferença de comprimento antes, pois `timingSafeEqual` lança em tamanhos distintos).
- **`TICKET_SECRET` via `configService.getOrThrow<string>('TICKET_SECRET')`.** Falha rápida no boot se a env var faltar (crash ao instanciar o service), mesmo princípio de `jwt.strategy.ts:18`/`auth.module.ts:19` para `JWT_SECRET`. Nunca hardcoded, nunca com default fraco. Adicionar a `.env.example` e `.env`.
- **`issueForReservation(reservationId)` não tem endpoint HTTP próprio.** É um método público do `TicketsService`, chamado pelo `ReservationsService` (próxima etapa) quando o pagamento é aprovado. O `id` do ticket é gerado server-side (`crypto.randomUUID()`), e é também o `publicId` exposto — não há campo `publicId` duplicado no schema (confirma `schema.prisma:186-201`).
- **Checagem de posse no service, não no repository.** `findMineOne` reusa `findByPublicId(publicId, include)` e checa `ticket.userId !== userId` no service, lançando `NotFoundException` tanto para não-encontrado quanto para "não é seu". Isso (a) alinha com a convenção de authz no service (`events.service.ts:288-290` faz `event.organizerId !== user.userId` no service); (b) deixa o princípio "não revelar existência" **explícito em código** (dois `NotFoundException` no mesmo método); (c) dispensa um `findByPublicIdForUser(publicId, userId)` extra no repo — `findByPublicId` já é reusado por `findOne` (público) e `validate`. Desvio deliberado do padrão 403 do `events` (que usa `ForbiddenException`): aqui queremos 404 para não confirmar que o `publicId` existe, mesmo princípio do passo 1 do `validate` (ticket inexistente → `INVALID`, não 404).
- **State machine do `validate` em ordem fixa, 4 estados.** (1) não existe → `INVALID` (não revela existência); (2) `expectedEventId` informado e divergente → `WRONG_EVENT`; (3) HMAC recompute divergente → `INVALID`; (4) `markUsed` atômico retorna `count===0` → `ALREADY_USED`; senão `VALID` e `usedAt` setado neste request. A ordem importa: `WRONG_EVENT` antes do HMAC é barata (comparação de string) e não exige recompute; `INVALID` por assinatura não muta estado; só `VALID` muta (`markUsed`).
- **Concorrência de validação: `updateMany where:{ id, usedAt:null }` é o guard.** Duas portarias escaneando o mesmo ticket simultaneamente: ambas carregam (`usedAt=null`), ambas recompute HMAC (válido), ambas chamam `markUsed` — exatamente um `updateMany` afeta a linha (`count=1` → `VALID`), o outro vê `usedAt` já preenchido (`count=0` → `ALREADY_USED`). Não há double-use. O `markUsed` sozinho é atômico no nível da linha; **não** se envolve em `$transaction` (diferente de `reservations.repository.ts:31`, que precisa de tx porque faz `updateMany` condicional + `create` na mesma unidade). Aqui a escrita é um único `updateMany`.
- **`@Roles(Role.CLIENT)` nas rotas `/mine`; `@Roles(Role.GATE, Role.ADMIN)` em `/validate`.** Espelha `reservations.controller.ts:16` (CLIENT em operações de cliente) e o enum `Role` do schema (`GATE` é a portaria). `/:publicId` não tem guard (link compartilhável). Guards aplicados **por-rota** via `@UseGuards(JwtGuard, RolesGuard)` — não há `APP_GUARD` global (`app.module.ts` não registra um).
- **Ordenação de rotas no controller: estáticas antes de `:publicId`.** `@Get('mine')` e `@Get('mine/:publicId')` declarados **antes** de `@Get(':publicId')`, senão `GET /tickets/mine` é capturado por `:publicId` com `publicId="mine"`. Espelha `events.controller.ts:33-43` (`movies` antes de `:id`). `@Post('validate')` é verbo diferente, sem conflito de ordem.
- **`TicketsModule` exporta `TicketsService`** para o `ReservationsModule` importar e injetar na próxima etapa. `PrismaService` re-listado em `providers` (não é global — padrão de `events.module.ts:9`).
- **Response: objeto cru, sem wrapper.** Lista segue `{ items, page, totalPages, totalResults }` (padrão de `events.service.ts:90-95`). Datas em `.toISOString()`. Nada de `{ data, message }`.

## Dívidas registradas (fora desta etapa)

- **Integração pagamento → confirm → emissão.** Próxima etapa: `ReservationsModule` importa `TicketsModule`, cria `POST /reservations/:id/pay` (ou `PATCH /:id/confirm`) que chama `PAYMENT_PROVIDER.charge(...)`; em `APPROVED`, transita `Reservation.status` para `CONFIRMED`, seta `paymentStatus = APPROVED`, e chama `TicketsService.issueForReservation(reservationId)` dentro de uma `$transaction` (junto com o update da reserva) para que ticket só seja criado se a reserva realmente confirmar. `ReservationsModule` hoje não importa `PaymentsModule` nem `TicketsModule` (`reservations.module.ts:7-11`).
- **Tela de portaria no FE** (escanear/digitar + chamar `/validate`) e **tela "Meus Ingressos" → detalhe** (chamar `/mine/:publicId` e renderizar `qrContent`) são dívidas de frontend, não backend.

## Estrutura de arquivos

```
apps/backend/src/tickets/
├── tickets.module.ts
├── tickets.controller.ts
├── tickets.service.ts
├── tickets.repository.ts
├── tickets.repository.spec.ts
└── dto/
    ├── validate-ticket.dto.ts
    └── query-my-tickets.dto.ts
```

## Repository — `tickets.repository.ts` (`src/tickets/`)

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  TicketCreateInput,
  TicketInclude,
  TicketModel,
  TicketWhereInput,
} from '../generated/prisma/models';

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: TicketCreateInput, include?: TicketInclude): Promise<TicketModel> {
    return this.prisma.ticket.create({ data, include });
  }

  findByPublicId(id: string, include?: TicketInclude): Promise<TicketModel | null> {
    return this.prisma.ticket.findUnique({ where: { id }, include });
  }

  findManyByUser(
    userId: string,
    params: { skip: number; take: number; include?: TicketInclude },
  ): Promise<TicketModel[]> {
    return this.prisma.ticket.findMany({
      where: { userId },
      skip: params.skip,
      take: params.take,
      include: params.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.ticket.count({ where: { userId } });
  }

  // Guard de concorrência da validação: where { id, usedAt: null } faz com que
  // exatamente um updateMany simultâneo afete a linha (count=1); concorrentes
  // veem usedAt já preenchido (count=0). Não precisa de $transaction.
  markUsed(id: string) {
    return this.prisma.ticket.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  // Carrega a reserva + eventId/userId para issueForReservation.
  findReservationWithEvent(reservationId: string) {
    return this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, eventId: true, userId: true, status: true },
    });
  }
}
```

## Service — `tickets.service.ts` (`src/tickets/`)

```ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { TicketsRepository } from './tickets.repository';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { QueryMyTicketsDto } from './dto/query-my-tickets.dto';
import type { TicketInclude, TicketModel } from '../generated/prisma/models';

const TICKET_INCLUDE: TicketInclude = {
  reservation: { include: { event: true, seat: true, ticketType: true } },
};

type ValidateStatus =
  | { status: 'VALID' }
  | { status: 'INVALID' }
  | { status: 'ALREADY_USED' }
  | { status: 'WRONG_EVENT' };

@Injectable()
export class TicketsService {
  private readonly ticketSecret: string;

  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly configService: ConfigService,
  ) {
    this.ticketSecret =
      this.configService.getOrThrow<string>('TICKET_SECRET');
  }

  // Chamado pelo ReservationsService quando paymentStatus = APPROVED (próxima etapa).
  async issueForReservation(reservationId: string) {
    const reservation =
      await this.ticketsRepository.findReservationWithEvent(reservationId);
    if (!reservation) {
      throw new NotFoundException(`Reserva ${reservationId} não encontrada`);
    }
    const id = randomUUID();
    const signature = this.signTicket(id, reservation.eventId);
    const ticket = await this.ticketsRepository.create(
      {
        id,
        reservation: { connect: { id: reservation.id } },
        user: { connect: { id: reservation.userId } },
        signature,
      },
      TICKET_INCLUDE,
    );
    return this.toResponse(ticket, { withQr: true });
  }

  async findMine(userId: string, query: QueryMyTicketsDto) {
    const page = query.page ?? 1;
    const size = query.size ?? 20;
    const [items, total] = await Promise.all([
      this.ticketsRepository.findManyByUser(userId, {
        skip: (page - 1) * size,
        take: size,
        include: TICKET_INCLUDE,
      }),
      this.ticketsRepository.countByUser(userId),
    ]);
    return {
      items: items.map((t) => this.toResponse(t, { withQr: true })),
      page,
      totalPages: Math.ceil(total / size) || 1,
      totalResults: total,
    };
  }

  async findMineOne(publicId: string, userId: string) {
    const ticket = await this.ticketsRepository.findByPublicId(
      publicId,
      TICKET_INCLUDE,
    );
    // Não revela existência: 404 tanto para inexistente quanto para "não é seu".
    if (!ticket) throw new NotFoundException();
    if (ticket.userId !== userId) throw new NotFoundException();
    return this.toResponse(ticket, { withQr: true });
  }

  async findOne(publicId: string) {
    const ticket = await this.ticketsRepository.findByPublicId(
      publicId,
      TICKET_INCLUDE,
    );
    if (!ticket) throw new NotFoundException();
    return this.toPublicResponse(ticket);
  }

  async validate(dto: ValidateTicketDto): Promise<ValidateStatus> {
    const ticket = await this.ticketsRepository.findByPublicId(
      dto.publicId,
      TICKET_INCLUDE,
    );
    // 1. Inexistente -> INVALID (não revela existência).
    if (!ticket) return { status: 'INVALID' };

    const eventId = ticket.reservation.eventId;

    // 2. Evento esperado divergente -> WRONG_EVENT (antes do HMAC, é barato).
    if (dto.expectedEventId && dto.expectedEventId !== eventId) {
      return { status: 'WRONG_EVENT' };
    }

    // 3. Assinatura não confere -> INVALID.
    const expected = this.signTicket(ticket.id, eventId);
    if (!this.safeEqualHex(expected, dto.signature)) {
      return { status: 'INVALID' };
    }

    // 4. Marca usedAt atomicamente. count=0 -> outra validação ganhou a corrida.
    const { count } = await this.ticketsRepository.markUsed(ticket.id);
    if (count === 0) return { status: 'ALREADY_USED' };
    return { status: 'VALID' };
  }

  private signTicket(ticketId: string, eventId: string): string {
    return createHmac('sha256', this.ticketSecret)
      .update(`${ticketId}:${eventId}`)
      .digest('hex');
  }

  // timingSafeEqual lança em tamanhos distintos; guarda antes de comparar.
  private safeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  private toQrContent(id: string, signature: string): string {
    return JSON.stringify({ v: 1, id, sig: signature });
  }

  private toResponse(
    ticket: TicketModel,
    opts: { withQr: boolean },
  ) {
    const base = this.toPublicResponse(ticket);
    return opts.withQr
      ? { ...base, signature: ticket.signature, qrContent: this.toQrContent(ticket.id, ticket.signature) }
      : base;
  }

  // Resposta pública (link compartilhável): sem signature, sem qrContent.
  private toPublicResponse(ticket: TicketModel) {
    return {
      id: ticket.id,
      reservationId: ticket.reservationId,
      userId: ticket.userId,
      event: {
        id: ticket.reservation.event.id,
        name: ticket.reservation.event.name,
        date: ticket.reservation.event.date.toISOString(),
        location: ticket.reservation.event.location,
      },
      seat: ticket.reservation.seat
        ? { id: ticket.reservation.seat.id, row: ticket.reservation.seat.row, number: ticket.reservation.seat.number }
        : null,
      ticketType: ticket.reservation.ticketType
        ? { id: ticket.reservation.ticketType.id, name: ticket.reservation.ticketType.name }
        : null,
      used: ticket.usedAt !== null,
      usedAt: ticket.usedAt ? ticket.usedAt.toISOString() : null,
      createdAt: ticket.createdAt.toISOString(),
    };
  }
}
```

## Controller — `tickets.controller.ts` (`src/tickets/`)

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { QueryMyTicketsDto } from './dto/query-my-tickets.dto';
import { Roles } from 'src/common/roles.decorator';
import { RolesGuard } from 'src/common/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import JwtGuard from 'src/auth/guards/jwt.guard';
import type { AuthenticatedUser } from 'src/auth/auth.types';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // Estáticas ANTES de :publicId (senão /mine cai em :publicId). Espelha
  // events.controller.ts (movies antes de :id).
  @Get('mine')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CLIENT)
  findMine(
    @Query() query: QueryMyTicketsDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.ticketsService.findMine(req.user.userId, query);
  }

  @Get('mine/:publicId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CLIENT)
  findMineOne(
    @Param('publicId') publicId: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.ticketsService.findMineOne(publicId, req.user.userId);
  }

  // Público (link compartilhável). Sem guard. Devolve só metadata + `used`.
  @Get(':publicId')
  findOne(@Param('publicId') publicId: string) {
    return this.ticketsService.findOne(publicId);
  }

  // Verbo diferente, sem conflito de ordem com :publicId.
  @Post('validate')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.GATE, Role.ADMIN)
  validate(@Body() dto: ValidateTicketDto) {
    return this.ticketsService.validate(dto);
  }
}
```

## DTOs — `src/tickets/dto/`

```ts
// validate-ticket.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class ValidateTicketDto {
  @IsString() publicId: string;
  @IsString() signature: string;
  @IsOptional() @IsString() expectedEventId?: string;
}
```

```ts
// query-my-tickets.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryMyTicketsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) size: number = 20;
}
```

`@Type(() => Number)` coerje query string → number (funciona porque `main.ts:13` tem `ValidationPipe({ transform: true, whitelist: true })` global; `whitelist` stripa props desconhecidos). Defaults como inicializadores de campo, espelhando `query-events.dto.ts`.

## Module — `tickets.module.ts` (`src/tickets/`)

```ts
import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository, PrismaService],
  exports: [TicketsService], // ReservationsModule importa na próxima etapa
})
export class TicketsModule {}
```

## Arquivos a modificar

1. `apps/backend/.env.example` — adicionar:
   ```
   # Tickets module — HMAC secret para assinatura de ingressos
   TICKET_SECRET=your-ticket-signing-secret-here
   ```
2. `apps/backend/.env` — adicionar `TICKET_SECRET=<valor real>`.
3. `apps/backend/src/app.module.ts` — importar `TicketsModule` no array `imports` (já que `PaymentsModule`/`ReservationsModule` já estão lá).

## Resumo das 3 rotas de leitura + 1 de validação

| Rota | Auth | Devolve `qrContent`? | Uso |
|---|---|---|---|
| `GET /tickets/mine` | sim (dono, `CLIENT`) | sim, por item | lista "Meus Ingressos" |
| `GET /tickets/mine/:publicId` | sim (dono, `CLIENT`) | sim | tela de detalhe do próprio ticket |
| `GET /tickets/:publicId` | não (público) | **não, nunca** | link público de compartilhamento |
| `POST /tickets/validate` | sim (`GATE`/`ADMIN`) | n/a | portaria (escaneado ou digitado) |

## State machine do `validate` (4 estados, ordem fixa)

1. Ticket não existe por `publicId` → `{ status: 'INVALID' }` (não revela existência).
2. `expectedEventId` informado e `!== ticket.reservation.eventId` → `{ status: 'WRONG_EVENT' }`.
3. `HMAC(publicId + ':' + eventId, TICKET_SECRET)` (recompute via join) `!== signature` (`timingSafeEqual`) → `{ status: 'INVALID' }`.
4. `markUsed(publicId)` via `updateMany where:{ id, usedAt:null }`: `count === 0` → `{ status: 'ALREADY_USED' }` (outra validação ganhou a corrida); senão → `{ status: 'VALID' }` e `usedAt` setado neste request.

## Convenções

- Nome de pasta plural (`tickets`) — consistente com `reservations`/`events`/`users`/`payments`.
- Imports cross-module/cross-cutting: absolutos `src/...` (ex.: `src/prisma.service`, `src/common/roles.guard`, `src/auth/guards/jwt.guard`, `src/generated/prisma/enums`).
- Imports dentro do módulo: relativos `./`, `../`.
- `import type` para tipos-only (`AuthenticatedUser`, `TicketModel`, `TicketInclude`, etc.).
- Guard `JwtGuard` é **default export** — importar sem chaves: `import JwtGuard from 'src/auth/guards/jwt.guard'`.
- Tipos Prisma do barrel `../generated/prisma/models` com `import type`; enums de `src/generated/prisma/enums` (importáveis como valor: `Role.CLIENT`).
- `PrismaService` re-listado em `providers` de cada feature module (não é global).
- DTOs com `class-validator` empilhados verticalmente; `@Type(() => Number)` para query numérico.
- Response objeto cru, sem wrapper; lista em `{ items, page, totalPages, totalResults }`; datas em `.toISOString()`.
- `@Injectable()` em todos os providers (service, repository).

## Testes — `tickets.repository.spec.ts`

Espelhar `reservations.repository.spec.ts`: mock de `PrismaService` com `jest.fn()` por delegate; mock de `$transaction` invocando o callback com tx fake quando aplicável. Cobrir: `create`, `findByPublicId`, `findManyByUser`, `countByUser`, `markUsed` (assertar `where: { id, usedAt: null }`), `findReservationWithEvent`. Opcional: `tickets.service.spec.ts` para os 4 estados do `validate` (mock repo + `TICKET_SECRET` em `ConfigService`), `issueForReservation` (assertar `id=uuid`, `signature=HMAC`), `findMineOne` (404 para inexistente **e** para `userId` divergente — ambos `NotFoundException`).

## Verificação (em `apps/backend`)

1. `npx prisma generate` → 2. `npm run lint` → 3. `npm test` → 4. `npm run build`

`npx prisma generate` é obrigatório antes (o client gerado é gitignored; `AGENTS.md` documenta). Sem migration nesta etapa (schema `Ticket` já existe em `schema.prisma:186-201`).
