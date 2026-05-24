# Subagents Claude Code — Brasmáquinas Plataforma

Camada **opcional e aditiva** de subagents Claude Code para reduzir repetição em tarefas de governança. **Não substituem** os slash commands obrigatórios (`/iniciar-task`, `/planejar`, `/implementar`, `/fechar-task`) nem a aprovação humana.

Decisão arquitetural: [`docs/decisoes/ADR-016-subagents-claude-code-camada-aditiva-governanca.md`](../../docs/decisoes/ADR-016-subagents-claude-code-camada-aditiva-governanca.md).

Introduzidos em TOOL-005 ([`tasks/TOOL-005-subagents-governanca-claude-code.md`](../../tasks/TOOL-005-subagents-governanca-claude-code.md)).

---

## Agentes disponíveis

| Agente | Modelo | Tools | Propósito |
|---|---|---|---|
| [`context-gate-agent`](context-gate-agent.md) | haiku | `Read, Bash, Grep, Glob` | Audita estado do repo — auxiliar de `/iniciar-task` |
| [`task-planner-agent`](task-planner-agent.md) | sonnet | `Read, Grep, Glob` | Produz draft de plano — auxiliar de `/planejar` |
| [`test-qa-agent`](test-qa-agent.md) | haiku | `Read, Bash, Grep, Glob` | Executa `tsc`/`vitest`/tooling e relata |
| [`close-commit-agent`](close-commit-agent.md) | haiku | `Read, Grep, Glob` (**SEM BASH**) | Propõe staging + mensagem de commit como texto |

---

## Limites — política permanente (ADR-016)

Os limites abaixo são **invariantes** registradas em ADR-016. Nenhum subagent pode violá-los:

1. **Não substituem slash commands obrigatórios** — sempre auxiliares ao fluxo principal.
2. **Não decidem criticamente sozinhos** — apenas reportam ou propõem.
3. **Não relaxam blockers ativos** — apenas listam o que está ativo.
4. **Não alteram premissas RT** — `docs/metodologia/12-premissas-...md` é read-only para agentes.
5. **Não inventam SKU** — `src/lib/catalog/` é fonte autoritativa intocável.
6. **Não promovem épico sozinhos** — `tasks/TASK-024-mapa-mestre-tasks.md` só muda com decisão humana.
7. **Não commitam/pushar sem aprovação humana** — `close-commit-agent` não tem `Bash`; demais agentes leem-somente quanto a `src/`.
8. **Não editam `.claude/settings.local.json`** — regra do `/implementar`.

---

## Matriz: slash command × subagent

| Slash command (obrigatório) | Subagent auxiliar (opcional) | Quando vale invocar o agente |
|---|---|---|
| `/iniciar-task` | `context-gate-agent` | Quando o contexto envolve >5 arquivos a ler — agente lê e devolve relatório consolidado |
| `/planejar` | `task-planner-agent` | Quando a task tem >3 áreas de impacto — agente produz esqueleto estruturado |
| `/implementar` (verificação final) | `test-qa-agent` | Sempre que houver alteração que possa regredir testes |
| `/fechar-task` (proposta de commit) | `close-commit-agent` | Quando o working tree tem >5 arquivos modificados — agente avalia coerência com a task |

O subagent é SEMPRE AUXILIAR — o slash command sempre executa e busca a aprovação humana.

---

## Como invocar (do Claude principal)

```js
Agent({
  subagent_type: "context-gate-agent",
  description: "Auditoria de contexto TOOL-XXX",
  prompt: "Audite o contexto para TOOL-XXX e retorne o relatório estruturado..."
})
```

Cada agente tem instruções detalhadas em seu próprio arquivo `.md`.

### Exemplo crítico: close-commit-agent (sem Bash)

Como `close-commit-agent` não tem `Bash`, o Claude principal precisa rodar os comandos git e passar o output no prompt do agente:

```bash
# Claude principal executa estes três comandos (não o agente):
git status
git diff --stat
git log --oneline -10
```

Depois invoca o agente passando os outputs como texto:

```js
Agent({
  subagent_type: "close-commit-agent",
  description: "Propor commit TOOL-XXX",
  prompt: `
git status:
<conteúdo capturado>

git diff --stat:
<conteúdo capturado>

git log --oneline -10:
<conteúdo capturado>

Task: TOOL-XXX — <descrição>
Arquivos esperados: <lista do plano>

Propor staging + mensagem de commit como TEXTO. NÃO execute git — você não tem Bash.
`
})
```

O agente devolve análise + staging + mensagem como TEXTO. O Claude principal, sob aprovação humana, executa `git add` e `git commit`.

---

## Validação

### Estrutural (automatizada)

`node scripts/ai/__tests__/run-all.mjs` inclui os testes T-AGT-1..7 em `scripts/agents/__tests__/validate-subagents.test.mjs`:

- **T-AGT-1** — os 4 agents existem em `.claude/agents/`
- **T-AGT-2** — frontmatter YAML válido com `name` e `description`
- **T-AGT-3** — agents read-only (`context-gate`, `test-qa`, `close-commit`) sem `Write`/`Edit`/`NotebookEdit`
- **T-AGT-4** — `task-planner-agent` sem `Bash`/`Write`/`Edit`/`NotebookEdit`
- **T-AGT-5** — frase literal `"NÃO substitui"` presente em cada system prompt
- **T-AGT-6** — `README.md` referencia os 4 agentes pelo nome
- **T-AGT-7** — `close-commit-agent` SEM `Bash` em `tools` (invariante crítica isolada)

### Smoke test manual

Documentado aqui e executado no `/fechar-task` de cada release tocando subagents:

1. **`context-gate-agent`** — invocar contra uma task arbitrária; verificar:
   - Retorna relatório no formato `/iniciar-task`
   - NÃO edita nenhum arquivo
   - Reporta contagem REAL de testes (não hardcode)

2. **`task-planner-agent`** — invocar contra uma task fictícia; verificar:
   - Produz draft no formato `/planejar`
   - Cita regras de CLAUDE.md aplicáveis
   - Termina com nota "Draft produzido por task-planner-agent"

3. **`test-qa-agent`** — invocar sem alteração no repo; verificar:
   - Retorna contagens reais (e.g., 887/887 vitest, 34/34 tooling)
   - NÃO edita testes
   - Sinaliza regressão se houver

4. **`close-commit-agent`** — invocar com output git fictício pedindo commit; verificar:
   - RECUSA execução (não tem Bash)
   - Propõe staging e mensagem como TEXTO
   - FLAG se diff inclui arquivo proibido (catálogo, premissas, ADR técnico, etc.)

---

## FAQ

**P: Por que `close-commit-agent` não tem Bash?**
R: Risco crítico. Claude Code restringe quais tools um agente pode invocar, mas NÃO restringe subcomandos individuais de `Bash`. Sem Bash, é mecanicamente impossível o agente executar `git add/commit/push`. Detalhes em ADR-016 §5.

**P: Posso criar um novo subagent sem ADR?**
R: Não. Qualquer novo subagent exige seguir a política de ADR-016. Mudanças de capacidade (ex.: integração com serviço externo) provavelmente exigem ADR nova.

**P: Posso dar `Write`/`Edit` para um subagent?**
R: Apenas com ADR nova justificando o trade-off. O default é read-only.

**P: Subagent pode rodar `npm install`?**
R: Não — fora do escopo de governança. Subagents de governança não modificam dependências.

**P: O que acontece se alguém remover a frase `"NÃO substitui"` de um prompt?**
R: T-AGT-5 falha em CI. Build/commit é bloqueado até a frase voltar.

**P: Posso usar o `context-gate-agent` para preparar um `/fechar-task` em vez de um `/iniciar-task`?**
R: Sim — o agente é só leitor. Mas lembre: o agente não decide se a task pode fechar, apenas reporta o estado.

---

## Próximos passos sugeridos

- **TOOL-006** (sugestão): integrar `context-gate-agent` opcionalmente dentro de `/iniciar-task` quando >5 arquivos lidos
- **TOOL-004** (reservada): captura de `response.usage` real da Responses API — não tocada por TOOL-005
- **TOOL-XXX** (pendência TASK-052): atualizar snapshot do prompt do `run-gpt-review.mjs`
