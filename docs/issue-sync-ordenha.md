# Issue: Criar endpoint `GET /sync/ordenha` (flat) na buffs-api

> **Prioridade: ALTA.** É o único bloqueio real para o offline-first completo do mobile. Hoje **não existe** nenhum endpoint que liste todas as ordenhas de uma propriedade — só global paginado (`GET /ordenhas`) ou por búfala/ciclo. Sem isso, os dashboards de **produção mensal** e **lactação** não funcionam offline (precisam do histórico de ordenhas por período).

## Contexto

O app mobile é offline-first com SQLite. O `syncService` baixa cada entidade de um endpoint `/sync/*` (array cru, incremental via `updated_at`, incluindo soft-deletes) e popula a tabela local.

Na Fase 3 do mobile, a tabela local `ordenhas` já existe e o registro offline de ordenha já funciona (push para `POST /ordenhas`). Falta o **pull**: o mobile precisa baixar o histórico de ordenhas da propriedade. Hoje o `syncService` **pula** a entidade `ordenhas` justamente porque este endpoint não existe (`pullEntity` retorna cedo para `ordenhas`).

## O que criar

Um novo endpoint no `SyncController` (módulo `src/modules/sync/`), seguindo exatamente o mesmo padrão dos endpoints flat já existentes (`GET /sync/bufalos`, `GET /sync/zootecnico/pesagens`, etc.).

### `GET /sync/ordenha`

**Tabela Drizzle:** `dadoslactacao` (PK `idLact` / `id_lact`)

**Query params:**

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `propriedadeId` | `string (UUID)` | Sim | Filtra pela propriedade |
| `updated_at` | `string (ISO 8601)` | Não | Se informado, retorna só registros com `updatedAt >= updated_at` |

**Regras (iguais aos outros `/sync` flat):**
- Retorna **array cru** (sem `{data, meta}`, sem paginação).
- **Inclui registros com `deletedAt` preenchido** (NÃO aplicar `isNull(deletedAt)`) — o app precisa purgar localmente o que foi deletado.
- `dadoslactacao` **tem `idPropriedade`** → filtrar direto, sem join obrigatório.

**Query Drizzle a implementar** (espelhar `SyncBufalosRepository.findByPropriedade`):

```ts
const conditions = [eq(dadoslactacao.idPropriedade, propriedadeId)];
if (updatedAt) conditions.push(gte(dadoslactacao.updatedAt, updatedAt));

return await this.databaseService.db.query.dadoslactacao.findMany({
  where: and(...conditions),
  orderBy: [desc(dadoslactacao.updatedAt), desc(dadoslactacao.createdAt)],
});
```

**Resposta esperada:**

```json
[
  {
    "idLact": "d1d1d1d1-0000-0000-0000-000000000001",
    "idBufala": "a1b2c3d4-0000-0000-0000-000000000001",
    "idUsuario": "u1u1u1u1-0000-0000-0000-000000000001",
    "idCicloLactacao": "c1c1c1c1-0000-0000-0000-000000000001",
    "qtOrdenha": "8.500",
    "periodo": "M",
    "ocorrencia": null,
    "dtOrdenha": "2026-05-18T06:00:00.000Z",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "createdAt": "2026-05-18T06:05:00.000Z",
    "updatedAt": "2026-05-18T06:05:00.000Z",
    "deletedAt": null
  }
]
```

## Padrão de implementação

1. Criar `src/modules/sync/repositories/sync-ordenha.repository.ts` espelhando `sync-pesagens.repository.ts` / `sync-bufalos.repository.ts` (DatabaseService + LoggerService injetados).
2. Adicionar `getOrdenha(idPropriedade, user, updatedAt)` no `SyncService` (com `validatePropertyAccess`).
3. Adicionar no `SyncController`:
   ```ts
   @Get('ordenha')
   @ApiOperation({ summary: 'Sincroniza ordenhas por propriedade (offline-first)' })
   getOrdenha(@Query('propriedadeId', ParseUUIDPipe) propriedadeId: string, @User() user: any, @Query('updated_at') updatedAt?: string) {
     return this.syncService.getOrdenha(propriedadeId, user, updatedAt);
   }
   ```
4. Registrar o repository no `SyncModule`.

## Impacto no mobile após implementação

- Em `src/database/schema.ts`: adicionar `ordenha: 'idLact'` em `ENTITY_API_PK_MAP` e `ordenha`/`ordenhas` → `'ordenha'` em `SYNC_ENTITY_PATH`.
- Em `src/services/syncService.ts`: remover o early-return `if (entity === 'ordenhas') return;` em `pullEntity`.
- Habilita os dashboards de produção mensal e lactação offline (Fase 5).
