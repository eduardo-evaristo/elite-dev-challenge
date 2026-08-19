# Movie session aggregation — EventsModule

## Context

`apps/backend/src/events/` expõe `GET /events`, `GET /events/:id`, `POST /events`,
`PATCH /events/:id`, `DELETE /events/:id` (`events.controller.ts:23-66`), incluindo
`GET /events?type=MOVIE` para listar filmes. Esse endpoint devolve **um registro por
`Event`** (por sessão), não deduplicado por filme.

Faltam dois endpoints que agrupam múltiplos `Event` que compartilham o mesmo
`externalId` (sessões de um mesmo filme em cinemas/horários diferentes) numa página só,
em vez de cada sessão aparecer como card separado.

`GET /events?type=MOVIE` **continua existindo** e servindo consumidores que precisam
ver cada sessão individualmente (ex.: painel do organizador).

## Decisions (resolved)

- **Filtro de data**: nos dois endpoints novos, filtrar `date >= now()`
  (`date: { gte: new Date() }`) em conjunto com `type: MOVIE` + `status: PUBLISHED`.
  - `GET /events/movies`: filme sem nenhuma sessão futura **simplesmente não aparece**
    (ausência esperada, não erro).
  - `GET /events/movies/:externalId/sessions`: se não sobrar nenhuma sessão futura
    publicada para aquele `externalId`, retorna **404** (mesmo critério de "não há nada
    pra ver" — equivalente a `externalId` inexistente do ponto de vista do cliente).
  - `GET /events` genérico **não** recebe esse filtro (o painel do organizador precisa
    ver eventos passados para gestão/histórico).
- **Paginação**: `GET /events/movies` é paginado como `GET /events`, retornando
  `{ items, page, totalPages, totalResults }`. `totalResults` = contagem de
  `externalId` distintos (filmes), não de `Event`s.
- **Agregação em memória**: o dataset de eventos publicados é pequeno; `groupBy` do
  Prisma não devolve colunas completas de cada linha, então faz-se `findMany` com o
  filtro e agrupa em memória no service. Sem query SQL complexa.

## Endpoint 1 — `GET /events/movies`

Lista de filmes para a home, **um card por filme**.

- Filtra `Event` com `type: MOVIE`, `status: PUBLISHED`, `date >= now()`.
- Agrupa por `externalId` — um grupo vira **uma** entrada na resposta.
- Dados exibidos (nome, imagem, descrição) vêm de qualquer `Event` do grupo (esses
  campos vêm do catálogo na criação e nunca são editados livremente pelo organizador).
- Resposta por item: `externalId` (para FE linkar `/filmes/:externalId`), `name`,
  `imageUrl`, `description`, `eventClassification`, `duration`,
  `nextSessionDate` (MIN(date) do grupo, ISO string, critério de ordenação — filmes com
  sessão mais próxima primeiro) e `sessionCount` (nº de sessões do grupo).
- Ordena asc por `nextSessionDate`; pagina a lista de grupos em memória.

## Endpoint 2 — `GET /events/movies/:externalId/sessions`

Página agregada de um filme específico.

- Busca `Event` com `externalId` = rota, `type: MOVIE`, `status: PUBLISHED`,
  `date >= now()`.
- Se vazio → `404`.
- Resposta: dados do filme (`externalId`, `name`, `imageUrl`, `description`,
  `eventClassification`, `duration`) + `sessionsByLocation: { location, sessions:
  { id, date }[] }[]`, sessões ordenadas por `date` asc dentro de cada `location`.

## O que NÃO fazer

- Não filtrar por `externalSource` no path/query — `type: MOVIE` já implica
  `externalSource: TMDB` no domínio atual.
- Não criar terceira rota nem duplicar lógica: os dois endpoints compartilham um
  método privado no service (`groupPublishedMoviesByExternalId`) que busca e agrupa.
  Endpoint 2 = endpoint 1 restrito a um grupo só.
- Não alterar `GET /events` existente.

## Changes

### `events.repository.ts`
Adicionar método específico e intencional (segue o padrão de `UsersRepository`
`findByEmail`/`findById`, que encapsula a query Prisma):
```ts
findPublishedMoviesFrom(now: Date, externalId?: string): Promise<EventModel[]> {
  return this.prisma.event.findMany({
    where: {
      type: 'MOVIE',
      status: 'PUBLISHED',
      date: { gte: now },
      ...(externalId && { externalId }),
    },
  });
}
```
Não usar `findManyByWhere(where)` genérico (vazaria sintaxe Prisma para o service).

### `events.service.ts`
- **Privado** `groupPublishedMoviesByExternalId(externalId?: string)`:
  chama `findPublishedMoviesFrom(new Date(), externalId)` e agrupa em memória por
  `externalId` → `Map<string, EventData[]>`.
- `findMovies(query: QueryMoviesDto)`: itera o map → `MovieItem` por grupo → ordena
  asc por `nextSessionDate` → pagina em memória → `{ items, page, totalPages,
  totalResults }` (`totalResults` = nº de grupos).
- `findMovieSessions(externalId)`: grupo filtrado; se vazio → `NotFoundException`.
  Retorna dados do filme + `sessionsByLocation`.
- Interfaces inline (`MovieItem`, `MovieSessionItem`, `MovieSessionsResponse`) e
  mappers que convertem `Date` → ISO (sem `any`). O service só contém lógica de
  negócio (agrupar, MIN(date), ordenar, paginar); sintaxe Prisma fica no repository.

### `events/dto/query-movies.dto.ts` (novo)
`QueryMoviesDto` mínimo: `page` (default 1, min 1) + `size` (default 20, min 1, max 50),
mesmos decorators de `query-events.dto.ts`. Sem `type`/`query` (type fixo em MOVIE).

### `events.controller.ts`
Adicionar **antes** de `@Get(':id')` (ordem de rota importa — senão `movies` casaria
com `:id`):
```ts
@Get('movies')
findMovies(@Query() query: QueryMoviesDto) {
  return this.eventsService.findMovies(query);
}

@Get('movies/:externalId/sessions')
findMovieSessions(@Param('externalId') externalId: string) {
  return this.eventsService.findMovieSessions(externalId);
}
```
Ambos públicos (sem guards), consistente com `findAll`/`findOne`.

## Verification
`npx prisma generate` → `npm run lint` → `npm test` → `npm run build` (de `apps/backend`).
