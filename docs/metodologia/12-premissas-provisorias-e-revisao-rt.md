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

### TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `toleranceDeg` em `detectNetworkAngleIssues()` |
| **Valor usado** | `5°` |
| **Onde é usado** | `src/lib/layout/network-angle-diagnostics.ts` — `isAllowedDeflection()`, `detectNetworkAngleIssues()` |
| **Motivo** | Conexões físicas reais têm tolerância de fabricação e montagem. Uma deflexão de 87° pode ser executada com uma curva 90° sem problema prático. A tolerância de ±5° cobre variações de alinhamento em campo e imprecisões de traçado digital. |
| **Origem** | Premissa provisória de engenharia. Valor 5° adotado como ponto de partida conservador sem dado calibrado de montagem de campo. |
| **Risco** | Tolerância muito ampla pode aceitar ângulos estruturalmente problemáticos; muito estreita pode gerar falsos blockers em redes válidas. |
| **Responsável futuro** | RT Brasmáquinas |
| **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS` |

---

---

### REGRA_CONSTRUTIBILIDADE_ANGULAR_REDE_INTERNA

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `ALLOWED_DEFLECTIONS_INTERNAL` e `ALLOWED_DEFLECTIONS_ADUTORA` em `network-angle-diagnostics.ts` |
| **Valor usado** | Rede interna: `[0°, 90°]` — Adutora: `[0°, 45°, 90°]` |
| **Onde é usado** | `src/lib/layout/network-angle-diagnostics.ts` — `isAllowedDeflection()`, `detectNetworkAngleIssues()` |
| **Motivo** | A rede interna (principal, ramais, laterais, trechos operacionais, registros, junções internas) opera em malha ortogonal 12×12 m — geometria que naturalmente exige apenas luvas (0°) e curvas/tês 90°. Curvas de 45° não fazem parte do catálogo de conexões da rede interna Brasmáquinas. A adutora conecta captação (posição arbitrária) à boca da rede e pode exigir 45° para acompanhar topografia ou limites de propriedade. |
| **Origem** | Regra confirmada pelo RT da Brasmáquinas antes do início da TASK-015. Não é premissa provisória — é a regra oficial. A tolerância angular ±5° (ver `TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE`) permanece provisória. |
| **Risco** | Projetos com geometria diagonal na principal (polígono inclinado) podem gerar blocker 45° mesmo quando o traçado é razoável. Nesses casos, o usuário deve ajustar o traçado ou o RT deve revisar a regra de ângulos para o caso específico. |
| **Responsável futuro** | RT Brasmáquinas — revisão se houver necessidade de 45° em rede interna em casos especiais |
| **Status** | Regra confirmada pelo RT. Tolerância angular ±5° → `PENDENTE_REVISAO_RT_BRASMAQUINAS` (ver `TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE`) |

---

---

### TOLERANCIA_ASPERSOR_EIXO_LATERAL

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `TOLERANCIA_ASPERSOR_EIXO_LATERAL` |
| **Valor usado** | `0,5 m` |
| **Onde é usado** | `src/lib/layout/laterais.ts` — `maxSprinklerAxisDeviationM()`: calcula desvio máximo de aspersor ao eixo canônico `startLngLat → endLngLat` da lateral física |
| **Motivo** | Após o eixo canônico ser calculado via `toLngLat(xSegRep, yFirst/yLast)`, os aspersores da coluna devem estar a no máximo 0,5 m desse eixo. Desvios acima disso indicam inconsistência geométrica: possível atribuição incorreta de aspersor à coluna, ou error de aproximação plana-geodésica significativo (farm > ~700 m). |
| **Origem** | Premissa provisória de engenharia. Para fazendas < 500 m, o erro de aproximação flat-earth é < 0,1 m — puramente numérico. Para fazendas de 1–2 km, o erro pode alcançar 0,5–2 m, tornando o limiar tecnicamente relevante. Valor 0,5 m adotado como ponto de partida conservador. |
| **Risco** | Para projetos grandes (> 700 m), o limiar pode disparar diagnósticos mesmo em projetos geometricamente corretos. Nesses casos, o RT deve revisar se o limiar deve ser elevado ou se a aproximação plana-geodésica requer correção. |
| **Responsável futuro** | RT Brasmáquinas — revisão para projetos com fazendas > 700 m |
| **Status** | `PREMISSA_PROVISORIA_ENGENHARIA` \| `PENDENTE_REVISAO_BRASMAQUINAS` |

---

## Histórico de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | Documento criado (TASK-010E-B). Registradas 4 premissas: WEIGHT_SECONDARY_LENGTH, WEIGHT_TOTAL_NETWORK_LENGTH, fórmula de normalização, proxy de comprimento. |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-010F: Adicionadas 2 premissas: TOP_K_HYDRAULIC_CANDIDATES, WEIGHT_HYDRAULIC_BLOCKER. |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-013: Adicionada premissa TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE (±5°). |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-015: Adicionada regra REGRA_CONSTRUTIBILIDADE_ANGULAR_REDE_INTERNA (rede interna=[0°,90°]; adutora=[0°,45°,90°]). |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-018: Adicionada premissa TOLERANCIA_ASPERSOR_EIXO_LATERAL (0,5 m). |
