# Plano: Checkout — Stage 2 (wire-up & integração)

> Conclui o fluxo de pagamento trocando os stubs do Stage 1 (`checkout-ui-plan.md`) por chamadas reais. Pré-requisito: Stage 1 concluído (rota `/checkout` + componentes + navegação com `reservationIds: []` stub). O backend já está pronto (módulos `reservations` + `payments` + `tickets`); este plano não altera o backend.

## Decisões (locked-in)

- **Reserva no clique**: o botão "Comprar ingressos" na tela de detalhe chama `POST /reservations` imediatamente (PENDING) e só então navega para `/checkout` com `reservationIds[]` reais.
- **"Finalizar" só paga**: o botão "Finalizar compra" chama `POST /reservations/:id/pay` por reserva; não cria mais nada.
- **Auth no clique**: deslogado (`useGetMe()` sem user) → botão vira "Faça login para comprar" → `navigate('/login', { search: { redirect: location.href } })`. O login já trata `redirect` (`login.tsx` faz `window.location.href = redirect` no sucesso). Após login o usuário volta ao detalhe (seleção em memória se perde — re-seleciona e clica de novo).
- **Multi-seat**: N assentos = N chamadas `createReservation` (uma por `seatId`). Em 409 (assento pego) → erro inline no detalhe, não navega. As PENDING já criadas com sucesso ficam órfãs (backend sem cancel — limitação conhecida).
- **Sem GET /reservations**: o checkout deriva o resumo de `seatIds[]`/`ticketTypeId` + `eventDetailOptions` (buscado no loader); `reservationIds[]` só servem para o pay.
- **Campos não enviados**: cpf/telefone do Step 1 e validade/cvv/nome do cartão do Step 2 são coletados mas **não enviados** — o backend só aceita `{ cardNumber }` no pay e não tem coluna para cpf/telefone. Apenas `cardNumber` é enviado.
- **Provider simulado**: aprova se o último dígito do cartão for **par**, recusa se ímpar — útil para testar os dois caminhos manualmente.

## Endpoint consumido

| Método | Rota | Auth | Body | Retorna |
|--------|------|------|------|---------|
| `POST` | `/reservations` | JWT cookie + `CLIENT` | `{ eventId, seatId? \| ticketTypeId? }` | `{ id, eventId, userId, seatId, ticketTypeId, status:'PENDING', createdAt }` |
| `POST` | `/reservations/:id/pay` | JWT cookie + `CLIENT` | `{ cardNumber }` | `Ticket` (APPROVED) \| `{ status:'DECLINED', message }` |

> Sem prefixo global. `httpClient` (`@/lib/http-client`, axios, `withCredentials`, baseURL `VITE_API_URL`) faz as chamadas. Role `CLIENT` exigida pelo backend; `_authenticated.tsx` garante login (mas não role) antes de renderizar `/checkout`.

## Estrutura de arquivos — Criar

```
packages/shared/src/index.ts               # adicionar tipos de domínio pagamento/reserva
apps/frontend/src/features/checkout/
├── api.ts                                  # createReservation, payReservation (httpClient)
└── hooks/
    ├── use-create-reservation.ts           # useMutation (create)
    └── use-pay-reservation.ts              # useMutation (pay)
```

### `packages/shared/src/index.ts` (adicionar)

```ts
export interface CreateReservationRequest {
  eventId: string;
  seatId?: string;
  ticketTypeId?: string;
}

export interface ReservationResponse {
  id: string;
  eventId: string;
  userId: string;
  seatId: string | null;
  ticketTypeId: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

export interface PayReservationRequest {
  cardNumber: string;
}

export type PaymentResultResponse =
  | { id: string; reservationId: string; userId: string; signature: string; createdAt: string } // Ticket (APPROVED)
  | { status: 'DECLINED'; message: string };
```

> O `Ticket` retornado no APPROVED segue o shape de `TicketsService.issueForReservation`. Conferir campos exatos contra `src/tickets/tickets.service.ts` na implementação (id, reservationId, userId, signature, publicId se houver).

### `src/features/checkout/api.ts`

```ts
import { httpClient } from '@/lib/http-client';
import type {
  CreateReservationRequest,
  ReservationResponse,
  PayReservationRequest,
  PaymentResultResponse,
} from '@elite-dev/shared';

export async function createReservation(
  payload: CreateReservationRequest,
): Promise<ReservationResponse> {
  const { data } = await httpClient.post<ReservationResponse>(
    '/reservations',
    payload,
  );
  return data;
}

export async function payReservation(
  id: string,
  payload: PayReservationRequest,
): Promise<PaymentResultResponse> {
  const { data } = await httpClient.post<PaymentResultResponse>(
    `/reservations/${id}/pay`,
    payload,
  );
  return data;
}
```

### `src/features/checkout/hooks/use-create-reservation.ts`

```ts
import { useMutation } from '@tanstack/react-query';
import { createReservation } from '../api';
import type { CreateReservationRequest } from '@elite-dev/shared';

export function useCreateReservation() {
  return useMutation({
    mutationFn: (payload: CreateReservationRequest) =>
      createReservation(payload),
  });
}
```

### `src/features/checkout/hooks/use-pay-reservation.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { payReservation } from '../api';

export function usePayReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cardNumber }: { id: string; cardNumber: string }) =>
      payReservation(id, { cardNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
```

## Estrutura de arquivos — Modificar

### `src/features/events/components/detail/seat-selection.tsx` (wire-up do clique)

- Adicionar `useGetMe()` (de `@/features/auth/hooks/use-get-me`).
- Adicionar `useCreateReservation()` + `useNavigate()`.
- Botão:
  - Sem user → label "Faça login para comprar", `onClick` → `navigate({ to: '/login', search: { redirect: window.location.href } })`.
  - Com user → label "Comprar ingressos", `onClick` → criar N reservations (uma por `seatId` em `selectedSeatIds`), coletar `id`s; em sucesso → `navigate({ to: '/checkout', search: { eventId, mode:'seat', seatIds:[...], price, reservationIds:[ids] } })`; em erro 409 → erro inline ("Assento X acabou de ser reservado"); loading → label "Reservando..." + disabled.
- Ordem do create: sequencial (await cada) para falhar cedo em 409; ou `Promise.all` para paralelo. Recomendado sequencial com `for...of` + break no primeiro erro.

### `src/features/events/components/detail/ticket-selection.tsx` (wire-up do clique)

- Mesmo padrão: `useGetMe()` + `useCreateReservation()` + `useNavigate()`.
- Botão:
  - Sem user → "Faça login para comprar" → login redirect.
  - Com user + `selected` → `createReservation({ eventId, ticketTypeId: selectedTicketTypeId })` → `navigate('/checkout', { search: { eventId, mode:'ticket', ticketTypeId, price: selected.price, reservationIds:[res.id] } })`; erro → inline.

### `src/routes/_authenticated/checkout.tsx` (já criado no Stage 1)

- Sem mudança estrutural; `search.reservationIds` agora vem preenchido. O `OrderSummary` já deriva de `seatIds`/`ticketTypeId` + `event` (estável).

### `src/features/checkout/components/payment-form.tsx` (wire-up do "Finalizar")

- `usePayReservation()` + `useNavigate`.
- "Finalizar compra" `onClick` → para cada `reservationId` em `search.reservationIds`, chamar `payReservation({ id, cardNumber })`.
  - Modo seat (N): sequencial; parar no primeiro DECLINED → erro inline ("Pagamento recusado"), manter form; reservas APPROVED já geraram ticket.
  - Modo ticket (1): chamada única.
- Em APPROVED (todas) → `navigate({ to: '/meus-ingressos' })` (invalidação já no hook).
- Em DECLINED → erro inline "Pagamento recusado", permanecer no Step 2, manter valores do form.
- Loading → label "Processando..." + disabled.
- Extrair `cardNumber` do form (somente esse campo é enviado; ignorar validade/cvv/nome).

### `src/features/checkout/components/buyer-data-form.tsx`

- `defaultValues` de `useGetMe()`: `name` = `${user.name} ${user.lastName ?? ''}`.trim()`, `email` = `user.email`. cpf/telefone vazios.

### Pós-pagamento: rota `/meus-ingressos`

- **A rota `/meus-ingressos` NÃO existe** no frontend (rotas atuais: `/`, `/login`, `/register`, `/filmes/$externalId`, `/eventos/$id`, `/_authenticated/organizador/eventos/novo`). Necessário criar uma rota mínima `src/routes/_authenticated/meus-ingressos.tsx` que chame `GET /tickets/mine` (`useQuery`) e liste os tickets, OU uma tela de sucesso simples que redirecione. Decisão: criar a rota mínima de listagem de tickets (consome endpoint já existente `GET /tickets/mine`).

## Estrutura de arquivos — Criar (pós-pagamento)

```
apps/frontend/src/
├── features/tickets/
│   ├── api.ts                    # getMyTickets (httpClient.get('/tickets/mine'))
│   ├── queries.ts                # myTicketsOptions (queryOptions)
│   └── hooks/use-my-tickets.ts   # useQuery(myTicketsOptions)
└── routes/_authenticated/meus-ingressos.tsx  # lista tickets do user
```

> Reaproveita o componente `TicketCard` (`z1s0Dl` no Pencil) se existir no frontend; senão, renderização mínima de lista.

## Arquivos a criar/modificar (consolidado)

### Criar
- `packages/shared/src/index.ts` (adicionar `CreateReservationRequest`, `ReservationResponse`, `PayReservationRequest`, `PaymentResultResponse`)
- `src/features/checkout/api.ts`
- `src/features/checkout/hooks/use-create-reservation.ts`
- `src/features/checkout/hooks/use-pay-reservation.ts`
- `src/features/tickets/api.ts`
- `src/features/tickets/queries.ts`
- `src/features/tickets/hooks/use-my-tickets.ts`
- `src/routes/_authenticated/meus-ingressos.tsx`

### Modificar
- `src/features/events/components/detail/seat-selection.tsx` (auth toggle + create reservation + navigate com reservationIds reais)
- `src/features/events/components/detail/ticket-selection.tsx` (idem)
- `src/features/checkout/components/payment-form.tsx` (pay reservation + navegação pós-pagamento)
- `src/features/checkout/components/buyer-data-form.tsx` (`defaultValues` de `useGetMe()`)

## Commits

1. `feat(shared): add reservation/payment domain types` — tipos em `packages/shared`
2. `feat(frontend): wire checkout reserve-on-click + pay` — Stage 2 (create no botão + pay no Finalizar + auth toggle)
3. `feat(frontend): add my-tickets route` — rota `/meus-ingressos` pós-pagamento

## Convenções

- Mesmas do Stage 1 (`@/*` alias, `import type`, sem comentários, react-hook-form + zodResolver).
- 3-layer por feature: `api.ts` (httpClient) → `queries.ts` (`queryOptions`) → `hooks/use-*.ts` (`useQuery`/`useMutation`).
- Query keys: `['tickets','mine']` (seguir padrão `['domain','sub',id]`).
- `useMutation` com `onSuccess`/`onError` inline no call site (cf. `use-login.ts`) ou no hook para invalidação (cf. `use-pay-reservation.ts`).
- Erros de axios: `isAxiosError` + `error.response?.data?.message` (cf. `novo.tsx`).

## Verificação (em `apps/frontend`)

1. `npm run lint`
2. `npm run build` (`tsc -b && vite build`)

### Teste manual (Stage 2)
- Backend rodando: `docker compose up -d` + `npx prisma generate` (em `apps/backend`) + `npm run dev` (em `apps/backend`); `npm run dev` (em `apps/frontend`).
- Logado como `CLIENT`: selecionar assentos → "Comprar ingressos" → cria PENDING → cai em `/checkout` → "Finalizar" com cartão terminando em **par** → APPROVED → `/meus-ingressos` mostra o ticket.
- Cartão terminando em **ímpar** → DECLINED → erro inline "Pagamento recusado", permanece no Step 2.
- Deslogado: botão "Faça login para comprar" → login → volta ao detalhe (re-selecionar) → fluxo.
- Evento pista (1 ticketType): fluxo de 1 reserva → 1 pay.
- 409 (assento pego entre seleção e clique): erro inline no detalhe.

## Flags / limitações conhecidas

- **PENDINGs órfãos**: checkouts abandonados (ou 409 parcial mid-flow) deixam reservas PENDING sem cancel (backend sem endpoint de cancel). Sem perda financeira (não há pay), mas polui o banco. Futuro: endpoint `DELETE /reservations/:id` ou expiry.
- **Seleção perdida no login**: ao redirecionar deslogado→login→detalhe, a seleção em memória (useState) se perde. Melhoria futura: codificar seleção na URL do detalhe para sobreviver ao round-trip de login.
- **Campos coletados não enviados**: cpf/telefone + validade/cvv/nome do cartão não são persistidos/usados pelo backend atual (só `cardNumber`). Futuro: gateway real (Asaas slot já comentado em `payments.module.ts`) usaria esses campos.
- **Role gate client-side**: `_authenticated.tsx` só verifica login, não role `CLIENT`. Um `ORGANIZER` logado que clicar em "Comprar" recebe 403 do backend. Não há gate client-side de role hoje (consistente com o resto do app).
