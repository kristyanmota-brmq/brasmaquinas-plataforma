# 12 — Premissas provisórias e revisão RT

Este documento registra parâmetros, pesos e fórmulas que foram adotados com base em premissas provisórias de mercado ou de engenharia, enquanto dados de campo ou validação técnica da Brasmáquinas ainda não estão disponíveis.

Toda premissa deste documento deve ser revisada pelo RT (Responsável Técnico) antes de ser usada em proposta comercial homologada.

---

## Legenda de status

| Status | Significado |
|--------|-------------|
| `PENDENTE_REVISAO_RT_BRASMAQUINAS` | Aguardando validação pelo RT da Brasmáquinas |
| `PENDENTE_REVISAO_CAMPO_BRASMAQUINAS` | Aguardando confirmação com dados de projetos reais |
| `APROVADO_RT` | Validado pelo RT; pode ser usado em propostas |

---

## Entradas

---

### WEIGHT_SECONDARY_LENGTH

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `OPTIMIZER_PARAMS.WEIGHT_SECONDARY_LENGTH` |
| **Valor usado** | `0.10` |
| **Onde é usado** | `src/lib/layout/sprinkler-grid-optimizer.ts` — fórmula de score do motor de candidatos de layout |
| **Motivo** | Penalizar candidatos com comprimento de ramais excessivo em relação ao comprimento de laterais. Ramais longos indicam layout que força o comprimento de tubulação de distribuição, aumentando custo e perdas hidráulicas. |
| **Origem** | Premissa provisória de mercado. Valor 0,10 adotado por ser conservador (baixo impacto) enquanto não há dado calibrado. |
| **Fórmula aplicada** | `WEIGHT_SECONDARY_LENGTH × min(secondaryLengthM / max(totalLateralLengthM, 1), 1)` |
| **Risco** | Sem dado de campo, o peso pode sub ou superpenaizar candidatos com perfis de ramal atípicos. |
| **Responsável futuro** | RT Brasmáquinas + engenheiro de campo |
| **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS` \| `PENDENTE_REVISAO_CAMPO_BRASMAQUINAS` |

---

### WEIGHT_TOTAL_NETWORK_LENGTH

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `OPTIMIZER_PARAMS.WEIGHT_TOTAL_NETWORK_LENGTH` |
| **Valor usado** | `0.10` |
| **Onde é usado** | `src/lib/layout/sprinkler-grid-optimizer.ts` — fórmula de score do motor de candidatos de layout |
| **Motivo** | Penalizar candidatos onde o comprimento de rede de distribuição (principal + adutora + ramais) excede o comprimento de laterais. Razão maior que 1,0 indica que a rede de distribuição é mais extensa que os tubos produtivos. |
| **Origem** | Premissa provisória de engenharia. Razão 1,0 como referência sem dado calibrado. Valor 0,10 conservador. |
| **Fórmula aplicada** | `WEIGHT_TOTAL_NETWORK_LENGTH × min(distributionLengthRatio, 1)` onde `distributionLengthRatio = (principalLengthM + adutoraLengthM + secondaryLengthM) / max(totalLateralLengthM, 1)` |
| **Risco** | Em áreas com captação distante ou morfologia complexa, a razão pode ser estruturalmente alta independente do layout — gerando penalidade injusta. |
| **Responsável futuro** | RT Brasmáquinas + engenheiro de campo |
| **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS` \| `PENDENTE_REVISAO_CAMPO_BRASMAQUINAS` |

---

### Fórmula de normalização da penalidade de rede de distribuição

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `distributionLengthRatio` |
| **Valor usado** | `(principalLengthM + adutoraLengthM + secondaryLengthM) / max(totalLateralLengthM, 1)` |
| **Onde é usado** | `src/lib/layout/sprinkler-grid-optimizer.ts` — `computeScore()`, campo `distributionLengthRatio` de `LayoutScore` |
| **Motivo** | Normalizar a penalidade de rede pelo comprimento de laterais — evita penalidade absoluta que não distingue áreas grandes de pequenas. A razão é adimensional e comparável entre candidatos do mesmo polígono. |
| **Origem** | Premissa provisória de engenharia. Alternativas descartadas: comprimento absoluto (não escalável); razão por área (exige referência de m/ha que não temos). |
| **Risco** | Para polígonos com poucas colunas físicas (`totalLateralLengthM` pequeno), o denominador pode inflar a razão artificialmente. O `max(..., 1)` evita divisão por zero mas não resolve o caso de laterais muito curtas. |
| **Responsável futuro** | RT Brasmáquinas |
| **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS` |

---

### Uso de comprimento geométrico como proxy de custo e complexidade

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `principalLengthM`, `adutoraLengthM`, `secondaryLengthM`, `totalNetworkLengthM` |
| **Valor usado** | Comprimento geométrico calculado via `generatePrincipalAndAdutora()` + `generateSecondaries()` sem solver hidráulico |
| **Onde é usado** | `src/lib/layout/sprinkler-grid-optimizer.ts` — bloco de métricas de rede em `computeScore()` |
| **Motivo** | Comprimento de tubo é proxy razoável de custo de material e complexidade de instalação. Permite diferenciar candidatos de layout pelo impacto na rede de distribuição sem rodar solver hidráulico por candidato. |
| **Origem** | Premissa provisória de engenharia. O comprimento geométrico ignora: diâmetro dos tubos, perdas hidráulicas, pressão por segmento, perfil topográfico. |
| **Risco** | Um candidato com rede longa pode ser hidraulicamente superior a um com rede curta (ex.: diâmetros maiores compensando comprimento). O proxy não substitui o solver. |
| **Responsável futuro** | RT Brasmáquinas + solver hidráulico por candidato (TASK futura) |
| **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS` \| `PENDENTE_REVISAO_CAMPO_BRASMAQUINAS` |

---

---

### TOP_K_HYDRAULIC_CANDIDATES

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES` |
| **Valor usado** | `5` |
| **Onde é usado** | `src/lib/layout/sprinkler-grid-optimizer.ts` — `runTopKHydraulicValidation()`: define quantos dos melhores candidatos geométricos recebem validação pelo solver oficial |
| **Motivo** | Evitar executar o solver hidráulico completo em todos os 112 candidatos. Os Top K recebem validação real; os demais ficam com status `not_evaluated_not_in_top_k`. |
| **Origem** | Premissa provisória de mercado. Valor 5 adotado por heurística de que os melhores 5 candidatos geométricos cobrem adequadamente o espaço de soluções relevantes. |
| **Risco** | O candidato hidraulicamente melhor pode estar na posição 6+ do ranking geométrico. Com K pequeno, essa solução não é avaliada. |
| **Responsável futuro** | RT Brasmáquinas + engenheiro de campo |
| **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS` \| `PENDENTE_REVISAO_CAMPO_BRASMAQUINAS` |

---

### WEIGHT_HYDRAULIC_BLOCKER

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `OPTIMIZER_PARAMS.WEIGHT_HYDRAULIC_BLOCKER` |
| **Valor usado** | `0.50` |
| **Onde é usado** | `src/lib/layout/sprinkler-grid-optimizer.ts` — `runTopKHydraulicValidation()`: penalidade subtraída do score de candidatos com blockers reais do solver oficial |
| **Motivo** | Candidatos com blockers reais (ex.: bomba insuficiente, velocidade excedida) devem cair no ranking para não serem selecionados como `best`. Penalidade deliberadamente alta para deslocar candidatos com problemas hidráulicos. |
| **Origem** | Premissa provisória de mercado. Valor 0,50 baseado em heurística de que um blocker real é critério significativo de eliminação — score típico varia entre 0 e 1, então -0,50 desloca substancialmente o candidato. |
| **Fórmula aplicada** | `score.total -= WEIGHT_HYDRAULIC_BLOCKER` quando `hydraulicBlockers.length > 0` |
| **Risco** | Um candidato com muitos blockers e score geométrico alto ainda pode superar candidatos sem blockers mas com score baixo. A penalidade fixa pode ser insuficiente em casos extremos. |
| **Responsável futuro** | RT Brasmáquinas |
| **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS` \| `PENDENTE_REVISAO_CAMPO_BRASMAQUINAS` |

---

## Parâmetros com peso INATIVO (0) — aguardando calibração

Estes parâmetros existem no código mas têm peso 0 — não influenciam o score ainda.

| Parâmetro | Valor | Motivo do zero | Status |
|-----------|-------|----------------|--------|
| `WEIGHT_LATERAL_LENGTH` | `0` | Normalização de comprimento de laterais pendente de dado de campo | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_SHORT_COLUMN` | `0.5` | Ativo — calibração pendente | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_EDGE` | `0.3` | Ativo — calibração pendente | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_SECTION_VALVE` | `0.3` | Ativo — calibração pendente | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_FRAGMENTATION` | `0.4` | Ativo — calibração pendente | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_IMBALANCE` | `0.2` | Ativo — calibração pendente | `PENDENTE_CALIBRACAO_RT_CAMPO` |

---

## Histórico de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | Documento criado (TASK-010E-B). Registradas 4 premissas: WEIGHT_SECONDARY_LENGTH, WEIGHT_TOTAL_NETWORK_LENGTH, fórmula de normalização, proxy de comprimento. |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-010F: Adicionadas 2 premissas: TOP_K_HYDRAULIC_CANDIDATES, WEIGHT_HYDRAULIC_BLOCKER. |
