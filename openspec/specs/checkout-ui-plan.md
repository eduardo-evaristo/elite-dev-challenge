# Plano: Checkout — Stage 1 (UI/visual)

> Constrói a UI do fluxo de checkout (rota `/checkout` + componentes) sem chamadas de backend. O botão "Comprar ingressos" navega com dados stub para o checkout ser visualmente caminhável. O Stage 2 (`checkout-wireup-plan.md`) troca os stubs por chamadas reais (create reservation + pay).

## Decisões (locked-in)

- **Rota dedicada `/checkout`** (protegida por `_authenticated`): os frames do Pencil (`f9RvF`, `zAgpt`) são full-page 1440px com navbar+footer, confirmando uma rota dedicada — não modal.
- **Reserva no clique, não no "Finalizar"**: o botão "Comprar ingressos" na tela de detalhe chama `POST /reservations` (Stage 2) e navega para `/checkout` com `reservationIds[]`. O "Finalizar compra" só chama `POST /reservations/:id/pay`. Combina com o modelo de 2 passos do backend (create PENDING → pay).
- **Step 1 "Dados do comprador"**: nome/email pré-preenchidos de `useGetMe()`; cpf/telefone coletados mas **não enviados** (backend não tem coluna nem aceita esses campos no endpoint).
- **OrderSummary com seleção real**: sentado → uma linha por assento (`Assento F-12` @ `price`); pista → `ticketType.name` @ `ticketType.price`. Total = soma real. Substitui o mockup "Inteira/Meia" do design (backend não tem meia-entrada).
- **Só "Cartão de crédito"** no seletor de método (Pix/Boleto removidos do UI conforme decisão do usuário).
- **Schema de URL estável entre Stage 1 e Stage 2**: o checkout lê `eventId + mode + seatIds[]|ticketTypeId + price + reservationIds[]`. No Stage 1, `reservationIds` vem vazio (stub); no Stage 2, vem preenchido pelo create. Assim não há retrabalho de contrato entre fases.
- **Auth no clique (Stage 2)**: deslogado → botão vira "Faça login para comprar" → `/login?redirect=<detalhe>`. O login já trata `redirect` (`login.tsx:9` `loginSearchSchema`). Em Stage 1 o botão mostra sempre "Comprar ingressos" e navega com stub.
- **Sem GET /reservations**: o backend não tem endpoint de listar/obter reserva. Por isso o checkout recebe a seleção (`seatIds[]`/`ticketTypeId`) na URL para exibir o resumo, e `reservationIds[]` só para pagar. O loader busca `eventDetailOptions(eventId)` para labels (nome, data, local, seats[]/ticketTypes[]).

## Endpoint consumido

| Método | Rota | Auth | Stage |
|--------|------|------|-------|
| `GET` | `/events/:id` | público | Stage 1 (loader do checkout p/ resumo) |

> Endpoints `POST /reservations` e `POST /reservations/:id/pay` são Stage 2 (ver `checkout-wireup-plan.md`).

## Estrutura de arquivos — Criar

```
apps/frontend/src/
├── features/checkout/
│   ├── components/
│   │   ├── step-indicator.tsx        # Step 1/2 (ativo = círculo curtain preenchido; feito = ✓ contorno curtain)
│   │   ├── order-summary.tsx         # Ticket card (gradient header + perfuração + itens + total + assentos)
│   │   ├── buyer-data-form.tsx       # Step 1: nome, email, cpf, telefone (cpf+telefone na mesma linha)
│   │   └── payment-form.tsx          # Step 2: seletor (só Cartão) + form do cartão (número, validade+cvv, nome impresso)
│   └── schemas.ts                    # zod: checkoutSearchSchema + buyerDataSchema + cardDataSchema
└── routes/_authenticated/checkout.tsx # rota: validateSearch + loader eventDetailOptions + step state
```

### `src/features/checkout/schemas.ts`

```ts
import { z } from 'zod';

export const checkoutSearchSchema = z.object({
  eventId: z.string(),
  mode: z.enum(['seat', 'ticket']),
  reservationIds: z.array(z.string()).default([]), // [] no Stage 1 (stub), real no Stage 2
  seatIds: z.array(z.string()).optional(),
  ticketTypeId: z.string().optional(),
  price: z.number(),
});

export type CheckoutSearch = z.infer<typeof checkoutSearchSchema>;

export const buyerDataSchema = z.object({
  name: z.string().min(1, 'Informe seu nome'),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().min(1, 'Informe seu CPF'),
  phone: z.string().min(1, 'Informe seu telefone'),
});

export const cardDataSchema = z.object({
  cardNumber: z.string().min(1, 'Informe o número do cartão'),
  expiry: z.string().min(1, 'Informe a validade'),
  cvv: z.string().min(1, 'Informe o CVV'),
  cardName: z.string().min(1, 'Informe o nome impresso'),
});
```

### `src/routes/_authenticated/checkout.tsx`

```ts
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/features/home/components/footer';
import { StepIndicator } from '@/features/checkout/components/step-indicator';
import { OrderSummary } from '@/features/checkout/components/order-summary';
import { BuyerDataForm } from '@/features/checkout/components/buyer-data-form';
import { PaymentForm } from '@/features/checkout/components/payment-form';
import { useEventDetail } from '@/features/events/hooks/use-event-detail';
import { eventDetailOptions } from '@/features/events/queries';
import { checkoutSearchSchema, type CheckoutSearch } from '@/features/checkout/schemas';

export const Route = createFileRoute('/_authenticated/checkout')({
  validateSearch: checkoutSearchSchema,
  loader: async ({ context, search }) => {
    await context.queryClient.ensureQueryData(eventDetailOptions(search.eventId));
  },
  component: CheckoutComponent,
});

function CheckoutComponent() {
  const search = Route.useSearch() as CheckoutSearch;
  const { data: event } = useEventDetail(search.eventId);
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="flex w-full max-w-[1280px] flex-1 flex-row gap-12 px-5 py-12 md:px-20">
        <div className="flex w-full max-w-[780px] flex-col gap-8">
          <StepIndicator current={step} />
          {step === 1 ? (
            <BuyerDataForm onContinue={() => setStep(2)} />
          ) : (
            <PaymentForm onBack={() => setStep(1)} />
          )}
        </div>
        <div className="w-full max-w-[420px]">
          <OrderSummary event={event} search={search} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

### `src/features/checkout/components/step-indicator.tsx`

Props: `{ current: 1 | 2 }`. Dois passos lado a lado (gap-3), cada um = círculo 28px + label.
- Step ativo: círculo `bg-curtain border-curtain text-white`, número do step.
- Step feito (anterior): círculo `bg-surface border-curtain text-curtain`, ícone `Check` (lucide).
- Step futuro: círculo `bg-surface border-line text-muted-foreground`.
- Label ativo: `text-ink font-semibold`; inativo: `text-muted-foreground`.
- Labels: "1. Dados do comprador", "2. Pagamento".

### `src/features/checkout/components/order-summary.tsx`

Props: `{ event?: EventDetailResponse; search: CheckoutSearch }`. Card de ticket com 3 zonas:

1. **Header gradiente** (`bg-gradient-to-br from-[#1A0A0F] to-[#3E1E2A]`, padding 7, gap-4, rounded-t-md):
   - Título do evento (`event.name`, `text-white text-[22px] font-bold`).
   - Meta `map-pin` + `event.location`; `calendar` + `formatEventDate(event.date)`; `film` + `event.eventClassification` (ícones lucide 16px com `fill-white/70`, texto `text-white/80 text-sm`).
   - Badge de categoria: `bg-[#B8791C] text-white text-[11px] font-semibold rounded px-2.5 py-1` (label = `event.type === 'MOVIE' ? 'Cinema' : 'Show'`).
2. **Perfuração** (h-6, relativa): dois círculos `absolute size-6 rounded-full bg-paper` (`-left-3 top-0` e `-right-3 top-0`) + linha `border-t border-dashed border-line` centralizada.
3. **Corpo** (padding 7, gap-4):
   - "Resumo do pedido" (`text-ink text-sm font-semibold`).
   - Itens (gap-3, justify-between): modo seat → uma linha por `seatId` (mapear `event.seats` → `{row,number}`, label `Assento {row}-{number}`, valor `formatCurrency(search.price)`); modo ticket → `event.ticketTypes.find(id===ticketTypeId)` → label `name`, valor `formatCurrency(price)`.
   - Linha total (border-t, padding-y-4): "Total" + `formatCurrency(total)` em `text-curtain text-[20px] font-bold`.
   - Info de assentos (modo seat): ícone `armchair` + "Assentos: F-12, F-14, F-15" (join dos labels). Omitir no modo ticket.

Container: `rounded-md border border-line bg-surface shadow-[0_8px_24px_rgba(34,31,28,0.1)] clip`.

### `src/features/checkout/components/buyer-data-form.tsx`

Props: `{ onContinue: () => void }`. react-hook-form + `zodResolver(buyerDataSchema)`.
- Heading "Dados do comprador" (`text-ink text-[22px] font-semibold`) + subheading "Precisamos de alguns dados para garantir seu ingresso." (`text-muted-foreground text-sm`).
- Campos (gap-5, coluna): Nome completo, E-mail (cada um: label `text-ink text-[13px] font-semibold` + `Input` `border-line`); linha CPF + Telefone (flex gap-5, cada `flex-1`).
- **Stage 1**: nome/email podem vir de `useGetMe()` como `defaultValues` (opcional; o wiring real de preenchimento é Stage 2, mas já estruturar o `defaultValues` para receber o user).
- Botão "Continuar para pagamento" (`bg-curtain text-white rounded-md px-8 py-4 font-semibold`), `onClick` → `onContinue()` (apenas avança step; sem validação de backend).

### `src/features/checkout/components/payment-form.tsx`

Props: `{ onBack: () => void }`. react-hook-form + `zodResolver(cardDataSchema)`.
- Heading "Pagamento" + subheading "Escolha a forma de pagamento e preencha os dados."
- **Seletor de método**: um único card "Cartão de crédito" (`border-2 border-curtain bg-surface` com ícone `credit-card` lucide preenchido curtain) — sempre selecionado. Renderizar como botão não-clicável (ou clicável sem efeito, pois é a única opção).
- **Card form** (white card `border-line rounded-lg` padding 7, gap-5):
  - Título "Dados do cartão".
  - Número do cartão (label + Input).
  - Linha Validade + CVV (flex gap-5, cada `flex-1`).
  - Nome impresso no cartão (label + Input).
- **Linha de botões** (justify-between): "Voltar" (`bg-surface border-line text-muted-foreground`, `onClick` → `onBack()`) + "Finalizar compra" (`bg-curtain text-white`, **Stage 1**: `disabled` ou `onClick` no-op/console.log placeholder — Stage 2 wirea o pay).

## Estrutura de arquivos — Modificar

### `src/features/events/components/detail/seat-selection.tsx`

- Adicionar prop `eventId: string`.
- Importar `useNavigate` de `@tanstack/react-router`.
- Botão "Comprar ingressos" `onClick` → `navigate({ to: '/checkout', search: { eventId, mode: 'seat', seatIds: [...selectedSeatIds], price, reservationIds: [] } })` (habilitado só se `hasSelection`, que já é o `disabled` atual).

> `filmes/$externalId.tsx` passa `eventId={sessionEvent.id}` ao `<SeatSelection>`; `eventos/$id.tsx` passa `eventId={event.id}`.

### `src/features/events/components/detail/ticket-selection.tsx`

- Adicionar prop `eventId: string`.
- Importar `useNavigate`.
- Botão "Comprar ingressos" `onClick` → `navigate({ to: '/checkout', search: { eventId, mode: 'ticket', ticketTypeId: selectedTicketTypeId, price: selected.price, reservationIds: [] } })` (habilitado só se `selected`).

> `eventos/$id.tsx` passa `eventId={event.id}` ao `<TicketSelection>`.

### `src/routes/filmes/$externalId.tsx` e `src/routes/eventos/$id.tsx`

- Passar `eventId` ao `SeatSelection` (filmes: `sessionEvent.id`; eventos: `event.id`) e ao `TicketSelection` (eventos: `event.id`).

## Arquivos a criar/modificar (consolidado)

### Criar
- `src/features/checkout/schemas.ts`
- `src/features/checkout/components/step-indicator.tsx`
- `src/features/checkout/components/order-summary.tsx`
- `src/features/checkout/components/buyer-data-form.tsx`
- `src/features/checkout/components/payment-form.tsx`
- `src/routes/_authenticated/checkout.tsx`

### Modificar
- `src/features/events/components/detail/seat-selection.tsx` (prop `eventId` + `onClick` navigate stub)
- `src/features/events/components/detail/ticket-selection.tsx` (prop `eventId` + `onClick` navigate stub)
- `src/routes/filmes/$externalId.tsx` (passar `eventId`)
- `src/routes/eventos/$id.tsx` (passar `eventId`)

## Convenções

- Imports cross-feature: `@/features/...`, `@/components/...`, `@/lib/...` (alias `@/*`).
- Imports dentro da feature: relativos `./`, `../`.
- `import type` para type-only imports (`verbatimModuleSyntax` ativo).
- Sem comentários no código.
- react-hook-form + `zodResolver`; schemas em `features/checkout/schemas.ts`.
- Tokens de tema: `bg-paper`, `bg-surface`, `text-ink`, `border-line`, `text-muted-foreground`, `bg-curtain`, `text-curtain`. Cores do design fora dos tokens usam arbitrary values (`from-[#1A0A0F]`, `bg-[#B8791C]`).
- `formatCurrency` de `@/lib/currency`; `formatEventDate` de `@/lib/datetime`.
- Ícones: `lucide-react` (`credit-card`, `map-pin`, `calendar`, `film`, `armchair`, `check`).
- Primitivos: reusar `Button`/`Input`/`Label` de `@/components/ui`; hand-roll seletor de método + perfuração com `cn`+Tailwind (mesmo padrão hand-rolled de `seat-selection.tsx`).

## Verificação (em `apps/frontend`)

1. `npm run lint`
2. `npm run build` (`tsc -b && vite build`) — `tsc -b` é o typecheck.

### Teste manual (Stage 1)
- Navegar para um filme com sessões sentadas → selecionar assentos → "Comprar ingressos" → cai em `/checkout` com Step 1 visível.
- Navegar para um evento pista → selecionar ticketType → "Comprar ingressos" → `/checkout`.
- Step 1 "Continuar" avança para Step 2 (seletor só com Cartão + form do cartão); "Voltar" retorna.
- `OrderSummary` mostra itens reais (assentos ou ticketType) + total correto + info de assentos (modo seat).
- "Finalizar compra" está disabled/placeholder (sem chamada real).

## Próxima fase
- Stage 2: `checkout-wireup-plan.md` — troca stubs por `POST /reservations` (no clique) + `POST /reservations/:id/pay` (no Finalizar) + auth toggle no botão.
