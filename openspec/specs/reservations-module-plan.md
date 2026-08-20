# Plano: Módulo Reservations (Backend)

## Decisões

- **DTO com validator customizado de classe** (`registerDecorator` + `@ValidatorConstraint`), **não** `@ValidateIf`. XOR ("exatamente um de `seatId`/`ticketTypeId`") é restrição **entre campos**, não de formato. `@ValidateIf` só **pula** validadores de um campo baseado no estado do objeto: consegue rejeitar "nenhum preenchido" (tornando cada campo `@IsNotEmpty` quando o outro está ausente), mas é **incapaz de rejeitar "ambos preenchidos"** — quando os dois estão presentes nenhum `@ValidateIf` dispara. Validator customizado gera uma única mensagem clara no nível da classe. Primeiro validator custom do projeto (DTOs atuais usam só built-ins), justificado porque built-ins não expressam XOR; a alternativa (validar no service, como `events.service.ts` faz para "MOVIE precisa de seats") contraria o requisito de rejeitar no DTO via class-validator.
- **`findSeat`/`findTicketType` são preconditions (validação de entrada), NÃO guard de concorrência.** O guard de concorrência do path (a) é **exclusivamente** o `@unique` em `Reservation.seatId` → erro `P2002` → `409`. O guard do path (b) é **exclusivamente** o `availableCount >= 1` atômico no `updateMany` dentro da `$transaction`. Existe janela TOCTOU entre a leitura prévia e a escrita, e ela é inofensiva porque o guard real a cobre. Comentário no código deve deixar essa separação explícita (precondition vs. sole concurrency guard), sem dar a entender que a leitura prévia "protege" a corrida.
- **404 vs 409 distintos nos dois paths.** `findSeat`/`findTicketType` retornam `null` → `404 NotFoundException` ("Assento/TicketType não encontrado"); `eventId` divergente → `400 BadRequestException`. O `409 ConflictException` só dispara no caso **genuíno** de conflito/esgotamento, nunca para "id inexistente" colapsado em `count === 0`.
- **`Seat.status` NÃO é consultado nem escrito neste fluxo** (limitação conhecida e documentada). A fonte única de verdade para reserva é `Reservation.seatId @unique`. `SeatStatus` (`AVAILABLE`/`RESERVED`/`SOLD`) existe no schema mas não é mantido sincronizado — permanece `AVAILABLE` mesmo depois de reservado. **Exceção explícita** à convenção "sem comentários": um comentário próximo ao método do assento documenta essa limitação. Não popular `Seat.status` "pra não deixar vazio" (estado sincronizado às vezes é pior que nunca sincronizado). Em particular, **omitir** o check `seat.status === 'AVAILABLE'` na precondition: sob a limitação ele é sempre-verdadeiro = código morto que implica falsamente que o campo é mantido.
- **`include?: ReservationInclude` cortado dos métodos de repository.** A resposta do `POST /reservations` só precisa de campos escalares da própria `Reservation` (`id`, `status`, `eventId`, `seatId`/`ticketTypeId`, `createdAt`) — nenhum consumidor real de relations hoje. Manter `include?` seria antecipação especulativa, o mesmo anti-pattern do `Seat.status` "pra não deixar vazio". Em `events` o `include` tem consumidor imediato (`toEventDetailResponse` lê `event.seats`/`event.ticketTypes`); em reservations não há. Repository devolve `ReservationModel` puro. Se um dia a resposta precisar de relations, adiciona-se `include` com consumidor real naquele momento.
- **`userId` do JWT, nunca do corpo.** Controller extrai `req.user.userId` (do `JwtGuard`) e passa ao service.
- **Roles:** `POST /reservations` exige JWT + `RolesGuard` + `@Roles(Role.CLIENT)` (apenas compradores).
- **Status inicial da Reservation:** `PENDING` (default do schema), não enviado no body.

## Endpoint

| Método | Rota | Auth | Retorna |
|--------|------|------|---------|
| `POST` | `/reservations` | JWT + `RolesGuard` + `@Roles(Role.CLIENT)` | `ReservationResponse` |

## DTO — `CreateReservationDto` (`src/reservations/dto/create-reservation.dto.ts`)

```ts
@ExactlyOneOf(['seatId', 'ticketTypeId'], {
  message: 'Forneça exatamente um de seatId ou ticketTypeId',
})
export class CreateReservationDto {
  // ^ decorator de mutex anexado a eventId (sempre presente => sempre roda;
  //   evita a ambiguidade de "pular-on-undefined" em campos opcionais)
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsOptional()
  @IsString()
  seatId?: string;

  @IsOptional()
  @IsString()
  ticketTypeId?: string;
}
```

Campos seguem convenção de `create-event.dto.ts` (`@IsString`/`@IsNotEmpty`, nunca `@IsUUID` mesmo ids sendo UUIDs).

## Validator customizado — `exactly-one-of.validator.ts` (`src/reservations/dto/`)

```ts
@ValidatorConstraint({ name: 'exactlyOneOf', async: false })
export class ExactlyOneOfConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const fields = args.constraints[0] as string[];
    const obj = args.object as Record<string, unknown>;
    const count = fields.filter((f) => obj[f] != null && obj[f] !== '').length;
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
  return function (object: Record<string, unknown>, propertyName: string) {
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

Lê `args.object` (objeto inteiro), conta quantos dos campos em `args.constraints[0]` estão não-nulos, retorna `count === 1`. Anexado a `eventId` (sempre definido) para garantir execução independente de `seatId`/`ticketTypeId` estarem ausentes.

## Estrutura de arquivos

```
apps/backend/src/reservations/
├── reservations.module.ts
├── reservations.controller.ts
├── reservations.service.ts
├── reservations.repository.ts
├── reservations.repository.spec.ts        (opcional)
└── dto/
    ├── create-reservation.dto.ts
    ├── exactly-one-of.validator.ts
    └── create-reservation.dto.spec.ts
```

## Repository (`ReservationsRepository`) — assinaturas finais

Thin wrapper sobre `PrismaService` (igual `EventsRepository`/`UsersRepository`). Tipos via `import type { ... } from '../generated/prisma/models'`.

```ts
findSeat(id: string): Promise<SeatModel | null>
// precondition (path a): existe? pertence ao eventId?

findTicketType(id: string): Promise<TicketTypeModel | null>
// precondition (path b): existe? pertence ao eventId?

create(data: ReservationCreateInput): Promise<ReservationModel>
// path a: raw create; Reservation.seatId @unique => Prisma P2002 vira 409 no service

createTicketTypeReservation(params: {
  eventId: string;
  userId: string;
  ticketTypeId: string;
}): Promise<ReservationModel | null>
// path b: $transaction com decremento atômico; null = esgotado (genuíno, pós-precondition)
```

### Path (b) — lógica do `$transaction` no repository

```ts
return this.prisma.$transaction(async (tx) => {
  const { count } = await tx.ticketType.updateMany({
    where: { id: params.ticketTypeId, availableCount: { gte: 1 } },
    data: { availableCount: { decrement: 1 } },
  });
  if (count === 0) return null; // segundo concorrente: WHERE falha pós-commit do primeiro
  return tx.reservation.create({
    data: { ...params, status: 'PENDING' },
  });
});
```

Postgres bloqueia a linha no `UPDATE`; o segundo tx bloqueia e, ao reavaliar `WHERE availableCount >= 1` (agora `0`) → `0` linhas → `null` → `409`. O `updateMany` com `availableCount >= 1` é o guard atômico; o `result.count` diz se a linha foi decrementada.

## Service (`ReservationsService`) — separação de camada

```ts
async create(dto: CreateReservationDto, userId: string) {
  if (dto.seatId) return this.createSeatReservation(dto.eventId, userId, dto.seatId);
  return this.createTicketTypeReservation(dto.eventId, userId, dto.ticketTypeId!);
  // ^ DTO + validator garantem presença de ticketTypeId aqui
}
```

### Path (a) — assento nomeado

```ts
private async createSeatReservation(eventId, userId, seatId) {
  // precondition: validação de entrada (existe? pertence ao evento?)
  // NÃO é guard de concorrência — o guard é o Reservation.seatId @unique (P2002 abaixo).
  const seat = await this.reservationsRepository.findSeat(seatId);
  if (!seat) throw new NotFoundException(`Assento ${seatId} não encontrado`);
  if (seat.eventId !== eventId)
    throw new BadRequestException('Assento não pertence a este evento');
  // Seat.status intencionalmente NÃO consultado/escrito: fonte única = Reservation.seatId @unique.
  // SeatStatus existe no schema mas não é mantido sincronizado (limitação conhecida).
  try {
    const reservation = await this.reservationsRepository.create({
      eventId, userId, seatId, status: 'PENDING',
    });
    return this.toResponse(reservation);
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002')
      throw new ConflictException('Esse assento acabou de ser reservado por outra pessoa');
    throw e;
  }
}
```

### Path (b) — pista/setor

```ts
private async createTicketTypeReservation(eventId, userId, ticketTypeId) {
  // precondition: validação de entrada (existe? pertence ao evento?)
  // NÃO é guard de concorrência — o guard é o availableCount >= 1 atômico no $transaction.
  const ticketType = await this.reservationsRepository.findTicketType(ticketTypeId);
  if (!ticketType) throw new NotFoundException(`Setor ${ticketTypeId} não encontrado`);
  if (ticketType.eventId !== eventId)
    throw new BadRequestException('Setor não pertence a este evento');

  const reservation = await this.reservationsRepository.createTicketTypeReservation({
    eventId, userId, ticketTypeId,
  });
  if (!reservation)
    throw new ConflictException('Ingressos esgotados para este setor');
  return this.toResponse(reservation);
}
```

### Response mapper

```ts
private toResponse(reservation: ReservationModel) {
  return {
    id: reservation.id,
    eventId: reservation.eventId,
    userId: reservation.userId,
    seatId: reservation.seatId,
    ticketTypeId: reservation.ticketTypeId,
    status: reservation.status,
    createdAt: reservation.createdAt.toISOString(),
  };
}
```

## Controller (`ReservationsController`)

```ts
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CLIENT)
  create(
    @Body() dto: CreateReservationDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.reservationsService.create(dto, req.user.userId);
  }
}
```

## Module wiring

```ts
@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsRepository, PrismaService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
```

## Arquivos a modificar

1. `apps/backend/src/app.module.ts` — importar `ReservationsModule` no array `imports` (ao lado de `EventsModule`)

## Detalhe a confirmar na implementação

- Import de `PrismaClientKnownRequestError` no service: em Prisma 7 com o generator `prisma-client`, costuma vir de `../generated/prisma/client` (mesmo path que `prisma.service.ts` usa para `PrismaClient`), mas o cliente gerado está gitignored — confirmar após `npx prisma generate`.

## Testes — regra de mutex (`create-reservation.dto.spec.ts`)

Unit tests com `plainToInstance` + `validate` do class-validator. Apenas a regra de mutex (restante da suite fora do escaco):

```ts
async function getErrors(payload: Partial<CreateReservationDto>) {
  const dto = plainToInstance(CreateReservationDto, payload);
  const errors = await validate(dto);
  return errors.flatMap((e) =>
    e.constraints ? Object.values(e.constraints) : [],
  );
}

describe('CreateReservationDto mutex rule', () => {
  it('rejects when both seatId and ticketTypeId are provided', async () => {
    const errors = await getErrors({
      eventId: 'evt-1', seatId: 'seat-1', ticketTypeId: 'tt-1',
    });
    expect(errors.some((m) => /exatamente um/i.test(m))).toBe(true);
  });

  it('rejects when neither seatId nor ticketTypeId is provided', async () => {
    const errors = await getErrors({ eventId: 'evt-1' });
    expect(errors.some((m) => /exatamente um/i.test(m))).toBe(true);
  });

  it('accepts when exactly one of seatId|ticketTypeId is provided', async () => {
    const seatOnly = await getErrors({ eventId: 'evt-1', seatId: 'seat-1' });
    const ticketOnly = await getErrors({ eventId: 'evt-1', ticketTypeId: 'tt-1' });
    expect(seatOnly.some((m) => /exatamente um/i.test(m))).toBe(false);
    expect(ticketOnly.some((m) => /exatamente um/i.test(m))).toBe(false);
  });
});
```

## Teste manual de concorrência (abordagem, sem código de teste)

### Cenário seat (path a — P2002)

- Seed: um `Event` + 1 `Seat` (status `AVAILABLE`), sem reservation.
- Disparar 2 `POST /reservations` **simultâneas** com o mesmo `seatId` (usuários/cookies distintos).
- Esperado: exatamente uma `201` e uma `409` com a mensagem de assento reservado.
- Verificar: `SELECT count(*) FROM reservations WHERE "seatId" = ?` = 1.

### Cenário ticketType (path b — decremento atômico)

- Seed: um `Event` + 1 `TicketType` com `availableCount = 1`.
- Disparar 2 (ou 10) requests simultâneas pro mesmo `ticketTypeId`.
- Esperado: exatamente 1 sucesso, o resto `409` "esgotado".
- Verificar: `availableCount` final = 0 e exatamente 1 reservation.

### Ferramentas/atalhos para simultaneidade real

- Node script com `Promise.all([fetch, fetch])` — simples, mas mesmo event loop pode serializar; usar 2 tokens/cookies distintos e confiar no bloqueio de linha do Postgres.
- `ab -c 2 -n 2 -H "Cookie: ..." http://localhost:3000/api/reservations` ou `hey`/`k6` (concorrência real entre sockets).
- `xargs -P 2` com dois `curl` em background e `wait`.
- Conferir estado do DB antes/depois com `SELECT` diretas no container Postgres (porta 15432).
- Stress do oversell: com `availableCount = 1`, disparar 10 concorrentes; esperar 1 sucesso, 9 conflitos, `availableCount` final = 0, exatamente 1 reservation.

## Convenções

- Imports cross-module: `src/prisma.service`, `src/common/roles.decorator`, `src/common/roles.guard`, `src/auth/guards/jwt.guard`, `src/auth/auth.types`
- Imports dentro do módulo: relativos `./`, `../`
- `import type` para tipos-only (gerados de `../generated/prisma/models`)
- Enums de `src/generated/prisma/enums`
- Sem comentários no código, **exceto** o documentando a limitação de `Seat.status` no path do assento (exceção explícita deste plano)

## Verificação (em `apps/backend`)

1. `npx prisma generate` → 2. `npm run lint` → 3. `npm test` (roda o `create-reservation.dto.spec.ts` novo) → 4. `npm run build`
