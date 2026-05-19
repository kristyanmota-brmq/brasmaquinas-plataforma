# Backlog — Brasmáquinas Plataforma

Última atualização: 2026-05-19
Testes na base: 431/431 · TypeScript: 0 erros

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

**Status:** `pendente`
**Prioridade:** P2-importante
**Área:** bom

> Pontos de controle (`ControlPoint` com `type: "section_valve"`) existem na construtibilidade mas não geram peças na BOM. Cada ponto deve resultar em uma linha de válvula dimensionada pelo diâmetro do trecho.
>
> **Problema atual:** `buildBOM` ignora `constructability.controlPoints`. A BOM não inclui válvulas de corte operacional.
>
> **Escopo esperado:**
> - Peça de válvula por diâmetro a partir do catálogo (a definir)
> - Linha `categoria: "CONEXAO"` na BOM por ponto de controle
> - `status: "resolved"` nos ControlPoints incluídos na BOM
> - `meta.valvulasCount` em `BOMResult`
> - Testes obrigatórios: ≥ 5
>
> **Dependência:** TASK-004 pode afetar o diâmetro escolhido nos pontos de controle.

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

## Próximas tarefas sugeridas (não formalizadas)

- **P2 — Labels de setor no mapa**: marcadores de setor devem aparecer em `PhysicalColumn.startLngLat` da primeira lateral, não no centroide. Mudança em `ProjectMap.tsx`, bloco `sectorLabelsGeoJSON`.
- **Diâmetro dos ramais no PDF**: `PropostaPDF.tsx` não exibe diâmetro individual dos ramais. Incluir coluna com SKU selecionado por `sizedSecondaries`.
