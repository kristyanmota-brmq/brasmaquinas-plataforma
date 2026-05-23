# TASK-052 — Homologar premissa de operação rotativa por setor

**Status:** `concluída` (aguarda commit/push autorizado pelo humano)
**Prioridade:** P3-melhoria
**Classe:** C — documental / governança
**Área:** governança / metodologia
**Criado em:** 2026-05-22
**Concluída em:** 2026-05-22 · 836/836 testes vitest · 0 erros tsc · 27/27 testes tooling · produto intocado
**Predecessor operacional:** TASK-004B (publicada em `origin/main` commit `b1bc2e0` em 2026-05-22)
**Relatório:** [`docs/relatorios/2026-05-22-TASK-052.md`](../docs/relatorios/2026-05-22-TASK-052.md)
**Veredito GPT (`/gpt-review TASK-052`):** `aprovado_com_ajustes` · 1 blocker metodológico (BLK-MET-001 sobre snapshot interno desatualizado do prompt do GPT — não responsabilidade desta task) · 0/7 invariantes violadas
**Decisão humana:** `aprovado_com_ajustes` (sem override) · `ai/decision-log.md` 2026-05-22T21:52:58-03:00 · hash gpt-review `8d15fb83...6938ab`

---

## Objetivo

Corrigir descrição **contraditória** da premissa "Critério de vazão de projeto do ramal" em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` e promover seu status de `PENDENTE_REVISAO_RT_BRASMAQUINAS` para `APROVADO_RT`, refletindo a decisão explícita do RT (Kristyan Mota, 2026-05-22) de que a operação Brasmáquinas é **rotativa por setor (1 setor ativo por vez)**.

A inconsistência corrigida: a descrição literal antiga afirmava "todos os aspersores da coluna ativos simultaneamente" (que seria `sum(...)`) mas o código em [`src/lib/layout/secondary-sizing.ts:180-183`](../src/lib/layout/secondary-sizing.ts#L180-L183) sempre usou `max(lat.vazaoM3h)` — comportamento exato de operação rotativa. **O código estava tecnicamente correto desde sua origem; apenas a documentação descreveu mal.** TASK-052 corrige essa lacuna documental.

## Natureza

**Classe C — documental.** Não modifica nenhum arquivo em `src/**`. Produto exclusivamente em `docs/metodologia/`, `tasks/`, `docs/relatorios/` e `ai/` (governança). Per Mapa Mestre §9.3, Classe C dispensa testes novos; verificações de não-regressão preservadas por inação.

## Contexto da descoberta

Durante análise técnica pós-TASK-004B (sessão 2026-05-22, "ramais estão horríveis" — observação do RT), ao auditar `secondary-sizing.ts` para investigar dimensionamento dos ramais, descobriu-se que:

1. A descrição da premissa em `12-premissas-...md` afirmava simultaneidade total ("todos os aspersores ativos simultaneamente") implicando `sum(...)`.
2. O código real fazia `max(...)` — vazão do pior setor isolado.
3. O RT confirmou explicitamente: **operação é rotativa por setor**.
4. Conclusão: o código está correto (max é o critério tecnicamente certo para operação rotativa); apenas a descrição da premissa estava inconsistente.

A premissa foi promovida a `APROVADO_RT` e a descrição corrigida.

## Escopo permitido (executado)

- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — premissa "Critério de vazão de projeto do ramal": descrição reescrita, linhas obsoletas removidas, status promovido, histórico de revisões atualizado
- `tasks/TASK-052-homologar-rotativa-por-setor.md` — este arquivo
- `tasks/backlog.md` — header + entrada nova
- `docs/relatorios/2026-05-22-TASK-052.md` — relatório de fechamento
- `ai/current-task.md` — ciclo TOOL-003
- `ai/claude-report.md` — plano serializado
- `ai/gpt-review.md` — revisão GPT
- `ai/decision-log.md` — entry append-only

## Escopo proibido (respeitado)

- **`src/**`** — todo o produto, incluindo `secondary-sizing.ts` que já está correto
- `docs/metodologia/01-regras-bloqueantes.md` — sem `RB-09`
- `docs/decisoes/ADR-*.md` — sem ADR novo; sem emenda à ADR-008
- `tasks/TASK-024-mapa-mestre-tasks.md` — Mapa Mestre não alterado
- Outras premissas em `12-premissas-...md` que NÃO "Critério de vazão de projeto do ramal" — preservadas
- Snapshot interno do prompt do GPT (`scripts/ai/build-review-prompt.mjs` ou similar) — pendência de tooling futura (TOOL-XXX)
- Commit, push, deps novas

## Mudanças aplicadas

### `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`

**Seção "Critério de vazão de projeto do ramal":**

- Linha "Valor usado": reescrita para explicar que `max(lat.vazaoM3h)` retorna a vazão do pior setor isolado (57 m³/h para coluna com 3 setores de 57 m³/h cada, NÃO 171 m³/h); equivale a `max(setor_simultâneo)` da operação rotativa. Referência ao código `secondary-sizing.ts:180-183`.
- Linha "Regra": atualizada para citar explicitamente "operação rotativa por setor (1 setor ativo por vez)" e afirmar que NÃO há cenário operacional onde todos os setores da coluna estão simultaneamente ativos.
- Linha "Origem": atualizada para "Decisão operacional Brasmáquinas confirmada pelo RT em 2026-05-22 (Kristyan Mota)".
- Linhas "Alternativa pós-RT", "Risco — manter conservador (atual)", "Risco — relaxar para `max(setor_simultâneo)` sem RT" — **removidas** (incerteza resolvida).
- Linha "Responsável futuro": atualizada para "— (regra confirmada; sem revisão pendente)".
- Linha "Status": `PENDENTE_REVISAO_RT_BRASMAQUINAS` → **`APROVADO_RT` (regra confirmada)**.

**Histórico de revisões:**

Nova entrada datada 2026-05-22 citando autor (Claude Opus 4.7 / TASK-052), responsável RT (Kristyan Mota), motivo (confirmação de operação rotativa por setor), referência ao código (`secondary-sizing.ts:180-183`), e veredito GPT (`aprovado_com_ajustes` com 1 blocker justificado sobre snapshot desatualizado).

### Demais arquivos

- `tasks/TASK-052-homologar-rotativa-por-setor.md` — criado (este arquivo)
- `tasks/backlog.md` — header atualizado + entrada TASK-052 nova
- `docs/relatorios/2026-05-22-TASK-052.md` — relatório de fechamento
- `ai/current-task.md` — ciclo TOOL-003 transicionado para `aguardando_fechamento`

## Critérios de aceite

- [x] Descrição da premissa "Critério de vazão de projeto do ramal" corrigida — sem contradição interna
- [x] Linha "Valor usado" cita o código real e o exemplo numérico
- [x] Linha "Regra" cita explicitamente "operação rotativa por setor"
- [x] Linha "Origem" cita RT (Kristyan Mota) + data 2026-05-22 + referência ao código
- [x] Linhas "Alternativa pós-RT", "Risco — manter conservador (atual)", "Risco — relaxar sem RT" removidas
- [x] Linha "Status" promovida para `APROVADO_RT`
- [x] Histórico de revisões recebe nova entrada com data, autor, motivo, referência ao código
- [x] Arquivo `tasks/TASK-052-homologar-rotativa-por-setor.md` criado
- [x] `tasks/backlog.md` atualizado
- [x] `docs/relatorios/2026-05-22-TASK-052.md` criado
- [x] **Nenhum arquivo em `src/**` modificado**
- [x] **Nenhuma outra premissa em `12-premissas-...md` alterada**
- [x] **Sem ADR novo; sem emenda à ADR-008**
- [x] **Sem `RB-09` em `01-regras-bloqueantes.md`**
- [x] **Mapa Mestre não alterado**
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 836/836
- [x] `node scripts/ai/__tests__/run-all.mjs` → 27/27
- [x] Fluxo TOOL-003 executado integralmente (handoff → gpt-review → decision-log → implementar)
- [ ] Commit + push (aguarda autorização explícita)

## Pendências abertas (sucessores)

- **TOOL-XXX — atualizar snapshot do prompt do GPT Reviewer** com contagens dinâmicas em vez de literais estáticas (registrado no decision-log da TASK-052). Snapshot atual reporta `vitest 817/817 + tooling 20/20` (defasado desde TOOL-001) vs valores reais `836/836 + 27/27`.
- **TASK-053 (Classe A, sucessora topológica)** — corrigir os Problemas 1, 2, 3, 5, 6 da análise pós-TASK-004B sobre topologia "estrela" dos ramais (1 ramal por coluna, sem agrupamento, sem espinha de peixe). Independente desta task; aguarda decisão humana sobre direção (Opções A-F listadas na análise).

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-22 | Claude Opus 4.7 | TASK-052 criada e executada após análise técnica pós-TASK-004B revelou inconsistência interna na premissa "Critério de vazão de projeto do ramal" (descrição afirmava sum-like, código fazia max). RT (Kristyan Mota) confirmou operação rotativa por setor em 2026-05-22; premissa atualizada e promovida a `APROVADO_RT`; código não alterado (já correto). Fluxo TOOL-003 executado integralmente. Veredito GPT `aprovado_com_ajustes` com BLK-MET-001 justificado (snapshot interno do prompt do GPT desatualizado — pendência de tooling registrada). Sem alteração em `src/**`. |
