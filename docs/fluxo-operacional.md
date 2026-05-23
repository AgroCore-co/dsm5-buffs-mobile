# Fluxo Operacional — DSM5 Buffs Mobile

Descreve como o fazendeiro usa o app no dia a dia e quais operações cada tela suporta.

---

## Visão geral das telas

| Tela | Acesso | Função principal |
|---|---|---|
| Login | Pública | Autenticação com e-mail/senha |
| Home | Autenticada | Dashboard geral do rebanho |
| Rebanho | Autenticada | Listagem e cadastro de búfalas |
| Detalhe do Animal | Autenticada | Histórico completo de uma búfala |
| Lactação | Autenticada | Gestão de ciclos, ordenhas e estoque |
| Reprodução | Autenticada | Coberturas, gestação e partos |
| Piquetes | Autenticada | Gestão de lotes e áreas de pastagem |
| Notificações | Autenticada | Alertas do sistema (secagem próxima, etc.) |
| Scanner NFC | Autenticada | Leitura de chip NFC para identificar animal |

---

## Fluxo diário típico

### Manhã — Registrar ordenhas

1. Abrir **Lactação**
2. Selecionar a búfala na lista de animais em lactação
3. Tocar no card → abre `LactacaoAddBottomSheet`
4. Informar: quantidade (litros), período (M/T/N), data, ocorrência opcional
5. Salvar → grava em `ordenhas` (SQLite) + enfileira `POST /ordenhas`

### Fim do dia — Atualizar estoque de leite

O fazendeiro informa o volume total de leite disponível no tanque (snapshot do dia).

1. Abrir **Lactação** → botão flutuante → "Atualizar Estoque"
2. Informar: quantidade (litros), data de registro, observação opcional
3. Salvar → grava em `producao_diaria` (SQLite) + enfileira `POST /producao-diaria`
4. Dashboard atualiza imediatamente com o novo valor

> **Nota:** produção diária é um valor de **snapshot** (último registro), não acumulado. Se o fazendeiro registrar 300L às 8h e 150L às 18h após uma venda, o dashboard mostra 150L.

### Coleta por laticínio

1. Abrir **Lactação** → botão flutuante → "Registrar Coleta"
2. Selecionar o laticínio, informar quantidade, resultado do teste e data
3. Salvar → enfileira `POST /retiradas`

---

## Fluxo de reprodução

### Registrar cobertura

1. Abrir **Reprodução** → adicionar
2. Selecionar búfala, tipo (IA / Monta Natural / TE), touro/doador, data
3. Salvar → grava em `reproducoes` + enfileira `POST /cobertura`

### Transferência de Embrião (TE)

- Selecionar embrião do material genético → doadora é auto-derivada do embrião
- Selecionar receptora (búfala que vai gestar)
- Sistema identifica automaticamente `idDoadora` a partir do embrião selecionado

### Registrar parto

1. Na lista de reproduções, selecionar cobertura com status "Confirmada"
2. Registrar parto → cria ciclo de lactação automaticamente no servidor

### Diagnóstico de gestação

- Atualizar status da cobertura para "Confirmada" ou "Falha"

---

## Fluxo de lactação — ciclo completo

```
Parto registrado
    ↓
Ciclo de lactação criado (status: Em Lactação)
    ↓
Ordenhas diárias registradas
    ↓
Encerrar lactação (status: seco)
    └─ PATCH /lactacao/:id com { dtSecagemReal, observacao, status }
```

---

## Sincronização

O app sincroniza automaticamente:
- **Ao abrir** (sync completo: pull + push)
- **Ao trocar de propriedade**
- **Sync inicial** após primeiro login (só entidades core: búfalos, ciclos, reproduções)

O fazendeiro pode operar 100% offline — todas as operações ficam em fila e sobem quando há conexão.

---

## Gestão do rebanho

- **Cadastro de búfala:** brinco, nome, raça, sexo, data nascimento, maturidade
- **Inativar:** marcar como inativa com motivo (venda, morte, etc.)
- **NFC:** scanner lê o chip do brinco e abre diretamente o detalhe do animal
- **Pesagem:** registrar peso no detalhe do animal (histórico zootécnico)
- **Sanitário:** registrar vacinas, vermifugações e tratamentos por animal
