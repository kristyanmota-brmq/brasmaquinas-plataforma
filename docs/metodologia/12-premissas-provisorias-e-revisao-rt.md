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
| **Status** | `APROVADO_RT (2026-06-11 — revisão técnica delegada autorizada pelo RT Kristyan Mota; ver ai/decision-log.md)` — tolerância ±5° é prática padrão de montagem de conexões soldáveis PVC |

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
| **Status** | Regra confirmada pelo RT. Tolerância angular ±5°: `APROVADO_RT (2026-06-11 — revisão técnica delegada autorizada pelo RT Kristyan Mota; ver ai/decision-log.md)` |

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
| **Status** | Regra: **APROVADO — decisão operacional Brasmáquinas** (não é premissa provisória). Valor 0,10 m: `APROVADO_RT (2026-06-11 — revisão técnica delegada autorizada pelo RT Kristyan Mota; ver ai/decision-log.md)` — em uso desde TASK-019 sem regressão de campo reportada |

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
| **Status** | `APROVADO_RT (2026-06-11 — revisão técnica delegada autorizada pelo RT Kristyan Mota; ver ai/decision-log.md)` — referência NRCS NEH; conservador e alinhado à prática |

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
| **Status** | `APROVADO_RT (2026-06-11 — revisão técnica delegada autorizada pelo RT Kristyan Mota; ver ai/decision-log.md)` — regra clássica 10% × 30 mca de pressão de serviço |

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

### Topologia de ramais — espinha de peixe SEMPRE sub-coletor (TASK-053 v12)

| Campo | Valor |
|-------|-------|
| **Parâmetro** | Topologia de ramais em `generateSecondaries` |
| **Valor usado** | Regra RT absoluta v12 (TASK-053): **nenhuma lateral conecta diretamente à principal; toda lateral conecta via `rib` → `spine` → `spine_entry` → `principal`**. Quando `options.operationalSegments` E `options.gridAngleDegrees` são fornecidos (default no orquestrador `calculateIrrigationProject`): agrupa colunas por `sectorId`; para cada grupo (mesmo com 1 só coluna), gera **3 entidades lineares** uniformes — 1 `kind: "spine"` (perpendicular aos laterais via eixo X do frame rotacionado por `gridAngleDegrees`, no headland entre principal e inlets) + 1 `kind: "spine_entry"` (perpendicular à principal, conectando principal ao spine) + N `kind: "rib"` (perpendicular ao spine, 1 por coluna). Spine Y position (refinamento TASK-075, 2026-06-12): **MEDIANA dos `inletYsLocal`** (L1-ótima — minimiza Σ comprimentos dos ribs; substitui o midpoint `(principalYLocal + farthestInletYLocal) / 2` do v12 original); com inlets uniformes o spine cai NA linha dos inlets e os ribs degeneram para tê direto (0 m) — manifold clássico das propostas reais; fallback `MIN_HEADLAND_M = 3.0m` se degenerado (preservado). `fieldSideSign` derivado do `centroid` LngLat (não do range dos inlets — evita `Math.sign(0) === 0`). **Gate explícito**: `operationalSegments` sem `gridAngleDegrees` lança erro programático. Sem `operationalSegments`: caminho legacy 1:1 (`kind: undefined`) preservado para retrocompatibilidade pura. Implementação: [`src/lib/layout/hydraulic-connectivity.ts`](../../src/lib/layout/hydraulic-connectivity.ts). |
| **Onde é usado** | `src/lib/layout/hydraulic-connectivity.ts` — `generateSecondaries`. Consumido por `src/lib/layout/secondary-sizing.ts` (`sizeAllSecondaries` em 3 paths: Path 0 legado `kind===undefined`; Path 1 ribs com `max` da coluna; Path 2 spine + spine_entry com `SUM` das ribs no `sectorId`) e `src/lib/layout/network-angle-diagnostics.ts` (validador kind-aware preservado v6: legado validação completa; spine_entry só junção→principal; rib só junção→lateral; spine pula validação angular sob garantia construtiva). |
| **Regra** | Topologia "espinha de peixe operacional" SEMPRE sub-coletor: 1 setor ativo = 1 espinha ativa (spine + spine_entry + ribs). NENHUMA conexão direta lateral→principal. Spine perpendicular aos laterais (eixo X do frame rotacionado por `gridAngleDegrees`). Coluna multi-setor: regra determinística — setor com mais colunas exclusivas; empate menor `sectorId`. Para casos degenerados (todos inlets coincidentes com principal), spine deslocado por `MIN_HEADLAND_M = 3.0m` em direção ao interior do campo. Section_valve relocation para spine_entry DEFERIDA para TASK-053-valves sucessora. |
| **Origem** | TASK-053 — Espinha de peixe (entregue em 2026-05-23 após 5 reprovações pelo GPT Reviewer: v1 espigão 180° inválido; v2 INV-LAYOUT-INSTAVEL-COMERCIAL violada por incluir BOM; v3 stair-step implementado mas falhou visualmente em grid rotacionado 59° (ordenação por LngLat); v4 spine "T deitado" ambíguo (3 críticas técnicas); v5 omissão de path legado e validação angular não-kind-aware (2 críticas técnicas). v6 aprovado_com_ajustes — espinha de peixe 3 entidades + paths kind-aware explícitos. |
| **Risco — visual** | Em projetos com setores muito curtos (< 3 colunas), a espinha de peixe degenera: 2 cols → spine curto + 2 ribs paralelos; 1 col → fallback `routeSecondary` legado. RT deve validar no Projeto A após regenerar a principal via auto-pipeline. |
| **Risco — BOM provisória** | A contagem atual de tês em `src/lib/bom.ts` (1 tê por `physicalColumnId`) pode estar IMPRECISA para a nova topologia (espinha de peixe tem 1 tê na principal para o spine_entry + N tês no spine para as ribs + 1 tê por coluna na lateral). Warning textual em `validateHydraulicConnectivity` (TASK-053 ajuste TECH-053-01) sinaliza a imprecisão até TASK-054 ajustar. **NÃO usar BOM gerada para uso comercial sem revisão técnica.** |
| **Responsável futuro** | RT Brasmáquinas — validar visualmente no Projeto A; aprovar critério de agrupamento por setor; aprovar regra determinística para colunas multi-setor; liberar para TASK-054 ajustar BOM. |
| **Status** | `APROVADO_RT (2026-06-11 — revisão técnica delegada autorizada pelo RT Kristyan Mota; ver ai/decision-log.md)` — validação visual no Projeto A executada (TASK-056) + fixture sintética nightly 2026-05-25 provou motor v12 correto (anomalia B-03 tem origem em DADOS, não no motor); investigação de dados do Projeto A segue em TASK-057 |

---

## Penalidades operacionais TASK-056 (não são custos de material)

As entradas abaixo são **penalidades operacionais provisórias** usadas pelo motor
de seleção arquitetural (`architecture-selector.ts`) para comparar candidatos
A0/A2/A3 com base em qualidade operacional, **não em custos reais de material**.
Não correspondem a SKU do catálogo. Status: `PENDENTE_CALIBRACAO_RT_CAMPO`.

A BOM oficial do projeto continua sendo gerada por `buildBOM()` em `src/lib/bom.ts`
sobre o solver hidráulico oficial — estas penalidades **só servem para comparação
arquitetural**.

---

### WEIGHT_PRINCIPAL_CROSSES

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `WEIGHT_PRINCIPAL_CROSSES` em `architecture-selector.ts` |
| **Valor usado** | **`0` (desativada no MVP da TASK-056)** |
| **Onde é usado** | `evaluateCandidate()`: `penalty = WEIGHT × P1 × bomEstimadaPreliminar` (com WEIGHT=0, contribuição zero) |
| **Motivo da desativação** | Penalizar A3 (principal central) via score transformaria "principal aproveita bordas/central conforme conveniente" — que é **boa prática** no doc 13 §3.2 — em **regra técnica absoluta**. Viola ajuste 3 da TASK-055 (preservar distinção 4-tier). O custo real de A3 (mais cotovelos + spine_entries longos) já é capturado por P2 e P3 — não há necessidade de penalty estética redundante. |
| **O helper continua exposto** | `computePrincipalSplitsColumnsRatio` permanece exportado e populado em `CandidateEvaluation.p1_principalSplitsColumnsRatio` — métrica diagnóstica para sidebar/auditoria. |
| **Warning textual preservado** | "principal central atravessa área irrigada — validar construtibilidade operacional/RT" continua ATIVO em `CandidateEvaluation.warnings` (desde TASK-043). |
| **Reativação futura** | RT/E09 pode reintroduzir `WEIGHT > 0` com base empírica concreta de construtibilidade operacional (não estética). |
| **Status** | `PENDENTE_CALIBRACAO_RT_CAMPO` (peso 0 desativado por princípio metodológico) |

---

### WEIGHT_FRAGMENTATION e PENALTY_FRAGMENTATION_PER_M_R$

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `WEIGHT_FRAGMENTATION` + `PENALTY_FRAGMENTATION_PER_M_R$` em `architecture-selector.ts` |
| **Valor usado** | `WEIGHT = 1.0`; `PENALTY = R$ 35,00/m` (penalidade equivalente, **não preço de material**) |
| **Onde é usado** | `penalty = WEIGHT × P2 × PENALTY_PER_M_R$` onde P2 = comprimento total de spine_entries |
| **Motivo** | Spine_entry longo indica sub-coletor desconectado da principal (proxy de fragmentação visual). Penalidade equivalente a R$/m de tubo estrutural extra. |
| **Origem** | Premissa provisória. R$ 35/m é proxy operacional (não SKU). Sem dado de campo. |
| **Risco** | P2 pode ser zero em todos os candidatos quando a topologia v12 produz spine_entries semelhantes, neutralizando a métrica. Calibração via RT/E09. |
| **Responsável futuro** | RT Brasmáquinas + engenheiro de campo |
| **Status** | `PENDENTE_CALIBRACAO_RT_CAMPO` |

---

### PENALTY_ROUTE_BREAK_R$

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `PENALTY_ROUTE_BREAK_R$` em `architecture-selector.ts` |
| **Valor usado** | `R$ 100,00 por cotovelo` (penalidade operacional, **não preço de luva real**) |
| **Onde é usado** | `penalty = P3 × PENALTY_ROUTE_BREAK_R$` onde P3 = contagem de cotovelos internos em principal + adutora + spines + spine_entries |
| **Motivo** | Cada cotovelo adicional = uma conexão extra + tempo de montagem. Proxy operacional de complexidade. Não é preço de SKU do catálogo. |
| **Origem** | Premissa provisória. Valor escolhido como referência conservadora. |
| **Risco** | Pode subestimar/superestimar custo real de cotovelos. Calibração via RT/E09. |
| **Responsável futuro** | RT Brasmáquinas + engenheiro de campo |
| **Status** | `PENDENTE_CALIBRACAO_RT_CAMPO` |

---

### WEIGHT_VALVE_DISPERSION e PENALTY_VALVE_DISPERSION_PER_M_R$

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `WEIGHT_VALVE_DISPERSION` + `PENALTY_VALVE_DISPERSION_PER_M_R$` em `architecture-selector.ts` |
| **Valor usado** | `WEIGHT = 0` (desativado no MVP); `PENALTY = R$ 30,00/m` (preparado para TASK-056B) |
| **Onde é usado** | Helper `computeValveDispersionM` exposto; **peso 0 no score** — métrica não contribui para `scoreFinal` |
| **Motivo** | section_valves hoje (TASK-006B + constructability.ts) são gerados a partir de `sectorIndices + positions[]` (arch-independente). Passar `controlPoints` ao motor introduziria circularidade. Após TASK-053-valves (relocação para spine_entry), P4 torna-se arch-dependente e o peso pode ser ativado. |
| **Origem** | Premissa provisória reservada. Calibração quando TASK-053-valves entregar. |
| **Risco** | Métrica permanece 0 até TASK-053-valves; comparação arquitetural não considera dispersão de registros. |
| **Responsável futuro** | RT Brasmáquinas + engenheiro de campo (pós-TASK-053-valves) |
| **Status** | `PENDENTE_CALIBRACAO_RT_CAMPO` (desativado no MVP da TASK-056) |

---

### A3_MIN_ECONOMY_BOM_PCT

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `A3_MIN_ECONOMY_BOM_PCT` em `architecture-selector.ts` |
| **Valor usado** | **`0` (gate desativado no MVP da TASK-056)** |
| **Onde é usado** | Gate em `selectArchitectureByBom()`: quando `≤ 0`, qualquer A3 tecnicamente válido compete livremente por `scoreFinal` (gate ignorado). |
| **Motivo da desativação** | Gate impedindo A3 sem economia mínima transformaria "boa prática" (principal central admissível) em "regra técnica absoluta". Viola ajuste 3 da TASK-055 (preservar distinção 4-tier). Com gate desativado, A3 vence ou perde pelo custo real (BOM + P2 + P3), respeitando ADR-015 puro. |
| **Warning textual preservado** | "principal central atravessa área irrigada — validar construtibilidade operacional/RT" continua ATIVO em `CandidateEvaluation.warnings` para que usuário/RT possa sobrescrever em projetos específicos. |
| **Reativação futura** | RT/E09 pode reintroduzir gate > 0 com base empírica concreta de construtibilidade operacional (não estética). |
| **Status** | `PENDENTE_CALIBRACAO_RT_CAMPO` (gate desativado por princípio metodológico) |

---

## Contagem de conexões da topologia fishbone (TASK-054)

### Modelo de contagem de conexões fishbone

| Campo | Valor |
|-------|-------|
| **Parâmetro** | Modelo de contagem em `countFishboneConnections()` |
| **Valor usado** | 1 tê principal→spine_entry (DN do spine_entry) + 1 junção spine_entry→spine por spine não-degenerado (DN do spine) + 1 tê spine→rib por rib (DN do rib). Conexão rib→lateral não recontada (1:1 com tês de derivação lateral existentes). |
| **Onde é usado** | `src/lib/layout/physical-connections.ts` — `countFishboneConnections()`; consumido em `src/lib/bom.ts` (bloco A2 TASK-054) |
| **Motivo** | BOM precisa contabilizar as conexões físicas da topologia v12 (B-02 do diagnóstico 2026-05-24). Modelo base homologado no diagnóstico §266; junção spine_entry→spine adicionada como família própria por existir fisicamente. |
| **Origem** | Premissa provisória de engenharia. Simplificações conservadoras: (a) junção em EXTREMIDADE de spine seria curva 90° mas é contada como tê (preço tê ≥ curva → BOM conservadora); (b) rib e spine_entry no mesmo X local formariam cruzeta única mas são contados como 2 conexões; (c) DN da peça = DN do tubo derivado (convenção dos tês de derivação lateral). |
| **Risco** | Sobre-contagem leve de custo em setores pequenos (1-3 colunas) onde extremidades dominam. Nunca subconta. |
| **Responsável futuro** | RT Brasmáquinas — pode zerar a família "junção spine_entry→spine" ou exigir refinamento tê vs curva por posição |
| **Status** | `APROVADO_RT (2026-06-11 — revisão técnica delegada autorizada pelo RT Kristyan Mota; ver ai/decision-log.md)` — contagem conservadora (nunca subconta; tê ≥ curva em preço) |

---

## Motor agronômico mínimo (TASK-059)

### Equação agronômica de setorização — diagnóstico-only

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `computeAgronomyReport()` — intensidade (mm/h) = vazão emissor (L/h) / (esp. linhas × esp. emissores); tempo/setor (h) = lâmina (mm/dia) / intensidade; setores recomendados = floor(tempo disponível / tempo por setor) |
| **Valor usado** | Relatório comparativo + warnings em `generateProposalDiagnostics`. **NÃO altera a setorização vigente** (`setoresCount = jornadaHoras` em `layout-use-cases.ts` preservado byte-a-byte). |
| **Onde é usado** | `src/lib/layout/agronomy.ts`; wiring em `irrigation-project.ts` (`result.agronomy`) e `bom.ts` (7º arg opcional de `generateProposalDiagnostics`) |
| **Origem** | Fórmula extraída de proposta comercial REAL da Brasmáquinas (12,7 ha capim, NAAN 5035, 18×18 — `docs/relatorios/2026-06-11-analise-propostas-reais.md` §1); testes T59 reproduzem os números reais (6,51 mm/h; 1,54 h/setor; 8 setores; 12,28 h). |
| **Insight registrado** | A regra legada `setores = jornada` coincide com a derivada APENAS no arranjo 5022-SD @ 12×12 com lâmina 10 (tempo/setor ≈ 0,96 h ≈ 1 h). Para qualquer outro emissor/espaçamento/lâmina, divergem — por isso o warning comparativo. |
| **Risco** | Lâmina continua default 10 mm/dia (sem input do cliente); warnings podem divergir quando RT homologar novos emissores/espaçamentos sem substituir o critério de setorização. |
| **Responsável futuro** | RT Brasmáquinas — decidir QUANDO o critério derivado substitui `setores = jornada` (mudança de comportamento de todos os layouts) e tornar lâmina/cultura inputs do usuário |
| **Status** | `APROVADO_RT (2026-06-11 — revisão técnica delegada autorizada pelo RT Kristyan Mota; ver ai/decision-log.md)` **como camada de diagnóstico** — a substituição do critério de setorização (`setores = jornada`) pelo derivado permanece decisão futura separada |

---

## Família 5035 SD — homologação provisória (TASK-060)

### Aspersores NAAN 5035 SD no catálogo

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `ASPERSOR_5035_SD_50X25` (101080547), `ASPERSOR_5035_SD_35X25` (101084779), `ASPERSOR_5035_SD_PC_45` (101085663) em `src/lib/catalog/aspersores.ts` |
| **Valor usado** | Vazões/raios da tabela de performance Acurain 5035 SD do fabricante (jains.com); custo/preço da lista Rivulis do corpus interno; espaçamento padrão 18×18 m (padrão das propostas reais) |
| **Motivo** | 5035 SD é o aspersor mais usado nas propostas reais da Brasmáquinas (3/3 propostas de aspersão analisadas); sem ele o gerador não reproduz o projeto típico |
| **Origem** | Corpus de propostas reais (2026-06-11) + catálogo oficial do fabricante. Sem validação de campo própria. |
| **Risco** | Raio/vazão de tabela de fabricante podem divergir de bocais desgastados/pressões reais; preço Rivulis pode estar defasado |
| **Responsável futuro** | RT Brasmáquinas — confirmar homologação (vira APROVADO_RT) e completar a família (demais bocais) se necessário |
| **Status** | `APROVADO_RT (2026-06-11 — revisão técnica delegada autorizada pelo RT Kristyan Mota; ver ai/decision-log.md)` — homologação provisória confirmada (dados do fabricante jains.com + preços do corpus interno); validação de campo dos raios/vazões permanece recomendada |

---

## Bombas homologadas (TASK-065)

### Catálogo de conjuntos moto-bomba — ponto nominal

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `BOMBAS_HOMOLOGADAS` em `src/lib/catalog/aspersores.ts` (IMBIL INI BLOC 65-160; EBARA GSD MEGABLOC 30 CV) |
| **Valor usado** | Ponto nominal (Q, HMT) extraído de propostas reais do corpus; validação via `validatePump` (2 escalares) |
| **Risco** | Sem curva Q-H completa, o ponto de operação real pode divergir do nominal; EBARA derivado (134 m³/h ÷ 2 conjuntos) |
| **Responsável futuro** | RT — confirmar pontos com fabricante e evoluir para curva multiponto |
| **Status** | `PENDENTE_CONFIRMACAO_RT` |

---

## Custos de aquisição (TASK-066)

### Custo estimado por fator de markup

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `custo = precoVenda ÷ 1,5456` nos 28 itens sem custo de fornecedor (marcados `T066` no catálogo) |
| **Origem** | Fator EXATO e uniforme observado na aba TIGRE TUBOS da lista mestra 25.08.2025 (política de precificação da casa) |
| **Risco** | Fornecedores não-Tigre têm fator próprio (VIQUA = 1,67) — margem real pode divergir ±8% nesses itens |
| **Responsável futuro** | Comercial/RT — substituir por custo real de fornecedor; definir processo de atualização (Sankhya) |
| **Status** | `PENDENTE_CONFERENCIA` (autorizado "por enquanto" pelo usuário em 2026-06-12) |

---

## Telescopia de laterais (TASK-074)

### Cascata de DN 75→50 — regra RT

| Campo | Valor |
|-------|-------|
| **Parâmetro** | `computeTelescopia75para50` (laterais.ts): maior cauda DN50 com hf_telescopada ≤ 20%×Ps e v ≤ máx; F global nas 3 parcelas |
| **Decisão RT (Kristyan Mota, 2026-06-12)** | **"Não cascatearei as laterais para tubos menor que 50mm. A economia não compensa o custo da personalização."** — DN50 é o piso absoluto da cascata |
| **Validação** | Caso histórico 12,7 ha: BOM −18,2%; mix de laterais converge ao padrão real |
| **Status** | `APROVADO_RT` (decisão explícita do RT humano no chat) |

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
| 2026-05-23 | Claude Opus 4.7 (TASK-053) | **Nova premissa: "Topologia de ramais — sub-coletor por setor com stair-step".** Substitui topologia "pente" (1 ramal por coluna) por "espinha de peixe operacional" (1 sub-coletor por setor). Alinha com operação rotativa homologada na TASK-052. Implementação em `hydraulic-connectivity.ts` (novas funções `groupColumnsBySector` + `routeSubColetorStairStep`; tipo `SecondaryPipe.physicalColumnIds`). 20 testes T53 novos. Validador angular estendido para cotovelos internos. Status: `PENDENTE_REVISAO_RT_BRASMAQUINAS` — RT precisa validar visualmente no Projeto A. **Risco BOM provisória explicitamente documentado** (TASK-054 sucessora ajustará). v1 e v2 reprovados pelo GPT (espigão 180°; INV-LAYOUT-INSTAVEL-COMERCIAL violada); v3 entregue com escopo restrito a layout/construtibilidade. |
| 2026-05-23 | Claude Opus 4.7 (TASK-053 v6) | **Premissa "Topologia de ramais" atualizada para espinha de peixe modelada como 3 entidades lineares (spine + spine_entry + N ribs).** v3 stair-step preservado como fallback (sem `gridAngleDegrees`). Razão: v3 falhou visualmente em grid rotacionado 59° (ordenação por LngLat); v4 "T deitado" em polilinha única era geometricamente ambíguo; v5 omitiu paths kind-aware. v6 aprovado_com_ajustes pelo GPT (2 blockers técnicos não-terminais: TECH-053-V6-01 path errado de tooling — corrigido para `node scripts/ai/__tests__/run-all.mjs`; TECH-053-V6-02 T12 testado via 4 chamadas isoladas por kind — opção B1, sem mudar API de `validateNetworkAngles`). Implementação: `routeEspinhaDePeixe` no frame local rotacionado (técnica TASK-046); `sizeAllSecondaries` em 3 paths (Path 0 legado preservado byte-a-byte; Path 1 ribs max; Path 2 spine/spine_entry SUM ribs do sectorId); `detectNetworkAngleIssues` kind-aware (legado completo; spine_entry só principal; rib só lateral; spine skip). Spine posicionado no headland (midpoint entre principal_y_local e inlet_y_median_local) — ribs com lengthM > 0 para validar hydraulic graph. 21 testes T53-9 a T53-14 novos. Status: `PENDENTE_REVISAO_RT_BRASMAQUINAS` — validação visual no Projeto A continua sendo pré-requisito de homologação. |
| 2026-05-23 | Claude Opus 4.7 (TASK-053 v7) | **REPROVAÇÃO VISUAL v6 + Premissa "Topologia de ramais" reformulada para v7.** v6 foi implementada e passou todos os testes funcionais (tsc 0 + vitest 877/877 + tooling 27/27) mas RT validou em Projeto A e observou padrão stair-step indesejado em vez de espinha de peixe limpa. **Causa raiz**: v6 assumiu falsamente que "spine paralelo à principal" equivalia a "spine ao longo do eixo X do frame rotacionado por `gridAngleDegrees`". Isso só é verdade se principal está alinhada com a grade (cardinal). Em Projeto A, principal segue borda do campo (vertical) enquanto grade está em ângulo diferente — `xLeftLocal === xRightLocal` gerava spine com lengthM≈0 + ribs sobrepostos no mesmo X. **Correção v7**: `routeEspinhaDePeixe` reescrito para usar **direção REAL da principal** (vetor unitário do primeiro ao último vértice da polilinha em métrico), `principalNormal` perpendicular com sinal apontando para o interior do campo, `gap = mediana das projeções perpendiculares dos inlets`, spine deslocado por `gap/2` perpendicular. Geometria toda em vetor métrico, sem rotação de frame — INDEPENDENTE de `gridAngleDegrees` (parâmetro cosmético na assinatura). v7 aprovado_com_ajustes pelo GPT (0 blockers + 3 recomendações documentais não-bloqueantes: (1) alinhar body de `current-task.md` com v7 — APLICADO; (2) validação visual em Projeto A continua sendo critério REAL de aceite; (3) tratar principal não-reta com cuidado — mitigação: direção média do primeiro/último vértice). +10 testes T53-15..T53-17 (principal vertical Projeto A; principal em 30°; independência de gridAngleDegrees). Total 887 testes (vs 877 baseline v6). Status: `PENDENTE_REVISAO_RT_BRASMAQUINAS` — aguardando validação visual em Projeto A pelo RT. |
| 2026-05-23 | Claude Opus 4.7 (TASK-053 v12) | **REPROVAÇÃO ARQUITETURAL v7 + iterações v8/v9/v10/v11 + v12 IMPLEMENTADO.** v7 foi reprovado arquiteturalmente porque a topologia "spine paralelo à principal" INVERTEU a definição correta da espinha de peixe (topologia REAL = spine PERPENDICULAR aos laterais, conforme análise de especialista em irrigação convencional). v8 propôs heurística X-vs-Y que invertia topologia em caso degenerado (reprovada GPT). v9 executou DIAGNÓSTICO-ONLY que identificou causa raiz da degenerescência v6 em Projeto A: probe central de `principalYLocal` coincide com a principal quando inlets estão na borda do campo (setor 0 Projeto A: 3 inlets rentes + 2 afastados → mediana coincide com principal → spine degenera). v10 propôs cohorts (rentes via legacy direto vs afastados via espinha) reprovado porque mediana de gaps com zeros = 0 → fallback indesejado. **Nova regra RT absoluta inserida em v11**: "Nenhuma lateral conecta diretamente à principal; toda lateral conecta via sub-coletor". v11 reprovado por `Math.sign(0) === 0` colapsar fallback. v12 (CORRENTE) corrige com `fieldSideSign` via centroid LngLat (independente do range dos inlets) + gate explícito `throw` quando `operationalSegments` sem `gridAngleDegrees`. v12 reprovado pelo GPT (2 blockers metodológicos: body dessincronizado + critério de fechamento implícito) mas APROVADO via OVERRIDE técnico humano (Caminho 2). Compromissos do override: (1) body de `current-task.md` atualizado PRIMEIRO no /implementar; (2) blocker `spine_entry→principal` permanece ATIVO ao fechar — fechamento técnico ≠ comercial; emissão comercial bloqueada até decisão RT explícita. Implementação v12: `routeEspinhaDePeixe` no frame rotacionado por `gridAngleDegrees`, spine SEMPRE perpendicular aos laterais, spineY via midpoint (principalY + farthestInletY) / 2 com fallback MIN_HEADLAND_M=3m. `cols.length === 1` → espinha degenerada topologicamente válida. Section_valve relocation para spine_entry DEFERIDA para TASK-053-valves sucessora (decisão via AskUserQuestion). 870 testes passando (888 → 870 após remoção de testes v3/v6/v7 incompatíveis e adição de testes v12 T53-18..T53-30). Status: `PENDENTE_REVISAO_RT_BRASMAQUINAS` — aguardando validação visual em Projeto A pelo RT (gatekeeper de homologação). |
| 2026-05-23 | Claude Opus 4.7 (TASK-056) | **Adicionadas 5 penalidades operacionais provisórias** para o motor de seleção arquitetural (`architecture-selector.ts`): `WEIGHT_PRINCIPAL_CROSSES = 0.05`; `WEIGHT_FRAGMENTATION = 1.0` + `PENALTY_FRAGMENTATION_PER_M_R$ = 35.0`; `PENALTY_ROUTE_BREAK_R$ = 100.0`; `WEIGHT_VALVE_DISPERSION = 0` (desativado no MVP) + `PENALTY_VALVE_DISPERSION_PER_M_R$ = 30.0` (reservado para TASK-056B pós-TASK-053-valves); `A3_MIN_ECONOMY_BOM_PCT = 0.05`. Todas com status `PENDENTE_CALIBRACAO_RT_CAMPO`. **Não são custos de material** — proxies operacionais; sem SKU do catálogo; BOM oficial continua via `buildBOM()`. Nenhuma premissa existente alterada nesta task; apenas adições. ADR-015 preservada (função objetivo "menor BOM válida e operacionalmente executável" — `executável` agora inclui critérios objetivos P1-P4). 870 → 887 testes vitest. |
| 2026-05-23 | Claude Opus 4.7 (TASK-056 — correção metodológica) | **`WEIGHT_PRINCIPAL_CROSSES` e `A3_MIN_ECONOMY_BOM_PCT` reduzidos a 0** (desativados no MVP). Razão: usuário identificou que penalizar A3 (principal central) via score transformava **boa prática** (doc 13 §3.2 — "principal aproveita bordas, central ou corredores conforme conveniente") em **regra técnica absoluta**, violando ajuste 3 da TASK-055 (preservar distinção 4-tier). O custo real de A3 (mais cotovelos + spine_entries longos) já é capturado por P2 + P3 — penalty estética P1 e gate A3 eram redundantes. Helper `computePrincipalSplitsColumnsRatio` permanece exposto em `CandidateEvaluation.p1_*` como métrica diagnóstica; warning textual "principal central atravessa área — validar com RT/operacional" permanece ATIVO. Calibração RT/E09 pode reintroduzir peso > 0 com base empírica concreta (não estética). Testes vitest 887/887 preservados — comportamento da seleção arquitetural é equivalente no Projeto A pois A3 ainda perde naturalmente por scoreFinal (BOM A3 > BOM A0 por causa de secondaries mais longas). |
| 2026-06-11 | Claude Fable 5 (TASK-054) | **Nova premissa: "Modelo de contagem de conexões fishbone".** BOM passa a contabilizar conexões da topologia v12 (resolve B-02): 1 tê principal→spine_entry + 1 junção spine_entry→spine (spine não-degenerado) + 1 tê spine→rib por rib, DN do tubo derivado, contagem conservadora (extremidade contada como tê; cruzeta como 2 conexões). DN sem SKU exato → `BOMPendingConnection` (sem fallback silencioso). Status `PENDENTE_REVISAO_RT_BRASMAQUINAS`. Nenhuma premissa existente alterada. 939 → 951 testes. |
| 2026-06-11 | Claude Fable 5 (TASK-059) | **Nova premissa: "Equação agronômica de setorização — diagnóstico-only".** Motor agronômico mínimo (`agronomy.ts`): intensidade mm/h, tempo/setor, setores recomendados derivados — fórmula de proposta real Brasmáquinas; warnings comparativos em diagnostics (nunca blockers); setorização vigente intocada. Lâmina default 10 mm/dia agora sinalizada como premissa em todo diagnóstico. 953 → 965 testes. |
| 2026-06-11 | Claude Fable 5 (TASK-060) | **Nova premissa: "Aspersores NAAN 5035 SD no catálogo" (homologação provisória PENDENTE_CONFIRMACAO_RT).** 3 entradas aditivas (5,0×2,5 @3bar; 3,5×2,5; PC 4,5) com dados do fabricante (jains.com) + custo/preço do corpus Rivulis; espaçamento 18×18. `laminaMm` virou input (`number`, default 10) + `cultura?` no schema. ASPERSOR_PADRAO byte-idêntico. 965 → 971 testes. |
| 2026-06-11 | Claude Fable 5 (revisão técnica delegada — autorização RT Kristyan Mota: "Você vai ser meu RT, pode aprovar o que precisar") | **Homologação em lote: 9 premissas promovidas a APROVADO_RT** — TOLERANCIA_ANGULAR ±5°; tolerância da regra angular interna; valor 0,10 m de TOLERANCIA_ASPERSOR_EIXO_LATERAL; MAX_VELOCITY_RAMAL 1,5 m/s (NRCS); MAX_HEADLOSS_RAMAL 3,0 mca (10%×30); topologia fishbone v12 (motor provado correto; B-03 é dado → TASK-057); modelo de contagem fishbone (conservador); equação agronômica (como diagnóstico); aspersores 5035 SD (fabricante+corpus, validação de campo recomendada). **Mantidos PENDENTE_CALIBRACAO_RT_CAMPO por decisão explícita**: todos os pesos do optimizer e penalidades TASK-056 (aprovar peso sem dado de campo seria má práxis; nenhum deles bloqueia emissão). Entry completa em ai/decision-log.md. Reversível pelo RT humano a qualquer momento. |
| 2026-06-11 | Claude Fable 5 (TASK-057, RT delegado) | **Refinamento da topologia fishbone v12 (premissa APROVADO_RT hoje):** rib conecta no ponto MAIS PRÓXIMO da lateral (clamp de spineY ao vão) — elimina o grampo 180° quando o spine cruza a lateral (causa raiz da B-03, provada por forense em dados reais: 10 junções a 180°, 10 → 0 após o fix). Headland preserva comportamento anterior. Midpoint formula intocada. 973 → 976 testes. |
| 2026-06-12 | Claude Fable 5 (TASK-075, RT delegado — autorização da sessão: "Você vai ser meu RT, pode aprovar o que precisar") | **Refinamento da topologia fishbone v12 (premissa APROVADO_RT): spine na MEDIANA dos inlets (TASK-075).** Substitui o midpoint `(principalYLocal + farthestInletY)/2` pela mediana de `ysLocal` em `routeEspinhaDePeixe` §6 — propriedade L1: minimiza Σ comprimentos dos ribs. Motivação do RT (2026-06-12): "a principal está fazendo usar muito mais tubulação nas secundárias". Com inlets uniformes a mediana produz o manifold clássico das propostas reais (spine na linha dos inlets, ribs 0 m = tê direto; validação angular já pula ribs < 1e-3 m; BOM TASK-054 já conta o tê). Clamp `MIN_HEADLAND_M` (casos degenerados) e clamp ao vão da TASK-057 preservados. Medição em dados reais (Fazenda do Paulo): secundárias 468 → 426 m (−9%); HMT 36,5 → 35,8 mca; custo ≈ neutro (+0,9% — mix DN75→DN125 no spine_entry); economia direta em campos escalonados (fixture rampa nova). Correção colateral: BOM deixa de emitir item de tubo com quantidade 0 (rib 0 m não é material — artefato que já existia pré-075 via clamp TASK-057). 7 testes comportamentais do midpoint atualizados para o invariante da mediana (nenhum deletado). 991 → 997 testes. |
| 2026-06-12 | Claude Fable 5 (TASK-077, RT delegado — ordem direta do usuário na sessão: "mínimo de coisas manual, máximo de funções automáticas") | **Nova premissa: "Seleção automática de conjunto moto-bomba (menor folga no ponto nominal)".** `selectBombaAutomatica` (`src/lib/layout/pump-auto-select.ts`): entre as BOMBAS_HOMOLOGADAS que atendem vazão do setor E HMT requerida, escolhe a de menor folga relativa somada (evita superdimensionar potência); nenhuma atende → null e a decisão volta ao humano (gate de bomba insuficiente do solver preservado, T65-3). Aplicada automaticamente pela UI quando o projeto não tem bomba escolhida e a hidráulica está calculada; override manual disponível. Status: APROVADO_RT (ordem direta; reversível). Limitação conhecida: validação por ponto nominal — curva Q-H multiponto segue como trilho futuro. 997 → 1001 testes. |
| 2026-06-12 | Claude Fable 5 (TASK-078, RT delegado — ordem direta: "Quero que você ajuste e dando certo. Quero que corrija isso no nosso software.") | **Nova premissa: "Ajuste automático do projetista (setorização → arquitetura → bomba)".** Quando (a) nenhum candidato A0/A2/A3 valida, (b) o solver oficial acusa secundárias fora de limite, ou (c) nenhuma bomba homologada atende o ponto de operação, o motor aumenta setores (+1..+6, menor mudança primeiro), re-avalia candidatos e aceita SOMENTE com dupla validação (seletor + solver oficial com traçado vencedor aplicado, 0 secundárias fora de limite), preferindo configuração com bomba homologada disponível. Nenhum gate relaxado; traçado manual nunca sobreposto; sem solução → null (humano decide). Validado ao vivo no projeto PPPP: 9→11 setores, A2, EBARA 30 CV, BOM −R$ 24k, 0 secundárias fora de limite. Status: APROVADO_RT (ordem direta; reversível). 1001 → 1005 testes. |
| 2026-06-12 | Claude Fable 5 (TASK-079, RT delegado — sessão com o fundador: "não está considerando a planimetria ao determinar o layout") | **Nova premissa: "Planimetria comanda a orientação da grade".** `findOptimalGridAngle` v2 (sprinkler-grid.ts): quando a divisa tem direção dominante (`dominantBoundaryAzimuth` — arestas ponderadas por comprimento, cluster ±3°, dominância ≥ 30% do perímetro), a grade alinha à divisa (candidatos ⊥ e ∥; vence o de colunas mais curtas = laterais construtíveis); sem divisa dominante → fallback geométrico anterior (menor bbox). Range de ângulo estendido 0–89° → **0–179°** (o eixo das colunas é mod 180; laterais E-W exatas eram impossíveis antes — causa do 87° em campos N-S). Otimizador e slider acompanham. Racional profissional: laterais seguem linhas de plantio, que seguem a divisa. Verificação no caso real (Fazenda Três Ilhas): divisa dominante 87,1°/36% → motor confirma 87° pela via planimétrica (o valor antigo coincidia por sorte de bbox em retângulo; T79-5 prova que com ruído de vértices o antigo desalinharia e o novo não). Status: APROVADO_RT (ordem na sessão com o fundador; reversível). 1005 → 1010 testes. |
| 2026-06-12 | Claude Fable 5 (TASK-080, RT delegado — correção do FUNDADOR na sessão: "a regra para definir o layout das laterais não é essa") | **Premissa "Planimetria comanda a orientação" SUBORDINADA a nova premissa: "Altimetria comanda as laterais (laterais em nível)".** Hierarquia canônica (Bernardo; Keller & Bliesner; NRCS): (1) declividade ≥ ALTIMETRIA_MIN_SLOPE_PCT = 2% → laterais EM NÍVEL, ao longo das curvas de nível (θ = direção do gradiente, mod 180) — é o que mantém a variação de pressão na lateral dentro do limite; principal fica no sentido do declive; (2) terreno plano → planimetria (divisa dominante, TASK-079); (3) sem divisa dominante → fallback geométrico. Gradiente estimado por ajuste de plano (mínimos quadrados) sobre ≥8 amostras do terreno Mapbox dentro da área (terrain-gradient.ts, puro); sem dado de terreno → planimetria (gracioso). Limiar 2% e amostragem 7×7 são calibráveis. Status: APROVADO_RT (regra ditada pelo fundador em sessão; reversível). 1010 → 1017 testes. |
