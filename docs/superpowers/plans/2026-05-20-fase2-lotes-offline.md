# Fase 2 — Lotes/Piquetes Offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para implementar task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Tornar lotes/piquetes disponíveis offline — `piqueteService.getAll` lê do SQLite local (resolve o erro de rede no AnimalDetail e na PiquetesScreen) e a criação vai pela fila de push.

**Architecture:** Nova tabela local `lotes`, sincronizada via o endpoint REST existente `GET /lotes/propriedade/:id` (caso especial no `syncService`, já que não há `/sync/lotes` flat ainda — virá na Fase 4). `piqueteService.getAll` passa a ler do SQLite; `piqueteService.create` insere localmente (otimista) e enfileira `POST /lotes` via o registry (fallback genérico). Migração bumpada para v7.

**Tech Stack:** React Native, TypeScript, `@op-engineering/op-sqlite`, Jest 29, `react-native-uuid`.

**Spec:** `docs/superpowers/specs/2026-05-20-offline-first-completo-design.md` (Fase 2).

---

## Contexto verificado na API

- `GET /lotes/propriedade/:id` (`lote.controller.ts:19`) retorna **array cru** de lotes, cada um com: `idLote`, `nomeLote`, `idPropriedade`, `geoMapa` (objeto GeoJSON), `updatedAt`, e relação aninhada `grupo: { idGrupo, nomeGrupo, color }`. **Filtra `deletedAt IS NULL`** → no interino não há purge de soft-delete (aceitável; incremental+soft-delete vêm na Fase 4).
- `POST /lotes` (`lote.controller.ts:31`) cria o lote. O push usa o **fallback genérico** do registry (`CREATE → POST /lotes`), sem precisar de resolver dedicado.

## Limitação conhecida (registro-fantasma)

Como a API gera o próprio `idLote` no POST, um piquete criado offline (id local) pode aparecer duplicado após o sync trazer a versão do servidor — o **mesmo** comportamento já existente em `createBufalo`. Não resolvido nesta fase; candidato a issue de Fase 4 (API aceitar UUID gerado pelo cliente). A inserção local otimista é mantida para o piquete aparecer offline imediatamente.

---

## File Structure

- **Modify** `src/database/schema.ts` — add `lotes` em `ENTITY_PK_MAP`, `ENTITY_API_PK_MAP`, `getEntityExtras`, e a `CREATE TABLE lotes` + índice em `CREATE_TABLES_SQL`.
- **Create** `__tests__/database/schema.test.ts` — testa que `getEntityExtras('lotes', ...)` extrai `propriedadeId`/`idGrupo` e que `CREATE_TABLES_SQL` inclui `lotes`.
- **Modify** `src/database/migrations.ts:4` — bump `CURRENT_VERSION` para 7.
- **Modify** `__tests__/database/migrations.test.ts` — versão esperada 6 → 7.
- **Modify** `src/services/syncService.ts` — caso especial para `lotes` no `pullEntity` (URL `/lotes/propriedade/:id`).
- **Modify** `src/services/piqueteService.ts` — `getAll` lê local; `create` insere local + enqueue.
- **Create** `src/services/__tests__/piqueteService.test.ts` — testa `getAll` (parse do `_raw`) e `create` (insert + enqueue).

---

### Task 1: Tabela `lotes` no schema + maps + getEntityExtras

**Files:**
- Modify: `src/database/schema.ts`
- Test: `__tests__/database/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Criar `__tests__/database/schema.test.ts`:

```typescript
import { ENTITY_PK_MAP, ENTITY_API_PK_MAP, getEntityExtras, CREATE_TABLES_SQL } from '../../src/database/schema';

describe('schema — lotes', () => {
  test('lotes está em ENTITY_PK_MAP e ENTITY_API_PK_MAP', () => {
    expect(ENTITY_PK_MAP.lotes).toBe('id');
    expect(ENTITY_API_PK_MAP.lotes).toBe('idLote');
  });

  test('getEntityExtras extrai propriedadeId e idGrupo (grupo aninhado)', () => {
    const record = { idLote: 'l1', idPropriedade: 'p1', grupo: { idGrupo: 'g1' } };
    expect(getEntityExtras('lotes', record)).toEqual({ propriedadeId: 'p1', idGrupo: 'g1' });
  });

  test('getEntityExtras aceita idGrupo no topo como fallback', () => {
    const record = { idLote: 'l1', propriedadeId: 'p1', idGrupo: 'g9' };
    expect(getEntityExtras('lotes', record)).toEqual({ propriedadeId: 'p1', idGrupo: 'g9' });
  });

  test('CREATE_TABLES_SQL inclui a tabela lotes', () => {
    const hasLotes = CREATE_TABLES_SQL.some((sql) => /CREATE TABLE IF NOT EXISTS lotes/.test(sql));
    expect(hasLotes).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/database/schema.test.ts`
Expected: FAIL — `ENTITY_PK_MAP.lotes` é `undefined`.

- [ ] **Step 3: Write minimal implementation**

Em `src/database/schema.ts`:

1. Adicionar `lotes: 'id',` ao final do objeto `ENTITY_PK_MAP` (após `reproducoes: 'id',`).

2. Adicionar `lotes: 'idLote',` ao final do objeto `ENTITY_API_PK_MAP` (após `reproducoes: 'idReproducao',`).

3. Em `getEntityExtras`, adicionar o case antes do `default:`:

```typescript
    case 'lotes':
      return { ...idProp, idGrupo: record.grupo?.idGrupo ?? record.idGrupo ?? null };
```

4. Em `CREATE_TABLES_SQL`, adicionar (após o bloco da tabela `reproducoes` e seu índice, antes de `sync_meta`):

```typescript
  `CREATE TABLE IF NOT EXISTS lotes (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    idGrupo       TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lotes_prop ON lotes(propriedadeId)`,
```

> Conferir que `LEGACY_TABLES` em `migrations.ts` inclui `lotes` para o drop-all. (Já inclui? Se não, adicionar `'lotes'` na Task 2.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/database/schema.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/database/schema.ts __tests__/database/schema.test.ts
git commit -m "feat(lotes): tabela local lotes + maps + getEntityExtras"
```

---

### Task 2: Bump migração v7 (+ garantir drop de `lotes`)

**Files:**
- Modify: `src/database/migrations.ts`
- Modify: `__tests__/database/migrations.test.ts`

- [ ] **Step 1: Write the failing test**

Em `__tests__/database/migrations.test.ts`, atualizar as três ocorrências de 6 para 7 (mesma estrutura da Fase 1):
- As duas asserções `expect(mockExecute).toHaveBeenCalledWith('PRAGMA user_version = 6');` → `= 7`.
- O mock `mockResolvedValueOnce({ rows: [{ user_version: 6 }] });` (teste "skips") → `user_version: 7`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/database/migrations.test.ts`
Expected: FAIL — código grava `PRAGMA user_version = 6`.

- [ ] **Step 3: Write minimal implementation**

Em `src/database/migrations.ts`:

1. Linha 4: `const CURRENT_VERSION = 7;`

2. Garantir que `lotes` está no array `LEGACY_TABLES`. Se não estiver, adicionar `'lotes',` ao array (para o drop-all recriar limpo).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/database/migrations.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/database/migrations.ts __tests__/database/migrations.test.ts
git commit -m "chore(db): bump migração v7 com tabela lotes"
```

---

### Task 3: `syncService` puxa lotes via REST `/lotes/propriedade/:id`

**Files:**
- Modify: `src/services/syncService.ts`
- Test: `src/services/__tests__/syncService.test.ts`

- [ ] **Step 1: Write the failing test**

Ler primeiro `src/services/__tests__/syncService.test.ts` para reaproveitar os mocks de `apiFetch`/`NetInfo`/`db`. Adicionar um teste que, ao sincronizar, a entidade `lotes` chama `/lotes/propriedade/{id}` (e **não** `/sync/lotes`). Modelo (ajustar nomes de mock ao arquivo real):

```typescript
test('pull de lotes usa o endpoint REST /lotes/propriedade/:id', async () => {
  const { apiFetch } = require('../../lib/apiClient');
  (apiFetch as jest.Mock).mockResolvedValue([]); // qualquer entidade retorna []

  await syncService.sync('prop-123');

  const chamadas = (apiFetch as jest.Mock).mock.calls.map((c: any[]) => c[0]);
  expect(chamadas).toContain('/lotes/propriedade/prop-123');
  expect(chamadas.some((u: string) => u.includes('/sync/lotes'))).toBe(false);
});
```

> Se o teste de sync existente já mocka `isConnected`/`NetInfo` como online, reaproveitar esse setup. Se `sync()` exigir online, garantir o mock de conexão (ver os testes "push envia..." / "pull chama /sync...").

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/syncService.test.ts`
Expected: FAIL — sem o caso especial, `lotes` cairia em `/sync/undefined?...` (path indefinido), não em `/lotes/propriedade/prop-123`.

- [ ] **Step 3: Write minimal implementation**

Em `src/services/syncService.ts`, dentro de `pullEntity`, substituir o trecho que monta a `response` por:

```typescript
      let response: any;
      if (entity === 'lotes') {
        response = await apiFetch(`/lotes/propriedade/${propriedadeId}`);
      } else {
        const path = SYNC_ENTITY_PATH[entity];
        const qs = new URLSearchParams();
        if (entity !== 'racas') {
          qs.append('propriedadeId', propriedadeId);
        }
        if (meta?.lastSyncedAt) qs.append('updated_at', meta.lastSyncedAt);
        response = await apiFetch(`/sync/${path}?${qs.toString()}`);
      }
```

> Remover a declaração antiga `const path = ...` / `const qs = ...` / `const response = await apiFetch(...)` que ficou para fora (agora estão dentro do `else`). O restante (`data`, `normalizedData`, `upsertBatch`, `sync_meta`) permanece igual.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/syncService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/syncService.ts src/services/__tests__/syncService.test.ts
git commit -m "feat(sync): lotes sincroniza via REST /lotes/propriedade/:id"
```

---

### Task 4: `piqueteService` lê local e enfileira criação

**Files:**
- Modify: `src/services/piqueteService.ts`
- Test: `src/services/__tests__/piqueteService.test.ts`

- [ ] **Step 1: Write the failing test**

Criar `src/services/__tests__/piqueteService.test.ts`:

```typescript
jest.mock('@op-engineering/op-sqlite');
jest.mock('../../database/db');
jest.mock('../pendingOperationsService', () => ({ enqueue: jest.fn() }));
jest.mock('react-native-uuid', () => ({ v4: () => 'lote-uuid' }));

import { queryAll, execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';
import { piqueteService } from '../piqueteService';

const mockQueryAll = queryAll as jest.Mock;
const mockExecute = execute as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('getAll lê do SQLite e mapeia coords/grupo do _raw', async () => {
  const raw = JSON.stringify({
    idLote: 'l1', nomeLote: 'Piquete 1',
    geoMapa: { type: 'Polygon', coordinates: [[[ -47.1, -22.2 ], [ -47.0, -22.1 ]]] },
    grupo: { idGrupo: 'g1', nomeGrupo: 'Lactantes', color: '#4CAF50' },
  });
  mockQueryAll.mockResolvedValue([{ _raw: raw }]);

  const result = await piqueteService.getAll('prop-1');

  expect(mockQueryAll).toHaveBeenCalledWith(
    expect.stringContaining('FROM lotes WHERE propriedadeId = ?'),
    ['prop-1']
  );
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    id: 'l1', nome: 'Piquete 1', idGrupo: 'g1', grupoNome: 'Lactantes', grupoCor: '#4CAF50',
    coords: [{ latitude: -22.2, longitude: -47.1 }, { latitude: -22.1, longitude: -47.0 }],
  });
});

test('create insere local e enfileira CREATE de lotes', async () => {
  mockExecute.mockResolvedValue(undefined);

  await piqueteService.create({
    nomeLote: 'Novo', idPropriedade: 'prop-1', idGrupo: 'g1',
    tipoLote: 'Pasto', status: 'ativo', qtdMax: 10, areaM2: 100,
    geoMapa: { type: 'Polygon', coordinates: [[[ -47.1, -22.2 ], [ -47.0, -22.1 ]]] },
  });

  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO lotes'),
    expect.arrayContaining(['lote-uuid', 'prop-1', 'g1'])
  );
  expect(mockEnqueue).toHaveBeenCalledWith('lotes', 'CREATE', expect.objectContaining({ id: 'lote-uuid', nomeLote: 'Novo' }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/piqueteService.test.ts`
Expected: FAIL — `getAll` atual chama `apiFetch`, não `queryAll`; `create` chama `apiFetch`, não `execute`/`enqueue`.

- [ ] **Step 3: Write minimal implementation**

Reescrever `src/services/piqueteService.ts` (mantendo as interfaces `Piquete`/`NovoPiqueteDTO`):

```typescript
import { apiFetch } from "../lib/apiClient";
import { queryAll, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";

export interface Piquete {
  idGrupo: any;
  id: string;
  nome: string;
  coords: { latitude: number; longitude: number }[];
  grupoNome: string;
  grupoCor: string;
  color: string;
}

export interface NovoPiqueteDTO {
  nomeLote: string;
  idPropriedade: string;
  idGrupo: string;
  tipoLote: string;
  status: string;
  descricao?: string;
  qtdMax: number;
  areaM2: number;
  geoMapa: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

function mapRawToPiquete(item: any): Piquete {
  const coords =
    item.geoMapa?.coordinates?.[0]?.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0],
    })) ?? [];

  return {
    id: item.idLote ?? item.id,
    nome: item.nomeLote,
    coords,
    idGrupo: item.grupo?.idGrupo ?? item.idGrupo ?? null,
    grupoNome: item.grupo?.nomeGrupo ?? "",
    grupoCor: item.grupo?.color ?? "#000000",
  } as Piquete;
}

export const piqueteService = {
  async getAll(id: string): Promise<Piquete[]> {
    const rows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM lotes WHERE propriedadeId = ?`,
      [id],
    );
    return rows.map((row) => mapRawToPiquete(JSON.parse(row._raw)));
  },

  async create(novoPiquete: NovoPiqueteDTO): Promise<Piquete> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const body = {
      ...novoPiquete,
      id,
      geoMapa: {
        type: "Polygon" as const,
        coordinates: [
          [
            ...novoPiquete.geoMapa.coordinates[0],
            novoPiquete.geoMapa.coordinates[0][0],
          ],
        ],
      },
    };

    const record = {
      ...body,
      idLote: id,
      idPropriedade: novoPiquete.idPropriedade,
      grupo: { idGrupo: novoPiquete.idGrupo },
    };

    await execute(
      `INSERT INTO lotes (id, propriedadeId, idGrupo, _raw, _synced, updatedAt)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [id, novoPiquete.idPropriedade, novoPiquete.idGrupo, JSON.stringify(record), now],
    );

    await enqueue("lotes", "CREATE", body);

    return mapRawToPiquete(record);
  },
};
```

> O `import { apiFetch }` permanece para não quebrar tipagem se referenciado em outro lugar; se o lint acusar import não usado, removê-lo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/piqueteService.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/services/piqueteService.ts src/services/__tests__/piqueteService.test.ts
git commit -m "feat(lotes): piqueteService lê do SQLite e enfileira criação offline"
```

---

### Task 5: Suíte completa + verificação dos consumidores

**Files:** nenhum (execução)

- [ ] **Step 1: Rodar a suíte inteira**

Run: `npx jest`
Expected: PASS em todas as suítes Fase 2 (`schema`, `migrations`, `piqueteService`, `syncService`) + as pré-existentes. (A falha pré-existente de `__tests__/App.test.tsx` por `react-native-reanimated` é não-relacionada e pode permanecer.)

- [ ] **Step 2: Verificar consumidores de getAll**

Conferir que `AnimalDetailScreen.tsx:100` e `PiquetesScreen.tsx` continuam compatíveis — `getAll` agora lê local mas retorna o mesmo shape `Piquete[]` (campos `id`, `nome`, `coords`, `idGrupo`, `grupoNome`, `grupoCor`). Nenhuma alteração necessária nesses arquivos.

- [ ] **Step 3: Remover o try/catch paliativo do AnimalDetail (opcional)**

Em `AnimalDetailScreen.tsx`, o `try/catch` em volta de `piqueteService.getAll` (adicionado em 2026-05-20 para engolir erro de rede) **pode ser mantido** como defesa — não remover nesta fase para evitar regressão. Apenas registrar que a causa-raiz (rede) foi resolvida.

- [ ] **Step 4: Commit (se algum ajuste foi necessário)**

```bash
git add -A
git commit -m "test(lotes): suíte verde para lotes offline"
```

> Se nenhum ajuste foi necessário, pular este commit.

---

## Notas para o executor

- **Não alterar** `AnimalDetailScreen.tsx` nem `PiquetesScreen.tsx` (apenas verificar compatibilidade do shape).
- O push de `lotes` usa o **fallback genérico** do registry (Fase 1) — `CREATE → POST /lotes`. Não precisa de resolver dedicado.
- Migração v7 dropa tudo e recria no próximo boot (re-sync da API).
- Limitação de registro-fantasma em `create` é conhecida e compartilhada com `createBufalo` — não resolver aqui.
