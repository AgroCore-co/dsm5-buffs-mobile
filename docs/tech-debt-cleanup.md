# Dívida Técnica — Plano de Limpeza

> Documento gerado a partir da análise técnica de 2026-05-24.
> Lista priorizada de correções para serem feitas posteriormente.
> Marque `[x]` conforme concluir.

**Status do projeto na análise:** 173 testes passando (23/24 suítes), ~21k linhas.
Fundação offline-first sólida; pendências são de acabamento, não estruturais.

---

## 🔴 Críticos — bugs de runtime e segurança

### [ ] 1. `mergedColors` indefinido em FormReproductionAdd (crash em runtime)
**Arquivo:** `src/components/FormReproductionAdd/index.tsx`
**Linhas:** 218, 230, 246, 271, 298
**Problema:** o componente referencia a variável `mergedColors` que não existe (sobra da migração de tokens de cor). Ao renderizar o form → `ReferenceError`.
**Correção:** trocar `mergedColors.xxx` pelo token correto de `colors` (`src/styles/colors.ts`). Conferir qual cor era usada originalmente (provável `colors.brand.*` / `colors.status.*`).
**Verificar:** `npx tsc --noEmit` deve parar de acusar `Cannot find name 'mergedColors'`.

### [ ] 2. `useState` condicional em ModalVisualizaçãoZootec (viola Rules of Hooks)
**Arquivo:** `src/components/ModalVisualizaçãoZootec/index.tsx`
**Linhas:** 18, 19
**Problema:** `useState` chamado depois de um early-return/condição → ordem de hooks muda entre renders, pode crashar.
**Correção:** mover TODOS os `useState`/hooks para o topo do componente, antes de qualquer `return` condicional.
**Verificar:** `npx eslint src/components/ModalVisualizaçãoZootec/` sem erro `rules-of-hooks`.

### [ ] 3. `.mcp.json` ainda rastreado pelo git
**Problema:** está no `.gitignore` mas continua tracked (foi commitado antes do ignore). A chave está vazia hoje e NÃO vazou no histórico, mas qualquer preenchimento futuro será commitado.
**Correção:**
```bash
git rm --cached .mcp.json
git commit -m "chore: remove .mcp.json do versionamento"
```

### [ ] 4. Erros de TypeScript em piqueteService (service quebrado)
**Arquivo:** `src/services/piqueteService.ts`
**Linhas:** 94 e 139 (`queryFirst` não importado), 112 e 113 (`geoMapa` vs `geo_mapa`)
**Correção:**
- Adicionar `queryFirst` ao import de `../database/db`
- Alinhar o nome do campo: usar `geo_mapa` (igual ao tipo `NovoPiqueteDTO`) OU renomear no tipo — seguir a convenção da API (não renomear campos da API).
- Ajustar `src/services/__tests__/piqueteService.test.ts:42` (`qtdMax` → `qtd_max`) para bater com o DTO.
**Verificar:** `npx tsc --noEmit 2>&1 | grep piqueteService` vazio.

---

## 🟠 Altos — dívida técnica

### [ ] 5. Remover dependências mortas do package.json
**Sem nenhum uso no código (0 imports):**
- `axios`
- `@supabase/supabase-js`
- `cross-fetch`
- `react-native-ble-plx`
**Correção:** `npm uninstall axios @supabase/supabase-js cross-fetch react-native-ble-plx`
**Atenção:** confirmar que `react-native-ble-plx` realmente não será usado (Bluetooth) antes de remover.

### [ ] 6. Remover código morto
- `src/screens/PiquetesScreen_backup.tsx` — arquivo de backup versionado
- `src/components/CardGrupo/` — não é usado em lugar nenhum (telas usam `CardGrupos`)
**Correção:** deletar os dois. Conferir antes com `grep -rn "CardGrupo['\"]" src/`.

### [ ] 7. Atacar os 308 problemas de ESLint
**Breakdown:**
- 136 `no-unused-vars` — remover variáveis/imports não usados
- 107 `no-inline-styles` — mover estilos inline para `StyleSheet.create`
- 28 `no-unstable-nested-components` — **prioridade**: componentes definidos dentro de render remontam a árvore a cada render (perda de foco/estado, perf ruim). Mover `renderItem`/subcomponentes para fora.
- 23 `react-hooks/exhaustive-deps` — revisar deps faltando (risco de closure obsoleta)
**Correção em fases:**
```bash
npx eslint . --fix          # resolve parte automaticamente
npx eslint . 2>&1 | grep "no-unstable-nested-components"  # atacar manualmente
```

---

## 🟡 Médios

### [ ] 8. Unificar diretórios de teste duplicados
**Problema:** existem `__tests__/` (raiz) E `src/**/__tests__/`. Vários testes duplicados: `lactacaoService`, `db`, `pendingOperations`, `sanitario`, `bufalo`.
**Correção:** escolher UM padrão (recomendado: `src/**/__tests__/` colocado junto ao código) e mover/remover os duplicados da raiz. Garantir que o `testMatch` do Jest cobre o escolhido.

### [ ] 9. Consertar a suíte App.test.tsx
**Problema:** falha ao importar `@gorhom/portal` (não está no `transformIgnorePatterns` do Jest).
**Correção:** adicionar `@gorhom` ao `transformIgnorePatterns` em `jest.config`/`package.json`, OU remover o smoke test padrão do RN se não agrega.

### [ ] 10. Reduzir uso de `any` (116 ocorrências fora de testes)
**Foco:** `detalhes: any` (AnimalInfoCard), `prop: any[]` (SelectPropriedade), retornos de service.
**Correção:** criar interfaces em `src/types/` para as entidades principais (Bufalo, Grupo, Lote, Alerta, etc.) e tipar gradualmente.

### [ ] 11. Estratégia de logging (79 `console.*` em produção)
**Correção:** criar um wrapper `src/utils/logger.ts` que só loga em `__DEV__`, e substituir os `console.*`. Evita ruído e vazamento de dados em release.

### [ ] 12. Quebrar arquivos grandes
- `src/components/AnimalInfoCard/index.tsx` (701 linhas)
- `src/components/Lembretes/index.tsx` (624)
- `src/components/SanitarioAddBottomSheet/index.tsx` (555)
**Correção:** extrair subcomponentes e hooks de lógica; separar estilos. Mirar < 250 linhas por arquivo.

---

## 🔵 Baixos — melhorias

### [ ] 13. Migrar tokens de auth para armazenamento seguro
**Problema:** `userToken`/`refreshToken` em `AsyncStorage` (texto plano).
**Correção:** usar `react-native-keychain` para os tokens. Manter AsyncStorage para dados não sensíveis.

### [ ] 14. Otimizar leitura de tokens no apiClient
**Arquivo:** `src/lib/apiClient.ts:24-26`
**Problema:** 3 `getItem` separados por request.
**Correção:** `AsyncStorage.multiGet(['userToken','refreshToken','expiresAt'])`.

### [ ] 15. Adicionar Error Boundary na raiz
**Problema:** um erro de render derruba o app com tela branca.
**Correção:** criar `src/components/ErrorBoundary.tsx` e envolver o `AppContent` em `App.tsx`.

---

## Ordem sugerida de execução

1. **Sprint de correção rápida (itens 1–6):** bugs de runtime + limpeza trivial. Alto impacto, baixo esforço.
2. **Sprint de qualidade (7–9):** ESLint + testes. Médio esforço.
3. **Sprint de robustez (10–15):** tipos, logging, refactor, segurança. Contínuo.
