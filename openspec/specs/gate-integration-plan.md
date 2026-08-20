# Plano: Portaria (Gate) — Stage 2 (Backend + Integração)

> Implementa o backend para o fluxo de portaria: enriquece o `POST /tickets/validate` com dados contextuais, adiciona `shortId`/`manualCode` ao schema `Ticket`, move `ExactlyOneOf` para `common/`, instala `@nestjs/throttler`, e adiciona filtro de data em `GET /events`. Pré-requisito: módulo tickets existente.

## Decisões (locked-in)

- **Dois novos campos no `Ticket`**: `shortId` (String, @unique, 8 chars) e `manualCode` (String, 8 chars). Gerados em `issueForReservation` com `crypto.randomInt` sobre alfabeto sem ambiguidade visual (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`, 32 chars). Entropia: 32^8 ≈ 2^40 por código.
- **`shortId` = lookup direto** (como `publicId` no QR). `@unique` garante 0-1 resultado. Colisão gera P2002 do Prisma → retry automático com novo código.
- **`manualCode` = verificação** (como `signature` no QR). Não unique — verificado via `timingSafeEqual` contra o ticket já localizado.
- **`ExactlyOneOf` em `src/common/validators/`** — movido de `src/reservations/dto/` para reuso entre `reservations` e `tickets`.
- **`ValidateTicketDto`**: `publicId` opcional, `signature` opcional, `manualEntryCode` opcional. `ExactlyOneOf(['signature', 'manualEntryCode'])` garante exatamente um método de prova.
- **`validate()` state machine em 4 estados** — reusada para ambos os caminhos. A única mudança: lookup por `publicId` (QR) vs `shortId` (manual), e verificação por HMAC (QR) vs `timingSafeEqual` de `manualCode` (manual).
- **Response enriquecido**: `VALID` devolve `holderName` + `ticketLabel`; `ALREADY_USED` devolve `holderName` + `usedAt`; `INVALID` minimal; `WRONG_EVENT` devolve `ticketEventName`.
- **Rate limiting**: `@nestjs/throttler` com 10 req/min por IP em `POST /tickets/validate`.
- **Filtro de data**: `GET /events?date=today` filtra eventos publicados do dia corrente. Reutilizável além do gate.
- **Shared types**: `ValidateTicketRequest` e `ValidateTicketResponse` em `packages/shared`. `PaymentApprovedResponse` ganha `shortId` e `manualCode`.

## Estrutura de arquivos — Criar

```
apps/backend/src/common/
├── validators/
│   └── exactly-one-of.validator.ts    # Movido de src/reservations/dto/

prisma/migrations/
└── XXXXXXXXXXXX_add-ticket-short-id-and-manual-code/
    └── migration.sql
```

## Estrutura de arquivos — Modificar

```
apps/backend/
├── prisma/schema.prisma               # + shortId, manualCode em Ticket
├── src/app.module.ts                  # + ThrottlerModule
├── src/common/validators/             # Novo diretório (movido de reservations/dto/)
├── src/events/
│   ├── dto/query-events.dto.ts        # + date?: string
│   └── events.service.ts              # Filtro de data em findAll
├── src/tickets/
│   ├── dto/validate-ticket.dto.ts     # + manualEntryCode, ExactlyOneOf, publicId opcional
│   ├── tickets.controller.ts          # + ThrottlerGuard em validate
│   ├── tickets.repository.ts          # + findByShortId
│   ├── tickets.service.ts             # generateCode, branch manual, response enriquecido
│   └── tickets.service.spec.ts        # Atualizar mocks e tests
└── src/reservations/dto/
    └── create-reservation.dto.ts      # Atualizar import do ExactlyOneOf

packages/shared/src/index.ts           # + ValidateTicketRequest, ValidateTicketResponse, shortId, manualCode
```

## Prisma Schema — `prisma/schema.prisma`

Adicionar ao model `Ticket`:

```prisma
model Ticket {
  id            String      @id @default(uuid())
  reservationId String      @unique
  reservation   Reservation @relation(fields: [reservationId], references: [id])

  userId String
  user   User   @relation(fields: [userId], references: [id])

  signature  String
  shortId    String @unique          // NOVO — lookup direto para entrada manual
  manualCode String                 // NOVO — verificação para entrada manual
  usedAt     DateTime?

  createdAt DateTime @default(now())

  @@map("tickets")
}
```

Migration: `npx prisma migrate dev --name add-ticket-short-id-and-manual-code`

## `ExactlyOneOf` — `src/common/validators/exactly-one-of.validator.ts`

Mover de `src/reservations/dto/exactly-one-of.validator.ts` para `src/common/validators/exactly-one-of.validator.ts`. Conteúdo idêntico:

```ts
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'exactlyOneOf', async: false })
export class ExactlyOneOfConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const fields = args.constraints[0] as string[];
    const obj = args.object as Record<string, unknown>;
    const count = fields.filter(
      (f) => obj[f] !== undefined && obj[f] !== null && obj[f] !== '',
    ).length;
    return count === 1;
  }

  defaultMessage(args: ValidationArguments): string {
    const fields = args.constraints[0] as string[];
    return `Forneça exatamente um de ${fields.join(', ')}`;
  }
}

export function ExactlyOneOf(
  fields: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'exactlyOneOf',
      target: object.constructor,
      propertyName,
      constraints: [fields],
      options: validationOptions,
      validator: ExactlyOneOfConstraint,
    });
  };
}
```

Atualizar import em `src/reservations/dto/create-reservation.dto.ts`:
```ts
import { ExactlyOneOf } from 'src/common/validators/exactly-one-of.validator';
```

## `ValidateTicketDto` — `src/tickets/dto/validate-ticket.dto.ts`

```ts
import { IsOptional, IsString } from 'class-validator';
import { ExactlyOneOf } from 'src/common/validators/exactly-one-of.validator';

export class ValidateTicketDto {
  @ExactlyOneOf(['signature', 'manualEntryCode'], {
    message: 'Forneça exatamente um de signature ou manualEntryCode',
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  manualEntryCode?: string;

  @IsOptional()
  @IsString()
  expectedEventId?: string;
}
```

## `TicketsRepository` — `src/tickets/tickets.repository.ts`

Adicionar método:

```ts
findByShortId(
  shortId: string,
  include?: TicketInclude,
): Promise<TicketModel | null> {
  return this.prisma.ticket.findUnique({ where: { shortId }, include });
}
```

## `TicketsService` — `src/tickets/tickets.service.ts`

### Constante e helper

```ts
const UNAMBIGUOUS_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

private generateCode(length: number): string {
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    chars.push(
      UNAMBIGUOUS_ALPHABET[crypto.randomInt(UNAMBIGUOUS_ALPHABET.length)],
    );
  }
  return chars.join('');
}

private safeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

### `issueForReservation` — gerar shortId e manualCode

```ts
async issueForReservation(reservationId: string) {
  // ... (find reservation, create ticket — existing logic)
  const shortId = this.generateCode(8);
  const manualCode = this.generateCode(8);

  const ticket = await this.ticketsRepository.create(
    {
      id,
      reservation: { connect: { id: reservation.id } },
      user: { connect: { id: reservation.userId } },
      signature,
      shortId,
      manualCode,
    },
    TICKET_INCLUDE,
  );
  return this.toResponse(ticket, { withQr: true });
}
```

### `validate` — branch manual + response enriquecido

```ts
type ValidateTicketResponse =
  | { status: 'VALID'; holderName: string; ticketLabel: string }
  | { status: 'ALREADY_USED'; holderName: string; usedAt: string }
  | { status: 'INVALID' }
  | { status: 'WRONG_EVENT'; ticketEventName: string };

async validate(dto: ValidateTicketDto): Promise<ValidateTicketResponse> {
  const VALIDATE_INCLUDE: TicketInclude = {
    reservation: { include: { event: true, seat: true, ticketType: true } },
    user: { select: { name: true, lastName: true } },
  };

  let ticket: TicketModel | null;

  if (dto.signature) {
    // QR scan path
    if (!dto.publicId) {
      throw new BadRequestException('publicId is required with signature');
    }
    ticket = await this.ticketsRepository.findByPublicId(
      dto.publicId,
      VALIDATE_INCLUDE,
    );
  } else {
    // Manual entry path
    const [shortId, manualCode] = dto.manualEntryCode!.split('-');
    if (!shortId || !manualCode) return { status: 'INVALID' };
    ticket = await this.ticketsRepository.findByShortId(shortId, VALIDATE_INCLUDE);
  }

  // 1. Not found → INVALID
  if (!ticket) return { status: 'INVALID' };

  const data = ticket as unknown as TicketData;
  const eventId = data.reservation.eventId;

  // 2. Wrong event → WRONG_EVENT
  if (dto.expectedEventId && dto.expectedEventId !== eventId) {
    return {
      status: 'WRONG_EVENT',
      ticketEventName: data.reservation.event.name,
    };
  }

  // 3. Proof of authenticity
  if (dto.signature) {
    const expected = this.signTicket(ticket.id, eventId);
    if (!this.safeEqualHex(expected, dto.signature)) {
      return { status: 'INVALID' };
    }
  } else {
    const [_, manualCode] = dto.manualEntryCode!.split('-');
    if (!this.safeEqualStr(data.manualCode, manualCode)) {
      return { status: 'INVALID' };
    }
  }

  // 4. Atomic single-winner use-marking
  const { count } = await this.ticketsRepository.markUsed(ticket.id);
  if (count === 0) {
    return {
      status: 'ALREADY_USED',
      holderName: `${data.user.name} ${data.user.lastName}`,
      usedAt: data.usedAt!.toISOString(),
    };
  }

  const holderName = `${data.user.name} ${data.user.lastName}`;
  const ticketLabel = data.reservation.seat
    ? `Fila ${data.reservation.seat.row}, Assento ${data.reservation.seat.number}`
    : data.reservation.ticketType?.name ?? 'Ingresso';

  return { status: 'VALID', holderName, ticketLabel };
}
```

### `toResponse` — adicionar shortId e manualCode

```ts
private toResponse(ticket: TicketModel, opts: { withQr: boolean }) {
  const base = this.toPublicResponse(ticket);
  return opts.withQr
    ? {
        ...base,
        signature: ticket.signature,
        qrContent: this.toQrContent(ticket.id, ticket.signature),
        shortId: ticket.shortId,
        manualCode: ticket.manualCode,
      }
    : base;
}
```

### `toPublicResponse` — NÃO incluir shortId nem manualCode

Nenhuma mudança no `toPublicResponse`. O `PublicTicketResponse` (shared type) é `Omit<PaymentApprovedResponse, 'signature' | 'qrContent' | 'shortId' | 'manualCode'>`.

## `TicketsController` — `src/tickets/tickets.controller.ts`

Adicionar throttler no validate:

```ts
import { UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@Post('validate')
@UseGuards(JwtGuard, RolesGuard, ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Roles(Role.GATE, Role.ADMIN)
validate(@Body() dto: ValidateTicketDto) {
  return this.ticketsService.validate(dto);
}
```

## `AppModule` — `src/app.module.ts`

Adicionar `ThrottlerModule`:

```ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    UsersModule,
    AuthModule,
    CatalogModule,
    EventsModule,
    ReservationsModule,
    PaymentsModule,
    TicketsModule,
  ],
})
export class AppModule {}
```

## `QueryEventsDto` — `src/events/dto/query-events.dto.ts`

Adicionar campo `date`:

```ts
@IsOptional()
@IsString()
date?: string;
```

## `EventsService` — `src/events/events.service.ts`

Em `findAll`, adicionar filtro de data:

```ts
async findAll(query: QueryEventsDto) {
  const page = query.page;
  const size = query.size;
  const skip = (page - 1) * size;

  let dateFilter = {};
  if (query.date) {
    const target = query.date === 'today' ? new Date() : new Date(query.date);
    const startOfDay = new Date(target);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);
    dateFilter = { date: { gte: startOfDay, lt: startOfNextDay } };
  }

  const where = {
    status: 'PUBLISHED' as const,
    ...(query.type && { type: TYPE_MAP[query.type] }),
    ...(query.query && {
      name: { contains: query.query, mode: 'insensitive' as const },
    }),
    ...dateFilter,
  };

  // ... rest unchanged
}
```

## Shared Types — `packages/shared/src/index.ts`

Adicionar:

```ts
export interface ValidateTicketRequest {
  publicId?: string;
  signature?: string;
  manualEntryCode?: string;
  expectedEventId?: string;
}

export type ValidateTicketResponse =
  | { status: 'VALID'; holderName: string; ticketLabel: string }
  | { status: 'ALREADY_USED'; holderName: string; usedAt: string }
  | { status: 'INVALID' }
  | { status: 'WRONG_EVENT'; ticketEventName: string };
```

Atualizar `PaymentApprovedResponse`:
```ts
export interface PaymentApprovedResponse {
  // ... campos existentes
  shortId: string;      // NOVO
  manualCode: string;   // NOVO
}
```

Atualizar `PublicTicketResponse`:
```ts
export type PublicTicketResponse = Omit<
  PaymentApprovedResponse,
  'signature' | 'qrContent' | 'shortId' | 'manualCode'
>;
```

## `tickets.service.spec.ts` — Atualizar

### Mock do ticket

Adicionar `shortId` e `manualCode` ao `buildTicket`:

```ts
const buildTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 't-1',
  reservationId: 'r-1',
  userId: 'user-1',
  signature: sign('t-1', 'evt-1'),
  shortId: 'AB3XK9DM',
  manualCode: '7Q2MZP1T',
  usedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  reservation: {
    eventId: 'evt-1',
    event: {
      id: 'evt-1',
      name: 'Show',
      date: new Date('2026-02-02T20:00:00.000Z'),
      location: 'Arena',
    },
    seat: null,
    ticketType: { id: 'tt-1', name: 'Pista' },
  },
  user: { name: 'Maria', lastName: 'Silva' },
  ...overrides,
});
```

### Tests de validate — atualizar expectativas

- VALID: `{ status: 'VALID', holderName: 'Maria Silva', ticketLabel: 'Pista' }`
- ALREADY_USED: `{ status: 'ALREADY_USED', holderName: 'Maria Silva', usedAt: '...' }`
- INVALID: `{ status: 'INVALID' }` (sem mudança)
- WRONG_EVENT: `{ status: 'WRONG_EVENT', ticketEventName: 'Show' }`

### Novos tests — manual entry path

```ts
it('returns VALID via manual entry (shortId + manualCode)', async () => {
  repo.findByShortId.mockResolvedValue(buildTicket());
  repo.markUsed.mockResolvedValue({ count: 1 });

  const result = await service.validate({
    manualEntryCode: 'AB3XK9DM-7Q2MZP1T',
    expectedEventId: 'evt-1',
  });

  expect(result).toEqual({
    status: 'VALID',
    holderName: 'Maria Silva',
    ticketLabel: 'Pista',
  });
  expect(repo.findByShortId).toHaveBeenCalledWith('AB3XK9DM', expect.anything());
  expect(repo.findByPublicId).not.toHaveBeenCalled();
});

it('returns INVALID via manual entry when manualCode mismatches', async () => {
  repo.findByShortId.mockResolvedValue(buildTicket());

  const result = await service.validate({
    manualEntryCode: 'AB3XK9DM-WRONGCODE',
    expectedEventId: 'evt-1',
  });

  expect(result).toEqual({ status: 'INVALID' });
});

it('returns INVALID via manual entry when format is wrong', async () => {
  const result = await service.validate({
    manualEntryCode: 'NODASH',
    expectedEventId: 'evt-1',
  });

  expect(result).toEqual({ status: 'INVALID' });
});
```

### Novo test — issueForReservation gera shortId e manualCode

```ts
it('generates shortId and manualCode of 8 unambiguous chars', async () => {
  repo.findReservationWithEvent.mockResolvedValue({
    id: 'r-1', eventId: 'evt-1', userId: 'user-1', status: 'CONFIRMED',
  });
  repo.create.mockImplementation((data) =>
    Promise.resolve(buildTicket({ id: data.id, shortId: data.shortId, manualCode: data.manualCode })),
  );

  const result = await service.issueForReservation('r-1');

  const [data] = repo.create.mock.calls[0];
  expect(data.shortId).toHaveLength(8);
  expect(data.manualCode).toHaveLength(8);
  expect(data.shortId).toMatch(/^[A-Z2-9]+$/);
  expect(data.manualCode).toMatch(/^[A-Z2-9]+$/);
  expect(result.shortId).toBe(data.shortId);
  expect(result.manualCode).toBe(data.manualCode);
});
```

## Dependências

```bash
# apps/backend
npm install @nestjs/throttler
```

## Arquivos a criar/modificar (consolidado)

### Criar
- `src/common/validators/exactly-one-of.validator.ts`
- `prisma/migrations/...add-ticket-short-id-and-manual-code/`

### Modificar
- `prisma/schema.prisma` (+ shortId, manualCode)
- `src/app.module.ts` (+ ThrottlerModule)
- `src/tickets/dto/validate-ticket.dto.ts` (manualEntryCode, publicId opcional, ExactlyOneOf)
- `src/tickets/tickets.controller.ts` (ThrottlerGuard em validate)
- `src/tickets/tickets.repository.ts` (+ findByShortId)
- `src/tickets/tickets.service.ts` (generateCode, branch manual, response enriquecido, toResponse)
- `src/tickets/tickets.service.spec.ts` (atualizar mocks + novos tests)
- `src/events/dto/query-events.dto.ts` (+ date)
- `src/events/events.service.ts` (filtro de data)
- `packages/shared/src/index.ts` (+ types, + shortId/manualCode em PaymentApprovedResponse, atualizar PublicTicketResponse)
- `src/reservations/dto/create-reservation.dto.ts` (atualizar import)

## Verificação (em `apps/backend`)

1. `npx prisma generate`
2. `npx prisma migrate dev --name add-ticket-short-id-and-manual-code`
3. `npm run lint`
4. `npm test`
5. `npm run build`

### Teste manual
- Criar evento + reservation + ticket via fluxo existente → ticket deve ter `shortId` e `manualCode` preenchidos.
- `GET /tickets/mine` → resposta inclui `shortId` e `manualCode`.
- `GET /tickets/:publicId` (público) → resposta NÃO inclui `shortId` nem `manualCode`.
- `POST /tickets/validate` com `{ publicId, signature, expectedEventId }` → VALID (fluxo QR existente).
- `POST /tickets/validate` com `{ manualEntryCode: 'AB3XK9DM-7Q2MZP1T', expectedEventId }` → VALID (novo fluxo).
- `POST /tickets/validate` com `{ manualEntryCode: 'AB3XK9DM-WRONG', expectedEventId }` → INVALID.
- `POST /tickets/validate` 11x rapidamente → 429 (throttler).
- `GET /events?date=today` → retorna apenas eventos publicados do dia corrente.

## Próxima fase
- Integração com a UI do gate (`gate-visual-plan.md`): consumir os tipos e endpoints definidos aqui.
