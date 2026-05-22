# claude-report — TOOL-001

> Gerado a partir do plano aprovado com ajustes em `tasks/TOOL-001-handoff-claude-gpt-reviewer.md`.
> Este arquivo serve como entrada para o GPT Reviewer no fluxo da TOOL-001.

---

## Entendimento

Construir uma camada local de handoff Claude Code ↔ GPT Reviewer que insere uma etapa formal de revisão por LLM externo entre `/planejar` e a aprovação humana, materializada em 5 arquivos versionados em `ai/` e scripts em `scripts/ai/`. A automação **nunca executa decisão nem muda status como efeito colateral**: serializa estado, chama o GPT via Responses API com structured output, salva resposta (markdown + bloco JSON canônico) e valida estrutura — humano aprova manualmente.

## Arquivos criados

- `ai/README.md` — explicação do fluxo + 7 invariantes literais + regra terminal de invariante.
- `ai/project-state.md` — snapshot resumido do projeto.
- `ai/current-task.md` — frontmatter YAML com `task_id`, `status`, etc.
- `ai/claude-report.md` — este arquivo.
- `ai/gpt-review.md` — preenchido pelo `run-gpt-review.mjs`.
- `ai/decision-log.md` — append-only inviolável.
- `scripts/ai/lib/invariants.mjs` — 7 invariantes permanentes (fonte única).
- `scripts/ai/lib/parsers.mjs` — parsers puros (frontmatter, decision-log, JSON estruturado, sha256, .env.local).
- `scripts/ai/build-review-prompt.mjs` — prompt + JSON schema para Responses API.
- `scripts/ai/run-gpt-review.mjs` — CLI que chama Responses API (`text.format: json_schema strict`).
- `scripts/ai/validate-structure.mjs` — validador read-only com `override_permitido` derivado.
- `scripts/ai/__tests__/fixtures/builders.mjs` — builders de fixture isolada.
- `scripts/ai/__tests__/parsers.test.mjs` — testes T1-T9 + sha256.
- `scripts/ai/__tests__/validate-structure.test.mjs` — testes T10-T17.
- `scripts/ai/__tests__/build-review-prompt.test.mjs` — testes T18-T19.
- `scripts/ai/__tests__/run-all.mjs` — runner com node:test.
- `templates/ai-handoff-claude-report.md` — esqueleto vazio.
- `templates/ai-handoff-gpt-review.md` — esqueleto com bloco JSON exemplo.
- `templates/ai-handoff-decision-log-entry.md` — bloco YAML modelo.
- `templates/ai-handoff-prompt-system.md` — texto literal do prompt.
- `.claude/commands/handoff-claude-report.md` — define `/handoff-claude-report TOOL-XXX`.
- `.claude/commands/handoff-status.md` — define `/handoff-status TOOL-XXX <status>`.
- `tasks/TOOL-001-handoff-claude-gpt-reviewer.md` — arquivo formal da task.
- `docs/relatorios/2026-05-22-TOOL-001.md` — relatório de fechamento.

## Arquivos modificados

- `.gitignore` — adicionar `ai/*.tmp` e `ai/.cache/`. **Não ignorar** os 5 arquivos canônicos.
- `.env.example` — adicionar `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`.
- `tasks/backlog.md` — adicionar seção `## Tarefas de tooling (TOOL)` com TOOL-001.
- `CLAUDE.md` — adicionar seção curta apontando para `ai/README.md`.

## Arquivos não alterados

- `src/**` (motor de layout, hidráulica, BOM, catálogo, SKU, PDF, UI, comercial).
- `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`.
- `tsconfig.json`, `vitest.config.*`.
- `docs/metodologia/01-regras-bloqueantes.md` (ajuste 7).
- Working tree de TASK-027→046 (não tocado).
- `package.json` (nenhuma dep nova).

## Testes obrigatórios

20 testes em `scripts/ai/__tests__/` (pista separada do Vitest):

1. T1: parseFrontmatter válido.
2. T2: parseFrontmatter campo faltando rejeita com nome.
3. T3: parseDecisionLog vazio → array vazio.
4. T4: parseDecisionLog 3 entries monotônicas.
5. T5: parseDecisionLog timestamps fora de ordem → erro.
6. T6: extractStructuredBlock JSON canônico válido.
7. T7: extractStructuredBlock ausente → erro.
8. T8: extractStructuredBlock JSON malformado → erro.
9. T9: extractStructuredBlock campo obrigatório ausente → erro nominal.
10. Textra-A: sha256 determinístico.
11. T10: validate-structure 5 arquivos válidos → ok.
12. T11: validate-structure claude-report sem seção obrigatória → erro nominal.
13. T12: validate-structure override sem risco_assumido → erro.
14. T13: validate-structure override com justificativa < 80 chars → erro.
15. T14: validate-structure invariante violada + override true → bloqueio terminal.
16. T15: validate-structure decision-log encolheu vs HEAD → erro.
17. T16: validate-structure hash_gpt_review divergente → erro.
18. T17: validate-structure read-only sobre status (não altera arquivos).
19. T18: buildReviewPrompt 7 invariantes literalmente presentes.
20. T19: buildReviewPrompt schema marca campos canônicos como required.

## Critérios de aceite

- [x] `ai/README.md` + 5 arquivos canônicos criados.
- [x] 5 scripts em `scripts/ai/` (2 libs + 3 CLI) em ESM puro; nenhuma dep npm nova.
- [x] 4 templates `templates/ai-handoff-*.md`.
- [x] 2 comandos novos: `/handoff-claude-report` e `/handoff-status`.
- [x] `.env.example` atualizado com `OPENAI_API_KEY`, `OPENAI_MODEL` (sem default no código).
- [x] `.gitignore` ajustado.
- [x] `tasks/backlog.md` tem seção `## Tarefas de tooling (TOOL)` com TOOL-001.
- [x] `CLAUDE.md` tem seção curta apontando para `ai/README.md`.
- [x] `docs/metodologia/01-regras-bloqueantes.md` **não foi tocado**.
- [x] 20 testes de tooling passando.
- [x] `npx tsc --noEmit` → 0 erros.
- [x] `npx vitest run` → 817/817.
- [x] Bloco JSON do `gpt-review.md` valida contra schema.
- [x] `validate-structure.mjs` é read-only sobre status.
- [x] `/handoff-claude-report` exige `task_id`.

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Vazamento de `OPENAI_API_KEY` | `.gitignore` + smoke check pré-run. |
| GPT alucinar invariante violada | Trava terminal só dispara com `status: violada` literal; humano pode reformular. |
| GPT não detectar violação real | Revisão humana não substituída; testes Vitest + gates PDF continuam ativos. |
| GPT marcar `override_permitido: true` quando invariante violada | Validador deriva o valor; valor derivado vence. |
| Bloco JSON mal formado | Responses API com `strict: true` + revalidação local. |
| Custo descontrolado | `OPENAI_MODEL` configurável; script imprime tokens + custo; cap em Fase 2. |
| Sobrescrita de `decision-log.md` | Validador rejeita PR onde log encolheu vs. HEAD. |
| Hash de `gpt-review.md` modificado após decisão | `hash_gpt_review` na entry; mismatch → exit 1. |
| `/handoff-claude-report` pegar plano errado | task_id obrigatório + confirmação interativa. |
| `validate-structure` alterar status sem perceber | Code review + teste T17 cobre. |
| API OpenAI fora do ar | Falha graciosa; humano pode registrar `veredito_gpt: indisponivel`. |

## O que NÃO será feito

- Não implementar hooks automáticos.
- Não automatizar aprovação humana.
- Não automatizar `/implementar`, `/fechar-task`, merge.
- Não apagar entradas de `decision-log.md` (nem em testes — usam fixtures isoladas).
- Não criar secrets no repositório.
- Não alterar nenhum arquivo em `src/`.
- Não alterar `docs/metodologia/01-regras-bloqueantes.md` (ajuste 7).
- Não adicionar dependências npm.
- Não usar `/v1/chat/completions` como padrão.
- Não fixar `OPENAI_MODEL` default no código.
- Não validar conteúdo semântico de `gpt-review.md` — só estrutura JSON.

## Invariantes verificadas

- **INV-CATALOGO-SEM-HOMOLOGACAO** — OK (catálogo intocado).
- **INV-NAO-INVENTAR-SKU** — OK (nenhum SKU manipulado).
- **INV-DN100-LATERAL-5022** — OK (seletor hidráulico intocado).
- **INV-BLOCKERS-TECNICOS** — OK (nenhum blocker técnico relaxado; ao contrário, regra terminal de invariante REFORÇA blockers).
- **INV-MASCARAR-PENDENCIA** — OK (pendências aparecem em `project-state.md` e `decision-log.md` é append-only).
- **INV-DOMINIO-FORA-UI** — OK (TOOL-001 não toca `src/components/` nem `src/app/`).
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — OK (não avança nenhum motor; só adiciona camada de revisão).
