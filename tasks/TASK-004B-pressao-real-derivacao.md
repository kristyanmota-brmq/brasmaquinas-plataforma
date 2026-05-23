# TASK-004B — Pressão real por derivação / cumPrincipalHfM

**Status:** `concluída` (aguarda commit/push autorizado pelo humano)
**Prioridade:** P2-importante
**Classe:** A — motor hidráulico
**Área:** hidráulica
**Criado em:** 2026-05-22
**Concluída em:** 2026-05-22 · 836/836 testes vitest (+10 novos) · 0 erros tsc · 27/27 testes tooling · produto exclusivamente em `src/lib/layout/hydraulic-sizing.ts`
**Predecessor:** TASK-004 (concluída 2026-05-19; ADR-008; Alternativa C reservada explicitamente para esta task)
**Relatório:** [`docs/relatorios/2026-05-22-TASK-004B.md`](../docs/relatorios/2026-05-22-TASK-004B.md)
**Veredito GPT (`/gpt-review TASK-004B`):** `aprovado_com_ajustes` · 2 blockers (TEC-004B-001 + MET-004B-001) · 0/7 invariantes violadas
**Decisão humana:** `aprovado_com_ajustes` · Opção A para ambos · `ai/decision-log.md` 2026-05-22T21:02:18-03:00 · hash gpt-review `35c7ba49...59efa`

---

## Objetivo

Substituir o cálculo conservador de pressão em ramais e laterais (HMT como teto único — TASK-004 / ADR-008) por **pressão real por derivação**: `pressaoOperacionalMaxMca = HMT − adutoraHfM − cumPrincipalHfM`. Isso transforma `violation_conservative` em `ok` (quando pressão real ≤ PN) ou em `violation_confirmed` (quando pressão real > PN), aumentando a precisão do diagnóstico de PN sem alterar catálogo, BOM, PDF, UI/mapa, motor comercial ou premissas.

**Follow-up direto** da pendência registrada na TASK-004 mãe (backlog linha 118): *"pressão real por derivação para ramal/lateral (requer `cumPrincipalHfM` no segmento)"*. ADR-008 (Alternativa C) reservou explicitamente esta implementação para tarefa futura — TASK-004B entrega essa Alternativa C.

---

## Contexto

`cumPrincipalHfM` já existia computado em `hydraulic-sizing.ts` como campo de `EnrichedSeg` (linha 474) e estava em escopo no laço que constrói `sSecSegs` e `sLatSegs` (linha 488). A propagação para os objetos `HydraulicSegment` retornados era a única lacuna — mudança cirúrgica.

A função `annotatePressureClass` é o ponto de pós-processamento que consome os campos. A detecção do modelo (`pressureClassModel`) foi promovida a helper puro exportado (`derivePressureClassModel`) conforme ajuste TEC-004B-001 do GPT Reviewer.

---

## Ajustes aplicados (decisão humana via `decision-log.md`)

**TEC-004B-001 (Opção A):** Detecção de `pressureClassModel = "exact_per_derivation"` exige **ambos** `cumPrincipalHfM != null` E `adutoraHfM != null` em todos os ramais/laterais relevantes. Implementado via helper puro e exportado `derivePressureClassModel`, testado isoladamente.

**MET-004B-001 (Opção A):** Escopo de testes ampliado para incluir auditoria em `integration.test.ts`, `bom.test.ts`, `pipeline-diagnostics.test.ts`. **Resultado:** nenhum teste fora de `pressure-class.test.ts` precisou de adaptação — a propagação dos 2 campos novos é aditiva e os testes existentes não validam classificação de PN em ramais/laterais com derivação. 836/836 (vs 826 baseline + 10 novos T04B).

---

## Arquivos a ler (não alterar nenhum)

| Arquivo | Por que ler |
|---------|------------|
| `src/lib/layout/hydraulic-sizing.ts` (838 → 866 linhas) | Tipo `HydraulicSegment`, `annotatePressureClass`, construção do solver |
| `src/lib/layout/__tests__/pressure-class.test.ts` (242 → 365 linhas) | Testes existentes (15) + novos (10) |
| `docs/decisoes/ADR-008-validacao-pn-classe-pressao-tubos.md` | Alternativa C reservada explicitamente |
| `tasks/backlog.md` linha 118 | Pendência registrada da TASK-004 mãe |

---

## Arquivos impactados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/lib/layout/hydraulic-sizing.ts` | modificação — 5 pontos cirúrgicos |
| `src/lib/layout/__tests__/pressure-class.test.ts` | adição de 10 testes; helper `makeSeg` ganha parâmetro opcional |
| `tasks/TASK-004B-pressao-real-derivacao.md` | criação (este arquivo) |
| `tasks/backlog.md` | atualização do header + entrada nova + ajuste pendência TASK-004 mãe |
| `docs/relatorios/2026-05-22-TASK-004B.md` | criação |
| `ai/current-task.md` | governança TOOL-003 |
| `ai/claude-report.md` | governança TOOL-003 |
| `ai/gpt-review.md` | gerado por `run-gpt-review.mjs` |
| `ai/decision-log.md` | entry append-only TASK-004B |

**Nenhum arquivo em `src/lib/catalog/`, `src/lib/bom.ts`, `src/lib/pdf/`, `src/components/`, `src/app/`, `src/lib/layout/secondary-sizing.ts` ou geometria foi alterado.**

---

## Critérios de aceite

- [x] Tipo `HydraulicSegment` ganha campos opcionais `cumPrincipalHfM?: number` e `adutoraHfM?: number`
- [x] Tipo `HydraulicModelLimitations.pressureClassModel` muda de literal `"hmt_conservative_inlet"` para união `"hmt_conservative_inlet" | "exact_per_derivation"`
- [x] Função `annotatePressureClass` calcula pressão real para ramal/lateral quando ambos os campos disponíveis; classifica `ok`/`violation_confirmed`/`unknown`
- [x] Fallback preservado: ramal/lateral sem `cumPrincipalHfM` E `adutoraHfM` → comportamento atual `violation_conservative`
- [x] Helper novo `derivePressureClassModel(segments)` exportado e testado isoladamente (4 testes)
- [x] `sSecSegs` e `sLatSegs` no solver popularizam `cumPrincipalHfM` e `adutoraHfM`
- [x] `modelLimitations.pressureClassModel` detectado dinamicamente via `derivePressureClassModel(allSegs)`
- [x] 6 testes T04B-1..T04B-6 + 4 testes `derivePressureClassModel` adicionados em `pressure-class.test.ts` (10 totais)
- [x] 15 testes T01..T15 pré-existentes em `pressure-class.test.ts` continuam passando sem alteração
- [x] `tasks/backlog.md` atualizado (header + entrada TASK-004B + ajuste pendência TASK-004 mãe linha 118)
- [x] `docs/relatorios/2026-05-22-TASK-004B.md` criado
- [x] **Mapa Mestre `tasks/TASK-024-mapa-mestre-tasks.md` NÃO alterado**
- [x] **Premissas RT/campo NÃO alteradas**
- [x] **ADR-008 NÃO alterada** (sem emenda; sem ADR-016)
- [x] **`01-regras-bloqueantes.md` NÃO alterado** (sem RB-09)
- [x] **`03-hidraulica.md` NÃO alterado**
- [x] **Catálogo `src/lib/catalog/aspersores.ts` NÃO alterado** (RB-04)
- [x] **`src/lib/bom.ts` NÃO alterado** (RB-05)
- [x] **`src/lib/pdf/*` NÃO alterado**
- [x] **`src/components/**` NÃO alterado** (RB-06)
- [x] **`src/app/**` NÃO alterado**
- [x] **`src/lib/layout/secondary-sizing.ts` NÃO alterado**
- [x] **Demais arquivos de geometria (`laterais.ts`, `sectorization.ts`, `constructability.ts`, `network-angle-diagnostics.ts`, `sprinkler-grid.ts`, `irrigation-project.ts`) NÃO alterados** (RB-08)
- [x] `npx tsc --noEmit` → **0 erros**
- [x] `npx vitest run` → **836/836 passando** (era 826; +10 novos)
- [x] `node scripts/ai/__tests__/run-all.mjs` → 27/27 passando (preservado)

---

## Testes obrigatórios — entregues

### Em `src/lib/layout/__tests__/pressure-class.test.ts`

**6 testes TASK-004B sobre `annotatePressureClass`:**

1. **T04B-1** — lateral PN40 com `cumPrincipalHfM=10, adutoraHfM=5, hmt=45`: pressão real = **30** ≤ 40 ⇒ `ok` (vs antigo `violation_conservative`)
2. **T04B-2** — lateral PN40 com `cumPrincipalHfM=2, adutoraHfM=1, hmt=45`: pressão real = **42** > 40 ⇒ `violation_confirmed` (blocker real, vs antigo `violation_conservative` warning)
3. **T04B-3** — ramal PN80 com `cumPrincipalHfM=5, adutoraHfM=3, hmt=80`: pressão real = **72** ≤ 80 ⇒ `ok`
4. **T04B-4** — ramal sem `cumPrincipalHfM` (fallback legado): HMT=85 > PN=80 ⇒ `violation_conservative`
5. **T04B-5** — sequência completa adutora→principal→ramal→lateral com valores numéricos exatos (verifica adutora 60, principal 50, ramal 45 ok, lateral 45 violation_confirmed)
6. **T04B-6** — lateral com apenas `cumPrincipalHfM` (falta `adutoraHfM`): fallback ativa (Opção A ajuste TEC-004B-001)

**4 testes TASK-004B sobre `derivePressureClassModel`:**

7. Sem ramais/laterais → `"hmt_conservative_inlet"`
8. Todos ramais/laterais com ambos campos → `"exact_per_derivation"`
9. Algum ramal/lateral sem ambos os campos → `"hmt_conservative_inlet"` (fallback)
10. Ramal com `cumPrincipalHfM` mas sem `adutoraHfM` → `"hmt_conservative_inlet"` (Opção A do GPT)

**Cobertura:** 25 testes totais no arquivo (15 pré-existentes + 10 novos). Todos passando.

---

## Fora do escopo (entregue por task futura separada)

- **Desnível geodético por segmento** — pendência irmã registrada na TASK-004 mãe; explicitamente excluída pelo usuário no plano da TASK-004B
- **Perdas locais proporcionais** — fórmula nível médio descartada para V1; mantida fórmula mínima `HMT − adutoraHfM − cumPrincipalHfM`
- **Alteração de limites hidráulicos** (`MAX_VELOCITY_RAMAL_MS`, `MAX_HEADLOSS_RAMAL_MCA`, `DEFAULT_SAFETY_MARGIN_MCA`, `DEFAULT_LOCAL_LOSS_FACTOR_PERCENT`) — premissas pendentes RT/campo
- **Promoção do épico E03** no Mapa Mestre — decisão de governança separada; status real continua "Testado em código" (mesmo após TASK-004B, falta comparação com projeto histórico do RT)
- **Emenda à ADR-008** ou ADR-016 — desnecessário; ajustes do GPT incorporados no código com referência ao ADR original
- **Exibição de `pressureClassModel` no PDF** — task futura B (não compromete TASK-004B)

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Materializado? | Mitigação |
|-------|:------------:|:-------:|:--------------:|-----------|
| Reordenação de blocker/warning quebra integration tests | Média | Alto | **Não** | Auditoria completa: 836/836; nenhum teste fora de `pressure-class.test.ts` precisou adaptação |
| Lateral PN40 + HMT 41 antes `_conservative` vira `ok` (pode parecer "perda de proteção") | Média | Médio | Sim (comportamento desejado) | Documentado no relatório como eliminação de falso positivo; blocker `_confirmed` ativo nos casos genuínos |
| Fórmula sem perdas locais subestima pressão | Baixa | Médio | Sim (intencional) | Ligeiramente conservativa; preserva INV-BLOCKERS-TECNICOS; documentada como limitação |
| Mudança em `pressureClassModel` quebra leitor externo | Baixíssima | Médio | **Não** | Apenas 2 ocorrências em todo `src/`, ambas em `hydraulic-sizing.ts`; PDF/UI não consomem |
| HMT do Projeto A muda inadvertidamente | Baixíssima | Alto | **Não** | Solver hidráulico não tocado; apenas pós-processamento `annotatePressureClass` |

**Dependências satisfeitas:** TASK-004 (mãe) concluída em 2026-05-19; ADR-008 aceita; TASK-001 (diagnóstico) concluída em 2026-05-22 e publicada em `origin/main` (`427539e`).

---

## Plano de implementação (executado)

1. **Auditoria pré-impl:** confirmar `tsc 0`, `vitest 826/826`, `run-all.mjs 27/27`, working tree limpo
2. **Sincronizar `ai/current-task.md`** para TASK-004B (mesma operação manual autorizada da TASK-001)
3. **`/handoff-claude-report TASK-004B`** — serializar plano em `ai/claude-report.md`
4. **`/gpt-review TASK-004B`** — chamada real à Responses API; veredito `aprovado_com_ajustes` (2 blockers)
5. **Decisão humana** em `ai/decision-log.md` (Opção A para ambos)
6. **Transição** `current-task.md → em_implementacao` + `validate-structure OK`
7. **Implementação** (5 edits cirúrgicos em `hydraulic-sizing.ts`):
   - Edit 1: campos opcionais `cumPrincipalHfM?` e `adutoraHfM?` em `HydraulicSegment`
   - Edit 2: `pressureClassModel` muda para união
   - Edit 3: `annotatePressureClass` atualizado + novo helper `derivePressureClassModel` exportado
   - Edit 4: construção de `sSecSegs` e `sLatSegs` popula os 2 campos
   - Edit 5: `modelLimitations.pressureClassModel` usa `derivePressureClassModel(allSegs)`
8. **Testes** (10 novos em `pressure-class.test.ts`) — 25/25 no arquivo
9. **Verificação:** `tsc 0 / vitest 836/836 / run-all 27/27`
10. **Documentação:** este task file + relatório + backlog
11. **Transição final** `current-task.md → aguardando_fechamento`
12. **Aguardando aprovação humana** para commit/push

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-22 | Claude Opus 4.7 | TASK-004B criada e executada. Pendência da TASK-004 mãe sobre pressão real por derivação RESOLVIDA. Mudança cirúrgica em `src/lib/layout/hydraulic-sizing.ts`: 2 campos opcionais novos em `HydraulicSegment` (`cumPrincipalHfM`, `adutoraHfM`); helper puro novo `derivePressureClassModel` exportado; `annotatePressureClass` ganha caminho `exact_per_derivation` quando dados disponíveis (fallback `hmt_conservative_inlet` preservado); `modelLimitations.pressureClassModel` detectado dinamicamente. 10 testes novos em `pressure-class.test.ts` (T04B-1..T04B-6 + 4 testes do helper). Suíte vitest: 826 → 836; tsc preservado em 0 erros. Fluxo TOOL-003 executado integralmente antes da implementação. Mapa Mestre, premissas, ADRs, regras bloqueantes, catálogo, BOM, PDF, UI/mapa, motor comercial intocados. Sem desnível por segmento (escopo proibido — task futura separada). Sem alteração em `secondary-sizing.ts`, `laterais.ts` ou geometria. |
