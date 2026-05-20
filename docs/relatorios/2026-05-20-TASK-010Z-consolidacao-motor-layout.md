# Motor de layout 12×12 — Consolidação técnica (TASK-010Z)

**Data:** 2026-05-20
**Autor:** Claude Sonnet 4.6
**Status:** Registro técnico — não substitui revisão pelo RT

---

## 1. Visão geral

O motor de layout 12×12 é uma ferramenta experimental para sugestão preliminar de disposição
de aspersores em projetos de irrigação convencional. Ele avalia até 112 variações geométricas
de uma grade regular (7 ângulos × 4×4 offsets de posição), pontua cada candidato por múltiplos
critérios e sugere o melhor candidato geométrico-operacional.

**Arquivo principal:** `src/lib/layout/sprinkler-grid-optimizer.ts`

**Escopo atual:** ferramenta de sugestão preliminar, não homologada como resultado técnico final.
Todo candidato selecionado requer revisão pelo RT antes de uso em proposta comercial.

**Construído em:** TASK-010A a TASK-010F (2026-05-20).

---

## 2. Fluxo completo de dois passos

### Passo 1 — Ranking geométrico-operacional (obrigatório)

```
findBestSprinklerLayout(polygon, spacingMeters, nSetores?, waterSource?)
```

Avalia todos os candidatos sem chamar o solver hidráulico. Retorna `LayoutSelectionResult`.

**Espaço de busca:**
- `findOptimalGridAngle(polygon)` — ângulo de mínima bounding box via Turf.js
- 7 ângulos: ótimo ± 3 vizinhos com passo de 3° (`N_ANGLE_NEIGHBORS=3`, `ANGLE_STEP_DEG=3`)
- 4 × 4 = 16 combinações de offset X/Y por ângulo (`N_OFFSET_STEPS=4`)
- Total: até 112 candidatos

**Camadas de métricas computadas por candidato:**

| Camada | Métricas | Disponível quando |
|--------|----------|-------------------|
| Geométrica | `fillingRatio`, `sprinklerCount`, `shortColumnRatio`, `edgeQualityScore/Penalty` | Sempre |
| Comprimento de laterais | `totalLateralLengthM`, `avgLateralLengthM`, `maxLateralLengthM`, `lateralLengthPerSprinklerM`, `lateralLengthPerHectareM` | Sempre |
| Operacional | `sectionValveCount`, `fragmentedColumnCount`, `fragmentedLateralRatio`, `operationalSegmentsCount`, `maxSegmentsPerColumn`, `desbalanceamentoPercent` | `nSetores` válido |
| Rede de distribuição | `principalLengthM`, `adutoraLengthM`, `secondaryLengthM`, `totalNetworkLengthM`, `avgSecondaryLengthM`, `maxSecondaryLengthM`, `distributionLengthRatio` | `waterSource` presente |
| Hidráulica | `hydraulicBlockers`, `hydraulicEvaluationStatus`, `hydraulicHmtRequiredMca`, `hydraulicInvalidSegmentsCount` | Após Passo 2 |

**Seleção:** candidato com maior `score.total` após penalidades.

### Passo 2 — Validação hidráulica Top-K (opcional, explícito)

```
runTopKHydraulicValidation(selectionResult, options)
```

Avalia apenas os `TOP_K_HYDRAULIC_CANDIDATES` (= 5) melhores candidatos geométricos com o
solver oficial. Nunca executado automaticamente — requer clique explícito do usuário.

**Pré-condições:**
- `waterSource` presente → senão: `not_evaluated_missing_waterSource`
- `pump` presente → senão: `not_evaluated_missing_pump`
- `nSetores` válido → senão: `not_evaluated_missing_sectorization`
- `geodetic` ausente → avaliação prossegue, mas `selectionReason` registra aviso

**Para cada Top K candidato:**
1. Re-executa `buildSectorsByFlowWithColumnSplitting` (recalcula `sectorIndices`)
2. Re-executa `generatePrincipalAndAdutora` (recalcula coordenadas da principal)
3. Monta `ProjectLayout` temporário (placeholders: `jornadaHoras=9`, `laminaMm=10`)
4. Chama `calculateIrrigationProject(tempLayout)` — solver oficial
5. Extrai `diagnostics.blockers` como `HydraulicBlockerReal[]`
6. Aplica penalidade `score.total -= WEIGHT_HYDRAULIC_BLOCKER` quando blockers > 0

**Re-eleição:** `best` após validação é sempre o melhor entre os Top K avaliados.

### Projeto final — solver oficial

```
calculateIrrigationProject(layout: ProjectLayout)
```

Não faz parte do motor de candidatos. É o orquestrador que produz o `IrrigationProjectResult`
oficial usado na proposta. O motor chama este solver no Passo 2 apenas para coletar blockers
dos candidatos Top K — não para produzir o projeto final.

---

## 3. Tabela completa de OPTIMIZER_PARAMS

| Parâmetro | Valor | Origem | Status |
|-----------|-------|--------|--------|
| `N_MIN_COLUMN` | `3` | Heurística de engenharia | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `N_ANGLE_NEIGHBORS` | `3` | Cobertura angular ±9° ao redor do ótimo | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `ANGLE_STEP_DEG` | `3°` | Granularidade de busca angular | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `N_OFFSET_STEPS` | `4` | Granularidade de offset X/Y | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_SHORT_COLUMN` | `0.5` | Heurística de penalidade geométrica | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_EDGE` | `0.3` | Heurística de penalidade de borda | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_SECTION_VALVE` | `0.3` | Heurística operacional | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_FRAGMENTATION` | `0.4` | Heurística operacional | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_IMBALANCE` | `0.2` | Heurística operacional | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_LATERAL_LENGTH` | `0` | **Inativo** — normalização pendente | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `WEIGHT_SECONDARY_LENGTH` | `0.10` | Premissa provisória de mercado (conservador) | `PREMISSA_PROVISORIA_MERCADO` · `PENDENTE_REVISAO_RT_BRASMAQUINAS` |
| `WEIGHT_TOTAL_NETWORK_LENGTH` | `0.10` | Premissa provisória de engenharia (conservador) | `PREMISSA_PROVISORIA_MERCADO` · `PENDENTE_REVISAO_RT_BRASMAQUINAS` |
| `TOP_K_HYDRAULIC_CANDIDATES` | `5` | Heurística de cobertura vs. custo computacional | `PREMISSA_PROVISORIA_MERCADO` · `PENDENTE_REVISAO_RT_BRASMAQUINAS` |
| `WEIGHT_HYDRAULIC_BLOCKER` | `0.50` | Penalidade deliberadamente alta para rebaixar candidatos com blockers reais | `PREMISSA_PROVISORIA_MERCADO` · `PENDENTE_REVISAO_RT_BRASMAQUINAS` |

---

## 4. Classificação de critérios

### A. Regras definidas para o envelope atual

Estas decisões já foram tomadas e registradas. Não dependem de calibração com dados de campo
para o funcionamento atual do motor:

| Regra | Descrição | Referência |
|-------|-----------|------------|
| Aspersor padrão Naan 5022-SD | SKU `101092` — 4.0×1.8 mm, 30 mca, 1,5 m³/h, 12 m espaçamento | `ASPERSOR_PADRAO` em `aspersores.ts` |
| Malha fixa 12×12 | Espaçamento fixo em X e Y; sem malha retangular assimétrica | `generateRotatedSprinklerGridWithOffset` |
| Motor como ferramenta preliminar | Badge persistente; confirmação explícita antes de aplicar candidato | ADR-006 |
| Validação hidráulica Top-K com solver oficial | `calculateIrrigationProject` — sem solver paralelo, sem estimador próprio | ADR-006, TASK-010F |
| Blockers do solver são fonte de verdade | `diagnostics.blockers` como `HydraulicBlockerReal[]` — não estimativa | `runTopKHydraulicValidation` |

### B. Premissas provisórias de mercado/engenharia

Estes parâmetros têm valores ativos no código mas sem calibração com projetos reais da Brasmáquinas.
Podem alterar o ranking de candidatos. Requerem revisão pelo RT antes de uso em proposta homologada:

| Premissa | Valor atual | Risco se não calibrado |
|----------|-------------|----------------------|
| `WEIGHT_SECONDARY_LENGTH = 0.10` | Conservador — baixo impacto | Sub ou superpenaizar layouts com ramais atípicos |
| `WEIGHT_TOTAL_NETWORK_LENGTH = 0.10` | Conservador — baixo impacto | Penalidade injusta em captações estruturalmente distantes |
| `distributionLengthRatio` como fórmula de normalização | `(principal + adutora + ramais) / max(laterais, 1)` | Inflar razão em polígonos com poucas colunas |
| `TOP_K_HYDRAULIC_CANDIDATES = 5` | Cobre os 5 melhores geométricos | Candidato hidraulicamente melhor pode estar na posição 6+ |
| `WEIGHT_HYDRAULIC_BLOCKER = 0.50` | Penalidade alta deliberada | Candidato com muitos blockers e score alto pode ainda superar candidatos sem blockers |
| Comprimento geométrico como proxy de custo | Sem diâmetro, hf, topografia | Um candidato com rede longa pode ser hidraulicamente superior |

Documentadas em: `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`

### C. Pendências futuras (fora do escopo atual)

Estas evoluções não existem no código atual e requerem decisão explícita de produto e engenharia:

| Pendência | Impacto esperado | Dependência |
|-----------|-----------------|-------------|
| Calibração de OPTIMIZER_PARAMS com projetos reais | Pesos refletem comportamento real de campo | RT + projetos homologados |
| Topografia por candidato (desnível ponto-a-ponto) | HMT mais realista por candidato | Solver de elevação por segmento |
| Corredor de tubulação | Restrição de passagem de tubo principal via polígono real | Dados de campo |
| Massa/custo de PVC como critério (TASK-006) | Seleção por menor custo de material, não menor diâmetro | Catálogo com massa/metro |
| Motor comercial consumindo LayoutSelectionResult | Proposta vinculada ao candidato selecionado | TASK-002 (Motor A/B/C) |
| Classificação A/B/C integrada ao motor | Projeto classificado antes de sair para proposta | TASK-002 |
| Malha retangular assimétrica (espaçamento X ≠ Y) | Cobertura de áreas com culturas de espaçamento irregular | Mudança arquitetural |

---

## 5. Governança e ADRs relacionados

As decisões estruturais que governam o motor estão ou serão rastreadas nos seguintes ADRs:

| ADR | Título | Relevância para o motor |
|-----|--------|------------------------|
| ADR-001 | Orquestrador único `calculateIrrigationProject` | Motor usa este solver no Passo 2 — proibido criar solver paralelo |
| ADR-002 | Diâmetro interno nos cálculos hidráulicos | Solver chamado pelo motor usa D interno — afeta HMT e blockers |
| ADR-003 | Bloqueio de PDF com blockers | Blockers do solver (coletados pelo motor) bloqueiam emissão de proposta |
| ADR-004 | Lateral física vs trecho operacional | Distinção entre `PhysicalColumn` (geométrica) e segmento operacional (setorizado) |
| ADR-006 | Motor de layout como ferramenta preliminar | Define governança de uso: badge, confirmação explícita, marcadores `PENDENTE` |
| ADR-007 | Premissas provisórias de mercado — revisão Brasmáquinas | Define o ciclo de revisão dos pesos `PREMISSA_PROVISORIA_MERCADO` |

**Decisões do motor que ainda não têm ADR próprio e deveriam ter:**
- Separação `findBestSprinklerLayout` / `runTopKHydraulicValidation` (dois passos explícitos)
- Uso de `jornadaHoras=9` como placeholder no layout temporário
- Restrição de `best` ao Top K após validação hidráulica

---

## 6. Limitações atuais

| Limitação | Impacto | Status |
|-----------|---------|--------|
| Pesos não calibrados com dados reais | Podem alterar ranking de candidatos de forma não intuitiva | `PENDENTE_CALIBRACAO_RT_CAMPO` |
| `TOP_K = 5` pode excluir candidato hidraulicamente melhor | Candidato na posição 6+ geométrica nunca recebe solver | `PREMISSA_PROVISORIA_MERCADO` |
| Desnível geodético ausente gera avaliação sem topografia real | HMT calculada sem elevação — conservadora mas imprecisa | Warning em `selectionReason`; não bloqueia |
| Comprimento geométrico como proxy de custo | Não captura diâmetro, hf, topografia, custo de instalação | Premissa provisória |
| Construção temporária de layout por candidato | Re-executa setorização e principal/adutora para cada Top K — sem memoização | Custo trivial (K ≤ 5); sem impacto prático atual |
| UI de validação hidráulica sem validação no browser | Botão "Validar hidráulica" implementado mas sem teste manual de fluxo completo | Validação browser pendente |
| `jornadaHoras=9` como placeholder no layout temporário | Campo obrigatório pelo schema; não afeta hidráulica — mas acoplado ao schema | Confirmado seguro; frágil se `sizeHydraulics` mudar |
| Motor não substitui revisão técnica | Resultado do motor é ponto de partida, não aprovação técnica | Por definição — ADR-006 |

---

## 7. Rastreabilidade por TASK

| TASK | O que adicionou ao motor | Testes ao concluir |
|------|--------------------------|--------------------|
| TASK-010A | `findOptimalGridAngle`, `generateRotatedSprinklerGrid` extraídas para `sprinkler-grid.ts` | 530/530 |
| TASK-010B | `findBestSprinklerLayout`, `OPTIMIZER_PARAMS`, `LayoutScore`, `LayoutCandidate`, `LayoutSelectionResult` | 545/545 |
| TASK-010C | `candidateToSprinklers`, integração UI com `OptimizerState`, badge `angleMode=optimizer` | 552/552 |
| TASK-010D | Métricas operacionais de setorização (6 campos), `WEIGHT_SECTION_VALVE`, `WEIGHT_FRAGMENTATION`, `WEIGHT_IMBALANCE` | 564/564 |
| TASK-010E-A | Métricas de comprimento de laterais (5 campos), `WEIGHT_LATERAL_LENGTH=0` | 573/573 |
| TASK-010E-B | Métricas de rede de distribuição (7 campos), `WEIGHT_SECONDARY_LENGTH=0.10`, `WEIGHT_TOTAL_NETWORK_LENGTH=0.10` | 584/584 |
| TASK-010F | `runTopKHydraulicValidation`, `HydraulicEvaluationStatus`, `HydraulicBlockerReal`, `TopKHydraulicOptions`, `TOP_K_HYDRAULIC_CANDIDATES=5`, `WEIGHT_HYDRAULIC_BLOCKER=0.50` | 597/597 |
| TASK-010Z | Este relatório — sem alteração de código | 597/597 |

---

## 8. Resumo do estado atual

> O motor de layout 12×12 é **utilizável como ferramenta de candidatos preliminares**, mas
> ainda **depende de calibração e revisão futura pela Brasmáquinas** antes de ser usado como
> critério técnico definitivo em propostas comerciais.
>
> Os dois passos são funcionais e testados (597/597 testes, 0 erros TypeScript).
> Os pesos de pontuação são conservadores por construção mas não calibrados com projetos reais.
> A UI exibe os resultados com marcadores de "preliminar" e requer confirmação explícita do
> usuário para aplicar qualquer candidato sugerido.
>
> **Próximo passo natural para o RT:** calibração de `OPTIMIZER_PARAMS` com dados de
> projetos homologados; revisão das premissas em `12-premissas-provisorias-e-revisao-rt.md`.
