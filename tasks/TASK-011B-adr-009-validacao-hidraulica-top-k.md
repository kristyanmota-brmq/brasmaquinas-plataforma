# TASK-011B — ADR-009 Validação hidráulica Top-K dos candidatos de layout

**Status:** `concluída`
**Prioridade:** P2-importante
**Área:** documentação / governança / decisões arquiteturais
**Criada em:** 2026-05-20
**Concluída em:** 2026-05-20
**Testes ao concluir:** 597/597 · TypeScript: 0 erros
**Relatório:** `docs/relatorios/2026-05-20-TASK-011B.md`
**Depende de:** TASK-010F ✅

---

## Objetivo

Criar ADR-009 registrando as decisões estruturais tomadas na TASK-010F que não foram
documentadas em ADR próprio no momento da implementação.

---

## Escopo implementado

### Arquivo criado

`docs/decisoes/ADR-009-validacao-hidraulica-top-k-candidatos-layout.md`

10 decisões registradas:
1. Separação `findBestSprinklerLayout` / `runTopKHydraulicValidation`
2. Validação hidráulica somente por ação explícita do usuário
3. Uso exclusivo do solver oficial `calculateIrrigationProject()`
4. Proibição de solver hidráulico paralelo
5. `TOP_K_HYDRAULIC_CANDIDATES = 5` como premissa provisória
6. `best` restrito ao Top K avaliado
7. `jornadaHoras=9` como placeholder técnico
8. `geodetic` ausente → warning, não blocker
9. `WEIGHT_HYDRAULIC_BLOCKER = 0.50` como premissa provisória
10. Pendência de revisão futura pela Brasmáquinas

3 alternativas descartadas com justificativa:
- Solver paralelo (`estimateHydraulicBlockers`)
- Solver em todos os 112 candidatos
- Avaliação automática pós-geométrico

---

## Critérios de aceite

- [x] `docs/decisoes/ADR-009-...md` criado
- [x] 10 decisões documentadas com justificativa
- [x] 3 alternativas descartadas documentadas
- [x] Nenhum arquivo em `src/` alterado
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 597/597

---

## Próxima tarefa natural

Calibração RT de campo — `OPTIMIZER_PARAMS`
