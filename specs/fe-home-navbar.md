# Plano: Frontend Home + Navbar + Componentes

## Objetivo

Desenvolver a tela home do frontend junto de seus componentes (navbar role-aware, footer, hero carousel, cards de evento/filme), usando shadcn/ui com overrides das variaveis globais de CSS para usar os design tokens do Pencil. Login fica com campos basicos sem estilo por enquanto.

---

## Decisoes

- **Sem AuthContext/provider**: `Navbar` recebe prop `role: Role | null`. `index.tsx` passa valor mock hardcoded. Quando integrar com backend, troca o mock por `useGetMe()` (react-query + axios) e passa `role={data?.role ?? null}`. O `Navbar` nao muda.
- **Interatividade funcional agora**: setas de scroll horizontal fazem `scrollBy`; hero carousel com auto-rotate a cada 5s + dots navegaveis.
- **1 mock de cada**: 1 filme mock + 1 evento mock. Componentes recebem dados via props (frontend desacoplado do backend). Areas de imagem = retangulo `bg-line` (sem imagens reais).
- **shadcn onde compensa**: comportamento de acessibilidade e interacao complexa (foco, teclado, ARIA, estado aberto/fechado). Usar para: Button, Input, Badge, DropdownMenu (menu de usuario no header). Nao usar para: cards de listagem, hero, footer, section header (esses sao layout/custom).

---

## Design Tokens (Pencil via MCP)

### Como os dados foram obtidos

Os design tokens e estruturas de componentes foram extraidos do arquivo Pencil (`/home/eduardo/untitled.pen`) via MCP tools:

1. **`pencil_get_app_state`**: obteve o estado do canvas, identificando os frames e componentes reutilizaveis:
   - Frame selecionado: `hmpGq` (Home (Simple) /)
   - Componentes reutilizaveis: `YdyCa` (Navbar), `x5w6N` (Movie Card), `p733t` (Event Card), `ZfXe6` (Footer), `A49lpn` (Navbar - Usuario Logado), `XWIo2` (Navbar - Organizador Logado)

2. **`pencil_execute` com `GetVariables()`**: leu todas as variaveis de design definidas no documento Pencil:
   ```js
   Print(GetVariables())
   ```
   Retornou 16 variaveis: 10 cores, 1 string (fonte), 5 numeros (gaps + radius).

3. **`pencil_execute` com `Get(path, visit, options)`**: percorreu a arvore de cada componente usando visitor function para extrair tipo, nome, dimensoes, fill, layout, gap, padding, fontSize, fontWeight, e content de cada no:
   ```js
   Get("hmpGq", (n, c) => Print(n.id, "|".repeat(c.depth), n.name, n.type, c.bounds.width + "x" + c.bounds.height, n.fill || "", n.layout || "", ...), {depth: 5, resolveVariables: true})
   ```
   Executado para: `hmpGq` (home), `YdyCa` (navbar base), `A49lpn` (navbar cliente), `XWIo2` (navbar organizador), `x5w6N` (movie card), `p733t` (event card), `ZfXe6` (footer).

### Variaveis CSS do Pencil

| Variavel Pencil | Tipo | Valor | Papel no design system |
|---|---|---|---|
| `--paper` | color | `#F5F4F0` | Fundo da pagina |
| `--surface` | color | `#FFFFFF` | Cards, navbar, footer |
| `--ink` | color | `#221F1C` | Texto (preto reservado so para texto) |
| `--muted` | color | `#746B5E` | Texto secundario, icones |
| `--line` | color | `#D8D2C4` | Borda padrao |
| `--line-strong` | color | `#B9AFA0` | Borda de enfase |
| `--curtain` | color | `#9B2531` | Unico accent de botao preenchido (fill solido) |
| `--curtain-hover` | color | `#7E1E28` | Hover do curtain |
| `--spotlight` | color | `#B8791C` | Categoria de conteudo (ouro) |
| `--stage` | color | `#2E6B84` | Categoria de conteudo (azul) |
| `--font-body` | string | `IBM Plex Sans` | Unica familia tipografica |
| `--gap-xs` | number | `4` | Espacamento extra-small |
| `--gap-sm` | number | `8` | Espacamento small |
| `--gap-md` | number | `16` | Espacamento medium |
| `--gap-lg` | number | `24` | Espacamento large |
| `--gap-xl` | number | `32` | Espacamento extra-large |
| `--gap-2xl` | number | `48` | Espacamento 2x-large |
| `--radius-sm` | number | `4` | Border-radius small |
| `--radius-md` | number | `6` | Border-radius medium |

### Regras do design system (design.md)

1. **Accent unico**: `--curtain` e a unica cor de botao preenchido do sistema. Se duas acoes lado a lado, so uma pode ser `--curtain` preenchido; a outra e contorno ou texto. `--spotlight` e `--stage` categorizam conteudo, nunca competem como accent de acao.
2. **Borda**: toda borda usa `--line` (padrao) ou `--line-strong` (enfase) -- nunca `--ink` puro. Preto reservado estritamente para texto.
3. **Tipografia**: uma familia so (IBM Plex Sans). Hierarquia por peso e tamanho: 400 (corpo), 500 (enfase leve, titulo de card), 600 (titulo de secao), 700 (headline do hero, nome da marca). Sentence case em toda parte.
4. **Container**: bordas de 1px (`--line` ou `--line-strong`), border-radius discreto (4-6px), nunca sombra -- exceto modal/dropdown sobreposto.
5. **Cards de listagem**: estrutura solta (flex-col, imagem no topo com seu proprio border-radius, texto solto embaixo, sem container unico envolvendo os dois).
6. **Hover**: nunca scale. Item de navegacao/leitura: so troca de cor do texto/titulo. Botao de acao: troca o proprio background (escurece).
7. **Setas de navegacao**: ancoradas na borda do proprio conteudo que controlam -- nunca soltas acima em linha de cabecalho separada.
8. **Vocabulario**: botoes com verbo primeiro, sentence case, sem pontuacao ("Comprar ingresso"). Erros dizem o que aconteceu e o que fazer, sem "Erro:" na frente. Vazio e convite, nao pedido de desculpas.

---

## Mapeamento Pencil -> shadcn (variaveis CSS)

```
/* shadcn tokens -> Pencil tokens */
--background: var(--paper);              /* bg-background */
--foreground: var(--ink);                /* text-foreground */
--card: var(--surface);                  /* bg-card */
--card-foreground: var(--ink);           /* text-card-foreground */
--popover: var(--surface);               /* bg-popover */
--popover-foreground: var(--ink);        /* text-popover-foreground */
--primary: var(--curtain);               /* bg-primary (unico fill de botao) */
--primary-foreground: #FFFFFF;           /* text-primary-foreground */
--secondary: var(--paper);               /* bg-secondary */
--secondary-foreground: var(--ink);      /* text-secondary-foreground */
--muted: var(--paper);                   /* bg-muted (fundo sutil: search, location) */
--muted-foreground: var(--muted);        /* text-muted-foreground (texto secundario) */
--accent: var(--paper);                  /* bg-accent */
--accent-foreground: var(--ink);         /* text-accent-foreground */
--destructive: var(--curtain);           /* bg-destructive */
--destructive-foreground: #FFFFFF;       /* text-destructive-foreground */
--border: var(--line);                   /* border-border */
--input: var(--line);                    /* border-input */
--ring: var(--line-strong);              /* ring-ring (foco) */
--radius: 0.375rem;                      /* 6px = --radius-md */
```

Cores Pencil exclusivas registradas como utilities Tailwind via `@theme inline`:
```
--color-curtain: var(--curtain);
--color-curtain-hover: var(--curtain-hover);
--color-spotlight: var(--spotlight);
--color-stage: var(--stage);
--color-paper: var(--paper);
--color-surface: var(--surface);
--color-ink: var(--ink);
--color-muted-ink: var(--muted);
--color-line: var(--line);
--color-line-strong: var(--line-strong);
```

---

## Estrutura dos Componentes (Pencil via MCP)

### Navbar (3 variantes)

Extraido via `Get("YdyCa", ...)`, `Get("A49lpn", ...)`, `Get("XWIo2", ...)`.

**Estrutura comum:**
```
Navbar (1440x64, bg-surface, space_between, center, padding [0,32])
  Nav Left (center, gap 24)
    Logo "guiche" (22px, 700, ink)
    [links de navegacao - variam por role]
  Nav Right (center, gap 16)
    Search Frame (bg-paper, center, gap 4, padding [8,12])
      Search Icon (16x16, muted)
      Placeholder "Buscar eventos, filmes..." (13px, muted)
    Local Frame (bg-paper, center, gap 4, padding [8,12])
      Map Pin Icon (16x16, muted)
      Text "Sao Paulo, SP" (13px, muted)
    [botao role-specific OU nada]
    User Icon (20x20, muted)
```

**Variante logout (YdyCa):**
- Nav Left: Logo + "Filmes" + "Eventos" (14px, 500, muted)
- Nav Right: Search + Local + User Icon (sem botao extra)

**Variante CLIENT (A49lpn):**
- Nav Left: Logo + "Filmes" + "Eventos"
- Nav Right: Search + Local + btn "Meus Ingressos" (bg-curtain, text white, 14px 600, padding [8,16]) + User Icon

**Variante ORGANIZER (XWIo2):**
- Nav Left: Logo + "Painel" + "Eventos" + "Relatorios" (14px, 500, muted)
- Nav Right: Search (menor, placeholder "Buscar...") + btn "Criar evento" (bg-curtain, text white, 14px 600, padding [8,16]) + User Icon

### Footer (ZfXe6)

```
Footer (1440x280, bg-surface, vertical, gap 32, padding [48,80])
  Footer Top (horizontal, gap 48)
    Col 1: Logo (22px 700) + Tagline (14px, muted) "Descubra eventos e filmes perto de voce."
    Col 2: "Plataforma" (14px 600) + Sobre, Como funciona, Termos de uso, Privacidade (13px, muted)
    Col 3: "Para organizadores" (14px 600) + Criar evento, Painel, Precos, Ajuda (13px, muted)
    Col 4: "Atendimento" (14px 600) + Central de ajuda, Fale conosco, Reembolsos (13px, muted)
  Divider (1280x1, bg-line)
  Footer Bottom (space_between)
    Copyright (12px, muted) "(c) 2025 Guiche. Todos os direitos reservados."
  Subfooter (space_between, center, gap 16, padding [16,0])
    Payment Methods: Label (12px muted) + 4 card rectangles
    Social: Label (12px muted) + instagram, facebook, twitter, youtube icons (16x16, muted)
```

### Movie Card (x5w6N)

```
Movie Card (200x360, vertical, gap 8)
  Poster (200x280, bg-line) -- placeholder solido, sem moldura
  Title (14px, 600, ink) "Titulo do Filme"
  Meta (12px, muted) "2h 15min . 14 anos"
```

### Event Card (p733t)

```
Event Card (260x340, vertical, gap 8)
  Image (260x260, bg-line) -- placeholder solido
  Title (14px, 600, ink) "Nome do Evento"
  Date (12px, muted) "Sab, 15 de mar"
  Place (12px, muted) "Teatro Municipal"
  Category Badge (bg-curtain, text white, 11px 600, padding [4,8])
    Label "Categoria"
```

### Hero (hmpGq -> pzSa5)

```
Hero (1440x520)
  Background: gradiente linear 135deg
    #2E0A10 (pos 0) -> #9B2531 (pos 0.4) -> #4A1E0A (pos 1)
  Hero Text (600x520, vertical, center, gap 16)
    Title (48px, 700, white) "O amor nao tira ferias"
    Desc (18px, white) "A comedia romantica que todo mundo esta comentando"
    CTA (bg-curtain, padding [12,24])
      Label (14px, 600, white) "Comprar ingresso"
  Carousel Dots (4 dots, gap 8)
    Dot 0: 8x8, white (ativo)
    Dots 1-3: 8x8, white/40 (inativos)
  Hero Poster (520x300) -- imagem no lado direito
```

### Home (hmpGq) - composicao completa

```
Home (1440x1926, bg-paper, vertical)
  Navbar Instance (ref YdyCa, 1440x64)
  Hero (1440x520)
  Movies Section (1440x531, vertical, gap 24, padding [48,80])
    Movies Header (space_between, center)
      Section Title (24px, 600, ink) "Filmes em cartaz"
      Arrow Frame (gap 8, center)
        Arrow Left icon (24x24, muted)
        Arrow Right icon (24x24, muted)
    Movies Row (horizontal, gap 16) -- 6x MovieCard
  Events Section (1440x531, vertical, gap 24, padding [48,80])
    Events Header (space_between, center)
      Section Title (24px, 600, ink) "Eventos em cartaz"
      Arrow Frame (gap 8, center)
        Arrow Left icon (24x24, muted)
        Arrow Right icon (24x24, muted)
    Events Row (horizontal, gap 16) -- 6x EventCard
  Footer Instance (ref ZfXe6, 1440x280)
```

---

## Estrutura de Arquivos

```
src/
  main.tsx                      (+ import './index.css')
  index.css                     (Tailwind v4 + tokens Pencil + shadcn overrides)
  routeTree.gen.ts              (regenerado pelo TanStack Router plugin)
  lib/
    utils.ts                    (cn: clsx + tailwind-merge)
  types/
    auth.ts                     (Role, User)
  data/
    mock-home.ts                (1 filme mock, 1 evento mock)
  components/
    ui/                         (shadcn: button, input, badge, dropdown-menu)
    navbar.tsx                  (prop: role: Role | null)
    footer.tsx
    hero.tsx                    (carousel: auto-rotate + dots navegaveis)
    section-header.tsx          (titulo + setas com scrollBy)
    movie-card.tsx              (props-driven, sem imagem real)
    event-card.tsx              (props-driven + badge categoria)
  routes/
    __root.tsx                  (bare Outlet, sem provider)
    index.tsx                   (Navbar + Hero + secoes + Footer, role mock)
    login.tsx                   (campos basicos sem estilo)
```

---

## Plano de Execucao

### Fase 1 - Fundacao (Tailwind v4 + shadcn + path alias)

1. **Instalar deps**:
   ```bash
   npm install tailwindcss @tailwindcss/vite clsx tailwind-merge class-variance-authority lucide-react tw-animate-css
   ```

2. **`vite.config.ts`**: adicionar plugin `tailwindcss()` + `resolve.alias` para `@` -> `./src` + proxy `/api` -> `localhost:3000` (preparar para integracao futura)

3. **`tsconfig.json`**: adicionar `compilerOptions.baseUrl` + `paths["@/*"]: ["./src/*"]`

4. **`src/index.css`**: criar com:
   - `@import "tailwindcss"` + `@import "tw-animate-css"`
   - `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap')`
   - `:root` com tokens do Pencil + mapeamento para variaveis shadcn (ver secao "Mapeamento Pencil -> shadcn")
   - `@theme inline` registrando cores Pencil como utilities Tailwind + cores shadcn
   - `@layer base` com reset de bordas usando `--line`

5. **`src/lib/utils.ts`**: criar `cn()` (clsx + tailwind-merge)

6. **`main.tsx`**: adicionar `import './index.css'`

7. **`components.json`**: criar manualmente para shadcn (style: default, rsc: false, tailwind css path: src/index.css, aliases: @/components, @/lib/utils)

8. **Adicionar componentes shadcn**: `npx shadcn@latest add button input badge dropdown-menu` (ou criar manualmente em `src/components/ui/`)

### Fase 2 - Tipos e Mock Data

9. **`src/types/auth.ts`**:
   ```ts
   export type Role = 'CLIENT' | 'ORGANIZER' | 'GATE' | 'ADMIN';
   export interface User {
     id: string;
     name: string;
     lastName: string;
     email: string;
     role: Role;
   }
   ```

10. **`src/data/mock-home.ts`**: 1 mock de filme + 1 mock de evento (tipos definidos, dados hardcoded)

### Fase 3 - Componentes

11. **`src/components/section-header.tsx`**:
    - Titulo (24px/600, `text-ink`) + setas (lucide `ChevronLeft`/`ChevronRight`, 24px, `text-muted hover:text-ink`)
    - Props: `title: string`, `onPrev`, `onNext`
    - Setas fazem `scrollBy` no container de scroll horizontal (passado via ref ou callback)

12. **`src/components/movie-card.tsx`**:
    - Card solto (flex-col, gap 8px / gap-sm)
    - Poster: `w-full aspect-[5/7] rounded-md bg-line`
    - Titulo: `text-sm font-semibold text-ink` (14px/500-600), hover `text-curtain`
    - Meta: `text-xs text-muted-foreground` (12px)
    - Sem sombra, sem scale, sem moldura envolvendo tudo

13. **`src/components/event-card.tsx`**:
    - Card solto (flex-col, gap 8px)
    - Imagem: `w-full aspect-square rounded-md bg-line`
    - Titulo + data + local (mesma hierarquia que movie card)
    - Badge de categoria: `bg-curtain text-white text-[11px] font-semibold rounded-sm px-2 py-1` (posicionado sobre a imagem, canto inferior)
    - Hover: titulo muda para `text-curtain`

14. **`src/components/navbar.tsx`**:
    - Prop: `role: Role | null`
    - 3 estados: logout (base), CLIENT (btn "Meus ingressos" curtain fill), ORGANIZER (links Painel/Eventos/Relatorios + btn "Criar evento" curtain fill)
    - Links: `text-muted hover:text-ink font-medium text-sm` (14px/500, sem scale)
    - Search e location: frames com `bg-paper border border-line rounded-md px-3 py-2`
    - Botoes curtain: `bg-curtain hover:bg-curtain-hover text-white font-semibold text-sm rounded-md px-4 py-2`
    - User icon: abre `DropdownMenu` (shadcn) com opcoes (logout, etc.)

15. **`src/components/footer.tsx`**:
    - 4 colunas + divider (`bg-line`) + copyright + subfooter (pagamentos + sociais)
    - Links: `text-muted hover:text-ink text-[13px]`

16. **`src/components/hero.tsx`**:
    - Background: `linear-gradient(135deg, #2E0A10 0%, #9B2531 40%, #4A1E0A 100%)`
    - Layout: texto a esquerda (centralizado vertical), placeholder poster a direita
    - Titulo 48px/700 branco, descricao 18px branca, CTA curtain (`bg-curtain hover:bg-curtain-hover text-white font-semibold rounded-md px-6 py-3`)
    - Dots de carrossel na parte inferior (4 dots, primeiro ativo branco, resto `white/40`)
    - **Comportamento**: auto-rotate a cada 5s, dots navegaveis, pausa on hover
    - Props: array de slides (titulo, descricao, label CTA) -- 1 slide mock por enquanto

### Fase 4 - Montagem da Home

17. **`src/routes/index.tsx`**: compor a home:
    - `<Navbar role={null} />` (mock -- trocar por `useGetMe()` depois)
    - `<Hero />` (com 1 slide mock)
    - Secao "Filmes em cartaz": `<SectionHeader title="Filmes em cartaz" onPrev={...} onNext={...} />` + row horizontal com `<MovieCard>` (scroll horizontal, gap-4)
    - Secao "Eventos em cartaz": `<SectionHeader title="Eventos em cartaz" onPrev={...} onNext={...} />` + row horizontal com `<EventCard>`
    - `<Footer />`

18. **`src/routes/__root.tsx`**: manter bare `<Outlet />` (sem provider)

### Fase 5 - Login basico

19. **`src/routes/login.tsx`**: rota `/login` com campos basicos (email, password, submit button) -- sem estilos, so funcionalidade minima. Nao integrar com backend ainda.

### Fase 6 - Verificacao

20. `npm run lint` + `npm run build` (que roda `tsc -b` como typecheck)

---

## Documentacao de Referencia (Context7)

- **shadcn/ui**: instalacao com Vite + Tailwind CSS v4 (`/shadcn-ui/ui`)
  - Instalar: `npm install tailwindcss @tailwindcss/vite`
  - `index.css`: `@import "tailwindcss"`
  - `vite.config.ts`: plugin `tailwindcss()` + `resolve.alias` para `@`
  - `tsconfig.json`: `baseUrl` + `paths` para `@/*`
  - Override de tema: definir CSS vars em `:root` + registrar em `@theme inline` como `--color-*`
  - `tw-animate-css` para animacoes (substituto de `tailwindcss-animate` no Tailwind v4)

- **TanStack Router**: file-based routes em `src/routes/`, `routeTree.gen.ts` regenerado automaticamente, `autoCodeSplitting: true`

---

## Backend (contexto para integracao futura)

- **Auth**: `POST /auth/login` -> JWT em cookie httpOnly + body `{ access_token }`. `GET /auth/me` -> `{ id, name, lastName, email, role, createdAt, updatedAt }`
- **Roles**: `CLIENT`, `ORGANIZER`, `GATE`, `ADMIN`
- **Nao existe endpoint publico de eventos** -- o catalog endpoint (`GET /catalog`) e restrito a ORGANIZER/ADMIN e proxia APIs externas (TMDB/Ticketmaster)
- **Proximo passo backend**: criar `EventsModule` com `GET /events` (filtrando `status = PUBLISHED`) para servir a home
- **Integracao FE**: instalar `axios` + `@tanstack/react-query`, criar hook `useGetMe()` que chama `GET /auth/me`, passar `role` para `<Navbar>`
