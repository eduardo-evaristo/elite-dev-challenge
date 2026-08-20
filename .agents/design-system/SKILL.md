# Design System Skill

## Visao Geral

Design system customizado extraido de um arquivo `.pen` (Pencil) via Pencil MCP, implementado com Tailwind CSS 4 + shadcn/ui.

## Origem dos Tokens

1. Arquivo `.pen` aberto no Pencil (ferramenta de design)
2. `pencil_get_app_state` identificou componentes reutilizaveis
3. `pencil_execute` com `GetVariables()` leu 16 variaveis de design
4. `pencil_execute` com `Get()` extraiu estrutura de cada componente
5. Tokens mapeados para CSS vars e registrados no Tailwind

## Tokens de Cor

| Token Pencil | CSS Variable | Valor | Uso |
|-------------|-------------|-------|-----|
| `--paper` | `--paper` | `#F5F4F0` | Fundo da pagina |
| `--surface` | `--surface` | `#FFFFFF` | Cards, navbar, footer |
| `--ink` | `--ink` | `#221F1C` | Texto primario (preto SO para texto) |
| `--muted` | `--muted` | `#746B5E` | Texto secundario, icones |
| `--line` | `--line` | `#D8D2C4` | Bordas padrao |
| `--line-strong` | `--line-strong` | `#B9AFA0` | Bordas de enfase |
| `--curtain` | `--curtain` | `#9B2531` | Accent unico (botoes preenchidos) |
| `--curtain-hover` | `--curtain-hover` | `#7E1E28` | Hover do accent |
| `--spotlight` | `--spotlight` | `#B8791C` | Categoria (ouro) |
| `--stage` | `--stage` | `#2E6B84` | Categoria (azul) |

## Tipografia

- **Familia unica:** IBM Plex Sans (Google Fonts)
- **Pesos:** 400 (corpo), 500 (enfase leve), 600 (titulo de secao), 700 (headline, marca)
- **Caso:** Sentence case em toda parte

## Mapeamento para shadcn/ui

Em `src/index.css`:

```css
:root {
  --background: var(--paper);
  --foreground: var(--ink);
  --card: var(--surface);
  --primary: var(--curtain);
  --primary-foreground: #FFFFFF;
  --border: var(--line);
  --muted-foreground: var(--muted);
  --radius: 0.375rem; /* 6px */
}
```

## Registro no Tailwind CSS 4

```css
@theme inline {
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
}
```

## Regras de Design

1. **Accent unico:** so `--curtain` em botoes preenchidos. Se duas acoes lado a lado, so uma pode ser curtain preenchida.
2. **Bordas:** nunca com `--ink` puro. Usar `--line` (padrao) ou `--line-strong` (enfase).
3. **Tipografia:** uma familia so. Hierarquia por peso e tamanho.
4. **Container:** bordas 1px, border-radius 4-6px, nunca sombra (exceto modal/dropdown).
5. **Cards:** estrutura solta (flex-col, imagem com proprio border-radius, texto solto).
6. **Hover:** nunca scale. Navegacao/leitura: troca de cor do texto. Botoes: troca de background.
7. **Setas:** ancoradas no conteudo que controlam, nunca soltas acima.
8. **Vocabulario:** botoes com verbo primeiro, sentence case, sem pontuacao.

## Componentes shadcn/ui

- `Button` - variantes: default (curtain), outline, ghost, link
- `Input` - borda `--line`, focus `--curtain`
- `Badge` - variantes: default, outline
- `DropdownMenu` - Radix UI wrapper
- `Label` - Radix Label

## Utility

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

## Arquivos de Referencia

- Tokens CSS: `apps/frontend/src/index.css`
- Utils: `apps/frontend/src/lib/utils.ts`
- UI components: `apps/frontend/src/components/ui/`
- Design original: `specs/fe-home-navbar.md` (mapeamento completo Pencil -> Tailwind)
- Arquivo Pencil: `ui-design.pen`
