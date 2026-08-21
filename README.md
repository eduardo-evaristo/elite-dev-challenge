# Guichê — Plataforma de Eventos e Ingressos

Uma plataforma completa para organizadores publicarem eventos (filmes e shows) e clientes comprarem ingressos, com validação na entrada via QR code.

**App hospedado na Vercel:** https://elite-dev-challenge-frontend.vercel.app

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | NestJS 11, Prisma 7, PostgreSQL 16 |
| Frontend | React 19, Vite 8, TanStack Router + Query, Tailwind CSS 4, shadcn/ui |
| Design | Pencil (design tool) + Pencil MCP (extração de tokens via AI) |
| Metodologia | OpenSpec (Spec-Driven Development) |
| Deploy | Vercel (frontend), Docker Compose (stack completa) |

---

## Rodar com Docker Compose (Stack Completa)

Sub backend + frontend + PostgreSQL em containers:

```bash
# Na raiz do projeto
docker compose up --build
```

- Frontend: http://localhost
- Backend: http://localhost:3000
- PostgreSQL: localhost:15432

> **Obs:** As variáveis de ambiente do backend estão hardcoded no `docker-compose.yml`. Para APIs externas (TMDB, Ticketmaster), edite o compose ou crie um `.env` na raiz.

---

## Rodar em Modo Desenvolvimento

### 1. Subir apenas o PostgreSQL

```bash
# Na raiz do projeto
npm run db:up
```

Isso inicia o PostgreSQL na porta 15432 via `docker-compose.dev.yml`.

### 2. Instalar dependências

```bash
# Na raiz do projeto (npm workspaces)
npm install
```

### 3. Configurar variáveis de ambiente

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edite o .env com suas chaves (TMDB_ACCESS_TOKEN, TICKETMASTER_API_KEY, etc.)

# Frontend (já vem com .env.development commitado, opcional criar .env.example)
cp apps/frontend/.env.example apps/frontend/.env
```

### 4. Gerar o cliente Prisma e rodar migrações

```bash
cd apps/backend
npx prisma generate
npx prisma migrate dev
```

### 5. Iniciar os servidores

```bash
# Na raiz (um terminal só)
npm run dev
```

Ou separadamente:

```bash
# Backend (terminal 1)
npm run dev:be

# Frontend (terminal 2)
npm run dev:fe
```

- Frontend (Vite): http://localhost:5173
- Backend (NestJS): http://localhost:3000

### Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe PostgreSQL + backend + frontend |
| `npm run dev:fe` | Sobe só o frontend |
| `npm run dev:be` | Gera Prisma + seed + sobe o backend |
| `npm run seed` | Roda o seed de usuários de teste |
| `npm run db:up` | PostgreSQL via Docker |
| `npm run db:stop` | Para o PostgreSQL |

---

## Variáveis de Ambiente

Consulte os arquivos `.env.example` em cada app:

- **Backend:** `apps/backend/.env.example` — DATABASE_URL, JWT_SECRET, CORS, APIs externas, pagamento, tickets
- **Frontend:** `apps/frontend/.env.example` — VITE_API_URL

### Chaves obrigatórias para dados reais

| Variável | Onde | Como obter |
|----------|------|-----------|
| `TMDB_ACCESS_TOKEN` | Backend | [The Movie Database](https://www.themoviedb.org/settings/api) |
| `TICKETMASTER_API_KEY` | Backend | [Ticketmaster Developer](https://developer.ticketmaster.com/) |

---

## Usuários de Teste

O seed cria automaticamente 3 usuários (um por role) ao iniciar o backend:

| Role | Email | Senha | Uso |
|------|-------|-------|-----|
| CLIENT | `cliente@test.com` | `12345678` | Navegar, comprar ingressos |
| ORGANIZER | `organizador@test.com` | `12345678` | Criar e gerenciar eventos |
| GATE | `portaria@test.com` | `12345678` | Validar ingressos na entrada |

> **Para rodar o seed manualmente:** `npm run seed` (na raiz) ou `npm run seed --workspace=apps/backend`

---

## Pagamento (Simulado)

O pagamento é **simulado** — nenhum cartão real é processado. A aprovação depende do último dígito do número do cartão:

| Último dígito | Resultado |
|---------------|-----------|
| Par (0, 2, 4, 6, 8) | `APPROVED` |
| Ímpar (1, 3, 5, 7, 9) | `DECLINED` |

---

## Arquitetura

Monorepo com npm workspaces:

```
├── apps/
│   ├── backend/        # NestJS 11 + Prisma 7
│   └── frontend/       # React 19 + Vite 8
├── packages/
│   └── shared/         # @elite-dev/shared (tipos TypeScript)
├── openspec/           # Specs e changes (OpenSpec)
├── docker-compose.yml  # Stack completa
└── docker-compose.dev.yml  # Só PostgreSQL
```

### Backend — Módulos

| Módulo | Responsabilidade |
|--------|-----------------|
| `AuthModule` | JWT + Passport, login/register, roles |
| `UsersModule` | CRUD de usuários |
| `CatalogModule` | Proxy TMDB (filmes) + Ticketmaster (shows) |
| `EventsModule` | CRUD de eventos, aggregation de filmes/sessões |
| `ReservationsModule` | Reservas com concorrência segura (assentos + setores) |
| `PaymentsModule` | Provider abstraído (simulado, extensível) |
| `TicketsModule` | Emissão QR HMAC, validação na portaria, códigos manuais |

### Frontend — Features

| Feature | Descrição |
|---------|-----------|
| `auth` | Login, registro, hook `useGetMe` |
| `events` | Wizard de criação (5 passos), listagem, detalhe |
| `catalog` | Busca de catálogo externo com infinite scroll |
| `checkout` | Dados do comprador + pagamento |
| `tickets` | Meus ingressos, detalhe com QR, compartilhamento |
| `gate` | Portaria: leitura QR, entrada manual, validação |
| `home` | Hero carrossel, cards de filmes/eventos, scroll horizontal |

---

## Metodologia

### OpenSpec (Spec-Driven Development)

Todas as features foram planejadas antes da implementação usando [OpenSpec](https://github.com/openspec-dev/openspec):

- **Specs:** 6 domínios documentados (catalog, events, reservations, tickets, payments, frontend-home)
- **Changes:** 10 changes arquivados + 2 ativos, cada um com proposal, design, tasks e specs
- **Fluxo:** proposal → design → tasks → implementação → archive

Os artifacts ficam em `openspec/specs/` e `openspec/changes/`.

### Pencil + Pencil MCP (Design)

O design system foi extraído de um arquivo `.pen` (Pencil) usando Pencil MCP:

1. **`pencil_get_app_state`** — obteve o estado do canvas e componentes reutilizáveis
2. **`pencil_execute` com `GetVariables()`** — leu 16 variáveis de design (cores, fontes, gaps, radius)
3. **`pencil_execute` com `Get()`** — percorreu a árvore de cada componente para extrair dimensões, fill, layout, gap, padding, fontSize

Os tokens foram mapeados para variáveis CSS e registrados no Tailwind CSS 4 via `@theme inline`. O design system completo está documentado em `specs/fe-home-navbar.md`.

---

## Estrutura de Pastas

```
apps/backend/src/
├── auth/           # JWT, strategies, guards
├── users/          # User CRUD
├── catalog/        # TMDB + Ticketmaster providers
├── events/         # Event CRUD, movie aggregation
├── reservations/   # Booking with concurrency control
├── payments/       # Swappable payment providers
├── tickets/        # QR issuance, gate validation
└── common/         # Guards, decorators, validators

apps/frontend/src/
├── routes/         # TanStack Router file-based routes
├── features/       # Feature-sliced modules (auth, events, catalog, checkout, tickets, gate, home)
├── components/     # Shared components (navbar, cards, ui/)
└── lib/            # HTTP client, utils, formatters
```

---

## Licença

Desafio técnico — Elite Dev Challenge
