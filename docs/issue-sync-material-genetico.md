# Issue: Criar endpoint `GET /sync/material-genetico` (flat) na buffs-api

> **Prioridade: BAIXA.** Não há consumidor imediato no mobile (o cadastro de reprodução usa texto livre para ID de óvulo/sêmen, não um picker). Este endpoint padroniza o sync para quando o mobile adicionar: (a) seleção de material genético por lista offline, e (b) resolução de pai/mãe de origem-sêmen no prontuário do animal. Hoje só existe o endpoint paginado `GET /sync/:id_propriedade/material-genetico` (wrapper `{data, meta}`), inconsistente com os demais `/sync` flat.

## Contexto

O app mobile é offline-first com SQLite. Cada entidade vem de um endpoint `/sync/*` retornando array cru, incremental (`updated_at`) e com soft-deletes.

Material genético foi **removido** dos mapas de sync do mobile porque a rota flat não existe e não há consumidor. Quando houver (picker de sêmen/óvulo, ou nome de pai/mãe via `idPaiSemen`/`idMaeOvulo`), o mobile precisará deste endpoint.

## O que criar

### `GET /sync/material-genetico`

**Tabela Drizzle:** `materialgenetico` (PK `idMaterial` / `id_material`)

**Query params:**

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `propriedadeId` | `string (UUID)` | Sim | Filtra pela propriedade |
| `updated_at` | `string (ISO 8601)` | Não | Retorna só registros com `updatedAt >= updated_at` |

**Regras (iguais aos outros `/sync` flat):**
- Retorna **array cru** (sem `{data, meta}`, sem paginação).
- **Inclui registros com `deletedAt` preenchido** (NÃO aplicar `isNull(deletedAt)`).
- `materialgenetico` **tem `idPropriedade`** → filtrar direto.

**Query Drizzle a implementar:**

```ts
const conditions = [eq(materialgenetico.idPropriedade, propriedadeId)];
if (updatedAt) conditions.push(gte(materialgenetico.updatedAt, updatedAt));

return await this.databaseService.db.query.materialgenetico.findMany({
  where: and(...conditions),
  orderBy: [desc(materialgenetico.updatedAt), desc(materialgenetico.createdAt)],
});
```

**Resposta esperada:**

```json
[
  {
    "idMaterial": "mat1mat1-0000-0000-0000-000000000001",
    "tipo": "Sêmen",
    "origem": "Comprado",
    "idBufaloOrigem": null,
    "fornecedor": "Central Genética XYZ",
    "dataColeta": "2025-11-01T00:00:00.000Z",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "createdAt": "2025-11-01T10:00:00.000Z",
    "updatedAt": "2025-11-01T10:00:00.000Z",
    "deletedAt": null
  }
]
```

## Padrão de implementação

1. Criar `src/modules/sync/repositories/sync-material-genetico.repository.ts` (espelhar `sync-bufalos.repository.ts`).
2. Adicionar `getMaterialGenetico(idPropriedade, user, updatedAt)` no `SyncService`.
3. Adicionar no `SyncController`:
   ```ts
   @Get('material-genetico')
   @ApiOperation({ summary: 'Sincroniza material genético por propriedade (offline-first)' })
   getMaterialGenetico(@Query('propriedadeId', ParseUUIDPipe) propriedadeId: string, @User() user: any, @Query('updated_at') updatedAt?: string) {
     return this.syncService.getMaterialGenetico(propriedadeId, user, updatedAt);
   }
   ```
4. Registrar o repository no `SyncModule`.

> Observação: já existe `syncMaterialGenetico` paginado (`GET /sync/:id_propriedade/material-genetico`). O endpoint flat é a versão offline-first; **não remover** o paginado se algo o consumir.

## Impacto no mobile após implementação

- Em `src/database/schema.ts`: re-adicionar `material_genetico` em `ENTITY_PK_MAP` (`'id'`), `ENTITY_API_PK_MAP` (`'idMaterial'`), `SYNC_ENTITY_PATH` (`'material-genetico'`) e o case em `getEntityExtras`. A tabela `material_genetico` já existe no schema local.
- Habilita: picker de sêmen/óvulo offline e resolução de pai/mãe origem-sêmen no `bufaloService.getBufaloDetalhes`.
