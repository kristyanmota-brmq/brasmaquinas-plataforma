# TASK-056 — Motor de qualidade operacional da arquitetura A0/A2/A3 (MVP)

**Status:** `concluída` (aguarda commit/push autorizado pelo humano)
**Prioridade:** P1-crítico
**Classe:** A — motor de layout / domínio
**Área:** layout / domínio / hidráulica / governança
**Criado em:** 2026-05-23
**Concluída em:** 2026-05-23 · **887/887 testes vitest** (+17 vs 870 baseline) · 0 erros tsc · 27/27 testes tooling
**Predecessores:** TASK-043 (motor A0/A2/A3 inicial); TASK-053 v12 (topologia espinha de peixe); TASK-055 (formalização metodológica doc 13); ADR-015 (decisão arquitetural base)
**Relatório:** [`docs/relatorios/2026-05-23-TASK-056.md`](../docs/relatorios/2026-05-23-TASK-056.md)
**Evidências:** [`docs/relatorios/evidencias/2026-05-23-TASK-056/`](../docs/relatorios/evidencias/2026-05-23-TASK-056/)

---

## Objetivo

Adicionar ao motor `selectArchitectureByBom()` métricas operacionais objetivas (P1-P4) com score multi-objetivo (`scoreFinal = BOM + penalidades operacionais`) e gate específico para A3 (principal central exige economia mínima vs A0). Impede que o motor escolha arquiteturas visualmente ruins apenas por terem BOM menor — alinha com a diretriz formalizada em `docs/metodologia/13-arquitetura-de-rede-principal-subcoletores-laterais.md` (TASK-055).

## Natureza

**Classe A — motor de layout.** Escopo restrito: sem A4-A8 (reservados para TASK-056B); sem Pareto (score único auditável); sem BOM (`bom.ts` intocado); sem section_valve relocation; sem relaxar TECH-053-01; sem alterar catálogo, PDF, UI/mapa, ADR.

## Mudanças aplicadas

### 1. Módulo puro novo: `architecture-quality-metrics.ts`

4 helpers exportados:

- **`computePrincipalSplitsColumnsRatio(principalCoords, physicalColumns, centroid, gridAngleDegrees) → [0, 1]`** (P1) — fração de colunas físicas que a principal "corta" pelo meio no frame local rotacionado. **Proxy operacional, não área poligonal real** — conta colunas onde `principalY_local` cai estritamente entre `yMin_local` e `yMax_local`.
- **`computeSubCollectorDisconnectM(secondaries) → metros`** (P2) — soma de comprimentos de entidades `kind === "spine_entry"`. Sub-coletor desconectado da principal indica fragmentação visual.
- **`computeRouteBreaksCount(principalCoords, adutoraCoords, secondaries) → contagem`** (P3) — vértices internos em principal + adutora + spines + spine_entries. Ribs e laterais NÃO contam (forçadas retas por construção).
- **`computeValveDispersionM(controlPoints, secondaries, centroid) → metros`** (P4) — média de distâncias section_valve → spine_entry mais próximo. **Peso 0 no MVP** (helper exposto para testabilidade; ativação prevista pós-TASK-053-valves).

### 2. Refactor `architecture-selector.ts`

- Novas constantes (todas `PENDENTE_CALIBRACAO_RT_CAMPO` em [`12-premissas-...md`](../docs/metodologia/12-premissas-provisorias-e-revisao-rt.md)):
  - **`WEIGHT_PRINCIPAL_CROSSES = 0`** (desativada no MVP após correção metodológica — ver log de alterações)
  - `WEIGHT_FRAGMENTATION = 1.0`
  - `PENALTY_FRAGMENTATION_PER_M_R$ = 35.0` (proxy operacional, NÃO preço de material)
  - `PENALTY_ROUTE_BREAK_R$ = 100.0` (proxy operacional, NÃO preço de luva)
  - `WEIGHT_VALVE_DISPERSION = 0` (peso desativado no MVP)
  - `PENALTY_VALVE_DISPERSION_PER_M_R$ = 30.0` (reservado para TASK-056B)
  - **`A3_MIN_ECONOMY_BOM_PCT = 0`** (gate desativado no MVP após correção metodológica)
- `CandidateEvaluation` ganha campos `p1_principalSplitsColumnsRatio`, `p2_subCollectorDisconnectM`, `p3_routeBreaksCount`, `p4_valveDispersionM`, `operationalPenaltyR$`, `scoreFinal`
- `ArchitectureSelectorInput` aceita `operationalSegments?: OperationalSegment[]` opcional — quando fornecido, ativa topologia v12 espinha de peixe no evaluator; sem ele, mantém caminho legado 1:1 byte-a-byte (compatibilidade total com testes T43)
- `evaluateCandidate` agora chama `generateSecondaries` com `{ operationalSegments, gridAngleDegrees }` quando disponíveis
- `selectArchitectureByBom` ordena por `scoreFinal` (não mais `bomEstimadaPreliminar`)
- **Gate A3**: A3 (principal central) só compete por `scoreFinal` se `(bomA0 − bomA3) / bomA0 ≥ A3_MIN_ECONOMY_BOM_PCT`; sem economia mínima, A3 é rejeitado antes da ordenação
- Tie-breaker A0 (princípio "menor mudança") preservado
- `reason` ampliado para citar BOM + penalidades + P1..P4 por candidato + nota de gate quando aplicável

### 3. Wiring opcional em `layout-use-cases.ts`

`buildSelectedPipelineCoords` ganha 6º parâmetro opcional `operationalSegments?: OperationalSegment[]`. Compatível com 2 call sites em `ProjectMap.tsx` (mapa não foi alterado — passa undefined, mantendo caminho legacy). Quando `ProjectMap.tsx` for atualizado em task futura, basta passar `operationalSegments` para ativar o motor v12.

### 4. Testes T56 (+17)

- **Módulo de métricas (`architecture-quality-metrics.test.ts`):** 13 testes cobrindo todos os helpers — T56-2a..T56-2e (5 testes P1); T56-3a..T56-3b (2 testes P2); T56-4a..T56-4c (3 testes P3); T56-5a..T56-5c (3 testes P4)
- **Selector (`architecture-selector.test.ts`):** 4 testes adicionados — T56-6 (BOM menor + rede ruim perde), T56-7 (A0 vence empate real em scoreFinal), T56-8 (A3 não vence por economia irrelevante), T56-9 (invariantes preservadas: rede 0°/90°, DN homologado, P1-P4 expostos, P4=0 no MVP, topologia legacy preservada quando operationalSegments=undefined)

### 5. Diagnóstico Projeto A

Script manual `scripts/diagnose/diagnose-architecture-projeto-a.mjs` criado. **NÃO incorporado a `run-all.mjs`** (depende de banco local + tsx runtime). Documentação de execução em `docs/relatorios/evidencias/2026-05-23-TASK-056/diagnostico-projeto-a.txt`.

## Escopo permitido (executado)

- `src/lib/layout/architecture-quality-metrics.ts` — módulo puro novo
- `src/lib/layout/architecture-selector.ts` — refactor para P1-P4 + scoreFinal + gate A3
- `src/lib/layout/layout-use-cases.ts` — wiring opcional de `operationalSegments`
- `src/lib/layout/__tests__/architecture-quality-metrics.test.ts` — 13 testes
- `src/lib/layout/__tests__/architecture-selector.test.ts` — 4 testes T56 adicionados; 11 T43 preservados
- `scripts/diagnose/diagnose-architecture-projeto-a.mjs` — script manual
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — 5 novas penalidades operacionais (sem alterar premissas existentes)
- `tasks/backlog.md` — header + status TASK-055 publicada + TASK-056 concluída + TASK-056B pendente
- `tasks/TASK-056-motor-qualidade-operacional.md` (este arquivo)
- `docs/relatorios/2026-05-23-TASK-056.md`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/diagnostico-projeto-a.txt`

## Escopo proibido (respeitado)

- **`src/lib/bom.ts`** — RB-05 + INV-LAYOUT-INSTAVEL-COMERCIAL
- **`src/lib/layout/hydraulic-connectivity.ts`** — read-only; topologia espinha de peixe v12 preservada
- **`src/lib/layout/constructability.ts`** — apenas referência tipo `ControlPoint` em helper (não alterado)
- **`src/lib/layout/principal.ts`** — sem novas options (A1 fica para TASK-056B)
- **`src/lib/catalog/aspersores.ts`** — RB-04
- **`src/lib/pdf/*`** — fora do escopo
- **`src/components/**`, `src/app/**`** — RB-06 (UI/mapa intocados)
- **`docs/decisoes/ADR-*.md`** — sem ADR nova (ADR-015 referenciada como base)
- **`docs/metodologia/01-regras-bloqueantes.md`** — sem RB nova
- **`docs/metodologia/13-...md`** — não alterado nesta task (referência minimal não foi necessária)
- **Blocker TECH-053-01** — preservado ATIVO; emissão comercial bloqueada por default

## Critérios de aceite

- [x] Módulo `architecture-quality-metrics.ts` criado e exporta 4 helpers puros
- [x] `architecture-selector.ts` refatorado para `scoreFinal = BOM + penalidades` (com gate A3)
- [x] Topologia v12 ativada no evaluator quando `operationalSegments` fornecido
- [x] `ArchitectureSelectorInput.operationalSegments` opcional; sem ele, comportamento legacy
- [x] `CandidateEvaluation` expõe `p1_*`, `p2_*`, `p3_*`, `p4_*`, `operationalPenaltyR$`, `scoreFinal`
- [x] Gate A3 `A3_MIN_ECONOMY_BOM_PCT = 5%` impede A3 vencer por economia irrelevante
- [x] Tie-breaker A0 preservado
- [x] 5 novas penalidades em `12-premissas-...md` (`PENDENTE_CALIBRACAO_RT_CAMPO`)
- [x] **Nenhuma premissa existente alterada**
- [x] 13 testes do módulo de métricas (T56-2..T56-5)
- [x] 4 testes do selector (T56-6..T56-9)
- [x] **11 testes T43 preservados byte-a-byte** (operationalSegments ausente → score = BOM)
- [x] Script `diagnose-architecture-projeto-a.mjs` criado (manual; não em CI)
- [x] **`bom.ts`, `hydraulic-connectivity.ts`, `constructability.ts`, `principal.ts`, catálogo, PDF, UI/mapa intocados**
- [x] **Nenhuma ADR criada**
- [x] **Blocker TECH-053-01 preservado ATIVO** (verificado por T56-9)
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → **887/887** (870 + 17 T56)
- [x] `node scripts/ai/__tests__/run-all.mjs` → 27/27 (preservado)
- [x] **Validação visual no Projeto A executada via Playwright MCP em 2026-05-23 — veredito INTEGRAL** (evidências em `docs/relatorios/evidencias/2026-05-23-TASK-056/validacao-visual-projeto-a.md` + 4 screenshots PNG)

## Pendências abertas (sucessores)

- **TASK-056B (Classe A futura)** — A1 externa + A4-A8 + ativação de WEIGHT_VALVE_DISPERSION pós-TASK-053-valves
- **TASK-054 (Classe A)** — BOM ajustada para topologia "sempre sub-coletor"
- **TASK-053-valves** — Relocação section_valve para spine_entry (destrava P4 + mitiga TECH-053-01)
- **Validação visual no Projeto A** — gatekeeper RT (instruções em evidências)
- **Calibração RT/E09 dos 5 pesos novos** — `WEIGHT_PRINCIPAL_CROSSES`, `WEIGHT_FRAGMENTATION`, `PENALTY_FRAGMENTATION_PER_M_R$`, `PENALTY_ROUTE_BREAK_R$`, `A3_MIN_ECONOMY_BOM_PCT`

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-23 | Claude Opus 4.7 | `/iniciar-task` da TASK-056 (diagnóstico em 13 perguntas pré-planejamento). |
| 2026-05-23 | Claude Opus 4.7 | `/planejar` da TASK-056. Aprovado com 10 ajustes obrigatórios: P4 não-circular (peso 0 no MVP); P1 renomeado para `principalSplitsColumnsRatio` (proxy operacional, não área real); penalidades como `PENALTY_*` (não preços de material); premissas como penalidades operacionais com `PENDENTE_CALIBRACAO_RT_CAMPO`; T56-9 verifica DN via PhysicalColumn (não sizedSecondariesPreview); script de diagnóstico manual (não em CI); testes em `__tests__/`; wiring em `layout-use-cases.ts` (não `irrigation-project.ts`); A3 gate 5% provisional; validação visual obrigatória para fechamento integral. |
| 2026-05-23 | Claude Opus 4.7 | `/implementar` da TASK-056. **Criados:** `architecture-quality-metrics.ts` (4 helpers puros); `architecture-quality-metrics.test.ts` (13 testes); `diagnose-architecture-projeto-a.mjs` (script manual); `diagnostico-projeto-a.txt` (evidência/instruções); este arquivo; relatório `2026-05-23-TASK-056.md`. **Modificados:** `architecture-selector.ts` (constantes + CandidateEvaluation + ArchitectureSelectorInput + scoreFinal + gate A3); `architecture-selector.test.ts` (+4 testes T56); `layout-use-cases.ts` (wiring opcional); `12-premissas-...md` (+5 penalidades operacionais); `tasks/backlog.md` (header + entradas). **870 → 887 testes** (+17). `npx tsc --noEmit` → 0. `node scripts/ai/__tests__/run-all.mjs` → 27/27. `git diff --stat -- bom.ts hydraulic-connectivity.ts catalog PDF components` → vazio. ADR-015 preservada. TECH-053-01 ATIVO. |
| 2026-05-23 | Claude Opus 4.7 (correção pós-validação) | **Correção metodológica após challenge do usuário sobre P1/gate A3.** Usuário apontou que penalizar A3 (principal central) via score transformava **boa prática** (doc 13 §3.2 — "principal aproveita bordas/central conforme conveniente") em **regra técnica absoluta**, violando ajuste 3 da TASK-055 (preservar distinção 4-tier). **Aplicada Opção A**: `WEIGHT_PRINCIPAL_CROSSES = 0` e `A3_MIN_ECONOMY_BOM_PCT = 0`. Helper `computePrincipalSplitsColumnsRatio` continua exposto em `CandidateEvaluation.p1_*` como métrica diagnóstica; warning textual de A3 permanece ATIVO desde TASK-043. Custo real de A3 (mais cotovelos + spine_entries longos) continua capturado por P2 + P3. Testes vitest 887/887 inalterados (A3 ainda perde naturalmente no Projeto A baseline por BOM A3 > BOM A0). Docstrings dos testes T56-6 e T56-8 atualizadas para refletir nova filosofia ("cost-driven, not gate-driven"). Premissas em `12-premissas-...md` atualizadas com justificativa metodológica + nova entrada no histórico de revisões. ADR-015 mais fielmente respeitada agora (função objetivo "menor BOM válida e executável" sem proxies estéticos). |
