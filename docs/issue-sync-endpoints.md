# Issue: Criar módulo `/sync` na buffs-api para suporte offline-first do app mobile

## Contexto e motivação

O app mobile foi migrado para arquitetura **offline-first** com SQLite. Em vez de chamar a API a cada tela, o app agora mantém um banco de dados local e sincroniza periodicamente com a buffs-api.

O `SyncService` do app dispara sincronização em 4 momentos: ao abrir o app (foreground), ao reconectar à internet, a cada 5 minutos, e manualmente. Para isso funcionar, precisa de endpoints que retornem **todos os registros de uma entidade por propriedade**, incluindo os deletados (soft delete), com suporte a **sync incremental** via `updated_at`.

Os endpoints existentes (ex: `GET /bufalos/propriedade/:id`) têm paginação e não retornam registros com `deletedAt` preenchido, então não servem para esse propósito.

---

## O que precisa ser criado

Um novo módulo NestJS em `src/modules/sync/` com um único controller `SyncController` e os endpoints abaixo.

### Estrutura sugerida de arquivos

```
src/modules/sync/
  sync.module.ts
  sync.controller.ts
  sync.service.ts
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
```

Seguir o mesmo padrão dos outros módulos: `DatabaseService` injetado no repository, `LoggerService` para erros, guard `SupabaseAuthGuard` no controller.

---

## Regras gerais de resposta

**Todos os endpoints retornam um array direto** (sem wrapper de paginação, sem `data`, sem `meta`):

```json
[ { ... }, { ... } ]
```

**Por que incluir registros deletados?**
O app mantém um SQLite local. Quando um registro é deletado na API (soft delete), o app só sabe que precisa remover do banco local se o endpoint retornar o registro com `deletedAt` preenchido. Sem isso, o dado deletado fica "fantasma" no dispositivo para sempre.

**Por que sem paginação?**
O sync baixa tudo de uma vez para popular o banco local. Paginação quebraria o fluxo de sync.

**Por que `updated_at`?**
Na primeira abertura do app (first sync) baixamos tudo. Nas sincronizações seguintes, enviamos a data do último sync e a API retorna só o que mudou — muito mais eficiente.

---

## Query params comuns

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `propriedadeId` | `string (UUID)` | Sim (exceto `/sync/racas`) | Filtra pelo ID da propriedade |
| `updated_at` | `string (ISO 8601)` | Não | Se informado, retorna só registros com `updatedAt >= updated_at` |

---

## Endpoint por endpoint

---

### `GET /sync/bufalos`

**Tabela Drizzle:** `bufalo` (`src/database/schema.ts`)

**Por que existe:** O app exibe a listagem do rebanho, detalhes do animal, filtros por sexo/raça/maturidade — tudo offline. Precisa de todos os búfalos da propriedade no SQLite local.

**Query Drizzle a implementar:**
```ts
db.select().from(bufalo).where(
  and(
    eq(bufalo.idPropriedade, propriedadeId),
    // + gte(bufalo.updatedAt, updated_at) se informado
  )
)
// incluir join com raca para trazer nomeRaca
```

**Resposta esperada:**
```json
[
  {
    "idBufalo": "a1b2c3d4-0000-0000-0000-000000000001",
    "nome": "Estrela",
    "brinco": "A001",
    "microchip": "982000411234567",
    "dtNascimento": "2020-03-15T00:00:00.000Z",
    "nivelMaturidade": "A",
    "sexo": "F",
    "status": true,
    "motivoInativo": null,
    "idRaca": "r1r1r1r1-0000-0000-0000-000000000001",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "idGrupo": "g1g1g1g1-0000-0000-0000-000000000001",
    "origem": "NV",
    "categoria": "VZ",
    "idPai": null,
    "idMae": null,
    "raca": { "nome": "Murrah" },
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "deletedAt": null
  },
  {
    "idBufalo": "a1b2c3d4-0000-0000-0000-000000000002",
    "nome": "Trovão",
    "brinco": "B010",
    "microchip": null,
    "dtNascimento": "2019-07-20T00:00:00.000Z",
    "nivelMaturidade": "A",
    "sexo": "M",
    "status": false,
    "motivoInativo": "Vendido",
    "idRaca": "r1r1r1r1-0000-0000-0000-000000000001",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "idGrupo": null,
    "origem": "NV",
    "categoria": "TO",
    "idPai": null,
    "idMae": null,
    "raca": { "nome": "Murrah" },
    "createdAt": "2023-05-01T08:00:00.000Z",
    "updatedAt": "2026-05-17T14:00:00.000Z",
    "deletedAt": "2026-05-17T14:00:00.000Z"
  }
]
```

> O segundo objeto tem `deletedAt` preenchido — o app vai deletar esse registro do SQLite local.

---

### `GET /sync/lactacao/ciclos`

**Tabela Drizzle:** `ciclolactacao`

**Por que existe:** A tela de lactação exibe os ciclos ativos da propriedade offline. O app precisa saber quais búfalas estão em lactação, data de parto, previsão de secagem e status.

**Query Drizzle a implementar:**
```ts
db.select().from(ciclolactacao).where(
  and(
    eq(ciclolactacao.idPropriedade, propriedadeId),
    // + gte(ciclolactacao.updatedAt, updated_at) se informado
  )
)
// incluir join com bufalo (como bufala) para trazer nome, brinco, raca
```

**Resposta esperada:**
```json
[
  {
    "idCicloLactacao": "c1c1c1c1-0000-0000-0000-000000000001",
    "idBufala": "a1b2c3d4-0000-0000-0000-000000000001",
    "dtParto": "2026-01-10T00:00:00.000Z",
    "padraoDias": 305,
    "dtSecagemPrevista": "2026-11-11T00:00:00.000Z",
    "dtSecagemReal": null,
    "status": "Em Lactação",
    "observacao": null,
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "bufala": {
      "nome": "Estrela",
      "brinco": "A001",
      "raca": "Murrah"
    },
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "deletedAt": null
  }
]
```

---

### `GET /sync/sanitario/eventos`

**Tabela Drizzle:** `dadossanitarios`

**Por que existe:** A tela de sanitário exibe o histórico de tratamentos, medicações e vacinas por animal — offline.

**Atenção:** `dadossanitarios` **não tem `idPropriedade`**. Filtrar via join com `bufalo`:
```ts
db.select()
  .from(dadossanitarios)
  .innerJoin(bufalo, eq(dadossanitarios.idBufalo, bufalo.idBufalo))
  .where(
    and(
      eq(bufalo.idPropriedade, propriedadeId),
      // + gte(dadossanitarios.updatedAt, updated_at) se informado
    )
  )
// incluir join com medicacoes para trazer medicacao e tipoTratamento
```

**Resposta esperada:**
```json
[
  {
    "idSanit": "s1s1s1s1-0000-0000-0000-000000000001",
    "idBufalo": "a1b2c3d4-0000-0000-0000-000000000001",
    "idUsuario": "u1u1u1u1-0000-0000-0000-000000000001",
    "idMedicao": "m1m1m1m1-0000-0000-0000-000000000001",
    "dtAplicacao": "2026-04-15T00:00:00.000Z",
    "dosagem": "5.00",
    "unidadeMedida": "ml",
    "doenca": "Mastite",
    "necessitaRetorno": true,
    "dtRetorno": "2026-04-22T00:00:00.000Z",
    "observacao": "Animal apresentou febre",
    "medicacoe": {
      "medicacao": "Oxitetraciclina",
      "tipoTratamento": "Antibiótico"
    },
    "createdAt": "2026-04-15T10:00:00.000Z",
    "updatedAt": "2026-04-15T10:00:00.000Z",
    "deletedAt": null
  }
]
```

> Notar que o join com `medicacoes` vem como `medicacoe` (nome da relação no schema Drizzle — manter consistente com o que já existe em outros endpoints sanitários).

---

### `GET /sync/reproducao`

**Tabela Drizzle:** `dadosreproducao`

**Por que existe:** A tela de reprodução exibe coberturas, status de gestação e previsão de parto offline.

**Query Drizzle:**
```ts
db.select().from(dadosreproducao).where(
  and(
    eq(dadosreproducao.idPropriedade, propriedadeId),
    // + gte(dadosreproducao.updatedAt, updated_at) se informado
  )
)
// join com bufalo duas vezes: uma para idBufala (fêmea), outra para idBufalo (macho)
// mesmo padrão do /cobertura/propriedade/:id que já existe
```

**Resposta esperada:**
```json
[
  {
    "idReproducao": "rep1rep1-0000-0000-0000-000000000001",
    "idBufala": "a1b2c3d4-0000-0000-0000-000000000001",
    "idBufalo": null,
    "idSemen": "mat1mat1-0000-0000-0000-000000000001",
    "idOvulo": null,
    "tipoInseminacao": "Inseminação Artificial",
    "status": "Em Andamento",
    "tipoParto": null,
    "dtEvento": "2026-03-10T00:00:00.000Z",
    "ocorrencia": null,
    "previsaoParto": "2026-12-20T00:00:00.000Z",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "bufalo_idBufala": {
      "nome": "Estrela",
      "brinco": "A001"
    },
    "bufalo_idBufalo": null,
    "createdAt": "2026-03-10T10:00:00.000Z",
    "updatedAt": "2026-03-10T10:00:00.000Z",
    "deletedAt": null
  }
]
```

---

### `GET /sync/zootecnico/pesagens`

**Tabela Drizzle:** `dadoszootecnicos`

**Por que existe:** A tela de zootécnico exibe histórico de pesagens por animal offline.

**Atenção:** `dadoszootecnicos` **não tem `idPropriedade`**. Filtrar via join com `bufalo`:
```ts
db.select()
  .from(dadoszootecnicos)
  .innerJoin(bufalo, eq(dadoszootecnicos.idBufalo, bufalo.idBufalo))
  .where(
    and(
      eq(bufalo.idPropriedade, propriedadeId),
      // + gte(dadoszootecnicos.updatedAt, updated_at) se informado
    )
  )
```

**Resposta esperada:**
```json
[
  {
    "idZootec": "z1z1z1z1-0000-0000-0000-000000000001",
    "idBufalo": "a1b2c3d4-0000-0000-0000-000000000001",
    "idUsuario": "u1u1u1u1-0000-0000-0000-000000000001",
    "peso": "480.50",
    "condicaoCorporal": "3.50",
    "corPelagem": "Preta",
    "formatoChifre": "Lira",
    "porteCorporal": "Grande",
    "dtRegistro": "2026-04-01T00:00:00.000Z",
    "tipoPesagem": "Pesagem de rotina",
    "createdAt": "2026-04-01T08:00:00.000Z",
    "updatedAt": "2026-04-01T08:00:00.000Z",
    "deletedAt": null
  }
]
```

---

### `GET /sync/grupos`

**Tabela Drizzle:** `grupo`

**Por que existe:** Grupos são usados para categorizar os animais no rebanho e no mapa de piquetes. O app precisa deles offline para exibir o nome do grupo no perfil do animal.

**Query Drizzle:**
```ts
db.select().from(grupo).where(
  and(
    eq(grupo.idPropriedade, propriedadeId),
    // + gte(grupo.updatedAt, updated_at) se informado
  )
)
```

**Resposta esperada:**
```json
[
  {
    "idGrupo": "g1g1g1g1-0000-0000-0000-000000000001",
    "nomeGrupo": "Lactantes",
    "color": "#4CAF50",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "deletedAt": null
  },
  {
    "idGrupo": "g1g1g1g1-0000-0000-0000-000000000002",
    "nomeGrupo": "Reprodução",
    "color": "#F44336",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2026-05-10T09:00:00.000Z",
    "deletedAt": "2026-05-10T09:00:00.000Z"
  }
]
```

---

### `GET /sync/alertas`

**Tabela Drizzle:** `alertas`

**Por que existe:** A tela de notificações exibe alertas pendentes (retorno de tratamento, secagem, diagnóstico de gestação etc.) offline.

**Query Drizzle:**
```ts
db.select().from(alertas).where(
  and(
    eq(alertas.idPropriedade, propriedadeId),
    // + gte(alertas.updatedAt, updated_at) se informado
  )
)
// join com bufalo para trazer nome e brinco — igual ao findByPropriedade do AlertaRepositoryDrizzle
```

**Resposta esperada:**
```json
[
  {
    "idAlerta": "al1al1al-0000-0000-0000-000000000001",
    "animalId": "a1b2c3d4-0000-0000-0000-000000000001",
    "grupo": "Lactantes",
    "localizacao": "Piquete 3",
    "motivo": "Retorno de tratamento sanitário próximo",
    "nicho": "SANITARIO",
    "dataAlerta": "2026-05-20T00:00:00.000Z",
    "prioridade": "ALTA",
    "observacao": null,
    "visto": false,
    "idEventoOrigem": "s1s1s1s1-0000-0000-0000-000000000001",
    "tipoEventoOrigem": "SANITARIO",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "bufalo": {
      "nome": "Estrela",
      "brinco": "A001"
    },
    "createdAt": "2026-05-15T08:00:00.000Z",
    "updatedAt": "2026-05-15T08:00:00.000Z",
    "deletedAt": null
  }
]
```

---

### `GET /sync/racas`

**Tabela Drizzle:** `raca`

**Por que existe:** O cadastro de búfalo exige seleção de raça. O app popula esse select offline a partir da tabela local de raças.

**Sem filtro de propriedade** — raças são globais no sistema.

**Query Drizzle:**
```ts
db.select().from(raca)
// com updated_at: .where(gte(raca.updatedAt, updated_at))
```

**Resposta esperada:**
```json
[
  {
    "idRaca": "r1r1r1r1-0000-0000-0000-000000000001",
    "nome": "Murrah",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "deletedAt": null
  },
  {
    "idRaca": "r1r1r1r1-0000-0000-0000-000000000002",
    "nome": "Jafarabadi",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "deletedAt": null
  },
  {
    "idRaca": "r1r1r1r1-0000-0000-0000-000000000003",
    "nome": "Mediterrâneo",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2026-05-01T00:00:00.000Z",
    "deletedAt": "2026-05-01T00:00:00.000Z"
  }
]
```

---

### `GET /sync/medicacoes`

**Tabela Drizzle:** `medicacoes`

**Por que existe:** O registro sanitário exige seleção de medicamento. O app popula esse select offline a partir da tabela local de medicações da propriedade.

**Filtrar por propriedade** — medicações são criadas por propriedade (diferente de raças).

**Query Drizzle:**
```ts
db.select().from(medicacoes).where(
  and(
    eq(medicacoes.idPropriedade, propriedadeId),
    // + gte(medicacoes.updatedAt, updated_at) se informado
  )
)
```

**Resposta esperada:**
```json
[
  {
    "idMedicacao": "m1m1m1m1-0000-0000-0000-000000000001",
    "tipoTratamento": "Antibiótico",
    "medicacao": "Oxitetraciclina",
    "descricao": "Amplo espectro para infecções bacterianas",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "createdAt": "2024-06-01T00:00:00.000Z",
    "updatedAt": "2024-06-01T00:00:00.000Z",
    "deletedAt": null
  },
  {
    "idMedicacao": "m1m1m1m1-0000-0000-0000-000000000002",
    "tipoTratamento": "Antiparasitário",
    "medicacao": "Ivermectina",
    "descricao": "Para controle de endo e ectoparasitas",
    "idPropriedade": "p1p1p1p1-0000-0000-0000-000000000001",
    "createdAt": "2024-06-01T00:00:00.000Z",
    "updatedAt": "2026-04-10T11:00:00.000Z",
    "deletedAt": "2026-04-10T11:00:00.000Z"
  }
]
```

---

## Padrão de implementação (seguir o que já existe)

O controller deve seguir o mesmo padrão do `AlertasController`:

```ts
@ApiBearerAuth('JWT-auth')
@UseGuards(SupabaseAuthGuard)
@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('bufalos')
  syncBufalos(
    @Query('propriedadeId', ParseUUIDPipe) propriedadeId: string,
    @Query('updated_at') updatedAt?: string,
  ) {
    return this.syncService.getBufalos(propriedadeId, updatedAt);
  }

  // ... demais endpoints
}
```

O `SyncService` delega para os repositories, que usam o `DatabaseService` injetado — mesmo padrão do `AlertaRepositoryDrizzle`.

---

## Validação de acesso à propriedade

Usar o mesmo `AuthHelperService.validatePropriedadeAccess()` que os outros controllers já usam para garantir que o usuário só sincroniza dados da sua propriedade.

---

## Observações finais

- **Não remover** os endpoints existentes — eles continuam sendo usados para buscas paginadas, filtros avançados, etc.
- O `updated_at` deve comparar com `updatedAt` da tabela, **não** com `createdAt`
- Os índices `idx_*_deleted_at` já existem no schema mas filtram `WHERE deleted_at IS NULL` — as queries de sync **não devem aplicar esse filtro**, precisam retornar inclusive os registros com `deletedAt` preenchido
- Registrar o `SyncModule` no `app.module.ts` após criado
