# Backlog — Brasmáquinas Plataforma

Última atualização: 2026-05-20
Testes na base: 678/678 · TypeScript: 0 erros · Working tree: limpo

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

### TASK-010E-B — Métricas de rede de distribuição no motor de candidatos

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** layout / domínio
**Arquivo:** `tasks/TASK-010E-B-metricas-rede-distribuicao-motor-candidatos.md`
**Concluída em:** 2026-05-20 · 584/584 testes · 0 erros tsc

> 7 métricas geométricas da rede de distribuição adicionadas ao `LayoutScore`:
> `principalLengthM`, `adutoraLengthM`, `secondaryLengthM`, `totalNetworkLengthM`,
> `avgSecondaryLengthM`, `maxSecondaryLengthM`, `distributionLengthRatio`. Calculadas por
> candidato via `generatePrincipalAndAdutora()` + `generateSecondaries()` quando `waterSource`
> fornecido ao motor. 2 pesos provisionais ativos: `WEIGHT_SECONDARY_LENGTH = 0.10`,
> `WEIGHT_TOTAL_NETWORK_LENGTH = 0.10` (PREMISSA_PROVISORIA_MERCADO). Premissas documentadas em
> `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`. Retrocompatibilidade total.
> `hydraulicBlockers` permanece `null` → TASK-010F. 11 novos testes em
> `sprinkler-grid-optimizer.test.ts`.

---

### TASK-010F — Validação hidráulica Top-K dos candidatos de layout

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** layout / domínio / hidráulica
**Arquivo:** `tasks/TASK-010F-validacao-hidraulica-top-k-candidatos.md`
**Concluída em:** 2026-05-20 · 597/597 testes · 0 erros tsc

> Função `runTopKHydraulicValidation(selectionResult, options)` criada — separada de
> `findBestSprinklerLayout`. Avalia os Top K (= 5) candidatos geométricos usando exclusivamente
> o solver oficial `calculateIrrigationProject()`. Blockers originam de `diagnostics.blockers`.
> Penalidade `-WEIGHT_HYDRAULIC_BLOCKER` (= 0.50) aplicada por blocker; `best` re-eleito
> restrito ao Top K. `HydraulicEvaluationStatus` (7 valores), `HydraulicBlockerReal` e
> `TopKHydraulicOptions` exportados. `TOP_K_HYDRAULIC_CANDIDATES` e `WEIGHT_HYDRAULIC_BLOCKER`
> documentados como `PREMISSA_PROVISORIA_MERCADO`. UI com botão explícito separado, spinner e
> painel verde/vermelho por candidato. `estimateHydraulicBlockers()` NÃO implementado — solver
> paralelo rejeitado arquiteturalmente. 13 novos testes em `sprinkler-grid-optimizer.test.ts`.

---

### TASK-011 — Política de ADR e ADRs retroativos essenciais

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** governança / documentação
**Arquivo:** `tasks/TASK-011-politica-adr-e-adrs-retroativos.md`
**Concluída em:** 2026-05-20 · 597/597 testes · 0 erros tsc (task de documentação — src/ não alterado)

> 8 ADRs retroativos criados em `docs/decisoes/` registrando decisões estruturais já consolidadas:
> ADR-001 (orquestrador único), ADR-002 (diâmetro interno), ADR-003 (gate de PDF),
> ADR-004 (lateral física vs. trecho operacional), ADR-005 (registros VIQUA PN80),
> ADR-006 (motor de candidatos preliminar), ADR-007 (premissas provisórias de mercado),
> ADR-008 (validação de PN/classe de pressão).
> Política de ADR adicionada a `docs/software/arquitetura.md` §5.
> Nenhum arquivo em `src/` alterado.

---

### TASK-011B — ADR-009 Validação hidráulica Top-K dos candidatos de layout

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** documentação / governança / decisões arquiteturais
**Arquivo:** `tasks/TASK-011B-adr-009-validacao-hidraulica-top-k.md`
**Concluída em:** 2026-05-20 · 597/597 testes · 0 erros tsc

> ADR-009 criada em `docs/decisoes/`. 10 decisões estruturais da TASK-010F registradas:
> separação `findBestSprinklerLayout` / `runTopKHydraulicValidation`; validação somente por
> ação explícita; uso exclusivo do solver oficial; proibição de solver paralelo;
> `TOP_K_HYDRAULIC_CANDIDATES=5` e `WEIGHT_HYDRAULIC_BLOCKER=0.50` como premissas provisórias;
> `best` restrito ao Top K avaliado; `jornadaHoras=9` como placeholder técnico; `geodetic`
> ausente gera warning; pendência de revisão RT. 3 alternativas descartadas documentadas.
> Nenhum arquivo em `src/` alterado.

---

---

### TASK-010Z — Consolidação do motor de layout 12×12

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** layout / documentação / governança
**Arquivo:** `tasks/TASK-010Z-consolidacao-motor-layout.md`
**Concluída em:** 2026-05-20 · 597/597 testes · 0 erros tsc

> Registro técnico consolidado do motor de layout 12×12 após TASK-010A–010F. 8 seções:
> fluxo de dois passos (`findBestSprinklerLayout` geométrico + `runTopKHydraulicValidation` Top-K),
> tabela de 14 parâmetros `OPTIMIZER_PARAMS` com origem e status de calibração, classificação
> de critérios em três blocos (A: regras definidas, B: premissas provisórias, C: pendências futuras),
> governança e ADRs relacionados (ADR-001 a ADR-007), 8 limitações atuais com impacto,
> rastreabilidade TASK-010A a TASK-010Z, resumo do estado atual para o RT.
> Sem alteração de código.

---

### TASK-012 — Saneamento de working tree e separação de commits

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Área:** governança / repositório
**Arquivo:** `tasks/TASK-012-saneamento-working-tree-commits.md` *(a criar se necessário)*
**Concluída em:** 2026-05-20 · 597/597 testes · 0 erros tsc

> 59 itens pendentes (17 tracked modificados + 42 untracked) organizados em 10 commits limpos
> por responsabilidade. Nenhum arquivo de código alterado.
> Commits criados: chore(.gitignore), chore(packages), docs(CLAUDE.md+commands),
> docs(ARQUITETURA_ATUAL.md), feat(domain core — 31 arquivos, 8921 inserções),
> feat(offset grid TASK-010B), feat(hydraulic diagnostics), refactor(layout-schema),
> docs(ADR policy + ADRs 001-008), docs(historical reports + task files).
> `.vscode/`, `memory/`, `HANDOFF.md`, `update_catalog_and_bom.py` adicionados ao `.gitignore`.
> Dependência circular `sectorization ↔ laterais` resolvida fundindo commits em um único
> commit de fundação de domínio.

---

### TASK-013 — Auditar e corrigir laterais físicas construtíveis

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / diagnósticos
**Arquivo:** `tasks/TASK-013-laterais-fisicas-construtiveis.md`
**Concluída em:** 2026-05-20 · 629/629 testes · 0 erros tsc

> **P1 (bug):** `generatePhysicalColumns()` usava `xRep` (média X da coluna no frame local)
> como `startLngLat`/`endLngLat`. Corrigido: endpoints agora são as posições geodésicas reais
> do primeiro e último aspersor da coluna.
>
> **P2 (feature):** `detectNetworkAngleIssues()` criada em `network-angle-diagnostics.ts`.
> Verifica dobras internas da principal e junções ramal → principal / ramal → lateral.
> Ângulos fora de 0°/45°/90° (tolerância ±5° — `PENDENTE_REVISAO_RT_BRASMAQUINAS`) geram
> blocker em `diagnostics.blockers`, impedindo emissão de PDF via gate existente (HTTP 422).
> Junção adutora → principal não verificada: por invariante I4 de `generatePrincipalAndAdutora`,
> a adutora sempre conecta no endpoint da principal (conexão de extremidade — não T-junction).
> 20 novos testes. Premissa documentada em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`.

---

### TASK-014 — Labels de setor no mapa usando PhysicalColumn.startLngLat

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** mapa / UI
**Arquivo:** `tasks/TASK-014-labels-setor-start-physical-column.md`
**Concluída em:** 2026-05-20 · 634/634 testes · 0 erros tsc

> Labels de setor migrados de centroide da nuvem de aspersores para `PhysicalColumn.startLngLat`.
> Função pura `resolveSectorLabelAnchor(sectorIdx, physicalColumns)` extraída para
> `src/lib/layout/sector-label-anchor.ts` com lógica de prioridade em 2 níveis:
> (1) `sectorsTouched[0] === sectorIdx` (setor primário), menor `columnIndex`;
> (2) `sectorsTouched.includes(sectorIdx)` (setor secundário), menor `columnIndex`;
> (3) fallback ao centroide quando `null`.
> `sectorLabelsGeoJSON` em `ProjectMap.tsx` atualizado; `physicalColumns` adicionado às deps.
> 5 novos testes em `sector-label-anchor.test.ts`.
>
> **Pendência:** validação visual no browser (2, 3 e 4 setores; coluna fragmentada).

---

### TASK-015 — Roteamento construtível de ramais/secundárias com 90°/180°

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / domínio
**Arquivo:** `tasks/TASK-015-roteamento-construtivel-ramais-secundarias-90-180.md`
**Concluída em:** 2026-05-20 · 672/672 testes · 0 erros tsc

> Aplicação da regra oficial de construtibilidade angular Brasmáquinas (confirmada pelo RT):
> **rede interna** (principal, ramais, laterais, trechos, registros, junções) usa apenas 0° e 90°
> (deflexões permitidas: 0° = luva/trecho reto e 90° = curva/tê 90°);
> **adutora** aceita 0°, 45° e 90°. 45° na rede interna é blocker.
>
> `ALLOWED_DEFLECTIONS_INTERNAL = [0, 90]` e `ALLOWED_DEFLECTIONS_ADUTORA = [0, 45, 90]`
> exportados de `network-angle-diagnostics.ts`. `isAllowedDeflection(45)` → `false`.
> `SecondaryPipe.coords?: [number,number][]` opcional (retrocompatível); `generateSecondaries`
> popula `coords` via `routeSecondary()` (reta ou L-shape 90°); `lengthM` = rota real.
> `ProjectMap.tsx` usa `coords ?? [fromCoord, toCoord]` na LineString do ramal.
> `detectNetworkAngleIssues` usa primeiro segmento de `coords` para junção ramal→principal
> e último segmento para junção ramal→lateral. 28 novos testes.
> ADR-010 criada. `REGRA_CONSTRUTIBILIDADE_ANGULAR_REDE_INTERNA` documentada em premissas.
>
> **Pendências:** BOM de conexões físicas (cotovelos/luvas) — futura task;
> roteamento automático de dobras manuais na principal — fora do escopo.
>
> **Follow-up (mesma sessão):** TASK-016 corrigiu falso positivo de 180° na junção ramal→lateral.

---

### TASK-016 — Corrigir falso positivo 180° na junção ramal-lateral

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / diagnósticos
**Arquivo:** `tasks/TASK-016-falso-positivo-180-juncao-ramal-lateral.md`
**Concluída em:** 2026-05-20 · 672/672 testes · 0 erros tsc

> Bug em `detectNetworkAngleIssues` (seção 2b — junção ramal → lateral): o código usava
> `latVec = col.startLngLat → col.endLngLat` independente de qual extremo era o inlet.
> Quando `sec.toCoord ≈ col.endLngLat`, o vetor ficava antiparalelo ao `lastVec` → deflexão 180°
> → falso blocker em continuidade reta válida.
> Corrigido com snap métrico (tolerância 1,0 m): `latVec` agora aponta de inlet → extremidade oposta.
> `isAllowedDeflection`, `ALLOWED_DEFLECTIONS_INTERNAL` e `ALLOWED_DEFLECTIONS_ADUTORA` preservados.
> Roteamento, solver, BOM, mapa e catálogo não alterados.
> 10 novos testes em `network-angle-diagnostics.test.ts` (T16-A a T16-F).

---

### TASK-017 — Corrigir lateral física para rota reta/construtível

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** mapa / renderização / construtibilidade
**Arquivo:** `tasks/TASK-017-lateral-fisica-reta-construtivel.md`
**Concluída em:** 2026-05-20 · 673/673 testes · 0 erros tsc

> Correção de renderização: `physicalColumnsGeoJSON` em `ProjectMap.tsx` usava
> `col.sprinklerIndices.map(idx → positions[idx])` — N pontos com micro-desvios de ponto
> flutuante — gerando zigue-zague visual com deflexões ~120° na camada "Lateral física".
> Corrigido para `[col.startLngLat, col.endLngLat]` — LineString reta de 2 pontos.
> O modelo (`PhysicalColumn`) estava correto desde TASK-013; a correção foi exclusivamente
> de renderização. `layout.sprinklers` removido das deps do `useMemo`. Teste P1g atualizado;
> P1g_col novo: aspersores intermediários < 0,5 m do eixo (ruído numérico de rotação).
> 1 novo teste. Arquivo retroativo `tasks/TASK-016-*.md` criado nesta sessão.

---

### TASK-018 — Corrigir eixo canônico das laterais físicas

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / renderização
**Arquivo:** `tasks/TASK-018-corrigir-eixo-canonico-laterais-fisicas.md`
**Concluída em:** 2026-05-20 · 678/678 testes · 0 erros tsc

> Causa raiz identificada após TASK-017: `generatePhysicalColumns` usava posições geodésicas
> reais dos aspersores extremos como `startLngLat`/`endLngLat`. Extremos com desvio oposto
> (X+δ e X-δ) inclinavam a reta e afastavam os aspersores intermediários.
> Corrigido com `xSegRep = média de X do segmento` → `startLngLat = toLngLat(xSegRep, yFirst)`,
> `endLngLat = toLngLat(xSegRep, yLast)`. Linha verificada matematicamente: `dev = |δx_local|`.
> `maxSprinklerAxisDeviationM()` exportado como função diagnóstica pura (integração em
> `diagnostics` adiada para TASK-019). Helper `makeGridFlat` adicionado para testes com
> projeção flat-earth consistente com o domínio. Premissa `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,5 m`
> registrada. 5 novos testes (T18-a, T18-b, T18-c × 3).

---

## Próximas tarefas sugeridas (não formalizadas)

- **Calibração RT de campo — OPTIMIZER_PARAMS**: validar pesos provisionais (PREMISSA_PROVISORIA_MERCADO) e pesos aguardando campo (PENDENTE_CALIBRACAO_RT_CAMPO) com dados de projetos homologados; remover marcadores. Depende de TASK-010A–010Z ✅
- **Diâmetro dos ramais no PDF**: `PropostaPDF.tsx` não exibe diâmetro individual dos ramais. Incluir coluna com SKU selecionado por `sizedSecondaries`.
