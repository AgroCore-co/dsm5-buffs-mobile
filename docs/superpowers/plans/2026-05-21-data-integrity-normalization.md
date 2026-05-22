# Data Integrity — Normalização de Payload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 4 bugs de integridade de dados (ciclos_lactacao nunca inserido, registrarParto ignora flag, campos snake_case não normalizados, sanitário com `bufaloId = NULL`) introduzindo um utilitário `normalizePayload` reutilizável.

**Architecture:** Criar `src/utils/normalizePayload.ts` — função pura que converte aliases snake_case para campos camelCase canônicos. Cada service chama `normalizePayload(data, FIELD_MAP)` no início das funções de escrita antes de qualquer INSERT ou enqueue. Nenhum form muda, nenhum pushEndpoints muda.

**Tech Stack:** TypeScript, op-sqlite, Jest (react-native preset), react-native-uuid

---

## File Map

| Arquivo | Ação |
|---|---|
| `src/utils/normalizePayload.ts` | CRIAR — utilitário puro |
| `src/utils/__tests__/normalizePayload.test.ts` | CRIAR — testes unitários |
| `src/services/reproducaoService.ts` | MODIFICAR — `createCicloLactacao` (INSERT + normalização) + `registrarParto` (chamar ciclo) |
| `src/services/__tests__/reproducaoService.ciclo.test.ts` | CRIAR — testes dos 3 bugs do ciclo |
| `src/services/sanitarioService.ts` | MODIFICAR — `add` normaliza antes do INSERT |
| `src/services/__tests__/sanitarioService.test.ts` | CRIAR — testes do sanitário |

---

## Task 1: Utilitário normalizePayload

**Files:**
- Create: `src/utils/normalizePayload.ts`
- Create: `src/utils/__tests__/normalizePayload.test.ts`

- [ ] **Step 1: Criar o arquivo de teste**

```typescript
// src/utils/__tests__/normalizePayload.test.ts
import { normalizePayload } from '../normalizePayload';

describe('normalizePayload', () => {
  test('normaliza alias para canonical quando canonical ausente', () => {
    const result = normalizePayload({ id_bufala: 'abc' }, { idBufala: ['id_bufala'] });
    expect(result.idBufala).toBe('abc');
  });

  test('não sobrescreve canonical se já presente', () => {
    const result = normalizePayload(
      { idBufala: 'original', id_bufala: 'alias' },
      { idBufala: ['id_bufala'] },
    );
    expect(result.idBufala).toBe('original');
  });

  test('preserva campos sem alias no resultado', () => {
    const result = normalizePayload(
      { observacao: 'obs', id_bufala: 'abc' },
      { idBufala: ['id_bufala'] },
    );
    expect(result.observacao).toBe('obs');
    expect(result.idBufala).toBe('abc');
  });

  test('retorna novo objeto (não muta o original)', () => {
    const original = { id_bufala: 'abc' };
    const result = normalizePayload(original, { idBufala: ['id_bufala'] });
    expect(result).not.toBe(original);
    expect((original as any).idBufala).toBeUndefined();
  });

  test('funciona com lista de aliases vazia', () => {
    const result = normalizePayload({ foo: 'bar' }, { idBufala: [] });
    expect(result.idBufala).toBeUndefined();
    expect(result.foo).toBe('bar');
  });

  test('usa primeiro alias que encontrar quando canonical ausente', () => {
    const result = normalizePayload(
      { padrao_dias: 305 },
      { padraoDias: ['padrao_dias', 'padrao_dias_lactacao'] },
    );
    expect(result.padraoDias).toBe(305);
  });

  test('usa segundo alias quando primeiro ausente', () => {
    const result = normalizePayload(
      { padrao_dias_lactacao: 280 },
      { padraoDias: ['padrao_dias', 'padrao_dias_lactacao'] },
    );
    expect(result.padraoDias).toBe(280);
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar falha**

```bash
cd "/home/v1nisouza/Área de trabalho/PASTA PI/dsm5-buffs-mobile"
npx jest src/utils/__tests__/normalizePayload.test.ts --no-coverage
```

Esperado: `FAIL` — `Cannot find module '../normalizePayload'`

- [ ] **Step 3: Criar a implementação**

```typescript
// src/utils/normalizePayload.ts
type FieldMap = Record<string, string[]>;

export function normalizePayload<T extends Record<string, any>>(
  data: T,
  fieldMap: FieldMap,
): Record<string, any> {
  const result: Record<string, any> = { ...data };
  for (const [canonical, aliases] of Object.entries(fieldMap)) {
    if (result[canonical] !== undefined) continue;
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

- [ ] **Step 4: Executar o teste para confirmar aprovação**

```bash
npx jest src/utils/__tests__/normalizePayload.test.ts --no-coverage
```

Esperado: `PASS` — 7 testes verdes

- [ ] **Step 5: Commit**

```bash
git add src/utils/normalizePayload.ts src/utils/__tests__/normalizePayload.test.ts
git commit -m "feat(utils): utilitário normalizePayload para conversão snake_case → camelCase"
```

---

## Task 2: Testes para ciclos_lactacao (TDD antes de implementar)

**Files:**
- Create: `src/services/__tests__/reproducaoService.ciclo.test.ts`

Este task cria os testes que vão FALHAR. A implementação vem no Task 3.

- [ ] **Step 1: Criar o arquivo de teste**

```typescript
// src/services/__tests__/reproducaoService.ciclo.test.ts
jest.mock('../../database/db');
jest.mock('../pendingOperationsService');
jest.mock('react-native-uuid', () => ({ v4: () => 'mock-uuid-ciclo' }));

import { execute, queryFirst } from '../../database/db';
import { enqueue } from '../pendingOperationsService';
import { createCicloLactacao, registrarParto } from '../reproducaoService';

const mockExecute = execute as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('createCicloLactacao', () => {
  test('insere row no SQLite com os campos normalizados', async () => {
    await createCicloLactacao({
      id_bufala: 'bufala-1',
      id_propriedade: 'prop-1',
      dt_parto: '2026-01-15',
      padrao_dias: 305,
      observacao: '',
    } as any);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ciclos_lactacao'),
      expect.arrayContaining(['mock-uuid-ciclo', 'prop-1', 'bufala-1']),
    );
  });

  test('enfileira com payload camelCase — idBufala e idPropriedade não undefined', async () => {
    await createCicloLactacao({
      id_bufala: 'bufala-1',
      id_propriedade: 'prop-1',
      dt_parto: '2026-01-15',
      padrao_dias: 305,
      observacao: '',
    } as any);

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.idBufala).toBe('bufala-1');
    expect(payload.idPropriedade).toBe('prop-1');
    expect(payload.dtParto).toBe('2026-01-15');
    expect(payload.padraoDias).toBe(305);
  });

  test('normaliza padrao_dias_lactacao como alias de padraoDias', async () => {
    await createCicloLactacao({
      id_bufala: 'bufala-1',
      id_propriedade: 'prop-1',
      dt_parto: '2026-01-15',
      padrao_dias_lactacao: 280,
      observacao: '',
    } as any);

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.padraoDias).toBe(280);
  });
});

describe('registrarParto', () => {
  const reproducaoRaw = {
    id: 'repr-1',
    idBufala: 'bufala-42',
    idPropriedade: 'prop-1',
    status: 'Em andamento',
  };

  beforeEach(() => {
    mockQueryFirst.mockResolvedValue({ _raw: JSON.stringify(reproducaoRaw) });
  });

  test('com criar_ciclo_lactacao=true chama createCicloLactacao (INSERT + enqueue para ciclo)', async () => {
    await registrarParto('repr-1', {
      dt_parto: '2026-01-15',
      tipo_parto: 'Normal',
      criar_ciclo_lactacao: true,
      padrao_dias_lactacao: 305,
    });

    const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
      c[0].includes('INSERT INTO ciclos_lactacao'),
    );
    expect(insertCalls.length).toBe(1);

    const cicloEnqueue = mockEnqueue.mock.calls.find((c: any[]) => c[0] === 'ciclos_lactacao');
    expect(cicloEnqueue).toBeDefined();
    expect(cicloEnqueue[2].idBufala).toBe('bufala-42');
  });

  test('com criar_ciclo_lactacao=false NÃO cria ciclo', async () => {
    await registrarParto('repr-1', {
      dt_parto: '2026-01-15',
      tipo_parto: 'Normal',
      criar_ciclo_lactacao: false,
    });

    const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
      c[0].includes('INSERT INTO ciclos_lactacao'),
    );
    expect(insertCalls.length).toBe(0);

    const cicloEnqueue = mockEnqueue.mock.calls.find((c: any[]) => c[0] === 'ciclos_lactacao');
    expect(cicloEnqueue).toBeUndefined();
  });

  test('sem criar_ciclo_lactacao NÃO cria ciclo', async () => {
    await registrarParto('repr-1', {
      dt_parto: '2026-01-15',
      tipo_parto: 'Normal',
      criar_ciclo_lactacao: false,
    });

    const cicloEnqueue = mockEnqueue.mock.calls.find((c: any[]) => c[0] === 'ciclos_lactacao');
    expect(cicloEnqueue).toBeUndefined();
  });
});
```

- [ ] **Step 2: Executar para confirmar falha**

```bash
npx jest src/services/__tests__/reproducaoService.ciclo.test.ts --no-coverage
```

Esperado: `FAIL` — testes de INSERT falham (INSERT nunca executado), testes de `registrarParto` com ciclo também falham.

---

## Task 3: Corrigir ciclos_lactacao em reproducaoService.ts

**Files:**
- Modify: `src/services/reproducaoService.ts`

- [ ] **Step 1: Abrir o arquivo e localizar `createCicloLactacao` (linha 138) e `registrarParto` (linha 162)**

O estado atual de `createCicloLactacao`:
```typescript
export const createCicloLactacao = async (data: CicloLactacaoPayload) => {
  const id = uuid.v4() as string;
  await enqueue("ciclos_lactacao", "CREATE", { ...data, id });
  return { id };
};
```

O estado atual de `registrarParto`: nunca lê `data.criar_ciclo_lactacao`, nunca chama `createCicloLactacao`.

- [ ] **Step 2: Adicionar import de `normalizePayload` no topo do arquivo**

Localizar o bloco de imports (linhas 1-6) e adicionar a linha:

```typescript
import { normalizePayload } from '../utils/normalizePayload';
```

O arquivo começa assim após a mudança:
```typescript
import { formatarDataBR } from "../utils/date";
import { getReproducaoMetricas } from './dashboardService';
import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";
import { normalizePayload } from '../utils/normalizePayload';
```

- [ ] **Step 3: Substituir `createCicloLactacao` completo**

Substituir o bloco atual (linhas 138-142):
```typescript
export const createCicloLactacao = async (data: CicloLactacaoPayload) => {
  const id = uuid.v4() as string;
  await enqueue("ciclos_lactacao", "CREATE", { ...data, id });
  return { id };
};
```

Pelo novo:
```typescript
const CICLO_FIELD_MAP = {
  idPropriedade: ['id_propriedade', 'idPropriedade'],
  idBufala:      ['id_bufala'],
  dtParto:       ['dt_parto'],
  padraoDias:    ['padrao_dias', 'padrao_dias_lactacao'],
  dtSecagemReal: ['dt_secagem_real'],
};

export const createCicloLactacao = async (data: any) => {
  const d = normalizePayload(data, CICLO_FIELD_MAP);
  const id = uuid.v4() as string;
  const now = new Date().toISOString();

  const newRecord = {
    ...d,
    id,
    status: 'Em Lactação',
    createdAt: now,
    updatedAt: now,
  };

  await execute(
    `INSERT INTO ciclos_lactacao (id, propriedadeId, idBufala, status, _raw, _synced, updatedAt)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [id, d.idPropriedade ?? null, d.idBufala ?? null, 'Em Lactação', JSON.stringify(newRecord), now],
  );

  await enqueue('ciclos_lactacao', 'CREATE', newRecord);
  return { id };
};
```

- [ ] **Step 4: Substituir `registrarParto` completo**

Substituir o bloco atual (linhas 162-174):
```typescript
export const registrarParto = async (id: string, data: RegistrarPartoPayload) => {
  if (!id) throw new Error("ID da reprodução é obrigatório.");

  const now = new Date().toISOString();
  const payload = { id, ...data, status: "CONCLUIDA", updatedAt: now };

  await execute(
    `UPDATE reproducoes SET _raw = json_patch(_raw, ?), _synced = 0, updatedAt = ? WHERE id = ?`,
    [JSON.stringify({ status: "CONCLUIDA", ...data }), now, id],
  );
  await enqueue("reproducoes", "UPDATE", payload);
  return payload;
};
```

Pelo novo:
```typescript
export const registrarParto = async (id: string, data: RegistrarPartoPayload) => {
  if (!id) throw new Error("ID da reprodução é obrigatório.");

  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM reproducoes WHERE id = ?`,
    [id],
  );
  const reproducaoRaw = existing ? JSON.parse(existing._raw) : {};

  const now = new Date().toISOString();
  const payload = { id, ...data, status: "CONCLUIDA", updatedAt: now };

  await execute(
    `UPDATE reproducoes SET _raw = json_patch(_raw, ?), _synced = 0, updatedAt = ? WHERE id = ?`,
    [JSON.stringify({ status: "CONCLUIDA", ...data }), now, id],
  );
  await enqueue("reproducoes", "UPDATE", payload);

  if (data.criar_ciclo_lactacao === true) {
    await createCicloLactacao({
      id_bufala: reproducaoRaw.idBufala,
      id_propriedade: reproducaoRaw.idPropriedade,
      dt_parto: data.dt_parto,
      padrao_dias: data.padrao_dias_lactacao ?? 305,
      observacao: data.observacao ?? '',
    });
  }

  return payload;
};
```

- [ ] **Step 5: Executar os testes do ciclo para confirmar aprovação**

```bash
npx jest src/services/__tests__/reproducaoService.ciclo.test.ts --no-coverage
```

Esperado: `PASS` — todos os testes verdes

- [ ] **Step 6: Commit**

```bash
git add src/services/reproducaoService.ts src/services/__tests__/reproducaoService.ciclo.test.ts
git commit -m "fix(ciclos_lactacao): INSERT local, normalização camelCase e criação via registrarParto"
```

---

## Task 4: Testes para sanitarioService (TDD antes de implementar)

**Files:**
- Create: `src/services/__tests__/sanitarioService.test.ts`

- [ ] **Step 1: Criar o arquivo de teste**

```typescript
// src/services/__tests__/sanitarioService.test.ts
jest.mock('../../database/db');
jest.mock('../pendingOperationsService');
jest.mock('react-native-uuid', () => ({ v4: () => 'mock-uuid-san' }));

import { execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';
import { sanitarioService } from '../sanitarioService';

const mockExecute = execute as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('sanitarioService.add', () => {
  test('INSERT recebe bufaloId correto quando form envia id_bufalo', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-99',
      id_propriedade: 'prop-1',
      id_medicao: 'med-1',
      dt_aplicacao: '2026-01-15',
      dosagem: 5,
      tipo: 'Vacina',
    });

    const [, params] = mockExecute.mock.calls[0];
    // params[1] é bufaloId na posição do INSERT
    expect(params[1]).toBe('bufalo-99');
  });

  test('enqueue recebe idBufalo camelCase correto', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-99',
      id_propriedade: 'prop-1',
      id_medicao: 'med-1',
      dt_aplicacao: '2026-01-15',
      dosagem: 5,
      tipo: 'Vacina',
    });

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.idBufalo).toBe('bufalo-99');
  });

  test('idMedicao normalizado de id_medicao', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-1',
      id_propriedade: 'prop-1',
      id_medicao: 'med-42',
      dt_aplicacao: '2026-01-15',
      dosagem: 2,
      tipo: 'Tratamento',
    });

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.idMedicao).toBe('med-42');
  });

  test('dtAplicacao normalizado de dt_aplicacao', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-1',
      id_propriedade: 'prop-1',
      id_medicao: 'med-1',
      dt_aplicacao: '2026-03-20',
      dosagem: 1,
      tipo: 'Vacina',
    });

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.dtAplicacao).toBe('2026-03-20');
  });

  test('dtRetorno normalizado de dt_retorno', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-1',
      id_propriedade: 'prop-1',
      id_medicao: 'med-1',
      dt_aplicacao: '2026-03-20',
      dt_retorno: '2026-03-30',
      dosagem: 1,
      tipo: 'Tratamento',
    });

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.dtRetorno).toBe('2026-03-30');
  });
});
```

- [ ] **Step 2: Executar para confirmar falha**

```bash
npx jest src/services/__tests__/sanitarioService.test.ts --no-coverage
```

Esperado: `FAIL` — `params[1]` é `undefined` (não `'bufalo-99'`), payload não tem `idBufalo`.

---

## Task 5: Corrigir sanitarioService.ts

**Files:**
- Modify: `src/services/sanitarioService.ts`

- [ ] **Step 1: Adicionar import de `normalizePayload` no topo**

O arquivo começa em:
```typescript
import { sanitarioToApiAdapter } from "./adapters/bufaloAdapter";
import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";
```

Adicionar a linha de import:
```typescript
import { sanitarioToApiAdapter } from "./adapters/bufaloAdapter";
import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";
import { normalizePayload } from '../utils/normalizePayload';
```

- [ ] **Step 2: Adicionar `SANITARIO_FIELD_MAP` e substituir `add` method**

O `add` atual (linhas 14-27):
```typescript
  add: async (payload: any) => {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const adapted = sanitarioToApiAdapter(payload);
    const newRecord = { ...adapted, id, createdAt: now, updatedAt: now };

    await execute(
      `INSERT INTO eventos_sanitarios (id, bufaloId, propriedadeId, tipo, _raw, _synced, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, payload.id_bufalo, payload.id_propriedade, payload.tipo ?? null, JSON.stringify(newRecord), now],
    );
    await enqueue("eventos_sanitarios", "CREATE", newRecord);
    return newRecord;
  },
```

Substituir por:
```typescript
const SANITARIO_FIELD_MAP = {
  idBufalo:        ['id_bufalo'],
  idPropriedade:   ['id_propriedade'],
  idMedicao:       ['id_medicao', 'idMedicacao', 'id_medicacao'],
  dtAplicacao:     ['dt_aplicacao'],
  dtRetorno:       ['dt_retorno'],
  unidadeMedida:   ['unidade_medida'],
  necessitaRetorno:['necessita_retorno'],
};

export const sanitarioService = {
  add: async (payload: any) => {
    const d = normalizePayload(payload, SANITARIO_FIELD_MAP);
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const newRecord = { ...d, id, createdAt: now, updatedAt: now };

    await execute(
      `INSERT INTO eventos_sanitarios (id, bufaloId, propriedadeId, tipo, _raw, _synced, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, d.idBufalo ?? null, d.idPropriedade ?? null, d.tipo ?? null, JSON.stringify(newRecord), now],
    );
    await enqueue("eventos_sanitarios", "CREATE", newRecord);
    return newRecord;
  },
```

> **Nota:** O `sanitarioToApiAdapter` converte camelCase→snake_case para o legado da API, mas o `newRecord` gravado no SQLite e enfileirado deve estar em camelCase. Após normalizar com `normalizePayload`, o `newRecord` já contém os campos canônicos, então o adapter não é mais necessário no `add`. Remover a linha `const adapted = sanitarioToApiAdapter(payload);`.

- [ ] **Step 3: Executar os testes para confirmar aprovação**

```bash
npx jest src/services/__tests__/sanitarioService.test.ts --no-coverage
```

Esperado: `PASS` — 5 testes verdes

- [ ] **Step 4: Executar todos os testes para garantir nenhuma regressão**

```bash
npx jest --no-coverage
```

Esperado: todos os testes existentes continuam passando.

- [ ] **Step 5: Commit**

```bash
git add src/services/sanitarioService.ts src/services/__tests__/sanitarioService.test.ts
git commit -m "fix(sanitario): normalizar id_bufalo→idBufalo e aliases antes do INSERT"
```

---

## Task 6: Verificação final das invariantes

- [ ] **Step 1: Rodar suite completa**

```bash
npx jest --no-coverage --verbose
```

Esperado: sem falhas. Confirmar que os 4 arquivos novos aparecem nos resultados:
- `src/utils/__tests__/normalizePayload.test.ts` (7 testes)
- `src/services/__tests__/reproducaoService.ciclo.test.ts` (6 testes)
- `src/services/__tests__/sanitarioService.test.ts` (5 testes)

- [ ] **Step 2: Verificar invariantes da spec**

Confirmar mentalmente (ou via grep) que cada invariante vale:

1. **`INSERT INTO ciclos_lactacao`** recebe `propriedadeId` não-nulo quando `id_propriedade` no payload de entrada → verificado pelo teste `'insere row no SQLite com os campos normalizados'`
2. **Payload do enqueue camelCase** para `shapeCicloCreate` → verificado por `'enfileira com payload camelCase'`
3. **Ciclo existe offline após parto** → verificado por `'com criar_ciclo_lactacao=true chama createCicloLactacao'`
4. **`bufaloId` não-nulo em `eventos_sanitarios`** → verificado por `'INSERT recebe bufaloId correto'`
