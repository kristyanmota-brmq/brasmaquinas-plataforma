# Backlog — Brasmáquinas Plataforma

Última atualização: 2026-05-22
Testes na base: 836/836 · TypeScript: 0 erros · 27/27 testes tooling · Working tree: modificado (TASK-052 — homologação documental da premissa de operação rotativa por setor) — **TASK-004B publicada em `origin/main` (commit `b1bc2e0`) + TASK-052 homologa premissa "Critério de vazão de projeto do ramal" como `APROVADO_RT` após RT (Kristyan Mota) confirmar em 2026-05-22 que a operação Brasmáquinas é rotativa por setor; corrige inconsistência documental (descrição afirmava "todos ativos simultaneamente" enquanto código faz `max(...)` — implementação tecnicamente correta desde origem); produto estritamente documental (`docs/metodologia/12-premissas-...md`); veredito GPT `aprovado_com_ajustes` (BLK-MET-001 sobre snapshot interno desatualizado do prompt do GPT — justificado no decision-log como pendência tooling futura TOOL-XXX); 0/7 invariantes violadas; nenhum `src/**` alterado**

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

### TASK-001 — Diagnóstico formal do software atual

**Status:** `aguardando_fechamento` (terminal estável; aguarda commit/push)
**Prioridade:** P1-crítico
**Classe:** A — diagnóstico estrutural / arquitetura / governança / documental
**Área:** governança
**Arquivo:** `tasks/TASK-001-diagnostico-software-atual.md`
**Concluída em:** 2026-05-22 · 826/826 testes vitest · 0 erros tsc · 27/27 testes tooling · produto intocado
**Relatório:** `docs/relatorios/2026-05-22-TASK-001.md`
**Veredito GPT:** `aprovado` · 0 blockers · 0/7 invariantes violadas
**Decisão humana:** `aprovado` (sem override) — `ai/decision-log.md` 2026-05-22T20:17:39-03:00

> Diagnóstico formal do estado atual do software de aspersão convencional em 2026-05-22. **Reconcilia** o arquivo original (criado 2026-05-19, ainda apontando cenário de 400 testes e gate de PDF como pendência) com o estado real (826 testes; 15 ADRs; 9 épicos formalizados no Mapa Mestre TASK-024E; MVP tecnicamente atingido para caso base; TOOL-001/002/003 de handoff Claude ↔ GPT Reviewer entregues). Relatório de ~900 linhas em 12 seções obrigatórias + 3 apêndices: (1) Resumo + escopo + método; (2) Visão geral do software; (3) Arquitetura funcional dos 4 motores (M1 Técnico implementado / M2 Governança não iniciado / M3 Comercial não iniciado / M4 Interface parcial); (4) Matriz dos 9 épicos consumindo Mapa Mestre TASK-024E; (5) Motores existentes com módulos + ADRs + débitos técnicos; (6) Entradas e saídas (`ProjectLayout` → `IrrigationProjectResult` → PDF + mapa); (7) Status por bloco de valor (regra conservadora TASK-024D); (8) Evidências (53 relatórios, 15 ADRs, screenshots, fixtures, 826 testes); (9) 13 riscos técnicos priorizados; (10) Inventário de 14 premissas + 6 pesos + 22+ limites de Classe A/B/C pendentes RT; (11) 5 condições canônicas para destravar E08 — Motor Comercial; (12) Roadmap separado em 5 categorias (próxima task / Classe A / Classe E validação / pendências RT/campo / tooling futuro). Achado-chave: 7 dos 9 épicos do MVP estão em "Validado visualmente no Projeto A — caso único"; Projeto A é fictício; primeira proposta real ao cliente seria simultaneamente a primeira validação visual documentada de múltiplos épicos (regra central TASK-024D alerta contra esse cenário). **Primeira task fora de validação interna a usar fluxo TOOL-003 integralmente** (`/handoff-claude-report TASK-001` → `/gpt-review TASK-001` → entry append-only em `ai/decision-log.md` → `/implementar TASK-001`). Mapa Mestre `tasks/TASK-024-mapa-mestre-tasks.md` não alterado (é fonte). Premissas `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` inventariadas mas não alteradas. Nenhum arquivo em `src/**` alterado. Nenhum ADR novo criado. Predecessor `docs/relatorios/2026-05-19-diagnostico-software-atual.md` (commit `23609bc`, 400 testes) preservado fisicamente como registro histórico.

---

### TASK-002 — Motor de Governança A/B/C (ProjectClassificationEngine)

**Status:** `pendente`
**Bloqueada por:** homologação de `docs/metodologia/09-classificacao-de-projetos.md` pelo RT (TASK-001 deixa de ser bloqueio após commit/push)
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
> **Pendências:** ~~pressão real por derivação para ramal/lateral (requer `cumPrincipalHfM`
> no segmento)~~ — **RESOLVIDO por TASK-004B (2026-05-22)**; desnível por segmento quando
> elevações pontuais disponíveis — pendente, task futura separada.

---

### TASK-004B — Pressão real por derivação / cumPrincipalHfM

**Status:** `concluída`
**Prioridade:** P2-importante
**Classe:** A — motor hidráulico
**Área:** hidráulica
**Arquivo:** `tasks/TASK-004B-pressao-real-derivacao.md`
**Concluída em:** 2026-05-22 · 836/836 testes vitest (+10 novos) · 0 erros tsc · 27/27 testes tooling · produto exclusivamente em `src/lib/layout/hydraulic-sizing.ts`
**Relatório:** `docs/relatorios/2026-05-22-TASK-004B.md`
**Veredito GPT:** `aprovado_com_ajustes` · 2 blockers (TEC-004B-001 + MET-004B-001) · 0/7 invariantes violadas
**Decisão humana:** `aprovado_com_ajustes` (Opção A para ambos) — `ai/decision-log.md` 2026-05-22T21:02:18-03:00

> Follow-up direto da pendência registrada na TASK-004 mãe (2026-05-19). Entrega da **Alternativa C da ADR-008** que foi explicitamente reservada para tarefa futura: substituição do cálculo conservador de pressão em ramais e laterais (HMT como teto único) por **pressão real por derivação** = `HMT − adutoraHfM − cumPrincipalHfM`. Mudança cirúrgica em `src/lib/layout/hydraulic-sizing.ts` (~30 linhas): 2 campos opcionais novos em `HydraulicSegment` (`cumPrincipalHfM`, `adutoraHfM`); novo helper puro exportado `derivePressureClassModel(segments)` que retorna `"exact_per_derivation"` quando ambos os campos estão populados em todos os ramais/laterais (Opção A do ajuste TEC-004B-001); `annotatePressureClass` ganha caminho `exact_per_derivation` quando dados disponíveis com fallback `hmt_conservative_inlet` preservado para compatibilidade; `modelLimitations.pressureClassModel` detectado dinamicamente. 10 testes novos em `pressure-class.test.ts` (T04B-1..T04B-6 + 4 testes do helper). Resultado: vitest 826 → 836 (sem regressão em integration.test.ts/bom.test.ts/pipeline-diagnostics.test.ts — propagação de campos é aditiva); tsc preservado em 0 erros; 27/27 tooling tests preservado. Comportamento prático: warnings espúrios `violation_conservative` em laterais PN40/sistemas planos com HMT 40+ mca são substituídos por classificação correta (`ok` quando pressão real ≤ PN; `violation_confirmed` blocker quando pressão real > PN). Mitiga R8 do diagnóstico TASK-001 e promove precisão técnica do épico E03 (Motor Hidráulico) sem ainda atingir critério "Validado em projeto histórico" (depende de comparação RT). Mapa Mestre, premissas RT/campo, ADR-008, RB-09, catálogo, BOM, PDF, UI/mapa, motor comercial, `secondary-sizing.ts`, `laterais.ts` e demais arquivos de geometria intocados. Desnível geodético por segmento e perdas locais proporcionais ficam fora do escopo desta task (futura).

---

### TASK-052 — Homologar premissa de operação rotativa por setor

**Status:** `concluída`
**Prioridade:** P3-melhoria
**Classe:** C — documental / governança
**Área:** governança / metodologia
**Arquivo:** `tasks/TASK-052-homologar-rotativa-por-setor.md`
**Concluída em:** 2026-05-22 · 836/836 testes vitest · 0 erros tsc · 27/27 testes tooling · `src/**` intocado
**Relatório:** `docs/relatorios/2026-05-22-TASK-052.md`
**Veredito GPT:** `aprovado_com_ajustes` · 1 blocker (BLK-MET-001 sobre snapshot interno desatualizado do prompt do GPT — não responsabilidade desta task) · 0/7 invariantes violadas
**Decisão humana:** `aprovado_com_ajustes` (sem override) — `ai/decision-log.md` 2026-05-22T21:52:58-03:00

> Homologação documental da premissa "Critério de vazão de projeto do ramal" em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`. O RT (Kristyan Mota) confirmou em 2026-05-22 que a operação Brasmáquinas é **rotativa por setor (1 setor ativo por vez)** — informação fornecida durante análise técnica pós-TASK-004B dos ramais. A premissa estava com descrição **contraditória** (afirmava "todos os aspersores da coluna ativos simultaneamente" — que seria `sum(...)`) enquanto o código em [`src/lib/layout/secondary-sizing.ts:180-183`](../src/lib/layout/secondary-sizing.ts#L180-L183) sempre usou `max(lat.vazaoM3h)` — comportamento exato de operação rotativa. **O código estava tecnicamente correto desde sua origem; apenas a documentação descreveu mal.** TASK-052 corrigiu a descrição (linhas obsoletas "Alternativa pós-RT" + 2 "Risco" removidas; "Valor usado", "Regra" e "Origem" reescritas; referência ao código adicionada) e promoveu o status `PENDENTE_REVISAO_RT_BRASMAQUINAS → APROVADO_RT`. Histórico de revisões atualizado com entrada datada citando RT, motivo e referência ao código. Classe C — `src/**` intocado; nenhum teste novo; nenhum ADR; sem `RB-09`; Mapa Mestre preservado. GPT identificou 1 blocker (BLK-MET-001) sobre snapshot interno do prompt do `run-gpt-review.mjs` desatualizado (cita `vitest 817/817` + `tooling 20/20` — provavelmente baseline TOOL-001) vs valores reais atuais 836/27 — justificado no decision-log como pendência de tooling futura (TOOL-XXX, atualizar snapshot do prompt) e não responsabilidade desta task documental. Sucessor identificado para investigação técnica dos ramais ("ramais estão horríveis"): TASK-053 Classe A futura sobre topologia (Problemas 1, 2, 3, 5, 6 da análise pós-TASK-004B — atualmente 1 ramal independente por coluna sem agrupamento).

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

### TASK-019 — Integrar desvio aspersor-eixo da lateral em diagnostics

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / diagnósticos
**Arquivo:** `tasks/TASK-019-integrar-desvio-aspersor-eixo-lateral-diagnostics.md`
**Concluída em:** 2026-05-20 · 686/686 testes · 0 erros tsc

> Regra operacional Brasmáquinas confirmada: a vala da lateral e o ponto do aspersor são
> a mesma execução física. Aspersor fora do eixo é erro construtivo.
>
> `detectAxisDeviations(cols, positions, centroid)` criada em `laterais.ts`.
> `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m` exportada como constante nomeada.
> Integrada ao orquestrador `calculateIrrigationProject()` após `detectNetworkAngleIssues`.
> `generateProposalDiagnostics()` recebe 5° parâmetro opcional `axisDeviationReport`.
> Desvio > 0,10 m gera **blocker** com texto "Aspersor fora do eixo da lateral física".
> PDF bloqueado automaticamente via gate existente (`pdfEmissionBlockers()`).
> `axisDeviation: AxisDeviationReport | null` exposto em `IrrigationProjectResult`.
> Premissa `TOLERANCIA_ASPERSOR_EIXO_LATERAL` atualizada: valor 0,10 m, origem decisão
> operacional Brasmáquinas, severidade blocker, valor pendente revisão RT.
> 8 novos testes (T19-a..T19-h).
>
> **Pendência:** revisão RT do valor 0,10 m para fazendas > 500–700 m.

---

### TASK-020 — ADR-011 Aspersor obrigatoriamente sobre lateral física

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** governança / documentação
**Arquivo:** `tasks/TASK-020-adr-011-aspersor-sobre-lateral-fisica.md`
**Concluída em:** 2026-05-20 · 686/686 testes · 0 erros tsc (nenhuma alteração de código)

> Registro formal da decisão operacional Brasmáquinas em ADR-011: a vala da lateral e o ponto do aspersor são a mesma execução física. Aspersor fora do eixo exige segunda escavação, tornando projeto construtivamente inválido.
>
> **ADR-011** criado em `docs/decisoes/` com 10 seções: Contexto, Decisão (regra confirmada, tolerância 0,10 m, severidade blocker, implementação), Alternativas (4 descartadas), Consequências, Arquivos, Classificação, Referências, Log.
>
> Registra:
> - Regra: **APROVADO — decisão operacional Brasmáquinas** (não é premissa provisória)
> - Tolerância: `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m` (constante exportada)
> - Severidade: **blocker** — desvio > 0,10 m impede emissão do PDF via gate existente (ADR-003)
> - Implementação: `detectAxisDeviations`, `generateProposalDiagnostics`, `IrrigationProjectResult.axisDeviation` (já em TASK-019)
> - Status do valor: `PENDENTE_REVISAO_BRASMAQUINAS` (para fazendas > 500–700 m)
>
> Nenhum arquivo em `src/` alterado — documentação pura. Task, ADR e relatório criados. Backlog atualizado.

---

### TASK-021 — Workspace full-screen com painel lateral

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** ui / ux / layout
**Arquivo:** `tasks/TASK-021-workspace-full-screen-mapa.md`
**Concluída em:** 2026-05-21 · 686/686 testes · 0 erros tsc

> Task UX/layout puro — nenhum arquivo em `src/lib/` alterado; nenhum solver, BOM, catálogo, PDF ou motor técnico tocado.
>
> `src/app/projetos/[id]/page.tsx`: removido wrapper `max-w-7xl`, breadcrumb e bloco de título; `<ProjectMap />` renderiza diretamente após `<Header />` com nova prop `statusLabel`.
>
> `src/components/map/ProjectMap.tsx`: container `h-[calc(100dvh-64px)] grid grid-cols-1 md:grid-cols-[1fr_360px]` — sem border, sem rounded, sem min-h artificial. Overlay antigo de `pdfError` removido do mapa. Aside reestruturado: desktop = estático 360px fixo, scroll próprio; mobile = drawer `fixed bottom-0 h-[60dvh]` com toggle `md:hidden` (`aria-label`, `min-h-[44px]`) e overlay `bg-black/30`. Header do projeto no topo do sidebar (breadcrumb, nome, status badge, cliente). Seção de blockers (vermelho, `max-h-32 overflow-y-auto`) derivada de `projectResult.diagnostics?.blockers` — sempre reativa, sem precisar clicar PDF. Seção de warnings (âmbar) derivada de `projectResult.diagnostics?.warnings`. `pdfError.invalidHydraulicSegments` exibido como detalhe extra no sidebar. `100dvh` preferido a `100vh` para evitar overflow em mobile/Safari.
>
> **Pendências:** validar drawer mobile com clique real (DevTools ou device físico); validar `pdfError.invalidHydraulicSegments` no sidebar via clique PDF com blocker ativo.

---

### TASK-022 — BOM de conexões físicas construtíveis

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** bom / construtibilidade / domínio
**Arquivo:** `tasks/TASK-022-bom-conexoes-fisicas-construtiveis.md`
**Concluída em:** 2026-05-21 · 704/704 testes · 0 erros tsc

> Adicionadas à BOM todas as conexões físicas derivadas da geometria: curvas 90° em ramais em L (precificadas via `CURVAS_90_RIGIDAS`), curvas 90°/45° na adutora e derivações aspersor→lateral.
>
> Novo tipo `BOMPendingConnection` para conexões sem SKU catalogado. Novo blocker comercial `"BOM incompleta"` em `generateProposalDiagnostics` quando `conexoesFisicasSemSkuCount > 0`. Blockers comerciais filtrados no optimizer para não contaminarem avaliação hidráulica de candidatos.
>
> Novos arquivos: `src/lib/layout/physical-connections.ts` (detecção geométrica pura — Camada A), `src/lib/layout/__tests__/physical-connections.test.ts` (18 testes T22-a..r).
>
> **Pendências abertas (bloqueiam proposta final até resolução):**
> - `tee_90_aspersor_lateral`: sem SKU → todo projeto com aspersores tem blocker comercial permanente até TASK futura homologar tê redutor/sela de tomada DN25→DNlateral
> - `curva_45_adutora`: sem SKU → `BOMPendingConnection` permanente até homologação
> - Luvas: fora do escopo — sem critério de contagem e sem SKU; TASK futura define por tipo de tubo

---

### TASK-023 — Homologar kit de ligação do aspersor 5022 por DN da lateral

**Status:** `concluída`
**Prioridade:** P1-crítico (desbloqueia blocker comercial de todo projeto com aspersores)
**Área:** bom / catálogo
**Arquivo:** `tasks/TASK-023-homologar-kit-aspersor-5022-por-dn-lateral.md`
**Concluída em:** 2026-05-21 · 731/731 testes · 0 erros tsc

> Kit de ligação do aspersor 5022 homologado por DN da lateral física. Regra operacional Brasmáquinas: laterais somente DN50mm e DN75mm.
>
> `KIT_ASPERSOR_5022` adicionado a `aspersores.ts` com 5 SKUs reais: `1819000` (Luva 3/4"), `1000843` (Tubo de Subida 3/4"×3m), `1000354` (Tê roscável DN50×3/4"), `132789` (Tê PTI PN80 DN75×1"), `1464000` (Bucha 1"×3/4" Tigre). `selectKitAspersor5022(dnMm)` retorna `null` para DN != 50 e != 75.
>
> `buildBOM` resolve kit por coluna física, acumulando itens por SKU no `Map` antes de emitir (`1819000` e `1000843` agrupados: qty = total aspersores DN50+DN75). Regra do tubo de subida corrigida: `ceil(count/2)` → `1 unidade por aspersor`. DNs não homologados geram blocker `"BOM incompleta — DN de lateral não homologado para kit do aspersor 5022"` (prefixo compatível com filtro do optimizer).
>
> Meta atualizado: `tesAspersorLateralCount` removido → `kitAspersorResolvCount` + `kitAspersorDnNaoHomologadoCount`. T22-n, T22-o, T22-q reescritos. Fixtures `makeMinimalBOM` atualizadas. 27 novos testes em `bom-kit-aspersor.test.ts` (T23-a..f).
>
> **Pendências:**
> - `marca` dos SKUs `1819000`, `1000843`, `1000354` — não informada pelo RT; campo `""` no catálogo
> - `curva_45_adutora` — sem SKU; `BOMPendingConnection` permanente (escopo futuro)
> - Seletor hidráulico ainda aceita DN100 → TASK-025

---

### TASK-039 — Revalidação visual pós-TASK-031

**Status:** `concluída` (aprovada — TASK-031 confirmada empiricamente)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** validação / governança / hidráulica
**Arquivo:** `tasks/TASK-039-revalidacao-visual-pos-task-031.md`
**Concluída em:** 2026-05-21 · 759/759 testes · 0 erros tsc · `src/` não alterado

> Validação empírica no browser real (Playwright MCP) do Projeto A em Barreiras/BA (`cmpfu7e4b0001ulshh0ni8jhd`) após a TASK-031. **TASK-031 confirmada**: (1) Tubo LF Ø100mm = **0 barras** ✅ (era 625 na TASK-033); (2) blocker antigo do kit 5022 **AUSENTE** ✅; (3) blocker técnico novo **presente** ⚠️ (8 colunas excedem DN75; perda máx 33,10 mca; vel máx 3,57 m/s — texto e ações sugeridas conforme TASK-031); (4) BOM total **R$ 226.724,81** ✅ (−R$ 30.364 / −11,8% vs. R$ 257.089 da TASK-033); (5-6) sem blockers hidráulicos inesperados; sidebar/PDF coerentes (gate 422 funciona); (7) laterais sobre aspersores preservadas (TASK-028 mantida); (8) `routeCoords` renderizado. 100% dos aspersores (337/337) agora em kit homologado. 9 achados (H1-H9): **TASK-040 sugerida** para H5/H6 (caminho feliz ainda não limpo — geração default produz 8 colunas com perda 5,5× o limite; revisar arquitetura da grade). F1 da TASK-027 persiste (TASK-034). Evidências: `docs/relatorios/evidencias/2026-05-21-TASK-039/` (3 PNGs + 11 traces). Relatório: `docs/relatorios/2026-05-21-TASK-039.md`.

---

### TASK-035 — BOM de curvas 90° em sub-laterais com routeCoords

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** bom / construtibilidade / domínio
**Arquivo:** `tasks/TASK-035-bom-curvas-90-laterais-routecoords.md`
**Concluída em:** 2026-05-22 · 817/817 testes (+8 vs. 809 baseline) · 0 erros tsc · catálogo intocado
**Relatório:** `docs/relatorios/2026-05-22-TASK-035.md`

> Fechado o gap deixado pela TASK-028: curvas 90° dentro das valas das laterais físicas (`PhysicalColumn.routeCoords`) agora são contadas. Nova função pura `countLateralBends90()` em `physical-connections.ts` (guard `length < 3`, filtro `MIN_SEG_LEN_M = 0,01 m` para ruído numérico, reusa `ANGLE_TOL_DEG = 5°`). Wiring em `bom.ts`: bloco "D" entre curvas adutora e kit aspersor; **catálogo apenas `CURVAS_90` (LF)** — nunca `CURVAS_90_RIGIDAS` em lateral LF; `BOMPendingConnection.tipo` ampliado com `"curva_90_lateral"`; campos meta novos `curvas90LateraisCount` e `curvas90LateraisSemSkuCount`. **Resultado:** DN75 com curva real → SKU `150174` (CURVA 90 LF DN75 — R$ 20,00) precificado; DN50 com curva real → `BOMPendingConnection { motivoPendencia: "sku_nao_catalogado" }` + blocker "BOM incompleta" cita "curva 90° lateral"; **caminho feliz pós-TASK-046 (todas as colunas com `routeCoords.length === 2`)** → 0 curvas, 0 pendência nova, `totalGeral` inalterado pela task (Projeto A continua R$ 213.740,15). Fonte única: `PhysicalColumn.routeCoords` (evita dupla contagem com `Lateral.routeCoords`). 8 testes novos em `lateral-bends-90.test.ts` (T35-a..T35-h). 2 fixtures `meta` mecanicamente ampliadas (`bom-valves.test.ts`, `pressure-class.test.ts`). **Sem ADR novo** (cumprimento operacional de ADR-012-emenda + ADR-013 + TASK-022). **Sem premissa nova** em `12-premissas-...md`. Catálogo, geometria, `routeCoords`, `buildLateralRoute`, geração da malha, PDF, mapa, server actions — **intocados**.
>
> **Pendências:**
> - Homologação RT de SKU curva 90° LF DN50 (vira `BOMPendingConnection` quando algum projeto tiver lateral DN50 com cotovelo real)
> - Revalidação visual opcional via Playwright para confirmar BOM R$ 213.740,15 e PDF HTTP 200 no Projeto A

---

### TASK-046 — Corrigir agrupamento/orientação automática das laterais no Projeto A

**Status:** `concluída` — **série de validação visual TASK-027→046 FECHADA**
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / geometria
**Arquivo:** `tasks/TASK-046-corrigir-agrupamento-orientacao.md`
**Concluída em:** 2026-05-22 · 809/809 testes (+10 vs. 799 baseline) · 0 erros tsc · catálogo intocado
**Relatório:** `docs/relatorios/2026-05-22-TASK-046.md`

> Causa-raiz IDENTIFICADA via diagnóstico geométrico executado antes da implementação: extraído polígono real do Projeto A via Prisma + matriz ângulo × maxDeviation 0°-89° mostrou que **apenas 0° e 45° eram válidos** com algoritmo antigo (eixos cardinais Haversine). Causa-raiz **estrutural**: `turf.pointGrid` + `turf.transformRotate` operavam em **graus geográficos**, introduzindo distorção métrica que crescia com distância ao centroide — em colunas de 240 m do Projeto A, aspersores de extremidades ficavam até 10 m fora do eixo no frame local. **Correção:** `generateRotatedSprinklerGrid` reescrita em **frame métrico local** (centroide em lng/lat → rotação plana em metros → bbox métrico → grade uniforme em metros → point-in-polygon métrico via ray-casting → rotação plana inversa → conversão para lng/lat). `findOptimalGridAngle` estendida com gate de desvio aspersor-eixo (≤ TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m) como defesa secundária; `spacingMeters` default 12; fallback `console.warn` se nenhum válido. **Resultado empírico Projeto A:** ângulo 31° → 59° (gate aplicado); aspersores 337 → 344; 0 blockers ✅; PDF HTTP 200 + download ✅; BOM R$ 226.946 → **R$ 213.740,15** (−R$ 13.206; −R$ 64.215 / −23,1% vs. baseline TASK-041); ramais 3.859 → 2.736 m; Tubo LF Ø100 = 0 (ADR-013); aspersores em kit 344/344. **TASK-045B preservada** (lateral reta via mediana). ADRs 010/011/012-emenda/013/014/015 preservadas; sem ADR novo. 10 testes T46-* novos em `grid-orientation.test.ts`. **Série de validação visual TASK-027 → TASK-033 → TASK-039 → TASK-041 → TASK-044 → TASK-045 → TASK-045B → TASK-046 fechada com sucesso** — primeira vez que TODOS os critérios são atendidos simultaneamente no caminho feliz default do Projeto A.

---

### TASK-045B — Corrigir rota reta das laterais e eliminar lógica ponto-a-ponto em escada

**Status:** `concluída` (resultado misto — zigue-zague eliminado em código; TASK-046 obrigatória para fechar série visual)
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / construtibilidade
**Arquivo:** `tasks/TASK-045B-corrigir-rota-reta-laterais.md`
**Concluída em:** 2026-05-21 · 799/799 testes (+11 vs. 788 baseline) · 0 erros tsc · catálogo intocado
**Relatório:** `docs/relatorios/2026-05-21-TASK-045B.md`

> Substituído algoritmo greedy ponto-a-ponto de `buildLateralRoute` por **reta única no eixo via mediana de X** (robusto contra outliers — não puxado por aspersor desalinhado). `routeCoords` agora sempre tem 2 pontos. **`ROUTE_BUILD_TOL_X_M` marcada DEPRECATED** em `12-premissas-...md`. **ADR-012 recebeu emenda interpretativa** (não criou ADR-016): polilinha não compensa aspersor desalinhado; aspersor fora vira blocker. **15 testes existentes ajustados** (T28-*, T45-1/3/4/9) + **11 testes novos** (T45B-1..T45B-11) em `lateral-reta.test.ts`. **Resultado empírico Projeto A:** zigue-zague eliminado em código (validado visualmente — mudança vs. imagem TASK-045); BOM R$ 226.946,41 (−18,4% vs. baseline TASK-041); MAS **blocker de eixo dispara** (28 laterais; máx 7,45 m) → PDF HTTP 422. **Esse comportamento é ESPERADO pelo briefing** (Ajuste 3: "Se aspersor ficar fora de 0,10 m do eixo → blocker; em task futura, recalcular agrupamento/orientação"). **Causa real:** Projeto A tem aspersores genuinamente desalinhados (antes mascarados pela polilinha em L da TASK-028 que foi superada por esta emenda). **TASK-046 obrigatória** para corrigir agrupamento/orientação no `findOptimalGridAngle`/`generatePhysicalColumns`. ADRs 010, 011, 013, 014, 015 preservadas; ADR-012 com emenda. Catálogo, PDF, mapa intocados.

---

### TASK-045 — Corrigir orientação profissional das laterais e eliminar zigue-zague artificial

**Status:** `parcialmente concluída` (resolveu blocker angular + PDF 200; NÃO resolveu zigue-zague visual — superseded pela TASK-045B)
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / construtibilidade
**Arquivo:** `tasks/TASK-045-corrigir-orientacao-laterais.md`
**Concluída em:** 2026-05-21 · 788/788 testes (+9 vs. 779 baseline) · 0 erros tsc · catálogo intocado
**Relatório:** `docs/relatorios/2026-05-21-TASK-045.md`

> Regressão da TASK-044 resolvida. **Duas correções:** (1) `ROUTE_BUILD_TOL_X_M = 0,05 m → 0,10 m` em `laterais.ts:221` — alinhado com `TOLERANCIA_ASPERSOR_EIXO_LATERAL` (ADR-011); elimina cotovelos espúrios na janela 0,05-0,10 m onde aspersores ficam "no eixo operacional" mas geravam zigue-zague visual. (2) Validação angular como **restrição dura no motor** (`architecture-selector.ts:evaluateCandidate`) — candidato com `detectNetworkAngleIssues.hasBlockers === true` vira `isValid: false`; alinhado com ADR-015 §3. Validação usa estrutura completa do fluxo real (principal/adutora/secondaries/physicalColumns/routeCoords). **Resultado empírico Projeto A:** BOM **R$ 277.955 → R$ 265.199 (−R$ 12.755 / −4,6%)** vs. baseline TASK-041; **0 blockers**; **PDF HTTP 200 + download** ✅; Tubo Ø100mm rígido ramais 416 → 267 barras (−R$ 32.035); Tubo LF Ø100mm = 0 (ADR-013); aspersores em kit 337/337; HMT 42,5 mca. **Não relaxou:** `ALLOWED_DEFLECTIONS_INTERNAL = [0, 90]`, tolerância angular, texto do blocker, PDF gate. **ADRs 010-015 preservadas.** **Trade-off aceito:** economia agressiva TASK-044 (−38,7%) era artificial (topologia com 3 junções 180° antiparalelo violando ADR-010); solução TASK-045 é fisicamente construível. **9 testes novos** (T45-1..T45-9) em `lateral-zigzag.test.ts`. Premissa `ROUTE_BUILD_TOL_X_M` atualizada em `12-premissas-...md`. Validação visual via Playwright executada. Próximas: (B sugerida) expor `ArchitectureSelectionResult` na sidebar; TASK-035; TASK-034.

---

### TASK-044 — Revalidação visual pós-TASK-043

**Status:** `concluída` (com regressão registrada — sugere TASK-045)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** validação / governança / hidráulica / arquitetura
**Arquivo:** `tasks/TASK-044-revalidacao-visual-pos-task-043.md`
**Concluída em:** 2026-05-21 · 779/779 testes · 0 erros tsc · `src/` não alterado
**Relatório:** `docs/relatorios/2026-05-21-TASK-044.md`

> Revalidação visual no Projeto A pós-TASK-043 via Playwright MCP. **Motor confirmado funcionando**: BOM **R$ 277.955,01 → R$ 170.263,61 (−R$ 107.691,40 / −38,7%)**; ramais **4186 → 878 m (−79%)**; Ø100mm rígido ramais **416 → 31 barras (−92,6%)**; adutora 35 → 19 barras; HMT 40,3 → 37,7 mca; Ø100mm LF mantido em 0 (ADR-013 preservada); 337/337 aspersores em kit. Clique Auto re-acionou motor (console +1 warning `[principal] Captação dentro da faixa Y`); resultado idêntico (motor determinístico). **REGRESSÃO**: blocker angular novo "Construtibilidade angular: 3 conexão(ões) com ângulo fora de 45°/90°/180° (3 em lateral)" → PDF gate 200 → **422** (gate ADR-003 funcionou; problema é o blocker). T43-8 sintético passou mas cenário real expõe edge case na interação motor ↔ detectNetworkAngleIssues ↔ split ↔ routeCoords. **Candidato vencedor: NM** (UI não expõe `ArchitectureSelectionResult`); inferência geométrica sugere arquitetura ≠ A0. **Não corrigido nesta task** (regra explícita). 13 pontos validados (CD/CS/CC/CR/IG/NM). Evidências: `docs/relatorios/evidencias/2026-05-21-TASK-044/` (4 PNGs + 7 traces). **TASK-045 (Classe A) sugerida** como prioritária para resolver regressão sem perder economia.

---

### TASK-043 — Motor de seleção arquitetural da principal/ramais por menor BOM válida e operacionalmente executável

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / hidráulica / comercial
**Arquivo:** `tasks/TASK-043-motor-selecao-arquitetural.md`
**Concluída em:** 2026-05-21 · 779/779 testes (+11 vs. 768 baseline) · 0 erros tsc · catálogo intocado
**ADR:** [`docs/decisoes/ADR-015-selecao-arquitetural-menor-bom-valida.md`](../docs/decisoes/ADR-015-selecao-arquitetural-menor-bom-valida.md)

> Motor de seleção arquitetural automático implementado em `src/lib/layout/architecture-selector.ts`. **Função objetivo:** menor BOM estimada preliminar. **Restrições duras:** hidráulica (`MAX_VELOCITY_RAMAL_MS=1,5 m/s`, `MAX_HEADLOSS_RAMAL_MCA=3,0 mca`) + ADRs 010-014. **4 candidatos avaliados:** A0 baseline (borda Y mais próxima da captação); A2-min e A2-max (borda forçada — escolhe o de menor BOM entre os dois); A3 central (`principalY = (yMin+yMax)/2`). Em empate (< R$ 1,00), prefere A0 (princípio "menor mudança"). Retorna `ArchitectureSelectionResult` com diagnóstico completo: vencedor, BOM por candidato, motivo de invalidação, motivo de escolha, warnings, diferença vs. baseline. **A3 vencedor** dispara warning obrigatório "principal central atravessa área irrigada — validar construtibilidade operacional/RT". **A1/A4/A5/A6/A7/A8** pós-MVP. Integração via `buildSelectedPipelineCoords()` em `layout-use-cases.ts`; `ProjectMap.tsx` chama em ambos os caminhos automáticos (auto-sugestão + `resetToAutoPipeline`). **Catálogo, PDF, aspersor padrão, espaçamento 12×12 intocados.** Critério L2 (vazão de projeto do ramal) mantido conservador `max(setor)` — `PENDENTE_REVISAO_RT_BRASMAQUINAS`. **11 testes novos** (T43-1..T43-11) em `architecture-selector.test.ts`. **3 premissas formalizadas** em `12-premissas-...md` (MAX_VEL_RAMAL com referência NRCS NEH; MAX_HEADLOSS_RAMAL com boa prática 10%; critério de vazão — todas `PENDENTE_REVISAO_RT_BRASMAQUINAS`; nenhum valor alterado). **ADR-015 criada.** Próximas: TASK-044 (revalidação visual) → TASK-035 → TASK-034.

---

### TASK-042R — Revisão RT da arquitetura de rede e escolha da alternativa MVP

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** E — Decisão técnica assistida / validação RT
**Área:** layout / domínio / produto / arquitetura
**Arquivo:** `tasks/TASK-042R-revisao-rt-arquitetura-rede.md`
**Concluída em:** 2026-05-21 · 768/768 testes · 0 erros tsc · `src/` não alterado · sem ADR aberto · sem premissa formalizada
**Documento (produto):** `docs/relatorios/2026-05-21-TASK-042R.md`

> **Diretriz Brasmáquinas registrada** após reformulação da decisão pelo usuário/RT: a escolha **não é binária** entre A2 e A3 (TASK-042 diagnóstico). A escolha é implementar **motor de seleção arquitetural** que avalie candidatos por **menor BOM tecnicamente válida e operacionalmente executável**. **Função objetivo = custo; restrições duras = hidráulica + construtibilidade** (rede 0°/90° conforme ADR-010; aspersor sobre lateral conforme ADR-011/012; DN100 proibido em lateral 5022 conforme ADR-013; split por capacidade preservado conforme ADR-014; montagem compreensível; sem valetas/cruzamentos absurdos). **Diretrizes L1/L2/L3:** L1 posição da principal = menor BOM válida, sem regra fixa (decisão de engenharia + comercial); L2 vazão de projeto do ramal = tecnicamente correto para operação real (rotativa simultaneidade), `PENDENTE_REVISAO_RT_BRASMAQUINAS`; L3 `MAX_VELOCITY_RAMAL_MS = 1,5 m/s` mantido como referência conservadora, origem **[FONTE-TÉCNICA]** NRCS NEH (≈ 5 ft/s tubulação plástica enterrada com válvulas), `PENDENTE_REVISAO_RT_BRASMAQUINAS` quanto a NBR brasileira específica. 7 perguntas do briefing respondidas. Escopo formal da TASK-043 detalhado em 9 sub-seções: candidatos mínimos MVP A0+A2+A3 (A1 condicional); função `selectArchitectureByBom()`; integração ao orquestrador; ADR-015; 3 premissas formais (todas para TASK-043); 8 testes obrigatórios. Linguagem oficial **BOM estimada / preliminar / de comparação** (não "BOM real" sem solver). Coerência com ADRs 010-014 verificada item por item — nenhum conflito. **Nenhum ADR aberto** nesta task; **nenhuma premissa formalizada** em `12-premissas-...md`; **nenhum arquivo em `src/` alterado**. Próximas: TASK-043 → TASK-044 → TASK-035 → TASK-034.

---

### TASK-042 — Diagnóstico profissional da arquitetura principal/ramais/laterais

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica / Diagnóstico de engenharia
**Área:** layout / domínio / produto / arquitetura
**Arquivo:** `tasks/TASK-042-diagnostico-arquitetura-principal-ramais-laterais.md`
**Concluída em:** 2026-05-21 · 768/768 testes · 0 erros tsc · `src/` não alterado
**Relatório (produto):** `docs/relatorios/2026-05-21-TASK-042.md`

> Diagnóstico técnico baseado em leitura literal do código (`principal.ts`, `secondary-sizing.ts`, `hydraulic-connectivity.ts`, catálogo). **Driver identificado:** Ø100mm rígido em ramais responde por 32% da BOM no Projeto A pós-TASK-040 (416 barras × R$ 215 = R$ 89.440). **Três alavancas ortogonais:** L1 posição da principal (atualmente borda Y mais próxima da captação — [principal.ts:103](../src/lib/layout/principal.ts#L103)); L2 vazão de projeto = `max(setor)` em todos os setores — possível over-spec; L3 `DEFAULT_MAX_VEL_MS = 1,5 m/s` em ramais — limite conservador força DN100 para Q ≥ 20 m³/h. **9 alternativas avaliadas (A0-A8)** com 7 critérios técnicos + 10 critérios complementares (construtibilidade operacional + risco comercial). **Recomendação MVP preliminar:** A2 (refinamento de A0 — escolher lado da principal por menor custo de ramal, não apenas proximidade da captação) — preserva todos os ADRs (010/011/012/013/014), complexidade baixa (~30 linhas + 3 testes), redução faixa baixa (5-10%). A3 (principal central) tem potencial alto (15-25%) mas requer decisão RT sobre valeta atravessando área irrigada. A4-A8 ficam pós-MVP. **Toda recomendação marcada `PENDENTE_REVISAO_RT_BRASMAQUINAS`.** Nenhum ADR aberto (ADR-015 fica para TASK-043). Próximas: TASK-043 (implementação) → TASK-044 (revalidação visual) → TASK-035 → TASK-034.

---

### TASK-041 — Revalidação visual pós-TASK-040

**Status:** `concluída` (aprovada — TASK-040 confirmada empiricamente)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** validação / governança / hidráulica
**Arquivo:** `tasks/TASK-041-revalidacao-visual-pos-task-040.md`
**Concluída em:** 2026-05-21 · 768/768 testes · 0 erros tsc · `src/` não alterado

> Revalidação empírica no browser real (Playwright MCP) do Projeto A (`cmpfu7e4b0001ulshh0ni8jhd`, Barreiras/BA) após a TASK-040. **TASK-040 confirmada:** (1) blocker técnico *"Lateral hidraulicamente insuficiente"* **AUSENTE** ✅ (era presente com 8 colunas excedendo DN75 na TASK-039); (2) **PDF gate liberado — HTTP 200 + download automático** ✅ (era HTTP 422 na TASK-039); (3) Tubo LF Ø100mm = **0 barras** ✅ (ADR-013 preservada); (4) DN50/DN75 únicos em lateral 5022 (74 + 852 barras); (5) 337/337 aspersores em kit homologado; (6) 0 blockers angulares novos apesar dos +8 ramais do split; (7) HMT 40,7 → 40,3 mca (−0,4 mca; coerente com colunas mais curtas). **Custo:** BOM total R$ 226.724,81 → R$ 277.955,01 (+R$ 51.230 / +22,6%); maior driver: Ø100mm rígido em ramais (416 barras × R$ 215 = R$ 89.440 = 32% da BOM). 29 ramais × 4186 m. 12 achados (H1–H12): TASK-042 reforçada para investigar arquitetura (alimentação intermediária, redistribuição da principal). 13 pontos validados (8 CD + 2 CS + 2 IA + 2 NM). Série TASK-027 → TASK-033 → TASK-039 → TASK-041 completa: caminho feliz default emite PDF pela primeira vez. Evidências: `docs/relatorios/evidencias/2026-05-21-TASK-041/` (3 PNGs + PDF emitido + traces). Relatório: `docs/relatorios/2026-05-21-TASK-041.md`.

---

### TASK-040 — Revisar geração default da grade para projetos densos

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / hidráulica
**Arquivo:** `tasks/TASK-040-revisar-geracao-default-grade-projetos-densos.md`
**Concluída em:** 2026-05-21 · 768/768 testes (+9 vs. 759 baseline) · 0 erros tsc · catálogo intocado
**Absorveu:** escopo "algoritmo da grade" da TASK-032

> Implementado split automático por capacidade hidráulica em `generatePhysicalColumns()`. Quando uma coluna excede DN75, a coluna é dividida em sub-colunas via bisseção recursiva (`splitByCapacity`) — parada quando `selectLateralTube` retorna `ok: true` em cada sub-coluna. **Sem n_max hardcoded** (ajuste 1): usa capacidade hidráulica real, escalável para outros aspersores/catálogos. **Split mínimo necessário** (ajuste 2). Rastreabilidade via `originalColumnIndex` + `splitIndex` em `PhysicalColumn` (ajuste 3). Cada sub-coluna ganha ramal automaticamente via `generateSecondaries` (1-por-coluna). Catálogo `TUBOS_PVC_LF` global **intocado**; DN100 continua proibido para lateral 5022 (TASK-031 preservada); `routeCoords` preservado em cada sub-lateral (TASK-028 preservada). Blocker técnico permanece como fallback (T40-4 valida cenário patológico: vazão extrema 50 m³/h/asp). 9 testes novos em `grid-split-density.test.ts`. T31-4/5/6/8 reescritos para refletir split automático. Endereça H5/H6 da TASK-039.
>
> **Atenção estratégica:** TASK-040 resolve a capacidade hidráulica **local** da lateral, mas **NÃO encerra a discussão sobre arquitetura profissional da rede**. A solução adotada (mais ramais) pode não ser o ótimo em todos os contextos. **TASK-042** investigará alternativas (alimentação intermediária, redistribuição da principal, rebalanceamento de setores, mudança de orientação).
>
> **ADR:** [ADR-014 — Split automático por capacidade hidráulica da lateral](../docs/decisoes/ADR-014-split-automatico-capacidade-hidraulica-lateral.md) (criada em 2026-05-21)
>
> **Pendências:**
> - **TASK-041 (obrigatória)** — Revalidação visual pós-TASK-040
> - **TASK-042 (estratégica)** — Diagnóstico profissional da arquitetura principal/ramais/laterais

---

### TASK-031 — Revisar geração default de grade vs. laterais homologadas

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** domínio / hidráulica / catálogo / governança
**Arquivo:** `tasks/TASK-031-revisar-geracao-default-grade-laterais-homologadas.md`
**Concluída em:** 2026-05-21 · 759/759 testes (+12 vs. 747 baseline) · 0 erros tsc · catálogo intocado
**Absorve:** TASK-025 (marcada `superseded` em 2026-05-21)

> Seleção hidráulica de laterais agora restrita ao subset DN50/DN75 (homologadas para aspersor 5022) via `getCatalogoLateraisHomologadas5022()` em `laterais.ts` — função exportada com nome explícito; catálogo global `TUBOS_PVC_LF` permanece com DN50/DN75/DN100. `selectLateralTube` retorna `lateralCapacity: { ok, reason?, hfM, velMs }`; quando DN75 não atende, mantém DN75 como tubo (solver continua rodando) mas `ok: false` aciona blocker técnico em `generateProposalDiagnostics` com texto: *"Lateral hidraulicamente insuficiente para o aspersor 5022: o maior DN homologado para lateral é DN75, mas N coluna(s)/trecho(s) excedem perda de carga ou velocidade admissível..."* + 5 ações sugeridas. Blocker antigo da TASK-023 *"BOM incompleta — DN não homologado para kit 5022"* preservado como defesa (T31-7 confirma silêncio no caminho normal). 12 testes novos em `lateral-capacity.test.ts` pela superfície pública (não `selectLateralTube` privada). Endereça G2/G3 da TASK-033. Relatório: `docs/relatorios/2026-05-21-TASK-031.md`.
>
> **ADR:** [ADR-013 — Restrição de DN homologado por aspersor via subset filtrado](../docs/decisoes/ADR-013-restricao-dn-homologado-aspersor-subset-filtrado.md) (criada em 2026-05-21)
>
> **Pendências:**
> - TASK-039 (sugerida) — Revalidação visual no Projeto A real via Playwright MCP para medir BOM efetiva

---

### TASK-033 — Revalidação visual pós-TASK-028

**Status:** `concluída` (aprovada)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** validação / governança / ui
**Arquivo:** `tasks/TASK-033-revalidacao-visual-pos-task-028.md`
**Concluída em:** 2026-05-21 · 747/747 testes · 0 erros tsc · `src/` não alterado

> Revalidação no browser real (Playwright MCP) do Projeto A da TASK-027 (`cmpfu7e4b0001ulshh0ni8jhd`, Barreiras/BA) após a TASK-028. **Blocker "Aspersor fora do eixo da lateral física" eliminado** (antes: 21 laterais, desvio máx 7,00 m; agora: ausente). Sidebar passou de 2 blockers + 5 avisos para 1 blocker + 6 avisos; BOM total cresceu R$ 207.952 → R$ 257.089 (+23,6%) — efeito esperado das dobras 90° nas polilinhas; tubo LF Ø100mm subiu 385 → 625 barras. HMT 39,1 → 40,7 mca (novo aviso PN/HMT). Nenhum blocker angular novo (ajuste em `network-angle-diagnostics` da TASK-028 funcionou). PDF gate 422 funciona; F1 da TASK-027 (sem feedback UI) persiste — endereçado por TASK-034. 8 achados (G1–G8): G2/G3 → TASK-031, G5 → TASK-035, G6 → TASK-034. Evidências: `docs/relatorios/evidencias/2026-05-21-TASK-033/` (4 PNGs + 14 traces). Relatório: `docs/relatorios/2026-05-21-TASK-033.md`. Sub-itens da TASK-033 ampla original (TASK-014/007/cenário limpo) → TASK-036/037/038.

---

### TASK-028 — Corrigir geração automática da lateral física sobre os aspersores

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio
**Arquivo:** `tasks/TASK-028-corrigir-geracao-lateral-fisica-sobre-aspersores.md`
**Concluída em:** 2026-05-21 · 747/747 testes (+9 vs. 738 baseline) · 0 erros tsc · catálogo intocado

> `PhysicalColumn` e `Lateral` ganharam campo obrigatório `routeCoords: [number, number][]`. Nova função `buildLateralRoute()` em `laterais.ts` constrói polilinha 0°/90° em frame local rotacionado, garantindo que cada aspersor fica em um vértice e que o primeiro segmento é sempre vertical (preservando contrato de `network-angle-diagnostics`). `generatePhysicalColumns()` e `deriveLateraisFromNetwork()` populam `routeCoords` — esta última reconstrói a rota do **subset operacional** (não copia a rota completa da coluna). `maxSprinklerAxisDeviationM()` mede distância à polilinha; fallback para reta `start→end` quando `routeCoords` ausente. `network-angle-diagnostics.ts` usa primeiro/último segmento real da rota ao calcular vetor da lateral no inlet. `ProjectMap.tsx` consome `col.routeCoords` (mudança 2 linhas, permitida pela regra). Cenário F7 sintético da TASK-027 (S-suave ±0,4 m) deixou de gerar blocker. Blocker `"Aspersor fora do eixo da lateral física"` em `bom.ts:976` **preservado** com texto e severidade inalterados, disparável via fallback (T28-6). Nova premissa documentada: `ROUTE_BUILD_TOL_X_M = 0,05 m`. Relatório: `docs/relatorios/2026-05-21-TASK-028.md`.
>
> **ADR:** [ADR-012 — Lateral física como polilinha construtível 0°/90°](../docs/decisoes/ADR-012-lateral-fisica-polilinha-construtivel-0-90.md) (criada em 2026-05-21)
>
> **Pendências:**
> - TASK-035 — BOM de curvas 90° em laterais com `routeCoords` (dobras introduzidas pela rota não são contadas hoje)
> - Revalidação visual via Playwright MCP no Projeto A da TASK-027 (Barreiras/BA) — concluída pela TASK-033 (G1 confirmou desaparecimento dos 21 blockers de eixo)

---

### TASK-027 — Validação prática no browser do fluxo de projeto

**Status:** `concluída` (aprovada com ressalvas)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** ui / validação / governança
**Arquivo:** `tasks/TASK-027-validacao-browser-fluxo-projeto.md`
**Concluída em:** 2026-05-21 · 738/738 testes · 0 erros tsc · `src/` não alterado

> Primeira validação visual formal de múltiplos épicos do MVP, executada via Playwright MCP (`@playwright/mcp@latest`, escopo `user` em `~/.claude.json`) no Chromium controlado. Projeto fictício "TASK-027 A" criado em Barreiras/BA (4.87 ha, 337 aspersores 5022-SD, 21 setores @ jornada 21h, BOM R$ 207.952,11). Cenários 2 (com blocker), 3 (mobile 375×812) e 4 (gate PDF 422) cobertos integralmente; Cenário 5 (mapa/labels) parcial (WebGL não DOM); Cenário 1 (limpo) não coberto — fluxo default gerou 2 blockers naturalmente. 7 achados: F1 (PDF sem feedback UI após 422 — Alto), F2 (drawer mobile não vai ao topo, blockers em y=-1068 — Alto), F3/F4/F5 (toolbar/zoom/PDF mobile < 44×44 — Médio/Baixo), F6 (caminho feliz default gera blockers — Médio), F7 (tolerância 0.1 m vs. desvio 7.00 m — Médio). Relatório: `docs/relatorios/2026-05-21-TASK-027.md`. Evidências (11 PNGs + traces): `docs/relatorios/evidencias/2026-05-21-TASK-027/`.
>
> **Pendências geradas (próximas tasks sugeridas):**
> - TASK-028 (A) — Corrigir geração automática da lateral física sobre os aspersores — **concluída em 2026-05-21**
> - TASK-029 (A) — Drawer mobile: scrollTop=0 ou auto-scroll até blockers ao abrir
> - TASK-030 (B) — Áreas clicáveis ≥ 44×44 em mobile (toolbar, zoom, PDF)
> - TASK-031 (A) — Revisar geração default de grade vs. laterais homologadas — **concluída em 2026-05-21** (absorveu TASK-025)
> - TASK-032 (D) — Calibrar tolerância do gate "aspersor sobre lateral" — **escopo "algoritmo da grade" absorvido pela TASK-040** (decisão administrativa de 2026-05-21). Escopo remanescente: apenas calibração da tolerância, se ainda fizer sentido após TASK-040.
> - TASK-033 (E) — Revalidação visual pós-TASK-028 — **concluída em 2026-05-21**
> - TASK-034 (A) — Feedback visual no clique do PDF com blockers ativos
> - TASK-035 (A) — BOM de curvas 90° em laterais com routeCoords (decorrente da TASK-028)
> - TASK-036 (E) — Validação visual de labels de setor em 2/3/4 setores (TASK-014)
> - TASK-037 (E) — Validação de busca por endereço/coordenadas (TASK-007)
> - TASK-038 (E) — Validação visual do cenário 1 limpo / caminho feliz
> - TASK-039 (E) — Revalidação visual pós-TASK-031 — **concluída em 2026-05-21**
> - TASK-040 (A) — Revisar geração default da grade para projetos densos — **concluída em 2026-05-21** (split automático por capacidade hidráulica em `generatePhysicalColumns`)
> - TASK-041 (E) — Revalidação visual pós-TASK-040 (obrigatória; medir antes/depois no Projeto A real)
> - TASK-042 (D) — Diagnóstico profissional da arquitetura principal/ramais/laterais (estratégica; alternativas a "mais ramais")

---

### TASK-026-A — Investigar `generateSecondaries` com layout sintético válido

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** D — Correção rápida, com regra de escalada obrigatória (mantida — sem escalada)
**Área:** layout / hidráulica / domínio (investigação)
**Arquivo:** `tasks/TASK-026-A-investigar-generate-secondaries-layout-sintetico.md`
**Concluída em:** 2026-05-21 · 738/738 testes · 0 erros tsc · `src/` não alterado

> Investigação da causa-raiz dos achados A-1 ("`distribution.secondaries = 0`") e A-2 ("HMT undefined") do relatório da TASK-026. Reconstrução fiel do fixture sintético (Variant A — pipeline N-S, 4 col × 8 row, 12 m, 1 espaçamento a oeste da coluna 0) via teste temporário em `tmp/` + config Vitest dedicado, ambos apagados antes da validação final.
>
> **Causa-raiz identificada — falso positivo de instrumentação:**
> - `generateSecondaries` retorna **4 ramais** (lengths 12, 24, 36, 48 m) no cenário fiel — não 0. `result.distribution.secondaries.length === 4`. A-1 **não é reproduzível**.
> - O HMT correto está em `result.hydraulics.hmt.totalHMT` (campo de `HMTBreakdown` em `hydraulic-sizing.ts:140-149`). O campo `hmtMca` não existe em `HMTBreakdown` — existe apenas em `ProjectLayout.pump` (entrada do usuário). O agente da TASK-026 leu `hmt.hmtMca` → sempre `undefined` → falso achado A-2. Solver computou `totalHMT = 37,11 mca` corretamente.
>
> **Sem alteração em motor.** Nenhum arquivo em `src/` foi modificado. TASK-026-B permanece um gate defensivo válido (usa `hmt.totalHMT` corretamente em `bom.ts:1020-1023`). Erratum registrado no relatório `docs/relatorios/2026-05-21-TASK-026-A.md`.

---

### TASK-026-B — Bloquear emissão quando HMT ou cálculo hidráulico essencial estiver indefinido

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** governança / pdf / hidráulica
**Arquivo:** `tasks/TASK-026-B-bloquear-emissao-hmt-incompleta.md`
**Concluída em:** 2026-05-21 · 738/738 testes (731 + 7 novos) · 0 erros tsc

> Derivada do achado A-2 da TASK-026. Adicionado gate em `generateProposalDiagnostics()` (em `src/lib/bom.ts`) que produz blocker quando o projeto está completo (`isComplete=true`) mas a hidráulica essencial está ausente, inválida ou estruturalmente inconsistente. Dois blockers novos: (1) `Cálculo hidráulico incompleto: HMT total não computada ou inválida...` quando `hydraulics === null` ou `totalHMT` é NaN/Infinity/≤0; (2) `Cálculo hidráulico incompleto: N coluna(s) física(s) sem ramal correspondente na distribuição...` quando `physCols > 0 && sizedSecondaries.length === 0`. `pdfEmissionBlockers()` permanece passthrough puro. Otimizer de layout teve filtro estendido para também ignorar esses blockers (mesma lógica do filtro "BOM incompleta" existente — blockers de cálculo incompleto não são violações hidráulicas reais). 7 testes novos em `pdf-emission-hmt-gate.test.ts` (T26B-a..g). Causa-raiz (`generateSecondaries` retornando vazio) NÃO foi corrigida — pertence à TASK-026-A.
>
> **Pendências:**
> - TASK-026-A — investigação de `generateSecondaries` retornando vazio para layout sintético válido

---

### TASK-026 — Validação sintética simples e com blocker

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Classe:** E — Exploratória
**Área:** governança / qualidade
**Arquivo:** `tasks/TASK-026-validacao-sintetica-simples-e-blocker.md`
**Concluída em:** 2026-05-21 · 731/731 testes · 0 erros tsc (nenhum arquivo em `src/` alterado)

> Passos 1 e 2 do roteiro mínimo da TASK-024D executados via chamada direta ao orquestrador `calculateIrrigationProject()` em arquivo de teste temporário (apagado após conclusão). Cenário 1 (sem bomba): isComplete=true, 4 colunas DN50, BOM sem pendente de aspersor, PDF seria emitido. Cenário 2 (bomba insuficiente): blocker de bomba gerado com texto legível e acionável, PDF bloqueado. Achados: (A-1) `distribution.secondaries=0` para layout válido → HMT undefined — investigação pendente (TASK-026-A, Classe D/A); (A-2) design gap — HMT undefined não gera blocker em `pdfEmissionBlockers` (TASK-026-B, Classe A); (A-3) DN50 para 12 m³/h é tecnicamente válido (V≈2,0 m/s). Relatório: `docs/relatorios/2026-05-21-TASK-026.md`.

---

### TASK-051 — Adicionar aria-expanded ao toggle do drawer mobile

**Status:** `concluída`
**Prioridade:** P3-melhoria (acessibilidade)
**Classe:** D — correção pequena / acessibilidade / UI
**Área:** ui / mapa / acessibilidade
**Arquivo:** `tasks/TASK-051-aria-expanded-drawer-mobile.md`
**Concluída em:** 2026-05-22 · 826/826 testes preservados · 0 erros tsc · `src/lib/**` intocado · escopo ~5 linhas em `src/`

> Resolve o **achado H1 da TASK-048** (toggle do drawer mobile sem `aria-expanded`). Edição cirúrgica em `src/components/map/ProjectMap.tsx`: 3 atributos ARIA no botão (`aria-expanded={sidebarOpen}`, `aria-controls="project-layout-drawer"`, `aria-label` dinâmico alternando entre "Abrir..." / "Fechar painel de layout do projeto") + `id="project-layout-drawer"` no `<aside>`. Validação Playwright (mini sessão, viewport mobile 375×812): 8/8 verificações PASS — botão e drawer existem; `aria-expanded` alterna de `"false"` → `"true"` ao clicar; `aria-label` muda dinamicamente; `aria-controls` preservado; `#project-layout-drawer` acessível por id. 2 PNGs em `docs/relatorios/evidencias/2026-05-22-TASK-051/`. Nenhuma lógica de domínio adicionada. Nenhum arquivo em `src/lib/**`, catálogo, BOM, PDF, Mapbox/canvas/layers tocado. Nenhuma dependência npm nova. Histórico do H1 preservado na TASK-048 como rastro do ciclo descoberta → resolução. Relatório: `docs/relatorios/2026-05-22-TASK-051.md`.

---

### TASK-050 — Reexecutar cenários 2–5 da TASK-048 com fixtures E06

**Status:** `concluída` — **6/6 cenários PASS**
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** ui / validação / governança
**Arquivo:** `tasks/TASK-050-reexecucao-browser-fixtures-e06.md`
**Concluída em:** 2026-05-22 · 826/826 testes preservados · 0 erros tsc · `src/` não alterado · fixtures não alterados · Projeto A não alterado

> Sessão Playwright MCP cobrindo 6 cenários de E06 usando os 4 fixtures plantados pela TASK-049. **Resultado 6/6 PASS:** (1) Listagem `/projetos` com 5 projetos (Projeto A + 4 fixtures); (2a) `fixture-e06-blocker` exibe blocker vermelho "Bomba insuficiente em vazão: 5.0 m³/h < setor crítico 25.5 m³/h"; (2b) clique PDF → `POST .../pdf → 422` + UI exibe "PDF bloqueado" + "BLOQUEIOS ATIVOS" detalhado (equivalência semântica de `pdfError.invalidHydraulicSegments` confirmada); (3) `fixture-e06-9setores` com 38 asp/setor (=round(344/9)) × 1,5 m³/h = 57,0 m³/h ✓; (4) `fixture-e06-14setores` com 25 asp/setor × 1,5 = 37,5 ✓; (5) `fixture-e06-21setores` com 16 asp/setor × 1,5 = 24,0 ✓. BOM recalculou automaticamente em runtime (fixture 9 setores trouxe Ø150mm rígido principal — comportamento esperado). **E06 PROMOVIDO** de `Testado em código` → `Validado visualmente no Projeto A + fixtures E06 — caso único`. Conservadorismo mantido pela ressalva "caso único" (fixtures são artefatos fictícios; não substitui projeto histórico real, piloto interno ou homologação RT). Nenhum bug encontrado. Achados positivos O1-O3 documentados. H1 (aria-expanded do drawer) permanece pendente Classe D futura. 6 PNGs em `docs/relatorios/evidencias/2026-05-22-TASK-050/`. Relatório: `docs/relatorios/2026-05-22-TASK-050.md`.

---

### TASK-049 — Criar fixtures de validação visual para E06

**Status:** `concluída` (com adaptação documentada — jornadas 9/14/21 em vez de 2/3/4)
**Prioridade:** P2-importante
**Classe:** B — Importante
**Área:** infraestrutura / fixtures / governança
**Arquivo:** `tasks/TASK-049-fixtures-validacao-visual-e06.md`
**Concluída em:** 2026-05-22 · 826/826 testes preservados · 0 erros tsc · `src/` não alterado · Projeto A não alterado · `package.json` não alterado

> Criado script standalone `scripts/seed-e06-fixtures.ts` + documentação `scripts/README.md`. Script lê o Projeto A (`cmpfu7e4b0001ulshh0ni8jhd`) read-only via `findUnique`, faz snapshot de `updatedAt`, usa `data`+`ownerId` como template e grava 4 fixtures via `prisma.project.upsert` por ID explícito. **Restrição estrutural descoberta durante a implementação** (parei e reportei via AskUserQuestion antes de gravar qualquer fixture): `setoresCount === jornadaHoras` ([line 154](../src/lib/layout/layout-use-cases.ts#L154)) e `jornadaHoras: 9 | 14 | 21` ([line 89](../src/app/projetos/[id]/layout-schema.ts#L89)) — logo, fixtures "2/3/4 setores" são impossíveis sem alterar `src/`. Usuário escolheu opção A (trocar para jornadas 9/14/21). Resultado: `fixture-e06-blocker` (bomba `hmtMca:5,vazaoMaxM3h:5` → blocker `pump_insufficient_head` real, confirmado via `calculateIrrigationProject`), `fixture-e06-9setores` (setoresCount=9 exato), `fixture-e06-14setores` (=14 exato), `fixture-e06-21setores` (=21 exato). Validações pré-gravação via orquestrador (blocker presente quando esperado; setoresCount = alvo). Validação pós-gravação: Projeto A `updatedAt` idêntico ao snapshot (assert no script com rollback automático em caso de divergência). `--clean` testado: remove só os 4 IDs whitelisted, Projeto A preservado. ownerId dos fixtures = ownerId do Projeto A (visibilidade garantida em `/projetos`). Nenhuma alteração em `src/`, catálogo, PDF, mapa, orquestrador, ADR, premissa, schema Prisma, migração, `package.json`. Relatório: `docs/relatorios/2026-05-22-TASK-049.md`. **Não promove E06 — depende da TASK-050 sugerida.**

---

### TASK-048 — Validação browser TASK-021 / TASK-014

**Status:** `concluída` (parcial — 2 cenários PASS, 4 NÃO EXECUTADOS por limitação ambiental)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** ui / validação / governança
**Arquivo:** `tasks/TASK-048-validacao-browser-task-021-014.md`
**Concluída em:** 2026-05-22 · 826/826 testes preservados · 0 erros tsc preservado · `src/` não alterado · banco do Projeto A não alterado

> Sessão Playwright MCP no Projeto A (`cmpfu7e4b0001ulshh0ni8jhd`) cobrindo 6 cenários de E06. **Cenário 1 (drawer mobile)** e **Cenário 6 (coluna fragmentada — 17 laterais divididas confirmadas via DOM regex + screenshot)** classificados como **PASS**. **Cenários 2-5 (pdfError + labels 2/3/4 setores) classificados como NÃO EXECUTADOS** por 3 limitações ambientais combinadas: (L1) Projeto A está em 0 blockers pós-TASK-046 — proibido alterá-lo; (L2) apenas 1 projeto existe no banco — proibido alterar `jornadaHoras` do Projeto A para forçar setorização variável; (L3) criar projeto fictício via `/projetos/novo` esbarra no canvas Mapbox WebGL, que não aceita cliques precisos via Playwright para desenhar polígono e captação. **E06 NÃO promovido** — permanece `Testado em código` no Mapa Mestre conforme regra conservadora do briefing. 4 achados: H1 (menor — toggle do drawer sem `aria-expanded`); H2 (processo — ambiente requer fixtures pré-criadas); H3 (infraestrutura — Mapbox WebGL bloqueia automação de desenho); H4 (confirmação positiva do Cenário 6). 3 follow-ups sugeridos: (1) seed de fixtures via Prisma para desbloquear Cenários 2-5; (2) re-execução de TASK-048 cenários 2-5 após fixtures; (3) adicionar `aria-expanded` ao toggle (Classe D, ≤ 5 linhas). 6 PNGs em `docs/relatorios/evidencias/2026-05-22-TASK-048/`. Relatório: `docs/relatorios/2026-05-22-TASK-048.md`. Nenhuma alteração em `src/`, catálogo, PDF, mapa, ADRs, premissas ou banco do Projeto A.

---

### TASK-047 — Diâmetros individuais de ramais no PDF

**Status:** `concluída`
**Prioridade:** P2-importante
**Classe:** B — Importante
**Área:** pdf / proposta
**Arquivo:** `tasks/TASK-047-diametros-ramais-pdf.md`
**Concluída em:** 2026-05-22 · 826/826 testes (+9 vs. 817 baseline) · 0 erros tsc · catálogo intocado · orquestrador intocado

> Adicionada ao Memorial Hidráulico do PDF (Página 3) a seção **"Dimensionamento dos ramais"** com 7 colunas: Ramal, SKU, DN, Comprimento, Velocidade, Hf, Status. Fonte exclusiva: `result.hydraulics?.sizedSecondaries` (já calculados desde HIST-002). Helper puro `mapSizedSecondariesToRows()` em `src/lib/pdf/secondary-rows.ts` mantém `PropostaPDF.tsx` livre de lógica de domínio — apenas formata, ordena (por id numérico/natural) e rotula. Status `ok` exibido discreto (cinza); demais valores do enum (`velocity_exceeded`, `headloss_exceeded`, `both_exceeded`, `fallback_largest`) exibidos como warning âmbar com texto descritivo. Quando `sizedSecondaries` está vazio ou ausente, a seção é omitida — sem erro, sem warning, sem blocker novo. Inconsistência tratada antes da implementação: briefing original sugeria `distribution.sizedSecondaries`, mas o campo vive em `HydraulicSizingReport` — caminho real confirmado pelo usuário (opção A do plano). 9 testes novos em `src/lib/pdf/__tests__/secondary-rows.test.ts` (T47-1..T47-9) cobrindo todos os 5 valores do enum + caso vazio + mapeamento completo + ordenação determinística + função pura (sem mutação). Orquestrador, solver, dimensionamento de ramais, catálogo, gate HTTP 422, mapa UI, ADRs e premissas técnicas intocados. Relatório: `docs/relatorios/2026-05-22-TASK-047.md`.

---

### TASK-024E — Padronizar épicos como blocos de valor verificáveis

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Classe:** C — Documental
**Área:** governança / rastreabilidade / metodologia
**Arquivo:** `tasks/TASK-024E-padronizar-epicos-blocos-valor-verificaveis.md`
**Concluída em:** 2026-05-22 · 817/817 testes preservados · 0 erros tsc preservado · nenhum arquivo em `src/` alterado

> Adicionada ao Mapa Mestre a **Seção 2 — "Épicos como blocos de valor verificáveis"** com 9 sub-seções (E01..E09), cada uma contendo 11 campos padronizados: Propósito, Capacidade entregue, Escopo, Fora do escopo, Critérios de aceite, Métricas, Dependências, Decisões (em 4 categorias: Regra técnica / Boa prática / Decisão de engenharia / Decisão comercial), Riscos, Status real e Tasks vinculadas. Status real conservador: E02/E04/E05/E07 promovidos para "Validado visualmente no Projeto A — caso único" com base estrita no relatório TASK-046; E03/E06 permanecem "Testado em código"; E08 e E09 permanecem "Não iniciado" (E09 com nuance "parcial em validação interna"). Renumeração das Seções 2..11 → 3..12 e sub-seções 8.x → 9.x e 10.x → 11.x; referências cruzadas externas ajustadas onde apontam para o Mapa Mestre (`backlog.md` linha da TASK-024B, `TASK-024D-...md` rastreabilidade). Relatórios históricos TASK-024B/C/D preservados. Nenhum arquivo em `src/`, catálogo, PDF, mapa UI, ADR ou premissa técnica alterado. Relatório: `docs/relatorios/2026-05-22-TASK-024E.md`.

---

### TASK-024D — Matriz de validação por épico antes da proposta real

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Classe:** C — Documental
**Área:** governança / qualidade
**Arquivo:** `tasks/TASK-024D-matriz-validacao-epicos-mvp.md`
**Concluída em:** 2026-05-21 · 731/731 testes · 0 erros tsc (nenhum arquivo em `src/` alterado)

> Criada a matriz de validação por épico (tipo de teste, evidência, critério, responsável) e o roteiro mínimo de 6 passos antes da primeira proposta real (fictício simples, fictício com blocker, projeto histórico, validação visual, PDF simulado, revisão interna). Regra central estabelecida: a primeira proposta a cliente NÃO deve ser a primeira validação do sistema. Escala de maturidade revisada para 7 níveis, adicionando "Validado em simulação sintética", "Validado em projeto histórico" e "Validado em piloto interno". Passos 1, 2 e 4 do roteiro podem ser executados imediatamente; passos 3, 5 e 6 aguardam TASK-025 e diâmetros de ramais no PDF.

---

### TASK-024C — Auditoria de conclusão dos épicos do MVP

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Classe:** C — Documental
**Área:** governança / rastreabilidade
**Arquivo:** `tasks/TASK-024C-auditoria-conclusao-epicos-mvp.md`
**Concluída em:** 2026-05-21 · 731/731 testes · 0 erros tsc (nenhum arquivo em `src/` alterado)

> Auditoria dos 9 épicos do Mapa Mestre contra escala de 7 níveis de maturidade (Não iniciado → Homologado Brasmáquinas). Resultado: todos os 7 épicos do MVP obrigatório em "Testado em código" ou abaixo. Nenhum atingiu "Validado visualmente" de forma documentada. Achado principal: a primeira proposta a cliente real será o primeiro projeto piloto (E09) e a primeira validação visual documentada de múltiplos épicos — deve ser tratada como evento formal de validação.

---

### TASK-024B — Classificação operacional de tasks

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Classe:** C — Documental
**Área:** governança / metodologia
**Arquivo:** `tasks/TASK-024-mapa-mestre-tasks.md` (seção 8)
**Concluída em:** 2026-05-21 · 731/731 testes · 0 erros tsc (nenhum arquivo em `src/` alterado)

> Adicionada ao Mapa Mestre a seção 9 de classificação operacional (renumerada de 8 → 9 após TASK-024E). Cinco classes (A–E) com critério objetivo binário e fluxo recomendado distinto. Regra de escalada para D e E. Classificação aplicada às próximas 5 tasks do backlog. Objetivo: evitar que tarefas documentais, explorações e correções rápidas sigam o fluxo pesado das tasks críticas.

---

### TASK-024 — Mapa Mestre de Tasks do Motor de Aspersão Convencional

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Área:** governança / rastreabilidade
**Arquivo:** `tasks/TASK-024-mapa-mestre-tasks.md`
**Concluída em:** 2026-05-21 · 704/704 testes · 0 erros tsc (nenhum arquivo em `src/` alterado)

> Auditoria de backlog, relatórios, ADRs e premissas provisórias. Produto: mapa de 9 épicos com tasks concluídas e futuras classificadas, separação MVP obrigatório / desejável / pós-MVP, critério objetivo de fim de MVP (6 condições verificáveis), lista "não fazer agora" com 12 itens, e próximas 5 tasks recomendadas em ordem. Único bloqueio crítico identificado: TASK-023 (catálogo tê aspersor→lateral + curva 45° adutora).

---

### TASK-025 — Restringir seleção hidráulica de laterais a DN50/DN75 _(superseded)_

**Status:** `superseded` pela TASK-031 (2026-05-21)
**Prioridade original:** P2-importante
**Classe original:** A — Crítica
**Área original:** domínio / hidráulica / catálogo
**Arquivo:** não criado — escopo absorvido por `tasks/TASK-031-revisar-geracao-default-grade-laterais-homologadas.md`

> **Superseded.** O escopo desta task — restringir seletor hidráulico de laterais a DN50/DN75 e gerar blocker quando não atender — foi absorvido pela TASK-031, que amplia a investigação para a causa-raiz do crescimento da BOM (+23,6%) e do tubo Ø100mm LF (+240 barras) identificados na TASK-033. TASK-031 mantém todas as restrições e critérios técnicos originais de TASK-025 e acrescenta análise da geração default.
>
> **Decisão administrativa:** 2026-05-21 — pelo usuário; registrada na abertura da TASK-031.

---

## Tarefas de tooling (TOOL)

> Trilha paralela para tarefas de governança e infraestrutura de desenvolvimento — não tocam código de produto. Usam o mesmo fluxo `/iniciar-task → /planejar → /implementar → /fechar-task`.

### TOOL-003 — Reduzir copy/paste com comando de GPT Review pós-handoff

**Status:** `aguardando_fechamento` (terminal estável; aguarda aprovação humana de commit/push)
**Prioridade:** P2-importante
**Classe:** A — Governança / tooling / DX
**Área:** tooling / handoff / DX
**Arquivo:** `tasks/TOOL-003-gpt-review-pos-handoff.md`
**Concluída em:** 2026-05-22 · baseline preservado (`src/` não alterado) · produto intocado
**Relatório:** `docs/relatorios/2026-05-22-TOOL-003.md`

> Elimina o copy/paste manual entre Claude Code (VS Code) e GPT (ChatGPT) durante o ciclo de revisão LLM pós-handoff, mantendo **dois comandos seguros e modulares**: (1) `/handoff-claude-report TASK-XXX` (já existente — TOOL-001) e (2) `/gpt-review TASK-XXX` (novo). O novo comando orquestra sequencialmente: `run-gpt-review.mjs` (chamada real à Responses API) → `validate-structure.mjs` (read-only) → `print-review-summary.mjs` (resumo executivo no terminal). Aborta cedo se `ai/claude-report.md` ausente, desatualizado ou com `task_id` divergente — evitando custo de API desperdiçado. Sem retry automática; sem cap automático de custo (Fase 2). CLI novo `scripts/ai/print-review-summary.mjs` é testável standalone com 7 cenários (T20–T26) cobrindo aprovado, ausência, divergência, blockers, invariante violada, telemetria zerada e argumento ausente. Tooling tests subiram de 20/20 para **27/27**. `npx tsc --noEmit` → 0 erros (preservado). **Nenhum arquivo de produto alterado** (`src/**`, motor hidráulico, layout, catálogo, BOM, PDF, UI/mapa intocados). **Nenhuma aprovação humana automatizada**: `decision-log.md` permanece append-only e editado apenas pelo humano; `current-task.md.status` não é transicionado pelo comando. Conflito de naming com TOOL-002 (que reservara TOOL-003 para captura de `response.usage`) resolvido: orquestração = TOOL-003; captura de `usage` = **TOOL-004 futura**. Limitação V1 herdada (tokens/custo zerados no JSON do modelo) explicitamente documentada no resumo terminal e em `ai/README.md`.

---

### TOOL-002 — Homologar fluxo real Claude Code ↔ GPT Reviewer

**Status:** `concluída`
**Prioridade:** P2-importante
**Classe:** A — Governança / tooling / metodologia
**Área:** tooling / governança / handoff
**Arquivo:** `tasks/TOOL-002-homologar-fluxo-real-gpt-reviewer.md`
**Concluída em:** 2026-05-22 · baseline preservado (`src/` não alterado) · produto intocado
**Veredito GPT:** `aprovado_com_ajustes` · **Decisão humana:** `aprovado_com_ajustes` (sem override)

> Homologação **end-to-end** do pipeline real Claude Code ↔ GPT Reviewer. **Primeira chamada real à Responses API** (modelo `gpt-5.5`) bem-sucedida (HTTP 200 após ajuste de billing na 2ª tentativa); `ai/gpt-review.md` regenerado com JSON canônico válido; `validate-structure --task TOOL-002` retornou **OK** (com 1 WARN não-bloqueante sobre `override_permitido` declarado=true vs derivado=null — não-bloqueante porque 0/7 invariantes foram violadas). Decisão humana registrada em `ai/decision-log.md` (append-only) com hash sha256 correto. 3 blockers metodológicos/técnicos apontados pelo GPT (BLK-MET-001 escopo de `tasks/backlog.md`, BLK-MET-002 separação de fases, BLK-TEC-001 contagem hardcoded de testes) **todos aplicados na Fase 5**. Pendência R1 da TOOL-001 ("primeira chamada real ainda não executada") RESOLVIDA. Limitação V1 descoberta e documentada: `tokens_prompt`, `tokens_completion` e `custo_estimado_usd` vieram zerados no JSON canônico (declarados pelo próprio modelo, não capturados de `response.usage` da API); referência final de custo é o dashboard/fatura OpenAI. Sugestão futura: TOOL-003 captura `response.usage` real. Nenhum arquivo de produto alterado (`src/`, catálogo, BOM, PDF, layout, UI/mapa intocados). Nenhum secret exposto. Nenhuma aprovação automática. Relatório: `docs/relatorios/2026-05-22-TOOL-002.md`.

---

### TOOL-001 — Handoff automatizado Claude Code ↔ GPT Reviewer

**Status:** `concluída`
**Prioridade:** P2-importante
**Classe:** A — Governança / infraestrutura
**Área:** tooling / governança
**Arquivo:** `tasks/TOOL-001-handoff-claude-gpt-reviewer.md`
**Concluída em:** 2026-05-22 · 817/817 testes (produto) · 20/20 testes (tooling, pista separada) · 0 erros tsc · catálogo intocado · nenhum arquivo de produto alterado
**Relatório:** `docs/relatorios/2026-05-22-TOOL-001.md`

> Camada local de handoff Claude Code ↔ GPT Reviewer que insere etapa de revisão por LLM externo entre `/planejar` e a aprovação humana. 5 arquivos canônicos em `ai/` (README + project-state + current-task + claude-report + gpt-review + decision-log append-only); 5 scripts ESM em `scripts/ai/` (libs `invariants.mjs`, `parsers.mjs`; CLI `build-review-prompt.mjs`, `run-gpt-review.mjs`, `validate-structure.mjs`); 4 templates em `templates/ai-handoff-*.md`; 2 comandos slash novos (`/handoff-claude-report`, `/handoff-status`).
>
> Decisões arquiteturais:
> - **Responses API** com `text.format: { type: "json_schema", strict: true }` (não `/v1/chat/completions`); `OPENAI_MODEL` configurável via `.env.local`, sem default no código.
> - **Bloco JSON canônico** em `gpt-review.md` é fonte de verdade do validador (não headings nem keywords); markdown narrativo é só para humano.
> - **`override_permitido` derivado** pelo validador independentemente do que o GPT escrever — se qualquer invariante está `violada`, valor derivado = `false` e vence o JSON.
> - **`decision-log.md` append-only** verificado contra HEAD do git; hash sha256 de `gpt-review.md` em cada entry detecta tamper.
> - **`validate-structure.mjs` read-only sobre status** — nunca altera `current-task.md.status`; mudança de estado só por comando explícito ou edição manual.
> - **Override humano NÃO libera** violação de invariante permanente (regra terminal documentada em `ai/README.md`).
> - **`docs/metodologia/01-regras-bloqueantes.md` NÃO foi tocado** (ajuste 7 do plano); promoção da regra a RB-09 fica para task documental separada.
>
> 20 testes em pista separada (`node scripts/ai/__tests__/run-all.mjs`) — não afetam contador Vitest (817/817 preservado). Fixtures isoladas via `mkdtemp` em `__tests__/fixtures/builders.mjs`; nenhum teste lê ou escreve em `ai/*.md` reais.
>
> Soft-dogfood executado: `ai/claude-report.md` e `ai/gpt-review.md` (este último marcado `modelo_gpt: soft-dogfood-claude-opus-4-7` para transparência) materializados; entry **permanente** acrescentada a `ai/decision-log.md` registrando o ciclo. Primeira execução real da Responses API fica para TOOL-002.
>
> Nenhuma dependência npm nova (fetch nativo Node 18+). `.gitignore` atualizado (`ai/*.tmp`, `ai/.cache/`, `.playwright-mcp/`, `playwright-trace/`); 5 arquivos canônicos permanecem commitados. `.env.example` documenta `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`. `CLAUDE.md` ganhou seção curta apontando para `ai/README.md`.
>
> **Pendências:**
> - TOOL-002 (sugerida) — primeira task não-autorreferente a passar pelo fluxo, executando chamada real da Responses API.
> - TASK documental sugerida — promover regra "violação de invariante permanente é terminal" a `RB-09` em `01-regras-bloqueantes.md`.
> - Custo médio por chamada GPT (em `ai/README.md`) será preenchido após primeiro uso real.

---

## Próximas tarefas sugeridas (não formalizadas)

- **[Classe A] Pressão real por derivação (ramal/lateral)**: propagar `cumPrincipalHfM` até ponto de entrada de cada ramal; recalcular `PressureClassCheck` para `violation_confirmed` ou `ok` real; ≥ 3 testes incluindo caso confirmado de violação real vs. conservativo.
- **[Classe E → D] Revisão RT — `TOLERANCIA_ASPERSOR_EIXO_LATERAL` > 500 m**: consultar RT Brasmáquinas; se aprovado, reclassifica para D e ajusta constante de 0,10 → 0,20 m com 1 teste de regressão > 500 m.
- **[Classe B] Calibração RT de campo — OPTIMIZER_PARAMS**: validar pesos provisionais (PREMISSA_PROVISORIA_MERCADO) e pesos aguardando campo (PENDENTE_CALIBRACAO_RT_CAMPO) com dados de projetos homologados; remover marcadores. Depende de TASK-010A–010Z ✅
