# Fix de Rotas + Fase 5 — Dashboards Offline

> **Status:** Spec aprovado · **Data:** 2026-05-21 · **Branch:** `feature/offline-first-sqlite`
>
> **Objetivo:** (1) Corrigir routing errado de `registrarColetaApi`/`registrarEstoqueApi`. (2) Implementar cálculo local de todos os dashboards (Fase 5), substituindo chamadas à API por leituras do SQLite já sincronizado.

---

## Contexto

O app já sincroniza `bufalos`, `ciclos_lactacao`, `reproducoes`, `lotes`, `ordenhas` (e outros) para o SQLite local via `syncService`. Apesar disso, os dashboards ainda chamam a API diretamente — tornando-os inutilizáveis offline. A Fase 5 elimina essas chamadas calculando os mesmos valores a partir dos dados locais.

Adicionalmente, `registrarColetaApi` e `registrarEstoqueApi` enfileiram para o endpoint errado (`POST /lactacao`) desde a implementação original.

---

## Parte 1 — Fix das Rotas

### Problema
| Função | Entity atual | Endpoint atual | Correto |
|---|---|---|---|
| `registrarColetaApi` | `ciclos_lactacao` | `POST /lactacao` | `POST /retiradas` |
| `registrarEstoqueApi` | `ciclos_lactacao` | `POST /lactacao` | `POST /producao-diaria` |

### Solução

**`lactacaoService.ts`:**
- `registrarColetaApi` → `enqueue("retiradas", "CREATE", payload)`. Payload já é compatível com `CreateRetiradaDto` (`idIndustria, idPropriedade, resultadoTeste?, observacao?, quantidade, dtColeta`).
- `registrarEstoqueApi` → `enqueue("producao_diaria", "CREATE", adaptedPayload)`. Adaptar: `id_propriedade → idPropriedade`, `dt_registro → dtRegistro`; drop `id_usuario` (não está no DTO `CreateProducaoDiariaDto`).

**`pushEndpoints.ts`:** adicionar dois resolvers:
```
retiradas:    CREATE → POST /retiradas   (body: shapeRetiradaCreate)
producao_diaria: CREATE → POST /producao-diaria (body: shapeProducaoDiariaCreate)
```

**`schema.ts`:** adicionar `retiradas` e `producao_diaria` em `ENTITY_PK_MAP` (sem tabela local — são fire-and-forget).

**DTOs de referência (buffs-api):**
- `CreateRetiradaDto`: `idIndustria, idPropriedade, resultadoTeste?, observacao?, quantidade, dtColeta`
- `CreateProducaoDiariaDto`: `idPropriedade, quantidade, dtRegistro?, observacao?`

---

## Parte 2 — Fase 5: Dashboards Offline

### Abordagem
**Sempre SQLite** (Opção A aprovada). O `syncService` mantém os dados frescos — não há necessidade de fallback à API para dashboards. As funções retornam os mesmos shapes que a API retorna hoje; as telas não mudam.

### Novo arquivo: `src/services/dashboardService.ts`

#### `getStats(propriedadeId: string)`
Espelha `DashboardService.getStats` da API.

**Fontes:** tabelas `bufalos` (colunas `sexo`, `status`, `nivelMaturidade`, `idRaca`), `ciclos_lactacao` (coluna `status`), `lotes`, `racas` (`_raw` para `nome`).

**Cálculos:**
- `qtd_macho_ativos`: `COUNT WHERE sexo='M' AND status=1`
- `qtd_femeas_ativas`: `COUNT WHERE sexo='F' AND status=1`
- `qtd_bufalos_registradas`: total (ativos + inativos)
- `qtd_bufalos_bezerro/novilha/vaca/touro`: `COUNT WHERE nivelMaturidade=X AND status=1`
- `qtd_bufalas_lactando`: `COUNT FROM ciclos_lactacao WHERE status='Em Lactação' AND propriedadeId=?`
- `qtd_lotes`: `COUNT FROM lotes WHERE propriedadeId=?`
- `qtd_usuarios`: `0` (sem fonte local — aceitável)
- `bufalosPorRaca`: join em memória `bufalos` × `racas._raw`

**Retorno shape:**
```ts
{
  qtd_macho_ativos, qtd_femeas_ativas, qtd_bufalos_registradas,
  qtd_bufalos_bezerro, qtd_bufalos_novilha, qtd_bufalos_vaca, qtd_bufalos_touro,
  qtd_bufalas_lactando, qtd_lotes, qtd_usuarios,
  bufalosPorRaca: { raca: string, quantidade: number }[]
}
```

---

#### `getReproducaoMetricas(propriedadeId: string)`
Espelha `DashboardService.getReproducaoMetricas`.

**Fonte:** `reproducoes._raw` (campos `status`, `dtEvento`).

**Cálculos:**
- `totalEmAndamento`: count onde `status === 'Em andamento'`
- `totalConfirmada`: count onde `status === 'Confirmada'`
- `totalFalha`: count onde `status === 'Falha'`
- `ultimaDataReproducao`: max `dtEvento` formatado como `DD/MM/YYYY`

**Retorno shape:**
```ts
{ totalEmAndamento, totalConfirmada, totalFalha, ultimaDataReproducao: string | null }
```

---

#### `getEstatisticasLactacao(propriedadeId: string)`
Espelha o endpoint `GET /lactacao/propriedade/:id/estatisticas` (não é o `getLactacaoMetricas` do dashboard — é mais simples).

**Fonte:** `ciclos_lactacao` (colunas `status`, `_raw` para `dtSecagemPrevista`).

**Cálculos:**
- `total_ciclos`: COUNT total
- `ciclos_ativos`: COUNT WHERE `status='Em Lactação'`
- `ciclos_secos`: COUNT WHERE `status='Seca'`
- `media_dias_lactacao`: média de `(hoje - dtParto)` dos ciclos ativos (lido do `_raw`)
- `ciclos_proximos_secagem`: ciclos ativos com `dtSecagemPrevista` nos próximos 30 dias
- `ciclos_secagem_atrasada`: ciclos ativos com `dtSecagemPrevista` < hoje

**Retorno shape:** igual ao retorno atual da API (mantém compatibilidade com `LactacaoScreen`).

---

#### `getProducaoMensal(propriedadeId: string, ano?: number)`
Espelha `DashboardService.getProducaoMensal`.

**Fonte:** `ordenhas._raw` (campos `qtOrdenha`, `dtOrdenha`, `idBufala`).

**Cálculos:** agrupamento por mês YYYY-MM, total de litros, conjunto de búfalas únicas, dias com ordenha, média diária. Série histórica de 12 meses do ano referência.

**Retorno shape:**
```ts
{
  ano, mes_atual_litros, mes_anterior_litros, variacao_percentual,
  bufalas_lactantes_atual,
  serie_historica: { mes, total_litros, qtd_bufalas, media_diaria }[]
}
```

---

### Integração — substituições nos services existentes

| Arquivo | Função | Substituição |
|---|---|---|
| `propriedadeService.ts` | `getDashboardPropriedade` | `dashboardService.getStats(id)` + mapear shape |
| `reproducaoService.ts` | `getReproducaoDashboardStats` | `dashboardService.getReproducaoMetricas(id)` |
| `lactacaoService.ts` | `getEstatisticasLactacao` | `dashboardService.getEstatisticasLactacao(id)` |

As telas (`HomeScreen`, `ReproducaoScreen`, `LactacaoScreen`) **não mudam** — os shapes de retorno são preservados.

---

## Testes

Arquivo: `src/services/__tests__/dashboardService.test.ts`

Mock de `queryAll` e `queryFirst` com dados realistas. Casos cobertos:
- `getStats`: contagem correta por sexo, maturidade, apenas ativos (`status=1`)
- `getStats`: `bufalosPorRaca` agrupado corretamente
- `getStats`: tabela vazia → retorna zeros sem erro
- `getReproducaoMetricas`: contagem por status, `ultimaDataReproducao` formatada
- `getEstatisticasLactacao`: ciclos próximos/atrasados de secagem calculados
- `getProducaoMensal`: agrupamento mensal, variação percentual, meses sem dados retornam zero

---

## Não está no escopo desta fase

- Tabelas locais para `retiradas`/`producao_diaria` (fire-and-forget, sem leitura offline)
- `getLactacaoMetricas` por ciclo (dashboard analítico avançado — fase separada)
- Migração de versão SQLite (nenhuma mudança de schema nesta fase)
- `qtd_usuarios` offline (sem fonte local; retorna `0`)
