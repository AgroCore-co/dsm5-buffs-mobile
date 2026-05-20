# Issue: Aceitar `id` (UUID) opcional gerado pelo cliente nos POST de criação

> **Prioridade: ALTA.** Resolve em definitivo o problema de **registro-fantasma** (duplicatas) do app mobile offline-first, sem quebrar a web.

## Problema (registro-fantasma)

O app mobile é offline-first. Quando o usuário cria um registro **sem internet**, o app:
1. Gera um `id` (UUID v4) localmente e salva no SQLite com esse id.
2. Enfileira a operação e, ao reconectar, faz `POST` para a API.

Como os endpoints de criação **geram o próprio id** e ignoram o do cliente, ao sincronizar de volta o registro volta com um id **diferente**. Resultado: **duas linhas** para o mesmo dado (a local + a do servidor) = duplicata visível pro usuário.

Isso acontece hoje em `bufalos`, `lotes` (piquetes) e `ordenhas`, e vai acontecer em qualquer entidade criável offline.

## Solução

Permitir que os endpoints de **criação** aceitem um `id` **opcional** vindo do cliente:

- **Se `id` vier no body** (app mobile): a API usa esse UUID como PK do registro.
- **Se `id` NÃO vier** (web, comportamento atual): a API gera com `uuid_generate_v4()` como hoje.

> **Retrocompatível por construção.** A web cria búfalo sem `id` e continua funcionando exatamente igual — o campo é opcional. Nenhuma mudança necessária no front web.

## Mudanças por entidade

Para cada entidade criável offline (`bufalo`, `lote`, `dadoslactacao`/ordenha — e, conforme o app evoluir, sanitário/zootécnico/reprodução):

### 1. DTO de criação

Adicionar o campo opcional (exemplo para `CreateBufaloDto`):

```ts
@ApiProperty({ required: false, description: 'UUID gerado pelo cliente (offline-first). Se omitido, o servidor gera.' })
@IsOptional()
@IsUUID('4', { message: 'id deve ser um UUID v4 válido' })
id?: string;
```

### 2. Service / create

Ao montar o registro para inserir, usar o `id` do DTO quando presente:

```ts
const id = dto.id ?? undefined; // undefined → o default uuid_generate_v4() da coluna assume
await db.insert(tabela).values({ ...(id ? { idBufalo: id } : {}), /* demais campos */ }).returning();
```

> A coluna PK já tem `DEFAULT uuid_generate_v4()` — passar o id explicitamente sobrescreve o default; omitir mantém o comportamento atual.

### 3. Idempotência (importante para retry)

O push do mobile reenvia operações que falharam (até 5 tentativas). Pode acontecer de um `POST` ter **sucesso no servidor mas falhar a resposta** (timeout de rede) → o app tentaria de novo com o **mesmo id**.

Tratar colisão de id de forma idempotente, **não** com erro 500:
- Se já existe um registro com aquele `id` **na mesma propriedade/dono**, retornar `200/201` com o registro existente (no-op), em vez de estourar violação de PK.
- Se o `id` existir em **outra** propriedade (não deveria, UUID v4 colide ~nunca), aí sim rejeitar (`409 Conflict`).

## Validação de segurança

- `id` deve ser UUID v4 válido (`@IsUUID('4')`).
- Manter a validação de posse da propriedade que os endpoints já fazem (o usuário só cria na própria propriedade).

## Alternativa considerada (e por que não)

- **Rota dedicada `POST /sync/push` (batch):** descartada porque vários creates disparam **lógica composta** server-side (ex.: `registrar-parto` cria ciclo de lactação + alerta de secagem; create de búfalo processa categoria). Uma rota genérica de upsert pularia essas regras ou teria que reinvocar todos os serviços — mais complexa e arriscada que tornar o `id` opcional nos endpoints que já existem.

## Impacto no mobile após implementação

- O app já envia o `id` no payload de create (ex.: `createBufalo`, `piqueteService.create`, `registrarLactacaoApi`). Com a API honrando esse id, o `id` local == `id` do servidor → o `ON CONFLICT(id)` do `upsertBatch` no pull atualiza a **mesma** linha, sem duplicar.
- Remove a necessidade de reconciliação L→S no `syncService.push` e resolve também o encadeamento (entidade offline que referencia outra entidade offline).
