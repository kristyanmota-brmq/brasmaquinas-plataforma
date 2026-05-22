---
task_id: TASK-001
arquivo_task: tasks/TASK-001-diagnostico-software-atual.md
classe: A
data_abertura: 2026-05-22
status: aguardando_fechamento
ultima_atualizacao: 2026-05-22T20:27:13-03:00
atualizado_por: humano:fechamento-implementacao-TASK-001
---

# TASK-001 — Diagnóstico formal do software atual

## Objetivo

Produzir diagnóstico formal do estado atual do software de aspersão convencional, em forma de relatório único em `docs/relatorios/2026-05-22-TASK-001.md`, reconciliando o arquivo original da TASK-001 (criado 2026-05-19, `pendente`) com o estado real do repositório em 2026-05-22 (826 testes; 0 erros tsc; 15 ADRs; 9 épicos do Mapa Mestre TASK-024E; ~14 premissas provisórias; 53 relatórios anteriores; último commit `6debfd4` TOOL-003 em `origin/main`).

O diagnóstico **substitui conceitualmente** o predecessor `docs/relatorios/2026-05-19-diagnostico-software-atual.md` (commit `23609bc`, 400 testes — desatualizado em 7 dias). O predecessor é **preservado fisicamente** como registro histórico.

## Natureza

**Classe A — estritamente documental.** Não modifica código de produto. Não cria ADR novo. Não altera regras bloqueantes. Não altera premissas provisórias (inventaria, não modifica).

## Escopo permitido

- `docs/relatorios/2026-05-22-TASK-001.md` (criar)
- `tasks/TASK-001-diagnostico-software-atual.md` (atualizar: status, critérios, plano executado, log)
- `tasks/backlog.md` (atualizar: entrada TASK-001 concluída + ajuste bloqueio TASK-002)
- `ai/current-task.md` (este arquivo — ciclo de governança)
- `ai/claude-report.md` (via `/handoff-claude-report`)
- `ai/gpt-review.md` (via `scripts/ai/run-gpt-review.mjs` chamado por `/gpt-review`)
- `ai/decision-log.md` (apenas pelo humano, append-only)

## Escopo proibido

- `src/**` — todo o produto (motor hidráulico, layout, catálogo, BOM, PDF, UI/mapa).
- `tasks/TASK-024-mapa-mestre-tasks.md` — consumir, não rescrever (TASK-024E acabou de padronizar).
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — inventariar, não alterar valores nem status.
- `docs/metodologia/01-regras-bloqueantes.md` — não criar `RB-09` nem alterar regras.
- Criação de ADR novo (diagnóstico **inventaria** decisões, não decide novas).
- Criação de feature, refatoração, seed, alteração de dados.
- Automação de decisão humana, edição programática de `decision-log.md`.
- Commit, push, deps novas.
- Substituição física do diagnóstico predecessor `2026-05-19-diagnostico-software-atual.md`.

## Fluxo obrigatório (Classe A)

```
/iniciar-task TASK-001           [executado nesta sessão]
   ↓
/planejar TASK-001                [executado nesta sessão — aprovado com ajustes]
   ↓
/handoff-claude-report TASK-001   [próximo passo — serializa plano em ai/claude-report.md]
   ↓
/gpt-review TASK-001              [orquestra Responses API + validate-structure + resumo]
   ↓
[Humano lê ai/gpt-review.md + edita ai/decision-log.md + transita status]
   ↓
/implementar TASK-001             [só após decisão humana registrada]
   ↓
/fechar-task TASK-001
```

## Verificações de não-regressão

Sem testes novos (Classe A documental). Verificações obrigatórias preservadas:

- `npx tsc --noEmit` → **0 erros** (preservado)
- `npx vitest run` → **826/826 passando** (preservado)
- `node scripts/ai/__tests__/run-all.mjs` → **27/27 passando** (preservado)

## Predecessor operacional

TOOL-003 — Reduzir copy/paste com comando de GPT Review pós-handoff (concluída 2026-05-22, commit `6debfd4` em `origin/main`, terminal estável `aguardando_fechamento`). A presente task usa o fluxo TOOL-003 (`/handoff-claude-report` + `/gpt-review`) em produção pela primeira vez fora da própria validação interna.
