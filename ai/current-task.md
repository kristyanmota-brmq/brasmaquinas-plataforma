---
task_id: TOOL-002
arquivo_task: tasks/TOOL-002-homologar-fluxo-real-gpt-reviewer.md
classe: A
data_abertura: 2026-05-22
status: aguardando_fechamento
ultima_atualizacao: 2026-05-22T18:30:57-03:00
atualizado_por: humano:edicao-manual-fase5
---

# TOOL-002 — Homologar fluxo real Claude Code ↔ GPT Reviewer

## Objetivo

Homologar o fluxo real do handoff com **primeira chamada real à Responses API**, validando o ciclo end-to-end:

1. Plano via `/planejar` TOOL-002.
2. `/handoff-claude-report TOOL-002` → `ai/claude-report.md`.
3. `node scripts/ai/run-gpt-review.mjs --task TOOL-002` → chamada real → `ai/gpt-review.md` com JSON canônico.
4. `node scripts/ai/validate-structure.mjs --task TOOL-002` → OK.
5. Decisão humana em `ai/decision-log.md` (append-only).
6. Nenhuma aprovação automática.

Endereça pendência **R1** de `docs/relatorios/2026-05-22-TOOL-001.md`.

## Escopo permitido

- `ai/current-task.md` (este arquivo).
- `ai/claude-report.md` (via `/handoff-claude-report`).
- `ai/gpt-review.md` (via `run-gpt-review.mjs`).
- `ai/decision-log.md` (append-only).
- `ai/project-state.md` (opcional).
- `tasks/TOOL-002-homologar-fluxo-real-gpt-reviewer.md` (escopo + critérios).
- `docs/relatorios/2026-05-22-TOOL-002.md` (relatório de fechamento).
- Eventualmente documentação metodológica pequena (γ), se o plano justificar.

## Escopo proibido

- `src/**` — todo o produto.
- Motor hidráulico, layout, PDF, catálogo, BOM, UI/mapa, proposta comercial.
- `docs/metodologia/01-regras-bloqueantes.md` — promoção a `RB-09` é task documental separada.
- TASK-047, TASK-048, TASK-049, TASK-050 (já em `origin/main`).
- TASK-034, `aria-expanded` no drawer mobile.
- `package.json`, `prisma/**`.
- ADRs existentes, premissas técnicas.
- `git push` sem aprovação humana.

## Invariantes específicas (herdadas de TOOL-001 V1)

- 7 invariantes permanentes (fonte única `scripts/ai/lib/invariants.mjs`).
- Override humano **não libera** violação de invariante permanente.
- `decision-log.md` append-only.
- `gpt-review.md` com bloco JSON estruturado como fonte de verdade do validador.
- `validate-structure.mjs` é read-only sobre `current-task.md.status`.
- Responses API com `text.format: { type: "json_schema", strict: true }`.
- `OPENAI_MODEL` obrigatório via `.env.local`, sem default no código.

## Restrições operacionais

- Cap de custo USD ≤ 0,50 por execução (sem cap automático na V1; registrar custo real no relatório).
- Modelo: `OPENAI_MODEL` do `.env.local`.
- Nenhum secret impresso em logs, `ai/*`, decision-log, ou erros.

## Critérios de aceite

Ver `tasks/TOOL-002-homologar-fluxo-real-gpt-reviewer.md`. Detalhamento completo será feito no `/planejar TOOL-002`.
