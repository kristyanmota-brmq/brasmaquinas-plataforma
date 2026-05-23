# claude-report — TASK-052

> Gerado por /handoff-claude-report TASK-052 em 2026-05-22T21:41:18-03:00.
> Plano Classe C inline aprovado pelo usuário antes da serialização.

---

## Entendimento

Corrigir descrição contraditória da premissa "Critério de vazão de projeto do ramal" em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` e promover seu status de `PENDENTE_REVISAO_RT_BRASMAQUINAS` para `APROVADO_RT`. O RT (Kristyan Mota) confirmou em 2026-05-22 que a operação Brasmáquinas é **rotativa por setor (1 setor ativo por vez)**. O código em [`src/lib/layout/secondary-sizing.ts:180-183`](../src/lib/layout/secondary-sizing.ts#L180-L183) já implementava o critério correto (`max(lat.vazaoM3h)`) desde sua origem — TASK-052 é **estritamente documental**: nenhuma linha de código é alterada.

**Classe C — documental.** Não modifica `src/**`. Per Mapa Mestre §9.3, Classe C dispensa `/planejar` formal; plano vive inline em `ai/current-task.md` e neste claude-report.

A inconsistência descoberta durante análise técnica pós-TASK-004B (sessão 2026-05-22): a descrição literal da premissa afirma "todos os aspersores da coluna ativos simultaneamente" (que seria `sum(...)`) mas o código fazia `max(...)` — comportamento exato de operação rotativa. Esta task corrige a lacuna documental sem tocar código.

## Arquivos criados

- `tasks/TASK-052-homologar-rotativa-por-setor.md` — task file formal seguindo `tasks/TASK_TEMPLATE.md` com status, classe, escopo permitido/proibido, critérios de aceite e log de alterações.
- `docs/relatorios/2026-05-22-TASK-052.md` — relatório de fechamento ~150-200 linhas: resumo executivo + diff documental aplicado + evidência de leitura do código (`secondary-sizing.ts:180-183`) + auditoria de invariantes (7/7) + sem testes novos (Classe C).

## Arquivos modificados

- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — seção "Critério de vazão de projeto do ramal":
  - Linha "Valor usado": remover "todos os aspersores da coluna ativos simultaneamente" (descrição incorreta); substituir por descrição que reflete o código real (`max(lat.vazaoM3h)` — vazão do pior setor isolado) com link para `secondary-sizing.ts:180-183`.
  - Linha "Regra": atualizar para citar explicitamente "operação rotativa por setor (1 setor ativo por vez)".
  - Linha "Origem": atualizar de "Decisão de engenharia (provisória)" para "Decisão operacional Brasmáquinas confirmada pelo RT em 2026-05-22 (Kristyan Mota)".
  - Linha "Status": `PENDENTE_REVISAO_RT_BRASMAQUINAS` → **`APROVADO_RT`**.
  - Remover linhas "Alternativa pós-RT", "Risco — manter conservador (atual)", "Risco — relaxar para `max(setor_simultâneo)` sem RT" — todas tratavam de incerteza operacional agora resolvida.
  - Histórico de revisões (final do arquivo): adicionar 1 linha datada 2026-05-22 citando responsável, motivo e referência ao código.

- `tasks/backlog.md`:
  - Header (linhas 1-4): atualizar para refletir TASK-052 concluída.
  - Adicionar entrada nova **TASK-052 — Homologar premissa de operação rotativa por setor** com status `aguardando_fechamento`, classe C, relatório, e blockquote sucinta.

- `ai/current-task.md` — ciclo de governança TOOL-003: `em_planejamento` → `aguardando_revisao_gpt` (este comando) → `aprovado_para_implementacao` (decisão humana) → `em_implementacao` → `aguardando_fechamento`.

## Arquivos não alterados

- **`src/**`** — todo o produto (motor hidráulico, layout, catálogo, BOM, PDF, UI/mapa). TASK-052 é estritamente documental.
- `src/lib/layout/secondary-sizing.ts` — código confirmado tecnicamente correto; **nenhuma linha alterada** (apenas referenciado na nova descrição da premissa).
- `docs/metodologia/01-regras-bloqueantes.md` — sem `RB-09` nova.
- `docs/metodologia/00-09, 11` (demais arquivos de metodologia) — leitura somente.
- `docs/decisoes/ADR-*.md` — leitura somente; sem ADR novo; sem emenda à ADR-008.
- `docs/software/*.md` — leitura somente.
- `tasks/TASK-024-mapa-mestre-tasks.md` — Mapa Mestre não alterado.
- Outras premissas em `docs/metodologia/12-premissas-...md` — apenas a "Critério de vazão de projeto do ramal" é tocada; demais 13 premissas + 6 pesos preservados.
- `ARQUITETURA_ATUAL.md`, `AGENTS.md`, `CLAUDE.md` — nunca alterar.
- `scripts/`, `.claude/commands/*` — sem alteração.
- `ai/decision-log.md` — apenas pelo humano (append-only).

## Testes obrigatórios

**TASK-052 é Classe C documental — não modifica código.** Per Mapa Mestre §9.3, Classe C não exige testes novos. Verificações de não-regressão obrigatórias (cumpridas por inação):

1. `npx tsc --noEmit` → **0 erros** (não tocamos `src/`)
2. `npx vitest run` → **836/836 passando** (não tocamos testes)
3. `node scripts/ai/__tests__/run-all.mjs` → **27/27 passando** (tooling preservado)

Nenhum teste novo. Nenhum teste alterado. Nenhum teste eliminado.

## Critérios de aceite

- [ ] Descrição da premissa "Critério de vazão de projeto do ramal" corrigida em `12-premissas-...md` — sem contradição interna (não mais menciona "todos os aspersores ativos simultaneamente")
- [ ] Linha "Valor usado" cita o código real (`max(lat.vazaoM3h)` em `secondary-sizing.ts:180-183`)
- [ ] Linha "Regra" cita explicitamente "operação rotativa por setor"
- [ ] Linha "Status" promovida para `APROVADO_RT`
- [ ] Linhas "Alternativa pós-RT" e os 2 "Risco" obsoletos removidas
- [ ] Histórico de revisões registra: 2026-05-22, autor (Claude Opus 4.7 + RT Kristyan Mota), causa (confirmação RT da operação rotativa), referência ao código (secondary-sizing.ts:180-183)
- [ ] Arquivo `tasks/TASK-052-homologar-rotativa-por-setor.md` criado
- [ ] `tasks/backlog.md` atualizado (header + entrada TASK-052)
- [ ] `docs/relatorios/2026-05-22-TASK-052.md` criado
- [ ] **Nenhum arquivo em `src/**` modificado**
- [ ] **Nenhuma outra premissa em `12-premissas-...md` alterada**
- [ ] **Sem ADR novo; sem emenda à ADR-008**
- [ ] **Sem `RB-09` em `01-regras-bloqueantes.md`**
- [ ] **Mapa Mestre não alterado**
- [ ] `npx tsc --noEmit` → 0 erros (preservado)
- [ ] `npx vitest run` → 836/836 (preservado)
- [ ] `node scripts/ai/__tests__/run-all.mjs` → 27/27 (preservado)
- [ ] Fluxo TOOL-003 (`/handoff-claude-report` + `/gpt-review` + decision-log) executado antes da implementação
- [ ] Sem commit, sem push (aguarda autorização explícita)

## Riscos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|:---:|:---:|---|
| 1 | Erro de transcrição na nova descrição da premissa (introduzir inconsistência diferente) | Baixa | Médio | Mostrar diff completo no relatório; GPT Reviewer audita |
| 2 | Contradizer outras tasks/ADRs que mencionem a premissa antiga | Baixa | Médio | Antes de implementar: grep por "todos os setores", "todos os aspersores", "simultâneo" em `docs/` e `tasks/`. Se houver outras citações da redação antiga, atualizar coerentemente OU justificar manter (referência histórica) |
| 3 | TASK-043 ou TASK-042R citarem a premissa antiga em blockquotes do backlog | Baixa | Baixo | Backlog é registro histórico de tasks já fechadas; blockquotes não precisam ser alteradas. Apenas a premissa em `12-premissas-...md` é fonte autoritativa |
| 4 | GPT Reviewer apontar outra inconsistência além da que estou corrigindo | Média | Baixo | Aceitar ajustes via decision-log conforme padrão TASK-004B (Opção A/B explícita do usuário) |
| 5 | INV-MASCARAR-PENDENCIA potencialmente violada se a nova descrição esconder algo | Baixíssima | Alto | **Pelo contrário:** TASK-052 **corrige** uma inconsistência documental que mascarava o estado real do código. A nova descrição é mais transparente que a antiga |

## O que NÃO será feito

- Não alterar `src/lib/layout/secondary-sizing.ts` — código está tecnicamente correto desde origem
- Não alterar nenhum outro arquivo em `src/**` (RB-04, RB-05, RB-06, RB-08 preservadas por inação)
- Não criar ADR (decisão é confirmação operacional, não decisão arquitetural)
- Não criar emenda à ADR-008
- Não criar `RB-09` em `01-regras-bloqueantes.md`
- Não alterar valores ou status de outras premissas em `12-premissas-...md` (somente "Critério de vazão de projeto do ramal" é tocada)
- Não alterar Mapa Mestre `tasks/TASK-024-mapa-mestre-tasks.md`
- Não promover status do épico E03 no Mapa Mestre (decisão de governança separada)
- Não atualizar blockquotes de tasks históricas no `backlog.md` que mencionem a premissa antiga (preservação histórica)
- Não tocar `secondary-sizing.test.ts` (sem mudança de comportamento)
- Não criar testes novos (Classe C documental)
- Não automatizar decisão humana ou edição de `ai/decision-log.md`
- Não criar commit, não fazer push até autorização explícita
- Não instalar dependências npm novas
- Não iniciar TASK-053 (topológica) — sucessor recomendado, mas independente

## Invariantes verificadas

- **INV-CATALOGO-SEM-HOMOLOGACAO** — ok (catálogo `src/lib/catalog/aspersores.ts` intocado)
- **INV-NAO-INVENTAR-SKU** — ok (sem SKU novo)
- **INV-DN100-LATERAL-5022** — ok (ADR-013 preservada)
- **INV-BLOCKERS-TECNICOS** — ok (TASK-052 não relaxa nenhum blocker; apenas formaliza estado correto que já existia em código)
- **INV-MASCARAR-PENDENCIA** — **ok com nota positiva** — TASK-052 explicitamente **CORRIGE** uma inconsistência documental (descrição contraditória da premissa que afirmava "todos simultâneos" enquanto código fazia `max`). A correção AUMENTA transparência; o oposto de mascarar
- **INV-DOMINIO-FORA-UI** — ok (apenas `docs/metodologia/`, `tasks/`, `docs/relatorios/` e `ai/`; sem UI, sem `src/lib/`)
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — ok (não avança comercial; apenas documenta confirmação operacional)
