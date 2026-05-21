# Reprodução Offline — Fix Design (em andamento)

> **Status:** Brainstorming concluído, aguardando continuação para writing-plans.
> **Abordagem escolhida:** Opção 1 — Dropdown offline-first.

---

## Bugs identificados

| # | Bug | Localização | Causa |
|---|-----|-------------|-------|
| 1 | `tipoInseminacao` mostra "-" para IA/IATF | `reproducaoService.ts:112-115` | Transform espera `"Inseminação Artificial"` (formato API), form envia `"IA"` |
| 2 | Reprodutor não aparece para IA/IATF | `reproducaoService.ts:123-124` | `idSemen.slice(0,5)` usado como nome; tabela `material_genetico` nunca consultada |
| 3 | Crash ao enviar para a API | `pushEndpoints.ts:shapeReproducaoCreate` | `clean()` não filtra `null`; `idBufalo: null` enviado na IA/IATF quebra `POST /cobertura` |
| 4 | Tabela `material_genetico` vazia | `syncService.ts` | Endpoint flat `/sync/material-genetico` não existe na API; sync falha silenciosamente. `material_genetico` foi removido de `ENTITY_PK_MAP`/`SYNC_ENTITY_PATH` |

---

## Solução: Opção 1 — Dropdown offline-first

### Visão geral

Usar o endpoint paginado **já existente** na API (`GET /sync/:id_propriedade/material-genetico`) via um `pullMaterialGenetico` customizado (espelha `pullIndustrias`). Popula a tabela `material_genetico` local. Form troca `TextInput` de sêmen/óvulo por `SelectBottomSheet`. `getReproducoes` faz lookup da tabela para mostrar nome do fornecedor.

---

## Tarefas planejadas

### T1 — Fix `tipoInseminacao` transform em `getReproducoes`
**Arquivo:** `src/services/reproducaoService.ts:112-115`

**Atual:**
```typescript
tipoInseminacao:
  r.tipoInseminacao === "Inseminação Artificial" ? "IA"
  : r.tipoInseminacao === "Monta Natural" ? "Natural"
  : "-",
```

**Fix:** Normalizar ambos os formatos (API + form):
```typescript
tipoInseminacao:
  (r.tipoInseminacao === "Inseminação Artificial" || r.tipoInseminacao === "IA") ? "IA"
  : r.tipoInseminacao === "Monta Natural" ? "Natural"
  : r.tipoInseminacao ?? "-",
```

---

### T2 — `pullMaterialGenetico` no `syncService` + re-add nos mapas
**Arquivo:** `src/services/syncService.ts`, `src/database/schema.ts`

Adicionar função `pullMaterialGenetico(propriedadeId)` que consome `GET /sync/:id_propriedade/material-genetico` (paginado, wrapper `{data, meta}`), normaliza `id = record.idMaterial ?? record.id`, upserta na tabela local via `upsertBatch`.

Chamar dentro de `syncCore` (adicionar `material_genetico` nos CORE_ENTITIES ou chamar explicitamente após o loop).

Re-adicionar `material_genetico` em:
- `ENTITY_PK_MAP` (`'id'`)
- `ENTITY_API_PK_MAP` (`'idMaterial'`)
- `SYNC_ENTITY_PATH` (`'material-genetico'`) — só para `upsertBatch` funcionar; o `pullEntity` genérico **não** será usado (usará `pullMaterialGenetico` customizado como `pullIndustrias`)

---

### T3 — Serviço `getMaterialGenetico` + lookup em `getReproducoes`
**Arquivo:** `src/services/reproducaoService.ts`, novo helper em `bufaloService.ts` ou arquivo separado

Adicionar função:
```typescript
export const getMaterialGenetico = async (propriedadeId: string) => {
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM material_genetico WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  return rows.map(r => {
    const m = JSON.parse(r._raw);
    return {
      id: m.idMaterial ?? m.id,
      label: `${m.fornecedor ?? 'Sem nome'} (${m.tipo ?? '-'})`,
      tipo: m.tipo,
      fornecedor: m.fornecedor,
    };
  });
};
```

Em `getReproducoes`, precarregar tabela em `matMap` e substituir `idSemen.slice(0,5)` por:
```typescript
nomeMacho: macho?.nome ?? machoFallback?.nome ?? (r.idSemen ? matMap[r.idSemen]?.fornecedor ?? "Sêmen" : "-"),
brincoMacho: macho?.brinco ?? machoFallback?.brinco ?? (r.idSemen ? matMap[r.idSemen]?.label ?? r.idSemen.slice(0,8) : "-"),
```

---

### T4 — Form: trocar TextInput sêmen/óvulo por SelectBottomSheet
**Arquivo:** `src/components/FormReproductionAdd/index.tsx`

- Remover campos `TextInput` de "ID do Sêmen" e "ID do Óvulo"
- Adicionar `useEffect` que carrega `getMaterialGenetico(propriedadeId)` ao montar
- Renderizar dois `SelectBottomSheet`:
  - **Sêmen:** filtra `tipo === "Sêmen"` (ou equivalente na API)
  - **Óvulo:** filtra `tipo === "Óvulo"` (ou equivalente)
- Mostrar mensagem "Nenhum material cadastrado — sincronize primeiro" quando lista vazia
- `idSemenUsado` passa a ser o `idMaterial` UUID selecionado (em vez de texto livre)

---

### T5 — Fix `shapeReproducaoCreate` para não enviar null à API
**Arquivo:** `src/services/sync/pushEndpoints.ts`

Modificar `clean()` ou criar `cleanStrict()` que filtra `null` E `undefined`:
```typescript
function cleanStrict(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );
}
```

Usar `cleanStrict` em `shapeReproducaoCreate` (os outros shapes podem continuar com `clean` para não quebrar campos intencionalmente nulos).

---

## Dependências entre tarefas

```
T2 (sync) → T3 (lookup) → T4 (form usa getMaterialGenetico)
T1 (transform) — independente
T5 (push fix) — independente
```

Ordem de implementação: T1 → T5 → T2 → T3 → T4

---

## Ponto de parada

Brainstorming **concluído**. Próximo passo: invocar `writing-plans` para criar o plano de implementação com TDD (testes antes de cada task).

Para continuar: `/superpowers:brainstorming` ou `/superpowers:writing-plans docs/superpowers/specs/2026-05-21-reproducao-offline-fix-design.md`
