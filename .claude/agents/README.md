# Subagents Claude Code — Brasmáquinas Plataforma

Camada **opcional e aditiva** de subagents Claude Code. **Não substituem** os slash commands obrigatórios (`/iniciar-task`, `/planejar`, `/implementar`, `/fechar-task`) nem a aprovação humana.

Decisão arquitetural: [`docs/decisoes/ADR-016-subagents-claude-code-camada-aditiva-governanca.md`](../../docs/decisoes/ADR-016-subagents-claude-code-camada-aditiva-governanca.md).

Introduzidos em TOOL-005 ([`tasks/TOOL-005-subagents-governanca-claude-code.md`](../../tasks/TOOL-005-subagents-governanca-claude-code.md)) — 4 agentes base.
Validados live em TOOL-005A ([`tasks/TOOL-005A-smoke-live-subagents.md`](../../tasks/TOOL-005A-smoke-live-subagents.md)) — 4/4 PASS.
Expandidos em TOOL-006 ([`tasks/TOOL-006-subagents-especialistas-epicos.md`](../../tasks/TOOL-006-subagents-especialistas-epicos.md)) — +8 especialistas + 3 transversais (10 novos read-only, total **15 agentes**).

---

## Catálogo de agentes (15 no total: 4 governança + 8 especialistas por épico + 3 transversais)

### 1. Agentes de governança (4 — TOOL-005, base do fluxo obrigatório)

| Agente | Modelo | Tools | Propósito |
|---|---|---|---|
| [`context-gate-agent`](context-gate-agent.md) | haiku | `Read, Bash, Grep, Glob` | Audita estado do repo — auxiliar de `/iniciar-task` |
| [`task-planner-agent`](task-planner-agent.md) | sonnet | `Read, Grep, Glob` | Produz draft de plano — auxiliar de `/planejar` |
| [`test-qa-agent`](test-qa-agent.md) | haiku | `Read, Bash, Grep, Glob` | Executa `tsc`/`vitest`/tooling e relata |
| [`close-commit-agent`](close-commit-agent.md) | haiku | `Read, Grep, Glob` (**SEM Bash**) | Propõe staging + mensagem de commit como texto |

### 2. Agentes especialistas por épico (8 — TOOL-006, revisão técnica por domínio)

| Agente | Épico | Modelo | Tools | Função |
|---|---|---|---|---|
| [`architecture-layout-agent`](architecture-layout-agent.md) | E02 — Motor de Layout | sonnet | `Read, Grep, Glob` | Revisa orientação/grid 12×12, motor de candidatos, A0/A2/A3, doc 13, ADRs 011/015 |
| [`hydraulics-agent`](hydraulics-agent.md) | E03 — Motor Hidráulico | sonnet | `Read, Grep, Glob` | Revisa vazão, HW, velocidade, PN, HMT, bomba, ADRs 002/008/013/014 |
| [`constructability-agent`](constructability-agent.md) | E04 — Construtibilidade | sonnet | `Read, Grep, Glob` | Revisa laterais retas, ângulos 0°/90°, mediana X, ADRs 010/011/012 |
| [`bom-catalog-agent`](bom-catalog-agent.md) | E05 — BOM e Catálogo | sonnet | `Read, Grep, Glob` | Revisa SKUs, kit 5022, VIQUA PN80, curvas 90°, pendências de SKU |
| [`map-workspace-agent`](map-workspace-agent.md) | E06 — Mapa e Workspace | haiku | `Read, Grep, Glob` | Revisa layers, labels, drawer mobile, fixtures Playwright, separação domínio/UI |
| [`proposal-pdf-agent`](proposal-pdf-agent.md) | E07 — Proposta e PDF | sonnet | `Read, Grep, Glob` | Revisa gate HTTP 422, memorial técnico, coerência projeto↔BOM↔proposta |
| [`commercial-engine-agent`](commercial-engine-agent.md) | E08 — Motor Comercial *(planejado)* | sonnet | `Read, Grep, Glob` | Revisa A/B/C, separação técnico↔comercial, alçadas comerciais documentadas |
| [`field-validation-agent`](field-validation-agent.md) | E09 — Calibração e Validação de Campo | sonnet | `Read, Grep, Glob` | Classifica evidências e lacunas; não substitui RT |

### 3. Agentes transversais (3 — TOOL-006, atravessam épicos)

| Agente | Modelo | Tools | Cobertura | Função |
|---|---|---|---|---|
| [`irrigation-methodology-agent`](irrigation-methodology-agent.md) | sonnet | `Read, Grep, Glob` | E02, E03, E04, E05, E07, E09 | Audita aderência metodológica (agronomia, cultura, solo, vento, lâmina, turno, aspersor, hidráulica, BOM, proposta, validação) + classificação 4-tier |
| [`ux-dx-agent`](ux-dx-agent.md) | sonnet | `Read, Grep, Glob` | E01, E06, E07, E08 + documentação | Audita UX (vendedor/projetista/RT) + DX (mantenedor); aponta fricções e tasks separadas |
| [`software-project-manager-agent`](software-project-manager-agent.md) | sonnet | `Read, Grep, Glob` | Todo o projeto | PMO técnico — consolida estado, prioriza, consolida pareceres, sugere próxima task; formato Diagnóstico → Opções → Recomendação → Riscos → Próximos passos |

> **Os 11 agentes adicionados pela TOOL-006 (8 especialistas + 3 transversais) são read-only no MVP: `tools: Read, Grep, Glob`. Eles não executam comandos, não editam arquivos e não integram automaticamente nenhum slash command.**

---

## Limites — política permanente (ADR-016)

Os limites abaixo são **invariantes** registradas em ADR-016. Nenhum subagent pode violá-los:

1. **Não substituem slash commands obrigatórios** — sempre auxiliares ao fluxo principal.
2. **Não decidem criticamente sozinhos** — apenas reportam ou propõem.
3. **Não relaxam blockers ativos** — apenas listam o que está ativo.
4. **Não alteram premissas RT** — `docs/metodologia/12-premissas-...md` é read-only para agentes.
5. **Não inventam SKU** — `src/lib/catalog/` é fonte autoritativa intocável.
6. **Não promovem épico sozinhos** — `tasks/TASK-024-mapa-mestre-tasks.md` só muda com decisão humana.
7. **Não commitam/pusham sem aprovação humana** — `close-commit-agent` não tem `Bash`; demais agentes leem-somente quanto a `src/`.
8. **Não editam `.claude/settings.local.json`** — regra do `/implementar`.

Adicionais TOOL-006 (todos os 11 novos):

9. **`tools` exatamente `Read, Grep, Glob`** — sem Bash, sem Edit/Write/NotebookEdit (mecânico via campo `tools`).
10. **Não substituem RT, engenheiro, agrônomo, comercial nem usuário final** — frase canônica obrigatória nos prompts: *"Você é um subagent especialista OPCIONAL. Você NÃO substitui slash commands, aprovação humana, RT, engenheiro, agrônomo ou decisão executiva."*

---

## Matriz: slash command × subagent de governança

| Slash command (obrigatório) | Subagent auxiliar (opcional) | Quando vale invocar o agente |
|---|---|---|
| `/iniciar-task` | `context-gate-agent` | Quando o contexto envolve > 5 arquivos a ler — agente lê e devolve relatório consolidado |
| `/planejar` | `task-planner-agent` | Quando a task tem > 3 áreas de impacto — agente produz esqueleto estruturado |
| `/implementar` (verificação final) | `test-qa-agent` | Sempre que houver alteração que possa regredir testes |
| `/fechar-task` (proposta de commit) | `close-commit-agent` | Quando o working tree tem > 5 arquivos modificados — agente avalia coerência com a task |

**Os 11 agentes da TOOL-006 NÃO integram automaticamente nenhum slash command.** Eles são invocados manualmente pelo Claude principal quando o usuário solicita revisão técnica de domínio, consolidação gerencial, ou auditoria transversal.

---

## Quando invocar especialista ou transversal (uso manual)

| Sinal | Agente sugerido |
|---|---|
| PR/task envolve grid 12×12, motor de candidatos, arquitetura A0/A2/A3 | `architecture-layout-agent` |
| PR/task envolve HMT, velocidade, perda HW, PN, bomba | `hydraulics-agent` |
| PR/task envolve laterais físicas, ângulos, mediana X | `constructability-agent` |
| PR/task envolve BOM, SKUs, catálogo, VIQUA, kit 5022 | `bom-catalog-agent` |
| PR/task envolve mapa, layers, labels, drawer mobile, fixtures Playwright | `map-workspace-agent` |
| PR/task envolve PDF, gate HTTP 422, memorial técnico | `proposal-pdf-agent` |
| Discussão de A/B/C, separação técnico↔comercial | `commercial-engine-agent` |
| Premissas RT, calibração, validação de campo | `field-validation-agent` |
| Aderência metodológica (agronomia, solo, vento, lâmina) + classificação 4-tier | `irrigation-methodology-agent` |
| UX do vendedor/projetista/RT ou DX do mantenedor | `ux-dx-agent` |
| Consolidar estado do projeto / sugerir próxima task / consolidar pareceres | `software-project-manager-agent` |

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

`node scripts/ai/__tests__/run-all.mjs` inclui os testes T-AGT-1..8 em `scripts/agents/__tests__/validate-subagents.test.mjs`:

- **T-AGT-1** — os 15 agents existem em `.claude/agents/` (era 4 — TOOL-005; +11 — TOOL-006)
- **T-AGT-2** — frontmatter YAML válido com `name` e `description` em todos os 15
- **T-AGT-3** — agents read-only sem `Write`/`Edit`/`NotebookEdit` (todos exceto `task-planner-agent` que tem T-AGT-4 dedicado)
- **T-AGT-4** — `task-planner-agent` sem `Bash`/`Write`/`Edit`/`NotebookEdit`
- **T-AGT-5** — frase literal `"NÃO substitui"` presente em cada system prompt (15 agentes)
- **T-AGT-6** — `README.md` referencia os 15 agentes pelo nome
- **T-AGT-7** — `close-commit-agent` SEM `Bash` em `tools` (invariante crítica isolada — TOOL-005)
- **T-AGT-8** — os 11 agentes da TOOL-006 (8 especialistas + 3 transversais) têm `tools` exatamente `Read, Grep, Glob` (sem Bash, sem extras)

### Smoke test manual

Documentado aqui e executado no `/fechar-task` de cada release tocando subagents:

#### Agentes base (TOOL-005A — 4/4 PASS)

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
   - FLAG se diff inclui arquivo proibido

#### Agentes da TOOL-006 (smoke live adiado para TOOL-006A futura)

Os 11 novos agentes só aparecem como `subagent_type` válidos após reload da sessão Claude Code (registry carregado na inicialização — descoberta documentada em TOOL-005 §5.1). Validação estrutural T-AGT-1..8 cobre invariantes mecanicamente nesta task; smoke live entra em **TOOL-006A futura**.

---

## FAQ

**P: Por que `close-commit-agent` não tem Bash?**
R: Risco crítico. Claude Code restringe quais tools um agente pode invocar, mas NÃO restringe subcomandos individuais de `Bash`. Sem Bash, é mecanicamente impossível o agente executar `git add/commit/push`. Detalhes em ADR-016 §5. Validado empiricamente na TOOL-005A Smoke 4 — agente recusou armadilha de prompt injection citando o charter literal.

**P: Posso criar um novo subagent sem ADR?**
R: Não. Qualquer novo subagent exige seguir a política de ADR-016. TOOL-006 adicionou 11 agentes sem ADR nova porque ADR-016 já cobre subagents como categoria.

**P: Posso dar `Write`/`Edit` para um subagent?**
R: Apenas com ADR nova justificando o trade-off. O default é read-only.

**P: Subagent pode rodar `npm install`?**
R: Não — fora do escopo de governança. Subagents de governança não modificam dependências.

**P: O que acontece se alguém remover a frase `"NÃO substitui"` de um prompt?**
R: T-AGT-5 falha em CI. Build/commit é bloqueado até a frase voltar.

**P: Posso usar o `context-gate-agent` para preparar um `/fechar-task` em vez de um `/iniciar-task`?**
R: Sim — o agente é só leitor. Mas lembre: o agente não decide se a task pode fechar, apenas reporta o estado.

**P: Quando devo invocar `software-project-manager-agent`?**
R: Quando você precisa de uma consolidação gerencial — "qual a próxima task?", "qual o estado do projeto?", "como consolidar o parecer de 3 especialistas?", "qual o risco de escopo desta task?". Ele não decide, mas organiza a decisão.

**P: `irrigation-methodology-agent` substitui o agrônomo?**
R: **Não.** Ele audita aderência metodológica (agronomia, solo, vento, lâmina, turno, aspersor) contra documentação interna e literatura, mas a homologação técnico-agronômica é exclusiva do agrônomo + RT.

**P: `commercial-engine-agent` pode criar política comercial?**
R: **Não.** E08 é planejado/não iniciado plenamente. O agente revisa o que está documentado, aponta lacunas, e nunca inventa alçada, preço, margem ou regra A/B/C — isso é decisão do time comercial + diretoria.

**P: Os 11 agentes da TOOL-006 são integrados aos slash commands?**
R: **Não nesta task.** Integração opcional (ex.: `irrigation-methodology-agent` em `/revisar`) entra em tasks futuras sob política ADR-016.

---

## Próximos passos sugeridos

- **TOOL-006A** (sugestão): smoke live dos 11 agentes da TOOL-006 após push (mesmo padrão TOOL-005 → TOOL-005A)
- **TOOL-007** (sugestão): integração opcional de algum especialista ou transversal em slash command existente (ex.: `irrigation-methodology-agent` em `/revisar`)
- **TOOL-004** (reservada): captura de `response.usage` real da Responses API — não tocada por TOOL-006
- **TOOL-XXX** (pendência TASK-052): atualizar snapshot do prompt do `run-gpt-review.mjs`
