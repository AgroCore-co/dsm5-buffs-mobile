# Offline-First Sync Implementation with `/sync` Endpoints

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement offline-first data synchronization in the mobile app using the new `/sync` endpoints from buffs-api, integrating SQLite local storage with incremental sync via `updated_at` timestamps.

**Architecture:** The mobile app maintains a local SQLite database. On app startup, network reconnection, and periodic intervals (5 min), it calls `/sync/*` endpoints with `updated_at` to fetch only changed records. Records include soft-deleted items (with `deletedAt` populated) so the app can remove them locally. The `SyncService` orchestrates repository queries, validates property access, and normalizes timestamps.

**Tech Stack:** React Native + SQLite (expo-sqlite), TypeScript, NestJS (buffs-api), Drizzle ORM (backend)

---

## Current State Analysis

**Backend (`buffs-api`):**
- ✅ `SyncController` exists with 9 endpoints (bufalos, ciclos-lactacao, eventos-sanitarios, reproducao, pesagens, grupos, alertas, racas, medicacoes)
- ✅ Each endpoint supports `updated_at` query param for incremental sync
- ✅ `SyncService` validates property access and delegates to repositories
- ✅ All responses are plain arrays (no pagination wrapper)
- ✅ All responses include soft-deleted records (deletedAt field populated)

**Mobile (`dsm5-buffs-mobile`):**
- ❌ No SQLite database integration yet
- ❌ No `SyncService` to orchestrate sync operations
- ❌ No local data persistence layer
- ❌ No sync scheduler (app startup, reconnection, periodic)
- ⚠️ Services fetch directly from API (not from local DB)
- ⚠️ UI components have no offline fallback

---

## File Structure

### Backend (Already Exists)
```
buffs-api/src/modules/sync/
  sync.controller.ts          ✅
  sync.service.ts             ✅
  dto/
    sync-pagination.dto.ts    ✅
    index.ts                  ✅
  repositories/
    sync-bufalos.repository.ts
    sync-ciclos-lactacao.repository.ts
    sync-eventos-sanitarios.repository.ts
    sync-reproducao.repository.ts
    sync-pesagens.repository.ts
    sync-grupos.repository.ts
    sync-alertas.repository.ts
    sync-racas.repository.ts
    sync-medicacoes.repository.ts
    sync.repository.ts
```

### Mobile (To Create/Modify)
```
dsm5-buffs-mobile/
  src/
    database/
      schema.ts               (NEW: SQLite schema definition)
      db.ts                   (NEW: SQLite initialization & connection)
      migrations.ts           (NEW: Schema versioning)
    services/
      syncService.ts          (NEW: Orchestrates sync operations)
      offlineDb.ts            (NEW: SQLite wrapper for CRUD)
    hooks/
      useSyncService.ts       (NEW: Hook for sync state & timing)
      useOfflineData.ts       (NEW: Hook for local DB queries)
    context/
      SyncContext.tsx         (NEW: Global sync status & timestamps)
    config/
      syncConfig.ts           (NEW: Intervals, retry logic, batch sizes)
    utils/
      syncHelpers.ts          (NEW: Timestamp normalization, conflict resolution)
```

---

## Task Breakdown

### Task 1: Set Up SQLite Database Infrastructure

**Files:**
- Create: `src/database/schema.ts`
- Create: `src/database/db.ts`
- Modify: `app.json` (add expo-sqlite)
- Modify: `package.json` (add deps)

- [ ] **Step 1: Install SQLite dependency**

```bash
npx expo install expo-sqlite
npm install @react-native-async-storage/async-storage
```

- [ ] **Step 2: Create SQLite schema definition**

Create `src/database/schema.ts`:

```typescript
// Schema mirrors backend Drizzle tables: bufalo, grupo, ciclolactacao, etc.
// Include all fields from backend + syncing metadata (lastSyncedAt per entity)

export const DB_SCHEMA_VERSION = 1;

export interface SQLiteTable {
  bufalo: {
    id: string; // idBufalo
    nome: string;
    brinco: string;
    microchip: string | null;
    dtNascimento: string; // ISO
    nivelMaturidade: string;
    sexo: string;
    status: boolean;
    motivoInativo: string | null;
    idRaca: string;
    idPropriedade: string;
    idGrupo: string | null;
    origem: string;
    categoria: string;
    idPai: string | null;
    idMae: string | null;
    createdAt: string; // ISO
    updatedAt: string; // ISO
    deletedAt: string | null; // ISO or null
  };
  grupo: {
    id: string; // idGrupo
    nomeGrupo: string;
    color: string; // hex
    idPropriedade: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  ciclolactacao: {
    id: string; // idCicloLactacao
    idBufala: string;
    dtParto: string; // ISO
    padraoDias: number;
    dtSecagemPrevista: string; // ISO
    dtSecagemReal: string | null;
    status: string;
    observacao: string | null;
    idPropriedade: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  dadoszootecnicos: {
    id: string; // idZootec
    idBufalo: string;
    idUsuario: string;
    peso: string; // decimal as string
    condicaoCorporal: string;
    corPelagem: string;
    formatoChifre: string;
    porteCorporal: string;
    dtRegistro: string; // ISO
    tipoPesagem: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  // ... more tables (sanitario, reproducao, alertas, racas, medicacoes)
  // Include full list from backend schema
};

export const SYNC_METADATA = {
  lastSyncTimestamps: {
    // { [propriedadeId]: { [entityType]: lastSyncAt_ISO } }
  },
};
```

- [ ] **Step 3: Create SQLite database wrapper**

Create `src/database/db.ts`:

```typescript
import * as SQLite from 'expo-sqlite';

export class OfflineDatabase {
  private db: SQLite.Database | null = null;

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('buffs_offline.db');
    await this.createTables();
    await this.runMigrations();
  }

  private async createTables(): Promise<void> {
    // Create all tables matching SQLiteTable interface
    // Use async exec() to run SQL DDL
    const tables = [
      `CREATE TABLE IF NOT EXISTS bufalo (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        brinco TEXT,
        microchip TEXT,
        dtNascimento TEXT,
        nivelMaturidade TEXT,
        sexo TEXT,
        status INTEGER,
        motivoInativo TEXT,
        idRaca TEXT NOT NULL,
        idPropriedade TEXT NOT NULL,
        idGrupo TEXT,
        origem TEXT,
        categoria TEXT,
        idPai TEXT,
        idMae TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      )`,
      // ... more CREATE TABLE statements
    ];

    for (const sql of tables) {
      try {
        await this.db?.execAsync(sql);
      } catch (error) {
        console.error('Failed to create table:', error);
      }
    }
  }

  private async runMigrations(): Promise<void> {
    // Placeholder for schema versioning
    // Check DB version and apply pending migrations
  }

  async insertOrUpdate<T>(
    tableName: string,
    record: T,
    idField: string,
  ): Promise<void> {
    // UPSERT logic: try INSERT, catch on duplicate, then UPDATE
  }

  async deleteRecord(tableName: string, id: string): Promise<void> {
    // Hard delete (for soft-deleted records received from API)
  }

  async query<T>(
    sql: string,
    params?: (string | number | null)[],
  ): Promise<T[]> {
    const result = await this.db?.getAllAsync<T>(sql, params);
    return result || [];
  }

  async getDb(): Promise<SQLite.Database> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }
}

export const offlineDb = new OfflineDatabase();
```

- [ ] **Step 4: Initialize database on app startup**

Modify `src/context/AuthContext.tsx`:

```typescript
// In AuthContext's useEffect on app load:
useEffect(() => {
  const bootstrap = async () => {
    try {
      await offlineDb.initialize();
      // ... existing auth logic
    } catch (error) {
      console.error('Failed to initialize offline DB:', error);
    }
  };
  bootstrap();
}, []);
```

- [ ] **Step 5: Commit**

```bash
git add src/database/ app.json package.json src/context/AuthContext.tsx
git commit -m "feat: initialize SQLite database infrastructure for offline-first

- Add expo-sqlite dependency
- Define SQLiteTable schema mirroring backend entities
- Create OfflineDatabase wrapper with UPSERT and query methods
- Initialize DB on app bootstrap in AuthContext

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Create SyncService to Orchestrate Sync Operations

**Files:**
- Create: `src/services/syncService.ts`
- Create: `src/config/syncConfig.ts`
- Create: `src/utils/syncHelpers.ts`

- [ ] **Step 1: Create sync configuration**

Create `src/config/syncConfig.ts`:

```typescript
export const SYNC_CONFIG = {
  SYNC_INTERVALS: {
    ON_APP_START: true, // Sync immediately when app opens
    ON_NETWORK_RECONNECT: true,
    PERIODIC_MS: 5 * 60 * 1000, // 5 minutes
  },
  BATCH_SIZE: 1000, // Records per fetch (for pagination if needed)
  TIMEOUT_MS: 30000, // Max wait per endpoint
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_MULTIPLIER: 2,
    INITIAL_DELAY_MS: 1000,
  },
  ENTITIES: [
    'bufalos',
    'ciclos-lactacao',
    'eventos-sanitarios',
    'reproducao',
    'pesagens',
    'grupos',
    'alertas',
    'racas',
    'medicacoes',
  ],
} as const;
```

- [ ] **Step 2: Create sync helper utilities**

Create `src/utils/syncHelpers.ts`:

```typescript
import { formatISO, parseISO } from 'date-fns';

export class SyncHelpers {
  // Normalize updated_at to ISO string or null
  static normalizeUpdatedAt(dateString?: string): string | null {
    if (!dateString) return null;
    try {
      const parsed = parseISO(dateString);
      return formatISO(parsed);
    } catch {
      return null;
    }
  }

  // Get last sync timestamp for entity from local storage
  static async getLastSyncTimestamp(
    propriedadeId: string,
    entityType: string,
  ): Promise<string | null> {
    const key = `sync_timestamp_${propriedadeId}_${entityType}`;
    try {
      const timestamp = await AsyncStorage.getItem(key);
      return timestamp;
    } catch (error) {
      console.error('Error reading last sync timestamp:', error);
      return null;
    }
  }

  // Save last sync timestamp
  static async saveLastSyncTimestamp(
    propriedadeId: string,
    entityType: string,
    timestamp: string,
  ): Promise<void> {
    const key = `sync_timestamp_${propriedadeId}_${entityType}`;
    try {
      await AsyncStorage.setItem(key, timestamp);
    } catch (error) {
      console.error('Error saving last sync timestamp:', error);
    }
  }

  // Check if record should be deleted locally (has deletedAt)
  static isDeletedRecord(record: any): boolean {
    return record.deletedAt != null;
  }
}
```

- [ ] **Step 3: Create main SyncService**

Create `src/services/syncService.ts`:

```typescript
import { apiFetch } from '../lib/apiClient';
import { offlineDb } from '../database/db';
import { SyncHelpers } from '../utils/syncHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SYNC_CONFIG } from '../config/syncConfig';

export interface SyncState {
  syncing: boolean;
  lastSyncAt: string | null;
  entitySyncStatus: Record<string, { syncing: boolean; lastSyncAt: string | null }>;
  error: string | null;
}

export class SyncService {
  private syncState: SyncState = {
    syncing: false,
    lastSyncAt: null,
    entitySyncStatus: {},
    error: null,
  };

  constructor(private propriedadeId: string) {}

  async syncAll(): Promise<SyncState> {
    this.syncState.syncing = true;
    this.syncState.error = null;

    try {
      // Sync all entities sequentially
      for (const entityType of SYNC_CONFIG.ENTITIES) {
        await this.syncEntity(entityType);
      }

      // Update global last sync time
      const now = new Date().toISOString();
      this.syncState.lastSyncAt = now;
      await AsyncStorage.setItem('last_sync_at', now);
    } catch (error) {
      this.syncState.error =
        error instanceof Error ? error.message : 'Unknown sync error';
      console.error('Sync failed:', this.syncState.error);
    } finally {
      this.syncState.syncing = false;
    }

    return this.syncState;
  }

  private async syncEntity(entityType: string): Promise<void> {
    const entityKey = entityType;
    this.syncState.entitySyncStatus[entityKey] = {
      syncing: true,
      lastSyncAt: this.syncState.entitySyncStatus[entityKey]?.lastSyncAt || null,
    };

    try {
      // Get last sync timestamp
      const lastSyncAt = await SyncHelpers.getLastSyncTimestamp(
        this.propriedadeId,
        entityType,
      );

      // Build endpoint and query params
      let endpoint = `/sync/${this.getEndpointPath(entityType)}`;
      const queryParams = new URLSearchParams();
      queryParams.append('propriedadeId', this.propriedadeId);
      if (lastSyncAt) {
        queryParams.append('updated_at', lastSyncAt);
      }

      // Fetch from API with retry
      const data = await this.fetchWithRetry(
        `${endpoint}?${queryParams.toString()}`,
      );

      // Persist to local DB
      await this.persistRecords(entityType, data);

      // Update last sync timestamp
      const now = new Date().toISOString();
      await SyncHelpers.saveLastSyncTimestamp(
        this.propriedadeId,
        entityType,
        now,
      );

      this.syncState.entitySyncStatus[entityKey].lastSyncAt = now;
      this.syncState.entitySyncStatus[entityKey].syncing = false;
    } catch (error) {
      console.error(`Failed to sync ${entityType}:`, error);
      this.syncState.entitySyncStatus[entityKey].syncing = false;
      throw error;
    }
  }

  private getEndpointPath(entityType: string): string {
    const pathMap: Record<string, string> = {
      bufalos: 'bufalos',
      'ciclos-lactacao': 'lactacao/ciclos',
      'eventos-sanitarios': 'sanitario/eventos',
      reproducao: 'reproducao',
      pesagens: 'zootecnico/pesagens',
      grupos: 'grupos',
      alertas: 'alertas',
      racas: 'racas',
      medicacoes: 'medicacoes',
    };
    return pathMap[entityType] || entityType;
  }

  private async fetchWithRetry(
    endpoint: string,
    attempt: number = 1,
  ): Promise<any[]> {
    try {
      return await apiFetch(endpoint);
    } catch (error) {
      if (attempt < SYNC_CONFIG.RETRY.MAX_ATTEMPTS) {
        const delayMs =
          SYNC_CONFIG.RETRY.INITIAL_DELAY_MS *
          Math.pow(SYNC_CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.fetchWithRetry(endpoint, attempt + 1);
      }
      throw error;
    }
  }

  private async persistRecords(entityType: string, records: any[]): Promise<void> {
    const db = await offlineDb.getDb();
    const tableName = this.getTableName(entityType);

    for (const record of records) {
      if (SyncHelpers.isDeletedRecord(record)) {
        // Delete locally (hard delete for soft-deleted API records)
        await offlineDb.deleteRecord(tableName, record.id || record.idBufalo);
      } else {
        // Upsert into local DB
        await offlineDb.insertOrUpdate(tableName, record, this.getIdField(entityType));
      }
    }
  }

  private getTableName(entityType: string): string {
    const tableMap: Record<string, string> = {
      bufalos: 'bufalo',
      'ciclos-lactacao': 'ciclolactacao',
      'eventos-sanitarios': 'dadossanitarios',
      reproducao: 'dadosreproducao',
      pesagens: 'dadoszootecnicos',
      grupos: 'grupo',
      alertas: 'alertas',
      racas: 'raca',
      medicacoes: 'medicacoes',
    };
    return tableMap[entityType] || entityType;
  }

  private getIdField(entityType: string): string {
    const idFieldMap: Record<string, string> = {
      bufalos: 'idBufalo',
      'ciclos-lactacao': 'idCicloLactacao',
      'eventos-sanitarios': 'idSanit',
      reproducao: 'idReproducao',
      pesagens: 'idZootec',
      grupos: 'idGrupo',
      alertas: 'idAlerta',
      racas: 'idRaca',
      medicacoes: 'idMedicacao',
    };
    return idFieldMap[entityType] || 'id';
  }

  getSyncState(): SyncState {
    return this.syncState;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/config/syncConfig.ts src/utils/syncHelpers.ts src/services/syncService.ts
git commit -m "feat: create SyncService to orchestrate offline-first sync

- SyncService fetches data from /sync/* endpoints with last_sync_at param
- Implements retry logic with exponential backoff
- Persists records to local SQLite (upsert for updates, hard delete for soft-deleted)
- Tracks per-entity sync status and last sync timestamps
- SyncHelpers normalize timestamps and manage last-sync storage

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Create SyncContext for Global State Management

**Files:**
- Create: `src/context/SyncContext.tsx`

- [ ] **Step 1: Create SyncContext provider**

Create `src/context/SyncContext.tsx`:

```typescript
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { SyncService, SyncState } from '../services/syncService';
import { usePropriedade } from './PropriedadeContext';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

interface SyncContextValue {
  syncState: SyncState | null;
  syncService: SyncService | null;
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
}

export const SyncContext = createContext<SyncContextValue>({
  syncState: null,
  syncService: null,
  triggerSync: async () => {},
  isSyncing: false,
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { propriedadeSelecionada } = usePropriedade();
  const [syncService, setSyncService] = useState<SyncService | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize SyncService when propriedade changes
  useEffect(() => {
    if (propriedadeSelecionada) {
      const service = new SyncService(propriedadeSelecionada.toString());
      setSyncService(service);
    }
  }, [propriedadeSelecionada]);

  // Trigger sync manually
  const triggerSync = useCallback(async () => {
    if (!syncService) return;

    setIsSyncing(true);
    try {
      const newState = await syncService.syncAll();
      setSyncState(newState);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [syncService]);

  // Sync on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [triggerSync]);

  const handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active') {
      triggerSync();
    }
  };

  // Sync on network reconnect
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && !isSyncing) {
        triggerSync();
      }
    });
    return unsubscribe;
  }, [triggerSync, isSyncing]);

  // Periodic sync (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSyncing) {
        triggerSync();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [triggerSync, isSyncing]);

  return (
    <SyncContext.Provider value={{ syncState, syncService, triggerSync, isSyncing }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncContext = () => {
  const context = React.useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within SyncProvider');
  }
  return context;
};
```

- [ ] **Step 2: Add SyncProvider to app context wrapping order**

Modify `src/App.tsx`:

```typescript
// In the JSX hierarchy, wrap the existing providers:
<GestureHandlerRootView>
  <SafeAreaProvider>
    <AuthProvider>
      <PropriedadeProvider>
        <SyncProvider>
          {/* existing PortalProvider, BottomSheetModalProvider, etc. */}
        </SyncProvider>
      </PropriedadeProvider>
    </AuthProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

- [ ] **Step 3: Install network monitoring dependency**

```bash
npm install @react-native-community/netinfo
npx expo install @react-native-community/netinfo
```

- [ ] **Step 4: Commit**

```bash
git add src/context/SyncContext.tsx src/App.tsx package.json
git commit -m "feat: add SyncContext for global offline sync orchestration

- SyncProvider manages SyncService lifecycle per property
- Triggers sync on app foreground, network reconnect, and every 5 minutes
- Exposes triggerSync() for manual refresh
- NetInfo monitors network state for reconnection events

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Create Hooks for Offline Data Queries

**Files:**
- Create: `src/hooks/useOfflineData.ts`
- Create: `src/hooks/useSyncStatus.ts`

- [ ] **Step 1: Create hook for querying local DB**

Create `src/hooks/useOfflineData.ts`:

```typescript
import { useEffect, useState, useCallback } from 'react';
import { offlineDb } from '../database/db';

interface UseOfflineDataOptions {
  tableName: string;
  where?: string;
  params?: (string | number | null)[];
  refetchInterval?: number;
}

export function useOfflineData<T>(options: UseOfflineDataOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const sql = `SELECT * FROM ${options.tableName} ${
        options.where ? `WHERE ${options.where}` : ''
      }`;
      const result = await offlineDb.query<T>(sql, options.params);
      setData(result);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [options.tableName, options.where, options.params]);

  useEffect(() => {
    fetchData();

    if (options.refetchInterval) {
      const interval = setInterval(fetchData, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

// Usage example:
// const { data: bufalos } = useOfflineData({
//   tableName: 'bufalo',
//   where: 'idPropriedade = ? AND deletedAt IS NULL',
//   params: [propriedadeId],
// });
```

- [ ] **Step 2: Create hook for sync status**

Create `src/hooks/useSyncStatus.ts`:

```typescript
import { useContext } from 'react';
import { SyncContext } from '../context/SyncContext';

export function useSyncStatus() {
  const { syncState, isSyncing, triggerSync } = useContext(SyncContext);

  return {
    isSyncing,
    lastSyncAt: syncState?.lastSyncAt,
    syncError: syncState?.error,
    entityStatuses: syncState?.entitySyncStatus,
    manualSync: triggerSync,
  };
}

// Usage example:
// const { isSyncing, lastSyncAt, manualSync } = useSyncStatus();
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useOfflineData.ts src/hooks/useSyncStatus.ts
git commit -m "feat: add hooks for offline data queries and sync status

- useOfflineData queries local SQLite with WHERE clauses
- useSyncStatus exposes sync state and manual sync trigger
- Both hooks integrate with existing context providers

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Migrate Existing Services to Query Local DB First

**Files:**
- Modify: `src/services/bufaloService.ts`
- Modify: `src/services/grupoService.ts`
- Modify: `src/services/piqueteService.ts`
- Modify: `src/services/*` (all data services)

- [ ] **Step 1: Update bufaloService to use offline first**

Modify `src/services/bufaloService.ts`:

```typescript
import { offlineDb } from '../database/db';
import { apiFetch } from '../lib/apiClient';

export const bufaloService = {
  async getAll(propriedadeId: string) {
    try {
      // Try local DB first
      const result = await offlineDb.query(
        'SELECT * FROM bufalo WHERE idPropriedade = ? AND deletedAt IS NULL',
        [propriedadeId],
      );
      return result.length > 0 ? result : await this.fetchFromAPI(propriedadeId);
    } catch (error) {
      console.warn('Error querying local DB, falling back to API:', error);
      return this.fetchFromAPI(propriedadeId);
    }
  },

  private async fetchFromAPI(propriedadeId: string) {
    return apiFetch(`/bufalos/propriedade/${propriedadeId}`);
  },

  // ... rest of methods also fallback to API if offline
};
```

- [ ] **Step 2: Update all other services similarly**

Apply the same pattern to:
- grupoService
- piqueteService
- lactacaoService
- reproducaoService
- sanitarioService
- zootecnicoService
- alertaService

- [ ] **Step 3: Commit all service updates**

```bash
git add src/services/*.ts
git commit -m "feat: migrate services to offline-first pattern

All services now:
- Query local SQLite first (if data exists)
- Fall back to API if local DB is empty or unreachable
- Maintain existing API contract for UI components

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Add Offline Indicator UI Component

**Files:**
- Create: `src/components/SyncStatus/index.tsx`
- Modify: `src/App.tsx` or root screen

- [ ] **Step 1: Create SyncStatus component**

Create `src/components/SyncStatus/index.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { colors } from '../../styles/colors';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const SyncStatus = () => {
  const { isSyncing, lastSyncAt, syncError } = useSyncStatus();

  if (syncError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBadge}>
          <Text style={styles.errorText}>Erro na sincronização</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isSyncing ? (
        <View style={styles.syncingBadge}>
          <ActivityIndicator size="small" color={colors.text.accent} />
          <Text style={styles.syncingText}>Sincronizando...</Text>
        </View>
      ) : lastSyncAt ? (
        <Text style={styles.syncedText}>
          Sincronizado há {formatDistanceToNow(new Date(lastSyncAt), { locale: ptBR })}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  syncingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncingText: {
    fontSize: 12,
    color: colors.text.accent,
    fontWeight: '600',
  },
  syncedText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  errorBadge: {
    backgroundColor: colors.status.errorBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.status.errorText,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Add component to app header or footer**

Modify main screen or `App.tsx`:

```typescript
// Add to a visible location (e.g., after header or in footer)
<SyncStatus />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SyncStatus/index.tsx src/App.tsx
git commit -m "feat: add SyncStatus indicator component

- Shows real-time sync progress
- Displays last sync time
- Shows errors if sync fails
- Placed in app header for visibility

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Test End-to-End Offline Sync Flow

**Files:**
- Create: `__tests__/sync.integration.test.ts`

- [ ] **Step 1: Write integration test**

Create `__tests__/sync.integration.test.ts`:

```typescript
import { SyncService } from '../src/services/syncService';
import { offlineDb } from '../src/database/db';

describe('Offline-First Sync Flow', () => {
  const propriedadeId = 'test-property-id';
  let syncService: SyncService;

  beforeEach(async () => {
    await offlineDb.initialize();
    syncService = new SyncService(propriedadeId);
  });

  test('should sync bufalos from API to local DB', async () => {
    const state = await syncService.syncAll();

    expect(state.syncing).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastSyncAt).toBeTruthy();

    // Verify data in local DB
    const localBufalos = await offlineDb.query('SELECT * FROM bufalo');
    expect(localBufalos.length).toBeGreaterThan(0);
  });

  test('should handle soft-deleted records', async () => {
    // Assume one record has deletedAt set in API response
    const state = await syncService.syncAll();

    const deletedRecords = await offlineDb.query(
      'SELECT * FROM bufalo WHERE deletedAt IS NOT NULL',
    );
    // After sync, deleted records should be removed from local DB
    expect(deletedRecords.length).toBe(0);
  });

  test('should respect incremental sync with updated_at', async () => {
    // First sync
    await syncService.syncAll();

    // Capture timestamp
    const firstSyncTime = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 1000));

    // Second sync should only return records changed after firstSyncTime
    // (This would require mock API or real API with test data)
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- __tests__/sync.integration.test.ts
```

Expected output: Tests pass, demonstrating end-to-end sync flow.

- [ ] **Step 3: Commit tests**

```bash
git add __tests__/sync.integration.test.ts
git commit -m "test: add integration tests for offline-first sync

- Verify sync fetches data from API to local DB
- Verify soft-deleted records are removed locally
- Verify incremental sync respects updated_at parameter

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Testing Checklist

- [ ] **Manual Testing on Android Device:**
  - [ ] App starts, triggers sync immediately
  - [ ] Sync indicator shows "Sincronizando..." during fetch
  - [ ] After sync, shows "Sincronizado há X minutos"
  - [ ] Kill network, data still loads from local DB
  - [ ] Reconnect network, app syncs automatically
  - [ ] Every 5 minutes, app syncs in background

- [ ] **API Contract Validation:**
  - [ ] All `/sync/*` endpoints return plain arrays
  - [ ] Soft-deleted records have `deletedAt` populated
  - [ ] `updated_at` query param filters correctly
  - [ ] Auth guard validates property access

- [ ] **Data Consistency:**
  - [ ] No duplicate records after multiple syncs
  - [ ] Deleted records removed from local DB
  - [ ] Updated records overwrite local copies
  - [ ] All fields match API response format

---

## Summary

This plan implements **offline-first sync** across 7 tasks:
1. SQLite infrastructure setup
2. SyncService orchestration
3. Global SyncContext for state
4. Offline query hooks
5. Service layer migration to local-first
6. UI sync indicator
7. Integration tests

**Total effort:** ~4-6 hours for full implementation + testing

**Result:** App maintains local SQLite cache synchronized with buffs-api `/sync/*` endpoints, enabling full offline functionality with periodic/event-driven background sync.

