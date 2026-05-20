# Offline-First Completo — Spec / Handoff

> **Status:** Em andamento. Fases 1–3 implementadas; Fase 4 (issues da API) redigida; Fase 5 (dashboards) e o trabalho complementar de escrita offline pendentes.
>
> **Última atualização:** 2026-05-20 · **Branch:** `feature/design-mobile` · **Migração local atual:** v8
>
> **Objetivo:** Levar o app mobile (`dsm5-buffs-mobile`) a funcionar offline-first de verdade — leitura (pull) e escrita (push) — analisando as 3 frentes (banco Supabase, buffs-api, mobile).
>
> **Como usar este doc:** é o ponto de partida da próxima sessão. Leia o "Estado atual" e pule para "O que falta fazer".

---

## TL;DR para a próxima sessão

- **Leitura offline (pull):** funcionando para bufalos, ciclos_lactacao, grupos, racas, pesagens, medicamentos, eventos_sanitarios, alertas, reproducoes e **lotes**.
- **Escrita offline (push):** os endpoints agora são roteados corretamente (Fase 1), MAS **ainda há um bloqueio não resolvido**: a API usa `forbidNonWhitelisted: true`, então o body que o mobile envia (com `id`/`createdAt`/`updatedAt` extras) **é rejeitado com 400**. **Creates offline ainda não sobem** até implementarmos o "body limpo" (ver "O que falta", item 1).
- **Issues da API redigidas** (em `docs/issue-*.md`) — falta abrir no repo da buffs-api e o time implementar.
- **Falta:** body limpo + ordem na fila (mobile), dashboards locais (Fase 5), e a integração das rotas `/sync` flat quando a API entregar.

---

## Contexto

Arquitetura offline-first com SQLite (`@op-engineering/op-sqlite`):
- **PULL (leitura):** `syncService` baixa entidades de `/sync/*` e popula tabelas locais.
- **PUSH (escrita):** escritas offline vão para a fila `pending_operations` e são empurradas para a API REST quando há conexão (sem rotas `/sync` de escrita — reusa o REST existente).

buffs-api: `/home/v1nisouza/Área de trabalho/PASTA PI/buffs-api`. **Restrição: nunca ler `.env` da API.**
Schema Supabase: `docs/sql/apiusa.md`. Issue original do `/sync`: `docs/issue-sync-endpoints.md`.

**Migrações:** `src/database/migrations.ts` faz **drop-all + recreate** sempre que `user_version < CURRENT_VERSION` (recria do schema e re-sincroniza da API). Cada fase que muda schema bumpa a versão. Hoje em **v8**.

---

## Decisões firmadas (não revisitar sem motivo)

1. **Escopo:** offline-first completo (push, lotes, ordenha, dashboards locais). Material genético **fora** — sem consumidor no app (form usa texto livre).
2. **Entidades sem `/sync` flat:** abordagem **mista** — mobile usa o que já existe agora; issues abertas para a API padronizar depois.
3. **Dashboards offline:** **calcular localmente** dos dados crus (não cachear).
4. **Push:** **registry por entidade** (`src/services/sync/pushEndpoints.ts`).
5. **Ordenha:** **não** replicar `parto → ciclo` offline (é composto server-side). Lista de lactação sai dos ciclos já sincronizados.
6. **Ghost-record / escrita offline robusta:** resolver via **`id` opcional do cliente na API** (issue redigida) + trabalho mobile (body limpo + ordem). **Não** criar rota batch `/sync/push` (pularia side-effects).
7. **Não tocar** no `ValidationPipe` global da API (risco de quebrar todos os fluxos). Mudanças na API são **aditivas** (campo opcional).

---

## Análise das 3 frentes (referência)

### Supabase
Schema relacional completo. ~Todas as tabelas têm `deleted_at` (soft-delete) no Drizzle da API — essencial pro sync purgar deletados.

### API (buffs-api)
- REST por entidade: `POST/GET/PATCH/DELETE` + `restore` + `deleted/all`.
- `ValidationPipe` global (`main.ts:244`): `whitelist: true`, **`forbidNonWhitelisted: true`**, `transform: true`. → **body com campo fora do DTO = 400.**
- `/sync` tem **flat** (query `propriedadeId`, array cru, sem soft-delete filtrado): `bufalos`, `lactacao/ciclos`, `sanitario/eventos`, `reproducao`, `zootecnico/pesagens`, `grupos`, `alertas`, `racas`, `medicacoes`. E **paginado antigo** (`:id_propriedade/...`, wrapper `{data,meta}`): inclui `material-genetico`, `coberturas`, dashboards.
- **Sem endpoint de sync por propriedade para:** `lotes` (só REST `GET /lotes/propriedade/:id`) e `ordenha` (só global paginado `/ordenhas` ou por búfala/ciclo).
- `registrar-parto` (`PATCH /cobertura/:id/registrar-parto`, `cobertura.service.ts:487`) é **composto**: atualiza cobertura + cria `CicloLactacao` + calcula secagem + cria alerta.
- DTOs de create são **camelCase** e estritos (ex.: `CreateDadosLactacaoDto` = `idBufala`, `qtOrdenha`, `dtOrdenha`...).

#### Paths base dos controllers (referência do push registry)
| Entidade (local) | Controller base | Observação |
|---|---|---|
| bufalos | `/bufalos` | mover grupo: `PATCH /bufalos/grupo/mover` |
| ciclos_lactacao | `/lactacao` | |
| pesagens | `/dados-zootecnicos` | CREATE: `POST /dados-zootecnicos/bufalo/:id_bufalo` |
| eventos_sanitarios | `/dados-sanitarios` | |
| reproducoes | `/cobertura` | registrar-parto: `PATCH /cobertura/:id/registrar-parto` |
| alertas | `/alertas` | marcar visto: `PATCH /alertas/:id/visto` |
| ordenhas | `/ordenhas` | DTO camelCase (`idBufala`,`qtOrdenha`,`dtOrdenha`) |
| lotes | `/lotes` | |

---

## Estado atual — o que já foi implementado

> Tudo em commits no branch `feature/design-mobile`. Cada fase tem um plano em `docs/superpowers/plans/`.

### ✅ Fase 1 — Conserto da fila de PUSH (`plans/2026-05-20-fase1-push-queue.md`)
- Criado `src/services/sync/pushEndpoints.ts` — registry `resolvePushEndpoint(entity, op, payload)` → `{ endpoint, method, body }`, com fallback genérico.
- `pendingOperationsService.enqueue` agora consulta o registry e grava o **body transformado** (importante p/ mover-grupo e registrar-parto).
- Resolvers: `bufalos` (CRUD + `grupo/mover`), `pesagens` (`/dados-zootecnicos/bufalo/:id`), `eventos_sanitarios` (`/dados-sanitarios`), `alertas` (`/:id/visto`), `reproducoes` (`/cobertura` + split `registrar-parto`), `ciclos_lactacao` (`/lactacao`).
- Migração **v6** (limpa a `pending_operations` antiga com endpoints errados).
- Testes: `src/services/sync/__tests__/pushEndpoints.test.ts` (21) + `pendingOperationsService.test.ts`.

### ✅ Fase 2 — Lotes/piquetes offline (`plans/2026-05-20-fase2-lotes-offline.md`)
- Tabela local `lotes` (`propriedadeId`, `idGrupo`) + maps + `getEntityExtras`.
- `syncService.pullEntity` tem caso especial: `lotes` → `GET /lotes/propriedade/:id` (REST; sem incremental/soft-delete até a Fase 4).
- `piqueteService.getAll` lê do SQLite (resolve o erro de rede do AnimalDetail/PiquetesScreen offline). `create` insere local + `enqueue('lotes','CREATE')` (fallback → `POST /lotes`).
- Migração **v7**. Testes: `__tests__/database/schema.test.ts`, `piqueteService.test.ts`, +1 no syncService.

### ✅ Fase 3 — Ordenha offline (`plans/2026-05-20-fase3-ordenha-offline.md`)
- **Só ordenha** (material genético cortado — sem consumidor).
- Tabela local `ordenhas` (write-only nesta fase) + `ENTITY_PK_MAP.ordenhas='id'` + `getEntityExtras`.
- `registrarLactacaoApi` (em `lactacaoService.ts`) reescrito: **adapta snake_case→camelCase** (o DTO exige), insere local + `enqueue('ordenhas','CREATE')` (fallback → `POST /ordenhas`).
- `syncService.pullEntity` **pula** `ordenhas` (sem `/sync/ordenha` até a Fase 4).
- Migração **v8**. Testes atualizados em `lactacaoService.test.ts`, `schema.test.ts`, `syncService.test.ts`.
- **Não tocado** (fora de escopo, sem regressão): `registrarColetaApi`/`registrarEstoqueApi` seguem mal-rotulados como `ciclos_lactacao` (laticínios/produção — fase separada). `encerrarLactacao` já estava correto.

### ✅ Fase 4 — Issues da API redigidas (NÃO implementadas na API)
Arquivos em `docs/`:
- `issue-sync-ordenha.md` 🔴 ALTA — `GET /sync/ordenha` (tabela `dadoslactacao`, PK `idLact`). Único bloqueio real; destrava dashboards de produção/lactação.
- `issue-sync-lotes.md` 🟡 MÉDIA — `GET /sync/lotes` (tabela `lote`, PK `idLote`, join `grupo`). Ganha incremental + soft-delete.
- `issue-sync-material-genetico.md` 🟢 BAIXA — `GET /sync/material-genetico` flat (tabela `materialgenetico`, PK `idMaterial`).
- `issue-client-uuid-create.md` 🔴 ALTA — `id` opcional do cliente nos 7 DTOs de create (resolve ghost-record + cadeia FK + editar-antes-de-sincronizar).

---

## Descobertas importantes (contexto que custou caro)

1. **`forbidNonWhitelisted: true`** (`main.ts:246`): o body do push com qualquer campo fora do DTO → **400**. Hoje o mobile envia `id`/`createdAt`/`updatedAt`/etc. nos creates → **creates offline ainda não sobem**. É o bloqueio nº 1 da escrita offline. (Mobile-side, sem risco de API.)
2. **Ghost-record + cadeias de dependência:** o app cria offline com UUID local; a API gera o id dela → duplicata. Pior: dado que referencia outro dado criado offline (FK), e editar dado ainda não sincronizado (PATCH 404). A reconciliação só-mobile (rewrite L→S) **não** resolve cadeia/edit-before-sync — só o **id estável** (client-UUID na API) resolve. Cenários confirmados pelo usuário como reais.
3. **DTO de ordenha é camelCase** — exigiu adaptação no `registrarLactacaoApi` (senão 400 mesmo no endpoint certo).
4. **Sem endpoint de ordenha por propriedade** na API — por isso o histórico de ordenha (e os dashboards que dependem dele) ficam para depois do `/sync/ordenha`.

---

## O que falta fazer (próximos passos, em ordem sugerida)

### 1. 🔴 Escrita offline ponta-a-ponta — trabalho MOBILE (não depende da API)
Sem isso, creates offline não sincronizam. Duas peças:
- **(1a) Body limpo:** o push deve enviar **só os campos do DTO** de cada entidade (hoje envia extras → 400 por `forbidNonWhitelisted`). Provável lugar: shaping por entidade no `pushEndpoints.ts` (o registry já decide o `body`; basta restringi-lo aos campos aceitos). Precisa mapear os campos de cada `Create*Dto` da API.
- **(1b) Ordem na fila:** `syncService.push` é FIFO (`ORDER BY createdAt`) mas **continua** se um op falha. Mudar para **parar no primeiro fracasso de pré-requisito** (ou bloquear dependentes), pra CREATE A subir antes de CREATE B / UPDATE A.
> Brainstorming dessa parte já feito (ver "Descobertas" 1–2 e `issue-client-uuid-create.md`). Falta o `id` estável: depende da issue de client-UUID ser implementada na API. Enquanto não for, body-limpo + ordem já fazem creates **isolados** subirem; cadeia/edit-before-sync ficam 100% só após o client-UUID.

### 2. Abrir as 4 issues no repo da buffs-api
`docs/issue-client-uuid-create.md`, `issue-sync-ordenha.md`, `issue-sync-lotes.md`, `issue-sync-material-genetico.md`. Usar `gh issue create` (colar o conteúdo). **Não implementar a API nesta base** (é outro repo/time).

### 3. 🟡 Fase 5 — Dashboards locais (`src/services/dashboards/`)
Espelhar `dashboard.service.ts:24-274` (agregações puras). Disponibilidade:
| Dashboard | Fontes locais | Quando dá pra fazer |
|---|---|---|
| `getStats` | bufalos+raça, ciclos, lotes, usuários (sem fonte local) | **Agora** (usuários: aproximar/omitir) |
| `getReproducaoMetricas` | reproducoes (contagem por status) | **Agora** |
| `getLactacaoMetricas` | ciclos + ordenha | Após `/sync/ordenha` (issue) |
| `getProducaoMensal` | ordenha por período | Após `/sync/ordenha` (issue) |

### 4. Integrar as rotas `/sync` flat quando a API entregar
Cada `issue-sync-*.md` tem a seção "Impacto no mobile" com o que mudar:
- **ordenha:** adicionar `ordenha:'idLact'` em `ENTITY_API_PK_MAP`, path em `SYNC_ENTITY_PATH`, remover o early-return de `ordenhas` em `pullEntity`.
- **lotes:** trocar o caso especial REST pelo `/sync/lotes` (ganha incremental + soft-delete).
- **material-genetico:** re-adicionar nos maps + `getEntityExtras` (a tabela local já existe no schema).

### 5. Bordas conhecidas (tratar quando incomodar)
- **Ciclo via `registrar-parto` offline:** o ciclo é criado server-side com id próprio; ordenha lançada offline pra esse ciclo referenciaria id local divergente. Mexe na lógica composta do parto — rodada separada.
- **`registrarColetaApi`/`registrarEstoqueApi`:** ainda enfileiram como `ciclos_lactacao` (→ `POST /lactacao`, errado). São laticínios/produção; precisam de endpoints próprios (investigar se existem) — fora do escopo atual.
- **Contagem de usuários** no `getStats` local: sem fonte local — aproximar ou omitir.

---

## Limitações atuais (estado real do app hoje)

- **Creates offline não sincronizam ainda** (bloqueio do `forbidNonWhitelisted` — item 1a). Eles ficam na fila; o registro local existe e aparece, mas o push dá 400 até o body-limpo.
- **Duplicata/ghost-record** ocorrerá quando os creates passarem a subir, até o client-UUID na API (item 2 + issue).
- **Lotes:** sem incremental nem purge de deletados até `/sync/lotes`.
- **Ordenha:** write-only (sem histórico do servidor) até `/sync/ordenha`.
- **Dashboards:** ainda online-only (Fase 5 não iniciada).
