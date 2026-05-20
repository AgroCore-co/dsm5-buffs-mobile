# Issue: Aceitar `id` (UUID) opcional gerado pelo cliente nos POST de criação

> **Prioridade: ALTA.** É a base do offline-first de **escrita**. Sem isso, dados criados/editados offline não sincronizam de forma consistente (duplicatas, FKs quebradas, UPDATE em registro inexistente). Mudança **aditiva** — não quebra a web nem outros fluxos.

## Por que precisamos disso (3 cenários reais)

O app mobile é offline-first: cria/edita no SQLite local com um `id` (UUID v4) gerado no cliente e enfileira a operação, fazendo `POST/PATCH` quando reconecta. Como hoje os creates **geram o próprio id e ignoram o do cliente**, o id local diverge do id do servidor. Isso quebra três cenários que **acontecem na prática** no app:

1. **Registro-fantasma (duplicata).** Crio offline → push → servidor gera outro id → no pull seguinte volta como uma **segunda** linha. Duplicata visível.

2. **Cadeia de dependência (FK).** Crio búfalo A **e** uma pesagem/ordenha/sanitário B (que referencia A), tudo offline. No push, B aponta para o id **local** de A; se o servidor gerou outro id para A, B fica **órfão** ou é rejeitado por FK.

3. **Editar antes de sincronizar.** Crio A offline e edito A offline. O `PATCH /a/:idLocal` cai em **404** porque o servidor criou A com outro id.

**Id estável (local == servidor) resolve os três de uma vez:** FKs continuam válidas, o UPDATE encontra o registro, e o pull não duplica.

## Solução

Os endpoints de **criação** passam a aceitar um `id` **opcional** do cliente:

- **`id` no body** (app mobile): a API usa esse UUID como PK.
- **`id` ausente** (web, comportamento atual): a API gera com `uuid_generate_v4()`.

> **Retrocompatível por construção.** A web cria sem `id` e segue idêntica. Nenhuma mudança no front web. **Não** mexe no `ValidationPipe` global nem em `forbidNonWhitelisted`. Os endpoints continuam os mesmos → todos os side-effects (registrar-parto cria ciclo+alerta, categoria do búfalo, etc.) ficam **intactos**.

## Escopo — 7 DTOs de create (entidades criáveis offline)

| Entidade | DTO | Coluna PK |
|---|---|---|
| Búfalo | `CreateBufaloDto` | `idBufalo` |
| Lote/piquete | `CreateLoteDto` | `idLote` |
| Ordenha | `CreateDadosLactacaoDto` | `idLact` |
| Pesagem | DTO de `dados-zootecnicos` (create) | `idZootec` |
| Sanitário | DTO de `dados-sanitarios` (create) | `idSanit` |
| Reprodução | `CreateCoberturaDto` | `idReproducao` |
| Ciclo lactação | DTO de `lactacao` (create) | `idCicloLactacao` |

## Mudança por entidade (mesmo padrão nas 7)

### 1. DTO — campo opcional

```ts
@ApiProperty({ required: false, description: 'UUID gerado pelo cliente (offline-first). Se omitido, o servidor gera.' })
@IsOptional()
@IsUUID('4', { message: 'id deve ser um UUID v4 válido' })
id?: string;
```

### 2. Service — usar o id quando vier

```ts
// a coluna PK já tem DEFAULT uuid_generate_v4()
await db.insert(tabela)
  .values({ ...(dto.id ? { [pkColuna]: dto.id } : {}), /* demais campos */ })
  .returning();
```
Ex.: búfalo → `idBufalo: dto.id`; lote → `idLote: dto.id`; ordenha → `idLact: dto.id`.

### 3. Idempotência (retry seguro)

O push reenvia operações que falharam (até 5x). Um `POST` pode ter **sucesso no servidor mas falhar a resposta** (timeout) → o app reenvia com o **mesmo id**. Tratar a colisão de id como idempotente, **não** como erro:
- Se já existe registro com aquele `id` **na mesma propriedade/dono**: retornar `200/201` com o registro existente (no-op).
- Se existir em **outra** propriedade (UUID v4 colide ~nunca): `409 Conflict`.

## Validação de segurança

- `id` deve ser UUID v4 válido (`@IsUUID('4')`).
- Manter a validação de posse da propriedade que os endpoints já fazem.

## Fora de escopo (tratar depois)

- **Ciclo de lactação criado via `registrar-parto`.** O `PATCH /cobertura/:id/registrar-parto` cria o ciclo **no servidor** (id gerado lá). Se alguém registra parto offline e lança ordenha para esse ciclo antes do sync, a ordenha referenciaria um id de ciclo local divergente. Resolver isso mexe na lógica composta do parto — fica para uma rodada separada.

## Alternativa considerada (e por que não)

- **Rota dedicada `POST /sync/push` (batch):** descartada — vários creates disparam lógica composta server-side (registrar-parto, categoria do búfalo, alertas). Uma rota genérica de upsert pularia essas regras ou teria que reinvocar todos os serviços, virando um caminho de escrita paralelo arriscado de manter. Tornar o `id` opcional nos endpoints existentes preserva toda a lógica.

## Trabalho complementar no mobile (fora desta issue de API)

Para os creates offline funcionarem de ponta a ponta, o mobile precisa (tarefas nossas, sem risco para a API):
1. **Body limpo:** montar o body do push só com os campos do DTO (hoje envia `id`/`createdAt`/`updatedAt`/etc. extras, que o `forbidNonWhitelisted` rejeita com 400).
2. **Ordem na fila:** o push (FIFO por `createdAt`) deve **parar se um pré-requisito falhar**, para CREATE A subir antes de CREATE B / UPDATE A.

Com a API honrando o `id`, o `ON CONFLICT(id)` do `upsertBatch` no pull atualiza a **mesma** linha (sem duplicar) e dispensa qualquer reconciliação L→S no cliente.
