# Contexto para IAs —  Buffs Mobile

> Este arquivo é lido automaticamente por Claude Code, Codex e outras ferramentas de IA. Ele descreve o projeto com profundidade suficiente para que uma IA colabore sem perder contexto.

---

## O que é este projeto

Aplicativo mobile **offline-first** para gestão de búfalas leiteiras em propriedades rurais brasileiras. Permite ao fazendeiro registrar e acompanhar todas as operações do rebanho — mesmo sem internet — e sincronizar com o backend quando houver conexão.

**Stack:**
- React Native (Android-only — não rodar comandos iOS/pod install)
- SQLite local via `@op-engineering/op-sqlite`
- Backend NestJS + Supabase (PostgreSQL)
- TypeScript em todo o projeto
- Jest para testes unitários (sem testes de integração ou E2E)

---

## Domínio do negócio

**Entidade central:** `bufalo` (búfala leiteira). Cada búfala pertence a uma `propriedade` e pode estar em um `lote`/`piquete`.

**Módulos principais:**

| Módulo | O quê rastreia |
|---|---|
| **Rebanho** | Cadastro de búfalas (brinco, raça, sexo, status, maturidade) |
| **Lactação** | Ciclos de lactação, ordenhas diárias, estoque de leite, coleta por laticínio |
| **Reprodução** | Coberturas (IA, TE, monta natural), diagnóstico de gestação, registro de parto |
| **Sanitário** | Eventos sanitários (vacinas, vermifugações, tratamentos) por búfala |
| **Zootécnico** | Pesagens e histórico de peso |
| **Lotes/Piquetes** | Agrupamento de animais por área de pastagem |
| **Alertas** | Notificações geradas pelo servidor (secagem próxima, etc.) |

---

## Arquitetura offline-first

### SQLite como fonte de verdade local

O app mantém uma cópia local de todos os dados em `buffs.sqlite`. As telas leem **sempre do SQLite**, nunca diretamente da API.

**Tabelas SQLite:** `bufalos`, `ciclos_lactacao`, `ordenhas`, `reproducoes`, `pesagens`, `eventos_sanitarios`, `alertas`, `lotes`, `racas`, `grupos`, `material_genetico`, `industrias`, `producao_diaria`, `sync_meta`, `pending_operations`.

### Ciclo de sincronização

```
PULL (servidor → SQLite)
  syncService.pull(propriedadeId)
  └─ GET /sync/:propriedadeId/:entidade?updated_at=...
     └─ upsertBatch() → INSERT OR REPLACE INTO <tabela>

PUSH (SQLite → servidor)
  syncService.push()
  └─ lê pending_operations WHERE status = 'PENDING'
     └─ pushEndpoints.ts resolve endpoint + método + body
        └─ apiFetch(endpoint, method, body)
           └─ marca op como DONE, atualiza _synced = 1
```

### pending_operations — fila de escrita offline

Toda operação de escrita (CREATE/UPDATE/DELETE) feita offline vai para a tabela `pending_operations`. O push processa essa fila em ordem FIFO quando há conexão.

**Importante:** se um CREATE falha no push, o UPDATE subsequente desse mesmo registro também vai falhar (FK inválida no servidor). A fila deve ser processada em ordem e parar em caso de erro de dependência.

### Schema e migrations

Toda a estrutura do banco está em `src/database/schema.ts` (`CREATE_TABLES_SQL`). Migrations em `src/database/migrations.ts` — estratégia drop-and-recreate com `PRAGMA user_version`. **Versão atual: 9.**

---

## Padrões de código

### Nomenclatura de campos

- **API e SQLite `_raw`:** camelCase (`idBufala`, `dtOrdenha`, `qtOrdenha`)
- **Payloads internos legacy (interfaces TypeScript):** snake_case (`id_bufala`, `dt_ordenha`) — **não renomear**, apenas adaptar na camada de serviço
- **Tabelas SQLite (colunas extras):** camelCase (`propriedadeId`, `bufaloId`, `updatedAt`)

### Serviços

Cada domínio tem um `*Service.ts` em `src/services/`. Os serviços:
1. Leem do SQLite via `queryAll` / `queryFirst` de `src/database/db.ts`
2. Escrevem localmente com `execute` **e** enfileiram com `enqueue` de `pendingOperationsService.ts`
3. **Nunca** fazem fetch direto à API (exceto `authService.ts` e `syncService.ts`)

### Testes

- Mocks: sempre `jest.mock('../../database/db')` e `jest.mock('../pendingOperationsService')`
- Sem testes de integração — apenas unitários com mocks
- Localização: `src/services/__tests__/` e `__tests__/` na raiz

### `_raw`

Cada registro sincronizável tem uma coluna `_raw TEXT` com o JSON completo do servidor. O dashboard e listagens leem de `_raw` para ter acesso a campos não desnormalizados.

---

## Pendências conhecidas (aguardam correção no backend)

1. **`POST /producao-diaria` e `POST /retiradas` rejeitam campo `id`** — o mobile envia UUID gerado localmente para idempotência no retry; o backend precisa aceitar `id` opcional. Ver `docs/fluxo-operacional.md` para contexto.

2. **7 DTOs de criação precisam aceitar `id` opcional** — para o offline-first funcionar sem duplicatas em reconexão. Afeta: búfalo, lote, ordenha, pesagem, sanitário, reprodução, ciclo lactação.

---

## Convenções importantes

- **Android only:** nunca sugerir comandos iOS (`pod install`, Xcode, etc.)
- **Sem renomear campos de API:** propor lógica/validações, não renomear campos existentes
- **Testes primeiro (TDD):** escrever teste falhando antes da implementação
- **Branch de trabalho:** `feature/offline-first-sqlite` (merge → `main` via PR)
- **Sem Co-Authored-By nos commits**
