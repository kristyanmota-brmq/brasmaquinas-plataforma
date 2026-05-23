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
| **Valor usado** | `0,10 m` |
| **Onde é usado** | `src/lib/layout/laterais.ts` — `detectAxisDeviations()`: itera as colunas físicas chamando `maxSprinklerAxisDeviationM()`; resultado passado para `generateProposalDiagnostics()` |
| **Regra** | Todo aspersor deve estar sobre a lateral física que o atende. A vala da lateral e o ponto do aspersor são a mesma execução física — um aspersor fora do eixo exige segunda escavação, tornando o projeto construtivamente inválido. A tolerância é exclusivamente numérica/cartográfica, **não é permissão de campo**. |
| **Severidade** | **Blocker.** Desvio acima do limiar impede emissão do PDF via gate existente (HTTP 422). |
| **Origem** | Decisão operacional Brasmáquinas (regra confirmada). Valor 0,10 m é tolerância numérica provisória: para fazendas < 500 m, o erro de aproximação flat-earth é < 0,1 m. O valor cobre o ruído numérico com margem de segurança para projetos normais. |
| **Risco** | Para projetos com fazendas > 500–700 m, o erro flat-earth pode aproximar-se de 0,10 m. Se o RT observar blockers espúrios em projetos geometricamente corretos, elevar o limiar para 0,20 m. |
| **Responsável futuro** | RT Brasmáquinas — revisão do valor se houver blockers espúrios em projetos > 500 m |
| **Status** | Regra: **APROVADO — decisão operacional Brasmáquinas** (não é premissa provisória). Valor 0,10 m: `PENDENTE_REVISAO_BRASMAQUINAS`. |

---

### ROUTE_BUILD_TOL_X_M — **DEPRECATED (TASK-045B)**

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `ROUTE_BUILD_TOL_X_M` |
| **Valor usado** | **deprecated — sem efeito no algoritmo novo** (constante mantida para compatibilidade de assinatura pública: terceiro parâmetro opcional de `buildLateralRoute`) |
| **Status** | **`deprecated`** — substituída por eixo único (mediana de X) + gate `TOLERANCIA_ASPERSOR_EIXO_LATERAL` |
| **Motivo da depreciação** | TASK-045 ajustou de 0,05 → 0,10 m mas a escada visual persistiu no Projeto A real. TASK-044 confirmou empiricamente que **o algoritmo greedy ponto-a-ponto é estruturalmente errado**: cada par de aspersores com desvio numérico pequeno gera cotovelo, propagando trilho deslocado a cada aspersor → escada visível. TASK-045B substituiu o algoritmo: rota agora é **reta única no eixo (mediana de X)** dos aspersores do segmento; aspersor fora de `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m` dispara blocker via `detectAxisDeviations` (ADR-011), sem compensação por cotovelo. |
| **Histórico** | (1) TASK-028: criada com 0,05 m (metade do gate operacional); polilinha greedy passando por todos os aspersores. (2) TASK-045: ajustada para 0,10 m (alinhar com gate ADR-011); blocker angular sumiu mas escada visual persistiu. (3) **TASK-045B**: algoritmo de construção da rota mudou — mediana de X + reta de 2 pontos. Constante mantida apenas para compatibilidade. |
| **Substituída por** | Algoritmo `buildLateralRoute` em `laterais.ts` (TASK-045B): `eixoX = mediana(pts.map(p => p.x))`; rota = `[(eixoX, yMin), (eixoX, yMax)]`. Mediana é **robusta contra outliers** (média seria contaminada e mascararia o blocker). |
| **Responsável futuro** | Constante pode ser removida quando todos os chamadores forem refatorados para não passar mais o terceiro argumento — escopo de tarefa futura B de limpeza |

---

### MAX_VELOCITY_RAMAL_MS

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `MAX_VELOCITY_RAMAL_MS` |
| **Valor usado** | `1,5 m/s` |
| **Onde é usado** | `src/lib/layout/secondary-sizing.ts` — `DEFAULT_MAX_VEL_MS` em `sizeAllSecondaries`; também re-exportado por `src/lib/layout/architecture-selector.ts` para uso interno do motor de seleção arquitetural (TASK-043 / ADR-015). |
| **Regra** | Velocidade máxima admissível em ramais (PVC rígido enterrado com válvulas) para limitar perda de carga e water-hammer. |
| **Origem** | **Referência técnica:** NRCS National Engineering Handbook (Sprinkler Irrigation) adota ≈ 5 ft/s (≈ 1,524 m/s) como limite típico para tubulação plástica enterrada em irrigação por aspersão convencional. O valor atual 1,5 m/s é conservador-equivalente. **Não foi identificada NBR brasileira específica** que defina limite de velocidade em ramais de irrigação por aspersão (NBR 13245 trata de fabricação/desempenho do tubo; NBR 12266 trata de classificação — nenhuma de critério de projeto). |
| **Risco** | Valor conservador pode forçar DN maior (ex.: DN100 R PN80) onde DN75 atenderia operacionalmente. Valor relaxado pode introduzir perdas/golpes inaceitáveis em projetos reais. |
| **Responsável futuro** | RT Brasmáquinas — pode citar NBR específica brasileira (se conhecer) ou trazer dados de campo para calibração; até lá, manter referência NRCS. |
| **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS` |

---

### MAX_HEADLOSS_RAMAL_MCA

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `MAX_HEADLOSS_RAMAL_MCA` |
| **Valor usado** | `3,0 mca` |
| **Onde é usado** | `src/lib/layout/secondary-sizing.ts` — `DEFAULT_MAX_HF_MCA` em `sizeAllSecondaries`; também re-exportado por `src/lib/layout/architecture-selector.ts`. |
| **Regra** | Perda de carga máxima admissível em ramais — 10% da pressão de serviço do aspersor padrão (30 mca × 10% = 3,0 mca). |
| **Origem** | **Boa prática** da literatura de irrigação por aspersão: perda em ramal ≤ 10–15% da pressão de serviço para preservar uniformidade hidráulica entre laterais. Valor 10% (3,0 mca) é conservador dentro da faixa. |
| **Risco** | Mais conservador que 15% (4,5 mca); pode forçar DN maior em ramais longos. Relaxar exige cuidado com perda agregada (principal + ramal + lateral) para que pressão real no aspersor permaneça ≥ 30 mca. |
| **Responsável futuro** | RT Brasmáquinas |
| **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS` |

---

### Critério de vazão de projeto do ramal

| Campo | Valor |
|-------|-------|
| **Parâmetro** | Critério aplicado em `sizeAllSecondaries` |
| **Valor usado** | `max(lateral.vazaoM3h)` em todos os setores da coluna física — retorna a vazão do **pior setor isolado** entre os setores da coluna. Para uma coluna com 3 setores de 57 m³/h cada, retorna **57 m³/h** (não 171 m³/h). Equivale ao critério `max(setor_simultâneo)` correto para operação rotativa por setor. Implementação: [`src/lib/layout/secondary-sizing.ts:180-183`](../../src/lib/layout/secondary-sizing.ts#L180-L183). |
| **Onde é usado** | `src/lib/layout/secondary-sizing.ts` — `sizeAllSecondaries`. Também usado internamente pelo motor de seleção arquitetural (TASK-043) ao avaliar BOM estimada preliminar de cada candidato. |
| **Regra** | Vazão de projeto de cada ramal define o DN selecionado por `selectSecondaryPipe`. Como a operação Brasmáquinas é **rotativa por setor (1 setor ativo por vez)**, o ramal só atende UM setor a qualquer instante; dimensiona-se pelo pior setor isolado. **Não há cenário operacional onde todos os setores da coluna estão simultaneamente ativos.** |
| **Origem** | **Decisão operacional Brasmáquinas confirmada pelo RT em 2026-05-22** (Kristyan Mota): operação é rotativa por setor. O código em [`src/lib/layout/secondary-sizing.ts:180-183`](../../src/lib/layout/secondary-sizing.ts#L180-L183) já implementava o critério correto desde sua origem; TASK-052 apenas corrigiu a descrição contraditória da premissa (que antes afirmava "todos os aspersores ativos simultaneamente" quando o código faz `max(...)`). |
| **Responsável futuro** | — (regra confirmada; sem revisão pendente) |
| **Status** | **`APROVADO_RT` (regra confirmada)** — operação rotativa por setor homologada; critério `max(lat.vazaoM3h)` é o tecnicamente correto. |

---

## Histórico de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | Documento criado (TASK-010E-B). Registradas 4 premissas: WEIGHT_SECONDARY_LENGTH, WEIGHT_TOTAL_NETWORK_LENGTH, fórmula de normalização, proxy de comprimento. |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-010F: Adicionadas 2 premissas: TOP_K_HYDRAULIC_CANDIDATES, WEIGHT_HYDRAULIC_BLOCKER. |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-013: Adicionada premissa TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE (±5°). |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-015: Adicionada regra REGRA_CONSTRUTIBILIDADE_ANGULAR_REDE_INTERNA (rede interna=[0°,90°]; adutora=[0°,45°,90°]). |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-018: Adicionada premissa TOLERANCIA_ASPERSOR_EIXO_LATERAL (0,5 m). |
| 2026-05-20 | Claude Sonnet 4.6 | TASK-019: TOLERANCIA_ASPERSOR_EIXO_LATERAL revisada: valor 0,5 m → 0,10 m; severidade warning → blocker; origem alterada para decisão operacional Brasmáquinas confirmada. |
| 2026-05-21 | Claude Opus 4.7 | TASK-028: Adicionada premissa ROUTE_BUILD_TOL_X_M (0,05 m) — tolerância geométrica interna para construção da rota da lateral em `buildLateralRoute()`. Não é tolerância do blocker. |
| 2026-05-21 | Claude Opus 4.7 | TASK-043 (ADR-015): Adicionadas 3 premissas — `MAX_VELOCITY_RAMAL_MS = 1,5 m/s` (origem NRCS NEH; sem NBR específica brasileira identificada); `MAX_HEADLOSS_RAMAL_MCA = 3,0 mca` (boa prática 10% × 30 mca); critério de vazão de projeto do ramal (`max(setor)` atual; mantido conservador enquanto RT não confirma operação real). Todas com status `PENDENTE_REVISAO_RT_BRASMAQUINAS`. Nenhum valor foi alterado nesta task — apenas formalização. |
| 2026-05-21 | Claude Opus 4.7 | TASK-045: `ROUTE_BUILD_TOL_X_M` atualizado de **0,05 m → 0,10 m**. Justificativa: alinhar com `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m` (ADR-011); eliminar janela entre 0,05 e 0,10 onde aspersores operacionalmente aceitos geravam cotovelos espúrios → laterais visualmente em zigue-zague (regressão registrada em TASK-044). Blocker `detectAxisDeviations` continua disparando se desvio > 0,10 m. Status mantido `PENDENTE_REVISAO_RT_BRASMAQUINAS`. |
| 2026-05-21 | Claude Opus 4.7 | **TASK-045B: `ROUTE_BUILD_TOL_X_M` marcada DEPRECATED.** TASK-045 não eliminou escada visual no Projeto A real: algoritmo greedy ponto-a-ponto era estruturalmente errado. TASK-045B substituiu por **eixo único via mediana de X** + reta de 2 pontos. Constante mantida só para compatibilidade. Aspersor fora de `TOLERANCIA_ASPERSOR_EIXO_LATERAL` continua bloqueado por `detectAxisDeviations` (ADR-011). ADR-012 recebeu emenda interpretativa (não criou ADR-016). |
| 2026-05-22 | Claude Opus 4.7 (TASK-052) | **Premissa "Critério de vazão de projeto do ramal" homologada.** RT (Kristyan Mota) confirmou em 2026-05-22 que a operação Brasmáquinas é **rotativa por setor (1 setor ativo por vez)**. Descrição da premissa corrigida — era contraditória: afirmava "todos os aspersores da coluna ativos simultaneamente" (que seria `sum(...)`) enquanto o código fazia `max(...)` em [`src/lib/layout/secondary-sizing.ts:180-183`](../../src/lib/layout/secondary-sizing.ts#L180-L183). Status promovido `PENDENTE_REVISAO_RT_BRASMAQUINAS → APROVADO_RT`. Linhas "Alternativa pós-RT" e os dois "Risco" obsoletos removidos (incerteza resolvida). Código não foi alterado — já estava tecnicamente correto desde sua origem. Veredito GPT: `aprovado_com_ajustes` com 1 blocker BLK-MET-001 metodológico justificado em `ai/decision-log.md` (snapshot interno do prompt do GPT desatualizado vs valores reais 836/27 — pendência de tooling TOOL-XXX futura). |
