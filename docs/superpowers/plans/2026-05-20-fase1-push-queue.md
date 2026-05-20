# Fase 1 — Conserto da Fila de PUSH Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a derivação de endpoint da fila de escrita offline (`pending_operations`) para que writes feitos offline (búfalos, pesagens, sanitário, alertas, reprodução) subam para os endpoints REST corretos da API.

**Architecture:** Introduz um *registry por entidade* (`src/services/sync/pushEndpoints.ts`), uma função pura `resolvePushEndpoint(entity, operation, payload)` que retorna `{ endpoint, method, body }`. O `pendingOperationsService.enqueue` passa a consultar esse registry e armazena o `body` já transformado (necessário para casos como mover-grupo e registrar-parto, onde o corpo difere do payload bruto). O `syncService.push` não muda. A migração é bumpada para limpar a `pending_operations` (writes antigos com endpoint errado).

**Tech Stack:** React Native, TypeScript, `@op-engineering/op-sqlite`, Jest 29, `react-native-uuid`.

**Spec de referência:** `docs/superpowers/specs/2026-05-20-offline-first-completo-design.md` (Fase 1).

---

## Escopo desta fase (decidido no brainstorming)

Cobrir as entidades **limpas** + split do registrar-parto:
- `bufalos` (CREATE/UPDATE/DELETE + mover grupo)
- `pesagens` (CREATE com `bufaloId` no path / UPDATE / DELETE)
- `eventos_sanitarios` (CREATE/UPDATE/DELETE)
- `alertas` (UPDATE = marcar visto)
- `reproducoes` (CREATE → `/cobertura`; UPDATE plain → `/cobertura/:id`; UPDATE registrar-parto → `/cobertura/:id/registrar-parto`)
- `ciclos_lactacao` (ciclo real: CREATE/UPDATE/DELETE → `/lactacao`)

**Fora de escopo (adiado para Fase 3):** o "depósito" `ciclos_lactacao CREATE` usado por `registrarLactacaoApi` (ordenha), `registrarColetaApi` (coleta) e `registrarEstoqueApi` (estoque) em `lactacaoService.ts`. Esses continuam roteando para `/lactacao` (comportamento atual, já quebrado — sem regressão) até ganharem tabela local e nome próprio na Fase 3. **Não tocar nesses três métodos nesta fase.**

---

## Mapa de endpoints (referência exata para os resolvers)

| Entidade | Operação | Método + Endpoint | Body |
|---|---|---|---|
| bufalos | CREATE | `POST /bufalos` | payload |
| bufalos | UPDATE (normal) | `PATCH /bufalos/{id}` | payload |
| bufalos | UPDATE (mover grupo) | `PATCH /bufalos/grupo/mover` | `{ idsBufalos, idNovoGrupo, motivo }` |
| bufalos | DELETE | `DELETE /bufalos/{id}` | — |
| pesagens | CREATE | `POST /dados-zootecnicos/bufalo/{bufaloId}` | payload |
| pesagens | UPDATE | `PATCH /dados-zootecnicos/{id}` | payload |
| pesagens | DELETE | `DELETE /dados-zootecnicos/{id}` | — |
| eventos_sanitarios | CREATE | `POST /dados-sanitarios` | payload |
| eventos_sanitarios | UPDATE | `PATCH /dados-sanitarios/{id}` | payload |
| eventos_sanitarios | DELETE | `DELETE /dados-sanitarios/{id}` | — |
| alertas | UPDATE | `PATCH /alertas/{id}/visto` | `{ visto }` |
| reproducoes | CREATE | `POST /cobertura` | payload |
| reproducoes | UPDATE (plain) | `PATCH /cobertura/{id}` | `{ status, tipo_parto }` |
| reproducoes | UPDATE (parto) | `PATCH /cobertura/{id}/registrar-parto` | `{ dt_parto, tipo_parto, observacao, criar_ciclo_lactacao, padrao_dias_lactacao }` |
| reproducoes | DELETE | `DELETE /cobertura/{id}` | — |
| ciclos_lactacao | CREATE | `POST /lactacao` | payload |
| ciclos_lactacao | UPDATE | `PATCH /lactacao/{id}` | payload |
| ciclos_lactacao | DELETE | `DELETE /lactacao/{id}` | — |

Discriminador de mover-grupo: payload contém `idNovoGrupo` (ver `bufaloService.moverBufaloDeGrupo`).
Discriminador de registrar-parto: payload contém `dt_parto` ou `criar_ciclo_lactacao` (ver `reproducaoService.registrarParto`).

---

## File Structure

- **Create** `src/services/sync/pushEndpoints.ts` — registry puro + `resolvePushEndpoint`. Responsabilidade única: mapear (entidade, operação, payload) → (endpoint, método, body).
- **Create** `src/services/sync/__tests__/pushEndpoints.test.ts` — testes unitários da função pura (sem mocks de DB).
- **Modify** `src/services/pendingOperationsService.ts` — `enqueue` consulta o registry e grava o body transformado; remove `ENTITY_ROUTE` + `deriveEndpointMethod`.
- **Modify** `src/services/__tests__/pendingOperationsService.test.ts` — adiciona asserção de endpoint/method resolvidos.
- **Modify** `src/database/migrations.ts` — bump `CURRENT_VERSION` para 6 (a lógica de drop-all já limpa `pending_operations`).
- **Modify** `__tests__/database/migrations.test.ts` — atualiza versão esperada para 6.

---

### Task 1: Registry — entidade `bufalos` (incl. mover grupo)

**Files:**
- Create: `src/services/sync/pushEndpoints.ts`
- Test: `src/services/sync/__tests__/pushEndpoints.test.ts`

- [ ] **Step 1: Write the failing test**

Criar `src/services/sync/__tests__/pushEndpoints.test.ts`:

```typescript
import { resolvePushEndpoint } from '../pushEndpoints';

describe('pushEndpoints — bufalos', () => {
  test('CREATE → POST /bufalos com payload', () => {
    const p = { id: 'b1', brinco: 'A001' };
    expect(resolvePushEndpoint('bufalos', 'CREATE', p)).toEqual({
      endpoint: '/bufalos', method: 'POST', body: p,
    });
  });

  test('UPDATE normal → PATCH /bufalos/{id}', () => {
    const p = { id: 'b1', brinco: 'A002' };
    expect(resolvePushEndpoint('bufalos', 'UPDATE', p)).toEqual({
      endpoint: '/bufalos/b1', method: 'PATCH', body: p,
    });
  });

  test('UPDATE com idNovoGrupo → PATCH /bufalos/grupo/mover com body específico', () => {
    const p = { id: 'b1', idsBufalos: ['b1'], idNovoGrupo: 'g2', motivo: 'manual' };
    expect(resolvePushEndpoint('bufalos', 'UPDATE', p)).toEqual({
      endpoint: '/bufalos/grupo/mover',
      method: 'PATCH',
      body: { idsBufalos: ['b1'], idNovoGrupo: 'g2', motivo: 'manual' },
    });
  });

  test('DELETE → DELETE /bufalos/{id} sem body', () => {
    expect(resolvePushEndpoint('bufalos', 'DELETE', { id: 'b1' })).toEqual({
      endpoint: '/bufalos/b1', method: 'DELETE',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/sync/__tests__/pushEndpoints.test.ts`
Expected: FAIL — `Cannot find module '../pushEndpoints'`.

- [ ] **Step 3: Write minimal implementation**

Criar `src/services/sync/pushEndpoints.ts`:

```typescript
export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ResolvedPush {
  endpoint: string;
  method: string;
  body?: any;
}

type Resolver = (operation: OperationType, payload: any) => ResolvedPush | null;

const RESOLVERS: Record<string, Resolver> = {
  bufalos: (op, p) => {
    if (op === 'UPDATE' && p?.idNovoGrupo) {
      return {
        endpoint: '/bufalos/grupo/mover',
        method: 'PATCH',
        body: { idsBufalos: p.idsBufalos ?? [p.id], idNovoGrupo: p.idNovoGrupo, motivo: p.motivo },
      };
    }
    if (op === 'CREATE') return { endpoint: '/bufalos', method: 'POST', body: p };
    if (op === 'UPDATE') return { endpoint: `/bufalos/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/bufalos/${p.id}`, method: 'DELETE' };
    return null;
  },
};

export function resolvePushEndpoint(entity: string, operation: OperationType, payload: any): ResolvedPush {
  const resolved = RESOLVERS[entity]?.(operation, payload);
  if (resolved) return resolved;

  const base = `/${entity}`;
  const id = payload?.id ?? null;
  if (operation === 'CREATE') return { endpoint: base, method: 'POST', body: payload };
  if (operation === 'UPDATE') return { endpoint: id ? `${base}/${id}` : base, method: 'PATCH', body: payload };
  return id ? { endpoint: `${base}/${id}`, method: 'DELETE' } : { endpoint: base, method: 'DELETE' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/sync/__tests__/pushEndpoints.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/services/sync/pushEndpoints.ts src/services/sync/__tests__/pushEndpoints.test.ts
git commit -m "feat(push): registry de endpoints com resolver de bufalos"
```

---

### Task 2: Resolvers `pesagens`, `eventos_sanitarios`, `alertas`

**Files:**
- Modify: `src/services/sync/pushEndpoints.ts`
- Test: `src/services/sync/__tests__/pushEndpoints.test.ts`

- [ ] **Step 1: Write the failing test**

Adicionar ao final de `src/services/sync/__tests__/pushEndpoints.test.ts`:

```typescript
describe('pushEndpoints — pesagens', () => {
  test('CREATE → POST /dados-zootecnicos/bufalo/{bufaloId}', () => {
    const p = { id: 'z1', bufaloId: 'b9', peso: 480 };
    expect(resolvePushEndpoint('pesagens', 'CREATE', p)).toEqual({
      endpoint: '/dados-zootecnicos/bufalo/b9', method: 'POST', body: p,
    });
  });

  test('UPDATE → PATCH /dados-zootecnicos/{id}', () => {
    const p = { id: 'z1', peso: 490 };
    expect(resolvePushEndpoint('pesagens', 'UPDATE', p)).toEqual({
      endpoint: '/dados-zootecnicos/z1', method: 'PATCH', body: p,
    });
  });

  test('DELETE → DELETE /dados-zootecnicos/{id}', () => {
    expect(resolvePushEndpoint('pesagens', 'DELETE', { id: 'z1' })).toEqual({
      endpoint: '/dados-zootecnicos/z1', method: 'DELETE',
    });
  });
});

describe('pushEndpoints — eventos_sanitarios', () => {
  test('CREATE → POST /dados-sanitarios', () => {
    const p = { id: 's1', bufaloId: 'b9' };
    expect(resolvePushEndpoint('eventos_sanitarios', 'CREATE', p)).toEqual({
      endpoint: '/dados-sanitarios', method: 'POST', body: p,
    });
  });

  test('UPDATE → PATCH /dados-sanitarios/{id}', () => {
    const p = { id: 's1', doenca: 'Mastite' };
    expect(resolvePushEndpoint('eventos_sanitarios', 'UPDATE', p)).toEqual({
      endpoint: '/dados-sanitarios/s1', method: 'PATCH', body: p,
    });
  });

  test('DELETE → DELETE /dados-sanitarios/{id}', () => {
    expect(resolvePushEndpoint('eventos_sanitarios', 'DELETE', { id: 's1' })).toEqual({
      endpoint: '/dados-sanitarios/s1', method: 'DELETE',
    });
  });
});

describe('pushEndpoints — alertas', () => {
  test('UPDATE → PATCH /alertas/{id}/visto com body { visto }', () => {
    expect(resolvePushEndpoint('alertas', 'UPDATE', { id: 'a1', visto: true })).toEqual({
      endpoint: '/alertas/a1/visto', method: 'PATCH', body: { visto: true },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/sync/__tests__/pushEndpoints.test.ts`
Expected: FAIL — `pesagens` cai no fallback (`/pesagens`), asserção de `/dados-zootecnicos/...` quebra.

- [ ] **Step 3: Write minimal implementation**

Em `src/services/sync/pushEndpoints.ts`, adicionar as três chaves ao objeto `RESOLVERS` (depois de `bufalos`):

```typescript
  pesagens: (op, p) => {
    if (op === 'CREATE') return { endpoint: `/dados-zootecnicos/bufalo/${p.bufaloId}`, method: 'POST', body: p };
    if (op === 'UPDATE') return { endpoint: `/dados-zootecnicos/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/dados-zootecnicos/${p.id}`, method: 'DELETE' };
    return null;
  },
  eventos_sanitarios: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/dados-sanitarios', method: 'POST', body: p };
    if (op === 'UPDATE') return { endpoint: `/dados-sanitarios/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/dados-sanitarios/${p.id}`, method: 'DELETE' };
    return null;
  },
  alertas: (op, p) => {
    if (op === 'UPDATE') return { endpoint: `/alertas/${p.id}/visto`, method: 'PATCH', body: { visto: p.visto ?? true } };
    return null;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/sync/__tests__/pushEndpoints.test.ts`
Expected: PASS (todos os describes).

- [ ] **Step 5: Commit**

```bash
git add src/services/sync/pushEndpoints.ts src/services/sync/__tests__/pushEndpoints.test.ts
git commit -m "feat(push): resolvers de pesagens, eventos_sanitarios e alertas"
```

---

### Task 3: Resolvers `reproducoes` (split registrar-parto) e `ciclos_lactacao`

**Files:**
- Modify: `src/services/sync/pushEndpoints.ts`
- Test: `src/services/sync/__tests__/pushEndpoints.test.ts`

- [ ] **Step 1: Write the failing test**

Adicionar ao final de `src/services/sync/__tests__/pushEndpoints.test.ts`:

```typescript
describe('pushEndpoints — reproducoes', () => {
  test('CREATE → POST /cobertura', () => {
    const p = { id: 'r1', idBufala: 'b1' };
    expect(resolvePushEndpoint('reproducoes', 'CREATE', p)).toEqual({
      endpoint: '/cobertura', method: 'POST', body: p,
    });
  });

  test('UPDATE plain → PATCH /cobertura/{id} com { status, tipo_parto }', () => {
    const p = { id: 'r1', status: 'Confirmada', tipo_parto: undefined };
    expect(resolvePushEndpoint('reproducoes', 'UPDATE', p)).toEqual({
      endpoint: '/cobertura/r1', method: 'PATCH', body: { status: 'Confirmada', tipo_parto: undefined },
    });
  });

  test('UPDATE com dt_parto → PATCH /cobertura/{id}/registrar-parto', () => {
    const p = {
      id: 'r1', status: 'CONCLUIDA',
      dt_parto: '2026-05-01', tipo_parto: 'Normal',
      observacao: 'ok', criar_ciclo_lactacao: true, padrao_dias_lactacao: 305,
    };
    expect(resolvePushEndpoint('reproducoes', 'UPDATE', p)).toEqual({
      endpoint: '/cobertura/r1/registrar-parto',
      method: 'PATCH',
      body: {
        dt_parto: '2026-05-01', tipo_parto: 'Normal',
        observacao: 'ok', criar_ciclo_lactacao: true, padrao_dias_lactacao: 305,
      },
    });
  });

  test('DELETE → DELETE /cobertura/{id}', () => {
    expect(resolvePushEndpoint('reproducoes', 'DELETE', { id: 'r1' })).toEqual({
      endpoint: '/cobertura/r1', method: 'DELETE',
    });
  });
});

describe('pushEndpoints — ciclos_lactacao', () => {
  test('CREATE → POST /lactacao', () => {
    const p = { id: 'c1', dt_parto: '2026-01-10' };
    expect(resolvePushEndpoint('ciclos_lactacao', 'CREATE', p)).toEqual({
      endpoint: '/lactacao', method: 'POST', body: p,
    });
  });

  test('UPDATE → PATCH /lactacao/{id}', () => {
    const p = { id: 'c1', status: 'seco' };
    expect(resolvePushEndpoint('ciclos_lactacao', 'UPDATE', p)).toEqual({
      endpoint: '/lactacao/c1', method: 'PATCH', body: p,
    });
  });

  test('DELETE → DELETE /lactacao/{id}', () => {
    expect(resolvePushEndpoint('ciclos_lactacao', 'DELETE', { id: 'c1' })).toEqual({
      endpoint: '/lactacao/c1', method: 'DELETE',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/sync/__tests__/pushEndpoints.test.ts`
Expected: FAIL — `reproducoes` cai no fallback (`/reproducoes`), asserções quebram.

- [ ] **Step 3: Write minimal implementation**

Em `src/services/sync/pushEndpoints.ts`, adicionar ao `RESOLVERS`:

```typescript
  reproducoes: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/cobertura', method: 'POST', body: p };
    if (op === 'UPDATE') {
      const isRegistrarParto = p?.dt_parto != null || p?.criar_ciclo_lactacao != null;
      if (isRegistrarParto) {
        return {
          endpoint: `/cobertura/${p.id}/registrar-parto`,
          method: 'PATCH',
          body: {
            dt_parto: p.dt_parto,
            tipo_parto: p.tipo_parto,
            observacao: p.observacao,
            criar_ciclo_lactacao: p.criar_ciclo_lactacao,
            padrao_dias_lactacao: p.padrao_dias_lactacao,
          },
        };
      }
      return { endpoint: `/cobertura/${p.id}`, method: 'PATCH', body: { status: p.status, tipo_parto: p.tipo_parto } };
    }
    if (op === 'DELETE') return { endpoint: `/cobertura/${p.id}`, method: 'DELETE' };
    return null;
  },
  ciclos_lactacao: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/lactacao', method: 'POST', body: p };
    if (op === 'UPDATE') return { endpoint: `/lactacao/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/lactacao/${p.id}`, method: 'DELETE' };
    return null;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/sync/__tests__/pushEndpoints.test.ts`
Expected: PASS (todos os describes).

- [ ] **Step 5: Commit**

```bash
git add src/services/sync/pushEndpoints.ts src/services/sync/__tests__/pushEndpoints.test.ts
git commit -m "feat(push): resolvers de reproducoes (split registrar-parto) e ciclos_lactacao"
```

---

### Task 4: Fallback genérico para entidade desconhecida

**Files:**
- Test: `src/services/sync/__tests__/pushEndpoints.test.ts`

(O fallback já foi implementado na Task 1; aqui só travamos o comportamento com teste.)

- [ ] **Step 1: Write the failing test**

Adicionar ao final de `src/services/sync/__tests__/pushEndpoints.test.ts`:

```typescript
describe('pushEndpoints — fallback genérico', () => {
  test('entidade sem resolver: CREATE → POST /{entity}', () => {
    const p = { id: 'x1' };
    expect(resolvePushEndpoint('grupos', 'CREATE', p)).toEqual({
      endpoint: '/grupos', method: 'POST', body: p,
    });
  });

  test('entidade sem resolver: UPDATE com id → PATCH /{entity}/{id}', () => {
    const p = { id: 'x1' };
    expect(resolvePushEndpoint('grupos', 'UPDATE', p)).toEqual({
      endpoint: '/grupos/x1', method: 'PATCH', body: p,
    });
  });

  test('entidade sem resolver: DELETE com id → DELETE /{entity}/{id}', () => {
    expect(resolvePushEndpoint('grupos', 'DELETE', { id: 'x1' })).toEqual({
      endpoint: '/grupos/x1', method: 'DELETE',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it passes (já implementado)**

Run: `npx jest src/services/sync/__tests__/pushEndpoints.test.ts`
Expected: PASS — o fallback da Task 1 já cobre esses casos.

> Se algum falhar, ajustar o bloco fallback de `resolvePushEndpoint` em `pushEndpoints.ts` para casar com os testes acima.

- [ ] **Step 3: Commit**

```bash
git add src/services/sync/__tests__/pushEndpoints.test.ts
git commit -m "test(push): trava comportamento do fallback genérico"
```

---

### Task 5: Religar `pendingOperationsService.enqueue` ao registry

**Files:**
- Modify: `src/services/pendingOperationsService.ts`
- Modify: `src/services/__tests__/pendingOperationsService.test.ts`

- [ ] **Step 1: Write the failing test**

Substituir o teste `enqueue insere operação...` em `src/services/__tests__/pendingOperationsService.test.ts` por dois testes que verificam endpoint/method resolvidos. O arquivo final fica:

```typescript
jest.mock('@op-engineering/op-sqlite');
jest.mock('../../database/db');
jest.mock('react-native-uuid', () => ({ v4: () => 'test-uuid' }));

import { queryAll, execute } from '../../database/db';
import { enqueue, getPending, markSynced, incrementRetry } from '../pendingOperationsService';

const mockQueryAll = queryAll as jest.Mock;
const mockExecute = execute as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('enqueue grava endpoint/method resolvidos pelo registry (pesagens CREATE)', async () => {
  mockExecute.mockResolvedValue(undefined);

  await enqueue('pesagens', 'CREATE', { id: 'z1', bufaloId: 'b9' });

  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO pending_operations'),
    expect.arrayContaining(['test-uuid', 'pesagens', 'CREATE', '/dados-zootecnicos/bufalo/b9', 'POST'])
  );
});

test('enqueue grava o body transformado (bufalos mover grupo)', async () => {
  mockExecute.mockResolvedValue(undefined);

  await enqueue('bufalos', 'UPDATE', { id: 'b1', idsBufalos: ['b1'], idNovoGrupo: 'g2', motivo: 'manual' });

  const call = mockExecute.mock.calls[0];
  const params = call[1] as any[];
  expect(params).toEqual(
    expect.arrayContaining(['test-uuid', 'bufalos', 'UPDATE', '/bufalos/grupo/mover', 'PATCH'])
  );
  const storedBody = JSON.parse(params[5]);
  expect(storedBody).toEqual({ idsBufalos: ['b1'], idNovoGrupo: 'g2', motivo: 'manual' });
});

test('getPending retorna operações com retryCount < 5', async () => {
  mockQueryAll.mockResolvedValue([{ id: '1', status: 'PENDING', entity: 'bufalos' }]);

  const ops = await getPending();
  expect(ops).toHaveLength(1);
  expect(mockQueryAll).toHaveBeenCalledWith(
    expect.stringContaining('retryCount < ?'),
    [5]
  );
});

test('markSynced remove a operação da tabela', async () => {
  mockExecute.mockResolvedValue(undefined);
  await markSynced('op-id-1');
  expect(mockExecute).toHaveBeenCalledWith(
    'DELETE FROM pending_operations WHERE id = ?',
    ['op-id-1']
  );
});

test('incrementRetry atualiza retryCount via SQL', async () => {
  mockExecute.mockResolvedValue(undefined);
  await incrementRetry('op-id-2');
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('retryCount + 1'),
    ['op-id-2']
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/pendingOperationsService.test.ts`
Expected: FAIL — o `enqueue` atual usa `ENTITY_ROUTE`/`deriveEndpointMethod` e gera `/pesagens` (não `/dados-zootecnicos/bufalo/b9`), e grava o payload bruto (não o body transformado).

- [ ] **Step 3: Write minimal implementation**

Em `src/services/pendingOperationsService.ts`:

1. Adicionar o import no topo (após a linha do `db`):

```typescript
import { resolvePushEndpoint } from './sync/pushEndpoints';
```

2. Remover o bloco `ENTITY_ROUTE` (linhas 19-30) e a função `deriveEndpointMethod` (linhas 32-40).

3. Substituir a função `enqueue` por:

```typescript
export async function enqueue(entity: string, operation: OperationType, payload: object): Promise<void> {
  const { endpoint, method, body } = resolvePushEndpoint(entity, operation, payload);
  await execute(
    `INSERT INTO pending_operations
      (id, entity, operation, endpoint, method, payload, status, retryCount, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)`,
    [
      String(uuid.v4()),
      entity,
      operation,
      endpoint,
      method,
      JSON.stringify(body ?? payload),
      new Date().toISOString(),
    ]
  );
}
```

> A ordem dos parâmetros do INSERT é preservada (id, entity, operation, endpoint, method, payload, createdAt) — `payload` agora guarda o **body transformado**.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/pendingOperationsService.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/services/pendingOperationsService.ts src/services/__tests__/pendingOperationsService.test.ts
git commit -m "refactor(push): enqueue usa registry e grava body transformado"
```

---

### Task 6: Bump de migração (limpa `pending_operations` antigos)

**Files:**
- Modify: `src/database/migrations.ts:4`
- Modify: `__tests__/database/migrations.test.ts`

Contexto: `runMigrations` já dropa todas as `LEGACY_TABLES` (incluindo `pending_operations`) e recria quando `version < CURRENT_VERSION`. Bumpar a versão força a limpeza dos writes antigos com endpoint errado.

- [ ] **Step 1: Write the failing test**

O arquivo `__tests__/database/migrations.test.ts` está **defasado** (espera `user_version = 3`, mas o código já está em v5). Atualizar as **três** ocorrências para 6, via Edit:

1. Linha 25 (dentro de `creates tables when user_version is 0`):
   - De: `expect(mockExecute).toHaveBeenCalledWith('PRAGMA user_version = 3');`
   - Para: `expect(mockExecute).toHaveBeenCalledWith('PRAGMA user_version = 6');`

2. Linha 39 (dentro de `drops old tables and recreates when user_version is 1`):
   - De: `expect(mockExecute).toHaveBeenCalledWith('PRAGMA user_version = 3');`
   - Para: `expect(mockExecute).toHaveBeenCalledWith('PRAGMA user_version = 6');`

3. Linha 43 (dentro de `skips migrations when user_version is current`):
   - De: `mockExecute.mockResolvedValueOnce({ rows: [{ user_version: 3 }] });`
   - Para: `mockExecute.mockResolvedValueOnce({ rows: [{ user_version: 6 }] });`

> As duas primeiras ocorrências de `'PRAGMA user_version = 3'` são idênticas — usar Edit com `replace_all` ou editar com contexto suficiente (o `it(...)` ao redor) para diferenciá-las.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/database/migrations.test.ts`
Expected: FAIL — implementação ainda grava `PRAGMA user_version = 5`.

- [ ] **Step 3: Write minimal implementation**

Em `src/database/migrations.ts`, linha 4:

```typescript
const CURRENT_VERSION = 6;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/database/migrations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/migrations.ts __tests__/database/migrations.test.ts
git commit -m "chore(db): bump migração v6 para limpar fila de push com endpoints antigos"
```

---

### Task 7: Suíte completa + verificação final

**Files:** nenhum (apenas execução)

- [ ] **Step 1: Rodar a suíte inteira**

Run: `npx jest`
Expected: PASS em todos os arquivos de teste (incluindo `pushEndpoints`, `pendingOperationsService`, `migrations`, e os pré-existentes de `bufaloService`, `sanitarioService`, `lactacaoService`, `syncService`, `db`).

- [ ] **Step 2: Verificar que nenhum resolver quebrou os services existentes**

Conferir manualmente que os `enqueue` em produção batem com o registry:
- `bufaloService.ts`: `enqueue('bufalos', ...)` (CREATE/UPDATE/DELETE) e `moverBufaloDeGrupo` (`enqueue('bufalos','UPDATE',{ id, idsBufalos, idNovoGrupo, motivo })`).
- `zootecnicoService.ts`: `enqueue('pesagens', ...)` — confirmar que o CREATE carrega `bufaloId` no payload (linha ~30, `newRecord = { ..., bufaloId: id_bufalo }`).
- `sanitarioService.ts`: `enqueue('eventos_sanitarios', ...)`.
- `alertaService.ts`: `enqueue('alertas','UPDATE',{ id, visto: true })`.
- `reproducaoService.ts`: `createReproducao`/`updateReproducao`/`registrarParto`.

Não alterar esses arquivos nesta fase — apenas confirmar que os payloads contêm os campos que os resolvers leem (`id`, `bufaloId`, `idNovoGrupo`, `dt_parto`).

- [ ] **Step 3: Commit (se algum ajuste foi necessário)**

```bash
git add -A
git commit -m "test(push): garante suíte verde para a fila de push corrigida"
```

> Se nenhum ajuste foi necessário, pular este commit.

---

## Notas para o executor

- **Não tocar** em `registrarLactacaoApi`, `registrarColetaApi`, `registrarEstoqueApi` (`lactacaoService.ts`) — fora de escopo (Fase 3).
- **Não alterar** `syncService.push` — ele já lê `op.endpoint`/`op.method`/`op.payload` da fila.
- O bump de migração v6 **apaga todo o SQLite local** (drop-all + recreate) no próximo boot — incluindo a fila de push antiga. Isso é intencional: writes antigos tinham endpoint errado. Dados de leitura são re-sincronizados da API.
- Rodar testes com `npx jest <arquivo>` para focar; `npx jest` para a suíte toda.
