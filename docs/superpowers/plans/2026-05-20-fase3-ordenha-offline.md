# Fase 3 — Ordenha Offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps usam checkbox (`- [ ]`).

**Goal:** Permitir registrar ordenha (leite) offline — `registrarLactacaoApi` insere localmente e enfileira `POST /ordenhas` com o payload no formato correto (camelCase).

**Architecture:** Nova tabela local `ordenhas` (write-only nesta fase; o histórico vindo do servidor é Fase 4 com `/sync/ordenha`). `registrarLactacaoApi` deixa de usar o "depósito" `ciclos_lactacao` e passa a inserir em `ordenhas` + enfileirar `ordenhas` CREATE (fallback do registry → `POST /ordenhas`). O `syncService` pula `ordenhas` no pull (sem endpoint flat ainda). Migração v8.

**Tech Stack:** React Native, TypeScript, op-sqlite, Jest 29, react-native-uuid.

**Spec:** `docs/superpowers/specs/2026-05-20-offline-first-completo-design.md` (Fase 3 — só ordenha; material genético adiado por não ter consumidor).

---

## Decisões/descobertas

- **Material genético: fora de escopo.** Nenhum consumidor no app (FormReproductionAdd usa texto livre; pai/mãe vêm do `_raw`/lookup local). Adiado até existir picker.
- **DTO `POST /ordenhas` é camelCase** (`CreateDadosLactacaoDto`): `idBufala`, `idPropriedade`, `idCicloLactacao`, `qtOrdenha`, `periodo?`, `ocorrencia?`, `dtOrdenha`. O `LactacaoRegistroPayload` é snake_case → **adaptar**.
- **`registrarColetaApi` / `registrarEstoqueApi`** continuam mal-rotulados como `ciclos_lactacao` (laticínios/produção, fora de escopo). Não tocar — sem regressão.
- **`encerrarLactacao`** já usa `ciclos_lactacao UPDATE` corretamente (→ `PATCH /lactacao/:id`). Não tocar.
- `ordenhas` precisa estar em `ENTITY_PK_MAP` (=`'id'`) para o `_synced` update do `syncService.push` funcionar, e a tabela precisa existir. Mas o `pull` deve **pular** `ordenhas` (sem `/sync/ordenha` até a Fase 4).
- Push de `ordenhas` usa o **fallback** do registry: `CREATE → POST /ordenhas`.

---

## File Structure

- **Modify** `src/database/schema.ts` — `ordenhas` em `ENTITY_PK_MAP`, `getEntityExtras`, e `CREATE TABLE ordenhas` + índice.
- **Modify** `__tests__/database/schema.test.ts` — testa `ordenhas` nos maps e na CREATE_TABLES_SQL.
- **Modify** `src/database/migrations.ts` — v8 + `ordenhas` em LEGACY_TABLES.
- **Modify** `__tests__/database/migrations.test.ts` — versão 7 → 8.
- **Modify** `src/services/syncService.ts` — `pullEntity` retorna cedo para `ordenhas`.
- **Modify** `src/services/__tests__/syncService.test.ts` — teste que `ordenhas` não chama apiFetch.
- **Modify** `src/services/lactacaoService.ts` — `registrarLactacaoApi` adapta camelCase + insere local + enqueue `ordenhas`.
- **Modify** `__tests__/services/lactacaoService.test.ts` — atualizar o teste de `registrarLactacaoApi`.

---

### Task 1: Tabela `ordenhas` no schema + maps

**Files:**
- Modify: `src/database/schema.ts`
- Test: `__tests__/database/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Adicionar ao final de `__tests__/database/schema.test.ts` (antes do `});` final do arquivo, como novo describe):

```typescript
describe('schema — ordenhas', () => {
  test('ordenhas está em ENTITY_PK_MAP com id', () => {
    expect(ENTITY_PK_MAP.ordenhas).toBe('id');
  });

  test('getEntityExtras extrai propriedadeId, bufaloId e idCicloLactacao', () => {
    const record = { idBufala: 'b1', idPropriedade: 'p1', idCicloLactacao: 'c1' };
    expect(getEntityExtras('ordenhas', record)).toEqual({ propriedadeId: 'p1', bufaloId: 'b1', idCicloLactacao: 'c1' });
  });

  test('CREATE_TABLES_SQL inclui a tabela ordenhas', () => {
    const hasOrdenhas = CREATE_TABLES_SQL.some((sql) => /CREATE TABLE IF NOT EXISTS ordenhas/.test(sql));
    expect(hasOrdenhas).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/database/schema.test.ts`
Expected: FAIL — `ENTITY_PK_MAP.ordenhas` é `undefined`.

- [ ] **Step 3: Write minimal implementation**

Em `src/database/schema.ts`:

1. Adicionar `ordenhas: 'id',` ao final de `ENTITY_PK_MAP` (após `lotes: 'id',`).

2. Em `getEntityExtras`, adicionar antes do `default:`:

```typescript
    case 'ordenhas':
      return {
        ...idProp,
        bufaloId: record.idBufala ?? record.bufaloId ?? null,
        idCicloLactacao: record.idCicloLactacao ?? null,
      };
```

3. Em `CREATE_TABLES_SQL`, adicionar após o bloco da tabela `lotes` + índice (antes de `sync_meta`):

```typescript
  `CREATE TABLE IF NOT EXISTS ordenhas (
    id              TEXT PRIMARY KEY,
    propriedadeId   TEXT,
    bufaloId        TEXT,
    idCicloLactacao TEXT,
    updatedAt       TEXT NOT NULL,
    deletedAt       TEXT,
    _synced         INTEGER NOT NULL DEFAULT 0,
    _raw            TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ordenhas_ciclo ON ordenhas(idCicloLactacao)`,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/database/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/schema.ts __tests__/database/schema.test.ts
git commit -m "feat(ordenha): tabela local ordenhas + maps"
```

---

### Task 2: Bump migração v8

**Files:**
- Modify: `src/database/migrations.ts`
- Modify: `__tests__/database/migrations.test.ts`

- [ ] **Step 1: Write the failing test**

Em `__tests__/database/migrations.test.ts`, atualizar de 7 para 8:
- As duas asserções `'PRAGMA user_version = 7'` → `'PRAGMA user_version = 8'`.
- O mock `{ rows: [{ user_version: 7 }] }` → `user_version: 8`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/database/migrations.test.ts`
Expected: FAIL — código grava `= 7`.

- [ ] **Step 3: Write minimal implementation**

Em `src/database/migrations.ts`:
1. `const CURRENT_VERSION = 8;`
2. Adicionar `'ordenhas',` ao array `LEGACY_TABLES` (junto de `'lotes',`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/database/migrations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/migrations.ts __tests__/database/migrations.test.ts
git commit -m "chore(db): bump migração v8 com tabela ordenhas"
```

---

### Task 3: `syncService` pula `ordenhas` no pull

**Files:**
- Modify: `src/services/syncService.ts`
- Test: `src/services/__tests__/syncService.test.ts`

- [ ] **Step 1: Write the failing test**

Adicionar ao final de `src/services/__tests__/syncService.test.ts`:

```typescript
test('pull de ordenhas é pulado (sem /sync/ordenha até a Fase 4)', async () => {
  mockApiFetch.mockResolvedValue([]);

  await (syncService as any).pullEntity('ordenhas', 'p1');

  expect(mockApiFetch).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/syncService.test.ts`
Expected: FAIL — sem o early-return, `ordenhas` tenta `/sync/undefined?...`.

- [ ] **Step 3: Write minimal implementation**

Em `src/services/syncService.ts`, no início de `pullEntity` (logo após o `try {`), adicionar:

```typescript
      // ordenha ainda não tem endpoint de sync flat — registro é write-only até a Fase 4
      if (entity === 'ordenhas') return;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/syncService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/syncService.ts src/services/__tests__/syncService.test.ts
git commit -m "feat(sync): pula ordenhas no pull (sync flat virá na Fase 4)"
```

---

### Task 4: `registrarLactacaoApi` grava ordenha local + enfileira camelCase

**Files:**
- Modify: `src/services/lactacaoService.ts`
- Test: `__tests__/services/lactacaoService.test.ts`

- [ ] **Step 1: Write the failing test**

Substituir o `describe('registrarLactacaoApi', ...)` em `__tests__/services/lactacaoService.test.ts` por:

```typescript
describe('registrarLactacaoApi', () => {
  it('insere local e enfileira CREATE de ordenhas em camelCase', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    await registrarLactacaoApi({
      id_bufala: 'b1', id_propriedade: 'p1', id_ciclo_lactacao: 'c1',
      qt_ordenha: 5, periodo: 'M', dt_ordenha: '2026-01-01',
    });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ordenhas'),
      expect.arrayContaining(['new-uuid', 'p1', 'b1', 'c1'])
    );
    expect(enqueue).toHaveBeenCalledWith(
      'ordenhas', 'CREATE',
      expect.objectContaining({ id: 'new-uuid', idBufala: 'b1', idCicloLactacao: 'c1', qtOrdenha: 5, dtOrdenha: '2026-01-01' })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/lactacaoService.test.ts`
Expected: FAIL — implementação atual enfileira `ciclos_lactacao` e não insere em `ordenhas`.

- [ ] **Step 3: Write minimal implementation**

Em `src/services/lactacaoService.ts`, substituir **apenas** a função `registrarLactacaoApi` por:

```typescript
export const registrarLactacaoApi = async (payload: LactacaoRegistroPayload) => {
  const id = uuid.v4() as string;
  const now = new Date().toISOString();
  const body = {
    id,
    idBufala: payload.id_bufala,
    idPropriedade: String(payload.id_propriedade),
    idCicloLactacao: payload.id_ciclo_lactacao,
    qtOrdenha: payload.qt_ordenha,
    periodo: payload.periodo,
    ocorrencia: payload.ocorrencia ?? "",
    dtOrdenha: payload.dt_ordenha,
  };

  await execute(
    `INSERT INTO ordenhas (id, propriedadeId, bufaloId, idCicloLactacao, _raw, _synced, updatedAt)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [id, body.idPropriedade, body.idBufala, body.idCicloLactacao, JSON.stringify(body), now],
  );

  await enqueue("ordenhas", "CREATE", body);
};
```

> **Não** alterar `registrarColetaApi`, `registrarEstoqueApi` (fora de escopo) nem `encerrarLactacao`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/lactacaoService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/lactacaoService.ts __tests__/services/lactacaoService.test.ts
git commit -m "feat(ordenha): registrarLactacaoApi grava local e enfileira POST /ordenhas (camelCase)"
```

---

### Task 5: Suíte completa

**Files:** nenhum

- [ ] **Step 1: Rodar a suíte inteira**

Run: `npx jest`
Expected: PASS em todas as suítes Fase 3 + pré-existentes (exceto a falha pré-existente `App.test.tsx` por reanimated).

- [ ] **Step 2: Verificar consumidor**

`FormLactacao/index.tsx` chama `registrarLactacaoApi(payload)` com o mesmo `LactacaoRegistroPayload` snake_case — a adaptação acontece dentro do service, sem alteração no form.

- [ ] **Step 3: Commit (se necessário)**

Se nenhum ajuste, pular.

---

## Notas para o executor

- Material genético **não** entra nesta fase.
- `ordenhas` é write-only até a Fase 4 (sem pull). A migração v8 limpa/recria tudo no próximo boot.
- Push de `ordenhas` usa o fallback do registry (`POST /ordenhas`).
- Limitação de registro-fantasma (id local vs id servidor) compartilhada com bufalos/lotes — não resolver aqui.
