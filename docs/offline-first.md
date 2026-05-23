# Funcionalidade Offline First

O app é projetado para funcionar 100% sem internet. Esta página descreve como isso é implementado.

---

## Princípio

> **O SQLite local é a única fonte de verdade para leitura.** Nenhuma tela faz fetch direto à API. O servidor é apenas o destino final dos dados.

---

## Componentes

### 1. SQLite local (`buffs.sqlite`)

Banco de dados local gerenciado por `@op-engineering/op-sqlite`. Inicializado em `src/database/db.ts`.

- **Schema:** definido em `src/database/schema.ts` (`CREATE_TABLES_SQL`)
- **Migrations:** `src/database/migrations.ts` — drop-and-recreate com `PRAGMA user_version`
- **Versão atual:** 9

Toda tela lê de tabelas SQLite. Não há chamadas diretas à API nas telas ou serviços de domínio.

### 2. Fila de operações pendentes (`pending_operations`)

Cada escrita offline gera uma linha em `pending_operations`:

```sql
CREATE TABLE IF NOT EXISTS pending_operations (
  id           TEXT PRIMARY KEY,
  entity       TEXT NOT NULL,        -- ex: "ordenhas", "bufalos"
  operation    TEXT NOT NULL,        -- "CREATE" | "UPDATE" | "DELETE"
  endpoint     TEXT NOT NULL,        -- ex: "/ordenhas"
  method       TEXT NOT NULL,        -- "POST" | "PATCH" | "DELETE"
  payload      TEXT NOT NULL,        -- JSON do body
  status       TEXT DEFAULT 'PENDING',
  retryCount   INTEGER DEFAULT 0,
  errorMessage TEXT,
  createdAt    TEXT NOT NULL
)
```

A fila é processada pelo `syncService.push()` em ordem FIFO por `createdAt`.

### 3. Push sync (`pending_operations` → API)

`syncService.ts` lê todas as operações `PENDING` e executa:

1. `pushEndpoints.ts` resolve o endpoint + método + body para cada operação
2. `apiFetch()` envia a requisição
3. Em sucesso: marca a op como `DONE` e atualiza `_synced = 1` no registro local
4. Em falha: incrementa `retryCount`, registra `errorMessage`; retenta até 5x

### 4. Pull sync (API → SQLite)

`syncService.pull(propriedadeId)` busca atualizações do servidor:

```
GET /sync/:propriedadeId/:entidade?updated_at=<lastSyncedAt>
```

Retorna registros criados/atualizados/deletados desde o último sync. O app faz `upsertBatch()` → `INSERT OR REPLACE` em cada tabela.

`sync_meta` guarda o `lastSyncedAt` por entidade e propriedade para sincronização incremental.

---

## Write-through pattern

Para entidades **push-only** (sem pull sync do servidor), o app usa write-through:

- Ao registrar → `execute(INSERT INTO tabela ...)` + `enqueue(entidade, op, payload)`
- O SQLite tem o dado imediatamente (offline funciona)
- A fila sobe para o servidor quando há conexão

**Entidades write-through:**
- `ordenhas` — registros de ordenha
- `producao_diaria` — estoque de leite (snapshot diário)
- `retiradas` — coletas por laticínio

---

## Quando a sincronização ocorre

| Gatilho | Tipo de sync |
|---|---|
| Abertura do app | Pull completo + push |
| Troca de propriedade | Pull completo + push |
| Primeiro login | Sync core (búfalos + ciclos + reproduções) |
| Manual (pull-to-refresh) | Pull completo + push |

---

## Limitações conhecidas

| Limitação | Detalhe |
|---|---|
| **Parto offline** | `PATCH /cobertura/:id/registrar-parto` cria o ciclo de lactação no servidor. Se feito offline, a ordenha registrada offline para esse ciclo pode ter FK inválida no sync. |
| **`id` rejeitado pelo servidor** | `POST /producao-diaria` e `POST /retiradas` não aceitam o campo `id` ainda. O mobile envia o UUID para idempotência no retry — aguarda correção no backend. |
| **Ordem da fila** | Se um CREATE falha, UPDATEs dependentes também falham. A fila continua processando outras entidades independentes. |

---

## Adicionando suporte offline a uma nova entidade

1. Adicionar `CREATE TABLE IF NOT EXISTS <entidade>` em `src/database/schema.ts`
2. Adicionar `<entidade>` em `LEGACY_TABLES` e bumpar `CURRENT_VERSION` em `src/database/migrations.ts`
3. Adicionar o resolver em `src/services/sync/pushEndpoints.ts`
4. No serviço da entidade: usar `execute()` para persistir localmente + `enqueue()` para a fila
5. Adicionar a entidade em `SYNC_ENTITY_PATH` (em `schema.ts`) se tiver pull sync
