# React Frontend Skill

## Visao Geral

React 19 com Vite 8, TanStack Router (file-based routing), TanStack React Query (server state), Tailwind CSS 4, shadcn/ui.

## Convenções do Projeto

### Feature-Sliced Design

Cada dominio fica em `src/features/{feature}/`:

```
features/
  feature/
    api.ts          # Funcoes de chamada HTTP (axios)
    queries.ts      # QueryOptions (queryOptions, infiniteQueryOptions)
    schemas.ts      # Validacao com Zod
    types.ts        # Tipos locais (se necessario)
    hooks/
      use-*.ts      # useQuery, useMutation, useInfiniteQuery
    components/
      *.tsx         # Componentes especificos da feature
```

### Rotas (TanStack Router)

- Rotas sao arquivos em `src/routes/`
- `routeTree.gen.ts` e gerado automaticamente (nao editar)
- Layouts usam `_authenticated.tsx` como guard de rotas
- `beforeLoad` faz prefetch de dados antes do render

```typescript
// Loader com prefetch
beforeLoad: async ({ location, context }) => {
  const user = await context.queryClient.ensureQueryData(meQueryOptions);
  if (!user) throw redirect({ to: '/login', search: { redirect: location.href } });
},
```

### Estado de URL (URL-as-State)

Wizard e checkout armazenam estado em URL search params:

```typescript
// Validacao com Zod
const eventCreateSearchSchema = z.object({
  step: z.coerce.number().default(1),
  type: z.enum(['movie', 'show']).optional(),
  externalId: z.string().optional(),
  // ...
});

// Uso no componente
const [{ step, type }] = useSearch({ from: '/organizador/eventos/novo' });
```

Isso torna cada passo bookmarkable e o botao voltar funciona naturalmente.

### Data Fetching

**QueryOptions pattern:** centralize definicoes de queries em `queries.ts`:

```typescript
export const eventDetailOptions = (id: string) =>
  queryOptions({
    queryKey: ['events', 'detail', id],
    queryFn: () => getEventDetail(id),
  });
```

**Loader pattern:** carregue dados antes do render:

```typescript
loader: async ({ context }) => {
  await context.queryClient.ensureQueryData(eventDetailOptions(id));
},
```

**Invalidation:** invalidate queries apos mutacoes bem-sucedidas:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['me'] });
},
```

### HTTP Client

Axios instance em `src/lib/http-client.ts`:
- `baseURL` de `VITE_API_URL`
- `withCredentials: true` (envia cookies httpOnly)
- Vite proxy redireciona `/api/*` para o backend

### Componentes

- **shadcn/ui:** Button, Input, Badge, DropdownMenu (com Radix UI)
- **Componentes custom:** navbar, movie-card, event-card, hero, footer
- **CVA (class-variance-authority):** para variantes de Button e Badge
- **`cn()` utility:** clsx + tailwind-merge para composicao de classes

### Forms

React Hook Form + Zod:

```typescript
const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
const form = useForm({ resolver: zodResolver(schema) });
```

### Infinite Scroll

Hook customizado `useInfiniteScroll` com IntersectionObserver:

```typescript
const { ref } = useInfiniteScroll({ fetchNextPage, hasNextPage, isFetchingNextPage });
// <div ref={ref} /> <!-- sentinel element -->
```

## Arquivos de Referencia

- Entry: `apps/frontend/src/main.tsx`
- HTTP client: `apps/frontend/src/lib/http-client.ts`
- Routes: `apps/frontend/src/routes/`
- Features: `apps/frontend/src/features/`
- UI components: `apps/frontend/src/components/ui/`
- Shared components: `apps/frontend/src/components/` (navbar, cards)
- Design tokens: `apps/frontend/src/index.css`

## Comandos

```bash
cd apps/frontend
npm run dev       # Vite dev server (porta 5173)
npm run build     # tsc -b && vite build (typecheck incluido)
npm run lint      # ESLint
npm run preview   # Preview do build
```
