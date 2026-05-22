---
task_id: TOOL-001
arquivo_task: tasks/TOOL-001-handoff-claude-gpt-reviewer.md
classe: A
data_abertura: 2026-05-22
status: aguardando_fechamento
ultima_atualizacao: 2026-05-22T17:30:00-03:00
atualizado_por: comando:/fechar-task
---

# TOOL-001 — Handoff automatizado Claude Code ↔ GPT Reviewer

## Escopo permitido

- Criar pasta `ai/` na raiz com 6 arquivos (README + 5 canônicos).
- Criar pasta `scripts/ai/` com libs + CLI scripts + fixtures isoladas + testes em pista separada do Vitest.
- Criar 4 templates em `templates/ai-handoff-*.md`.
- Criar 2 comandos slash novos: `/handoff-claude-report`, `/handoff-status`.
- Atualizar `.gitignore`, `.env.example`, `tasks/backlog.md`, `CLAUDE.md`.

## Escopo proibido

- **Não tocar `src/**`** (motor de layout, hidráulica, BOM, catálogo, SKU, PDF, UI, comercial).
- **Não tocar `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`.**
- **Não tocar `tsconfig.json`, `vitest.config.*`.**
- **Não tocar `docs/metodologia/01-regras-bloqueantes.md`** (ajuste 7 do plano).
- **Não adicionar dependências npm.**
- **Não criar secrets no repositório.**
- **Não automatizar aprovação humana.**
- **Não implementar hooks.**

## Invariantes específicas

- Append-only de `decision-log.md` (testes usam fixtures isoladas).
- `gpt-review.md` tem bloco JSON estruturado como fonte de verdade do validador.
- `validate-structure.mjs` é read-only sobre `current-task.md.status`.
- Responses API com `text.format: { type: "json_schema", strict: true }`.
- `OPENAI_MODEL` obrigatório via `.env.local`, sem default no código.
- 7 invariantes permanentes têm fonte única em `scripts/ai/lib/invariants.mjs`.
- Override humano **não libera** violação de invariante permanente.

## Critérios de aceite

Ver `tasks/TOOL-001-handoff-claude-gpt-reviewer.md`.
