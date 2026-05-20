# Backlog — Brasmáquinas Plataforma

Última atualização: 2026-05-20
Testes na base: 573/573 · TypeScript: 0 erros

---

> **Nota sobre prefixos:**
> As entradas `HIST-XXX` representam trabalhos técnicos implementados antes da formalização do sistema de tasks. Não possuem arquivo de task individual e servem apenas como registro histórico.
> As entradas `TASK-XXX` representam tarefas versionadas formais, com arquivo próprio em `tasks/`, critérios de aceite e rastreabilidade completa.

---

## Legenda de status

| Status | Significado |
|--------|-------------|
| `pendente` | Não iniciada |
| `em progresso` | Em desenvolvimento ativo |
| `bloqueada` | Aguardando dependência ou decisão |
| `concluída` | Implementada, critérios verificados |
| `referência histórica` | Implementada no código antes da formalização em `/tasks` |
| `pendente de formalização` | Implementada mas sem TASK file criado; pode gerar TASK retroativa se necessário |

---

## Tarefas formais (TASK)

### TASK-000 — Fundação operacional do repositório

**Status:** `concluída`
**Prioridade:** P0-fundação
**Área:** governança
**Arquivo:** `tasks/TASK-000-fundacao-operacional.md`

> Criação da estrutura operacional completa: CLAUDE.md, docs/metodologia/ (11 arquivos), docs/software/ (5 arquivos), docs/decisoes/, tasks/, templates/, .claude/commands/. Extensão com os quatro pilares da venda técnica assistida (metodologia, engenharia de software, validação de campo, disciplina operacional).

---

### TASK-001 — Diagnóstico do software atual

**Status:** `pendente`
**Prioridade:** P1-crítico
**Área:** governança
**Arquivo:** `tasks/TASK-001-diagnostico-software-atual.md`

> Varredura de diagnóstico do estado atual do software contra os quatro pilares: metodologia, engenharia de software, validação de campo e disciplina operacional. Produto: relatório em `docs/relatorios/`. Sem implementação de código.

---

### TASK-002 — Motor de Governança A/B/C (ProjectClassificationEngine)

**Status:** `pendente`
**Bloqueada por:** TASK-001 + homologação de `docs/metodologia/09-classificacao-de-projetos.md` pelo RT
**Prioridade:** P2-importante
**Área:** governança / domínio
**Arquivo:** `tasks/TASK-002-classificacao-abc-projetos.md`

> Implementar `ProjectClassificationEngine`: classificação A/B/C a partir de resultados do motor técnico + contexto comercial + diagnósticos. `calculateIrrigationProject` passa a incluir `projectClass: "A" | "B" | "C"` no resultado. A/B/C é governança — o Motor Comercial consume a classe para decidir tipo de proposta e gates de emissão.

---

### TASK-003 — Bloquear PDF quando há blockers ativos

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** pdf / governança
**Arquivo:** `tasks/TASK-003-bloquear-pdf-com-blockers.md`
**Concluída em:** 2026-05-19 · 403/403 testes · 0 erros tsc

> Adicionado gate de governança na rota de PDF: se `diagnostics.blockers.length > 0`, a rota
> retorna HTTP 422 com JSON `{error: "PDF_BLOCKED", message, blockers}` antes de chamar
> `renderToBuffer`. Função pura `pdfEmissionBlockers()` extraída para `irrigation-project.ts`
> (testável com vitest). `ProjectMap.tsx` trata `!res.ok` explicitamente e exibe painel
> diferenciando bloqueio técnico de erro inesperado. 3 testes em `pdf-guard.test.ts`.

---

### TASK-007 — Localizar projeto por endereço ou coordenadas no mapa

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** mapa / UI
**Arquivo:** `tasks/TASK-007-pesquisa-endereco-coordenadas-mapa.md`
**Concluída em:** 2026-05-19 · 416/416 testes · 0 erros tsc

> Adicionada barra de busca geográfica ao mapa. O usuário pode digitar um endereço ou
> coordenadas decimais; o mapa voa para o ponto e exibe um marcador temporário laranja.
> Função pura `parseCoordinate()` em `geo-utils.ts` (sem chamada a API). Forward geocoding
> via Mapbox (mesmo token já em uso). "Usar como captação" replica integralmente o fluxo
> existente de captação (queryElevation + reverseGeocode + setLayout). Marcador temporário
> não é salvo no ProjectLayout. 13 testes em `geo-utils.test.ts`.
>
> **Pendências:** suporte a vírgula decimal brasileira; validação manual em browser.

---

### TASK-004 — Validar PN/classe de pressão por trecho

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** hidráulica
**Concluída em:** 2026-05-19 · 431/431 testes · 0 erros tsc

> Adicionada verificação de PN a cada segmento hidráulico. Novo tipo `PressureClassCheck`
> (`"ok" | "violation_confirmed" | "violation_conservative" | "unknown"`). Adutora e
> principal têm pressão de entrada calculada diretamente → `violation_confirmed` vira blocker.
> Ramal e lateral usam HMT como limite conservativo → `violation_conservative` vira warning
> (sem falso blocker). `HydraulicValidation` recebe `hasPressureClassViolations` e
> `hasConservativePressureClassWarnings`. `generateProposalDiagnostics` diferencia
> blocker confirmado de warning conservador. 15 testes em `pressure-class.test.ts`.
>
> **Pendências:** pressão real por derivação para ramal/lateral (requer `cumPrincipalHfM`
> no segmento); desnível por segmento quando elevações pontuais disponíveis.

---

### TASK-005 — Modelar BOM dos pontos de controle e válvulas

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** bom
**Concluída em:** 2026-05-19 · 441/441 testes · 0 erros tsc

> Pontos de controle `section_valve` passam a ser contabilizados em `BOMResult.meta`:
> `valvulasCount` (total identificado) e `valvulasSemCatalogoCount` (sem SKU/preço).
> Como o catálogo não possui nenhuma entrada de válvula, nenhum item precificado foi criado.
> `generateProposalDiagnostics` emite warning técnico (válvulas identificadas) e blocker
> comercial (sem catálogo) separados. 10 testes em `bom-valves.test.ts`.
>
> **Pendências:** criar catálogo de válvulas por diâmetro/PN; homologar família;
> implementar transição `section_valve` de `pending` para `resolved`; incluir na BOM precificada.

---

### TASK-006A — Saneamento e homologação do catálogo de válvulas/registros de seção

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** catálogo / governança comercial
**Arquivo:** `tasks/TASK-006A-catalogo-valvulas-registros-secao.md`
**Concluída em:** 2026-05-19 · 441/441 testes · 0 erros tsc

> Relatório em `docs/relatorios/catalogo-valvulas-candidatas.md`. 287 candidatos analisados.
> **Regra interna Brasmáquinas:** todos os registros VIQUA na base interna recebem `classePressao: "PN80"`, `pressaoNominalMca: 80`, `fontePressao: "homologacao_interna_brasmaquinas"`.
> **7 itens `aprovado_automatico`** (uso manual): SKUs 4209000/32mm, 1000962/32mm, 4208000/35mm, 1002326/50mm, 1003768/50mm, 1001994/75mm, 1002327/100mm.
> Família VIQUA soldável. Controle automático bloqueado (sem catálogo).

---

### TASK-006B — BOM automática de registro manual de seção

**Status:** `concluída`
**Prioridade:** P1-crítico (desbloqueia blocker de `section_valve` na proposta)
**Área:** bom / catálogo
**Arquivo:** `tasks/TASK-006B-bom-registro-manual-secao.md`
**Concluída em:** 2026-05-19 · 456/456 testes · 0 erros tsc

> 7 SKUs VIQUA soldáveis (DN32/35/50/75/100, PN80 por homologação interna) adicionados a `REGISTROS_SECAO_MANUAL` em `aspersores.ts`.
> Interface `RegistroSecao` com campos `classePressao`, `pressaoNominalMca`, `fontePressao`, `prioridade`, `usoPermitido`.
> `selectRegistroSecao(diametroMm)` retorna somente o primário para o DN (tolerância ±2mm).
> `buildBOM` mapeia `physicalColumnId → diâmetro lateral` (fallback: ramal), seleciona SKU por diâmetro, cria itens `CONEXAO` agrupados por SKU.
> `BOMResult.meta` ganha `valvulasResolvidasCount` e `registrosManuaisSecaoCount`.
> `valvulasSemCatalogoCount` passa a 0 para DNs resolvidos; blocker residual para DN sem SKU aprovado.
> Warning "Registros manuais de seção incluídos na BOM" quando `valvulasResolvidasCount > 0`.
> Controle automático fora do escopo. 15 novos testes em `bom-registro-secao.test.ts`.

---

### TASK-006 — Otimizar seleção de tubo por massa de PVC

**Status:** `pendente`
**Prioridade:** P3-melhoria
**Área:** hidráulica

> Entre todas as soluções hidráulicas válidas (que passam em velocidade, hf e PN), selecionar a de menor massa total de PVC em vez de simplesmente o menor diâmetro.
>
> **Problema atual:** `selectSecondaryPipe` e `selectPrincipalTube` escolhem o menor diâmetro que satisfaz os critérios. Isso pode não ser ótimo quando um tubo ligeiramente maior na principal reduz significativamente o comprimento de ramais (ou vice-versa).
>
> **Escopo esperado:**
> - Função `totalPvcMassKg(sizedSegments)` baseada em massa por metro do catálogo
> - Comparação entre soluções alternativas válidas
> - `optimizationMode: "min_diameter" | "min_pvc_mass"` em `HydraulicSizingReport`
> - Testes obrigatórios: ≥ 3
>
> **Dependência:** TASK-002 (HIST) deve estar estável (já está) antes de implementar otimização sobre ramais.

---

## Referências históricas (HIST)

> Trabalhos técnicos implementados antes da formalização do sistema de tasks. Sem arquivo individual. Servem como registro histórico do que foi construído.
> Renumerados de TASK-001/002/003 para HIST-001/002/003 em 2026-05-19 para liberar os slots TASK-001 e TASK-002 para tarefas de governança.

### HIST-001 — Auditar solver hidráulico V2 nos projetos L e P

**Status:** `referência histórica / implementado no código`
**Renomeado de:** TASK-001

> Auditoria técnica completa do solver hidráulico: diâmetro interno real vs. nominal, caminho crítico exaustivo, perdas locais, desnível geodético, limitações do modelo.
>
> **Implementado no código** em sessões anteriores (sprint T1–T9):
> - Diâmetro interno adicionado ao catálogo (`TUBOS_PVC_LF`, `TUBOS_PVC_RIGIDO`)
> - `sizeHydraulics` usa D interno em todos os cálculos HW
> - Caminho crítico exaustivo (todos os setores × todos os segmentos)
> - `criticalPrincipalSubSegments`, `secondaryLossExceeds`, `HydraulicModelLimitations`
> - Perdas locais 10%, desnível geodético, validação de bomba
> - 10 testes obrigatórios (TAREFA 9)
>
> **Não possui arquivo `tasks/TASK-001.md`** — esta entrada serve como registro histórico.

---

### HIST-002 — Dimensionar ramais/secundárias individualmente

**Status:** `referência histórica / implementado no código`
**Renomeado de:** TASK-002

> Cada ramal deve ter dimensionamento próprio (velocidade ≤ 1,5 m/s + hf ≤ 10% pressão de serviço com D interno), em vez de herdar o tubo da principal.
>
> **Implementado no código** em 2026-05-19 (P4):
> - Novo arquivo `src/lib/layout/secondary-sizing.ts` (`selectSecondaryPipe`, `sizeAllSecondaries`)
> - `HydraulicSizingReport.sizedSecondaries: SizedSecondaryPipe[]`
> - BOM agrupa ramais por SKU próprio
> - Diagnósticos com warning quando ramal viola limites
> - `secondarySizingModel = "individual_velocity_and_headloss_checked"`
> - 12 testes em `secondary-sizing.test.ts`
>
> **Não possui arquivo `tasks/TASK-002.md`** — esta entrada serve como registro histórico.

---

### HIST-003 — Validar bomba informada contra HMT e vazão

**Status:** `referência histórica / implementado no código`
**Renomeado de:** TASK-003

> O sistema deve validar a bomba informada pelo usuário (`layout.pump`) contra a HMT calculada e a vazão máxima de setor, emitindo status estruturado em vez de apenas texto.
>
> **Implementado no código** como parte do sprint T1–T9:
> - `validatePump()` em `hydraulic-sizing.ts`
> - `PumpValidation.status: "not_informed" | "ok" | "pump_insufficient_flow" | "pump_insufficient_head"`
> - `pumpValidationStatus` e `hydraulicSolverStatus` em `ProposalDiagnostics`
> - Blockers e warnings propagados para diagnósticos
>
> **Não possui arquivo `tasks/TASK-003.md`** — esta entrada serve como registro histórico.

---

### TASK-009C — Extrair função única de ponto de entrada da lateral

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** domínio / refatoração
**Arquivo:** `tasks/TASK-009B-PROVA-cadeia-logica-motor-irrigacao.md` (planejada como parte da série 009)
**Concluída em:** 2026-05-20 · 522/522 testes · 0 erros tsc

> `columnInletCoord()` (privada em `hydraulic-connectivity.ts`) e `columnInletExtreme()` (privada em `constructability.ts`) faziam a mesma coisa: escolher o extremo da PhysicalColumn mais próximo da principal.
> Exportado `columnPhysicalInlet(col, principalCoords, centroid)` de `hydraulic-connectivity.ts` como wrapper fino sobre a privada existente.
> `constructability.ts` agora importa e usa `columnPhysicalInlet`, removendo `distPointToPolylineM`, `columnInletExtreme` e a constante `M_PER_DEG_LAT` locais.
> Sem mudança de comportamento. `inletSideMismatchCount = 0` e `secondary.toCoord ≈ lateral_inlet.coordinate` confirmados por `T009B-inlet` e `T009B-sec`.

---

### TASK-010A — Extrair motor puro de geração da malha de aspersores

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** layout / domínio
**Arquivo:** `tasks/TASK-010A-extrair-motor-malha-aspersores.md`
**Concluída em:** 2026-05-20 · 530/530 testes · 0 erros tsc

> `findOptimalGridAngle()` e `generateRotatedSprinklerGrid()` extraídas de `ProjectMap.tsx`
> para `src/lib/layout/sprinkler-grid.ts` como funções puras exportadas. Sem mudança de
> algoritmo — extração pura. 8 novos testes cobrindo retângulo 0°, área inclinada 30°,
> polígono côncavo, determinismo e independência estrutural da captação.

---

### TASK-010B — Motor geométrico inicial de candidatos de layout 12×12

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** layout / domínio
**Arquivo:** `tasks/TASK-010B-motor-geometrico-candidatos-layout.md`
**Concluída em:** 2026-05-20 · 545/545 testes · 0 erros tsc

> `generateRotatedSprinklerGridWithOffset()` adicionada a `sprinkler-grid.ts`.
> `findBestSprinklerLayout(polygon, spacingMeters)` criada em `sprinkler-grid-optimizer.ts`.
> Motor avalia até 112 candidatos (7 ângulos × 4×4 offsets), pontuando por fillingRatio,
> shortColumnRatio e edgeQualityScore (métrica de borda heurística). Métricas pendentes
> (sectionValveCount, fragmentedLateralRatio, secondaryLengthM, hydraulicBlockers) presentes
> como `null` — requerem TASK-010C. Todos os pesos marcados PENDENTE_CALIBRACAO_RT_CAMPO.
> 15 novos testes (3 offset + 12 optimizer). Nenhuma integração de UI nesta tarefa.

---

### TASK-010C — Integração do motor de candidatos de layout à UI em modo experimental

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** UI / integração
**Arquivo:** `tasks/TASK-010C-integracao-motor-candidatos-ui.md`
**Concluída em:** 2026-05-20 · 552/552 testes · 0 erros tsc

> `candidateToSprinklers()` criada em `optimizer-integration.ts` (mapeamento puro testável).
> `ProjectMap.tsx` recebe estado `OptimizerState`, callbacks `runOptimizer` / `applyOptimizerCandidate` /
> `dismissOptimizer` e painel experimental no sidebar de Aspersores. Motor só roda por clique
> explícito; candidato só altera `layout.sprinklers` após confirmação do usuário. `angleMode`
> estendido com `"optimizer"` em `layout-schema.ts`. Badge persistente "Layout gerado por motor
> geométrico preliminar — não homologado tecnicamente." aparece quando `angleMode === "optimizer"`.
> 7 novos testes em `optimizer-integration.test.ts`.

---

### TASK-010D — Métricas operacionais de setorização no motor de candidatos de layout

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** layout / domínio
**Arquivo:** `tasks/TASK-010D-metricas-setorizacao-motor-candidatos.md`
**Concluída em:** 2026-05-20 · 564/564 testes · 0 erros tsc

> `findBestSprinklerLayout()` evoluído para aceitar `nSetores?: number | null`. Quando válido
> (inteiro, >0, ≤ sprinklerCount), executa `buildSectorsByFlowWithColumnSplitting()` por candidato
> e preenche 6 métricas operacionais em `LayoutScore`: `sectionValveCount`, `fragmentedColumnCount`,
> `fragmentedLateralRatio`, `operationalSegmentsCount`, `maxSegmentsPerColumn`,
> `desbalanceamentoPercent`. 3 novos pesos em `OPTIMIZER_PARAMS` (PENDENTE_CALIBRACAO_RT_CAMPO).
> `ProjectMap.tsx` passa `layout.sectorization?.setoresCount` e exibe métricas como "preliminares"
> ou hint de jornada pendente. `secondaryLengthM` e `hydraulicBlockers` permanecem `null`.
> Retrocompatibilidade total. 12 novos testes em `sprinkler-grid-optimizer.test.ts`.

---

### TASK-010E-A — Métricas de comprimento de laterais no motor de candidatos

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** layout / domínio
**Arquivo:** `tasks/TASK-010E-A-comprimento-laterais-motor-candidatos.md`
**Concluída em:** 2026-05-20 · 573/573 testes · 0 erros tsc

> 5 métricas geométricas de comprimento adicionadas ao `LayoutScore`: `totalLateralLengthM`,
> `avgLateralLengthM`, `maxLateralLengthM`, `lateralLengthPerSprinklerM`,
> `lateralLengthPerHectareM`. Calculadas de `physicalColumns.comprimentoM` — sem solver,
> sem `waterSource`. `WEIGHT_LATERAL_LENGTH = 0` inativo (normalização pendente de calibração).
> `secondaryLengthM` permanece `null` — ramais requerem `waterSource` + `principalCoords`
> → TASK-010E-B. UI exibe seção "Comprimento geométrico de laterais" com aviso que não inclui
> principal, adutora nem ramais. 9 novos testes em `sprinkler-grid-optimizer.test.ts`.

---

## Próximas tarefas sugeridas (não formalizadas)

- **TASK-010E-B — Métricas de principal, ramais/secundárias e captação**: preencher `secondaryLengthM` executando `generateSecondaries()` por candidato. Requer `waterSource` como parâmetro opcional do motor ou estimativa geométrica da principal a partir do polígono. Depende de TASK-010E-A ✅
- **Calibração RT de campo — OPTIMIZER_PARAMS**: validar `N_MIN_COLUMN`, `WEIGHT_SHORT_COLUMN`, `WEIGHT_EDGE`, `WEIGHT_SECTION_VALVE`, `WEIGHT_FRAGMENTATION`, `WEIGHT_IMBALANCE`, `WEIGHT_LATERAL_LENGTH` com dados de projetos homologados; remover marcadores `PENDENTE_CALIBRACAO_RT_CAMPO`. Depende de TASK-010E-A ✅
- **Labels de setor no mapa**: marcadores de setor devem aparecer em `PhysicalColumn.startLngLat` da primeira lateral, não no centroide. Mudança em `ProjectMap.tsx`, bloco `sectorLabelsGeoJSON`.
- **Diâmetro dos ramais no PDF**: `PropostaPDF.tsx` não exibe diâmetro individual dos ramais. Incluir coluna com SKU selecionado por `sizedSecondaries`.
