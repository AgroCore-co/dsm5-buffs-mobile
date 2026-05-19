# Offline-First SQLite — Design Spec

**Data:** 2026-05-18
**Branch:** `feature/offline-first-sqlite`
**Projeto mobile:** `dsm5-buffs-mobile` (React Native bare)
**API:** `buffs-api` (NestJS + Drizzle + PostgreSQL)

---

## 1. Contexto e Objetivo

O app atualmente busca todos os dados diretamente da API a cada abertura de tela. Sem internet, o usuário não consegue nem visualizar informações.

O objetivo é migrar para **offline-first**: dados lidos do SQLite local, escritas imediatas no SQLite com fila de sincronização assíncrona com a API.

**Requisitos validados:**
- Leitura e escrita funcionam sem internet
- Pequena equipe por propriedade (2–4 usuários); conflitos ocasionais são aceitáveis
- Sync automático em 4 gatilhos: app ao foreground, reconexão de rede, intervalo (5 min) e ação manual
- Conflito resolvido por last-write-wins com `updated_at`

---

## 2. Abordagem Escolhida

**op-sqlite + camada de sync customizada**

- `@op-engineering/op-sqlite` como driver SQLite (JSI — sem bridge)
- Sync manual via endpoints `/sync/:id_propriedade/<entity>` já existentes na API
- Fila `pending_operations` para escritas offline
- Sem frameworks opinionados (WatermelonDB, Realm)
- Migração incremental — um módulo por vez, sem quebrar os demais

---

## 3. Arquitetura

### Fluxo atual
```
Screen → Service → apiFetch → API
```

### Novo fluxo
```
Screen → Service → SQLite (leitura)
                 ↘ pending_operations (escrita offline)

SyncService ──push──→ pending_operations → API CRUD
            ──pull──→ API /sync → SQLite (download incremental)
```

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/database/db.ts` | Conexão op-sqlite, instância singleton, `isFirstSync()` |
| `src/database/schema.ts` | Strings `CREATE TABLE IF NOT EXISTS` para todas as entidades |
| `src/database/migrations.ts` | Versionamento de schema via `PRAGMA user_version` |
| `src/services/syncService.ts` | Orquestra push → pull, proteção contra execução concorrente |
| `src/services/pendingOperationsService.ts` | Enfileirar, listar e remover operações pendentes |
| `src/context/SyncContext.tsx` | Estado global: `isSyncing`, `lastSyncedAt`, `pendingCount`, `hasFailed`, `sync()` |

### O que não muda
- Telas e componentes
- Navegação
- `AuthContext` e `PropriedadeContext`
- `apiFetch` (continua usado pelo SyncService para chamadas à API)
- `App.tsx` — apenas adiciona `<SyncProvider>`

---

## 4. Schema SQLite

### Padrão de todas as tabelas de entidade

Cada tabela espelha a resposta do endpoint `/sync` correspondente:

```sql
CREATE TABLE IF NOT EXISTS bufalos (
  id_bufalo        TEXT PRIMARY KEY,
  id_propriedade   TEXT NOT NULL,
  brinco           TEXT,
  nome             TEXT,
  sexo             TEXT,
  status           TEXT,
  nivel_maturidade TEXT,
  id_raca          TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,   -- base do sync incremental
  deleted_at       TEXT,            -- soft delete: NULL = ativo
  _synced          INTEGER DEFAULT 0 -- 0 = local não confirmado, 1 = confirmado pelo servidor
);
```

As colunas específicas de cada entidade são derivadas do schema da API em `buffs-api/src/database/schema.ts`. O padrão `updated_at` + `deleted_at` existe em todas as tabelas da API.

### Tabelas de entidade

| Tabela SQLite | Endpoint `/sync` | Escopo |
|---|---|---|
| `bufalos` | `/sync/:id/bufalos` | por propriedade |
| `ciclos_lactacao` | `/sync/:id/lactacao` | por propriedade |
| `grupos` | `/sync/:id/grupos` | por propriedade |
| `racas` | `/sync/:id/racas` | global¹ |
| `dados_zootecnicos` | `/sync/:id/dados-zootecnicos` | por propriedade |
| `medicamentos` | `/sync/:id/medicamentos` | global¹ |
| `dados_sanitarios` | `/sync/:id/dados-sanitarios` | por propriedade |
| `alertas` | `/sync/:id/alertas` | por propriedade |
| `coberturas` | `/sync/:id/coberturas` | por propriedade |
| `material_genetico` | `/sync/:id/material-genetico` | por propriedade |

> ¹ **Tabelas globais** (`racas`, `medicamentos`) não têm coluna `id_propriedade`. O pull ainda usa o endpoint `/sync/:id_propriedade/racas` (a API exige o parâmetro), mas o upsert local ignora o escopo de propriedade — basta sincronizar uma vez por sessão, independentemente da propriedade ativa. O `sync_meta` para essas tabelas usa `propriedade_id = 'global'` como chave fixa.

### Tabelas de controle

```sql
-- rastreia o último sync bem-sucedido por entidade e propriedade
CREATE TABLE IF NOT EXISTS sync_meta (
  entity          TEXT NOT NULL,
  propriedade_id  TEXT NOT NULL,
  last_synced_at  TEXT,            -- ISO8601; NULL = nunca sincronizado
  PRIMARY KEY (entity, propriedade_id)
);

-- fila de escritas offline
CREATE TABLE IF NOT EXISTS pending_operations (
  id            TEXT PRIMARY KEY,      -- UUID local
  entity        TEXT NOT NULL,         -- 'bufalos', 'ciclos_lactacao', etc.
  operation     TEXT NOT NULL,         -- 'CREATE' | 'UPDATE' | 'DELETE'
  endpoint      TEXT NOT NULL,         -- '/bufalos', '/bufalos/:id'
  method        TEXT NOT NULL,         -- 'POST' | 'PATCH' | 'DELETE'
  payload       TEXT NOT NULL,         -- JSON serializado
  status        TEXT DEFAULT 'PENDING',-- 'PENDING' | 'FAILED'
  retry_count   INTEGER DEFAULT 0,
  error_message TEXT,
  created_at    TEXT NOT NULL
);
```

### Coluna `_synced`

Registros com `_synced = 0` foram criados ou editados offline e ainda não confirmados pelo servidor. Isso permite:
- Exibir indicador visual de "pendente" na UI
- Proteger o registro de ser sobrescrito pelo pull antes do push

---

## 5. SyncService

### Ciclo de sync — ordem obrigatória

```
sync(propriedadeId)
  1. push()   → envia pending_operations para a API
  2. pull()   → baixa estado mais recente da API para o SQLite
```

Push antes do pull garante que as mudanças locais estejam no servidor antes de atualizar o estado local.

### Push

```typescript
async push(): Promise<void> {
  const pending = await db.getAllAsync(
    "SELECT * FROM pending_operations WHERE status = 'PENDING' ORDER BY created_at ASC"
  );

  for (const op of pending) {
    try {
      await apiFetch(op.endpoint, { method: op.method, body: op.payload });
      await db.runAsync("DELETE FROM pending_operations WHERE id = ?", [op.id]);
      // ENTITY_PK_MAP: { bufalos: 'id_bufalo', ciclos_lactacao: 'id_ciclo_lactacao', ... }
      // definido em src/database/schema.ts junto com o schema
      const pk = ENTITY_PK_MAP[op.entity];
      const localId = JSON.parse(op.payload)[pk];
      await db.runAsync(
        `UPDATE ${op.entity} SET _synced = 1 WHERE ${pk} = ?`,
        [localId]
      );
    } catch (error) {
      const newCount = op.retry_count + 1;
      await db.runAsync(
        `UPDATE pending_operations
         SET retry_count = ?, status = ?, error_message = ? WHERE id = ?`,
        [newCount, newCount >= 3 ? 'FAILED' : 'PENDING', error.message, op.id]
      );
    }
  }
}
```

### Pull — incremental por entidade

```typescript
async pullEntity(entity: string, propriedadeId: string): Promise<void> {
  try {
    const meta = await db.getFirstAsync(
      "SELECT last_synced_at FROM sync_meta WHERE entity = ? AND propriedade_id = ?",
      [entity, propriedadeId]
    );

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({ page: String(page), limit: '200' });
      if (meta?.last_synced_at) params.append('updated_at', meta.last_synced_at);

      const response = await apiFetch(`/sync/${propriedadeId}/${entity}?${params}`);

      await upsertBatch(entity, response.data);

      await db.runAsync(
        `INSERT OR REPLACE INTO sync_meta (entity, propriedade_id, last_synced_at)
         VALUES (?, ?, ?)`,
        [entity, propriedadeId, response.meta.synced_at]
      );

      hasMore = page < response.meta.totalPages;
      page++;
    }
  } catch {
    // falha silenciosa — dados locais continuam disponíveis
    // próximo ciclo tentará novamente
  }
}

async pull(propriedadeId: string): Promise<void> {
  const entities = [
    'bufalos', 'lactacao', 'grupos', 'racas',
    'dados-zootecnicos', 'medicamentos', 'dados-sanitarios',
    'alertas', 'coberturas', 'material-genetico',
  ];
  await Promise.allSettled(entities.map(e => this.pullEntity(e, propriedadeId)));
}
```

### Proteção contra execução concorrente

```typescript
class SyncService {
  private running = false;

  async sync(propriedadeId: string): Promise<void> {
    if (this.running || !isConnected()) return;
    this.running = true;
    try {
      await this.push();
      await this.pull(propriedadeId);
    } finally {
      this.running = false;
    }
  }
}

export const syncService = new SyncService(); // singleton
```

### Resolução de conflitos — upsert com guard

```sql
INSERT INTO bufalos (...)
VALUES (...)
ON CONFLICT(id_bufalo) DO UPDATE SET
  ... = excluded....,
  _synced = 1
WHERE _synced = 1
   OR excluded.updated_at > bufalos.updated_at;
```

**Regra:** registro com `_synced = 0` (escrita local pendente) nunca é sobrescrito pelo pull. Ele será enviado ao servidor no próximo push, tornando-se a versão definitiva.

---

## 6. Migração das Services

### Padrão de transformação

As telas não mudam. Apenas o interior das funções de service é alterado.

**Leitura — passa a consultar SQLite:**
```typescript
// ANTES
export const getBufalos = async (propriedadeId: string, page = 1, limit = 10) => {
  const result = await apiFetch(`/bufalos/propriedade/${propriedadeId}?page=${page}&limit=${limit}`);
  return { bufalos: result.data, meta: result.meta };
};

// DEPOIS
export const getBufalos = async (propriedadeId: string, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const bufalos = await db.getAllAsync(
    `SELECT * FROM bufalos
     WHERE id_propriedade = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [propriedadeId, limit, offset]
  );
  const { total } = await db.getFirstAsync(
    `SELECT COUNT(*) as total FROM bufalos
     WHERE id_propriedade = ? AND deleted_at IS NULL`,
    [propriedadeId]
  );
  return { bufalos, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
```

**Escrita — SQLite imediato + fila:**
```typescript
// DEPOIS
export const createBufalo = async (data: any) => {
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO bufalos (id_bufalo, id_propriedade, brinco, nome, sexo, status,
      created_at, updated_at, _synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [id, data.idPropriedade, data.brinco, data.nome, data.sexo, data.status, now, now]
  );

  await pendingOperationsService.enqueue({
    entity: 'bufalos',
    operation: 'CREATE',
    endpoint: '/bufalos',
    method: 'POST',
    payload: JSON.stringify({ ...data, idBufalo: id }),
  });

  return { idBufalo: id, ...data };
};
```

---

## 7. SyncContext e Gatilhos

```typescript
// src/context/SyncContext.tsx
export const SyncProvider = ({ children }) => {
  const { propriedadeSelecionada } = usePropriedade();
  const [isSyncing, setIsSyncing]       = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasFailed, setHasFailed]       = useState(false);

  const sync = useCallback(async () => {
    if (!propriedadeSelecionada || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncService.sync(propriedadeSelecionada);
      setLastSyncedAt(new Date().toISOString());
      const { count } = await db.getFirstAsync(
        "SELECT COUNT(*) as count FROM pending_operations WHERE status = 'PENDING'"
      );
      setPendingCount(count);
      setHasFailed(false);
    } catch {
      setHasFailed(true);
    } finally {
      setIsSyncing(false);
    }
  }, [propriedadeSelecionada]);

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

  // Gatilho 3 — intervalo em foreground (5 min)
  useEffect(() => {
    const t = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [sync]);

  // Gatilho 4 — manual via useSyncStatus().sync()
  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncedAt, pendingCount, hasFailed, sync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncStatus = () => useContext(SyncContext);
```

**Provider no `App.tsx`:**
```tsx
<AuthProvider>
  <PropriedadeProvider>
    <SyncProvider>
      {/* resto da app */}
    </SyncProvider>
  </PropriedadeProvider>
</AuthProvider>
```

**Uso nas telas:**
```tsx
const { isSyncing, pendingCount, hasFailed, sync } = useSyncStatus();

<RefreshControl refreshing={isSyncing} onRefresh={sync} />
```

---

## 8. Primeiro Sync

Na primeira abertura, `sync_meta` está vazia. O pull baixa todos os dados sem filtro de `updated_at`.

**Detecção:**
```typescript
export async function isFirstSync(): Promise<boolean> {
  const result = await db.getFirstAsync("SELECT COUNT(*) as count FROM sync_meta");
  return result.count === 0;
}
```

**Fluxo de navegação:**
```
App abre → AuthContext verifica token
  ↓
isFirstSync() ?
  ├── sim → InitialSyncScreen ("Sincronizando dados iniciais...")
  │           ├── sync() OK  → navega para MainTab
  │           └── sync() FAIL (sem internet) → botão "Tentar novamente"
  │                                            + opção "Continuar offline"
  │                                            (app abre com dados vazios)
  └── não → MainTab direto (sync em background)
```

---

## 9. Tratamento de Erros

| Situação | Comportamento |
|---|---|
| Falha de rede durante push | Operação fica `PENDING`, tentada no próximo ciclo |
| 3 falhas consecutivas no push | Operação passa para `FAILED`, `hasFailed = true` |
| Falha de rede durante pull | Silenciosa — dados locais continuam disponíveis |
| UI para operações `FAILED` | Badge de alerta + botão "tentar novamente" invoca `sync()` |

---

## 10. Dependências Novas

| Biblioteca | Versão | Função |
|---|---|---|
| `@op-engineering/op-sqlite` | latest | Driver SQLite via JSI |
| `@react-native-community/netinfo` | latest | Detecção de reconexão |
| `react-native-uuid` | latest | Geração de UUID v4 local |

> `axios` está instalado mas não é usado — pode ser removido.

---

## 11. Ordem de Implementação

| Etapa | O que fazer |
|---|---|
| 1 | Infraestrutura SQLite: `db.ts`, `schema.ts`, `migrations.ts` |
| 2 | `syncService.ts` + `SyncContext.tsx` — pull only, leituras ainda da API |
| 3 | Migrar **leituras** do primeiro módulo (`bufalos`) para SQLite |
| 4 | `pendingOperationsService.ts` + migrar **escritas** de `bufalos` |
| 5 | Repetir etapas 3–4 para `lactacao`, `reproducao`, `sanitario`, `zootecnico`, demais |
| 6 | `InitialSyncScreen` e fluxo de primeiro sync |
| 7 | UI de status: badge de pendentes, indicador de erro, `RefreshControl` |
