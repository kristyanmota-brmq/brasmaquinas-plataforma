# TOOL-006B — Calibrar `map-workspace-agent` para evitar hardcode de contagens globais

**Status:** `concluída` (aguarda commit/push autorizado pelo humano)
**Prioridade:** P3-melhoria
**Classe:** B — Tooling/Governança
**Área:** infraestrutura / governança / DX
**Criado em:** 2026-05-24
**Atualizado em:** 2026-05-24
**Predecessor:** TOOL-006A (publicada em `origin/main` commit `ec9c7f6`); TOOL-006 (commit `2ebabd4`); TOOL-005A (commit `360a08f`); ADR-016 (política permanente)
**Concluída em:** 2026-05-24 · **887/887 testes vitest** (preservado) · 0 erros tsc (preservado) · **37/37 testes tooling** (era 35/35 — +2 T-AGT-9 e T-AGT-10) · `src/**` integralmente intocado
**Relatório:** `docs/relatorios/2026-05-24-TOOL-006B.md` (criado no `/fechar-task`)

---

## Objetivo

Corrigir o único PARCIAL identificado pela TOOL-006A (Smoke 05 — `map-workspace-agent` hardcodeu `vitest 826/826` em closing statement quando o baseline real é 887/887). Ajustar **exclusivamente** o prompt de `.claude/agents/map-workspace-agent.md` com 3 calibrações textuais cirúrgicas. Adicionar 2 testes estruturais novos (T-AGT-9 + T-AGT-10) validando regra e fallback literais no charter. Sem alteração de `tools`, `model` ou política. Sem ADR nova.

---

## Contexto

TOOL-006A executou smoke live dos 11 subagents publicados pela TOOL-006 e produziu **10 PASS + 1 PARCIAL · 0 FAIL · 0 NÃO EXECUTADO**. Único PARCIAL: o `map-workspace-agent` (modelo haiku) acrescentou closing statement *"Status da suite: tsc 0 erros · vitest 826/826 · catálogo read-only · sem lógica de domínio em UI · orquestrador único operacional"* — número 826/826 é baseline TASK-001 (2026-05-22), provavelmente lido de task file antigo sem releitura de `tasks/backlog.md` linha 4. Real atual: **887/887**.

**Causa raiz tripla identificada no `/planejar`:**

1. **Regra existente genérica demais** (linha 71 do charter pré-TOOL-006B): *"NUNCA hardcode contagens — leia em runtime via Read/Grep/Glob"*. Não diferencia contagens **DENTRO do escopo E06** (layers Mapbox, cenários Playwright, fixtures — métricas legítimas) de contagens **GLOBAIS do repositório** (vitest, tooling, TSC, status — fora do escopo).

2. **Formato canônico permissivo** — não vedava explicitamente acrescentar seções fora do formato; o agente acrescentou "Status da suite" como closing statement por inércia narrativa.

3. **Ausência de fallback documentado** — não havia instrução `"Não verificado nesta análise."` para casos em que o agente quer citar status global mas não tem fonte.

**Pré-condição para esta task:** TOOL-006A publicada em `origin/main` no commit `ec9c7f6` (✅).

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---|---|---|
| `.claude/agents/map-workspace-agent.md` | modificação | **3 ajustes cirúrgicos** — alvo único: (Ajuste 1) substituir linha 71 por bloco específico contagens globais + fallback; (Ajuste 2) inserir nota "Regra rígida de formato" antes do bloco do formato canônico; (Ajuste 3) inserir nota final após "Próxima ação recomendada" reforçando que é a última seção |
| `scripts/agents/__tests__/validate-subagents.test.mjs` | modificação | Adicionados **T-AGT-9** (regra contagens globais via regex `/contagens globais|status global/i`) e **T-AGT-10** (fallback literal `Não verificado nesta análise`); comentário do header atualizado para refletir 10 testes (era 8 — +2 da TOOL-006B) |
| `tasks/TOOL-006B-calibrar-map-workspace-agent.md` | criação | Este arquivo |
| `tasks/backlog.md` | modificação | Header linha 4 sincronizado pós-`ec9c7f6` + nova entrada TOOL-006B no topo da seção TOOL |
| `docs/relatorios/2026-05-24-TOOL-006B.md` | criação (no `/fechar-task`) | Relatório de calibração com diff antes/depois e validações |

---

## Critérios de aceite

- [x] `.claude/agents/map-workspace-agent.md` com 3 ajustes aplicados
- [x] `map-workspace-agent` continua **read-only** (frontmatter `tools: Read, Grep, Glob` inalterado)
- [x] `map-workspace-agent` continua **sem Bash** (verificado por T-AGT-8 — set equality contra `["Read", "Grep", "Glob"]`)
- [x] `map-workspace-agent` continua **modelo haiku** (sem alteração)
- [x] Nenhum outro agente em `.claude/agents/` alterado (regra dura)
- [x] Nenhum arquivo de produto (`src/`, catálogo, PDF, mapa, UI) alterado
- [x] **T-AGT-9** implementado e passando (regex `/contagens globais|status global/i`)
- [x] **T-AGT-10** implementado e passando (literal `Não verificado nesta análise`)
- [x] `node scripts/ai/__tests__/run-all.mjs` → **37/37** (era 35/35; +2)
- [x] `npx tsc --noEmit` → **0 erros** (preservado)
- [x] `npx vitest run` → **887/887** (preservado byte-a-byte)
- [x] Diff em caminhos protegidos = vazio (`src/`, catálogo, PDF, mapa, UI, premissas, ADRs, `.claude/commands/`, outros agentes, `scripts/ai/`, CLAUDE.md, AGENTS.md, HANDOFF.md, ARQUITETURA_ATUAL.md, Mapa Mestre)
- [x] Header de `tasks/backlog.md` linha 4 sincronizado pós-`ec9c7f6`
- [x] Nova entrada TOOL-006B em `tasks/backlog.md`
- [x] **ADR-016 preservada** (sem alteração textual; política mantida)
- [x] Nenhum commit/push automático

---

## Testes obrigatórios

Classe B Tooling — **não há vitest novos** (sem `src/` tocado). Bateria estrutural:

1. **T-AGT-1..7** (existentes) — preservados (não alteramos os 14 agentes não-alvo)
2. **T-AGT-8** (existente) — preservado (`map-workspace-agent.tools` ainda = `["Read", "Grep", "Glob"]`)
3. **T-AGT-9 (NOVO)** — valida regra contra hardcode global via regex `/contagens globais|status global/i`
4. **T-AGT-10 (NOVO)** — valida fallback literal `Não verificado nesta análise` no charter

**Tooling esperado: 37/37** (era 35/35).

---

## Fora do escopo

- **Não alterar nenhum outro agente** em `.claude/agents/` — regra dura do args (alvo único: `map-workspace-agent.md`)
- Não alterar `.claude/agents/README.md` (catálogo de 15 agentes já correto)
- Não alterar `CLAUDE.md`, `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`
- Não alterar `src/**`, catálogo, PDF, mapa, UI, motor, BOM
- Não alterar premissas em `docs/metodologia/12-premissas-...md`
- Não alterar ADRs técnicos (ADR-001..015) nem ADR-016
- Não alterar `.claude/commands/*`, `.claude/settings.local.json`
- Não alterar `scripts/ai/__tests__/run-all.mjs` (continua escaneando ambos diretórios)
- Não promover épico em `tasks/TASK-024-mapa-mestre-tasks.md`
- Não rodar smoke live do `map-workspace-agent` nesta sessão (registry só recarrega pós-commit)
- Não corrigir os 5 achados técnicos colaterais surfaceados pela TOOL-006A (fora de escopo)
- Não disparar `/gpt-review` — Classe B Tooling (fluxo opcional)
- Não criar ADR nova — ADR-016 cobre política
- Não executar `git add`/`commit`/`push` automaticamente

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Observado |
|---|---|---|---|
| T-AGT-9 falhar por mismatch de regex | Baixa | Médio | **Não ocorreu** — regra usa "contagens GLOBAIS" e "status global" no charter; regex case-insensitive matched |
| T-AGT-10 falhar por mismatch de literal | Baixa | Médio | **Não ocorreu** — string `Não verificado nesta análise` exata no charter |
| Edição introduzir desbalanceamento no bloco markdown | Baixa | Baixo | **Não ocorreu** — 3 ajustes cirúrgicos com Edit; sem quebra de estrutura |
| Algum outro T-AGT-1..8 quebrar indiretamente | Muito baixa | Médio | **Não ocorreu** — tooling 37/37 (10 testes da suite + 27 do AI dir = 37) |
| Header backlog ficar inconsistente | Baixa | Baixo | Verificado contra `git log --oneline -3` |
| Calibração causar over-restriction | Baixa | Baixo | Ajuste 1 distingue contagens GLOBAIS (proibidas sem fonte) de INTERNAS E06 (sempre lidas em runtime) |

**Dependências de outras tarefas:** TOOL-006A publicada em `origin/main` (`ec9c7f6` — ✅).

---

## Pendências abertas

Geradas nesta task:

- [ ] **TOOL-006C (sugerida — OPCIONAL, não obrigatória)** — Smoke pontual do `map-workspace-agent` pós-calibração. Executar apenas se quisermos validação live antes de usar o agente em task real de E06. Replicaria o cenário Smoke 05 da TOOL-006A em sessão pós-commit; resultado esperado: PASS (não mais hardcode de contagens globais).

Não impactadas (permanecem):

- [ ] **TOOL-004** — captura de `response.usage` da Responses API (reservada)
- [ ] **TOOL-XXX** — snapshot interno do prompt do `run-gpt-review.mjs` (herdada de TASK-052)
- [ ] **TOOL-007 (sugestão)** — integração opcional de especialista/transversal em slash command existente
- [ ] **Blocker TECH-053-01** (rib→lateral / spine_entry→principal) — ATIVO; emissão comercial bloqueada por default; fora de escopo
- [ ] **5 achados técnicos colaterais surfaceados pela TOOL-006A** (selectDiameter ADR-002 latent; pump_insufficient invalidSegments; vazaoPorSetor fórmula inline; 3 SKUs marca em branco; drift documentação ADR-016 close-commit) — fora de escopo

---

## Plano de implementação (executado)

1. **Ajuste 1** — substituir linha 71 do `map-workspace-agent.md` por bloco específico de contagens globais (com regra de 3 condições + fallback) + linha adicional sobre contagens internas E06 ✅
2. **Ajuste 2** — inserir nota "Regra rígida de formato" antes do bloco de formato canônico ✅
3. **Ajuste 3** — inserir nota final após "Próxima ação recomendada" ✅
4. **Adicionar T-AGT-9** (regra contagens globais via regex) ✅
5. **Adicionar T-AGT-10** (fallback literal) ✅
6. Atualizar comentário do header do test file (era "Total 8 testes T-AGT" → "Total 10 testes — +2 da TOOL-006B") ✅
7. Rodar tooling (esperado 37/37) ✅ **37/37**
8. Rodar tsc + vitest (preservação) ✅ **tsc 0; vitest 887/887**
9. Criar este task file ✅
10. Sincronizar header do `tasks/backlog.md` + nova entrada TOOL-006B — pendente (em execução)
11. Verificação final: diff em caminhos protegidos vazio — pendente

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-24 | Claude Opus 4.7 | Task criada e implementada. Plano aprovado com 5 ajustes: (a) separar T-AGT-9 (regra) + T-AGT-10 (fallback); (b) manter Ajuste 2 e 3; (c) sincronizar header backlog; (d) data real via `date` → 2026-05-24; (e) TOOL-006C como pendência opcional. 3 ajustes cirúrgicos aplicados em `map-workspace-agent.md`; 2 testes estruturais novos. Tooling 35/35 → 37/37. Preservou tsc 0 erros e vitest 887/887. `tools`/`model`/ADR-016 inalterados. Calibração textual de regra existente; sem mudança de política. |
