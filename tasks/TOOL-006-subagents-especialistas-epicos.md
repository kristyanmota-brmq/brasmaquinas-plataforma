# TOOL-006 — Criar subagents especialistas por épico + transversais

**Status:** `concluída` (aguarda commit/push autorizado pelo humano)
**Prioridade:** P2-importante
**Classe:** B — Tooling/Governança
**Área:** infraestrutura / governança / DX
**Criado em:** 2026-05-25
**Atualizado em:** 2026-05-25
**Predecessor:** TOOL-005 (4 agentes base, publicada em `origin/main` commit `8323692`); TOOL-005A (smoke live 4/4 PASS, commit `360a08f`); ADR-016 (política permanente de subagents)
**Concluída em:** 2026-05-25 · **887/887 testes vitest** (preservado) · 0 erros tsc (preservado) · **35/35 testes tooling** (era 34/34 — +1 T-AGT-8) · `src/**` integralmente intocado
**Relatório:** `docs/relatorios/2026-05-25-TOOL-006.md` (criado no `/fechar-task`)

---

## Objetivo

Criar 11 novos subagents Claude Code em `.claude/agents/` como camada **opcional e aditiva** de revisão técnica, planejamento e auditoria por domínio: 8 especialistas por épico (E02–E09) + 3 transversais (metodologia, UX/DX, PMO). Todos read-only no MVP (`tools: Read, Grep, Glob`). Estender o validador estrutural T-AGT para cobrir 15 agentes (4 base + 11 novos) com novo T-AGT-8. Sem integração automática a slash commands. Sem ADR nova — ADR-016 cobre toda a política.

**Total após TOOL-006:** 15 agentes (4 governança TOOL-005 + 11 novos TOOL-006).

---

## Contexto

TOOL-005 entregou 4 agentes de governança base (`context-gate`, `task-planner`, `test-qa`, `close-commit`) auxiliando os slash commands obrigatórios. TOOL-005A validou live 4/4 PASS — Smoke 4 (`close-commit-agent`) recusou prompt injection citando o charter literal (`tool_uses=0`). Política permanente em ADR-016.

A próxima etapa natural é abrir uma camada de **revisão técnica por domínio** para apoiar `/revisar`, `/planejar` e auditoria contínua dos épicos do Mapa Mestre. Padrões repetitivos identificados:

- Revisão de motor de layout (E02) — aderência ao doc 13 + ADRs 011/015
- Revisão hidráulica (E03) — Hazen-Williams, PN, velocidade, bomba
- Revisão de construtibilidade (E04) — laterais retas, ângulos, mediana X
- Revisão de BOM (E05) — SKUs, kit 5022, VIQUA PN80
- Revisão de mapa/UX (E06) — layers, drawer mobile, fixtures Playwright
- Revisão de PDF/proposta (E07) — gate HTTP 422, coerência
- Revisão de motor comercial (E08) — A/B/C, separação técnico↔comercial
- Revisão de calibração (E09) — premissas, validação RT, roteiro mínimo

Além disso, identificamos 3 capacidades **transversais** que atravessam épicos:

- **Metodologia de irrigação** (agronomia, solo, vento, lâmina, turno, aspersor) — `irrigation-methodology-agent`
- **UX/DX** (usuário final + mantenedor) — `ux-dx-agent`
- **PMO técnico** (consolidação, prioridades, sugestão de próxima task) — `software-project-manager-agent`

Encapsular essas capacidades como subagents nomeados, versionados em `.claude/agents/` e validados estruturalmente reduz repetição e padroniza output, sob a mesma política da ADR-016 que já governa os 4 base.

**Riscos críticos a mitigar mecanicamente (todos cobertos por ADR-016 + T-AGT-1..8):**

- Subagent executar commit sem aprovação humana → resolvido: nenhum dos 11 novos tem `Bash`
- Subagent relaxar blocker, alterar premissa, inventar SKU, promover épico → resolvido: prompts proíbem + T-AGT-5 valida frase de proteção
- Subagent substituir slash command silenciosamente → resolvido: frase `"NÃO substitui"` em cada prompt + ausência de integração automática
- Subagent fingir validar projeto técnico-agronômico ou homologar premissa → resolvido: prompts explicitam "não substitui RT, engenheiro, agrônomo"
- T-AGT-8 valida `tools` exatamente `["Read", "Grep", "Glob"]` para os 11 novos — impede regressão silenciosa (ex.: alguém adicionar `Bash` em PR futura)

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---|---|---|
| `.claude/agents/architecture-layout-agent.md` | criação | E02, sonnet, Read+Grep+Glob |
| `.claude/agents/hydraulics-agent.md` | criação | E03, sonnet, Read+Grep+Glob |
| `.claude/agents/constructability-agent.md` | criação | E04, sonnet, Read+Grep+Glob |
| `.claude/agents/bom-catalog-agent.md` | criação | E05, sonnet, Read+Grep+Glob |
| `.claude/agents/map-workspace-agent.md` | criação | E06, haiku, Read+Grep+Glob |
| `.claude/agents/proposal-pdf-agent.md` | criação | E07, sonnet, Read+Grep+Glob |
| `.claude/agents/commercial-engine-agent.md` | criação | E08 (planejado/não iniciado), sonnet, Read+Grep+Glob |
| `.claude/agents/field-validation-agent.md` | criação | E09, sonnet, Read+Grep+Glob; não substitui RT |
| `.claude/agents/irrigation-methodology-agent.md` | criação | transversal, sonnet, Read+Grep+Glob; classificação 4-tier |
| `.claude/agents/ux-dx-agent.md` | criação | transversal, sonnet, Read+Grep+Glob; UX usuário + DX dev |
| `.claude/agents/software-project-manager-agent.md` | criação | transversal/PMO, sonnet, Read+Grep+Glob; Diagnóstico→Opções→Recomendação→Riscos→Próximos passos |
| `.claude/agents/README.md` | modificação | Catálogo expandido: 4 governança + 8 especialistas + 3 transversais = 15 agentes; nova seção transversais; frase explícita read-only TOOL-006; matriz mantida apenas para governança |
| `scripts/agents/__tests__/validate-subagents.test.mjs` | modificação | `AGENTS` 4 → 15; `READ_ONLY_AGENTS` 3 → 14 (todos exceto `task-planner-agent`); novas constantes `GOVERNANCE_AGENTS`, `SPECIALIST_AGENTS`, `CROSS_FUNCTIONAL_AGENTS`, `TOOL_006_AGENTS`; **novo T-AGT-8** valida tools exatos `["Read", "Grep", "Glob"]` para os 11 da TOOL-006 |
| `scripts/ai/__tests__/run-all.mjs` | sem alteração | Já escaneia `scripts/agents/__tests__/` (TOOL-005); funcionamento técnico preservado; comentários internos citam apenas "TOOL-001 + TOOL-005" mas é cosmético — não bloqueia tooling. Ajuste #1 do `/planejar`: alterar só se tecnicamente necessário (não foi) |
| `tasks/TOOL-006-subagents-especialistas-epicos.md` | criação | Este arquivo |
| `tasks/backlog.md` | modificação | Header sincronizado pós-TOOL-005A (commit `360a08f`); contagens 887/887 + tooling 34→35; nova entrada TOOL-006 no topo da seção TOOL (acima de TOOL-005A) |

---

## Critérios de aceite

- [x] 11 novos arquivos `.claude/agents/*-agent.md` criados, todos com:
  - frontmatter YAML: `name`, `description`, `tools: Read, Grep, Glob`, `model`
  - frase canônica obrigatória: `"Você é um subagent especialista OPCIONAL. Você NÃO substitui slash commands, aprovação humana, RT, engenheiro, agrônomo ou decisão executiva."`
  - seção "NÃO substitui" listando slash commands, RT, engenheiro, agrônomo, decisão executiva
  - seção "Proibições absolutas" com restrições ADR-016
  - seção "Formato de resposta" estruturado por agente
  - seção "Lembrete final" reiterando "quem decide é o humano"
- [x] `commercial-engine-agent.md` declara explicitamente: E08 planejado/não iniciado plenamente; não cria política comercial; não autoriza proposta; não altera regra técnica por motivo comercial
- [x] `field-validation-agent.md` declara explicitamente: não valida premissa de campo sozinho; não substitui RT/engenheiro/agrônomo; apenas classifica evidências e lacunas
- [x] `irrigation-methodology-agent.md` produz classificação 4-tier (regra técnica / boa prática / decisão de engenharia / decisão comercial)
- [x] `ux-dx-agent.md` cobre UX (vendedor/projetista/RT) + DX (mantenedor); proíbe esconder pendência técnica
- [x] `software-project-manager-agent.md` segue formato Diagnóstico → Opções → Recomendação → Riscos → Próximos passos; aponta quando invocar outros agentes; inclui "Quando NÃO seguir esta recomendação"
- [x] `.claude/agents/README.md` atualizado (catálogo 4+8+3=15 + nova seção transversais + frase explícita read-only TOOL-006 + matriz preservada apenas para governança)
- [x] `scripts/agents/__tests__/validate-subagents.test.mjs` estendido (listas + T-AGT-8)
- [x] `node scripts/ai/__tests__/run-all.mjs` → **35/35** (era 34/34; +1 T-AGT-8)
- [x] `npx tsc --noEmit` → **0 erros** (preservado)
- [x] `npx vitest run` → **887/887** (preservado byte-a-byte; nenhum `src/` alterado)
- [x] Diff vazio em `src/`, `src/lib/catalog/`, `src/lib/pdf/`, `src/components/`, `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`, **`CLAUDE.md`** (regra dura ajuste #2), `.claude/commands/`, `.claude/settings.local.json`, `docs/metodologia/12-premissas-...md`, `docs/decisoes/` (ADR-016 não alterada), `scripts/ai/__tests__/run-all.mjs`, `tasks/TASK-024-mapa-mestre-tasks.md`, 4 agentes base
- [x] Nenhum commit/push automático — aprovação humana exclusiva no `/fechar-task`

---

## Testes obrigatórios

Classe B Tooling — **não há testes vitest novos** (Classe B não toca `src/`).

**Tooling — T-AGT estendido:**

1. **T-AGT-1** — os **15** arquivos `.claude/agents/*-agent.md` existem (lista expandida)
2. **T-AGT-2** — frontmatter YAML válido com `name` e `description` em todos os 15
3. **T-AGT-3** — read-only sem Write/Edit/NotebookEdit em **14** agentes (todos exceto `task-planner-agent` que tem T-AGT-4 dedicado)
4. **T-AGT-4** — `task-planner-agent` sem Bash/Write/Edit/NotebookEdit (sem mudança)
5. **T-AGT-5** — frase `"NÃO substitui"` literal em todos os 15
6. **T-AGT-6** — README referencia os 15 agentes pelo nome
7. **T-AGT-7** — `close-commit-agent` sem Bash (sem mudança; invariante crítica isolada TOOL-005)
8. **T-AGT-8 (NOVO)** — os 11 da TOOL-006 (8 especialistas + 3 transversais) têm `tools` exatamente `["Read", "Grep", "Glob"]` via `assert.deepEqual` em sets sorted (set equality)

**Tooling esperado: 35/35** (era 34/34; +1 T-AGT-8).

---

## Fora do escopo

- Não integrar os 11 agentes (nem os 4 base) aos slash commands `.claude/commands/*` — TOOL-007/008 futuras se desejado
- Não rodar smoke live dos 11 novos nesta task — registry só recarrega pós-commit (descoberta TOOL-005 §5.1); validação estrutural T-AGT é suficiente; smoke live entra em **TOOL-006A futura**
- Não alterar os 4 subagents base (`context-gate`, `task-planner`, `test-qa`, `close-commit`) — política intocada
- Não alterar `src/**`, catálogo, PDF, mapa, UI, motor, BOM
- Não alterar premissas (`12-premissas-...md`) — nenhuma criada/modificada/removida
- Não alterar ADRs técnicos (ADR-001..015) nem ADR-016 (política permanente)
- Não alterar `.claude/commands/*`, `.claude/settings.local.json`, **`CLAUDE.md`** (regra dura ajuste #2 — README é o catálogo oficial), `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`
- Não alterar `scripts/ai/__tests__/run-all.mjs` (não foi tecnicamente necessário; comentário sobre "TOOL-001 + TOOL-005" é cosmético)
- Não alterar outros arquivos em `scripts/` (ajuste #1: permitido só `validate-subagents.test.mjs`)
- Não promover épico no Mapa Mestre (`TASK-024-*.md` apenas referenciado)
- Não relaxar o blocker TECH-053-01
- Não disparar `/gpt-review` (Classe B Tooling — fluxo opcional)
- Não criar ADR nova — ADR-016 cobre toda a política
- Não capturar `response.usage` (TOOL-004 reservada)
- Não atualizar snapshot do prompt do `run-gpt-review.mjs` (TOOL-XXX herdada)
- Não executar `git add/commit/push` automaticamente

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Algum agente lista por engano `Bash`/`Edit`/`Write` no frontmatter | Baixa | Alto | T-AGT-3 + T-AGT-8 + revisão dupla; Claude Code não invoca tool não listado |
| Frase canônica diverge do args literal | Baixa | Médio | T-AGT-5 valida `"NÃO substitui"` literal; frase canônica do args inclui esta substring |
| README inconsistente com filesystem | Média | Baixo | T-AGT-6 valida cada agente referenciado pelo nome |
| Novos agentes não aparecerem nesta sessão | Alta (registry só recarrega na boot) | Baixo | Esperado — smoke live adiado para TOOL-006A; T-AGT-1..8 cobrem estrutura |
| `commercial-engine-agent` inventar arquivo de motor comercial (E08 não iniciado) | Média | Médio | Prompt cita explicitamente "épico planejado — não iniciado"; agente deve reportar "Não aplicável" quando solicitado parecer técnico |
| `field-validation-agent` homologar premissa sozinho | Baixa | Alto | Prompt explicita "homologação é exclusiva do RT"; classificação de evidência é o output máximo |
| `irrigation-methodology-agent` confundir 4-tier (transformar boa prática em regra técnica) | Média | Médio | Prompt cita correção da TASK-056 como caso negativo; classificação obrigatória em todo achado |
| `ux-dx-agent` recomendar esconder pendência técnica | Baixa | Alto | Prompt explicita "esconder dívida é UX pior"; pendência exibida é UX correta |
| `software-project-manager-agent` decidir sozinho sem opções | Média | Médio | Formato obrigatório inclui "Quando NÃO seguir esta recomendação" — humildade gerencial |
| TOOL-007 querer alterar agentes recém-criados | Baixa | Baixo | Política ADR-016 + T-AGT cobrem; ajustes seguem fluxo obrigatório |

**Dependências de outras tarefas:** TOOL-005 + TOOL-005A concluídas e publicadas (commits `8323692` e `360a08f` — ✅).

---

## Pendências abertas

Geradas nesta task:

- [ ] **TOOL-006A futura** — smoke live dos 11 novos agentes após push (mesmo padrão TOOL-005 → TOOL-005A); registry só reconhece pós-commit

Não impactadas (permanecem):

- [ ] **TOOL-004** — captura de `response.usage` da Responses API (reservada)
- [ ] **TOOL-XXX** — snapshot interno do prompt do `run-gpt-review.mjs` (herdada de TASK-052)
- [ ] **TOOL-007 (sugestão)** — integrar opcionalmente algum especialista/transversal em slash command existente (ex.: `irrigation-methodology-agent` em `/revisar`)
- [ ] **Blocker TECH-053-01** (rib→lateral) — ATIVO; fora de escopo

---

## Plano de implementação

1. Criar os 11 arquivos em `.claude/agents/*-agent.md` na ordem: especialistas E02–E09 (8) → transversais (3) ✅
2. Atualizar `.claude/agents/README.md` (catálogo 4+8+3=15 + nova seção transversais + frase explícita read-only) ✅
3. Atualizar `scripts/agents/__tests__/validate-subagents.test.mjs` (listas + T-AGT-8) ✅
4. Verificar `scripts/ai/__tests__/run-all.mjs` — não foi tecnicamente necessário alterar (escaneamento já correto) ✅
5. Criar este task file ✅
6. Atualizar `tasks/backlog.md` (header + entrada TOOL-006)
7. Verificação final: `tsc 0`, `vitest 887/887`, `tooling 35/35`, diff vazio em caminhos proibidos

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-25 | Claude Opus 4.7 | Task criada e implementada. Plano aprovado com 9 ajustes iniciais + 2 ampliações de escopo durante implementação (+2 transversais: `irrigation-methodology-agent`, `ux-dx-agent`; +1 PMO: `software-project-manager-agent`). Total final: 11 novos agentes (8 especialistas + 3 transversais). 35/35 tooling. |
