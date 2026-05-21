# Fix Rotas + Dashboards Offline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir as rotas erradas de `registrarColetaApi`/`registrarEstoqueApi` e implementar os dashboards completamente offline via SQLite (Fase 5).

**Architecture:** Dois shapes novos em `pushEndpoints.ts` redirecionam as filas para os endpoints corretos. Um novo `dashboardService.ts` lê os dados locais do SQLite e retorna os mesmos shapes que a API retorna hoje, permitindo que as três telas (`HomeScreen`, `ReproducaoScreen`, `LactacaoScreen`) funcionem offline sem alterações.

**Tech Stack:** TypeScript, React Native, `@op-engineering/op-sqlite`, Jest

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/services/sync/pushEndpoints.ts` | Modificar | Adicionar shapes + resolvers para `retiradas` e `producao_diaria` |
| `src/services/lactacaoService.ts` | Modificar | Corrigir `registrarColetaApi` e `registrarEstoqueApi`; substituir `getEstatisticasLactacao` |
| `src/services/syncService.ts` | Modificar | Guardar execute de UPDATE local para entidades sem tabela (fire-and-forget) |
| `src/services/dashboardService.ts` | Criar | 4 funções de dashboard lendo SQLite |
| `src/services/propriedadeService.ts` | Modificar | Substituir chamada de API em `getDashboardPropriedade` |
| `src/services/reproducaoService.ts` | Modificar | Substituir chamada de API em `getReproducaoDashboardStats` |
| `src/services/sync/__tests__/pushEndpoints.test.ts` | Modificar | Testes para os dois novos resolvers |
| `src/services/__tests__/syncService.test.ts` | Modificar | Teste para push de entidade fire-and-forget |
| `src/services/__tests__/dashboardService.test.ts` | Criar | Testes TDD para dashboardService |

---

## Task 1 — Shapes + Resolvers para `retiradas` e `producao_diaria`

**Files:**
- Modify: `src/services/sync/pushEndpoints.ts`
- Modify: `src/services/sync/__tests__/pushEndpoints.test.ts`

- [ ] **Step 1.1: Escrever testes que vão falhar**

Adicionar ao final de `src/services/sync/__tests__/pushEndpoints.test.ts`:

```typescript
describe('retiradas resolver', () => {
  test('CREATE resolve para POST /retiradas com body limpo', () => {
    const payload = {
      id: 'r1',
      idIndustria: 'ind-1',
      idPropriedade: 'prop-1',
      resultadoTeste: true,
      observacao: 'ok',
      quantidade: 50,
      dtColeta: '2026-05-21',
      campoExtra: 'deve ser removido',
    };
    const result = resolvePushEndpoint('retiradas', 'CREATE', payload);
    expect(result.endpoint).toBe('/retiradas');
    expect(result.method).toBe('POST');
    expect(result.body).toEqual({
      id: 'r1',
      idIndustria: 'ind-1',
      idPropriedade: 'prop-1',
      resultadoTeste: true,
      observacao: 'ok',
      quantidade: 50,
      dtColeta: '2026-05-21',
    });
  });

  test('CREATE sem campos opcionais — observacao e resultadoTeste ausentes', () => {
    const payload = { id: 'r2', idIndustria: 'ind-1', idPropriedade: 'prop-1', quantidade: 30, dtColeta: '2026-05-20' };
    const result = resolvePushEndpoint('retiradas', 'CREATE', payload);
    expect(result.body).not.toHaveProperty('observacao');
    expect(result.body).not.toHaveProperty('resultadoTeste');
  });
});

describe('producao_diaria resolver', () => {
  test('CREATE resolve para POST /producao-diaria com body adaptado', () => {
    const payload = {
      id: 'pd1',
      id_propriedade: 'prop-1',
      quantidade: 120,
      dt_registro: '2026-05-21',
      observacao: 'normal',
      id_usuario: 'usr-1', // deve ser removido
    };
    const result = resolvePushEndpoint('producao_diaria', 'CREATE', payload);
    expect(result.endpoint).toBe('/producao-diaria');
    expect(result.method).toBe('POST');
    expect(result.body).toEqual({
      id: 'pd1',
      idPropriedade: 'prop-1',
      quantidade: 120,
      dtRegistro: '2026-05-21',
      observacao: 'normal',
    });
    expect(result.body).not.toHaveProperty('id_usuario');
    expect(result.body).not.toHaveProperty('id_propriedade');
    expect(result.body).not.toHaveProperty('dt_registro');
  });

  test('CREATE sem observacao — campo ausente no body', () => {
    const payload = { id: 'pd2', id_propriedade: 'prop-1', quantidade: 80, dt_registro: '2026-05-20' };
    const result = resolvePushEndpoint('producao_diaria', 'CREATE', payload);
    expect(result.body).not.toHaveProperty('observacao');
  });
});
```

- [ ] **Step 1.2: Rodar e confirmar FAIL**

```bash
cd "/home/v1nisouza/Área de trabalho/PASTA PI/dsm5-buffs-mobile"
npx jest src/services/sync/__tests__/pushEndpoints.test.ts --no-coverage 2>&1 | tail -20
```

Esperado: falha com `TypeError: resolvePushEndpoint is not a function` ou similar porque os resolvers não existem ainda.

- [ ] **Step 1.3: Implementar shapes + resolvers em `pushEndpoints.ts`**

Adicionar após `shapeLoteCreate` (antes de `const RESOLVERS`):

```typescript
function shapeRetiradaCreate(p: any) {
  return clean({
    id: p.id,
    idIndustria: p.idIndustria,
    idPropriedade: p.idPropriedade,
    resultadoTeste: p.resultadoTeste,
    observacao: p.observacao,
    quantidade: p.quantidade,
    dtColeta: p.dtColeta,
  });
}

function shapeProducaoDiariaCreate(p: any) {
  return clean({
    id: p.id,
    idPropriedade: p.idPropriedade ?? p.id_propriedade,
    quantidade: p.quantidade,
    dtRegistro: p.dtRegistro ?? p.dt_registro,
    observacao: p.observacao,
  });
}
```

Adicionar ao objeto `RESOLVERS` após `ordenhas`:

```typescript
  retiradas: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/retiradas', method: 'POST', body: shapeRetiradaCreate(p) };
    return null;
  },
  producao_diaria: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/producao-diaria', method: 'POST', body: shapeProducaoDiariaCreate(p) };
    return null;
  },
```

- [ ] **Step 1.4: Rodar e confirmar PASS**

```bash
npx jest src/services/sync/__tests__/pushEndpoints.test.ts --no-coverage 2>&1 | tail -10
```

Esperado: todos os testes passam.

- [ ] **Step 1.5: Commit**

```bash
git add src/services/sync/pushEndpoints.ts src/services/sync/__tests__/pushEndpoints.test.ts
git commit -m "feat(push): adiciona resolvers para retiradas e producao_diaria"
```

---

## Task 2 — Corrigir `registrarColetaApi` / `registrarEstoqueApi`

**Files:**
- Modify: `src/services/lactacaoService.ts`

- [ ] **Step 2.1: Escrever teste que vai falhar**

Criar `src/services/__tests__/lactacaoService.routing.test.ts`:

```typescript
jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

import { enqueue } from '../pendingOperationsService';
import { registrarColetaApi, registrarEstoqueApi } from '../lactacaoService';

const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('registrarColetaApi enfileira em "retiradas" (não em ciclos_lactacao)', async () => {
  mockEnqueue.mockResolvedValue(undefined);
  await registrarColetaApi({
    idIndustria: 'ind-1',
    idPropriedade: 'prop-1',
    resultadoTeste: true,
    quantidade: 50,
    dtColeta: '2026-05-21',
  });
  expect(mockEnqueue).toHaveBeenCalledWith('retiradas', 'CREATE', expect.objectContaining({
    idIndustria: 'ind-1',
    idPropriedade: 'prop-1',
    quantidade: 50,
  }));
  const [entity] = mockEnqueue.mock.calls[0];
  expect(entity).not.toBe('ciclos_lactacao');
});

test('registrarEstoqueApi enfileira em "producao_diaria" (não em ciclos_lactacao)', async () => {
  mockEnqueue.mockResolvedValue(undefined);
  await registrarEstoqueApi({
    id_propriedade: 'prop-1',
    id_usuario: 'usr-1',
    quantidade: 100,
    dt_registro: '2026-05-21',
    observacao: 'ok',
  });
  expect(mockEnqueue).toHaveBeenCalledWith('producao_diaria', 'CREATE', expect.objectContaining({
    idPropriedade: 'prop-1',
    quantidade: 100,
  }));
  const [entity] = mockEnqueue.mock.calls[0];
  expect(entity).not.toBe('ciclos_lactacao');
});

test('registrarEstoqueApi adapta snake_case → camelCase e remove id_usuario', async () => {
  mockEnqueue.mockResolvedValue(undefined);
  await registrarEstoqueApi({
    id_propriedade: 'prop-1',
    id_usuario: 'usr-1',
    quantidade: 80,
    dt_registro: '2026-05-20',
  });
  const [, , payload] = mockEnqueue.mock.calls[0];
  expect(payload).toHaveProperty('idPropriedade', 'prop-1');
  expect(payload).toHaveProperty('dtRegistro', '2026-05-20');
  expect(payload).not.toHaveProperty('id_usuario');
  expect(payload).not.toHaveProperty('id_propriedade');
  expect(payload).not.toHaveProperty('dt_registro');
});
```

- [ ] **Step 2.2: Rodar e confirmar FAIL**

```bash
npx jest src/services/__tests__/lactacaoService.routing.test.ts --no-coverage 2>&1 | tail -20
```

Esperado: falha porque `registrarColetaApi` e `registrarEstoqueApi` ainda usam `ciclos_lactacao`.

- [ ] **Step 2.3: Corrigir as duas funções em `lactacaoService.ts`**

Substituir:

```typescript
export const registrarColetaApi = async (payload: ColetaRegistroPayload) => {
  const id = uuid.v4() as string;
  await enqueue("ciclos_lactacao", "CREATE", { ...payload, id });
};

export const registrarEstoqueApi = async (payload: EstoqueRegistroPayload) => {
  const id = uuid.v4() as string;
  await enqueue("ciclos_lactacao", "CREATE", { ...payload, id });
};
```

Por:

```typescript
export const registrarColetaApi = async (payload: ColetaRegistroPayload) => {
  const id = uuid.v4() as string;
  await enqueue("retiradas", "CREATE", { ...payload, id });
};

export const registrarEstoqueApi = async (payload: EstoqueRegistroPayload) => {
  const id = uuid.v4() as string;
  await enqueue("producao_diaria", "CREATE", {
    id,
    idPropriedade: String(payload.id_propriedade),
    quantidade: payload.quantidade,
    dtRegistro: payload.dt_registro,
    observacao: payload.observacao,
  });
};
```

- [ ] **Step 2.4: Rodar e confirmar PASS**

```bash
npx jest src/services/__tests__/lactacaoService.routing.test.ts --no-coverage 2>&1 | tail -10
```

Esperado: 3 testes passam.

- [ ] **Step 2.5: Commit**

```bash
git add src/services/lactacaoService.ts src/services/__tests__/lactacaoService.routing.test.ts
git commit -m "fix(lactacao): registrarColetaApi → POST /retiradas; registrarEstoqueApi → POST /producao-diaria"
```

---

## Task 3 — Guardar push() contra entidades fire-and-forget

**Files:**
- Modify: `src/services/syncService.ts`
- Modify: `src/services/__tests__/syncService.test.ts`

**Contexto:** Após o push de `retiradas`/`producao_diaria`, o código atual tenta executar `UPDATE retiradas SET _synced = 1 ...`, que falha porque essas entidades não têm tabela local. Precisamos guardar esse execute com um check de `pk`.

- [ ] **Step 3.1: Escrever teste que vai falhar**

Adicionar ao final de `src/services/__tests__/syncService.test.ts`:

```typescript
test('push de entidade fire-and-forget (retiradas) não tenta UPDATE em tabela local', async () => {
  mockGetPending.mockResolvedValue([{
    id: 'op-ret',
    operation: 'CREATE',
    entity: 'retiradas',
    endpoint: '/retiradas',
    method: 'POST',
    payload: '{"id":"r1","idPropriedade":"p1","quantidade":50}',
    retryCount: 0,
  }]);
  mockApiFetch.mockResolvedValue({ id: 'r1' });
  mockMarkSynced.mockResolvedValue(undefined);

  await (syncService as any).push();

  expect(mockMarkSynced).toHaveBeenCalledWith('op-ret');
  // execute NÃO deve ter sido chamado com UPDATE retiradas
  const updateCalls = mockExecute.mock.calls.filter(
    ([sql]) => typeof sql === 'string' && sql.includes('UPDATE retiradas')
  );
  expect(updateCalls).toHaveLength(0);
});
```

- [ ] **Step 3.2: Rodar e confirmar FAIL**

```bash
npx jest src/services/__tests__/syncService.test.ts --no-coverage 2>&1 | tail -20
```

Esperado: `execute` é chamado com `UPDATE retiradas ...` e o test falha.

- [ ] **Step 3.3: Corrigir push() em `syncService.ts`**

Localizar o bloco pós-`markSynced` em `push()` e substituir:

```typescript
const pk = ENTITY_PK_MAP[op.entity];
const localId = JSON.parse(op.payload)[pk] ?? JSON.parse(op.payload).id;
if (localId) {
  await execute(`UPDATE ${op.entity} SET _synced = 1 WHERE ${pk} = ? OR id = ?`, [localId, localId]);
}
```

Por:

```typescript
const pk = ENTITY_PK_MAP[op.entity];
if (pk) {
  const localId = JSON.parse(op.payload)[pk] ?? JSON.parse(op.payload).id;
  if (localId) {
    await execute(`UPDATE ${op.entity} SET _synced = 1 WHERE ${pk} = ? OR id = ?`, [localId, localId]);
  }
}
```

- [ ] **Step 3.4: Rodar todos os testes de syncService**

```bash
npx jest src/services/__tests__/syncService.test.ts --no-coverage 2>&1 | tail -10
```

Esperado: todos os testes passam (inclusive os anteriores).

- [ ] **Step 3.5: Commit**

```bash
git add src/services/syncService.ts src/services/__tests__/syncService.test.ts
git commit -m "fix(sync): guarda UPDATE local para entidades fire-and-forget sem tabela"
```

---

## Task 4 — `dashboardService.getStats`

**Files:**
- Create: `src/services/dashboardService.ts`
- Create: `src/services/__tests__/dashboardService.test.ts`

- [ ] **Step 4.1: Criar o arquivo de testes com os primeiros casos**

Criar `src/services/__tests__/dashboardService.test.ts`:

```typescript
jest.mock('../../database/db');
import { queryAll, queryFirst } from '../../database/db';
import { getStats } from '../dashboardService';

const mockQueryAll = queryAll as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const bufalos = [
  { sexo: 'M', status: 1, nivelMaturidade: 'Touro', idRaca: 'raca-1' },
  { sexo: 'F', status: 1, nivelMaturidade: 'Vaca', idRaca: 'raca-1' },
  { sexo: 'F', status: 1, nivelMaturidade: 'Vaca', idRaca: 'raca-2' },
  { sexo: 'F', status: 1, nivelMaturidade: 'Novilha', idRaca: 'raca-1' },
  { sexo: 'F', status: 1, nivelMaturidade: 'Bezerro', idRaca: 'raca-2' },
  { sexo: 'F', status: 0, nivelMaturidade: 'Vaca', idRaca: 'raca-1' }, // inativa
];

const racas = [
  { id: 'raca-1', _raw: JSON.stringify({ nome: 'Murrah' }) },
  { id: 'raca-2', _raw: JSON.stringify({ nome: 'Mediterrânea' }) },
];

describe('getStats', () => {
  function setupMocks() {
    mockQueryAll.mockImplementation((sql: string) => {
      if (sql.includes('FROM bufalos')) return Promise.resolve(bufalos);
      if (sql.includes('FROM racas')) return Promise.resolve(racas);
      return Promise.resolve([]);
    });
    mockQueryFirst.mockImplementation((sql: string) => {
      if (sql.includes('ciclos_lactacao')) return Promise.resolve({ total: 3 });
      if (sql.includes('lotes')) return Promise.resolve({ total: 2 });
      return Promise.resolve(null);
    });
  }

  test('conta machos e fêmeas ativas corretamente', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    expect(result.qtd_macho_ativos).toBe(1);
    expect(result.qtd_femeas_ativas).toBe(4); // 3 vaca/novilha/bezerro ativos + 0 inativas
  });

  test('conta total incluindo inativos', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    expect(result.qtd_bufalos_registradas).toBe(6);
  });

  test('conta por nível de maturidade (só ativos)', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    expect(result.qtd_bufalos_touro).toBe(1);
    expect(result.qtd_bufalos_vaca).toBe(2); // terceira vaca está inativa
    expect(result.qtd_bufalos_novilha).toBe(1);
    expect(result.qtd_bufalos_bezerro).toBe(1);
  });

  test('retorna qtd_bufalas_lactando e qtd_lotes do banco', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    expect(result.qtd_bufalas_lactando).toBe(3);
    expect(result.qtd_lotes).toBe(2);
    expect(result.qtd_usuarios).toBe(0);
  });

  test('bufalosPorRaca agrupado corretamente (só ativos)', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    const murrah = result.bufalosPorRaca.find((r: any) => r.raca === 'Murrah');
    const med = result.bufalosPorRaca.find((r: any) => r.raca === 'Mediterrânea');
    expect(murrah?.quantidade).toBe(3); // touro + vaca + novilha (todos raca-1 ativos)
    expect(med?.quantidade).toBe(2);   // vaca + bezerro (raca-2 ativos)
  });

  test('tabela vazia retorna zeros sem erro', async () => {
    mockQueryAll.mockResolvedValue([]);
    mockQueryFirst.mockResolvedValue({ total: 0 });
    const result = await getStats('prop-1');
    expect(result.qtd_macho_ativos).toBe(0);
    expect(result.qtd_femeas_ativas).toBe(0);
    expect(result.bufalosPorRaca).toEqual([]);
  });
});
```

- [ ] **Step 4.2: Rodar e confirmar FAIL**

```bash
npx jest src/services/__tests__/dashboardService.test.ts --no-coverage 2>&1 | tail -20
```

Esperado: `Cannot find module '../dashboardService'`.

- [ ] **Step 4.3: Criar `src/services/dashboardService.ts` com `getStats`**

```typescript
import { queryAll, queryFirst } from '../database/db';
import { formatarDataBR } from '../utils/date';

export async function getStats(propriedadeId: string) {
  const bufalos = await queryAll<{
    sexo: string; status: number; nivelMaturidade: string; idRaca: string;
  }>(
    `SELECT sexo, status, nivelMaturidade, idRaca FROM bufalos WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );

  const ativos = bufalos.filter(b => b.status === 1);
  const qtd_macho_ativos = ativos.filter(b => b.sexo === 'M').length;
  const qtd_femeas_ativas = ativos.filter(b => b.sexo === 'F').length;
  const qtd_bufalos_registradas = bufalos.length;
  const qtd_bufalos_bezerro = ativos.filter(b => b.nivelMaturidade === 'Bezerro').length;
  const qtd_bufalos_novilha = ativos.filter(b => b.nivelMaturidade === 'Novilha').length;
  const qtd_bufalos_vaca = ativos.filter(b => b.nivelMaturidade === 'Vaca').length;
  const qtd_bufalos_touro = ativos.filter(b => b.nivelMaturidade === 'Touro').length;

  const lactRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM ciclos_lactacao WHERE propriedadeId = ? AND status = 'Em Lactação' AND deletedAt IS NULL`,
    [propriedadeId]
  );
  const qtd_bufalas_lactando = lactRow?.total ?? 0;

  const lotesRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM lotes WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );
  const qtd_lotes = lotesRow?.total ?? 0;

  const racaRows = await queryAll<{ id: string; _raw: string }>(
    `SELECT id, _raw FROM racas WHERE deletedAt IS NULL`
  );
  const racaMap = new Map(racaRows.map(r => {
    const raw = JSON.parse(r._raw);
    return [r.id, (raw.nome as string) ?? 'Desconhecida'];
  }));

  const racaCount = new Map<string, number>();
  for (const b of ativos) {
    const nome = racaMap.get(b.idRaca) ?? 'Desconhecida';
    racaCount.set(nome, (racaCount.get(nome) ?? 0) + 1);
  }
  const bufalosPorRaca = Array.from(racaCount.entries()).map(([raca, quantidade]) => ({ raca, quantidade }));

  return {
    qtd_macho_ativos,
    qtd_femeas_ativas,
    qtd_bufalos_registradas,
    qtd_bufalos_bezerro,
    qtd_bufalos_novilha,
    qtd_bufalos_vaca,
    qtd_bufalos_touro,
    qtd_bufalas_lactando,
    qtd_lotes,
    qtd_usuarios: 0,
    bufalosPorRaca,
  };
}
```

- [ ] **Step 4.4: Rodar e confirmar PASS**

```bash
npx jest src/services/__tests__/dashboardService.test.ts --no-coverage 2>&1 | tail -10
```

Esperado: 6 testes passam.

- [ ] **Step 4.5: Commit parcial**

```bash
git add src/services/dashboardService.ts src/services/__tests__/dashboardService.test.ts
git commit -m "feat(dashboard): getStats lê bufalos/ciclos/lotes/racas do SQLite"
```

---

## Task 5 — `dashboardService.getReproducaoMetricas`

**Files:**
- Modify: `src/services/dashboardService.ts`
- Modify: `src/services/__tests__/dashboardService.test.ts`

- [ ] **Step 5.1: Escrever testes**

Adicionar ao final de `src/services/__tests__/dashboardService.test.ts`:

```typescript
import { getReproducaoMetricas } from '../dashboardService';

describe('getReproducaoMetricas', () => {
  test('conta reproduções por status', async () => {
    mockQueryAll.mockResolvedValue([
      { _raw: JSON.stringify({ status: 'Em andamento', dtEvento: '2026-04-01' }) },
      { _raw: JSON.stringify({ status: 'Em andamento', dtEvento: '2026-04-15' }) },
      { _raw: JSON.stringify({ status: 'Confirmada', dtEvento: '2026-03-10' }) },
      { _raw: JSON.stringify({ status: 'Falha', dtEvento: '2026-02-20' }) },
    ]);
    const result = await getReproducaoMetricas('prop-1');
    expect(result.totalEmAndamento).toBe(2);
    expect(result.totalConfirmada).toBe(1);
    expect(result.totalFalha).toBe(1);
  });

  test('ultimaDataReproducao retorna a mais recente formatada DD/MM/YYYY', async () => {
    mockQueryAll.mockResolvedValue([
      { _raw: JSON.stringify({ status: 'Confirmada', dtEvento: '2026-04-01' }) },
      { _raw: JSON.stringify({ status: 'Em andamento', dtEvento: '2026-05-10' }) },
    ]);
    const result = await getReproducaoMetricas('prop-1');
    expect(result.ultimaDataReproducao).toBe('10/05/2026');
  });

  test('sem reproduções retorna zeros e ultimaDataReproducao null', async () => {
    mockQueryAll.mockResolvedValue([]);
    const result = await getReproducaoMetricas('prop-1');
    expect(result.totalEmAndamento).toBe(0);
    expect(result.ultimaDataReproducao).toBeNull();
  });
});
```

- [ ] **Step 5.2: Rodar e confirmar FAIL**

```bash
npx jest src/services/__tests__/dashboardService.test.ts --no-coverage 2>&1 | tail -20
```

Esperado: `getReproducaoMetricas is not a function`.

- [ ] **Step 5.3: Implementar `getReproducaoMetricas` em `dashboardService.ts`**

Adicionar ao final do arquivo:

```typescript
export async function getReproducaoMetricas(propriedadeId: string) {
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM reproducoes WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );
  const reproducoes = rows.map(r => JSON.parse(r._raw));

  const totalEmAndamento = reproducoes.filter(r => r.status === 'Em andamento').length;
  const totalConfirmada = reproducoes.filter(r => r.status === 'Confirmada').length;
  const totalFalha = reproducoes.filter(r => r.status === 'Falha').length;

  const datas = reproducoes
    .map(r => r.dtEvento as string | undefined)
    .filter((d): d is string => !!d)
    .sort()
    .reverse();
  const ultimaDataReproducao = datas.length > 0 ? formatarDataBR(datas[0]) : null;

  return { totalEmAndamento, totalConfirmada, totalFalha, ultimaDataReproducao };
}
```

- [ ] **Step 5.4: Rodar e confirmar PASS**

```bash
npx jest src/services/__tests__/dashboardService.test.ts --no-coverage 2>&1 | tail -10
```

Esperado: todos os testes passam.

- [ ] **Step 5.5: Commit**

```bash
git add src/services/dashboardService.ts src/services/__tests__/dashboardService.test.ts
git commit -m "feat(dashboard): getReproducaoMetricas lê reproducoes do SQLite"
```

---

## Task 6 — `dashboardService.getEstatisticasLactacao`

**Files:**
- Modify: `src/services/dashboardService.ts`
- Modify: `src/services/__tests__/dashboardService.test.ts`

- [ ] **Step 6.1: Escrever testes**

Adicionar ao final de `src/services/__tests__/dashboardService.test.ts`:

```typescript
import { getEstatisticasLactacao } from '../dashboardService';

describe('getEstatisticasLactacao', () => {
  const hoje = new Date();
  const em20Dias = new Date(hoje); em20Dias.setDate(hoje.getDate() + 20);
  const em40Dias = new Date(hoje); em40Dias.setDate(hoje.getDate() + 40);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  const haMes = new Date(hoje); haMes.setDate(hoje.getDate() - 30);

  const rows = [
    { status: 'Em Lactação', _raw: JSON.stringify({ dtParto: haMes.toISOString(), dtSecagemPrevista: em20Dias.toISOString() }) },
    { status: 'Em Lactação', _raw: JSON.stringify({ dtParto: haMes.toISOString(), dtSecagemPrevista: ontem.toISOString() }) }, // atrasada
    { status: 'Em Lactação', _raw: JSON.stringify({ dtParto: haMes.toISOString(), dtSecagemPrevista: em40Dias.toISOString() }) }, // além de 30 dias
    { status: 'Seca', _raw: JSON.stringify({}) },
    { status: 'Seca', _raw: JSON.stringify({}) },
  ];

  test('conta total, ativos, secos', async () => {
    mockQueryAll.mockResolvedValue(rows);
    const result = await getEstatisticasLactacao('prop-1');
    expect(result.total_ciclos).toBe(5);
    expect(result.ciclos_ativos).toBe(3);
    expect(result.ciclos_secos).toBe(2);
  });

  test('ciclos_proximos_secagem = apenas os ativos com dtSecagemPrevista nos próximos 30 dias', async () => {
    mockQueryAll.mockResolvedValue(rows);
    const result = await getEstatisticasLactacao('prop-1');
    expect(result.ciclos_proximos_secagem).toBe(1);
  });

  test('ciclos_secagem_atrasada = ativos com dtSecagemPrevista < hoje', async () => {
    mockQueryAll.mockResolvedValue(rows);
    const result = await getEstatisticasLactacao('prop-1');
    expect(result.ciclos_secagem_atrasada).toBe(1);
  });

  test('tabela vazia retorna zeros sem erro', async () => {
    mockQueryAll.mockResolvedValue([]);
    const result = await getEstatisticasLactacao('prop-1');
    expect(result.total_ciclos).toBe(0);
    expect(result.media_dias_lactacao).toBe(0);
  });
});
```

- [ ] **Step 6.2: Rodar e confirmar FAIL**

```bash
npx jest src/services/__tests__/dashboardService.test.ts --no-coverage 2>&1 | tail -20
```

Esperado: `getEstatisticasLactacao is not a function`.

- [ ] **Step 6.3: Implementar `getEstatisticasLactacao` em `dashboardService.ts`**

Adicionar ao final do arquivo:

```typescript
export async function getEstatisticasLactacao(propriedadeId: string) {
  const rows = await queryAll<{ status: string; _raw: string }>(
    `SELECT status, _raw FROM ciclos_lactacao WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );

  const total_ciclos = rows.length;
  const ciclos_ativos = rows.filter(r => r.status === 'Em Lactação').length;
  const ciclos_secos = rows.filter(r => r.status === 'Seca').length;

  const hoje = new Date();
  const em30Dias = new Date(hoje);
  em30Dias.setDate(hoje.getDate() + 30);

  let somaDias = 0;
  let countComParto = 0;
  let ciclos_proximos_secagem = 0;
  let ciclos_secagem_atrasada = 0;

  for (const row of rows.filter(r => r.status === 'Em Lactação')) {
    const raw = JSON.parse(row._raw);
    if (raw.dtParto) {
      const parto = new Date(raw.dtParto);
      somaDias += Math.floor((hoje.getTime() - parto.getTime()) / (1000 * 60 * 60 * 24));
      countComParto++;
    }
    if (raw.dtSecagemPrevista) {
      const secagem = new Date(raw.dtSecagemPrevista);
      if (secagem < hoje) {
        ciclos_secagem_atrasada++;
      } else if (secagem <= em30Dias) {
        ciclos_proximos_secagem++;
      }
    }
  }

  const media_dias_lactacao = countComParto > 0 ? Math.round(somaDias / countComParto) : 0;

  return {
    total_ciclos,
    ciclos_ativos,
    ciclos_secos,
    media_dias_lactacao,
    ciclos_proximos_secagem,
    ciclos_secagem_atrasada,
  };
}
```

- [ ] **Step 6.4: Rodar e confirmar PASS**

```bash
npx jest src/services/__tests__/dashboardService.test.ts --no-coverage 2>&1 | tail -10
```

Esperado: todos os testes passam.

- [ ] **Step 6.5: Commit**

```bash
git add src/services/dashboardService.ts src/services/__tests__/dashboardService.test.ts
git commit -m "feat(dashboard): getEstatisticasLactacao lê ciclos_lactacao do SQLite"
```

---

## Task 7 — `dashboardService.getProducaoMensal`

**Files:**
- Modify: `src/services/dashboardService.ts`
- Modify: `src/services/__tests__/dashboardService.test.ts`

- [ ] **Step 7.1: Escrever testes**

Adicionar ao final de `src/services/__tests__/dashboardService.test.ts`:

```typescript
import { getProducaoMensal } from '../dashboardService';

describe('getProducaoMensal', () => {
  test('agrupa por mês e soma litros, conta búfalas e dias únicos', async () => {
    mockQueryAll.mockResolvedValue([
      { _raw: JSON.stringify({ dtOrdenha: '2026-01-10', qtOrdenha: 20, idBufala: 'b1' }) },
      { _raw: JSON.stringify({ dtOrdenha: '2026-01-10', qtOrdenha: 15, idBufala: 'b2' }) },
      { _raw: JSON.stringify({ dtOrdenha: '2026-01-11', qtOrdenha: 20, idBufala: 'b1' }) },
      { _raw: JSON.stringify({ dtOrdenha: '2026-02-05', qtOrdenha: 30, idBufala: 'b1' }) },
    ]);
    const result = await getProducaoMensal('prop-1', 2026);
    const jan = result.serie_historica.find((m: any) => m.mes === '2026-01');
    const fev = result.serie_historica.find((m: any) => m.mes === '2026-02');
    expect(jan?.total_litros).toBe(55);
    expect(jan?.qtd_bufalas).toBe(2);
    expect(jan?.media_diaria).toBeCloseTo(55 / 2, 1); // 2 dias únicos
    expect(fev?.total_litros).toBe(30);
  });

  test('série histórica tem 12 meses do ano referência', async () => {
    mockQueryAll.mockResolvedValue([]);
    const result = await getProducaoMensal('prop-1', 2026);
    expect(result.serie_historica).toHaveLength(12);
    expect(result.serie_historica[0].mes).toBe('2026-01');
    expect(result.serie_historica[11].mes).toBe('2026-12');
  });

  test('meses sem dados retornam total_litros=0', async () => {
    mockQueryAll.mockResolvedValue([]);
    const result = await getProducaoMensal('prop-1', 2026);
    result.serie_historica.forEach((m: any) => {
      expect(m.total_litros).toBe(0);
    });
  });

  test('variacao_percentual calculada corretamente', async () => {
    // Simular mês atual e mês anterior com dados
    const agora = new Date();
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const mesAnteriorDate = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const mesAnterior = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, '0')}`;

    mockQueryAll.mockResolvedValue([
      { _raw: JSON.stringify({ dtOrdenha: `${mesAnterior}-01`, qtOrdenha: 100, idBufala: 'b1' }) },
      { _raw: JSON.stringify({ dtOrdenha: `${mesAtual}-01`, qtOrdenha: 150, idBufala: 'b1' }) },
    ]);
    const result = await getProducaoMensal('prop-1', agora.getFullYear());
    expect(result.variacao_percentual).toBeCloseTo(50, 0); // (150-100)/100 * 100 = 50%
  });
});
```

- [ ] **Step 7.2: Rodar e confirmar FAIL**

```bash
npx jest src/services/__tests__/dashboardService.test.ts --no-coverage 2>&1 | tail -20
```

Esperado: `getProducaoMensal is not a function`.

- [ ] **Step 7.3: Implementar `getProducaoMensal` em `dashboardService.ts`**

Adicionar ao final do arquivo:

```typescript
export async function getProducaoMensal(propriedadeId: string, ano?: number) {
  const refAno = ano ?? new Date().getFullYear();
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM ordenhas WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );

  type MonthData = { litros: number; bufalas: Set<string>; dias: Set<string> };
  const byMonth = new Map<string, MonthData>();
  for (let m = 1; m <= 12; m++) {
    const key = `${refAno}-${String(m).padStart(2, '0')}`;
    byMonth.set(key, { litros: 0, bufalas: new Set(), dias: new Set() });
  }

  for (const row of rows) {
    const o = JSON.parse(row._raw);
    if (!o.dtOrdenha) continue;
    const month = (o.dtOrdenha as string).slice(0, 7);
    if (!byMonth.has(month)) continue;
    const entry = byMonth.get(month)!;
    entry.litros += Number(o.qtOrdenha ?? 0);
    if (o.idBufala) entry.bufalas.add(o.idBufala);
    entry.dias.add((o.dtOrdenha as string).slice(0, 10));
  }

  const serie_historica = Array.from(byMonth.entries()).map(([mes, data]) => ({
    mes,
    total_litros: data.litros,
    qtd_bufalas: data.bufalas.size,
    media_diaria: data.dias.size > 0 ? data.litros / data.dias.size : 0,
  }));

  const agora = new Date();
  const mesAtualKey = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const mesAnteriorDate = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const mesAnteriorKey = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, '0')}`;

  const mesAtual = byMonth.get(mesAtualKey) ?? { litros: 0, bufalas: new Set<string>(), dias: new Set<string>() };
  const mesAnterior = byMonth.get(mesAnteriorKey) ?? { litros: 0, bufalas: new Set<string>(), dias: new Set<string>() };

  const variacao_percentual = mesAnterior.litros > 0
    ? Math.round(((mesAtual.litros - mesAnterior.litros) / mesAnterior.litros) * 10000) / 100
    : 0;

  return {
    ano: refAno,
    mes_atual_litros: mesAtual.litros,
    mes_anterior_litros: mesAnterior.litros,
    variacao_percentual,
    bufalas_lactantes_atual: mesAtual.bufalas.size,
    serie_historica,
  };
}
```

- [ ] **Step 7.4: Rodar e confirmar PASS**

```bash
npx jest src/services/__tests__/dashboardService.test.ts --no-coverage 2>&1 | tail -10
```

Esperado: todos os testes passam.

- [ ] **Step 7.5: Commit**

```bash
git add src/services/dashboardService.ts src/services/__tests__/dashboardService.test.ts
git commit -m "feat(dashboard): getProducaoMensal lê ordenhas do SQLite"
```

---

## Task 8 — Integração: `propriedadeService.getDashboardPropriedade`

**Files:**
- Modify: `src/services/propriedadeService.ts`

- [ ] **Step 8.1: Substituir chamada de API por dashboardService**

Substituir o conteúdo de `getDashboardPropriedade` em `src/services/propriedadeService.ts`.

De:
```typescript
import { apiFetch } from "../lib/apiClient";

export const getDashboardPropriedade = async (idPropriedade: string | number, token?: string) => {
  try {
    const result = await apiFetch(`/dashboard/${idPropriedade}`);
    const dashboard = {
      machos: result.qtd_macho_ativos,
      femeas: result.qtd_femeas_ativas,
      bufalosAtivos: result.qtd_macho_ativos+result.qtd_femeas_ativas,
      bezerros: result.qtd_bufalos_bezerro,
      novilhas: result.qtd_bufalos_novilha,
      vacas: result.qtd_bufalos_vaca,
      touros: result.qtd_bufalos_touro,
      bufalasLactando: result.qtd_bufalas_lactando,
      qtdLotes: result.qtd_lotes,
      qtdUsuarios: result.qtd_usuarios,
      bufalosPorRaca: result.bufalosPorRaca || [],
    };
    return { dashboard };
  } catch (error: any) {
    if (error.status === 404) {
      return { dashboard: null };
    }
    throw error;
  }
};
```

Para (adicionar import no topo e substituir função):
```typescript
import { getStats } from './dashboardService';

export const getDashboardPropriedade = async (idPropriedade: string | number) => {
  const result = await getStats(String(idPropriedade));
  const dashboard = {
    machos: result.qtd_macho_ativos,
    femeas: result.qtd_femeas_ativas,
    bufalosAtivos: result.qtd_macho_ativos + result.qtd_femeas_ativas,
    bezerros: result.qtd_bufalos_bezerro,
    novilhas: result.qtd_bufalos_novilha,
    vacas: result.qtd_bufalos_vaca,
    touros: result.qtd_bufalos_touro,
    bufalasLactando: result.qtd_bufalas_lactando,
    qtdLotes: result.qtd_lotes,
    qtdUsuarios: result.qtd_usuarios,
    bufalosPorRaca: result.bufalosPorRaca,
  };
  return { dashboard };
};
```

Remover `import { apiFetch } from "../lib/apiClient"` se não for mais usado em propriedadeService.ts.

- [ ] **Step 8.2: Rodar todos os testes**

```bash
npx jest --no-coverage 2>&1 | tail -15
```

Esperado: todos passam.

- [ ] **Step 8.3: Commit**

```bash
git add src/services/propriedadeService.ts
git commit -m "feat(dashboard): getDashboardPropriedade lê SQLite via dashboardService"
```

---

## Task 9 — Integração: `reproducaoService.getReproducaoDashboardStats`

**Files:**
- Modify: `src/services/reproducaoService.ts`

- [ ] **Step 9.1: Substituir chamada de API**

Em `src/services/reproducaoService.ts`, adicionar import e substituir a função:

Adicionar no topo (após os imports existentes):
```typescript
import { getReproducaoMetricas } from './dashboardService';
```

Substituir:
```typescript
export const getReproducaoDashboardStats = async (propriedadeId: string): Promise<ReproducaoDashboardStats> => {
  if (!propriedadeId) {
    return { totalEmAndamento: 0, totalConfirmada: 0, totalFalha: 0, ultimaDataReproducao: "-" };
  }
  try {
    const response = await apiFetch(`/dashboard/reproducao/${propriedadeId}`);
    return {
      totalEmAndamento: response.totalEmAndamento || 0,
      totalConfirmada: response.totalConfirmada || 0,
      totalFalha: response.totalFalha || 0,
      ultimaDataReproducao: response.ultimaDataReproducao || "-",
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard de reprodução:", error);
    return { totalEmAndamento: 0, totalConfirmada: 0, totalFalha: 0, ultimaDataReproducao: "-" };
  }
};
```

Por:
```typescript
export const getReproducaoDashboardStats = async (propriedadeId: string): Promise<ReproducaoDashboardStats> => {
  if (!propriedadeId) {
    return { totalEmAndamento: 0, totalConfirmada: 0, totalFalha: 0, ultimaDataReproducao: '-' };
  }
  const result = await getReproducaoMetricas(propriedadeId);
  return {
    totalEmAndamento: result.totalEmAndamento,
    totalConfirmada: result.totalConfirmada,
    totalFalha: result.totalFalha,
    ultimaDataReproducao: result.ultimaDataReproducao ?? '-',
  };
};
```

Remover `import { apiFetch } from "../lib/apiClient"` se não for mais utilizado em reproducaoService.ts.

- [ ] **Step 9.2: Verificar se apiFetch ainda é necessário**

`reproducaoService.ts` **não** usa mais `apiFetch` após essa substituição (as demais funções são SQLite ou enqueue). Remover o import.

- [ ] **Step 9.3: Rodar todos os testes**

```bash
npx jest --no-coverage 2>&1 | tail -15
```

Esperado: todos passam.

- [ ] **Step 9.4: Commit**

```bash
git add src/services/reproducaoService.ts
git commit -m "feat(dashboard): getReproducaoDashboardStats lê SQLite via dashboardService"
```

---

## Task 10 — Integração: `lactacaoService.getEstatisticasLactacao`

**Files:**
- Modify: `src/services/lactacaoService.ts`

- [ ] **Step 10.1: Substituir chamada de API**

Adicionar import no topo de `lactacaoService.ts`:
```typescript
import { getEstatisticasLactacao as getEstatisticasLactacaoLocal } from './dashboardService';
```

Substituir:
```typescript
export const getEstatisticasLactacao = async (propriedadeId: string) => {
  try {
    if (!propriedadeId) throw new Error("ID da propriedade é obrigatório.");
    return await apiFetch(`/lactacao/propriedade/${propriedadeId}/estatisticas`);
  } catch (error) {
    console.error("Erro ao buscar estatísticas de lactação:", error);
    return {
      total_ciclos: 0,
      ciclos_ativos: 0,
      ciclos_secos: 0,
      media_dias_lactacao: 0,
      ciclos_proximos_secagem: 0,
      ciclos_secagem_atrasada: 0,
    };
  }
};
```

Por:
```typescript
export const getEstatisticasLactacao = async (propriedadeId: string) => {
  if (!propriedadeId) {
    return { total_ciclos: 0, ciclos_ativos: 0, ciclos_secos: 0, media_dias_lactacao: 0, ciclos_proximos_secagem: 0, ciclos_secagem_atrasada: 0 };
  }
  return getEstatisticasLactacaoLocal(propriedadeId);
};
```

Verificar se `apiFetch` ainda é usado em `lactacaoService.ts` — sim, ainda é usado por `getIndustriasPorPropriedade` e `getProducaoDiariaAtual`, então **não remover** o import.

- [ ] **Step 10.2: Rodar todos os testes**

```bash
npx jest --no-coverage 2>&1 | tail -15
```

Esperado: todos passam.

- [ ] **Step 10.3: Commit final**

```bash
git add src/services/lactacaoService.ts
git commit -m "feat(dashboard): getEstatisticasLactacao lê SQLite via dashboardService"
```

---

## Verificação Final

- [ ] **Rodar suite completa**

```bash
npx jest --no-coverage 2>&1 | tail -20
```

Esperado: todas as suites passam sem erros.

- [ ] **Verificar TypeScript**

```bash
cd "/home/v1nisouza/Área de trabalho/PASTA PI/dsm5-buffs-mobile"
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem novos erros (o erro pré-existente em `lactacaoService.test.ts:47` pode continuar — não é introduzido por nós).
