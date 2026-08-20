# Plano: Home com dados reais via TanStack Router loader + infinite query

## Decisões

- **Endpoint da home**: `GET /events?type=movie|show` (público, retorna `EventItem` de eventos `PUBLISHED` com `ticketTypes`) — em vez de `GET /catalog` que exige auth `ORGANIZER`/`ADMIN` e retorna `CatalogItem` (TMDB/Ticketmaster raw). Combina com "em cartaz" + "comprar ingresso" para usuários não autenticados.
- **Estrutura de pastas**: estender `features/events/` com list/detail (API + queries + hooks) e manter `features/home/` só com componentes de UI da home. A rota `index.tsx` fica fina (loader + composição).
- **Hero estático**: os slides permanecem hardcoded em `features/home/constants.ts`, sem query. Fase futura pode torná-lo data-driven se surgir um campo "destaque" no backend.
- **Infinite query com sentinela horizontal**: usar `useInfiniteQuery` + `IntersectionObserver` com `rootMargin` lateral para buscar a próxima página quando o usuário_scrollar_ (via setas `>` ou drag) até perto do fim da row.
- **Loader**: usar `ensureInfiniteQueryData` no `loader` da rota para pré-carregar a página 1 de ambas as queries (movie + show) em paralelo antes de renderizar — sem flash de loading na carga inicial.
- **`useInfiniteQuery` (não `useSuspenseInfiniteQuery`)**: consistente com o padrão existente em `step-catalog.tsx`. O loader garante o dado no cache antes de renderizar.
- **Formatação de data ISO**: `EventItem.date` é ISO timestamp completo (`event.date.toISOString()`). A função `formatDateForDisplay` existente foi feita para strings date-only (`YYYY-MM-DD`) e quebra com ISO. Adicionar `formatEventDate(isoDate)` em `datetime.ts` com o mesmo output textual (sem hora), mas fazendo `new Date(iso)` direto — timezone-safe.
- **Sem `errorComponent` na rota `/`** (por enquanto): se `/events` falhar no loader, o erro borbulha pro error boundary padrão do router.
- **Sem loading states visuais para `isFetchingNextPage`** (por enquanto): a sentinela busca a próxima página silenciosamente.
- **Componentes compartilhados permanecem em `src/components/`**: `navbar.tsx` (home + wizard), `movie-card.tsx` / `event-card.tsx` (home + `step-catalog`), `ui/*` (primitivos shadcn).

## Endpoint consumido

| Método | Rota | Auth | Retorna |
|--------|------|------|---------|
| `GET` | `/events?type=movie\|show&page=&size=` | público | `PaginatedEventResult` |

> **Nota de tipo**: o shared `QueryEventsParams.type` é tipado como `EventType` (`'MOVIE' \| 'SHOW'`) mas o backend `QueryEventsDto` aceita lowercase (`'movie' \| 'show'`). A função de API tipa o parâmetro como `'movie' \| 'show'` (= `CatalogType`), alinhado ao DTO real do backend.

## Mapeamento `EventItem` → cards

### `EventItem` → `MovieCard`

| `EventItem` | `MovieCard` prop |
|-------------|------------------|
| `name` | `title` |
| `imageUrl` | `posterUrl` |
| `duration` + `eventClassification` | `meta` = `\`${formatDuration(duration)} · ${eventClassification}\`` |

### `EventItem` → `EventCard`

| `EventItem` | `EventCard` prop |
|-------------|------------------|
| `name` | `title` |
| `imageUrl` | `posterUrl` |
| `date` | `date` = `formatEventDate(date)` |
| `location` | `venue` |
| `eventClassification` | `category` |

## Estrutura de arquivos — Fase 1 (restructure, commit isolado)

### Mover

| De | Para |
|----|------|
| `src/components/hero.tsx` | `src/features/home/components/hero.tsx` |
| `src/components/footer.tsx` | `src/features/home/components/footer.tsx` |
| `src/components/section-header.tsx` | `src/features/home/components/section-header.tsx` |

### Permanecem em `src/components/` (compartilhados)

- `navbar.tsx` — usado pela home + wizard `novo.tsx`
- `movie-card.tsx` / `event-card.tsx` — usados pela home + `step-catalog.tsx`
- `ui/*` — primitivos shadcn

### Criar

```
src/features/home/
├── types.ts          # HeroSlide (extraído de mock-home.ts)
├── constants.ts      # heroSlides hardcoded (Hero estático)
├── mocks.ts          # TEMPORÁRIO: MockMovie, MockEvent, mockMovies, mockEvents (deletado na Fase 3)
└── components/
    ├── hero.tsx
    ├── footer.tsx
    └── section-header.tsx
```

### Modificar

- `src/routes/index.tsx` — atualizar imports para `@/features/home/components/...` e `@/features/home/constants`; mantém `@/components/navbar`, `@/components/movie-card`, `@/components/event-card`

### Deletar

- `src/data/mock-home.ts` (conteúdo redistribuído nos arquivos acima)
- `src/data/` se ficar vazio

## Estrutura de arquivos — Fase 2 (data layer + util)

### `src/features/events/api.ts` (adicionar ao arquivo existente)

```ts
export async function listEvents(params: {
  type: 'movie' | 'show';
  page?: number;
  size?: number;
  query?: string;
}): Promise<PaginatedEventResult> {
  const { data } = await httpClient.get<PaginatedEventResult>('/events', {
    params: {
      type: params.type,
      page: params.page ?? 1,
      size: params.size ?? 20,
      query: params.query,
    },
  });
  return data;
}
```

### `src/features/events/queries.ts` (novo — infinite query)

```ts
import { infiniteQueryOptions } from '@tanstack/react-query';
import type { CatalogType } from '@elite-dev/shared';
import { listEvents } from './api';

const PAGE_SIZE = 20;

export function eventsInfiniteListOptions(type: CatalogType) {
  return infiniteQueryOptions({
    queryKey: ['events', 'list', type],
    queryFn: ({ pageParam }) =>
      listEvents({ type, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}
```

### `src/features/events/hooks/use-events-list.ts` (novo)

```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import type { CatalogType } from '@elite-dev/shared';
import { eventsInfiniteListOptions } from '../queries';

export function useEventsList(type: CatalogType) {
  return useInfiniteQuery(eventsInfiniteListOptions(type));
}
```

### `src/lib/datetime.ts` (adicionar função)

```ts
export function formatEventDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const formatted = d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    return formatted
      .replace(/\./g, '')
      .replace(/^./, (c) => c.toUpperCase());
  } catch {
    return isoDate;
  }
}
```

> Mesmo output de `formatDateForDisplay(dateOnly)` sem hora (ex: `"Sáb, 15 de mar"`), mas faz `new Date(iso)` direto — timezone-safe para ISO timestamps completos.

### `src/features/home/hooks/use-infinite-scroll.ts` (novo — sentinela horizontal)

```ts
import { useEffect, type RefObject } from 'react';

interface UseInfiniteScrollOptions {
  rootRef: RefObject<HTMLDivElement | null>;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  enabled: boolean;
  rootMargin?: string;
}

export function useInfiniteScroll({
  rootRef,
  sentinelRef,
  onLoadMore,
  enabled,
  rootMargin = '0px 300px 0px 0px',
}: UseInfiniteScrollOptions) {
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = rootRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && enabled) onLoadMore();
      },
      { root, rootMargin },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [rootRef, sentinelRef, onLoadMore, enabled, rootMargin]);
}
```

> `rootMargin` lateral (`0px 300px ...`) — dispara ~300px antes da sentinela entrar na viewport horizontal. Mesma técnica de `step-catalog.tsx`, adaptada para scroll horizontal.

## Estrutura de arquivos — Fase 3 (loader + wiring real)

### `src/routes/index.tsx` (modificar)

**Loader** (pré-carrega página 1 de ambas as queries em paralelo):

```ts
import { eventsInfiniteListOptions } from '@/features/events/queries';

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        eventsInfiniteListOptions('movie'),
      ),
      context.queryClient.ensureInfiniteQueryData(
        eventsInfiniteListOptions('show'),
      ),
    ]);
  },
  component: RouteComponent,
});
```

**Componente** — substituir mocks por hooks reais + sentinel scroll:

```ts
import { useEventsList } from '@/features/events/hooks/use-events-list';
import { useInfiniteScroll } from '@/features/home/hooks/use-infinite-scroll';
import { formatDuration, formatEventDate } from '@/lib/datetime';

// no componente:
const moviesQuery = useEventsList('movie');
const showsQuery = useEventsList('show');

const movies = moviesQuery.data?.pages.flatMap((p) => p.items) ?? [];
const shows = showsQuery.data?.pages.flatMap((p) => p.items) ?? [];

// sentinel hooks:
useInfiniteScroll({
  rootRef: moviesRef,
  sentinelRef: moviesSentinelRef,
  onLoadMore: () => moviesQuery.fetchNextPage(),
  enabled: moviesQuery.hasNextPage && !moviesQuery.isFetchingNextPage,
});
useInfiniteScroll({
  rootRef: eventsRef,
  sentinelRef: eventsSentinelRef,
  onLoadMore: () => showsQuery.fetchNextPage(),
  enabled: showsQuery.hasNextPage && !showsQuery.isFetchingNextPage,
});
```

**JSX** — sentinela no fim de cada row flex:

```tsx
{movies.map((item) => (
  <MovieCard
    key={item.id}
    title={item.name}
    meta={`${formatDuration(item.duration)} · ${item.eventClassification}`}
    posterUrl={item.imageUrl}
  />
))}
<div ref={moviesSentinelRef} className='h-1 w-1 shrink-0' />
```

```tsx
{shows.map((item) => (
  <EventCard
    key={item.id}
    title={item.name}
    date={formatEventDate(item.date)}
    venue={item.location}
    category={item.eventClassification}
    posterUrl={item.imageUrl}
  />
))}
<div ref={eventsSentinelRef} className='h-1 w-1 shrink-0' />
```

### Deletar

- `src/features/home/mocks.ts`

## Arquivos a modificar/criar (consolidado)

### Fase 1

- **Mover**: `src/components/hero.tsx` → `src/features/home/components/hero.tsx`
- **Mover**: `src/components/footer.tsx` → `src/features/home/components/footer.tsx`
- **Mover**: `src/components/section-header.tsx` → `src/features/home/components/section-header.tsx`
- **Criar**: `src/features/home/types.ts`
- **Criar**: `src/features/home/constants.ts`
- **Criar**: `src/features/home/mocks.ts` (temporário)
- **Modificar**: `src/routes/index.tsx` (imports)
- **Deletar**: `src/data/mock-home.ts` (e `src/data/` se vazio)

### Fase 2

- **Modificar**: `src/features/events/api.ts` (adicionar `listEvents`)
- **Criar**: `src/features/events/queries.ts`
- **Criar**: `src/features/events/hooks/use-events-list.ts`
- **Modificar**: `src/lib/datetime.ts` (adicionar `formatEventDate`)
- **Criar**: `src/features/home/hooks/use-infinite-scroll.ts`

### Fase 3

- **Modificar**: `src/routes/index.tsx` (loader + wiring real)
- **Deletar**: `src/features/home/mocks.ts`

## Commits

1. `refactor(frontend): move home-specific code into features/home/` — Fase 1 (restructure isolado)
2. `feat(frontend): wire home to real events data via infinite query loader` — Fases 2 + 3

## Convenções

- Imports cross-feature: `@/features/...`, `@/components/...`, `@/lib/...` (alias `@/*`)
- Imports dentro da feature: relativos `./`, `../`
- `import type` para type-only imports (`verbatimModuleSyntax` ativo)
- Sem comentários no código
- `queryOptions`/`infiniteQueryOptions` factories em `queries.ts`; hooks em `hooks/use-*.ts`; chamadas HTTP raw em `api.ts`
- Tipos de domínio de `@elite-dev/shared` quando existirem

## Verificação (em `apps/frontend`)

1. `npm run lint` → 2. `npm run build` (`tsc -b && vite build`)

### Teste manual (após Fase 3)

- Backend rodando + eventos `PUBLISHED` no banco (tipos `MOVIE` e `SHOW`)
- Home carrega sem flash de loading (loader pré-carregou página 1)
- Setas `>` _scrollam_ horizontalmente; ao chegar perto do fim, a sentinela dispara `fetchNextPage` (se `hasNextPage`)
- Cards de filme mostram `name`, `imageUrl`, `duration · classification`
- Cards de evento mostram `name`, `formatEventDate(date)`, `location`, `classification`, `imageUrl`
- Hero permanece estático (slides hardcoded)
