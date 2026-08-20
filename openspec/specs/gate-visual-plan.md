# Plano: Portaria (Gate) — Stage 1 (UI/Visual + Rotas)

> Constrói a UI do fluxo de portaria (rota `/portaria` + `/portaria/$eventId/validar` + componentes) com chamadas reais de backend. Pré-requisito: backend do gate concluído (`gate-integration-plan.md`).

## Decisões (locked-in)

- **GATE users não veem a home.** Após login ou em qualquer navegação, redirecionam para `/portaria`. Guard na `index.tsx` (`beforeLoad`) e no `_authenticated.tsx` (confinamento) garantem isso.
- **Telas gate não usam `<Navbar />`.** Cada tela tem seu próprio header: `/portaria` usa `<GateHeader>` (logo + shield + badge); `/portaria/$eventId/validar` usa header com back arrow + event info.
- **Scanner: `html5-qrcode`.** Biblioteca madura, UI pronta com viewfinder, não precisa de customização visual. Usada como wrapper React via `useEffect`.
- **Resultado como estado, não rota.** Após scan/envio manual, o componente de resultado substitui o viewfinder inline (overlay full-screen colorido). "Validar próximo" reseta para scanning.
- **Entrada manual = input único `XXXXXXXX-XXXXXXXX` (shortId-manualCode).** O gate operator digita o código combinado que aparece no ingresso do dono (abaixo do QR). Backend faz split por `-`, localiza por `shortId`, verifica por `manualCode`.
- **Formato do código no ingresso**: `shortId` (8 chars) + `-` + `manualCode` (8 chars). Ex: `AB3XK9DM-7Q2MZP1T`. Monospace, uppercase, letter-spacing ampliado. Só visível no modo owner.
- **Telas com boa aparência em desktop.** `max-w-md mx-auto` para mobile-first content; telas de resultado com `min-h-screen` full-width colored bg.
- **Sem `<Footer />` nas telas gate.** Designs do Pencil não mostram footer.

## Endpoints consumidos

| Método | Rota | Auth | Retorna |
|--------|------|------|---------|
| `GET` | `/events?date=today` | JWT cookie + `GATE`/`ADMIN` | `{ items: EventItem[], page, totalPages, totalResults }` |
| `GET` | `/events/:id` | público | `EventDetailResponse` (usado no loader do scan) |
| `POST` | `/tickets/validate` | JWT cookie + `GATE`/`ADMIN` | `ValidateTicketResponse` |

> O campo `manualEntryCode` (string combinada `shortId-manualCode`) é enviado no body do POST /tickets/validate. O campo `signature` é enviado quando o QR é escaneado.

## Estrutura de arquivos — Criar

```
apps/frontend/src/
├── features/gate/
│   ├── api.ts                                    # getTodayEvents, validateTicket (httpClient)
│   ├── queries.ts                                # todayEventsOptions (queryOptions)
│   ├── hooks/
│   │   ├── use-today-events.ts                   # useQuery(todayEventsOptions)
│   │   └── use-validate-ticket.ts                # useMutation(validateTicket)
│   └── components/
│       ├── gate-header.tsx                        # "guichê" + shield-check + "Portaria" badge
│       ├── gate-event-card.tsx                    # Card de evento (branco, border, rounded)
│       ├── qr-scanner.tsx                         # Wrapper Html5QrcodeScanner
│       ├── manual-entry.tsx                       # Input manual + botão "Validar"
│       └── validation-result.tsx                  # Overlay full-screen resultado
├── routes/_authenticated/
│   ├── portaria.tsx                               # /portaria — lista de eventos
│   └── portaria.$eventId.validar.tsx              # /portaria/$eventId/validar — scan + resultado
```

### `src/features/gate/api.ts`

```ts
import { httpClient } from '@/lib/http-client';
import type {
  PaginatedEventResult,
  ValidateTicketRequest,
  ValidateTicketResponse,
} from '@elite-dev/shared';

export async function getTodayEvents(): Promise<PaginatedEventResult> {
  const { data } = await httpClient.get<PaginatedEventResult>('/events', {
    params: { date: 'today' },
  });
  return data;
}

export async function validateTicket(
  payload: ValidateTicketRequest,
): Promise<ValidateTicketResponse> {
  const { data } = await httpClient.post<ValidateTicketResponse>(
    '/tickets/validate',
    payload,
  );
  return data;
}
```

### `src/features/gate/queries.ts`

```ts
import { queryOptions } from '@tanstack/react-query';
import { getTodayEvents } from './api';

export const todayEventsOptions = queryOptions({
  queryKey: ['gate', 'events', 'today'],
  queryFn: getTodayEvents,
});
```

### `src/features/gate/hooks/use-today-events.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { todayEventsOptions } from '../queries';

export function useTodayEvents() {
  return useQuery(todayEventsOptions);
}
```

### `src/features/gate/hooks/use-validate-ticket.ts`

```ts
import { useMutation } from '@tanstack/react-query';
import { validateTicket } from '../api';
import type { ValidateTicketRequest } from '@elite-dev/shared';

export function useValidateTicket() {
  return useMutation({
    mutationFn: (data: ValidateTicketRequest) => validateTicket(data),
  });
}
```

### `src/features/gate/components/gate-header.tsx`

Header minimalista para telas gate. Props: `{ className?: string }`.

- Container: `flex h-16 items-center justify-between bg-surface px-8` (mesmo do Navbar).
- Esquerda: texto "guichê" (`text-[22px] font-bold text-ink`).
- Direita: flex row com ícone `ShieldCheck` (lucide, 18px, fill `#9B2531`) + texto "Portaria" (`text-[13px] font-semibold text-[#9B2531]`).

### `src/features/gate/components/gate-event-card.tsx`

Card de evento clicável. Props: `{ event: EventItem; onSelect: () => void }`.

- Container: `w-full rounded-md border border-[#D8D2C4] bg-white p-5 vertical gap-2 cursor-pointer transition-colors hover:bg-muted`.
- Nome: `text-[18px] font-semibold text-ink`.
- Meta: ícone `Clock` (lucide, 14px, `text-muted-foreground`) + `{formatTime(event.date)} · {event.location}` (`text-[14px] text-muted-foreground`).

### `src/features/gate/components/qr-scanner.tsx`

Wrapper de `Html5QrcodeScanner`. Props: `{ eventId: string; onScan: (id: string, sig: string) => void; enabled: boolean }`.

- Container: `relative w-full overflow-hidden rounded-md bg-[#1A0A0F]`.
- `useEffect` (mount): criar `Html5QrcodeScanner` no div ref, com config:
  ```ts
  {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    rememberLastUsedCamera: true,
    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
  }
  ```
- `onScanSuccess(decodedText)`: `JSON.parse(decodedText)` → extrair `{ v, id, sig }` → chamar `onScan(id, sig)`.
- `onScanFailure`: ignorar (chamado a cada frame sem código).
- Cleanup: `scanner.clear()` no unmount.
- Quando `enabled` muda para `false`: `scanner.pause(true)` (freeze video). Quando `true`: `scanner.resume()`.
- Erro de permissão (`NotAllowedError`): mostrar mensagem "Câmera indisponível. Use a entrada manual abaixo." com ícone `CameraOff`.

### `src/features/gate/components/manual-entry.tsx`

Input manual + botão. Props: `{ eventId: string; onSubmit: (manualEntryCode: string) => void; disabled: boolean }`.

- Container: `flex flex-col gap-2 px-4 py-3`.
- Label: "Ou digite o código manualmente" (`text-[13px] text-muted-foreground`).
- Row: `flex gap-2`.
  - Input: `flex-1 rounded-md border border-line bg-white px-3 py-2 font-mono text-[15px] tracking-wider uppercase placeholder:text-[#A89E8E] placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-curtain` (placeholder: "Código do ingresso").
  - Botão "Validar": `rounded-md bg-curtain px-5 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-curtain-hover disabled:opacity-50`.
- `onSubmit`: enviar `inputValue.replace(/[^A-Z0-9]/gi, '').toUpperCase()` (stripar hífen, uppercase).

### `src/features/gate/components/validation-result.tsx`

Overlay full-screen. Props: `{ result: ValidateTicketResponse; eventName: string; onNext: () => void; onBack: () => void }`.

- Container: `fixed inset-0 z-50 flex flex-col` com bg condicional:
  - VALID: `bg-[#3F7A55]`
  - ALREADY_USED / INVALID / WRONG_EVENT: `bg-[#9B2531]`
- **Top bar**: `flex items-center justify-between px-6 py-6`.
  - Back arrow: `text-white cursor-pointer` → `onBack()`. Ícone `ArrowLeft` (24px).
  - Event name: `text-white text-[15px] font-medium`.
- **Centro**: `flex flex-1 flex-col items-center justify-center gap-4 px-6`.
  - Ícone: 96px, branco.
    - VALID: `CircleCheckBig` (lucide)
    - ALREADY_USED / INVALID / WRONG_EVENT: `CircleX` (lucide)
  - Título: `text-[28px] font-bold text-white text-center`.
    - VALID: "Ingresso válido"
    - ALREADY_USED: "Ingresso já utilizado"
    - INVALID: "Ingresso inválido"
    - WRONG_EVENT: "Este ingresso é de outro evento"
  - Subtítulo: `text-[17px] text-white/80 text-center`.
    - VALID: `{result.holderName} · {result.ticketLabel}`
    - ALREADY_USED: `Usado às {formatTime(result.usedAt)}`
    - INVALID: "A assinatura não confere"
    - WRONG_EVENT: `{result.ticketEventName}`
- **Bottom**: `px-6 pb-8`.
  - Botão "Validar próximo": `w-full rounded-md bg-white px-6 py-4 text-[17px] font-semibold text-ink transition-colors hover:bg-muted cursor-pointer` → `onNext()`.

### `src/routes/_authenticated/portaria.tsx`

Rota `/portaria` — lista de eventos de hoje.

```ts
import { createFileRoute, redirect } from '@tanstack/react-router';
import { GateHeader } from '@/features/gate/components/gate-header';
import { GateEventCard } from '@/features/gate/components/gate-event-card';
import { useTodayEvents } from '@/features/gate/hooks/use-today-events';
import { todayEventsOptions } from '@/features/gate/queries';
import { meQueryOptions } from '@/features/auth/queries';
import { CalendarX } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/portaria')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (user?.role !== 'GATE' && user?.role !== 'ADMIN') {
      throw redirect({ to: '/' });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(todayEventsOptions);
  },
  component: PortariaComponent,
});

function PortariaComponent() {
  const { data } = useTodayEvents();
  const events = data?.items ?? [];
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F4F0]">
      <GateHeader />
      <main className="flex w-full max-w-md flex-1 flex-col px-4 py-6">
        <h1 className="text-[24px] font-bold text-ink">Eventos de hoje</h1>
        <p className="mt-2 text-[14px] text-muted-foreground capitalize">{dateStr}</p>

        {events.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-4 rounded-md bg-white border border-[#D8D2C4] p-8">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <CalendarX className="size-7 text-muted-foreground" />
            </div>
            <p className="text-[16px] text-ink">Nenhum evento programado para hoje.</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {events.map((event) => (
              <GateEventCard
                key={event.id}
                event={event}
                onSelect={() => {/* navigate to /portaria/$eventId/validar */}}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

### `src/routes/_authenticated/portaria.$eventId.validar.tsx`

Rota `/portaria/$eventId/validar` — scan + resultado.

```ts
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { GateHeader } from '@/features/gate/components/gate-header';
import { QrScanner } from '@/features/gate/components/qr-scanner';
import { ManualEntry } from '@/features/gate/components/manual-entry';
import { ValidationResult } from '@/features/gate/components/validation-result';
import { useValidateTicket } from '@/features/gate/hooks/use-validate-ticket';
import { eventDetailOptions } from '@/features/events/queries';
import { meQueryOptions } from '@/features/auth/queries';
import type { ValidateTicketResponse } from '@elite-dev/shared';

export const Route = createFileRoute(
  '/_authenticated/portaria/$eventId/validar',
)({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (user?.role !== 'GATE' && user?.role !== 'ADMIN') {
      throw redirect({ to: '/' });
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(eventDetailOptions(params.eventId));
  },
  component: ValidarComponent,
});

function ValidarComponent() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { data: event } = useEventDetail(eventId);
  const validate = useValidateTicket();

  const [result, setResult] = useState<ValidateTicketResponse | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(true);

  function handleScan(id: string, sig: string) {
    setScannerEnabled(false);
    validate.mutate(
      { publicId: id, signature: sig, expectedEventId: eventId },
      { onSuccess: (res) => setResult(res) },
    );
  }

  function handleManualSubmit(code: string) {
    setScannerEnabled(false);
    validate.mutate(
      { manualEntryCode: code, expectedEventId: eventId },
      { onSuccess: (res) => setResult(res) },
    );
  }

  function handleNext() {
    setResult(null);
    setScannerEnabled(true);
  }

  if (result) {
    return (
      <ValidationResult
        result={result}
        eventName={event?.name ?? ''}
        onNext={handleNext}
        onBack={() => navigate({ to: '/portaria' })}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F4F0]">
      <header className="flex h-16 items-center gap-4 bg-surface px-4">
        <button onClick={() => navigate({ to: '/portaria' })}>
          <ArrowLeft className="size-6 text-ink" />
        </button>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-ink">{event?.name}</span>
          <span className="text-[13px] text-muted-foreground">
            {event && `${formatTime(event.date)} · ${event.location}`}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <QrScanner
          eventId={eventId}
          onScan={handleScan}
          enabled={scannerEnabled}
        />
        <ManualEntry
          eventId={eventId}
          onSubmit={handleManualSubmit}
          disabled={validate.isPending}
        />
      </main>
    </div>
  );
}
```

## Estrutura de arquivos — Modificar

### `src/routes/index.tsx` — Guard GATE → redirect `/portaria`

Adicionar `beforeLoad` antes do `loader`:

```ts
beforeLoad: async ({ context }) => {
  const user = await context.queryClient.ensureQueryData(meQueryOptions);
  if (user?.role === 'GATE') {
    throw redirect({ to: '/portaria' });
  }
},
```

> Importar `meQueryOptions` de `@/features/auth/queries` e `redirect` de `@tanstack/react-router`.

### `src/routes/_authenticated.tsx` — Confinar GATE a `/portaria*`

No `beforeLoad` existente, após o check `!user`, adicionar:

```ts
if (user.role === 'GATE' && !location.pathname.startsWith('/portaria')) {
  throw redirect({ to: '/portaria' });
}
```

### `src/components/navbar.tsx` — Handling defensivo GATE

Mudar a seleção de links:

```ts
const gateLinks: { label: string; href: string }[] = [];
const links =
  role === 'ORGANIZER' ? organizerLinks
  : role === 'GATE' ? gateLinks
  : clientLinks;
```

### `src/features/tickets/components/ticket-detail-card.tsx` — Exibir código manual

Dentro do bloco `hasQr && (...)`, após o `<QRCodeSVG>` box, adicionar:

```tsx
<div className="my-1 h-px bg-line" />
<p className="text-center text-[13px] text-muted-foreground">
  Código para entrada manual
</p>
<p className="text-center font-mono text-[18px] font-semibold tracking-[0.15em] text-ink">
  {(ticket as PaymentApprovedResponse).shortId}-
  {(ticket as PaymentApprovedResponse).manualCode}
</p>
```

## Arquivos a criar/modificar (consolidado)

### Criar
- `src/features/gate/api.ts`
- `src/features/gate/queries.ts`
- `src/features/gate/hooks/use-today-events.ts`
- `src/features/gate/hooks/use-validate-ticket.ts`
- `src/features/gate/components/gate-header.tsx`
- `src/features/gate/components/gate-event-card.tsx`
- `src/features/gate/components/qr-scanner.tsx`
- `src/features/gate/components/manual-entry.tsx`
- `src/features/gate/components/validation-result.tsx`
- `src/routes/_authenticated/portaria.tsx`
- `src/routes/_authenticated/portaria.$eventId.validar.tsx`

### Modificar
- `src/routes/index.tsx` (guard GATE → redirect `/portaria`)
- `src/routes/_authenticated.tsx` (confinar GATE)
- `src/components/navbar.tsx` (gateLinks vazio)
- `src/features/tickets/components/ticket-detail-card.tsx` (exibir shortId-manualCode)

## Convenções

- Imports cross-feature: `@/features/...`, `@/components/...`, `@/lib/...` (alias `@/*`).
- Imports dentro da feature: relativos `./`, `../`.
- `import type` para type-only imports (`verbatimModuleSyntax` ativo).
- Sem comentários no código.
- Tokens de tema: `bg-paper`, `bg-surface`, `text-ink`, `border-line`, `text-muted-foreground`, `bg-curtain`. Cores do gate usam valores arbitrários (`bg-[#3F7A55]`, `bg-[#9B2531]`, `bg-[#1A0A0F]`, `border-[#D8D2C4]`).
- Ícones: `lucide-react` (`ShieldCheck`, `CalendarX`, `ArrowLeft`, `Clock`, `CircleCheckBig`, `CircleX`, `CameraOff`).
- Primitivos: reusar `Button`/`Input` de `@/components/ui` quando aplicável; hand-roll componentes específicos do gate com `cn`+Tailwind.

## Verificação (em `apps/frontend`)

1. `npm run lint`
2. `npm run build` (`tsc -b && vite build`) — `tsc -b` é o typecheck.

### Teste manual
- Login como GATE → redirect automático para `/portaria`.
- `/portaria` mostra eventos de hoje (ou empty state se nenhum).
- Clicar em evento → `/portaria/$eventId/validar` com camera viewfinder.
- Scan QR → resultado valid (verde) / used (vermelho) / invalid / wrong_event.
- Entrada manual → digitar código `XXXXXXXX-XXXXXXXX` → resultado.
- "Validar próximo" → reseta para camera.
- HOME (`/`) com user GATE → redirect para `/portaria`.
- Rota não-portaria com user GATE → redirect para `/portaria`.

## Próxima fase
- Stage 2: possíveis melhorias (feedback de loading/erro, retry de camera, zoom controls).
