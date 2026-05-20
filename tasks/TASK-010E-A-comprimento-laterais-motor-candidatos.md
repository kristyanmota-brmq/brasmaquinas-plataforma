# TASK-010E-A — Métricas de comprimento de laterais no motor de candidatos

**Status:** `concluída`
**Prioridade:** `P2-importante`
**Área:** `layout / domínio`
**Criado em:** 2026-05-20
**Atualizado em:** 2026-05-20

---

## Objetivo

> Incluir 5 métricas geométricas de comprimento de laterais no `LayoutScore`, calculadas diretamente de `physicalColumns.comprimentoM`, sem solver hidráulico e sem `waterSource`. Expostas como métricas informativas, sem penalidade ativa no score. `secondaryLengthM` permanece `null` — ramais requerem `waterSource` + `principalCoords` → TASK-010E-B.

---

## Contexto

TASK-010D completou as métricas operacionais de setorização. Esta tarefa adiciona métricas de comprimento de rede do ponto de vista das laterais físicas. A normalização para inclusão no score aguarda calibração com dados de campo; o peso `WEIGHT_LATERAL_LENGTH = 0` permanece inativo até então.

> **Ramais/secundárias dependem de `waterSource`, `principalCoords` e `generateSecondaries()`. Ficam para TASK-010E-B.**

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/sprinkler-grid-optimizer.ts` | modificação | `LayoutScore` +5 campos; `OPTIMIZER_PARAMS.WEIGHT_LATERAL_LENGTH = 0`; `computeScore` calcula métricas; `buildSelectionReason` atualizado |
| `src/lib/layout/__tests__/sprinkler-grid-optimizer.test.ts` | modificação | +9 testes de métricas de laterais |
| `src/lib/layout/__tests__/optimizer-integration.test.ts` | modificação | Fixture `makeCandidate` +5 campos numéricos |
| `src/components/map/ProjectMap.tsx` | modificação | Seção "Comprimento geométrico de laterais" no painel do candidato |

---

## Critérios de aceite

- [x] `totalLateralLengthM`, `avgLateralLengthM`, `maxLateralLengthM`, `lateralLengthPerSprinklerM`, `lateralLengthPerHectareM` presentes e positivos em todo candidato com aspersores
- [x] `avgLateralLengthM ≈ totalLateralLengthM / physicalColumnCount`
- [x] `maxLateralLengthM ≥ avgLateralLengthM`
- [x] `secondaryLengthM` permanece `null`
- [x] `WEIGHT_LATERAL_LENGTH` em `OPTIMIZER_PARAMS`, marcado PENDENTE_CALIBRACAO_RT_CAMPO, valor = 0 (inativo)
- [x] `selectionReason` menciona comprimento de laterais e explicita que não inclui ramais
- [x] UI exibe 5 métricas com aviso "Não inclui principal, adutora nem ramais até captação."
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 573/573 (564 anteriores + 9 novos)

---

## Testes implementados

### `sprinkler-grid-optimizer.test.ts` (+9)

1. `totalLateralLengthM` é número positivo
2. `avgLateralLengthM = totalLateralLengthM / physicalColumnCount`
3. `maxLateralLengthM ≥ avgLateralLengthM`
4. `lateralLengthPerSprinklerM = totalLateralLengthM / sprinklerCount`
5. `lateralLengthPerHectareM > 0`
6. Polígono maior → `totalLateralLengthM` maior (sensibilidade ao tamanho)
7. `secondaryLengthM` permanece `null`
8. `selectionReason` menciona laterais, "não inclui principal", "ramais até captação"
9. `OPTIMIZER_PARAMS.WEIGHT_LATERAL_LENGTH = 0` (documentado como inativo)

---

## Fora do escopo

- `secondaryLengthM` calculado (requer `waterSource` + `principalCoords` → TASK-010E-B)
- `hydraulicBlockers` calculado (requer solver hidráulico)
- Penalidade de comprimento ativa no score (normalização pendente de calibração)
- Solver hidráulico, BOM, catálogo, setorização, `layout-schema.ts`
- Motor A/B/C, motor comercial
- `waterSource` como parâmetro do motor

---

## Dependências

**TASK-010D concluída ✅**

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | Tarefa criada e implementada |
