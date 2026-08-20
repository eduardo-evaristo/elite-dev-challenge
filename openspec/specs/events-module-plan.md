# Plano: Módulo Events (Backend)

## Decisões

- **Tipos em `packages/shared`**: enums em MAIÚSCULO (`'MOVIE'|'SHOW'`, `'DRAFT'|'PUBLISHED'|'CANCELLED'`, `'AVAILABLE'|'RESERVED'|'SOLD'`) — espelham Prisma, sem mapeamento na resposta
- **URL/body params**: minúsculo (`type=movie|show`, `status=draft|published|cancelled`) — DTOs validam minúsculo, service mapeia → MAIÚSCULO para Prisma
- **`externalSource`**: já existe como `'TMDB'|'TICKETMASTER'` em shared, mantém maiúsculo (não é param de URL)
- **GET endpoints**: públicos (sem JWT), filtram `status=PUBLISHED`
- **POST/PATCH/DELETE**: JWT + `ORGANIZER`/`ADMIN`; organizer só edita/deleta próprios (`organizerId === userId`)
- **DELETE**: soft delete → `status=CANCELLED`
- **PATCH**: apenas campos escalares (`name`, `date`, `location`, `status`)
- **Validação de negócio**: MOVIE → obrigatório `seats`; SHOW → `seats` OU `ticketTypes` (mín. 1)

## Endpoints

| Método | Rota | Auth | Retorna |
|--------|------|------|---------|
| `GET` | `/events` | público | `PaginatedEventResult` |
| `GET` | `/events/:id` | público | `EventDetailResponse` |
| `POST` | `/events` | JWT + ORGANIZER/ADMIN | `EventDetailResponse` |
| `PATCH` | `/events/:id` | JWT + ORGANIZER/ADMIN + ownership | `EventItem` |
| `DELETE` | `/events/:id` | JWT + ORGANIZER/ADMIN + ownership | `{ id, status }` |

## Tipos em `packages/shared/src/index.ts` (adicionar)

```ts
export type EventType = 'MOVIE' | 'SHOW';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';

export interface SeatRequest { row: string; number: number; }
export interface TicketTypeRequest { name: string; price: number; capacity: number; }
export interface CreateEventRequest {
  name: string; date: string; location: string;
  type: EventType; externalId: string; externalSource: ExternalSource;
  seats?: SeatRequest[]; ticketTypes?: TicketTypeRequest[];
}
export interface UpdateEventRequest {
  name?: string; date?: string; location?: string; status?: EventStatus;
}
export interface QueryEventsParams { page?: number; size?: number; query?: string; type?: EventType; }

export interface SeatResponse { id: string; row: string; number: number; status: SeatStatus; }
export interface TicketTypeResponse { id: string; name: string; price: number; capacity: number; availableCount: number; }
export interface EventItem {
  id: string; name: string; date: string; location: string;
  type: EventType; status: EventStatus;
  externalId: string; externalSource: ExternalSource;
  organizerId: string; createdAt: string; updatedAt: string;
}
export interface EventDetailResponse extends EventItem {
  seats: SeatResponse[]; ticketTypes: TicketTypeResponse[];
}
export interface PaginatedEventResult {
  items: EventItem[]; page: number; totalPages: number; totalResults: number;
}
```

## Mapeamento lowercase → Prisma (no service, apenas entrada)

```ts
const TYPE_MAP: Record<string, EventType> = { movie: 'MOVIE', show: 'SHOW' };
const STATUS_MAP: Record<string, EventStatus> = { draft: 'DRAFT', published: 'PUBLISHED', cancelled: 'CANCELLED' };
// Decimal price -> Number(prismaDecimal) na resposta
// Date -> ISO string já feito pelo JSON serializer do NestJS
```

## Estrutura de arquivos

```
apps/backend/src/events/
├── events.module.ts
├── events.controller.ts
├── events.service.ts
├── events.repository.ts
├── events.repository.spec.ts
└── dto/
    ├── create-event.dto.ts
    ├── update-event.dto.ts
    └── query-events.dto.ts
```

## Detalhe por endpoint

### `GET /events` (sem guard)

- DTO (`QueryEventsDto`): `page` (`@Type(Number)`, `@IsInt`, `@Min(1)`, default 1), `size` (`@Type(Number)`, `@IsInt`, `@Min(1)`, `@Max(50)`, default 20), `query` (`@IsOptional`, `@IsString`), `type` (`@IsOptional`, `@IsIn(['movie','show'])`)
- Service: `where = { status: 'PUBLISHED', ...(type && { type: TYPE_MAP[type] }), ...(query && { name: { contains: query, mode: 'insensitive' } }) }`, `skip=(page-1)*size`, `take=size`, `Promise.all([findMany, count])`, `totalPages=ceil(total/size)`
- Retorna `PaginatedEventResult` (escalares apenas, sem relações)

### `GET /events/:id` (sem guard)

- Service: `findUnique({ where: { id }, include: { seats, ticketTypes } })` → se null ou `status !== 'PUBLISHED'` → `NotFoundException`
- Mapeia `price` Decimal → number → `EventDetailResponse`

### `POST /events` (JWT + ORGANIZER/ADMIN)

- DTO (`CreateEventDto`): `name`, `date` (`@IsDateString`), `location`, `type` (`@IsIn(['movie','show'])`), `externalId`, `externalSource` (`@IsIn(['TMDB','TICKETMASTER'])`), `seats?` (`@ValidateNested({each:true})` + `@Type(()=>SeatDto)`), `ticketTypes?` (`@ValidateNested({each:true})` + `@Type(()=>TicketTypeDto)`)
- `SeatDto`: `row` (`@IsString`), `number` (`@IsInt`, `@Min(1)`)
- `TicketTypeDto`: `name` (`@IsString`), `price` (`@IsNumber`, `@Min(0)`), `capacity` (`@IsInt`, `@Min(1)`)
- Service valida: MOVIE sem seats → `BadRequest`; SHOW sem seats nem ticketTypes → `BadRequest`
- `organizerId` do JWT; status `PUBLISHED`; `availableCount = capacity`; `event.create` com nested creates + `include`
- Retorna `EventDetailResponse`

### `PATCH /events/:id` (JWT + ORGANIZER/ADMIN + ownership)

- DTO (`UpdateEventDto`): `name?`, `date?` (`@IsDateString`), `location?`, `status?` (`@IsIn(['draft','published','cancelled'])`) — todos `@IsOptional`
- Service: busca por id → 404; ORGANIZER e `organizerId !== userId` → `ForbiddenException`; update com `STATUS_MAP[status]`
- Retorna `EventItem`

### `DELETE /events/:id` (JWT + ORGANIZER/ADMIN + ownership)

- Mesma checagem de ownership; `update({ where: { id }, data: { status: 'CANCELLED' } })`
- Retorna `{ id, status: 'CANCELLED' }`

## Repository (`EventsRepository`)

Thin wrapper sobre `PrismaService` (igual `UsersRepository`): `create`, `findById`, `findMany({ where, skip, take, include? })`, `count({ where })`, `update`. Tipos via `../generated/prisma/models`.

## Module wiring

```ts
@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsRepository, PrismaService],
  exports: [EventsService],
})
```

## Arquivos a modificar

1. `apps/backend/src/app.module.ts` — importar `EventsModule`
2. `packages/shared/src/index.ts` — adicionar tipos acima

## Testes (`events.repository.spec.ts`)

Unit tests com Prisma mockado, seguindo `users.repository.spec.ts`: mock de `prisma.event.{create,findUnique,findMany,count,update}`, cobrindo create com nested seats/ticketTypes, paginação (skip/take), e soft delete.

## Convenções

- Imports cross-module: `src/prisma.service`, `src/common/roles.decorator`, `src/auth/guards/jwt.guard`, `src/auth/auth.types`
- Imports dentro do módulo: relativos `./`, `../`
- `import type` para tipos-only
- Enums de `src/generated/prisma/enums`
- Sem comentários no código
- Preferir `MappedTypes` do NestJS (`PartialType`, `PickType`, `OmitType`, `IntersectionType`) em DTOs quando houver sobreposição com outros DTOs

## Verificação (em `apps/backend`)

1. `npx prisma generate` → 2. `npm run lint` → 3. `npm test` → 4. `npm run build`
