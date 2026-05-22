# TE — idDoadora Auto-derivado do Embrião — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o input manual de tag da búfala doadora no formulário TE e derivar `idDoadora` automaticamente do `idBufaloOrigem` do embrião selecionado.

**Architecture:** `getBufaloById` é adicionado ao `bufaloService` para lookup de brinco/nome por UUID. O formulário lê `idBufalOrigem` do item selecionado em `matGeneticoOvulo` (já em memória) e o usa direto no payload. Embriões sem `idBufalOrigem` são filtrados fora da lista.

**Tech Stack:** TypeScript, React Native, `@op-engineering/op-sqlite`, Jest (mocks para `../../database/db`).

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `src/services/bufaloService.ts` | Modificar — adicionar `getBufaloById` e expor no export default |
| `src/services/__tests__/bufaloService.update.test.ts` | Modificar — adicionar testes de `getBufaloById` |
| `src/components/FormReproductionAdd/index.tsx` | Modificar — remover `tagDoadora`, adicionar `idDoadora` + `nomeDoadora`, filtrar embriões, auto-derivar no onChange, simplificar handleSave |

---

## Task 1: `getBufaloById` em bufaloService

**Files:**
- Modify: `src/services/bufaloService.ts`
- Modify: `src/services/__tests__/bufaloService.update.test.ts`

### Contexto do arquivo de serviço

`src/services/bufaloService.ts` começa com:
```typescript
import uuid from 'react-native-uuid';
import { queryAll, queryFirst, execute } from '../database/db';
import { enqueue } from './pendingOperationsService';
import { grupoService, Grupo } from './grupoService';
import { normalizePayload } from '../utils/normalizePayload';
```

O export default está nas últimas linhas (≈270-282):
```typescript
export default {
  getGrupos,
  moverBufaloDeGrupo,
  getBufalos,
  getBufaloDetalhes,
  createBufalo,
  updateBufalo,
  deleteBufalo,
  getRacas,
  filtrarBufalos,
  getBufaloPorMicrochip,
  getBufaloByBrincoAndSexo,
};
```

- [ ] **Step 1: Escrever o teste que falha**

No final de `src/services/__tests__/bufaloService.update.test.ts`, adicionar (após o describe existente de `updateBufalo`):

```typescript
import { getBufaloById } from '../bufaloService';

describe('getBufaloById', () => {
  it('retorna brinco e nome quando bufalo existe', async () => {
    mockQueryFirst.mockResolvedValueOnce({
      _raw: JSON.stringify({ brinco: 'A001', nome: 'Estrela' }),
    });
    const result = await getBufaloById('uuid-1');
    expect(result).toEqual({ brinco: 'A001', nome: 'Estrela' });
    expect(mockQueryFirst).toHaveBeenCalledWith(
      expect.stringContaining('SELECT _raw FROM bufalos WHERE id = ?'),
      ['uuid-1'],
    );
  });

  it('retorna null quando bufalo não existe', async () => {
    mockQueryFirst.mockResolvedValueOnce(null);
    const result = await getBufaloById('uuid-nao-existe');
    expect(result).toBeNull();
  });

  it('usa nome "Não informado" quando bufalo não tem nome', async () => {
    mockQueryFirst.mockResolvedValueOnce({
      _raw: JSON.stringify({ brinco: 'B002' }),
    });
    const result = await getBufaloById('uuid-2');
    expect(result).toEqual({ brinco: 'B002', nome: 'Não informado' });
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
cd "/home/v1nisouza/Área de trabalho/PASTA PI/dsm5-buffs-mobile"
npx jest src/services/__tests__/bufaloService.update.test.ts --no-coverage
```

Esperado: `FAIL` — `getBufaloById is not a function` ou `not exported`.

- [ ] **Step 3: Implementar `getBufaloById` em `bufaloService.ts`**

Adicionar a função logo antes do `export default` (≈linha 269):

```typescript
export const getBufaloById = async (
  uuid: string,
): Promise<{ brinco: string; nome: string } | null> => {
  const row = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE id = ?`,
    [uuid],
  );
  if (!row) return null;
  const b = JSON.parse(row._raw);
  return { brinco: b.brinco ?? '-', nome: b.nome ?? 'Não informado' };
};
```

E adicionar `getBufaloById` no `export default`:

```typescript
export default {
  getGrupos,
  moverBufaloDeGrupo,
  getBufalos,
  getBufaloDetalhes,
  getBufaloById,
  createBufalo,
  updateBufalo,
  deleteBufalo,
  getRacas,
  filtrarBufalos,
  getBufaloPorMicrochip,
  getBufaloByBrincoAndSexo,
};
```

- [ ] **Step 4: Rodar e confirmar aprovação**

```bash
npx jest src/services/__tests__/bufaloService.update.test.ts --no-coverage
```

Esperado: `PASS` — todos os testes verdes (4 de updateBufalo + 3 de getBufaloById).

- [ ] **Step 5: Commit**

```bash
git add src/services/bufaloService.ts src/services/__tests__/bufaloService.update.test.ts
git commit -m "feat(bufalo): getBufaloById — lookup de brinco/nome por UUID"
```

---

## Task 2: FormReproductionAdd — auto-derivar idDoadora

**Files:**
- Modify: `src/components/FormReproductionAdd/index.tsx`

### Contexto do arquivo atual

O import de bufaloService (≈linha 45):
```typescript
const { getBufaloByBrincoAndSexo } = bufaloService;
```

Os states do form (≈linhas 50-57):
```typescript
const [tagBufalo, setTagBufalo] = useState("");
const [tagBufala, setTagBufala] = useState("");
const [tagDoadora, setTagDoadora] = useState("");
const [matGeneticoSemen, setMatGeneticoSemen] = useState<{ id: string; label: string; idBufalOrigem?: string | null }[]>([]);
const [matGeneticoOvulo, setMatGeneticoOvulo] = useState<{ id: string; label: string; idBufalOrigem?: string | null }[]>([]);
const [idSemenSelecionado, setIdSemenSelecionado] = useState<string | null>(null);
const [idOvuloSelecionado, setIdOvuloSelecionado] = useState<string | null>(null);
const [tipoInseminacao, setTipoInseminacao] = useState<string | null>(null);
```

O onChange do tipo (≈linhas 209-217):
```typescript
onChange={(val: any) => {
  setTipoInseminacao(val);
  setTagBufalo('');
  setTagBufalo('');       // BUG: deveria ser setTagBufala
  setTagDoadora('');
  setIdSemenSelecionado(null);
  setIdOvuloSelecionado(null);
}}
```

A validação TE em handleSave (≈linha 111):
```typescript
if (tipoInseminacao === "TE" && (!idOvuloSelecionado || !tagDoadora)) {
  return showToast("TE requer um Embrião e a Tag da Búfala Doadora.", true);
}
```

O lookup de doadora em handleSave (≈linhas 141-148):
```typescript
} else if (tipoInseminacao === "TE") {
    const bufalaDoadora = await getBufaloByBrincoAndSexo(propriedadeSelecionada, tagDoadora, "F");
    if (!bufalaDoadora?.idBufalo) {
        brincoInvalido = tagDoadora;
        return showToast(`Búfala doadora (Tag: ${brincoInvalido}) não encontrada ou não é fêmea.`, true);
    }
    idDoadoraUUID = bufalaDoadora.idBufalo;
}
```

O bloco TE na UI (≈linhas 278-310):
```tsx
{tipoInseminacao === "TE" && (
  <>
    <Text style={styles.sectionTitle}>Material Genético</Text>
    <View style={styles.listContainer}>
      <Text style={styles.label}>
        Embrião <Text style={{ color: mergedColors.red.base }}>*</Text>
      </Text>
      {matGeneticoOvulo.length === 0 ? (
        <Text style={{ color: '#999', marginBottom: 12, fontSize: 13 }}>
          Nenhum embrião cadastrado — sincronize primeiro.
        </Text>
      ) : (
        <SelectBottomSheet
          items={matGeneticoOvulo.map(m => ({ label: m.label, value: m.id }))}
          value={idOvuloSelecionado}
          onChange={(val: any) => setIdOvuloSelecionado(val)}
          title="Selecionar Embrião"
          placeholder="Selecione o Embrião"
        />
      )}

      <Text style={styles.label}>
        Tag da Búfala Doadora <Text style={{ color: mergedColors.red.base }}>*</Text>
      </Text>
      <TextInput
        style={styles.inputBase}
        value={tagDoadora}
        onChangeText={setTagDoadora}
        placeholder="Digite a tag da búfala doadora"
      />
    </View>
  </>
)}
```

O payload em handleSave (≈linhas 152-161):
```typescript
const payload = {
    idPropriedade: propriedadeSelecionada,
    idBufalo: idBufaloMachoUUID,
    idBufala: idBufalaFemeaUUID,
    idSemen: tipoInseminacao === 'TE' ? (idOvuloSelecionado ?? null) : idSemenUsado,
    idDoadora: tipoInseminacao === 'TE' ? idDoadoraUUID : null,
    tipoInseminacao: tipoInseminacao,
    status: status,
    dtEvento: new Date().toISOString().split("T")[0],
};
```

- [ ] **Step 1: Atualizar import de bufaloService e adicionar `getBufaloById`**

Localizar a linha (≈45):
```typescript
const { getBufaloByBrincoAndSexo } = bufaloService;
```

Substituir por:
```typescript
const { getBufaloByBrincoAndSexo, getBufaloById } = bufaloService;
```

- [ ] **Step 2: Substituir states de tagDoadora pelo par idDoadora + nomeDoadora**

Localizar:
```typescript
const [tagDoadora, setTagDoadora] = useState("");
```

Substituir por:
```typescript
const [idDoadora, setIdDoadora] = useState<string | null>(null);
const [nomeDoadora, setNomeDoadora] = useState<string>('');
```

- [ ] **Step 3: Adicionar `embrioesFiltrados` como useMemo**

Após a declaração de `tipoItems` (≈linha 62), adicionar:

```typescript
const embrioesFiltrados = useMemo(
  () => matGeneticoOvulo.filter(m => m.idBufalOrigem != null),
  [matGeneticoOvulo],
);
```

- [ ] **Step 4: Corrigir o onChange do tipo e substituir limpeza de tagDoadora**

Localizar o bloco onChange do SelectBottomSheet de tipo:
```typescript
onChange={(val: any) => {
  setTipoInseminacao(val);
  // limpa campos do tipo anterior
  setTagBufalo('');
  setTagBufalo('');
  setTagDoadora('');
  setIdSemenSelecionado(null);
  setIdOvuloSelecionado(null);
}}
```

Substituir por:
```typescript
onChange={(val: any) => {
  setTipoInseminacao(val);
  setTagBufalo('');
  setTagBufala('');
  setIdDoadora(null);
  setNomeDoadora('');
  setIdSemenSelecionado(null);
  setIdOvuloSelecionado(null);
}}
```

- [ ] **Step 5: Atualizar validação TE em handleSave**

Localizar:
```typescript
if (tipoInseminacao === "TE" && (!idOvuloSelecionado || !tagDoadora)) {
  return showToast("TE requer um Embrião e a Tag da Búfala Doadora.", true);
}
```

Substituir por:
```typescript
if (tipoInseminacao === "TE" && (!idOvuloSelecionado || !idDoadora)) {
  return showToast("TE requer a seleção de um Embrião.", true);
}
```

- [ ] **Step 6: Remover bloco try/catch de lookup da doadora em handleSave**

Localizar (dentro do bloco `try`):
```typescript
} else if (tipoInseminacao === "TE") {
    const bufalaDoadora = await getBufaloByBrincoAndSexo(propriedadeSelecionada, tagDoadora, "F");
    if (!bufalaDoadora?.idBufalo) {
        brincoInvalido = tagDoadora;
        return showToast(`Búfala doadora (Tag: ${brincoInvalido}) não encontrada ou não é fêmea.`, true);
    }
    idDoadoraUUID = bufalaDoadora.idBufalo;
}
```

Substituir por (TE não faz mais lookup — `idDoadora` já está no estado):
```typescript
} else if (tipoInseminacao === "TE") {
    // idDoadora já foi derivado do idBufaloOrigem do embrião selecionado
}
```

E atualizar o payload para usar o state `idDoadora` (que já é o UUID correto):

Localizar:
```typescript
idDoadora: tipoInseminacao === 'TE' ? idDoadoraUUID : null,
```

A variável `idDoadoraUUID` (local var) dentro de handleSave ainda existe mas agora é irrelevante para TE. Substituir por:
```typescript
idDoadora: tipoInseminacao === 'TE' ? idDoadora : null,
```

- [ ] **Step 7: Atualizar bloco TE na UI**

Localizar o bloco TE completo:
```tsx
{tipoInseminacao === "TE" && (
  <>
    <Text style={styles.sectionTitle}>Material Genético</Text>
    <View style={styles.listContainer}>
      <Text style={styles.label}>
        Embrião <Text style={{ color: mergedColors.red.base }}>*</Text>
      </Text>
      {matGeneticoOvulo.length === 0 ? (
        <Text style={{ color: '#999', marginBottom: 12, fontSize: 13 }}>
          Nenhum embrião cadastrado — sincronize primeiro.
        </Text>
      ) : (
        <SelectBottomSheet
          items={matGeneticoOvulo.map(m => ({ label: m.label, value: m.id }))}
          value={idOvuloSelecionado}
          onChange={(val: any) => setIdOvuloSelecionado(val)}
          title="Selecionar Embrião"
          placeholder="Selecione o Embrião"
        />
      )}

      <Text style={styles.label}>
        Tag da Búfala Doadora <Text style={{ color: mergedColors.red.base }}>*</Text>
      </Text>
      <TextInput
        style={styles.inputBase}
        value={tagDoadora}
        onChangeText={setTagDoadora}
        placeholder="Digite a tag da búfala doadora"
      />
    </View>
  </>
)}
```

Substituir por:
```tsx
{tipoInseminacao === "TE" && (
  <>
    <Text style={styles.sectionTitle}>Material Genético</Text>
    <View style={styles.listContainer}>
      <Text style={styles.label}>
        Embrião <Text style={{ color: mergedColors.red.base }}>*</Text>
      </Text>
      {embrioesFiltrados.length === 0 ? (
        <Text style={{ color: '#999', marginBottom: 12, fontSize: 13 }}>
          Nenhum embrião cadastrado — sincronize primeiro.
        </Text>
      ) : (
        <SelectBottomSheet
          items={embrioesFiltrados.map(m => ({ label: m.label, value: m.id }))}
          value={idOvuloSelecionado}
          onChange={async (val: any) => {
            setIdOvuloSelecionado(val);
            const item = embrioesFiltrados.find(m => m.id === val);
            const doadoraUUID = item?.idBufalOrigem ?? null;
            setIdDoadora(doadoraUUID);
            if (doadoraUUID) {
              const bufala = await getBufaloById(doadoraUUID);
              setNomeDoadora(bufala ? `${bufala.brinco} — ${bufala.nome}` : doadoraUUID.slice(0, 8));
            } else {
              setNomeDoadora('');
            }
          }}
          title="Selecionar Embrião"
          placeholder="Selecione o Embrião"
        />
      )}
      {nomeDoadora ? (
        <Text style={[styles.label, { color: mergedColors.text.secondary, marginTop: 8 }]}>
          Doadora: {nomeDoadora}
        </Text>
      ) : null}
    </View>
  </>
)}
```

- [ ] **Step 8: Rodar suite completa para garantir zero regressões**

```bash
cd "/home/v1nisouza/Área de trabalho/PASTA PI/dsm5-buffs-mobile"
npx jest --no-coverage
```

Esperado: `PASS (≥157) FAIL (0)`.

- [ ] **Step 9: Commit**

```bash
git add src/components/FormReproductionAdd/index.tsx
git commit -m "feat(reproducao/TE): idDoadora auto-derivado do embrião — remove input manual da doadora"
```

---

## Task 3: Verificação final

- [ ] **Step 1: Rodar suite completa com verbose**

```bash
npx jest --no-coverage --verbose 2>&1 | grep -E "PASS|FAIL|✓|getBufaloById"
```

Confirmar que os 3 novos testes de `getBufaloById` aparecem como `PASS`.

- [ ] **Step 2: Checklist de invariantes**

Verificar manualmente:

1. `embrioesFiltrados` exclui embriões com `idBufalOrigem = null` → sem fallback de input
2. Ao selecionar embrião → `idDoadora` state recebe o UUID, `nomeDoadora` mostra brinco/nome
3. `handleSave` usa `idDoadora` (state) diretamente — sem lookup por tag
4. Trocar tipo de inseminação limpa `idDoadora` e `nomeDoadora`
5. Validação de TE falha se `idDoadora` for null (embrião com origem nula não entra na lista, portanto essa situação só ocorre se nenhum embrião for selecionado)
