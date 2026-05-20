# Offline-First Completo — Design / Análise das 3 Frentes

> **Status:** Em brainstorming. Documento vivo — captura o raciocínio e as decisões tomadas até agora. Há itens em aberto marcados como **[ABERTO]** no fim.
>
> **Data:** 2026-05-20
>
> **Objetivo:** Levar o app mobile (`dsm5-buffs-mobile`) a funcionar 100% offline-first, analisando as 3 frentes (banco Supabase, buffs-api, mobile) e produzindo um plano faseado de alterações no mobile + issues de melhoria na API.

---

## Contexto

O mobile foi migrado para arquitetura offline-first com SQLite (`@op-engineering/op-sqlite`). O fluxo é:
- **PULL (leitura):** `syncService` baixa entidades dos endpoints `/sync/*` da API e popula tabelas locais.
- **PUSH (escrita):** escritas offline vão para a fila `pending_operations` e são empurradas para a API REST quando há conexão (não há rotas `/sync` para escrita — reusa o REST existente, por decisão de projeto).

A buffs-api fica em `/home/v1nisouza/Área de trabalho/PASTA PI/buffs-api`. **Restrição de segurança: nunca ler arquivos `.env` da API.**

Schema do Supabase documentado em `docs/sql/apiusa.md`. Issue original do módulo `/sync` em `docs/issue-sync-endpoints.md`.

---

## Decisões tomadas (brainstorming)

1. **Escopo:** Offline-first **completo** — push, lotes/piquetes, material genético, ordenha e dashboards locais.
2. **Entidades sem `/sync` flat:** abordagem **mista** — mobile usa os endpoints que já existem agora (para destravar), E abrimos issues para a API padronizar `/sync` flat depois.
3. **Dashboards offline:** **calcular localmente** a partir dos dados crus sincronizados (não cachear, não "indisponível").
4. **Conserto do push:** **registry por entidade** (`pushEndpoints.ts`) — opção A.
5. **Ordem das fases:** issues de API (Fase 4) **antes** dos dashboards locais (Fase 5).
6. **Ordenha / amarração com reprodução:** **não** replicar o `parto → ciclo` offline (é composto server-side). Ver seção "Ordenha".

---

## Análise das 3 frentes

### 1. Banco Supabase (fonte da verdade)
Schema relacional completo (`docs/sql/apiusa.md`). Entidades relevantes ao mobile: `Bufalo`, `Raca`, `Grupo`, `Lote`, `MaterialGenetico`, `DadosZootecnicos`, `Medicacoes`, `DadosSanitarios`, `DadosReproducao`, `CicloLactacao`, `DadosLactacao` (ordenha diária), `Alertas`.

No schema **Drizzle** da API, ~todas as tabelas têm `deleted_at` (soft-delete) — fundamental para o sync purgar registros deletados localmente.

### 2. API (buffs-api)
- REST rico: toda entidade tem `POST/GET/PATCH/DELETE` + `restore` + `deleted/all`.
- Módulo `/sync` tem **dois conjuntos**:
  - **Flat** (query param `propriedadeId`): `bufalos`, `lactacao/ciclos`, `sanitario/eventos`, `reproducao`, `zootecnico/pesagens`, `grupos`, `alertas`, `racas`, `medicacoes`. Retornam **arrays crus** (sem normalização de `id`, sem paginação). NÃO filtram soft-deletes (bom p/ sync).
  - **Paginado antigo** (`:id_propriedade/...`): wrapper `{data, meta}` normalizado via `normalizeRecord` (adiciona `id`, `updated_at`, `deleted_at`). Inclui `material-genetico`, `coberturas`, dashboards.
- **Sem endpoint de sync (flat nem paginado por propriedade) para:** `lotes` (só REST `GET /lotes/propriedade/:id`), `ordenha` por propriedade (só global paginado, ou por búfala/ciclo).
- `registrar-parto` (`PATCH /cobertura/:id/registrar-parto`) é **composto server-side**: atualiza cobertura + cria `CicloLactacao` + calcula `dt_secagem_prevista` + cria alerta de secagem (`cobertura.service.ts:487`).

#### Paths base dos controllers (para o push registry)
| Entidade (local) | Controller base | Observação |
|---|---|---|
| bufalos | `/bufalos` | mover grupo: `PATCH /bufalos/grupo/mover` |
| ciclos_lactacao | `/lactacao` | |
| pesagens | `/dados-zootecnicos` | CREATE: `POST /dados-zootecnicos/bufalo/:id_bufalo` |
| eventos_sanitarios | `/dados-sanitarios` | |
| reproducoes | `/cobertura` | registrar-parto: `PATCH /cobertura/:id/registrar-parto` |
| medicamentos | `/medicamentos` | |
| grupos | `/grupos` | |
| racas | `/racas` | |
| alertas | `/alertas` | marcar visto: `PATCH /alertas/:id/visto` |
| material_genetico | `/material-genetico` | |
| ordenha | `/ordenhas` | |
| lotes | `/lotes` | |

### 3. Mobile (estado atual)
**PULL — funcionando após fixes da sessão de 2026-05-20** (migração v5, normalização de `id` via `ENTITY_API_PK_MAP`, filtros `id IS NOT NULL`, `_synced` em racas/medicamentos, remoção de material_genetico que não tinha rota flat).

**PUSH — QUEBRADO para várias entidades.** O `pendingOperationsService.deriveEndpointMethod` é genérico (`/{entity}/{id}`) e o mapa `ENTITY_ROUTE` está dessincronizado dos nomes usados nos `enqueue`. Endpoints gerados errados:

| Entidade no enqueue | Gerado (ERRADO) | Correto |
|---|---|---|
| `pesagens` CREATE | `POST /pesagens` | `POST /dados-zootecnicos/bufalo/:id_bufalo` |
| `pesagens` UPDATE/DELETE | `/pesagens/:id` | `/dados-zootecnicos/:id` |
| `eventos_sanitarios` | `/eventos_sanitarios` | `/dados-sanitarios` |
| `reproducoes` | `/reproducoes` | `/cobertura` |
| `alertas` (visto) | `PATCH /alertas/:id` | `PATCH /alertas/:id/visto` |
| `bufalos` (mover grupo) | `PATCH /bufalos/:id` | `PATCH /bufalos/grupo/mover` |

Resultado: escritas offline desses fluxos falham silenciosamente (5 retries e travam na fila).

**Telas online-only (sem fallback offline, quebram/vaziam sem rede):** `piqueteService` (lotes — getAll + create), dashboards (`lactacaoService` estatísticas/laticínios, `reproducaoService` dashboard, `propriedadeService` propriedades/dashboard). Auth pode continuar online-only.

---

## Roadmap faseado (cada fase entrega software testável)

```
Fase 1 — Fila de PUSH (fundação)         ← desbloqueia TODAS as escritas offline
Fase 2 — Lotes/piquetes offline           ← independente; alimenta dashboards
Fase 3 — Material genético + Ordenha       ← alimenta reprodução/lactação + dashboards
Fase 4 — Issues de melhoria na API         ← /sync flat para lotes/material/ordenha
Fase 5 — Dashboards locais                 ← última, depende de 2, 3 e 4
```

### Fase 1 — Conserto da fila de PUSH (APROVADA)

**Solução:** registry por entidade em `src/services/sync/pushEndpoints.ts`.

```typescript
type PushResolver = (op: OperationType, payload: any) =>
  { endpoint: string; method: string; body?: any } | null;

const PUSH_ENDPOINTS: Record<string, PushResolver> = {
  bufalos: (op, p) => {
    if (op === 'UPDATE' && p.idNovoGrupo)
      return { endpoint: '/bufalos/grupo/mover', method: 'PATCH',
               body: { idsBufalos: p.idsBufalos, idNovoGrupo: p.idNovoGrupo, motivo: p.motivo } };
    if (op === 'CREATE') return { endpoint: '/bufalos', method: 'POST', body: p };
    if (op === 'UPDATE') return { endpoint: `/bufalos/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/bufalos/${p.id}`, method: 'DELETE' };
  },
  pesagens: (op, p) => {
    if (op === 'CREATE') return { endpoint: `/dados-zootecnicos/bufalo/${p.bufaloId}`, method: 'POST', body: p };
    if (op === 'UPDATE') return { endpoint: `/dados-zootecnicos/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/dados-zootecnicos/${p.id}`, method: 'DELETE' };
  },
  eventos_sanitarios: (op, p) => { /* → /dados-sanitarios */ },
  reproducoes:        (op, p) => { /* → /cobertura (CREATE/UPDATE) */ },
  alertas:            (op, p) => ({ endpoint: `/alertas/${p.id}/visto`, method: 'PATCH' }),
  ciclos_lactacao:    (op, p) => { /* → /lactacao */ },
  // Fase 2+: lotes, material_genetico, ordenha
};
```

**Mudanças:**
- `pendingOperationsService.enqueue` consulta o registry (remove `ENTITY_ROUTE` + `deriveEndpointMethod`).
- Cada `enqueue` deve carregar os campos que a rota exige (ex.: `pesagens` precisa de `bufaloId` no payload — já tem).
- Unit tests por entidade × operação (endpoint/método/body).
- `syncService.push` **não muda** (já lê `op.endpoint`/`op.method`/`op.payload`).

**Decisão:** limpar a tabela `pending_operations` no próximo bump de migração (são writes que nunca subiram com endpoint errado) — em vez de tentar recalcular endpoints das pendentes.

### Fase 2 — Lotes/piquetes offline (APROVADA)

Padrão: tabela local + sync + religar service.
- Tabela `lotes` (extras: `propriedadeId`, `idGrupo`) + maps + bump de migração.
- **Sem `/sync/lotes`** → sync via REST existente `GET /lotes/propriedade/:id` (array cru; sem incremental/soft-delete por ora). `syncService` ganha caso especial para montar essa URL em vez de `/sync/...`.
- `piqueteService.getAll` → lê do SQLite local (resolve o erro de rede do AnimalDetail paliado em 2026-05-20).
- `piqueteService.create` → `enqueue('lotes', 'CREATE', ...)` → registry `POST /lotes`.

### Fase 3 — Material genético + Ordenha (APROVADA, com nuance de ordenha)

**Material genético:** re-adicionar tabela local. Sync via paginado existente `:id_propriedade/material-genetico` (`{data, meta}`). `syncService` precisa lidar com **paginação** (loop até esgotar). Religa tela de reprodução (seleção sêmen/óvulo) e nomes de pai/mãe.

**Ordenha — resolução da amarração com reprodução:**
A API cria o ciclo automaticamente no `registrar-parto` (server-side). Replicar offline causaria **ciclo duplicado** (UUID local vs UUID servidor). Portanto:

| Necessidade | Solução |
|---|---|
| Quem está em ordenha (lista) | Deriva de `ciclos_lactacao` com status "Em Lactação" — **já sincronizado, zero trabalho novo** |
| Parto registrado offline | Enfileira `registrar-parto`; búfala aparece na ordenha após o próximo sync (limitação documentada, sem duplicar ciclo) |
| Registrar ordenha (leite) offline | Tabela local `ordenha` + push `POST /ordenhas` |
| Histórico de ordenhas p/ dashboards | Sync — **[ABERTO]** ver abaixo |

**Não replicamos o `parto → ciclo` offline.** A lista de ordenha sai dos ciclos já sincronizados.

### Fase 4 — Issues de melhoria na API

Abrir issues (não implementar na API nesta sessão) para padronizar `/sync` flat:
- `GET /sync/lotes?propriedadeId=` (array cru, incremental, com soft-delete)
- `GET /sync/material-genetico?propriedadeId=` (flat, substitui o paginado)
- `GET /sync/ordenha?propriedadeId=` (todas as ordenhas da propriedade — **não existe hoje**, é o maior bloqueio para dashboards de produção/lactação)

Após cada issue ser atendida, o mobile troca o mecanismo interino pelo endpoint flat.

### Fase 5 — Dashboards locais

Replicar no mobile as 4 agregações de `dashboard.service.ts` a partir dos dados locais:
- **getStats:** bufalos (com raça), búfalas lactando (ciclos status), contagem de lotes, contagem de usuários. Depende de: bufalos✓, ciclos✓, **lotes (Fase 2)**, usuários (sem fonte local — aproximar/omitir).
- **getLactacaoMetricas:** ciclos + ordenhas (totalLeite, qtdOrdenhas por ciclo) → depende de **ordenha (Fase 3/4)**.
- **getProducaoMensal:** ordenhas por período → depende de **ordenha (Fase 3/4)**.
- **getReproducaoMetricas:** reproduções por status → depende de reproducoes✓.

Lógica de cálculo: ver `dashboard.service.ts` (linhas 24-274) — agregações puras (Map/reduce, classificação por faixas da média do rebanho, série histórica mensal, variação percentual).

---

## Itens em aberto [ABERTO]

1. **Histórico de ordenhas para dashboards (Fase 3 vs Fase 4):** sync interino **por ciclo** agora (loop `GET /ordenhas/ciclo/:id` — N+1 requisições, funciona sem mexer na API), OU deixar o histórico só para depois da Fase 4 (com `/sync/ordenha` flat). *Pendente de decisão do usuário.*
2. Detalhamento fino das Fases 4 e 5 ainda não apresentado em seção própria no brainstorming.
3. Contagem de usuários no `getStats` local (sem fonte local hoje) — aproximar ou omitir.

---

## Próximos passos
1. Resolver itens em aberto.
2. Concluir apresentação das seções (Fases 4 e 5) e aprovar.
3. Self-review do spec.
4. Usuário revisa o spec.
5. Invocar `writing-plans` para gerar o plano de implementação da Fase 1 (e seguintes).
