# Arquitetura e Padroes do Projeto

## Visao Geral

Monorepo com npm workspaces, backend NestJS, frontend React, package compartilhado de tipos.

## Monorepo

```
├── apps/
│   ├── backend/        # NestJS 11 + Prisma 7
│   └── frontend/       # React 19 + Vite 8
├── packages/
│   └── shared/         # @elite-dev/shared (tipos TypeScript raw, sem build)
├── openspec/           # Specs e changes (OpenSpec)
├── docker-compose.yml  # Stack completa (postgres + backend + frontend)
└── docker-compose.dev.yml  # So PostgreSQL
```

### Convencoes de Import

**Backend (absoluto via tsconfig baseUrl):**
```typescript
import { PrismaService } from 'src/prisma.service';
import { RolesGuard } from 'src/common/roles.guard';
```

**Frontend (alias @/ -> ./src/):**
```typescript
import { httpClient } from '@/lib/http-client';
import { useGetMe } from '@/features/auth/hooks/use-get-me';
```

**Shared types:**
```typescript
import { EventDetailResponse, CatalogItem } from '@elite-dev/shared';
```

## Padroes de Arquitetura

### Repository Pattern

Cada modulo de dominio tem um Repository que encapsula Prisma:

```
modulo/
  modulo.repository.ts  # Operaçoes Prisma
  modulo.service.ts     # Logica de negocio (chama repository)
  modulo.controller.ts  # Endpoints HTTP (chama service)
```

**Beneficio:** separacao de responsabilidades, facilita testes (mock do repository), centraliza queries complexas.

### Strategy Pattern

Para abstrair provedores intercambiaveis:

**Pagamento:**
- Interface `PaymentProvider` com metodo `charge()`
- `SimulatedPaymentProvider` (atual) - logica simples par/impar
- Extensivel para Asaas, Stripe, etc.
- Selecao via `PAYMENT_PROVIDER` env var + factory provider

**Catalogo:**
- Interface `CatalogProvider` com `findAll()` e `findOne()`
- `TmdbProvider` (filmes) e `TicketmasterProvider` (shows)
- `CatalogService` roteia por tipo (`movie` -> TMDB, `show` -> Ticketmaster)

### RBAC (Role-Based Access Control)

```
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@Post()
createEvent() { ... }
```

- `@Roles()` - decorator que seta metadata via `SetMetadata`
- `RolesGuard` - le metadata via `Reflector`, compara com `req.user.role`
- Sempre usar junto: `@UseGuards(JwtGuard, RolesGuard)` + `@Roles(...)`

### Concurrency Guards

**Problema:** dois usuarios tentam reservar o mesmo assento simultaneamente.

**Solucao 1 - Assentos:**
- Constraint de unicidade no banco: `@@unique([eventId, row, number])` no Seat
- Prisma P2002 (unique violation) -> `ConflictException("Esse assento acabou de ser reservado por outra pessoa")`

**Solucao 2 - Setores (TicketType):**
```sql
UPDATE ticket_types
SET available_count = available_count - 1
WHERE id = ? AND available_count >= 1
```
Atomico: retorna 0 linhas afetadas se sold out. Feito em `$transaction`.

**Solucao 3 - Validacao de ingresso (Gate):**
```sql
UPDATE tickets SET used_at = NOW()
WHERE id = ? AND used_at IS NULL
```
Single-winner: primeira requisicao retorna 1 (sucesso), subsequentes retornam 0 (ja usado).

### API Layer Pattern (Frontend)

Cada feature segue o padrao:

```
features/feature/
  api.ts       # Funcoes HTTP puras
  queries.ts   # QueryOptions (chave de cache + queryFn)
  hooks/       # Hooks React (useQuery/useMutation)
```

**Fluxo:** componente -> hook -> queryOption -> api.ts -> httpClient -> backend

### Design System Custom

- Tokens extraidos de arquivo `.pen` via Pencil MCP
- Mapeados para variaveis CSS em `:root`
- Registrados no Tailwind CSS 4 via `@theme inline`
- shadcn/ui consome via CSS vars (`--primary`, `--background`, etc.)

### Spec-Driven Development (OpenSpec)

1. **Proposal:** por que mudar, o que muda, impacto
2. **Design:** contexto, decisoes, riscos, trade-offs
3. **Tasks:** checklist de implementacao
4. **Specs:** requisitos em formato BDD (WHEN/THEN)
5. **Implementacao:** codigo basado nas tasks
6. **Archive:** change e arquivado apos conclusao

## Referencia

- AGENTS.md (raiz) - guia completo do repositorio
- PRD.md (raiz) - requisitos do produto
- openspec/ - specs e changes
- specs/ - planos detalhados por feature
