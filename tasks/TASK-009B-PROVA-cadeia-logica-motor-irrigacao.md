# TASK-009B-PROVA — Prova da cadeia lógica do motor de irrigação

**Data:** 2026-05-19
**Status:** concluída
**Prioridade:** P1
**Tipo:** auditoria / documentação

## Objetivo

Provar, com dados concretos extraídos de execuções reais e testes automatizados, que a cadeia
lógica de `calculateIrrigationProject` é consistente de ponta a ponta — desde as posições dos
aspersores até a BOM final e o status hidráulico — identificando gaps, riscos e invariantes
verificáveis.

Não são permitidas correções de código nesta tarefa. Todo achado adverso deve ser registrado como
gap e classificado.

## Regras desta tarefa

- Não corrigir código.
- Não alterar solver, BOM, layout, setorização, ProjectMap, PDF.
- Não remover blockers.
- Não mascarar inconsistências.
- Se encontrar divergência, registrar como gap.
- Só criar relatório e, se necessário, testes de invariantes.
- Se algum teste falhar, não corrigir sem aprovação.

## Entregáveis

1. Este arquivo de tarefa (`tasks/TASK-009B-PROVA-cadeia-logica-motor-irrigacao.md`)
2. Relatório de prova (`docs/relatorios/2026-05-19-prova-cadeia-logica-motor.md`)
   - Tabela da cadeia lógica: etapa / função / arquivo / entrada / saída / consumidor / status
   - Grafo de chamadas real de `calculateIrrigationProject`
   - Prova de dados do fixture L (tabela de métricas com valores concretos)
   - Prova de rastreabilidade de IDs ao longo da cadeia
   - Classificação de todos os achados (OK / gap técnico / gap visual / gap topológico /
     gap de governança / pendente)
   - 13 perguntas mandatórias respondidas com citação de arquivo, função e teste
   - Sumário executivo com riscos e recomendações

## Testes de invariante

Verificar se os seguintes invariantes já têm cobertura. Criar apenas os que estiverem ausentes:

- [ ] `nLaterais = nOperationalSegments` (toda lateral operacional gera exatamente uma lateral)
- [ ] `nColunasLaterais = physical.nColumns` (BOM não duplica colunas)
- [ ] Todos os aspersores cobertos por physicalColumns (sem sprinklersWithoutPhysicalColumn)
- [ ] `inletSideMismatchCount = 0` após D2 (lateral_inlet aponta para extremo correto)
- [ ] `secondary.toCoord ≈ lateral_inlet.coordinate` dentro de tolerância geométrica

## Critérios de aceite

- [ ] Relatório gerado em `docs/relatorios/2026-05-19-prova-cadeia-logica-motor.md`
- [ ] Todas as 13 perguntas respondidas com citação de arquivo/função/teste
- [ ] Nenhuma inconsistência mascarada — gaps registrados como tal
- [ ] `npx tsc --noEmit` → 0 erros após criação de novos testes
- [ ] `npx vitest run` → contagem ≥ 522 (sem regressão)

## Arquivos relevantes lidos

- `src/lib/layout/irrigation-project.ts` — orquestrador, 509 linhas
- `src/lib/layout/laterais.ts` — PhysicalColumn, Lateral, 461 linhas
- `src/lib/layout/sectorization.ts` — OperationalSegment, 308 linhas
- `src/lib/layout/hydraulic-connectivity.ts` — SecondaryPipe, 284 linhas
- `src/lib/layout/constructability.ts` — ControlPoint, 304 linhas
- `src/lib/layout/hydraulic-sizing.ts` — solver HW, 838 linhas
- `src/lib/bom.ts` — buildBOM, generateProposalDiagnostics, 818 linhas
- `src/lib/layout/map-consistency.ts` — buildMapNetworkConsistencyReport, 187 linhas
- `src/lib/layout/__tests__/integration.test.ts` — T8, T9, T10
- `src/lib/layout/__tests__/fixtures.ts` — makeLayoutL, makeLayoutP
- `src/lib/layout/__tests__/map-consistency.test.ts` — T009A, T009B

## Resultado

Concluída. Relatório gerado em `docs/relatorios/2026-05-19-prova-cadeia-logica-motor.md`.

Achados classificados:
- **12 invariantes OK** — cadeia consistente do aspersor à BOM
- **3 gaps técnicos** — modelo de pressão conservativo, diâmetro único na principal, desnível
- **2 gaps de governança** — bomba e desnível não informados
- **1 pendente esperado** — section_valves aguardam modelagem
- **0 gaps visuais ou topológicos** após correções D1 e D2 (TASK-009B)
