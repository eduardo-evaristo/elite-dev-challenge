# PRD - Guiche: Plataforma de Eventos e Ingressos

**Versao:** 1.0
**Data:** Agosto 2026
**Status:** Implementado

---

## 1. Visao Geral

Guiche e uma plataforma de eventos e ingressos onde organizadores publicam eventos (filmes em cartaz e shows/espetaculos) e clientes navegam, reservam e compram ingressos. A plataforma inclui validacao de ingressos na entrada do evento via leitura de QR code ou codigo manual.

### Publico-alvo

- **Organizadores:** criam e gerenciam eventos a partir de um catalogo externo (TMDB para filmes, Ticketmaster para shows)
- **Clientes:** buscam eventos, selecionam assentos ou setores, pagam e recebem ingressos com QR code
- **Portaria:** valida ingressos na entrada do evento

---

## 2. Objetivos

### Objetivos do Produto

1. Permitir que organizadores publiquem eventos rapidamente a partir de catalogos externos
2. Oferecer fluxo de compra simples e seguro com reserva de assentos
3. Gerar ingressos com QR code para validacao na entrada
4. Fornecer painel de portaria para validacao rapida

### Objetivos Tecnicos

1. Demonstrar arquitetura Full-Stack com padroes robustos (repository, strategy, RBAC)
2. Implementar concorrencia segura na reserva de assentos
3. Criar design system customizado via extracao de tokens de ferramenta de design
4. Documentar o processo de desenvolvimento com OpenSpec (Spec-Driven Development)

---

## 3. Personas e Roles

| Role | Descricao | Permissoes |
|------|-----------|-----------|
| `CLIENT` | Usuario comprador | Navegar eventos, reservar, comprar ingressos, visualizar seus ingressos |
| `ORGANIZER` | Organizador de eventos | Criar, editar, cancelar eventos; acessar catalogo externo |
| `GATE` | Funcionario da portaria | Validar ingressos na entrada (QR code ou codigo manual) |
| `ADMIN` | Administrador | Acesso total (CRUD eventos de qualquer organizador, validacao) |

---

## 4. Funcionalidades Implementadas

### 4.1 Autenticacao e Autorizacao

**User Story:** Como usuario, quero criar conta e fazer login para acessar funcionalidades restritas.

- Registro com nome, sobrenome, email e senha (role CLIENT por padrao)
- Login com email e senha
- JWT em cookie httpOnly (httpOnly, secure em producao)
- Roles: CLIENT, ORGANIZER, GATE, ADMIN
- Guard de rotas autenticadas no frontend (redireciona para /login)
- Guard por role (ex: /portaria acessa so GATE e ADMIN)

**Endpoints:**
- `POST /auth/login` - Login, seta cookie httpOnly
- `POST /auth/register` - Registro (role CLIENT)
- `POST /auth/logout` - Limpa cookie
- `GET /auth/me` - Usuario autenticado

### 4.2 Catalogo Externo

**User Story:** Como organizador, quero buscar filmes e shows em catalogos externos para criar eventos rapidamente.

- Integracao com TMDB API (filmes): busca, trending, detalhe com classificacao indicativa
- Integracao com Ticketmaster API (shows): busca, detalhe, faixas de preco
- Busca com infinite scroll no frontend
- Selecao de item do catalogo para preencher dados do evento
- Endpoints restritos a ORGANIZER e ADMIN

**Endpoints:**
- `GET /catalog?type=movie|show&query=...` - Busca paginada
- `GET /catalog/:type/:externalId` - Detalhe de um item

### 4.3 Criacao de Eventos (Wizard)

**User Story:** Como organizador, quero criar um evento em passos guiados para nao esquecer nenhuma informacao.

Wizard de 5 passos:

1. **Tipo:** selecao entre Filme ou Show
2. **Catalogo:** busca no catalogo externo com selecao do card
3. **Formato:** configuracao de assentos (fileiras x lugares) ou setores (Pista, Pista Premium, etc.)
4. **Detalhes:** data, horario, local, duracao, preco, descricao, classificacao indicativa
5. **Revisao:** resumo completo antes de publicar

- Estado do wizard armazenado na URL (search params), tornando cada passo bookmarkable
- Validacao por passo com botoes de navegacao
- Evento e criado com status PUBLISHED por padrao

### 4.4 Home Page

**User Story:** Como cliente, quero ver os filmes e eventos disponiveis para explorar o que posso assistir.

- Hero com carrossel automatico (5s) e dots navegaveis
- Secao "Filmes em cartaz" com scroll horizontal e infinite scroll
- Secao "Eventos em cartaz" com scroll horizontal e infinite scroll
- Cards de filme (poster, titulo, meta) e evento (imagem, titulo, data, local, badge de categoria)
- Setas de navegacao ancoradas no conteudo
- Footer completo com links, pagamentos e redes sociais
- Navbar role-adaptive (muda conforme o papel do usuario)
- Design responsivo (mobile drawer, hero responsivo)

### 4.5 Paginas de Detalhe

**User Story:** Como cliente, quero ver os detalhes de um evento para decidir se quero comprar ingressos.

**Detalhe de Filme (`/filmes/:externalId`):**
- Hero com banner e informacoes do filme
- Selecao de sessao por local e data/horario
- Mapa de assentos interativo para selecao
- Descricao com classificacao indicativa (badges brasileiras: L, 10, 12, 14, 16, 18)

**Detalhe de Evento (`/eventos/:id`):**
- Hero com banner e informacoes do evento
- Selecao de assentos (mapa visual) OU selecao de setor (cards de tipo de ingresso)
- Preco exibido por setor/assento
- Botao "Comprar ingresso"

### 4.6 Reservas

**User Story:** Como cliente, quero reservar meus assentos antes de pagar para garantir minha vaga.

- Reserva por assento individual (mapa de assentos)
- Reserva por setor/tipo de ingresso (capacidade com decremento atomico)
- Controle de concorrencia:
  - Assentos: constraint de unicidade no banco (P2002 = 409 Conflict)
  - Setores: `UPDATE ... WHERE availableCount >= 1` em transacao atomica
- Cada assento gera uma reserva individual
- Reserva fica com status PENDING ate pagamento

**Endpoints:**
- `POST /reservations` - Criar reserva (CLIENT only)
- `POST /reservations/:id/pay` - Pagamento + emissao de ingresso

### 4.7 Checkout e Pagamento

**User Story:** Como cliente, quero finalizar minha compra de forma rapida e segura.

- Tela de checkout em 2 passos:
  1. **Dados do comprador:** nome, email, CPF, telefone
  2. **Pagamento:** dados do cartao (simulado)
- Resumo do pedido (resumo do ingresso estilo recibo)
- Pagamento sequencial das reservas
- Provider de pagamento abstraido (Strategy pattern):
  - `SimulatedPaymentProvider`: cartao par = aprovado, impar = recusado
  - Interface extensivel para Asaas ou outro provider real
- Fluxo: Reserva -> Pagamento -> Confirmacao -> Emissao de Ingresso

### 4.8 Ingressos

**User Story:** Como cliente, quero ver meus ingressos com QR code e poder compartilhar.

- Lista de ingressos ("Meus Ingressos") com abas futuro/passado
- Detalhe do ingresso com:
  - QR Code (JSON: `{ v, id, sig }`)
  - Codigo manual (formato: `XXXX-XXXX`, 8+8 caracteres)
  - Botao de compartilhamento (link publico `/ingressos/:publicId`)
- Assinatura HMAC-SHA256 no QR code para validacao
- shortId (8 caracteres) em alfabeto sem ambiguidade (sem I, O, 0, 1, etc.)

**Endpoints:**
- `GET /tickets/mine` - Lista de ingressos do usuario (CLIENT)
- `GET /tickets/mine/:publicId` - Detalhe de um ingresso (CLIENT, ownership check)
- `GET /tickets/:publicId` - Visualizacao publica (sem auth, para compartilhamento)

### 4.9 Portaria (Gate)

**User Story:** Como funcionario da portaria, quero validar ingressos na entrada do evento de forma rapida.

- Tela de portaria com eventos do dia
- Leitura de QR code via camera (html5-qrcode)
- Entrada manual de codigo (formato SHORTID-MANUALCODE)
- 4 estados de resposta:
  - **VALID:** ingresso valido, exibe nome do titular e label do ingresso
  - **ALREADY_USED:** ingresso ja utilizado, exibe data/hora do uso anterior
  - **INVALID:** ingresso invalido (assinatura nao confere)
  - **WRONG_EVENT:** ingresso e de outro evento
- Rate limiting: 10 requisicoes por minuto por IP
- Atomicidade: `UPDATEMany WHERE usedAt IS NULL` (single-winner pattern)

**Endpoints:**
- `POST /tickets/validate` - Validacao (GATE/ADMIN only)

---

## 5. Modelo de Dados

### Entidades Principais

```
User (1) ---> (*) Event        (organizador)
User (1) ---> (*) Reservation  (comprador)
User (1) ---> (*) Ticket       (titular)
Event (1) ---> (*) Seat
Event (1) ---> (*) TicketType
Event (1) ---> (*) Reservation
Seat (1) <--- (0..1) Reservation  (unico por assento)
TicketType (1) ---> (*) Reservation
Reservation (1) ---> (0..1) Ticket  (unico por reserva)
```

### Enums

- **Role:** CLIENT, ORGANIZER, GATE, ADMIN
- **EventType:** SHOW, MOVIE
- **EventStatus:** DRAFT, PUBLISHED, CANCELLED
- **ExternalSource:** TMDB, TICKETMASTER
- **SeatStatus:** AVAILABLE, RESERVED, SOLD
- **ReservationStatus:** PENDING, CONFIRMED, CANCELLED
- **PaymentStatus:** APPROVED, DECLINED

### Decisoes de Modelo

1. **Dois modelos de assentos:** Assentos nomeados (cinema/teatro - Seat com fileira/numero) vs. setores (estadios/venues - TicketType com capacidade e availableCount)
2. **Soft delete:** Eventos sao cancelados (status = CANCELLED), nao deletados
3. **Denormalizacao do catalogo:** Campos imageUrl, eventClassification, description, duration sao copiados do catalogo externo para o Event, evitando chamadas a API externa para exibicao
4. **Ticket com assinatura:** O QR code contem uma assinatura HMAC-SHA256 que valida a integridade do ingresso

---

## 6. Arquitetura e Padroes

### Backend (NestJS)

| Padrao | Aplicacao |
|--------|-----------|
| **Repository Pattern** | Cada modulo tem um `*Repository` que encapsula operacoes Prisma |
| **Strategy Pattern** | `PaymentProvider` (simulado, extensivel) e `CatalogProvider` (TMDB, Ticketmaster) |
| **RBAC** | `@Roles()` decorator + `RolesGuard` + `JwtGuard` |
| **DI com Symbol tokens** | `PAYMENT_PROVIDER` e `CATALOG_PROVIDER` para injecao flexivel |
| **Concurrency Guards** | P2002 para assentos, atomic update para setores, single-winner para validacao |
| **Global Pipes** | `ValidationPipe({ transform: true, whitelist: true })` |
| **Rate Limiting** | `ThrottlerModule` global + `@Throttle` por endpoint |

### Frontend (React)

| Padrao | Aplicacao |
|--------|-----------|
| **Feature-Sliced Design** | `features/auth`, `features/events`, `features/catalog`, `features/checkout`, `features/tickets`, `features/gate`, `features/home` |
| **URL-as-State** | Wizard e checkout armazenam estado em URL search params |
| **Data Loading before Render** | `loader` + `ensureQueryData()` no TanStack Router |
| **Query Invalidation** | Login invalida `['me']`, pagamento invalida `['tickets']` e `['me']` |
| **Infinite Scroll** | `useInfiniteScroll` com IntersectionObserver |
| **Feature API Pattern** | Cada feature tem `api.ts` ( chamadas HTTP), `queries.ts` (queryOptions), `hooks/` (useQuery/useMutation) |

### Monorepo

- **npm workspaces:** `apps/*` + `packages/*`
- **Shared types:** `@elite-dev/shared` exporta tipos TypeScript raw (sem build)
- **Import convention:** `from 'src/module'` (absoluto) dentro do backend

---

## 7. Design System

### Extraido do Pencil via MCP

O design system foi criado a partir de um arquivo `.pen` (Pencil) usando Pencil MCP:

1. `pencil_get_app_state` - identificou frames e componentes reutilizaveis
2. `pencil_execute` com `GetVariables()` - leu 16 variaveis (10 cores, 1 fonte, 5 numeros)
3. `pencil_execute` com `Get()` - extraiu estrutura de cada componente

### Tokens

| Token | Valor | Uso |
|-------|-------|-----|
| `--curtain` | #9B2531 | Accent unico (botoes preenchidos) |
| `--paper` | #F5F4F0 | Fundo da pagina |
| `--surface` | #FFFFFF | Cards, navbar, footer |
| `--ink` | #221F1C | Texto (preto so para texto) |
| `--muted` | #746B5E | Texto secundario |
| `--line` | #D8D2C4 | Bordas |
| `--spotlight` | #B8791C | Categoria (ouro) |
| `--stage` | #2E6B84 | Categoria (azul) |
| `--font-body` | IBM Plex Sans | Unica familia tipografica |

### Regras

1. Accent unico: so `--curtain` em botoes preenchidos
2. Bordas nunca com `--ink` puro
3. Uma familia tipografica, hierarquia por peso e tamanho
4. Nunca sombra em containers (exceto modal/dropdown)
5. Hover: troca de cor, nunca scale

---

## 8. Metodologia de Desenvolvimento

### OpenSpec (Spec-Driven Development)

Todas as features foram planejadas antes da implementação usando OpenSpec:

- **6 specs canonicos:** catalog, events, reservations, tickets, payments, frontend-home
- **13 planos de implementacao** com estrutura detalhada
- **10 changes arquivados** + 2 ativos (ambos completos)
- **Fluxo:** proposal -> design -> tasks -> implementacao -> archive

### Pencil + Pencil MCP

- Design visual criado no Pencil (ferramenta de design)
- Tokens extraidos via Pencil MCP (integracao com AI)
- Mapeamento direto para Tailwind CSS 4 via `@theme inline`

---

## 9. Endpoints da API

### Auth
| Metodo | Rota | Auth | Roles |
|--------|------|------|-------|
| POST | /auth/login | LocalGuard | qualquer |
| POST | /auth/register | none | qualquer |
| POST | /auth/logout | JwtGuard | qualquer |
| GET | /auth/me | JwtGuard | qualquer |

### Catalogo
| Metodo | Rota | Auth | Roles |
|--------|------|------|-------|
| GET | /catalog | JwtGuard + RolesGuard | ORGANIZER, ADMIN |
| GET | /catalog/:type/:externalId | JwtGuard + RolesGuard | ORGANIZER, ADMIN |

### Eventos
| Metodo | Rota | Auth | Roles |
|--------|------|------|-------|
| GET | /events | none | publico |
| GET | /events/movies | none | publico |
| GET | /events/movies/:externalId/sessions | none | publico |
| GET | /events/:id | none | publico |
| POST | /events | JwtGuard + RolesGuard | ORGANIZER, ADMIN |
| PATCH | /events/:id | JwtGuard + RolesGuard | ORGANIZER, ADMIN |
| DELETE | /events/:id | JwtGuard + RolesGuard | ORGANIZER, ADMIN |

### Reservas
| Metodo | Rota | Auth | Roles |
|--------|------|------|-------|
| POST | /reservations | JwtGuard + RolesGuard | CLIENT |
| POST | /reservations/:id/pay | JwtGuard + RolesGuard | CLIENT |

### Ingressos
| Metodo | Rota | Auth | Roles |
|--------|------|------|-------|
| GET | /tickets/mine | JwtGuard + RolesGuard | CLIENT |
| GET | /tickets/mine/:publicId | JwtGuard + RolesGuard | CLIENT |
| GET | /tickets/:publicId | none | publico |
| POST | /tickets/validate | JwtGuard + RolesGuard + ThrottlerGuard | GATE, ADMIN |

---

## 10. Extensoes Futuras

1. **Pagamento real:** Integracao com Asaas (interface ja definida, so trocar provider)
2. **Notificacoes:** Email de confirmacao de compra, lembrete de evento
3. **Avaliacoes:** Clientes avaliam eventos apos assistir
4. **Relatorios:** Dashboard para organizadores com vendas, ocupacao, receita
5. **Promocoes:** Cupons de desconto, precos dinamicos
6. **Multi-idioma:** i18n para ingles/espanhol
7. **App mobile:** React Native ou PWA com camera nativa para portaria
