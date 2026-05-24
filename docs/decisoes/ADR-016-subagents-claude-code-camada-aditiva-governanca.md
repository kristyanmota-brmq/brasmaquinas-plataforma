# ADR-016 — Subagents Claude Code como camada aditiva de governança

**Data:** 2026-05-24
**Status:** `aceita`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

O projeto já possui um fluxo obrigatório de governança implementado via slash commands em `.claude/commands/`: `/iniciar-task`, `/planejar`, `/implementar`, `/fechar-task`, `/revisar`, `/resumir`, `/handoff`, `/gpt-review`, `/handoff-status`. Esses comandos definem como tasks são abertas, planejadas, implementadas e fechadas — sempre exigindo aprovação humana entre etapas críticas.

Com o crescimento do backlog (60+ tasks históricas + TOOL-001/002/003 de handoff Claude↔GPT), padrões repetitivos emergiram: auditoria de contexto, esqueleto de plano, execução de testes, proposta de commit. Esses padrões são candidatos a delegação para subagents Claude Code, mas a delegação introduz riscos que precisam ser mitigados mecanicamente:

- Agente toma decisão crítica sozinho (aprovar plano, transicionar status, fechar blocker)
- Agente executa commit/push sem aprovação humana
- Agente relaxa blocker para "agilizar" o fluxo
- Agente inventa SKU ou altera premissa RT
- Agente substitui silenciosamente um slash command

TOOL-005 propôs e implementou 4 subagents iniciais em `.claude/agents/`: `context-gate-agent`, `task-planner-agent`, `test-qa-agent`, `close-commit-agent`. Esta ADR registra a decisão arquitetural que governa essa introdução e qualquer subagent futuro no repositório.

---

## Decisão

Decidimos:

1. **Localização padrão.** Subagents Claude Code vivem em `.claude/agents/<nome>.md` na raiz do repositório. Documentação de uso em `.claude/agents/README.md`. Não é permitido criar subagents em outros locais sem ADR nova.

2. **Camada opcional e aditiva.** Subagents NÃO substituem nenhum slash command obrigatório (`/iniciar-task`, `/planejar`, `/implementar`, `/fechar-task`). O fluxo obrigatório permanece intocado. Cada subagent é invocável apenas pelo Claude principal via tool `Agent`, dentro de uma sessão já regida pelos comandos.

3. **Restrição de permissões via campo `tools`.** Cada subagent declara explicitamente o campo `tools` no frontmatter YAML. Subagents que não precisam de `Edit`/`Write`/`NotebookEdit` NÃO os recebem. Esta restrição é mecânica — Claude Code não permite invocar tool não listado — não apenas documental.

4. **Subagent NÃO decide criticamente sozinho.** Nenhum subagent pode aprovar plano, transicionar status de task, marcar blocker como resolvido, promover épico em `tasks/TASK-024-mapa-mestre-tasks.md`, alterar premissa RT em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`, ou inventar SKU em `src/lib/catalog/`. Subagents apenas REPORTAM ou PROPÕEM — a decisão crítica fica com o humano via Claude principal.

5. **Subagent NÃO relaxa blocker ativo.** Blockers ativos (ex.: TECH-053-01) só podem ser fechados por decisão humana documentada. Agentes podem listá-los, mas não promovê-los a "resolvido".

6. **Subagent NÃO commita nem pusha sem aprovação humana explícita.** Especificamente, `close-commit-agent` NÃO tem `Bash` em `tools` — é mecanicamente impossível que ele execute `git add`, `git commit`, `git push` ou qualquer comando shell. O Claude principal roda `git status/diff/log` e passa o output ao agente; o agente apenas PROPÕE staging e mensagem como texto. Validado pelo teste T-AGT-7 em `scripts/agents/__tests__/validate-subagents.test.mjs`.

7. **Relação canônica com slash commands existentes:**

   | Slash command (obrigatório) | Subagent auxiliar (opcional) |
   |---|---|
   | `/iniciar-task` | `context-gate-agent` |
   | `/planejar` | `task-planner-agent` |
   | `/implementar` (verificação final) | `test-qa-agent` |
   | `/fechar-task` (proposta de commit) | `close-commit-agent` |

   O subagent é SEMPRE AUXILIAR do comando, nunca substituto.

8. **Frase de proteção obrigatória.** Cada system prompt de subagent contém a string literal `"NÃO substitui"` identificando quais slash commands não substitui. Validado mecanicamente por T-AGT-5.

---

## Alternativas consideradas

### Alternativa A — Não usar subagents (fluxo só com slash commands)

**Descrição:** Manter apenas os comandos em `.claude/commands/`; Claude principal executa tudo diretamente.

**Por que foi descartada:** Padrões repetitivos não são delegados — Claude principal sempre relê os mesmos arquivos a cada sessão, com risco de inconsistência no que é lido. Subagents permitem encapsular o procedimento "ler X, Y, Z e reportar W" como capacidade nomeada, validável estruturalmente e auditável via prompt em arquivo versionado.

### Alternativa B — Subagents com permissões amplas (`Edit`/`Write`/`Bash`)

**Descrição:** Dar `Edit`, `Write`, `Bash` para todos os subagents para máxima flexibilidade.

**Por que foi descartada:** Conflita com o princípio de aprovação humana entre etapas. Um `close-commit-agent` com `Bash` pode executar `git commit` apesar do prompt proibir — Claude Code não restringe subcomandos de `Bash` individualmente. A restrição mecânica via campo `tools` é a única salvaguarda confiável contra auto-commit acidental.

### Alternativa C — Subagents substituem os slash commands

**Descrição:** `/iniciar-task` simplesmente invoca `context-gate-agent` e retorna; `/planejar` invoca `task-planner-agent`; etc.

**Por que foi descartada:** Slash commands em `.claude/commands/` existem há ~30 dias com formato estável e auditável. Subagents introduzem variabilidade de output e perda de controle sobre apresentação ao humano. Manter os comandos como camada principal e subagents como camada interna de delegação preserva auditabilidade e separação de responsabilidade.

---

## Consequências

### Positivas

- Procedimentos repetitivos (auditoria, draft de plano, execução de teste, proposta de commit) encapsulados como subagents nomeados e versionados em `.claude/agents/`
- Permissão restrita via `tools` previne mecanicamente que subagent execute ação proibida
- Frase de proteção `"NÃO substitui"` validada por teste estrutural — não pode ser removida sem o teste quebrar
- ADR-016 documenta as invariantes para futuros agentes — qualquer agente novo deve seguir a mesma política
- Tooling 27/27 → 34/34 com 7 testes estruturais que protegem as invariantes no longo prazo
- Adoção alinhada com convenção upstream do Claude Code

### Negativas / trade-offs

- Subagents introduzem indireção: Claude principal precisa decidir se delega para subagent ou executa diretamente. Para tasks simples, a delegação é overhead. Mitigação: README documenta quando vale delegar (>5 arquivos a ler / >3 áreas de impacto / etc.).
- `close-commit-agent` sem `Bash` exige que Claude principal rode `git status/diff/log` antes de invocar — fluxo de 2 passos. Mitigação: README documenta o padrão explicitamente.
- Subagents podem "drift" do estado real do repo (snapshot tipo TASK-052, em que o prompt do GPT estava desatualizado). Mitigação: prompts proíbem hardcode de contagens; agentes leem estado em runtime via Read/Bash/Grep.
- Os 7 testes estruturais são proxies — validam estrutura, não comportamento real do agente. Mitigação: smoke test manual documentado no README e executado no `/fechar-task` de releases tocando subagents.

### Neutras

- Subagents Claude Code são padrão da própria CLI; usar a feature alinha o projeto com convenção upstream.
- Subagents podem ser ignorados pelo Claude principal — adoção é opcional task a task; não há obrigação de invocar.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---|---|
| `.claude/agents/context-gate-agent.md` | criação |
| `.claude/agents/task-planner-agent.md` | criação |
| `.claude/agents/test-qa-agent.md` | criação |
| `.claude/agents/close-commit-agent.md` | criação |
| `.claude/agents/README.md` | criação (documentação de uso, política, smoke tests) |
| `scripts/agents/__tests__/validate-subagents.test.mjs` | criação (7 testes estruturais) |
| `scripts/ai/__tests__/run-all.mjs` | modificação (scan adicional de `scripts/agents/__tests__/`) |
| `CLAUDE.md` | modificação (seção curta de descoberta apontando para README e ADR-016) |
| `tasks/TOOL-005-subagents-governanca-claude-code.md` | criação |
| `tasks/backlog.md` | modificação (header + nova entrada TOOL-005) |

Nenhum arquivo de produto alterado: `src/`, catálogo, PDF, mapa, premissas (`docs/metodologia/12-premissas-...md`), ADRs técnicos (ADR-001..015), tasks técnicas, e comandos existentes em `.claude/commands/*` ficam intocados.

---

## Classificação

- decisão de governança / tooling
- política permanente do repositório
- aceita

---

## Referências

- TOOL-005 — Criar subagents base do Claude Code para governança de tasks
- [`tasks/TOOL-005-subagents-governanca-claude-code.md`](../../tasks/TOOL-005-subagents-governanca-claude-code.md)
- [`.claude/agents/README.md`](../../.claude/agents/README.md)
- TOOL-001/002/003 — precedentes de tooling de governança (handoff Claude↔GPT)
- ADR-007 — premissas provisórias (precedente de ADR de governança)
- TASK-011 — política de ADR e ADRs retroativos

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-24 | Claude Opus 4.7 | ADR criada (TOOL-005) |
