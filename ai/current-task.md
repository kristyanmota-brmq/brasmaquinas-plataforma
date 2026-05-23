---
task_id: TASK-004B
arquivo_task: tasks/TASK-004B-pressao-real-derivacao.md
classe: A
data_abertura: 2026-05-22
status: aguardando_fechamento
ultima_atualizacao: 2026-05-22T21:22:32-03:00
atualizado_por: humano:fechamento-implementacao-TASK-004B
---

# TASK-004B — Pressão real por derivação / cumPrincipalHfM

## Objetivo

Substituir o cálculo conservador de pressão em ramais e laterais (HMT como teto único) por **pressão real por derivação**: `pressaoOperacionalMaxMca = HMT − (hfAdutora + cumPrincipalHfM até a derivação)`. Isso transforma `violation_conservative` em `ok` (quando pressão real ≤ PN) ou em `violation_confirmed` (quando pressão real > PN), aumentando precisão do diagnóstico de PN sem alterar catálogo, BOM, PDF, UI/mapa, motor comercial ou premissas RT.

## Natureza

**Classe A — motor hidráulico.** Follow-up direto da pendência registrada na TASK-004 mãe (concluída em 2026-05-19): *"pressão real por derivação para ramal/lateral (requer `cumPrincipalHfM` no segmento)"*. ADR-008 (Alternativa C) reservou explicitamente esta implementação para tarefa futura — esta é a tarefa.

## Escopo permitido

- `src/lib/layout/hydraulic-sizing.ts` (5 pontos cirúrgicos: tipos `HydraulicSegment` e `HydraulicModelLimitations`; função `annotatePressureClass`; construção de `sSecSegs` e `sLatSegs` no solver; lógica de `pressureClassModel` em `modelLimitations`)
- `src/lib/layout/__tests__/pressure-class.test.ts` (≥ 6 testes novos T04B-1..T04B-6; helper `makeSeg` ganha parâmetros opcionais; **nenhum teste existente alterado**)
- `tasks/TASK-004B-pressao-real-derivacao.md` (criar)
- `tasks/backlog.md` (atualizar header; adicionar entrada TASK-004B; ajustar pendências da TASK-004 mãe linha 118)
- `docs/relatorios/2026-05-22-TASK-004B.md` (criar; ~250-350 linhas)
- `ai/current-task.md` (este arquivo — ciclo de governança)
- `ai/claude-report.md` (via `/handoff-claude-report`)
- `ai/gpt-review.md` (via `scripts/ai/run-gpt-review.mjs` invocado por `/gpt-review`)
- `ai/decision-log.md` (apenas pelo humano, append-only)

## Escopo proibido

- `src/lib/catalog/aspersores.ts` — catálogo read-only (RB-04)
- `src/lib/bom.ts` — BOM intocada
- `src/lib/pdf/**` — PDF intocado
- `src/components/**`, `src/app/**` — UI e API intocadas (RB-06)
- `src/lib/layout/secondary-sizing.ts` — não cuida de PN no segmento (apenas seleção de tubo)
- `src/lib/layout/laterais.ts`, `sectorization.ts`, `constructability.ts`, `network-angle-diagnostics.ts`, `sprinkler-grid.ts`, `irrigation-project.ts` — geometria preservada (RB-08)
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — premissas inventariadas, não alteradas
- `docs/metodologia/01-regras-bloqueantes.md` — não criar `RB-09`
- `docs/metodologia/03-hidraulica.md` — não atualizar nesta task
- `docs/decisoes/ADR-008-validacao-pn-classe-pressao-tubos.md` — não criar emenda; não criar ADR-016
- `tasks/TASK-024-mapa-mestre-tasks.md` — Mapa Mestre não alterado (fonte)
- Inclusão de desnível geodético por segmento — explicitamente fora do escopo desta task (pendência irmã, task futura separada)
- Inclusão de perdas locais proporcionais — fora do escopo V1 (fórmula nível mínimo)
- Alteração de qualquer parâmetro hidráulico (`MAX_VELOCITY_RAMAL_MS`, `MAX_HEADLOSS_RAMAL_MCA`, `DEFAULT_SAFETY_MARGIN_MCA`, `DEFAULT_LOCAL_LOSS_FACTOR_PERCENT`)
- Criação de feature, refatoração ampla, seed, alteração de dados
- Automação de decisão humana, edição programática de `ai/decision-log.md`
- Commit, push, dependências npm novas

## Verificações de não-regressão

- `npx tsc --noEmit` → **0 erros** (preservado)
- `npx vitest run` → **≥ 832/832** (826 atual + 6 novos T04B; sem regressão)
- `node scripts/ai/__tests__/run-all.mjs` → **27/27 passando** (preservado)
- HMT do Projeto A permanece 41,3 mca (solver não muda)
- BOM do Projeto A permanece R$ 213.740,15 (não afetada por classificação de PN)

## Fluxo TOOL-003 obrigatório (em execução)

```
/iniciar-task TASK-004B           [executado]
   ↓
/planejar TASK-004B                [executado — plano aprovado]
   ↓
/handoff-claude-report TASK-004B   [em execução]
   ↓
/gpt-review TASK-004B              [próximo]
   ↓
[Humano lê ai/gpt-review.md + edita ai/decision-log.md + transita status]
   ↓
/implementar TASK-004B             [após decisão humana registrada]
   ↓
/fechar-task TASK-004B
```

## Predecessor operacional

TASK-001 — Diagnóstico formal do software atual (concluída 2026-05-22, commit `427539e` em `origin/main`, terminal estável `aguardando_fechamento`). TASK-004B é a primeira recomendação Classe A executável da Seção 12.2 do diagnóstico TASK-001.
