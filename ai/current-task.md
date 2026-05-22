---
task_id: TOOL-003
arquivo_task: tasks/TOOL-003-gpt-review-pos-handoff.md
classe: A
data_abertura: 2026-05-22
status: aguardando_fechamento
ultima_atualizacao: 2026-05-22T19:27:41-03:00
atualizado_por: humano:fechamento-implementacao
---

# TOOL-003 — Reduzir copy/paste com comando de GPT Review pós-handoff

## Objetivo

Eliminar copia-e-cola entre Claude Code e GPT, mantendo dois comandos seguros e modulares:

1. `/handoff-claude-report TASK-XXX` — já existente (TOOL-001).
2. `/gpt-review TASK-XXX` — novo, orquestra chamada real + validação + resumo executivo no terminal.

`/gpt-review` aborta se `ai/claude-report.md` estiver ausente, desatualizado ou com `task_id` divergente. Não duplica lógica de `/handoff-claude-report` (V1).

## Escopo permitido

- `.claude/commands/gpt-review.md`
- `scripts/ai/print-review-summary.mjs`
- `scripts/ai/__tests__/print-review-summary.test.mjs`
- `scripts/ai/__tests__/run-all.mjs` (se necessário)
- `ai/README.md`
- `ai/current-task.md` (este arquivo)
- `tasks/TOOL-003-gpt-review-pos-handoff.md`
- `docs/relatorios/2026-05-22-TOOL-003.md`
- `tasks/backlog.md`

## Escopo proibido

- `src/**` — todo o produto.
- Motor hidráulico, layout, PDF, catálogo, BOM, UI/mapa, proposta comercial.
- `docs/metodologia/01-regras-bloqueantes.md`.
- Automação de decisão humana, implementação, commit, push.
- Edição automatizada de `ai/decision-log.md`.
- Captura de `response.usage` real (fica para TOOL-004 futura).

## Invariantes específicas (herdadas de TOOL-001 V1)

- 7 invariantes permanentes (fonte única `scripts/ai/lib/invariants.mjs`).
- Override humano **não libera** violação de invariante permanente.
- `decision-log.md` append-only e editado **apenas pelo humano**.
- `gpt-review.md` com bloco JSON estruturado como fonte de verdade do validador.
- `validate-structure.mjs` é read-only sobre `current-task.md.status`.
- Responses API com `text.format: { type: "json_schema", strict: true }`.
- `OPENAI_MODEL` obrigatório via `.env.local`, sem default no código.

## Critérios de aceite

Detalhamento completo será feito no `/planejar TOOL-003`. Esboço:

- `/gpt-review TASK-XXX` criado em `.claude/commands/`.
- CLI `print-review-summary.mjs` criado, testável standalone.
- ≥ 3 testes do CLI passando em `run-all.mjs`.
- `/gpt-review` aborta se `claude-report.md` ausente/desatualizado.
- `ai/gpt-review.md` continua tendo parecer completo (salvo pelo `run-gpt-review.mjs` existente).
- Resumo executivo curto no terminal com campos mínimos definidos no task file.
- Humano continua decidindo via `decision-log.md` manualmente.
- `validate-structure`, `run-all.mjs`, `tsc` preservados.
- Nenhum arquivo de produto alterado.
