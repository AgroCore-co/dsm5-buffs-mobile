# TE — idDoadora Auto-derivado do Embrião

**Data:** 2026-05-22

## Contexto

No fluxo de Transferência de Embrião (TE), o formulário de reprodução atualmente pede que o usuário digite a tag da búfala doadora manualmente, e o app faz um lookup local por brinco+sexo. Isso é redundante: o registro de material genético do tipo Embrião já carrega `idBufaloOrigem` — o UUID da búfala que gerou o embrião. Como a doadora é sempre da mesma propriedade, ela está sempre sincronizada localmente.

## Objetivo

Remover o input manual da tag da doadora. O `idDoadora` passa a ser derivado automaticamente do embrião selecionado via `idBufaloOrigem`.

## Regras de negócio

- A búfala doadora de um embrião é sempre da mesma propriedade — portanto sempre está na tabela `bufalos` local após sync.
- Embriões com `idBufaloOrigem = null` indicam inconsistência criada no web (que deveria ter validado). O mobile **não tenta corrigir** esse dado — filtra esses embriões fora da lista silenciosamente.
- Nunca deve aparecer input de tag da doadora no form de TE.

## Mudanças

### `src/services/bufaloService.ts`

Adicionar função `getBufaloById(uuid: string)`:

```typescript
getBufaloById: async (uuid: string): Promise<{ brinco: string; nome: string } | null> => {
  const row = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE id = ?`,
    [uuid],
  );
  if (!row) return null;
  const b = JSON.parse(row._raw);
  return { brinco: b.brinco ?? '-', nome: b.nome ?? 'Não informado' };
},
```

### `src/services/reproducaoService.ts` — `getMaterialGenetico`

Sem mudança de assinatura. Já retorna `idBufalOrigem`. O filtro de null é feito no componente.

### `src/components/FormReproductionAdd/index.tsx`

**States removidos:**
- `tagDoadora` (string)

**States adicionados:**
- `idDoadoraUUID: string | null` — UUID da doadora derivado do embrião selecionado
- `nomeDoadora: string` — texto read-only para exibição (brinco da doadora)

**Filtro na lista de embriões:**
```typescript
const embrioesFiltrados = matGeneticoOvulo.filter(m => m.idBufalOrigem != null);
```

**onChange do SelectBottomSheet de embrião:**
```typescript
onChange={async (val: any) => {
  setIdOvuloSelecionado(val);
  const item = embrioesFiltrados.find(m => m.id === val);
  const doadoraUUID = item?.idBufalOrigem ?? null;
  setIdDoadoraUUID(doadoraUUID);
  if (doadoraUUID) {
    const bufala = await getBufaloById(doadoraUUID);
    setNomeDoadora(bufala ? `${bufala.brinco} — ${bufala.nome}` : doadoraUUID.slice(0, 8));
  } else {
    setNomeDoadora('');
  }
}}
```

**UI no bloco TE (substituir TextInput da doadora):**
```tsx
{nomeDoadora ? (
  <Text style={styles.doadoraInfo}>Doadora: {nomeDoadora}</Text>
) : null}
```

**handleSave — TE:**
- Remover lookup de `tagDoadora` via `getBufaloByBrincoAndSexo`
- Usar `idDoadoraUUID` diretamente como `idDoadora` no payload
- Validação: `if (tipoInseminacao === 'TE' && (!idOvuloSelecionado || !idDoadoraUUID))`

**Limpeza ao trocar tipo:**
```typescript
setIdOvuloSelecionado(null);
setIdDoadoraUUID(null);
setNomeDoadora('');
```

## Fluxo de dados (TE)

```
Usuário seleciona embrião
  → onChange lê idBufalOrigem do item em matGeneticoOvulo
  → setIdDoadoraUUID(idBufalOrigem)
  → getBufaloById(idBufalOrigem) → exibe brinco/nome como read-only
Usuário toca Salvar
  → payload: { idSemen: idOvuloSelecionado, idDoadora: idDoadoraUUID, ... }
  → API recebe UUIDs válidos sem lookup manual
```

## Não entra no escopo

- Nenhuma mudança em `pushEndpoints.ts` (payload já está correto)
- Nenhum fallback de input de tag — null é dado quebrado, responsabilidade do web
- Nenhuma mudança nos outros tipos de inseminação (IA, IATF, Monta Natural)
