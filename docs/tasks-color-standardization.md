# Padronização de Cores — Lista de Tarefas

**Objetivo:** Consolidar todas as cores do projeto em `src/styles/colors.ts` com tokens semânticos. Eliminar paletas inline locais e valores hexadecimais hardcoded.

**Regra de ouro:** Cada tarefa é independente e auto-suficiente. Execute uma por vez, verifique visualmente no emulador e faça commit antes de passar para a próxima.

---

## Tabela de referência: hardcoded → token semântico

| Valor atual | Token novo | Uso |
|---|---|---|
| `#FAC638` | `colors.brand.primary` | botões, highlights, estado selecionado |
| `rgba(250,198,56,0.25)` | `colors.brand.primaryLight` | fundo do item selecionado em listas |
| `#F2B84D` | `colors.brand.dark` | tab ativa, sombra de botão |
| `#F59E0B` | `colors.brand.static` | ícones estáticos, loading |
| `#fae39d4b` | `colors.brand.warningFade` | fundo amarelo transparente |
| `#111827` | `colors.text.heading` | títulos, cabeçalhos de modal |
| `#1A1A1A` | `colors.text.title` | títulos de card |
| `#374151` | `colors.text.body` | texto de corpo em cards, labels de tab |
| `#4B5563` | `colors.text.secondary` | descrições secundárias |
| `#6B7280` | `colors.text.muted` | texto apagado, placeholder |
| `#9CA3AF` | `colors.text.placeholder` | placeholder de input |
| `#FFF` / `#fff` / `#FFFFFF` | `colors.bg.card` | superfície branca de cards |
| `#F6F3F4` / `#f6f3f4` | `colors.bg.screen` | fundo da tela principal |
| `#F8F7F5` | `colors.bg.sheet` | fundo de bottom sheets e drawers |
| `#F7F8FA` | `colors.bg.section` | fundo de seções de tabela |
| `#F3F4F6` | `colors.bg.input` | fundo de campos de input, cabeçalho de tabela |
| `#F5F5F5` / `#f5f5f5` / `#EEE` / `#eee` | `colors.bg.subtle` | fundo cinza-claro, chips inativos |
| `#E5E7EB` | `colors.border.default` | bordas padrão, divisores |
| `#D1D5DB` | `colors.border.light` | handle de sheet, separadores mais suaves |
| `#ccc` / `#CCC` | `colors.border.muted` | bordas de input legacy |
| `#EF4444` | `colors.status.error` | ícones de erro, ação de deletar |
| `#DC2626` | `colors.status.errorStrong` | botão de confirmar exclusão |
| `#B91C1C` | `colors.status.errorText` | texto de mensagem de erro |
| `#ffe3e3` | `colors.status.errorFade` | badge de status falha/inativo |
| `#FEE2E2` | `colors.status.errorBg` | fundo de badge de erro |
| `#10B981` | `colors.status.success` | ícones de sucesso |
| `#9DFFBE` | `colors.status.successActive` | badge de status ativo/confirmado |
| `#065F46` | `colors.status.successText` | texto de badge de sucesso |
| `#D1FAE5` | `colors.status.successBg` | fundo de badge de sucesso |
| `#FEF3C7` | `colors.status.warningBg` | badge de status em andamento/pendente |
| `#fae39dff` | `colors.status.pendingBg` | fundo amarelo de lembrete |
| `#B45309` | `colors.status.warningText` | texto de badge de aviso |
| `#A16207` | `colors.status.warningText` | (mesma semântica) |
| `#78350F` / `#92400E` | `colors.status.warningDark` | texto escuro de aviso |
| `rgba(0,0,0,0.5)` | `colors.overlay.modal` | backdrop padrão de modal |
| `rgba(0,0,0,0.4)` | `colors.overlay.modalLight` | backdrop mais suave |
| `rgba(0,0,0,0.8)` | `colors.overlay.dark` | sombra forte |
| `rgba(255,255,255,0.35)` | `colors.overlay.whiteGlass` | vidro branco translúcido |
| `#2563EB` | `colors.text.link` | links e accent informativo |
| `#43310B` | `colors.text.accent` | labels destacados, textos sobre fundo amarelo |
| `#000` / `#000000` | `colors.black` | sombras, ícones puros |
| `"gray"` (string nomeada) | `colors.text.muted` | cor de ícone de tab inativo |
| `"red"` (string nomeada) | `colors.status.error` | texto de erro inline |
| `"green"` (string nomeada) | `colors.status.success` | texto de sucesso inline |
| `#FFCF78` (yellow.base atual) | `colors.brand.primary` | ⚠️ este valor era errado — o botão principal usa #FAC638 |

**Tokens de mapeamento antigo → novo (para arquivos que já usam `colors.*`):**

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` | `colors.brand.primary` |
| `colors.yellow.dark` | `colors.brand.dark` |
| `colors.yellow.static` | `colors.brand.static` |
| `colors.yellow.warning` | `colors.status.pendingBg` |
| `colors.yellow.fundo` | `colors.brand.warningFade` |
| `colors.yellow.button` | `colors.brand.primary` |
| `colors.gray.base` | `colors.text.muted` |
| `colors.gray.claro` | `colors.bg.input` |
| `colors.gray.text` | `colors.text.placeholder` |
| `colors.gray.disabled` | `colors.border.default` |
| `colors.green.active` | `colors.status.successActive` |
| `colors.green.text` | `colors.status.successText` |
| `colors.green.extra` | `colors.status.success` |
| `colors.red.base` | `colors.status.error` |
| `colors.red.extra` | `colors.status.error` |
| `colors.red.text` | `colors.status.errorText` |
| `colors.red.inactive` | `colors.status.errorFade` |
| `colors.brown.base` | `colors.text.accent` |
| `colors.white.base` | `colors.bg.card` |
| `colors.black.base` | `colors.black` |

---

## Tarefa 1 — Reescrever `src/styles/colors.ts`

Substitua **todo** o conteúdo do arquivo pelo seguinte:

```typescript
export const colors = {
  // === MARCA ===
  brand: {
    primary: "#FAC638",
    primaryLight: "rgba(250,198,56,0.25)",
    dark: "#F2B84D",
    static: "#F59E0B",
    warningFade: "#fae39d4b",
  },

  // === TEXTO ===
  text: {
    heading: "#111827",
    title: "#1A1A1A",
    body: "#374151",
    secondary: "#4B5563",
    muted: "#6B7280",
    placeholder: "#9CA3AF",
    onDark: "#FFFFFF",
    link: "#2563EB",
    accent: "#43310B",
  },

  // === FUNDOS ===
  bg: {
    screen: "#F6F3F4",
    card: "#FFFFFF",
    sheet: "#F8F7F5",
    section: "#F7F8FA",
    input: "#F3F4F6",
    subtle: "#F5F5F5",
  },

  // === BORDAS ===
  border: {
    default: "#E5E7EB",
    light: "#D1D5DB",
    muted: "#cccccc",
  },

  // === STATUS ===
  status: {
    error: "#EF4444",
    errorStrong: "#DC2626",
    errorText: "#B91C1C",
    errorFade: "#ffe3e3",
    errorBg: "#FEE2E2",

    success: "#10B981",
    successActive: "#9DFFBE",
    successText: "#065F46",
    successBg: "#D1FAE5",

    warningBg: "#FEF3C7",
    warningText: "#B45309",
    warningDark: "#78350F",
    pendingBg: "#fae39dff",
  },

  // === OVERLAY ===
  overlay: {
    modal: "rgba(0,0,0,0.5)",
    modalLight: "rgba(0,0,0,0.4)",
    dark: "rgba(0,0,0,0.8)",
    whiteGlass: "rgba(255,255,255,0.35)",
  },

  // === PRIMITIVOS ===
  white: "#FFFFFF",
  black: "#000000",
};
```

**Commit:** `refactor(colors): define semantic token palette`

---

## Tarefa 2 — Remover paletas inline duplicadas (11 arquivos)

Estes 11 arquivos definem um bloco `const defaultColors = { ... }` + `const mergedColors = { ...defaultColors, ...colors }` porque o `colors.ts` antigo não tinha os tokens necessários. Com a Tarefa 1 concluída, esse bloco é removido e `mergedColors.X` é substituído por `colors.Y`.

### Processo idêntico para cada arquivo:

**Passo 1:** Apague o bloco `defaultColors` + `mergedColors` (linhas indicadas abaixo).

**Passo 2:** Substitua todas as ocorrências de `mergedColors.X` pelo token equivalente da tabela:

| `mergedColors.*` | Substitua por |
|---|---|
| `mergedColors.primary.base` | `colors.brand.primary` |
| `mergedColors.gray.claro` | `colors.bg.sheet` |
| `mergedColors.gray.disabled` | `colors.border.default` |
| `mergedColors.text.primary` | `colors.text.heading` |
| `mergedColors.text.secondary` | `colors.text.secondary` |
| `mergedColors.border` | `colors.border.default` |
| `mergedColors.white.base` | `colors.bg.card` |
| `mergedColors.red.base` | `colors.status.error` |

**Passo 3:** Substitua os valores hardcoded restantes (listados por arquivo abaixo).

**Passo 4:** Verifique que `import { colors } from "../../styles/colors"` já existe no arquivo (todos já têm).

---

### 2.1 — `src/components/AnimalEditBottomSheet/index.tsx`

Apague as linhas 28–36 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua os hardcoded restantes:

| Linha aprox. | Valor hardcoded | Token |
|---|---|---|
| `{ backgroundColor: "#D1D5DB", height: 4, width: 36 }` | `"#D1D5DB"` | `colors.border.light` |
| `"#f5f5f5"` | `"#f5f5f5"` | `colors.bg.subtle` |
| `"#777"` | `"#777"` | `colors.text.muted` |

---

### 2.2 — `src/components/CriaBufaloBottomSheet/index.tsx`

Apague as linhas 23–30 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua:

| Valor hardcoded | Token |
|---|---|
| `{ backgroundColor: "#D1D5DB", height: 4, width: 36 }` | `colors.border.light` |

---

### 2.3 — `src/components/DemarcacaoPiqueteSheet/index.tsx`

Apague as linhas 27–35 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua:

| Valor hardcoded | Token |
|---|---|
| `backgroundColor: "#F8F7F5"` (na abertura do sheet) | `colors.bg.sheet` |
| `backgroundColor: "#D1D5DB"` (handle) | `colors.border.light` |
| `"#eee"` | `colors.bg.subtle` |
| `borderColor: "#ccc"` | `colors.border.muted` |

Substitua também os tokens antigos ainda presentes no arquivo:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` | `colors.brand.primary` |
| `colors.gray.base` | `colors.text.muted` |
| `colors.gray.disabled` | `colors.border.default` |
| `colors.brown.base` | `colors.text.accent` |

Strings nomeadas (linha ~251 e ~348):
- `color: 'red'` → `color: colors.status.error`
- `backgroundColor: 'red'` → `backgroundColor: colors.status.error`

---

### 2.4 — `src/components/FormColeta/index.tsx`

Apague as linhas 40–47 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua:

| Valor hardcoded | Token |
|---|---|
| `{ backgroundColor: "#D1D5DB", height: 4, width: 36 }` | `colors.border.light` |
| `borderColor: "#FAC638"` (linha ~430) | `colors.brand.primary` |
| `color: "#111827"` (linha ~434) | `colors.text.heading` |

Substitua também:

| Token antigo | Token novo |
|---|---|
| `colors.gray.base` | `colors.text.muted` |

---

### 2.5 — `src/components/FormEstoque/index.tsx`

Apague as linhas 38–45 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua:

| Valor hardcoded | Token |
|---|---|
| `{ backgroundColor: "#D1D5DB", height: 4, width: 36 }` | `colors.border.light` |

---

### 2.6 — `src/components/FormLactacao/index.tsx`

Apague as linhas 233–244 (bloco de comentário + `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua:

| Valor hardcoded | Token |
|---|---|
| `{ backgroundColor: "#D1D5DB", height: 4, width: 36 }` | `colors.border.light` |
| `borderColor: "#FAC638"` (linha ~431) | `colors.brand.primary` |
| `color: "#111827"` (linha ~435) | `colors.text.heading` |

Substitua também:

| Token antigo | Token novo |
|---|---|
| `colors.gray.base` | `colors.text.muted` |

---

### 2.7 — `src/components/FormReproductionAdd/index.tsx`

Apague as linhas 29–37 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua:

| Valor hardcoded | Token |
|---|---|
| `{ backgroundColor: "#D1D5DB", height: 4, width: 36 }` | `colors.border.light` |
| `"#f5f5f5"` | `colors.bg.subtle` |
| `"#777"` | `colors.text.muted` |

---

### 2.8 — `src/components/FormReproductionAtt/index.tsx`

Apague as linhas 25–33 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua:

| Valor hardcoded | Token |
|---|---|
| `{ backgroundColor: "#D1D5DB", height: 4, width: 36 }` | `colors.border.light` |
| `"#f5f5f5"` | `colors.bg.subtle` |
| `"#777"` | `colors.text.muted` |

---

### 2.9 — `src/components/SanitarioAddBottomSheet/index.tsx`

Apague as linhas 27–34 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua os hardcoded restantes:

| Valor hardcoded | Token |
|---|---|
| `{ backgroundColor: "#D1D5DB", height: 4, width: 36 }` | `colors.border.light` |
| `"#E5E7EB"` (linha ~292) | `colors.border.default` |
| `thumbColor="#FFF"` (linha ~290) | `colors.bg.card` |
| `backgroundColor: "#F9FAFB"` (linha ~552) | `colors.bg.subtle` |
| `borderColor: "#E5E7EB"` (linha ~555) | `colors.border.default` |
| `backgroundColor: "#FFF8E1"` (linha ~559) | `colors.status.warningBg` |

---

### 2.10 — `src/components/ZootecnicoAddBottomSheet/index.tsx`

Apague as linhas 25–33 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua:

| Valor hardcoded | Token |
|---|---|
| `{ backgroundColor: "#D1D5DB", height: 4, width: 36 }` | `colors.border.light` |

---

### 2.11 — `src/components/VisualizarPiqueteSheet/index.tsx`

Apague as linhas 28–36 (bloco `defaultColors` + `mergedColors`).

Após aplicar a tabela de `mergedColors.*`, substitua:

| Valor hardcoded | Token |
|---|---|
| `backgroundColor: "#F8F7F5"` (abertura do sheet) | `colors.bg.sheet` |
| `backgroundColor: "#D1D5DB"` (handle) | `colors.border.light` |
| `"#eee"` | `colors.bg.subtle` |
| `borderColor: "#ccc"` | `colors.border.muted` |

Substitua também os tokens antigos no arquivo:

| Token antigo | Token novo |
|---|---|
| `colors.gray.base` | `colors.text.muted` |
| `colors.gray.disabled` | `colors.border.default` |
| `colors.brown.base` | `colors.text.accent` |

Strings nomeadas:
- `backgroundColor: 'red'` (linhas ~173, ~180) → `backgroundColor: colors.status.error`

---

**Commit após 2.1–2.11:** `refactor(components): remove inline color palettes, use semantic tokens`

---

## Tarefa 3 — `src/components/SanitarioBottomSheet/index.tsx`

O arquivo já importa `colors`. Não tem paleta local, mas tem muitos valores hardcoded.

Substitua os valores hardcoded:

| Valor hardcoded | Token |
|---|---|
| `backgroundColor: "#F8F7F5"` (abertura do sheet, linha ~139) | `colors.bg.sheet` |
| `backgroundColor: "#D1D5DB"` (handle, linha ~140) | `colors.border.light` |
| `"#D1D5DB"` (linha ~315) | `colors.border.light` |
| `"#111827"` (linhas ~327, ~350, ~359, ~393, ~447, ~471) | `colors.text.heading` |
| `"#FFF"` (linhas ~330, ~365) | `colors.bg.card` |
| `"#000"` (linha ~335) | `colors.black` |
| `"#6B7280"` (linhas ~354, ~384, ~389) | `colors.text.muted` |
| `"#E5E7EB"` (linhas ~376, ~424) | `colors.border.default` |
| `thumbColor="#FAC638"` (linha ~240) | `colors.brand.primary` |
| `"#FAC638"` (linhas ~399, ~435, ~467) | `colors.brand.primary` |
| `rgba(250,198,56,0.25)` (linha ~407) | `colors.brand.primaryLight` |
| `"#A16207"` (linha ~412) | `colors.status.warningText` |
| `"#78350F"` (linha ~416) | `colors.status.warningDark` |
| `"#DC2626"` (linhas ~439, ~442) | `colors.status.errorStrong` |

Substitua também os tokens antigos ainda no arquivo:

| Token antigo | Token novo |
|---|---|
| `colors.gray.claro` | `colors.bg.input` |
| `colors.gray.base` | `colors.text.muted` |
| `colors.white.base` | `colors.bg.card` |
| `colors.black.base` | `colors.black` |

**Commit:** `refactor(SanitarioBottomSheet): use semantic color tokens`

---

## Tarefa 4 — `src/components/ZootecnicoBottomSheet/index.tsx`

O arquivo já importa `colors`. Não tem paleta local, mas tem muitos valores hardcoded.

Substitua os valores hardcoded:

| Valor hardcoded | Token |
|---|---|
| `backgroundColor: "#F8F7F5"` (linha ~95) | `colors.bg.sheet` |
| `backgroundColor: "#D1D5DB"` (handle, linha ~96) | `colors.border.light` |
| `"#D1D5DB"` (linha ~268) | `colors.border.light` |
| `"#111827"` (linhas ~281, ~304, ~314, ~350, ~429) | `colors.text.heading` |
| `"#FFF"` (linhas ~284, ~321) | `colors.bg.card` |
| `"#000"` (linha ~289) | `colors.black` |
| `"#6B7280"` (linhas ~308, ~340, ~346) | `colors.text.muted` |
| `"#E5E7EB"` (linhas ~332, ~382) | `colors.border.default` |
| `rgba(250,198,56,0.25)` (linha ~364) | `colors.brand.primaryLight` |
| `"#78350F"` (linha ~373) | `colors.status.warningDark` |
| `"#FAC638"` (linhas ~393, ~425) | `colors.brand.primary` |
| `"#DC2626"` (linhas ~397, ~400) | `colors.status.errorStrong` |

Substitua também os tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.claro` | `colors.bg.input` |
| `colors.gray.base` | `colors.text.muted` |
| `colors.white.base` | `colors.bg.card` |
| `colors.brown.base` | `colors.text.accent` |

**Commit:** `refactor(ZootecnicoBottomSheet): use semantic color tokens`

---

## Tarefa 5 — Componentes de Card

### 5.1 — `src/components/CardBufaloRebanho/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |
| `"#000"` | `colors.black` |
| `"#1A1A1A"` | `colors.text.title` |
| `"#6B7280"` | `colors.text.muted` |
| `"#F7F8FA"` | `colors.bg.section` |
| `"#374151"` (2x) | `colors.text.body` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` | `colors.brand.primary` |
| `colors.brown.base` | `colors.text.accent` |
| `colors.gray.base` | `colors.text.muted` |
| `colors.green.active` | `colors.status.successActive` |
| `colors.red.inactive` | `colors.status.errorFade` |

---

### 5.2 — `src/components/CardBufaloLactacao/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |
| `"#000"` | `colors.black` |
| `"#1A1A1A"` | `colors.text.title` |
| `"#6B7280"` (2x) | `colors.text.muted` |
| `"#F7F8FA"` | `colors.bg.section` |
| `"#374151"` (2x) | `colors.text.body` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` | `colors.brand.primary` |
| `colors.gray.disabled` | `colors.border.default` |
| `colors.green.active` | `colors.status.successActive` |
| `colors.green.extra` | `colors.status.success` |
| `colors.green.text` | `colors.status.successText` |
| `colors.red.inactive` | `colors.status.errorFade` |
| `colors.red.extra` | `colors.status.error` |
| `colors.red.text` | `colors.status.errorText` |

---

### 5.3 — `src/components/CardBufaloReproduction/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |
| `"#000"` | `colors.black` |
| `"#1A1A1A"` | `colors.text.title` |
| `"#6B7280"` | `colors.text.muted` |
| `"#F7F8FA"` | `colors.bg.section` |
| `"#374151"` (2x) | `colors.text.body` |
| `"#FEF3C7"` (2x — badge Em andamento) | `colors.status.warningBg` |
| `"#D1FAE5"` (badge Concluída) | `colors.status.successBg` |
| `"#FEE2E2"` (badge Falhou) | `colors.status.errorBg` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.warning` (4x) | `colors.status.pendingBg` |
| `colors.green.active` | `colors.status.successActive` |
| `colors.red.inactive` | `colors.status.errorFade` |

---

### 5.4 — `src/components/AnimalInfoCard/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `'#fff'` | `colors.bg.card` |
| `'#000'` | `colors.black` |
| `'#1A1A1A'` | `colors.text.title` |
| `'#6B7280'` (2x) | `colors.text.muted` |
| `'#FEF3C7'` | `colors.status.warningBg` |
| `'#92400E'` | `colors.status.warningDark` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.base` | `colors.text.muted` |
| `colors.gray.disabled` | `colors.border.default` |
| `colors.green.extra` | `colors.status.success` |
| `colors.green.text` | `colors.status.successText` |
| `colors.red.extra` | `colors.status.error` |
| `colors.red.text` | `colors.status.errorText` |
| `colors.brown.base` | `colors.text.accent` |

**Commit:** `refactor(cards): use semantic color tokens`

---

## Tarefa 6 — Componentes de Tabela

### 6.1 — `src/components/TableLactation/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |
| `"#F3F4F6"` | `colors.bg.input` |
| `"#374151"` (2x) | `colors.text.body` |
| `"#111827"` | `colors.text.heading` |
| `"#2563EB"` | `colors.text.link` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.disabled` (2x) | `colors.border.default` |
| `colors.green.active` | `colors.status.successActive` |
| `colors.red.inactive` | `colors.status.errorFade` |

---

### 6.2 — `src/components/TableReproduction/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |
| `"#F3F4F6"` | `colors.bg.input` |
| `"#374151"` (2x) | `colors.text.body` |
| `"#111827"` | `colors.text.heading` |
| `"#2563EB"` | `colors.text.link` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.disabled` (2x) | `colors.border.default` |
| `colors.yellow.base` (chip de status) | `colors.brand.primary` |
| `colors.green.active` | `colors.status.successActive` |
| `colors.red.inactive` | `colors.status.errorFade` |

**Commit:** `refactor(tables): use semantic color tokens`

---

## Tarefa 7 — Componentes de Dashboard

### 7.1 — `src/components/DashLactacao/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.disabled` (2x) | `colors.border.default` |
| `colors.gray.base` (2x) | `colors.text.muted` |
| `colors.black.base` | `colors.black` |
| `colors.brown.base` (3x) | `colors.text.accent` |

---

### 7.2 — `src/components/DashReproducao/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.disabled` (2x) | `colors.border.default` |
| `colors.gray.base` (3x) | `colors.text.muted` |
| `colors.black.base` | `colors.black` |

---

### 7.3 — `src/components/DashPropriedade/index.tsx`

Não tem hardcoded. Apenas tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.white.base` | `colors.bg.card` |
| `colors.gray.disabled` (2x) | `colors.border.default` |
| `colors.gray.base` (2x) | `colors.text.muted` |
| `colors.black.base` (2x) | `colors.black` |

**Commit:** `refactor(dashboards): use semantic color tokens`

---

## Tarefa 8 — Componentes de Modal

### 8.1 — `src/components/Modal/index.tsx`

Adicione o import: `import { colors } from "../../styles/colors";`

| Valor hardcoded | Token |
|---|---|
| `"rgba(0,0,0,0.5)"` | `colors.overlay.modal` |
| `"#fff"` | `colors.bg.card` |

---

### 8.2 — `src/components/ModalAlertaDelete/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"rgba(0,0,0,0.4)"` | `colors.overlay.modalLight` |
| `"#333"` | `colors.text.heading` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.base` | `colors.text.muted` |

---

### 8.3 — `src/components/ModalBottomSheet/index.tsx`

Adicione o import: `import { colors } from "../../styles/colors";`

| Valor hardcoded | Token |
|---|---|
| `backgroundColor: "#FFF"` | `colors.bg.card` |
| `backgroundColor: "#D1D5DB"` (handle) | `colors.border.light` |
| `"#EEE"` (separador) | `colors.bg.subtle` |
| `color: "#111827"` (título) | `colors.text.heading` |

---

### 8.4 — `src/components/ModalStatus/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#555"` | `colors.text.muted` |
| `"#E5E7EB"` | `colors.border.default` |
| `"#374151"` | `colors.text.body` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.red.extra` | `colors.status.error` |
| `colors.green.extra` | `colors.status.success` |
| `colors.white.base` (3x) | `colors.text.onDark` |
| `colors.brown.base` | `colors.text.accent` |

---

### 8.5 — `src/components/ModalVisualizaçãoZootec/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"rgba(0,0,0,0.5)"` | `colors.overlay.modal` |
| `"#F8F7F5"` | `colors.bg.sheet` |
| `"#1A202C"` | `colors.text.heading` |
| `"#fff"` | `colors.bg.card` |
| `"#000"` | `colors.black` |
| `"#6B7280"` | `colors.text.muted` |
| `"#1A1A1A"` | `colors.text.title` |
| `"#E5E7EB"` | `colors.border.default` |
| `"#EF4444"` (2x) | `colors.status.error` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` (2x) | `colors.brand.primary` |
| `colors.yellow.dark` | `colors.brand.dark` |
| `colors.brown.base` | `colors.text.accent` |

**Commit:** `refactor(modals): use semantic color tokens`

---

## Tarefa 9 — Formulários independentes

### 9.1 — `src/components/FormBufalo/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `backgroundColor: "#fff"` | `colors.bg.card` |
| `"#eee"` | `colors.bg.subtle` |
| `borderColor: "#ccc"` | `colors.border.muted` |

---

### 9.2 — `src/components/FormSanitario/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `borderColor: "#ccc"` | `colors.border.muted` |
| `"#FFD700"` (estrela de rating) | `colors.brand.primary` |
| `color: "#fff"` (botão) | `colors.text.onDark` |

Strings nomeadas:
- `color: retorno ? "green" : "gray"` (linha ~114) → `color: retorno ? colors.status.success : colors.text.muted`

---

### 9.3 — `src/components/FormZootecnico/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `color: "#fff"` (botão) | `colors.text.onDark` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.disabled` | `colors.border.default` |
| `colors.yellow.base` | `colors.brand.primary` |

**Commit:** `refactor(forms): use semantic color tokens`

---

## Tarefa 10 — Busca e Seleção

### 10.1 — `src/components/SearchBar/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#F8F7F5"` | `colors.bg.sheet` |
| `color: '#666'` | `colors.text.muted` |
| `backgroundColor: '#EEE'` (chip inativo) | `colors.bg.subtle` |
| `backgroundColor: '#FFF'` (opção) | `colors.bg.card` |
| `backgroundColor: '#FFF9E7'` (opção ativa) | `colors.status.warningBg` |
| `color: '#444'` | `colors.text.body` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.red.base` | `colors.status.error` |
| `colors.yellow.base` (2x) | `colors.brand.primary` |
| `colors.brown.base` (2x) | `colors.text.accent` |

---

### 10.2 — `src/components/SimpleSearch/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#F5F5F5"` | `colors.bg.subtle` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.base` (2x) | `colors.text.muted` |
| `colors.gray.disabled` | `colors.border.default` |
| `colors.black.base` | `colors.black` |

---

### 10.3 — `src/components/SelectBottomSheet/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#eee"` | `colors.bg.subtle` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.white.base` (2x) | `colors.bg.card` |
| `colors.gray.disabled` | `colors.border.default` |
| `colors.yellow.warning` | `colors.status.pendingBg` |
| `colors.brown.base` | `colors.text.accent` |

---

### 10.4 — `src/components/SelectPropriedade/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.disabled` | `colors.border.default` |
| `colors.black.base` | `colors.black` |

**Commit:** `refactor(search-select): use semantic color tokens`

---

## Tarefa 11 — Componentes utilitários

### 11.1 — `src/components/Button/index.tsx`

Tokens antigos:

| Token antigo | Token novo | Observação |
|---|---|---|
| `colors.yellow.base` | `colors.brand.primary` | ⚠️ Corrige a cor do botão: era `#FFCF78`, deveria ser `#FAC638` |
| `colors.gray.disabled` | `colors.border.default` | botão desabilitado |

Valor hardcoded:
- `color="#000"` (ActivityIndicator) → `color={colors.black}`

---

### 11.2 — `src/components/DatePickerModal/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#111827"` (2x) | `colors.text.heading` |
| `"#F3F4F6"` | `colors.bg.input` |
| `"#FAC638"` | `colors.brand.primary` |
| `"#6B7280"` | `colors.text.muted` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.dark` (2x) | `colors.brand.dark` |
| `colors.brown.base` | `colors.text.accent` |

---

### 11.3 — `src/components/UserMenu/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |
| `"#000"` | `colors.black` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.button` | `colors.brand.primary` |
| `colors.red.base` (2x) | `colors.status.error` |

---

### 11.4 — `src/components/Movimentacoes/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |
| `"#F3F4F6"` | `colors.bg.input` |
| `"#4B5563"` | `colors.text.secondary` |
| `"#FEF3C7"` | `colors.status.warningBg` |
| `"#B45309"` | `colors.status.warningText` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.disabled` (2x) | `colors.border.default` |
| `colors.white.base` | `colors.bg.card` |
| `colors.black.base` (2x) | `colors.black` |

---

### 11.5 — `src/components/Lembretes/index.tsx`

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` (3x) | `colors.brand.primary` |
| `colors.yellow.warning` | `colors.status.pendingBg` |
| `colors.gray.base` (2x) | `colors.text.muted` |
| `colors.gray.disabled` | `colors.border.default` |
| `colors.white.base` | `colors.bg.card` |
| `colors.brown.base` (3x) | `colors.text.accent` |

---

### 11.6 — `src/components/Tabs/index.tsx`

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.white.base` | `colors.bg.card` |
| `colors.yellow.base` | `colors.brand.primary` |
| `colors.brown.base` | `colors.text.accent` |
| `colors.gray.base` | `colors.text.muted` |

---

### 11.7 — `src/components/Loading/index.tsx`

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.dark` | `colors.brand.dark` |
| `colors.brown.base` | `colors.text.accent` |

---

### 11.8 — `src/components/BufaloLoader/index.tsx`

Adicione o import: `import { colors } from "../../styles/colors";`

| Valor hardcoded | Token |
|---|---|
| `"rgba(255,255,255,0.35)"` | `colors.overlay.whiteGlass` |

---

### 11.9 — `src/components/SanitarioCard/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#000"` | `colors.black` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.white.base` | `colors.bg.card` |
| `colors.yellow.base` | `colors.brand.primary` |
| `colors.brown.base` (3x) | `colors.text.accent` |
| `colors.gray.text` | `colors.text.placeholder` |
| `colors.red.base` | `colors.status.error` |

---

### 11.10 — `src/components/ZootecnicoCard/index.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#000"` | `colors.black` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.white.base` | `colors.bg.card` |
| `colors.yellow.base` | `colors.brand.primary` |
| `colors.brown.base` (3x) | `colors.text.accent` |
| `colors.gray.text` | `colors.text.placeholder` |
| `colors.red.base` | `colors.status.error` |

**Commit:** `refactor(components): use semantic color tokens — utilities`

---

## Tarefa 12 — Telas (Screens)

### 12.1 — `src/screens/LoginScreen.tsx`

| Valor hardcoded | Token |
|---|---|
| `borderColor: "#ccc"` | `colors.border.muted` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.black.base` | `colors.black` |

Strings nomeadas:
- `color: "red"` (linha ~78) → `color: colors.status.error`

---

### 12.2 — `src/screens/HomeScreen.tsx`

| Valor hardcoded | Token |
|---|---|
| `'#222'` | `colors.text.heading` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` | `colors.brand.primary` |
| `colors.yellow.dark` | `colors.brand.dark` |

---

### 12.3 — `src/screens/RebanhoScreen.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#fff"` | `colors.bg.card` |
| `"#374151"` | `colors.text.body` |
| `'#E5E7EB'` | `colors.border.default` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` (9x) | `colors.brand.primary` |
| `colors.yellow.dark` (3x) | `colors.brand.dark` |
| `colors.brown.base` (2x) | `colors.text.accent` |
| `colors.gray.disabled` (2x) | `colors.border.default` |
| `colors.green.active` (3x) | `colors.status.successActive` |
| `colors.black.base` | `colors.black` |
| `colors.white.base` | `colors.bg.card` |

---

### 12.4 — `src/screens/AnimalDetailScreen.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#374151"` | `colors.text.body` |
| `"#000"` | `colors.black` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.gray.disabled` | `colors.border.default` |
| `colors.yellow.base` (2x) | `colors.brand.primary` |
| `colors.brown.base` (2x) | `colors.text.accent` |
| `colors.gray.base` | `colors.text.muted` |

---

### 12.5 — `src/screens/LactacaoScreen.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#374151"` | `colors.text.body` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` (6x) | `colors.brand.primary` |
| `colors.brown.base` | `colors.text.accent` |

---

### 12.6 — `src/screens/ReproducaoScreen.tsx`

| Valor hardcoded | Token |
|---|---|
| `'#374151'` | `colors.text.body` |
| `color="#FFF"` (ícone Plus) | `colors.text.onDark` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` (4x) | `colors.brand.primary` |
| `colors.brown.base` | `colors.text.accent` |

---

### 12.7 — `src/screens/PiquetesScreen.tsx`

| Valor hardcoded | Token |
|---|---|
| `'#fff'` | `colors.bg.card` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` (4x) | `colors.brand.primary` |
| `colors.yellow.dark` | `colors.brand.dark` |
| `colors.brown.base` (2x) | `colors.text.accent` |
| `colors.gray.disabled` | `colors.border.default` |

---

### 12.8 — `src/screens/NotificacoesScreen.tsx`

| Valor hardcoded | Token |
|---|---|
| `"#F5F5F5"` | `colors.bg.subtle` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.brown.base` (3x) | `colors.text.accent` |
| `colors.yellow.base` (2x) | `colors.brand.primary` |
| `colors.yellow.dark` | `colors.brand.dark` |

---

### 12.9 — `src/screens/NfcScannerScreen.tsx`

O arquivo já usa `colors` corretamente em sua maioria. Nenhum hardcoded crítico além de:

| Valor hardcoded | Token |
|---|---|
| `shadowColor: '#000'` (linha ~153) | `colors.black` |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.white.base` (2x) | `colors.bg.card` |
| `colors.brown.base` (2x) | `colors.text.accent` |
| `colors.gray.disabled` | `colors.border.default` |
| `colors.gray.base` (2x) | `colors.text.muted` |
| `colors.black.base` | `colors.black` |
| `colors.yellow.static` | `colors.brand.static` |
| `colors.yellow.dark` | `colors.brand.dark` |

**Commit:** `refactor(screens): use semantic color tokens`

---

## Tarefa 13 — `App.tsx`

O arquivo já importa `colors`. Substitua strings nomeadas e tokens antigos:

| Valor hardcoded | Token | Local |
|---|---|---|
| `tabBarInactiveTintColor: "gray"` | `colors.text.muted` | screenOptions |
| `stroke={focused ? colors.yellow.dark : 'gray'}` (5x) | `stroke={focused ? colors.brand.dark : colors.text.muted}` | ícones de tab |
| `fill={focused ? colors.yellow.dark : 'gray'}` (4x) | `fill={focused ? colors.brand.dark : colors.text.muted}` | ícones de tab |

Tokens antigos:

| Token antigo | Token novo |
|---|---|
| `colors.yellow.base` | `colors.brand.primary` |
| `colors.yellow.dark` | `colors.brand.dark` |
| `colors.brown.base` | `colors.text.accent` |

**Commit:** `refactor(App): use semantic color tokens`

---

## Tarefa 14 — `src/layouts/MainLayout/index.tsx`

Adicione o import: `import { colors } from "../../styles/colors";`

| Valor hardcoded | Token |
|---|---|
| `backgroundColor = '#f6f3f4'` (prop default) | `colors.bg.screen` |

**Commit:** `refactor(MainLayout): use semantic screen background token`

---

## Tarefa 15 — `src/components/Mapa/index.tsx`

O Mapa usa estilos CSS inline em uma string (não StyleSheet). Localize:
- `color: #fff;` → `color: ${colors.bg.card};`
- `box-shadow: 3px 3px 3px rgba(0,0,0,0.8);` → `box-shadow: 3px 3px 3px ${colors.overlay.dark};`

Adicione o import: `import { colors } from "../../styles/colors";`

**Commit:** `refactor(Mapa): use semantic color tokens in CSS-in-JS`

---

## Tarefa 16 — Serviços (não alterar comportamento)

`src/services/grupoService.ts` e `src/services/piqueteService.ts` usam `#000000` como fallback de cor de grupo (cor vem do backend).

**Não alterar** — esse `#000000` é um fallback de dado do servidor, não uma cor de UI. Deixar como está ou documentar com comentário: `// fallback para grupos sem cor cadastrada`.

---

## Tarefa 17 — Limpeza final de `src/styles/colors.ts`

Após todas as tarefas anteriores estarem completas e o app estar funcionando sem erros:

1. Verifique que nenhum arquivo ainda usa os grupos antigos:
   ```bash
   grep -rn "colors\.\(yellow\|gray\|green\|red\|black\.\|white\.\|brown\)\." src/ App.tsx
   ```
   O resultado deve ser **vazio**.

2. Se estiver vazio, remova os grupos legados do arquivo `src/styles/colors.ts` (tudo que não faz parte de `brand`, `text`, `bg`, `border`, `status`, `overlay`, `white`, `black`).

3. Se ainda houver usos, corrija-os antes de remover.

**Commit:** `refactor(colors): remove legacy token groups`

---

## Ícones (`src/icons/`)

Os arquivos em `src/icons/` usam cores hardcoded como valores default de props (ex: `fill="#000"`). Esses são defaults de SVG, não cores de UI — **não precisam ser alterados**. Quando necessário, o componente que usa o ícone passa a cor via prop.

---

## Ordem de execução recomendada

```
1 → 2.1 a 2.11 (em qualquer ordem) → commit
3 → 4 → commit
5.1 a 5.4 → 6.1 a 6.2 → commit
7.1 a 7.3 → 8.1 a 8.5 → commit
9.1 a 9.3 → 10.1 a 10.4 → 11.1 a 11.10 → commit
12.1 a 12.9 → 13 → 14 → 15 → commit
16 (skip) → 17 (verificação + limpeza) → commit final
```
