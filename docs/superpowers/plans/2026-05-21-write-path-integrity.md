# Write Path Data Integrity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que toda operação de escrita (CREATE, UPDATE, DELETE) persista localmente em camelCase canônico, corrija push endpoints com campos errados, e resolva exibição offline de reprodução com material genético.

**Architecture:** Todas as funções `update*` passam a usar `normalizePayload` (em vez de adapters snake_case) antes de fazer merge no `_raw`. Push endpoints usam `clean` mais estrito para não enviar `null`. `pullMaterialGenetico` usa endpoint paginado existente (`/sync/:id/material-genetico`). FormReproductionAdd troca TextInput de sêmen/óvulo por SelectBottomSheet.

**Tech Stack:** TypeScript, `@op-engineering/op-sqlite`, Jest (mocks: `../../database/db`, `../pendingOperationsService`, `react-native-uuid`), `normalizePayload` utilitário existente em `src/utils/normalizePayload.ts`.

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `src/services/bufaloService.ts` | Modify — add `BUFALO_FIELD_MAP`, use `normalizePayload` em `updateBufalo` |
| `src/services/zootecnicoService.ts` | Modify — use `normalizePayload` em `update` (remove adapter) |
| `src/services/sanitarioService.ts` | Modify — use `normalizePayload` em `update` (remove adapter) |
| `src/services/adapters/bufaloAdapter.ts` | Delete — não usado após as tasks acima |
| `src/services/sync/pushEndpoints.ts` | Modify — fix `shapeLoteCreate` (areaM2) + `shapeReproducaoCreate` (nulls) |
| `src/services/reproducaoService.ts` | Modify — fix `tipoInseminacao` transform + add `getMaterialGenetico` + lookup em `getReproducoes` |
| `src/services/lactacaoService.ts` | Modify — fix `encerrarLactacao` para atualizar `_raw` |
| `src/services/piqueteService.ts` | Modify — fix `getAll` para lookup de grupo offline |
| `src/services/syncService.ts` | Modify — add `pullMaterialGenetico` usando endpoint paginado |
| `src/components/FormReproductionAdd/index.tsx` | Modify — trocar TextInput por SelectBottomSheet para sêmen/óvulo |
| `src/services/__tests__/bufaloService.update.test.ts` | Create |
| `src/services/__tests__/zootecnicoService.update.test.ts` | Create |
| `src/services/__tests__/sanitarioService.update.test.ts` | Create (extend) |
| `src/services/__tests__/lactacaoService.encerrar.test.ts` | Create |
| `src/services/__tests__/piqueteService.getAll.test.ts` | Create (extend existing) |
| `src/services/__tests__/reproducaoService.transform.test.ts` | Create |

---

## Task 1: Fix `bufaloService.updateBufalo` — normalizar snake_case → camelCase

**Bug:** `AnimalEditBottomSheet` envia `{ nivel_maturidade, id_raca, id_pai, id_mae }` (snake_case). `updateBufalo` faz `merged = { ...existing._raw, ...data }` sem normalização. O SQL UPDATE usa `merged.nivelMaturidade` (valor antigo), não `merged.nivel_maturidade` (valor novo). O `_raw` fica com campos duplicados em ambos os cases.

**Files:**
- Create: `src/services/__tests__/bufaloService.update.test.ts`
- Modify: `src/services/bufaloService.ts`

- [ ] **Step 1: Escreva os testes que falham**

```typescript
// src/services/__tests__/bufaloService.update.test.ts
import { updateBufalo } from '../bufaloService';
import { queryFirst, execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';

jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

const mockExecute = execute as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

const existingRaw = {
  id: 'b1', brinco: '001', sexo: 'F',
  nivelMaturidade: 'B', status: true, idRaca: 'raca-old',
  idPai: null, idMae: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryFirst.mockResolvedValue({ _raw: JSON.stringify(existingRaw) });
  mockExecute.mockResolvedValue(undefined);
  mockEnqueue.mockResolvedValue(undefined);
});

describe('updateBufalo', () => {
  it('normaliza nivel_maturidade → nivelMaturidade no _raw', async () => {
    await updateBufalo('b1', { nivel_maturidade: 'V', brinco: '001' });
    const raw = JSON.parse(mockExecute.mock.calls[0][1][5]);
    expect(raw.nivelMaturidade).toBe('V');
  });

  it('normaliza id_raca → idRaca no _raw', async () => {
    await updateBufalo('b1', { id_raca: 'raca-new', brinco: '001' });
    const raw = JSON.parse(mockExecute.mock.calls[0][1][5]);
    expect(raw.idRaca).toBe('raca-new');
  });

  it('usa nivelMaturidade novo no SET do SQL', async () => {
    await updateBufalo('b1', { nivel_maturidade: 'T', brinco: '001' });
    // UPDATE bufalos SET brinco=?,sexo=?,nivelMaturidade=?,status=?,idRaca=?,_raw=?,_synced=0,updatedAt=? WHERE id=?
    // índice 2 = nivelMaturidade
    expect(mockExecute.mock.calls[0][1][2]).toBe('T');
  });

  it('usa idRaca novo no SET do SQL', async () => {
    await updateBufalo('b1', { id_raca: 'raca-abc', brinco: '001' });
    // índice 4 = idRaca
    expect(mockExecute.mock.calls[0][1][4]).toBe('raca-abc');
  });
});
```

- [ ] **Step 2: Rode os testes e confirme que falham**

```bash
npx jest --no-coverage src/services/__tests__/bufaloService.update.test.ts
```
Esperado: FAIL — `nivelMaturidade` ainda retorna `'B'` (valor antigo).

- [ ] **Step 3: Implemente a correção em `bufaloService.ts`**

Adicione após o import de `normalizePayload` (se ainda não existir, adicione o import) e antes da função `updateBufalo`:

```typescript
import { normalizePayload } from '../utils/normalizePayload';

const BUFALO_FIELD_MAP: Record<string, string[]> = {
  nivelMaturidade: ['nivel_maturidade'],
  idRaca:          ['id_raca'],
  idPai:           ['id_pai'],
  idMae:           ['id_mae'],
  idPropriedade:   ['id_propriedade'],
  dtNascimento:    ['dt_nascimento'],
};
```

Substitua o corpo de `updateBufalo` por:

```typescript
export const updateBufalo = async (id: string, data: any) => {
  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE id = ?`,
    [id],
  );
  if (!existing) throw new Error(`Búfalo ${id} não encontrado`);

  const normalized = normalizePayload(data, BUFALO_FIELD_MAP);
  const now = new Date().toISOString();
  const merged = { ...JSON.parse(existing._raw), ...normalized, updatedAt: now };

  await execute(
    `UPDATE bufalos SET brinco = ?, sexo = ?, nivelMaturidade = ?, status = ?, idRaca = ?, _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
    [merged.brinco, merged.sexo, merged.nivelMaturidade, merged.status ? 1 : 0, merged.idRaca, JSON.stringify(merged), now, id],
  );

  await enqueue('bufalos', 'UPDATE', merged);
  return merged;
};
```

- [ ] **Step 4: Rode os testes e confirme que passam**

```bash
npx jest --no-coverage src/services/__tests__/bufaloService.update.test.ts
```
Esperado: PASS (4 testes).

- [ ] **Step 5: Rode a suite completa para garantir que nada quebrou**

```bash
npx jest --no-coverage
```
Esperado: PASS (todos os testes anteriores + 4 novos).

- [ ] **Step 6: Commit**

```bash
git add src/services/bufaloService.ts src/services/__tests__/bufaloService.update.test.ts
git commit -m "fix(bufalo): normalizar snake_case→camelCase em updateBufalo antes do merge"
```

---

## Task 2: Fix `zootecnicoService.update` — usar normalizePayload em vez do adapter

**Bug:** `ZootecnicoBottomSheet` envia camelCase `{ condicaoCorporal, corPelagem, ... }`. `update` usa `zootecToApiAdapter` que converte para snake_case antes de fazer merge no `_raw`. `getHistorico` lê `item.corPelagem` (camelCase) e obtém valor antigo.

**Files:**
- Create: `src/services/__tests__/zootecnicoService.update.test.ts`
- Modify: `src/services/zootecnicoService.ts`

- [ ] **Step 1: Escreva os testes que falham**

```typescript
// src/services/__tests__/zootecnicoService.update.test.ts
import { zootecService } from '../zootecnicoService';
import { queryFirst, execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';

jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

const mockExecute = execute as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryFirst.mockResolvedValue({
    _raw: JSON.stringify({ id: 'z1', bufaloId: 'b1', peso: 300, corPelagem: 'parda' }),
  });
  mockExecute.mockResolvedValue(undefined);
  mockEnqueue.mockResolvedValue(undefined);
});

describe('zootecService.update', () => {
  it('armazena corPelagem em camelCase no _raw', async () => {
    await zootecService.update('z1', { corPelagem: 'preta' });
    const raw = JSON.parse(mockExecute.mock.calls[0][1][0]);
    expect(raw.corPelagem).toBe('preta');
    expect(raw.cor_pelagem).toBeUndefined();
  });

  it('armazena condicaoCorporal em camelCase no _raw', async () => {
    await zootecService.update('z1', { condicaoCorporal: 4 });
    const raw = JSON.parse(mockExecute.mock.calls[0][1][0]);
    expect(raw.condicaoCorporal).toBe(4);
    expect(raw.condicao_corporal).toBeUndefined();
  });

  it('enfileira payload camelCase', async () => {
    await zootecService.update('z1', { porteCorporal: 'Grande' });
    const enqueuedPayload = mockEnqueue.mock.calls[0][2];
    expect(enqueuedPayload.porteCorporal).toBe('Grande');
    expect(enqueuedPayload.porte_corporal).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rode os testes e confirme que falham**

```bash
npx jest --no-coverage src/services/__tests__/zootecnicoService.update.test.ts
```
Esperado: FAIL — `cor_pelagem` existe em `_raw`, `corPelagem` não.

- [ ] **Step 3: Implemente a correção em `zootecnicoService.ts`**

Remova o import de `zootecToApiAdapter` e adicione `normalizePayload`. Substitua o corpo de `update`:

```typescript
import { normalizePayload } from '../utils/normalizePayload';
// Remova: import { zootecToApiAdapter } from "./adapters/bufaloAdapter";

const ZOOTEC_FIELD_MAP = {
  condicaoCorporal: ['condicao_corporal'],
  corPelagem:       ['cor_pelagem'],
  formatoChifre:    ['formato_chifre'],
  porteCorporal:    ['porte_corporal'],
  tipoPesagem:      ['tipo_pesagem'],
  dtRegistro:       ['dt_registro'],
  idPropriedade:    ['id_propriedade'],
};

// update:
update: async (id_zootec: string, payload: any) => {
  const normalized = normalizePayload(payload, ZOOTEC_FIELD_MAP);
  const now = new Date().toISOString();

  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM pesagens WHERE id = ?`,
    [id_zootec],
  );
  const merged = { ...(existing ? JSON.parse(existing._raw) : {}), ...normalized, id: id_zootec, updatedAt: now };

  await execute(
    `UPDATE pesagens SET _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
    [JSON.stringify(merged), now, id_zootec],
  );
  await enqueue("pesagens", "UPDATE", merged);
  return merged;
},
```

- [ ] **Step 4: Rode os testes e confirme que passam**

```bash
npx jest --no-coverage src/services/__tests__/zootecnicoService.update.test.ts
```
Esperado: PASS (3 testes).

- [ ] **Step 5: Rode a suite completa**

```bash
npx jest --no-coverage
```
Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add src/services/zootecnicoService.ts src/services/__tests__/zootecnicoService.update.test.ts
git commit -m "fix(zootec): normalizar camelCase em update (remover adapter snake_case)"
```

---

## Task 3: Fix `sanitarioService.update` — usar normalizePayload em vez do adapter

**Bug:** `SanitarioBottomSheet` envia `{ idSanit, idMedicacao, dosagem, unidadeMedida, necessitaRetorno, dtRetorno }` (camelCase). `update` usa `sanitarioToApiAdapter` que converte para snake_case. `getHistorico` lê `reg.idMedicao` e obtém valor antigo.

**Files:**
- Modify: `src/services/__tests__/sanitarioService.test.ts` (adicionar ao arquivo existente)
- Modify: `src/services/sanitarioService.ts`
- Delete: `src/services/adapters/bufaloAdapter.ts` (ambos os adapters agora sem uso)

- [ ] **Step 1: Escreva os testes que falham** (adicione ao final de `sanitarioService.test.ts`)

```typescript
// Adicione em src/services/__tests__/sanitarioService.test.ts

describe('sanitarioService.update', () => {
  it('armazena idMedicao em camelCase no _raw quando idMedicacao enviado', async () => {
    (queryFirst as jest.Mock).mockResolvedValue({
      _raw: JSON.stringify({ id: 's1', idBufalo: 'b1', idMedicao: 'med-old', dosagem: 5 }),
    });
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    await sanitarioService.update('s1', { idMedicacao: 'med-new', dosagem: 10 });

    const raw = JSON.parse((execute as jest.Mock).mock.calls[0][1][0]);
    expect(raw.idMedicao).toBe('med-new');
    expect(raw.id_medicao).toBeUndefined();
  });

  it('armazena unidadeMedida em camelCase no _raw', async () => {
    (queryFirst as jest.Mock).mockResolvedValue({
      _raw: JSON.stringify({ id: 's1', unidadeMedida: 'ml' }),
    });
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    await sanitarioService.update('s1', { unidadeMedida: 'mg' });

    const raw = JSON.parse((execute as jest.Mock).mock.calls[0][1][0]);
    expect(raw.unidadeMedida).toBe('mg');
    expect(raw.unidade_medida).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rode os testes e confirme que falham**

```bash
npx jest --no-coverage src/services/__tests__/sanitarioService.test.ts
```
Esperado: FAIL nos 2 novos testes.

- [ ] **Step 3: Implemente a correção em `sanitarioService.ts`**

Remova o import de `sanitarioToApiAdapter`. No corpo de `update`:

```typescript
// Remova: import { sanitarioToApiAdapter } from "./adapters/bufaloAdapter";
// sanitarioService.ts — a SANITARIO_FIELD_MAP já existe no arquivo

update: async (id_sanit: string, payload: any) => {
  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM eventos_sanitarios WHERE id = ?`,
    [id_sanit],
  );

  const now = new Date().toISOString();
  const normalized = normalizePayload(payload, SANITARIO_FIELD_MAP);
  const merged = { ...(existing ? JSON.parse(existing._raw) : {}), ...normalized, id: id_sanit, updatedAt: now };

  await execute(
    `UPDATE eventos_sanitarios SET _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
    [JSON.stringify(merged), now, id_sanit],
  );
  await enqueue("eventos_sanitarios", "UPDATE", merged);
  return merged;
},
```

- [ ] **Step 4: Delete `src/services/adapters/bufaloAdapter.ts`**

```bash
rm src/services/adapters/bufaloAdapter.ts
```

Verifique que não há mais imports que dependem do arquivo:

```bash
grep -rn "bufaloAdapter" src/
```
Esperado: 0 resultados.

- [ ] **Step 5: Rode os testes e confirme que passam**

```bash
npx jest --no-coverage src/services/__tests__/sanitarioService.test.ts
```
Esperado: PASS (todos, incluindo os 2 novos).

- [ ] **Step 6: Rode a suite completa**

```bash
npx jest --no-coverage
```
Esperado: todos passam.

- [ ] **Step 7: Commit**

```bash
git add src/services/sanitarioService.ts src/services/__tests__/sanitarioService.test.ts
git rm src/services/adapters/bufaloAdapter.ts
git commit -m "fix(sanitario): normalizar camelCase em update + remover adapters obsoletos"
```

---

## Task 4: Fix push endpoints — `shapeLoteCreate` e `shapeReproducaoCreate`

**Bugs:**
- `shapeLoteCreate`: `area_m2: p.area_m2 ?? p.areaMq` — form envia `areaM2`, nem `area_m2` nem `areaMq`. Área nunca chega na API.
- `shapeReproducaoCreate`: `clean()` filtra só `undefined`, não `null`. `idBufalo: null` é enviado para IA/IATF → API rejeita.

**Files:**
- Modify: `src/services/sync/__tests__/pushEndpoints.test.ts`
- Modify: `src/services/sync/pushEndpoints.ts`

- [ ] **Step 1: Escreva os testes que falham** (adicione ao final de `pushEndpoints.test.ts`)

```typescript
// Adicione em src/services/sync/__tests__/pushEndpoints.test.ts

describe('shapeLoteCreate — areaM2 fallback', () => {
  it('inclui area_m2 quando payload tem areaM2', () => {
    const result = resolvePushEndpoint('lotes', 'CREATE', {
      id: 'l1', nomeLote: 'P1', idPropriedade: 'prop1', idGrupo: 'g1',
      tipoLote: 'Pasto', status: 'ativo', qtdMax: 50, areaM2: 12345,
      geoMapa: null,
    });
    expect(result.body.area_m2).toBe(12345);
  });
});

describe('shapeReproducaoCreate — null filtering', () => {
  it('não inclui idBufalo quando é null (IA)', () => {
    const result = resolvePushEndpoint('reproducoes', 'CREATE', {
      id: 'r1', idPropriedade: 'prop1', idBufala: 'buf1',
      idBufalo: null, tipoInseminacao: 'IA', status: 'Em andamento',
      dtEvento: '2026-05-21',
    });
    expect(result.body).not.toHaveProperty('idBufalo');
  });

  it('inclui idBufalo quando é UUID válido (Monta Natural)', () => {
    const result = resolvePushEndpoint('reproducoes', 'CREATE', {
      id: 'r1', idPropriedade: 'prop1', idBufala: 'buf1',
      idBufalo: 'touro-uuid', tipoInseminacao: 'Monta Natural',
      status: 'Em andamento', dtEvento: '2026-05-21',
    });
    expect(result.body.idBufalo).toBe('touro-uuid');
  });
});
```

- [ ] **Step 2: Rode os testes e confirme que falham**

```bash
npx jest --no-coverage src/services/sync/__tests__/pushEndpoints.test.ts
```
Esperado: FAIL nos 3 novos testes.

- [ ] **Step 3: Implemente as correções em `pushEndpoints.ts`**

**3a. Adicione `cleanStrict` ao lado de `clean`:**

```typescript
function clean(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function cleanStrict(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}
```

**3b. Atualize `shapeLoteCreate`** — adicione `p.areaM2` como terceiro fallback:

```typescript
function shapeLoteCreate(p: any) {
  return clean({
    id: p.id,
    nomeLote: p.nomeLote,
    idPropriedade: p.idPropriedade,
    idGrupo: p.idGrupo,
    tipoLote: p.tipoLote,
    status: p.status,
    descricao: p.descricao,
    qtd_max: p.qtd_max ?? p.qtdMax,
    area_m2: p.area_m2 ?? p.areaMq ?? p.areaM2,
    geo_mapa: p.geo_mapa ?? (p.geoMapa ? JSON.stringify(p.geoMapa) : undefined),
  });
}
```

**3c. Troque `clean` por `cleanStrict` em `shapeReproducaoCreate`:**

```typescript
function shapeReproducaoCreate(p: any) {
  return cleanStrict({
    id: p.id,
    idPropriedade: p.idPropriedade,
    idSemen: p.idSemen,
    idDoadora: p.idDoadora,
    idBufala: p.idBufala,
    idBufalo: p.idBufalo,
    tipoInseminacao: p.tipoInseminacao,
    dtEvento: p.dtEvento,
    status: p.status,
  });
}
```

- [ ] **Step 4: Rode os testes e confirme que passam**

```bash
npx jest --no-coverage src/services/sync/__tests__/pushEndpoints.test.ts
```
Esperado: PASS (todos).

- [ ] **Step 5: Rode a suite completa**

```bash
npx jest --no-coverage
```
Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add src/services/sync/pushEndpoints.ts src/services/sync/__tests__/pushEndpoints.test.ts
git commit -m "fix(push): shapeLoteCreate inclui areaM2 + shapeReproducaoCreate filtra null"
```

---

## Task 5: Fix `getReproducoes` — transform de `tipoInseminacao` + `encerrarLactacao` _raw

**Bugs:**
- `getReproducoes`: transform `r.tipoInseminacao === "Inseminação Artificial" ? "IA" : ...` retorna `"-"` para valores `"IA"` e `"IATF"` que o form envia.
- `encerrarLactacao`: `UPDATE ciclos_lactacao SET status = ?` atualiza coluna indexada mas não atualiza `_raw`. `getCiclosLactacao` lê `c.status` de `_raw` → mostra status antigo offline.

**Files:**
- Create: `src/services/__tests__/reproducaoService.transform.test.ts`
- Create: `src/services/__tests__/lactacaoService.encerrar.test.ts`
- Modify: `src/services/reproducaoService.ts`
- Modify: `src/services/lactacaoService.ts`

- [ ] **Step 1: Escreva o teste de transform que falha**

```typescript
// src/services/__tests__/reproducaoService.transform.test.ts
import { getReproducoes } from '../reproducaoService';
import { queryAll, queryFirst } from '../../database/db';

jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

const mockQueryAll = queryAll as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;

function makeReproRow(tipoInseminacao: string, extras = {}) {
  return { _raw: JSON.stringify({ id: 'r1', idBufala: 'b1', status: 'Em andamento', tipoInseminacao, dtEvento: '2026-01-01', ...extras }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryFirst.mockResolvedValue({ total: 1 });
  // bufalos e material_genetico preload vazio
  mockQueryAll.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM reproducoes')) return [makeReproRow('IA')];
    return [];
  });
});

describe('getReproducoes — tipoInseminacao transform', () => {
  it('retorna "IA" quando _raw tem tipoInseminacao = "IA"', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM reproducoes')) return [makeReproRow('IA')];
      return [];
    });
    const { reproducoes } = await getReproducoes('prop1');
    expect(reproducoes[0].tipoInseminacao).toBe('IA');
  });

  it('retorna "IATF" quando _raw tem tipoInseminacao = "IATF"', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM reproducoes')) return [makeReproRow('IATF')];
      return [];
    });
    const { reproducoes } = await getReproducoes('prop1');
    expect(reproducoes[0].tipoInseminacao).toBe('IATF');
  });

  it('retorna "Natural" quando _raw tem tipoInseminacao = "Monta Natural"', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM reproducoes')) return [makeReproRow('Monta Natural')];
      return [];
    });
    const { reproducoes } = await getReproducoes('prop1');
    expect(reproducoes[0].tipoInseminacao).toBe('Natural');
  });
});
```

- [ ] **Step 2: Escreva o teste de `encerrarLactacao` que falha**

```typescript
// src/services/__tests__/lactacaoService.encerrar.test.ts
import { encerrarLactacao } from '../lactacaoService';
import { queryFirst, execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';

jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

const mockExecute = execute as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryFirst.mockResolvedValue({
    _raw: JSON.stringify({ id: 'c1', status: 'Em Lactação', idBufala: 'b1' }),
  });
  mockExecute.mockResolvedValue(undefined);
  mockEnqueue.mockResolvedValue(undefined);
});

describe('encerrarLactacao', () => {
  it('atualiza status no _raw para "seco"', async () => {
    await encerrarLactacao('c1');
    // O execute de UPDATE deve incluir um json_patch ou SET _raw = ? com status seco
    const updateCall = mockExecute.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE ciclos_lactacao')
    );
    expect(updateCall).toBeDefined();
    // Verifica que _raw foi atualizado junto com status
    const sql: string = updateCall![0];
    expect(sql).toMatch(/_raw/);
  });

  it('status no _raw é "seco" após encerrar', async () => {
    await encerrarLactacao('c1');
    const updateCall = mockExecute.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE ciclos_lactacao') && c[0].includes('_raw')
    );
    expect(updateCall).toBeDefined();
    const params = updateCall![1];
    // O _raw deve estar entre os params; encontramos o que é JSON
    const rawParam = params.find((p: any) => {
      try { const obj = JSON.parse(p); return typeof obj === 'object' && obj !== null; }
      catch { return false; }
    });
    expect(rawParam).toBeDefined();
    const raw = JSON.parse(rawParam);
    expect(raw.status).toBe('seco');
  });
});
```

- [ ] **Step 3: Rode os testes e confirme que falham**

```bash
npx jest --no-coverage src/services/__tests__/reproducaoService.transform.test.ts src/services/__tests__/lactacaoService.encerrar.test.ts
```
Esperado: FAIL nos 5 testes.

- [ ] **Step 4: Corrija `tipoInseminacao` transform em `reproducaoService.ts` (linha ~112)**

Substitua o bloco de transform:

```typescript
// ANTES:
tipoInseminacao:
  r.tipoInseminacao === "Inseminação Artificial" ? "IA"
  : r.tipoInseminacao === "Monta Natural" ? "Natural"
  : "-",

// DEPOIS:
tipoInseminacao:
  (r.tipoInseminacao === "Inseminação Artificial" || r.tipoInseminacao === "IA") ? "IA"
  : r.tipoInseminacao === "Monta Natural" ? "Natural"
  : r.tipoInseminacao ?? "-",
```

- [ ] **Step 5: Corrija `encerrarLactacao` em `lactacaoService.ts`**

```typescript
// ANTES:
export const encerrarLactacao = async (idCiclo: string | number) => {
  if (!idCiclo) throw new Error("ID do ciclo é obrigatório.");

  const hoje = new Date().toISOString().split("T")[0];
  const updatePayload = { id: String(idCiclo), dt_secagem_real: hoje, observacao: "Seca", status: "seco" };

  await execute(
    `UPDATE ciclos_lactacao SET status = ?, _synced = 0 WHERE id = ?`,
    ["seco", String(idCiclo)],
  );
  await enqueue("ciclos_lactacao", "UPDATE", updatePayload);
};

// DEPOIS:
export const encerrarLactacao = async (idCiclo: string | number) => {
  if (!idCiclo) throw new Error("ID do ciclo é obrigatório.");

  const hoje = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM ciclos_lactacao WHERE id = ?`,
    [String(idCiclo)],
  );
  const merged = {
    ...(existing ? JSON.parse(existing._raw) : {}),
    status: "seco",
    dtSecagemReal: hoje,
    observacao: "Seca",
    updatedAt: now,
  };

  await execute(
    `UPDATE ciclos_lactacao SET status = ?, _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
    ["seco", JSON.stringify(merged), now, String(idCiclo)],
  );
  await enqueue("ciclos_lactacao", "UPDATE", { id: String(idCiclo), dt_secagem_real: hoje, observacao: "Seca", status: "seco" });
};
```

- [ ] **Step 6: Rode os testes e confirme que passam**

```bash
npx jest --no-coverage src/services/__tests__/reproducaoService.transform.test.ts src/services/__tests__/lactacaoService.encerrar.test.ts
```
Esperado: PASS (5 testes).

- [ ] **Step 7: Rode a suite completa**

```bash
npx jest --no-coverage
```
Esperado: todos passam.

- [ ] **Step 8: Commit**

```bash
git add src/services/reproducaoService.ts src/services/lactacaoService.ts \
  src/services/__tests__/reproducaoService.transform.test.ts \
  src/services/__tests__/lactacaoService.encerrar.test.ts
git commit -m "fix(read): tipoInseminacao passthrough + encerrarLactacao atualiza _raw"
```

---

## Task 6: Fix `piqueteService.getAll` — grupo nome/cor offline

**Bug:** Piquetes criados offline têm `grupo: { idGrupo }` no `_raw` mas sem `nomeGrupo`/`color`. `mapRawToPiquete` retorna `grupoNome: ""` e `grupoCor: "#000000"`.

**Files:**
- Modify: `src/services/__tests__/piqueteService.test.ts` (adicionar ao existente)
- Modify: `src/services/piqueteService.ts`

- [ ] **Step 1: Escreva o teste que falha** (adicione ao final de `piqueteService.test.ts`)

```typescript
// Adicione em src/services/__tests__/piqueteService.test.ts

describe('piqueteService.getAll — grupo fallback offline', () => {
  it('usa nomeGrupo da tabela grupos quando _raw não tem grupo.nomeGrupo', async () => {
    (queryAll as jest.Mock).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM lotes')) {
        return [{
          _raw: JSON.stringify({
            id: 'l1', nomeLote: 'P1', idGrupo: 'g1',
            grupo: { idGrupo: 'g1' }, // offline: sem nomeGrupo
            geoMapa: { coordinates: [[[0,0],[1,0],[1,1],[0,0]]] },
          }),
        }];
      }
      if (sql.includes('FROM grupos')) {
        return [{ _raw: JSON.stringify({ idGrupo: 'g1', id: 'g1', nomeGrupo: 'Pastagem A', color: '#FFAA00' }) }];
      }
      return [];
    });

    const piquetes = await piqueteService.getAll('prop1');
    expect(piquetes[0].grupoNome).toBe('Pastagem A');
    expect(piquetes[0].grupoCor).toBe('#FFAA00');
  });
});
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx jest --no-coverage src/services/__tests__/piqueteService.test.ts
```
Esperado: FAIL — `grupoNome` retorna `""`.

- [ ] **Step 3: Implemente a correção em `piqueteService.ts`**

```typescript
async getAll(id: string): Promise<Piquete[]> {
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM lotes WHERE propriedadeId = ?`,
    [id],
  );

  // Precarrega grupos para fallback offline
  const grupoRows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM grupos WHERE propriedadeId = ?`,
    [id],
  );
  const grupoMap: Record<string, { nomeGrupo: string; color: string }> = {};
  grupoRows.forEach((gr) => {
    const g = JSON.parse(gr._raw);
    const key = g.idGrupo ?? g.id;
    if (key) grupoMap[key] = { nomeGrupo: g.nomeGrupo ?? g.nome ?? '', color: g.color ?? '#000000' };
  });

  return rows.map((row) => {
    const item = JSON.parse(row._raw);
    const idGrupo = item.grupo?.idGrupo ?? item.idGrupo ?? null;
    const fallback = idGrupo ? grupoMap[idGrupo] : undefined;
    return {
      id: item.idLote ?? item.id,
      nome: item.nomeLote,
      coords: item.geoMapa?.coordinates?.[0]?.map((c: number[]) => ({
        latitude: c[1], longitude: c[0],
      })) ?? [],
      idGrupo,
      grupoNome: item.grupo?.nomeGrupo ?? fallback?.nomeGrupo ?? '',
      grupoCor: item.grupo?.color ?? fallback?.color ?? '#000000',
    } as Piquete;
  });
},
```

- [ ] **Step 4: Rode os testes e confirme que passam**

```bash
npx jest --no-coverage src/services/__tests__/piqueteService.test.ts
```
Esperado: PASS (todos).

- [ ] **Step 5: Rode a suite completa**

```bash
npx jest --no-coverage
```
Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add src/services/piqueteService.ts src/services/__tests__/piqueteService.test.ts
git commit -m "fix(piquete): lookup de grupo offline em getAll"
```

---

## Task 7: Sync de `material_genetico` via endpoint paginado

**Bug:** O endpoint flat `/sync/material-genetico` não existe na API. A tabela `material_genetico` fica vazia. `syncService.pullEntity` falha silenciosamente. Precisamos usar o endpoint paginado existente `GET /sync/:id_propriedade/material-genetico`.

**Files:**
- Modify: `src/services/__tests__/syncService.test.ts` (adicionar ao existente)
- Modify: `src/services/syncService.ts`

- [ ] **Step 1: Escreva o teste que falha** (adicione ao final de `syncService.test.ts`)

```typescript
// Adicione em src/services/__tests__/syncService.test.ts

describe('syncService — pullMaterialGenetico', () => {
  it('persiste registros de material_genetico no SQLite usando endpoint paginado', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true, isInternetReachable: true });
    (apiFetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('/material-genetico')) {
        return { data: [{ idMaterial: 'mat1', tipo: 'Sêmen', fornecedor: 'Central XYZ', idPropriedade: 'prop1', updatedAt: '2026-01-01T00:00:00Z' }], meta: { page: 1, totalPages: 1 } };
      }
      if (url.includes('/sync/')) return [];
      return [];
    });
    (queryFirst as jest.Mock).mockResolvedValue(null);
    (execute as jest.Mock).mockResolvedValue(undefined);
    (getPending as jest.Mock).mockResolvedValue([]);

    await syncService.sync('prop1');

    const insertCalls = (execute as jest.Mock).mock.calls.filter(c =>
      typeof c[0] === 'string' && c[0].includes('material_genetico')
    );
    expect(insertCalls.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx jest --no-coverage src/services/__tests__/syncService.test.ts
```
Esperado: FAIL — nenhum INSERT em `material_genetico`.

- [ ] **Step 3: Implemente `pullMaterialGenetico` em `syncService.ts`**

Adicione o método privado dentro da classe `SyncService`:

```typescript
private async pullMaterialGenetico(propriedadeId: string): Promise<void> {
  try {
    const response: any = await apiFetch(`/sync/${propriedadeId}/material-genetico?page=1&limit=500`);
    const records: any[] = Array.isArray(response) ? response : response.data ?? [];
    if (!records.length) return;
    const now = new Date().toISOString();
    const normalized = records.map((r: any) => ({
      ...r,
      id: r.id ?? r.idMaterial ?? null,
      propriedadeId,
      updatedAt: r.updatedAt ?? now,
    }));
    await upsertBatch('material_genetico', normalized);
  } catch (err) {
    console.warn('[sync] pullMaterialGenetico falhou:', err);
  }
}
```

Em `pullEntity`, adicione o dispatch ANTES do bloco genérico:

```typescript
private async pullEntity(entity: string, propriedadeId: string): Promise<void> {
  if (entity === 'industrias') return this.pullIndustrias(propriedadeId);
  if (entity === 'material_genetico') return this.pullMaterialGenetico(propriedadeId);
  // ... resto do bloco genérico
```

- [ ] **Step 4: Rode os testes e confirme que passam**

```bash
npx jest --no-coverage src/services/__tests__/syncService.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Rode a suite completa**

```bash
npx jest --no-coverage
```
Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add src/services/syncService.ts src/services/__tests__/syncService.test.ts
git commit -m "feat(sync): pullMaterialGenetico via endpoint paginado existente"
```

---

## Task 8: Lookup de material genético em `getReproducoes` + SelectBottomSheet no form

**Bug:**
- `getReproducoes`: `brincoMacho` para IA/IATF usa `idSemen.slice(0,5)` (UUID truncado) em vez do nome do material.
- `FormReproductionAdd`: campos sêmen/óvulo são `TextInput` de texto livre; usuário deve selecionar de lista.

**Files:**
- Modify: `src/services/reproducaoService.ts` (add `getMaterialGenetico` + lookup em `getReproducoes`)
- Modify: `src/components/FormReproductionAdd/index.tsx`

- [ ] **Step 1: Adicione e exporte `getMaterialGenetico` em `reproducaoService.ts`**

```typescript
// Adicione após os imports existentes em reproducaoService.ts

export const getMaterialGenetico = async (propriedadeId: string) => {
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM material_genetico WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  return rows.map(r => {
    const m = JSON.parse(r._raw);
    const id = m.idMaterial ?? m.id;
    const label = [m.fornecedor, m.tipo].filter(Boolean).join(' — ') || id;
    return { id, label, tipo: m.tipo ?? '', fornecedor: m.fornecedor ?? '' };
  });
};
```

- [ ] **Step 2: Atualize `getReproducoes` para pré-carregar material_genetico e usar lookup**

Dentro de `getReproducoes`, após o bloco `bufaloMap`, adicione:

```typescript
  const matRows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM material_genetico WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  const matMap: Record<string, { label: string; fornecedor: string }> = {};
  matRows.forEach((mr) => {
    const m = JSON.parse(mr._raw);
    const key = m.idMaterial ?? m.id;
    if (key) matMap[key] = {
      label: [m.fornecedor, m.tipo].filter(Boolean).join(' — ') || key.slice(0, 8),
      fornecedor: m.fornecedor ?? key.slice(0, 8),
    };
  });
```

Substitua as linhas `nomeMacho` e `brincoMacho`:

```typescript
      nomeMacho: macho?.nome ?? machoFallback?.nome ?? (r.idSemen ? matMap[r.idSemen]?.fornecedor ?? "Sêmen" : (r.idOvulo ? matMap[r.idOvulo]?.fornecedor ?? "Óvulo" : "-")),
      brincoMacho: macho?.brinco ?? machoFallback?.brinco ?? (r.idSemen ? matMap[r.idSemen]?.label ?? r.idSemen.slice(0, 8) : (r.idOvulo ? matMap[r.idOvulo]?.label ?? r.idOvulo.slice(0, 8) : "-")),
```

- [ ] **Step 3: Atualize `FormReproductionAdd` — trocar TextInput por SelectBottomSheet**

Substitua o conteúdo relevante de `FormReproductionAdd/index.tsx`:

**3a. Adicione imports e estados:**

```typescript
// Adicione no topo junto com os outros imports
import { getMaterialGenetico } from "../../services/reproducaoService";

// Adicione estados após os existentes:
const [matGeneticoSemen, setMatGeneticoSemen] = useState<{ id: string; label: string }[]>([]);
const [matGeneticoOvulo, setMatGeneticoOvulo] = useState<{ id: string; label: string }[]>([]);
const [idSemenSelecionado, setIdSemenSelecionado] = useState<string | null>(null);
const [idOvuloSelecionado, setIdOvuloSelecionado] = useState<string | null>(null);
```

**3b. Adicione useEffect para carregar material genético:**

```typescript
useEffect(() => {
  if (!propriedadeSelecionada) return;
  getMaterialGenetico(propriedadeSelecionada).then((mats) => {
    setMatGeneticoSemen(mats.filter(m => m.tipo.toLowerCase().includes('sêmen') || m.tipo.toLowerCase().includes('semen') || m.tipo === ''));
    setMatGeneticoOvulo(mats.filter(m => m.tipo.toLowerCase().includes('óvulo') || m.tipo.toLowerCase().includes('ovulo')));
  }).catch(() => {});
}, [propriedadeSelecionada]);
```

**3c. Atualize `handleSave` para usar os IDs selecionados:**

Substitua as linhas de `idSemenUsado` e `idOvuloUsado`:

```typescript
let idSemenUsado = idSemenSelecionado || null;
let idOvuloUsado = idOvuloSelecionado || null;
```

**3d. No JSX, substitua as seções de TextInput de sêmen/óvulo:**

```tsx
{/* --- Extras (Material Genético) --- */}
<Text style={styles.sectionTitle}>Material Genético (Opcional)</Text>

<View style={styles.listContainer}>
  <Text style={styles.label}>Sêmen</Text>
  {matGeneticoSemen.length === 0 ? (
    <Text style={{ color: '#999', marginBottom: 12, fontSize: 13 }}>
      Nenhum sêmen cadastrado — sincronize primeiro.
    </Text>
  ) : (
    <SelectBottomSheet
      items={matGeneticoSemen.map(m => ({ label: m.label, value: m.id }))}
      value={idSemenSelecionado}
      onChange={(val: any) => setIdSemenSelecionado(val)}
      title="Selecionar Sêmen"
      placeholder="Selecione o Sêmen"
    />
  )}

  <Text style={styles.label}>Óvulo (FIV)</Text>
  {matGeneticoOvulo.length === 0 ? (
    <Text style={{ color: '#999', marginBottom: 12, fontSize: 13 }}>
      Nenhum óvulo cadastrado — sincronize primeiro.
    </Text>
  ) : (
    <SelectBottomSheet
      items={matGeneticoOvulo.map(m => ({ label: m.label, value: m.id }))}
      value={idOvuloSelecionado}
      onChange={(val: any) => setIdOvuloSelecionado(val)}
      title="Selecionar Óvulo"
      placeholder="Selecione o Óvulo (FIV)"
    />
  )}
</View>
```

- [ ] **Step 4: Execute o app no dispositivo e verifique**

Como o Jest não testa UI/react-native-components, verifique manualmente:
1. Abra a tela de Reprodução → Nova Reprodução
2. Confirme que os campos de Sêmen e Óvulo mostram "Nenhum cadastrado — sincronize primeiro" (antes de sync)
3. Após sync, reabra o form e confirme que o SelectBottomSheet lista os materiais genéticos
4. Crie uma reprodução IA e confirme que o card mostra o nome do material (não UUID truncado)

- [ ] **Step 5: Rode a suite completa**

```bash
npx jest --no-coverage
```
Esperado: todos passam (as mudanças de UI não têm testes unitários, mas não devem quebrar os existentes).

- [ ] **Step 6: Commit**

```bash
git add src/services/reproducaoService.ts src/components/FormReproductionAdd/index.tsx
git commit -m "feat(reproducao): getMaterialGenetico + lookup em getReproducoes + SelectBottomSheet no form"
```

---

## Self-Review

**Spec coverage:**
- ✅ A1 bufaloService.updateBufalo — Task 1
- ✅ A2 zootecnicoService.update — Task 2
- ✅ A3 sanitarioService.update — Task 3
- ✅ C1 shapeLoteCreate areaM2 — Task 4
- ✅ B3 shapeReproducaoCreate null — Task 4
- ✅ B1 tipoInseminacao transform — Task 5
- ✅ G1 encerrarLactacao _raw — Task 5
- ✅ E1 piqueteService grupo fallback — Task 6
- ✅ B4 pullMaterialGenetico — Task 7
- ✅ B2 material lookup getReproducoes — Task 8
- ✅ Form SelectBottomSheet — Task 8

**Ordem de dependência:** Tasks 1-6 são independentes entre si. Task 7 (sync) deve vir antes de Task 8 (lookup usa tabela populada pelo sync). Tasks 1-6 podem correr em paralelo se houver múltiplos agentes; Tasks 7→8 devem ser sequenciais.

**Adaptadores obsoletos:** `bufaloAdapter.ts` deletado na Task 3 após garantir que `zootecnicoService` (Task 2) e `sanitarioService` (Task 3) não o usam mais.
