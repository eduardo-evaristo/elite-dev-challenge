# Plan: Event Catalog Denormalization Fields

## Overview

Adicionar 4 campos ao modelo `Event` para denormalizar dados do catálogo externo (TMDB / Ticketmaster) no nosso banco de dados. Motivo: evitar bater em rate limits das APIs externas a cada renderização e ter os dados persistidos localmente.

Os campos sao:

| Campo | Schema | Filmes (TMDB) | Shows (Ticketmaster) |
|---|---|---|---|
| `imageUrl` | `String?` | poster do TMDB | imagem do Ticketmaster |
| `eventClassification` | `String` (obrigatorio) | certification do TMDB (ex: "14", "L") pre-preenchido; user pode trocar | user digita manualmente (ex: "Livre", "18") |
| `description` | `String?` | overview do TMDB por default; user pode trocar | user define livremente |
| `duration` | `Int` (obrigatorio) | runtime do TMDB pre-preenchido; user pode trocar | user define livremente |

A logica de pre-preenchimento (filmes) vs entrada manual (shows) fica no FE. O BE apenas persiste o que recebe, com validacao de obrigatoriedade para `eventClassification` e `duration`.

---

## Research Summary (via Context7)

### TMDB — Classificacao etaria (certification)

- **`GET /movie/{movie_id}/release_dates`** — Retorna datas de estreia + `certification` por pais (`iso_3166_1`). Ex: `{ "iso_3166_1": "BR", "certification": "14" }`.
- **`GET /certification/movie/list`** — Lista todas as certificacoes oficiais suportadas, agrupadas por pais (cada item com `certification` + `meaning`). Ex. BR: `L, 10, 12, 14, 16, 18`; US: `G, PG, PG-13, R, NC-17`.
- **`/trending/movie/week`** e **`/search/movie`** (listagem): **Nao** retornam `certification`. Nao suportam `append_to_response`.
- **`/movie/{id}`** (detalhe): suporta `append_to_response=release_dates` para trazer certificacao sem chamada extra.

### TMDB — Duracao (runtime)

- **Listagem** (`/trending/movie/week`, `/search/movie`): **Nao** vem `runtime`.
- **Detalhe** (`/movie/{id}`): campo `runtime` (int, minutos). Ja mapeado em `TmdbMovieDetail.runtime` e exposto em `CatalogItemDetail.runtime`.

### TMDB — Descricao (overview)

- **Listagem e detalhe**: campo `overview` sempre presente. Ja mapeado em `CatalogItem.overview`.

### Ticketmaster — "Classification" é categoria, NAO classificacao etaria

- O endpoint `/discovery/v2/classifications` retorna uma taxonomia de 3 niveis: **Segment** (ex: `Film`, `Music`) > **Genre** (ex: `Rock`, `Drama`) > **Subgenre**. **Nao há campo de faixa etária/restricão de idade** no modelo do Ticketmaster Discovery API.
- Conclusao: shows precisarao de `eventClassification` inserida manualmente pelo organizer.

### Ticketmaster — Duracao

- **Nao há campo `duration` ou `runtime`**. O objeto `dates` tem `start.dateTime` e `end.dateTime` (opcional, frequentemente `null`). Calcular `end - start` é inviavel na pratica.
- Conclusao: shows precisarao de `duration` inserida manualmente pelo organizer.

### Ticketmaster — Descricao

- Campos `info` (string, frequentemente `null`) e `pleaseNote` (string, frequentemente `null`). Ja mapeado: `info` -> `CatalogItem.overview`. `pleaseNote` nao é capturado hoje.
- Conclusao: descricao de eventos é ampla e inconsistente; o organizer deve poder definir livremente.

---

## Decisions

### 1. Denormalizar para evitar rate limits

Os dados do catálogo (imageUrl, classification, description, duration) sao buscados uma vez no momento de criacao do evento e persistidos no `Event`. O FE faz a busca no catalogo, pre-preenche os campos (filmes) ou deixa em branco (shows), e envia tudo no `POST /events`. O BE nao consulta as APIs externas ao listar/detalhar eventos — le direto do banco.

### 2. `eventClassification` obrigatorio para ambos os tipos

Filmes: o FE pre-preenche com a `certification` do TMDB (filtrando `iso_3166_1 === 'BR'`); o organizer pode trocar. Shows: o organizer digita manualmente (ex: "Livre", "18"). O BE rejeita criacao sem `eventClassification` (400).

### 3. `duration` obrigatorio para ambos os tipos

Filmes: o FE pre-preenche com `runtime` do TMDB; o organizer pode trocar. Shows: o organizer digita manualmente. O BE rejeita criacao sem `duration` (400).

### 4. `imageUrl` e `description` opcionais

`imageUrl` é nullable pois alguns itens do catalogo podem nao ter poster. `description` é nullable pois o organizer pode optar por nao preencher (especialmente em shows).

### 5. Pre-preenchimento é responsabilidade do FE

O BE nao enforce a origem dos campos — apenas valida obrigatoriedade (`eventClassification`, `duration`) e persiste. A logica de "filmes trazem X do TMDB, shows deixam em branco" fica no wizard do FE (steps 3-5, ainda nao implementados).

### 6. `certification` adicionado ao `CatalogItemDetail`

Para o FE poder pre-preencher `eventClassification`, o endpoint `GET /catalog/movie/:externalId` (detalhe) deve retornar a certification. Isso é feito via `append_to_response=release_dates` no TMDB provider, filtrando `iso_3166_1 === 'BR'`.

### 7. Todos os 4 campos editaveis via PATCH

O `UpdateEventDto` permite editar os 4 campos (junto com `name`, `date`, `location`, `status` que ja existem). O organizer pode corrigir imagem, classificacao, descricao ou duracao apos a criacao.

---

## Schema Changes

### `apps/backend/prisma/schema.prisma` — model `Event`

Adicionar 4 campos:

```prisma
model Event {
  // ... campos existentes ...
  imageUrl            String?
  eventClassification String
  description         String?
  duration            Int
  // ... relacoes existentes ...
}
```

### Migration

```bash
npx prisma migrate dev --name add_event_catalog_fields
npx prisma generate
```

---

## Shared Types Changes

### `packages/shared/src/index.ts`

**`CreateEventRequest`** — adicionar:

```ts
export interface CreateEventRequest {
  // ... campos existentes ...
  imageUrl?: string;
  eventClassification: string;
  description?: string;
  duration: number;
}
```

**`UpdateEventRequest`** — adicionar:

```ts
export interface UpdateEventRequest {
  // ... campos existentes ...
  imageUrl?: string;
  eventClassification?: string;
  description?: string;
  duration?: number;
}
```

**`EventItem`** — adicionar:

```ts
export interface EventItem {
  // ... campos existentes ...
  imageUrl: string | null;
  eventClassification: string;
  description: string | null;
  duration: number;
}
```

(`EventDetailResponse` herda de `EventItem`, pega os campos automaticamente.)

**`CatalogItemDetail`** — adicionar `certification`:

```ts
export interface CatalogItemDetail extends CatalogItem {
  // ... campos existentes ...
  certification?: string;
}
```

---

## Backend DTO Changes

### `apps/backend/src/events/dto/create-event.dto.ts`

Adicionar 4 campos:

```ts
@IsOptional()
@IsString()
imageUrl?: string;

@IsString()
@IsNotEmpty()
eventClassification: string;

@IsOptional()
@IsString()
description?: string;

@IsInt()
@Min(1)
duration: number;
```

### `apps/backend/src/events/dto/update-event.dto.ts`

Adicionar os 4 campos ao `PickType`:

```ts
export class UpdateEventDto extends PickType(PartialType(CreateEventDto), [
  'name',
  'date',
  'location',
  'imageUrl',
  'eventClassification',
  'description',
  'duration',
] as const) {
  @IsOptional()
  @IsIn(['draft', 'published', 'cancelled'])
  status?: 'draft' | 'published' | 'cancelled';
}
```

---

## Backend Service Changes

### `apps/backend/src/events/events.service.ts`

**`EventData` interface** — adicionar:

```ts
imageUrl: string | null;
eventClassification: string;
description: string | null;
duration: number;
```

**`create()`** — passar os 4 campos do DTO para o `data` do Prisma:

```ts
const data = {
  // ... campos existentes ...
  imageUrl: dto.imageUrl,
  eventClassification: dto.eventClassification,
  description: dto.description,
  duration: dto.duration,
  // ... nested creates existentes ...
};
```

**`update()`** — passar condicionalmente (mesmo padrao `dto.x !== undefined`):

```ts
const data = {
  // ... campos existentes ...
  ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
  ...(dto.eventClassification !== undefined && { eventClassification: dto.eventClassification }),
  ...(dto.description !== undefined && { description: dto.description }),
  ...(dto.duration !== undefined && { duration: dto.duration }),
};
```

**`toEventItem()`** — incluir os 4 campos no response:

```ts
return {
  // ... campos existentes ...
  imageUrl: event.imageUrl,
  eventClassification: event.eventClassification,
  description: event.description,
  duration: event.duration,
};
```

---

## TMDB Provider Changes

### `apps/backend/src/catalog/providers/tmdb.provider.ts`

**`TmdbMovieDetail` interface** — adicionar `release_dates`:

```ts
interface TmdbReleaseDate {
  certification: string;
  iso_639_1?: string;
  note?: string;
  release_date?: string;
  type?: number;
}

interface TmdbReleaseDatesResponse {
  results: {
    iso_3166_1: string;
    release_dates: TmdbReleaseDate[];
  }[];
}

interface TmdbMovieDetail extends TmdbMovie {
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  tagline?: string;
  release_dates?: TmdbReleaseDatesResponse;
}
```

**`findOne()`** — adicionar `append_to_response`:

```ts
async findOne(externalId: string): Promise<CatalogItemDetail> {
  const data = await this.get<TmdbMovieDetail>(`/movie/${externalId}`, {
    language: 'pt-BR',
    append_to_response: 'release_dates',
  });
  return this.toCatalogItemDetail(data);
}
```

**`toCatalogItemDetail()`** — extrair certification BR:

```ts
private toCatalogItemDetail(m: TmdbMovieDetail): CatalogItemDetail {
  const brRelease = m.release_dates?.results?.find(
    (r) => r.iso_3166_1 === 'BR',
  );
  const certification =
    brRelease?.release_dates?.[0]?.certification || undefined;

  return {
    ...this.toCatalogItem(m),
    runtime: m.runtime ?? undefined,
    genres: m.genres?.map((g) => g.name),
    tagline: m.tagline || undefined,
    certification,
  };
}
```

**Ticketmaster provider**: sem mudancas (shows nao tem classificacao etaria nativa).

---

## Test Changes

### `apps/backend/src/events/events.repository.spec.ts`

`mockEvent` — adicionar os 4 novos campos:

```ts
const mockEvent = {
  // ... campos existentes ...
  imageUrl: 'https://image.tmdb.org/t/p/w500/abc.jpg',
  eventClassification: '14',
  description: 'Um filme de acao.',
  duration: 120,
};
```

Nao há testes do service nem do TMDB provider hoje; apenas o repository spec precisa atualizar.

---

## Arquivos a modificar (resumo)

| # | Arquivo | Mudanca |
|---|---|---|
| 1 | `apps/backend/prisma/schema.prisma` | +4 campos no model `Event` |
| 2 | Migration (nova) | `npx prisma migrate dev --name add_event_catalog_fields` |
| 3 | `packages/shared/src/index.ts` | +4 campos em `CreateEventRequest`, `UpdateEventRequest`, `EventItem`; +`certification` em `CatalogItemDetail` |
| 4 | `apps/backend/src/events/dto/create-event.dto.ts` | +4 campos com validadores |
| 5 | `apps/backend/src/events/dto/update-event.dto.ts` | +4 campos no `PickType` |
| 6 | `apps/backend/src/events/events.service.ts` | `EventData` +4; `create()` passa 4; `update()` passa 4 condicional; `toEventItem()` +4 |
| 7 | `apps/backend/src/catalog/providers/tmdb.provider.ts` | `findOne` com `append_to_response=release_dates`; `toCatalogItemDetail` extrai certification BR |
| 8 | `apps/backend/src/events/events.repository.spec.ts` | `mockEvent` +4 campos |

---

## Verificacao (em `apps/backend`)

1. `npx prisma generate`
2. `npm run lint` (eslint com --fix)
3. `npm test` (jest — events.repository.spec)
4. `npm run build` (nest build)

### Frontend (typecheck)

```bash
# em apps/frontend
npm run build   # tsc -b && vite build — valida que shared types estao consistentes
```

---

## Non-goals

- Implementar os steps 3-5 do wizard no FE (form de criacao + POST /events) — sera feito separadamente
- Buscar certificacao na listagem do catalogo (nao vem nos endpoints de listagem do TMDB; apenas no detalhe)
- Adicionar `pleaseNote` do Ticketmaster ao `CatalogItem`/`CatalogItemDetail`
- Validar origem dos dados no BE (se `eventClassification` veio do TMDB ou foi digitado) — é responsabilidade do FE
