# Gestão de Lotes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o módulo de Piquetes para uma tela de Gestão de Lotes operacional, com lista de lotes e grupos como foco principal e mapa como recurso secundário/contextual.

**Architecture:** A `PiquetesScreen` atual é reescrita para expor dois sub-tabs (Lotes | Grupos). Novos componentes de card, bottom sheets de ação rápida e hooks de fetch são introduzidos. O mapa continua existindo dentro de um `LoteDetailSheet`, acessível por card, mas não é mais a view inicial.

**Tech Stack:** React Native 0.81, TypeScript, @gorhom/bottom-sheet v5, react-native-maps, apiFetch (lib/apiClient), colors (styles/colors)

---

## ETAPA 1 — ANÁLISE

### 1.1 Design Stitch (projeto 1385889247273663894)

Dois wireframes "Gestão de Lotes" foram analisados:

**Screen A — Visão de Lotes/Piquetes**
- Header simples com título "GESTÃO DE LOTES"
- Filtros em chips horizontais: `Todos` | `Ocupados` | `Vazios` | `Descanso`
- Grid de cards de lote, cada card contendo:
  - Badge de status colorido (`Em Pastoreio`, `Em Descanso`, `Atenção Urgente`, `Manejo Sanitário`)
  - Nome do lote (ex: "Lote 01 (Piquete Norte)")
  - Contagem de animais
  - Percentual de ocupação com barra visual
  - Condição do capim (campo operacional)
  - Ícones de ação: ver detalhes e transferir grupo
- Nav inferior: Dashboard | Lotes | Mapa | Transferência

**Screen B — Visão de Grupos/Batches**
- Header com controles: sync, busca, configurações
- 4 cards grandes de grupo, cada um com:
  - Nome do grupo (ex: "Nelore Matrizes")
  - Localização atual (ex: "Piquete 04")
  - Badge de status com cor
  - Barra de ocupação
  - Contagem de cabeças
- Widget de recomendação contextual (rotação de pasto)
- Nav inferior: Dashboard | Lotes | Mapa | Histórico

**Conclusão UX:** A tela principal deve ser split em dois sub-tabs. O Mapa é secundário — acessível apenas via detalhe do lote.

---

### 1.2 Estado Atual do App

**PiquetesScreen:**
- Atualmente renderiza **só o mapa** como view principal
- FAB único: "ADICIONAR NOVO PIQUETE"
- Abre `DemarcacaoPiqueteSheet` (bottom sheet com mapa + form de demarcação)
- Zero leitura rápida de estado operacional

**Design System existente:**
- Cores: `colors.brand.*`, `colors.text.*`, `colors.bg.*`, `colors.status.*`, `colors.border.*`
- Cards: padrão com status bar lateral esquerda (ver `CardBufaloRebanho`)
  - `backgroundColor: colors.bg.card`, `borderRadius: 12`, `elevation: 2`
- Bottom Sheets: `@gorhom/bottom-sheet`, `BottomSheetScrollView`, backdrop, snapPoints `["70%", "95%"]`
- Inputs: `height: 50`, `borderRadius: 12`, `borderColor: colors.border.default`, `backgroundColor: colors.bg.card`
- Labels de input: `fontSize: 14`, `color: colors.text.secondary`, `fontWeight: "600"`, `marginBottom: 4`
- Select: `SelectBottomSheet` component em `src/components/SelectBottomSheet`
- Loading state: `BuffaloLoader` component
- Chips: `backgroundColor: colors.bg.section`, `borderRadius: 8`, padding `8x4`

**Componentes reutilizáveis (não duplicar):**
- `DemarcacaoPiqueteSheet` → manter como está (criação de novo lote)
- `SelectBottomSheet` → usar nos novos forms
- `BuffaloLoader` → usar nos estados de loading
- `MapLeaflet` → usar dentro do `LoteDetailSheet`
- `CardBufalo` → referência de padrão de card
- `ModalAlertaDelete` → reutilizar para confirmar movimentações/exclusões

---

### 1.3 API — Entidades e Endpoints

#### Lote (Piquete físico)
**Endpoint:** `/lotes`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/lotes/propriedade/:id_propriedade` | Lista lotes com grupo associado e geo_mapa |
| POST | `/lotes` | Cria lote com geo_mapa GeoJSON |
| GET | `/lotes/:id` | Busca lote específico |
| PATCH | `/lotes/:id` | Atualiza lote |
| DELETE | `/lotes/:id` | Remove lote |

**Campos de criação (nomes exatos do DTO):**
```ts
{
  nomeLote: string;        // obrigatório
  idPropriedade: string;   // UUID obrigatório
  idGrupo?: string;        // UUID opcional — grupo que ocupa o lote
  tipoLote?: string;       // ex: "Pasto"
  status?: string;         // ex: "ativo"
  descricao?: string;
  qtd_max?: number;        // ⚠️ snake_case no DTO da API
  area_m2?: number;        // ⚠️ snake_case no DTO da API
  geo_mapa?: string;       // ⚠️ snake_case — GeoJSON stringificado
}
```

> ⚠️ **BUG EXISTENTE:** `DemarcacaoPiqueteSheet` envia `qtdMax`, `areaM2`, `geoMapa` (camelCase), mas o DTO da API espera `qtd_max`, `area_m2`, `geo_mapa`. Os campos são opcionais, então a criação não quebra mas perde os dados de área e geometria. Corrigir nos novos services.

**Resposta de GET /lotes/propriedade/:id:**
```ts
[{
  idLote: string;
  nomeLote: string;
  idPropriedade: string;
  idGrupo?: string;
  tipoLote?: string;
  status?: string;
  qtd_max?: number;
  area_m2?: number;
  geoMapa?: { type: "Polygon"; coordinates: number[][][] }; // parseado pelo backend
  grupo?: {
    idGrupo: string;
    nomeGrupo: string;
    color: string;
  };
}]
```

#### Grupo (Lote de animais)
**Endpoint:** `/grupos`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/grupos/propriedade/:id` | Lista grupos com paginação |
| GET | `/grupos/:id` | Busca grupo específico |
| POST | `/grupos` | Cria grupo |
| PATCH | `/grupos/:id` | Atualiza grupo |
| DELETE | `/grupos/:id` | Soft delete |
| POST | `/grupos/:id/restore` | Restaura grupo |

**Campos de criação:**
```ts
{
  nomeGrupo: string;    // obrigatório, max 50 chars
  idPropriedade: string; // UUID obrigatório
  color?: string;        // hex ex: "#FF5733", max 7 chars
}
```

#### Movimentação de Lote
**Endpoint:** `/mov-lote`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/mov-lote` | Registra movimentação física de grupo para novo lote |
| GET | `/mov-lote/propriedade/:id` | Lista movimentações da propriedade |
| GET | `/mov-lote/historico/grupo/:id_grupo` | Histórico completo de um grupo |
| GET | `/mov-lote/status/grupo/:id_grupo` | Localização atual + dias no local |

**Criação de movimentação:**
```ts
{
  idPropriedade: string;  // UUID obrigatório
  idGrupo: string;        // UUID obrigatório
  idLoteAtual: string;    // UUID obrigatório — lote de destino
  idLoteAnterior?: string; // UUID opcional — detectado automaticamente
  dtEntrada: string;      // ISO 8601 ex: "2026-05-19T08:00:00Z"
  dtSaida?: string;       // ISO 8601 opcional
}
```

**Resposta de status atual:**
```ts
{
  grupo_id: string;
  localizacao_atual: {
    id_lote: string;
    desde: string;       // ISO 8601
    dias_no_local: number;
  };
}
```

**Resposta de histórico:**
```ts
{
  grupo_id: string;
  total_movimentacoes: number;
  historico: Array<{
    id_movimento: string;
    id_lote_anterior: string | null;
    id_lote_atual: string;
    dt_entrada: string;
    dt_saida: string | null;
    dias_permanencia: number;
    status: "Finalizado" | "Atual";
  }>;
}
```

---

### 1.4 Gaps Identificados

| Gap | Prioridade |
|-----|-----------|
| `piqueteService` sem `findById`, `update`, `delete` | Alta |
| `piqueteService` com nomes de campos errados (`qtdMax` → `qtd_max`) | Alta |
| `grupoService` sem `create`, `update`, `delete` | Alta |
| `movLoteService` inexistente | Alta |
| `PiquetesScreen` map-first (UX incorreto) | Crítico |
| `CardLote` component inexistente | Alta |
| `CardGrupo` component inexistente | Alta |
| `MovimentacaoSheet` inexistente | Alta |
| `FormGrupo` bottom sheet inexistente | Média |
| `LoteDetailSheet` inexistente | Média |

---

## ETAPA 2 — ESTRATÉGIA

### 2.1 Implementação
- Tasks independentes e sequenciais por camada: services → hooks → components → screen
- Nenhuma task cria dependências circulares
- Cada task é auto-contida e commitável
- A `PiquetesScreen` é a última task (depende de tudo)

### 2.2 Refatoração
- `piqueteService.ts` recebe métodos adicionais + correção dos nomes de campos
- `grupoService.ts` recebe métodos de escrita
- `DemarcacaoPiqueteSheet` continua existindo mas o bug de campo é corrigido no service, não no componente

### 2.3 Reaproveitamento
- `DemarcacaoPiqueteSheet` → reutilizado para criação de lote (sem mudança)
- `SelectBottomSheet` → usado nos novos forms
- `ModalAlertaDelete` → usado para confirmar exclusões e movimentações destrutivas
- `BuffaloLoader` → loading states
- `MapLeaflet` → dentro de `LoteDetailSheet`
- Padrão de card de `CardBufaloRebanho` → base visual dos novos cards
- Padrão de bottom sheet de `DemarcacaoPiqueteSheet` → base dos novos sheets

### 2.4 Componentização
- **Smart containers** na Screen (fetch, state, handlers)
- **Dumb components** nos Cards (recebem dados via props, emitem eventos via callbacks)
- **Bottom Sheets** gerenciam seu próprio form state interno

---

## ETAPA 3 — DESIGN SYSTEM

### Cards

**CardLote**
```
┌─────────────────────────────────────────────┐
│ ▌ [cor do grupo]                            │  ← status bar esquerda (5px)
│   Nome do Lote              [badge status]  │
│   Grupo: Grupo A          📍 Área: 10.000m² │
│                                             │
│   [chip: 45 animais]  [chip: 90% ocupação]  │
│                                    [→ mapa] │
└─────────────────────────────────────────────┘
```

- Status bar cor: `grupo.color` se ocupado, `colors.border.muted` se vazio
- Badge status: "Ocupado" (success) | "Vazio" (muted) | "Descanso" (warning)
- Ação: `onPress` → abre `LoteDetailSheet`

**CardGrupo**
```
┌─────────────────────────────────────────────┐
│ ●  [cor do grupo]  Nome do Grupo            │  ← circle color indicator
│    📍 Lote: Piquete Norte   • 12 dias       │
│    [N animais]   [transferir]               │
└─────────────────────────────────────────────┘
```

- Círculo colorido: `grupo.color`
- Localização atual via `/mov-lote/status/grupo/:id`
- Ação transferir: abre `MovimentacaoSheet`

### Bottom Sheets

**MovimentacaoSheet** — Move grupo de lote
- Snappoints: `["55%", "80%"]`
- Header: "Mover Grupo"
- Mostra: grupo nome, lote atual, seletor de lote destino, datepicker de entrada
- Botão: "Confirmar Movimentação"

**FormGrupo** — Cria/edita grupo
- Snappoints: `["60%", "85%"]`
- Campos: Nome do grupo, Cor (color picker simples com swatches predefinidos)
- Botão: "Salvar Grupo"

**LoteDetailSheet** — Detalhe de lote
- Snappoints: `["50%", "90%"]`
- Seções: Info (nome, status, área, capacidade), Grupo atual, Mini mapa
- Ações: Editar lote, Mover grupo, Ver histórico

### Filtros / Chips

Na tab Lotes:
```
[Todos] [Ocupados] [Vazios] [Descanso]
```
Estilo: chip ativo com `backgroundColor: colors.brand.primary`, inativo com `colors.bg.section`

### Navegação interna (sub-tabs)

```
[  LOTES  |  GRUPOS  ]
```
Linha indicadora `backgroundColor: colors.brand.dark`, 2px underline, estilo segmented.

---

## ETAPA 4 — ESTRUTURA TÉCNICA

### Arquivos a criar

```
src/
  services/
    movLoteService.ts              ← NOVO
  
  hooks/
    useLotes.ts                    ← NOVO
    useGrupos.ts                   ← NOVO
  
  components/
    CardLote/
      index.tsx                    ← NOVO
    CardGrupo/
      index.tsx                    ← NOVO
    MovimentacaoSheet/
      index.tsx                    ← NOVO
    FormGrupo/
      index.tsx                    ← NOVO
    LoteDetailSheet/
      index.tsx                    ← NOVO
```

### Arquivos a modificar

```
src/
  services/
    piqueteService.ts              ← ADD findById, update, delete + FIX field names
    grupoService.ts                ← ADD create, update, delete
  
  screens/
    PiquetesScreen.tsx             ← REWRITE completo
```

### Interfaces TypeScript

```ts
// piqueteService.ts
export interface Lote {
  id: string;          // idLote
  nome: string;        // nomeLote
  status?: string;
  tipoLote?: string;
  qtdMax?: number;     // qtd_max da API
  areaM2?: number;     // area_m2 da API
  coords: { latitude: number; longitude: number }[];
  idGrupo?: string;
  grupoNome?: string;
  grupoCor?: string;
}

// grupoService.ts
export interface Grupo {
  id: string;         // idGrupo
  nome: string;       // nomeGrupo
  color: string;
  idPropriedade?: string;
}

// movLoteService.ts
export interface StatusGrupo {
  grupo_id: string;
  localizacao_atual: {
    id_lote: string;
    desde: string;
    dias_no_local: number;
  };
}

export interface MovimentacaoHistorico {
  id_movimento: string;
  id_lote_anterior: string | null;
  id_lote_atual: string;
  dt_entrada: string;
  dt_saida: string | null;
  dias_permanencia: number;
  status: "Finalizado" | "Atual";
}
```

### Hooks

```ts
// useLotes.ts
const { lotes, loading, refresh } = useLotes(propriedadeSelecionada)

// useGrupos.ts
const { grupos, loading, refresh } = useGrupos(propriedadeSelecionada)
```

### PiquetesScreen — Nova estrutura

```tsx
<View>
  <Header title="GESTÃO DE LOTES" />
  <SubTabBar tabs={['Lotes', 'Grupos']} />

  {activeTab === 'Lotes' && (
    <>
      <FilterChips filters={['Todos', 'Ocupados', 'Vazios', 'Descanso']} />
      <FlatList data={filteredLotes} renderItem={CardLote} />
      <FAB onPress={openNovoLoteSheet} />
    </>
  )}

  {activeTab === 'Grupos' && (
    <>
      <FlatList data={grupos} renderItem={CardGrupo} />
      <FAB onPress={openNovoGrupoSheet} />
    </>
  )}
</View>
```

---

## ETAPA 5 — ROADMAP

### Quick Wins (tasks 1-3)
Adicionar métodos faltantes nos services existentes + corrigir bug de campos. Risco zero — são adições puras.

### Core (tasks 4-8)
Criar hooks e componentes novos. Independentes entre si após os services estarem prontos.

### Integration (tasks 9-11)
Bottom sheets de ação + rewrite da screen. Maior risco — testar bem o fluxo de movimentação.

### Riscos
| Risco | Mitigação |
|-------|-----------|
| movLoteService: lote anterior detectado automaticamente pela API | Não enviar `idLoteAnterior` no body — API auto-detecta |
| MapLeaflet dentro de BottomSheet pode ter conflito de gestos | Usar `enableContentPanningGesture={false}` como já feito no DemarcacaoPiqueteSheet |
| ColorPicker de grupo muito complexo | Usar lista de swatches fixos (8 cores predefinidas) |
| Integração de dtEntrada no MovimentacaoSheet | Usar `DatePickerModal` que já existe no projeto |

### Dependências entre tasks
```
Task 1 (fix piqueteService) ──┐
Task 2 (ext grupoService)  ──┤──→ Task 4 (useLotes)  ──┐
Task 3 (movLoteService)    ──┘──→ Task 5 (useGrupos) ──┤──→ Tasks 6-10 → Task 11 (Screen)
```

---

## ETAPA 6 — TASKS

---

### Task 1: Corrigir e estender `piqueteService.ts`

**Objetivo:** Corrigir os nomes de campos para corresponder exatamente ao DTO da API e adicionar `findById`, `update`, `delete`.

**Arquivos:**
- Modify: `src/services/piqueteService.ts`

**Contexto crítico:**
- A API espera `qtd_max`, `area_m2`, `geo_mapa` (snake_case), mas o service atualmente envia `qtdMax`, `areaM2`, `geoMapa`
- Interface `Piquete` é usada pelo `DemarcacaoPiqueteSheet` e `PiquetesScreen` — preservar compatibilidade
- `apiFetch` importado de `../lib/apiClient`

- [ ] **Step 1.1: Atualizar a interface `NovoPiqueteDTO` com campos corretos**

```ts
export interface NovoPiqueteDTO {
  nomeLote: string;
  idPropriedade: string;
  idGrupo: string;
  tipoLote: string;
  status: string;
  descricao?: string;
  qtd_max: number;      // era qtdMax — CORRIGIDO
  area_m2: number;      // era areaM2 — CORRIGIDO
  geo_mapa: {           // era geoMapa — CORRIGIDO
    type: "Polygon";
    coordinates: number[][][];
  };
}
```

- [ ] **Step 1.2: Corrigir o método `create` para enviar os campos corretos**

Substituir em `piqueteService.create`:
```ts
async create(novoPiquete: NovoPiqueteDTO): Promise<Piquete> {
  const body = {
    nomeLote: novoPiquete.nomeLote,
    idPropriedade: novoPiquete.idPropriedade,
    idGrupo: novoPiquete.idGrupo,
    tipoLote: novoPiquete.tipoLote,
    status: novoPiquete.status,
    descricao: novoPiquete.descricao,
    qtd_max: novoPiquete.qtd_max,
    area_m2: novoPiquete.area_m2,
    geo_mapa: JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          ...novoPiquete.geo_mapa.coordinates[0],
          novoPiquete.geo_mapa.coordinates[0][0],
        ],
      ],
    }),
  };

  const response = await apiFetch("/lotes", {
    method: "POST",
    body,
  });

  const coords =
    response.geoMapa?.coordinates?.[0]?.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0],
    })) ?? [];

  return {
    id: response.idLote,
    nome: response.nomeLote,
    coords,
    idGrupo: response.idGrupo ?? null,
    grupoNome: response.grupo?.nomeGrupo ?? "",
    grupoCor: response.grupo?.color ?? "#000000",
    color: response.grupo?.color ?? "#000000",
  } as Piquete;
},
```

- [ ] **Step 1.3: Adicionar métodos `findById`, `update`, `delete` no objeto `piqueteService`**

Adicionar após o método `create`:
```ts
async findById(id: string): Promise<Piquete> {
  const item = await apiFetch(`/lotes/${id}`);
  const coords =
    item.geoMapa?.coordinates?.[0]?.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0],
    })) ?? [];
  return {
    id: item.idLote,
    nome: item.nomeLote,
    coords,
    idGrupo: item.grupo?.idGrupo ?? null,
    grupoNome: item.grupo?.nomeGrupo ?? "",
    grupoCor: item.grupo?.color ?? "#000000",
    color: item.grupo?.color ?? "#000000",
  } as Piquete;
},

async update(id: string, data: Partial<NovoPiqueteDTO>): Promise<Piquete> {
  const item = await apiFetch(`/lotes/${id}`, {
    method: "PATCH",
    body: data,
  });
  const coords =
    item.geoMapa?.coordinates?.[0]?.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0],
    })) ?? [];
  return {
    id: item.idLote,
    nome: item.nomeLote,
    coords,
    idGrupo: item.grupo?.idGrupo ?? null,
    grupoNome: item.grupo?.nomeGrupo ?? "",
    grupoCor: item.grupo?.color ?? "#000000",
    color: item.grupo?.color ?? "#000000",
  } as Piquete;
},

async delete(id: string): Promise<void> {
  await apiFetch(`/lotes/${id}`, { method: "DELETE" });
},
```

- [ ] **Step 1.4: Corrigir `DemarcacaoPiqueteSheet` para usar os campos corrigidos**

Arquivo: `src/components/DemarcacaoPiqueteSheet/index.tsx`

Localizar o objeto `novoPiquete` e corrigir:
```ts
const novoPiquete = {
  nomeLote: nomePiquete,
  idPropriedade: propriedadeId.toString(),
  idGrupo: selectedGrupoId,
  tipoLote: "Pasto",
  status: "ativo",
  descricao: "",
  qtd_max: quantidadeMaxAnimais,          // era qtdMax
  area_m2: calcularArea(demarcacaoCoords), // era areaM2
  geo_mapa: {                              // era geoMapa
    type: "Polygon" as const,
    coordinates: [
      demarcacaoCoords.map(c => [c.longitude, c.latitude])
        .concat([[demarcacaoCoords[0].longitude, demarcacaoCoords[0].latitude]])
    ]
  }
};
```

- [ ] **Step 1.5: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "(piqueteService|DemarcacaoPiqueteSheet)"
```

Expected: sem erros relacionados a esses arquivos.

- [ ] **Step 1.6: Commit**

```bash
git add src/services/piqueteService.ts src/components/DemarcacaoPiqueteSheet/index.tsx
git commit -m "fix(services): corrigir nomes de campos snake_case na API de lotes e adicionar CRUD completo"
```

---

### Task 2: Estender `grupoService.ts`

**Objetivo:** Adicionar `create`, `update`, `delete` ao service de grupos.

**Arquivos:**
- Modify: `src/services/grupoService.ts`

**Contexto:** API usa `/grupos`. Soft delete com POST `/grupos/:id/restore`.

- [ ] **Step 2.1: Atualizar interface `Grupo` e adicionar `NovoGrupoDTO`**

```ts
export interface Grupo {
  id: string;            // idGrupo
  nome: string;          // nomeGrupo
  color: string;
  idPropriedade?: string;
}

export interface NovoGrupoDTO {
  nomeGrupo: string;
  idPropriedade: string;
  color?: string;
}
```

- [ ] **Step 2.2: Adicionar métodos `create`, `update`, `delete` no objeto `grupoService`**

```ts
async create(data: NovoGrupoDTO): Promise<Grupo> {
  const response = await apiFetch("/grupos", {
    method: "POST",
    body: data,
  });
  return {
    id: response.idGrupo,
    nome: response.nomeGrupo,
    color: response.color || "#000000",
    idPropriedade: response.idPropriedade,
  };
},

async update(id: string, data: Partial<NovoGrupoDTO>): Promise<Grupo> {
  const response = await apiFetch(`/grupos/${id}`, {
    method: "PATCH",
    body: data,
  });
  return {
    id: response.idGrupo,
    nome: response.nomeGrupo,
    color: response.color || "#000000",
    idPropriedade: response.idPropriedade,
  };
},

async delete(id: string): Promise<void> {
  await apiFetch(`/grupos/${id}`, { method: "DELETE" });
},
```

- [ ] **Step 2.3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "grupoService"
```

Expected: sem erros.

- [ ] **Step 2.4: Commit**

```bash
git add src/services/grupoService.ts
git commit -m "feat(services): adicionar create, update, delete no grupoService"
```

---

### Task 3: Criar `movLoteService.ts`

**Objetivo:** Service completo para movimentações físicas de grupos entre lotes.

**Arquivos:**
- Create: `src/services/movLoteService.ts`

- [ ] **Step 3.1: Criar o arquivo com interfaces e service**

```ts
import { apiFetch } from "../lib/apiClient";

export interface NovaMovimentacaoDTO {
  idPropriedade: string;
  idGrupo: string;
  idLoteAtual: string;
  idLoteAnterior?: string;
  dtEntrada: string; // ISO 8601
}

export interface StatusGrupo {
  grupo_id: string;
  localizacao_atual: {
    id_lote: string;
    desde: string;
    dias_no_local: number;
  };
}

export interface HistoricoMovimento {
  id_movimento: string;
  id_lote_anterior: string | null;
  id_lote_atual: string;
  dt_entrada: string;
  dt_saida: string | null;
  dias_permanencia: number;
  status: "Finalizado" | "Atual";
}

export interface HistoricoGrupo {
  grupo_id: string;
  total_movimentacoes: number;
  historico: HistoricoMovimento[];
}

export const movLoteService = {
  async create(data: NovaMovimentacaoDTO): Promise<void> {
    await apiFetch("/mov-lote", {
      method: "POST",
      body: data,
    });
  },

  async findByPropriedade(
    idPropriedade: string,
    page = 1,
    limit = 20
  ): Promise<{ data: any[]; meta: any }> {
    return apiFetch(
      `/mov-lote/propriedade/${idPropriedade}?page=${page}&limit=${limit}`
    );
  },

  async findStatusAtual(idGrupo: string): Promise<StatusGrupo> {
    return apiFetch(`/mov-lote/status/grupo/${idGrupo}`);
  },

  async findHistoricoGrupo(idGrupo: string): Promise<HistoricoGrupo> {
    return apiFetch(`/mov-lote/historico/grupo/${idGrupo}`);
  },
};
```

- [ ] **Step 3.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "movLoteService"
```

Expected: sem erros.

- [ ] **Step 3.3: Commit**

```bash
git add src/services/movLoteService.ts
git commit -m "feat(services): adicionar movLoteService com create, status e histórico"
```

---

### Task 4: Criar hook `useLotes.ts`

**Objetivo:** Hook de fetch de lotes com refresh e filtros.

**Arquivos:**
- Create: `src/hooks/useLotes.ts`

**Contexto:** `piqueteService.getAll` já existe e retorna `Piquete[]`. O hook adiciona estado de loading, filtro por status e refresh.

- [ ] **Step 4.1: Criar o hook**

```ts
import { useState, useEffect, useCallback } from "react";
import { piqueteService, Piquete } from "../services/piqueteService";

export type FiltroLote = "Todos" | "Ocupados" | "Vazios" | "Descanso";

export function useLotes(propriedadeId: string | null) {
  const [lotes, setLotes] = useState<Piquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<FiltroLote>("Todos");

  const fetch = useCallback(async () => {
    if (!propriedadeId) return;
    try {
      const data = await piqueteService.getAll(propriedadeId);
      setLotes(data);
    } catch (err) {
      console.error("useLotes: erro ao buscar lotes", err);
    } finally {
      setLoading(false);
    }
  }, [propriedadeId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  const lotesFiltrados = lotes.filter((l) => {
    if (filtro === "Todos") return true;
    if (filtro === "Ocupados") return !!l.idGrupo;
    if (filtro === "Vazios") return !l.idGrupo;
    if (filtro === "Descanso") return l.status === "descanso";
    return true;
  });

  return { lotes: lotesFiltrados, loading, refreshing, refresh, filtro, setFiltro };
}
```

- [ ] **Step 4.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "useLotes"
```

Expected: sem erros.

- [ ] **Step 4.3: Commit**

```bash
git add src/hooks/useLotes.ts
git commit -m "feat(hooks): adicionar useLotes com filtros e refresh"
```

---

### Task 5: Criar hook `useGrupos.ts`

**Objetivo:** Hook de fetch de grupos com refresh.

**Arquivos:**
- Create: `src/hooks/useGrupos.ts`

- [ ] **Step 5.1: Criar o hook**

```ts
import { useState, useEffect, useCallback } from "react";
import { grupoService, Grupo } from "../services/grupoService";

export function useGrupos(propriedadeId: string | null) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!propriedadeId) return;
    try {
      const data = await grupoService.getAllByPropriedade(propriedadeId);
      setGrupos(data);
    } catch (err) {
      console.error("useGrupos: erro ao buscar grupos", err);
    } finally {
      setLoading(false);
    }
  }, [propriedadeId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  return { grupos, loading, refreshing, refresh };
}
```

- [ ] **Step 5.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "useGrupos"
```

Expected: sem erros.

- [ ] **Step 5.3: Commit**

```bash
git add src/hooks/useGrupos.ts
git commit -m "feat(hooks): adicionar useGrupos com refresh"
```

---

### Task 6: Criar componente `CardLote`

**Objetivo:** Card visual para exibição de um lote/piquete na lista principal.

**Arquivos:**
- Create: `src/components/CardLote/index.tsx`

**Contexto visual:**
- Segue o padrão de `CardBufaloRebanho` (status bar lateral esquerda de 5px)
- Status bar cor = `grupoCor` se ocupado, `colors.border.muted` se vazio
- Badge: "Ocupado" (success), "Vazio" (muted), "Descanso" (warning)
- `onPress` abre `LoteDetailSheet`

- [ ] **Step 6.1: Criar o componente**

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import { Piquete } from "../../services/piqueteService";

type CardLoteProps = {
  lote: Piquete;
  onPress?: () => void;
  onMoverGrupo?: () => void;
};

function getStatusLabel(lote: Piquete): { label: string; bg: string; text: string } {
  if (lote.status === "descanso") {
    return { label: "Descanso", bg: colors.status.warningBg, text: colors.status.warningText };
  }
  if (lote.idGrupo) {
    return { label: "Ocupado", bg: colors.status.successBg, text: colors.status.successText };
  }
  return { label: "Vazio", bg: colors.bg.section, text: colors.text.muted };
}

export const CardLote: React.FC<CardLoteProps> = ({ lote, onPress, onMoverGrupo }) => {
  const barColor = lote.idGrupo ? (lote.grupoCor || colors.brand.dark) : colors.border.muted;
  const statusStyle = getStatusLabel(lote);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statusBar, { backgroundColor: barColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.nome} numberOfLines={1}>{lote.nome}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        {lote.idGrupo ? (
          <Text style={styles.grupo}>Grupo: {lote.grupoNome}</Text>
        ) : (
          <Text style={[styles.grupo, { color: colors.text.placeholder }]}>Sem grupo alocado</Text>
        )}

        <View style={styles.chipRow}>
          {lote.status && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{lote.tipoLote || "Pasto"}</Text>
            </View>
          )}
          {typeof lote.areaM2 === "number" && lote.areaM2 > 0 && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{(lote.areaM2 / 10000).toFixed(1)} ha</Text>
            </View>
          )}
        </View>
      </View>

      {onMoverGrupo && lote.idGrupo && (
        <TouchableOpacity style={styles.transferBtn} onPress={onMoverGrupo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.transferBtnText}>↔</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  statusBar: {
    width: 5,
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    padding: 12,
    paddingLeft: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nome: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.title,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  grupo: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    backgroundColor: colors.bg.section,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  transferBtn: {
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  transferBtnText: {
    fontSize: 20,
    color: colors.brand.dark,
  },
});
```

- [ ] **Step 6.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "CardLote"
```

Expected: sem erros.

- [ ] **Step 6.3: Commit**

```bash
git add src/components/CardLote/index.tsx
git commit -m "feat(components): adicionar CardLote com status visual e ação de transferência"
```

---

### Task 7: Criar componente `CardGrupo`

**Objetivo:** Card de grupo mostrando nome, localização atual e ação de movimentação.

**Arquivos:**
- Create: `src/components/CardGrupo/index.tsx`

**Contexto:** O componente recebe `statusAtual` opcional (pode ser null se o grupo nunca foi movido ou a API retornou erro). Não faz fetch interno — recebe dados via props.

- [ ] **Step 7.1: Criar o componente**

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import { Grupo } from "../../services/grupoService";
import { StatusGrupo } from "../../services/movLoteService";

type CardGrupoProps = {
  grupo: Grupo;
  statusAtual?: StatusGrupo | null;
  loteNome?: string;
  onMover?: () => void;
  onPress?: () => void;
};

export const CardGrupo: React.FC<CardGrupoProps> = ({
  grupo,
  statusAtual,
  loteNome,
  onMover,
  onPress,
}) => {
  const localAtual = statusAtual?.localizacao_atual;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.colorDot, { backgroundColor: grupo.color || colors.border.muted }]} />

      <View style={styles.content}>
        <Text style={styles.nome}>{grupo.nome}</Text>

        {localAtual ? (
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {loteNome || "Lote desconhecido"} • {localAtual.dias_no_local} {localAtual.dias_no_local === 1 ? "dia" : "dias"}
            </Text>
          </View>
        ) : (
          <Text style={styles.noLocation}>Sem localização registrada</Text>
        )}
      </View>

      {onMover && (
        <TouchableOpacity style={styles.moverBtn} onPress={onMover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.moverBtnText}>Mover</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  nome: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.title,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  noLocation: {
    fontSize: 13,
    color: colors.text.placeholder,
    fontStyle: "italic",
  },
  moverBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moverBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.accent,
  },
});
```

- [ ] **Step 7.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "CardGrupo"
```

Expected: sem erros.

- [ ] **Step 7.3: Commit**

```bash
git add src/components/CardGrupo/index.tsx
git commit -m "feat(components): adicionar CardGrupo com localização e ação de mover"
```

---

### Task 8: Criar `MovimentacaoSheet`

**Objetivo:** Bottom sheet para mover um grupo de um lote para outro.

**Arquivos:**
- Create: `src/components/MovimentacaoSheet/index.tsx`

**Contexto:**
- Recebe `grupo` e `propriedadeId` via props
- Lista de lotes disponíveis via `piqueteService.getAll`
- Usa `SelectBottomSheet` para selecionar lote destino
- Usa `DatePickerModal` (já existe em `src/components/DatePickerModal`) para a data de entrada
- Chama `movLoteService.create` no submit
- Callback `onSuccess` para refresh da lista pai

- [ ] **Step 8.1: Checar DatePickerModal props**

Ler brevemente `src/components/DatePickerModal/index.tsx` para entender a interface antes de usá-la. Se o componente não for compatível, usar um `TextInput` com placeholder de data no formato ISO.

- [ ] **Step 8.2: Criar o componente**

```tsx
import React, { useRef, useMemo, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, Alert, ToastAndroid, ActivityIndicator,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { Grupo } from "../../services/grupoService";
import { piqueteService, Piquete } from "../../services/piqueteService";
import { movLoteService } from "../../services/movLoteService";
import SelectBottomSheet from "../SelectBottomSheet";

type MovimentacaoSheetProps = {
  grupo: Grupo;
  propriedadeId: string;
  loteAtualId?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export const MovimentacaoSheet: React.FC<MovimentacaoSheetProps> = ({
  grupo,
  propriedadeId,
  loteAtualId,
  onClose,
  onSuccess,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["60%", "85%"], []);
  const [lotes, setLotes] = useState<{ label: string; value: string }[]>([]);
  const [loteDestinoId, setLoteDestinoId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    piqueteService.getAll(propriedadeId).then((data) => {
      const lotesDisponiveis = data
        .filter((l) => l.id !== loteAtualId)
        .map((l) => ({ label: l.nome, value: l.id }));
      setLotes(lotesDisponiveis);
    });
  }, [propriedadeId, loteAtualId]);

  const showFeedback = (msg: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    } else {
      Alert.alert("", msg);
    }
  };

  const handleConfirmar = async () => {
    if (!loteDestinoId) {
      showFeedback("Selecione o lote de destino.");
      return;
    }

    setSubmitting(true);
    try {
      await movLoteService.create({
        idPropriedade: propriedadeId,
        idGrupo: grupo.id,
        idLoteAtual: loteDestinoId,
        dtEntrada: new Date().toISOString(),
      });
      showFeedback("Grupo movido com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      showFeedback(err?.message || "Erro ao mover grupo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
      backgroundStyle={{ backgroundColor: colors.bg.sheet, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.border.light, height: 4, width: 36 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Mover Grupo</Text>
        <Text style={styles.subtitle}>{grupo.nome}</Text>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Lote de Destino</Text>
        <SelectBottomSheet
          items={lotes}
          value={loteDestinoId}
          onChange={setLoteDestinoId}
          title="Selecione o Lote"
          placeholder="Selecione o lote de destino"
        />

        <TouchableOpacity
          style={[styles.btn, submitting && { opacity: 0.6 }]}
          onPress={handleConfirmar}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.text.accent} />
          ) : (
            <Text style={styles.btnText}>Confirmar Movimentação</Text>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.subtle,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.accent,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  btn: {
    marginTop: 24,
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.accent,
  },
});
```

- [ ] **Step 8.3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "MovimentacaoSheet"
```

Expected: sem erros.

- [ ] **Step 8.4: Commit**

```bash
git add src/components/MovimentacaoSheet/index.tsx
git commit -m "feat(components): adicionar MovimentacaoSheet para transferência de grupos entre lotes"
```

---

### Task 9: Criar `FormGrupo`

**Objetivo:** Bottom sheet para criar ou editar um grupo de animais.

**Arquivos:**
- Create: `src/components/FormGrupo/index.tsx`

**Contexto:**
- Modo `create` ou `edit` via prop `grupo` (undefined = criar novo)
- Chama `grupoService.create` ou `grupoService.update`
- Seleção de cor via swatches fixos (8 opções)

- [ ] **Step 9.1: Criar o componente**

```tsx
import React, { useRef, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, Alert, ToastAndroid, ActivityIndicator,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { grupoService, Grupo, NovoGrupoDTO } from "../../services/grupoService";

const SWATCHES = ["#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

type FormGrupoProps = {
  propriedadeId: string;
  grupo?: Grupo;
  onClose: () => void;
  onSuccess: () => void;
};

export const FormGrupo: React.FC<FormGrupoProps> = ({
  propriedadeId,
  grupo,
  onClose,
  onSuccess,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["60%", "85%"], []);
  const [nome, setNome] = useState(grupo?.nome ?? "");
  const [cor, setCor] = useState(grupo?.color ?? SWATCHES[0]);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!grupo;

  const showFeedback = (msg: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    } else {
      Alert.alert("", msg);
    }
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      showFeedback("Informe o nome do grupo.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && grupo) {
        await grupoService.update(grupo.id, { nomeGrupo: nome.trim(), color: cor });
      } else {
        const dto: NovoGrupoDTO = {
          nomeGrupo: nome.trim(),
          idPropriedade: propriedadeId,
          color: cor,
        };
        await grupoService.create(dto);
      }
      showFeedback(isEdit ? "Grupo atualizado!" : "Grupo criado!");
      onSuccess();
      onClose();
    } catch (err: any) {
      showFeedback(err?.message || "Erro ao salvar grupo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
      backgroundStyle={{ backgroundColor: colors.bg.sheet, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.border.light, height: 4, width: 36 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{isEdit ? "Editar Grupo" : "Novo Grupo"}</Text>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Nome do Grupo</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Grupo de Recria"
          placeholderTextColor={colors.text.placeholder}
          maxLength={50}
        />

        <Text style={styles.label}>Cor de Identificação</Text>
        <View style={styles.swatches}>
          {SWATCHES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.swatch, { backgroundColor: c }, cor === c && styles.swatchSelected]}
              onPress={() => setCor(c)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, submitting && { opacity: 0.6 }]}
          onPress={handleSalvar}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.text.accent} />
          ) : (
            <Text style={styles.btnText}>{isEdit ? "Salvar Alterações" : "Criar Grupo"}</Text>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.subtle,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.accent,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text.heading,
    backgroundColor: colors.bg.card,
    marginBottom: 16,
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: colors.text.heading,
  },
  btn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.accent,
  },
});
```

- [ ] **Step 9.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "FormGrupo"
```

Expected: sem erros.

- [ ] **Step 9.3: Commit**

```bash
git add src/components/FormGrupo/index.tsx
git commit -m "feat(components): adicionar FormGrupo com seleção de cor e CRUD de grupos"
```

---

### Task 10: Criar `LoteDetailSheet`

**Objetivo:** Bottom sheet de detalhe do lote com mini mapa e ações.

**Arquivos:**
- Create: `src/components/LoteDetailSheet/index.tsx`

**Contexto:**
- Recebe `lote: Piquete` via prop
- Exibe: nome, status, área (em ha), grupo atual
- Mini mapa mostrando a geometria do lote via `MapLeaflet`
- Botão "Mover Grupo" → abre `MovimentacaoSheet` em cima deste sheet (usar Portal ou fechar e abrir no pai)
- Decisão de arquitetura: passar `onMoverGrupo` como callback para o pai orquestrar — mais simples e sem conflito de Portals

- [ ] **Step 10.1: Criar o componente**

```tsx
import React, { useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { Piquete } from "../../services/piqueteService";
import { MapLeaflet } from "../Mapa";

type LoteDetailSheetProps = {
  lote: Piquete;
  onClose: () => void;
  onMoverGrupo?: () => void;
};

export const LoteDetailSheet: React.FC<LoteDetailSheetProps> = ({
  lote,
  onClose,
  onMoverGrupo,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["55%", "92%"], []);

  const temGeometria = lote.coords && lote.coords.length > 0;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      enableContentPanningGesture={false}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
      backgroundStyle={{ backgroundColor: colors.bg.sheet, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.border.light, height: 4, width: 36 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{lote.nome}</Text>
        <View style={[styles.statusDot, { backgroundColor: lote.idGrupo ? (lote.grupoCor || colors.brand.dark) : colors.border.muted }]} />
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Grupo</Text>
            <Text style={styles.infoValue}>{lote.idGrupo ? lote.grupoNome : "—"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{lote.status || "ativo"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Área</Text>
            <Text style={styles.infoValue}>
              {lote.areaM2 ? `${(lote.areaM2 / 10000).toFixed(1)} ha` : "—"}
            </Text>
          </View>
        </View>

        {temGeometria && (
          <View style={styles.mapContainer}>
            <MapLeaflet
              piquetes={[lote]}
              currentLocation={null}
            />
          </View>
        )}

        {lote.idGrupo && onMoverGrupo && (
          <TouchableOpacity style={styles.moverBtn} onPress={onMoverGrupo}>
            <Text style={styles.moverBtnText}>Mover Grupo para outro Lote</Text>
          </TouchableOpacity>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.subtle,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.accent,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: colors.bg.section,
    borderRadius: 12,
    padding: 12,
  },
  infoItem: {
    alignItems: "center",
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.title,
    fontWeight: "600",
  },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 16,
  },
  moverBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  moverBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.accent,
  },
});
```

- [ ] **Step 10.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "LoteDetailSheet"
```

Expected: sem erros.

- [ ] **Step 10.3: Commit**

```bash
git add src/components/LoteDetailSheet/index.tsx
git commit -m "feat(components): adicionar LoteDetailSheet com mini mapa e ação de transferência"
```

---

### Task 11: Reescrever `PiquetesScreen`

**Objetivo:** Substituir completamente o conteúdo de `PiquetesScreen.tsx` pela nova tela de Gestão de Lotes com sub-tabs Lotes e Grupos.

**Arquivos:**
- Modify: `src/screens/PiquetesScreen.tsx`

**Atenção:** Esta é a task mais complexa. Ler o arquivo inteiro antes de editar. A estrutura abaixo é o arquivo final completo.

- [ ] **Step 11.1: Ler o arquivo atual**

Leia `src/screens/PiquetesScreen.tsx` na íntegra para confirmar o que será descartado.

- [ ] **Step 11.2: Substituir o conteúdo completo**

```tsx
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl,
} from "react-native";
import { colors } from "../styles/colors";
import { usePropriedade } from "../context/PropriedadeContext";
import { useLotes, FiltroLote } from "../hooks/useLotes";
import { useGrupos } from "../hooks/useGrupos";
import { Piquete } from "../services/piqueteService";
import { Grupo } from "../services/grupoService";
import { CardLote } from "../components/CardLote";
import { CardGrupo } from "../components/CardGrupo";
import { DemarcacaoPiqueteSheet } from "../components/DemarcacaoPiqueteSheet";
import { MovimentacaoSheet } from "../components/MovimentacaoSheet";
import { FormGrupo } from "../components/FormGrupo";
import { LoteDetailSheet } from "../components/LoteDetailSheet";
import BuffaloLoader from "../components/BufaloLoader";

type ActiveTab = "Lotes" | "Grupos";
const FILTROS: FiltroLote[] = ["Todos", "Ocupados", "Vazios", "Descanso"];

export const PiquetesScreen = () => {
  const { propriedadeSelecionada } = usePropriedade();

  const {
    lotes, loading: loadingLotes, refreshing: refreshingLotes,
    refresh: refreshLotes, filtro, setFiltro,
  } = useLotes(propriedadeSelecionada);

  const {
    grupos, loading: loadingGrupos, refreshing: refreshingGrupos,
    refresh: refreshGrupos,
  } = useGrupos(propriedadeSelecionada);

  const [activeTab, setActiveTab] = useState<ActiveTab>("Lotes");

  // Sheet states
  const [showNovoLote, setShowNovoLote] = useState(false);
  const [showNovoGrupo, setShowNovoGrupo] = useState(false);
  const [loteDetalhe, setLoteDetalhe] = useState<Piquete | null>(null);
  const [movimentacaoGrupo, setMovimentacaoGrupo] = useState<Grupo | null>(null);
  const [movimentacaoLoteAtualId, setMovimentacaoLoteAtualId] = useState<string | undefined>();

  const handleMoverFromCard = useCallback((grupo: Grupo, loteAtualId?: string) => {
    setMovimentacaoGrupo(grupo);
    setMovimentacaoLoteAtualId(loteAtualId);
    setLoteDetalhe(null); // fecha o detail se estiver aberto
  }, []);

  const handleMoverFromDetail = useCallback(() => {
    if (!loteDetalhe) return;
    const grupoDoLote = grupos.find((g) => g.id === loteDetalhe.idGrupo);
    if (grupoDoLote) {
      setMovimentacaoGrupo(grupoDoLote);
      setMovimentacaoLoteAtualId(loteDetalhe.id);
      setLoteDetalhe(null);
    }
  }, [loteDetalhe, grupos]);

  const handleMovimentacaoSuccess = useCallback(() => {
    refreshLotes();
    refreshGrupos();
  }, [refreshLotes, refreshGrupos]);

  const isLoading = activeTab === "Lotes" ? loadingLotes : loadingGrupos;

  const renderLoteItem = useCallback(({ item }: { item: Piquete }) => (
    <CardLote
      lote={item}
      onPress={() => setLoteDetalhe(item)}
      onMoverGrupo={
        item.idGrupo
          ? () => {
              const g = grupos.find((gr) => gr.id === item.idGrupo);
              if (g) handleMoverFromCard(g, item.id);
            }
          : undefined
      }
    />
  ), [grupos, handleMoverFromCard]);

  const renderGrupoItem = useCallback(({ item }: { item: Grupo }) => {
    const loteAtual = lotes.find((l) => l.idGrupo === item.id);
    return (
      <CardGrupo
        grupo={item}
        loteNome={loteAtual?.nome}
        onMover={() => handleMoverFromCard(item, loteAtual?.id)}
      />
    );
  }, [lotes, handleMoverFromCard]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GESTÃO DE LOTES</Text>
      </View>

      {/* Sub-tabs */}
      <View style={styles.tabBar}>
        {(["Lotes", "Grupos"] as ActiveTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtros (apenas na tab Lotes) */}
      {activeTab === "Lotes" && (
        <View style={styles.filtrosRow}>
          {FILTROS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filtroChip, filtro === f && styles.filtroChipActive]}
              onPress={() => setFiltro(f)}
            >
              <Text style={[styles.filtroText, filtro === f && styles.filtroTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Conteúdo */}
      {isLoading ? (
        <View style={styles.loading}>
          <BuffaloLoader />
        </View>
      ) : activeTab === "Lotes" ? (
        <FlatList
          data={lotes}
          keyExtractor={(item) => item.id}
          renderItem={renderLoteItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshingLotes} onRefresh={refreshLotes} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum lote encontrado.</Text>
          }
        />
      ) : (
        <FlatList
          data={grupos}
          keyExtractor={(item) => item.id}
          renderItem={renderGrupoItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshingGrupos} onRefresh={refreshGrupos} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum grupo cadastrado.</Text>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => activeTab === "Lotes" ? setShowNovoLote(true) : setShowNovoGrupo(true)}
      >
        <Text style={styles.fabText}>
          + {activeTab === "Lotes" ? "Novo Lote" : "Novo Grupo"}
        </Text>
      </TouchableOpacity>

      {/* Bottom Sheets */}
      {showNovoLote && propriedadeSelecionada && (
        <DemarcacaoPiqueteSheet
          onClose={() => { setShowNovoLote(false); refreshLotes(); }}
          propriedadeId={propriedadeSelecionada}
        />
      )}

      {showNovoGrupo && propriedadeSelecionada && (
        <FormGrupo
          propriedadeId={propriedadeSelecionada}
          onClose={() => setShowNovoGrupo(false)}
          onSuccess={refreshGrupos}
        />
      )}

      {loteDetalhe && (
        <LoteDetailSheet
          lote={loteDetalhe}
          onClose={() => setLoteDetalhe(null)}
          onMoverGrupo={loteDetalhe.idGrupo ? handleMoverFromDetail : undefined}
        />
      )}

      {movimentacaoGrupo && propriedadeSelecionada && (
        <MovimentacaoSheet
          grupo={movimentacaoGrupo}
          propriedadeId={propriedadeSelecionada}
          loteAtualId={movimentacaoLoteAtualId}
          onClose={() => setMovimentacaoGrupo(null)}
          onSuccess={handleMovimentacaoSuccess}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.screen,
  },
  header: {
    height: 60,
    backgroundColor: colors.brand.primary,
    justifyContent: "center",
    paddingLeft: 16,
    borderBottomColor: colors.brand.dark,
    borderBottomWidth: 2.5,
    elevation: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  headerTitle: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "900",
    color: colors.text.accent,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.bg.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.brand.dark,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.muted,
  },
  tabTextActive: {
    color: colors.brand.dark,
  },
  filtrosRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.bg.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  filtroChip: {
    backgroundColor: colors.bg.section,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filtroChipActive: {
    backgroundColor: colors.brand.primary,
  },
  filtroText: {
    fontSize: 13,
    color: colors.text.muted,
    fontWeight: "600",
  },
  filtroTextActive: {
    color: colors.text.accent,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 12,
    paddingBottom: 100,
  },
  empty: {
    textAlign: "center",
    color: colors.text.placeholder,
    marginTop: 40,
    fontSize: 15,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: colors.brand.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    zIndex: 10,
  },
  fabText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.text.accent,
  },
});
```

- [ ] **Step 11.3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 11.4: Verificar que a tab "Piquetes" no App.tsx ainda aponta para PiquetesScreen**

Confirmar que `App.tsx` não precisa de mudanças — o componente `PiquetesScreen` ainda existe no mesmo caminho.

- [ ] **Step 11.5: Commit final**

```bash
git add src/screens/PiquetesScreen.tsx
git commit -m "feat(screens): reescrever PiquetesScreen como Gestão de Lotes com sub-tabs Lotes/Grupos"
```

---

## Self-Review

### Cobertura da spec

| Requisito | Task |
|-----------|------|
| Tela principal = Gestão de Lotes | Task 11 |
| Mapa como secundário/contextual | Task 10 (LoteDetailSheet) |
| Leitura rápida de grupos e ocupação | Tasks 6, 7 |
| Ações rápidas (mover grupos) | Tasks 8, 11 |
| Tab Lotes com filtros | Tasks 4, 11 |
| Tab Grupos com localização atual | Tasks 5, 7, 11 |
| Criação de novo lote | Task 11 (DemarcacaoPiqueteSheet reused) |
| Criação de novo grupo | Tasks 2, 9, 11 |
| Movimentação física entre lotes | Tasks 3, 8, 11 |
| Fix bug de campos snake_case | Task 1 |
| Reaproveitamento de componentes | DemarcacaoPiqueteSheet, SelectBottomSheet, BuffaloLoader, MapLeaflet |

### Placeholder scan
Nenhum "TBD" ou "TODO" no plano. Todos os passos contêm código completo.

### Type consistency
- `Piquete.id` → usado em CardLote, LoteDetailSheet, MovimentacaoSheet ✓
- `Grupo.id` → usado em CardGrupo, MovimentacaoSheet, FormGrupo ✓
- `NovoGrupoDTO` → definido em Task 2, usado em Task 9 ✓
- `NovaMovimentacaoDTO` → definido em Task 3, usado em Task 8 ✓
- `FiltroLote` → definido em Task 4, usado em Task 11 ✓
