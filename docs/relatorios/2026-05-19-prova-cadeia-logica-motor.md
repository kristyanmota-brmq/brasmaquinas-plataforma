# Prova da cadeia lógica do motor de irrigação

**Data:** 2026-05-19
**Tarefa:** TASK-009B-PROVA
**Motor:** `calculateIrrigationProject()` — `src/lib/layout/irrigation-project.ts`
**Fixture de referência:** Projeto L (campo em forma de L, 448 aspersores, 14 setores)
**Contagem de testes na data:** 522 passando / 522 (100 %)

---

## 1. Cadeia lógica — tabela completa

| # | Etapa | Função principal | Arquivo | Entrada | Saída | Consumidor principal | Status |
|---|-------|-----------------|---------|---------|-------|---------------------|--------|
| 1 | Validação de entradas | inline (guard clauses) | `irrigation-project.ts:183` | `ProjectLayout` | `missingFields[]` + early return | — | OK |
| 2 | Colunas físicas | `generatePhysicalColumns()` | `laterais.ts` | `positions[]`, `angle`, `centroid`, `spacing`, `vazao`, `TUBOS_PVC_LF`, `sectorIndices?` | `PhysicalColumn[]` | steps 3, 4, 5, 6, 7, 8 | OK |
| 3 | Segmentos operacionais | `deriveOperationalSegments()` | `sectorization.ts` | `physicalColumns`, `sectorIndices`, `vazaoPorAspersor` | `OperationalSegment[]` | steps 4, 9, 10, 11 | OK |
| 4 | Laterais de distribuição | `deriveLateraisFromNetwork()` | `laterais.ts` | `physicalColumns`, `operationalSegments`, `positions`, `spacing`, `vazao`, `TUBOS_PVC_LF` | `Lateral[]` | steps 8, 9, 10 | OK |
| 5 | Secundárias / ramais | `generateSecondaries()` | `hydraulic-connectivity.ts` | `physicalColumns`, `principalCoords`, `centroid` | `SecondaryPipe[]` | steps 6, 8, 9, 10 | OK |
| 6 | Conectividade hidráulica | `validateHydraulicConnectivity()` | `hydraulic-connectivity.ts` | `physicalColumns`, `principalCoords`, `secondaries`, `centroid` | `HydraulicConnectivityReport` | mapa (orphanPhysicalColumns) | OK |
| 7 | Construtibilidade | `buildConstructabilityReport()` | `constructability.ts` | `physicalColumns`, `sectorIndices`, `positions`, `principalCoords?`, `centroid?` | `ConstructabilityReport` (controlPoints, columnDiagnostics) | steps 8, 9, 11, mapa | OK |
| 8 | BOM preliminar | `buildBOM(bomInput)` | `bom.ts` | resultado dos steps 2–7 (sem `sizedSecondaries`) | `BOMResult` | step 11 (descartado) | OK |
| 9 | Solver hidráulico | `sizeHydraulics()` | `hydraulic-sizing.ts` | `IrrigationProjectResult` parcial (steps 1–8) | `HydraulicSizingReport` (criticalPath, hmt, validation, sizedSecondaries) | step 10 | OK |
| 10 | BOM final | `buildBOM(bomInput + sizedSecondaries)` | `bom.ts` | steps 2–7 + `sizedSecondaries` do step 9 | `BOMResult` final | step 11, PDF, mapa | OK |
| 11 | Diagnósticos de proposta | `generateProposalDiagnostics()` | `bom.ts` | `layout`, BOM final (step 10), `hydraulics` (step 9) | `ProposalDiagnostics` (warnings[], blockers[]) | PDF, bloqueio de emissão | OK |
| 12 | Consistência mapa | `buildMapNetworkConsistencyReport()` | `map-consistency.ts` | `IrrigationProjectResult` | `MapNetworkConsistencyReport` | auditoria (não exibido ao usuário diretamente) | OK |
| 13 | Bloqueadores PDF | `pdfEmissionBlockers()` | `irrigation-project.ts:420` | `IrrigationProjectResult` | `string[]` | rota PDF (`/api/projetos/[id]/pdf`) | OK |

---

## 2. Grafo de chamadas — `calculateIrrigationProject`

```
calculateIrrigationProject(layout: ProjectLayout) → IrrigationProjectResult
│
├─ [guard] missingFields check
│
├─ generatePhysicalColumns(positions, angle, centroid, spacing, vazao, TUBOS_PVC_LF, sectorIndices?)
│   Agrupa posições por X-index = round((x-xMin)/spacing) no frame rotacionado.
│   Divide por Y-gap > 1.5×spacing (colunas descontínuas).
│   Seleciona tubo LF por velocidade (≤ 2.5 m/s).
│   → PhysicalColumn[] { id, columnIndex, startLngLat, endLngLat, comprimentoM,
│                        sprinklerCount, sprinklerIndices[], sectorsTouched[], selecao }
│
├─ deriveOperationalSegments(physicalColumns, sectorIndices, vazaoPorAspersor)
│   Para cada PhysicalColumn, agrupa sprinklerIndices por setor consecutivo.
│   → OperationalSegment[] { id="col-X-sY-Z", physicalColumnId, sectorId,
│                            sprinklerIndices[], sprinklerCount, vazaoM3h,
│                            requiresValveOrControlPoint, ordemNaLateral }
│
├─ deriveLateraisFromNetwork(physicalColumns, operationalSegments, positions, ...)
│   Uma Lateral por OperationalSegment.
│   derivacaoLngLat = positions[seg.sprinklerIndices[0]] (primeiro sprinkler do segmento).
│   comprimentoM de physicalColumn (comprimento físico do tubo, não multiplicado por setor).
│   → Lateral[] { physicalColumnId, sectorId, sprinklerCount, comprimentoM,
│                 vazaoM3h, selecao, derivacaoLngLat }
│
├─ generateSecondaries(physicalColumns, principalCoords, centroid)
│   Para cada PhysicalColumn:
│     toCoord = columnInletCoord(col) → extremo mais próximo da principal.
│     fromCoord = projeção de toCoord sobre principalCoords.
│   → SecondaryPipe[] { physicalColumnId, fromCoord, toCoord, lengthM }
│
├─ validateHydraulicConnectivity(physicalColumns, principalCoords, secondaries, centroid)
│   → HydraulicConnectivityReport { orphanPhysicalColumns[], isConnected, ... }
│
├─ buildConstructabilityReport(physicalColumns, sectorIndices, positions, principalCoords?, centroid?)
│   ├─ generateControlPoints(...)
│   │   Para cada PhysicalColumn:
│   │     lateral_inlet: coord = columnInletExtreme(col, principalCoords, centroid)
│   │                    [= extremo mais próximo da principal — lógica idêntica a columnInletCoord()]
│   │     section_valve: coord = midpoint(positions[prevLastIdx], positions[thisFirstIdx])
│   │                    [ponto médio entre último sprinkler do setor anterior e primeiro do próximo]
│   ├─ generateColumnDiagnostics(physicalColumns, controlPoints)
│   └─ evaluateConstructability(controlPoints)
│   → ConstructabilityReport { controlPoints[], columnDiagnostics[], constructabilityStatus,
│                              controlPointsCount, pendingControlPointsCount, ... }
│
├─ buildBOM(bomInput) ← BOM PRELIMINAR (sem sizedSecondaries)
│   [descartada — substituída pela BOM final após o solver]
│
├─ sizeHydraulics(partialResult)
│   ├─ sizeAllSecondaries(secondaries, laterais) → SizedSecondaryPipe[]
│   │   [seleciona menor tubo RIGIDO com v ≤ 1.5 m/s por ramal]
│   └─ varredura exaustiva: para cada setor s (com vazaoS > 0):
│       para cada OperationalSegment do setor s:
│         arcLength = projeção do inlet na principal
│         hf_principal_acumulado (modelo de vazão decrescente, diâmetro único)
│         hf_ramal = headLoss(vazaoSetor, lengthRamal, diametroInternoRamal, coefC)
│         hf_lateral = headLoss(vazaoLateral, comprLateral, diametroInternoLat, coefC) × F_Christiansen
│         pathHf = hf_adutora + hf_principal_acum + hf_ramal + hf_lateral
│       critIdx = argmax(pathHf) para este setor
│     globalBest = setor/segmento com maior pathHf global
│   HMT = pressaoServico + distribHf + localLosses(10%) + desnivel + margem(2 mca)
│   → HydraulicSizingReport { criticalPath, hmt, validation, sizedSecondaries, ... }
│
├─ buildBOM(bomInput + sizedSecondaries) ← BOM FINAL
│   Tubos laterais: por physicalColumn.comprimentoM (não duplica por setor).
│   Tês de derivação lateral: 1 por physicalColumn.
│   Ramais: agrupa sizedSecondaries por SKU de tubo RIGIDO.
│   Registros de seção: 1 por ControlPoint do tipo section_valve com SKU catalogado.
│   → BOMResult { itens[], totalGeral, meta{ nColunasLaterais, nLaterais, ... } }
│
└─ generateProposalDiagnostics(layout, bom, hydraulics)
    Agrega warnings e blockers de: setorização, hidráulica, construtibilidade, BOM.
    → ProposalDiagnostics { warnings[], blockers[], hydraulicSolverStatus, ... }
```

---

## 3. Prova de dados — Fixture L

**Geometria:** Grade 40 × 12 com canto superior-direito removido (cols ≥ 32 && rows ≥ 8 → 8×4 = 32 posições removidas).
**Resultado:** 448 aspersores.
**Espaçamento:** 12 m. **Vazão por aspersor:** 1,5 m³/h. **Pressão de serviço:** 30 mca.
**Setores:** 14. **Jornada:** 14 h.

### 3.1 Métricas reais (execução em 2026-05-19)

| Métrica | Valor | Fonte |
|---------|-------|-------|
| Aspersores (n) | 448 | `result.input.positions.length` |
| Colunas físicas | 40 | `result.physical.nColumns` |
| Setores | 14 | `result.operational.nSetores` |
| Segmentos operacionais | 48 | `result.operational.operationalSegments.length` |
| Laterais de distribuição | 48 | `result.distribution.nLaterais` |
| Secundárias / ramais | 40 | `result.hydraulic.secondaries.length` |
| Pontos de controle (total) | 48 | `result.constructability.controlPoints.length` |
| — lateral_inlet (resolved) | 40 | type = "lateral_inlet" |
| — section_valve (pending) | 8 | type = "section_valve" |
| Comprimento laterais (m) | 4.916 | `bom.meta.comprimentoLateraisM` |
| Comprimento principal (m) | 468 | `layout.mainPipeline.lengthMeters` (39 × 12) |
| Comprimento adutora (m) | 43 | `bom.meta.comprimentoAdutoraM` |
| Comprimento secundárias (m) | 242 | `bom.meta.comprimentoSecundariasM` |
| BOM — itens | 13 | `bom.itens.length` |
| BOM — total geral (R$) | 146.024 | `bom.totalGeral` |
| Status construtibilidade | pending_control_validation | `constructability.constructabilityStatus` |
| Status solver | calculated_pending_review | `hydraulics.hydraulicSolverStatus` |
| Tubo principal selecionado | Ø125 mm PN80 | `criticalPath.criticalPathSegments[1].diametroMm` |
| Setor crítico | 13 | `criticalPath.criticalSectorId` |
| HMT total (mca) | 44,0 | `hmt.totalHMT` |
| — Pressão de serviço | 30,00 | `hmt.pressaoServicoMca` |
| — hf adutora | 0,69 | `hmt.hfAdutoraM` |
| — hf principal até derivação crítica | 6,98 | `hmt.hfPrincipalToDerivationM` |
| — hf ramal crítico | 0,09 | `hmt.hfSecondaryM` |
| — hf lateral crítica | 3,14 | `hmt.hfLateralM` |
| — perdas locais (10 %) | 1,09 | `distribHf × 10 %` |
| — margem de segurança | 2,00 | default `DEFAULT_SAFETY_MARGIN_MCA` |
| — desnível | 0,00 | não informado → assumido zero |
| Gates hidráulicos | todos OK | `validation.allGatesPass = true` |
| Segmentos inválidos | 0 | `validation.invalidSegments.length` |
| Bomba | não informada | `pumpValidation.status = "not_informed"` |
| map.inletSideMismatchCount | 0 | `buildMapNetworkConsistencyReport(result)` |
| map.blockers | [] | idem |
| map.warnings | [] | idem |
| Diagnósticos — warnings | 6 | `diagnostics.warnings.length` |
| Diagnósticos — blockers | 0 | `diagnostics.blockers.length` (sem bloqueio de emissão) |

### 3.2 Decomposição dos 48 pontos de controle

```
40 colunas × 1 lateral_inlet = 40 pontos (resolved)
8 colunas divididas em 2 setores × 1 section_valve = 8 pontos (pending)
Total: 48 = 40 lateral_inlet + 8 section_valve = nCols + nPending ✓
```

Invariante verificado: `controlPoints.length = nCols + pendingCount`.

### 3.3 Decomposição dos 48 segmentos operacionais

```
32 colunas com 1 setor → 32 segmentos
8 colunas com 2 setores → 16 segmentos
Total: 48 = 32 × 1 + 8 × 2 = 48 ✓

nLaterais = nOperationalSegments = 48 ✓ (cada segmento operacional gera exatamente uma Lateral)
nSecondaries = nPhysicalColumns = 40 ✓ (1 ramal por coluna física, independente da setorização)
```

---

## 4. Rastreabilidade de IDs ao longo da cadeia

Exemplo: coluna física de índice 3, dividida entre setores 1 e 2.

```
PhysicalColumn.id = "col-3"
  sprinklerIndices = [36, 37, 38, 39, ..., 60] (aspersores de Y crescente)
  sectorsTouched   = [1, 2]

OperationalSegment (setor 1, ordem 0):
  id               = "col-3-s1-0"
  physicalColumnId = "col-3"
  sectorId         = 1
  ordemNaLateral   = 0
  requiresValve    = false

OperationalSegment (setor 2, ordem 1):
  id               = "col-3-s2-1"
  physicalColumnId = "col-3"
  sectorId         = 2
  ordemNaLateral   = 1
  requiresValve    = true

Lateral (do segmento col-3-s1-0):
  physicalColumnId = "col-3"
  sectorId         = 1
  derivacaoLngLat  = positions[36]      (primeiro sprinkler do segmento)

Lateral (do segmento col-3-s2-1):
  physicalColumnId = "col-3"
  sectorId         = 2
  derivacaoLngLat  = positions[44]      (primeiro sprinkler do segmento)

SecondaryPipe:
  id               = "sec-col-3"
  physicalColumnId = "col-3"
  toCoord          = columnInletCoord("col-3")  ← extremo mais próximo da principal

ControlPoint (lateral_inlet):
  id               = "col-3-cp-inlet"
  physicalColumnId = "col-3"
  coordinate       = columnInletExtreme("col-3", principalCoords, centroid)
  type             = "lateral_inlet"
  status           = "resolved"

ControlPoint (section_valve):
  id               = "col-3-cp-split-1"
  physicalColumnId = "col-3"
  coordinate       = midpoint(positions[prevLast], positions[thisFirst])
  type             = "section_valve"
  status           = "pending"
```

**Verificação de rastreabilidade:** todos os objetos derivados de `"col-3"` mantêm `physicalColumnId = "col-3"`. O `HydraulicSegment` do ramal usa `physicalColumnId` para cruzar com `lateralByKey.get("col-3:1")` no solver. A BOM usa `physicalColumn.comprimentoM` (não duplica por segmento operacional). ✓

---

## 5. 13 perguntas mandatórias — respostas

### Q1 — Qual função gera as colunas físicas e onde está?

`generatePhysicalColumns()` em [laterais.ts](src/lib/layout/laterais.ts).
Agrupa posições por X-index = `round((x - xMin) / spacingM)` no frame local rotacionado pelo
ângulo da grade. Divide em sub-colunas quando Y-gap entre aspersores consecutivos > 1,5 × spacing.
Seleciona tubo LF pelo critério de velocidade (velocidade ≤ 2,5 m/s com `TUBOS_PVC_LF`).

**Status:** OK.

### Q2 — Qual é o invariante de cobertura de aspersores?

Cada posição em `sprinklers.positions[]` pertence a exatamente uma PhysicalColumn.
A partição é determinística: cada posição mapeia para um único `(columnIndex, yBucket)`.
`generatePhysicalColumns` não pula nem duplica posições.

Verificado por `map.sprinklersWithoutPhysicalColumn = 0` no fixture L.
Testes: `T009B-asp` em `map-consistency.test.ts`.

**Status:** OK.

### Q3 — Como a setorização divide colunas físicas entre setores?

`buildSectorsByFlowWithColumnSplitting()` em [sectorization.ts](src/lib/layout/sectorization.ts).
Agrupa colunas físicas por setor usando vazão acumulada (alvo = totalFlow / nSetores).
Quando a vazão acumulada de um setor não cabe em colunas inteiras, **corta a coluna** no ponto
onde a vazão-alvo é atingida, atribuindo a parte inferior a um setor e a parte superior ao
próximo. O resultado é um array `sectorIndices[]` com um setor por posição.

`deriveOperationalSegments()` re-agrupa esses índices por PhysicalColumn → setor consecutivo.

**Status:** OK. Colunas divididas = 8 no fixture L.

### Q4 — De onde deriva o ID de um OperationalSegment?

`id = "${col.id}-s${sectorId}-${ordemNaLateral}"`.
Exemplo: `"col-3-s2-1"` = PhysicalColumn `"col-3"`, setor 2, 2ª ocorrência na coluna.
`col.id = "col-${columnIndex}"` onde `columnIndex` é o índice 0-based da coluna no frame local.

**Status:** OK. IDs estáveis e hierárquicos.

### Q5 — O `lateral_inlet` ControlPoint aponta para o extremo correto da coluna física?

Sim, após a correção D2 (TASK-009B).
`generateControlPoints()` usa `columnInletExtreme(col, principalCoords, centroid)`, que calcula
`distPointToPolylineM(col.startLngLat, ...)` vs `distPointToPolylineM(col.endLngLat, ...)`
e retorna o extremo com menor distância à principal.

Verificado por `map.inletSideMismatchCount = 0` no fixture L.
Testes: `T009B-inlet` em `map-consistency.test.ts`.

**Status:** OK (pós D2).

### Q6 — `secondary.toCoord` e `lateral_inlet.coordinate` são a mesma coordenada?

Funcionalmente sim, implementações independentes com lógica idêntica:
- `generateSecondaries()` usa `columnInletCoord()` em `hydraulic-connectivity.ts`.
- `generateControlPoints()` usa `columnInletExtreme()` em `constructability.ts`.

Ambas calculam `distPointToPolylineM(start, ...)` vs `distPointToPolylineM(end, ...)` e
retornam o extremo mais próximo.

Verificado: distância entre `secondary.toCoord` e `lateral_inlet.coordinate` < 0,0002°
(aprox. 22 m) para todos os fixtures. No fixture L: `inletSideMismatchCount = 0`
(critério: distância < 1 m).

Testes: `T009B-sec` e `T009B-inlet` em `map-consistency.test.ts`.

**Status:** OK (pós D2). Gap residual: duplicação de lógica em dois arquivos — risco de dessincronização futura se um for alterado sem o outro.

### Q7 — O solver usa `operationalSegments` ou `laterais` para calcular hf da lateral?

O solver usa `laterais` (via `Lateral` pelo lookup `lateralByKey.get("${col.id}:${sectorId}")`).
O `lateral.comprimentoM` e `lateral.vazaoM3h` são os insumos do cálculo HW.
O Christiansen F é aplicado: `hf_lat = headLoss(vazao, comprimento, diam_interno, C) × F(n)`.

Os `operationalSegments` são usados apenas para encontrar quais colunas/setores operam em cada
setor e para calcular o arc-length de derivação na principal.

**Status:** OK.

### Q8 — A BOM de tubo lateral usa `physicalColumns` ou `operationalSegments`?

`physicalColumns` — especificamente `col.comprimentoM` de cada PhysicalColumn.
O comprimento do tubo não é multiplicado pelo número de setores; uma coluna física que atravessa
2 setores ainda usa **um único tubo** de comprimento `col.comprimentoM`.

Verificado: `bom.meta.nColunasLaterais = physical.nColumns = 40` e
`bom.meta.comprimentoLateraisM = 4.916 m` (soma dos comprimentos de 40 PhysicalColumns).

Testes: `T8.3`, `T9.1`, `T9.2` em `integration.test.ts`.

**Status:** OK.

### Q9 — Os tês de derivação lateral são contados por physicalColumn ou por operationalSegment?

Por **physicalColumn** — 1 tê por coluna física (independente da setorização).
Em `buildBOM()`: `for (const col of physicalColumns)` agrupado por `col.selecao.tubo.diametroMm`.

`tees50Source = "physicalColumns"` no `ProposalDiagnostics`.
No fixture L: 40 tês (= 40 physicalColumns ≠ 48 operationalSegments).

**Status:** OK.

### Q10 — Como o caminho crítico é identificado?

Varredura exaustiva (`criticalPathModel: "exhaustive"`):
- Para cada setor `s` (com `vazaoPorSetor[s] > 0`), para cada `OperationalSegment` do setor:
  - Calcula `pathHf = hf_adutora(s) + hf_principal_acumulado(arcLength) + hf_ramal + hf_lateral`.
- `critIdx_s = argmax(pathHf)` dentro do setor.
- `globalBest = argmax(critIdx_s)` entre todos os setores.

Complexidade: O(nSetores × nSegmentosPorSetor). Para o fixture L: 14 setores × ~3,4 segmentos
médios = ~48 avaliações de caminho.

**Status:** OK.

### Q11 — Há circularidade ou dependência mútua entre módulos do domínio?

Não. O grafo de dependência é um DAG:

```
catalog/aspersores.ts   (folha — sem imports de domínio)
   ↑
hydraulics/hazenWilliams.ts  (folha)
   ↑
laterais.ts  ← catalog, hydraulics
   ↑
sectorization.ts  ← laterais
   ↑
hydraulic-connectivity.ts  ← laterais
constructability.ts  ← laterais
hydraulic-graph.ts  (tipos)
   ↑
hydraulic-sizing.ts  ← hydraulics, catalog, laterais, secondary-sizing
secondary-sizing.ts  ← catalog, hydraulics
   ↑
bom.ts  ← catalog, laterais, constructability, hydraulic-connectivity, hydraulic-sizing
   ↑
irrigation-project.ts  ← todos os anteriores (orquestrador)
   ↑
map-consistency.ts  ← irrigation-project (IrrigationProjectResult)
```

**Status:** OK. Nenhuma circularidade detectada.

### Q12 — PDF e mapa consomem `IrrigationProjectResult` diretamente ou recalculam?

Diretamente. `calculateIrrigationProject` é chamado uma única vez:
- Mapa (`ProjectMap.tsx`): recebe `result: IrrigationProjectResult` como prop via `useMemo` na
  página `projetos/[id]/page.tsx`.
- PDF (`/api/projetos/[id]/pdf/route.tsx`): chama `calculateIrrigationProject(layout)` na rota
  e passa o resultado ao template PDF.

Nenhum componente chama funções de domínio diretamente.

Verificado por testes: `T10` em `integration.test.ts` — dois resultados do mesmo layout são
bit-a-bit iguais nos campos chave; mapa e PDF derivam do mesmo objeto.

**Status:** OK.

### Q13 — `buildMapNetworkConsistencyReport` detecta divergências motor vs mapa?

Sim. Detecta:
1. `sprinklersWithoutPhysicalColumn > 0` → blocker (aspersores sem tubo)
2. `orphanPhysicalColumns.length > 0` → blocker (coluna sem caminho hidráulico)
3. `operationalSegmentsRendered ≠ operationalSegmentsTotal` → warning (laterais faltando)
4. `corridorValidated === false` → warning (principal fora do polígono)
5. `inletSideMismatchCount > 0` → (não emite aviso, mas quantifica o mismatch D2)

No fixture L: todos os indicadores são 0 / OK — cadeia consistente mapa vs motor.

**Status:** OK (pós D1 + D2).

---

## 6. Classificação de todos os achados

| # | Achado | Classificação | Evidência |
|---|--------|--------------|-----------|
| 1 | Cobertura total de aspersores pelas physicalColumns | **OK** | Q2; map.sprinklersWithoutPhysicalColumn = 0; T009B-asp |
| 2 | 1:1 entre operationalSegments e laterais | **OK** | Q7; nLaterais = nSegmentos = 48; T8.4, T9.1 |
| 3 | BOM tubo lateral por physicalColumn (não duplica por setor) | **OK** | Q8; bom.meta.nColunasLaterais = 40; T8.3 |
| 4 | Tê por physicalColumn (não por operationalSegment) | **OK** | Q9; tees50Source = "physicalColumns" |
| 5 | lateral_inlet aponta para extremo correto da coluna (pós D2) | **OK** | Q5; inletSideMismatchCount = 0; T009B-inlet |
| 6 | secondary.toCoord ≈ lateral_inlet.coordinate (pós D2) | **OK** | Q6; T009B-sec; distância < 1 m |
| 7 | Solver usa varredura exaustiva de todos os setores | **OK** | Q10; criticalPathModel = "exhaustive" |
| 8 | Idempotência do orquestrador (função pura) | **OK** | T8.2, T9.1, T9.2; dois resultados idênticos |
| 9 | PDF e mapa consomem result sem recalcular | **OK** | Q12; T10; nenhuma lógica de domínio em UI |
| 10 | Nenhuma circularidade de dependência entre módulos | **OK** | Q11; DAG verificado manualmente |
| 11 | Rastreabilidade de IDs physicalColumn → segment → lateral → secondary → controlPoint | **OK** | Seção 4; physicalColumnId presente em todos |
| 12 | Gates hidráulicos todos passando no fixture L | **OK** | validation.allGatesPass = true; invalidSegs = 0 |
| 13 | Pressão de ramais/laterais usa HMT como limite superior conservativo | **gap técnico** | Q6; pressureClassModel = "hmt_conservative_inlet"; pode gerar violation_conservative sem violação real |
| 14 | Modelo de fluxo decrescente na principal com diâmetro único | **gap técnico** | principalFlowModel = "single_diameter_decreasing_flow"; não suporta diâmetros variados ao longo da principal |
| 15 | Desnível não informado → HMT subestimada | **gap técnico / gap de governança** | hmt.noElevationData = true; aviso em diagnostics.warnings; sem blocker |
| 16 | Bomba não informada → solver em "calculated_pending_review" | **gap de governança** | pumpValidation.status = "not_informed"; sem blocker; aviso em diagnostics.warnings |
| 17 | 8 section_valves aguardam modelagem na BOM ou validação | **pendente (esperado)** | constructabilityStatus = "pending_control_validation"; aviso em diagnostics.warnings |
| 18 | Duplicação de lógica columnInletCoord/columnInletExtreme em dois arquivos | **gap técnico (risco futuro)** | Q6; hydraulic-connectivity.ts e constructability.ts implementam a mesma função independentemente |

---

## 7. Testes de invariante — cobertura existente vs necessária

### Já cobertos (não criar)

| Invariante | Teste existente |
|-----------|----------------|
| nLaterais = nOperationalSegments | T8.4, T9.1, T9.2 |
| nColunasLaterais = physical.nColumns | T8.3, T9.1, T9.2 |
| Todos os setores com ≥ 1 aspersor | T8.8, T9.1, T9.2 |
| Idempotência (BOM idêntica em 2 cálculos) | T8.2, T9.1, T9.2 |
| controlPoints.length = nCols + nPending | T9.1 |
| inletSideMismatchCount = 0 | T009B-inlet |
| secondary.toCoord ≈ lateral_inlet.coordinate | T009B-sec |
| Todos aspersores cobertos por physicalColumns | T009B-asp |

### Ausentes — criados nesta tarefa

Nenhum novo teste foi necessário. Todos os invariantes críticos já têm cobertura existente.

**Contagem final:** 522 testes passando. Sem regressão.

---

## 8. Sumário executivo

### Cadeia funciona corretamente

O motor `calculateIrrigationProject` processa a cadeia lógica completa de forma determinística,
pura e rastreável. Todos os 12 invariantes funcionais verificados passam no fixture L (448
aspersores, 14 setores, campo em L):

- Todos os aspersores são cobertos por physicalColumns
- Cada segmento operacional gera exatamente uma lateral
- A BOM não duplica comprimento de tubo por setor
- O lateral_inlet aponta para o extremo correto (pós D2)
- O secondary.toCoord coincide com o lateral_inlet (< 1 m de distância, pós D2)
- O mapa consome o resultado sem recalcular
- O caminho crítico é encontrado por varredura exaustiva

### Gaps identificados

**Gap técnico 1** — `pressureClassModel = "hmt_conservative_inlet"`:
Ramais e laterais não têm pressão calculada por derivação de arco. Usam HMT como limite
superior, o que pode gerar `violation_conservative` em tubos que na realidade estão dentro do PN.
Recomendação futura: calcular pressão por ponto de derivação para cada ramal.

**Gap técnico 2** — `principalFlowModel = "single_diameter_decreasing_flow"`:
O solver assume diâmetro único em toda a extensão da principal. Em projetos com principal
segmentada em tubos de diâmetros diferentes, o modelo subestima perdas nos trechos menores.
Recomendação futura: suportar principal com múltiplos trechos de diâmetro distintos.

**Gap técnico 3 / Gap de governança** — `hmt.noElevationData = true`:
Desnível não informado → HMT subestimada em campos com desnível relevante. Aviso emitido, mas
sem blocker. Engenheiro deve informar `geodetic.elevationDeltaMeters` antes da emissão final.

**Gap de governança** — `pumpValidation.status = "not_informed"`:
Bomba não informada → solver em `calculated_pending_review`. Aviso emitido. Blocker ativado
apenas se bomba informada for insuficiente. Engenheiro deve selecionar e validar a bomba.

**Pendente esperado** — 8 section_valves com status `"pending"`:
Representam pontos de corte entre setores em colunas físicas divididas. Aguardam modelagem de
válvula de seção na BOM (TASK-006B) ou validação em campo. Não são bugs — são pontos de
intervenção do engenheiro.

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Duplicação de lógica columnInletCoord/Extreme divergir | Baixa | Alto (mismatch visual) | Extrair para função compartilhada em futura tarefa |
| HMT subestimada por desnível não informado | Média | Alto (bomba subdimensionada) | Adicionar blocker quando campo tem desnível > 5 m sem `elevationDeltaMeters` |
| Pressão de ramal excedendo PN não detectada precisamente | Baixa | Médio | Calcular pressão por derivação no solver (gap técnico 1) |

### Recomendações

1. Extrair `columnInletCoord/Extreme` para uma função compartilhada (evitar divergência futura).
2. Adicionar campo `geodetic.elevationDeltaMeters` à UI como campo obrigatório antes da emissão.
3. Implementar cálculo de pressão por derivação de arco para ramais/laterais (remove gap técnico 1).
