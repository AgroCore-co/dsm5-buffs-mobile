# Issue: Criar endpoint `GET /sync/lotes` (flat) na buffs-api

> **Prioridade: MÉDIA.** O mobile já sincroniza lotes via o REST existente `GET /lotes/propriedade/:id` (Fase 2), então funciona hoje. Este endpoint flat é uma **padronização** que adiciona o que falta: **sync incremental** (`updated_at`) e **soft-deletes** (o REST atual filtra `deletedAt IS NULL`, então piquetes deletados ficam "fantasma" no dispositivo).

## Contexto

O app mobile é offline-first com SQLite. Cada entidade é baixada de um endpoint `/sync/*` (array cru, incremental, com soft-deletes) e populada na tabela local.

Para lotes/piquetes, o mobile hoje usa `GET /lotes/propriedade/:id` (REST normal) como ponte. Limitações dessa ponte:
- **Não é incremental** — baixa tudo sempre.
- **Não retorna deletados** (`buscarPorPropriedade` aplica `isNull(lote.deletedAt)`), então um piquete removido na API permanece no SQLite local indefinidamente.

## O que criar

### `GET /sync/lotes`

**Tabela Drizzle:** `lote` (PK `idLote` / `id_lote`)

**Query params:**

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `propriedadeId` | `string (UUID)` | Sim | Filtra pela propriedade |
| `updated_at` | `string (ISO 8601)` | Não | Retorna só registros com `updatedAt >= updated_at` |

**Regras (iguais aos outros `/sync` flat):**
- Retorna **array cru** (sem `{data, meta}`, sem paginação).
- **Inclui registros com `deletedAt` preenchido** (NÃO aplicar `isNull(deletedAt)`).
- Manter o join com `grupo` (o mobile usa `grupo.idGrupo`, `grupo.nomeGrupo`, `grupo.color`) e o `geoMapa` como objeto GeoJSON (igual ao `GET /lotes/propriedade/:id`).

**Query Drizzle a implementar:**

```ts
const conditions = [eq(lote.idPropriedade, propriedadeId)];
if (updatedAt) conditions.push(gte(lote.updatedAt, updatedAt));

return await this.databaseService.db.query.lote.findMany({
  where: and(...conditions), // SEM isNull(deletedAt) — sync precisa dos deletados
  with: {
    grupo: { columns: { idGrupo: true, nomeGrupo: true, color: true } },
  },
  orderBy: [desc(lote.updatedAt), desc(lote.createdAt)],
});
// aplicar o mesmo parse de geo_mapa usado em LoteService.parseGeoMapa
```

**Resposta esperada:**

```json
[
  {
    "idLote": "l1l1l1l1-0000-0000-0000-000000000001",
    "nomeLote": "Piquete Norte",
    "tipoLote": "Pasto",
    "status": "ativo",
    "qtdMax": 30,
    "areaM2": "12500.00",
    "geoMapa": { "type": "Polygon", "coordinates": [[[-47.1,-22.2],[-47.0,-22.1],[-47.1,-22.2]]] },
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "grupo": { "idGrupo": "g1g1g1g1-0000-0000-0000-000000000001", "nomeGrupo": "Lactantes", "color": "#4CAF50" },
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updatedAt": "2026-05-10T09:00:00.000Z",
    "deletedAt": null
  }
]
```

## Padrão de implementação

1. Criar `src/modules/sync/repositories/sync-lotes.repository.ts` (espelhar `sync-bufalos.repository.ts` + o parse de `geoMapa` do `LoteService`).
2. Adicionar `getLotes(idPropriedade, user, updatedAt)` no `SyncService`.
3. Adicionar no `SyncController`:
   ```ts
   @Get('lotes')
   @ApiOperation({ summary: 'Sincroniza lotes/piquetes por propriedade (offline-first)' })
   getLotes(@Query('propriedadeId', ParseUUIDPipe) propriedadeId: string, @User() user: any, @Query('updated_at') updatedAt?: string) {
     return this.syncService.getLotes(propriedadeId, user, updatedAt);
   }
   ```
4. Registrar o repository no `SyncModule`.

## Impacto no mobile após implementação

- Em `src/services/syncService.ts`: trocar o caso especial de `lotes` (que hoje chama `/lotes/propriedade/:id`) pela rota flat `/sync/lotes?propriedadeId=...&updated_at=...`, ganhando incremental + purge de soft-deletes.
- Em `src/database/schema.ts`: já há `lotes: 'idLote'` em `ENTITY_API_PK_MAP`; adicionar `lotes: 'lotes'` em `SYNC_ENTITY_PATH`.
