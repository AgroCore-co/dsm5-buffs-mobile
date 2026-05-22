# Data Integrity — Normalização de Payload em Services Design

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this spec task-by-task.

**Goal:** Garantir que todos os flows de escrita (form → service → SQLite → API push) sejam robustos a variações de casing nos campos, e corrigir bugs críticos em `ciclos_lactacao` e `eventos_sanitarios`.

**Architecture:** Criar um utilitário puro `normalizePayload(data, fieldMap)` que cada service chama no início de funções de escrita para converter snake_case → camelCase antes de qualquer INSERT ou enqueue. Forms não mudam. `pushEndpoints.ts` não muda.

**Tech Stack:** TypeScript, op-sqlite, Jest

---

## Diagnóstico

### Auditoria completa dos flows form → service → SQLite → pushEndpoints

| Entidade | Status | Risco |
|---|---|---|
| bufalos | ✅ Corrigido (normalização implementada) | Nenhum |
| reproducoes | ✅ OK | Nenhum |
| ordenhas | ✅ OK (service normaliza manualmente) | Nenhum |
| pesagens | ✅ OK (adapter + shape fallbacks) | Nenhum |
| lotes | ✅ OK (shape trata ambas as variantes) | Nenhum |
| alertas | ✅ OK (só UPDATE) | Nenhum |
| **ciclos_lactacao** | 🔴 CRÍTICO — 3 bugs | Alto |
| **eventos_sanitarios** | 🟡 FRÁGIL — INSERT pode receber `undefined` | Médio |
| material_genetico | Não implementado | — |

---

## Bug #1 — ciclos_lactacao: nunca gravado no SQLite

**Localização:** `src/services/reproducaoService.ts` → `createCicloLactacao`

**Problema:** A função só chama `enqueue` — nunca executa `INSERT INTO ciclos_lactacao`. Se o sync falhar (offline prolongado, servidor rejeita), o ciclo não existe localmente. O usuário não vê o ciclo na tela de lactação até um sync bem-sucedido.

**Correção:** Adicionar `INSERT INTO ciclos_lactacao` com os campos normalizados antes do `enqueue`, espelhando o padrão de `createBufalo` e `createReproducao`.

Campos necessários no INSERT:
- `id` (gerado por uuid)
- `propriedadeId` (normalizado de `id_propriedade` ou `idPropriedade`)
- `idBufala` (normalizado de `id_bufala`)
- `status` (valor inicial: `'Em Lactação'`)
- `_raw` (JSON do newRecord normalizado)
- `_synced = 0`
- `updatedAt`

---

## Bug #2 — registrarParto: ignora criar_ciclo_lactacao

**Localização:** `src/services/reproducaoService.ts` → `registrarParto`

**Problema:** O formulário `FormReproductionAtt` chama `registrarParto(id, { criar_ciclo_lactacao: true, ... })` mas `registrarParto` nunca lê esse campo nem chama `createCicloLactacao`. O ciclo de lactação nunca é criado após um parto.

**Correção:** Após o UPDATE da reprodução e o enqueue, verificar `data.criar_ciclo_lactacao === true` e chamar `createCicloLactacao` com:

```typescript
{
  id_bufala: reproducaoRaw.idBufala,          // lido do _raw da reprodução
  id_propriedade: reproducaoRaw.idPropriedade,
  dt_parto: data.dt_parto,
  padrao_dias: data.padrao_dias_lactacao ?? 305,
  observacao: data.observacao ?? '',
}
```

A reprodução existente deve ser lida do SQLite para obter `idBufala` e `idPropriedade` antes de criar o ciclo.

---

## Bug #3 — ciclos_lactacao: campos snake_case não normalizados

**Localização:** `src/services/reproducaoService.ts` → `createCicloLactacao`

**Problema:** `CicloLactacaoPayload` usa `id_bufala`, `id_propriedade`, `dt_parto`, `padrao_dias` (snake_case). O `shapeCicloCreate` em `pushEndpoints.ts` espera `idBufala`, `idPropriedade`, `dtParto`, `padraoDias` (camelCase). Sem normalização, o payload do push vai com esses campos `undefined`.

**Mapa de normalização para ciclos_lactacao:**
```
propriedadeId  ← ['id_propriedade', 'idPropriedade']
idBufala       ← ['id_bufala']
dtParto        ← ['dt_parto']
padraoDias     ← ['padrao_dias', 'padrao_dias_lactacao']
observacao     ← (sem alias)
dtSecagemReal  ← ['dt_secagem_real']
```

---

## Bug #4 — eventos_sanitarios: INSERT pode receber undefined

**Localização:** `src/services/sanitarioService.ts` → `add`

**Problema:** O formulário envia `id_bufalo`, `id_medicao`, `dt_aplicacao`, `dt_retorno` (snake_case). O service passa o payload sem normalizar para o INSERT. A coluna `bufaloId` recebe `data.bufaloId ?? data.idBufalo` — ambos undefined quando o form envia `id_bufalo`. O `shapeSanitarioCreate` tem fallbacks (`idBufalo ?? id_bufalo`) que mascaram o problema, mas o INSERT fica com `bufaloId = NULL`.

**Mapa de normalização para eventos_sanitarios:**
```
idBufalo      ← ['id_bufalo']
idMedicao     ← ['id_medicao', 'idMedicacao', 'id_medicacao']
dtAplicacao   ← ['dt_aplicacao']
dtRetorno     ← ['dt_retorno']
dosagem       ← (sem alias)
unidadeMedida ← ['unidade_medida']
doenca        ← (sem alias)
necessitaRetorno ← ['necessita_retorno']
```

---

## Solução — utilitário normalizePayload

### `src/utils/normalizePayload.ts`

```typescript
type FieldMap = Record<string, string[]>;

export function normalizePayload<T extends Record<string, any>>(
  data: T,
  fieldMap: FieldMap,
): Record<string, any> {
  const result: Record<string, any> = { ...data };
  for (const [canonical, aliases] of Object.entries(fieldMap)) {
    if (result[canonical] !== undefined) continue; // já existe, não sobrescreve
    for (const alias of aliases) {
      if (data[alias] !== undefined) {
        result[canonical] = data[alias];
        break;
      }
    }
  }
  return result;
}
```

**Contratos:**
- Não muta o objeto original
- Não sobrescreve campo canonical se já presente
- Não remove campos extras (preserva dados para o `_raw`)
- Puro — sem efeitos colaterais, fácil de testar

### Uso em cada service

```typescript
import { normalizePayload } from '../utils/normalizePayload';

const CICLO_FIELD_MAP = {
  propriedadeId: ['id_propriedade', 'idPropriedade'],
  idBufala:      ['id_bufala'],
  dtParto:       ['dt_parto'],
  padraoDias:    ['padrao_dias', 'padrao_dias_lactacao'],
  dtSecagemReal: ['dt_secagem_real'],
};

export const createCicloLactacao = async (data: any) => {
  const d = normalizePayload(data, CICLO_FIELD_MAP);
  // INSERT usa d.propriedadeId, d.idBufala etc.
  // enqueue usa d (camelCase garantido para shapeCicloCreate)
};
```

---

## Arquivos a modificar

| Arquivo | Ação | Descrição |
|---|---|---|
| `src/utils/normalizePayload.ts` | CRIAR | Utilitário puro de normalização |
| `src/utils/__tests__/normalizePayload.test.ts` | CRIAR | Testes unitários do utilitário |
| `src/services/reproducaoService.ts` | MODIFICAR | `createCicloLactacao`: INSERT + normalização; `registrarParto`: chamar ciclo quando flag ativo |
| `src/services/sanitarioService.ts` | MODIFICAR | `add`: aplicar normalizePayload antes do INSERT |
| `src/services/__tests__/reproducaoService.ciclo.test.ts` | CRIAR | Testes para os 3 bugs do ciclo |
| `src/services/__tests__/sanitarioService.test.ts` | CRIAR | Testes para a normalização do sanitário |

**Não mudam:** `bufaloService.ts`, `lactacaoService.ts`, `piqueteService.ts`, `pushEndpoints.ts`, todos os Form* components.

---

## Testes

### normalizePayload.test.ts
- Normaliza alias para canonical quando canonical ausente
- Não sobrescreve canonical existente
- Preserva campos sem alias
- Retorna novo objeto (não muta original)
- Funciona com aliases vazios

### reproducaoService.ciclo.test.ts
- `createCicloLactacao` insere row no SQLite com propriedadeId correto
- `createCicloLactacao` enfileira com payload camelCase completo
- `registrarParto` com `criar_ciclo_lactacao: true` chama createCicloLactacao
- `registrarParto` com `criar_ciclo_lactacao: false` não cria ciclo
- Campo `dt_parto` (snake) é normalizado para `dtParto` (camelCase) no push payload

### sanitarioService.test.ts
- INSERT recebe `bufaloId` correto quando form envia `id_bufalo`
- `idMedicao` normalizado de `id_medicao`
- `dtAplicacao` normalizado de `dt_aplicacao`

---

## Invariantes que devem valer após a implementação

1. Todo `INSERT INTO <entity>` com coluna `propriedadeId` recebe valor não-nulo quando `id_propriedade` ou `idPropriedade` está no payload de entrada.
2. Todo payload passado para `enqueue` tem os campos em camelCase esperados pelo `shape*` correspondente em `pushEndpoints.ts`.
3. Ciclo de lactação criado durante registro de parto existe imediatamente no SQLite (visível offline).
4. `bufaloId` em `eventos_sanitarios` é sempre não-nulo quando `id_bufalo` está no payload de entrada.
