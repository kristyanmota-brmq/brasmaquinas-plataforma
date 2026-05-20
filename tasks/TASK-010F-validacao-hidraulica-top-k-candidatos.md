# TASK-010F — Validação hidráulica Top-K dos candidatos de layout

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** layout / domínio / hidráulica
**Criada em:** 2026-05-20
**Concluída em:** 2026-05-20
**Testes ao concluir:** 597/597 · TypeScript: 0 erros
**Relatório:** `docs/relatorios/2026-05-20-TASK-010F.md`
**Depende de:** TASK-010E-B ✅

---

## Objetivo

Implementar validação hidráulica dos Top K candidatos geométricos do motor de layout,
usando exclusivamente o solver oficial `calculateIrrigationProject()` — sem estimador paralelo.

---

## Escopo implementado

### Função nova: `runTopKHydraulicValidation`

```typescript
function runTopKHydraulicValidation(
  selectionResult: LayoutSelectionResult,
  options: TopKHydraulicOptions
): LayoutSelectionResult
```

- Avalia os `TOP_K_HYDRAULIC_CANDIDATES` (= 5) melhores candidatos geométricos
- Para cada: constrói `ProjectLayout` temporário e chama `calculateIrrigationProject()`
- Extrai `diagnostics.blockers` como `HydraulicBlockerReal[]`
- Aplica `- WEIGHT_HYDRAULIC_BLOCKER` (= 0.50) por blocker detectado
- Re-elege `best` restrito ao Top K avaliado

### Tipos exportados

- `HydraulicEvaluationStatus` — 7-valor union rastreando estado por candidato
- `HydraulicBlockerReal` — `{ source: "diagnostics_blocker"; message: string }`
- `TopKHydraulicOptions` — opções para validação (polygon, spacing, waterSource, pump, geodetic, nSetores)

### `LayoutScore` estendido

Quatro novos campos hidráulicos (todos `null` enquanto não avaliado):
- `hydraulicBlockers: HydraulicBlockerReal[] | null`
- `hydraulicEvaluationStatus: HydraulicEvaluationStatus | null`
- `hydraulicHmtRequiredMca: number | null`
- `hydraulicInvalidSegmentsCount: number | null`

### `OPTIMIZER_PARAMS` estendido

- `TOP_K_HYDRAULIC_CANDIDATES: 5` — `PREMISSA_PROVISORIA_MERCADO`
- `WEIGHT_HYDRAULIC_BLOCKER: 0.50` — `PREMISSA_PROVISORIA_MERCADO`

### UI — `ProjectMap.tsx`

- Botão "Validar hidráulica dos melhores candidatos" separado do geométrico
- Spinner durante validação (`hydraulic_running`)
- Painel de resultado: verde/sem blockers, vermelho/com blockers por candidato Top K
- Hint quando `waterSource` ou `pump` ausentes

### Documentação

- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — 2 novas entradas

---

## Arquitetura de dois passos

```
Passo 1 (geométrico):  findBestSprinklerLayout() — 112 candidatos, sem solver
Passo 2 (hidráulico):  runTopKHydraulicValidation() — Top K apenas, solver oficial
```

Ambos os passos são explícitos e separados. `findBestSprinklerLayout` permanece geométrico.

---

## Critérios de aceite

- [x] `runTopKHydraulicValidation` separado de `findBestSprinklerLayout`
- [x] Blockers originam exclusivamente de `diagnostics.blockers` (solver oficial)
- [x] `estimateHydraulicBlockers()` NÃO implementado
- [x] `calculateIrrigationProject` não modificado
- [x] `best` após validação restrito ao Top K avaliado
- [x] Geodetic ausente → warning na selectionReason, não bloqueio
- [x] 13 novos testes passando
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 597/597 (≥ 584)
- [x] TOP_K e WEIGHT_HYDRAULIC_BLOCKER documentados como PREMISSA_PROVISORIA_MERCADO

---

## Premissas provisórias geradas

| Parâmetro | Valor | Status |
|-----------|-------|--------|
| `TOP_K_HYDRAULIC_CANDIDATES` | `5` | `PENDENTE_REVISAO_RT_BRASMAQUINAS` |
| `WEIGHT_HYDRAULIC_BLOCKER` | `0.50` | `PENDENTE_REVISAO_RT_BRASMAQUINAS` |

---

## Limitações conhecidas e pendências

1. Calibração de `TOP_K_HYDRAULIC_CANDIDATES` e `WEIGHT_HYDRAULIC_BLOCKER` com dados de campo
2. Sem desnível geodético individual por candidato — avaliação usa desnível único da opção
3. Validação manual do painel hidráulico em browser ainda pendente

---

## Próxima tarefa natural

`TASK-010Z — Consolidação do motor de layout 12×12`
