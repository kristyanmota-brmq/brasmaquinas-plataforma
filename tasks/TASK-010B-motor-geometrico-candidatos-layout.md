# TASK-010B — Motor geométrico inicial de candidatos de layout 12×12

**Status:** `concluída`
**Prioridade:** `P2-importante`
**Área:** `layout / domínio`
**Criado em:** 2026-05-20
**Atualizado em:** 2026-05-20

---

## Objetivo

> Criar `src/lib/layout/sprinkler-grid-optimizer.ts` — motor puro que gera e compara até 112 candidatos de disposição da malha 12×12 (ângulo × offset X/Y), pontua cada um com métricas geométricas e retorna o melhor candidato com justificativa textual.

---

## Contexto

TASK-010A extraiu `findOptimalGridAngle()` e `generateRotatedSprinklerGrid()` de `ProjectMap.tsx` para `sprinkler-grid.ts`. O motor atual usa apenas o ângulo que minimiza o bbox — sem testar offsets nem avaliar qualidade de borda.

Esta tarefa cria a base pura/testável para otimização de layout, sem ainda integrar setorização, hidráulica, topografia ou corredor. Essas camadas ficam para TASK-010C/010D.

**Métricas desta versão (geométricas):**
- `fillingRatio` — aspersores / máximo teórico
- `shortColumnRatio` — fração de colunas com < 3 aspersores
- `edgeQualityScore` — razão entre colunas de borda e colunas internas (heurística)

**Métricas explicitamente ausentes (null):**
- `sectionValveCount` — PENDENTE TASK-010C: requer setorização
- `fragmentedLateralRatio` — PENDENTE TASK-010C: requer setorização
- `secondaryLengthM` — PENDENTE TASK-010C: requer hidráulica completa
- `hydraulicBlockers` — PENDENTE TASK-010C: requer solver hidráulico

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/sprinkler-grid.ts` | modificação | Adicionada `generateRotatedSprinklerGridWithOffset()` |
| `src/lib/layout/sprinkler-grid-optimizer.ts` | **criação** | Motor de candidatos |
| `src/lib/layout/__tests__/sprinkler-grid.test.ts` | modificação | +3 testes para `generateRotatedSprinklerGridWithOffset` |
| `src/lib/layout/__tests__/sprinkler-grid-optimizer.test.ts` | **criação** | 12 testes novos |

---

## Critérios de aceite

- [x] `findBestSprinklerLayout(polygon, spacingMeters)` exportada de `sprinkler-grid-optimizer.ts`
- [x] `generateRotatedSprinklerGridWithOffset()` exportada de `sprinkler-grid.ts`
- [x] `generateRotatedSprinklerGrid()` original inalterada
- [x] Offset (0, 0) produz resultado equivalente à função original
- [x] Motor avalia entre 10 e 200 candidatos (sem explosão combinatória)
- [x] `sectionValveCount`, `fragmentedLateralRatio`, `secondaryLengthM`, `hydraulicBlockers` = `null`
- [x] `OPTIMIZER_PARAMS` exportado com todos os pesos marcados PENDENTE_CALIBRACAO_RT_CAMPO
- [x] `selectionReason` explica ângulo, offset, count, fillingRatio, colunas curtas, borda
- [x] `waterSource` não é parâmetro de nenhuma função do módulo
- [x] Motor não chama solver, BOM nem setorização
- [x] `ProjectMap.tsx` não alterado
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 545/545 (530 anteriores + 15 novos)

---

## Testes implementados

### `sprinkler-grid.test.ts` (+3)
1. `offset (0, 0) produz resultado equivalente a generateRotatedSprinklerGrid`
2. `offset não-zero gera posições diferentes do offset zero`
3. `todos os pontos com offset não-zero estão dentro do polígono`

### `sprinkler-grid-optimizer.test.ts` (+12)
1. `OPTIMIZER_PARAMS é exportado e contém todos os parâmetros pendentes`
2. `espaço de candidatos é limitado (entre 10 e 200)`
3. `retorna pelo menos 1 candidato válido para retângulo 120×60`
4. `melhor candidato tem fillingRatio > 0,5`
5. `melhor candidato tem shortColumnRatio < 0,4`
6. `score inclui edgeQualityScore e edgePenalty`
7. `campos pendentes de setorização e hidráulica permanecem null`
8. `posições do melhor candidato estão dentro do polígono`
9. `motor é determinístico — mesmo polígono produz o mesmo best`
10. `candidatos com offsets distintos têm posições distintas`
11. `selectionReason contém ângulo, aspersores, fillingRatio e aviso de calibração`
12. `motor não recebe waterSource e não expõe campos de solver ou BOM`

---

## Fora do escopo

- Não integramos o motor na UI (wiring = TASK-010C)
- Não calculamos sectionValveCount, fragmentedLateralRatio (requerem setorização)
- Não calculamos secondaryLengthM, hydraulicBlockers (requerem hidráulica)
- Não alteramos aspersor padrão, espaçamento, catálogo, BOM, setorização, solver
- Não implementamos motor A/B/C nem motor comercial

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Pesos WEIGHT_SHORT_COLUMN e WEIGHT_EDGE mal calibrados | alta | baixo | Marcados como PENDENTE_CALIBRACAO_RT_CAMPO; nenhuma decisão comercial depende destes pesos nesta versão |

**Dependências:** TASK-010A concluída ✅

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | Tarefa criada e implementada |
