# TASK-053 — Espinha de peixe SEMPRE sub-coletor (v12)

**Status:** `concluída` (aguarda commit/push autorizado pelo humano)
**Prioridade:** P2-importante
**Classe:** A — motor de layout / construtibilidade
**Área:** layout / construtibilidade
**Criado em:** 2026-05-22
**Concluída em:** 2026-05-23 · **870/870 testes vitest** · 0 erros tsc · 27/27 testes tooling · produto exclusivamente em `src/lib/layout/*` (sem BOM, sem PDF, sem UI)
**Predecessor:** TASK-052 (homologou operação rotativa por setor, base operacional para esta task)
**Relatório:** [`docs/relatorios/2026-05-22-TASK-053.md`](../docs/relatorios/2026-05-22-TASK-053.md)
**Evidências visuais:** [`docs/relatorios/evidencias/2026-05-22-TASK-053/`](../docs/relatorios/evidencias/2026-05-22-TASK-053/) (4 PNGs v12 do Projeto A)
**Veredito GPT (v12):** `reprovado` · 2 blockers metodológicos não-terminais (body de current-task.md dessincronizado + critério de fechamento implícito) · 0/7 invariantes violadas
**Decisão humana:** `aprovado_com_ajustes` via **OVERRIDE técnico Caminho 2** · `ai/decision-log.md`

---

## Objetivo

Eliminar a topologia "1 ramal individual perpendicular por coluna" (pente) implementando **"espinha de peixe operacional SEMPRE sub-coletor"**: TODA lateral conecta via `rib → spine → spine_entry → principal` (regra RT absoluta — nenhuma conexão direta lateral→principal quando `operationalSegments` é fornecido). Cada setor é modelado como 3 entidades lineares uniformes — 1 `spine` perpendicular aos laterais + 1 `spine_entry` perpendicular conectando principal ao spine + N `ribs` perpendiculares ao spine (1 por coluna física). Alinhamento natural com operação rotativa por setor (TASK-052 homologada): 1 setor ativo = 1 espinha ativa. Resolve o Problema 1 da análise pós-TASK-004B ("ramais horríveis" — RT).

## Natureza

**Classe A — motor de layout / construtibilidade.** Escopo restrito: SEM BOM, SEM ADR formal, SEM `constructability.ts`. BOM e ADR-016 ficam para TASK-054 sucessora APÓS validação visual da TASK-053 (cumpre INV-LAYOUT-INSTAVEL-COMERCIAL). Section_valve relocation para spine_entry DEFERIDA para TASK-053-valves sucessora.

## Histórico de reformulações (v1..v12)

| Versão | Geometria/topologia | Resultado |
|---|---|---|
| **v1** | Espigão "dente" 3 pontos `[(x, principalY), (x, inletY), (x, principalY)]` | **Reprovado** GPT — deflexão 180° geometricamente inválida |
| **v2** | Sub-coletor stair-step + alterar `bom.ts` + ADR-016 + `constructability.ts` | **Reprovado terminal** — INV-LAYOUT-INSTAVEL-COMERCIAL violada (avanço BOM/comercial sobre layout em estabilização) |
| **v3** | Sub-coletor stair-step com escopo reduzido (sem BOM) | Aprovado_com_ajustes + IMPLEMENTADO + **FALHOU VISUALMENTE** em grid rotacionado 59° (ordenação por LngLat colapsa a polilinha) |
| **v4** | Espinha "T deitado" como polilinha única | Reprovado GPT — geometria ambígua, ownership sobreposta, vazão subespecificada |
| **v5** | Espinha 3 entidades lineares no frame rotacionado | Reprovado GPT — `sizeAllSecondaries` omite `kind===undefined`; angular não-kind-aware |
| **v6** | Espinha 3 entidades + paths kind-aware no frame rotacionado | Aprovado + IMPLEMENTADO + **REPROVADO VISUAL** em Projeto A (degenerescência: probe central de `principalYLocal` coincide com principal quando inlets na borda) |
| **v7** | Espinha orientada pela direção REAL da principal | Aprovado + IMPLEMENTADO + **REPROVADO ARQUITETURAL** (topologia INVERTIDA — spine paralelo à principal em vez de ⊥ laterais conforme topologia REAL de irrigação) |
| **v8** | Voltar v6 arch + heurística X-vs-Y | Reprovado GPT (heurística invertia topologia em caso degenerado) |
| **v9** | Diagnóstico-only Caminho 3 | Aprovado_com_ajustes; causa raiz identificada: probe central coincide com principal quando inlets na borda |
| **v10** | Cohorts (rentes/afastados) | Reprovado GPT (mediana de gaps com zeros = 0 → fallback indesejado) |
| **v11** | Sempre sub-coletor + spineYLocal midpoint formula + MIN_HEADLAND_M | Reprovado GPT (`Math.sign(0) === 0` colapsa fallback; gate ambíguo) |
| **v12 (entregue)** | **Delta sobre v11**: `fieldSideSign` via centroid LngLat (independente do range dos inlets) + gate explícito `throw` para `operationalSegments` sem `gridAngleDegrees` | **Aprovado_com_ajustes via OVERRIDE Caminho 2** — 2 compromissos endereçados nesta implementação |

## Compromissos do override v12 (GPT v12 reprovou; humano fez override Caminho 2)

- **MET-053-V12-01** (commitment): atualização do body de `ai/current-task.md` para v12 EXECUTADA como primeiro passo do `/implementar`.
- **TECH-053-01** (commitment): blocker `spine_entry → principal` (e por extensão 11 blockers rib→lateral no Projeto A) permanece ATIVO ao fechar TASK-053 — geometricamente inevitável com regra estrita `[0°, 90°]`. **Fechamento técnico (tsc 0 + vitest passing + validação visual) NÃO é fechamento comercial.** Emissão de proposta comercial bloqueada por default até decisão RT explícita registrada em decision-log (override técnico OU aguardar TASK-053-valves para mitigar via section_valve no spine_entry).

## Escopo permitido (executado)

- `src/lib/layout/hydraulic-connectivity.ts` — tipo `SecondaryPipe` estendido com `kind: "spine" | "spine_entry" | "rib" | undefined`; nova função pura `routeEspinhaDePeixe` (v6+, evoluída até v12); helpers `groupColumnsBySector` (regra determinística); refactor de `generateSecondaries` com gate `operationalSegments` + `gridAngleDegrees` obrigatório; `validateHydraulicConnectivity` atualizado para iterar `physicalColumnIds` + warning TECH-053-01
- `src/lib/layout/secondary-sizing.ts` — 3 paths kind-aware: Path 0 legado preservado byte-a-byte; Path 1 ribs com `max(coluna)`; Path 2 spine/spine_entry com `SUM(ribs do sectorId)`
- `src/lib/layout/network-angle-diagnostics.ts` — validação kind-aware estrita `[0°, 90°]`: legado completo; spine_entry só junção→principal; rib só junção→lateral; spine pula validação sob garantia construtiva
- `src/lib/layout/irrigation-project.ts` — call site de `generateSecondaries` passa `operationalSegments` E `gridAngleDegrees` para ativar agrupamento por setor com geometria espinha de peixe
- `src/lib/layout/map-consistency.ts` — `secondaryByColId` agora considera todos `physicalColumnIds`; `inletSideMismatchCount` usa vértice mais próximo da polilinha (não apenas `toCoord`)
- `src/lib/layout/__tests__/subcoletor-por-setor.test.ts` — testes T53-1..T53-30 cobrindo as 3 entidades (spine + spine_entry + ribs), regra `fieldSideSign` via centroid, fallback `MIN_HEADLAND_M`, retrocompatibilidade legacy (`kind: undefined`)
- `src/lib/layout/__tests__/secondary-routing.test.ts` — teste T11 atualizado para validador kind-aware
- `scripts/diagnose/diagnose-espinha-projeto-a.mjs` — diagnóstico v9 (Caminho 3) que identificou causa raiz da degenerescência v6
- `scripts/diagnose/verify-v12-projeto-a.mjs` — verificação de output da v12 em produção no Projeto A
- `tasks/TASK-053-sub-coletor-por-setor.md` (este arquivo)
- `tasks/backlog.md`
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — premissa "Topologia de ramais — espinha de peixe SEMPRE sub-coletor (TASK-053 v12)" + histórico de revisões com entries v3, v6, v7, v12
- `docs/relatorios/2026-05-22-TASK-053.md`
- `docs/relatorios/evidencias/2026-05-22-TASK-053/` — 4 PNGs v12 do Projeto A
- `ai/current-task.md`, `ai/claude-report.md`, `ai/gpt-review.md`, `ai/decision-log.md`

## Escopo proibido (respeitado)

- **`src/lib/bom.ts`** — não tocado (RB-05 + INV-LAYOUT-INSTAVEL-COMERCIAL — causa raiz da reprovação terminal da v2)
- **`docs/decisoes/ADR-*.md`** — sem ADR novo; ADR-016 fica para TASK-054
- **`docs/software/arquitetura.md`** — não tocado
- **`src/lib/layout/constructability.ts`** — não tocado
- **`src/lib/catalog/aspersores.ts`** — não tocado (RB-04)
- **`src/lib/pdf/*`** — não tocado
- **`src/components/**`, `src/app/**`** — não tocado (RB-06)
- **`src/lib/layout/principal.ts`, `laterais.ts`, `sectorization.ts`, sprinkler-grid*, architecture-selector.ts** — não tocados (RB-08; geometria preservada)
- **`docs/metodologia/01-regras-bloqueantes.md`** — sem RB-09
- **Demais premissas** em `12-premissas-...md` — somente a nova é adicionada
- **`tasks/TASK-024-mapa-mestre-tasks.md`** — Mapa Mestre intocado

## Mudanças aplicadas (v12)

### Tipo `SecondaryPipe` (em `hydraulic-connectivity.ts`)

- Adicionado campo opcional `kind: "spine" | "spine_entry" | "rib" | undefined` (discriminador da espinha de peixe; `undefined` = legacy 1:1)
- Adicionado campo opcional `physicalColumnIds: readonly string[]` (lista das colunas servidas — vazia para spine/spine_entry estruturais; com 1 colId para rib)
- Adicionado campo opcional `sectorId?: number` (setor primário)
- Campo `physicalColumnId` marcado `@deprecated`; invariante mantida = `physicalColumnIds[0]`
- Campo `coords` suporta polilinhas das 3 entidades (spine longo + spine_entry curto + N ribs curtos)

### Novas funções puras exportadas

- `groupColumnsBySector(columns, operationalSegments): SectorColumnGroup[]` — regra determinística: setor com mais colunas exclusivas; empate menor `sectorId`
- `routeEspinhaDePeixe(cols, principalCoords, centroid, gridAngleDegrees)` — geometria das 3 entidades no frame rotacionado por `gridAngleDegrees`: spine perpendicular aos laterais via midpoint `(principalYLocal + farthestInletYLocal) / 2`; `fieldSideSign` via centroid LngLat (v12 fix); fallback `MIN_HEADLAND_M = 3 m`; spine_entry conectando principal ao spine; ribs perpendiculares ao spine (1 por coluna)

### Refactor `generateSecondaries`

- Nova assinatura: `(physicalColumns, principalCoords, centroid, minGapM?, options?)` com `options.operationalSegments` e `options.gridAngleDegrees`
- Com `operationalSegments` + `gridAngleDegrees`: agrupa por setor; gera 3 entidades (spine + spine_entry + N ribs) por grupo via `routeEspinhaDePeixe`
- Com `operationalSegments` mas SEM `gridAngleDegrees`: **gate explícito `throw`** (v12 fix TECH-053-V11-02)
- Sem `operationalSegments`: comportamento legado 1:1 (`kind: undefined`) preservado byte-a-byte (retrocompatibilidade total)

### Refactor `sizeAllSecondaries` — 3 paths kind-aware

- **Path 0 (legado)**: `kind === undefined` → comportamento histórico inalterado
- **Path 1 (rib)**: vazão = `max(lateral.vazaoM3h)` da coluna (operação rotativa por setor — TASK-052)
- **Path 2 (spine/spine_entry)**: vazão = `SUM(ribs do mesmo sectorId)` — agregação correta para a entrada/espinha do setor

### Refactor `network-angle-diagnostics.ts` — validação kind-aware

- `kind: undefined` (legado): validação completa principal↔primeira-coord + última-coord↔lateral + cotovelos internos
- `kind: "spine_entry"`: valida só junção spine_entry → principal
- `kind: "rib"`: valida só junção rib → lateral
- `kind: "spine"`: pula validação angular (junções com spine_entry/ribs são luvas/tês construtivas garantidas pelo gerador)

### Compromissos do override v12 endereçados

- **MET-053-V12-01:** body de `ai/current-task.md` atualizado para v12 PRIMEIRO no `/implementar` (cumprido).
- **TECH-053-01:** warning textual em `validateHydraulicConnectivity` quando há sub-coletor com `physicalColumnIds.length > 1`, sinalizando que BOM atual pode estar imprecisa para nova topologia. Sem mexer em `bom.ts`. Blocker `spine_entry → principal` (11 ocorrências em rib→lateral no Projeto A) permanece ATIVO ao fechar — geometricamente inevitável com regra estrita `[0°, 90°]`. **Emissão comercial bloqueada por default** até decisão RT explícita.

## Critérios de aceite

- [x] Tipo `SecondaryPipe.kind: "spine" | "spine_entry" | "rib" | undefined` adicionado
- [x] Tipo `SecondaryPipe.physicalColumnIds: readonly string[]` adicionado (opcional para retrocompat)
- [x] `physicalColumnId` deprecado (= `physicalColumnIds[0]` quando populado)
- [x] `sectorId?: number` adicionado
- [x] `generateSecondaries` agrupa por `sectorId` via `groupColumnsBySector` quando `operationalSegments` fornecido
- [x] Espinha de peixe (3 entidades: spine + spine_entry + N ribs) gerada por `routeEspinhaDePeixe` no frame rotacionado por `gridAngleDegrees`
- [x] **`fieldSideSign` via centroid LngLat** (v12 fix MET-053-V11-01) — independente do range dos inlets
- [x] **Gate explícito `throw`** (v12 fix TECH-053-V11-02) quando `operationalSegments` sem `gridAngleDegrees`
- [x] Fallback `MIN_HEADLAND_M = 3 m` quando `|spineYLocal − principalYLocal| < MIN_HEADLAND_M`
- [x] Coluna multi-setor: regra determinística (setor com mais colunas exclusivas; empate menor `sectorId`)
- [x] `sizeAllSecondaries` em 3 paths kind-aware (Path 0 legado preservado byte-a-byte; Path 1 ribs com max; Path 2 spine/spine_entry com SUM ribs do sectorId)
- [x] `detectNetworkAngleIssues` kind-aware estrito `[0°, 90°]`: legado completo; spine_entry só principal; rib só lateral; spine skip
- [x] `validateHydraulicConnectivity` considera todos `physicalColumnIds` (não só primeira)
- [x] Warning TECH-053-01 sobre BOM provisória quando há sub-coletor com `physicalColumnIds.length > 1`
- [x] Caminho legacy `kind: undefined` preservado para retrocompat pura (sem `operationalSegments`)
- [x] **`src/lib/bom.ts` NÃO modificado**
- [x] **Nenhum ADR criado** (ADR-016 fica para TASK-054)
- [x] **`docs/software/arquitetura.md` NÃO modificado**
- [x] **`src/lib/layout/constructability.ts` NÃO modificado** (section_valve relocation DEFERIDA para TASK-053-valves)
- [x] Premissa atualizada em `12-premissas-...md` (`PENDENTE_REVISAO_RT_BRASMAQUINAS`) — entries v3, v6, v7, v12 documentadas no histórico de revisões
- [x] `tasks/TASK-053-*.md` criado/atualizado (este arquivo)
- [x] `tasks/backlog.md` atualizado (header + entry v12)
- [x] `docs/relatorios/2026-05-22-TASK-053.md` criado
- [x] `docs/relatorios/evidencias/2026-05-22-TASK-053/` criada com 4 PNGs v12 do Projeto A
- [x] `src/lib/catalog/`, `src/lib/pdf/*`, `src/components/**`, `src/app/**` NÃO modificados
- [x] `principal.ts`, `laterais.ts`, `sectorization.ts`, optimizer, architecture-selector NÃO modificados (RB-08)
- [x] Mapa Mestre NÃO alterado
- [x] `01-regras-bloqueantes.md` NÃO alterado (sem `RB-09`)
- [x] Demais premissas em `12-premissas-...md` NÃO alteradas
- [x] `npx tsc --noEmit` → **0 erros**
- [x] `npx vitest run` → **870/870**
- [x] `node scripts/ai/__tests__/run-all.mjs` → **27/27**
- [x] Fluxo TOOL-003 executado antes da implementação (handoff + gpt-review v1..v12 + decision-log com ~12 entries TASK-053)
- [x] **Compromisso TECH-053-01 endereçado:** blocker `spine_entry → principal` ATIVO ao fechar; emissão comercial bloqueada por default até decisão RT explícita

## Pendências abertas (sucessores)

- **TASK-054 (Classe A futura)** — ajustar BOM para topologia "sempre sub-coletor" (1 spine + 1 spine_entry + N ribs por setor). Separar contagem de tês principal-para-spine_entry, tês internos do spine para ribs, conexões rib-para-lateral, cotovelos 90° internos. Inclui ADR-016 formal documentando a decisão arquitetural completa. Depende de validação visual da TASK-053 no Projeto A
- **TASK-053-valves (sucessora dedicada)** — relocação de `section_valve` para `spine_entry` (ADR-014 → nova arquitetura). Mitiga blocker `TECH-053-01` permitindo emissão comercial sob nova topologia
- **TASK-056 (Classe A futura)** — Motor de comparação de arquiteturas (A0 vs A2 vs A3 vs ...) com função objetivo "menor BOM válida e operacionalmente executável" (registro do framework homologado RT 2026-05-23)
- **TASK-055 (Classe C documental)** — Formalizar a lógica profissional da arquitetura principal/sub-coletores/laterais em `docs/metodologia/13-arquitetura-de-rede-principal-subcoletores-laterais.md` + Mapa Mestre (E02/E03/E04/E05)
- **TOOL-XXX** — atualizar snapshot interno do prompt do GPT Reviewer (pendência registrada desde TASK-052)
- **Validação visual no Projeto A** — usuário precisa regenerar a principal via auto-pipeline no mapa para homologar topologia v12 (gatekeeper de fechamento comercial; fechamento técnico já satisfeito)

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-22 | Claude Opus 4.7 | TASK-053 v1 reprovado pelo GPT (espigão 180° geometricamente inválido). Decisão humana: reformular. |
| 2026-05-22 | Claude Opus 4.7 | TASK-053 v2 reprovado **terminal** pelo GPT (INV-LAYOUT-INSTAVEL-COMERCIAL violada por incluir BOM no escopo). Decisão humana: reformular com escopo reduzido (Caminho 1). |
| 2026-05-22 | Claude Opus 4.7 | TASK-053 v3 aprovado_com_ajustes (Caminho A) — escopo restrito a layout/construtibilidade; sem BOM, sem ADR. Implementado mas falhou visualmente em grid rotacionado 59° (ordenação por LngLat colapsa polilinha). |
| 2026-05-23 | Claude Opus 4.7 | TASK-053 v4..v11 — sequência de iterações arquiteturais resolvendo: ambiguidade "T deitado" (v4); omissão path legado (v5); degenerescência probe central em Projeto A (v6); inversão de topologia spine ∥ principal (v7); heurística X-vs-Y reprovada (v8); diagnóstico-only Caminho 3 (v9); cohorts com mediana zero (v10); `Math.sign(0)` colapsa (v11). Cada versão com handoff + gpt-review + decision-log. |
| 2026-05-23 | Claude Opus 4.7 | TASK-053 v12 — `fieldSideSign` via centroid LngLat + gate explícito `throw` para `operationalSegments` sem `gridAngleDegrees`. Reprovado GPT por 2 blockers metodológicos não-terminais; **aprovado_com_ajustes via OVERRIDE Caminho 2**. Compromissos: (1) body de `current-task.md` atualizado para v12 PRIMEIRO no `/implementar`; (2) blocker TECH-053-01 permanece ATIVO ao fechar — emissão comercial bloqueada. 870/870 testes vitest, 0 tsc, 27/27 tooling. Implementação concluída. |
| 2026-05-23 | Claude Opus 4.7 | Fechamento operacional: backlog atualizado (header 856→870 + entry v12); task file reescrito para v12 (este arquivo); evidências v12 movidas para `docs/relatorios/evidencias/2026-05-22-TASK-053/`. Aguarda commit/push. |
| 2026-05-23 | Claude Opus 4.7 | Implementação concluída. 20 testes T53 novos (856/856 total). Helpers puros `groupColumnsBySector` e `routeSubColetorStairStep` exportados. Validador angular estendido para cotovelos internos. Warning sobre BOM provisória adicionado em `validateHydraulicConnectivity`. Sem `src/lib/bom.ts`, sem ADR, sem `constructability.ts`. |
