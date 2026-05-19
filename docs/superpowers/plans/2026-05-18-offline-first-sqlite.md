# Offline-First SQLite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o app de online-only para offline-first, com SQLite local para leitura/escrita e sincronização via endpoints `/sync` da buffs-api.

**Architecture:** Reads vêm do SQLite local via helpers `queryAll`/`queryFirst`. Writes vão para SQLite imediatamente (otimista) e entram em `pending_operations` para envio assíncrono. `SyncService` orquestra push → pull em 4 gatilhos.

**Tech Stack:** `@op-engineering/op-sqlite` (JSI), `@react-native-community/netinfo`, `react-native-uuid`, Jest para testes.

**Spec:** `docs/superpowers/specs/2026-05-18-offline-first-sqlite-design.md`

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `src/database/schema.ts` |
| Criar | `src/database/db.ts` |
| Criar | `src/database/migrations.ts` |
| Criar | `src/services/pendingOperationsService.ts` |
| Criar | `src/services/syncService.ts` |
| Criar | `src/context/SyncContext.tsx` |
| Criar | `src/screens/InitialSyncScreen.tsx` |
| Criar | `src/components/SyncStatusBanner.tsx` |
| Criar | `__mocks__/@op-engineering/op-sqlite.ts` (raiz do projeto) |
| Criar | `__mocks__/@react-native-community/netinfo.ts` (raiz do projeto) |
| Criar | `src/database/__tests__/db.test.ts` |
| Criar | `src/services/__tests__/pendingOperationsService.test.ts` |
| Criar | `src/services/__tests__/syncService.test.ts` |
| Criar | `src/services/__tests__/bufaloService.offline.test.ts` |
| Modificar | `App.tsx` |
| Modificar | `src/services/bufaloService.ts` |
| Modificar | `src/services/lactacaoService.ts` |
| Modificar | `src/services/sanitarioService.ts` |
| Modificar | `src/services/reproducaoService.ts` |
| Modificar | `src/services/zootecnicoService.ts` |
| Modificar | `src/services/grupoService.ts` |
| Modificar | `src/services/alertaService.ts` |

---

## Task 1: Instalar dependências e configurar módulos nativos

**Files:**
- Modify: `package.json`
- Modify: `android/app/build.gradle`

- [ ] **Step 1: Instalar as 3 bibliotecas novas**

```bash
npm install @op-engineering/op-sqlite @react-native-community/netinfo react-native-uuid
```

Saída esperada: `added N packages` sem erros.

- [ ] **Step 2: Adicionar suporte a prefab no Android** (necessário para op-sqlite via JSI)

Abrir `android/app/build.gradle`, localizar o bloco `android { ... }` e adicionar dentro de `defaultConfig` ou `buildFeatures`:

```groovy
android {
    // ... existing config ...
    buildFeatures {
        prefab true
    }
}
```

- [ ] **Step 3: Instalar pods no iOS**

```bash
cd ios && pod install && cd ..
```

Saída esperada: `Pod installation complete!`

- [ ] **Step 4: Verificar instalação**

```bash
npx react-native run-android --mode=debug 2>&1 | tail -5
```

Saída esperada: app sobe sem erros de linking.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json android/app/build.gradle ios/Podfile.lock
git commit -m "chore: instala op-sqlite, netinfo e react-native-uuid"
```

---

## Task 2: Infraestrutura de banco de dados

**Files:**
- Create: `src/database/schema.ts`
- Create: `src/database/db.ts`
- Create: `src/database/migrations.ts`
- Create: `src/__mocks__/@op-engineering/op-sqlite.ts`
- Create: `src/database/__tests__/db.test.ts`

- [ ] **Step 1: Criar o mock do op-sqlite para testes**

Criar `__mocks__/@op-engineering/op-sqlite.ts` (na raiz do projeto, ao lado de `node_modules`):

```typescript
let _mockRows: any[] = [];

export const __setMockRows = (rows: any[]) => { _mockRows = rows; };
export const __clearMocks = () => { _mockRows = []; };

const mockDb = {
  executeAsync: jest.fn(async () => ({ rows: { _array: _mockRows } })),
};

export const open = jest.fn(() => mockDb);
export const __mockDb = mockDb;
```

- [ ] **Step 2: Criar o schema com todas as tabelas**

Criar `src/database/schema.ts`:

```typescript
export const ENTITY_PK_MAP: Record<string, string> = {
  bufalos: 'idBufalo',
  ciclos_lactacao: 'idCicloLactacao',
  grupos: 'idGrupo',
  racas: 'idRaca',
  dados_zootecnicos: 'idDadoZootecnico',
  medicamentos: 'idMedicamento',
  dados_sanitarios: 'idDadoSanitario',
  alertas: 'idAlerta',
  coberturas: 'idCobertura',
  material_genetico: 'idMaterialGenetico',
};

export const SYNC_ENTITY_PATH: Record<string, string> = {
  bufalos: 'bufalos',
  ciclos_lactacao: 'lactacao',
  grupos: 'grupos',
  racas: 'racas',
  dados_zootecnicos: 'dados-zootecnicos',
  medicamentos: 'medicamentos',
  dados_sanitarios: 'dados-sanitarios',
  alertas: 'alertas',
  coberturas: 'coberturas',
  material_genetico: 'material-genetico',
};

// Retorna colunas queryáveis por entidade (além de pk/updatedAt/deletedAt/_raw)
export function getEntityExtras(entity: string, record: any): Record<string, any> {
  const idProp = { idPropriedade: record.idPropriedade ?? null };
  switch (entity) {
    case 'bufalos':
      return {
        ...idProp,
        brinco: record.brinco ?? null,
        sexo: record.sexo ?? null,
        status: record.status ?? null,
        nivelMaturidade: record.nivelMaturidade ?? null,
        idRaca: record.idRaca ?? null,
        microchip: record.microchip ?? null,
      };
    case 'ciclos_lactacao':
      return { ...idProp, idBufala: record.idBufala ?? null, status: record.status ?? null };
    case 'grupos':
      return { ...idProp, nome: record.nome ?? null };
    case 'racas':
      return { nome: record.nome ?? null };         // sem idPropriedade (global)
    case 'dados_zootecnicos':
      return { ...idProp, idBufalo: record.idBufalo ?? null };
    case 'medicamentos':
      return { nome: record.nome ?? null };          // sem idPropriedade (global)
    case 'dados_sanitarios':
      return { ...idProp, idBufalo: record.idBufalo ?? null };
    case 'alertas':
      return { ...idProp, lido: record.lido ? 1 : 0 };
    case 'coberturas':
      return { ...idProp, idBufala: record.idBufala ?? null };
    case 'material_genetico':
      return { ...idProp };
    default:
      return { ...idProp };
  }
}

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS bufalos (
    idBufalo        TEXT PRIMARY KEY,
    idPropriedade   TEXT,
    brinco          TEXT,
    sexo            TEXT,
    status          TEXT,
    nivelMaturidade TEXT,
    idRaca          TEXT,
    microchip       TEXT,
    updatedAt       TEXT NOT NULL,
    deletedAt       TEXT,
    _synced         INTEGER NOT NULL DEFAULT 0,
    _raw            TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_bufalos_prop ON bufalos(idPropriedade);
  CREATE INDEX IF NOT EXISTS idx_bufalos_brinco ON bufalos(brinco);

  CREATE TABLE IF NOT EXISTS ciclos_lactacao (
    idCicloLactacao TEXT PRIMARY KEY,
    idPropriedade   TEXT,
    idBufala        TEXT,
    status          TEXT,
    updatedAt       TEXT NOT NULL,
    deletedAt       TEXT,
    _synced         INTEGER NOT NULL DEFAULT 0,
    _raw            TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lactacao_prop ON ciclos_lactacao(idPropriedade);

  CREATE TABLE IF NOT EXISTS grupos (
    idGrupo       TEXT PRIMARY KEY,
    idPropriedade TEXT,
    nome          TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS racas (
    idRaca    TEXT PRIMARY KEY,
    nome      TEXT,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT,
    _raw      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dados_zootecnicos (
    idDadoZootecnico TEXT PRIMARY KEY,
    idPropriedade    TEXT,
    idBufalo         TEXT,
    updatedAt        TEXT NOT NULL,
    deletedAt        TEXT,
    _synced          INTEGER NOT NULL DEFAULT 0,
    _raw             TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_zootecnico_bufalo ON dados_zootecnicos(idBufalo);

  CREATE TABLE IF NOT EXISTS medicamentos (
    idMedicamento TEXT PRIMARY KEY,
    nome          TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _raw          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dados_sanitarios (
    idDadoSanitario TEXT PRIMARY KEY,
    idPropriedade   TEXT,
    idBufalo        TEXT,
    updatedAt       TEXT NOT NULL,
    deletedAt       TEXT,
    _synced         INTEGER NOT NULL DEFAULT 0,
    _raw            TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sanitario_bufalo ON dados_sanitarios(idBufalo);

  CREATE TABLE IF NOT EXISTS alertas (
    idAlerta      TEXT PRIMARY KEY,
    idPropriedade TEXT,
    lido          INTEGER DEFAULT 0,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coberturas (
    idCobertura   TEXT PRIMARY KEY,
    idPropriedade TEXT,
    idBufala      TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS material_genetico (
    idMaterialGenetico TEXT PRIMARY KEY,
    idPropriedade      TEXT,
    updatedAt          TEXT NOT NULL,
    deletedAt          TEXT,
    _synced            INTEGER NOT NULL DEFAULT 0,
    _raw               TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_meta (
    entity         TEXT NOT NULL,
    propriedadeId  TEXT NOT NULL,
    lastSyncedAt   TEXT,
    PRIMARY KEY (entity, propriedadeId)
  );

  CREATE TABLE IF NOT EXISTS pending_operations (
    id           TEXT PRIMARY KEY,
    entity       TEXT NOT NULL,
    operation    TEXT NOT NULL,
    endpoint     TEXT NOT NULL,
    method       TEXT NOT NULL,
    payload      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PENDING',
    retryCount   INTEGER NOT NULL DEFAULT 0,
    errorMessage TEXT,
    createdAt    TEXT NOT NULL
  );
`;
```

- [ ] **Step 3: Criar db.ts com helpers e singleton**

Criar `src/database/db.ts`:

```typescript
import { open, type DB } from '@op-engineering/op-sqlite';

let _db: DB | null = null;

function getDb(): DB {
  if (!_db) {
    _db = open({ name: 'buffs.sqlite' });
  }
  return _db;
}

export async function queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await getDb().executeAsync(sql, params);
  const arr = Array.isArray(result.rows) ? result.rows : (result.rows as any)?._array ?? [];
  return arr as T[];
}

export async function queryFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  await getDb().executeAsync(sql, params);
}

export async function isFirstSync(): Promise<boolean> {
  const row = await queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM sync_meta');
  return (row?.count ?? 0) === 0;
}
```

- [ ] **Step 4: Criar migrations.ts**

Criar `src/database/migrations.ts`:

```typescript
import { CREATE_TABLES_SQL } from './schema';
import { execute, queryFirst } from './db';

const CURRENT_VERSION = 1;

export async function runMigrations(): Promise<void> {
  const row = await queryFirst<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < CURRENT_VERSION) {
    // Executa cada statement separadamente (op-sqlite não aceita múltiplos em uma só chamada)
    const statements = CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);

    for (const sql of statements) {
      await execute(sql);
    }

    await execute(`PRAGMA user_version = ${CURRENT_VERSION}`);
  }
}
```

- [ ] **Step 5: Escrever teste para db.ts**

Criar `src/database/__tests__/db.test.ts`:

```typescript
jest.mock('@op-engineering/op-sqlite');

import { __mockDb, __setMockRows } from '@op-engineering/op-sqlite';
import { queryAll, queryFirst, execute } from '../db';

beforeEach(() => {
  jest.clearAllMocks();
});

test('queryAll retorna array de linhas', async () => {
  __setMockRows([{ id: '1', nome: 'Brahman' }]);
  const rows = await queryAll('SELECT * FROM racas');
  expect(rows).toEqual([{ id: '1', nome: 'Brahman' }]);
  expect(__mockDb.executeAsync).toHaveBeenCalledWith('SELECT * FROM racas', []);
});

test('queryFirst retorna primeira linha ou null', async () => {
  __setMockRows([]);
  const row = await queryFirst('SELECT * FROM racas WHERE idRaca = ?', ['x']);
  expect(row).toBeNull();
});

test('execute chama executeAsync com params', async () => {
  __setMockRows([]);
  await execute('DELETE FROM pending_operations WHERE id = ?', ['abc']);
  expect(__mockDb.executeAsync).toHaveBeenCalledWith(
    'DELETE FROM pending_operations WHERE id = ?',
    ['abc']
  );
});
```

- [ ] **Step 6: Rodar o teste**

```bash
npx jest --testPathPattern=src/database/__tests__/db.test.ts --no-coverage
```

Saída esperada: `3 passed`.

- [ ] **Step 7: Commit**

```bash
git add src/database/ __mocks__/
git commit -m "feat: adiciona infraestrutura SQLite (schema, db helpers, migrations)"
```

---

## Task 3: pendingOperationsService.ts

**Files:**
- Create: `src/services/pendingOperationsService.ts`
- Create: `src/services/__tests__/pendingOperationsService.test.ts`

- [ ] **Step 1: Escrever o teste antes da implementação**

Criar `src/services/__tests__/pendingOperationsService.test.ts`:

```typescript
jest.mock('@op-engineering/op-sqlite');
jest.mock('../../database/db');

import { queryAll, execute } from '../../database/db';
import { pendingOperationsService } from '../pendingOperationsService';

const mockQueryAll = queryAll as jest.Mock;
const mockExecute = execute as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('enqueue insere operação na tabela pending_operations', async () => {
  mockExecute.mockResolvedValue(undefined);

  await pendingOperationsService.enqueue({
    entity: 'bufalos',
    operation: 'CREATE',
    endpoint: '/bufalos',
    method: 'POST',
    payload: JSON.stringify({ idBufalo: 'abc', nome: 'Estrela' }),
  });

  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO pending_operations'),
    expect.arrayContaining(['bufalos', 'CREATE', '/bufalos', 'POST'])
  );
});

test('getPending retorna somente operações PENDING', async () => {
  mockQueryAll.mockResolvedValue([{ id: '1', status: 'PENDING', entity: 'bufalos' }]);

  const ops = await pendingOperationsService.getPending();
  expect(ops).toHaveLength(1);
  expect(mockQueryAll).toHaveBeenCalledWith(
    expect.stringContaining("status = 'PENDING'"),
    []
  );
});

test('markSynced remove a operação da tabela', async () => {
  mockExecute.mockResolvedValue(undefined);
  await pendingOperationsService.markSynced('op-id-1');
  expect(mockExecute).toHaveBeenCalledWith(
    'DELETE FROM pending_operations WHERE id = ?',
    ['op-id-1']
  );
});

test('incrementRetry atualiza retryCount e status', async () => {
  mockExecute.mockResolvedValue(undefined);
  await pendingOperationsService.incrementRetry('op-id-2', 2, 'timeout');
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('SET retryCount = ?, status = ?, errorMessage = ?'),
    expect.arrayContaining([3, 'FAILED', 'timeout', 'op-id-2'])
  );
});
```

- [ ] **Step 2: Rodar o teste — deve falhar**

```bash
npx jest --testPathPattern=pendingOperationsService.test --no-coverage
```

Saída esperada: `Cannot find module '../pendingOperationsService'`.

- [ ] **Step 3: Implementar pendingOperationsService.ts**

Criar `src/services/pendingOperationsService.ts`:

```typescript
import uuid from 'react-native-uuid';
import { execute, queryAll } from '../database/db';

export interface PendingOperation {
  id: string;
  entity: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  method: string;
  payload: string;
  status: 'PENDING' | 'FAILED';
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
}

interface EnqueueParams {
  entity: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  method: string;
  payload: string;
}

export const pendingOperationsService = {
  async enqueue(params: EnqueueParams): Promise<void> {
    await execute(
      `INSERT INTO pending_operations
        (id, entity, operation, endpoint, method, payload, status, retryCount, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)`,
      [
        String(uuid.v4()),
        params.entity,
        params.operation,
        params.endpoint,
        params.method,
        params.payload,
        new Date().toISOString(),
      ]
    );
  },

  async getPending(): Promise<PendingOperation[]> {
    return queryAll<PendingOperation>(
      "SELECT * FROM pending_operations WHERE status = 'PENDING' ORDER BY createdAt ASC",
      []
    );
  },

  async markSynced(id: string): Promise<void> {
    await execute('DELETE FROM pending_operations WHERE id = ?', [id]);
  },

  async incrementRetry(id: string, currentCount: number, errorMessage: string): Promise<void> {
    const newCount = currentCount + 1;
    const newStatus = newCount >= 3 ? 'FAILED' : 'PENDING';
    await execute(
      'UPDATE pending_operations SET retryCount = ?, status = ?, errorMessage = ? WHERE id = ?',
      [newCount, newStatus, errorMessage, id]
    );
  },

  async getFailedCount(): Promise<number> {
    const row = await queryAll<{ count: number }>(
      "SELECT COUNT(*) as count FROM pending_operations WHERE status = 'FAILED'",
      []
    );
    return row[0]?.count ?? 0;
  },

  async getPendingCount(): Promise<number> {
    const row = await queryAll<{ count: number }>(
      "SELECT COUNT(*) as count FROM pending_operations WHERE status = 'PENDING'",
      []
    );
    return row[0]?.count ?? 0;
  },
};
```

- [ ] **Step 4: Rodar o teste — deve passar**

```bash
npx jest --testPathPattern=pendingOperationsService.test --no-coverage
```

Saída esperada: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/services/pendingOperationsService.ts src/services/__tests__/pendingOperationsService.test.ts
git commit -m "feat: adiciona pendingOperationsService para fila de escritas offline"
```

---

## Task 4: SyncService

**Files:**
- Create: `src/services/syncService.ts`
- Create: `src/__mocks__/@react-native-community/netinfo.ts`
- Create: `src/services/__tests__/syncService.test.ts`

- [ ] **Step 1: Criar mock do NetInfo**

Criar `__mocks__/@react-native-community/netinfo.ts` (raiz do projeto):

```typescript
let _connected = true;

export const __setConnected = (val: boolean) => { _connected = val; };

const NetInfo = {
  fetch: jest.fn(async () => ({ isConnected: _connected, isInternetReachable: _connected })),
  addEventListener: jest.fn(() => jest.fn()),
};

export default NetInfo;
```

- [ ] **Step 2: Escrever o teste do SyncService**

Criar `src/services/__tests__/syncService.test.ts`:

```typescript
jest.mock('@op-engineering/op-sqlite');
jest.mock('@react-native-community/netinfo');
jest.mock('../../database/db');
jest.mock('../../lib/apiClient');
jest.mock('../pendingOperationsService');

import { queryAll, queryFirst, execute } from '../../database/db';
import { apiFetch } from '../../lib/apiClient';
import { pendingOperationsService } from '../pendingOperationsService';
import { syncService } from '../syncService';
import { __setConnected } from '@react-native-community/netinfo';

const mockQueryAll = queryAll as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockExecute = execute as jest.Mock;
const mockApiFetch = apiFetch as jest.Mock;
const mockGetPending = pendingOperationsService.getPending as jest.Mock;
const mockMarkSynced = pendingOperationsService.markSynced as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  __setConnected(true);
});

test('sync não executa quando offline', async () => {
  __setConnected(false);
  await syncService.sync('prop-id');
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('push envia operações pendentes e marca como synced', async () => {
  mockGetPending.mockResolvedValue([{
    id: 'op-1',
    endpoint: '/bufalos',
    method: 'POST',
    payload: '{"idBufalo":"b1","nome":"Estrela"}',
    entity: 'bufalos',
    retryCount: 0,
  }]);
  mockApiFetch.mockResolvedValue({ idBufalo: 'b1' });
  mockMarkSynced.mockResolvedValue(undefined);
  mockExecute.mockResolvedValue(undefined);

  await (syncService as any).push();

  expect(mockApiFetch).toHaveBeenCalledWith('/bufalos', { method: 'POST', body: expect.any(String) });
  expect(mockMarkSynced).toHaveBeenCalledWith('op-1');
});

test('pull chama /sync endpoint e faz upsert', async () => {
  mockQueryFirst.mockResolvedValue(null); // sem sync_meta
  mockApiFetch.mockResolvedValue({
    data: [{ idBufalo: 'b1', idPropriedade: 'p1', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, brinco: 'A001', _raw: '' }],
    meta: { synced_at: '2026-01-01T00:00:00Z', totalPages: 1 },
  });
  mockExecute.mockResolvedValue(undefined);

  await (syncService as any).pullEntity('bufalos', 'p1');

  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/sync/p1/bufalos'), undefined);
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO bufalos'),
    expect.any(Array)
  );
});
```

- [ ] **Step 3: Rodar o teste — deve falhar**

```bash
npx jest --testPathPattern=syncService.test --no-coverage
```

Saída esperada: `Cannot find module '../syncService'`.

- [ ] **Step 4: Implementar syncService.ts**

Criar `src/services/syncService.ts`:

```typescript
import NetInfo from '@react-native-community/netinfo';
import { apiFetch } from '../lib/apiClient';
import { execute, queryAll, queryFirst } from '../database/db';
import { ENTITY_PK_MAP, SYNC_ENTITY_PATH, getEntityExtras } from '../database/schema';
import { pendingOperationsService } from './pendingOperationsService';

async function isConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable);
}

async function upsertBatch(entity: string, records: any[]): Promise<void> {
  const pk = ENTITY_PK_MAP[entity];

  for (const record of records) {
    if (record.deletedAt) {
      await execute(
        `UPDATE ${entity} SET deletedAt = ?, updatedAt = ? WHERE ${pk} = ?`,
        [record.deletedAt, record.updatedAt, record[pk]]
      );
      continue;
    }

    const extras = getEntityExtras(entity, record);
    const colNames = [pk, 'updatedAt', 'deletedAt', '_synced', '_raw', ...Object.keys(extras)];
    const colVals = [
      record[pk],
      record.updatedAt,
      null,
      1,
      JSON.stringify(record),
      ...Object.values(extras),
    ];
    const placeholders = colVals.map(() => '?').join(', ');
    const updateSet = [
      'updatedAt = excluded.updatedAt',
      '_raw = excluded._raw',
      '_synced = 1',
      ...Object.keys(extras).map(k => `${k} = excluded.${k}`),
    ].join(', ');

    await execute(
      `INSERT INTO ${entity} (${colNames.join(', ')}) VALUES (${placeholders})
       ON CONFLICT(${pk}) DO UPDATE SET ${updateSet}
       WHERE _synced = 1 OR excluded.updatedAt > ${entity}.updatedAt`,
      colVals
    );
  }
}

class SyncService {
  private running = false;

  async sync(propriedadeId: string): Promise<void> {
    if (this.running || !(await isConnected())) return;
    this.running = true;
    try {
      await this.push();
      await this.pull(propriedadeId);
    } finally {
      this.running = false;
    }
  }

  private async push(): Promise<void> {
    const pending = await pendingOperationsService.getPending();
    for (const op of pending) {
      try {
        await apiFetch(op.endpoint, { method: op.method, body: op.payload });
        await pendingOperationsService.markSynced(op.id);
        const pk = ENTITY_PK_MAP[op.entity];
        const localId = JSON.parse(op.payload)[pk];
        if (localId) {
          await execute(`UPDATE ${op.entity} SET _synced = 1 WHERE ${pk} = ?`, [localId]);
        }
      } catch (err: any) {
        await pendingOperationsService.incrementRetry(op.id, op.retryCount, err?.message ?? 'unknown');
      }
    }
  }

  private async pullEntity(entity: string, propriedadeId: string): Promise<void> {
    try {
      const syncPropId = ['racas', 'medicamentos'].includes(entity) ? 'global' : propriedadeId;
      const meta = await queryFirst<{ lastSyncedAt: string | null }>(
        'SELECT lastSyncedAt FROM sync_meta WHERE entity = ? AND propriedadeId = ?',
        [entity, syncPropId]
      );

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const path = SYNC_ENTITY_PATH[entity];
        const qs = new URLSearchParams({ page: String(page), limit: '200' });
        if (meta?.lastSyncedAt) qs.append('updated_at', meta.lastSyncedAt);

        const response = await apiFetch(`/sync/${propriedadeId}/${path}?${qs.toString()}`);

        await upsertBatch(entity, response.data);

        await execute(
          `INSERT OR REPLACE INTO sync_meta (entity, propriedadeId, lastSyncedAt) VALUES (?, ?, ?)`,
          [entity, syncPropId, response.meta.synced_at]
        );

        hasMore = page < (response.meta.totalPages ?? 1);
        page++;
      }
    } catch {
      // falha silenciosa — dados locais continuam disponíveis
    }
  }

  private async pull(propriedadeId: string): Promise<void> {
    const entities = Object.keys(ENTITY_PK_MAP);
    await Promise.allSettled(entities.map(e => this.pullEntity(e, propriedadeId)));
  }
}

export const syncService = new SyncService();
```

- [ ] **Step 5: Rodar o teste — deve passar**

```bash
npx jest --testPathPattern=syncService.test --no-coverage
```

Saída esperada: `3 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/services/syncService.ts src/services/__tests__/syncService.test.ts __mocks__/@react-native-community/
git commit -m "feat: implementa SyncService com push/pull e resolução de conflitos"
```

---

## Task 5: SyncContext e App.tsx

**Files:**
- Create: `src/context/SyncContext.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Criar SyncContext.tsx**

Criar `src/context/SyncContext.tsx`:

```typescript
import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncService } from '../services/syncService';
import { pendingOperationsService } from '../services/pendingOperationsService';
import { usePropriedade } from './PropriedadeContext';

interface SyncContextValue {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  hasFailed: boolean;
  sync: () => void;
}

const SyncContext = createContext<SyncContextValue>({
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  hasFailed: false,
  sync: () => {},
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { propriedadeSelecionada } = usePropriedade();
  const [isSyncing, setIsSyncing]       = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasFailed, setHasFailed]       = useState(false);
  const isSyncingRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    const pending = await pendingOperationsService.getPendingCount();
    const failed  = await pendingOperationsService.getFailedCount();
    setPendingCount(pending);
    setHasFailed(failed > 0);
  }, []);

  const sync = useCallback(async () => {
    if (!propriedadeSelecionada || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      await syncService.sync(propriedadeSelecionada);
      setLastSyncedAt(new Date().toISOString());
      await refreshCounts();
    } catch {
      setHasFailed(true);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [propriedadeSelecionada, refreshCounts]);

  // Gatilho 1 — app volta ao foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') sync(); });
    return () => sub.remove();
  }, [sync]);

  // Gatilho 2 — rede reconectada
  useEffect(() => {
    return NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) sync();
    });
  }, [sync]);

  // Gatilho 3 — intervalo de 5 min em foreground
  useEffect(() => {
    const t = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [sync]);

  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncedAt, pendingCount, hasFailed, sync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncStatus = () => useContext(SyncContext);
```

- [ ] **Step 2: Adicionar SyncProvider, migrations e rota InitialSync no App.tsx**

Abrir `App.tsx`. Localizar a declaração do Stack.Navigator e a estrutura de providers. Aplicar estas mudanças:

**Imports a adicionar no topo:**
```typescript
import { SyncProvider } from './src/context/SyncContext';
import { InitialSyncScreen } from './src/screens/InitialSyncScreen';
import { runMigrations } from './src/database/migrations';
```

**Chamar `runMigrations()` no startup do app** (antes de qualquer navegação, para garantir que usuários recorrentes também recebam atualizações de schema):

```tsx
// No componente raiz App, adicionar useEffect de inicialização:
useEffect(() => {
  runMigrations().catch(console.error);
}, []);
```

**Envolver o conteúdo autenticado com SyncProvider:**
```tsx
// ANTES (dentro do AuthProvider > PropriedadeProvider):
<PropriedadeProvider>
  <Stack.Navigator>
    {/* rotas */}
  </Stack.Navigator>
</PropriedadeProvider>

// DEPOIS:
<PropriedadeProvider>
  <SyncProvider>
    <Stack.Navigator>
      <Stack.Screen name="InitialSync" component={InitialSyncScreen} options={{ headerShown: false }} />
      {/* rotas existentes mantidas */}
    </Stack.Navigator>
  </SyncProvider>
</PropriedadeProvider>
```

- [ ] **Step 3: Verificar que o app ainda compila**

```bash
npx react-native run-android --mode=debug 2>&1 | grep -E "(error|Error|BUILD)" | head -20
```

Saída esperada: sem erros de compilação TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/context/SyncContext.tsx App.tsx
git commit -m "feat: adiciona SyncContext com 4 gatilhos e SyncProvider no App"
```

---

## Task 6: Migrar bufaloService.ts (implementação de referência)

**Files:**
- Modify: `src/services/bufaloService.ts`
- Create: `src/services/__tests__/bufaloService.offline.test.ts`

- [ ] **Step 1: Escrever os testes**

Criar `src/services/__tests__/bufaloService.offline.test.ts`:

```typescript
jest.mock('@op-engineering/op-sqlite');
jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

import { queryAll, queryFirst } from '../../database/db';
import { pendingOperationsService } from '../pendingOperationsService';
import { getBufalos, createBufalo, filtrarBufalos, deleteBufalo } from '../bufaloService';

const mockQueryAll = queryAll as jest.Mock;
const mockEnqueue = pendingOperationsService.enqueue as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('getBufalos lê do SQLite e retorna shape correto', async () => {
  const fakeRow = {
    idBufalo: 'b1', brinco: 'A001', sexo: 'F', _raw: JSON.stringify({
      idBufalo: 'b1', nome: 'Estrela', brinco: 'A001', raca: { nome: 'Murrah' },
    }),
  };
  mockQueryAll
    .mockResolvedValueOnce([fakeRow])           // rows
    .mockResolvedValueOnce([{ count: 1 }]);     // count

  const result = await getBufalos('prop-1');

  expect(result.bufalos[0].racaNome).toBe('Murrah');
  expect(result.meta.total).toBe(1);
});

test('filtrarBufalos filtra por sexo via SQLite', async () => {
  mockQueryAll
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ count: 0 }]);

  await filtrarBufalos('prop-1', { sexo: 'F' });

  expect(mockQueryAll).toHaveBeenCalledWith(
    expect.stringContaining("sexo = ?"),
    expect.arrayContaining(['F', 'prop-1'])
  );
});

test('createBufalo escreve no SQLite e enfileira pending_operation', async () => {
  const { execute } = require('../../database/db');
  (execute as jest.Mock).mockResolvedValue(undefined);
  mockEnqueue.mockResolvedValue(undefined);

  const result = await createBufalo({ idPropriedade: 'prop-1', nome: 'Estrela', brinco: 'A002', sexo: 'F', status: true });

  expect(execute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO bufalos'),
    expect.any(Array)
  );
  expect(mockEnqueue).toHaveBeenCalledWith(
    expect.objectContaining({ entity: 'bufalos', operation: 'CREATE', endpoint: '/bufalos', method: 'POST' })
  );
  expect(result.idBufalo).toBeDefined();
});

test('deleteBufalo soft-deleta no SQLite e enfileira DELETE', async () => {
  const { execute } = require('../../database/db');
  (execute as jest.Mock).mockResolvedValue(undefined);
  mockEnqueue.mockResolvedValue(undefined);

  await deleteBufalo('b1');

  expect(execute).toHaveBeenCalledWith(
    expect.stringContaining("SET deletedAt"),
    expect.arrayContaining(['b1'])
  );
  expect(mockEnqueue).toHaveBeenCalledWith(
    expect.objectContaining({ operation: 'DELETE', method: 'DELETE' })
  );
});
```

- [ ] **Step 2: Rodar — deve falhar (ainda usa apiFetch)**

```bash
npx jest --testPathPattern=bufaloService.offline --no-coverage
```

Saída esperada: testes falham porque `getBufalos` chama `apiFetch`.

- [ ] **Step 3: Substituir bufaloService.ts**

Sobrescrever `src/services/bufaloService.ts` com a versão offline-first:

```typescript
import uuid from 'react-native-uuid';
import { apiFetch } from '../lib/apiClient';
import { execute, queryAll, queryFirst } from '../database/db';
import { pendingOperationsService } from './pendingOperationsService';
import { grupoService, Grupo } from './grupoService';

// ── LEITURAS (SQLite) ────────────────────────────────────────────────────────

export const getBufalos = async (propriedadeId: string, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const rows = await queryAll<any>(
    `SELECT * FROM bufalos
     WHERE idPropriedade = ? AND deletedAt IS NULL
     ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
    [propriedadeId, limit, offset]
  );
  const countRow = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM bufalos WHERE idPropriedade = ? AND deletedAt IS NULL',
    [propriedadeId]
  );
  const total = countRow?.count ?? 0;
  const bufalos = rows.map((r: any) => {
    const raw = JSON.parse(r._raw);
    return { ...raw, racaNome: raw.raca?.nome ?? raw.nomeRaca ?? 'Desconhecida' };
  });
  return { bufalos, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

export const getBufaloDetalhes = async (id: string) => {
  const row = await queryFirst<any>('SELECT _raw FROM bufalos WHERE idBufalo = ?', [id]);
  if (!row) throw new Error(`Búfalo ${id} não encontrado localmente`);
  const raw = JSON.parse(row._raw);
  return {
    ...raw,
    racaNome: raw.nomeRaca ?? raw.raca?.nome ?? 'Desconhecida',
    paiNome: raw.brincoPai ?? raw.materialGeneticoMachoNome ?? 'Desconhecido',
    maeNome: raw.brincoMae ?? raw.materialGeneticoFemeaNome ?? 'Desconhecida',
  };
};

export const filtrarBufalos = async (
  propriedadeId: string,
  filtros: { brinco?: string; sexo?: string; nivel_maturidade?: string; status?: boolean; id_raca?: string },
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const conditions: string[] = ['idPropriedade = ?', 'deletedAt IS NULL'];
  const params: any[] = [propriedadeId];

  if (filtros?.brinco)           { conditions.push('brinco LIKE ?');         params.push(`%${filtros.brinco}%`); }
  if (filtros?.sexo)             { conditions.push('sexo = ?');              params.push(filtros.sexo); }
  if (filtros?.nivel_maturidade) { conditions.push('nivelMaturidade = ?');   params.push(filtros.nivel_maturidade); }
  if (filtros?.status !== undefined) { conditions.push('status = ?');        params.push(String(filtros.status)); }
  if (filtros?.id_raca)          { conditions.push('idRaca = ?');            params.push(filtros.id_raca); }

  const where = conditions.join(' AND ');
  const rows = await queryAll<any>(
    `SELECT * FROM bufalos WHERE ${where} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const countRow = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM bufalos WHERE ${where}`,
    params
  );
  const total = countRow?.count ?? 0;
  const bufalos = rows.map((r: any) => {
    const raw = JSON.parse(r._raw);
    return { ...raw, racaNome: raw.raca?.nome ?? raw.nomeRaca ?? 'Desconhecida' };
  });
  return { bufalos, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

export const getRacas = async () => {
  const rows = await queryAll<any>('SELECT _raw FROM racas WHERE deletedAt IS NULL');
  if (rows.length > 0) return rows.map((r: any) => JSON.parse(r._raw));
  // fallback online se tabela vazia (antes do primeiro sync)
  return apiFetch('/racas');
};

export const getBufaloPorMicrochip = async (microchip: string) => {
  const row = await queryFirst<any>(
    'SELECT _raw FROM bufalos WHERE microchip = ? AND deletedAt IS NULL',
    [microchip]
  );
  if (row) return JSON.parse(row._raw);
  // fallback online se não encontrado localmente
  return apiFetch(`/bufalos/microchip/${microchip}`);
};

export const getBufaloByBrincoAndSexo = async (propriedadeId: string, brinco: string, sexo: 'M' | 'F') => {
  const row = await queryFirst<any>(
    'SELECT _raw FROM bufalos WHERE idPropriedade = ? AND brinco = ? AND sexo = ? AND deletedAt IS NULL',
    [propriedadeId, brinco, sexo]
  );
  return row ? JSON.parse(row._raw) : null;
};

export const getGrupos = async (idPropriedade: string): Promise<Grupo[]> => {
  return grupoService.getAllByPropriedade(idPropriedade);
};

// ── ESCRITAS (SQLite + pending_operations) ───────────────────────────────────

export const createBufalo = async (data: any) => {
  const id = String(uuid.v4());
  const now = new Date().toISOString();
  const record = { ...data, idBufalo: id, createdAt: now, updatedAt: now, deletedAt: null };

  await execute(
    `INSERT INTO bufalos (idBufalo, idPropriedade, brinco, sexo, status, nivelMaturidade, idRaca, microchip, updatedAt, deletedAt, _synced, _raw)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?)`,
    [id, data.idPropriedade, data.brinco ?? null, data.sexo ?? null, data.status ?? null,
     data.nivelMaturidade ?? null, data.idRaca ?? null, data.microchip ?? null, now, JSON.stringify(record)]
  );

  await pendingOperationsService.enqueue({
    entity: 'bufalos', operation: 'CREATE',
    endpoint: '/bufalos', method: 'POST',
    payload: JSON.stringify(record),
  });

  return record;
};

export const updateBufalo = async (id: string, data: any) => {
  const now = new Date().toISOString();
  const existing = await queryFirst<any>('SELECT _raw FROM bufalos WHERE idBufalo = ?', [id]);
  const merged = { ...(existing ? JSON.parse(existing._raw) : {}), ...data, updatedAt: now };

  await execute(
    `UPDATE bufalos SET brinco = ?, sexo = ?, status = ?, nivelMaturidade = ?, idRaca = ?,
      updatedAt = ?, _synced = 0, _raw = ? WHERE idBufalo = ?`,
    [merged.brinco ?? null, merged.sexo ?? null, merged.status ?? null,
     merged.nivelMaturidade ?? null, merged.idRaca ?? null, now, JSON.stringify(merged), id]
  );

  await pendingOperationsService.enqueue({
    entity: 'bufalos', operation: 'UPDATE',
    endpoint: `/bufalos/${id}`, method: 'PATCH',
    payload: JSON.stringify(data),
  });

  return merged;
};

export const deleteBufalo = async (id: string) => {
  const now = new Date().toISOString();
  await execute(
    'UPDATE bufalos SET deletedAt = ?, updatedAt = ?, _synced = 0 WHERE idBufalo = ?',
    [now, now, id]
  );
  await pendingOperationsService.enqueue({
    entity: 'bufalos', operation: 'DELETE',
    endpoint: `/bufalos/${id}`, method: 'DELETE',
    payload: JSON.stringify({ idBufalo: id }),
  });
  return true;
};

export const moverBufaloDeGrupo = async (idBufalo: string, idNovoGrupo: string) => {
  const payload = { idsBufalos: [idBufalo], idNovoGrupo, motivo: 'Mudança manual de grupo via tela de animal' };
  await pendingOperationsService.enqueue({
    entity: 'bufalos', operation: 'UPDATE',
    endpoint: '/bufalos/grupo/mover', method: 'PATCH',
    payload: JSON.stringify(payload),
  });
};

export default {
  getBufalos, getBufaloDetalhes, createBufalo, updateBufalo, deleteBufalo,
  getRacas, filtrarBufalos, getBufaloPorMicrochip, getBufaloByBrincoAndSexo,
  getGrupos, moverBufaloDeGrupo,
};
```

- [ ] **Step 4: Rodar os testes — devem passar**

```bash
npx jest --testPathPattern=bufaloService.offline --no-coverage
```

Saída esperada: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/services/bufaloService.ts src/services/__tests__/bufaloService.offline.test.ts
git commit -m "feat: migra bufaloService para offline-first (SQLite + pending_operations)"
```

---

## Task 7: Migrar lactacaoService.ts

**Files:**
- Modify: `src/services/lactacaoService.ts`

- [ ] **Step 1: Substituir getCiclosLactacao por leitura do SQLite**

Em `src/services/lactacaoService.ts`, substituir a função `getCiclosLactacao`:

```typescript
import { execute, queryAll, queryFirst } from '../database/db';
import { pendingOperationsService } from './pendingOperationsService';
// manter imports existentes (apiFetch, formatarDataBR, interfaces)

export const getCiclosLactacao = async (propriedadeId: string, page = 1, limit = 10) => {
  if (!propriedadeId) return { ciclos: [], meta: { page: 1, totalPages: 1, totalItems: 0 } };
  const offset = (page - 1) * limit;
  const rows = await queryAll<any>(
    `SELECT _raw FROM ciclos_lactacao
     WHERE idPropriedade = ? AND deletedAt IS NULL
     ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
    [propriedadeId, limit, offset]
  );
  const countRow = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM ciclos_lactacao WHERE idPropriedade = ? AND deletedAt IS NULL',
    [propriedadeId]
  );
  const total = countRow?.count ?? 0;
  const ciclos = rows.map((r: any) => {
    const c = JSON.parse(r._raw);
    return {
      idCicloLactacao: c.idCicloLactacao,
      idBufala: c.idBufala,
      cicloAtual: c.cicloAtual,
      nome: c.bufala?.nome ?? 'Não informado',
      brinco: c.bufala?.brinco ?? '-',
      status: c.status,
      raca: c.bufala?.raca ?? 'Não informado',
      diasEmLactacao: c.diasEmLactacao,
      dtSecagemPrevista: c.dtSecagemPrevista ? formatarDataBR(c.dtSecagemPrevista) : '—',
    };
  });
  return { ciclos, meta: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) || 1 } };
};
```

- [ ] **Step 2: Migrar escritas para pending_operations**

Substituir `registrarLactacaoApi`, `registrarColetaApi`, `registrarEstoqueApi` e `encerrarLactacao`:

```typescript
export const registrarLactacaoApi = async (payload: LactacaoRegistroPayload) => {
  await pendingOperationsService.enqueue({
    entity: 'ciclos_lactacao', operation: 'CREATE',
    endpoint: '/ordenhas', method: 'POST',
    payload: JSON.stringify(payload),
  });
};

export const registrarColetaApi = async (payload: ColetaRegistroPayload) => {
  await pendingOperationsService.enqueue({
    entity: 'ciclos_lactacao', operation: 'CREATE',
    endpoint: '/retiradas', method: 'POST',
    payload: JSON.stringify(payload),
  });
};

export const registrarEstoqueApi = async (payload: EstoqueRegistroPayload) => {
  await pendingOperationsService.enqueue({
    entity: 'ciclos_lactacao', operation: 'CREATE',
    endpoint: '/producao-diaria', method: 'POST',
    payload: JSON.stringify(payload),
  });
};

export const encerrarLactacao = async (idCiclo: string | number) => {
  if (!idCiclo) throw new Error('ID do ciclo é obrigatório.');
  const hoje = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  await execute(
    "UPDATE ciclos_lactacao SET status = 'SECO', updatedAt = ?, _synced = 0 WHERE idCicloLactacao = ?",
    [now, String(idCiclo)]
  );
  await pendingOperationsService.enqueue({
    entity: 'ciclos_lactacao', operation: 'UPDATE',
    endpoint: `/lactacao/${idCiclo}`, method: 'PATCH',
    payload: JSON.stringify({ dt_secagem_real: hoje, observacao: 'Seca' }),
  });
};
```

- [ ] **Step 3: Manter getEstatisticasLactacao e getProducaoDiariaAtual como chamadas online**

Estas funções chamam endpoints que não têm equivalente no `/sync`. Mantê-las chamando `apiFetch` diretamente — são dados computados em tempo real.

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "lactacaoService"
```

Saída esperada: sem erros relacionados a `lactacaoService`.

- [ ] **Step 5: Commit**

```bash
git add src/services/lactacaoService.ts
git commit -m "feat: migra lactacaoService para offline-first"
```

---

## Task 8: Migrar sanitarioService.ts

**Files:**
- Modify: `src/services/sanitarioService.ts`

- [ ] **Step 1: Substituir sanitarioService com versão offline-first**

Sobrescrever `src/services/sanitarioService.ts`:

```typescript
import uuid from 'react-native-uuid';
import { apiFetch } from '../lib/apiClient';
import { execute, queryAll, queryFirst } from '../database/db';
import { pendingOperationsService } from './pendingOperationsService';
import { sanitarioToApiAdapter } from './adapters/bufaloAdapter';

export interface Medicacao {
  id_medicacao: string;
  medicacao: string;
  descricao: string;
  tipo_tratamento: string;
}

export const sanitarioService = {
  add: async (payload: any) => {
    const id = String(uuid.v4());
    const now = new Date().toISOString();
    const record = { ...payload, idDadoSanitario: id, createdAt: now, updatedAt: now };

    await execute(
      `INSERT INTO dados_sanitarios (idDadoSanitario, idPropriedade, idBufalo, updatedAt, deletedAt, _synced, _raw)
       VALUES (?, ?, ?, ?, NULL, 0, ?)`,
      [id, payload.idPropriedade ?? null, payload.idBufalo ?? null, now, JSON.stringify(record)]
    );
    await pendingOperationsService.enqueue({
      entity: 'dados_sanitarios', operation: 'CREATE',
      endpoint: '/dados-sanitarios', method: 'POST',
      payload: JSON.stringify(payload),
    });
    return record;
  },

  getHistorico: async (id_bufalo: string, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const rows = await queryAll<any>(
      `SELECT _raw FROM dados_sanitarios
       WHERE idBufalo = ? AND deletedAt IS NULL
       ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
      [id_bufalo, limit, offset]
    );
    const countRow = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM dados_sanitarios WHERE idBufalo = ? AND deletedAt IS NULL',
      [id_bufalo]
    );
    const data = rows.map((r: any) => {
      const reg = JSON.parse(r._raw);
      return {
        ...reg,
        nome_medicamento: reg.medicacoe?.medicacao ?? 'Medicamento Desconhecido',
        tipo_tratamento:  reg.medicacoe?.tipoTratamento ?? '-',
      };
    });
    return { data, meta: { page, limit, total: countRow?.count ?? 0 } };
  },

  getMedicamentos: async () => {
    const rows = await queryAll<any>('SELECT _raw FROM medicamentos WHERE deletedAt IS NULL');
    if (rows.length > 0) return rows.map((r: any) => JSON.parse(r._raw));
    return apiFetch('/medicamentos');
  },

  getMedicamentosByPropriedade: async (idPropriedade: string): Promise<Medicacao[]> => {
    const rows = await queryAll<any>(
      'SELECT _raw FROM medicamentos WHERE deletedAt IS NULL'
    );
    if (rows.length > 0) {
      return rows.map((r: any) => {
        const item = JSON.parse(r._raw);
        return {
          id_medicacao:    item.idMedicamento ?? item.id_medicamento,
          medicacao:       item.medicacao,
          tipo_tratamento: item.tipoTratamento ?? item.tipo_tratamento,
          descricao:       item.descricao,
        };
      });
    }
    // fallback online
    const response = await apiFetch(`/medicamentos/propriedade/${idPropriedade}`);
    if (!Array.isArray(response)) return [];
    return response.map((item: any) => ({
      id_medicacao: item.idMedicacao, medicacao: item.medicacao,
      tipo_tratamento: item.tipoTratamento, descricao: item.descricao,
    }));
  },

  delete: async (id_sanit: string) => {
    const now = new Date().toISOString();
    await execute(
      'UPDATE dados_sanitarios SET deletedAt = ?, updatedAt = ?, _synced = 0 WHERE idDadoSanitario = ?',
      [now, now, id_sanit]
    );
    await pendingOperationsService.enqueue({
      entity: 'dados_sanitarios', operation: 'DELETE',
      endpoint: `/dados-sanitarios/${id_sanit}`, method: 'DELETE',
      payload: JSON.stringify({ idDadoSanitario: id_sanit }),
    });
  },

  update: async (id_sanit: string, payload: any) => {
    const now = new Date().toISOString();
    const existing = await queryFirst<any>(
      'SELECT _raw FROM dados_sanitarios WHERE idDadoSanitario = ?', [id_sanit]
    );
    const merged = { ...(existing ? JSON.parse(existing._raw) : {}), ...payload, updatedAt: now };
    await execute(
      'UPDATE dados_sanitarios SET updatedAt = ?, _synced = 0, _raw = ? WHERE idDadoSanitario = ?',
      [now, JSON.stringify(merged), id_sanit]
    );
    await pendingOperationsService.enqueue({
      entity: 'dados_sanitarios', operation: 'UPDATE',
      endpoint: `/dados-sanitarios/${id_sanit}`, method: 'PATCH',
      payload: JSON.stringify(sanitarioToApiAdapter(payload)),
    });
    return merged;
  },
};

export default sanitarioService;
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "sanitarioService"
```

Saída esperada: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/services/sanitarioService.ts
git commit -m "feat: migra sanitarioService para offline-first"
```

---

## Task 9: Migrar serviços restantes

**Files:**
- Modify: `src/services/reproducaoService.ts`
- Modify: `src/services/zootecnicoService.ts`
- Modify: `src/services/grupoService.ts`
- Modify: `src/services/alertaService.ts`

Para cada serviço, aplicar o mesmo padrão das Tasks 6–8:
1. Leituras (`GET`) → `queryAll`/`queryFirst` na tabela SQLite correspondente, parse do `_raw`
2. Escritas (`POST`/`PATCH`/`DELETE`) → `execute` local + `pendingOperationsService.enqueue`
3. Funções de estatísticas/dashboard → manter como `apiFetch` (dados computados, sem tabela de sync)

- [ ] **Step 1: Migrar reproducaoService.ts**

Ler o arquivo `src/services/reproducaoService.ts`. Para cada função:
- Funções GET que listam coberturas por propriedade → query `SELECT * FROM coberturas WHERE idPropriedade = ? AND deletedAt IS NULL ORDER BY updatedAt DESC LIMIT ? OFFSET ?`
- Funções de estatísticas/dashboard → manter `apiFetch`
- Escritas (POST/PATCH) → `execute` na tabela `coberturas` + `pendingOperationsService.enqueue` com o endpoint e método corretos

Adicionar no topo do arquivo:
```typescript
import uuid from 'react-native-uuid';
import { execute, queryAll, queryFirst } from '../database/db';
import { pendingOperationsService } from './pendingOperationsService';
```

- [ ] **Step 2: Migrar zootecnicoService.ts**

Ler o arquivo `src/services/zootecnicoService.ts`. Para cada função:
- GET por búfalo → `SELECT _raw FROM dados_zootecnicos WHERE idBufalo = ? AND deletedAt IS NULL ORDER BY updatedAt DESC LIMIT ? OFFSET ?`
- POST → `execute` INSERT em `dados_zootecnicos` + enqueue para `/dados-zootecnicos`
- PATCH → `execute` UPDATE + enqueue para `/dados-zootecnicos/:id`
- DELETE → soft delete (`SET deletedAt = ?`) + enqueue

- [ ] **Step 3: Migrar grupoService.ts**

Ler o arquivo `src/services/grupoService.ts`. Para cada função:
- `getAllByPropriedade` → `SELECT _raw FROM grupos WHERE idPropriedade = ? AND deletedAt IS NULL`
- Escritas → `execute` em `grupos` + enqueue para endpoints `/grupos`

- [ ] **Step 4: Migrar alertaService.ts**

Ler o arquivo `src/services/alertaService.ts`. Para cada função:
- GET de alertas por propriedade → `SELECT _raw FROM alertas WHERE idPropriedade = ? AND deletedAt IS NULL ORDER BY updatedAt DESC`
- Marcar como lido → `execute UPDATE alertas SET lido = 1` + enqueue PATCH

- [ ] **Step 5: Verificar TypeScript em todos**

```bash
npx tsc --noEmit 2>&1 | grep -E "(reproducao|zootecnico|grupo|alerta)Service"
```

Saída esperada: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/services/reproducaoService.ts src/services/zootecnicoService.ts src/services/grupoService.ts src/services/alertaService.ts
git commit -m "feat: migra reproducao, zootecnico, grupo e alerta para offline-first"
```

---

## Task 10: InitialSyncScreen

**Files:**
- Create: `src/screens/InitialSyncScreen.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Criar InitialSyncScreen.tsx**

Criar `src/screens/InitialSyncScreen.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { syncService } from '../services/syncService';
import { runMigrations } from '../database/migrations';
import { isFirstSync } from '../database/db';
import { usePropriedade } from '../context/PropriedadeContext';

export const InitialSyncScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { propriedadeSelecionada } = usePropriedade();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const doSync = async () => {
    setError(false);
    setLoading(true);
    try {
      await runMigrations();
      const first = await isFirstSync();
      if (first && propriedadeSelecionada) {
        await syncService.sync(propriedadeSelecionada);
      }
      navigation.replace('MainTab');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { doSync(); }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.text}>Sincronizando dados iniciais...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>Não foi possível sincronizar.</Text>
      <Text style={styles.subText}>Verifique sua conexão e tente novamente.</Text>
      <TouchableOpacity style={styles.btn} onPress={doSync}>
        <Text style={styles.btnText}>Tentar novamente</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.replace('MainTab')}>
        <Text style={styles.offlineText}>Continuar offline (sem dados)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  text:      { marginTop: 16, fontSize: 16, color: '#555' },
  errorText: { fontSize: 18, fontWeight: 'bold', color: '#E53935' },
  subText:   { marginTop: 8, color: '#777', textAlign: 'center' },
  btn:       { marginTop: 24, backgroundColor: '#4CAF50', borderRadius: 8, padding: 14, minWidth: 200, alignItems: 'center' },
  btnText:   { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  offlineText: { marginTop: 16, color: '#999', fontSize: 13, textDecorationLine: 'underline' },
});
```

- [ ] **Step 2: Conectar o InitialSync ao fluxo de autenticação em App.tsx**

Em `App.tsx`, localizar onde o usuário autenticado é redirecionado após o login. Adicionar lógica para verificar `isFirstSync()` e navegar para `InitialSync` antes de `MainTab`:

```typescript
// No AuthContext ou onde o navigation acontece após login:
// Substituir navigation.navigate('MainTab') por:
const first = await isFirstSync();
navigation.replace(first ? 'InitialSync' : 'MainTab');
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "InitialSync"
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/InitialSyncScreen.tsx App.tsx
git commit -m "feat: adiciona InitialSyncScreen com fallback offline"
```

---

## Task 11: SyncStatusBanner

**Files:**
- Create: `src/components/SyncStatusBanner.tsx`

- [ ] **Step 1: Criar o componente de status**

Criar `src/components/SyncStatusBanner.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSyncStatus } from '../context/SyncContext';

export const SyncStatusBanner: React.FC = () => {
  const { isSyncing, pendingCount, hasFailed, sync, lastSyncedAt } = useSyncStatus();

  if (!hasFailed && pendingCount === 0) return null;

  if (hasFailed) {
    return (
      <TouchableOpacity style={[styles.banner, styles.error]} onPress={sync}>
        <Text style={styles.text}>
          ⚠ {pendingCount} alteração{pendingCount !== 1 ? 'ões' : ''} não enviada{pendingCount !== 1 ? 's' : ''} — toque para tentar novamente
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.banner, styles.pending]}>
      <Text style={styles.text}>
        {isSyncing ? '↑ Sincronizando...' : `↑ ${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner:  { paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' },
  error:   { backgroundColor: '#FFEBEE' },
  pending: { backgroundColor: '#E8F5E9' },
  text:    { fontSize: 13, color: '#333' },
});
```

- [ ] **Step 2: Adicionar SyncStatusBanner no MainLayout**

Abrir `src/layouts/MainLayout.tsx` (ou o componente wrapper das telas principais). Adicionar o banner logo abaixo do header:

```tsx
import { SyncStatusBanner } from '../components/SyncStatusBanner';

// Dentro do JSX do layout, após o header:
<SyncStatusBanner />
```

- [ ] **Step 3: Substituir RefreshControl nas telas por useSyncStatus**

Em telas que já têm `<RefreshControl>`, substituir a função de refresh pelo `sync` do context:

```tsx
// ANTES
const [refreshing, setRefreshing] = useState(false);
const onRefresh = async () => { setRefreshing(true); await fetchDados(); setRefreshing(false); };

// DEPOIS
const { isSyncing, sync } = useSyncStatus();
// onRefresh = sync (já dispara pull que atualiza SQLite; tela relê via useEffect)
<RefreshControl refreshing={isSyncing} onRefresh={sync} />
```

- [ ] **Step 4: Commit final**

```bash
git add src/components/SyncStatusBanner.tsx src/layouts/
git commit -m "feat: adiciona SyncStatusBanner e conecta RefreshControl ao sync global"
```

---

## Checklist de Verificação Final

- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm test` — todos os testes passando
- [ ] App sobe em Android sem crash
- [ ] Primeiro sync baixa dados e navega para MainTab
- [ ] Sem internet: telas exibem dados do SQLite
- [ ] Criar um búfalo offline aparece imediatamente na lista
- [ ] Ao reconectar: SyncStatusBanner some e dados sobem para a API
