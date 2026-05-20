# TASK-010D — Métricas operacionais de setorização no motor de candidatos de layout

**Status:** `concluída`
**Prioridade:** `P2-importante`
**Área:** `layout / domínio`
**Criado em:** 2026-05-20
**Atualizado em:** 2026-05-20

---

## Objetivo

> Evoluir `findBestSprinklerLayout()` para incluir métricas operacionais de setorização no score de cada candidato, quando o número de setores da jornada (`nSetores`) é fornecido e válido. Manter retrocompatibilidade total com chamadas sem `nSetores`.

---

## Contexto

TASK-010C integrou o motor de candidatos à UI sem métricas de setorização. Esta tarefa preenche `sectionValveCount`, `fragmentedLateralRatio`, `fragmentedColumnCount`, `operationalSegmentsCount`, `maxSegmentsPerColumn` e `desbalanceamentoPercent` no `LayoutScore`, reutilizando `buildSectorsByFlowWithColumnSplitting()` (já existente em `sectorization.ts`). `secondaryLengthM` e `hydraulicBlockers` permanecem `null` — requerem solver hidráulico.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/sprinkler-grid-optimizer.ts` | modificação | `LayoutScore` estendido; `validateNSetores()`; `OPTIMIZER_PARAMS` +3 pesos; `computeScore` integra sectorização; `buildSelectionReason` atualizado; `findBestSprinklerLayout` aceita `nSetores?` |
| `src/lib/layout/__tests__/sprinkler-grid-optimizer.test.ts` | modificação | +12 testes de métricas operacionais |
| `src/lib/layout/__tests__/optimizer-integration.test.ts` | modificação | Fixture `makeCandidate` atualizada com 6 novos campos `null` |
| `src/components/map/ProjectMap.tsx` | modificação | `runOptimizer` passa `nSetores`; painel exibe métricas operacionais ou hint de jornada |

---

## Critérios de aceite

- [x] `nSetores` validado: inteiro, >0, ≤ sprinklerCount — inválido → métricas `null`, sem throw
- [x] Com `nSetores` válido, `sectionValveCount` é número (não null)
- [x] Com `nSetores` válido, `fragmentedLateralRatio` ∈ [0, 1]
- [x] Com `nSetores` válido, `desbalanceamentoPercent ≥ 0`
- [x] `sectionValveCount ≤ operationalSegmentsCount`
- [x] `operationalSegmentsCount ≥ nSetores`
- [x] Sem `nSetores`, todas as métricas operacionais permanecem `null`
- [x] `selectionReason` menciona registros/fragmentação/aviso quando métricas disponíveis
- [x] `selectionReason` menciona "selecione uma jornada" quando métricas indisponíveis
- [x] `OPTIMIZER_PARAMS` contém `WEIGHT_SECTION_VALVE`, `WEIGHT_FRAGMENTATION`, `WEIGHT_IMBALANCE`
- [x] Todos os novos pesos marcados `PENDENTE_CALIBRACAO_RT_CAMPO`
- [x] Motor nunca chama solver hidráulico, BOM ou catálogo
- [x] `secondaryLengthM` e `hydraulicBlockers` permanecem `null`
- [x] UI exibe métricas operacionais com label "preliminares" quando disponíveis
- [x] UI exibe hint "Selecione uma jornada…" quando métricas são null
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 564/564 (552 anteriores + 12 novos)

---

## Testes implementados

### `sprinkler-grid-optimizer.test.ts` (+12)

1. `sectionValveCount` é número com `nSetores` válido
2. `fragmentedLateralRatio` ∈ [0, 1] com `nSetores` válido
3. `desbalanceamentoPercent ≥ 0` com `nSetores` válido
4. `sectionValveCount ≤ operationalSegmentsCount`
5. `operationalSegmentsCount ≥ nSetores`
6. Sem `nSetores`, métricas operacionais permanecem `null` (retrocompatibilidade)
7. `nSetores = 0` → métricas `null`, sem throw
8. `nSetores = 2.5` (não inteiro) → métricas `null`, sem throw
9. `selectionReason` com `nSetores` menciona registros de seção, colunas fragmentadas, aviso de calibração e aviso de não substituir validação hidráulica
10. `selectionReason` sem `nSetores` menciona "selecione uma jornada"
11. `OPTIMIZER_PARAMS` contém `WEIGHT_SECTION_VALVE`, `WEIGHT_FRAGMENTATION`, `WEIGHT_IMBALANCE`
12. Com `nSetores`, resultado é determinístico

---

## Fora do escopo

- `secondaryLengthM` e `hydraulicBlockers` (requerem solver hidráulico por candidato)
- Motor A/B/C, solver hidráulico, BOM, catálogo
- Topografia e corredor de tubulação
- Homologação dos pesos (requer RT de campo)
- Alterações em `layout-schema.ts`, `sectorization.ts`, `irrigation-project.ts`

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Usuário interpreta métricas operacionais como definitivas | baixa | médio | Label "preliminares — não substituem validação hidráulica" em dois pontos (selectionReason + UI) |
| Pesos sem calibração produzem ranking inadequado | alta (curto prazo) | baixo | Marcador `PENDENTE_CALIBRACAO_RT_CAMPO` explícito; feature é experimental |

**Dependências:** TASK-010C concluída ✅

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | Tarefa criada e implementada |
