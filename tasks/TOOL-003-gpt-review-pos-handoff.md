# TOOL-003 — Reduzir copy/paste com comando de GPT Review pós-handoff

**Status:** `aguardando_fechamento` (terminal estável; aguarda aprovação humana de commit/push)
**Classe:** A — tooling / governança
**Área:** infraestrutura / handoff / governança / DX
**Predecessor:** TOOL-002 (handoff real Claude Code ↔ GPT Reviewer homologado; `aguardando_fechamento` terminal estável)
**Data de abertura:** 2026-05-22
**Data de conclusão de implementação:** 2026-05-22
**Relatório:** [`docs/relatorios/2026-05-22-TOOL-003.md`](../docs/relatorios/2026-05-22-TOOL-003.md)

---

## Objetivo

Eliminar o copia-e-cola entre Claude Code (VS Code) e GPT (ChatGPT) durante o ciclo de revisão LLM, mantendo **dois comandos seguros e modulares**:

1. `/handoff-claude-report TASK-XXX` — já existente (TOOL-001). Serializa o plano para `ai/claude-report.md`.
2. `/gpt-review TASK-XXX` — **novo (esta task)**. Orquestra a chamada real à Responses API, validação estrutural e impressão de resumo executivo no terminal.

**Não é** um comando único de ponta a ponta. A separação preserva:
- Segurança: `/handoff-claude-report` continua exigindo preview + confirmação humana antes de gravar.
- Modularidade: `/gpt-review` aborta se `ai/claude-report.md` estiver ausente, desatualizado ou com `task_id` divergente, instruindo o usuário a rodar `/handoff-claude-report TASK-XXX` antes.
- Reuso: o CLI `print-review-summary.mjs` é testável e usável fora do Claude.

---

## O que `/gpt-review TASK-XXX` faz

1. Valida que `ai/claude-report.md` existe e está atualizado para `TASK-XXX` (extrai `task_id` do header). Se inconsistente, aborta com:
   > "Rode primeiro `/handoff-claude-report TASK-XXX` e depois `/gpt-review TASK-XXX`."
2. Executa `node scripts/ai/run-gpt-review.mjs --task TASK-XXX` (chamada real à Responses API).
3. Se HTTP ≠ 200 ou JSON malformado: aborta com mensagem clara, **sem retry automática**.
4. Executa `node scripts/ai/validate-structure.mjs --task TASK-XXX`.
5. Executa `node scripts/ai/print-review-summary.mjs --task TASK-XXX` (novo CLI desta task).
6. Para antes de qualquer decisão humana. **Não edita `ai/decision-log.md`.**

## Resumo executivo no terminal (campos mínimos)

- `task_id`
- `status atual` (de `ai/current-task.md`)
- `veredito_gpt`
- `quantidade de blockers`
- `invariantes_violadas` (contagem)
- `override_permitido_derivado` (do validator, não o declarado pelo GPT)
- `resultado_validate_structure` (OK / FAIL / WARN)
- `tokens_prompt`, `tokens_completion`, `custo_estimado_usd` (com nota de limitação V1, herdada da TOOL-002)
- `elapsed_ms` (da chamada API, se disponível)
- `path` para `ai/gpt-review.md`
- `proxima_acao_humana_recomendada`

---

## Escopo permitido

- `.claude/commands/gpt-review.md`
- `scripts/ai/print-review-summary.mjs`
- `scripts/ai/__tests__/print-review-summary.test.mjs`
- `scripts/ai/__tests__/run-all.mjs` (se necessário, para incluir o novo teste)
- `ai/README.md`
- `ai/current-task.md`
- `tasks/TOOL-003-gpt-review-pos-handoff.md` (este arquivo)
- `docs/relatorios/2026-05-22-TOOL-003.md`
- `tasks/backlog.md`

## Escopo proibido

- `src/**` — todo o produto.
- Motor hidráulico, layout, PDF, catálogo, BOM, UI/mapa.
- `docs/metodologia/01-regras-bloqueantes.md`.
- Automação de decisão humana, implementação, commit, push.
- Edição automatizada de `ai/decision-log.md`.
- Captura de `response.usage` real (fica para TOOL-004 futura).

---

## Critérios de aceite (status final)

- [x] Comando `/gpt-review TASK-XXX` criado em `.claude/commands/gpt-review.md`.
- [x] CLI `scripts/ai/print-review-summary.mjs` criado, testável standalone.
- [x] Testes do CLI (7 cenários T20–T26) passando em `scripts/ai/__tests__/run-all.mjs`.
- [x] `/gpt-review` aborta se `ai/claude-report.md` ausente/desatualizado (gravado no command markdown).
- [x] Parecer completo continua salvo em `ai/gpt-review.md` via `run-gpt-review.mjs` (não tocado).
- [x] Resumo curto impresso no terminal com todos os campos mínimos.
- [x] Humano continua decidindo via `ai/decision-log.md` manualmente (não automatizado).
- [x] `node scripts/ai/__tests__/run-all.mjs` passa **27/27** (era 20/20).
- [x] `npx tsc --noEmit` → 0 erros (preservado).
- [x] Nenhum arquivo de produto alterado (escopo proibido `src/**` respeitado integralmente).

---

## Rastreabilidade

- Predecessor: TOOL-002 (`docs/relatorios/2026-05-22-TOOL-002.md`).
- Conflito de naming resolvido: TOOL-002 sugeriu TOOL-003 para captura de `response.usage`; briefing humano atual atribui TOOL-003 a orquestração single-command pós-handoff. Captura de `usage` → **TOOL-004** futura.
- Plano completo será gerado por `/planejar TOOL-003`.
