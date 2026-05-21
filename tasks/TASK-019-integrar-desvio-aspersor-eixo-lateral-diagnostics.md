# TASK-019 — Integrar desvio aspersor-eixo da lateral em diagnostics

**Status:** `concluída`
**Concluída em:** 2026-05-20 · 686/686 testes · 0 erros tsc
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / diagnósticos
**Dependência:** TASK-018 ✅ (`maxSprinklerAxisDeviationM` exportada)

---

## Contexto

A TASK-018 corrigiu o eixo canônico das laterais físicas e exportou
`maxSprinklerAxisDeviationM(col, positions, centroid)` como função pura.

Regra operacional confirmada pela Brasmáquinas:
**O buraco aberto para instalar a rede lateral é o mesmo buraco onde o aspersor
será instalado. Todo aspersor deve estar sobre a lateral física que o atende.**

Consequência: desvio aspersor → eixo da lateral acima de
`TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m` é **blocker**, não warning.
A tolerância é numérica/cartográfica, não permissão de campo.

---

## Objetivo

Integrar `maxSprinklerAxisDeviationM` ao fluxo oficial de diagnósticos:

1. Exportar `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0.10` de `laterais.ts`
2. Criar `AxisDeviationViolation` e `AxisDeviationReport` em `laterais.ts`
3. Criar `detectAxisDeviations(cols, positions, centroid)` em `laterais.ts`
4. Integrar chamada no orquestrador `calculateIrrigationProject()`
5. Adicionar `axisDeviation: AxisDeviationReport | null` em `IrrigationProjectResult`
6. Passar para `generateProposalDiagnostics()` como 5° parâmetro opcional
7. Emitir blocker com texto "Aspersor fora do eixo da lateral física"
8. Atualizar premissa em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`

---

## Regras de não-alteração

- Aspersor padrão: não alterar
- Espaçamento 12×12: não alterar
- Solver hidráulico: não alterar
- BOM de materiais: não alterar
- Catálogo: não alterar
- PDF (rota/componente): não alterar
- `ProjectMap.tsx`: não alterar
- Motor A/B/C: não alterar

---

## Critérios de aceite

- [ ] `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0.10` exportado de `laterais.ts`
- [ ] `detectAxisDeviations` exportada e integrada no orquestrador
- [ ] `axisDeviation` presente em `IrrigationProjectResult` e nos resultados incompletos
- [ ] Desvio > 0,10 m → `diagnostics.blockers` contém "Aspersor fora do eixo da lateral física"
- [ ] Desvio ≤ 0,10 m → nenhum blocker de eixo
- [ ] `pdfEmissionBlockers()` retorna o blocker automaticamente (gate existente)
- [ ] Premissa atualizada: valor 0,10 m, decisão operacional, severidade blocker
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → 686/686 passando (678 + 8 novos)

---

## Testes obrigatórios

| ID | Arquivo | Cenário |
|----|---------|---------|
| T19-a | `physical-column-audit.test.ts` | Grid flat → violations = [] |
| T19-b | `physical-column-audit.test.ts` | dev = 0,04 m < 0,10 → sem blocker |
| T19-c | `physical-column-audit.test.ts` | dev = 0,40 m > 0,10 → violations.length = 1 |
| T19-d | `physical-column-audit.test.ts` | 1 de 2 colunas violadora |
| T19-e | `physical-column-audit.test.ts` | Coluna com 1 aspersor → dev = 0 |
| T19-f | `integration.test.ts` | calculateIrrigationProject com violação → blocker no texto |
| T19-g | `integration.test.ts` | Grid correto → zero blockers de eixo |
| T19-h | `integration.test.ts` | pdfEmissionBlockers retorna a mensagem |
