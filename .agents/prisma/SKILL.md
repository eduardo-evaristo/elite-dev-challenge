# Prisma ORM Skill

## Visao Geral

Prisma 7 com driver adapter (`@prisma/adapter-pg`), PostgreSQL 16, esquema em `apps/backend/prisma/schema.prisma`.

## Convenções do Projeto

### Configuracao

- **Schema:** `apps/backend/prisma/schema.prisma`
- **Config:** `apps/backend/prisma.config.ts` (carrega dotenv, le DATABASE_URL)
- **Generated client:** `apps/backend/src/generated/prisma/` (gitignored, CJS)
- **PrismaService:** `apps/backend/src/prisma.service.ts` (usa driver adapter PG)

### Schema Design

**Gerador:**
```prisma
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  moduleFormat    = "cjs"
}
```

**Datasource:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Enums

Definidos no esquema e usados tanto no backend quanto compartilhados via `@elite-dev/shared`:

```prisma
enum Role { CLIENT ORGANIZER GATE ADMIN }
enum EventType { SHOW MOVIE }
enum EventStatus { DRAFT PUBLISHED CANCELLED }
enum SeatStatus { AVAILABLE RESERVED SOLD }
enum ReservationStatus { PENDING CONFIRMED CANCELLED }
enum PaymentStatus { APPROVED DECLINED }
```

### Modelos Principais

**User:** usuarios com role e relacoes para eventos, reservas, tickets
**Event:** eventos com denormalizacao de campos do catalogo externo
**TicketType:** setores/categorias de ingresso (para eventos standing)
**Seat:** assentos nomeados (para eventos com cadeiras)
**Reservation:** reservas (PENDING -> CONFIRMED via pagamento)
**Ticket:** ingressos emitidos com assinatura HMAC e codigo manual

### Relacoes Importantes

```prisma
model Seat {
  eventId  String
  row      String
  number   Int
  status   SeatStatus @default(AVAILABLE)
  reservation Reservation?  // 1:1 via unique constraint

  @@unique([eventId, row, number])
}

model Reservation {
  seatId       String?   @unique  // 1:1 com Seat
  ticketTypeId String?            // N:1 com TicketType
  // XOR: exatamente um de seatId ou ticketTypeId deve ser preenchido
}

model Ticket {
  reservationId String @unique  // 1:1 com Reservation
  signature     String          // HMAC-SHA256
  shortId       String @unique  // 8 chars, sem ambiguidade
  manualCode    String          // 8 chars
}
```

### Transacoes

Use `$transaction` para operacoes atomicas:

```typescript
// Reserva de assento
await this.prisma.$transaction(async (tx) => {
  const reservation = await tx.reservation.create({
    data: { eventId, userId, seatId, status: 'PENDING' }
  });
  await tx.seat.update({
    where: { id: seatId },
    data: { status: 'RESERVED' }
  });
  return reservation;
});
```

### Operacoes Atomicas

**Decremento de capacidade (setores):**
```typescript
const result = await tx.ticketType.updateMany({
  where: { id: ticketTypeId, availableCount: { gte: 1 } },
  data: { availableCount: { decrement: 1 } },
});
if (result.count === 0) return null; // Sold out
```

**Single-winner (validacao de ingresso):**
```typescript
const result = await tx.ticket.updateMany({
  where: { id: ticketId, usedAt: null },
  data: { usedAt: new Date() },
});
return result.count === 1; // true = sucesso, false = ja usado
```

### Tratamento de Erros

- **P2002** (unique constraint): `ConflictException` para assentos ja reservados
- **P2025** (record not found): `NotFoundException`

### Migrações

```bash
cd apps/backend
npx prisma migrate dev     # Cria migração (dev)
npx prisma migrate deploy  # Aplica migrações (prod)
npx prisma generate        # Regenera cliente (sempre apos mudar schema)
npx prisma studio          # Interface visual
```

### Importacao do Cliente Gerado

```typescript
import { PrismaClient, Role, EventType } from '../generated/prisma';
// ou
import { PrismaClient } from '../generated/prisma/client';
```

## Cuidados

1. **Nao commitar o gerado:** `src/generated/` esta no `.gitignore`
2. **Sempre rodar `prisma generate`** antes de compilar ou rodar o backend
3. **O `prisma.config.ts` e necessario** para o Prisma 7 (carrega dotenv)
4. **Driver adapter PG:** o PrismaService usa `@prisma/adapter-pg`, nao o pool de conexao padrao

## Arquivos de Referencia

- Schema: `apps/backend/prisma/schema.prisma`
- Config: `apps/backend/prisma.config.ts`
- PrismaService: `apps/backend/src/prisma.service.ts`
- Repositories: `apps/backend/src/*/modulo.repository.ts`
