# TOOL-005 — Criar subagents base do Claude Code para governança de tasks

**Status:** `concluída` (aguarda commit/push autorizado pelo humano)
**Concluída em:** 2026-05-24 · 887/887 vitest · 0 erros tsc · 34/34 tooling · `src/**` integralmente intocado
**Relatório:** [`docs/relatorios/2026-05-24-TOOL-005.md`](../docs/relatorios/2026-05-24-TOOL-005.md)
**Classe:** B — Tooling/Governança
**Prioridade:** P2-importante
**Área:** infraestrutura / governança / DX
**Predecessor:** TOOL-003 (orquestração `/gpt-review`); TASK-011 (política de ADR)
**Criado em:** 2026-05-24
**Atualizado em:** 2026-05-24

---

## Objetivo

Introduzir a primeira camada de subagents Claude Code no repositório (`.claude/agents/`) — 4 subagents auxiliares opcionais (`context-gate-agent`, `task-planner-agent`, `test-qa-agent`, `close-commit-agent`) que reduzem repetição e padronizam o fluxo, sem substituir slash commands obrigatórios nem a aprovação humana.

---

## Contexto

Padrões repetitivos emergiram no backlog (60+ tasks):
- Auditoria de contexto a cada `/iniciar-task` (mesmos arquivos lidos)
- Esqueleto de plano a cada `/planejar` (mesma estrutura)
- Execução de testes a cada `/implementar` e `/fechar-task` (mesmos comandos)
- Proposta de commit ao final de cada task (mesmo formato de mensagem)

Subagents permitem encapsular esses procedimentos como capacidades nomeadas e validáveis em `.claude/agents/<nome>.md`. Riscos críticos a mitigar mecanicamente:

- Subagent executar commit sem aprovação humana → resolvido: `close-commit-agent` SEM `Bash`
- Subagent relaxar blocker, alterar premissa, inventar SKU → resolvido: prompts proíbem + ADR-016 registra + T-AGT-5 valida frase de proteção
- Subagent substituir slash command silenciosamente → resolvido: frase `"NÃO substitui"` em cada prompt; T-AGT-5 valida

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---|---|---|
| `.claude/agents/context-gate-agent.md` | criação | Auditor opcional, tools: Read+Bash+Grep+Glob, modelo: haiku |
| `.claude/agents/task-planner-agent.md` | criação | Draft de plano, tools: Read+Grep+Glob (sem Bash), modelo: sonnet |
| `.claude/agents/test-qa-agent.md` | criação | Executor de testes, tools: Read+Bash+Grep+Glob, modelo: haiku |
| `.claude/agents/close-commit-agent.md` | criação | Propositor de commit, tools: Read+Grep+Glob (**SEM BASH** — invariante crítica), modelo: haiku |
| `.claude/agents/README.md` | criação | Documentação de uso, política de limites, smoke tests, FAQ |
| `docs/decisoes/ADR-016-subagents-claude-code-camada-aditiva-governanca.md` | criação | Decisão arquitetural permanente |
| `scripts/agents/__tests__/validate-subagents.test.mjs` | criação | 7 testes estruturais (T-AGT-1..7) |
| `scripts/ai/__tests__/run-all.mjs` | modificação | Scan adicional de `scripts/agents/__tests__/` |
| `CLAUDE.md` | modificação | Seção curta (10-15 linhas) apontando para README e ADR-016 |
| `tasks/backlog.md` | modificação | Header (tooling 27→34) + entrada TOOL-005 |
| `tasks/TOOL-005-subagents-governanca-claude-code.md` | criação | Este arquivo |

---

## Critérios de aceite

- [x] Pasta `.claude/agents/` criada com 4 arquivos de agente
- [x] Cada arquivo com frontmatter YAML válido: `name`, `description`, `tools` explícito, `model`
- [x] Cada system prompt contém `"NÃO substitui"`
- [x] `close-commit-agent` SEM `Bash` em `tools` (invariante crítica)
- [x] `.claude/agents/README.md` documenta os 4 agentes
- [x] `docs/decisoes/ADR-016-*` criada com a política completa
- [x] `scripts/agents/__tests__/validate-subagents.test.mjs` com 7 testes
- [x] `scripts/ai/__tests__/run-all.mjs` integra os novos testes
- [x] `node scripts/ai/__tests__/run-all.mjs` → 34/34 (era 27/27)
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 887/887 (sem regressão)
- [x] Nenhum diff em `src/`, catálogo, PDF, mapa, premissas, ADRs técnicos, tasks técnicas, comandos existentes
- [x] `tasks/TOOL-005-*.md` e `tasks/backlog.md` atualizados
- [x] `CLAUDE.md` com seção curta de descoberta (10-15 linhas)

---

## Testes obrigatórios

7 testes estruturais em `scripts/agents/__tests__/validate-subagents.test.mjs`:

1. **T-AGT-1** — os 4 arquivos `.claude/agents/*-agent.md` existem
2. **T-AGT-2** — cada arquivo tem frontmatter YAML com `name` e `description`
3. **T-AGT-3** — agents read-only (`context-gate`, `test-qa`, `close-commit`) não listam `Write`/`Edit`/`NotebookEdit`
4. **T-AGT-4** — `task-planner-agent` não tem `Bash`/`Write`/`Edit`/`NotebookEdit`
5. **T-AGT-5** — cada system prompt contém literal `"NÃO substitui"`
6. **T-AGT-6** — `README.md` referencia os 4 agentes pelo nome
7. **T-AGT-7** — `close-commit-agent` NÃO tem `Bash` em `tools` (invariante crítica isolada)

Smoke test manual (T-AGT-Smoke), documentado em README e executado no `/fechar-task`:
- Invocação real de cada agente com prompt fictício
- Verificação de que cada agente recusa ações proibidas

---

## Fora do escopo

- Não integrar subagents automaticamente nos slash commands existentes (tasks futuras)
- Não criar outros agentes além dos 4 listados (pós-MVP)
- Não automatizar snapshot desatualizado do prompt do GPT (TOOL-XXX futura)
- Não tocar `.claude/commands/*` — comandos preservados byte-a-byte
- Não alterar `.claude/settings.local.json` (regra do `/implementar`)
- Não introduzir dependências npm novas

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `close-commit-agent` executa commit | baixa (sem Bash) | crítico | tools sem Bash; T-AGT-7 valida |
| Subagent relaxa invariante | média | alto | Prompts citam invariantes; ADR-016; T-AGT-5 frase de proteção |
| Drift entre prompts e estado real | alta | médio | Prompts proíbem hardcode; agentes leem em runtime |
| Frontmatter inválido | baixa | médio | T-AGT-2 valida |
| Confusão command vs subagent | média | baixo | README com matriz comparativa; frase `"NÃO substitui"` |
| Adoção zero | média | baixo | README documenta quando invocar |
| Inflação de tooling count sem cobertura real | média | baixo | Testes estruturais documentados como tal; smoke manual cobre comportamento |

**Dependências de outras tarefas:** TASK-011 (política de ADR) — concluída.

---

## Pendências abertas

- [x] ~~**Smoke test "live" (T-AGT-Smoke-1..4) requer reload da sessão Claude Code.**~~ **RESOLVIDA por TOOL-005A em 2026-05-25.** Os 4 agentes foram invocados via tool `Agent` em sessão pós-commit `8323692`; outputs literais preservados em [`docs/relatorios/evidencias/2026-05-25-TOOL-005A/`](../docs/relatorios/evidencias/2026-05-25-TOOL-005A/); classificação 4/4 PASS (Smoke 4 — excepcional: recusou armadilha de prompt injection citando literalmente o charter). Detalhes em [`docs/relatorios/2026-05-25-TOOL-005A-smoke-live-subagents.md`](../docs/relatorios/2026-05-25-TOOL-005A-smoke-live-subagents.md). Nenhuma alteração de agente foi necessária; TOOL-005B não acionada.
- [ ] TOOL-004 (captura de `response.usage` real da Responses API) permanece reservada para futura — não tocada por esta task.

---

## Plano de implementação

1. Criar `.claude/agents/{context-gate,task-planner,test-qa,close-commit}-agent.md`
2. Criar `.claude/agents/README.md`
3. Criar `docs/decisoes/ADR-016-*`
4. Criar `scripts/agents/__tests__/validate-subagents.test.mjs`
5. Atualizar `scripts/ai/__tests__/run-all.mjs` para scan adicional
6. Atualizar `CLAUDE.md` com seção curta
7. Criar este task file
8. Atualizar `tasks/backlog.md` (header + entrada nova)
9. Verificações finais: `npx tsc --noEmit` (0), `npx vitest run` (887/887), `node scripts/ai/__tests__/run-all.mjs` (34/34)

---

## Formato de resposta esperado

Ao concluir, responder com:
1. Lista de arquivos criados/modificados
2. Testes: antes vs depois (vitest + tooling)
3. TypeScript: 0 erros
4. Critérios de aceite — checklist
5. Pendências abertas (smoke test, futura task)
6. Próxima task sugerida

---

## Log de alterações

| Data | Autor | O que mudou |
|---|---|---|
| 2026-05-24 | Claude Opus 4.7 | Task criada e implementada (TOOL-005) |
| 2026-05-25 | Claude Opus 4.7 | Pendência #1 (smoke test live) marcada **resolvida** por TOOL-005A. 4/4 agentes PASS em smoke live (sessão pós-commit `8323692`). Nenhuma alteração estrutural — TOOL-005A apenas validou empiricamente o comportamento. |
